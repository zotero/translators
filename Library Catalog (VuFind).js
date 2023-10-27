{
	"translatorID": "862b5893-2d6f-4082-bcc5-a40cfd4663fc",
	"label": "Library Catalog (VuFind)",
	"creator": "Matt Teichman, Abe Jellinek, Mathieu Grimault, Zoë C. Ma",
	"target": "/Record/[^/?]+|/Search/Results",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 270,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-01-30 15:11:01"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Matt Teichman, Abe Jellinek, Mathieu Grimault, Zoë C. Ma,
	and contributors

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
 * Format detection
 *
 * If you want to customize it : create a new translator with a priority < 270,
 * (priority = 100 for a specific domain) and modify the code below
 *
 * Zotero formats : https://aurimasv.github.io/z2csl/typeMap.xml
 * vanilla VuFind :
 * https://github.com/vufind-org/vufind/blob/dev/import/translation_maps/format_map.properties
 */
function customizeFormatDetection(doc) {
	let format = doc.querySelector('div.mainbody span.format');
	if (format) {
		if (format.className.includes('book')) {
			return 'book';
		}
		if (format.className.includes('article')) {
			return 'journalArticle';
		}
		if (format.className.includes('video')) {
			return 'videoRecording';
		}
		if (format.className.includes('thesis')) {
			return 'thesis';
		}
		if (format.className.includes('dissertations')) {
			return 'thesis';
		}
		if (format.className.includes('archivesmanuscripts')) {
			return 'manuscript';
		}
		if (format.className.includes('audio')) {
			return 'audioRecording';
		}
		if (format.className.includes('map')) {
			return 'map';
		}
	}

	// default
	return 'book';
}

/**
 * Custom tweaks to the return of the Zotero MARC translator
 *
 * If you want to customize it : create a new translator with a priority < 270,
 * (priority = 100 for a specific domain) and add your code here...
 *
 * You will probably want to use the commented functions below.
 */
function customizeMARC(_item, _marc) {
	// look up all hits for a MARC field in a MARC record
	/* const lookupValues = (key, table) => {
		// starting position of the content of a record
		const basePos = table => parseInt(table.substring(12, 17));
		// directory substring of a MARC record
		const rawDirectory = table => table.substring(24, basePos(table));
		// the MARC directory as an association list
		const directory = (table) => {
			const raw = rawDirectory(table);
			const twelves = raw.match(/.{12}/g);
			const processEntry = (str) => {
				const field = str.substring(0, 3);
				const valueLength = parseInt(str.substring(3, 7));
				const valuePos = parseInt(str.substring(7, 12));
				return [field, valueLength, valuePos];
			};
			return twelves.map(processEntry);
		};
		// for any MARC field, return the length and starting position of
		// the value
		const lookupInDirectory = (key, threes) => {
			const assocs = threes.filter(three => three[0] == key);
			return assocs.map(x => x.slice(1));
		};
		// the data portion of a MARC record
		const dataPortion = table.substring(basePos(table));
		// the information needed to retrieve all values for a given field
		const fields = lookupInDirectory(key, directory(table));
		// retrieve the value for a single length and position
		const lookupValue = ([l, s]) => dataPortion.substring(s, l + s - 1).trim();
		return fields.map(lookupValue);
	}; */

	// look up the subfields under all the values associated with a
	// given field
	/* const lookupSubfields = (key, subfield, table) => {
		// look up subfield values for each field, length, and start index
		const subfields = subfield => (value) => {
			const startswith = chr => str => str[0] === chr;
			const values = value.split('\x1F');
			const correctValues = values.filter(startswith(subfield));
			return correctValues.map(v => v.substring(1));
		};
		// all the values associated with the input MARC field
		const values = lookupValues(key, table);
		// flatten a list of lists
		const flatten = arr => arr.reduce((acc, elm) => acc.concat(elm), []);
		// return a simple list of all field/subfield values
		return flatten(values.map(subfields(subfield)));
	}; */

	// predicate saying whether input field is present in a MARC record
	/* const fieldExists = (key, table) => {
		const values = lookupValues(key, table);
		return values.length !== 0;
	}; */
}

async function scrape(url, inputFormat, libraryCatalog) {
	let cleanURL = url.replace(/[#?].*$/, '').replace(/\/$/, '');
	let data = await requestText(
		cleanURL + `/Export?style=${inputFormat}`,
		{ headers: { Referer: url } },
	);
	let scrapeFunction;
	switch (inputFormat) {
		case "MARC":
			scrapeFunction = scrapeMARC;
			break;
		case "RIS":
			scrapeFunction = scrapeRIS;
			break;
		case "EndNote":
			scrapeFunction = scrapeReferBibIX;
			break;
	}
	await scrapeFunction(data, libraryCatalog);
}

// MARC retrieval code: run the MARC import translator, then perform a
// few adjustments to the output by looking things up in the MARC record.
// Overall design based on Finna translator
async function scrapeMARC(data, libraryCatalog) {
	// use MARC import translator to ingest binary MARC records
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("a6ee60df-1ddc-4aae-bb25-45e0537be973");
	translator.setString(data);
	translator.setHandler('itemDone', function (_, item) {
		item.libraryCatalog = libraryCatalog;

		// Some cleaning
		if (item.place) {
			item.place = item.place.replace(/\[[^[]+\]/, '');
		}
		if (item.publisher) {
			item.publisher = item.publisher.replace(/&amp;/g, '&');
		}

		// Optionnal : apply customizations
		customizeMARC(item, data);

		item.complete();
	});

	await translator.translate();
}

async function scrapeReferBibIX(data, libraryCatalog) {
	let translator = Zotero.loadTranslator('import');
	translator.setTranslator('881f60f2-0802-411a-9228-ce5f47b64c7d');
	translator.setString(data);
	translator.setHandler('itemDone', (_, item) => {
		item.libraryCatalog = libraryCatalog;

		if (item.url && item.url.includes(', ')) {
			item.url = item.url.split(', ')[0];
		}

		item.complete();
	});
	await translator.translate();
}

async function scrapeRIS(data, libraryCatalog) {
	let translator = Zotero.loadTranslator("import");
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
	translator.setString(data);
	translator.setHandler("itemDone", (_, item) => {
		item.libraryCatalog = libraryCatalog;

		item.complete();
	});
	await translator.translate();
}

function getSearchResults(doc, checkOnly) {
	let obj = {};
	let found = false;
	// search for links to single records
	for (let linkElement of doc.querySelectorAll('#content [id^=result] a.title.getFull')) {
		const entryUrl = linkElement.href;
		// link must have a content !
		const title = ZU.trimInternal(linkElement.textContent);
		if (!entryUrl || !title) continue;
		if (checkOnly) return true;
		found = true;
		obj[entryUrl] = title;
	}

	return found && obj;
}

function getSupportedFormat(doc) {
	for (let format of ['MARC', 'EndNote', 'RIS']) {
		if (doc.querySelector(`a[href*="/Export?style=${format}"]`)) {
			return format;
		}
	}
	return null;
}

async function detectWeb(doc, url) {
	// VuFind URL patterns starting with 'Record' are for single items
	// VuFind URL patterns starting with 'Search' are for search results
	// the translator should do nothing on every other URL pattern
	if (url.includes('/Record')) {
		if (getSupportedFormat(doc)) {
			return customizeFormatDetection(doc);
		}
	}
	else if (url.includes('/Search/Results') && getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

async function doWeb(doc, url) {
	let libraryCatalog = new URL(url).hostname;
	let type = detectWeb(doc, url);
	let format = getSupportedFormat(doc);
	Z.debug(`supported format: ${format}`);
	if (type == 'multiple') {
		// ingest multiple records
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(url, format, libraryCatalog);
		}
	}
	else if (type) {
		// ingest single record
		await scrape(url, format, libraryCatalog);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://nantilus.univ-nantes.fr/vufind/Record/PPN048274445",
		"items": [
			{
				"itemType": "book",
				"title": "Jules Verne: l'oeil et le ventre, une poétique du sujet",
				"creators": [
					{
						"firstName": "Christian",
						"lastName": "Chelebourg",
						"creatorType": "author"
					}
				],
				"date": "1999",
				"ISBN": "9782256909900 9782406125433",
				"callNumber": "PQ2469.Z5",
				"language": "fre",
				"libraryCatalog": "nantilus.univ-nantes.fr",
				"place": "Paris Caen",
				"publisher": "Minard",
				"series": "Bibliothèque des lettres modernes",
				"seriesNumber": "41",
				"shortTitle": "Jules Verne",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://nantilus.univ-nantes.fr/vufind/Record/PPN17208007X",
		"items": [
			{
				"itemType": "book",
				"title": "Planète Jules Verne",
				"creators": [
					{
						"firstName": "Frédéric",
						"lastName": "Le Blay",
						"creatorType": "author"
					},
					{
						"lastName": "Association des amis de la Bibliothèque municipale de Nantes",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "Musée Jules Verne",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "2013",
				"callNumber": "843.8 (critique)",
				"language": "fre",
				"libraryCatalog": "nantilus.univ-nantes.fr",
				"place": "Nantes",
				"publisher": "Coiffard éditions",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.finna.fi/Record/deutschebibliothek.37415",
		"items": [
			{
				"itemType": "book",
				"title": "Suomi, Suomi",
				"creators": [
					{
						"firstName": "Aulikki",
						"lastName": "Oksanen",
						"creatorType": "author"
					},
					{
						"firstName": "Stefan",
						"lastName": "Moster",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"callNumber": "OMA:SZ",
				"language": "ger",
				"libraryCatalog": "www.finna.fi",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "In: Jahrbuch für finnisch-deutsche Literaturbeziehungen, Bd. 50, S. 124; aus: Seitsemän rapua, seitsemän skorpionia"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://catalog.lib.uchicago.edu/vufind/Record/7143200",
		"items": [
			{
				"itemType": "thesis",
				"title": "Modern ethical skepticism",
				"creators": [
					{
						"firstName": "Zed",
						"lastName": "Adams",
						"creatorType": "author"
					}
				],
				"date": "2008",
				"extra": "OCLC: 232302765",
				"libraryCatalog": "catalog.lib.uchicago.edu",
				"numPages": "212",
				"attachments": [],
				"tags": [
					{
						"tag": "1900-1999"
					},
					{
						"tag": "20th century"
					},
					{
						"tag": "Ethics, Modern"
					},
					{
						"tag": "Ethics, Modern"
					},
					{
						"tag": "Values"
					},
					{
						"tag": "Values"
					}
				],
				"notes": [
					{
						"note": "Thesis (Ph. D.)--University of Chicago, Dept. of Philosophy, June 2008"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ixtheo.de/Record/859089061",
		"items": [
			{
				"itemType": "map",
				"title": "Der Atlas zur Reformation in Europa",
				"creators": [
					{
						"firstName": "Tim",
						"lastName": "Dowley",
						"creatorType": "author"
					},
					{
						"firstName": "Nick",
						"lastName": "Rowland",
						"creatorType": "author"
					},
					{
						"firstName": "Ernst",
						"lastName": "Neumann",
						"creatorType": "translator"
					}
				],
				"date": "2016",
				"ISBN": "9783761563311",
				"callNumber": "274.06",
				"language": "ger",
				"libraryCatalog": "ixtheo.de",
				"place": "Neukirchen-Vluyn",
				"publisher": "Neukirchener Aussaat",
				"attachments": [],
				"tags": [
					{
						"tag": "Atlas"
					}
				],
				"notes": [
					{
						"note": "Enthält 60 farbige Karten mit umfangreichen Erläuterungen Mit Zeitstrahl Literaturverzeichnis: Seite 148-149 Mit Registern \"Original edition published in English under the title 'Atlas of the European Reformations' by Lion Hudson plc, Oxford, England. This edition copyright ©2015 Lion Hudson\" (ungezählte Seite 4)"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://libcat.wellesley.edu/Record/ebs14973473e",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Climate Change Operational Framework 2017–2030: Enhanced Actions for Low Greenhouse Gas Emissions and Climate-Resilient Development",
				"creators": [
					{
						"lastName": "Asian Development Bank",
						"creatorType": "author"
					}
				],
				"libraryCatalog": "libcat.wellesley.edu",
				"publicationTitle": "ProQuest Ebook Central - Academic Complete",
				"shortTitle": "Climate Change Operational Framework 2017–2030",
				"url": "https://ezproxy.wellesley.edu/login?url=https://ebookcentral.proquest.com/lib/well/detail.action?docID=5317390",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://librarysearch.aut.ac.nz/vufind/Record/1253127",
		"items": [
			{
				"itemType": "book",
				"title": "Wellington: a portrait of today and yesterday",
				"creators": [
					{
						"firstName": "Graham",
						"lastName": "Stewart",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"ISBN": "9781869341213",
				"abstractNote": "This book takes you on a journey through the decades and gives an insight into the Wellington of today, so take a walk down the corridors of the past and compare them with the present",
				"callNumber": "993.63",
				"libraryCatalog": "librarysearch.aut.ac.nz",
				"numPages": "144",
				"place": "Wellington, New Zealand",
				"publisher": "Grantham House Publishing",
				"shortTitle": "Wellington",
				"attachments": [],
				"tags": [
					{
						"tag": "History"
					},
					{
						"tag": "Pictorial works"
					},
					{
						"tag": "Wellington (N.Z.)"
					},
					{
						"tag": "Wellington (N.Z.)"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.urbis-libnet.org/vufind/Record/Svenska%20Institutet%20i%20Rom.ISV44870",
		"items": [
			{
				"itemType": "book",
				"title": "Roma, Romae: una capitale in età moderna",
				"creators": [
					{
						"firstName": "Marina",
						"lastName": "Formica",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"ISBN": "9788858135259",
				"callNumber": "DG812 .F67 2019",
				"edition": "Prima edizione",
				"libraryCatalog": "www.urbis-libnet.org",
				"numPages": "263",
				"place": "Bari",
				"publisher": "GLF editori Laterza",
				"series": "Storia e società",
				"shortTitle": "Roma, Romae",
				"attachments": [],
				"tags": [
					{
						"tag": "History"
					},
					{
						"tag": "Rome (Italy)"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ixtheo.de/Record/1770813810",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "Diesseits von Eden: der Podcast der katholischen Fakultäten Österreichs & Südtirols",
				"creators": [],
				"date": "2021",
				"callNumber": "230",
				"label": "Studio Omega, Verein für Christliche Radioarbeit",
				"language": "ger",
				"libraryCatalog": "ixtheo.de",
				"place": "Wien",
				"shortTitle": "Diesseits von Eden",
				"attachments": [],
				"tags": [
					{
						"tag": "Podcast"
					},
					{
						"tag": "Zeitschrift"
					}
				],
				"notes": [
					{
						"note": "Gesehen am 16.09.2021"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
