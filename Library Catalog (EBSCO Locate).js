{
	"translatorID": "86c090c5-ad3f-4c54-a1f3-9870942014ac",
	"label": "Library Catalog (EBSCO Locate)",
	"creator": "Sebastian Karcher and Abe Jellinek",
	"target": "/search\\?|/instances/[^/]+\\?",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 260,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-08-28 03:43:21"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Sebastian Karcher and Abe Jellinek

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
	if (attr(doc, 'meta[name="description"]', 'content') !== 'EBSCO Locate') {
		return false;
	}
	if (getRecordID(url)) {
		let type = text(doc, 'div[class*="__metadata-type"]');
		switch (type) {
			case "Book":
				return "book";
			case "Cartographic Material":
				return "map";
			case "Audio":
				return "audioRecording";
			case "Video":
			case "Films, Videos":
				return "videoRecording";
			case "Image":
				return "artwork";
			case "Archive/Manuscript":
			case "Textual Manuscript":
				return "manuscript";
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
	if (!scriptURL) return null;
	let scriptText = await requestText(scriptURL);
	let okapiTenant = scriptText.match(/"X-Okapi-Tenant":("[^"]+")/)?.[1];
	if (!okapiTenant) return null;
	return JSON.parse(okapiTenant);
}

async function doWeb(doc, url) {
	let okapiTenant = await getOkapiTenant(doc);
	if (!okapiTenant) {
		throw new Error('Unable to generate Okapi tenant');
	}

	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(url, okapiTenant);
		}
	}
	else {
		await scrape(url, okapiTenant);
	}
}

async function scrape(url, okapiTenant) {
	url = new URL(url);
	const BASE_URL = url.hostname.includes('locate.ebsco.com')
		? `https://okapi-${url.hostname}`
		: `https://${url.hostname}/api`;
	let recordID = getRecordID(url);

	let marcURL = `${BASE_URL}/opac-inventory/download-instance/${recordID}?utf=true`;
	let headers = {
		Accept: 'application/json',
		'X-Okapi-Tenant': okapiTenant
	};
	
	let marcText;
	let marcRecordJSON;
	
	try {
		marcText = await requestText(marcURL, { headers });
	}
	catch {
		Z.debug('Instance requires X-Okapi-Token - getting one');
		let guestTokenURL = `${BASE_URL}/opac-auth/guest-token`;
		let guestTokenResponse = await request(guestTokenURL, { headers });
		headers['x-okapi-token'] = guestTokenResponse.headers['x-okapi-token'];
		Z.debug('New headers:');
		Z.debug(headers);

		try {
			marcText = await requestText(marcURL, { headers });
		}
		catch {
			Z.debug('Instance disallows MARC downloads - parsing MARC from record JSON');
			let recordURL = `${BASE_URL}/opac-inventory/source-records/${recordID}`;
			let recordJSON = await requestJSON(recordURL, { headers });
			marcRecordJSON = recordJSON.parsedRecord.content;
		}
	}

	let translate = Zotero.loadTranslator('import');
	translate.setTranslator('a6ee60df-1ddc-4aae-bb25-45e0537be973'); // MARC
	let item;
	if (marcText) {
		translate.setString(marcText);
		translate.setHandler('itemDone', () => {});
		[item] = await translate.translate();
	}
	else if (marcRecordJSON) {
		let marc = await translate.getTranslatorObject();
		let record = new marc.record();
		record.leader = marcRecordJSON.leader;

		let fields = marcRecordJSON.fields.map(obj => Object.entries(obj)[0]);
		for (let [field, value] of fields) {
			if (typeof value === 'string') {
				record.addField(field, '  ', value);
			}
			else {
				let { ind1, ind2, subfields } = value;
				let joinedSubfields = subfields
					.map(obj => Object.entries(obj)[0])
					.map(([subfield, value]) => marc.subfieldDelimiter + subfield + value)
					.join('');
				record.addField(field, ind1 + ind2, joinedSubfields);
			}
		}

		item = new Zotero.Item();
		record.translate(item);
	}
	else {
		throw new Error('No record available');
	}
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
				"libraryCatalog": "Library Catalog (EBSCO Locate)",
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
	},
	{
		"type": "web",
		"url": "https://usu.locate.ebsco.com/instances/b7dbef48-705a-5c2e-96f6-cf44ab7d3bae?option=keyword&pageNumber=1&query=test&recordsPerPage=25",
		"items": [
			{
				"itemType": "book",
				"title": "How to pass armed forces tests",
				"creators": [
					{
						"lastName": "College Publishing Corporation, Brooklyn",
						"creatorType": "editor",
						"fieldMode": 1
					}
				],
				"date": "1967",
				"callNumber": "UB336 .C64",
				"extra": "OCLC: 00712430",
				"libraryCatalog": "Library Catalog (EBSCO Locate)",
				"numPages": "244",
				"place": "New York",
				"publisher": "College Publishing Corporation",
				"series": "Score-high exam book",
				"seriesNumber": "102",
				"attachments": [],
				"tags": [
					{
						"tag": "Armed Forces Examinations"
					},
					{
						"tag": "United States"
					}
				],
				"notes": [
					{
						"note": "\"A Cowles educational book.\""
					},
					{
						"note": "The self test -- The time test -- The pressure test -- The distraction test -- The lot test -- The test of being misunderstood -- The confrontation test -- The money test -- The disappointment test -- The offense test -- The gratitude test -- The perfect storm"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://usu.locate.ebsco.com/search?option=keyword&pageNumber=1&query=test&recordsPerPage=25",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://nalis.locate.ebsco.com/instances/0cf96b8b-80ee-5c06-94bf-23240ee6b0ef?option=keyword&pageNumber=1&query=dracula&recordsPerPage=25",
		"items": [
			{
				"itemType": "book",
				"title": "Dracula and Frankenstein are friends",
				"creators": [
					{
						"firstName": "Katherine Brown",
						"lastName": "Tegen",
						"creatorType": "author"
					},
					{
						"firstName": "Doug",
						"lastName": "Cushman",
						"creatorType": "author"
					}
				],
				"date": "2003",
				"ISBN": "9780060001155 9780060001162",
				"abstractNote": "Dracula and Frankenstein are friends until they both decide to have a Halloween party and Dracula misplaces Frankenstein's invitations",
				"edition": "1st ed",
				"libraryCatalog": "Library Catalog (EBSCO Locate)",
				"numPages": "1",
				"place": "New York",
				"publisher": "HarperCollins",
				"attachments": [],
				"tags": [
					{
						"tag": "Fiction"
					},
					{
						"tag": "Fiction"
					},
					{
						"tag": "Fiction"
					},
					{
						"tag": "Fiction"
					},
					{
						"tag": "Friendship"
					},
					{
						"tag": "Halloween"
					},
					{
						"tag": "Monsters"
					},
					{
						"tag": "Parties"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://nalis.locate.ebsco.com/search?option=keyword&pageNumber=1&query=dracula&recordsPerPage=25",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
