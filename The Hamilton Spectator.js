{
	"translatorID": "c9338ed5-b512-4967-8ffe-ab9c973559ef",
	"label": "The Hamilton Spectator",
	"creator": "Adam Crymble",
	"target": "^https?://www\\.thespec\\.com",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-16 21:30:55"
}

function detectWeb(doc, url) {
	if (doc.location.href.match("SearchResults")) {
		return "multiple";
	} else if (doc.location.href.match("article")) {
		return "newspaperArticle";
	}
}

//Hamilton Spectator translator. code by Adam Crymble

function scrape(doc, url) {

	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;	
	
	var newItem = new Zotero.Item("newspaperArticle");

	if (doc.title.match("TheSpec.com - ")) {
		var lineBreak = doc.title.lastIndexOf(" - ");
		newItem.section = doc.title.substr(14, lineBreak-14);
	}

	var xPathAbstract = '//span[@class="subhead1"][@id="ctl00_ContentPlaceHolder_article_NavWebPart_Article_ctl00___SubTitle1__"]';
	if (doc.evaluate(xPathAbstract, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
		newItem.abstractNote = doc.evaluate(xPathAbstract, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	}
	
	var xPathAuthor1 = '//span[@class="articleAuthor"][@id="ctl00_ContentPlaceHolder_article_NavWebPart_Article_ctl00___Author1__"]';
	if (doc.evaluate(xPathAuthor1, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
		var author1 = doc.evaluate(xPathAuthor1, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
		if (author1.match(", ")) {
			author1 = author1.split(", ");
			author1 = author1[0];
		}
		var words = author1.toLowerCase().split(/\s/);
				
		for (var i in words) {
			words[i] = words[i][0].toUpperCase() + words[i].substr(1).toLowerCase();
		}
				
		author1 = words.join(" ");
		newItem.creators.push(Zotero.Utilities.cleanAuthor(author1, "author"));	
	}
	
	var xPathAuthor2 = '//span[@class="td_page_author"]';
	if (doc.evaluate(xPathAuthor2, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
		var author2 = doc.evaluate(xPathAuthor2, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
		if (author2.match(", ")) {
			author2 = author2.split(", ");
			author2 = author2[0];
		}
		newItem.creators.push(Zotero.Utilities.cleanAuthor(author2, "author"));	
	}
	
	var xPathTitle = '//h1';
	newItem.title = doc.evaluate(xPathTitle, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;	
	
	newItem.url = doc.location.href;
	newItem.publicationTitle = "The Hamilton Spectator";

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
		
		var titles = doc.evaluate('//span[@class="td_tsr_title"]/a', doc, nsResolver, XPathResult.ANY_TYPE, null);
		
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
		"url": "http://www.thespec.com/news/ontario/article/626278--expert-calls-occupy-demos-most-important-in-generations",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Colin",
						"lastName": "Perkel",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Expert calls Occupy demos most important in generations",
				"url": "http://www.thespec.com/news/ontario/article/626278--expert-calls-occupy-demos-most-important-in-generations",
				"publicationTitle": "The Hamilton Spectator",
				"libraryCatalog": "The Hamilton Spectator",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.thespec.com/SearchResults?AssetType=Article&q=labor",
		"items": "multiple"
	}
]
/** END TEST CASES **/