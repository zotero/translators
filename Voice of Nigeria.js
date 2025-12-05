{
	"translatorID": "6f259dd0-95c3-4463-8a09-1dac9d063ee3",
	"label": "Voice of Nigeria",
	"creator": "VWF",
	"target": "^https?://((www|arabic)\\.)?von\\.gov\\.ng/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-12-05 15:36:08"
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
						if (typeof tt === 'string' && tt.includes('BlogPosting')) {
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
	return /\/(category|tag|topics)\//i.test(url);
}

function detectWeb(doc, url) {
	url = url || doc.location.href;

	// 1) JSON-LD Article -> single article
	let j = parseJSONLD(doc);
	if (j) {
		return 'newspaperArticle';
	}

	// 2) explicit index/list URL
	if (isIndexURL(url)) {
		return 'multiple';
	}

	// 3) Use the standard getSearchResults() heuristic for listing pages
	if (getSearchResults(doc, true)) {
		// If page also clearly looks like an article, prefer article
		if (meta(doc, 'article:published_time') || meta(doc, 'og:type') || text(doc, 'header.td-post-title>h1.entry-title')) {
			return 'newspaperArticle';
		}
		return 'multiple';
	}

	// 4) meta-based hints
	if (meta(doc, 'article:published_time')) {
		return 'newspaperArticle';
	}
	let ogType = (meta(doc, 'og:type') || '').toLowerCase();
	if (ogType === 'article') {
		return 'newspaperArticle';
	}

	// 5) fallback selectors
	if (text(doc, 'header.td-post-title>h1.entry-title')) {
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

	// Support splitting multiple author names from CSS selectors
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
			np = np.replace(/^\s*détails avec\s+/i, '').trim();
			np = np.replace(/\s*\([^)]*\)\s*$/, '').trim();
			np = np.replace(/,\s*[A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*$/, '').trim();
			if (np && !/^(agency|news desk|agency reporter|voice|our reporter|nigeria|staff|bureau)$/i.test(np)) {
				cleaned.push(np);
			}
		}
		return cleaned;
	}

	let item = new Zotero.Item('newspaperArticle');

	let data = parseJSONLD(doc);

	// If JSON-LD present, prefer it for metadata (but authors handled later as fallback)
	if (data) {
		item.title = ZU.unescapeHTML(
			data.headline
			|| meta(doc, 'og:title')
			|| text(doc, 'header.td-post-title>h1.entry-title')
			|| ''
		);

		item.abstractNote = ZU.unescapeHTML(
			data.description
			|| meta(doc, 'og:description')
			|| ''
		);

		item.url = data.url || meta(doc, 'og:url') || url;

		if (!item.language) {
			if (url.includes('french.von.gov.ng')) {
				item.language = 'fr';
			}
			else if (url.includes('arabic.von.gov.ng')) {
				item.language = 'ar';
			}
			else {
				item.language = data.inLanguage || meta(doc, 'og:locale') || 'en';
			}
		}

		// --- date: use ZU.strToISO() to normalize if possible ---
		let rawJsonDate = data.datePublished || '';
		if (rawJsonDate) {
			let isoFromZU = ZU.strToISO(rawJsonDate);
			if (isoFromZU) {
				item.date = isoFromZU;
			}
			else {
				item.date = rawJsonDate;
			}
		}
	}

	// DOM/meta fallbacks for anything missing
	if (!item.title || !item.title.trim()) {
		item.title = ZU.unescapeHTML(
			meta(doc, 'og:title')
			|| text(doc, 'header.td-post-title>h1.entry-title')
			|| ''
		);
	}

	if (!item.abstractNote || !item.abstractNote.trim()) {
		item.abstractNote = ZU.unescapeHTML(
			meta(doc, 'og:description')
			|| ''
		);
	}

	if (!item.date || !item.date.trim()) {
		let metaDate = meta(doc, 'article:published_time');
		if (metaDate) {
			let isoDate = ZU.strToISO(metaDate);
			if (isoDate) {
				item.date = isoDate;
			}
			else {
				item.date = metaDate;
			}
		}
	}

	if (!item.url || !item.url.trim()) {
		item.url = meta(doc, 'og:url') || url;
	}

	if (!item.publicationTitle) {
		item.publicationTitle = 'Voice of Nigeria';
	}

	if (!item.ISSN) {
		item.ISSN = '1118-0811';
	}

	// --- AUTHORS: CSS selector methods first ---
	if (item.creators.length === 0) {
		let hwAuthors = doc.querySelectorAll('header.td-post-title p.td-post-sub-title, div.post-header.post-tp-1-header h2.post-subtitle, div.post-meta.single-post-meta span.post-author-name');
		if (hwAuthors.length) {
			for (let el of hwAuthors) {
				let candidates = splitAuthors(el.textContent);
				for (let name of candidates) {
					if (
						name
						&& !/agency|news desk|agency reporter|voice|our reporter|nigeria|staff|bureau/i.test(name.toLowerCase())
						&& isMultiWordAuthor(name)
					) {
						item.creators.push(ZU.cleanAuthor(name, 'author'));
					}
				}
			}
		}
	}


	// --- JSON-LD authors as fallback ---
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

			if (name && !/agency|news desk|agency reporter|voice|our reporter|nigeria|staff|bureau/i.test(name.toLowerCase())) {
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
		"url": "https://von.gov.ng/first-lady-flags-off-pwd-empowerment-scheme-nationwide/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "First Lady Flags Off PWD Empowerment Scheme Nationwide",
				"creators": [
					{
						"firstName": "Chinwe",
						"lastName": "Onuigbo",
						"creatorType": "author"
					}
				],
				"date": "2025-12-04",
				"ISSN": "1118-0811",
				"abstractNote": "Nigeria’s First Lady Senator Oluremi Tinubu, has launched a nationwide economic empowerment programme for Persons Living with Disabilities (PLWDs), offering business recapitalisation grants under the Renewed Hope Initiative (RHI) Social Investment Programme. The initiative, rolled out simultaneously across Nigeria’s 36 states, the Federal Capital Territory, and the Defence and Police Officers’ Wives Association, coincided with […]",
				"language": "en-US",
				"libraryCatalog": "Voice of Nigeria",
				"place": "Nigeria",
				"publicationTitle": "Voice of Nigeria",
				"url": "https://von.gov.ng/first-lady-flags-off-pwd-empowerment-scheme-nationwide/",
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
		"url": "https://von.gov.ng/sokoto-state-to-adopt-policy-on-inclusive-education/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Sokoto State to Adopt Policy on Inclusive Education",
				"creators": [
					{
						"firstName": "Rita",
						"lastName": "Obiora",
						"creatorType": "author"
					}
				],
				"date": "2025-12-04",
				"ISSN": "1118-0811",
				"abstractNote": "The Sokoto state government, is set to adopt the national policy on inclusive education to improve equitable quality education for all children across the 23 local government areas of the state. The Commissioner, Ministry of Basic and Secondary Education, Professor Ahmad Ladan Ala, stated this when he received the new document from the Rural Women […]",
				"language": "en-US",
				"libraryCatalog": "Voice of Nigeria",
				"place": "Nigeria",
				"publicationTitle": "Voice of Nigeria",
				"url": "https://von.gov.ng/sokoto-state-to-adopt-policy-on-inclusive-education/",
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
		"url": "https://french.von.gov.ng/2024/03/08/agriculture-les-entreprises-sengagent-a-soutenir-le-programme-de-securite-alimentaire/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Agriculture : Les entreprises s’engagent à soutenir le programme de sécurité alimentaire",
				"creators": [
					{
						"firstName": "Timothy",
						"lastName": "Choji",
						"creatorType": "author"
					}
				],
				"ISSN": "1118-0811",
				"abstractNote": "La tentative du gouvernement nigérian d'assurer la sécurité alimentaire par la transformation de la productivité agricole dans le pays a reçu un coup de pouce majeur avec un consortium d'entreprises agricoles qui s'est engagé à soutenir des millions",
				"libraryCatalog": "Voice of Nigeria",
				"place": "Nigeria",
				"publicationTitle": "Voice of Nigeria",
				"shortTitle": "Agriculture",
				"url": "https://french.von.gov.ng/2024/03/08/agriculture-les-entreprises-sengagent-a-soutenir-le-programme-de-securite-alimentaire/",
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
		"url": "https://arabic.von.gov.ng/2025/12/05/%d8%a7%d9%84%d8%b1%d8%a6%d9%8a%d8%b3-%d8%aa%d9%8a%d9%86%d9%88%d8%a8%d9%88-%d9%8a%d8%a4%d8%af%d9%8a-%d8%a7%d9%84%d9%8a%d9%85%d9%8a%d9%86-%d8%a7%d9%84%d8%af%d8%b3%d8%aa%d9%88%d8%b1%d9%8a%d8%a9-%d9%84-3/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "الرئيس تينوبو يؤدي اليمين الدستورية للجنرال موسى وزيراً للدفاع",
				"creators": [
					{
						"firstName": "Abdulwahab",
						"lastName": "Ilyasu",
						"creatorType": "author"
					}
				],
				"ISSN": "1118-0811",
				"abstractNote": "أدى الرئيس بولا أحمد تينوبو اليمين الدستورية للجنرال كريستوفر جوابين موسى (المتقاعد) وزيرًا جديدًا للدفاع في نيجيريا، مما يُمثل نقلة نوعية في الإصلاحات الأمنية الجارية في البلادأدى الرئيس اليمين للجنرال موسى في مكتبه بقصر الرئاسة في أبوجا، مُشيرًا إل",
				"libraryCatalog": "Voice of Nigeria",
				"place": "Nigeria",
				"publicationTitle": "Voice of Nigeria",
				"url": "https://arabic.von.gov.ng/2025/12/05/%d8%a7%d9%84%d8%b1%d8%a6%d9%8a%d8%b3-%d8%aa%d9%8a%d9%86%d9%88%d8%a8%d9%88-%d9%8a%d8%a4%d8%af%d9%8a-%d8%a7%d9%84%d9%8a%d9%85%d9%8a%d9%86-%d8%a7%d9%84%d8%af%d8%b3%d8%aa%d9%88%d8%b1%d9%8a%d8%a9-%d9%84-3/",
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
