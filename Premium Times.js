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
	// Title
	item.title = data?.headline || text(doc, 'h1.jeg_post_title');
	// Abstract (use JSON-LD if present, else subtitle element)
	item.abstractNote = data?.description || text(doc, 'h2.jeg_post_subtitle');
	// Date published (ISO format from JSON-LD or parsed from page)
	const dateText = text(doc, 'div.jeg_meta_date a');
	item.date = data?.datePublished || (dateText ? ZU.strToISO(dateText) : undefined);
	// Language (use JSON-LD or default to British English)
	item.language = data?.inLanguage || 'en-GB';
	item.url = url;
	item.publicationTitle = 'Premium Times';
	item.libraryCatalog = 'Premium Times';
	item.ISSN = '2360-7688';
	item.place = 'Nigeria';

	// Author
	const authorName = text(doc, 'div.jeg_meta_author a');
	if (authorName) {
		item.creators.push(ZU.cleanAuthor(authorName, 'author'));
	}

	// Attach a snapshot of the page
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
		"url": "https://www.premiumtimesng.com/business/business-news/800867-mrs-oil-nigeria-announces-resignation-of-non-executive-director.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "MRS Oil Nigeria announces resignation of non-executive director",
				"creators": [
					{
						"firstName": "Ayodeji",
						"lastName": "Adegboyega",
						"creatorType": "author"
					}
				],
				"date": "2025-06-14T17:20:21+00:00",
				"ISSN": "2360-7688",
				"abstractNote": "“Over the years, she spearheaded numerous strategic initiatives and led teams through critical milestones.”",
				"language": "en-GB",
				"libraryCatalog": "Premium Times",
				"place": "Nigeria",
				"publicationTitle": "Premium Times",
				"url": "https://www.premiumtimesng.com/business/business-news/800867-mrs-oil-nigeria-announces-resignation-of-non-executive-director.html",
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
