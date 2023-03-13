{
	"translatorID": "ceace65b-4daf-4200-a617-a6bf24c75607",
	"label": "COBISS",
	"creator": "Brendan O'Connell",
	"target": "^https?://plus\\.cobiss\\.net/cobiss",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-03-13 15:31:25"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Brendan O'Connell

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
	// single items end in an id number that is 6 digits or more
	const itemIDURL = /\d{6,}$/;
  const fullRecordURL = /#full$/;
	if (url.match(itemIDURL) || url.match(fullRecordURL)) {
	// capture type of material as a string from the catalog, e.g. "undergraduate thesis"
	var typeOfMaterial = doc.querySelector("button#add-biblioentry-to-shelf").getAttribute("data-mat-type");
	if (typeOfMaterial) {
	  // use translateItemType function to translate catalog material type into an official Zotero
	  // item type, e.g "thesis"
	  var detectItemType = translateItemType(typeOfMaterial);
	  if (detectItemType) {
		return detectItemType;
	  }
	  // if a catalog item type isn't contained in the hash in the translateItemType function, just
	  // return Zotero item type 'book', which is the most common item type in this catalog.
	  else {
		return 'book';
	  }
	  }
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.title.value');

	for (let row of rows) {
		let href = row.href;
		let title = row.innerText;
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function bookmarkTranslator(doc) {

}

function constructRISURL(url) {
	// catalog page URL: https://plus.cobiss.net/cobiss/si/sl/bib/107937536
	// RIS URL: https://plus.cobiss.net/cobiss/si/sl/bib/risCit/107937536

	// capture first part of URL, e.g. https://plus.cobiss.net/cobiss/si/sl/bib/
	const firstRegex = /^(.*?)\/bib\//;
	let firstUrl = url.match(firstRegex)[0];

	// capture item ID, e.g. /92020483
	const secondRegex = /\/([^/]+)$/;
	let secondUrl = url.match(secondRegex)[0];

	// outputs RIS URL structure
	let risURL = firstUrl + "risCit" + secondUrl;
	return risURL;
}

function constructEnglishURL(url) {
	// default catalog page URL: https://plus.cobiss.net/cobiss/si/sl/bib/107937536
	// page with English metadata: https://plus.cobiss.net/cobiss/si/en/bib/107937536
	let englishURL = url.replace(/[a-z]{2}\/bib\//, "en/bib/");
	return englishURL;
}

// too many items are classified in RIS as either BOOK or ELEC,
// including many reports, ebooks etc that thus get itemType "book" or "webpage" too often.
// this map assigns more accurate itemTypes
// based on "type of material" classification in English catalog, instead of relying on RIS
function translateItemType(englishCatalogItemType) {
	var catalogItemTypeHash = new Map([
		['undergraduate thesis', 'thesis'],
		['proceedings', 'conferencePaper'],
		['novel', 'book'], // https://plus.cobiss.net/cobiss/si/en/bib/35544323
		['science fiction (prose)', 'book'], //https://plus.cobiss.net/cobiss/si/en/bib/46310659
		['book', 'book'],
		['handbook', 'book'],
		['proceedings of conference contributions', 'conferencePaper'], //https://plus.cobiss.net/cobiss/si/en/bib/91188227
		['professional monograph', 'report'], //https://plus.cobiss.net/cobiss/si/en/bib/87583747
		['scientific monograph', 'book'],
		['textbook', 'book'],
		['e-book', 'book'],
		['picture book', 'book'],
		['treatise, study', 'report'],
		['catalogue', 'book'],
		['master\u0027s thesis', 'thesis'],
		['picture book', 'book'],
		['short stories', 'book'],
		['research report', 'report'],
		['poetry', 'book'],
		['dissertation', 'thesis'],
		['picture book', 'book'],
		['offprint', 'magazineArticle'],
		['guide-book', 'book'],
		['expertise', 'hearing'], // this is court testimony, not sure what the correct item type should be https://plus.cobiss.net/cobiss/si/en/bib/94791683
		['profess. monogr', 'report'],
		['project documentation', 'report'],
		['antiquarian material', 'book'], // most of these are books, e.g. https://plus.cobiss.net/cobiss/si/en/bib/7543093
		['other lit.forms', 'book'],
		['drama', 'book'],
		['strip cartoon', 'book'],
		['documentary lit', 'book'],
		['encyclopedia', 'book'],
		['exercise book', 'book'],
		['educational material', 'book'],
		['review', 'report'],
		['statistics', 'report'],
		['legislation', 'statute'],
		['essay', 'book'],
		['final paper', 'thesis'],
		['standard', 'book'],
		['specialist thesis', 'book'],
		['aphorisms, proverbs', 'book'],
		['humour, satire, parody', 'book'],

		// TODO: finish for remaining types in search all. Not all will have RIS.

	]);
	return (catalogItemTypeHash.get(englishCatalogItemType));
}

function translateIcon(number) {
	// Maps visual icons on catalog page to Zotero itemType, so user sees the correct icon on
	// Zotero Save button in browser connector. Icons that don't correspond to an itemType are assigned "book"
	var iconMap = [
		'',
		'book', // icon-1
		'journalArticle', // icon-2
		'newspaperArticle', // icon-3
		'audioRecording', // icon-4
		'film', // icon-5
		'book', // icon-6 (keyboard)
		'map', // icon-7
		'audioRecording', // icon-8 (sheet music)
		'book', // icon-9 (email icon)
		'book', // icon-10 (toy)
		'book', // icon-11 (graduation cap)
		'book', // icon-12 (camera)
		'book', // icon-13 (@ symbol)
		'videoRecording', // icon-14
		'audioRecording', // icon-15
		'film', // icon-16
		'book', // icon-17 (set of books)
		'book', // icon-18 (globe)
		'book', // icon-19 (magazine?)
		'artwork', // icon-20 (pictorial material)
		'audioRecording', // icon-21 (record player)
		'audioRecording', // icon-22 (microphone)
		'book', // icon-23 (fountain pen)
		'book', // icon-24 (prize medal)
		'videoRecording', // icon-25 (DVD with small music icon)
		'videoRecording', // icon-26 (Blu-ray)
		'book', // icon-27 (e-book)
		'book', // icon-28 (audiobook)
		'videoRecording', // icon-29 (e-video)
		'book', // icon-30 (work performed)
		'book', // icon-31 (data)
		'newspaperArticle' // icon-32 (e-newspaper)
	];
	return iconMap[number];
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	// if url matches /en/bib/, then skip constructing englishURL
	var finalItemType = "";
	if (url.match("/en/bib")) {
		var nativeEnglishItemType = doc.querySelector("div.recordPrompt").innerText;
		const cleanedNativeEnglishItemType = nativeEnglishItemType.replace(/^Type of material - /, "");
		finalItemType = translateItemType(cleanedNativeEnglishItemType);
	}
	else {
		// replace specific language in bib record URL with english to detect item type
		var englishURL = constructEnglishURL(url);
		var englishDocument = await requestDocument(englishURL);
		var englishItemType = englishDocument.querySelector("button#add-biblioentry-to-shelf").getAttribute("data-mat-type");
		finalItemType = translateItemType(englishItemType);
	}
	const risURL = constructRISURL(url);
  // TODO: some items don't have RIS, but they have a full catalog record. It seems to either be one
  // or the other.
  // e.g. https://plus.cobiss.net/cobiss/si/en/bib/128893 has a Detail page, but no RIS.
  // https://plus.cobiss.net/cobiss/si/en/bib/93266179#full detail page, no RIS.

  // https://plus.cobiss.net/cobiss/si/en/bib/15409155 has RIS, but no detail page.
  // https://plus.cobiss.net/cobiss/si/en/bib/19052547 has RIS but no detail page.



	const risText = await requestText(risURL);

	// RIS always has an extraneous OK## at the beginning, remove it
	const fixedRisText = risText.replace(/^OK##/, '');
	if (doc.getElementById("unpaywall-link")) {
		var pdfLink = doc.getElementById("unpaywall-link").href;
	}
	const translator = Zotero.loadTranslator('import');
	translator.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7'); // RIS
	translator.setString(fixedRisText);
	translator.setHandler('itemDone', (_obj, item) => {
		if (pdfLink) {
			item.attachments.push({
				url: pdfLink,
				title: 'Full Text PDF',
				mimeType: 'application/pdf'
			});
		}
		else {
			item.attachments.push({
				title: 'Snapshot',
				document: doc
			});
		}
		// TODO: Figure out what to do with links
		// They're all over the place. Some are full-text, some say that they're PDFs but aren't actually,
		// some are something else...
		// Save Link field somewhere, e.g. https://plus.cobiss.net/cobiss/si/en/bib/70461955
		// here's another URL that's full text: https://plus.cobiss.net/cobiss/si/en/bib/95451907
		// Links to full text PDF: https://plus.cobiss.net/cobiss/si/en/bib/105123075

		// if "Type of material" from catalog page isn't in catalogItemTypeHash, finalItemType will return as undefined.
		// in this case, default Type from RIS will be applied.
		// if finalItemType is found from the catalog page, override itemType from RIS with it.
		if (finalItemType) {
			item.itemType = finalItemType;
		}

		// some items have tags in RIS KW field and are captured by
		// RIS translator, e.g. https://plus.cobiss.net/cobiss/si/en/bib/78691587.
		// don't add tags to these items.
		if (item.tags.length === 0) {
			// other items e.g. https://plus.cobiss.net/cobiss/si/sl/bib/82789891 have tags,
			// but they're not in the RIS for some reason.
			var pageTags = doc.querySelectorAll('a[href^="bib/search?c=su="]');
			for (let tagElem of pageTags) {
				item.tags.push(tagElem.innerText);
			}
		}
		item.url = url;
		item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/sl/bib/92020483",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "Nauk o barvah po Goetheju. DVD 2/3, Poglobitev vsebine nauka o barvah, še posebej poglavja \"Fizične barve\" s prikazom eksperimentov",
				"creators": [
					{
						"lastName": "Kühl",
						"firstName": "Johannes",
						"creatorType": "director"
					}
				],
				"date": "2022",
				"ISBN": "9789619527542",
				"libraryCatalog": "COBISS",
				"place": "Hvaletinci",
				"studio": "NID Sapientia",
				"url": "https://plus.cobiss.net/cobiss/si/sl/bib/92020483",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Antropozofija"
					},
					{
						"tag": "Barve"
					}
				],
				"notes": [
					{
						"note": "<p>Dialogi v slov. in nem. s konsekutivnim prevodom v slov.</p>"
					},
					{
						"note": "<p>Tisk po naročilu</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/sl/bib/search?q=*&db=cobib&mat=allmaterials&cof=0_105b-p&pdfrom=01.01.2023",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/sl/bib/115256576",
		"items": [
			{
				"itemType": "book",
				"title": "Angel z zahodnega okna",
				"creators": [
					{
						"lastName": "Meyrink",
						"firstName": "Gustav",
						"creatorType": "author"
					}
				],
				"date": "2001",
				"ISBN": "9789616400107",
				"libraryCatalog": "Library Catalog (COBISS)",
				"numPages": "2 zv. (216; 203 )",
				"place": "Ljubljana",
				"publisher": "Založniški atelje Blodnjak",
				"series": "Zbirka Blodnjak",
				"url": "https://plus.cobiss.net/cobiss/si/sl/bib/115256576",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<p>Prevod dela: Der Engel vom westlichen Fenster</p>"
					},
					{
						"note": "<p>Gustav Meyrink / Herman Hesse: str. 198-200</p>"
					},
					{
						"note": "<p>Magični stekleni vrtovi judovske kulture / Jorge Luis Borges: str. 201-203</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/sl/bib/139084803",
		"items": [
			{
				"itemType": "webpage",
				"title": "Poročilo analiz vzorcev odpadnih vod na vsebnost prepovedanih in dovoljenih drog na področju centralne čistilne naprave Kranj (2022)",
				"creators": [
					{
						"lastName": "Heath",
						"firstName": "Ester",
						"creatorType": "author"
					},
					{
						"lastName": "Verovšek",
						"firstName": "Taja",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"url": "https://plus.cobiss.net/cobiss/si/sl/bib/139084803",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "dovoljene droge"
					},
					{
						"tag": "nedovoljene droge"
					},
					{
						"tag": "odpadne vode"
					},
					{
						"tag": "čistilna naprava"
					}
				],
				"notes": [
					{
						"note": "<p>Nasl. z nasl. zaslona</p>"
					},
					{
						"note": "<p>Opis vira z dne 11. 1. 2023</p>"
					},
					{
						"note": "<p>Bibliografija: str. 13</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/sl/bib/84534787",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Flood legislation and land policy framework of EU and non-EU countries in Southern Europe",
				"creators": [
					{
						"lastName": "Kapović-Solomun",
						"firstName": "Marijana",
						"creatorType": "author"
					},
					{
						"lastName": "Ferreira",
						"firstName": "Carla S.S.",
						"creatorType": "author"
					},
					{
						"lastName": "Zupanc",
						"firstName": "Vesna",
						"creatorType": "author"
					},
					{
						"lastName": "Ristić",
						"firstName": "Ratko",
						"creatorType": "author"
					},
					{
						"lastName": "Drobnjak",
						"firstName": "Aleksandar",
						"creatorType": "author"
					},
					{
						"lastName": "Kalantari",
						"firstName": "Zahra",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"ISSN": "2049-1948",
				"issue": "1",
				"journalAbbreviation": "WIREs",
				"libraryCatalog": "Library Catalog (COBISS)",
				"pages": "1-14",
				"publicationTitle": "WIREs",
				"url": "https://plus.cobiss.net/cobiss/si/sl/bib/84534787",
				"volume": "9",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "EU legislation"
					},
					{
						"tag": "Južna Evropa"
					},
					{
						"tag": "Southern Europe"
					},
					{
						"tag": "floods"
					},
					{
						"tag": "land governance"
					},
					{
						"tag": "policy framework"
					},
					{
						"tag": "politika"
					},
					{
						"tag": "poplave"
					},
					{
						"tag": "upravljanje zemljišč"
					},
					{
						"tag": "zakonodaja EU"
					}
				],
				"notes": [
					{
						"note": "<p>Nasl. z nasl. zaslona</p>"
					},
					{
						"note": "<p>Opis vira z dne 11. 11. 2021</p>"
					},
					{
						"note": "<p>Bibliografija: str. 12-14</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/sl/bib/5815649",
		"items": [
			{
				"itemType": "webpage",
				"title": "Rangiranje cest po metodologiji EuroRAP ; Elektronski vir: diplomska naloga = Rating roads using EuroRAP procedures",
				"creators": [
					{
						"lastName": "Pešec",
						"firstName": "Katja",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"shortTitle": "Rangiranje cest po metodologiji EuroRAP ; Elektronski vir",
				"url": "https://plus.cobiss.net/cobiss/si/sl/bib/5815649",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "EuroRAP"
					},
					{
						"tag": "EuroRAP"
					},
					{
						"tag": "VSŠ"
					},
					{
						"tag": "cesta in obcestje"
					},
					{
						"tag": "diplomska dela"
					},
					{
						"tag": "economic efficiency"
					},
					{
						"tag": "ekonomska učinkovitost"
					},
					{
						"tag": "gradbeništvo"
					},
					{
						"tag": "graduation thesis"
					},
					{
						"tag": "pilot project"
					},
					{
						"tag": "pilotski projekt"
					},
					{
						"tag": "predlagani (proti)ukrepi"
					},
					{
						"tag": "rangiranje cest"
					},
					{
						"tag": "road and roadside"
					},
					{
						"tag": "star rating"
					},
					{
						"tag": "suggested countermeasure"
					}
				],
				"notes": [
					{
						"note": "<p>Diplomsko delo visokošolskega strokovnega študija gradbeništva, Prometna smer</p>"
					},
					{
						"note": "<p>Nasl. z nasl. zaslona</p>"
					},
					{
						"note": "<p>Publikacija v pdf formatu obsega 103 str.</p>"
					},
					{
						"note": "<p>Bibliografija: str. 85-87</p>"
					},
					{
						"note": "<p>Izvleček ; Abstract</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/sl/bib/82789891",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Posvet Avtomatizacija strege in montaže 2021/2021 - ASM '21/22, Ljubljana, 11. 05. 2022: zbornik povzetkov s posveta",
				"creators": [
					{
						"lastName": "Posvet Avtomatizacija strege in montaže",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Herakovič",
						"firstName": "Niko",
						"creatorType": "editor"
					},
					{
						"lastName": "Debevec",
						"firstName": "Mihael",
						"creatorType": "editor"
					},
					{
						"lastName": "Pipan",
						"firstName": "Miha",
						"creatorType": "editor"
					},
					{
						"lastName": "Adrović",
						"firstName": "Edo",
						"creatorType": "editor"
					}
				],
				"date": "2022",
				"ISBN": "9789616980821",
				"libraryCatalog": "COBISS",
				"pages": "141",
				"place": "Ljubljana",
				"publisher": "Fakulteta za strojništvo",
				"shortTitle": "Posvet Avtomatizacija strege in montaže 2021/2021 - ASM '21/22, Ljubljana, 11. 05. 2022",
				"url": "https://plus.cobiss.net/cobiss/si/sl/bib/82789891",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<p>180 izv.</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/en/bib/78691587",
		"items": [
			{
				"itemType": "thesis",
				"title": "Modeliranje obratovanja transformatorskih postaj z metodami strojnega učenja: diplomsko delo: visokošolski strokovni študijski program prve stopnje Računalništvo in informatika",
				"creators": [
					{
						"lastName": "Čuš",
						"firstName": "Tibor",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"libraryCatalog": "COBISS",
				"numPages": "55",
				"place": "Ljubljana",
				"shortTitle": "Modeliranje obratovanja transformatorskih postaj z metodami strojnega učenja",
				"university": "[T. Čuš]",
				"url": "https://plus.cobiss.net/cobiss/si/en/bib/78691587",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "computer science"
					},
					{
						"tag": "diploma"
					},
					{
						"tag": "diplomske naloge"
					},
					{
						"tag": "electrical power system"
					},
					{
						"tag": "elektroenergetski sistem"
					},
					{
						"tag": "forecasting models"
					},
					{
						"tag": "indikatorji preobremenitev"
					},
					{
						"tag": "machine learning"
					},
					{
						"tag": "napovedni modeli"
					},
					{
						"tag": "overload indicators"
					},
					{
						"tag": "transformer station"
					},
					{
						"tag": "visokošolski strokovni študij"
					}
				],
				"notes": [
					{
						"note": "<p>Bibliografija: str. 53-55</p>"
					},
					{
						"note": "<p>Povzetek ; Abstract: Modeling transformer station operation with machine learning methods</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/en/bib/94705155#full",
		"items": [
			{
				"itemType": "book",
				"title": "Ljubezen v pismih: dopisovanje med Felicito Koglot in Francem Pericem: Aleksandrija-Bilje: 1921-1931",
				"creators": [
					{
						"lastName": "Koglot",
						"firstName": "Felicita",
						"creatorType": "author"
					},
					{
						"lastName": "Peric",
						"firstName": "Franc",
						"creatorType": "author"
					},
					{
						"lastName": "Vončina",
						"firstName": "Lara",
						"creatorType": "editor"
					},
					{
						"lastName": "Orel",
						"firstName": "Maja",
						"creatorType": "editor"
					},
					{
						"lastName": "Koren",
						"firstName": "Manca",
						"creatorType": "editor"
					},
					{
						"lastName": "Mihurko Poniž",
						"firstName": "Katja",
						"creatorType": "editor"
					}
				],
				"date": "2022",
				"ISBN": "9789617025224",
				"libraryCatalog": "COBISS",
				"numPages": "235",
				"place": "V Novi Gorici",
				"publisher": "Založba Univerze",
				"shortTitle": "Ljubezen v pismih",
				"url": "https://plus.cobiss.net/cobiss/si/en/bib/94705155#full",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Primorska"
					},
					{
						"tag": "Slovenke"
					},
					{
						"tag": "emigracija"
					},
					{
						"tag": "pisma"
					},
					{
						"tag": "ženske"
					}
				],
				"notes": [
					{
						"note": "<p>Potiskane notr. str. ov.</p>"
					},
					{
						"note": "<p>250 izv.</p>"
					},
					{
						"note": "<p>Kdo sta bila Felicita Koglot in Franc Peric in o knjižni izdaji njunega dopisovanja / Manca Koren, Maja Orel, Lara Vončina: str. 5-6</p>"
					},
					{
						"note": "<p>Kratek oris zgodovinskih razmer v Egiptu in na Primorskem v obdobju med obema vojnama / Manca Koren: str. 185-195</p>"
					},
					{
						"note": "<p>Franc Peric in Felicita Koglot: večkratne migracije v družinski korespondenci / Mirjam Milharčič Hladnik: str. 197-209</p>"
					},
					{
						"note": "<p>Družinsko življenje in doživljanje aleksandrinstva v pismih / Manca Koren: str. 211-228</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/en/bib/15409155#full",
		"items": [
			{
				"itemType": "artwork",
				"title": "Moja hči",
				"creators": [
					{
						"lastName": "Kraljič",
						"firstName": "Helena",
						"creatorType": "artist"
					}
				],
				"date": "2022",
				"libraryCatalog": "COBISS",
				"url": "https://plus.cobiss.net/cobiss/si/en/bib/15409155#full",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "pomoč"
					},
					{
						"tag": "prijateljstvo"
					},
					{
						"tag": "razumevanje"
					},
					{
						"tag": "samorealizacija"
					}
				],
				"notes": [
					{
						"note": "<p>Ilustr. na spojnih listih</p>"
					},
					{
						"note": "<p>1.500 izv.</p>"
					},
					{
						"note": "<p>Spremna beseda / Igor Saksida na preliminarni str.</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/en/bib/21773059",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "Druge gumbolovščine so prave pustolovščine: šola za 2. r harmonike z melodijskimi basi",
				"creators": [
					{
						"lastName": "Gvozdenac",
						"firstName": "Mirjana",
						"creatorType": "composer"
					}
				],
				"date": "2023",
				"label": "Musaik",
				"libraryCatalog": "COBISS",
				"place": "Izola",
				"seriesTitle": "Zbirka Musaik : harmonika solo",
				"shortTitle": "Druge gumbolovščine so prave pustolovščine",
				"url": "https://plus.cobiss.net/cobiss/si/en/bib/21773059",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Harmonika"
					},
					{
						"tag": "Učbeniki"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/en/bib/78691587",
		"items": [
			{
				"itemType": "thesis",
				"title": "Modeliranje obratovanja transformatorskih postaj z metodami strojnega učenja: diplomsko delo: visokošolski strokovni študijski program prve stopnje Računalništvo in informatika",
				"creators": [
					{
						"lastName": "Čuš",
						"firstName": "Tibor",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"libraryCatalog": "COBISS",
				"numPages": "55",
				"place": "Ljubljana",
				"shortTitle": "Modeliranje obratovanja transformatorskih postaj z metodami strojnega učenja",
				"university": "[T. Čuš]",
				"url": "https://plus.cobiss.net/cobiss/si/en/bib/78691587",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "computer science"
					},
					{
						"tag": "diploma"
					},
					{
						"tag": "diplomske naloge"
					},
					{
						"tag": "electrical power system"
					},
					{
						"tag": "elektroenergetski sistem"
					},
					{
						"tag": "forecasting models"
					},
					{
						"tag": "indikatorji preobremenitev"
					},
					{
						"tag": "machine learning"
					},
					{
						"tag": "napovedni modeli"
					},
					{
						"tag": "overload indicators"
					},
					{
						"tag": "transformer station"
					},
					{
						"tag": "visokošolski strokovni študij"
					}
				],
				"notes": [
					{
						"note": "<p>Bibliografija: str. 53-55</p>"
					},
					{
						"note": "<p>Povzetek ; Abstract: Modeling transformer station operation with machine learning methods</p>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
