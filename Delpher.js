{
	"translatorID": "c4008cc5-9243-4d13-8b35-562cdd184558",
	"label": "Delpher",
	"creator": "Philipp Zumstein",
	"target": "^https?://[^\\/]+\\.delpher\\.nl",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-01-20 14:35:30"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2016 Philipp Zumstein

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
	if (url.includes('/view')) {
		if (url.includes('/boeken/')) {
			return "book";
		}
		if (url.includes('/tijdschriften/')) {
			return "journalArticle";
		}
		if (url.includes('/kranten/')) {
			return "newspaperArticle";
		}
		if (url.includes('/radiobulletins/')) {
			return "radioBroadcast";
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
	var rows = ZU.xpath(doc, '//article//a[contains(@class, "search-result__link") and starts-with(@href, "/")]');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
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
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var item = new Zotero.Item(detectWeb(doc, url));
	var details = ZU.xpath(doc, '(//dl[contains(@class, "metadata__details-description-list")])[1]');

	var title = ZU.xpathText(details, './/ancestor::dt[contains(@class,"metadata__details-text") and (normalize-space(text())="Titel" or normalize-space(text())="Kop")]/following-sibling::dd[1]');
	
	if (!title) {
		title = ZU.xpathText(details, './/ancestor::dt[contains(@class,"metadata__details-text") and (normalize-space(text())="Krantentitel")]/following-sibling::dd[1]');
	}
	item.title = title;
	item.numPages = ZU.xpathText(details, './/ancestor::dt[contains(@class,"metadata__details-text") and normalize-space(text())="Omvang"]/following-sibling::dd[1]');

	var date = ZU.xpathText(details, './/ancestor::dt[contains(@class,"metadata__details-text") and (normalize-space(text())="Publicatiedatum" or normalize-space(text())="Datum")]/following-sibling::dd[1]');
	if (!date) {
		date = ZU.xpathText(details, './/ancestor::dt[contains(@class,"metadata__details-text") and (normalize-space(text())="Jaar van uitgave")]/following-sibling::dd[1]');
	}

	if (date && date.length > 4) {
		item.date = date.replace(/(\d{2})-(\d{2})-(\d{4})/, "$3-$2-$1");
	}
	else item.date = date;


	item.publicationTitle = 	item.issue = ZU.xpathText(details, './/ancestor::dt[contains(@class,"metadata__details-text") and (normalize-space(text())="Krantentitel")]/following-sibling::dd[1]/a');
	item.libraryCatalog = ZU.xpathText(details, './/ancestor::dt[contains(@class,"metadata__details-text") and normalize-space(text())="Herkomst"]/following-sibling::dd[1]/a');
	if (!item.libraryCatalog) item.libraryCatalog = "Delpher";
	item.publisher = ZU.xpathText(details, './/ancestor::dt[contains(@class,"metadata__details-text") and (normalize-space(text())="Drukker/Uitgever" or normalize-space(text())="Uitgever")]/following-sibling::dd[1]/a');
	item.callNumber = ZU.xpathText(details, './/ancestor::dt[contains(@class,"metadata__details-text") and (normalize-space(text())="PPN")]/following-sibling::dd[1]/a');
	var language = ZU.xpathText(details, './/ancestor::dt[contains(@class,"metadata__details-text") and (normalize-space(text())="Taal")]/following-sibling::dd[1]/a');
	if (language) item.language = ZU.trimInternal(language);
	// item.volume = ZU.xpathText(details, './/dd[@data-testing-id="search-result__volume"]');
	item.issue = ZU.xpathText(details, './/ancestor::dt[contains(@class,"metadata__details-text") and (normalize-space(text())="Aflevering")]/following-sibling::dd[1]/a');
	item.edition = ZU.xpathText(details, './/ancestor::dt[contains(@class,"metadata__details-text") and (normalize-space(text())="Editie")]/following-sibling::dd[1]/a');
	item.place = ZU.xpathText(details, './/ancestor::dt[contains(@class,"metadata__details-text") and (normalize-space(text())="Plaats van uitgave")]/following-sibling::dd[1]/a');


	var tags = ZU.xpath(details, './/ancestor::dt[contains(@class,"metadata__details-text") and (normalize-space(text())="Onderwerp")]/following-sibling::dd/a');

	for (var i = 0; i < tags.length; i++) {
		item.tags.push(tags[i].textContent);
	}

	var authors = ZU.xpath(details, './/ancestor::dt[contains(@class,"metadata__details-text") and (normalize-space(text())="Auteur" or normalize-space(text())="Coauteur") ]/following-sibling::dd[1]');
	for (var j = 0; j < authors.length; j++) {
		item.creators.push(ZU.cleanAuthor(authors[j].textContent, "author", true));
	}

	item.url = ZU.xpathText(doc, '(//input[contains(@class,"object-view-menu__share-links-details-input")])[last()]/@value');
	item.attachments.push({
		title: "Snapshot",
		document: doc
	});
	
	var pdflink = ZU.xpathText(doc, './/a[contains(@class,"object-view-menu__downloads-link") and (normalize-space(text())="pdf")]/@href');
	if (pdflink) {
		item.attachments.push({
			title: "Full Text PDF",
			mimeType: "application/pdf",
			url: pdflink
		});
	}
	
  
	var jpglink = ZU.xpathText(doc, './/a[contains(@class,"object-view-menu__downloads-link") and (normalize-space(text())="jpg")]/@href');
	if (jpglink) {
		item.attachments.push({
			title: "Image",
			mimeType: "image/jpeg",
			url: jpglink
		});
	}

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.delpher.nl/nl/boeken/results?query=buurman&coll=boeken",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.delpher.nl/nl/boeken/view?identifier=dpo:2390:mpeg21:0003&query=Philippe+en+Georgette&page=1&coll=boeken&rowid=1",
		"items": [
			{
				"itemType": "book",
				"title": "Philippe en Georgette, zangspel.",
				"creators": [
					{
						"firstName": "Jacques Marie",
						"lastName": "Boutet de Monvel",
						"creatorType": "author"
					},
					{
						"firstName": "N. C. (wed C. van Streek)",
						"lastName": "Brinkman",
						"creatorType": "author"
					}
				],
				"date": "1796",
				"language": "Nederlands",
				"libraryCatalog": "Leiden, Universiteitsbibliotheek",
				"numPages": "72",
				"publisher": "Helders, Jan Amsterdam, 1779-1798",
				"url": "https://resolver.kb.nl/resolve?urn=dpo:2390:mpeg21:0003",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Image",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					{
						"tag": "Drama"
					},
					{
						"tag": "French language and literature"
					},
					{
						"tag": "Leiden, Universiteitsbibliotheek"
					},
					{
						"tag": "STCN"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.delpher.nl/nl/tijdschriften/results?query=buurman&page=1&coll=dts",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.delpher.nl/nl/kranten/results?query=buurman&coll=ddd",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.delpher.nl/nl/kranten/view?query=Spaansche+Buurman&coll=ddd&identifier=ddd:110578678:mpeg21:a0106&resultsidentifier=ddd:110578678:mpeg21:a0106&rowid=1",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Spaansche buurman.",
				"creators": [],
				"date": "1941-02-01",
				"callNumber": "832675288",
				"edition": "Avond",
				"libraryCatalog": "Delpher",
				"place": "Amsterdam",
				"publicationTitle": "De Telegraaf",
				"url": "https://resolver.kb.nl/resolve?urn=ddd:110578678:mpeg21:a0106",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Image",
						"mimeType": "image/jpeg"
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
		"url": "https://www.delpher.nl/nl/radiobulletins/results?query=buurman&coll=anp",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.delpher.nl/nl/radiobulletins/view?coll=anp&page=2&facets%5Bperiode%5D%5B%5D=3%7C1950-1959%7C1950%7Cfebruari%7C20%7C&identifier=anp:1950:02:20:19:mpeg21&resultsidentifier=anp:1950:02:20:19:mpeg21&rowid=2",
		"items": [
			{
				"itemType": "radioBroadcast",
				"title": "ANP Nieuwsbericht - 20-02-1950 - 19",
				"creators": [],
				"date": "1950-02-20",
				"libraryCatalog": "Delpher",
				"url": "https://resolver.kb.nl/resolve?urn=anp:1950:02:20:19",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Image",
						"mimeType": "image/jpeg"
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
		"url": "https://www.delpher.nl/nl/tijdschriften/view/index?query=buurman&coll=dts&identifier=dts%3A2738036%3Ampeg21%3A0012&page=1&maxperpage=10#info",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Nieuwsblad voor den boekhandel jrg 91, 1924, no 35, 02-05-1924",
				"creators": [],
				"date": "1924-05-02",
				"callNumber": "830637982",
				"libraryCatalog": "Koninklijke Bibliotheek",
				"url": "https://resolver.kb.nl/resolve?urn=dts:2738036:mpeg21:0012",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Image",
						"mimeType": "image/jpeg"
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
		"url": "https://www.delpher.nl/nl/boeken/view?coll=boeken&identifier=MMKB02:100006852",
		"items": [
			{
				"itemType": "book",
				"title": "Neêrland weer vrij!",
				"creators": [
					{
						"firstName": "J.",
						"lastName": "Stamperius",
						"creatorType": "author"
					},
					{
						"firstName": "W. K. de",
						"lastName": "Bruin",
						"creatorType": "author"
					}
				],
				"date": "[192-?]",
				"language": "Nederlands",
				"libraryCatalog": "Koninklijke Bibliotheek",
				"numPages": "95 p., [6] bl. pl",
				"publisher": "Gebr. Kluitman",
				"url": "https://resolver.kb.nl/resolve?urn=MMKB02:100006852:00009",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Image",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					{
						"tag": "1505 bed"
					},
					{
						"tag": "1505 bed Opvoeding en onderwijs; [Kinderlectuur] → Kinderlectuur → Kinderboeken → Nederlands"
					},
					{
						"tag": "Achttiende eeuw"
					},
					{
						"tag": "Historische verhalen"
					},
					{
						"tag": "Kinderboek"
					},
					{
						"tag": "Koninklijke Bibliotheek"
					},
					{
						"tag": "Napoleontische oorlogen"
					},
					{
						"tag": "Negentiende eeuw"
					},
					{
						"tag": "OPC"
					},
					{
						"tag": "Oorlogsverhalen"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
