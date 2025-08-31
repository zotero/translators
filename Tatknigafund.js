{
	"translatorID": "f909cbda-2fac-4700-965f-6c0783b77eeb",
	"label": "Tatknigafund",
	"creator": "Avram Lyon",
	"target": "^https?://www\\.tatknigafund\\.ru/books/",
	"minVersion": "1.0.0b4.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-08-06 19:23:07"
}

/*
   Tatknigafund Translator
   Copyright (C) 2009-2011 Avram Lyon, ajlyon@gmail.com

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/*
 This translator is designed for the Tatar Book Repository, http://www.tatknigafund.ru/ .
 At present, it imports the limited metadata that the repository exposes about its books,
 independent of interface language (Russian or Tatar).
 
 It should be able to fetch bibliographic data even for non-logged-in users, although
 to read the full-text of works in the repository, users will need to create a free account.
 
 It works on URLs of the form http://www.tatknigafund.ru/books/XXXX/ , where XXXX is the
 book ID assigned by the repository. One such URL is:
 http://www.tatknigafund.ru/books/1037
 Which should give the result:
 Ф. Гыйбадуллина, Роман hәм милләт: Гаяз Исхакый иҗатында роман жанры (Татарстан китап нəшрияты, 2007),
	http://www.tatknigafund.ru/books/1037?locale=tt.
 It should also populate the abstract field.
 
 It can also work on search results, of the form http://www.tatknigafund.ru/books/search?locale=ru&type=meta&query=XXXX
 where XXXX is the query string. One such URL is:
 http://www.tatknigafund.ru/books/search?locale=ru&type=meta&query=%D0%B8%D1%81%D1%85%D0%B0%D0%BA%D0%B8
 Which at present gives six results.

 When Zotero is able to assign languages to bibliographic data, the data obtained here would
 be a good candidate, since all the author names, titles and abstracts are served in Russian
 or Tatar, depending on the user's locale choice.
 
 This translator draws heavily on the National Library of Australia translator for inspiration,
 in lieu of up-to-date translator documentation.
 */

function scrape(doc, url) {
	var n = doc.documentElement.namespaceURI;
	var ns = n ? function(prefix) {
		if (prefix == 'x') return n; else return null;
	} : null;
	
	var item = new Zotero.Item("book");
	item.title = Zotero.Utilities.trimInternal(
		doc.evaluate('//div[@class="description"]/h1', doc, ns, XPathResult.ANY_TYPE, null).iterateNext().textContent
	);
	
	var author = doc.evaluate('//a[@class="author_link"]', doc, ns, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	// Authors here are Last Name, First initial(s) (ФИО)
	var spaceIndex = author.lastIndexOf(" ");
	var firstName = author.substring(spaceIndex+1);
	var lastName = author.substring(0, spaceIndex);
	item.creators.push({firstName:firstName, lastName:lastName, creatorType:"author"});
	
	var info = doc.evaluate('//p[@class="summary"]', doc, ns, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	var pub = info.match(/(Нәшрият|Издательство): (.+)/);
	var publisher = pub[2];
	yr = info.match(/(Нәшрият|Издательство): (.+),\s+(\d+)\s(ел|г)\./);
	var year = yr[3];

	var pagematch = info.match(/(\d+) (бит|страница|страниц|страницы)/);
	var pages = pagematch[1];
	item.publisher = Zotero.Utilities.trimInternal(publisher);
	item.date = Zotero.Utilities.trimInternal(year);
	item.numPages = pages;
	
	var description = doc.evaluate('//div[@class="description"]/p[2]', doc, ns, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	item.abstractNote = description;
	
	item.url = url;
	
	item.complete();
}

function detectWeb(doc, url) {
	if (url.match("books/search?")) {
		return "multiple";
	} else
	if (url.match("books") && !url.match("read")) {
		return "book";
	}
}

function doWeb(doc, url) {
	var n = doc.documentElement.namespaceURI;
	var ns = n ? function(prefix) {
		if (prefix == 'x') return n; else return null;
	} : null;

	if (detectWeb(doc, url) == "multiple") {
		var tablerow = doc.evaluate('//table[@class="books_list"]/tbody/tr', doc, ns, XPathResult.ANY_TYPE, null);
		var items = new Array();
		var row;
		while (row = tablerow.iterateNext()) {
			var link = doc.evaluate('./td/a[@class="book_title"]', row, ns, XPathResult.ANY_TYPE, null).iterateNext();
			var title = link.textContent;
			var url = link.href;
			items[url] = title;
		}
		Zotero.selectItems(items, function(items) {
			if (!items) return true;
			var books = new Array();
			for (var i in items) {
				books.push(i);
			}
			ZU.processDocuments(books, function(doc){ scrape(doc, doc.location.href) });
		});
	} else {
		scrape(doc, url);
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.tatknigafund.ru/books/search?locale=ru&type=meta&query=%D0%B8%D1%81%D1%85%D0%B0%D0%BA%D0%B8",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.tatknigafund.ru/books/1037",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Ф.",
						"lastName": "Гибадуллина",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Роман и нация: Жанр романа в творчестве Гаяза Исхаки",
				"publisher": "Татарское книжное издательство, 2007 г.",
				"date": "2007",
				"numPages": "128",
				"abstractNote": "В книге рассматривается жанровая природа произведений классика национальной литературы Гаяза Исхаки, определяется его вклад в развитие татарского романа. Труд будет полезен литературоведам, студентам, аспирантам, школьным учителям и всем тем, кто интересуется литературным наследием татарского народа.",
				"url": "http://www.tatknigafund.ru/books/1037",
				"libraryCatalog": "Tatknigafund",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Роман и нация"
			}
		]
	}
]
/** END TEST CASES **/