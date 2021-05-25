{
	"translatorID": "fc9b7700-b3cc-4150-ba89-c7e4443bd96d",
	"label": "Financial Times",
	"creator": "Sebastian Karcher",
	"target": "^https?://www\\.ft\\.com",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsv",
	"lastUpdated": "2021-05-25 18:07:42"
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
	if (url.includes('/content/')) {
		return "newspaperArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.search-item a.js-teaser-heading-link[href*="/content/"]');
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
	let item = new Zotero.Item('newspaperArticle');
	let meta = JSON.parse(text('script[type="application/ld+json"]'));
	if (meta['@type'] == 'WebSite') {
		throw new Error("No article metadata (probably hit paywall)");
	}
	
	item.title = meta.headline;
	item.date = ZU.strToISO(meta.datePublished);
	// abstracts and authors usually won't show up in tests - they're rendered
	// client-side and only the first author makes it into the JSON-LD.
	// https://github.com/Financial-Times/next-json-ld#example-markup-on-article-page-behind-paywall-as-seen-by-google-bot
	item.abstractNote = meta.description
		|| text('.o-topper__standfirst');
	// something funky is going on with the JSON-LD authors, so we'll just
	// parse from the HTML
	item.creators = [...doc.querySelectorAll('a[data-trackable="author"]')]
		.map(link => ZU.cleanAuthor(link.innerText, 'author', false));
	if (meta.publisher) {
		item.publicationTitle = meta.publisher.name;
	}
	item.section = text('a[data-trackable="primary-brand"]')
		|| text('a[data-trackable="primary-theme"]');
	item.url = url;
	item.libraryCatalog = '';
	item.attachments.push({
		title: "Snapshot",
		url: item.url,
		mimeType: 'text/html',
		snapshot: true
	});
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.ft.com/content/e57c04ba-c88a-4694-86b8-373c6393bf88",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Vonovia and Deutsche Wohnen to combine in €18bn real estate deal",
				"creators": [],
				"date": "2021-05-25",
				"publicationTitle": "Financial Times",
				"url": "https://www.ft.com/content/e57c04ba-c88a-4694-86b8-373c6393bf88",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://www.ft.com/content/08b9f78f-9436-3d59-8c4a-05b67cc3b706",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Coinbase wants to be “too big to fail”, lol",
				"creators": [],
				"date": "2018-10-03",
				"publicationTitle": "Financial Times",
				"url": "https://www.ft.com/content/08b9f78f-9436-3d59-8c4a-05b67cc3b706",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://www.ft.com/search?q=apple",
		"items": "multiple"
	}
]
/** END TEST CASES **/
