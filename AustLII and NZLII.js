{
	"translatorID": "5ed5ab01-899f-4a3b-a74c-290fb2a1c9a4",
	"label": "AustLII and NZLII",
	"creator": "Justin Warren, Philipp Zumstein",
	"target": "^https?://www\\d?\\.(austlii\\.edu\\.au|nzlii\\.org)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-09-12 06:20:42"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Justin Warren, Philipp Zumstein
	
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
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}


function detectWeb(doc, url) {
	var classes = attr(doc, 'body', 'class');
	// Z.debug(classes);
	
	if (classes.includes('case')) {
		return "case";
	}
	if (classes.includes('legislation')) {
		return "statute";
	}
	if (classes.includes('journals')) {
		return "journalArticle";
	}
	if (url.includes('nzlii.org/nz/cases/') && url.includes('.html')) {
		return "case";
	}
	if (url.includes('austlii.edu.au/cgi-bin/sinodisp/au/cases/') && url.includes('.html')) {
		return "case";
	}
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('#page-main ul>li>a');
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (!href.includes('.html')) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if (type == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

/* 
 * Convert full court names to standard abbreviations.
 * If the name of the court is in the map, return the abbreviation
 * else return the original full name (i.e. leave it unchanged)
 * FIXME: Find a full set of these.
*/
function abbrevCourt(fullname) {
	var courtMap = new Map();
	courtMap.set('Federal Court of Australia', 'FCA');
	courtMap.set('High Court of Australia', 'HCA');
	courtMap.set('Family Court of Australia', 'FamCA');
	courtMap.set('Australian Information Commissioner', 'AICmr');

	var abbrev = courtMap.get(fullname);
	if (abbrev === undefined) {
		abbrev = fullname;
	}
	return abbrev;
}

/*
 * Adjust some jurisdiction abbreviations
 */
function abbrevJurisdiction(fullname) {
	var jMap = new Map();
	jMap.set('Commonwealth', 'Cth');
	jMap.set('CTH', 'Cth');

	var abbrev = jMap.get(fullname);
	if (abbrev === undefined) {
		abbrev = fullname;
	}
	return abbrev;
}

function scrape(doc, url) {
	var type = detectWeb(doc, url);
	var newItem = new Zotero.Item(type);
	var jurisdiction = abbrevJurisdiction(text(doc, 'li.ribbon-jurisdiction>a>span'));
	if (jurisdiction) {
		// newItem.extra = "jurisdiction: " + jurisdiction;
		newItem.Code = jurisdiction;
	}
	var citation = text(doc, 'li.ribbon-citation>a>span');
	
	if (text(doc, '#ribbon')) {
		if (type == "case") {
			var voliss = text(doc, 'head>title');
			// e.g. C & M [2006] FamCA 212 (20 January 2006)
			newItem.caseName = voliss.replace(/\s?\[.*$/, '');
			newItem.title = newItem.caseName;
			
			var lastParenthesis = voliss.match(/\(([^\)]*)\)$/);
			if (lastParenthesis) {
				newItem.dateDecided = ZU.strToISO(lastParenthesis[1]);
			} else {
				newItem.dateDecided = text(doc, 'li.ribbon-year>a>span');
			}
			newItem.court = abbrevCourt(text(doc, 'li.ribbon-database>a>span'));
			if (citation) {
				var lastNumber = citation.match(/(\d+)$/);
				if (lastNumber) {
					newItem.docketNumber = lastNumber[1];
				}
			}
		}
		if (type == "statute") {
			// title
			newItem.nameOfAct = citation.trim();
			// section
			newItem.section = text(doc, 'li.ribbon-subject>a>span');
			if (newItem.section) newItem.section = newItem.section.replace(/^SECT /, '');
		}
		if (type == "journalArticle") {
			var title = text(doc, 'title');
			var m = title.match(/(.*) --- "([^"]*)"/);
			if (m) {
				newItem.title = m[2];
				var authors = m[1].split(';');
				for (let i=0; i<authors.length; i++) {
					newItem.creators.push(ZU.cleanAuthor(authors[i], 'author', authors[i].includes(',')));
				}
			} else {
				newItem.title = title;
			}
			newItem.publicationTitle = text(doc, 'li.ribbon-database>a>span');
			newItem.date = text(doc, 'li.ribbon-year>a>span');
		}
	} else {
		var voliss = text(doc, 'head>title');
		// e.g. C & M [2006] FamCA 212 (20 January 2006)
		var m = voliss.match(/^([^[]*)\[(\d+)\](.*)\(([^\)]*)\)$/);
		if (m) {
			newItem.title = m[1];
			newItem.dateDecided = ZU.strToISO(m[4]);
			var courtNumber = m[3].trim().split(' ');
			if (courtNumber.length>=2) {
				newItem.court = courtNumber[0];
				newItem.docketNumber = courtNumber[1].replace(/[^\w]*$/, '');
			}
		} else {
			newItem.title = voliss;
		}
	}
	
	newItem.url = url;
	newItem.attachments = [{
		document: doc,
		title: "Snapshot",
		mimeType:"text/html"
	}];
	newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www7.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/FamCA/2006/212.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "C & M",
				"creators": [],
				"dateDecided": "2006-01-20",
				"court": "FamCA",
				"docketNumber": "212",
				"Code": "Cth",
				"url": "http://www7.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/FamCA/2006/212.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www8.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/FCA/2010/1.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "Yeo, in the matter of AES Services (Aust) Pty Ltd (ACN 111 306 543) (Administrators Appointed)",
				"creators": [],
				"dateDecided": "2010-01-05",
				"court": "FCA",
				"docketNumber": "1",
				"Code": "Cth",
				"url": "http://www8.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/FCA/2010/1.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.nzlii.org/nz/cases/NZSC/2008/1.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "Bronwyn Estate Ltd and ors v Gareth Hoole and others",
				"creators": [],
				"dateDecided": "2008-02-08",
				"court": "NZSC",
				"docketNumber": "1",
				"url": "http://www.nzlii.org/nz/cases/NZSC/2008/1.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www8.austlii.edu.au/cgi-bin/viewtoc/au/cases/act/ACTSC/2010/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www8.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/AICmr/2017/134.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "'NM' and Department of Human Services (Freedom of information)",
				"creators": [],
				"dateDecided": "2017-12-08",
				"court": "AICmr",
				"docketNumber": "134",
				"Code": "Cth",
				"url": "http://www8.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/AICmr/2017/134.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www8.austlii.edu.au/cgi-bin/viewdoc/au/legis/cth/consol_act/foia1982222/s24ab.html",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Freedom of Information Act 1982",
				"creators": [],
				"Code": "Cth",
				"section": "24AB",
				"url": "http://www8.austlii.edu.au/cgi-bin/viewdoc/au/legis/cth/consol_act/foia1982222/s24ab.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www8.austlii.edu.au/cgi-bin/viewdb/au/legis/cth/consol_act/foia1982222/",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Freedom of Information Act 1982",
				"creators": [],
				"Code": "Cth",
				"url": "http://www8.austlii.edu.au/cgi-bin/viewdb/au/legis/cth/consol_act/foia1982222/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www9.austlii.edu.au/cgi-bin/viewdoc/au/journals/AdminRw//2010/9.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Statements of the Decision Maker's Actual Reasons",
				"creators": [
					{
						"firstName": "Stephen",
						"lastName": "Lloyd",
						"creatorType": "author"
					},
					{
						"firstName": "Donald",
						"lastName": "Mitchell",
						"creatorType": "author"
					}
				],
				"date": "2010",
				"libraryCatalog": "AustLII and NZLII",
				"publicationTitle": "Administrative Review Council - Admin Review",
				"url": "http://www9.austlii.edu.au/cgi-bin/viewdoc/au/journals/AdminRw//2010/9.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www7.austlii.edu.au/cgi-bin/sinosrch.cgi?mask_path=;method=auto;query=adam%20smith;view=relevance&mask_path=au/cases/act/ACTCA",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www8.austlii.edu.au/cgi-bin/sinodisp/au/cases/cth/AICmr/2017/20.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "Cash World Gold Buyers Pty Ltd and Australian Taxation Office (Freedom of information)",
				"creators": [],
				"dateDecided": "2017-03-10",
				"court": "AICmr",
				"docketNumber": "20",
				"url": "http://www8.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/AICmr/2017/20.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
