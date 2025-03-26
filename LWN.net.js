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
	"lastUpdated": "2025-03-26 15:54:04"
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

function detectWeb(doc, url) {
	if (isNewsItem(doc) || isFeatureArticle(doc) || isGuestArticle(doc)) {
		return 'newspaperArticle';
	}

	return false;
}

async function doWeb(doc, url) {
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
	return ZU.xpath(doc, '//div[@class="Byline"]').length == 1;
}

function isFeatureArticle(doc) {
	return ZU.xpath(doc, '//div[@class="FeatureByline"]').length == 1;
}

function isGuestArticle(doc) {
	return ZU.xpath(doc, '//div[@class="GAByline"]').length == 1;
}

/*
 * Metadata scraping
 */

function getTitle(doc) {
	return ZU.xpathText(doc, '//div[contains(@class, "PageHeadline")]/h1/text()');
}

function getAuthor(doc) {
	if (isNewsItem(doc)) {
		let author = ZU.xpathText(doc, '//div[@class="Byline"]').match(/\[Posted (.*) by (.*)\]/i)?.[2];

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
		return ZU.xpathText(doc, '//div[@class="FeatureByline"]/b');
	}

	if (isGuestArticle(doc)) {
		return ZU.xpathText(doc, '//div[@class="GAByline"]/p[2]').match(/contributed by (.*)/i)?.[1];
	}

	return null; // Error
}

function getDate(doc) {
	if (isNewsItem(doc)) {
		return ZU.xpathText(doc, '//div[@class="Byline"]').match(/Posted (.*) by (.*)\]/i)?.[1];
	}

	if (isFeatureArticle(doc)) {
		return ZU.trim(ZU.xpathText(doc, '//div[@class="FeatureByline"]/text()[2]'));
	}

	if (isGuestArticle(doc)) {
		return ZU.xpathText(doc, '//div[@class="GAByline"]/p[1]');
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
	}
]
/** END TEST CASES **/
