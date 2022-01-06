{
	"translatorID": "e3748cf3-36dc-4816-bf86-95a0b63feb03",
	"label": "Gale Databases",
	"creator": "Abe Jellinek and Jim Miazek",
	"target": "^https?://[^?&]*(?:gale|galegroup|galetesting|ggtest)\\.com(?:\\:\\d+)?/ps/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-12-21 04:18:59"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek and Jim Miazek
	
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


function detectWeb(doc, url) {
	if (url.includes('/ps/eToc.do')
		|| text(doc, 'h1.page-header').includes("Table of Contents")
		|| doc.querySelector('.bookPreview')) {
		return "book";
	}
	if (doc.querySelector('#searchResults')
		|| url.includes('/Search.do')
		|| url.includes('/paginate.do')) {
		if (getSearchResults(doc, true)) {
			return "multiple";
		}
		else if (doc.querySelector('#searchResults')) {
			Z.monitorDOMChanges(doc.querySelector('#searchResults'));
		}
	}
	let publisherType = attr(doc, '.zotero', 'data-zoterolabel');
	if (publisherType) {
		Z.debug('Using publisher-provided item type: ' + publisherType);
		return publisherType;
	}
	if (doc.querySelector('a[data-gtm-feature="bookView"]')) {
		return "bookSection";
	}
	else if (doc.body.classList.contains('document-page')) {
		// not the greatest fallback... other guesses we could use?
		return "magazineArticle";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll('h3.title > a.documentLink');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
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
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	let citeData = doc.querySelector('input.citationToolsData');
	let documentUrl = citeData.getAttribute('data-url');
	// Value is URL-encoded when loaded via processDocuments()
	documentUrl = decodeURIComponent(documentUrl);
	let mcode = citeData.getAttribute('data-mcode');
	let productName = citeData.getAttribute('data-productname');
	let docId = mcode ? undefined : citeData.getAttribute('data-docid');
	let documentData = JSON.stringify({
		docId,
		mcode,
		documentUrl,
		productName
	});
	let risPostBody = "citationFormat=RIS&documentData=" + encodeURIComponent(documentData).replace(/%20/g, "+");
	
	let pdfURL = attr(doc, 'button[data-gtm-feature="download"]', 'data-url');

	ZU.doPost('/ps/citationtools/rest/cite/download', risPostBody, function (text) {
		let translator = Zotero.loadTranslator("import");
		// RIS
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			if (pdfURL) {
				item.attachments.push({
					url: pdfURL,
					title: "Full Text PDF",
					mimeType: "application/pdf"
				});
			}
			
			if (item.ISSN) {
				item.ISSN = Zotero.Utilities.cleanISSN(item.ISSN);
			}
			
			if (item.pages && item.pages.endsWith("+")) {
				item.pages = item.pages.replace(/\+/, "-");
			}
			
			item.attachments.push({
				title: "Snapshot",
				document: doc
			});
			
			item.notes = [];
			item.url = item.url.replace(/u=[^&]+&?/, '');
			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://go.gale.com/ps/i.do?p=GVRL&id=GALE%7C5BBU&v=2.1&it=etoc&sid=GVRL",
		"items": [
			{
				"itemType": "book",
				"title": "Arts and Humanities Through the Eras",
				"creators": [
					{
						"lastName": "Bleiberg",
						"firstName": "Edward I.",
						"creatorType": "editor"
					},
					{
						"lastName": "Evans",
						"firstName": "James Allan",
						"creatorType": "editor"
					},
					{
						"lastName": "Figg",
						"firstName": "Kristen Mossler",
						"creatorType": "editor"
					},
					{
						"lastName": "Soergel",
						"firstName": "Philip M.",
						"creatorType": "editor"
					},
					{
						"lastName": "Friedman",
						"firstName": "John Block",
						"creatorType": "editor"
					}
				],
				"date": "2005",
				"archive": "Gale eBooks",
				"libraryCatalog": "Gale",
				"place": "Detroit, MI",
				"publisher": "Gale",
				"series": "Ancient Egypt 2675-332 B.C.E.",
				"url": "https://link.gale.com/apps/pub/5BBU/GVRL?sid=bookmark-GVRL",
				"volume": "1",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://go.gale.com/ps/i.do?p=GVRL&id=GALE%7CCX3427400755&v=2.1&it=r&sid=GVRL&asid=77ea673e",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Ariosto, Ludovico",
				"creators": [
					{
						"lastName": "Bleiberg",
						"firstName": "Edward I.",
						"creatorType": "editor"
					},
					{
						"lastName": "Evans",
						"firstName": "James Allan",
						"creatorType": "editor"
					},
					{
						"lastName": "Figg",
						"firstName": "Kristen Mossler",
						"creatorType": "editor"
					},
					{
						"lastName": "Soergel",
						"firstName": "Philip M.",
						"creatorType": "editor"
					},
					{
						"lastName": "Friedman",
						"firstName": "John Block",
						"creatorType": "editor"
					}
				],
				"date": "2005",
				"archive": "Gale eBooks",
				"bookTitle": "Arts and Humanities Through the Eras",
				"language": "English",
				"libraryCatalog": "Gale",
				"pages": "350-351",
				"place": "Detroit, MI",
				"publisher": "Gale",
				"series": "Renaissance Europe 1300-1600",
				"url": "https://link.gale.com/apps/doc/CX3427400755/GVRL?sid=bookmark-GVRL&xid=77ea673e",
				"volume": "4",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Ariosto, Ludovico"
					},
					{
						"tag": "Playwrights"
					},
					{
						"tag": "Poets"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://go.gale.com/ps/i.do?st=Newspapers&lm=DA~119760101+-+119861231&searchResultsType=SingleTab&qt=TXT~%E2%80%9Csex+discrimination%E2%80%9D+AND+%28work+OR+employment%29+NOT+%22equal+pay%22&sw=w&ty=as&it=search&sid=bookmark-TTDA&p=TTDA&s=Pub+Date+Forward+Chron&v=2.1&asid=c2011dd0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://link.gale.com/apps/doc/CS168394274/TTDA?sid=bookmark-TTDA&xid=9943afcd",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "The Times Diary",
				"creators": [
					{
						"lastName": "PHS",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "January 2, 1976",
				"ISSN": "0140-0460",
				"archive": "The Times Digital Archive",
				"extra": "10",
				"language": "English",
				"libraryCatalog": "Gale",
				"pages": "10",
				"publicationTitle": "The Times",
				"url": "https://link.gale.com/apps/doc/CS168394274/TTDA?sid=bookmark-TTDA&xid=9943afcd",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Political parties"
					},
					{
						"tag": "Wilson, Harold (British prime minister)"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
