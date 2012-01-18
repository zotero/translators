{
	"translatorID": "138de272-0d2a-4ab5-8cfb-0fd879958d04",
	"label": "AdvoCAT",
	"creator": "Adam Crymble",
	"target": "^https?://(142\\.57\\.32\\.51|library\\.lsuc\\.on\\.ca)",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"browserSupport": "gcs",
	"inRepository": true,
	"translatorType": 4,
	"lastUpdated": "2012-01-01 01:42:16"
}

function detectWeb(doc, url) {
	if (doc.location.href.match("Search_Code")) {
		return "multiple";
	} else if (doc.title.match("Record View")) {
		return "book";
	}
}

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
	var fieldTitle;
	
	var newItem = new Zotero.Item("book");

	var headers = doc.evaluate('//table[2]/tbody/tr/th', doc, nsResolver, XPathResult.ANY_TYPE, null);
	var xPathCount = doc.evaluate('count (//table[2]/tbody/tr/th)', doc, nsResolver, XPathResult.ANY_TYPE, null);
	var contents = doc.evaluate('//table[2]/tbody/tr/td', doc, nsResolver, XPathResult.ANY_TYPE, null);

	for (i=0; i<xPathCount.numberValue; i++) {	 	
	 			
	 		fieldTitle = headers.iterateNext().textContent.replace(/\s+/g, '');
	 		if (!fieldTitle.match(/\w/)) {
		 		fieldTitle = "Blank" + i;
	 		}
	 		 dataTags[fieldTitle] = Zotero.Utilities.cleanTags(contents.iterateNext().textContent.replace(/^\s*|\s*$/g, ''));
	 	}

	if (dataTags["MainAuthor:"]) {
		var author = dataTags["MainAuthor:"];
		if (author.match(", ") && !author.match(":")) {
			var authors = author.split(", ");
			author = authors[1] + " " + authors[0];
			newItem.creators.push(Zotero.Utilities.cleanAuthor(author, "author"));	
		} else {
			newItem.creators.push({lastName: author, creatorType: "creator"});			
		}
	}

	if (dataTags["Published:"]) {
	
		if (dataTags["Published:"].match(": ")) {
			var place1 = dataTags["Published:"].indexOf(": ");
			newItem.place = dataTags["Published:"].substr(0, place1);
			var publisher1 = dataTags["Published:"].substr(place1 + 2);
			
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
	associateData (newItem, dataTags, "Title:", "title");
	associateData (newItem, dataTags, "Database:", "repository");
	associateData (newItem, dataTags, "Description:", "pages");
	associateData (newItem, dataTags, "Edition:", "edition");

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
		
		var titles = doc.evaluate('//form[2]/table/tbody/tr/td[3]/a', doc, nsResolver, XPathResult.ANY_TYPE, null);
		
		var next_title;
		while (next_title = titles.iterateNext()) {
			items[next_title.href] = next_title.textContent;
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
		"url": "http://142.57.32.51/cgi-bin/Pwebrecon.cgi?v1=1&ti=1,1&Search%5FArg=constitution&Search%5FCode=GKEY%5E%2A&CNT=20&PID=VTZQazz8uq0pWFC1uMfb8w_qdLjM_&SEQ=20111019230725&SID=1",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Michael.",
						"lastName": "Dewing",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Municipalities, the constitution, and the Canadian federal system [electronic resource] / Michael Dewing, William R. Young, Erin Tolley.",
				"url": "http://142.57.32.51/cgi-bin/Pwebrecon.cgi?v1=1&ti=1,1&Search%5FArg=constitution&Search%5FCode=GKEY%5E%2A&CNT=20&PID=VTZQazz8uq0pWFC1uMfb8w_qdLjM_&SEQ=20111019230725&SID=1",
				"libraryCatalog": "LSUC Great Library",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/