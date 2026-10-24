{
	"translatorID": "3a63f21e-7e20-4225-9d74-858b0512f16d",
	"label": "Bibliotheek.be",
	"creator": "Nyo Dekens",
	"target": "^https?:\\/\\/([^\\/]+\\.)?bibliotheek\\.be\\/(?:[a-z]{2}\\/)?(?:krantenarchief|newspaper-archive)\\/(?:artikel|article)\\/[a-f0-9-]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-24 11:25:00"
}

/* ***** BEGIN LICENSE BLOCK *****
 *
 * Copyright © 2026 Nyo Dekens
 *
 * This file is part of Zotero.
 *
 * Zotero is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Zotero is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Zotero. If not, see <http://www.gnu.org/licenses/>.
 *
 * ***** END LICENSE BLOCK ***** */

function detectWeb(doc, _url) {
	if (doc.querySelector('.newspaper-article--title, .block-newspaper-article-detail')) {
		return "newspaperArticle";
	}
	return false;
}

function doWeb(doc, url) {
	var item = new Zotero.Item("newspaperArticle");
	item.url = url;

	// Title
	var titleElem = doc.querySelector('.newspaper-article--title');
	if (titleElem) {
		item.title = ZU.trimInternal(titleElem.textContent);
	}
	else if (doc.title) {
		item.title = ZU.trimInternal(doc.title);
	}

	// Publication / Newspaper
	var publisherElem = doc.querySelector('.newspaper-article--publisher');
	if (publisherElem) {
		item.publicationTitle = ZU.trimInternal(publisherElem.textContent);
	}

	// Publication Date
	var dateElem = doc.querySelector('.newspaper-article--publication-date');
	if (dateElem) {
		var datetime = dateElem.getAttribute('datetime');
		if (datetime) {
			item.date = datetime.split('T')[0];
		}
		else {
			item.date = ZU.trimInternal(dateElem.textContent);
		}
	}

	// Author(s)
	var authorLinks = doc.querySelectorAll('.newspaper-article--author a');
	if (authorLinks && authorLinks.length > 0) {
		for (var i = 0; i < authorLinks.length; i++) {
			var name = ZU.trimInternal(authorLinks[i].textContent);
			if (name) {
				item.creators.push(ZU.cleanAuthor(name, "author"));
			}
		}
	}
	else {
		var authorElem = doc.querySelector('.newspaper-article--author');
		if (authorElem) {
			var rawAuthor = authorElem.textContent.replace(/^[\s\-–—]+/, '').trim();
			if (rawAuthor) {
				item.creators.push(ZU.cleanAuthor(rawAuthor, "author"));
			}
		}
	}

	// Page number
	var pageElem = doc.querySelector('.newspaper-article--page-number');
	if (pageElem) {
		var pageText = ZU.trimInternal(pageElem.textContent)
			.replace(/^[\s\-–—]+/, '')
			.replace(/^pagina\s*/i, '')
			.trim();
		if (pageText) {
			item.pages = pageText;
		}
	}

	// Language
	if (doc.documentElement && doc.documentElement.lang) {
		item.language = doc.documentElement.lang;
	}

	item.libraryCatalog = "Bibliotheek.be";

	// Attachments (Snapshot)
	item.attachments.push({
		document: doc,
		title: "Snapshot"
	});

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://bibliotheek.be/krantenarchief/artikel/bb668841-b499-4775-8da4-8ea8deb44b11",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Speelteater broedt op eieren in de klas 'Vaders en eieren' is een onderhoudend toneelstukje over pinguïns",
				"creators": [
					{
						"firstName": "Steven",
						"lastName": "Heene",
						"creatorType": "author"
					}
				],
				"date": "1999-06-09",
				"language": "nl",
				"libraryCatalog": "Bibliotheek.be",
				"pages": "18",
				"publicationTitle": "De Morgen",
				"url": "https://bibliotheek.be/krantenarchief/artikel/bb668841-b499-4775-8da4-8ea8deb44b11"
			}
		]
	}
]
/** END TEST CASES **/
