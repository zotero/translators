{
	"translatorID": "6ec8008d-b206-4a4c-8d0a-8ef33807703b",
	"label": "The Economist",
	"creator": "Michael Berkowitz",
	"target": "^http://(www\\.)?economist\\.com/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-09-25 16:00:02"
}

function detectWeb(doc, url) {
	if (doc.location.href.indexOf("/search/") != -1) {
		return "multiple";
	} else if (doc.location.href.toLowerCase().indexOf("node") != -1) {
		return "magazineArticle";
	}
}

function scrape(doc, url) {

	newItem = new Zotero.Item("magazineArticle");
	newItem.ISSN = "0013-0613";
	newItem.url = doc.location.href;
	newItem.publicationTitle = "The Economist";


	//get headline
	var title = new Array();
	if (doc.title && doc.title != "" && doc.title != "Economist.com") {
		title = doc.title.split(" | ");
	} else {
		title.push(doc.evaluate('//div[@class="clear"][@id="pay-barrier"]/div[@class="col-left"]/div[@class="article"]/font/b', doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent);
	}


	if (title.length == 1) {
		title.push = title;
	} else {
		title = title.slice(0, title.length - 1);
		title = title.join(": ");
	}
	newItem.title = title;

	if (doc.evaluate('//div[@class="clear"][@id="pay-barrier"]/div[@class="col-right"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		newItem.extra = "(Subscription only)";
	}

	if (newItem.extra == "(Subscription only)") {
		newItem.complete();
		return;
	}
	//get abstract
	if (doc.evaluate('//div[@id="content"]/div[@class="clear top-border"]/div[@class="col-left"]/h2', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		newItem.abstractNote = doc.evaluate('//div[@id="content"]/div[@class="clear top-border"]/div[@class="col-left"]/h2', doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	} else if (doc.evaluate('//div[@class="clear"][@id="pay-barrier"]/div[@class="col-left"]/div[@class="article"]/p/strong', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		newItem.abstractNote = doc.evaluate('//div[@class="clear"][@id="pay-barrier"]/div[@class="col-left"]/div[@class="article"]/p/strong', doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	} else if (doc.evaluate('//div[@id="content"]/div[@class="clear top-border"]/div[@class="col-left"]/p[3]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		newItem.abstractNote = doc.evaluate('//div[@id="content"]/div[@class="clear top-border"]/div[@class="col-left"]/p[3]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	}
	if (newItem.abstractNote) newItem.abstractNote = Zotero.Utilities.trimInternal(newItem.abstractNote);
	//get date and extra stuff
	newItem.date = ZU.xpathText(doc, '//time[@class="date-created"]')
	var url = doc.location.href;
	newItem.attachments = [{
		document: doc,
		title: "The Economist Snapshot",
		mimeType: "text/html"
	}];

	newItem.complete();
}


function doWeb(doc, url) {

	var urls = new Array();

	if (detectWeb(doc, url) == "multiple") {

		var articles = new Array();
		var items = {};
		var titles = doc.evaluate('//p[@class="search-item-title"]/a|//div[contains(@class, "gs-title")]/a[@class="gs-title"]', doc, null, XPathResult.ANY_TYPE, null);
		var title;
		while (title = titles.iterateNext()) {
			items[title.href] = title.textContent;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape)
		})
	} else if (doc.location.href.toLowerCase().indexOf("node") != -1) {
		scrape(doc, url);
		return;
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.economist.com/node/21538214",
		"items": [
			{
				"itemType": "magazineArticle",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.economist.com/node/21538214",
						"title": "The Economist Snapshot",
						"mimeType": "text/html"
					}
				],
				"ISSN": "0013-0613",
				"url": "http://www.economist.com/node/21538214",
				"publicationTitle": "The Economist",
				"title": "Asia-Pacific trade initiatives: Dreams and realities",
				"date": "Nov 12th 2011",
				"libraryCatalog": "The Economist",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Asia-Pacific trade initiatives"
			}
		]
	}
]
/** END TEST CASES **/