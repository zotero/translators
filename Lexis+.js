{
	"translatorID": "419638d9-9049-44ad-ba08-fa54ed24b5e6",
	"label": "Lexis+",
	"creator": "Brandon F",
	"target": "https://plus.lexis.*/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-04-06 16:12:39"
}

function scrape(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	if (prefix == "x" ) return namespace; else return null;
	} : null;

	if (detectWeb(doc, url) == "case")
	{

	}
	else if (detectWeb(doc, url) == "statute")
	{

	}
}

function detectWeb(doc, url) {
	Zotero.debug("Title: " + doc.title)
	if (doc.title.match(/.*results.*/)) {
		return "multiple"
	}
	else if (doc.title.match(/\d+\s[a-zA-Z\. ]+\s§\s\d+/))
	{
		return "statute"
	}
	else if (doc.title.match(/\d+\s[a-zA-Z0-9\. ]+\s\d+/))
	{
		return "case"
	}
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	if (prefix == "x" ) return namespace; else return null;
	} : null;

	var casesOrStatutes = new Array();
	var items = new Object();
	var nextTitle;

	if (detectWeb(doc, url) == "multiple") {
		var titles = doc.evaluate('(//a[@class="titleLink"])',
								  doc, nsResolver, XPathResult.ANY_TYPE, null);
		while (nextTitle = titles.iterateNext()) {
			// TODO format this a little, maybe add a year parenthetical
			items[nextTitle.href] = nextTitle.textContent;
		}

		items = Zotero.selectItems(items);
		for(var i in items) {
			casesOrStatutes.push(i);
		}
	}
	else
	{
		casesOrStatutes = [url]
	}

	Zotero.Utilities.processDocuments(casesOrStatutes, scrape, function(){Zotero.done();});
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
