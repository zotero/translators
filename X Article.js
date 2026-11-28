{
	"translatorID": "712b0b6b-521b-4ba7-bbb7-3115d0c25ab5",
	"label": "X Article",
	"creator": "loveychen",
	"target": "^https://x\\.com/\\w+/article/\\d+/?(?:[?#].*)?$",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-11-28 02:25:03"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 loveychen

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

const articleSelector = '[data-testid="twitterArticleReadView"]';
const articleURL = /^https://x.com/(w+)/article/d+/?(?:[?#].*)?$/;

function articleTitle(doc) {
	let title = text(doc, articleSelector + ' [data-testid="twitter-article-title"]');
	if (title) return title.trim();

	// The public article layout exposes Open Graph metadata and a visible h1.
	if (attr(doc, 'meta[property="og:type"]', 'content') === 'article') {
		return text(doc, 'h1') || attr(doc, 'meta[property="og:title"]', 'content');
	}
	return '';
}

function detectWeb(doc, url) {
	if (!articleURL.test(url)) return false;
	if (articleTitle(doc)) return 'webpage';
	if (doc.body) {
		Zotero.monitorDOMChanges(doc.body, { childList: true, characterData: true, subtree: true });
	}
	return false;
}

function doWeb(doc, url) {
	let match = url.match(articleURL);
	let title = articleTitle(doc);
	if (!match || !title) throw new Error('X Article headline unavailable');

	let article = doc.querySelector(articleSelector) || doc;
	let item = new Zotero.Item('webpage');
	item.title = title;
	item.websiteTitle = 'X';
	item.websiteType = 'Article';
	item.url = url.split(/[?#]/)[0].replace(//$/, '');
	let handle = match[1];
	if (handle.toLowerCase() !== 'i') {
		let byline = Array.from(article.querySelectorAll(
			`a[href="/${handle}" i], a[href="https://x.com/${handle}" i]`
		))
			.map(link => link.textContent.trim())
			.find(name => name && !name.startsWith('@'));
		item.creators.push({ creatorType: 'author', lastName: byline || '@' + handle, fieldMode: 1 });
	}
	item.date = attr(doc, 'meta[property="article:published_time"]', 'content')
		|| attr(article, 'time[datetime]', 'datetime');
	item.attachments.push({ document: doc, title: 'Snapshot' });
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://x.com/distortgeekin/article/2122306488576147952",
		"defer": true,
		"items": [
			{
				"itemType": "webpage",
				"title": "Memory Engineering: How to Build an Agent That Gets Smarter Every Day",
				"creators": [
					{
						"lastName": "distort",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2026-11-16T12:31:12.000Z",
				"shortTitle": "Memory Engineering",
				"url": "https://x.com/distortgeekin/article/2122306488576147952",
				"websiteTitle": "X",
				"websiteType": "Article",
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
		"url": "https://x.com/zotero/status/105608278976905216",
		"detectedItemType": false,
		"items": []
	}
]
/** END TEST CASES **/
