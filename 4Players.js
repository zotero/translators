{
	"translatorID": "2bafa923-62ca-4eb1-a78a-4c5cfae64491",
	"label": "4Players",
	"creator": "Matthias Mailänder",
	"target": "^https?://(www\\.)?4players\\.de",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-12-02 18:59:02"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Matthias Mailänder

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
	if (url.includes('/dispbericht/')) {
		return "magazineArticle";
	}
	else if (url.includes('/spielinfonews/')) {
		return "newspaperArticle";
	}
	return false;
}

function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if (type == "magazineArticle" || type == "newspaperArticle") {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // embedded metadata
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		if (url.includes('/Tests/')) {
			item.itemType = "magazineArticle";
		}
		if (url.includes('/News/')) {
			item.itemType = "newspaperArticle";
		}
		item.publicationTitle = "4Players";
		item.language = "de-DE";
		item.creators = []; // reset bad author metadata
		var authorMetadata = doc.querySelectorAll('span.richsnippet');
		for (let author of authorMetadata) {
			item.creators.push(ZU.cleanAuthor(author.textContent, "author"));
		}
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.doWeb(doc, url);
	});
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.4players.de/4players.php/spielinfonews/Allgemein/40051/2206467/Baldurs_Gate_3-Patch_5_mit_neuem_Epilog_Honour_und_Custom_Mode_und_noch_so_viel_mehr_veroeffentlicht.html",
		"detectedItemType": "newspaperArticle",
		"items": [
			{
				"itemType": "webpage",
				"title": "Baldur's Gate 3: Patch 5 mit neuem Epilog, Honour und Custom Mode und noch so viel mehr veröffentlicht",
				"creators": [
					{
						"firstName": "Sören",
						"lastName": "Wetterau",
						"creatorType": "author"
					}
				],
				"date": "2023-12-01",
				"abstractNote": "Wenige Wochen vor Jahresende und nur eine Woche vor den The Game Awards veröffentlicht Larian den bislang wohl größten Patch für Baldur's Gate 3.",
				"language": "de-DE",
				"shortTitle": "Baldur's Gate 3",
				"url": "https://www.4players.de/4players.php/spielinfonews/Allgemein/40051/2206467/Riesiger_Patch_fuer_Baldurs_Gate_3_bringt_endlich_das_Ende_welches_ihr_euch_verdient_habt.html",
				"websiteTitle": "4Players",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "baldur's gate 3"
					},
					{
						"tag": "baldur's gate 3"
					},
					{
						"tag": "larian studios"
					},
					{
						"tag": "nachrichten"
					},
					{
						"tag": "news"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.4players.de/4players.php/dispbericht/Allgemein/Test/7998/5045/0/Rainbow_Six_Vegas.html",
		"detectedItemType": "magazineArticle",
		"items": [
			{
				"itemType": "webpage",
				"title": "Rainbow Six: Vegas - Test, Shooter",
				"creators": [
					{
						"firstName": "Michael",
						"lastName": "Krosta",
						"creatorType": "author"
					}
				],
				"date": "2006-12-02",
				"abstractNote": "Das zur hirnlosen Ballerorgie verkommene Rainbow Six: Lockdown (4P-Wertung: 66%) hatte Anfang des Jahres einen faden Beigeschmack hinterlassen. Aber mit Ubisoft Montreal kehren die Macher des hervorragenden dritten Teils zur Serie zurück und schicken die Spezialeinheit auf Amerikas bekanntesten Spielplatz: Las Vegas!",
				"language": "de-DE",
				"shortTitle": "Rainbow Six",
				"url": "https://www.4players.de/4players.php/dispbericht/Allgemein/Test/7998/5045/0/Rainbow_Six_Vegas.html",
				"websiteTitle": "4Players",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "las vegas"
					},
					{
						"tag": "r6"
					},
					{
						"tag": "r6 vegas"
					},
					{
						"tag": "rainbow 6"
					},
					{
						"tag": "rainbow six vegas"
					},
					{
						"tag": "rainbow six: vegas"
					},
					{
						"tag": "test"
					},
					{
						"tag": "tom clancy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
