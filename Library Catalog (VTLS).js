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
	"lastUpdated": "2014-03-12 21:55:58"
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
		"url": "http://webvirtua.ums.edu.my/cgi-bin/gw/chameleon?sessionid=2014030201591329116&skin=ums&lng=en&inst=consortium&host=10.50.9.80%2b1111%2bDEFAULT&patronhost=10.50.9.80%201111%20DEFAULT&searchid=H1&sourcescreen=INITREQ&pos=1&itempos=1&rootsearch=SCAN&function=INITREQ&search=AUTHID&authid=581020&authidu=4",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Joyce P.",
						"lastName": "Jacobsen",
						"creatorType": "author"
					},
					{
						"firstName": "Gilbert L.",
						"lastName": "Skillman",
						"creatorType": "contributor"
					}
				],
				"notes": [
					{
						"note": "Introduction: labor economics and the political economy of labor -- Part I: Labor supply and demand: Labor supply -- Labor demand -- Perfectly competitive labor markets -- Imperfectly competitive labor markets -- Part II: The labor exchange: The structure of labor exchange -- Strategic labor exchange -- Bargaining in labor exchange -- Imperfect contracting in labor exchange -- Part III: The employment relationship: The nature of the employment relationship -- Employee compensation and incentive provision -- Employment continuity and internal labor markets -- Employee representation in the workplace -- Part IV: Labor market divisions: Wages and working conditions -- Education and ability -- Employee characteristics and discrimination -- Employer characteristics and market segmentation -- Part V: labor in the market system: -- Earnings inequality -- Unemployment -- Labor market dynamics"
					}
				],
				"tags": [
					"Labor Market",
					"Industrial relations",
					"Labor economics"
				],
				"seeAlso": [],
				"attachments": [],
				"ISBN": "9780631208365",
				"title": "Labor markets and employment relationships: a comprehensive approach",
				"place": "Malden, MA",
				"publisher": "Blackwell Pub",
				"date": "2004",
				"numPages": "556",
				"callNumber": "HD5706 . J33 2004",
				"libraryCatalog": "webvirtua.ums.edu.my Library Catalog",
				"shortTitle": "Labor markets and employment relationships"
			}
		]
	}
]
/** END TEST CASES **/