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
	"lastUpdated": "2023-10-31 15:17:06"
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
 *   - itemType: string, the Zotero item type that overrides the
 *   automaticlly-determined type
 *   - libraryCatalog: string, to use as the libraryCatalog property of the
 *   generated items
 *   - inputFormat: string, such as "MARC", "RIS", "EndNote", "BibTeX";
 *   preferred import format
 *
 * The functions
 *   - doWeb() (relying on generic detection and getSearchResults internal to
 *   this translator) and
 *   - scrapeURLs() (no dependence on detection and getSearchResults)
 * are exported for use.
 *
 * NOTE! The scrapeURLs() function is called as
 *     async scrapeURLs(urls, contextDoc)
 * where urls is either a URL string or an array of URL strings (one for each
 * input page) and contextDoc is the Document object that is the document on
 * which the translation is initiated (i.e. it is the `doc` object on which
 * your own translator's doWeb(doc, url) is called). The contextDoc is used for
 * two purposes: to obtain the site's hostname (for setting site-specific
 * default input type for some sites and for use as default libraryCatalog if
 * none explicitly given), and to extract a list of site-available export
 * formats to use as fallback input formats.
 *
 * NOTE: This choice of the function name scrapeURLs and its signature are
 * deliberate, because it operates differently from most web translators'
 * scrape() function that scrapes a single document. In fact, this scrapeURLs()
 * function tries to throw if it detects such a call.
 */

// HOW TO USE:
//
// 1. You can use the standard template `async doWeb(doc, url)` function as
// your doWeb() and load this translator in your own web translator's scrape()
// function:

//		let translator = Zotero.loadTranslator("web");
//		translator.setTranslator("0b7cbf89-c5d8-49c0-99b3-1854e661ba37"); // VuFind
//		translator.setDocument(doc); // necessary for resolving url
//		// Optional custom post-processing handler
//		translator.setHandler("itemDone", function (obj, item) { ... });
//		let vuf = await translator.getTranslatorObject();
//		vuf.itemType = ...; // optinal
//		vuf.libraryCatalog = ...; // optinal
//		vuf.inputFormat = ...; // optinal, e.g. "MARC" (default), "RIS", etc.
//		await vuf.doWeb(doc, url);

// 2. It is usually not necessary to load each input URL as document using
// requestDocument and pass the document individually to your own scrape()
// function. By using the VuFind translator's underlying scrapeURLs() function
// directly, you can also make use of your own detectWeb() (and
// getSearchResults() or its equivalent), while saving considerable overhead.
// For an example, see 'Library Catalog (Pika).js'.

var exports = {
	doWeb: doWeb,
	detectWeb: detectWeb,
	scrapeURLs: scrapeURLs,
	itemType: null,
	libraryCatalog: null,
	inputFormat: null,
};

/**
 * vanilla VuFind :
 * https://github.com/vufind-org/vufind/blob/dev/import/translation_maps/format_map.properties
 */
function itemDisplayType(doc) {
	let container = doc.querySelector("#record-details-column, .record");
	if (!container) {
		Z.debug("VuFind: selector for info container unknown");
		container = doc.body; // fallback
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

async function scrapeContent(data, options) {
	let translate = Z.loadTranslator("import");
	translate.setHandler("translators", (obj, translators) => {
		translate.setTranslator(translators);
	});
	translate.setString(data);
	translate.setHandler("itemDone", (obj, item) => {
		if (options.itemType) item.itemType = options.itemType;
		item.libraryCatalog = options.libraryCatalog;
	});
	translate.setHandler("itemDone", commonItemDoneHandler);
	if (!(await translate.getTranslators()).length) {
		throw new Error(`No import translator found for input; invalid data for given format? (data string length ${data.length}, first 16 characters ${data.slice(0, 16)}`);
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
	// Normalize creators - cleanup mononyms; remove duplicates
	// See e.g. https://bemis.marmot.org/Record/.b33973477 for duplicate
	// authors and tags
	let creatorKeyMapping = new Map();
	for (let creator of item.creators) {
		if (!creator.firstName || !creator.lastName) {
			creator.fieldMode = 1;
			creator.lastName = creator.lastName || creator.firstName;
			delete creator.firstName;
		}
		creator.fieldMode = creator.fieldMode && 1;
		if (!creator.fieldMode) {
			creator = ZU.cleanAuthor(`${creator.lastName}, ${creator.firstName}`, creator.creatorType, true/* useComma */);
		}
		let key = `${(creator.lastName || "").toLowerCase()}\n${(creator.firstName || "").toLowerCase()}\n${creator.creatorType || "author"}\n${creator.fieldMode ? "1" : "0"}`;
		creatorKeyMapping.set(key, creator);
	}
	item.creators = Array.from(creatorKeyMapping.values());

	if (item.place) {
		item.place = item.place.replace(/\[[^[]+\]/, '').replace(/\[|\]/g, "");
	}
	if (item.publisher) {
		item.publisher = ZU.unescapeHTML(item.publisher);
	}
	if (item.url && item.url.includes(', ')) {
		item.url = item.url.split(', ')[0];
	}
	// deduplicate tags; for example:
	// https://kirkes.finna.fi/Record/kirkes.252925
	if (item.tags) {
		let tagMap = new Map();
		for (let tag of item.tags) {
			let tagString = typeof tag === "string" ? tag : tag.tag;
			tagString = ZU.trimInternal(tagString);
			tagMap.set(tagString.toLowerCase(), tagString);
		}
		item.tags = Array.from(tagMap.values());
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
		return "EndNote"; // MARC not supported; short-cut it
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
	if (hasMultiple(doc, url)) {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		await scrapeURLs(Object.keys(items), doc);
	}
	else {
		await scrapeURLs(url, doc);
	}
}

async function scrapeURLs(urls, contextDoc) {
	// Try to throw if the caller calls this scrapeURLs function like the
	// conventional scrape() function ubiquitous in web translators
	if (urls instanceof Document) {
		throw new TypeError("VuFind's scrapeURLs() function should be called as scrapeURLs(string | string[], Document)");
	}
	if (!Array.isArray(urls)) urls = [urls];

	const contextDomain = new URL(contextDoc.location.href).hostname;
	const initialFormat = exports.inputFormat
		|| snoopInputFormat(contextDomain)
		|| "MARC";
	let libraryCatalog = exports.libraryCatalog || contextDomain;
	let itemType = exports.itemType && ZU.itemTypeExists(exports.itemType)
		? exports.itemType
		: null;

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
			await scrapeContent(data, { libraryCatalog, itemType });
		}
		catch (err) {
			Z.debug(`Translation with input format ${format} failed`);
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
						urls.length ? await requestDocument(itemURL) : contextDoc);
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
		"detectedItemType": "bookSection",
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
	},
	{
		"type": "web",
		"url": "https://kansalliskirjasto.finna.fi/Record/fikka.3295274",
		"items": [
			{
				"itemType": "book",
				"title": "Test pilot",
				"creators": [
					{
						"firstName": "Leonard",
						"lastName": "Sealey",
						"creatorType": "author"
					},
					{
						"lastName": "Otava, kustannusosakeyhtiö",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "1977",
				"ISBN": "9789511044376",
				"callNumber": "Ga 1973- Ga 1973- Ga 1973-",
				"language": "eng fin",
				"libraryCatalog": "kansalliskirjasto.finna.fi",
				"numPages": "16",
				"place": "Helsingissä",
				"publisher": "Otava",
				"series": "Lively readers",
				"seriesNumber": "4",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "Finnish vocabulary comp. by Anneli Aarikka"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kansalliskirjasto.finna.fi/Record/doria.10024_82096",
		"items": [
			{
				"itemType": "book",
				"title": "Goodrich \"High-test\" konehihnat",
				"creators": [
					{
						"lastName": "Auto-Vulcano",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"abstractNote": "kuv., 10 x 15 cm",
				"language": "fin",
				"libraryCatalog": "kansalliskirjasto.finna.fi",
				"url": "http://www.doria.fi/handle/10024/82096",
				"attachments": [],
				"tags": [
					{
						"tag": "Goodrich (tavaramerkki)"
					},
					{
						"tag": "Moottoriajoneuvojen esitteet ja hinnastot"
					},
					{
						"tag": "hinnastot"
					},
					{
						"tag": "moottoriajoneuvot"
					},
					{
						"tag": "tavaramerkit"
					},
					{
						"tag": "tieliikenne"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://kirkes.finna.fi/Record/kirkes.252925",
		"items": [
			{
				"itemType": "book",
				"title": "Suomen maatalouden historia: jälleenrakennuskaudesta EU-Suomeen. 3: Suurten muutosten aika",
				"creators": [
					{
						"firstName": "Pirjo",
						"lastName": "Markkola",
						"creatorType": "editor"
					},
					{
						"firstName": "Viljo",
						"lastName": "Rasila",
						"creatorType": "editor"
					}
				],
				"date": "2004",
				"ISBN": "9789517464833 9789517464802",
				"abstractNote": "Summary: Overwiew of tghe history of finnish agriculture - from prehistory to the 21st century / Viljo Rasila",
				"callNumber": "67.09",
				"language": "fin",
				"libraryCatalog": "kirkes.finna.fi",
				"numPages": "518",
				"place": "Helsinki",
				"publisher": "Suomalaisen Kirjallisuuden Seura",
				"series": "Suomalaisen Kirjallisuuden Seuran toimituksia",
				"seriesNumber": "914:3",
				"shortTitle": "Suomen maatalouden historia",
				"attachments": [],
				"tags": [
					{
						"tag": "1870-1950-luku"
					},
					{
						"tag": "1940-2000-luku"
					},
					{
						"tag": "Euroopan Unioni"
					},
					{
						"tag": "Eurooppa"
					},
					{
						"tag": "Suomi"
					},
					{
						"tag": "asutustoiminta"
					},
					{
						"tag": "historia"
					},
					{
						"tag": "integraatio"
					},
					{
						"tag": "jälleenrakentaminen"
					},
					{
						"tag": "karjatalous"
					},
					{
						"tag": "kasvu"
					},
					{
						"tag": "luonnonmukainen tuotanto"
					},
					{
						"tag": "maaltamuutto"
					},
					{
						"tag": "maaseutu"
					},
					{
						"tag": "maatalous"
					},
					{
						"tag": "maatalouspolitiikka"
					},
					{
						"tag": "maatalousteknologia"
					},
					{
						"tag": "maataloustuotanto"
					},
					{
						"tag": "maataloustyö"
					},
					{
						"tag": "osuustoiminta"
					},
					{
						"tag": "rakennemuutos"
					},
					{
						"tag": "taloushistoria"
					},
					{
						"tag": "tukimuodot"
					}
				],
				"notes": [
					{
						"note": "S. 490-507: Overview of the Finnish agriculture / Viljo Rasila"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://blanka.finna.fi/Search/Results?sort=main_date_str+desc&limit=0&filter%5B%5D=first_indexed%3A%22%5BNOW-1MONTHS%2FDAY+TO+%2A%5D%22&filter%5B%5D=%7Eformat%3A%220%2FBook%2F%22&filter%5B%5D=%7Eformat%3A%220%2FOther%2F%22&filter%5B%5D=%7Eformat%3A%220%2FSound%2F%22&filter%5B%5D=%7Eformat%3A%220%2FVideo%2F%22&filter%5B%5D=%7Eformat%3A%220%2FMusicalScore%2F%22&type=AllFields",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://finna.fi/Search/Results?lookfor=test&type=AllFields",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://ixtheo.de/Record/1796986143",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Updated Christus Victor: A Neurotheological Perspective",
				"creators": [
					{
						"firstName": "Flavius D.",
						"lastName": "Raslau",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"ISSN": "0733-4273",
				"abstractNote": "Competing models have been proposed to explain Christ's atonement and its significance. Each model proffers its own rational merits, but embodied experiences lead us to intuit differently the plausibility of various metaphors by which we then reason about the atonement. An updated Christus Victor account from a neurotheological perspective intends to draw out stronger intuitions toward its plausibility by leaning into the sciences of unconscious cognition, epigenetics, embodiment, and dynamical systems theory, as well as environmental, technological, and relational influences. These unveil our vulnerability to forces outside our conscious control and explain not only our deformation (enslavement), but also the pathway toward transformation (victory), which resonates with Christus Victor motifs. Theological reflections are offered toward greater embodied and ecclesial integration of topics such as sanctification, sin, and salvation. In short, a neurotheological perspective of Christus Victor has the resources to complement a modern atonement theology that is more consonant with the psychology of lived experience",
				"callNumber": "1",
				"language": "eng",
				"libraryCatalog": "ixtheo.de",
				"pages": "329-343",
				"publicationTitle": "Journal of psychology and christianity",
				"shortTitle": "Updated Christus Victor",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
