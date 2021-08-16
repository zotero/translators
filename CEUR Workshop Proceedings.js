{
	"translatorID": "5f88a099-564d-4885-9a2a-e72939be3a8c",
	"label": "CEUR Workshop Proceedings",
	"creator": "Abe Jellinek",
	"target": "https?://ceur-ws\\.org/Vol-",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-05 16:48:19"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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
	if (url.endsWith('.pdf')) {
		return 'conferencePaper';
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('ul li[id]');
	for (let row of rows) {
		let id = row.id;
		let title = ZU.trimInternal(text(row, 'a'));
		if (!id || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[id] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) scrapeIDs(doc, Object.keys(items));
		});
	}
	else {
		let id = url.match(/([^/])\.pdf/)[1];
		ZU.processDocuments('index.html', doc => scrapeIDs(doc, [id]));
	}
}

function scrapeIDs(doc, ids) {
	for (let id of ids) {
		let row = doc.getElementById(id);
		
		let item = new Zotero.Item('conferencePaper');
		item.title = text(row, '.CEURTITLE')
			|| text(row, '.AUXTITLE').replace(' (invited paper)', '')
			|| row.textContent;
		item.date = ZU.strToISO(
			text(doc, '.CEURPUBDATE') || text(doc, '.CEURLOCTIME')
		);
		item.proceedingsTitle = text(doc, '.CEURFULLTITLE');
		item.conferenceName = text(doc, '.CEURVOLTITLE');
		item.place = text(doc, '.CEURLOCTIME')
			.match(/((?:(?:,\s*)?[^\d]+)*)/)[1]
			.replace(/,\s*$/, '');
		item.publisher = 'CEUR';
		item.volume = text(doc, '.CEURVOLNR').replace('Vol-', '');
		item.series = 'CEUR Workshop Proceedings';
		item.pages = text(row, '.CEURPAGES');
		item.language = 'en';
		item.ISSN = '1613-0073';
		
		for (let author of row.querySelectorAll('.CEURAUTHOR, .AUXAUTHOR')) {
			item.creators.push(ZU.cleanAuthor(author.textContent, 'author'));
		}
		
		for (let editor of doc.querySelectorAll('.CEURVOLEDITOR')) {
			item.creators.push(ZU.cleanAuthor(editor.textContent, 'editor'));
		}
		
		item.attachments.push({
			title: 'Full Text PDF',
			mimeType: 'application/pdf',
			url: attr(row, 'a', 'href')
		});
		
		item.complete();
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://ceur-ws.org/Vol-2460/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://ceur-ws.org/Vol-2919/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
