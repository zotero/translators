{
	"translatorID": "d120a8a7-9d45-446e-8c18-ad9ef0a6bf47",
	"label": "Access Engineering",
	"creator": "Vinoth K - highwirepress.com",
	"target": "^https?://www\\.accessengineeringlibrary\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-09-09 09:42:36"
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
		// Some of old pages not having firstname, lastname seperation in markup and ignore if not
		let author = doc.querySelectorAll("ul.contributor-list > [data-firstnames]");
		item.creators = [];
		for (let i = 0; i < author.length; i++) {
			let creatorData = author[i].dataset;
			item.creators.push({
				firstName: creatorData.firstnames,
				lastName: creatorData.surname,
				creatorType: creatorData.authortype
			});
		}

		// Abstract
		let abstractNote = ZU.xpathText(doc, '//meta[@name="citation_abstract"]/@content');
		if (abstractNote) item.abstractNote = ZU.cleanTags(abstractNote);

		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		// Detect web not get trigger for scape EM translator
		// - so wll fill those in manually.
		trans.itemType = detectWeb(doc, url);
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.accessengineeringlibrary.com/content/book/9781259860225",
		"items": [
			{
				"itemType": "book",
				"title": "Handbook of Environmental Engineering",
				"creators": [
					{
						"firstName": "Rao Y.",
						"lastName": "Surampalli",
						"creatorType": "editor"
					},
					{
						"firstName": "Tian C.",
						"lastName": "Zhang",
						"creatorType": "editor"
					},
					{
						"firstName": "Satinder Kaur",
						"lastName": "Brar",
						"creatorType": "editor"
					},
					{
						"firstName": "Krishnamoorthy",
						"lastName": "Hegde",
						"creatorType": "editor"
					},
					{
						"firstName": "Rama",
						"lastName": "Pulicharla",
						"creatorType": "editor"
					},
					{
						"firstName": "Mausam",
						"lastName": "Verma",
						"creatorType": "editor"
					}
				],
				"date": "2018",
				"ISBN": "9781259860225",
				"abstractNote": "A complete guide to environmental regulations and remediation.This practical resource offers thorough coverage of current environmental issues and policies along with step-by-step remediation procedures. With contributions from dozens of  industry-recognized experts, Handbook of Environmental Engineering features information on all segments of the market—including water and air quality and hazardous waste—and enables you to ensure compliance with all applicable regulations. You will get details about sensors, monitoring, and toxicity treatment and controls as well as waste management and safe disposal. Real-world examples demonstrate how to apply techniques and achieve compliance, while environmental impact assessments and measurement data enhance the book9s utility.Coverage includes:• Environmental legislation• Environmental impact assessments• Air pollution control and management• Potable water treatment• Wastewater treatment and reuse• Solid waste management• Hazardous waste management• Emerging wastes in the environment• Environmental monitoring and measurements",
				"edition": "1st Edition",
				"language": "en",
				"libraryCatalog": "www.accessengineeringlibrary.com",
				"publisher": "McGraw-Hill Education",
				"url": "https://www.accessengineeringlibrary.com/content/book/9781259860225",
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
		"url": "https://www.accessengineeringlibrary.com/content/book/9781259860225/toc-chapter/chapter3/section/section1",
		"items": [
			{
				"itemType": "bookSection",
				"title": "CHAPTER PRELIMINARIES",
				"creators": [
					{
						"firstName": "Ashok",
						"lastName": "Kumar",
						"creatorType": "author"
					},
					{
						"firstName": "Hamid",
						"lastName": "Omidvarborna",
						"creatorType": "author"
					},
					{
						"firstName": "Rao Y.",
						"lastName": "Surampalli",
						"creatorType": "editor"
					},
					{
						"firstName": "Tian C.",
						"lastName": "Zhang",
						"creatorType": "editor"
					},
					{
						"firstName": "Satinder Kaur",
						"lastName": "Brar",
						"creatorType": "editor"
					},
					{
						"firstName": "Krishnamoorthy",
						"lastName": "Hegde",
						"creatorType": "editor"
					},
					{
						"firstName": "Rama",
						"lastName": "Pulicharla",
						"creatorType": "editor"
					},
					{
						"firstName": "Mausam",
						"lastName": "Verma",
						"creatorType": "editor"
					}
				],
				"date": "2018",
				"ISBN": "9781259860225",
				"abstractNote": "A complete guide to environmental regulations and remediation.This practical resource offers thorough coverage of current environmental issues and policies along with step-by-step remediation procedures. With contributions from dozens of  industry-recognized experts, Handbook of Environmental Engineering features information on all segments of the market—including water and air quality and hazardous waste—and enables you to ensure compliance with all applicable regulations. You will get details about sensors, monitoring, and toxicity treatment and controls as well as waste management and safe disposal. Real-world examples demonstrate how to apply techniques and achieve compliance, while environmental impact assessments and measurement data enhance the book's utility.Coverage includes:• Environmental legislation• Environmental impact assessments• Air pollution control and management• Potable water treatment• Wastewater treatment and reuse• Solid waste management• Hazardous waste management• Emerging wastes in the environment• Environmental monitoring and measurements",
				"bookTitle": "Handbook of Environmental Engineering",
				"language": "en",
				"libraryCatalog": "www.accessengineeringlibrary.com",
				"publisher": "McGraw-Hill Education",
				"url": "https://www.accessengineeringlibrary.com/content/book/9781259860225/toc-chapter/chapter3/section/section1",
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
		"url": "https://www.accessengineeringlibrary.com/content/calculator/S0071_Basic_Transformer_Calculations",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Basic Transformer Calculations",
				"creators": [
					{
						"firstName": "Bhagyalakshmi",
						"lastName": "Kerekare",
						"creatorType": "author"
					}
				],
				"date": "2022/06/25/",
				"abstractNote": "This Excel workbook contains four worksheets. The first worksheet covers the basic concepts of single phase transformer such as turns ratio, primary current, secondary current, primary voltage, secondary voltage, and transformer ratio calculations. The second worksheet covers the basic concepts of power, efficiency, primary/secondary EMF and transformer rating calculations. The third worksheet covers the basic concepts of three phase transformers, highlighting the star and delta connections. Calculations are done for phase voltage, phase current, line voltage, and line current for star and delta connections. The fourth worksheet covers the basic concepts kVA Ratings, 3-phase primary, and secondary full load current 3-phase voltage calculations.",
				"language": "en",
				"libraryCatalog": "www.accessengineeringlibrary.com",
				"url": "https://www.accessengineeringlibrary.com/content/calculator/S0071_Basic_Transformer_Calculations",
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
		"url": "https://www.accessengineeringlibrary.com/content/tutorial/T0004_Partially_Full_Pipe_Flow_Calculations_Using_Excel_Spreadsheets",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Partially Full Pipe Flow Calculations Using Excel Spreadsheets",
				"creators": [
					{
						"firstName": "Harlan H.",
						"lastName": "Bengtson",
						"creatorType": "author"
					}
				],
				"date": "2014/02/01/",
				"abstractNote": "This tutorial provides discussion of, and illustration by, examples for use of an Excel spreadsheet for making a variety of calculations for the flow of water in a partially full circular pipe using the Manning Equation. Equations for calculating area, wetted perimeter, and hydraulic radius for partially full pipe flow are included in this tutorial along with a brief review of the Manning Equation and discussion of its use to calculate a) the flow rate in a given pipe (given diameter, slope, &amp; Manning roughness) at a specified depth of flow, b) the required diameter for a specified flow rate at a target percent full in a given pipe, and c) the normal depth (depth of flow) for a specified flow rate in a given pipe. This includes presentation and discussion of the equations for the calculations, example calculations, and screenshots of spreadsheets to facilitate the calculations.",
				"language": "en",
				"libraryCatalog": "www.accessengineeringlibrary.com",
				"url": "https://www.accessengineeringlibrary.com/content/tutorial/T0004_Partially_Full_Pipe_Flow_Calculations_Using_Excel_Spreadsheets",
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
