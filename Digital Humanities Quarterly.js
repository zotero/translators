{
	"translatorID": "bbad0221-134b-495a-aa56-d77cfaa67ab5",
	"label": "Digital Humanities Quarterly",
	"creator": "Michael Berkowitz",
	"target": "^https?://www\\.digitalhumanities\\.org/(dhq)?",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-01-30 22:50:51"
}

function detectWeb(doc, url) {
	if (doc.evaluate('//div[@class="DHQarticle"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "journalArticle";
	} else if (doc.evaluate('//div[@id="mainContent"]/div/p', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "multiple";
	}
}

function scrape(doc, xpath, xdoc) {
	return Zotero.Utilities.trimInternal(doc.evaluate(xpath, xdoc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent);
}

function doWeb(doc, url) {
	var articles = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object;
		var arts = doc.evaluate('//div[@id="mainContent"]/div/p/a', doc, null, XPathResult.ANY_TYPE, null);
		var art;
		while (art = arts.iterateNext()) {
			items[art.href] = art.textContent;
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			articles.push(i)
		}
	} else {
		articles = [url];
	}
	Zotero.debug(articles);

	Zotero.Utilities.processDocuments(articles, function(newDoc) {
		var item = new Zotero.Item("journalArticle");
		item.url = newDoc.location.href;
		item.title = scrape(newDoc, '//h1[@class="articleTitle"]', newDoc);
		var voliss = scrape(newDoc, '//div[@id="pubInfo"]', newDoc);
		voliss = voliss.match(/(.*)Volume\s+(\d+)\s+Number\s+(\d+)/);
		item.date = voliss[1];
		item.volume = voliss[2];
		item.issue = voliss[3];		
		var authors = newDoc.evaluate('//div[@class="author"]', newDoc, null, XPathResult.ANY_TYPE, null);
		var aut;
		while (aut = authors.iterateNext()) {
			item.creators.push(Zotero.Utilities.cleanAuthor(scrape(newDoc, './a[1]', aut), "author"));
		}
		item.attachments = [{url:item.url, title:"DHQ Snapshot", mimeType:"text/html"}];
		item.complete();
	}, function() {Zotero.done();});
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.digitalhumanities.org/dhq/vol/5/2/000094/000094.html",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Wesley",
						"lastName": "Beal",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.digitalhumanities.org/dhq/vol/5/2/000094/000094.html",
						"title": "DHQ Snapshot",
						"mimeType": "text/html"
					}
				],
				"url": "http://www.digitalhumanities.org/dhq/vol/5/2/000094/000094.html",
				"title": "Network Narration in John Dos Passos’s U.S.A. Trilogy",
				"date": "Spring 2011",
				"volume": "5",
				"issue": "2",
				"libraryCatalog": "Digital Humanities Quarterly",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.digitalhumanities.org/dhq/vol/5/1/index.html",
		"items": "multiple"
	}
]
/** END TEST CASES **/