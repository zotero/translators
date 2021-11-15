{
	"translatorID": "e6d9cf77-53e4-47f5-98ae-a69eba6d985f",
	"label": "WestLaw UK",
	"creator": "George Gebbett",
	"target": "^https://uk\\.westlaw\\.com/Document/.*",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-01-06 11:36:52"
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
	if (text(doc, ".kh_toc-list.ukResearch_toc-list").includes("Case")) {
		return "case";
	}
	else if (text(doc, ".kh_toc-list.ukResearch_toc-list").includes("Act")) {
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
	if (detectWeb(doc, url) == "case") {
		return scrapeCase(doc, url);
	}
	else if (detectWeb(doc, url) == "statute") {
		return scrapeStatute(doc, url);
	}
	else if (detectWeb(doc, url) == "statuteSection") {
		return scrapeStatuteSection(doc, url);
	}
	else {
		return false;
	}
}


function scrapeCase(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	// translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		// TODO adjust if needed:

		var citationArray = parseCitationList(doc.getElementsByClassName("co_docContentMetaField")[3].innerText);

		item.reporter = citationArray[3];
		item.reporterVolume = citationArray[2];
		item.firstPage = citationArray[4];
		item.dateDecided = citationArray[1];
		item.court = /Court\n(.+)/.exec(doc.getElementById("co_docContentCourt").innerText)[1];
		item.abstractNote = "";
		item.complete();


	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "case";
		// TODO map additional meta tags here, or delete completely

		trans.doWeb(doc, url);
	});
}

function scrapeStatute(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	// translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		// TODO adjust if needed:
		var fullTitle = doc.getElementById("co_documentTitle").innerText;
		item.date = /(\D+) (\d+)/.exec(fullTitle)[2];
		item.title = /(\D+) (\d+)/.exec(fullTitle)[1];
		item.abstractNote = "";
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "statute";
		// TODO map additional meta tags here, or delete completely

		trans.doWeb(doc, url);
	});
}

function scrapeStatuteSection(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	// translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		// TODO adjust if needed:
		var fullTitle = /([^\n]+)/.exec(doc.getElementsByClassName("co_title noTOC")[0].innerText)[0];
		item.date = /(\D+) (\d+)/.exec(fullTitle)[2];
		item.title = /(\D+) (\d+)/.exec(fullTitle)[1];
		item.abstractNote = "";
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "statute";
		// TODO map additional meta tags here, or delete completely

		trans.doWeb(doc, url);
	});
}


function parseCitationList(citList){
	var allCitations = citList.match(/^[\[|\(](\d+)[\]|\)] (\d*) ?([A-z\. ]+) ([\w]+)$/gm); //annoyingly matchAll is not supported
	if (allCitations.length === 1){ //if there is only one citation we'll have to use it
		var onlyCitationAsArray = /^[\[|\(](\d+)[\]|\)] (\d*) ?([A-z\. ]+) ([\w]+)$/gm.exec(allCitations[0]);
		return onlyCitationAsArray;
	} else { //if there's more than one we will find the first one that isn't WLUK
		for (var citation of allCitations) {
			var citationAsArray = /^[\[|\(](\d+)[\]|\)] (\d*) ?([A-z\. ]+) ([\w]+)$/gm.exec(citation);
			if (citationAsArray[3] === "WLUK"){
				continue;
			} else {
				return citationAsArray;
			}
		}
	}
}
