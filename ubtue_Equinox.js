{
    "translatorID": "cf2973a7-5804-4e28-a684-04051122fcc0",
    "label": "EquinoxPub",
    "creator": "Madeesh Kannan",
    "target": "^https:\/\/journals.equinoxpub.com\/index.php\/.+\/article\/view\/[0-9]+",
    "minVersion": "3.0",
    "maxVersion": "",
    "priority": 90,
    "inRepository": false,
    "translatorType": 4,
    "browserSupport": "gcsibv",
    "lastUpdated": "2018-11-08 13:14:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Universitätsbibliothek Tübingen.  All rights reserved.

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

function postProcess(item) {
    // sanitize page number ranges
    var pages = item.pages.trim();
    if (pages) {
        var matched = pages.match(/^([0-9]+-[0-9]+)/);
        if (matched)
            item.pages = matched[1];
    }

    item.complete();
}

function doWeb(doc, url) {
    // The page contents are in a seperate HTML document inside an inline frame
    // The frame source contains the required metadata that can be parsed by the Embedded Metadata translator
    var iframe = ZU.xpath(doc, '//frame[contains(@src, "viewArticle")]');
    if (!iframe) {
        Z.debug("Missing content frame!");
        return false;
    }

    var content = iframe[0].contentDocument;
    var translator = Zotero.loadTranslator("web");
    translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
    translator.setDocument(content);
    translator.setHandler("itemDone", function (t, i) {
        postProcess(i);
    });
    translator.translate();
}
