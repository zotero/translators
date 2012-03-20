{
	"translatorID": "9932d1a7-cc6d-4d83-8462-8f6658b13dc0",
	"label": "Biblio.com",
	"creator": "Adam Crymble, Michael Berkowitz, and Sebastian Karcher",
	"target": "^https://www\\.biblio\\.com/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2012-03-19 12:46:50"
}

function detectWeb(doc, url) {
	if (doc.location.href.match("bookseller_search") || doc.location.href.match("bookstores") || doc.location.href.match("textbooks")) {
		
	} else if (doc.location.href.match("search")) {
		return "multiple";
	} else if (doc.location.href.match("books")) {
		return "book";
	}
}

//Biblio.com translator. Code by Adam Crymble.

function associateData (newItem, dataTags, field, zoteroField) {
	if (dataTags[field]) {
		newItem[zoteroField] = dataTags[field];
	}
}

function scrape(doc, url) {

	var dataTags = new Object();
	var contents = new Array();
	var multiAuthors = new Array();
	var fieldTitle;
	var author1;
	
	var newItem = new Zotero.Item("book");

	var content = doc.evaluate('//ul[@class="bd-details-list"]/li', doc, null, XPathResult.ANY_TYPE,  null);
	var xPathCount = doc.evaluate('count (//ul[@class="bd-details-list"]/li)', doc, null, XPathResult.ANY_TYPE,  null);
	
	for (i=0; i<xPathCount.numberValue; i++) {	 	
	 			
	 		contents = content.iterateNext().textContent.split(": ");
	 		if (contents.length>1){
	 		fieldTitle = contents[0].replace(/\s*/g, '');
	 		dataTags[fieldTitle] = contents[1].replace(/^\s*|\s*$/g, '');}
	 	}

	//Authors
	if (doc.evaluate('//h2', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		var authors = doc.evaluate('//h2', doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
		if (authors.match(/\w/)) {
			authors = authors.replace(/^\s*by/, "");
			multiAuthors = authors.split(";");
			for each (var aut in multiAuthors) {
				newItem.creators.push(Zotero.Utilities.cleanAuthor(aut, "author", aut.match(/,/)));
			}
		}
	}
	
	//extra
	if (dataTags["Quantityavailable"]) {
		newItem.extra = "Quantity Available: " + dataTags["Quantityavailable"];
	}

	associateData (newItem, dataTags, "Publisher", "publisher");
	associateData (newItem, dataTags, "Place", "place");
	associateData (newItem, dataTags, "Datepublished", "date");
	associateData (newItem, dataTags, "ISBN10", "ISBN");
	associateData (newItem, dataTags, "ISBN13", "ISBN");
	associateData (newItem, dataTags, "Pages", "pages");
	associateData (newItem, dataTags, "Edition", "edition");

	newItem.title = doc.evaluate('//h1', doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent.replace(/^\s*|\s&+/g, '');
	newItem.url = doc.location.href;
	newItem.complete();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var articles = new Array();
		var titles = doc.evaluate('//div[@class="search-result"]//h2/a', doc, null, XPathResult.ANY_TYPE, null);
		var next_title;
		while (next_title = titles.iterateNext()) {
			if (next_title.textContent.match(/\w/)) {
				items[next_title.href] = next_title.textContent;
			}
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape, function () {
				Zotero.done();
			});
			Zotero.wait();	
		});
	} else {
		scrape(doc, url);
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.biblio.com/search.php?keyisbn=dickens&stage=1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.biblio.com/books/29965287.html",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Charles",
						"lastName": "Dickens",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"publisher": "DeWolfe, Fiske & Co",
				"place": "Boston, USA",
				"date": "1909",
				"edition": "First American",
				"title": "Through The Year With Dickens. Compiled by his Eldest Daughter",
				"url": "http://www.biblio.com/books/29965287.html",
				"libraryCatalog": "Biblio.com",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/