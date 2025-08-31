{
	"translatorID": "61ffe600-55e0-11df-bed9-0002a5d5c51b",
	"label": "NZZ.ch",
	"creator": "Philipp Zumstein",
	"target": "^https?://(www\\.)?nzz\\.ch/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-04-05 17:23:30"
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
	if (doc.querySelector('#page .article')) {
		return "newspaperArticle";
	}
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//article/a|//div[contains(@class, "teaser")]/a');
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
			var articles = new Array();
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
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		
		item.title = item.title.split(' | ')[0];

		// Problem: also the place will be taken as part of the autor name
		// e.g. <meta name="author" content="Matthias Müller, Peking">
		// e.g. <meta name="author" content="Marco Metzler und Birgit Voigt" />
		var authorString = ZU.xpathText(doc, '//meta[@name="author"]/@content');
		if (authorString) {
			item.creators = [];
			var authors = authorString.split("und");
			for (var i=0; i<authors.length; i++) {
				if (i == authors.length-1) {
					authors[i] = authors[i].split(",")[0];
				}
				item.creators.push( ZU.cleanAuthor(authors[i] , "author") );
			}
		}
		
		item.ISSN = "0376-6829";
		item.language = "de-CH";
		item.libraryCatalog = "NZZ";
		
		item.section = text(doc, '.breadcrumbs > a:last-child');
		if (item.section == "NZZ am Sonntag" || item.section == "NZZaS") {
			item.publicationTitle = "NZZ am Sonntag";
			item.ISSN = "1660-0851";
			item.section = "";
		}
		
		item.complete();
	});
	
	translator.getTranslatorObject(function(trans) {
		trans.itemType = "newspaperArticle";
		trans.addCustomFields({
			'date': 'date'
		});
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.nzz.ch/kuoni_gta-uebernahme-ld.692744?reduced=true",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Kuoni profitiert von der GTA-Übernahme",
				"creators": [],
				"date": "2011-11-10T06:55:41.000Z",
				"ISSN": "0376-6829",
				"abstractNote": "Der Reisekonzern Kuoni hat in den ersten neun Monaten von der Übernahme des Reisekonzerns Gullivers Travel Associates (GTA) profitiert. Der Umsatz stieg, und der Konzern machte Gewinn.",
				"language": "de-CH",
				"libraryCatalog": "NZZ",
				"publicationTitle": "Neue Zürcher Zeitung",
				"url": "https://www.nzz.ch/kuoni_gta-uebernahme-ld.692744",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.nzz.ch/wie-ein-mexikanisches-staedtchen-die-boesewichte-vertrieb-ld.656525?reduced=true",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Wie ein mexikanisches Städtchen die Bösewichte vertrieb",
				"creators": [
					{
						"firstName": "Matthias",
						"lastName": "Knecht",
						"creatorType": "author"
					}
				],
				"date": "2012-05-30T09:00:00.000Z",
				"ISSN": "0376-6829",
				"abstractNote": "Mit einem Aufstand haben die Einwohner der mexikanischen Gemeinde Cherán die Holzfällermafia vertrieben. Sie haben eine Landsgemeinde gegründet und entdeckt, dass direktdemokratische Institutionen Korruption verhindern.",
				"language": "de-CH",
				"libraryCatalog": "NZZ",
				"publicationTitle": "Neue Zürcher Zeitung",
				"url": "https://www.nzz.ch/wie-ein-mexikanisches-staedtchen-die-boesewichte-vertrieb-ld.656525",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.nzz.ch/nzzas/nzz-am-sonntag/bildung-der-weg-ans-gymnasium-wird-steiniger-ld.85602?reduced=true",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Der Weg ans Gymnasium wird steiniger",
				"creators": [
					{
						"firstName": "René",
						"lastName": "Donzé",
						"creatorType": "author"
					}
				],
				"date": "2016-05-31T07:45:25.872Z",
				"ISSN": "1660-0851",
				"abstractNote": "Im Kanton Zürich werden pro Jahr bis zu 400 Schüler weniger den Sprung ans Langgymnasium schaffen Aus Spargründen sollen künftig weniger Schüler die Gymiprüfung bestehen. Darum müssen die Kriterien verschärft werden.",
				"language": "de-CH",
				"libraryCatalog": "NZZ",
				"publicationTitle": "NZZ am Sonntag",
				"url": "https://www.nzz.ch/nzzas/nzz-am-sonntag/bildung-der-weg-ans-gymnasium-wird-steiniger-ld.85602",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://magazin.nzz.ch/wirtschaft/gerd-gigerenzer-manipulation-mit-risiken-zu-viel-desinformation-ld.145017?reduced=true",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Gerd Gigerenzer: «Wir haben zu viel Desinformation»",
				"creators": [
					{
						"firstName": "Marco",
						"lastName": "Metzler",
						"creatorType": "author"
					},
					{
						"firstName": "Birgit",
						"lastName": "Voigt",
						"creatorType": "author"
					}
				],
				"date": "2016-05-29T08:55:00.000Z",
				"ISSN": "0376-6829",
				"abstractNote": "Im Gesundheitswesen wird heftig über den Sinn von teuren Tests zur Krebs-Früherkennung gestritten. Psychologie-Professor Gerd Gigerenzer stellt deren Nutzen infrage.",
				"language": "de-CH",
				"libraryCatalog": "NZZ",
				"publicationTitle": "NZZ Magazin",
				"shortTitle": "Gerd Gigerenzer",
				"url": "https://magazin.nzz.ch/wirtschaft/gerd-gigerenzer-manipulation-mit-risiken-zu-viel-desinformation-ld.145017",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.nzz.ch/suche?q=Schweiz&filter=",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
