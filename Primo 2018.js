{
	"translatorID": "cd669d1f-96b8-4040-aa36-48f843248399",
	"label": "Primo 2018",
	"creator": "Philipp Zumstein",
	"target": "/primo-explore/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-01-09 17:31:37"
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


// attr()/text() v2
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}


function detectWeb(doc, url) {
	var rows = doc.querySelectorAll('.urlToXmlPnx[data-url]');
	if (rows.length>=1) return "multiple";
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.urlToXmlPnx[data-url]');
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].dataset.url;
		let title = rows[i].parentNode.textContent;
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	Zotero.selectItems(getSearchResults(doc, false), function (items) {
		if (!items) {
			return true;
		}
		var articles = [];
		for (var i in items) {
			articles.push(i);
		}
		ZU.processDocuments(articles, scrape);
	});
}


function scrape(doc, pnxurl) {
	ZU.doGet(pnxurl, function(text) {
		text = text.replace(/\<\/?xml-fragment[^\>]*\>/g, "")
			.replace(/(<\/?)\w+:([^\>]*)/g, "$1$2") //remove namespaces
			//remove ns declarations - we don't need them and they break this
			.replace(/<[^>]+/g, function(m) {
				return m.replace(/\s+xmlns(?::\w+)?\s*=\s*(['"]).*?\1/ig, '');
			});
		//Z.debug(text);
		var parser = new DOMParser();
		var doc = parser.parseFromString(text, "text/xml");
		
		var item = new Zotero.Item();

		var itemType = ZU.xpathText(doc, '//display/type')  || ZU.xpathText(doc, '//facets/rsrctype') || ZU.xpathText(doc, '//search/rsrctype');
		if(!itemType) {
			throw new Error('Could not locate item type');
		}
		
		switch(itemType.toLowerCase()) {
			case 'book':
			case 'ebook':
			case 'pbook' :
			case 'books':
			case 'score':
			case 'journal':		//as long as we don't have a periodical item type;
	 			item.itemType = "book";
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
				var risType = ZU.xpathText(doc, '//addata/ristype');
				if (risType) {
					switch(risType.toUpperCase()) {
						case 'THES':
							item.itemType = "thesis";
							break;
					}
				}
		}
		
		item.title = ZU.xpathText(doc, '//display/title');
		if(item.title) {
			item.title = ZU.unescapeHTML(item.title);
			item.title = item.title.replace(/\s*:/, ":");
		}
		var creators = ZU.xpath(doc, '//display/creator');
		var contributors = ZU.xpath(doc, '//display/contributor');
		if(!creators.length && contributors.length) {
			// <creator> not available using <contributor> as author instead
			creators = contributors;
			contributors = [];
		}
		
		// //addata/au is great because it lists authors in last, first format,
		// but it can also have a bunch of junk. We'll use it to help split authors
		var splitGuidance = {};
		var addau = ZU.xpath(doc, '//addata/addau|//addata/au');
		for (var i=0; i<addau.length; i++) {
			var author = stripAuthor(addau[i].textContent);
			if (author.indexOf(',') != -1) {
				var splitAu = author.split(',');
				if (splitAu.length > 2) continue;
				var name = splitAu[1].trim().toLowerCase() + ' '
					+ splitAu[0].trim().toLowerCase();
				splitGuidance[name] = author;
			}
		}
		
		fetchCreators(item, creators, 'author', splitGuidance);
		fetchCreators(item, contributors, 'contributor', splitGuidance);
		
		item.place = ZU.xpathText(doc, '//addata/cop');
		var publisher = ZU.xpathText(doc, '//addata/pub');
		if(!publisher) publisher = ZU.xpathText(doc, '//display/publisher');
		if(publisher) {
			publisher = publisher.replace(/,\s*c?\d+|[\(\)\[\]]|(\.\s*)?/g, "");
			item.publisher = publisher.replace(/^\s*"|,?"\s*$/g, '');
			var pubplace = ZU.unescapeHTML(publisher).split(" : ");
	
			if(pubplace && pubplace[1]) {
				var possibleplace = pubplace[0];
				if(!item.place ) {
					item.publisher = pubplace[1].replace(/^\s*"|,?"\s*$/g, '');
					item.place = possibleplace;
				}
				if(item.place && item.place == possibleplace) {
					item.publisher = pubplace[1].replace(/^\s*"|,?"\s*$/g, '');
				}
			}
		}
		
		var date = ZU.xpathText(doc, '//display/creationdate|//search/creationdate');
		var m;
		if(date && (m = date.match(/\d+/))) {
			item.date = m[0];
		}
		
		// the three letter ISO codes that should be in the language field work well:
		item.language = ZU.xpathText(doc, '(//display/language|//facets/language)[1]');
		
		var pages = ZU.xpathText(doc, '//display/format');
		if(item.itemType == 'book' && pages && pages.search(/\d/) != -1) {
			item.numPages = extractNumPages(pages);
		}
		
		item.series = ZU.xpathText(doc, '(//addata/seriestitle)[1]');
	
		var isbn;
		var issn;
		if (isbn = ZU.xpathText(doc, '//addata/isbn')){
			item.ISBN = ZU.cleanISBN(isbn);
		}
		
		if (issn = ZU.xpathText(doc, '//addata/issn')){
			item.ISSN = ZU.cleanISSN(issn);
		}
		
		// Try this if we can't find an isbn/issn in addata
		// The identifier field is supposed to have standardized format, but
		// the super-tolerant idCheck should be better than a regex.
		// (although note that it will reject invalid ISBNs)
		var locators = ZU.xpathText(doc, '//display/identifier');
		if(!(item.ISBN || item.ISSN) && locators) {
			item.ISBN = ZU.cleanISBN(locators);
			item.ISSN = ZU.cleanISSN(locators);
		}
	
		item.edition = ZU.xpathText(doc, '//display/edition');
		
		var subjects = ZU.xpath(doc, '//search/subject');
		if(!subjects.length) {
			subjects = ZU.xpath(doc, '//display/subject');
		}
	
		for(var i=0, n=subjects.length; i<n; i++) {
			item.tags.push(ZU.trimInternal(subjects[i].textContent));
		}
		
		item.abstractNote = ZU.xpathText(doc, '//display/description')
			|| ZU.xpathText(doc, '//addata/abstract');
		if (item.abstractNote) item.abstractNote = ZU.unescapeHTML(item.abstractNote);
		
		item.DOI = ZU.xpathText(doc, '//addata/doi');
		item.issue = ZU.xpathText(doc, '//addata/issue');
		item.volume = ZU.xpathText(doc, '//addata/volume');
		item.publicationTitle = ZU.xpathText(doc, '//addata/jtitle');
		
		var startPage = ZU.xpathText(doc, '//addata/spage');
		var endPage = ZU.xpathText(doc, '//addata/epage');
		var overallPages = ZU.xpathText(doc, '//addata/pages');
		if (startPage && endPage){
			item.pages = startPage + '–' + endPage;
		} else if (overallPages) {
			item.pages = overallPages;
		} else if (startPage) {
			item.pages = startPage;
		} else if (endPage) {
			item.pages = endPage;
		}
		
		//these are actual local full text links (e.g. to google-scanned books)
		//e.g http://solo.bodleian.ox.ac.uk/OXVU1:LSCOP_OX:oxfaleph013370702
		var URL = ZU.xpathText(doc, '//links/linktorsrc');
		if (URL && URL.search(/\$\$U.+\$\$/) != -1) {
			item.url = URL.match(/\$\$U(.+?)\$\$/)[1];
		}
	
		//add finding aids as links
		var findingAid = ZU.xpathText(doc, '//links/linktofa');
		if (findingAid && findingAid.search(/\$\$U.+\$\$/) != -1) {
			item.attachments.push({url: findingAid.match(/\$\$U(.+?)\$\$/)[1], title: "Finding Aid", snapshot: false});
		}
		// get the best call Number; sequence recommended by Harvard University Library
		var callNumber = ZU.xpath(doc, '//browse/callnumber');
		var callArray = [];
		for (var i = 0; i<callNumber.length; i++) {
			if (callNumber[i].textContent.search(/\$\$D.+\$/) != -1) {
				callArray.push(callNumber[i].textContent.match(/\$\$D(.+?)\$/)[1]);
			}
		}
		if (!callArray.length) {
			callNumber = ZU.xpath(doc, '//display/availlibrary');
			for (var i = 0; i<callNumber.length; i++) {
				if (callNumber[i].textContent.search(/\$\$2.+\$/) != -1) {
					callArray.push(callNumber[i].textContent.match(/\$\$2\(?(.+?)(?:\s*\))?\$/)[1]);
				}
			}
		}
		if (callArray.length) {
			//remove duplicate call numbers
			callArray = dedupeArray(callArray);
			item.callNumber = callArray.join(", ");
		}
		else {
			ZU.xpathText(doc, '//enrichment/classificationlcc');
		}
	
		if (pnxurl) {
			item.libraryCatalog = pnxurl.match(/^https?:\/\/(.+?)\//)[1].replace(/\.hosted\.exlibrisgroup/, "");
		}
	
		//Harvard specific code, requested by Harvard Library:
		//Getting the library abbreviation properly,
		//so it's easy to implement custom code for other libraries, either locally or globally should we want to.
		var library;
		var source = ZU.xpathText(doc, '//control/sourceid');
		if (source) {
			library = source.match(/^(.+?)_/);
			if (library) library = library[1];
		}
		//Z.debug(library)
		if (library && library == "HVD") {
			if (ZU.xpathText(doc, '//display/lds01')) {
				item.extra = "HOLLIS number: " + ZU.xpathText(doc, '//display/lds01');
			}
			if (ZU.xpathText(doc, '//display/lds03')) {
				item.attachments.push({url: ZU.xpathText(doc, '//display/lds03'), title: "HOLLIS Permalink", snapshot: false});		
			}
		}
		//End Harvard-specific code
		item.complete();
	});
}




function stripAuthor(str) {
	return str
		// Remove year
		.replace(/\s*,?\s*\(?\d{4}-?(\d{4})?\)?/g, '')
		// Remove things like (illustrator). TODO: use this to assign creator type?
		.replace(/\s*,?\s*[\[\(][^()]*[\]\)]$/, '')
		// The full "continuous" name uses no separators, which need be removed
		// cf. "Luc, Jean André : de (1727-1817)"
		.replace(/\s*:\s+/, " ");
}

function fetchCreators(item, creators, type, splitGuidance) {
	for(var i=0; i<creators.length; i++) {
		var creator = ZU.unescapeHTML(creators[i].textContent).split(/\s*;\s*/);
		for(var j=0; j<creator.length; j++) {
			var c = stripAuthor(creator[j]);
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
	//make sure things like 2 partition don't match, but 2 p at the end of the field do
	// f., p., and S. are "pages" in various languages
	// For multi-volume works, we expect formats like:
	//   x-109 p., 510 p. and X, 106 S.; 123 S.
	var numPagesRE = /\[?\b((?:[ivxlcdm\d]+[ ,\-]*)+)\]?\s+[fps]\b/ig,
		numPages = [], m;
	while(m = numPagesRE.exec(str)) {
		numPages.push(m[1].trim()
			.replace(/[ ,\-]+/g,'+')
			.toLowerCase() // for Roman numerals
		);
	}
	return numPages.join('; ');
}

function dedupeArray(names) {
	//via http://stackoverflow.com/a/15868720/1483360
	return names.reduce(function(a,b){
		if(a.indexOf(b)<0) {
			a.push(b);
		}
		return a;
	},[]);
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://primo-qa.hosted.exlibrisgroup.com/primo-explore/search?query=any,contains,zotero&tab=everything&search_scope=TCCDALMA_EVERYTHING&vid=TCCDALMA&lang=en_US&offset=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://primo-qa.hosted.exlibrisgroup.com/primo-explore/fulldisplay?vid=TCCDALMA&search_scope=TCCDALMA_EVERYTHING&tab=everything&docid=TCCD_ALMA2136169630001641&lang=en_US&context=L&adaptor=Local%20Search%20Engine&isFrbr=true&query=any,contains,adam%20smith&sortby=rank&offset=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://primo-qa.hosted.exlibrisgroup.com/primo-explore/search?query=any,contains,mannheim&tab=everything&search_scope=TCCDALMA_EVERYTHING&vid=TCCDALMA&sortby=rank&lang=en_US",
		"items": "multiple"
	}
]
/** END TEST CASES **/
