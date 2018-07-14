{
	"translatorID": "e570f517-83f2-4735-97d2-44499aee0b21",
	"label": "Eurogamer/USgamer",
	"creator": "czar",
	"target": "^https?://(www\\.)?(eurogamer|usgamer)\\.net",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-07-14 18:42:18"
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
	if (/articles/.test(url)) {
		return "blogPost";
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	}
}


function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // embedded metadata (EM)
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) { // corrections to EM
		item.itemType = "blogPost";
		if (item.publicationTitle) {
			item.publicationTitle = item.publicationTitle.replace('.net','');
		}
		if (item.abstractNote) {
			item.abstractNote = item.abstractNote.replace(/&hellip;/,"...");
		}
		var authorMetadata = doc.querySelectorAll('.author .name a, .details .author a');
		for (let author of authorMetadata) {
			item.creators.push(ZU.cleanAuthor(author.text, "author"));
		}
		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.doWeb(doc, url);
	});
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.gs-title, .details .title a');
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	switch (detectWeb(doc, url)) {
		case "multiple":
			Zotero.selectItems(getSearchResults(doc, false), function (items) {
				if (!items) {
					return true;
				}
				var articles = [];
				for (var i in items) {
					articles.push(i);
				}
				ZU.processDocuments(articles, scrape);
			});
			break;
		default:
			scrape(doc, url);
			break;
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.eurogamer.net/articles/2016-06-13-standalone-witcher-card-game-gwent-announced",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Standalone Witcher card-game Gwent announced",
				"creators": [
					{
						"firstName": "Robert",
						"lastName": "Purchese",
						"creatorType": "author"
					}
				],
				"abstractNote": "As expected, the rumoured Witcher 3 card game Gwent has been announced as a standalone game at E3.This is the \"new type of video game format previously unex...",
				"blogTitle": "Eurogamer",
				"language": "en",
				"url": "https://www.eurogamer.net/articles/2016-06-13-standalone-witcher-card-game-gwent-announced",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "http://www.eurogamer.net/games/earthbound-beginnings",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.eurogamer.net/articles/2016-11-09-overwatch-voice-actors-goofing-around-at-blizzcon-2016-should-make-you-smile",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Overwatch voice actors goofing around at Blizzard should make you smile",
				"creators": [
					{
						"firstName": "Robert",
						"lastName": "Purchese",
						"creatorType": "author"
					}
				],
				"abstractNote": "Jonny Cruz is the good-looking face behind the voice of Lucio in Overwatch, and he was at Blizzard HQ recently. With his camera phone. Cruz also happens to...",
				"blogTitle": "Eurogamer",
				"language": "en",
				"url": "https://www.eurogamer.net/articles/2016-11-09-overwatch-voice-actors-goofing-around-at-blizzcon-2016-should-make-you-smile",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "https://www.usgamer.net/articles/captain-toad-treasure-tracker-nintendo-switch-3ds-analysis",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Captain Toad: Treasure Tracker on Switch's Best Level is a Return to New Donk City",
				"creators": [
					{
						"firstName": "Caty",
						"lastName": "McCarthy",
						"creatorType": "author"
					}
				],
				"abstractNote": "The other three Super Mario Odyssey-themed levels are a disappointment though.",
				"blogTitle": "USgamer",
				"language": "en",
				"shortTitle": "Captain Toad",
				"url": "https://www.usgamer.net/articles/captain-toad-treasure-tracker-nintendo-switch-3ds-analysis",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "https://www.usgamer.net/archive?tag=review",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.usgamer.net/search?q=earthbound",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.eurogamer.net/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.eurogamer.net/search.php?q=earthbound",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Search • Eurogamer.net",
				"creators": [],
				"blogTitle": "Eurogamer",
				"language": "en",
				"url": "https://www.eurogamer.net/search.php?q=earthbound",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "https://www.eurogamer.net/switch",
		"items": "multiple"
	}
]
/** END TEST CASES **/
