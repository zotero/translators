{
	"translatorID": "e969da6b-30c9-4b26-8fcc-c2d78bce685f",
	"label": "JournalReligionSociety",
	"creator": "Vincent Carret",
	"target": "^https?://(www\\.)?moses.creighton.edu/JRS",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-11-21 19:14:26"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Vincent Carret
	
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
	// Three possible cases : the list of articles of an issue, the list of content of a supplement, or the list of the supplements
	if (getSearchResults(doc, true) || url.search('/toc/SS') > -1 || url.search('/toc/Supplement') > -1) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = [];
	var found = false;
	
	// We have a different querySelector according to the page (respectively, all supplements page, journal issue page, and supplement issue page)
	var rows = doc.querySelectorAll('div[class^=pubs] p.SuppVolume em,div[class^=pubs] p.title, div[class^=pubs] p.chap');
	for (let row of rows) {
		let title = ZU.trimInternal(row.textContent);
		if (!title) continue;
		if (checkOnly) return true;
		found = true;
		items[title] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) return true;
			for (var id in items) {
				scrape(id, doc, url);
			}
		});
	}
}

function scrape(id, doc, url) {
	var item = null;
	var infoBlock = null;
	var author = null;
	var pdfurl = "";
	if (url.search('/toc/SS') == -1 && url.search('/toc/Supplement') == -1) {
		item = new Zotero.Item("journalArticle");
		item.title = id;
		item.publicationTitle = "Journal of Religion & Society";
		item.date = doc.querySelector(".heading").textContent.split('(')[1].match(/\d+/)[0];
		item.volume = doc.querySelector(".heading").textContent.split('(')[0].match(/\d+/)[0];
		item.url = url;
		
		infoBlock = doc.evaluate("//p[contains(., '" + id + "')]", doc, null, XPathResult.ANY_TYPE, null)
		.iterateNext()
		.nextElementSibling;
		author = infoBlock.textContent.split("\n");
		item.creators.push(author);
		for (let auth of author.slice(0, author.length - 1)) {
			item.creators.push(ZU.cleanAuthor(auth.split(", ")[0], "author", false));
		}
	
		if (infoBlock.querySelectorAll("a:last-child")[0].textContent.search("PDF") > -1) {
			pdfurl = infoBlock.querySelectorAll("a:last-child")[0].getAttribute('href');
			item.attachments.push({
				title: item.title,
				mimeType: "application/pdf",
				url: pdfurl
			});
		}
		
		if (infoBlock.querySelectorAll("a")[0].textContent.search("Abstract") > -1) {
			let abstract = infoBlock.querySelectorAll("a")[0].getAttribute("href").split("'")[1];
			item.abstractNote = doc.getElementById(abstract).textContent;
		}
	}
	else if (url.search('/toc/Supplement') > -1) {
		let root = "http://moses.creighton.edu/JRS/toc/";
		item = new Zotero.Item("book");
		item.title = id;
		item.series = "Supplement of the Journal of Religion & Society";
		item.publisher = "Journal of Religion & Society Supplement";
		
		infoBlock = doc.evaluate("//p[contains(., '" + id + "')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext();
		item.date = infoBlock.querySelector("em").nextSibling.textContent.match(/\d+/)[0];
		item.seriesNumber = infoBlock.querySelector("a").textContent.match(/\d+/)[0];
		item.url = root + infoBlock.querySelector("a").getAttribute("href");
		author = infoBlock.nextElementSibling.textContent.split(",")[0].replace("Edited by ", "").split(" and ");
		for (let auth of author) item.creators.push(ZU.cleanAuthor(auth, "editor", false));
	}
	else if (url.search('/toc/SS') > -1) {
		item = new Zotero.Item("bookSection");
		item.title = id.split(" (")[0];
		item.series = "Supplement of the Journal of Religion & Society";
		item.seriesNumber = doc.querySelector(".heading").textContent.split('(')[0].match(/\d+/)[0];
		item.publisher = "Journal of Religion & Society Supplement";
		item.date = doc.querySelector(".heading").textContent.split('(')[1].match(/\d+/)[0];
		item.bookTitle = doc.querySelector(".suppTitle").textContent;
		author = doc.querySelector("p.SuppAuthor, p.editor").textContent.split(",")[0].replace("Edited by ", "").split(" and ");
		for (let auth of author) item.creators.push(ZU.cleanAuthor(auth, "editor", false));
		item.url = url;
		
		infoBlock = doc.evaluate("//p[contains(., '" + id + "')]", doc, null, XPathResult.ANY_TYPE, null).iterateNext();
		item.pages = infoBlock.textContent.split("(pp. ")[1].replace(")", "");
		author = infoBlock.nextElementSibling.textContent.split(",")[0].split(" and ");
		for (let auth of author) item.creators.push(ZU.cleanAuthor(auth, "author", false));
		
		pdfurl = infoBlock.nextElementSibling.querySelectorAll("a:last-child")[0].getAttribute('href');
		item.attachments.push({
			title: item.title,
			mimeType: "application/pdf",
			url: pdfurl
		});
		
		if (infoBlock.nextElementSibling.querySelectorAll("a")[0].textContent.search("Abstract") > -1) {
			let abstract = infoBlock.nextElementSibling.querySelectorAll("a")[0].getAttribute("href").split("'")[1];
			item.abstractNote = doc.getElementById(abstract).textContent;
		}
	}
	
	item.libraryCatalog = "Journal of Religion and Society";
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://moses.creighton.edu/JRS/toc/2016.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://moses.creighton.edu/JRS/toc/Supplement.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://moses.creighton.edu/JRS/toc/SS17.html",
		"items": "multiple"
	}
]
/** END TEST CASES **/
