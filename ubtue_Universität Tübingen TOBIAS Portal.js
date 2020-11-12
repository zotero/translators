{
    "translatorID": "eff65ba5-5a3f-47f8-b3ca-015e7f3825ce",
    "label": "Universität Tübingen TOBIAS Portal",
    "creator": "Madeesh Kannan",
    "target": "^https?:\/\/publikationen.uni-tuebingen.de",
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
    // placeholder, the Embedded Metadata translator fills in the correct item type
    return "journalArticle";
}

function postProcess(doc, item) {
    let tags = ZU.xpathText(doc, '//meta[@name="DC.subject" and not(./@scheme)]/@content');
    if (tags)
        item.tags = tags.split(',').map(x => x.trim());

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
    invokeEMTranslator(doc);
}
