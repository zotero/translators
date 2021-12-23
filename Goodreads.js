{
	"translatorID": "c3ecf413-ddd6-4d98-86e2-f63054bd2cc8",
	"label": "Goodreads",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.goodreads\\.com/(book/show/|search\\?)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-07 18:32:10"
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
	if (url.includes('/book/show/') && doc.querySelector('meta[property="books:isbn"]')) {
		return "book";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('tr a.bookTitle');
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

function scrape(doc, _url) {
	let ISBN = ZU.cleanISBN(attr(doc, 'meta[property="books:isbn"]', 'content'));
	
	// adapted from Amazon translator
	let search = Zotero.loadTranslator('search');
	
	search.setHandler('translators', function (_, translators) {
		search.setTranslator(translators);
		search.setHandler("itemDone", function (_, item) {
			Z.debug(`Found metadata in ${item.libraryCatalog}`);
			item.url = '';
			item.complete();
		});
		search.translate();
	});
	
	Z.debug(`Searching by ISBN: ${ISBN}`);
	search.setSearch({ ISBN });
	search.getTranslators();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.goodreads.com/book/show/18467746-the-norm-chronicles",
		"items": [
			{
				"itemType": "book",
				"title": "The Norm chronicles: stories and numbers about danger and death",
				"creators": [
					{
						"firstName": "Michael",
						"lastName": "Blastland",
						"creatorType": "author"
					},
					{
						"firstName": "D. J.",
						"lastName": "Spiegelhalter",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"ISBN": "9780465085705",
				"callNumber": "HM1101 .B53 2014",
				"libraryCatalog": "Library of Congress ISBN",
				"numPages": "358",
				"place": "New York",
				"publisher": "Basic Books, A Member of the Perseus Books Group",
				"shortTitle": "The Norm chronicles",
				"attachments": [],
				"tags": [
					{
						"tag": "Accidents"
					},
					{
						"tag": "BUSINESS & ECONOMICS / Statistics"
					},
					{
						"tag": "Disasters"
					},
					{
						"tag": "MATHEMATICS / Probability & Statistics / General"
					},
					{
						"tag": "Risk"
					},
					{
						"tag": "SCIENCE / Applied Sciences"
					},
					{
						"tag": "Sociological aspects"
					},
					{
						"tag": "Statistics"
					},
					{
						"tag": "Statistics"
					},
					{
						"tag": "Statistics"
					},
					{
						"tag": "Violent deaths"
					}
				],
				"notes": [
					{
						"note": "\"Is it safer to fly or take the train? How dangerous is skydiving? And is eating that extra sausage going to kill you? We've all heard the statistics for risky activities, but what do they mean in the real world? In The Norm Chronicles, journalist Michael Blastland and risk expert David Spiegelhalter explore these questions through the stories of average Norm and an ingenious measurement called the MicroMort-a one in a million chance of dying. They reveal why general anesthesia is as dangerous as a parachute jump, giving birth in the US is nearly twice as risky as in the UK, and that the radiation from eating a banana shaves 3 seconds off your life. An entertaining guide to the statistics of personal risk, The Norm Chronicles will enlighten anyone who has ever worried about the dangers we encounter in our daily lives\"-- \"Is it safer to fly or take the train? How dangerous is skydiving? And is eating that extra link of breakfast sausage going to kill you? We've all heard the statistics for risky activities, but what do those numbers actually mean in the real world? In The Norm Chronicles, journalist Michael Blastland and risk expert David Spiegelhalter answer these questions--and far more--in a commonsense (and wildly entertaining) guide to personal risk. Through the adventures of the perfectly average Norm, his friends careful Prudence and the reckless Kelvin brothers, and an ingenious measurement called the MicroMort--essentially, a one in a million chance of dying--Blastland and Spiegelhalter show us how to think about risk in the choices we make every day\"--"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.goodreads.com/book/show/13335037-divergent",
		"items": [
			{
				"itemType": "book",
				"title": "Divergent",
				"creators": [
					{
						"firstName": "Veronica",
						"lastName": "Roth",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"ISBN": "9780062024039 9780062289858 9780606238403",
				"abstractNote": "In a future Chicago, sixteen-year-old Beatrice Prior must choose among five predetermined factions to define her identity for the rest of her life, a decision made more difficult when she discovers that she is an anomaly who does not fit into any one group, and that the society she lives in is not perfect after all",
				"edition": "1st paperback ed",
				"language": "eng",
				"libraryCatalog": "K10plus ISBN",
				"numPages": "487",
				"place": "New York, New York",
				"publisher": "Katherine Tegen Books",
				"series": "Divergent",
				"seriesNumber": "bk. 1",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "Reprint of the hardcover edition published in 2011 by Katherine Tegen Books. - \"Bonus materials include: Author Q & A ; Discussion guide ; Divergent playlist ; Faction manifestos ; Quiz questions ; Writing tips and a sneak peek of Insurgent!\"--Page 4 of cover 700, Lexile"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.goodreads.com/search?q=test&qid=",
		"items": "multiple"
	}
]
/** END TEST CASES **/
