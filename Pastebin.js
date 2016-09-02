{
	"translatorID": "1d1a51d4-60bf-44b8-ae28-8b154d1ed721",
	"label": "Pastebin",
	"creator": "febrezo",
	"target": "https?://(www.)?pastebin.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 1,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-09-02 19:15:59"
}

/*
	Pastebin Translator
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
	Zotero.debug("Starting detectWeb...");
	return "webpage";
}

// Detecting the type of URL
function getType(url) {
	if ( url.indexOf('/u/')>-1 ) {
		Zotero.debug("This is a profile...");
		return "profile";
	} else  	{
		Zotero.debug("This is a paste");
		return "paste";
	} 
}

// More item types available at: <http://gsl-nagoya-u.net/http/pub/csl-fields/index.html>
// Sample report found at: https://api.zotero.org/items/new?itemType=webpage
/* 
	{
		"itemType": "webpage",
		"title": "",
		"creators": [
			{
				"creatorType": "author",
				"firstName": "",
				"lastName": ""
			}
		],
		"abstractNote": "",
		"websiteTitle": "",
		"websiteType": "",
		"date": "",
		"shortTitle": "",
		"url": "",
		"accessDate": "",
		"language": "",
		"rights": "",
		"extra": "",
		"tags": [],
		"collections": [],
		"relations": {}
	}
*/

function doWeb(doc, url) {
	Zotero.debug("=================================");
	
	resourceType = detectWeb(doc, url);

	// Creating the item
	var newItem = new Zotero.Item(resourceType);

	//Setting common data:
	newItem.websiteTitle = "Pastebin.com";
	newItem.url = url;
	var title = ZU.xpathText(doc, '//h1');	
	newItem.title  = title;
	newItem.websiteType = getType(url);

	if (newItem.websiteType == "paste") {
		var author = ZU.xpathText(doc, '//div[@class="paste_box_line2"]//a');	
		newItem.creators = [Zotero.Utilities.cleanAuthor(author, "author", false)];

		var date = ZU.xpathText(doc, '//div[@class="paste_box_line2"]//span/@title');
		newItem.date = date;	
	} 
	else if (newItem.websiteType == "profile")  {
		var author = url.substring(url.lastIndexOf('/'));	
		newItem.creators = [Zotero.Utilities.cleanAuthor(author, "author", false)];
	}
	
	// Adding the attachment
	newItem.attachments.push({
		title: title,
		mimeType: "text/html",
		url: url
	});	
	
	newItem.complete();
 
	Zotero.debug("=================================");
}
/** BEGIN TEST CASES **/
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
	}
]
/** END TEST CASES **/