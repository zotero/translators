{
	"translatorID": "ea10f270-ab9b-4baa-b056-b74ea6da65e2",
	"label": "Shacknews",
	"creator": "czar",
	"target": "^https?://(www\\.)shacknews\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-07-08 05:01:59"
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


// attr()/text() v2 per https://github.com/zotero/translators/issues/1277
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}


function detectWeb(doc, url) {
	if (/\/article\//.test(url)) { // news, reviews, guides, and features
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
		item.language = "en-US";
		item.date = text(doc,'.date.clear-fix').replace(/[\s\n]+/g," ").replace(/(\d+)\s(\w+)/,"$2 $1,");
		var authorMetadata = text(doc,'div.author');
		if (authorMetadata) {
			item.creators.push(ZU.cleanAuthor(authorMetadata.replace('Written By ',''), "author"));
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
	var rows = doc.querySelectorAll('#feature-hero h1, .post-content h2, .gsc-webResult .gs-title a');
	var links = doc.querySelectorAll('#feature-hero a.hero-item, .post-content h2 a, .gsc-webResult .gs-title a');
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
		"url": "http://www.shacknews.com/article/52563/earthbotched-a-history-of-nintendo",
		"items": [
			{
				"itemType": "blogPost",
				"title": "EarthBotched: A History of Nintendo vs. Starmen",
				"creators": [
					{
						"firstName": "Aaron",
						"lastName": "Linde",
						"creatorType": "author"
					}
				],
				"date": "May 6, 2008 10:37 am",
				"blogTitle": "Shacknews",
				"language": "en-US",
				"shortTitle": "EarthBotched",
				"url": "http://www.shacknews.com/article/52563/earthbotched-a-history-of-nintendo",
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
		"url": "http://www.shacknews.com/article/99249/the-legend-of-zelda-breath-of-the-wild-review-the-legend-lives-on",
		"items": [
			{
				"itemType": "blogPost",
				"title": "The Legend of Zelda: Breath of the Wild Review: The Legend Lives On",
				"creators": [
					{
						"firstName": "Jason",
						"lastName": "Faulkner",
						"creatorType": "author"
					}
				],
				"date": "March 2, 2017 3:02 am",
				"abstractNote": "The Nintendo Switch launches with the most ambitious Zelda title to date. See what makes The Legend of Zelda: Breath of the Wild an instant classic in our review",
				"blogTitle": "Shacknews",
				"language": "en-US",
				"shortTitle": "The Legend of Zelda",
				"url": "http://www.shacknews.com/article/99249/the-legend-of-zelda-breath-of-the-wild-review-the-legend-lives-on",
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
		"url": "http://www.shacknews.com/topic/review",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.shacknews.com/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
