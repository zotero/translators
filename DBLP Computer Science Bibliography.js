{
	"translatorID": "625c6435-e235-4402-a48f-3095a9c1a09c",
	"label": "DBLP Computer Science Bibliography",
	"creator": "Adam Crymble, Sebastian Karcher",
	"target": "^https?://(www\\.)?(dblp(\\.org|\\.uni-trier\\.de/)|informatik\\.uni-trier\\.de/\\~ley//)",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsv",
	"lastUpdated": "2012-10-06 11:58:01"
}

function detectWeb(doc, url) {
	if (doc.title.match("journals")) {
		return "journalArticle";
	} else if (doc.title.match("conf")) {
		return "conferencePaper";
	} else if (doc.title.match("DBLP entry")) {
		return "bookSection";
	}
	else if (url.match(/\/db\/(journals|conf|series|books|reference)/) && !url.match(/index\.html/)){
		return "multiple"
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
	var dataTags = new Object();
	var mediaType = detectWeb(doc, url);
	
	if (mediaType == "bookSection") {
		var newItem = new Zotero.Item("bookSection");
	} else if (mediaType == "conferencePaper") {
		var newItem = new Zotero.Item("conferencePaper");
	} else if (mediaType == "journalArticle") {
		var newItem = new Zotero.Item("journalArticle");
	}
	
	var xPathAllData = doc.evaluate('//pre', doc, null, XPathResult.ANY_TYPE, null);
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
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var articles = new Array();
		var rows  = ZU.xpath(doc, '//body/ul/li|//li[@class="entry article"]')	
		for (i in rows){
			 var title = ZU.xpathText(rows[i], './b|./div/span[@class="title"]');
			 var link = ZU.xpathText(rows[i], './a[contains(@href, "rec/bibtex") and not(contains(@href, ".xml"))]/@href|./nav//div/a[contains(@href, "rec/bibtex") and not(contains(@href, ".xml"))]/@href');
			items[link] = title;
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
	},
	{
		"type": "web",
		"url": "http://www.informatik.uni-trier.de/~ley/db/journals/tois/tois25.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://dblp.uni-trier.de/db/journals/tods/tods31.html",
		"items": "multiple"
	}
]
/** END TEST CASES **/