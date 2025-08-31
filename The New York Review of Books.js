{
	"translatorID": "4c164cc8-be7b-4d02-bfbf-37a5622dfd56",
	"label": "The New York Review of Books",
	"creator": "Philipp Zumstein",
	"target": "^https?://www\\.nybooks\\.com/",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-08-03 11:23:30"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Philipp Zumstein and contributors
	
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
	let path = new URL(url).pathname;
	if (/^\/articles\//.test(path)) {
		return "magazineArticle";
	}
	if (/^\/(online|daily)\//.test(path)) {
		return "blogPost";
	}

	if (/^\/search\//.test(path)) { // search page
		let searchResultRoot = doc.querySelector("#root");
		if (searchResultRoot) {
			Z.monitorDOMChanges(searchResultRoot);
		}
	}

	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll(".container .row, .sui-result");
	for (let row of rows) {
		let href = attr(row, "h4 > a, .sui-result__title-link", "href");
		let title = ZU.trimInternal(text(row, "h4 > a, .sui-result__title-link"));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		// Do a bit of disambiguition using author names; try this:
		// https://www.nybooks.com/search?q=star
		let author = ZU.trimInternal(text(row, "div:first-child"));
		items[href] = author ? `${title} (${author.slice(0, 40).trim()})` : title;
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
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	var type = detectWeb(doc, url);
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');

	// Work around the synchronicity restruction of handler callback;
	// Do necessary computation involving async function out of the callback.
	// Date; also useful for retrieving volume and number
	let dateArray = urlToDateArray(url);

	// Get { volume, issue } from the article's issue page asynchronously
	let itemStub;
	if (type === "magazineArticle" && dateArray) {
		itemStub = await getIssue(dateArray);
	}

	translator.setHandler('itemDone', function (obj, item) {
		item.publicationTitle = "The New York Review of Books";
		Object.assign(item, itemStub); // absorb volume/number info

		if (type == "magazineArticle") {
			item.ISSN = "0028-7504";
		}

		if (!item.date && dateArray) {
			item.date = dateArray.join("-");
		}

		// Remove noise trailing the "pipe" character
		let cleanTitle = text(doc, "header.article-header h1");
		if (!cleanTitle) {
			cleanTitle = item.title.split("|")[0].trim();
		}
		item.title = cleanTitle || item.title;

		// Remove author of editorials
		if (item.creators && item.creators.length === 1) {
			let authorString = creatorToString(item.creators[0]);
			if (authorString.toLowerCase() === "the editors") {
				item.creators = [];
			}
		}

		// Find any translators and fix their type (the EM doesn't mark them as
		// translators)
		let authorByline = ZU.trimInternal(text(doc, "header .author"));
		// Split off any ", translated by ..."
		let maybeTranslator = authorByline.split(/\btranslat\S+\s+by\s+/i)[1];
		if (maybeTranslator) {
			// Iterate over creators and check if the full name appears in the
			// "translated by ..." part
			for (let author of item.creators) {
				let authorString = creatorToString(author);
				if (maybeTranslator.includes(authorString)) {
					author.creatorType = "translator";
				}
			}
		}

		// Add reviewed authors (only for "author" authors, not including
		// works without leading author but having editor/translator)
		let reviewed = doc.querySelectorAll(".review-items .attribution");
		for (let bylineElem of reviewed) {
			let byline = ZU.trimInternal(bylineElem.textContent.trim());
			for (let author of cleanReviewedByline(byline)) {
				item.creators.push(ZU.cleanAuthor(author, "reviewedAuthor"));
			}
		}

		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = type;
	await em.doWeb(doc, url);
}

// Parse URL path and extract the year, month, and day as array.
function urlToDateArray(url) {
	let path = new URL(url).pathname;
	let m = path.match(/\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//); // yyyy mm dd
	return m && [m[1], m[2], m[3]];
}

// Given the date-array of the issue, find the volume and number by requesting
// the issue's page and parse the metadata. This function is memoized.
var ISSUE_CACHE = {};
async function getIssue(dateArray) {
	let key = dateArray.join("/");
	if (ISSUE_CACHE[key]) {
		return ISSUE_CACHE[key];
	}
	let issueURL = `https://www.nybooks.com/issues/${key}/`;
	let issuePageDoc = await requestDocument(issueURL);

	// Use LD-JSON to retrieve the breadcrumb containing volume / issue info
	let linkedData = text(issuePageDoc, "script[type='application/ld+json']");
	if (linkedData) {
		let issueInfo = JSON.parse(linkedData);
		let breadcrumbs = issueInfo["@graph"].filter(x => x["@type"] === "BreadcrumbList");
		if (breadcrumbs.length) {
			breadcrumbs = breadcrumbs[0].itemListElement || [];
		}
		for (let bcItem of breadcrumbs) {
			let m = bcItem.name.match(/^volume (\d+), (?:issue|number) (\d+)/i);
			if (m) {
				let result = { volume: m[1], issue: m[2] };
				ISSUE_CACHE[key] = result;
				return result;
			}
		}
	}
	return null;
}

// Turn creator object to string in "First Last"
function creatorToString(creator) {
	return [creator.firstName, creator.lastName].filter(Boolean).join(" ");
}

// For any single attribution line of the work being reviewed, return the name
// of authors (excluding translators, editors, etc.)
function cleanReviewedByline(byline) {
	let authors = [];
	let m = byline.match(/^by\s+(.+)/i);

	if (!m) { // complex byline, without first "author"; ignore
		return authors;
	}

	byline = m[1]; // remove leading "by"
	for (let item of byline.split(/(,|\band\b)/)) {
		item = item.trim();
		if (item.startsWith("translat")) {
			break;
		}
		if (item && item !== "," && item !== "and") {
			authors.push(item);
		}
	}
	return authors;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.nybooks.com/articles/2011/12/08/zuccotti-park-what-future/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Zuccotti Park: What Future?",
				"creators": [
					{
						"firstName": "Michael",
						"lastName": "Greenberg",
						"creatorType": "author"
					}
				],
				"date": "2011-12-08",
				"ISSN": "0028-7504",
				"abstractNote": "For weeks, organizers had demonstrated enormous skill in keeping the occupation going, steadily expanding while outfoxing Mayor Bloomberg in his attempts to evict them. But what end did it serve if their status as ethical defenders of the 99 percent was being damaged? It was, after all, their major asset. The complicated logistics of holding the park (and providing food, clothing, and warmth for a floating army of hundreds) was draining resources and forcing the most talented activists to narrow their focus to matters of mere physical survival.",
				"issue": "19",
				"language": "en",
				"libraryCatalog": "www.nybooks.com",
				"publicationTitle": "The New York Review of Books",
				"shortTitle": "Zuccotti Park",
				"url": "https://www.nybooks.com/articles/2011/12/08/zuccotti-park-what-future/",
				"volume": "58",
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
		"url": "https://www.nybooks.com/search/?q=labor+union",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.nybooks.com/online/2011/11/16/americas-new-robber-barons/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "America’s New Robber Barons",
				"creators": [
					{
						"firstName": "Jeff",
						"lastName": "Madrick",
						"creatorType": "author"
					}
				],
				"date": "2011-11-16",
				"abstractNote": "With early Tuesday’s abrupt evacuation of Zuccotti Park, the City of New York has managed—for the moment—to dislodge protesters from Wall Street. But it will be much harder to turn attention away from the financial excesses of the very rich—the problems that have given Occupy Wall Street such traction. Data on who is in the top 1 percent of earners further reinforces their point. Here's why.  Though the situation is often described as a problem of inequality, this is not quite the real concern. The issue is runaway incomes at the very top—people earning a million and a half dollars or more according to the most recent data. And much of that runaway income comes from financial investments, stock options, and other special financial benefits available to the exceptionally rich—much of which is taxed at very low capital gains rates. Meanwhile, there has been something closer to stagnation for almost everyone else—including even for many people in the top 20 percent of earners.",
				"blogTitle": "The New York Review of Books",
				"language": "en",
				"url": "https://www.nybooks.com/online/2011/11/16/americas-new-robber-barons/",
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
		"url": "http://www.nybooks.com/issues/2012/03/22/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.nybooks.com/articles/1983/12/08/the-second-death-of-peron/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "The Second Death of Perón?",
				"creators": [
					{
						"firstName": "Robert",
						"lastName": "Cox",
						"creatorType": "author"
					},
					{
						"firstName": "Joseph A.",
						"lastName": "Page",
						"creatorType": "reviewedAuthor"
					},
					{
						"firstName": "Lars",
						"lastName": "Schoultz",
						"creatorType": "reviewedAuthor"
					}
				],
				"date": "1983-12-08",
				"ISSN": "0028-7504",
				"abstractNote": "Perón, Perón, how great you are. My general, how much you're worth! As the chorus of the Peronist marching song \"The Peronist Boys\" suggests, there was",
				"issue": "19",
				"language": "en",
				"libraryCatalog": "www.nybooks.com",
				"publicationTitle": "The New York Review of Books",
				"url": "https://www.nybooks.com/articles/1983/12/08/the-second-death-of-peron/",
				"volume": "30",
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
		"url": "https://www.nybooks.com/articles/1983/12/22/double-trouble/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Double Trouble",
				"creators": [
					{
						"firstName": "David",
						"lastName": "Bellos",
						"creatorType": "translator"
					},
					{
						"firstName": "Emmanuel Le Roy",
						"lastName": "Ladurie",
						"creatorType": "author"
					},
					{
						"firstName": "Natalie Zemon",
						"lastName": "Davis",
						"creatorType": "reviewedAuthor"
					}
				],
				"date": "1983-12-22",
				"ISSN": "0028-7504",
				"abstractNote": "The biographies of peasants and especially the autobiographies of country people are a longstanding problem. We owe to the habits of Protestant",
				"issue": "20",
				"language": "en",
				"libraryCatalog": "www.nybooks.com",
				"publicationTitle": "The New York Review of Books",
				"url": "https://www.nybooks.com/articles/1983/12/22/double-trouble/",
				"volume": "30",
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
		"url": "https://www.nybooks.com/articles/2015/02/05/putins-kleptocracy/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "‘Putin’s Kleptocracy’",
				"creators": [],
				"date": "2015-02-05",
				"ISSN": "0028-7504",
				"abstractNote": "Lucy Komisar has written to us that she has a statement to make about the article by Anne Applebaum, “How He and His Cronies Stole Russia,” in our",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "www.nybooks.com",
				"publicationTitle": "The New York Review of Books",
				"url": "https://www.nybooks.com/articles/2015/02/05/putins-kleptocracy/",
				"volume": "62",
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
		"url": "https://www.nybooks.com/online/2012/12/15/our-moloch/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Our Moloch",
				"creators": [
					{
						"firstName": "Garry",
						"lastName": "Wills",
						"creatorType": "author"
					}
				],
				"date": "2012-12-15",
				"abstractNote": "The gun is our Moloch. We sacrifice children to him daily—sometimes, as at Sandy Hook, by directly throwing them into the fire-hose of bullets from our protected private killing machines, sometimes by blighting our children’s lives by the death of a parent, a schoolmate, a teacher, a protector. The gun is not a mere tool, a bit of technology, a political issue, a point of debate. It is an object of reverence.",
				"blogTitle": "The New York Review of Books",
				"language": "en",
				"url": "https://www.nybooks.com/online/2012/12/15/our-moloch/",
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
