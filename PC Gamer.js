{
	"translatorID": "274284a8-fc91-4f54-be77-bfcb7f9c3d6f",
	"label": "PC Gamer",
	"creator": "czar, Bao Trinh",
	"target": "^https?://(www\\.)?pcgamer\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-15 21:10:04"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018-2021 czar, Bao Trinh
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

function getLinkedData(doc) {
	const linkedData = [...doc.querySelectorAll('script[type="application/ld+json"]')]
		.map(x => JSON.parse(x.innerText))
		.find(x => ("@type" in x && !(["BreadcrumbList"].includes(x["@type"]))));
	return linkedData;
}

function detectWeb(doc) {
	const linkedData = getLinkedData(doc);
	const pageType = linkedData ? linkedData["@type"] : null;
	switch (pageType) {
		case "Article":
		case "Product":
			return "magazineArticle";
		case "NewsArticle":
			return "newspaperArticle";
		case "WebPage":
		default:
			if (getSearchResults(doc, true)) {
				return "multiple";
			}
			break;
	}

	return false;
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // embedded metadata
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		const linkedData = getLinkedData(doc);
		if (linkedData && linkedData.publisher.name) item.publicationTitle = linkedData.publisher.name;

		for (const tag of doc.querySelectorAll('*#articleTag .tag a')) {
			item.tags.push(tag.textContent);
		}

		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = detectWeb(doc, url);
		trans.doWeb(doc, url);
	});
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.article-link');
	for (const row of rows) {
		const href = row.href;
		const title = ZU.trimInternal(text(row, '.article-name'));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), (items) => {
			if (!items) {
				return true;
			}
			const articles = [];
			for (const i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
			return true;
		});
	}
	else {
		scrape(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.pcgamer.com/the-voice-behind-symmetra-on-working-with-blizzard-overwatch-dream-couples-and-dd/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "The voice behind Symmetra on working with Blizzard, Overwatch dream couples, and D&D",
				"creators": [
					{
						"firstName": "James",
						"lastName": "Davenport",
						"creatorType": "author"
					}
				],
				"date": "2017-02-09T22:22:41.390Z",
				"abstractNote": "Anjali Bhimani is a self-proclaimed Chaotic Good who thinks Soldier: 76 and Ana are secretly hooking up.",
				"language": "en",
				"libraryCatalog": "www.pcgamer.com",
				"publicationTitle": "PC Gamer",
				"url": "https://www.pcgamer.com/the-voice-behind-symmetra-on-working-with-blizzard-overwatch-dream-couples-and-dd/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Best of"
					},
					{
						"tag": "FPS"
					},
					{
						"tag": "Interviews"
					},
					{
						"tag": "Overwatch"
					},
					{
						"tag": "Pro"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.pcgamer.com/search/?searchTerm=symmetra",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.pcgamer.com/the-9-best-digital-card-games-that-arent-hearthstone/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "These 9 card games are better than Hearthstone",
				"creators": [
					{
						"firstName": "Tom",
						"lastName": "Marks",
						"creatorType": "author"
					},
					{
						"firstName": "Jody",
						"lastName": "Macgregor",
						"creatorType": "author"
					}
				],
				"date": "2020-12-13T06:05:20Z",
				"abstractNote": "From Gwent to Faeria, there are plenty of great multiplayer card games on PC.",
				"language": "en",
				"libraryCatalog": "www.pcgamer.com",
				"publicationTitle": "PC Gamer",
				"url": "https://www.pcgamer.com/the-9-best-digital-card-games-that-arent-hearthstone/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Best of"
					},
					{
						"tag": "Card Game"
					},
					{
						"tag": "Faeria"
					},
					{
						"tag": "Gwent"
					},
					{
						"tag": "Hearthstone"
					},
					{
						"tag": "Kards"
					},
					{
						"tag": "Magic: The Gathering Arena"
					},
					{
						"tag": "The Elder Scrolls: Legends"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.pcgamer.com/it-turns-out-the-fcc-drastically-overstated-us-broadband-deployment-after-all/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "It turns out the FCC ‘drastically overstated’ US broadband deployment after all",
				"creators": [
					{
						"firstName": "Paul",
						"lastName": "Lilly",
						"creatorType": "author"
					}
				],
				"date": "2019-05-02T17:01:15Z",
				"abstractNote": "Ajit Pai isn't sweating it, though.",
				"language": "en",
				"libraryCatalog": "www.pcgamer.com",
				"publicationTitle": "PC Gamer",
				"url": "https://www.pcgamer.com/it-turns-out-the-fcc-drastically-overstated-us-broadband-deployment-after-all/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Ajit Pai"
					},
					{
						"tag": "FCC"
					},
					{
						"tag": "Hardware"
					},
					{
						"tag": "broadband"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.pcgamer.com/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.pcgamer.com/author/paul-lilly/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.pcgamer.com/indie/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
