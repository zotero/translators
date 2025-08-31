{
	"translatorID": "8a00461c-5b42-4632-8048-339b221ac3a2",
	"label": "London Review of Books",
	"creator": "Philipp Zumstein",
	"target": "^https?://(www\\.)?lrb\\.co\\.uk",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2021-09-21 16:56:33"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Philipp Zumstein
	
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
	if (/\/the-paper\/v\d+\/n\d+\//.test(url)) {
		return "magazineArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('article .title a, a.toc-item');
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

	translator.setHandler('itemDone', function (obj, item) {
		// clean the title as this otherwise also contains
		// the author and publication information
		item.title = text('h1 .title') || item.title;
		
		let volumeIssue = url.match(/\/the-paper\/v(\d+)\/n(\d+)\//);
		if (volumeIssue) {
			item.volume = volumeIssue[1];
			item.issue = volumeIssue[2];
		}
		item.ISSN = "0260-9592";
		item.publicationTitle = "London Review of Books";
		let reviewedTitle = text('.article-reviewed-item-title');
		let reviewedSubTitle = text('.article-reviewed-item-subtitle');
		if (reviewedTitle) {
			if (reviewedSubTitle) {
				reviewedTitle += ' ' + reviewedSubTitle;
			}
			item.extra = "reviewed-title: " + reviewedTitle;
		}
		
		for (let reviewedAuthor of doc.querySelectorAll('.article-reviewed-item .by a')) {
			item.creators.push(ZU.cleanAuthor(reviewedAuthor.textContent, 'reviewedAuthor'));
		}
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "magazineArticle";
		trans.doWeb(doc, url);
	});
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.lrb.co.uk/the-paper/v21/n21",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.lrb.co.uk/the-paper/v21/n21/slavoj-zizek/attempts-to-escape-the-logic-of-capitalism",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Attempts to Escape the Logic of Capitalism",
				"creators": [
					{
						"firstName": "Slavoj",
						"lastName": "Žižek",
						"creatorType": "author"
					},
					{
						"firstName": "John",
						"lastName": "Keane",
						"creatorType": "reviewedAuthor"
					}
				],
				"date": "1999-10-28 00:00:00",
				"ISSN": "0260-9592",
				"extra": "reviewed-title: Václav Havel: A Political Tragedy in Six Acts",
				"issue": "21",
				"language": "en",
				"libraryCatalog": "www.lrb.co.uk",
				"publicationTitle": "London Review of Books",
				"url": "https://www.lrb.co.uk/the-paper/v21/n21/slavoj-zizek/attempts-to-escape-the-logic-of-capitalism",
				"volume": "21",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "1946-1999"
					},
					{
						"tag": "Biography"
					},
					{
						"tag": "Czech Republic"
					},
					{
						"tag": "Drama"
					},
					{
						"tag": "Political systems"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.lrb.co.uk/search-results?search=terminator&all=&any=&exclude=&phrase=&dateFrom=&dateTo=&sort=relevance#",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.lrb.co.uk/the-paper/v41/n22/jonathan-ree/the-young-man-one-hopes-for",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "The Young Man One Hopes For",
				"creators": [
					{
						"firstName": "Jonathan",
						"lastName": "Rée",
						"creatorType": "author"
					},
					{
						"firstName": "Brian",
						"lastName": "McGuinness",
						"creatorType": "reviewedAuthor"
					},
					{
						"firstName": "Peter",
						"lastName": "Winslow",
						"creatorType": "reviewedAuthor"
					}
				],
				"date": "2019-11-19 14:58:10",
				"ISSN": "0260-9592",
				"abstractNote": "Wittgenstein wasn’t particularly impress­ed by Bertrand Russell’s adoration. If his philosoph­ical capacities were...",
				"extra": "reviewed-title: Wittgenstein’s Family Letters: Corresponding with Ludwig",
				"issue": "22",
				"language": "en",
				"libraryCatalog": "www.lrb.co.uk",
				"publicationTitle": "London Review of Books",
				"url": "https://www.lrb.co.uk/the-paper/v41/n22/jonathan-ree/the-young-man-one-hopes-for",
				"volume": "41",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Biography"
					},
					{
						"tag": "Ludwig"
					},
					{
						"tag": "Philosophy"
					},
					{
						"tag": "Wittgenstein"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://lrb.co.uk/the-paper/v43/n18/anthony-grafton/fake-it-till-you-make-it",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Fake it till you make it",
				"creators": [
					{
						"firstName": "Anthony",
						"lastName": "Grafton",
						"creatorType": "author"
					},
					{
						"firstName": "Dennis",
						"lastName": "Duncan",
						"creatorType": "reviewedAuthor"
					}
				],
				"date": "2021-09-23 00:00:00",
				"ISSN": "0260-9592",
				"abstractNote": "The index gave its users formidable power to find and quote adages and examples, narratives and poems, scriptural and...",
				"extra": "reviewed-title: Index, A History of the",
				"issue": "18",
				"language": "en",
				"libraryCatalog": "lrb.co.uk",
				"publicationTitle": "London Review of Books",
				"url": "https://lrb.co.uk/the-paper/v43/n18/anthony-grafton/fake-it-till-you-make-it",
				"volume": "43",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "History of ideas"
					},
					{
						"tag": "Literature & Criticism"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
