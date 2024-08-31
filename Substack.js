{
	"translatorID": "ac3b958f-0581-4117-bebc-44af3b876545",
	"label": "Substack",
	"creator": "Abe Jellinek",
	"target": "^https://[^.]+\\.substack\\.com/(p/|archive)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-10-05 15:16:38"
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


function detectWeb(doc, url) {
	if (url.includes('/p/')) {
		return "blogPost";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.post-preview-title[href*="/p/"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
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
	let jsonText = text(doc, 'script[type="application/ld+json"]');

	if (jsonText) {
		scrapeJSON(JSON.parse(jsonText), doc, url);
	}
	else {
		scrapeHTML(doc, url);
	}
}

function scrapeJSON(json, doc, url) {
	let item = new Zotero.Item('blogPost');

	item.title = json.headline;
	item.abstractNote = json.description;
	item.date = ZU.strToISO(json.dateModified || json.datePublished);
	if (Array.isArray(json.author)) {
		for (let author of json.author) {
			item.creators.push(ZU.cleanAuthor(author.name, 'author'));
		}
	}
	else if (json.author && json.author.name) {
		item.creators.push(ZU.cleanAuthor(json.author.name, 'author'));
	}
	item.blogTitle = json.publisher.name;
	item.url = attr(doc, 'link[rel="canonical"]', 'href');
	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});
	item.websiteType = 'Substack newsletter';
	
	item.complete();
}

function scrapeHTML(doc, url) {
	let item = new Zotero.Item('blogPost');

	item.title = text(doc, 'h1.post-title');
	item.abstractNote = attr(doc, 'meta[name="description"]', 'content');
	item.date = ZU.strToISO(attr(doc, '.post-date time', 'datetime'));
	item.creators.push(ZU.cleanAuthor(text(doc, '.author a'), 'author'));
	item.blogTitle = text(doc, 'h1.navbar-title a');
	item.url = attr(doc, 'link[rel="canonical"]', 'href');
	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});
	item.websiteType = 'Substack newsletter';

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://marcstein.substack.com/p/bucks-cp3-got-what-they-wanted",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Bucks, CP3 got what they wanted",
				"creators": [
					{
						"firstName": "Marc",
						"lastName": "Stein",
						"creatorType": "author"
					}
				],
				"date": "2021-07-16",
				"abstractNote": "After the Milwaukee Bucks lost so handily to Miami in the second round of last season’s bubble playoffs, they assembled a list of players to pursue to flank Giannis Antetokounmpo and Khris Middleton with a top-flight lead guard. One of Milwaukee’s best options to create a true championship-worthy troika, seemingly, was Chris Paul.",
				"blogTitle": "Marc Stein",
				"url": "https://marcstein.substack.com/p/bucks-cp3-got-what-they-wanted",
				"websiteType": "Substack newsletter",
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
		"url": "https://worninwornout.substack.com/archive?utm_source=menu-dropdown&sort=search&search=test",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://worninwornout.substack.com/p/get-a-move-on",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Get a Move On",
				"creators": [
					{
						"firstName": "Kitty",
						"lastName": "Guo",
						"creatorType": "author"
					}
				],
				"date": "2021-06-09",
				"abstractNote": "#81: a sleek AC unit, planet-saving shampoo bars, and a core-strengthening rocking chair",
				"blogTitle": "Worn In, Worn Out",
				"url": "https://worninwornout.substack.com/p/get-a-move-on",
				"websiteType": "Substack newsletter",
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
		"url": "https://minter.substack.com/p/have-you-ever-thought-about-your/comments",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Have you ever thought about your own legacy?",
				"creators": [
					{
						"firstName": "Minter",
						"lastName": "Dial",
						"creatorType": "author"
					}
				],
				"date": "2022-09-13",
				"abstractNote": "Have you ever come across the poem by Rupert Brooke, The Soldier? It starts: If I should die, think only this of me: That there's some corner of…",
				"blogTitle": "DIALOGOS - Meaningful Conversation",
				"url": "https://minter.substack.com/p/have-you-ever-thought-about-your/comments",
				"websiteType": "Substack newsletter",
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
