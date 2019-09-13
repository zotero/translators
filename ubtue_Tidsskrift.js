{
    "translatorID": "a288df9e-ce56-40ca-a205-bc32182ced4c",
    "label": "tidsskrift.dk",
    "creator": "Madeesh Kannan",
    "target": "^https*:\/\/tidsskrift.dk\/[^/]+\/article\/view.*\/[0-9]+",
    "minVersion": "3.0",
    "maxVersion": "",
    "priority": 90,
    "inRepository": false,
    "translatorType": 4,
    "browserSupport": "gcsibv",
    "lastUpdated": "2018-11-23 13:14:00"
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
    // placeholder, the OJS translator fills in the correct item type
    return "journalArticle";
}

function postProcess(doc, item) {
    if (!item.abstractNote) {
        // iterate through the different abstracts until we find one in English
        // if we don't find one for English, we'll just use the first one we processed
        var abstractParagraphs = ZU.xpath(doc, '//div[@class="item abstract"]//p');
        if (abstractParagraphs && abstractParagraphs.length > 0) {
            for (var paragraph in abstractParagraphs) {
                var extractedText = ZU.xpathText(abstractParagraphs[paragraph], ".").trim();
                if (paragraph == 0)
                    item.abstractNote = extractedText;

                // check if it's in English
                var prologue = extractedText.match(/^(\w)*\s\w*:(.*)/i);
                if (prologue) {
                    var language = prologue[1];
                    if (language.match(/english/i)) {
                        item.abstractNote = prologue[2].trim();
                        break;
                    }
                }
            }
        }

        if (item.abstractNote) {
            var matchExtraWords = item.abstractNote.match(/(english abstract:|svensk resume:|abstract:|resume:)(.*)/i);
            if (matchExtraWords)
                item.abstractNote = matchExtraWords[2].trim();
        }
    }

    // swap Band and Ausgabe
    var issue = item.issue;
    item.issue = item.volume;
    item.volume = issue;

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
