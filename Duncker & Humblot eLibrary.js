{
	"translatorID": "ffe75306-10af-47e3-8972-5192f0808c3d",
	"label": "Duncker & Humblot eLibrary",
	"creator": "Lukas Collier",
	"target": "^https?://(?:www\\.)?elibrary\\.duncker-humblot\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-01 22:00:00"
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
	if (/\/book\/\d+/.test(url)) {
		return "book";
	}
	if (/\/book-chapter\/\d+/.test(url)) {
		return "bookSection";
	}
	if (/\/article\/\d+/.test(url)) {
		return "journalArticle";
	}
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var links = doc.querySelectorAll('h4 a[href*="/book/"], h4 a[href*="/book-chapter/"], h4 a[href*="/article/"]');
	for (let link of links) {
		let href = link.href;
		let title = ZU.trimInternal(link.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		var items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let itemUrl of Object.keys(items)) {
			await scrape(await requestDocument(itemUrl), itemUrl);
		}
	}
	else {
		await scrape(doc, url);
	}
}

function getRisUrl(doc, url) {
	var risBtn = doc.querySelector('a.cite-download-btn[data-ris]');
	if (risBtn) {
		return risBtn.getAttribute('data-ris');
	}
	var m = url.match(/^(https?:\/\/[^/]+)\/(book|book-chapter|article)\/(\d+)/i);
	if (m) {
		var type = m[2];
		var id = m[3];
		if (type === 'book') {
			return `${m[1]}/books/download/${id}/ris`;
		}
		else if (type === 'book-chapter') {
			return `${m[1]}/books/download/${id}/ris/chapter`;
		}
		else if (type === 'article') {
			return `${m[1]}/article/download/${id}/ris`;
		}
	}
	return null;
}

function getContentText(doc, name) {
	var el = doc.querySelector('meta[name="' + name + '"]');
	return el ? el.getAttribute('content') : null;
}

function cleanLanguage(lang) {
	if (!lang) return lang;
	var l = lang.trim().toLowerCase();
	if (l === 'german' || l === 'deutsch' || l === 'ger' || l === 'deu' || l.startsWith('de')) return 'de';
	if (l === 'english' || l === 'englisch' || l === 'eng' || l.startsWith('en')) return 'en';
	if (l === 'french' || l === 'französisch' || l === 'fra' || l === 'fre' || l.startsWith('fr')) return 'fr';
	if (l === 'italian' || l === 'italienisch' || l === 'ita' || l.startsWith('it')) return 'it';
	if (l === 'spanish' || l === 'spanisch' || l === 'spa' || l.startsWith('es')) return 'es';
	return lang.length === 2 ? lang.toLowerCase() : lang;
}

function parseAuthor(rawName, type) {
	if (!rawName) return null;
	var name = ZU.trimInternal(rawName);

	// Strip academic and professional titles (e.g. "Prof. Dr.", "Dr. iur.")
	name = name.replace(/^(?:(?:Prof(?:essor)?|PD|Priv\.-Doz\.|Dr|RA)[\s.]*)+\s+/i, '');

	// Normalize 3-part inverted names with suffixes: e.g. "Smith, John, Jr." -> "Smith, John Jr."
	var suffixMatch = name.match(/^([^,]+),\s*([^,]+),\s*(Jr\.?|Sr\.?|I{1,3}|IV|V|VI)$/i);
	if (suffixMatch) {
		name = suffixMatch[1] + ', ' + suffixMatch[2] + ' ' + suffixMatch[3];
	}

	var hasComma = name.includes(',');
	var creator = ZU.cleanAuthor(name, type, hasComma);

	// Reposition surname prefixes and nobiliary particles:
	// 1) Inverted catalog style: "Wall, Heinrich de" -> firstName: "Heinrich", lastName: "de Wall"
	// 2) Direct style: "Stefan De Wall" -> firstName: "Stefan", lastName: "De Wall"
	if (creator.firstName) {
		var particleMatch = creator.firstName.match(/\s+(von und zu|von der|von dem|van den|van der|van de|de la|de le|de los|von|van|vom|zu|zum|zur|de|del|della|des|du|di|da|af|av|ter|ten)$/i);
		if (particleMatch) {
			var particle = particleMatch[1];
			creator.firstName = creator.firstName.slice(0, -particleMatch[0].length).trim();
			creator.lastName = particle + ' ' + creator.lastName;
		}
	}

	return creator;
}

async function scrape(doc, url) {
	var parentDoc = null;
	if (/\/book-chapter\/\d+/.test(url)) {
		var bookLink = doc.querySelector('ol.breadcrumb a[href*="/book/"], .breadcrumb a[href*="/book/"]');
		if (bookLink && bookLink.href) {
			try {
				parentDoc = await requestDocument(bookLink.href);
			}
			catch (e) {
				Zotero.debug('Failed to fetch parent book document: ' + e.message);
			}
		}
	}

	var risUrl = getRisUrl(doc, url);
	if (risUrl) {
		try {
			var text = await requestText(risUrl);
			if (text && text.includes('TY  -')) {
				await scrapeFromRis(text, doc, url, parentDoc);
				return;
			}
		}
		catch (e) {
			Zotero.debug('Failed to fetch RIS from ' + risUrl + ': ' + e.message);
		}
	}
	await scrapeFromDOM(doc, url, parentDoc);
}

async function scrapeFromRis(text, doc, url, parentDoc) {
	// Some records concatenate multiple authors on a single AU line in RIS without delimiters.
	// Only split when there are multiple commas indicating multiple authors.
	text = text.replace(/^AU\s+-\s+(.+)$/gm, function (match, authorsStr) {
		var commaCount = (authorsStr.match(/,/g) || []).length;
		if (commaCount > 1) {
			var parts = authorsStr.split(/\s+(?=[^\s,]+,\s*)/);
			if (parts.length > 1) {
				return parts.map(a => 'AU  - ' + a.trim()).join('\n');
			}
		}
		return match;
	});

	// Duncker & Humblot uses T2 for subtitle in books
	if (/^TY\s+-\s+BOOK/m.test(text)) {
		var ti = (text.match(/^TI\s+-\s+(.+)$/m) || [])[1];
		var t2 = (text.match(/^T2\s+-\s+(.+)$/m) || [])[1];
		if (ti && t2 && !/\/book-chapter\/\d+/.test(url)) {
			text = text.replace(/^TI\s+-\s+.+$/m, 'TI  - ' + ti.trim() + ': ' + t2.trim());
			text = text.replace(/^T2\s+-\s+.*\r?\n?/m, '');
		}
	}

	// For book chapters, convert TY - BOOK to TY - CHAP
	if (/\/book-chapter\/\d+/.test(url) && /^TY\s+-\s+BOOK/m.test(text)) {
		text = text.replace(/^TY\s+-\s+BOOK/m, 'TY  - CHAP');
	}

	// For journal articles, D&H exports journal title in T3 instead of JF/T2
	if (/\/article\/\d+/.test(url) && /^TY\s+-\s+JOUR/m.test(text)) {
		text = text.replace(/^T3\s+-\s+(.+)$/m, 'JF  - $1');
	}

	var trans = Zotero.loadTranslator('import');
	trans.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7'); // RIS
	trans.setString(text);
	trans.setHandler('itemDone', function (_obj, item) {
		fixItem(doc, url, item, parentDoc);
		item.complete();
	});
	await trans.translate();
}

function scrapeFromDOM(doc, url, parentDoc) {
	return new Promise(function (resolve) {
		var translator = Zotero.loadTranslator('web');
		// Embedded Metadata
		translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
		translator.setDocument(doc);

		var itemScraped = false;
		translator.setHandler('itemDone', function (_obj, item) {
			itemScraped = true;
			fixItem(doc, url, item, parentDoc);
			item.complete();
		});

		translator.getTranslatorObject(function (trans) {
			trans.itemType = detectWeb(doc, url);
			trans.doWeb(doc, url);
			if (!itemScraped) {
				var detectedType = detectWeb(doc, url);
				if (detectedType && detectedType !== 'multiple') {
					var item = new Zotero.Item(detectedType);
					var titleNode = doc.querySelector('.section__right h2, .section-article h2');
					if (titleNode) {
						item.title = ZU.trimInternal(titleNode.textContent);
					}
					fixItem(doc, url, item, parentDoc);
					item.complete();
				}
			}
			resolve();
		});
	});
}

function fixItem(doc, url, item, parentDoc) {
	item.libraryCatalog = 'Duncker & Humblot eLibrary';

	var canonical = doc.querySelector('link[rel="canonical"]');
	if (canonical && canonical.href) {
		item.url = canonical.href;
	}
	else {
		item.url = url;
	}

	// DOI extraction & cleanup
	var metaDoi = getContentText(doc, 'citation_doi');
	if (metaDoi) {
		item.DOI = metaDoi.trim();
	}
	else {
		var doiCandidates = doc.querySelectorAll('dd[data-catalogue-property="doi"], a[href*="doi.org"], .cite-info');
		for (let node of doiCandidates) {
			let text = node.getAttribute('href') || node.textContent;
			let cleaned = ZU.cleanDOI(text);
			if (cleaned) {
				item.DOI = cleaned;
				break;
			}
		}
	}
	if (item.DOI) {
		item.DOI = ZU.cleanDOI(item.DOI);
	}

	if (!item.ISBN) {
		var isbnDd = doc.querySelector('dd[data-catalogue-property="isbn"]');
		if (isbnDd) {
			item.ISBN = ZU.trimInternal(isbnDd.textContent).split(/\s+/)[0];
		}
	}
	if (item.ISBN) {
		item.ISBN = ZU.cleanISBN(item.ISBN);
	}

	// More precise date from meta tag if available.
	// On D&H, citation_publication_date represents the online upload date,
	// which may differ from the original print publication year. Only use it
	// when the year matches the existing date (e.g. from RIS).
	var pubDate = getContentText(doc, 'citation_publication_date') || getContentText(doc, 'citation_online_date');
	if (pubDate) {
		var metaYear = pubDate.substring(0, 4);
		var existingYear = item.date ? String(item.date).substring(0, 4) : null;
		if (!existingYear || metaYear === existingYear) {
			item.date = ZU.strToISO(pubDate) || item.date;
		}
	}

	// Subtitle (only match subtitle directly following the main title, avoid section accordion headers)
	var subtitleNode = doc.querySelector('.section__right h2 + h4, .section-article h2 + h4');
	var subtitle = subtitleNode ? ZU.trimInternal(subtitleNode.textContent) : null;
	if (subtitle && !/^(Book|Chapter|Article)\s+Details$/i.test(subtitle)) {
		if (item.title && !item.title.toLowerCase().includes(subtitle.toLowerCase())) {
			item.title += ': ' + subtitle;
		}
	}

	if (!item.shortTitle && item.title && item.title.includes(':')) {
		item.shortTitle = item.title.split(':')[0].trim();
	}

	// Book chapter specifics: ensure itemType, bookTitle, and pages
	if (/\/book-chapter\/\d+/.test(url)) {
		item.itemType = 'bookSection';
		var inbook = getContentText(doc, 'citation_inbook_title')
			|| ZU.xpathText(doc, '//ol[contains(@class, "breadcrumb")]//li[a[contains(@href, "/book/")]]/a');
		if (inbook) {
			item.bookTitle = ZU.trimInternal(inbook);
		}
	}

	// Journal article specifics: publicationTitle and clean unwanted publisher
	if (item.itemType === 'journalArticle' || /\/article\/\d+/.test(url)) {
		item.itemType = 'journalArticle';
		if (!item.publicationTitle && item.series) {
			item.publicationTitle = item.series;
			delete item.series;
		}
		if (!item.publicationTitle) {
			var journalLink = doc.querySelector('.breadcrumb a[href*="/journal/"], .breadcrumb-item a[href*="/journal/"]');
			if (journalLink) {
				item.publicationTitle = ZU.trimInternal(journalLink.textContent);
			}
		}
		delete item.publisher;
	}

	// Pages for book chapters and journal articles
	if (item.itemType === 'bookSection' || item.itemType === 'journalArticle') {
		if (!item.pages) {
			var firstPage = getContentText(doc, 'citation_firstpage');
			var lastPage = getContentText(doc, 'citation_lastpage');
			if (firstPage && lastPage) {
				item.pages = firstPage.trim() + '-' + lastPage.trim();
			}
			else {
				var pageBreadcrumb = ZU.xpathText(doc, '//ol[contains(@class, "breadcrumb")]//li[contains(@class, "active") and contains(text(), "pp.")]');
				if (pageBreadcrumb) {
					var pMatch = pageBreadcrumb.match(/pp\.\s*([\d–-]+)/);
					if (pMatch) {
						item.pages = pMatch[1].replace('–', '-');
					}
				}
			}
		}
	}

	// Authors & Editors from DOM:
	// Prefer structured author/editor links in the main content section
	var foundDOMCreators = false;
	var creatorParagraphs = doc.querySelectorAll('.section__right p, .section-article p');
	for (let p of creatorParagraphs) {
		let pText = p.textContent.trim();
		let isEditor = /^(?:Editors?|Herausgeber|Hrsg\.?)\s*:/i.test(pText);
		let authorLinks = p.querySelectorAll('a[href*="/authors/"]');
		if (authorLinks.length) {
			let type = isEditor ? 'editor' : 'author';
			let domCreators = [];
			for (let a of authorLinks) {
				let creator = parseAuthor(a.textContent, type);
				if (creator) {
					domCreators.push(creator);
				}
			}
			if (domCreators.length) {
				item.creators = domCreators;
				foundDOMCreators = true;
			}
			break;
		}
	}

	// Fallback if no author links were found in the main content section
	if (!foundDOMCreators) {
		var metaAuthors = doc.querySelectorAll('meta[name="citation_author"]');
		if (metaAuthors && metaAuthors.length) {
			var domAuthors = [];
			for (let m of metaAuthors) {
				let creator = parseAuthor(m.getAttribute('content'), 'author');
				if (creator) {
					domAuthors.push(creator);
				}
			}
			if (domAuthors.length) {
				item.creators = domAuthors;
			}
		}
		else if (item.creators && item.creators.length) {
			// Normalize any creators imported from RIS
			for (let i = 0; i < item.creators.length; i++) {
				let orig = item.creators[i];
				let fullName = orig.lastName + (orig.firstName ? ', ' + orig.firstName : '');
				let normalized = parseAuthor(fullName, orig.creatorType);
				if (normalized) {
					item.creators[i] = normalized;
				}
			}
		}
	}

	// Series & Series Number (for books and bookSections).
	// First try the current page; for bookSections fall back to the parent book page.
	if (item.itemType === 'book' || item.itemType === 'bookSection') {
		var seriesNode = doc.querySelector('.section__right p.series, .section-article p.series');
		if (!seriesNode && parentDoc) {
			seriesNode = parentDoc.querySelector('.section__right p.series, .section-article p.series');
		}
		if (seriesNode) {
			// Always set series name from the link text if not already present
			if (!item.series) {
				var seriesLink = seriesNode.querySelector('a');
				if (seriesLink) {
					item.series = ZU.trimInternal(seriesLink.textContent);
				}
			}
			// Always extract seriesNumber regardless of whether series was already set.
			// D&H uses various abbreviations across language versions: Vol., Bd., Band, Nr., No.
			if (!item.seriesNumber) {
				var seriesVolMatch = seriesNode.textContent.match(/(?:Vol\.?|Bd\.?|Band|Nr\.?|No\.?)\s*([0-9]+)/i);
				if (seriesVolMatch) {
					item.seriesNumber = seriesVolMatch[1];
				}
			}
		}
	}

	// Editors from the parent book page for bookSections.
	// The parent book page reliably contains a paragraph of the form:
	//   "Editors: <a href="…/authors/…">Name, First</a> | <a>…</a>"
	// Reading the individual <a> links avoids all regex/splitting ambiguities.
	if (item.itemType === 'bookSection' && parentDoc) {
		var editorP = null;
		var parentPs = parentDoc.querySelectorAll('.section__right p, .section-article p, p');
		for (let p of parentPs) {
			if (/^(?:Editors?|Herausgeber|Hrsg\.?)\s*:/i.test(p.textContent.trim())) {
				editorP = p;
				break;
			}
		}
		if (editorP) {
			var edLinks = editorP.querySelectorAll('a[href*="/authors/"]');
			item.creators = item.creators || [];
			for (let a of edLinks) {
				let edObj = parseAuthor(a.textContent, 'editor');
				if (!edObj) continue;
				// Deduplicate editors by full name to preserve distinct individuals sharing a first name
				let alreadyAdded = false;
				for (let c of item.creators) {
					if (c.creatorType === 'editor'
						&& c.lastName === edObj.lastName
						&& c.firstName === edObj.firstName) {
						alreadyAdded = true;
						break;
					}
				}
				if (!alreadyAdded) item.creators.push(edObj);
			}
		}
		else {
			// Fallback: parse cite-info Tab1/Tab2 text if the Editors paragraph is absent
			var tab1 = parentDoc.querySelector('.tab.cite-info, #tab1');
			var tab2 = parentDoc.querySelector('#tab2');
			var tab1Text = tab1 ? ZU.trimInternal(tab1.textContent) : '';
			var tab2Text = tab2 ? ZU.trimInternal(tab2.textContent) : '';
			var isEditorVol = /\((?:Eds?|Hrsg)\.?\)/i.test(tab1Text);
			if (isEditorVol) {
				var editorString = '';
				if (tab2Text) {
					var mTab2 = tab2Text.match(/^([^.]+?)\.\s+[A-ZÄÖÜ]/);
					if (mTab2) editorString = mTab2[1].trim();
				}
				if (!editorString && tab1Text) {
					var mTab1 = tab1Text.match(/^([^()]+?)\s*\((?:Eds?|Hrsg)\.?\)/i);
					if (mTab1) editorString = mTab1[1].trim();
				}
				if (editorString) {
					var editorNames = editorString.split(/;\s*|\s+and\s+|\s+&\s+/i).map(s => s.trim()).filter(Boolean);
					item.creators = item.creators || [];
					for (let eName of editorNames) {
						let edObj = parseAuthor(eName, 'editor');
						if (!edObj) continue;
						let alreadyAdded = false;
						for (let c of item.creators) {
							if (c.creatorType === 'editor'
								&& c.lastName === edObj.lastName
								&& c.firstName === edObj.firstName) {
								alreadyAdded = true;
								break;
							}
						}
						if (!alreadyAdded) item.creators.push(edObj);
					}
				}
			}
		}
	}

	// Publisher (for books and bookSections)
	if (item.itemType !== 'journalArticle') {
		var pub = doc.querySelector('dd[data-catalogue-property="publisher-name"]');
		if (pub) {
			item.publisher = ZU.trimInternal(pub.textContent);
		}
		else if (!item.publisher || item.publisher.toUpperCase() === 'DUNCKER UND HUMBLOT') {
			item.publisher = 'Duncker & Humblot';
		}
	}

	// Edition
	var edition = doc.querySelector('dd[data-catalogue-property="edition"]');
	if (edition && !item.edition) {
		item.edition = ZU.trimInternal(edition.textContent);
	}

	// Language
	var language = doc.querySelector('dd[data-catalogue-property="language"]');
	if (language && !item.language) {
		item.language = ZU.trimInternal(language.textContent);
	}
	if (!item.language) {
		var contentLang = getContentText(doc, 'citation_language') || getContentText(doc, 'language');
		if (contentLang) {
			item.language = contentLang.split('-')[0].trim().toLowerCase();
		}
	}
	if (item.language) {
		item.language = cleanLanguage(item.language);
	}

	// Number of Pages for books
	if (item.itemType === 'book') {
		var pagesDd = doc.querySelector('dd[data-catalogue-property="pages"]');
		if (pagesDd) {
			item.numPages = ZU.trimInternal(pagesDd.textContent);
			delete item.pages;
		}
		else if (item.pages && item.pages.includes('-')) {
			var pParts = item.pages.split('-');
			item.numPages = pParts[1];
			delete item.pages;
		}
	}

	// Abstract
	if (!item.abstractNote) {
		var deSpan = doc.querySelector('.section-abstract span._lang_de');
		var enSpan = doc.querySelector('.section-abstract span._lang_en');
		var abstractNode = deSpan || enSpan || doc.querySelector('.section-abstract .section__body p');
		if (abstractNode) {
			item.abstractNote = ZU.trimInternal(abstractNode.textContent);
		}
	}

	// Subjects / Tags
	var subjectLinks = doc.querySelectorAll('dd[data-catalogue-property="subjects"] a');
	if (subjectLinks && subjectLinks.length) {
		item.tags = item.tags || [];
		for (let sub of subjectLinks) {
			let tag = ZU.trimInternal(sub.textContent);
			if (tag && !item.tags.some(t => (t.tag || t) === tag)) {
				item.tags.push(tag);
			}
		}
	}

	// Full Text PDF attachment and Snapshot
	item.attachments = (item.attachments || []).filter(att => att.mimeType !== 'application/pdf' && att.title !== 'Snapshot');

	// The site's citation_pdf_url redirects with HTTP 302 back to HTML.
	// The real PDF download endpoint is always /<type>/<id>/download.
	var pdfUrl;
	var m = url.match(/^(https?:\/\/[^/]+)\/(book|book-chapter|article)\/(\d+)/i);
	if (m) {
		pdfUrl = `${m[1]}/${m[2]}/${m[3]}/download`;
	}
	else {
		var downloadLink = doc.querySelector('.section__buttons a[href$="/download"], a.btn-download[href$="/download"]')
			|| doc.querySelector('a[href*="/download"]:not([href*="/bib/"]):not([href*="/ris/"])');
		if (downloadLink && downloadLink.href) {
			pdfUrl = downloadLink.href;
		}
	}

	if (pdfUrl) {
		item.attachments.push({
			title: 'Full Text PDF',
			mimeType: 'application/pdf',
			url: pdfUrl
		});
	}
	else {
		item.attachments.push({
			title: 'Snapshot',
			document: doc
		});
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://elibrary.duncker-humblot.com/book/64096/kampfsport-im-recht",
		"items": [
			{
				"itemType": "book",
				"title": "Kampfsport im Recht: Notwehr- und Haftungsfragen",
				"creators": [
					{
						"firstName": "Michael",
						"lastName": "Walkusz",
						"creatorType": "author"
					}
				],
				"date": "2026-03-04",
				"ISBN": "9783428597185",
				"abstractNote": "Diese Forschungsarbeit untersucht Unterschiede bei der sowohl zivil-, als auch strafrechtlichen Beurteilung von Selbstverteidigungshandlungen zwischen Kampfsportpersonen und solchen Menschen, welche keinen Kampfsport betreiben. Nach vorausgehender Darstellung des aktuellen Forschungsstandes der Sportwissenschaften, Physiologie und (Polizei-)Psychologie zu menschlichen Handlungsmöglichkeiten in Angst- und Stresssituationen werden die rechtlichen Grenzen zulässiger Verteidigung für Kampfsportausübende im Rahmen des Notwehrrechts analysiert. Anschließend wird geprüft, ob für Kampfsportpersonen im Bereich von Verschulden und Schuld strengere Maßstäbe anzulegen sind. Dabei werden Besonderheiten bei Fahrlässigkeit, Erlaubnistatumstandsirrtum, Erlaubnisirrtum, Notwehrexzess sowie § 35 StGB untersucht. Bei den beiden zuletzt genannten Schuldausschlussgründen erfolgt zudem eine allgemeine Prüfung, ob diese auf den zivilrechtlichen Verschuldensbegriff übertragbar sind.",
				"edition": "1",
				"language": "de",
				"libraryCatalog": "Duncker & Humblot eLibrary",
				"numPages": "234",
				"publisher": "Duncker & Humblot",
				"series": "Beiträge zum Sportrecht",
				"seriesNumber": "71",
				"shortTitle": "Kampfsport im Recht",
				"url": "https://elibrary.duncker-humblot.com/book/64096/kampfsport-im-recht",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Combat sports & self-defence"
					},
					{
						"tag": "Criminal law: procedure & offences"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://elibrary.duncker-humblot.com/book-chapter/1720/von-der-schaffung-des-menschen-zum-sieg-des-neuen-menschen-im-weltsport",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Von der Schaffung des Menschen zum Sieg des „Neuen Menschen“ im Weltsport?: Zur weltgeschichtlichen Funktion der Körperkultur in Sportgeschichtslehrmitteln der späten Sowjetunion (1956-1975)",
				"creators": [
					{
						"firstName": "Stefan",
						"lastName": "Rohdewald",
						"creatorType": "author"
					},
					{
						"firstName": "Arié",
						"lastName": "Malz",
						"creatorType": "editor"
					},
					{
						"firstName": "Stefan",
						"lastName": "Rohdewald",
						"creatorType": "editor"
					},
					{
						"firstName": "Stefan",
						"lastName": "Wiederkehr",
						"creatorType": "editor"
					}
				],
				"date": "2007",
				"ISBN": "9783886404148",
				"bookTitle": "Sport zwischen Ost und West",
				"language": "de",
				"libraryCatalog": "Duncker & Humblot eLibrary",
				"pages": "327-347",
				"publisher": "fibre Verlag",
				"series": "Einzelveröffentlichungen des Deutschen Historischen Instituts Warschau",
				"seriesNumber": "16",
				"shortTitle": "Von der Schaffung des Menschen zum Sieg des „Neuen Menschen“ im Weltsport?",
				"url": "https://elibrary.duncker-humblot.com/book-chapter/1720/von-der-schaffung-des-menschen-zum-sieg-des-neuen-menschen-im-weltsport",
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
		"url": "https://elibrary.duncker-humblot.com/book-chapter/1708/sport-zwischen-ost-und-west-eine-kurze-einfuhrung",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Sport zwischen Ost und West: Eine kurze Einführung",
				"creators": [
					{
						"firstName": "Arié",
						"lastName": "Malz",
						"creatorType": "author"
					},
					{
						"firstName": "Stefan",
						"lastName": "Rohdewald",
						"creatorType": "author"
					},
					{
						"firstName": "Stefan",
						"lastName": "Wiederkehr",
						"creatorType": "author"
					},
					{
						"firstName": "Arié",
						"lastName": "Malz",
						"creatorType": "editor"
					},
					{
						"firstName": "Stefan",
						"lastName": "Rohdewald",
						"creatorType": "editor"
					},
					{
						"firstName": "Stefan",
						"lastName": "Wiederkehr",
						"creatorType": "editor"
					}
				],
				"date": "2007",
				"ISBN": "9783886404148",
				"bookTitle": "Sport zwischen Ost und West",
				"language": "de",
				"libraryCatalog": "Duncker & Humblot eLibrary",
				"pages": "11-52",
				"publisher": "fibre Verlag",
				"series": "Einzelveröffentlichungen des Deutschen Historischen Instituts Warschau",
				"seriesNumber": "16",
				"shortTitle": "Sport zwischen Ost und West",
				"url": "https://elibrary.duncker-humblot.com/book-chapter/1708/sport-zwischen-ost-und-west-eine-kurze-einfuhrung",
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
		"url": "https://elibrary.duncker-humblot.com/book-chapter/2352/einfuhrung",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Einführung",
				"creators": [
					{
						"firstName": "Heinrich",
						"lastName": "de Wall",
						"creatorType": "author"
					},
					{
						"firstName": "Heinrich",
						"lastName": "de Wall",
						"creatorType": "editor"
					}
				],
				"date": "2026-05-20",
				"ISBN": "9783428591664",
				"bookTitle": "Herrschaft, Krieg und Frieden in der Staatslehre der Frühen Neuzeit",
				"language": "de",
				"libraryCatalog": "Duncker & Humblot eLibrary",
				"pages": "7-16",
				"publisher": "Duncker & Humblot",
				"series": "Historische Forschungen",
				"seriesNumber": "126",
				"url": "https://elibrary.duncker-humblot.com/book-chapter/2352/einfuhrung",
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
		"url": "https://elibrary.duncker-humblot.com/article/73094/die-weltlage-und-die-lust-am-sport",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Die Weltlage und die Lust am Sport",
				"creators": [
					{
						"firstName": "Urs",
						"lastName": "Scherrer",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"DOI": "10.3790/cas.20.2.2",
				"issue": "2",
				"language": "de",
				"libraryCatalog": "Duncker & Humblot eLibrary",
				"pages": "2-3",
				"publicationTitle": "Causa Sport",
				"url": "https://elibrary.duncker-humblot.com/article/73094/die-weltlage-und-die-lust-am-sport",
				"volume": "20",
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
		"url": "https://elibrary.duncker-humblot.com/search?keywords=sport&search_param=title&type=any",
		"items": "multiple"
	}
]
/** END TEST CASES **/
