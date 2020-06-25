{
	"translatorID": "8011b266-12b6-42db-815c-95ecdc8736f2",
	"label": "ubtue_Jahrbuchs für Christliche Sozialwissenschaften",
	"creator": "Timotheus Kim",
	"target": "^https?://(www)?\\.uni-muenster\\.de/Ejournals/index\\.php/jcsw",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 150,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-06-24 21:41:22"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.

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
	if (url.match(/\/issue\/view/))
		return "multiple";
	else if (url.match(/article/)) {
		return "journalArticle";
	}
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "pages", " " ))] | //*[contains(concat( " ", @class, " " ), concat( " ", "title", " " ))]//a');
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
	let authors = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "name", " " ))]')
	if (item.creators.length===0) {
		for (let author of authors) {
			item.creators.push(ZU.cleanAuthor(author.textContent, "author"));
		}
	}
	item.volume = text(doc, '#pkp_content_main .title').trim();
	item.volume = item.volume.substr(3, 4);
	item.DOI = text(doc, '.doi a');
	item.Date = text(doc, '.published .value');
	//ToDO scrape englisch abstract ZU.doGet? 
	item.abstractNote = text(doc, '#pkp_content_main p');
	//ToDO replace methode not working e.g. .replace('+%E2%80%93+', '-')
	let rowpages = doc.querySelectorAll('.Z3988');
	for (let rowpage of rowpages) {
		let pages = rowpage.title; Z.debug(pages)
		item.pages = pages.match(/\d{1,3}\+%E2%80%93\+\d{1,3}/); Z.debug(item.pages)
	}
	
	item.ISSN = "2196-6265";
	item.itemType = "journalArticle";
	item.complete();
}

function invokeEMTranslator(doc) {
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
			ZU.processDocuments(articles, invokeEMTranslator);
		});
	} else
		invokeEMTranslator(doc, url);
}

