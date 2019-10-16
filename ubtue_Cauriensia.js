{
    "translatorID": "6b7e6702-c97b-4cb5-8d16-14f4b4da2161",
    "label": "Cauriensia",
    "creator": "Madeesh Kannan",
    "target": "^https?:\/\/(www\\.)?cauriensia.es\/index.php\/.+\/article\/view.*\/[0-9]+",
    "minVersion": "3.0",
    "maxVersion": "",
    "priority": 90,
    "inRepository": false,
    "translatorType": 4,
    "browserSupport": "gcsibv",
    "lastUpdated": "2019-10-15 13:14:00"
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
    // placeholder, the OJS translator fills in the correct item type
    return "journalArticle";
}

function postProcess(doc, item) {
    var keywordNodes = ZU.xpath(doc, '//strong[contains(text(), "Keywords") or contains(text(), "Palavras") or contains(text(), "Palabras")]//parent::p//text()');
    if (keywordNodes) {
        item.tags = keywordNodes
                        .map(x => x.textContent.trim())
                        .filter(x => x.trim().length > 0 && !x.match(/keywords|palavras chave|palabras clave/ig))
                        .flatMap(x => x.split(","))
                        .map(x => x.trim().replace(/\.$/g, ""))
    }

    item.complete();
}

function doWeb(doc, url) {
    var translator = Zotero.loadTranslator("web");
    translator.setTranslator("99b62ba4-065c-4e83-a5c0-d8cc0c75d388");   // Open Journal Systems
    translator.setDocument(doc);
    translator.setHandler("itemDone", function (t, i) {
        postProcess(doc, i);
    });
    translator.translate();
}
