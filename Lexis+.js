{
	"translatorID": "419638d9-9049-44ad-ba08-fa54ed24b5e6",
	"label": "Lexis+",
	"creator": "Brandon F",
	"target": "^https://plus.lexis.*/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-04-07 14:01:13"
}

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2022 YOUR_NAME <- TODO

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
	if (doc.title.match(/.*results.*/)) {
    Zotero.debug("multiple");
		return "multiple";
	}
	else if (doc.title.match(/[a-zA-Z\. ]+\s§\s\d+/) ||
			 doc.title.match(/[aA][cC][tT]/) ||
			 doc.title.match(/[pP]\.[lL]\./)) // Match: ... Tex. Bus. & Com. Code § 26.01 ...
	{
		return "statute";
	}
	else if (doc.title.match(/\d+\s[a-zA-Z0-9\. ]+\s\d+/)) // Match: ... 5 U.S. 137 ... 
	{
		return "case";
	}
	// TODO secondary sources

  return false;
}

function getSearchResults(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	if (prefix == "x" ) return namespace; else return null;
	} : null;

	var casesOrStatutes = new Array();
	var items = new Object();
	var nextTitle; 

	if (detectWeb(doc, url) == "multiple") {
		// TODO check what type of element it is (currently only working for 'cases' searches)
		var titles = ZU.xpath(doc, '//a[@class="titleLink"]', nsResolver);
		var dates = ZU.xpath(doc, '(//span[contains(@class,"metaDataItem")])', nsResolver);
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
      dateOffset += 3;
			// dates[2] is a citation

      return items;
		}
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
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function([prefix]) {
	if (prefix == "x" ) return namespace; else return null;
	} : null;

	if (detectWeb(doc, url) == "case")
	{
		var newCase = new Zotero.Item("case");
		newCase.url = doc.location.href;
		
		newCase.title = text(doc, 'h1#SS_DocumentTitle');

		var xPathofCitation = ZU.xpath(doc, '//span[@class="active-reporter"]');
		var citation = xPathofCitation[0].textContent;
		newCase.reporterVolume = citation.substring(0, citation.indexOf(' '));
		newCase.reporter = citation.substring(citation.indexOf(' ') + 1, citation.lastIndexOf(' '));
		newCase.firstPage = citation.substring(citation.lastIndexOf(' ') + 1);

		var xPathofCourt = ZU.xpath(doc, '(//p[@class="SS_DocumentInfo"])[1]', nsResolver);
		newCase.court = xPathofCourt[0].textContent;

		var xPathofDate = ZU.xpath(doc, '//span[@class="date"]', nsResolver);
		newCase.dateDecided = xPathofDate[0].textContent;

		newCase.complete();
	}
	else if (detectWeb(doc, url) == "statute")
	{
		var newStatute = new Zotero.Item("statute");
		newStatute.url = doc.location.href;

		var xPathofTitle = ZU.xpath(doc, '//h1[@id="SS_DocumentTitle"]', nsResolver);
		var title = xPathofTitle[0].textContent;
		newStatute.title = title;

		var xPathofInfo = ZU.xpath(doc, '//p[@class="SS_DocumentInfo"]', nsResolver);
		var info = xPathofInfo[0].textContent;

		isolation = info.substring(info.search(
			/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/
		)) // isolate date on the frontend
		newStatute.dateEnacted = isolation.substring(0, isolation.search(/[1-2][0-9][0-9][0-9]/) + 4);

		if (title.match(/[Aa][cC][tT]/) ||
			title.match(/[Oo][Ff]\s[1-2][0-9][0-9][0-9]/)) // session law, not codified statute
		{
			// BB 21st ed. requires parallel cite to Pub. L. No. and Stat. for session laws
			var statutesAtLarge, publicLawNo;
			var xPathofActiveReporter = ZU.xpath(doc, '//a[@class="SS_ActiveRptr"]', nsResolver);
			if (xPathofActiveReporter.length > 0) // Sometimes Lexis is weird and doesn't give an ActiveRptr
			{
        var potentialReporter = xPathofActiveReporter[0];
        Zotero.debug(potentialReporter.textContent);
				if (potentialReporter.textContent.match(/[sS]tat\./))
					statutesAtLarge = potentialReporter.textContent;
				else if (potentialReporter.textContent.match(/[pP]ub\./) ||
						 potentialReporter.textContent.match(/[pP]\.[lL]\./))
					publicLawNo = potentialReporter.textContent;
			}

			var xPathofNonPaginatedReporter = ZU.xpath(doc, '//span[@class="SS_NonPaginatedRptr"]', nsResolver);
			
			for (var i = 0; i < xPathofNonPaginatedReporter.length; i++)
			{
        var nextReporter = xPathofNonPaginatedReporter[i].textContent;
				if (nextReporter.match(/[sS]tat\./))
					statutesAtLarge = nextReporter;
				else if (nextReporter.match(/[pP]ub\./) ||
						 nextReporter.match(/[pP]\.[lL]\./))
					publicLawNo = nextReporter;
			}

			// Turn publicLawNo into the public law fields
			if (publicLawNo.match(/\d+-\d+/)) // Ex. P.L. 115-164
			{
				var numPos = publicLawNo.search(/\d+-\d+/)
				newStatute.publicLawNumber = publicLawNo.substring(
					numPos,
					publicLawNo.substring(numPos + 1).indexOf(' ')); // Gets 115-164

				newStatute.session = newStatute.publicLawNumber.substring(0, newStatute.publicLawNumber.indexOf('-'));
			}
			else // Ex. 115 P.L. 164 or 115 Pub. L. No. 164
			{
				newStatute.session = publicLawNo.substring(0, publicLawNo.indexOf(' '));
				newStatute.publicLawNumber = newStatute.session + '-' + publicLawNo.substring(publicLawNo.lastIndexOf(' ') + 1);
			}

			// Turn statutesAtLarge into the code#/code/section fields
			// TODO in styles, check for "Stat." as the code, and if so, don't append a section symbol
			newStatute.codeNumber = statutesAtLarge.substring(0, statutesAtLarge.indexOf(' '));
			newStatute.code = "Stat.";
			newStatute.section = statutesAtLarge.substring(statutesAtLarge.lastIndexOf(' ') + 1);
		}
		else
		{
			if (title.match(/^\d+/)) // Starts with digit, organized by title, ex. 47 U.S.C.S. § 230
			{
				newStatute.codeNumber = title.substring(0, title.indexOf(' '));
				var isolation = title.substring(title.indexOf(' '), title.lastIndexOf(' ')); // isolate code and section symbol
				newStatute.code = isolation.substring(0, isolation.lastIndexOf(' '));
				newStatute.section = title.substring(title.lastIndexOf(' ') + 1);
			}
			else // Starts with letter, organized by code, ex. Tex. Bus. & Com. Code § 26.01
			{
				newStatute.code = title.substring(0, title.lastIndexOf('§') - 1);
				newStatute.section = title.substring(title.lastIndexOf(' ') + 1);
			}

			var isolation = info.substring(info.search(/\d+-\d+/)); // isolate public law number on the frontend
			newStatute.publicLawNumber = isolation.substring(0, isolation.indexOf(' ')).replace(/(^,)|(,$)/g, ''); 
			newStatute.session = newStatute.publicLawNumber.substring(0, newStatute.publicLawNumber.indexOf('-'));
		}

		newStatute.extra = info; // Since the info section is all over the place, just dump the whole thing in for manual cite checks

		newStatute.complete();
	}
}


/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
