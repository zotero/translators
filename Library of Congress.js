{
	"translatorID": "86c090c5-ad3f-4c54-a1f3-9870942014ac",
	"label": "Library of Congress",
	"creator": "Sebastian Karcher",
	"target": "^https?://search\\.catalog\\.loc\\.gov/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-08-23 18:51:50"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Sebastian Karcher

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
	if (url.includes('/instances/')) {
		let type = text(doc, 'div[class*="__metadata-type"]')
		Z.debug(type)
		switch (type) {
			case "Book":
				return "book";
			case "Cartographic Material":
				return "map";
			case "Audio":
				return "audioRecording";
			default:
				return "book";
		}
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h2 > a[href*="/instances/"]');
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


function getLCCN(doc){
	let lccn = text(doc, '[data-auto="record-lccn-content"]');
	return lccn;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			// There's an internal API, but I'm getting consistent 401 responses
			// url = url.replace("/instances/", "/api/opac-inventory/instances/").replace(/\?.*/, "");
			// Z.debug(url)
			await scrape(await requestDocument(url));
		}
	}
	else {
		let lccn = getLCCN(doc);
		let marcxmlurl = "https://lccn.loc.gov/" + lccn + "/marcxml"
		await scrapeMARC(marcxmlurl);
	}
}

async function scrapeMARC(marcxmlurl) {
	let marcxml = await requestText(marcxmlurl);
	Z.debug(marcxml)
	let translate = Zotero.loadTranslator('import');
		translate.setTranslator('edd87d07-9194-42f8-b2ad-997c4c7deefd');
		translate.setString(marcxml);
		translate.setHandler('itemDone', (_, item) => {});
		[item] = await translate.translate();
		// item.itemType = detectWeb(doc, url);
		item.complete();
}

async function scrape(doc) {
	let lccn = getLCCN(doc);
	let marcxmlurl = "https://lccn.loc.gov/" + lccn + "/marcxml"
	await scrapeMARC(marcxmlurl);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://search.catalog.loc.gov/instances/5f9c256e-151d-5615-ad15-3d2749318cac?option=keyword&query=karcher",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "Praxis des Beton- und Stahlbetonbaus: Wissensgrundlagen für die Baustelle und das Ingenieurbüro",
				"creators": [
					{
						"firstName": "Gustav",
						"lastName": "Kärcher",
						"creatorType": "author"
					}
				],
				"date": "1952",
				"callNumber": "TA681 .K25",
				"libraryCatalog": "Library of Congress",
				"numPages": "200",
				"place": "Stuttgart",
				"publisher": "Franckh",
				"shortTitle": "Praxis des Beton- und Stahlbetonbaus",
				"attachments": [],
				"tags": [
					{
						"tag": "Concrete construction"
					},
					{
						"tag": "Reinforced concrete construction"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
