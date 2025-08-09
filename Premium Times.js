{
	"translatorID": "59c1a13f-79ec-463e-bb07-a3e74926d211",
	"label": "Premium Times",
	"creator": "VWF",
	"target": "^https?://(www\\.)?premiumtimesng\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"lastUpdated": "2025-06-17 08:30:24"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 VWF

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

function detectWeb(doc, _url) {
	const jsonLdNodes = doc.querySelectorAll('script[type="application/ld+json"]');
	for (const node of jsonLdNodes) {
		try {
			const data = JSON.parse(node.textContent);
			const graph = Array.isArray(data['@graph']) ? data['@graph'] : [data];
			for (const entry of graph) {
				if (typeof entry['@type'] === 'string' && entry['@type'].includes('Article')) {
					return 'newspaperArticle';
				}
			}
		}
		catch (_) {}
	}
	return false;
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	const jsonLdNodes = doc.querySelectorAll('script[type="application/ld+json"]');
	let data = null;

	for (const node of jsonLdNodes) {
		try {
			const parsed = JSON.parse(node.textContent);
			const graph = Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed];
			for (const entry of graph) {
				if (typeof entry['@type'] === 'string' && entry['@type'].includes('Article')) {
					data = entry;
					break;
				}
			}
			if (data) break;
		}
		catch (_) {}
	}

	const item = new Zotero.Item('newspaperArticle');
	item.title = data?.headline || text(doc, 'h1.jeg_post_title');
	item.abstractNote = data?.description || text(doc, 'h2.jeg_post_subtitle');
	item.date = data?.datePublished || text(doc, 'div.jeg_meta_date a');
	item.language = data?.inLanguage || 'en';
	item.url = url;
	item.publicationTitle = 'Premium Times';
	item.ISSN = '2360-7688';
	item.place = 'Nigeria';

	const authorName = text(doc, 'div.jeg_meta_author a');
	if (authorName) {
		item.creators.push(ZU.cleanAuthor(authorName, 'author'));
	}

	item.attachments.push({
		document: doc,
		title: 'Snapshot'
	});

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.premiumtimesng.com/news/top-news/812850-what-nigeria-must-do-to-attract-tourists-belgian-ambassador.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "What Nigeria must do to attract tourists &#8211; Belgian Ambassador",
				"creators": [
					{
						"firstName": "Beloved",
						"lastName": "John",
						"creatorType": "author"
					}
				],
				"date": "2025-08-08T18:19:41+00:00",
				"ISSN": "2360-7688",
				"abstractNote": "Mr Leenknegt said Nigeria sometimes overrates its fame in the world when it comes to its food, and its film industry also needs major promotion.",
				"language": "en-GB",
				"libraryCatalog": "Premium Times",
				"place": "Nigeria",
				"publicationTitle": "Premium Times",
				"url": "https://www.premiumtimesng.com/news/top-news/812850-what-nigeria-must-do-to-attract-tourists-belgian-ambassador.html",
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
		"url": "https://www.premiumtimesng.com/news/headlines/801229-over-6000-displaced-in-renewed-benue-attacks-says-nema.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Over 6,000 displaced in renewed Benue attacks, says NEMA",
				"creators": [
					{
						"firstName": "Yakubu",
						"lastName": "Mohammed",
						"creatorType": "author"
					}
				],
				"date": "2025-06-16T18:20:53+00:00",
				"ISSN": "2360-7688",
				"abstractNote": "NEMA says more than 3,000 displaced persons including children and women were in urgent need of food, non-food items, potable water, and essential medical supplies.",
				"language": "en-GB",
				"libraryCatalog": "Premium Times",
				"place": "Nigeria",
				"publicationTitle": "Premium Times",
				"url": "https://www.premiumtimesng.com/news/headlines/801229-over-6000-displaced-in-renewed-benue-attacks-says-nema.html",
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
	}
]
/** END TEST CASES **/
