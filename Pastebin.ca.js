{
	"translatorID": "bce84d9c-3e2b-45c6-b3b4-5176c00badd6",
	"label": "Pastebin.ca",
	"creator": "febrezo",
	"target": "^https?://pastebin.ca/[0-9]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-09-18 11:00:18"
}

/*
	Pastebin.ca Translator
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
	var resourceType = detectWeb(doc, url);

	// Creating the item
	var newItem = new Zotero.Item(resourceType);

	//Setting common data:
	newItem.websiteTitle = "Pastebin.ca";
	newItem.websiteType = "Paste Site";
	newItem.url = url;
	var title = ZU.xpathText(doc, '//h2/dl/dt');	
	newItem.title = title;
	//var date = ZU.xpathText(doc, "//div[@id='pasteInfo']/div/span[text()='Pasted:']/following-sibling::text()[1]");
	var date = ZU.xpathText(doc, "//h2/dl/dd");	
	newItem.date = date;
	
	// Adding the attachment
	newItem.attachments.push({
		title: "Pastebin.ca Snapshot",
		mimeType: "text/html",
		url: url
	});	
	
	newItem.complete();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://pastebin.ca/3719497",
		"items": [
			{
				"itemType": "webpage",
				"title": "katherineq",
				"creators": [],
				"date": "Sunday, September 18th, 2016 at 10:17:12am UTC",
				"url": "http://pastebin.ca/3719497",
				"websiteTitle": "Pastebin.ca",
				"websiteType": "Paste Site",
				"attachments": [
					{
						"title": "Pastebin.ca Snapshot",
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