{
	"translatorID": "4ea89035-3dc4-4ae3-b22d-726bc0d83a64",
	"label": "Galegroup",
	"creator": "Sebastian Karcher and Aurimas Vinckevicius",
	"target": "^https?://go.galegroup\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-09-24 00:54:53"
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
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;

	var rows = doc.querySelectorAll('ul.SearchResultsList span.title a.documentLink');
	if (!rows.length) {
		rows = doc.querySelectorAll('ul.SearchResultsList p.subTitle a.title');
	}
	for (var i=0; i<rows.length; i++) {
	    // Adjust if required, use Zotero.debug(rows) to check
		var href = rows[i].href;
		// Adjust if required, use Zotero.debug(rows) to check
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}
function detectWeb(doc, url) {
	if (url.includes('/retrieve.do')) {
		// there is no reasonable way to get to real item types
		return "journalArticle";
	}
	
	else if (getSearchResults(doc, true)) return "multiple";
}


function composeAttachment(doc, url) {
	var pdfurl = attr(doc, '#docTools-pdf a', 'href');
	if(pdfurl) {
		return {
			url: pdfurl,
			title: "Full Text PDF",
			mimeType:'application/pdf'
		};
	} else {
		return {document: doc, title: "Snapshot"};
	}
}


function parseRis(text, attachment) {
	text = text.trim();
	//gale puts issue numbers in M1
	text = text.replace(/M1\s*\-/g, "IS  -");
	//L2 is probably meant to be UR, but we can ignore it altogether
	text = text.replace(/^L2\s+-.+\n/gm, '');
	//we can map copyright notes via CR
	text = text.replace(/^N1(?=\s+-\s+copyright)/igm, 'CR');
	//Z.debug(text);
	
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
	translator.setString(text);
	translator.setHandler("itemDone", function (obj, item) {
		if(attachment) item.attachments.push(attachment);
		item.complete();
	});
	translator.translate();
}


function scrape(doc, url) {
	var postURL = "/ps/citationtools/rest/cite/download";
	
	var docId = attr(doc, 'input.citationToolsData', 'data-docid');
	var documentUrl = attr(doc, 'input.citationToolsData', 'data-url');
	var productName = attr(doc, 'input.citationToolsData', 'data-productname');
 
	var documentData = '{"docId":"' + docId +'","documentUrl":"' + documentUrl + '","productName":"' + productName + '"}';
	var post = "citationFormat=RIS&documentData=" +encodeURIComponent(documentData).replace(/%20/g, "+");
	var attachment = composeAttachment(doc, url);
	// Z.debug(post)
	ZU.doPost(postURL, post, function(text){
		// Z.debug(text);
		parseRis(text, attachment);
	});
}

function doWeb(doc, url) {
	if(detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}
/** BEGIN TEST CASES **/
var testCases = []
/** END TEST CASES **/
