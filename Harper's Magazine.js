{
	"translatorID": "36e28164-afac-42c6-9a99-ed757b640002",
	"label": "Harper's Magazine",
	"creator": "Abe Jellinek",
	"target": "^https?://(www\\.)?harpers\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-22 00:16:38"
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
	if (doc.querySelector('.single-article')) {
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
	var rows = doc.querySelectorAll('a.hit-link');
	if (!rows.length) rows = doc.querySelectorAll('.issue-readings a.ac-title');
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
		item.title = text(doc, '.title');
		let subtitle = text(doc, '.subheading');
		if (subtitle) item.title += `: ${subtitle}`;
		
		item.creators = [];
		let header = doc.querySelector('.title-header');
		if (!header) header = doc.querySelector('.article-header');
		for (let author of header.querySelectorAll('a[rel="author"]')) {
			item.creators.push(ZU.cleanAuthor(author.innerText, 'author'));
		}
		
		item.tags = [];
		for (let tag of doc.querySelectorAll('.tags .tag')) {
			item.tags.push({ tag: tag.textContent.trim() });
		}
		
		item.volume = text(doc, '.related-issue-text .title')
			.replace('issue', '');
		item.abstractNote = ZU.cleanTags(item.abstractNote);
		
		item.ISSN = '0017-789X';
		item.publicationTitle = 'Harper\'s Magazine';
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = 'magazineArticle';
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://harpers.org/archive/2009/07/labors-last-stand/?single=1",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Labor’s Last Stand: The foul legacy of Louisiana oil",
				"creators": [
					{
						"firstName": "Ken",
						"lastName": "Silverstein",
						"creatorType": "author"
					}
				],
				"date": "2009-07-01T00:00:22Z",
				"ISSN": "0017-789X",
				"abstractNote": "The corporate campaign to kill the Employee Free Choice Act",
				"language": "en",
				"libraryCatalog": "harpers.org",
				"publicationTitle": "Harper's Magazine",
				"shortTitle": "Labor’s Last Stand",
				"url": "https://harpers.org/archive/2009/07/labors-last-stand/",
				"volume": "July 2009",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "2009-"
					},
					{
						"tag": "21st century"
					},
					{
						"tag": "Business and politics"
					},
					{
						"tag": "Chamber of Commerce of the United States of America"
					},
					{
						"tag": "Coalition for a Democratic Workplace"
					},
					{
						"tag": "Corporations"
					},
					{
						"tag": "Employee Free Choice Act"
					},
					{
						"tag": "Glenn Spencer"
					},
					{
						"tag": "Labor movement"
					},
					{
						"tag": "Labor unions"
					},
					{
						"tag": "Law and legislation"
					},
					{
						"tag": "Lobbying"
					},
					{
						"tag": "Organizing"
					},
					{
						"tag": "Political activity"
					},
					{
						"tag": "Politics and government"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "United StatesNational Labor Relations Board"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://harpers.org/archive/2013/11/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://harpers.org/archive/2021/07/history-as-end-politics-of-the-past-matthew-karp/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "History As End: 1619, 1776, and the politics of the past",
				"creators": [
					{
						"firstName": "Matthew",
						"lastName": "Karp",
						"creatorType": "author"
					}
				],
				"date": "2021-06-08T21:39:29Z",
				"ISSN": "0017-789X",
				"abstractNote": "1619, 1776, and the politics of the past",
				"language": "en",
				"libraryCatalog": "harpers.org",
				"publicationTitle": "Harper's Magazine",
				"shortTitle": "History As End",
				"url": "https://harpers.org/archive/2021/07/history-as-end-politics-of-the-past-matthew-karp/",
				"volume": "July 2021",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "1619 Project"
					},
					{
						"tag": "1861-1865"
					},
					{
						"tag": "African Americans"
					},
					{
						"tag": "Carol M. (Carol Miller) Swain"
					},
					{
						"tag": "Civil war"
					},
					{
						"tag": "Civilization"
					},
					{
						"tag": "Conservatism"
					},
					{
						"tag": "Historicism"
					},
					{
						"tag": "History"
					},
					{
						"tag": "Larry P. Arnn"
					},
					{
						"tag": "Liberalism"
					},
					{
						"tag": "Matthew Spalding"
					},
					{
						"tag": "Nikole Hannah-Jones"
					},
					{
						"tag": "Race relations"
					},
					{
						"tag": "Racial justice"
					},
					{
						"tag": "Slavery"
					},
					{
						"tag": "The 1776 Report"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "United States Revolution 1775-1783"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://harpers.org/2018/11/review-the-job-work-and-its-future-in-a-time-of-radical-change-ellen-ruppel-shell/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "The Future of Work: Can suicide be predicted?",
				"creators": [
					{
						"firstName": "Jessi",
						"lastName": "Stevens",
						"creatorType": "author"
					}
				],
				"date": "2018-11-30T18:03:56Z",
				"ISSN": "0017-789X",
				"abstractNote": "No bleaker than it’s ever been",
				"language": "en",
				"libraryCatalog": "harpers.org",
				"publicationTitle": "Harper's Magazine",
				"shortTitle": "The Future of Work",
				"url": "https://harpers.org/2018/11/review-the-job-work-and-its-future-in-a-time-of-radical-change-ellen-ruppel-shell/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Amazon.com (Firm)"
					},
					{
						"tag": "Angela Davis"
					},
					{
						"tag": "Automation"
					},
					{
						"tag": "Effect of automation on"
					},
					{
						"tag": "Labor"
					},
					{
						"tag": "Marxian economics"
					},
					{
						"tag": "Marxian historiography"
					},
					{
						"tag": "Rosa Luxemburg"
					},
					{
						"tag": "The Job: Work and Its Future in a Time of Radical Change"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
