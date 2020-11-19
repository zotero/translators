{
    "translatorID": "4ccf849b-f9e9-4cec-9bae-7c10aa4dea53",
    "label": "University of Toronto Press",
    "creator": "Madeesh Kannan",
    "target": "^https?:\/\/www.utpjournals.press\/((doi)|(toc))\/",
    "minVersion": "3.0",
    "maxVersion": "",
    "priority": 90,
    "inRepository": false,
    "translatorType": 4,
    "browserSupport": "gcsibv",
    "lastUpdated": "2020-11-12 15:23:00"
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
    if (url.match(/\/toc\//))
        return "multiple";
    else if (url.match(/\/doi\//)) {
        // placeholder, actual type determined by the embedded metadata translator
        return "journalArticle";
    }
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[@class="art_title linkable"]/a')
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
	var volIssue = ZU.xpathText(doc, '//div[@class="journalNavTitle"]');
	var page = ZU.xpathText(doc, '//span[@class="articlePageRange"]');

	if (!item.volume && (match = volIssue.match(/Volume\s(\d+)/)))
		item.volume = match[1];
	if (!item.issue && (match = volIssue.match(/Issue\s(\d+)/)))
		item.issue = match[1];
	if (!item.pages && (match = page.match(/^pp\.\s(\d+-\d+)/)))
		item.pages = match[1];

	var abstract = ZU.xpathText(doc, '//div[contains(@class, "abstractInFull")]//p');
	if (abstract && (!item.abstractNote || item.abstractNote.length < abstract.length))
		item.abstractNote = abstract;

    var keywords = ZU.xpath(doc, '//kwd-group//a');
    if (keywords)
        item.tags = keywords.map(function(x) { return x.textContent.trim(); })

    item.complete();
}

function invokeEmbeddedMetadataTranslator(doc, url) {
    var translator = Zotero.loadTranslator("web");
    translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
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
			ZU.processDocuments(articles, invokeEmbeddedMetadataTranslator);
		});
    } else
        invokeEmbeddedMetadataTranslator(doc, url);
}
