{
	"translatorID": "635c1246-e0c8-40a0-8799-a73a0b013ad8",
	"label": "Bryn Mawr Classical Review",
	"creator": "Michael Berkowitz",
	"target": "^https?://bmcr\\.brynmawr\\.edu/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-04-10 14:58:41"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2016 Michael Berkowitz and John Muccigrosso
	This file is part of Zotero.
	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.
	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.
	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	if (url.match(/by_reviewer/) || url.match(/by_author/) || url.match(/recent.html/) || url.match(/\/\d{4}\/$/)) {
		return "multiple";
	} else if (url.match(/[\d\-]+\.html$/)) {
		return "journalArticle";
	}
}

function doWeb(doc, url) {
	var ns = doc.documentElement.namespaceURI;
	var nsResolver = ns ? function(prefix) {
		if (prefix == 'x') return ns; else return null;
	} : null;
	var arts = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		if (doc.evaluate('//table/tbody/tr/td/ul/li/i', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
			var boxes = doc.evaluate('//table/tbody/tr/td/ul/li', doc, nsResolver, XPathResult.ANY_TYPE, null);
			var box;
			while (box = boxes.iterateNext()) {
				var link = doc.evaluate('./a', box, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().href;
				var title = doc.evaluate('./i', box, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
				items[link] = title;
			}
		} else if (doc.evaluate('//table/tbody/tr/td/ul/li', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
			var title = doc.evaluate('//table/tbody/tr/td/ul/li', doc, nsResolver, XPathResult.ANY_TYPE, null);
			var next;
			while (next = title.iterateNext()) {
				items[next.href]  = Zotero.Utilities.trimInternal(next.textContent);
			}
		} else if (url.match(/google\.com/)) {
			var titles = doc.evaluate('//h2[@class="r"]/a[@class="l"]', doc, nsResolver, XPathResult.ANY_TYPE, null);
			var title;
			while (title = titles.iterateNext()) {
				items[title.href] = title.textContent;
			}
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			arts.push(i);
		}
	} else {
		arts = [url];
	}
	Zotero.Utilities.processDocuments(arts, function(doc) {
		var item = new Zotero.Item("journalArticle");
		var title = doc.evaluate('//h3/i', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
		item.publicationTitle = "Bryn Mawr Classical Review";
		item.journalAbbreviation = "BMCR";
		item.ISSN = "1055-7660";
		item.title = "Review of: " + Zotero.Utilities.trimInternal(title);
		var data = doc.evaluate('//h3[i]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
		var title = title.replace("(", "\\(").replace(")", "\\)");
		var author = doc.evaluate('//b[contains(text(), "Reviewed")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent.match(/Reviewed by\s+([^,]+),/)[1];
		item.creators.push(Zotero.Utilities.cleanAuthor(author, "author"));
		var splitRe = new RegExp(title);
		var authors = data.split(splitRe)[0].replace(/\([^)]+\)/, "").split(/(,|and)\s+/);
		Zotero.debug(authors);
		for (var i=0; i<authors.length; i++) {
			var aut = authors[i];
			if (aut.match(/\w/) && (aut != "and")) {
				item.creators.push(Zotero.Utilities.cleanAuthor(aut, "reviewedAuthor"));
			}
		}
		item.url = doc.location.href;
		item.attachments = [{url:item.url, title:item.title, mimeType:"text/html"}];
		if (doc.evaluate('/html/body/center/table/tbody/tr/td/center/table/tbody/tr/td//font', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
			item.date = Zotero.Utilities.trimInternal(doc.evaluate('/html/body/center/table/tbody/tr/td/center/table/tbody/tr/td//font', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent.replace("Bryn Mawr Classical Review ", "").replace(/\./g, "/")).substring(0,7);
		} else {
			item.date = Zotero.Utilities.trimInternal(doc.evaluate('/html/body/h3', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent.replace("Bryn Mawr Classical Review ", "").replace(/\./g, "/")).substring(0,7)
		}
		item.complete();
	});
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://bmcr.brynmawr.edu/2010/2010-01-02.html",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Christina S.",
						"lastName": "Kraus",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Comber",
						"creatorType": "reviewedAuthor"
					},
					{
						"firstName": "Catalina",
						"lastName": "Balmaceda",
						"creatorType": "reviewedAuthor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Review of: Sallust: The War Against Jugurtha. Aris and Phillips Classical Texts",
						"mimeType": "text/html"
					}
				],
				"publicationTitle": "Bryn Mawr Classical Review",
				"journalAbbreviation": "BMCR",
				"ISSN": "1055-7660",
				"title": "Review of: Sallust: The War Against Jugurtha. Aris and Phillips Classical Texts",
				"url": "http://bmcr.brynmawr.edu/2010/2010-01-02.html",
				"date": "2010/01",
				"libraryCatalog": "Bryn Mawr Classical Review",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Review of"
			}
		]
	},
	{
		"type": "web",
		"url": "http://bmcr.brynmawr.edu/2013/2013-01-44.html",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Christina S.",
						"lastName": "Kraus",
						"creatorType": "author"
					},
					{
						"firstName": "Anthony",
						"lastName": "Grafton",
						"creatorType": "reviewedAuthor"
					},
					{
						"firstName": "Glenn W.",
						"lastName": "Most",
						"creatorType": "reviewedAuthor"
					},
					{
						"firstName": "Salvatore",
						"lastName": "Settis",
						"creatorType": "reviewedAuthor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Review of: The Classical Tradition",
						"mimeType": "text/html"
					}
				],
				"publicationTitle": "Bryn Mawr Classical Review",
				"journalAbbreviation": "BMCR",
				"ISSN": "1055-7660",
				"title": "Review of: The Classical Tradition",
				"url": "http://bmcr.brynmawr.edu/2013/2013-01-44.html",
				"date": "2013/01",
				"libraryCatalog": "Bryn Mawr Classical Review",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Review of"
			}
		]
	}
]
/** END TEST CASES **/
