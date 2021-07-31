{
	"translatorID": "3f50f41c-0a07-49f7-af14-7fcf2ed5887a",
	"label": "Library Catalog (TIND ILS)",
	"creator": "Abe Jellinek",
	"target": "/search.+p=|record/[0-9]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 260,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-31 00:43:21"
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
	if (!doc.querySelector('#tindfooter')) {
		return false;
	}
	
	if (url.includes('/record/')) {
		return "book";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (url.includes('/search')) {
		Z.monitorDOMChanges(doc.querySelector('.pagebody'));
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.result-title a');
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
	let marcXMLURL = attr(doc, 'a[href$="/export/xm"], a[download$=".xml"]', 'href');
	ZU.doGet(marcXMLURL, function (respText) {
		var translator = Zotero.loadTranslator("import");
		// MARCXML
		translator.setTranslator("edd87d07-9194-42f8-b2ad-997c4c7deefd");
		translator.setString(respText);
		
		translator.setHandler("itemDone", function (obj, item) {
			item.libraryCatalog = text(doc, '#headerlogo')
				|| attr(doc, 'meta[property="og:site_name"]', 'content');
			
			let erURL = attr(doc, '.er-link', 'href');
			if (erURL) {
				item.url = erURL;
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
		"url": "https://caltech.tind.io/record/483199?ln=en",
		"items": [
			{
				"itemType": "book",
				"title": "Handbook of the engineering sciences",
				"creators": [
					{
						"firstName": "James Harry",
						"lastName": "Potter",
						"creatorType": "author"
					}
				],
				"date": "1967",
				"callNumber": "TA151 .P79",
				"libraryCatalog": "Caltech Library Catalog",
				"numPages": "2",
				"place": "Princeton, N.J",
				"publisher": "Van Nostrand",
				"attachments": [],
				"tags": [
					{
						"tag": "Engineering"
					},
					{
						"tag": "Handbooks, manuals, etc"
					}
				],
				"notes": [
					{
						"note": "Housner Earthquake Engineering Collection"
					},
					{
						"note": "v.1. The basic sciences.--v.2. The applied sciences"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://caltech.tind.io/record/688072?ln=en",
		"items": [
			{
				"itemType": "book",
				"title": "Harry Potter and the deathly hallows",
				"creators": [
					{
						"firstName": "J. K.",
						"lastName": "Rowling",
						"creatorType": "author"
					},
					{
						"firstName": "Mary",
						"lastName": "GrandPré",
						"creatorType": "author"
					}
				],
				"date": "2007",
				"ISBN": "9780545010221",
				"abstractNote": "Burdened with the dark, dangerous, and seemingly impossible task of locating and destroying Voldemort's remaining Horcruxes, Harry, feeling alone and uncertain about his future, struggles to find the inner strength he needs to follow the path set out before him",
				"callNumber": "PR6068.O94 H377 2007",
				"edition": "1st ed",
				"libraryCatalog": "Caltech Library Catalog",
				"numPages": "759",
				"place": "New York, NY",
				"publisher": "Arthur A. Levine Books",
				"attachments": [],
				"tags": [
					{
						"tag": "England"
					},
					{
						"tag": "Hogwarts School of Witchcraft and Wizardry (Imaginary place)"
					},
					{
						"tag": "Juvenile fiction"
					},
					{
						"tag": "Juvenile fiction"
					},
					{
						"tag": "Juvenile fiction"
					},
					{
						"tag": "Juvenile fiction"
					},
					{
						"tag": "Juvenile fiction"
					},
					{
						"tag": "Juvenile fiction"
					},
					{
						"tag": "Magic"
					},
					{
						"tag": "Potter, Harry"
					},
					{
						"tag": "Schools"
					},
					{
						"tag": "Wizards"
					}
				],
				"notes": [
					{
						"note": "\"Year 7\"--Spine Sequel to: Harry Potter and the Half-Blood Prince"
					},
					{
						"note": "The Dark Lord ascending -- In memoriam -- The Dursleys departing -- The seven Potters -- Fallen warrior -- The ghoul in pajamas -- The will of Albus Dumbledore -- The wedding -- A place to hide -- Kreacher's tale -- The bribe -- Magic is might -- The Muggle-born Registration Commission -- The thief -- The goblin's revenge -- Godric's Hollow -- Bathilda's secret -- The life and lies of Albus Dumbledore -- The silver doe -- Xenophilius Lovegood -- The tale of the three brothers -- The Deathly Hallows -- Malfoy Manor -- The wandmaker -- Shell Cottage -- Gringotts -- The final hiding place -- The missing mirror -- The lost diadem -- The sacking of Severus Snape -- The Battle of Hogwarts -- The Elder Wand -- The prince's tale -- The forest again -- King's Cross -- The flaw in the plan"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://caltech.tind.io/record/578424?ln=en",
		"items": [
			{
				"itemType": "thesis",
				"title": "Vibration tests of a multistory building",
				"creators": [
					{
						"firstName": "Julio Horiuch",
						"lastName": "Kuroiwa",
						"creatorType": "author"
					},
					{
						"lastName": "California Institute of Technology",
						"creatorType": "contributor",
						"fieldMode": true
					}
				],
				"date": "1967",
				"callNumber": "THESIS",
				"libraryCatalog": "Caltech Library Catalog",
				"numPages": "113",
				"place": "Pasadena, Calif",
				"university": "California Institute of Technology",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "Housner Earthquake Engineering Collection"
					},
					{
						"note": "Thesis (Engineer) -- California Institute of Technology, 1967"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://caltech.tind.io/record/666881?ln=en",
		"items": [
			{
				"itemType": "book",
				"title": "Asymptotically optimal multistage hypothesis tests",
				"creators": [
					{
						"firstName": "Jay L.",
						"lastName": "Bartroff",
						"creatorType": "author"
					},
					{
						"firstName": "Gary",
						"lastName": "Lorden",
						"creatorType": "author"
					},
					{
						"lastName": "California Institute of Technology",
						"creatorType": "contributor",
						"fieldMode": true
					}
				],
				"date": "2004",
				"callNumber": "THESIS",
				"libraryCatalog": "Caltech Library Catalog",
				"numPages": "181",
				"place": "Pasadena, Calif",
				"publisher": "California Institute of Technology",
				"series": "CIT theses",
				"seriesNumber": "2004",
				"url": "http://resolver.caltech.edu/CaltechETD:etd-05202004-133633",
				"attachments": [],
				"tags": [
					{
						"tag": "Electronic dissertations"
					}
				],
				"notes": [
					{
						"note": "Thesis (Ph. D.) PQ #3151340"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://caltech.tind.io/search?ln=en&rm=&ln=en&sf=&so=d&rg=25&c=Caltech&of=hb&fct__4=Thesis&fct__4=Thesis&fct__4=Remote%20access&p=test",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://pegasus.law.columbia.edu/record/511151?ln=en",
		"items": [
			{
				"itemType": "book",
				"title": "Sex and race differences on standardized tests: oversight hearings before the Subcommittee on Civil and Constitutional Rights of the Committee on the Judiciary, House of Representatives, One Hundredth Congress, first session ... April 23, 1987",
				"creators": [
					{
						"lastName": "United States",
						"creatorType": "editor",
						"fieldMode": true
					}
				],
				"date": "1989",
				"callNumber": "KF27 .J847 1987e",
				"libraryCatalog": "CLS Pegasus Library Catalog",
				"numPages": "305",
				"place": "Washington",
				"publisher": "U.S. G.P.O. : For sale by the Supt. of Docs., Congressional Sales Office, U.S. G.P.O",
				"shortTitle": "Sex and race differences on standardized tests",
				"attachments": [],
				"tags": [
					{
						"tag": "Educational tests and measurements"
					},
					{
						"tag": "SAT (Educational test)"
					},
					{
						"tag": "Sexism in educational tests"
					},
					{
						"tag": "Test bias"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "United States"
					}
				],
				"notes": [
					{
						"note": "Distributed to some depository libraries in microfiche Shipping list no.: 89-175-P \"Serial no. 93.\" Item 1020-A, 1020-B (microfiche)"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
