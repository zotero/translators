{
	"translatorID": "42eca254-9f82-456e-9cb6-97edeb75384a",
	"label": "The Sun",
	"creator": "VWF",
	"target": "^https?://(?:www\\.)?(?:thesun\\.ng|sunnewsonline\\.com)/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-11-10 17:59:14"
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

function detectWeb(doc, url, jsonld) {
	// 1) JSON-LD Article -> single article
	let j = jsonld || parseJSONLD(doc);
	if (j) {
		return 'newspaperArticle';
	}

	// 2) explicit index/list page via JSON-LD
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
	if (text(doc, 'article>h1.post-title')) {
		return 'newspaperArticle';
	}

	return false;
}

async function doWeb(doc, url) {
	url = url || doc.location.href;

	let jsonld = parseJSONLD(doc);
	let mode = detectWeb(doc, url, jsonld);

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
		await scrape(doc, url, jsonld);
	}
}

async function scrape(doc, url, jsonld) {
	url = url || doc.location.href;
	
	let item = new Zotero.Item('newspaperArticle');

	let data = jsonld || parseJSONLD(doc);

	// If JSON-LD present, prefer it
	if (data) {
		item.title = ZU.unescapeHTML(
			data.headline
			|| meta(doc, 'og:title')
			|| text(doc, 'article>h1.post-title')
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
	}

	// --- Fallbacks ---
	if (!item.title || !item.title.trim()) {
		item.title = ZU.unescapeHTML(
			meta(doc, 'og:title')
			|| text(doc, 'article>h1.post-title')
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
		item.publicationTitle = 'The Sun';
	}

	if (!item.ISSN) {
		item.ISSN = '0795-7475';
	}
	
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
		name = name.replace(/\s+reports?$/i, "").trim();
		name = name.replace(/\s+in\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/i, "").trim();
		return name;
	}

	function extractAuthorsFromParagraph(text) {
		if (!text) return [];
		text = text.trim();

		// Normalise punctuation
		text = text.replace(/\.\s*$/, "").trim();

		let authors = [];

		// Case 1: lines beginning with "By", "From", or containing "in City"/"reports"
		if (/^(by|from\s+[A-Z]|[A-Z][a-z]+.*\sin\s+[A-Z]|[A-Z].*\sreports?)/i.test(text)) {
			text = text.replace(/^\s*(by|from)\s+/i, "").trim();
			let parts = text.split(/\s*(?:,|and)\s+/i);
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

	let ps = doc.querySelectorAll("div.post-content > p");
	let authorCandidates = [];

	// Check first three <p> tags, but only use ones that start with "By" or "From"
	for (let i = 0; i < Math.min(ps.length, 3); i++) {
		let txt = ps[i].textContent.trim();
		if (!txt) continue;

		// Only consider <p> tags that begin with "By" or "From"
		if (!/^by\s+/i.test(txt) && !/^from\s+/i.test(txt)) continue;

		// Apply long-text safety and "place name" logic
		if (
			txt.length > 150
			&& !/^by\s+[A-Z]/i.test(txt)
			&& !/^from\s+[A-Z]/i.test(txt)
			&& !/[A-Z][a-z]+.*\sin\s+[A-Z]/.test(txt)
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

	// Fallback to JSON-LD/meta author if no valid CSS author found
	if (!authorCandidates.length) {
		let jsonldAuthors = [];

		if (data && data.author) {
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
				let name = "";

				if (typeof a === "string") {
					name = a;
				}
				else if (a && typeof a === "object") {
					if (a.name) {
						name = a.name;
					}
					else if (a["@id"]) {
						let match = graph.find(obj => obj["@id"] === a["@id"]);
						if (match && match.name) name = match.name;
					}
				}

				name = (name || "").trim();

				if (name.includes("|")) {
					name = name.split("|")[0].trim();
				}

				name = name.replace(/,\s*[A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*$/, "").trim();

				if (
					name
					&& !/agency|news desk|agency reporter|sunnewsonline|our reporter|the sun|sun news|editorial|nigeria|staff|bureau/i.test(name.toLowerCase())
					&& name.split(/\s+/).length > 1
				) {
					jsonldAuthors.push(name);
				}
			}
		}

		if (!jsonldAuthors.length) {
			let metaAuthor = meta(doc, "author") || meta(doc, "article:author");
			if (metaAuthor) {
				let metaAuthors = metaAuthor
					.split(/\s*(?:,|and)\s+/i)
					.map(a => a.trim())
					.filter(a => a && !/agency|news desk|agency reporter|sunnewsonline|our reporter|the sun|sun news|editorial|nigeria|staff|bureau/i.test(a.toLowerCase()) && a.split(/\s+/).length > 1);
				
				jsonldAuthors.push(...metaAuthors);
			}
		}

		if (jsonldAuthors.length) authorCandidates = jsonldAuthors;
	}

	for (let a of authorCandidates) {
		item.creators.push(ZU.cleanAuthor(a, "author"));
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
		"url": "https://thesun.ng/cynthia-ozobus-safety-blueprint-rewriting-nigerias-industrial-hygiene-story-one-policy-at-a-time/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Cynthia Ozobu’s safety blueprint: Rewriting Nigeria’s industrial hygiene story, one policy at a time",
				"creators": [
					{
						"firstName": "Taiwo",
						"lastName": "Babatunde",
						"creatorType": "author"
					}
				],
				"date": "2016-02-12",
				"ISSN": "0795-7475",
				"abstractNote": "In Nigeria, conversations about workplace safety rarely dominate national headlines. That silence usually lasts until tragedy strikes.",
				"language": "en-US",
				"libraryCatalog": "The Sun",
				"place": "Nigeria",
				"publicationTitle": "The Sun",
				"shortTitle": "Cynthia Ozobu’s safety blueprint",
				"url": "https://thesun.ng/cynthia-ozobus-safety-blueprint-rewriting-nigerias-industrial-hygiene-story-one-policy-at-a-time/",
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
		"url": "https://thesun.ng/give-security-chiefs-90-days-to-wipe-out-terrorists-pastor-adeboye-to-tinubu/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Give security chiefs 90 days to wipe out terrorists – Pastor Adeboye to Tinubu",
				"creators": [
					{
						"firstName": "Sydney",
						"lastName": "Elike",
						"creatorType": "author"
					}
				],
				"date": "2025-11-08",
				"ISSN": "0795-7475",
				"abstractNote": "Pastor Enoch Adeboye has advised President Bola Tinubu to issue a 90-day ultimatum to the country's security chiefs to wipe out terrorists.",
				"language": "en-US",
				"libraryCatalog": "The Sun",
				"place": "Nigeria",
				"publicationTitle": "The Sun",
				"url": "https://thesun.ng/give-security-chiefs-90-days-to-wipe-out-terrorists-pastor-adeboye-to-tinubu/",
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
		"url": "https://thesun.ng/gunmen-attack-anambra-community-abduct-21-year-old-man/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Gunmen attack Anambra community; abduct 21-year-old man",
				"creators": [],
				"date": "2008-09-19",
				"ISSN": "0795-7475",
				"abstractNote": "Gunmen suspected to be kidnappers have attacked a community in Idemili Local Government Area of Anambra State, and abducted",
				"language": "en-US",
				"libraryCatalog": "The Sun",
				"place": "Nigeria",
				"publicationTitle": "The Sun",
				"url": "https://thesun.ng/gunmen-attack-anambra-community-abduct-21-year-old-man/",
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
		"url": "https://thesun.ng/anti-graft-body-retracts-corruption-claim-against-firs-boss/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Anti-graft body retracts corruption claim against FIRS boss",
				"creators": [
					{
						"firstName": "Okwe",
						"lastName": "Obi",
						"creatorType": "author"
					}
				],
				"date": "2025-11-10",
				"ISSN": "0795-7475",
				"abstractNote": "Nine CSOs retract unfounded corruption allegations against FIRS Chairman Zacch Adedeji; commend reforms, ₦46trn revenue, digital tools like TaxPro-Max.",
				"language": "en-US",
				"libraryCatalog": "The Sun",
				"place": "Nigeria",
				"publicationTitle": "The Sun",
				"url": "https://thesun.ng/anti-graft-body-retracts-corruption-claim-against-firs-boss/",
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
		"url": "https://thesun.ng/katsina-united-barau-fcs-president-clears-air-on-attack-says-no-player-was-killed-victims-discharged-from-hospital/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Katsina United: Barau FC’s President clears air on attack, says no player was killed, victims discharged from hospital",
				"creators": [],
				"date": "2025-11-10",
				"ISSN": "0795-7475",
				"abstractNote": "President of the Barau FC, Shawwal Barau I Jibrin, has faulted the report that a player of the club was killed during a Nigeria Premier Football League (NPFL) match against Katsina United on Saturday.",
				"language": "en-US",
				"libraryCatalog": "The Sun",
				"place": "Nigeria",
				"publicationTitle": "The Sun",
				"shortTitle": "Katsina United",
				"url": "https://thesun.ng/katsina-united-barau-fcs-president-clears-air-on-attack-says-no-player-was-killed-victims-discharged-from-hospital/",
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
		"url": "https://thesun.ng/category/national/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
