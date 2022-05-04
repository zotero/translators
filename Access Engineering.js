{
	"translatorID": "d120a8a7-9d45-446e-8c18-ad9ef0a6bf47",
	"label": "Access Engineering",
	"creator": "Vinoth K - highwirepress.com",
	"target": "^https://www.accessengineeringlibrary.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-04-01 14:06:45"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020-2021 Vinoth K - highwirepress.com
	
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
	let title = attr(doc, 'meta[name="citation_title"]', 'content');
	if (title) {
		if (doc.querySelector('meta[name="citation_isbn"]')) {
			let bookTitle = attr(doc, 'meta[name="citation_book_title"]', 'content');
			if (!bookTitle && title != bookTitle) {
				return "book";
			} else {
				return "bookSection";
			}
		} else {
			return "journalArticle";
		}
	}
	return false;
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	// EM is, as a general rule, better than RIS on this site. It's missing a
	// couple things, though - subtitles, DOIs for books (to the extent that
	// those are useful) - so we'll fill those in manually.
	
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		// Title
		let title = ZU.xpathText(doc, '//meta[@name="citation_title"]/@content');
		if(title) item.title = title;

		// Author
		let author = ZU.xpath(doc, '//meta[contains(@name, "citation_author")]');
		item.creators= [];
		for (let i = 0; i < author.length; i++) {
			let cleaned = author[i].content.replace(/\(.*\)$/, '').trim();
			item.creators.push(ZU.cleanAuthor(cleaned, 'author'));
		}

		// Date
		let doi = ZU.xpathText(doc, '//meta[@name="citation_publication_date"]/@content');
		if(doi) item.date = doi;

		// URL
		let url = ZU.xpathText(doc, '//meta[@name="citation_public_url"]/@content');
		if(url) item.url = url;

		// Abstract
		let abstractNote = ZU.xpathText(doc, '//meta[@name="citation_abstract"]/@content');
		if(abstractNote) item.abstractNote = abstractNote;

		// Book Title
		let book__title = ZU.xpathText(doc, '//meta[@name="citation_book_title"]/@content');
		if(book__title) item.bookTitle = book__title;

		// ISBN
		let ISBN = ZU.xpathText(doc, '//meta[@name="citation_isbn"]/@content');
		if(ISBN) item.ISBN = ISBN;

		// Edition
		let edition = ZU.xpathText(doc, '//meta[@name="citation_edition"]/@content');
		if(edition) item.edition = edition;

		// Publisher
		let publisher = ZU.xpathText(doc, '//meta[@name="citation_publisher"]/@content');
		if(publisher) item.publisher = publisher;

		item.complete();		
	});

	translator.getTranslatorObject(function(trans){
		if(detectWeb(doc, url) == "bookSection") {
			trans.itemType = "bookSection";
		}
		trans.addCustomFields({
			citation_book_title: "bookTitle"
		});
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [];
/** END TEST CASES **/
