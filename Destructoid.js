{
	"translatorID": "fc5a78ef-e486-462a-a3e5-e027628937ba",
	"label": "Destructoid",
	"creator": "czar",
	"target": "^https?://(www\\.)?destructoid\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-07-07 20:40:10"
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
	if (/\-\d{6}\.phtml/.test(url)) {
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
		item.publicationTitle = "Destructoid";
		item.language = "en-US";
		item.shortTitle = null;
		var authorMetadata = doc.querySelectorAll('meta[property="og:author"]');
		for (let author of authorMetadata) {
			item.creators.push(ZU.cleanAuthor(author.content, "author"));
		}
		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.addCustomFields({ // pull from meta tags in here
			'live_date': 'date'
		});
		trans.doWeb(doc, url);
	});
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h2.hfarticle_title, h2.sparticle_title, .mod-col2 h1');
	var links = doc.querySelectorAll('h2.hfarticle_title a, h2.sparticle_title a, .mod-col2 h1 a');
	for (let i=0; i<rows.length; i++) {
		let href = links[i].href;
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
		case "blogPost":
			scrape(doc, url);
			break;
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.destructoid.com/review-videoball-374456.phtml",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Review: Videoball",
				"creators": [
					{
						"firstName": "Nic",
						"lastName": "Rowen",
						"creatorType": "author"
					}
				],
				"date": "2016-07-12 11:00:00",
				"abstractNote": "Normally in a review, I wouldn't want to get too bogged down with discussing minute mechanics like the nitty gritty of what a certain button does, or how one type of attack differs from another. I'd want to concentrate on the bigger picture...",
				"blogTitle": "Destructoid",
				"language": "en-US",
				"url": "https://www.destructoid.com/review-videoball-374456.phtml",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Indie"
					},
					{
						"tag": "Mac"
					},
					{
						"tag": "PC"
					},
					{
						"tag": "PS4"
					},
					{
						"tag": "Steam"
					},
					{
						"tag": "Xbox One"
					},
					{
						"tag": "destructoid"
					},
					{
						"tag": "eSports"
					},
					{
						"tag": "game reviews"
					},
					{
						"tag": "gaming news"
					},
					{
						"tag": "multiplayer"
					},
					{
						"tag": "notable"
					},
					{
						"tag": "reviews"
					},
					{
						"tag": "video game"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.destructoid.com/products_detail.phtml?p=Videoball&c=news",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.destructoid.com/products-index.phtml?filt=reviews&date_s=desc&category=",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.destructoid.com",
		"items": "multiple"
	}
]
/** END TEST CASES **/
