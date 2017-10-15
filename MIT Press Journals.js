{
	"translatorID": "2e43f4a9-d2e2-4112-a6ef-b3528b39b4d2",
	"label": "MIT Press Journals",
	"creator": "Philipp Zumstein",
	"target": "^https?://www\\.mitpressjournals\\.org/(action|toc|doi)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2017-10-15 16:03:55"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Philipp Zumstein
	
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


// attr()/text() v2
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}


function detectWeb(doc, url) {
	if (url.includes('action/doSearch') || url.includes('toc/')) {
		return "multiple";
	} else if (url.includes('doi/abs/')) {
		return "journalArticle";
	}
}


function getDOI(str) {
	return str.match(/doi\/(abs|full)\/([^?]+)/)[2];
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.art_title>a.ref');
	for (var i=0; i<rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
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





function scrape(doc, url){
	var abs = text(doc, '.abstractSection');
	var doi = getDOI(doc.location.href);
	var risurl = 'http://www.mitpressjournals.org/action/downloadCitation?doi=' + doi + '&include=cit&format=refman&direct=on&submit=Download+article+metadata';		
	var pdfurl = doc.location.href.replace("/doi/abs/", "/doi/pdf/");
	Zotero.Utilities.HTTP.doGet(risurl, function(text) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		//Zotero.debug(text)
		translator.setString(text);
		translator.setHandler("itemDone", function(obj, item) {
			//picks up some weird attachments and notes from the RIS - delete
			item.attachments= [];
			item.notes=[];
			item.attachments.push({
				url:doc.location.href,
				title:item.publicationTitle + " Snapshot",
				mimeType:"text/html"
			});
			item.attachments.push({
				url:pdfurl,
				title:item.publicationTitle + " Full Text PDF",
				mimeType:"application/pdf"
			});
			if (abs) item.abstractNote = abs;
			item.complete();	
		});
		translator.translate();
	});
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.mitpressjournals.org/toc/afar/43/4",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.mitpressjournals.org/doi/abs/10.1162/afar.2010.43.4.60",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Verswijver",
						"firstName": "Gustaaf",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "African Arts Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "African Arts Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Removable Hair Caps of Karamoja (Uganda)",
				"date": "November 8, 2010",
				"DOI": "10.1162/afar.2010.43.4.60",
				"publicationTitle": "African Arts",
				"journalAbbreviation": "African Arts",
				"pages": "60-71",
				"volume": "43",
				"issue": "4",
				"publisher": "MIT Press",
				"ISSN": "0001-9933",
				"url": "http://dx.doi.org/10.1162/afar.2010.43.4.60",
				"accessDate": "September 4, 2012",
				"libraryCatalog": "MIT Press Journals"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.mitpressjournals.org/action/doSearch?AllField=labor+market&x=0&y=0&history=&publication=all",
		"items": "multiple"
	}
]
/** END TEST CASES **/
