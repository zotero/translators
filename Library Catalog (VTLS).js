{
	"translatorID": "63a0a351-3131-18f4-21aa-f46b9ac51d87",
	"label": "Library Catalog (VTLS)",
	"creator": "Simon Kornblith",
	"target": "/chameleon(?:\\?|$)",
	"minVersion": "1.0.0b3.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-04-18 00:31:33"
}

function detectWeb(doc, url) {
	var node = doc.evaluate('//tr[@class="intrRow"]/td/table/tbody/tr[th]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if (node) {
		return "multiple";
	}
	var node = doc.evaluate('//a[text()="marc" or text()="marc view" or contains(text(), "UNIMARC") or contains(text(), "مارك")]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if (node) {
		return "book";
	}
}

function doWeb(doc, url) {
	var uri = doc.location.href;
	var newUris = new Array();
	var marcs = doc.evaluate('//a[text()="marc" or text()="marc view" or contains(text(), "UNIMARC") or contains(text(), "مارك")]', doc, null, XPathResult.ANY_TYPE, null);
	var record = marcs.iterateNext();

	if (record && !marcs.iterateNext()) {
		scrape(doc, record.href);
	} else {
		// Require link to match this
		var tagRegexp = new RegExp();
		tagRegexp.compile("/chameleon\?.*function=CARDSCR");

		var items = {};

		var tableRows = doc.evaluate('//tr[@class="intrRow"]', doc, null, XPathResult.ANY_TYPE, null);
		var tableRow;
		// Go through table rows
		while (tableRow = tableRows.iterateNext()) {
			var links = tableRow.getElementsByTagName("a");
			// Go through links
			var url;

			for (var j = 0; j < links.length; j++) {
				if (tagRegexp.test(links[j].href)) {
					url = links[j].href;
					break;
				}
			}
			if (url) {
				// Collect title information
				var fields = doc.evaluate('./td/table/tbody/tr[th]', tableRow, null, XPathResult.ANY_TYPE, null);
				var field;
				while (field = fields.iterateNext()) {
					var header = doc.evaluate('./th/text()', field, null, XPathResult.ANY_TYPE, null).iterateNext();
					if (header.nodeValue == "Title"|| header.nodeValue == "Tytuł" || header.nodeValue == "Titre" || header.nodeValue == "العنوان") {
						var value = doc.evaluate('./td', field, null, XPathResult.ANY_TYPE, null).iterateNext();
						if (value) {
							items[url] = Zotero.Utilities.trimInternal(value.textContent);
						}
					}
				}
			}
		}


		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				newUris.push(i.replace(/function=[A-Z]{7}/, "function=MARCSCR"));
			}
			//Z.debug(newUris);
			Zotero.Utilities.processDocuments(newUris, scrape);
		});
	}
}



function scrape(doc, newUris) {
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("a6ee60df-1ddc-4aae-bb25-45e0537be973");
	translator.getTranslatorObject(function (marc) {
		Zotero.Utilities.processDocuments(newUris, function (newDoc) {
			var uri = newDoc.location.href
			var record = new marc.record();
			//		var xpath = '//table[@class="outertable"]/tbody/tr[td[4]]'; //old xpath
			//		xpaths from virginia college of osteopathic medicine
			//		/html/body/table[@class="header2"]/tbody/tr/td[2]/table/tbody/tr/td/table/tbody/tr/td/table[@class="marctable"]/tbody/tr/td[1][@class="marcTag"]
			//		/html/body/table[@class="header2"]/tbody/tr/td[2]/table/tbody/tr/td/table/tbody/tr/td/table[@class="marctable"]/tbody/tr/td[2]
			//		/html/body/table[@class="header2"]/tbody/tr/td[2]/table/tbody/tr/td/table/tbody/tr/td/table[@class="marctable"]/tbody/tr/td[3]
			//		/html/body/table[@class="header2"]/tbody/tr/td[2]/table/tbody/tr/td/table/tbody/tr/td/table[@class="marctable"]/tbody/tr/td[4][@class="marcSubfields"]
			var xpath = '//table[@class="marctable"]/tbody/tr[td[4]]';
			var elmts = newDoc.evaluate(xpath, newDoc, null, XPathResult.ANY_TYPE, null);

			while (elmt = elmts.iterateNext()) {
				var field = newDoc.evaluate('./TD[1]/text()[1]', elmt, null, XPathResult.ANY_TYPE, null).iterateNext().nodeValue;
				var ind1 = newDoc.evaluate('./TD[2]/text()[1]', elmt, null, XPathResult.ANY_TYPE, null).iterateNext().nodeValue;
				var ind2 = newDoc.evaluate('./TD[3]/text()[1]', elmt, null, XPathResult.ANY_TYPE, null).iterateNext().nodeValue;
				var value = newDoc.evaluate('./TD[4]/text()[1]', elmt, null, XPathResult.ANY_TYPE, null).iterateNext().nodeValue;
				//French and English delimiters differ (sigh...)
				value = value.replace(/\\([a-z0-9])\s?/g, marc.subfieldDelimiter + "$1").replace(/\$ ([a-z0-9]) /g, marc.subfieldDelimiter + "$1");
				//Z.debug(field+": " + value)
				record.addField(field, ind1 + ind2, value);
			}

			var newItem = new Zotero.Item();
			record.translate(newItem);
			var domain = uri.match(/https?:\/\/([^/]+)/);
			newItem.repository = domain[1] + " Library Catalog";

			newItem.complete();
		});
	});
} 
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://webvirtua.ums.edu.my/cgi-bin/gw/chameleon?sessionid=2011110906595202796&skin=ums&lng=en&inst=consortium&host=10.11.50.2%2b1111%2bDEFAULT&sourcescreen=INITREQ&scant1=Peronism%20without%20Peron%20%3a%20unions,%20parties,%20and%20democracy%20in%20Argentina%20%2f%20James%20W.%20McGuire&scanu1=4&elementcount=1&t1=Peronism%20without%20Peron%20%3a%20unions,%20parties,%20and%20democracy%20in%20Argentina%20%2f%20James%20W.%20McGuire&u1=4&op1=0&pos=1&itempos=1&rootsearch=KEYWORD&function=INITREQ&search=AUTHID&authid=428069&authidu=4",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "James W.",
						"lastName": "McGuire",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Peronism",
					"Trade-unions",
					"Political activity History",
					"Argentina",
					"Democracy",
					"History",
					"Argentina",
					"Argentina",
					"Politics and government",
					"1943-"
				],
				"seeAlso": [],
				"attachments": [],
				"ISBN": "0804728313",
				"title": "Peronism without Peron: unions, parties, and democracy in Argentina",
				"place": "Stanford",
				"publisher": "Stanford University Press",
				"date": "1997",
				"numPages": "388",
				"callNumber": "F2849 . M34",
				"libraryCatalog": "webvirtua.ums.edu.my Library Catalog",
				"shortTitle": "Peronism without Peron"
			}
		]
	}
]
/** END TEST CASES **/