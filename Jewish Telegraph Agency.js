{
	"translatorID": "13a10605-c97f-473c-9639-20cc193899ec",
	"label": "Jewish Telegraph Agency",
	"creator": "Anonymus",
	"target": "^https:\\/\\/www\\.jta\\.org\\/.*",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-08-07 11:26:08"
}

/*
	***** BEGIN LICENSE BLOCK *****
 
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
	if (doc.querySelector('meta[property="og:type"]')?.content === "article") {
		return "newspaperArticle";
	}
	return false;
}

async function doWeb(doc, url) {
	await scrape(doc, url)
}

async function scrape(doc, url) {
	const item = new Zotero.Item("newspaperArticle");

	// Extract Title: Scrapes the main headline of the article.
	item.title = doc.title.replace(" - Jewish Telegraphic Agency", "").trim();

	// Extract abstract/description
	const ogDescriptionElement = doc.querySelector('meta[property="og:description"]');
	if (ogDescriptionElement && ogDescriptionElement.content) {
		item.abstractNote = ogDescriptionElement.content;
	}

	// get URL
	const ogUrlElement = doc.querySelector('meta[property="og:url"]');
	if (ogUrlElement && ogUrlElement.content) {
		item.url = ogUrlElement.content;
	}

	// author
	const authorElement = doc.querySelector('meta[name="author"]');
	if (authorElement?.content) {
		const authorFullName = authorElement.content.trim();
		const nameParts = authorFullName.split(' ');
		const [firstName, lastName] = nameParts;
		item.creators.push({
			firstName: firstName,
			lastName: lastName,
			creatorType: "author"
		});
	}
	
	if (url.match(/^https?:\/\/www\.jta\.org\/archive\//)) {
		// Extract Date:
		const dateElem = doc.querySelector('.post-pdf__date');
		item.date = dateElem.textContent.trim();
		
		item.publicationTitle = "Daily news bulletin";
		item.ISSN = "1538-4918";
		item.place = "United States";
		item.libraryCatalog = "Jewish Telegraphic Agency Archive";
		const pdfURL = doc.querySelector('div.post-pdf')?.href;
		item.attachments.push({
			url: pdfURL,
			title: "JTA Daily news bulletin " + item.date,
			mimeType: "application/pdf"
		});
	}
	else {
		const dateSpanElement = doc.querySelector('span.post-meta-info__date');
		item.date = dateSpanElement.textContent.trim();
		item.ISSN = "1536-1292";
	}
	item.url = url.split('?')[0].split('#')[0];

	item.attachments.push({
	title: "Snapshot",
	document: doc
	})
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.jta.org/2025/08/06/united-states/inside-one-mans-quixotic-quest-to-preserve-200000-israeli-tchotchkes",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Inside one man’s quixotic quest to preserve 200,000 Israeli tchotchkes",
				"creators": [
					{
						"firstName": "Asaf",
						"lastName": "Elia-Shalev",
						"creatorType": "author"
					}
				],
				"date": "August 6, 2025",
				"ISSN": "1536-1292",
				"abstractNote": "Boris Gorbis spent a life time scouring garage sales, thrift shops and eBay for discarded souvenirs. Now, he’s determined to secure their future.",
				"libraryCatalog": "Jewish Telegraphic Agency Archive",
				"url": "https://www.jta.org/2025/08/06/united-states/inside-one-mans-quixotic-quest-to-preserve-200000-israeli-tchotchkes",
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
		"url": "https://www.jta.org/archive/palestine-must-be-built-in-cooperation-with-arabs-and-christians-says-dr-weizmann",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Palestine Must Be Built in Cooperation with Arabs and Christians Says Dr. Weizmann",
				"creators": [],
				"date": "January 10, 1924",
				"ISSN": "1538-4918",
				"abstractNote": "The 19th convention of the Federation of Canadian Zionists opened with a mass meeting at Macy Hall, which was addressed by Dr. Chaim Weizmann, President of the World Zionist Organization, and A.J. Freiman, President of the Federation of Canadian Zionists. Dr. Weizmann gave a detailed description of conditions in Palestine, declaring that the time had […]",
				"libraryCatalog": "Jewish Telegraphic Agency Archive",
				"place": "United States",
				"publicationTitle": "Daily news bulletin",
				"url": "https://www.jta.org/archive/palestine-must-be-built-in-cooperation-with-arabs-and-christians-says-dr-weizmann",
				"attachments": [
					{
						"title": "JTA Daily news bulletin January 10, 1924",
						"mimeType": "application/pdf"
					},
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
	}
]
/** END TEST CASES **/
