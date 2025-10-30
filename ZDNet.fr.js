{
	"translatorID": "c1d53f0b-7c20-4be8-8486-334de98ffb51",
	"label": "ZDNet.fr",
	"creator": "Janiko",
	"target": "https://www.zdnet.fr/actualites/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-01-11 13:28:50"
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
	if (url.includes('/actualites/')) {
		return "document";
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	}
}


function getSearchResults(doc, checkOnly) {
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
		var ld_json_rows = ZU.xpath(doc, '//script[@type="application/ld+json"]');
		ld_json_rows.forEach(function(row){
			obj = row.text;
			json_obj = JSON.parse(obj);
			json_obj_type = json_obj['@type'];
			switch (json_obj_type) {
				case 'NewsArticle':
					/* We prioritize the json ld information (if defined) */
					
					/* date of creation */
					var the_date = json_obj['datePublished'];
					if (typeof the_date !== 'undefined') {
						item.date = the_date;
					}

					// creators may be a singleton or an array 
					// if it exists here, it must be a more accurate guess of author's name
					var the_creators = json_obj['author'];
					if (the_creators) {
						item.creators = [];  // now it's empty
						if (the_creators.constructor === Array) {
							// Array
							the_creators.forEach(function(element) {
								author_name = element['name'];
								item.creators.push(ZU.cleanAuthor(author_name, "author"));
							});
						} else {
							// Single value
							author_name = the_creators;
							item.creators.push(ZU.cleanAuthor(author_name, "author"));
						}
					}
					
				break;
			}
		
		});
		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.itemType = "document";
		// TODO map additional meta tags here, or delete completely
		trans.doWeb(doc, url);
	});
}
