{
	"translatorID": "ac277fbe-000c-46da-b145-fbe799d17eda",
	"label": "MIT Press Books",
	"creator": "Guy Aglionby",
	"target": "https://(www\\.)?mitpress\\.mit\\.edu/(mit-press-open|contributors|search|series|books)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-11-07 18:08:52"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Guy Aglionby
	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	if (url.includes('/books/') && !url.includes('/series/')) {
		return 'book';
	}
	else if ((url.includes('/mit-press-open') || url.includes('/contributors/')
		|| url.includes('/search?') || url.includes('/series/')) && getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === 'multiple') {
		Zotero.selectItems(getSearchResults(doc, false), function (selected) {
			if (selected) {
				ZU.processDocuments(Object.keys(selected), scrape);
			}
		});
	}
	else {
		scrape(doc);
	}
}

function scrape(doc, url) {
	let item = new Zotero.Item('book');
	item.url = url;
	item.place = 'Cambridge, MA, USA';
	item.publisher = 'MIT Press';
	item.language = 'en';
	item.date = ZU.xpathText(doc, '(//time[@property = "publishDate"]/@content)[1]');
	item.ISBN = ZU.xpathText(doc, '(//span[@property = "isbn"])[1]');
	item.numPages = ZU.xpathText(doc, '(//span[@property = "numPages"])[1]');
	
	let title = ZU.xpathText(doc, '//h1[@class = "book__title"]').trim();
	let subtitle = ZU.xpathText(doc, '//h2[@class = "book__subtitle"]').trim();
	if (subtitle) {
		item.title = [title, subtitle].join(': ');
	}
	else {
		item.title = title;
	}
	
	const contributorTypes = [['By', 'author'], ['Translated by', 'translator'], ['Edited by', 'editor']];
	let allContributors = ZU.xpath(doc, '//span[@class = "book__authors"]/p');
	allContributors.forEach(function (contributorLine) {
		contributorLine = contributorLine.textContent;
		contributorTypes.forEach(function (contributorType) {
			if (contributorLine.startsWith(contributorType[0])) {
				let contributors = contributorLine.replace(contributorType[0], '').split(/ and |,/);
				contributors.forEach(function (contributorName) {
					item.creators.push(ZU.cleanAuthor(contributorName, contributorType[1]));
				});
			}
		});
	});
	
	let series = ZU.xpathText(doc, '//p[@class = "book__series"][1]/a');
	if (series) {
		item.series = series.trim();
	}
	
	let openAccessUrl = ZU.xpathText(doc, '//div[contains(@class, "open-access")]/a/@href');
	if (openAccessUrl) {
		if (openAccessUrl.endsWith('.pdf') || openAccessUrl.endsWith('.pdf?dl=1')) {
			item.attachments.push({
				url: openAccessUrl,
				title: 'Full Text PDF',
				mimeType: 'application/pdf'
			});
		}
		else {
			item.attachments.push({
				url: openAccessUrl,
				title: 'Open Access',
				mimeType: 'text/html'
			});
		}
	}
	
	item.complete();
}

function getSearchResults(doc, checkOnly) {
	let rows = ZU.xpath(doc, '//ul[contains(@class, "results__list")]//a[@property = "name"]');
	
	if (checkOnly) {
		return rows.length > 0;
	}
	
	let items = {};
	for (let i = 0; i < rows.length; i++) {
		items[rows[i].href] = rows[i].text.trim();
	}
	return items;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://mitpress.mit.edu/books/series/adaptive-computation-and-machine-learning-series",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://mitpress.mit.edu/books/elements-causal-inference",
		"items": [
			{
				"itemType": "book",
				"title": "Elements of Causal Inference: Foundations and Learning Algorithms",
				"creators": [
					{
						"firstName": "Jonas",
						"lastName": "Peters",
						"creatorType": "author"
					},
					{
						"firstName": "Dominik",
						"lastName": "Janzing",
						"creatorType": "author"
					},
					{
						"firstName": "Bernhard",
						"lastName": "Schölkopf",
						"creatorType": "author"
					}
				],
				"date": "2017-11-29",
				"ISBN": "9780262037310",
				"language": "en",
				"libraryCatalog": "MIT Press Books",
				"numPages": "288",
				"place": "Cambridge, MA, USA",
				"publisher": "MIT Press",
				"series": "Adaptive Computation and Machine Learning series",
				"shortTitle": "Elements of Causal Inference",
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
		"url": "https://mitpress.mit.edu/search?keywords=deep+learning",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://mitpress.mit.edu/contributors/ian-goodfellow",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://mitpress.mit.edu/books/sciences-artificial-reissue-third-edition-new-introduction-john-laird",
		"items": [
			{
				"itemType": "book",
				"title": "The Sciences of the Artificial, Reissue Of The Third Edition With A New Introduction By John Laird",
				"creators": [
					{
						"firstName": "Herbert A.",
						"lastName": "Simon",
						"creatorType": "author"
					}
				],
				"date": "2019-08-13",
				"ISBN": "9780262537537",
				"language": "en",
				"libraryCatalog": "MIT Press Books",
				"numPages": "256",
				"place": "Cambridge, MA, USA",
				"publisher": "MIT Press",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://mitpress.mit.edu/books/construction-site-possible-worlds",
		"items": [
			{
				"itemType": "book",
				"title": "Construction Site for Possible Worlds",
				"creators": [
					{
						"firstName": "Amanda",
						"lastName": "Beech",
						"creatorType": "editor"
					},
					{
						"firstName": "Robin",
						"lastName": "Mackay",
						"creatorType": "editor"
					},
					{
						"firstName": "James",
						"lastName": "Wiltgen",
						"creatorType": "editor"
					}
				],
				"date": "2020-05-12",
				"ISBN": "9781913029579",
				"language": "en",
				"libraryCatalog": "MIT Press Books",
				"numPages": "136",
				"place": "Cambridge, MA, USA",
				"publisher": "MIT Press",
				"series": "Urbanomic",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://mitpress.mit.edu/books/ribbon-olympias-throat",
		"items": [
			{
				"itemType": "book",
				"title": "The Ribbon at Olympia's Throat",
				"creators": [
					{
						"firstName": "Michel",
						"lastName": "Leiris",
						"creatorType": "author"
					},
					{
						"firstName": "Christine",
						"lastName": "Pichini",
						"creatorType": "translator"
					}
				],
				"date": "2019-07-02",
				"ISBN": "9781635900842",
				"language": "en",
				"libraryCatalog": "MIT Press Books",
				"numPages": "288",
				"place": "Cambridge, MA, USA",
				"publisher": "MIT Press",
				"series": "Semiotext(e) / Native Agents",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
