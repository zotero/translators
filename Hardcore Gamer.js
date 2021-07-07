{
	"translatorID": "f986be20-2870-41ae-be81-3649be4ce4e2",
	"label": "Hardcore Gamer",
	"creator": "czar",
	"target": "^https?://(www\\.)?hardcoregamer\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-07-08 01:13:37"
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
	if (/\d{4}\/\d{2}\/\d{2}\//.test(url)) {
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
		item.blogTitle = "Hardcore Gamer";
		item.title = text(doc,'h1.entry-title');
		var authorMetadata = text(doc,'a[rel="author"]')
		if (authorMetadata) { // only found single authors to support
			item.creators.push(ZU.cleanAuthor(authorMetadata.replace(/\son\s.*/,''), "author"));
		}
		item.date = authorMetadata.replace(/.*\son\s/,'');
		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.doWeb(doc, url);
	});
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h2.slider-excerpt, .featured-image-single, .header-thumb, h1.entry-title');
	var links = doc.querySelectorAll('h2.slider-excerpt a, .featured-image-single a, .header-thumb a, h1.entry-title a');
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
		"url": "https://www.hardcoregamer.com/2016/02/02/pax-south-want-to-ruin-a-friendship-play-videoball/190827/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "PAX South: Want to Ruin a Friendship? Play VIDEOBALL",
				"creators": [
					{
						"firstName": "Jason",
						"lastName": "Bohn",
						"creatorType": "author"
					}
				],
				"date": "February 2, 2016",
				"blogTitle": "Hardcore Gamer",
				"language": "en-US",
				"shortTitle": "PAX South",
				"url": "https://www.hardcoregamer.com/2016/02/02/pax-south-want-to-ruin-a-friendship-play-videoball/190827/",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "action button"
					},
					{
						"tag": "iron galaxy"
					},
					{
						"tag": "tim rogers"
					},
					{
						"tag": "videoball"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.hardcoregamer.com/category/reviews/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.hardcoregamer.com/?s=earthbound",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.hardcoregamer.com/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
