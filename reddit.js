{
	"translatorID": "23bacc11-98e3-4b78-b1ef-cc2c9a04b893",
	"label": "reddit",
	"creator": "Lukas Kawerau",
	"target": "^https?://www\\.reddit\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-10-28 15:35:26"
}

/*
***** BEGIN LICENSE BLOCK *****
Reddit Translator
Copyright (C) 2020 Lukas Kawerau, lukas@kawerau.org
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
   ***** END LICENSE BLOCK *****
*/


function attr(docOrElem, selector, attr, index) {
	var elem = index ? docOrElem.querySelectorAll(selector).item(index) : docOrElem.querySelector(selector);
	return elem ? elem.getAttribute(attr) : null;
}

function text(docOrElem, selector, index) {
	var elem = index ? docOrElem.querySelectorAll(selector).item(index) : docOrElem.querySelector(selector);
	return elem ? elem.textContent : null;
}

function detectWeb(doc, url) {
	// Adjust the inspection of url as required
	if (url.indexOf('search') != -1 && getSearchResults(doc, true)) {
		return 'multiple';
	}
	// Adjust the inspection of url as required
	else {
		return 'forumPost';
	}
	// Add other cases if needed
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// Adjust the CSS Selectors
	var rows = doc.querySelectorAll('.mw-search-result-heading a');
	for (var i=0; i<rows.length; i++) {
		// Adjust if required, use Zotero.debug(rows) to check
		var href = rows[i].href;
		// Adjust if required, use Zotero.debug(rows) to check
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
	var json_url = url + '.json'
	Zotero.Utilities.HTTP.doGet(json_url, function(text) {
		var newItem = new Zotero.Item("forumPost");
		var reddit_data = JSON.parse(text);
		newItem.title = reddit_data[0]["data"]["children"][0]["data"]["title"];
		newItem.creators.push(ZU.cleanAuthor(reddit_data[0]["data"]["children"][0]["data"]["author"], "author", false));
		newItem.url = 'www.reddit.com' + reddit_data[0]["data"]["children"][0]["data"]["permalink"];
		var post_date = new Date(reddit_data[0]["data"]["children"][0]["data"]["created_utc"]*1000);
		newItem.date = post_date.toISOString();
		// Zotero.debug(reddit_data);
		newItem.postType = "Reddit Post";
		newItem.forumTitle = 'r/'+reddit_data[0]["data"]["children"][0]["data"]["subreddit"];
		newItem.websiteTitle = "reddit.com";
		newItem.complete();
		//Zotero.debug(newItem);
		Zotero.done();
	}, function() {});

}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.reddit.com/r/spacex/comments/jj7arf/spacex_partners_with_leolabs_to_track_starlink/",
		"items": [
			{
				"itemType": "forumPost",
				"creators": [
					{
						"firstName": "",
						"lastName": "SpikePlayz",
						"creatorType": "author"
					}
				],
				"title": "SpaceX Partners with LeoLabs to Track Starlink Satellites",
				"url": "www.reddit.com/r/spacex/comments/jj7arf/spacex_partners_with_leolabs_to_track_starlink/",
				"date": "2020-10-27T18:54:37.000Z",
				"postType": "Reddit Post",
				"forumTitle": "r/spacex",
				"websiteTitle": "reddit.com",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/
