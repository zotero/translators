{
	"translatorID": "cae7d3ec-bc8d-465b-974f-8b0dcfe24290",
	"label": "BIUM",
	"creator": "Michael Berkowitz",
	"target": "http://hip.bium.univ-paris5.fr/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-10-24 22:39:36"
}

function detectWeb(doc, url) {
	if (doc.evaluate('//td/a[@class="itemTitle"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "multiple";
	} else if (doc.evaluate('//td[1]/span[@class="uportal-channel-strong"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "book";
	}
}

function makeMARCurl(link, rsId, rrsId, query) {
	return 'http://hip.bium.univ-paris5.fr/uPortal/Print?link=' + link + '&xslFileName=com/dynix/hip/uportal/channels/standard/FullMarc.xsl&F=/searching/getmarcdata&responseSessionId=' + rsId + '&responseResultSetId=' + rrsId + '&searchGroup=BIUM-13&query=' + query + '&searchTargets=16&locale=fr_FR';
}

function doWeb(doc, url) {
	var n = doc.documentElement.namespaceURI;
	var ns = n ? function(prefix) {
		if (prefix == 'x') return n; else return null;
	} : null;
	
	var books = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var links = doc.evaluate('//a[@class="itemTitle"]', doc, ns, XPathResult.ANY_TYPE, null);
		var link;
		while (link = links.iterateNext()) {
			items[link.href] = Zotero.Utilities.trimInternal(link.textContent);
		}
		items = Zotero.selectItems(items);
		var rsId = doc.evaluate('//input[@name="responseSessionId"]', doc, ns, XPathResult.ANY_TYPE, null).iterateNext().value;
		var rrsId = doc.evaluate('//input[@name="responseResultSetId"]', doc, ns, XPathResult.ANY_TYPE, null).iterateNext().value;
		var query = doc.evaluate('//input[@name="query"]', doc, ns, XPathResult.ANY_TYPE, null).iterateNext().value;
		var linkRE = new RegExp("'([^']+)'", "g");
		for (var i in items) {
			var link = linkRE.exec(i)[1];
			Zotero.debug(link);
			books.push(makeMARCurl(link, rsId, rrsId, query));
		}
	} else {
		var link = url.match(/link=([^&]+)/)[1];
		var rsId = url.match(/responseSessionId=([^&]+)/)[1];
		var rrsId = url.match(/responseResultSetId=([^&]+)/)[1];
		var query = url.match(/query=([^&]+)/)[1];
		books = [makeMARCurl(link, rsId, rrsId, query)];
	}
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("a6ee60df-1ddc-4aae-bb25-45e0537be973");
	var marc = translator.getTranslatorObject();
	Zotero.Utilities.processDocuments(books, function(doc) {
		var rows = doc.evaluate('//center/table/tbody/tr', doc, ns, XPathResult.ANY_TYPE, null);
		var row;
		var record = new marc.record();
		while (row = rows.iterateNext()) {
			var field = Zotero.Utilities.trimInternal(doc.evaluate('./td[1]', row, ns, XPathResult.ANY_TYPE, null).iterateNext().textContent.replace(":", ""));
			if (field) {
				var value = doc.evaluate('./td[2]', row, ns, XPathResult.ANY_TYPE, null).iterateNext().textContent;
				if (value.split(/\n/)[1]) value = Zotero.Utilities.trimInternal(value.split(/\n/)[1]);
				if (field == "LDR") {
					record.leader = value;
				} else if (field != "FMT") {
					value = value.replace(/\¤([a-z])/g, marc.subfieldDelimiter+ "$1");
					var code = field.substring(0, 3);
					var ind = "";
					if (field.length > 3) {
						ind = field[3];
						if (field.length > 4) {
							ind += field[4];
						}
					}
					record.addField(code, ind, value);
				}
			}
		}
		var item = new Zotero.Item();
		record.translate(item);
		
		var oldauthors = item.creators;
		var newauthors = new Array();
		for each (var aut in oldauthors) {
			if (aut.lastName.match(/^[A-Z][^\s]+\s[^\s]+/)) newauthors.push(Zotero.Utilities.cleanAuthor(aut.lastName.match(/^[A-Z][^\s]+\s[^\s]+/)[0].replace(/^([^\s]+)\s+(.*)$/, "$2 $1"), "author"));
		}
		item.creators = newauthors;
		item.complete();
	}, function() {Zotero.done();});
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://hip.bium.univ-paris5.fr/uPortal/tag.idempotent.render.userLayoutRootNode.target.n184.uP?showBrief=true&TITLE=&AUTHOR=&PUBLISHER=&SERIES=&CALLNUMBER=&ISBN=&ISSN=&DATE=&EDITION=&OCLC=&LCCN=&BIBLIOGRAPHICLEVEL=&iLocation=&collection=&status=&HomeLibId=&HomeLib=&Patrons-PatronKey=&Patrons-Patron=&Patrons-PatronBarcode=&Patrons-PatronEmail=&Patrons-PatronCategory=&SYSTEMNUMBER=&request=&link=full%7E%3D16%7E%21300274%7E%211%7E%2198%7E%2113195176382183371%7E%213%7E%21110%7E%21tooth%7Cawdid%3D4&currentPosition=3&searchTargetId=16&getResults=&page=&requestbib=&summary=true&responseSessionId=13195176378593369&responseResultSetId=13195176382183371&searchGroup=BIUM-13&query=.TI%3Dtooth&searchTargets=16&summary=true&jumpToPage=1&jumpToPage2=1#n184",
		"items": [
			{
				"itemType": "book",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"ISBN": "978-0-9822928-0-8",
				"language": "eng",
				"title": "Aesthetic & restorative dentistry material selection & technique",
				"place": "Stillwater, Minn",
				"publisher": "Everest Publishing Media",
				"date": "2009",
				"callNumber": "WU 100 ¤2 usnlm",
				"libraryCatalog": "BIUM"
			}
		]
	}
]
/** END TEST CASES **/