{
	"translatorID": "2e4ebd19-83ab-4a56-8fa6-bcd52b576470",
	"label": "Sueddeutsche.de",
	"creator": "Martin Meyerhoff",
	"target": "^http://www\\.sueddeutsche\\.de",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-15 17:58:53"
}

/*
Sueddeutsche.de Translator
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
This one has the search function on a different host, so I cannot scan the search results. A multiple option, though, is given for the page itself.
Test here:
http://www.sueddeutsche.de/politik
http://www.sueddeutsche.de/thema/Krieg_in_Libyen
http://www.sueddeutsche.de/muenchen

Reference article: http://www.sueddeutsche.de/wissen/embryonale-stammzellen-wo-sind-die-naiven-1.1143034
*/

function detectWeb(doc, url) {

	// I use XPaths. Therefore, I need the following block.

	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;

	var SZ_ArticleTitle_XPath = ".//h2[@id='articleTitle']";
	var SZ_Multiple_XPath = ".//*[contains(@class, 'maincolumn')]/ol/li/a|.//*[contains(@class, 'maincolumn')]/ol/li/ul/li/a";

	if (doc.evaluate(SZ_ArticleTitle_XPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext() ){
		Zotero.debug("newspaperArticle");
		return "newspaperArticle";
	} else if (doc.evaluate(SZ_Multiple_XPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext() ){
		Zotero.debug("multiple");
		return "multiple";
	}
}


function scrape(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;

	var title_XPath =".//h2[@id='articleTitle']";
	// This is clumsy, but it excludes image galleries, which link fine but then are not articles. The closing bracket is right at the end of scrape().
	if (doc.evaluate(title_XPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext() ){


	var newItem = new Zotero.Item("newspaperArticle");
	newItem.url = doc.location.href;


	// This is for the title!

	var title_XPath = '//meta[contains(@property, "og:title")]';
	var title = doc.evaluate(title_XPath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().content;
	newItem.title = Zotero.Utilities.trim(title.replace(/\s?–\s?/, ": "));

	// Author. This is tricky, the SZ uses the author field for whatever they like. Sometimes, there is no author.

	var author_XPath = './/span[contains(@class, "hcard fn")]';

	// If there is an author, use it. Otherwise: ""
	if (doc.evaluate(author_XPath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
		var author = doc.evaluate(author_XPath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;

		author = author.replace(/^Von\s/, '');
	} else {
		var author = "";
	}

	// One case i've seen: A full sentence as the "author", with no author in it. ""
	if (author.match(/\.$/)){
		author = "";
	}

	// For multiple Authors, the SZ uses comma, und and u. separate em, and put them into an array of strings.
	author = author.split(/\sund\s|\su\.\s|\,\s/);
	Zotero.debug(author);
	for (var i in author) {
		if (author[i].match(/\s/)) { // only names that contain a space!
			newItem.creators.push(Zotero.Utilities.cleanAuthor(author[i], "author"));
		}
	}

	// Now the summary
	var summary_XPath = '//meta[contains(@property, "og:description")]';
	var summary = doc.evaluate(summary_XPath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().content;
	newItem.abstractNote = summary;

	// Date
	var date_XPath = ".//*[@class='updated']/*[@class='value']";
	var date = doc.evaluate(date_XPath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	date = date.split(/\s/)[0];
	newItem.date = date;

	// Section
	var section_XPath = "//meta[contains(@name, 'keywords')]";
	var section= doc.evaluate(section_XPath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().content;
	section = section.split(",")[0];
	newItem.section = section;

	// Tags
	var tags_XPath = ".//ul[@class='themen']"
	var tags= doc.evaluate(tags_XPath, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	tags = tags.replace(/^\s*|\s*$/g, '');
	tags = tags.split(/\n/);
	for (var i in tags) {
			tags[i] = tags[i].replace(/^\s*|\s*$/g, '');
			newItem.tags.push(tags[i]);
	}

	// Publikation
	newItem.publicationTitle = "sueddeutsche.de"
	newItem.ISSN = "0174-4917";
	newItem.language = "de";

	// Attachment. Difficult. They want something inserted into the URL.

	var printurl = doc.location.href;
	printurl = printurl.replace(/(.*\/)(.*$)/, '$12.220/$2'); //done!
	Zotero.debug(printurl);
	newItem.attachments.push({url:printurl, title:doc.title, mimeType:"text/html"});

	newItem.complete()
	}

}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;

	var articles = new Array();

	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();

		var titles = doc.evaluate(".//*[contains(@class, 'maincolumn')]/ol/li/a|.//*[contains(@class, 'maincolumn')]/ol/li/ul/li/a", doc, nsResolver, XPathResult.ANY_TYPE, null);

		var next_title;
		while (next_title = titles.iterateNext()) {
			if (next_title.href.match(/^http\:\/\/www\.sueddeutsche\.de/)) {
				items[next_title.href] = Zotero.Utilities.trim(next_title.textContent);
				items[next_title.href] =items[next_title.href].replace(/\n/, '');
				items[next_title.href] =items[next_title.href].replace(/\s–|—/g, ': ');
				items[next_title.href] =items[next_title.href].replace(/\s+/g, ' ');
			}
		}
		items = Zotero.selectItems(items);
		Zotero.debug(items);
		for (var i in items) {
			articles.push(i);
		}
		Zotero.Utilities.processDocuments(articles, scrape, function() {Zotero.done();});
		Zotero.wait();
	} else {
		scrape(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.sueddeutsche.de/politik/verdacht-gegen-hessischen-verfassungsschuetzer-spitzname-kleiner-adolf-1.1190178",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Peter",
						"lastName": "Blechschmidt",
						"creatorType": "author"
					},
					{
						"firstName": "Marc",
						"lastName": "Widmann",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Euro",
					"Handy",
					"Mein Kampf"
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.sueddeutsche.de/politik/2.220/verdacht-gegen-hessischen-verfassungsschuetzer-spitzname-kleiner-adolf-1.1190178",
						"title": "Verdacht gegen hessischen Verfassungsschützer - Spitzname \"Kleiner Adolf\" - Politik - sueddeutsche.de",
						"mimeType": "text/html"
					}
				],
				"url": "http://www.sueddeutsche.de/politik/verdacht-gegen-hessischen-verfassungsschuetzer-spitzname-kleiner-adolf-1.1190178",
				"title": "Verdacht gegen hessischen Verfassungsschützer: Spitzname \"Kleiner Adolf\"",
				"abstractNote": "Als die Zwickauer Zelle in einem Kasseler Internet-Café Halit Y. hinrichtet, surft ein hessischer Verfassungsschützer dort im Netz. In seiner Wohnung findet die Polizei später Hinweise auf eine rechtsradikale Gesinnung - doch die Ermittlungen gegen den Mann werden eingestellt. Dabei bleiben viele Fragen offen.",
				"date": "2011-11-15",
				"section": "Politik",
				"publicationTitle": "sueddeutsche.de",
				"ISSN": "0174-4917",
				"language": "de",
				"libraryCatalog": "Sueddeutsche.de",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Verdacht gegen hessischen Verfassungsschützer"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sueddeutsche.de/politik",
		"items": "multiple"
	}
]
/** END TEST CASES **/