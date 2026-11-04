{
	"translatorID": "b448272b-6b7c-445c-9d0b-bb57df03110c",
	"label": "LoC.gov",
	"creator": "Abe Jellinek",
	"target": "^https?://(www\\.)loc\\.gov/(search|item)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 150,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-18 17:25:39"
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


// This translator targets search results under loc.gov/search/
// and items under loc.gov/item/. /search/ is the main search interface for the
// LoC's collections, but only a subset of items are in the catalog on the root
// domain - most are under lccn.loc.gov or catalog.loc.gov (Voyager 7 catalogs).
// Because Voyager 7 just delegates to MARC with no processing, but its
// detection and translation logic is a little complex (and seems to break
// inside processDocuments), we grab MARCXML for Voyager 7 records ourselves
// and cut out the middleman.
// There are a few more item types which we skip when detecting multiples:
// direct links to PDFs, links to legislation on Congress.gov, web pages, and
// the like. This behavior may be a bit confusing to users, but there's no way
// for this translator to handle every page that the catalog can link to.

function detectWeb(doc, url) {
	if (url.includes('/item/')) {
		if (text(doc, '.format-label').includes('Book')) {
			return "book";
		}
		else {
			return "artwork"; // usually accurate for non-book items
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
	var rows = doc.querySelectorAll(
		'.item-description-title a[href*="//lccn.loc.gov/"], \
		 .item-description-title a[href*="//www.loc.gov/item/"], \
		 .item-description-title a[href*="//loc.gov/item/"]'
	);
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
	let marcxmlURL = attr(doc, 'a[href*="lccn.loc.gov"][href$="/marcxml"]', 'href');
	if (!marcxmlURL) {
		Z.debug('No MARCXML link found - attempting to construct');
		marcxmlURL = url
			.replace(/^https?:\/\/(www\.)?loc\.gov\/item/, 'https://lccn.loc.gov')
			.replace(/[?#].*$/, '').replace(/\/$/, '')
			+ '/marcxml';
	}
	ZU.doGet(marcxmlURL, function (marcXMLText) {
		var translator = Zotero.loadTranslator("import");
		// MARCXML
		translator.setTranslator("edd87d07-9194-42f8-b2ad-997c4c7deefd");
		translator.setString(marcXMLText);
		translator.setHandler("itemDone", function (obj, item) {
			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.loc.gov/item/87026248/",
		"items": [
			{
				"itemType": "book",
				"title": "Music for silent films, 1894-1929: a guide",
				"creators": [
					{
						"firstName": "Gillian B.",
						"lastName": "Anderson",
						"creatorType": "author"
					}
				],
				"date": "1988",
				"ISBN": "9780844405803",
				"callNumber": "ML128.M7 A5 1988",
				"libraryCatalog": "LoC.gov",
				"numPages": "182",
				"place": "Washington",
				"publisher": "Library of Congress : For sale by the Supt. of Docs., U.S. G.P.O",
				"shortTitle": "Music for silent films, 1894-1929",
				"attachments": [],
				"tags": [
					{
						"tag": "Bibliography"
					},
					{
						"tag": "Silent film music"
					},
					{
						"tag": "Union lists"
					}
				],
				"notes": [
					{
						"note": "Includes index"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.loc.gov/item/2012636958/",
		"items": [
			{
				"itemType": "artwork",
				"title": "Literacy test",
				"creators": [
					{
						"firstName": "Herbert",
						"lastName": "Block",
						"creatorType": "author"
					}
				],
				"date": "1965-03-17",
				"abstractNote": "Editorial cartoon drawing shows a policeman sitting in a chair attempting to read a quote from President Lyndon Johnson on a large sign on the wall in front of him",
				"artworkMedium": "graphic",
				"callNumber": "BLOCK, no. 6281",
				"libraryCatalog": "LoC.gov",
				"attachments": [],
				"tags": [
					{
						"tag": "1960-1970"
					},
					{
						"tag": "1960-1970"
					},
					{
						"tag": "1960-1970"
					},
					{
						"tag": "1960-1970"
					},
					{
						"tag": "1960-1970"
					},
					{
						"tag": "1960-1970"
					},
					{
						"tag": "1960-1970"
					},
					{
						"tag": "Alabama"
					},
					{
						"tag": "American"
					},
					{
						"tag": "American"
					},
					{
						"tag": "Drawings"
					},
					{
						"tag": "Editorial cartoons"
					},
					{
						"tag": "Johnson, Lyndon B"
					},
					{
						"tag": "Literacy"
					},
					{
						"tag": "Lyndon Baines"
					},
					{
						"tag": "Police"
					},
					{
						"tag": "Quotations"
					},
					{
						"tag": "Reading"
					},
					{
						"tag": "Signs (Notices)"
					},
					{
						"tag": "Suffrage"
					}
				],
				"notes": [
					{
						"note": "Caption label from exhibit \"Herblock Looks at 1965\": Having secured the Civil Rights Act in 1964, President Johnson made passing the Voting Rights Act the focus of his 1965 legislative agenda. Motivated by the deadly racial violence at the hands of the police during the marches of Martin Luther King, Jr.'s, Selma Voting Rights Campaign, Johnson proposed the new law to Congress on March 15, 1965. Herblock quotes the president, and by depicting a white police officer grappling with the text, implied that African Americans had been denied their constitutional rights Title from item Signed \"Herblock\" lower left Published in the Washington Post, March 17, 1965 Copyright, 1965, by Herblock Inscribed in pencil at top left: 3-17-65"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.loc.gov/search/?q=test",
		"items": "multiple"
	}
]
/** END TEST CASES **/
