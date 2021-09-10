{
	"translatorID": "df9c409a-132e-4c9d-8c24-8e3eeee98bf0",
	"label": "Stanford University Press",
	"creator": "Abe Jellinek",
	"target": "^https://www\\.sup\\.org/(books|search)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-01 17:49:50"
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
	if (url.includes('/books/title/')) {
		return "book";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.search-result > a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(text(row, '.search-book-title-tight'));
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
	let id = url.match(/id=([0-9]+)/);
	if (!id) throw new Error('No ID in URL: ' + url);
	id = id[1];
	
	let risURL = `https://www.sup.org/books/cite/?id=${id}&ris=true`;
	
	ZU.doGet(risURL, function (respText) {
		var translator = Zotero.loadTranslator("import");
		// RIS
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(respText);
		translator.setHandler("itemDone", function (obj, item) {
			for (let subjectLink of doc.querySelectorAll('.subject-link a')) {
				let tag = subjectLink.innerText.replace(/\//g, '--');
				item.tags.push({ tag });
			}
			
			if (!item.creators.length) {
				Z.debug('No RIS authors; scraping from page');
				
				let type = 'author';
				let names = text(doc, '.book-author').split(/,| and /);
				for (let name of names) {
					name = ZU.trimInternal(name);
					
					if (name.startsWith('Edited by ')) {
						type = 'editor';
						name = name.substring('Edited by '.length);
					}
					else if (name.startsWith('Translated by ')) {
						type = 'translator';
						name = name.substring('Translated by '.length);
					}
					
					item.creators.push(ZU.cleanAuthor(name, type));
				}
			}
			
			item.ISBN = ZU.cleanISBN(text(doc, '.bibliographic-info'));
			item.abstractNote = text(doc, '#description .readable');
			item.url = '';
			
			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.sup.org/books/title/?id=23440",
		"items": [
			{
				"itemType": "book",
				"title": "A Place to Call Home: Immigrant Exclusion and Urban Belonging in New York, Paris, and Barcelona",
				"creators": [
					{
						"lastName": "Castañeda",
						"firstName": "Ernesto",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"ISBN": "9781503604780",
				"abstractNote": "As immigrants settle in new places, they are faced with endless uncertainties that prevent them from feeling that they belong. From language barriers, to differing social norms, to legal boundaries separating them from established residents, they are constantly navigating shifting and contradictory expectations both to assimilate to their new culture and to honor their native one. In A Place to Call Home, Ernesto Castañeda offers a uniquely comparative portrait of immigrant expectations and experiences. Drawing on fourteen years of ethnographic observation and hundreds of interviews with documented and undocumented immigrants and their children, Castañeda sets out to determine how different locations can aid or disrupt the process of immigrant integration. Focusing on New York City, Paris, and Barcelona—immigration hubs in their respective countries—he compares the experiences of both Latino and North African migrants, and finds that subjective understandings, local contexts, national and regional history, and religious institutions are all factors that profoundly impact the personal journey to belonging.",
				"libraryCatalog": "Stanford University Press",
				"numPages": "208",
				"place": "Stanford",
				"publisher": "Stanford University Press",
				"shortTitle": "A Place to Call Home",
				"attachments": [],
				"tags": [
					{
						"tag": "Anthropology -- Immigration and Migration Studies"
					},
					{
						"tag": "Sociology -- Global Issues, Economy, and Work"
					},
					{
						"tag": "Sociology -- Immigration"
					},
					{
						"tag": "Sociology -- Race, Class, and Gender"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.sup.org/books/title/?id=28033",
		"items": [
			{
				"itemType": "book",
				"title": "Unknown Past: Layla Murad, the Jewish-Muslim Star of Egypt",
				"creators": [
					{
						"firstName": "Hanan",
						"lastName": "Hammad",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"ISBN": "9781503629424",
				"abstractNote": "A biography of the \"Cinderella\" of Egyptian cinema—the veneration and rumors that surrounded an unparalleled career, and the gendered questions that unsettled Egyptian society.Layla Murad (1918-1995) was once the highest-paid star in Egypt, and her movies were among the top-grossing in the box office. She starred in 28 films, nearly all now classics in Arab musical cinema. In 1955 she was forced to stop acting—and struggled for decades for a comeback. Today, even decades after her death, public interest in her life continues, and new generations of Egyptians still love her work. Unknown Past recounts Murad's extraordinary life—and the rapid political and sociocultural changes she witnessed.Hanan Hammad writes a story centered on Layla Murad's persona and legacy, and broadly framed around a gendered history of 20th century Egypt. Murad was a Jew who converted to Islam in the shadow of the first Arab-Israeli war. Her career blossomed under the Egyptian monarchy and later gave a singing voice to the Free Officers and the 1952 Revolution. The definitive end of her cinematic career came under Nasser on the eve of the 1956 Suez War. Egyptians have long told their national story through interpretations of Murad's life, intertwining the individual and Egyptian state and society to better understand Egyptian identity. As Unknown Past recounts, there's no life better than Murad's to reflect the tumultuous changes experienced over the dramatic decades of the mid-twentieth century.",
				"libraryCatalog": "Stanford University Press",
				"numPages": "328",
				"place": "Stanford",
				"publisher": "Stanford University Press",
				"shortTitle": "Unknown Past",
				"attachments": [],
				"tags": [
					{
						"tag": "Cinema and Media Studies"
					},
					{
						"tag": "History -- Gender and Sexuality"
					},
					{
						"tag": "History -- Middle East"
					},
					{
						"tag": "Middle East Studies"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.sup.org/books/title/?id=32777",
		"items": [
			{
				"itemType": "book",
				"title": "Understanding Global Migration",
				"creators": [
					{
						"firstName": "James F.",
						"lastName": "Hollifield",
						"creatorType": "editor"
					},
					{
						"firstName": "Neil",
						"lastName": "Foley",
						"creatorType": "editor"
					}
				],
				"date": "2022",
				"ISBN": "9781503614772",
				"abstractNote": "Understanding Global Migration offers scholars a groundbreaking account of emerging migration states around the globe, especially in the Global South.Leading scholars of migration have collaborated to provide a birds-eye view of migration interdependence. Understanding Global Migration proposes a new typology of migration states, identifying multiple ideal types beyond the classical liberal type. Much of the world's migration has been to countries in Asia, Africa, the Middle East, and South America. The authors assembled here account for diverse histories of colonialism, development, and identity in shaping migration policy.This book provides a truly global look at the dilemmas of migration governance: Will migration be destabilizing, or will it lead to greater openness and human development? The answer depends on the capacity of states to manage migration, especially their willingness to respect the rights of the ever-growing portion of the world's population that is on the move.",
				"libraryCatalog": "Stanford University Press",
				"numPages": "624",
				"place": "Stanford",
				"publisher": "Stanford University Press",
				"attachments": [],
				"tags": [
					{
						"tag": "Politics -- Comparative and International Politics"
					},
					{
						"tag": "Politics -- International Relations"
					},
					{
						"tag": "Sociology -- Immigration"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.sup.org/books/title/?id=7811",
		"items": [
			{
				"itemType": "book",
				"title": "The Case of Wagner / Twilight of the Idols / The Antichrist / Ecce Homo / Dionysus Dithyrambs / Nietzsche Contra Wagner: Volume 9",
				"creators": [
					{
						"firstName": "Friedrich",
						"lastName": "Nietzsche",
						"creatorType": "author"
					},
					{
						"firstName": "Alan D.",
						"lastName": "Schrift",
						"creatorType": "editor"
					},
					{
						"firstName": "Adrian Del",
						"lastName": "Caro",
						"creatorType": "translator"
					},
					{
						"firstName": "Carol",
						"lastName": "Diethe",
						"creatorType": "translator"
					},
					{
						"firstName": "Duncan",
						"lastName": "Large",
						"creatorType": "translator"
					},
					{
						"firstName": "George H.",
						"lastName": "Leiner",
						"creatorType": "translator"
					},
					{
						"firstName": "Paul S.",
						"lastName": "Loeb",
						"creatorType": "translator"
					},
					{
						"firstName": "Alan D.",
						"lastName": "Schrift",
						"creatorType": "translator"
					},
					{
						"firstName": "David F.",
						"lastName": "Tinsley",
						"creatorType": "translator"
					},
					{
						"firstName": "Mirko",
						"lastName": "Wittwar",
						"creatorType": "translator"
					}
				],
				"date": "2021",
				"ISBN": "9780804728829",
				"abstractNote": "The year 1888 marked the last year of Friedrich Nietzsche's intellectual career and the culmination of his philosophical development. In that final productive year, he worked on six books, all of which are now, for the first time, presented in English in a single volume. Together these new translations provide a fundamental and complete introduction to Nietzsche's mature thought and to the virtuosity and versatility of his most fully developed style.The writings included here have a bold, sometimes radical tone that can be connected to Nietzsche's rising profile and growing confidence. In The Antichrist, we are offered an extended critique of Christianity and Christian morality alongside blunt diagnoses of contemporary Europe's cultural decadence. In Dionysus Dithyrambs we are presented with his only work composed exclusively of poetry, and in Twilight of the Idols we find a succinct summary of his mature philosophical views. At times the works are also openly personal, as in The Case of Wagner, which presents Nietzsche's attempt to settle accounts with his former close friend, German composer Richard Wagner, and in his provocative autobiography, Ecce Homo, which sees Nietzsche taking stock of his past and future while also reflecting on many of his earlier texts.Scrupulously edited, this critical volume also includes commentary by esteemed Nietzsche scholar Andreas Urs Sommer. Through this new collection, students and scholars are given an essential introduction to Nietzsche's late thought.",
				"libraryCatalog": "Stanford University Press",
				"numPages": "816",
				"place": "Stanford",
				"publisher": "Stanford University Press",
				"shortTitle": "The Case of Wagner / Twilight of the Idols / The Antichrist / Ecce Homo / Dionysus Dithyrambs / Nietzsche Contra Wagner",
				"attachments": [],
				"tags": [
					{
						"tag": "Philosophy -- Aesthetics"
					},
					{
						"tag": "Philosophy -- Ethics and Moral Philosophy"
					},
					{
						"tag": "Religion -- Philosophy of Religion"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.sup.org/search/?terms=derrida",
		"items": "multiple"
	}
]
/** END TEST CASES **/
