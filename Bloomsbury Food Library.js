{
	"translatorID": "0524c89b-2a96-4d81-bb05-ed91ed8b2b47",
	"label": "Bloomsbury Food Library",
	"creator": "Abe Jellinek",
	"target": "^https?://(www\\.)?bloomsburyfoodlibrary\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-03 01:17:12"
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
	if (doc.querySelector('a[href*="/getris"]')) {
		if (url.includes('bloomsburyfoodlibrary.com/encyclopedia-chapter')) {
			if (text(doc, '.subfacet').includes('Book chapter')) {
				return 'bookSection';
			}
			else {
				return 'encyclopediaArticle';
			}
		}
		else if (url.includes('bloomsburyfoodlibrary.com/audio')) {
			// would like to support these, but the RIS isn't useful
			return false;
		}
		else if (url.includes('bloomsburyfoodlibrary.com/museum')) {
			return 'artwork';
		}
		else {
			return 'book';
		}
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a#search-result-link');
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

function scrape(doc, url) {
	var risURL = attr(doc, 'a[href*="/getris"]', 'href');

	ZU.doGet(risURL, function (text) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			let detectedType = detectWeb(doc, url);
			if (detectedType == 'encyclopediaArticle' && item.itemType == 'bookSection') {
				item.itemType = 'encyclopediaArticle';
				item.encyclopediaTitle = item.bookTitle;
				delete item.bookTitle;
			}
			else if (detectedType == 'book' && item.itemType == 'bookSection') {
				item.itemType = 'book';
				delete item.bookTitle;
				
				// filter out duplicate "editor" names
				let names = new Set();
				item.creators = item.creators.filter((creator) => {
					let fullName = `${creator.lastName}, ${creator.firstName}`;
					if (names.has(fullName)) {
						return false;
					}
					
					names.add(fullName);
					return true;
				});
			}
			else if (detectedType == 'artwork') {
				item.itemType = 'artwork';
			}
			
			for (let prop of ['title', 'bookTitle', 'encyclopediaTitle']) {
				if (item[prop]) {
					item[prop] = item[prop].replace(/ : /, ': ');
				}
			}
			
			if (item.publisher) {
				item.publisher = item.publisher.replace('©', '');
			}
			
			item.archive = '';
			
			// contains full text, if we're on a chapter
			item.attachments.push({
				title: 'Snapshot',
				document: doc
			});
			
			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.bloomsburyfoodlibrary.com/encyclopedia-chapter?docid=b-9781474208642&tocid=b-9781474208642-000399&pdfid=9781474208642.0008.pdf",
		"defer": true,
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Burkina Faso",
				"creators": [
					{
						"lastName": "Debevec",
						"firstName": "Liza",
						"creatorType": "author"
					},
					{
						"lastName": "Albala",
						"firstName": "Ken",
						"creatorType": "editor"
					}
				],
				"date": "2011",
				"ISBN": "9781474208642",
				"edition": "1",
				"encyclopediaTitle": "Food Cultures of the World Encyclopedia: Africa and the Middle East",
				"language": "en",
				"libraryCatalog": "Bloomsbury Food Library",
				"pages": "23-30",
				"place": "Santa Barbara",
				"publisher": "ABC-Clio Inc",
				"url": "https://www.bloomsburyfoodlibrary.com/encyclopedia-chapter?docid=b-9781474208642&tocid=b-9781474208642-000399",
				"volume": "1",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://www.bloomsburyfoodlibrary.com/encyclopedia?docid=b-9781474205283",
		"items": [
			{
				"itemType": "book",
				"title": "The Agency of Eating: Mediation, Food and the Body",
				"creators": [
					{
						"lastName": "Abbots",
						"firstName": "Emma-Jayne",
						"creatorType": "author"
					}
				],
				"date": "2017",
				"ISBN": "9781474205283",
				"edition": "1",
				"language": "en",
				"libraryCatalog": "Bloomsbury Food Library",
				"place": "London",
				"publisher": "Bloomsbury Academic",
				"series": "Contemporary Food Studies: Economy, Culture and Politics",
				"shortTitle": "The Agency of Eating",
				"url": "https://www.bloomsburyfoodlibrary.com/encyclopedia?docid=b-9781474205283",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://www.bloomsburyfoodlibrary.com/encyclopedia?docid=b-9781474203937",
		"items": [
			{
				"itemType": "book",
				"title": "Agri-Food and Rural Development: Sustainable Place-Making",
				"creators": [
					{
						"lastName": "Marsden",
						"firstName": "Terry",
						"creatorType": "author"
					}
				],
				"date": "2017",
				"ISBN": "9781474203937",
				"edition": "1",
				"language": "en",
				"libraryCatalog": "Bloomsbury Food Library",
				"place": "London",
				"publisher": "Bloomsbury Academic",
				"series": "Contemporary Food Studies: Economy, Culture and Politics",
				"shortTitle": "Agri-Food and Rural Development",
				"url": "https://www.bloomsburyfoodlibrary.com/encyclopedia?docid=b-9781474203937",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://www.bloomsburyfoodlibrary.com/museumobject?docid=TNA_COPY1_241-95",
		"defer": true,
		"items": [
			{
				"itemType": "artwork",
				"title": "Advert for Hill Evans's barley malt vinegar",
				"creators": [],
				"libraryCatalog": "Bloomsbury Food Library",
				"url": "https://www.bloomsburyfoodlibrary.com/museum?docid=TNA_COPY1_241-95",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://www.bloomsburyfoodlibrary.com/search-results?any=corn",
		"items": "multiple"
	}
]
/** END TEST CASES **/
