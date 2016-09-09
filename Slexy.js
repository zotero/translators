{
	"translatorID": "3a4c6510-8082-4c99-9fa4-458a9cb29795",
	"label": "Slexy",
	"creator": "febrezo",
	"target": "^https?://slexy\\.org/view/.+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-09-03 18:33:28"
}

/*
	Slexy Translator
	Copyright (C) 2016 Félix Brezo, felixbrezo@gmail.com
	
	This program is free software: you can redistribute it and/or modify
	it under the terms of the Affero GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.
	
	You should have received a copy of the Affero GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

function detectWeb(doc, url) {
	return "webpage";
}

function doWeb(doc, url) {
    // Creating Date object for current location
	var resourceType = detectWeb(doc, url);

	// Creating the item
	var newItem = new Zotero.Item(resourceType);

	//Setting common data:
	newItem.websiteTitle = "Slexy";
	newItem.websiteType = "Paste Site";
	newItem.url = url;
	
	// Grabbing paste's metadata from "data" object
	var info = ZU.xpathText(doc, '//table[@id="data"]//b').split(',');	
	// Author
	newItem.creators = [Zotero.Utilities.cleanAuthor(info[0], "author", false)];
	newItem.title = info[2];
	// Date: we will need some extra processign for the date
	var aux = info[3];
	var strDate = aux.substring(1,aux.lastIndexOf(" "));
	var utc0Time = new Date(strDate);
	// Getting offset from metadata
	var offset = parseInt(aux.substring(aux.lastIndexOf(" ")))/100;
	// Getting the timezone offset from local time in minutes
	var tzDifference = -(offset * 60 + utc0Time.getTimezoneOffset());
	// Converting the offset to milliseconds, and adding it to utc0Time to make the new Date
	var postingTime = new Date(utc0Time.getTime() + tzDifference * 60 * 1000);	
	newItem.date = postingTime.toString();
	
	// Adding the attachment
	newItem.attachments.push({
		title: "Slexy Snapshot",
		mimeType: "text/html",
		url: url
	});	
	
	newItem.complete();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://pastebin.com/u/febrezo",
		"items": [
			{
				"itemType": "webpage",
				"title": "Febrezo's Pastebin",
				"creators": [
					{
						"firstName": "",
						"lastName": "febrezo",
						"creatorType": "author"
					}
				],
				"url": "http://pastebin.com/u/febrezo",
				"websiteTitle": "Pastebin.com",
				"websiteType": "profile",
				"attachments": [
					{
						"title": "Febrezo's Pastebin",
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
		"url": "http://pastebin.com/FuzVdRiJ",
		"items": [
			{
				"itemType": "webpage",
				"title": "Bash, basic parameters processing",
				"creators": [
					{
						"firstName": "",
						"lastName": "febrezo",
						"creatorType": "author"
					}
				],
				"date": "Sunday 27th of May 2012 11:01:02 AM CDT",
				"url": "http://pastebin.com/FuzVdRiJ",
				"websiteTitle": "Pastebin.com",
				"websiteType": "paste",
				"attachments": [
					{
						"title": "Bash, basic parameters processing",
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
		"url": "http://pastebin.com/cCkDi5ZA",
		"items": [
			{
				"itemType": "webpage",
				"title": "Untitled",
				"creators": [],
				"date": "Saturday 3rd of September 2016 02:59:22 AM CDT",
				"url": "http://pastebin.com/cCkDi5ZA",
				"websiteTitle": "Pastebin.com",
				"websiteType": "paste",
				"attachments": [
					{
						"title": "Pastebin Snapshot",
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
		"url": "http://pastebin.com/trends",
		"items": [
			{
				"itemType": "webpage",
				"title": "Trending Pastes at Pastebin.com",
				"creators": [],
				"url": "http://pastebin.com/trends",
				"websiteTitle": "Pastebin.com",
				"websiteType": "Paste Site",
				"attachments": [
					{
						"title": "Pastebin Snapshot",
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
