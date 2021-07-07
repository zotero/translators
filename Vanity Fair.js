{
	"translatorID": "62f46e1a-4c40-4dbb-82aa-71cdeb14f1bc",
	"label": "Vanity Fair",
	"creator": "Sebastian Karcher",
	"target": "^https?://www\\.vanityfair\\.com",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-06-17 12:59:13"
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

// attr()/text() v2
// eslint-disable-next-line
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}

function detectWeb(doc, _url) {
	// if (doc.querySelector('.component-search-results')) return 'multiple';
	if (doc.querySelector('.content-header__rubric--issue-date')) return 'magazineArticle';
	if (doc.querySelector('time.content-header__publish-date')) return 'blogPost';
	return false;
}

function doWeb(doc, url) {
	// eslint-disable-next-line:lines-around-comment
	/* remove multiple scraping - Vanity Fair seems to detect headless browsers and gives a 402 error
	if (detectWeb(doc, url) === 'multiple') {
		let items = {};
		for (let item of doc.querySelectorAll('.component-search-results .hed a')) {
			if (item.href && item.textContent) items[item.href] = item.textContent;
		}

		Zotero.selectItems(items, function (items) {
			ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
	*/
	scrape(doc, url);
}

function scrape(doc, url) {
	let itemType = detectWeb(doc, url);
	let item = new Zotero.Item(itemType);
	item.url = url;
	item.attachments = [{ document: doc, title: 'Snapshot', type: 'text/html' }];

	let author = text('.byline__name');
	if (author) item.creators = [ZU.cleanAuthor(author, 'author')];

	let date = text('time.content-header__publish-date');
	if (date) item.date = ZU.strToISO(date);

	item.language = "en-US";
	item.ISSN = "0733-8899";
	item.title = text('h1');

	let issue;
	switch (itemType) {
		case 'magazineArticle':
			item.abstractNote = text('.dek');

			issue = text('.content-header__rubric--issue-date');
			if (issue) item.issue = issue.replace(/\s.*/, '');

			item.publicationTitle = "Vanity Fair";
			item.tags = attr('meta[name="keywords"]', 'content').split(',').filter(tag => !tag.startsWith('_legacy_/'));
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
		"url": "http://www.vanityfair.com/online/daily/2011/08/qa-michael-lewis-on-future-of-europe-economy-and-germany-italy",
		"items": [
			{
				"itemType": "blogPost",
				"creators": [
					{
						"firstName": "Jaime",
						"lastName": "Lalinde",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot",
						"type": "text/html"
					}
				],
				"url": "https://www.vanityfair.com/news/2011/08/qa-michael-lewis-on-future-of-europe-economy-and-germany-italy",
				"date": "2011-08-10",
				"ISSN": "0733-8899",
				"language": "en-US",
				"publicationTitle": "Vanity Fair Blogs",
				"title": "Q&A: Michael Lewis on the Future of Europe’s Economy",
				"libraryCatalog": "Vanity Fair",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Q&A"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.vanityfair.com/society/features/2011/05/top-one-percent-201105",
		"items": [
			{
				"itemType": "magazineArticle",
				"creators": [
					{
						"firstName": "Joseph E.",
						"lastName": "Stiglitz",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					{ "tag": "americans" },
					{ "tag": "archive" },
					{ "tag": "magazine" },
					{ "tag": "one percent" },
					{ "tag": "society" },
					{ "tag": "wealth" }
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot",
						"type": "text/html"
					}
				],
				"url": "https://www.vanityfair.com/news/2011/05/top-one-percent-201105",
				"date": "2011-03-31",
				"ISSN": "0733-8899",
				"issue": "May",
				"language": "en-US",
				"publicationTitle": "Vanity Fair",
				"title": "Of the 1%, by the 1%, for the 1%",
				"libraryCatalog": "Vanity Fair",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.vanityfair.com/online/daily/2011/08/qa-michael-lewis-on-future-of-europe-economy-and-germany-italy",
		"items": [
			{
				"itemType": "blogPost",
				"creators": [
					{
						"firstName": "Jaime",
						"lastName": "Lalinde",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot",
						"type": "text/html"
					}
				],
				"url": "https://www.vanityfair.com/news/2011/08/qa-michael-lewis-on-future-of-europe-economy-and-germany-italy",
				"date": "2011-08-10",
				"ISSN": "0733-8899",
				"language": "en-US",
				"publicationTitle": "Vanity Fair Blogs",
				"title": "Q&A: Michael Lewis on the Future of Europe’s Economy",
				"libraryCatalog": "Vanity Fair",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Q&A"
			}
		]
	}
]
/** END TEST CASES **/
