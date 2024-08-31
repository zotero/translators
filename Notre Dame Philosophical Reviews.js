{
	"translatorID": "a823550b-6475-4b20-8539-a3c416906228",
	"label": "Notre Dame Philosophical Reviews",
	"creator": "Emiliano Heyns and Abe Jellinek",
	"target": "^https?://ndpr\\.nd\\.edu/",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-31 17:03:45"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Emiliano Heyns and Abe Jellinek
	
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
	if (url.includes('/reviews/') && doc.querySelector('meta[property="datePublished"]')) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h2.article-title > a[href*="/reviews/"]');
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
		let reviewedTitle = item.title;
		let shortReviewedTitle = item.title
			.replace(/:.*$/, '')
			.replace(/\?.*$/, '?');
		item.title = `Review of <i>${reviewedTitle}</i>`;
		item.shortTitle = `Review of <i>${shortReviewedTitle}</i>`;
		
		// some <meta> tags are in the body so EM doesn't catch them
		// we don't use dateModified - datePublish corresponds to the date shown
		// in the article text.
		let metaDate = attr(doc, 'meta[property="datePublished"]', 'content');
		item.date = ZU.strToISO(metaDate);
		
		item.creators = [];
		
		let reviewedAuthors = attr(doc, 'meta[name="search_authors"]', 'content').split(/, | and /);
		for (let reviewedAuthor of reviewedAuthors) {
			reviewedAuthor = reviewedAuthor.replace(/\(eds?\.\)/, '');
			item.creators.push(ZU.cleanAuthor(reviewedAuthor, 'reviewedAuthor'));
		}
		
		let reviewAuthor = attr(doc, 'meta[name="search_reviewers"]', 'content').split(', ')[0];
		item.creators.push(ZU.cleanAuthor(reviewAuthor, 'author'));
		
		item.ISSN = '1538-1617';
		item.libraryCatalog = 'Notre Dame Philosophical Reviews';
		item.abstractNote = ''; // EM's are no good here
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "journalArticle";
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://ndpr.nd.edu/reviews/pleasure-and-the-good-life-concerning-the-nature-varieties-and-plausibility-of-hedonism/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Review of <i>Pleasure and the Good Life: Concerning the Nature, Varieties, and Plausibility of Hedonism</i>",
				"creators": [
					{
						"firstName": "Fred",
						"lastName": "Feldman",
						"creatorType": "reviewedAuthor"
					},
					{
						"firstName": "Leonard D.",
						"lastName": "Katz",
						"creatorType": "author"
					}
				],
				"date": "2005-03-02",
				"ISSN": "1538-1617",
				"language": "en",
				"libraryCatalog": "Notre Dame Philosophical Reviews",
				"shortTitle": "Review of <i>Pleasure and the Good Life</i>",
				"url": "https://ndpr.nd.edu/reviews/pleasure-and-the-good-life-concerning-the-nature-varieties-and-plausibility-of-hedonism/",
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
		"url": "https://ndpr.nd.edu/reviews/locke-s-touchy-subjects-materialism-and-immortality/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Review of <i>Locke's Touchy Subjects: Materialism and Immortality</i>",
				"creators": [
					{
						"firstName": "Nicholas",
						"lastName": "Jolley",
						"creatorType": "reviewedAuthor"
					},
					{
						"firstName": "Shelley",
						"lastName": "Weinberg",
						"creatorType": "author"
					}
				],
				"date": "2015-12-17",
				"ISSN": "1538-1617",
				"language": "en",
				"libraryCatalog": "Notre Dame Philosophical Reviews",
				"shortTitle": "Review of <i>Locke's Touchy Subjects</i>",
				"url": "https://ndpr.nd.edu/reviews/locke-s-touchy-subjects-materialism-and-immortality/",
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
		"url": "https://ndpr.nd.edu/reviews/archives/2020/9/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
