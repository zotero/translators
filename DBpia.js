{
	"translatorID": "0c31f371-e012-4b1c-b793-f89ab1ae2610",
	"label": "DBpia",
	"creator": "Yunwoo Song, Philipp Zumstein",
	"target": "^https?://[^/]+\\.dbpia\\.co\\.kr",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsi",
	"lastUpdated": "2017-05-30 18:55:18"
}

/*
	***** BEGIN LICENSE BLOCK *****

	DBpia  Translator
	Copyright © 2017 Yunwoo Song and Philipp Zumstein

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
	if (url.indexOf('/Journal/ArticleDetail/')>-1) {
		return "journalArticle";
	} else if ((url.indexOf('/SearchResult/')>-1 || url.indexOf('/Journal/ArticleList/')>-1) && getSearchResults(doc, true)) {
		return "multiple";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[@class="titleWarp"]/a');
	for (var i=0; i<rows.length; i++) {
		var href = rows[i].href;
		var c = i + 1;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[c] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			var num = [];
			for (var i in items) {
				num.push(i);
			}
			for (var i=0; i<num.length; i++) {
				var n = num[i];
				var journals = [];
				var link = ZU.xpathText(doc, '//div[@class="subSearchResultList"]/div[' + n + ']/ul[1]/li[4]/dl/dt/div/a/@href')
				if (link.indexOf('book')==-1) {
					journals.push(link);
				} else {
					var item = new Zotero.Item("book");
					var title = ZU.xpathText(doc, '//div[@class="subSearchResultList"]/div[' + n + ']/ul[1]/li[4]/dl/dt/div/a');
					item.title = title;
					var creators = ZU.xpathText(doc, '//div[@class="subSearchResultList"]/div[' + n + ']/ul[1]/li[4]/dl/dd[1]');
					if (creators) {
						var creatorsList = creators.split(',');
						for (var i=0; i<creatorsList.length; i++) {
							item.creators.push(ZU.cleanAuthor(creatorsList[i], "author", true));
						}
					}
					item.publisher = ZU.xpathText(doc, '//div[@class="subSearchResultList"]/div[' + n + ']/ul[1]/li[4]/dl/dd[2]/a');
					item.date = ZU.xpathText(doc, '//div[@class="subSearchResultList"]/div[' + n + ']/ul[1]/li[4]/dl/dd[3]');
					item.complete();
				}
			}
			if (journals.length>0) {
				ZU.processDocuments(journals, scrape);
			}	
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setHandler('itemDone', function (obj, item) {
		var pdfurl = ZU.xpathText(doc, '//div[@class="btn_box"]/a[@title="PDF Download"]/@href');
		if (pdfurl) {
			item.attachments.push({
				url : pdfurl,
				title : "DBpia Full Text PDF",
				mimeType : "application/pdf",
				snapshot : true,
			})
		}
		item.complete();
	});

	translator.getTranslatorObject(function(trans) {
		trans.itemType = "journalArticle";
		trans.doWeb(doc, url);
	});

}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.dbpia.co.kr/SearchResult/TopSearch?isFullText=0&searchAll=%EA%B0%9C%EB%A1%A0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.dbpia.co.kr/Journal/ArticleDetail/NODE02298184?TotalCount=27036&Seq=2&q=[%EC%97%AD%ED%95%99%C2%A7coldb%C2%A72%C2%A751%C2%A73]&searchWord=%EC%A0%84%EC%B2%B4%3D^%24%EC%97%AD%ED%95%99^*&Multimedia=0&isIdentifyAuthor=0&Collection=0&SearchAll=%EC%97%AD%ED%95%99&isFullText=0&specificParam=0&SearchMethod=0&Sort=1&SortType=desc&Page=1&PageSize=20",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "공기역학적 성능을 고려한 인간동력항공기 개념 설계",
				"creators": [
					{
						"lastName": "강형민",
						"creatorType": "author"
					},
					{
						"lastName": "김철완",
						"creatorType": "author"
					}
				],
				"date": "2013/11",
				"ISSN": "1598-4168",
				"abstractNote": "In this study, preliminary design of human powered aircraft was performed by considering the aerodynamic performance. For this, overall weight including the aircraft and pilot was determined. Then, the main wing and horizontal/vertical tail were designed with appropriate selection of the airfoils and planform shapes. Based on these, three dimensional flow was calculated to obtain lift and drag coefficients and the position of center of gravity (CG). Consequently, it was shown that the lift and power of the aircraft satisfied the constraints of the minimum required lift and the pilot\"s available power. Also, the CG of the aircraft was located at aerodynamic center (AC) of the main wing, which guaranteed 26% of the static margin. 본 연구에서는 공기역학적 성능을 고려하여 인간의 힘만으로 이륙할 수 있는 초경량 인간동력 항공기의 개념설계를 수행하였다. 이를 위해 조종사를 포함한 항공기 전체 무게를 결정한 이후 적절한 익형을 선정하여 주날개/보조날개를 설계하였다. 설계된 비행기의 형상을 기초로 3차원 전산해석을 하였으며, 이를 통해 양력/항력 등의 성능계수 및 항공기무게 중심(CG)에 대한 계산을 수행하였다. 그 결과 비행기의 양력 및 추력이 양력 및 추력의 제한 조건을 만족하였다. 또한 비행기의 무게 중심(CG)이 주익의 공력 중심(AC)에 위치함으로써 26%의 정적 안정성이 보장되었다. , 현재 논문의 참고문헌을 찾아 신청해주세요! Byrne, M. , 2010 , Human Powered Aircraft , Aircraft Design Project : 1 ~ 20 Langford, J. S. , 1989 , The Daedalus Project : A Summary of Lessons Learned : 1 ~ 11 이희우 , 2012 , 한국 최초 인력비행기 개발 사례 연구 , 한국항공우주학회 2012년도 춘계학술대회 : 1316 ~ 1317 강형민 , 2012 , 인간동력항공기 개념설계 Software 개발을 위한 프레임워크 구축 , 한국 항공우주학회 2013년도 추계학술대회 : 1943 ~ 1945 , 알림서비스 신청하고 '인용된 논문' 정보를 메일로 확인 하세요! 해당 논문은 인용된 논문 정보가 없습니다. Cited by linking (CrossRef) CrossRef의 Cited by linkng 서비스와 연계하여 제공되는 정보입니다. , 강형민 저자의 상세정보를 확인해 보세요. 전산해석을 통한 고속철도 더블암 팬터그래프의 부재별 공력소음특성 연구 이상아, 강형민, 이영빈, 김철완, 김규홍, 한국전산유체공학회, 한국전산유체공학회지 20(2), 2015, 61-66 양력선 방법을 이용한 지면효과가 날개의 공력성능에 미치는 영향 분석 이창호, 강형민, 김철완, 한국항공우주학회, 한국항공우주학회지 42(4), 2014, 298-304 공기역학적 성능 향상을 위한 플랩의 위치 최적화 강형민, 박영민, 김철완, 이창호, 한국전산유체공학회, 한국전산유체공학회 학술대회논문집 , 2013, 209-213 양력선 방법을 이용한 다양한 형상의 날개 공력해석에 관한 연구 이창호, 강형민, 김철완, 한국항공우주학회, 한국항공우주학회지 41(12), 2013, 931-939 공기역학적 성능 향상을 위한 플랩의 최적 위치 선정 강형민, 박영민, 김철완, 이창호, 한국전산유체공학회, 한국전산유체공학회지 18(4), 2013, 41-46 커버 형상을 고려한 고속전철 팬터그래프 공력특성의 수치해석적 연구 강형민, 김철완, 조태환, 김동하, 윤수환, 권혁빈, 한국전산유체공학회, 한국전산유체공학회지 17(3), 2012, 18-24 차세대 고속전철 차량연결부의 저소음 형상설계를 위한 차량연결부의 2차원적 수치해석 연구 강형민, 김철완, 조태환, 전완호, 윤수환, 권혁빈, 박춘수, 한국철도학회, 한국철도학회 논문집 14(4), 2011, 327-332 차세대 고속철도 판토그래프의 공력특성 해석 강형민, 조태환, 김철완, 윤수환, 권혁빈, 박춘수, 한국전산유체공학회, 한국전산유체공학회 학술대회논문집 , 2011, 362-367 커버 형상에 따른 고속전철 판토그래프의 공력특성 해석 강형민, 김철완, 조태환, 김동하, 윤수환, 권혁빈, 한국철도학회, 한국철도학회 학술발표대회논문집 , 2011, 81-87 운용조건의 불확실성을 고려한 풍력터빈 블레이드용 익형의 신뢰성 기반 강건 최적 설계 정지훈, 박경현, 전상욱, 강형민, 이동호, 한국신재생에너지학회, 한국신재생에너지학회 학술대회논문집 , 2009, 427-430 , 검색결과 목록을 보시려면 여기를 클릭하세요! ▶여자 배드민턴 선수의 스매시와 드롭 동작의 직선 및 크로스 타구에 관한 운동역학적 분석 ▶공기역학적 성능을 고려한 인간동력항공기 개념 설계 ▶송재국교수의 역학담론 ▶소강절의 선천역학 ▶탈식민의 역학 , 누리미디어에서 제공되는 모든 저작물의 저작권은 원저작자에게 있으며, 누리미디어는 각 저작물의 내용을 보증하거나 책임을 지지 않습니다. 단, 누리미디어에서 제공되는 서지정보는 저작권법에 의해 보호를 받는 저작물로, 사전 허락 없이 임의로 대량 수집하거나 프로그램에 의한 주기적 수집 이용, 무단 전재, 배포하는 것을 금하며, 이를 위반할 경우, 저작권법 및 관련법령에 따라 민, 형사상의 책임을 질 수 있습니다.",
				"issue": "2",
				"libraryCatalog": "DBpia",
				"publicationTitle": "항공우주기술",
				"volume": "12",
				"attachments": [
					{
						"snapshot": true
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
		"url": "http://www.dbpia.co.kr/Journal/ArticleDetail/NODE06648914?TotalCount=17797&Seq=13&q=%5B%EC%B2%AD%EC%86%8C%EB%85%84%C2%A7coldb%C2%A72%C2%A751%C2%A73%5D&searchWord=%EC%A0%84%EC%B2%B4%3D%5E%24%EC%B2%AD%EC%86%8C%EB%85%84%5E*&Multimedia=0&isIdentifyAuthor=0&Collection=0&SearchAll=%EC%B2%AD%EC%86%8C%EB%85%84&isFullText=0&specificParam=0&SearchMethod=0&Sort=1&SortType=desc&Page=1&PageSize=20",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "다문화가족 청소년의 가족유형에 따른 일탈행위의 차이 분석",
				"creators": [
					{
						"firstName": "",
						"lastName": "김현식",
						"creatorType": "author"
					}
				],
				"date": "2016/2",
				"ISSN": "1225-0120",
				"abstractNote": "이 논문의 목적은 일탈행위의 사회학에 기초하여 한국 청소년의 일탈행위가 다문화가족 유형에 따라 다른지에 관한 이론적 가설을 도출하고, 이를 경험적으로 검증하는 것이다. 분석 자료로 2011년부터 2014년까지 수집된 청소년건강행태온라인조사를 활용하였다. 이 논문에서는 가족유형을 양 부모 한국출생, 어머니만 외국출생, 아버지만 외국출생, 양 부모 외국출생으로 분류하였고, 흡연, 음주, 인터넷 중독, 성관계 경험, 약물남용으로 일탈행위를 측정하였다. 각 일탈행위에 있어서의 차이에 더해 항목응답이론(item response theory)에 근거한 일탈행위성향을 측정한 후 집단별 일탈행위성향의 차이를 분석하였다. 분석결과, 어머니만 외국출생인 청소년은 양 부모가 한국출생인 청소년에 비해 인터넷 중독 위험이 높았으나 다른 일탈행위에 있어서는 다르지 않았고, 음주경험에서는 오히려 낮았다. 아버지만 외국출생인 청소년은 양 부모가 한국출생인 청소년에 비해 성관계 경험이나 약물남용 위험이 높았으나 다른 일탈행위에서는 차이를 보이지 않았다. 양 부모가 외국출생인 청소년은 양 부모가 한국출생인 청소년에 비해 음주를 제외한 모든 일탈행위에서 커다란 위험에 놓여 있었다. 이러한 분석결과는 다문화가족 청소년들이 처한 가족 및 사회적 환경이 하위 유형에 따라 다르기 때문에 각 집단에 알맞은 사회 통합 정책이 고안되어야함을 시사한다.",
				"issue": "1",
				"libraryCatalog": "www.dbpia.co.kr",
				"pages": "41-74",
				"publicationTitle": "한국사회학",
				"url": "http://www.dbpia.co.kr",
				"volume": "50",
				"attachments": [
					{
						"title": "Snapshot"
					},
					{
						"title": "DBpia Full Text PDF",
						"mimeType": "application/pdf",
						"snapshot": true
					}
				],
				"tags": [
					"Adolescents of multi-cultural families",
					"juvenile delinquency",
					"sociological theories of delinquency",
					"다문화가족 청소년",
					"사회학적 일탈론",
					"일탈",
					"일탈행위성향"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
]
/** END TEST CASES **/
