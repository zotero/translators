{
	"translatorID": "d3ee2368-04d7-4b4d-a8f3-c20c3f5234a9",
	"label": "Oxford English Dictionary",
	"creator": "Sebastian Karcher",
	"target": "^https?://(www\\.)?oed\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-07-17 00:07:32"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2013 Sebastian Karcher
	This file is part of Zotero.
	
	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
	
	***** END LICENSE BLOCK *****
*/

// eslint-disable-next-line
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}

function detectWeb(doc, url) {
	if (url.match(/\/search\?/)) return 'multiple';
	if (url.match(/\/view\/Entry\//)) return 'dictionaryEntry';
	return false;
}

function scrape(doc, url) {
	let item = new Zotero.Item('dictionaryEntry');
	item.url = url.replace(/\?.+/, '');
	item.title = ZU.trimInternal(text(doc, 'h1 .hwSect') || '');

	item.attachments = [
		{
			url: url,
			title: "OED snapshot",
			mimeType: "text/html"
		}
	];

	item.language = 'en-GB';
	item.publisher = 'Oxford University Press';
	item.publicationTitle = 'OED Online';

	item.complete();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === 'multiple') {
		let items = {};
		for (let item of doc.querySelectorAll('div#results h2 .word a')) {
			let title = item.textContent.trim();
			let href = item.getAttribute('href');
			if (title && href) items[href] = title;
		}

		Zotero.selectItems(items, function (items) {
			ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.oed.com/view/Entry/104732",
		"items": [
			{
				"itemType": "dictionaryEntry",
				"title": "labour | labor, n.",
				"creators": [],
				"dictionaryTitle": "OED Online",
				"language": "en-GB",
				"libraryCatalog": "Oxford English Dictionary",
				"publisher": "Oxford University Press",
				"url": "http://www.oed.com/view/Entry/104732",
				"attachments": [
					{
						"title": "OED snapshot",
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
		"url": "http://www.oed.com/search?searchType=dictionary&q=labor&_searchBtn=Search",
		"items": "multiple"
	}
]
/** END TEST CASES **/
