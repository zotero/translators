{
    "translatorID": "a685c846-fc0a-4988-8a25-56dbd550a516",
    "label": "Berghahn Journals",
    "creator": "Madeesh Kannan",
    "target": "^https?://www.berghahnjournals.com/view/journals/.*/[0-9]+/[0-9]+/",
    "minVersion": "3.0",
    "maxVersion": "",
    "priority": 100,
    "inRepository": false,
    "translatorType": 4,
    "browserSupport": "gcsibv",
    "lastUpdated": "2018-12-14 15:40:06"
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
    var articleTitle = ZU.xpathText(doc, '//meta[@property="og:title"]/@content')
    if (articleTitle && articleTitle.length > 0) {
        // just a placeholder - the actual type is extracted by the Embedded Metadata translator
        return "journalArticle";
    }
}

function doWeb(doc, url) {
    var translator = Zotero.loadTranslator("web");
    translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");   // Embedded Metadata
    translator.setDocument(doc);
    translator.setHandler("itemDone", function (t, i) {
        // add keywords
        let keywords = ZU.xpath(doc, '//dl[contains(@class, "keywords")]//a');
        if (keywords)
            i.tags = keywords.map(n => n.textContent);

        let abstract = ZU.xpathText(doc, '//section[@class="abstract"]//p');
        if (abstract && !i.abstractNote)
            i.abstractNote = abstract;

        i.complete();
    });
    translator.translate();
}
