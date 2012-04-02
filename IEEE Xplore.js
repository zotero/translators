{
	"translatorID": "92d4ed84-8d0-4d3c-941f-d4b9124cfbb",
	"label": "IEEE Xplore",
	"creator": "Simon Kornblith, Michael Berkowitz, Bastian Koenings, and Avram Lyon",
	"target": "^https?://[^/]*ieeexplore\\.ieee\\.org[^/]*/(?:[^\\?]+\\?(?:|.*&)arnumber=[0-9]+|search/(?:searchresult.jsp|selected.jsp))",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2012-04-02 00:37:54"
}

function detectWeb(doc, url) {
	var articleRe = /[?&]ar(N|n)umber=([0-9]+)/;
	var m = articleRe.exec(url);

	if (m) {
		return "journalArticle";
	} else {
		return "multiple";
	}

	return false;
}

function doWeb(doc, url) {
	var hostRe = new RegExp("^(https?://[^/]+)/");
	var hostMatch = hostRe.exec(url);

	var articleRe = /[?&]ar(?:N|n)umber=([0-9]+)/;
	var m = articleRe.exec(url);

	if (detectWeb(doc, url) == "multiple") {
		// search page
		var items = new Array();

		var xPathRows = '//ul[@class="Results"]/li[@class="noAbstract"]/div[@class="header"]';
		var tableRows = doc.evaluate(xPathRows, doc, null, XPathResult.ANY_TYPE, null);
		var tableRow;
		while (tableRow = tableRows.iterateNext()) {
			var linknode = doc.evaluate('.//div[@class="detail"]/h3/a', tableRow, null, XPathResult.ANY_TYPE, null).iterateNext();
			if (!linknode) {
				// There are things like tables of contents that don't have item pages, so we'll just skip them
				continue;
			}
			var link = linknode.href;
			var title = "";
			var strongs = tableRow.getElementsByTagName("h3");
			for each(var strong in strongs) {
				if (strong.textContent) {
					title += strong.textContent + " ";
				}
			}

			items[link] = Zotero.Utilities.trimInternal(title);
		}

		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			var urls = new Array();
			for (var i in items) {
				// Some pages don't show the metadata we need (http://forums.zotero.org/discussion/16283)
				// No data: http://ieeexplore.ieee.org/search/srchabstract.jsp?tp=&arnumber=1397982
				// No data: http://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=1397982
				// Data: http://ieeexplore.ieee.org/xpls/abs_all.jsp?arnumber=1397982
				var arnumber = i.match(/arnumber=(\d+)/)[1];
				i = i.replace(/\/(?:search|stamp)\/.*$/, "/xpls/abs_all.jsp?arnumber=" + arnumber);

				urls.push(i);
			}
			Zotero.Utilities.processDocuments(urls, scrape, function () {
				Zotero.done();
			});
			Zotero.wait();
		});

	} else {
		if (url.indexOf("/search/") !== -1 || url.indexOf("/stamp/") !== -1 || url.indexOf("/ielx4/") !== -1 || url.indexOf("/ielx5/") !== -1) {
			// Address the same missing metadata problem as above
			// Also address issue of saving from PDF itself, I hope
			// URL like http://ieeexplore.ieee.org/ielx4/78/2655/00080767.pdf?tp=&arnumber=80767&isnumber=2655
			// Or: http://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=1575188&tag=1
			var arnumber = url.match(/arnumber=(\d+)/)[1];
			url = url.replace(/\/(?:search|stamp|ielx[45])\/.*$/, "/xpls/abs_all.jsp?arnumber=" + arnumber);
			Zotero.Utilities.processDocuments([url], scrape, function () {
				Zotero.done();
			});
			Zotero.wait();
		} else {
			scrape(doc, url);
		}
	}
}

function parseIdentifier(identifier) {
	var idPieces = identifier.split(':');
	if (idPieces.length > 1) {
		var prefix = idPieces.shift();
		switch (prefix.toLowerCase()) {
		case "doi":
			return ["doi", idPieces.join(':')];
		case "isbn":
			return ["isbn", idPieces.join(':')];
		case "issn":
			return ["issn", idPieces.join(':')];
		case "pmid":
			return ["pmid", idPieces.join(':')];
		default:
			// do nothing
		}
		//Zotero.debug("Unknown identifier prefix '"+prefix+"'");
		return [prefix, idPieces.join(':')];
	}
	if (identifer.substr(0, 3) == '10.') return ["doi", identifier];

	// If we're here, we have a funny number, and we don't know what to do with it.
	var ids = idCheck(identifier);
	if (ids.isbn13) return ["isbn13", isbn13];
	if (ids.isbn10) return ["isbn10", isbn10];
	if (ids.issn) return ["issn", isbn10];

	return ["unknown", identifier];
}

function addIdentifier(identifier, item) {
	var parsed = parseIdentifier(identifier);
	switch (parsed[0]) {
	case "doi":
		item.DOI = parsed[1];
		break;
	case "isbn":
		item.ISBN = parsed[1];
		break;
	case "isbn13":
		item.ISBN = parsed[1];
		break;
	case "isbn10":
		item.ISBN = parsed[1];
		break;
	case "issn":
		item.ISSN = parsed[1];
		break;
	default:
	}
}

function scrape (doc, url) {
 	var arnumber = url.match(/arnumber=\d+/)[0].replace(/arnumber=/, "");
  	var pdf;
  	pdf = ZU.xpathText(doc, '//ul[@id="subscription-content-controls"]/li/a/@href')
  	Z.debug(arnumber)
  	var get = 'http://ieeexplore.ieee.org/xpl/downloadCitations';
  	var post = "recordIds=" + arnumber + "&fromPage=&citations-format=citation-abstract&download-format=download-bibtex";
  	Zotero.Utilities.HTTP.doPost(get, post, function(text) {
  		text = text.replace(/\<br\>/g, "")
		var translator = Zotero.loadTranslator("import");
		// Calling the BibTeX translator
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		translator.setString(text);
		translator.setHandler("itemDone", function(obj, item) {
		item.notes = [];
		if (pdf) {
			Zotero.Utilities.processDocuments([pdf], function (doc, url) {
				var pdfFrame = doc.evaluate('//frame[2]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
				if (pdfFrame) item.attachments = [{
					url: pdfFrame.src,
					title: "IEEE Xplore Full Text PDF",
					mimeType: "application/pdf"
				}, {url: url, title: "IEEE Xplore Abstract Record", mimeType: "text/html"}];
				item.complete();
			}, null);
		} else {
			item.attachments=[{url: url, title: "IEEE Xplore Abstract Record", mimeType: "text/html"}];
			item.complete();
		}
	});
	translator.translate();
  });
}

// Implementation of ISBN and ISSN check-digit verification
// Based on ISBN Users' Manual (http://www.isbn.org/standards/home/isbn/international/html/usm4.htm)
// and the Wikipedia treatment of ISBN (http://en.wikipedia.org/wiki/International_Standard_Book_Number)
// and the Wikipedia treatment of ISSN (http://en.wikipedia.org/wiki/International_Standard_Serial_Number)
// This will also check ISMN validity, although it does not distinguish from their
// neighbors in namespace, ISBN-13. It does not handle pre-2008 M-prefixed ISMNs; see
// http://en.wikipedia.org/wiki/International_Standard_Music_Number
// This does not validate multiple identifiers in one field,
// but it will gracefully ignore all non-number detritus,
// such as extraneous hyphens, spaces, and comments.
// It currently maintains hyphens in non-initial and non-final position,
// discarding consecutive ones beyond the first as well.
// It also adds the customary hyphen to valid ISSNs.
// Takes the first 8 valid digits and tries to read an ISSN,
// takes the first 10 valid digits and tries to read an ISBN 10,
// and takes the first 13 valid digits to try to read an ISBN 13
// Returns an object with four attributes:
// 	"issn"
// 	"isbn10"
// 	"isbn13"
// Each will be set to a valid identifier if found, and otherwise be a
// boolean false.
// There could conceivably be a valid ISBN-13 with an ISBN-10
// substring; this should probably be interpreted as the latter, but it is a
idCheck = function (isbn) {
	// For ISBN 10, multiple by these coefficients, take the sum mod 11
	// and subtract from 11
	var isbn10 = [10, 9, 8, 7, 6, 5, 4, 3, 2];

	// For ISBN 13, multiple by these coefficients, take the sum mod 10
	// and subtract from 10
	var isbn13 = [1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3];

	// For ISSN, multiply by these coefficients, take the sum mod 11
	// and subtract from 11
	var issn = [8, 7, 6, 5, 4, 3, 2];

	// We make a single pass through the provided string, interpreting the
	// first 10 valid characters as an ISBN-10, and the first 13 as an
	// ISBN-13. We then return an array of booleans and valid detected
	// ISBNs.
	var j = 0;
	var sum8 = 0;
	var num8 = "";
	var sum10 = 0;
	var num10 = "";
	var sum13 = 0;
	var num13 = "";
	var chars = [];

	for (var i = 0; i < isbn.length; i++) {
		if (isbn.charAt(i) == " ") {
			// Since the space character evaluates as a number,
			// it is a special case.
		} else if (j > 0 && isbn.charAt(i) == "-" && isbn.charAt(i - 1) != "-") {
			// Preserve hyphens, except in initial and final position
			// Also discard consecutive hyphens
			if (j < 7) num8 += "-";
			if (j < 10) num10 += "-";
			if (j < 13) num13 += "-";
		} else if (j < 7 && ((isbn.charAt(i) - 0) == isbn.charAt(i))) {
			sum8 += isbn.charAt(i) * issn[j];
			sum10 += isbn.charAt(i) * isbn10[j];
			sum13 += isbn.charAt(i) * isbn13[j];
			num8 += isbn.charAt(i);
			num10 += isbn.charAt(i);
			num13 += isbn.charAt(i);
			j++;
		} else if (j == 7 && (isbn.charAt(i) == "X" || isbn.charAt(i) == "x" || ((isbn.charAt(i) - 0) == isbn.charAt(i)))) {
			// In ISSN, an X represents the check digit "10".
			if (isbn.charAt(i) == "X" || isbn.charAt(i) == "x") {
				var check8 = 10;
				num8 += "X";
			} else {
				var check8 = isbn.charAt(i);
				sum10 += isbn.charAt(i) * isbn10[j];
				sum13 += isbn.charAt(i) * isbn13[j];
				num8 += isbn.charAt(i);
				num10 += isbn.charAt(i);
				num13 += isbn.charAt(i);
				j++;
			}
		} else if (j < 9 && ((isbn.charAt(i) - 0) == isbn.charAt(i))) {
			sum10 += isbn.charAt(i) * isbn10[j];
			sum13 += isbn.charAt(i) * isbn13[j];
			num10 += isbn.charAt(i);
			num13 += isbn.charAt(i);
			j++;
		} else if (j == 9 && (isbn.charAt(i) == "X" || isbn.charAt(i) == "x" || ((isbn.charAt(i) - 0) == isbn.charAt(i)))) {
			// In ISBN-10, an X represents the check digit "10".
			if (isbn.charAt(i) == "X" || isbn.charAt(i) == "x") {
				var check10 = 10;
				num10 += "X";
			} else {
				var check10 = isbn.charAt(i);
				sum13 += isbn.charAt(i) * isbn13[j];
				num10 += isbn.charAt(i);
				num13 += isbn.charAt(i);
				j++;
			}
		} else if (j < 12 && ((isbn.charAt(i) - 0) == isbn.charAt(i))) {
			sum13 += isbn.charAt(i) * isbn13[j];
			num13 += isbn.charAt(i);
			j++;
		} else if (j == 12 && ((isbn.charAt(i) - 0) == isbn.charAt(i))) {
			var check13 = isbn.charAt(i);
			num13 += isbn.charAt(i);
		}
	}
	var valid8 = ((11 - sum8 % 11) % 11) == check8;
	var valid10 = ((11 - sum10 % 11) % 11) == check10;
	var valid13 = (10 - sum13 % 10 == check13);
	var matches = false;

	// Since ISSNs have a standard hyphen placement, we can add a hyphen
	if (valid8 && (matches = num8.match(/([0-9]{4})([0-9]{3}[0-9Xx])/))) {
		num8 = matches[1] + '-' + matches[2];
	}

	if (!valid8) {
		num8 = false
	};
	if (!valid10) {
		num10 = false
	};
	if (!valid13) {
		num13 = false
	};
	return {
		"isbn10": num10,
		"isbn13": num13,
		"issn": num8
	};
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://ieeexplore.ieee.org/search/searchresult.jsp?newsearch=true&queryText=turing&x=0&y=0&tag=1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://ieeexplore.ieee.org/xpl/articleDetails.jsp?tp=&arnumber=4607247&refinements%3D4294967131%26openedRefinements%3D*%26filter%3DAND%28NOT%284283010803%29%29%26searchField%3DSearch+All%26queryText%3Dturing",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Yongming",
						"lastName": "Li",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"deterministic",
					"fuzzy",
					"Turing",
					"machines;fixed",
					"finite",
					"subset;fuzzy",
					"languages;fuzzy",
					"polynomial",
					"time-bounded",
					"computation;fuzzy",
					"sets;nondeterministic",
					"fuzzy",
					"Turing",
					"machines;nondeterministic",
					"polynomial",
					"time-bounded",
					"computation;Turing",
					"machines;computational",
					"complexity;deterministic",
					"automata;fuzzy",
					"set",
					"theory;"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "IEEE Xplore Abstract Record",
						"mimeType": "text/html"
					}
				],
				"publicationTitle": "Fuzzy Systems, IEEE Transactions on",
				"title": "Fuzzy Turing Machines: Variants and Universality",
				"date": "dec.  2008",
				"volume": "16",
				"issue": "6",
				"pages": "1491 -1502",
				"abstractNote": "In this paper, we study some variants of fuzzy Turing machines (FTMs) and universal FTM. First, we give several formulations of FTMs, including, in particular, deterministic FTMs (DFTMs) and nondeterministic FTMs (NFTMs). We then show that DFTMs and NFTMs are not equivalent as far as the power of recognizing fuzzy languages is concerned. This contrasts sharply with classical TMs. Second, we show that there is no universal FTM that can exactly simulate any FTM on it. But if the membership degrees of fuzzy sets are restricted to a fixed finite subset <i>A</i> of [0,1], such a universal machine exists. We also show that a universal FTM exists in some approximate sense. This means, for any prescribed accuracy, that we can construct a universal machine that simulates any FTM with the given accuracy. Finally, we introduce the notions of fuzzy polynomial time-bounded computation and nondeterministic fuzzy polynomial time-bounded computation, and investigate their connections with polynomial time-bounded computation and nondeterministic polynomial time-bounded computation.",
				"DOI": "10.1109/TFUZZ.2008.2004990",
				"ISSN": "1063-6706",
				"libraryCatalog": "IEEE Xplore",
				"shortTitle": "Fuzzy Turing Machines"
			}
		]
	}
]
/** END TEST CASES **/