{
	"translatorID": "17d8d3c1-f968-4bc8-b7c7-9a223b014bc8",
	"label": "Leadership",
	"creator": "VWF",
	"target": "^https?://(www\\.|hausa\\.|levogue\\.|conferences\\.)?leadership\\.ng/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"lastUpdated": "2025-10-31 16:15:01"
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
				const typesToCheck = Array.isArray(t) ? t : [t];
				const isArticleOrBlogPosting = typesToCheck.some(tt => typeof tt === 'string' && (tt.includes('Article') || tt.includes('BlogPosting')));
				if (isArticleOrBlogPosting) {
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

function isCollectionPage(doc) {
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
			else {
				candidates = [parsed];
			}
			
			for (let cand of candidates) {
				if (!cand) continue;
				let t = cand['@type'] || cand.type;

				if (t) {
					const types = Array.isArray(t) ? t : [t];

					if (types.some(typeStr => typeof typeStr === 'string' && typeStr === 'CollectionPage')) {
						return true;
					}
				}
			}
		}
		catch (e) {
			// ignore malformed JSON-LD
		}
	}

	return false;
}

function detectWeb(doc, url) {
	url = url || doc.location.href;

	if (isCollectionPage(doc)) {
		return 'multiple';
	}

	let j = parseJSONLD(doc);
	if (j) {
		if (url.includes('levogue.leadership.ng')) {
			return 'magazineArticle';
		}
		return 'newspaperArticle';
	}

	if (meta(doc, 'article:published_time') || meta(doc, 'og:type') === 'article') {
		if (url.includes('levogue.leadership.ng')) {
			return 'magazineArticle';
		}
		return 'newspaperArticle';
	}

	if (url.includes('levogue.leadership.ng')) {
		if (text(doc, 'div.entry-header>h1.jeg_post_title')) {
			return 'magazineArticle';
		}
	}
	else if (text(doc, 'div.entry-header>h1.jeg_post_title')) {
		return 'newspaperArticle';
	}

	// Explicit fallback ONLY for category/tag pages
	if (getSearchResults(doc, true) && isCollectionPage(doc)) {
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
	else if (mode === 'newspaperArticle' || mode === 'magazineArticle') {
		await scrape(doc, url);
	}
}

async function scrape(doc, url) {
	url = url || doc.location.href;

	function isSingleName(name) {
		if (!name) return true;
		name = name.trim();
		name = name.replace(/^\s*by\s+/i, '').trim();
		if (name.split(/\s+/).length === 1) return true;
		if (/^[A-Z0-9-]{2,}$/.test(name) && name.includes(' ') === -1) return true;
		return false;
	}

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
			if (np && !/^(agency|news desk|agency reporter|leadership|our reporter|levogue|editorial|nigeria|staff|bureau)$/i.test(np)) {
				cleaned.push(np);
			}
		}
		return cleaned;
	}

	let itype = (url && url.includes('levogue.leadership.ng')) ? 'magazineArticle' : 'newspaperArticle';
	let item = new Zotero.Item(itype);
	let data = parseJSONLD(doc);

	// 1. Collect meta-based author (highest priority)
	let metaAuthors = [];
	let metaSelectors = [
		'meta[name="author"]',
		'meta[property="og:author"]',
		'meta[property="article:author"]'
	];

	for (let sel of metaSelectors) {
		let nodes = doc.querySelectorAll(sel);
		for (let node of nodes) {
			let content = node.getAttribute('content');
			if (content) {
				let parts = splitAuthors(content);
				for (let part of parts) {
					part = part.trim();
					if (
						part
						&& !/^(agency|correspondent|news desk|agency reporter|leadership|our reporter|levogue|editorial|nigeria|staff|bureau)$/i.test(part)
						&& !isSingleName(part)
					) {
						metaAuthors.push(part);
					}
				}
			}
		}
	}

	// 2. Collect JSON-LD authors (lower priority, only if no meta authors)
	let jsonAuthors = [];
	if (!metaAuthors.length && data && data.author) {
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
		catch (e) {}

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

			name = (name || '')
				.trim()
				.replace(/^\s*by\s+/i, '')
				.replace(/\|.*$/, '')
				.replace(/,\s*[A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*$/, '')
				.trim();

			if (
				name
				&& !/agency|correspondent|news desk|agency reporter|leadership|our reporter|levogue|editorial|nigeria|staff|bureau/i.test(name.toLowerCase())
				&& !isSingleName(name)
			) {
				let authorParts = splitAuthors(name);
				for (let realName of authorParts) {
					realName = realName.trim();
					if (realName && !isSingleName(realName)) jsonAuthors.push(realName);
				}
			}
		}
	}

	// 3. Prioritise meta authors over JSON-LD authors, and remove duplicates
	let finalAuthors = metaAuthors.length ? metaAuthors : jsonAuthors;
	finalAuthors = [...new Set(finalAuthors)]; // remove duplicates

	// 4. Add only valid human authors to item.creators
	for (let auth of finalAuthors) {
		let lname = auth.toLowerCase();
		if (
			!/agency|correspondent|news desk|agency reporter|leadership|our reporter|levogue|editorial|nigeria|staff|bureau/i.test(lname)
			&& !isSingleName(auth)
		) {
			item.creators.push(ZU.cleanAuthor(auth, 'author'));
		}
	}

	if (data) {
		item.title = ZU.unescapeHTML(
			data.headline
			|| meta(doc, 'og:title')
			|| text(doc, 'div.entry-header>h1.jeg_post_title')
			|| ''
		);

		item.abstractNote = ZU.unescapeHTML(
			data.description
			|| meta(doc, 'og:description')
			|| ''
		);

		if (url && url.includes('hausa.leadership.ng')) {
			item.language = 'ha';
		}
		else {
			item.url = data.url || meta(doc, 'og:url') || url;
		}
		item.language = data.inLanguage || meta(doc, 'og:locale') || 'en';
		item.ISSN = '0331-328X';

		let rawJsonDate = data.datePublished || '';
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

	if (item.title) {
		let m = item.title.match(/,\s*by\s+(.+)$/i);
		if (m && m[1]) {
			let colAuthors = splitAuthors(m[1]);
			if (colAuthors.length) {
				item.creators = [];
				for (let ca of colAuthors) {
					if (!isSingleName(ca)) item.creators.push(ZU.cleanAuthor(ca, 'author'));
				}
			}
			item.title = item.title.replace(/,\s*by\s+(.+)$/i, '').trim();
		}
	}

	if (!item.title || !item.title.trim()) {
		item.title = ZU.unescapeHTML(
			meta(doc, 'og:title')
			|| text(doc, 'div.entry-header>h1.jeg_post_title')
			|| ''
		);
	}

	if (!item.abstractNote || !item.abstractNote.trim()) {
		item.abstractNote = ZU.unescapeHTML(meta(doc, 'og:description') || '');
	}

	if (!item.date || !item.date.trim()) {
		let metaDate = meta(doc, 'article:published_time');
		if (metaDate) item.date = ZU.strToISO(metaDate) || metaDate;
	}

	if (!item.url || !item.url.trim()) item.url = meta(doc, 'og:url') || url;
	
	if (!item.publicationTitle) {
		item.publicationTitle = (url && url.includes('levogue.leadership.ng')) ? 'LeVogue Magazine' : (url && url.includes('hausa.leadership.ng')) ? 'Leadership Hausa' : (url && url.includes('conferences.leadership.ng')) ? 'Leadership Conferences' : 'Leadership';
	}
	
	item.attachments.push({ document: doc, title: 'Snapshot' });
	item.place = 'Nigeria';
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://leadership.ng/party-registration-8-pre-qualified-associations-upload-details-on-inec-website/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Party Registration: 8 Pre-qualified Associations Upload Details On INEC Website",
				"creators": [
					{
						"firstName": "James",
						"lastName": "Kwen",
						"creatorType": "author"
					}
				],
				"date": "2025-10-31",
				"ISSN": "0331-328X",
				"abstractNote": "Eight out of the 14 pre-qualified associations that expressed interest in registration as political parties have completed uploading all necessary information",
				"language": "en-US",
				"libraryCatalog": "Leadership",
				"place": "Nigeria",
				"publicationTitle": "Leadership",
				"shortTitle": "Party Registration",
				"url": "https://leadership.ng/party-registration-8-pre-qualified-associations-upload-details-on-inec-website/",
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
		"url": "https://hausa.leadership.ng/babu-wanda-ya-jawo-raayina-zuwa-masanaantar-kannywood-umar-hassan-2/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Babu Wanda Ya Jawo Ra’ayina  Zuwa Masana’antar Kannywood —Umar Hassan (2)",
				"creators": [
					{
						"firstName": "Rabi'at Sidi",
						"lastName": "Bala",
						"creatorType": "author"
					}
				],
				"date": "2025-09-21",
				"ISSN": "0331-328X",
				"abstractNote": "Shafi ne da ya saba zaƙulo muku fitattun jarumai, manya da ƙanana har ma da mawaƙa, daga cikin masana'antar shirya finafinan hausa ta Kannywood. Kamar kowane",
				"language": "en-US",
				"libraryCatalog": "Leadership",
				"place": "Nigeria",
				"publicationTitle": "Leadership Hausa",
				"url": "https://hausa.leadership.ng/babu-wanda-ya-jawo-raayina-zuwa-masanaantar-kannywood-umar-hassan-2/",
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
		"url": "https://levogue.leadership.ng/northern-nigerian-women-redefining-leadership/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "NORTHERN NIGERIAN WOMEN REDEFINING LEADERSHIP",
				"creators": [
					{
						"firstName": "Nikki",
						"lastName": "Khiran",
						"creatorType": "author"
					}
				],
				"date": "2024-09-09",
				"ISSN": "0331-328X",
				"abstractNote": "Amina J. Mohammed is the Deputy Secretary-General of the United Nations and chairs the United Nations Sustainable Development Group. Before taking on these",
				"language": "en-US",
				"libraryCatalog": "Leadership",
				"publicationTitle": "LeVogue Magazine",
				"url": "https://levogue.leadership.ng/northern-nigerian-women-redefining-leadership/",
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
