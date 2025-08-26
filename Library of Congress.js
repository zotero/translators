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
	"lastUpdated": "2025-08-26 16:36:31"
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


const KNOWN_OKAPI_TENANT = 'ltl1000001';

function detectWeb(doc, url) {
	if (getRecordID(url)) {
		let type = text(doc, 'div[class*="__metadata-type"]');
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

function getRecordID(url) {
	return new URL(url).pathname.match(/\/instances\/([^/]+)/)?.[1];
}

async function getOkapiTenant(doc) {
	let scriptURL = attr(doc, 'script[type="module"][src*="/index-"]', 'src');
	if (!scriptURL) return KNOWN_OKAPI_TENANT;
	let scriptText = await requestText(scriptURL);
	let okapiTenant = scriptText.match(/"X-Okapi-Tenant":("[^"]+")/)?.[1];
	if (!okapiTenant) return KNOWN_OKAPI_TENANT;
	return JSON.parse(okapiTenant);
}

async function doWeb(doc, url) {
	let okapiTenant = await getOkapiTenant(doc);
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(getRecordID(url), okapiTenant);
		}
	}
	else {
		await scrape(getRecordID(url), okapiTenant);
	}
}

async function scrape(recordID, okapiTenant) {
	let marcURL = `/api/opac-inventory/download-instance/${recordID}?utf=true`;
	let marcText = await requestText(marcURL, {
		headers: {
			Accept: 'application/json',
			'X-Okapi-Tenant': okapiTenant
		}
	});

	let translate = Zotero.loadTranslator('import');
	translate.setTranslator('a6ee60df-1ddc-4aae-bb25-45e0537be973'); // MARC
	translate.setString(marcText);
	translate.setHandler('itemDone', () => {});
	let [item] = await translate.translate();
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://search.catalog.loc.gov/instances/5f9c256e-151d-5615-ad15-3d2749318cac?option=keyword&query=karcher",
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
	},
	{
		"type": "web",
		"url": "https://search.catalog.loc.gov/search?option=keyword&pageNumber=1&query=karcher&recordsPerPage=25",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
