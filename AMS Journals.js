{
	"translatorID": "bdaac15c-b0ee-453f-9f1d-f35d00c7a994",
	"label": "AMS Journals",
	"creator": "Michael Berkowitz",
	"target": "^https?://www\\.ams\\.org/journals/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-09-03 11:08:35"
}

function detectWeb(doc, url) {
	if (url.match(/home\.html|\d{4}[^\/]*\/.+/)) {
		return "journalArticle";
	} else if (url.match(/jour(nals|search)/)) {
		return "multiple";
	} 
}

//TODO rewrite with a function getSearchResults which can also been used in detectWeb

function doWeb(doc, url) {
	var articles = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		if (url.match(/joursearch/)) {
			var titlex = '//table/tbody/tr/td/span[@class="searchResultsArticleTitle"]';
			var linkx = '//a[@class="searchResultsAbstractLink"]';
		} else {
			var titlex = '//div[@class="contentList"]/dl/dt[@class="articleTitleInAbstract"]';
			var linkx = '//div[@class="contentList"]/dl/dd/a[contains(text(), "Abstract")]'
		}
		var titles = doc.evaluate(titlex, doc, null, XPathResult.ANY_TYPE, null);
		var links = doc.evaluate(linkx, doc, null, XPathResult.ANY_TYPE, null);
		var title, link;
		while ((title = titles.iterateNext()) && (link = links.iterateNext())) {
			items[link.href] = Zotero.Utilities.trimInternal(title.textContent);
		}
	Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
	});
	} else {
	scrape(doc, url)
	}
}

function scrape(doc, url){
	//Z.debug(url)		
	// We call the Embedded Metadata translator to do the actual work
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function(obj, item) {
			var abstract = ZU.xpathText(doc, '//p[a[contains(@id, "Abstract")]]');
			if (abstract) item.abstractNote = ZU.trimInternal(abstract).replace(/^Abstract:\s/, "");
			item.complete();
	});
	translator.translate();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.ams.org/journals/jams/2012-25-01/S0894-0347-2011-00713-3/home.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Equivalences between fusion systems of finite groups of Lie type",
				"creators": [
					{
						"firstName": "Carles",
						"lastName": "Broto",
						"creatorType": "author"
					},
					{
						"firstName": "Jesper",
						"lastName": "Møller",
						"creatorType": "author"
					},
					{
						"firstName": "Bob",
						"lastName": "Oliver",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"DOI": "10.1090/S0894-0347-2011-00713-3",
				"ISSN": "0894-0347, 1088-6834",
				"abstractNote": "We prove, for certain pairs of finite groups of Lie type, that the -fusion systems and are equivalent. In other words, there is an isomorphism between a Sylow -subgroup of and one of which preserves -fusion. This occurs, for example, when and for a simple Lie ``type'' , and and are prime powers, both prime to , which generate the same closed subgroup of -adic units. Our proof uses homotopy-theoretic properties of the -completed classifying spaces of and , and we know of no purely algebraic proof of this result.",
				"accessDate": "CURRENT_TIMESTAMP",
				"issue": "1",
				"journalAbbreviation": "J. Amer. Math. Soc.",
				"libraryCatalog": "www.ams.org",
				"pages": "1-20",
				"publicationTitle": "Journal of the American Mathematical Society",
				"url": "http://www.ams.org/jams/2012-25-01/S0894-0347-2011-00713-3/",
				"volume": "25",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"classifying spaces",
					"fusion systems",
					"groups of Lie type",
					"𝑝-completion"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.ams.org/journals/bull/2016-53-03/",
		"items": "multiple"
	}
]
/** END TEST CASES **/