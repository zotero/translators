{
	"translatorID": "00d5236c-ce1f-484b-9552-da8e2f10eee4",
	"label": "Library Hub Discover",
	"creator": "Vincent Carret",
	"target": "^https?://(www\\.)?discover\\.libraryhub\\.jisc\\.ac\\.uk/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-14 15:57:12"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019-2021 Vincent Carret
	
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


var typeMapping = {
	book: "book",
	visual: "artwork",
	map: "map",
	audio: "audioRecording",
	periodical: "document",
	"mixed-material": "document",
	"music-score": "document"
};

function detectWeb(doc, _url) {
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	else {
		var itemType = text(doc, 'div.record-details__type');
		return typeMapping[itemType];
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll("div[prefix='schema: http://schema.org/ dct:http://purl.org/dc/terms/']");
	if (checkOnly && rows.length > 1) return true;
	else if (checkOnly && rows.length <= 1) return false;
	for (let row of rows) {
		let href = "/search?id=" + row.getAttribute('resource').split('/')[4] + "&format=mods";
		let title = ZU.trimInternal(text(row, 'div.record-details__title a'));
		if (title.endsWith(" /")) title = title.slice(0, -2);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) {
				for (let href of Object.keys(items)) scrape(href);
			}
		});
	}
	else {
		var row = doc.querySelector("div[prefix='schema: http://schema.org/ dct:http://purl.org/dc/terms/']");
		let href = "/search?id=" + row.getAttribute('resource').split('/')[4] + "&format=mods";
		scrape(href);
	}
}

function scrape(url) {
	ZU.doGet(url, function (text) {
		var translator = Zotero.loadTranslator('import');
		// MODS
		translator.setTranslator('0e2235e7-babf-413c-9acf-f27cce5f059c');
		translator.setString(text);
		
		translator.setHandler('itemDone', function (_, item) {
			if (item.itemType == 'document' && (item.ISBN || item.edition)) {
				item.itemType = 'book';
			}
			
			delete item.archiveLocation; // list of libraries it's available in
			
			if (item.title) {
				item.title = item.title.replace(/\.$/, '');
			}
			
			if (item.edition) {
				item.edition = item.edition.replace(/\.$/, '');
			}
			
			if (item.publisher) {
				item.publisher = item.publisher.replace(/\.$/, '');
			}
			
			item.complete();
		});
		
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://discover.libraryhub.jisc.ac.uk/search?q=test",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://discover.libraryhub.jisc.ac.uk/search?q=test%20sound&rn=1",
		"items": [
			{
				"itemType": "document",
				"title": "Application study of ultrasonic nondestructive inspection for tire compliance testing. Final report",
				"creators": [
					{
						"firstName": "Richard N.",
						"lastName": "Pierce",
						"creatorType": "author"
					}
				],
				"date": "1971",
				"libraryCatalog": "Library Hub Discover",
				"url": "http://hdl.handle.net/2027/mdp.39015071778685",
				"attachments": [],
				"tags": [
					{
						"tag": "Compliance."
					},
					{
						"tag": "Defect/ Defective."
					},
					{
						"tag": "Defects."
					},
					{
						"tag": "Testing equipment."
					},
					{
						"tag": "Tire Test Equipment."
					},
					{
						"tag": "Tires."
					},
					{
						"tag": "Ultrasonic Sound/ Supersonic Sound."
					},
					{
						"tag": "Ultrasonic waves."
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://discover.libraryhub.jisc.ac.uk/id/73805859",
		"items": [
			{
				"itemType": "map",
				"title": "The Americas [and] Bird migration in the Americas: produced by the Cartographic Division, National Geographic Society",
				"creators": [
					{
						"lastName": "National Geographic Society (U.S.)",
						"fieldMode": 1,
						"creatorType": "cartographer"
					}
				],
				"date": "1979",
				"callNumber": "912.7, 912.8",
				"language": "eng",
				"libraryCatalog": "Library Hub Discover",
				"place": "Washington, D.C.",
				"publisher": "National Geographic Society",
				"scale": "1:20,000",
				"shortTitle": "The Americas [and] Bird migration in the Americas",
				"attachments": [],
				"tags": [
					{
						"tag": "Birds migration"
					},
					{
						"tag": "Birds migration"
					},
					{
						"tag": "Birds migration"
					}
				],
				"notes": [
					{
						"note": "general: Relief shown by shading. Elevations, depth curves and soundings in meters."
					},
					{
						"note": "general: Political map of the Western Hemisphere backed with pictorial map entitled \"Bird migration in the Americas\"."
					},
					{
						"note": "general: Includes inset map: Physical map of the Americas."
					},
					{
						"note": "general: Issued as Supplement to the National Geographic, August 1979, page 154A, vol. 156, no. 2 – Bird migration."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://discover.libraryhub.jisc.ac.uk/id/64412752",
		"items": [
			{
				"itemType": "document",
				"title": "Which hi-fi",
				"creators": [],
				"date": "1983",
				"callNumber": "TK7881.7, 621.389/3, 621.389/3, RW 51",
				"language": "eng",
				"libraryCatalog": "Library Hub Discover",
				"publisher": "Haymarket Pub",
				"attachments": [],
				"tags": [
					{
						"tag": "High-fidelity sound recording & reproduction equipment"
					},
					{
						"tag": "High-fidelity sound systems"
					},
					{
						"tag": "Periodicals."
					},
					{
						"tag": "Serials"
					}
				],
				"notes": [
					{
						"note": "date/sequential designation: 84."
					},
					{
						"note": "numbering: Only one issue published."
					},
					{
						"note": "linking entry complexity: Continues: Hi-fi annual and test."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://discover.libraryhub.jisc.ac.uk/id/9603828",
		"items": [
			{
				"itemType": "book",
				"title": "A clockwork orange",
				"creators": [
					{
						"firstName": "Anthony",
						"lastName": "Burgess",
						"creatorType": "author"
					},
					{
						"firstName": "Andrew",
						"lastName": "Biswell",
						"creatorType": "editor"
					}
				],
				"date": "2013",
				"ISBN": "9789780141196 9780141970684 9780141197531",
				"abstractNote": "In this nightmare vision of youth in revolt, 15 year-old Alex and his friends set out on a diabolical orgy of robbery, rape, torture and murder. Alex is jailed for his teenage delinquency and the State tries to reform him - but at what cost? ; Fully restored edition of Anthony Burgess' original text of A Clockwork Orange, with a glossary of the teen slang 'Nadsat', explanatory notes, pages from the original typescript, interviews, articles and reviews Edited by Andrew Biswell With a Foreword by Martin Amis 'It is a horrorshow story ...' Fifteen-year-old Alex likes lashings of ultraviolence. He and his gang of friends rob, kill and rape their way through a nightmarish future, until the State puts a stop to his riotous excesses. But what will his re-education mean? A dystopian horror, a black comedy, an exploration of choice, A Clockwork Orange is also a work of exuberant invention which created a new language for its characters. This critical edition restores the text of the novel as Anthony Burgess originally wrote it, and includes a glossary of the teen slang 'Nadsat', explanatory notes, pages from the original typescript, interviews, articles and reviews, shedding light on the enduring fascination of the novel's 'sweet and juicy criminality'. Anthony Burgess was born in Manchester in 1917 and educated at Xaverian College and Manchester University. He spent six years in the British Army before becoming a schoolmaster and colonial education officer in Malaya and Brunei. After the success of his Malayan Trilogy, he became a full-time writer in 1959. His books have been published all over the world, and they include The Complete Enderby, Nothing Like the Sun, Napoleon Symphony, Tremor of Intent, Earthly Powers and A Dead Man in Deptford. Anthony Burgess died in London in 1993. Andrew Biswell is the Professor of Modern Literature at Manchester Metropolitan University and the Director of the International Anthony Burgess Foundation. His publications include a biography, The Real Life of Anthony Burgess, which won the Portico Prize in 2006. He is currently editing the letters and short stories of Anthony Burgess.",
				"callNumber": "PR6052.U638, 823.914",
				"edition": "Restored edition",
				"language": "eng",
				"libraryCatalog": "Library Hub Discover",
				"place": "London",
				"publisher": "Penguin Books",
				"url": "http://whel-primo.hosted.exlibrisgroup.com/openurl/44WHELF_NLW/44WHELF_NLW_services_page?u.ignore_date_coverage=true&rft.mms_id=99929011902419",
				"attachments": [],
				"tags": [
					{
						"tag": "1900-1999"
					},
					{
						"tag": "Criminals"
					},
					{
						"tag": "Fiction"
					},
					{
						"tag": "Juvenile delinquency"
					},
					{
						"tag": "Juvenile delinquency"
					},
					{
						"tag": "Juvenile delinquency."
					},
					{
						"tag": "Literature, Experimental"
					},
					{
						"tag": "Satire, English"
					},
					{
						"tag": "Satire, English."
					},
					{
						"tag": "Teenage boys"
					}
				],
				"notes": [
					{
						"note": "statement of responsibility: Anthony Burgess."
					},
					{
						"note": "bibliography: Includes bibliographical references."
					},
					{
						"note": "additional physical form: Also available in printed form ISBN 9780141197531"
					},
					{
						"note": "reproduction: Electronic reproduction. Askews and Holts. Mode of access: World Wide Web."
					},
					{
						"note": "Table of Contents: About the author -- Foreword by Martin Amis -- Introduction by Andrew Biswell -- A clockwork orange -- Notes -- Nadsat glossary -- Prologue to A clockwork orange: a play with music Anthony Burgess, 1986 -- Epilogue: 'a malenky govoreet about the molodoy' Anthony Burgess, 1987 -- Essays, articles and reviews -- Annotated pages from Anthony Burgess's 1961 typescript of A clockwork orange."
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
