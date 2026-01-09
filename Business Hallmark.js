{
	"translatorID": "da3f6447-af15-4b6a-8acf-c6fe2ffa6c09",
	"label": "Business Hallmark",
	"creator": "VWF",
	"target": "^https?://www\\.?hallmarknews\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"lastUpdated": "2025-12-13 08:31:12"
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

	function isSingleName(name) {
		if (!name) return true;
		name = name.trim();
		if (name.split(/\s+/).length === 1) return true;
		if (/^[A-Z0-9-]+$/.test(name)) return true;
		return false;
	}

	function cleanAuthor(raw) {
		if (!raw) return "";
		let name = raw.replace(/^\s*by\s+/i, "").trim();
		name = name.replace(/^\s*from\s+/i, "").trim();
		name = name.replace(/\s+reports?$/i, "").trim();
		name = name.replace(/\s+in\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/i, "").trim();
		name = name.replace(/,\s*[A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*$/i, "").trim();
		name = name.replace(/\s*[–-]\s*[A-Z][a-z]+$/i, "").trim();
		if (/^[A-Z\s,.-]+$/.test(name)) {
			name = name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
		}
		return name;
	}

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
			|| meta(doc, 'twitter:description')
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
				if (name && !/agency|news desk|agency reporter|hallmark|our reporter|business|nigeria|staff|bureau/i.test(name.toLowerCase())) {
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
			|| meta(doc, 'twitter:description')
			|| ''
		);
	}

	// If date still empty, try <time itemprop="datePublished">
	if (!item.date || !item.date.trim()) {
		let timeNode = doc.querySelector('time.post-date.updated[itemprop="datePublished"]');
		if (timeNode) {
			// Prefer the datetime="" attribute (already ISO)
			let dt = timeNode.getAttribute('datetime');
			if (dt) {
				item.date = dt.trim();
			}
			else {
				// Fallback: parse visible text like "December 12, 2025"
				let raw = timeNode.textContent.trim();
				let parsed = new Date(raw);
				if (!isNaN(parsed)) {
					let yyyy = parsed.getFullYear();
					let mm = String(parsed.getMonth() + 1).padStart(2, '0');
					let dd = String(parsed.getDate()).padStart(2, '0');
					item.date = `${yyyy}-${mm}-${dd}`;
				}
			}
		}
	}

	if (!item.url || !item.url.trim()) {
		item.url = meta(doc, 'og:url') || url;
	}

	if (!item.publicationTitle) {
		item.publicationTitle = 'Business Hallmark';
	}

	if (!item.ISSN) {
		item.ISSN = '2006-8697';
	}
	
	// If no creators yet, try common DOM byline selectors (skip org-like)
	if (item.creators.length === 0) {
		let cand = meta(doc, 'author')
			|| text(doc, 'span.author-name.vcard.fn.author a');

		if (cand) {
			let cleaned = cleanAuthor(cand);

			if (
				cleaned
				&& !isSingleName(cleaned)
				&& !/agency|news desk|agency reporter|hallmark|our reporter|business|nigeria|staff|bureau/i.test(cleaned.toLowerCase())
			) {
				item.creators.push(ZU.cleanAuthor(cleaned, 'author'));
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
		"url": "https://hallmarknews.com/osun-pathfinder-team-pledges-unwavering-support-for-gov-adeleke-as-accord-party-flag-bearer/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Osun Pathfinder Team pledges unwavering support for Gov. Adeleke as Accord Party flag bearer",
				"creators": [
					{
						"firstName": "Sunday",
						"lastName": "Oguntuyi",
						"creatorType": "author"
					}
				],
				"date": "2025-12-11",
				"ISSN": "2006-8697",
				"abstractNote": "The socio-political movement, Osun Pathfinder Team, has congratulated Governor Ademola Adeleke on his emergence as the Accord Party governorship candidate, pledging unalloyed support for his re-election bid in 2026. In a statement issued in Osogbo on Thursday and jointly signed by its State Coordinator, Hon. Diti Aluko, and Secretary, Sola Akinleye, the group described Adeleke’s […]",
				"libraryCatalog": "Business Hallmark",
				"place": "Nigeria",
				"publicationTitle": "Business Hallmark",
				"url": "https://hallmarknews.com/osun-pathfinder-team-pledges-unwavering-support-for-gov-adeleke-as-accord-party-flag-bearer/",
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
		"url": "https://hallmarknews.com/abuja-court-sends-ex-minister-ngige-to-kuje-as-efcc-opens-n2-2bn-fraud-case/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Abuja court sends ex-minister Ngige to Kuje as EFCC opens N2.2bn fraud case",
				"creators": [
					{
						"firstName": "Obinna",
						"lastName": "Ezugwu",
						"creatorType": "author"
					}
				],
				"date": "2025-12-12",
				"ISSN": "2006-8697",
				"abstractNote": "Former Minister of Labour and Employment, Chris Ngige, was on Friday remanded in Kuje Correctional Centre after he was arraigned before an Abuja High Court by the Economic and Financial Crimes Commission (EFCC) over alleged contract fraud amounting to more than N2.2 billion. Ngige, who served as supervising minister of the Nigeria Social Insurance Trust […]",
				"libraryCatalog": "Business Hallmark",
				"place": "Nigeria",
				"publicationTitle": "Business Hallmark",
				"url": "https://hallmarknews.com/abuja-court-sends-ex-minister-ngige-to-kuje-as-efcc-opens-n2-2bn-fraud-case/",
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
