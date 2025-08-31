{
	"translatorID": "6c957d6b-a554-474f-81a9-91c178fef65d",
	"label": "Medium",
	"creator": "Philipp Zumstein",
	"target": "^https?://([^.]+\\.)?medium\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-20 01:55:16"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2016-2021 Philipp Zumstein and Abe Jellinek

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
	if (doc.querySelector('article')) {
		return "blogPost";
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//a[@data-post-id and h3]|//div[contains(@class, "postArticle-content")]/a[section][1]|//a[div[contains(@class, "postArticle-content")]]|//h1//a[@rel="noopener"]');
	for (let row of rows) {
		var href = row.href;
		var title = ZU.xpathText(row, './/h2|.//h3');
		if (!title) title = row.textContent;
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
			if (!items) {
				return true;
			}
			ZU.processDocuments(Object.keys(items), scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		delete item.publicationTitle;
		item.blogTitle = JSON.parse(text(doc, 'script[type="application/ld+json"]'))
			.publisher.name;

		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.itemType = "blogPost";
		trans.doWeb(doc, url);
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://medium.com/technology-and-society",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://medium.com/search?q=labor",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://medium.com/@zeynep",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://medium.com/message/what-if-the-feature-is-the-bug-7957d8e685c4",
		"items": [
			{
				"itemType": "blogPost",
				"title": "What If the Feature Is the Bug?",
				"creators": [
					{
						"firstName": "Zeynep",
						"lastName": "Tufekci",
						"creatorType": "author"
					}
				],
				"date": "2014-04-24T12:59:00.600Z",
				"abstractNote": "Election monitoring, new power of social media and old power of structural power",
				"blogTitle": "The Message",
				"language": "en",
				"url": "https://medium.com/message/what-if-the-feature-is-the-bug-7957d8e685c4",
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
		"url": "https://susanorlean.medium.com/lessons-from-an-old-dog-about-creaky-bones-and-graying-hair-9539ca79e49",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Lessons from an Old Dog About Creaky Bones and Graying Hair",
				"creators": [
					{
						"firstName": "Susan",
						"lastName": "Orlean",
						"creatorType": "author"
					}
				],
				"date": "2021-07-15T16:37:56.246Z",
				"abstractNote": "The terrible truth about pets aging faster than you",
				"blogTitle": "Medium",
				"language": "en",
				"url": "https://susanorlean.medium.com/lessons-from-an-old-dog-about-creaky-bones-and-graying-hair-9539ca79e49",
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
		"url": "https://medium.com/illumination-curated/4-solid-facts-to-help-you-overcome-your-fear-of-selling-49be17f87255",
		"items": [
			{
				"itemType": "blogPost",
				"title": "4 Solid Facts To Help You Overcome Your Fear of Selling",
				"creators": [
					{
						"firstName": "Dennis De",
						"lastName": "Silva",
						"creatorType": "author"
					}
				],
				"date": "2021-07-19T19:18:52.609Z",
				"abstractNote": "There is still hope introverts, do not despair",
				"blogTitle": "ILLUMINATION-Curated",
				"language": "en",
				"url": "https://medium.com/illumination-curated/4-solid-facts-to-help-you-overcome-your-fear-of-selling-49be17f87255",
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
