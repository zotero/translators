{
	"translatorID": "1300cd65-d23a-4bbf-93e5-a3c9e00d1066",
	"label": "Primo",
	"creator": "Matt Burton, Avram Lyon, Etienne Cavalié, Rintze Zelle",
	"target": "/primo_library/|/nebis/|^https?://www\\.recherche-portal\\.ch/zbz/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2013-03-17 15:18:12"
}

/*
Supports Primo 2:
Université de Nice, France (http://catalogue.unice.fr/)  (looks like this is Primo3 now, too)
Supports Primo 3
Boston College (http://www.bc.edu/supersleuth),
Oxford Libraries (http://solo.ouls.ox.ac.uk/)
*/

function detectWeb(doc, url) {
		if (doc.evaluate('//span[contains(@class, "results_corner EXLResultsTitleCorner")]|//div[contains(@class, "EXLContent EXLBriefDisplay")]', doc, null, XPathResult.ANY_TYPE, null).iterateNext() ) { 
			//make sure there is a way to get to individual items:
			if (doc.evaluate('//h2[contains(@class, "EXLResultTitle")]/a/@href|//div[contains(@class, "EXLTabsRibbon")]//li[contains(@class,"EXLDetailsTab")]/a/@href', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) { 
				return 'multiple';
			}
		}
		else if (doc.evaluate('//div[contains(@class, "results2 EXLFullResultsHeader")]', doc, null, XPathResult.ANY_TYPE, null).iterateNext() ) { 
			return 'book';
		}
		else if (doc.evaluate('//div[contains(@class, "EXLContent EXLFullDisplay")]', doc, null, XPathResult.ANY_TYPE, null).iterateNext() ) { 
			return 'book';
		}
}

// There is code for handling RIS, but let's stick with PNX for now.

function doWeb(doc, url) {
	var links = new Array();
	
	if (detectWeb(doc,url) == 'multiple') {
			var items = new Object();
			var linkIterator = "";
			var titleIterator = "";
			if (doc.evaluate('//h2[contains(@class, "EXLResultTitle")]/a/@href', doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotLength == 0 && ZU.xpath(doc, '//div[contains(@class, "title")]/a/@href').length>0)
			{
				// Primo v2
				Z.debug("primo2")
				linkIterator = ZU.xpath(doc, '//div[contains(@class, "title")]/a/@href');
				titleIterator = ZU.xpath(doc, '//div[contains(@class, "title")]/a/span');
			}
			else if (ZU.xpath(doc, '//h2[contains(@class, "EXLResultTitle")]/a|//div[contains(@class, "EXLTabsRibbon")]//li[contains(@class,"EXLDetailsTab")]/a').length>0)
			{
				// Primo v3
			 	Z.debug("primo3")
				linkIterator = ZU.xpath(doc, '//h2[contains(@class, "EXLResultTitle")]/a[contains(@href, "display.do")]/@href');
				titleIterator = ZU.xpath(doc, '//h2[contains(@class, "EXLResultTitle")]');
				//if none or not all of the titles have valid links, we move to the details tab.
			 	if (titleIterator.length > linkIterator.length){
					linkIterator = ZU.xpath(doc, '//div[contains(@class, "EXLTabsRibbon")]//li[contains(@class,"EXLDetailsTab")]/a/@href'); 
				}
			}

			// try/catch for the case when there are no search results, let doc.evealuate fail quietly
			try {
				for (i in linkIterator) {
					var link = linkIterator[i];
					var title = titleIterator[i];
					// create an array containing the links and add '&showPnx=true' to the end
					var xmlLink =  Zotero.Utilities.trimInternal(link.textContent)+'&showPnx=true';
					//Zotero.debug(xmlLink);
					var title = Zotero.Utilities.trimInternal(title.textContent);
					items[xmlLink] = title;
				}

				Zotero.selectItems(items, function (items) {
					if (!items) {
						return true;
					}
					for (var i in items) {
						links.push(i);
					}
					Z.debug(links)
					ZU.doGet(links, scrape, function () {
						Zotero.done();
					});
					Zotero.wait();
				});
				
			} catch(e) {
				Zotero.debug("Search results contained zero items. "+e);
				return;
			}

	} else {
		links = url + '&showPnx=true';
		Zotero.Utilities.doGet(links, scrape, function () {
			Zotero.done();
		});
	}
}
	//Zotero.Utilities.HTTP.doGet(links, function(text) {
	
	function scrape(text){
	/* 
	some articles don't return data. I'm still trying to figure this out
	but in the meantime, might make sense to include something like:
	e.g. http://agama.bc.edu:1701/primo_library/libweb/action/display.do?tabs=detailsTab&ct=display&fn=search&doc=TN_jstor10.2307%2f20587179&indx=2&recIds=TN_jstor10.2307%2f20587179&recIdxs=1&elementId=1&renderMode=poppedOut&displayMode=full&frbrVersion=2&dscnt=1&vl%281UI0%29=contains&vl%28135627558UI0%29=any&scp.scps=scope%3A%28BCL%29%2Cprimo_central_multiple_fe&frbg=&tab=bclib_tab&dstmp=1341676297278&vl%28135627556UI1%29=all_items&srt=rank&mode=Basic&dum=true&vl%28freeText0%29=witch&vid=CLEAN
		if (text.length<10){
			return "false"
		}  */
		Z.debug(text);
		var parser = new DOMParser();
		var doc = parser.parseFromString(text, "text/xml");
		var itemType = ZU.xpathText(doc, '//display/type');
		if (itemType) itemType = itemType.toLowerCase();
		if (itemType == 'book' || itemType == 'books') {
			var item = new Zotero.Item("book");
		} else if (itemType == 'audio') {
			var item = new Zotero.Item("audioRecording");
		} else if (itemType == 'video') {
			var item = new Zotero.Item("videoRecording");
		} else if (itemType == 'report') {
			var item = new Zotero.Item("report");
		} else if (itemType == 'webpage') {
			var item = new Zotero.Item("webpage");
		} else if (itemType == 'article') {
			var item = new Zotero.Item("journalArticle");
		} else if (itemType == 'thesis') {
			var item = new Zotero.Item("thesis");
		} else if (itemType == 'map') {
			var item = new Zotero.Item("map");
		}else {
			var item = new Zotero.Item("document");
		}
		item.title = ZU.xpathText(doc, '//display/title');
		
		var creators;
		var contributors;
		if (ZU.xpathText(doc, '//display/creator')) {
			creators = ZU.xpath(doc, '//display/creator'); 
		}
		
		if (ZU.xpathText(doc, '//display/contributor')) {
			contributors = ZU.xpath(doc, '//display/contributor'); 
		}
		
		if (!creators && contributors) { // <creator> not available using <contributor> as author instead
			creators = contributors;
			contributors = null;
		}
		
		if (!creators && ! contributors){
			creators = ZU.xpath(doc, '//addata/addau')
		}
		
		for (i in creators) {
			if (creators[i]) {
				var creator  = creators[i].textContent.split(/\s*;\s*/);
				for (j in creator){
					creator[j] = creator[j].replace(/\d{4}-(\d{4})?/g, '');
					item.creators.push(Zotero.Utilities.cleanAuthor(creator[j], "author", true));
				}			
			}
		}
		
		for (i in contributors) {
			if (contributors[i]) {
				var contributor = contributors[i].textContent.split(/\s*;\s*/);
				for (j in contributor){
				contributor[j] = contributor[j].replace(/\d{4}-(\d{4})?/g, '');
				item.creators.push(Zotero.Utilities.cleanAuthor(contributor[j], "contributor", true));
				}			
			}
		}
		//PNX doesn't do well with institutional authors; This isn't perfect, but it helps:
		for (i in item.creators){
			if (!item.creators[i].firstName){
				item.creators[i].fieldMode=1;
			}
		}
		
		if (ZU.xpathText(doc, '//display/publisher') !== null){
		var pubplace = ZU.xpathText(doc, '//display/publisher').split(" : ");
		}
		if (pubplace && pubplace[1]) {
			item.place = pubplace[0].replace(/,\s*c?\d+|[\(\)\[\]]|(\.\s*)?/g, "");
			item.publisher = pubplace[1].replace(/,\s*c?\d+|[\(\)\[\]]|(\.\s*)?/g, "");
		} else if (pubplace) {
			item.publisher = pubplace[0].replace(/,\s*c?\d+|[\(\)\[\]]|(\.\s*)?/g, "");
		}
		
		var date;
		if (date = ZU.xpathText(doc, '//display/creationdate|//search/creationdate')) {
			if (date.match(/\d+/)) item.date = date.match(/\d+/)[0];
		}
		
		// the three letter ISO codes that should be in the language field work well:
		var language;
		if (language = ZU.xpathText(doc, '//display/language')) {
				item.language = language;
		}
		
		var pages;
		if (pages = ZU.xpathText(doc, '//display/format')) {
			if (pages.match(/[0-9]+/)) {
				pages = pages.replace(/[\(\)\[\]]/g, "").match(/[0-9]+/);
				item.pages = item.numPages = pages[0];
			}
		}
	
		// The identifier field is supposed to have standardized format, but
		// the super-tolerant idCheck should be better than a regex.
		// (although note that it will reject invalid ISBNs)
		var locators;
		if (locators = ZU.xpathText(doc, '//display/identifier')) {
			locators = idCheck(locators);
			if (locators.isbn10) item.ISBN = locators.isbn10;
			if (locators.isbn13) item.ISBN = locators.isbn13;
			if (locators.issn) item.ISSN = locators.issn;
		}
		
		var edition;
		if (edition = ZU.xpathText(doc, '//display/edition')) {
			item.edition = edition;
		}
		
		var subject, j;
		if (subject = ZU.xpath(doc, '//search/subject')) {
			for (var i in subject) {
				j = parseInt(i) + 1;
				item.tags.push(ZU.xpathText(doc, '//search/subject['+j+']'));
			}
		}

		// does callNumber get stored anywhere else in the xml?
		var callNumber;
		if (callNumber = ZU.xpathText(doc, '//enrichment/classificationlcc')) {
			item.callNumber = callNumber;
		}
		
		item.complete();
		
	}

/* The next two functions are logic that could be bundled away into the translator toolkit. */

// Implementation of ISBN and ISSN check-digit verification
// Based on ISBN Users' Manual (http://www.isbn.org/standards/home/isbn/international/html/usm4.htm)
// and the Wikipedia treatment of ISBN (http://en.wikipedia.org/wiki/International_Standard_Book_Number)
// and the Wikipedia treatment of ISSN (http://en.wikipedia.org/wiki/International_Standard_Serial_Number)

// This will also check ISMN validity, although it does not distinguish from their
// neighbors in namespace, ISBN-13. It does not handle pre-2008 M-prefixed ISMNs; see
// http://en.wikipedia.org/wiki/International_Standard_Music_Number

// This does not validate multiple identifiers in one field,
// but it will gracefully ignore all non-number detritus,
// such as extraneous hyphens, spaces, and comments.

// It currently maintains hyphens in non-initial and non-final position,
// discarding consecutive ones beyond the first as well.

// It also adds the customary hyphen to valid ISSNs.

// Takes the first 8 valid digits and tries to read an ISSN,
// takes the first 10 valid digits and tries to read an ISBN 10,
// and takes the first 13 valid digits to try to read an ISBN 13
// Returns an object with three attributes:
// 	"issn" 
// 	"isbn10"
// 	"isbn13"
// Each will be set to a valid identifier if found, and otherwise be a
// boolean false.

// There could conceivably be a valid ISBN-13 with an ISBN-10
// substring; this should probably be interpreted as the latter, but it is a
// client UI issue.
idCheck = function(isbn) {
	// For ISBN 10, multiple by these coefficients, take the sum mod 11
	// and subtract from 11
	var isbn10 = [10, 9, 8, 7, 6, 5, 4, 3, 2];

	// For ISBN 13, multiple by these coefficients, take the sum mod 10
	// and subtract from 10
	var isbn13 = [1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3];

	// For ISSN, multiply by these coefficients, take the sum mod 11
	// and subtract from 11
	var issn = [8, 7, 6, 5, 4, 3, 2];

	// We make a single pass through the provided string, interpreting the
	// first 10 valid characters as an ISBN-10, and the first 13 as an
	// ISBN-13. We then return an array of booleans and valid detected
	// ISBNs.

	var j = 0;
	var sum8 = 0;
	var num8 = "";
	var sum10 = 0;
	var num10 = "";
	var sum13 = 0;
	var num13 = "";
	var chars = [];

	for (var i=0; i < isbn.length; i++) {
		if (isbn.charAt(i) == " ") {
			// Since the space character evaluates as a number,
			// it is a special case.
		} else if (j > 0 && isbn.charAt(i) == "-" && isbn.charAt(i-1) != "-") {
			// Preserve hyphens, except in initial and final position
			// Also discard consecutive hyphens
			if(j < 7) num8 += "-";
			if(j < 10) num10 += "-";
			if(j < 13) num13 += "-";
		} else if (j < 7 && ((isbn.charAt(i) - 0) == isbn.charAt(i))) {
			sum8 += isbn.charAt(i) * issn[j];
			sum10 += isbn.charAt(i) * isbn10[j];
			sum13 += isbn.charAt(i) * isbn13[j];
			num8 += isbn.charAt(i);
			num10 += isbn.charAt(i);
			num13 += isbn.charAt(i);
			j++;
		} else if (j == 7 &&
			(isbn.charAt(i) == "X" || isbn.charAt(i) == "x" ||
				((isbn.charAt(i) - 0) == isbn.charAt(i)))) {
			// In ISSN, an X represents the check digit "10".
			if(isbn.charAt(i) == "X" || isbn.charAt(i) == "x") {
				var check8 = 10;
				num8 += "X";
			} else {
				var check8 = isbn.charAt(i);
				sum10 += isbn.charAt(i) * isbn10[j];
				sum13 += isbn.charAt(i) * isbn13[j];
				num8 += isbn.charAt(i);
				num10 += isbn.charAt(i);
				num13 += isbn.charAt(i);
				j++;
			}
		} else if (j < 9 && ((isbn.charAt(i) - 0) == isbn.charAt(i))) {
			sum10 += isbn.charAt(i) * isbn10[j];
			sum13 += isbn.charAt(i) * isbn13[j];
			num10 += isbn.charAt(i);
			num13 += isbn.charAt(i);
			j++;
		} else if (j == 9 &&
			(isbn.charAt(i) == "X" || isbn.charAt(i) == "x" ||
				((isbn.charAt(i) - 0) == isbn.charAt(i)))) {
			// In ISBN-10, an X represents the check digit "10".
			if(isbn.charAt(i) == "X" || isbn.charAt(i) == "x") {
				var check10 = 10;
				num10 += "X";
			} else {
				var check10 = isbn.charAt(i);
				sum13 += isbn.charAt(i) * isbn13[j];
				num10 += isbn.charAt(i);
				num13 += isbn.charAt(i);
				j++;
			}
		} else if(j < 12 && ((isbn.charAt(i) - 0) == isbn.charAt(i))) {
			sum13 += isbn.charAt(i) * isbn13[j];
			num13 += isbn.charAt(i);
			j++;
		} else if (j == 12 && ((isbn.charAt(i) - 0) == isbn.charAt(i))) {
			var check13 = isbn.charAt(i);
			num13 += isbn.charAt(i);
		}
	}
	var valid8  = ((11 - sum8 % 11) % 11) == check8;
	var valid10 = ((11 - sum10 % 11) % 11) == check10;
	var valid13 = (10 - sum13 % 10 == check13);
	var matches = false;
	
	// Since ISSNs have a standard hyphen placement, we can add a hyphen
	if (valid8 && (matches = num8.match(/([0-9]{4})([0-9]{3}[0-9Xx])/))) {
		num8 = matches[1] + '-' + matches[2];
	} 

	if(!valid8) {num8 = false};
	if(!valid10) {num10 = false};
	if(!valid13) {num13 = false};
	return {"isbn10" : num10, "isbn13" : num13, "issn" : num8};
}
/** BEGIN TEST CASES **/
var testCases = []
/** END TEST CASES **/