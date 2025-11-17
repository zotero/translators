{
	"translatorID": "3513f12c-f7e7-4bb6-a8a8-9417bf65d9d5",
	"label": "TheCable",
	"creator": "VWF",
	"target": "^https?://((www|factcheck|lifestyle)\\.)?thecable\\.ng/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-11-17 14:25:49"
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
	let hostname = "";
	try {
		hostname = (new URL(doc.location.href)).hostname;
	}
	catch (e) {
		
	}

	if (hostname.includes("factcheck.thecable.ng")) {
		let nodes = doc.querySelectorAll('script[type="application/ld+json"]');
		let articleCandidate = null;
		let webpageCandidate = null;

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

					// Normalise @type into array form
					let types = [];
					if (typeof t === "string") {
						types = [t];
					}
					else if (Array.isArray(t)) {
						types = t;
					}

					if (!articleCandidate && types.some(tt => typeof tt === "string" && tt.includes("Article"))) {
						articleCandidate = cand;
					}

					if (!webpageCandidate && types.some(tt => typeof tt === "string" && tt.includes("WebPage"))) {
						webpageCandidate = cand;
					}
				}
			}
			catch (e) {
				// ignore bad JSON
			}
		}

		return articleCandidate || webpageCandidate || null;
	}

	let jsonld = text(doc, '//script[@type="application/ld+json"]');
	if (!jsonld) return null;

	try {
		let data = JSON.parse(jsonld);
		return data;
	}
	catch (e) {
		return null;
	}
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
	if (text(doc, 'h1.cs-entry__title, header.single-header h1.s-title, div.post-title>h1')) {
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
			if (np && !/^(agency|news desk|agency reporter|thecable|cable|our reporter|correspond|editorial|nigeria|staff|bureau)$/i.test(np)) {
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
			|| text(doc, 'h1.cs-entry__title, header.single-header h1.s-title, div.post-title>h1')
			|| ''
		);

		// Remove trailing "- TheCable + Fact Check or Lifestyle" or variants
		item.title = item.title.replace(/\s*[-|–—]\s*(TheCable(\s+(Fact\s+Check|Lifestyle))?)\s*$/i, '').trim();

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
					&& !/agency|news desk|agency reporter|thecable|cable|our reporter|correspond|editorial|nigeria|staff|bureau/i.test(name.toLowerCase())
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
			|| text(doc, 'h1.cs-entry__title, header.single-header h1.s-title, div.post-title>h1')
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
		if (url.includes('factcheck.thecable.ng')) {
			item.publicationTitle = 'TheCable Fact Check';
		}
		else if (url.includes('lifestyle.thecable.ng')) {
			item.publicationTitle = 'TheCable Lifestyle';
		}
		else {
			item.publicationTitle = 'TheCable';
		}
	}

	if (!item.ISSN) {
		item.ISSN = '3043-5676';
	}
	
	// --- Fallback authors in sequence ---
	if (item.creators.length === 0) {
		let cand1 = meta(doc, 'author');
		let cand2 = text(doc, 'span.cs-meta-author-name, div.post-comment, span.meta-el.meta-author>a');

		let candidates = [];

		if (cand1) {
			candidates = candidates.concat(splitAuthors(cand1));
		}
		if (cand2) {
			candidates = candidates.concat(splitAuthors(cand2));
		}

		for (let name of candidates) {
			if (
				name
				&& !/agency|news desk|agency reporter|thecable|cable|our reporter|correspond|editorial|nigeria|staff|bureau/i.test(name.toLowerCase())
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
		"url": "https://www.thecable.ng/miyetti-allah-seeks-removal-from-us-sanctions-list-says-christian-persecution-claim-flawed/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Miyetti Allah seeks removal from US sanctions list, says Christian persecution claim flawed",
				"creators": [
					{
						"firstName": "Claire",
						"lastName": "Mom",
						"creatorType": "author"
					}
				],
				"date": "2025-11-17",
				"ISSN": "3043-5676",
				"abstractNote": "The Miyetti Allah Cattle Breeders Association of Nigeria (MACBAN) has urged the United States Congress to withdraw its recommendation...",
				"language": "en-US",
				"libraryCatalog": "TheCable",
				"place": "Nigeria",
				"publicationTitle": "TheCable",
				"url": "https://www.thecable.ng/miyetti-allah-seeks-removal-from-us-sanctions-list-says-christian-persecution-claim-flawed/",
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
		"url": "https://factcheck.thecable.ng/anambra-guber-six-misconceptions-about-bvas-irev-voters-should-know/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Anambra guber: Six misconceptions about BVAS, IREV voters should know",
				"creators": [],
				"date": "2025-11-07",
				"ISSN": "3043-5676",
				"abstractNote": "Elections in Nigeria have always been defined by controversies. Electoral malpractice, ranging from ballot snatching to result sheet manipulations, has persistently plagued our democracy",
				"language": "en-US",
				"libraryCatalog": "TheCable",
				"place": "Nigeria",
				"publicationTitle": "TheCable Fact Check",
				"shortTitle": "Anambra guber",
				"url": "https://factcheck.thecable.ng/anambra-guber-six-misconceptions-about-bvas-irev-voters-should-know/",
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
		"url": "https://factcheck.thecable.ng/finnish-court-no-release-simon-ekpa-give-am-50000-compensation/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Finnish court no release Simon Ekpa, give am $50,000 compensation",
				"creators": [
					{
						"firstName": "Claire",
						"lastName": "Mom",
						"creatorType": "author"
					}
				],
				"date": "2025-10-23",
				"ISSN": "3043-5676",
				"abstractNote": "Some social media users don claim sey one Finnish court give judgment make dem release Simon Ekpa, pro-Biafra agitator, wey don already...",
				"language": "en-US",
				"libraryCatalog": "TheCable",
				"place": "Nigeria",
				"publicationTitle": "TheCable Fact Check",
				"url": "https://factcheck.thecable.ng/finnish-court-no-release-simon-ekpa-give-am-50000-compensation/",
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
		"url": "https://www.thecable.ng/marwa-my-second-tenure-as-ndlea-chairman-will-be-hell-for-drug-cartels/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Marwa: My second tenure as NDLEA chairman will be hell for drug cartels",
				"creators": [
					{
						"firstName": "Ayodele",
						"lastName": "Oluwafemi",
						"creatorType": "author"
					}
				],
				"date": "2025-11-15",
				"ISSN": "3043-5676",
				"abstractNote": "Mohammed Buba Marwa, chairman of the National Drug Law Enforcement Agency (NDLEA), has warned drug cartels that his second tenure will be hell to them.",
				"language": "en-US",
				"libraryCatalog": "TheCable",
				"place": "Nigeria",
				"publicationTitle": "TheCable",
				"shortTitle": "Marwa",
				"url": "https://www.thecable.ng/marwa-my-second-tenure-as-ndlea-chairman-will-be-hell-for-drug-cartels/",
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
		"url": "https://lifestyle.thecable.ng/genevieve-nnaji-tackles-x-user-advising-igbo-men-not-to-marry-within-their-tribe/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Genevieve Nnaji tackles X user advising Igbo men not to marry within their tribe",
				"creators": [
					{
						"firstName": "Jerry",
						"lastName": "Lenbang",
						"creatorType": "author"
					}
				],
				"date": "2025-11-17",
				"ISSN": "3043-5676",
				"abstractNote": "Ace actress Genevieve Nnaji has responded to a controversial tweet that advised Igbo men against marrying women from their own ethnic group.",
				"language": "en-US",
				"libraryCatalog": "TheCable",
				"place": "Nigeria",
				"publicationTitle": "TheCable Lifestyle",
				"url": "https://lifestyle.thecable.ng/genevieve-nnaji-tackles-x-user-advising-igbo-men-not-to-marry-within-their-tribe/",
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
		"url": "https://lifestyle.thecable.ng/akon-lagos-wouldve-been-worlds-financial-hub-if-nigeria-kept-oil-proceeds-since-1960/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Akon: Lagos would’ve been world’s financial hub if Nigeria kept oil proceeds since 1960",
				"creators": [
					{
						"firstName": "Muhibat",
						"lastName": "Sulaimon",
						"creatorType": "author"
					}
				],
				"date": "2025-11-11",
				"ISSN": "3043-5676",
				"abstractNote": "Akon has said that Lagos would have become the world’s economic capital if Africa had retained full control of its oil wealth.",
				"language": "en-US",
				"libraryCatalog": "TheCable",
				"place": "Nigeria",
				"publicationTitle": "TheCable Lifestyle",
				"shortTitle": "Akon",
				"url": "https://lifestyle.thecable.ng/akon-lagos-wouldve-been-worlds-financial-hub-if-nigeria-kept-oil-proceeds-since-1960/",
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
