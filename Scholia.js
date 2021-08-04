{
	"translatorID": "877acbe4-5d71-4de6-8dd7-367a2dcc4c0d",
	"label": "Scholia",
	"creator": "Abe Jellinek",
	"target": "^https?://scholia\\.toolforge\\.org/work/Q",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-29 16:59:07"
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


let _cachedWikidataTranslator;
let _cachedWikidataDoc;
let _cachedWikidataURL;

function detectWeb(doc, _url) {
	let wikidataURL = attr(doc, 'h1 a[href^="https://www.wikidata.org/wiki/Q"]', 'href');
	if (wikidataURL) {
		loadWikidataTranslator((wikidata) => {
			loadWikidataPage(wikidataURL, (doc, url) => {
				Zotero.done(wikidata.detectWeb(doc, url));
			});
		});
	}
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, _url) {
	let wikidataURL = attr(doc, 'h1 a[href^="https://www.wikidata.org/wiki/Q"]', 'href');
	loadWikidataTranslator((wikidata) => {
		loadWikidataPage(wikidataURL, (doc, url) => {
			wikidata.doWeb(doc, url);
		});
	});
}

function loadWikidataTranslator(callback) {
	if (_cachedWikidataTranslator) {
		callback(_cachedWikidataTranslator);
	}
	else {
		let translator = Zotero.loadTranslator('web');
		// Wikidata
		translator.setTranslator('eaef8d43-2f17-45b3-a5cb-affb49bc5e81');

		translator.getTranslatorObject(function (wikidataTranslator) {
			_cachedWikidataTranslator = wikidataTranslator;
			callback(wikidataTranslator);
		});
	}
}

function loadWikidataPage(url, callback) {
	if (_cachedWikidataDoc && _cachedWikidataURL) {
		callback(_cachedWikidataDoc, _cachedWikidataURL);
	}
	else {
		ZU.processDocuments(url, function (doc, url) {
			_cachedWikidataDoc = doc;
			_cachedWikidataURL = url;
			callback(doc, url);
		});
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://scholia.toolforge.org/work/Q21090025",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Alzheimer's disease-associated amyloid beta-protein is an antimicrobial peptide",
				"creators": [
					{
						"firstName": "Stephanie J.",
						"lastName": "Soscia",
						"creatorType": "author"
					},
					{
						"firstName": "James E.",
						"lastName": "Kirby",
						"creatorType": "author"
					},
					{
						"firstName": "Kevin J.",
						"lastName": "Washicosky",
						"creatorType": "author"
					},
					{
						"firstName": "Stephanie M.",
						"lastName": "Tucker",
						"creatorType": "author"
					},
					{
						"firstName": "Martin",
						"lastName": "Ingelsson",
						"creatorType": "author"
					},
					{
						"firstName": "Bradley",
						"lastName": "Hyman",
						"creatorType": "author"
					},
					{
						"firstName": "Mark A.",
						"lastName": "Burton",
						"creatorType": "author"
					},
					{
						"firstName": "Lee E.",
						"lastName": "Goldstein",
						"creatorType": "author"
					},
					{
						"firstName": "Scott",
						"lastName": "Duong",
						"creatorType": "author"
					},
					{
						"firstName": "Rudolph E.",
						"lastName": "Tanzi",
						"creatorType": "author"
					},
					{
						"firstName": "Robert D.",
						"lastName": "Moir",
						"creatorType": "author"
					}
				],
				"date": "2010-01-01T00:00:00Z",
				"DOI": "10.1371/JOURNAL.PONE.0009505",
				"extra": "QID: Q21090025\nPMID: 20209079\nPMCID: PMC2831066",
				"issue": "3",
				"language": "English",
				"libraryCatalog": "Scholia",
				"pages": "e9505",
				"publicationTitle": "PLOS ONE",
				"volume": "5",
				"attachments": [],
				"tags": [
					{
						"tag": "Alzheimer's disease"
					},
					{
						"tag": "Beta amyloid"
					},
					{
						"tag": "antimicrobial peptide"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
