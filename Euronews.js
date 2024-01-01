{
	"translatorID": "7a5db912-ded3-4290-9c35-912e0218f6a3",
	"label": "Euronews",
	"creator": "Andy Kwok",
	"target": "^https?://(www\\.)?euronews\\.com",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-12-27 05:55:17"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 YOUR_NAME <- TODO

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
	return 'journalArticle';
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// TODO: adjust the CSS selector
	var rows = doc.querySelectorAll('h2 > a.title[href*="/article/"]');
	for (let row of rows) {
		// TODO: check and maybe adjust
		let href = row.href;
		// TODO: check and maybe adjust
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		// TODO adjust if needed:
		item.section = 'News';
		
		if (item.publicationTitle == null) {
			item.publicationTitle = 'Euronews';	
		}

		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'journalArticle';
	// TODO map additional meta tags here, or delete completely
	em.addCustomFields({
		'twitter:description': 'abstractNote'
	});
	await em.doWeb(doc, url);
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.euronews.com/next/2023/12/26/inside-the-worlds-first-reactor-that-will-power-earth-using-the-same-nuclear-reaction-as-t",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Inside the world’s first reactor that could produce unlimited energy",
				"creators": [],
				"date": "2023-12-26",
				"abstractNote": "We go behind the scenes at the world’s largest nuclear fusion device attempting to harness energy from the same reaction that powers the Sun and stars.",
				"language": "en",
				"libraryCatalog": "www.euronews.com",
				"publicationTitle": "Euronews",
				"url": "https://www.euronews.com/next/2023/12/26/inside-the-worlds-first-reactor-that-will-power-earth-using-the-same-nuclear-reaction-as-t",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Nuclear research"
					},
					{
						"tag": "climate change"
					},
					{
						"tag": "energy transition"
					},
					{
						"tag": "nuclear fusion"
					},
					{
						"tag": "nuclear reactor"
					},
					{
						"tag": "scientific research"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
