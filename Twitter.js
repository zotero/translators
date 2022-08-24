{
	"translatorID": "31659710-d04e-45d0-84ba-8e3f5afc4a54",
	"label": "Twitter",
	"creator": "Bo An, Dan Stillman",
	"target": "^https?://([^/]+\\.)?twitter\\.com/",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-02-01 20:17:45"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Twitter Translator
	Copyright © 2020-2021 Bo An, Dan Stillman
	
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


let titleRe = /^(?:\(\d+\) )?(.+) .* Twitter: .([\S\s]+). \/ Twitter/;

function detectWeb(doc, url) {
	if (url.includes('/status/')) {
		return "forumPost";
	}
	return false;
}

function unshortenURLs(doc, str) {
	var matches = str.match(/https?:\/\/t\.co\/[a-z0-9]+/gi);
	if (matches) {
		for (let match of matches) {
			let url = unshortenURL(doc, match);
			// Replace t.co URLs (with optional query string, such as "?amp=1")
			// in text with real URLs
			str = str.replace(new RegExp(ZU.quotemeta(match) + '(\\?\\w+)?'), url);
		}
	}
	return str;
}

function unshortenURL(doc, tCoURL) {
	var a = doc.querySelector('a[href*="' + tCoURL + '"]');
	return (a ? a.textContent.replace(/…$/, '') : false) || tCoURL;
}

function extractURLs(doc, str) {
	var urls = [];
	var matches = str.match(/https?:\/\/t\.co\/[a-z0-9]+/gi);
	if (matches) {
		for (let match of matches) {
			urls.push(unshortenURL(doc, match));
		}
	}
	return urls;
}

// Find the link to the permalink (e.g., "8h")
function findPermalinkLink(doc, canonicalURL) {
	let path = canonicalURL.match(/https?:\/\/[^/]+(.+)/)[1];
	return doc.querySelector(`a[href="${path}" i]`);
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	var item = new Zotero.Item("forumPost");

	var canonicalURL = doc.querySelector('link[rel="canonical"]').href;
	// For unclear reasons, in some cases the URL doesn't have capitalization
	// but rel="canonical" does, and in other cases it's the other way around,
	// so if rel="canonical" doesn't have any caps, use the URL
	if (!/[A-Z]/.test(canonicalURL)) {
		canonicalURL = url.match(/^([^?#]+)/)[1];
	}
	var originalTitle = doc.title;
	var unshortenedTitle = ZU.unescapeHTML(unshortenURLs(doc, originalTitle));
	// Extract tweet from "[optional count] [Display Name] on Twitter: “[tweet]”"
	var matches = unshortenedTitle.match(titleRe);
	var [, author, tweet] = matches;
	
	// Title is tweet with newlines removed
	item.title = tweet.replace(/\s+/g, ' ');
	
	// Don't set short title when tweet contains colon
	item.shortTitle = false;
	
	// Identify the tweet block by looking for the client link (e.g, "Tweetbot")
	var articleEl;
	var clientLink = doc.querySelector('a[href*="source-labels"]');
	if (clientLink) {
		articleEl = clientLink.closest('article');
	}
	// If client link not found, use permalink
	//
	// This is the case on share URLs such as
	// https://twitter.com/aerospacecorp/status/1391160460150382598?s=27,
	// but that doesn't serve content to the test runner for some reason, so
	// we don't have a test for it.
	else {
		let a = findPermalinkLink(doc, canonicalURL);
		articleEl = a.closest('article');
	}
	var tweetSelector = 'article[role="article"]';
	
	// If the title is modified (e.g., because we stripped newlines), add the
	// full tweet in Abstract.
	//
	// Same if it's a quote tweet, since the quoted tweet isn't included in the
	// title. It would be better to just get the tweet URL, but that doesn't
	// seem to be available on the page.
	//
	// DEBUG: 'role*=blockquote' doesn't seem to be used anymore, so there
	// doesn't seem to be a good way to get the contents of the quoted tweet
	let blockquote = articleEl.querySelector(`${tweetSelector} div[role*=blockquote]`);
	if (tweet != item.title || blockquote) {
		let note = ZU.text2html('“' + tweet + '”');
		if (blockquote) {
			note += '<blockquote>'
					+ ZU.text2html(blockquote.innerText.replace(/[\s]+/g, ' ').trim())
				+ "</blockquote>";
		}
		item.notes.push({ note });
	}

	item.language = attr(articleEl, 'div[lang]', 'lang');
	
	item.creators.push({
		lastName: `${author} [@${canonicalURL.split('/')[3]}]`,
		fieldMode: 1,
		creatorType: 'author'
	});
	
	// Date and time
	var spans = articleEl.querySelectorAll(`${tweetSelector} a span`);
	for (let span of spans) {
		// Is this used in all locales?
		let dotSep = ' · ';
		let str = span.textContent;
		if (!str.includes(dotSep)) {
			// Z.debug("Date separator not found")
			
			// Share URLs don't show the date, so use the <time> in the
			// permalink link
			//
			// E.g., https://twitter.com/aerospacecorp/status/1391160460150382598?s=27
			let a = findPermalinkLink(doc, canonicalURL);
			if (a) {
				let time = a.querySelector('time');
				if (time) {
					let dt = time.getAttribute('datetime');
					item.date = dt.replace(/:\d\d\.000/, '');
				}
			}
			continue;
		}
		let [time, date] = str.split(dotSep);
		item.date = ZU.strToISO(date);
		
		time = time.trim();
		let matches = time.match(/^([0-9]{1,2})[:h]([0-9]{2})(?: (.+))?$/);
		if (matches) {
			let hour = matches[1];
			let minute = matches[2];
			let ampm = matches[3];
			// If "PM", add 12 hours
			if (ampm && ampm.toLowerCase() == 'pm' && hour != "12") {
				hour = parseInt(hour) + 12;
			}
			// Convert to UTC and add 'T' and 'Z'
			let isoDate = item.date + 'T' + ("" + hour).padStart(2, '0') + ':' + minute;
			isoDate = new Date(isoDate).toISOString();
			item.date = isoDate.replace(/:00\.000/, '');
		}
	}
	
	item.forumTitle = "Twitter";
	item.postType = "Tweet";
	item.url = canonicalURL;
	
	/*
	// Add retweets and likes to Extra
	let retweets;
	let likes;
	let str = text(articleEl, 'a[href*="retweets"]');
	if (str) {
		// Extract from "123 Retweets", "1.2K Retweets"
		str = str.match(/^[^ ]+/);
		if (str) {
			retweets = str[0];
		}
	}
	str = text(articleEl, 'a[href*="likes"]');
	if (str) {
		str = str.match(/^[^ ]+/);
		if (str) {
			likes = str[0];
		}
	}
	if (!item.extra) {
		item.extra = '';
	}
	if (retweets) {
		item.extra += 'Retweets: ' + retweets;
	}
	if (likes) {
		item.extra += '\n' + 'Likes: ' + likes;
	}
	*/
	
	item.attachments.push({
		document: doc,
		title: "Snapshot"
	});
	
	// Add links to any URLs
	var urls = extractURLs(doc, originalTitle);
	for (let i = 0; i < urls.length; i++) {
		let url = urls[i];
		let title = "Link";
		// Number links if more than one
		if (urls.length > 1) {
			title += " " + (i + 1);
		}
		// Include domain in parentheses
		let domain = url.match(/https?:\/\/(?:www\.)?([^/]+)+/)[1];
		if (domain != 't.co') {
			title += ` (${domain})`;
		}
		item.attachments.push({
			url,
			title,
			mimeType: "text/html",
			snapshot: false
		});
	}
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://twitter.com/zotero/status/105608278976905216",
		"defer": true,
		"items": [
			{
				"itemType": "forumPost",
				"title": "Zotero 3.0 beta is now available with duplicate detection and tons more. Runs outside Firefox with Chrome or Safari! http://zotero.org/blog/announcing-zotero-3-0-beta-release/",
				"creators": [
					{
						"lastName": "Zotero [@zotero]",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2011-08-22T11:52Z",
				"forumTitle": "Twitter",
				"language": "en",
				"postType": "Tweet",
				"url": "https://twitter.com/zotero/status/105608278976905216",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Link (zotero.org)",
						"mimeType": "text/html",
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
		"url": "https://twitter.com/zotero/status/1037407737154596864",
		"defer": true,
		"items": [
			{
				"itemType": "forumPost",
				"title": "Zotero, Mendeley, EndNote. You have a lot of choices for managing your research. Here’s why we think you should choose Zotero. https://t.co/Qu2g5cGBGu",
				"creators": [
					{
						"lastName": "Zotero [@zotero]",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2018-09-05T18:30Z",
				"forumTitle": "Twitter",
				"language": "en",
				"postType": "Tweet",
				"url": "https://twitter.com/zotero/status/1037407737154596864",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Link",
						"mimeType": "text/html",
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
		"url": "https://twitter.com/zotero/status/1105581965405757440",
		"defer": true,
		"items": [
			{
				"itemType": "forumPost",
				"title": "You don’t have to send students to a site that will spam them with ads or try to charge them money just to build a bibliography. Instead, tell them about ZoteroBib, the free, open-source, privacy-protecting bibliography generator from Zotero. https://zbib.org",
				"creators": [
					{
						"lastName": "Zotero [@zotero]",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2019-03-12T21:30Z",
				"forumTitle": "Twitter",
				"language": "en",
				"postType": "Tweet",
				"url": "https://twitter.com/zotero/status/1105581965405757440",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Link (zbib.org)",
						"mimeType": "text/html",
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
		"defer": true,
		"items": [
			{
				"itemType": "forumPost",
				"title": "Es ist 21:00 Uhr.",
				"creators": [
					{
						"lastName": "Zeitansage [@DieZeitansage]",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2018-01-31T20:00Z",
				"forumTitle": "Twitter",
				"language": "de",
				"postType": "Tweet",
				"url": "https://twitter.com/DieZeitansage/status/958792005034930176",
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
	}
]
/** END TEST CASES **/
