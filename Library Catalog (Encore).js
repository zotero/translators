{
	"translatorID": "446764bf-7da6-49ec-b7a7-fefcbafe317f",
	"label": "Library Catalog (Encore)",
	"creator": "Sebastian Karcher",
	"target": "/iii/encore/(record|search)",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 270,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsb",
	"lastUpdated": "2017-11-19 20:03:16"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Sebastian Karcher
	
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
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}

function detectWeb(doc, url) {
	if (url.includes("encore/record")) {
		return "book";
	} else if (url.includes("encore/search")) {
		return "multiple";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a[id^=recordDisplayLink2Component]');
	for (let i = 0; i < rows.length; i++) {
		let href = createMarcURL(rows[i].href);
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function(items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			scrape(articles)
		});
	} else {
		var marcURL = createMarcURL(url)
		scrape([marcURL]);
	}
}

function createMarcURL(url) {
	//construct the marc URL
	return url.replace(/\?/, "?marcData=Y&");
}

function scrape(marcURL) {
	for (let i = 0; i < marcURL.length; i++) {
		//Z.debug(marcURL[i])
		//the library catalogue name isn't perfect, but should be unambiguous. 
		var domain = marcURL[i].match(/https?:\/\/([^/]+)/);
		ZU.doGet(marcURL[i], function(text) {
			var translator = Zotero.loadTranslator("import");
			translator.setTranslator("a6ee60df-1ddc-4aae-bb25-45e0537be973");
			translator.getTranslatorObject(function(marc) {
				var record = new marc.record();
				var newItem = new Zotero.Item();

				var linee = text.split("\n");
				for (var i = 0; i < linee.length; i++) {
					if (!linee[i]) {
						continue;
					}

					linee[i] = linee[i].replace(/[\xA0_\t]/g, " ");
					var value = linee[i].substr(7);

					if (linee[i].substr(0, 6) == "      ") {
						// add this onto previous value
						tagValue += value;
					} else {
						if (linee[i].substr(0, 6) == "LEADER") {
							// trap leader
							record.leader = value;
						} else {
							if (tagValue) { // finish last tag
								tagValue = tagValue.replace(/\|(.)/g, marc.subfieldDelimiter + "$1");
								if (tagValue[0] != marc.subfieldDelimiter) {
									tagValue = marc.subfieldDelimiter + "a" + tagValue;
								}

								// add previous tag
								record.addField(tag, ind, tagValue);
							}

							var tag = linee[i].substr(0, 3);
							var ind = linee[i].substr(4, 2);
							var tagValue = value;
						}
					}
				}
				if (tagValue) {
					tagValue = tagValue.replace(/\|(.)/g, marc.subfieldDelimiter + "$1");
					if (tagValue[0] != marc.subfieldDelimiter) {
						tagValue = marc.subfieldDelimiter + "a" + tagValue;
					}

					// add previous tag
					record.addField(tag, ind, tagValue);
				}

				record.translate(newItem);

				newItem.repository = domain[1].replace(/encore\./, "");
				// there is too much stuff in the note field - or file this as an abstract?
				newItem.notes = [];
				newItem.complete();
			});
		});
	}
}

/** BEGIN TEST CASES **/
var testCases = [{
		"type": "web",
		"url": "http://sallypro.sandiego.edu/iii/encore/search/C__Rb3558162__Stesting__Orightresult__U__X6?lang=eng&suite=cobalt#resultRecord-b3558162",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://sallypro.sandiego.edu/iii/encore/record/C__Rb1516899__Stesting__P0%2C2__Orightresult__U__X6?lang=eng&suite=cobalt",
		"items": [{
			"itemType": "thesis",
			"title": "Testing a theoretical model of critical thinking and cognitive development",
			"creators": [{
					"firstName": "Jane",
					"lastName": "Rapps",
					"creatorType": "author"
				},
				{
					"lastName": "University of San Diego",
					"creatorType": "contributor",
					"fieldMode": true
				}
			],
			"date": "1998",
			"callNumber": "BF441 .R3 1998",
			"libraryCatalog": "sallypro.sandiego.edu Library Catalog",
			"numPages": "199",
			"attachments": [],
			"tags": [{
					"tag": "Constructivism (Education)"
				},
				{
					"tag": "Critical thinking"
				},
				{
					"tag": "Decision making"
				},
				{
					"tag": "Dissertations"
				},
				{
					"tag": "Education"
				},
				{
					"tag": "Nursing"
				},
				{
					"tag": "Nursing"
				},
				{
					"tag": "Nursing"
				},
				{
					"tag": "Nursing"
				},
				{
					"tag": "Philosophy"
				}
			],
			"notes": [],
			"seeAlso": []
		}]
	}
]
/** END TEST CASES **/
