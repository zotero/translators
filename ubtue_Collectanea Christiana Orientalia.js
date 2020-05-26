{
	"translatorID": "f24cd419-5892-450a-b39e-be2ff3191757",
	"label": "Collectanea Christiana Orientalia",
	"creator": "Timotheus Kim",
	"target": "/issue/view/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-05-26 10:22:40"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Universitätsbibliothek Tübingen.  All rights reserved.

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	if (url.match(/\/issue\/view/))
		return "multiple";
	else if (url.match(/article/)) {
		return "journalArticle";
	}
}

function getSearchResults(doc) {
	let items = {};
	let found = false;
	let rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "tocTitle", " " ))] | //*[contains(concat( " ", @class, " " ), concat( " ", "file", " " ))]')
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
	let section = item.title;
		if (section && section.match(/ISBN|Verlag|Press/g)) {
			item.tags.push("Book Reviews");
			
		}
		if (item.title.match(/ISBN|Verlag|Press/g)) {
			item.itemType = "magazineArticle";	
		}
		if (item.title.match(/Seminario|Conferences|Congress|Congreso/g)) {
			item.tags.push("Kongressbericht");
		}
		item.complete();
}

function invokeEMTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, item) {
		if (item.issue === "0")
			item.issue = "";

		if (item.volume === "0")
			item.volume = "";
		if (item.number === "0")
			item.number = "";

	postProcess(doc, item);	
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
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.uco.es/revistas/index.php/cco/issue/view/67",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.uco.es/revistas/index.php/cco/issue/view/67",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.uco.es/revistas/index.php/cco/article/view/1100",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Talking heads:‎ Necromancy in Jewish and Christian Accounts ‎ from Mesopotamia and beyond",
				"creators": [
					{
						"firstName": "Emmanouela",
						"lastName": "Grypeou",
						"creatorType": "author"
					}
				],
				"date": "2019/07/18",
				"DOI": "10.21071/cco.v16i0.1100",
				"ISSN": "2386-7442",
				"abstractNote": "Relations between Jewish and Christian communities in Late Antiquity involved interactions relating to a complex cultural and religious landscape. An intrinsic aspect of the exchange between Jews and Christians refers to attitudes towards pagan communities in their shared environment as a common discourse pertaining to a symbolic construction of the “Other”. More specifically, a persisting  topos  was the implication of “pagan” communities and their respective religious specialists in illicit magical practices including necromancy.  In the following, a discussion of testimonies regarding variants of necromantic practices in ancient, rabbinic and Christian sources will explore the dissemination and special characteristics of the different necromantic accounts in Late Antiquity and contextualise this peculiar practice of a divinatory “talking head” as evidenced in contemporary Jewish and Christian traditions.",
				"language": "en",
				"libraryCatalog": "www.uco.es",
				"pages": "1-30",
				"publicationTitle": "Collectanea Christiana Orientalia",
				"rights": "Copyright (c) 2019 Collectanea Christiana Orientalia",
				"shortTitle": "Talking heads",
				"url": "https://www.uco.es/revistas/index.php/cco/article/view/1100",
				"volume": "16",
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
						"tag": "Christian Tradition"
					},
					{
						"tag": "Late Antiquity"
					},
					{
						"tag": "Necromancy"
					},
					{
						"tag": "Rabbinic Tradition"
					},
					{
						"tag": "Religion History"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
