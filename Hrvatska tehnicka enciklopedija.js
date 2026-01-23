{
	"translatorID": "ed584e60-9373-43c2-b353-5826a12f076b",
	"label": "Hrvatska tehnička enciklopedija",
	"creator": "Ivo Pletikosić",
	"target": "^https?://tehnika\\.lzmk\\.hr/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-11-06 15:01:36"
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

function detectWeb(doc, _) {
	if (doc.querySelector("div.content")) {
		return "encyclopediaArticle";
	}
	return false;
}

function doWeb(doc, url) {
	let item = new Zotero.Item("encyclopediaArticle");
	item.attachments.push({ title: "Snapshot", document: doc });
	
	item.encyclopediaTitle = "Hrvatska tehnička enciklopedija";
	item.publisher = "Leksikografski zavod Miroslav Krleža";
	item.language = "hr";
	item.ISBN = "9789532680430";
	item.url = url.replace(/[?#].*/, "");
	
	item.title = doc.title.replace(" | Hrvatska tehnička enciklopedija", "");
	item.date = ZU.strToISO(attr(doc, "time.published", "datetime"));

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://tehnika.lzmk.hr/brana/",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "nasipi i brane",
				"creators": [],
				"date": "2025-04-16",
				"ISBN": "9789532680430",
				"encyclopediaTitle": "Hrvatska tehnička enciklopedija",
				"language": "hr",
				"libraryCatalog": "Hrvatska tehnička enciklopedija",
				"publisher": "Leksikografski zavod Miroslav Krleža",
				"url": "https://tehnika.lzmk.hr/brana/",
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
