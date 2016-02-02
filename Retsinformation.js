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
	"lastUpdated": "2016-02-02 13:53:31"
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
	if (ZU.xpathText(doc, '//div[@class="wrapper2"]/table[@id="ctl00_MainContent_ResultGrid1"]') && getSelectItems(doc, url).length) {
		return "multiple";
	} else if (url.indexOf("R0710") != -1) {
		type = getType(doc, url);
		return type;
	} else return false;
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
	if (/(R0900|R0920|R0930)/.test(url)) {
		var titles = ZU.xpath(doc, '//table[@id="ctl00_MainContent_ResultGrid1"]/tbody/tr[@class!="th"]/td[1]/a[1]');
	} else if (/(R0210|R0310)/.test(url)) {
		var titles = ZU.xpath(doc, '//table[@id="ctl00_MainContent_ResultGrid1"]/tbody/tr[@class!="th"]/td[2]/a[1]');
	} else if (/R0700.aspx\\?res/.test(url)) {
		var titles = ZU.xpath(doc, '//table[@id="ctl00_MainContent_ResultGrid1"]/tbody/tr[@class!="th"]/td[3]/a[1]');
	} else if (/(R0220|R0415|R0700)/.test(url)) {
		var titles = ZU.xpath(doc, '//table[@id="ctl00_MainContent_ResultGrid1"]/tbody/tr[@class!="th"]/td[4]/a[1]');
	}
	return titles;
}

function scrape(doc, url) {
	var type = getType(doc, url);
	var newItem = new Zotero.Item(type);
	newItem.title = getTitle(doc, url);
	newItem.url = url;
	if (type=="statute") {
//		newItem.nameOfAct = newItem.title
		newItem.codeNumber = getKortNavn(doc, url).id;
		newItem.publicLawNumber = newItem.codeNumber;
		newItem.dateEnacted = getKortNavn(doc, url).date;
		newItem.shortTitle = getRessort(doc, url).shortTitle;
		if (/L(BK|OV)/.test(newItem.publicLawNumber.substr(0,3))) {
		} else {
			newItem = addAuthor (newItem, getRessort(doc, url).ressort);
		};
	} else if (type=="case") {
		newItem.caseName = newItem.title
		newItem = addAuthor (newItem, getRessort(doc, url).ressort);		
		newItem.docketNumber = getKortNavn(doc, url).id;
		newItem.dateDecided = getKortNavn(doc, url).date;
		newItem.shortTitle = getRessort(doc, url).shortTitle;
	} else if (type=="report") {
		newItem = addAuthor (newItem, getRessort(doc, url).ressort);
		newItem.date = getRessort(doc, url).pubDate;
		newItem.institution = "Folketinget";
		threeLetters = getKortNavn(doc, url).threeLetters;
		if (threeLetters=="EDP") {
			newItem.seriesTitle = "Folketingets Ombudsmands driftundersøgelser";
		} else if (threeLetters=="ISP") {
			newItem.seriesTitle = "Folketingets Ombudsmands Inspektioner";
		} else if (threeLetters=="FOU") {
			newItem.seriesTitle = "Folketingets Ombudsmands udtalelser";
		};
		newItem.reportNumber = getKortNavn(doc, url).id;
	} else if (type=="bill") {
		newItem = addAuthor (newItem, getRessort(doc, url).ressort);
		newItem.billNumber = getKortNavn(doc, url).id;
		newItem.date = getRessort(doc, url).pubDate;
	}
	newItem.complete();
}

function getType (doc, url) {
	threeLetters = getKortNavn(doc, url).threeLetters;
	if (/(DOM|AFG|KEN|UDT)/.test(threeLetters)) {
		return "case";
	}
	if (/(EDP|ISP|FOU)/.test(threeLetters)) {
		return "report";
	}
	if (/\d{3}/.test(threeLetters)) {
		return "bill";
	} else {
		return "statute";
	}
}

function getTitle (doc, url) {
	var baseXPath = '//div[@class="wrapper2"]/div/';
	var xPath1 = baseXPath + 'p[@class="Titel2"]';
	baseXPath = baseXPath + 'div[@id="INDHOLD"]/';
	var xPath2 = baseXPath + 'p[@class="Titel"]';
	var xPath3 = baseXPath + 'font/p[@align="CENTER"]';
	var xPath4 = baseXPath + 'h1[@class="TITLE"]';
	var xPath5 = baseXPath + 'center/h1[@class="TITLE"]';
	var title = ZU.xpathText(doc, xPath1) || ZU.xpathText(doc, xPath2) || ZU.xpathText(doc, xPath3) || ZU.xpathText(doc, xPath4) || ZU.xpathText(doc, xPath5);
	if (!title) {
		var myXPath = '/html/head/title';
		title = ZU.xpathText(doc, myXPath);
		title = title.substring(0,title.lastIndexOf("-"));
		if (getRessort(doc, url)[0]) {
			title = title.substring(getRessort(doc, url)[0].length+4,title.length);
		};
	}; 
	title = ZU.trimInternal(title);
	return title;
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
	fodder = fodder.trim();
	var item = new Object();
	if (fodder.charAt(0) == "(") {
		item.shortTitle = fodder.substring(1,fodder.lastIndexOf(")")-1);
	}
	var datePosition = fodder.search(/\d{2}\-\d{2}\-\d{4}/);
	item.ressort = fodder.substr(datePosition+10);
	item.pubDate = fodder.substr(datePosition,10);
	return item;
}


function addAuthor (item, author) {
	item.creators[0] = {};
	item.creators[0].creatorType = "author";
	item.creators[0].lastName = author;
	item.creators[0].fieldMode = 1;
	return item;
}
