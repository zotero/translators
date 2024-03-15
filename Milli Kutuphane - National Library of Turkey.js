{
	"translatorID": "42410780-9379-4c82-9fa1-ca5c5a658db7",
	"label": "Milli Kütüphane - National Library of Turkey",
	"creator": "Sebastian Karcher",
	"target": "^https?://kasif\\.mkutup\\.gov\\.tr/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-03-15 03:22:13"
}

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2024 Sebastian Karcher

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
	// TODO: adjust the logic here
	if (url.includes('MakId')) {
		return 'book';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('div.DivSonuc');
	for (let row of rows) {
		// TODO: check and maybe adjust
		let id = attr(row, '.SonucDiv1', 'onclick');
		Z.debug(id)
		// TODO: check and maybe adjust
		let title = ZU.trimInternal(text(row, '.SonucBaslik'));
		if (!id || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[id] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let id of Object.keys(items)) {
			id = id.match(/Goster\((\d+),/)[1];
			// still need to distinguish between English and Turkish version
		 	let url = "/SonucDetayEn.aspx?MakId=" + id;
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	
	let viewstate = attr('#__VIEWSTATE', 'value');
	let viewstategenerator = attr('#__VIEWSTATEGENERATOR', 'value');
	let eventvalidation = attr('#__EVENTVALIDATION', 'value');
	// let txtArama =  
	let aramaComboField = attr('#aramaComboField> option[selected="selected"]', 'value');
	let cntPlcPortal_x = "20"
	let cntPlcPortal_y = "14"
	let cntPlcPortal_txtKatalogKart = text('#cntPlcPortal_txtKatalogKart');

	let post = "__VIEWSTATE=" + encodeURIComponent(viewstate) + "&__VIEWSTATEGENERATOR=" + viewstategenerator +
	"&__EVENTVALIDATION=" + encodeURIComponent(eventvalidation) + "&" + encodeURIComponent("ctl00$txtArama") + 
	"=&" + encodeURIComponent("ctl00$aramaComboField") + "=" + encodeURIComponent(aramaComboField) +
	"&" + encodeURIComponent("ctl00$cntPlcPortal$ImageButton1.x") + "=20&" + encodeURIComponent("ctl00$cntPlcPortal$ImageButton1.y") +
	"=14&" + encodeURIComponent("ctl00$cntPlcPortal$txtKatalogKart") + "=" + encodeURIComponent(cntPlcPortal_txtKatalogKart);

	// Z.debug(post);
	let options = { method: "POST", body: post };
	let marc = await requestText(url, options);
	// Z.debug(marc);
	let translator = Zotero.loadTranslator('import');
	translator.setTranslator('a6ee60df-1ddc-4aae-bb25-45e0537be973'); // MARC
	translator.setString(marc);
	translator.setHandler('itemDone', (_obj, item) => {
		item.complete();
	});
	await translator.translate();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://kasif.mkutup.gov.tr/SonucDetayEn.aspx?MakId=1642417",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "book",
				"title": "Diabetes mellitus'da gebeliğin ve doğumun idaresi =: Prenatal care and the concluction of labor in diabetes mellitus",
				"creators": [
					{
						"firstName": "Mithat",
						"lastName": "Ayırtman",
						"creatorType": "editor"
					}
				],
				"date": "1969",
				"callNumber": "1970 AD 2421",
				"language": "tur",
				"libraryCatalog": "Milli Kütüphane - National Library of Turkey",
				"numPages": "245",
				"place": "İstanbul",
				"publisher": "yayl.y.",
				"shortTitle": "Diabetes mellitus'da gebeliğin ve doğumun idaresi =",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "\"Zeynep-Kâmil tıp bülteni c.1, sayı 3, sene 1969\"dan ayrı bası"
					}
				],
				"seeAlso": []
			},
			{
				"itemType": "book",
				"title": "Diabetes mellitus'da gebeliğin ve doğumun idaresi =: Prenatal care and the concluction of labor in diabetes mellitus",
				"creators": [
					{
						"firstName": "Mithat",
						"lastName": "Ayırtman",
						"creatorType": "editor"
					}
				],
				"date": "1969",
				"callNumber": "1970 AD 2421",
				"language": "tur",
				"libraryCatalog": "Milli Kütüphane - National Library of Turkey",
				"numPages": "245",
				"place": "İstanbul",
				"publisher": "yayl.y.",
				"shortTitle": "Diabetes mellitus'da gebeliğin ve doğumun idaresi =",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "\"Zeynep-Kâmil tıp bülteni c.1, sayı 3, sene 1969\"dan ayrı bası"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kasif.mkutup.gov.tr/SonucDetayEn.aspx?MakId=1705892",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "book",
				"title": "Labor laws ın Turkey",
				"creators": [
					{
						"lastName": "The İstanbul Chamber of Commerce",
						"creatorType": "editor",
						"fieldMode": true
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
				"libraryCatalog": "Milli Kütüphane - National Library of Turkey",
				"numPages": "43",
				"place": "İstanbul",
				"publisher": "The Istanbul Chamber of Commerce",
				"series": "ICOC Publication",
				"seriesNumber": "1988-20",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "book",
				"title": "Labor laws ın Turkey",
				"creators": [
					{
						"lastName": "The İstanbul Chamber of Commerce",
						"creatorType": "editor",
						"fieldMode": true
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
				"libraryCatalog": "Milli Kütüphane - National Library of Turkey",
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
	}
]
/** END TEST CASES **/
