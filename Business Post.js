{
	"translatorID": "ea73480b-197b-4cdb-b380-bf08a840eb5f",
	"label": "Business Post",
	"creator": "VWF",
	"target": "^https?://www\\.?.businesspost\\.ng/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-12-06 13:14:47"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 VWF

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

function isIndexURL(url) {
	return url && (url.includes('/tag/') || url.includes('/category/'));
}

function detectWeb(doc, url) {
	const contentType = attr(doc, 'meta[property="og:type"]', 'content');

	if (contentType === 'article') {
		return 'newspaperArticle';
	}

	if (isIndexURL(url)) {
		return 'multiple';
	}

	return false;
}

function doWeb(doc, url) {
	const translator = Zotero.loadTranslator('web');

	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', (obj, item) => {
		item.itemType = detectWeb(doc, url);

		// Additional configs for item object

		item.publicationTitle = 'Business Post';

		item.place = 'Nigeria';

		item.complete();
	});

	translator.getTranslatorObject((trans) => {
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://businesspost.ng/economy/food-concepts-return-nasd-otc-exchange-to-danger-zone/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Food Concepts Return NASD OTC Exchange to Danger Zone",
				"creators": [
					{
						"firstName": "Adedapo",
						"lastName": "Adesanya",
						"creatorType": "author"
					}
				],
				"date": "2025-12-05T08:26:48+00:00",
				"abstractNote": "By Adedapo Adesanya Food Concepts Plc neutralized the gains recorded by three securities, returning the NASD",
				"language": "en",
				"libraryCatalog": "businesspost.ng",
				"place": "Nigeria",
				"publicationTitle": "Business Post",
				"section": "Economy",
				"url": "https://businesspost.ng/economy/food-concepts-return-nasd-otc-exchange-to-danger-zone/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "NASD"
					},
					{
						"tag": "NASD OTC Exchange"
					},
					{
						"tag": "OTC Exchange"
					},
					{
						"tag": "nasd index"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://businesspost.ng/general/ihs-nigeria-raises-awareness-on-gender-based-violence/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "IHS Nigeria Raises Awareness on Gender-Based Violence",
				"creators": [
					{
						"firstName": "Modupe",
						"lastName": "Gbadeyanka",
						"creatorType": "author"
					}
				],
				"date": "2025-12-02T15:55:28+00:00",
				"abstractNote": "By Modupe Gbadeyanka An awareness walk was recently held by IHS Nigeria on gender-based violence on the",
				"language": "en",
				"libraryCatalog": "businesspost.ng",
				"place": "Nigeria",
				"publicationTitle": "Business Post",
				"section": "General",
				"url": "https://businesspost.ng/general/ihs-nigeria-raises-awareness-on-gender-based-violence/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "IHS Nigeria"
					},
					{
						"tag": "IHS Nigeria gender-based violence"
					},
					{
						"tag": "gender-based violence"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
