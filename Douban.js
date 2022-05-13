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
	"lastUpdated": "2022-05-13 14:37:34"
}

/*
   Douban Translator
   Copyright (C) 2009-2010 TAO Cheng, acestrong@gmail.com

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

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


function getTextInaTag(text) {
	var aTag = /<a [^>]*?>(.*?)<\/a>/;
	if (aTag.test(text)) {
		return aTag.exec(text)[1];
	} else {
		return text
	}
}
function trimTags(text) {
	return text.replace(/(<.*?>)/g, "");
}

// #############################
// ##### Scraper functions #####
// #############################

function scrapeAndParse(doc, url) {
	// Z.debug({ url })

	ZU.doGet(url, function (page) {
		
		var pattern;

		// 类型 & URL
		var itemType = "book";
		var newItem = new Zotero.Item(itemType);
		// Zotero.debug(itemType);
		newItem.url = url;

		// 主标题（短标题）
		pattern = /<h1>([\s\S]*?)<\/h1>/;
		if (pattern.test(page)) {
			var shortTitle = pattern.exec(page)[1];
			newItem.shortTitle = ZU.trim(trimTags(shortTitle));
			// Zotero.debug("shortTitle: "+shortTitle);
		}
		
		page = page.replace(/\n/g, "");
		// Z.debug(page)
		
		// 标题 = 主标题: 副标题
		pattern = /<span [^>]*?>副标题:<\/span>(.*?)<br/;
		if (pattern.test(page)) {
			var subTitle = pattern.exec(page)[1];
			Zotero.debug("subTitle: "+subTitle);
			newItem.title = newItem.shortTitle + ": " + ZU.trim(subTitle);
		} 
		else {
			newItem.title = newItem.shortTitle;
		}
		// Zotero.debug("title: "+title);
		

		// 作者
		pattern = /<span>\s*<span[^>]*?>\s*作者<\/span>:(.*?)<\/span>/;
		if (!pattern.test(page)) {
			pattern = /<span [^>]*?>作者:<\/span>(.*?)<br/;
		}
		if (pattern.test(page)) {
			var authorNames = trimTags(pattern.exec(page)[1]);
			pattern = /(\[.*?\]|\(.*?\)|（.*?）)/g;
			authorNames = authorNames.replace(pattern, "").split("/");
			// Zotero.debug(authorNames);
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
				newItem.creators.push(ZU.cleanAuthor(
					ZU.trim(authorNames[i]),
					"author", useComma));
			}
		}

		// 译者
		pattern = /<span>\s*<span [^>]*?>\s*译者<\/span>:?(.*?)<\/span>/;
		if (!pattern.test(page)) {
			pattern = /<span [^>]*?>译者:<\/span>(.*?)<br/;
		}
		if (pattern.test(page)) {
			var translatorNames = trimTags(pattern.exec(page)[1]);
			pattern = /(\[.*?\])/g;
			translatorNames = translatorNames.replace(pattern, "").split("/");
			
			for (let i = 0; i < translatorNames.length; i++) {
				let useComma = true;
				pattern = /[A-Za-z]/;
				if (pattern.test(translatorNames[i])) {
				// 外文名
					useComma = false;
				}
				newItem.creators.push(ZU.cleanAuthor(
					ZU.trim(translatorNames[i]),
					"translator", useComma));
			}
		} 

		// ISBN
		pattern = /<span [^>]*?>ISBN:<\/span>(.*?)<br/;
		if (pattern.test(page)) {
			var isbn = pattern.exec(page)[1];
			newItem.ISBN = ZU.trim(isbn);
			// Zotero.debug("isbn: "+isbn);
		}

		// 页数
		pattern = /<span [^>]*?>页数:<\/span>(.*?)<br/;
		if (pattern.test(page)) {
			var numPages = pattern.exec(page)[1];
			numPages = numPages.replace(/页/g, "");
			newItem.numPages = ZU.trim(numPages);
			// Zotero.debug("numPages: "+numPages);
		}

		// 出版社
		pattern = /<span [^>]*?>出版社:<\/span>(.*?)<br/;
		if (pattern.test(page)) {
			var publisher = getTextInaTag(pattern.exec(page)[1]);
			newItem.publisher = ZU.trim(publisher);
			// Zotero.debug("publisher: "+publisher);
		}

		// 原作名
		pattern = /<span [^>]*?>原作名:<\/span>(.*?)<br/;
		if (pattern.test(page)) {
			var originalTitle = pattern.exec(page)[1];
			newItem.extra = "Original Title: " + ZU.trim(originalTitle);
			// Zotero.debug("originalTitle: "+originalTitle);
		}
		
		// 丛书
		pattern = /<span [^>]*?>丛书:<\/span>(.*?)<br/;
		if (pattern.test(page)) {
			var series = getTextInaTag(pattern.exec(page)[1]);
			newItem.series = ZU.trim(series);
			// Zotero.debug("series: "+series);
		}

		// 出版年
		pattern = /<span [^>]*?>出版年:<\/span>(.*?)<br/;
		if (pattern.test(page)) {
			var date = pattern.exec(page)[1];
			date = date.replace(/[年月日]$/g, "");
			date = date.replace(/[年月日]/g, "-");
			newItem.date = ZU.strToISO(ZU.trim(date));
			// Zotero.debug("date: "+date);
		}

		// 简介
		var tags = ZU.xpath(doc, '//div[@id="db-tags-section"]/div//a');
		for (let i in tags) {
			newItem.tags.push(tags[i].textContent);
		}
		newItem.abstractNote = ZU.xpathText(doc, '(//div[@id="link-report"]//div[@class="intro"])[last()]');

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

function detectTitles(doc, url) {
	
	var pattern = /\.douban\.com\/tag\//;
	if (pattern.test(url)) {
		return ZU.xpath(doc, '//div[@class="info"]/h2/a');
	} else {
		return ZU.xpath(doc, '//div[@class="title"]/a');
	}
}

function doWeb(doc, url) {
	var articles = [];
	let r = /douban.com\/url\//;
	if (detectWeb(doc, url) == "multiple") {
		// also searches but they don't work as test cases in Scaffold
		// e.g. https://book.douban.com/subject_search?search_text=Murakami&cat=1001
		var items = {};
		// var titles = ZU.xpath(doc, '//div[@class="title"]/a');
		var titles = detectTitles(doc, url);
		var title;
		for (let i = 0; i < titles.length; i++) {
			title = titles[i];
			// Zotero.debug({ href: title.href, title: title.textContent });
			if (r.test(title.href)) { // Ignore links
				continue;
			}
			items[title.href] = title.textContent;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return;
			}
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrapeAndParse);
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
		"url": "https://book.douban.com/subject/35315153/",
		"items": [
			{
				"itemType": "book",
				"title": "克拉拉与太阳",
				"creators": [
					{
						"lastName": "石黑一雄",
						"creatorType": "author"
					},
					{
						"lastName": "宋佥",
						"creatorType": "translator"
					}
				],
				"date": "2021-3",
				"ISBN": "9787532786831",
				"abstractNote": "“太阳总有办法照到我们，不管我们在哪里。”    ~    克拉拉是一个专为陪伴儿童而设计的太阳能人工智能机器人（AF），具有极高的观察、推理与共情能力。她坐在商店展示橱窗里，注视着街头路人以及前来浏览橱窗的孩子们的一举一动。她始终期待着很快就会有人挑中她，不过，当这种永久改变境遇的可能性出现时，克拉拉却被提醒不要过分相信人类的诺言。    在《克拉拉与太阳》这部作品中，石黑一雄通过一位令人难忘的叙述者的视角，观察千变万化的现代社会，探索了一个根本性的问题：究竟什么是爱？    ~    “你相信有‘人心’这回事吗？    我不仅仅是指那个器官，当然喽。    我说的是这个词的文学意义。    人心。你相信有这样东西吗？    某种让我们每个人成为独特个体的东西？”",
				"extra": "Original Title: Klara and the Sun",
				"libraryCatalog": "Douban",
				"numPages": "392",
				"publisher": "上海译文出版社",
				"series": "石黑一雄作品",
				"url": "https://book.douban.com/subject/35315153/",
				"attachments": [],
				"tags": [],
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
	}
]
/** END TEST CASES **/
