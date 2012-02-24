{
	"translatorID": "b8a86e36-c270-48c9-bdd1-22aaa167ef46",
	"label": "Agencia del ISBN",
	"creator": "Michael Berkowitz",
	"target": "^https?://www\\.mcu\\.es/webISBN",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2012-02-23 21:17:50"
}

function detectWeb(doc, url) {
	if (doc.evaluate('//div[@class="isbnResultado"]/div[@class="isbnResDescripcion"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "multiple";
	} else if (doc.evaluate('//div[@class="fichaISBN"]/div[@class="cabecera"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "book";
	}
}

function doWeb(doc, url) {
	var books = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var boxes = doc.evaluate('//div[@class="isbnResultado"]/div[@class="isbnResDescripcion"]', doc, null, XPathResult.ANY_TYPE, null);
		var box;
		while (box = boxes.iterateNext()) {
			var book = doc.evaluate('./p/span/strong/a', box, null, XPathResult.ANY_TYPE, null).iterateNext();
			items[book.href] = book.textContent;
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			books.push(i);
		}
	} else {
		books = [url];
	}
	Zotero.Utilities.processDocuments(books, function(newDoc) {
		var data = new Object();
		var rows = newDoc.evaluate('//div[@class="fichaISBN"]/table/tbody/tr', newDoc, null, XPathResult.ANY_TYPE, null);
		var next_row;
		while (next_row = rows.iterateNext()) {
			var heading = newDoc.evaluate('./th', next_row, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
			var value = newDoc.evaluate('./td', next_row, null, XPathResult.ANY_TYPE, null).iterateNext().textContent;
			data[heading.replace(/\W/g, "")] = value;
		}
		var isbn = Zotero.Utilities.trimInternal(newDoc.evaluate('//span[@class="cabTitulo"]/strong', newDoc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent);
		var item = new Zotero.Item("book");
		item.ISBN = isbn;
		item.title = Zotero.Utilities.trimInternal(data['Ttulo']);
		
		author = data['Autores'];
		if (author) {
			var authors = author.match(/\b.*,\s+\w+[^([]/g);
			for each (aut in authors) {
				item.creators.push(Zotero.Utilities.cleanAuthor(Zotero.Utilities.trimInternal(aut), "author", true));
			}
		}
		if (data['Publicacin']) item.publisher = Zotero.Utilities.trimInternal(data['Publicacin']);
		if (data['FechaEdicin']) item.date = Zotero.Utilities.trimInternal(data['FechaEdicin']);
		item.complete();
	}, function() {Zotero.done();});
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.mcu.es/webISBN/tituloDetalle.do?sidTitul=1489394&action=busquedaInicial&noValidating=true&POS=0&MAX=50&TOTAL=0&prev_layout=busquedaisbn&layout=busquedaisbn&language=es",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Jorge",
						"lastName": "Borges",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"ISBN": "978-84-611-7888-9",
				"title": "El jardín de senderos que se bifurcan",
				"publisher": "Summa Editorial, S.L.",
				"date": "10/2007",
				"libraryCatalog": "Agencia del ISBN"
			}
		]
	}
]
/** END TEST CASES **/