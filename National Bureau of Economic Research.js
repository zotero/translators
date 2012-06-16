{
	"translatorID": "99f958ab-0732-483d-833f-6bd8e42f6277",
	"label": "National Bureau of Economic Research",
	"creator": "Michael Berkowitz",
	"target": "^https?://(?:papers\\.|www\\.)?nber\\.org/(papers|s|new)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-06-15 20:33:32"
}

function detectWeb(doc, url) {
	if (doc.evaluate('//a[contains(text(), "RIS")]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "report";
	} else if (doc.evaluate('//tbody/tr/td[1]//a[contains(@href, "papers/w")]|//li/a[contains(@href, "papers/w")]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "multiple";
	}
}

function doWeb(doc, url) {

	var arts = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var links = doc.evaluate('//tbody/tr/td[1]//a[contains(@href, "papers/w")]|//li/a[contains(@href, "papers/w")]', doc, null, XPathResult.ANY_TYPE, null);
		var link;
		while (link = links.iterateNext()) {
			if (!link.href.match(/\.pdf$/)) items[link.href] = link.textContent;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				i = cleanup(i);
			arts.push(i + '.bib');
			}
			Zotero.Utilities.processDocuments(arts, scrape, function () {
				Zotero.done();
			});
		});
	} else {
		url = cleanup(url);
		var pdfurl = url+ ".pdf"
		arts = [url + '.bib'];
	}
	Z.debug(arts)
	Zotero.Utilities.HTTP.doGet(arts, function(text) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		translator.setString(text);
		translator.setHandler("itemDone", function(obj, item) {
			item.attachments = []
			item.attachments.push({url:pdfurl, title: "NBER Full Text PDF", mimeType:"application/pdf"});
			item.complete();	
		});
		translator.translate();
	});
	Zotero.wait();
}

function cleanup(url){
	url = url.replace(/\?.+/, "");
	return url;
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://papers.nber.org/papers/w17577",
		"items": [
			{
				"itemType": "report",
				"creators": [
					{
						"firstName": "William R.",
						"lastName": "Kerr",
						"creatorType": "author"
					},
					{
						"firstName": "William F.",
						"lastName": "Lincoln",
						"creatorType": "author"
					},
					{
						"firstName": "Prachi",
						"lastName": "Mishra",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "NBER Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "The Dynamics of Firm Lobbying",
				"publisher": "National Bureau of Economic Research",
				"type": "Working Paper",
				"series": "Working Paper Series",
				"reportNumber": "17577",
				"date": "November 2011",
				"url": "http://www.nber.org/papers/w17577",
				"abstractNote": "We study the determinants of the dynamics of firm lobbying behavior using a panel data set covering 1998-2006. Our data exhibit three striking facts: (i) few firms lobby, (ii) lobbying status is strongly associated with firm size, and (iii) lobbying status is highly persistent over time. Estimating a model of a firm's decision to engage in lobbying, we find significant evidence that up-front costs associated with entering the political process help explain all three facts. We then exploit a natural experiment in the expiration in legislation surrounding the H-1B visa cap for high-skilled immigrant workers to study how these costs affect firms' responses to policy changes. We find that companies primarily adjusted on the intensive margin: the firms that began to lobby for immigration were those who were sensitive to H-1B policy changes and who were already advocating for other issues, rather than firms that became involved in lobbying anew. For a firm already lobbying, the response is determined by the importance of the issue to the firm's business rather than the scale of the firm's prior lobbying efforts. These results support the existence of significant barriers to entry in the lobbying process.",
				"libraryCatalog": "National Bureau of Economic Research",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://papers.nber.org/s/search?restrict_papers=yes&whichsearch=db&client=test3_fe&proxystylesheet=test3_fe&site=default_collection&entqr=0&ud=1&output=xml_no_dtd&oe=UTF-8&ie=UTF-8&sort=date%253AD%253AL%253Ad1&q=labor",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://papers.nber.org/new.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://papers.nber.org/papers/w18130?utm_campaign=ntw&utm_medium=email&utm_source=ntw",
		"items": [
			{
				"itemType": "report",
				"creators": [
					{
						"firstName": "Enrico",
						"lastName": "Spolaore",
						"creatorType": "author"
					},
					{
						"firstName": "Romain",
						"lastName": "Wacziarg",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "NBER Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "How Deep Are the Roots of Economic Development?",
				"publisher": "National Bureau of Economic Research",
				"type": "Working Paper",
				"series": "Working Paper Series",
				"reportNumber": "18130",
				"date": "June 2012",
				"url": "http://www.nber.org/papers/w18130",
				"abstractNote": "The empirical literature on economic growth and development has moved from the study of proximate determinants to the analysis of ever deeper, more fundamental factors, rooted in long-term history. A growing body of new empirical work focuses on the measurement and estimation of the effects of historical variables on contemporary income by explicitly taking into account the ancestral composition of current populations. The evidence suggests that economic development is affected by traits that have been transmitted across generations over the very long run. This article surveys this new literature and provides a framework to discuss different channels through which intergenerationally transmitted characteristics may impact economic development, biologically (via genetic or epigenetic transmission) and culturally (via behavioral or symbolic transmission). An important issue is whether historically transmitted traits have affected development through their direct impact on productivity, or have operated indirectly as barriers to the diffusion of productivity-enhancing innovations across populations.",
				"libraryCatalog": "National Bureau of Economic Research",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/