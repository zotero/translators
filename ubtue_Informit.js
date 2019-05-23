{
	"translatorID": "de2f3a0f-8b3f-47cd-a3ab-f0fdb1cb3c25",
	"label": "Informit",
	"creator": "Madeesh Kannan",
	"target": "https?://search.informit.com.au/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-01-10 15:40:06"
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
    if (url.match(/\/browsePublication;/))
        return "multiple";
    else if (url.match(/\/documentSummary;/)) {
        // placeholder, actual type determined by the embedded metadata translator
        return "journalArticle";
    }
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, "//div[@class='listing-detail']/p//a")
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
	let articleSource = ZU.xpathText(doc, '//span[contains(text(), "Source:")]/following-sibling::span[1]').trim();
	let pageMatch = articleSource.match(/(\d+-\d+)$/);
	if (pageMatch) {
		if (item.pages != pageMatch[1])
			item.pages = pageMatch[1];
	}

    if (!item.DOI)
        item.DOI = ZU.xpathText(doc, "//span[@class='list-item-type' and contains(text(), 'DOI:')][1]/following-sibling::span[1]/a");

    if (!item.ISSN)
        item.ISSN = ZU.xpathText(doc, "//span[@class='list-item-type' and contains(text(), 'ISSN:')][1]/following-sibling::span[1]");

    item.tags = ZU.xpath(doc, "//span[@class='list-item-type' and contains(text(), 'Subject:')][1]/following-sibling::span[1]//a")
                     .map(i => i.textContent)
}

function invokeEmbeddedMetadataTranslator(doc, url) {
    var translator = Zotero.loadTranslator("web");
    translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
    translator.setDocument(doc);
    translator.setHandler("itemDone", function (t, i) {
        postProcess(doc, i);
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
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEmbeddedMetadataTranslator);
		});
    } else
        invokeEmbeddedMetadataTranslator(doc, url);
}
