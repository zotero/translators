{
	"translatorID": "386d63c0-e038-4fdb-ae29-786264b9d3f5",
	"label": "Justpaste.it",
	"creator": "febrezo",
	"target": "^https?://justpaste\\.it/.+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-09-03 11:20:37"
}

/*
	Justpaste.it Translator
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
	newItem.websiteTitle = "Justpaste.it";
	newItem.url = url;
	var auxTitle = ZU.xpathText(doc, '//title');	
	newItem.title = auxTitle.substring(0, auxTitle.lastIndexOf(" - justpaste.it"));
	newItem.websiteType = "Paste Site";

	var auxDate = ZU.xpathText(doc, '//div[@class="col-md-3 col-xs-4 noteBottomFooter"]');
	if (auxDate.indexOf("ago")>=0) {
		var today = new Date(Date.now());
		newItem.date = today.getFullYear() + "/" + today.getMonth() + "/" + today.getDay();		
	} else {
		newItem.date = auxDate.substring(9);		
	}

	// Adding the attachment
	newItem.attachments.push({
		title: "Justpaste.it Snapshot",		
		mimeType: "text/html",
		url: url
	});	
	
	newItem.complete();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://justpaste.it/xyuj",
		"items": [
			{
				"itemType": "webpage",
				"title": "This is the first line...",
				"creators": [],
				"date": "2016/8/5",
				"url": "https://justpaste.it/xyuj",
				"websiteTitle": "Justpaste.it",
				"websiteType": "paste",
				"attachments": [
					{
						"title": "This is the first line...",
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
