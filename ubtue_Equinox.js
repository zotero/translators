{
    "translatorID": "cf2973a7-5804-4e28-a684-04051122fcc0",
    "label": "EquinoxPub",
    "creator": "Madeesh Kannan",
    "target": "^https:\/\/(www)|(journals).equinoxpub.com\/",
    "minVersion": "3.0",
    "maxVersion": "",
    "priority": 90,
    "inRepository": false,
    "translatorType": 4,
    "browserSupport": "gcsibv",
    "lastUpdated": "2018-11-09 13:14:00"
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
    // except for "multiple", the return values of this function are placeholders that
    // will be replaced by the Embedded Metadata translator's results
    if (/\/article\/view\//.test(url) || /-view-abstract\//.test(url))
        return "journalArticle";
    else if (/\/issue\/.+/.test(url) || /-view-issue\//.test(url))
        return "multiple";
}

function getSearchResults(doc) {
    let items = {};
    let found = false;
    let rows = ZU.xpath(doc, '//span[@class="chapter-title"]/a');
    if (!rows || rows.length == 0)
        rows = ZU.xpath(doc, '//td[@class="tocTitle"]/a');
    for (let i = 0; i < rows.length; i++) {
        let href = rows[i].href;
        let title = ZU.trimInternal(rows[i].textContent);
        if (!href || !title) continue;
        found = true;
        items[href] = title;
    }
    return found ? items : false;
}

function postProcess(item) {
    // sanitize page number ranges
    if (item.pages) {
        let pages = item.pages.trim();
        if (pages) {
            let matched = pages.match(/^([0-9]+-[0-9]+)/);
            if (matched)
                item.pages = matched[1];
        }
    }

    // and now for something completely Javascript(TM): The "It's freaking there!" problem!
    // https://stackoverflow.com/questions/17546953/cant-access-object-property-even-though-it-exists-returns-undefined

    // we need to clear the abstractNote field in the case of editorials.
    // ideally, we'd look at the shortTitle field, but thanks to the above problem, the shortTitle field is undefined at this point.
    // so, we'll just check the abstract itself instead.
    if (item.abstractNote.startsWith("Editorial"))
        item.abstractNote = "";

    // HTML escape sequences occasionally sneak into the abstract
    if (item.abstractNote)
        item.abstractNote = ZU.unescapeHTML(item.abstractNote)

    item.complete();
}

function invokeEmbeddedMetadataTranslator(doc) {
    let translator = Zotero.loadTranslator("web");
    translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
    translator.setDocument(doc);
    translator.setHandler("itemDone", function (t, i) {
        postProcess(i);
    });
    translator.translate();
}

function scrape(doc, url) {
    if (/\/article\/view\//.test(url)) {
        // The page contents are in a seperate HTML document inside an inline frame
        // The frame source contains the required metadata that can be parsed by the Embedded Metadata translator
        let iframes = ZU.xpath(doc, '//frame[contains(@src, "viewArticle")]');
        if (!iframes || iframes.length === 0)
            throw "missing content frame!"

        let sourceFrame = iframes[0];
        let content = sourceFrame.contentDocument;
        if (content && content.documentElement && content.documentElement.namespaceURI)
            invokeEmbeddedMetadataTranslator(content);
        else {
            // attempt to load the frame contents
            let iframeSource = sourceFrame.getAttribute("src");
            if (!iframeSource)
                throw "missing frame source!";

            ZU.processDocuments([iframeSource], invokeEmbeddedMetadataTranslator);
            Zotero.wait();
        }
    } else if (/-view-abstract\//.test(url)) {
        // find the correct URL and pass that on to the translator
        let citationText = ZU.xpathText(doc, '//em[preceding-sibling::h4[text()="Citation"]]');
        if (citationText) {
            let articleUrlMatch = citationText.match(/(https?:\/\/journals.*?)\.\s/);
            if (articleUrlMatch)
                ZU.processDocuments([articleUrlMatch[1]], scrape);
        }
    }
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
            ZU.processDocuments(articles, scrape);
        });
    } else
        scrape(doc, url);
}
