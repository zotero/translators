{
	"translatorID": "11614156-f421-4e89-1111-a5e69ce3ebed",
	"label": "Library of Congress Digital Collections",
	"creator": "Adam Bravo",
	"target": "^https?://www\\.loc\\.gov/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-08-21 17:53:37"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Adam Bravo
	
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
	if (url.includes('/resource/') && doc.querySelector('.format-label[data-format="newspaper"]')) {
		return "newspaperArticle";
	}
	// See https://www.loc.gov/apis/json-and-yaml/requests/endpoints/ - "resources" contain information about the segments of a resource
	// Newspaper search results on loc.gov return resources

	return false;
}


async function doWeb(doc, url) {
	let jsonURL = `${url}&fo=json`;
	//let position = url.indexOf('/resource/');
	//let id = url.substr(position + 4);
	//let jsonURL = `https://catalog.archives.gov/proxy/records/search?naId_is=${id}&allowLegacyOrgNames=true`;
	let json = (await requestJSON(jsonURL));

	if (json.item.original_format[0].toUpperCase() == "NEWSPAPER") {
		let item = new Zotero.Item("newspaperArticle");
		item.archive = "Library of Congress Digital Collections";
		item.archiveLocation = json.item.shelf_id;
		item.callNumber = json.item.number_lccn;
		item.date = json.item.date;
		item.language = json.item.language;
		item.libraryCatalog = json.item.partof_collection;
		item.pages = json.pagination.current;
		item.place = json.item.place_of_publication;
		item.publicationTitle = json.item.newspaper_title;
		item.rights = json.item.rights;
		item.title = json.item.title;
		item.url = json.resource.url;
		item.attachments.push({
			title: `${json.item.title}, Page ${json.pagination.current}`,
			url: json.resource.pdf,
			mimeType: "application/pdf",
			proxy: false
		});
		item.complete();
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
				"archive": "Library of Congress Digital Collections",
				"archiveLocation": "sn83045462, 1902-06-18, Edition 1",
				"callNumber": "sn83045462",
				"date": "1902-06-18",
				"language": "english",
				"libraryCatalog": "chronicling america",
				"pages": "14",
				"place": "Washington, D.C.",
				"publicationTitle": "Evening star.",
				"rights": "<p>The Library of Congress believes that the newspapers in Chronicling America are in the public domain or have no known copyright restrictions.  Newspapers published in the United States more than 95 years ago are in the public domain in their entirety. Any newspapers in Chronicling America that were published less than 95 years ago are also believed to be in the public domain, but may contain some copyrighted third party materials. Researchers using newspapers published less than 95 years ago should be alert for modern content (for example, registered and renewed for copyright and published with notice) that may be copyrighted.  Responsibility for making an independent legal assessment of an item and securing any necessary permissions ultimately rests with persons desiring to use the item.</p>\n<p>The NEH awardee responsible for producing each digital object is presented in the Chronicling America page display, below the page image  – e.g. Image produced by the Library of Congress. For more information on current NDNP awardees, see <a href=\"https://www.loc.gov/ndnp/listawardees.html\">https://www.loc.gov/ndnp/listawardees.html</a>.</p>\n<p>For more information on Library of Congress policies and disclaimers regarding rights and reproductions, see <a href=\"https://www.loc.gov/homepage/legal.html\">https://www.loc.gov/homepage/legal.html</a></p>",
				"title": "Evening star (Washington, D.C.), June 18, 1902",
				"attachments": [
					"Evening star (Washington, D.C.), June 18, 1902, Page 14"
				],
				"seeAlso": [],
				"url": "https://www.loc.gov/item/sn83045462/1902-06-18/ed-1/"
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.loc.gov/resource/sn83016844/1963-10-03/ed-1/?sp=1&q=univac",
		"items": [
			{
				"itemType": "newspaperArticle",
				"archive": "Library of Congress Digital Collections",
				"archiveLocation": "sn83016844, 1963-10-03, Edition 1",
				"callNumber": "",
				"date": "1902-06-18",
				"language": "english",
				"libraryCatalog": "chronicling america",
				"pages": "1",
				"place": "Minneapolis, Minn.",
				"publicationTitle": "Twin City observer",
				"rights": "<p>The Library of Congress believes that the newspapers in Chronicling America are in the public domain or have no known copyright restrictions.  Newspapers published in the United States more than 95 years ago are in the public domain in their entirety. Any newspapers in Chronicling America that were published less than 95 years ago are also believed to be in the public domain, but may contain some copyrighted third party materials. Researchers using newspapers published less than 95 years ago should be alert for modern content (for example, registered and renewed for copyright and published with notice) that may be copyrighted.  Responsibility for making an independent legal assessment of an item and securing any necessary permissions ultimately rests with persons desiring to use the item.</p>\n<p>The NEH awardee responsible for producing each digital object is presented in the Chronicling America page display, below the page image  – e.g. Image produced by the Library of Congress. For more information on current NDNP awardees, see <a href=\"https://www.loc.gov/ndnp/listawardees.html\">https://www.loc.gov/ndnp/listawardees.html</a>.</p>\n<p>For more information on Library of Congress policies and disclaimers regarding rights and reproductions, see <a href=\"https://www.loc.gov/homepage/legal.html\">https://www.loc.gov/homepage/legal.html</a></p>",
				"title": "Twin City observer (Minneapolis, Minn.), October 3, 1963",
				"attachments": [
					"Twin City observer (Minneapolis, Minn.), October 3, 1963, Page 1"
				],
				"seeAlso": [],
				"url": "https://www.loc.gov/resource/sn83016844/1963-10-03/ed-1/?sp=1&q=univac"
			}
		]
	}
]
/** END TEST CASES **/
