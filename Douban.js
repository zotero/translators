{
	"translatorID": "fc353b26-8911-4c34-9196-f6f567c93901",
	"label": "Douban",
	"creator": "Ace Strong<acestrong@gmail.com>",
	"target": "^https?://(?:www|book).douban.com/(?:subject|doulist|people/[a-zA-Z._]*/(?:do|wish|collect)|.*?status=(?:do|wish|collect)|group/[0-9]*?/collection|tag)",
	"minVersion": "2.0rc1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-05-11 06:22:36"
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

function trimTags(text) {
	return text.replace(/(<.*?>)/g, "");
}

function trimMultispace(text) {
	return text.replace(/\n\s+/g, "\n");
}

// #############################
// ##### Scraper functions #####
// ############################# 

function scrapeAndParse(doc, url) {
Zotero.Utilities.HTTP.doGet(url, function(page){
	//Z.debug(page)
	var pattern;

	// 类型 & URL
	var itemType = "book";
	var newItem = new Zotero.Item(itemType);
//	Zotero.debug(itemType);
	newItem.url = url;

	// 标题
	pattern = /<h1>([\s\S]*?)<\/h1>/;
	if (pattern.test(page)) {
		var title = pattern.exec(page)[1];
		newItem.title = Zotero.Utilities.trim(trimTags(title));
//		Zotero.debug("title: "+title);
	}
	
	// 又名
	pattern = /<span [^>]*?>又名:(.*?)<\/span>/;
	if (pattern.test(page)) {
		var shortTitle = pattern.exec(page)[1];
		newItem.shortTitle = Zotero.Utilities.trim(shortTitle);
//		Zotero.debug("shortTitle: "+shortTitle);
	}

	// 作者
	pattern = /<span><span [^>]*?>作者<\/span>:(.*?)<\/span>/;
	if (pattern.test(page)) {
		var authorNames = trimTags(pattern.exec(page)[1]);
		pattern = /(\[.*?\]|\(.*?\)|（.*?）)/g;
		authorNames = authorNames.replace(pattern, "").split("/");
//		Zotero.debug(authorNames);
		for (var i=0; i<authorNames.length; i++) {
			var useComma = true;
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
	}
	
	// 译者
	pattern = /<span><span [^>]*?>译者<\/span>:(.*?)<\/span>/;
	if (pattern.test(page)) {
		var translatorNames = trimTags(pattern.exec(page)[1]);
		pattern = /(\[.*?\])/g;
		translatorNames = translatorNames.replace(pattern, "").split("/");
//		Zotero.debug(translatorNames);
		for (var i=0; i<translatorNames.length; i++) {
			var useComma = true;
			pattern = /[A-Za-z]/;
			if (pattern.test(translatorNames[i])) {
				// 外文名
				useComma = false;
			}
			newItem.creators.push(Zotero.Utilities.cleanAuthor(
				Zotero.Utilities.trim(translatorNames[i]),
				"translator", useComma));
		}
	}

	// ISBN
	pattern = /<span [^>]*?>ISBN:<\/span>(.*?)<br\/>/;
	if (pattern.test(page)) {
		var isbn = pattern.exec(page)[1];
		newItem.ISBN = Zotero.Utilities.trim(isbn);
//		Zotero.debug("isbn: "+isbn);
	}
	
	// 页数
	pattern = /<span [^>]*?>页数:<\/span>(.*?)<br\/>/;
	if (pattern.test(page)) {
		var numPages = pattern.exec(page)[1];
		newItem.numPages = Zotero.Utilities.trim(numPages);
//		Zotero.debug("numPages: "+numPages);
	}
	
	// 出版社
	pattern = /<span [^>]*?>出版社:<\/span>(.*?)<br\/>/;
	if (pattern.test(page)) {
		var publisher = pattern.exec(page)[1];
		newItem.publisher = Zotero.Utilities.trim(publisher);
//		Zotero.debug("publisher: "+publisher);
	}
	
	// 丛书
	pattern = /<span [^>]*?>丛书:<\/span>(.*?)<br\/>/;
	if (pattern.test(page)) {
		var series = trimTags(pattern.exec(page)[1]);
		newItem.series = Zotero.Utilities.trim(series);
//		Zotero.debug("series: "+series);
	}
	
	// 出版年
	pattern = /<span [^>]*?>出版年:<\/span>(.*?)<br\/>/;
	if (pattern.test(page)) {
		var date = pattern.exec(page)[1];
		newItem.date = Zotero.Utilities.trim(date);
//		Zotero.debug("date: "+date);
	}
	
	// 简介
	pattern = /<h2[^>]*?>(?:内容)?简介[\s\S]*?<\/h2>([\s\S]*?)<\/div>/;
	if (pattern.test(page)) {
		var intro = pattern.exec(page)[1];
		intro = trimTags(intro.replace(/(<br\/>)/g, "\n"));
		pattern = /\(展开全部\)([\s\S]*)/;
		if (pattern.test(intro)) {
			intro = pattern.exec(intro)[1];
		}
		pattern = /\S/;
		if (pattern.test(intro)) {
			newItem.abstractNote = "图书简介：\n"
				+ trimMultispace(intro);
		}
//		Zotero.debug("abstractNote: "+newItem.abstractNote);
	}
	
	// 作者简介
	pattern = /<h2[^>]*?>作者简介[\s\S]*?<\/h2>([\s\S]*?)<\/div>/;
	if (pattern.test(page)) {
		var intro = pattern.exec(page)[1];
		intro = trimTags(intro.replace(/(<br\/>)/g, "\n"));
		pattern = /\(展开全部\)([\s\S]*)/;
		if (pattern.test(intro)) {
			intro = pattern.exec(intro)[1];
		}
		
		if (newItem.abstractNote === undefined) {
			newItem.abstractNote = "作者简介：\n"
				+ trimMultispace(intro);
		} else {
			newItem.abstractNote += "\n作者简介：\n"
				+ trimMultispace(intro);
		}
//		Zotero.debug("abstractNote: "+newItem.abstractNote);
	}
	
	// 丛书信息
	pattern = /<h2>丛书信息<\/h2>([\s\S]*?)<\/div>/;
	if (pattern.test(page)) {
		var intro = pattern.exec(page)[1];
		intro = Zotero.Utilities.trimInternal(trimTags(intro));

		if (newItem.abstractNote === undefined) {
			newItem.abstractNote = "丛书信息：\n" + intro;
		} else {
			newItem.abstractNote += "\n丛书信息：\n" + intro;
		}
//		Zotero.debug("abstractNote: "+newItem.abstractNote);
	}
	
	// 标签
	pattern = /<h2\s*?>豆瓣成员常用的标签([\s\S]*?)<\/div>/;
	if (pattern.test(page)) {
		var labels = pattern.exec(page)[1];
		pattern = /<a [^>]*?>(.*?)<\/a>/g;

		var result = labels.match(pattern);
		for (var i=0; i<result.length; i++) {
			var label = trimTags(result[i]);
			
			if (label) {
				newItem.tags.push(label);
			}
//			Zotero.debug(label);
		}
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
	} else {
		return "book";
	}

	return false;
}

function doWeb(doc, url) {
	var articles = new Array();
	if(detectWeb(doc, url) == "multiple") { 
		var items = {};
		var titles = doc.evaluate('//td/div/a[contains(@onclick, "moreurl")]', doc, null, XPathResult.ANY_TYPE, null);
		var title;
		while (title = titles.iterateNext()) {
			items[title.href] = title.textContent;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrapeAndParse, function () {
			});
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
		"url": "http://book.douban.com/subject_search?search_text=Murakami&cat=1001",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://book.douban.com/subject/1355643/",
		"items": [
			{
				"itemType": "book",
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
				"notes": [],
				"tags": [
					"村上春树",
					"HarukiMurakami",
					"日本",
					"小说",
					"英文原版",
					"英文版",
					"Norwegian",
					"挪威森林英文版"
				],
				"seeAlso": [],
				"attachments": [],
				"url": "http://book.douban.com/subject/1355643/",
				"title": "Norwegian Wood",
				"ISBN": "9780099448822",
				"numPages": "400",
				"publisher": "Vintage",
				"date": "2000",
				"abstractNote": "图书简介：\n\nNorwegian Wood (ノルウェイの森, Noruwei no Mori?) is a 1987 novel by Japanese author Haruki Murakami.\nThe novel is a nostalgic story of loss and sexuality. The story's protagonist and narrator is Toru Watanabe, who looks back on his days as a freshman university student living in Tokyo. Through Toru's reminiscences we see him develop relationships with two very different women — the beautiful yet emotionally troubled Naoko, and the outgoing, lively Midori.\nThe novel is set in Tokyo during the late 1960s, a time when Japanese students, like those of many other nations, were protesting against the established order. While it serves as the backdrop against which the events of the novel unfold, Murakami (through the eyes of Toru and Midori) portrays the student movement as largely weak-willed and hypocritical.\nNorwegian Wood was hugely popular with Japanese youth and made Murakami somewhat of a superstar in his native country (apparently much to his dismay at the time). In translation it is also one of the most-read Japanese novels in the Western Hemisphere.[citation needed]\nDespite its mainstream popularity in Japan, Murakami's contemporary readership saw Norwegian Wood as an unwelcome departure[citation needed] from his by-then established style of energetic prose flavoured with the unexpected and supernatural (as exemplified by Hard-Boiled Wonderland and the End of the World, released two years earlier). Yet, as translator Jay Rubin observes in the translator's note to the 2000 English edition, Norwegian Wood retains much of the complexity and symbolism characteristic of Murakami's work and is thus &quot;by no means just a love story.&quot;　　\n\n作者简介：\n　　Haruki Murakami (村上春樹, Murakami Haruki?, born January 12, 1949) is a popular contemporary Japanese writer and translator.[1] His work has been described by the Virginia Quarterly Review as &quot;easily accessible, yet profoundly complex.&quot;",
				"libraryCatalog": "Douban",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/