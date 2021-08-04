{
	"translatorID": "26d2a264-f25d-4898-b40c-e7c83fdbbc34",
	"label": "Deutsche Fotothek",
	"creator": "Abe Jellinek",
	"target": "https?://www\\.deutschefotothek\\.de/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-06-29 02:40:00"
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
	if (url.includes('/documents/obj/')) {
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
	var rows = doc.querySelectorAll('.listItem');
	for (let row of rows) {
		let href = attr(row, '.listItemThumbnail a', 'href');
		let title = ZU.trimInternal(text(row, '.description a'));
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
			if (items) {
				Object.keys(items).forEach(scrape);
			}
		});
	}
	else {
		// scrape() wants a link to an image page, not a metadata page, because
		// only image page URLs have the ID we need. so if we're on a metadata
		// page, we just grab the link to the image page.
		scrape(attr(doc, '.listItemThumbnail a', 'href') || url);
	}
}

function scrape(url) {
	let slug = url.match(/\/obj\/[^/?]+\/([^/?]+)/);
	if (slug) {
		let jsonURL = `https://iiif.arthistoricum.net/proxy/fotothek/${slug[1]}/manifest.json`;
		ZU.doGet(jsonURL, function (json) {
			scrapeManifest(json);
		});
	}
	else {
		throw new Error('Could not determine JSON URL');
	}
}

function scrapeManifest(manifestJSON) {
	let manifest = JSON.parse(manifestJSON);
	let item = new Zotero.Item('artwork');
	
	item.title = manifest.label;
	if (item.title.startsWith('Serie:') && item.title.split(';').length > 1) {
		item.title = item.title.split(';')[1];
	}
	
	item.abstractNote = manifest.description;
	if (item.abstractNote) {
		item.abstractNote = item.abstractNote.replace('Serie: Serie:', 'Serie:');
	}
	
	item.artworkMedium = 'Photograph';
	
	for (let { label, value } of manifest.metadata) {
		switch (label) {
			case 'Urheber':
				if (value.startsWith('n.a.')) {
					// no personal author
					item.creators.push({
						lastName: value.replace(/n\.a\.;?\s*/, ''),
						creatorType: 'artist',
						fieldMode: 1
					});
				}
				else {
					// is this worth it? i'm not sure. but the catalog has a lot
					// of misbracketed von-names
					value = value.replace(/(\w+),\s*(\w+)\s+(von|van|de|St\.)\s*$/, '$3 $1, $2');
					item.creators.push(ZU.cleanAuthor(value, 'artist', true));
				}
				break;
			case 'Datierung':
				item.date = ZU.strToISO(value);
				break;
			case 'Schlagwörter':
				item.tags = value.split(';').map(tag => ({ tag: tag.trim() }));
				break;
			case 'Physische Beschreibung':
				if (!item.abstractNote) {
					item.abstractNote = value;
				}
				break;
		}
	}
	
	if (manifest.sequences) {
		for (let sequence of manifest.sequences) {
			if (!sequence.canvases) continue;
			for (let canvas of sequence.canvases) {
				if (!canvas.images) continue;
				for (let image of canvas.images) {
					if (!image.resource) continue;
					item.attachments.push({
						title: 'Full-Size Scan',
						mimeType: image.resource.format.replace('images', 'image'),
						url: image.resource['@id']
					});
				}
			}
		}
	}
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.deutschefotothek.de/documents/obj/72059007",
		"items": [
			{
				"itemType": "artwork",
				"title": "Rittersporn (Delphinium). Teil eines am Stengel getrockneten Blattes",
				"creators": [
					{
						"firstName": "Karl",
						"lastName": "Blossfeldt",
						"creatorType": "artist"
					}
				],
				"date": "1895",
				"abstractNote": "Bild",
				"artworkMedium": "Photograph",
				"libraryCatalog": "Deutsche Fotothek",
				"attachments": [
					{
						"title": "Full-Size Scan",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					{
						"tag": "Archiv der Fotografen"
					},
					{
						"tag": "Botanik"
					},
					{
						"tag": "Hahnenfußgewächse"
					},
					{
						"tag": "Ornament"
					},
					{
						"tag": "Pflanze"
					},
					{
						"tag": "Pflanzenfotografie"
					},
					{
						"tag": "Rittersporn"
					},
					{
						"tag": "Studie"
					},
					{
						"tag": "plant photography"
					},
					{
						"tag": "vegetabil"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.deutschefotothek.de/documents/obj/89041423/tu_hks_0001408",
		"items": [
			{
				"itemType": "artwork",
				"title": "Malerische Reisebilder Dresden Blatt 2",
				"creators": [
					{
						"lastName": "Herm. Krone's photogr. Kunstverlag, Dresden",
						"creatorType": "artist",
						"fieldMode": 1
					}
				],
				"date": "1855",
				"abstractNote": "Serie: Historisches Lehrmuseum für Photographie (Lehrtafeln);Malerische Reisebilder Dresden Blatt 2;",
				"artworkMedium": "Photograph",
				"libraryCatalog": "Deutsche Fotothek",
				"attachments": [
					{
						"title": "Full-Size Scan",
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
		"url": "http://www.deutschefotothek.de/documents/obj/72025945",
		"items": [
			{
				"itemType": "artwork",
				"title": "Guanako (Lama guanicoe), auch Huanako im Zoologischen Garten Dresden. Weibliches Tier",
				"creators": [
					{
						"firstName": "Dietmar",
						"lastName": "Alex",
						"creatorType": "artist"
					}
				],
				"date": "1961",
				"abstractNote": "Dresden",
				"artworkMedium": "Photograph",
				"libraryCatalog": "Deutsche Fotothek",
				"attachments": [
					{
						"title": "Full-Size Scan",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					{
						"tag": "Guanako"
					},
					{
						"tag": "Paarhufer"
					},
					{
						"tag": "Säugetier"
					},
					{
						"tag": "Tier"
					},
					{
						"tag": "Tierfotografie"
					},
					{
						"tag": "Zoo"
					},
					{
						"tag": "Zoologie"
					},
					{
						"tag": "Zoologischer Garten"
					},
					{
						"tag": "Zootier"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.deutschefotothek.de/ete?action=queryGallery&index=fotografen&desc=%22Alvensleben,%20Christian%20von%22&sortby=docnum_desc",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.deutschefotothek.de/documents/obj/71610234/adf_cva_0000669",
		"items": [
			{
				"itemType": "artwork",
				"title": "Farol de Nazaré 15",
				"creators": [
					{
						"firstName": "Christian",
						"lastName": "von Alvensleben",
						"creatorType": "artist"
					}
				],
				"date": "2016",
				"abstractNote": "Serie: MACARÉU;Farol de Nazaré",
				"artworkMedium": "Photograph",
				"libraryCatalog": "Deutsche Fotothek",
				"attachments": [
					{
						"title": "Full-Size Scan",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					{
						"tag": "Archiv der Fotografen"
					},
					{
						"tag": "Portugal"
					},
					{
						"tag": "Seestück"
					},
					{
						"tag": "Wasser"
					},
					{
						"tag": "Welle"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
