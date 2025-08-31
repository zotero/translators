{
	"translatorID": "57517a91-b881-4da3-b205-751f6c7e2cae",
	"label": "LWN.net",
	"creator": "Tim Hollmann",
	"target": "^https?://lwn\\.net/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-03-26 17:27:25"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Tim Hollmann

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
	if ((doc.location.pathname.startsWith('/Articles/') || doc.location.pathname === '/Search/DoTextSearch')
			&& getSearchResults(doc, true)) {
		return 'multiple';
	}

	if (isNewsItem(doc) || isFeatureArticle(doc) || isGuestArticle(doc)) {
		return 'newspaperArticle';
	}

	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// Weekly Edition pages
	var rows = doc.querySelectorAll('.SummaryHL > a[href*="/Articles/"]');
	if (!rows.length && doc.location.pathname === '/Search/DoTextSearch') {
		// Issue pages
		rows = doc.querySelectorAll('.ArticleText > p > a[href*="/Articles/"]');
	}
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (title.startsWith('Welcome to the LWN.net Weekly Edition')) {
			continue;
		}
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			scrape(await requestDocument(url));
		}
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url = doc.location.href) {
	const title = getTitle(doc);
	const author = getAuthor(doc);
	const date = ZU.strToISO(getDate(doc));

	if (!title || !author || !date) {
		return;
	}

	let item = new Zotero.Item('newspaperArticle');

	item.title = getTitle(doc);
	item.creators.push(ZU.cleanAuthor(author, 'author', false));
	item.date = date;
	item.url = appendUrl(url, ''); // Clean the URL
	item.publicationTitle = 'LWN.net'; // "Linux Weekly News" is discouraged (see their FAQ)
	item.language = 'en-US';

	item.attachments.push({
		title: 'Snapshot',
		document: doc,
	});

	item.attachments.push({
		title: 'Article EPUB',
		mimeType: 'application/epub+zip',
		url: appendUrl(url, 'epub'),
	});

	item.complete();
}

/*
 * Detection of article type
 */

function isNewsItem(doc) {
	return doc.querySelectorAll('.Byline').length == 1;
}

function isFeatureArticle(doc) {
	return doc.querySelectorAll('.FeatureByline').length == 1;
}

function isGuestArticle(doc) {
	return doc.querySelectorAll('.GAByline').length == 1;
}

/*
 * Metadata scraping
 */

function getTitle(doc) {
	return text(doc, '.PageHeadline > h1');
}

function getAuthor(doc) {
	if (isNewsItem(doc)) {
		let author = text(doc, '.Byline').match(/\[Posted (.*) by (.*)\]/i)?.[2];

		// Regular news items are published with abbreviated author names, so we have to map them back to their full names.
		// Since regular news items should only be authored by the LWN staff themselves (4 people), this should suffice.
		const knownAuthors = {
			'corbet': 'Jonathan Corbet',
			'daroc': 'Daroc Alden',
			'jake': 'Jake Edge',
			'jzb': 'Joe Brockmeier',
		};

		if (knownAuthors.hasOwnProperty(author)) {
			author = knownAuthors[author];
		}

		return author;
	}

	if (isFeatureArticle(doc)) {
		return text(doc, '.FeatureByline > b');
	}

	if (isGuestArticle(doc)) {
		return text(doc, '.GAByline > p:last-child').match(/contributed by (.*)/i)?.[1];
	}

	return null; // Error
}

function getDate(doc) {
	if (isNewsItem(doc)) {
		return text(doc, '.Byline').match(/Posted (.*) by (.*)\]/i)?.[1];
	}

	if (isFeatureArticle(doc)) {
		return doc.querySelector('.FeatureByline').lastElementChild.previousSibling.textContent;
	}

	if (isGuestArticle(doc)) {
		return text(doc, '.GAByline > p:first-child');
	}

	return null; // Error
}

/**
 * Append the provided URL by a given relative path and also remove anchors.
 */
function appendUrl(url, path = '') {
	return (new URL(path, url)).href;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://lwn.net/Articles/525592/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "The module signing endgame",
				"creators": [
					{
						"firstName": "Jake",
						"lastName": "Edge",
						"creatorType": "author"
					}
				],
				"date": "2012-11-21",
				"language": "en-US",
				"libraryCatalog": "LWN.net",
				"publicationTitle": "LWN.net",
				"url": "https://lwn.net/Articles/525592/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Article EPUB",
						"mimeType": "application/epub+zip"
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
		"url": "https://lwn.net/Articles/709201/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Debian considering automated upgrades",
				"creators": [
					{
						"firstName": "Antoine",
						"lastName": "Beaupré",
						"creatorType": "author"
					}
				],
				"date": "2016-12-14",
				"language": "en-US",
				"libraryCatalog": "LWN.net",
				"publicationTitle": "LWN.net",
				"url": "https://lwn.net/Articles/709201/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Article EPUB",
						"mimeType": "application/epub+zip"
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
		"url": "https://lwn.net/Articles/1013723/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Framework Mono 6.14.0 released",
				"creators": [
					{
						"firstName": "Joe",
						"lastName": "Brockmeier",
						"creatorType": "author"
					}
				],
				"date": "2025-03-11",
				"language": "en-US",
				"libraryCatalog": "LWN.net",
				"publicationTitle": "LWN.net",
				"url": "https://lwn.net/Articles/1013723/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Article EPUB",
						"mimeType": "application/epub+zip"
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
		"url": "https://lwn.net/Articles/1012147/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://lwn.net/Search/DoTextSearch?words=test&ctype11=yes&ctype8=yes&ctype3=yes&cat_79=yes&cat_271=yes&cat_56=yes&cat_25=yes&cat_21=yes&cat_1=yes&cat_8=yes&cat_2=yes&cat_84=yes&cat_72=yes&cat_3=yes&catsbox=yes&order=relevance&Search=Search",
		"items": "multiple"
	}
]
/** END TEST CASES **/
