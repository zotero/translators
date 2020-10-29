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
	"lastUpdated": "2020-10-29 08:53:37"
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


// attr()/text() v2
// eslint-disable-next-line
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null}

function detectWeb(doc, url) {
	if (url.includes('search') && getSearchResults(doc, true)) {
		return 'multiple';
	} 
	else if (url.match(/\/r\/[a-z\d]+\/comments\//g)) {
		return 'forumPost';
	}  else {
		return 'multiple';
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.SQnoC3ObvgnGjWt90zD9Z._2INHSNB8V5eaWp4P0rY_mE');
	for (let row of rows) {
		var href = row.href + '.json';
		var title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}

	return found ? items : false;
}

function doWeb(doc, url) {
	var json_url = url.split("?")[0] + '.json';
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			Zotero.debug(items);
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.doGet(articles, scrape);
		});
	} else if (detectWeb(doc, url) == "forumPost" && url.match(/\/r\/[a-z\d]+\/comments\/[a-z\d]{6}\/[a-z\d_]+\/[a-z\d]{7}\//g)) {
		ZU.doGet(json_url, scrape_comment);
	} else {
		ZU.doGet(json_url, scrape);
	}
}


function scrape(text) {
	var newItem = new Zotero.Item("forumPost");
	var reddit_json = JSON.parse(text);
	var reddit_data = reddit_json[0]["data"]["children"][0]["data"];
	newItem.title = reddit_data["title"];
	newItem.creators.push(ZU.cleanAuthor(reddit_data["author"], "author", true));
	newItem.url = 'www.reddit.com' + reddit_data["permalink"];
	var post_date = new Date(reddit_data["created_utc"]*1000);
	newItem.date = post_date.toISOString();
	newItem.postType = "Reddit Post";
	newItem.forumTitle = 'r/'+reddit_data["subreddit"];
	newItem.websiteTitle = "reddit.com";
	newItem.attachments.push({
		url : 'https://www.reddit.com' + reddit_data["permalink"],
		title : "Reddit Post Snapshot",
		type : "text/html"
	});
	newItem.complete();
}

function scrape_comment(text) {
	var newItem = new Zotero.Item("forumPost");
	var reddit_json = JSON.parse(text);
	var parent_data = reddit_json[0]["data"]["children"][0]["data"];
	var reddit_data = reddit_json[1]["data"]["children"][0]["data"];
	newItem.title = ZU.ellipsize(reddit_data["body"], 20);
	newItem.creators.push(ZU.cleanAuthor(reddit_data["author"], "author", true));
	newItem.url = 'www.reddit.com' + reddit_data["permalink"];
	var post_date = new Date(reddit_data["created_utc"]*1000);
	newItem.date = post_date.toISOString();
	newItem.postType = "Reddit Comment";
	newItem.forumTitle = 'r/'+reddit_data["subreddit"];
	newItem.websiteTitle = "reddit.com";
	newItem.extra = 'Post URL: www.reddit.com' + parent_data["permalink"]; 
	newItem.attachments.push({
		url : 'https://www.reddit.com' + reddit_data["permalink"],
		title : "Reddit Comment Snapshot",
		type : "text/html"
	});
	newItem.complete();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.reddit.com/search/?q=zotero",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.reddit.com/r/zotero/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.reddit.com/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.reddit.com/r/zotero/comments/j7ityb/zotero_ipad_bookmarklet_not_working/",
		"items": [
			{
				"itemType": "forumPost",
				"title": "Zotero iPad bookmarklet not working",
				"creators": [
					{
						"lastName": "cegmondiale",
						"creatorType": "author"
					}
				],
				"date": "2020-10-08T18:43:48.000Z",
				"forumTitle": "r/zotero",
				"postType": "Reddit Post",
				"url": "www.reddit.com/r/zotero/comments/j7ityb/zotero_ipad_bookmarklet_not_working/",
				"attachments": [
					{
						"title": "Reddit Post Snapshot",
						"type": "text/html"
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
		"url": "https://www.reddit.com/r/zotero/comments/j7ityb/zotero_ipad_bookmarklet_not_working/g88zfcp/",
		"items": [
			{
				"itemType": "forumPost",
				"title": "I use the exact same…",
				"creators": [
					{
						"lastName": "lukelbd93",
						"creatorType": "author"
					}
				],
				"date": "2020-10-09T20:07:37.000Z",
				"extra": "Post URL: www.reddit.com/r/zotero/comments/j7ityb/zotero_ipad_bookmarklet_not_working/",
				"forumTitle": "r/zotero",
				"postType": "Reddit Comment",
				"url": "www.reddit.com/r/zotero/comments/j7ityb/zotero_ipad_bookmarklet_not_working/g88zfcp/",
				"attachments": [
					{
						"title": "Reddit Comment Snapshot",
						"type": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
