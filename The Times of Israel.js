{
	"translatorID": "bd3fc4f7-e8ed-49b5-a243-f3c3ab514a5e",
	"label": "The Times of Israel",
	"creator": "Bardi Harborow",
	"target": "https?://(www\\.)?timesofisrael\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-03-31 02:26:52"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Bardi Harborow

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
	const openGraphType = attr(doc, 'meta[property="og:type"]', 'content');
	if (openGraphType === 'article') {
		return 'newspaperArticle';
	}

	return false;
}

async function doWeb(doc, url) {
	await scrape(doc, url);
}

async function scrape(doc, url = doc.location.href) {
	const translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', (_obj, item) => {
		item.publicationTitle = 'The Times of Israel';
		item.ISSN = '0040-7909';

		// Detect attribution to staff writers.
		item.creators = item.creators.filter(value => value.lastName !== "AGENCIES");

		// Attempt to extract publication date.
		try {
			const json = JSON.parse(text(doc, 'script[type="application/ld+json"]'));
			item.date = json['@graph'][0].datePublished.split('T')[0];
		}
		catch (error) {
			Z.debug(error);
		}

		item.complete();
	});

	const em = await translator.getTranslatorObject();
	em.itemType = 'newspaperArticle';

	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.timesofisrael.com/a-global-anti-depressant-gaza-strip-gets-its-first-cat-cafe/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "A ‘global anti-depressant’: Gaza Strip gets its first cat cafe",
				"creators": [],
				"date": "2023-08-19",
				"ISSN": "0040-7909",
				"abstractNote": "Psychologist says Meow Cafe can be a source of therapy for Palestinians scarred by wars and other hardships, citing 'positive psychological impact' from interacting with animals",
				"language": "en-US",
				"libraryCatalog": "www.timesofisrael.com",
				"publicationTitle": "The Times of Israel",
				"shortTitle": "A ‘global anti-depressant’",
				"url": "https://www.timesofisrael.com/a-global-anti-depressant-gaza-strip-gets-its-first-cat-cafe/",
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
		"url": "https://www.timesofisrael.com/in-biggest-exit-in-israeli-history-google-buying-cyber-unicorn-wiz-for-32-billion/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "In biggest exit in Israeli history, Google buys cyber unicorn Wiz for $32 billion",
				"creators": [
					{
						"firstName": "Sharon Wrobel NEW! Get email alerts when this author publishes a new article You will receive email alerts from this author Manage alert preferences on your profile page You will no longer receive email alerts from this author Manage alert preferences on your profile",
						"lastName": "page",
						"creatorType": "author"
					}
				],
				"date": "2025-03-18",
				"ISSN": "0040-7909",
				"abstractNote": "With the acquisition of Wiz, Google's parent company wants to strengthen its cyber offerings to better compete in the cloud computing race against tech giants Amazon and Microsoft",
				"language": "en-US",
				"libraryCatalog": "www.timesofisrael.com",
				"publicationTitle": "The Times of Israel",
				"url": "https://www.timesofisrael.com/in-biggest-exit-in-israeli-history-google-buying-cyber-unicorn-wiz-for-32-billion/",
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
