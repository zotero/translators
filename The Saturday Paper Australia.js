{
	"translatorID": "051797f9-02fa-4ca4-bd33-ddfa68114aed",
	"label": "The Saturday Paper Australia",
	"creator": "Justin Warren",
	"target": "https?://(www\\.)?thesaturdaypaper\\.com\\.au/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-08-05 00:33:09"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Justin Warren

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
	var articlePageTitle = doc.querySelector('div.content > div > div.article-page > div.article-page__header > h1')
	if ( articlePageTitle ) {
		return 'newspaperArticle';
	}

	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('div.article');
	for (let row of rows) {
		// TODO: check and maybe adjust
		let href = row.href;
		// TODO: check and maybe adjust
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			scrape(requestDocument(url));
		}
	}
	else if (detectWeb(doc, url)) {
		scrape(doc, url);
	}
}

function scrape(doc, url = doc.location.href) {
	let item = new Zotero.Item('newspaperArticle');
	item.publicationTitle = "The Saturday Paper";
	item.title = attr(doc, 'meta[name="dcterms.title"]', 'content');
	item.date = ZU.strToISO(attr(doc, 'meta[name="dcterms.date"]', 'content'));
	item.abstract = attr(doc, 'meta[name="dcterms.description"]', 'content');
	item.creators.push(ZU.cleanAuthor(attr(doc, 'meta[name="dcterms.creator"]', 'content'),"author"));
	item.language = "en-AU";
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.thesaturdaypaper.com.au/comment/topic/2023/08/05/morrisons-strong-welfare-cop-out",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Morrison’s strong welfare cop-out",
				"creators": [
					{
						"firstName": "Paul",
						"lastName": "Bongiorno",
						"creatorType": "author"
					}
				],
				"date": "2023-08-05",
				"language": "en-AU",
				"libraryCatalog": "The Saturday Paper Australia",
				"publicationTitle": "The Saturday Paper",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.thesaturdaypaper.com.au/life/environment/2023/07/01/underwater-sculptures-preserving-the-great-barrier-reef",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Underwater sculptures preserving the Great Barrier Reef",
				"creators": [
					{
						"firstName": "Mark",
						"lastName": "Dapin",
						"creatorType": "author"
					}
				],
				"date": "2023-07-01",
				"language": "en-AU",
				"libraryCatalog": "The Saturday Paper Australia",
				"publicationTitle": "The Saturday Paper",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.thesaturdaypaper.com.au/culture/the-influence/2023/08/03/laura-woollett",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Laura Woollett",
				"creators": [
					{
						"firstName": "Neha",
						"lastName": "Kale",
						"creatorType": "author"
					}
				],
				"date": "2023-08-05",
				"language": "en-AU",
				"libraryCatalog": "The Saturday Paper Australia",
				"publicationTitle": "The Saturday Paper",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.thesaturdaypaper.com.au/news/education/2023/08/05/exclusive-unsw-referred-icac",
		"detectedItemType": "newspaperArticle",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Exclusive: UNSW referred to ICAC",
				"creators": [
					{
						"firstName": "Rick",
						"lastName": "Morton",
						"creatorType": "author"
					}
				],
				"date": "2023-08-05",
				"language": "en-AU",
				"libraryCatalog": "The Saturday Paper Australia",
				"publicationTitle": "The Saturday Paper",
				"shortTitle": "Exclusive",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.thesaturdaypaper.com.au/sport/soccer/2023/06/17/emily-van-egmonds-high-hopes-the-world-cup#hrd",
		"detectedItemType": "newspaperArticle",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Emily van Egmond’s high hopes for the World Cup",
				"creators": [
					{
						"firstName": "Sarah",
						"lastName": "Krasnostein",
						"creatorType": "author"
					}
				],
				"date": "2023-06-17",
				"language": "en-AU",
				"libraryCatalog": "The Saturday Paper Australia",
				"publicationTitle": "The Saturday Paper",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
