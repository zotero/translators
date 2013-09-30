{
	"translatorID": "4ea89035-3dc4-4ae3-b22d-726bc0d83a64",
	"label": "Galegroup",
	"creator": "Sebastian Karcher and Aurimas Vinckevicius",
	"target": "https?://(find|go)\\.galegroup\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2013-09-30 04:05:04"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Galegroup Translator - Copyright © 2012 Sebastian Karcher 
	This file is part of Zotero.
	
	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
	
	***** END LICENSE BLOCK *****
*/
function getSearchResults(doc) {
	//Gale Virtual Reference Library
	var results = ZU.xpath(doc, '//*[@id="SearchResults"]//section[@class="resultsBody"]/ul/li');
	if(results.length) {
		results.linkXPath = './p[@class="subTitle"]/a';
		composeAttachment = composeAttachmentGVRL;
		composeRisUrl = composeRisUrlGVRL;
		return results;
	}
	
	//Gale NewsVault
	results = ZU.xpath(doc, '//*[@id="results_list"]/div[contains(@class,"resultList")]');
	if(results.length) {
		results.linkXPath = './div[@class="pub_details"]//li[@class="resultInfo"]/p//a';
		composeAttachment = composeAttachmentGNV;
		composeRisUrl = composeRisUrlGNV;
		return results;
	}
	
	return [];
}

function detectWeb(doc, url) {
	if(url.indexOf('/newspaperRetrieve.do') != -1) {
		return "newspaperArticle";
	}
	
	if(url.indexOf('/retrieve.do') != -1
		|| url.indexOf('/i.do') != -1
		|| url.indexOf('/infomark.do') != -1) {
		
		if(url.indexOf('/ecco/') != -1) return "book";
		
		return "journalArticle";
	}
	
	if(getSearchResults(doc).length) return "multiple";
}

var composeRisUrl;

function composeRisUrlGNV(url) {
	return url.replace(/#.*/,'').replace(/\/[^\/?]+(?=\?|$)/, '/centralizedGenerateCitation.do')
		.replace(/\bactionString=[^&]*/g, '').replace(/\bcitationFormat=[^&]*/g, '')
		+ '&actionString=FormatCitation&citationFormat=ENDNOTE';
}

function composeRisUrlGVRL(url) {
	return url.replace(/#.*/,'').replace(/\/[^\/?]+(?=\?|$)/, '/generateCitation.do')
		.replace(/\bactionString=[^&]*/g, '').replace(/\bcitationFormat=[^&]*/g, '')
		+ '&actionString=FormatCitation&citationFormat=ENDNOTE';
}

var composeAttachment;

function composeAttachmentGVRL(doc, url) {
	var pdf = !!doc.getElementById('pdfLink');
	var attachment = ZU.xpath(doc, '//*[@id="docTools-download"]/a[./href/@text]')[0];
	if(attachment) {
		return {
			url: (url.replace(/#.*/, '') + '&downloadFormat=' + (pdf?'PDF':'HTML'))
				.replace(/\bactionCmd=[^&]*/, 'actionCmd=DO_DOWNLOAD_DOCUMENT'),
			title: "Full Text " + (pdf?'PDF':'HTML'),
			mimeType: pdf?'application/pdf':'text/html'
		};
	} else {
		return {document: doc, title: "Snapshot"};
	}
}

function composeAttachmentGNV(doc, url) {
	var lowerLimit = ZU.xpathText(doc, '//form[@id="resultsForm"]/input[@name="pdfLowerLimit"]/@value') || '1';
	var upperLimit = ZU.xpathText(doc, '//form[@id="resultsForm"]/input[@name="pdfHigherLimit"]/@value') || lowerLimit;
	var numPages = ZU.xpathText(doc, '//form[@id="resultsForm"]/input[@name="noOfPages"]/@value') || (upperLimit - lowerLimit + 1);
	return {
		url: url.replace(/#.*/,'').replace(/\/[^\/?]+(?=\?|$)/, '/downloadDocument.do')
			.replace(/\b(?:scale|orientation|docType|pageIndex|relatedDocId|isIllustration|imageId|aCmnd|recNum|pageRange|noOfPages)=[^&]*/g, '')
			+ '&scale=&orientation=&docType=&pageIndex=1&relatedDocId=&isIllustration=false'
			+ '&imageId=&aCmnd=PDFFormat&recNum=&' + 'noOfPages=' + numPages + '&pageRange=' + lowerLimit + '-' + upperLimit,
		title: 'Full Text PDF',
		mimeType: 'application/pdf'
	};
}

function parseRis(text, attachment) {
	text = text.trim();
	//gale puts issue numbers in M1
	text = text.replace(/M1\s*\-/, "IS  -");

	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
	translator.setString(text);
	translator.setHandler("itemDone", function (obj, item) {
		if(attachment) item.attachments.push(attachment);
		item.complete();
	});
	translator.translate();
}

function processArticles(articles) {
	var article;
	while(article = articles.shift()) {
		ZU.processDocuments(article, function(doc, url) {
			processPage(doc, url);
			processArticles(articles);
		});
	}
}

function processPage(doc, url) {
	var attachment = composeAttachment(doc, url);
	ZU.doGet(composeRisUrl(url), function(text) {
		parseRis(text, attachment);
	});
}

function doWeb(doc, url) {
	if(detectWeb(doc, url) == "multiple") {
		var results = getSearchResults(doc);
		var items = {};
		for(var i=0, n=results.length; i<n; i++) {
			var link = ZU.xpath(results[i], results.linkXPath)[0];
			if(!link) continue;
			
			items[link.href] = ZU.trimInternal(link.textContent);
		}
		
		Zotero.selectItems(items, function (items) {
			if(!items) return true;
			
			var articles = [];
			for(var i in items) {
				articles.push(i);
			}
			processArticles(articles);
		});
	} else {
		if(doc.title.indexOf('NewsVault') != -1) {
			composeAttachment = composeAttachmentGNV;
			composeRisUrl = composeRisUrlGNV;
		} else {
			composeAttachment = composeAttachmentGVRL;
			composeRisUrl = composeRisUrlGVRL;
		}
		
		processPage(doc, url);
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://go.galegroup.com/ps/i.do?action=interpret&id=GALE%7CH1420025063&v=2.1&u=viva_gmu&it=r&p=LitRG&sw=w&authCount=1",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Lewald",
						"firstName": "H. Ernest",
						"creatorType": "author"
					},
					{
						"lastName": "Borges",
						"firstName": "Jorge Luis",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>COPYRIGHT 1999 Gale Research, COPYRIGHT 2007 Gale, Cengage Learning</p>"
					}
				],
				"tags": [
					"Fervor de Buenos Aires (Poetry collection)",
					"Dulcia Linquimus Arva (Poem)",
					"El Amenazado (Poem)",
					"El Centinela (Poem)",
					"Lo perdido (Poem)",
					"El Triste (Poem)",
					"H. O. (Poem)",
					"Borges, Jorge Luis"
				],
				"seeAlso": [],
				"attachments": [
					{
						"mimeType": "text/html",
						"title": "Full Text (HTML)"
					}
				],
				"publicationTitle": "Chasqui",
				"issue": "1",
				"extra": "19",
				"date": "November 1974",
				"pages": "19-33",
				"title": "Borges: His Recent Poetry",
				"volume": "4",
				"accessDate": "May 7, 2012",
				"language": "English",
				"libraryCatalog": "Gale",
				"archive": "Literature Resources from Gale",
				"shortTitle": "Borges",
				"url": "http://go.galegroup.com/ps/i.do?id=GALE%7CH1420025063&v=2.1&u=viva_gmu&it=r&p=LitRG&sw=w"
			}
		]
	},
	{
		"type": "web",
		"url": "http://find.galegroup.com/ecco/infomark.do?&source=gale&prodId=ECCO&u=viva_gmu&tabID=T001&docId=CW3325179878&type=multipage&contentSet=ECCOArticles&version=1.0&docLevel=FASCIMILE",
		"items": [
			{
				"itemType": "book",
				"creators": [],
				"notes": [
					{
						"note": "<p>Copyright 2009 Gale, Cengage Learning</p>"
					}
				],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"mimeType": "text/html",
						"title": "Full Text (HTML)"
					}
				],
				"title": "A digest of the law of actions and trials at nisi prius. By Isaac 'espinasse, of Gray's Inn, Esq. Barrister at Law. The third edition, corrected, with considerable additions from printed and manuscript cases. In two volumes. ...",
				"place": "London",
				"url": "http://find.galegroup.com/ecco/infomark.do?&source=gale&prodId=ECCO&userGroupName=viva_gmu&tabID=T001&docId=CW3325179878&type=multipage&contentSet=ECCOArticles&version=1.0",
				"pages": "469",
				"numPages": "469",
				"DOI": "Monograph",
				"date": "1798",
				"volume": "Volume 1",
				"accessDate": "2012/05/07",
				"archive": "Eighteenth Century Collection Online",
				"numberOfVolumes": "2",
				"libraryCatalog": "Gale"
			}
		]
	}
]
/** END TEST CASES **/