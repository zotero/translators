{
	"translatorID": "a0dfd108-1d71-4bb1-b787-af64fd0c41cc",
	"label": "Squarespace",
	"creator": "Thaddeus Hetling",
	"target": "",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 300,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-01-29 21:47:54"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Thaddeus Hetling

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
	if (doc.querySelector('.sqs-block-content') && doc.querySelector('meta[property="og:type"][content="article"]')) {
		return 'blogPost';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.sqs-search-container-item');
	for (let row of rows) {
		let href = null;
		try {
			href = new URL(row.parentElement.attributes['data-url'].value, document.baseURI).href;
		}
		catch {
			continue;
		}

		let title = text(row, '.sqs-title');

		if (!href || !title) continue;
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
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

function getMetadataItem(doc, prop) {
	return attr(doc, 'html>head>meta[itemprop="' + prop + '"]', 'content');
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		item.websiteType = 'Squarespace blog';
		item.date = getMetadataItem(doc, 'datePublished');
		let author = getMetadataItem(doc, 'author');
		if (author) {
			item.creators.push({
				lastName: author,
				fieldMode: 1,
				creatorType: 'author'
			});
		}
		if (item.abstractNote) item.abstractNote = ZU.unescapeHTML(item.abstractNote);
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'blogPost';
	await em.doWeb(doc, url);
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.minimist.ca/articles/my-favourite-squarespace-css-hacks",
		"items": [
			{
				"itemType": "blogPost",
				"title": "My Favourite Squarespace CSS Hacks",
				"creators": [
					{
						"lastName": "Karl Patton",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2018-06-14T12:00:00-0400",
				"abstractNote": "One of the main concerns I've heard from clients and others thinking about using Squarespace is that they don't want their website to look and act like everyone else's site and look like a template.",
				"blogTitle": "Minimist Website Design | Squarespace Expert & Website Designer",
				"language": "en-CA",
				"url": "https://www.minimist.ca/articles/my-favourite-squarespace-css-hacks",
				"websiteType": "Squarespace blog",
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
		"url": "https://www.thestyledsquare.com/blog-content/how-to-reduce-spacer-block-height-with-css-in-squarespace",
		"items": [
			{
				"itemType": "blogPost",
				"title": "How to reduce spacer block height with CSS in Squarespace (7.0 & 7.1)",
				"creators": [
					{
						"lastName": "The Styled Square",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2021-12-10T11:12:50-0800",
				"abstractNote": "The Spacer Block element is an essential tool for your Squarespace website design, but by default, the Spacer Block has a set height that can be too large for some instances.   In this tutorial, we’re sharing copy & paste CSS to adjust the Spacer Block minimum height for more flexibility whi",
				"blogTitle": "The Styled Square | Premium Squarespace Website Templates",
				"language": "en-US",
				"url": "https://www.thestyledsquare.com/blog-content/how-to-reduce-spacer-block-height-with-css-in-squarespace",
				"websiteType": "Squarespace blog",
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
		"url": "https://www.silvabokis.com/search?q=squarespace",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://originalbox.co/blog/tags-squarespace-add-categories",
		"items": [
			{
				"itemType": "blogPost",
				"title": "What are tags on Squarespace and how to add categories",
				"creators": [
					{
						"lastName": "Roshni Kahol",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2020-10-31T17:28:38+0000",
				"abstractNote": "Using the blog page as an example, we explain how to use tags on Squarespace. We also teach how to add, edit and delete categories on Squarespace.",
				"blogTitle": "Original Box",
				"language": "en-GB",
				"url": "https://originalbox.co/blog/tags-squarespace-add-categories",
				"websiteType": "Squarespace blog",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "2020"
					},
					{
						"tag": "october 2020"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
