{
	"translatorID": "ef365b99-3797-4a01-a1d8-9aea9a7e9548",
	"label": "Inside Higher Ed",
	"creator": "Sebastian Karcher",
	"target": "^https?://www\\.insidehighered\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-10-11 01:45:31"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Sebastian Karcher
	
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
	if (/\d{4}\/\d{2}\/\d{2}/.test(url)) {
		return "magazineArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.search-result>h3>a');
	for (let row of rows) {
		let href = row.href;
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
	// translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		item.title = text(doc, 'h1');
		item.date = text(doc, '.views-field-created>div');
		var authors = text(doc, '.pane-node-author .pane-content');
		if (authors) {
			item.creators.push(ZU.cleanAuthor(authors.trim(), "author"));
		}
		item.publicationTitle = "Inside Higher Ed";
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.insidehighered.com/admissions/article/2021/10/08/jury-convicts-parents-admissions-scandal-case",
		"items": [
			{
				"itemType": "webpage",
				"title": "Jury Convicts in Admissions Scandal Case",
				"creators": [
					{
						"firstName": "Scott",
						"lastName": "Jaschik",
						"creatorType": "author"
					}
				],
				"date": "October 8, 2021",
				"abstractNote": "Two wealthy fathers found to have bribed their children into college.",
				"language": "en",
				"url": "https://www.insidehighered.com/admissions/article/2021/10/08/jury-convicts-parents-admissions-scandal-case",
				"websiteTitle": "Inside Higher Ed",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://www.insidehighered.com/news/2019/06/24/theres-movement-better-scientific-posters-are-they-really-better",
		"items": [
			{
				"itemType": "webpage",
				"title": "#betterposter",
				"creators": [
					{
						"firstName": "Colleen",
						"lastName": "Flaherty",
						"creatorType": "author"
					}
				],
				"date": "June 24, 2019",
				"abstractNote": "There's a movement for better posters at science conferences. But are they really better? And how does poster push relate to the ongoing campaign for open science?",
				"language": "en",
				"url": "https://www.insidehighered.com/news/2019/06/24/theres-movement-better-scientific-posters-are-they-really-better",
				"websiteTitle": "Inside Higher Ed",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://www.insidehighered.com/search/results/transparency",
		"items": "multiple"
	}
]
/** END TEST CASES **/
