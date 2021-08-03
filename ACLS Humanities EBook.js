{
	"translatorID": "2553b683-dc1b-4a1e-833a-7a7755326186",
	"label": "ACLS Humanities EBook",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.fulcrum\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-03 01:54:15"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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


function detectWeb(doc, _url) {
	if (doc.querySelector('meta[name="citation_title"]')) {
		return "book";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.document a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(text(row, 'h3'));
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
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		item.libraryCatalog = 'ACLS Humanities EBook';
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
		"url": "https://www.fulcrum.org/concern/monographs/79408038k?locale=en",
		"items": [
			{
				"itemType": "book",
				"title": "Empire, Architecture, and the City: French-Ottoman Encounters, 1830-1914",
				"creators": [
					{
						"firstName": "Zeynep",
						"lastName": "Celik",
						"creatorType": "author"
					}
				],
				"date": "2008",
				"ISBN": "9780295987798",
				"language": "en",
				"libraryCatalog": "ACLS Humanities EBook",
				"publisher": "U of Washington Press",
				"shortTitle": "Empire, Architecture, and the City",
				"url": "https://hdl.handle.net/2027/heb.33994",
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
		"url": "https://www.fulcrum.org/concern/monographs/9z9032224?locale=en",
		"items": [
			{
				"itemType": "book",
				"title": "Black Rock: Mining Folklore of the Pennsylvania Dutch",
				"creators": [
					{
						"firstName": "George",
						"lastName": "Korson",
						"creatorType": "author"
					}
				],
				"date": "1960",
				"ISBN": "9780801803451",
				"language": "en",
				"libraryCatalog": "ACLS Humanities EBook",
				"publisher": "Johns Hopkins UP",
				"shortTitle": "Black Rock",
				"url": "https://hdl.handle.net/2027/heb.33116",
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
		"url": "https://www.fulcrum.org/heb?utf8=%E2%9C%93&press=heb&q=istanbul",
		"items": "multiple"
	}
]
/** END TEST CASES **/
