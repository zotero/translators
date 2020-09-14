{
	"translatorID": "84799379-7bc5-4e55-9817-baf297d129fe",
	"label": "CanLII",
	"creator": "Sebastian Karcher",
	"target": "^https?://(www\\.)?canlii\\.org/(en|fr)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-11-25 22:05:12"
}


/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2012 Sebastian Karcher
	
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
// eslint-disable-next-line
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}

var canLiiRegexp = /https?:\/\/(?:www\.)?canlii\.org[^/]*\/(?:en|fr)\/[^/]+\/[^/]+\/doc\/.+/;

function detectWeb(doc, url) {
	if (canLiiRegexp.test(url)) {
		return "case";
	}
	else {
		var aTags = doc.getElementsByTagName("a");
		for (var i = 0; i < aTags.length; i++) {
			if (canLiiRegexp.test(aTags[i].href)) {
				return "multiple";
			}
		}
	}
	return false;
}


function scrape(doc, url) {
	var newItem = new Zotero.Item("case");
	var voliss = doc.getElementsByClassName('documentMeta-citation')[0].nextElementSibling;
	voliss = ZU.trimInternal(
		ZU.xpathText(voliss, './node()[not(self::script)]', null, '') // We technically only use ./text() parts, but this is less confusing
	);
	// e.g. Reference re Secession of Quebec, 1998 CanLII 793 (SCC), [1998] 2 SCR 217, <http://canlii.ca/t/1fqr3>, retrieved on 2019-11-25
	var citationParts = voliss.split(',');
	newItem.caseName = citationParts[0];
	var reporterRegex = /(\[\d\d\d\d\]\s+)?(\d+)\s+([A-Za-z]+)\s+(\d+)/;
	var reporterDetails = voliss.match(reporterRegex);
	if (reporterDetails) {
		newItem.reporterVolume = reporterDetails[2];
		newItem.reporter = reporterDetails[3];
		newItem.firstPage = reporterDetails[4];
	}
	
	newItem.court = text('#breadcrumbs span', 2);
	// get the jurisdiction code, standardizing to legal-resource-registry codes
	var jurisdiction = document.location.pathname.split("/")[2];
	var jurisdiction_codes = {
		"ab": "CA|Alberta",
		"bc": "CA|British Columbia",
		"ca": "Canada|CA",
		"mb": "CA|Manitoba",
		"nb": "CA|New Brunswick",
		"nl": "CA|Newfoundland & Labrador",
		"ns": "CA|Nova Scotia",
		"nt": "CA|Northwest Territories",
		"nu": "CA|Nunavut",
		"on": "CA|Ontario",
		"pe": "CA|Prince Edward Island",
		"qc": "CA|Quebec",
		"sk": "CA|Saskatchewan",
		"yu": "CA|Yukon"
	}
	jurisdiction_code = jurisdiction_codes[jurisdiction];
	newItem.jurisdiction = jurisdiction_code;
	newItem.publisher = "CanLII";
	newItem.dateDecided = ZU.xpathText(doc, '//div[@id="documentMeta"]//div[contains(text(), "Date")]/following-sibling::div');
	newItem.docketNumber = ZU.xpathText(doc, '//div[@id="documentMeta"]//div[contains(text(), "File number") or contains(text(), "Numéro de dossier")]/following-sibling::div');
	if (newItem.docketNumber) {
		newItem.docketNumber = ZU.trimInternal(newItem.docketNumber);
	}
	// get a series of other citations
	var otherCitations = ZU.xpathText(doc, '//div[@id="documentMeta"]//div[contains(text(), "Other citation") or contains(text(), "Autres citation")]/following-sibling::div');
	
	// sometimes an extra citation is hidden in the main citation block, but we can only include one.
	var mainOtherCitation;
	var mainOtherCitationMatch = citationParts[2].match(reporterRegex);
	if (mainOtherCitationMatch){
			mainOtherCitation = mainOtherCitationMatch[0];
		}
	// sometimes the mainOtherCitation doesn't exist, sometimes the otherCitations don't exist, sometimes neither exists, sometimes both exist
	var extraCitations;
	if (mainOtherCitation && otherCitations){
		extraCitations = ZU.trimInternal(mainOtherCitation) + " — " + ZU.trimInternal(otherCitations);
		}
	else if (mainOtherCitation) {
		extraCitations = ZU.trimInternal(mainOtherCitation);
	}
	else if (otherCitations) {
		extraCitations = ZU.trimInternal(otherCitations);
	}
	if (extraCitations) {
		newItem.notes.push({ note: "Other Citations: " + extraCitations});
	}
	
	var shortUrl = doc.getElementsByClassName('documentStaticUrl')[0];
	if (shortUrl) {
		newItem.url = shortUrl.textContent.trim();
	}

	// attach link to pdf version
	// Z.debug(url)
	var pdfurl = url.replace(/\.html(?:[?#].*)?/, ".pdf");
	newItem.attachments.push({
		url: pdfurl,
		title: "CanLII Full Text PDF",
		mimeType: "application/pdf"
	});
	newItem.attachments.push({
		document: doc,
		title: "CanLII Snapshot"
	});
	newItem.complete();
}

function doWeb(doc, url) {
	if (canLiiRegexp.test(url)) {
		scrape(doc, url);
	}
	else {
		var items = ZU.getItemArray(doc, doc, canLiiRegexp);
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.canlii.org/en/ca/scc/doc/2010/2010scc2/2010scc2.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "MiningWatch Canada v. Canada (Fisheries and Oceans)",
				"creators": [],
				"dateDecided": "2010-01-21",
				"court": "Supreme Court of Canada",
				"jurisdiction": "Canada|CA",
				"docketNumber": "32797",
				"reporterVolume": "2010",
				"reporter": "SCC",
				"firstPage": "2",
				"publisher": "CanLII",
				"url": "http://canlii.ca/t/27jmr",
				"attachments": [
					{
						"title": "CanLII Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Other Citations: [2010] 1 SCR 6 — 397 NR 232 — [2010] SCJ No 2 (QL) — [2010] ACS no 2"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.canlii.org/en/ca/fct/doc/2011/2011fc119/2011fc119.html?searchUrlHash=AAAAAQAjU3V0dGllIHYuIENhbmFkYSAoQXR0b3JuZXkgR2VuZXJhbCkAAAAAAQ",
		"items": [
			{
				"itemType": "case",
				"caseName": "Suttie v. Canada (Attorney General)",
				"creators": [],
				"dateDecided": "2011-02-02",
				"court": "Federal Court",
				"jurisdiction": "Canada|CA",
				"docketNumber": "T-1089-10",
				"reporterVolume": "2011",
				"reporter": "FC",
				"firstPage": "119",
				"publisher": "CanLII",
				"url": "http://canlii.ca/t/2flrk",
				"attachments": [
					{
						"title": "CanLII Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot"
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
		"url": "https://www.canlii.org/fr/ca/csc/doc/2010/2010csc2/2010csc2.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "Mines Alerte Canada c. Canada (Pêches et Océans)",
				"creators": [],
				"dateDecided": "2010-01-21",
				"court": "Cour suprême du Canada",
				"jurisdiction": "Canada|CA",
				"docketNumber": "32797",
				"reporterVolume": "2010",
				"reporter": "CSC",
				"firstPage": "2",
				"publisher": "CanLII",
				"url": "http://canlii.ca/t/27jms",
				"attachments": [
					{
						"title": "CanLII Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Other Citations: 397 NR 232 — [2010] SCJ No 2 (QL) — [2010] ACS no 2"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.canlii.org/fr/ca/cfpi/doc/2011/2011cf119/2011cf119.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "Suttie c. Canada (Procureur Général)",
				"creators": [],
				"dateDecided": "2011-02-02",
				"court": "Cour fédérale",
				"jurisdiction": "Canada|CA",
				"docketNumber": "T-1089-10",
				"reporterVolume": "2011",
				"reporter": "CF",
				"firstPage": "119",
				"publisher": "CanLII",
				"docketNumber": "T-1089-10",
				"url": "http://canlii.ca/t/fks9z",
				"attachments": [
					{
						"title": "CanLII Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot"
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
		"url": "https://www.canlii.org/en/bc/bcca/doc/2017/2017bcca398/2017bcca398.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "N.N v. Canada (Attorney General)",
				"creators": [],
				"dateDecided": "2017-11-02",
				"court": "Court of Appeal",
				"jurisdiction": "CA|British Columbia",
				"docketNumber": "CA44142; CA44143",
				"reporterVolume": "2017",
				"reporter": "BCCA",
				"firstPage": "398",
				"url": "http://canlii.ca/t/hnspp",
				"attachments": [
					{
						"title": "CanLII Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot"
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
		"url": "https://www.canlii.org/en/ca/scc/doc/1882/1882canlii29/1882canlii29.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "Theal v. The Queen",
				"creators": [],
				"dateDecided": "1882-12-04",
				"court": "Supreme Court of Canada",
				"jurisdiction": "Canada|CA",
				"reporterVolume": "1882",
				"reporter": "CanLII",
				"firstPage": "29",
				"publisher": "CanLII",
				"url": "http://canlii.ca/t/ggxdg",
				"attachments": [
					{
						"title": "CanLII Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Other Citations: 7 SCR 397"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
