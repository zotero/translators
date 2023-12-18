{
	"translatorID": "e79f3610-5e29-4194-a6f9-87a725330ce1",
	"label": "Patreon",
	"creator": "Andy Kwok",
	"target": "^https?://(www\\.)?patreon\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-12-18 03:50:49"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 YOUR_NAME <- TODO
	
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
	// TODO: adjust the logic here
	
	if (url.includes('/posts/')) {
		return "forumPost";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// TODO: adjust the CSS selector
	var rows = doc.querySelectorAll('h2>a.title[href*="/article/"]');
	for (let row of rows) {
		// TODO: check and maybe adjust
		let href = row.href;
		// TODO: check and maybe adjust
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
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}
function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	// translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		// TODO adjust if needed:

		splitTitle = item.title.split("|");
		item.creators.push({lastName: splitTitle.pop().trim(), creatorType: "author", fieldMode: 1});
		item.title = splitTitle.join("|");

		item.postType = "text";
		item.abstractNote = null;
		item.tags = null;
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "forumPost";
		// TODO map additional meta tags here, or delete completely
		trans.addCustomFields({
			'twitter:description': 'abstractNote'
		});
		trans.doWeb(doc, url);
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.patreon.com/posts/xin-zhan-shi-jin-93844184",
		"items": [
			{
				"itemType": "forumPost",
				"title": "心戰室今日暫停｜F1第23站阿布達比煞科戰專欄｜希望2024繼續｜角田練兵千日 用在’24❓",
				"creators": [
					{
						"lastName": "丹尼爾 vs 陳恩能",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"abstractNote": "Patreon is empowering a new generation of creators. \nSupport and engage with artists and creators as they live out their passions!",
				"postType": "text",
				"url": "https://www.patreon.com/posts/xin-zhan-shi-jin-93844184",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.patreon.com/posts/nong-li-qi-yue-55316874",
		"items": [
			{
				"itemType": "forumPost",
				"title": "農曆七月，吸血殭屍",
				"creators": [
					{
						"lastName": "Dr. Wan Chin",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"abstractNote": "Patreon is empowering a new generation of creators. \nSupport and engage with artists and creators as they live out their passions!",
				"postType": "text",
				"url": "https://www.patreon.com/posts/nong-li-qi-yue-55316874",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
