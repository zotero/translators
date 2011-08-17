{
	"translatorID": "6b0b11a6-9b77-4b49-b768-6b715792aa37",
	"label": "Toronto Star",
	"creator": "Adam Crymble",
	"target": "^http://www\\.thestar\\.com",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2011-08-17 14:14:19"
}

function detectWeb(doc, url) {
	if (doc.location.href.match("search") && !doc.location.href.match("classifieds")) {
		return "multiple";
	} else if (doc.location.href.match("article")) {
		return "newspaperArticle";
	}
}

//Toronto Star translator. code by Adam Crymble

function scrape(doc, url) {

	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;	
	
	var newItem = new Zotero.Item("newspaperArticle");

	if (doc.title.match("TheStar.com | ")) {
		var lineBreak = doc.title.lastIndexOf(" |");
		newItem.section = doc.title.substr(14, lineBreak-14);
	}
	
	var date = doc.evaluate('//span[@class="ts-label_published"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
	if(date) {
		newItem.date = date.textContent.replace(/Published On/,'');
	}
	
	var abstractNote = doc.evaluate('//meta[@property="og:description"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
	if(abstractNote) newItem.abstractNote = abstractNote.content;
	 	
	var author1 = new Array();
	 	var k = 0;
	 	
	 	if (doc.evaluate('//span[@class="articleAuthor"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
		 	var author = doc.evaluate(xPathAuthor, doc, nsResolver, XPathResult.ANY_TYPE, null);
		 	var authorName;
		 	
		 	while (authorName = author.iterateNext()) {
			author1.push(authorName.textContent);	
			k++;
		 	}

		 	if (k>1) {
			for (k in author1) {
				var words = author1[k].toLowerCase().split(/\s/);
				
				for (var i in words) {
					words[i] = words[i][0].toUpperCase() + words[i].substr(1).toLowerCase();
				}
				
				author1[k] = words.join(" ");
				newItem.creators.push(Zotero.Utilities.cleanAuthor(author1[k], "author"));	
				} 	
		 	} else {

			 	var words = author1[0].toLowerCase().split(/\s/);
			for (var i in words) {
				words[i] = words[i][0].toUpperCase() + words[i].substr(1).toLowerCase();
			}
			author1[0] = words.join(" ");
			newItem.creators.push(Zotero.Utilities.cleanAuthor(author1[0], "author"));	
		 	}
	 	}

	var xPathTitle = '//h1[@class="ts-article_header"]';
	newItem.title = doc.evaluate(xPathTitle, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;	
	
	newItem.url = doc.location.href;
	newItem.publicationTitle = "The Toronto Star";
	newItem.ISSN = "0319-0781";

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
		
		var titles = doc.evaluate('//a', doc, nsResolver, XPathResult.ANY_TYPE, null);
		
		var next_title;
		while (next_title = titles.iterateNext()) {
			if (next_title.href.match("http://www.thestar.com") && next_title.href.match("article") && !next_title.href.match("generic") && !next_title.href.match("static")) {
				items[next_title.href] = next_title.textContent;
			}
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			articles.push(i);
		}
		Zotero.Utilities.processDocuments(articles, scrape, function() {Zotero.done();});
		Zotero.wait();
	} else {
		scrape(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.thestar.com/news/world/article/755917--france-should-ban-muslim-veils-commission-says?bn=1",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"date": "2010/01/26 10:34:00",
				"abstractNote": "France's National Assembly should pass a resolution denouncing full Muslim face veils and then vote the strictest law possible to ban women from wearing them, a parliamentary commission proposed on Tuesday.",
				"title": "France should ban Muslim veils, commission says",
				"url": "http://www.thestar.com/news/world/article/755917--france-should-ban-muslim-veils-commission-says?bn=1",
				"publicationTitle": "The Toronto Star",
				"ISSN": "0319-0781",
				"libraryCatalog": "Toronto Star"
			}
		]
	}
]
/** END TEST CASES **/