{
	"translatorID": "b104127-1f09-401e-a14a-f7c4377b6f62",
	"label": "Blouin Artinfo",
	"creator": "czar",
	"target": "^https?://((www|blogs)\\.)?(artinfo|blouinartinfo)\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-07-08 16:34:55"
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


// attr()/text() v2 per https://github.com/zotero/translators/issues/1277
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}


function detectWeb(doc, url) {
	if (/\/news\/story\//.test(url)) {
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
		item.publicationTitle = "Blouin Artinfo";
		item.title = text(doc,'h1[itemprop="name headline"]');
		item.tags = []; // throw out garbage tags "blouin" and "blouinartinfo.com"
		item.date = Z.Utilities.strToISO(attr(doc,'meta[itemprop="dateModified"]','content'));
		var authorMetadata = doc.querySelectorAll('span[itemprop="name"]');
		for (let author of authorMetadata) {
			item.creators.push(ZU.cleanAuthor(author.innerHTML, "author"));
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
	var rows = doc.querySelectorAll('.article-full-title a, .views-field-php .field-content > a, .search-result a');
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (href.includes('/node/')) continue;	// reject shoddy image pages from multi
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
		"url": "http://www.blouinartinfo.com/news/story/2003327/to-view-a-world-within-a-grain-of-sand-at-sakura-city-museum",
		"items": [
			{
				"itemType": "blogPost",
				"title": "'To View a World Within a Grain of Sand' at Sakura City Museum of Art, Tokyo",
				"creators": [
					{
						"firstName": "BLOUIN",
						"lastName": "ARTINFO",
						"creatorType": "author"
					}
				],
				"date": "2017-03-14",
				"abstractNote": "Sakura City Museum of Art is currently hosting the &quot;To View a World within a Grain of Sand&quot; exhibition, on view through March 28, 2017.",
				"blogTitle": "Blouin Artinfo",
				"language": "en",
				"url": "https://www.blouinartinfo.com/news/story/2003327/to-view-a-world-within-a-grain-of-sand-at-sakura-city-museum",
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
		"url": "https://www.blouinartinfo.com/news/story/3139334/the-worlds-best-art-schools",
		"items": [
			{
				"itemType": "blogPost",
				"title": "The World's Best Art Schools",
				"creators": [
					{
						"firstName": "Franca",
						"lastName": "Toscano",
						"creatorType": "author"
					}
				],
				"date": "2018-07-06",
				"abstractNote": "A subjective list of our top picks for the art schools worth noting: whether for their history, their famous graduates, their cutting-edge approach, or all of the above.",
				"blogTitle": "Blouin Artinfo",
				"language": "en",
				"url": "https://www.blouinartinfo.com/news/story/3139334/the-worlds-best-art-schools",
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
		"url": "https://www.blouinartinfo.com/visual-arts/reviews/contemporary-arts",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.blouinartinfo.com/search/blouin-search/%22venice%20biennale%22/page/1/0",
		"items": "multiple"
	}
]
/** END TEST CASES **/
