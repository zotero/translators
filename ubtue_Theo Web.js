{
    "translatorID": "b0a407d6-6e53-43c3-b434-c691b2d646ef",
    "label": "Theo Web",
    "creator": "Madeesh Kannan",
    "target": "https?://www.theo-web.de/",
    "minVersion": "3.0",
    "maxVersion": "",
    "priority": 100,
    "inRepository": false,
    "translatorType": 4,
    "browserSupport": "gcsibv",
    "lastUpdated": "2019-07-31 11:29:00"
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
    if (ZU.xpath(doc, '//*[text()="DOI:"]').length === 1) {
        let doi = ZU.xpath(doc, '//*[text()="DOI:"]/following-sibling::text()');
        if (doi && doi.length > 0) {
            let match = doi[0].textContent.match(/\b10\.[0-9]{4,}\/[^\s&"']*[^\s&"'.,]/);
            if (match)
                return match[0];
        }
    }

    return false;
}

function detectWeb(doc, url) {
    if (getSearchResults(doc))
        return "multiple";
    else if (ZU.xpath(doc, '//meta[@property="og:type"]').length === 1 && getDOI(doc))
        return "journalArticle";
}

function getSearchResults(doc) {
    var items = {};
    var found = false;
    var rows = ZU.xpath(doc, '//a[@class="newslist--article"]')
    for (let i = 0; i < rows.length; i++) {
        let href = rows[i].href;
        let title = ZU.trimInternal(rows[i].textContent);
        if (!href || !title) continue;
        found = true;
        items[href] = title;
    }
    return found ? items : false;
}

function invokeDOITranslator(doc, url) {
    let doi = getDOI(doc);
    if (!doi)
        return;

    let translator = Zotero.loadTranslator("search");
    translator.setTranslator("b28d0d42-8549-4c6d-83fc-8382874a5cb9");
    translator.setSearch({ itemType: "journalArticle", DOI: doi });
    translator.setHandler("itemDone", function (t, i) {
        if (!i.abstractNote)
            i.abstractNote = ZU.xpathText(doc, '//p[@itemprop="description"]');

        let keywords = ZU.xpathText(doc, '//p[@class="artikel-keyword"]');
        if (keywords)
            i.tags = keywords.split(/,/).map(x => x.trim());

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
            let articles = [];
            for (let i in items) {
                articles.push(i);
            }
            ZU.processDocuments(articles, invokeDOITranslator);
        });
    } else
        invokeDOITranslator(doc, url);
}
