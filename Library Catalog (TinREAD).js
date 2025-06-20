{
	"translatorID": "78835a5b-3378-49c2-a94f-3422aab0e949",
	"label": "Library Catalog (TinREAD)",
	"creator": "Franklin Pezzuti Dyer",
	"target": "^https?://[^/]+/opac/bibliographic_view",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 250,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-08-01 14:15:46"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Franklin Pezzuti Dyer

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

const ICON_DETECT_MAPPING = {
	"s_book.gif": "journalArticle",
	"s_e_resource.gif": "journalArticle",
	"book.gif": "book"
};

function detectWeb(doc, _url) {
	let footer = text(doc, "#footer");
	if (!footer.toUpperCase().includes("TINREAD")) return false;

	// Rather than parsing text in two different languages, we are using the icon
	let typeIcons = doc.querySelectorAll(".crs_recordtype_icon");
	if (typeIcons.length == 0) return false;
	else if (typeIcons.length > 1) return "multiple";
	let typeIcon = typeIcons[0].src;
	let iname;
	for (iname in ICON_DETECT_MAPPING) {
		if (typeIcon.includes(iname)) {
			return ICON_DETECT_MAPPING[iname];
		}
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('li.reslt_item_head > a[name="book_link"]');
	for (let row of rows) {
		let href = new URL(row.href).href;
		let title = row.title;
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
	let urlParts = new URL(url);
	let pathParts = urlParts.pathname.split('/');
	let entryID = pathParts[pathParts.length - 1];	// Last part of path is the ID
	let marcUrl = "/marcexport.svc?enc=UTF-8&fmt=xml&items=none&marc=Current&type=bib&id=";
	marcUrl = marcUrl.concat(entryID);
	let marcText = await requestText(marcUrl);

	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("edd87d07-9194-42f8-b2ad-997c4c7deefd"); // MARCXML
	translator.setString(marcText);

	// Sometimes the MARC contains a dummy record for the book's series,
	// so just complete the item with the most creators
	translator.setHandler("itemDone", () => {});
	let items = await translator.translate();
	if (!items.length) return;
	items.sort((i1, i2) => i2.creators.length - i1.creators.length);
	items[0].complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://opac.biblioteca.ase.ro/opac/bibliographic_view/144193?pn=opac%2FSearch&q=gheorghe+carstea#level=all&location=0&ob=asc&q=gheorghe+carstea&sb=relevance&start=0&view=CONTENT",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "book",
				"title": "Managementul achizitiilor publice",
				"creators": [
					{
						"firstName": "Gheorghe",
						"lastName": "Carstea",
						"creatorType": "author"
					},
					{
						"firstName": "Monica Viorica",
						"lastName": "Nedelcu",
						"creatorType": "author"
					}
				],
				"date": "2002",
				"ISBN": "9789735941130",
				"callNumber": "352.5",
				"libraryCatalog": "Library Catalog (TinREAD)",
				"numPages": "165",
				"place": "Bucuresti",
				"publisher": "Editura ASE",
				"attachments": [],
				"tags": [
					{
						"tag": "achizitii"
					},
					{
						"tag": "administratie publica"
					},
					{
						"tag": "cursuri multigrafiate"
					},
					{
						"tag": "guvern"
					},
					{
						"tag": "licitatii"
					},
					{
						"tag": "management"
					},
					{
						"tag": "sector public"
					}
				],
				"notes": [
					{
						"note": "CZU 35.073.511 ; 65.012.4 ; 075.8"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://tinread.biblioteca.ct.ro/opac/bibliographic_view/238969?pn=opac/Search&amp;q=educatie+fizica#level=all&amp;location=0&amp;ob=asc&amp;q=educatie+fizica&amp;sb=relevance&amp;start=0&amp;view=CONTENT",
		"items": [
			{
				"itemType": "book",
				"title": "Metodica predării educaţiei fizice şi sportului",
				"creators": [
					{
						"firstName": "Elena",
						"lastName": "Lupu",
						"creatorType": "author"
					}
				],
				"date": "2006",
				"ISBN": "9789736114366",
				"callNumber": "796(075.8)",
				"language": "rum",
				"libraryCatalog": "Library Catalog (TinREAD)",
				"place": "Iaşi",
				"publisher": "Institutul European",
				"series": "Cursus. Educaţie fizică",
				"seriesNumber": "18",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://catalog.ucv.ro/opac/bibliographic_view/68938?pn=opac/Search&amp;q=educatie+fizica#level=all&amp;location=0&amp;ob=asc&amp;q=educatie+fizica&amp;sb=relevance&amp;start=0&amp;view=CONTENT",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "book",
				"title": "Lecţia de educaţie fizică",
				"creators": [
					{
						"firstName": "Emil",
						"lastName": "Ghibu",
						"creatorType": "author"
					}
				],
				"date": "1957",
				"callNumber": "796:371.3",
				"language": "rum",
				"libraryCatalog": "Library Catalog (TinREAD)",
				"place": "Bucureşti",
				"publisher": "Editura Tineretului",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://tinread.upit.ro/opac/bibliographic_view/37902?pn=opac/Search&amp;q=metodica+educatie+fizica#level=all&amp;location=0&amp;ob=asc&amp;q=metodica+educatie+fizica&amp;sb=relevance&amp;start=0&amp;view=CONTENT",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "book",
				"title": "Metodica dezvoltării calităţilor fizice",
				"creators": [
					{
						"firstName": "Corneliu",
						"lastName": "Florescu",
						"creatorType": "author"
					},
					{
						"firstName": "Vasile",
						"lastName": "Dumitrescu",
						"creatorType": "author"
					},
					{
						"firstName": "Aurel",
						"lastName": "Predescu",
						"creatorType": "author"
					}
				],
				"date": "1969",
				"callNumber": "796",
				"edition": "Ediţia a II-a revăzută",
				"language": "rum",
				"libraryCatalog": "Library Catalog (TinREAD)",
				"place": "Bucureşti",
				"publisher": "Editura Consiliului Naţional pentru Educaţie Fizică şi Sport",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://opac.biblioteca.ase.ro/opac/search?q=wirtschaftstheorie&max=0&view=&sb=relevance&ob=asc&level=all&material_type=all&do_file_type=all&location=0",
		"detectedItemType": "multiple",
		"items": "multiple"
	}
]
/** END TEST CASES **/
