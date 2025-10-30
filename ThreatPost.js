{
	"translatorID": "7c5f6695-24ab-4964-bdb9-d79076fb31b7",
	"label": "ThreatPost",
	"creator": "Janiko",
	"target": "https://(www.)?threatpost\\.com/[^#]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-01-11 13:38:41"
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
	var rows = doc.querySelectorAll('h1[class="c-article__title"]');
	if (rows.length == 1) {
		return "blogPost";
	} 
	return "multiple";
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// TODO: adjust the CSS selector
	var rows = doc.querySelectorAll('div.c-border-layout h2[class="c-card__title"] a');
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
					// Date
					item.date = json_obj['datePublished'];
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
							author_name = the_creators['name'];
							item.creators.push(ZU.cleanAuthor(author_name, "author"));
						}
					}
					// Publisher/editor
					item.blogTitle = json_obj['publisher']['name'];
					item.websiteType = "computer security";
				break;
			}

		}
		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.itemType = "blogPost";
		// TODO map additional meta tags here, or delete completely
		trans.doWeb(doc, url);
	});
}



/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://threatpost.com/new-ninth-gen-intel-cpus-shield-against-some-spectre-meltdown-variants/138152/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "New Ninth-Gen Intel CPUs Shield Against Some Spectre, Meltdown Variants",
				"creators": [
					{
						"firstName": "Lindsey",
						"lastName": "O&#039;Donnell",
						"creatorType": "author"
					}
				],
				"date": "2018-10-09T15:37:35-04:00",
				"abstractNote": "New Intel Coffee Lake CPUs offer hardware-based protections against some -but not all- Spectre and Meltdown variants.",
				"blogTitle": "Threatpost",
				"language": "en",
				"url": "https://threatpost.com/new-ninth-gen-intel-cpus-shield-against-some-spectre-meltdown-variants/138152/",
				"websiteType": "computer security",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Hacks"
					},
					{
						"tag": "L1TF"
					},
					{
						"tag": "Malware"
					},
					{
						"tag": "Meltdown"
					},
					{
						"tag": "Mobile Security"
					},
					{
						"tag": "Privacy"
					},
					{
						"tag": "Vulnerabilities"
					},
					{
						"tag": "Web Security"
					},
					{
						"tag": "cpu"
					},
					{
						"tag": "intel"
					},
					{
						"tag": "intel Cannonlake"
					},
					{
						"tag": "spectre"
					},
					{
						"tag": "virtual fences"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://threatpost.com/adobe-december-2018-patch-tuesday/139792/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Adobe December 2018 Security Update Fixes Reader, Acrobat",
				"creators": [
					{
						"firstName": "Tara",
						"lastName": "Seals",
						"creatorType": "author"
					}
				],
				"date": "2018-12-11T12:42:50-05:00",
				"abstractNote": "The update includes a raft of critical code-execution problems.",
				"blogTitle": "Threatpost",
				"language": "en",
				"url": "https://threatpost.com/adobe-december-2018-patch-tuesday/139792/",
				"websiteType": "computer security",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Hacks"
					},
					{
						"tag": "Malware"
					},
					{
						"tag": "Mobile Security"
					},
					{
						"tag": "Privacy"
					},
					{
						"tag": "Vulnerabilities"
					},
					{
						"tag": "Web Security"
					},
					{
						"tag": "acrobat"
					},
					{
						"tag": "adobe"
					},
					{
						"tag": "arbitrary code execution"
					},
					{
						"tag": "critical flaws"
					},
					{
						"tag": "december 2018"
					},
					{
						"tag": "patch tuesday"
					},
					{
						"tag": "reader"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://threatpost.com/?s=toto",
		"items": "multiple"
	}
]
/** END TEST CASES **/
