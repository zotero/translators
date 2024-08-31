{
	"translatorID": "a6bfb69f-5dd3-4d60-b9ad-d68ef9eb9a26",
	"label": "artnet",
	"creator": "Abe Jellinek",
	"target": "https?://(www\\.)?artnet\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-20 15:14:28"
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


function detectWeb(doc, _url) {
	if (doc.querySelector('.artworkInfo')) {
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
	var rows = doc.querySelectorAll('.artworkBox p a[href*="/artists/"]');
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
	let item = new Zotero.Item('artwork');
	let json = JSON.parse(text(doc, 'script[type="application/ld+json"]'));
	
	item.title = json.name;
	item.abstractNote = json.description;
	item.artworkMedium = (json.artMedium || []).join(',');
	item.artworkSize = [json.width, json.height, json.depth]
		.map(dim => dim.name).filter(s => s && !/^0\s/.test(s)).join(' x ');
	item.date = json.dateCreated;
	item.url = attr(doc, 'link[rel="canonical"]', 'href');
	
	if (json.creator) {
		item.creators.push(ZU.cleanAuthor(json.creator.name, 'artist'));
	}
	
	if (json.contributor) {
		item.creators.push(ZU.cleanAuthor(json.contributor.name, 'contributor'));
	}
	
	if (json.image) {
		item.attachments.push({
			title: 'Artwork Image',
			mimeType: 'image/jpeg',
			url: json.image
		});
	}
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.artnet.com/artists/alexander-calder/zigzag-sun-and-crags-a-G6fqVgnImvcCbM8DkCx4tA2",
		"items": [
			{
				"itemType": "artwork",
				"title": "Zigzag Sun and Crags",
				"creators": [
					{
						"firstName": "Alexander",
						"lastName": "Calder",
						"creatorType": "artist"
					}
				],
				"date": "1972",
				"artworkMedium": "gouache and ink on paper",
				"artworkSize": "43 in x 29.5 in",
				"libraryCatalog": "artnet",
				"url": "http://www.artnet.com/artists/alexander-calder/zigzag-sun-and-crags-a-G6fqVgnImvcCbM8DkCx4tA2",
				"attachments": [
					{
						"title": "Artwork Image",
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
		"url": "http://www.artnet.com/artists/maurizio-cattelan/untitled-bar-a-npXYQSapSJyoVj3L3iBV9A2",
		"items": [
			{
				"itemType": "artwork",
				"title": "Untitled (BAR)",
				"creators": [
					{
						"firstName": "Maurizio",
						"lastName": "Cattelan",
						"creatorType": "artist"
					}
				],
				"date": "1997",
				"artworkMedium": "Plexiglass, blue neon and stainless steel",
				"artworkSize": "65 cm x 151 cm x 11 cm",
				"libraryCatalog": "artnet",
				"url": "http://www.artnet.com/artists/maurizio-cattelan/untitled-bar-a-npXYQSapSJyoVj3L3iBV9A2",
				"attachments": [
					{
						"title": "Artwork Image",
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
		"url": "http://www.artnet.com/artists/frantisek-muzika/burial-mound-i-YgbRktG2GC7Vo-U_6GOBPQ2",
		"items": [
			{
				"itemType": "artwork",
				"title": "Burial Mound I",
				"creators": [
					{
						"firstName": "Frantisek",
						"lastName": "Muzika",
						"creatorType": "artist"
					}
				],
				"artworkMedium": "Oil on cardboard",
				"artworkSize": "46 CM x 33 CM",
				"libraryCatalog": "artnet",
				"url": "http://www.artnet.com/artists/frantisek-muzika/burial-mound-i-YgbRktG2GC7Vo-U_6GOBPQ2",
				"attachments": [
					{
						"title": "Artwork Image",
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
		"url": "http://www.artnet.com/search/artworks/?q=cattle",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
