{
    "translatorID": "6f895480-9405-40f8-9177-90a3c969fe9a",
    "label": "Universidad de Navarra",
    "creator": "Madeesh Kannan",
    "target": "^https?:\/\/www.unav.edu\/publicaciones\/revistas\/index.php\/.+\/article\/view",
    "minVersion": "3.0",
    "maxVersion": "",
    "priority": 90,
    "inRepository": false,
    "translatorType": 4,
    "browserSupport": "gcsibv",
    "lastUpdated": "2019-15-03 13:14:00"
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
    // placeholder, the Embedded Metadata translator fills in the correct item type
    return "journalArticle";
}

function postProcess(doc, item) {
    // The author name returned by the embedded metadata translator includes the name of the
    // institution to which the author belongs
    var authors = ZU.xpath(doc, "//div[@class='authorBio']/em");
    if (authors)
        item.creators = authors.map(function(x) { return ZU.cleanAuthor(x.textContent, 'author'); })

    item.complete();
}

function invokeEmbeddedMetadataTranslator(doc) {
    var translator = Zotero.loadTranslator("web");
    translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
    translator.setDocument(doc);
    translator.setHandler("itemDone", function (t, i) {
        postProcess(doc, i);
    });
    translator.translate();
}

function doWeb(doc, url) {
    invokeEmbeddedMetadataTranslator(doc);
}
