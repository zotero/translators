{
	"translatorID": "f9b132f7-8504-4a8f-b423-b61c8dae4783",
	"label": "BiliBili",
	"creator": "Felix Hui",
	"target": "https?://(search|www).bilibili.com/(video|bangumi|cheese)?",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-11-30 17:39:26"
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

// API 參考: https://github.com/SocialSisterYi/bilibili-API-collect

// eslint-disable-next-line
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}
// eslint-disable-next-line
function getContentsFromURL(url){var xmlhttp=new XMLHttpRequest();xmlhttp.open("GET",url,false);xmlhttp.overrideMimeType("application/json");xmlhttp.send(null);return xmlhttp.responseText;}

function trimTags(text){
	return text.replace(/(<.*?>)/g,"");
}

function getInfoForVideo(url) {
	if (url.includes('/video/')) {
		var pattern, id;
		var apiUrl = 'https://api.bilibili.com/x/web-interface/view';
		if ((pattern = /av\d+/).test(url)) {
			id = pattern.exec(url)[0].replace('av', '');
			apiUrl += '?aid=' + id;
		} else if ((pattern = /BV[0-9a-zA-z]*/).test(url)) {
			id = pattern.exec(url)[0];
			apiUrl += '?bvid=' + id;
		}
		if (id) {
			var json = getContentsFromURL(apiUrl);
			var obj = JSON.parse(json);
			if (obj.code === 0) {
				// Z.debug(obj);
				return obj.data;
			}
		}
	}
	return null;
}

function getInfoForEpisode(url) {
	if (!url.includes('/play/')) {
		return null;
	}
	var pattern, apiUrl, id;
	if ((pattern = /ep\d+/).test(url)) {
		id = pattern.exec(url)[0].replace('ep', '');
		apiUrl = "?ep_id=" + id; 
	} else if ((pattern = /ss\d+/).test(url)) {
		id = pattern.exec(url)[0].replace('ss', '');
		apiUrl = "?season_id=" + id; 
	}
	
	if (apiUrl) {
		var json, obj;
		if (url.includes('/bangumi/play/')) {
			apiUrl = 'http://api.bilibili.com/pgc/view/web/season' + apiUrl;
			json = getContentsFromURL(apiUrl);
			obj = JSON.parse(json);
			if (obj.code === 0) {
				// Z.debug(obj);
				return obj.result;
			}
		} else if (url.includes('/cheese/play/')) {
			apiUrl = 'http://api.bilibili.com/pugv/view/web/season' + apiUrl;
			json = getContentsFromURL(apiUrl);
			obj = JSON.parse(json);
			if (obj.code === 0) {
				// Z.debug(obj);
				return obj.data;
			}
		}
	}
	return null;
}

function getInfoForMedia(url) {
	if (url.includes('bangumi/media/')) {
		var pattern = /md\d+/;
		if (pattern.test(url)) {
			var id = pattern.exec(url)[0].replace('md', '');
			var apiUrl = 'http://api.bilibili.com/pgc/review/user?media_id=' + id;
			var json = getContentsFromURL(apiUrl);
			var obj = JSON.parse(json);
			if (obj.code === 0) {
				// Z.debug(obj);
				apiUrl = 'http://api.bilibili.com/pgc/view/web/season?season_id=' + obj.result.media.season_id;
				json = getContentsFromURL(apiUrl);
				obj = JSON.parse(json);
				if (obj.code === 0) {
					// Z.debug(obj);
					return obj.result;
				}
			}
		}
	}
	return null;
}

function getInfoForSearch(url) {
	if (!url.includes('//search.')) {
		return null;
	}
	var apiUrl = '';
	var params = url.substring(url.indexOf('?') + 1);
	for (var item of params.split('&')) {
		switch(item.substring(0, item.indexOf('=')).toLowerCase()) {
			case 'search_type':
			case 'keyword':
			case 'order':
			case 'order_sort':
			case 'user_type':
			case 'duration':
			case 'tids':
			case 'category_id':
			case 'page':
				apiUrl += '&' + item;
				break;
			default:
				break;
		}
	}
	if (apiUrl.length >= 1) {
		apiUrl = apiUrl.substring(1);
	}
	apiUrl = 'http://api.bilibili.com/x/web-interface/search/all/v2?' + apiUrl;
	var json = getContentsFromURL(apiUrl);
	var obj = JSON.parse(json);
	if (obj.code === 0) {
		// Z.debug(obj);
		return obj.data;
	}
	return null;
}

function resolveForVideo(url) {
	var obj = getInfoForVideo(url);
	if (obj) {
		// Z.debug(JSON.stringify(obj));
		return {
			"url": "https://www.bilibili.com/video/" + obj.bvid,
			"title": obj.title,
			"genre": obj.tname,
			"runningTime": obj.duration,
			"date": obj.pubdate,
			"creators": [
				obj.owner.name
			],
			"description": obj.desc,
			"extra": obj.stat.like + "/" + obj.stat.view
		};
	}
	return {};
}

function resolveForVideoPages(obj) {
	var items = {};
	// Z.debug(JSON.stringify(obj));
	var url;
	var apiUrl = "https://www.bilibili.com/video/" + obj.bvid + '?p=';
	for (var pageInfo of obj.pages) {
		url = apiUrl + pageInfo.page;
		items[url] = {
			"url": url,
			"title": pageInfo.part,
			"genre": obj.tname,
			"runningTime": pageInfo.duration,
			"date": obj.pubdate,
			"creators": [
				obj.owner.name
			],
			"description": obj.desc,
			"episodeNumber": pageInfo.page,
			"programTitle": pageInfo.part,
			"extra": obj.stat.like + "/" + obj.stat.view
		};
	}
	return items;
}

function resolveForBangumi(obj) {
	var items = {};
	// Z.debug(JSON.stringify(obj));
	for (var episodeInfo of obj.episodes) {
		items[episodeInfo.link] = {
			"url": episodeInfo.link,
			"title": episodeInfo.share_copy,
			"shortTitle": episodeInfo.long_title,
			"genre": episodeInfo.from,
			"runningTime": 0,
			"date": episodeInfo.pub_time,
			"creators": [
				obj.rights.copyright
			],
			"description": obj.evaluate,
			"episodeNumber": episodeInfo.title,
			"programTitle": episodeInfo.long_title,
			"extra": obj.rating.score + "/" + (obj.stat.views || obj.stat.play),
			"epid": episodeInfo.id,
			"bvid": episodeInfo.bvid
		};
	}
	return items;
}

function resolveForCheese(obj) {
	var items = {};
	// Z.debug(JSON.stringify(obj));
	var url;
	var apiUrl = 'https://www.bilibili.com/cheese/play/ep';
	for (var episodeInfo of obj.episodes) {
		url = apiUrl + episodeInfo.id;
		items[url] = {
			"url": url,
			"title": "[" + obj.title + "] " + episodeInfo.title,
			"shortTitle": episodeInfo.title,
			"genre": "cheese",
			"runningTime": episodeInfo.duration,
			"date": obj.pub_time,
			"creators": [
				obj.up_info.uname
			],
			"description": obj.subtitle,
			"episodeNumber": episodeInfo.index,
			"programTitle": episodeInfo.title,
			"extra": "0/" + obj.stat.play
		};
	}
	return items;
}

function resolveForSearch(obj) {
	var items = {};
	var apiUrl;
	// Z.debug(JSON.stringify(obj));
	obj = obj.result;
	var url;
	for (var resultInfo of obj) {
		switch(resultInfo.result_type) {
			case 'media_bangumi':
			case 'media_ft':
				apiUrl = 'https://www.bilibili.com/bangumi/media/md';
				for (var subItem1 of resultInfo.data) {
					url = apiUrl + subItem1.media_id;
					items[url] = {
						"url": url,
						"title": '[' + subItem1.media_score.score + '/' + subItem1.media_score.user_count + '] ' + ZU.cleanTags(subItem1.title)
					};
				}
				break;
			case 'video':
				apiUrl = 'https://www.bilibili.com/video/';
				for(var subItem2 of resultInfo.data) {
					url = apiUrl + subItem2.bvid;
					items[url] = {
						"url": url,
						"title": ZU.cleanTags(subItem2.title)
					}
				}
				break;
			default:
				break;
		}
	}
	return items;
}

function detectWeb(doc, url) {
	if (url.includes('/play/') || url.includes('/video/')) {
		if (getSearchResults(doc, url, true)) {
			return "multiple";
		} else {
			return "tvBroadcast";
		}
	} else if ((url.includes('//search.') || url.includes('/media/')) && getSearchResults(doc, url, true)) {
		return "multiple";
	}
	return false;
}

/**
 * var resultItem = {
 *   "url": "",
 *   "data": {}
 * }
 */
function getSearchResults(doc, url, checkOnly) {
	var items = [];
	var found = false;
	var obj;
	if (url.includes('/video/')) {
		// https://www.bilibili.com/video/BV1P7411R7bF
		// https://www.bilibili.com/video/av97308827
		obj = getInfoForVideo(url);
		if (!obj) {
			return found;
		}
		if (obj.pages && obj.pages.length >= 2) {
			found = true;
			if (checkOnly) return found;
			items = resolveForVideoPages(obj);
		}
	} else if (url.includes('/play/')) {
		obj = getInfoForEpisode(url);
		if (!obj) {
			return found;
		}
		if (url.includes('/bangumi/play/')) {
			// 紀錄片
			// https://www.bilibili.com/bangumi/play/ep250585
			if (obj.episodes && obj.episodes.length >= 2) {
				found = true;
				if (checkOnly) return found;
				// Z.debug(JSON.stringify(obj));
				items = resolveForBangumi(obj);
			}
		} else if (url.includes('/cheese/play/')) {
			// 課程
			// https://www.bilibili.com/cheese/play/ep1491
			if (obj.episodes && obj.episodes.length >= 2) {
				found = true;
				if (checkOnly) return found;
				// Z.debug(JSON.stringify(obj));
				items = resolveForCheese(obj);
			}
		}
	} else if (url.includes('/media/')) {
		// 紀錄片
		// https://www.bilibili.com/bangumi/media/md28227662/
		obj = getInfoForMedia(url);
		if (obj && obj.episodes && obj.episodes.length >= 1) {
			found = true;
			if (checkOnly) return found;
			items = resolveForBangumi(obj);
		}
	} else if (url.includes('//search.')) {
		// 搜索
		// https://search.bilibili.com/all?keyword=%E9%AC%BC%E7%81%AD%E4%B9%8B%E5%88%83&from_source=nav_search&spm_id_from=666.25.b_696e7465726e6174696f6e616c486561646572.11
		obj = getInfoForSearch(url);
		if (!obj || obj.numResults <=0 ) {
			return false;
		}
		found = true;
		if (checkOnly) return found;
		items = resolveForSearch(obj);
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var objItems = getSearchResults(doc, url, false);
		Zotero.selectItems(objItems, function (items) {
			if (items) {
				Object.keys(items).forEach(key => {
					scrape(objItems[key], url);
				});
			}
		});
	} else {
		scrape(null, url);
	}
}

function scrape(obj, url) {
	if (url) {
		if (url.includes('//search.') && obj.url.includes('/media/')) {
			var objs = Object.values(getSearchResults(null, obj.url, false));
			objs.forEach(objItem => {
				scrape(objItem, objItem.url);
			});
			return;
		}
		if (!obj) {
			obj = resolveForVideo(url);
			if (!obj) {
				return;
			}
		}
		
		if (url.includes('/bangumi/') && (!obj.runningTime || obj.runningTime <= 0)) {
			var objVideo = getInfoForVideo("https://www.bilibili.com/video/" + obj.bvid);
			if (objVideo) {
				obj.genre = objVideo.tname;
				obj.runningTime = objVideo.pages[0].duration;
				if (objVideo.owner && objVideo.owner.name) {
					obj.creators.length = 0;
					obj.creators.push(objVideo.owner.name);
				}
			} else {
				ZU.processDocuments(url, (doc, url) => {
					var runningTime = text(doc, 'span[class*="bilibili-player-video-time-total"]');
					if (runningTime) {
						obj.runningTime = runningTime;
					}
					var upName = text(doc, 'span[class*="up-name"]');
					if (upName) {
						obj.creators.length = 0;
						obj.creators.push(upName);
					}
					scrape(obj, null);
				});
				return;
			}
		}
	}
		
	var item = new Zotero.Item("tvBroadcast");

	// URL
	item.url = obj.url;

	// 标题
	item.title = obj.title;
	// item.title = text(doc, '#viewbox_report h1.video-title');
	// Z.debug('title: ' + item.title);
	
	// 类型
	if (obj.genre) {
		item.genre = obj.genre;
	}
	
	// 时长
	item.runningTime = obj.runningTime;
	// item.runningTime = text(doc, 'span.bilibili-player-video-time-total');
	// Z.debug('runningTime: ' + item.runningTime);

	// 发布时间
	item.date = obj.date;
	// item.date = text(doc, '.video-data span:not([class])');
	// Z.debug('date: ' + item.date);

	// 导演
	obj.creators.forEach(author => {
		if (author) {
			item.creators.push({
				lastName: author,
				creatorType: "contributor",
				fieldMode: 1
			});
		}
	})
	// var author = text(doc, '#v_upinfo a.username');
	// Z.debug('director: ' + author);
	
	// 摘要
	var description = obj.description;
	// var description = text(doc, '#v_desc div.info');
	// Z.debug('description: ' + description);
	if (description) {
		item.abstractNote = ZU.cleanTags(description);
	}

	// 视频选集
	if (obj.episodeNumber) {
		item.episodeNumber = obj.episodeNumber;
	}
	if (obj.programTitle) {
		item.programTitle = obj.programTitle;
	}
	// var episodeInfo = doc.querySelector('#multi_page li[class*="on"] a');
	// if (episodeInfo) {
	// 	// Z.debug('episodeInfo: ' + episodeInfo);
	// 	item.episodeNumber = text(episodeInfo, 'span.s1');
	// 	item.programTitle = episodeInfo.title;
	// 	// item.url = episodeInfo.href;
	// }

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
