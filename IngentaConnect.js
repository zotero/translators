{
	"translatorID": "9e306d5d-193f-44ae-9dd6-ace63bf47689",
	"label": "IngentaConnect",
	"creator": "Michael Berkowitz",
	"target": "^https?://(www\\.)?ingentaconnect\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-02-09 12:45:00"
}

function detectWeb(doc, url) {
	if (url.indexOf("article?") != -1 || url.indexOf("article;") != -1 || url.indexOf("/art") != -1) {
		return "journalArticle";
	} 
	//permalinks
	else if (url.indexOf("/content/") != -1  && ZU.xpathText(doc, '//div[contains(@class,"export-formats")]/ul/li/a[@title="EndNote Export"]')) {
		return "journalArticle";
	}
	
	else if (url.indexOf("search?") !=-1 || url.indexOf("search;") != -1) {
		return "multiple";
	}
}

function doWeb(doc, url) {
	var articles = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var artlink = '//div//p/strong/a';
		var links = doc.evaluate(artlink, doc, null, XPathResult.ANY_TYPE, null);
		var next_link;
		while (next_link = links.iterateNext()) {
			items[next_link.href] = next_link.textContent;
		}
		
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url)
	}
}

function scrape(newDoc, url){
		var abs, pdf;
		var risurl = newDoc.evaluate('//div[contains(@class,"export-formats")]/ul/li/a[@title="EndNote Export"]', newDoc, null, XPathResult.ANY_TYPE, null).iterateNext().href;
		if (newDoc.evaluate('//div[@id="abstract"]', newDoc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
			abs = Zotero.Utilities.trimInternal(newDoc.evaluate('//div[@id="abstract"]', newDoc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent).substr(10);
		}
		if (newDoc.evaluate('//div[@id="purchaseexpand"]//a[contains(@title,"PDF download")]', newDoc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
			pdf = newDoc.evaluate('//div[@id="purchaseexpand"]//a[contains(@title,"PDF download")]', newDoc, null, XPathResult.ANY_TYPE, null).iterateNext().href;
		}
		if (newDoc.evaluate('//div[@id="info"]/p[1]/a', newDoc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
			var keywords = newDoc.evaluate('//div[@id="info"]/p[1]/a', newDoc, null, XPathResult.ANY_TYPE, null);
			var key;
			var keys = new Array();
			while (key = keywords.iterateNext()) {
				keys.push(Zotero.Utilities.capitalizeTitle(key.textContent, true));
			}
		}
		Zotero.Utilities.HTTP.doGet(risurl, function(text) {
			// fix spacing per spec
			text = text.replace(/([A-Z0-9]{2})  ?-/g,"$1  -");
			//Zotero.debug(text);
			text = text.replace(/(PY\s+\-\s+)\/+/, "$1");
			text = text.replace(/ER\s\s\-/, "") + "\nER  - ";
			var translator = Zotero.loadTranslator("import");
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function(obj, item) {
				if (abs) item.abstractNote = abs;
				if (pdf) item.attachments.push({url:pdf, title:"IngentaConnect Full Text PDF", mimeType:"application/pdf"});
				// Note that the RIS translator gives us a link to the record already
				item.url = null;
				if (keys) item.tags = keys;
				if (item.DOI) {
					if (item.DOI.match(/^doi:/)) {
						item.DOI = item.DOI.substr(4);
					}
				}
				item.complete();
			});
			translator.translate();
		});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.ingentaconnect.com/content/klu/10436/2007/00000003/00000001/00000064",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Calomiris",
						"firstName": "Charles",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Devaluation",
					"Redenomination",
					"Pesification",
					"Argentina",
					"F30",
					"E42",
					"G3",
					"G32",
					"K2"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Devaluation with contract redenomination in Argentina",
				"journalAbbreviation": "Annals of Finance",
				"volume": "3",
				"issue": "1",
				"pages": "155-192",
				"abstractNote": "This study offers the first empirical microeconomic analysis of the effectiveness of dollar debt and contract redenomination policies to mitigate adverse financial and relative price consequences from a large devaluation. An analysis of Argentina's policy of devaluation with redenomination in 2002, in contrast to Mexico's policy of devaluation without debt redenomination in 1994-1995, shows that devaluation benefited tradables firms, and that dollar debt redenomination in Argentina benefited high-dollar debtors, as shown in these firms' investment behavior, especially non-tradables firms whose revenues in dollar terms were adversely affected by devaluation. That investment behavior contrasts with the experience of Mexican firms in the aftermath of Mexico's large devaluation, in which non-tradables producers with high dollar debt displayed significant relative reductions in investment. Stock return reactions to Argentine debt redenomination indicate large, positive, unanticipated effects on high-dollar debtors from debt redenomination. Energy concession contract redenomination likewise increased investment by high energy users in Argentina, and that benefit was apparent also in positive stock returns of those firms.",
				"DOI": "10.1007/s10436-006-0064-9",
				"date": "2007",
				"publicationTitle": "Annals of Finance",
				"libraryCatalog": "IngentaConnect"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.ingentaconnect.com/search;jsessionid=296g394n0j012.alice?form_name=quicksearch&ie=%E0%A5%B0&value1=argentina&option1=tka&x=0&y=0",
		"items": "multiple"
	}
]
/** END TEST CASES **/