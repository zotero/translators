{
	"translatorID": "b51ac026-ed35-4c68-89bb-b42b1e1ce8f2",
	"label": "MCV",
	"creator": "czar",
	"target": "^https?://(www\\.)?mcvuk\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-07-05 01:11:13"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 czar
	http://en.wikipedia.org/wiki/User_talk:Czar
	
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


// attr()/text() v2 per https://github.com/zotero/translators/issues/1277
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}


function detectWeb(doc, url) {
	if (/\/(business|development|esports|influence)\//.test(url)) {
		return "blogPost";
	} else if (url.indexOf("/search?query=") != -1) {
		return "multiple";
	} else return null;
}


function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // embedded metadata
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		item.itemType = "blogPost";
		item.publicationTitle = "MCV";
		item.date = attr(doc,'meta[name="published"]','content');
		item.title = item.title.replace(/- MCV$/,'');
		if (item.creators[0].lastName == "Editors") {
			delete item.creators[0].firstName;                    // remove the firstName param
			item.creators[0].lastName = "MCV Editors"; // write the desired name to lastName
			item.creators[0].fieldMode = 1;                       // change to single-field mode
		}
		item.complete();
	});
	translator.getTranslatorObject(function(trans) {
		trans.doWeb(doc, url);
	});
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.m-card--header > h2');
	var links = doc.querySelectorAll('a.m-card--header');
	for (let i=0; i<rows.length; i++) {
		let href = links[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	switch (detectWeb(doc, url)) {
		case "multiple":
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
			break;
		case "blogPost":
			scrape(doc, url);
			break;
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.mcvuk.com/business/no-dlc-for-rare-replay",
		"items": [
			{
				"itemType": "blogPost",
				"title": "No DLC for Rare Replay",
				"creators": [
					{
						"lastName": "MCV Editors",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2016-01-26T09:45:00Z",
				"abstractNote": "No more games will be added to the Rare Replay collection, the studio has said.UK developer Rare hinted that more games could be added to its package of 30",
				"blogTitle": "MCV",
				"language": "en-us",
				"url": "https://www.mcvuk.com/business/no-dlc-for-rare-replay",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Business"
					},
					{
						"tag": "dlc"
					},
					{
						"tag": "publishing"
					},
					{
						"tag": "rare"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.mcvuk.com/esports/seagull-quits-pro-overwatch-in-favour-of-streaming",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Seagull quits pro Overwatch in favour of streaming",
				"creators": [
					{
						"firstName": "Mike",
						"lastName": "Stubbs",
						"creatorType": "author"
					}
				],
				"date": "2017-04-14T10:30:00Z",
				"abstractNote": "Arguably the biggest name in professional Overwatch has quit his team in order to focus on streaming. Brandon \"Seagull\" Larned rose to fame when his Twitch",
				"blogTitle": "MCV",
				"language": "en-us",
				"url": "https://www.mcvuk.com/esports/seagull-quits-pro-overwatch-in-favour-of-streaming",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Esports"
					},
					{
						"tag": "NRG"
					},
					{
						"tag": "People"
					},
					{
						"tag": "overwatch"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.mcvuk.com/search?query=earthbound",
		"items": "multiple"
	}
]
/** END TEST CASES **/
