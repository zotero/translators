{
	"translatorID": "eda36b1d-2395-432d-9780-0e7d2e6cf0de",
	"label": "SLUB Dresden",
	"creator": "Abe Jellinek",
	"target": "^https://katalog\\.slub-dresden\\.de/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-06-29 00:22:54"
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
	if (url.includes('/id/')) {
		return guessType(doc);
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function guessType(doc) {
	for (let name of doc.querySelectorAll('.fieldname')) {
		if (!name.textContent.includes('Medientyp')
			&& !name.textContent.includes('Media type')) {
			continue;
		}
		
		let value = ZU.trimInternal(name.nextSibling.textContent).toLowerCase();
		if (value.includes('article') || value.includes('artikel')) {
			return 'journalArticle';
		}
		else if (value.includes('book component part') || value.includes('buchkapitel')) {
			return 'bookSection';
		}
		
		break;
	}
	
	return 'book';
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.result-title a[href*="/id/"]');
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

function scrape(doc, _url) {
	let risEmbedURL = attr(doc, '.sharingItem.ris', 'href');
	let accessURL = attr(doc, '#links-box a', 'href');
	let publishedIn = ZU.trimInternal(text(doc, '.series .internal'));

	ZU.processDocuments(risEmbedURL, function (risDoc) {
		// this is how the site's download button does it
		let risText = [...risDoc.querySelectorAll('.citation_field')]
			.map(elem => elem.textContent.trim().replace(/[\n\r\t]/g, ''))
			.join('\r\n');
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(risText);
		translator.setHandler("itemDone", function (obj, item) {
			if (item.place) {
				item.place = item.place
					.replace('[u.a.]', '')
					.replace(/\[(.*)\]/, '$1');
			}
			
			if (item.itemType == 'journalArticle' && !item.publicationTitle) {
				if (publishedIn.split(';').length == 1) {
					item.publicationTitle = publishedIn;
				}
				else {
					let parts = publishedIn.split(';');
					item.publicationTitle = parts[0];
					item.volume = (parts[1].match(/\s*([\d/-]+)/) || [])[1];
					item.issue = (parts[1].match(/,\s*(\d+)\s*,/) || [])[1];
					item.pages = (parts[1].match(/Seite ([\d\s-]+)/) || [])[1];
				}
			}
			else if (item.itemType == 'bookSection' && !item.bookTitle) {
				item.bookTitle = publishedIn;
			}
			
			if (!item.url || item.url.includes('//slubdd.de/katalog')) {
				item.url = accessURL;
			}
			
			if (item.date) {
				item.date = ZU.strToISO(item.date);
			}
			
			item.complete();
		});
		translator.translate();
	});
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://katalog.slub-dresden.de/en/id/0-279433018",
		"items": [
			{
				"itemType": "book",
				"title": "The renaissance of Jewish culture in Weimar Germany",
				"creators": [
					{
						"lastName": "Brenner",
						"firstName": "Michael",
						"creatorType": "author"
					}
				],
				"date": "1996",
				"ISBN": "9780300062625",
				"libraryCatalog": "SLUB Dresden",
				"place": "New Haven, Conn.",
				"publisher": "Yale Univ. Press",
				"attachments": [],
				"tags": [
					{
						"tag": "Deutschland"
					},
					{
						"tag": "Geschichte 1918-1933"
					},
					{
						"tag": "Intellektuelle"
					},
					{
						"tag": "Juden"
					},
					{
						"tag": "Judentum"
					},
					{
						"tag": "Jüdische Kultur"
					},
					{
						"tag": "Kultur"
					},
					{
						"tag": "Kulturelle Identität"
					},
					{
						"tag": "Weimarer Republik"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://katalog.slub-dresden.de/en/id/0-1356953859",
		"items": [
			{
				"itemType": "book",
				"title": "Medical manufacturing",
				"creators": [
					{
						"lastName": "Aronson",
						"firstName": "Robert B.",
						"creatorType": "author"
					},
					{
						"lastName": "Koelsch",
						"firstName": "James R.",
						"creatorType": "author"
					}
				],
				"date": "2007",
				"libraryCatalog": "SLUB Dresden",
				"place": "Milwaukee, Wis.",
				"publisher": "Society of Manufacturing Engineers",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://katalog.slub-dresden.de/en?tx_find_find%5Bq%5D%5Bdefault%5D=Malerei",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://katalog.slub-dresden.de/en/id/0-1623321026",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Sorbische Musik",
				"creators": [
					{
						"lastName": "Kobjela",
						"firstName": "Detlef",
						"creatorType": "author"
					}
				],
				"date": "1998",
				"libraryCatalog": "SLUB Dresden",
				"pages": "2-3",
				"publicationTitle": "Journal Neue Lausitzer Philharmonie",
				"volume": "1998/99",
				"attachments": [],
				"tags": [
					{
						"tag": "Musik"
					},
					{
						"tag": "Sorben"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://katalog.slub-dresden.de/en/id/0-1628277424",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Sorbische Malerei",
				"creators": [
					{
						"lastName": "Nedo",
						"firstName": "Pawoł",
						"creatorType": "author"
					}
				],
				"date": "1953",
				"ISSN": "0006-2391",
				"issue": "4",
				"libraryCatalog": "SLUB Dresden",
				"pages": "54-56",
				"publicationTitle": "Bildende Kunst",
				"volume": "1953",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
