{
	"translatorID": "00d5236c-ce1f-484b-9552-da8e2f10eee4",
	"label": "Library Hub Discover",
	"creator": "Vincent Carret",
	"target": "^https?://(www\\.)?discover\\.libraryhub\\.jisc\\.ac\\.uk/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-12-11 11:42:31"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Vincent Carret
	
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

// attr()/text() v2
// eslint-disable-next-line
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}

var typeMapping = {
	"book": "book",
	"visual" : "artwork",
	"map": "map",
	"audio": "audioRecording",
	"periodical": "document",
	"mixed-material": "document",
	"music-score": "document"
};

function detectWeb(doc, _url) {
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	else {
		item_type = text(doc, 'div.record-details__type');
		return typeMapping[item_type];
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll("div[prefix='schema: http://schema.org/ dct:http://purl.org/dc/terms/']");
	if (checkOnly && rows.length > 1) return true;
	else if (checkOnly && rows.length <= 1) return false;
	for (let row of rows) {
		let href = "/search?id=" + row.getAttribute('resource').split('/')[4] + "&format=mods";
		let title = ZU.trimInternal(text(row, 'div.record-details__title a'));
		if (title.endsWith(" /")) title = title.slice(0, -2);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) {
				for (let href of Object.keys(items)) scrape(href);
			}
		});
	}
	else {
		var row = doc.querySelector("div[prefix='schema: http://schema.org/ dct:http://purl.org/dc/terms/']");
		let href = "/search?id=" + row.getAttribute('resource').split('/')[4] + "&format=mods";
		scrape(href);
	}
}

function scrape(url) {
	ZU.doGet(url, function (text) {
		var translator = Zotero.loadTranslator('import');
		translator.setTranslator('0e2235e7-babf-413c-9acf-f27cce5f059c');
		translator.setString(text);
		translator.translate();
	})
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://discover.libraryhub.jisc.ac.uk/search?q=test",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://discover.libraryhub.jisc.ac.uk/search?q=test%20sound&rn=1",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "Second sound test.",
				"creators": [],
				"date": "2016",
				"abstractNote": "A sound test record.",
				"archiveLocation": "Wellcome Library; wel",
				"label": "Wellcome test records",
				"language": "English",
				"libraryCatalog": "Library Hub Discover",
				"numberOfVolumes": "1",
				"place": "London",
				"runningTime": "00:00",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://discover.libraryhub.jisc.ac.uk/id/73805859",
		"items": [
			{
				"itemType": "map",
				"title": "The Americas [and] Bird migration in the Americas: produced by the Cartographic Division, National Geographic Society.",
				"creators": [
					{
						"lastName": "National Geographic Society (U.S.)",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "1979",
				"archiveLocation": "British Library; bli",
				"callNumber": "912.7, 912.8",
				"language": "English",
				"libraryCatalog": "Library Hub Discover",
				"place": "Washington, D.C.",
				"publisher": "National Geographic Society",
				"scale": "1:20,000",
				"shortTitle": "The Americas [and] Bird migration in the Americas",
				"attachments": [],
				"tags": [
					{
						"tag": "Birds migration"
					},
					{
						"tag": "Birds migration"
					},
					{
						"tag": "Birds migration"
					}
				],
				"notes": [
					{
						"note": "general: Relief shown by shading. Elevations, depth curves and soundings in meters."
					},
					{
						"note": "general: Political map of the Western Hemisphere backed with pictorial map entitled \"Bird migration in the Americas\"."
					},
					{
						"note": "general: Includes inset map: Physical map of the Americas."
					},
					{
						"note": "general: Issued as Supplement to the National Geographic, August 1979, page 154A, vol. 156, no. 2 – Bird migration."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://discover.libraryhub.jisc.ac.uk/id/64412752",
		"items": [
			{
				"itemType": "document",
				"title": "Which hi-fi.",
				"creators": [],
				"date": "1983",
				"archiveLocation": "British Library; bli",
				"callNumber": "TK7881.7, 621.389/3, 621.389/3, RW 51",
				"language": "English",
				"libraryCatalog": "Library Hub Discover",
				"publisher": "Haymarket Pub.",
				"attachments": [],
				"tags": [
					{
						"tag": "High-fidelity sound recording & reproduction equipment"
					},
					{
						"tag": "High-fidelity sound systems"
					},
					{
						"tag": "Periodicals."
					},
					{
						"tag": "Serials"
					}
				],
				"notes": [
					{
						"note": "date/sequential designation: 84."
					},
					{
						"note": "numbering: Only one issue published."
					},
					{
						"note": "linking entry complexity: Continues: Hi-fi annual and test."
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
