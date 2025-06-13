{
	"translatorID": "eb0bbbf8-7f57-40fa-aec2-45480d396e93",
	"label": "Prime 9ja Online",
	"creator": "VWF",
	"target": "^https?://(www\\.)?prime9ja\\.com\\.ng/\\d{4}/\\d{2}/[^/]+\\.html",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"lastUpdated": "2025-06-13 22:24:24"
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

function detectWeb(doc, url) {
	let jsonLdNodes = doc.querySelectorAll('script[type="application/ld+json"]');
	for (let node of jsonLdNodes) {
		try {
			let data = JSON.parse(node.textContent);
			let type = data['@type'];
			if (typeof type === 'string' && type.endsWith('NewsArticle')) {
				return 'newspaperArticle';
			}
			if (Array.isArray(type) && type.some(t => typeof t === 'string' && t.endsWith('NewsArticle'))) {
				return 'newspaperArticle';
			}
		} catch (e) {}
	}
	if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll('a.entry-title[href*="/202"]');
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

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	} else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	let item = new Zotero.Item('newspaperArticle');
	let jsonLdNodes = doc.querySelectorAll('script[type="application/ld+json"]');
	let data = null;

	for (let node of jsonLdNodes) {
		try {
			let parsed = JSON.parse(node.textContent);
			let type = parsed['@type'];
			if ((typeof type === 'string' && type.endsWith('NewsArticle')) ||
				(Array.isArray(type) && type.some(t => typeof t === 'string' && t.endsWith('NewsArticle')))) {
				data = parsed;
				break;
			}
		} catch (e) {}
	}

	if (data) {
		item.title = data.headline || ZU.xpathText(doc, '//h1[contains(@class, "entry-title")]');
		item.ISSN = '3092-8907';
		item.abstractNote = data.description || '';
		item.date = data.datePublished || '';
		item.language = data.inLanguage || 'en';
		item.url = data.url || url;
		item.publicationTitle = (data.publisher && data.publisher.name) || 'Prime 9ja Online';
		item.place = 'Nigeria';

		if (data.author) {
			if (Array.isArray(data.author)) {
				for (let author of data.author) {
					if (author.name) {
						item.creators.push(ZU.cleanAuthor(author.name, 'author'));
					}
				}
			} else if (data.author.name) {
				item.creators.push(ZU.cleanAuthor(data.author.name, 'author'));
			}
		} else {
			let authorText = ZU.xpathText(doc, '//span[@itemprop="name"]');
			if (authorText) {
				item.creators.push(ZU.cleanAuthor(authorText, 'author'));
			}
		}

		if (data.thumbnailUrl) {
			item.attachments.push({
				title: 'Image',
				mimeType: 'image/jpeg',
				url: data.thumbnailUrl
			});
		}
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
		          "url": "https://www.prime9ja.com.ng/2025/05/tribunal-to-rule-on-ondo-poll-june-4.html",
		          "items": [
			          {
				          "itemType": "newspaperArticle",
				          "title": "Tribunal to Rule on Ondo Poll June 4",
				          "creators": [
					          {
						          "firstName": "Chima Joseph",
						          "lastName": "Ugo",
						          "creatorType": "author"
					          }
				          ],
				          "date": "2025-05-24T18:10:00+01:00",
				          "ISSN": "3092-8907",
				          "abstractNote": "<strong> AKURE &#8212;</strong> &#160;The Ondo State Governorship Election Petitions Tribunal will deliver its verdict on June 4 in the series of suits challenging the election of Governor Lucky Aiyedatiwa, who emerged victorious in the last gubernatorial poll. Justice Benson Ogbu, wh&#8230;",
				          "language": "en",
				          "libraryCatalog": "Prime 9ja Online",
				          "place": "Nigeria",
				          "publicationTitle": "Prime 9ja Online",
				          "url": "https://www.prime9ja.com.ng/2025/05/tribunal-to-rule-on-ondo-poll-june-4.html",
				          "attachments": [
					          {
						          "title": "Image",
						          "mimeType": "image/jpeg"
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
	          },
	          {
	          	"type": "web",
		          "url": "https://www.prime9ja.com.ng/2025/05/davido-cfmf-review-low-burn-confession.html",
	          	"items": [
			          {
			          	"itemType": "newspaperArticle",
			          	"title": "Davido &#8211; &#8220;CFMF&#8221; Review: A Low-Burn Confession in Afro-R&B Silhouettes",
			          	"creators": [
			          		{
				          		"firstName": "Chima Joseph",
					          	"lastName": "Ugo",
						          "creatorType": "author"
					          }
			          	],
				          "date": "2025-05-27T01:11:00+01:00",
				          "ISSN": "3092-8907",
			          	"abstractNote": "On <em> &#8220;CFMF&#8221;</em>  &#8212; the fourth track from Davido&#8217;s 2025 album <em> 5ive</em>  &#8212;\n  the artist trades club-ready bravado for inward reflection. Featuring\n  songwriting contributions from DIENDE and Victony, the track is a slow,\n  measured entry in the Afro-R&amp;B lane, b&#8230;",
			          	"language": "en",
				          "libraryCatalog": "Prime 9ja Online",
			          	"place": "Nigeria",
				          "publicationTitle": "Prime 9ja Online",
				          "shortTitle": "Davido &#8211; &#8220;CFMF&#8221; Review",
			          	"url": "https://www.prime9ja.com.ng/2025/05/davido-cfmf-review-low-burn-confession.html",
			          	"attachments": [
					          {
					          	"title": "Image",
					          	"mimeType": "image/jpeg"
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
	          },
          	{
	          	"type": "web",
		          "url": "https://www.prime9ja.com.ng/2025/05/jamb-server-hack-over-20-arrested.html",
		          "items": [
		          	{
		          		"itemType": "newspaperArticle",
	          			"title": "JAMB Server Hack: Over 20 Arrested",
		          		"creators": [
			          		{
			          			"firstName": "Onuwa",
					          	"lastName": "John",
					          	"creatorType": "author"
					          }
			          	],
			          	"date": "2025-05-23T22:38:00+01:00",
			          	"ISSN": "3092-8907",
			          	"abstractNote": "<strong> ABUJA &#8212;</strong>  A major network of cybercriminals allegedly responsible for infiltrating the Computer-Based Testing (CBT) infrastructure of Nigeria&#8217;s national examinations has been dismantled, with over 20 suspects currently in custody, security officials have c&#8230;",
			          	"language": "en",
			          	"libraryCatalog": "Prime 9ja Online",
		          		"place": "Nigeria",
			          	"publicationTitle": "Prime 9ja Online",
			          	"shortTitle": "JAMB Server Hack",
		          		"url": "https://www.prime9ja.com.ng/2025/05/jamb-server-hack-over-20-arrested.html",
			          	"attachments": [
				          	{
					          	"title": "Image",
					          	"mimeType": "image/jpeg"
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
          	},
	          {
        		"type": "web",
	        	"url": "https://www.prime9ja.com.ng/2025/03/china-begins-trial-of-mrna-tb-vaccine.html",
	        	"items": [
			          {
			          	"itemType": "newspaperArticle",
			          	"title": "China Begins Trial of mRNA TB Vaccine",
	          			"creators": [
				          	{
				          		"firstName": "News Agency of",
				          		"lastName": "Nigeria",
					          	"creatorType": "author"
				          	}
				          ],
				          "date": "2025-03-24T16:58:00+01:00",
				          "ISSN": "3092-8907",
			          	"abstractNote": "A newly developed mRNA vaccine for tuberculosis, created in China, has entered clinical trials at Beijing Chest Hospital. The trial, which commenced on Monday, marks a significant step in the country&#8217;s efforts to combat tuberculosis, according to the Bei&#8230;",
			          	"language": "en",
				          "libraryCatalog": "Prime 9ja Online",
				          "place": "Nigeria",
			          	"publicationTitle": "Prime 9ja Online",
			          	"url": "https://www.prime9ja.com.ng/2025/03/china-begins-trial-of-mrna-tb-vaccine.html",
				          "attachments": [
				          	{
				          		"title": "Image",
					          	"mimeType": "image/jpeg"
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
