{
	"translatorID": "01322929-5782-4612-81f7-d861fb46d9f2",
	"label": "Atlanta Journal-Constitution",
	"creator": "Abe Jellinek",
	"target": "^https?://(www\\.)?ajc\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-14 19:41:44"
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


function detectWeb(doc, url) {
	if (doc.querySelector('.c-articleContent')
		&& doc.querySelector('script[type="application/ld+json"]')) {
		if (url.includes('blog/')) {
			return "blogPost";
		}
		else {
			return "newspaperArticle";
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
	var rows = doc.querySelectorAll('a.gs-title');
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
	let json = JSON.parse(text(doc, 'script[type="application/ld+json"]'));

	let item = new Zotero.Item(
		url.includes('blog/')
			? 'blogPost'
			: 'newspaperArticle'
	);
	
	item.title = json.headline;
	item.abstractNote = json.description
		|| attr(doc, 'meta[name="description"]', 'content');
	item.place = extractPlace(item.abstractNote);
	
	let sectionLabel = text(doc, '.section-label');
	if (item.itemType == 'blogPost') {
		item.blogTitle = `${sectionLabel} (The Atlanta Journal-Constitution)`;
	}
	else {
		item.section = sectionLabel;
		item.publicationTitle = 'The Atlanta Journal-Constitution';
		item.ISSN = '1539-7459';
	}
	
	item.language = attr(doc, 'meta[name="language"]', 'content');
	item.libraryCatalog = 'AJC.com';
	
	for (let author of json.author.name.split(', ')) {
		item.creators.push(ZU.cleanAuthor(author, 'author'));
	}
	
	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});
	
	item.complete();
}

function extractPlace(leadText) {
	let placeRe = /^\s*([A-Z\-']{3,})\b/;
	if (placeRe.test(leadText)) {
		return ZU.capitalizeTitle(leadText.match(placeRe)[1], true);
	}
	else {
		return '';
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.ajc.com/politics/georgia-republicans-center-campaigns-on-false-claims-of-election-fraud/JNRJYNAG6BD5JC5BB2TQG3LYGA/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Georgia Republicans center campaigns on false claims of election fraud",
				"creators": [
					{
						"firstName": "Greg",
						"lastName": "Bluestein",
						"creatorType": "author"
					}
				],
				"ISSN": "1539-7459",
				"abstractNote": "ROME — The organizers at the door handed out soft-pink “Trump Won” signs to each attendee. An out-of-state radio host spouted far-right conspiracies.",
				"language": "English",
				"libraryCatalog": "AJC.com",
				"place": "Rome",
				"publicationTitle": "The Atlanta Journal-Constitution",
				"section": "Politics",
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
		"url": "https://www.ajc.com/politics/politics-blog/the-jolt-details-emerge-about-ames-barnett-possible-brian-kemp-primary-foe/MI6WFP3L7VH4NADGFHSXOUS6KM/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "The Jolt: Details emerge about Ames Barnett, possible Brian Kemp primary foe",
				"creators": [
					{
						"firstName": "Patricia",
						"lastName": "Murphy",
						"creatorType": "author"
					},
					{
						"firstName": "Greg",
						"lastName": "Bluestein",
						"creatorType": "author"
					},
					{
						"firstName": "Tia",
						"lastName": "Mitchell",
						"creatorType": "author"
					}
				],
				"abstractNote": "Ames Barnett, a wealthy businessman and former small-town mayor, is moving closer to a Republican primary challenge against Gov. Brian Kemp. But his r",
				"blogTitle": "Political Insider (The Atlanta Journal-Constitution)",
				"language": "English",
				"shortTitle": "The Jolt",
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
		"url": "https://www.ajc.com/neighborhoods/cobb/marietta-officials-homeowner-property-tax-bills-will-go-down-for-third-year-in-a-row/3AIW5PLTXRHLDCWF4Q6HYQVQKQ/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Marietta officials: Homeowner property tax bills will go down for third year in a row",
				"creators": [
					{
						"firstName": "Matt",
						"lastName": "Bruce",
						"creatorType": "author"
					}
				],
				"ISSN": "1539-7459",
				"abstractNote": "Property values have surged during the pandemic, but Marietta officials say homeowners will pay less in taxes.",
				"language": "English",
				"libraryCatalog": "AJC.com",
				"publicationTitle": "The Atlanta Journal-Constitution",
				"section": "Cobb County",
				"shortTitle": "Marietta officials",
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
		"url": "https://www.ajc.com/things-to-do/restaurant-refresh/patio-picks-treat-yourself-to-alfresco-elegance/ZF4FZUMJYBB6HJXTS32QCEYGSA/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Atlanta patio picks: Treat yourself to alfresco elegance",
				"creators": [
					{
						"firstName": "Ligaya",
						"lastName": "Figueras",
						"creatorType": "author"
					},
					{
						"firstName": "Wendell",
						"lastName": "Brock",
						"creatorType": "author"
					}
				],
				"ISSN": "1539-7459",
				"abstractNote": "Check out four of the best patios in metro Atlanta to eat and drink, including the Chastain, Delbar, Banshee and Willow Bar.",
				"language": "English",
				"libraryCatalog": "AJC.com",
				"publicationTitle": "The Atlanta Journal-Constitution",
				"section": "Restaurant Refresh",
				"shortTitle": "Atlanta patio picks",
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
		"url": "https://www.ajc.com/life/radiotvtalk-blog/whats-filming-in-georgia-in-july-2021/7UJ6NZIF7NA6LJFG7QPHE4HFDM/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "What’s filming in Georgia in July 2021?",
				"creators": [
					{
						"firstName": "Rodney",
						"lastName": "Ho",
						"creatorType": "author"
					}
				],
				"abstractNote": "\"Black Panther: Wakanda Forever\" began production in late June 2021 at Trilith Studios in Fayetteville.",
				"blogTitle": "Radio & TV Talk Blog (The Atlanta Journal-Constitution)",
				"language": "English",
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
		"url": "https://www.ajc.com/search/?q=labor",
		"items": "multiple"
	}
]
/** END TEST CASES **/
