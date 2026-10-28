{
	"translatorID": "1bfb4748-3925-4de6-bcb4-5de2967f6d3f",
	"label": "The New Republic",
	"creator": "Sebastian Karcher, Vera de Kok",
	"target": "^https?://(www\\.)?newrepublic\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-28 12:00:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	The New Republic Translator
	(Created as part of the 2012 Zotero Trainer Workshop in Syracus
	and with contributions from participants.)
	Copyright © 2012-2026 Sebastian Karcher, Vera de Kok

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

/*
	The site no longer carries any of the markup the original Framework.js translator
	scraped (a[itemprop="author"], time[itemprop="datePublished"], div.result-title), so
	articles came through without creators and date, and tag pages were not detected at
	all. Current pages do have meta author / article:published_time / article:tag, which
	Embedded Metadata reads, plus the byline as Author_anchor links; tag pages list their
	results in .articleResults__result cards.
*/

function detectWeb(doc, _url) {
	if (doc.querySelector('h1.article-headline')) return 'magazineArticle';
	if (getSearchResults(doc, true)) return 'multiple';
	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	for (let link of doc.querySelectorAll('.articleResults__result a.Hed')) {
		let title = ZU.trimInternal(link.textContent);
		if (!title || !link.href) continue;
		if (checkOnly) return true;
		found = true;
		items[link.href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		Zotero.selectItems(getSearchResults(doc, false), (items) => {
			if (items) ZU.processDocuments(Object.keys(items), doWeb);
		});
		return;
	}
	scrape(doc, url);
}

function scrape(doc, _url) {
	let translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		item.itemType = 'magazineArticle';

		let creators = getCreators(doc);
		if (creators.length) item.creators = creators;

		// article:published_time is a bare date, and it is all the page offers
		if (!item.date) {
			let published = getAttr(doc, 'meta[property="article:published_time"]', 'content');
			if (published) item.date = ZU.strToISO(published) || published;
		}

		item.publicationTitle = 'The New Republic';
		item.ISSN = '0028-6583';

		// the magazine publishes in English only, and the page tag is the malformed "en-us"
		item.language = 'en-US';

		item.complete();
	});
	translator.translate();
}

function getCreators(doc) {
	// the byline sits in the article header; a page-wide query would also pick up the
	// authors of the sidebar and "related" lists. The same author is repeated in the
	// author block further down, so deduplicate by name as well.
	let names = [];
	let seen = {};
	for (let anchor of getBylineAnchors(doc)) {
		let name = ZU.trimInternal(anchor.textContent || anchor.title || '');
		if (!name || seen[name.toLowerCase()]) continue;
		seen[name.toLowerCase()] = true;
		names.push(name);
	}

	if (!names.length) {
		let meta = getAttr(doc, 'meta[name="author"]', 'content');
		if (meta) names = meta.split(/\s*,\s*|\s+and\s+/).filter(name => name.trim());
	}

	return names.map(name => ZU.cleanAuthor(name, 'author', false));
}

function getBylineAnchors(doc) {
	let anchors = doc.querySelectorAll('.article-meta a.Author_anchor');
	if (anchors.length) return anchors;
	return doc.querySelectorAll('.article-header a.Author_anchor');
}

function getAttr(doc, selector, attribute) {
	let element = doc.querySelector(selector);
	return element ? element.getAttribute(attribute) : null;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://newrepublic.com/article/116791/janet-yellen-senate-testimony-waffles-too-big-too-fail",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Uh-Oh: Janet Yellen Is Waffling About Whether \"Too Big To Fail\" Is Over",
				"creators": [
					{
						"firstName": "Danny",
						"lastName": "Vinik",
						"creatorType": "author"
					}
				],
				"date": "2014-02-27",
				"ISSN": "0028-6583",
				"abstractNote": "Her Senate testimony did not inspire confidence.",
				"language": "en-US",
				"libraryCatalog": "newrepublic.com",
				"publicationTitle": "The New Republic",
				"shortTitle": "Uh-Oh",
				"url": "https://newrepublic.com/article/116791/janet-yellen-senate-testimony-waffles-too-big-too-fail",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Banks"
					},
					{
						"tag": "Economics"
					},
					{
						"tag": "Janet Yellen"
					},
					{
						"tag": "Politics"
					},
					{
						"tag": "The Plank"
					},
					{
						"tag": "Too Big To Fail"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://newrepublic.com/article/215302/steelworkers-trump-shape-midterm-elections",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "How Steelworkers Might Shape the Midterm Elections",
				"creators": [
					{
						"firstName": "Timothy",
						"lastName": "Noah",
						"creatorType": "author"
					}
				],
				"date": "2026-09-11",
				"ISSN": "0028-6583",
				"abstractNote": "Trump’s “golden share” in U.S. Steel puts him in a bind.",
				"language": "en-US",
				"libraryCatalog": "newrepublic.com",
				"publicationTitle": "The New Republic",
				"url": "https://newrepublic.com/article/215302/steelworkers-trump-shape-midterm-elections",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Communism"
					},
					{
						"tag": "Democratic Socialism"
					},
					{
						"tag": "Donald Trump"
					},
					{
						"tag": "Economy"
					},
					{
						"tag": "Golden Share"
					},
					{
						"tag": "Labor"
					},
					{
						"tag": "Politics"
					},
					{
						"tag": "Socialism"
					},
					{
						"tag": "U.S. steel"
					},
					{
						"tag": "Unions"
					},
					{
						"tag": "United Steelworkers"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://newrepublic.com/post/166890/democrats-roe-overturn-midterms-2022",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "The Democrats’ Theory of Change: Wait for the Republicans to Screw Up",
				"creators": [
					{
						"firstName": "Jason",
						"lastName": "Linkins",
						"creatorType": "author"
					}
				],
				"date": "2022-06-25",
				"ISSN": "0028-6583",
				"abstractNote": "The party tends to succeed only after the GOP brings disaster. Meanwhile, conservatives are busy executing decades-long plans that are transforming the country.",
				"language": "en-US",
				"libraryCatalog": "newrepublic.com",
				"publicationTitle": "The New Republic",
				"shortTitle": "The Democrats’ Theory of Change",
				"url": "https://newrepublic.com/post/166890/democrats-roe-overturn-midterms-2022",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Abortion Rights"
					},
					{
						"tag": "Democratic Party"
					},
					{
						"tag": "EPA"
					},
					{
						"tag": "Law"
					},
					{
						"tag": "Midterm Elections"
					},
					{
						"tag": "Politics"
					},
					{
						"tag": "Power Mad"
					},
					{
						"tag": "Republican Party"
					},
					{
						"tag": "Roe V. Wade"
					},
					{
						"tag": "Supreme Court"
					},
					{
						"tag": "The Soapbox"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://newrepublic.com/tags/labor",
		"items": "multiple"
	}
]
/** END TEST CASES **/
