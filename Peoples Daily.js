{
	"translatorID": "44465e73-cc59-4a97-ab5a-b2f20a333a9a",
	"label": "Peoples Daily",
	"creator": "VWF",
	"target": "^https?://www\\.?peoplesdailyng\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-12-15 12:32:39"
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
	if (text(doc, 'header.td-post-title h1.entry-title')) {
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

		// Remove trailing "- Peoples Daily Newspaper" or variants
		item.title = item.title.replace(/\s*[-–—]\s*Peoples\s*Daily\s*Newspaper\s*$/i, '').trim();

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
					&& !/agency|news desk|agency reporter|daily|our reporter|editor|nigeria|staff|bureau/i.test(name.toLowerCase())
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
			|| text(doc, 'h1.tdb-title-text')
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
		item.publicationTitle = 'Peoples Daily';
	}

	if (!item.ISSN) {
		item.ISSN = '2141-6141';
	}
	
	// --- Fallback authors in sequence ---
	if (item.creators.length === 0) {
		let ps = doc.querySelectorAll("div.td-post-content.tagdiv-type p");
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
		"url": "https://peoplesdailyng.com/ive-no-rift-with-house-gov-fubara-denies-sidelining-rivers-lawmakers/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "I’ve no rift with House- Gov Fubara denies sidelining Rivers lawmakers",
				"creators": [
					{
						"firstName": "Jude",
						"lastName": "Opara",
						"creatorType": "author"
					}
				],
				"date": "2025-12-12",
				"ISSN": "2141-6141",
				"abstractNote": "By Jude Opara Rivers State Governor, Siminalayi Fubara has dismissed claims that he is sidelining members of the State House of Assembly or loyalists of the Minister of the Federal Capital Territory, Nyesom Wike (FCT). Speaking in Ahoada West during the commissioning of the Ahoda–Omoku Road extension, Fubara said reports suggesting he had shut out […]",
				"language": "en-US",
				"libraryCatalog": "Peoples Daily",
				"place": "Nigeria",
				"publicationTitle": "Peoples Daily",
				"url": "https://peoplesdailyng.com/ive-no-rift-with-house-gov-fubara-denies-sidelining-rivers-lawmakers/",
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
		"url": "https://peoplesdailyng.com/oyo-apc-absolves-tinubu-of-blames-over-pdp-woes/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Oyo APC absolves Tinubu of blames over PDP woes",
				"creators": [
					{
						"firstName": "Lateef",
						"lastName": "Ibrahim",
						"creatorType": "author"
					}
				],
				"date": "2025-12-12",
				"ISSN": "2141-6141",
				"abstractNote": "•says Makinde to blame not By Lateef Ibrahim The All Progressives Congress (APC) has advised Nigerians to blame governor Seyi Makinde of Oyo State and not President Bola Ahmed Tinubu for any misfortune that may befall the Peoples Democratic Party (PDP) The party made this declaration via a statement yesterday. APC said that Nigerians should […]",
				"language": "en-US",
				"libraryCatalog": "Peoples Daily",
				"place": "Nigeria",
				"publicationTitle": "Peoples Daily",
				"url": "https://peoplesdailyng.com/oyo-apc-absolves-tinubu-of-blames-over-pdp-woes/",
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
		"url": "https://peoplesdailyng.com/apc-may-face-challenges-after-buharis-exit-in-2023-lawan/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "APC may face challenges after Buhari’s exit in 2023 – Lawan",
				"creators": [
					{
						"firstName": "Musa Baba",
						"lastName": "Adamu",
						"creatorType": "author"
					}
				],
				"date": "2021-06-23",
				"ISSN": "2141-6141",
				"abstractNote": "By Musa Baba Adamu President of the Senate, Ahmad Lawan, has said that the All Progressives Congress (APC) may face challenges after the exit of President Muhammadu Buhari from office in 2023, except timely interventions are taken to avert same. Lawan gave the warning on Monday night in a speech delivered to close the First […]",
				"language": "en-US",
				"libraryCatalog": "Peoples Daily",
				"place": "Nigeria",
				"publicationTitle": "Peoples Daily",
				"url": "https://peoplesdailyng.com/apc-may-face-challenges-after-buharis-exit-in-2023-lawan/",
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
