{
	"translatorID": "2e57611e-7988-41f4-9553-b76946e4a11d",
	"label": "Daily Nigerian",
	"creator": "VWF",
	"target": "^https?://www\\.?.dailynigerian\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-12-15 11:35:40"
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
			else if (parsed.mainEntity) {
				candidates = [parsed.mainEntity, parsed];
			}
			else {
				candidates = [parsed];
			}

			for (let cand of candidates) {
				if (!cand) continue;
				let t = cand['@type'] || cand.type;
				if (!t) continue;
				if (typeof t === 'string') {
					if (t.includes('NewsArticle')) {
						return cand;
					}
				}
				else if (Array.isArray(t)) {
					for (let tt of t) {
						if (typeof tt === 'string' && tt.includes('Article')) {
							return cand;
						}
					}
				}
			}
		}
		catch (e) {
			// ignore malformed JSON-LD
		}
	}
	return null;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	// generic pattern in path for links
	let rows = doc.querySelectorAll('a[href*="/"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent || row.title || '');
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function isIndexURL(url) {
	return url && (url.includes('/tag/') || url.includes('/category/'));
}

function detectWeb(doc, url) {
	// 1) JSON-LD Article -> single article
	let j = parseJSONLD(doc);
	if (j) {
		return 'newspaperArticle';
	}

	// 2) explicit index/list page via URL pattern
	if (isIndexURL(url)) {
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
	if (text(doc, 'h1.tdb-title-text')) {
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
	let mode = detectWeb(doc, url);
	if (mode === 'multiple') {
		let items = getSearchResults(doc, false);
		if (!items) return;
		let selected = await Zotero.selectItems(items);
		if (!selected) return;
		for (let u of Object.keys(selected)) {
			await scrape(await requestDocument(u));
		}
	}
	else if (mode === 'newspaperArticle') {
		await scrape(doc, url);
	}
	// else do nothing
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
			if (np && !/^(agency|news desk|agency reporter|daily|our reporter|editor|nigeria|staff|bureau)$/i.test(np)) {
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
			|| text(doc, 'h1.tdb-title-text')
			|| ''
		);

		// Remove trailing "- Daily Nigerian" or variants
		item.title = item.title.replace(/\s*[-–—]\s*Daily\s*Nigerian\s*$/i, '').trim();

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
					&& !/agency|news desk|agency reporter|daily|our reporter|editor|nigeria|staff|bureau/i.test(name.toLowerCase())
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
			|| text(doc, 'h1.tdb-title-text')
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
		item.publicationTitle = 'Daily Nigerian';
	}

	if (!item.ISSN) {
		item.ISSN = '2550-7370';
	}
	
	// --- Fallback authors in sequence ---
	if (item.creators.length === 0) {
		let cand1 = meta(doc, 'author');
		let cand2 = text(doc, 'div.tdb-author-name-wrap a.tdb-author-name');

		let candidates = [];

		// Priority: use ONLY cand1 if present
		if (cand1) {
			candidates = splitAuthors(cand1);
		}
		// If cand1 missing, use ONLY cand2
		else if (cand2) {
			candidates = splitAuthors(cand2);
		}

		for (let name of candidates) {
			if (
				name
				&& !/agency|news desk|agency reporter|daily|our reporter|editor|nigeria|staff|bureau/i.test(name.toLowerCase())
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
		"url": "https://dailynigerian.com/over-16304-arrests-4-5m-kg-of-drugs-seized-in-10-months-marwa/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Over 16,304 arrests, 4.5m kg of drugs seized in 10 months — Marwa",
				"creators": [
					{
						"firstName": "Ibrahim",
						"lastName": "Ramalan",
						"creatorType": "author"
					}
				],
				"date": "2025-11-19",
				"ISSN": "2550-7370",
				"abstractNote": "The National Drug Law Enforcement Agency, NDLEA, said it arrested over 16,304 drug suspects and seized 4.5 million kilograms of illicit substances between January and October. The NDLEA Chairman, retired, Brig. Gen. Buba Marwa disclosed this at the 7th Security and Emergency Management Awards and Lecture, SAEMA, on Wednesday in Abuja. Mr Marwa said that, […]",
				"language": "en-GB",
				"libraryCatalog": "Daily Nigerian",
				"place": "Nigeria",
				"publicationTitle": "Daily Nigerian",
				"url": "https://dailynigerian.com/over-16304-arrests-4-5m-kg-of-drugs-seized-in-10-months-marwa/",
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
		"url": "https://dailynigerian.com/edo-govt-declares-over-200-vehicles-missing/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Edo govt declares over 200 vehicles missing",
				"creators": [],
				"date": "2024-11-22",
				"ISSN": "2550-7370",
				"abstractNote": "The Chairman of the Committee set up by Governor Monday Okpebholo to recover government vehicles, Kelly Okungbowa, on Friday declared over 200 vehicles missing. He stated that the committee had within 24 hours recovered three vehicles in a private residence in Benin. Mr Okungbowa, who spoke to newsmen on the success of the committee’s assignment, […]",
				"language": "en-GB",
				"libraryCatalog": "Daily Nigerian",
				"place": "Nigeria",
				"publicationTitle": "Daily Nigerian",
				"url": "https://dailynigerian.com/edo-govt-declares-over-200-vehicles-missing/",
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
