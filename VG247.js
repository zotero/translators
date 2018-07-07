{
	"translatorID": "2c399e0c-3109-475d-8026-5b62bd27af1a",
	"label": "VG247",
	"creator": "czar",
	"target": "^https?://(www\\.)?vg247\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-07-07 21:15:54"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 czar
	http://en.wikipedia.org/wiki/User_talk:Czar
	
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
	if (/\/\d{4}\/\d{2}\//.test(url)) {
		return "blogPost";
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	} else return null;
}


function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // embedded metadata (EM)
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) { // corrections to EM
		item.itemType = "blogPost";
		item.title = item.title.replace(' - VG247','');
		var authorMetadata = doc.querySelectorAll('p.meta');
		if (authorMetadata) {
			item.creators.push(ZU.cleanAuthor(authorMetadata[0].textContent.split('\n')[1].trim().replace('By ','').replace(/,$/,''), "author"));
		}
		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.doWeb(doc, url);
	});
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('div.top-story h2, div.headlines h2');
	var links = doc.querySelectorAll('div.top-story h2 a, div.headlines h2 a');
	for (let i=0; i<rows.length; i++) {
		let href = links[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	switch (detectWeb(doc, url)) {
		case "multiple":
			Zotero.selectItems(getSearchResults(doc, false), function (items) {
				if (!items) {
					return true;
				}
				var articles = [];
				for (var i in items) {
					articles.push(i);
				}
				ZU.processDocuments(articles, scrape);
			});
			break;
		case "blogPost":
			scrape(doc, url);
			break;
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.vg247.com/2010/12/12/spike-vga-2010-winners-red-dead-redemption-scoops-goty/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Spike VGA 2010 winners - Red Dead Redemption scoops GOTY",
				"creators": [
					{
						"firstName": "Joe",
						"lastName": "Anderson",
						"creatorType": "author"
					}
				],
				"date": "2010-12-12T07:44:32+01:00",
				"abstractNote": "Red Dead Redemption scooped the Game of the Year award at this year’s VGA’s, pipping Mass Effect 2, which still managed to scoop two awards of its own, including best RPG and best Xbox 360 game. Elsewhere in the awards, Kratos managed to scoop two awards for seperate games, with God of War III winning Best PS3 …",
				"blogTitle": "VG247",
				"url": "https://www.vg247.com/2010/12/12/spike-vga-2010-winners-red-dead-redemption-scoops-goty/",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Call of Duty: Black Ops"
					},
					{
						"tag": "Halo: Reach"
					},
					{
						"tag": "Red Dead Redemption"
					},
					{
						"tag": "ghost of sparta"
					},
					{
						"tag": "god of war III"
					},
					{
						"tag": "mass effect 2"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.vg247.com/2010/10/26/standalone-rdr-undead-nightmare-disc-releasing-in-us-on-november-23-november-26-on-eu/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "RDR: Undead Nightmare disc SKU gets US and EU dates",
				"creators": [
					{
						"firstName": "Johnny",
						"lastName": "Cullen",
						"creatorType": "author"
					}
				],
				"date": "2010-10-26T14:46:14+01:00",
				"abstractNote": "Rockstar will release the disc version of Red Dead Redemption: Undead Nightmare in the US on November 23 and November 26 in EU for PS3 and 360. The title, playable on its own without a copy of the main RDR, will also feature all of the other DLC packs released so far for the western …",
				"blogTitle": "VG247",
				"shortTitle": "RDR",
				"url": "https://www.vg247.com/2010/10/26/standalone-rdr-undead-nightmare-disc-releasing-in-us-on-november-23-november-26-on-eu/",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Red Dead Redemption"
					},
					{
						"tag": "Rockstar San Diego"
					},
					{
						"tag": "red dead redemption: undead nightmare"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.vg247.com/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.vg247.com/tag/earthbound/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.vg247.com/category/pc/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.vg247.com/?s=earthbound",
		"items": "multiple"
	}
]
/** END TEST CASES **/
