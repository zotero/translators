{
	"translatorID": "62f46e1a-4c40-4dbb-82aa-71cdeb14f1bc",
	"label": "Vanity Fair",
	"creator": "Sebastian Karcher",
	"target": "^https?://www\\.vanityfair\\.com/",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-13 22:24:07"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Vanity Fair Translator
	Copyright © 2011 Sebastian Karcher

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
	if (doc.querySelector('.content-header__rubric--issue-date')) {
		return 'magazineArticle';
	}
	if (doc.querySelector('time.content-header__publish-date')) {
		return 'blogPost';
	}
	return false;
}

function doWeb(doc, url) {
	// no multiples - Vanity Fair seems to detect headless browsers and gives
	// a 402 error
	scrape(doc, url);
}

function scrape(doc, url) {
	let itemType = detectWeb(doc, url);
	let item = new Zotero.Item(itemType);
	item.url = url;
	item.attachments = [{ document: doc, title: 'Snapshot' }];

	let author = text(doc, '.byline__name');
	if (author) item.creators = [ZU.cleanAuthor(author, 'author')];

	let date = text(doc, 'time.content-header__publish-date');
	if (date) item.date = ZU.strToISO(date);

	item.language = "en-US";
	item.ISSN = "0733-8899";
	item.title = text(doc, 'h1');

	let issue;
	switch (itemType) {
		case 'magazineArticle':
			item.abstractNote = text(doc, '.dek');

			issue = text(doc, '.content-header__rubric--issue-date');
			if (issue) item.issue = issue.replace(/\s.*/, '');

			item.publicationTitle = "Vanity Fair";
			item.tags = attr(doc, 'meta[name="keywords"]', 'content').split(',').filter(tag => !tag.startsWith('_legacy_/'));
			break;

		case 'blogPost':
			item.blogTitle = "Vanity Fair Blogs";
			break;

		default:
			throw new Error(`Unexpected item type ${itemType}`);
	}

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.vanityfair.com/news/2011/08/qa-michael-lewis-on-future-of-europe-economy-and-germany-italy",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Q&A: Michael Lewis on the Future of Europe’s Economy",
				"creators": [
					{
						"firstName": "Jaime",
						"lastName": "Lalinde",
						"creatorType": "author"
					}
				],
				"date": "2011-08-10",
				"blogTitle": "Vanity Fair Blogs",
				"language": "en-US",
				"shortTitle": "Q&A",
				"url": "https://www.vanityfair.com/news/2011/08/qa-michael-lewis-on-future-of-europe-economy-and-germany-italy",
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
		"url": "https://www.vanityfair.com/news/2011/05/top-one-percent-201105",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Of the 1%, by the 1%, for the 1%",
				"creators": [
					{
						"firstName": "Joseph E.",
						"lastName": "Stiglitz",
						"creatorType": "author"
					}
				],
				"date": "2011-03-31",
				"ISSN": "0733-8899",
				"issue": "May",
				"language": "en-US",
				"libraryCatalog": "Vanity Fair",
				"publicationTitle": "Vanity Fair",
				"url": "https://www.vanityfair.com/news/2011/05/top-one-percent-201105",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "americans"
					},
					{
						"tag": "archive"
					},
					{
						"tag": "magazine"
					},
					{
						"tag": "one percent"
					},
					{
						"tag": "society"
					},
					{
						"tag": "wealth"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.vanityfair.com/news/2011/08/qa-michael-lewis-on-future-of-europe-economy-and-germany-italy",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Q&A: Michael Lewis on the Future of Europe’s Economy",
				"creators": [
					{
						"firstName": "Jaime",
						"lastName": "Lalinde",
						"creatorType": "author"
					}
				],
				"date": "2011-08-10",
				"blogTitle": "Vanity Fair Blogs",
				"language": "en-US",
				"shortTitle": "Q&A",
				"url": "https://www.vanityfair.com/news/2011/08/qa-michael-lewis-on-future-of-europe-economy-and-germany-italy",
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
		"url": "https://www.vanityfair.com/news/2021/08/how-florida-turned-american-politics-into-a-tabloid-nightmare",
		"items": [
			{
				"itemType": "blogPost",
				"title": "How Florida Turned American Politics Into a Tabloid Nightmare",
				"creators": [
					{
						"firstName": "Joe",
						"lastName": "Hagan",
						"creatorType": "author"
					}
				],
				"date": "2021-08-13",
				"blogTitle": "Vanity Fair Blogs",
				"language": "en-US",
				"url": "https://www.vanityfair.com/news/2021/08/how-florida-turned-american-politics-into-a-tabloid-nightmare",
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
