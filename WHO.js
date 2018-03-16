{
	"translatorID": "cd587058-6125-4b33-a876-8c6aae48b5e8",
	"label": "WHO",
	"creator": "Mario Trojan",
	"target": "^http://apps\\.who\\.int/iris/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-03-16 11:46:37"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Mario Trojan
	
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


// attr()/text() v2
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}
function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}
function node(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem:null;}

function detectWeb(doc, url) {
	if (url.includes('/simple-search')) {
		return "multiple";
	}
	
	if (text(doc, "h2 > small") == "Collection home page") {
		return "multiple";
	}
	
	return "document";
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	
	var rows = doc.querySelectorAll('a.list-group-item');
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		Z.debug(href);
		var title = text(rows[i], 'div.row > div.col-md-10 > h5');
		Z.debug(title);
		if (!href || !title) continue;
		if (checkOnly) return;
		found = true;
		items[href] = title;
	}
	
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var type = detectWeb(doc, url);
	var item = new Zotero.Item(type);
	
	var rows = doc.querySelectorAll("table.itemDisplayTable > tbody > tr");
	for (let i=0;i<rows.length;i++) {
		let key = text(rows[i], "td.metadataFieldLabel").trim();
		let value = text(rows[i], "td.metadataFieldValue");
		
		Z.debug(key + " " + value);
		
		switch (key) {
			case 'Title:':
				item.title = value;
				break;
			case 'Language:':
				let languages = getBrValues(node(rows[i], "td.metadataFieldValue"));
				languages.forEach(function (value) {
					if (item.language === undefined) {
						item.language = value;
					} else {
						item.language += ', ' + value;
					}
				});
				break;
			case 'Authors:':
				var authors = rows[i].querySelectorAll("a");
				for (let author of authors) {
					item.creators.push({lastName: author.textContent,
										type: "author",
										fieldMode: 1
										}
					);
				}
				break;
			case 'URI:':
				item.url = value;
				break;
			case 'Abstract:':
				item.abstractNode = value;
				break;
		}
	}
	
	//item.title = "dummy";
	
	item.complete();
}


function getBrValues(element) {
	var child = element.firstChild;
	var values = [];
	while (child !== null) {
		if (child.nodeType == 3) { // Text
			values.push(child.textContent);
		}
		child = child.nextSibling;
	}
	return values;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://apps.who.int/iris/handle/10665/70863",
		"items": [
			{
				"itemType": "document",
				"title": "Consensus document on the epidemiology of severe acute respiratory syndrome (SARS)",
				"creators": [
					{
						"lastName": "World Health Organization",
						"type": "author",
						"fieldMode": 1
					}
				],
				"language": "English",
				"libraryCatalog": "WHO",
				"url": "http://www.who.int/iris/handle/10665/70863",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://apps.who.int/iris/simple-search?query=acupuncture",
		"items": "multiple"
	}
]
/** END TEST CASES **/
