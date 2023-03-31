{
	"translatorID": "d120a8a7-9d45-446e-8c18-ad9ef0a6bf47",
	"label": "Access Engineering",
	"creator": "Vinoth K - highwirepress.com",
	"target": "^https?://www\\.accessengineeringlibrary\\.com/content/(book|chapter|case-study|video|calculator|tutorial)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-03-07 08:48:13"
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
		let author = ZU.xpath(doc, '//ul[@class="contributor-list"]//li//a');
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
		trans.addCustomFields({
			citation_book_title: "bookTitle"
		});
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.accessengineeringlibrary.com/content/book/9781259860386/",
		"items": [
			{
				"itemType": "book",
				"title": "3D Printer Projects for Makerspaces",
				"creators": [
					{
						"firstName": "Lydia Sloan",
						"lastName": "Cline",
						"creatorType": "author"
					}
				],
				"date": "2017",
				"ISBN": "9781259860386",
				"abstractNote": "Learn to model and print 3D designs—no experience required!This easy-to-follow guide features twenty 3D printing projects for makers of all skill levels to enjoy. Written in a tutorial, step-by-step manner, 3D Printer Projects for Makerspaces shows how to use Fusion 360, SketchUp, Meshmixer, Remake, and Inkscape to create fun and useful things. Scanning, slicers, silicone molds, settings, and build plate orientation are also covered, as well as post-processing methods that will make your prints really pop!Inside, you9ll learn to model, analyze, and print a:• Phone case• Coin bank• Art stencil• Cookie cutter• Cookie dunker• Personalized key fob• Lens cap holder• Lithophane night-light• Pencil cup with applied sketch• Business card with QR code• Bronze pendant• Soap mold• Hanging lampshade• Scanned Buddha charm• And more!",
				"edition": "1st Edition",
				"language": "en",
				"libraryCatalog": "www.accessengineeringlibrary.com",
				"publisher": "McGraw-Hill Education",
				"url": "https://www.accessengineeringlibrary.com/content/book/9781259860386",
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
		"url": "https://www.accessengineeringlibrary.com/content/book/9781259860386/chapter/chapter12",
		"items": [
			{
				"itemType": "bookSection",
				"title": "PROJECT 12: Lithophane Night-Light",
				"creators": [
					{
						"firstName": "Lydia Sloan",
						"lastName": "Cline",
						"creatorType": "author"
					}
				],
				"date": "2017",
				"ISBN": "9781259860386",
				"abstractNote": "Learn to model and print 3D designs—no experience required!This easy-to-follow guide features twenty 3D printing projects for makers of all skill levels to enjoy. Written in a tutorial, step-by-step manner, 3D Printer Projects for Makerspaces shows how to use Fusion 360, SketchUp, Meshmixer, Remake, and Inkscape to create fun and useful things. Scanning, slicers, silicone molds, settings, and build plate orientation are also covered, as well as post-processing methods that will make your prints really pop!Inside, you'll learn to model, analyze, and print a:• Phone case• Coin bank• Art stencil• Cookie cutter• Cookie dunker• Personalized key fob• Lens cap holder• Lithophane night-light• Pencil cup with applied sketch• Business card with QR code• Bronze pendant• Soap mold• Hanging lampshade• Scanned Buddha charm• And more!",
				"bookTitle": "3D Printer Projects for Makerspaces",
				"edition": "1st Edition",
				"language": "en",
				"libraryCatalog": "www.accessengineeringlibrary.com",
				"publisher": "McGraw-Hill Education",
				"shortTitle": "PROJECT 12",
				"url": "https://www.accessengineeringlibrary.com/content/book/9781259860386/chapter/chapter12",
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
		"url": "https://www.accessengineeringlibrary.com/content/video/V4768153299001",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "10% Infill and a Bridge",
				"creators": [
					{
						"firstName": "Lydia",
						"lastName": "Cline",
						"creatorType": "author"
					}
				],
				"date": "2016",
				"abstractNote": "This video shows an item being printed with a 10% infill and includes a bridge.",
				"language": "en",
				"libraryCatalog": "www.accessengineeringlibrary.com",
				"studio": "McGraw-Hill Education",
				"url": "https://www.accessengineeringlibrary.com/content/video/V4768153299001",
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
		"url": "https://www.accessengineeringlibrary.com/content/calculator/S0018_Analysis_of_AC_and_DC_Circuits_Basic_Calculations",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Analysis of A.C. and D.C. Circuits - Basic Calculations",
				"creators": [
					{
						"firstName": "William",
						"lastName": "Prudhomme",
						"creatorType": "author"
					}
				],
				"date": "2018/12/13/",
				"abstractNote": "Software simulation programs are generally used for modeling and designing complex electronic circuits and applications, but frequently only a basic calculation is needed to solve an immediate design problem or to calculate the value of a specific circuit element. This Excel workbook addresses this need by automating the calculation of over 70 basic electronics formulas in direct current (d.c.) and alternating current (a.c.) circuits and applications.",
				"language": "en",
				"libraryCatalog": "www.accessengineeringlibrary.com",
				"url": "https://www.accessengineeringlibrary.com/content/calculator/S0018_Analysis_of_AC_and_DC_Circuits_Basic_Calculations",
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
		"url": "https://www.accessengineeringlibrary.com/content/case-study/CS0004_Atrial_Fibrillation",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Atrial Fibrillation: Improving Therapy via Engineering Advancements",
				"creators": [
					{
						"firstName": "Michael J.",
						"lastName": "Rust",
						"creatorType": "author"
					}
				],
				"date": "2020-04-23",
				"abstractNote": "This case will explore atrial fibrillation from several perspectives, including the underlying physiology, clinical relevance, and instrumentation used for diagnosis and therapy. Students will identify and investigate unmet clinical needs that led to recent developments in technologies to treat atrial fibrillation.",
				"language": "en",
				"libraryCatalog": "www.accessengineeringlibrary.com",
				"shortTitle": "Atrial Fibrillation",
				"url": "https://www.accessengineeringlibrary.com/content/case-study/CS0004_Atrial_Fibrillation",
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
		"url": "https://www.accessengineeringlibrary.com/content/tutorial/T0002_Open_Channel_Flow_Calculations_with_the_Manning_Equation",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Open Channel Flow Calculations with the Manning Equation using Excel Spreadsheets",
				"creators": [
					{
						"firstName": "Harlan",
						"lastName": "H. Bengtson",
						"creatorType": "author"
					}
				],
				"date": "2014-02-01",
				"abstractNote": "This tutorial teaches the Manning equation and its use for uniform open channel flow calculations, including the hydraulic radius, Manning roughness coefficient, and normal depth. There are example problems and illustrations show how to use spreadsheets for the calculations.",
				"language": "en",
				"libraryCatalog": "www.accessengineeringlibrary.com",
				"url": "https://www.accessengineeringlibrary.com/content/tutorial/T0002_Open_Channel_Flow_Calculations_with_the_Manning_Equation",
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
