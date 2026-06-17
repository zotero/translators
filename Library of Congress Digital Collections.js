{
	"translatorID": "79c14aee-b91f-46ed-8285-d83fed1f0b32",
	"label": "Library of Congress Digital Collections",
	"creator": "Abe Jellinek and Adam Bravo",
	"target": "^https?://www\\.loc\\.gov/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-08-22 14:22:18"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Abe Jellinek
	
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

let resourceIDRe = /\/(?:resource|item)\/([^/]+)/;

function detectWeb(doc, url) {
	if (!resourceIDRe.test(url)) {
		return false;
	}
	let format = attr(doc, '.format-label[data-format]', 'data-format');
	if (!format && doc.querySelector('#clip-download')) {
		format = attr(doc, '.resource-container a', 'href').match(/original_format:([^&]+)/);
		format = format && format[1];
	}
	if (!format) {
		return false;
	}
	switch (format) {
		case 'audio':
			return 'audioRecording';
		case 'book':
			return 'book';
		case 'manuscript-mixed-material':
			return 'manuscript';
		case 'map':
			// These are sometimes atlas sections, so might change later
			return 'map';
		case 'newspaper':
			return 'newspaperArticle';
		case 'photo-print-drawing':
			return 'artwork';
	}
	// See https://www.loc.gov/apis/json-and-yaml/requests/endpoints/ - "resources" contain information about the segments of a resource

	return false;
}

async function doWeb(doc, url) {
	// Not doing multiples yet. Many search results are links to external sites,
	// so we'll need to think about how/whether we want to deal with that.

	let imageURL = null;
	if (doc.querySelector('.clip-note-actions a')) {
		imageURL = attr(doc, '#clip-download', 'href');
		url = doc.querySelector('.clip-note-actions a').href;
		doc = await requestDocument(url);
	}
	else if (new URL(url).pathname.startsWith('/item/')) {
		url = attr(doc, '#resources a.link-resource', 'href');
		if (!url) {
			throw new Error('No resource URL');
		}
		doc = await requestDocument(url);
	}
	await scrape(doc, url, imageURL);
}

async function scrape(doc, url, imageURL = null) {
	let jsonURL = new URL(url);
	jsonURL.searchParams.set('fo', 'json');
	let json = await requestJSON(jsonURL.toString());

	let marcxmlURL;
	if (json.item.other_formats && json.item.other_formats.some(f => f.label == 'MARCXML Record')) {
		marcxmlURL = json.item.other_formats.find(f => f.label == 'MARCXML Record').link;
	}
	else if (json.item.library_of_congress_control_number) {
		marcxmlURL = `https://lccn.loc.gov/${json.item.library_of_congress_control_number}/marcxml`;
	}
	let marcxml = marcxmlURL && await requestText(marcxmlURL);

	let item;
	if (marcxml) {
		let translate = Zotero.loadTranslator('import');
		translate.setTranslator('edd87d07-9194-42f8-b2ad-997c4c7deefd');
		translate.setString(marcxml);
		translate.setHandler('itemDone', (_, item) => {});
		[item] = await translate.translate();
		item.itemType = detectWeb(doc, url);
		if (item.itemType == 'map' && first(json.item.medium).includes('atlas')) {
			item.itemType = 'bookSection';
		}
	}
	else {
		// Metadata will be low quality, but nothing we can do
		item = new Zotero.Item(detectWeb(doc, url));
		item.title = json.item.title;
	}
	
	item.date = json.item.date || json.item.date_issued;
	item.callNumber = first(json.item.number_lccn);
	if (ZU.fieldIsValidForType('pages', item.itemType)) {
		item.pages = json.pagination.current;
	}
	item.language = first(json.item.language);
	item.rights = ZU.unescapeHTML(ZU.cleanTags(first(json.item.rights)));
	if (item.rights.length > 1500) {
		// Maybe don't include rights info for every single item in the entire collection
		item.rights = item.rights.substring(0, 1500) + '…';
	}
	item.url = json.resource.url;

	item.archive = first(json.item.repository);
	if (!item.archive) {
		let note = json.item.notes.find(note => note.toLowerCase().includes('collection;'));
		if (note) {
			item.archive = note.split(';')[0];
		}
	}
	if (item.archive) {
		item.archiveLocation = json.item.shelf_id;
		// Sometimes the shelf_id contains repeated values for every copy of the work
		if (item.archiveLocation && first(json.item.call_number) && item.archiveLocation.startsWith(first(json.item.call_number))) {
			item.archiveLocation = first(json.item.call_number);
		}
	}

	// Just get a PDF if we can - don't bother with the tiny full-page JPEGs
	if (json.resource.pdf) {
		item.attachments.push({
			title: 'Full Text PDF',
			mimeType: 'application/pdf',
			url: json.resource.pdf
		});
	}
	if (imageURL) {
		item.attachments.push({
			title: 'Clipping',
			mimeType: 'image/jpeg',
			url: imageURL
		});
	};

	if (item.itemType == 'book') {
		delete item.publicationTitle;
	}
	else if (item.itemType == 'bookSection') {
		item.bookTitle = item.title;
		if (json.segments && json.segments.length && json.segments[0].title) {
			item.title = json.segments[0].title;
		}
		else {
			item.title = '[Section]';
		}
	}
	else if (item.itemType == 'newspaperArticle') {
		item.publicationTitle = item.title;
		item.title = '[Article]';
	}

	if (item.numPages == '1') {
		delete item.numPages;
	}

	item.libraryCatalog = 'Library of Congress Digital Collections';
	item.complete();
}

function first(array) {
	if (typeof array == 'string') {
		return array;
	}
	else if (array && array.length) {
		return array[0];
	}
	else {
		return '';
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.loc.gov/resource/sn83045462/1902-06-18/ed-1/?sp=14",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "[Article]",
				"creators": [],
				"date": "1902-06-18",
				"ISSN": "2331-9968",
				"callNumber": "sn83045462",
				"extra": "OCLC: ocm02260929",
				"language": "english",
				"libraryCatalog": "Library of Congress Digital Collections",
				"pages": 14,
				"place": "Washington, D.C",
				"publicationTitle": "Evening star",
				"rights": "The Library of Congress believes that the newspapers in Chronicling America are in the public domain or have no known copyright restrictions.  Newspapers published in the United States more than 95 years ago are in the public domain in their entirety. Any newspapers in Chronicling America that were published less than 95 years ago are also believed to be in the public domain, but may contain some copyrighted third party materials. Researchers using newspapers published less than 95 years ago should be alert for modern content (for example, registered and renewed for copyright and published with notice) that may be copyrighted.  Responsibility for making an independent legal assessment of an item and securing any necessary permissions ultimately rests with persons desiring to use the item.\n\n\nThe NEH awardee responsible for producing each digital object is presented in the Chronicling America page display, below the page image  – e.g. Image produced by the Library of Congress. For more information on current NDNP awardees, see https://www.loc.gov/ndnp/listawardees.html.\n\n\nFor more information on Library of Congress policies and disclaimers regarding rights and reproductions, see https://www.loc.gov/homepage/legal.html",
				"url": "https://www.loc.gov/resource/sn83045462/1902-06-18/ed-1/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Newspapers"
					},
					{
						"tag": "Newspapers"
					},
					{
						"tag": "Washington (D.C.)"
					},
					{
						"tag": "Washington (D.C.)"
					}
				],
				"notes": [
					{
						"note": "\"From April 25 through May 24, 1861 one sheet issues were published intermittently owing to scarcity of paper.\" Cf. Library of Congress, Photoduplication Service Publisher varies: Noyes, Baker & Co., <1867>; Evening Star Newspaper Co., <1868->"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.loc.gov/resource/sn83016844/1963-10-03/ed-1/?sp=1&q=univac",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "[Article]",
				"creators": [],
				"date": "1963-10-03",
				"callNumber": "sn83016844",
				"extra": "OCLC: ocm01716569",
				"language": "english",
				"libraryCatalog": "Library of Congress Digital Collections",
				"pages": 1,
				"place": "Minneapolis, Minn",
				"publicationTitle": "Twin City observer",
				"rights": "The Library of Congress believes that the newspapers in Chronicling America are in the public domain or have no known copyright restrictions.  Newspapers published in the United States more than 95 years ago are in the public domain in their entirety. Any newspapers in Chronicling America that were published less than 95 years ago are also believed to be in the public domain, but may contain some copyrighted third party materials. Researchers using newspapers published less than 95 years ago should be alert for modern content (for example, registered and renewed for copyright and published with notice) that may be copyrighted.  Responsibility for making an independent legal assessment of an item and securing any necessary permissions ultimately rests with persons desiring to use the item.\n\n\nThe NEH awardee responsible for producing each digital object is presented in the Chronicling America page display, below the page image  – e.g. Image produced by the Library of Congress. For more information on current NDNP awardees, see https://www.loc.gov/ndnp/listawardees.html.\n\n\nFor more information on Library of Congress policies and disclaimers regarding rights and reproductions, see https://www.loc.gov/homepage/legal.html",
				"url": "https://www.loc.gov/resource/sn83016844/1963-10-03/ed-1/?q=univac",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "African Americans"
					},
					{
						"tag": "African Americans"
					},
					{
						"tag": "Minnesota"
					},
					{
						"tag": "Minnesota"
					},
					{
						"tag": "Newspapers"
					},
					{
						"tag": "Newspapers"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.loc.gov/resource/sn83045462/1902-06-18/ed-1/?sp=14&clip=52,2166,785,159&ciw=217&rot=0",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "[Article]",
				"creators": [],
				"date": "1902-06-18",
				"ISSN": "2331-9968",
				"callNumber": "sn83045462",
				"extra": "OCLC: ocm02260929",
				"language": "english",
				"libraryCatalog": "Library of Congress Digital Collections",
				"pages": 14,
				"place": "Washington, D.C",
				"publicationTitle": "Evening star",
				"rights": "The Library of Congress believes that the newspapers in Chronicling America are in the public domain or have no known copyright restrictions.  Newspapers published in the United States more than 95 years ago are in the public domain in their entirety. Any newspapers in Chronicling America that were published less than 95 years ago are also believed to be in the public domain, but may contain some copyrighted third party materials. Researchers using newspapers published less than 95 years ago should be alert for modern content (for example, registered and renewed for copyright and published with notice) that may be copyrighted.  Responsibility for making an independent legal assessment of an item and securing any necessary permissions ultimately rests with persons desiring to use the item.\n\n\nThe NEH awardee responsible for producing each digital object is presented in the Chronicling America page display, below the page image  – e.g. Image produced by the Library of Congress. For more information on current NDNP awardees, see https://www.loc.gov/ndnp/listawardees.html.\n\n\nFor more information on Library of Congress policies and disclaimers regarding rights and reproductions, see https://www.loc.gov/homepage/legal.html",
				"url": "https://www.loc.gov/resource/sn83045462/1902-06-18/ed-1/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Clipping",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					{
						"tag": "Newspapers"
					},
					{
						"tag": "Newspapers"
					},
					{
						"tag": "Washington (D.C.)"
					},
					{
						"tag": "Washington (D.C.)"
					}
				],
				"notes": [
					{
						"note": "\"From April 25 through May 24, 1861 one sheet issues were published intermittently owing to scarcity of paper.\" Cf. Library of Congress, Photoduplication Service Publisher varies: Noyes, Baker & Co., <1867>; Evening Star Newspaper Co., <1868->"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.loc.gov/resource/g3701gm.gct00013/?sp=31&st=image",
		"detectedItemType": "map",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Southeastern Alaska",
				"creators": [
					{
						"lastName": "Geological Survey (U.S.)",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"firstName": "Arch C.",
						"lastName": "Gerlach",
						"creatorType": "author"
					}
				],
				"date": "1970-01-01",
				"archive": "Library of Congress Geography and Map Division Washington, D.C. 20540-4650 USA dcu",
				"archiveLocation": "G1200 .U57 1970",
				"bookTitle": "The national atlas of the United States of America",
				"callNumber": "79654043",
				"language": "english",
				"libraryCatalog": "Library of Congress Digital Collections",
				"pages": 31,
				"place": "Washington",
				"rights": "The maps in the Map Collections materials were either published prior to \r1922, produced by the United States government, or both (see catalogue \rrecords that accompany each map for information regarding date of \rpublication and source). The Library of Congress is providing access to \rthese materials for educational and research purposes and is not aware of \rany U.S. copyright protection (see Title 17 of the United States Code) or any \rother restrictions in the Map Collection materials.\r\n\n\rNote that the written permission of the copyright owners and/or other rights \rholders (such as publicity and/or privacy rights) is required for distribution, \rreproduction, or other use of protected items beyond that allowed by fair use \ror other statutory exemptions.  Responsibility for making an independent \rlegal assessment of an item and securing any necessary permissions \rultimately rests with persons desiring to use the item.\r\n\n\rCredit Line: Library of Congress, Geography and Map Division.",
				"url": "https://www.loc.gov/resource/g3701gm.gct00013/",
				"attachments": [],
				"tags": [
					{
						"tag": "Census, 1970"
					},
					{
						"tag": "Maps"
					},
					{
						"tag": "Statistics"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "United States"
					}
				],
				"notes": [
					{
						"note": "Six transparent overlays in envelope inserted Signed by William T. Pecora, Under Secretary of Interior, W.A. Radlinski, Associate Director, U.S.G.S., Arch C. Gerlach, Chief Geographer, and William B. Overstreet, Chief National Atlas Project and is number 13 of 14 copies"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.loc.gov/resource/g3701gm.gct00013/?sp=31&st=image&clip=606,833,3096,3784&ciw=401&rot=0",
		"detectedItemType": "map",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Southeastern Alaska",
				"creators": [
					{
						"lastName": "Geological Survey (U.S.)",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"firstName": "Arch C.",
						"lastName": "Gerlach",
						"creatorType": "author"
					}
				],
				"date": "1970-01-01",
				"archive": "Library of Congress Geography and Map Division Washington, D.C. 20540-4650 USA dcu",
				"archiveLocation": "G1200 .U57 1970",
				"bookTitle": "The national atlas of the United States of America",
				"callNumber": "79654043",
				"language": "english",
				"libraryCatalog": "Library of Congress Digital Collections",
				"pages": 31,
				"place": "Washington",
				"rights": "The maps in the Map Collections materials were either published prior to \r1922, produced by the United States government, or both (see catalogue \rrecords that accompany each map for information regarding date of \rpublication and source). The Library of Congress is providing access to \rthese materials for educational and research purposes and is not aware of \rany U.S. copyright protection (see Title 17 of the United States Code) or any \rother restrictions in the Map Collection materials.\r\n\n\rNote that the written permission of the copyright owners and/or other rights \rholders (such as publicity and/or privacy rights) is required for distribution, \rreproduction, or other use of protected items beyond that allowed by fair use \ror other statutory exemptions.  Responsibility for making an independent \rlegal assessment of an item and securing any necessary permissions \rultimately rests with persons desiring to use the item.\r\n\n\rCredit Line: Library of Congress, Geography and Map Division.",
				"url": "https://www.loc.gov/resource/g3701gm.gct00013/",
				"attachments": [
					{
						"title": "Clipping",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					{
						"tag": "Census, 1970"
					},
					{
						"tag": "Maps"
					},
					{
						"tag": "Statistics"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "United States"
					}
				],
				"notes": [
					{
						"note": "Six transparent overlays in envelope inserted Signed by William T. Pecora, Under Secretary of Interior, W.A. Radlinski, Associate Director, U.S.G.S., Arch C. Gerlach, Chief Geographer, and William B. Overstreet, Chief National Atlas Project and is number 13 of 14 copies"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.loc.gov/resource/rbpe.24404500/",
		"items": [
			{
				"itemType": "book",
				"title": "Gettysburg address delivered at Gettysburg Pa. Nov. 19th, 1863. [n. p. n. d.].",
				"creators": [],
				"archive": "Printed Ephemera Collection",
				"archiveLocation": "Portfolio 244, Folder 45",
				"language": "english",
				"libraryCatalog": "Library of Congress Digital Collections",
				"rights": "The Library of Congress is providing access to these materials for educational and research purposes and makes no warranty with regard to their use for other purposes. Responsibility for making an independent legal assessment of an item and securing any necessary permissions ultimately rests with persons desiring to use the item. The written permission of the copyright owners and/or other rights holders (such as publicity and/or privacy rights) is required for distribution, reproduction, or other use of protected items beyond that allowed by fair use or other statutory exemptions.\n\n\nWith a few exceptions, the Library is not aware of any U.S. copyright protection (see Title 17, U.S.C.) or any other restrictions in the materials in the Printed Ephemera Collection. There may be content that is protected as \"works for hire\" (copyright may be held by the party that commissioned the original work) and/or under the copyright or neighboring-rights laws of other nations. A few items in this online presentation are subject to copyright and are made available here with permission of the copyright owners. Copyright information is provided with these specific items.\n\n\nIn all cases, responsibility for making an independent legal assessment of an item and securing any necessary permissions ultimately rests with persons desiring to use the item.\n\n\nItems included here with the permission of rights holders are listed below, and permission is noted in the catalog record for each item. In some c…",
				"url": "https://www.loc.gov/resource/rbpe.24404500/",
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
		"url": "https://www.loc.gov/resource/g3701em.gct00002/?sp=7",
		"items": [
			{
				"itemType": "book",
				"title": "Indian land cessions in the United States",
				"creators": [
					{
						"firstName": "Charles C.",
						"lastName": "Royce",
						"creatorType": "author"
					},
					{
						"firstName": "Cyrus",
						"lastName": "Thomas",
						"creatorType": "author"
					}
				],
				"date": "1899",
				"archive": "Library of Congress Geography and Map Division Washington, D.C. 20540-4650 USA dcu",
				"archiveLocation": "KIE610 .R69 1899",
				"callNumber": "13023487",
				"language": "english",
				"libraryCatalog": "Library of Congress Digital Collections",
				"numPages": "521",
				"rights": "The contents of this collection are in the public domain and are free to use and reuse.\n\n\r\nCredit Line: Law Library of Congress\n\n\r\nMore about Copyright and other Restrictions.\n\n\r\nFor guidance about compiling full citations consult Citing Primary Sources.",
				"url": "https://www.loc.gov/resource/g3701em.gct00002/",
				"attachments": [],
				"tags": [
					{
						"tag": "Government relations"
					},
					{
						"tag": "Indian land transfers"
					},
					{
						"tag": "Indians of North America"
					},
					{
						"tag": "United States"
					}
				],
				"notes": [
					{
						"note": "United States Serial Set Number 4015 contains the second part of the two-part Eighteenth Annual Report of the Bureau of American Ethnology to the Secretary of the Smithsonian Institution, 1896-1897. (Part one is printed in United States Serial Set Number 4014.) Part two, which was also printed as House Document No. 736 of the U.S. Serial Set, 56th Congress, 1st Session, features sixty-seven maps and two tables compiled by Charles C. Royce, with an introductory essay by Cyrus Thomas. The tables are entitled: Schedule of Treaties and Acts of Congress Authorizing Allotments of Lands in Severalty and Schedule of Indian Land Cessions. The Schedule of Indian Land Cessions subtitle notes that it \"indicates the number and location of each cession by or reservation for the Indian tribes from the organization of the Federal Government to and including 1894, together with descriptions of the tracts so ceded or reserved, the date of the treaty, law or executive order governing the same, the name of the tribe or tribes affected thereby, and historical data and references bearing thereon.\""
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.loc.gov/item/03004902/",
		"items": [
			{
				"itemType": "book",
				"title": "Notes on the state of Virginia",
				"creators": [
					{
						"firstName": "Thomas",
						"lastName": "Jefferson",
						"creatorType": "author"
					},
					{
						"lastName": "Joseph Meredith Toner Collection (Library of Congress)",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "1832",
				"callNumber": "03004902",
				"language": "english",
				"libraryCatalog": "Library of Congress Digital Collections",
				"numPages": "2",
				"place": "Boston",
				"publisher": "Lilly and Wait",
				"rights": "The Library of Congress is providing access to these materials for educational  and research purposes and makes no warranty with regard to their use for other  purposes.  Responsibility for making an independent legal assessment of an item  and securing any necessary permissions ultimately rests with persons desiring  to use the item.  The written permission of the copyright owners and/or holders  of other rights (such as publicity and/or privacy rights) is required for distribution,  reproduction, or other use of protected items beyond that allowed by fair use  or other statutory exemptions.   See American Memory, Copyright, and Other Restrictions and Privacy and Publicity Rights for additional information. \n\n\nThe Library is not aware of any U.S. copyright protection (see Title 17,  U.S.C.) or any other restrictions in the materials in The Capital and the Bay;  however there are two items from the publication entitled A Lecture  on Our National Capital by Frederick Douglass, Anacostia Neighborhood  Museum, Smithsonian Institution, and National Park Service, United States Department  of the Interior, published by the Smithsonian Institution Press, Washington,  D.C., 1978, for which additional information is provided below: \n\n\n\"'The Freedman's Savings and Trust Company, located  on Pennsylvania Avenue at Fifteenth Street, N.W., opposite the Treasury Building.'\"   This image is credited to the National Archives in the above publication.    The National Archives believes that th…",
				"url": "https://www.loc.gov/resource/gdcmassbookdig.notesonstateofvi00jeff_0/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Description and travel"
					},
					{
						"tag": "History"
					},
					{
						"tag": "Logan, James"
					},
					{
						"tag": "Virginia"
					},
					{
						"tag": "Virginia"
					}
				],
				"notes": [
					{
						"note": "\"An appendix ... relative to the murder of Logan's family\": p. [238]-274"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.loc.gov/item/96509623/",
		"items": [
			{
				"itemType": "artwork",
				"title": "Is this a republican form of government? Is this protecting life, liberty, or property? Is this the equal protection of the laws?",
				"creators": [
					{
						"firstName": "Thomas",
						"lastName": "Nast",
						"creatorType": "author"
					}
				],
				"date": "1876-01-01",
				"abstractNote": "African American man kneeling by bodies of murdered African American people. In background sign reads, \"the White Liners were here.\"",
				"artworkMedium": "graphic",
				"callNumber": "96509623",
				"language": "english",
				"libraryCatalog": "Library of Congress Digital Collections",
				"shortTitle": "Is this a republican form of government?",
				"url": "https://www.loc.gov/resource/cph.3c16355/",
				"attachments": [],
				"tags": [
					{
						"tag": "1870-1880"
					},
					{
						"tag": "1870-1880"
					},
					{
						"tag": "1870-1880"
					},
					{
						"tag": "1870-1880"
					},
					{
						"tag": "African Americans"
					},
					{
						"tag": "Homicides"
					},
					{
						"tag": "Periodical illustrations"
					},
					{
						"tag": "Punishment & torture"
					},
					{
						"tag": "Wood engravings"
					}
				],
				"notes": [
					{
						"note": "Illus. in: Harper's weekly, 1876 Sept. 2, p. 712"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.loc.gov/resource/ppmsca.51533/",
		"items": [
			{
				"itemType": "artwork",
				"title": "Brünnhilde",
				"creators": [
					{
						"firstName": "Adolph Edward",
						"lastName": "Weidhaas",
						"creatorType": "author"
					}
				],
				"date": "1936",
				"abstractNote": "Photograph shows side view of a cat wearing a winged helmet and breastplate armor in the role of the valkyrie Brünnhilde from the opera Der Ring des Niebelungen",
				"archive": "Library of Congress Prints and Photographs Division Washington, D.C. 20540 USA http://hdl.loc.gov/loc.pnp/pp.print",
				"archiveLocation": "Unprocessed in PR 06 CN 007-A [item] [P&P]",
				"artworkMedium": "graphic",
				"callNumber": "2017645524",
				"language": "english",
				"libraryCatalog": "Library of Congress Digital Collections",
				"url": "https://www.loc.gov/resource/ppmsca.51533/",
				"attachments": [],
				"tags": [
					{
						"tag": "1930-1940"
					},
					{
						"tag": "1930-1940"
					},
					{
						"tag": "1930-1940"
					},
					{
						"tag": "1930-1940"
					},
					{
						"tag": "1930-1940"
					},
					{
						"tag": "Animals in human situations"
					},
					{
						"tag": "Cats"
					},
					{
						"tag": "Costumes"
					},
					{
						"tag": "Humorous pictures"
					},
					{
						"tag": "Photographic prints"
					}
				],
				"notes": [
					{
						"note": "Title from item Copyright by Adolph E. Weidhaas, Old Greenwich, Conn"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.loc.gov/item/2017762891/",
		"items": [
			{
				"itemType": "artwork",
				"title": "Destitute pea pickers in California. Mother of seven children. Age thirty-two. Nipomo, California",
				"creators": [
					{
						"firstName": "Dorothea",
						"lastName": "Lange",
						"creatorType": "author"
					}
				],
				"date": "1936-01-01",
				"abstractNote": "Photograph shows Florence Thompson with three of her children in a photograph known as \"Migrant Mother.\" For background information, see \"Dorothea Lange's M̀igrant Mother' photographs ...\"",
				"archive": "Library of Congress Prints and Photographs Division Washington, D.C. 20540 USA http://hdl.loc.gov/loc.pnp/pp.print",
				"archiveLocation": "LC-USF34- 009058-C [P&P] LC-USF346-009058-C b&w film transparency LC-USF347-009058-C b&w film safety neg. LOT 344 (corresponding photographic print)",
				"artworkMedium": "graphic",
				"callNumber": "2017762891",
				"language": "english",
				"libraryCatalog": "Library of Congress Digital Collections",
				"rights": "The contents of the Library of Congress Farm Security Administration/Office of War Information Black-and-White Negatives are in the public domain and are free to use and reuse.\n\n\n Credit Line: Library of Congress, Prints & Photographs Division, Farm Security Administration/Office of War Information Black-and-White Negatives.\n\n\nFor information about reproducing, publishing, and citing material from this collection, as well as access to the original items, see: U.S. Farm Security Administration/Office of War Information Black & White Photographs - Rights and Restrictions Information\n\n\n\nMore about Copyright and other Restrictions \n\n\nFor guidance about compiling full citations consult Citing Primary Sources.",
				"url": "https://www.loc.gov/resource/fsa.8b29516/",
				"attachments": [],
				"tags": [
					{
						"tag": "Group portraits"
					},
					{
						"tag": "Migrant agricultural laborers"
					},
					{
						"tag": "Migrants--California"
					},
					{
						"tag": "Mothers"
					},
					{
						"tag": "Nitrate negatives"
					},
					{
						"tag": "Poor persons"
					},
					{
						"tag": "Portrait photographs"
					}
				],
				"notes": [
					{
						"note": "A copy transparency (LC-USF346-009058-C) and a copy safety negative (LC-USF347-009058-C) are also in the collection Digital file was made from the original nitrate negative for \"Migrant Mother\" (LC-USF34-009058-C). The negative was retouched in the 1930s to erase the thumb holding a tent pole in lower right hand corner. The file print made before the thumb was retouched can be seen at http://hdl.loc.gov/loc.pnp/ppmsca.12883 Title from caption card for negative. Title on print: \"Destitute pea pickers in California. A 32 year old mother of seven children.\" Date from: Dorothea Lange : migrant mother / Sara Hermanson Meister. New York: Museum of Modern Art, 2018"
					},
					{
						"note": "More information about the FSA/OWI Collection is available at"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.loc.gov/item/mtjbib000156/",
		"items": [
			{
				"itemType": "manuscript",
				"title": "Thomas Jefferson, June 1776, Rough Draft of the Declaration of Independence",
				"creators": [],
				"date": "1776-06",
				"archive": "Manuscript Division",
				"archiveLocation": "Microfilm Reel: 001",
				"language": "english",
				"libraryCatalog": "Library of Congress Digital Collections",
				"rights": "The Library of Congress is providing access to The Thomas Jefferson  Papers at the Library of Congress for noncommercial, educational and  research purposes. While the Library is not aware of any copyrights or  other rights associated with this Collection, the written permission of  any copyright owners and/or other rights holders (such as publicity  and/or privacy rights) is required for reproduction, distribution, or  other use of any protected items beyond that allowed by fair use or  other statutory exemptions. Responsibility for making an independent  legal assessment of an item and securing any necessary permissions  ultimately rests with the persons desiring to use the item. \n\n\n\tCredit Line: Library of Congress, Manuscript Division. \n\n\n\tThe following items are included in this Collection with permission:\n\n\n\tThe essay \"American Sphinx: The Contradictions of Thomas Jefferson\" by Joseph J. Ellis was originally published in the November-December 1994 issue of Civilization: The Magazine of the Library of Congress and may not be reprinted in any other form or by any other source.\n\n\n\tThe essay \"The Jamestown Records of the Virginia Company of London: A Conservator's Perspective\" by Sylvia R. Albro and Holly H. Krueger was originally published in a slightly different form in Proceedings of the Fourth International Conference of the Institute of Paper Conservation, 6-9 April 1997 and may not be reprinted in any other form or by any other source.\n\n\n\tRembrandt Peale's 1800 Thom…",
				"url": "https://www.loc.gov/resource/mtj1.001_0545_0548/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.loc.gov/item/98688323/",
		"items": [
			{
				"itemType": "map",
				"title": "A new and complete railroad map of the United States compiled from reliable sources",
				"creators": [
					{
						"firstName": "William",
						"lastName": "Perris",
						"creatorType": "author"
					}
				],
				"date": "1857-01-01",
				"abstractNote": "Map of the eastern half of the United States showing cities, state boundaries, finished railroads, and railroads in progress",
				"archive": "Library of Congress Geography and Map Division Washington, D.C. 20540-4650 USA dcu",
				"archiveLocation": "G3701.P3 1857 .P4",
				"callNumber": "98688323",
				"language": "english",
				"libraryCatalog": "Library of Congress Digital Collections",
				"place": "New York,",
				"rights": "The maps in the Map Collections materials were either published prior to \r1922, produced by the United States government, or both (see catalogue \rrecords that accompany each map for information regarding date of \rpublication and source). The Library of Congress is providing access to \rthese materials for educational and research purposes and is not aware of \rany U.S. copyright protection (see Title 17 of the United States Code) or any \rother restrictions in the Map Collection materials.\r\n\n\rNote that the written permission of the copyright owners and/or other rights \rholders (such as publicity and/or privacy rights) is required for distribution, \rreproduction, or other use of protected items beyond that allowed by fair use \ror other statutory exemptions.  Responsibility for making an independent \rlegal assessment of an item and securing any necessary permissions \rultimately rests with persons desiring to use the item.\r\n\n\rCredit Line: Library of Congress, Geography and Map Division.",
				"url": "https://www.loc.gov/resource/g3701p.rr000330/",
				"attachments": [],
				"tags": [
					{
						"tag": "Maps"
					},
					{
						"tag": "Railroads"
					},
					{
						"tag": "United States"
					}
				],
				"notes": [
					{
						"note": "Description derived from published bibliography Insets: [Boston & vicinity] includes list of \"Boston Depots.\" 14 x 20 cm.--[New York & vicinity] includes \"Rail road depots in the city of New York.\" 13 x 30 cm.--[Philadelphia & vicinity] includes list of \"Philadelphia depots.\" 13 x 23 cm.--Rail road map of Massachusetts, Connecticut and Rhode Island...1857. 23 x 19 cm"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
