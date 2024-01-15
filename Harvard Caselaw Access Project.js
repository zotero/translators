{
	"translatorID": "2a1cafb9-6f61-48d3-b621-c3265fde9eba",
	"label": "Harvard Caselaw Access Project",
	"creator": "Franklin Pezzuti Dyer",
	"target": "^https://(.*\\.)*case\\.law",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-01-15 23:37:16"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Franklin Pezzuti Dyer

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
	if (doc.querySelectorAll('.case-container').length > 0) {
		return 'case';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('div.result-title > div > a');
	for (let row of rows) {
		let href = row.href;
		Z.debug(href);
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
	let apiUrl = attr(doc, "a[href*='api.case.law/v1/cases/']", 'href');
	let caseText = await requestText(apiUrl);
	let caseJson = JSON.parse(caseText);

	let caseItem = new Zotero.Item("case");
	caseItem.language = "en-US";
	caseItem.url = url;

	caseItem.caseName = caseJson["name"];
	caseItem.shortTitle = caseJson["name_abbreviation"];
	caseItem.court = caseJson["court"]["name"];
	caseItem.dateDecided = caseJson["decision_date"];
	caseItem.docketNumber = caseJson["docket_number"];
	caseItem.reporter = caseJson["reporter"]["full_name"];
	caseItem.reporterVolume = caseJson["volume"]["volume_number"];

	caseItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://cite.case.law/am-samoa/2/3/",
		"items": [
			{
				"itemType": "case",
				"caseName": "PASA of FAGATOGO, Plaintiff v. FAIISIOTA of FAGANEANEA, Defendant",
				"creators": [],
				"dateDecided": "1947-02-07",
				"court": "High Court of American Samoa",
				"docketNumber": "No. 2-1944",
				"language": "en-US",
				"reporter": "American Samoa Reports",
				"reporterVolume": "2",
				"shortTitle": "Pasa v. Faiisiota",
				"url": "https://cite.case.law/am-samoa/2/3/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://cite.case.law/so-2d/57/40/9903854/",
		"items": [
			{
				"itemType": "case",
				"caseName": "TUCKER v. CENTRAL MOTORS, Inc.",
				"creators": [],
				"dateDecided": "1952-01-14",
				"court": "Louisiana Supreme Court",
				"docketNumber": "No. 40041",
				"language": "en-US",
				"reporter": "Southern Reporter, Second Series",
				"reporterVolume": "57",
				"shortTitle": "Tucker v. Central Motors, Inc.",
				"url": "https://cite.case.law/so-2d/57/40/9903854/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://cite.case.law/pa-d-c2d/51/424/",
		"items": [
			{
				"itemType": "case",
				"caseName": "ABC Juvenile",
				"creators": [],
				"dateDecided": "1971-02-19",
				"court": "Adams County Court of Common Pleas",
				"docketNumber": "no. 47",
				"language": "en-US",
				"reporter": "Pennsylvania District and County Reports",
				"reporterVolume": "51",
				"url": "https://cite.case.law/pa-d-c2d/51/424/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},

	{
		"type": "web",
		"url": "https://case.law/search/#/cases?search=abc&page=1&ordering=relevance",
		"items": "multiple"
	}
]
/** END TEST CASES **/
