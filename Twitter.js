{
	"translatorID": "31659710-d04e-45d0-84ba-8e3f5afc4a54",
	"label": "Twitter",
	"creator": "Avram Lyon, Philipp Zumstein, Tomas Fiers, Bo An",
	"target": "^https?://([^/]+\\.)?twitter\\.com/",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-06-27 16:39:46"
}

/*
	***** BEGIN LICENSE BLOCK *****

   Twitter Translator
   Copyright (C) 2011 Avram Lyon, ajlyon@gmail.com

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


function detectWeb(doc, _url) {
	if (doc.getElementById('react-root')) {
		Z.monitorDOMChanges(doc.getElementById('react-root'), { childList: true });
	}
	
	if (_url.includes('/status/')) {
		return "blogPost";
	}

	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	else {
		return false;
	}
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[contains(@class, "content")]');
	for (var i = 0; i < rows.length; i++) {
		var href = ZU.xpathText(rows[i], './/a[contains(@class, "js-permalink") and contains(@href, "/status/")]/@href');
		var title = ZU.xpathText(rows[i], './div[contains(@class, "js-tweet-text-container")]');
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	let detectResult = detectWeb(doc, url)
	if (detectResult == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) {
				var articles = [];
				for (var i in items) {
					articles.push(i);
				}
				ZU.processDocuments(articles, scrape);
			}
		});
	}
	else {
		scrapeNew(doc, url);
	}
}

function scrapeNew(doc, url) {
	
	var item = new Zotero.Item("blogPost");
	let originalTitle = ZU.xpathText(doc, '//title')
	item.title = originalTitle.replace(/\n/g,' ').match(/.* .* (Twitter: ".*)\/ Twitter/)[1];

	item.shortTitle = false;
	
	item.abstractNote = originalTitle.split('Twitter: "')[1].split('\" / Twitter')[0]

	// Get block if exists
	let blockquote = ZU.xpathText(doc, '//article[contains(@role, "article")]//div[contains(@role,"blockquote")]')
	if (blockquote) {
		item.abstractNote = item.abstractNote + '\n\n' + '[Quote]' + '\n\> \"' + blockquote + "\""
	}

	item.language = ZU.xpathText(doc, '//article[contains(@role,"article")]//div[contains(@dir, "auto")]/@lang').split(',')[0];
			
		var author = originalTitle.match(/(\(\d+\) )?(.*) .* Twitter: "/)[2];
		if (author) {
		item.creators.push({lastName: author, fieldMode: 1
		});
	}
	var date = ZU.xpathText(doc, '//article[contains(@role,"article")]//span//span');
	// Z.debug('DATE: ' + date)
	let dateClean = date.match(/, (.{0,3}\d:\d\d.*)·(.*), ·/)
	// Z.debug('Date Clean: ' + dateClean)
	
	if (dateClean[1]) {
		if (dateClean[2]) {
			item.date = dateClean[1].trim() + ', ' + dateClean[2].trim()
		} else
		item.date = dateClean[1].trim()
	}

	let retweet
	if (ZU.xpathText(doc, '//article[contains(@role,"article")]//a[contains(@href, "retweets")]')){
		retweet = ZU.xpathText(doc, '//article[contains(@role,"article")]//a[contains(@href, "retweets")]').match(/\d./)[0]
	}
	let likes
	if (ZU.xpathText(doc, '//article[contains(@role,"article")]//a[contains(@href, "likes")]')) {
	 likes = ZU.xpathText(doc, '//article[contains(@role,"article")]//a[contains(@href, "likes")]').match(/\d./)[0]
	}
	// div used for replies, retweets, and likes. Yet to refine.
	// ZU.xpathText(doc, '//article[contains(@role,"article")]//div[contains(@role, "group")]/@aria-label')
	
	var urlParts = url.split('/');
	
	item.websiteType = "Twitter";
	item.url = url;
	
	item.attachments.push({
		url: url,
		title: "Link",
		snapshot: false
		});
	
	if (!item.extra) {
		item.extra = ''
	}
	if (retweet) {
		item.extra = item.extra + 'Retweets: ' + retweet
	}
	if (likes) {
		item.extra = item.extra + '\n' + 'Likes: ' + likes
	}
	
	item.extra = item.extra + '\n' + 'Twitter Handle: ' + '@' + urlParts[3];
	
	let urls = item.abstractNote.match(/https:\/\/t.co\/\w+/)
	
	if (urls) {
		for (var i = 0; i < urls.length; i++) {
			item.attachments.push({
				url: urls[i],
				title: urls[i],
				mimeType: "text/html",
				snapshot: true
			});
		}
	}
	item.complete();
}

// Old scraper

// function scrape(doc, url) {
// 	var item = new Zotero.Item("blogPost");
// 	item.title = ZU.xpathText(doc, '//div[contains(@class,"permalink-tweet-container")]//p[contains(@class, "js-tweet-text")]');
// 	// Don't set short title when tweet contains colon
// 	item.shortTitle = false;
// 	item.language = ZU.xpathText(doc, '//div[contains(@class,"permalink-tweet-container")]//p[contains(@class, "js-tweet-text")]/@lang');
// 	var author = ZU.xpathText(doc, '//div[contains(@class,"permalink-header")]//strong[contains(@class,"fullname")]');
// 	if (author) {
// 		item.creators.push(ZU.cleanAuthor(author, "author"));
// 	}
// 	var date = ZU.xpathText(doc, '//div[contains(@class,"permalink-tweet-container")]//span[@class="metadata"]/span[1]');
// 	if (date) {
// 		// e.g. 10:22 AM - 1 Feb 2018
// 		var m = date.split('-');
// 		// Support localization where am/pm are lowercase
// 		m[0] = m[0].toUpperCase();
// 		if (m.length == 2) {
// 			// times with AM
// 			if (m[0].includes("AM")) {
// 				m[0] = m[0].replace("AM", "").trim();
// 				if (m[0].indexOf(":") == 1) m[0] = "0" + m[0];
// 				m[0] = m[0].replace("12:", "00:");
// 			}
// 			// times with PM
// 			if (m[0].includes("PM")) {
// 				m[0] = m[0].replace("PM", "").replace(/\d+:/, function (matched) {
// 					return (parseInt(matched) + 12) + ":";
// 				}).trim();
// 				m[0] = m[0].replace("24:", "12:");
// 			}
// 			item.date = ZU.strToISO(m[1]) + "T" + m[0];
// 		}
// 		else {
// 			item.date = date;
// 		}
// 	}
// 	var urlParts = url.split('/');
// 	item.blogTitle = '@' + urlParts[3];
// 	item.websiteType = "Tweet";
// 	item.url = url;
// 	item.attachments.push({
// 		document: doc,
// 		title: "Snapshot"
// 	});
// 	var urls = ZU.xpath(doc, '//div[contains(@class,"permalink-tweet-container")]//a[contains(@class, "twitter-timeline-link")]/@title');
// 	for (var i = 0; i < urls.length; i++) {
// 		item.attachments.push({
// 			url: urls[i].textContent,
// 			title: urls[i].textContent,
// 			snapshot: false
// 		});
// 	}
// 	item.complete();
// }


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://twitter.com/zotero/status/105608278976905216",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Zotero 3.0 beta is now available with duplicate detection and tons more. Runs outside Firefox with Chrome or Safari!  http://www.zotero.org/blog/announcing-zotero-3-0-beta-release/ …",
				"creators": [
					{
						"firstName": "",
						"lastName": "Zotero",
						"creatorType": "author"
					}
				],
				"date": "2011-08-22T04:52",
				"blogTitle": "@zotero",
				"language": "en",
				"url": "https://twitter.com/zotero/status/105608278976905216",
				"websiteType": "Tweet",
				"attachments": [
					{
						"title": "Snapshot"
					},
					{
						"title": "http://www.zotero.org/blog/announcing-zotero-3-0-beta-release/",
						"snapshot": false
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
		"url": "https://twitter.com/DieZeitansage/status/958792005034930176",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Es ist 21:00 Uhr.",
				"creators": [
					{
						"firstName": "",
						"lastName": "Zeitansage",
						"creatorType": "author"
					}
				],
				"date": "2018-01-31T12:00",
				"blogTitle": "@DieZeitansage",
				"language": "de",
				"url": "https://twitter.com/DieZeitansage/status/958792005034930176",
				"websiteType": "Tweet",
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
	}
]
/** END TEST CASES **/
