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
	"lastUpdated": "2023-04-09 22:52:49"
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
	var title = text(doc, 'h1#SS_DocumentTitle');

	if (detectWeb(doc, url) == "case") {
		var newCase = new Zotero.Item("case");
		//newCase.url = doc.location.href; // Disabled for style reasons

		newCase.title = title;

		newCase.notes.push({note: "Snapshot: " + newCase.title + doc.getElementById('document-content').innerHTML});

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

		//newStatute.url = doc.location.href; // Disabled for style reasons

		var title = text(doc, 'h1#SS_DocumentTitle');
		newStatute.title = title;

		newStatute.notes.push({note: "Snapshot: " + newStatute.title + doc.getElementById('document-content').innerHTML});

		var info = text(doc, 'p.SS_DocumentInfo');

		var isolation = info.substring(info.search(
			/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/i
		)); // isolate date on the frontend
		newStatute.dateEnacted = isolation.substring(0, isolation.search(/[1-2][0-9][0-9][0-9]/) + 4);

		if (title.match(/act/i)
		|| title.match(/of\s[1-2][0-9][0-9][0-9]/i)) { // Session law, or act, not codified statute
			// BB 21st ed. requires parallel cite to Pub. L. No. and Stat. for session laws

			// Title formatting
			// TODO ZU's capitalizer is good, but doesn't work with closed-up abbreviations like P.L. or U.S.
			//  This could break titles in future. I do remove P.L. below though.
			if (title === title.toUpperCase()) title = ZU.capitalizeTitle(title.toLowerCase(), true); // Some acts are capitalized

			// Remove some unnecessary information
			var cleanedTitle = title;
			var pLCite = title.match(/(\d+ p\.l\. \d+)/i);
			var statCite = title.match(/(\d+ stat\. \d+)/i);
			var enactedCite = title.match(/\d+ enacted [a-zA-Z0-9.]+ \d+/gi);
			var part = title.match(/(part \d+(?: of \d+)?)/i);
			if (pLCite) cleanedTitle = cleanedTitle.replace(pLCite[1], '');
			if (statCite) cleanedTitle = cleanedTitle.replace(statCite[1], '');
			if (part) cleanedTitle = cleanedTitle.replace(part[1], '');
			if (enactedCite) {
				// Remove every enacted cite
				for (var value of Object.values(enactedCite)) {
					cleanedTitle = cleanedTitle.replace(value, '');
				}
			}
			cleanedTitle = cleanedTitle.replace(/(^\s*,)|(,\s*$)/g, ''); // Trim commas and whitespace
			cleanedTitle = cleanedTitle.replace(/(^\s*,)|(,\s*$)/g, ''); // Another one
			Zotero.debug(cleanedTitle);
			if (ZU.trim(cleanedTitle) === "") { // If the title's empty now, put it as the highest precedence citation in the title
				Zotero.debug("ha");
				if (pLCite) cleanedTitle = pLCite[1];
				else if (statCite) cleanedTitle = statCite[1];
				else if (enactedCite) {
					cleanedTitle = enactedCite[0] + " & " + (Object.keys(enactedCite).length - 1) + " more";
				}
			}
			newStatute.title = cleanedTitle;

			// Reporter & citation formatting
			var statutesAtLarge, publicLawNo;
			var potentialReporter = text(doc, 'a.SS_ActiveRptr');
			if (potentialReporter) { // Sometimes Lexis is weird and doesn't give an ActiveRptr
				if (potentialReporter.match(/stat\./i)) statutesAtLarge = potentialReporter;
				else if (potentialReporter.match(/pub\./i)
				|| potentialReporter.match(/p\.l\./i)) {
					publicLawNo = potentialReporter;
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
				var pLNumbers = publicLawNo.match(/(\d+) p\.l\. (\d+)/i);
				newStatute.session = pLNumbers[1];
				newStatute.publicLawNumber = pLNumbers[1] + '-' + pLNumbers[2];
			}

			// Turn statutesAtLarge into the code#/code/section fields
			// TODO in styles, check for "Stat." as the code, and if so, don't append a section symbol
			var statNumbers = statutesAtLarge.match(/(\d+) stat\. (\d+)/i);
			newStatute.codeNumber = statNumbers[1];
			newStatute.code = "Stat.";
			newStatute.section = statNumbers[2];
		}
		else { // Codified statute
			// Title & citation formatting
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

			// Reporter formatting, theoretically unnecessary but nice to have if it's there
			/*
			 * Matches: 
			 * P.L. 117-327
			 * Pub. L. 117-327
			 * Pub. Law 117-327
			 * Pub. L. No. 117-327
			 * Pub. Law No. 117-327
			 * Public Law 117-327
			 * Public Law Number 117-327
			 * Public Law No. 117-327
			 */
			var pL = info.match(/(p\.l\.|pub\. l(?:aw|\.)(?: no\.)?|public law(?: number| no\.)?)\s(\d+-\d+)/i);
			if (pL) newStatute.publicLawNumber = pL[2];

			if (newStatute.publicLawNumber) newStatute.session = newStatute.publicLawNumber.substring(0, newStatute.publicLawNumber.indexOf('-'));
		}

		newStatute.notes.push({note: "Document Info: " + info}); // Since the info section is all over the place, just dump the whole thing in for manual cite checks

		newStatute.complete();
	}
}


/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
