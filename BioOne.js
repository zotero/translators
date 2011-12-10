{
	"translatorID": "7cb0089b-9551-44b2-abca-eb03cbf586d9",
	"label": "BioOne",
	"creator": "Michael Berkowitz",
	"target": "http://[^/]*www.bioone.org[^/]*/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-12-10 15:39:56"
}

/*
BioOne Translator
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
  else if(url.match(/\/action\/doSearch|\/toc\//))	return "multiple";
}


function doWeb(doc, url) {
  var namespace = doc.documentElement.namespaceURI;
  var nsResolver = namespace ? function(prefix) {
    if (prefix == 'x') return namespace; else return null;
		} : null;
  var arts = new Array();
  if (detectWeb(doc, url) == "multiple") {
    var items = new Object();
    var rows = ZU.xpath(doc, '//div[@class="searchEntry"]');
    for (var i in rows) {
     var title = ZU.xpathText(rows[i], './/h4[@class="searchTitle"]');
			var id = ZU.xpath(rows[i], './/p[@class="searchEntryTools"]/a')[0].href;
			items[id] = title;
		}
    Zotero.selectItems(items, function(items){
			 if(!items) {
			   return true;
			 }
			 citationurls = new Array();
			 for (var itemurl in items) {
			 	//Z.debug(itemurl)
			 	//some search results have some "baggage" at the end - remove
			   citationurls.push(itemurl.replace(/\?prev.+/, "").replace(/\/doi\/abs\//, "/action/showCitFormats?doi="));
			 }
			 getpages(citationurls);
		       });

  } else {
    var citationurl = url.replace(/\/doi\/abs\/|\/doi\/full\//, "/action/showCitFormats?doi=");
    //Z.debug(citationurl)
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
  //Z.debug(newurl);
  var pdfurl = newurl.replace(/\/action\/showCitFormats\?doi=/, "/doi/pdf/");
  var absurl = newurl.replace(/\/action\/showCitFormats\?doi=/, "/doi/abs/");
  var doi = doc.evaluate('//form[@target="_self"]/input[@name="doi"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().value;
  var filename = doc.evaluate('//form[@target="_self"]/input[@name="downloadFileName"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().value;
  //	Z.debug(filename);
  var get = 'http://www.bioone.org/action/downloadCitation';
  var post = 'doi=' + doi + '&downloadFileName=' + filename + '&format=ris&direct=true&include=cit';
  Zotero.Utilities.HTTP.doPost(get, post, function(text) {
	var translator = Zotero.loadTranslator("import");
	// Calling the RIS translator
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
	translator.setString(text);
	translator.setHandler("itemDone", function(obj, item) {
		item.url = absurl;
		item.notes = [];
		item.attachments = [
			{url:pdfurl, title:"BioOne PDF fulltext", mimeType:"application/pdf"},
			{url:absurl, title:"BioOne Snapshot", mimeType:"text/html"}
		];
		item.complete();
	});
	translator.translate();
  });
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.bioone.org/doi/full/10.4202/app.2010.0005",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Figueirido",
						"firstName": "Borja",
						"creatorType": "author"
					},
					{
						"lastName": "Pérez-Claros",
						"firstName": "Juan A.",
						"creatorType": "author"
					},
					{
						"lastName": "Hunt",
						"firstName": "Robert M.",
						"creatorType": "author"
					},
					{
						"lastName": "Palmqvist",
						"firstName": "Paul",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.bioone.org/doi/pdf/10.4202/app.2010.0005",
						"title": "BioOne PDF fulltext",
						"mimeType": "application/pdf"
					},
					{
						"url": "http://www.bioone.org/doi/abs/10.4202/app.2010.0005",
						"title": "BioOne Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Body Mass Estimation in Amphicyonid Carnivoran Mammals: A Multiple Regression Approach from the Skull and Skeleton",
				"date": "2011",
				"DOI": "10.4202/app.2010.0005",
				"publicationTitle": "Acta Palaeontologica Polonica",
				"pages": "225-246",
				"volume": "56",
				"issue": "2",
				"publisher": "Institute of Paleobiology, Polish Academy of Sciences",
				"ISBN": "0567-7920",
				"ISSN": "0567-7920",
				"url": "http://www.bioone.org/doi/abs/10.4202/app.2010.0005",
				"accessDate": "2011/12/10",
				"libraryCatalog": "BioOne",
				"shortTitle": "Body Mass Estimation in Amphicyonid Carnivoran Mammals"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.bioone.org/doi/abs/10.1896/020.011.0101",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Antonio Araújo Xavier",
						"firstName": "Gileno",
						"creatorType": "author"
					},
					{
						"lastName": "Borstelmann de Oliveira",
						"firstName": "Maria Adélia",
						"creatorType": "author"
					},
					{
						"lastName": "Alves Quirino",
						"firstName": "Adriana",
						"creatorType": "author"
					},
					{
						"lastName": "Aparecido Mota",
						"firstName": "Rinaldo",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.bioone.org/doi/pdf/10.1896/020.011.0101",
						"title": "BioOne PDF fulltext",
						"mimeType": "application/pdf"
					},
					{
						"url": "http://www.bioone.org/doi/abs/10.1896/020.011.0101",
						"title": "BioOne Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Albinismo Total em Preguiças-de-Garganta-Marrom Bradypus variegatus (Schinz, 1825) no Estado de Pernambuco, Brasil",
				"date": "2010",
				"DOI": "10.1896/020.011.0101",
				"publicationTitle": "Edentata",
				"pages": "1-3",
				"publisher": "IUCN/SSC Anteater, Sloth and Armadillo Specialist Group",
				"ISBN": "1413-4411",
				"ISSN": "1413-4411",
				"url": "http://www.bioone.org/doi/abs/10.1896/020.011.0101",
				"accessDate": "2011/12/10",
				"libraryCatalog": "BioOne"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.bioone.org/toc/eden//11",
		"items": "multiple"
	}
]
/** END TEST CASES **/
