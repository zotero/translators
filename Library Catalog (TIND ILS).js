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
	"lastUpdated": "2025-01-29 18:53:58"
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

/**
 * @type {Map<string, keyof Z.ItemTypes>}
 */
const SCHEMA_ORG_TO_ZOTERO = new Map([
	["Thing", "document"],
	["CreativeWork", "document"],
	["Article", "journalArticle"],
	["ScholarlyArticle", "journalArticle"],
	["Report", "report"],
	["Thesis", "thesis"],
	["Manuscript", "manuscript"],
	["Dataset", "dataset"],
]);

/**
 * @param {Document} doc The page document
 */
function detectWeb(doc, url) {
	if (!doc.querySelector('#tindfooter')) {
		return false;
	}
	
	if (url.includes('/record/')) {
		const schemaOrg = getSchemaOrg(doc);

		if (schemaOrg) {
			const zoteroType = getZoteroTypeFromSchemaOrg(schemaOrg);

			if (zoteroType) {
				return zoteroType;
			}
		}
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

/**
 *
 * @param {Document} doc The page document
 */
function scrape(doc, _url) {
	const schemaOrg = getSchemaOrg(doc);

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
			
			if (schemaOrg) {
				enrichItemWithSchemaOrgItemType(item, schemaOrg);
			}

			item.complete();
		});
		
		translator.translate();
	});
}

/**
 * @param {Object} schemaOrg
 * @returns {keyof Z.ItemTypes | null}
 */
function getZoteroTypeFromSchemaOrg(schemaOrg) {
	const schemaOrgType = schemaOrg["@type"];

	if (SCHEMA_ORG_TO_ZOTERO.has(schemaOrgType)) {
		return SCHEMA_ORG_TO_ZOTERO.get(schemaOrgType);
	}

	return null;
}

/**
 * Enriches the Zotero item with item type found in the Schema.org data.
 *
 * @param {Z.Item} item The Zotero item
 * @param {Object} schemaOrg The parsed Schema.org data
 */
function enrichItemWithSchemaOrgItemType(item, schemaOrg) {
	const zoteroType = getZoteroTypeFromSchemaOrg(schemaOrg);

	if (zoteroType) {
		item.itemType = zoteroType;
	}
}

/**
 * Obtains the parsed Schema.org data from the page.
 *
 * @param {Document} doc The page document
 * @returns {?Object} The schema.org JSON-LD object
 */
function getSchemaOrg(doc) {
	let schemaOrg;
	try {
		schemaOrg = JSON.parse(text(doc, '#detailed-schema-org'));
	}
	catch (e) {
		return null;
	}

	if (schemaOrg["@context"] !== "https://schema.org") {
		return null;
	}

	return schemaOrg;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://lawcat.berkeley.edu/record/1234692",
		"items": [
			{
				"itemType": "book",
				"title": "International maritime dictionary: an encyclopedic dictionary of useful maritime terms and phrases: together with equivalents in French and German",
				"creators": [
					{
						"firstName": "René de",
						"lastName": "Kerchove",
						"creatorType": "author"
					}
				],
				"date": "1961",
				"callNumber": "K4150 .K47 1961",
				"edition": "2nd ed",
				"extra": "OCLC: 8350214",
				"language": "eng fre ger",
				"libraryCatalog": "Berkeley Law",
				"numPages": "1018",
				"place": "Princeton, N.J",
				"publisher": "D. Van Nostrand Co",
				"shortTitle": "International maritime dictionary",
				"attachments": [],
				"tags": [
					{
						"tag": "Dictionaries"
					},
					{
						"tag": "Dictionaries"
					},
					{
						"tag": "Dictionaries"
					},
					{
						"tag": "Dictionaries, Polyglot"
					},
					{
						"tag": "Naval art and science"
					},
					{
						"tag": "Naval art and science"
					},
					{
						"tag": "Polyglot"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://library.usi.edu/record/312809",
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
						"lastName": "GrandPré",
						"creatorType": "author"
					}
				],
				"date": "2007",
				"ISBN": "9780545010221",
				"abstractNote": "Burdened with the dark, dangerous, and seemingly impossible task of locating and destroying Voldemort's remaining Horcruxes, Harry, feeling alone and uncertain about his future, struggles to find the inner strength he needs to follow the path set out before him",
				"callNumber": "PZ7.R79835 Hak 2007",
				"edition": "1st ed",
				"extra": "OCLC: ocm85443494",
				"libraryCatalog": "University of Southern Indiana",
				"numPages": "759",
				"place": "New York",
				"publisher": "Arthur A. Levine Books",
				"attachments": [],
				"tags": [
					{
						"tag": "Bildungsromans"
					},
					{
						"tag": "England"
					},
					{
						"tag": "Hogwarts School of Witchcraft and Wizardry (Imaginary organization)"
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
						"tag": "Potter, Harry (Fictitious character)"
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
						"note": "Sequel to: Harry Potter and the Half-Blood Prince"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://lawcat.berkeley.edu/record/1301185",
		"items": [
			{
				"itemType": "book",
				"title": "Constitution of the United States of Brazil, 1946 (as amended)",
				"creators": [
					{
						"lastName": "Brazil",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Pan American Union",
						"creatorType": "editor",
						"fieldMode": 1
					}
				],
				"date": "1963",
				"callNumber": "KHD2914 1946 .A6 1963",
				"libraryCatalog": "Berkeley Law",
				"numPages": "1",
				"place": "Washington, D.C",
				"publisher": "Pan American Union",
				"url": "https://libproxy.berkeley.edu/login?qurl=https%3A%2F%2Fwww.llmc.com%2FsearchResultVolumes2.aspx%3Fext%3Dtrue%26catalogSet%3D62858",
				"attachments": [],
				"tags": [
					{
						"tag": "Brazil"
					},
					{
						"tag": "Brazil"
					},
					{
						"tag": "Constitutional law"
					},
					{
						"tag": "Constitutions"
					}
				],
				"notes": [
					{
						"note": "\"Published under the direction of the General Legal Division, Department of Legal Affairs, Pan American Union.\" Title page verso"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://library.usi.edu/record/1416599",
		"items": [
			{
				"itemType": "thesis",
				"title": "Let's talk: a common-sense approach to public speaking",
				"creators": [
					{
						"firstName": "Sherry",
						"lastName": "Crawford",
						"creatorType": "author"
					}
				],
				"abstractNote": "No abstract",
				"language": "eng",
				"libraryCatalog": "University of Southern Indiana",
				"shortTitle": "Let's talk",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://library.usi.edu/search?p=test AND 336%3AThesis&fct__3=2017",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://pegasus.law.columbia.edu/record/511151",
		"items": [
			{
				"itemType": "book",
				"title": "Sex and race differences on standardized tests: oversight hearings before the Subcommittee on Civil and Constitutional Rights of the Committee on the Judiciary, House of Representatives, One Hundredth Congress, first session ... April 23, 1987",
				"creators": [
					{
						"lastName": "United States",
						"creatorType": "editor",
						"fieldMode": 1
					}
				],
				"date": "1989",
				"callNumber": "KF27 .J847 1987e",
				"extra": "OCLC: 19420020",
				"libraryCatalog": "CLS Pegasus Library Catalog",
				"numPages": "305",
				"place": "Washington",
				"publisher": "U.S. G.P.O",
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
						"note": "Distributed to some depository libraries in microfiche Shipping list number: 89-175-P \"Serial number 93.\" Item 1020-A, 1020-B (microfiche)"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://socialmediaarchive.org/record/60",
		"items": [
			{
				"itemType": "dataset",
				"title": "Not With a Bang But a Tweet: Democracy, Culture Wars, and the Memeification of T.S. Eliot",
				"creators": [],
				"abstractNote": "This dataset includes posts from Twitter (now X) from 2006 to early 2022 that mentioned a variation of T.S. Eliot's famous lines \"This is the way the world ends / Not with a bang but a whimper\" (see \"Design\" for specific search terms used).\n<br><br>\nModernist poet T.S. Eliot concluded his 1925 poem \"The Hollow Men\" with the iconic lines: \"This is the way the world ends / Not with a bang but a whimper.\" When Eliot died in 1965, the New York Times claimed in his obituary that these lines were “probably the most quoted lines of any 20th-century poet writing in English.” They may be among the most memed lines, as well. Through a computational analysis of Twitter data, we have found that at least 350,000 tweets have referenced or remixed Eliot’s lines since the beginning of Twitter’s history in 2006. While references to the poem vary widely, we focus on two prominent political usages of the phrase — cases where Twitter users invoke it to warn about the state of modern democracy, often from the left side of the political spectrum, and cases where they use the phrase to critique political correctness and “cancel culture” or to mock people for non-normatized aspects of their identities, often from the right side of the political spectrum. Though some of the tweets cite Eliot directly, most do not, and in many cases the phrase almost seems to be moving from an authored quotation into a common idiom or turn-of-phrase. Linguistics experts increasingly refer to this kind of construction as a “snowclone” —a fixed phrasal template, often with a culturally salient source (e.g., a quotation from a book, TV show, or movie), that has “one or more variable slots” into which users insert various “lexical substitutions\" (Hartmann and Ungerer). This data thus enables researchers to study both the circulation of literature and the evolution of linguistic forms",
				"libraryCatalog": "Social Media Archive at ICPSR - SOMAR",
				"shortTitle": "Not With a Bang But a Tweet",
				"attachments": [],
				"tags": [
					{
						"tag": "literature"
					},
					{
						"tag": "presidential election"
					},
					{
						"tag": "social media"
					},
					{
						"tag": "web platform data"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
