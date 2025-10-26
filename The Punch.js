{
	"translatorID": "cb173332-8fb1-444d-84c9-9f12f3817d34",
	"label": "The Punch",
	"creator": "VWF",
	"target": "^https?://((www|healthwise)\\.)?punchng\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-26 19:45:30"
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
					if (t.includes('WebPage')) {
						return cand;
					}
				}
				else if (Array.isArray(t)) {
					for (let tt of t) {
						if (typeof tt === 'string' && tt.includes('WebPage')) {
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
	return /\/(category|tag|topics)\//i.test(url);
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
		if (meta(doc, 'article:published_time') || meta(doc, 'og:type') || text(doc, 'article.single-article>h1.post-title')) {
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
	if (text(doc, 'article.single-article>h1.post-title')) {
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
			|| meta(doc, 'og:title')
			|| text(doc, 'article.single-article>h1.post-title')
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
				if (name && !/agency|news desk|agency reporter|the punch|our reporter|punchng|punch|nigeria|staff|bureau/i.test(name.toLowerCase())) {
					item.creators.push(ZU.cleanAuthor(name, 'author'));
				}
			}
		}
	}

	// DOM/meta fallbacks for anything missing
	if (!item.title || !item.title.trim()) {
		item.title = ZU.unescapeHTML(
			meta(doc, 'og:title')
			|| text(doc, 'article.single-article>h1.post-title')
			|| ''
		);
	}

	if (!item.abstractNote || !item.abstractNote.trim()) {
		item.abstractNote = ZU.unescapeHTML(
			meta(doc, 'og:description')
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
		if (url.includes('healthwise.punchng.com')) {
			item.publicationTitle = 'The Punch Healthwise';
		} 
		else {
			item.publicationTitle = 'The Punch';
		}
	}

	if (!item.ISSN) {
		item.ISSN = '0331-2666';
	}

	// Extra fallback for Healthwise (different HTML structure)
	if (item.creators.length === 0) {
		let hwAuthors = doc.querySelectorAll('.tdb-author-name-wrap a.tdb-author-name');
		if (hwAuthors.length) {
			for (let el of hwAuthors) {
				let name = el.textContent.trim();
				if (name.includes('|')) name = name.split('|')[0].trim();
				if (name && !/agency|news desk|agency reporter|the punch|our reporter|punchng|punch|nigeria|staff|bureau/i.test(name.toLowerCase())) {
					item.creators.push(ZU.cleanAuthor(name, 'author'));
				}
			}
		}
	}

	// If no creators yet, try common DOM byline selectors (skip org-like)
	if (item.creators.length === 0) {
		let cand = text(doc, 'div.col-lg-12.desktop-onlyy>span.post-author');
		if (cand) {
			// Remove unwanted keywords
			if (!/agency|news desk|agency reporter|the punch|our reporter|punchng|punch|nigeria|staff|bureau/i.test(cand.toLowerCase())) {
				// Split on " and ", "&", or commas
				let authorParts = cand
					.split(/\s+(?:and|&)\s+|,\s*/i)
					.map(a => a.trim())
					.filter(a => a.length > 0);

				for (let name of authorParts) {
					// Keep only part before pipe if any
					if (name.includes('|')) name = name.split('|')[0].trim();
					item.creators.push(ZU.cleanAuthor(name, 'author'));
				}
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
		"url": "https://punchng.com/lamido-wike-camps-reject-consensus-deal-for-pdp-chairmanship/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Lamido, Wike camps reject consensus deal for PDP chairmanship",
				"creators": [
					{
						"firstName": "Abdulrahman",
						"lastName": "Zakariyau",
						"creatorType": "author"
					},
					{
						"firstName": "Nathaniel",
						"lastName": "Shaibu",
						"creatorType": "author"
					}
				],
				"date": "2025-10-25",
				"ISSN": "0331-2666",
				"abstractNote": "The endorsement of a former Minister of Special Duties and Intergovernmental Affairs, Tanimu Turaki (SAN) as National Chairman of the Peoples Democratic",
				"language": "en-US",
				"libraryCatalog": "The Punch",
				"place": "Nigeria",
				"publicationTitle": "The Punch",
				"url": "https://punchng.com/lamido-wike-camps-reject-consensus-deal-for-pdp-chairmanship/",
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
		"url": "https://punchng.com/resident-doctors-begin-indefinite-strike-friday/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Resident doctors begin indefinite strike Friday",
				"creators": [
					{
						"firstName": "Samuel",
						"lastName": "Omotere",
						"creatorType": "author"
					}
				],
				"date": "2025-10-26",
				"ISSN": "0331-2666",
				"abstractNote": "The Nigerian Association of Resident Doctors has declared a total, comprehensive, and indefinite strike scheduled to commence at 11:59 p.m. on Friday,",
				"language": "en-US",
				"libraryCatalog": "The Punch",
				"place": "Nigeria",
				"publicationTitle": "The Punch",
				"url": "https://punchng.com/resident-doctors-begin-indefinite-strike-friday/",
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
		"url": "https://punchng.com/hisbah-cancels-court-ordered-tiktok-celebrities-wedding-in-kano/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Hisbah cancels court-ordered TikTok celebrities' wedding in Kano",
				"creators": [],
				"date": "2025-10-26",
				"ISSN": "0331-2666",
				"abstractNote": "Sharia-enforcing police in Nigeria's northern city of Kano have cancelled a wedding of two TikTok celebrities that was ordered by a court after a viral",
				"language": "en-US",
				"libraryCatalog": "The Punch",
				"place": "Nigeria",
				"publicationTitle": "The Punch",
				"url": "https://punchng.com/hisbah-cancels-court-ordered-tiktok-celebrities-wedding-in-kano/",
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
		"url": "https://healthwise.punchng.com/open-defecation-lagos-to-build-10000-public-toilets-after-punch-healthwise-report/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Open defecation: Lagos to build 10,000 public toilets after PUNCH Healthwise report - Healthwise",
				"creators": [
					{
						"firstName": "Idowu",
						"lastName": "Abdullahi",
						"creatorType": "author"
					}
				],
				"date": "2025-08-22",
				"ISSN": "0331-2666",
				"abstractNote": "The Lagos State Government has announced plans to build 10,000 public toilets across the state to eliminate open defecation.",
				"language": "en-US",
				"libraryCatalog": "The Punch",
				"place": "Nigeria",
				"publicationTitle": "The Punch Healthwise",
				"shortTitle": "Open defecation",
				"url": "https://healthwise.punchng.com/open-defecation-lagos-to-build-10000-public-toilets-after-punch-healthwise-report/",
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
		"url": "https://healthwise.punchng.com/tag/open-defecation-in-lagos/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://punchng.com/topics/featured/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
