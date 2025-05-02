{
	"translatorID": "f9052879-ab4c-4056-84b4-e963dd98cb5d",
	"label": "VuFind",
	"creator": "Matt Teichman",
	"target": "/Record/[^/?]+|/Search/Results",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 270,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-08-25 21:16:55"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Matt Teichman

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


async function scrape(url, libraryCatalog) {
	// this part is based on the Finna translator code
	let cleanURL = url.replace(/[#?].*$/, '').replace(/\/$/, '');

	// we might not get MARC export on some catalogs, so don't panic if we get an error here
	let marcURL = cleanURL + '/Export?style=MARC';
	try {
		let marcData = await requestText(marcURL);
		if (!marcData.trim().startsWith('<!DOCTYPE')) {
			await scrapeMARC(marcData, libraryCatalog);
			return;
		}
	}
	catch (e) {}

	// but do panic if we don't get EndNote export
	let referBibIXURL = cleanURL + '/Export?style=EndNote';
	let referBibIXData = await requestText(referBibIXURL);
	await scrapeReferBibIX(referBibIXData, libraryCatalog);
}

// MARC retrieval code: run the MARC import translator, then perform a
// few adjustments to the output by looking things up in the MARC
// record

// scrapeMARC function, overall design based on Finna translator
const scrapeMARC = async (data, libraryCatalog) => {
	// look up all hits for a MARC field in a MARC record
	const lookupValues = (key, table) => {
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
	};

	// look up the subfields under all the values associated with a
	// given field
	const lookupSubfields = (key, subfield, table) => {
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
	};

	// predicate saying whether input field is present in a MARC record
	const fieldExists = (key, table) => {
		const values = lookupValues(key, table);
		return values.length !== 0;
	};

	
	// custom tweaks to the return of the Zotero MARC translator
	const customizeMARC = (item, marc) => {
		// replace general call number with UChicago-internal call number
		const updateCN = (item) => {
			const callNumbers = lookupSubfields('928', 'a', marc);
			if (callNumbers.length === 1) {
				item.callNumber = callNumbers[0];
			}
		};

		// if there's a 502 field, it should be a thesis
		const isDissertation = marc => fieldExists('502', marc);

		// correct errors in identifying dissertations, maps,
		// manuscripts, and films
		const fixItemType = (item) => {
			// if the record type is 'p', it's a manuscript
			const isManuscript = marc => marc.substring(6, 7) == 'p';
			// if the item type is film, it's a film
			const isFilm = item => item.itemType === 'film';
			// if the record type is 'e', it's a map
			const isMap = marc => marc.substring(6, 7) == 'e';

			if (isDissertation(marc)) {
				// a dissertation is a 'thesis'
				item.itemType = "thesis";
			}
			else if (isManuscript(marc)) {
				// a manuscript is a 'manuscript';
				item.itemType = "manuscript";
			}
			else if (isFilm(item)) {
				// a film is a 'videoRecording' since we don't have
				// any film prints
				item.itemType = "videoRecording";
			}
			else if (isMap(marc)) {
				// a map is a 'map';
				item.itemType = "map";
			}
		};

		// relocate 264|b of a dissertation to the 'archive'
		// Zotero field
		const archivePublisher = (item) => {
			const publisher = lookupSubfields('264', 'b', marc);
			if (isDissertation(marc) && publisher.length === 1) {
				item.archive = publisher[0];
			}
		};

		// make 710|a field into the publisher of a dissertation
		const makeUniversityPublisher = (item) => {
			// does 710|e say 'degree granting institution.'?
			const degreeGranting = lookupSubfields('710', 'e', marc);
			let isDG = false;
			if (degreeGranting.length === 1) {
				isDG = degreeGranting[0] == 'degree granting institution.';
			}
			// is there a 710|a MARC field?
			const university = lookupSubfields('710', 'a', marc);
			// if both conditions hold, 710|a becomes the publisher
			if (isDissertation(marc) && isDG && university.length === 1) {
				// strip possible trailing period from the MARC field
				item.publisher = university[0].replace(/([a-z])\.\s*$/, '$1');
			}
		};

		const addCatalog = (item) => {
			item.libraryCatalog = libraryCatalog;
		};

		// perform the fixes
		fixItemType(item);
		if (libraryCatalog.includes('uchicago.edu')) {
			updateCN(item);
		}
		archivePublisher(item);
		makeUniversityPublisher(item);
		addCatalog(item);
	};
	
	// use MARC import translator to ingest binary MARC records
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("a6ee60df-1ddc-4aae-bb25-45e0537be973");
	translator.setString(data);
	translator.setHandler('itemDone', function (_, item) {
		if (item.place) {
			item.place = item.place.replace(/\[[^[]+\]/, '');
		}
	
		if (item.publisher) {
			item.publisher = item.publisher.replace(/&amp;/g, '&');
		}

		// apply the above customizations
		customizeMARC(item, data);
		item.complete();
	});

	await translator.translate();
};

const scrapeReferBibIX = async (data, libraryCatalog) => {
	let translate = Zotero.loadTranslator('import');
	translate.setTranslator('881f60f2-0802-411a-9228-ce5f47b64c7d'); // Refer/BibIX
	translate.setString(data);
	translate.setHandler('itemDone', (_, item) => {
		item.libraryCatalog = libraryCatalog;

		if (item.url && item.url.includes(', ')) {
			item.url = item.url.split(', ')[0];
		}

		item.complete();
	});
	await translate.translate();
};

const getSearchResults = (doc, checkOnly) => {
	// get every search result DOM element
	const rowNodes = doc.querySelectorAll('[id^=result]');
	// make the node list into an array
	const a = Array.from(rowNodes);
	let obj = {};
	// extract information from each li element for output
	for (let r of a) {
		const linkElement = r.querySelector('.title.getFull');
		const entryUrl = linkElement.href;
		if (!linkElement) continue;
		const title = ZU.trimInternal(linkElement.textContent);
		if (entryUrl && title) {
			if (checkOnly) {
				return true;
			}
			obj[entryUrl] = title;
		}
	}
	return checkOnly ? !!obj.length : obj;
};

const detectWeb = (doc, url) => {
	// VuFind URL patterns starting with 'Record' are for single items
	if (url.includes('/Record')) {
		let supportedExportFormats = ['MARC', 'EndNote']
			.filter(format => !!doc.querySelector(`a[href$="/Export?style=${format}"]`));
		if (!supportedExportFormats.length) {
			return false;
		}

		if (doc.querySelector('.format.video')) {
			return 'videoRecording';
		}
		else if (doc.querySelector('.format.dissertations')) {
			return 'thesis';
		}
		else if (doc.querySelector('.format.archivesmanuscripts')) {
			return 'manuscript';
		}
		else if (doc.querySelector('.format.audio')) {
			return 'audioRecording';
		}
		else if (doc.querySelector('.format.map')) {
			return 'map';
		}
		else {
			return 'book';
		}
		// VuFind URL patterns starting with 'Search' are for search results
	}
	else if (url.includes('/Search/Results') && getSearchResults(doc, true)) {
		return 'multiple';
		// the translator should do nothing on every other URL pattern
	}
	else {
		return false;
	}
};

const doWeb = async (doc, url) => {
	let libraryCatalog = new URL(url).hostname;
	if (detectWeb(doc, url) == 'multiple') {
		// ingest multiple records
		let items = await Zotero.selectItems(getSearchResults(doc));
		if (items) {
			let itemURLs = Object.keys(items);
			await Promise.all(itemURLs.map(url => scrape(url, libraryCatalog)));
		}
	}
	else {
		// ingest single record
		await scrape(url, libraryCatalog);
	}
};

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://catalog.lib.uchicago.edu/vufind/Record/6422153",
		"items": [
			{
				"itemType": "book",
				"title": "Eat, pray, love: one woman's search for everything across Italy, India, and Indonesia",
				"creators": [
					{
						"firstName": "Elizabeth",
						"lastName": "Gilbert",
						"creatorType": "author"
					}
				],
				"date": "2007",
				"ISBN": "9780143038412",
				"callNumber": "G154.5.G55 A3 2007",
				"extra": "OCLC: 82462742",
				"libraryCatalog": "catalog.lib.uchicago.edu",
				"numPages": "334",
				"place": "New York",
				"publisher": "Penguin",
				"shortTitle": "Eat, pray, love",
				"attachments": [],
				"tags": [
					{
						"tag": "Biography"
					},
					{
						"tag": "Biography"
					},
					{
						"tag": "Gilbert, Elizabeth"
					},
					{
						"tag": "Gilbert, Elizabeth"
					},
					{
						"tag": "Travel"
					},
					{
						"tag": "Travel"
					},
					{
						"tag": "Travel writers"
					},
					{
						"tag": "Travel writers"
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
						"note": "Previously published: New York : Viking Penguin, 2006"
					},
					{
						"note": "Italy, or, \"Say it like you eat it,\" or, 36 tales about the pursuit of pleasure -- India, or, \"Congratulations to meet you,\" or, 36 tales about the pursuit of devotion -- Indonesia, or, \"Even in my underpants, I feel different,\" or, 36 tales about the pursuit of balance"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://catalog.lib.uchicago.edu/vufind/Record/11893824",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "Love's philosophy",
				"creators": [
					{
						"firstName": "Brian",
						"lastName": "Knowles",
						"creatorType": "author"
					},
					{
						"firstName": "Percy Bysshe",
						"lastName": "Shelley",
						"creatorType": "author"
					},
					{
						"firstName": "William",
						"lastName": "Shakespeare",
						"creatorType": "author"
					},
					{
						"firstName": "George Gordon Byron",
						"lastName": "Byron",
						"creatorType": "author"
					},
					{
						"firstName": "Walter",
						"lastName": "De la Mare",
						"creatorType": "author"
					},
					{
						"firstName": "Robert",
						"lastName": "Burns",
						"creatorType": "author"
					},
					{
						"firstName": "Craig",
						"lastName": "Ogden",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Angus",
						"creatorType": "author"
					},
					{
						"firstName": "James",
						"lastName": "Gilchrist",
						"creatorType": "author"
					},
					{
						"firstName": "Brian",
						"lastName": "Knowles",
						"creatorType": "author"
					},
					{
						"firstName": "Brian",
						"lastName": "Knowles",
						"creatorType": "author"
					},
					{
						"firstName": "Brian",
						"lastName": "Knowles",
						"creatorType": "author"
					},
					{
						"firstName": "Brian",
						"lastName": "Knowles",
						"creatorType": "author"
					},
					{
						"lastName": "English Northern Philharmonia",
						"creatorType": "contributor",
						"fieldMode": true
					}
				],
				"date": "2017",
				"extra": "OCLC: 1104495515",
				"label": "Rubicon Classics",
				"libraryCatalog": "catalog.lib.uchicago.edu",
				"place": "Eastbourne, England",
				"attachments": [],
				"tags": [
					{
						"tag": "Burns, Robert"
					},
					{
						"tag": "Byron, George Gordon Byron"
					},
					{
						"tag": "Chamber music"
					},
					{
						"tag": "Concertos"
					},
					{
						"tag": "Concertos (Guitar)"
					},
					{
						"tag": "De la Mare, Walter"
					},
					{
						"tag": "Guitar with orchestra"
					},
					{
						"tag": "Musical settings"
					},
					{
						"tag": "Musical settings"
					},
					{
						"tag": "Musical settings"
					},
					{
						"tag": "Musical settings"
					},
					{
						"tag": "Musical settings"
					},
					{
						"tag": "Musical settings"
					},
					{
						"tag": "Rondos"
					},
					{
						"tag": "Rondos (Guitar)"
					},
					{
						"tag": "Shakespeare, William"
					},
					{
						"tag": "Shelley, Percy Bysshe"
					},
					{
						"tag": "Songs"
					},
					{
						"tag": "Songs (High voice) with guitar"
					},
					{
						"tag": "Streaming audio"
					}
				],
				"notes": [
					{
						"note": "Guitar concerto : Visiones de Andalucia (22:12) -- Poco rondo : for solo guitar (3:00) -- Eight songs from Poetry serenade. Love's philosophy (Shelley) ; Let me not to the marriage of true minds (Shakespeare) ; O mistress mine (Shakespeare) ; Shall I compare thee to a summer's day (Shakespeare) ; When icicles hang by the wall (Shakespeare) ; She walks in beauty (Byron) ; The listeners (De la Mare) ; A red, red rose (Burns) (26:32) -- A fond farewell : for guitar & orchestra (7:45)"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://catalog.lib.uchicago.edu/vufind/Record/4362914",
		"items": [
			{
				"itemType": "map",
				"title": "Iowa",
				"creators": [
					{
						"lastName": "G.W. & C.B. Colton & Co",
						"creatorType": "contributor",
						"fieldMode": true
					}
				],
				"date": "1876",
				"callNumber": "G4104.C6 1876 .G2",
				"extra": "OCLC: 12373755",
				"libraryCatalog": "catalog.lib.uchicago.edu",
				"place": "[New York",
				"publisher": "G.W. & C.B. Colton & Co",
				"attachments": [],
				"tags": [
					{
						"tag": "Iowa"
					},
					{
						"tag": "Iowa"
					},
					{
						"tag": "Maps"
					},
					{
						"tag": "Maps"
					}
				],
				"notes": [
					{
						"note": "On same sheet with: Chicago; verso: Illinois"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://catalog.lib.uchicago.edu/vufind/Record/269312",
		"items": [
			{
				"itemType": "book",
				"title": "Color: universal language and dictionary of names",
				"creators": [
					{
						"firstName": "Kenneth L.",
						"lastName": "Kelly",
						"creatorType": "author"
					},
					{
						"firstName": "Deane Brewster",
						"lastName": "Judd",
						"creatorType": "author"
					},
					{
						"firstName": "Kenneth Low",
						"lastName": "Kelly",
						"creatorType": "author"
					},
					{
						"firstName": "Kenneth Low",
						"lastName": "Kelly",
						"creatorType": "author"
					}
				],
				"date": "1976",
				"callNumber": "QC100.U524 no.440",
				"language": "eng",
				"libraryCatalog": "catalog.lib.uchicago.edu",
				"numPages": "19",
				"place": "Washington",
				"publisher": "U.S. Dept. of Commerce, National Bureau of Standards : for sale by the Supt. of Docs., U.S. Govt. Print. Off",
				"series": "NBS special publication",
				"seriesNumber": "440",
				"shortTitle": "Color",
				"attachments": [],
				"tags": [
					{
						"tag": "Color"
					},
					{
						"tag": "Color"
					},
					{
						"tag": "Colors"
					},
					{
						"tag": "Colors"
					},
					{
						"tag": "Dictionaries"
					},
					{
						"tag": "Terminology"
					},
					{
						"tag": "Terminology"
					}
				],
				"notes": [
					{
						"note": "Supersedes and combines The ISCC-NBS method of designating colors and a dictionary of color names by K. L. Kelly and D. B. Judd and A universal color language by K. L. Kelly"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://catalog.lib.uchicago.edu/vufind/Record/8066283",
		"items": [
			{
				"itemType": "manuscript",
				"title": "The Columbia Physics Department: a brief history",
				"creators": [
					{
						"firstName": "I.",
						"lastName": "Tramm",
						"creatorType": "editor"
					},
					{
						"lastName": "Niels Bohr Library & Archives",
						"creatorType": "editor",
						"fieldMode": true
					}
				],
				"date": "1992",
				"abstractNote": "A booklet of reproductions of some of the archival documents, correspondence, and photographs relating to the history of the Physics department of Columbia. Includes listing and photos of Columbia's Nobel Laureates and discussion of Columbia's involvment in the Manhattan Project. Correspondents include Niels Bohr, Albert Einstein, Enrico Fermi, H. A. Lorentz, R. A. Millikan, and Max Planck",
				"callNumber": "QC9.U5C658 1992",
				"extra": "OCLC: 83949670",
				"libraryCatalog": "catalog.lib.uchicago.edu",
				"numPages": "48",
				"place": "[College Park, MD?",
				"shortTitle": "The Columbia Physics Department",
				"attachments": [],
				"tags": [
					{
						"tag": "1900-1999"
					},
					{
						"tag": "20th century"
					},
					{
						"tag": "Bohr, Niels"
					},
					{
						"tag": "Bohr, Niels"
					},
					{
						"tag": "Columbia University"
					},
					{
						"tag": "Columbia University"
					},
					{
						"tag": "Department of Physics"
					},
					{
						"tag": "Dept. of Physics"
					},
					{
						"tag": "Einstein, Albert"
					},
					{
						"tag": "Einstein, Albert"
					},
					{
						"tag": "Fermi, Enrico"
					},
					{
						"tag": "Fermi, Enrico"
					},
					{
						"tag": "Hendrik Antoon"
					},
					{
						"tag": "Hendrik Antoon"
					},
					{
						"tag": "History"
					},
					{
						"tag": "History"
					},
					{
						"tag": "History"
					},
					{
						"tag": "History"
					},
					{
						"tag": "History"
					},
					{
						"tag": "Lorentz, H. A"
					},
					{
						"tag": "Lorentz, H. A"
					},
					{
						"tag": "Manhattan Project (U.S.)"
					},
					{
						"tag": "Manhattan Project (U.S.)"
					},
					{
						"tag": "Millikan, Robert Andrews"
					},
					{
						"tag": "Millikan, Robert Andrews"
					},
					{
						"tag": "Nobel Prize winners"
					},
					{
						"tag": "Nobel Prize winners"
					},
					{
						"tag": "Physicists"
					},
					{
						"tag": "Physicists"
					},
					{
						"tag": "Physics"
					},
					{
						"tag": "Physics"
					},
					{
						"tag": "Pictorial works"
					},
					{
						"tag": "Pictorial works"
					},
					{
						"tag": "Pictorial works"
					},
					{
						"tag": "Pictorial works"
					},
					{
						"tag": "Pictorial works"
					},
					{
						"tag": "Pictorial works"
					},
					{
						"tag": "Pictorial works"
					},
					{
						"tag": "Pictorial works"
					},
					{
						"tag": "Pictorial works"
					},
					{
						"tag": "Pictorial works"
					},
					{
						"tag": "Pictorial works"
					},
					{
						"tag": "Pictorial works"
					},
					{
						"tag": "Planck, Max"
					},
					{
						"tag": "Planck, Max"
					},
					{
						"tag": "United States"
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
						"note": "Forms part of the Niels Bohr Library Institutional Histories Collection Cover title"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://catalog.lib.uchicago.edu/vufind/Search/Results?lookfor=andre+gide&type=AllFields",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://catalog.lib.uchicago.edu/vufind/Record/10773190",
		"items": [
			{
				"itemType": "thesis",
				"title": "Characterizing kinds: A semantics for generic sentences",
				"creators": [
					{
						"firstName": "Matthew",
						"lastName": "Teichman",
						"creatorType": "author"
					},
					{
						"lastName": "University of Chicago",
						"creatorType": "contributor",
						"fieldMode": true
					}
				],
				"date": "2015",
				"abstractNote": "In this text, I argue that generic statements---statements of the form Fs are G, such as 'Bears are furry'---are particular statements about kinds, rather than general statements about individual objects. Although statements of this form intuitively seem like generalizations, I claim that in this case, appearances are deceptive. First, I present new linguistic evidence which raises problems for the standard quantificational theory of generic sentences, according to which generic sentences contain a hidden, unpronounced quantifier. Though the simple kind theory has served as a standard alternative to quantificational approaches in the literature on generics since Carlson (1977), it also has a more sophisticated cousin, which has largely been ignored. I develop an extension of the sophisticated kind theory and show how it can neatly account for these phenomena while sidestepping the standard objections to the simple kind theory. At a broader level, I would like to claim that if a kind theory provides the best explanation for the truth conditions of these sentences in English, then it tells us something interesting about English speakers: namely, that in virtue of their speaking English, they implicitly presuppose an ontology with kinds as possible objects. In this way, I suggest, the search for the best semantic theory of generic sentences has the potential to lead us towards a new, philosophically valuable conception of kindhood",
				"archive": "ProQuest Dissertations & Theses,",
				"libraryCatalog": "catalog.lib.uchicago.edu",
				"numPages": "1",
				"place": "Ann Arbor",
				"shortTitle": "Characterizing kinds",
				"university": "University of Chicago",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "Advisors: Jason Bridges; Christopher Kennedy Committee members: Frank Veltman; Malte Willer"
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
				"callNumber": "BJ2999 Adams",
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
		"url": "http://bdtd.ibict.br/vufind/Record/UNICAMP-30_0cff5b4073e71e6635313c7d4e3f205e",
		"items": [
			{
				"itemType": "book",
				"title": "Criptografia quântica com estados comprimidos da luz",
				"creators": [
					{
						"firstName": "Douglas Delgado de",
						"lastName": "Souza",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"abstractNote": "Orientador: Antonio Vidiella Barranco",
				"language": "por",
				"libraryCatalog": "bdtd.ibict.br",
				"url": "https://hdl.handle.net/20.500.12733/1615696",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://bdtd.ibict.br/vufind/Record/PUC_RIO-1_5e711c01a0c4745a4c27c1750ecfc724",
		"items": [
			{
				"itemType": "book",
				"title": "A DEPENDENCY TREE ARC FILTER",
				"creators": [
					{
						"firstName": "RENATO SAYAO CRYSTALLINO DA",
						"lastName": "ROCHA",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"abstractNote": "A tarefa de Processamento de Linguagem Natural consiste em analisar linguagens naturais de forma computacional, facilitando o desenvolvimento de programas capazes de utilizar dados falados ou escritos. Uma das tarefas mais importantes deste campo é a Análise de Dependência. Tal tarefa consiste em analisar a estrutura gramatical de frases visando extrair aprender dados sobre suas relações de dependência. Em uma sentença, essas relações se apresentam em formato de árvore, onde todas as palavras são interdependentes. Devido ao seu uso em uma grande variedade de aplicações como Tradução Automática e Identificação de Papéis Semânticos, diversas pesquisas com diferentes abordagens são feitas nessa área visando melhorar a acurácia das árvores previstas. Uma das abordagens em questão consiste em encarar o problema como uma tarefa de classificação de tokens e dividi-la em três classificadores diferentes, um para cada sub-tarefa, e depois juntar seus resultados de forma incremental. As sub-tarefas consistem em classificar, para cada par de palavras que possuam relação paidependente, a classe gramatical do pai, a posição relativa entre os dois e a distância relativa entre as palavras. Porém, observando pesquisas anteriores nessa abordagem, notamos que o gargalo está na terceira sub-tarefa, a predição da distância entre os tokens. Redes Neurais Recorrentes são modelos que nos permitem trabalhar utilizando sequências de vetores, tornando viáveis problemas de classificação onde tanto a entrada quanto a saída do problema são sequenciais, fazendo delas uma escolha natural para o problema. Esse trabalho utiliza-se de Redes Neurais Recorrentes, em específico Long Short-Term Memory, para realizar a tarefa de predição da distância entre palavras que possuam relações de dependência como um problema de classificação sequence-to-sequence. Para sua avaliação empírica, este trabalho segue a linha de pesquisas anteriores e utiliza os dados do corpus em português disponibilizado pela Conference on Computational Natural Language Learning 2006 Shared Task. O modelo resultante alcança 95.27 por cento de precisão, resultado que é melhor do que o obtido por pesquisas feitas anteriormente para o modelo incremental.",
				"language": "por",
				"libraryCatalog": "bdtd.ibict.br",
				"url": "https://www.maxwell.vrac.puc-rio.br/colecao.php?strSecao=resultado&nrSeq=35858@1",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://bdtd.ibict.br/vufind/Search/Results?lookfor=trees&type=AllFields&limit=20&sort=relevance",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://ixtheo.de/Record/1698984863",
		"items": [
			{
				"itemType": "book",
				"title": "Rationalisierung und säkulare Gesellschaft: Beiträge zur Religionssoziologie",
				"creators": [
					{
						"firstName": "Gernot",
						"lastName": "Saalmann",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISBN": "9783956507083",
				"callNumber": "306.6",
				"language": "ger",
				"libraryCatalog": "ixtheo.de",
				"numPages": "1",
				"place": "Baden-Baden",
				"publisher": "Ergon Verlag",
				"series": "Bibliotheca Academica Reihe Religionswissenschaft",
				"seriesNumber": "Band 1",
				"shortTitle": "Rationalisierung und säkulare Gesellschaft",
				"attachments": [],
				"tags": [
					{
						"tag": "Bourdieu"
					},
					{
						"tag": "Durkheim"
					},
					{
						"tag": "Fundamentalismus"
					},
					{
						"tag": "Gesellschaft"
					},
					{
						"tag": "Hindunationalismus"
					},
					{
						"tag": "Max Weber"
					},
					{
						"tag": "Max Weber"
					},
					{
						"tag": "Religionssoziologie"
					},
					{
						"tag": "Religiöser Wandel"
					},
					{
						"tag": "Secularization"
					},
					{
						"tag": "Society"
					},
					{
						"tag": "Säkularisierung"
					},
					{
						"tag": "Weber"
					},
					{
						"tag": "politische Religionen"
					},
					{
						"tag": "sociology of religion"
					}
				],
				"notes": [
					{
						"note": "Die im vorliegenden Band versammelten Aufsätze sind durch eine stringent eingenommene kulturanthropologische und wissenssoziologische Perspektive verbunden. Demnach ist Religion – neben dem Common sense, der Kunst, der Philosophie oder der Wissenschaft – eine von vielen Facetten des menschlichen Lebens und kann als Prozess betrachtet wie auch historisch-reflexiv thematisiert werden. Wie die Umwelt des Menschen sich fortwährend wandelt, so verändern sich auch Form und Stellenwert von Religion. Dies zeigt ein Blick in die europäische, aber auch in die indische Religionsgeschichte, wobei die Beschäftigung mit Indien dabei hilft, einen Eurozentrismus zu korrigieren. Neben den ausführlich behandelten klassischen Autoren Durkheim, Weber, Geertz und Bourdieu, finden auch Marx, Otto, Wittgenstein, Luckmann, Berger, Gandhi und Madan Berücksichtigung This collection of articles and lectures discusses the contributions of some of the most outstanding figures in the field of research on religion, like Durkheim, Weber, Geertz and Bourdieu. A second focus is on the heated debates on religion as a concept, modernization, secularization and the effects of globalization on religion. While accepting many points of criticism the concepts are still found to be useful. The same applies to fundamentalism and political religion. To provincialize Europe reference is made to India throughout the texts"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ixtheo.de/Record/1801688400",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Kuessner, Dietrich: Der christliche Staatsmann. Ein Beitrag zum Hitler Bild in der Deutschen Evangelischen Kirche und zur Kirchlichen Mitte",
				"creators": [
					{
						"firstName": "Eberhard",
						"lastName": "Ockel",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"DOI": "10.17879/thrv-2022-3768",
				"ISSN": "2699-5433",
				"callNumber": "1",
				"language": "ger",
				"libraryCatalog": "ixtheo.de",
				"publicationTitle": "Theologische Revue",
				"shortTitle": "Kuessner, Dietrich",
				"attachments": [],
				"tags": [
					{
						"tag": "Rezension"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ixtheo.de/Record/1801673586",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Advancing the Study of Nonreligion through Feminist Methods",
				"creators": [
					{
						"firstName": "Jordan C.",
						"lastName": "Reuter",
						"creatorType": "author"
					},
					{
						"firstName": "Colleen I.",
						"lastName": "Murray",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"DOI": "10.5334/snr.151",
				"ISSN": "2053-6712",
				"abstractNote": "In the United States, nonreligious people face stigma, prejudice, and discrimination because they are viewed as immoral and distrustful. This is partly because of othering, by which nonreligious people are subjugated to a minority status. Othering also occurs in academic research and writing. Applying feminist principles can improve research about nonreligious populations. Grounded in results of a US-based online study, we recommend two feminist principles to facilitate the study of nonreligion: (1) rejecting othering of minority groups, and (2) intersectionality. As a result of applying these principles, the nuanced differences between nonreligious groups can be better understood and the complex identities of nonreligious people can be more accurately represented. Researchers benefit from increased accuracy and understanding of nonreligion via better informed theoretical and methodological decisions and nonreligious people benefit from their more accurate representation in academic research",
				"callNumber": "0",
				"language": "eng",
				"libraryCatalog": "ixtheo.de",
				"publicationTitle": "Secularism and Nonreligion",
				"attachments": [],
				"tags": [
					{
						"tag": "Mixed Methods"
					},
					{
						"tag": "Nonreligion"
					},
					{
						"tag": "feminist methods"
					},
					{
						"tag": "intersectionality, epistemology"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ixtheo.de/Record/1751747190",
		"items": [
			{
				"itemType": "book",
				"title": "Orthodox Christianity, new age spirituality and vernacular religion: the evil eye in Greece",
				"creators": [
					{
						"firstName": "Eugenia",
						"lastName": "Roussou",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"ISBN": "9781350152823 9781350152809 9781350225398 9781350152793 9781350152816",
				"callNumber": "BL980.G8",
				"edition": "First edition",
				"language": "eng",
				"libraryCatalog": "ixtheo.de",
				"numPages": "1",
				"place": "London",
				"publisher": "Bloomsbury Academic",
				"series": "Bloomsbury advances in religious studies",
				"shortTitle": "Orthodox Christianity, new age spirituality and vernacular religion",
				"attachments": [],
				"tags": [
					{
						"tag": "Christianity and other religions"
					},
					{
						"tag": "Electronic books"
					},
					{
						"tag": "Folklore, myths & legends"
					},
					{
						"tag": "Greece"
					},
					{
						"tag": "Greece"
					},
					{
						"tag": "Greece"
					},
					{
						"tag": "New Age movement"
					},
					{
						"tag": "New Age movement"
					},
					{
						"tag": "Orthodox Eastern Church"
					},
					{
						"tag": "Religion"
					}
				],
				"notes": [
					{
						"note": "Includes bibliographical references and index"
					},
					{
						"note": "1. Introduction -- 2. The New Age of Greek Religiosity: Orthodox Christianity and Beyond -- 3. Matiasma : the Energetic Interplay of Senses and Emotions -- 4. Ksematiasma : Healing, Power, Performance -- 5. Creative Syntheses through Material Culture: the Evil Eye in the Spiritual Marketplace -- 6. The Pluralistic Landscape of Greek Religiosity: Religion and Spirituality at a Global Age -- 7. Conclusion -- Bibliography -- Index \"This anthropological work thoroughly illustrates the novel synthesis of Christian religion and New Age spirituality in Greece. It challenges the single-faith approach that traditionally ties southern European countries to Christianity and focuses on how processes of globalization influence and transform vernacular religiosity. Based on long-term anthropological fieldwork in Greece, this book demonstrates how the popular belief in the 'evil eye' produces a creative affinity between religion and spirituality in everyday practice. The author analyses a variety of significant research themes, including lived and vernacular religion, alternative spirituality and healing, ritual performance and religious material culture. The book offers an innovative social scientific interpretation of contemporary religiosity, while engaging with a multiplicity of theoretical, analytic and empirical directions. It contributes to current key debates in social sciences with regard to globalization and secularization, religious pluralism, contemporary spirituality and the New Age movement, gender, power and the body, health, illness and alternative therapeutic systems, senses, perception and the supernatural, the spiritual marketplace, creativity and the individualization of religion in a multicultural world\"--"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ixtheo.de/Record/1775609642",
		"items": [
			{
				"itemType": "book",
				"title": "Vielfalt und Gemeinsinn: der Beitrag der evangelischen Kirche zu Freiheit und gesellschaftlichem Zusammenhalt: ein Grundlagentext der Kammer für Öffentliche Verantwortung der EKD",
				"creators": [
					{
						"lastName": "Evangelische Kirche in Deutschland",
						"creatorType": "author",
						"fieldMode": true
					},
					{
						"lastName": "Evangelische Kirche in Deutschland",
						"creatorType": "contributor",
						"fieldMode": true
					}
				],
				"date": "2021",
				"ISBN": "9783374070091",
				"callNumber": "261.8088284",
				"language": "ger",
				"libraryCatalog": "ixtheo.de",
				"numPages": "93",
				"place": "Leipzig",
				"publisher": "Evangelische Verlagsanstalt",
				"shortTitle": "Vielfalt und Gemeinsinn",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ixtheo.de/Record/1174446536",
		"items": [
			{
				"itemType": "manuscript",
				"title": "Miterlebtes zum Thema: Deutsche und Juden im 20. Jahrhundert: Bericht und Berichte für meine Enkelkinder 40 Jahre nach der 'Reichs-Kristallnacht 1938'",
				"creators": [
					{
						"firstName": "Karl August",
						"lastName": "Viering",
						"creatorType": "author"
					}
				],
				"date": "1978",
				"callNumber": "1",
				"language": "ger",
				"libraryCatalog": "ixtheo.de",
				"numPages": "7",
				"place": "S.l.",
				"shortTitle": "Miterlebtes zum Thema",
				"attachments": [],
				"tags": [
					{
						"tag": "Handschrift"
					}
				],
				"notes": [
					{
						"note": "Kopierte Handschrift des Verfassers"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ixtheo.de/Record/1813400776",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Pedagogias de uma fé inteligente: espiritualidade neoliberal e narrativas de desenvolvimento pessoal na biografia de Edir Macedo",
				"creators": [
					{
						"firstName": "Emanuelle Gonçalves Brandão",
						"lastName": "Rodrigues",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"ISSN": "2179-0019",
				"abstractNote": "Our proposal is to analyze Edir Macedo's narratives of himself from a hermeneutic study of the biography Nada a Perder (Nothing to lose) - vols. 1, 2 and 3, written in co-authorship with Douglas Tavolaro. The current paper is based on Paul Ricoeur’s hermeneutic perspective (1976, 2006, 2010), for whom the narrative arises from the dialectic between reality and fiction, past and present, all articulated through a narrative configuration that has as its constituent process the composition of the intrigue. The study indicates that more than an example of life, the narratives that constitute Macedo's biography materialize a particular type of pedagogy that teaches its readers to act according to the precepts of the \"intelligent faith\" from Universal Church of the Kingdom of the God, which is anchored not only in a political rationality, but also in a neoliberal spirituality",
				"callNumber": "0",
				"language": "por",
				"libraryCatalog": "ixtheo.de",
				"pages": "48-66",
				"publicationTitle": "Plura, revista de estudos de religião",
				"shortTitle": "Pedagogias de uma fé inteligente",
				"attachments": [],
				"tags": [
					{
						"tag": "Espiritualidade neoliberal"
					},
					{
						"tag": "Fé inteligente"
					},
					{
						"tag": "Igreja Universal"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ixtheo.de/Record/1766373054",
		"items": [
			{
				"itemType": "thesis",
				"title": "Der Klerus des spätantiken Italiens im Spiegel epigraphischer Zeugnisse: eine soziohistorische Studie",
				"creators": [
					{
						"firstName": "Isabelle",
						"lastName": "Mossong",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"archive": "De Gruyter",
				"callNumber": "930",
				"language": "ger",
				"libraryCatalog": "ixtheo.de",
				"numPages": "696",
				"place": "Berlin Boston",
				"shortTitle": "Der Klerus des spätantiken Italiens im Spiegel epigraphischer Zeugnisse",
				"university": "De Gruyter",
				"attachments": [],
				"tags": [
					{
						"tag": "Hochschulschrift"
					},
					{
						"tag": "Quelle"
					},
					{
						"tag": "Verzeichnis"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ixtheo.de/Record/178200422X",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Redaktionsgeschichte und Hermeneutik: die Frage der guten Werke in der Confessio Augustana",
				"creators": [
					{
						"firstName": "Volker",
						"lastName": "Leppin",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"ISBN": "9783110683769",
				"bookTitle": "Die \"Confessio Augustana\" im ökumenischen Gespräch",
				"callNumber": "1",
				"language": "ger",
				"libraryCatalog": "ixtheo.de",
				"pages": "51-62",
				"place": "Berlin",
				"publisher": "De Gruyter",
				"shortTitle": "Redaktionsgeschichte und Hermeneutik",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ixtheo.de/Record/LR118504797",
		"items": [
			{
				"itemType": "manuscript",
				"title": "Archivmaterialien zu Miguel Ángel Asturias, 1899-1974",
				"creators": [
					{
						"firstName": "Miguel Ángel",
						"lastName": "Asturias",
						"creatorType": "author"
					}
				],
				"libraryCatalog": "ixtheo.de",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ixtheo.de/Record/179007875X",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "Weit weg von Wellness: tantrisch-buddhistische Rituale an der Seidenstraße",
				"creators": [
					{
						"firstName": "Carmen",
						"lastName": "Meinert",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"callNumber": "0",
				"language": "ger",
				"libraryCatalog": "ixtheo.de",
				"place": "Bochum",
				"shortTitle": "Weit weg von Wellness",
				"studio": "CERES_RUB",
				"attachments": [],
				"tags": [
					{
						"tag": "Film"
					}
				],
				"notes": [
					{
						"note": "Vortrag, gehalten am 14.02. 2022, 18:00 bis 19:15"
					}
				],
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
		"url": "https://ixtheo.de/Record/1797080237",
		"items": [
			{
				"itemType": "artwork",
				"title": "Wilhelm Eberschweiler SJ 1837-1921: zum 100. Todestag am 23. Dezember 2021",
				"creators": [
					{
						"firstName": "Clemens",
						"lastName": "Brodkorb",
						"creatorType": "author"
					},
					{
						"firstName": "Niccolo",
						"lastName": "Steiner",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Fischer",
						"creatorType": "contributor"
					},
					{
						"firstName": "Wilhelm",
						"lastName": "Eberschweiler",
						"creatorType": "author"
					},
					{
						"lastName": "Jesuiten",
						"creatorType": "contributor",
						"fieldMode": true
					}
				],
				"date": "2021",
				"callNumber": "230",
				"language": "ger",
				"libraryCatalog": "ixtheo.de",
				"shortTitle": "Wilhelm Eberschweiler SJ 1837-1921",
				"attachments": [],
				"tags": [
					{
						"tag": "Festschrift"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ixtheo.de/Record/1776265076",
		"items": [
			{
				"itemType": "book",
				"title": "Herrnhuter Missionare",
				"creators": [
					{
						"lastName": "Zentrum für Allgemeine Wissenschaftliche Weiterbildung",
						"creatorType": "author",
						"fieldMode": true
					}
				],
				"date": "2001",
				"callNumber": "230",
				"language": "ger",
				"libraryCatalog": "ixtheo.de",
				"place": "Ulm",
				"publisher": "Universität Ulm",
				"attachments": [],
				"tags": [
					{
						"tag": "Brüdergemeine"
					},
					{
						"tag": "Website"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ixtheo.de/Record/135015265X",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Hl. Pelagius, Märtyrer",
				"creators": [
					{
						"firstName": "Wilhelm",
						"lastName": "Kohl",
						"creatorType": "author"
					}
				],
				"date": "1994",
				"callNumber": "1",
				"language": "ger",
				"libraryCatalog": "ixtheo.de",
				"pages": "173-174",
				"publicationTitle": "Biographisch-bibliographisches Kirchenlexikon ; 7: [Patočka, Jan - Remachus]",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://relbib.de/Record/1698984863",
		"items": [
			{
				"itemType": "book",
				"title": "Rationalisierung und säkulare Gesellschaft: Beiträge zur Religionssoziologie",
				"creators": [
					{
						"firstName": "Gernot",
						"lastName": "Saalmann",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISBN": "9783956507083",
				"callNumber": "306.6",
				"language": "ger",
				"libraryCatalog": "relbib.de",
				"numPages": "1",
				"place": "Baden-Baden",
				"publisher": "Ergon Verlag",
				"series": "Bibliotheca Academica Reihe Religionswissenschaft",
				"seriesNumber": "Band 1",
				"shortTitle": "Rationalisierung und säkulare Gesellschaft",
				"attachments": [],
				"tags": [
					{
						"tag": "Bourdieu"
					},
					{
						"tag": "Durkheim"
					},
					{
						"tag": "Fundamentalismus"
					},
					{
						"tag": "Gesellschaft"
					},
					{
						"tag": "Hindunationalismus"
					},
					{
						"tag": "Max Weber"
					},
					{
						"tag": "Max Weber"
					},
					{
						"tag": "Religionssoziologie"
					},
					{
						"tag": "Religiöser Wandel"
					},
					{
						"tag": "Secularization"
					},
					{
						"tag": "Society"
					},
					{
						"tag": "Säkularisierung"
					},
					{
						"tag": "Weber"
					},
					{
						"tag": "politische Religionen"
					},
					{
						"tag": "sociology of religion"
					}
				],
				"notes": [
					{
						"note": "Die im vorliegenden Band versammelten Aufsätze sind durch eine stringent eingenommene kulturanthropologische und wissenssoziologische Perspektive verbunden. Demnach ist Religion – neben dem Common sense, der Kunst, der Philosophie oder der Wissenschaft – eine von vielen Facetten des menschlichen Lebens und kann als Prozess betrachtet wie auch historisch-reflexiv thematisiert werden. Wie die Umwelt des Menschen sich fortwährend wandelt, so verändern sich auch Form und Stellenwert von Religion. Dies zeigt ein Blick in die europäische, aber auch in die indische Religionsgeschichte, wobei die Beschäftigung mit Indien dabei hilft, einen Eurozentrismus zu korrigieren. Neben den ausführlich behandelten klassischen Autoren Durkheim, Weber, Geertz und Bourdieu, finden auch Marx, Otto, Wittgenstein, Luckmann, Berger, Gandhi und Madan Berücksichtigung This collection of articles and lectures discusses the contributions of some of the most outstanding figures in the field of research on religion, like Durkheim, Weber, Geertz and Bourdieu. A second focus is on the heated debates on religion as a concept, modernization, secularization and the effects of globalization on religion. While accepting many points of criticism the concepts are still found to be useful. The same applies to fundamentalism and political religion. To provincialize Europe reference is made to India throughout the texts"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://relbib.de/Record/1810681499",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Wahrheit – Lüge – Wahrhaftigkeit: Zum Umgang mit Relativitäten nach Bonhoeffers Situationsethik",
				"creators": [
					{
						"firstName": "Hartmut",
						"lastName": "Rosenau",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"DOI": "10.30965/23642807-bja10042",
				"ISSN": "2364-2807",
				"abstractNote": "This article deals with Bonhoeffer’s ethics as an example for a so-called Christian utilitarianism. Within this framework, which is a consequence of a specific Christian understanding of reality and of a specific view on human existence, we can face ambiguities of life including moral ambivalences of truth and lies depending on different concrete situations. One of the main theological preconditions for doing so is the trust in God’s reconciliation of our God-less world in Christ. This conviction leads us to overtake moral responsibility including risks of becoming guilty in a tension between doubts and truthfulness",
				"callNumber": "0",
				"language": "eng",
				"libraryCatalog": "relbib.de",
				"pages": "67-82",
				"publicationTitle": "Interdisciplinary journal for religion and transformation in contemporary society",
				"shortTitle": "Wahrheit – Lüge – Wahrhaftigkeit",
				"attachments": [],
				"tags": [
					{
						"tag": "Guilt"
					},
					{
						"tag": "Reconciliation"
					},
					{
						"tag": "Responsibility"
					},
					{
						"tag": "Truth"
					},
					{
						"tag": "Utilitarianism"
					},
					{
						"tag": "lies"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ixtheo.de/Search/Results?lookfor=&type=AllFields&filter%5B%5D=%7Eformat%3A%22Weblog%22&limit=20&botprotect=",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://relbib.de/Search/Results?lookfor=&type=AllFields&filter%5B%5D=%7Eformat%3A%22Weblog%22&limit=20&botprotect=",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
