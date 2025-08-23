{
	"translatorID": "ac277fbe-000c-46da-b145-fbe799d17eda",
	"label": "MIT Press Books",
	"creator": "Guy Aglionby",
	"target": "https://(www\\.)?mitpress\\.mit\\.edu/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-08-05 20:50:04"
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

function detectWeb(doc, _url) {
	if (doc.body.classList.contains('book-details')) {
		return 'book';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.book-wrapper a, .upt-author-page__book-carousel--cover a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.title);
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

async function scrape(doc, url) {
	let item = new Zotero.Item('book');
	item.title = [text(doc, '.book-wrapper__info h1'), text(doc, '.book-wrapper__info h2')]
		.filter(Boolean)
		.join(': ');
	item.place = 'Cambridge, MA, USA';
	item.language = 'en';

	let infoBlocks = doc.querySelector('.etextbook-content__right').querySelectorAll('p');
	for (let info of infoBlocks) {
		if (info.classList.contains('sp__details')) {
			item.numPages = text(info, '.sp__the-pages').match(/\d+/)?.[0];
			continue;
		}

		let [field, value] = info.textContent.split(': ');
		switch (field) {
			case 'ISBN':
				item.ISBN = ZU.cleanISBN(value);
				break;
			case 'Pub date':
				item.date = ZU.strToISO(value);
				break;
			case 'Publisher':
				if (value === 'The MIT Press') {
					value = 'MIT Press';
				}
				item.publisher = value;
				break;
		}
	}
	
	item.abstractNote = text(doc, '.book-summary');
	
	let editionRegex = /(([\w ]+) edition( [\w ]+)?)/i;
	let matchedEdition = text(doc, '.sp__the-edition').match(editionRegex);
	if (matchedEdition) {
		item.edition = cleanEdition(matchedEdition[1]);
	}
	
	let volumeRegex = /volume (\d+)/i;
	let matchedVolume = text(doc, '.sp__the-volume').match(volumeRegex);
	if (matchedVolume) {
		item.volume = matchedVolume[1];
	}
	
	const contributorTypes = [[/^by /i, 'author'], [/^translated by/i, 'translator'], [/^edited by/i, 'editor']];
	for (let contributorLine of doc.querySelectorAll('.sp__the-author')) {
		contributorLine = contributorLine.textContent;
		for (let [prefix, creatorType] of contributorTypes) {
			if (prefix.test(contributorLine)) {
				let contributors = contributorLine.replace(prefix, '').split(/ and |,/);
				for (let contributorName of contributors) {
					item.creators.push(ZU.cleanAuthor(contributorName, creatorType));
				}
				break;
			}
		}
	}
	
	let seriesLink = doc.querySelector('.book-wrapper__info a[href*="/series/"]');
	if (seriesLink) {
		// Remove name of imprint/publisher from series
		item.series = seriesLink.textContent.replace(/.+ \/ (.+)/, '$1');
	}
	
	let openAccessUrl = attr(doc, '.oa__link a', 'href');
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
		item.url = url;
	}
	
	if (seriesLink) {
		let seriesDoc = await requestDocument(seriesLink.href);
		let seriesEditors = (seriesDoc.querySelector('main p strong')?.nextSibling?.textContent ?? '')
			.split(/,| and /);
		for (let seriesEditor of seriesEditors) {
			item.creators.push(ZU.cleanAuthor(seriesEditor, 'seriesEditor'));
		}
	}
	item.complete();
}

function cleanEdition(text) {
	if (!text) return text;
	
	// from Taylor & Francis eBooks translator, slightly adapted
	
	const ordinals = {
		first: "1",
		second: "2",
		third: "3",
		fourth: "4",
		fifth: "5",
		sixth: "6",
		seventh: "7",
		eighth: "8",
		ninth: "9",
		tenth: "10"
	};
	
	text = ZU.trimInternal(text).replace(/[[\]]/g, '');
	// this somewhat complicated regex tries to isolate the number (spelled out
	// or not) and make sure that it isn't followed by any extra info
	let matches = text
		.match(/^(?:(?:([0-9]+)(?:st|nd|rd|th)?)|(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth))(?:\s?ed?\.?|\sedition)?$/i);
	if (matches) {
		let edition = matches[1] || matches[2];
		edition = ordinals[edition.toLowerCase()] || edition;
		return edition == "1" ? null : edition;
	}
	else {
		return text;
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://mitpress.mit.edu/search?keywords=deep+learning",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://mitpress.mit.edu/author/joelle-m-abi-rached-34017/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://mitpress.mit.edu/books/series/adaptive-computation-and-machine-learning-series",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://mitpress.mit.edu/books/distribution/urbanomic",
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
					},
					{
						"firstName": "Francis",
						"lastName": "Bach",
						"creatorType": "seriesEditor"
					}
				],
				"date": "2017-11-29",
				"ISBN": "9780262037310",
				"abstractNote": "A concise and self-contained introduction to causal inference, increasingly important in data science and machine learning.",
				"language": "en",
				"libraryCatalog": "MIT Press Books",
				"numPages": "288",
				"place": "Cambridge, MA, USA",
				"publisher": "MIT Press",
				"series": "Adaptive Computation and Machine Learning series",
				"shortTitle": "Elements of Causal Inference",
				"url": "https://mitpress.mit.edu/9780262037310/elements-of-causal-inference/",
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
		"url": "https://mitpress.mit.edu/books/sciences-artificial-reissue-third-edition-new-introduction-john-laird",
		"items": [
			{
				"itemType": "book",
				"title": "The Sciences of the Artificial",
				"creators": [
					{
						"firstName": "Herbert A.",
						"lastName": "Simon",
						"creatorType": "author"
					}
				],
				"date": "2019-08-13",
				"ISBN": "9780262537537",
				"abstractNote": "Herbert Simon's classic work on artificial intelligence in the expanded and updated third edition from 1996, with a new introduction by John E. Laird.",
				"edition": "reissue of the third edition with a new introduction by John Laird",
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
				"date": "2020-08-11",
				"ISBN": "9781913029579",
				"abstractNote": "Perspectives from philosophy, aesthetics, and art on how to envisage the construction site of possible worlds.",
				"language": "en",
				"libraryCatalog": "MIT Press Books",
				"numPages": "276",
				"place": "Cambridge, MA, USA",
				"publisher": "Urbanomic",
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
				"abstractNote": "Short fragments and essays that explore how a seemingly irrelevant aesthetic detail may cause the eruption of sublimity within the mundane.",
				"language": "en",
				"libraryCatalog": "MIT Press Books",
				"numPages": "288",
				"place": "Cambridge, MA, USA",
				"publisher": "Semiotext(e)",
				"series": "Native Agents",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://mitpress.mit.edu/books/foundations-machine-learning-second-edition",
		"items": [
			{
				"itemType": "book",
				"title": "Foundations of Machine Learning",
				"creators": [
					{
						"firstName": "Mehryar",
						"lastName": "Mohri",
						"creatorType": "author"
					},
					{
						"firstName": "Afshin",
						"lastName": "Rostamizadeh",
						"creatorType": "author"
					},
					{
						"firstName": "Ameet",
						"lastName": "Talwalkar",
						"creatorType": "author"
					},
					{
						"firstName": "Francis",
						"lastName": "Bach",
						"creatorType": "seriesEditor"
					}
				],
				"date": "2018-12-25",
				"ISBN": "9780262039406",
				"abstractNote": "A new edition of a graduate-level machine learning textbook that focuses on the analysis and theory of algorithms.",
				"edition": "2",
				"language": "en",
				"libraryCatalog": "MIT Press Books",
				"numPages": "504",
				"place": "Cambridge, MA, USA",
				"publisher": "MIT Press",
				"series": "Adaptive Computation and Machine Learning series",
				"url": "https://mitpress.mit.edu/9780262039406/foundations-of-machine-learning/",
				"attachments": [
					{
						"title": "Open Access",
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
		"url": "https://mitpress.mit.edu/books/collapse-volume-8",
		"items": [
			{
				"itemType": "book",
				"title": "Collapse: Casino Real",
				"creators": [
					{
						"firstName": "Robin",
						"lastName": "Mackay",
						"creatorType": "editor"
					},
					{
						"firstName": "Robin",
						"lastName": "Mackay",
						"creatorType": "seriesEditor"
					}
				],
				"date": "2018-10-23",
				"ISBN": "9780956775023",
				"abstractNote": "An assembly of perspectives on risk, contingency, and chance—at the gaming table, in the markets, and in life.",
				"language": "en",
				"libraryCatalog": "MIT Press Books",
				"numPages": "1020",
				"place": "Cambridge, MA, USA",
				"publisher": "Urbanomic",
				"series": "Collapse",
				"shortTitle": "Collapse",
				"volume": "8",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://mitpress.mit.edu/books/reinforcement-learning-second-edition",
		"items": [
			{
				"itemType": "book",
				"title": "Reinforcement Learning: An Introduction",
				"creators": [
					{
						"firstName": "Richard S.",
						"lastName": "Sutton",
						"creatorType": "author"
					},
					{
						"firstName": "Andrew G.",
						"lastName": "Barto",
						"creatorType": "author"
					},
					{
						"firstName": "Francis",
						"lastName": "Bach",
						"creatorType": "seriesEditor"
					}
				],
				"date": "2018-11-13",
				"ISBN": "9780262039246",
				"abstractNote": "The significantly expanded and updated new edition of a widely used text on reinforcement learning, one of the most active research areas in artificial intelligence.",
				"edition": "2",
				"language": "en",
				"libraryCatalog": "MIT Press Books",
				"numPages": "552",
				"place": "Cambridge, MA, USA",
				"publisher": "MIT Press",
				"series": "Adaptive Computation and Machine Learning series",
				"shortTitle": "Reinforcement Learning",
				"url": "https://mitpress.mit.edu/9780262039246/reinforcement-learning/",
				"attachments": [
					{
						"title": "Open Access",
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
		"url": "https://mitpress.mit.edu/books/architecture-and-action",
		"items": [
			{
				"itemType": "book",
				"title": "Architecture and Action",
				"creators": [
					{
						"firstName": "J. Meejin",
						"lastName": "Yoon",
						"creatorType": "editor"
					},
					{
						"firstName": "Irina",
						"lastName": "Chernyakova",
						"creatorType": "editor"
					}
				],
				"date": "2019-07-02",
				"ISBN": "9780998117065",
				"abstractNote": "Projects and texts that address architecture's role in taking on complex global challenges including climate change, housing, migration, and social justice.",
				"language": "en",
				"libraryCatalog": "MIT Press Books",
				"numPages": "350",
				"place": "Cambridge, MA, USA",
				"publisher": "SA+P Press",
				"series": "Agendas in Architecture",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://mitpress.mit.edu/books/acquired-tastes",
		"items": [
			{
				"itemType": "book",
				"title": "Acquired Tastes: Stories about the Origins of Modern Food",
				"creators": [
					{
						"firstName": "Benjamin R.",
						"lastName": "Cohen",
						"creatorType": "editor"
					},
					{
						"firstName": "Michael S.",
						"lastName": "Kideckel",
						"creatorType": "editor"
					},
					{
						"firstName": "Anna",
						"lastName": "Zeide",
						"creatorType": "editor"
					},
					{
						"firstName": "Robert",
						"lastName": "Gottlieb",
						"creatorType": "seriesEditor"
					},
					{
						"firstName": "Nevin",
						"lastName": "Cohen",
						"creatorType": "seriesEditor"
					}
				],
				"date": "2021-08-17",
				"ISBN": "9780262542913",
				"abstractNote": "How modern food helped make modern society between 1870 and 1930: stories of power and food, from bananas and beer to bread and fake meat.",
				"language": "en",
				"libraryCatalog": "MIT Press Books",
				"numPages": "290",
				"place": "Cambridge, MA, USA",
				"publisher": "MIT Press",
				"series": "Food, Health, and the Environment",
				"shortTitle": "Acquired Tastes",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://mitpress.mit.edu/9781915983169/building-solidarity-architectures/",
		"items": [
			{
				"itemType": "book",
				"title": "Building Solidarity Architectures: Collective Care in Times of Crisis",
				"creators": [
					{
						"firstName": "Elisavet",
						"lastName": "Hasa",
						"creatorType": "author"
					}
				],
				"date": "2025-12-02",
				"ISBN": "9781915983169",
				"abstractNote": "On the spatial politics underlying the strategies of state abandonment in cities today.",
				"language": "en",
				"libraryCatalog": "MIT Press Books",
				"numPages": "248",
				"place": "Cambridge, MA, USA",
				"publisher": "Goldsmiths Press",
				"series": "Spatial Politics",
				"shortTitle": "Building Solidarity Architectures",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
