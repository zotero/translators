{
    "translatorID": "37a84f2d-2708-4adf-bb64-27c345d764fe",
    "label": "Faculdade Jesuita de Filosofia e Teologia",
    "creator": "Madeesh Kannan",
    "target": "https?://www.faje.edu.br",
    "minVersion": "3.0",
    "maxVersion": "",
    "priority": 90,
    "inRepository": false,
    "translatorType": 4,
    "browserSupport": "gcsibv",
    "lastUpdated": "2019-08-28 11:29:00"
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


function getDOI(doc) {
    let doi = ZU.xpathText(doc, '//div[@class="item doi"]/span[@class="value"]');
    if (doi && doi.length > 0) {
        let match = doi.match(/\b10\.[0-9]{4,}\/[^\s&"']*[^\s&"'.,]/);
        if (match)
            return match[0];
    }

    return false;
}

function detectWeb(doc, url) {
    if (url.match(/\/article\/view\//) && getDOI(doc))
        return "journalArticle";
}

function invokeDOITranslator(doc, url) {
    let doi = getDOI(doc);
    let translator = Zotero.loadTranslator("search");
    translator.setTranslator("b28d0d42-8549-4c6d-83fc-8382874a5cb9");
    translator.setSearch({ itemType: "journalArticle", DOI: doi });
    translator.setHandler("itemDone", function (t, i) {
        i.complete();
    });
    translator.translate();
}

function doWeb(doc, url) {
    invokeDOITranslator(doc, url);
}
