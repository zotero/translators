{
	"translatorID": "9b1a3011-af6d-47d8-ac01-ec8c42d5ac58",
	"label": "Institute of Contemporary Art",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.icaboston\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-16 15:43:34"
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
	if (doc.querySelector('.field-item .page-title')) {
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
	var rows = doc.querySelectorAll('.teaser-title a[href*="/art/"]');
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
	
	item.title = text(doc, '.field-item .page-title');
	item.abstractNote = text(doc, '.field-name-body');
	item.artworkMedium = text(doc, '.field-name-field-materials');
	item.artworkSize = text(doc, '.field-name-field-dimensions');
	item.date = ZU.strToISO(text(doc, '.field-name-field-year'));
	
	for (let artist of doc.querySelectorAll('.field-name-field-artist .artist')) {
		item.creators.push(ZU.cleanAuthor(artist.textContent, 'artist'));
	}
	
	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});
	
	item.attachments.push({
		title: 'Thumbnail',
		mimeType: 'image/jpeg',
		url: attr(doc, '.field-name-scald-thumbnail img', 'src')
	});
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.icaboston.org/art/trevor-paglen/untitled-reaper-drone",
		"items": [
			{
				"itemType": "artwork",
				"title": "Untitled (Reaper Drone)",
				"creators": [
					{
						"firstName": "Trevor",
						"lastName": "Paglen",
						"creatorType": "artist"
					}
				],
				"date": "2012",
				"abstractNote": "Trevor Paglen’s artwork draws on his long-time interest in investigative journalism and the social sciences, as well as his training as a geographer. His work seeks to show the hidden aesthetics of American surveillance and military systems, touching on espionage, the digital circulation of images, government development of weaponry, and secretly funded military projects. The artist has conducted extensive research on the subject and published a series of books and lectures about covert operations undertaken by the CIA and the Pentagon.\n\nSince the 1990s, Paglen has photographed isolated military air bases located in Nevada and Utah using a telescopic camera lens. Untitled (Reaper Drone) reveals a miniature drone midflight against a luminous morning skyscape. The drone is nearly imperceptible, suggested only as a small black speck at the bottom of the image. The artist’s photographs are taken at such a distance that they abstract the scene and distort our capacity to make sense of the image. His work both exposes hidden secrets and challenges assumptions about what can be seen and fully understood.\n\nPaglen’s Untitled (Reaper Drone) enriches the ICA/Boston’s collection of photography and is in productive conversation with works by such artists as Jenny Holzer and Hito Steyerl, which similarly deal with political and economic systems, secrecy, and surveillance.\n\n800.13.05",
				"artworkMedium": "Chromogenic color print",
				"artworkSize": "49 x 61 inches (124.5 x 154.9 cm)",
				"libraryCatalog": "Institute of Contemporary Art",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Thumbnail",
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
		"url": "https://www.icaboston.org/art/stephen-hamilton/jahnae-wyatt-queen-poku",
		"items": [
			{
				"itemType": "artwork",
				"title": "Jahnae Wyatt as Queen Poku",
				"creators": [
					{
						"firstName": "Stephen",
						"lastName": "Hamilton",
						"creatorType": "artist"
					}
				],
				"date": "2018",
				"abstractNote": "The labor-intensive, process-oriented works of artist and educator Stephen Hamilton aim to address the persistent lack of positive, multidimensional representations of Black life in American culture. Hamilton makes connections between historical and contemporary cultures by incorporating both Black American and West African traditions, combining figurative painting and drawing with techniques such as resist dyeing, weaving, and woodcarving.\n\nGrowing out of the artist’s research and interest in developing a program on West African cultural continuities in the African diaspora, The Founders Project is a series of nine multimedia paintings that reimagine Boston public high school students as the storied founders of West and West-Central African ethnic groups. Each life-size work combines painting with weaving and sculptural traditions specific to the ethnic group whose story is depicted. In Jahnae Wyatt as Queen Poku, Jahnae Wyatt, one of Hamilton’s former students is portrayed as Poku, legendary queen of the Baule people of modern day Ivory Coast. According to legend, when her people were fleeing the violent expansionist wars of the Ashanti people, they came upon a river too deep and wide to cross. Queen Poku offered her infant son to the river spirit in exchange for her people’s safe passage. After this sacrifice, hippopotamuses emerged from the river’s depths and her people were able to walk across the animals’ backs to safety. Wyatt is portrayed as Queen Poku at the decisive moment just before her sacrifice, flanked on either side by hippos emerging from the river. Painted on hand-dyed cloth and framed on either side by hand-carved wooden sculptures (all recalling elements of Baule culture), Queen Poku’s dress is a hand-woven passage of fabric. Hamilton weaves together past and present, creating a bridge between the ancient and modern worlds.",
				"artworkMedium": "Acrylic, natural dyes, and pigments on hand-woven and hand-dyed cloth and wood",
				"artworkSize": "72 × 60 inches (182.9 × 152.4 cm)",
				"libraryCatalog": "Institute of Contemporary Art",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Thumbnail",
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
		"url": "https://www.icaboston.org/search?search_api_multi_fulltext=man&content_type%5B%5D=artwork",
		"items": "multiple"
	}
]
/** END TEST CASES **/
