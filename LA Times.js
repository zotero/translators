{
	"translatorID": "e4fe1596-a8c4-4d09-945f-120c4d83e580",
	"label": "LA Times",
	"creator": "Sebastian Karcher",
	"target": "^https?://(www\\.|travel\\.|articles\\.|latimesblogs\\.)?latimes\\.com",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-14 15:10:00"
}

/*
   LA Times Translator
   Copyright (C) 2012 Sebastian Karcher

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url) {
	if (/\/search\//.test(url) && getSearchResults(doc, true)) {
		return "multiple";
	}
	if (ZU.xpathText(doc, '//meta[@property="og:type"]/@content') == 'article'
		|| getJSONLD(doc)) {
		return "newspaperArticle";
	}
	return false;
}
function getJSONLD(doc) {
	for (let script of doc.querySelectorAll('script[type="application/ld+json"]')) {
		let data;
		try {
			data = JSON.parse(script.textContent);
		}
		catch (e) {
			continue;
		}
		for (let block of (Array.isArray(data) ? data : [data])) {
			if (!block || typeof block !== 'object') continue;
			for (let node of (block['@graph'] ? block['@graph'] : [block])) {
				if (node['@type'] == 'NewsArticle'
					|| (node['@type'] == 'Article' && node.headline)) {
					return node;
				}
			}
		}
	}
	return null;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	for (let a of doc.querySelectorAll('a[data-element="search-result-title"]')) {
		let href = a.href;
		let title = ZU.trimInternal(a.textContent);
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
			if (!items) return;
			ZU.requestDocument(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var item = new Zotero.Item("newspaperArticle");
	var data = getJSONLD(doc);
	if (!data) {
		return;
	}
	item.title = data.headline || ZU.xpathText(doc, '//meta[@property="og:title"]/@content');
	item.abstractNote = data.description
		|| ZU.xpathText(doc, '//meta[@property="og:description"]/@content');
	item.date = data.datePublished
		|| ZU.xpathText(doc, '//meta[@property="article:published_time"]/@content');
	item.section = ZU.xpathText(doc, '//meta[@property="article:section"]/@content');
	item.language = (ZU.xpathText(doc, '//meta[@property="og:locale"]/@content') || 'en_US').replace('_', '-');
	item.ISSN = "0458-3035";
	item.publicationTitle = "Los Angeles Times";
	item.url = ZU.xpathText(doc, '//link[@rel="canonical"]/@href') || url;
	item.libraryCatalog = "www.latimes.com";

	let authors = data.author || [];
	if (typeof authors == 'object' && !Array.isArray(authors)) {
		authors = [authors];
	}
	for (let author of authors) {
		let name = typeof author == 'string' ? author : author.name;
		if (!name) continue;
		name = ZU.trimInternal(name).replace(/,$/, '');
		// Wire-service and syndication attributions ("Associated Press",
		// "Reuters", ...) are organizations, not people - never make them authors.
		if (/^(?:the\s+)?(?:associated press|a\.?p\.?|agence france-presse|afp|bloomberg(?: news)?|reuters|cnn|nbc news|cnbc|getty images|city news service|tribune news service|the new york times|the washington post)$/i.test(name)) {
			continue;
		}
		// OCR-style and agency attributions ("By <name>, Staff Writer") may keep
		// the role in the name; split it off before parsing.
		let role = name.match(/\s*[-,]\s*(Staff Writer|Staff|Columnist|Contributing Writer)$/);
		if (role) {
			name = name.slice(0, role.index);
		}
		if (!name) continue;
		if (name.split(/\s+/).length > 3) {
			item.creators.push({ lastName: name, creatorType: "author", fieldMode: 1 });
		}
		else {
			item.creators.push(ZU.cleanAuthor(name, "author"));
		}
	}

	item.attachments.push({
		title: "LA Times Snapshot",
		url: url,
		mimeType: "text/html"
	});

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.latimes.com/california/story/2026-10-13/bass-raman-tussle-in-final-televised-la-mayoral-debate",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Bass and Raman tussle in final televised L.A. mayoral debate",
				"creators": [
					{
						"firstName": "Noah",
						"lastName": "Goldberg",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Zahniser",
						"creatorType": "author"
					}
				],
				"date": "2026-10-14T03:52:38.500Z",
				"ISSN": "0458-3035",
				"abstractNote": "Bass portrayed Raman as someone who isn't ready to lead the city, while Raman described the mayor as being \"missing in action\" during fires in Pacific Palisades and Boyle Heights.",
				"language": "en-US",
				"libraryCatalog": "www.latimes.com",
				"publicationTitle": "Los Angeles Times",
				"section": "California",
				"url": "https://www.latimes.com/california/story/2026-10-13/bass-raman-tussle-in-final-televised-la-mayoral-debate",
				"attachments": [
					{
						"title": "LA Times Snapshot",
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
		"url": "https://www.latimes.com/business/hollywood/la-fi-ct-youtube-tv-20170405-story.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "YouTube TV launches today. It has some cool features and some big drawbacks",
				"creators": [],
				"date": "2017-04-05T18:00:00.000Z",
				"ISSN": "0458-3035",
				"abstractNote": "YouTube TV, Google's new streaming package of about 40 television channels, is the tech industry's latest bid to get cable-shunning millennials to pay for live TV over the Internet.",
				"language": "en-US",
				"libraryCatalog": "www.latimes.com",
				"publicationTitle": "Los Angeles Times",
				"section": "Hollywood Inc.",
				"url": "https://www.latimes.com/business/hollywood/la-fi-ct-youtube-tv-20170405-story.html",
				"attachments": [
					{
						"title": "LA Times Snapshot",
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
