{
	"translatorID": "283d6b78-d3d7-48d4-8fc0-0bdabef7c4ee",
	"label": "Baruch Foundation",
	"creator": "Abe Jellinek",
	"target": "^https?://baruchfoundation\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-20 18:55:13"
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
	if (doc.querySelector('#img-artist')) {
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
	var rows = doc.querySelectorAll('h4 > a[href*=".jpg.php"]');
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
	let item = new Zotero.Item('artwork');

	item.title = text(doc, 'h1#title b');
	item.abstractNote = text(doc, '.description');
	item.artworkMedium = [...doc.querySelectorAll('.taglist a')]
		.map(a => a.innerText.trim()).join(', ');
	item.artworkSize = text(doc, '.zp_uneditable_image_location'); // not sure why this class
	item.date = text(doc, '.zp_uneditable_image_city'); // again...
	if (item.date.trim() == 'no date') item.date = '';
	item.archive = 'Baruch Foundation';
	item.url = url;
	item.rights = text(doc, '.credit');

	item.creators.push(ZU.cleanAuthor(
		text(doc, '#img-artist em').replace(/^Dr\.?\b/, ''),
		'artist'
	));

	item.attachments.push({
		title: 'Image',
		mimeType: 'image/jpeg',
		url: attr(doc, '#img-full', 'href')
	});

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://baruchfoundation.org/banka/banka_portrait-with-coiled-wire.jpg.php",
		"items": [
			{
				"itemType": "artwork",
				"title": "Portrait with Coiled Wire",
				"creators": [
					{
						"firstName": "Pavel",
						"lastName": "Baňka",
						"creatorType": "artist"
					}
				],
				"date": "1986",
				"archive": "Baruch Foundation",
				"artworkMedium": "Gelatin Silver Print, Toned Photograph",
				"artworkSize": "12 1/4 x 15 5/16 in.",
				"libraryCatalog": "Baruch Foundation",
				"url": "http://baruchfoundation.org/banka/banka_portrait-with-coiled-wire.jpg.php",
				"attachments": [
					{
						"title": "Image",
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
		"url": "http://baruchfoundation.org/j_feyfar/j_feyfar_untitled-stream-in-woods.jpg.php",
		"items": [
			{
				"itemType": "artwork",
				"title": "Untitled (Wooded Landscape with Stream)",
				"creators": [
					{
						"firstName": "Jaroslav",
						"lastName": "Feyfar",
						"creatorType": "artist"
					}
				],
				"abstractNote": "on blue mount",
				"archive": "Baruch Foundation",
				"artworkMedium": "Black And White Photograph, Gelatin Silver Print",
				"artworkSize": "4 3/4 x 3 1/2 in.",
				"libraryCatalog": "Baruch Foundation",
				"url": "http://baruchfoundation.org/j_feyfar/j_feyfar_untitled-stream-in-woods.jpg.php",
				"attachments": [
					{
						"title": "Image",
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
		"url": "http://baruchfoundation.org/balcar",
		"items": "multiple"
	}
]
/** END TEST CASES **/
