{
	"translatorID": "81f151f1-8f7e-4042-9e15-0fedda396d97",
	"label": "GamesRadar",
	"creator": "czar",
	"target": "^https?://(www\\.)gamesradar\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-07-08 02:19:02"
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
	if (doc.querySelector('h1[itemprop="name headline"]')) {
		return "blogPost";
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	} else return null;
}


function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // embedded metadata (EM)
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) { // corrections to EM
		item.itemType = "blogPost";
		item.publicationTitle = "GamesRadar";
		item.language = item.language.replace('EN','en').replace('_','-');
		item.creators = []; // reset bad author metadata
		var authorMetadata = doc.querySelectorAll('a[rel="author"]');
		for (let author of authorMetadata) {
			item.creators.push(ZU.cleanAuthor(author.text, "author"));
		}
		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.addCustomFields({ // pull from meta tags in here
			'pub_date': 'date'
		});
		trans.doWeb(doc, url);
	});
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h3.article-name');
	var links = doc.querySelectorAll('div.listingResult a:first-of-type');
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
		"url": "https://www.gamesradar.com/south-park-stick-truth-inspired-earthbound-sounds-really-tough-make/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "South Park: The Stick of Truth is inspired by Earthbound, sounds really tough to make",
				"creators": [
					{
						"firstName": "Henry",
						"lastName": "Gilbert",
						"creatorType": "author"
					}
				],
				"date": "2013-07-22T22:11:39+00:00",
				"abstractNote": "South Park creators answer few questions but are pretty fun anyway",
				"blogTitle": "GamesRadar",
				"language": "en-US",
				"shortTitle": "South Park",
				"url": "https://www.gamesradar.com/south-park-stick-truth-inspired-earthbound-sounds-really-tough-make/",
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
		"url": "https://www.gamesradar.com/zelda-breath-of-the-wild-review/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "The Legend of Zelda: Breath of the Wild review: 'It's taken 18 years, but Nintendo has done it again: this is the adventure game to beat'",
				"creators": [
					{
						"firstName": "Matthew",
						"lastName": "Castle",
						"creatorType": "author"
					}
				],
				"date": "2017-03-02T11:01:09+00:00",
				"abstractNote": "Few gaming moments were as transformative as standing in Hyrule Field in Ocarina of Time, looking up at Death Mountain and realising that, yes, you could get from here to there. In hindsight it wasn’t entirely true - transition screens partitioned the mountain into chunks that wouldn’t choke the N64 - but at the time: whoa. It was a moment so genre-defining that I’m not sure Nintendo ever stepped out of that mountain’s shadow. That’s the curse of rewriting the rulebook - once the ecstasy of innovation has died down, it’s just another template you’re beholden to. Well, Breath of the Wild doesn’t want to play by the rules.The rulebook isn’t just torn up. It’s crushed beneath boulders, burned in a forest inferno and struck by lightning. Science has arrived in Hyrule, a rush of freeform simulation that brings with it a spark of life that could never quite ignite in the hand-crafted worlds of old. This is a Hyrule where a sud",
				"blogTitle": "GamesRadar",
				"language": "en-GB",
				"shortTitle": "The Legend of Zelda",
				"url": "https://www.gamesradar.com/zelda-breath-of-the-wild-review/",
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
		"url": "https://www.gamesradar.com/things-we-learned-at-pax-east-2017/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "5 things we learned at PAX East 2017",
				"creators": [
					{
						"firstName": "Anthony John",
						"lastName": "Agnello",
						"creatorType": "author"
					},
					{
						"firstName": "Susan",
						"lastName": "Arendt",
						"creatorType": "author"
					},
					{
						"firstName": "Sam",
						"lastName": "Prell",
						"creatorType": "author"
					}
				],
				"date": "2017-03-13T21:55:49+00:00",
				"abstractNote": "PAX East 2017 felt like a natural extension of the year 2017 as a whole: there were too many good games to properly digest them all. From major titles like Nintendo’s next big first-party game to stellar indie games from rising publishers like Adult Swim Games, PAX East was rife with excellent games coming to PS4, Xbox One, Nintendo Switch and even some promising goodies on PS Vita and Nintendo 3DS. Here’s what we learned about at the show.",
				"blogTitle": "GamesRadar",
				"language": "en-GB",
				"url": "https://www.gamesradar.com/things-we-learned-at-pax-east-2017/",
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
		"url": "https://www.gamesradar.com/nintendo/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.gamesradar.com/opm/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.gamesradar.com/search/?searchTerm=earthbound",
		"items": "multiple"
	}
]
/** END TEST CASES **/
