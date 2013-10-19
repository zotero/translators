{
	"translatorID": "95eee7a9-06b2-42c7-8e4a-05b9efcf81d1",
	"label": "OPAC SBN (single result)",
	"creator": "fraba",
	"target": "http://www.sbn.it",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2013-10-19 15:51:14"
}

/*
OPAC SBN Catalogo del servizio bibliotecario nazionale translator
www.sbn.it
Based on code from http://www.zotero.org/support/dev/how_to_write_a_zotero_translator_plusplus
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

// The function used to save well formatted data to Zotero
function associateData (newItem, items, field, zoteroField) {
  if (items[field]) {
	newItem[zoteroField] = items[field];
  }
}

function scrape(doc, url) {
  // variable declarations
  var newItem = new Zotero.Item('book');
  newItem.url = doc.location.href;
  newItem.title = "No Title Found";
  var items = new Object();
  var tagsContent = new Array();

  // scrape page data, save to Zotero
  getItems(doc, items, tagsContent);
  getAuthors(newItem, items);
  getTitle(newItem, items);
  getImprints(newItem, items);
  getPages(newItem, items);
  getEdition(newItem, items);
  saveToZotero(newItem, items);
}

function getItems(doc, items, tagsContent) {
  // namespace code
  var namespace = doc.documentElement.namespaceURI;
  var nsResolver = namespace ? 
	function(prefix) {
	  if (prefix == 'x') return namespace; else return null;
	} : null;

  // populate "items" Object and save tags to an Array
  var blankCell = "temp";
  var headersTemp;
  var headers;
  var contents;
  var myXPathObject = doc.evaluate('//td[1]', doc, nsResolver, XPathResult.ANY_TYPE, null);
  var myXPathObject2 = doc.evaluate('//td[2]', doc, nsResolver, XPathResult.ANY_TYPE, null);
  while (headers = myXPathObject.iterateNext()) {
	headersTemp = headers.textContent;
	if (!headersTemp.match(/\w/)) {
	  headersTemp = blankCell;
	  blankCell = blankCell + "1";
	}
	contents = myXPathObject2.iterateNext().textContent;
	items[headersTemp.replace(/\s+/g, '')]=contents.replace(/^\s*|\s*$/g, '');
  }
}

function getAuthors(newItem, items) {
  //Formatting and saving "Author" field
  if (items["Autoreprincipale"]) {
	var author = items["Autoreprincipale"];
	var words = author.split(", ");
	var authorFixed = '';
	for (i = words.length-1; i > -1; i--) {
	  words[i] = words[i].replace(/\W/g, '');
	  words[i] = words[i].replace(/\d/g, '');
	  authorFixed = authorFixed + words[i] + ' ';
	  author = authorFixed;
	}
  } else {
		author = items["Titolo"].substr(items["Titolo"].indexOf("/") + 1);
  }
  newItem.creators.push(Zotero.Utilities.cleanAuthor(author, "author"));
}

function getTitle(newItem, items) {
  if (items["Titolo"]) {
  	var title = items["Titolo"];
  	if (items["Titolo"].match("/")) {
  	  title = items["Titolo"].substr(0,items["Titolo"].indexOf("/"));  
  	}
	newItem.title = title;	
  }
}

function getPages(newItem, items) {
  if (items["Descrizionefisica"]) {
  	pages = items["Descrizionefisica"].substr(0,items["Descrizionefisica"].indexOf("p")-1);  
	newItem.numPages = pages;	
  }
}

function getEdition(newItem, items) {
  if (items["Edizione"]) {
  	edition = items["Edizione"];
	newItem.edition = edition.replace(/\D/g,'');	
  }
}

function getImprints(newItem, items) {
  // Format and save "Imprint" fields
  if (items["Pubblicazione"]) {
	items["Pubblicazione"] = items["Pubblicazione"].replace(/\s\s+/g, '');
	if (items["Pubblicazione"].match(":")) {
	  var colonLoc = items["Pubblicazione"].indexOf(":");
	  place = items["Pubblicazione"].substr(0, colonLoc-1);
	  newItem.place = place.replace(/\W/g, '');
	  var commaLoc = items["Pubblicazione"].lastIndexOf(",");
	  var date1 =items["Pubblicazione"].substr(commaLoc + 1);
	  date1 = date1.substr(0, date1.length);
	  newItem.date = date1.replace(/\D/g, '');
	  newItem.publisher = items["Pubblicazione"].substr(colonLoc+1, commaLoc-colonLoc-1);
	} else {
	  newItem.publisher = items["Pubblicazione"];
	}
  }
}

function saveToZotero(newItem, items) {
  // Associate and save well-formed data to Zotero
  associateData (newItem, items, "Title:", "title");
  //associateData (newItem, items, "ISBN-10:", "ISBN");
  //associateData (newItem, items, "Collection:", "extra");
  associateData (newItem, items, "Pages:", "pages");
  newItem.repository = "OPAC SBN";
  newItem.complete();
}

function doWeb(doc, url) {
  // namespace code
  var namespace = doc.documentElement.namespaceURI;
  var nsResolver = namespace ? function(prefix) {
	if (prefix == 'x') return namespace; else return null;
  } : null;

  // variable declarations
  var articles = new Array();
  var items = new Object();
  var nextTitle;

  // If Statement checks if page is a Search Result, then saves requested Items
  if (detectWeb(doc, url) == "multiple") {
	var titles = doc.evaluate('//td[2]/a', doc, nsResolver, XPathResult.ANY_TYPE, null);
	while (nextTitle = titles.iterateNext()) {
	  items[nextTitle.href] = nextTitle.textContent;
	}
	items = Zotero.selectItems(items);
	for (var i in items) {
	  articles.push(i);
	}
  } else {
	//saves single page items
	articles = [url];
  }

  // process everything, calling function=scrape to do the heavy lifting
  Zotero.Utilities.processDocuments(articles, scrape, function(){Zotero.done();});
  Zotero.wait();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.sbn.it/opacsbn/opaclib?db=solr_iccu&select_db=solr_iccu&saveparams=false&resultForward=opac%2Ficcu%2Ffull.jsp&searchForm=opac%2Ficcu%2Ffree.jsp&y=0&do_cmd=search_show_cmd&x=0&nentries=1&rpnlabel=+Tutti+i+campi+%3D+Camilleri+%28parole+in+AND%29+&rpnquery=%2540attrset%2Bbib-1%2B%2B%2540attr%2B1%253D1016%2B%2540attr%2B4%253D6%2B%2522Camilleri%2522&&fname=none&from=2",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Andrea",
						"lastName": "Camilleri",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"url": "http://www.sbn.it/opacsbn/opaclib?db=solr_iccu&select_db=solr_iccu&saveparams=false&resultForward=opac%2Ficcu%2Ffull.jsp&searchForm=opac%2Ficcu%2Ffree.jsp&y=0&do_cmd=search_show_cmd&x=0&nentries=1&rpnlabel=+Tutti+i+campi+%3D+Camilleri+%28parole+in+AND%29+&rpnquery=%2540attrset%2Bbib-1%2B%2B%2540attr%2B1%253D1016%2B%2540attr%2B4%253D6%2B%2522Camilleri%2522&&fname=none&from=2",
				"title": "La strage dimenticata",
				"place": "Palermo",
				"date": "1999",
				"publisher": "Sellerio",
				"numPages": "72",
				"edition": "7",
				"libraryCatalog": "OPAC SBN",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sbn.it/opacsbn/opaclib?db=solr_iccu&select_db=solr_iccu&saveparams=false&resultForward=opac%2Ficcu%2Ffull.jsp&searchForm=opac%2Ficcu%2Ffree.jsp&y=0&do_cmd=search_show_cmd&x=0&nentries=1&rpnlabel=+Any+%3D+Buzzati+%28ricerca.parole+tutte%29+&rpnquery=%2540attrset%2Bbib-1%2B%2B%2540attr%2B1%253D1016%2B%2540attr%2B4%253D6%2B%2522Buzzati%2522&&fname=none&from=3",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Dino",
						"lastName": "Buzzati",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"url": "http://www.sbn.it/opacsbn/opaclib?db=solr_iccu&select_db=solr_iccu&saveparams=false&resultForward=opac%2Ficcu%2Ffull.jsp&searchForm=opac%2Ficcu%2Ffree.jsp&y=0&do_cmd=search_show_cmd&x=0&nentries=1&rpnlabel=+Any+%3D+Buzzati+%28ricerca.parole+tutte%29+&rpnquery=%2540attrset%2Bbib-1%2B%2B%2540attr%2B1%253D1016%2B%2540attr%2B4%253D6%2B%2522Buzzati%2522&&fname=none&from=3",
				"title": "Sessanta racconti",
				"place": "Milano",
				"date": "1964",
				"publisher": "Mondadori",
				"numPages": "563",
				"edition": "8",
				"libraryCatalog": "OPAC SBN",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sbn.it/opacsbn/opaclib?db=solr_iccu&select_db=solr_iccu&saveparams=false&resultForward=opac%2Ficcu%2Ffull.jsp&searchForm=opac%2Ficcu%2Ffree.jsp&y=0&do_cmd=search_show_cmd&x=0&nentries=1&rpnlabel=+Tutti+i+campi+%3D+il+nome+della+rosa+%28parole+in+AND%29+&rpnquery=%2540attrset%2Bbib-1%2B%2B%2540attr%2B1%253D1016%2B%2540attr%2B4%253D6%2B%2522nome%2Bdella%2Brosa%2522&&fname=none&from=1",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Umberto",
						"lastName": "Eco",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"url": "http://www.sbn.it/opacsbn/opaclib?db=solr_iccu&select_db=solr_iccu&saveparams=false&resultForward=opac%2Ficcu%2Ffull.jsp&searchForm=opac%2Ficcu%2Ffree.jsp&y=0&do_cmd=search_show_cmd&x=0&nentries=1&rpnlabel=+Tutti+i+campi+%3D+il+nome+della+rosa+%28parole+in+AND%29+&rpnquery=%2540attrset%2Bbib-1%2B%2B%2540attr%2B1%253D1016%2B%2540attr%2B4%253D6%2B%2522nome%2Bdella%2Brosa%2522&&fname=none&from=1",
				"title": "Il nome della rosa",
				"place": "Milano",
				"date": "1981",
				"publisher": "Bompiani",
				"numPages": "503",
				"edition": "7",
				"libraryCatalog": "OPAC SBN",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sbn.it/opacsbn/opaclib?db=solr_iccu&select_db=solr_iccu&saveparams=false&resultForward=opac%2Ficcu%2Ffull.jsp&searchForm=opac%2Ficcu%2Ffree.jsp&y=0&do_cmd=search_show_cmd&x=0&nentries=1&rpnlabel=+Tutti+i+campi+%3D+Caproni+%28parole+in+AND%29+&rpnquery=%2540attrset%2Bbib-1%2B%2B%2540attr%2B1%253D1016%2B%2540attr%2B4%253D6%2B%2522Caproni%2522&&fname=none&from=3",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Giorgio",
						"lastName": "Caproni",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"url": "http://www.sbn.it/opacsbn/opaclib?db=solr_iccu&select_db=solr_iccu&saveparams=false&resultForward=opac%2Ficcu%2Ffull.jsp&searchForm=opac%2Ficcu%2Ffree.jsp&y=0&do_cmd=search_show_cmd&x=0&nentries=1&rpnlabel=+Tutti+i+campi+%3D+Caproni+%28parole+in+AND%29+&rpnquery=%2540attrset%2Bbib-1%2B%2B%2540attr%2B1%253D1016%2B%2540attr%2B4%253D6%2B%2522Caproni%2522&&fname=none&from=3",
				"title": "Poesie",
				"place": "Milano",
				"date": "1976",
				"publisher": "Garzanti",
				"numPages": "275",
				"libraryCatalog": "OPAC SBN",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/