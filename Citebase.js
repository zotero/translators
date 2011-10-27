{
	"translatorID": "daa26181-71d4-48ef-8cac-54c06ff4c20e",
	"label": "Citebase",
	"creator": "Michael Berkowitz",
	"target": "^https?://(www\\.)?citebase\\.org/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-10-26 21:48:44"
}

function detectWeb(doc, url) {
	if (url.match(/\/search/)) {
		return "multiple";
	} else if (url.match(/\/abstract/)) {
		return "journalArticle";
	}
}

function detectSearch(item) {
	if(item.itemType == "journalArticle") {
		return true;
	}
	return false;
}

function doWeb(doc, url) {
	var articles = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var links = doc.evaluate('//div[@class="rs_match"]/div/a[@class="abs_title"]', doc, null, XPathResult.ANY_TYPE, null);
		var items = new Object();
		var link;
		while (link = links.iterateNext()) {
			items[link.href] = link.textContent;
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			articles.push(i);
		}
	} else {
		articles = [url];
	}

	Zotero.Utilities.processDocuments(articles, function(doc) {
		var biburl = doc.evaluate('//a[contains(text(), "BibTeX")]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().href;
		if (doc.evaluate('/html/body/div[@class="body"]/div[@class="abstract"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) var abs = Zotero.Utilities.trimInternal(doc.evaluate('/html/body/div[@class="body"]/div[@class="abstract"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent);
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		Zotero.Utilities.HTTP.doGet(biburl, function(text) {
			translator.setString(text);
			translator.setHandler("itemDone", function(obj, item) {
				if (abs) {
					if (abs.match(/^Abstract/)) {
						item.abstractNote = abs.substr(9);
					} else {
						item.abstractNote = abs;
					}
				}
				item.attachments = [{url:item.url, title:"Citebase Snapshot", mimeType:"text/html"}];
				item.complete();
			});
			translator.translate();
		});
	}, function() {Zotero.done();});
	Zotero.wait();
}

function doSearch(item) {
	if(item.contextObject) {
		var co = item.contextObject;
		if(co.indexOf("url_ver=") == -1) {
			co = "url_ver=Z39.88-2004&"+co;
		}
		co = co.replace(/(?:&|^)svc_id=[^&]*/, "");
	} else {
		var co = Zotero.Utilities.createContextObject(item);
	}
	
	Zotero.Utilities.HTTP.doGet("http://www.citebase.org/openurl?"+co+"&svc_id=bibtex", function(responseText, request) {
		if(responseText.substr(0, 6) != "<?xml ") {
			// read BibTeX
			var translator = Zotero.loadTranslator("import");
			translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
			translator.setString(responseText);
			translator.translate();
		}
		
		Zotero.done();
	});
	
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://citebase.org/abstract?id=oai%3Abiomedcentral.com%3A2040-7378-3-11",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Arthur",
						"lastName": "Liesz",
						"creatorType": "author"
					},
					{
						"firstName": "Moritz",
						"lastName": "Middelhoff",
						"creatorType": "author"
					},
					{
						"firstName": "Wei",
						"lastName": "Zhou",
						"creatorType": "author"
					},
					{
						"firstName": "Simone",
						"lastName": "Karcher",
						"creatorType": "author"
					},
					{
						"firstName": "Sergio",
						"lastName": "Illanes",
						"creatorType": "author"
					},
					{
						"firstName": "Roland",
						"lastName": "Veltkamp",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://citebase.org/abstract?id=oai:biomedcentral.com:2040-7378-3-11",
						"title": "Citebase Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Comparison of humoral neuroinflammation and adhesion molecule expression in two models of experimental intracerebral hemorrhage",
				"publicationTitle": "Experimental & Translational Stroke Medicine",
				"volume": "3",
				"pages": "11",
				"url": "http://citebase.org/abstract?id=oai:biomedcentral.com:2040-7378-3-11",
				"date": "2011",
				"libraryCatalog": "Citebase",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/