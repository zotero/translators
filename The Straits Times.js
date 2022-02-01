{
	"translatorID": "2de01dfe-9572-4775-bf7e-6b55c95d60b0",
	"label": "The Straits Times",
	"creator": "Robert Sim",
	"target": "^https?:\\/\\/(www.)?straitstimes.com\\/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-01-23 22:08:18"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Robert Sim

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
	var pageClass = ZU.xpathText(doc, '//meta[@property="og:type"]/@content');
	if (pageClass === 'article') {
		var testPath = url.replace(/^https?:\/\/(www.)?straitstimes.com\//, '');
		if (testPath.split('/').length > 1) {
			return 'newspaperArticle';
		}
	}
	if (pageClass === 'Website') {
		return 'multiple';
	}
	
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		getMultipleItems(doc, url);
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var newItem = new Zotero.Item('newspaperArticle');
	newItem.ISSN = '0585-3923';
	newItem.url = url;
	newItem.publicationTitle = 'The Straits Times';
	newItem.title = ZU.xpathText(doc, '//meta[@property="og:title"]/@content');
	newItem.abstractNote = (ZU.xpathText(doc, '//meta[@property="og:description"]/@content') || '').replace('\n. Read more at straitstimes.com.', '').trim();
	newItem.date = ZU.xpathText(doc, '//meta[@property="article:published_time"]/@content');
	newItem.place = 'Singapore';
	newItem.language = 'en';
	var authors = ZU.xpathText(doc, '//div[contains(@class, "field-byline")]//div[contains(@itemprop, "author")]'); // single author article. https://www.straitstimes.com/singapore/more-employees-eligible-for-covid-19-support-grant-application-start-date-pushed-back-msf
	if (authors !== null && authors.length) {
		authors = authors.trim();
		insertCreator(authors, newItem);
	}
	else {
		authors = ZU.xpathText(doc, '//div[contains(@class, "field-byline")]//span[contains(@itemprop, "author")]'); // multiple authors article. https://www.straitstimes.com/singapore/community/sporeans-going-ahead-with-cny-plans-amid-surge-in-covid-19-cases-as-businesses-see-boost-in-sales
		if (authors !== null && authors.length) {
			var authorsArr = authors.split(',');
			for (var i = 0; i < authorsArr.length; i++) {
				insertCreator(authorsArr[i], newItem);
			}
		}
	}

	// for opinion/forum contributors. https://www.straitstimes.com/opinion/facebooks-next-frontier-the-metaverse-what-does-that-mean
	if (authors === null || !authors.length) {
		var author = ZU.xpathText(doc, '//div[contains(@class, "group-byline-info")]//div[contains(@class, "field-byline")]');
		if (author !== null && author.length) {
			var authorArr = author.trim().replace(' For The Straits Times', '').split(' and '); // https://www.straitstimes.com/singapore/environment/science-talk-when-climate-change-impacts-human-health
			for (var i2 = 0; i2 < authorArr.length; i2++) {
				insertCreator(authorArr[i2], newItem);
			}
		}
	}
	
	newItem.attachments = [{
		document: doc,
		title: "Snapshot",
	}];
	if (doc.evaluate('//div[@class="paid-premium st-flag-1"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		newItem.extra = "Straits Times Access: Subscription only";
	}
	newItem.complete();
}

function getMultipleItems(doc, url) {
	var items = [];
	var rows;
	if (url.includes('/search?') && url.includes('searchKey')) {
		rows = ZU.xpath(doc, '//div[@class="queryly_item_row"]');
		if (rows.length) {
			for (var i = 0; i < rows.length; i++) {
				var searchItem = rows[i];
				var searchItemUrl = attr(searchItem, 'a', 'href');
				items.push(searchItemUrl);
			}
		}
	}
	else {
		rows = ZU.xpath(doc, '//a[@class="block-link"]|//span[@class="story-headline"]/a');
		if (rows.length) {
			for (var k = 0; k < rows.length; k++) {
				var headlineItem = rows[k];
				var headlineItemUrl = headlineItem.href;
				items.push(headlineItemUrl);
			}
		}
	}
	if (!!items && items.length) {
		items = items.filter(function (item) {
			return (!!item.match(/^https:\/\/www\.straitstimes.com/));
		});
		if (items.length) {
			ZU.processDocuments(items, scrape);
		}
	}
}

function insertCreator(authorName, newItem) {
	// to account for mostly Chinese names in formats of: <last> <first>, <first (typically English)> <last> <first (typically Chinese)>
	// list derived from searching in Google with the follow search pattern: authors site:straitstimes.com/authors
	var authorList = {
		'Alison de Souza': { first: 'Alison', last: 'de Souza' },
		'Arnoud de Meyer': { first: 'Arnoud', last: 'de Meyer' },
		'Ang Yiying': { first: 'Yiying', last: 'Ang' },
		'Ang Qing': { first: 'Qing', last: 'Ang' },
		'Aw Cheng Wei': { first: 'Cheng Wei', last: 'Aw' },
		'Baey Zo-Er': { first: 'Zo-Er', last: 'Baey' },
		'Benjamin Lim Kang': { first: 'Benjamin, Kang', last: 'Lim' },
		'Chang Ai-Lien': { first: 'Ai-Lien', last: 'Chang' },
		'Chang May Choon': { first: 'May Choon', last: 'Chang' },
		'Chang Tou Liang': { first: 'Tou Liang', last: 'Chang' },
		'Cheong Suk-Wai': { first: 'Suk-Wai', last: 'Cheong' },
		'Cheow Sue-Ann': { first: 'Sue-Ann', last: 'Cheow' },
		'Cheryl Teh TL': { first: 'Cheryl, TL', last: 'Teh' },
		'Chew Hui Min': { first: 'Hui Min', last: 'Chew' },
		'Chin Hui Shan': { first: 'Hui Shan', last: 'Chin' },
		'Chng Choon Hiong': { first: 'Choon Hion', last: 'Chng' },
		'Chong Jun Liang': { first: 'Jun Liang', last: 'Chong' },
		'Choo Yun Ting': { first: 'Yun Ting', last: 'Choo' },
		'Christian de Boisredon': { first: 'Christian', last: 'de Boisredon' },
		'Chua Mui Hoong': { first: 'Mui Hoong', last: 'Chua' },
		'Chua Siang Yee': { first: 'Siang Yee', last: 'Chua' },
		'Feng Zengkun': { first: 'Zengkun', last: 'Feng' },
		'Goh Ruoxue': { first: 'Ruoxue', last: 'Goh' },
		'Goh Sui Noi': { first: 'Sui Noi', last: 'Goh' },
		'Goh Yan Han': { first: 'Yan Han', last: 'Goh' },
		'Han Fook Kwang': { first: 'Fook Kwang', last: 'Han' },
		'Ho Ai Li': { first: 'Ai Li', last: 'Ho' },
		'Ho Cai Jun': { first: 'Cai Jun', last: 'Ho' },
		'Jeremy Au Yong': { first: 'Jeremy', last: 'Au Yong' },
		'Joy Pang Minle': { first: 'Joy, Minle', last: 'Pang' },
		'Kang Wan Chern': { first: 'Wan Chern', last: 'Kang' },
		'Khoe Wei Jun': { first: 'Wei Jun', last: 'Khoe' },
		'Kok Xing Hui': { first: 'Xing Hui', last: 'Kok' },
		'Kua Chee Siong': { first: 'Chee Siong', last: 'Kua' },
		'Lai Shueh Yuan': { first: 'Shueh Yuan', last: 'Lai' },
		'Lee Chee Chew': { first: 'Chee Chew', last: 'Lee' },
		'Lee Choo Kiong': { first: 'Choo Kiong', last: 'Lee' },
		'Lee Jian Xuan': { first: 'Jian Xuan', last: 'Lee' },
		'Lee Min Kok': { first: 'Min Kok', last: 'Lee' },
		'Lee Nian Tjoe': { first: 'Nian Tjoe', last: 'Lee' },
		'Lee Qing Ping': { first: 'Qing Ping', last: 'Lee' },
		'Lee Seok Hwai': { first: 'Seok Hwai', last: 'Lee' },
		'Lee Si Xuan': { first: 'Si Xuan', last: 'Lee' },
		'Lee Siew Hua': { first: 'Siew Hua', last: 'Lee' },
		'Lee Wei Ling': { first: 'Wei Ling', last: 'Lee' },
		'Lee Xin En': { first: 'Xin En', last: 'Lee' },
		'Li Xueying': { first: 'Xueying', last: 'Li' },
		'Lian Szu Jin': { first: 'Szu Jin', last: 'Lian' },
		'Liew Ai Xin': { first: 'Ai Xin', last: 'Liew' },
		'Lim Ai Leen': { first: 'Ai Leen', last: 'Lim' },
		'Lim Min Zhang': { first: 'Min Zhang', last: 'Lim' },
		'Lim Rei Enn': { first: 'Rei Enn', last: 'Lim' },
		'Lim Ruey Yan': { first: 'Ruey Yan', last: 'Lim' },
		'Lim Yan Liang': { first: 'Yan Liang', last: 'Lim' },
		'Lim Yaohui': { first: 'Yaohui', last: 'Lim' },
		'Lim Yi Han': { first: 'Yi Han', last: 'Lim' },
		'Lin Yangchen': { first: 'Yangchen', last: 'Lin' },
		'Ling Chang Hong': { first: 'Chang Hong', last: 'Ling' },
		'Loh Guo Pei': { first: 'Guo Pei', last: 'Loh' },
		'Loh Keng Fatt': { first: 'Keng Fatt', last: 'Loh' },
		'Low Lin Fhoong': { first: 'Lin Fhoong', last: 'Low' },
		'Mok Qiu Lin': { first: 'Qiu Lin', last: 'Mok' },
		'Moon Jae-in': { first: 'Jae-in', last: 'Moon' },
		'Nicholas De Silva': { first: 'Nicholas', last: 'De Silva' },
		'Ng Kane Gene': { first: 'Kane Gene', last: 'Ng' },
		'Ng Huiwen': { first: 'Huiwen', last: 'Ng' },
		'Ng Wei Kai': { first: 'Wei Kai', last: 'Ng' },
		'Nur Asyiqin Mohamad Salleh': { first: 'Nur Asyiqin', last: 'Mohamad Salleh' },
		'Ong Sor Fern': { first: 'Sor Fern', last: 'Ong' },
		'Poon Chian Hui': { first: 'Chain Hui', last: 'Poon' },
		'Quah Ting Wen': { first: 'Ting Wen', last: 'Quah' },
		'Raynold Toh YK': { first: 'Raynold, YK', last: 'Toh' },
		'Rebecca Tan Hui Qing': { first: 'Rebecca, Hui Qing', last: 'Tan' },
		'Seow Bei Yi': { first: 'Bei Yi', last: 'Seow' },
		'Siow Li Sen': { first: 'Li Sen', last: 'Siow' },
		'Tan Dawn Wei': { first: 'Dawn Wei', last: 'Tan' },
		'Tan Fong Han': { first: 'Fong Han', last: 'Tan' },
		'Tan Hsueh Yun': { first: 'Hsueh Yun', last: 'Tan' },
		'Tan Hui Yee': { first: 'Hui Yee', last: 'Tan' },
		'Tan Jia Ning': { first: 'Jia Ning', last: 'Tan' },
		'Tan Ooi Boon': { first: 'Ooi Boon', last: 'Tan' },
		'Tan Shu Yan': { first: 'Shu Yan', last: 'Tan' },
		'Tan Tai Yong': { first: 'Tai Yong', last: 'Tan' },
		'Tan Tam Mei': { first: 'Tam Mei', last: 'Tan' },
		'Tan Weizhen': { first: 'Weizhen', last: 'Tan' },
		'Tang Fan Xi': { first: 'Fan Xi', last: 'Tang' },
		'Tang Wee Cheow': { first: 'Wee Choew', last: 'Tang' },
		'Tay Hong Yi': { first: 'Hong Yi', last: 'Tay' },
		'Tee Zhuo': { first: 'Zhuo', last: 'Tee' },
		'Teo Cheng Wee': { first: 'Cheng Wee', last: 'Teo' },
		'Tham Yuen-C': { first: 'Yuen-C', last: 'Tham' },
		'Thong Yong Jun': { first: 'Yong Jun', last: 'Thong' },
		'Toh Wen Li': { first: 'Wen Li', last: 'Toh' },
		'Toh Ting Wei': { first: 'Ting Wei', last: 'Toh' },
		'Toh Yong Chuan': { first: 'Yong Chuan', last: 'Toh' },
		'Tong Ming Chien': { first: 'Ming Chien', last: 'Tong' },
		'Wang Gungwu': { first: 'Gungwu', last: 'Wang' },
		'Wong Ah Yoke': { first: 'Ah Yoke', last: 'Wong' },
		'Wong Kim Hoh': { first: 'Kim Hoh', last: 'Wong' },
		'Wong Shiying': { first: 'Shiying', last: 'Wong' },
		'Wong Yang': { first: 'Yang', last: 'Wong' },
		'Yeo Shu Hui': { first: 'Shu Hui', last: 'Yeo' },
		'Yip Wai Yee': { first: 'Wai Yee', last: 'Yip' },
		'Yuen Sin': { first: 'Sin', last: 'Yuen' },
		'Zhao Jiayi': { first: 'Jiayi', last: 'Zhao' }
	};
	if (authorList[authorName]) {
		newItem.creators.push({
			lastName: authorList[authorName].last,
			firstName: authorList[authorName].first,
			creatorType: 'author'
		});
	}
	else {
		newItem.creators.push(ZU.cleanAuthor(authorName, "author"));
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.straitstimes.com/singapore/fast-and-furious-can-we-trust-the-speedy-development-of-covid-19-vaccines",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Fast and Furious. Can we trust the speedy development of Covid-19 vaccines?",
				"creators": [
					{
						"firstName": "Danny",
						"lastName": "Soon",
						"creatorType": "author"
					}
				],
				"date": "2020-12-28T05:00:00+08:00",
				"ISSN": "0585-3923",
				"abstractNote": "For life to become more normal, and for businesses to get back on their feet, more people need to become immune to the virus.",
				"language": "en",
				"libraryCatalog": "The Straits Times",
				"place": "Singapore",
				"publicationTitle": "The Straits Times",
				"url": "https://www.straitstimes.com/singapore/fast-and-furious-can-we-trust-the-speedy-development-of-covid-19-vaccines",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.straitstimes.com/singapore/more-employees-eligible-for-covid-19-support-grant-application-start-date-pushed-back-msf",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "More employees eligible for Covid-19 support grant; application start date pushed back: MSF",
				"creators": [
					{
						"lastName": "Goh",
						"firstName": "Yan Han",
						"creatorType": "author"
					}
				],
				"date": "2020-04-30T22:49:30+08:00",
				"ISSN": "0585-3923",
				"abstractNote": "The grant application has been pushed back from May 1 to May 4 or 11, depending on the employee's situation.",
				"language": "en",
				"libraryCatalog": "The Straits Times",
				"place": "Singapore",
				"publicationTitle": "The Straits Times",
				"shortTitle": "More employees eligible for Covid-19 support grant; application start date pushed back",
				"url": "https://www.straitstimes.com/singapore/more-employees-eligible-for-covid-19-support-grant-application-start-date-pushed-back-msf",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.straitstimes.com/asia/east-asia/hong-kong-recalibrates-covid-19-strategy-to-maintain-zero-infection-record",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Hong Kong recalibrates Covid-19 strategy to maintain zero-infection record",
				"creators": [
					{
						"firstName": "Claire",
						"lastName": "Huang",
						"creatorType": "author"
					}
				],
				"date": "2021-08-02T21:04:19+08:00",
				"ISSN": "0585-3923",
				"abstractNote": "Under the tweaked rules, non-residents from high-risk areas can also enter Hong Kong if they are fully vaccinated.",
				"language": "en",
				"libraryCatalog": "The Straits Times",
				"place": "Singapore",
				"publicationTitle": "The Straits Times",
				"url": "https://www.straitstimes.com/asia/east-asia/hong-kong-recalibrates-covid-19-strategy-to-maintain-zero-infection-record",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.straitstimes.com/opinion/facebooks-next-frontier-the-metaverse-what-does-that-mean",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Facebook's next frontier - the metaverse. What does that mean?",
				"creators": [
					{
						"firstName": "Daniel",
						"lastName": "Broby",
						"creatorType": "author"
					}
				],
				"date": "2021-08-03T05:00:00+08:00",
				"ISSN": "0585-3923",
				"abstractNote": "Advertising dominates Facebook's social-networking business model. Zuckerberg's move to create a virtual world raises the possibility of new revenue sources.",
				"extra": "Straits Times Access: Subscription only",
				"language": "en",
				"libraryCatalog": "The Straits Times",
				"place": "Singapore",
				"publicationTitle": "The Straits Times",
				"url": "https://www.straitstimes.com/opinion/facebooks-next-frontier-the-metaverse-what-does-that-mean",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.straitstimes.com/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.straitstimes.com/singapore/community/sporeans-going-ahead-with-cny-plans-amid-surge-in-covid-19-cases-as-businesses-see-boost-in-sales",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "S'poreans going ahead with CNY plans despite Covid-19 surge, Chinatown businesses see boost in sales",
				"creators": [
					{
						"lastName": "Yeo",
						"firstName": "Shu Hui",
						"creatorType": "author"
					},
					{
						"firstName": "Dominic",
						"lastName": "Low",
						"creatorType": "author"
					}
				],
				"date": "2022-01-23T18:32:31+08:00",
				"ISSN": "0585-3923",
				"abstractNote": "But they are taking precautions, such as taking turns for visits and doing regular tests.",
				"language": "en",
				"libraryCatalog": "The Straits Times",
				"place": "Singapore",
				"publicationTitle": "The Straits Times",
				"url": "https://www.straitstimes.com/singapore/community/sporeans-going-ahead-with-cny-plans-amid-surge-in-covid-19-cases-as-businesses-see-boost-in-sales",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.straitstimes.com/world/science-talk-hope-and-concern-for-two-novel-covid-19-antivirals",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Science Talk: Hope and concern for two novel Covid-19 antivirals",
				"creators": [
					{
						"firstName": "William A.",
						"lastName": "Haseltine",
						"creatorType": "author"
					},
					{
						"firstName": "Roberto",
						"lastName": "Patarca",
						"creatorType": "author"
					}
				],
				"date": "2021-11-22T05:00:00+08:00",
				"ISSN": "0585-3923",
				"abstractNote": "Public health measures, vaccines and antimicrobials – which kill micro-organisms or stop their growth – are the hallmarks to keeping plague-causing microbes at bay and, in exceedingly rare instances, even to eradicating them.",
				"language": "en",
				"libraryCatalog": "The Straits Times",
				"place": "Singapore",
				"publicationTitle": "The Straits Times",
				"shortTitle": "Science Talk",
				"url": "https://www.straitstimes.com/world/science-talk-hope-and-concern-for-two-novel-covid-19-antivirals",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.straitstimes.com/singapore/environment/science-talk-when-climate-change-impacts-human-health",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Science Talk: When climate change impacts human health",
				"creators": [
					{
						"firstName": "Ching Ann",
						"lastName": "Hui",
						"creatorType": "author"
					},
					{
						"firstName": "Woo",
						"lastName": "Qiyun",
						"creatorType": "author"
					}
				],
				"date": "2021-11-08T20:22:34+08:00",
				"ISSN": "0585-3923",
				"abstractNote": "SINGAPORE - The climate crisis is often treated as an environmental problem, but the planetary heating could also have severe repercussions on human health.",
				"language": "en",
				"libraryCatalog": "The Straits Times",
				"place": "Singapore",
				"publicationTitle": "The Straits Times",
				"shortTitle": "Science Talk",
				"url": "https://www.straitstimes.com/singapore/environment/science-talk-when-climate-change-impacts-human-health",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
