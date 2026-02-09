{
	"translatorID": "9ec095c9-f5c6-4435-ba8b-b3bac773111e",
	"label": "Politics Nigeria",
	"creator": "VWF",
	"target": "^https?://www\\.?.politicsnigeria\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-12-22 04:51:26"
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

function isCollectionPage(doc) {
	let nodes = doc.querySelectorAll('script[type="application/ld+json"]');
	for (let node of nodes) {
		let txt = node.textContent.trim();
		if (!txt) continue;
		try {
			let parsed = JSON.parse(txt);
			let candidates = Array.isArray(parsed) ? parsed :
				(parsed['@graph'] && Array.isArray(parsed['@graph'])) ? parsed['@graph'] : [parsed];

			for (let cand of candidates) {
				if (!cand) continue;
				let t = cand['@type'] || cand.type;
				if (!t) continue;

				const types = Array.isArray(t) ? t : [t];
				if (types.includes('CollectionPage') &&
					!types.some(typeStr => typeStr.includes('WebPage'))) {
					return true;
				}
			}
		}
		catch (e) {
			// ignore malformed JSON-LD
		}
	}
	return false;
}

function detectWeb(doc) {
	// 1) JSON-LD Article -> single article
	let j = parseJSONLD(doc);
	if (j) {
		return 'newspaperArticle';
	}

	// 2) explicit index/list page via URL pattern
	if (isCollectionPage(doc)) {
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
	if (text(doc, 'div.entry-header h1.post-title.entry-title')) {
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

	function cleanAuthor(raw) {
		if (!raw) return "";

		let name = raw.trim();

		// Remove leading "By", "From", "By:", "From:"
		name = name.replace(/^\s*(by|from)\s*:?\s+/i, "").trim();

		// Remove trailing city names
		name = name.replace(/,\s*[A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*$/i, "").trim();
		name = name.replace(/\s*[–-]\s*[A-Z][a-z]+$/i, "").trim();

		// Remove "(...)" suffixes
		name = name.replace(/\s*\([^)]*\)\s*$/, "").trim();

		// Remove trailing "reports"
		name = name.replace(/\s+reports?$/i, "").trim();

		// Remove "in City"
		name = name.replace(/\s+in\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/i, "").trim();

		// Convert ALL CAPS to Proper Case
		if (/^[A-Z\s,.-]+$/.test(name)) {
			name = name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
		}

		return name;
	}

	function splitAuthors(nameStr) {
		if (!nameStr) return [];
		let s = nameStr.trim();
		s = cleanAuthor(s);
		if (s.includes('|')) s = s.split('|')[0].trim();
		let parts = s.split(/\s+(?:and|&)\s+|;\s*/i);
		if (parts.length === 1 && s.includes(',') !== -1) {
			parts = s.split(/\s*,\s*/).map(p => p.trim()).filter(Boolean);
		}
		let cleaned = [];
		for (let p of parts) {
			let np = cleanAuthor(p);
			if (np && !/^(agency|press|desk|reporter|guest|politics|editor|nigeria|staff|bureau|news)$/i.test(np)) {
				cleaned.push(np);
			}
		}
		return cleaned;
	}

	let item = new Zotero.Item('newspaperArticle');

	let data = parseJSONLD(doc);

	// If JSON-LD present, prefer it
	if (data) {
		item.title = ZU.unescapeHTML(
			data.headline
			|| meta(doc, 'og:title')
			|| text(doc, 'div.entry-header h1.post-title.entry-title')
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
			item.date = isoFromZU || rawJsonDate;
		}

		// JSON-LD authors
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

				name = cleanAuthor(name || '');

				if (
					name
					&& !/agency|press|desk|reporter|guest|politics|editor|nigeria|staff|bureau|news/i.test(name.toLowerCase())
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
			|| text(doc, 'div.entry-header h1.post-title.entry-title')
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
		item.publicationTitle = 'Politics Nigeria';
	}

	//if (!item.ISSN) {
	//	item.ISSN = '';
	//}
	
	// --- Fallback authors in sequence ---
	if (item.creators.length === 0) {
		let cand1 = meta(doc, 'author');
		let cand2 = text(doc, 'div.entry-header span.meta-author');

		let candidates = [];

		// Priority: use ONLY cand1 if present
		if (cand1) {
			candidates = splitAuthors(cand1);
		}
		// If cand1 missing, use ONLY cand2
		else if (cand2) {
			candidates = splitAuthors(cand2);
		}

		for (let name of candidates) {
			name = cleanAuthor(name);
			if (
				name
				&& !/agency|press|desk|reporter|guest|politics|editor|nigeria|staff|bureau|news/i.test(name.toLowerCase())
				&& isMultiWordAuthor(name)
			) {
				item.creators.push(ZU.cleanAuthor(name, 'author'));
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
		"url": "https://politicsnigeria.com/ecowas-suspends-guinea-bissau-after-coup-orders-immediate-release-of-president/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "ECOWAS Suspends Guinea-Bissau After Coup, Orders Immediate Release of President",
				"creators": [
					{
						"firstName": "Mfonobong",
						"lastName": "Daniel",
						"creatorType": "author"
					}
				],
				"date": "2025-11-28",
				"abstractNote": "West African leaders have placed a suspension on Guinea-Bissau following the military takeover of November 26, saying the action has pushed the country into deeper political uncertainty. The regional bloc stressed that democratic order must return immediately and demanded the release of President Umaro Sissoco Embaló, who was seized during the crisis.This decision came after …",
				"language": "en-US",
				"libraryCatalog": "Politics Nigeria",
				"place": "Nigeria",
				"publicationTitle": "Politics Nigeria",
				"url": "https://politicsnigeria.com/ecowas-suspends-guinea-bissau-after-coup-orders-immediate-release-of-president/",
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
		"url": "https://politicsnigeria.com/more-pdp-defections-coming-but-hope-not-lost-saraki-reveals/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "More PDP defections coming, but hope not lost – Saraki reveals",
				"creators": [
					{
						"firstName": "Oladipupo",
						"lastName": "Mojeed",
						"creatorType": "author"
					}
				],
				"date": "2025-06-05",
				"abstractNote": "Former Senate President, Dr. Bukola Saraki, has disclosed that more defections from the Peoples Democratic Party (PDP) to the ruling All Progressives Congress (APC) are likely, but maintained that hope is not lost for Nigeria’s leading opposition party. Addressing journalists in Ilorin on Wednesday, Saraki acknowledged the internal divisions rocking the PDP but expressed confidence …",
				"language": "en-US",
				"libraryCatalog": "Politics Nigeria",
				"place": "Nigeria",
				"publicationTitle": "Politics Nigeria",
				"url": "https://politicsnigeria.com/more-pdp-defections-coming-but-hope-not-lost-saraki-reveals/",
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
