{
	"translatorID": "cfcdb0cf-989d-4d79-951e-5179d6407875",
	"label": "Inlibra",
	"creator": "Lukas Collier",
	"target": "^https?://(?:www\\.)?inlibra\\.com/(?:[a-z]{2}/)?(?:document/view/|search)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-04 14:42:05"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Lukas Collier

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

function detectWeb(doc, url) {
	if (url.includes('/search')) {
		return getSearchResults(doc, true) ? 'multiple' : false;
	}

	let productType = getProductType(doc);
	if (productType === 'Ausgabe' || productType === 'Issue' || hasHeading(doc, 'Artikel')) {
		return getSearchResults(doc, true) ? 'multiple' : false;
	}
	if (productType === 'Sammelband' || productType === 'Sammelwerk' || productType === 'Edited Volume') {
		return getSearchResults(doc, true) ? 'multiple' : false;
	}
	if (productType === 'Lehrbuch' || productType === 'Monographie' || productType === 'Monograph' || productType === 'Buch' || productType === 'Book') {
		return 'book';
	}

	if (url.includes('/document/view/detail/uuid/')) {
		if (getSearchResults(doc, true)) {
			return 'multiple';
		}
		return 'book';
	}

	if (url.includes('/document/view/pdf/uuid/') || url.includes('/document/view/preview/uuid/')) {
		if (doc.querySelector('meta[name="citation_journal_title"]')) {
			return 'journalArticle';
		}
		let isChapter = doc.querySelector('.toc__item-pages') || doc.querySelector('[class*="chapter"]') || doc.querySelector('meta[name="citation_isbn"]');
		if (isChapter) {
			return 'bookSection';
		}
		return 'book';
	}

	return false;
}

function getProductType(doc) {
	let dt = Array.from(doc.querySelectorAll('dt')).find(el => el.textContent.includes('Produkttyp'));
	if (dt && dt.nextElementSibling) {
		return ZU.trimInternal(dt.nextElementSibling.textContent);
	}
	let allBadges = Array.from(doc.querySelectorAll('.badge')).map(b => ZU.trimInternal(b.textContent));
	for (let b of ['Ausgabe', 'Sammelband', 'Sammelwerk', 'Lehrbuch', 'Monographie']) {
		if (allBadges.includes(b)) {
			return b;
		}
	}
	return '';
}

function hasHeading(doc, text) {
	let headings = doc.querySelectorAll('h2, h3');
	for (let h of headings) {
		if (h.textContent.toLowerCase().includes(text.toLowerCase())) {
			return true;
		}
	}
	return false;
}

function extractUuidFromElement(node) {
	if (!node) return null;

	let elements = [node];
	let sub = node.querySelectorAll('a, button, [data-body-url-param], [data-submit]');
	for (let i = 0; i < sub.length; i++) {
		elements.push(sub[i]);
	}

	for (let el of elements) {
		let href = el.getAttribute('href');
		if (href) {
			let m = href.match(/\/uuid\/([0-9a-f-]{36})/i);
			if (m) return m[1];
		}

		let urlParam = el.getAttribute('data-body-url-param');
		if (urlParam) {
			let m = urlParam.match(/\/uuid\/([0-9a-f-]{36})/i);
			if (m) return m[1];
		}

		let submit = el.getAttribute('data-submit');
		if (submit) {
			try {
				let decoded = (typeof atob === 'function') ? atob(submit) : '';
				let m = decoded.match(/\/uuid\/([0-9a-f-]{36})/i);
				if (m) return m[1];
			}
			catch (_) {
				// ignore base64 decode failure
			}
		}

		if (el.attributes) {
			for (let i = 0; i < el.attributes.length; i++) {
				let attrVal = el.attributes[i].value;
				if (attrVal && attrVal.includes('/uuid/')) {
					let m = attrVal.match(/\/uuid\/([0-9a-f-]{36})/i);
					if (m) return m[1];
				}
			}
		}
	}

	if (node.innerHTML) {
		let m = node.innerHTML.match(/\/uuid\/([0-9a-f-]{36})/i)
			|| node.innerHTML.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
		if (m) return m[1];
	}

	return null;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;

	// 1. Articles (used on search results, journal issue pages, and listings)
	let articles = doc.querySelectorAll('article.search-result-item, #artikel article, .search-result-item');
	for (let art of articles) {
		let titleEl = art.querySelector('.search-result-main-link')
			|| art.querySelector('h3, h2, h4')
			|| art;
		let title = titleEl ? ZU.trimInternal(titleEl.textContent) : '';
		let uuid = extractUuidFromElement(art);
		if (uuid && title) {
			if (checkOnly) return true;
			found = true;
			items['https://www.inlibra.com/de/document/view/detail/uuid/' + uuid] = title;
		}
	}

	// 2. Table of contents items (for Sammelbände / edited volumes)
	let tocItems = doc.querySelectorAll('.toc__item-content, .toc__item');
	if (tocItems.length) {
		let bookUuidMatch = doc.location.href.match(/\/uuid\/([0-9a-f-]{36})/i);
		if (bookUuidMatch) {
			let bookTitle = ZU.xpathText(doc, '//meta[@property="og:title"]/@content')
				|| ZU.xpathText(doc, '//h1');
			if (bookTitle) {
				if (checkOnly) return true;
				found = true;
				let bookUrl = 'https://www.inlibra.com/de/document/view/detail/uuid/' + bookUuidMatch[1];
				items[bookUrl] = '[Gesamtes Werk] ' + ZU.trimInternal(bookTitle);
			}
		}

		for (let toc of tocItems) {
			let titleEl = toc.querySelector('.toc__item-title-text')
				|| toc.querySelector('.toc__item-title')
				|| toc.querySelector('h3, h4, button');
			let title = titleEl ? ZU.trimInternal(titleEl.textContent) : '';
			let uuid = extractUuidFromElement(toc);
			if (uuid && title) {
				if (checkOnly) return true;
				found = true;
				items['https://www.inlibra.com/de/document/view/detail/uuid/' + uuid] = title;
			}
		}
	}

	// 3. Fallback for any other links with main-link or /uuid/
	if (!found) {
		let links = doc.querySelectorAll('a.search-result-main-link, a[href*="/document/view/detail/uuid/"]');
		for (let link of links) {
			let href = link.href;
			let title = ZU.trimInternal(link.textContent);
			if (href && title) {
				if (checkOnly) return true;
				found = true;
				items[href] = title;
			}
		}
	}

	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) === 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let itemUrl of Object.keys(items)) {
			await scrape(null, itemUrl);
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc?.location?.href) {
	let uuidMatch = url.match(/\/uuid\/([0-9a-f-]{36})/i);
	let uuid = uuidMatch ? uuidMatch[1] : null;

	if (!uuid && doc) {
		let metaPdf = doc.querySelector('meta[name="citation_pdf_url"]')?.content || '';
		uuidMatch = metaPdf.match(/\/uuid\/([0-9a-f-]{36})/i);
		if (uuidMatch) uuid = uuidMatch[1];
	}

	if (!uuid && doc) {
		let ogUrl = doc.querySelector('meta[property="og:url"]')?.content || '';
		uuidMatch = ogUrl.match(/\/uuid\/([0-9a-f-]{36})/i);
		if (uuidMatch) uuid = uuidMatch[1];
	}

	if (!uuid) {
		throw new Error('Inlibra: Could not find UUID in URL ' + url);
	}

	let risUrl = 'https://www.inlibra.com/de/citation/ris/uuid/' + uuid;
	let risText = '';
	try {
		risText = await requestText(risUrl);
	}
	catch (e) {
		Z.debug('Inlibra: Failed to fetch RIS from ' + risUrl + ': ' + e);
	}

	if (risText && risText.includes('TY  - ')) {
		// Clean trailing empty commas in AU tags (e.g. "AU  - Manfred Walter, , \r\n")
		risText = risText.replace(/^(AU\s+-\s+.*?),(\s*,)+\s*$/gm, '$1');
		let risTranslator = Zotero.loadTranslator('import');
		risTranslator.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7'); // RIS
		risTranslator.setString(risText);
		risTranslator.setHandler('itemDone', (_obj, item) => {
			postProcessItem(item, doc, url, uuid);
			item.complete();
		});
		await risTranslator.translate();
		return;
	}

	// Fallback: search by DOI if available
	let doi = doc?.querySelector('meta[name="citation_doi"]')?.content;
	if (doi) {
		let search = Zotero.loadTranslator('search');
		search.setSearch({ DOI: ZU.cleanDOI(doi) });
		search.setHandler('itemDone', (_obj, item) => {
			postProcessItem(item, doc, url, uuid);
			item.complete();
		});
		search.setHandler('translators', (_obj, translators) => {
			search.setTranslator(translators);
			search.translate();
		});
		await search.getTranslators();
		return;
	}

	// Fallback to Embedded Metadata
	if (doc) {
		let em = Zotero.loadTranslator('web');
		em.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // EM
		em.setDocument(doc);
		em.setHandler('itemDone', (_obj, item) => {
			postProcessItem(item, doc, url, uuid);
			item.complete();
		});
		await em.translate();
		return;
	}

	throw new Error('Inlibra: Failed to extract metadata for UUID ' + uuid);
}

var ACADEMIC_TITLES = [
	/\b(?:Prof|Professorin|Professor)\.?(?=\s|$|[.,;])/gi,
	/\b(?:Dr|Dres|Doktor)\.?(?=\s|$|[.,;])/gi,
	/\b(?:jur|iur|rer\.\s*pol|rer\.\s*nat|habil)\.?(?=\s|$|[.,;])/gi,
	/\b(?:h\.\s*c\.|mult)\.?(?=\s|$|[.,;])/gi,
	/\b(?:Priv\.-Doz|Privatdozent(?:in)?|PD)\.?(?=\s|$|[.,;])/gi,
	/\bDipl\.-[A-Za-z]+(?:\s*\([A-Za-z]+\))?\.?(?=\s|$|[.,;])/gi,
	/\b(?:Mag|Magister|Ass\.\s*jur|Ass|RA|Rechtsanwalt|Rechtsanwältin|Notar)\.?(?=\s|$|[.,;])/gi,
	/,\s*(?:LL\.?M\.?|LL\.?B\.?|M\.?A\.?|B\.?A\.?|B\.?Sc\.?|M\.?Sc\.?|Ph\.?D\.?|PhD|MBA)(?=\s|$|[.,;])/gi,
	/\b(?:LL\.?M\.?|LL\.?B\.?|Ph\.?D\.?|PhD)\b/gi
];

var GENERATION_SUFFIXES = [
	{ re: /,\s*(?:Jr\.|Jr|Junior)(?=\s|$)/i, suffix: 'Jr.' },
	{ re: /\s+(?:Jr\.|Jr|Junior)$/i, suffix: 'Jr.' },
	{ re: /,\s*(?:Sr\.|Sr|Senior)(?=\s|$)/i, suffix: 'Sr.' },
	{ re: /\s+(?:Sr\.|Sr|Senior)$/i, suffix: 'Sr.' },
	{ re: /,\s*(II|III|IV)(?=\s|$)/, suffix: '$1' },
	{ re: /\s+(II|III|IV)$/, suffix: '$1' }
];

var PARTICLES = ['von und zu', 'von der', 'von dem', 'von', 'van der', 'van den', 'van de', 'van', 'de la', 'de', 'du', 'del', 'della', 'da', 'di', 'al-', 'zu', 'zur', 'zum', 'vom'];
PARTICLES.sort(function (a, b) {
	return b.length - a.length;
});

function stripTitles(str) {
	if (!str) return '';
	var s = str;
	for (let i = 0; i < ACADEMIC_TITLES.length; i++) {
		s = s.replace(ACADEMIC_TITLES[i], ' ');
	}
	return s.replace(/\s+/g, ' ').replace(/^[,;\s]+|[,;\s]+$/g, '').trim();
}

function cleanAuthorName(rawName, creatorType) {
	if (!rawName) return null;
	var name = ZU.trimInternal(rawName);
	if (!name) return null;

	if (name.includes(',')) {
		var parts = name.split(/\s*,\s*/).filter(Boolean);
		if (parts.length >= 2 && !/^(?:Jr\.|Jr|Senior|Sr\.|Sr|Junior|II|III|IV|LL\.?M\.?|LL\.?B\.?|Ph\.?D\.?|PhD|M\.?A\.?|MBA)$/i.test(parts[1])) {
			return {
				firstName: stripTitles(parts.slice(1).join(' ')),
				lastName: stripTitles(parts[0]),
				creatorType: creatorType
			};
		}
		name = parts.join(' ');
	}

	var genSuffix = '';
	for (let i = 0; i < GENERATION_SUFFIXES.length; i++) {
		var gs = GENERATION_SUFFIXES[i];
		var m = name.match(gs.re);
		if (m) {
			genSuffix = gs.suffix.includes('$1') ? m[1] : gs.suffix;
			name = name.replace(gs.re, '').trim();
			break;
		}
	}

	name = stripTitles(name);
	if (!name) return null;

	if (!/\s/.test(name)) {
		if (genSuffix) name += ', ' + genSuffix;
		return { lastName: name, creatorType: creatorType, fieldMode: 1 };
	}

	var words = name.split(/\s+/);
	var firstName;
	var lastName;
	for (let i = 0; i < words.length; i++) {
		for (let p = 0; p < PARTICLES.length; p++) {
			var pWords = PARTICLES[p].split(' ');
			if (i + pWords.length > words.length) continue;
			var match = true;
			for (let j = 0; j < pWords.length; j++) {
				if (words[i + j].toLowerCase() !== pWords[j]) {
					match = false;
					break;
				}
			}
			if (!match) continue;

			var particlePart = pWords.join(' ').toLowerCase();
			var lastNameBase = words.slice(i + pWords.length).join(' ');
			var fullLastName = particlePart + ' ' + lastNameBase;

			if (i === 0) {
				return { lastName: fullLastName, creatorType: creatorType, fieldMode: 1 };
			}

			firstName = words.slice(0, i).join(' ');
			if (genSuffix) firstName += ', ' + genSuffix;

			return { firstName: firstName, lastName: fullLastName, creatorType: creatorType };
		}
	}

	lastName = words[words.length - 1];
	firstName = words.slice(0, words.length - 1).join(' ');
	if (genSuffix) firstName += ', ' + genSuffix;

	return { firstName: firstName, lastName: lastName, creatorType: creatorType };
}

function postProcessItem(item, doc, url, uuid) {
	// 1. PDF attachment
	item.attachments = [{
		title: 'Full Text PDF',
		mimeType: 'application/pdf',
		url: 'https://www.inlibra.com/document/download/pdf/uuid/' + uuid
	}];

	// 2. Set canonical URL if empty or DOI link
	if (!item.url || item.url.includes('doi.org')) {
		item.url = 'https://www.inlibra.com/de/document/view/detail/uuid/' + uuid;
	}

	// 3. Fix itemType
	if (item.itemType === 'conferencePaper' && item.ISBN) {
		item.itemType = 'book';
	}
	else if (item.itemType === 'document') {
		if (item.publicationTitle) {
			item.itemType = 'journalArticle';
		}
		else if (item.bookTitle) {
			item.itemType = 'bookSection';
		}
		else {
			item.itemType = 'book';
		}
	}

	// 4. Clean authors/creators
	if (item.creators && item.creators.length) {
		let cleanedCreators = [];
		for (let creator of item.creators) {
			let creatorType = creator.creatorType || 'author';
			if (creator.firstName && creator.lastName) {
				let f = stripTitles(creator.firstName);
				let l = stripTitles(creator.lastName);
				if (f || l) {
					cleanedCreators.push({
						firstName: f,
						lastName: l,
						creatorType: creatorType
					});
				}
			}
			else {
				let raw = creator.lastName || creator.firstName || '';
				let cleaned = cleanAuthorName(raw, creatorType);
				if (cleaned) {
					cleanedCreators.push(cleaned);
				}
			}
		}
		item.creators = cleanedCreators;
	}

	// 5. Series & SeriesNumber for books
	if (item.itemType === 'book' && item.series && item.volume && !item.seriesNumber) {
		item.seriesNumber = item.volume;
		delete item.volume;
	}

	// 6. Clean DOI and ISBN
	let doi = item.DOI || (doc && doc.querySelector('meta[name="citation_doi"]')?.content);
	if (doi) {
		let cleanDoi = ZU.cleanDOI(doi);
		if (cleanDoi) {
			if (item.itemType === 'journalArticle' || item.itemType === 'preprint') {
				item.DOI = cleanDoi;
			}
			else if (!item.extra || !item.extra.includes(cleanDoi)) {
				item.extra = (item.extra ? item.extra + '\n' : '') + 'DOI: ' + cleanDoi;
			}
		}
	}
	let rawIsbn = item.ISBN || (doc && doc.querySelector('meta[name="citation_isbn"]')?.content);
	if (rawIsbn) {
		let cleanIsbn = ZU.cleanISBN(rawIsbn, true);
		if (cleanIsbn) {
			item.ISBN = cleanIsbn;
		}
		else {
			delete item.ISBN;
		}
	}
	else {
		delete item.ISBN;
	}

	// 7. Extra metadata from doc if available
	if (doc) {
		if (!item.abstractNote) {
			item.abstractNote = ZU.xpathText(doc, '//meta[@name="description"]/@content')
				|| ZU.xpathText(doc, '//*[@id="ueber"]//p');
		}

		if (!item.tags || item.tags.length === 0) {
			item.tags = [];
			let metaTags = doc.querySelectorAll('meta[property="og:book:tag"]');
			for (let tag of metaTags) {
				if (tag.content) item.tags.push(tag.content);
			}
		}
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.inlibra.com/de/document/view/detail/uuid/2d458280-771d-3d73-8f18-02385a0062fe",
		"items": [
			{
				"itemType": "book",
				"title": "Soziale Arbeit in Totalen Institutionen",
				"creators": [
					{
						"firstName": "Larissa",
						"lastName": "Steimle",
						"creatorType": "author"
					},
					{
						"firstName": "Heino",
						"lastName": "Stöver",
						"creatorType": "author"
					}
				],
				"date": "2026",
				"ISBN": "9783748931010",
				"abstractNote": "This book offers readers a well-founded yet accessible insight into professional social work in total institutions – an area of practice characterized by involuntariness, complex organizational structures, and the constant tension between support and control. The focus lies on correctional system, forensic psychiatric facilities, and juvenile detention as central fields of practice. Theoretical foundations, practice-relevant methods, and specific target groups are presented in a clear and illustrative manner. The book is rounded out by interviews with two experienced practitioners who describe their everyday\nprofessional lives in prison and forensic settings. The authors\npossess extensive expertise in social work and in the context of\ncorrectional institutions. This title is also available as Open\nAccess.",
				"edition": "1",
				"extra": "DOI: 10.5771/9783748931010",
				"language": "de",
				"libraryCatalog": "Inlibra",
				"place": "Baden-Baden",
				"publisher": "Nomos Verlagsgesellschaft mbH & Co. KG",
				"series": "Drogenkonsum in Geschichte und Gesellschaft | Drug Use in History and Society",
				"seriesNumber": "5",
				"url": "https://www.inlibra.com/de/document/view/detail/uuid/2d458280-771d-3d73-8f18-02385a0062fe",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://www.inlibra.com/de/document/view/detail/uuid/d7612006-86a4-386b-b476-f005247f772a",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.inlibra.com/de/document/view/pdf/uuid/c6f5e67e-f17b-3f0b-be82-21d2398abe42",
		"items": [
			{
				"itemType": "bookSection",
				"title": "System error in international law: exposing and addressing cumulative harm",
				"creators": [
					{
						"firstName": "André",
						"lastName": "Nollkaemper",
						"creatorType": "author"
					},
					{
						"firstName": "Felix",
						"lastName": "Aiwanger",
						"creatorType": "editor"
					},
					{
						"firstName": "Maximilian Richard",
						"lastName": "Götze",
						"creatorType": "editor"
					},
					{
						"firstName": "Biset Sena",
						"lastName": "Güneş",
						"creatorType": "editor"
					},
					{
						"firstName": "Vincent",
						"lastName": "Hoppmann",
						"creatorType": "editor"
					},
					{
						"firstName": "Hans Flemming",
						"lastName": "Maltzahn",
						"creatorType": "editor"
					},
					{
						"firstName": "Antonia",
						"lastName": "Sommerfeld",
						"creatorType": "editor"
					}
				],
				"date": "2026",
				"ISBN": "9783748966265",
				"bookTitle": "Sustainability Law: Comparative, Interdisciplinary, and Intradisciplinary Perspectives",
				"edition": "1",
				"extra": "DOI: 10.5771/9783748966265-11",
				"language": "en",
				"libraryCatalog": "Inlibra",
				"pages": "11-22",
				"place": "Baden-Baden",
				"publisher": "Nomos Verlagsgesellschaft mbH & Co. KG",
				"shortTitle": "System error in international law",
				"url": "https://www.inlibra.com/de/document/view/detail/uuid/c6f5e67e-f17b-3f0b-be82-21d2398abe42",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://www.inlibra.com/de/document/view/detail/uuid/2f17b357-7ded-3274-9196-3467be59f8c6",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.inlibra.com/de/search?search_form%5Bquery%5D=Schuldrecht",
		"items": "multiple"
	}
]
/** END TEST CASES **/
