{
	"translatorID": "16f2936d-a059-40e8-a48e-f0acbb1e93e0",
	"label": "AMS MathSciNet",
	"creator": "Sebastian Karcher",
	"target": "^https?://mathscinet\\.ams\\.[^/]*/mathscinet/(article\\?|publications-search\\?|author\\?)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-07-14 11:04:37"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Sebastian Karcher

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
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (url.includes("article?mr=")) {
		if (doc.querySelector('div[data-testid="ap-book-isbn"]')) {
			if (doc.querySelector('div[data-testid="ap-book-collection"] a.router-link-active')) return "bookSection";
			else return "book";
		}
		else return "journalArticle";
	}
	else return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.results div.font-weight-bold');
	for (let row of rows) {
		let href = attr(row, 'a', 'href');
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	let id = url.match(/\?mr=(\d+)/);
	if (!id) {
		throw new Error("No MR ID, can't proceed");
	}
	let bibJSONUrl = '/mathscinet/api/publications/format?formats=bib&ids=' + id[1];
	// Z.debug(bibJSONUrl)
	let bibJSON = await requestText(bibJSONUrl);
	// Z.debug(bibJSON)
	bibJSON = JSON.parse(bibJSON);
	let bibTex = bibJSON[0].bib;
	// Z.debug(bibTex)
	let translator = Zotero.loadTranslator("import");
	translator.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4');
	translator.setString(bibTex);
	translator.setHandler('itemDone', (_obj, item) => {
		item.url = ""; // these aren't full text URLs
		item.attachments.push({
			title: 'Snapshot',
			document: doc
		});
		item.complete();
	});
	await translator.translate();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://mathscinet.ams.org/mathscinet/article?mr=3004573",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Extrapolation of stable random fields",
				"creators": [
					{
						"firstName": "Wolfgang",
						"lastName": "Karcher",
						"creatorType": "author"
					},
					{
						"firstName": "Elena",
						"lastName": "Shmileva",
						"creatorType": "author"
					},
					{
						"firstName": "Evgeny",
						"lastName": "Spodarev",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"DOI": "10.1016/j.jmva.2012.11.004",
				"ISSN": "0047-259X,1095-7243",
				"extra": "MR: 3004573",
				"itemID": "MR3004573",
				"journalAbbreviation": "J. Multivariate Anal.",
				"libraryCatalog": "AMS MathSciNet",
				"pages": "516–536",
				"publicationTitle": "Journal of Multivariate Analysis",
				"volume": "115",
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
		"url": "https://mathscinet.ams.org/mathscinet/article?mr=2767535",
		"items": [
			{
				"itemType": "bookSection",
				"title": "On implementation of the Markov chain Monte Carlo stochastic approximation algorithm",
				"creators": [
					{
						"firstName": "Yihua",
						"lastName": "Jiang",
						"creatorType": "author"
					},
					{
						"firstName": "Peter",
						"lastName": "Karcher",
						"creatorType": "author"
					},
					{
						"firstName": "Yuedong",
						"lastName": "Wang",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"ISBN": "9783790826272",
				"bookTitle": "Advances in directional and linear statistics",
				"extra": "MR: 2767535\nDOI: 10.1007/978-3-7908-2628-9_7",
				"itemID": "MR2767535",
				"libraryCatalog": "AMS MathSciNet",
				"pages": "97–111",
				"publisher": "Physica-Verlag/Springer, Heidelberg",
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
		"url": "https://mathscinet.ams.org/mathscinet/article?mr=2663710",
		"items": [
			{
				"itemType": "book",
				"title": "Advances in directional and linear statistics",
				"creators": [
					{
						"firstName": "Martin T.",
						"lastName": "Wells",
						"creatorType": "editor"
					},
					{
						"firstName": "Ashis",
						"lastName": "SenGupta",
						"creatorType": "editor"
					}
				],
				"date": "2011",
				"ISBN": "9783790826272",
				"extra": "MR: 2663710\nDOI: 10.1007/978-3-7908-2628-9",
				"itemID": "MR2663710",
				"libraryCatalog": "AMS MathSciNet",
				"numPages": "xiv+321",
				"publisher": "Physica-Verlag/Springer, Heidelberg",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<p>A Festschrift for Sreenivasa Rao Jammalamadaka</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://mathscinet.ams.org/mathscinet/article?mr=1346201",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Sommation des séries divergentes",
				"creators": [
					{
						"firstName": "Bernard",
						"lastName": "Malgrange",
						"creatorType": "author"
					}
				],
				"date": "1995",
				"ISSN": "0723-0869",
				"extra": "MR: 1346201",
				"issue": "2-3",
				"itemID": "MR1346201",
				"journalAbbreviation": "Exposition. Math.",
				"libraryCatalog": "AMS MathSciNet",
				"pages": "163–222",
				"publicationTitle": "Expositiones Mathematicae. International Journal",
				"volume": "13",
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
		"url": "https://mathscinet.ams.org/mathscinet/publications-search?query=karcher&page=1&size=20&sort=newest&facets=",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://mathscinet.ams.org/mathscinet/author?authorId=98350",
		"items": "multiple"
	}
]
/** END TEST CASES **/
