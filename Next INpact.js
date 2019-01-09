{
	"translatorID": "bb106305-d06f-46a0-af1f-b8d96a15a54a",
	"label": "Next INpact",
	"creator": "Janiko",
	"target": "https://www.nextinpact.com/news/[^#]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-01-07 16:19:49"
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
	if (url.includes('/news/')) {
		return "document";
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	}
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// TODO: adjust the CSS selector
	var rows = doc.querySelectorAll('h2>a.title[href*="/news/"]');
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
		for (var i=0; i<ld_json_rows.length; i++) {
			obj = ld_json_rows[i].text;
			json_obj = JSON.parse(obj);
			json_obj_type = json_obj['@type'];
			Zotero.debug(json_obj_type);
			switch (json_obj_type) {
				case 'NewsArticle':
					item.date = json_obj['datePublished'];
					author = json_obj['author']['name'];
					item.author = author;
					/* In creators, an e-mail address if filled, let's remplace
					   it with the correct author name */
					author_email = item.creators[0]['lastName'];
					item.extra = "e-mail: "+author_email;
					item.rights = 'isAccessibleForFree: ' + json_obj['isAccessibleForFree'];
					Zotero.debug(author_email);
					item.creators.shift();
					item.creators.unshift(ZU.cleanAuthor(author, "author"));
					/*item.creators[0] = author['name'];
					item.author = author['name'];*/
					item.publisher = json_obj['publisher']['name'];
				break;
			}

		}
		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.itemType = "document";
		// TODO map additional meta tags here, or delete completely
		trans.doWeb(doc, url);
	});
}
