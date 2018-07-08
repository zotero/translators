{
	"translatorID": "0754db60-3ad1-49e0-8e3f-f4e1210c756c",
	"label": "UNZ Print Archive",
	"creator": "czar",
	"target": "^https?://(www\\.)?unz\\.com/print",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-07-08 19:37:21"
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


function detectWeb(doc, url) {
	if (/\/print\/.*-\d{5}/.test(url)) {
		return "magazineArticle";
	} else if (getSearchResults(doc, true, url)) {
		return "multiple";
	}
}


function scrape(doc, url) {
	var item = new Zotero.Item("magazineArticle");
	item.libraryCatalog = "UNZ";
	item.title = doc.querySelector('.block .head').textContent;
	var authorMetadata = doc.querySelectorAll('#pub-heading .byline a');
	for (let author of authorMetadata) {
		item.creators.push(ZU.cleanAuthor(author.text, "author"));
	}
	var subhead = doc.querySelector('#pub-heading .subhead');
	if (subhead) { // test whether previous XPath was positive
		subhead = subhead.innerText;
		var reviewedAuthor = subhead.replace(/.*\sby\s(.*)/,'$1');
		item.creators.push(Zotero.Utilities.cleanAuthor(reviewedAuthor, "reviewedAuthor"));
		item.tags[0] = subhead.replace(/(.*),\sby\s.*/,'$1');
	}
	var sourceline = doc.querySelector('#pub-heading .sourceline');
	if (sourceline) {
		item.publicationTitle = doc.querySelector('.sourceline i').textContent;
		item.date = doc.querySelector('.sourceline a').textContent;
		item.pages = sourceline.textContent.replace(/.*p+\.\s(\d+(-\d+)?).*/,'$1'); // http://regexr.com/3du86	
	}
	item.language = "en";
	item.extra = url;	// no need to reference the page once citation is taken w/ link attachment, but can be useful see whence the citation came
	var pdfURL = doc.querySelector('iframe#insert-pdf');
	if (pdfURL) {
		pdfURL = pdfURL.getAttribute('src');
		item.attachments.push({	// no need for snapshots, but download PDF if available
			url: pdfURL,
			title: item.title,
			mimeType:"application/pdf"
		});
	}

	item.complete();
}


function getSearchResults(doc, checkOnly, url) {
	var items = {};
	var found = false;
	var rows;
	if (url.includes('/Contents/')) {
		rows = doc.querySelectorAll('.show .pub-text a.head');
	} else {
		rows = doc.querySelectorAll('.pub-text a.head');
	}
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
	switch (detectWeb(doc, url)) {
		case "multiple":
			Zotero.selectItems(getSearchResults(doc, false, url), function (items) {
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
		case "magazineArticle":
			scrape(doc, url);
			break;
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.unz.com/print/NYRevBooks-1969nov20-00027",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Can Technology Be Humane?",
				"creators": [
					{
						"firstName": "Paul",
						"lastName": "Goodman",
						"creatorType": "author"
					}
				],
				"date": "November 20, 1969",
				"extra": "http://www.unz.com/print/NYRevBooks-1969nov20-00027",
				"language": "en",
				"libraryCatalog": "UNZ",
				"pages": "27-33",
				"publicationTitle": "The New York Review of Books",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.unz.com/print/Freeman-1958oct-00058",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Mental Prep vs. Pragmatic Tech",
				"creators": [
					{
						"firstName": "John",
						"lastName": "Chamberlain",
						"creatorType": "author"
					},
					{
						"firstName": "John",
						"lastName": "Keats",
						"creatorType": "reviewedAuthor"
					}
				],
				"date": "October 1958",
				"extra": "http://www.unz.com/print/Freeman-1958oct-00058",
				"language": "en",
				"libraryCatalog": "UNZ",
				"pages": "58-61",
				"publicationTitle": "The Freeman",
				"attachments": [
					{
						"title": "Mental Prep vs. Pragmatic Tech",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Schools Without Scholars"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.unz.com/print/author/GoodmanPaul/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.unz.com/print/Politics-1946nov",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.unz.com/print/Harpers/Contents/?Period=1982",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.unz.com/print/Search/?Author=goodman&ContentType=Print&PubType=All&Action=Search",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.unz.com/print/NewRepublic-1943dec20-00878",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Architecture in Wartime",
				"creators": [
					{
						"firstName": "Percival",
						"lastName": "Goodman",
						"creatorType": "author"
					},
					{
						"firstName": "Paul",
						"lastName": "Goodman",
						"creatorType": "author"
					}
				],
				"date": "December 20, 1943",
				"extra": "http://www.unz.com/print/NewRepublic-1943dec20-00878",
				"language": "en",
				"libraryCatalog": "UNZ",
				"pages": "878-882",
				"publicationTitle": "The New Republic",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.unz.com/print/NYRevBooks-1970may21-00003/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Good Man",
				"creators": [
					{
						"firstName": "Robert",
						"lastName": "Mazzocco",
						"creatorType": "author"
					},
					{
						"firstName": "Paul",
						"lastName": "Goodman",
						"creatorType": "reviewedAuthor"
					}
				],
				"date": "May 21, 1970",
				"extra": "http://www.unz.com/print/NYRevBooks-1970may21-00003/",
				"language": "en",
				"libraryCatalog": "UNZ",
				"pages": "3-4",
				"publicationTitle": "The New York Review of Books",
				"attachments": [],
				"tags": [
					{
						"tag": "Hawkweed: Poems"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
