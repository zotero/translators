{
	"translatorID": "4fbb8dfd-459d-445e-bd2a-5ea89814b0c0",
	"label": "Perlego",
	"creator": "Brendan O'Connell",
	"target": "",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-04-12 08:05:26"
}

// example: https://github.com/zotero/translators/issues/2810
// metadata is contained in JSON-LD
// there are several good examples of translators that use JSON-LD
// step 1: build translator that captures all metadata
// step 2: sign up for free trial to test PDF attachment file saving


/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Brendan O'Connell

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
	if (url.includes('/book/')) {
		return 'book';
	}
  else if (url.includes("/browse/") || url.includes("/search?") || url.includes("/publisher/") || url.includes("/reading-list/")) {
		return "multiple";
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// TODO: this selector works well for /search?, /browse/, and /publisher/ pages, but doesn't work
  // for /reading-list/, e.g. https://www.perlego.com/reading-list/86/introduction-to-social-movements?queryID=21da233727a255f6d709ad565bddc362
  // if this div exists, then get rows from it
  // otherwise, look for whatever weird container books are in in reading-list
	var rows = doc.querySelectorAll('div.sc-bhhwZE');
  var rows = doc.querySelectorAll('a[href*="/book/"]');
	for (let row of rows) {
		var href = row.href;
		// for non-logged in users, row.href contains /null/ so user sees a 404 error instead of the book
		// remove this so we get to the correct URL
		if (href.includes("null/")) {
			href = href.replace("null/", "");
		}
		// TODO: this is only for non-logged in users. Fix for logged-in users.
		// innerText example: "Start free trial\nFoundation Mathematics\nK.A. Stroud\n2017"
		var titleArray = row.innerText.split("\n");
		// title is equal to element 1 of titleArray, e.g. "Foundation Mathematics"
		let title = titleArray[1];
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
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
  let item = new Zotero.Item('book');
  var rawJson = doc.querySelector('script[id="__NEXT_DATA__"]');
  var json = JSON.parse(rawJson.innerText);
  var metadata = json.props.pageProps.bookMetadata[0];
  Zotero.debug(metadata);
  // if there's something in the subtitle field, put it into title
  // if not, just use title
  if (metadata.subtitle) {
	  item.title = metadata.title + ": " + metadata.subtitle;
  }
  else {
	item.title = metadata.title;
  }
  item.shortTitle = metadata.title;
  item.ISBN = metadata.isbn13;
  // TODO: this works for single authors, but is there a way to get multiple authors?
  // e.g. https://www.perlego.com/book/781635/unshakeable-your-guide-to-financial-freedom-pdf
  // multiple authors are entered in a single field in JSON, unfortunately, sometimes separated by comma
	// sometimes by ampersand.
	item.creators.push(ZU.cleanAuthor(metadata.author, 'author'));
	const descriptionWithoutTags = metadata.description.replace(/<[^>]*>/g, '');
	item.abstractNote = descriptionWithoutTags;
	item.place = metadata.publication_city;
	item.edition = metadata.edition_number;
	item.publisher = metadata.publisher_name;
	item.language = metadata.language;
	// TODO: get PDF for logged-in users

  item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.perlego.com/book/781635/unshakeable-your-guide-to-financial-freedom-pdf",
		"items": [
			{
				"itemType": "book",
				"title": "Unshakeable: Your Guide to Financial Freedom",
				"creators": [
					{
						"firstName": "Tony Robbins, Peter",
						"lastName": "Mallouk",
						"creatorType": "author"
					}
				],
				"ISBN": "9781471164941",
				"abstractNote": "*THE NEW YORK TIMES BESTSELLER* Tony Robbins, arguably the most recognizable life and business strategist and guru, is back with a timely, unique follow-up to his smash New York Times bestseller Money: Master the Game. Market corrections are as constant as seasons are in nature. There have been 30 such corrections in the past 30 years, yet there's never been an action plan for how not only to survive, but thrive through each change in the stock market. Building upon the principles in Money: Master the Game, Robbins offers the reader specific steps they can implement to protect their investments while maximizing their wealth. It's a detailed guidedesigned for investors, articulated in the common-sense, practical manner that the millions of loyal Robbins fans and students have come to expect and rely upon. Few have navigated the turbulence of the stock market as adeptly and successfully as Tony Robbins. His proven, consistent success over decades makes him singularly qualified to help investors (both seasoned and first-timers alike) preserve and add to their investments. 'Tony's power is super-human' Oprah Winfrey 'He has a great gift. He has the gift to inspire' Bill Clinton 'Tony Robbins needs no introduction. He is committed to helping make life better for every investor' Carl Icahn 'The high priest of human potential. The world can't get enough of Anthony Robbins' The New York Times",
				"libraryCatalog": "Perlego",
				"publisher": "Simon & Schuster UK",
				"shortTitle": "Unshakeable",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.perlego.com/book/2997236/operations-management-an-international-perspective-pdf",
		"items": [
			{
				"itemType": "book",
				"title": "Operations Management: An International Perspective",
				"creators": [
					{
						"firstName": "David",
						"lastName": "Barnes",
						"creatorType": "author"
					}
				],
				"ISBN": "9781350305212",
				"abstractNote": "This fascinating new core textbook, authored by a highly respected academic with over a decade of industry experience, takes a global and strategic approach to the important topic of operations management (OM). Integrating contemporary and traditional theories the text covers everything a student needs to understand the reality of operations in the modern world and combines the latest cutting-edge thinking with innovative learning features. Written in a concise and engaging style and based on up-to-date research in the field, the book provides a range of international case studies and examples that help students to apply theoretical knowledge to real-world practice. This is a must-have textbook for students studying operations management modules on undergraduate, postgraduate and MBA programmes. In addition, this is an ideal textbook to accompany modules on operations strategy, production management and services management.",
				"edition": "1",
				"libraryCatalog": "Perlego",
				"publisher": "Bloomsbury Academic",
				"shortTitle": "Operations Management",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.perlego.com/book/2306297/mathematics-n1-students-book-tvet-first-pdf",
		"items": [
			{
				"itemType": "book",
				"title": "Mathematics N1 Student's Book: TVET FIRST",
				"creators": [
					{
						"firstName": "MJJ van",
						"lastName": "Rensburg",
						"creatorType": "author"
					}
				],
				"ISBN": "9781430804017",
				"abstractNote": "A top-rated series of textbooks designed to help students reach their highest potential. Easy to follow with logical sequencing and a step-by-step approach to problem-solving. Comprehensive module summaries, detailed worked examples and plenty of activities to prepare students for exams. Lots of typical exam-type questions so students understand what is expected of them. Simple defi niti ons for new terms to remove language barriers.",
				"libraryCatalog": "Perlego",
				"publisher": "Troupant",
				"shortTitle": "Mathematics N1 Student's Book",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
