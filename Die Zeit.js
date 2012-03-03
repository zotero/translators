{
	"translatorID": "312bbb0e-bfb6-4563-a33c-085445d391ed",
	"label": "Die Zeit",
	"creator": "Martin Meyerhoff",
	"target": "^http://www\\.zeit\\.de/",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2012-03-03 12:03:56"
}

/*
Die Zeit Translator
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
This translator works only partially, because zeit.de uses some strange javascript that makes 
processDocuments return an error. If I just call scrape(doc, url) on a single document, it works. 
The way the translator is programmed now, it only works if JavaScript is turned off in the browser.

Try it out here:
http://www.zeit.de/wirtschaft/2011-03/schnappauf-ruecktritt-stuttgart
http://www.zeit.de/online/2009/12/arbeitsrecht-urlaub
http://www.zeit.de/suche/index?q=Krise
http://www.zeit.de/2009/11/
*/

function detectWeb(doc, url) {

	var Zeit_ArticleTools_XPath = ".//*[@id='informatives']/ul[@class='tools']/li";
	var Zeit_Archive_XPath = "//h4/a|//h2/a";
	
	if (doc.evaluate(Zeit_ArticleTools_XPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext() ){ 
		Zotero.debug("newspaperArticle");
		return "newspaperArticle";
	} else if (doc.evaluate(Zeit_Archive_XPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext() ){ 
		Zotero.debug("multiple");
		return "multiple";
	}
}
function scrape(doc, url) {

	var newItem = new Zotero.Item("newspaperArticle");
	newItem.url = doc.location.href; 

	
	// This is for the title!
	
	var title_XPath = '//title'
	var title = ZU.xpathText(doc, title_XPath);
	newItem.title = Zotero.Utilities.trim(title.split("|")[0]);
	
	
	// Now for the Author

	var author_XPath = '//li[contains(@class, "author first")]'; // I can't get the span selection to work. Help is appreciated.
		var author  = ZU.xpathText(doc, author_XPath);
		if (author !=null){
	author = author.replace(/^\s*Von\s|\s*$/g, ''); // remove whitespace around the author and the "Von "at the beginning
	var author = author.split(" | "); // this seems to work even if there's no |
	for (var i in author) {
				newItem.creators.push(Zotero.Utilities.cleanAuthor(author[i], "author"));
	}}
	
	// Now for the Tags

	var tags_XPath = '//li[contains(@class, "tags")]'; // I can't get the span selection to work. Help is appreciated.
		var tags = ZU.xpathText(doc, tags_XPath);
		tags = tags.replace(/^\s*Schlagworte\s|\s*$/g, ''); // remove whitespace around the author and the "Von "at the beginning
	if (tags!=null){
	var tags= tags.split("|"); // this seems to work even if there's no |
	for (var i in tags) {
		tags[i] = tags[i].replace(/^\s*|\s*$/g, '') // remove whitespace around the tags
		newItem.tags.push(tags[i]);
	} }

	// Date
	var date_XPath = '//meta[contains(@name, "date_first_released")]';
	var date2_XPath = ".//li[@class='date']";	
	if (doc.evaluate(date_XPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext() ){ 
		var date = doc.evaluate(date_XPath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().content;
		date = date.split("T")[0];
		newItem.date = date;
	} else if (doc.evaluate(date2_XPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext() ){ 
		var date = ZU.xpathText(doc, date2_XPath);
		date = Zotero.Utilities.trim(date.split(/\n/)[1]);
		date = date.replace(/Datum\s(\d\d?\.\d\d?\.\d\d\d\d).*/g, '$1');
		newItem.date = date;
	}

	
	// Summary
	
	var summary_XPath = ".//p[@class='excerpt']"
	if (doc.evaluate(summary_XPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext() ){
		var summary = ZU.xpathText(doc, summary_XPath);	
		newItem.abstractNote = Zotero.Utilities.trim(summary); 
	}
	// Produkt (Zeit, Zeit online etc.)
	product_XPath = '//meta[contains(@name, "zeit::product-name")]'
	if (doc.evaluate(product_XPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		var product = ZU.xpath(doc, product_XPath).content();
		newItem.publicationTitle = product;
	} else {
		var product = "Die Zeit";
		newItem.publicationTitle = product;
	}

	
	// Section
	var section_XPath = '//div[@class="cap"]/a'
	var section = ZU.xpathText(doc, section_XPath);
	newItem.section= section; 

	newItem.attachments.push({url:doc.location.href+"?page=all&print=true", title:doc.title, mimeType:"text/html"}); 
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
		
		var titles = doc.evaluate("//h4/a|//h2/a", doc, nsResolver, XPathResult.ANY_TYPE, null);
		
		var next_title;
		while (next_title = titles.iterateNext()) {
			if (next_title.textContent != '') {
			items[next_title.href] = next_title.textContent;
			}
		}
			Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape, function () {
				Zotero.done();
			});
			Zotero.wait();	
		});
	} 
	 else {
		scrape(doc, url);
	}
}	/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.zeit.de/politik/ausland/2011-09/libyen-bani-walid",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [],
				"notes": [],
				"tags": [
					"Libyen",
					"Stadt",
					"Tripolis",
					"Seine"
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.zeit.de/politik/ausland/2011-09/libyen-bani-walid?page=all&print=true",
						"title": "Libyen: Rebellen bereiten Angriff auf Bani Walid vor | Politik | ZEIT ONLINE",
						"mimeType": "text/html"
					}
				],
				"url": "http://www.zeit.de/politik/ausland/2011-09/libyen-bani-walid",
				"title": "Libyen: Rebellen bereiten Angriff auf Bani Walid vor",
				"date": "15:12 Uhr",
				"abstractNote": "Die von Gadhafi-Anhängern geführte Stadt ist von Rebellentruppen eingekreist. Gespräche über eine friedliche Übergabe sind gescheitert, ein Angriff steht offenbar bevor.",
				"publicationTitle": "Die Zeit",
				"section": "Ausland",
				"libraryCatalog": "Die Zeit",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Libyen"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.zeit.de/2011/36/Interview-Lahm-Rinke",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Moritz",
						"lastName": "Müller-Wirth",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Philipp Lahm",
					"Andreas Ottl",
					"Angela Merkel",
					"Max Frisch",
					"Fußball",
					"Bundesliga",
					"Mesut Özil",
					"FC Bayern München",
					"SV Werder Bremen",
					"Fifa"
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.zeit.de/2011/36/Interview-Lahm-Rinke?page=all&print=true",
						"title": "Philipp Lahm: \"Hast du elf Freunde?\" | Sport | ZEIT ONLINE",
						"mimeType": "text/html"
					}
				],
				"url": "http://www.zeit.de/2011/36/Interview-Lahm-Rinke",
				"title": "Philipp Lahm: \"Hast du elf Freunde?\"",
				"date": "17:12 Uhr",
				"abstractNote": "Tschechow und Robben, Drama im Flutlicht und Wahrhaftigkeit bei der Arbeit. Der Fußballprofi und Autor Philipp Lahm im Gespräch mit dem Schriftsteller und Fußballer Moritz Rinke",
				"publicationTitle": "Die Zeit",
				"section": "sport",
				"libraryCatalog": "Die Zeit",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Philipp Lahm"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.zeit.de/suche/index?q=Krise",
		"items": "multiple"
	}
]
/** END TEST CASES **/