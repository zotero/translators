{
	"translatorID": "9ef1752e-bd32-49bb-9d9b-f06c039712ab",
	"label": "ubtue_DeGruyter",
	"creator": "Timotheus Kim",
	"target": "^https?://www\\.degruyter\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 80,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-08-25 14:09:05"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.
	
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
	if (url.includes('/article/')) return "journalArticle";
		else if (url.match(/issue/) && getSearchResults(doc)) return "multiple";
	else return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.c-Button--link, c-Button--primary');
	for (let row of rows) {
		var href = row.href.match(/article/); //Z.debug(href)
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href.input] = title;
	}
	return found ? items : false;
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

function invokeEMTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		if (i.title.match(/ISBN/)) i.tags.push('Book Review') && delete i.abstractNote;
		i.complete();
	});
	translator.translate();
}
