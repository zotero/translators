{
	"translatorID": "45763818-8530-49c6-a069-34acdee1a096",
	"label": "National Library of New Zealand",
	"creator": "Adam Crymble",
	"target": "^https?://nlnzcat\\.natlib.\\govt\\.nz/cgi-bin/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-09 23:24:11"
}

function detectWeb(doc, url) {
	
	if (doc.title.match("Quick Record View")) {
		return "book";
	} else if (doc.title.match("Details Record View")) {
		return "book";
	} else if (doc.title.match("Catalogue Titles")) {
		return "multiple";
	}
}

//National Library of New Zealand translator. Code by Adam Crymble

function associateData (newItem, dataTags, field, zoteroField) {
	if (dataTags[field]) {
		newItem[zoteroField] = dataTags[field];
	}
}

function scrape(doc, url) {

	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;	
	
	var dataTags = new Object();
	var tagsContent = new Array();
	var headersArray = new Array();
	var contentsArray = new Array();
	var fieldTitle;
	var j = 0;
	
	var newItem = new Zotero.Item("book");

	var headers = doc.evaluate('//form/table/tbody/tr/th', doc, nsResolver, XPathResult.ANY_TYPE, null);
	var xPathCount = doc.evaluate('count (//form/table/tbody/tr/th)', doc, nsResolver, XPathResult.ANY_TYPE, null);
	var contents = doc.evaluate('//table[2]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;

	for (var i = 0; i < xPathCount.numberValue; i++) {
		fieldTitle = headers.iterateNext().textContent;
		if (fieldTitle.match(/\w/)) {
			headersArray.push(fieldTitle);
		}
	}
	
	for (var i = headersArray.length-1; i> -1; i--) {	 	
	
		var fieldIndex = contents.lastIndexOf(headersArray[i]);
		contentsArray.push(contents.substr(fieldIndex));
		contents = contents.substr(0, fieldIndex);
		
		fieldTitle = headersArray[i].replace(/\s+/g, '');
		
		dataTags[fieldTitle] = contentsArray[j].substr(headersArray[i].length).replace(/^\s*|\s+$/g, '');
		j++;		
	}
	
	if (dataTags["Author:"]) {
		var author = dataTags["Author:"];
		if (author.match(", ")) {
			var authors = author.split(", ");
			author = authors[1] + " " + authors[0];
			newItem.creators.push(Zotero.Utilities.cleanAuthor(author, "author"));	
		} else {
			newItem.creators.push({lastName: author, creatorType: "creator"});			
		}
	}

	if (dataTags["Publisher:"]) {
		if (dataTags["Publisher:"].match(": ")) {
			var place1 = dataTags["Publisher:"].indexOf(": ");
			newItem.place = dataTags["Publisher:"].substr(0, place1);
			var publisher1 = dataTags["Publisher:"].substr(place1 + 2);
			
			if (publisher1.match(", ")) {
				var date1 = publisher1.lastIndexOf(", ");
				newItem.date = publisher1.substr(date1 +2);
				newItem.publisher = publisher1.substr(0, date1);
			} else {
				newItem.publisher = publisher1;
			}
		} else {
			newItem.publisher = publisher1;
		}
	}
    if (dataTags["Title:"]){
    dataTags["Title:"]	= dataTags["Title:"].replace(/\/.+/, "")
    }
	if (dataTags["Subject:"]) {
		if (dataTags["Subject:"].match(/\n/)) {
			tagsContent = dataTags["Subject:"].split(/\n/)
			for (var i = 0; i < tagsContent.length; i++) {
		 			if (tagsContent[i].match(/\w/)) {
			 			newItem.tags[i] = tagsContent[i];
		 			}
	 			}
		} else {
			newItem.tags = dataTags["Subject:"]
		}
	}
	
	if (dataTags["LCSubject:"]) {
		if (dataTags["LCSubject:"].match(/\n/)) {
			tagsContent = dataTags["LCSubject:"].split(/\n/)
			var k = 0;
			for (var i = 0; i < tagsContent.length; i++) {
		 			if (tagsContent[i].match(/\w/)) {
			 			newItem.tags[k] = tagsContent[i];
			 			k++;
		 			}
	 			}
		} else {
			newItem.tags = dataTags["LCSubject:"]
		}
	}
if (dataTags["ISBN:"]){
	dataTags["ISBN:"] = dataTags["ISBN:"].replace(/\n.+/, "")
	
}
	associateData (newItem, dataTags, "Title:", "title");
	associateData (newItem, dataTags, "Description:", "pages");
	associateData (newItem, dataTags, "CallNumber:", "callNumber");
	associateData (newItem, dataTags, "Location:", "repository");
	associateData (newItem, dataTags, "ISBN:", "ISBN");
	newItem.url = doc.location.href;
	newItem.complete();
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	var articles = new Array();
	
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		
		var titles = doc.evaluate('//form/table/tbody/tr/td/a', doc, nsResolver, XPathResult.ANY_TYPE, null);
		
		var next_title;
		while (next_title = titles.iterateNext()) {
			if (next_title.textContent.match(/\w/)) {
				items[next_title.href] = next_title.textContent;
			}
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			articles.push(i);
		}
	} else {
		articles = [url];
	}
	Zotero.Utilities.processDocuments(articles, scrape, function() {Zotero.done();});
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://nlnzcat.natlib.govt.nz/cgi-bin/Pwebrecon.cgi?v1=1&ti=1,1&SEQ=20111110191728&Search%5FArg=argentina&SL=None&Search%5FCode=GKEY%5E%2A&CNT=25&PID=oz4cCqqjUc1Zay9PNLbkaR9likB0deo&SID=1",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Suzanne Paul.",
						"lastName": "Dell’Oro",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Argentina --Juvenile literature.",
					null,
					null,
					null,
					" Argentina."
				],
				"seeAlso": [],
				"attachments": [],
				"place": "Minneapolis, MN",
				"date": "c2009.",
				"publisher": "Lerner Publications",
				"title": "Argentina",
				"pages": "48 p. : col. ill., col. maps ; 22 x 25 cm.",
				"callNumber": "918.2 DEL",
				"ISBN": "9781580138178",
				"url": "http://nlnzcat.natlib.govt.nz/cgi-bin/Pwebrecon.cgi?v1=1&ti=1,1&SEQ=20111110191728&Search%5FArg=argentina&SL=None&Search%5FCode=GKEY%5E%2A&CNT=25&PID=oz4cCqqjUc1Zay9PNLbkaR9likB0deo&SID=1",
				"libraryCatalog": "Auckland Service Centre",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://nlnzcat.natlib.govt.nz/cgi-bin/Pwebrecon.cgi?Search_Arg=argentina&SL=None&Search_Code=GKEY%5E*&PID=Z6FqFuuAzWHIEHqgKOsR6K2TLcABf90&SEQ=20111110191018&CNT=25&HIST=1",
		"items": "multiple"
	}
]
/** END TEST CASES **/