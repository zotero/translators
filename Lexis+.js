{
	"translatorID": "419638d9-9049-44ad-ba08-fa54ed24b5e6",
	"label": "Lexis+",
	"creator": "bfahrenfort",
	"target": "^https://plus.lexis.*/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-04-07 21:55:44"
}

/*
  ***** BEGIN LICENSE BLOCK *****

  Copyright © 2023 Brandon Fahrenfort

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

function detectWeb(doc, _url) {
	if (doc.title.match(/.*results.*/)) {
		return "multiple";
	}
	else if (doc.title.match(/[a-zA-Z. ]+\s§\s\d+/)
	|| doc.title.match(/act/i)
	|| doc.title.match(/p\.l\./i)) { // Match: ... Tex. Bus. & Com. Code § 26.01 ...
		return "statute";
	}
	else if (doc.title.match(/\d+\s[a-zA-Z0-9. ]+\s\d+/)) { // Match: ... 5 U.S. 137 ...
		return "case";
	}
	// TODO secondary sources

	return false;
}

function getSearchResults(doc, url) {
	var items = {};
	var nextTitle;

	if (detectWeb(doc, url) == "multiple") {
		// TODO check what type of element it is (currently only working for 'cases' searches)
		var titles = doc.querySelectorAll('a.titleLink');
		var dates = doc.querySelectorAll('span.metaDataItem'); // Not technically only dates, but that's all I use it for atm
		var nextDate;
		var dateOffset = 1;
	
		// dates[0] is first court name
		nextDate = dates[dateOffset];
		dateOffset += 3;
		// dates[2] is first citation
		for (var i = 0; i < titles.length; i++) {
			nextTitle = titles[i];
			items[nextTitle.href] = nextTitle.textContent + "(" + nextDate.textContent + ")";

			// dates[0] is court name
			nextDate = dates[dateOffset];

			// dates[2] is a citation
		}

		return items;
	}

	return false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, url));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url) {
	if (detectWeb(doc, url) == "case") {
		var newCase = new Zotero.Item("case");
		newCase.url = doc.location.href;

		newCase.title = text(doc, 'h1#SS_DocumentTitle');

		var citation = text(doc, 'span.active-reporter');
		newCase.reporterVolume = citation.substring(0, citation.indexOf(' '));
		newCase.reporter = citation.substring(citation.indexOf(' ') + 1, citation.lastIndexOf(' '));
		newCase.firstPage = citation.substring(citation.lastIndexOf(' ') + 1);

		newCase.court = text(doc, 'p.SS_DocumentInfo', 0);

		newCase.dateDecided = text(doc, 'span.date');

		var docket = text(doc, 'p.SS_DocumentInfo', 2);
		if (docket.match(/^no\./i)
		|| docket.match(/^\d+/)
		|| docket.match(/^case no\./i)) {
			newCase.docketNumber = docket; // This won't be in perfect cite form, shouldn't be a hassle unless you're citing dozens of memorandum opinions
		}

		newCase.complete();
	}
	else if (detectWeb(doc, url) == "statute") {
		var newStatute = new Zotero.Item("statute");
		newStatute.url = doc.location.href;

		var title = text(doc, 'h1#SS_DocumentTitle'); // Saves some lines to have a temp here
		newStatute.title = title;

		var info = text(doc, 'p.SS_DocumentInfo');

		var isolation = info.substring(info.search(
			/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/i
		)); // isolate date on the frontend
		newStatute.dateEnacted = isolation.substring(0, isolation.search(/[1-2][0-9][0-9][0-9]/) + 4);

		if (title.match(/act/i)
		|| title.match(/of\s[1-2][0-9][0-9][0-9]/i)) { // Session law, not codified statute
			// BB 21st ed. requires parallel cite to Pub. L. No. and Stat. for session laws
			var statutesAtLarge, publicLawNo;
			var potentialReporter = text(doc, 'a.SS_ActiveRptr');
			if (potentialReporter) { // Sometimes Lexis is weird and doesn't give an ActiveRptr
				if (potentialReporter.textContent.match(/stat\./i)) statutesAtLarge = potentialReporter.textContent;
				else if (potentialReporter.textContent.match(/pub\./i)
				|| potentialReporter.textContent.match(/p\.l\./i)) {
					publicLawNo = potentialReporter.textContent;
				}
			}

			var otherReporters = doc.querySelectorAll('span.SS_NonPaginatedRptr');

			for (var i = 0; i < otherReporters.length; i++) {
				var nextReporter = otherReporters[i].textContent;
				if (nextReporter.match(/stat\./i)) statutesAtLarge = nextReporter;
				else if (nextReporter.match(/pub\./i)
				|| nextReporter.match(/p\.l\./i)) {
					publicLawNo = nextReporter;
				}
			}

			// Turn publicLawNo into the public law fields
			if (publicLawNo.match(/\d+-\d+/)) { // Ex. P.L. 115-164
				var numPos = publicLawNo.search(/\d+-\d+/);
				newStatute.publicLawNumber = publicLawNo.substring(numPos, publicLawNo.substring(numPos + 1).indexOf(' ')); // Gets 115-164

				newStatute.session = newStatute.publicLawNumber.substring(0, newStatute.publicLawNumber.indexOf('-'));
			}
			else { // Ex. 115 P.L. 164 or 115 Pub. L. No. 164
				newStatute.session = publicLawNo.substring(0, publicLawNo.indexOf(' '));
				newStatute.publicLawNumber = newStatute.session + '-' + publicLawNo.substring(publicLawNo.lastIndexOf(' ') + 1);
			}

			// Turn statutesAtLarge into the code#/code/section fields
			// TODO in styles, check for "Stat." as the code, and if so, don't append a section symbol
			newStatute.codeNumber = statutesAtLarge.substring(0, statutesAtLarge.indexOf(' '));
			newStatute.code = "Stat.";
			newStatute.section = statutesAtLarge.substring(statutesAtLarge.lastIndexOf(' ') + 1);
		}
		else { // Codified statute
			if (title.match(/^\d+/)) { // Starts with digit, organized by title, ex. 47 U.S.C.S. § 230
				// Sadly, named groups aren't working
				let groups = title.match(/^(\d+)\s([a-zA-Z0-9. ]+) § ([0-9.()a-zA-Z]+)/);
				newStatute.codeNumber = groups[1];
				newStatute.code = groups[2];
				newStatute.section = groups[3];
			}
			else { // Starts with letter, organized by code, ex. Tex. Bus. & Com. Code § 26.01
				let groups = title.match(/^([a-zA-Z&. ]+) § ([0-9.()a-zA-Z]+)/);
				newStatute.code = groups[1];
				newStatute.section = groups[2];
			}

			// No way to tell which will be present
			var pL = info.match(/p\.l\. (\d+-\d+)/i);
			var pubLaw = info.match(/pub\. law (\d+-\d+)/i);
			var pubLawNo = info.match(/pub\. law no\. (\d+-\d+)/i);
			var publicLaw = info.match(/public law (\d+-\d+)/i);
			publicLawNo = info.match(/public law no\. (\d+-\d+)/i);
			var publicLawNumber = info.match(/public law number (\d+-\d+)/i);
			if (pL) newStatute.publicLawNumber = pL[1];
			if (pubLaw) newStatute.publicLawNumber = pubLaw[1];
			if (pubLawNo) newStatute.publicLawNumber = pubLawNo[1];
			if (publicLaw) newStatute.publicLawNumber = publicLaw[1];
			if (publicLawNo) newStatute.publicLawNumber = publicLawNo[1];
			if (publicLawNumber) newStatute.publicLawNumber = publicLawNumber[1];

			if (newStatute.publicLawNumber) newStatute.session = newStatute.publicLawNumber.substring(0, newStatute.publicLawNumber.indexOf('-'));
		}

		newStatute.extra = info; // Since the info section is all over the place, just dump the whole thing in for manual cite checks

		newStatute.complete();
	}
}


/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
