{
	"translatorID": "bdaac15c-b0ee-453f-9f1d-f35d00c7a994",
	"label": "AMS Journals",
	"creator": "Michael Berkowitz",
	"target": "^https?://www\\.ams\\.org/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2012-12-10 20:55:57"
}

function detectWeb(doc, url) {
	if (url.match(/home\.html/)) {
		return "journalArticle";
	}
	else if (url.match(/jour(nals|search)/)) {
		return "multiple";
	} 
}

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
			ZU.processDocuments(articles, scrape, function () {Zotero.done();});
		Zotero.wait();
	});
	} else {
	scrape(doc, url)
	}
}

	function scrape(doc, url){
		var item = new Zotero.Item("journalArticle");
		item.publicationTitle = doc.title;
		item.ISSN = ZU.xpathText(doc, '//span[@class="journalISSN"]').replace(/(ISSN:?|\(print\))/g, "").replace(/\(online\)\s*/, ", ").trim();
		item.title = Zotero.Utilities.trimInternal(ZU.xpathText(doc, '//p[@class="articleTitle"]'));
		item.url = doc.location.href.replace(/\.html.+/, ".html");
		var data = Zotero.Utilities.trimInternal(ZU.xpathText(doc, '//p[span[@class="bibDataTag"]][1]'));
		data = data.replace(/(Journal|MSC|Posted|Retrieve)/g, "\n$1");
		Zotero.debug(data);
		var authors = data.match(/(Author\(s\):\s+(.*)\n|Author(s)?:\s+(.*))/)[1].replace(/Author\(s\):|Authors?:/, "").split(/;\s+| and |, /);
		for each (var aut in authors) {
			item.creators.push(Zotero.Utilities.cleanAuthor(aut, "author"));
		}
		var journalinfo = data.match(/Journal:\s+(.*)\n/)[1].match(/^([^\d]+)(\d+)\s+\((\d+)\),\s+(.*)$|\n/);
		//the string isn't complete for recent articles w/o volume and issue infor
		if (journalinfo){
		item.journalAbbreviation = Zotero.Utilities.trimInternal(journalinfo[1]);
		item.volume = journalinfo[2];
		item.pages = journalinfo[4];
		item.issue = item.url.match(/(\d+)\/S/)[1];
		}
		else {
			var journalabr = data.match(/Journal:\s+(.*)/);
			item.journalAbbreviation = Zotero.Utilities.trimInternal(journalinfo[1]); }
		item.date = Zotero.Utilities.trimInternal(data.match(/Posted:\s+(.*)(\n|Full)/)[1]).replace(/MathSci.+$/, "");
		if (data.match(/MathSciNet/)){
			item.extra= Zotero.Utilities.trimInternal(data.match(/MathSci.+\d+/)[0]);
		}
		var pdfurl = item.url.replace(/([^/]+)\/home.html$/, "$1/$1.pdf");
		item.attachments = [
			{url:item.url, title:item.journalAbbreviation + " Snapshot", mimeType:"text/html"},
			{url:pdfurl, title:item.journalAbbreviation + " PDF", mimeType:"application/pdf"}
		];
		item.abstractNote = ZU.trimInternal(ZU.xpathText(doc, '//td[@class="bottomCell"]/p[4]').substr(10)).replace(/^A?bstract:\s/, "");
		item.complete();
	}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.ams.org/journals/jams/2012-25-01/",
		"items": "multiple"
	},
	{
		"type": "web",
		"defer": true,
		"url": "http://www.ams.org/journals/jams/2012-25-01/S0894-0347-2011-00713-3/home.html",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Carles",
						"lastName": "Broto",
						"creatorType": "author"
					},
					{
						"firstName": "Jesper M.",
						"lastName": "Møller",
						"creatorType": "author"
					},
					{
						"firstName": "Bob",
						"lastName": "Oliver",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "J. Amer. Math. Soc. Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "J. Amer. Math. Soc. PDF",
						"mimeType": "application/pdf"
					}
				],
				"publicationTitle": "Journal of the American Mathematical Society",
				"ISSN": "1088-6834, 0894-0347",
				"title": "Equivalences between fusion systems of finite groups of Lie type",
				"url": "http://www.ams.org/journals/jams/2012-25-01/S0894-0347-2011-00713-3/home.html",
				"journalAbbreviation": "J. Amer. Math. Soc.",
				"volume": "25",
				"pages": "1-20",
				"issue": "01",
				"date": "July 8, 2011",
				"extra": "MathSciNet review: 2833477",
				"abstractNote": "We prove, for certain pairs of finite groups of Lie type, that the -fusion systems and are equivalent. In other words, there is an isomorphism between a Sylow -subgroup of and one of which preserves -fusion. This occurs, for example, when and for a simple Lie ``type'' , and and are prime powers, both prime to , which generate the same closed subgroup of -adic units. Our proof uses homotopy-theoretic properties of the -completed classifying spaces of and , and we know of no purely algebraic proof of this result.",
				"libraryCatalog": "AMS Journals",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/