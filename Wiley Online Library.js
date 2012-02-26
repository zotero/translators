{
	"translatorID": "fe728bc9-595a-4f03-98fc-766f1d8d0936",
	"label": "Wiley Online Library",
	"creator": "Sean Takats, Michael Berkowitz, Avram Lyon and Aurimas Vinckevicius",
	"target": "^https?://onlinelibrary\\.wiley\\.com[^\\/]*/(?:book|doi|advanced/search)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-02-26 03:35:06"
}

/*
   Wiley Online Translator
   Copyright (C) 2011 CHNM, Avram Lyon and Aurimas Vinckevicius

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

function addCreators(item, creatorType, creators) {
	if( typeof(creators) == 'string' ) {
		creators = [creators];
	} else if( !(creators instanceof Array) ) {
		return;
	}

	for(var i=0, n=creators.length; i<n; i++) {
		item.creators.push(ZU.cleanAuthor(creators[i], creatorType, false));
	}
}

function getAuthorName(text) {
	text = text.replace(/\b[a-z]+\b/g,'');	//anything that does not contain
											//an upper case letter is not a name

	text = text.replace(/\b(PhD|MA)\b/gi,'');	//remove salutations

	return text.trim();
}

function scrape(doc, url) {
	var itemType = detectWeb(doc,url);

	if( itemType == 'book' ) {
		var title = doc.getElementById('productTitle');
		if( !title ) return false;

		var newItem = new Zotero.Item('book');
		newItem.title = ZU.capitalizeTitle(title.textContent);

		var data = ZU.xpath(doc, '//div[@id="metaData"]/p');
		var dataRe = /^(.+?):\s*(.+?)\s*$/;
		var match;
		var isbn = new Array();
		for( var i=0, n=data.length; i<n; i++) {
			match = dataRe.exec(data[i].textContent);
			if(!match) continue;

			switch(match[1].trim().toLowerCase()) {
				case 'author(s)':
					addCreators(newItem, 'author', match[2].split(', '));
					break;
				case 'series editor(s)':
					addCreators(newItem, 'seriesEditor', match[2].split(', '));
					break;
				case 'editor(s)':
					addCreators(newItem, 'editor', match[2].split(', '));
					break;
				case 'published online':
					var date = ZU.strToDate(match[2]);
					date.part = null;
					newItem.date = ZU.formatDate(date);
					break;
				case 'print isbn':
				case 'online isbn':
					isbn.push(match[2]);
					break;
				case 'doi':
					newItem.DOI = match[2];
					break;
				case 'book series':
					newItem.series = match[2];
			}
		}

		newItem.ISBN = isbn.join(', ');
		newItem.rights = ZU.xpathText(doc, '//div[@id="titleMeta"]/p[@class="copyright"]');
		newItem.url = url;
		//add abstract?
		newItem.accessDate = 'CURRENT_TIMESTAMP';

		newItem.complete();
	} else {
		var translator = Zotero.loadTranslator('web');
		//use Embedded Metadata
		translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
		translator.setDocument(doc);
		translator.setHandler('itemDone', function(obj, item) {
			if( itemType == 'bookSection' ) {
				var authors = ZU.xpath(doc, '//ol[@id="authors"]/li/node()[1]');
				for(var i=0, n=authors.length; i<n; i++) {
					item.creators.push(
						ZU.cleanAuthor( getAuthorName(authors[i].textContent),
											'author',false) );
				}
				item.rights = ZU.xpathText(doc, '//p[@id="copyright"]');
			} else {
				item.rights = ZU.xpathText(doc, '//div[@id="titleMeta"]/p[@class="copyright"]');
			}

			item.complete();
		});
		translator.translate();
	}
}

function detectWeb(doc, url) {	
	if( url.indexOf('/issuetoc') != -1 ||
		url.indexOf('/results') != -1 ) {
		return 'multiple';
	} else {
		if( url.indexOf('/book/') != -1 ) {
			return 'book';
		} else if ( ZU.xpath(doc, '//meta[@name="citation_book_title"]').length ) {
			return 'bookSection';
		} else {
			return 'journalArticle';
		}
	}
}

function doWeb(doc, url) {
	if(detectWeb(doc, url) == "multiple") {
		var articles = ZU.xpath(doc, '//li//div[@class="citation article" or starts-with(@class,"citation")]/a');
		var availableItems = new Object();
		for(var i=0, n=articles.length; i<n; i++) {
			availableItems[articles[i].href] = ZU.trimInternal(articles[i].textContent.trim());
		}

		Zotero.selectItems(availableItems, function(selectedItems) {
			if(!selectedItems) return true;

			var urls = new Array();
			for (var i in selectedItems) {
				urls.push(i);
			}

			ZU.processDocuments(urls, scrape);
		});
	} else { //single article
		if (url.indexOf("/pdf") != -1) {
			//redirect needs to work where URL end in /pdf and where it end in /pdf/something
			url = url.replace(/\/pdf(.+)?$/,'/abstract');
			//Zotero.debug("Redirecting to abstract page: "+url);
			ZU.processDocuments(url, scrape);
		} else {
			scrape(doc, url);
		}
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/advanced/search/results/reentry?scope=allContent&query=zotero&inTheLastList=6&queryStringEntered=false&searchRowCriteria[0].fieldName=all-fields&searchRowCriteria[0].booleanConnector=and&searchRowCriteria[1].fieldName=all-fields&searchRowCriteria[1].booleanConnector=and&searchRowCriteria[2].fieldName=all-fields&searchRowCriteria[2].booleanConnector=and&start=1&resultsPerPage=20&ordering=relevancy",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/doi/10.1002/ange.200906501/abstract",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Peter",
						"lastName": "Gölitz",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"url": "http://onlinelibrary.wiley.com/doi/10.1002/ange.200906501/pdf",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"document": {
							"location": {}
						}
					}
				],
				"title": "Twitter, Facebook und Open Access …",
				"date": "2010/01/04",
				"publicationTitle": "Angewandte Chemie",
				"volume": "122",
				"issue": "1",
				"publisher": "WILEY‐VCH Verlag",
				"ISSN": "1521-3757",
				"DOI": "10.1002/ange.200906501",
				"url": "http://onlinelibrary.wiley.com/doi/10.1002/ange.200906501/abstract",
				"language": "de",
				"pages": "4-6",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "onlinelibrary.wiley.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/doi/10.1002/9781118269381.notes/summary",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "Curtis J.",
						"lastName": "Bonk",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"url": "http://onlinelibrary.wiley.com/doi/10.1002/9781118269381.notes/pdf",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"document": {
							"location": {}
						}
					}
				],
				"title": "Endnotes",
				"bookTitle": "The World is Open",
				"publisher": "Jossey‐Bass",
				"ISBN": "9781118269381",
				"DOI": "10.1002/9781118269381.notes",
				"url": "http://onlinelibrary.wiley.com/doi/10.1002/9781118269381.notes/summary",
				"language": "en",
				"pages": "427-467",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "onlinelibrary.wiley.com",
				"rights": "Copyright © 2009 Curtis J. Bonk. All rights reserved."
			}
		]
	},
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/doi/10.1111/jgi.2004.19.issue-s1/issuetoc",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/doi/10.1111/j.1525-1497.2004.S1006_5.x/citedby",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"url": "http://onlinelibrary.wiley.com/doi/10.1111/j.1525-1497.2004.S1006_5.x/pdf",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"document": {
							"location": {}
						}
					}
				],
				"title": "SCIENTIFIC ABSTRACTS",
				"date": "2004/04/01",
				"publicationTitle": "Journal of General Internal Medicine",
				"volume": "19",
				"publisher": "Blackwell Science Inc",
				"ISSN": "1525-1497",
				"DOI": "10.1111/j.1525-1497.2004.S1006_5.x",
				"url": "http://onlinelibrary.wiley.com/doi/10.1111/j.1525-1497.2004.S1006_5.x/citedby",
				"language": "en",
				"pages": "109-241",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "onlinelibrary.wiley.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/doi/10.1111/j.1525-1497.2004.S1006_5.x/full",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"url": "http://onlinelibrary.wiley.com/doi/10.1111/j.1525-1497.2004.S1006_5.x/pdf",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"document": {
							"location": {}
						}
					}
				],
				"title": "SCIENTIFIC ABSTRACTS",
				"date": "2004/04/01",
				"publicationTitle": "Journal of General Internal Medicine",
				"volume": "19",
				"publisher": "Blackwell Science Inc",
				"ISSN": "1525-1497",
				"DOI": "10.1111/j.1525-1497.2004.S1006_5.x",
				"url": "http://onlinelibrary.wiley.com/doi/10.1111/j.1525-1497.2004.S1006_5.x/full",
				"language": "en",
				"pages": "109-241",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "onlinelibrary.wiley.com"
			}
		]
	},
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/book/10.1002/9783527610853",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Dietrich",
						"lastName": "Papenfuß",
						"creatorType": "editor"
					},
					{
						"firstName": "Dieter",
						"lastName": "Lüst",
						"creatorType": "editor"
					},
					{
						"firstName": "Wolfgang P.",
						"lastName": "Schleich",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "100 Years Werner Heisenberg: Works and Impact",
				"date": "November 29, 2007",
				"DOI": "10.1002/9783527610853",
				"ISBN": "9783527403929, 9783527610853",
				"rights": "Copyright © 2002 Wiley-VCH Verlag GmbH",
				"url": "http://onlinelibrary.wiley.com/book/10.1002/9783527610853",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "Wiley Online Library",
				"shortTitle": "100 Years Werner Heisenberg"
			}
		]
	},
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/doi/10.1002/9781444304794.ch1/summary",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "Tatjana",
						"lastName": "Pavlović",
						"creatorType": "author"
					},
					{
						"firstName": "Inmaculada",
						"lastName": "Alvarez",
						"creatorType": "author"
					},
					{
						"firstName": "Rosana",
						"lastName": "Blanco-Cano",
						"creatorType": "author"
					},
					{
						"firstName": "Anitra",
						"lastName": "Grisales",
						"creatorType": "author"
					},
					{
						"firstName": "Alejandra",
						"lastName": "Osorio",
						"creatorType": "author"
					},
					{
						"firstName": "Alejandra",
						"lastName": "Sá",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"url": "http://onlinelibrary.wiley.com/doi/10.1002/9781444304794.ch1/pdf",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"document": {
							"location": {}
						}
					}
				],
				"title": "Silent Cinema and its Pioneers (1906–1930)",
				"bookTitle": "100 Years of Spanish Cinema",
				"publisher": "Wiley‐Blackwell",
				"ISBN": "9781444304794",
				"DOI": "10.1002/9781444304794.ch1",
				"url": "http://onlinelibrary.wiley.com/doi/10.1002/9781444304794.ch1/summary",
				"language": "en",
				"pages": "1-20",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "onlinelibrary.wiley.com",
				"rights": "Copyright © 2009 Tatjana Pavlović, Inmaculada Alvarez, Rosana Blanco-Cano, Anitra Grisales, Alejandra Osorio, and Alejandra Sánchez"
			}
		]
	},
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/book/10.1002/9781444390124",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Anthony C.",
						"lastName": "Thiselton",
						"creatorType": "author"
					},
					{
						"firstName": "John",
						"lastName": "Sawyer",
						"creatorType": "seriesEditor"
					},
					{
						"firstName": "Christopher",
						"lastName": "Rowland",
						"creatorType": "seriesEditor"
					},
					{
						"firstName": "Judith",
						"lastName": "Kovacs",
						"creatorType": "seriesEditor"
					},
					{
						"firstName": "David M.",
						"lastName": "Gunn",
						"creatorType": "seriesEditor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "1 & 2 Thessalonians: Through the Centuries",
				"date": "March 24, 2011",
				"DOI": "10.1002/9781444390124",
				"ISBN": "9781405196826, 9781444390124",
				"rights": "Copyright © 2011 Anthony C. Thiselton",
				"url": "http://onlinelibrary.wiley.com/book/10.1002/9781444390124",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "Wiley Online Library",
				"shortTitle": "1 & 2 Thessalonians"
			}
		]
	},
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/book/10.1002/9780470320419",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "William",
						"lastName": "Smothers",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "14th Automotive Materials Conference: Ceramic Engineering and Science Proceedings, Volume 8, Issue 9/10",
				"date": "March 27, 2008",
				"DOI": "10.1002/9780470320419",
				"series": "Ceramic Engineering and Science Proceedings",
				"ISBN": "9780470374740, 9780470320419",
				"rights": "Copyright © 1987 The American Ceramic Society, Inc.",
				"url": "http://onlinelibrary.wiley.com/book/10.1002/9780470320419",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "Wiley Online Library",
				"shortTitle": "14th Automotive Materials Conference"
			}
		]
	}
]
/** END TEST CASES **/