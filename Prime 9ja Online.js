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
	"lastUpdated": "2025-10-17 16:00:00"
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
				"date": "2025-05-24",
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
		"url": "https://www.prime9ja.com.ng/2025/05/davido-cfmf-review-low-burn-confession.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Davido – “CFMF” Review: A Low-Burn Confession in Afro-R&B Silhouettes",
				"creators": [
					{
						"firstName": "Chima Joseph",
						"lastName": "Ugo",
						"creatorType": "author"
					}
				],
				"date": "2025-05-27",
				"ISSN": "3092-8907",
				"abstractNote": "On “CFMF”  — the fourth track from Davido’s 2025 album 5ive  —   the artist trades club-ready bravado for inward reflection. Featuri...",
				"libraryCatalog": "Prime 9ja Online",
				"place": "Nigeria",
				"publicationTitle": "Prime 9ja Online",
				"shortTitle": "Davido – “CFMF” Review",
				"url": "https://www.prime9ja.com.ng/2025/05/davido-cfmf-review-low-burn-confession.html",
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
		"url": "https://www.prime9ja.com.ng/2025/05/jamb-server-hack-over-20-arrested.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "JAMB Server Hack: Over 20 Arrested",
				"creators": [
					{
						"firstName": "Onuwa",
						"lastName": "John",
						"creatorType": "author"
					}
				],
				"date": "2025-05-23",
				"ISSN": "3092-8907",
				"abstractNote": "ABUJA —  A major network of cybercriminals allegedly responsible for infiltrating the Computer-Based Testing (CBT) infrastructure of Nigeria...",
				"libraryCatalog": "Prime 9ja Online",
				"place": "Nigeria",
				"publicationTitle": "Prime 9ja Online",
				"shortTitle": "JAMB Server Hack",
				"url": "https://www.prime9ja.com.ng/2025/05/jamb-server-hack-over-20-arrested.html",
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
