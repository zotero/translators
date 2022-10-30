{
	"translatorID": "12a3b1cb-6bbb-4cf9-904f-8f732ee3d1e3",
	"label": "govinfo",
	"creator": "Abe Jellinek",
	"target": "https?://www\\.govinfo\\.gov/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-10-28 14:47:36"
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
	// TEMP: Why doesn't monitorDOMChanges() work here?
	// We'd like to wait for a #mods link, but instead we just have to use the URL for now
	if (url.includes('/details/')) {
		return 'document';
	}
	// no clear way to do multiples: metadata URLs differ depending on whether
	// the item is a "granule" or a "package," and I can't find any clues in the
	// static page. I'm really not sure how the app does it. that's a todo
	return false;
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, _url) {
	let modsURL = attr(doc, '#mods', 'href');
	ZU.doGet(modsURL, function (respText) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("0e2235e7-babf-413c-9acf-f27cce5f059c");
		translator.setString(respText);
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
		"url": "https://www.govinfo.gov/app/details/GPO-WMD",
		"defer": true,
		"items": [
			{
				"itemType": "document",
				"title": "Unclassified Version of the Report of the Commission on the Intelligence Capabilities of the United States Regarding Weapons of Mass Destruction",
				"creators": [
					{
						"lastName": "United States: Commission on the Intelligence Capabilities of the United States Regarding Weapons of Mass Destruction",
						"fieldMode": 1,
						"creatorType": "author"
					},
					{
						"lastName": "United States: Commission on the Intelligence Capabilities of the United States Regarding Weapons of Mass Destruction",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2005-03-31",
				"abstractNote": "The Commission on the Intelligence Capabilities of the United States Regarding Weapons of Mass Destruction was established in 2004 and charged with examining the capabilities and challenges of the American intelligence community concerning the capabilities, intentions, and activities of foreign powers relating to the design, development, manufacture, acquisition, possession, proliferation, transfer, testing, potential or threatened use, or use of weapons of mass destruction, related means of delivery, and other related threats of the 21st Century.",
				"callNumber": "PREX 1.19:IN 8/W 37",
				"language": "eng",
				"libraryCatalog": "govinfo",
				"publisher": "Commission on the Intelligence Capabilities of the United States Regarding Weapons of Mass Destruction",
				"rights": "fdlp",
				"url": "https://www.govinfo.gov/app/details/GPO-WMD",
				"attachments": [
					{
						"title": "JPEG rendition",
						"mimeType": "image/jpeg"
					},
					{
						"title": "PDF rendition",
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
		"url": "https://www.govinfo.gov/app/details/GPO-PICTDIR-116/",
		"defer": true,
		"items": [
			{
				"itemType": "document",
				"title": "Congressional Pictorial Directory: 116th Congress",
				"creators": [
					{
						"lastName": "United States: Congress: Joint Committee on Printing",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2019-12-20",
				"abstractNote": "The 116th Congressional Pictorial Directory provides a color photograph of each member of the House of Representatives and the Senate for the 116th Congress. It also includes information about a Member of Congress' length of service, political party affiliations, and Congressional district. Also contains pictures of the President, Vice President, and House and Senate officers and officials.",
				"callNumber": "Y 4.P 93/1:",
				"language": "eng",
				"libraryCatalog": "govinfo",
				"publisher": "U.S. Government Publishing Office",
				"rights": "fdlp",
				"shortTitle": "Congressional Pictorial Directory",
				"url": "https://www.govinfo.gov/app/details/GPO-PICTDIR-116",
				"attachments": [
					{
						"title": "PDF rendition",
						"mimeType": "application/pdf"
					},
					{
						"title": "JPEG rendition",
						"mimeType": "image/jpeg"
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
		"url": "https://www.govinfo.gov/app/details/GOVPUB-RR-e27242037b46c40b6e3d3c1f45d8a8cf",
		"defer": true,
		"items": [
			{
				"itemType": "document",
				"title": "BCD 2021-27 Employer Status Determination",
				"creators": [
					{
						"lastName": "United States: Railroad Retirement Board",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2021-06-15",
				"callNumber": "RR",
				"language": "eng",
				"libraryCatalog": "govinfo",
				"publisher": "Railroad Retirement Board",
				"rights": "fdlp",
				"url": "https://www.govinfo.gov/app/details/GOVPUB-RR-e27242037b46c40b6e3d3c1f45d8a8cf",
				"attachments": [
					{
						"title": "PDF rendition",
						"mimeType": "application/pdf"
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
