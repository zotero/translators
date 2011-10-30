{
	"translatorID": "625c6435-e235-4402-a48f-3095a9c1a09c",
	"label": "DBLP Computer Science Bibliography",
	"creator": "Adam Crymble",
	"target": "^https?://(www\\.)?dblp\\.org",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-10-28 11:16:23"
}

function detectWeb(doc, url) {
	if (doc.title.match("journals")) {
		return "journalArticle";
	} else if (doc.title.match("conf")) {
		return "conferencePaper";
	} else if (doc.title.match("DBLP entry")) {
		return "bookSection";
	}
}


//DBLP Computer Science Database Translator. Code by Adam Crymble.
//Doesn't work for multiple entries. Site uses a different URL for the search and single entry. Multiple code attached as comment.

function associateData (newItem, dataTags, field, zoteroField) {
	if (dataTags[field]) {
		newItem[zoteroField] = dataTags[field];
	}
}

function scrape(doc, url) {

	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	} : null;	
	
	var dataTags = new Object();
	
	var mediaType = detectWeb(doc, url);
	
	if (mediaType == "bookSection") {
		var newItem = new Zotero.Item("bookSection");
	} else if (mediaType == "conferencePaper") {
		var newItem = new Zotero.Item("conferencePaper");
	} else if (mediaType == "journalArticle") {
		var newItem = new Zotero.Item("journalArticle");
	}
	
	var xPathAllData = doc.evaluate('//pre', doc, nsResolver, XPathResult.ANY_TYPE, null);
	var allData = xPathAllData.iterateNext().textContent.split("},");
	
	var cleanFirstEntry = allData[0].indexOf(",");
	allData[0] = allData[0].substr(cleanFirstEntry);

	var headers = new Array();
	var content = new Array();
	var splitAllData;
	
	for (var i = 0; i < allData.length-2; i++) {
		splitAllData = allData[i].split("=");
		headers.push(splitAllData[0].replace(/^\s*|\s*$|\W*/g, ''));
		content.push(splitAllData[1].replace(/^\s*|\s*$|\{*/g, ''));
		
		fieldTitle = headers[i].replace(",", '');
	
		if (fieldTitle == "author") {
			var authors = content[i].split("and");
	
			for (var j =0; j<authors.length; j++) {
				newItem.creators.push(Zotero.Utilities.cleanAuthor(authors[j], "author"));
			}
		} else if (fieldTitle == "editor") {
			var editors = content[i].split("and");

			for (var j =0; j<editors.length; j++) {
				newItem.creators.push(Zotero.Utilities.cleanAuthor(editors[j], "editor"));
			}
		} else {

			dataTags[fieldTitle] = content[i];
		}
	}

	if (mediaType == "conferencePaper") {
		associateData (newItem, dataTags, "booktitle", "conferenceName");
	} else {
		associateData (newItem, dataTags, "booktitle", "bookTitle");
	}
	
	newItem.url = doc.location.href;
	
	associateData (newItem, dataTags, "year", "date");
	associateData (newItem, dataTags, "pages", "pages");
	associateData (newItem, dataTags, "title", "title");	
	associateData (newItem, dataTags, "publisher", "publisher");
	associateData (newItem, dataTags, "volume", "volume");
	associateData (newItem, dataTags, "isbn", "ISBN");
	associateData (newItem, dataTags, "series", "series");
	associateData (newItem, dataTags, "journal", "publicationTitle");
	associateData (newItem, dataTags, "number", "issue");

	newItem.complete();

}



function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	var articles = new Array();
	
	/* Multiple code doesn't work due to Permission denied to get property HTMLDocument.documentElement error.
	
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		
		//newer interface xPaths
		if (doc.title.match("DEMO")) {
			
			var titles = doc.evaluate('//a/font', doc, nsResolver, XPathResult.ANY_TYPE, null);
			var links = doc.evaluate('//dt/a', doc, nsResolver, XPathResult.ANY_TYPE, null);
			
			var next_title;
			while (next_title = titles.iterateNext()) {
				items[links.iterateNext().href] = next_title.textContent;
			}
			
		//older interface xPaths	
		} else {
				
			var titles = doc.evaluate('//td[3]', doc, nsResolver, XPathResult.ANY_TYPE, null);
			var links = doc.evaluate('//td[1]/a', doc, nsResolver, XPathResult.ANY_TYPE, null);
			
			var next_title;
			var split1;
			var split2;
			
			while (next_title = titles.iterateNext()) {
				
				split1 = next_title.textContent.indexOf(":");
				var title = next_title.textContent.substr(split1+2);
				split2 = title.indexOf(".");
				title = title.substr(0, split2);
			
				items[links.iterateNext().href] = title;
			}
		
		}

		items = Zotero.selectItems(items);
		for (var i in items) {
			articles.push(i);
		}
		
	} else {
	
		*/
		
		articles = [url];
	//}
	Zotero.Utilities.processDocuments(articles, scrape, function() {Zotero.done();});
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.dblp.org/rec/bibtex/journals/cssc/XuY12",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Jianwen",
						"lastName": "Xu",
						"creatorType": "author"
					},
					{
						"firstName": "Hu",
						"lastName": "Yang",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"url": "http://www.dblp.org/rec/bibtex/journals/cssc/XuY12",
				"date": "2012",
				"pages": "327-341",
				"title": "On the Preliminary Test Backfitting and Speckman Estimators\n               in Partially Linear Models and Numerical Comparisons",
				"volume": "41",
				"publicationTitle": "Communications in Statistics - Simulation and Computation",
				"issue": "3",
				"libraryCatalog": "DBLP Computer Science Bibliography",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.dblp.org/rec/bibtex/conf/ats/KochteZBIWHCP10",
		"items": [
			{
				"itemType": "conferencePaper",
				"creators": [
					{
						"firstName": "Michael A.",
						"lastName": "Kochte",
						"creatorType": "author"
					},
					{
						"firstName": "Christian G.",
						"lastName": "Zoellin",
						"creatorType": "author"
					},
					{
						"firstName": "Rafal",
						"lastName": "Baranowski",
						"creatorType": "author"
					},
					{
						"firstName": "Michael E.",
						"lastName": "Imhof",
						"creatorType": "author"
					},
					{
						"firstName": "Hans-Joachim",
						"lastName": "Wunderlich",
						"creatorType": "author"
					},
					{
						"firstName": "Nadereh",
						"lastName": "Hatami",
						"creatorType": "author"
					},
					{
						"firstName": "Stefano Di",
						"lastName": "Carlo",
						"creatorType": "author"
					},
					{
						"firstName": "Paolo",
						"lastName": "Prinetto",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"conferenceName": "Asian Test Symposium",
				"url": "http://www.dblp.org/rec/bibtex/conf/ats/KochteZBIWHCP10",
				"date": "2010",
				"pages": "3-8",
				"title": "Efficient Simulation of Structural Faults for the Reliability\n               Evaluation at System-Level",
				"libraryCatalog": "DBLP Computer Science Bibliography",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/