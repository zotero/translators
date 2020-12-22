{
	"translatorID": "7e7e0811-aab5-4379-bbec-f281babcf396",
	"label": "ubtue_Weltreligionen",
	"creator": "Hjordis Lindeboom",
	"target": "http://weltreligionen.at/\\?/[\\d\\-]+\\Register.htm",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-12-22 13:49:04"
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
	if (getSearchResults(doc)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc) {
	let items = {};
	let found = false;
	let text = doc.querySelectorAll("tr > td:nth-child(2)");
	for (let i = 0; i < text.length; ++i) {
		text[i].innerHTML = text[i].innerHTML.replace(/<br\s*\/?>/g, " ");
		let title = text[i].textContent.trim();
		if (!title) continue;
			found = true;
			items[i] = title;
	}
	return found ? items : false;
}

function findNode(doc, item) {
	let tdTags = doc.getElementsByTagName("td");
	let searchText = item;
	let found;
	for (let i = 0; i < tdTags.length; ++i) {
		if (tdTags[i].textContent.trim() == searchText) {
			found = tdTags[i];
			return found;
		}
	}
	return null;
}

function getNearestTableAncestor(htmlElementNode) {
	while (htmlElementNode) {
		htmlElementNode = htmlElementNode.parentNode;
		if (htmlElementNode.tagName.toLowerCase() === 'table') {
			return htmlElementNode;
		}
	}
	return null;
}

function articleTypeNote(tableNode) {
	if (tableNode.previousElementSibling) {
		let articleType = tableNode.previousElementSibling.textContent.toLowerCase();
		switch(articleType) {
			case 'buchbesprechungen':
				return "Book Review";
			case 'wegbereiter des interreligiösen dialogs':
				return "Wegbereiter des interreligiösen Dialogs";
			case 'berichte':
				return "Bericht";
		}
	}
}

function extractAuthor(doc, itemPath) {
	let authors = [];
	let authorPath = itemPath.previousElementSibling;
	authors.push(authorPath.textContent);
	return authors;
}

function extractIssue(doc, extractionPath) {
	let matchResultIssue = extractionPath.match(/(\d+).*/);
	if (matchResultIssue && matchResultIssue.length == 2)
		return matchResultIssue[1];
	return null;
}

function extractYear(doc, extractionPath) {
	let matchResultYear = extractionPath.match(/.*(\d{4}).*/);
	if (matchResultYear && matchResultYear.length == 2)
		return matchResultYear[1];
	return null;
}

function extractVolume(doc, extractionPath) {
	let matchResultVolume = extractionPath.match(/.*\(\d{4}\)(\d+).*/);
	if (matchResultVolume && matchResultVolume.length == 2)
		return matchResultVolume[1];
	return null;
}

function extractPages(doc, extractionPath) {
	let matchResultF = extractionPath.match(/,\s*(\d+)f/i);
	if (matchResultF && matchResultF.length == 2)
		return matchResultF[1] + "-" + (parseInt(matchResultF[1])+1);
	let matchResult = extractionPath.match(/\,\s*(\d+(?:\-\d+)?)/);
	if (matchResult && matchResult.length == 2)
		return matchResult[1];
	return null;
}

function doWeb(doc, url) {
	Zotero.selectItems(getSearchResults(doc), function (items) {
		for (let i in items) {
			let item = new Zotero.Item("journalArticle");
			if (!items) {
				return true;
			}
			let itemPath = findNode(doc, items[i]);
			for (let author of extractAuthor(doc, itemPath)) item.creators.push(ZU.cleanAuthor(author));
			if (itemPath.nextElementSibling) {
				let extractionPath = itemPath.nextElementSibling.textContent;
				item.date = extractYear(doc, extractionPath);			
				item.issue = extractIssue(doc, extractionPath);
				item.volume = extractVolume(doc, extractionPath);
				item.pages = extractPages(doc, extractionPath);
			}
			let tableParent = getNearestTableAncestor(itemPath);
			let articleNote = articleTypeNote(tableParent);
			if (articleNote == "Book Review")
				item.tags.push(articleNote);
			else
				item.notes.push({
					note: articleNote
				});
			item.title = items[i].replace(/\r?\n|\r/g, " ");
			item.complete();
		}
	});
}
