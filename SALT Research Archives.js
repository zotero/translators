{
	"translatorID": "954ac3a8-73ab-43e3-88db-9949817ed1e6",
	"label": "SALT Research Archives",
	"creator": "Abe Jellinek",
	"target": "^https?://archives\\.saltresearch\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-13 22:05:16"
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
	if (doc.querySelector('.itemTitle')) {
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
	var rows = doc.querySelectorAll('td[headers="t2"] a[href*="/handle/"]');
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
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		// always use issued (created) date, not accession date
		item.date = attr(doc, 'meta[name="DCTERMS.issued"]', 'content');
		item.archive = 'SALT Research';
		
		for (let attachment of item.attachments) {
			// images are attached as PDFs
			if (attachment.url && attachment.url.endsWith('.jpg')) {
				attachment.mimeType = 'image/jpeg';
				attachment.title = 'Image';
			}
		}
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "artwork";
		trans.addCustomFields({
			'DC.format': 'artworkSize',
			'DC.identifier': 'archiveLocation'
		});
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://archives.saltresearch.org/handle/123456789/68422",
		"items": [
			{
				"itemType": "artwork",
				"title": "Peyzaj resimleri - Landscape drawings",
				"creators": [],
				"archive": "SALT Research",
				"archiveLocation": "TSOBOSK054",
				"artworkSize": "17,6-25,5 cm",
				"libraryCatalog": "archives.saltresearch.org",
				"rights": "Open Access",
				"url": "https://archives.saltresearch.org/handle/123456789/68422",
				"attachments": [
					{
						"title": "Image",
						"mimeType": "image/jpeg"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Çizim - Drawing"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://archives.saltresearch.org/handle/123456789/88363",
		"items": [
			{
				"itemType": "artwork",
				"title": "Ankara Saraçoğlu Mahallesinin suluboya resmi - Watercolor painting of Ankara Saraçoğlu settlement",
				"creators": [
					{
						"firstName": "Toğan",
						"lastName": "Düzgören",
						"creatorType": "author"
					}
				],
				"date": "1951-01-01",
				"archive": "SALT Research",
				"archiveLocation": "TSOBOSK089",
				"artworkSize": "39-29 cm",
				"language": "Almanca - German",
				"libraryCatalog": "archives.saltresearch.org",
				"rights": "Open Access",
				"url": "https://archives.saltresearch.org/handle/123456789/88363",
				"attachments": [
					{
						"title": "Image",
						"mimeType": "image/jpeg"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Resim - Painting"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://archives.saltresearch.org/simple-search?query=kadikoy",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://archives.saltresearch.org/handle/123456789/2298",
		"items": "multiple"
	}
]
/** END TEST CASES **/
