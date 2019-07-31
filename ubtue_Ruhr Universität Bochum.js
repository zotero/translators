{
    "translatorID": "649b3328-3e6c-4c1f-b469-cb17235a7b93",
    "label": "Ruhr Universität Bochum",
    "creator": "Madeesh Kannan",
    "target": "https?://er.ceres.rub.de/index.php/.+/((article)|(issue))/view/",
    "minVersion": "3.0",
    "maxVersion": "",
    "priority": 90,
    "inRepository": false,
    "translatorType": 4,
    "browserSupport": "gcsibv",
    "lastUpdated": "2019-07-31 16:50:25"
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
    else
        return "journalArticle";
}

function getSearchResults(doc) {
    var items = {};
    var found = false;
    var rows = ZU.xpath(doc, '//div[@class="title"]//a')
    for (let i = 0; i < rows.length; i++) {
        let href = rows[i].href;
        let title = ZU.trimInternal(rows[i].textContent);
        if (!href || !title) continue;
        found = true;
        items[href] = title;
    }
    return found ? items : false;
}

function postProcess(doc, item) {
    if (!item.abstractNote)
        item.abstractNote = ZU.xpathText(doc, '//div[@class="item abstract"]//p');
}

function invokeOJSTranslator(doc, url) {
    var translator = Zotero.loadTranslator("web");
    translator.setTranslator("99b62ba4-065c-4e83-a5c0-d8cc0c75d388");
    translator.setDocument(doc);
    translator.setHandler("itemDone", function (t, i) {
        postProcess(doc, i);
        i.complete();
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
            ZU.processDocuments(articles, invokeOJSTranslator);
        });
    } else
        invokeOJSTranslator(doc, url);
}
