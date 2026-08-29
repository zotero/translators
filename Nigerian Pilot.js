{
	"translatorID": "769a21e1-be3a-4167-aa18-c00b53b8d7da",
	"label": "Nigerian Pilot",
	"creator": "VWF",
	"target": "^https?://www\\.?.nigerianpilot\\.net/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-12-17 14:27:48"
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
					if (t.includes('BlogPosting')) {
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
	if (text(doc, 'header.entry-header h1.entry-title')) {
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

	// Author Detection
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

	function extractAuthorsFromParagraph(text) {
		if (!text) return [];
		text = text.trim();
		text = text.replace(/\.\s*$/, "").trim();

		let authors = [];

		if (/^(by\s+[A-Z]|from\s+[A-Z]|[A-Z].*\sreports?)/i.test(text)) {
			text = text.replace(/^\s*by\s+/i, "").trim();
			text = text.replace(/^\s*from\s+/i, "").trim();
			let parts = text.split(/\s*(?:,|and|&|–)\s+/i);
			for (let part of parts) {
				let m = part.match(/[A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){0,3}/);
				if (m) {
					let name = cleanAuthor(m[0]);
					if (name && !isSingleName(name)) authors.push(name);
				}
			}
		}

		return authors;
	}
	
	let item = new Zotero.Item('newspaperArticle');

	let data = parseJSONLD(doc);

	// If JSON-LD present, prefer it
	if (data) {
		item.title = ZU.unescapeHTML(
			data.headline
			|| meta(doc, 'og:title')
			|| text(doc, 'header.td-post-title h1.entry-title')
			|| ''
		);

		// Remove trailing "- Nigerian Pilot" or variants
		item.title = item.title.replace(/\s*[-–—]\s*Nigerian\s*Pilot\s*$/i, '').trim();

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
					&& !/agency|desk|reporter|daily|pilot|editor|nigeria|staff|bureau/i.test(name.toLowerCase())
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
			|| text(doc, 'header.td-post-title h1.entry-title')
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
		item.publicationTitle = 'Nigerian Pilot';
	}

	if (!item.ISSN) {
		item.ISSN = '2141-7199';
	}
	
	// --- Fallback authors in sequence ---
	if (item.creators.length === 0) {
		let ps = doc.querySelectorAll("div.entry-content p");
		let authorCandidates = [];

		for (let i = 0; i < Math.min(ps.length, 4); i++) {
			let txt = ps[i].textContent.trim();
			if (!txt) continue;

			if (
				txt.length > 150
				&& !/^by\s+[A-Z]/i.test(txt)
				&& !/^from\s+[A-Z]/i.test(txt)
				&& !/[A-Z].*\sreports?/i.test(txt)
			) {
				continue;
			}

			let found = extractAuthorsFromParagraph(txt);
			if (found.length) {
				authorCandidates = found;
				break;
			}
		}

		for (let a of authorCandidates) {
			item.creators.push(ZU.cleanAuthor(a, "author"));
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
		"url": "https://nigerianpilot.net/nelfund-commends-dangote-foundation-on-launch-of-%e2%82%a6100bn-annual-scholarship-initiative/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "NELFUND commends Dangote Foundation on launch of ₦100bn annual scholarship initiative",
				"creators": [
					{
						"firstName": "Ngozi",
						"lastName": "Nwankwo",
						"creatorType": "author"
					}
				],
				"date": "2025-12-14",
				"ISSN": "2141-7199",
				"abstractNote": "By Ngozi Nwankwo The Nigerian Education Loan Fund,NELFUND, has congratulated the Aliko Dangote Foundation on the launch of its unprecedented ₦100 billion annual education scholarship initiative, a decade-long commitment that will support more than 1.3 million Nigerian students across secondary and tertiary institutions. NELFUND described the initiative, unveiled in Lagos in the presence of Vice December 14, 2025",
				"language": "en-US",
				"libraryCatalog": "Nigerian Pilot",
				"place": "Nigeria",
				"publicationTitle": "Nigerian Pilot",
				"url": "https://nigerianpilot.net/nelfund-commends-dangote-foundation-on-launch-of-%e2%82%a6100bn-annual-scholarship-initiative/",
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
		"url": "https://nigerianpilot.net/british-council-collaborates-with-fg-development-partners-for-inclusive-education-in-nigeria/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "British Council collaborates with FG,, development partners for inclusive education in Nigeria",
				"creators": [
					{
						"firstName": "Moses",
						"lastName": "Okorie",
						"creatorType": "author"
					}
				],
				"date": "2025-11-14",
				"ISSN": "2141-7199",
				"abstractNote": "By Moses Okorie The British Council has collaborated with the Federal Government and Development Partners to collectively seek strategies to make education inclusive, equitable, and transformative across the region. This was highlighted at the Language in Education International Conference 2025, themed “Language, Education and Inclusion: Empowering Every Learner”, where the Minister of Education, Dr. Maruf November 14, 2025",
				"language": "en-US",
				"libraryCatalog": "Nigerian Pilot",
				"place": "Nigeria",
				"publicationTitle": "Nigerian Pilot",
				"url": "https://nigerianpilot.net/british-council-collaborates-with-fg-development-partners-for-inclusive-education-in-nigeria/",
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
