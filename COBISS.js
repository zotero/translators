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
	"lastUpdated": "2023-08-17 18:57:34"
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
	// single items may end in an id number that is 6 digits or more
	var itemIDURL = /\d{6,}$/;
	// detailed view of single items ends in /#full
	var fullRecordURL = /#full$/;
	if (url.match(itemIDURL) || url.match(fullRecordURL)) {
		// capture type of material directly from the catalog page, e.g. "undergraduate thesis"
		var typeOfMaterial = doc.querySelector("button#add-biblioentry-to-shelf").getAttribute("data-mat-type");
		if (typeOfMaterial) {
			// use translateItemType function to translate catalog material type into a Zotero
			// item type, e.g "thesis"
			var detectItemType = translateItemType(typeOfMaterial);
			if (detectItemType) {
				return detectItemType;
			}
			// if a catalog item type isn't contained in the hash in translateItemType function,
			// return Zotero item type 'book', which is by far the most common item type in this catalog.
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

function constructRISURL(url) {
	// catalog page URL: https://plus.cobiss.net/cobiss/si/sl/bib/107937536
	// RIS URL: https://plus.cobiss.net/cobiss/si/sl/bib/risCit/107937536

	// capture first part of URL, e.g. https://plus.cobiss.net/cobiss/si/sl/bib/
	const firstRegex = /^(.*?)\/bib\//;
	let firstUrl = url.match(firstRegex)[0];

	// capture item ID, e.g. /92020483
	const secondRegex = /\/([^/]+)$/;
	let secondUrl = url.match(secondRegex)[0];

	// outputs correct RIS URL structure
	let risURL = firstUrl + "risCit" + secondUrl;
	return risURL;
}

function constructEnglishURL(url) {
	// default catalog page URL: https://plus.cobiss.net/cobiss/si/sl/bib/107937536
	// page with English metadata: https://plus.cobiss.net/cobiss/si/en/bib/107937536
	// most COBISS catalogs follow the format where the language code is two characters e.g. "sl"
	// except ones with three languages, e.g.: https://plus.cobiss.net/cobiss/cg/cnr_cyrl/bib/20926212
	// where there are language codes for english, latin montenegrin, and cyrillic montenegrin
	const firstPartRegex = /https:\/\/plus\.cobiss\.net\/cobiss\/[a-z]{2}\//;
	const endPartRegex = /\/bib\/\S*/;

	const firstPart = url.match(firstPartRegex)[0];
	const endPart = url.match(endPartRegex)[0];
	var englishURL = firstPart + "en" + endPart;
	return englishURL;
}

// in the catalog, too many items are classified in RIS as either BOOK or ELEC,
// including many reports, ebooks, etc, that thus are incorrectly assigned itemType "book" or "webpage"
// when we rely on Zotero RIS translator. This map assigns more accurate itemTypes
// based on "type of material" classification in English catalog, instead of relying on RIS.
// this function also assigns itemType for catalog items with no RIS.
function translateItemType(englishCatalogItemType) {
	var catalogItemTypeHash = new Map([
		['undergraduate thesis', 'thesis'],
		['proceedings', 'conferencePaper'],
		['novel', 'book'],
		['science fiction (prose)', 'book'],
		['book', 'book'],
		['handbook', 'book'],
		['proceedings of conference contributions', 'conferencePaper'],
		['professional monograph', 'report'],
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
		['expertise', 'hearing'], // court testimony, e.g. https://plus.cobiss.net/cobiss/si/en/bib/94791683
		['profess. monogr', 'report'],
		['project documentation', 'report'],
		['antiquarian material', 'book'], // mostly books, e.g. https://plus.cobiss.net/cobiss/si/en/bib/7543093
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
		['examin. paper', 'report'],
		['annual', 'report'],
		['yearly', 'report'],
		['documentary lit', 'book'],
		['folk literature', 'book'],
		['patent', 'patent'],
		['regulations', 'report'],
		['conf. materials', 'conferencePaper'],
		['radio play', 'book'],
		['letters', 'book'],
		['literature survey/review', 'report'],
		['statute', 'statute'],
		['matura paper', 'thesis'],
		['seminar paper', 'thesis'],
		['habilitation', 'thesis'],
		['dramaturgical paper', 'thesis'],
		['article, component part', 'journalArticle'],
		['e-article', 'journalArticle'],
		['periodical', 'book'],
		['monogr. series', 'book'],
		['audio CD', 'audioRecording'],
		['audio cassette', 'audioRecording'],
		['disc', 'audioRecording'],
		['music, sound recording', 'audioRecording'],
		['audio DVD', 'audioRecording'],
		['printed and manuscript music', 'audioRecording'],
		['graphics', 'artwork'],
		['poster', 'artwork'],
		['photograph', 'artwork'],
		['e-video', 'videoRecording'],
		['video DVD', 'videoRecording'],
		['video cassette', 'videoRecording'],
		['blu-ray', 'videoRecording'],
		['motion picture', 'videoRecording'],
		['map', 'map'],
		['atlas', 'map'],
		['electronic resource', 'webpage'],
		['computer CD, DVD, USB', 'computerProgram'],
		['article, component part ', 'journalArticle']
		// there are likely other catalog item types in COBISS,
		// which could be added to this hash later if they're being
		// imported with the wrong Zotero item type

	]);
	return (catalogItemTypeHash.get(englishCatalogItemType));
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
	var finalItemType = "";
	// if url matches /en/bib/, then skip constructing englishURL
	if (url.match("/en/bib")) {
		// get catalog item type from page, then translate to Zotero item type using translateItemType()
		var nativeEnglishItemType = doc.querySelector("button#add-biblioentry-to-shelf").getAttribute("data-mat-type");
		finalItemType = translateItemType(nativeEnglishItemType);
	}
	else {
		// replace specific language in bib record URL with english to detect item type
		var englishURL = constructEnglishURL(url);
		var englishDocument = await requestDocument(englishURL);
		var englishItemType = englishDocument.querySelector("button#add-biblioentry-to-shelf").getAttribute("data-mat-type");
		finalItemType = translateItemType(englishItemType);
	}
	if (doc.getElementById("unpaywall-link")) {
		var pdfLink = doc.getElementById("unpaywall-link").href;
	}
	if (doc.getElementById('showUrlHref')) {
		var fullTextLink = doc.getElementById('showUrlHref').href;
	}

	const risURL = constructRISURL(url);
	const risText = await requestText(risURL);
	// case for catalog items with RIS (95%+ of items)
	if (risText) {
		// RIS always has an extraneous OK## at the beginning, remove it
		let fixedRisText = risText.replace(/^OK##/, '');
		// PY tag sometimes has 'cop.' at the end - remove it or it makes the date parser return '0000' for some reason
		fixedRisText = fixedRisText.replace(/^(PY\s*-\s*.+)cop\.$/m, '$1');
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
			else if (fullTextLink) {
				if (fullTextLink.match(/.pdf$/)) {
					item.attachments.push({
						url: fullTextLink,
						title: 'Full Text PDF',
						mimeType: 'application/pdf'
					});
				}
				else {
					item.attachments.push({
						url: fullTextLink,
						title: 'Full Text',
						mimeType: 'text/html'
					});
				}
			}

			// if finalItemType is found from the catalog page, override itemType from RIS with it.
			// if "Type of material" from catalog page isn't in catalogItemTypeHash, finalItemType will return as undefined.
			// in this case, default Type from RIS will remain.
			if (finalItemType) {
				item.itemType = finalItemType;
			}

			// some items have tags in RIS KW field and are captured by
			// RIS translator, e.g. https://plus.cobiss.net/cobiss/si/en/bib/78691587.
			// don't add dupliicate tags from the page to these items.
			if (item.tags.length === 0) {
				// other items e.g. https://plus.cobiss.net/cobiss/si/sl/bib/82789891 have tags,
				// but they're not in the RIS. In this case, add tags from catalog page.
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

	// case for catalog items with no RIS (remaining 5% or so of items) where we can't use the RIS import translator
	else {
		// construct correct fullRecord URL from basic catalog URL or #full URL
		// base URL: https://plus.cobiss.net/cobiss/si/sl/bib/93266179
		// JSON URL: https://plus.cobiss.net/cobiss/si/sl/bib/COBIB/93266179/full
		var jsonUrl = url.replace(/\/bib\/(\d+)/, "/bib/COBIB/$1/full");
		var fullRecord = await requestJSON(jsonUrl);
		var noRISItem = new Zotero.Item(finalItemType);
		noRISItem.title = fullRecord.titleCard.value;
		var creatorsJson = fullRecord.author700701.value;
		var brSlashRegex = /<br\/>/;
		var creators = creatorsJson.split(brSlashRegex).map(value => value.trim());
		for (let creator of creators) {
			// creator role isn't defined in metadata, so assign everyone "author" role
			let role = "author";
			noRISItem.creators.push(ZU.cleanAuthor(creator, role, true));
		}
		if (fullRecord.languageCard) noRISItem.language = fullRecord.languageCard.value;
		if (fullRecord.publishDate) noRISItem.date = fullRecord.publishDate.value;
		if (fullRecord.edition) noRISItem.edition = fullRecord.edition.value;
		if (fullRecord.isbnCard) noRISItem.ISBN = fullRecord.isbnCard.value;

		if (fullRecord.publisherCard) {
			var placePublisher = fullRecord.publisherCard.value;
			// example string for publisherCard.value: "Ljubljana : Intelego, 2022"
			const colonIndex = placePublisher.indexOf(":");
			const commaIndex = placePublisher.indexOf(",");
			noRISItem.place = placePublisher.slice(0, colonIndex).trim();
			noRISItem.publisher = placePublisher.slice(colonIndex + 2, commaIndex).trim();
		}

		if (fullRecord.notesCard) {
			var notesJson = fullRecord.notesCard.value;
			var brRegex = /<br>/;
			var notes = notesJson.split(brRegex).map(value => value.trim());
			for (let note of notes) {
				noRISItem.notes.push(note);
			}
		}

		// add subjects from JSON as tags. There are three fields that contain tags,
		// sgcHeadings, otherSubjects and subjectCardUncon with
		// different separators. sgcHeadings and otherSubjects use <br>, subjectCardUncon uses /
		if (fullRecord.sgcHeadings) {
			var sgcHeadingsJson = fullRecord.sgcHeadings.value;
			var sgcHeadingTags = sgcHeadingsJson.split(brRegex).map(value => value.trim());
			for (let sgcHeadingTag of sgcHeadingTags) {
				noRISItem.tags.push(sgcHeadingTag);
			}
		}

		if (fullRecord.otherSubjects) {
			var otherSubjectsJson = fullRecord.otherSubjects.value;
			var otherSubjectsTags = otherSubjectsJson.split(brRegex).map(value => value.trim());
			for (let otherSubjectsTag of otherSubjectsTags) {
				noRISItem.tags.push(otherSubjectsTag);
			}
		}

		if (fullRecord.subjectCardUncon) {
			var subjectCardUnconJson = fullRecord.subjectCardUncon.value;
			const slashRegex = /\//;
			var subjectCardUnconTags = subjectCardUnconJson.split(slashRegex).map(value => value.trim());
			for (let subjectCardUnconTag of subjectCardUnconTags) {
				noRISItem.tags.push(subjectCardUnconTag);
			}
		}
		// add attachments to RIS items
		if (pdfLink) {
			noRISItem.attachments.push({
				url: pdfLink,
				title: 'Full Text PDF',
				mimeType: 'application/pdf'
			});
		}
		else if (fullTextLink) {
			if (fullTextLink.match(/.pdf$/)) {
				noRISItem.attachments.push({
					url: fullTextLink,
					title: 'Full Text PDF',
					mimeType: 'application/pdf'
				});
			}
			else {
				noRISItem.attachments.push({
					url: fullTextLink,
					title: 'Full Text',
					mimeType: 'text/html'
				});
			}
		}
		noRISItem.complete();
	}
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
				"attachments": [],
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
				"libraryCatalog": "COBISS",
				"numPages": "2 zv. (216; 203 )",
				"place": "Ljubljana",
				"publisher": "Založniški atelje Blodnjak",
				"series": "Zbirka Blodnjak",
				"url": "https://plus.cobiss.net/cobiss/si/sl/bib/115256576",
				"attachments": [],
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
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "report",
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
				"institution": "Institut Jožef Stefan",
				"libraryCatalog": "COBISS",
				"pages": "1 USB-ključ",
				"place": "Ljubljana",
				"url": "https://plus.cobiss.net/cobiss/si/sl/bib/139084803",
				"attachments": [],
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
		"detectedItemType": "book",
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
				"libraryCatalog": "COBISS",
				"pages": "1-14",
				"publicationTitle": "WIREs",
				"url": "https://plus.cobiss.net/cobiss/si/sl/bib/84534787",
				"volume": "9",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "thesis",
				"title": "Rangiranje cest po metodologiji EuroRAP ; Elektronski vir: diplomska naloga = Rating roads using EuroRAP procedures",
				"creators": [
					{
						"lastName": "Pešec",
						"firstName": "Katja",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"libraryCatalog": "COBISS",
				"place": "Ljubljana",
				"shortTitle": "Rangiranje cest po metodologiji EuroRAP ; Elektronski vir",
				"university": "[K. Pešec]",
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
		"detectedItemType": "book",
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
				"attachments": [],
				"tags": [
					{
						"tag": "Avtomatizacija"
					},
					{
						"tag": "Posvetovanja"
					},
					{
						"tag": "Strojništvo"
					}
				],
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
						"title": "Full Text",
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
				"attachments": [],
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
						"title": "Full Text",
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
		"url": "https://plus.cobiss.net/cobiss/si/en/bib/search?q=*&db=cobib&mat=allmaterials&cof=0_105b-mb16",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/en/bib/101208835",
		"items": [
			{
				"itemType": "book",
				"title": "Fizika. Zbirka maturitetnih nalog z rešitvami 2012-2017 / [avtorji Vitomir Babič ... [et al.] ; urednika Aleš Drolc, Joži Trkov]",
				"creators": [
					{
						"firstName": "Vito",
						"lastName": "Babič",
						"creatorType": "author"
					},
					{
						"firstName": "Ruben",
						"lastName": "Belina",
						"creatorType": "author"
					},
					{
						"firstName": "Peter",
						"lastName": "Gabrovec",
						"creatorType": "author"
					},
					{
						"firstName": "Marko",
						"lastName": "Jagodič",
						"creatorType": "author"
					},
					{
						"firstName": "Aleš",
						"lastName": "Mohorič",
						"creatorType": "author"
					},
					{
						"firstName": "Mirijam",
						"lastName": "Pirc",
						"creatorType": "author"
					},
					{
						"firstName": "Gorazd",
						"lastName": "Planinšič",
						"creatorType": "author"
					},
					{
						"firstName": "Mitja",
						"lastName": "Slavinec",
						"creatorType": "author"
					},
					{
						"firstName": "Ivica",
						"lastName": "Tomić",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"ISBN": "9789616899420",
				"edition": "3. ponatis",
				"language": "Slovenian",
				"libraryCatalog": "COBISS",
				"place": "Ljubljana",
				"publisher": "Državni izpitni center",
				"attachments": [],
				"tags": [
					{
						"tag": "Fizika -- Matura -- 2012-2017 -- Vaje za srednje šole"
					},
					{
						"tag": "Fizika -- Vaje za maturo"
					},
					{
						"tag": "izpitne naloge za srednje šole"
					},
					{
						"tag": "naloge"
					},
					{
						"tag": "rešitve"
					},
					{
						"tag": "testi znanja"
					},
					{
						"tag": "učbeniki za srednje šole"
					}
				],
				"notes": [
					"Nasl. na hrbtu: Fizika 2012-2017",
					"Avtorji navedeni v kolofonu",
					"600 izv."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/sl/bib/93266179",
		"items": [
			{
				"itemType": "book",
				"title": "Matematika na splošni maturi : 2022 : vprašanja in odgovori za ustni izpit iz matematike na splošni maturi za osnovno raven / Bojana Dvoržak",
				"creators": [
					{
						"firstName": "Bojana",
						"lastName": "Dvoržak",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"ISBN": "9789616558624",
				"edition": "1. izd.",
				"language": "slovenski",
				"libraryCatalog": "COBISS",
				"place": "Ljubljana",
				"publisher": "Intelego",
				"shortTitle": "Matematika na splošni maturi",
				"attachments": [],
				"tags": [
					{
						"tag": "Matematika"
					},
					{
						"tag": "Matematika -- Katalogi znanja za srednje šole"
					},
					{
						"tag": "Matematika -- Matura -- Vaje za srednje šole"
					},
					{
						"tag": "Matematika -- Vaje za maturo"
					},
					{
						"tag": "Matura"
					},
					{
						"tag": "Naloge, vaje itd."
					},
					{
						"tag": "izpitne naloge za srednje šole"
					},
					{
						"tag": "odgovori"
					},
					{
						"tag": "osnovna raven"
					},
					{
						"tag": "rešitve"
					},
					{
						"tag": "testi znanja"
					},
					{
						"tag": "učbeniki za srednje šole"
					},
					{
						"tag": "vprašanja"
					},
					{
						"tag": "zaključni izpiti"
					}
				],
				"notes": [
					"Dodatek k nasl. v kolofonu in CIP-u: Vprašanja in odgovori za ustni izpit iz matematike na splošni maturi 2022 za osnovno raven",
					"1.000 izv."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/en/bib/143385859",
		"items": [
			{
				"itemType": "book",
				"title": "Fizika. Zbirka maturitetnih nalog z rešitvami 2012-2017 / [avtorji Vitomir Babič ... [et al.] ; urednika Aleš Drolc, Joži Trkov]",
				"creators": [
					{
						"firstName": "Vito",
						"lastName": "Babič",
						"creatorType": "author"
					},
					{
						"firstName": "Ruben",
						"lastName": "Belina",
						"creatorType": "author"
					},
					{
						"firstName": "Peter",
						"lastName": "Gabrovec",
						"creatorType": "author"
					},
					{
						"firstName": "Marko",
						"lastName": "Jagodič",
						"creatorType": "author"
					},
					{
						"firstName": "Aleš",
						"lastName": "Mohorič",
						"creatorType": "author"
					},
					{
						"firstName": "Mirijam",
						"lastName": "Pirc",
						"creatorType": "author"
					},
					{
						"firstName": "Gorazd",
						"lastName": "Planinšič",
						"creatorType": "author"
					},
					{
						"firstName": "Mitja",
						"lastName": "Slavinec",
						"creatorType": "author"
					},
					{
						"firstName": "Ivica",
						"lastName": "Tomić",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"ISBN": "9789616899420",
				"edition": "4. ponatis",
				"language": "Slovenian",
				"libraryCatalog": "COBISS",
				"place": "Ljubljana",
				"publisher": "Državni izpitni center",
				"attachments": [],
				"tags": [
					{
						"tag": "Fizika -- Matura -- 2012-2017 -- Priročniki"
					},
					{
						"tag": "Fizika -- Vaje za maturo"
					},
					{
						"tag": "izpitne naloge za srednje šole"
					},
					{
						"tag": "naloge"
					},
					{
						"tag": "rešitve"
					},
					{
						"tag": "učbeniki za srednje šole"
					},
					{
						"tag": "vaje za srednje šole"
					}
				],
				"notes": [
					"Hrbtni nasl.: Fizika 2012-2017",
					"Avtorji navedeni v kolofonu",
					"300 izv."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/en/bib/70461955",
		"items": [
			{
				"itemType": "book",
				"title": "Napredna znanja za kakovostno mentorstvo v zdravstveni negi: znanstvena monografija",
				"creators": [
					{
						"lastName": "Filej",
						"firstName": "Bojana",
						"creatorType": "editor"
					},
					{
						"lastName": "Kaučič",
						"firstName": "Boris Miha",
						"creatorType": "editor"
					}
				],
				"date": "2023",
				"ISBN": "9789616889377",
				"edition": "1. izd.",
				"libraryCatalog": "COBISS",
				"place": "Celje",
				"publisher": "Fakulteta za zdravstvene vede",
				"shortTitle": "Napredna znanja za kakovostno mentorstvo v zdravstveni negi",
				"url": "https://plus.cobiss.net/cobiss/si/en/bib/70461955",
				"attachments": [
					{
						"title": "Full Text",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Izobrževanje"
					},
					{
						"tag": "Mentorstvo"
					},
					{
						"tag": "Mentorstvo"
					},
					{
						"tag": "Praktična znanja"
					},
					{
						"tag": "Vzgoja in izobraževanje"
					},
					{
						"tag": "Zborniki"
					},
					{
						"tag": "Zdravstvena nega"
					},
					{
						"tag": "Zdravstvena nega"
					}
				],
				"notes": [
					{
						"note": "<p>Nasl. z nasl. zaslona</p>"
					},
					{
						"note": "<p>Dokument v pdf formatu obsega 94 str.</p>"
					},
					{
						"note": "<p>Opis vira z dne 1. 2. 2023</p>"
					},
					{
						"note": "<p>Bibliografija pri posameznih poglavjih</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/en/bib/105123075",
		"items": [
			{
				"itemType": "report",
				"title": "Storitveni sektor in siva ekonomija v času epidemije COVID-19: raziskovalno delo: področje: ekonomija in turizem",
				"creators": [
					{
						"lastName": "Hochkraut",
						"firstName": "Nataša",
						"creatorType": "author"
					},
					{
						"lastName": "Verbovšek",
						"firstName": "Lea",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"institution": "Osnovna šola Primoža Trubarja",
				"libraryCatalog": "COBISS",
				"place": "Laško",
				"shortTitle": "Storitveni sektor in siva ekonomija v času epidemije COVID-19",
				"url": "https://plus.cobiss.net/cobiss/si/en/bib/105123075",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "COVID 19"
					},
					{
						"tag": "SARS-Cov-2"
					},
					{
						"tag": "izvajalci storitev"
					},
					{
						"tag": "korelacija"
					},
					{
						"tag": "koronavirus"
					},
					{
						"tag": "potrošniki"
					},
					{
						"tag": "raziskovalne naloge"
					},
					{
						"tag": "siva ekonomija"
					},
					{
						"tag": "statistika"
					},
					{
						"tag": "storitveni sektor"
					}
				],
				"notes": [
					{
						"note": "<p>Raziskovalna naloga v okviru projekta Mladi za Celje 2022</p>"
					},
					{
						"note": "<p>Povzetek v slov in angl.</p>"
					},
					{
						"note": "<p>Bibliografija: f. 35-36</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/en/bib/84576259",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "Reforma: tribute to Laibach",
				"creators": [
					{
						"lastName": "Noctiferia",
						"creatorType": "composer",
						"fieldMode": 1
					}
				],
				"date": "2021",
				"label": "Nika",
				"libraryCatalog": "COBISS",
				"place": "Ljubljana",
				"shortTitle": "Reforma",
				"url": "https://plus.cobiss.net/cobiss/si/en/bib/84576259",
				"attachments": [
					{
						"title": "Full Text",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "avantgardna glasba"
					},
					{
						"tag": "avantgardni rock"
					},
					{
						"tag": "black metal"
					},
					{
						"tag": "death metal"
					},
					{
						"tag": "extreme metal"
					},
					{
						"tag": "heavy metal"
					},
					{
						"tag": "industrial metal"
					},
					{
						"tag": "metal"
					},
					{
						"tag": "priredbe"
					}
				],
				"notes": [
					{
						"note": "<p>Leto posnetja 2021</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/al/sq/bib/334906368",
		"items": [
			{
				"itemType": "book",
				"title": "Trëndafili i mesnatës",
				"creators": [
					{
						"lastName": "Riley",
						"firstName": "Lucinda",
						"creatorType": "author"
					}
				],
				"date": "[2022]",
				"ISBN": "9789928366108",
				"libraryCatalog": "COBISS",
				"numPages": "603 f.",
				"place": "[Tiranë]",
				"publisher": "Dituria",
				"series": "Letërsi e huaj bashkëkohore",
				"url": "https://plus.cobiss.net/cobiss/al/sq/bib/334906368",
				"attachments": [],
				"tags": [
					{
						"tag": "letërsia irlandeze"
					},
					{
						"tag": "romane"
					}
				],
				"notes": [
					{
						"note": "<p>Tit. i origj.: The midnight rose</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/bh/sr/bib/47388678",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "thesis",
				"title": "The influence of negative transfer on the use of collocations in high school student's writing = Utjecaj negativnog transfera na korištenje kolokacija u pismenim zadaćama učenika srednjih škola",
				"creators": [
					{
						"lastName": "Đapo",
						"firstName": "Amra",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"libraryCatalog": "COBISS",
				"numPages": "76 listova",
				"place": "Tuzla",
				"university": "[A. Đapo]",
				"url": "https://plus.cobiss.net/cobiss/bh/sr/bib/47388678",
				"attachments": [],
				"tags": [
					{
						"tag": "acquisition"
					},
					{
						"tag": "collocations"
					},
					{
						"tag": "engleski kao drugi jezik"
					},
					{
						"tag": "errors"
					},
					{
						"tag": "greške"
					},
					{
						"tag": "kolokacije"
					},
					{
						"tag": "magistarski rad"
					},
					{
						"tag": "transfer"
					},
					{
						"tag": "transfer"
					},
					{
						"tag": "usvajanje"
					}
				],
				"notes": [
					{
						"note": "<p>Bibliografija: listovi 73-76</p>"
					},
					{
						"note": "<p>Sažetak ; Summary</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/rs/sr/bib/57790729",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Закон о Централном регистру обавезног социјалног осигурања, са подзаконским актима",
				"creators": [
					{
						"lastName": "Србија",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Мартић",
						"firstName": "Вера",
						"creatorType": "editor"
					}
				],
				"dateEnacted": "2022",
				"pages": "II, 74 стр.",
				"url": "https://plus.cobiss.net/cobiss/rs/sr/bib/57790729",
				"attachments": [],
				"tags": [
					{
						"tag": "Београд"
					},
					{
						"tag": "Законски прописи"
					},
					{
						"tag": "Централни регистар обавезног социјалног осигурања"
					}
				],
				"notes": [
					{
						"note": "<p>Тираж 300</p>"
					},
					{
						"note": "<p>Напомене и библиографске референце уз текст.</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/bg/en/bib/51193608",
		"items": [
			{
				"itemType": "thesis",
				"title": "Хирургични аспекти на аноректалните абсцеси при деца и възрастни: дисертационен труд за присъждане на образователна и научна степен \"доктор\", област на висше образование 7. Здравеопазване и спорт, професионално направление 7.1 Медицина, научна специалност: 03.01.37 Обща хирургия",
				"creators": [
					{
						"lastName": "Хаджиева",
						"firstName": "Елена Божидарова",
						"creatorType": "author"
					},
					{
						"lastName": "Hadžieva",
						"firstName": "Elena Božidarova",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"libraryCatalog": "COBISS",
				"numPages": "198 л.",
				"place": "Пловдив",
				"shortTitle": "Хирургични аспекти на аноректалните абсцеси при деца и възрастни",
				"university": "[Е. Хаджиева]",
				"url": "https://plus.cobiss.net/cobiss/bg/en/bib/51193608",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "<p>Библиогр.: л. 175-190</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/ks/sq/bib/120263427",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Kumtesat nga konferenca shkencore ndërkombëtare: (17 dhe 18 nëntor 2021): Ndikimi i COVID-19 në humbjet mësimore - pasojat në rritjen e pabarazive në mësim dhe sfidat e përmbushjes/kompensimit",
				"creators": [
					{
						"lastName": "Instituti Pedagogjik i Kosovës",
						"firstName": "Konferenca shkencore ndërkombëtare",
						"creatorType": "author"
					},
					{
						"lastName": "Koliqi",
						"firstName": "Hajrullah",
						"creatorType": "editor"
					}
				],
				"date": "2021",
				"ISBN": "9789951591560",
				"libraryCatalog": "COBISS",
				"pages": "190 f.",
				"place": "Prishtinë",
				"publisher": "Instituti Pedagogjik i Kosovës",
				"shortTitle": "Kumtesat nga konferenca shkencore ndërkombëtare",
				"url": "https://plus.cobiss.net/cobiss/ks/sq/bib/120263427",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "covid-19"
					},
					{
						"tag": "mësimi online"
					},
					{
						"tag": "përmbledhjet e punimeve"
					},
					{
						"tag": "sistemet arsimore"
					}
				],
				"notes": [
					{
						"note": "<p>Përmbledhjet në gjuhën shqipe dhe angleze</p>"
					},
					{
						"note": "<p>Bibliografia në fund të çdo punimi</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/mk/en/bib/search?q=*&db=cobib&mat=allmaterials&tyf=1_gla_cd",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/mk/mk/bib/57036037",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "Крени ме",
				"creators": [
					{
						"lastName": "Кајшаров",
						"firstName": "Константин",
						"creatorType": "composer"
					}
				],
				"date": "2022",
				"label": "К. Кајшаров",
				"libraryCatalog": "COBISS",
				"place": "Скопје",
				"url": "https://plus.cobiss.net/cobiss/mk/mk/bib/57036037",
				"attachments": [],
				"tags": [
					{
						"tag": "CD-a"
					},
					{
						"tag": "Вокално-инструментални композиции"
					},
					{
						"tag": "Духовна музика"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/cg/cnr_cyrl/bib/20926212",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "thesis",
				"title": "Menadžment ljudskih resursa: diplomski rad",
				"creators": [
					{
						"lastName": "Obradović",
						"firstName": "Nikoleta",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"libraryCatalog": "COBISS",
				"place": "Podgorica",
				"shortTitle": "Menadžment ljudskih resursa",
				"university": "[N. Obradović]",
				"url": "https://plus.cobiss.net/cobiss/cg/cnr_cyrl/bib/20926212",
				"attachments": [],
				"tags": [
					{
						"tag": "Diplomski radovi"
					},
					{
						"tag": "Menadžment ljudskih resursa"
					}
				],
				"notes": [
					{
						"note": "<p>Nasl. sa nasl. ekrana</p>"
					},
					{
						"note": "<p>Bibliografija</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/sr/sr_latn/bib/search?q=*&db=cobib&mat=allmaterials",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/sr/sr_latn/bib/15826441",
		"items": [
			{
				"itemType": "book",
				"title": "Zanosni",
				"creators": [
					{
						"lastName": "Prince",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Принс",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Božić",
						"firstName": "Aleksandar",
						"creatorType": "editor"
					},
					{
						"lastName": "Божић",
						"firstName": "Александар",
						"creatorType": "editor"
					}
				],
				"date": "2022",
				"ISBN": "9788664630160",
				"libraryCatalog": "COBISS",
				"numPages": "281",
				"place": "Beograd",
				"publisher": "IPC Media",
				"series": "Edicija (B)io",
				"url": "https://plus.cobiss.net/cobiss/sr/sr_latn/bib/15826441",
				"attachments": [],
				"tags": [
					{
						"tag": "Аутобиографија"
					},
					{
						"tag": "Принс, 1958-2016"
					}
				],
				"notes": [
					{
						"note": "<p>Prevod dela: The beautiful ones / Prince</p>"
					},
					{
						"note": "<p>Autorove slike</p>"
					},
					{
						"note": "<p>Tiraž 1.000</p>"
					},
					{
						"note": "<p>Str. 4-49: Predgovor / Den Pajpenbring</p>"
					},
					{
						"note": "<p>O autorima: str. [282].</p>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
