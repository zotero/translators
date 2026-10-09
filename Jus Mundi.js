{
	"translatorID": "1897d02f-a359-4a29-a5fe-2b9e0a42b70c",
	"label": "Jus Mundi",
	"creator": "Jonas Zaugg",
	"target": "^https://jusmundi\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-10-01 21:56:51"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Jonas Zaugg

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
	if (url.includes('/document/decision')) {
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
	var rows = doc.querySelectorAll('.result');

	for (let row of rows) {
		let href = attr(row, 'h2 > a', 'href');
		let title = text(row, 'h2 > a') + " - " + text(row, 'h4');
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
		await Promise.all(Object.keys(items).map(async (url) => {
			let doc = await requestDocument(url);
			scrape(doc, url);
		}));
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	// As Jus Mundi is heavily paywalled, the only type that can be scraped, for now, is decisions
	if (!url.includes('/document/decision')) return;

	let item = new Z.Item('case');

	let title = text(doc, '#generalTitle');
	let parties = attr(doc, '#generalTitle', 'data-copyreftitre');
	let caseRef = attr(doc, '#generalTitle', 'data-copyrefnum');
	let date = ZU.strToISO(attr(doc, '#listDocuments .listofdoc-level.active', 'data-copyrefdate'));
	let docTitle = attr(doc, 'div[data-title-in-locale]', 'data-title-in-locale');

	item.caseName = title;
	item.extra = "tex.parties: " + parties;
	item.history = caseRef;
	item.dateDecided = date;
	item.court = docTitle;

	//let info = text(doc, 'dl.metadata-group__info');

	let originalPDF = attr(doc, '#a-pdf-tab', 'href');
	let jusMundiPDF = attr(doc, 'a.btn-pdf-creator-icon', 'href');

	//let docItems = doc.querySelectorAll('#listDocuments > li');
	//let relatedDocs = ZU.getItemArray(doc, docItems);

	item.attachments.push({
		title: "Original PDF",
		mimeType: "application/pdf",
		url: originalPDF
	});

	item.attachments.push({
		title: "Jus Mundi PDF",
		mimeType: "application/pdf",
		url: jusMundiPDF
	});

	item.url = url;

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://jusmundi.com/fr/document/decision/fr-algerian-energy-company-spa-v-1-tlemcen-desalination-investment-company-sas-2-hyflux-limited-and-3-malakoff-corporation-berhad-arret-de-la-cour-dappel-de-paris-21-07296-tuesday-13th-june-2023#decision_51845",
		"items": [
			{
				"itemType": "case",
				"caseName": "AEC v. TDIC, Hyflux and MCB",
				"creators": [],
				"dateDecided": "2023",
				"court": "Arrêt de la Cour d'appel de Paris (Pôle 5 - Chambre 16) 21/07296",
				"extra": "tex.parties: Algerian Energy Company SPA v. (1) Tlemcen Desalination Investment Company SAS, (2) Hyflux Limited and (3) Malakoff Corporation Berhad",
				"history": "ICC Case No. 24250/DDA",
				"url": "https://jusmundi.com/fr/document/decision/fr-algerian-energy-company-spa-v-1-tlemcen-desalination-investment-company-sas-2-hyflux-limited-and-3-malakoff-corporation-berhad-arret-de-la-cour-dappel-de-paris-21-07296-tuesday-13th-june-2023#decision_51845",
				"attachments": [
					{
						"title": "Original PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Jus Mundi PDF",
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
		"url": "https://jusmundi.com/en/document/decision/en-shell-western-supply-and-trading-v-aiteo-eastern-e-p-company-limited-judgment-of-the-high-court-of-justice-of-england-and-wales-2022-ewhc-768-friday-1st-april-2022#decision_22071",
		"items": [
			{
				"itemType": "case",
				"caseName": "Shell Western Supply and Trading, Africa Finance Corporation and others v. Aiteo Eastern E&P",
				"creators": [],
				"dateDecided": "2022-04-01",
				"court": "Judgment of the High Court of Justice of England and Wales [2022] EWHC 768",
				"extra": "tex.parties: Shell Western Supply and Trading, Africa Finance Corporation, Ecobank Nigeria Limited, Fidelity Bank Plc, First Bank of Nigeria Limited, Guaranty Trust Bank Plc, Sterling Bank Plc, Union Bank of Nigeria Plc, and Zenith Bank Plc v. Aiteo Eastern E&P Company Limited",
				"url": "https://jusmundi.com/en/document/decision/en-shell-western-supply-and-trading-v-aiteo-eastern-e-p-company-limited-judgment-of-the-high-court-of-justice-of-england-and-wales-2022-ewhc-768-friday-1st-april-2022#decision_22071",
				"attachments": [
					{
						"title": "Original PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Jus Mundi PDF",
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
		"url": "https://jusmundi.com/en/document/decision/en-icc-case-id-no-1128-monday-1st-april-2019#decision_8046",
		"items": [
			{
				"itemType": "case",
				"caseName": "SSK v. TRT",
				"creators": [],
				"dateDecided": "2021-03-18",
				"court": "Final Award",
				"extra": "tex.parties: SSK Ingeniería y Construcción S.A.C v. Técnicas Reunidas de Talara S.A.C",
				"history": "ICC Case No. 23711/JPA",
				"url": "https://jusmundi.com/en/document/decision/en-icc-case-id-no-1128-monday-1st-april-2019#decision_8046",
				"attachments": [
					{
						"title": "Original PDF",
						"mimeType": "application/pdf",
						"url": ""
					},
					{
						"title": "Jus Mundi PDF",
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
		"url": "https://jusmundi.com/en/search?query=sulamerica&page=1&lang=en",
		"items": "multiple"
	}
]
/** END TEST CASES **/
