{
	"translatorID": "99f958ab-0732-483d-833f-6bd8e42f6277",
	"label": "National Bureau of Economic Research",
	"creator": "Michael Berkowitz",
	"target": "^https?://(?:papers\\.|www\\.)?nber\\.org/(papers|s|new)",
	"minVersion": "1.0.0b4.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-09 13:49:18"
}

function detectWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;

	if (doc.evaluate('//a[contains(text(), "RIS")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "journalArticle";
	} else if (doc.evaluate('//tbody/tr/td[1]//a[contains(@href, "papers/w")]|//li/a[contains(@href, "papers/w")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "multiple";
	}
}

function parseRIS(uris){
	
	Zotero.Utilities.HTTP.doGet(uris, function(text){	
		// load translator for RIS
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.translate();
		Zotero.done();
	}, function() {});
	Zotero.wait();
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	var arts = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var links = doc.evaluate('//tbody/tr/td[1]//a[contains(@href, "papers/w")]|//li/a[contains(@href, "papers/w")]', doc, nsResolver, XPathResult.ANY_TYPE, null);
		var link;
		while (link = links.iterateNext()) {
			if (!link.href.match(/\.pdf$/)) items[link.href] = link.textContent;
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			arts.push(i + '.ris');
		}
	} else {
		var pdfurl = url+ ".pdf"
		arts = [url + '.ris'];
	}
	Zotero.Utilities.HTTP.doGet(arts, function(text) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function(obj, item) {
			if (text.match(/AB\s+\-\s+/)) item.abstractNote = text.match(/AB\s+\-\s+((.|\s)+)\n([A-Z]{2})/)[1];
			item.notes = new Array();
			item.attachments = []
			item.attachments.push({url:pdfurl, title: "NBER Full Text PDF", mimeType:"application/pdf"});
			item.complete();	
		});
		translator.translate();
	});
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://papers.nber.org.turing.library.northwestern.edu/papers/w17577",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Kerr",
						"firstName": "William R.",
						"creatorType": "author"
					},
					{
						"lastName": "Lincoln",
						"firstName": "William F.",
						"creatorType": "author"
					},
					{
						"lastName": "Mishra",
						"firstName": "Prachi",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://papers.nber.org.turing.library.northwestern.edu/papers/w17577.pdf",
						"title": "NBER Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "The Dynamics of Firm Lobbying",
				"publicationTitle": "National Bureau of Economic Research Working Paper Series",
				"volume": "No. 17577",
				"date": "2011",
				"accessDate": "November 2011",
				"url": "http://www.nber.org/papers/w17577",
				"abstractNote": "We study the determinants of the dynamics of firm lobbying behavior using a panel data set covering 1998-2006. Our data exhibit three striking facts: (i) few firms lobby, (ii) lobbying status is strongly associated with firm size, and (iii) lobbying status is highly persistent over time. Estimating a model of a firm's decision to engage in lobbying, we find significant evidence that up-front costs associated with entering the political process help explain all three facts. We then exploit a natural experiment in the expiration in legislation surrounding the H-1B visa cap for high-skilled immigrant workers to study how these costs affect firms' responses to policy changes. We find that companies primarily adjusted on the intensive margin: the firms that began to lobby for immigration were those who were sensitive to H-1B policy changes and who were already advocating for other issues, rather than firms that became involved in lobbying anew. For a firm already lobbying, the response is determined by the importance of the issue to the firm's business rather than the scale of the firm's prior lobbying efforts. These results support the existence of significant barriers to entry in the lobbying process.",
				"libraryCatalog": "National Bureau of Economic Research"
			}
		]
	},
	{
		"type": "web",
		"url": "http://papers.nber.org.turing.library.northwestern.edu/s/search?restrict_papers=yes&whichsearch=db&client=test3_fe&proxystylesheet=test3_fe&site=default_collection&entqr=0&ud=1&output=xml_no_dtd&oe=UTF-8&ie=UTF-8&sort=date%253AD%253AL%253Ad1&q=labor",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://papers.nber.org.turing.library.northwestern.edu/new.html",
		"items": "multiple"
	}
]
/** END TEST CASES **/