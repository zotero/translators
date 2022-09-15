{
	"translatorID": "c73a4a8c-3ef1-4ec8-8229-7531ee384cc4",
	"label": "Open WorldCat",
	"creator": "Simon Kornblith, Sebastian Karcher, Abe Jellinek",
	"target": "^https?://([^/]+\\.)?worldcat\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 12,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-09-01 00:00:33"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Simon Kornblith, Sebastian Karcher, and Abe Jellinek

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

// http://www.loc.gov/marc/relators/relaterm.html
// From MARC.js
const RELATORS = {
	act: "castMember",
	asn: "contributor", // Associated name
	aut: "author",
	cmp: "composer",
	ctb: "contributor",
	drt: "director",
	edt: "editor",
	pbl: "SKIP", // publisher
	prf: "performer",
	pro: "producer",
	pub: "SKIP", // publication place
	trl: "translator"
};

const RECORD_MAPPING = {
	oclcNumber: (item, value) => item.extra = (item.extra || '') + `\nOCLC: ${value}`,
	title: (item, value) => item.title = value.replace(' : ', ': '),
	edition: 'edition',
	publisher: 'publisher',
	publicationPlace: 'place',
	publicationDate: (item, value) => item.date = ZU.strToISO(value),
	catalogingLanguage: 'language',
	summary: 'abstractNote',
	physicalDescription: (item, value) => {
		item.numPages = (value.match(/\d+(?= pages?)/) || value.match(/\d+/) || [])[0];
	},
	series: 'series',
	subjectsText: 'tags',
	cartographicData: 'scale',
	// genre: 'genre',
	doi: (item, value) => item.DOI = ZU.cleanDOI(value),
	mediumOfPerformance: 'medium',
	issns: (item, value) => item.ISSN = ZU.cleanISSN(value),
	sourceIssn: (item, value) => item.ISSN = ZU.cleanISSN(value),
	digitalAccessAndLocations: (item, value) => {
		if (value.length) {
			item.url = value[0].uri;
		}
	},
	isbns: (item, value) => item.ISBN = ZU.cleanISBN(value.join(' ')),
	isbn13: (item, value) => item.ISBN = ZU.cleanISBN(value),
	publication: (item, value) => {
		try {
			let [, publicationTitle, volume, date, page] = value.match(/^(.+), (.+), (.+), (.+)$/);
			item.publicationTitle = publicationTitle;
			item.volume = volume;
			item.date = ZU.strToISO(date);
			item.pages = page;
		}
		catch (e) {
			Z.debug(e);
		}
	},
	contributors: (item, value) => {
		for (let contrib of value) {
			let creatorType;
			if (contrib.relatorCodes && contrib.relatorCodes[0]) {
				creatorType = RELATORS[contrib.relatorCodes[0]] || 'contributor';
				if (creatorType == 'SKIP') continue;
			}
			else {
				creatorType = ZU.getCreatorsForType(item.itemType)[0];
			}
			let creator = {
				firstName: contrib.firstName && contrib.firstName.text,
				lastName: contrib.secondName && contrib.secondName.text,
				creatorType
			};
			// If only firstName field, set as single-field name
			if (creator.firstName && !creator.lastName) {
				creator.lastName = creator.firstName;
				delete creator.firstName;
				creator.fieldMode = 1;
			}
			item.creators.push(creator);
		}
	}
};

function detectWeb(doc, url) {
	if (url.includes('/title/') && doc.querySelector('#__NEXT_DATA__')) {
		return getItemType(JSON.parse(text(doc, '#__NEXT_DATA__')).props.pageProps.record);
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getItemType(record) {
	if (record.generalFormat == 'ArtChap') {
		if (record.specificFormat == 'Artcl') {
			return 'journalArticle';
		}
		else {
			return 'bookSection';
		}
	}
	else {
		return 'book';
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.MuiGrid-item a[href*="/title/"]:not([data-testid^="format-link"])');
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

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (items) {
			await Promise.all(
				Object.keys(items)
					.map(url => requestDocument(url).then(scrape))
			);
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	let record = JSON.parse(text(doc, '#__NEXT_DATA__')).props.pageProps.record;
	if (!url.includes('/' + record.oclcNumber)) {
		Zotero.debug('__NEXT_DATA__ is stale; requesting page again');
		doc = await requestDocument(url);
		record = JSON.parse(text(doc, '#__NEXT_DATA__')).props.pageProps.record;
	}
	scrapeRecord([record]);
}

function scrapeRecord(records) {
	for (let record of records) {
		Z.debug(record);

		if (record.doi) {
			let translate = Z.loadTranslator('search');
			translate.setSearch({ DOI: record.doi });
			translate.setTranslator('b28d0d42-8549-4c6d-83fc-8382874a5cb9'); // DOI Content Negotiation
			translate.translate();
			continue;
		}

		let item = new Zotero.Item(getItemType(record));
		for (let [key, mapper] of Object.entries(RECORD_MAPPING)) {
			if (!record[key]) continue;
			if (typeof mapper == 'string') {
				item[mapper] = record[key];
			}
			else {
				mapper(item, record[key]);
			}
		}

		for (let keyToFix of ['title', 'publisher', 'place']) {
			if (item[keyToFix]) {
				item[keyToFix] = item[keyToFix].replace(/^\[(.+)\]$/, '$1');
			}
		}

		item.complete();
	}
}

function sanitizeInput(items, checkOnly) {
	if (items.length === undefined || typeof items == 'string') {
		items = [items];
	}
	
	var cleanItems = [];
	for (let i = 0; i < items.length; i++) {
		var item = ZU.deepCopy(items[i]),
			valid = false;
		if (item.ISBN && typeof item.ISBN == 'string'
			&& (item.ISBN = ZU.cleanISBN(item.ISBN))
		) {
			valid = true;
		}
		else {
			delete item.ISBN;
		}
		
		if (item.identifiers && typeof item.identifiers.oclc == 'string'
			&& /^\d+$/.test(item.identifiers.oclc.trim())
		) {
			valid = true;
			item.identifiers.oclc = item.identifiers.oclc.trim();
		}
		else if (item.identifiers) {
			delete item.identifiers.oclc;
		}
		
		if (valid) {
			if (checkOnly) return true;
			cleanItems.push(item);
		}
	}
	
	return checkOnly ? !!cleanItems.length : cleanItems;
}

function detectSearch(items) {
	return sanitizeInput(items, true);
}

function doSearch(items) {
	items = sanitizeInput(items);
	if (!items.length) {
		Z.debug("Search query does not contain valid identifiers");
		return;
	}
	
	var ids = [], isbns = [];
	for (let i = 0; i < items.length; i++) {
		if (items[i].identifiers && items[i].identifiers.oclc) {
			ids.push(items[i].identifiers.oclc);
			continue;
		}
		
		isbns.push(items[i].ISBN);
	}
	
	fetchIDs(isbns, ids, function (ids) {
		if (!ids.length) {
			Z.debug("Could not retrieve any OCLC IDs");
			Zotero.done(false);
			return;
		}
		var url = "https://www.worldcat.org/api/search?q=no%3A"
			+ ids.map(encodeURIComponent).join('+OR+no%3A');
		ZU.doGet(url, function (respText) {
			let json = JSON.parse(respText);
			if (json.briefRecords) {
				scrapeRecord(json.briefRecords);
			}
		});
	});
}

function fetchIDs(isbns, ids, callback) {
	if (!isbns.length) {
		callback(ids);
		return;
	}
	
	var isbn = isbns.shift();
	var url = "https://www.worldcat.org/api/search?q=bn%3A"
		+ encodeURIComponent(isbn);
	ZU.doGet(url,
		function (respText) {
			let json = JSON.parse(respText);
			if (json.briefRecords && json.briefRecords.length) {
				scrapeRecord([json.briefRecords[0]]);
			}
		},
		function () {
			fetchIDs(isbns, ids, callback);
		}
	);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.worldcat.org/search?qt=worldcat_org_bks&q=argentina&fq=dt%3Abks",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.worldcat.org/title/489605",
		"items": [
			{
				"itemType": "book",
				"title": "Argentina",
				"creators": [
					{
						"firstName": "Arthur Preston",
						"lastName": "Whitaker",
						"creatorType": "author"
					}
				],
				"date": "1964",
				"abstractNote": "\"This book delves into the Argentine past seeking the origins of the political, social, and economic conflicts that have stunted Argentina's development after her spectacular progress during the late nineteenth and early twentieth centuries\"--From book jacket",
				"extra": "OCLC: 489605",
				"language": "eng",
				"libraryCatalog": "Open WorldCat",
				"numPages": "184",
				"place": "Englewood Cliffs, N.J.",
				"publisher": "Prentice-Hall",
				"series": "Spectrum book",
				"attachments": [],
				"tags": [
					{
						"tag": "Argentina"
					},
					{
						"tag": "Argentina Historia 1810-"
					},
					{
						"tag": "Argentina History"
					},
					{
						"tag": "Argentina History 1810-"
					},
					{
						"tag": "Argentine Histoire"
					},
					{
						"tag": "Argentine Histoire 1810-"
					},
					{
						"tag": "Economic history Argentina"
					},
					{
						"tag": "History"
					},
					{
						"tag": "Politics and government Argentina"
					},
					{
						"tag": "Since 1810"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.worldcat.org/title/42854423",
		"items": [
			{
				"itemType": "book",
				"title": "A dynamic systems approach to the development of cognition and action",
				"creators": [
					{
						"firstName": "Esther",
						"lastName": "Thelen",
						"creatorType": "author"
					},
					{
						"firstName": "Linda B.",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"date": "1996",
				"ISBN": "9780585030159",
				"abstractNote": "Annotation. A Dynamic Systems Approach to the Development of Cognition and Action presents a comprehensive and detailed theory of early human development based on the principles of dynamic systems theory. Beginning with their own research in motor, perceptual, and cognitive development, Thelen and Smith raise fundamental questions about prevailing assumptions in the field. They propose a new theory of the development of cognition and action, unifying recent advances in dynamic systems theory with current research in neuroscience and neural development. In particular, they show how by processes of exploration and selection, multimodal experiences form the bases for self-organizing perception-action categories. Thelen and Smith offer a radical alternative to current cognitive theory, both in their emphasis on dynamic representation and in their focus on processes of change. Among the first attempt to apply complexity theory to psychology, they suggest reinterpretations of several classic issues in early cognitive development. The book is divided into three sections. The first discusses the nature of developmental processes in general terms, the second covers dynamic principles in process and mechanism, and the third looks at how a dynamic theory can be applied to enduring puzzles of development. Cognitive Psychology series",
				"edition": "1st MIT pbk. ed",
				"extra": "OCLC: 42854423",
				"language": "eng",
				"libraryCatalog": "Open WorldCat",
				"numPages": "376",
				"place": "Cambridge, Mass.",
				"publisher": "MIT Press",
				"series": "MIT Press/Bradford Books series in cognitive psychology",
				"url": "http://search.ebscohost.com/login.aspx?direct=true&scope=site&db=nlebk&db=nlabk&AN=1712",
				"attachments": [],
				"tags": [
					{
						"tag": "Activité motrice"
					},
					{
						"tag": "Activité motrice chez le nourrisson"
					},
					{
						"tag": "Child"
					},
					{
						"tag": "Child Development"
					},
					{
						"tag": "Child development"
					},
					{
						"tag": "Children"
					},
					{
						"tag": "Cognition"
					},
					{
						"tag": "Cognition chez le nourrisson"
					},
					{
						"tag": "Cognition in infants"
					},
					{
						"tag": "Developmental psychobiology"
					},
					{
						"tag": "Electronic books"
					},
					{
						"tag": "Enfants"
					},
					{
						"tag": "Enfants Développement"
					},
					{
						"tag": "FAMILY & RELATIONSHIPS Life Stages Infants & Toddlers"
					},
					{
						"tag": "Infant"
					},
					{
						"tag": "Infants"
					},
					{
						"tag": "Motor Skills"
					},
					{
						"tag": "Motor ability"
					},
					{
						"tag": "Motor ability in infants"
					},
					{
						"tag": "Nourrissons"
					},
					{
						"tag": "Perceptual-motor processes"
					},
					{
						"tag": "Processus perceptivomoteurs"
					},
					{
						"tag": "Psychobiologie du développement"
					},
					{
						"tag": "System theory"
					},
					{
						"tag": "Systems Theory"
					},
					{
						"tag": "Théorie des systèmes"
					},
					{
						"tag": "children (people by age group)"
					},
					{
						"tag": "cognition"
					},
					{
						"tag": "infants"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.worldcat.org/title/60321422",
		"items": [
			{
				"itemType": "book",
				"title": "The Cambridge companion to Adam Smith",
				"creators": [
					{
						"firstName": "Knud",
						"lastName": "Haakonssen",
						"creatorType": "author"
					}
				],
				"date": "2006",
				"ISBN": "9780521770590",
				"abstractNote": "\"Adam Smith is best known as the founder of scientific economics and as an early proponent of the modern market economy. Political economy, however, was only one part of Smith's comprehensive intellectual system. Consisting of a theory of mind and its functions in language, arts, science, and social intercourse, Smith's system was a towering contribution to the Scottish Enlightenment. His ideas on social intercourse, in fact, also served as the basis for a moral theory that provided both historical and theoretical accounts of law, politics, and economics. This companion volume provides an up-to-date examination of all aspects of Smith's thought. Collectively, the essays take into account Smith's multiple contexts - Scottish, British, European, Atlantic, biographical, institutional, political, philosophical - and they draw on all his works, including student notes from his lectures. Pluralistic in approach, the volume provides a contextualist history of Smith, as well as direct philosophical engagement with his ideas.\"--Jacket",
				"extra": "OCLC: 60321422",
				"language": "eng",
				"libraryCatalog": "Open WorldCat",
				"numPages": "409",
				"place": "Cambridge",
				"publisher": "Cambridge University Press",
				"series": "Cambridge companions to philosophy",
				"url": "http://catdir.loc.gov/catdir/toc/ecip0512/2005011910.html",
				"attachments": [],
				"tags": [
					{
						"tag": "Aufsatzsammlung"
					},
					{
						"tag": "Filosofie"
					},
					{
						"tag": "Smith, Adam"
					},
					{
						"tag": "Smith, Adam 1723-1790"
					},
					{
						"tag": "Smith, Adam Philosoph"
					},
					{
						"tag": "Smith, Adam, 1723-1790"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.worldcat.org/title/from-lanka-eastwards-the-ramayana-in-the-literature-and-visual-arts-of-indonesia/oclc/765821302",
		"items": [
			{
				"itemType": "book",
				"title": "From Laṅkā eastwards: the Rāmāyaṇa in the literature and visual arts of Indonesia",
				"creators": [
					{
						"firstName": "Andrea",
						"lastName": "Acri",
						"creatorType": "author"
					},
					{
						"firstName": "Helen",
						"lastName": "Creese",
						"creatorType": "author"
					},
					{
						"firstName": "Arlo",
						"lastName": "Griffiths",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"ISBN": "9789067183840",
				"extra": "OCLC: 765821302",
				"language": "eng",
				"libraryCatalog": "Open WorldCat",
				"numPages": "259",
				"place": "Leiden",
				"publisher": "KITLV Press",
				"series": "Verhandelingen van het Koninklijk Instituut voor Taal-, Land- en Volkenkunde",
				"shortTitle": "From Laṅkā eastwards",
				"attachments": [],
				"tags": [
					{
						"tag": "Art indonésien Congrès"
					},
					{
						"tag": "Art, Indonesian"
					},
					{
						"tag": "Art, Indonesian Congresses"
					},
					{
						"tag": "Conference papers and proceedings"
					},
					{
						"tag": "Epen (teksten)"
					},
					{
						"tag": "History Sources"
					},
					{
						"tag": "Kakawin Ramayana"
					},
					{
						"tag": "Kunst"
					},
					{
						"tag": "Literatur"
					},
					{
						"tag": "Râmâyaṇa (Old Javanese kakawin)"
					},
					{
						"tag": "Râmâyaṇa (Old Javanese kakawin) Congresses"
					},
					{
						"tag": "Râmâyaṇa (Old Javanese kakawin) Sources Congresses"
					},
					{
						"tag": "Rezeption"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.worldcat.org/title/newmans-relation-to-modernism/oclc/676747555",
		"items": [
			{
				"itemType": "book",
				"title": "Newman's relation to modernism",
				"creators": [
					{
						"firstName": "Sydney F.",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"date": "1912",
				"extra": "OCLC: 847984210",
				"language": "eng",
				"libraryCatalog": "Open WorldCat",
				"numPages": "1",
				"place": "London",
				"publisher": "publisher not identified",
				"url": "https://archive.org/details/a626827800smituoft/",
				"attachments": [],
				"tags": [
					{
						"tag": "Modernism (Christian theology) Catholic Church"
					},
					{
						"tag": "Newman, John Henry, Saint, 1801-1890"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.worldcat.org/title/48394842",
		"items": [
			{
				"itemType": "book",
				"title": "Cahokia Mounds replicas",
				"creators": [
					{
						"firstName": "Martha LeeAnn",
						"lastName": "Grimont",
						"creatorType": "author"
					},
					{
						"firstName": "Claudia Gellman",
						"lastName": "Mink",
						"creatorType": "author"
					}
				],
				"date": "2000",
				"ISBN": "9781881563020",
				"extra": "OCLC: 48394842",
				"language": "eng",
				"libraryCatalog": "Open WorldCat",
				"numPages": "10",
				"place": "Collinsville, Ill.",
				"publisher": "Cahokia Mounds Museum Society",
				"attachments": [],
				"tags": [
					{
						"tag": "Antiquities"
					},
					{
						"tag": "Cahokia Mounds State Historic Park (Ill.)"
					},
					{
						"tag": "Cahokia Mounds State Historic Park (Ill.) Antiquities Pottery"
					},
					{
						"tag": "Illinois"
					},
					{
						"tag": "Illinois Antiquities Pottery"
					},
					{
						"tag": "Illinois Cahokia Mounds State Historic Park"
					},
					{
						"tag": "Indians of North America Antiquities"
					},
					{
						"tag": "Indians of North America Illinois Antiquities"
					},
					{
						"tag": "Mound-builders"
					},
					{
						"tag": "Mound-builders Illinois"
					},
					{
						"tag": "Mounds"
					},
					{
						"tag": "Mounds Illinois"
					},
					{
						"tag": "Pottery"
					},
					{
						"tag": "Pottery Illinois"
					},
					{
						"tag": "Tumulus Illinois"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"ISBN": "9780585030159"
		},
		"items": [
			{
				"itemType": "book",
				"title": "A dynamic systems approach to the development of cognition and action",
				"creators": [
					{
						"firstName": "Esther",
						"lastName": "Thelen",
						"creatorType": "author"
					},
					{
						"firstName": "Linda B.",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"date": "1996",
				"ISBN": "9780585030159",
				"abstractNote": "Annotation. A Dynamic Systems Approach to the Development of Cognition and Action presents a comprehensive and detailed theory of early human development based on the principles of dynamic systems theory. Beginning with their own research in motor, perceptual, and cognitive development, Thelen and Smith raise fundamental questions about prevailing assumptions in the field. They propose a new theory of the development of cognition and action, unifying recent advances in dynamic systems theory with current research in neuroscience and neural development. In particular, they show how by processes of exploration and selection, multimodal experiences form the bases for self-organizing perception-action categories. Thelen and Smith offer a radical alternative to current cognitive theory, both in their emphasis on dynamic representation and in their focus on processes of change. Among the first attempt to apply complexity theory to psychology, they suggest reinterpretations of several classic issues in early cognitive development. The book is divided into three sections. The first discusses the nature of developmental processes in general terms, the second covers dynamic principles in process and mechanism, and the third looks at how a dynamic theory can be applied to enduring puzzles of development. Cognitive Psychology series",
				"edition": "1st MIT pbk. ed",
				"extra": "OCLC: 42854423",
				"language": "eng",
				"libraryCatalog": "Open WorldCat",
				"place": "Cambridge, Mass.",
				"publisher": "MIT Press",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"identifiers": {
				"oclc": "42854423"
			}
		},
		"items": [
			{
				"itemType": "book",
				"title": "A dynamic systems approach to the development of cognition and action",
				"creators": [
					{
						"firstName": "Esther",
						"lastName": "Thelen",
						"creatorType": "author"
					},
					{
						"firstName": "Linda B.",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"date": "1996",
				"ISBN": "9780585030159",
				"abstractNote": "Annotation. A Dynamic Systems Approach to the Development of Cognition and Action presents a comprehensive and detailed theory of early human development based on the principles of dynamic systems theory. Beginning with their own research in motor, perceptual, and cognitive development, Thelen and Smith raise fundamental questions about prevailing assumptions in the field. They propose a new theory of the development of cognition and action, unifying recent advances in dynamic systems theory with current research in neuroscience and neural development. In particular, they show how by processes of exploration and selection, multimodal experiences form the bases for self-organizing perception-action categories. Thelen and Smith offer a radical alternative to current cognitive theory, both in their emphasis on dynamic representation and in their focus on processes of change. Among the first attempt to apply complexity theory to psychology, they suggest reinterpretations of several classic issues in early cognitive development. The book is divided into three sections. The first discusses the nature of developmental processes in general terms, the second covers dynamic principles in process and mechanism, and the third looks at how a dynamic theory can be applied to enduring puzzles of development. Cognitive Psychology series",
				"edition": "1st MIT pbk. ed",
				"extra": "OCLC: 42854423",
				"language": "eng",
				"libraryCatalog": "Open WorldCat",
				"place": "Cambridge, Mass.",
				"publisher": "MIT Press",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.worldcat.org/title/4933578953",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Navigating the trilemma: Capital flows and monetary policy in China",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Reuven",
						"lastName": "Glick"
					},
					{
						"creatorType": "author",
						"firstName": "Michael",
						"lastName": "Hutchison"
					}
				],
				"date": "5/2009",
				"DOI": "10.1016/j.asieco.2009.02.011",
				"ISSN": "10490078",
				"issue": "3",
				"journalAbbreviation": "Journal of Asian Economics",
				"language": "en",
				"libraryCatalog": "DOI.org (Crossref)",
				"pages": "205-224",
				"publicationTitle": "Journal of Asian Economics",
				"shortTitle": "Navigating the trilemma",
				"url": "https://linkinghub.elsevier.com/retrieve/pii/S104900780900013X",
				"volume": "20",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.worldcat.org/search?q=isbn%3A7112062314",
		"items": [
			{
				"itemType": "book",
				"title": "中囯园林假山",
				"creators": [
					{
						"lastName": "毛培琳",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "朱志红",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2005",
				"ISBN": "9787112062317",
				"extra": "OCLC: 77641948",
				"language": "Chinese",
				"libraryCatalog": "Open WorldCat",
				"place": "北京",
				"publisher": "中囯建筑工业出版社",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.worldcat.org/title/994342191",
		"items": [
			{
				"itemType": "book",
				"title": "Medieval science, technology and medicine: an encyclopedia",
				"creators": [
					{
						"firstName": "Thomas F.",
						"lastName": "Glick",
						"creatorType": "editor"
					},
					{
						"firstName": "Steven J.",
						"lastName": "Livesey",
						"creatorType": "editor"
					},
					{
						"firstName": "Faith",
						"lastName": "Wallis",
						"creatorType": "editor"
					}
				],
				"date": "2017",
				"ISBN": "9781315165127",
				"abstractNote": "\"First published in 2005, this encyclopedia demonstrates that the millennium from the fall of the Roman Empire to the Renaissance was a period of great intellectual and practical achievement and innovation. In Europe, the Islamic world, South and East Asia, and the Americas, individuals built on earlier achievements, introduced sometimes radical refinements and laid the foundations for modern development. Medieval Science, Technology, and Medicine details the whole scope of scientific knowledge in the medieval period in more than 300 A to Z entries. This comprehensive resource discusses the research, application of knowledge, cultural and technology exchanges, experimentation, and achievements in the many disciplines related to science and technology. It also looks at the relationship between medieval science and the traditions it supplanted. Written by a select group of international scholars, this reference work will be of great use to scholars, students, and general readers researching topics in many fields, including medieval studies, world history, history of science, history of technology, history of medicine, and cultural studies.\"--Provided by publisher",
				"extra": "OCLC: 994342191",
				"language": "eng",
				"libraryCatalog": "Open WorldCat",
				"numPages": "598",
				"place": "London",
				"publisher": "Routledge",
				"series": "Routledge revivals",
				"shortTitle": "Medieval science, technology and medicine",
				"url": "https://www.taylorfrancis.com/books/e/9781315165127",
				"attachments": [],
				"tags": [
					{
						"tag": "Electronic books"
					},
					{
						"tag": "Encyclopedias"
					},
					{
						"tag": "Medicine, Medieval"
					},
					{
						"tag": "Medicine, Medieval Encyclopedias"
					},
					{
						"tag": "Médecine médiévale Encyclopédies"
					},
					{
						"tag": "Science, Medieval"
					},
					{
						"tag": "Science, Medieval Encyclopedias"
					},
					{
						"tag": "Sciences médiévales Encyclopédies"
					},
					{
						"tag": "Technologie Encyclopédies"
					},
					{
						"tag": "Technology"
					},
					{
						"tag": "Technology Encyclopedias"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://worldcat.org/title/1023201734",
		"items": [
			{
				"itemType": "book",
				"title": "Alices adventures in wonderland",
				"creators": [
					{
						"firstName": "Lewis",
						"lastName": "Carroll",
						"creatorType": "author"
					},
					{
						"firstName": "Robert",
						"lastName": "Ingpen",
						"creatorType": "contributor"
					}
				],
				"date": "2017",
				"ISBN": "9781786751041",
				"abstractNote": "This edition brings together the complete and unabridged text with more than 70 stunning illustrations by Robert Ingpen, each reflecting his unique style and extraordinary imagination in visualising this enchanting story.",
				"extra": "OCLC: 1023201734",
				"language": "eng",
				"libraryCatalog": "Open WorldCat",
				"numPages": "192",
				"publisher": "Palazzo Editions Ltd",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.worldcat.org/fr/title/960449363",
		"items": [
			{
				"itemType": "book",
				"title": "غرفة واحدة لا تكفي: رواية",
				"creators": [
					{
						"lastName": "سلطان العميمي.",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "عميمي، سلطان علي بن بخيت، 1974-",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2016",
				"ISBN": "9786140214255",
				"edition": "al-Ṭabʻah al-thāniyah",
				"extra": "OCLC: 960449363",
				"language": "ara",
				"libraryCatalog": "Open WorldCat",
				"numPages": "212",
				"place": "Bayrūt, al-Jazāʼir al-ʻĀṣimah",
				"publisher": "منشورات ضفاف ؛ منشورات الاختلاف،",
				"shortTitle": "غرفة واحدة لا تكفي",
				"attachments": [],
				"tags": [
					{
						"tag": "2000-2099"
					},
					{
						"tag": "Arabic fiction"
					},
					{
						"tag": "Arabic fiction 21st century"
					},
					{
						"tag": "Fiction"
					},
					{
						"tag": "Novels"
					},
					{
						"tag": "Roman arabe 21e siècle"
					},
					{
						"tag": "Romans"
					},
					{
						"tag": "novels"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
