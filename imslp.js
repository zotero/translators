{
	"translatorID": "7e3baf81-3f1b-452b-8004-96adf668192b",
	"label": "imslp",
	"creator": "yohane",
	"target": "^https?://imslp\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-04-25 15:01:04"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 yohane

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
	if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	else if (url.includes('/wiki/')) {
		return 'book';
	}
	return false;
}

function getSearchResults(doc, url, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.categorypagelink[href]');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (var urls of Object.keys(items)) {
			await scrape(await requestDocument(urls));
		}
		//Z.debug(ZU.processDocuments(Object.keys(items)), scrape)
	}
	else {
		scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	var item = new Zotero.Item("book");
	var title = text(doc, '#firstHeading');
	
	//check metadata
	var rows = doc.querySelector('.wi_body table').rows;
	for (var i = 2; i < rows.length; i++) {
		//Z.debug(rows[i].cells[0].innerText);
		//Z.debug(rows[i].cells[1].innerText);
		/* waiting for a suitable field
		if (rows[i].cells[0].innerText.trim().includes("Name Translations")) {
			var names = rows[i].cells[1].innerText.trim();
		}*/
		if (rows[i].cells[0].innerText.trim() == "Composer") {
			var author = rows[i].cells[1].innerText.trim();
		}
		if (rows[i].cells[0].innerText.trim().includes("Opus/Catalogue Number")) {
			var seriesNumber = rows[i].cells[1].innerText.trim();
		}

		/* waiting for a suitable field
		if (rows[i].cells[0].innerText.trim() == "Key") {
			var key = rows[i].cells[1].innerText.trim();
		}*/
		if (rows[i].cells[0].innerText.trim() == "Text Incipit") {
			var incipit = rows[i].cells[1].innerHTML;
		}
		if (rows[i].cells[0].innerText.trim().includes("Movements/Sections")) {
			var movements = rows[i].cells[1].innerHTML;
		}
		if (rows[i].cells[0].innerText.trim().includes("Year/Date of Composition")) {
			var date = rows[i].cells[1].innerText.trim();
		}

		/* waiting for a suitable field
		if (rows[i].cells[0].innerText.trim().includes("First Performance")) {
			var place = rows[i].cells[1].innerText.trim();
		}
		if (rows[i].cells[0].innerText.trim().includes("First Publication")) {
			var publisher = rows[i].cells[1].innerText.trim();
		}*/
		if (rows[i].cells[0].innerText.trim() == "Language") {
			var language = rows[i].cells[1].innerText.trim();
		}
		if (rows[i].cells[0].innerText.trim().includes("Average Duration")) {
			var duration = rows[i].cells[1].innerText.trim();
		}
		if (rows[i].cells[0].innerText.trim() == "Piece Style") {
			var style = rows[i].cells[1].innerText.trim();
		}

		/* The metadata of instrumention is too mess.
		if (rows[i].cells[0].innerText.trim() == "Instrumentation") {
			var instrumentation = rows[i].cells[1].innerText.trim();
		}*/
		//Z.debug(instrumentation);
	}

	//push metadata
	item.title = title.replace(/\(.*\)/, "");
	item.url = url;
	item.libraryCatalog = "IMSLP";
	if (author) {
		item.creators.push(ZU.cleanAuthor(author, "author", true));
	}

	/* waiting for a suitable field
	if (names) {
		item.abstractNote = names.replace(/\[.*\]/, "");
	}*/
	if (movements) {
		var movementsNotes = movements;
		item.notes.push({ note: movementsNotes });
	}
	if (seriesNumber) {
		item.seriesNumber = seriesNumber;
	}

	/* waiting for a suitable field
	if (place) {
		item.place = "First Performance: " + place;
	}
	if (publisher) {
		item.publisher = publisher;
	}*/
	if (date) {
		item.date = date;
	}
	if (language) {
		item.language = language;
	}
	if (duration) {
		item.extra = "Type: musical_score\nDuration: " + duration;
	}
	else {
		item.extra = "Type: musical_score";
	}

	/* waiting for a suitable field
	if (key) {
		item.tags.push(key);
	}*/
	if (incipit) {
		var incipitNotes = "Text Incipit:" + incipit.replace(/<i(([\s\S])*?)<\/i>/, "");
		item.notes.push({ note: incipitNotes });
	}
	if (style) {
		item.tags.push(style);
	}

	/* see 122
	if (instrumentation) {
		var instrumentationNotes = "Instrumentation\n" + instrumentation;
		item.notes.push({ note: instrumentationNotes });
	}*/

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://imslp.org/wiki/Das_Lied_von_der_Erde_(Mahler%2C_Gustav)",
		"items": [
			{
				"itemType": "book",
				"title": "Das Lied von der Erde",
				"creators": [
					{
						"firstName": "Gustav",
						"lastName": "Mahler",
						"creatorType": "author"
					}
				],
				"date": "1908–09",
				"extra": "Type: musical_score",
				"language": "German",
				"libraryCatalog": "IMSLP",
				"url": "https://imslp.org/wiki/Das_Lied_von_der_Erde_(Mahler%2C_Gustav)",
				"attachments": [],
				"tags": [
					{
						"tag": "Romantic"
					}
				],
				"notes": [
					{
						"note": "6 movements:\n<ol><li>Das Trinklied vom Jammer der Erde\n</li><li>Der Einsame im Herbst\n</li><li>Von der Jugend\n</li><li>Von der Schönheit\n</li><li>Der Trunkene im Frühling\n</li><li>Der Abschied\n</li></ol>\n"
					},
					{
						"note": "Text Incipit:\n<ol><li> <span class=\"plainlinks\"><a rel=\"nofollow\" class=\"external text\" href=\"http://www.lieder.net/lieder/get_text.html?TextId=20677\">Schon winkt der Wein im goldnen Pokale</a></span>\n</li><li> <span class=\"plainlinks\"><a rel=\"nofollow\" class=\"external text\" href=\"http://www.lieder.net/lieder/get_text.html?TextId=20681\">Herbstnebel wallen bläulich überm See</a></span>\n</li><li> <span class=\"plainlinks\"><a rel=\"nofollow\" class=\"external text\" href=\"http://www.lieder.net/lieder/get_text.html?TextId=20673\">Mitten in dem kleinen Teiche</a></span>\n</li><li> <span class=\"plainlinks\"><a rel=\"nofollow\" class=\"external text\" href=\"http://www.lieder.net/lieder/get_text.html?TextId=20686\">Junge Mädchen pflücken Blumen</a></span>\n</li><li> <span class=\"plainlinks\"><a rel=\"nofollow\" class=\"external text\" href=\"http://www.lieder.net/lieder/get_text.html?TextId=20690\">Wenn nur ein Traum das Leben ist</a></span>\n</li><li> <span class=\"plainlinks\"><a rel=\"nofollow\" class=\"external text\" href=\"http://www.lieder.net/lieder/get_text.html?TextId=20696\">Die Sonne scheidet hinter dem Gebirge</a></span>\n</li></ol>\n"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://imslp.org/wiki/Category:Mahler,_Gustav",
		"items": "multiple"
	}
]
/** END TEST CASES **/
