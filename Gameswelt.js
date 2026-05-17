{
	"translatorID": "82afda2d-1dd1-4861-8e56-b593d5e0689d",
	"label": "Gameswelt",
	"creator": "Matthias Mailänder",
	"target": "^https?://(www\\.)?gameswelt\\.(de|ch|at)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-12-02 19:11:53"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Matthias Mailänder

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
	if (url.includes('/test/')) {
		return "magazineArticle";
	}
	else if (url.includes('/news/')) {
		return "newspaperArticle";
	}
	return false;
}

function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if (type == "magazineArticle" || type == "newspaperArticle") {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // embedded metadata
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		if (url.includes('/Tests/')) {
			item.itemType = "magazineArticle";
		}
		if (url.includes('/News/')) {
			item.itemType = "newspaperArticle";
		}
		item.publicationTitle = "Gameswelt";
		item.creators = []; // reset bad author metadata
		var authorMetadata = doc.querySelectorAll('div.article-header-meta a.author-link');
		for (let author of authorMetadata) {
			item.creators.push(ZU.cleanAuthor(author.textContent, "author"));
		}
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.doWeb(doc, url);
	});
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.gameswelt.de/cyberpunk-2077/news/ueberraschung-update-2-1-wird-deutlich-fetter-als-gedacht-323557",
		"detectedItemType": "newspaperArticle",
		"items": [
			{
				"itemType": "webpage",
				"title": "Cyberpunk 2077: Überraschung - Update 2.1 wird deutlich fetter als gedacht",
				"creators": [
					{
						"firstName": "Andreas",
						"lastName": "Philipp",
						"creatorType": "author"
					}
				],
				"date": "2023-12-01T16:42:00+01:00",
				"abstractNote": "In dieser Woche verkündete CD Projekt RED, dass Cyberpunk 2077 parallel zur Ultimate Edition noch ein Update mit neuen Gameplay-Elementen erhalten würde und nun wissen wir auch, was uns erwartet.",
				"language": "de-de",
				"shortTitle": "Cyberpunk 2077",
				"url": "https://www.gameswelt.de/cyberpunk-2077/news/ueberraschung-update-2-1-wird-deutlich-fetter-als-gedacht-323557",
				"websiteTitle": "Gameswelt",
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
		"url": "https://www.gameswelt.de/zoo-tycoon/test/zoo-tycoon-3324",
		"detectedItemType": "magazineArticle",
		"items": [
			{
				"itemType": "webpage",
				"title": "Zoo Tycoon: Zoo Tycoon",
				"creators": [
					{
						"firstName": "Andreas",
						"lastName": "Philipp",
						"creatorType": "author"
					}
				],
				"date": "2001-12-04T08:43:00+01:00",
				"abstractNote": "Aufbau- und Wirtschafts-Simulationen à la 'Theme Park' sind in der aktuellen Spielelandschaft nicht gerade reichlich vertreten. Das hindert Microsoft und Entwickler Blue Fang Games aber nicht daran, sondern beflügelt sie eher, einen neuen Vertreter dieses Genres auf den Markt zu bringen. In 'Zoo Tycoon' habt ihr nun die Gelegenheit, einen kompletten Tierpark auf die Beine zu stellen und dafür zu sorgen, dass sowohl die Tiere, als auch die Besucher den Zustand der Glückseligkeit erreichen, und zwar bevor ihr mit leerer Kasse dasteht. Andreas Philipp spielte für euch den Zoodirektor höchstpersönlich.",
				"language": "de-de",
				"shortTitle": "Zoo Tycoon",
				"url": "https://www.gameswelt.de/zoo-tycoon/test/zoo-tycoon-3324",
				"websiteTitle": "Gameswelt",
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
