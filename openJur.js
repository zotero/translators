{
	"translatorID": "a078c90c-c016-4a15-9b1f-40989b1d153e",
	"label": "openJur",
	"creator": "Abe Jellinek",
	"target": "^https?://openjur\\.de/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-10-18 20:30:28"
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
	if (/\/u\/\d+(-[^.]+)?\.html/.test(url)) {
		return "case";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.utitel > a[href*="/u/"]');
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
	let id = url.match(/\/u\/(\d+)/)[1];
	ZU.doGet(`/u/${id}.bib`, function (jsonText) {
		// returned JSON contains trailing comma in object
		jsonText = jsonText.replace(/,\s*}/g, '}');
		let json = JSON.parse(jsonText);

		let item = new Zotero.Item('case');
		// from openJur's recommended citation
		item.caseName = `${json.doctype} vom ${json.date}`;
		item.docketNumber = json.reference;
		item.court = json.court;
		item.dateDecided = ZU.strToISO(json.date);
		item.language = 'de';
		item.url = json.url;
		
		item.attachments.push({
			title: 'Full Text PDF',
			url: `/u/${id}.ppdf`
		});
		
		item.complete();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://openjur.de/u/2360985.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "Beschluss vom 24.09.2021",
				"creators": [],
				"dateDecided": "2021-09-24",
				"court": "LG Osnabrück",
				"docketNumber": "10 Qs 49/21",
				"language": "de",
				"url": "https://openjur.de/u/2360985.html",
				"attachments": [
					{
						"title": "Full Text PDF"
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
		"url": "https://openjur.de/u/2352526.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "Beschluss vom 21.09.2021",
				"creators": [],
				"dateDecided": "2021-09-21",
				"court": "Sächsisches OVG",
				"docketNumber": "6 B 360/21",
				"language": "de",
				"url": "https://openjur.de/u/2352526.html",
				"attachments": [
					{
						"title": "Full Text PDF"
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
		"url": "https://openjur.de/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://openjur.de/suche/?searchPhrase=test",
		"items": "multiple"
	}
]
/** END TEST CASES **/
