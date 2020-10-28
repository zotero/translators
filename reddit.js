{
	"translatorID": "23bacc11-98e3-4b78-b1ef-cc2c9a04b893",
	"label": "reddit",
	"creator": "Lukas Kawerau",
	"target": "^https?://(www\\.)?reddit.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-10-28 13:27:20"
}

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
		return 'Forum Post';
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
		newItem.websiteTitle = "Reddit.com";
		newItem.complete();
		// Zotero.debug(newItem);
		Zotero.done();
	}, function() {});
	
}
