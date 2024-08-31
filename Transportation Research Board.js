{
	"translatorID": "a1a5a46b-62e1-49ef-8874-ca07ada35c3a",
	"label": "Transportation Research Board",
	"creator": "Abe Jellinek",
	"target": "^https?://(www|trid)\\.trb\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-12-12 20:11:41"
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


function detectWeb(doc, _url) {
	if (attr(doc, 'meta[name="contenttype"]', 'content').toLowerCase().includes('publication')) {
		return "book";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('table a.LinkTitle[href*="/Blurbs/"]');
	if (!rows.length) {
		rows = doc.querySelectorAll('#recordListContainer .recordTitle a');
	}
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (title.includes('TR News')) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (items) {
			await Promise.all(
				Object.keys(items)
					.map(url => requestDocument(url).then(scrape))
			);
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	if (url.includes('//trid.trb.org')) {
		let id = url.match(/\/View\/(\d+)/)[1];
		let ris = await requestText('https://trid.trb.org/Record/Save', {
			method: 'POST',
			body: `saveFileType=RIS&saveResultIds=${id}`
		});
		
		let translator = Zotero.loadTranslator('import');
		translator.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7'); // RIS
		translator.setString(ris);

		translator.setHandler('itemDone', (_, item) => {
			item.callNumber = item.archiveLocation;
			delete item.archiveLocation;
			item.complete();
		});

		await translator.translate();
	}
	else {
		let loginURL = attr(doc, '.file-container a[href*="record_id"]', 'href');
		let recordID = loginURL.match(/record_id=([^&]+)/)[1];
		let napURL = `https://www.nap.edu/catalog/${recordID}`;
		
		let translator = Zotero.loadTranslator('web');
		// National Academies Press
		translator.setTranslator('f76afa52-0524-440e-98ba-7c0c10a7b693');
		translator.setDocument(await requestDocument(napURL));
		await translator.translate();
		return;
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.trb.org/Publications/Blurbs/178576.aspx",
		"items": [
			{
				"itemType": "book",
				"title": "Socioeconomic Impacts of Automated and Connected Vehicles",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Andrea",
						"lastName": "Ricci"
					},
					{
						"creatorType": "contributor",
						"fieldMode": 1,
						"lastName": "Technical Activities Division"
					},
					{
						"creatorType": "contributor",
						"fieldMode": 1,
						"lastName": "Transportation Research Board"
					},
					{
						"creatorType": "contributor",
						"fieldMode": 1,
						"lastName": "National Academies of Sciences, Engineering, and Medicine"
					}
				],
				"date": "2018-01-10",
				"ISBN": "9780309480062",
				"extra": "DOI: 10.17226/25359",
				"libraryCatalog": "National Academies Press",
				"place": "Washington, D.C.",
				"publisher": "Transportation Research Board",
				"url": "https://www.nap.edu/catalog/25359",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Transportation and Infrastructure--Economics"
					},
					{
						"tag": "Transportation and Infrastructure--Society"
					},
					{
						"tag": "Transportation and Infrastructure--Vehicles and Equipment"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.trb.org/Publications/PubsACRPResearchResultsDigests.aspx",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://trid.trb.org/View/1957119",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Crash reconstruction based on 3D image techniques, multi-rigid-body reconstruction and optimized genetic algorithm",
				"creators": [
					{
						"lastName": "Wang",
						"firstName": "Jinming",
						"creatorType": "author"
					},
					{
						"lastName": "Li",
						"firstName": "Zhengdong",
						"creatorType": "author"
					},
					{
						"lastName": "Chen",
						"firstName": "Yijiu",
						"creatorType": "author"
					},
					{
						"lastName": "Zou",
						"firstName": "Donghua",
						"creatorType": "author"
					}
				],
				"date": "2022-01",
				"abstractNote": "The Chinese national statistical authority reports approximately 100,000 traffic fatalities annual, and police must identify the responsible driver for each accident. THe analysis of traffic accidents depends on the forensic experts. Multi-body system simulations (MBS) have recently become popular for real-world crash reconstruction and evaluating injuries. This dynamic method of analysis depends on accurate accident data, which includes impact position , speed, braking distance, and other factors. THe more detail the data, the more accurate and realistic the simulation results. In this study, the authors present a multi-mode image system using unmanned aerial vehicle (UAV) photogrammetry, structured light scanning, and 3D laser to gather accurate data from the roadway, vehicle and pedestrians. A real accident case was analyzed to verify the effectiveness of the proposed system.",
				"callNumber": "01847212",
				"issue": "1",
				"journalAbbreviation": "Accident Reconstruction Journal",
				"libraryCatalog": "Transportation Research Board",
				"pages": "19-21",
				"publicationTitle": "Accident Reconstruction Journal",
				"url": "https://trid.trb.org/view/1957119",
				"volume": "32",
				"attachments": [],
				"tags": [
					{
						"tag": "China"
					},
					{
						"tag": "Crash analysis"
					},
					{
						"tag": "Crash reconstruction"
					},
					{
						"tag": "Genetic algorithms"
					},
					{
						"tag": "Image analysis"
					},
					{
						"tag": "Photogrammetry"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://trid.trb.org/results.aspx?q=&serial=%22Accident%20Reconstruction%20Journal%22#/View/1957119",
		"items": "multiple"
	}
]
/** END TEST CASES **/
