{
	"translatorID": "53734210-2284-437f-9896-8ad65917c343",
	"label": "DOAJ",
	"creator": "Abe Jellinek",
	"target": "^https?://(www\\.)?doaj\\.org/(article|search)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-09 20:47:02"
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


function detectWeb(doc, _url) {
	if (doc.querySelector('meta[name="citation_title"]')) {
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
	var rows = doc.querySelectorAll('h3 > a[href*="/article/"]');
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
		item.attachments = [];
		
		for (let button of doc.querySelectorAll('.button')) {
			if (button.textContent.toLowerCase().includes('read online')) {
				item.url = button.href;
				break;
			}
		}
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://doaj.org/article/0006d8f8ca3e4af1b3ec14a07e88bb12",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "MiRNA Profiles in Lymphoblastoid Cell Lines of Finnish Prostate Cancer Families.",
				"creators": [
					{
						"firstName": "Daniel",
						"lastName": "Fischer",
						"creatorType": "author"
					},
					{
						"firstName": "Tiina",
						"lastName": "Wahlfors",
						"creatorType": "author"
					},
					{
						"firstName": "Henna",
						"lastName": "Mattila",
						"creatorType": "author"
					},
					{
						"firstName": "Hannu",
						"lastName": "Oja",
						"creatorType": "author"
					},
					{
						"firstName": "Teuvo L. J.",
						"lastName": "Tammela",
						"creatorType": "author"
					},
					{
						"firstName": "Johanna",
						"lastName": "Schleutker",
						"creatorType": "author"
					}
				],
				"date": "2015/01/01",
				"DOI": "10.1371/journal.pone.0127427",
				"ISSN": "1932-6203",
				"abstractNote": "DOAJ is a community-curated online directory that indexes and provides access to high quality, open access, peer-reviewed journals.",
				"issue": "5",
				"language": "en",
				"libraryCatalog": "doaj.org",
				"pages": "e0127427",
				"publicationTitle": "PLoS ONE",
				"url": "https://doi.org/10.1371/journal.pone.0127427",
				"volume": "10",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://doaj.org/article/f36918ccae3243548729f113f8920ba2",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Making every drop count: reducing wastage of a novel blood component for transfusion of trauma patients",
				"creators": [
					{
						"firstName": "Nathan",
						"lastName": "Proudlove",
						"creatorType": "author"
					},
					{
						"firstName": "Laura",
						"lastName": "Green",
						"creatorType": "author"
					},
					{
						"firstName": "Harriet",
						"lastName": "Tucker",
						"creatorType": "author"
					},
					{
						"firstName": "Anne",
						"lastName": "Weaver",
						"creatorType": "author"
					},
					{
						"firstName": "Ross",
						"lastName": "Davenport",
						"creatorType": "author"
					},
					{
						"firstName": "Jane",
						"lastName": "Davies",
						"creatorType": "author"
					},
					{
						"firstName": "Josephine",
						"lastName": "McCullagh",
						"creatorType": "author"
					},
					{
						"firstName": "Dave",
						"lastName": "Edmondson",
						"creatorType": "author"
					},
					{
						"firstName": "Julia",
						"lastName": "Lancut",
						"creatorType": "author"
					},
					{
						"firstName": "Angela",
						"lastName": "Maddison",
						"creatorType": "author"
					}
				],
				"date": "2021/07/01",
				"DOI": "10.1136/bmjoq-2021-001396",
				"ISSN": "2399-6641",
				"abstractNote": "DOAJ is a community-curated online directory that indexes and provides access to high quality, open access, peer-reviewed journals.",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "doaj.org",
				"publicationTitle": "BMJ Open Quality",
				"shortTitle": "Making every drop count",
				"url": "https://bmjopenquality.bmj.com/content/10/3/e001396.full",
				"volume": "10",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://doaj.org/search/articles?source=%7B%22query%22%3A%7B%22query_string%22%3A%7B%22query%22%3A%22test%22%2C%22default_operator%22%3A%22AND%22%7D%7D%2C%22size%22%3A50%2C%22sort%22%3A%5B%7B%22created_date%22%3A%7B%22order%22%3A%22desc%22%7D%7D%5D%7D",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
