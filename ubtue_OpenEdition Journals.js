{
	"translatorID": "55275811-58f4-4f5e-b711-a043f1fc50da",
	"label": "ubtue_OpenEdition Journals",
	"creator": "Madeesh Kannan",
	"target": "https?://journals.openedition.org",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-06-23 12:51:51"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Universitätsbibliothek Tübingen All rights reserved.

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


function detectWeb(doc) {
	if (getSearchResults(doc)) return "multiple";
	else if (ZU.xpath(doc, '//h1[@id="docTitle"]').length === 1) {
		return "journalArticle";
	}
	return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//li[contains(@class,"textes")]//div[@class="title"]//a');
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function invokeEmbeddedMetadataTranslator(doc) {
	let translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, item) {
		let abstracts = ZU.xpath(doc, '//p[@class="resume"]');
		if (abstracts) {
			abstracts = abstracts.map(x => x.textContent.trim());
			for (let i = 0; i < abstracts.length; ++i) {
				if (i == 0) item.abstractNote = abstracts[i];
				else item.notes.push({ note: "abs:" + abstracts[i] });
			}
		}

		item.tags = ZU.xpath(doc, '//div[@id="entries"]//div[@class="index ltr"]//a | //div[@id="entries"]//div[@class="index"]//a').map(x => x.textContent.trim());
		if (item.issue) {
			let issueAndVol = item.issue.match(/(\d+)\/(\d+)/);
			if (issueAndVol) {
				item.volume = issueAndVol[1];
				item.issue = issueAndVol[2];
			}
		}

		let section = ZU.xpathText(doc, '//div[contains(@class, "souspartie")]//span[@class="title"]');
		if (section && section.match(/(Recensions|Notes de lecture)/)) item.tags.push("Book Review");
		item.itemType = "journalArticle";
		item.complete();
	});
	translator.translate();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return false;
			}
			let articles = [];
			for (let i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEmbeddedMetadataTranslator);
		});
	} else invokeEmbeddedMetadataTranslator(doc, url);
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://journals.openedition.org/rsr/4866",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "« Poésie, Bible et théologie de l’Antiquité tardive au Moyen Âge » (Strasbourg, 25‑27 janv. 2018)",
				"creators": [
					{
						"firstName": "Michele",
						"lastName": "Cutino",
						"creatorType": "author"
					}
				],
				"date": "2018-04-01T00:00:00+02:00",
				"ISSN": "0035-2217",
				"abstractNote": "Du 25 au 27 janvier 2018 s’est déroulé à Strasbourg un colloque international intitulé « Poésie, Bible et théologie de l’Antiquité tardive au Moyen Âge », qui était organisé par la Faculté de théologie catholique avec le soutien de l’Université de Strasbourg et en collaboration avec plusieurs institutions nationales (Institut d’Études Augustiniennes [IEA] ; Laboratoire d’études sur les monothéismes [LEM – UMR 8584] ; Centre Jean Mabillon (EA 3624), École nationale des chartes ; Association « ...",
				"issue": "2",
				"language": "fr",
				"libraryCatalog": "journals.openedition.org",
				"pages": "277-278",
				"publicationTitle": "Revue des sciences religieuses",
				"rights": "© RSR",
				"url": "http://journals.openedition.org/rsr/4866",
				"volume": "92",
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
		"url": "https://journals.openedition.org/rsr/4866",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "« Poésie, Bible et théologie de l’Antiquité tardive au Moyen Âge » (Strasbourg, 25‑27 janv. 2018)",
				"creators": [
					{
						"firstName": "Michele",
						"lastName": "Cutino",
						"creatorType": "author"
					}
				],
				"date": "2018-04-01T00:00:00+02:00",
				"ISSN": "0035-2217",
				"abstractNote": "Du 25 au 27 janvier 2018 s’est déroulé à Strasbourg un colloque international intitulé « Poésie, Bible et théologie de l’Antiquité tardive au Moyen Âge », qui était organisé par la Faculté de théologie catholique avec le soutien de l’Université de Strasbourg et en collaboration avec plusieurs institutions nationales (Institut d’Études Augustiniennes [IEA] ; Laboratoire d’études sur les monothéismes [LEM – UMR 8584] ; Centre Jean Mabillon (EA 3624), École nationale des chartes ; Association « ...",
				"issue": "2",
				"language": "fr",
				"libraryCatalog": "journals.openedition.org",
				"pages": "277-278",
				"publicationTitle": "Revue des sciences religieuses",
				"rights": "© RSR",
				"url": "http://journals.openedition.org/rsr/4866",
				"volume": "92",
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
	}
]
/** END TEST CASES **/
