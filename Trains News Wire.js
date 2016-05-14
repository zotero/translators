{
	"translatorID": "3f4f0a1c-f542-4b44-8824-40ee1f921373",
	"label": "Trains News Wire",
	"creator": "Charles Fulton",
	"target": "https?://trn.trains.com/news/news-wire/[0-9]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-05-14 13:33:45"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2016 Charles Fulton

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
	return "blogPost";
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	newItem = new Zotero.Item("blogPost");
	newItem.url = doc.location.href;
	newItem.publicationTitle = "Trains News Wire";

	var titleattr = ZU.xpathText(doc, '//title');
	var titleparts = titleattr.split('|');
	newItem.title = titleparts[0].trim();

	var publishdate = ZU.xpathText(doc, '//span[@class="publishDate"]');
	if(publishdate.indexOf('|') == -1) {
		newItem.date = publishdate;
	} else {
		var dateparts = publishdate.split('|');
		newItem.date = dateparts[1].trim();
	}

	var authors = ZU.xpathText(doc, '//div[@class="byline"]//a')
	if(authors) {
		newItem.creators.push(Zotero.Utilities.cleanAuthor(authors, "author"));
	}

	newItem.attachments = [{
		document: doc,
		title: "Trains News Wire snapshot",
		mimeType: "text/html"
	}];

	newItem.complete();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://trn.trains.com/news/news-wire/2016/05/11-heart-of-texas",
		"items": [
			{
				"itemType": "blogPost",
				"title": "OmniTRAX buys Heart of Texas",
				"creators": [],
				"date": "May 11, 2016",
				"blogTitle": "Trains News Wire",
				"url": "http://trn.trains.com/news/news-wire/2016/05/11-heart-of-texas",
				"attachments": [
					{
						"title": "Trains News Wire snapshot",
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
		"url": "http://trn.trains.com/news/news-wire/2016/05/10-nippon-sharyo",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Midwest passenger car project may have to pay back millions to Feds",
				"creators": [
					{
						"firstName": "Kevin P.",
						"lastName": "Keefe",
						"creatorType": "author"
					}
				],
				"date": "May 10, 2016",
				"blogTitle": "Trains News Wire",
				"url": "http://trn.trains.com/news/news-wire/2016/05/10-nippon-sharyo",
				"attachments": [
					{
						"title": "Trains News Wire snapshot",
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
