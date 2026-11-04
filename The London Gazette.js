{
	"translatorID": "a1b065a3-5c69-445f-94c9-3a737cce8b62",
	"label": "The London Gazette",
	"creator": "Myles Fullen",
	"target": "^https?://www.thegazette.co.uk/London/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-08-17 22:22:08"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Myles Fullen
	
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


function detectWeb(doc, url) {
	if (url.includes('/issue/')) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h2>a.title[href*="/issue/"]');
	for (let row of rows) {
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	
	translator.setHandler('itemDone', function (obj, item) {
		item.date = doc.getElementsByTagName('time')[0].getAttribute('datetime');
		item.issue = doc.getElementById('issue-number').textContent;
		item.page = doc.getElementById('page-number').textContent;
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "journalArticle";
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.thegazette.co.uk/London/issue/31486/page/9865",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Page 9865 | Issue 31486, 1 August 1919 | London Gazette | The Gazette",
				"creators": [],
				"date": "1919-08-01",
				"issue": "31486",
				"language": "en",
				"libraryCatalog": "www.thegazette.co.uk",
				"url": "https://www.thegazette.co.uk/London/issue/31486/page/9865",
				"attachments": [
					{
						"mimeType": "text/html"
					}
				]
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.thegazette.co.uk/London/issue/29070/page/1563",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Page 1563 | Issue 29070, 16 February 1915 | London Gazette | The Gazette",
				"creators": [],
				"date": "1915-02-16",
				"issue": "29070",
				"language": "en",
				"libraryCatalog": "www.thegazette.co.uk",
				"url": "https://www.thegazette.co.uk/London/issue/29070/page/1563",
				"attachments": [
					{
						"mimeType": "text/html"
					}
				]
			}
		]
	}
]
/** END TEST CASES **/
