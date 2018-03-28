{
	"translatorID": "cd77f1e5-507f-4c41-a6d2-bda5fa6f8694",
	"label": "Readability",
	"creator": "Avram Lyon",
	"target": "^https?://www\\.readability\\.com/articles",
	"minVersion": "2.1.3",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2014-01-05 12:14:58"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Readability Translator
	Copyright © 2011 Avram Lyon, ajlyon@gmail.com

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

function detectWeb(doc, url){

	var title = doc.evaluate('//h1[@id="article-entry-title"]', doc, null, XPathResult.ANY_TYPE, null);
	if (title) return "webpage";
	else return false;
}

function doWeb(doc, url){

	// Since we don't know much about the site, we have to assume that
	// it is a webpage
	var item = new Zotero.Item("webpage");
	var title = doc.evaluate('//h1[contains(@class, "entry-title")]', doc, null, XPathResult.ANY_TYPE, null);
	item.title = title.iterateNext().textContent;
	var rurl = doc.evaluate('//a[@id="article-url"]', doc, null, XPathResult.ANY_TYPE, null);
	rurl = rurl.iterateNext();
	item.url = rurl.href;

	// This is just the domain name, but it'll serve as the site title,
	// since we don't know anything else.
	item.websiteTitle = rurl.textContent;

	// It is possible that Readability sometimes has multiple authors,
	// in which case this will have to be slightly amended
	var author = doc.evaluate('//li[contains(@class, "byline")]/span[@class="fn"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if (author) {
		var auts = author.textContent.split(" and ");
		for (var i in auts) {
			if(auts[i].toUpperCase() == auts[i]) {
				auts[i] = Zotero.Utilities.capitalizeTitle(auts[i].toLowerCase(), true)
			}
			item.creators.push(Zotero.Utilities.cleanAuthor(auts[i],"author"));
		}
	}

	// There is also a standardized timestamp, but we're ignoring that
	// in favor of the nice-looking time.
	var time = doc.evaluate('//time[@class="updated"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if(time) item.date = time.textContent;

	// We snapshot the page, using the existing document
	item.attachments = [{document:doc, title:"Readability Snapshot"}]
	item.complete();
}
/** BEGIN TEST CASES **/
var testCases = []
/** END TEST CASES **/