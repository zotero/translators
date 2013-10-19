{
	"translatorID": "f39a3a33-f694-4231-979b-47842d36b78b",
	"label": "OPAC SBN (search result)",
	"creator": "fraba",
	"target": "http://www.sbn.it",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2013-10-19 12:46:20"
}

/*
OPAC SBN Catalogo del servizio bibliotecario nazionale translator
www.sbn.it
Copyright (C) 2013 Francesco Bailo

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

function detectWeb(doc, url) {
  if (doc.title.match("Scheda dettagliata")) {
	return "book";
  } else if (doc.title.match("Risultati sintetici")) {
	return "multiple";
  }
}

function doWeb(doc, url) {
  var namespace = doc.documentElement.namespaceURI;
  var nsResolver = namespace ? function(prefix) {
	if (prefix == 'x') return namespace; else return null;
  } : null;
  var articles = new Array();
  var items = new Object();
  var nextTitle;
  if (detectWeb(doc, url) == "multiple") {
	var titles = doc.evaluate('//tbody/tr/td[3]/div[2]/a', doc, nsResolver, XPathResult.ANY_TYPE, null);
	while (nextTitle = titles.iterateNext()) {
	  items[nextTitle.href] = nextTitle.textContent;
	}
	items = Zotero.selectItems(items);
	for (var i in items) {
	  articles.push(i);
	}
  } else {
	articles = [url];
  }
  Zotero.Utilities.processDocuments(articles, scrape, function(){Zotero.done();});
  Zotero.wait();
}