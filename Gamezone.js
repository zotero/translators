{
	"translatorID": "f09ddeae-fdcd-4bbb-8703-de3b194ec195",
	"label": "Gamezone",
	"creator": "Matthias Mailänder",
	"target": "^https?://(www\\.)?gamezone\\.de",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-12-02 18:26:42"
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
	if (url.includes('/Tests/')) {
		return "magazineArticle";
	}
	else if (url.includes('/News/')) {
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
		item.publicationTitle = "Gamezone";
		item.language = "de-DE";
		item.creators = []; // reset bad author metadata
		var authorMetadata = doc.querySelectorAll('span.authorName');
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
		"url": "https://www.gamezone.de/Jagged-Alliance-3-Spiel-8158/Tests/Review-Rundentaktik-Nachfolger-Video-1424795/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Jagged Alliance 3: Test der gelungenen Rundentaktik",
				"creators": [
					{
						"firstName": "Matthias",
						"lastName": "Dammes",
						"creatorType": "author"
					}
				],
				"date": "2023-11-13T15:00:00+01:00",
				"abstractNote": "Mit Jagged Alliance 3 wollten die Entwickler einen würdigen Nachfolger zum legendären zweiten Teil abliefern. Ob ihnen das gelungen ist, klären wir im Test.",
				"language": "de-DE",
				"libraryCatalog": "www.gamezone.de",
				"publicationTitle": "Gamezone",
				"shortTitle": "Jagged Alliance 3",
				"url": "https://www.gamezone.de/Jagged-Alliance-3-Spiel-8158/Tests/Review-Rundentaktik-Nachfolger-Video-1424795/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.gamezone.de/Rainbow-Six-Siege-Spiel-54457/News/Darum-wurde-Rainbow-Six-Patriots-eingestampft-und-stattdessen-Rainbow-Six-Siege-gemacht-1125671/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Darum wurde Rainbow Six: Patriots eingestampft und stattdessen Rainbow Six: Siege gemacht",
				"creators": [
					{
						"firstName": "Peter",
						"lastName": "Grubmair",
						"creatorType": "author"
					}
				],
				"date": "2014-06-17T16:20:00+02:00",
				"abstractNote": "Auf der E3 ließ Ubisoft die Bombe platzen und kündigte Rainbow Six: Siege an, womit gleichzeitig klar war, dass Rainbow Six: Patriots eingestellt wurde. Nun verriet man auch die Gründe, wie es dazu kam.",
				"language": "de-DE",
				"libraryCatalog": "www.gamezone.de",
				"publicationTitle": "Gamezone",
				"shortTitle": "Darum wurde Rainbow Six",
				"url": "https://www.gamezone.de/Rainbow-Six-Siege-Spiel-54457/News/Darum-wurde-Rainbow-Six-Patriots-eingestampft-und-stattdessen-Rainbow-Six-Siege-gemacht-1125671/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "rainbow six patriots"
					},
					{
						"tag": "ubisoft"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
