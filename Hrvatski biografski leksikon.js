{
	"translatorID": "89a4307f-0ea9-4d78-8547-44d2c64326d7",
	"label": "Hrvatski biografski leksikon",
	"creator": "Ivo Pletikosić",
	"target": "^https?://hbl\\\\.lzmk\\\\.hr/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-11-06 14:15:43"
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
	if ( doc.querySelector("div.clanak") ) {
		return "encyclopediaArticle";
	}
	return false;
}

function doWeb(doc, url) {
	let item = new Zotero.Item("encyclopediaArticle");
	item.attachments.push( {title: "Snapshot", document: doc} );
	
	item.encyclopediaTitle = "Hrvatski biografski leksikon";
	item.publisher = "Leksikografski zavod Miroslav Krleža";
	item.language = "hr";
	item.ISBN = "9789532680461";
	item.url = url.replace(/[?#].*/, "");
	
	item.title = doc.title.replace(" - Hrvatski biografski leksikon", "");
	item.date = ZU.strToISO( attr(doc, "time.published", "datetime") );

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://hbl.lzmk.hr/clanak/parun-vesna",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "PARUN, Vesna",
				"creators": [],
				"ISBN": "9789532680461",
				"encyclopediaTitle": "Hrvatski biografski leksikon",
				"language": "hr",
				"libraryCatalog": "Hrvatski biografski leksikon",
				"publisher": "Leksikografski zavod Miroslav Krleža",
				"url": "https://hbl.lzmk.hr/clanak/parun-vesna",
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
