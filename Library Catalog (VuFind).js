{
	"translatorID": "0b7cbf89-c5d8-49c0-99b3-1854e661ba37",
	"label": "Library Catalog (VuFind)",
	"creator": "Matt Teichman, Abe Jellinek, Mathieu Grimault, Zoë C. Ma",
	"target": "/Record/[^/?]+|/Search/Results\\?",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 270,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-10-29 08:14:01"
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

/*
 * TODO:
 * - bulk export for multiple in one request - e.g.
 * GET https://ixtheo.de/Cart/doExport?f=RIS&i[]=Solr|1640914242&i[]=Solr|1165461676&i[]=Solr|1643208144
 * should detect available format from the search page, or use bulk export only
 * when explicitly told to (with a format manually specified)
 */

/*
 * Options controlling the behaviour of this translator when called from
 * another translator:
 *   - bulkImport: boolean, whether to use the "bulk export" API to get a file
 *   containing all of the selected items in one request. Default false. Only
 *   takes effect when inputFormat is set and valid.
 *   - inputFormat: string, such as "MARC", "RIS", "EndNote", "BibTeX";
 *   preferred import format
 *   - inputPreprocessor: function string->string, transforming the input text
 *   before import. If it's a method, it should be properly bound before use.
 *   (Useful for working around know defects in the exported file)
 */

var exports = {
	doWeb: doWeb,
	detectWeb: detectWeb,
	bulkImport: false,
	inputFormat: null,
	inputPreprocessor: null,
};

/**
 * vanilla VuFind :
 * https://github.com/vufind-org/vufind/blob/dev/import/translation_maps/format_map.properties
 */
function itemDisplayType(doc) {
	let container = doc.querySelector("#record-details-column, .record");
	if (!container) {
		Z.debug("VuFind: selector for info container unknown");
		return false;
	}
	// Build a "key" that concatenates the type-identifying class names (i.e.
	// excluding things like "format" and "iconlabel" themselves, "label",
	// "label-info"
	const formatClasses = ["format", "format2", "iconlabel"];
	let typeKeySet = new Set();
	for (let span of container.querySelectorAll(formatClasses.map(s => `span.${s}`).join(","))) {
		for (let className of span.classList) {
			if (![...formatClasses, "label", "label-info"].includes(className)) {
				typeKeySet.add(className);
			}
		}
	}
	let typeKey = Array.from(typeKeySet).join(" ");
	Z.debug(`type key: ${typeKey}`);

	// Check the typekey for classes in the order from the more specific to
	// more generic: e.g. "map" refers to a specific type the item is of, while
	// "book" either refers to a book or expresses that the item is book-like
	// (for instance, a thesis can be book-like). The tests should exclude
	// classes purely indicating physical format, such as "print"
	if (typeKey) {
		if (typeKey.includes('video')) {
			return 'videoRecording';
		}
		if (typeKey.includes('audio')) {
			return 'audioRecording';
		}
		if (typeKey.includes('thesis')) {
			return 'thesis';
		}
		if (typeKey.includes('dissertations')) {
			return 'thesis';
		}
		if (typeKey.includes('archivesmanuscripts')) {
			return 'manuscript';
		}
		if (typeKey.includes('map')) {
			return 'map';
		}
		if (typeKey.includes('booksection')) {
			return 'bookSection';
		}
		if (typeKey.includes('article')) {
			return 'journalArticle';
		}
		if (typeKey.includes('book')) {
			return 'book';
		}
	}

	// default
	return 'book';
}

async function scrapeContent(data, libraryCatalog) {
	if (typeof exports.inputPreprocessor === "function") {
		data = exports.inputPreprocessor(data);
	}

	let translate = Z.loadTranslator("import");
	translate.setHandler("translators", (obj, translators) => {
		translate.setTranslator(translators);
	});
	translate.setString(data);
	translate.setHandler("itemDone", (obj, item) => item.libraryCatalog = libraryCatalog);
	translate.setHandler("itemDone", commonItemDoneHandler);
	if (!(await translate.getTranslators()).length) {
		throw new Error("No import translator found for input; invalid data for given format?");
	}
	await translate.translate();
}

// Some services, such as Nantilus, refuse the requests without an 'Accept:'
// header. Without it, the request sent from Scaffold will simply timeout. I
// haven't checked if _any_ value would make it work, but we attempt to send
// the right value.
const MIME_TYPES = {
	MARC: "application/MARC,*/*",
	EndNote: "application/x-endnote-refer,text/plain,*/*",
	RIS: "application/x-research-info-systems,text/plain,*/*",
	BibTeX: "application/x-bibtex,text/plain,*/*",
	MARCXML: "application/xml,text/xml,text/plain,*/*",
};

function commonItemDoneHandler(obj, item) { // eslint-disable-line: no-unused
	if (item.place) {
		item.place = item.place.replace(/\[[^[]+\]/, '').replace(/\[|\]/g, "");
	}
	if (item.publisher) {
		item.publisher = ZU.unescapeHTML(item.publisher);
	}
	if (item.url && item.url.includes(', ')) {
		item.url = item.url.split(', ')[0];
	}
	// deduplicate tags
	if (item.tags) {
		let tagStrings = new Set();
		for (let tag of item.tags) {
			tagStrings.add(typeof tag === "string" ? tag : tag.tag);
		}
		item.tags = Array.from(tagStrings.values());
	}

	item.complete();
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	// search for links to single records
	for (let row of doc.querySelectorAll('#content .result')) {
		let url = attr(row, "a.title", "href");
		let title = ZU.trimInternal(text(row, "a.title"));

		if (!url || !title) continue;
		if (checkOnly) return true;
		found = true;

		// if some items are ticked on the page, pre-tick them in the item
		// selector
		let checkbox = row.querySelector("input[type='checkbox']");
		let checked = !!checkbox && checkbox.checked;
		items[url] = { title, checked };
	}

	return found && items;
}

// Hard-coded default initial ("best") input type for particular domains
// This may even include formats not shown as supported by the site.
// FIXME: This is for use during development and testing; once finished we
// should consider moving the domain-specific handling to their own translators
// calling this one.
function snoopInputFormat(domain) {
	if (/\.wellesley\.edu$/.test(domain)) {
		return "RIS";
	}
	if ("bdtd.ibict.br" === domain) {
		return "EndNote";
	}
	return null;
}

// Get the export formats advertised by the site itself that are supported
function getAdvertisedFormats(doc) {
	return ['MARC', 'EndNote', 'RIS', 'BibTeX']
		.filter(format => doc.querySelector(`a[href$="/Export?style=${format}"]`));
}

function hasMultiple(doc, url) {
	return url.includes('/Search/Results') && getSearchResults(doc, true);
}

function detectWeb(doc, url) {
	if (url.includes('/Record/')) {
		return itemDisplayType(doc);
	}
	else if (hasMultiple(doc, url)) {
		return "multiple";
	}
	return false;
}

async function doWeb(doc, url) {
	let libraryCatalog = new URL(url).hostname;
	// The detection of item type is fairly non-trivial but it's only for
	// display; the real itemType will be set by the imported file. Avoid
	// having to go that path when we just use detectWeb() in doWeb() to check
	// if we're dealing with a multiple scraping or not
	let urls;
	if (!hasMultiple(doc, url)) {
		urls = [url];
	}
	else {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		urls = Object.keys(items);
	}

	const initialFormat = exports.inputFormat
		|| snoopInputFormat(new URL(doc.location.href).hostname)
		|| "MARC";
	let format = initialFormat;
	let fallbackFormats = null;

	let itemURL;
	while ((itemURL = urls.shift())) {
		Z.debug(`Scraping URL ${itemURL} using format ${format}`);
		let cleanURL = itemURL.replace(/(\/Record\/[^/]+)[/#?].*$/, '$1');
		let data;
		try {
			data = await requestText(
				`${cleanURL}/Export?style=${format}`,
				{ headers: { Referer: itemURL, Accept: MIME_TYPES[format] } },
			);
			await scrapeContent(data, libraryCatalog);
		}
		catch (err) {
			Z.debug(`Input format ${format} not supported`);
			Z.debug(`The error was: ${err}`);
			// Initialize fallback formats
			if (!fallbackFormats) {
				if (exports.inputFormat) {
					Z.debug(`Input format was set manually; ignore any fallbacks`);
					fallbackFormats = [];
				}
				else {
					// If we're scraping single, get formats from current
					// document; otherwise, inspect the document at the item
					// URL we're trying to scrape.
					fallbackFormats = getAdvertisedFormats(
						hasMultiple(doc, url)
							? await requestDocument(itemURL)
							: doc);
				}
			}

			// Use a fallback format, skipping dups of the initial format
			do {
				format = fallbackFormats.shift();
			} while (format && format === initialFormat);

			if (!format) { // no more formats to try
				throw new Error(`No supported input format`, { cause: err });
			}

			Z.debug(`Fall back to format ${format}; yet to try: ${fallbackFormats}`);
			// Retry this item with new input format
			urls.unshift(itemURL);
			continue;
		}
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
				"itemType": "book",
				"title": "Climate Change Operational Framework 2017-2030: Enhanced Actions for Low Greenhouse Gas Emissions and Climate-Resilient Development",
				"creators": [
					{
						"lastName": "Asian Development Bank",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2017",
				"ISBN": "9789292579081",
				"libraryCatalog": "libcat.wellesley.edu",
				"publisher": "Asian Development Bank",
				"shortTitle": "Climate Change Operational Framework 2017-2030",
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
	},
	{
		"type": "web",
		"url": "https://www.finna.fi/Record/piki.1362247",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Suomi, Suomi: Suomi, Suomi, vedenpirstoma synnyinmaani",
				"creators": [
					{
						"firstName": "Aulikki",
						"lastName": "Oksanen",
						"creatorType": "author"
					}
				],
				"date": "1987",
				"ISBN": "9789513065805",
				"bookTitle": "Tämän runon haluaisin kuulla",
				"libraryCatalog": "www.finna.fi",
				"place": "Hki",
				"publisher": "Tammi",
				"shortTitle": "Suomi, Suomi",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bdtd.ibict.br/vufind/Record/UNB_4a3348cb5eaabe2380fec54ebbbbeb9a",
		"detectedItemType": "thesis",
		"items": [
			{
				"itemType": "book",
				"title": "Modelo de previsão de insolvência de concessionárias de ferrovias no Brasil",
				"creators": [
					{
						"firstName": "João Marcelo",
						"lastName": "Carneiro",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"abstractNote": "Dissertação (mestrado)—Universidade de Brasília, Faculdade de Tecnologia, Departamento de Engenharia Civil e Ambiental, 2011.",
				"language": "por",
				"libraryCatalog": "bdtd.ibict.br",
				"url": "http://repositorio.unb.br/handle/10482/9493",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://cmc.marmot.org/Record/.b11174316",
		"items": [
			{
				"itemType": "book",
				"title": "The Pentagon papers as published by the New York times",
				"creators": [
					{
						"firstName": "Neil",
						"lastName": "Sheehan",
						"creatorType": "editor"
					}
				],
				"date": "1971",
				"callNumber": "E183.8.V5 P4 1971",
				"libraryCatalog": "cmc.marmot.org",
				"numPages": "810",
				"place": "New York",
				"publisher": "Quadrangle Books",
				"attachments": [],
				"tags": [
					{
						"tag": "Foreign relations"
					},
					{
						"tag": "Juvenile literature"
					},
					{
						"tag": "Literature"
					},
					{
						"tag": "Politics and government"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "Vietnam"
					},
					{
						"tag": "Vietnam War, 1961-1975"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://library.villanova.edu/Find/Record/2423035/Description#holdings",
		"items": [
			{
				"itemType": "book",
				"title": "Joan of Arc: the Image of Female Heroism",
				"creators": [
					{
						"firstName": "Marina",
						"lastName": "Warner",
						"creatorType": "author"
					},
					{
						"lastName": "PALCI EBSCO books",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "2013",
				"ISBN": "9780191651939",
				"abstractNote": "The fame of Joan of Arc began in her lifetime and, though it has dipped a little now and then, she has never vanished from view. Her image acts as a seismograph for the shifts and settlings of personal and political ideals: Joan of Arc is the heroine every movement has wanted as their figurehead. In France, anti-semitic, xenophobic, extreme right parties have claimed her since the Action Francaise in the 19th century. By contrast, Socialists, feminists, and liberal Catholicsrallied to her as the champion of the dispossessed and the wrongly accused. Joan of Arc has also played a crucial role in",
				"callNumber": "DC103 .W27 2013",
				"edition": "2nd ed",
				"extra": "OCLC: ocn861559413",
				"libraryCatalog": "library.villanova.edu",
				"numPages": "1",
				"place": "Oxford",
				"publisher": "OUP Oxford",
				"shortTitle": "Joan of Arc",
				"attachments": [],
				"tags": [
					{
						"tag": "Biographies"
					},
					{
						"tag": "Biography"
					},
					{
						"tag": "Christian saints"
					},
					{
						"tag": "Electronic books"
					},
					{
						"tag": "Europe France"
					},
					{
						"tag": "France"
					},
					{
						"tag": "HISTORY"
					},
					{
						"tag": "Joan"
					}
				],
				"notes": [
					{
						"note": "Cover; Contents; List of Plates; Introduction to the New Edition; Acknowledgements; Chronology; Prologue; PART ONE: THE LIFE AND DEATH OF JEANNE LA PUCELLE; 1. Maid of France; 2. A Divided Realm; 3. The King and his Crown; 4. Prophet; 5. Harlot of the Armagnacs; 6. Heretic; 7. Ideal Androgyne; 8. Knight; PART TWO: THE AFTERLIFE OF JOAN OF ARC; 9. The Vindication; 10. Amazon; 11. Personification of Virtue; 12. Child of Nature; 13. Saint or Patriot?; Bibliographical Notes; Index; A; B; C; D; E; F; G; H; I; J; K; L; M; N; O; P; Q; R; S; T; U; V; W; X; Y"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://hds.hebis.de/ubmr/Record/HEB211177393",
		"items": [
			{
				"itemType": "book",
				"title": "Psychologie des Glücks: Handbuch",
				"creators": [
					{
						"firstName": "Anton A.",
						"lastName": "Bucher",
						"creatorType": "author"
					}
				],
				"date": "2009",
				"ISBN": "9783621276535",
				"callNumber": "b",
				"edition": "1. Aufl",
				"language": "ger",
				"libraryCatalog": "hds.hebis.de",
				"numPages": "268",
				"place": "Weinheim ",
				"publisher": "Beltz, PVU",
				"shortTitle": "Psychologie des Glücks",
				"attachments": [],
				"tags": [
					{
						"tag": "Glück"
					},
					{
						"tag": "Psychologie"
					}
				],
				"notes": [
					{
						"note": "Literaturverz. S. 209 - 248"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
