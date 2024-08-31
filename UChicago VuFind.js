{
	"translatorID": "f9052879-ab4c-4056-84b4-e963dd98cb5d",
	"label": "UChicago VuFind",
	"creator": "Matt Teichman",
	"target": "^https?://([^/]+\\.)?lib\\.uchicago\\.edu/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-08-17 20:16:09"
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

// MARC retrieval code: run the MARC import translator, then perform a
// few adjustments to the output by looking things up in the MARC
// record

// scrapeMARC function, overall design based on Finna translator
const scrapeMARC = (doc, url) => {
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

	
	// custom UChicago tweaks to the return of the Zotero MARC translator
	const customizeMARC = (doc, item, marc) => {
		// put catalog URL in the entry
		const addUrl = item => item.url = doc.location.href;

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

		// perform the fixes
		addUrl(item);
		fixItemType(item);
		updateCN(item);
		archivePublisher(item);
		makeUniversityPublisher(item);
	};
	
	// this part is based on the Finna translator code
	let cleanURL = url.replace(/[#?].*$/, '').replace(/\/$/, '');
	let marcURL = cleanURL + '/Export?style=MARC';
	
	// use MARC import translator to ingest binary MARC records
	ZU.doGet(marcURL, function (marcData) {
		var success = false;
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("a6ee60df-1ddc-4aae-bb25-45e0537be973");
		translator.setString(marcData);
		translator.setHandler('itemDone', function (_, item) {
			if (item.place) {
				item.place = item.place.replace(/\[[^[]+\]/, '');
			}
		
			if (item.publisher) {
				item.publisher = item.publisher.replace(/&amp;/g, '&');
			}
			success = true;

			// apply the above UChicago customizations
			customizeMARC(doc, item, marcData);
			item.complete();
		});

		translator.setHandler('done', () => {});
		translator.translate();
	});
};

const getSearchResults = (doc) => {
	// get every search result DOM element
	const rowNodes = doc.querySelectorAll('li[id^=result]');
	// make the node list into an array
	const a = Array.from(rowNodes);
	let obj = {};
	// extract information from each li element for output
	const buildOutput = (r) => {
		const linkElement = r.querySelector('.title.getFull');
		const entryUrl = linkElement.href;
		if (!linkElement) return;
		const title = ZU.trimInternal(linkElement.textContent);
		if (entryUrl && title) {
			obj[entryUrl] = title;
		}
	};
	a.map(buildOutput);
	return obj;
};

const detectWeb = (doc, url) => {
	// VuFind URL patterns starting with 'Record' are for single items
	if (url.includes('vufind/Record')) {
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
	else if (url.includes('vufind/Search/Results')) {
		return 'multiple';
		// the translator should do nothing on every other URL pattern
	}
	else {
		return false;
	}
};

const doWeb = (doc, url) => {
	if (detectWeb(doc, url) == 'multiple') {
		// ingest multiple MARC records
		Zotero.selectItems(getSearchResults(doc), (items) => {
			if (items) {
				let itemURLs = Object.keys(items);
				itemURLs.map(url => scrapeMARC(doc, url));
			}
		});
	}
	else {
		// ingest single MARC record
		scrapeMARC(doc, url);
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
				"libraryCatalog": "UChicago VuFind",
				"numPages": "334",
				"place": "New York",
				"publisher": "Penguin",
				"shortTitle": "Eat, pray, love",
				"url": "https://catalog.lib.uchicago.edu/vufind/Record/6422153",
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
				"libraryCatalog": "UChicago VuFind",
				"place": "Eastbourne, England",
				"url": "https://catalog.lib.uchicago.edu/vufind/Record/11893824",
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
				"libraryCatalog": "UChicago VuFind",
				"place": "[New York",
				"publisher": "G.W. & C.B. Colton & Co",
				"url": "https://catalog.lib.uchicago.edu/vufind/Record/4362914",
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
				"libraryCatalog": "UChicago VuFind",
				"numPages": "19",
				"place": "Washington",
				"publisher": "U.S. Dept. of Commerce, National Bureau of Standards : for sale by the Supt. of Docs., U.S. Govt. Print. Off",
				"series": "NBS special publication",
				"seriesNumber": "440",
				"shortTitle": "Color",
				"url": "https://catalog.lib.uchicago.edu/vufind/Record/269312",
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
				"libraryCatalog": "UChicago VuFind",
				"numPages": "48",
				"place": "[College Park, MD?",
				"shortTitle": "The Columbia Physics Department",
				"url": "https://catalog.lib.uchicago.edu/vufind/Record/8066283",
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
				"libraryCatalog": "UChicago VuFind",
				"numPages": "1",
				"place": "Ann Arbor",
				"shortTitle": "Characterizing kinds",
				"university": "University of Chicago",
				"url": "https://catalog.lib.uchicago.edu/vufind/Record/10773190",
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
				"libraryCatalog": "UChicago VuFind",
				"numPages": "212",
				"url": "https://catalog.lib.uchicago.edu/vufind/Record/7143200",
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
	}
]
/** END TEST CASES **/
