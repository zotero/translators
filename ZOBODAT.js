{
	"translatorID": "e94ffd1c-0ff8-4fbc-8b2a-8391ab5a7288",
	"label": "ZOBODAT",
	"creator": "Lars Willighagen",
	"target": "^https?://(www\\.)?zobodat\\.at/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-10-09 16:28:03"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Lars Willighagen

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
	if (url.includes('/publikation_articles.php')) {
		return 'journalArticle';
	}
	else if ((url.includes('/publikation_series.php') || url.includes('/publikation_volumes.php')) && getSearchResults(doc)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.result');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].querySelector(['a[href^="publikation_articles.php"]']);
		var title = ZU.trimInternal(rows[i].querySelector('.title').textContent);
		if (!href || !title) {
			continue;
		}
		else {
			found = true;
			items[href.href] = title;
		}
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) === 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc));
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
	var item = new Zotero.Item("journalArticle");
	item.url = url;

	var reference = doc.querySelector('#publikation_articles h1 + div');

	var referenceParts = reference.textContent.split(' – ');
	var authorshipParts = referenceParts[0].match(/^(.+) \((\d+)\): (.+)$/);
	var locatorParts = referenceParts[referenceParts.length - 1].match(/(.+): (.+ - .+)\.$/);

	// Authors
	var authors = authorshipParts[1].split(', ');
	for (var i = 0; i < authors.length; i++) {
		var author = authors[i].split(' ');
		item.creators.push({
			lastName: author[author.length - 1],
			firstName: author.slice(0, -1).join(' '),
			creatorType: "author"
		});
	}

	// Publication date
	item.date = authorshipParts[2];

	// Title (+ PDF)
	var pdfLink = reference.querySelector('a[href^="pdf"]');
	if (pdfLink) {
		item.title = pdfLink.textContent;
		item.attachments.push({ title: 'Full Text PDF', mimeType: 'application/pdf', url: pdfLink.href });
	}
	else {
		item.title = authorshipParts[3];
	}

	// Journal
	var journalLink = reference.querySelector('a[href^="publikation_series"]');
	if (journalLink) {
		item.publicationTitle = journalLink.textContent;
	}
	else {
		item.publicationTitle = referenceParts[1];
	}

	// Locator
	var volumeLink = reference.querySelector('a[href^="publikation_volumes"]');
	if (volumeLink) {
		item.volume = volumeLink.textContent;
	}
	else {
		item.volume = locatorParts[1];
	}

	item.pages = locatorParts[2].split(' - ').join('-');

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.zobodat.at/publikation_articles.php?id=275236",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Käferlarven und Käferpuppen aus Maulwurfsnestern",
				"creators": [
					{
						"lastName": "Beier",
						"firstName": "Max Walter Peter",
						"creatorType": "author"
					},
					{
						"lastName": "Strouhal",
						"firstName": "Hans",
						"creatorType": "author"
					}
				],
				"date": "1928",
				"libraryCatalog": "ZOBODAT",
				"pages": "1-34",
				"publicationTitle": "Zeitschrift für wissenschaftliche Insektenbiologie",
				"url": "https://www.zobodat.at/publikation_articles.php?id=275236",
				"volume": "23",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"url": "https://www.zobodat.at/publikation_articles.php?id=10021894",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A provisional multispecies toxicity test using indigenous organisms",
				"creators": [
					{
						"lastName": "Cairns",
						"firstName": "John",
						"creatorType": "author"
					},
					{
						"lastName": "Pratt",
						"firstName": "James R.",
						"creatorType": "author"
					},
					{
						"lastName": "Niederlehner",
						"firstName": "B.R.",
						"creatorType": "author"
					}
				],
				"date": "1985",
				"libraryCatalog": "ZOBODAT",
				"pages": "316-319",
				"publicationTitle": "J. Test. Eval.",
				"url": "https://www.zobodat.at/publikation_articles.php?id=10021894",
				"volume": "13",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.zobodat.at/publikation_volumes.php?id=48239",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.zobodat.at/publikation_series.php?id=20840",
		"detectedItemType": false,
		"items": []
	},
	{
		"type": "web",
		"url": "https://www.zobodat.at/publikation_series.php?q=&as_l%5B0%5D%5Bi%5D=surname&as_l%5B0%5D%5Bqt%5D=contains&as_l%5B0%5D%5Bv%5D=Achterberg&as_l%5B1%5D%5Bi%5D=",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.zobodat.at/personen.php?id=5312",
		"detectedItemType": false,
		"items": []
	}
]
/** END TEST CASES **/
