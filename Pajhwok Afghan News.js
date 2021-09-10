{
	"translatorID": "db10fe28-b545-408f-a932-5873532f58fc",
	"label": "Pajhwok Afghan News",
	"creator": "Abe Jellinek",
	"target": "^https?://pajhwok\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-16 03:38:53"
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
	if (doc.body.classList.contains('single')) {
		return "newspaperArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h3.story-title > a');
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
		let author = text(doc, '.author-link');
		if (author != 'Pajhwok') {
			item.creators.push(ZU.cleanAuthor(author, 'author'));
		}
		
		if (!item.date) {
			item.date = ZU.strToISO(text(doc, '.publish-date'));
		}
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "newspaperArticle";
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://pajhwok.com/2021/08/15/5-more-provinces-including-nangarhar-fall-to-taliban/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "5 more provinces including Nangarhar fall to Taliban",
				"creators": [
					{
						"firstName": "Javed Hamim",
						"lastName": "Kakar",
						"creatorType": "author"
					}
				],
				"date": "2021-08-15",
				"language": "en-GB",
				"libraryCatalog": "pajhwok.com",
				"url": "https://pajhwok.com/2021/08/15/5-more-provinces-including-nangarhar-fall-to-taliban/",
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
		"url": "https://pajhwok.com/2021/07/01/herat-city-to-be-put-on-world-cultural-heritage-list/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Herat City to be put on World Cultural Heritage List",
				"creators": [
					{
						"firstName": "Hijratullah",
						"lastName": "Kakar",
						"creatorType": "author"
					}
				],
				"date": "2021-07-01",
				"language": "en-GB",
				"libraryCatalog": "pajhwok.com",
				"url": "https://pajhwok.com/2021/07/01/herat-city-to-be-put-on-world-cultural-heritage-list/",
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
		"url": "https://pajhwok.com/category/environment/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://pajhwok.com/ps/2021/08/10/if-kabuls-groundwater-pollution-is-not-stopped-disaster-will-ensue/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "«که د کابل ښار تر ځمکې لاندې اوبو د ککړتیا مخه ونه نیول شي ناورین رامنځته کېږي»",
				"creators": [
					{
						"firstName": "عبدالباسط",
						"lastName": "کروخیل",
						"creatorType": "author"
					}
				],
				"date": "2021-08-10",
				"language": "ps",
				"libraryCatalog": "pajhwok.com",
				"url": "https://pajhwok.com/ps/2021/08/10/if-kabuls-groundwater-pollution-is-not-stopped-disaster-will-ensue/",
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
	}
]
/** END TEST CASES **/
