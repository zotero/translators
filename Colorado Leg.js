{
	"translatorID": "1a615592-77b0-4715-a509-702b66196ff1",
	"label": "Colorado Leg",
	"creator": "Andrew Schwartz",
	"target": "leg.colorado.gov",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-01-21 18:06:44"
}


/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Andrew Schwartz

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
	if (url.includes('/bills/')) {
		return "bill";
	}
	else if (url.includes('/bill-search') && getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll(`header[class='search-result-single-item']>h4>a[href*="/bills/"]`);
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

function scrape(doc, url) {
	var item = new Zotero.Item("bill");

	item.title = doc.querySelector(`h1[class='node__title node-title']`).textContent;

	let billNumber = doc.querySelector(
		`div[class='field field-name-field-bill-number field-type-text field-label-hidden']`
	).textContent;
	item.billNumber = ZU.trimInternal(billNumber);

	let sponsors = doc.querySelectorAll(`div[class='sponsor-item']>div[class='member']>div[class='member-details']>h4`);

	for (var i = sponsors.length - 1; i >= 0; i--) {
		let sponsorName = ZU.trimInternal(sponsors[i].textContent);
		item.creators.push(ZU.cleanAuthor(sponsorName, "sponsor", false));
	}
	item.legislativeBody = 'Colorado General Assembly';

	item.session = doc.querySelector(`div[class='bill-session']>div>div[class='field-items']>div`).textContent;

	let tags = doc.querySelectorAll(`div[class='bill-subjects']>div>div[class=field-items]>div[class*='field-item']`);
	for (let tag of tags) {
		item.tags.push(tag.textContent);
	}

	item.complete();
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

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://leg.colorado.gov/bills/hb20-1084",
		"items": [
			{
				"itemType": "bill",
				"title": "Requirements For Dog And Cat Breeders And Sellers",
				"creators": [
					{
						"firstName": "Mike",
						"lastName": "Foote",
						"creatorType": "sponsor"
					},
					{
						"firstName": "Monica",
						"lastName": "Duran",
						"creatorType": "sponsor"
					}
				],
				"billNumber": "HB20-1084",
				"legislativeBody": "Colorado General Assembly",
				"session": "2020 Regular Session",
				"attachments": [],
				"tags": [
					{
						"tag": "Agriculture"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://leg.colorado.gov/bill-search?search_api_views_fulltext=education%20sirota&field_chamber=All&field_bill_type=All&field_sessions=64656&sort_bef_combine=search_api_relevance%20DESC",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://leg.colorado.gov/bills/hjr19-1015",
		"items": [
			{
				"itemType": "bill",
				"title": "Adjourn Sine Die",
				"creators": [
					{
						"firstName": "Stephen",
						"lastName": "Fenberg",
						"creatorType": "sponsor"
					},
					{
						"firstName": "Alec",
						"lastName": "Garnett",
						"creatorType": "sponsor"
					}
				],
				"billNumber": "HJR19-1015",
				"legislativeBody": "Colorado General Assembly",
				"session": "2019 Regular Session",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://leg.colorado.gov/bills/sb17b-001",
		"items": [
			{
				"itemType": "bill",
				"title": "Taxation Of Retail Marijuana Sales",
				"creators": [
					{
						"firstName": "Lucia",
						"lastName": "Guzman",
						"creatorType": "sponsor"
					}
				],
				"billNumber": "SB17B-001",
				"legislativeBody": "Colorado General Assembly",
				"session": "2017 Extraordinary Session",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
