{
	"translatorID": "999b5d1b-3479-48ea-bb09-a69c2f1f1e89",
	"label": "UTB Library",
	"creator": "Lukas Collier",
	"target": "^https?://elibrary\\.utb\\.de/(?:doi/(?:(?:book|epdf|reader|abs|full)/)?10\\.|toc/|action/doSearch)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-16 15:08:31"
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

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll('.issue-item, .search-result-item, article, .card');
	for (let row of rows) {
		let link = row.querySelector('.issue-item__title a, .search-result-item__title a, h3 a, h2 a, h4 a, a.ref')
			|| row.querySelector('a[href*="/doi/"]:not(:empty)')
			|| row.querySelector('a[href*="/doi/"]');
		if (!link) continue;
		let href = link.href;
		if (!href || !/\/doi\/(?:(?:book|epdf|reader|abs|full)\/)?10\./i.test(href)) continue;
		let title = ZU.trimInternal(link.textContent);
		if (!title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function detectWeb(doc, url) {
	if (/\/toc\//i.test(url) || /\/action\/doSearch/i.test(url)) {
		return getSearchResults(doc, true) ? 'multiple' : false;
	}

	if (doc.querySelector('meta[name="citation_journal_title"]')
		|| doc.querySelector('.cover-info-head')
		|| attr(doc, 'meta[name="dc.Type"]', 'content') === 'article'
		|| attr(doc, 'meta[name="dc.type"]', 'content') === 'article') {
		return 'journalArticle';
	}

	if (/\/doi\/(?:book|epdf|reader|abs)\/10\./i.test(url)
		|| doc.querySelector('.current-issue, #simpleViewer, #detailsAccordion, .reading-options-navbar')) {
		if (/10\.\d{4,5}\/[^?#]+-\d+-\d+/i.test(url)) {
			return 'bookSection';
		}
		return 'book';
	}

	if (getSearchResults(doc, true)) {
		return 'multiple';
	}

	return false;
}

/**
 * Computes the deterministic PDF download URL for a given DOI.
 *
 * In UTB eLibrary (built on the Atypon Literatum platform), PDF downloads
 * follow a consistent, deterministic URL scheme:
 *   https://elibrary.utb.de/doi/pdf/<DOI>?download=true
 *
 * Rather than simulating clicks on dynamic client-side download buttons
 * or relying on variable UI state across page types, the download URL
 * is computed programmatically directly from the DOI.
 */
function buildPdfDownloadUrl(doi, url) {
	if (!doi) return null;
	let origin = url ? new URL(url).origin : 'https://elibrary.utb.de';
	return `${origin}/doi/pdf/${doi}?download=true`;
}

function getDOI(doc, url) {
	let metaDoi = attr(doc, 'meta[name="citation_doi"]', 'content')
		|| attr(doc, 'meta[name="publication_doi"]', 'content')
		|| attr(doc, 'meta[name="dc.identifier"]', 'content')
		|| attr(doc, 'meta[name="dc.Identifier"]', 'content');
	if (metaDoi) {
		let clean = ZU.cleanDOI(metaDoi);
		if (clean) return clean;
	}

	if (doc) {
		for (let entry of doc.querySelectorAll('#detailsAccordion li, ul.rlist li, .details-section .details-entry')) {
			let textContent = entry.textContent;
			let m = textContent.match(/DOI:\s*(10\.\d{4,5}\/[^\s<]+)/i);
			if (m) {
				let clean = ZU.cleanDOI(m[1]);
				if (clean) return clean;
			}
		}
	}

	let urlMatch = url && url.match(/10\.\d{4,5}\/[^?#&\s]+/);
	if (urlMatch) {
		return ZU.cleanDOI(urlMatch[0]);
	}

	return null;
}

function getIsbns(doc) {
	let isbn = null;
	let eisbn = null;

	// 1. PDF view page: .details-entry blocks with .details-label and .details-value
	for (let entry of doc.querySelectorAll('.details-entry')) {
		let label = text(entry, '.details-label');
		let val = text(entry, '.details-value');
		if (!label || !val) continue;

		let cleanVal = val.replace(/[^\dXx-].*$/, '').trim();
		if (!isbn && /^ISBN$/i.test(label)) {
			isbn = cleanVal;
		}
		if (!eisbn && /^eISBN$/i.test(label)) {
			eisbn = cleanVal;
		}
	}

	// 2. Overview page: #detailsAccordion ul.rlist li entries ("ISBN: ...", "eISBN: ...")
	for (let li of doc.querySelectorAll('#detailsAccordion li, ul.rlist li, .details-section li, .cover-details-info')) {
		let content = li.textContent.trim();
		let mEisbn = content.match(/eISBN:\s*([0-9Xx-]+)/i);
		if (mEisbn && !eisbn) {
			eisbn = mEisbn[1].trim();
		}
		let mIsbn = content.match(/(?:^|[^e\w])ISBN:\s*([0-9Xx-]+)/i);
		if (mIsbn && !isbn) {
			isbn = mIsbn[1].trim();
		}
	}

	// 3. Fallback: Citavi picker images with identifier attribute
	for (let img of doc.querySelectorAll('img.citavipicker[identifier]')) {
		let val = img.getAttribute('identifier');
		if (!val) continue;
		let parentText = img.closest('.details-entry, li')?.textContent || '';
		if (/eISBN/i.test(parentText)) {
			if (!eisbn) eisbn = val;
		}
		else if (!isbn) {
			isbn = val;
		}
	}

	return { isbn, eisbn };
}

const ACADEMIC_TITLES = [
	/\b(?:Prof|Professorin|Professor)\.?(?=\s|$|[.,;])/gi,
	/\b(?:Dr|Dres|Doktor)\.?(?=\s|$|[.,;])/gi,
	/\b(?:jur|iur|rer\.\s*pol|rer\.\s*nat|habil)\.?(?=\s|$|[.,;])/gi,
	/\b(?:h\.\s*c\.|mult)\.?(?=\s|$|[.,;])/gi,
	/\b(?:Priv\.-Doz|Privatdozent(?:in)?|PD)\.?(?=\s|$|[.,;])/gi,
	/\bDipl\.-[A-Za-z]+(?:\s*\([A-Za-z]+\))?\.?(?=\s|$|[.,;])/gi,
	/\b(?:Mag|Magister|Ass\.\s*jur|RA\b|Rechtsanwalt|Rechtsanwältin|Notar)\.?(?=\s|$|[.,;])/g,
	/,\s*(?:LL\.?M\.?|LL\.?B\.?|M\.?A\.?|B\.?A\.?|B\.?Sc\.?|M\.?Sc\.?|Ph\.?D\.?|PhD|MBA)(?=\s|$|[.,;])/gi,
	/\b(?:LL\.?M\.?|LL\.?B\.?|Ph\.?D\.?|PhD)\b/gi
];

function stripTitles(str) {
	if (!str) return '';
	let s = str;
	for (let i = 0; i < ACADEMIC_TITLES.length; i++) {
		s = s.replace(ACADEMIC_TITLES[i], ' ');
	}
	return s.replace(/\s+/g, ' ').replace(/^[,;\s]+|[,;\s]+$/g, '').trim();
}

function cleanAuthorName(rawName, creatorType = 'author') {
	if (!rawName) return null;
	let name = stripTitles(rawName);
	if (!name) return null;
	return ZU.cleanAuthor(name, creatorType, name.includes(','));
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) === 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let itemUrl of Object.keys(items)) {
			let itemDoc = null;
			try {
				itemDoc = await requestDocument(itemUrl);
			}
			catch (e) {
				Zotero.debug('UTB eLibrary: Failed to fetch ' + itemUrl + ': ' + e);
			}
			if (!itemDoc) continue;
			await scrape(itemDoc, itemUrl);
		}
	}
	else {
		await scrape(doc, url);
	}
}

function searchTranslator(query) {
	return new Promise((resolve) => {
		try {
			let search = Zotero.loadTranslator('search');
			search.setSearch(query);
			let resultItem = null;

			search.setHandler('itemDone', (_obj, item) => {
				resultItem = item;
			});

			search.setHandler('translators', (_obj, translators) => {
				if (!translators || !translators.length) {
					resolve(null);
					return;
				}
				search.setTranslator(translators);
				search.setHandler('done', () => {
					resolve(resultItem);
				});
				search.setHandler('error', (_obj, err) => {
					Zotero.debug('UTB eLibrary: search error: ' + err);
					resolve(resultItem);
				});
				try {
					let res = search.translate();
					if (res && typeof res.then === 'function') {
						res.then(() => resolve(resultItem)).catch(() => resolve(resultItem));
					}
				}
				catch (e) {
					Zotero.debug('UTB eLibrary: search.translate() error: ' + e);
					resolve(resultItem);
				}
			});

			search.getTranslators().then((translators) => {
				if (!translators || !translators.length) {
					resolve(null);
				}
			}).catch((err) => {
				Zotero.debug('UTB eLibrary: getTranslators error: ' + err);
				resolve(null);
			});

			setTimeout(() => {
				resolve(resultItem);
			}, 10000);
		}
		catch (e) {
			Zotero.debug('UTB eLibrary: searchTranslator threw: ' + e);
			resolve(null);
		}
	});
}

async function scrape(doc, url = doc?.location?.href) {
	let doi = getDOI(doc, url);
	let isbns = getIsbns(doc);
	let item = null;

	// 1. Search by DOI if available (e.g. Crossref / DOI Content Negotiation)
	if (doi) {
		let searchDoi = ZU.cleanDOI(doi);
		if (searchDoi) {
			item = await searchTranslator({ DOI: searchDoi });
		}
	}

	// 2. Search by ISBN if available
	let searchIsbn = isbns.eisbn || isbns.isbn;
	if (!item && searchIsbn) {
		let cleanSearchIsbn = ZU.cleanISBN(searchIsbn, true);
		if (cleanSearchIsbn) {
			item = await searchTranslator({ ISBN: cleanSearchIsbn });
		}
	}

	// 3. Post-process found search item or fallback to DOM extraction
	if (item) {
		postProcessItem(item, doc, url, doi, isbns);
		item.complete();
	}
	else {
		await scrapeDOM(doc, url, doi, isbns);
	}
}

function postProcessItem(item, doc, url, doi, isbns) {
	item.libraryCatalog = 'UTB eLibrary';

	let detectedType = doc ? detectWeb(doc, url) : null;
	if ((!item.itemType || item.itemType === 'document') && detectedType && detectedType !== 'multiple') {
		item.itemType = detectedType;
	}

	// 1. URL: Canonicalize epdf/reader view to landing page
	if (!item.url || item.url.includes('doi.org')) {
		let cleanUrl = url.replace(/[?#].*$/, '');
		item.url = cleanUrl.replace(/\/doi\/(?:epdf|reader)\//, item.itemType === 'journalArticle' ? '/doi/' : '/doi/book/');
	}

	// 2. DOI
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

	// 3. Fallback Title
	if ((!item.title || !item.title.trim() || item.title === '[No title found]') && doc) {
		item.title = attr(doc, 'meta[name="dc.Title"]', 'content')
			|| attr(doc, 'meta[name="dc.title"]', 'content')
			|| attr(doc, 'meta[property="og:title"]', 'content')
			|| text(doc, 'h1')
			|| doc.title.replace(/\s*\|.*$/, '').trim();
	}

	// 4. Journal Article Metadata
	if (item.itemType === 'journalArticle' && doc) {
		if (!item.publicationTitle) {
			item.publicationTitle = attr(doc, 'meta[name="citation_journal_title"]', 'content')
				|| text(doc, '.journal-title, .brand-journal-title');
		}
		if (!item.date) {
			let d = attr(doc, 'meta[name="citation_publication_date"]', 'content')
				|| attr(doc, 'meta[name="dc.Date"]', 'content')
				|| attr(doc, 'meta[name="dc.date"]', 'content');
			if (d) item.date = ZU.strToISO(d) || d;
		}
		if (!item.volume) {
			item.volume = attr(doc, 'meta[name="citation_volume"]', 'content');
		}
		if (!item.issue) {
			item.issue = attr(doc, 'meta[name="citation_issue"]', 'content');
		}
		if (!item.volume || !item.issue) {
			for (let h of doc.querySelectorAll('.cover-info-head h4, .issue-info h4')) {
				let mVol = h.textContent.match(/Jahrgang\s*(\d+)/i);
				if (mVol && !item.volume) item.volume = mVol[1];
				let mIss = h.textContent.match(/Ausgabe\s*(\d+)/i);
				if (mIss && !item.issue) item.issue = mIss[1];
			}
		}
		if (!item.pages) {
			let first = attr(doc, 'meta[name="citation_firstpage"]', 'content');
			let last = attr(doc, 'meta[name="citation_lastpage"]', 'content');
			if (first && last) {
				item.pages = first + '-' + last;
			}
			else if (first) {
				item.pages = first;
			}
			else {
				let foot = text(doc, '.cover-info-foot');
				let mPages = foot ? foot.match(/Seiten:\s*([\d-]+)/i) : null;
				if (mPages) item.pages = mPages[1];
			}
		}
		if (!item.ISSN) {
			item.ISSN = attr(doc, 'meta[name="citation_issn"]', 'content');
		}
	}

	// 5. Container title for bookSection
	if (item.itemType === 'bookSection' && !item.bookTitle && doc) {
		item.bookTitle = attr(doc, 'meta[name="citation_inbook_title"]', 'content')
			|| attr(doc, 'meta[name="citation_book_title"]', 'content')
			|| text(doc, '.current-issue__title');
	}

	// 6. Language
	if (!item.language && doc) {
		item.language = doc.documentElement?.lang || 'de';
	}

	// 7. ISBNs: merge print and electronic ISBNs
	let currentIsbns = (item.ISBN || '').split(/\s+/).filter(Boolean);
	if (isbns) {
		if (isbns.isbn && !currentIsbns.includes(isbns.isbn)) {
			let c = ZU.cleanISBN(isbns.isbn, true);
			if (c) currentIsbns.push(c);
		}
		if (isbns.eisbn && !currentIsbns.includes(isbns.eisbn)) {
			let c = ZU.cleanISBN(isbns.eisbn, true);
			if (c) currentIsbns.push(c);
		}
	}
	if (currentIsbns.length) {
		item.ISBN = currentIsbns.join(' ');
	}

	// 8. Clean authors/creators using academic title stripping
	if (item.creators && item.creators.length) {
		let cleanedCreators = [];
		for (let creator of item.creators) {
			let creatorType = creator.creatorType || 'author';
			if (creator.firstName && creator.lastName) {
				let f = stripTitles(creator.firstName);
				let l = stripTitles(creator.lastName);
				if (f && l) {
					cleanedCreators.push({
						firstName: f,
						lastName: l,
						creatorType: creatorType
					});
				}
				else if (l || f) {
					cleanedCreators.push({
						lastName: l || f,
						creatorType: creatorType,
						fieldMode: 1
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
	else if (doc) {
		item.creators = [];
		let dcCreators = doc.querySelectorAll('meta[name="dc.Creator"], meta[name="dc.creator"], meta[name="citation_author"]');
		if (dcCreators.length) {
			for (let meta of dcCreators) {
				let val = meta.getAttribute('content');
				if (val) {
					let cleaned = cleanAuthorName(val, 'author');
					if (cleaned) item.creators.push(cleaned);
				}
			}
		}
		if (!item.creators.length) {
			let authorNodes = doc.querySelectorAll('.mobile-authors .author-name span, .loa-accordion .author-name span, .authors .author');
			let seen = new Set();
			for (let node of authorNodes) {
				let rawName = node.textContent.trim();
				if (rawName && !seen.has(rawName)) {
					seen.add(rawName);
					let cleaned = cleanAuthorName(rawName, 'author');
					if (cleaned) {
						item.creators.push(cleaned);
					}
				}
			}
		}
	}

	// 9. Subtitle & ShortTitle
	if (doc && item.itemType !== 'journalArticle') {
		let subtitle = text(doc, '.title-group .subtitle');
		if (!subtitle) {
			for (let span of doc.querySelectorAll('.current-issue__details .current-issue__specifics span')) {
				let spanText = span.textContent.trim();
				if (spanText && !/Aufl\.|Umfang/i.test(spanText)) {
					subtitle = spanText;
					break;
				}
			}
		}
		if (subtitle && !item.title.toLowerCase().includes(subtitle.toLowerCase())) {
			item.shortTitle = item.title;
			item.title = `${item.title}: ${subtitle}`;
		}
	}

	// 10. Edition (e.g. "14. unv. Aufl.")
	if (doc && item.itemType !== 'journalArticle') {
		for (let span of doc.querySelectorAll('.current-issue__details .current-issue__specifics span')) {
			let t = span.textContent.trim();
			if (/Aufl\./i.test(t)) {
				item.edition = t;
				break;
			}
		}
	}

	// 11. Abstract
	if (doc && (!item.abstractNote || item.abstractNote.includes('<jats:'))) {
		let abstractPs = doc.querySelectorAll('#abstractId p, .abstract p, .abstract-text');
		if (abstractPs.length) {
			item.abstractNote = Array.from(abstractPs)
				.map(p => p.textContent.trim())
				.filter(Boolean)
				.join('\n\n');
		}
		else {
			let metaDesc = attr(doc, 'meta[name="dc.Description"]', 'content')
				|| attr(doc, 'meta[name="dc.description"]', 'content')
				|| attr(doc, 'meta[property="og:description"]', 'content');
			if (metaDesc) {
				item.abstractNote = metaDesc.trim();
			}
		}
	}
	if (item.abstractNote) {
		item.abstractNote = ZU.cleanTags(item.abstractNote);
	}

	// 12. Attachments: Full Text PDF (no snapshot)
	let pdfUrl = buildPdfDownloadUrl(doi, url);
	item.attachments = [];
	if (pdfUrl) {
		item.attachments.push({
			title: 'Full Text PDF',
			mimeType: 'application/pdf',
			url: pdfUrl
		});
	}
}

async function scrapeDOM(doc, url, doi, isbns) {
	let itemType = detectWeb(doc, url) || 'book';
	let item = new Zotero.Item(itemType);

	let title = text(doc, '.current-issue__title')
		|| text(doc, '.title-group .title')
		|| attr(doc, 'meta[property="og:title"]', 'content')
		|| doc.title.replace(/\s*\|.*$/, '').trim();

	item.title = title;

	let publisher = null;
	for (let entry of doc.querySelectorAll('.details-entry')) {
		let label = text(entry, '.details-label');
		if (/^Publisher$/i.test(label)) {
			publisher = text(entry, '.details-value');
			break;
		}
	}
	if (!publisher) {
		for (let li of doc.querySelectorAll('#detailsAccordion li, ul.rlist li')) {
			let m = li.textContent.match(/Verlag:\s*([^<]+)/i);
			if (m) {
				publisher = m[1].trim();
				break;
			}
		}
	}
	item.publisher = publisher;

	let rawDate = null;
	for (let entry of doc.querySelectorAll('.details-entry')) {
		let label = text(entry, '.details-label');
		if (/^(Online|Print)$/i.test(label)) {
			rawDate = text(entry, '.details-value');
			break;
		}
	}
	if (!rawDate) {
		for (let li of doc.querySelectorAll('#detailsAccordion li, ul.rlist li')) {
			let m = li.textContent.match(/Erscheinungsdatum:\s*([0-9.]+)/i);
			if (m) {
				rawDate = m[1].trim();
				break;
			}
		}
	}
	if (!rawDate) {
		let copyMatch = doc.querySelector('.copyright')?.textContent?.match(/©\s*(\d{4})/);
		if (copyMatch) {
			rawDate = copyMatch[1];
		}
	}
	if (rawDate) {
		item.date = ZU.strToISO(rawDate) || rawDate;
	}

	let numPages = null;
	for (let entry of doc.querySelectorAll('.details-entry')) {
		let label = text(entry, '.details-label');
		if (/^Pages$/i.test(label)) {
			numPages = text(entry, '.details-value');
			break;
		}
	}
	if (!numPages) {
		for (let li of doc.querySelectorAll('#detailsAccordion li, ul.rlist li')) {
			let m = li.textContent.match(/Umfang:\s*(\d+)/i);
			if (m) {
				numPages = m[1].trim();
				break;
			}
		}
	}
	if (item.itemType !== 'journalArticle') {
		item.numPages = numPages;
	}

	item.language = doc.documentElement?.lang || 'de';

	postProcessItem(item, doc, url, doi, isbns);
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://elibrary.utb.de/doi/book/10.36198/9783838553771",
		"items": [
			{
				"itemType": "book",
				"title": "Wie man eine wissenschaftliche Abschlußarbeit schreibt: Doktor-, Diplom- und Magisterarbeit in den Geistes- und Sozialwissenschaften",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Umberto",
						"lastName": "Eco"
					}
				],
				"date": "2020-02-17",
				"ISBN": "9783838553771 9783825253776",
				"abstractNote": "Diese Anleitung für die Planung, Gliederung und Niederschrift wissenschaftlicher Arbeiten von Umberto Eco, Professor an der Universität Bologna, ist ebenso gründlich wie virtuos.\nNach Ecos eigenen Worten (Einleitung) gibt sein Buch \"Auskunft darüber, (1) was man unter einer Abschlussarbeit versteht, (2) wie man das Thema sucht und die Zeit für seine Bearbeitung einteilt, (3) wie man bei der Literatursuche vorgeht, (4) wie man das gefundene Material auswertet und (5) wie man die Ausarbeitung äußerlich gestaltet\".\nDie autorisierte Übersetzung hat Professor Dr. Walter Schick erarbeitet. Eine \"erfrischend unkonventionelle Handreichung\" nennt er das Buch; es erlaube einen \"Blick in die 'Werkstatt' Ecos; denn Beziehungen zu anderen Werken Ecos werden nicht nur durch jenen Abbé Vallet hergestellt, der im vorliegenden Buch wie in 'Der Name der Rose' eine Rolle spielt.\"\nDarin liegt freilich nur ein zusätzlicher Reiz und Gewinn der Lektüre. Wichtiger ist: Ecos Buch zeigt, wie man schreiben soll – auf den Leser konzentriert, dem Leser dienend.",
				"edition": "14. unv. Aufl.",
				"extra": "DOI: 10.36198/9783838553771",
				"language": "de",
				"libraryCatalog": "UTB eLibrary",
				"place": "Stuttgart, Deutschland",
				"publisher": "utb GmbH",
				"shortTitle": "Wie man eine wissenschaftliche Abschlußarbeit schreibt",
				"url": "https://elibrary.utb.de/doi/book/10.36198/9783838553771",
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
		"url": "https://elibrary.utb.de/doi/epdf/10.36198/9783838553771",
		"items": [
			{
				"itemType": "book",
				"title": "Wie man eine wissenschaftliche Abschlußarbeit schreibt: Doktor-, Diplom- und Magisterarbeit in den Geistes- und Sozialwissenschaften",
				"creators": [
					{
						"firstName": "Umberto",
						"lastName": "Eco",
						"creatorType": "author"
					}
				],
				"date": "2020-02-17",
				"ISBN": "9783838553771 9783825253776",
				"abstractNote": "Diese Anleitung für die Planung, Gliederung und Niederschrift wissenschaftlicher Arbeiten von Umberto Eco, Professor an der Universität Bologna, ist ebenso gründlich wie virtuos.\nNach Ecos eigenen Worten (Einleitung) gibt sein Buch \"Auskunft darüber, (1) was man unter einer Abschlussarbeit versteht, (2) wie man das Thema sucht und die Zeit für seine Bearbeitung einteilt, (3) wie man bei der Literatursuche vorgeht, (4) wie man das gefundene Material auswertet und (5) wie man die Ausarbeitung äußerlich gestaltet\".\nDie autorisierte Übersetzung hat Professor Dr. Walter Schick erarbeitet. Eine \"erfrischend unkonventionelle Handreichung\" nennt er das Buch; es erlaube einen \"Blick in die 'Werkstatt' Ecos; denn Beziehungen zu anderen Werken Ecos werden nicht nur durch jenen Abbé Vallet hergestellt, der im vorliegenden Buch wie in 'Der Name der Rose' eine Rolle spielt.\"\nDarin liegt freilich nur ein zusätzlicher Reiz und Gewinn der Lektüre. Wichtiger ist: Ecos Buch zeigt, wie man schreiben soll – auf den Leser konzentriert, dem Leser dienend.",
				"edition": "14",
				"extra": "DOI: 10.36198/9783838553771",
				"language": "de",
				"libraryCatalog": "UTB eLibrary",
				"place": "Stuttgart, Deutschland",
				"publisher": "utb GmbH",
				"shortTitle": "Wie man eine wissenschaftliche Abschlußarbeit schreibt",
				"url": "https://elibrary.utb.de/doi/book/10.36198/9783838553771",
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
		"url": "https://elibrary.utb.de/doi/10.3278/HSL2101W",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Vermittlung von Theorie für die Deutung der Praxis in der Geschichtslehrer- und Geschichtslehrerinnenbildung – konzeptionelle Überlegungen zur Ausbildung und Förderung reflexiver Wahrnehmung von Geschichtsunterricht auf der Grundlage videobasierter Blended-learning-Szenarien",
				"creators": [
					{
						"firstName": "Philipp",
						"lastName": "McLean",
						"creatorType": "author"
					}
				],
				"date": "2021-02-04",
				"DOI": "10.3278/HSL2101W",
				"ISSN": "2199-8825",
				"abstractNote": "In diesem Beitrag werden zunächst grundsätzliche Überlegungen zum Umgang mit der professionellen Wahrnehmung von Unterricht in gesellschaftswissenschaftlichen Fächern vorgestellt. Zu diesem Zweck w...",
				"issue": "1",
				"language": "de",
				"libraryCatalog": "UTB eLibrary",
				"pages": "1-15",
				"publicationTitle": "die hochschullehre",
				"url": "https://elibrary.utb.de/doi/10.3278/HSL2101W",
				"volume": "7",
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
		"url": "https://elibrary.utb.de/toc/hosl/7/1",
		"items": "multiple"
	}
]
/** END TEST CASES **/
