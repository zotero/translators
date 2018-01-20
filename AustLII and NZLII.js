{
	"translatorID": "5ed5ab01-899f-4a3b-a74c-290fb2a1c9a4",
	"label": "AustLII and NZLII",
	"creator": "Bill McKinney and Sebastian Karcher",
	"target": "^https?://www\\d?\\.(austlii\\.edu\\.au|nzlii\\.org)",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-01-20 05:35:28"
}

function detectWeb(doc, url) {
	var austliiRegexp = /\/cases\/.+\d\.html/
	if(austliiRegexp.test(url)) {
		return "case";
	} else {
		var aTags = doc.getElementsByTagName("a");
		for(var i=0; i<aTags.length; i++) {
			if(austliiRegexp.test(aTags[i].href)) {
				return "multiple";
			}
		}
	}
}


function scrape(doc) {
	var newItem = new Zotero.Item("case");
	var voliss = ZU.xpathText(doc, '//head/title');
	var title = voliss.match(/.+?\[/)[0].replace(/ \[/, "");

	newItem.title = newItem.caseName = title;
	newItem.url = doc.location.href;
	var court = ZU.trim(voliss.match(/\].+?[\(\[]/)[0].replace(/[\]\(\[]/g, ""))
	newItem.court = court.match(/[^0-9]+/)[0]
	newItem.docketNumber=court.match(/\d+/)[0]
	newItem.dateDecided = voliss.match(/\(\d[^\)]+\d{4}\)/)[0].replace(/[\(\)]/g, "");
	newItem.attachments = [{ document:doc, title:"AustLII/NZLII snapshot", mimeType:"text/html"}];
	newItem.complete();
}

function doWeb(doc, url) {
	var austliiRegexp = /\/cases\/.+\d\.html/;
	if(austliiRegexp.test(url)) {
		scrape(doc);
	} else {
		var items = Zotero.Utilities.getItemArray(doc, doc, austliiRegexp);
		var urls = new Array();
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				urls.push(i);
			}
			Zotero.Utilities.processDocuments(urls, scrape, function () {
				Zotero.done();
			});
			Zotero.wait();
		});
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www7.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/FamCA/2006/212.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "C & M",
				"creators": [],
				"dateDecided": "20 January 2006",
				"court": "FamCA",
				"docketNumber": "212",
				"url": "http://www7.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/FamCA/2006/212.html",
				"attachments": [
					{
						"title": "AustLII/NZLII snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www8.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/FCA/2010/1.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "Yeo, in the matter of AES Services (Aust) Pty Ltd (ACN 111 306 543) (Administrators Appointed)",
				"creators": [],
				"dateDecided": "5 January 2010",
				"court": "FCA",
				"docketNumber": "1",
				"url": "http://www8.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/FCA/2010/1.html",
				"attachments": [
					{
						"title": "AustLII/NZLII snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.nzlii.org/nz/cases/NZSC/2008/1.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "Bronwyn Estate Ltd and ors v Gareth Hoole and others",
				"creators": [],
				"dateDecided": "8 February 2008",
				"court": "NZSC",
				"docketNumber": "1",
				"url": "http://www.nzlii.org/nz/cases/NZSC/2008/1.html",
				"attachments": [
					{
						"title": "AustLII/NZLII snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.nzlii.org/nz/cases/NZSC/2008/1.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "Bronwyn Estate Ltd and ors v Gareth Hoole and others",
				"creators": [],
				"dateDecided": "8 February 2008",
				"court": "NZSC",
				"docketNumber": "1",
				"url": "http://www.nzlii.org/nz/cases/NZSC/2008/1.html",
				"attachments": [
					{
						"title": "AustLII/NZLII snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www8.austlii.edu.au/cgi-bin/viewtoc/au/cases/act/ACTSC/2010/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www8.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/AICmr/2017/134.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "'NM' and Department of Human Services (Freedom of information)",
				"creators": [],
				"dateDecided": "8 December 2017",
				"court": "AICmr",
				"docketNumber": "134",
				"url": "http://www8.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/AICmr/2017/134.html",
				"attachments": [
					{
						"title": "AustLII/NZLII snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
