{
	"translatorID": "6f98e6ce-f92f-4f74-beaf-499dccb5cb6c",
	"label": "Hrvatska enciklopedija",
	"creator": "Ivo Pletikosić",
	"target": "^https?://(?:www\\.)?enciklopedija\\.hr/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-14 21:59:26"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Ivo Pletikosić

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
	// New Single Entry detection: /clanak/some-thing
	if (url.includes('/clanak/')) {
		return "encyclopediaArticle";
	}
	return false;
}

function doWeb(doc, url) {
	let item = new Zotero.Item("encyclopediaArticle");
	item.attachments.push({ title: 'Snapshot', document: doc });
	
	item.encyclopediaTitle = "Hrvatska enciklopedija";
	item.publisher = "Leksikografski zavod Miroslav Krleža";
	item.language = "hr";
	item.ISBN = "9789532680386";
	item.url = url.replace(/[?#].*/, "");
	
	// Use the document title and strip the suffix
	let docTitle = doc.title;
	item.title = docTitle.replace(/ - Hrvatska enciklopedija/, '');

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.enciklopedija.hr/clanak/manastir",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "manastir",
				"creators": [],
				"ISBN": "9789532680386",
				"encyclopediaTitle": "Hrvatska enciklopedija",
				"language": "hr",
				"libraryCatalog": "Hrvatska enciklopedija",
				"publisher": "Leksikografski zavod Miroslav Krleža",
				"url": "https://www.enciklopedija.hr/clanak/manastir",
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
		"url": "https://www.enciklopedija.hr/clanak/44404",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "nulovanje",
				"creators": [],
				"ISBN": "9789532680386",
				"encyclopediaTitle": "Hrvatska enciklopedija",
				"language": "hr",
				"libraryCatalog": "Hrvatska enciklopedija",
				"publisher": "Leksikografski zavod Miroslav Krleža",
				"url": "https://www.enciklopedija.hr/clanak/nulovanje",
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
