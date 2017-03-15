{
	"translatorID": "d45c50cb-6dee-4cfb-974d-797991f8385b",
	"label": "Digital Spy",
	"creator": "czar",
	"target": "^https?://(www\\.)?digitalspy\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-07-08 03:32:16"
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
	if (/\/(news|feature|review)\/\w\d+/.test(url)) {
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
		item.language = "en-GB";
		item.creators = []; // reset bad author metadata
		var authorMetadata = doc.querySelectorAll('a[rel="author"]');
		for (let author of authorMetadata) {
			item.creators.push(ZU.cleanAuthor(author.text, "author"));
		}
		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.addCustomFields({ // pull from meta tags in here
			'title': 'title'
		});
		trans.doWeb(doc, url);
	});
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.search-results--title, .landing-feed--story-title, .landing-feed--special-title');
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
		case "blogPost":
			scrape(doc, url);
			break;
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.digitalspy.com/gaming/xbox-one/news/a661615/rare-replay-review-roundup-one-of-the-best-collections-in-gaming-history/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Rare Replay review roundup: \"One of the best collections in gaming history\"",
				"creators": [
					{
						"firstName": "Albaraa",
						"lastName": "Fahmy",
						"creatorType": "author"
					}
				],
				"date": "2015-08-04 12:47:00",
				"abstractNote": "Early reviews applaud the compilation for comprising countless hours of content.",
				"blogTitle": "Digital Spy",
				"language": "en-GB",
				"shortTitle": "Rare Replay review roundup",
				"url": "http://www.digitalspy.com/gaming/xbox-one/news/a661615/rare-replay-review-roundup-one-of-the-best-collections-in-gaming-history/",
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
		"url": "http://www.digitalspy.com/gaming/mass-effect/feature/a786594/mass-effect-andromeda-trailer-news-release-date-uk-story-characters-gameplay/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Mass Effect Andromeda trailers, news, release date and everything you need to know",
				"creators": [
					{
						"firstName": "Sam",
						"lastName": "Loveridge",
						"creatorType": "author"
					},
					{
						"firstName": "Justin",
						"lastName": "Mahboubian-Jones",
						"creatorType": "author"
					}
				],
				"date": "2017-03-13 01:00:00",
				"abstractNote": "Including story, characters and more.",
				"blogTitle": "Digital Spy",
				"language": "en-GB",
				"url": "http://www.digitalspy.com/gaming/feature/a786594/mass-effect-andromeda-trailer-news-release-date-uk-story-characters-gameplay/",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Mass Effect"
					},
					{
						"tag": "Mass Effect Andromeda"
					},
					{
						"tag": "PC"
					},
					{
						"tag": "PS4"
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
		"url": "http://www.digitalspy.com/search/earthbound",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.digitalspy.com/showbiz/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.digitalspy.com/movies/review/a822336/get-out-review-horror-race/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Get Out review: one of the best horror movies of the year. Oh, and it's *about* something",
				"creators": [
					{
						"firstName": "Rosie",
						"lastName": "Fletcher",
						"creatorType": "author"
					}
				],
				"date": "2017-03-17 02:52:00",
				"abstractNote": "Guess who's coming to Stepford for dinner?",
				"blogTitle": "Digital Spy",
				"language": "en-GB",
				"shortTitle": "Get Out review",
				"url": "http://www.digitalspy.com/movies/review/a822336/get-out-review/",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Daniel Kaluuya"
					},
					{
						"tag": "Jordan Peele"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.digitalspy.com/movies/review/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
