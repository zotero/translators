{
	"translatorID": "20452a37-9670-4fa0-bb90-872a742f76db",
	"label": "The Whistler",
	"creator": "VWF",
	"target": "^https?://www\\.?thewhistler\\.ng/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-11-18 08:05:14"
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

function detectWeb(doc) {
	// 1) JSON-LD Article -> single article
	let j = parseJSONLD(doc);
	if (j) {
		return 'newspaperArticle';
	}

	// 2) explicit index/list page via JSON-LD
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
	if (text(doc, 'h1.single-post-title>span.post-title')) {
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
			if (np && !/^(agency|news desk|agency reporter|the whistler|whistler|our reporter|correspond|editorial|nigeria|staff|bureau)$/i.test(np)) {
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
			|| text(doc, 'h1.single-post-title>span.post-title')
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
					&& !/agency|news desk|agency reporter|the whistler|whistler|our reporter|correspond|editorial|nigeria|staff|bureau/i.test(name.toLowerCase())
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
			|| text(doc, 'h1.single-post-title>span.post-title')
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
		item.publicationTitle = 'The Whistler';
	}

	if (!item.ISSN) {
		item.ISSN = '2476-8499';
	}
	
	// --- Fallback authors in sequence ---
	if (item.creators.length === 0) {
		let cand1 = meta(doc, 'author');
		let cand2 = text(doc, 'div.post-meta.single-post-meta span.post-author-name');

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
				&& !/agency|news desk|agency reporter|the whistler|whistler|our reporter|correspond|editorial|nigeria|staff|bureau/i.test(name.toLowerCase())
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
		"url": "https://thewhistler.ng/anyanwu-rejects-expulsion-says-ibadan-convention-jamboree/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Anyanwu Rejects Expulsion, Says Ibadan Convention Jamboree",
				"creators": [
					{
						"firstName": "Eucharia Chionye",
						"lastName": "NEWMAN",
						"creatorType": "author"
					}
				],
				"date": "2025-11-18",
				"ISSN": "2476-8499",
				"abstractNote": "The suspended National Secretary of the Peoples Democratic Party (PDP), Senator Samuel Anyanwu, has dismissed his expulsion from the party, insisting he remains the authentic national secretary.    In an interview aired Monday on Channels Television Politics",
				"language": "en-GB",
				"libraryCatalog": "The Whistler",
				"place": "Nigeria",
				"publicationTitle": "The Whistler",
				"url": "https://thewhistler.ng/anyanwu-rejects-expulsion-says-ibadan-convention-jamboree/",
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
		"url": "https://thewhistler.ng/taraba-speaker-15-other-members-dump-pdp-for-apc/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Taraba Speaker, 15 Other Members Dump PDP For APC",
				"creators": [],
				"date": "2025-11-17",
				"ISSN": "2476-8499",
				"abstractNote": "The Speaker of Taraba House of Assembly, Kizito Bonzena, and 15 other members have defected from the Peoples Democratic Party (PDP) to the All Progressives Congress (APC).    Bonzena announced their resignation from the PDP on Monday",
				"language": "en-GB",
				"libraryCatalog": "The Whistler",
				"place": "Nigeria",
				"publicationTitle": "The Whistler",
				"url": "https://thewhistler.ng/taraba-speaker-15-other-members-dump-pdp-for-apc/",
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
		"url": "https://thewhistler.ng/united-nigeria-airlines-removes-vdm-mr-jollof-after-mid-flight-fight/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "United Nigeria Airlines Removes VDM, Mr Jollof After Mid-Flight Fight",
				"creators": [
					{
						"firstName": "Aisha",
						"lastName": "BELLO",
						"creatorType": "author"
					}
				],
				"date": "2025-11-17",
				"ISSN": "2476-8499",
				"abstractNote": "Nigerian social critics VeryDarkMan (VDM) and Mr. Jollof, known for their long-standing public rivalry, reportedly engaged in a physical altercation onboard a United Nigeria Airlines flight traveling from Asaba to Lagos on Monday.    The confrontation, which",
				"language": "en-GB",
				"libraryCatalog": "The Whistler",
				"place": "Nigeria",
				"publicationTitle": "The Whistler",
				"url": "https://thewhistler.ng/united-nigeria-airlines-removes-vdm-mr-jollof-after-mid-flight-fight/",
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
