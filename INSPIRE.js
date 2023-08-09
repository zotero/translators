{
	"translatorID": "17b1a93f-b342-4b54-ad50-08ecc26e0ac3",
	"label": "INSPIRE",
	"creator": "Abe Jellinek",
	"target": "^https?://inspirehep\\.net/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-04-06 18:53:02"
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
	if (url.includes('/literature')) {
		if (doc.querySelector('meta[name="citation_title"]')) {
			return "journalArticle";
		}
		else if (getSearchResults(doc, true)) {
			return "multiple";
		}
		else {
			Z.monitorDOMChanges(doc.querySelector('#root'));
		}
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.result-item-title[href*="/literature"]');
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
	var bibUrl = url.replace('/literature/', '/api/literature/');
	ZU.doGet(bibUrl, function (ris) {
		let translator = Zotero.loadTranslator("import");
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		translator.setString(ris);
		translator.setHandler("itemDone", function (obj, item) {
			for (let tag of doc.querySelectorAll('.ant-tag')) {
				item.tags.push({ tag: tag.textContent.trim() });
			}
			
			for (let action of doc.querySelectorAll('.__UserAction__ a')) {
				if (/\bpdf\b/i.test(action.textContent)) {
					item.attachments.push({
						title: 'Full Text PDF',
						mimeType: 'application/pdf',
						url: action.href
					});
				}
			}
			
			item.complete();
		});
		translator.translate();
	}, null, null, { Accept: 'application/x-bibtex' });
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://inspirehep.net/literature?sort=mostrecent&size=25&page=1&q=find%20plasma%20light",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://inspirehep.net/literature/1284987",
		"defer": true,		
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Electromagnetic Radiation in Hot QCD Matter: Rates, Electric Conductivity, Flavor Susceptibility and Diffusion",
				"creators": [
					{
						"firstName": "Chang-Hwan",
						"lastName": "Lee",
						"creatorType": "author"
					},
					{
						"firstName": "Ismail",
						"lastName": "Zahed",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"DOI": "10.1103/PhysRevC.90.025204",
				"issue": "2",
				"itemID": "Lee:2014pwa",
				"libraryCatalog": "INSPIRE",
				"pages": "025204",
				"publicationTitle": "Phys. Rev. C",
				"shortTitle": "Electromagnetic Radiation in Hot QCD Matter",
				"volume": "90",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "25.75.Cj"
					},
					{
						"tag": "25.75.Dw"
					},
					{
						"tag": "25.75.Gz"
					},
					{
						"tag": "25.75.Nq"
					},
					{
						"tag": "conductivity: electric"
					},
					{
						"tag": "quantum chromodynamics: matter"
					},
					{
						"tag": "quark gluon: interaction"
					},
					{
						"tag": "quark gluon: plasma"
					},
					{
						"tag": "radiation: electromagnetic"
					},
					{
						"tag": "symmetry: chiral"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://inspirehep.net/literature/1282171",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Relativistically induced transparency acceleration of light ions by an ultrashort laser pulse interacting with a heavy-ion-plasma density gradient",
				"creators": [
					{
						"firstName": "Aakash A.",
						"lastName": "Sahai",
						"creatorType": "author"
					},
					{
						"firstName": "F. S.",
						"lastName": "Tsung",
						"creatorType": "author"
					},
					{
						"firstName": "A. R.",
						"lastName": "Tableman",
						"creatorType": "author"
					},
					{
						"firstName": "W. B.",
						"lastName": "Mori",
						"creatorType": "author"
					},
					{
						"firstName": "T. C.",
						"lastName": "Katsouleas",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"DOI": "10.1103/PhysRevE.88.043105",
				"issue": "4",
				"itemID": "Sahai:2013tih",
				"libraryCatalog": "INSPIRE",
				"pages": "043105",
				"publicationTitle": "Phys. Rev. E",
				"volume": "88",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "52.38.Kd"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
