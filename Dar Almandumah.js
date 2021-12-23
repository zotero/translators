{
	"translatorID": "721a6b6e-d584-4252-b319-7ea46a8b02a7",
	"label": "Dar Almandumah",
	"creator": "Abe Jellinek",
	"target": "^https?://search\\.mandumah\\.com/(Search|Record)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-30 23:08:33"
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
	if (url.includes('/Record/') && doc.querySelector('#record')) {
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
	var rows = doc.querySelectorAll('.result a.title');
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
	// the EndNote metadata is somehow better than the MARC
	// (or at least Zotero imports it better)
	let exportURL;
	
	let id = attr(doc, '#record_id', 'value');
	if (id) {
		// this should always work, so the fallback below is Just In Case
		exportURL = `https://search.mandumah.com/Record/${id}/Export?style=EndNote`;
	}
	if (!exportURL) {
		exportURL = attr(doc, '#exportMenu', 'li a[href*="style=EndNote"]');
	}

	let pdfURL = attr(doc, '.downloadPdfImg', 'href');

	ZU.doGet(exportURL, function (exportText) {
		// a janky regex to replace Arabic commas in author names with Latin commas
		exportText = exportText.replace(/^(\s*%[AEY].*)،/m, '$1,');
		
		let translator = Zotero.loadTranslator("import");
		// Refer/BibIX
		translator.setTranslator("881f60f2-0802-411a-9228-ce5f47b64c7d");
		translator.setString(exportText);
		translator.setHandler("itemDone", function (obj, item) {
			if (item.publicationTitle && item.itemType == 'book') {
				item.itemType = 'journalArticle';
			}
			
			// strip leading zeroes
			for (let prop of ['volume', 'issue', 'seriesNumber']) {
				if (!item[prop]) continue;
				item[prop] = item[prop].replace(/^\s*0+/, '');
			}
			
			if (item.url) {
				item.url = item.url.split(', ')[0];
			}
			else {
				item.url = url;
			}
			
			// a couple things are missing from the .enw export
			for (let tr of doc.querySelectorAll('table.citation tr')) {
				let key = ZU.trimInternal(text(tr, 'th'));
				let value = text(tr, 'td');
				
				if (key == 'ISSN:') {
					item.ISSN = ZU.cleanISSN(value);
				}
				else if (key == 'الصفحات:' || key == 'Pages:') {
					item.pages = value.replace(' - ', '-');
				}
				else if (key == 'مكان انعقاد المؤتمر:' || key == 'Conference Venue:') {
					item.itemType = 'conferencePaper';
					item.place = value;
					item.proceedingsTitle = item.publicationTitle;
					delete item.publicationTitle;
				}
			}
			
			if (pdfURL) {
				item.attachments.push({
					url: pdfURL,
					title: "Full Text PDF",
					mimeType: "application/pdf"
				});
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
		"url": "https://search.mandumah.com/Record/58382",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "التلقين وأثره في الرواية عند المحدثين",
				"creators": [
					{
						"firstName": "محمد بن عبدالكريم",
						"lastName": "ابن عبيد",
						"creatorType": "author"
					}
				],
				"date": "1998",
				"ISSN": "1319-4216",
				"issue": "18",
				"libraryCatalog": "Dar Almandumah",
				"pages": "16-82",
				"publicationTitle": "مجلة جامعة أم القرى للبحوث العلمية",
				"url": "http://search.mandumah.com/Record/58382",
				"volume": "11",
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
		"url": "https://search.mandumah.com/Record/121184",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "الظروف المخففة للعقوبة في التشريع الجزائي الاردني",
				"creators": [
					{
						"firstName": "محمد سعيد",
						"lastName": "نمور",
						"creatorType": "author"
					}
				],
				"date": "1989",
				"issue": "2",
				"libraryCatalog": "Dar Almandumah",
				"pages": "9-69",
				"publicationTitle": "مؤتة للبحوث والدراسات",
				"url": "http://search.mandumah.com/Record/121184",
				"volume": "4",
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
		"url": "https://search.mandumah.com/Record/393427",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "كلمة افتتاح الندوة",
				"creators": [
					{
						"firstName": "محمد",
						"lastName": "أبو هلال",
						"creatorType": "author"
					}
				],
				"date": "2006",
				"libraryCatalog": "Dar Almandumah",
				"pages": "7-10",
				"place": "سوسة",
				"proceedingsTitle": "أعمال ندوة البحث من قضايا التفاعل بين العلوم : إتصال العلوم وإنفصالها في الثقافة العربية",
				"publisher": "كلية الآداب والعلوم الإنسانية بسوسة",
				"url": "http://search.mandumah.com/Record/393427",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://search.mandumah.com/Search/Results?lookfor=%D8%A7%D9%84%D8%B7%D8%A7%D8%A6%D9%81%D9%8A%D8%A9&type=AllFields&submit=Find&limit=20&sort=relevance",
		"items": "multiple"
	}
]
/** END TEST CASES **/
