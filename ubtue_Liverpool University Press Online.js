{
    "translatorID": "0c5a7d92-1a1e-407f-a139-d68abbac163c",
    "label": "Liverpool University Press Online",
    "creator": "Madeesh Kannan",
    "target": "^https?:\/\/online.liverpooluniversitypress.co.uk\/((doi)|(toc))\/",
    "minVersion": "3.0",
    "maxVersion": "",
    "priority": 90,
    "inRepository": false,
    "translatorType": 4,
    "browserSupport": "gcsibv",
    "lastUpdated": "2019-03-22 13:14:00"
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
    if (url.match(/\/toc\//))
        return "multiple";
    else {
        // placeholder, filled in by the Atypon translator
        return "journalArticle";
    }
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[contains(@class, "art_title")]//a')
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
    item.abstractNote = ZU.xpathText(doc, '//div[contains(@class, "abstractInFull")]//p[not(@class="summary-title")]');
    item.tags = ZU.xpath(doc, '//div[@class= "abstractKeywords"]//a').map(x => x.textContent.trim());

    item.complete();
}

function invokeAtyponTranslator(doc) {
    var translator = Zotero.loadTranslator("web");
    translator.setTranslator("5af42734-7cd5-4c69-97fc-bc406999bdba");
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
			ZU.processDocuments(articles, invokeAtyponTranslator);
		});
	} else
        invokeAtyponTranslator(doc, url);
}
