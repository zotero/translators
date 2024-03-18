{
	"translatorID": "a5998785-222b-4459-9ce8-9c081d599af7",
	"label": "Milli Kütüphane",
	"creator": "Philipp Zumstein, Sebastian Karcher",
	"target": "^https?://(www\\.)?kasif\\.mkutup\\.gov\\.tr/",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-03-15 18:16:49"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017-2024 Philipp Zumstein & Sebastian Karcher
	
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
	if (url.includes('?MakId=')) {
		return "book";
	}
	else if (url.includes('/OpacArama') && getSearchResults(doc, url, true)) {
		return "multiple";
	}
	Z.monitorDOMChanges(doc.getElementById('dvKapsam'), { childList: true });
	return false;
}


function getSearchResults(doc, url, checkOnly) {
	var items = {};
	var found = false;
	let baseURL = 'SonucDetay.aspx?MakId=';
	if (url.includes("OpacAramaEn.aspx?")) { // English catalog
		baseURL = 'SonucDetayEn.aspx?MakId=';
	}
	var rows = doc.querySelectorAll('div.DivSonuc');
	for (let row of rows) {
		let title = ZU.trimInternal(text(row, '.SonucBaslik'));
		let id = attr(row, '.SonucDiv1', 'onclick');
		let href;
		if (id) {
			let param = id.match(/Goster\((\d+),(\d+)\)/);
			if (param && param[2] !== "1700") {
				//we don't handle articles which don't have MARC data
				href = baseURL + param[1];
				if (!href || !title) continue;
			}
		}
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, url, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc);
	}
}


async function scrape(doc) {
	var lines = doc.querySelectorAll('#cntPlcPortal_grdMrc tr');
	
	let translator = Zotero.loadTranslator('import');
	translator.setTranslator('a6ee60df-1ddc-4aae-bb25-45e0537be973'); // MARC
	let marc = await translator.getTranslatorObject();

	let record = new marc.record();
	let newItem = new Zotero.Item();
	//ignore the table headings in lines[0]
	record.leader = text(lines[1], 'td', 4);
	var fieldTag, indicators, fieldContent;
	for (var j = 2; j < lines.length; j++) {
		//multiple lines with same fieldTag do not repeat it
		//i.e. in these cases we will just take same value as before
		if (text(lines[j], 'td', 0).trim().length > 0) {
			fieldTag = text(lines[j], 'td', 0);
		}
		indicators = text(lines[j], 'td', 1) + text(lines[j], 'td', 2);
		fieldContent = '';
		if (text(lines[j], 'td', 3).trim().length > 0) {
			fieldContent = marc.subfieldDelimiter + text(lines[j], 'td', 3);
		}
		fieldContent += text(lines[j], 'td', 4);
			
		record.addField(fieldTag, indicators, fieldContent);
	}
		
	record.translate(newItem);
		
	//don't save value "no publisher" = "yayl.y."
	if (newItem.publisher == 'yayl.y.') {
		delete newItem.publisher;
	}
		
	newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://kasif.mkutup.gov.tr/SonucDetay.aspx?MakId=954757",
		"items": [
			{
				"itemType": "book",
				"title": "Protestanlıkta sakramentler",
				"creators": [
					{
						"firstName": "Muhammet",
						"lastName": "Tarakçı",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"ISBN": "9786054487059",
				"callNumber": "2014 AD 15480",
				"language": "TUR",
				"libraryCatalog": "Milli Kütüphane",
				"numPages": "296",
				"place": "Bursa",
				"publisher": "Emin Yayınları",
				"series": "Emin Yayınları",
				"seriesNumber": "122",
				"attachments": [],
				"tags": [
					"Protestanlık (Hıristiyanlık)"
				],
				"notes": [
					{
						"note": "Dizin vardır"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kasif.mkutup.gov.tr/SonucDetay.aspx?MakId=423635",
		"items": [
			{
				"itemType": "book",
				"title": "Peygamberlik makamı ve sevgili peygamberimiz",
				"creators": [
					{
						"firstName": "Nihat (F)",
						"lastName": "Dalgın",
						"creatorType": "editor"
					},
					{
						"firstName": "Yunus (F)",
						"lastName": "Macit",
						"creatorType": "editor"
					}
				],
				"date": "1992",
				"callNumber": "1993 AD 4043",
				"language": "TUR",
				"libraryCatalog": "Milli Kütüphane",
				"numPages": "126",
				"place": "Samsun",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kasif.mkutup.gov.tr/SonucDetayEn.aspx?MakId=1705892",
		"items": [
			{
				"itemType": "book",
				"title": "Labor laws ın Turkey",
				"creators": [
					{
						"lastName": "The İstanbul Chamber of Commerce",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"firstName": "A. Murat",
						"lastName": "Demircioğlu",
						"creatorType": "editor"
					}
				],
				"date": "1988",
				"callNumber": "1989 AD 1093",
				"language": "TUR",
				"libraryCatalog": "Milli Kütüphane",
				"numPages": "43",
				"place": "İstanbul",
				"publisher": "The Istanbul Chamber of Commerce",
				"series": "ICOC Publication",
				"seriesNumber": "1988-20",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kasif.mkutup.gov.tr/OpacAramaEn.aspx?Ara=test&DtSrc=0&fld=-1&NvBar=0",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
