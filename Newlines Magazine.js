{
	"translatorID": "33ad4fed-9a2f-4bf6-85a6-7c09a022b573",
	"label": "Newlines Magazine",
	"creator": "Abe Jellinek",
	"target": "^https?://newlinesmag\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-17 03:23:02"
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
	if (doc.body.classList.contains('single')) {
		// Newlines has no physical magazine, so I can't really justify
		// returning magazineArticle
		return "blogPost";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h3 > a');
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
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		if (item.creators.length <= 1) {
			item.creators = [];
			for (let author of doc.querySelectorAll('.single_post__author a')) {
				item.creators.push(ZU.cleanAuthor(
					author.textContent.replace(/^\s*Dr\.? /, ''), 'author'
				));
			}
		}
		
		for (let term of doc.querySelectorAll('.tax_term')) {
			item.tags.push({ tag: term.textContent });
		}
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "blogPost";
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://newlinesmag.com/argument/classifying-middle-east-americans-as-white-undermines-the-communitys-health/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Classifying Middle East Americans as ‘White’ Undermines the Community’s Health",
				"creators": [
					{
						"firstName": "Deena",
						"lastName": "Kishawi",
						"creatorType": "author"
					}
				],
				"date": "2021-08-16T11:22:43+00:00",
				"abstractNote": "The goal would be to have a demographic identifier that places Middle East, North Africa and the Mediterranean Basin as a separate category in the census, therefore allowing more medical and health-related research to occur in these populations and adequate funding for targeted interventions.",
				"blogTitle": "Newlines Magazine",
				"language": "en",
				"url": "https://newlinesmag.com/argument/classifying-middle-east-americans-as-white-undermines-the-communitys-health/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Health"
					},
					{
						"tag": "Healthcare"
					},
					{
						"tag": "United States"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://newlinesmag.com/essays/yiddish-and-arabic-share-an-uncommon-commonality/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Yiddish and Arabic Share an Uncommon Commonality",
				"creators": [
					{
						"firstName": "Alexander",
						"lastName": "Jabbari",
						"creatorType": "author"
					}
				],
				"date": "2021-08-13T11:18:17+00:00",
				"abstractNote": "For the Zionists, Yiddish represented the weak, emasculated Jew of the shtetl. They saw it as feminine, backward and hybrid, a mixture of many languages. This stood in stark contrast with Hebrew, which they associated with the new, muscular Jewish identity they sought to engender in Palestine.",
				"blogTitle": "Newlines Magazine",
				"language": "en",
				"url": "https://newlinesmag.com/essays/yiddish-and-arabic-share-an-uncommon-commonality/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Language"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://newlinesmag.com/?s=test",
		"items": "multiple"
	}
]
/** END TEST CASES **/
