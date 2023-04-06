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
	"lastUpdated": "2023-04-06 21:58:14"
}

function scrape(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	if (prefix == "x" ) return namespace; else return null;
	} : null;

	if (detectWeb(doc, url) == "case")
	{
		var newCase = new Zotero.Item("case");
		newCase.url = doc.location.href;
		
		var xPathofTitle = doc.evaluate('//h1[@id="SS_DocumentTitle"]',
									 doc, nsResolver, XPathResult.ANY_TYPE, null);
		newCase.title = xPathofTitle.iterateNext().textContent;

		var xPathofCitation = doc.evaluate('//span[@class="active-reporter"]',
										   doc, nsResolver, XPathResult.ANY_TYPE, null);
		var citation = xPathofCitation.iterateNext().textContent;
		newCase.reporterVolume = citation.substring(0, citation.indexOf(' '));
		newCase.reporter = citation.substring(citation.indexOf(' ') + 1, citation.lastIndexOf(' '));
		newCase.firstPage = citation.substring(citation.lastIndexOf(' ') + 1);

		var xPathofCourt = doc.evaluate('(//p[@class="SS_DocumentInfo"])[1]',
										doc, nsResolver, XPathResult.ANY_TYPE, null);
		newCase.court = xPathofCourt.iterateNext().textContent;

		var xPathofDate = doc.evaluate('//span[@class="date"]',
									   doc, nsResolver, XPathResult.ANY_TYPE, null);
		newCase.dateDecided = xPathofDate.iterateNext().textContent;

		newCase.complete();
	}
	else if (detectWeb(doc, url) == "statute")
	{
		var newStatute = new Zotero.Item("statute");
		newStatute.url = doc.location.href;

		var xPathofTitle = doc.evaluate('//h1[@id="SS_DocumentTitle"]',
									 doc, nsResolver, XPathResult.ANY_TYPE, null);
		var title = xPathofTitle.iterateNext().textContent;
		newStatute.title = title;

		var xPathofInfo = doc.evaluate('//p[@class="SS_DocumentInfo"]',
										doc, nsResolver, XPathResult.ANY_TYPE, null);
		var info = xPathofInfo.iterateNext().textContent;

		isolation = info.substring(info.search(
			/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/
		)) // isolate date on the frontend
		newStatute.dateEnacted = isolation.substring(0, isolation.search(/[1-2][0-9][0-9][0-9]/) + 4);

		if (title.match(/[Aa][cC][tT]/) ||
			title.match(/[Oo][Ff]\s[1-2][0-9][0-9][0-9]/)) // session law, not codified statute
		{
			// BB 21st ed. requires parallel cite to Pub. L. No. and Stat. for session laws
			var statutesAtLarge, publicLawNo;
			var xPathofActiveReporter = doc.evaluate('//a[@class="SS_ActiveRptr"]',
									 				 doc, nsResolver, XPathResult.ANY_TYPE, null);
			var potentialReporter = xPathofActiveReporter.iterateNext();
			if (potentialReporter) // Sometimes Lexis is weird and doesn't give an ActiveRptr
			{
				if (potentialReporter.textContent.match(/[sS]tat\./))
					statutesAtLarge = potentialReporter.textContent;
				else if (potentialReporter.textContent.match(/[pP]ub\./) ||
						 potentialReporter.textContent.match(/[pP]\.[lL]\./))
					publicLawNo = potentialReporter.textContent;
			}

			var xPathofNonPaginatedReporter = doc.evaluate('//span[@class="SS_NonPaginatedRptr"]',
									 					   doc, nsResolver, XPathResult.ANY_TYPE, null);
			var nextReporter;
			while (nextReporter = xPathofNonPaginatedReporter.iterateNext())
			{
				if (nextReporter.textContent.match(/[sS]tat\./))
					statutesAtLarge = nextReporter.textContent;
				else if (nextReporter.textContent.match(/[pP]ub\./) ||
						 nextReporter.textContent.match(/[pP]\.[lL]\./))
					publicLawNo = nextReporter.textContent;
			}

			// Turn publicLawNo into the public law fields
			if (publicLawNo.match(/\d+-\d+/)) // Ex. P.L. 115-164
			{
				var numPos = publicLawNo.search(/\d+-\d+/)
				newStatute.publicLawNumber = publicLawNo.substring(
					numPos,
					publiclawNo.substring(numPos + 1).indexOf(' ')); // Gets 115-164

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

function detectWeb(doc, url) {
	if (doc.title.match(/.*results.*/)) {
		return "multiple"
	}
	else if (doc.title.match(/[a-zA-Z\. ]+\s§\s\d+/) ||
			 doc.title.match(/[aA][cC][tT]/) ||
			 doc.title.match(/[pP]\.[lL]\./)) // Match: ... Tex. Bus. & Com. Code § 26.01 ...
	{
		return "statute"
	}
	else if (doc.title.match(/\d+\s[a-zA-Z0-9\. ]+\s\d+/)) // Match: ... 5 U.S. 137 ... 
	{
		return "case"
	}
	// TODO secondary sources
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	if (prefix == "x" ) return namespace; else return null;
	} : null;

	var casesOrStatutes = new Array();
	var items = new Object();
	var nextTitle;

	if (detectWeb(doc, url) == "multiple") {
		// TODO check what type of element it is (currently only working for 'cases' searches)
		var titles = doc.evaluate('(//a[@class="titleLink"])',
								  doc, nsResolver, XPathResult.ANY_TYPE, null);
		var dates = doc.evaluate('(//span[contains(@class,"metaDataItem")])',
								 doc, nsResolver, XPathResult.ANY_TYPE, null)
		var nextDate;
		dates.iterateNext(); // First court name
		nextDate = dates.iterateNext(); // First date is [2]
		dates.iterateNext(); // First citation

		while (nextTitle = titles.iterateNext()) {
			items[nextTitle.href] = nextTitle.textContent + "(" + nextDate.textContent + ")";
			
			dates.iterateNext(); // Court name
			nextDate = dates.iterateNext(); // Every 3 items is a date
			dates.iterateNext(); // Citation
		}

		items = Zotero.selectItems(items);
		for(var i in items) {
			casesOrStatutes.push(i);
		}
	}
	else
	{
		casesOrStatutes = [url]
	}

	Zotero.Utilities.processDocuments(casesOrStatutes, scrape, function(){Zotero.done();});
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
