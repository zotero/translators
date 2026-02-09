{
	"translatorID": "c24920f8-d49d-4918-a90d-92fde788b08b",
	"label": "The Authority",
	"creator": "VWF",
	"target": "^https?://www\\.?.authorityngr\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-12-18 14:13:02"
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
	return url && (url.includes('/tag/') || url.includes('/section/'));
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

	// --- PRIMARY AUTHOR METHOD: P‑TAG DETECTION ---
	if (item.creators.length === 0) {
		let ps = doc.querySelectorAll("div.penci-entry-content p");
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

	// --- FALLBACK AUTHOR METHOD: JSON‑LD AUTHORS ---
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

			name = (name || '').trim();

			if (name.includes('|')) {
				name = name.split('|')[0].trim();
			}

			name = name.replace(/,\s*[A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*$/, '').trim();

			if (
				name
				&& !/agency|desk|reporter|authority|editor|nigeria|staff|bureau|newspaper/i.test(name.toLowerCase())
				&& isMultiWordAuthor(name)
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
			|| text(doc, 'header.entry-header h1.entry-title')
			|| ''
		);

		// Remove trailing "- THE AUTHORITY NEWS" or variants
		item.title = item.title.replace(/\s*[-–—]\s*THE\s*AUTHORITY\s*NEWS\s*$/i, '').trim();

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
			|| text(doc, 'header.entry-header h1.entry-title')
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
		item.publicationTitle = 'The Authority';
	}

	if (!item.ISSN) {
		item.ISSN = '1595-9996';
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
		"url": "https://authorityngr.com/2025/12/17/nsitfs-rehabilitation-programme-restoring-hope-life-and-dignity-to-injured-workers/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "NSITF’s Rehabilitation Programme: Restoring hope, life, and dignity to injured workers",
				"creators": [
					{
						"firstName": "Emmanuel",
						"lastName": "Ulayi",
						"creatorType": "author"
					}
				],
				"date": "2025-12-17",
				"ISSN": "1595-9996",
				"abstractNote": "By Emmanuel Ulayi, Ph.D Forty-year-old Taiwo Adebola bade his young family goodbye as he left for work on a Tuesday morning in June 2024. His wife, Shade, reminded him to send her the two thousand Naira needed to process her online registration for employment with a government agency. However, the call...",
				"language": "en-US",
				"libraryCatalog": "The Authority",
				"place": "Nigeria",
				"publicationTitle": "The Authority",
				"shortTitle": "NSITF’s Rehabilitation Programme",
				"url": "https://authorityngr.com/2025/12/17/nsitfs-rehabilitation-programme-restoring-hope-life-and-dignity-to-injured-workers/",
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
		"url": "https://authorityngr.com/2025/12/17/gods-faithfulness-tom-samson-clocks-60-unveils-monarch-university/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "God’s faithfulness: Tom Samson clocks 60, unveils Monarch University",
				"creators": [
					{
						"firstName": "Cyriacus",
						"lastName": "Nnaji",
						"creatorType": "author"
					}
				],
				"date": "2025-12-17",
				"ISSN": "1595-9996",
				"abstractNote": "…As he receives encomiums By Cyriacus Nnaji For a man who is widely known with the slogan, “With God nothing is impossible”, there is indeed nothing he sets out to do that is impossible. A man who came face to face with poverty as a child; now blessed by God...",
				"language": "en-US",
				"libraryCatalog": "The Authority",
				"place": "Nigeria",
				"publicationTitle": "The Authority",
				"shortTitle": "God’s faithfulness",
				"url": "https://authorityngr.com/2025/12/17/gods-faithfulness-tom-samson-clocks-60-unveils-monarch-university/",
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
		"url": "https://authorityngr.com/2025/12/17/nans-backs-matawalle-dismisses-banditry-allegations-as-political-blackmail/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "NANS backs Matawalle, dismisses banditry allegations as political blackmail",
				"creators": [
					{
						"firstName": "Joe",
						"lastName": "Abuchi",
						"creatorType": "author"
					}
				],
				"date": "2025-12-17",
				"ISSN": "1595-9996",
				"abstractNote": "The National Association of Nigerian Students(NANs )has dismissed allegations linking the Minister of State for Defence, Bello Matawalle, to banditry, describing them as baseless and politically motivated. The student body said Matawalle was being unfairly targeted at a time the country needed unity to tackle worsening insecurity. In a statement...",
				"language": "en-US",
				"libraryCatalog": "The Authority",
				"place": "Nigeria",
				"publicationTitle": "The Authority",
				"url": "https://authorityngr.com/2025/12/17/nans-backs-matawalle-dismisses-banditry-allegations-as-political-blackmail/",
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
