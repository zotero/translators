{
	"translatorID": "fc353b26-8911-4c34-9196-f6f567c93901",
	"label": "Douban",
	"creator": "Ace Strong<acestrong@gmail.com>",
	"target": "^https?://(www|book)\\.douban\\.com/(subject|doulist|people/[a-zA-Z._]*/(do|wish|collect)|.*?status=(do|wish|collect)|group/[0-9]*?/collection|tag)",
	"minVersion": "2.0rc1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-07-11 00:15:24"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 TAO Cheng, acestrong@gmail.com

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

// attr()/text() v2
// eslint-disable-next-line
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}

// #######################
// ##### Sample URLs #####
// #######################

/*
 * The starting point for an search is the URL below.
 * In testing, I tried the following:
 *
 *   - A search listing of books
 *   - A book page
 *   - A doulist page
 *   - A do page
 *   - A wish page
 *   - A collect page
 */
// http://book.douban.com/


// #################################
// #### Local utility functions ####
// #################################
function trimTags(text) {
	return text.replace(/(<.*?>)|&[A-Za-z]*;/g, "");
}

// #############################
// ##### Scraper functions #####
// #############################

function scrapeAndParse(doc, url) {
	// Z.debug({ url })
	Zotero.Utilities.HTTP.doGet(url, function (page) {
		// Z.debug(page)
		var pattern;

		// 类型 & URL
		var itemType = "book";
		var newItem = new Zotero.Item(itemType);
		// Zotero.debug(itemType);
		newItem.url = url;

		// 标题
		pattern = /<h1>([\s\S]*?)<\/h1>/;
		if (pattern.test(page)) {
			var title = pattern.exec(page)[1];
			newItem.title = Zotero.Utilities.trim(trimTags(title));
			// Zotero.debug("title: "+title);
		}

		// 又名
		pattern = /<span [^>]*?>又名:(.*?)<\/span>/;
		if (pattern.test(page)) {
			var shortTitle = pattern.exec(page)[1];
			newItem.shortTitle = Zotero.Utilities.trim(shortTitle);
			// Zotero.debug("shortTitle: "+shortTitle);
		}

		// 作者
		page = page.replace(/\n/g, "");
		pattern = /<span>\s*<span[^>]*?>\s*作者<\/span>:(.*?)<\/span>|<span [^>]*?>作者:<\/span>(.*?)<br\/?>/;
		if (pattern.test(page)) {
			var authorNames = pattern.exec(page);
			if (authorNames[2]) {
				authorNames = trimTags(authorNames[2]);
			}
			else {
				authorNames = trimTags(authorNames[1]);
			}
			pattern = /(\[.*?\]|\(.*?\)|（.*?）|&[A-Za-z]*;)/g;
			authorNames = authorNames.replace(pattern, "").split("/");
			// Zotero.debug("作者: " + authorNames);
			for (let i = 0; i < authorNames.length; i++) {
				let useComma = true;
				pattern = /[A-Za-z]/;
				if (pattern.test(authorNames[i])) {
				// 外文名
					pattern = /,/;
					if (!pattern.test(authorNames[i])) {
						useComma = false;
					}
				}
				newItem.creators.push(Zotero.Utilities.cleanAuthor(
					Zotero.Utilities.trim(authorNames[i]),
					"author", useComma));
			}
			// Zotero.debug("作者: " + newItem.creators);
		}

		// 译者
		pattern = /<span>\s*<span [^>]*?>\s*译者<\/span>:(.*?)<\/span>/;
		if (pattern.test(page)) {
			var translatorNames = trimTags(pattern.exec(page)[1]);
			pattern = /(\[.*?\])/g;
			translatorNames = translatorNames.replace(pattern, "").split("/");
			//		Zotero.debug(translatorNames);
			for (let i = 0; i < translatorNames.length; i++) {
				let useComma = true;
				pattern = /[A-Za-z]/;
				if (pattern.test(translatorNames[i])) {
				// 外文名
					useComma = false;
				}
				// at 2020-07-11 23:45:29 by 018(lyb018@gmail.com): 把译者(translator)改为作者(author)，否则导
				// 出的Zotero RDF文件再导入时会破坏评分。
				newItem.creators.push(Zotero.Utilities.cleanAuthor(
					Zotero.Utilities.trim(translatorNames[i]),
					"author", useComma));
			}
		}

		// ISBN
		pattern = /<span [^>]*?>ISBN:<\/span>(.*?)<br\/?>/;
		if (pattern.test(page)) {
			var isbn = pattern.exec(page)[1];
			newItem.ISBN = Zotero.Utilities.trim(isbn);
			// Zotero.debug("isbn: "+isbn);
		}

		// 页数
		pattern = /<span [^>]*?>页数:<\/span>(.*?)<br\/?>/;
		if (pattern.test(page)) {
			var numPages = pattern.exec(page)[1];
			newItem.numPages = Zotero.Utilities.trim(numPages);
			// Zotero.debug("numPages: "+numPages);
		}

		// 出版社
		pattern = /<span [^>]*?>出版社:<\/span>(.*?)<br\/?>/;
		if (pattern.test(page)) {
			var publisher = pattern.exec(page)[1];
			newItem.publisher = Zotero.Utilities.trim(publisher);
			// Zotero.debug("publisher: "+publisher);
		}

		// 丛书
		pattern = /<span [^>]*?>丛书:<\/span>(.*?)<br\/?>/;
		if (pattern.test(page)) {
			var series = trimTags(pattern.exec(page)[1]);
			newItem.series = Zotero.Utilities.trim(series);
			// Zotero.debug("series: "+series);
		}

		// 出版年
		pattern = /<span [^>]*?>出版年:<\/span>(.*?)<br\/?>/;
		if (pattern.test(page)) {
			var date = pattern.exec(page)[1];
			newItem.date = Zotero.Utilities.trim(date);
			// Zotero.debug("date: "+date);
		}

		// 简介
		var tags = ZU.xpath(doc, '//div[@id="db-tags-section"]/div//a');
		for (let i in tags) {
			newItem.tags.push(tags[i].textContent);
		}

		// 摘要 felix-20200710-1 修复部分页面无法抓取的bug
		// newItem.abstractNote = ZU.xpathText(doc, '//span[@class="short"]/div[@class="intro"]/p');
		let abstractNote = text(doc, 'div.indent span[class*="all"] div.intro');
		if (!abstractNote) {
			abstractNote = text(doc, 'div.indent div.intro');
		}
		if(abstractNote) {
			newItem.abstractNote = abstractNote.trim().replace(/\n *(\n)+/, '\n');
		}
		newItem.abstractNote = abstractNote.trim().replace(/\n *(\n)+/, '\n');

		// 评分 & 评价人数 by felix-20200626-1
		// at 2020-07-11 11:47:17 by 018(lyb018@gmail.com) 修复安装了豆瓣资源下载大师时获取到亚马逊评分
		var ratingNum = ZU.xpathText(doc, '//*[@class="rating_wrap clearbox"]//strong');
		if (ratingNum && (ratingNum = Zotero.Utilities.trim(ratingNum))) {
			// var ratingPeople = ZU.xpathText(doc, '//div[@class="rating_sum"]/span/a[@class="rating_people"]/span[@property="v:votes"]');
			var ratingPeople = ZU.xpathText(doc, '//*[@class="rating_wrap clearbox"]//a/span').trim();
			newItem.extra = ratingNum + "/" + ratingPeople;
		}

		newItem.complete();
	});
}

// #########################
// ##### API functions #####
// #########################
function detectWeb(doc, url) {
	var pattern = /subject_search|doulist|people\/[a-zA-Z._]*?\/(?:do|wish|collect)|.*?status=(?:do|wish|collect)|group\/[0-9]*?\/collection|tag/;

	if (pattern.test(url)) {
		return "multiple";
	}
	else {
		return "book";
	}
}

// at 2020-07-11 00:05:43 by 018(lyb018@gmail.com): 抓取豆列时添加显示评分信息。
function doWebList(doc) {
	let r = /douban.com\/url\//;
	var items = {};
	var subjects = ZU.xpath(doc, '//div[@class="bd doulist-subject"]');
	var subject;
	for (let i = 0; i < subjects.length; i++) {
		subject = subjects[i];
		var title = ZU.xpath(subject, './/div[@class="title"]/a')[0];
		if (r.test(title.href)) { // Ignore links
			continue;
		}
		var rating = ZU.xpathText(subject, './/div[@class="rating"]');
		items[title.href] = title.textContent.replace(/[\n| ]/g, "") + " " + rating.replace(/[\n| ]/g, "");
	}
	return items;
}

// at 2020-07-11 00:05:43 by 018(lyb018@gmail.com): 抓取标签时添加显示评分信息。
function doWebTag(doc) {
	let r = /douban.com\/url\//;
	var items = {};
	var subjects = ZU.xpath(doc, '//li[@class="subject-item"]');
	var subject;
	for (let i = 0; i < subjects.length; i++) {
		subject = subjects[i];
		var title = ZU.xpath(subject, './/div[@class="info"]/h2/a')[0];
		if (r.test(title.href)) { // Ignore links
			continue;
		}
		var rating = ZU.xpathText(subject, './/div[@class="star clearfix"]');
		items[title.href] = title.textContent.replace(/[\n| ]/g, "") + " " + rating.replace(/[\n| ]/g, "");
	}
	return items;
}

function doWeb(doc, url) {
	var articles = [];
	if (detectWeb(doc, url) == "multiple") {
		// also searches but they don't work as test cases in Scaffold
		// e.g. https://book.douban.com/subject_search?search_text=Murakami&cat=1001
		var items;
		var pattern = /\.douban\.com\/tag\//;
		// at 2020-07-11 00:05:43 by 018(lyb018@gmail.com): 抓取多个时添加显示评分信息。
		if (pattern.test(url)) {
			items = doWebTag(doc);
		}
		else {
			items = doWebList(doc);
		}
		
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrapeAndParse);
		});
	}
	else {
		scrapeAndParse(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://book.douban.com/subject/1355643/",
		"items": [
			{
				"itemType": "book",
				"title": "Norwegian Wood",
				"creators": [
					{
						"firstName": "Haruki",
						"lastName": "Murakami",
						"creatorType": "author"
					},
					{
						"firstName": "Jay",
						"lastName": "Rubin",
						"creatorType": "translator"
					}
				],
				"date": "2003",
				"ISBN": "9780099448822",
				"abstractNote": "When he hears her favourite Beatles song, Toru Watanabe recalls his first love Naoko, the girlfriend of his best friend Kizuki. Immediately he is transported back almost twenty years to his student days in Tokyo, adrift in a world of uneasy friendships, casual sex, passion, loss and desire - to a time when an impetuous young woman called Midori marches into his life and he has ..., (展开全部)",
				"extra": "9.0/668",
				"libraryCatalog": "Douban",
				"numPages": "389",
				"publisher": "Vintage",
				"url": "https://book.douban.com/subject/1355643/",
				"attachments": [],
				"tags": [
					{
						"tag": "HarukiMurakami"
					},
					{
						"tag": "小说"
					},
					{
						"tag": "挪威森林英文版"
					},
					{
						"tag": "日本"
					},
					{
						"tag": "日本文学"
					},
					{
						"tag": "村上春树"
					},
					{
						"tag": "英文原版"
					},
					{
						"tag": "英文版"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.douban.com/doulist/120664512/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://book.douban.com/tag/认知心理学?type=S",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://book.douban.com/subject/1487579/",
		"items": [
			{
				"itemType": "book",
				"title": "认知心理学",
				"creators": [
					{
						"lastName": "彭聃龄",
						"creatorType": "author"
					}
				],
				"date": "2004-12",
				"ISBN": "9787533823511",
				"extra": "7.3/147",
				"libraryCatalog": "Douban",
				"numPages": "610",
				"publisher": "浙江教育出版社",
				"series": "世纪心理学丛书",
				"url": "https://book.douban.com/subject/1487579/",
				"attachments": [],
				"tags": [
					{
						"tag": "psychology"
					},
					{
						"tag": "交互设计"
					},
					{
						"tag": "心理学"
					},
					{
						"tag": "科学"
					},
					{
						"tag": "認知心理學"
					},
					{
						"tag": "认知"
					},
					{
						"tag": "认知心理学"
					},
					{
						"tag": "认知科学"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://book.douban.com/subject/10734423/",
		"items": []
	}
]
/** END TEST CASES **/
