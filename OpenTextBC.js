{
	"translatorID": "8bdd3e33-87a0-488e-aa06-05bf87bea942",
	"label": "openTextBC",
	"creator": "Marielle Volz",
	"target": "^https?://opentextbc\\.ca/[a-z0-9\\-]+/chapter/[a-z0-9\\-]+",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2021-12-31 15:20:11"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Sebastian Karcher

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

function detectWeb() {
	return "bookSection";
}

function doWeb(doc, url) {
	var translator = Zotero.loadTranslator('web');
	ZU.doGet(url, function () {
		// Embedded Metadata
		translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
		translator.setDocument(doc);
		translator.setHandler("itemDone", function (obj, item) {
			item.itemType = 'bookSection'; // Overwrite journal article
			item.bookTitle = ZU.xpath(doc, '//*[@id="page"]/header/div[2]/nav/h1/a/text()')[0].textContent;
			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://opentextbc.ca/clinicalskills/chapter/4-4-suture-care-and-removal/",
		"items": [
			{
				"itemType":"bookSection",
				"creators":[
					{
						"firstName":"Glynda Rees",
						"lastName":"Doyle",
						"creatorType":"author"
					},
					{
						"firstName":"Jodie Anita",
						"lastName":"McCutcheon",
						"creatorType":"author"
					}
				],
				"tags":[],
				"title":"4.5 Staple Removal",
				"date":"2015-11-23",
				"bookTitle":"Clinical Procedures for Safer Patient Care",
				"publisher":"BCcampus",
				"language":"en",
				"url":"https://opentextbc.ca/clinicalskills/chapter/4-4-suture-care-and-removal/",
				"libraryCatalog":"opentextbc.ca"
			}
		]
	}
]
/** END TEST CASES **/
