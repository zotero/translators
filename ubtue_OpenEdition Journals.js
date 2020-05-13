{
	"translatorID": "55275811-58f4-4f5e-b711-a043f1fc50da",
	"label": "OpenEdition Journals",
	"creator": "Madeesh Kannan",
	"target": "https?://journals.openedition.org",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-05-13 17:17:11"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright � 2019 Universit�tsbibliothek T�bingen.  All rights reserved.

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
		return "multiple";
	else if (ZU.xpath(doc, '//h1[@id="docTitle"]').length === 1) {
		// placeholder, actual type determined by the embedded metadata translator
		return "journalArticle";
	}
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//li[contains(@class,"textes")]//div[@class="title"]//a')
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
	let translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, item) {
		let abstracts = ZU.xpath(doc, '//p[@class="resume"]');
		if (abstracts) {
			abstracts = abstracts.map(x => x.textContent.trim());
			for (let i = 0; i < abstracts.length; ++i) {
				if (i == 0)
					item.abstractNote = abstracts[i];
				else
					item.notes.push({ note: "abs:" + abstracts[i] });
			}
		}

		item.tags = ZU.xpath(doc, '//div[@id="entries"]//div[@class="index ltr"]//a | //div[@id="entries"]//div[@class="index"]//a').map(x => x.textContent.trim());
		if (item.issue) {
			let issueAndVol = item.issue.match(/(\d+)\/(\d+)/);
			if (issueAndVol) {
				item.volume = issueAndVol[1];
				item.issue = issueAndVol[2];
			}
		}

		let section = ZU.xpathText(doc, '//div[contains(@class, "souspartie")]//span[@class="title"]');
		if (section && section.match(/Recensions/))
			item.tags.push("Book Review");

		item.complete();
	});
	translator.translate();
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
			ZU.processDocuments(articles, invokeEmbeddedMetadataTranslator);
		});
	} else
		invokeEmbeddedMetadataTranslator(doc, url);
}
