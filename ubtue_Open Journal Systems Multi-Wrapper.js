{
	"translatorID": "b60e74db-2e5d-4b2a-94ac-f484737364b1",
	"label": "ubtue_Open Journal Systems Multi-Wrapper",
	"creator": "Madeesh Kannan",
	"target": "/issue/view/|index.php/journal/(?!article/view/)|index.php/eguzkilore/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 900,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-11-07 12:00:36"
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

function detectOJSByScript(doc) {
	let pkpLibraries = ZU.xpath(doc, '//script[contains(@src, "/lib/pkp/js/")]');
	return ZU.xpathText(doc, '//a[@id="developedBy"]/@href') == 'http://pkp.sfu.ca/ojs/' ||
		  pkpLibraries.length >= 1;
}

function detectOJSByMeta(doc) {
	let generator = attr(doc, 'meta[name=generator]', 'content')
	Z.debug(generator);
	return generator.match(/Open Journal Systems/i);
}


function detectWeb(doc, url) {
	if (!detectOJSByScript(doc) && !detectOJSByMeta(doc))
		return false;
	items = getSearchResults(doc);
	if (items && Object.keys(items).length > 1)
		return "multiple";
	return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//a[(contains(@href, "/article/view/") and not(contains(@href, "/pdf")))]');
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);

		if (!href || !title)
			continue;
		if (title.match(/PDF|EPUB|XML|HTML|Download Full Text/i))
			continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function invokeBestTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setDocument(doc);
	translator.setHandler("translators", function (o, valid_translators) {
		if (valid_translators && valid_translators.length > 0) {
			translator.setTranslator(valid_translators);
			translator.translate();
		}
	});
	translator.setHandler("itemDone", function (t, item) {
		if (item.issue === "0")
			item.issue = "";

		if (item.volume === "0")
			item.volume = "";

		item.complete();
	});
	translator.getTranslators();
}

function doWeb(doc, url) {
	let items = getSearchResults(doc);
	if (items) {
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			let articles = [];
			for (let i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeBestTranslator);
		});
	} else {
		// attempt to skip landing pages for issues
		let tocLinks = ZU.xpath(doc, '//a[contains(@href, "/issue/view/") and not(contains(@href, "/pdf"))]');
		for (let entry in tocLinks) {
			let link = tocLinks[entry].href;
			if (link.match(/\/issue\/view\/\d+\/showToc$/i)) {
				ZU.processDocuments([link], invokeBestTranslator);
				break;
			}
		}
	}
}
/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
