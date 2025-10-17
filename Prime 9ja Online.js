{
	"translatorID": "eb0bbbf8-7f57-40fa-aec2-45480d396e93",
	"label": "Prime 9ja Online",
	"creator": "VWF",
	"target": "^https?://(www\\.|pidgin\\.)?prime9ja\\.com\\.ng/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"lastUpdated": "2025-10-14 22:00:00"
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
					if (t.includes('NewsArticle')) {
						return cand;
					}
				}
				else if (Array.isArray(t)) {
					for (let tt of t) {
						if (typeof tt === 'string' && tt.includes('NewsArticle')) {
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
	// generic year pattern in path for article links
	let rows = doc.querySelectorAll('a[href*="/20"]');
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
	return url && url.includes('/search/label/');
}

function detectWeb(doc, url) {
	url = url || doc.location.href;

	// 1) JSON-LD NewsArticle -> single article
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
		if (meta(doc, 'article:published_time') || meta(doc, 'og:type') || text(doc, 'h1.entry-title') || doc.querySelector('[itemprop="articleBody"]')) {
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
	if (text(doc, 'h1.entry-title')
		|| text(doc, 'h1.s-title')
		|| doc.querySelector('[itemprop="articleBody"]')
		|| doc.querySelector('article.post')) {
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
	let item = new Zotero.Item('newspaperArticle');

	let data = parseJSONLD(doc);

	// If JSON-LD present, prefer it
	if (data) {
		item.title = ZU.unescapeHTML(
			data.headline
			|| data.name
			|| meta(doc, 'og:title')
			|| text(doc, 'h1.entry-title')
			|| text(doc, 'h1.s-title')
			|| ''
		);

		item.abstractNote = ZU.unescapeHTML(
			data.description
			|| meta(doc, 'og:description')
			|| ''
		);

		item.url = data.url || meta(doc, 'og:url') || url;

		item.language = data.inLanguage || meta(doc, 'og:locale') || 'en';

		item.publicationTitle = (data.publisher && (data.publisher.name || data.publisher.title)) || 'Prime 9ja Online';

		item.ISSN = '3092-8907';

		// --- date: use ZU.strToISO() to normalize if possible ---
		let rawJsonDate = data.datePublished || data.dateCreated || '';
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

		// --- authors from JSON-LD (skip organisations) ---
		if (data.author) {
			let authors = Array.isArray(data.author) ? data.author : [data.author];
			for (let a of authors) {
				let name = (a && (a.name || a['@name'] || a)) || '';
				if (name) {
					let lower = name.toString().toLowerCase();
					if (/news agency|agency|news desk|publish desk|prime 9ja|prime9ja|online media|media|staff|bureau/i.test(lower)) {
						// skip org-like bylines
					}
					else {
						item.creators.push(ZU.cleanAuthor(name.toString(), 'author'));
					}
				}
			}
		}
	}

	// DOM/meta fallbacks for anything missing
	if (!item.title || !item.title.trim()) {
		item.title = ZU.unescapeHTML(
			meta(doc, 'og:title')
			|| text(doc, 'h1.entry-title')
			|| text(doc, 'h1.s-title')
			|| text(doc, 'title')
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
		let metaDate = meta(doc, 'article:published_time') || '';
		if (metaDate) {
			// meta often already ISO with timezone; keep it, else use ZU.strToISO
			if (metaDate.indexOf('T') !== -1) {
				item.date = metaDate;
			}
			else {
				let isoMeta = ZU.strToISO(metaDate);
				if (isoMeta) {
					item.date = isoMeta;
				}
				else {
					item.date = metaDate;
				}
			}
		}
	}

	if (!item.url || !item.url.trim()) {
		item.url = meta(doc, 'og:url') || url;
	}

	if (!item.publicationTitle) {
		item.publicationTitle = 'Prime 9ja Online';
	}

	if (!item.ISSN) {
		item.ISSN = '3092-8907';
	}
	
	// If no creators yet, try common DOM byline selectors (skip org-like)
	if (item.creators.length === 0) {
		let cand = meta(doc, 'article:author')
			|| text(doc, '.meta-author-author')
			|| text(doc, '.meta-author')
			|| text(doc, '.author-name')
			|| text(doc, '.byline a')
			|| text(doc, '.meta-el.meta-author a');

		if (cand && !/news agency|agency|news desk|publish desk|prime 9ja|prime9ja|online media|media|staff|bureau/i.test(cand.toLowerCase())) {
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
		"url": "https://www.prime9ja.com.ng/2025/05/tribunal-to-rule-on-ondo-poll-june-4.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Tribunal to Rule on Ondo Poll June 4",
				"creators": [
					{
						"firstName": "Chima Joseph",
						"lastName": "Ugo",
						"creatorType": "author"
					}
				],
				"date": "2025-05-24T18:10:00+01:00",
				"ISSN": "3092-8907",
				"abstractNote": "AKURE —  The Ondo State Governorship Election Petitions Tribunal will deliver its verdict on June 4 in the series of suits challenging the e...",
				"libraryCatalog": "Prime 9ja Online",
				"place": "Nigeria",
				"publicationTitle": "Prime 9ja Online",
				"url": "https://www.prime9ja.com.ng/2025/05/tribunal-to-rule-on-ondo-poll-june-4.html",
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
		"url": "https://www.prime9ja.com.ng/p/author.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Authors and Contributors",
				"creators": [],
				"abstractNote": "Chima Joseph Ugo   ...",
				"libraryCatalog": "Prime 9ja Online",
				"place": "Nigeria",
				"publicationTitle": "Prime 9ja Online",
				"url": "https://www.prime9ja.com.ng/p/author.html",
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
		"url": "https://pidgin.prime9ja.com.ng/2025/09/20000-jam-hilda-baci-cookathon-for-eko.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "20,000 Pipo Jam Hilda Baci Cookathon for Eko Hotel Celebrate World Jollof Day",
				"creators": [
					{
						"firstName": "Chima Joseph",
						"lastName": "Ugo",
						"creatorType": "author"
					}
				],
				"abstractNote": "Chef Hilda Baci draw massive crowd for Friday as she yan to cook the biggest pot of Naija Jollof rice wey history don ever see. The event land for Eko Hotel, Victoria Island, to mark World Jollof Day, and people from all corner of Lagos rush come support…",
				"language": "[object Object]",
				"date": "2025-09-12T18:31:00+01:00",
				"ISSN": "3092-8907",
				"libraryCatalog": "Prime 9ja Online",
				"place": "Nigeria",
				"publicationTitle": "Prime 9ja Online Pidgin",
				"url": "https://pidgin.prime9ja.com.ng/2025/09/20000-jam-hilda-baci-cookathon-for-eko.html",
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
