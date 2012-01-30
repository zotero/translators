{
	"translatorID": "1ab8b9a4-72b5-4ef4-adc8-4956a50718f7",
	"label": "Der Freitag",
	"creator": "Martin Meyerhoff",
	"target": "^https?://www\\.freitag\\.de",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-01-30 22:51:09"
}

/*
Der Freitag Translator
Copyright (C) 2011 Martin Meyerhoff

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

/*
This site is good, but very, very slow. So when importing multiple Items, be patient!
http://www.freitag.de/search?modus=articles&SearchableText=Gaddafi*
http://www.freitag.de
http://www.freitag.de/guardian-world
*/

function detectWeb(doc, url) {

	// I use XPaths. Therefore, I need the following block.
	
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	var Freitag_Artikel_XPath = '//div[contains(@class, "artikel_content")]/h2';
	var Freitag_multiple_XPath = ".//h3[contains(@class, 'listing')]/a";
	
	if (doc.evaluate(Freitag_Artikel_XPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext() ){ // Diese Zeile verhindert die aus dem Tagesspiegel übernommenen Artikel!
		Zotero.debug("newspaperArticle");
		return "newspaperArticle";
	} else if  (doc.evaluate(Freitag_multiple_XPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext() ){ // Diese Zeile verhindert die aus dem Tagesspiegel übernommenen Artikel!
		Zotero.debug("multiple");
		return "multiple";
	} 
}

function scrape(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	var newItem = new Zotero.Item("newspaperArticle");
	newItem.url = doc.location.href; 

	
	// This is for the author and date
	
	var meta_XPath = "//div[contains(@class, 'article-heading-meta-left')]"
	var meta = doc.evaluate(meta_XPath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	meta = meta.split("|");
	for (var i in meta) {
		meta[i] = meta[i].replace(/^\s*|\s*$/g, '');
	}

	newItem.date = meta[1].split(/\s/)[0];
	
	// author
	var author = meta[2].split(/\sund\s|\su\.\s|\,\s|\//); 
	for (var i in author) {
		if (author[i].match(/\s/)) { // only names that contain a space!
			newItem.creators.push(Zotero.Utilities.cleanAuthor(author[i], "author"));
		}
	}
	
	// title 
	var title_XPath = '//title';
	var title = doc.evaluate(title_XPath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	title = title.split(/\:|\—/);
	for (var i in title) {
		title[i] = title[i].replace(/^\s*|\s*$/g, '');
	}
	newItem.title = ""
	newItem.title = newItem.title.concat(title[0], ": ", title[1]);
	newItem.publicationTitle = "Der Freitag";

	// Summary	
	var summary_XPath = "//div[@class='artikel_content']/h3";
	var summary = doc.evaluate(summary_XPath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	newItem.abstractNote = Zotero.Utilities.trim(summary);

	// no Tags, because Der Freitag doesn't supply any.
	// Section
	var section_XPath = "//h1";
	var section= doc.evaluate(section_XPath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	newItem.section= section;

	
	// Snapshot
	var printurl_XPath = ".//a[@id='article-drucken']"
	var printurl= doc.evaluate(printurl_XPath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().href;
	newItem.attachments.push({url:printurl, title:doc.title, mimeType:"text/html"});
	newItem.complete()

}


function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	var articles = new Array();
	
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		
		var titles = doc.evaluate(".//h3[contains(@class, 'listing')]/a", doc, nsResolver, XPathResult.ANY_TYPE, null);
		
		var next_title;
		while (next_title = titles.iterateNext()) {
			items[next_title.href] = next_title.textContent;
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			articles.push(i);
		}
		Zotero.Utilities.processDocuments(articles, scrape, function() {Zotero.done();});
		Zotero.wait();
	} else {
		scrape(doc, url);
	}
}	/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.freitag.de/politik/1143-bankrottmanager-in-eigener-sache",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Lutz",
						"lastName": "Herden",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.freitag.de/datenbank/freitag/2011/43/bankrottmanager-in-eigener-sache/print",
						"title": "Griechenland: Bankrottmanager in eigener Sache — Der Freitag",
						"mimeType": "text/html"
					}
				],
				"url": "http://www.freitag.de/politik/1143-bankrottmanager-in-eigener-sache",
				"date": "28.10.2011",
				"title": "Griechenland: Bankrottmanager in eigener Sache",
				"publicationTitle": "Der Freitag",
				"abstractNote": "Schuldenschnitt hin oder her. Vielleicht wäre eine geordnete Staatsinsolvenz das Beste für den Pleitier. Leider fehlen in der EU die erforderlichen Insolvenzregeln",
				"section": "Politik",
				"libraryCatalog": "Der Freitag",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Griechenland"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.freitag.de/search?modus=articles&SearchableText=Gaddafi*",
		"items": "multiple"
	}
]
/** END TEST CASES **/