{
	"translatorID": "2a1cafb9-6f61-48d3-b621-c3265fde9eba",
	"label": "Harvard Caselaw Access Project",
	"creator": "Franklin Pezzuti Dyer",
	"target": "^https://(cite\\.)?case\\.law",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-01-17 01:22:49"
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


function detectWeb(doc, _url) {
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
	let caseJson = await requestJSON(apiUrl);
	let pdfUrl = caseJson.frontend_pdf_url;

	let caseItem = new Zotero.Item("case");
	caseItem.language = "en-US";
	caseItem.url = url;

	let caseName = caseJson.name;
	let abbrvCaseName = caseJson.name_abbreviation;
	let caseNameParts = caseName.split(' ');
	let caseBody = text(doc, 'casebody');
	for (let i = 0; i < caseNameParts.length; i++) { // Use context to fix capitalization in the title
		let word = caseNameParts[i];
		let uppercaseWord = word.toUpperCase();
		let searchWord = uppercaseWord.replace(/[.,?]$/g, "");
		let titleWord = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

		if (word != uppercaseWord) continue; // We only need to fix words that are all-caps
		if (abbrvCaseName.includes(searchWord)) continue; // If abbreviated title contains all-caps version, probably an acronym
		if (caseBody.includes(searchWord)) continue; // If case body contains all-caps version, probably an acronym
		caseNameParts[i] = titleWord; // Otherwise, use title-case
	}
	caseName = caseNameParts.join(' ');

	caseItem.caseName = caseName;
	caseItem.shortTitle = abbrvCaseName;
	caseItem.court = caseJson.court.name;
	caseItem.dateDecided = caseJson.decision_date;
	caseItem.docketNumber = caseJson.docket_number.replace(/[Nn]o\.?\s*/g, "");
	caseItem.reporter = caseJson.reporter.full_name;
	caseItem.reporterVolume = caseJson.volume.volume_number;
	caseItem.attachments = [{
		title: "Full Text PDF",
		url: pdfUrl,
		mimeType: "application/pdf"
	}];
	
	let parallelCitations = caseJson.citations.filter(c => c.type == "parallel").map(c => c.cite);
	if (parallelCitations.length == 0) {
		caseItem.history = "";
	}
	else {
		caseItem.history = parallelCitations.join(",");
	}

	caseItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://case.law/search/#/cases?search=abc&page=1&ordering=relevance",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://cite.case.law/am-samoa/2/3/",
		"items": [
			{
				"itemType": "case",
				"caseName": "Pasa of Fagatogo, Plaintiff v. Faiisiota of Faganeanea, Defendant",
				"creators": [],
				"dateDecided": "1947-02-07",
				"court": "High Court of American Samoa",
				"docketNumber": "2-1944",
				"language": "en-US",
				"reporter": "American Samoa Reports",
				"reporterVolume": "2",
				"shortTitle": "Pasa v. Faiisiota",
				"url": "https://cite.case.law/am-samoa/2/3/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://cite.case.law/pa-d-c2d/51/424/",
		"items": [
			{
				"itemType": "case",
				"caseName": "ABC Juvenile",
				"creators": [],
				"dateDecided": "1971-02-19",
				"court": "Adams County Court of Common Pleas",
				"docketNumber": "47",
				"language": "en-US",
				"reporter": "Pennsylvania District and County Reports",
				"reporterVolume": "51",
				"url": "https://cite.case.law/pa-d-c2d/51/424/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://cite.case.law/doug/1/450/",
		"items": [
			{
				"itemType": "case",
				"caseName": "Dousman v. O'Malley",
				"creators": [],
				"dateDecided": "1844-01",
				"court": "Michigan Supreme Court",
				"language": "en-US",
				"reporter": "Reports of cases argued and determined in the Supreme Court of the state of Michigan",
				"reporterVolume": "1",
				"url": "https://cite.case.law/doug/1/450/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://cite.case.law/so-2d/57/40/9903854/",
		"items": [
			{
				"itemType": "case",
				"caseName": "Tucker v. Central Motors, Inc.",
				"creators": [],
				"dateDecided": "1952-01-14",
				"court": "Louisiana Supreme Court",
				"docketNumber": "40041",
				"history": "220 La. 510",
				"language": "en-US",
				"reporter": "Southern Reporter, Second Series",
				"reporterVolume": "57",
				"url": "https://cite.case.law/so-2d/57/40/9903854/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
