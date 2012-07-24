{
	"translatorID": "6b0b11a6-9b77-4b49-b768-6b715792aa37",
	"label": "Toronto Star",
	"creator": "Adam Crymble, Avram Lyon",
	"target": "^http://www\\.thestar\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-07-24 00:53:59"
}

function detectWeb(doc, url) {
	if (url.indexOf("search") != -1 && url.indexOf("classifieds") == -1) {
		return "multiple";
	} else if (url.indexOf("article") != -1) {
		return "newspaperArticle";
	}
}

//Toronto Star translator. code by Adam Crymble

function scrape(doc, url) {
	var newItem = new Zotero.Item("newspaperArticle");

	var date = ZU.xpathText(doc, '//div[@class="tdShareTools"]/text()');
	if(date) {
		newItem.date = date.replace(/Published on/,'').trim();
	}
	
	newItem.abstractNote = ZU.xpathText(doc, '//meta[@property="og:description"]');
    var comma = false;
	var authorNode = ZU.xpathText(doc, '//div[@class="td-author"]/strong');
	if (authorNode) authorNode = authorNode.split(/\s*,\s*/);
	var authorNode2 =ZU.xpathText(doc, '//span[@class="columnistLabel"]/a');
	if (authorNode2) {
		authorNode = authorNode2.split(/\s*;\s*/);
		 comma = true;}
	var author;
	for(var i=0, n=authorNode.length; i<n; i++) {
		author = authorNode[i];
		newItem.creators.push(ZU.cleanAuthor(author, "author", comma));
	}

	newItem.title = ZU.xpathText(doc, '//h1[contains(@class, "Article")]');	

	// The section is the first listed keyword
	var keywords = ZU.xpath(doc, '//meta[@name="Keywords"][@content]')[0];
	if (keywords) newItem.section = keywords.textContent.split(',')[0];

	newItem.attachments.push({document:doc, title:"Toronto Star Snapshot", mimeType:'text/html'});

	newItem.url = url;
	newItem.publicationTitle = "The Toronto Star";
	newItem.ISSN = "0319-0781";

	newItem.complete();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var items = ZU.getItemArray(doc, ZU.xpath(doc, '//div[@class="tdListTitle"]/h2'), /thestar\.com/);
		Zotero.selectItems(items, function(selectedItems) {
			if(!selectedItems) return true;
			var articles = new Array();
			for (var i in selectedItems) {
				articles.push(i);
			}
			ZU.processDocuments(articles, function(doc) { scrape(doc, doc.location.href) });
		});
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
				"attachments": [
					{
						"title": "Toronto Star Snapshot",
						"mimeType": "text/html"
					}
				],
				"date": "Tuesday January 26, 2010\n\t,",
				"title": "France should ban Muslim veils, commission says",
				"url": "http://www.thestar.com/news/world/article/755917--france-should-ban-muslim-veils-commission-says?bn=1",
				"publicationTitle": "The Toronto Star",
				"ISSN": "0319-0781",
				"libraryCatalog": "Toronto Star",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.thestar.com/business/cleanbreak/article/1031551--hamilton-ontario-should-reconsider-offshore-wind",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Tyler",
						"lastName": "Hamilton",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Toronto Star Snapshot",
						"mimeType": "text/html"
					}
				],
				"date": "Friday July 29, 2011\n\t,",
				"title": "Hamilton: Ontario should reconsider offshore wind",
				"url": "http://www.thestar.com/business/cleanbreak/article/1031551--hamilton-ontario-should-reconsider-offshore-wind",
				"publicationTitle": "The Toronto Star",
				"ISSN": "0319-0781",
				"libraryCatalog": "Toronto Star",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Hamilton"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.thestar.com/news/canada/article/1221066--bev-oda-resigns-as-international-co-operation-minister-conservative-mp-for-durham",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Joanna",
						"lastName": "Smith",
						"creatorType": "author"
					},
					{
						"firstName": "Allan",
						"lastName": "Woods",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Toronto Star Snapshot",
						"mimeType": "text/html"
					}
				],
				"date": "Tuesday July 03, 2012\n\t,",
				"title": "Bev Oda resigns as International Co-operation minister, Conservative MP for Durham",
				"url": "http://www.thestar.com/news/canada/article/1221066--bev-oda-resigns-as-international-co-operation-minister-conservative-mp-for-durham",
				"publicationTitle": "The Toronto Star",
				"ISSN": "0319-0781",
				"libraryCatalog": "Toronto Star",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.thestar.com/search?types=Article&OrderBy=releasetimestamp+desc&query=harper",
		"items": "multiple"
	}
]
/** END TEST CASES **/