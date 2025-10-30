{
	"translatorID": "99d85bf7-7a14-4eca-aab4-217937c117c6",
	"label": "Ubergizmo_fr",
	"creator": "Janiko",
	"target": "https://fr.ubergizmo.com/([0-9]{4}/[0-9]{2}/[0-9]{2})",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-01-24 16:38:22"
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
		var ld_json_rows = ZU.xpath(doc, '//script[@type="application/ld+json"]');
		ld_json_rows.forEach(function(row){
			obj = row.text;
			json_obj = JSON.parse(obj);
			json_obj_type = json_obj['@type'];
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
					item.blogTitle = json_obj['publisher']['name'];
					item.websiteType = "technology news";
				break;
			}
		
		});
		var authors = doc.querySelectorAll('div a[itemprop*="creator"');
		authors.forEach(function(element) {
			item.creators.unshift(ZU.cleanAuthor(element.text, element.rel));
		});
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
		"url": "https://www.nextinpact.com/news/107492-nouveau-retard-pour-teleservice-dattestation-numerique-diplomes.htm",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Nouveau retard pour le téléservice « d’attestation numérique » des diplômes",
				"creators": [
					{
						"firstName": "Xavier",
						"lastName": "Berne",
						"creatorType": "author"
					}
				],
				"date": "2019-01-09T15:19:14.6911397",
				"abstractNote": "Censé être opérationnel depuis deux ans, le « service d'attestation numérique des diplômes » ne sera pas lancé avant le printemps prochain.",
				"blogTitle": "Next INpact",
				"extra": "e-mail: xavier@nextinpact.com",
				"language": "fr",
				"rights": "isAccessibleForFree: False",
				"url": "https://www.nextinpact.com/news/107492-nouveau-retard-pour-teleservice-dattestation-numerique-diplomes.htm",
				"websiteType": "computer news",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Audio"
					},
					{
						"tag": "Loi"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
