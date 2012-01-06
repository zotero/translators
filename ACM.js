{
	"translatorID": "f3f092bf-ae09-4be6-8855-a22ddd817925",
	"label": "ACM Digital Library",
	"creator": "Simon Kornblith, Michael Berkowitz, John McCaffery, and Sebastian Karcher",
	"target": "^https?://[^/]*dl\\.acm\\.org[^/]*/(?:results\\.cfm|citation\\.cfm)",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2012-01-06 16:08:09"
}

/*
ACM Digital Library Translator
Copyright (C) 2011 Sebastian Karcher and CHNM

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
  var nsResolver = getNsResolver(doc);


  if (url.indexOf("/results.cfm") != -1) {
	//Zotero.debug("Multiple items detected");
	return "multiple";
  } else if (url.indexOf("/citation.cfm") != -1) {
	//Zotero.debug("Single item detected");
	return getArticleType(doc, url, nsResolver);

  }
}



function doWeb(doc, url) {
  var namespace = doc.documentElement.namespaceURI;
  var nsResolver = namespace ?
  function (prefix) {
	if (prefix == 'x') return namespace;
	else return null;
  } : null;

  var URIs = new Array();
  var items = new Object();
  if (detectWeb(doc, url) == "multiple") {

	var xpath = '//tr/td/a[@target="_self"]';
	var articles = doc.evaluate(xpath, doc, nsResolver, XPathResult.ANY_TYPE, null);
	var next_art = articles.iterateNext();
	while (next_art) {
	  items[next_art.href] = next_art.textContent;
	  next_art = articles.iterateNext();
	}

	Zotero.selectItems(items, function (items) {
	  if (!items) {
		Zotero.done();
		return true;
	  }
	  for (var i in items) {
		URIs.push(i);
	  }
	  Zotero.Utilities.processDocuments(URIs, scrape, function () {
		Zotero.done();
	  });
	});
  } else {
	URIs.push(url);
	Zotero.Utilities.processDocuments(URIs, scrape, function () {
	  Zotero.done();
	});
  }
}
//get abstract where possible - this fails frequently

function scrape(doc) {
  var xpath = '//div/div[@style="display:inline"]|//div[@id="abstract"]//div';
  var abs = getText(xpath, doc);

  //get genric URL
  var url = getText('//meta[@name="citation_abstract_html_url"]/@content', doc);
  //Zotero.debug('generic URL: ' + url);
  var matchtest = url.match(/[0-9]+\.[0-9]+/);

  //get item ID and parent ID
  //Some items have no parent ID - set the parent ID for them to empty
  if (url.match(/[0-9]+\.[0-9]/) != null) {
	var itemid = String(url.match(/\.[0-9]+/)).replace(/\./, '');
	var parentid = String(url.match(/id\=[0-9]+/)).replace(/id\=/, "");
  } else {
	var itemid = String(url.match(/id\=[0-9]+/)).replace(/id\=/, "");
	var parentid = "";
  }

  //compose bibtex URL
  var bibtexstring = 'id=' + itemid + '&parent_id=' + parentid + '&expformat=bibtex';
  var bibtexURL = url.replace(/citation\.cfm/, "exportformats.cfm").replace(/id\=.+/, bibtexstring);
  Zotero.debug('bibtex URL: ' + bibtexURL);
  Zotero.Utilities.HTTP.doGet(bibtexURL, function (text) {
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
	translator.setString(text);
	//Zotero.debug('bibtex data: ' + text);
	translator.setHandler("itemDone", function (obj, item) {
	  //get the URL for the pdf fulltext from the metadata
	  var pdfURL = getText('//meta[@name="citation_pdf_url"]/@content', doc);
	  item.attachments = [{
		url: pdfURL,
		title: "ACM Full Text PDF",
		mimeType: "application/pdf"
	  }];
	  //fix DOIs if they're in URL form
	  if (item.DOI) item.DOI = item.DOI.replace(/^.*\/10\./, "10.");
	  //The Abstract from above - may or may not work
	  if (abs) item.abstractNote = abs;
	  //Conference Locations shouldn't go int Loc in Archive (nor should anything else)
	  item.archiveLocation = "";
	  // some bibtext contains odd </kwd> tags - remove them
	  if (item.tags) item.tags = String(item.tags).replace(/\<\/kwd\>/g, "").split(",");
	  if (item.itemType == detectWeb(doc,url)){
	  item.complete();
	  }
	  else return "false"
	});


	translator.translate();
  });
}

//Simon's helper funcitons.
/**
 * Find out what kind of document this is by checking google metadata
 * @param doc The XML document describing the page
 * @param url The URL of the page being scanned
 * @param nsResolver the namespace resolver function
 * @return a string with either "multiple", "journalArticle",  "conferencePaper", or "book" in it, depending on the type of document
 */

function getArticleType(doc, url, nsResolver) {
  //var toc = doc.evaluate(tocX, doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
  if (url.indexOf("results.cfm") != -1) {
	//Zotero.debug("Type: multiple");
	return "multiple";
  }

  var conference = getText('//meta[@name="citation_conference"]/@content', doc);
  var journal = getText('//meta[@name="citation_journal_title"]/@content', doc);
  //Zotero.debug(conference);
  if (conference.indexOf(" ") != -1) return "conferencePaper";
  else if (journal.indexOf(" ") != -1) return "journalArticle";
  else return "book";

}

/**
 * Get the text from the first node defined by the given xPathString
 * @param pathString the XPath indicating which node to get the text from
 * @param doc The XML document describing the page
 * @param nsResolver the namespace resolver function
 * @return the text in the defined node or "Unable to scrape text" if the node was not found or if there was no text content
 */

function getText(pathString, doc, nsResolver) {
  var path = doc.evaluate(pathString, doc, nsResolver, XPathResult.ANY_TYPE, null);
  var node = path.iterateNext();

  if (node == null || node.textContent == undefined || node.textContent == null) {
	//Zotero.debug("Unable to retrieve text for XPath: " + pathString);
	return "";
  }

  return node.textContent;
}

/**
 * Get a function for returning the namespace of a given document given its prefix
 * @param nsResolver the namespace resolver function
 */

function getNsResolver(doc) {
  var namespace = doc.documentElement.namespaceURI;
  var nsResolver = namespace ?
  function (prefix) {
	if (prefix == 'x') return namespace;
	else return null;
  } : null;

  return nsResolver;
} /** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://dl.acm.org/citation.cfm?id=1596682&preflayout=tabs",
		"items": [
			{
				"itemType": "conferencePaper",
				"creators": [
					{
						"firstName": "Nagy",
						"lastName": "Mostafa",
						"creatorType": "author"
					},
					{
						"firstName": "Chandra",
						"lastName": "Krintz",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"calling context tree",
					"performance-aware revision control",
					"profiling"
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://dl.acm.org/ft_gateway.cfm?id=1596682&type=pdf",
						"title": "ACM Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Tracking performance across software revisions",
				"publicationTitle": "Proceedings of the 7th International Conference on Principles and Practice of Programming in Java",
				"series": "PPPJ '09",
				"date": "2009",
				"ISBN": "978-1-60558-598-7",
				"pages": "162–171",
				"url": "http://doi.acm.org/10.1145/1596655.1596682",
				"DOI": "10.1145/1596655.1596682",
				"publisher": "ACM",
				"place": "New York, NY, USA",
				"libraryCatalog": "ACM Digital Library",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://dl.acm.org/citation.cfm?id=1717186&coll=DL&dl=GUIDE&CFID=48452129&CFTOKEN=58065473",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Jon",
						"lastName": "Loeliger",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "",
						"title": "ACM Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Version Control with Git: Powerful Tools and Techniques for Collaborative Software Development",
				"date": "2009",
				"ISBN": "0596520123, 9780596520120",
				"edition": "1st",
				"publisher": "O'Reilly Media, Inc.",
				"libraryCatalog": "ACM Digital Library",
				"shortTitle": "Version Control with Git"
			}
		]
	},
	{
		"type": "web",
		"url": "http://dl.acm.org/citation.cfm?id=254650.257486&coll=DL&dl=GUIDE&CFID=48452129&CFTOKEN=58065473",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Mick",
						"lastName": "Tegethoff",
						"creatorType": "author"
					},
					{
						"firstName": "Tom",
						"lastName": "Chen",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"DFM",
					"DFT",
					"MCM",
					"SMT",
					"board",
					"simulation",
					"test",
					"yield"
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://dl.acm.org/ft_gateway.cfm?id=257486&type=pdf",
						"title": "ACM Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Simulation Techniques for the Manufacturing Test of MCMs",
				"publicationTitle": "J. Electron. Test.",
				"volume": "10",
				"issue": "1-2",
				"date": "February 1997",
				"ISSN": "0923-8174",
				"pages": "137–149",
				"url": "http://dx.doi.org/10.1023/A:1008286901817",
				"DOI": "10.1023/A:1008286901817",
				"publisher": "Kluwer Academic Publishers",
				"place": "Norwell, MA, USA",
				"libraryCatalog": "ACM Digital Library",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/