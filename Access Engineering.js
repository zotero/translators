{
	"translatorID": "d120a8a7-9d45-446e-8c18-ad9ef0a6bf47",
	"label": "Access Engineering",
	"creator": "Vinoth K - highwirepress.com",
	"target": "^https?://www\\.accessengineeringlibrary\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 15,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-08-31 12:46:24"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2020-2021 Vinoth K - highwirepress.com
	
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
	let title = attr(doc, 'meta[name="citation_title"]', 'content');
	if (title) {
		if (doc.querySelector('meta[name="citation_isbn"]')) {
			let bookTitle = attr(doc, 'meta[name="citation_book_title"]', 'content');
			if (!bookTitle || title == bookTitle) {
				return "book";
			}
			else {
				return "bookSection";
			}
		}
		else if (url.includes('content/video/')) {
			return 'videoRecording';
		}
		else {
			return "journalArticle";
		}
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.results-item a[href]');
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
	// Missing editions for books and books chapter page
	// Removed html element in abstract for video and tutorial page
	// Author not updating in metatag correctly from data and read
	// client advised to split and handled through custom data attr/obj
	// - so we'll fill those in manually.
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', function (obj, item) {
		// Edition
		let edition = ZU.xpathText(doc, '//meta[@name="citation_edition"]/@content');
		if (edition) item.edition = edition;

		// Author
		// Some of old pages not having first and lastname and ignore if empty or undefined
		let author = ZU.xpath(doc, '//ul[@class="contributor-list"]//li[@data-firstnames]');
		if (author.length > 0) {
			// Handled using data attribute
			for (let i = 0; i < author.length; i++) {
				item.creators[i].firstName = author[i].getAttribute('data-firstnames');
				item.creators[i].lastName = author[i].getAttribute('data-surname');
			}
		}

		// Abstract
		let abstractNote = ZU.xpathText(doc, '//meta[@name="citation_abstract"]/@content');
		if (abstractNote) item.abstractNote = ZU.cleanTags(abstractNote);

		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		// Detect web not get trigger for scape EM translator
		// - so wll fill those in manually.
		if (detectWeb(doc, url)) {
			trans.itemType = detectWeb(doc, url);
		}
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.accessengineeringlibrary.com/content/book/9780071472425",
		"items": [
			{
				"itemType": "book",
				"title": "Applied Cell and Molecular Biology for Engineers",
				"creators": [
					{
						"firstName": "Gabi Nindle",
						"lastName": "Waite",
						"creatorType": "editor"
					},
					{
						"firstName": "Lee Waite",
						"lastName": "R",
						"creatorType": "editor"
					}
				],
				"date": "2007",
				"ISBN": "9780071472425",
				"abstractNote": "New engineering concepts that foster better machines and procedures in the health field. Bridging the gap between two rapidly merging fields, this resource provides you with a solid foundation in the biological sciences and the quantitative analysis and technical skills necessary for engineering.This presentation of biological concepts in an engineering language encourages you to develop devices and procedures that solve medical and health-related problems.",
				"edition": "1st Edition",
				"language": "en",
				"libraryCatalog": "www.accessengineeringlibrary.com",
				"publisher": "McGraw-Hill Education",
				"url": "https://www.accessengineeringlibrary.com/content/book/9780071472425",
				"attachments": [
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
		"url": "https://www.accessengineeringlibrary.com/content/book/9780071472425/chapter/chapter2",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Cell Morphology",
				"creators": [
					{
						"firstName": "Michael B.",
						"lastName": "Worrell",
						"creatorType": "author"
					},
					{
						"firstName": "Gabi Nindle",
						"lastName": "Waite",
						"creatorType": "editor"
					},
					{
						"firstName": "Lee Waite",
						"lastName": "R",
						"creatorType": "editor"
					}
				],
				"date": "2007",
				"ISBN": "9780071472425",
				"abstractNote": "New engineering concepts that foster better machines and procedures in the health field. Bridging the gap between two rapidly merging fields, this resource provides you with a solid foundation in the biological sciences and the quantitative analysis and technical skills necessary for engineering.This presentation of biological concepts in an engineering language encourages you to develop devices and procedures that solve medical and health-related problems.",
				"bookTitle": "Applied Cell and Molecular Biology for Engineers",
				"edition": "1st Edition",
				"language": "en",
				"libraryCatalog": "www.accessengineeringlibrary.com",
				"publisher": "McGraw-Hill Education",
				"url": "https://www.accessengineeringlibrary.com/content/book/9780071472425/chapter/chapter2",
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
		"url": "https://www.accessengineeringlibrary.com/content/video/V4005352521001",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "123D Design: Cut Text Through a Plane",
				"creators": [],
				"date": "2014",
				"abstractNote": "This video shows how to cut text through a plane with Combine/Subtract.",
				"language": "en",
				"libraryCatalog": "www.accessengineeringlibrary.com",
				"shortTitle": "123D Design",
				"studio": "McGraw-Hill Education",
				"url": "https://www.accessengineeringlibrary.com/content/video/V4005352521001",
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
		"url": "https://www.accessengineeringlibrary.com/search?query=&f%5B0%5D=content_type%3ABooks&f%5B1%5D=book_component%3ATitles",
		"items": "multiple"
	}
]
/** END TEST CASES **/
