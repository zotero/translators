{
	"translatorID": "bdaac15c-b0ee-453f-9f1d-f35d00c7a994",
	"label": "AMS Journals",
	"creator": "Michael Berkowitz",
	"target": "^https?://www\\.ams\\.org/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"browserSupport": "gcs",
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-10-25 03:25:29"
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
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
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
		var titles = doc.evaluate(titlex, doc, nsResolver, XPathResult.ANY_TYPE, null);
		var links = doc.evaluate(linkx, doc, nsResolver, XPathResult.ANY_TYPE, null);
		Zotero.debug("Link: " + links.href);
		var title, link;
		while ((title = titles.iterateNext()) && (link = links.iterateNext())) {
			items[link.href] = Zotero.Utilities.trimInternal(title.textContent);
		}
		items = Zotero.selectItems(items);
	
		for (var i in items) {
			Zotero.wait();
			articles.push(i);
		}
	} else {
		articles = [url];
	}
	Zotero.debug(articles);
	Zotero.Utilities.processDocuments(articles, function(doc) {
		var item = new Zotero.Item("journalArticle");
		item.publicationTitle = doc.title;
		item.ISSN = doc.evaluate('//span[@class="journalISSN"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent.match(/\(e\)\s+ISSN:?\s+(.*)\(p\)/)[1];
		item.title = Zotero.Utilities.trimInternal(doc.evaluate('//p[@class="articleTitle"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent);
		item.url = doc.location.href.replace(/\.html.+/, ".html");
		var data = Zotero.Utilities.trimInternal(doc.evaluate('//p[span[@class="bibDataTag"]][1]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent);
		data = data.replace(/(Journal|MSC|Posted|Retrieve)/g, "\n$1");
		Zotero.debug(data);
		var authors = data.match(/(Author\(s\):\s+(.*)\n|Author(s)?:\s+(.*))/)[1].replace(/Author\(s\):|Authors?:/, "").split(/;\s+| and /);
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
		item.date = Zotero.Utilities.trimInternal(data.match(/Posted:\s+(.*)(\n|Full)/)[1]);
		var pdfurl = item.url.replace(/([^/]+)\/home.html$/, "$1/$1.pdf");
		item.attachments = [
			{url:item.url, title:item.journalAbbreviation + " Snapshot", mimeType:"text/html"},
			{url:pdfurl, title:item.journalAbbreviation + " PDF", mimeType:"application/pdf"}
		];
		item.abstract = Zotero.Utilities.trimInternal(doc.evaluate('//td[@class="bottomCell"]/p[4]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent.substr(10));
		item.complete();
	}, function() {Zotero.done();});
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.ams.org/journals/jams/2012-25-01/",
		"items": "multiple"
	},
	{
		"type": "web",
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
						"url": "http://www.ams.org/journals/jams/2012-25-01/S0894-0347-2011-00713-3/home.html",
						"title": "J. Amer. Math. Soc. Snapshot",
						"mimeType": "text/html"
					},
					{
						"url": "http://www.ams.org/journals/jams/2012-25-01/S0894-0347-2011-00713-3/S0894-0347-2011-00713-3.pdf",
						"title": "J. Amer. Math. Soc. PDF",
						"mimeType": "application/pdf"
					}
				],
				"publicationTitle": "Journal of the American Mathematical Society",
				"ISSN": "0894-0347",
				"title": "Equivalences between fusion systems of finite groups of Lie type",
				"url": "http://www.ams.org/journals/jams/2012-25-01/S0894-0347-2011-00713-3/home.html",
				"journalAbbreviation": "J. Amer. Math. Soc.",
				"volume": "25",
				"pages": "1-20.",
				"issue": "01",
				"date": "July 8, 2011",
				"abstract": "Abstract: We prove, for certain pairs of finite groups of Lie type, that the -fusion systems and are equivalent. In other words, there is an isomorphism between a Sylow -subgroup of and one of which preserves -fusion. This occurs, for example, when and for a simple Lie ``type'' , and and are prime powers, both prime to , which generate the same closed subgroup of -adic units. Our proof uses homotopy-theoretic properties of the -completed classifying spaces of and , and we know of no purely algebraic proof of this result.",
				"libraryCatalog": "AMS Journals",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/