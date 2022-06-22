{
	"translatorID": "d120a8a7-9d45-446e-8c18-ad9ef0a6bf47",
	"label": "Access Engineering",
	"creator": "Vinoth K - highwirepress.com",
	"target": "^https?://www.accessengineeringlibrary.com/content/(book|chapter|case-study|video|calculator|tutorial)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-06-22 08:15:39"
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
		} else if(url.includes('content/video/')) {
			return 'videoRecording'; 
		} else {
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
	// EM is a provides better rule. Most of the empty field 
	// filled from EM and its missing editions 
	// for books and books chapter page - so we'll fill
	// those in manually.
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		// Edition
		let edition = ZU.xpathText(doc, '//meta[@name="citation_edition"]/@content');
		if(edition) item.edition = edition;

		item.complete();		
	});

	translator.getTranslatorObject(function(trans){
		if(detectWeb(doc, url) == "bookSection") {
			trans.itemType = "bookSection";
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
		"url": "https://www.accessengineeringlibrary.com/content/book/9781259643835",
		"items": [
			{
				"itemType": "book",
				"title": "Automatic Control Systems",
				"creators": [
					{
						"firstName": "Dr Farid",
						"lastName": "Golnaraghi",
						"creatorType": "author"
					},
					{
						"firstName": "Dr Benjamin C.",
						"lastName": "Kuo",
						"creatorType": "author"
					}
				],
				"date": "2017",
				"ISBN": "9781259643835",
				"abstractNote": "A complete toolkit for teaching, learning, and understanding the essential concepts of automatic control systems.Edition after acclaimed edition, Automatic Control Systems has delivered up-to-date, real-world coverage designed to introduce students to the fundamentals of control systems. More than a comprehensive text, Automatic Control Systems includes innovative virtual labs that replicate physical systems and sharpen readers9 problem-solving skills.The Tenth Edition introduces the concept of Control Lab, which includes two classes of experiments: SIMLab (model-based simulation) and LEGOLab (physical experiments using LEGO® robots). These experiments are intended to supplement, or replace, the experimental exposure of the students in a traditional undergraduate control course and will allow these students to do their work within the MATLAB® and Simulink® environment—even at home. This cost-effective approach may allow educational institutions to equip their labs with a number of LEGO test beds and maximize student access to the equipment at a fraction of the cost of currently available control-systems experiments. Alternatively, as a supplemental learning tool, students can take the equipment home and learn at their own pace.This new edition continues a tradition of excellence with:• A greater number of solved examples• Online labs using both LEGO MINDSTORMS® and MATLAB/SIMLab• Enhancements to the easy-to-use MATLAB GUI software (ACSYS) to allow interface with LEGO MINDSTORMS• A valuable introduction to the concept of Control Lab• A logical organization, with Chaps. 1 to 3 covering all background material and Chaps. 4 to 11 presenting material directly related to the subject of control• 10 online appendices, including Elementary Matrix Theory and Algebra, Control Lab, Difference Equations, and Mathematical Foundations• A full set of PowerPoint® slides and solutions manual available to instructorsAdopted by hundreds of universities and translated into at least nine languages, Automatic Control Systems remains the single-best resource for students to gain a practical understanding of the subject and to prepare them for the challenges they will one day face. For practicing engineers, it represents a clear, thorough, and current self-study resource that they will turn to again and again throughout their career.",
				"edition": "10th Edition",
				"language": "en",
				"libraryCatalog": "www.accessengineeringlibrary.com",
				"publisher": "McGraw-Hill Education",
				"url": "https://www.accessengineeringlibrary.com/content/book/9781259643835",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
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
		"url": "https://www.accessengineeringlibrary.com/content/case-study/CS0007_Modeling_the_2020_Novel_Coronavirus_Pandemic",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Modeling the 2020 Novel Coronavirus Pandemic",
				"creators": [
					{
						"firstName": "Lori",
						"lastName": "Herz",
						"creatorType": "author"
					},
					{
						"firstName": "Ryan",
						"lastName": "Zurakowski",
						"creatorType": "author"
					}
				],
				"date": "2020-12-02",
				"abstractNote": "Understanding how mathematical models can be used to predict and analyze the spread of infectious diseases is a topic of interest, especially in light of the COVID-19 pandemic. This case study provides an overview of epidemiological models, as well as an in-depth study of how to use the models and perform a goodness-of-fit analysis.",
				"language": "en",
				"libraryCatalog": "www.accessengineeringlibrary.com",
				"url": "https://www.accessengineeringlibrary.com/content/case-study/CS0007_Modeling_the_2020_Novel_Coronavirus_Pandemic",
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
						"firstName": "P. E.",
						"lastName": "Harlan H. Bengtson",
						"creatorType": "author"
					}
				],
				"date": "2014-02-01",
				"abstractNote": "<p>This tutorial teaches the Manning equation and its use for uniform open channel flow calculations, including the hydraulic radius, Manning roughness coefficient, and normal depth. There are example problems and illustrations show how to use spreadsheets for the calculations.</p>",
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
		"url": "https://www.accessengineeringlibrary.com/content/video/V4005352521001",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "123D Design: Cut Text Through a Plane",
				"creators": [
					{
						"firstName": "Professor",
						"lastName": "Lydia Cline",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"abstractNote": "<p>This video shows how to cut text through a plane with Combine/Subtract.</p>",
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
		"url": "https://www.accessengineeringlibrary.com/content/calculator/S0018_Analysis_of_AC_and_DC_Circuits_Basic_Calculations",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Analysis of A.C. and D.C. Circuits - Basic Calculations",
				"creators": [
					{
						"firstName": "B. S. E. E.",
						"lastName": "William Prudhomme",
						"creatorType": "author"
					}
				],
				"date": "2018-12-13",
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
		"url": "https://www.accessengineeringlibrary.com/search?query=&f%5B0%5D=content_type%3ABooks&f%5B1%5D=book_component%3ATitles",
		"items": "multiple"
	}
]
/** END TEST CASES **/
