{
	"translatorID": "087127de-b046-4db2-b4e5-c41876155953",
	"label": "KrebsOnSecurity",
	"creator": "Janiko",
	"target": "https://krebsonsecurity.com/[0-9]{4}/[0-9]{2}/[^#]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-01-11 13:12:31"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 YOUR_NAME <- TODO
	
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
	return "blogPost";
}

function getSearchResults(doc, checkOnly) {
	return false;
}

function doWeb(doc, url) {
	scrape(doc, url);
}


function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	// translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		// TODO adjust if needed:
		item.section = "News";
		item.creators.push(ZU.cleanAuthor("Brian Krebs", "author"));
		tags = doc.querySelectorAll('p.small>a[rel*="tag"]');
		tags.forEach(function(the_tag) {
			if (the_tag.text) {
				item.tags.push(the_tag.text);
			}
		});
		var regex1 = RegExp("https://krebsonsecurity.com/([0-9]{4}/[0-9]{2})");
		var aaaamm = regex1.exec(url);
		item.date = aaaamm[1];
		item.blogTitle = "KrebsOnSecurity";
		item.websiteType = "computer security";
		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.itemType = "blogPost";
		// TODO map additional meta tags here, or delete completely
		trans.doWeb(doc, url);
	});
}



