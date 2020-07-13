{
	"translatorID": "f9b132f7-8504-4a8f-b423-b61c8dae4783",
	"label": "BiliBili",
	"creator": "Felix Hui",
	"target": "https?://((search.bilibili.com)|(www.bilibili.com/(video|ranking)))",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-07-04 03:49:39"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Felix Hui

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

// eslint-disable-next-line
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}

function detectWeb(doc, url) {
	if (url.includes('/video/')) {
		if (doc.getElementById('bofqi') || doc.getElementById('multi_page')) {
			Z.monitorDOMChanges(doc.body, { childList: true });
		}
		return "tvBroadcast";
	}
	if ((url.includes('/ranking') || url.includes('search.bilibili.com')) && getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('li[class*="-item"] a.title');
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
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}
function scrape(doc, url) {
	var item = new Zotero.Item("tvBroadcast");

	// URL
	item.url = url;

	// 标题
	item.title = text(doc, '#viewbox_report h1.video-title');
	// Z.debug('title: ' + item.title);

	// 时长
	item.runningTime = text(doc, 'span.bilibili-player-video-time-total');
	// Z.debug('runningTime: ' + item.runningTime);

	// 发布时间
	item.date = text(doc, '.video-data span:not([class])');
	// Z.debug('date: ' + item.date);

	// 导演
	var author = text(doc, '#v_upinfo a.username');
	// Z.debug('director: ' + author);
	if (author) {
		item.creators.push({
			lastName: author,
			creatorType: "contributor",
			fieldMode: 1
		});
	}

	// 摘要
	var description = text(doc, '#v_desc div.info');
	// Z.debug('description: ' + description);
	if (description) {
		item.abstractNote = ZU.cleanTags(description);
	}

	// 视频选集
	var episodeInfo = doc.querySelector('#multi_page li[class*="on"] a');
	if (episodeInfo) {
		// Z.debug('episodeInfo: ' + episodeInfo);
		item.episodeNumber = text(episodeInfo, 'span.s1');
		item.programTitle = episodeInfo.title;
		// item.url = episodeInfo.href;
	}

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.bilibili.com/video/BV1mE41187KT?p=1",
		"items": [
			{
				"itemType": "tvBroadcast",
				"title": "【中字】粉雄救兵：我们在日本（四集全）",
				"creators": [
					{
						"lastName": "Jackson0920",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "2019-11-01 21:06:34",
				"abstractNote": "【中字】粉雄救兵：我们在日本（四集全） \n网飞官方观看：https://www.netflix.com/title/81075744",
				"libraryCatalog": "BiliBili",
				"url": "https://www.bilibili.com/video/BV1mE41187KT?p=1",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.bilibili.com/ranking",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://search.bilibili.com/all?keyword=%E3%80%90%E4%B8%AD%E5%AD%97%E3%80%91%E7%B2%89%E9%9B%84%E6%95%91%E5%85%B5%EF%BC%9A%E6%88%91%E4%BB%AC%E5%9C%A8%E6%97%A5%E6%9C%AC",
		"items": "multiple"
	}
]
/** END TEST CASES **/
