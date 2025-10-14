{
	"translatorID": "eb0bbbf8-7f57-40fa-aec2-45480d396e93",
	"label": "Prime 9ja Online",
	"creator": "VWF",
	"target": "^https?://(www\\.|pidgin\\.)?prime9ja\\.com\\.ng(/.*)?$",
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

function countListingAnchors(doc) {
	const sel = [
		'h3.entry-title a',
		'h4.entry-title a',
		'h5.entry-title a',
		'a.p-url',
		'a.p-flink',
		'a.entry-title'
	];
	let count = 0;
	for (let s of sel) {
		count += doc.querySelectorAll(s).length;
	}
	return count;
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

	// 3) conservative listing detection
	let listingCount = countListingAnchors(doc);
	if (listingCount >= 4) {
		if (!meta(doc, 'article:published_time')
			&& !meta(doc, 'og:type')
			&& !doc.querySelector('article.post')
			&& !doc.querySelector('[itemprop="articleBody"]')) {
			return 'multiple';
		}
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
		let items = {};
		let rows = doc.querySelectorAll('a.p-url, a.p-flink, a.entry-title, h3.entry-title a, h4.entry-title a, h5.entry-title a');
		for (let row of rows) {
			let href = row.href;
			let title = ZU.trimInternal(row.textContent);
			if (!href || !title) continue;
			items[href] = title;
		}
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

		// --- handle ISSN safely (lint-friendly formatting) ---
		if (data.publisher) {
			let pub = data.publisher;
			let issn
				= pub.issn
				|| (pub.identifier && /\d{4}-\d{3}[\dxX]/.test(pub.identifier)
					? pub.identifier.match(/\d{4}-\d{3}[\dxX]/)[0]
					: null)
				|| (pub.sourceOrganization && pub.sourceOrganization.issn)
				|| null;

			if (issn) {
				item.ISSN = issn;
			}
			else {
				item.ISSN = '3092-8907';
			}
		}
		else {
			item.ISSN = '3092-8907';
		}

		// --- date: prefer JSON-LD verbatim when it looks like an ISO datetime ---
		let rawJsonDate = data.datePublished || data.dateCreated || '';
		if (rawJsonDate) {
			// If it contains a 'T' assume ISO datetime (keep as-is)
			if (rawJsonDate.includes('T') !== -1) {
				item.date = rawJsonDate;
			}
			else {
				// try to parse human-readable date and produce YYYY-MM-DD
				let parsed = new Date(rawJsonDate);
				if (!isNaN(parsed)) {
					item.date = parsed.toISOString().split('T')[0];
				}
				else {
					item.date = rawJsonDate;
				}
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
					} else {
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
			// meta often already ISO with timezone; keep it
			if (metaDate.indexOf('T') !== -1) {
				item.date = metaDate;
			} else {
				let parsed = new Date(metaDate);
				if (!isNaN(parsed)) {
					item.date = parsed.toISOString().split('T')[0];
				} else {
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
