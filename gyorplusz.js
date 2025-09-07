{
	"translatorID": "67b93a38-5182-45e5-ab35-3b95764f6979",
	"label": "Győr Plusz",
	"creator": "Gemini/homope",
	"target": "^https?://(www\\.)?gyorplusz\\.hu",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-05-24 12:00:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Gemini
	
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
	if (doc.querySelector('div.content-header h1')) {
		return "magazineArticle";
	}
	return false;
}

function scrape(doc, url) {
	let item = new Zotero.Item('magazineArticle');
	item.title = ZU.cleanString(doc.querySelector('div.content-header h1').textContent);
	item.publicationTitle = "Győr Plusz";

	// Extract author from the new HTML structure, and fall back to the old one
	const newAuthorElement = doc.querySelector('.author .name');
	if (newAuthorElement) {
		const authorName = ZU.cleanString(newAuthorElement.textContent);
		item.creators.push(ZU.cleanAuthor(authorName, 'author'));
	} else {
		const authorMeta = doc.querySelector('meta[name="author"]');
		if (authorMeta) {
			const authorName = authorMeta.getAttribute('content');
			item.creators.push(ZU.cleanAuthor(authorName, 'author'));
		}
	}
	
	// Extract the date from the new HTML structure, and fall back to the old one
	const newTimeElement = doc.querySelector('.author .date');
	if (newTimeElement) {
		const dateString = ZU.cleanString(newTimeElement.textContent);
		// Example date string: "2025.09.05. 12:42"
		const formattedDate = dateString.replace(/(\d{4})\.\s*(\d{2})\.\s*(\d{2})\.\s*(\d{2}:\d{2})/, '$1-$2-$3T$4:00');
		item.date = formattedDate;
	} else {
		const timeElement = doc.querySelector('.article-info .time');
		if (timeElement) {
			const dateString = ZU.cleanString(timeElement.textContent);
			const formattedDate = dateString.replace(/(\d{4})\.\s*(\d{2})\.\s*(\d{2})\.\s*(\d{2}:\d{2})/, '$1-$2-$3T$4:00');
			item.date = formattedDate;
		}
	}


	const leadParagraph = doc.querySelector('p.lead');
	const abstractMeta = doc.querySelector('meta[property="og:description"]');
	
	if (leadParagraph && ZU.cleanString(leadParagraph.textContent).length > 0) {
		item.abstractNote = ZU.cleanString(leadParagraph.textContent);
	} else if (abstractMeta) {
		item.abstractNote = ZU.cleanString(abstractMeta.getAttribute('content'));
	}

	const tagLinks = doc.querySelectorAll('.tags-container a');
	if (tagLinks.length > 0) {
		for (let link of tagLinks) {
			item.tags.push({ tag: ZU.cleanString(link.textContent).replace(/#/g, '') });
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
				"title": "Közösségi pavilont építettek Székelyföldön a győri egyetem hallgatói",
				"creators": [
					{
						"lastName": "Győr+",
						"creatorType": "author"
					}
				],
				"date": "2025-09-05T12:42:00",
				"abstractNote": "A székelyföldi Abásfalván tartottak építőtábort a Pannónia Ösztöndíjprogram támogatásával a Széchenyi István Egyetem Winkler Gábor Mérnöki Szakkollégiumának hallgatói, akik egy nyitott közösségi pavilont valósítottak meg a Hargita megyei kisfaluban. A győri intézmény Építész-, Építő- és Közlekedésmérnöki Karának fiataljai nagy sikert arattak a hagyományos népi stílusból ihletődött, mégis kortárs megjelenésű faépítményükkel.",
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
						"tag": "építészet"
					},
					{
						"tag": "Széchenyi István Egyetem"
					},
					{
						"tag": "Gyergyócsomafalva"
					},
					{
						"tag": "hallgatók"
					}
				],
				"notes": []
			}
		]
	}
]
/** END TEST CASES **/

