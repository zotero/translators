{
	"translatorID": "c1d7fbc6-d2c9-4056-b132-f82c42509c6a",
	"label": "Kinja",
	"creator": "czar",
	"target": "^https?://(.*)(avclub|deadspin|earther|gawker|gizmodo|jalopnik|jezebel|kotaku|lifehacker|splinternews|thetakeout|theroot|theonion|clickhole|theinventory)\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-07-07 22:30:49"
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
	if (/-\d{10}#?$|\/\d{7}\//.test(url)) {
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
		if (item.creators[0].firstName == "The A. V.") {
			delete item.creators[0].firstName;              // remove the firstName param
			item.creators[0].lastName = "The A. V. Club";	// write the desired name to lastName
			item.creators[0].fieldMode = 1;                 // change to single-field mode
		}
		Z.debug('date? '+item.date)
		if (!item.date) {									// basically to handle Gawker
			item.date = doc.querySelector('time').getAttribute('datetime');
			Z.debug(item.date);
		}
		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.addCustomFields({ // pull from meta tags in here
			'cXenseParse:recs:publishtime': 'date'
		});
		trans.doWeb(doc, url);
	});
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('div.content-meta__headline, section.main h1.headline');
	var links = doc.querySelectorAll('div.content-meta__headline a, section.main h1.headline a');
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
		"url": "https://kotaku.com/the-10-best-game-expansions-1732758285",
		"items": [
			{
				"itemType": "blogPost",
				"title": "The Ten Best Game Expansions",
				"creators": [
					{
						"firstName": "Rick",
						"lastName": "Lane",
						"creatorType": "author"
					}
				],
				"date": "2015-12-23T11:30:00.827Z",
				"abstractNote": "Whether it’s a good old-fashioned expansion pack or modern DLC, spinning additional content for already-released games has been a standard practice in the industry for decades. But the best expansions do more than simply add a few extra hours of the same game for you to play.",
				"blogTitle": "Kotaku",
				"language": "en-US",
				"url": "https://kotaku.com/the-10-best-game-expansions-1732758285",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Kotaku"
					},
					{
						"tag": "dlc"
					},
					{
						"tag": "evergreen"
					},
					{
						"tag": "expansion"
					},
					{
						"tag": "kotaku uk"
					},
					{
						"tag": "kotakucore"
					},
					{
						"tag": "lists"
					},
					{
						"tag": "opinion"
					},
					{
						"tag": "uk evergreen"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kotaku.com/5878852/the-12-best-games-on-pc",
		"items": [
			{
				"itemType": "blogPost",
				"title": "The 12 Best Games on PC",
				"creators": [
					{
						"firstName": "Kotaku",
						"lastName": "Staff",
						"creatorType": "author"
					}
				],
				"date": "2017-11-10T22:40:00.852Z",
				"abstractNote": "PC gamers have got a pretty great thing going. Interesting, experimental indie games? Yup. Complex strategy simulations? Totally. The shiniest, prettiest versions of big-budget console games? They get a lot of those, too.",
				"blogTitle": "Kotaku",
				"language": "en-US",
				"url": "https://kotaku.com/5878852/the-12-best-games-on-pc",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "12 bests"
					},
					{
						"tag": "Kotaku"
					},
					{
						"tag": "editor's picks"
					},
					{
						"tag": "kotaku core"
					},
					{
						"tag": "pc"
					},
					{
						"tag": "the bests"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kotaku.com/search?q=earthbound",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://kotaku.com/tag/kotkaucore",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://lifehacker.com/im-gloveworx-founder-leyon-azubuike-and-this-is-how-i-1826146651",
		"items": [
			{
				"itemType": "blogPost",
				"title": "I'm Gloveworx Founder Leyon Azubuike, and This Is How I Work",
				"creators": [
					{
						"firstName": "Nick",
						"lastName": "Douglas",
						"creatorType": "author"
					}
				],
				"date": "2018-06-13T13:00:00.651Z",
				"abstractNote": "Every overnight success is years in the making. Boxing trainer Leyon Azubuike’s first attempt at starting a gym didn’t pan out, but he went back to work as a private coach and tried again. Now his gym, Gloveworx, has two L.A. locations and is soon expanding to New York. We talked to him about his career path, his coffee substitute, and how he still runs private training sessions while managing a growing business.",
				"blogTitle": "Lifehacker",
				"language": "en-US",
				"url": "https://lifehacker.com/im-gloveworx-founder-leyon-azubuike-and-this-is-how-i-1826146651",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Boxing"
					},
					{
						"tag": "Career"
					},
					{
						"tag": "Fitness"
					},
					{
						"tag": "Lifehacker"
					},
					{
						"tag": "Sports"
					},
					{
						"tag": "business"
					},
					{
						"tag": "coaches"
					},
					{
						"tag": "work"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
