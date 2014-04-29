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
	"lastUpdated": "2014-04-28 21:03:15"
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
				if (item.date) item.date = item.date.replace(/\-01\-01T00:00:00\/*/, "")
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
		"url": "http://www.ingentaconnect.com/search;jsessionid=296g394n0j012.alice?form_name=quicksearch&ie=%E0%A5%B0&value1=argentina&option1=tka&x=0&y=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.ingentaconnect.com/search/article?option1=tka&value1=labor+market&pageSize=10&index=10",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Brinton",
						"firstName": "M.C.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Social capital in the Japanese youth labor market: Labor market policy, schools, and norms",
				"journalAbbreviation": "Policy Sciences",
				"volume": "33",
				"issue": "3-1",
				"pages": "289-306",
				"abstractNote": "This paper develops the concept of institutional social capital and discusses its importance in the labor market. Institutional social capital is constituted by the resources inherent in an organization (such as a school) and thereby available to members of that organization. This is contrasted with the social capital available to individuals through their own personal networks. In the labor market context, an example of institutional social capital is the ties that schools have with employers who recruit a proportion of their new employees as they prepare to graduate. The paper examines how these ties and the norms governing the important labor market screening role played by the high school developed in post-WWII Japan. I also discuss an important positive externality – social control over students – generated by schools’ institutional social capital. Finally, I examine current challenges to Japanese high schools’ institutional social capital.",
				"date": "2000-12-01T00:00:00///",
				"publicationTitle": "Policy Sciences",
				"libraryCatalog": "IngentaConnect",
				"shortTitle": "Social capital in the Japanese youth labor market"
			}
		]
	}
]
/** END TEST CASES **/