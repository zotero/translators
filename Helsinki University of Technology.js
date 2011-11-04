{
	"translatorID": "2943d7fc-3ce8-401c-afd5-ee1f70b7aae0",
	"label": "Helsinki University of Technology",
	"creator": "Michael Berkowitz",
	"target": "^https?://teemu\\.linneanet\\.fi/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-03 22:55:42"
}

function detectWeb(doc, url) {
	if (url.match(/v\d+=\d+/)) {
		return "book";
	} else if (url.match(/Search_Arg/)) {
		return "multiple";
	}
}

function MARCify(str) {
	return str.replace(/v\d+=([^&]+)/, "v3=$1");
}

function doWeb(doc, url) {
	var n = doc.documentElement.namespaceURI;
	var ns = n ? function(prefix) {
		if (prefix == 'x') return n; else return null;
	} : null;
	
	var books = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var titles = doc.evaluate('/html/body/form/table/tbody/tr/td[3]/a', doc, ns, XPathResult.ANY_TYPE, null);
		var title;
		var items = new Object();
		while (title = titles.iterateNext()) {
			items[title.href] = Zotero.Utilities.trimInternal(title.textContent);
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			books.push(MARCify(i));
		}
	} else {
		books = [MARCify(url)];
	}
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("a6ee60df-1ddc-4aae-bb25-45e0537be973");
	var marc = translator.getTranslatorObject();
	Zotero.Utilities.processDocuments(books, function(doc) {
		var elmts = doc.evaluate('/html/body/form/table/tbody/tr[th]', doc, ns, XPathResult.ANY_TYPE, null);
		var record = new marc.record();
		var elmt;
		while (elmt = elmts.iterateNext()) {
			var field = Zotero.Utilities.superCleanString(doc.evaluate('./th', elmt, ns, XPathResult.ANY_TYPE, null).iterateNext().textContent);
			if (field) {
				var value = doc.evaluate('./td[1]', elmt, ns, XPathResult.ANY_TYPE, null).iterateNext().textContent;
				if (value.split(/\n/)[1]) value = Zotero.Utilities.trimInternal(value.split(/\n/)[1]);
				if(field == "LDR") {
					record.leader = value;
				} else if(field != "FMT") {
					value = value.replace(/\|([a-z]) /g, marc.subfieldDelimiter+"$1");
					var code = field.substring(0, 3);
					var ind = "";
					if(field.length > 3) {
						ind = field[3];
						if(field.length > 4) {
							ind += field[4];
						}
					}
				
					record.addField(code, ind, value);
				}
			}
		}
		var item = new Zotero.Item("book");
		record.translate(item);
		item.complete();
	}, function() {Zotero.done();});
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://teemu.linneanet.fi/cgi-bin/Pwebrecon.cgi?Search_Arg=web&SL=None&Search_Code=TALL&PID=Rfe3ikBNYnzPdiZ12x1LVo3IFTNEt&SEQ=20111104065416&CNT=50&HIST=1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://teemu.linneanet.fi/cgi-bin/Pwebrecon.cgi?v1=1&ti=1,1&Search%5FArg=web&SL=None&Search%5FCode=TALL&CNT=50&PID=qW2TbzRsj-nzQCKik3g_8dLFEbXz4&SEQ=20111104065424&SID=1",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Gwen",
						"lastName": "Solomon",
						"creatorType": "author"
					},
					{
						"firstName": "Lynne",
						"lastName": "Schrum",
						"creatorType": "contributor"
					}
				],
				"notes": [
					{
						"note": "New world, new web, new skills ; Students and learning ; New tools ; New tools in schools ; Professional development ; Leadership and new tools ; Online safety and security ; Systemic issues ; New schools ; Tutorials"
					}
				],
				"tags": [
					"Educational technology",
					"Web sites",
					"Authoring programs",
					"Open source software",
					"tietokoneavusteinen opetus |2 ysa",
					"opetusteknologia |2 ysa",
					"verkko-opetus |2 ysa",
					"avoin lähdekoodi |2 ysa",
					"vapaat ohjelmistot |2 ysa",
					"Web 2.0 |2 ysa"
				],
				"seeAlso": [],
				"attachments": [],
				"ISBN": "1-56484-234-7",
				"title": "Web 2.0: new tools, new schools",
				"place": "Eugene (Or.)",
				"publisher": "International Society for Technology in Education",
				"date": "2007",
				"numPages": "270",
				"callNumber": "37.04",
				"libraryCatalog": "Helsinki University of Technology",
				"shortTitle": "Web 2.0"
			}
		]
	}
]
/** END TEST CASES **/