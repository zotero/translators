{
	"translatorID": "72dbad15-cd1a-4d52-b2ed-7d67f909cada",
	"label": "The Met",
	"creator": "Aurimas Vinckevicius, Philipp Zumstein and contributors",
	"target": "^https?://(?:www\\.)?metmuseum\\.org/art/collection",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-07-21 18:22:01"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017-2024 Philipp Zumstein and contributors
	
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

// eslint-disable-next-line no-unused-vars
function detectWeb(doc, url) {
	if (doc.querySelector('.artwork-details')) {
		return 'artwork';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll('[class*="collection-object_caption"] a');
	for (let row of rows) {
		var href = row.href;
		var title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}


// eslint-disable-next-line no-unused-vars
async function scrape(doc, url = doc.location.href) {
	let item = new Zotero.Item('artwork');
	item.title = text(doc, '.artwork__title--text');
	
	let meta = doc.querySelectorAll('.artwork-tombstone--item');
	for (let elem of meta) {
		let heading = text(elem, '.artwork-tombstone--label');
		heading = heading.toLowerCase().substr(0, heading.length - 1);
		let content = text(elem, '.artwork-tombstone--value');
		// Z.debug(heading + content);

		switch (heading) {
			case 'date':
			case 'medium':
				item[heading] = content;
				break;
			case 'dimensions':
				item.artworkSize = content;
				break;
			case 'accession number':
				item.callNumber = content;
				break;
			case 'classification':
			case 'period':
			case 'culture':
				item.tags.push(content);
				break;
			case 'artist': {
				let cleaned = content.replace(/\(.*\)$/, '').trim();
				if (cleaned.split(' ').length > 2) {
					item.creators.push({ lastName: content, creatorType: 'artist', fieldMode: 1 });
				}
				else {
					item.creators.push(ZU.cleanAuthor(cleaned, "artist"));
				}
				break;
			}
		}
	}

	item.abstractNote = text(doc, '.artwork__intro__desc');
	item.libraryCatalog = 'The Metropolitan Museum of Art';
	item.url = attr(doc, 'link[rel="canonical"]', 'href');

	// Non-open-access items still have the (invisible) download button with seemingly valid, but 404-ing, URL.
	// Filter those out via the "not-openaccess" class set on the <section/> containing the button.
	let download = attr(doc, 'section:not(.artwork--not-openaccess) .artwork__interaction--download a', 'href');
	if (download) {
		item.attachments.push({
			title: 'Met Image',
			url: download
		});
	}
	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.metmuseum.org/art/collection/search/328877?rpp=30&pg=1&rndkey=20140708&ft=*&who=Babylonian&pos=4",
		"items": [
			{
				"itemType": "artwork",
				"title": "Cuneiform tablet case impressed with four cylinder seals, for cuneiform tablet 86.11.214a: field rental",
				"creators": [],
				"date": "ca. 1749–1712 BCE",
				"artworkMedium": "Clay",
				"artworkSize": "2.1 x 4.4 x 2.9 cm (7/8 x 1 3/4 x 1 1/8 in.)",
				"callNumber": "86.11.214b",
				"libraryCatalog": "The Metropolitan Museum of Art",
				"shortTitle": "Cuneiform tablet case impressed with four cylinder seals, for cuneiform tablet 86.11.214a",
				"url": "https://www.metmuseum.org/art/collection/search/328877",
				"attachments": [
					{
						"title": "Met Image"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Babylonian"
					},
					{
						"tag": "Old Babylonian"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.metmuseum.org/art/collection/search/328877",
		"items": [
			{
				"itemType": "artwork",
				"title": "Cuneiform tablet case impressed with four cylinder seals, for cuneiform tablet 86.11.214a: field rental",
				"creators": [],
				"date": "ca. 1749–1712 BCE",
				"artworkMedium": "Clay",
				"artworkSize": "2.1 x 4.4 x 2.9 cm (7/8 x 1 3/4 x 1 1/8 in.)",
				"callNumber": "86.11.214b",
				"libraryCatalog": "The Metropolitan Museum of Art",
				"shortTitle": "Cuneiform tablet case impressed with four cylinder seals, for cuneiform tablet 86.11.214a",
				"url": "https://www.metmuseum.org/art/collection/search/328877",
				"attachments": [
					{
						"title": "Met Image"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Babylonian"
					},
					{
						"tag": "Old Babylonian"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.metmuseum.org/art/collection/search/436243?rpp=30&pg=1&ft=albrecht+d%c3%bcrer&pos=1",
		"items": [
			{
				"itemType": "artwork",
				"title": "Salvator Mundi",
				"creators": [
					{
						"firstName": "Albrecht",
						"lastName": "Dürer",
						"creatorType": "artist"
					}
				],
				"date": "ca. 1505",
				"abstractNote": "This picture of Christ as Savior of the World, who raises his right hand in blessing and in his left holds an orb representing the Earth, can be appreciated both as a painting and a drawing. Dürer, the premier artist of the German Renaissance, probably began this work shortly before he departed for Italy in 1505 but completed only the drapery. His unusually extensive and meticulous preparatory drawing on the panel is visible in the unfinished portions of Christ’s face and hands.",
				"artworkMedium": "Oil on linden",
				"artworkSize": "22 7/8 x 18 1/2in. (58.1 x 47cm)",
				"callNumber": "32.100.64",
				"libraryCatalog": "The Metropolitan Museum of Art",
				"url": "https://www.metmuseum.org/art/collection/search/436243",
				"attachments": [
					{
						"title": "Met Image"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Paintings"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.metmuseum.org/art/collection/search/371722",
		"items": [
			{
				"itemType": "artwork",
				"title": "Rotoreliefs (Optical Discs)",
				"creators": [
					{
						"firstName": "Marcel",
						"lastName": "Duchamp",
						"creatorType": "artist"
					}
				],
				"date": "1935/1953",
				"artworkMedium": "Offset lithograph",
				"artworkSize": "Each:  7 7/8 inches (20 cm) diameter",
				"callNumber": "1972.597.1–.6",
				"libraryCatalog": "The Metropolitan Museum of Art",
				"url": "https://www.metmuseum.org/art/collection/search/371722",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Prints"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.metmuseum.org/art/collection/search?q=albrecht%20d%C3%BCrer",
		"items": "multiple"
	}
]
/** END TEST CASES **/
