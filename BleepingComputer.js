{
	"translatorID": "181f47e6-203e-4929-985f-1bbe3b638d6e",
	"label": "BleepingComputer",
	"creator": "Janiko",
	"target": "https://(www.)+bleepingcomputer.com/[^#]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-01-09 12:49:22"
}


/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Janiko <- TODO
	
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
		//Zotero.debug(ZU.xpathText(doc, '//meta[@property="og:image"]/@content'));
		var ld_json_rows = ZU.xpath(doc, '//script[@type="application/ld+json"]');
		//Zotero.debug(ld_json_rows);
		for (var i=0; i<ld_json_rows.length; i++) {
			obj = ld_json_rows[i].text;
			json_obj = JSON.parse(obj);
			json_obj_type = json_obj['@type'];
			switch (json_obj_type) {
				case 'NewsArticle':
					item.date = json_obj['datePublished'];
					author = json_obj['author']['name'];
					item.creators.unshift(ZU.cleanAuthor(author, "author"));
					/*item.creators[0] = author['name'];
					item.author = author['name'];*/
					item.publisher = json_obj['publisher']['name'];
					ld_tags = json_obj["keywords"];
					for (var j=0; j<ld_tags.length; j++) {
						item.tags.push(ld_tags[j]);
					}
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
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.bleepingcomputer.com/news/security/2-percent-of-amazon-s3-public-buckets-arent-write-protected-exposed-to-ransom-attacks/",
		"items": [
			{
				"itemType": "document",
				"title": "2% of Amazon S3 Public Buckets Aren't Write-Protected, Exposed to Ransom Attacks",
				"creators": [
					{
						"firstName": "Catalin",
						"lastName": "Cimpanu",
						"creatorType": "author"
					}
				],
				"date": "2018-02-28T06:06:57-05:00",
				"abstractNote": "New research published on Monday reveals that 5.8% of all Amazon S3 buckets are publicly readable, while 2% are publicly writeable —with the latter allowing anyone to add, edit, or delete data, and even hold a victim's data for ransom.",
				"language": "en-us",
				"libraryCatalog": "www.bleepingcomputer.com",
				"publisher": "BleepingComputer.com",
				"url": "https://www.bleepingcomputer.com/news/security/2-percent-of-amazon-s3-public-buckets-arent-write-protected-exposed-to-ransom-attacks/",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "AWS"
					},
					{
						"tag": "Amazon"
					},
					{
						"tag": "InfoSec, Computer Security"
					},
					{
						"tag": "Ransom Demand"
					},
					{
						"tag": "Security"
					},
					{
						"tag": "Server"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
