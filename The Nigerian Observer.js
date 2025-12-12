{
	"translatorID": "a9fed5ca-7566-4810-a9ce-988d0b83fa84",
	"label": "The Nigerian Observer",
	"creator": "VWF",
	"target": "^https?://www\\.?.nigerianobservernews\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-12-12 12:52:11"
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

function isMultiWordAuthor(name) {
	return name && name.trim().split(/\s+/).length > 1;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
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
	// ARTICLE detection ONLY by headline selector
	if (text(doc, 'article h1.post-title')) {
		return 'newspaperArticle';
	}

	// MULTIPLE detection
	if (isIndexURL(url)) {
		return 'multiple';
	}

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
}

async function scrape(doc, url) {
	url = url || doc.location.href;

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

		if (/^(by\s+[A-Z]|from\s+[A-Z]|détails avec\s+[A-Z]|[A-Z].*\sreports?)/i.test(text)) {
			text = text.replace(/^\s*by\s+/i, "").trim();
			text = text.replace(/^\s*from\s+/i, "").trim();
			text = text.replace(/^\s*détails avec\s+/i, "").trim();
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

	// ===== HEADLINE =====
	item.title = ZU.unescapeHTML(
		text(doc, 'title')
		|| text(doc, 'article h1.post-title')
		|| ''
	);

	// ===== ABSTRACT =====
	item.abstractNote = ZU.unescapeHTML(
		text(doc, 'div.post-content>p') || ''
	);

	// ===== URL =====
	let canonical = doc.querySelector('link[rel="canonical"]');
	item.url = canonical ? canonical.href : url;

	// ===== LANGUAGE =====
	item.language = 'en';

	// ===== DATE =====
	let dateNode = doc.querySelector('div.post-meta p.post-date');
	if (dateNode) {
		let raw = dateNode.textContent.trim();

		// Case 1: DD/MM/YYYY
		let parts = raw.split('/');
		if (parts.length === 3) {
			item.date = `${parts[2]}-${parts[1]}-${parts[0]}`;
		}

		// Case 2: "April 4, 2025"
		else {
			let parsed = new Date(raw);
			if (!isNaN(parsed)) {
				let yyyy = parsed.getFullYear();
				let mm = String(parsed.getMonth() + 1).padStart(2, '0');
				let dd = String(parsed.getDate()).padStart(2, '0');
				item.date = `${yyyy}-${mm}-${dd}`;
			}
		}
	}

	// ===== AUTHORS (CSS paragraphs first) =====
	let ps = doc.querySelectorAll("div.post-content p");
	let authorCandidates = [];

	for (let i = 0; i < Math.min(ps.length, 4); i++) {
		let txt = ps[i].textContent.trim();
		if (!txt) continue;

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

	// ===== FALLBACK AUTHOR (BYLINE NEAR HEADLINE) =====
	if (!authorCandidates.length) {
		let byline = doc.querySelector('div.post-meta p.post-author a');
		if (byline) {
			let name = cleanAuthor(byline.textContent.trim());
			if (name && isMultiWordAuthor(name)) {
				authorCandidates.push(name);
			}
		}
	}

	for (let a of authorCandidates) {
		item.creators.push(ZU.cleanAuthor(a, "author"));
	}

	// ===== PUBLICATION INFO =====
	item.publicationTitle = 'The Nigerian Observer';
	item.ISSN = '0331-2674';

	item.attachments.push({
		document: doc,
		title: 'Snapshot'
	});

	item.place = 'Nigeria';
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
