{
	"translatorID": "b55076f2-0c40-4195-9f7d-cc08806178d9",
	"label": "Oxford Dictionaries Premium",
	"creator": "Abe Jellinek",
	"target": "^https?://premium\\.oxforddictionaries\\.com/(translate|definition)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-13 22:07:32"
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


function detectWeb(doc, _url) {
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (doc.querySelector('.pageTitle')) {
		return "dictionaryEntry";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// grab the first "senses" list, since it's repeated under each heading
	var senses = doc.querySelector('.senses');
	if (!senses) return false;
	
	var rows = senses.querySelectorAll('li > a');
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
			if (items) scrape(items, doc);
		});
	}
	else {
		let items = {};
		items[url] = text(doc, '.pageTitle');
		scrape(items, doc);
	}
}

function scrape(items, doc) {
	for (let [url, title] of Object.entries(items)) {
		let item = new Zotero.Item('dictionaryEntry');
		
		item.title = title;
		item.dictionaryTitle = 'Oxford Dictionaries';
		let currentLang = text(doc, '.dictBlock.selected');
		if (!currentLang) {
			currentLang = text(doc, '.breadcrumb li:nth-child(2)');
		}
		if (currentLang) {
			item.dictionaryTitle += ` (${currentLang})`;
		}
		item.publisher = 'Oxford University Press';
		item.date = attr(doc, 'meta[itemprop="copyrightYear"]', 'content');
		item.language = attr(doc, 'meta[itemprop="inLanguage"]', 'content');
		item.url = url;
		
		item.attachments.push({
			title: 'Snapshot',
			document: doc
		});
		
		item.complete();
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://premium.oxforddictionaries.com/translate/arabic-english/%D8%A7%D9%84%D9%81?q=%D8%A3%D9%84%D9%81",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://premium.oxforddictionaries.com/translate/arabic-english/%D8%A7%D9%88%D9%84%D9%88%D9%8A%D8%A9?q=%D8%A3%D9%88%D9%84%D9%88%D9%8A%D8%A9",
		"items": [
			{
				"itemType": "dictionaryEntry",
				"title": "أَوْلَويّة",
				"creators": [],
				"date": "2021",
				"dictionaryTitle": "Oxford Dictionaries (Arabic to English)",
				"language": "en",
				"libraryCatalog": "Oxford Dictionaries Premium",
				"publisher": "Oxford University Press",
				"url": "https://premium.oxforddictionaries.com/translate/arabic-english/%D8%A7%D9%88%D9%84%D9%88%D9%8A%D8%A9?q=%D8%A3%D9%88%D9%84%D9%88%D9%8A%D8%A9",
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
		"url": "https://premium.oxforddictionaries.com/definition/spanish/anden?q=and%C3%A9n",
		"items": [
			{
				"itemType": "dictionaryEntry",
				"title": "andén",
				"creators": [],
				"date": "2021",
				"dictionaryTitle": "Oxford Dictionaries (Spanish)",
				"language": "es",
				"libraryCatalog": "Oxford Dictionaries Premium",
				"publisher": "Oxford University Press",
				"url": "https://premium.oxforddictionaries.com/definition/spanish/anden?q=and%C3%A9n",
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
		"url": "https://premium.oxforddictionaries.com/translate/russian-english/%D1%82%D0%B5%D0%BF%D0%B5%D1%80%D1%8C",
		"items": [
			{
				"itemType": "dictionaryEntry",
				"title": "теперь",
				"creators": [],
				"date": "2021",
				"dictionaryTitle": "Oxford Dictionaries (Russian to English)",
				"language": "en",
				"libraryCatalog": "Oxford Dictionaries Premium",
				"publisher": "Oxford University Press",
				"url": "https://premium.oxforddictionaries.com/translate/russian-english/%D1%82%D0%B5%D0%BF%D0%B5%D1%80%D1%8C",
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
	}
]
/** END TEST CASES **/
