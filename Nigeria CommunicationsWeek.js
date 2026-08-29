{
	"translatorID": "0d6093db-fd4c-4940-9079-600898465695",
	"label": "Nigeria CommunicationsWeek",
	"creator": "VWF",
	"target": "^https?://www\\.?nigeriacommunicationsweek\\.com\\.ng/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-12-11 10:30:10"
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

function time(doc, itemProp) {
	let m = doc.querySelector('time[itemprop="' + itemProp + '"]');
	return m ? m.getAttribute('datetime') : '';
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
	return url && (url.includes('/tag/') || url.includes('/category/'));
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
		if (meta(doc, 'og:type') || text(doc, 'header.mvp-post-head h1.mvp-post-title.left.entry-title')) {
			return 'newspaperArticle';
		}
		return 'multiple';
	}

	// 4) meta-based hints
	let ogType = (meta(doc, 'og:type') || '').toLowerCase();
	if (ogType === 'article') {
		return 'newspaperArticle';
	}

	// 5) fallback selectors
	if (text(doc, 'header.mvp-post-head h1.mvp-post-title.left.entry-title')) {
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
			|| text(doc, 'header.mvp-post-head h1.mvp-post-title.left.entry-title')
			|| ''
		);

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
			if (isoFromZU) {
				item.date = isoFromZU;
			}
			else {
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
				if (name && !/agency|news desk|agency reporter|communications|our reporter|week|nigeria|staff|bureau/i.test(name.toLowerCase())) {
					item.creators.push(ZU.cleanAuthor(name, 'author'));
				}
			}
		}
	}

	// DOM/meta fallbacks for anything missing
	if (!item.title || !item.title.trim()) {
		item.title = ZU.unescapeHTML(
			meta(doc, 'og:title')
			|| text(doc, 'header.mvp-post-head h1.mvp-post-title.left.entry-title')
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

	// If date still empty, try datePublished time tag
	if (!item.date || !item.date.trim()) {
		let timeDate = time(doc, 'datePublished');
		if (timeDate) {
			let isoDate = ZU.strToISO(timeDate);
			if (isoDate) {
				item.date = isoDate;
			}
			else {
				item.date = timeDate;
			}
		}
	}

	if (!item.url || !item.url.trim()) {
		item.url = meta(doc, 'og:url') || url;
	}

	if (!item.publicationTitle) {
		item.publicationTitle = 'Nigeria CommunicationsWeek';
	}

	if (!item.ISSN) {
		item.ISSN = '2006-2559';
	}
	
	// If no creators yet, try common DOM byline selectors (skip org-like)
	if (item.creators.length === 0) {
		let cand = meta(doc, 'author')
			|| text(doc, 'span.author-name.vcard.fn.author a');

		if (cand && !/agency|news desk|agency reporter|communications|our reporter|week|nigeria|staff|bureau/i.test(cand.toLowerCase())) {
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
		"url": "https://www.nigeriacommunicationsweek.com.ng/airtel-africa-foundation-opens-undergraduate-scholarship-portal-in-nigeria/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Airtel Africa Foundation Opens Undergraduate Scholarship Portal in Nigeria",
				"creators": [
					{
						"firstName": "Chike",
						"lastName": "Onwuegbuchi",
						"creatorType": "author"
					}
				],
				"date": "2025-12-11",
				"ISSN": "2006-2559",
				"abstractNote": "Kindly share this postThe Airtel Africa Foundation has opened applications for its Undergraduate Tech Scholarship in Nigeria, inviting first-year university students with strong academic potential to apply for financial support aimed at accelerating their studies in technology and related fields. The scheme provides full tuition, accommodation support, and essential study materials for eligible 100-level students. […]",
				"libraryCatalog": "Nigeria CommunicationsWeek",
				"place": "Nigeria",
				"publicationTitle": "Nigeria CommunicationsWeek",
				"url": "https://www.nigeriacommunicationsweek.com.ng/airtel-africa-foundation-opens-undergraduate-scholarship-portal-in-nigeria/",
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
		"url": "https://www.nigeriacommunicationsweek.com.ng/globacom-renews-partnership-with-abuja-chamber/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Globacom Renews Partnership with Abuja Chamber",
				"creators": [],
				"date": "2008-05-06",
				"ISSN": "2006-2559",
				"abstractNote": "Kindly share this postGlobacom, Nigeria’s national telecommunications operator,is partnering with the Abuja Chamber of Commerce, Industries, Mines and Agriculture (ABJCCIMA) to successful host the 3rd edition of the Abuja International Trade Fair, which kicked off on Friday, May 2 2008. Mr. Fidel Ndubuisi, managing director of Medalion Marketing, consultants to the Chamber, disclosed last week […]",
				"libraryCatalog": "Nigeria CommunicationsWeek",
				"place": "Nigeria",
				"publicationTitle": "Nigeria CommunicationsWeek",
				"url": "https://www.nigeriacommunicationsweek.com.ng/globacom-renews-partnership-with-abuja-chamber/",
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
		"url": "https://www.nigeriacommunicationsweek.com.ng/get-rich-quick-schemes-risky-sec-advises-nigerians/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Get-Rich-Quick Schemes Risky, SEC Advises Nigerians",
				"creators": [
					{
						"firstName": "Ugo",
						"lastName": "Onwuaso",
						"creatorType": "author"
					}
				],
				"date": "2025-12-03",
				"ISSN": "2006-2559",
				"abstractNote": "Kindly share this post Securities and Exchange Commission (SEC) has reaffirmed its commitment to intensify inter-agency collaboration in identifying and prosecuting promoters of Ponzi schemes, in line with the provisions of the Investments and Securities Act (ISA) 2025. Mr John Achile, Divisional Head, Legal and Enforcement of SEC, made this known at the Commission’s Journalists’ […]",
				"libraryCatalog": "Nigeria CommunicationsWeek",
				"place": "Nigeria",
				"publicationTitle": "Nigeria CommunicationsWeek",
				"url": "https://www.nigeriacommunicationsweek.com.ng/get-rich-quick-schemes-risky-sec-advises-nigerians/",
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
