{
    "translatorID": "b60e74db-2e5d-4b2a-94ac-f484737364b1",
    "label": "ubtue_Open Journal Systems Multi-Wrapper",
    "creator": "Madeesh Kannan",
    "target": "/article|issue/view/",
    "minVersion": "3.0",
    "maxVersion": "",
    "priority": 100,
    "inRepository": false,
    "translatorType": 4,
    "browserSupport": "gcsibv",
    "lastUpdated": "2020-06-26 11:10:51"
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
    if (url.match(/\/issue\/view/) && getSearchResults(doc)) return "multiple";
}

function getSearchResults(doc) {
    var items = {};
    var found = false;
    var rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "media-heading", " " ))]//a');
    for (let row of rows) {
        let href = row.href;
        let title = ZU.trimInternal(row.textContent);
        if (!href || !title) continue;
        found = true;
        items[href] = title;
    }
    return found ? items : false;
}

function invokeEMTranslator(doc) {
    var translator = Zotero.loadTranslator("web");
    translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
    translator.setDocument(doc);
    translator.setHandler("itemDone", function (t, i) {
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
            ZU.processDocuments(articles, invokeEMTranslator);
        });
    } else
        invokeEMTranslator(doc, url);
}

