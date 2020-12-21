{
	"translatorID": "559b45ba-230e-49f1-bfac-1bab8807fa5d",
	"label": "BiliBili Bangumi",
	"creator": "Felix Hui",
	"target": "https?://www.bilibili.com/bangumi",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-07-09 10:01:14"
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
	if (url.includes('/play/')) {
		return "tvBroadcast";
	}
	else if (url.includes('/media/') && getSearchResults(doc)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc) {
	var rows = doc.querySelectorAll('li.misl-ep-item');
	if (rows && rows.length >= 1) {
		return true;
	}
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		ZU.doGet(url, function (pageMedia) {
			var pattern = /{"season_id":\d+,"season_type":\d+}/;
			if (pattern.test(pageMedia)) {
				var json = pattern.exec(pageMedia);
				var obj = JSON.parse(json);

				ZU.doGet('https://api.bilibili.com/pgc/web/season/section?season_id=' + obj.season_id, function (pageSection) {
					obj = JSON.parse(pageSection);
					let items = {};
					let objMap = {};
					for (var item of obj.result.main_section.episodes) {
						if (!item.aid || !(item.title || item.long_title)) continue;
						let obj = { aid: item.aid, title: item.title, longTitle: item.long_title };
						items[item.aid] = '第' + item.title + '集 ' + ZU.trimInternal(item.long_title);
						objMap[item.aid] = obj;
					}
					Zotero.selectItems(items, function (items) {
						if (items) {
							for (var aid of Object.keys(items)) {
								obj = objMap[aid];
								scrape(obj.aid, obj.title, obj.longTitle);
							}
						}
					});
				});
			}
		});
	}
	else {
		ZU.doGet(url, function (pageEpisode) {
			let id, json, objArray;
			var pattern = /\/ep\d+/;
			if (pattern.test(url)) {
				id = pattern.exec(url)[0].replace('/ep', '');
			}

			pattern = /"epList":\[\{.*?\}\]/;
			if (pattern.test(pageEpisode)) {
				json = pattern.exec(pageEpisode)[0].replace('"epList":', '');
				objArray = JSON.parse(json);
				for (var obj of objArray) {
					if (id) {
						if (obj.id == id) {
							scrape(obj.aid, obj.title, obj.longTitle);
							return;
						}
					}
					else if (obj.title == 1) {
						scrape(obj.aid, obj.title, obj.longTitle);
						return;
					}
				}
			}
		});
	}
}

function scrape(aid, title, longTitle) {
	ZU.doGet('http://api.bilibili.com/x/web-interface/view?aid=' + aid, function (page) {
		let obj = JSON.parse(page);
		if (obj.code !== 0) {
			return;
		}

		const { data } = obj;
		var item = new Zotero.Item("tvBroadcast");

		// 标题
		item.title = data.title;

		// 作者
		item.creators.push({
			lastName: data.owner.name,
			creatorType: "contributor",
			fieldMode: 1
		});

		// 发布时间
		item.date = ZU.strToISO(new Date(data.pubdate * 1000));
		
		// 摘要
		item.abstractNote = data.desc;

		// 时长
		let hour = Math.floor(data.duration / 3600 % 24);
		let min = Math.floor(data.duration / 60 % 60);
		let sec = Math.floor(data.duration % 60);
		item.runningTime = `${hour}:${min}:${sec}`;

		// 视频选集
		if (title) {
			item.episodeNumber = title;
		}
		if (longTitle) {
			item.programTitle = longTitle;
		}

		// URL
		item.url = data.redirect_url;

		item.complete();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.bilibili.com/bangumi/play/ss32638",
		"items": [
			{
				"itemType": "tvBroadcast",
				"title": "第1集　车轮上的生命线",
				"creators": [
					{
						"lastName": "哔哩哔哩纪录片",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "2020年2月26日",
				"abstractNote": "《在武汉》是由国家广播电视总局指导，bilibili与FIGURE联合出品的抗击疫情纪录片。通过讲述非常时期下武汉各类人群的生活和故事，展现从老百姓到各岗位工作人员，从病患到医护工作者在这场疫情中的爱与痛、得与失、怅惘与期望，带给观众温暖并积极向上的人生故事。",
				"episodeNumber": "第1集",
				"libraryCatalog": "BiliBili Bangumi",
				"programTitle": "车轮上的生命线",
				"runningTime": "17:32",
				"url": "https://www.bilibili.com/bangumi/play/ss32638",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.bilibili.com/bangumi/play/ep313840",
		"items": [
			{
				"itemType": "tvBroadcast",
				"title": "第1集 车轮上的生命线",
				"creators": [
					{
						"lastName": "哔哩哔哩纪录片",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "2020年2月26日",
				"abstractNote": "《在武汉》是由国家广播电视总局指导，bilibili与FIGURE联合出品的抗击疫情纪录片。通过讲述非常时期下武汉各类人群的生活和故事，展现从老百姓到各岗位工作人员，从病患到医护工作者在这场疫情中的爱与痛、得与失、怅惘与期望，带给观众温暖并积极向上的人生故事。",
				"episodeNumber": "第1集",
				"libraryCatalog": "BiliBili Bangumi",
				"programTitle": "车轮上的生命线",
				"runningTime": "17:32",
				"url": "https://www.bilibili.com/bangumi/play/ep313840",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.bilibili.com/bangumi/media/md28227950",
		"items": "multiple"
	}
]
/** END TEST CASES **/
