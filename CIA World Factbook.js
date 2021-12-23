{
	"translatorID": "d9d4822f-f69e-4f31-b094-5324b2a04761",
	"label": "CIA World Factbook",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.cia\\.gov/the-world-factbook/countries/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-20 03:58:54"
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
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (doc.querySelector('h1.hero-title')) {
		return "encyclopediaArticle";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('#index-content-section a[href*="/countries/"]');
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
	let item = new Zotero.Item('encyclopediaArticle');
	
	item.title = text(doc, 'h1.hero-title');
	item.encyclopediaTitle = 'The World Factbook';
	item.publisher = 'Central Intelligence Agency';
	item.date = ZU.strToISO(text(doc, '.header-subsection-date'));
	item.url = url;
	item.language = 'en';
	item.libraryCatalog = 'CIA.gov';
	
	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.cia.gov/the-world-factbook/countries/australia/",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Australia",
				"creators": [],
				"date": "2021-07-06",
				"encyclopediaTitle": "The World Factbook",
				"language": "en",
				"libraryCatalog": "CIA.gov",
				"publisher": "Central Intelligence Agency",
				"url": "https://www.cia.gov/the-world-factbook/countries/australia/",
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
		"url": "https://www.cia.gov/the-world-factbook/countries/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
