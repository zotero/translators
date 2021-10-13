{
	"translatorID": "9ace2311-a958-471d-a8c7-61c647c6d9ae",
	"label": "Library Catalog (Pika)",
	"creator": "Abe Jellinek",
	"target": "/Record/\\.[a-z]|/GroupedWork/[a-z0-9-]+|/Union/Search\\?",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 250,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-17 23:44:24"
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
	if (doc.querySelector('#record-details-column')
		&& doc.querySelector('#formattedMarcRecord')) {
		let type = text(doc, 'h2 small').toLowerCase();
		if (type.includes('dvd')) {
			return 'film';
		}
		else if (type.includes('audio')) {
			return 'audioRecording';
		}
		else {
			return 'book';
		}
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.related-manifestation tr'); // grouped works
	for (let row of rows) {
		let href = attr(row, 'a[href*="/Record/"]', 'href');
		
		let bookTitle = text(row.closest('.result') || doc.body, '.result-title');
		let format = text(row.closest('.related-manifestation'),
			'.manifestation-format a')
			.replace(/[+-]/, '').trim();
		let year = text(row, 'td', 0).replace(/[.,;:[\]]/g, '');
		let formatAndYear = [format, year].filter(x => x).join(', ');
		
		let title = bookTitle
			? ZU.trimInternal(`${bookTitle} (${formatAndYear})`)
			: ZU.trimInternal(formatAndYear);
		
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
	var lines = doc.querySelectorAll('#formattedMarcRecord table tbody tr');
	
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("a6ee60df-1ddc-4aae-bb25-45e0537be973"); // MARC
	translator.getTranslatorObject(function (marc) {
		var record = new marc.record();
		var item = new Zotero.Item();
		record.leader = text(lines[0], 'td');
		for (let line of Array.from(lines).slice(2)) {
			let fieldTag = text(line, 'th');
			let indicators = text(line, 'th', 0) + text(line, 'th', 1);
			let fieldContent = text(line, 'td').replace(/\|/g, marc.subfieldDelimiter);

			record.addField(fieldTag, indicators, fieldContent);
		}
		
		record.translate(item);
		
		item.libraryCatalog = attr(doc, 'meta[property="og:site_name"]', 'content')
			|| attr(doc, '#header-logo', 'alt')
			|| 'Library Catalog (Pika)';
		
		item.complete();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://cmc.marmot.org/Record/.b11174316",
		"items": [
			{
				"itemType": "book",
				"title": "The Pentagon papers as published by the New York times",
				"creators": [
					{
						"firstName": "Neil",
						"lastName": "Sheehan",
						"creatorType": "editor"
					}
				],
				"date": "1971",
				"callNumber": "E183.8.V5  P4 1971",
				"libraryCatalog": "Colorado Mountain College",
				"numPages": "810",
				"place": "New York",
				"publisher": "Quadrangle Books",
				"attachments": [],
				"tags": [
					{
						"tag": "Foreign relations"
					},
					{
						"tag": "Foreign relations"
					},
					{
						"tag": "Juvenile literature"
					},
					{
						"tag": "Literature"
					},
					{
						"tag": "Politics and government"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "Vietnam"
					},
					{
						"tag": "Vietnam"
					},
					{
						"tag": "Vietnam"
					},
					{
						"tag": "Vietnam War, 1961-1975"
					},
					{
						"tag": "Vietnam War, 1961-1975"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://aimslibrary.marmot.org/Record/.b64203992",
		"items": [
			{
				"itemType": "film",
				"title": "Test pattern",
				"creators": [
					{
						"firstName": "Shatara Michelle",
						"lastName": "Ford",
						"creatorType": "author"
					},
					{
						"firstName": "Brittany S.",
						"lastName": "Hall",
						"creatorType": "author"
					},
					{
						"firstName": "Will",
						"lastName": "Brill",
						"creatorType": "author"
					},
					{
						"firstName": "Gail",
						"lastName": "Bean",
						"creatorType": "author"
					},
					{
						"firstName": "Drew",
						"lastName": "Fuller",
						"creatorType": "author"
					},
					{
						"lastName": "Kino Lorber, Inc",
						"creatorType": "contributor",
						"fieldMode": true
					}
				],
				"date": "2021",
				"abstractNote": "The movie follows an interracial couple whose relationship is put to the test after a Black woman is sexually assaulted and her white boyfriend drives her from hospital to hospital in search of a rape kit. Their story reveals the systemic injustices and social conditioning women face when navigating sex and consent within the American patriarchy. Winner of top prizes at the BlackStar and New Orleans Film Festivals, this gripping social thriller offers a unique exploration of institutional racism and sexism from a Black female point of view",
				"callNumber": "PN1997.2  .T47 2021",
				"distributor": "Kino Lorber",
				"language": "eng",
				"libraryCatalog": "Aims Community College",
				"attachments": [],
				"tags": [
					{
						"tag": "Drama"
					},
					{
						"tag": "Drama"
					},
					{
						"tag": "Drama"
					},
					{
						"tag": "Drama"
					},
					{
						"tag": "Drama"
					},
					{
						"tag": "Feature films"
					},
					{
						"tag": "Feature films"
					},
					{
						"tag": "Interracial couples"
					},
					{
						"tag": "Interracial couples"
					},
					{
						"tag": "Justice"
					},
					{
						"tag": "Justice"
					},
					{
						"tag": "Rape"
					},
					{
						"tag": "Rape"
					},
					{
						"tag": "Social problem films"
					},
					{
						"tag": "Video recordings"
					}
				],
				"notes": [
					{
						"note": "Title from sell sheet Originally released as a motion picture in 2020 Wide screen Special features: Audio commentary by Shatara Michelle Ford; Shatara Michelle Ford in conversation with James Gray"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://catalog.lionlibraries.org/Record/.b26815862",
		"items": [
			{
				"itemType": "book",
				"title": "The dating playbook",
				"creators": [
					{
						"firstName": "Farrah",
						"lastName": "Rochon",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"ISBN": "9781538716670",
				"callNumber": "813.6",
				"libraryCatalog": "Libraries Online Inc.",
				"numPages": "367",
				"publisher": "Forever",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://aimslibrary.marmot.org/GroupedWork/76eafa1e-d054-9db7-7a1e-3ee083de25b5/Home",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://aimslibrary.marmot.org/GroupedWork/d1abd191-3f9f-0921-2894-4d6e7c352e45/Home",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://flc.flatironslibrary.org/Record/.b29911680",
		"items": [
			{
				"itemType": "book",
				"title": "Darling",
				"creators": [
					{
						"firstName": "K.",
						"lastName": "Ancrum",
						"creatorType": "author"
					},
					{
						"firstName": "J. M.",
						"lastName": "Barrie",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"ISBN": "9781250265265",
				"abstractNote": "On Wendy Darling's first night in Chicago, a boy called Peter appears at her window. He's dizzying, captivating, beautiful-- and she agrees to join him for a night on the town. They're soon running in the city's underground. She makes friends: a punk girl named Tinkerbelle and the lost boys Peter watches over. And she makes enemies: the terrifying Detective Hook, and maybe Peter himself, as his sinister secrets start coming to light. Will Wendy survive this night-- and make sure everyone else does, too?",
				"callNumber": "PZ",
				"edition": "First edition",
				"libraryCatalog": "Flatirons Library Consortium",
				"numPages": "282",
				"place": "New York",
				"publisher": "Imprint",
				"attachments": [],
				"tags": [
					{
						"tag": "Adaptations"
					},
					{
						"tag": "Adventure and adventurers"
					},
					{
						"tag": "Adventure stories"
					},
					{
						"tag": "Chicago (Ill.)"
					},
					{
						"tag": "Darling, Wendy"
					},
					{
						"tag": "Fiction"
					},
					{
						"tag": "Fiction"
					},
					{
						"tag": "Fiction"
					},
					{
						"tag": "Fiction"
					},
					{
						"tag": "Fiction"
					},
					{
						"tag": "Love stories"
					},
					{
						"tag": "Nightlife"
					},
					{
						"tag": "Peter Pan"
					},
					{
						"tag": "Young adult fiction"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bemis.marmot.org/Record/.b33973477",
		"items": [
			{
				"itemType": "book",
				"title": "First test",
				"creators": [
					{
						"firstName": "Tamora",
						"lastName": "Pierce",
						"creatorType": "author"
					},
					{
						"firstName": "Tamora",
						"lastName": "Pierce",
						"creatorType": "author"
					}
				],
				"date": "1999",
				"ISBN": "9780679889144 9780679989141 9780679889175 9780756904869 9780375829055 9781435233638 9781415553169",
				"abstractNote": "Ten-year-old Keladry of Mindalen, daughter of nobles, serves as a page but must prove herself to the males around her if she is ever to fulfill her dream of becoming a knight. When Alanna became the King's Champion, it was decided that girls would henceforth be allowed to train for the knighthood. But ten years have passed, and no girls have come forward. Now, however, someone is about to change all that. Her name is Kel. In this first book in a new series from popular children's fantasy writer Tamora Pierce, we are introduced to a strong, adventurous new heroine who will win the hearts and minds of fantasy fans",
				"callNumber": "PZ7.P61464  Fi 1999",
				"libraryCatalog": "Bemis Public Library",
				"numPages": "216",
				"place": "New York",
				"publisher": "Random House",
				"series": "Protector of the small",
				"attachments": [],
				"tags": [
					{
						"tag": "Fantasy"
					},
					{
						"tag": "Fantasy fiction"
					},
					{
						"tag": "Fantasy fiction"
					},
					{
						"tag": "Fantasy fiction"
					},
					{
						"tag": "Fiction"
					},
					{
						"tag": "Fiction"
					},
					{
						"tag": "Knights and knighthood"
					},
					{
						"tag": "Knights and knighthood"
					},
					{
						"tag": "Sex role"
					},
					{
						"tag": "Sex role"
					},
					{
						"tag": "Young adult"
					}
				],
				"notes": [
					{
						"note": "Sequel: Page"
					},
					{
						"note": "Decisions --  Not So Welcome --  Practice Courts --  Classrooms --  Kel Backs Away --  Lance --  Kel Takes a Stand --  Winter --  Tests --  Royal Forest --  Spidren Hunt --  Cast of Characters"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bemis.marmot.org/Union/Search?basicType=&genealogyType=&view=list&lookfor=test&basicType=Keyword&searchSource=local",
		"items": "multiple"
	}
]
/** END TEST CASES **/
