{
	"translatorID": "bf64f8a7-89b4-4a79-ae80-70630e428f35",
	"label": "Sciendo",
	"creator": "Madeesh Kannan", "Timotheus Kim",
	"target": "https?://content.sciendo.com/view/journals",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-04-07 13:22:06"
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
	if (url.match(/view/)) {
		return "multiple";
	} else if (url.match(/article/)) {
		// placeholder, actual type determined by the embedded metadata translator
		return "journalArticle";
	}
}

function getSearchResults(doc, checkOnly) {
  var items = {};
  var found = false;
  // TODO: adjust the CSS selector
  var rows = doc.querySelectorAll('.ln-1 .c-Button--primary');
  for (let row of rows) {
    // TODO: check and maybe adjust
    let href = row.href;
    // TODO: check and maybe adjust
    let title = ZU.trimInternal(row.textContent);
    if (!href || !title) continue;
    if (checkOnly) return true;
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
		if (!i.abstractNote)
            i.abstractNote = ZU.xpathText(doc, '//section[@class="abstract"]//p')

        i.tags = ZU.xpath(doc, '//dd[@class="keywords"]//a').map(x => x.textContent.trim());
        if (!i.ISSN) {
            i.ISSN = ZU.xpathText(doc, '//dl[@class="onlineissn"]//dd');
            if (i.ISSN)
                i.ISSN = i.ISSN.trim();
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
