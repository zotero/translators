{
	"translatorID": "5f21fe2f-48f2-4b4f-98d2-2dacc761129e",
	"label": "IxTheo/Relbib Vufind",
	"creator": "Timotheus Kim",
	"target": "^https?://([^/]+\\.)?(ixtheo|relbib)\\.de/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-08-24 10:28:17"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Universitätsbibliothek Tübingen.  All rights reserved.

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

// scrapeMARC function, overall design based on UChicago VuFind with few IxTheo specific adjustments

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
			// IxTheo: exclude local MARC fields e.g. "LOC"
			const twelves = raw.match(/\d{12}/g);
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
		const lookupValue = ([l, s]) => dataPortion.substring(s, l + s -1).trim();
		return fields.map(lookupValue);
	};

	// look up the subfields under all the values associated with a
	// given field
	const lookupSubfields = (key, subfield, table) => {
		// look up subfield values for each field, length, and start index
		const subfields = subfield => (value) => {
			const startswith = chr => str => str[0] === chr;
			// IxTheo: other regex for splitting value
			const values = value.split(/(\x1F|\x1e)/i);
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

	
	// custom IxTheo tweaks to the return of the Zotero MARC translator
	const customizeMARC = (doc, item, marc) => {
		// IxTheo|Relbib: put catalog URL in the entry
		const addUrl = (item) => {
			if (url.includes('ixtheo')) {
				item.url = 'https://ixtheo.de/Record/' + callNumber(item);
			} else {
				item.url = 'https://relbib.de/Record/' + callNumber(item);
			}
		};

		const callNumber = item => item.callNumber = lookupValues('001', marc).toString();

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
			// IxTheo: if the marc record include 'cuwlx', it's a dictionaryEntry
			const isDictionaryEntry = marc => marc.includes('\x1Fcuwlx');

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
			else if (isDictionaryEntry(marc)) {
				// a DictionaryEntry is a 'DictionaryEntry';
				item.itemType = "dictionaryEntry";
			}
		};
		
		// IxTheo:300|a replace numPages for eBooks e.g. "0": "1 Online-Ressource (224 pages)"
		const numPagesForEbooks = (item) => {
			const numPage = lookupSubfields('300', 'a', marc);
			if (item.numPages == '1' && numPage.length >= 0) {
				item.numPages = numPage[0].match(/\d+/g)[1];
			}
		};

		// IxTheo:689|a add gnd keywords
		const addGndKeywords = (item) => {
			const gndKeywords = lookupSubfields('689', 'a', marc);
			if (gndKeywords.length >= 0) {
				for (let tag in gndKeywords) {
					item.tags.push(gndKeywords[tag]);
					let allTags = item.tags.map(i => i.trim());
					item.tags = Array.from(new Set(allTags.map(JSON.stringify))).map(JSON.parse);
				}
			}
		};
		
		// IxTheo:773|g field value for year, issue, volume
		const addVolumeYearNumberPages = (item) => {
			const subfieldString = lookupSubfields('773', 'g', marc);
			if (subfieldString.length > 0) {
				for (i in subfieldString) {
					if (!item.volume && subfieldString[i].match(/volume:\d+/gi) !== null) {
						item.volume = subfieldString[i].split(':')[1];
					}
					// IxTheo: 773|g value for month equal with issue volume e.g. "773 1 8 |g volume:118  |g year:2022 |g month:02 |g pages:1-2" 
					if (!item.issue && subfieldString[i].match(/(number:\d+|month:\d+)/gi) !== null) {
					item.issue = subfieldString[i].split(':')[1].replace(/^0/, '');
					}
					if (!item.pages && subfieldString[i].match(/pages:\d+/gi) !== null) {
					item.pages = subfieldString[i].split(':')[1];
					}
				}
			}
		};

		// perform the fixes
		addUrl(item);
		callNumber(item);
		addVolumeYearNumberPages(item);
		numPagesForEbooks(item);
		addGndKeywords(item);
		fixItemType(item);
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
			
			// apply the above IxTheo customizations
			customizeMARC(doc, item, marcData);
			item.complete();
		});

		translator.setHandler('done', () => {});
		translator.translate();
	});
};

const getSearchResults = (doc) => {
	// get every search result DOM element
	const rowNodes = doc.querySelectorAll('[id^=result]');
	// make the node list into an array
	const a = Array.from(rowNodes);
	let obj = {};
	// extract information from each li element for output
	const buildOutput = (r) => {
		const linkElement = r.querySelector('.title');
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
	if (url.includes('/Record/')) {
		if (doc.querySelector('.iconlabel.video')) {
			return 'videoRecording';
		}
		else if (doc.querySelector('.iconlabel.dissertations')) {
			return 'thesis';
		}
		else if (doc.querySelector('.iconlabel.archivesmanuscripts')) {
			return 'manuscript';
		}
		else if (doc.querySelector('.iconlabel.audio')) {
			return 'audioRecording';
		}
		else if (doc.querySelector('.iconlabel.map')) {
			return 'map';
		}
		else if (doc.querySelector('.iconlabel.article')) {
			return 'journalArticle';
		}
		else if (doc.querySelector('.iconlabel.dictionaryentryarticle')) {
			return 'dictionaryEntry';
		}
		else {
			return 'book';
		}
		// VuFind URL patterns starting with 'Search' are for search results
	}
	else if (url.includes('Results')) {
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
				"callNumber": "1698984863",
				"language": "ger",
				"libraryCatalog": "IxTheo Vufind",
				"numPages": "248",
				"place": "Baden-Baden",
				"publisher": "Ergon Verlag",
				"series": "Bibliotheca Academica Reihe Religionswissenschaft",
				"seriesNumber": "Band 1",
				"shortTitle": "Rationalisierung und säkulare Gesellschaft",
				"url": "https://ixtheo.de/Record/1698984863",
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
						"tag": "Moderne"
					},
					{
						"tag": "Religion"
					},
					{
						"tag": "Religionsphilosophie"
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
				"callNumber": "1801688400",
				"issue": "2",
				"language": "ger",
				"libraryCatalog": "IxTheo Vufind",
				"pages": "1-2",
				"publicationTitle": "Theologische Revue",
				"shortTitle": "Kuessner, Dietrich",
				"url": "https://ixtheo.de/Record/1801688400",
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
				"callNumber": "1801673586",
				"language": "eng",
				"libraryCatalog": "IxTheo Vufind",
				"publicationTitle": "Secularism and Nonreligion",
				"url": "https://ixtheo.de/Record/1801673586",
				"volume": "11",
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
				"callNumber": "1751747190",
				"edition": "First edition",
				"language": "eng",
				"libraryCatalog": "IxTheo Vufind",
				"numPages": "224",
				"place": "London",
				"publisher": "Bloomsbury Academic",
				"series": "Bloomsbury advances in religious studies",
				"shortTitle": "Orthodox Christianity, new age spirituality and vernacular religion",
				"url": "https://ixtheo.de/Record/1751747190",
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
				"callNumber": "1775609642",
				"language": "ger",
				"libraryCatalog": "IxTheo Vufind",
				"numPages": "93",
				"place": "Leipzig",
				"publisher": "Evangelische Verlagsanstalt",
				"shortTitle": "Vielfalt und Gemeinsinn",
				"url": "https://ixtheo.de/Record/1775609642",
				"attachments": [],
				"tags": [
					{
						"tag": "Evangelische Kirche"
					},
					{
						"tag": "Evangelische Soziallehre"
					},
					{
						"tag": "Evangelische Theologie"
					},
					{
						"tag": "Freiheit"
					},
					{
						"tag": "Freiheitliche demokratische Grundordnung"
					},
					{
						"tag": "Gemeinschaft"
					},
					{
						"tag": "Gemeinsinn"
					},
					{
						"tag": "Gesellschaft"
					},
					{
						"tag": "Glaube"
					},
					{
						"tag": "Gruppenkohäsion"
					},
					{
						"tag": "Kirchliches Leben"
					},
					{
						"tag": "Pluralistische Gesellschaft"
					},
					{
						"tag": "Praktische Theologie"
					},
					{
						"tag": "Solidarität"
					},
					{
						"tag": "Verschiedenheit"
					},
					{
						"tag": "Vielfalt"
					}
				],
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
				"callNumber": "1174446536",
				"language": "ger",
				"libraryCatalog": "IxTheo Vufind",
				"numPages": "7",
				"place": "S.l.",
				"shortTitle": "Miterlebtes zum Thema",
				"url": "https://ixtheo.de/Record/1174446536",
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
				"callNumber": "1813400776",
				"issue": "1",
				"language": "por",
				"libraryCatalog": "IxTheo Vufind",
				"pages": "48-66",
				"publicationTitle": "Plura, revista de estudos de religião",
				"shortTitle": "Pedagogias de uma fé inteligente",
				"url": "https://ixtheo.de/Record/1813400776",
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
				"callNumber": "1766373054",
				"language": "ger",
				"libraryCatalog": "IxTheo Vufind",
				"numPages": "696",
				"place": "Berlin Boston",
				"shortTitle": "Der Klerus des spätantiken Italiens im Spiegel epigraphischer Zeugnisse",
				"university": "De Gruyter",
				"url": "https://ixtheo.de/Record/1766373054",
				"attachments": [],
				"tags": [
					{
						"tag": "Epigraphik"
					},
					{
						"tag": "Hochschulschrift"
					},
					{
						"tag": "Italien"
					},
					{
						"tag": "Klerus"
					},
					{
						"tag": "Quelle"
					},
					{
						"tag": "Spätantike"
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
				"callNumber": "178200422X",
				"language": "ger",
				"libraryCatalog": "IxTheo Vufind",
				"pages": "51-62",
				"place": "Berlin",
				"publisher": "De Gruyter",
				"shortTitle": "Redaktionsgeschichte und Hermeneutik",
				"url": "https://ixtheo.de/Record/178200422X",
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
				"callNumber": "LR118504797",
				"libraryCatalog": "IxTheo Vufind",
				"url": "https://ixtheo.de/Record/LR118504797",
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
				"callNumber": "179007875X",
				"language": "ger",
				"libraryCatalog": "IxTheo Vufind",
				"place": "Bochum",
				"shortTitle": "Weit weg von Wellness",
				"studio": "CERES_RUB",
				"url": "https://ixtheo.de/Record/179007875X",
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
				"callNumber": "1770813810",
				"label": "Studio Omega, Verein für Christliche Radioarbeit",
				"language": "ger",
				"libraryCatalog": "IxTheo Vufind",
				"place": "Wien",
				"shortTitle": "Diesseits von Eden",
				"url": "https://ixtheo.de/Record/1770813810",
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
				"callNumber": "859089061",
				"language": "ger",
				"libraryCatalog": "IxTheo Vufind",
				"place": "Neukirchen-Vluyn",
				"publisher": "Neukirchener Aussaat",
				"url": "https://ixtheo.de/Record/859089061",
				"attachments": [],
				"tags": [
					{
						"tag": "Atlas"
					},
					{
						"tag": "Europa"
					},
					{
						"tag": "Geschichte"
					},
					{
						"tag": "Kirchengeschichte 1350-1600"
					},
					{
						"tag": "Kirchenreform"
					},
					{
						"tag": "Reformation"
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
				"callNumber": "1797080237",
				"language": "ger",
				"libraryCatalog": "IxTheo Vufind",
				"shortTitle": "Wilhelm Eberschweiler SJ 1837-1921",
				"url": "https://ixtheo.de/Record/1797080237",
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
				"callNumber": "1776265076",
				"language": "ger",
				"libraryCatalog": "IxTheo Vufind",
				"place": "Ulm",
				"publisher": "Universität Ulm",
				"url": "https://ixtheo.de/Record/1776265076",
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
				"itemType": "dictionaryEntry",
				"title": "Hl. Pelagius, Märtyrer",
				"creators": [
					{
						"firstName": "Wilhelm",
						"lastName": "Kohl",
						"creatorType": "author"
					}
				],
				"date": "1994",
				"callNumber": "135015265X",
				"dictionaryTitle": "Biographisch-bibliographisches Kirchenlexikon ; 7: [Patočka, Jan - Remachus]",
				"language": "ger",
				"libraryCatalog": "IxTheo Vufind",
				"pages": "173-174",
				"url": "https://ixtheo.de/Record/135015265X",
				"attachments": [],
				"tags": [
					{
						"tag": "Pelagius"
					}
				],
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
				"callNumber": "1698984863",
				"language": "ger",
				"libraryCatalog": "IxTheo/Relbib Vufind",
				"numPages": "248",
				"place": "Baden-Baden",
				"publisher": "Ergon Verlag",
				"series": "Bibliotheca Academica Reihe Religionswissenschaft",
				"seriesNumber": "Band 1",
				"shortTitle": "Rationalisierung und säkulare Gesellschaft",
				"url": "https://relbib.de/Record/1698984863",
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
						"tag": "Moderne"
					},
					{
						"tag": "Religion"
					},
					{
						"tag": "Religionsphilosophie"
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
				"callNumber": "1810681499",
				"issue": "1",
				"language": "eng",
				"libraryCatalog": "IxTheo/Relbib Vufind",
				"pages": "67-82",
				"publicationTitle": "Interdisciplinary journal for religion and transformation in contemporary society",
				"shortTitle": "Wahrheit – Lüge – Wahrhaftigkeit",
				"url": "https://relbib.de/Record/1810681499",
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
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://relbib.de/Search/Results?lookfor=&type=AllFields&filter%5B%5D=%7Eformat%3A%22Weblog%22&limit=20&botprotect=",
		"items": "multiple"
	}
]
/** END TEST CASES **/

