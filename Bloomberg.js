{
	"translatorID": "a509f675-cf80-4b70-8cbc-2ea8664dd38f",
	"label": "Bloomberg",
	"creator": "Philipp Zumstein",
	"target": "^https?://(www)?\\.bloomberg\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-09-08 07:04:46"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2016 Philipp Zumstein
	
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
	if (url.indexOf('/articles/')>-1) {
		return "webpage";
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//a[@data-tracker-label="headline"]');
	for (var i=0; i<rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
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
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.getTranslatorObject(function(trans) {
		trans.doWeb(doc, url);
	});
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.bloomberg.com/search?query=argentina",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.bloomberg.com/news/articles/2012-01-04/bank-earnings-increase-57-in-analyst-forecasts-which-proved-wrong-in-2011",
		"items": [
			{
				"itemType": "webpage",
				"title": "Bank Earnings Jump 57% in Analyst Forecasts Proved Wrong in 2011",
				"creators": [
					{
						"firstName": "Michael J.",
						"lastName": "Moore",
						"creatorType": "author"
					},
					{
						"firstName": "Dawn",
						"lastName": "Kopecki",
						"creatorType": "author"
					}
				],
				"abstractNote": "Analysts’ failure to foresee declining earnings per share for the biggest U.S. banks last year hasn’t stopped them from predicting an even bigger profit surge for 2012.",
				"url": "http://www.bloomberg.com/news/articles/2012-01-04/bank-earnings-increase-57-in-analyst-forecasts-which-proved-wrong-in-2011",
				"websiteTitle": "Bloomberg.com",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"Bank of America Corp",
					"Earnings",
					"Goldman Sachs Group Inc/The",
					"JPMorgan Chase & Co",
					"Markets",
					"Morgan Stanley",
					"New York"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.bloomberg.com/view/articles/2012-01-05/four-economists-come-together-to-say-we-agree-business-class",
		"items": [
			{
				"itemType": "webpage",
				"title": "Four Economists Come Together to Say ‘We Agree’: Business Class",
				"creators": [],
				"date": "2012-01-05T00:01:34.000Z",
				"abstractNote": "Jan. 5 (Bloomberg) -- “If you laid all the economists in",
				"shortTitle": "Four Economists Come Together to Say ‘We Agree’",
				"url": "http://www.bloombergview.com/articles/2012-01-05/four-economists-come-together-to-say-we-agree-business-class",
				"websiteTitle": "Bloomberg View",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"China",
					"Economic Research",
					"Economics",
					"Exchange Rate",
					"Harvard University",
					"Media",
					"Monetary Policy",
					"Stocks",
					"Tax Reform"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/