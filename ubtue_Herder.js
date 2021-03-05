{
	"translatorID": "7100a927-4daa-4e1a-8b63-ce883a42b35c",
	"label": "ubtue_Herder",
	"creator": "Hjordis Lindeboom",
	"target": "https://www.herder.de/[a-zA-Z]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-03-05 10:06:43"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Universitätsbibliothek Tübingen.  All rights reserved.

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
	if (url.match(/\/\d{4}\/(\d+\-)*\d{4}\/\w+/)) {
		return "journalArticle";
	} else if (getSearchResults(doc)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//ul[@class="article-list"]//a');
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function extractAuthors(doc) {
	let authorsElement = doc.querySelector('span.byline > a');
	if (authorsElement)
		return authorsElement ? authorsElement.innerText.split(',') : '';
	return false;
}

function extractIssue(doc, item, issueAndYear) {
	let issueNumber = issueAndYear.match(/\d+/g);
	if (issueNumber)
		item.issue = issueNumber[0];
}

function extractYear(doc, item, issueAndYear) {
	let year = issueAndYear.match(/\d{4}/g);
	if (year)
		item.date = year[0];
}

function invokeEmbeddedMetadataTranslator(doc, url) {
	let translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, item) {
		item.itemType = 'journalArticle';
		if (extractAuthors(doc)) {
			item.creators = [];
			for (let author of extractAuthors(doc))
				item.creators.push(ZU.cleanAuthor(author));
		}
		let extractionPath = doc.querySelectorAll('span.headline');
		for (let extract of extractionPath) {
			let testString = extract.textContent;
			if (testString.match(/\d{4}/g)) {
				let issueAndYear = extract.textContent;
				extractIssue(doc, item, issueAndYear);
				extractYear(doc, item, issueAndYear);
				break;
			}
		}
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
	} else invokeEmbeddedMetadataTranslator(doc, url);
}
