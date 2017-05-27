{
	"translatorID": "b298ca93-0010-48f5-97fb-e9923519a380",
	"label": "KStudy",
	"creator": "Yunwoo Song","Philipp Zumstein"
	"target": "^https?://[^/]+\\.kstudy\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2017-05-27 14:00:17"
}

/*
	***** BEGIN LICENSE BLOCK *****

	KISS (Koreanstudies Information Service System) Translator
	Copyright © 2017 Yunwoo Song

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
	if (url.indexOf('/journal/thesis_name.asp')>-1) {
		return "journalArticle";
	} else if ((url.indexOf('/journal/list_name.asp')>-1 || url.indexOf('/search/result_kiss.asp')>-1) && getSearchResults(doc, true)) {
		return "multiple";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//li[@class="title"]/a');
	for (var i=0; i<rows.length; i++) {
		var href = rows[i].href;
		if (href.indexOf("javascript")>-1) {
			var tnameAndKey = href.match(/detailView\(\'([\S]+)\'\,\'([\S]+)\'/);
			var journalhref = "../journal/thesis_name.asp?tname=" + tnameAndKey[1] + "&key=" + tnameAndKey[2];
			href = journalhref;
		}
		var title = ZU.trimInternal(rows[i].textContent);
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
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var item = new Zotero.Item("journalArticle");
	item.title = ZU.xpathText(doc, '//div[@class="agency_box"]/div[1]/span');
	item.language = "kr";
	
	var creators = ZU.xpathText(doc, '//div[@class="agency_detail"]/ul/li[1]');
	if (creators) {
		var creatorsList = creators.split(',');
		for (var i=0; i<creatorsList.length; i++) {
			item.creators.push(ZU.cleanAuthor(creatorsList[i], "author", true));
		}
	}
	
	var details = ZU.xpathText(doc, '//div[@class="agency_detail"]/ul/li[2]');
	//e.g. details = "한국공자학회, <공자학> 27권0호 (2014), pp.179-210"
	//Z.debug(details);
	if (details) {
		item.date = ZU.strToISO(details);
		var publicationTitle = details.match(/<([^>]+)>/);
		if (publicationTitle) {
			item.publicationTitle = publicationTitle[1];
		}
		var pagerange = details.match(/p+\.(\d+-\d+)/);
		if (pagerange) {
			item.pages = pagerange[1];
		}
		var volumeIssue = details.match(/>\s+(\d+)\D(\d+)/);
		if (volumeIssue) {
			item.volume = volumeIssue[1].replace(/^0/, '');
			item.issue = volumeIssue[2].replace(/^0/, '');
		}
	}
	
	item.abstractNote = ZU.xpathText(doc, '//div[@class="con_detail"]/div[4]/ul');
	if (item.abstractNote) {
		item.abstractNote = ZU.trimInternal(item.abstractNote);
	}
	
	item.complete();

}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://kiss.kstudy.com/journal/thesis_name.asp?tname=kiss2002&key=3297333",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "투고논문 : 소옹(邵雍)의 선천역학(先天易學)에 대한 王夫之의 비판",
				"creators": [
					{
						"lastName": "조우진 ( Woo Jin Cho )",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"abstractNote": "초록 <한국어 초록> 본 논문의 목적은 소옹의 선천역학(先天易學)을 바탕으로 한 송대(宋代) 상수역(象數易)의 흐름을 살펴보고 왕부지의 비판적 입장을 고찰하는데 있다. 필자는 이러한 과정에서 상수역의 본래 모습을 확인하고자 한다. 왕부지는 자신의 역학체계를 바탕으로 선천과 후천의 개념, 선천의 전수과정, 선천도(先天圖)의 체계, 선천역학의 원리, 괘(卦)의 형성의 과정 등을 신랄하게 비판하였다. 그의 비판 논리는 경전의 내용을 바탕으로 하는 실증주의적 사고방식에 근거하고 있다. 왕부지의 입장에서 보자면 소옹의 선천역학과 관련된 이론이나 내용은 경전에 전혀 찾아볼 수 없는 것이며, 도가(道家)의 술수가들에 의해 전수된 것에 불과할 따름이다. 왕부지는 소옹의 선천역학을 비판하는 근거를 여러 가지로 제시하는데, 가장 결정적인 것은 점(占)과 관련된다. 선천역학의 핵심원리인 가일배법(加一倍法)은 아래로부터 위로 쌓아서 괘(卦)를 만들어가는 과정으로 점치는 것과 같은 것이다. 그래서 왕부지는 소옹의 선천역학을 술수학일 뿐만 아니라 점역(占易)에 치우친 것이라고 비판하면서 ‘점학일리(占學一理)’를 주장한다. <영어 초록> The object of this paper is to examine the current of Xiangshuyi(象數易) in Song dynasty(宋代) based on Shao-Yong(邵雍)’s Sunchenyeokhak(先天易學) and consider Wang-Fuzhi(王夫之)’s critical position. By this critical examination, we can ascertain the true features of Xiangshuyi. Wang-Fuzhi severely criticised the concept of Sunchen(先天) and Huchen(後天), the transmission process of Sunchen, the system of Sunchentu(先天圖), and the principle of Sunchenyeokhak, and the formation process of Gua(卦) through his Yeokhak(易學) system. His criticism is especially based on positivistic thinking on the contents of Jingzhuan(經傳). For Wang-Fuzhii, the content and theory concerning Shao-Yong’s Sunchenyeokhak aren’t found in Jingzhuan(經傳) and are nothing but brought by Zhushujia(術數家) in Daojia(道家). Wang-Fuzhi presents the several evidences of criticising Shao-Yong’s Xiangshuyi. Among them, the most decisive evidence is related to Zhan(占). Jiayibeifa(加一倍法) as the key principle of Sunchenyeokhak is a process of making Gua by stacking one on top of another and this process is the same as that of Zhan. In conclusion, Wang-Fuzhi maintains Zhanxueyili(占學一理) criticizing that Shao-Yong’s Sunchenyeokhak is only Zhushuxue and is biased toward Zhanyi.",
				"language": "kr",
				"libraryCatalog": "KStudy",
				"pages": "179-210",
				"publicationTitle": "공자학",
				"shortTitle": "투고논문",
				"volume": "27",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://kiss.kstudy.com/search/result_kiss.asp",
		"items": "multiple"
	}
]
/** END TEST CASES **/
