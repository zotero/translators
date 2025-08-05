{
	"translatorID": "a3954ee5-ee4e-44d5-8a4e-d6662473e133",
	"label": "Jewish Telegraph Agency News Archive",
	"creator": "Anonymus",
	"target": "^https:\\/\\/www\\.jta\\.org\\/archive\\/.*",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-07-18 11:18:17"
}

/*
	***** BEGIN LICENSE BLOCK *****

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
	if (url.match(/^https?:\/\/www\.jta\.org\/archive\//) && ZU.xpathText(doc, '//h1[@class="entry-title"]')) {
		return "newspaperArticle";
	}
	return false;
}

async function doWeb(doc, url) {
	await scrape(doc, url);
}

async function scrape(doc, url) {
	const item = new Zotero.Item("newspaperArticle");

	// 1. Extract Title: Scrapes the main headline of the article.
	const titleNode = doc.querySelector('h1.entry-title');
	if (titleNode) {
		item.title = titleNode.textContent.trim();
	}

	item.publicationTitle = "Jewish Telegraphic Agency";

	item.url = url.split('?')[0].split('#')[0];

	// Extract Date:
	const dateElem = doc.querySelector('.post-pdf__date');
	item.date = dateElem.textContent.trim();

	item.attachments.push({
		title: "Snapshot",
		document: doc
	});

	item.libraryCatalog = "Jewish Telegraphic Agency Archive";
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.jta.org/archive/palestine-must-be-built-in-cooperation-with-arabs-and-christians-says-dr-weizmann",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Palestine Must Be Built in Cooperation with Arabs and Christians Says Dr. Weizmann",
				"creators": [],
				"date": "January 10, 1924",
				"libraryCatalog": "Jewish Telegraphic Agency Archive",
				"publicationTitle": "Jewish Telegraphic Agency",
				"url": "https://www.jta.org/archive/palestine-must-be-built-in-cooperation-with-arabs-and-christians-says-dr-weizmann",
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
];
/** END TEST CASES **/
