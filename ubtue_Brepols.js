{
	"translatorID": "ade18ffe-62a6-4392-9853-eb658faf36e4",
	"label": "ubtue_Brepols",
	"creator": "Timotheus Kim",
	"target": "https?://www\\.brepolsonline\\.net",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-10-09 14:23:16"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.
	
	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/
// attr()/text() v2
function attr(docOrElem ,selector ,attr ,index){ var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector); return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){ var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector); return elem?elem.textContent:null; }

function detectWeb(doc, url) {
	if (url.match(/doi/)) return "journalArticle";
		else if (url.match(/toc/) && getSearchResults(doc, true)) return "journalArticle";
	else return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.hlFld-Title');
	for (let row of rows) {
		let href = row.parentElement;
		let title = ZU.trimInternal(row.innerHTML);//Z.debug(title)
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
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

function invokeEMTranslator(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', function (t, i) {
		var rows = doc.querySelectorAll('.hlFld-Abstract');//Z.debug(rows)
		for (let row of rows) {
			var abstractsEntry = row.innerText; //Z.debug(abstractsEntry)
			if (abstractsEntry) {
				var abstractsOneTwoThree = abstractsEntry.split('\n\n'); //Z.debug(abstractsOneTwo)
				if (abstractsOneTwoThree[3]) {
					i.abstractNote = abstractsOneTwoThree[1] + '/n4207 ' + abstractsOneTwoThree[2] + '/n4207 ' + abstractsOneTwoThree[3];
				}
				else if (abstractsOneTwoThree[2]) {
					i.abstractNote = abstractsOneTwoThree[1] + '/n4207 ' + abstractsOneTwoThree[2];
				}
				else if (!abstractsOneTwoThree[2]) {
					i.abstractNote = abstractsOneTwoThree[1];
				}
				
			} else {
				i.abstractNote = '';
				}
			}
		
		if (i.reportType === "book-review") i.tags.push('Book Review') && delete i.abstractNote;	
		let pages = text(doc, '.publicationContentPages'); //Z.debug(pages)
		if (pages) i.pages = pages.match(/\s\d+-\d+/)[0]; //Z.debug(i.pages)
		let volumes = text(doc, '.breadcrumbs'); //Z.debug(volumes)
		if (volumes) i.volume = volumes.match(/Volume\s?\d+/)[0].replace('Volume', '');
		let issue = text(doc, '.breadcrumbs');
		let issueError = issue.toString();
		i.archive = i.issue;
		if (issueError) i.issue = issueError.split('>')[3].split('Issue')[1];
		let year = attr(doc, 'ul.breadcrumbs li:nth-child(4) a', 'href');//Z.debug(year)
		if (year.match(/\w+\/\d+/)) i.date = year.split('/')[3];//Z.debug(i.date)
		let issn = text(doc, '.serialDetailsEissn');
		if (issn) i.ISSN = issn.replace('Online ISSN:', '');
		i.complete();
	});
	translator.translate();
}
