{
	"translatorID": "fb342bae-7727-483b-a871-c64c663c2fae",
	"label": "BusinessWeek",
	"creator": "Michael Berkowitz",
	"target": "^https?://(www\\.)?businessweek\\.com",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-01-30 22:52:13"
}

function detectWeb(doc, url) {
	if (doc.title == "BusinessWeek Search Results") {
		return "multiple";
	} else if (doc.evaluate('//meta[@name="headline"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "magazineArticle";
	}
}

function doWeb(doc, url) {
	var articles = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var results = doc.evaluate('//h3[@class="story"]/a', doc, null, XPathResult.ANY_TYPE, null);
		var result;
		var items = new Object();
		while (result = results.iterateNext()) {
			items[result.href] = Zotero.Utilities.trimInternal(result.textContent);
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			articles.push(i);
		}
	} else {
		articles = [url];
	}
	Zotero.debug(articles);
	Zotero.Utilities.processDocuments(articles, function(newDoc) {
		var metaTags = new Object();
		var metas = newDoc.evaluate('//meta', newDoc, null, XPathResult.ANY_TYPE, null);
		var meta;
		while (meta = metas.iterateNext()) {
			metaTags[meta.name] = meta.content;
		}
		Zotero.debug(metaTags);
		var item = new Zotero.Item("magazineArticle");
		item.title = metaTags['headline'];
		item.abstractNote = metaTags['abstract'];
		item.tags = metaTags['keywords'].split(/\s*,\s*/);
		//some articles don't have author tags - prevent this from failing
		if (metaTags['author']) item.creators.push(Zotero.Utilities.cleanAuthor(metaTags['author'], "author"));
		item.publicationTitle = "BusinessWeek: " + metaTags['channel'];
		item.url = newDoc.location.href;
		item.date = metaTags['pub_date'].replace(/(\d{4})(\d{2})(\d{2})/, "$2/$3/$1");
		item.complete();
	}, function() {Zotero.done();});
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.businessweek.com/management/ten-things-only-bad-managers-say-09232011.html?campaign_id=rss_topStories",
		"items": [
			{
				"itemType": "magazineArticle",
				"creators": [
					{
						"firstName": "Liz",
						"lastName": "Ryan",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"leadership",
					"management",
					"bad bosses",
					"leaders",
					"Liz Ryan",
					"bad managers",
					"lousy managers"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Ten Things Only Bad Managers Say",
				"publicationTitle": "BusinessWeek: Management",
				"url": "http://www.businessweek.com/management/ten-things-only-bad-managers-say-09232011.html?campaign_id=rss_topStories",
				"date": "09/23/2011",
				"libraryCatalog": "BusinessWeek",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://search.businessweek.com/Search?searchTerm=linux&resultsPerPage=20",
		"items": "multiple"
	}
]
/** END TEST CASES **/