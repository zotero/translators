{
	"translatorID": "5a5b1fcd-8491-4c56-84a7-5dba19fe2c02",
	"label": "Rock, Paper, Shotgun",
	"creator": "czar, Bao Trinh",
	"target": "^https?://(www\\.)?rockpapershotgun\\.(com|de)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-15 21:00:12"
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


function detectWeb(doc) {
	let contentType = attr(doc, 'meta[property="og:type"]', 'content');
	switch (contentType) {
		case "article":
			return "magazineArticle";
		case "website":
		case null:
		default:
			if (getSearchResults(doc, true)) {
				return "multiple";
			}
			break;
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll('.archive_list article .details .title a , .gsc-results .gsc-result .gsc-thumbnail-inside a.gs-title , main article .title a');
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


function scrape(doc, url) {
	const translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // embedded metadata (EM)
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) { // corrections to EM
		item.publicationTitle = "Rock, Paper, Shotgun";

		item.tags = []; // reset bad tag metadata
		for (const tag of doc.querySelectorAll('meta[property="article:tag"]')) {
			item.tags.push(tag.getAttribute('content'));
		}

		let linkedData = JSON.parse(text(doc, 'script[type="application/ld+json"]'));
		if (linkedData) {
			if (linkedData.headline) item.title = linkedData.headline;
			if (linkedData.description) item.abstractNote = linkedData.description;
			if (linkedData.datePublished) item.date = linkedData.datePublished;
			item.creators.push(ZU.cleanAuthor(linkedData.author.name, 'author'));
		}

		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = detectWeb(doc, url);
		trans.doWeb(doc, url);
	});
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
		"url": "https://www.rockpapershotgun.com/dr-langeskov-the-tiger-and-the-terribly-cursed-emerald-a-whirlwind-heist-review",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Wot I Think - Dr. Langeskov, The Tiger and The Terribly Cursed Emerald: A Whirlwind Heist",
				"creators": [
					{
						"firstName": "Alec",
						"lastName": "Meer",
						"creatorType": "author"
					}
				],
				"date": "2015-12-04T17:00:03+00:00",
				"abstractNote": "PC gaming news, previews, reviews, opinion.",
				"language": "en",
				"libraryCatalog": "www.rockpapershotgun.com",
				"publicationTitle": "Rock, Paper, Shotgun",
				"shortTitle": "Wot I Think - Dr. Langeskov, The Tiger and The Terribly Cursed Emerald",
				"url": "https://www.rockpapershotgun.com/dr-langeskov-the-tiger-and-the-terribly-cursed-emerald-a-whirlwind-heist-review",
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
						"tag": "Crows Crows Crows"
					},
					{
						"tag": "Dr. Langeskov The Tiger and The Terribly Cursed Emerald: A Whirlwind Heist"
					},
					{
						"tag": "Feature"
					},
					{
						"tag": "Free games"
					},
					{
						"tag": "Review"
					},
					{
						"tag": "The Beginner's Guide"
					},
					{
						"tag": "The Stanley Parable"
					},
					{
						"tag": "William Pugh"
					},
					{
						"tag": "Wot I Think"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.rockpapershotgun.com/thought-mass-effects-day-one-dlc-explained-considered",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Thought: Mass Effect's Day One DLC Explained, Pondered",
				"creators": [
					{
						"firstName": "John",
						"lastName": "Walker",
						"creatorType": "author"
					}
				],
				"date": "2012-02-23T09:06:27+00:00",
				"abstractNote": "PC gaming news, previews, reviews, opinion.",
				"language": "en",
				"libraryCatalog": "www.rockpapershotgun.com",
				"publicationTitle": "Rock, Paper, Shotgun",
				"shortTitle": "Thought",
				"url": "https://www.rockpapershotgun.com/thought-mass-effects-day-one-dlc-explained-considered",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "BioWare"
					},
					{
						"tag": "DLC"
					},
					{
						"tag": "Electronic Arts"
					},
					{
						"tag": "Mass Effect 3"
					},
					{
						"tag": "day one DLC"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.rockpapershotgun.com/category/free-pc-games/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.rockpapershotgun.com/search?q=earthbound",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.rockpapershotgun.com/have-you-played-welcome-to-elk",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Have You Played... Welcome To Elk?",
				"creators": [
					{
						"firstName": "Katharine",
						"lastName": "Castle",
						"creatorType": "author"
					}
				],
				"date": "2021-05-05T07:30:00+00:00",
				"abstractNote": "Welcome To Elk is a heartfelt narrative game based on the real-life stories of a remote island community. Don't be fooled by its cartoon visuals.",
				"language": "en",
				"libraryCatalog": "www.rockpapershotgun.com",
				"publicationTitle": "Rock, Paper, Shotgun",
				"url": "https://www.rockpapershotgun.com/have-you-played-welcome-to-elk",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Feature"
					},
					{
						"tag": "Have You Played"
					},
					{
						"tag": "Triple Topping"
					},
					{
						"tag": "Welcome To Elk"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.rockpapershotgun.com/hardware",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.rockpapershotgun.com/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
