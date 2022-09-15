{
	"translatorID": "f318ab1e-71c6-4f67-8ac3-4b1144e5bf4e",
	"label": "APS-Physics",
	"creator": "Will Shanks and Abe Jellinek",
	"target": "^https?://(www\\.)?(physics)\\.aps\\.org/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-31 22:13:29"
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
	var rows = doc.querySelectorAll('h3.feed-item-title > a[href*="/articles/"]');
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
		if (!item.DOI) {
			item.DOI = ZU.cleanDOI(attr(doc, 'a[href*="link.aps.org/doi"]', 'href'));
		}
		
		// both snapshot and PDF: HTML is commentary, PDF is article
		item.attachments = [];
		item.attachments.push({
			title: 'Snapshot',
			document: doc
		});
		item.attachments.push({
			title: 'Full Text PDF',
			mimeType: 'application/pdf',
			url: `https://physics.aps.org/articles/pdf/${item.DOI}`
		});
		
		item.libraryCatalog = 'APS Physics';
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.addCustomFields({
			'citation_pages': 'pages'
		});
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://physics.aps.org/articles/v5/100",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Surface Folds Make Tears and Chips",
				"creators": [
					{
						"firstName": "Sissi de",
						"lastName": "Beer",
						"creatorType": "author"
					},
					{
						"firstName": "Martin H.",
						"lastName": "Müser",
						"creatorType": "author"
					}
				],
				"date": "2012/09/04",
				"DOI": "10.1103/PhysRevLett.109.106001",
				"abstractNote": "Fluidlike folding instabilities of solid surfaces complicate the machining of metals to perfection",
				"language": "en",
				"libraryCatalog": "APS Physics",
				"pages": "100",
				"publicationTitle": "Physics",
				"rights": "©2012 by the American Physical Society. All rights reserved.",
				"url": "https://physics.aps.org/articles/v5/100",
				"volume": "5",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://physics.aps.org/articles/v5/101",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Measuring the Smallest Trickle",
				"creators": [
					{
						"firstName": "Michael",
						"lastName": "Schirber",
						"creatorType": "author"
					}
				],
				"date": "2012/09/10",
				"DOI": "10.1103/PhysRevLett.109.118302",
				"abstractNote": "Researchers used a nanoscale tunnel in a silicon chip to measure a flow rate of a few picoliters per minute, which is smaller than any previous observation.",
				"language": "en",
				"libraryCatalog": "APS Physics",
				"pages": "101",
				"publicationTitle": "Physics",
				"rights": "©2012 by the American Physical Society. All rights reserved.",
				"url": "https://physics.aps.org/articles/v5/101",
				"volume": "5",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://physics.aps.org/browse/?page=1&per_page=10&sort=relevance&q=test",
		"items": "multiple"
	}
]
/** END TEST CASES **/
