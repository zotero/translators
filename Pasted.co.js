{
	"translatorID": "39481b02-0c8a-45de-9fb5-9693c8d52f34",
	"label": "Pasted.co",
	"creator": "febrezo",
	"target": "^https?://pasted.co/[0-9a-f]{8}",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-09-18 10:40:34"
}

/*
	Pasted.co Translator
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
	newItem.websiteTitle = "Pasted.co";
	newItem.websiteType = "Paste Site";
	newItem.url = url;
	var title = ZU.xpathText(doc, '//div[@class="blue font15 bold" and not(@align)]');	
	newItem.title = title;
	var date = ZU.xpathText(doc, "//div[@id='pasteInfo']/div/span[text()='Pasted:']/following-sibling::text()[1]");
	newItem.date = date;
	
	// Adding the attachment
	newItem.attachments.push({
		title: "Pasted.co Snapshot",
		mimeType: "text/html",
		url: url
	});	
	
	newItem.complete();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://pasted.co/08bca34c",
		"items": [
			{
				"itemType": "webpage",
				"title": "nami",
				"creators": [],
				"date": "Apr 26, 2015, 6:32:33 am",
				"url": "http://pasted.co/08bca34c",
				"websiteTitle": "Pasted.co",
				"websiteType": "Paste Site",
				"attachments": [
					{
						"title": "Pasted.co Snapshot",
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