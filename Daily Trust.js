{
	"translatorID": "227279f5-e383-42bb-8b60-437279dbac02",
	"label": "Daily Trust",
	"creator": "VWF",
	"target": "^https?://(www\\.)?(dailytrust\\.com|aminiya\\.ng)/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-11-04 12:39:17"
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

function parseJSONLD(doc, url) {
	// 1. Determine which types to search for based on the URL
	let allowedTypes = [];
	if (url && url.includes('dailytrust.com')) {
		allowedTypes = ['BlogPosting'];
	}
	else if (url && url.includes('aminiya.ng')) {
		allowedTypes = ['Article'];
	}

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

				const typesInSchema = Array.isArray(t) ? t : [t];

				// 2. Check if any type in the schema matches an allowed type for the current site
				const typeMatchesSite = typesInSchema.some(schemaType => typeof schemaType === 'string' && allowedTypes.some(allowed => schemaType.includes(allowed))
				);

				if (typeMatchesSite) {
					return cand;
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
	return url && (url.includes('/tag/') || url.includes('/category/') || url.includes('/topics/'));
}

function detectWeb(doc, url) {
	url = url || doc.location.href;

	if (isIndexURL(url)) {
		return 'multiple';
	}

	let j = parseJSONLD(doc, url);
	if (j) {
		return 'newspaperArticle';
	}

	// Explicit fallback ONLY for category/tag pages
	if (getSearchResults(doc, true) && isIndexURL(url)) {
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

	let itype = 'newspaperArticle';
	let item = new Zotero.Item(itype);
	let data = parseJSONLD(doc, url);

	if (data) {
		if (url.includes('aminiya.ng')) {
			item.title = ZU.unescapeHTML(
				meta(doc, 'og:title')
				|| text(doc, 'section.title-header h1.h1v1')
				|| ''
			);
			item.language = 'ha';
			item.url = meta(doc, 'og:url') || url;
		}
		else if (url.includes('dailytrust.com')) {
			item.title = ZU.unescapeHTML(
				data.headline
				|| meta(doc, 'og:title')
				|| text(doc, 'section.title-header h1.h1v1')
				|| ''
			);

			// Remove trailing "- Daily Trust" or variants
			item.title = item.title.replace(/\s*[-–—]\s*Daily\s*Trust\s*$/i, '').trim();

			item.language = data.inLanguage || meta(doc, 'og:locale') || 'en';
			item.url = data.url || meta(doc, 'og:url') || (data['@type'] === 'WebPage' && data['@id']) || url;
		}
		else {
			item.title = ZU.unescapeHTML(
				data.headline
				|| meta(doc, 'og:title')
				|| text(doc, 'section.title-header h1.h1v1')
				|| ''
			);
			item.language = data.inLanguage || meta(doc, 'og:locale') || 'en';
			item.url = data.url || meta(doc, 'og:url') || url;
		}

		item.abstractNote = ZU.unescapeHTML(
			data.description
			|| meta(doc, 'og:description')
			|| ''
		);

		item.ISSN = (url && url.includes('aminiya.ng')) ? '0794-9049' : '1119-1732';

		let rawJsonDate = data.datePublished || meta(doc, 'article:published_time') || '';
		if (rawJsonDate) {
			let isoFromZU = ZU.strToISO(rawJsonDate);
			item.date = isoFromZU || rawJsonDate;
		}

		if (data.articleSection) {
			let section = Array.isArray(data.articleSection)
				? data.articleSection.map(s => s.toLowerCase())
				: [data.articleSection.toLowerCase()];
			if (section.includes('editorial')) {
				item.creators = [];
			}
		}
	}

	if (!item.title || !item.title.trim()) {
		item.title = ZU.unescapeHTML(
			meta(doc, 'og:title')
			|| text(doc, 'section.title-header h1.h1v1')
			|| ''
		);
	}

	if (!item.abstractNote || !item.abstractNote.trim()) {
		item.abstractNote = ZU.unescapeHTML(meta(doc, 'og:description') || '');
	}

	if (!item.publicationTitle) item.publicationTitle = (url && url.includes('aminiya.ng')) ? 'Aminiya' : 'Daily Trust';

	// ===== AUTHOR EXTRACTION =====
	item.creators = [];

	(function () {
		function cleanCandidateText(t) {
			if (!t) return '';
			return t
				.replace(/^\s*(By|Written by)\s+/i, '')
				.replace(/\s*\|.*$/, '')
				.replace(/\s*,\s*$/, '')
				.replace(/\s*\(.*\)\s*$/, '')
				.trim();
		}

		function isSingleName(name) {
			if (!name) return true;
			name = name.trim();
			name = name.replace(/^\s*by\s+/i, '').trim();
			if (name.split(/\s+/).length === 1) return true;
			if (/^[A-Z0-9-]+$/.test(name)) return true;
			return false;
		}

		function isNonHuman(name) {
			return /agency|news\s*desk|agency\s*reporter|daily\s*trust|aminiya|correspond|editorial|staff|bureau|press/i.test(name);
		}

		let authorCandidates = [];

		// --- 1. JSON-LD authors ---
		if (data && data.author) {
			if (Array.isArray(data.author)) {
				for (let a of data.author) {
					if (a && typeof a === 'object' && a['@type'] === 'Person' && a.name) {
						authorCandidates.push(a.name.trim());
					}
					else if (typeof a === 'string') {
						authorCandidates.push(a.trim());
					}
				}
			}
			else if (typeof data.author === 'object' && data.author['@type'] === 'Person' && data.author.name) {
				authorCandidates.push(data.author.name.trim());
			}
			else if (typeof data.author === 'string') {
				authorCandidates.push(data.author.trim());
			}
		}

		// --- 2. CSS author overrides JSON-LD if valid ---
		let cssAuthors = [...doc.querySelectorAll('section.post-author a')]
			.map(a => a.textContent.trim())
			.filter(Boolean);
		if (cssAuthors.length) {
			authorCandidates = cssAuthors;
		}

		// --- 3. Clean and filter authors ---
		let validAuthors = [];
		for (let rawName of authorCandidates) {
			let name = cleanCandidateText(rawName);
			if (!name) continue;
			if (isNonHuman(name)) continue;
			if (isSingleName(name)) continue;
			validAuthors.push(name);
		}

		// --- 4. Save authors if any valid found ---
		for (let name of validAuthors) {
			item.creators.push(ZU.cleanAuthor(name, 'author'));
		}
	})();

	item.attachments.push({ document: doc, title: 'Snapshot' });
	item.place = 'Nigeria';
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://dailytrust.com/gidan-palmer-maimaina-sarkin-askira-and-related-matters-i/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Gidan Palmer, Maimaina Sarkin Askira And Related Matters (I)",
				"creators": [
					{
						"firstName": "Gambo",
						"lastName": "Dori",
						"creatorType": "author"
					}
				],
				"date": "2025-11-03",
				"ISSN": "1119-1732",
				"abstractNote": "The ceremony held last Wednesday in Kano to inaugurate and showcase the newly refurbished Gidan Palmer is an indication that Kano is finally coming to terms",
				"language": "en-US",
				"libraryCatalog": "Daily Trust",
				"place": "Nigeria",
				"publicationTitle": "Daily Trust",
				"url": "https://dailytrust.com/gidan-palmer-maimaina-sarkin-askira-and-related-matters-i/",
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
		"url": "https://dailytrust.com/kannywood-actor-buried-in-yobe/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Kannywood Actor Buried In Yobe",
				"creators": [
					{
						"firstName": "Habibu",
						"lastName": "Gimba",
						"creatorType": "author"
					}
				],
				"date": "2025-11-03",
				"ISSN": "1119-1732",
				"abstractNote": "Kannywood actor, Alhaji Mato Yakubu, popularly known as Malam Nata’ala from the long-running TV series ‘Dadin Kowa’, has been buried in Yobe state.",
				"language": "en-US",
				"libraryCatalog": "Daily Trust",
				"place": "Nigeria",
				"publicationTitle": "Daily Trust",
				"url": "https://dailytrust.com/kannywood-actor-buried-in-yobe/",
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
		"url": "https://dailytrust.com/trumps-threat-of-war-with-nigeria/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Trump's Threat Of War With Nigeria",
				"creators": [],
				"date": "2025-11-02",
				"ISSN": "1119-1732",
				"abstractNote": "By Femi Fani-Kayode",
				"language": "en-US",
				"libraryCatalog": "Daily Trust",
				"place": "Nigeria",
				"publicationTitle": "Daily Trust",
				"url": "https://dailytrust.com/trumps-threat-of-war-with-nigeria/",
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
