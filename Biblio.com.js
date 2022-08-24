{
	"translatorID": "9932d1a7-cc6d-4d83-8462-8f6658b13dc0",
	"label": "Biblio.com",
	"creator": "Adam Crymble, Michael Berkowitz, Sebastian Karcher, and Abe Jellinek",
	"target": "^https?://www\\.biblio\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-14 21:52:42"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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
	if (url.includes('/book/')) {
		return "book";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h2.title > a[href*="/book/"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
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
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, _url) {
	let item = new Zotero.Item('book');
	
	for (let keyElem of doc.querySelectorAll('#d-book-details dt')) {
		let key = ZU.trimInternal(keyElem.textContent);
		let value = keyElem.nextElementSibling.textContent;

		switch (key) {
			case 'Title':
				item.title = value.replace(/\.\s*$/, '');
				break;
			case 'Author':
				for (let name of value.split(';')) {
					item.creators.push(ZU.cleanAuthor(name, 'author', true));
				}
				break;
			case 'Edition':
				item.edition = value;
				break;
			case 'Publisher':
				item.publisher = value;
				break;
			case 'Place of Publication':
				item.place = value;
				break;
			case 'Date published':
			case 'First published':
			case 'This edition first published':
				item.date = ZU.strToISO(value);
				break;
			case 'ISBN 10':
			case 'ISBN 13':
				item.ISBN = ZU.cleanISBN(value);
				break;
			default:
				if (!item.date && /\bpublished\b/i.test(key)) {
					// handle odd date labels, just in case
					item.date = ZU.strToISO(value);
				}
				break;
		}
	}
	
	item.url = attr(doc, 'link[rel="canonical"]', 'href');
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.biblio.com/search.php?keyisbn=dickens&stage=1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.biblio.com/book/through-year-dickens-compiled-his-eldest/d/29965287",
		"items": [
			{
				"itemType": "book",
				"title": "Through The Year With Dickens. Compiled by his Eldest Daughter",
				"creators": [
					{
						"firstName": "Charles",
						"lastName": "Dickens",
						"creatorType": "author"
					}
				],
				"date": "1909",
				"edition": "First American",
				"libraryCatalog": "Biblio.com",
				"place": "Boston, USA",
				"publisher": "DeWolfe, Fiske & Co",
				"url": "https://www.biblio.com/book/through-year-dickens-compiled-his-eldest/d/29965287",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.biblio.com/book/charming-children-dickens-stories-dickens-charles/d/1397028696",
		"items": [
			{
				"itemType": "book",
				"title": "Charming Children of Dickens' Stories",
				"creators": [
					{
						"firstName": "Charles",
						"lastName": "Dickens",
						"creatorType": "author"
					},
					{
						"firstName": "Angela",
						"lastName": "Dickens",
						"creatorType": "author"
					}
				],
				"date": "1906",
				"libraryCatalog": "Biblio.com",
				"place": "Chicago",
				"publisher": "John A. Hertel Company",
				"url": "https://www.biblio.com/book/charming-children-dickens-stories-dickens-charles/d/1397028696",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.biblio.com/book/birds-without-wings-bernieres-louis/d/920369973",
		"items": [
			{
				"itemType": "book",
				"title": "Birds Without Wings",
				"creators": [
					{
						"firstName": "LOUIS",
						"lastName": "DE BERNIERES",
						"creatorType": "author"
					}
				],
				"date": "2005-06-28",
				"ISBN": "9781400079322",
				"libraryCatalog": "Biblio.com",
				"place": "New York",
				"publisher": "Vintage",
				"url": "https://www.biblio.com/book/birds-without-wings-bernieres-louis/d/920369973",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
