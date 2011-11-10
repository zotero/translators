{
	"translatorID": "61ffe600-55e0-11df-bed9-0002a5d5c51b",
	"label": "nzz.ch",
	"creator": "ibex",
	"target": "^http://((www\\.)?nzz\\.ch/.)",
	"minVersion": "2.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-10 00:02:11"
}

/*
	NZZ Translator - Parses NZZ articles and creates Zotero-based metadata.
	Copyright (C) 2010 ibex

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

/* Get the first xpath element from doc, if not found return null. */
function getXPath(xpath, doc) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == "x") return namespace; else return null;
	} : null;

	return doc.evaluate(xpath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
}

/* Zotero API */
function detectWeb(doc, url) {
	//Zotero.debug("ibex detectWeb URL= " + url);
	if (doc.title.substr(0, 6) == "Suche " && getXPath('//ul[@class = "berichte"]', doc)) {
		return "multiple";
	} else if (doc.location.href.match(/\.\d+\.html/) && getXPath('/html/body[@class = "artikel"]', doc)) {
		return "newspaperArticle";
	}
}

/* Zotero API */
function doWeb(doc, url) {
	//Zotero.debug("ibex doWeb URL= " + url);
	var urls = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = Zotero.Utilities.getItemArray(doc, doc.getElementById("content").getElementsByClassName('berichte'), '\\.\\d+\\.html');
		if (!items || countObjectProperties(items) == 0) {
			return true;
		}
		items = Zotero.selectItems(items);
		if (!items) {
			return true;
		}

		for (var i in items) {
			urls.push(i);
		}
	} else {
		urls.push(doc.location.href);
	}
	Zotero.Utilities.processDocuments(urls, scrape, function() { Zotero.done(); } );
	Zotero.wait();
}

/* Three types of articles: "Neue Zürcher Zeitung", "NZZ Online" and "NZZ am Sonntag" */
function scrape(doc) {
	//Zotero.debug("ibex scrape URL = " + doc.location.href);
	var newItem = new Zotero.Item('newspaperArticle');
	newItem.url = doc.location.href;
	newItem.title = Zotero.Utilities.trimInternal(getXPath('//div[@id = "content"]//h1', doc).textContent);

	var publ = Zotero.Utilities.trimInternal(getXPath('//div[@id = "content"]//p[@class = "dachzeile"]', doc).textContent);
	publ = publ.split(',');
	newItem.date = Zotero.Utilities.trimInternal(publ[0]);

	newItem.publicationTitle = Zotero.Utilities.trimInternal(publ[publ.length - 1]);
	if (newItem.publicationTitle.match(/^\d/)) {
		//set a publication title if there is only a number (date)
		newItem.publicationTitle = "NZZ";
	} else if (newItem.publicationTitle == "Neue Zürcher Zeitung") {
		newItem.ISSN = "0376-6829";
	} else if (newItem.publicationTitle == "NZZ am Sonntag") {
		newItem.ISSN = "1660-0851";
	}

	var subtitle = getXPath('//div[@id = "content"]//h2', doc);
	if ((subtitle != null) && (Zotero.Utilities.trimInternal(subtitle.textContent) != "")) {
		newItem.shortTitle = newItem.title;
		newItem.title += ": " + Zotero.Utilities.trimInternal(subtitle.textContent);
	}

	var teaser = getXPath('//div[@id = "content"]//h3', doc);
	if ((teaser != null) && (Zotero.Utilities.trimInternal(teaser.textContent) != "")) {
		newItem.abstractNote = Zotero.Utilities.trimInternal(teaser.textContent);
	}

	var authorline = getXPath('//div[@id = "content"]//p[@class = "autor"]', doc);
	if (authorline != null) {
		authorline = Zotero.Utilities.trimInternal(authorline.textContent);
		//assumption of authorline: "[Interview:|Von ]name1[, name2] [und Name3][, location]"
		authorline = authorline.replace(/^Von /, "");
		authorline = authorline.replace(/^Interview: /, "");
		authorline = authorline.replace(/vor Ort /i, "");
		//remove ", location"
		authorline = Zotero.Utilities.trim(authorline.replace(/, \S*$/, ""));

		var authors = authorline.split(/,|und/);
		for (var i = 0; i < authors.length && authorline.length > 0; i++) {
			newItem.creators.push(Zotero.Utilities.cleanAuthor(authors[i], "author"));
		}
	}

	var section = getXPath('//ul[@id="navi"]//ul[@id="submenu1"]/li[@class="selected"]/a', doc);
	if (section != null) {
		newItem.section = Zotero.Utilities.trimInternal(section.textContent);
	}

	var source = getXPath('//div[@id = "content"]//span[@class="quelle"]', doc);
	if (source != null) {
		newItem.extra = Zotero.Utilities.trimInternal(source.textContent).replace(/^\(/,"").replace(/\)$/,"");
	}

	newItem.attachments.push({title:"NZZ Online Article Snapshot", mimeType:"text/html", url:doc.location.href, snapshot:true});

	newItem.complete();
}

/* There is no built-in function to count object properties which often are used as associative arrays.*/
function countObjectProperties(obj) {
	var size = 0;
	for (var key in obj) {
		if (obj.hasOwnProperty(key)) size++;
	}
	return size;
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.nzz.ch/nachrichten/wirtschaft/aktuell/kuoni_gta-uebernahme_1.13276960.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "NZZ Online Article Snapshot",
						"mimeType": "text/html",
						"url": "http://www.nzz.ch/nachrichten/wirtschaft/aktuell/kuoni_gta-uebernahme_1.13276960.html",
						"snapshot": true
					}
				],
				"url": "http://www.nzz.ch/nachrichten/wirtschaft/aktuell/kuoni_gta-uebernahme_1.13276960.html",
				"title": "Kuoni profitiert von der GTA-Übernahme: Deutliches Umsatzplus in den ersten neun Monaten",
				"date": "10. November 2011",
				"publicationTitle": "NZZ Online",
				"shortTitle": "Kuoni profitiert von der GTA-Übernahme",
				"abstractNote": "Der Reisekonzern Kuoni hat in den ersten neun Monaten von der Übernahme des Reisekonzerns Gullivers Travel Associates (GTA) profitiert. Der Umsatz stieg, und der Konzern machte Gewinn.",
				"section": "Wirtschaft",
				"extra": "sda",
				"libraryCatalog": "nzz.ch",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.nzz.ch/search?q=arbeitsmarkt",
		"items": "multiple"
	}
]
/** END TEST CASES **/