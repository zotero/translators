{
	"translatorID": "d23f01f1-6037-439b-87fb-23b8f3b9067f",
	"label": "Library Catalog (Visual Library 2021)",
	"creator": "Abe Jellinek",
	"target": "/search(/quick)?\\?|/nav/index/|/(content|periodical)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 250,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-19 16:39:31"
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


const idRe = /(\d+)(?:[?#].*)?$/;

function detectWeb(doc, url) {
	if (doc.querySelector('#footerLinkVLS') && idRe.test(url)) {
		let docType = text(doc, '.value.doctypeBase_vlsType');
		let header = text(doc, '.headertext');
		if (docType == 'Document' || docType == 'Dokument') {
			return "document";
		}
		else if (docType == 'Journal Article'
			|| docType == 'Aufsatz in einer Zeitschrift'
			|| header == 'Journal Article'
			|| header == 'Aufsatz in einer Zeitschrift') {
			return "journalArticle";
		}
		else if (docType.includes('Thesis') || docType.endsWith('arbeit')) {
			return "thesis";
		}
		else if (doc.querySelector('#mods_name-roleTerm_Recipient')) {
			return "letter";
		}
		else {
			return "book";
		}
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('#searchResult .metadataTable a.title');
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
			if (items) {
				ZU.processDocuments(Object.keys(items).map(toTitleInfo), scrape);
			}
		});
	}
	else {
		let titleInfoURL = toTitleInfo(url);
		if (titleInfoURL == url) {
			scrape(doc, url);
		}
		else {
			ZU.processDocuments(titleInfoURL, scrape);
		}
	}
}

function toTitleInfo(url) {
	if (url.includes('/titleinfo/')) {
		return url;
	}
	else {
		return url.replace(/\/(content|periodical)\/[^/]+/, '/$1/titleinfo');
	}
}

function scrape(doc, url) {
	var m = url.match(idRe);
	if (m) {
		let id = m[1];
		let modsURL = `/oai?verb=GetRecord&metadataPrefix=mods&identifier=${id}`;
		ZU.processDocuments(modsURL, function (respDoc) {
			let translator = Zotero.loadTranslator("import");
			// MODS
			translator.setTranslator("0e2235e7-babf-413c-9acf-f27cce5f059c");
			translator.setString(respDoc.querySelector('mods').outerHTML);
			translator.setHandler("itemDone", function (obj, item) {
				// the MODS translator is eager to return the "document" item
				// type, but items in these catalogs are almost always books. so
				// we'll override the translator's guess if needed
				if (item.itemType == 'document') {
					item.itemType = detectWeb(doc, url);
				}
				
				if (doc.querySelector('.resourceLink')) {
					item.attachments.push({
						title: 'Full Text PDF',
						mimeType: 'application/pdf',
						url: `/download/pdf/${id}`
					});
				}
				
				if (!item.url || item.url.includes('//doi.org/')) {
					item.url = url.replace(/[?#].*/, '');
				}
				
				cleanItem(item);
				
				item.complete();
			});
			translator.translate();
		});
	}
}

function cleanItem(item) {
	if (item.place) {
		item.place = item.place.replace(/(^\[)|(\]$)/g, '');
	}
	
	if (item.publisher) {
		item.publisher = item.publisher.replace(/\.\s*$/, '');
	}
	
	if (item.edition) {
		item.edition = item.edition.replace(/(^\[)|(\]$)/g, '');
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://menadoc.bibliothek.uni-halle.de/ssg/content/titleinfo/798519",
		"items": [
			{
				"itemType": "book",
				"title": "Chronici Syriaci Abvlpharagiani E Scriptoribvs Graecis Emendati, Illvstrati, Specimen",
				"creators": [
					{
						"firstName": "Albert Jakob",
						"lastName": "Arnoldi",
						"creatorType": "author"
					},
					{
						"firstName": "",
						"lastName": "Barhebraeus",
						"creatorType": "author"
					}
				],
				"date": "1805",
				"callNumber": "ssg4.3.3",
				"edition": "Electronic ed.",
				"language": "lat",
				"libraryCatalog": "Library Catalog (Visual Library 2021)",
				"place": "Marburgi",
				"publisher": "Krieger",
				"url": "https://menadoc.bibliothek.uni-halle.de/ssg/content/titleinfo/798519",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "statement of responsibility: Alb. Jac. Arnoldi"
					},
					{
						"note": "Marbvrgi"
					},
					{
						"note": "Marburg, Univ., Einladungsschr., 1805"
					},
					{
						"note": "Aus: Avctoritate Et Svb Avspiciis ... Domini Gvilielmi I. ... Hassiae Landgravii ... Rectoris Academiae Magnificentissimi Ad Novi Magistratvs Academici Inavgvrationem Ipsis Calendis Janvarii A. [MD]CCCV Celebranam Ea, Qva Par Est, Observantia Invitat Academiae ADHVC Prorector ..."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://menadoc.bibliothek.uni-halle.de/ssg/content/titleinfo/1339313",
		"items": [
			{
				"itemType": "book",
				"title": "Geschichte und Beschreibung des Landes der Drusen in Syrien: nebst einem bisher in Teutschland unbekannten Religionsbuche dieses Volks",
				"creators": [
					{
						"firstName": "Johann Gottlob",
						"lastName": "Worbs",
						"creatorType": "author"
					}
				],
				"date": "1799",
				"callNumber": "ssg2.4",
				"edition": "Electronic ed.",
				"language": "ger",
				"libraryCatalog": "Library Catalog (Visual Library 2021)",
				"place": "Görliz",
				"publisher": "Anton",
				"shortTitle": "Geschichte und Beschreibung des Landes der Drusen in Syrien",
				"url": "https://menadoc.bibliothek.uni-halle.de/ssg/content/titleinfo/1339313",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Drusen"
					}
				],
				"notes": [
					{
						"note": "statement of responsibility: von J. G. Worbs, Pastor in Priebus"
					},
					{
						"note": "Vorlageform des Erscheinungsvermerks: Görlitz, bei C. G. Anton"
					},
					{
						"note": "In Fraktur"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.e-rara.ch/zuz/content/titleinfo/18877392",
		"items": [
			{
				"itemType": "book",
				"title": "ʿAruḳ ha-shorashot =: Dictionarivm Hebraicvm",
				"creators": [
					{
						"firstName": "Sebastian",
						"lastName": "Münster",
						"creatorType": "author"
					},
					{
						"firstName": "Johann",
						"lastName": "Froben",
						"creatorType": "author"
					}
				],
				"date": "1523",
				"archiveLocation": "Z06",
				"language": "heb; lat",
				"libraryCatalog": "Library Catalog (Visual Library 2021)",
				"place": "Basel",
				"publisher": "Apvd Frob",
				"rights": "pdm",
				"shortTitle": "ʿAruḳ ha-shorashot =",
				"url": "https://www.e-rara.ch/zuz/content/titleinfo/18877392",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "statement of responsibility: nunc primum aeditum & typis excusum, Adiectis Chaldaicis uocabulis non parum multis autore F. Sebastiano Mvnstero ..."
					},
					{
						"note": "Druckermarken"
					},
					{
						"note": "Bogensignaturen: Aa-Cc⁸, a-z⁸, A-K⁸"
					},
					{
						"note": "ownership: Aus dem Besitz Huldrych Zwinglis. Auf dem Titelblatt handschriftlicher Besitzvermerk: \"ειµι του Zijγγλιου\"."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://menadoc.bibliothek.uni-halle.de/menalib/content/titleinfo/1508439",
		"items": [
			{
				"itemType": "document",
				"title": "Global Turkey in Europe: political, economic, and foreign policy dimensions of Turkey's evolving relationship with the EU",
				"creators": [
					{
						"firstName": "Senem",
						"lastName": "Aydın-Düzgit",
						"creatorType": "contributor"
					},
					{
						"lastName": "Istituto Affari Internazionali",
						"fieldMode": 1,
						"creatorType": "contributor"
					}
				],
				"date": "2000",
				"language": "eng",
				"libraryCatalog": "Library Catalog (Visual Library 2021)",
				"publisher": "Istituto Affari Internazionali",
				"shortTitle": "Global Turkey in Europe",
				"url": "https://menadoc.bibliothek.uni-halle.de/menalib/content/titleinfo/1508439",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "statement of responsibility: ed. by Senem Aydın-Düzgit ..."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://menadoc.bibliothek.uni-halle.de/menalib/content/titleinfo/4498774",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Legislating for the Benefit of Children Born Out of Wedlock",
				"creators": [
					{
						"firstName": "Björn",
						"lastName": "Bentlage",
						"creatorType": "author"
					}
				],
				"date": "2015",
				"callNumber": "ssg3.1.5",
				"language": "eng",
				"libraryCatalog": "Library Catalog (Visual Library 2021)",
				"publicationTitle": "Die Welt des Islams",
				"url": "https://menadoc.bibliothek.uni-halle.de/menalib/content/titleinfo/4498774",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Nichteheliches Kind"
					},
					{
						"tag": "Rechtsstellung"
					}
				],
				"notes": [
					{
						"note": "statement of responsibility: Björn Bentlage"
					},
					{
						"note": "Postprint"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://visuallibrary.net/dms/content/titleinfo/511462",
		"items": [
			{
				"itemType": "letter",
				"title": "[Brief Josef Blaas' an Albrecht Penck]",
				"creators": [
					{
						"firstName": "Josef",
						"lastName": "Blaas",
						"creatorType": "author"
					},
					{
						"firstName": "Albrecht",
						"lastName": "Penck",
						"creatorType": "recipient"
					},
					{
						"firstName": "J.",
						"lastName": "Blaas",
						"creatorType": "contributor"
					},
					{
						"firstName": "Leo",
						"lastName": "Blaas",
						"creatorType": "contributor"
					},
					{
						"firstName": "Erich",
						"lastName": "Blaas",
						"creatorType": "contributor"
					}
				],
				"date": "2021",
				"archiveLocation": "Semantics Kommunikationsmanagement GmbH; Semantics Kommunikationsmanagement GmbH",
				"language": "ger",
				"libraryCatalog": "Library Catalog (Visual Library 2021)",
				"url": "https://visuallibrary.net/dms/content/titleinfo/511462",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "formerShelvingLocation: B E"
					},
					{
						"note": "systemDetails: Handschrift"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://epub.jku.at/obvulihs/content/titleinfo/984885",
		"items": [
			{
				"itemType": "thesis",
				"title": "Predicting Stock Price Changes using EDGAR",
				"creators": [
					{
						"firstName": "Lukas",
						"lastName": "Gabriel",
						"creatorType": "author"
					},
					{
						"firstName": "Bettina",
						"lastName": "Grün",
						"creatorType": "author"
					},
					{
						"firstName": "Paul",
						"lastName": "Hofmarcher",
						"creatorType": "author"
					}
				],
				"date": "2016",
				"callNumber": "UL:SW:AS",
				"language": "eng",
				"libraryCatalog": "Library Catalog (Visual Library 2021)",
				"place": "Linz",
				"url": "https://resolver.obvsg.at/urn:nbn:at:at-ubl:1-7043",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Aktienindex"
					},
					{
						"tag": "Börsenindex"
					},
					{
						"tag": "Elektronischer Datenaustausch"
					},
					{
						"tag": "Lineares Modell"
					},
					{
						"tag": "Prognose"
					},
					{
						"tag": "Statistisches Modell"
					},
					{
						"tag": "Text Mining"
					},
					{
						"tag": "Änderung"
					}
				],
				"notes": [
					{
						"note": "statement of responsibility: Lukas Gabriel, BStat"
					},
					{
						"note": "Kurzfassungen in englischer Sprache"
					},
					{
						"note": "thesis statement: Universität Linz, Masterarbeit, 2016"
					},
					{
						"note": "citation/reference: (VLID)984885"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://netlibrary.aau.at/obvuklhs/content/titleinfo/6190000",
		"items": [
			{
				"itemType": "thesis",
				"title": "Buch- und Mediennutzung in der Generation der 1990er Jahre: Lesesozialisation in der ‚Generation Harry Potter‘",
				"creators": [
					{
						"firstName": "Lisa Marie",
						"lastName": "Trattner",
						"creatorType": "author"
					},
					{
						"firstName": "Doris",
						"lastName": "Moser",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"callNumber": "KLU:55",
				"language": "ger",
				"libraryCatalog": "Library Catalog (Visual Library 2021)",
				"place": "Klagenfurt",
				"shortTitle": "Buch- und Mediennutzung in der Generation der 1990er Jahre",
				"url": "https://resolver.obvsg.at/urn:nbn:at:at-ubk:1-38085",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "statement of responsibility: Lisa Marie Trattner"
					},
					{
						"note": "thesis statement: Alpen-Adria-Universität Klagenfurt, Masterarbeit, 2020"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/76578",
		"items": [
			{
				"itemType": "book",
				"title": "Agathangelos ar̊ Gēorgaj Asori episkoposin _u ousoumnasirouthiun Agathangełaj groc",
				"creators": [
					{
						"firstName": "Yakovbos",
						"lastName": "Tašean",
						"creatorType": "author"
					}
				],
				"date": "1891",
				"archiveLocation": "38/409; 6/250; 5; 294/37; 6/182; 5",
				"edition": "Electronic ed.",
				"language": "arm",
				"libraryCatalog": "Library Catalog (Visual Library 2021)",
				"place": "Vienna",
				"publisher": "Mxit'arean Tparan",
				"rights": "pdm",
				"series": "Azgayin matenadaran, Nationalbibliothek, Azgain matenadaran, Azgajin matenadaran, Bibliothèque National",
				"seriesNumber": "3",
				"url": "https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/76578",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "statement of responsibility: Yakowbos Tašean"
					},
					{
						"note": "language: [In armen. Schr. ]"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://digital-library.arolsen-archives.org/content/titleinfo/7262318",
		"items": [
			{
				"itemType": "book",
				"title": "About Jews liberated from German concentration camps arrived in Sweden in 1945: List No. 1",
				"creators": [],
				"date": "1946",
				"language": "eng",
				"libraryCatalog": "Library Catalog (Visual Library 2021)",
				"place": "Malmö",
				"publisher": "Henry Luttrup & Co",
				"shortTitle": "About Jews liberated from German concentration camps arrived in Sweden in 1945",
				"url": "https://digital-library.arolsen-archives.org/content/titleinfo/7262318",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Displaced Person"
					},
					{
						"tag": "Namensverzeichnis"
					},
					{
						"tag": "Schweden"
					},
					{
						"tag": "Verzeichnis"
					},
					{
						"tag": "Überlebender"
					}
				],
				"notes": [
					{
						"note": "statement of responsibility: World Jewish Congress"
					},
					{
						"note": "Zeitgenössische Publikationen/Quellen"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://unipub.uni-graz.at/offcampus/periodical/titleinfo/5615650",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Repressed Culture and Otherness in “Yo Soy Joaquín” and “Puerto Rican Obituary”",
				"creators": [
					{
						"firstName": "Monica Cristiana",
						"lastName": "Irimia",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"issue": "6",
				"libraryCatalog": "Library Catalog (Visual Library 2021)",
				"pages": "141-148",
				"publicationTitle": "Off Campus: Seggau School of Thought",
				"rights": "cc-by_4",
				"url": "https://unipub.uni-graz.at/offcampus/periodical/titleinfo/5615650",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://menadoc.bibliothek.uni-halle.de/ssg/content/search/293863?query=test",
		"items": [
			{
				"itemType": "book",
				"title": "Storia dei Musulmani di Sicilia",
				"creators": [
					{
						"firstName": "Michele",
						"lastName": "Amari",
						"creatorType": "author"
					}
				],
				"date": "1854",
				"callNumber": "ssg2.11",
				"edition": "Electronic ed.",
				"language": "ita",
				"libraryCatalog": "Library Catalog (Visual Library 2021)",
				"place": "Firenze",
				"publisher": "Le Monnier",
				"url": "https://menadoc.bibliothek.uni-halle.de/ssg/content/titleinfo/293863",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Islam"
					},
					{
						"tag": "Sizilien"
					}
				],
				"notes": [
					{
						"note": "statement of responsibility: scritta da Michele Amari"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://menadoc.bibliothek.uni-halle.de/search/quick?query=test",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://menadoc.bibliothek.uni-halle.de/search?operation=searchRetrieve&query=%28cql.anywhere%3Dtesting+and+dc.title%3Dtest%29+and+vl.domain%3D%28menadoc%29+sortBy+relevance%2Fasc&index1=cql.anywhere&term1=testing&bool2=and&index2=dc.title&term2=test&bool3=and&index3=bib.personalName&term3=&bool4=and&index4=vl.printer-publisher&term4=&bool5=and&index5=bib.originPlace&term5=&bool6=and&index6=dc.date&term6=&bool7=and&index7=dc.subject&term7=&bool8=and&index8=dc.identifier&term8=&vlFulltext=&searchDomain=menadoc&startRecord=1&vlsearch_sortBy=relevance&maximumRecords=10&vlsearch_sortOrder=asc&truncate=",
		"items": "multiple"
	}
]
/** END TEST CASES **/
