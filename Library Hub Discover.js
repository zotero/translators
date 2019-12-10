{
	"translatorID": "00d5236c-ce1f-484b-9552-da8e2f10eee4",
	"label": "Library Hub Discover",
	"creator": "Vincent Carret",
	"target": "^https?://(www\\.)?discover\\.libraryhub\\.jisc\\.ac\\.uk/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-12-10 21:10:46"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Vincent Carret
	
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
// eslint-disable-next-line
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}

function detectWeb(doc, url) {
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll(".record-details__title a");
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (title.endsWith(" /")) title = title.slice(0, -2);
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
		  if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('05d07af9-105a-4572-99f6-a8e231c0daef');
	translator.setDocument(doc);
	translator.translate();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://discover.libraryhub.jisc.ac.uk/search?q=test",
		"items": "multiple"
	}
]
/** END TEST CASES **/
