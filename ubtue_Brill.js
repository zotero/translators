{
	"translatorID": "b2fcf7d9-e023-412e-a2bc-f06d6275da24",
	"label": "Brill",
	"creator": "Madeesh Kannan",
	"target": "^https?://brill.com/view/journals/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 90,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-12-02 12:18:25"
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
	if (url.match(/article-.+\.xml$/)) {
		return "journalArticle";
	} else if (url.match(/issue-\d+(-\d+)?\.xml$/)) {
		return "multiple";
 	}
}

function getSearchResults(doc) {
	let items = {};
	let found = false;
	let links = ZU.xpath(doc, '//a[contains(@class, "c-Typography--title")]');
	let usesTypography = !!links.length;
	if (!usesTypography) {
		links = ZU.xpath(doc, '//a[@class="c-Button--link" and @target="_self"]');
	}
	let text = usesTypography ?
	           ZU.xpath(doc, '//a[contains(@class, "c-Typography--title")]/span') :
	           ZU.xpath(doc, '//a[@class="c-Button--link" and @target="_self"]');
	for (let i = 0; i < links.length; ++i) {
		let href = links[i].href;
		let title = ZU.trimInternal(text[i].textContent);
        if (!href || !title) continue;
        if (!href.match(/article-.+\.xml$/))
            continue;

		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function postProcess(doc, item) {
	if (!item.abstractNote) {
        item.abstractNote = ZU.xpath(doc, '//section[@class="abstract"]//p');
        if (item.abstractNote && item.abstractNote.length > 0)
            item.abstractNote = item.abstractNote[0].textContent.trim();
    }
	item.tags = ZU.xpath(doc, '//dd[contains(@class, "keywords")]//a');
	if (item.tags)
		item.tags = item.tags.map(i => i.textContent.trim());
	let reviewEntry = text(doc, '.articlecategory');
	if (reviewEntry && reviewEntry.match(/book\sreview/i)) item.tags.push('Book Review');
	// mark articles as "LF" (MARC=856 |z|kostenfrei), that are published as open access
	let openAccessTag = text(doc, '.has-license span');
	if (openAccessTag) item.notes.push('LF');
	item.itemType = "journalArticle";
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
