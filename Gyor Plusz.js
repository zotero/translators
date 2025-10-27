{
	"translatorID": "67b93a38-5182-45e5-ab35-3b95764f6979",
	"label": "Győr Plusz",
	"creator": "homope",
	"target": "^https?://(www\\.)?gyorplusz\\.hu",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-27 08:11:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 homope	
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

/**
 * Detects if the current page is a single article based on OpenGraph metadata.
 * @param {Document} doc
 * @param {string} url
 * @returns {string|boolean}
 */
function detectWeb(doc, url) {
	// A more specific check: look for the OpenGraph type "article"
	if (doc.querySelector('meta[property="og:type"][content="article"]')) {
		return "magazineArticle";
	}
	return false;
}

/**
 * Scrapes the data for the article.
 * @param {Document} doc
 * @param {string} url
 */
function scrape(doc, url) {
	let item = new Zotero.Item('magazineArticle');
	
	// Title: Use the first H1 found, as it's typically the title
	let titleElement = doc.querySelector('h1');
	if (titleElement) {
		item.title = ZU.text(titleElement); // ZU.text() replaces ZU.cleanString(el.textContent)
	}

	item.publicationTitle = "Győr Plusz";

	// 1. Extract Author (Relying on meta tag as it proved more reliable for the test case)
	let authorMeta = doc.querySelector('meta[name="author"]');
	if (authorMeta) {
		let authorName = authorMeta.getAttribute('content');
		// Prevent adding the site name itself as the author
		if (authorName && authorName !== 'Győr Plusz') {
			item.creators.push(ZU.cleanAuthor(authorName, 'author'));
		}
	}
	
	// 2. Extract Date (Checking for both new and old date element selectors)
	let dateString = null;
	// Combine potential date element selectors
	let dateElements = doc.querySelectorAll('.author .date, .article-info .time'); 
	
	for (let el of dateElements) {
		dateString = ZU.text(el);
		if (dateString) break;
	}

	if (dateString) {
		// ZU.strToISO is the correct utility for parsing date strings (e.g., "YYYY.MM.DD. HH:MM")
		item.date = ZU.strToISO(dateString);
	}

	// 3. Abstract (Prefer lead paragraph, fall back to meta description)
	let leadParagraph = doc.querySelector('p.lead');
	let abstractMeta = doc.querySelector('meta[property="og:description"]');
	
	if (leadParagraph && ZU.text(leadParagraph).length > 0) {
		item.abstractNote = ZU.text(leadParagraph);
	} else if (abstractMeta) {
		item.abstractNote = ZU.text(abstractMeta);
	}

	// 4. Tags
	let tagLinks = doc.querySelectorAll('.tags-container a');
	if (tagLinks.length > 0) {
		for (let link of tagLinks) {
			item.tags.push({ tag: ZU.text(link).replace(/#/g, '') });
		}
	}

	item.url = url;
	item.attachments.push({ document: doc, title: 'Snapshot' });
	item.complete();
}

function doWeb(doc, url) {
	scrape(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.gyorplusz.hu/gyor/kozossegi-pavilont-epitettek-szekelyfoldon-a-gyori-egyetem-hallgatoi/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Students of the University of Győr built a community pavilion in Székely Land",
				"creators": [
					{
						"lastName": "Győr+",
						"creatorType": "author"
					}
				],
				"date": "2025-09-05T12:42:00Z",
				"abstractNote": "Students of the Gábor Winkler Engineering College of the Széchenyi István University held a construction camp in Abásfalva, Székely Land, supported by the Pannónia Scholarship Program, where they realized an open community pavilion in the small village of Harghita County. The young people from the Faculty of Architecture, Civil Engineering and Transportation Engineering of the Győr institution achieved great success with their contemporary-looking wooden structure, inspired by traditional folk style.",
				"publicationTitle": "Győr Plusz",
				"url": "https://www.gyorplusz.hu/gyor/kozossegi-pavilont-epitettek-szekelyfoldon-a-gyori-egyetem-hallgatoi/",
				"attachments": [
					{
						"title": "Snapshot",
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "architecture"
					},
					{
						"tag": "Széchenyi István University"
					},
					{
						"tag": "Gyergyócsomafalva"
					},
					{
						"tag": "students"
					}
				],
				"notes": []
			}
		]
	}
]
/** END TEST CASES **/
