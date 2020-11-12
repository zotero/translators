{
	"translatorID": "65b8e452-2f2f-439c-9087-ad1bd6bf8934",
	"label": "Masaryk University",
	"creator": "Madeesh Kannan",
	"target": "https?://digilib.phil.muni.cz/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-08-01 15:40:06"
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
	if (getSearchResults(doc))
		return "multiple"

	let title = ZU.xpath(doc, '//span[@class="item-title"]');
	if (title && title.length == 1)
		return "journalArticle";
}

function getSearchResults(doc) {
	let items = {};
	let found = false;
	let rows = ZU.xpath(doc, '//td[@class="issue-entry"]//a[not(contains(@href, ".pdf?"))]')
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function invokeEmbeddedMetadataTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		if (i.itemType === "webpage")
			i.itemType = "journalArticle";

		let keywords = ZU.xpathText(doc, '//span[@id="article_head_text" and contains(text(), "Keywords:")]/../following-sibling::div/div');
		if (keywords)
			i.tags = keywords.split(/;/).map(x => x.trim());

		if (!i.abstractNote)
			i.abstractNote = ZU.xpathText(doc, '//span[@id="article_head_text" and contains(text(), "Abstract(s):")]/../following-sibling::div/div');

		let issn = ZU.xpathText(doc, '//span[@id="article_head_text" and contains(text(), "ISSN:")]/../following-sibling::td');
		let matches = issn.match(/(\d{4}-\d{3}[0-9Xx])/g);
		if (matches && matches.length === 2)
			i.ISSN = matches[1];
		else if (matches && matches.length === 3) {
			matches = issn.match(/(\d{4}-\d{3}[0-9Xx])\s+\(online\)/);
			if (matches)
				i.ISSN = matches[1];
		}

		let source = ZU.xpathText(doc, '//span[@id="article_head_text" and contains(text(), "Source document:")]/../following-sibling::td');
		matches = source.match(/vol\.\s+(\d+),\s+iss\.\s+(\d+),\s+pp\.\s+(\[?\d+\]?-\[?\d+\]?)/);
		if (matches) {
			i.volume = matches[1];
			i.issue = matches[2];
			i.pages = matches[3].replace(/\[/g, "").replace(/\]/g, "");
		}

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
