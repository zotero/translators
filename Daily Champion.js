{
	"translatorID": "d4b1281e-84a7-4cbe-af04-0a4adb5c368c",
	"label": "Daily Champion",
	"creator": "VWF",
	"target": "^https?://www\\.?.championnews\\.com\\.ng/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-12-09 16:24:47"
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
	if (text(doc, 'h1.entry-title.penci-entry-title.penci-title-')) {
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
			if (np && !/^(agency|news desk|daily|champion|editor|reporter|editorial|nigeria|staff|bureau)$/i.test(np)) {
				cleaned.push(np);
			}
		}
		return cleaned;
	}
	
	let item = new Zotero.Item('newspaperArticle');

	let data = parseJSONLD(doc);

	// ===== Author Detection =====
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
		name = name.replace(/^\s*from\s+/i, "").trim(); // handle "From Cyril Mbah"
		name = name.replace(/^\s*détails avec\s+/i, "").trim(); // handle "Détails avec ..."
		name = name.replace(/\s+reports?$/i, "").trim();
		name = name.replace(/\s+in\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/i, "").trim();
		name = name.replace(/,\s*[A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*$/i, "").trim(); // remove trailing city
		name = name.replace(/\s*[–-]\s*[A-Z][a-z]+$/i, "").trim(); // remove dash + city
		// Convert to proper case if all caps
		if (/^[A-Z\s,.-]+$/.test(name)) {
			name = name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
		}
		return name;
	}

	function extractAuthorsFromParagraph(text) {
		if (!text) return [];
		text = text.trim();

		// Normalise punctuation
		text = text.replace(/\.\s*$/, "").trim();

		let authors = [];

		// Only treat as author paragraph if it matches explicit author patterns
		if (/^(by\s+[A-Z]|from\s+[A-Z]|détails avec\s+[A-Z]|[A-Z].*\sreports?)/i.test(text)) {
			text = text.replace(/^\s*by\s+/i, "").trim();
			text = text.replace(/^\s*from\s+/i, "").trim();
			text = text.replace(/^\s*détails avec\s+/i, "").trim();
			let parts = text.split(/\s*(?:,|and|&|–)\s+/i);
			for (let part of parts) {
				let m = part.match(/[A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){0,3}/g);
				if (m) {
					let name = cleanAuthor(m[0]);
					if (name && !isSingleName(name)) authors.push(name);
				}
			}
		}

		return authors;
	}

	// Usage in scrape():
	let ps = doc.querySelectorAll("div.penci-entry-content.entry-content p");
	let authorCandidates = [];

	// Check first three <p> tags, but only accept if they match author patterns
	for (let i = 0; i < Math.min(ps.length, 3); i++) {
		let txt = ps[i].textContent.trim();
		if (!txt) continue;

		// Skip long descriptive paragraphs unless they match explicit author formats
		if (
			txt.length > 150
			&& !/^by\s+[A-Z]/i.test(txt)
			&& !/^from\s+[A-Z]/i.test(txt)
			&& !/^détails avec\s+[A-Z]/i.test(txt)
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

	// Fallback to meta author if no valid CSS author found
	if (!authorCandidates.length && item.creators.length === 0) {
		let cand1 = meta(doc, 'author');
		let cand2 = meta(doc, 'article:author');

		let candidates = [];

		if (cand1) {
			candidates = splitAuthors(cand1);
		}
		else if (cand2) {
			candidates = splitAuthors(cand2);
		}

		for (let name of candidates) {
			if (
				name
				&& !/agency|news desk|daily|champion|editor|reporter|editorial|nigeria|staff|bureau/i.test(name.toLowerCase())
				&& isMultiWordAuthor(name)
			) {
				item.creators.push(ZU.cleanAuthor(name, 'author'));
			}
		}
	}

	// Push authors from CSS detection
	if (authorCandidates.length) {
		for (let a of authorCandidates) {
			item.creators.push(ZU.cleanAuthor(a, "author"));
		}
	}

	// --- JSON-LD authors ---
	if (item.creators.length === 0 && data && data.author) {
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

			name = cleanAuthor(name || '');

			if (
				name
				&& !/agency|news desk|daily|champion|editor|reporter|editorial|nigeria|staff|bureau/i.test(name.toLowerCase())
				&& !isSingleName(name)
			) {
				item.creators.push(ZU.cleanAuthor(name, 'author'));
			}
		}
	}

	// If JSON-LD present, prefer it
	if (data) {
		item.title = ZU.unescapeHTML(
			data.headline
			|| meta(doc, 'og:title')
			|| text(doc, 'h1.entry-title.penci-entry-title.penci-title-')
			|| ''
		);

		// Remove trailing "- Champion Newspapers LTD" or variants
		item.title = item.title.replace(/\s*[-–—]\s*Champion\s*Newspapers\s*LTD\s*$/i, '').trim();

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
	}

	// --- Fallbacks ---
	if (!item.title || !item.title.trim()) {
		item.title = ZU.unescapeHTML(
			meta(doc, 'og:title')
			|| text(doc, 'header.single-header h1.s-title.fw-headline')
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
		item.publicationTitle = 'Daily Champion';
	}

	if (!item.ISSN) {
		item.ISSN = '0795-5146';
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
		"url": "https://championnews.com.ng/2024/10/27/sustainable-solutions-to-nigerias-problems-require-focused-policies-udo-2023-adp-vp-candidate/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Sustainable solutions to Nigeria’s problems require focused policies –Udo, 2023 ADP VP candidate",
				"creators": [
					{
						"firstName": "Bisiriyu",
						"lastName": "Olaoye",
						"creatorType": "author"
					}
				],
				"date": "2024-10-27",
				"ISSN": "0795-5146",
				"abstractNote": "PASTOR OKEY UDO, the 2023 Vice Presidential Candidate of Action Democratic Party (ADP), talks to ISAAC NGUMAH on national contemporary issues in the country. Excerpt: Nigeria at 64, what is your assessment so far? At 64 years of independence, Nigeria should indeed embody the characteristics of an elder statesman, not...",
				"language": "en-US",
				"libraryCatalog": "Daily Champion",
				"place": "Nigeria",
				"publicationTitle": "Daily Champion",
				"url": "https://championnews.com.ng/2024/10/27/sustainable-solutions-to-nigerias-problems-require-focused-policies-udo-2023-adp-vp-candidate/",
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
		"url": "https://championnews.com.ng/2024/10/27/oshiomhole-debunks-claims-of-leadership-rift-in-edo-apc/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Oshiomhole debunks claims of leadership rift in Edo APC.",
				"creators": [
					{
						"firstName": "Cyril",
						"lastName": "Mbah",
						"creatorType": "author"
					}
				],
				"date": "2024-10-27",
				"ISSN": "0795-5146",
				"abstractNote": "From Cyril Mbah, Abuja. Senator Adams Aliyu Eric Oshiomhole has vehemently dismissed claims of alleged conflict of interests within the leadership of the All Progressives Congress (APC) in Edo State over the nomination of persons who will serve in the incoming government. The senator pointed out that the...",
				"language": "en-US",
				"libraryCatalog": "Daily Champion",
				"place": "Nigeria",
				"publicationTitle": "Daily Champion",
				"url": "https://championnews.com.ng/2024/10/27/oshiomhole-debunks-claims-of-leadership-rift-in-edo-apc/",
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
		"url": "https://championnews.com.ng/2024/10/27/tunji-alausa-and-nigerias-grand-education-strategy/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Tunji Alausa and Nigeria’s Grand Education Strategy",
				"creators": [
					{
						"firstName": "Dakuku",
						"lastName": "Peterside",
						"creatorType": "author"
					}
				],
				"date": "2024-10-27",
				"ISSN": "0795-5146",
				"abstractNote": "By Dakuku Peterside   The challenges in Nigeria’s educational sector are complex and pressing, encompassing poor quality, inadequate funding, limited access, and an outdated curriculum. The World Bank reports that Nigeria’s education sector is severely underfunded, with only about 7% of the federal budget allocated to education in 2024,...",
				"language": "en-US",
				"libraryCatalog": "Daily Champion",
				"place": "Nigeria",
				"publicationTitle": "Daily Champion",
				"url": "https://championnews.com.ng/2024/10/27/tunji-alausa-and-nigerias-grand-education-strategy/",
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
		"url": "https://championnews.com.ng/2025/05/16/tayo-folorunsho-partners-with-fari-elysian-foundation-to-host-content-creation-masterclass-2-0-in-abuja/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Tayo Folorunsho partners with Fari Elysian Foundation to host Content Creation Masterclass 2.0 in Abuja",
				"creators": [
					{
						"firstName": "Peter",
						"lastName": "Anayo",
						"creatorType": "author"
					}
				],
				"date": "2025-05-16",
				"ISSN": "0795-5146",
				"abstractNote": "In a groundbreaking initiative to empower Nigeria’s next generation of digital storytellers, Tayo Folorunsho, Founder of Edutainment First",
				"language": "en-US",
				"libraryCatalog": "Daily Champion",
				"place": "Nigeria",
				"publicationTitle": "Daily Champion",
				"url": "https://championnews.com.ng/2025/05/16/tayo-folorunsho-partners-with-fari-elysian-foundation-to-host-content-creation-masterclass-2-0-in-abuja/",
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
		"url": "https://championnews.com.ng/2025/12/09/lap-unveils-scholarship-for-36-anambra-students/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "LAP unveils scholarship for 36 Anambra students",
				"creators": [
					{
						"firstName": "Peter",
						"lastName": "Anayo",
						"creatorType": "author"
					}
				],
				"date": "2025-12-09",
				"ISSN": "0795-5146",
				"abstractNote": "League of Anambra Professionals (LAP), on Frida,y officially launched the maiden edition of her Future Forward Scholarship Scheme, which ben",
				"language": "en-US",
				"libraryCatalog": "Daily Champion",
				"place": "Nigeria",
				"publicationTitle": "Daily Champion",
				"url": "https://championnews.com.ng/2025/12/09/lap-unveils-scholarship-for-36-anambra-students/",
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
