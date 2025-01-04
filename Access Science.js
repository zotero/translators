{
	"translatorID": "558330ca-3531-467a-8003-86cd9602cc48",
	"label": "Access Science",
	"creator": "Vinoth K - highwirepress.com",
	"target": "^https?://www\\.accessscience\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-10-17 20:19:39"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Vinoth K - highwirepress.com

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
	let title = attr(doc, 'meta[name="citation_title"]', 'content');
	if (title) {
		if (doc.querySelector('meta[name="citation_isbn"]')) {
			let bookTitle = attr(doc, 'meta[name="citation_book_title"]', 'content');
			if (!bookTitle || title == bookTitle) {
				return "book";
			}
			else {
				return "bookSection";
			}
		}
		else if (url.includes('content/video/') || url.includes('content/video-biography')) {
			return 'videoRecording';
		}
		else if (url.includes('content/article/')) {
			return "journalArticle";
		}
		else if (url.includes('news') || url.includes('briefing')) {
			return "magazineArticle";
		}
		else {
			return "webpage";
		}
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.search-middle-right a[href]');
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

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', function (obj, item) {
		// Author
		// Some of video pages having old content which does not contain the
		// firstname and lastname. which is binding in a single string in
		// metadata tags, So those cases we were split and mapped accordingly
		if (item.itemType == 'videoRecording') {
			let authorName = attr(doc, 'meta[name="citation_author"]', 'content');
			if (authorName) {
				item.creators = [];
				if (authorName.includes(',') && authorName.split(',').length > 2) {
					authorName = authorName.split(',')[0];
					item.creators.push(ZU.cleanAuthor(authorName, "author", false));
				}
			}
		}

		let abstractNote = attr(doc, 'meta[name="citation_abstract"]', 'content');
		item.abstractNote = abstractNote && ZU.cleanTags(abstractNote);
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = detectWeb(doc, url);
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.accessscience.com/content/book/9781260452297",
		"items": [
			{
				"itemType": "book",
				"title": "Casarett & Doull's Essentials of Toxicology",
				"creators": [
					{
						"firstName": "Curtis D.",
						"lastName": "Klaassen",
						"creatorType": "editor"
					},
					{
						"firstName": "John B. Watkins",
						"lastName": "Iii",
						"creatorType": "editor"
					}
				],
				"date": "2022",
				"ISBN": "9781260452297",
				"abstractNote": "Doody9s Core Titles for 2021!\n\nFor more than 25 years, Casarett &amp; Doull9s Toxicology: The Basic Science of Poisons has set the standard for providing thorough, academic, and authoritative information in clear and engaging ways. Distilling the major principles and concepts from that renowned text, Casarett &amp; Doull9s Essentials of Toxicology delivers an accessible and highly readable introduction to the science and clinical field of medical toxicology. The book reflects the expertise of more than 60 renowned contributors.\n\nPresented in full-color, this new edition builds on the wide success of previous editions, with extensive updates that make the book more clinically relevant to students and beginners in toxicology, pharmacology, pharmacy, and environmental sciences. Chapter-ending self-assessment Q&amp;As and other features make the learning process more effective and efficient.\n\nCasarett and Doull9s Essentials of Toxicology is organized into seven units:\n\n• General Principles of Toxicology\n\n• Disposition of Toxicants\n\n• Nonorgan-directed Toxicity\n\n• Target Organ Toxicity\n\n• Toxic Agents\n\n• Environmental Toxicology\n\n• Applications of Toxicology\n\nSuccinct, yet comprehensive, the text covers essential principles, toxicokinetics, how toxic effects are passed on to succeeding generations, how each body system responds to poisons, and the specific effects of a wide range of toxic agents—from pesticides to radiation.",
				"language": "en",
				"libraryCatalog": "www.accessscience.com",
				"publisher": "McGraw Hill",
				"url": "https://www.accessscience.com/content/book/9781260452297",
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
		"url": "https://www.accessscience.com/content/book/9781260452297/chapter/chapter2",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Principles of Toxicology",
				"creators": [
					{
						"firstName": "Lauren M.",
						"lastName": "Aleksunes",
						"creatorType": "author"
					},
					{
						"firstName": "David L.",
						"lastName": "Eaton",
						"creatorType": "author"
					},
					{
						"firstName": "Curtis D.",
						"lastName": "Klaassen",
						"creatorType": "editor"
					},
					{
						"firstName": "John B. Watkins",
						"lastName": "Iii",
						"creatorType": "editor"
					}
				],
				"date": "2022",
				"ISBN": "9781260452297",
				"bookTitle": "Casarett & Doull's Essentials of Toxicology",
				"language": "en",
				"libraryCatalog": "www.accessscience.com",
				"publisher": "McGraw Hill",
				"url": "https://www.accessscience.com/content/book/9781260452297/chapter/chapter2",
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
		"url": "https://www.accessscience.com/content/video/V2537194263001",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "Supplementary Problem 10.12",
				"creators": [
					{
						"firstName": "Rebecca B.",
						"lastName": "DeVasher",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"abstractNote": "This video details a problem involving unit cells and the calculation of the mass of a cell, length of a cell and radius of an atom in the unit cell based on the density of a solid.",
				"language": "en",
				"libraryCatalog": "www.accessscience.com",
				"studio": "McGraw Hill",
				"url": "https://www.accessscience.com/content/video/V2537194263001",
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
		"url": "https://www.accessscience.com/content/video-biography/VB0014",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "Anderson, John R.",
				"creators": [],
				"date": "2011",
				"language": "en",
				"libraryCatalog": "www.accessscience.com",
				"studio": "McGraw Hill",
				"url": "https://www.accessscience.com/content/video-biography/VB0014",
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
		"url": "https://www.accessscience.com/content/article/a694300?implicit-login=true",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "3D printing",
				"creators": [
					{
						"firstName": "Wenchao",
						"lastName": "Zhou",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"DOI": "10.1036/1097-8542.694300",
				"language": "en",
				"libraryCatalog": "www.accessscience.com",
				"url": "https://www.accessscience.com/content/article/a694300",
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
		"url": "https://www.accessscience.com/content/news/aSN2301171?implicit-login=true",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "These chemists cracked the code to long-lasting Roman concrete",
				"creators": [
					{
						"firstName": "Carolyn",
						"lastName": "Gramling",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"extra": "DOI: 10.1036/1097-8542.SN0000000",
				"language": "en",
				"libraryCatalog": "www.accessscience.com",
				"url": "https://www.accessscience.com/content/news/aSN2301171",
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
		"url": "https://www.accessscience.com/content/video/an600010",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "Henrietta Leavitt: The Woman Who Measured the Universe",
				"creators": [],
				"abstractNote": "Born in 1868, Henrietta Leavitt was an astronomer ahead of her time, whose work helped to revolutionize our understanding of the universe. While working at Harvard Observatory, Leavitt began to study stars of fluctuating brightness. This video describes her crucial observation about variable stars, which gave astronomers a new way to measure distances, ultimately leading to such impactful discoveries as the expansion of the universe.\n\nCredit: ESA Hubble Videos; Hubblecast 116: Henrietta Leavitt — ahead of her time; Directed by: Mathias Jäger; Visual design and editing: Martin Kornmesser; Written by: Sara Rigby; Narration: Sara Mendes da Costa; Images: ESA/Hubble and NASA, ESO, Hubble Heritage Team (STScI/AURA), Library of Congress Prints and Photographs Division Washington, Harvard College Observatory, Huntington Library, California Institute of Technology, Digitized Sky Survey 2, M. Kornmesser, R. Gendler, Arnold Reinhold, Davide De Martin; Videos: NASA, ESA, M. Kornmesser, Luis Calcada; Music: Johan B. Monell; Web and technical support: Mathias André and Raquel Yumi Shida; Executive producer: Lars Lindberg Christensen",
				"language": "en",
				"libraryCatalog": "www.accessscience.com",
				"shortTitle": "Henrietta Leavitt",
				"studio": "McGraw Hill",
				"url": "https://www.accessscience.com/content/video/an600010",
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
		"url": "https://www.accessscience.com/content/biography/m0073908",
		"items": [
			{
				"itemType": "webpage",
				"title": "Abbe, Cleveland (1838–1916)",
				"creators": [],
				"language": "en",
				"url": "https://www.accessscience.com/content/biography/m0073908",
				"websiteTitle": "McGraw Hill's AccessScience",
				"websiteType": "text",
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
		"url": "https://www.accessscience.com/search?query=&items_per_page=10",
		"items": "multiple"
	}
]
/** END TEST CASES **/
