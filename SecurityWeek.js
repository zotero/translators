{
	"translatorID": "97390064-18a6-4b32-977a-1faa0878a30b",
	"label": "SecurityWeek",
	"creator": "Janiko",
	"target": "https://(www.)+securityweek.com/[^#]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-01-10 21:50:34"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Janiko
	
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
	// TODO: adjust the logic here
	if (getSearchResults(doc, true)) {
		return "multiple";
	} 
	return "document";
}

function getSearchResults(doc, checkOnly) {
	/*var items = {};
	var found = false;
	// TODO: adjust the CSS selector
	var rows = doc.querySelectorAll('div[class*="views-field-title"] a');
	for (let i=0; i<rows.length; i++) {
		// TODO: check and maybe adjust
		let href = rows[i].href;
		// TODO: check and maybe adjust
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
	*/
	// This website is a bit fuzzy: we don't try to guess if the current page is an article or a list.
	return false;
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

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	// translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		// TODO adjust if needed:
		item.section = "News";
		item.publisher = ZU.xpathText(doc, '//meta[@name="copyright"]/@content');
		authors = doc.querySelectorAll('#content div a[href*="/authors/"]');
		authors.forEach(function(element) {
			Zotero.debug(element.text);
			item.creators.unshift(ZU.cleanAuthor(element.text, "author"));
		});
		meta = doc.querySelectorAll('div.meta div.submitted div');
		date_txt = meta[0].textContent.split('on')[1];  // it's quite ugly
		item.date = date_txt;
		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.itemType = "document";
		// TODO map additional meta tags here, or delete completely
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.securityweek.com/thousands-organizations-expose-sensitive-data-google-groups",
		"items": [
			{
				"itemType": "document",
				"title": "Thousands of Organizations Expose Sensitive Data via Google Groups | SecurityWeek.Com",
				"creators": [
					{
						"firstName": "Eduard",
						"lastName": "Kovacs",
						"creatorType": "author"
					}
				],
				"date": "June 04, 2018",
				"abstractNote": "Google warns G Suite users after researchers find thousands of organizations exposing sensitive data through misconfigured Google Groups instances",
				"language": "en",
				"libraryCatalog": "www.securityweek.com",
				"publisher": "SecurityWeek - A Wired Business Media Publication",
				"url": "https://www.securityweek.com/thousands-organizations-expose-sensitive-data-google-groups",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "G Suite"
					},
					{
						"tag": "Google Groups"
					},
					{
						"tag": "exposed"
					},
					{
						"tag": "mailing list"
					},
					{
						"tag": "misconfigured"
					},
					{
						"tag": "public"
					},
					{
						"tag": "research"
					},
					{
						"tag": "sensitive data"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
