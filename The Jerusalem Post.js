{
	"translatorID": "851bce89-f52d-4330-b737-8bd50615cf1f",
	"label": "The Jerusalem Post",
	"creator": "Anonymus",
	"target": "^https?://(www\\.)?jpost\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-07-18 14:31:18"
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
	if (url.match(/\/article-/i) || doc.querySelector('article')) {
		return "newspaperArticle";
	} 
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, url), function (items) {
			if (!items) return;
			ZU.processDocuments(Object.keys(items), scrape);
		});
	}
    else {
		scrape(doc, url);
	}
}

function getSearchResults(doc, url) {
	var items = {};
	var links = doc.querySelectorAll('a[href*="/article-"]');
	for (let link of links) {
		let title = ZU.trimInternal(link.textContent);
		let href = link.href;
		if (title && href) {
			items[href] = title;
		}
	}
	return items;
}

function scrape(doc, url) {
	var item = new Zotero.Item("newspaperArticle");
	item.publicationTitle = "The Jerusalem Post";

	// Extract title
	var title = doc.querySelector('h1') ? ZU.trimInternal(doc.querySelector('h1').textContent) : "";
	item.title = title;

	// Extract authors
	var author = doc.querySelector('meta[name="author"]');
	if (!author) {
		// Fallback: scrape author from <span class="reporters">
		author = doc.querySelector('span.reporters a.reporter-name-channel');
	}
	if (author) {
		let authorName = author.textContent.trim();
		// Convert to title case (e.g., "ELIAV BREUER" to "Eliav Breuer")
		let normalizedName = authorName.toLowerCase().split(' ').map(word => 
			word.charAt(0).toUpperCase() + word.slice(1)
		).join(' ');
		let nameParts = normalizedName.split(' ').filter(part => part);
		if (nameParts.length === 2) {
			// Exactly two words: split into first and last name
			item.creators.push({
				firstName: nameParts[0],
				lastName: nameParts[1],
				creatorType: "author"
			});
		}
		else if (nameParts.length > 0) {
			// Any other number of words: treat as single name field
			item.creators.push({
				lastName: normalizedName,
				creatorType: "author",
				fieldMode: 1 // Single name field
			});
		}
	}
	

	// Extract date
	var date = doc.querySelector('meta[property="article:published_time"]');
	if (date) {
		item.date = ZU.strToISO(date.content);
	}
	else {
		// Fallback to text date in the article
		let dateText = doc.querySelector('time');
		if (dateText) {
			item.date = ZU.strToISO(dateText.getAttribute('datetime') || dateText.textContent);
		}
	}

	// Extract abstract/summary
	var abstract = doc.querySelector('meta[name="description"]');
	if (abstract) {
		item.abstractNote = abstract.content;
	}

	// Extract tags
	var tags = doc.querySelectorAll('meta[name="keywords"]');
	if (tags.length) {
		let keywords = tags[0].content.split(',').map(tag => tag.trim());
		for (let tag of keywords) {
			if (tag) item.tags.push(tag);
		}
	}

	// Extract URL
	item.url = url.split('?')[0].split('#')[0];

	// Extract section
	var section = doc.querySelector('meta[property="article:section"]');
	if (section) {
		item.section = section.content;
	}

	// Extract ISSN
	item.ISSN = "0792-822X";

	// Extract full text
	var articleText = "";
	var paragraphs = doc.querySelectorAll('article p');
	for (let p of paragraphs) {
		articleText += p.textContent + "\n\n";
	}

	item.language = "en";

	// Attach snapshot
	item.attachments.push({
		title: "Snapshot",
		document: doc,
		mimeType: "text/html"
	});

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
		{
		"type": "web",
		"url": "https://www.jpost.com/middle-east/iran-news/article-861478#353653gsrdvydsfsdg",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Iran rushing to rearm Mideast terror proxies after IDF, US strikes on Tehran - WSJ",
				"creators": [
					{
						"lastName": "Jerusalem Post Staff",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2025-07-18",
				"ISSN": "0792-822X",
				"abstractNote": "Despite the denials from Tehran, there is mounting evidence that Iran continues to send military aid to these groups, demonstrating its determination to retain influence over its militia allies.",
				"language": "en",
				"libraryCatalog": "The Jerusalem Post",
				"publicationTitle": "The Jerusalem Post",
				"url": "https://www.jpost.com/middle-east/iran-news/article-861478",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Hezbollah"
					},
					{
						"tag": "Houthi"
					},
					{
						"tag": "Iran"
					},
					{
						"tag": "Iran nuclear"
					},
					{
						"tag": "Lebanon"
					},
					{
						"tag": "Operation Midnight Hammer"
					},
					{
						"tag": "Operation Rising Lion"
					},
					{
						"tag": "Syria Iran"
					},
					{
						"tag": "Yemen"
					},
					{
						"tag": "hezbollah iran"
					},
					{
						"tag": "hezbollah syria"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.jpost.com/israel-news/article-861421?eagear345",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "I saw Israel’s attorney‑general bend the law for her favorites, and I paid the price - comment",
				"creators": [
					{
						"firstName": "Zvika",
						"lastName": "Klein",
						"creatorType": "author"
					}
				],
				"date": "2025-07-17",
				"ISSN": "0792-822X",
				"abstractNote": "Editor's Notes: I’ve been pretty quiet since I was released from house arrest and received tremendous support from Israelis. But on Friday, I almost lost it.",
				"language": "en",
				"libraryCatalog": "The Jerusalem Post",
				"publicationTitle": "The Jerusalem Post",
				"url": "https://www.jpost.com/israel-news/article-861421",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Attorney-General"
					},
					{
						"tag": "Gali Baharav-Miara"
					},
					{
						"tag": "Qatargate"
					},
					{
						"tag": "The Jerusalem Post"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
