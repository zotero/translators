{
	"translatorID": "cd587058-6125-4b33-a876-8c6aae48b5e8",
	"label": "WHO",
	"creator": "Mario Trojan",
	"target": "^http://apps\\.who\\.int/iris/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-03-20 12:45:21"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Mario Trojan

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


// attr()/text() v2
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}
function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}

// same as attr() and text(), but returns the whole node instead
function node(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem:null;}

function detectWeb(doc, url) {
	var headlines = ["Página de inicio de la colección", "Главная страница коллекции", "Page d'accueil de la collection", "Collection home page", "文献类型主页", " الصفحة الرئيسية للمحتوى"];
	if (url.includes('/simple-search') || (headlines.indexOf(text(doc, "h2 > small")) != -1)) {
		if (getSearchResults(doc, true) !== false) {
			return "multiple";
		}
	}

	if (url.includes("/handle/")) {
		return "report";
	}
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;

	var rows = doc.querySelectorAll('a.list-group-item');
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		var title = rows[i].textContent;
		if (!href || !title) continue;
		if (checkOnly) return;
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
	var type = detectWeb(doc, url);
	var item = new Zotero.Item(type);

	// fields
	var rows = doc.querySelectorAll("table.itemDisplayTable > tbody > tr");
	for (let i=0;i<rows.length;i++) {
		let key = text(rows[i], "td.metadataFieldLabel").trim();
		let value = text(rows[i], "td.metadataFieldValue");

		switch (key) {
			case 'Título :':
			case 'Название:':
			case 'Titre:':
			case 'Title:':
			case '标题:':
			case 'العنوان:':
				item.title = value;
				break;
			case 'Idioma:':
			case 'Язык:':
			case 'Langue:':
			case 'Language:':
			case '语言:':
			case 'اللغة:':
				let languages = getBrValues(node(rows[i], "td.metadataFieldValue"));
				languages.forEach(function (value) {
					if (item.language === undefined) {
						item.language = value;
					} else {
						item.language += ', ' + value;
					}
				});
				break;
			case 'Autores :':
			case 'Авторы:':
			case 'Auteurs :':
			case 'Authors:':
			case '作者:':
			case 'المؤلفون:':
				var authors = rows[i].querySelectorAll("a");
				for (let author of authors) {
					item.creators.push({lastName: author.textContent,
										type: "author",
										fieldMode: 1
										}
					);
				}
				break;
			case 'Editorial :':
			case 'Издатель':
			case 'Editeur:':
			case '出版人:':
			case 'Publisher:':
			case 'الناشر:':
				if (value.match(/:/g).length == 1) {
					let parts = value.split(":");
					item.place = parts[0];
					item.institution = parts[1];
				} else {
					item.institution = value;
				}
				break;
			case 'URI :':
			case 'URI (Унифицированный идентификатор ресурса):':
			case 'URI:':
			case '网址:':
				item.url = value;
				break;
			case 'Resumen:':
			case 'Реферат:':
			case 'Résumé:':
			case 'Abstract:':
			case '提要:':
			case 'ملخص:':
				item.abstractNote = value;
				break;
		}
	}

	// attachments
	var attachments = doc.querySelectorAll("div.panel-info > table.panel-body > tbody > tr > td > a");
	var saved_attachments = [];
	for (let attachment of attachments) {
		var href = attachment.getAttribute("href");
		var name = attachment.textContent;
		if (name.endsWith(".pdf") && saved_attachments.indexOf(href) == -1) {
			item.attachments.push({url: href,
								   title: name,
								   "mimeType": "application/pdf"
			});
			saved_attachments.push(href);
		}
	}

	item.complete();
}

// get child text nodes of element separated by <br> and convert into string list
function getBrValues(element) {
	var child = element.firstChild;
	var values = [];
	while (child !== null) {
		if (child.nodeType == 3) { // Text
			values.push(child.textContent);
		}
		child = child.nextSibling;
	}
	return values;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://apps.who.int/iris/simple-search?query=acupuncture",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://apps.who.int/iris/handle/10665/70863?locale=ar",
		"items": [
			{
				"itemType": "report",
				"title": "Consensus document on the epidemiology of severe acute respiratory syndrome (SARS)",
				"creators": [
					{
						"lastName": "World Health Organization",
						"type": "author",
						"fieldMode": 1
					}
				],
				"institution": "World Health Organization",
				"language": "English",
				"libraryCatalog": "WHO",
				"place": "Geneva",
				"url": "http://www.who.int/iris/handle/10665/70863",
				"attachments": [
					{
						"title": "WHO_CDS_CSR_GAR_2003.11_eng.pdf",
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
		"url": "http://apps.who.int/iris/handle/10665/70863?locale=en",
		"items": [
			{
				"itemType": "report",
				"title": "Consensus document on the epidemiology of severe acute respiratory syndrome (SARS)",
				"creators": [
					{
						"lastName": "World Health Organization",
						"type": "author",
						"fieldMode": 1
					}
				],
				"institution": "World Health Organization",
				"language": "English",
				"libraryCatalog": "WHO",
				"place": "Geneva",
				"url": "http://www.who.int/iris/handle/10665/70863",
				"attachments": [
					{
						"title": "WHO_CDS_CSR_GAR_2003.11_eng.pdf",
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
		"url": "http://apps.who.int/iris/handle/10665/70863?locale=es",
		"items": [
			{
				"itemType": "report",
				"title": "Consensus document on the epidemiology of severe acute respiratory syndrome (SARS)",
				"creators": [
					{
						"lastName": "World Health Organization",
						"type": "author",
						"fieldMode": 1
					}
				],
				"institution": "World Health Organization",
				"language": "inglés",
				"libraryCatalog": "WHO",
				"place": "Geneva",
				"url": "http://www.who.int/iris/handle/10665/70863",
				"attachments": [
					{
						"title": "WHO_CDS_CSR_GAR_2003.11_eng.pdf",
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
		"url": "http://apps.who.int/iris/handle/10665/70863?locale=fr",
		"items": [
			{
				"itemType": "report",
				"title": "Consensus document on the epidemiology of severe acute respiratory syndrome (SARS)",
				"creators": [],
				"institution": "World Health Organization",
				"language": "anglais",
				"libraryCatalog": "WHO",
				"place": "Geneva",
				"url": "http://www.who.int/iris/handle/10665/70863",
				"attachments": [
					{
						"title": "WHO_CDS_CSR_GAR_2003.11_eng.pdf",
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
		"url": "http://apps.who.int/iris/handle/10665/70863?locale=ru",
		"items": [
			{
				"itemType": "report",
				"title": "Consensus document on the epidemiology of severe acute respiratory syndrome (SARS)",
				"creators": [
					{
						"lastName": "World Health Organization",
						"type": "author",
						"fieldMode": 1
					}
				],
				"language": "английский",
				"libraryCatalog": "WHO",
				"url": "http://www.who.int/iris/handle/10665/70863",
				"attachments": [
					{
						"title": "WHO_CDS_CSR_GAR_2003.11_eng.pdf",
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
		"url": "http://apps.who.int/iris/handle/10665/70863?locale=zh",
		"items": [
			{
				"itemType": "report",
				"title": "Consensus document on the epidemiology of severe acute respiratory syndrome (SARS)",
				"creators": [
					{
						"lastName": "World Health Organization",
						"type": "author",
						"fieldMode": 1
					}
				],
				"institution": "World Health Organization",
				"language": "英文",
				"libraryCatalog": "WHO",
				"place": "Geneva",
				"url": "http://www.who.int/iris/handle/10665/70863",
				"attachments": [
					{
						"title": "WHO_CDS_CSR_GAR_2003.11_eng.pdf",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
