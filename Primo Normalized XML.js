{
	"translatorID": "efd737c9-a227-4113-866e-d57fbc0684ca",
	"label": "Primo Normalized XML",
	"creator": "Philipp Zumstein",
	"target": "xml",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"configOptions": {
		"dataMode": "xml/dom"
	},
	"inRepository": true,
	"translatorType": 1,
	"lastUpdated": "2025-05-15 13:15:40"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Philipp Zumstein
	
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


function detectImport() {
	var text = Zotero.read(1000);
	return text.includes("http://www.exlibrisgroup.com/xsd/primo/primo_nm_bib");
}


function doImport() {
	var doc = Zotero.getXML();
	var ns = {
		p: 'http://www.exlibrisgroup.com/xsd/primo/primo_nm_bib',
		sear: 'http://www.exlibrisgroup.com/xsd/jaguar/search'
	};

	var item = new Zotero.Item();
	var itemType = ZU.xpathText(doc, '//p:display/p:type', ns) || ZU.xpathText(doc, '//p:facets/p:rsrctype', ns) || ZU.xpathText(doc, '//p:search/p:rsrctype', ns);
	if (!itemType) {
		throw new Error('Could not locate item type');
	}

	switch (itemType.toLowerCase()) {
		case 'book':
		case 'buch':
		case 'ebook':
		case 'pbook':
		case 'pbooks':
		case 'print_book':
		case 'books':
		case 'score':
		case 'journal':		// as long as we don't have a periodical item type;
			item.itemType = "book";
			break;
		case 'book_chapter':
			item.itemType = "bookSection";
			break;
		case 'audio':
		case 'sound_recording':
			item.itemType = "audioRecording";
			break;
		case 'video':
		case 'dvd':
			item.itemType = "videoRecording";
			break;
		case 'computer_file':
			item.itemType = "computerProgram";
			break;
		case 'report':
			item.itemType = "report";
			break;
		case 'webpage':
			item.itemType = "webpage";
			break;
		case 'article':
		case 'review':
			item.itemType = "journalArticle";
			break;
		case 'thesis':
		case 'dissertation':
			item.itemType = "thesis";
			break;
		case 'archive_manuscript':
		case 'object':
			item.itemType = "manuscript";
			break;
		case 'map':
			item.itemType = "map";
			break;
		case 'reference_entry':
			item.itemType = "encyclopediaArticle";
			break;
		case 'image':
			item.itemType = "artwork";
			break;
		case 'newspaper_article':
			item.itemType = "newspaperArticle";
			break;
		case 'conference_proceeding':
			item.itemType = "conferencePaper";
			break;
		default:
			item.itemType = "document";
			var risType = ZU.xpathText(doc, '//p:addata/p:ristype', ns);
			if (risType) {
				switch (risType.toUpperCase()) {
					case 'THES':
						item.itemType = "thesis";
						break;
				}
			}
	}

	item.title = ZU.xpathText(doc, '//p:display/p:title', ns);
	if (item.title) {
		item.title = ZU.unescapeHTML(item.title);
		item.title = item.title.replace(/\s*:/, ":")
			// Remove anything between square brackets
			// generally type: electronic resource, music			
			.replace(/\s\[[^\]]*\]\s?, '')
			// Remove everything after a slash in the title -
			// generally authorship information
			.replace(/ \/ [^/]+$/, '');
	}
	var creators = ZU.xpath(doc, '//p:display/p:creator', ns);
	var contributors = ZU.xpath(doc, '//p:display/p:contributor', ns);
	if (!creators.length && contributors.length) {
		// <creator> not available using <contributor> as author instead
		creators = contributors;
		contributors = [];
	}

	// //addata/au is great because it lists authors in last, first format,
	// but it can also have a bunch of junk. We'll use it to help split authors
	var splitGuidance = {};
	var addau = ZU.xpath(doc, '//p:addata/p:addau|//p:addata/p:au', ns);
	for (let i = 0; i < addau.length; i++) {
		var author = stripAuthor(addau[i].textContent);
		if (author.includes(',')) {
			var splitAu = author.split(',');
			if (splitAu.length > 2) continue;
			var name = splitAu[1].trim().toLowerCase() + ' '
				+ splitAu[0].trim().toLowerCase();
			splitGuidance[name.replace(/\./g, "")] = author;
		}
	}

	fetchCreators(item, creators, 'author', splitGuidance);
	fetchCreators(item, contributors, 'contributor', splitGuidance);

	item.place = ZU.xpathText(doc, '//p:addata/p:cop', ns);
	var publisher = ZU.xpathText(doc, '//p:addata/p:pub', ns);
	if (!publisher) publisher = ZU.xpathText(doc, '//p:display/p:publisher', ns);
	if (publisher) {
		publisher = publisher.replace(/,\s*c?\d+|[()[\]]/g, "");
		item.publisher = publisher.replace(/^\s*"|,?"\s*$/g, '');
		var pubplace = ZU.unescapeHTML(publisher).split(" : ");

		if (pubplace && pubplace[1]) {
			var possibleplace = pubplace[0];
			if (!item.place) {
				item.publisher = pubplace[1].replace(/^\s*"|,?"\s*$/g, '');
				item.place = possibleplace;
			}
			if (item.place && item.place == possibleplace) {
				item.publisher = pubplace[1].replace(/^\s*"|,?"\s*$/g, '');
			}
		}
		// sometimes the place is also part of the publisher string
		// e.g. "Tübingen Mohr Siebeck"
		if (item.place) {
			var contained = item.publisher.indexOf(item.place);
			if (contained === 0) {
				item.publisher = item.publisher.substring(item.place.length);
			}
		}
	}
	var date = ZU.xpathText(doc, '//p:addata/p:date', ns)
		|| ZU.xpathText(doc, '//p:addata/p:risdate', ns);
	if (date && /\d\d\d\d\d\d\d\d/.test(date)) {
		item.date = date.substring(0, 4) + '-' + date.substring(4, 6) + '-' + date.substring(6, 8);
	}
	else {
		date = ZU.xpathText(doc, '//p:display/p:creationdate|//p:search/p:creationdate', ns);
		var m;
		if (date && (m = date.match(/\d+/))) {
			item.date = m[0];
		}
	}

	// the three letter ISO codes that should be in the language field work well:
	item.language = ZU.xpathText(doc, '(//p:display/p:language|//p:facets/p:language)[1]', ns);

	var pages = ZU.xpathText(doc, '//p:display/p:format', ns);
	if (item.itemType == 'book' && pages && pages.search(/\d/) != -1) {
		item.numPages = extractNumPages(pages);
	}

	item.series = ZU.xpathText(doc, '(//p:addata/p:seriestitle)[1]', ns);
	if (item.series) {
		let m = item.series.match(/^(.*);\s*(\d+)/);
		if (m) {
			item.series = m[1].trim();
			item.seriesNumber = m[2];
		}
	}

	var isbn = ZU.xpathText(doc, '//p:addata/p:isbn', ns);
	var issn = ZU.xpathText(doc, '//p:addata/p:issn', ns);
	if (isbn) {
		item.ISBN = ZU.cleanISBN(isbn);
	}

	if (issn) {
		item.ISSN = ZU.cleanISSN(issn);
	}

	// Try this if we can't find an isbn/issn in addata
	// The identifier field is supposed to have standardized format, but
	// the super-tolerant idCheck should be better than a regex.
	// (although note that it will reject invalid ISBNs)
	var locators = ZU.xpathText(doc, '//p:display/p:identifier', ns);
	if (!(item.ISBN || item.ISSN) && locators) {
		item.ISBN = ZU.cleanISBN(locators);
		item.ISSN = ZU.cleanISSN(locators);
	}

	item.edition = ZU.xpathText(doc, '//p:display/p:edition', ns);

	var subjects = ZU.xpath(doc, '//p:display/p:subject', ns);
	if (!subjects.length) {
		subjects = ZU.xpath(doc, '//p:search/p:subject', ns);
	}

	for (let i = 0, n = subjects.length; i < n; i++) {
		let tagChain = ZU.trimInternal(subjects[i].textContent);
		// Split chain of tags, e.g. "Deutschland / Gerichtsverhandlung / Schallaufzeichnung / Bildaufzeichnung"
		for (let tag of tagChain.split(/ (?:\/|--|;) /)) {
			item.tags.push(tag);
		}
	}

	item.abstractNote = ZU.xpathText(doc, '//p:display/p:description', ns)
		|| ZU.xpathText(doc, '//p:addata/p:abstract', ns);
	if (item.abstractNote) item.abstractNote = ZU.unescapeHTML(item.abstractNote);

	item.DOI = ZU.xpathText(doc, '//p:addata/p:doi', ns);
	item.issue = ZU.xpathText(doc, '//p:addata/p:issue', ns);
	item.volume = ZU.xpathText(doc, '//p:addata/p:volume', ns);
	item.publicationTitle = ZU.xpathText(doc, '//p:addata/p:jtitle', ns);

	if (item.itemType != 'book') {
		item.bookTitle = ZU.xpathText(doc, '//p:addata/p:btitle', ns);
	}

	var startPage = ZU.xpathText(doc, '//p:addata/p:spage', ns);
	var endPage = ZU.xpathText(doc, '//p:addata/p:epage', ns);
	var overallPages = ZU.xpathText(doc, '//p:addata/p:pages', ns);
	
	var pageRangeTypes = ["journalArticle", "magazineArticle", "newspaperArticle", "dictionaryEntry", "encyclopediaArticle", "conferencePaper"];
	if (startPage && endPage) {
		item.pages = startPage + '–' + endPage;
	}
	else if (overallPages) {
		if (pageRangeTypes.includes(item.itemType)) {
			item.pages = overallPages;
		}
		else {
			item.numPages = overallPages;
		}
	}
	else if (startPage) {
		item.pages = startPage;
	}
	else if (endPage) {
		item.pages = endPage;
	}

	// these are actual local full text links (e.g. to google-scanned books)
	// e.g http://solo.bodleian.ox.ac.uk/OXVU1:LSCOP_OX:oxfaleph013370702
	var URL = ZU.xpathText(doc, '//p:links/p:linktorsrc', ns);
	if (URL && URL.search(/\$\$U.+\$\$/) != -1) {
		item.url = URL.match(/\$\$U(.+?)\$\$/)[1];
	}

	// add finding aids as links
	var findingAid = ZU.xpathText(doc, '//p:links/p:linktofa', ns);
	if (findingAid && findingAid.search(/\$\$U.+\$\$/) != -1) {
		item.attachments.push({ url: findingAid.match(/\$\$U(.+?)\$\$/)[1], title: "Finding Aid", snapshot: false });
	}
	// get the best call Number; sequence recommended by Harvard University Library
	var callNumber = ZU.xpath(doc, '//p:browse/p:callnumber', ns);
	var callArray = [];
	for (let i = 0; i < callNumber.length; i++) {
		if (callNumber[i].textContent.search(/\$\$D.+\$/) != -1) {
			callArray.push(callNumber[i].textContent.match(/\$\$D(.+?)\$/)[1]);
		}
	}
	/* 2024-09 : adding a test on p:delivery/p:bestlocation/p:callnumber to get Callnumber from Primo VE pages like https://bcujas-catalogue.univ-paris1.fr/discovery/fulldisplay?context=L&vid=33CUJAS_INST:33CUJAS_INST&search_scope=MyInstitution&tab=LibraryCatalog&docid=alma990004764520107621 for example */
	if (!callArray.length) {
		callNumber = ZU.xpath(doc, '//p:display/p:availlibrary|//p:delivery/p:bestlocation/p:callNumber', ns);
		for (let i = 0; i < callNumber.length; i++) {
			let testCallNumberWithSubfields = callNumber[i].textContent.match(/\$\$2\(?(.+?)(?:\s*\))?\$/);
			if (testCallNumberWithSubfields) {
				callArray.push(testCallNumberWithSubfields[1]);
			} else {
				callArray.push(callNumber[i].textContent);
			}
		}
	}

	if (callArray.length) {
		// remove duplicate call numbers
		callArray = dedupeArray(callArray);
		item.callNumber = callArray.join(", ");
	}
	else {
		ZU.xpathText(doc, '//p:enrichment/p:classificationlcc', ns);
	}

	// Harvard specific code, requested by Harvard Library:
	// Getting the library abbreviation properly,
	// so it's easy to implement custom code for other libraries, either locally or globally should we want to.
	var library;
	var source = ZU.xpathText(doc, '//p:control/p:sourceid', ns);
	if (source) {
		// The HVD library code is now preceded by $$V01 -- not seeing this in other catalogs like Princeton or UQAM
		// so making it optional
		library = source.match(/^(?:\$\$V)?(?:\d+)?(.+?)_/);
		if (library) library = library[1];
	}
	// Z.debug(library)
	if (library && library == "HVD") {
		if (ZU.xpathText(doc, '//p:display/p:lds01', ns)) {
			item.extra = "HOLLIS number: " + ZU.xpathText(doc, '//p:display/p:lds01', ns);
		}
		for (let lds03 of ZU.xpath(doc, '//p:display/p:lds03', ns)) {
			if (lds03.textContent.match(/href="(.+?)"/)) {
				item.attachments.push({
					url: lds03.textContent.match(/href="(.+?)"/)[1],
					title: "HOLLIS Permalink",
					snapshot: false
				});
			}
		}
	}
	// End Harvard-specific code
	item.complete();
}


function stripAuthor(str) {
	// e.g. Wheaton, Barbara Ketcham [former owner]$$QWheaton, Barbara Ketcham
	str = str.replace(/^(.*)\$\$Q(.*)$/, "$2");
	return str
		// Remove year
		.replace(/\s*,?\s*\(?\d{4}-?(\d{4}|\.{3})?\)?/g, '')
		// Remove creator type like (illustrator)
		.replace(/(\s*,?\s*[[(][^()]*[\])])+$/, '')
		// The full "continuous" name uses no separators, which need be removed
		// cf. "Luc, Jean André : de (1727-1817)"
		.replace(/\s*:\s+/, " ")
		// National Library of Russia adds metadata at the end of the author name,
		// prefixed by 'NLR10::'. Remove it.
		.replace(/\bNLR10::.*/, '')
		// Austrian Libraries add authority data at the end of the author name,
		// prefixed by '$$0'. Remove it.
		.replace(/\$\$0.*/, '');
}

function fetchCreators(item, creators, type, splitGuidance) {
	for (let i = 0; i < creators.length; i++) {
		var creator = ZU.unescapeHTML(creators[i].textContent).split(/\s*;\s*/);
		for (var j = 0; j < creator.length; j++) {
			var c = stripAuthor(creator[j]).replace(/\./g, "");
			c = ZU.cleanAuthor(
				splitGuidance[c.toLowerCase()] || c,
				type,
				true
			);

			if (!c.firstName) {
				delete c.firstName;
				c.fieldMode = 1;
			}

			item.creators.push(c);
		}
	}
}

function extractNumPages(str) {
	// Borrowed from Library Catalog (PICA). See #756
	// make sure things like 2 partition don't match, but 2 p at the end of the field do
	// f., p., and S. are "pages" in various languages
	// For multi-volume works, we expect formats like:
	//   x-109 p., 510 p. and X, 106 S.; 123 S.
	var numPagesRE = /\[?\b((?:[ivxlcdm\d]+[ \-,]*)+)\]?\s+[fps]\b/ig;
	var numPages = [];
	let m = numPagesRE.exec(str);
	if (m) {
		numPages.push(m[1].trim()
			.replace(/[ \-,]+/g, '+')
			.toLowerCase() // for Roman numerals
		);
	}
	return numPages.join('; ');
}

function dedupeArray(names) {
	// via http://stackoverflow.com/a/15868720/1483360
	return names.reduce(function (a, b) {
		if (!a.includes(b)) {
			a.push(b);
		}
		return a;
	}, []);
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
