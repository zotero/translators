{
	"translatorID": "1ab8b9a4-72b5-4ef4-adc8-4956a50718f7",
	"label": "Der Freitag",
	"creator": "Sebastian Karcher",
	"target": "^https?://www\\.freitag\\.de",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-04-15 16:29:59"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Der Freitag Translator
	Copyright © 2012 Sebatian Karcher

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

let articleDataTagSelector = 'script.qa-structured-data[type="application/ld+json"]';

function detectWeb(doc) {
	if (doc.querySelector(articleDataTagSelector)) {
		let type = JSON.parse(text(doc, articleDataTagSelector))['@type'];
		if (type == 'NewsArticle'
			|| (Array.isArray(type) && type.includes('NewsArticle'))
		) {
			return "newspaperArticle";
		}
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
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

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll('.o-search-results__container .c-article-card a.js-article-card-url');
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

function scrape(doc, url) {
	let json = JSON.parse(text(doc, 'script.qa-structured-data[type="application/ld+json"]'));
	
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');

	translator.setHandler('itemDone', function (obj, item) {
		item.ISSN = '0945-2095';
		item.libraryCatalog = 'Der Freitag';
		item.publicationTitle = 'Der Freitag';
		
		if (!Array.isArray(json.author)) {
			json.author = [json.author];
		}
		item.creators = [];
		item.creators.push(...cleanAuthorObjects(json.author));

		// First li is the home page, second the divider, third the section.
		item.section = text(doc, 'section ul li:nth-child(3) a span');
		
		/* Identify the latest date manually
		 * since dateModified can sometimes be behind datePublished.
		 */
		let date = json.dateModified;
		if (date === null || (json.datePublished && json.datePublished > date)) {
			date = json.datePublished;
		}
		item.date = date;
		
		item.tags = [];
		
		let tags = doc.querySelectorAll(".qa-tags-container .qa-tags-item");
		
		tags.forEach(function (node) {
			item.tags.push(node.textContent.trim());
		});

		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "newspaperArticle";
		trans.doWeb(doc, url);
	});
}

function cleanAuthorObjects(authors) {
	let creators = [];
	for (let author of authors) {
		if (author['@type'] != 'Person') continue;
		// if one item contains a list of authors, split value
		if (author.name.includes(',')) {
			for (let oneAuthor of author.name.split(',')) {
				creators.push(ZU.cleanAuthor(oneAuthor, 'author'));
			}
		}
		else {
			creators.push(ZU.cleanAuthor(author.name, 'author'));
		}
	}
	return creators;
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.freitag.de/@@search?SearchableText=Gaddafi",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.freitag.de/autoren/der-freitag/201evolksverdummung-ist-nicht-links201c",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Im Gespräch - „Volksverdummung ist nicht links“",
				"creators": [
					{
						"firstName": "Philip",
						"lastName": "Grassmann",
						"creatorType": "author"
					},
					{
						"firstName": "Verena",
						"lastName": "Schmitt-Roschmann",
						"creatorType": "author"
					}
				],
				"date": "2018-02-11T08:42:55.204871+01:00",
				"ISSN": "0945-2095",
				"abstractNote": "Sigmar Gabriel attackiert im Freitag-Interview den griechischen Linken Alexis Tsipras. Die Piratenpartei hält der SPD-Chef für ein Zeitgeist-Phänomen",
				"language": "de",
				"libraryCatalog": "Der Freitag",
				"publicationTitle": "Der Freitag",
				"section": "Politik",
				"url": "https://www.freitag.de/autoren/der-freitag/201evolksverdummung-ist-nicht-links201c",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"inland",
					"piraten",
					"sigmar gabriel",
					"spd"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.freitag.de/autoren/der-freitag/corona-klima-kriege-lauterbach-will-den-nostand-fuer-immer",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Lauterbachs Fantasien vom permanenten Ausnahmezustand",
				"creators": [
					{
						"firstName": "Velten",
						"lastName": "Schäfer",
						"creatorType": "author"
					}
				],
				"date": "2022-04-09T04:00:00+02:00",
				"ISSN": "0945-2095",
				"abstractNote": "Wir werden ab jetzt für immer mit Freiheitsbeschneidungen à la Corona leben, sagt Karl Lauterbach. Auch die Linke hat Sehnsucht nach einer starken Hand. Ein dringlicher Weckruf",
				"language": "de",
				"libraryCatalog": "Der Freitag",
				"publicationTitle": "Der Freitag",
				"section": "Debatte",
				"url": "https://www.freitag.de/autoren/der-freitag/corona-klima-kriege-lauterbach-will-den-nostand-fuer-immer",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"klimawandel",
					"lauterbach",
					"ausnahmezustand",
					"corona",
					"freiheitsrechte"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
