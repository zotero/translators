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
	"lastUpdated": "2021-12-31 06:48:37"
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


function scrubLowercaseTags(tags) {
	for (let tag of tags) {
		if (tag == tag.toLowerCase()) {
			tags[tags.indexOf(tag)] = ZU.capitalizeTitle(tag, true);
		}
	}
	return tags;
}


function detectWeb(doc, url) {
	var json = JSON.parse(text(doc, 'script[type="application/ld+json"]'));
	if (json && json["@type"] == "NewsArticle") {
		return "blogPost";
	}
	else if (url.includes('/search?') && getGoogleSearchResults(doc, true)) {
		return "multiple";
	}
	else if (getTopicResults(doc, true)) {
		return "multiple"
	}
	return false;
}


function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // embedded metadata (EM)
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) { // corrections to EM
		item.itemType = "blogPost";
		var json = JSON.parse(text(doc, 'script[type="application/ld+json"]'));
		item.creators.push(ZU.cleanAuthor(json.author.name, 'author')); // no ready examples of multiple authors so single is fine
		item.tags = scrubLowercaseTags(item.tags);

		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.doWeb(doc, url);
	});
}


function getTopicResults(doc, checkOnly) {
	var items = {};
	var found = false;
	let rows = doc.querySelectorAll('.summary_list article.summary>a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.title);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function getGoogleSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	let rows = doc.querySelectorAll('.gsc-thumbnail-inside .gs-title a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		if (url.includes('/search?')) {
			Zotero.selectItems(getGoogleSearchResults(doc, false), function (items) {
				if (items) ZU.processDocuments(Object.keys(items), scrape);
			});
		}
		else
			Zotero.selectItems(getTopicResults(doc, false), function (items) {
				if (items) ZU.processDocuments(Object.keys(items), scrape);
			});
	}
	else {
		scrape(doc, url);
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.vg247.com/standalone-rdr-undead-nightmare-disc-releasing-in-us-on-november-23-november-26-on-eu",
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
				"date": "2010-10-26T13:46:14+00:00",
				"abstractNote": "Rockstar will release the disc version of Red Dead Redemption: Undead Nightmare in the US on November 23 and November 2…",
				"blogTitle": "VG247",
				"language": "en",
				"shortTitle": "RDR",
				"url": "https://www.vg247.com/standalone-rdr-undead-nightmare-disc-releasing-in-us-on-november-23-november-26-on-eu",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Action"
					},
					{
						"tag": "Adventure"
					},
					{
						"tag": "Hot"
					},
					{
						"tag": "PS3"
					},
					{
						"tag": "Red Dead Redemption"
					},
					{
						"tag": "Red Dead Redemption: Undead Nightmare"
					},
					{
						"tag": "Rockstar"
					},
					{
						"tag": "Rockstar San Diego"
					},
					{
						"tag": "Xbox 360"
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
		"url": "https://www.vg247.com/search?q=earthbound",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.vg247.com/nintendo-reveals-top-selling-indie-games-2021",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Nintendo reveals 2021's top-selling indie games",
				"creators": [
					{
						"firstName": "Jeremy",
						"lastName": "Signor",
						"creatorType": "author"
					}
				],
				"date": "2021-12-30T06:22:46.354519+00:00",
				"abstractNote": "Nintendo reveals the top-selling indie games on Switch for 2021.",
				"blogTitle": "VG247",
				"language": "en",
				"url": "https://www.vg247.com/nintendo-reveals-top-selling-indie-games-2021",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Axiom Verge 2"
					},
					{
						"tag": "Curse Of The Dead Gods"
					},
					{
						"tag": "Cyber Shadow"
					},
					{
						"tag": "Doki Doki Literature Club Plus!"
					},
					{
						"tag": "Eastward"
					},
					{
						"tag": "Ender Lilies: Quietus of the Knights"
					},
					{
						"tag": "Indie World"
					},
					{
						"tag": "Islanders"
					},
					{
						"tag": "Littlewood"
					},
					{
						"tag": "Nintendo"
					},
					{
						"tag": "Nintendo Switch"
					},
					{
						"tag": "Road 96"
					},
					{
						"tag": "Slime Rancher"
					},
					{
						"tag": "Spelunky 2"
					},
					{
						"tag": "Stick Fight: The Game"
					},
					{
						"tag": "Subnautica"
					},
					{
						"tag": "Subnautica: Below Zero"
					},
					{
						"tag": "Tetris Effect"
					},
					{
						"tag": "Unpacking"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
