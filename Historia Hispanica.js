{
	"translatorID": "5725fe17-9ef7-4152-8481-280fa37bad40",
	"label": "Historia Hispánica",
	"creator": "Ignacio Rodríguez",
	"target": "^https?://historia\\-hispanica\\.rah\\.es",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-11-19 20:18:45"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 YOUR_NAME <- TODO

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
	if (/^https?:\/\/historia-hispanica\.rah\.es\/biografias\/\d+-/.test(url)) {
		return "encyclopediaArticle";
	}
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "encyclopediaArticle") {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var item = new Zotero.Item("encyclopediaArticle");

	var titleEl = doc.querySelector('header.bd-header h5');
	if (titleEl) {
		item.title = ZU.trimInternal(titleEl.textContent);
	}

	item.encyclopediaTitle = "Historia Hispánica";
	item.publisher = "Real Academia de la Historia";
	item.place = "Madrid";
	item.language = "es";
	item.url = url;

	var authorNodes = doc.querySelectorAll('#authorSubsection li.authors');
	for (var node of authorNodes) {
		var authorName = ZU.trimInternal(node.textContent);
		if (authorName) {
			item.creators.push(ZU.cleanAuthor(authorName, "author"));
		}
	}

	var tags = doc.querySelectorAll('header.bd-header .disciplines-list .discipline');
	for (var tag of tags) {
		var tagText = ZU.trimInternal(tag.textContent);
		if (tagText) {
			item.tags.push(tagText);
		}
	}

	item.attachments.push({
		title: "Snapshot",
		document: doc
	});

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://historia-hispanica.rah.es/biografias/5034-jose-maria-aventin-llanas",
		"defer": true,
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "José María Aventín Llanas",
				"creators": [
					{
						"firstName": "Ramón Lasaosa",
						"lastName": "Susín",
						"creatorType": "author"
					}
				],
				"encyclopediaTitle": "Historia Hispánica",
				"language": "es",
				"libraryCatalog": "Historia Hispánica",
				"place": "Madrid",
				"publisher": "Real Academia de la Historia",
				"url": "https://historia-hispanica.rah.es/biografias/5034-jose-maria-aventin-llanas",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Escultor, ra"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
