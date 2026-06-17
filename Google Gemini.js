{
	"translatorID": "8a0e0cde-0d21-43f6-915b-d1aab9dd0520",
	"label": "Google Gemini",
	"creator": "Abe Jellinek",
	"target": "^https://gemini\\.google\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-27 15:55:46"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Abe Jellinek

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

// It should go without saying, but please don't take Gemini's
// Shakespearean advice for Zotero translator development.


function detectWeb(doc, url) {
	if (url.includes('/app/') || url.includes('/share/')) {
		return 'webpage';
	}
	return false;
}

async function doWeb(doc, url) {
	let item = new Zotero.Item('webpage');
	item.title = ZU.ellipsize(text(doc, 'p.query-text-line'), 75);
	item.websiteTitle = 'Gemini';
	item.websiteType = 'Generative AI chat';

	if (url.includes('/share/')) {
		item.url = url;

		let headline = doc.querySelector('.title-link');
		if (headline) {
			item.title = text(headline, 'h1 strong') || item.title;
			item.url = attr(headline, '.share-link', 'href') || item.url;
			item.date = ZU.strToISO(text(headline, '.publish-time-mode > :last-child'));
			// This may break! But it isn't crucial and we don't have much to match on here.
			item.websiteTitle += ' ' + text(headline, '.publish-time-mode > span:first-child > strong:only-child');
		}
	}
	
	item.creators.push({
		creatorType: 'author',
		lastName: 'Google',
		fieldMode: 1
	});
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
		"url": "https://gemini.google.com/share/d59563f86c7b",
		"defer": true,
		"items": [
			{
				"itemType": "webpage",
				"title": "Crafting Zotero Translators: Shakespearean Style",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Google",
						"fieldMode": 1
					}
				],
				"date": "2025-10-24",
				"shortTitle": "Crafting Zotero Translators",
				"url": "https://gemini.google.com/share/d59563f86c7b",
				"websiteTitle": "Gemini 2.5 Flash",
				"websiteType": "Generative AI chat",
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
