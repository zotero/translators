{
	"translatorID": "64b634ce-3957-4c89-bcce-7603fe552780",
	"label": "CalMatters",
	"creator": "Abe Jellinek",
	"target": "^https?://calmatters\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-07 18:07:46"
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
	if (doc.querySelector('meta[property="article:publisher"]')) {
		return "newspaperArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h2.entry-title > a');
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
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		item.section = text(doc, '.cat-links a');
		
		if (!item.creators.length) {
			// grab just the first .byline
			let byline = doc.querySelector('.byline');
			for (let author of byline.querySelectorAll('.author a')) {
				item.creators.push(ZU.cleanAuthor(author.textContent, 'author'));
			}
		}
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "newspaperArticle";
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://calmatters.org/california-divide/2021/07/california-mothers-return-work/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Mothers struggle to return to work as California reopens",
				"creators": [
					{
						"firstName": "Jesse",
						"lastName": "Bedayn",
						"creatorType": "author"
					}
				],
				"date": "2021-07-07T12:30:00+00:00",
				"abstractNote": "As California opens back up, people are rejoining the workforce. But for mothers, economic recovery may not kick in until school returns.",
				"language": "en-US",
				"libraryCatalog": "calmatters.org",
				"publicationTitle": "CalMatters",
				"section": "California Divide",
				"url": "https://calmatters.org/california-divide/2021/07/california-mothers-return-work/",
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
		"url": "https://calmatters.org/california-divide/2021/07/look-up-california-stimulus-golden-state/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Look up your Golden State Stimulus amount",
				"creators": [
					{
						"firstName": "Erica",
						"lastName": "Yee",
						"creatorType": "author"
					},
					{
						"firstName": "Frida",
						"lastName": "Qi",
						"creatorType": "author"
					},
					{
						"firstName": "Jackie",
						"lastName": "Botts",
						"creatorType": "author"
					}
				],
				"date": "2021-07-01T12:30:00+00:00",
				"abstractNote": "Check this calculator to see if you're eligible for the Golden State Stimulus — and how much you'll get from California.",
				"language": "en-US",
				"libraryCatalog": "calmatters.org",
				"publicationTitle": "CalMatters",
				"section": "California Divide",
				"url": "https://calmatters.org/california-divide/2021/07/look-up-california-stimulus-golden-state/",
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
		"url": "https://calmatters.org/housing/2021/07/california-eviction-moratorium-tenants/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Where are tenants falling through the cracks of California eviction ban?",
				"creators": [
					{
						"firstName": "Manuela",
						"lastName": "Tobias",
						"creatorType": "author"
					},
					{
						"firstName": "Nigel",
						"lastName": "Duara",
						"creatorType": "author"
					},
					{
						"firstName": "John Osborn",
						"lastName": "D'Agostino",
						"creatorType": "author"
					}
				],
				"date": "2021-07-01T12:30:00+00:00",
				"abstractNote": "Landlords and sheriffs are evicting renters at higher rates in the Central Valley, while Bay Area counties have added protections for tenants.",
				"language": "en-US",
				"libraryCatalog": "calmatters.org",
				"publicationTitle": "CalMatters",
				"section": "Housing",
				"url": "https://calmatters.org/housing/2021/07/california-eviction-moratorium-tenants/",
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
		"url": "https://calmatters.org/?s=gavin",
		"items": "multiple"
	}
]
/** END TEST CASES **/
