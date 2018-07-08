{
	"translatorID": "af48bcb9-fae7-463d-a751-dff7b8589336",
	"label": "Paste",
	"creator": "czar",
	"target": "^https?://(www\\.)?pastemagazine\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-07-08 04:27:50"
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
	if (/\/(blogs|articles)\//.test(url)) {
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
		item.publicationTitle = "Paste";
		item.language = "en-US";
		item.date = Zotero.Utilities.strToISO(text(doc,'.bylinepublished').replace(/.*\|\s(.*)\s\|.*/,'$1'));
		var authorMetadata = text(doc,'.bylinepublished a');
		if (authorMetadata) {
			authorMetadata = authorMetadata.split(" and ");
			for (let author of authorMetadata) {
				item.creators.push(ZU.cleanAuthor(author, "author"));
			}
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
	var rows = doc.querySelectorAll('.landing-top b.title, .articles-standard .grid-x b.title');
	var links = doc.querySelectorAll('.landing-top a.copy-container, .articles-standard .grid-x a.copy-container');
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
		"url": "https://www.pastemagazine.com/blogs/lists/2014/02/5-dlc-that-got-it-right.html",
		"items": [
			{
				"itemType": "blogPost",
				"title": "5 Videogame DLC Expansions That Get It Right",
				"creators": [
					{
						"firstName": "Garrett",
						"lastName": "Martin",
						"creatorType": "author"
					}
				],
				"date": "2014-02-14",
				"abstractNote": "How will the new expansion for The Last of Us compare to these five DLC classics?",
				"blogTitle": "Paste",
				"language": "en-US",
				"url": "https://www.pastemagazine.com/blogs/lists/2014/02/5-dlc-that-got-it-right.html",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "5 Videogame DLC Expansions That Get It Right"
					},
					{
						"tag": "Articles"
					},
					{
						"tag": "Lists"
					},
					{
						"tag": "Lists"
					},
					{
						"tag": "Paste"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.pastemagazine.com/articles/2018/06/10-exciting-games-we-saw-at-e3-2018.html",
		"items": [
			{
				"itemType": "blogPost",
				"title": "10 Exciting Games We Saw at E3 2018",
				"creators": [
					{
						"firstName": "Holly",
						"lastName": "Green",
						"creatorType": "author"
					},
					{
						"firstName": "Garrett",
						"lastName": "Martin",
						"creatorType": "author"
					}
				],
				"date": "2018-06-22",
				"abstractNote": "E3 is about hype, and sometimes that hype is about games that nobody at E3 was even allowed to play.",
				"blogTitle": "Paste",
				"language": "en-US",
				"url": "https://www.pastemagazine.com/articles/2018/06/10-exciting-games-we-saw-at-e3-2018.html",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "10 Exciting Games We Saw at E3 2018"
					},
					{
						"tag": "Articles"
					},
					{
						"tag": "Lists"
					},
					{
						"tag": "Lists"
					},
					{
						"tag": "Paste"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.pastemagazine.com/search?t=earthbound",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.pastemagazine.com/tv",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.pastemagazine.com/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
