{
	"translatorID": "83979786-44af-494a-9ddb-46654e0486ef",
	"label": "Reuters",
	"creator": "Avram Lyon, Michael Berkowitz, Sebastian Karcher",
	"target": "^https?://(www|blogs)?\\.reuters\\.com/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-01-28 20:10:54"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Reuters Translator
	Copyright © 2011 Avram Lyon, ajlyon@gmail.com, Sebastian Karcher

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
	if (url.match(/^https?:\/\/(www\.)?reuters\.com\/article/)) {
		return "newspaperArticle";
	} else if (url.match(/^https?:\/\/blogs\.reuters\.com/)) {
	  return "blogPost";
	} else if (url.includes('/search/') && getSearchResults(doc, true)) {
	  return "multiple";
	}
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h3.search-result-title>a');
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
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
	var type = detectWeb(doc, url);
	// copy meta tags in body to head
	var head = doc.getElementsByTagName('head');
	var metasInBody = ZU.xpath(doc, '//body/meta');
	for (var i=0; i<metasInBody.length; i++) {
		head[0].append(metasInBody[i]);
	}
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	// translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		if (detectWeb(doc, url) == "newspaperArticle") {
			Z.debug(item.date);
			item.date = doc.evaluate('//meta[@name="REVISION_DATE"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().content;
			Z.debug(item.date);
			var byline = ZU.xpathText(doc, '//div[@id="articleInfo"]//p[@class="byline"]');
			if (byline) {
				var authors = byline.substr(3).split(/and |,/);
				for (var i=0; i<authors.length; i++) {
					item.creators.push(authorFix(authors[i]));
				}
			}
			item.publicationTitle = "Reuters";
		}
		if (detectWeb(doc, url) == "blogPost") {
			item.date = text(doc, '#thebyline .timestamp');
			var byline = text(doc, 'div.author');
			if (byline) {
				var authors = byline.split(/and |,/);
				for (var i=0; i<authors.length; i++) {
					item.creators.push(authorFix(authors[i]));
				}
			}
	
			var blogtitle = text(doc, 'h1');
			if (blogtitle) item.publicationTitle = "Reuters Blogs - " + blogtitle;
			else item.publicationTitle = "Reuters Blogs";
		}
		
		if (item.date) {
			item.date = ZU.strToISO(item.date);
		}
		item.place = ZU.xpathText(doc, '//div[@id="articleInfo"]//span[@class="location"]');
		if (item.place) {
			if (item.place == item.place.toUpperCase()) item.place = Zotero.Utilities.capitalizeTitle(item.place.toLowerCase(), true);
		}

		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.itemType = type;
		trans.doWeb(doc, url);
	});
}


function authorFix(author) {
	// Sometimes we have "By Author"
	author = author.replace(/^\s*by/i, '');

	var cleaned = Zotero.Utilities.cleanAuthor(author, "author");
	// If we have only one name, set the author to one-name mode
	if (cleaned.firstName == "") {
		cleaned["fieldMode"] = true;
	} else {
		// We can check for all lower-case and capitalize if necessary
		// All-uppercase is handled by cleanAuthor
		cleaned.firstName = (cleaned.firstName == cleaned.firstName.toLowerCase()) ? Zotero.Utilities.capitalizeTitle(cleaned.firstName, true) : cleaned.firstName;
		cleaned.lastName = (cleaned.lastName == cleaned.lastName.toLowerCase()) ? Zotero.Utilities.capitalizeTitle(cleaned.lastName, true) : cleaned.lastName;
	}
	return cleaned;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.reuters.com/article/2011/11/14/us-eurozone-idUSTRE7AC15K20111114",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Europe could be in worst hour since WW2: Merkel",
				"creators": [
					{
						"firstName": "James",
						"lastName": "Mackenzie",
						"creatorType": "author"
					},
					{
						"firstName": "Barry",
						"lastName": "Moody",
						"creatorType": "author"
					}
				],
				"date": "Mon Nov 14 21:16:28 UTC 2011",
				"abstractNote": "ROME (Reuters) - Prime Minister-designate Mario Monti meets the leaders of Italy's biggest two parties on Tuesday to discuss the many sacrifices needed to reverse a collapse in market confidence that is",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "Reuters",
				"place": "Rome",
				"publicationTitle": "Reuters",
				"shortTitle": "Europe could be in worst hour since WW2",
				"url": "http://www.reuters.com/article/2011/11/14/us-eurozone-idUSTRE7AC15K20111114",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"Angela Merkel",
					"Angela Merkel",
					"Angela Merkel",
					"Antonis Samaras",
					"Antonis Samaras",
					"George Papandreou",
					"George Papandreou",
					"Germany",
					"Germany",
					"Germany",
					"Giorgio Napolitano",
					"Greece",
					"Greece",
					"Harry Papachristou",
					"Harry Papachristou",
					"Italy",
					"Italy",
					"Jack Ablin",
					"Jens Weidmann",
					"Jens Weidmann",
					"Kai Pfaffenbach",
					"Kai Pfaffenbach",
					"Lucas Papademos",
					"Lucas Papademos",
					"Mario Monti",
					"Mario Monti",
					"Olli Rehn",
					"Olli Rehn",
					"Philip Pullella",
					"Philip Pullella",
					"Silvio Berlusconi",
					"Silvio Berlusconi"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://blogs.reuters.com/lawrencesummers/2012/03/26/its-too-soon-to-return-to-normal-policies/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "It’s too soon to return to normal policies",
				"creators": [
					{
						"firstName": "Lawrence",
						"lastName": "Summers",
						"creatorType": "author"
					}
				],
				"abstractNote": "After years when the risks to the consensus modest-growth forecast were to the downside, they are now very much two-sided.",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "Reuters",
				"publicationTitle": "Reuters Blogs - Lawrence Summers",
				"url": "http://blogs.reuters.com/lawrencesummers/2012/03/26/its-too-soon-to-return-to-normal-policies/",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"deficit",
					"fiscal policy",
					"housing",
					"recovery",
					"unemployment"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.reuters.com/search?blob=europe",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.reuters.com/search/news?blob=europe",
		"items": "multiple"
	}
]
/** END TEST CASES **/
