{
	"translatorID": "f16f8542-9038-492d-8669-7ffe40869294",
	"label": "Current Affairs",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.currentaffairs\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-07 00:42:35"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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
	if (doc.querySelector('h1.title') && doc.querySelector('.primary')) {
		return "magazineArticle";
	}
	// search just redirects to DuckDuckGo
	return false;
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	let item = new Zotero.Item('magazineArticle');
	
	item.title = text(doc, 'h1.title');
	item.abstractNote = ZU.cleanTags(attr(doc, 'meta[name="description"]', 'content'));
	item.publicationTitle = 'Current Affairs';
	item.issue = attr(doc, '#wpIssueName', 'value');
	item.date = ZU.strToISO(text(doc, '.dateline span'));
	item.language = 'en';
	item.ISSN = '2471-2647';
	item.url = url.replace(/[#?].*$/, '');
	
	for (let byline of doc.querySelectorAll('.primary .bylines li')) {
		item.creators.push(ZU.cleanAuthor(byline.innerText, 'author'));
	}
	
	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.currentaffairs.org/2021/08/taming-the-greedocracy",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Taming The Greedocracy",
				"creators": [
					{
						"firstName": "Jag",
						"lastName": "Bhalla",
						"creatorType": "author"
					}
				],
				"date": "2021-08-04",
				"ISSN": "2471-2647",
				"abstractNote": "American elites want magical technological fixes to climate change because they refuse to confront the truth that seriously addressing the problem would require limits to their own power and luxury.",
				"issue": "July/Aug 2021",
				"language": "en",
				"libraryCatalog": "Current Affairs",
				"publicationTitle": "Current Affairs",
				"url": "https://www.currentaffairs.org/2021/08/taming-the-greedocracy",
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
		"url": "https://www.currentaffairs.org/2021/08/tenant-organizing-in-washington-d-c-and-beyond",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Tenant Organizing in Washington D.C. and Beyond",
				"creators": [
					{
						"firstName": "Amanda",
						"lastName": "Huron",
						"creatorType": "author"
					},
					{
						"firstName": "Amanda",
						"lastName": "Korber",
						"creatorType": "author"
					},
					{
						"firstName": "Rob",
						"lastName": "Wohl",
						"creatorType": "author"
					},
					{
						"firstName": "Vanessa A.",
						"lastName": "Bee",
						"creatorType": "author"
					}
				],
				"date": "2021-08-05",
				"ISSN": "2471-2647",
				"abstractNote": "Despite the eviction moratorium, the housing crisis is still severe. This interview, originally from August 2019, explains several ways that tenants can successfully fight their landlords.",
				"language": "en",
				"libraryCatalog": "Current Affairs",
				"publicationTitle": "Current Affairs",
				"url": "https://www.currentaffairs.org/2021/08/tenant-organizing-in-washington-d-c-and-beyond",
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
