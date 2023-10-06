{
	"translatorID": "d4e227c0-cebb-425a-ac8d-a6625c4bfdd2",
	"label": "ASTIS",
	"creator": "Abe Jellinek",
	"target": "^https?://(www\\.)?aina\\.ucalgary\\.ca/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-04 19:44:55"
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
	if (doc.querySelector('a[href*="doi."]')) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a[href*="?RECORD"]');
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
	let DOI = ZU.cleanDOI(attr(doc, 'a[href*="doi."]', 'href'));

	let search = Zotero.loadTranslator('search');
	
	search.setHandler('translators', function (_, translators) {
		search.setTranslator(translators);
		search.setHandler('itemDone', function (_, item) {
			item.complete();
		});
		search.translate();
	});
	
	search.setSearch({ DOI });
	search.getTranslators();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.aina.ucalgary.ca/scripts/mwimain.dll/415/4/1?RECLIST&DATABASE=ASTIS&TM=1628105772.604",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.aina.ucalgary.ca/scripts/mwimain.dll/415/4/4/85845?RECORD&DATABASE=ASTIS",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Parasitoids indicate major climate‐induced shifts in arctic communities",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Tuomas",
						"lastName": "Kankaanpää"
					},
					{
						"creatorType": "author",
						"firstName": "Eero",
						"lastName": "Vesterinen"
					},
					{
						"creatorType": "author",
						"firstName": "Bess",
						"lastName": "Hardwick"
					},
					{
						"creatorType": "author",
						"firstName": "Niels M.",
						"lastName": "Schmidt"
					},
					{
						"creatorType": "author",
						"firstName": "Tommi",
						"lastName": "Andersson"
					},
					{
						"creatorType": "author",
						"firstName": "Paul E.",
						"lastName": "Aspholm"
					},
					{
						"creatorType": "author",
						"firstName": "Isabel C.",
						"lastName": "Barrio"
					},
					{
						"creatorType": "author",
						"firstName": "Niklas",
						"lastName": "Beckers"
					},
					{
						"creatorType": "author",
						"firstName": "Joël",
						"lastName": "Bêty"
					},
					{
						"creatorType": "author",
						"firstName": "Tone",
						"lastName": "Birkemoe"
					},
					{
						"creatorType": "author",
						"firstName": "Melissa",
						"lastName": "DeSiervo"
					},
					{
						"creatorType": "author",
						"firstName": "Katherine H. I.",
						"lastName": "Drotos"
					},
					{
						"creatorType": "author",
						"firstName": "Dorothee",
						"lastName": "Ehrich"
					},
					{
						"creatorType": "author",
						"firstName": "Olivier",
						"lastName": "Gilg"
					},
					{
						"creatorType": "author",
						"firstName": "Vladimir",
						"lastName": "Gilg"
					},
					{
						"creatorType": "author",
						"firstName": "Nils",
						"lastName": "Hein"
					},
					{
						"creatorType": "author",
						"firstName": "Toke T.",
						"lastName": "Høye"
					},
					{
						"creatorType": "author",
						"firstName": "Kristian M.",
						"lastName": "Jakobsen"
					},
					{
						"creatorType": "author",
						"firstName": "Camille",
						"lastName": "Jodouin"
					},
					{
						"creatorType": "author",
						"firstName": "Jesse",
						"lastName": "Jorna"
					},
					{
						"creatorType": "author",
						"firstName": "Mikhail V.",
						"lastName": "Kozlov"
					},
					{
						"creatorType": "author",
						"firstName": "Jean‐Claude",
						"lastName": "Kresse"
					},
					{
						"creatorType": "author",
						"firstName": "Don‐Jean",
						"lastName": "Leandri‐Breton"
					},
					{
						"creatorType": "author",
						"firstName": "Nicolas",
						"lastName": "Lecomte"
					},
					{
						"creatorType": "author",
						"firstName": "Maarten",
						"lastName": "Loonen"
					},
					{
						"creatorType": "author",
						"firstName": "Philipp",
						"lastName": "Marr"
					},
					{
						"creatorType": "author",
						"firstName": "Spencer K.",
						"lastName": "Monckton"
					},
					{
						"creatorType": "author",
						"firstName": "Maia",
						"lastName": "Olsen"
					},
					{
						"creatorType": "author",
						"firstName": "Josée‐Anne",
						"lastName": "Otis"
					},
					{
						"creatorType": "author",
						"firstName": "Michelle",
						"lastName": "Pyle"
					},
					{
						"creatorType": "author",
						"firstName": "Ruben E.",
						"lastName": "Roos"
					},
					{
						"creatorType": "author",
						"firstName": "Katrine",
						"lastName": "Raundrup"
					},
					{
						"creatorType": "author",
						"firstName": "Daria",
						"lastName": "Rozhkova"
					},
					{
						"creatorType": "author",
						"firstName": "Brigitte",
						"lastName": "Sabard"
					},
					{
						"creatorType": "author",
						"firstName": "Aleksandr",
						"lastName": "Sokolov"
					},
					{
						"creatorType": "author",
						"firstName": "Natalia",
						"lastName": "Sokolova"
					},
					{
						"creatorType": "author",
						"firstName": "Anna M.",
						"lastName": "Solecki"
					},
					{
						"creatorType": "author",
						"firstName": "Christine",
						"lastName": "Urbanowicz"
					},
					{
						"creatorType": "author",
						"firstName": "Catherine",
						"lastName": "Villeneuve"
					},
					{
						"creatorType": "author",
						"firstName": "Evgenya",
						"lastName": "Vyguzova"
					},
					{
						"creatorType": "author",
						"firstName": "Vitali",
						"lastName": "Zverev"
					},
					{
						"creatorType": "author",
						"firstName": "Tomas",
						"lastName": "Roslin"
					}
				],
				"date": "11/2020",
				"DOI": "10.1111/gcb.15297",
				"ISSN": "1354-1013, 1365-2486",
				"issue": "11",
				"journalAbbreviation": "Glob Change Biol",
				"language": "en",
				"libraryCatalog": "DOI.org (Crossref)",
				"pages": "6276-6295",
				"publicationTitle": "Global Change Biology",
				"url": "https://onlinelibrary.wiley.com/doi/10.1111/gcb.15297",
				"volume": "26",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
