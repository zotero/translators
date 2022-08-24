{
	"translatorID": "a667ae9e-186f-46d2-b824-d70064614668",
	"label": "Slate",
	"creator": "Sebastian Karcher",
	"target": "^https?://slate\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-13 21:28:22"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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


function detectWeb(doc, _url) {
	if (doc.querySelector('article.article')) {
		return "magazineArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.topic-story');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(text(row, '.topic-story__hed'));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		item.title = text(doc, '.article__hed') || item.title;
		item.abstractNote = text(doc, '.article__dek') || item.abstractNote;
		
		item.section = text(doc, '.article__rubric');
		item.ISSN = '1091-2339';
		item.language = 'en-US';
		item.publicationTitle = 'Slate';
		
		let authors = attr(doc, 'meta[name="author"]', 'content');
		if (authors.includes(', ') && item.creators.length <= 1) {
			item.creators = authors.split(', ')
				.map(name => ZU.cleanAuthor(name, 'author'));
		}
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "magazineArticle";
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://slate.com/news-and-politics/2011/10/new-deal-accomplishments-do-conservatives-who-attack-the-new-deal-actually-know-what-america-gained-from-it.html",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "What the New Deal Accomplished",
				"creators": [
					{
						"firstName": "Michael",
						"lastName": "Hiltzik",
						"creatorType": "author"
					}
				],
				"date": "2011-10-13T14:34:23+00:00",
				"ISSN": "1091-2339",
				"abstractNote": "651,000 miles of highway. 8,000 parks. The Triborough Bridge. Do conservatives who attack the New Deal actually know what America gained from it?",
				"language": "en-US",
				"libraryCatalog": "slate.com",
				"publicationTitle": "Slate",
				"url": "https://slate.com/news-and-politics/2011/10/new-deal-accomplishments-do-conservatives-who-attack-the-new-deal-actually-know-what-america-gained-from-it.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "http://www.slate.com/articles/life/dear_prudence.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://slate.com/news-and-politics/2021/09/justice-stephen-breyer-retirement-fox-news-sunday.html",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Justice Stephen Breyer: “I Don’t Intend to Die on the Court”",
				"creators": [
					{
						"firstName": "Daniel",
						"lastName": "Politi",
						"creatorType": "author"
					}
				],
				"date": "2021-09-12T21:56:36.223Z",
				"ISSN": "1091-2339",
				"abstractNote": "The 83-year-old justice said that those who are calling for his retirement “are entitled to their opinion.”",
				"language": "en-US",
				"libraryCatalog": "slate.com",
				"publicationTitle": "Slate",
				"shortTitle": "Justice Stephen Breyer",
				"url": "https://slate.com/news-and-politics/2021/09/justice-stephen-breyer-retirement-fox-news-sunday.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://slate.com/news-and-politics/2021/09/august-wilson-john-lahr-exchange-letters-september-11.html",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "“What Damnable Horror!”",
				"creators": [
					{
						"firstName": "John",
						"lastName": "Lahr",
						"creatorType": "author"
					},
					{
						"firstName": "August",
						"lastName": "Wilson",
						"creatorType": "author"
					}
				],
				"date": "2021-09-11T10:00:04.079Z",
				"ISSN": "1091-2339",
				"abstractNote": "Two great minds of American theater process 9/11 in real time.",
				"language": "en-US",
				"libraryCatalog": "slate.com",
				"publicationTitle": "Slate",
				"url": "https://slate.com/news-and-politics/2021/09/august-wilson-john-lahr-exchange-letters-september-11.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "new-york-city"
					},
					{
						"tag": "sept-11"
					},
					{
						"tag": "theater"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
