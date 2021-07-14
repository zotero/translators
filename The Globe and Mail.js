{
	"translatorID": "e0234bcf-bc56-4577-aa94-fe86a27f6fd6",
	"label": "The Globe and Mail",
	"creator": "Sonali Gupta and Abe Jellinek",
	"target": "^https?://www\\.theglobeandmail\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-14 21:43:14"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017-2021 Sonali Gupta and Abe Jellinek
	
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
	if (url.includes("/search/") && getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (ZU.xpathText(doc, '//article')) {
		return "newspaperArticle";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.c-search-results-news a');
	for (let row of rows) {
		var href = row.href;
		var title = ZU.trimInternal(text(row, '.c-card__hed-text'));
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
			if (!items) {
				return;
			}
			ZU.processDocuments(Object.keys(items), scrape);
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
		item.place = ZU.capitalizeTitle(text(doc, '.placeline'), true);
		
		if (!item.creators.length) {
			for (let authorLink of doc.querySelectorAll('a.byline')) {
				item.creators.push(ZU.cleanAuthor(authorLink.textContent, 'author'));
			}
		}
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "newspaperArticle";
		// TODO map additional meta tags here, or delete completely
		trans.addCustomFields({
			'twitter:description': 'abstractNote'
		});
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.theglobeandmail.com/news/toronto/doug-ford-says-hes-not-yet-sure-about-his-political-future/article21428180/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Doug Ford to decide provincial Tory leadership run in 'a couple weeks'",
				"creators": [
					{
						"firstName": "Ann",
						"lastName": "Hui",
						"creatorType": "author"
					}
				],
				"date": "2014-11-03T16:16:12-0500",
				"abstractNote": "He says he will decide soon about whether to run for Ontario Tory leadership and does not rule out another attempt at the Toronto mayoralty",
				"language": "en-CA",
				"libraryCatalog": "www.theglobeandmail.com",
				"publicationTitle": "The Globe and Mail",
				"url": "https://www.theglobeandmail.com/news/toronto/doug-ford-says-hes-not-yet-sure-about-his-political-future/article21428180/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Christine Elliott"
					},
					{
						"tag": "Doug Ford"
					},
					{
						"tag": "Jim Flaherty"
					},
					{
						"tag": "John Tory"
					},
					{
						"tag": "Ontario Progressive Conservative"
					},
					{
						"tag": "Rob Ford"
					},
					{
						"tag": "leadership"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.theglobeandmail.com/search/?q=nuclear",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.theglobeandmail.com/politics/article-liberals-filibuster-opposition-call-for-inquiry-into-parliamentary/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Liberals filibuster opposition call for inquiry into parliamentary funds paid to Trudeau’s close friend",
				"creators": [
					{
						"firstName": "Robert",
						"lastName": "Fife",
						"creatorType": "author"
					},
					{
						"firstName": "Steven",
						"lastName": "Chase",
						"creatorType": "author"
					}
				],
				"date": "2021-07-12T19:52:05-0400",
				"abstractNote": "Opposition wanted Tom Pitfield, the founder of Data Sciences, to appear before the ethics committee, but Liberal MPs prevented the motion from coming to a vote by talking out the clock",
				"language": "en-CA",
				"libraryCatalog": "www.theglobeandmail.com",
				"place": "Ottawa",
				"publicationTitle": "The Globe and Mail",
				"url": "https://www.theglobeandmail.com/politics/article-liberals-filibuster-opposition-call-for-inquiry-into-parliamentary/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Liberal"
					},
					{
						"tag": "Michael Barrett"
					},
					{
						"tag": "NDP"
					},
					{
						"tag": "committee"
					},
					{
						"tag": "company"
					},
					{
						"tag": "data"
					},
					{
						"tag": "house"
					},
					{
						"tag": "liberal"
					},
					{
						"tag": "liberals"
					},
					{
						"tag": "mps"
					},
					{
						"tag": "party"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
