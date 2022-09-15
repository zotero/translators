{
	"translatorID": "31807458-4c59-4a9c-b78f-e6267aca53be",
	"label": "Failed Architecture",
	"creator": "Abe Jellinek",
	"target": "^https?://failedarchitecture\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-05 21:18:37"
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
	// we should support the podcast, but the page has such minimal metadata
	// that we won't get anything very useful.
	
	if (doc.body.classList.contains('non-podcast')
		&& doc.querySelector('.post-content')) {
		return "blogPost";
	}
	// no search
	return false;
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		if (!item.date) {
			item.date = ZU.strToISO(text(doc, '.post-content__date'));
		}
		
		item.creators = [];
		for (let author of doc.querySelectorAll('.post-header .author')) {
			item.creators.push(ZU.cleanAuthor(author.textContent, 'author'));
		}
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = 'blogPost';
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://failedarchitecture.com/any-challenge-to-the-uks-hostile-environment-has-to-start-by-exposing-its-data-infrastructure/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Any Challenge to the UK’s Hostile Environment Has to Start by Exposing Its Data Infrastructure",
				"creators": [
					{
						"firstName": "Jake",
						"lastName": "Arnfield",
						"creatorType": "author"
					}
				],
				"date": "2021-08-06",
				"abstractNote": "Hidden data infrastructure is integral to advancements in the UK's immigration enforcement capabilities. Exposing this infrastructure will therefore b...",
				"blogTitle": "Failed Architecture",
				"language": "en",
				"url": "https://failedarchitecture.com/any-challenge-to-the-uks-hostile-environment-has-to-start-by-exposing-its-data-infrastructure/",
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
