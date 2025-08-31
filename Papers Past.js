{
	"translatorID": "1b052690-16dd-431d-9828-9dc675eb55f6",
	"label": "Papers Past",
	"creator": "Philipp Zumstein and Abe Jellinek",
	"target": "^https?://(www\\.)?paperspast\\.natlib\\.govt\\.nz/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-12 17:17:15"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017-2021 Philipp Zumstein and Abe Jellinek

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
	if (/[?&]query=/.test(url) && getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (ZU.xpathText(doc, '//h3[@itemprop="headline"]')) {
		if (url.includes('/newspapers/')) {
			return "newspaperArticle";
		}
		if (url.includes('/periodicals/')) {
			return "journalArticle";
		}
		if (url.includes('/manuscripts/')) {
			return "letter";
		}
		if (url.includes('/parliamentary/')) {
			return "report";
		}
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.search-results .article-preview__title a');
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
	var type = detectWeb(doc, url);
	var item = new Zotero.Item(type);
	var title = ZU.xpathText(doc, '//h3[@itemprop="headline"]/text()[1]');
	item.title = ZU.capitalizeTitle(title.toLowerCase(), true);
	
	if (type == "journalArticle" || type == "newspaperArticle") {
		var nav = doc.querySelectorAll('#breadcrumbs .breadcrumbs__crumb');
		if (nav.length > 1) {
			item.publicationTitle = nav[1].textContent;
		}
		if (nav.length > 2) {
			item.date = ZU.strToISO(nav[2].textContent);
		}
		if (nav.length > 3) {
			item.pages = nav[3].textContent.match(/\d+/)[0];
		}
	}
	
	var container = ZU.xpathText(doc, '//h3[@itemprop="headline"]/small');
	if (container) {
		var volume = container.match(/Volume (\w+)\b/);
		if (volume) {
			item.volume = volume[1];
		}
		var issue = container.match(/Issue (\w+)\b/);
		if (issue) {
			item.issue = issue[1];
		}
	}
	
	if (type == "letter") {
		var author = ZU.xpathText(doc, '//div[@id="researcher-tools-tab"]//tr[td[.="Author"]]/td[2]');
		// e.g. 42319/Mackay, James, 1831-1912
		if (author && !author.includes("Unknown")) {
			author = author.replace(/^[0-9/]*/, '').replace(/[0-9-]*$/, '').replace('(Sir)', '');
			item.creators.push(ZU.cleanAuthor(author, "author"));
		}
		var recipient = ZU.xpathText(doc, '//div[@id="researcher-tools-tab"]//tr[td[.="Recipient"]]/td[2]');
		if (recipient && !recipient.includes("Unknown")) {
			recipient = recipient.replace(/^[0-9/]*/, '').replace(/[0-9-]*$/, '').replace('(Sir)', '');
			item.creators.push(ZU.cleanAuthor(recipient, "recipient"));
		}
		
		item.date = ZU.xpathText(doc, '//div[@id="researcher-tools-tab"]//tr[td[.="Date"]]/td[2]');
		
		item.language = ZU.xpathText(doc, '//div[@id="researcher-tools-tab"]//tr[td[.="Language"]]/td[2]');
	}
	
	item.abstractNote = text(doc, '#tab-english');

	item.url = ZU.xpathText(doc, '//div[@id="researcher-tools-tab"]/input/@value');
	if (!item.url) item.url = text('#researcher-tools-tab p');
	if (!item.url || !item.url.startsWith('http')) item.url = url;
	
	item.attachments.push({
		title: "Snapshot",
		document: doc
	});
	
	let imagePageURL = attr(doc, '.imagecontainer a', 'href');
	if (imagePageURL) {
		ZU.processDocuments(imagePageURL, function (imageDoc) {
			item.attachments.push({
				title: 'Image',
				mimeType: 'image/jpeg',
				url: attr(imageDoc, '.imagecontainer img', 'src')
			});
			item.complete();
		});
	}
	else {
		item.complete();
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://paperspast.natlib.govt.nz/newspapers?items_per_page=10&snippet=true&query=argentina",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://paperspast.natlib.govt.nz/newspapers/EP19440218.2.61",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Coup in Argentina",
				"creators": [],
				"date": "1944-02-18",
				"libraryCatalog": "Papers Past",
				"pages": "5",
				"publicationTitle": "Evening Post",
				"url": "https://paperspast.natlib.govt.nz/newspapers/EP19440218.2.61",
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
		"url": "https://paperspast.natlib.govt.nz/newspapers/NZH19360721.2.73.1?query=argentina",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "La Argentina",
				"creators": [],
				"date": "1936-07-21",
				"libraryCatalog": "Papers Past",
				"pages": "9",
				"publicationTitle": "New Zealand Herald",
				"url": "https://paperspast.natlib.govt.nz/newspapers/NZH19360721.2.73.1",
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
		"url": "https://paperspast.natlib.govt.nz/periodicals/FRERE18831101.2.2",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "\"The Law Within the Law.\"",
				"creators": [],
				"date": "1883-11-01",
				"issue": "2",
				"libraryCatalog": "Papers Past",
				"pages": "3",
				"publicationTitle": "Freethought Review",
				"url": "https://paperspast.natlib.govt.nz/periodicals/FRERE18831101.2.2",
				"volume": "I",
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
		"url": "https://paperspast.natlib.govt.nz/manuscripts/MCLEAN-1024774.2.1",
		"items": [
			{
				"itemType": "letter",
				"title": "1 Page Written 19 Jun 1873 by James Mackay in Hamilton City to Sir Donald Mclean in Wellington",
				"creators": [
					{
						"firstName": "Mackay",
						"lastName": "James",
						"creatorType": "author"
					},
					{
						"firstName": "McLean",
						"lastName": "Donald",
						"creatorType": "recipient"
					}
				],
				"date": "1873-06-19",
				"abstractNote": "(For His Excellency's information)\n(Signed) Donald McLean\n19th. June 1873\n\n\nNEW ZEALAND TELEGRAPH.\nHamilton\nTo:- Hon. D. McLean \nWellington\n18th. June 1873\nNo news to-day from anywhere I am waiting arrival of Dr. Pollen here this evening. General feeling in Waikato is calming down. The establishments of the Outposts has given confidence against attack and the settlers are quietly attending to their usual business. I do not think many anticipate an agressive movement by the King Party. It, however, the almost unanimous opinion that the murderers of Sullivan should be taken at any cost, no one believes the murderers will be given up for reward.\n(Signed) \nJames Mackay Jnr.",
				"language": "English",
				"libraryCatalog": "Papers Past",
				"url": "https://paperspast.natlib.govt.nz/manuscripts/MCLEAN-1024774.2.1",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Image",
						"mimeType": "image/jpeg"
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
