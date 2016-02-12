{
	"translatorID": "feef66bf-4b52-498f-a586-8e9a99dc07a0",
	"label": "Retsinformation",
	"creator": "Roald Frøsig",
	"target": "^https?://(?:www\\.)?retsinformation\\.dk/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2016-02-12 10:47:21"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2016 Roald Frøsig

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url){
	if (
		ZU.xpathText(doc, '//div[@class="wrapper2"]/table[@id="ctl00_MainContent_ResultGrid1"]')
	 && getSelectItems(doc, url).length
	) {
		return "multiple";
	} else if (url.indexOf("R0710") != -1) {
		type = getType(doc, url);
		return type;
	}
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var titles = getSelectItems(doc, url);
		for (i = 0; i < titles.length; i++) {
			items[titles[i].href] = ZU.trimInternal(titles[i].text);
		}
		Z.selectItems(items, function(selectedItems) {
			if (!selectedItems) return true;
			var urls = new Array();
			for (var i in selectedItems) {
				urls.push(i);
			}
			ZU.processDocuments(urls, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function getSelectItems(doc, url) {
	if (/(R0210|R0310)/.test(url)) {
		var titles = ZU.xpath(doc, '//table[@id="ctl00_MainContent_ResultGrid1"]/tbody/tr[@class!="th"]/td[2]/a[1]');
	} else if (/R0700.aspx\\?res/.test(url)) {
		var titles = ZU.xpath(doc, '//table[@id="ctl00_MainContent_ResultGrid1"]/tbody/tr[@class!="th"]/td[3]/a[1]');
	} else if (/(R0220|R0415|R0700)/.test(url)) {
		var titles = ZU.xpath(doc, '//table[@id="ctl00_MainContent_ResultGrid1"]/tbody/tr[@class!="th"]/td[4]/a[1]');
	} else {
		var titles = ZU.xpath(doc, '//table[@id="ctl00_MainContent_ResultGrid1"]/tbody/tr[@class!="th"]/td[1]/a[1]');
	}
	return titles;
}

function scrape(doc, url) {
	var type = getType(doc, url);
	var newItem = new Zotero.Item(type);
	newItem.title = getTitle(doc, url);
	newItem.url = url;
	var kortNavn = getKortNavn(doc, url);
	var ressort = getRessort(doc, url);
	if (!/L(BK|OV)/.test(kortNavn.threeLetters)) {
		newItem.creators[0] = {};
		newItem.creators[0].creatorType = "author";
		if (/(EDP|ISP|FOU)/.test(kortNavn.threeLetters)) {
			newItem.creators[0].lastName = "Folketingets Ombudsmand";
		} else {
			newItem.creators[0].lastName = ressort.ressort;		
		}
		newItem.creators[0].fieldMode = 1;
	}
	if (type=="statute") {
		newItem.publicLawNumber = kortNavn.id;
		newItem.dateEnacted = kortNavn.date;
		newItem.shortTitle = ressort.shortTitle;
	} else if (type=="case") {
		newItem.docketNumber = kortNavn.id;
		newItem.dateDecided = kortNavn.date;
		newItem.shortTitle = ressort.shortTitle;
	} else if (type=="webpage") {
		newItem.date = ressort.pubDate;
	} else if (type=="bill") {
		newItem.billNumber = kortNavn.id;
		newItem.date = ressort.pubDate;
	}
	newItem.complete();
}

function getType (doc, url) {
	var threeLetters = getKortNavn(doc, url).threeLetters;
	if (/(ADI|AND|BEK|BKI|BST|CIR|CIS|DSK|FIN|KON|LBK|LOV|LTB|PJE|SKR|VEJ|ÅBR)/.test(threeLetters)) {
		return "statute";
	}
	if (/(DOM|AFG|KEN|UDT)/.test(threeLetters)) {
		return "case";
	}
	if (/\d{3}/.test(threeLetters)) {
		return "bill";
	} else {
		return "webpage";
	}
}

function getTitle (doc, url) {
	var title = "";
// the html for 'bill' type is very idiosynchratic, so we wont attempt to scrape the title of bills from the <body> element.
	if (getType(doc, url) != "bill") {
		title = ZU.xpathText(doc, '//div[@class="wrapper2"]/div/p[@class="Titel2"]')
		 || ZU.xpathText(doc, '//div[@class="wrapper2"]/div/div[@id="INDHOLD"]//p[@class="Titel"]') 
		 || ZU.xpathText(doc, '//div[@class="wrapper2"]/div/div[@id="INDHOLD"]//font/p[@align="CENTER"]') 
		 || ZU.xpathText(doc, '//div[@class="wrapper2"]/div/div[@id="INDHOLD"]//h1[@class="TITLE"]') 
		 || ZU.xpathText(doc, '//div[@class="wrapper2"]/div/div[@id="INDHOLD"]//span[1]')
		if (title) {
			title = ZU.trimInternal(title);
		}
	}
// If it's a 'bill' or the xpaths above fail to find the title, we will scrape the title from the <head> element.
	if (!title) {
		title = doc.title;
// The <title>-element consist of three parts: a short title (if one exists); the title of the document; and "- retsinformation.dk".
// The following lines extracts the document title
		title = title.substring(0,title.lastIndexOf("-"));
		if (getRessort(doc, url).shortTitle) {
			title = title.substr(getRessort(doc, url).shortTitle.length+2);
		};
	}; 
	return ZU.trimInternal(title);
}

function getKortNavn (doc, url) {
	var myXPath = '//span[starts-with(@class,"kortNavn")]';
	var fodder = ZU.xpathText(doc, myXPath);
	fodder = fodder.replace(/ (Gældende|Historisk)/,"");
	var item = new Object();
	item.threeLetters = fodder.substr(0,3);
	fodder = fodder.split(" af ");
	item.date = fodder[1];
	item.id = fodder[0];
	return item;
}

function getRessort (doc, url) {
	var myXPath = '//div[@class="ressort"]';
	var fodder = ZU.xpathText(doc, myXPath);
// the 'fodder' string here consists of three parts:
//  - a short title in parentheses (if one exists)
//  - the publication date in the form dd-mm-yyyy
//  - the 'ressort', i.e. the ministry responsible for the document
	fodder = fodder.trim();
	var item = new Object();
	if (fodder.charAt(0) == "(") {
		item.shortTitle = fodder.substring(1,fodder.lastIndexOf(")"));
	}
	var datePosition = fodder.search(/\d{2}\-\d{2}\-\d{4}/);
	item.pubDate = fodder.substr(datePosition,10).replace(/-/g,"/");
	item.ressort = fodder.substr(datePosition+10);
	return item;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.retsinformation.dk/forms/R0710.aspx?id=168340",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Bekendtgørelse af lov om dag-, fritids- og klubtilbud m.v. til børn og unge (dagtilbudsloven)",
				"creators": [],
				"dateEnacted": "20/02/2015",
				"publicLawNumber": "LBK nr 167",
				"shortTitle": "Dagtilbudsloven",
				"url": "https://www.retsinformation.dk/forms/R0710.aspx?id=168340",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.retsinformation.dk/forms/R0710.aspx?id=160621",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Bekendtgørelse om regnskab for folkehøjskoler, efterskoler, husholdningsskoler og håndarbejdsskoler (frie kostskoler), frie grundskoler, private skoler for gymnasiale uddannelser m.v. og produktionsskoler",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Undervisningsministeriet",
						"fieldMode": 1
					}
				],
				"dateEnacted": "16/12/2013",
				"publicLawNumber": "BEK nr 1490",
				"shortTitle": "Regnskabsbekendtgørelse",
				"url": "https://www.retsinformation.dk/forms/R0710.aspx?id=160621",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.retsinformation.dk/forms/R0710.aspx?id=170044",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Bekendtgørelse om dagtilbud",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Ministeriet for Børn, Ligestilling, Integration og Sociale Forhold",
						"fieldMode": 1
					}
				],
				"dateEnacted": "30/04/2015",
				"publicLawNumber": "BEK nr 599",
				"url": "https://www.retsinformation.dk/forms/R0710.aspx?id=170044",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.retsinformation.dk/forms/R0710.aspx?id=95024",
		"items": [
			{
				"itemType": "bill",
				"title": "Forslag til folketingsbeslutning om bedre økonomiske forhold for skolefritidsordninger på friskoler og private grundskoler",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Folketinget",
						"fieldMode": 1
					}
				],
				"date": "17/01/2002",
				"billNumber": "2001/2 BSF 55",
				"url": "https://www.retsinformation.dk/forms/R0710.aspx?id=95024",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.retsinformation.dk/forms/R0710.aspx?id=131109",
		"items": [
			{
				"itemType": "bill",
				"title": "Forslag til folketingsbeslutning om harmonisering af regler om skolefritidsordninger og fritidshjem efter dagtilbudsloven",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Folketinget",
						"fieldMode": 1
					}
				],
				"date": "27/03/2010",
				"billNumber": "2009/1 BSF 193",
				"url": "https://www.retsinformation.dk/forms/R0710.aspx?id=131109",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.retsinformation.dk/forms/R0710.aspx?id=141932",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Bekendtgørelse om mindre fartøjer der medtager op til 12 passagerer",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Erhvervs- og Vækstministeriet",
						"fieldMode": 1
					}
				],
				"dateEnacted": "26/09/2012",
				"publicLawNumber": "BEK nr 956",
				"url": "https://www.retsinformation.dk/forms/R0710.aspx?id=141932",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.retsinformation.dk/Forms/R0930.aspx?q=huse&col=a&smode=simpel",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.retsinformation.dk/Forms/R0310.aspx?res=5&nres=1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.retsinformation.dk/Forms/R0220.aspx?char=R",
		"items": "multiple"
	}
]
/** END TEST CASES **/
