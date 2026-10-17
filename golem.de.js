{
	"translatorID": "9ca3c7a6-e5d4-4462-b9a4-e3e010f6a850",
	"label": "golem.de",
	"creator": "Matthias Mailänder",
	"target": "^https?://(www\\\\.)?golem\\\\.de",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-12-03 17:05:50"
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
	if (url.includes('news')) {
		return "newspaperArticle";
	}
	else {
		return "webpage";
	}
}

function doWeb(doc, url) {
	if (url.includes("golem.de/sonstiges/zustimmung")) {
		var originalUrl = decodeURIComponent(url.split('from=')[1]);
		Zotero.Utilities.processDocuments(originalUrl, scrape);
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // embedded metadata
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		if (url.includes('/news/')) {
			item.itemType = "newspaperArticle";
		}
		else {
			item.itemType = "webpage";
		}
		item.publicationTitle = "golem.de";
		item.creators = []; // reset bad author metadata
		var authorMetadata = doc.querySelectorAll('a[rel="author"]');
		for (let author of authorMetadata) {
			item.creators.push(ZU.cleanAuthor(author.textContent, "author"));
		}
		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.golem.de/news/30-jahre-doom-nicht-irgendein-shooter-sondern-der-shooter-2312-179775.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "30 Jahre Doom: Nicht irgendein Shooter, sondern der Shooter - Golem.de",
				"creators": [
					{
						"firstName": "Daniel",
						"lastName": "Ziegener",
						"creatorType": "author"
					}
				],
				"date": "2023-12-03",
				"abstractNote": "Doom sollte schneller und brutaler sein als alle anderen Shooter. Mit Erfolg, denn selbst heute noch lässt das Spiel von Id Software manch anderes Spiel älter aussehen.",
				"language": "de-DE",
				"libraryCatalog": "www.golem.de",
				"publicationTitle": "golem.de",
				"shortTitle": "30 Jahre Doom",
				"url": "https://www.golem.de/news/30-jahre-doom-nicht-irgendein-shooter-sondern-der-shooter-2312-179775.html",
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
		"url": "https://www.golem.de/0606/45820.html",
		"items": [
			{
				"itemType": "webpage",
				"title": "Spieletest: Episode One - Half-Life 2 weitererzählt - Golem.de",
				"creators": [
					{
						"firstName": "Christian",
						"lastName": "Klaß",
						"creatorType": "author"
					}
				],
				"date": "2006-06-09",
				"abstractNote": "Die Zitadelle in City 17 steht kurz vor der Explosion - und Alyx und Gordon stecken mittendrin in Lebensgefahr: Das seit Anfang Juni 2006 erhältliche \"Half Life 2: Episode One\"",
				"language": "de-DE",
				"libraryCatalog": "www.golem.de",
				"publicationTitle": "golem.de",
				"shortTitle": "Spieletest",
				"url": "https://www.golem.de/0606/45820.html",
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
	}
]
/** END TEST CASES **/
