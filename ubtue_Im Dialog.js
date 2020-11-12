{
	"translatorID": "5efcb514-9ee3-4bee-9381-3f0921e962d3",
	"label": "ubtue_Im Dialog",
	"creator": "Timotheus Kim",
	"target": "^https?://imdialog\\.akademie-rs\\.de/ojs/index\\.php/idadrs/(article|issue)/view/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 150,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-06-24 20:17:38"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.

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
	if (url.match(/\/issue\/view/)) return "multiple";
	else if (url.match(/article/)) {
		return "journalArticle";
	}
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "title", " " ))] | //*[contains(concat( " ", @class, " " ), concat( " ", "title", " " ))]//a');
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
	if (item.pages.match(/^\d{1,3}–\d{1,3}-\d{1,3}–\d{1,3}/)) {
		let firstandlastpages = item.pages.split('–'); //Z.debug(firstandlastpages)
		item.pages = firstandlastpages[0] + '-' + firstandlastpages[2];
	}
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
	} else invokeEMTranslator(doc, url);
}
