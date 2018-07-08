{
	"translatorID": "c7c72227-22c0-42d2-8041-9edbfe598160",
	"label": "Okay Africa",
	"creator": "czar",
	"target": "^https?://(www\\.)?okayafrica\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-07-08 14:44:31"
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
	if (doc.querySelector('h1.headline')) {
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
		var authorMetadata = doc.querySelector('a.post-author__name');
		if (authorMetadata) {
			item.creators.push(ZU.cleanAuthor(authorMetadata.text, "author"));
		}
		if (item.tags) { // convert tags from lower to title case
			for (let tag in item.tags) { // need "in" for index to write to item.tags
				item.tags[tag] = item.tags[tag].replace(/\b\w/g, l => l.toUpperCase());
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
	var rows = doc.querySelectorAll('h1.widget__headline a');
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
		"url": "http://www.okayafrica.com/154-contemporary-african-art-fair-london/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "1:54 Contemporary African Art Fair Returns To London With 27 Galleries & 100+ Artists",
				"creators": [
					{
						"firstName": "Alyssa",
						"lastName": "Klein",
						"creatorType": "author"
					}
				],
				"date": "2014-09-30T15:58:54",
				"abstractNote": "The second edition of the 1:54 Contemporary African Art Fair returns to the Somerset House in London from 16 to 19 October 2014.",
				"blogTitle": "OkayAfrica",
				"language": "en",
				"shortTitle": "1",
				"url": "http://www.okayafrica.com/154-contemporary-african-art-fair-london/",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "100women-97228"
					},
					{
						"tag": "1:54"
					},
					{
						"tag": "Contemporary African Art Fair"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.okayafrica.com/arts--culture/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.okayafrica.com/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.okayafrica.com/search/?q=%22emeka+ogboh%22",
		"items": "multiple"
	}
]
/** END TEST CASES **/
