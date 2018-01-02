{
	"translatorID": "b298ca93-0010-48f5-97fb-e9923519a380",
	"label": "KStudy",
	"creator": "Yunwoo Song, Frank Bennett, Philipp Zumstein",
	"target": "^https?://[^/]+\\.kstudy\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-01-02 15:40:30"
}

/*
	***** BEGIN LICENSE BLOCK *****

	KISS (Koreanstudies Information Service System) Translator
	Copyright © 2017 Yunwoo Song, Frank Bennett, and Philipp Zumstein

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
	if (url.indexOf('/thesis/thesis-view.asp')>-1) {
		return "journalArticle";
	} else if (url.indeoxOf('/public2-article.asp')>-1) {
		// these are reports and working paper series but with publicaton name,
		// volume, issue numbers; thus handled as journal articles as well
		return "journalArticle";
	} else if (url.indexOf('/public3-article.asp')>-1) {
		return "report";
	} else if ((url.indexOf('/journal/journal-view.asp')>-1 || url.indexOf('/search/sch-search.asp')>-1 || url.indexOf('/search/result_kiss.asp')>-1) && getSearchResults(doc, true)) {
		return "multiple";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[contains(@class, "thesis-info")]/h5/a[contains(@href, "/thesis")]');
	for (var i=0; i<rows.length; i++) {
		var href = rows[i].href;
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
	var type = detectWeb(doc, url);
	var item = new Zotero.Item(type);
	item.title = ZU.xpathText(doc, '//section[contains(@class, "pub-info")]//h3');
	item.language = "ko-KR";
	
	var creators = ZU.xpathText(doc, '//div[@class="writers"]');
	if (creators) {
		var creatorsList = creators.split(',');
		for (var i=0; i<creatorsList.length; i++) {
			item.creators.push({
				lastName: creatorsList[i],
				fieldMode: true,
				creatorType: "author"
			});
		}
	} else {
		var authors = ZU.xpathText(doc, '//li[label[text()="저자"]]');
		// e.g. authors = 저자 : Kim, Yoon Tae,  Park, Hyun Suk
		// e.g. authors = 저자 : 이동호,  이재서,  윤숙자,  강병철
		if (authors && authors.includes(':')) {
			var authorsValue = authors.split(':')[1];
			if (authorsValue.includes(',  ')) {
				// two spaces after comma are important here
				var authorsList = authorsValue.split(',  ');
			} else {
				var authorsList = authorsValue.split(',');
			}
			for (let i=0; i<authorsList.length; i++)  {
				let author = authorsList[i].trim();
				if (author.includes(',')) {
					item.creators.push(ZU.cleanAuthor(author, "author", true));
				} else {
					item.creators.push({
						lastName: author,
						fieldMode: true,
						creatorType: "author"
					});
				}
			}
		}
	}

	var container = ZU.xpathText(doc, '//li[label[text()="간행물"]]');
	// e.g. container = 간행물 : 국제어문 54권0호
	if (container && container.includes(':')) {
		var containerValue = container.split(':')[1];
		var containerParts = containerValue.match(/(.*)\s+(\d+)\D\s*(\d+)/);
		if (containerParts) {
			item.publicationTitle = containerParts[1];
			if (/\d{4}/.test(containerParts[2])) {
				containerParts[2] = null;
			} else {
				item.volume = containerParts[2];
			}
			item.issue = containerParts[3] !== '0' ? containerParts[3] : null;
		}
	}

	var department = ZU.xpathText(doc, '//li[label[text()="발행기관"]]');
	if (department && department.includes(':')) {
		var departmentValue = department.split(':')[1];
		if (type == "report" && departmentValue) {
			item.institution = departmentValue;
		}
	}

	var date = ZU.xpathText(doc, '//li[label[text()="발행년월" or text()="발행 연도"]]');
	// e.g. date = 발행년월 : 2012년 04월
	if (date && date.includes(':')) {
		var dateValue = date.split(':')[1];
		item.date = dateValue.trim().replace(/\D+/g, '-').replace(/-$/, '');
	}
	
	var pages = ZU.xpathText(doc, '//li[label[text()="페이지"]]');
	// e.g. pages = 페이지 : 43-93(51pages)
	if (pages.search('-')>-1) {
		//This is to avoid importing the total number of pages as the pages value.
		if (pages && pages.includes(':')) {
			var pagesValue = pages.split(':')[1];
			item.pages = pagesValue.split('(')[0].replace('-', '–').replace('pp.', '');
		}
	}
	
	var abstract = ZU.xpathText(doc, '//comment()[contains(., "초록 보기")]/following-sibling::section[1]');
	if (abstract) {
		item.abstractNote = ZU.trimInternal(abstract);
	}

	item.complete();

}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://kiss.kstudy.com/thesis/thesis-view.asp?key=3297333",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "투고논문 : 소옹(邵雍)의 선천역학(先天易學)에 대한 王夫之의 비판",
				"creators": [
					{
						"lastName": "조우진 ( Woo Jin Cho )",
						"fieldMode": true,
						"creatorType": "author"
					}
				],
				"date": "2014-11",
				"abstractNote": "초록 보기 본 논문의 목적은 소옹의 선천역학(先天易學)을 바탕으로 한 송대(宋代) 상수역(象數易)의 흐름을 살펴보고 왕부지의 비판적 입장을 고찰하는데 있다. 필자는 이러한 과정에서 상수역의 본래 모습을 확인하고자 한다. 왕부지는 자신의 역학체계를 바탕으로 선천과 후천의 개념, 선천의 전수과정, 선천도(先天圖)의 체계, 선천역학의 원리, 괘(卦)의 형성의 과정 등을 신랄하게 비판하였다. 그의 비판 논리는 경전의 내용을 바탕으로 하는 실증주의적 사고방식에 근거하고 있다. 왕부지의 입장에서 보자면 소옹의 선천역학과 관련된 이론이나 내용은 경전에 전혀 찾아볼 수 없는 것이며, 도가(道家)의 술수가들에 의해 전수된 것에 불과할 따름이다. 왕부지는 소옹의 선천역학을 비판하는 근거를 여러 가지로 제시하는데, 가장 결정적인 것은 점(占)과 관련된다. 선천역학의 핵심원리인 가일배법(加一倍法)은 아래로부터 위로 쌓아서 괘(卦)를 만들어가는 과정으로 점치는 것과 같은 것이다. 그래서 왕부지는 소옹의 선천역학을 술수학일 뿐만 아니라 점역(占易)에 치우친 것이라고 비판하면서 ‘점학일리(占學一理)’를 주장한다. The object of this paper is to examine the current of Xiangshuyi(象數易) in Song dynasty(宋代) based on Shao-Yong(邵雍)’s Sunchenyeokhak(先天易學) and consider Wang-Fuzhi(王夫之)’s critical position. By this critical examination, we can ascertain the true features of Xiangshuyi. Wang-Fuzhi severely criticised the concept of Sunchen(先天) and Huchen(後天), the transmission process of Sunchen, the system of Sunchentu(先天圖), and the principle of Sunchenyeokhak, and the formation process of Gua(卦) through his Yeokhak(易學) system. His criticism is especially based on positivistic thinking on the contents of Jingzhuan(經傳). For Wang-Fuzhii, the content and theory concerning Shao-Yong’s Sunchenyeokhak aren’t found in Jingzhuan(經傳) and are nothing but brought by Zhushujia(術數家) in Daojia(道家). Wang-Fuzhi presents the several evidences of criticising Shao-Yong’s Xiangshuyi. Among them, the most decisive evidence is related to Zhan(占). Jiayibeifa(加一倍法) as the key principle of Sunchenyeokhak is a process of making Gua by stacking one on top of another and this process is the same as that of Zhan. In conclusion, Wang-Fuzhi maintains Zhanxueyili(占學一理) criticizing that Shao-Yong’s Sunchenyeokhak is only Zhushuxue and is biased toward Zhanyi.",
				"language": "ko-KR",
				"libraryCatalog": "KStudy",
				"pages": "179–210",
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
		"url": "http://kiss.kstudy.com/thesis/thesis-view.asp?key=3500796",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "청소년의 비속어 · 욕설 · 은어 · 유행어 사용 실태와 언어 의식 연구",
				"creators": [
					{
						"lastName": "김태경 ( Kim Tae-kyung ) ",
						"fieldMode": true,
						"creatorType": "author"
					},
					{
						"lastName": " 장경희 ( Chang Kyung-hee ) ",
						"fieldMode": true,
						"creatorType": "author"
					},
					{
						"lastName": " 김정선 ( Kim Jeong-seon ) ",
						"fieldMode": true,
						"creatorType": "author"
					},
					{
						"lastName": " 이삼형 ( Lee Sam-hyung ) ",
						"fieldMode": true,
						"creatorType": "author"
					},
					{
						"lastName": " 이필영 ( Lee Phil-young ) ",
						"fieldMode": true,
						"creatorType": "author"
					},
					{
						"lastName": " 전은진 ( Jeon Eun-jin )",
						"fieldMode": true,
						"creatorType": "author"
					}
				],
				"date": "2012-04",
				"abstractNote": "초록 보기 본 연구는 전국 청소년의 언어 실태와 언어 의식을 조사하고 이에 영향을 미치는 환경요인을 분석해 내는 데 목적이 있다. 본 연구의 조사 대상이 되는 언어 실태는 욕설 등 공격적 언어 표현, 비속어, 은어, 유행어 사용에 관한 것이다. 이를 위하여 본 연구에서는 전국 6개 권역(경인, 강원, 충청, 전라, 경상, 제주)의 초 · 중 · 고등학교 학생 6,053명을 대상으로 설문 조사를 수행하고, 비속어 등의 사용빈도와 거친 강도, 언어 규범 파괴 정도, 관련 환경 요인 등을 분석하였다. 그 결과, 응답자의 학교 급이 올라갈수록 사용하는 비속어나 은어·유행어의 거친 강도나 언어 규범 파괴 정도가 점점 심해지는 것으로 나타났다. 청소년의 이러한 언어실태는 부정적 언어 사용에 관한 용인 태도와 밀접한 관련을 지니고 있었다. 또한, 거주지의 도시화 층, 가정 경제 수준, 학업 성적, 자기통제력, 공감능력 등도 청소년의 공격적 언어 표현 사용에 직간접적으로 영향을 미치는 것으로 조사되었다. 가정 · 학교 · 사회 환경 요인별로는 `또래 간 비공식적 통제`가 청소년 언어에 가장 긍정적인 요소로 작용하며 `부모의 언어폭력으로 인한 스트레스`가 가장 부정적인 요소로 작용하는 것으로 나타났다. The purpose of this study is to investigate the current state of Korean teenager`s language use and attitude regarding expletives, aggressive language expression such as curses, teenage slangs and to examine the relevant environmental factors. We performed a questionnaire survey targeting 6,053 students of elementary, middle, high schools in 6 regions(Gyeongi, Gangwon, Chungcheong, Jeolla, Gyeongsang, Jeju). Our result indicate that the rough intensity of expletive and the language destruction level deepens with age, and adolescents` actual language use is closely related with the language attitude. The urbanization layer of dwelling place, home financial level, schoolwork grade, self-control, and empathy were also indicated to have direct and indirect influence upon adolescents` use of aggressive language expression. As a result of analyzing the relevant environmental factors, teenagers` language use is greatly influenced by their peers` informal control. And the stress caused by parents` verbal abuse would have an adverse effects upon teenager`s language use.",
				"language": "ko-KR",
				"libraryCatalog": "KStudy",
				"pages": "43–93",
				"publicationTitle": "국제어문",
				"volume": "54",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://kiss.kstudy.com/journal/journal-view.asp?key1=25169&key2=2201",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://kiss.kstudy.com/public/public2-article.asp?key=50064290",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "치과용 콘빔 CT를 이용한 상악 정중과잉치의 3차원 분석",
				"creators": [
					{
						"lastName": "이동호",
						"fieldMode": true,
						"creatorType": "author"
					},
					{
						"lastName": "이재서",
						"fieldMode": true,
						"creatorType": "author"
					},
					{
						"lastName": "윤숙자",
						"fieldMode": true,
						"creatorType": "author"
					},
					{
						"lastName": "강병철",
						"fieldMode": true,
						"creatorType": "author"
					}
				],
				"date": "2010",
				"abstractNote": "초록 보기",
				"issue": "3",
				"language": "ko-KR",
				"libraryCatalog": "KStudy",
				"pages": "109–114",
				"publicationTitle": "대한구강악안면방사선학회지 (대한구강악안면방사선학회)",
				"volume": "40",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://kiss.kstudy.com/public/public2-article.asp?key=50789039",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "KOLMOGOROV DISTANCE FOR MULTIVARIATE NORMAL APPROXIMATION",
				"creators": [
					{
						"firstName": "Yoon Tae",
						"lastName": "Kim",
						"creatorType": "author"
					},
					{
						"firstName": "Hyun Suk",
						"lastName": "Park",
						"creatorType": "author"
					}
				],
				"date": "2015",
				"abstractNote": "초록 보기",
				"issue": "1",
				"language": "ko-KR",
				"libraryCatalog": "KStudy",
				"pages": "1–10",
				"publicationTitle": "Korean Journal of mathematics (강원경기수학회)",
				"volume": "23",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
	{
		"type": "web",
		"url": "http://kiss.kstudy.com/public/public3-article.asp?key=60023584",
		"items": [
			{
				"itemType": "report",
				"title": "온라인 수업 활성화를 위한 제도 분석",
				"creators": [
					{
						"lastName": "정영식",
						"fieldMode": true,
						"creatorType": "author"
					},
					{
						"lastName": "박종필",
						"fieldMode": true,
						"creatorType": "author"
					},
					{
						"lastName": "정순원",
						"fieldMode": true,
						"creatorType": "author"
					},
					{
						"lastName": "김유리",
						"fieldMode": true,
						"creatorType": "author"
					},
					{
						"lastName": "송교준",
						"fieldMode": true,
						"creatorType": "author"
					}
				],
				"date": "2013",
				"abstractNote": "초록 보기",
				"institution": "교육부",
				"language": "ko-KR",
				"libraryCatalog": "KStudy",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
