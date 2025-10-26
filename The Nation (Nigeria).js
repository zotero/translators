{
	"translatorID": "69cddf9e-884e-433f-8967-d9afb6f9e94c",
	"label": "The Nation (Nigeria)",
	"creator": "VWF",
	"target": "^https?://thenationonlineng\\.net/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"lastUpdated": "2025-10-26 00:42:24"
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
					if (t.includes('Article')) {
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
	return url && url.includes('/tag/');
}

function detectWeb(doc, url) {
	url = url || doc.location.href;

	// 1) JSON-LD Article -> single article
	let j = parseJSONLD(doc);
	if (j) {
		return 'newspaperArticle';
	}

	// 2) explicit index/list URL
	if (isIndexURL(url)) {
		return 'multiple';
	}

	// 3) Use the standard getSearchResults() heuristic for listing pages
	if (getSearchResults(doc, true)) {
		// If page also clearly looks like an article, prefer article
		if (meta(doc, 'article:published_time') || meta(doc, 'og:type') || text(doc, 'div.article__title h1')) {
			return 'newspaperArticle';
		}
		return 'multiple';
	}

	// 4) meta-based hints
	if (meta(doc, 'article:published_time')) {
		return 'newspaperArticle';
	}
	let ogType = (meta(doc, 'og:type') || '').toLowerCase();
	if (ogType === 'article') {
		return 'newspaperArticle';
	}

	// 5) fallback selectors
	if (text(doc, 'div.article__title>h1')) {
		return 'newspaperArticle';
	}

	return false;
}

async function doWeb(doc, url) {
	url = url || doc.location.href;
	let mode = detectWeb(doc, url);
	if (mode === 'multiple') {
		let items = getSearchResults(doc, false);
		if (!items) return;
		let selected = Zotero.selectItems(items);
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
	let item = new Zotero.Item('newspaperArticle');

	let data = parseJSONLD(doc);

	// If JSON-LD present, prefer it
	if (data) {
		item.title = ZU.unescapeHTML(
			data.headline
			|| data.name
			|| meta(doc, 'og:title')
			|| text(doc, 'div.article__title>h1')
			|| ''
		);

		item.abstractNote = ZU.unescapeHTML(
			data.description
			|| meta(doc, 'og:description')
			|| ''
		);

		item.url = data.url || meta(doc, 'og:url') || url;

		item.language = data.inLanguage || meta(doc, 'og:locale') || 'en';

		// --- date: use ZU.strToISO() to normalize if possible ---
		let rawJsonDate = data.datePublished || '';
		if (rawJsonDate) {
			// Prefer Zotero's normalization (handles many formats and keeps timezone when present)
			let isoFromZU = ZU.strToISO(rawJsonDate);
			if (isoFromZU) {
				item.date = isoFromZU;
			}
			else {
				// if ZU couldn't parse, keep raw (often already ISO with TZ)
				item.date = rawJsonDate;
			}
		}

		// --- authors from JSON-LD (skip organisations, strip locations like ", Abuja") ---
		if (data.author) {
			let authors = Array.isArray(data.author) ? data.author : [data.author];
			let graph = Array.isArray(doc.querySelector('script[type="application/ld+json"]')) ? [] : [];

			// Try to get the parsed JSON-LD graph for @id lookups
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

				// Case 1: Plain string author
				if (typeof a === 'string') {
					name = a;
				}

				// Case 2: Object author (could be inline or @id reference)
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

				// If pipe is present (e.g. "Samuel Oamen | Senior Reporter"), keep only the part before it
				if (name.includes('|')) {
					name = name.split('|')[0].trim();
				}

				// Remove trailing location after comma (e.g. ", Abuja")
				name = name.replace(/,\s*[A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*$/, '').trim();

				// Skip agency or anonymous authors
				if (name && !/agency|news desk|agency reporter|the nation|our reporter|thenation|nigeria|staff|bureau/i.test(name.toLowerCase())) {
					item.creators.push(ZU.cleanAuthor(name, 'author'));
				}
			}
		}
	}

	// DOM/meta fallbacks for anything missing
	if (!item.title || !item.title.trim()) {
		item.title = ZU.unescapeHTML(
			meta(doc, 'og:title')
			|| text(doc, 'div.article__title>h1')
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

	// If date still empty, try article:published_time meta (often ISO)
	if (!item.date || !item.date.trim()) {
		let metaDate = meta(doc, 'article:published_time');
		if (metaDate) {
			let isoDate = ZU.strToISO(metaDate);
			if (isoDate) {
				item.date = isoDate;
			}
			else {
				item.date = metaDate;
			}
		}
	}

	if (!item.url || !item.url.trim()) {
		item.url = meta(doc, 'og:url') || url;
	}

	if (!item.publicationTitle) {
		item.publicationTitle = 'The Nation';
	}

	if (!item.ISSN) {
		item.ISSN = '2449-1497';
	}
	
	// If no creators yet, try common DOM byline selectors (skip org-like)
	if (item.creators.length === 0) {
		let cand = meta(doc, 'author')
			|| text(doc, 'div.article__date>p>span>a.author.url.fn');

		if (cand && !/agency|news desk|agency reporter|the nation|our reporter|thenation|nigeria|staff|bureau/i.test(cand.toLowerCase())) {
			item.creators.push(ZU.cleanAuthor(cand, 'author'));
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
		"url": "https://thenationonlineng.net/ngf-hails-nigerias-exit-from-financial-action-task-forces-grey-list/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "NGF hails Nigeria’s exit from Financial Action Task Force’s grey list",
				"creators": [
					{
						"firstName": "Eric",
						"lastName": "Ikhilae",
						"creatorType": "author"
					}
				],
				"date": "2025-10-25",
				"ISSN": "2449-1497",
				"abstractNote": "The Nation Newspaper NGF hails Nigeria's exit from Financial Action Task Force's grey list",
				"language": "en-US",
				"libraryCatalog": "The Nation",
				"place": "Nigeria",
				"publicationTitle": "The Nation",
				"url": "https://thenationonlineng.net/ngf-hails-nigerias-exit-from-financial-action-task-forces-grey-list/",
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
		"url": "https://thenationonlineng.net/nigeria-edges-closer-to-exiting-fatfs-grey-list/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Nigeria edges closer to exiting FATF’s grey list",
				"creators": [
					{
						"firstName": "Nduka",
						"lastName": "Chiejina",
						"creatorType": "author"
					},
					{
						"firstName": "Sarah",
						"lastName": "Bolaji",
						"creatorType": "author"
					}
				],
				"date": "2024-06-29",
				"ISSN": "2449-1497",
				"abstractNote": "The Nation Newspaper Nigeria edges closer to exiting FATF's grey list",
				"language": "en-US",
				"libraryCatalog": "The Nation",
				"place": "Nigeria",
				"publicationTitle": "The Nation",
				"url": "https://thenationonlineng.net/nigeria-edges-closer-to-exiting-fatfs-grey-list/",
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
		"url": "https://thenationonlineng.net/capitalsage-announces-ude-as-new-ceo/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "CapitalSage announces Ude as new CEO",
				"creators": [
					{
						"firstName": "Samuel",
						"lastName": "Oamen",
						"creatorType": "author"
					}
				],
				"date": "2025-10-24",
				"ISSN": "2449-1497",
				"abstractNote": "The Nation Newspaper CapitalSage announces Ude as new CEO",
				"language": "en-US",
				"libraryCatalog": "The Nation",
				"place": "Nigeria",
				"publicationTitle": "The Nation",
				"url": "https://thenationonlineng.net/capitalsage-announces-ude-as-new-ceo/",
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
		"url": "https://thenationonlineng.net/fulham-lose-to-newcastle-as-iwobi-marks-300-appearances-in-epl/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Fulham lose to Newcastle as Iwobi marks 300 appearances in EPL",
				"creators": [
					{
						"firstName": "Adedamola",
						"lastName": "Ogunbewon",
						"creatorType": "author"
					}
				],
				"date": "2025-10-25",
				"ISSN": "2449-1497",
				"abstractNote": "The Nation Newspaper Fulham lose to Newcastle as Iwobi marks 300 appearances in EPL",
				"language": "en-US",
				"libraryCatalog": "The Nation",
				"place": "Nigeria",
				"publicationTitle": "The Nation",
				"url": "https://thenationonlineng.net/fulham-lose-to-newcastle-as-iwobi-marks-300-appearances-in-epl/",
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
