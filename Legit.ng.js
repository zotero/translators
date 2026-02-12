{
	"translatorID": "dad92507-e448-4b53-aba3-d418bc764012",
	"label": "Legit.ng",
	"creator": "VWF",
	"target": "^https?://(?:www\\.)?legit\\.ng/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-11-11 14:54:44"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 VWF

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

function meta(doc, nameOrProp) {
	let m = doc.querySelector('meta[property="' + nameOrProp + '"]')
		|| doc.querySelector('meta[name="' + nameOrProp + '"]');
	return m ? m.getAttribute('content') : '';
}

function isMultiWordAuthor(name) {
	return name && name.trim().split(/\s+/).length > 1;
}

function parseJSONLD(doc) {
	let nodes = doc.querySelectorAll('script[type="application/ld+json"]');
	for (let node of nodes) {
		let txt = node.textContent.trim();
		if (!txt) continue;
		try {
			let parsed = JSON.parse(txt);
			let candidates = [];

			if (Array.isArray(parsed)) {
				candidates = parsed;
			}
			else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
				candidates = parsed['@graph'];
			}
			else {
				candidates = [parsed];
			}

			for (let cand of candidates) {
				if (!cand) continue;
				let t = cand['@type'] || cand.type;
				if (!t) continue;

				if (typeof t === 'string' && t.includes('Article')) {
					return cand;
				}
				if (Array.isArray(t)) {
					for (let tt of t) {
						if (typeof tt === 'string' && tt.includes('Article')) {
							return cand;
						}
					}
				}
			}
		}
		catch (e) {}
	}
	return null;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let rows = doc.querySelectorAll('section.l-card-collection-section');

	if (!rows.length) return false;

	if (checkOnly) return true;

	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		items[href] = title;
	}

	return Object.keys(items).length ? items : false;
}

function isIndexPage(doc) {
	let ogType = (meta(doc, 'og:type') || '').toLowerCase();
	if (ogType === 'website') {
		return 'multiple';
	}
	return false;
}

function detectWeb(doc) {
	// 1) JSON-LD Article -> single article
	let j = parseJSONLD(doc);
	if (j) {
		return 'newspaperArticle';
	}

	// 2) explicit index/list page via JSON-LD
	if (isIndexPage(doc)) {
		return 'multiple';
	}

	// 3) meta-based hints of an article
	if (meta(doc, 'article:published_time')) {
		return 'newspaperArticle';
	}
	let ogType = (meta(doc, 'og:type') || '').toLowerCase();
	if (ogType === 'article') {
		return 'newspaperArticle';
	}

	// 4) fallback headline selector strongly suggesting article page
	if (text(doc, 'article header h1.c-main-headline')) {
		return 'newspaperArticle';
	}

	// 5) Only at this stage, test for listing
	if (getSearchResults(doc, true)) {
		return 'multiple';
	}

	return false;
}

async function doWeb(doc, url) {
	url = url || doc.location.href;
	let mode = detectWeb(doc);

	if (mode === 'multiple') {
		let items = getSearchResults(doc, false);
		if (!items) return;
		let selected = await Zotero.selectItems(items);
		if (!selected) return;

		for (let u of Object.keys(selected)) {
			let newDoc = await requestDocument(u);
			await scrape(newDoc, u);
		}
	}
	else if (mode === 'newspaperArticle') {
		await scrape(doc, url);
	}
}

async function scrape(doc, url) {
	url = url || doc.location.href;

	// Support splitting multiple author names from meta tags
	function splitAuthors(nameStr) {
		if (!nameStr) return [];
		let s = nameStr.trim();
		s = s.replace(/^\s*by\s+/i, '').trim();
		s = s.replace(/\s*\([^)]*\)\s*$/, '').trim();
		s = s.replace(/,\s*[A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*$/, '').trim();
		if (s.includes('|')) s = s.split('|')[0].trim();
		let parts = s.split(/\s+(?:and|&)\s+|;\s*/i);
		if (parts.length === 1 && s.includes(',') !== -1) {
			parts = s.split(/\s*,\s*/).map(p => p.trim()).filter(Boolean);
		}
		let cleaned = [];
		for (let p of parts) {
			let np = (p || '').trim();
			np = np.replace(/^\s*by\s+/i, '').trim();
			np = np.replace(/\s*\([^)]*\)\s*$/, '').trim();
			np = np.replace(/,\s*[A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*$/, '').trim();
			if (np && !/^(agency|news desk|agency reporter|legit|our reporter|correspond|editorial|nigeria|staff|bureau)$/i.test(np)) {
				cleaned.push(np);
			}
		}
		return cleaned;
	}
	
	let item = new Zotero.Item('newspaperArticle');

	let data = parseJSONLD(doc);

	// If JSON-LD present, prefer it
	if (data) {
		item.title = ZU.unescapeHTML(
			data.headline
			|| meta(doc, 'og:title')
			|| text(doc, 'article header h1.c-main-headline')
			|| ''
		);

		// Remove trailing "- Legit.ng" or variants
		item.title = item.title.replace(/\s*[-–—]\s*Legit\.ng\s*$/i, '').trim();

		item.abstractNote = ZU.unescapeHTML(
			data.description
			|| meta(doc, 'og:description')
			|| meta(doc, 'description')
			|| ''
		);

		item.url = data.url || meta(doc, 'og:url') || url;
		item.language = data.inLanguage || meta(doc, 'og:locale') || 'en';

		let rawJsonDate = data.datePublished || '';
		if (rawJsonDate) {
			let isoFromZU = ZU.strToISO(rawJsonDate);
			item.date = isoFromZU || rawJsonDate;
		}

		// --- JSON-LD authors ---
		if (data.author) {
			let authors = Array.isArray(data.author) ? data.author : [data.author];
			let graph = [];

			try {
				let nodes = doc.querySelectorAll('script[type="application/ld+json"]');
				for (let node of nodes) {
					let txt = node.textContent.trim();
					if (!txt) continue;
					let parsed = JSON.parse(txt);
					if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
						graph = parsed['@graph'];
						break;
					}
				}
			}
			catch (e) {
				// ignore malformed ld+json
			}

			for (let a of authors) {
				let name = '';

				if (typeof a === 'string') {
					name = a;
				}
				else if (a && typeof a === 'object') {
					if (a.name) {
						name = a.name;
					}
					else if (a['@id']) {
						let match = graph.find(obj => obj['@id'] === a['@id']);
						if (match && match.name) name = match.name;
					}
				}

				name = (name || '').trim();

				if (name.includes('|')) {
					name = name.split('|')[0].trim();
				}

				name = name.replace(/,\s*[A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*$/, '').trim();

				if (
					name
					&& !/agency|news desk|agency reporter|legit|our reporter|correspond|editorial|nigeria|staff|bureau/i.test(name.toLowerCase())
					&& isMultiWordAuthor(name)
				) {
					item.creators.push(ZU.cleanAuthor(name, 'author'));
				}
			}
		}
	}

	// --- Fallbacks ---
	if (!item.title || !item.title.trim()) {
		item.title = ZU.unescapeHTML(
			meta(doc, 'og:title')
			|| text(doc, 'article header h1.c-main-headline')
			|| ''
		);
	}

	if (!item.abstractNote || !item.abstractNote.trim()) {
		item.abstractNote = ZU.unescapeHTML(
			meta(doc, 'og:description')
			|| meta(doc, 'description')
			|| ''
		);
	}

	if (!item.date || !item.date.trim()) {
		let metaDate = meta(doc, 'article:published_time');
		if (metaDate) {
			let isoDate = ZU.strToISO(metaDate);
			item.date = isoDate || metaDate;
		}
	}

	if (!item.url || !item.url.trim()) {
		item.url = meta(doc, 'og:url') || url;
	}

	if (!item.publicationTitle) {
		item.publicationTitle = 'Legit.ng';
	}
	
	// --- Fallback authors in sequence ---
	if (item.creators.length === 0) {
		let cand1 = meta(doc, 'author');
		let cand2 = text(doc, 'div.c-article-info__authors span.c-article-info__authors--capitalize>a');

		let candidates = [];

		if (cand1) {
			candidates = candidates.concat(splitAuthors(cand1));
		}
		if (cand2) {
			candidates = candidates.concat(splitAuthors(cand2));
		}

		for (let name of candidates) {
			if (
				name
				&& !/agency|news desk|agency reporter|legit|our reporter|correspond|editorial|nigeria|staff|bureau/i.test(name.toLowerCase())
				&& isMultiWordAuthor(name)
			) {
				item.creators.push(ZU.cleanAuthor(name, 'author'));
			}
		}
	}

	item.attachments.push({
		document: doc,
		title: 'Snapshot'
	});

	item.place = 'Nigeria';
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.legit.ng/politics/1682701-breaking-nigerian-lady-dead-details-emerge/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Ex-Nigerian President's Wife is Dead, Details Emerge",
				"creators": [
					{
						"firstName": "Bada",
						"lastName": "Yusuf",
						"creatorType": "author"
					}
				],
				"date": "2025-11-10",
				"abstractNote": "Ex-Nigerian President Shehu Shagari's wife, Hajiya Sutura, has reportedly died. Families discloses the cause of her death and other details on Monday, November 10.",
				"language": "en",
				"libraryCatalog": "Legit.ng",
				"place": "Nigeria",
				"publicationTitle": "Legit.ng",
				"url": "https://www.legit.ng/politics/1682701-breaking-nigerian-lady-dead-details-emerge/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legit.ng/politics/1615236-edo-state-election-results-by-local-government-full-list-emerges/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "FULL LIST: Edo State Election 2024 Results in All Local Government Areas",
				"creators": [
					{
						"firstName": "Ridwan Adeola",
						"lastName": "Yusuf",
						"creatorType": "author"
					}
				],
				"date": "2024-09-22",
				"abstractNote": "The Edo state election 2024 results by local government are now available. Legit.ng has compiled the scores obtained by the PDP, APC, and Labour Party (LP).",
				"language": "en",
				"libraryCatalog": "Legit.ng",
				"place": "Nigeria",
				"publicationTitle": "Legit.ng",
				"shortTitle": "FULL LIST",
				"url": "https://www.legit.ng/politics/1615236-edo-state-election-results-by-local-government-full-list-emerges/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.legit.ng/business-economy/maritime/1677162-stakeholders-warn-npa-fraudulent-move-cancel-10-year-cargo-survey-deals/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Stakeholders Warn NPA Over ‘Fraudulent’ Move to Cancel 10-Year Cargo Survey Deals",
				"creators": [
					{
						"firstName": "Pascal",
						"lastName": "Oparada",
						"creatorType": "author"
					}
				],
				"date": "2025-10-05",
				"abstractNote": "Stakeholders in the maritime industry have cried foul over plans by the Nigeria Ports Authority (NPA) to cancel legally-binding 10-year cargo survey deals.",
				"language": "en",
				"libraryCatalog": "Legit.ng",
				"place": "Nigeria",
				"publicationTitle": "Legit.ng",
				"url": "https://www.legit.ng/business-economy/maritime/1677162-stakeholders-warn-npa-fraudulent-move-cancel-10-year-cargo-survey-deals/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
