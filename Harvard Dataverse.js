{
	"translatorID": "aedf3fb0-9a50-47b3-ba2f-3206552b82a9",
	"label": "Harvard Dataverse",
	"creator": "Abe Jellinek",
	"target": "^https?://dataverse\\.harvard\\.edu/data(verse|set)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-04 18:36:42"
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


function detectWeb(doc, url) {
	if (url.includes('/dataset.xhtml')) {
		return "document";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.datasetResult a[href*="/dataset.xhtml"]');
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
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		item.libraryCatalog = 'Harvard Dataverse';
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = 'document';
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/3OUPKS",
		"items": [
			{
				"itemType": "document",
				"title": "Survey seed production and seed contract",
				"creators": [
					{
						"firstName": "Prakashan",
						"lastName": "Veettil",
						"creatorType": "author"
					}
				],
				"date": "2021-08-04",
				"abstractNote": "The data is collected as part of a seed contract experiment conducted in Telengana state, India",
				"extra": "Type: dataset\nDOI: 10.7910/DVN/3OUPKS",
				"language": "en",
				"libraryCatalog": "Harvard Dataverse",
				"publisher": "Harvard Dataverse",
				"url": "https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/3OUPKS",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Agricultural Sciences"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dataverse.harvard.edu/dataverse/harvard?q=chocolate",
		"items": "multiple"
	}
]
/** END TEST CASES **/
