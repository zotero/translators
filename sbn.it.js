{
	"translatorID": "4c272290-7ac4-433e-862d-244884ed285a",
	"label": "sbn.it",
	"creator": "Philipp Zumstein, Dorian Soru",
	"target": "^https?://(www|opac)\\.sbn\\.it/(web/)?(opacsbn/)?risultati-ricerca-avanzata",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-07-14 16:57:36"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2015 Philipp Zumstein

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

// A regex to get the id of the single resource
var regexId = /(detail|index)[/](([0-9]*[/])?([^?]*))/;
// The first part of the url for a single resource
var detailUrl = "/risultati-ricerca-avanzata/-/opac-adv/detail/";

var typeMapping = {
	testo: "book",
	// "musica a stampa" ,
	"documento da proiettare o video": "videoRecording",
	"registrazione sonora": "audioRecording",
	// "musica manoscritta",
	"documento grafico": "artwork",
	// "risorsa elettronica",
	"documento cartografico a stampa": "map",
	"registrazione sonora non musicale": "audioRecording",
	// "documento multimediale",
	// "testo manoscritto",
	// "oggetto tridimensionale",
	// "documento cartografico manoscritto"
};

// Used when "Visualizza tutti" or "Visualizza selezionati" button is pressed:
// A single item per page but pages change dynamically with scrolling
function getResults(doc, checkOnly, detailed = false) {
	if (detailed) {
		// Detailed results
		var results = doc.querySelectorAll('[data-to-post-item]');
		if (checkOnly) {
			return results.length > 0;
		}
		var items = {};
		for (var i = 0; i < results.length; i++) {
			var href = detailUrl + JSON.parse(results[i].getAttribute('data-to-post-item')).id;
			var title = JSON.parse(results[i].getAttribute('data-to-post-item')	).title;
			items[href] = title;
		}
	} else {
		var parser = new DOMParser();
		var innerdoc = parser.parseFromString(doc.documentElement.outerHTML, "text/html");
		var results = ZU.xpath(innerdoc, "//input[@data-to-post-item]/@data-to-post-item");
		
		if (checkOnly) {
			return results.length > 0;
		}
		var items = {};
		for (var i = 0; i < results.length; i++) {
			var href = detailUrl + JSON.parse(results[i].value).id;
			var title = JSON.parse(results[i].value).title.info;
			items[href] = title;
		}
	}
	return items;
}

function detectWeb(doc, url) {
	if (url.includes("detail") || url.includes("index")) {
		// Doesn't wait for getType, so it returns a generic single type
		return typeMapping.testo;
	} else {
		return "multiple";
	}
}

function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	var results;
	if (type == "multiple") {
		//Detailed view
		if (url.includes("opac-adv/all")) {
			var result = getResults(doc, true, true);
			if (result) {
				results = getResults(doc, false, true);
				Zotero.selectItems(results, function (items) {
					if (items) {
						ZU.processDocuments(Object.keys(items), scrape);
					}
				});
			}
		} else {
			//Multiple view
			result = getResults(doc, true, false);
			if (result) {
				results = getResults(doc, false, false);
				Zotero.selectItems(results, function (items) {
					if (!items) {
						return;
					}
					var ids = [];
					for (var i in items) {
						ids.push(i);
					}
					ZU.processDocuments(ids, scrape);
				});
			}
		}
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, _url) {
	var id = _url.match(regexId)[4];
	var urlMarc = '/c/opac/marc21/export?id=' + id;
	ZU.doGet(urlMarc, function (text) {
		// call MARC translator
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("a6ee60df-1ddc-4aae-bb25-45e0537be973");
		translator.setString(text);
		translator.translate();
	});
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://opac.sbn.it/risultati-ricerca-avanzata/-/opac-adv/detail/ITICCUMOD1595512",
		"items": [
			{
				"itemType": "book",
				"title": "Zotero: a guide for librarians, researchers and educators",
				"creators": [
					{
						"firstName": "Jason",
						"lastName": "Puckett",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"ISBN": "9780838985892",
				"language": "eng",
				"libraryCatalog": "sbn.it",
				"numPages": "159",
				"place": "Chicago (Ill.)",
				"publisher": "Association of college and research libraries",
				"shortTitle": "Zotero",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://opac.sbn.it/risultati-ricerca-avanzata/-/opac-adv/index/1/ITICCUCFI1061212?fieldstruct%5B1%5D=ricerca.parole_tutte%3A4%3D6&fieldvalue%5B1%5D=galileo&fieldaccess%5B1%5D=Any%3A1016%3Anocheck&struct%3A1001=ricerca.parole_almeno_una%3A%40or%40",
		"items": [
			{
				"itemType": "book",
				"title": "Galileo: 30 anni",
				"creators": [
					{
						"lastName": "Galileo (periodico)",
						"creatorType": "author",
						"fieldMode": true
					}
				],
				"date": "2019",
				"ISBN": "9788833591896",
				"language": "ita",
				"libraryCatalog": "sbn.it",
				"numPages": "224",
				"place": "Padova",
				"publisher": "Libreriauniversitaria.it",
				"shortTitle": "Galileo",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://opac.sbn.it/risultati-ricerca-avanzata/-/opac-adv/all?fieldstruct%5B1%5D=ricerca.parole_tutte%3A4%3D6&fieldvalue%5B1%5D=sant%27agostino&fieldaccess%5B1%5D=Any%3A1016%3Anocheck&struct%3A1001=ricerca.parole_almeno_una%3A%40or%40",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://opac.sbn.it/risultati-ricerca-avanzata?fieldstruct%5B1%5D=ricerca.parole_tutte%3A4%3D6&struct%3A1001=ricerca.parole_almeno_una%3A%40or%40&fieldvalue%5B1%5D=sant%27agostino&fieldaccess%5B1%5D=Any%3A1016%3Anocheck",
		"items": "multiple"
	}
]
/** END TEST CASES **/
