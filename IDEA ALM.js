{
	"translatorID": "af5e71a1-798f-4b46-bc79-3d6ed83ba8f1",
	"label": "IDEA ALM",
	"creator": "Abe Jellinek",
	"target": "/((notebook(_f?ext)?)|list)\\.asp",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 200,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-22 23:39:19"
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


const pdfViewerSel = 'a[href*="pdf_viewer.asp?"]';
const keys = {
	title: ['Title', 'כותר', 'Brief Description', 'תיאור מקוצר'],
	itemType: ['Item Type'],
	pages: ['Pages', 'עמודים'],
	ISBN: ['ISBN'],
	date: ['Date Created', 'תאריך יצירה', 'Year', 'שנה לועזית'],
	description: ['Physical Description', 'Description'],
	language: ['Language', 'שפה', 'Script', 'Script of Material'],
	publisher: ['Publisher', 'מוציא לאור'],
	author: ['Author', 'מחבר', 'Author/Creator'],
	permalink: ['Permanent Link', 'קישור לפריט']
};

function detectWeb(doc, url) {
	if (doc.querySelector('#item table')) {
		let properties = parseTable(doc);
		if (!properties.query(keys.title)) {
			return false;
		}
		
		if (doc.querySelector(pdfViewerSel)
			|| properties.query(keys.itemType) == 'Book'
			|| properties.query(keys.itemType) == 'ספר'
			|| properties.query(keys.pages)
			|| properties.query(keys.ISBN)) {
			return "book";
		}
		else {
			return "artwork";
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
	var rows = doc.querySelectorAll('h5 a');
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
	let properties = parseTable(doc);

	let item = new Zotero.Item('artwork');
	item.extra = '';
	item.title = properties.query(keys.title);
	
	item.date = properties.query(keys.date);
	// don't run through strToISO if the date is a range
	if (item.date && !item.date.includes('-')) {
		item.date = ZU.strToISO(item.date);
	}
	
	item.abstractNote = properties.query(keys.description);
	item.language = properties.query(keys.language);
	item.publisher = properties.query(keys.publisher);
	item.place = properties['Creation Place'] || properties['מקום יצור הפריט'];
	
	item.artworkMedium = properties['Medium'];
	
	let accessionNumber = properties['Accession Number'] || properties['מספר רישום'];
	if (accessionNumber) {
		item.extra += `Accession Number: ${accessionNumber}\n`;
	}
	
	if (doc.querySelector(pdfViewerSel)
		|| properties.query(keys.itemType) == 'Book'
		|| properties.query(keys.itemType) == 'ספר'
		|| properties.query(keys.pages)
		|| properties.query(keys.ISBN)) {
		item.itemType = 'book';
		item.numPages = properties['Pages'] || properties['עמודים'];
		if (item.numPages) item.numPages = item.numPages.replace(/p\.$/, '');
	}
	
	let authorGroups = properties.query(keys.author);
	addCreators(item, authorGroups, 'author');
	
	if (!item.creators.length && properties['מחבר - שם משפחה']) {
		item.creators.push({
			firstName: properties['שם פרטי מחבר'],
			lastName: properties['מחבר - שם משפחה'],
			creatorType: 'author'
		});
	}
	
	let editorGroups = properties['Editor'] || properties['עורך'];
	addCreators(item, editorGroups, 'editor');
	
	for (let key of Object.keys(properties)) {
		if (key.startsWith('Link to ')) {
			let url = ZU.cleanURL(properties[key]);
			if (url) {
				item.attachments.push({
					title: key,
					url,
					mimeType: 'text/html',
					snapshot: false
				})
			}
		}
	}
	
	if (doc.querySelector('a.main_image[href*=".jp"]')) {
		item.attachments.push({
			title: 'Low-Resolution Image',
			mimeType: 'image/jpeg',
			url: attr(doc, 'a.main_image', 'href')
		});
	}
	
	if (doc.querySelector(pdfViewerSel)) {
		let pdfPath = attr(doc, pdfViewerSel, 'href')
			.match(/<pdf_path>([^<]+)<\/>/);
		if (pdfPath) {
			item.attachments.push({
				title: 'Full Text PDF',
				mimeType: 'application/pdf',
				url: pdfPath[1]
			});
		}
	}
	
	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});
	
	item.libraryCatalog = text(doc, '#topbar_tx')
		|| `IDEA ALM (${doc.location.hostname})`;
	
	item.url = properties.query(keys.permalink);
	if (item.url) {
		item.complete();
	}
	else {
		let getURLPage = attr(doc, '#sidenav1', 'onclick').match(/'(.*)'/);
		if (getURLPage) {
			Z.debug('Finding URL from dialog page: ' + getURLPage[1]);
			ZU.processDocuments(getURLPage[1], function (getURLDoc) {
				item.url = text(getURLDoc, '#form');
				item.complete();
			});
		}
		else {
			item.url = url; // ugly, but what can we do?
			item.complete();
		}
	}
}

function parseTable(doc) {
	let properties = {};
	for (let row of doc.querySelectorAll('#item table tbody tr')) {
		let key = text(row, 'td.strong');
		let value = text(row, 'td .bidie, td .bidi, td a[id^="t"], td a[id^="link"]');

		if (properties[key]) {
			properties[key] += `; ${value}`;
		}
		else {
			properties[key] = value;
		}
	}
	
	properties.query = function (possibleKeys) {
		for (let key of possibleKeys) {
			if (properties[key]) return properties[key];
		}
		return '';
	}
	
	return properties;
}

function addCreators(item, creatorGroups, creatorType) {
	if (!creatorGroups) return;
	for (let creatorGroup of creatorGroups.split('; ')) {
		for (let creator of creatorGroup.split(' and ')) {
			if (!creator.trim() || creator == 'Unknown') continue;
			creator = creator
				.replace(/\b(Mr|Mrs|Dr|Sir|Prof)(\.|\b)/i, '')
				.replace(/,\s*$/, '');
			item.creators.push(ZU.cleanAuthor(creator, creatorType,
				creator.includes(',')));
		}
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://magnesalm.org/notebook_ext.asp?item=166740&site=magnes&lang=ENG&menu=1",
		"items": [
			{
				"itemType": "book",
				"title": "The Jewish World: 100 Treasures of Art & Culture, The Magnes",
				"creators": [
					{
						"firstName": "Alla",
						"lastName": "Efimova",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"language": "English",
				"libraryCatalog": "IDEA ALM (magnesalm.org)",
				"numPages": "176",
				"publisher": "Rizzoli International Publications",
				"shortTitle": "The Jewish World",
				"url": "http://magnesalm.org/notebook_ext.asp?site=magnes&book=166740&lang=ENG",
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
		"url": "http://magnesalm.org/notebook_ext.asp?site=magnes&book=163129",
		"items": [
			{
				"itemType": "book",
				"title": "Famous cook book",
				"creators": [
					{
						"firstName": "Sigismund",
						"lastName": "Aronson",
						"creatorType": "author"
					},
					{
						"firstName": "Samuel",
						"lastName": "Brown",
						"creatorType": "author"
					}
				],
				"date": "1916",
				"abstractNote": "20 cm.",
				"extra": "Accession Number: MCBC 1.",
				"libraryCatalog": "IDEA ALM (magnesalm.org)",
				"numPages": "446, xii",
				"place": "United States, Seattle, Oregon",
				"publisher": "The Auxiliary",
				"url": "http://magnesalm.org/notebook_ext.asp?site=magnes&book=163129",
				"attachments": [
					{
						"title": "Link to OCLC WorldCat",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Link to related content",
						"mimeType": "text/html",
						"snapshot": false
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
		"url": "http://magnesalm.org/notebook_fext.asp?site=magnes&book=40",
		"items": [
			{
				"itemType": "artwork",
				"title": "Ketubbah",
				"creators": [
					{
						"firstName": "Shabtai ben Ezra",
						"lastName": "ha-Cohen",
						"creatorType": "author"
					},
					{
						"firstName": "Esther bat Isaac",
						"lastName": "Ohayon",
						"creatorType": "author"
					}
				],
				"date": "1880-03-26",
				"abstractNote": "Manuscript Ketubbah on brown paper; lobed arch of multicolor flowers and vines; blessings and good wishes for the couple form an arch above the acronym \"In a good sign\" in large, purple, square script Hebrew; text in small cursive script with several phrases in enlarged square script blue ink seal in lower right near witness signatures; blue ink seal of Rabbi M. Pardo on lower right by signatures.",
				"artworkMedium": "watercolor and ink on paper",
				"extra": "Accession Number: 69.0.11",
				"language": "Hebrew",
				"libraryCatalog": "IDEA ALM (magnesalm.org)",
				"url": "http://magnesalm.org/notebook_fext.asp?site=magnes&book=40",
				"attachments": [
					{
						"title": "Low-Resolution Image",
						"mimeType": "image/jpeg"
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
		"url": "http://magnesalm.org/notebook_ext.asp?item=159652&site=magnes&lang=ENG&menu=1",
		"items": [
			{
				"itemType": "artwork",
				"title": "Gertrude Stein portrait",
				"creators": [
					{
						"firstName": "Bachrach",
						"lastName": "Studios",
						"creatorType": "author"
					}
				],
				"date": "1903-1904",
				"artworkMedium": "black and white photograph",
				"extra": "Accession Number: 2009.8 AR1.5",
				"libraryCatalog": "IDEA ALM (magnesalm.org)",
				"url": "http://magnesalm.org/notebook_ext.asp?item=159652&site=magnes&lang=ENG&menu=1",
				"attachments": [
					{
						"title": "Low-Resolution Image",
						"mimeType": "image/jpeg"
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
		"url": "http://magnesalm.org/notebook_ext.asp?item=159656&site=magnes&lang=ENG&menu=1",
		"items": [
			{
				"itemType": "artwork",
				"title": "Interior of 27 Rue de Fleurus",
				"creators": [],
				"date": "circa 1906-1909",
				"artworkMedium": "black and white photograph",
				"extra": "Accession Number: 2009.8 AR1.10",
				"libraryCatalog": "IDEA ALM (magnesalm.org)",
				"url": "http://magnesalm.org/notebook_ext.asp?item=159656&site=magnes&lang=ENG&menu=1",
				"attachments": [
					{
						"title": "Low-Resolution Image",
						"mimeType": "image/jpeg"
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
		"url": "http://maapilim.org.il/notebook_ext.asp?item=183576&site=maapilim&lang=ENG&menu=1",
		"items": [
			{
				"itemType": "artwork",
				"title": "Stone carving from Cyprus - Moshe Eichenbaum",
				"creators": [],
				"libraryCatalog": "Bintivey Haapala",
				"url": "http://maapilim.org.il/notebook_ext.asp?item=183576&site=maapilim&lang=ENG&menu=1",
				"attachments": [
					{
						"title": "Low-Resolution Image",
						"mimeType": "image/jpeg"
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
		"url": "http://maapilim.org.il/notebook_ext.asp?item=185597&site=maapilim&lang=ENG&menu=1",
		"items": [
			{
				"itemType": "book",
				"title": "A Hug From Afar: One family's dramatic journey through three continents to escape the Holocaust",
				"creators": [
					{
						"firstName": "Claire",
						"lastName": "Barkey Flash",
						"creatorType": "author"
					},
					{
						"firstName": "Cynthia Barkey",
						"lastName": "Flash",
						"creatorType": "editor"
					}
				],
				"language": "אנגלית",
				"libraryCatalog": "Bintivey Haapala",
				"shortTitle": "A Hug From Afar",
				"url": "http://maapilim.org.il/notebook_ext.asp?item=185597&site=maapilim&lang=ENG&menu=1",
				"attachments": [
					{
						"title": "Low-Resolution Image",
						"mimeType": "image/jpeg"
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
		"url": "https://www.infocenters.co.il/gfh/notebook_ext.asp?item=98034&site=gfh&lang=HEB&menu=1",
		"items": [
			{
				"itemType": "book",
				"title": "מארכיון \"עונג שבת\": שלושה סיפורים.",
				"creators": [],
				"language": "פולנית",
				"libraryCatalog": "ארכיון בית לוחמי הגטאות",
				"shortTitle": "מארכיון \"עונג שבת\"",
				"url": "http://www.infocenters.co.il/gfh/notebook_ext.asp?item=98034&site=gfh&lang=HEB&menu=1",
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
	}
]
/** END TEST CASES **/
