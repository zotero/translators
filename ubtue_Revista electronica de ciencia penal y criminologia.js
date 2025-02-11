{
	"translatorID": "7e638a55-f469-4324-89c9-e31aa71c4b46",
	"label": "ubtue_Revista electrónica de ciencia penal y criminología",
	"creator": "Johannes Riedl",
	"target": "^https?://criminet.ugr.es/recpc/\\d+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-02-11 08:20:24"
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


const entriesXPath = '//p[@class="MsoFooter"]';
const journalInfoXPath = '//p[@class="MsoNormal"]//span/text()';

const articleNumberPrefix = '^\\s*\\d+-[a-z]?\\d+[a-z]?';
const quotationMarks = '["”«»]';

function detectWeb(doc, url) {
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = ZU.xpath(doc, entriesXPath);
	for (let row of rows) {
		let title = ZU.trimInternal(row.textContent);
		let anchor = row.querySelector('a');
		let href = anchor ? anchor.getAttribute("href") : null;
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function getIssue(doc) {
	let issueExpressions = ZU.xpath(doc, journalInfoXPath);
	for (let exp of issueExpressions) {
	   let issue = /Núm\.\s+(\d+)/.exec(exp.nodeValue);
	   if (issue) return issue[1];
	}
	// With the new layout there is seemingly no direct class
	issueExpressions = ZU.xpath(doc, "//span[contains(@style, 'font-size:18.0pt;')]");
	for (let exp of issueExpressions) {
		let issue = /Número\s+(\d+)/.exec(exp.innerText);
		if (issue) return issue[1];
	}
	return false;
}


function getYear(doc) {
	let yearExpression = ZU.xpath(doc, journalInfoXPath);
	for (let exp of yearExpression) {
		let year = /Núm\.\s+\d+\s*\((\d+)\)/.exec(exp.nodeValue);
		if (year) return year[1];
	}
	yearExpression = ZU.xpath(doc, "//span[contains(@style, 'font-size:18.0pt;')]");
	for (let exp of yearExpression) {
		let issue = /Año\s+(\d+).*/.exec(exp.innerText);
		if (issue) return issue[1];
	}
}


function extractAuthors(entry) {
	let authorRegex = new RegExp(articleNumberPrefix + '\\s+(.*),\\s+'
		+ quotationMarks + '.*' + quotationMarks + '.*$');
	let onelineInnerText = entry.innerText.replace(/[\r\n]+/g, " ").replace(/\s\s+/g, " ");
	let authorPart = onelineInnerText.replace(authorRegex, "$1");
	return authorPart.replace(/[\s\r\n]+y[\s\r\n]+/g, ',').split(',');
}


function extractTitle(entry) {
	let titleRegex = new RegExp(articleNumberPrefix + '\\s+.*,\\s+'
		+ quotationMarks + '(.*)' + quotationMarks + '.*$', 'g');
	let onelineInnerText = entry.innerText.replace(/[\r\n]+/g, " ").replace(/\s\s+/g, " ");
	let titlePart = onelineInnerText.replace(titleRegex, "$1");
	return cleanTitle(titlePart);
}


function extractURL(entry) {
	let anchor = entry.querySelector('a');
	let href = anchor ? anchor.href : null;
	if (href) {
		return href;
	}
}

function cleanTitle(title) {
	title = title.replace(/[\n\r]+/, '');
	title = title.replace(/(?:^\\?")(.*)(?:\\?"$)/g, "$1");
	title = title.replace(/\s\s+/gm, " ");
	return title;
}


function cleanNote(note) {
	note = cleanTitle(note);
	note = note.replace(/(?:^[\s.]+(.*)(?:[\s.]+$))/g, "$1");
	return note;
}


function extractNote(entry) {
	let noteRegex = new RegExp(articleNumberPrefix + '\\s+.*,\\s+'
		+ quotationMarks + '.*' + quotationMarks + '(.*)$', 'g');
	let onelineInnerText = entry.innerText.replace(/[\r\n]+/g, " ");
	let notePart = onelineInnerText.replace(noteRegex, "$1");
	return (cleanNote(notePart));
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let rows = ZU.xpath(doc, entriesXPath);
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			Object.keys(items).forEach(function (key) {
				let item = new Zotero.Item("journalArticle");
				let entryXPath = entriesXPath + '[.//a[@href=\'' + key + '\']]';
				let entry = ZU.xpath(doc, entryXPath);
				if (Object.keys(entry).length != 1) Z.debug("Warning: more than one matching entry element for " + key + " -- continue with first...");
				for (let author of extractAuthors(entry[0])) item.creators.push(ZU.cleanAuthor(author, "author"));
				item.title = extractTitle(entry[0]);
				item.issue = getIssue(doc);
				item.date = getYear(doc);
				item.url = extractURL(entry[0]);
				if ((note = extractNote(entry[0]))) item.notes.push(note);
				item.complete();
			});
		});
	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
