{
	"translatorID": "d14cf339-1f8b-4cf0-b06f-b609b7be3676",
	"label": "Mikado",
	"creator": "Madeesh Kannan",
	"target": "http://www.mikado-ac.info/starweb/MIS/DEU/OPAC/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-08-06 14:24:16"
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
	var type = ZU.xpathText(doc,'//*[@id="ContentContainerOS"]/h1');

	if (type == "Vollanzeige")
		return "journalArticle";
}

function postProcess(doc, url, type, item) {
	var issue = item.issue.substring(0, item.issue.indexOf("|")).trim();
	var page = item.issue.substring(item.issue.indexOf("S.") + 2).trim();
	item.issue = issue;
	item.pages = page;
	item.language = ZU.xpathText(doc, '//td[preceding-sibling::td[contains(text(), "Sprache")]]/text()');
	item.abstractNote = ZU.xpathText(doc,'//blockquote[preceding-sibling::label[contains(text(), "Abstract:")]]/text()');

	var title = ZU.xpathText(doc, '//td[preceding-sibling::td[contains(text(), "Titel")]]/h4/text()').trim();
	title = title.slice(0, title.length - 1);
	var subtitle = ZU.xpathText(doc, '//td[preceding-sibling::td[contains(text(), "Titelzusatz")]]/text()');

	if (subtitle === undefined || subtitle === null)
		subtitle = "";

	var fullTitle = title + (subtitle.length > 0 ? " : " + subtitle : "");
	item.shortTitle = title;
	item.title = fullTitle;

	var keywords = ZU.xpath(doc, '//td[preceding-sibling::td[contains(text(), "Schlagwörter")]]/span/span/descendant::a');
	keywords = keywords.map(function(a) { return a.textContent; });
	for (var i in keywords)
		item.tags.push(keywords[i]);

	item.complete();
}

function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if (type == "journalArticle") {
		// use COinS for the basic data
		var translator = Zotero.loadTranslator("web");
		translator.setTranslator("05d07af9-105a-4572-99f6-a8e231c0daef");
		translator.setDocument(doc);
		translator.setHandler("itemDone", function (t, i) {
			postProcess(doc, url, type, i);
		});
		translator.translate();
	} else {
		Z.debug("Item type " + type + " not supported yet");
	}
}

