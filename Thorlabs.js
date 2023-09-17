{
	"translatorID": "1c1ad84d-623e-48b5-baf3-caabab63734c",
	"label": "Thorlabs",
	"creator": "malekinho8",
	"target": "^https?://www\\.thorlabs\\.com",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-09-17 18:55:57"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Malek Ibrahim

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
	if (url.includes("thorlabs.com")) {
		return "webpage";
	}
	return false;
}

function doWeb(doc, url) {
	var item = new Zotero.Item("webpage");
	item.title = doc.title;
	item.url = url;
	item.accessDate = new Date().toISOString();
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.thorlabs.com/thorProduct.cfm?partNumber=RA90/M",
		"items": [
			{
				"itemType": "webpage",
				"title": "Thorlabs - RA90/M Right-Angle Clamp for Ø1/2\" Posts, 5 mm Hex",
				"creators": [],
				"url": "https://www.thorlabs.com/thorProduct.cfm?partNumber=RA90/M",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
