{
	"translatorID": "f24cd419-5892-450a-b39e-be2ff3191757",
	"label": "ubtue_Collectanea Christiana Orientalia",
	"creator": "Timotheus Kim",
	"target": "^https?://www\\.uco\\.es/revistas/index\\.php/cco/(issue|article)/view/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 80,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-07-03 12:55:52"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen All rights reserved.

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
	if (url.match(/article/))
		return "journalArticle";
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "tocTitle", " " ))]//a')
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function postProcess(doc, item) {
	if (item.issue === "0") item.issue = "";
	if (item.number === "0") item.number = "";
	item.complete();
}

function invokeEMTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		postProcess(doc, i);
	});
	translator.translate();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEMTranslator);
		});
	} else
		invokeEMTranslator(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.uni-muenster.de/Ejournals/index.php/thrv/issue/view/201",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.uni-muenster.de/Ejournals/index.php/thrv/article/view/2731",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Mit der Islamischen Theologie im Gespräch. Zu einigen Neuerscheinungen aus dem Bereich der christlich-muslimischen Beziehungen",
				"creators": [
					{
						"firstName": "Anja",
						"lastName": "Middelbeck-Varwick",
						"creatorType": "author"
					}
				],
				"date": "2020/04/20",
				"DOI": "10.17879/thrv-2020-2731",
				"ISSN": "2699-5433",
				"journalAbbreviation": "1",
				"language": "de",
				"libraryCatalog": "www.uni-muenster.de",
				"publicationTitle": "Theologische Revue",
				"rights": "Copyright (c) 2020",
				"url": "https://www.uni-muenster.de/Ejournals/index.php/thrv/article/view/2731",
				"volume": "116",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
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
		"url": "https://www.uni-muenster.de/Ejournals/index.php/thrv/article/view/2689",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Hammann, Konrad: Rudolf Bultmann und seine Zeit. Biographische und theologische Konstellationen",
				"creators": [
					{
						"firstName": "Matthias",
						"lastName": "Dreher",
						"creatorType": "author"
					}
				],
				"date": "2020/04/20",
				"DOI": "10.17879/thrv-2020-2689",
				"ISSN": "2699-5433",
				"journalAbbreviation": "1",
				"language": "de",
				"libraryCatalog": "www.uni-muenster.de",
				"publicationTitle": "Theologische Revue",
				"rights": "Copyright (c) 2020",
				"shortTitle": "Hammann, Konrad",
				"url": "https://www.uni-muenster.de/Ejournals/index.php/thrv/article/view/2689",
				"volume": "116",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Book Review"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.uni-muenster.de/Ejournals/index.php/thrv/article/view/2690",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Levering, Matthew: The Achievement of Hans Urs von Balthasar. An Introduction to His Trilogy",
				"creators": [
					{
						"firstName": "Wolfgang",
						"lastName": "Müller",
						"creatorType": "author"
					}
				],
				"date": "2020/04/20",
				"DOI": "10.17879/thrv-2020-2690",
				"ISSN": "2699-5433",
				"journalAbbreviation": "1",
				"language": "de",
				"libraryCatalog": "www.uni-muenster.de",
				"publicationTitle": "Theologische Revue",
				"rights": "Copyright (c) 2020",
				"shortTitle": "Levering, Matthew",
				"url": "https://www.uni-muenster.de/Ejournals/index.php/thrv/article/view/2690",
				"volume": "116",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Book Review"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
