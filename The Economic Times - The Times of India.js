{
	"translatorID": "1a9a7ecf-01e9-4d5d-aa19-a7aa4010da83",
	"label": "The Economic Times - The Times of India",
	"creator": "Sonali Gupta, Sebastian Karcher",
	"target": "^https?://(economictimes|timesofindia)\\.indiatimes\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-10-12 19:47:11"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017-2021 Sonali Gupta and Sebastian Karcher
	
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
	if ((url.includes("/topic/") || url.includes("articlelist")) && getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (text(doc, 'article') || attr(doc, 'meta[property="og:type"', "content") == "article") {
		return "newspaperArticle";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// topic
	var rows = ZU.xpath(doc, '//main//a[(h2 or h3) and contains(@href, "/articleshow")]');
	// articlelist
	if (!rows.length) {
		rows = ZU.xpath(doc, '//div[@class="eachStory"]/h3/a');
	}
	
	if (!rows.length) {
		rows = ZU.xpath(doc, '//li[@itemprop="itemListElement"]//div[@class="content"]/a');
	}

	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
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
			if (!items) {
				return;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var newItem = new Zotero.Item("newspaperArticle");
	newItem.url = url;
	
	if (url.includes("timesofindia.indiatimes.com")) {
		newItem.publicationTitle = "The Times of India";
		newItem.ISSN = "0971-8257";
	}
	else {
		newItem.publicationTitle = "The Economic Times";
		newItem.ISSN = "0013-0389";
	}

	// get headline
	var title = text(doc, 'h1');
	if (!title) title = ZU.xpathText(doc, '//meta[@property="og:title"]/@content').replace(/\|.+/, "").trim();
	newItem.title = title;

	// get abstract
	newItem.abstractNote = ZU.xpathText(doc, '//meta[@property="og:description"]/@content');
	
	// get date
	var date = text(doc, '.bylineBox time, .byline-content .time_cptn');
	if (date) {
		newItem.date = ZU.strToISO(date);
	}
	else {
		// ToI
		date = text(doc, 'div.byline');
		if (date) {
			newItem.date = ZU.strToISO(date);
		}
	}
	// get author or organization
	var authors = ZU.xpath(doc, '//a[@rel="author"]');
	for (let author of authors) {
		newItem.creators.push(ZU.cleanAuthor(author.textContent, "author"));
	}
	
	if (!authors.length) {
		let author = text(doc, '.bylineBox .artByline').match(/By(.+?),/);
		if (author) {
			newItem.creators.push(ZU.cleanAuthor(author[1].trim(), "author"));
		}
	}

	
	newItem.attachments = [{
		title: "Snapshot",
		document: doc
	}];
	newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://economictimes.indiatimes.com/news/economy/policy/cabinet-may-tomorrow-consider-gst-supplementary-legislations/articleshow/57716927.cms",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Cabinet may tomorrow consider GST supplementary legislations",
				"creators": [],
				"date": "2017-03-19",
				"ISSN": "0013-0389",
				"abstractNote": "Sources said the Cabinet meeting has been called for Monday morning and the agenda list may not be very long.",
				"libraryCatalog": "The Economic Times - The Times of India",
				"publicationTitle": "The Economic Times",
				"url": "https://economictimes.indiatimes.com/news/economy/policy/cabinet-may-tomorrow-consider-gst-supplementary-legislations/articleshow/57716927.cms",
				"attachments": {
					"url": "https://economictimes.indiatimes.com/news/economy/policy/cabinet-may-tomorrow-consider-gst-supplementary-legislations/articleshow/57716927.cms",
					"title": "Snapshot",
					"mimeType": "text/html"
				},
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://economictimes.indiatimes.com/news/economy/foreign-trade/vat-in-uae-will-not-affect-trade-dubai-chamber-chairman/articleshow/57671214.cms",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "VAT in UAE will not affect trade: Dubai Chamber chairman",
				"creators": [
					{
						"firstName": "Kirtika",
						"lastName": "Suneja",
						"creatorType": "author"
					}
				],
				"date": "2017-03-16",
				"ISSN": "0013-0389",
				"abstractNote": "\"The discussion is to have VAT between 4-5%. It is an excellent step to collect information, businesses' capacity and gauge their condition,\" said Al Ghurair.",
				"libraryCatalog": "The Economic Times - The Times of India",
				"publicationTitle": "The Economic Times",
				"shortTitle": "VAT in UAE will not affect trade",
				"url": "https://economictimes.indiatimes.com/news/economy/foreign-trade/vat-in-uae-will-not-affect-trade-dubai-chamber-chairman/articleshow/57671214.cms",
				"attachments": {
					"url": "https://economictimes.indiatimes.com/news/economy/foreign-trade/vat-in-uae-will-not-affect-trade-dubai-chamber-chairman/articleshow/57671214.cms",
					"title": "Snapshot",
					"mimeType": "text/html"
				},
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://economictimes.indiatimes.com/topic/nuclear",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://economictimes.indiatimes.com/news/how-to/educational-services-tax-on-coaching-centres-in-india/articleshow/86886821.cms",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Educational services: Tax on coaching centres in India",
				"creators": [
					{
						"firstName": "Ruchika",
						"lastName": "Bhagat",
						"creatorType": "author"
					}
				],
				"date": "2021-10-09",
				"ISSN": "0013-0389",
				"abstractNote": "All cash received from the coaching profession has to be deposited into a separate bank account periodically and all expenses are to be paid from the same bank account.",
				"libraryCatalog": "The Economic Times - The Times of India",
				"publicationTitle": "The Economic Times",
				"shortTitle": "Educational services",
				"url": "https://economictimes.indiatimes.com/news/how-to/educational-services-tax-on-coaching-centres-in-india/articleshow/86886821.cms",
				"attachments": {
					"url": "https://economictimes.indiatimes.com/news/how-to/educational-services-tax-on-coaching-centres-in-india/articleshow/86886821.cms",
					"title": "Snapshot",
					"mimeType": "text/html"
				},
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://timesofindia.indiatimes.com/world/china/novel-coronavirus-cannot-pass-from-mother-to-child-late-in-pregnancy-lancet-study/articleshow/74112066.cms",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Novel coronavirus cannot pass from mother to child late in pregnancy: Lancet Study",
				"creators": [],
				"date": "2020-02-13",
				"ISSN": "0971-8257",
				"abstractNote": "China News: As per a study published in The Lancet journal, the 2019 novel coronavirus disease (COVID-19) may not pass to the child in the womb during late pregna",
				"libraryCatalog": "The Economic Times - The Times of India",
				"publicationTitle": "The Times of India",
				"shortTitle": "Novel coronavirus cannot pass from mother to child late in pregnancy",
				"url": "https://timesofindia.indiatimes.com/world/china/novel-coronavirus-cannot-pass-from-mother-to-child-late-in-pregnancy-lancet-study/articleshow/74112066.cms",
				"attachments": {
					"url": "https://timesofindia.indiatimes.com/world/china/novel-coronavirus-cannot-pass-from-mother-to-child-late-in-pregnancy-lancet-study/articleshow/74112066.cms",
					"title": "Snapshot",
					"mimeType": "text/html"
				},
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://timesofindia.indiatimes.com/spotlight/an-ode-to-a-song-heres-how-you-can-fill-the-world-with-a-song-this-world-music-day/articleshow/83714933.cms",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "An ode to a song! Here’s how you can fill the world with a song this World Music Day",
				"creators": [
					{
						"firstName": "Anirban",
						"lastName": "Halder",
						"creatorType": "author"
					}
				],
				"date": "2021-06-24",
				"ISSN": "0971-8257",
				"abstractNote": "Spotlight News: Smule is a social karaoke app that is perfect if you like singing. The app allows you to sing & collaborate with people. The ethos of the platform is",
				"libraryCatalog": "The Economic Times - The Times of India",
				"publicationTitle": "The Times of India",
				"url": "https://timesofindia.indiatimes.com/spotlight/an-ode-to-a-song-heres-how-you-can-fill-the-world-with-a-song-this-world-music-day/articleshow/83714933.cms",
				"attachments": {
					"url": "https://timesofindia.indiatimes.com/spotlight/an-ode-to-a-song-heres-how-you-can-fill-the-world-with-a-song-this-world-music-day/articleshow/83714933.cms",
					"title": "Snapshot",
					"mimeType": "text/html"
				},
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://timesofindia.indiatimes.com/topic/tesla",
		"items": "multiple"
	}
]
/** END TEST CASES **/
