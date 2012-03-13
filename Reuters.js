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
	"browserSupport": "gcs",
	"lastUpdated": "2012-03-03 23:37:03"
}

/*
   Reuters Translator
   Copyright (C) 2011 Avram Lyon, ajlyon@gmail.com, Sebastian Karcher

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

function detectWeb(doc, url) {
	if (url.match(/^https?:\/\/(www\.)?reuters\.com\/article/)) {
		return "newspaperArticle";
	} else if (url.match(/^https?:\/\/blogs\.reuters\.com/)) {
	  return "blogPost";
	} else if (url.match(/search\?/)) {
	  return "multiple";
	}
}

function doWeb(doc, url) {
	var articles = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = {};
		var titles = doc.evaluate('//li[@class="searchHeadline"]/a', doc, null, XPathResult.ANY_TYPE, null);
		var title;
		while (title = titles.iterateNext()) {
			items[title.href] = title.textContent;
		}

		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape, function () {
				Zotero.done();
			});
			Zotero.wait();
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	if (detectWeb(doc, url) == "newspaperArticle") {
		var item = new Zotero.Item("newspaperArticle");

		item.title = doc.evaluate('//meta[@property="og:title"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().content;
		item.date = doc.evaluate('//meta[@name="REVISION_DATE"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().content;
		item.place = ZU.xpathText(doc, '//div[@id="articleInfo"]//span[@class="location"]');
		var byline = ZU.xpathText(doc, '//div[@id="articleInfo"]//p[@class="byline"]');
		if (byline) {
			var authors = byline.substr(3).split(/and |,/);
			for each(var aut in authors) {
				item.creators.push(authorFix(aut));
			}
		}
		item.abstractNote = ZU.xpathText(doc, '//span[@class="focusParagraph"]/p').replace(/^.*\(Reuters\)\s+-\s+/, "");
		item.url = doc.evaluate('//link[@rel="canonical"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().href;
		item.publicationTitle = "Reuters";
		if (item.place) {
			if (item.place == item.place.toUpperCase()) item.place = Zotero.Utilities.capitalizeTitle(item.place.toLowerCase(), true);
		}
		item.complete();
	}
	if (detectWeb(doc, url) == "blogPost") {
		var item = new Zotero.Item("blogPost");

		item.title = doc.evaluate('//meta[@property="og:title"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().content;
		item.date = ZU.xpathText(doc, '//div[@id="single"]/div[@class="timestamp"]');
		item.place = ZU.xpathText(doc, '//div[@id="articleInfo"]//span[@class="location"]');
		var byline = ZU.xpathText(doc, '//div[@class="author"]');
		if (byline) {
			var authors = byline.split(/and |,/);
			for each(var aut in authors) {
				item.creators.push(authorFix(aut));
			}
		}
		//	item.abstractNote = ZU.xpathText(doc, '//span[@class="focusParagraph"]/p').replace(/^.*\(Reuters\)\s+-\s+/,"");
		item.url = doc.evaluate('//link[@rel="canonical"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().href;
		var blogtitle = ZU.xpathText(doc, '//h1');
		if (blogtitle) item.publicationTitle = "Reuters Blogs - " + blogtitle;
		else item.publicationTitle = "Reuters Blogs";
		if (item.place) {
			if (item.place == item.place.toUpperCase()) item.place = Zotero.Utilities.capitalizeTitle(item.place.toLowerCase(), true);
		}
		item.complete();
	}


}

function authorFix(author) {
	// Sometimes we have "By Author"
	if (author.substr(0, 3).toLowerCase() == "by ") {
		author = author.substr(3);
	}
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
var testCases = [{
	"type": "web",
	"url": "http://www.reuters.com/article/2011/11/14/us-eurozone-idUSTRE7AC15K20111114",
	"items": [{
		"itemType": "newspaperArticle",
		"creators": [{
			"firstName": "James",
			"lastName": "Mackenzie",
			"creatorType": "author"
		}, {
			"firstName": "Barry",
			"lastName": "Moody",
			"creatorType": "author"
		}],
		"notes": [],
		"tags": [],
		"seeAlso": [],
		"attachments": [],
		"title": "Europe could be in worst hour since WW2: Merkel",
		"date": "Mon Nov 14 21:16:28 UTC 2011",
		"place": "Rome",
		"abstractNote": "Prime Minister-designate Mario Monti meets the leaders of Italy's biggest two parties on Tuesday to discuss the \"many sacrifices\" needed to reverse a collapse in market confidence that is driving an ever deepening euro zone debt crisis.",
		"url": "http://www.reuters.com/article/2011/11/14/us-eurozone-idUSTRE7AC15K20111114",
		"publicationTitle": "Reuters",
		"libraryCatalog": "Reuters",
		"accessDate": "CURRENT_TIMESTAMP",
		"shortTitle": "Europe could be in worst hour since WW2"
	}]
}] /** END TEST CASES **/
