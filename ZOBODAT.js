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
	"lastUpdated": "2023-10-17 11:17:19"
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
		var title = ZU.trimInternal(text(rows[i], '.title'));
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
	var item = new Zotero.Item('journalArticle');
	item.url = url;

	var reference = doc.querySelector('#publikation_articles h1 + div');

	var referenceParts = ZU.trimInternal(reference.textContent).split(' – ');
	var authorshipParts = referenceParts[0].match(/^(.+) \((\d+)\): (.+)$/);
	var locatorParts = referenceParts[referenceParts.length - 1].match(/(.+): (.+ - .+)\.$/);

	// Authors
	var authors = authorshipParts[1].split(', ');
	for (var i = 0; i < authors.length; i++) {
		item.creators.push(ZU.cleanAuthor(authors[i], 'author'));
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
	item.publicationTitle = text(reference, 'a[href^="publikation_series"]') || referenceParts[1];

	// Locator
	var volume = text(reference, 'a[href^="publikation_volumes"]') || locatorParts[1];
	var volumeParts = volume.match(/^(\d+)_(\d+)$/);
	if (volumeParts) {
		item.volume = cleanNumber(volumeParts[1]);
		item.issue = cleanNumber(volumeParts[2]);
	}
	else {
		item.volume = cleanNumber(volume);
	}

	item.pages = locatorParts[2].split(' - ').map(cleanNumber).join('-');

	item.complete();
}

function cleanNumber(number) {
	return number.replace(/^0+([1-9]\d*)/g, '$1');
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
						"firstName": "John",
						"lastName": "Cairns",
						"creatorType": "author"
					},
					{
						"firstName": "James R.",
						"lastName": "Pratt",
						"creatorType": "author"
					},
					{
						"firstName": "B. R.",
						"lastName": "Niederlehner",
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
	},
	{
		"type": "web",
		"url": "https://www.zobodat.at/publikation_articles.php?id=256029",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A faunistic study of Braconidae (Hymenoptera: Ichneumonoidea)\nfrom southern Iran",
				"creators": [
					{
						"lastName": "Samin",
						"firstName": "Najmeh",
						"creatorType": "author"
					},
					{
						"lastName": "Achterberg",
						"firstName": "Cees van (auch Cornelis)",
						"creatorType": "author"
					},
					{
						"lastName": "Ghahari",
						"firstName": "Hassan",
						"creatorType": "author"
					}
				],
				"date": "2015",
				"issue": "2",
				"libraryCatalog": "ZOBODAT",
				"pages": "1801-1809",
				"publicationTitle": "Linzer biologische Beiträge",
				"shortTitle": "A faunistic study of Braconidae (Hymenoptera",
				"url": "https://www.zobodat.at/publikation_articles.php?id=256029",
				"volume": "47",
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
		"url": "https://www.zobodat.at/publikation_articles.php?id=10027526",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The valid name for the genus *Loxocephalus* #Foerster#, 1862 (Insecta, Hymenoptera: Braconidae), preoccupied by *Loxocephalus* #Eberhard#, 1862 (Protozoa: Ciliophora)",
				"creators": [
					{
						"firstName": "Wilhelm",
						"lastName": "Foissner",
						"creatorType": "author"
					},
					{
						"firstName": "Cees van (auch Cornelis)",
						"lastName": "Achterberg",
						"creatorType": "author"
					}
				],
				"date": "1997",
				"libraryCatalog": "ZOBODAT",
				"pages": "31-32",
				"publicationTitle": "Zooel.Meded.Leiden",
				"shortTitle": "The valid name for the genus *Loxocephalus* #Foerster#, 1862 (Insecta, Hymenoptera",
				"url": "https://www.zobodat.at/publikation_articles.php?id=10027526",
				"volume": "71",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.zobodat.at/publikation_articles.php?id=521285",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Kleintierhabitate",
				"creators": [
					{
						"firstName": "Daniela",
						"lastName": "Hofinger",
						"creatorType": "author"
					},
					{
						"firstName": "Harald",
						"lastName": "Kutzenberger",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"issue": "1",
				"libraryCatalog": "ZOBODAT",
				"pages": "11-14",
				"publicationTitle": "ÖKO.L Zeitschrift für Ökologie, Natur- und Umweltschutz",
				"url": "https://www.zobodat.at/publikation_articles.php?id=521285",
				"volume": "2023",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
