{
    "translatorID": "490e44ba-a363-4758-a301-c1915bfa1926",
    "label": "Ethik und Gesellschaft",
    "creator": "Madeesh Kannan",
    "target": "^https?:\/\/www.ethik-und-gesellschaft.de\/ojs\/index.ph",
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
    if (url.match(/\/issue\/view\/[0-9]+\/showToc/))
        return "multiple";
    else if (url.match(/\/article\/view/)) {
        // placeholder, the OJS translator fills in the correct item type
        return "journalArticle";
    }
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[@class="tocTitle"]/a');
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function postProcess(doc, item) {
    // swap volume and issue
    var temp = item.volume;
    item.volume = item.issue;
    item.issue = temp

    if (item.volume == 0)
        delete item.volume;
    if (item.issue == 0)
        delete item.issue;

    // add multi-lingual abstracts
    var abstracts = ZU.xpath(doc, '//div[@id="articleAbstract"]//div//text()')
    if (abstracts) {
        var fullAbstract = "";
        for (var i in abstracts)
            fullAbstract += abstracts[i].textContent.trim() + "\n\n";

        fullAbstract = fullAbstract.trim();
        item.abstractNote = fullAbstract;
    }
    item.complete();
}

function invokeOJSTranslator(doc) {
    var translator = Zotero.loadTranslator("web");
    translator.setTranslator("99b62ba4-065c-4e83-a5c0-d8cc0c75d388");
    translator.setDocument(doc);
    translator.setHandler("itemDone", function (t, i) {
        postProcess(doc, i);
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
			ZU.processDocuments(articles, invokeOJSTranslator);
		});
    } else
    invokeOJSTranslator(doc, url);
}
