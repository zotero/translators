{
	"translatorID": "ed28758b-9c39-4e1c-af89-ce1c9202b70f",
	"label": "National Gallery of Art - USA",
	"creator": "Adam Crymble and Abe Jellinek",
	"target": "^https?://www\\.nga\\.gov/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-10-08 03:45:09"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Adam Crymble and Abe Jellinek
	
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
	if (url.includes('/art-object-page')) {
		return "artwork";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.return-art .title a');
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

function scrape(doc, _url) {
	var newItem = new Zotero.Item("artwork");
	var authors = doc.querySelectorAll('.object-artist > a');
	for (let author of authors) {
		let name = author.textContent;
		if (name) {
			newItem.creators.push(ZU.cleanAuthor(name, "artist", name.includes(', ')));
		}
	}
	newItem.title = text(doc, 'h1.object-title > em');
	newItem.date = text(doc, 'h1.object-title > .date');
	newItem.artworkMedium = getValue(doc, 'medium');
	newItem.artworkSize = getValue(doc, 'dimensions');
	newItem.callNumber = getValue(doc, 'accession');
	newItem.attachments.push({
		document: doc,
		title: "Snapshot"
	});
	newItem.libraryCatalog = 'National Gallery of Art';
	
	newItem.complete();
}

function getValue(doc, objectAttrClass) {
	return [...doc.querySelectorAll(`.object-attr.${objectAttrClass} > .object-attr-value`)]
		.map(el => el.textContent)
		.filter(Boolean)
		.join(', ');
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.nga.gov/collection/art-object-page.1237.html",
		"items": [
			{
				"itemType": "artwork",
				"title": "Girl with a Flute",
				"creators": [
					{
						"firstName": "Johannes",
						"lastName": "Vermeer",
						"creatorType": "artist"
					}
				],
				"date": "probably 1665/1675",
				"artworkMedium": "oil on panel",
				"artworkSize": "painted surface: 20 x 17.8 cm (7 7/8 x 7 in.), framed: 39.7 x 37.5 x 5.1 cm (15 5/8 x 14 3/4 x 2 in.)",
				"callNumber": "1942.9.98",
				"libraryCatalog": "National Gallery of Art",
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
		"url": "https://www.nga.gov/global-site-search-page.html?searchterm=manet",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.nga.gov/collection/artist-info.1506.html#works",
		"items": "multiple"
	}
]
/** END TEST CASES **/
