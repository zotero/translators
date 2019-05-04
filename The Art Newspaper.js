{
	"translatorID": "7ae2681a-185b-4724-8754-f046d96884c8",
	"label": "The Art Newspaper",
	"creator": "czar",
	"target": "https?://(www\\.)?theartnewspaper\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-05-04 19:49:15"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 czar
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


// attr()/text() v2
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}


function detectWeb(doc, url) {
	if (/\/(news|analysis|blog|comment|preview|review)\/./.test(url)) {
		return "magazineArticle";
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	}
}


function scrape(doc, url) {
	var issue = text(doc,'.af-issue-number a'); // when issue info is available ("Appeared in The Art Newspaper"), change type to magazineArticle
	var item;
	if (issue) {
		item = new Zotero.Item("magazineArticle");
		item.issue = issue.substr(0,issue.indexOf(' '));
		item.date = issue.substr(issue.indexOf(' ')+1);
		item.ISSN = '0960-6556';
	} else {
		item = new Zotero.Item("blogPost");
	}
	var json_ld = doc.querySelector('script[type="application/ld+json"]'); // JSON-LD not yet built into EM
	if (json_ld) {
		var json = JSON.parse(json_ld.textContent);
		item.title = json.headline;
		if (!item.date) {
			item.date = json.datePublished;
		}
		for (let author of json.author) { 
			item.creators.push(ZU.cleanAuthor(author, "author"));
		}
		if (item.creators[0].lastName == "Newspaper") {			// fix generalized authorship
			delete item.creators[0].firstName;                  // remove the firstName param
			item.creators[0].lastName = "The Art Newspaper";	// write the desired name to lastName
			item.creators[0].fieldMode = 1;                     // change to single-field mode
		}
	}
	
	item.publicationTitle = "The Art Newspaper";
	item.language = "en";
	item.url = attr(doc,'link[rel=canonical]','href');
	item.abstractNote = attr(doc,'meta[name="description"]','content');
	
	item.attachments.push({
		document: doc,
		title: "The Art Newspaper snapshot",
		mimeType: "text/html"
	});
	
	item.complete();
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.ais-Hits__root a, a.cp-link'); // 1st selector is search results; 2nd is CMS
	var titles = doc.querySelectorAll('.sr-furniture h4, a.cp-link');
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(titles[i].textContent);
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
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.theartnewspaper.com/comment/does-venice-still-matter",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Why is the Venice Biennale still so important?",
				"creators": [
					{
						"firstName": "Jane",
						"lastName": "Morris",
						"creatorType": "author"
					}
				],
				"date": "May 2019",
				"ISSN": "0960-6556",
				"abstractNote": "Historical importance, glamour, big spenders—it continues to be an art festival like no other",
				"issue": "312",
				"language": "en",
				"libraryCatalog": "The Art Newspaper",
				"publicationTitle": "The Art Newspaper",
				"url": "http://theartnewspaper.com/comment/does-venice-still-matter",
				"attachments": [
					{
						"title": "The Art Newspaper snapshot",
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
		"url": "https://www.theartnewspaper.com/comment",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.theartnewspaper.com/news/what-next-for-notre-dame",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Notre Dame: experts explain why Macron's five-year restoration deadline is impossible",
				"creators": [
					{
						"firstName": "Hannah",
						"lastName": "McGivern",
						"creatorType": "author"
					},
					{
						"firstName": "Nancy",
						"lastName": "Kenney",
						"creatorType": "author"
					}
				],
				"date": "May 2019",
				"ISSN": "0960-6556",
				"abstractNote": "Complex conservation issues mean it could easily take a decade or more to rebuild the Medieval cathedral",
				"issue": "312",
				"language": "en",
				"libraryCatalog": "The Art Newspaper",
				"publicationTitle": "The Art Newspaper",
				"shortTitle": "Notre Dame",
				"url": "http://theartnewspaper.com/news/what-next-for-notre-dame",
				"attachments": [
					{
						"title": "The Art Newspaper snapshot",
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
		"url": "https://www.theartnewspaper.com/blog/frieze-new-york-diary-from-tom-sachs-channeling-family-guy-to-an-art-handler-at-centre-stage",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Frieze New York diary: from Tom Sachs channelling Family Guy to an art handler taking centre stage",
				"creators": [
					{
						"lastName": "The Art Newspaper",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2019",
				"ISSN": "0960-6556",
				"abstractNote": "Plus, Helena Christensen supports MFA graduates and MoMA screens the de-installation of Picasso's Guernica",
				"language": "en",
				"libraryCatalog": "The Art Newspaper",
				"publicationTitle": "The Art Newspaper",
				"shortTitle": "Frieze New York diary",
				"url": "http://theartnewspaper.com/blog/frieze-new-york-diary-from-tom-sachs-channeling-family-guy-to-an-art-handler-at-centre-stage",
				"attachments": [
					{
						"title": "The Art Newspaper snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
