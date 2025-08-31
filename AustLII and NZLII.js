{
	"translatorID": "5ed5ab01-899f-4a3b-a74c-290fb2a1c9a4",
	"label": "AustLII and NZLII",
	"creator": "Justin Warren, Philipp Zumstein",
	"target": "^https?://(www\\d?|classic)\\.(austlii\\.edu\\.au|nzlii\\.org)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-11-21 18:54:11"
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

function detectWeb(doc, url) {
	var classes = attr(doc, 'body', 'class');

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
	if (url.includes('classic.austlii.edu.au') && url.includes('.html')) {
		return "case";
	}
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('#page-main ul>li>a');
	for (let i = 0; i < rows.length; i++) {
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


async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			scrape(await requestDocument(url), url);
		}
	}
	else if (new URL(url).hostname === 'classic.austlii.edu.au') {
		let urlObj = new URL(url);
		urlObj.hostname = 'www.austlii.edu.au';
		url = urlObj.toString();
		scrape(await requestDocument(url), url);
	}
	else {
		scrape(doc, url);
	}
}

/*
 * Adjust some jurisdiction abbreviations
 */
var jurisdictionAbbrev = {
	"Commonwealth": "Cth",
	"CTH": "Cth",
	"Australian Capital Territory": "ACT",
	"New South Wales": "NSW",
	"Northern Territory": "NT",
	"Queensland": "Qld",
	"QLD": "Qld",
	"South Australia": "SA",
	"Tasmania": "Tas",
	"TAS": "Tas",
	"Victoria": "Vic",
	"VIC": "Vic",
	"Western Australia": "WA"
};

/*
 * ZU.capitalizeTitle doesn't cope with Act Names (With Parenthetical Names) Acts
 * so we give it a bit of help.
 */
function capitalizeWithPunctuation(string) {
	const actNameDelimRegex = /( \(|\) )/;
	var words = string.split(actNameDelimRegex);

	var newString = "";
	var lastWordIndex = words.length - 1;
	for (var i = 0; i <= lastWordIndex; i++) {
		if (actNameDelimRegex.test(words[i])) {
			newString += words[i];
		}
		else {
			newString += ZU.capitalizeTitle(words[i].toLowerCase(), true);
		}
	}
	return newString;
}

/*
 * AustLII includes the date on the end of all Acts
 */
function parseActName(nameOfAct) {
	// Split at the last space before the year
	const parsed = nameOfAct.split(/\s(\d{4})/);
	// Zotero.debug(parsed);
	let actName = parsed[0], actYear = parsed[1];
	actName = capitalizeWithPunctuation(actName);
	return { actName, actYear };
}

function scrape(doc, url) {
	var type = detectWeb(doc, url);
	var newItem = new Zotero.Item(type);
	var fullJurisdiction = text(doc, 'li.ribbon-jurisdiction > a > span');
	var jurisdiction = jurisdictionAbbrev[fullJurisdiction] || fullJurisdiction;
	if (jurisdiction && ZU.fieldIsValidForType('code', type)) {
		newItem.code = jurisdiction;
	}
	var citation = text(doc, 'li.ribbon-citation>a>span');
	var voliss;
	var m;

	if (text(doc, '#ribbon')) {
		if (type == "case") {
			voliss = text(doc, 'head>title');
			// e.g. C & M [2006] FamCA 212 (20 January 2006)
			newItem.caseName = voliss.replace(/\s?\[.*$/, '');
			newItem.title = newItem.caseName;

			var lastParenthesis = voliss.match(/\(([^)]*)\)$/);
			if (lastParenthesis) {
				newItem.dateDecided = ZU.strToISO(lastParenthesis[1]);
			}
			else {
				newItem.dateDecided = text(doc, 'li.ribbon-year>a>span');
			}
			var courtAbbrevInURL = url.match(/\/cases\/[^/]+\/([^/]+)\//);
			if (courtAbbrevInURL) {
				newItem.court = decodeURIComponent(courtAbbrevInURL[1]);
			}
			else {
				// Full court name
				newItem.court = text(doc, 'li.ribbon-database > a > span');
			}
			if (citation) {
				var lastNumber = citation.match(/(\d+)$/);
				if (lastNumber) {
					newItem.docketNumber = lastNumber[1];
				}
			}
		}
		if (type == "statute") {
			// All AustLII Act titles end in the year the Act was passed
			const actInfo = parseActName(citation);
			newItem.nameOfAct = actInfo.actName;
			newItem.dateEnacted = actInfo.actYear;
			// section
			newItem.section = text(doc, 'li.ribbon-subject>a>span');
			if (newItem.section) newItem.section = newItem.section.replace(/^SECT /, '');
		}
		if (type == "journalArticle") {
			var title = text(doc, 'title');
			m = title.match(/(.*) --- "([^"]*)"/);
			if (m) {
				newItem.title = m[2];
				var authors = m[1].split(';');
				for (let i = 0; i < authors.length; i++) {
					newItem.creators.push(ZU.cleanAuthor(authors[i], 'author', authors[i].includes(',')));
				}
			}
			else {
				newItem.title = title;
			}
			newItem.publicationTitle = text(doc, 'li.ribbon-database>a>span');
			newItem.date = text(doc, 'li.ribbon-year>a>span');
		}
	}
	else {
		voliss = text(doc, 'head>title');
		// e.g. C & M [2006] FamCA 212 (20 January 2006)
		m = voliss.match(/^([^[]*)\[(\d+)\](.*)\(([^)]*)\)$/);
		if (m) {
			newItem.title = m[1];
			newItem.dateDecided = ZU.strToISO(m[4]);
			var courtNumber = m[3].trim().split(' ');
			if (courtNumber.length >= 2) {
				newItem.court = courtNumber[0];
				newItem.docketNumber = courtNumber[1].replace(/[^\w]*$/, '');
			}
		}
		else {
			newItem.title = voliss;
		}
	}

	newItem.url = url
		.replace(/^http:\/\//, 'https://')
		.replace(/^(https:\/\/www)\d/, '$1');
	newItem.attachments = [{
		document: doc,
		title: "Snapshot",
		mimeType: "text/html"
	}];
	newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/FamCA/2006/212.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "C & M",
				"creators": [],
				"dateDecided": "2006-01-20",
				"court": "FamCA",
				"docketNumber": "212",
				"url": "https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/FamCA/2006/212.html",
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
		"url": "http://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/FCA/2010/1.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "Yeo, in the matter of AES Services (Aust) Pty Ltd (ACN 111 306 543) (Administrators Appointed)",
				"creators": [],
				"dateDecided": "2010-01-05",
				"court": "FCA",
				"docketNumber": "1",
				"url": "https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/FCA/2010/1.html",
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
				"url": "https://www.nzlii.org/nz/cases/NZSC/2008/1.html",
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
		"url": "http://www.austlii.edu.au/cgi-bin/viewtoc/au/cases/act/ACTSC/2010/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/AICmr/2017/134.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "'NM' and Department of Human Services (Freedom of information)",
				"creators": [],
				"dateDecided": "2017-12-08",
				"court": "AICmr",
				"docketNumber": "134",
				"url": "https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/AICmr/2017/134.html",
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
		"url": "http://www.austlii.edu.au/cgi-bin/viewdoc/au/legis/cth/consol_act/foia1982222/s24ab.html",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Freedom of Information Act",
				"creators": [],
				"dateEnacted": "1982",
				"code": "Cth",
				"section": "24AB",
				"url": "https://www.austlii.edu.au/cgi-bin/viewdoc/au/legis/cth/consol_act/foia1982222/s24ab.html",
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
		"url": "http://www.austlii.edu.au/cgi-bin/viewdb/au/legis/cth/consol_act/foia1982222/",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Freedom of Information Act",
				"creators": [],
				"dateEnacted": "1982",
				"code": "Cth",
				"url": "https://www.austlii.edu.au/cgi-bin/viewdb/au/legis/cth/consol_act/foia1982222/",
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
		"url": "https://www.austlii.edu.au/cgi-bin/viewdb/au/legis/cth/consol_act/antsasta1999402/",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "A New Tax System (Goods and Services Tax) Act",
				"creators": [],
				"dateEnacted": "1999",
				"code": "Cth",
				"url": "https://www.austlii.edu.au/cgi-bin/viewdb/au/legis/cth/consol_act/antsasta1999402/",
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
		"url": "https://www.austlii.edu.au/cgi-bin/viewdb/au/legis/cth/consol_act/caca2010265/",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Competition and Consumer Act",
				"creators": [],
				"dateEnacted": "2010",
				"code": "Cth",
				"url": "https://www.austlii.edu.au/cgi-bin/viewdb/au/legis/cth/consol_act/caca2010265/",
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
		"url": "http://www.austlii.edu.au/cgi-bin/viewdoc/au/journals/AdminRw//2010/9.html",
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
				"url": "https://www.austlii.edu.au/cgi-bin/viewdoc/au/journals/AdminRw//2010/9.html",
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
		"url": "http://www.austlii.edu.au/cgi-bin/sinosrch.cgi?mask_path=;method=auto;query=adam%20smith;view=relevance&mask_path=au/cases/act/ACTCA",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www6.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/AICmr/2017/20.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "Cash World Gold Buyers Pty Ltd and Australian Taxation Office (Freedom of information)",
				"creators": [],
				"dateDecided": "2017-03-10",
				"court": "AICmr",
				"docketNumber": "20",
				"url": "https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/AICmr/2017/20.html",
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
		"url": "https://www.austlii.edu.au/cgi-bin/viewdb/au/legis/qld/consol_act/pla1974179/",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Property Law Act",
				"creators": [],
				"dateEnacted": "1974",
				"code": "Qld",
				"url": "https://www.austlii.edu.au/cgi-bin/viewdb/au/legis/qld/consol_act/pla1974179/",
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
		"url": "https://www.austlii.edu.au/cgi-bin/viewdb/au/legis/vic/consol_act/ca195882/",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Crimes Act",
				"creators": [],
				"dateEnacted": "1958",
				"code": "Vic",
				"url": "https://www.austlii.edu.au/cgi-bin/viewdb/au/legis/vic/consol_act/ca195882/",
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
		"url": "https://www.austlii.edu.au/cgi-bin/viewdb/au/legis/nsw/consol_act/leara2002451/",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Law Enforcement (Powers and Responsibilities) Act",
				"creators": [],
				"dateEnacted": "2002",
				"code": "NSW",
				"url": "https://www.austlii.edu.au/cgi-bin/viewdb/au/legis/nsw/consol_act/leara2002451/",
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
		"url": "https://www8.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/FedCFamC1A/2024/214.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "Dimitrova & Carman",
				"creators": [],
				"dateDecided": "2024-11-15",
				"court": "FedCFamC1A",
				"docketNumber": "214",
				"url": "https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/FedCFamC1A/2024/214.html",
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
