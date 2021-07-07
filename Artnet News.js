{
	"translatorID": "aefdbd62-3cf8-44a4-bc73-68a3b3f70d73",
	"label": "Artnet News",
	"creator": "czar",
	"target": "^https?://news\\.artnet\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-07-08 15:10:54"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 czar
	http://en.wikipedia.org/wiki/User_talk:Czar

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
	if (/-\d{4,}$/.test(url)) {
		return "blogPost";
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	}
}


function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // embedded metadata (EM)
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) { // corrections to EM
		item.itemType = "blogPost";
		item.publicationTitle = "Artnet News";
		var authorMetadata = doc.querySelectorAll('.article-byline a');
		for (let author of authorMetadata) {
			item.creators.push(ZU.cleanAuthor(author.text, "author"));
		}
		if (item.creators[0].lastName == "Team") {
			delete item.creators[0].firstName;                  	// remove the firstName param
			item.creators[0].lastName = "Artnet Galleries Team";	// write the desired name to lastName
			item.creators[0].fieldMode = 1;                     	// change to single-field mode
		}
		if (item.tags) {											// convert tags from lower to title case
			for (let tag in item.tags) {							// need "in" for easier write to index
				if (item.tags[tag] == item.tags[tag].toLowerCase()) {
					item.tags[tag] = item.tags[tag].replace(/\b\w/g, l => l.toUpperCase());
				}
			}
		}
		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.doWeb(doc, url);
	});
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h2.teaser-title');
	var links = doc.querySelectorAll('.teaser-info > a');
	for (let i=0; i<rows.length; i++) {
		let href = links[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	switch (detectWeb(doc, url)) {
		case "multiple":
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
			break;
		case "blogPost":
			scrape(doc, url);
			break;
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://news.artnet.com/market/12-contemporary-african-artists-320631",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Meet 12 Contemporary African Artists Making Waves in the Art World",
				"creators": [
					{
						"firstName": "Rain",
						"lastName": "Embuscado",
						"creatorType": "author"
					}
				],
				"date": "2015-08-02T08:20:16+00:00",
				"abstractNote": "As the world prepares for an upcoming African art market boom, these players are already claiming their seats at the table.",
				"blogTitle": "Artnet News",
				"language": "en-US",
				"url": "https://news.artnet.com/market/12-contemporary-african-artists-320631",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "https://news.artnet.com/art-world/everthing-need-know-venice-biennale-2015-292100",
		"items": [
			{
				"itemType": "blogPost",
				"title": "What not to miss at the 56th Venice Biennale",
				"creators": [
					{
						"firstName": "Christie",
						"lastName": "Chu",
						"creatorType": "author"
					}
				],
				"date": "2015-05-02T08:00:05+00:00",
				"abstractNote": "Not sure how to navigate the arsenale, the pavilions, and all the collateral events of the 56th Venice Biennale? We've got you covered.",
				"blogTitle": "Artnet News",
				"language": "en-US",
				"url": "https://news.artnet.com/art-world/everthing-need-know-venice-biennale-2015-292100",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "https://news.artnet.com/search/venice+biennale",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://news.artnet.com/about/blake-gopnik-86",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://news.artnet.com/exhibitions/reviews",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://news.artnet.com/market/sean-kelly-brings-group-of-iconic-joseph-beuys-artworks-to-armory-felt-suit-already-sold-3719",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Joseph Beuys Works On Sale at the Armory",
				"creators": [
					{
						"firstName": "Rozalia",
						"lastName": "Jovanovic",
						"creatorType": "author"
					}
				],
				"date": "2014-03-04T04:02:39+00:00",
				"abstractNote": "At the 2014 Armory Show, Sean Kelly gallery presents a special exhibition of 130 works of German conceptual artist Joseph Beuys.",
				"blogTitle": "Artnet News",
				"language": "en-US",
				"url": "https://news.artnet.com/market/sean-kelly-brings-group-of-iconic-joseph-beuys-artworks-to-armory-felt-suit-already-sold-3719",
				"attachments": [
					{
						"title": "Snapshot"
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
		"url": "https://news.artnet.com/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
