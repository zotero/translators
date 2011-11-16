{
	"translatorID": "fef07360-ee97-4f67-b022-6f64d5ec0c25",
	"label": "KOBV",
	"creator": "Gunar Maiwald",
	"target": "^http://vs13.kobv.de/V/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-07 20:29:22"
}

function detectWeb(doc, url) {
	if (doc.evaluate('//tr /td[@class="no_wrap_center"]/a', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "multiple";
	}
	else if (doc.evaluate('//tr/th[@class="no_wrap"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "book";
	}
}

function scrape(doc) {
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("a6ee60df-1ddc-4aae-bb25-45e0537be973");
	var marc = translator.getTranslatorObject();

	 var xpath;
	if (doc.title.match("Freie Universität Berlin")) { xpath ='//li/a[@title="Ansicht des Originalformats"]'; }
	else if (doc.title.match("KOBV")) { xpath ='//li/a[@title="Ansicht des bibliothekarischen Formats"]'; }
	else if (doc.title.match("UB der HU Berlin")) { xpath ='//li/a[@title="Ansicht des Originalformats"]'; }
	else if (doc.title.match("^MetaLib")) { xpath ='//li/a[@title="Ansicht des Originalformats"]'; }
	var hrefs = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
	var href;
	
	while (href = hrefs.iterateNext()) {
		var url = href.getAttribute("href");
		url += "&format=005";
		
		Zotero.Utilities.processDocuments([url], function(newDoc) {
			var record = new marc.record();
			var xpath = '//table//tr';
			var elmts = newDoc.evaluate(xpath, newDoc, null, XPathResult.ANY_TYPE, null);
			var elmt;
			
			while (elmt = elmts.iterateNext()) {
				var field = Zotero.Utilities.trimInternal(newDoc.evaluate('./td[1]', elmt, null, XPathResult.ANY_TYPE, null).iterateNext().textContent);
				var value = Zotero.Utilities.trimInternal(newDoc.evaluate('./td[2]', elmt, null, XPathResult.ANY_TYPE, null).iterateNext().textContent);
				value = value.replace(/\|([a-z]) /g,marc.subfieldDelimiter+"$1");
				var code = field.substring(0,3);
				var ind = field.substr(3);
				
				// QnD for Authors:
				if (code == "100" && ind == "11" && value.match(marc.subfieldDelimiter+"b"))  {
					var values = value.split(marc.subfieldDelimiter);
					var forename = values[1].substr(1);
					var surname = values[2].substr(1);
					value = marc.subfieldDelimiter+"a"+surname+", "+forename;
					ind = 1;
				}
						record.addField(code, ind, value);
			}
			
			var newItem = new Zotero.Item();
			record.translate(newItem);
			newItem.complete();					
			
		}, function() { Zotero.done(); });
		Zotero.wait();
	} 
}


function doWeb(doc, url) {
	var xpath1 = '//table/tbody/tr/td[@class="no_wrap_center"]/a';
	var xpath2 = '//table/tbody/tr/th[@class="no_wrap"]';
	var newUrls = new Array();
	
	if (doc.evaluate(xpath1, doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		var items = Zotero.Utilities.getItemArray(doc, doc, '^http://vs13\.kobv\.de/V/.*format=999$','^\s[0-9]+$');
		//http://vs13.kobv.de/V/EV2X4CXH83SACASM9IRHI283QIE7GQGIVRTYYM5G9NLVI5LB7Q-09472?func=meta-3&short-format=002&set_number=000364&set_entry=000002&format=999
		items = Zotero.selectItems(items);
		for (var url in items) {
			newUrls.push(url);
		}
	}
	
	else if (doc.evaluate(xpath2, doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		newUrls.push(url);
	}
	
	Zotero.Utilities.processDocuments(newUrls, scrape, function() { Zotero.done(); });
	Zotero.wait();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://vs13.kobv.de/V/EV2X4CXH83SACASM9IRHI283QIE7GQGIVRTYYM5G9NLVI5LB7Q-08626?func=meta-3&short-format=002&set_number=000358&set_entry=000001&format=999",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Claudia",
						"lastName": "Zilla",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"ISBN": "978-3-8329-6571-6",
				"title": "\"Demokratie\" im Diskurs politischer Parteien Argentinien und Chile im Vergleich",
				"edition": "1. Aufl",
				"place": "Baden-Baden",
				"publisher": "Nomos",
				"date": "2011",
				"numPages": "305",
				"series": "Nomos-Universitätsschriften",
				"seriesNumber": "177",
				"libraryCatalog": "KOBV"
			}
		]
	},
	{
		"type": "web",
		"url": "http://vs13.kobv.de/V/FPA8QQHCHFKG1YIFAR9QNJ4Y2FAJA1QIJ3U7C4DC3CLFPFRDDQ-11814?func=meta-3&short-format=000",
		"items": "multiple"
	}
]
/** END TEST CASES **/
