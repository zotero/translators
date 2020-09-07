{
	"translatorID": "7f74d823-d2ba-481c-b717-8b12c90ed874",
	"label": "Bangkok Post",
	"creator": "Matt Mayer",
	"target": "https://www.bangkokpost.com/.*",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-09-07 19:12:01"
}

/*
 * ***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Matt Mayer
	
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


function doWeb(doc, url) {
	scrape(doc, url);
}
function getMetaTag(doc,attr, value, contentattr) {
	const tag = Array.from(doc.getElementsByTagName("meta")).filter(m => m.attributes[attr] && m.attributes[attr].value==value)[0]; 
	if (tag && tag.attributes[contentattr]) {
		return tag.attributes[contentattr].value;
	}
}
function scrape(doc, url) {
	const translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		// Add data for fields that are not covered by Embedded Metadata
		//author name is stored as firstname lastname
		const authorName=getMetaTag(doc,"property","cXenseParse:author","content")
		//date is stored as a timestamp like 2020-09-07T17:37:00+07:00, just extract the YYYY-MM-DD at start
		if (authorName) {
			item.creators= [ZU.cleanAuthor(authorName, "author",false)];
		}

		const date = getMetaTag(doc,"name","cXenseParse:recs:publishtime","content")
		if (date) {
			item.date = date.substr(0,10)
		}
		
		item.publicationTitle = "Bangkok Post"
		
		
		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.itemType = "newspaperArticle";
		trans.doWeb(doc, url);
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.bangkokpost.com/thailand/politics/1981267/house-general-debate-set-for-wednesday",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "House general debate set for Wednesday",
				"creators": [
					{
						"firstName": "Aekarach",
						"lastName": "Sattaburuth",
						"creatorType": "author"
					}
				],
				"date": "2020-09-07",
				"abstractNote": "A general debate without a vote in the House of Representatives has been scheduled for Wednesday for MPs to question the government on the current economic and political crises and suggest ways of solving related problems.",
				"libraryCatalog": "www.bangkokpost.com",
				"publicationTitle": "Bangkok Post",
				"url": "https://www.bangkokpost.com/thailand/politics/1981267/house-general-debate-set-for-wednesday",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "cabinet ministers"
					},
					{
						"tag": "debate"
					},
					{
						"tag": "general debate"
					},
					{
						"tag": "government mps"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.bangkokpost.com/tech/1979315/air-force-satellite-napa-1-launched",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Air force satellite Napa-1 launched",
				"creators": [
					{
						"firstName": "Wassana",
						"lastName": "Nanuam",
						"creatorType": "author"
					}
				],
				"date": "2020-09-03",
				"abstractNote": "The Royal Thai Air Force’s first security satellite, Napa-1, was successfully launched on a European rocket from French Guiana on Thursday morning.",
				"libraryCatalog": "www.bangkokpost.com",
				"publicationTitle": "Bangkok Post",
				"url": "https://www.bangkokpost.com/tech/1979315/air-force-satellite-napa-1-launched",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "French Guiana"
					},
					{
						"tag": "Napa-1"
					},
					{
						"tag": "air force"
					},
					{
						"tag": "launched"
					},
					{
						"tag": "satellite"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
