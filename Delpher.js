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
	"lastUpdated": "2016-09-12 19:12:39"
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
	if (url.indexOf('view')>-1) {
		if (url.indexOf('boeken')>-1) {
			return "book";
		}
		if (url.indexOf('tijdschriften')>-1) {
			return "journalArticle";
		}
		if (url.indexOf('kranten')>-1) {
			return "newspaperArticle";
		}
		if (url.indexOf('radiobulletins')>-1) {
			return "radioBroadcast";
		}
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//main[contains(@class, "searchresults")]/article//a[p[contains(@class, "title")] and starts-with(@href, "/")]');
	for (var i=0; i<rows.length; i++) {
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
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var item = new Zotero.Item(detectWeb(doc, url));
	var details = ZU.xpath(doc, '//div[contains(@class, "bkt-mvc-detailsAction")]/dt');
	for (var i=0; i<details.length; i++) {
		
		if (!details[i].textContent) continue;
		var value = ZU.xpathText(details[i], './following-sibling::dd[1]/ul/li', null, '; ');
		if (!value) continue;
		//Z.debug(details[i].textContent + " : " + value.trim());
		
		switch (details[i].textContent) {
			case "Titel":
			case "Kop":
				item.title = value;
				break;
			case "Auteur":
				item = addCreators(value, "author", item);
				break;
			case "Datum":
			case "Publicatiedatum":
				var m = value.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
				if (m) {
					item.date = m[3] + "-" + m[2] + "-" + m[1];
				} else {
					item.date = value;
				}
				break;
			case "Jaar van uitgave":
				//only if the date is not already set
				if (!item.date) {
					item.date = value;
				}
				break;
			case "Titel tijdschrift":
			case "Krantentitel":
				item.publicationTitle = value;
				break
			case "Jaargang":
				item.volume = value;
				break;
			case "Nummer":
			case "Aflevering":
				item.issue = value;
				break;
			case "Drukker/Uitgever":
			case "Uitgever":
				item.publisher = ZU.trimInternal(value);
				break;
			case "Plaats van uitgave":
				item.place = value;
				break;
			case "Taal":
				item.language = ZU.trimInternal(value);
				break;
			case "Editie":
				item.edition = value;
				break;
			case "Onderwerp":
				var tags = value.split(";");
				for (var j=0; j<tags.length; j++) {
					item.tags.push(tags[j].trim());
				}
				break
			case "Coauteur":
				item = addCreators(value, "contributor", item);
				break;
			case "Aantal pagina's":
			case "Omvang":
				item.numPages = value;
				break;
			case "Berichtnummer":
				item.reportNumber = value;
				break;
			case "Herkomst":
				item.libraryCatalog = value;
				break;
			case "Signatuur":
				item.callNumber = value;
				break;
			case "Bron metadata":
				break;
		}
	}
	
	item.url = ZU.xpathText(doc, '(//input[contains(@class, "persistent-id")])[1]/@value');
	item.attachments.push({
		title: "Snapshot",
		document: doc
	});
	
	item.complete();
}


function addCreators(value, type, item) {
	var creators = value.split(';');
	for (var j=0; j<creators.length; j++) {
		var usecomma = (creators[j].indexOf(",")>-1);
		item.creators.push(ZU.cleanAuthor(creators[j], type, usecomma));
	}
	return item;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://boeken.delpher.nl/nl/results/index?query=buurman&coll=boeken&maxperpage=10&identifier=ddd%3A010565868%3Ampeg21%3Aa0181&",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.delpher.nl/nl/boeken/view/index?query=buurman&coll=boeken&identifier=dpo%3A2390%3Ampeg21%3A0012&page=1&maxperpage=10",
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
						"creatorType": "contributor"
					}
				],
				"date": "1796",
				"callNumber": "1089 C 52:1",
				"language": "Nederlands ; Vlaams ; néerlandais",
				"libraryCatalog": "Leiden, Universiteitsbibliotheek",
				"numPages": "72",
				"publisher": "Helders, Jan Amsterdam, 1779-1798 ; Mars, Abraham Amsterdam, 1783-1802",
				"url": "http://resolver.kb.nl/resolve?urn=dpo:2390:mpeg21",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"Drama",
					"French language and literature"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://tijdschriften.delpher.nl/nl/results/index?query=buurman&coll=dts&page=1&maxperpage=10",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://kranten.delpher.nl/nl/results/index?coll=ddd&query=buurman",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.delpher.nl/nl/kranten/view/index?query=buurman&coll=ddd&identifier=ddd%3A110578678%3Ampeg21%3Aa0106&page=1&maxperpage=10",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Spaansche buurman.",
				"creators": [],
				"date": "1941-02-01",
				"edition": "Avond",
				"libraryCatalog": "KB C 98",
				"place": "Amsterdam",
				"publicationTitle": "De Telegraaf",
				"url": "http://resolver.kb.nl/resolve?urn=ddd:110578678",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "http://radiobulletins.delpher.nl/nl/results/index?query=buurman&coll=anp&maxperpage=10&identifier=dts%3A2978028%3Ampeg21%3A0001&",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.delpher.nl/nl/radiobulletins/view/index?query=buurman&coll=anp&identifier=anp%3A1950%3A02%3A20%3A19%3Ampeg21&page=1&maxperpage=10",
		"items": [
			{
				"itemType": "radioBroadcast",
				"title": "ANP Nieuwsbericht - 20-02-1950 - 19",
				"creators": [],
				"date": "1950-02-20",
				"language": "Nederlands",
				"libraryCatalog": "Delpher",
				"url": "http://resolver.kb.nl/resolve?urn=anp:1950:02:20:19",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "http://www.delpher.nl/nl/tijdschriften/view/index?query=buurman&coll=dts&identifier=dts%3A2738036%3Ampeg21%3A0012&page=1&maxperpage=10#info",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Nieuwsblad voor den boekhandel jrg 91, 1924, no 35, 02-05-1924",
				"creators": [],
				"date": "1924-05-02",
				"callNumber": "Koninklijke Bibliotheek: LHO AW.A 06b NIE",
				"issue": "35",
				"language": "Nederlands",
				"libraryCatalog": "Delpher",
				"publicationTitle": "Nieuwsblad voor den boekhandel",
				"url": "http://resolver.kb.nl/resolve?urn=dts:2738036:mpeg21",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "http://www.delpher.nl/nl/boeken/view?coll=boeken&identifier=MMKB02:100006852",
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
						"creatorType": "contributor"
					}
				],
				"date": "[192-?]",
				"callNumber": "BJ 50012 [1]",
				"language": "Nederlands ; Vlaams ; néerlandais",
				"libraryCatalog": "Koninklijke Bibliotheek",
				"numPages": "95 p., [6] bl. pl",
				"publisher": "Alkmaar : Gebr. Kluitman",
				"url": "http://resolver.kb.nl/resolve?urn=MMKB02:100006852",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"1505 bed",
					"Achttiende eeuw",
					"Historische verhalen",
					"Napoleontische oorlogen",
					"Negentiende eeuw",
					"Oorlogsverhalen"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/