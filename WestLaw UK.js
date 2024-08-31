{
	"translatorID": "e6d9cf77-53e4-47f5-98ae-a69eba6d985f",
	"label": "WestLaw UK",
	"creator": "George Gebbett",
	"target": "^https://uk\\.westlaw\\.com/Document/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-02-13 15:15:03"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 George Gebbett

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


function detectWeb(doc) {
	if (text(doc, ".kh_toc-list.ukResearch_toc-list").includes("Case Analysis")) {
		return "case";
	}
	else if (text(doc, ".kh_toc-list.ukResearch_toc-list").includes("Arrangement of Act")) {
		return "statute";
	}
	else if (doc.title.includes("s.")) {
		return "statuteSection";
	}
	else {
		return false;
	}
}

function doWeb(doc, url) {
	const detectedType = detectWeb(doc, url);

	switch (detectedType) {
		case "case":
			return scrapeCase(doc, url);
		case "statute":
			return scrapeStatute(doc, url);
		case "statuteSection":
			return scrapeStatuteSection(doc, url);
		default:
			return false;
	}
}

function scrapeCase(doc, url) {
	const translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setHandler('itemDone', function (obj, item) {
		const citationArray = parseCitationList(text(doc, "#co_docContentWhereReported", 0));

		item.title = text(doc, "#co_docHeaderContainer") ? text(doc, "#co_docHeaderContainer") : /(.+)\|/.exec(doc.title)[1];
		item.reporter = citationArray[3];
		item.reporterVolume = citationArray[2];
		item.firstPage = citationArray[4];
		item.dateDecided = citationArray[1];
		item.court = /Court(.+)/.exec(text(doc, "#co_docContentCourt"))[1];
		item.abstractNote = "";
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "case";
		trans.doWeb(doc, url);
	});
}

function scrapeStatute(doc, url) {
	const translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');

	translator.setHandler('itemDone', function (obj, item) {
		const fullTitle = text(doc, "#co_documentTitle");
		item.date = /(\D+) (\d+)/.exec(fullTitle)[2];
		item.title = /(\D+) (\d+)/.exec(fullTitle)[1];
		item.abstractNote = "";
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "statute";
		trans.doWeb(doc, url);
	});
}

function scrapeStatuteSection(doc, url) {
	const translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');

	translator.setHandler('itemDone', function (obj, item) {
		const fullTitle = /([^\n]+)/.exec(text(doc, ".co_title, .noTOC"))[0];
		item.date = /(\D+) (\d+)/.exec(fullTitle)[2];
		item.title = /(\D+) (\d+)/.exec(fullTitle)[1];
		item.abstractNote = "";
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "statute";
		trans.doWeb(doc, url);
	});
}


function parseCitationList(citList) {
	let citationRe = /[[|(](\d+)[\]|)] (\d*) ?([A-z. ]+) (\w[^Judgment])+/g;
	let citationAsArray;
	while ((citationAsArray = citationRe.exec(citList))) {
		if (citationAsArray[3] !== "WLUK") {
			return citationAsArray;
		}
	}
	return citationAsArray;
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://uk.westlaw.com/Document/I1A0179A0E42811DA8FC2A0F0355337E9/View/FullText.html?transitionType=Default&contextData=%28sc.Default%29",
		"items": [
			{
				"itemType": "case",
				"caseName": "Parker-Tweedale v Dunbar Bank Plc (No.1)",
				"creators": [],
				"dateDecided": "1991",
				"court": "Court of Appeal (Civil Division)",
				"firstPage": "12",
				"language": "en-GB",
				"reporter": "Ch.",
				"url": "http://uk.practicallaw.thomsonreuters.com/Document/I1A0179A0E42811DA8FC2A0F0355337E9/View/FullText.html?transitionType=Default&contextData=%28sc.Default%29",
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
		"url": "https://uk.westlaw.com/Document/I67088A508B0211DBB4C6A18EEE1C8BDD/View/FullText.html?transitionType=SearchItem&contextData=(sc.Search)",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Companies Act",
				"creators": [],
				"dateEnacted": "2006",
				"language": "en-GB",
				"url": "http://uk.practicallaw.thomsonreuters.com/Document/I67088A508B0211DBB4C6A18EEE1C8BDD/View/FullText.html?transitionType=SearchItem&contextData=(sc.Search)",
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
	}
]
/** END TEST CASES **/
