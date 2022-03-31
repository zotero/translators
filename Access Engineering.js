{
	"translatorID": "d120a8a7-9d45-446e-8c18-ad9ef0a6bf47",
	"label": "Access Engineering",
	"creator": "Vinoth K - highwirepress.com",
	"target": "^https://www.accessengineeringlibrary.com/content/(book|chapter|case-study|video|calculator|tutorial)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-03-30 11:26:17"
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
	if(url.includes('book') && url.match('chapter')) {
		return 'bookSection';
	} else if(url.includes('book')) {
		return 'book';
	} else if(url.includes('case-study') ||
			  url.includes('video') ||
			  url.includes('calculator') ||
			  url.includes('tutorial')) {
		return 'webpage';
	}
	return false;
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	let item;
	let main = doc.querySelector('.page-layout--mhe-layout');
	
	switch(detectWeb(doc, url)) {
	  /* Meta Data: Title, Author, Edition, Publisher,
				  Date, ISBN, URL, Abstract */
	  case 'book':
		  item = new Zotero.Item('book');
		  
		  // Title
		  let book__title = text(main, '.h2').split(', ');
		  item.title = book__title[0];
		  
		  // Edition
		  let bookEdition = (item.title).split(', ');
		  item.edition = bookEdition[1];

		  // Publisher
		  item.publisher = text(main, '.field--name-copyright-holder p');

		  // Date
		  item.date = text(main, '.field--name-copyright-year p');

		  // ISBN
		  item.ISBN = text(main, '.field--name-isbn-ebook-compact p');
			  
		  break;
	  
	  
	  /* Meta Data: Title, Author, Book Title, Edition, 
	  Publisher, Date, ISBN, URL, Abstract */
	  case 'bookSection':
		  item = new Zotero.Item('bookSection');
		  
		  // Title
		  item.title = text(main, '.row--chapter-tabs .content-title');
		  
         // Book Title
         let book__title = text(main, '.h2').split(', ');
		  item.bookTitle = book__title[0];  
         
         // Edition
		  let bookEdition = (item.title).split(', ');
		  item.edition = bookEdition[1];

		  // Publisher
		  item.publisher = text(main, '.field--name-copyright-holder p');

		  // Date
		  item.date = text(main, '.field--name-copyright-year p');

		  // ISBN
		  item.ISBN = text(main, '.field--name-isbn-ebook-compact p');
		  break;
          
      // Item Type: Web Page (Video, Spreadsheet, Case Study and Tutorial)
	  /* Meta Data: Title, Author, Date, URL, Abstract */
	  case 'webpage':
		  item = new Zotero.Item('webpage');
		  
		  // Title
		  item.title = text(main, '.h2');
		  
		  // Date
		  item.date = text(main, '.field--name-date-print-publication');
		  break;          
          
	}
	
	// Author
	for (let author of main.querySelectorAll('.contrib-group-authors a')) {
		item.creators.push(ZU.cleanAuthor(author.textContent, 'author'));
	}
	
	// URL
	item.url = url;
	
	// Abstract
	if(doc.querySelectorAll('.highwire-truncate-text__full_content').length > 0) {
		item.abstractNote = text(main, '.highwire-truncate-text__full_content .short-view__content');
	} else {
		item.abstractNote = text(main, '.highwire-truncate-text__content');
	}
		
	//Zotero.debug(item);
	
	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});
	item.complete();
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
				"abstractNote": "A complete toolkit for teaching, learning, and understanding the essential concepts of automatic control systems.Edition after acclaimed edition, Automatic Control Systems has delivered up-to-date, real-world coverage designed to introduce students to the fundamentals of control systems. More than a comprehensive text, Automatic Control Systems includes innovative virtual labs that replicate physical systems and sharpen readers' problem-solving skills.The Tenth Edition introduces the concept of Control Lab, which includes two classes of experiments: SIMLab (model-based simulation) and LEGOLab (physical experiments using LEGO® robots). These experiments are intended to supplement, or replace, the experimental exposure of the students in a traditional undergraduate control course and will allow these students to do their work within the MATLAB® and Simulink® environment—even at home. This cost-effective approach may allow educational institutions to equip their labs with a number of LEGO test beds and maximize student access to the equipment at a fraction of the cost of currently available control-systems experiments. Alternatively, as a supplemental learning tool, students can take the equipment home and learn at their own pace.This new edition continues a tradition of excellence with:• A greater number of solved examples• Online labs using both LEGO MINDSTORMS® and MATLAB/SIMLab• Enhancements to the easy-to-use MATLAB GUI software (ACSYS) to allow interface with LEGO MINDSTORMS• A valuable introduction to the concept of Control Lab• A logical organization, with Chaps. 1 to 3 covering all background material and Chaps. 4 to 11 presenting material directly related to the subject of control• 10 online appendices, including Elementary Matrix Theory and Algebra, Control Lab, Difference Equations, and Mathematical Foundations• A full set of PowerPoint® slides and solutions manual available to instructorsAdopted by hundreds of universities and translated into at least nine languages, Automatic Control Systems remains the single-best resource for students to gain a practical understanding of the subject and to prepare them for the challenges they will one day face. For practicing engineers, it represents a clear, thorough, and current self-study resource that they will turn to again and again throughout their career.",
				"accessDate": "2022-03-25T12:07:03Z",
				"libraryCatalog": "Access Engineering",
				"publisher": "McGraw-Hill Education",
				"url": "https://www.accessengineeringlibrary.com/content/book/9781259643835",
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
		"url": "https://www.accessengineeringlibrary.com/content/book/9781259860386/chapter/chapter12",
		"items": [
			{
				"itemType": "bookSection",
				"title": "12. PROJECT 12: Lithophane Night-Light",
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
				"libraryCatalog": "Access Engineering",
				"publisher": "McGraw-Hill Education",
				"shortTitle": "12. PROJECT 12",
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
				"itemType": "webpage",
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
				"accessDate": "2022-03-25T12:14:47Z",
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
	}
]
/** END TEST CASES **/
