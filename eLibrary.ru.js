{
	"translatorID": "587709d3-80c5-467d-9fc8-ed41c31e20cf",
	"label": "eLibrary.ru",
	"creator": "Avram Lyon",
	"target": "^https?://elibrary\\.ru/",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2016-09-13 22:35:27"
}

/*
	***** BEGIN LICENSE BLOCK *****

	eLibrary.ru Translator
	Copyright © 2010-2011 Avram Lyon, ajlyon@gmail.com

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

function detectWeb(doc, url){
	if (url.match(/\/item.asp/)) {
		return "journalArticle";
	} else if (url.match(/\/(query_results|contents|org_items|itembox_items)\.asp/)){
		return "multiple";
	}
}

function doWeb(doc, url){
	var articles = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var results = doc.evaluate('//table[@id="restab"]//tr[@bgcolor = "#f5f5f5"]/td[2]', doc, null,XPathResult.ANY_TYPE, null);
		var items = {};
		var result;
		while(result = results.iterateNext()) {
			var link = doc.evaluate('./a', result, null,XPathResult.ANY_TYPE, null).iterateNext();
			var title = link.textContent;
			var url = link.href;
			items[url] = title;
		}
		Zotero.selectItems(items, function (items) {
				if (!items) {
					return true;
				}
				for (i in items) {
					articles.push(i);
				}
				Zotero.Utilities.processDocuments(articles, scrape);
		});
		} else {
			scrape(doc);
		}
}

function scrape (doc) {
		var datablock = ZU.xpath(doc, '//td[@align="left" and @valign="top"]//tr[2]/td[@align="left" and @valign="top"]');
		
		var item = new Zotero.Item();
		/*var pdf = false;
		// Now see if we have a free PDF to download
		var pdfImage = doc.evaluate('//a/img[@src="/images/pdf_green.gif"]', doc, null,XPathResult.ANY_TYPE, null).iterateNext();
		if (pdfImage) {
			// A green PDF is a free one. We need to construct the POST request
			var postData = [], postField;
			var postNode = doc.evaluate('//form[@name="results"]/input', doc, null,XPathResult.ANY_TYPE, null);
			while ((postField = postNode.iterateNext()) !== null) {
				postData.push(postField.name + "=" +postField.value);
			}
			postData = postData.join("&");
			Zotero.debug(postData + postNode.iterateNext());
			Zotero.Utilities.HTTP.doPost('http://elibrary.ru/full_text.asp', postData, function(text) {
				var href = text.match(/http:\/\/elibrary.ru\/download\/.*?\.pdf/)[0];
				pdf = {url:href, title:"eLibrary.ru полный текст", mimeType:"application/pdf"};
			});
		}*/

		var m = doc.title.match(/eLIBRARY.RU - (.*)/);
		if (m) {
			item.title = m[1];
		} else {
			item.title = doc.title;
		}
		
		var title = ZU.xpathText(datablock, "./table[1]");
		var authorBlock = ZU.xpath(datablock, "./table[2]");
		
		if (authorBlock) {
			
		// Sometimes we don't have links, just bold text
		var authorNode = doc.evaluate('.//td[2]/span//b', authorBlock[0], null,XPathResult.ANY_TYPE, null);
		while ((author = authorNode.iterateNext()) !== null) {
			// Remove organizations; by URL or by node name
			if ((author.href && !author.href.match(/org_about\.asp/)
							 && !author.href.match(/org_items\.asp/))
					|| author.nodeName == "B") { 
				author = author.textContent;
				var authors = author.split(",");
				for (var i = 0; i < authors.length; i++) {
					/**Some names listed as last first_initials (no comma), so we need
					 * to fix this by placing a comma in-between.
					 * Also note that the space between last and first is nbsp
					 */
					 var cleaned = authors[i];
					 var useComma = false;
					 if(cleaned.match(/[\s\u00A0]([A-Z\u0400-\u042f]\.?[\s\u00A0]*)+$/)) {
						cleaned = cleaned.replace(/[\u00A0\s]/,', ');
						useComma = true;
					 }

					cleaned = ZU.cleanAuthor(cleaned, "author", useComma);
					// If we have only one name, set the author to one-name mode
					if (cleaned.firstName == "") {
						cleaned["fieldMode"] = true;
					} else {
						// We can check for all lower-case and capitalize if necessary
						// All-uppercase is handled by cleanAuthor
						cleaned.firstName = (cleaned.firstName == cleaned.firstName.toLowerCase()) ?
							Zotero.Utilities.capitalizeTitle(cleaned.firstName, true) : cleaned.firstName;
						cleaned.lastName = (cleaned.lastName == cleaned.lastName.toLowerCase()) ?
							Zotero.Utilities.capitalizeTitle(cleaned.lastName, true) : cleaned.lastName;
					}
					// Skip entries with an @ sign-- email addresses slip in otherwise
					if (cleaned.lastName.indexOf("@") === -1) item.creators.push(cleaned);
				}
			} else { Zotero.debug("Skipping presumed affiliation: " + author.textContent) ; } 
		}
		}
		
		var mapping = {
			"Журнал" : "publicationTitle",
			"Издательство" : "publisher",
			"Год" : "date",// "Год выпуска:": "Год издания:"
			"Том" : "volume",
			"Номер" : "issue",
			"ISSN" : "ISSN",
			"Страницы" : "pages",
			"Язык" : "language",
			"Место издания" : "place",
			"Цит. в РИНЦ" : "extra",
			"Тип " : "itemType"
		};
		for (var key in mapping) {
			var t = ZU.xpathText(doc, '//tr/td/text()[contains(., "' + key + '")]/following-sibling::*[1]');
			if (t) {
				item[mapping[key]] = t;
			}
		}
		
		if (item.extra) item.extra = "Цитируемость в РИНЦ: " + item.extra;
		
		var journalBlock = ZU.xpath(datablock, "./table[4]");
		item.publicationTitle = ZU.xpathText(journalBlock, ".//a[1]");
		item.ISSN = ZU.xpathText(journalBlock, ".//tr[2]//font[last()]");
	
		var keywordBlock = ZU.xpath(datablock, "./table[5]")[0];
		if (keywordBlock) {
			var tag, tagNode = doc.evaluate('.//td[2]/a', keywordBlock, null,XPathResult.ANY_TYPE, null);
			while ((tag = tagNode.iterateNext()) !== null)
					item.tags.push(tag.textContent);
		}
	
		var abstractBlock = ZU.xpath(datablock, "./table[6]")[0];
		if (abstractBlock)
			item.abstractNote = ZU.xpathText(abstractBlock, './tbody/tr[2]/td[2]/p');
		
		// Set type
		switch (item.itemType) {
			case "обзорная статья": // Would be "review article"
			case "научная статья":
			case "статья в журнале":
				item.itemType = "journalArticle";
				break;
			case "учебное пособие":
			case "монография":
				item.itemType = "book";
				break;
			case "публикация в сборнике трудов конференции":
				item.itemType = "conferencePaper";
				break;
			default:
				Zotero.debug("Unknown type: "+item.itemType+". Using 'journalArticle'");
				item.itemType = "journalArticle";
				break;
		}
		
		/*if (referenceBlock) {
			var note = Zotero.Utilities.trimInternal(
							doc.evaluate('./tbody/tr/td[2]/table', referenceBlock, null,XPathResult.ANY_TYPE, null)
							.iterateNext().textContent);
			Zotero.debug(note);
			item.notes.push(note);
		}*/
/*		
		if (codeBlock) {
			item.extra += ' '+ doc.evaluate('.//td[2]', codeBlock, null,XPathResult.ANY_TYPE, null).iterateNext().textContent;
 			var doi = item.extra.match(/DOI: (10\.[^\s]+)/);
 			if (doi) {
	 			item.DOI = doi[1];
	 			item.extra = item.extra.replace(/DOI: 10\.[^\s]+/,"");
	 		}
 		}
		
		
*/
		if (item.title.toUpperCase() == item.title) {
			Zotero.debug("Trying to fix all-uppers");
			item.title = item.title.substr(0,1) + item.title.toLowerCase().substr(1);
		}

		//if(pdf) item.attachments.push(pdf);
		
		item.complete();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://elibrary.ru/org_items.asp?orgsid=3326",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://elibrary.ru/item.asp?id=9541154",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Иноязычные заимствования в художественной прозе на иврите в XX в",
				"creators": [
					{
						"firstName": "М. В.",
						"lastName": "СВЕТ",
						"creatorType": "author"
					}
				],
				"date": "2007",
				"ISSN": "0320-8095",
				"issue": "1",
				"language": "русский",
				"libraryCatalog": "eLibrary.ru",
				"pages": "40-58",
				"publicationTitle": "ВЕСТНИК МОСКОВСКОГО УНИВЕРСИТЕТА. СЕРИЯ 13: ВОСТОКОВЕДЕНИЕ",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://elibrary.ru/item.asp?id=17339044",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Использование молекулярно-генетических методов установления закономерностей наследования для выявления доноров значимых признаков яблони",
				"creators": [
					{
						"firstName": "ИВАН ИВАНОВИЧ",
						"lastName": "СУПРУН",
						"creatorType": "author"
					},
					{
						"firstName": "ЕЛЕНА ВЛАДИМИРОВНА",
						"lastName": "УЛЬЯНОВСКАЯ",
						"creatorType": "author"
					},
					{
						"firstName": "ЕВГЕНИЙ НИКОЛАЕВИЧ",
						"lastName": "СЕДОВ",
						"creatorType": "author"
					},
					{
						"firstName": "ГАЛИНА АЛЕКСЕЕВНА",
						"lastName": "СЕДЫШЕВА",
						"creatorType": "author"
					},
					{
						"firstName": "ЗОЯ МИХАЙЛОВНА",
						"lastName": "СЕРОВА",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"ISSN": "2219-5335",
				"abstractNote": "На основе полученных новых знаний по формированию и проявлению ценных селекционных признаков выделены новые доноры и комплексные доноры значимых признаков яблони.",
				"issue": "13",
				"language": "русский",
				"libraryCatalog": "eLibrary.ru",
				"pages": "1-10",
				"publicationTitle": "ПЛОДОВОДСТВО И ВИНОГРАДАРСТВО ЮГА РОССИИ",
				"attachments": [],
				"tags": [
					"APPLE-TREE",
					"IMMUNITY",
					"SCAB",
					"VARIETY",
					"ИММУНИТЕТ",
					"ПАРША",
					"СОРТ",
					"ЯБЛОНЯ"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/