{
	"translatorID": "2e43f4a9-d2e2-4112-a6ef-b3528b39b4d2",
	"label": "MIT Press Journals",
	"creator": "Michael Berkowitz",
	"target": "^https?://www\\.mitpressjournals\\.org/(action|toc|doi)/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2011-11-09 00:21:03"
}

function detectWeb(doc, url) {
	if (url.match(/action\/doSearch/) || url.match(/toc\//)) {
		return "multiple";
	} else if (url.match(/doi\/abs\//)) {
		return "journalArticle";
	}
}

function getDOI(str) {
	return str.match(/doi\/abs\/([^?]+)/)[1];
}
	
function doWeb(doc, url) {
	var articles = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var links = doc.evaluate('//table[@class="articleEntry"]/tbody/tr//a[text() = "First Page" or text() = "Citation" or text() = "Abstract"]', doc, null, XPathResult.ANY_TYPE, null);
		var titles = doc.evaluate('//table[@class="articleEntry"]/tbody/tr//div[@class="arttitle"]', doc, null, XPathResult.ANY_TYPE, null);
		var link, title;
		while ((link = links.iterateNext()) && (title = titles.iterateNext())) {
			items[link.href] = Zotero.Utilities.trimInternal(title.textContent);
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			articles.push('http://www.mitpressjournals.org/doi/abs/' + getDOI(i));
		}
	} else {
		articles = ['http://www.mitpressjournals.org/doi/abs/' + getDOI(url)];
	}
	Zotero.Utilities.processDocuments(articles, function(newDoc) {
		if (newDoc.evaluate('//div[@class="abstractSection"]/p[contains(@class, "last") or contains(@class, "first")]', newDoc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
			var abs = Zotero.Utilities.trimInternal(newDoc.evaluate('//div[@class="abstractSection"]/p[contains(@class, "last") or contains(@class, "first")]', newDoc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent);
		}
		var doi = getDOI(newDoc.location.href);
		var risurl = 'http://www.mitpressjournals.org/action/downloadCitation?doi=' + doi + '&include=cit&format=refman&direct=on&submit=Download+article+metadata';		
		var pdfurl = newDoc.location.href.replace("/doi/abs/", "/doi/pdf/");
		Zotero.Utilities.HTTP.doGet(risurl, function(text) {
			var translator = Zotero.loadTranslator("import");
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			//Zotero.debug(text)
			translator.setString(text);
			translator.setHandler("itemDone", function(obj, item) {
				//picks up some weird attachments and notes from the RIS - delete
				item.attachments= [];
				item.notes=[];
				item.attachments.push({url:doc.location.href, title:item.publicationTitle + " Snapshot", mimeType:"text/html"})
				item.attachments.push({url:pdfurl, title:item.publicationTitle + " Full Text PDF", mimeType:"application/pdf"});
				if (abs) item.abstractNote = abs;
				item.complete();	
			});
			translator.translate();
		});
	}, function() {Zotero.done();});
	Zotero.wait();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.mitpressjournals.org/toc/afar/43/4",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.mitpressjournals.org/doi/abs/10.1162/afar.2010.43.4.60",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Verswijver",
						"firstName": "Gustaaf",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.mitpressjournals.org/doi/abs/10.1162/afar.2010.43.4.60",
						"title": "African Arts Snapshot",
						"mimeType": "text/html"
					},
					{
						"url": "http://www.mitpressjournals.org/doi/pdf/10.1162/afar.2010.43.4.60",
						"title": "African Arts Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Removable Hair Caps of Karamoja (Uganda)",
				"date": "2010",
				"DOI": "10.1162/afar.2010.43.4.60",
				"publicationTitle": "African Arts",
				"pages": "60-71",
				"volume": "43",
				"issue": "4",
				"publisher": "MIT Press",
				"ISBN": "0001-9933",
				"ISSN": "0001-9933",
				"url": "http://dx.doi.org/10.1162/afar.2010.43.4.60",
				"accessDate": "2011/11/08",
				"libraryCatalog": "MIT Press Journals"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.mitpressjournals.org/action/doSearch?type=simple&target=simple&filter=multiple&searchText=test&x=0&y=0&history=&categoryId=all",
		"items": "multiple"
	}
]
/** END TEST CASES **/