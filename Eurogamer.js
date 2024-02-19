{
	"translatorID": "c972b875-ec7d-4e76-8114-2bfac6efbff9",
	"label": "Eurogamer",
	"creator": "czar",
	"target": "^https?://(www\\.)?eurogamer\\.(net|cz|de|es|it|nl|pl|pt)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-12-03 18:41:45"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 czar
	http://en.wikipedia.org/wiki/User_talk:Czar

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
	if (/search/.test(url)) {
		return "multiple";
	}
	else {
		return "webpage";
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // embedded metadata (EM)
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) { // corrections to EM
		item.itemType = "webpage";
		if (item.publicationTitle) {
			item.publicationTitle = item.publicationTitle.replace('.net', '');
		}
		if (item.abstractNote) {
			item.abstractNote = item.abstractNote.replace(/&hellip;/, "...");
		}
		item.creators = []; // reset bad author metadata
		var jsonld = doc.querySelector('script[type="application/ld+json"]'); // JSON-LD not yet built into EM
		if (jsonld) {
			var json = JSON.parse(jsonld.textContent);
			item.date = json.datePublished;
			if (json.author && json.author.name) {
				item.creators.push(ZU.cleanAuthor(json.author.name, "author"));
			}
		}
		if (item.creators.length === 0) { // Eurogamer.de's JSON-LD didn't include authors
			var authorMetadata = doc.querySelectorAll('.byline .author a');
			for (let author of authorMetadata) {
				item.creators.push(ZU.cleanAuthor(author.textContent, "author"));
			}
		}
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.doWeb(doc, url);
	});
}

function doWeb(doc, url) {
	scrape(doc, url);
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.eurogamer.net/standalone-witcher-card-game-gwent-announced",
		"items": [
			{
				"itemType": "webpage",
				"title": "Standalone Witcher card-game Gwent announced",
				"creators": [
					{
						"firstName": "Robert",
						"lastName": "Purchese",
						"creatorType": "author"
					}
				],
				"date": "2016-06-13T17:28:00+00:00",
				"abstractNote": "As expected, the rumoured Witcher 3 card game Gwent has been announced as a standalone game at E3.This is the \"new type…",
				"language": "en",
				"url": "https://www.eurogamer.net/standalone-witcher-card-game-gwent-announced",
				"websiteTitle": "Eurogamer",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Action Adventure"
					},
					{
						"tag": "Bandai Namco Entertainment"
					},
					{
						"tag": "CD Projekt RED"
					},
					{
						"tag": "E3 2016"
					},
					{
						"tag": "PC"
					},
					{
						"tag": "PS4"
					},
					{
						"tag": "PS5"
					},
					{
						"tag": "RPG"
					},
					{
						"tag": "Single Player"
					},
					{
						"tag": "The Witcher 3: Wild Hunt"
					},
					{
						"tag": "Third person"
					},
					{
						"tag": "Warner Bros. Games"
					},
					{
						"tag": "Xbox One"
					},
					{
						"tag": "Xbox Series X/S"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.eurogamer.net/overwatch-voice-actors-goofing-around-at-blizzcon-2016-should-make-you-smile",
		"items": [
			{
				"itemType": "webpage",
				"title": "Overwatch voice actors goofing around at Blizzard should make you smile",
				"creators": [
					{
						"firstName": "Robert",
						"lastName": "Purchese",
						"creatorType": "author"
					}
				],
				"date": "2016-11-09T11:44:00+00:00",
				"abstractNote": "Jonny Cruz is the good-looking face behind the voice of Lucio in Overwatch, and he was at Blizzard HQ recently. With hi…",
				"language": "en",
				"url": "https://www.eurogamer.net/overwatch-voice-actors-goofing-around-at-blizzcon-2016-should-make-you-smile",
				"websiteTitle": "Eurogamer",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Blizzard Entertainment"
					},
					{
						"tag": "Esports"
					},
					{
						"tag": "First person"
					},
					{
						"tag": "Multiplayer Competitive"
					},
					{
						"tag": "Nintendo Switch"
					},
					{
						"tag": "Overwatch"
					},
					{
						"tag": "PC"
					},
					{
						"tag": "PS4"
					},
					{
						"tag": "Shooter"
					},
					{
						"tag": "Square Enix"
					},
					{
						"tag": "Strategy"
					},
					{
						"tag": "Xbox One"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.eurogamer.de/was-die-naechste-generation-von-earthbound-lernen-kann",
		"items": [
			{
				"itemType": "webpage",
				"title": "Was die nächste Generation von Earthbound lernen kann",
				"creators": [
					{
						"firstName": "Björn",
						"lastName": "Balg",
						"creatorType": "author"
					}
				],
				"date": "2013-07-26T11:30:00+00:00",
				"abstractNote": "Earthbound für die Wii U Virtual Console ist ein Spiel, das sich kommende Titel als Vorbild nehmen sollten.",
				"language": "de",
				"url": "https://www.eurogamer.de/was-die-naechste-generation-von-earthbound-lernen-kann",
				"websiteTitle": "Eurogamer.de",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Bird view / Isometric"
					},
					{
						"tag": "Brownie Brown"
					},
					{
						"tag": "First person"
					},
					{
						"tag": "HAL Laboratory"
					},
					{
						"tag": "Mother 3"
					},
					{
						"tag": "Nintendo"
					},
					{
						"tag": "Nintendo GBA"
					},
					{
						"tag": "Nintendo Wii U"
					},
					{
						"tag": "RPG"
					},
					{
						"tag": "Single Player"
					},
					{
						"tag": "Strategy: Turn-Based Strategy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
