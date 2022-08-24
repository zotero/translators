{
	"translatorID": "f08fe747-e042-49a0-87b3-7bdbbfec1219",
	"label": "LookUs",
	"creator": "Abe Jellinek",
	"target": "/jvi.aspx[^#]*[?&](volume|issue|un)=",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 250,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-14 19:35:09"
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
	if (doc.querySelector('.siteArticleShare a[href*="/gencitation.asp?"]')) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('td > a[href*="jvi.aspx?"][href*="un="]');
	for (let row of rows) {
		// TODO: check and maybe adjust
		let href = row.href;
		// TODO: check and maybe adjust
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
	let risURL = attr(doc, '.siteArticleShare a[href*="/gencitation.asp?"][href*="format=RIS"]', 'href');
	if (!risURL) {
		risURL = attr(doc, '.siteArticleShare a[href*="/gencitation.asp?"]', 'href')
			.replace(/([?&]format=)[^&#]+/, '$1RIS');
	}

	let pdfURL = attr(doc, '.siteArticleShare a[href*="download_fulltext.asp?"]', 'href');
	
	let topRow = text(doc, '.siteTopRow');
	let ISSN = topRow.match(/ISSN\s+(\d{4}-\d{3}[\dX])/);
	ISSN = ISSN && ZU.cleanISSN(ISSN[1]);
	
	ZU.doGet(risURL, function (text) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			delete item.journalAbbreviation; // usually not a common abbreviation
			
			if (!item.ISSN) {
				item.ISSN = ISSN;
			}
			
			item.notes = [];
			
			if (pdfURL) {
				item.url = url.replace(/#.*$/, '').replace(/&look4=[^&]*/, '');
				item.attachments.push({
					url: pdfURL,
					title: "Full Text PDF",
					mimeType: "application/pdf"
				});
			}
			else if (item.url && item.url.includes('dx.doi.org')) {
				delete item.url;
			}
			
			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://alrjournal.com/jvi.aspx?un=ALRJ-15679&volume=5&issue=9",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Functioning of words formed from proper names in modern media discourse: psycholinguistic aspect",
				"creators": [
					{
						"lastName": "Shynkar",
						"firstName": "Tetiana",
						"creatorType": "author"
					},
					{
						"lastName": "Levchenko",
						"firstName": "Tetiana",
						"creatorType": "author"
					},
					{
						"lastName": "Skliarenko",
						"firstName": "Olesia",
						"creatorType": "author"
					},
					{
						"lastName": "Kardash",
						"firstName": "Larysa",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"DOI": "10.14744/alrj.2021.15679",
				"ISSN": "2651-2629",
				"issue": "9",
				"libraryCatalog": "LookUs",
				"pages": "1-13",
				"publicationTitle": "Applied Linguistics Research Journal",
				"shortTitle": "Functioning of words formed from proper names in modern media discourse",
				"url": "https://alrjournal.com/jvi.aspx?un=ALRJ-15679&volume=5&issue=9",
				"volume": "5",
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
		"url": "https://archivestsc.com/jvi.aspx?un=TKDA-69741&volume=49&issue=6",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Polymorphisms of F2 (G20210A), F5 (G1691A), F 7 (G10976A), F 13(G13T), FGB, ITGA2, ITGB3, PAI-I genes and its association with thrombotic complications in patients suffering from Takayasu aortoarteritis of Urals population",
				"creators": [
					{
						"lastName": "Borodina",
						"firstName": "Irina",
						"creatorType": "author"
					},
					{
						"lastName": "Salavatova",
						"firstName": "Gezel",
						"creatorType": "author"
					},
					{
						"lastName": "Shardina",
						"firstName": "Lubov",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"DOI": "10.5543/tkda.2021.69741",
				"ISSN": "1016-5169",
				"issue": "6",
				"libraryCatalog": "LookUs",
				"pages": "448-455",
				"publicationTitle": "Archives of the Turkish Society of Cardiology",
				"url": "https://archivestsc.com/jvi.aspx?un=TKDA-69741&volume=49&issue=6",
				"volume": "49",
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
		"url": "https://turkishbioethics.org/eng/jvi.aspx?pdir=tjob&plng=eng&un=TJOB-58066&look4=",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Psychiatric research abuse at the University of Minnesota",
				"creators": [
					{
						"lastName": "Elliott",
						"firstName": "Carl",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"DOI": "10.5505/tjob.2014.58066",
				"ISSN": "2148-5917",
				"issue": "1",
				"libraryCatalog": "LookUs",
				"pages": "38-43",
				"publicationTitle": "Turkish Journal of Bioethics",
				"url": "https://turkishbioethics.org/eng/jvi.aspx?pdir=tjob&plng=eng&un=TJOB-58066",
				"volume": "1",
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
		"url": "https://archivestsc.com/jvi.aspx?volume=49&issue=6",
		"items": "multiple"
	}
]
/** END TEST CASES **/
