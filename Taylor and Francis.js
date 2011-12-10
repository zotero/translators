{
	"translatorID": "dac476e4-401d-430a-8571-a97c31c3b65e",
	"label": "Taylor&Francis",
	"creator": "Sebastian Karcher",
	"target": "^http://www\\.tandfonline\\.com",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2011-12-10 15:53:22"
}

/*
Taylor and Francis Translator
Copyright (C) 2011 Sebastian Karcher

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
  if (url.match(/\/doi\/abs\/10\.|\/doi\/full\/10\./))	return "journalArticle";
  else if(url.match(/\/action\/doSearch\?|\/toc\//))	return "multiple";
}


function doWeb(doc, url) {
  var namespace = doc.documentElement.namespaceURI;
  var nsResolver = namespace ? function(prefix) {
	if (prefix == 'x') return namespace; else return null;
		} : null;
  var arts = new Array();
  if (detectWeb(doc, url) == "multiple") {
	var items = new Object();
	var titles = doc.evaluate('//label[@class="resultTitle"]/a|//a[@class="entryTitle"]', doc, nsResolver, XPathResult.ANY_TYPE, null);
	var title;
	while (title = titles.iterateNext()) {
	  items[title.href] = title.textContent;
		}
	Zotero.selectItems(items, function(items){
			 if(!items) {
			   return true;
			 }
			 citationurls = new Array();
			 for (var itemurl in items) {
			   citationurls.push(itemurl.replace(/\/doi\/abs\/|\/doi\/full\//, "/action/showCitFormats?doi="));
			 }
			 getpages(citationurls);
			   });

  } else {
	var citationurl = url.replace(/\/doi\/abs\/|\/doi\/full\//, "/action/showCitFormats?doi=");
	getpages(citationurl);
  }
  Zotero.wait();
}

function getpages(citationurl) {
	//we work entirely from the citations page
  Zotero.Utilities.processDocuments(citationurl, function(doc) {
					  scrape(doc);
	}, function() { Zotero.done() });
}


function scrape (doc) {
  var newurl = doc.location.href;
  var pdfurl = newurl.replace(/\/action\/showCitFormats\?doi=/, "/doi/pdf/");
  var absurl = newurl.replace(/\/action\/showCitFormats\?doi=/, "/doi/abs/");
  var doi = doc.evaluate('//form[@target="_self"]/input[@name="doi"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().value;
  var filename = doc.evaluate('//form[@target="_self"]/input[@name="downloadFileName"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().value;
  //	Z.debug(filename);
  var get = 'http://www.tandfonline.com/action/downloadCitation';
  var post = 'doi=' + doi + '&downloadFileName=' + filename + '&format=ris&direct=true&include=abs';
  Zotero.Utilities.HTTP.doPost(get, post, function(text) {
	var translator = Zotero.loadTranslator("import");
	// Calling the RIS translator
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
	translator.setString(text);
	translator.setHandler("itemDone", function(obj, item) {
		item.url = absurl;
		item.notes = [];
		item.attachments = [
			{url:pdfurl, title:"T&F PDF fulltext", mimeType:"application/pdf"},
			{url:absurl, title:"T&F Snapshot", mimeType:"text/html"}
		];
		item.complete();
	});
	translator.translate();
  });
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.tandfonline.com/action/doSearch?type=simple&filter=multiple&stemming=yes&searchText=labor+market&x=0&y=0&publication=",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.tandfonline.com/doi/abs/10.1080/17487870802543480",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Chong",
						"firstName": "Alberto",
						"creatorType": "author"
					},
					{
						"lastName": "Galdo",
						"firstName": "Jose",
						"creatorType": "author"
					},
					{
						"lastName": "Saavedra",
						"firstName": "Jaime",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.tandfonline.com/doi/pdf/10.1080/17487870802543480",
						"title": "T&F PDF fulltext",
						"mimeType": "application/pdf"
					},
					{
						"url": "http://www.tandfonline.com/doi/abs/10.1080/17487870802543480",
						"title": "T&F Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Informality and productivity in the labor market in Peru",
				"date": "2008",
				"DOI": "10.1080/17487870802543480",
				"publicationTitle": "Journal of Economic Policy Reform",
				"pages": "229-245",
				"volume": "11",
				"issue": "4",
				"publisher": "Routledge",
				"abstractNote": "This article analyzes the evolution of informal employment in Peru from 1986 to 2001. Contrary to what one would expect, the informality rates increased steadily during the 1990s despite the introduction of flexible contracting mechanisms, a healthy macroeconomic recovery, and tighter tax codes and regulation. We explore different factors that may explain this upward trend including the role of labor legislation and labor allocation between/within sectors of economic activity. Finally, we illustrate the negative correlation between productivity and informality by evaluating the impacts of the Youth Training PROJOVEN Program that offers vocational training to disadvantaged young individuals. We find significant training impacts on the probability of formal employment for both males and females.\nThis article analyzes the evolution of informal employment in Peru from 1986 to 2001. Contrary to what one would expect, the informality rates increased steadily during the 1990s despite the introduction of flexible contracting mechanisms, a healthy macroeconomic recovery, and tighter tax codes and regulation. We explore different factors that may explain this upward trend including the role of labor legislation and labor allocation between/within sectors of economic activity. Finally, we illustrate the negative correlation between productivity and informality by evaluating the impacts of the Youth Training PROJOVEN Program that offers vocational training to disadvantaged young individuals. We find significant training impacts on the probability of formal employment for both males and females.",
				"ISBN": "1748-7870",
				"ISSN": "1748-7870",
				"url": "http://www.tandfonline.com/doi/abs/10.1080/17487870802543480",
				"accessDate": "2011/12/05",
				"libraryCatalog": "Taylor&Francis"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.tandfonline.com/toc/clah20/22/4",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.tandfonline.com/doi/full/10.1080/17487870802543480",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Chong",
						"firstName": "Alberto",
						"creatorType": "author"
					},
					{
						"lastName": "Galdo",
						"firstName": "Jose",
						"creatorType": "author"
					},
					{
						"lastName": "Saavedra",
						"firstName": "Jaime",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.tandfonline.com/doi/pdf/10.1080/17487870802543480",
						"title": "T&F PDF fulltext",
						"mimeType": "application/pdf"
					},
					{
						"url": "http://www.tandfonline.com/doi/abs/10.1080/17487870802543480",
						"title": "T&F Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Informality and productivity in the labor market in Peru",
				"date": "2008",
				"DOI": "10.1080/17487870802543480",
				"publicationTitle": "Journal of Economic Policy Reform",
				"pages": "229-245",
				"volume": "11",
				"issue": "4",
				"publisher": "Routledge",
				"abstractNote": "This article analyzes the evolution of informal employment in Peru from 1986 to 2001. Contrary to what one would expect, the informality rates increased steadily during the 1990s despite the introduction of flexible contracting mechanisms, a healthy macroeconomic recovery, and tighter tax codes and regulation. We explore different factors that may explain this upward trend including the role of labor legislation and labor allocation between/within sectors of economic activity. Finally, we illustrate the negative correlation between productivity and informality by evaluating the impacts of the Youth Training PROJOVEN Program that offers vocational training to disadvantaged young individuals. We find significant training impacts on the probability of formal employment for both males and females.\nThis article analyzes the evolution of informal employment in Peru from 1986 to 2001. Contrary to what one would expect, the informality rates increased steadily during the 1990s despite the introduction of flexible contracting mechanisms, a healthy macroeconomic recovery, and tighter tax codes and regulation. We explore different factors that may explain this upward trend including the role of labor legislation and labor allocation between/within sectors of economic activity. Finally, we illustrate the negative correlation between productivity and informality by evaluating the impacts of the Youth Training PROJOVEN Program that offers vocational training to disadvantaged young individuals. We find significant training impacts on the probability of formal employment for both males and females.",
				"ISBN": "1748-7870",
				"ISSN": "1748-7870",
				"url": "http://www.tandfonline.com/doi/abs/10.1080/17487870802543480",
				"accessDate": "2011/12/10",
				"libraryCatalog": "Taylor&Francis"
			}
		]
	}
]
/** END TEST CASES **/
