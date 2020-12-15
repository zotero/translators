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
	"lastUpdated": "2020-12-15 16:17:13"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 YOUR_NAME <- TODO
	
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
	// TODO: adjust the logic here
	if (doc.getElementsByClassName("kh_toc-list ukResearch_toc-list")[0].innerText.includes("Case")) {
		return "case";
	}
	else if (doc.getElementsByClassName("kh_toc-list ukResearch_toc-list")[0].innerText.includes("Act")) {
		return "statute";
	}
	else if (doc.title.includes("s.")) {
		return "statuteSection"
	}
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "case") {
		scrapeCase(doc,url);
	}
	else if (detectWeb(doc, url) == "statute") {
		scrapeStatute(doc,url);
	}
	else if (detectWeb(doc, url) == "statuteSection") {
		scrapeStatuteSection(doc, url);
	}
}


function scrapeCase(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	// translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		// TODO adjust if needed:
		var citation = /Reported\n(.+)\n/.exec(doc.getElementsByClassName("co_docContentMetaField")[3].innerText)[1];
		item.court = /Court\n(.+)/.exec(doc.getElementById("co_docContentCourt").innerText)[1]
		item.reporter= /\[?\(?(\d+)\]?\)? (\d+ )?(.+) (\d+)/.exec(citation)[3]
		item.reporterVolume = /\[?\(?(\d+)\]?\)? (\d+ )?(.+) (\d+)/.exec(citation)[2]
		item.firstPage = /\[?\(?(\d+)\]?\)? (\d+ )?(.+) (\d+)/.exec(citation)[4]
		item.dateDecided = /\[?\(?(\d+)\]?\)? (\d+ )?(.+) (\d+)/.exec(citation)[1];
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
		item.date= /(\D+) (\d+)/.exec(fullTitle)[2];
		item.title= /(\D+) (\d+)/.exec(fullTitle)[1];
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
		item.date= /(\D+) (\d+)/.exec(fullTitle)[2];
		item.title= /(\D+) (\d+)/.exec(fullTitle)[1];
		item.abstractNote = "";
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "statute";
		// TODO map additional meta tags here, or delete completely

		trans.doWeb(doc, url);
	});
}
