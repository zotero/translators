{
	"translatorID": "485cd5f3-9c36-473e-80a7-b36a9c367515",
	"label": "LIVIVO",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.livivo\\.de/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-31 17:55:33"
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
	let results = getSearchResults(doc, false);
	if (!results) return false;
	
	if (Object.keys(results).length == 1) {
		return guessType(doc);
	}
	else {
		return "multiple";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.hits article');
	for (let row of rows) {
		let id = row.id;
		let title = ZU.trimInternal(row.textContent);
		if (!id || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[id] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) return;
			for (let recordID of Object.keys(items)) {
				scrapeRecord(doc, url, recordID);
			}
		});
	}
	else {
		scrapeRecord(doc, url, 'record1');
	}
}

function scrapeRecord(doc, url, recordID) {
	let article = doc.getElementById(recordID);
	
	let DOI = ZU.cleanDOI(article.getAttribute('data-doi') || '');
	let ISBN = ZU.cleanISBN(article.getAttribute('data-isbn') || '');
	
	if (!DOI && !ISBN) {
		scrapeRecordManually(doc, url, article);
		return;
	}
	
	let search = Zotero.loadTranslator('search');
	search.setSearch({ DOI, ISBN });
	
	search.setHandler('itemDone', function (_, item) {
		item.date = text(article, '.field_PUBLDATE') || item.date; // often better
		item.complete();
	});
	
	search.setHandler('translators', function (_, translators) {
		search.setTranslator(translators);
		search.translate();
	});
	
	search.getTranslators();
}

function scrapeRecordManually(doc, url, article) {
	let item = new Zotero.Item(guessType(article));

	item.title = attr(article, 'h3 > a', 'title');
	let subtitle = text(article, '.untertitel');
	if (subtitle) {
		item.title += ': ' + subtitle;
	}
	
	item.abstractNote = text(article, '.field_ABSTRACT');
	item.tags = text(article, '.field_KEYWORDS').split(' ; ').map(tag => ({ tag }));
	item.language = text(article, '.field_LANGUAGE');
	item.date = text(article, '.field_PUBLDATE');
	item.publisher = text(article, '.field_PUBLISHER');
	item.url = attr(article, '.links.fulltext a', 'href')
		.replace(/^.+[?&]link=([^&#]+).*$/, (_, link) => decodeURIComponent(link));
	
	for (let author of article.querySelectorAll('.authors a')) {
		let creatorType = 'author';
		
		author = author.textContent;
		if (author.includes('[Akademischer Betreuer]')) {
			creatorType = 'contributor';
		}
		author = author.replace(/\[.+\]/, '');
		
		item.creators.push(ZU.cleanAuthor(author, creatorType, true));
	}
	
	item.complete();
}

function guessType(article) {
	let type = text(article, '.field_DOCTYPE');
	if (type.includes('Thesis')) {
		return 'thesis';
	}
	else if (type.includes('Book')) {
		return 'book';
	}
	else {
		return 'journalArticle';
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.livivo.de/doc/M33889017/diversity-of-microbial-signatures-in-asthmatic-airways/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Diversity of Microbial Signatures in Asthmatic Airways",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Aisha",
						"lastName": "Alamri"
					}
				],
				"date": "2021-04-16",
				"DOI": "10.2147/IJGM.S304339",
				"ISSN": "1178-7074",
				"journalAbbreviation": "IJGM",
				"language": "en",
				"libraryCatalog": "DOI.org (Crossref)",
				"pages": "1367-1378",
				"publicationTitle": "International Journal of General Medicine",
				"url": "https://www.dovepress.com/diversity-of-microbial-signatures-in-asthmatic-airways-peer-reviewed-article-IJGM",
				"volume": "Volume 14",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.livivo.de/doc/481059/cardiology/",
		"items": [
			{
				"itemType": "book",
				"title": "Cardiology",
				"creators": [
					{
						"firstName": "Michael H.",
						"lastName": "Crawford",
						"creatorType": "editor"
					},
					{
						"firstName": "John P.",
						"lastName": "DiMarco",
						"creatorType": "editor"
					}
				],
				"date": "2001",
				"ISBN": "9780723431381",
				"language": "eng",
				"libraryCatalog": "K10plus ISBN",
				"place": "London",
				"publisher": "Mosby",
				"attachments": [
					{
						"title": "Table of Contents PDF",
						"mimeType": "application/pdf"
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
		"url": "https://www.livivo.de/app?FS=%22Dementia%22",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.livivo.de/doc/DNB1182681476/dealing-with-wandering-in-dementia-care/",
		"items": [
			{
				"itemType": "thesis",
				"title": ": a developmental story of designing a GPS monitoring system and its challenges in a wider context",
				"creators": [
					{
						"firstName": "Lin",
						"lastName": "Wan",
						"creatorType": "author"
					}
				],
				"language": "English",
				"libraryCatalog": "LIVIVO",
				"university": "Universitätsbibliothek der Universität Siegen",
				"url": "http://nbn-resolving.de/urn:nbn:de:hbz:467-14408",
				"attachments": [],
				"tags": [
					{
						"tag": "Medicine, Health"
					},
					{
						"tag": "Medizin, Gesundheit"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
