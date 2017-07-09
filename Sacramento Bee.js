{
	"translatorID": "82b534ea-abf0-4527-9d5d-48cd98a89ba5",
	"label": "Sacramento Bee",
	"creator": "czar",
	"target": "^https?://(www\\.)?sacbee\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2017-07-09 02:19:40"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 czar
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

// attr()/text()
function attr(doc,selector,attr,index){if(index>0){var elem=doc.querySelectorAll(selector).item(index);return elem?elem.getAttribute(attr):null}var elem=doc.querySelector(selector);return elem?elem.getAttribute(attr):null}function text(doc,selector,index){if(index>0){var elem=doc.querySelectorAll(selector).item(index);return elem?elem.textContent:null}var elem=doc.querySelector(selector);return elem?elem.textContent:null}

function detectWeb(doc, url) {
	if (url.match(/article\d+/)) {
		return "newspaperArticle";
	} else if (url.match(/\/(news|sports|entertainment)\//)) {
		return "multiple";
	} else if (url.indexOf("/search/?q=") != -1) {
		return "multiple";
	} else return null;
}

function scrape(doc, url) {
	var item = new Zotero.Item("newspaperArticle");
	item.websiteTitle = "The Sacramento Bee";
	item.language = "en-US";
	item.ISSN = "0890-5738";
	item.url = url;
	item.title = attr(doc,'[property="og:title"]','content');
	item.date = text(doc,'.published-date');
	item.abstractNote = text(doc,'#content-body- p');
	var keywords = attr(doc,'meta[name="keywords"]','content');
	if (keywords) { // so as not to perform a split when keyword string is null
		item.tags = keywords.split(", ");
	}
	item.attachments.push({
		title: "The Sacramento Bee snapshot",
		mimeType: "text/html",
		document: doc
	});

	// Authors
	var authorMetadata = doc.querySelectorAll('.ng_byline_name');
	if (authorMetadata.length) { // querySelectorAll always retuns a NodeList, so test against length instead
		// when authors are split between multiple selectors, combine them
		var authorString = '';
		for (i=0; i < authorMetadata.length; i++) {
			authorString = authorString.concat(' '+authorMetadata[i].textContent);
		}
		authorString = authorString.replace('By ','').split(" and ");
		do {
			item.creators.push(ZU.cleanAuthor(authorString[0], "author"));
			authorString.shift();
		}
		while (authorString.length);
	}

	item.complete();
}

function doWeb(doc, url) { // news & search pages supported, Feature support to come
	if (detectWeb(doc, url) == "multiple") {
		var items = {};
		articles = [];
		var titles = doc.querySelectorAll('#site-search-results .title a, .media-body .title a, #story-list .title a, .col-sm-7 .title a');
		for (var i = 0; i < titles.length; i++) {
			items[titles[i].href] = titles[i].textContent;
		}
		Zotero.selectItems(items, function(items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape);
		})
	} else scrape(doc, url);
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.sacbee.com/news/local/crime/article5641188.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Convicted ‘eco-terrorist’ freed amid claims FBI hid evidence",
				"creators": [
					{
						"firstName": "Denny",
						"lastName": "Walsh",
						"creatorType": "author"
					},
					{
						"firstName": "Sam",
						"lastName": "Stanton",
						"creatorType": "author"
					}
				],
				"date": "January 08, 2015 1:09 PM",
				"ISSN": "0890-5738",
				"abstractNote": "Until this week, the federal government officially considered Eric Taylor McDavid a threat to the nation, a radical eco-terrorist who plotted to bomb or torch the Nimbus Dam, a U.S. Forest Service lab and cellphone towers in the Sacramento region.",
				"language": "en-US",
				"libraryCatalog": "Sacramento Bee",
				"url": "http://www.sacbee.com/news/local/crime/article5641188.html",
				"attachments": [
					{
						"title": "The Sacramento Bee snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"Eric McDavid",
					"FBI",
					"eco-terrorism",
					"entrapment",
					"federal courthouse",
					"nimbus dam",
					"prison",
					"release",
					"sacramento"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sacbee.com/news/local/article7251650.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "After nine years in prison, accused eco-terrorist adjusts to sudden release",
				"creators": [
					{
						"firstName": "Denny",
						"lastName": "Walsh",
						"creatorType": "author"
					},
					{
						"firstName": "Sam",
						"lastName": "Stanton",
						"creatorType": "author"
					}
				],
				"date": "January 17, 2015 4:56 PM",
				"ISSN": "0890-5738",
				"abstractNote": "Eric McDavid was running late for his interview Wednesday, unavoidably delayed when a detective asked to chat with him after he stopped at the Placer County Sheriff’s Office to register as an arsonist.",
				"language": "en-US",
				"libraryCatalog": "Sacramento Bee",
				"url": "http://www.sacbee.com/news/local/article7251650.html",
				"attachments": [
					{
						"title": "The Sacramento Bee snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"Benjamin Wagner",
					"Eric McDavid",
					"Lauren Weiner",
					"McGregor Scott",
					"Zachary Johnson",
					"conspiracy",
					"eco-terrorism",
					"eco-terrorist"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sacbee.com/entertainment/living/home-garden/article159629689.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Want a giant pumpkin? Plant seed now",
				"creators": [
					{
						"firstName": "Debbie",
						"lastName": "Arrington",
						"creatorType": "author"
					}
				],
				"date": "July 07, 2017 2:00 PM",
				"ISSN": "0890-5738",
				"abstractNote": "Shortly after Independence Day fireworks, it’s time to start thinking about another holiday – Halloween.",
				"language": "en-US",
				"libraryCatalog": "Sacramento Bee",
				"shortTitle": "Want a giant pumpkin?",
				"url": "http://www.sacbee.com/entertainment/living/home-garden/article159629689.html",
				"attachments": [
					{
						"title": "The Sacramento Bee snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"dill's atlantic giant",
					"garden",
					"halloween",
					"july",
					"pumpkins",
					"what to plant",
					"world record pumpkin"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.sacbee.com/search/?q=mcdavid",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.sacbee.com/sports/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.sacbee.com/sports/nfl/san-francisco-49ers/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
