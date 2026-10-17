{
	"translatorID": "1a0c9afc-9945-4a85-83ef-7cfcc218dcda",
	"label": "Kirkus Reviews",
	"creator": "czar",
	"target": "^https?://(www\\.)?kirkusreviews\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-07-08 21:56:12"
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
	if (doc.querySelector('div[itemprop="review"]')) {
		return "journalArticle";
	} else if (doc.querySelector('body[data-slot-scope="blog-post"]')) {
		return "blogPost"
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	}
}


function scrape(doc, url) {
	var type = detectWeb(doc, url);
	var item = new Zotero.Item(type);
	item.publicationTitle = "Kirkus Reviews";
	item.title = attr(doc,'meta[property="og:title"]','content').split('|')[0];
	item.abstractNote = attr(doc,'meta[property="og:description"]','content');
	item.language = "en-US";
	item.url = url;
	
	if (type == "journalArticle") {
		item.ISSN = "1948-7428";
		item.date = attr(doc,'span[itemprop="datePublished"]','content');
		// Process title
		item.title = ZU.capitalizeTitle(item.title.toLowerCase(),true).replace (/^/,'Rev. of ').replace(/\s,/,",");
		var reviewedauthorMetadata = doc.querySelectorAll('.book-author span[itemprop="name"]');
		for (let author of reviewedauthorMetadata) {
			item.creators.push(ZU.cleanAuthor(author.innerText, "reviewedAuthor"));
		}
	}
	if (type == "blogPost") {
		item.date = ZU.strToISO(text(doc,'.blog-post-teaser-meta-ctr').replace(/[\n\s]+/g," ").replace(/.*\son\s(.*)/,"$1"));
		var blogauthorMetadata = text(doc,'.blog-post-teaser-meta-ctr').replace(/[\n\s]+/g," ").replace(/.*[Bb]y\s([\w\s]+),?.*\son\s.*/,"$1"); // http://regexr.com/3fhho
		if (blogauthorMetadata) {
			item.creators.push(ZU.cleanAuthor(blogauthorMetadata, "author"));
		}
	}

	item.attachments.push({
		title: "Kirkus Reviews snapshot",
		mimeType: "text/html",
		document: doc
	});

	item.complete();
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.book-item-ctr span[itemprop="name"], .quilt-item-title a, .list-hero-ctr span[itemprop="name"], .blog-post-header');
	var links = doc.querySelectorAll('.book-item-ctr a[itemprop="url"], .quilt-item-title a, .list-hero-ctr a[itemprop="url"], .blog-post-header a');
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
		default:
			scrape(doc, url);
			break;
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.kirkusreviews.com/book-reviews/paul-goodman-7/like-a-conquered-province/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Rev. of Like a Conquered Province by Paul Goodman",
				"creators": [],
				"ISSN": "1948-7428",
				"abstractNote": "As a dissenting David to the Goliath of stultifying centralization, Paul Goodman has become a campus hero and a Washington bugaboo.",
				"language": "en-US",
				"libraryCatalog": "Kirkus Reviews",
				"publicationTitle": "Kirkus Reviews",
				"url": "https://www.kirkusreviews.com/book-reviews/paul-goodman-7/like-a-conquered-province/",
				"attachments": [
					{
						"title": "Kirkus Reviews snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.kirkusreviews.com/book-reviews/patricia-reilly-giff/big-something/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Rev. of The Big Something by Patricia Reilly Giff, Diane Palmisciano",
				"creators": [
					{
						"firstName": "Patricia Reilly",
						"lastName": "Giff",
						"creatorType": "reviewedAuthor"
					},
					{
						"firstName": "Diane",
						"lastName": "Palmisciano",
						"creatorType": "reviewedAuthor"
					}
				],
				"date": "2012-05-30",
				"ISSN": "1948-7428",
				"abstractNote": "The Big Something doesn't end up amounting to much in this lackluster beginning reader.",
				"language": "en-US",
				"libraryCatalog": "Kirkus Reviews",
				"publicationTitle": "Kirkus Reviews",
				"url": "https://www.kirkusreviews.com/book-reviews/patricia-reilly-giff/big-something/",
				"attachments": [
					{
						"title": "Kirkus Reviews snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.kirkusreviews.com/book-reviews/best-sellers/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.kirkusreviews.com/issue/best-of-2016/section/fiction/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.kirkusreviews.com/book-reviews/tom-mccarthy/typewriters-bombs-jellyfish/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Rev. of Typewriters, Bombs, Jellyfish by Tom Mccarthy",
				"creators": [
					{
						"firstName": "Tom",
						"lastName": "McCarthy",
						"creatorType": "reviewedAuthor"
					}
				],
				"date": "2017-03-15",
				"ISSN": "1948-7428",
				"abstractNote": "A debut collection of essays covering the scope of modern literature, along with a quiet plea for its violent overthrow.",
				"language": "en-US",
				"libraryCatalog": "Kirkus Reviews",
				"publicationTitle": "Kirkus Reviews",
				"url": "https://www.kirkusreviews.com/book-reviews/tom-mccarthy/typewriters-bombs-jellyfish/",
				"attachments": [
					{
						"title": "Kirkus Reviews snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.kirkusreviews.com/features/julianne-pachico/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Julianne Pachico",
				"creators": [
					{
						"firstName": "Megan",
						"lastName": "Labrise",
						"creatorType": "author"
					}
				],
				"date": "2017-03-09",
				"abstractNote": "Kirkus Reviews talks to Julianne Pachico about her novel, The Lucky Ones.",
				"blogTitle": "Kirkus Reviews",
				"language": "en-US",
				"url": "https://www.kirkusreviews.com/features/julianne-pachico/",
				"attachments": [
					{
						"title": "Kirkus Reviews snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.kirkusreviews.com/features/murder-hits-close-work/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "A Murder That Hits Close to…Work",
				"creators": [
					{
						"firstName": "Laurie",
						"lastName": "Muchnick",
						"creatorType": "author"
					}
				],
				"date": "2017-03-09",
				"abstractNote": "Kirkus Reviews' fiction editor Laurie Muchnick spotlights Judith Flanders' Samantha Clair mystery series.",
				"blogTitle": "Kirkus Reviews",
				"language": "en-US",
				"url": "https://www.kirkusreviews.com/features/murder-hits-close-work/",
				"attachments": [
					{
						"title": "Kirkus Reviews snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.kirkusreviews.com/features/partners/forever-young-adult/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.kirkusreviews.com/features/interviews/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.kirkusreviews.com/search/?q=goodman",
		"items": "multiple"
	}
]
/** END TEST CASES **/
