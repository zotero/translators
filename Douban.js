{
	"translatorID": "d0a65ab7-b10c-4801-a906-05505fecc749",
	"label": "Douban",
	"creator": "Ace Strong<acestrong@gmail.com>, Felix Hui",
	"target": "https?://(www|book|movie)\\.douban\\.com/(subject|doulist|tag|explore|chart|tv|top|series|typerank)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-08-10 06:35:30"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 TAO Cheng, acestrong@gmail.com, Felix Hui, 018

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

var TYPE_MAP = {
	book: 'book',
	movie: 'film',
	tv: 'tvBroadcast'
};

function doPerson(item, data, creatorType) {
	if (!data || data.length <= 0) return;
	const persons = data.split('/');
	for (var person of persons) {
		// item.creators.push(ZU.cleanAuthor(person.trim().replace(/(更多\.\.\.|. 著)/, ''), creatorType, true));
		item.creators.push({
			lastName: person.trim().replace(/(更多\.\.\.|. 著)/, ''),
			creatorType: creatorType,
			fieldMode: 1
		});
	}
}

function doTag(item, data) {
	if (!data || data.length <= 0) return;
	const tags = data.split('/');
	for (var tag of tags) {
		item.tags.push(tag.trim());
	}
}

function detectType(doc) {
	var element = Object.values(doc.scripts).find(element => element.textContent.includes('answerObj'));
	if (element) {
		var pattern = /TYPE: '[a-zA-Z]+'/;
		if (pattern.test(element.textContent)) {
			var type = pattern.exec(element.textContent)[0].replace(/(TYPE:|')/g, '').trim();
			if (TYPE_MAP[type]) {
				return TYPE_MAP[type];
			}
		}
	}
	return false;
}

function getResults1(rows, funcTitle, funcRating, funcRatingPeople, filter) {
	if (!rows || rows.length <= 0) return false;

	var found = false, items = {}, titleTag;
	for (let row of rows) {
		if(filter && !filter(row)) continue;

		titleTag = funcTitle(row);
		let href = titleTag.href;
		let title = ZU.trimInternal(titleTag.textContent);
		if (!href || !title) continue;

		found = true;
		var rating;
		if (funcRating) {
			rating = funcRating(row);
			if (!rating || rating.toString().trim().length <= 0) {
				rating = '0.0';
			}
		}
		var ratingPeople;
		if (funcRatingPeople) {
			ratingPeople = funcRatingPeople(row);
			if (!ratingPeople || ratingPeople.toString().trim().length <= 0) {
				ratingPeople = 0;
			}
		}
		title = '[' + rating + '/' + ratingPeople + '] ' + title;
		items[href] = title;
	}

	return found ? items : false;
}

function getResults2(rows, titleSelector, ratingSelector) {
	if (!rows || rows.length <= 0) return false;

	var found = false, items = {}, rating;
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(text(row, titleSelector));
		if (!href || !title) continue;

		found = true;
		rating = ZU.trimInternal(text(row, ratingSelector));
		if (!rating || rating.toString().trim().length <= 0) {
			rating = '0.0';
		}
		title = '[' + rating + '] ' + title.replace(rating, '');
		items[href] = title;
	}
	return found ? items : false;
}

function detectWeb(doc, url) {
	if (url.includes('/subject/')) {
		return detectType(doc);
	}
	else if (getSearchResults(doc, url, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, url, checkOnly) {
	// 列表使用 AJAX 加载，调用该方法时还未完成加载
	// 检查时，不做列表的验证(只使用URL验证)
	if (checkOnly) return true;

	var rows, items;
	if (url.includes('movie.douban.com/chart')) {
		rows = doc.querySelectorAll('div.indent tr.item');
		return getResults1(rows, (row) => {
			return row.querySelector('div.pl2 a');
		}, (row) => {
			return text(row, 'span.rating_nums');
		}, (row) => {
			return (text(row, 'span.rating_nums+span')||'').match(/\d+/);
		});
	}
	else if (url.includes('movie.douban.com/top')) {
		rows = doc.querySelectorAll('ol.grid_view div.item');
		items = getResults1(rows, (row) => {
			return row.querySelector('div.hd a');
		}, (row) => {
			return text(row, 'div.bd div.star span.rating_num');
		}, (row) => {
			return (text(row, 'div.bd div.star span.rating_num+span+span')||'').match(/\d+/);
		});
	}
	else if (url.includes('movie.douban.com/typerank')) {
		rows = doc.querySelectorAll('.movie-list-panel .movie-list-item');
		items = getResults1(rows, (row) => {
			return row.querySelector('.movie-name-text a');
		}, (row) => {
			return text(row, 'span.rating_num');
		}, (row) => {
			return (text(row, 'span.rating_num+span')||'').match(/\d+/);
		});
	}
	else if (url.includes('movie.douban.com/tag')) {
		rows = doc.querySelectorAll('div.list-wp a');
		items = getResults2(rows, 'span.title', 'span.rate');
	}
	else if (url.includes('movie.douban.com/explore')
		|| url.includes('movie.douban.com/tv')) {
		rows = doc.querySelectorAll('div.list-wp a.item');
		items = getResults2(rows, 'a p', 'a strong');
	}
	else if (url.includes('.com/doulist/')) {
		rows = doc.querySelectorAll('div.article div.doulist-item');
		items = getResults1(rows, (row) => {
			return row.querySelector('div.title a');
		}, (row) => {
			return text(row, 'span.rating_nums');
		}, (row) => {
			return (text(row, 'span.rating_nums+span')||'').match(/\d+/);
		}, (row) => {
			let source = text(row, 'div.source');
			return source.includes('豆瓣读书') || source.includes('豆瓣电影');
		});
	}
	else if (url.includes('book.douban.com/tag')
		|| url.includes('book.douban.com/series')) {
		rows = doc.querySelectorAll('li.subject-item');
		items = getResults1(rows, (row) => {
			return row.querySelector('h2 a');
		}, (row) => {
			return text(row, 'span.rating_nums');
		}, (row) => {
			return (text(row, 'span.rating_nums+span')||'').match(/\d+/);
		});
	}
	return items;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, url, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var itemType = detectType(doc);
	var item = new Zotero.Item(itemType);

	item.url = url;

	item.title = text(doc, 'h1 span[property="v:itemreviewed"]');

	var pattern, episodeCount, runningTime, runningTimeUnit;
	var infos = text(doc, 'div[class*="subject"] div#info');
	infos = infos.replace(/^[\xA0\s]+/gm, '')
		.replace(/[\xA0\s]+$/gm, '')
		.replace(/\n+/g, '\n')
		.replace(/:\n+/g, ': ')
		.replace(/]\n/g, ']')
		.replace(/】\n/g, '】')
		.replace(/\n\/\n/g, '/');
	for (var section of Object.values(infos.split('\n'))) {
		if (!section || section.trim().length <= 0) continue;

		let index = section.indexOf(':');
		if (index <= -1) continue;

		let key = section.substr(0, index).trim();
		let value = section.substr(index + 1).trim();
		switch (key) {
			// book
			case "作者":
				doPerson(item, value, "author");
				break;
			case "译者":
				doPerson(item, value, "translator");
				break;
			case "原作名":
			case "副标题":
				if (item.shortTitle && item.shortTitle.length >= 1) {
					item.shortTitle += " / " + value;
				}
				else {
					item.shortTitle = value;
				}
				break;
			case "ISBN":
				item.ISBN = value;
				break;
			case "页数":
				item.numPages = value;
				break;
			case "出版社":
			case "出品方":
				if (item.publisher && item.publisher.length >= 1) {
					if (value.includes(item.publisher)) {
						item.publisher = value;
					}
					else if (!item.publisher.includes(value)) {
						item.publisher = value + " | " + item.publisher;
					}
				}
				else {
					item.publisher = value;
				}
				break;
			case "丛书":
				item.series = value;
				break;
			case "出版年":
				item.date = value;
				break;
			// film & tvBroadcast
			case "导演":
				doPerson(item, value, "director");
				break;
			case "编剧":
				doPerson(item, value, "scriptwriter");
				break;
			case "主演":
				doPerson(item, value, "contributor");
				break;
			case "类型":
				item.genre = value;
				doTag(item, value);
				break;
			case "制片国家/地区":
				if (itemType === 'tvBroadcast') {
					item.network = value;
				}
				else {
					item.distributor = value;
				}
				break;
			case "语言":
				item.language = value;
				break;
			case "上映日期":
			case "首播":
				// eslint-disable-next-line
				pattern = /\d+[-|\/]\d+[-|\/]\d+/;
				if (value && pattern.test(value)) {
					item.date = pattern.exec(value)[0];
				}
				else {
					item.date = value;
				}
				break;
			case "季数":
				// item.season = value;
				break;
			case "集数":
				episodeCount = value;
				break;
			case "单集片长":
				pattern = /\d+/;
				if (value && pattern.test(value)) {
					runningTime = pattern.exec(value)[0];
					runningTimeUnit = value.replace(runningTime, "");
				}
				break;
			case "片长":
				item.runningTime = value;
				break;
			case "又名":
				item.shortTitle = value;
				break;
			case "IMDb链接":
				item.attachments.push({
					url: "https://www.imdb.com/title/" + value,
					snapshot: false,
					title: "IMDb"
				});
				break;
			default:
				break;
		}
	}

	if (runningTime && episodeCount) {
		item.runningTime = (runningTime * episodeCount).toString();
		if (runningTimeUnit && runningTimeUnit.length >= 1) {
			item.runningTime += runningTimeUnit;
		}
	}

	// 摘要
	let abstractNote;
	switch (itemType) {
		case "book":
			abstractNote = text(doc, 'div.indent span[class*="all"] div.intro');
			if (!abstractNote) {
				abstractNote = text(doc, 'div.indent div.intro');
			}
			break;
		default:
			abstractNote = text(doc, 'div.related-info span[class*="all"]');
			if (!abstractNote) {
				abstractNote = text(doc, 'div.related-info span');
			}
			break;
	}
	if (abstractNote) {
		item.abstractNote = abstractNote.trim().replace(/(([\xA0\s]*)\n([\xA0\s]*))+/g, '\n');
	}

	// 标签
	// 豆瓣标签存在太多冗余(较理想方案是以图书在中图法中的分类作为标签)
	// 保留原作者(Ace Strong<acestrong@gmail.com>)对标签抓取，有需要可以自行去掉注释
	// var tags = text(doc,'div#db-tags-section div.indent');
	// if (tags) {
	// 	tags = tags.replace(/((\s*)\n(\s*))+/g, '\n');
	// 	for (var tag of tags.split('\n')) {
	// 		if (!tag || tag.trim().length <= 0) continue;
	// 		item.tags.push(tag);
	// 	}
	// }

	// 评分 & 评价人数
	var rating = text(doc, 'strong[property*="v:average"]');
	if (rating && (rating = rating.trim()).length >= 1) {
		var ratingPeople = text(doc, 'div.rating_sum a.rating_people span[property="v:votes"]');
		if (!ratingPeople || ratingPeople.toString().trim().length <= 0) {
			ratingPeople = 0;
		}
		item.extra = rating + "/" + ratingPeople;
	}

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://movie.douban.com/subject/1292052/",
		"items": [
			{
				"itemType": "film",
				"title": "肖申克的救赎 The Shawshank Redemption",
				"creators": [
					{
						"lastName": "弗兰克·德拉邦特",
						"creatorType": "director",
						"fieldMode": 1
					},
					{
						"lastName": "弗兰克·德拉邦特",
						"creatorType": "scriptwriter",
						"fieldMode": 1
					},
					{
						"lastName": "斯蒂芬·金",
						"creatorType": "scriptwriter",
						"fieldMode": 1
					},
					{
						"lastName": "蒂姆·罗宾斯",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "摩根·弗里曼",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "鲍勃·冈顿",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "威廉姆·赛德勒",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "克兰西·布朗",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "吉尔·贝罗斯",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "马克·罗斯顿",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "詹姆斯·惠特摩",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "杰弗里·德曼",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "拉里·布兰登伯格",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "尼尔·吉恩托利",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "布赖恩·利比",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "大卫·普罗瓦尔",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "约瑟夫·劳格诺",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "祖德·塞克利拉",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "保罗·麦克兰尼",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "芮妮·布莱恩",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "阿方索·弗里曼",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "V·J·福斯特",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "弗兰克·梅德拉诺",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "马克·迈尔斯",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "尼尔·萨默斯",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "耐德·巴拉米",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "布赖恩·戴拉特",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "唐·麦克马纳斯",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "1994-09-10(多伦多电影节) / 1994-10-14(美国)",
				"abstractNote": "20世纪40年代末，小有成就的青年银行家安迪（蒂姆·罗宾斯 Tim Robbins 饰）因涉嫌杀害妻子及她的情人而锒铛入狱。在这座名为鲨堡的监狱内，希望似乎虚无缥缈，终身监禁的惩罚无疑注定了安迪接下来灰暗绝望的人生。未过多久，安迪尝试接近囚犯中颇有声望的瑞德（摩根·弗 里曼 Morgan Freeman 饰），请求对方帮自己搞来小锤子。以此为契机，二人逐渐熟稔，安迪也仿佛在鱼龙混杂、罪恶横生、黑白混淆的牢狱中找到属于自己的求生之道。他利用自身的专业知识，帮助监狱管理层逃税、洗黑钱，同时凭借与瑞德的交往在犯人中间也渐渐受到礼遇。表面看来，他已如瑞德那样对那堵高墙从憎恨转变为处之泰然，但是对自由的渴望仍促使他朝着心中的希望和目标前进。而关于其罪行的真相，似乎更使这一切朝前推进了一步……\n                                　　本片根据著名作家斯蒂芬·金（Stephen Edwin King）的原著改编。",
				"distributor": "美国",
				"extra": "9.7/2069725",
				"genre": "剧情 / 犯罪",
				"language": "英语",
				"libraryCatalog": "Douban Movie",
				"runningTime": "142分钟",
				"shortTitle": "月黑高飞(港) / 刺激1995(台) / 地狱诺言 / 铁窗岁月 / 消香克的救赎",
				"url": "https://movie.douban.com/subject/1292052/",
				"attachments": [],
				"tags": [
					{
						"tag": "剧情"
					},
					{
						"tag": "犯罪"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://movie.douban.com/tag/#/?sort=U&range=0,10&tags=%E7%94%B5%E5%BD%B1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://movie.douban.com/chart",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://movie.douban.com/subject/26939247/",
		"items": [
			{
				"itemType": "film",
				"title": "夏目友人帐 第六季 夏目友人帳 陸",
				"creators": [
					{
						"lastName": "大森贵弘",
						"creatorType": "director",
						"fieldMode": 1
					},
					{
						"lastName": "出合小都美",
						"creatorType": "director",
						"fieldMode": 1
					},
					{
						"lastName": "绿川幸",
						"creatorType": "scriptwriter",
						"fieldMode": 1
					},
					{
						"lastName": "村井贞之",
						"creatorType": "scriptwriter",
						"fieldMode": 1
					},
					{
						"lastName": "神谷浩史",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "井上和彦",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "小林沙苗",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "石田彰",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "堀江一真",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "木村良平",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "菅沼久义",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "泽城美雪",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "佐藤利奈",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "伊藤美纪 Miki Itô",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "伊藤荣次",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "诹访部顺一",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "2017-04-11",
				"abstractNote": "与温柔友人们度过的，值得珍惜的每一天——\n                                　　美丽而虚幻的，人与妖的物语。\n                                    \n                                　　从小就能看见妖怪的少年·夏目贵志，继承了祖母玲子的遗产“友人帐”，与自称保镖的猫咪老师一起，开始将名字返还给被束缚在友人帐中的妖怪。\n                                    \n                                　　通过与妖怪及与之相关的人们接触，开始摸索自己前进之路的夏目，在与心灵相通的朋友们帮助下，设法守护自己重要的每一天。",
				"distributor": "日本",
				"extra": "9.6/31280",
				"genre": "剧情 / 动画 / 奇幻",
				"language": "日语",
				"libraryCatalog": "Douban Movie",
				"runningTime": "264分钟",
				"shortTitle": "妖怪联络簿 六(台) / Natsume's Book of Friends 6 / Natsume Yuujinchou Roku",
				"url": "https://movie.douban.com/subject/26939247/",
				"attachments": [
					{
						"snapshot": false,
						"title": "IMDb"
					}
				],
				"tags": [
					{
						"tag": "剧情"
					},
					{
						"tag": "动画"
					},
					{
						"tag": "奇幻"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
