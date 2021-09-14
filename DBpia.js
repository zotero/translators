{
	"translatorID": "0c31f371-e012-4b1c-b793-f89ab1ae2610",
	"label": "DBpia",
	"creator": "Yunwoo Song, Philipp Zumstein",
	"target": "^https?://[^/]+\\.dbpia\\.co\\.kr/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-14 00:23:40"
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
	if (url.includes('/journal/articleDetail')) {
		return "journalArticle";
	} else if ((url.includes('/search/') || url.includes('/journal/articleList/')) && getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h5 > a[href*="/journal/articleDetail"]');
	for (let row of rows) {
		var href = row.href;
		var title = ZU.trimInternal(row.textContent);
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
				return;
			}
			ZU.processDocuments(Object.keys(items), scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setHandler('itemDone', function (obj, item) {
		let nodeId = encodeURIComponent(url.match(/[?&]nodeId=([^&#]+)/)[1]);
		
		let downloadDataURL = '/download/downloadData';
		let downloadDataBody = `nodeId=${nodeId}&systemCode=Article&depth=Article&shape=download`;

		ZU.doPost(downloadDataURL, downloadDataBody, function (respText) {
			if (!respText || respText[0] != '{') {
				item.complete();
				return;
			}
			
			let json = JSON.parse(respText);
			if (!json.link) {
				item.complete();
				return;
			}
			
			item.attachments.push({
				url: json.link,
				title: "Full Text PDF",
				mimeType: "application/pdf"
			});
			item.complete();
		});
	});

	translator.getTranslatorObject(function(trans) {
		trans.itemType = "journalArticle";
		trans.doWeb(doc, url);
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.dbpia.co.kr/journal/articleDetail?nodeId=NODE02298184&language=ko_KR",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "공기역학적 성능을 고려한 인간동력항공기 개념 설계",
				"creators": [
					{
						"firstName": "",
						"lastName": "강형민",
						"creatorType": "author"
					},
					{
						"firstName": "",
						"lastName": "김철완",
						"creatorType": "author"
					}
				],
				"date": "2013/11",
				"ISSN": "1598-4168",
				"abstractNote": "본 연구에서는 공기역학적 성능을 고려하여 인간의 힘만으로 이륙할 수 있는 초경량 인간동력 항공기의 개념설계를 수행하였다. 이를 위해 조종사를 포함한 항공기 전체 무게를 결정한 이후 적절한 익형을 선정하여 주날개/보조날개를 설계하였다. 설계된 비행기의 형상을 기초로 3차원 전산해석을 하였으며, 이를 통해 양력/항력 등의 성능계수 및 항공기무게 중심(CG)에 대한 계산을 수행하였다. 그 결과 비행기의 양력 및 추력이 양력 및 추력의 제한 조건을 만족하였다. 또한 비행기의 무게 중심(CG)이 주익의 공력 중심(AC)에 위치함으로써 26%의 정적 안정성이 보장되었다.",
				"issue": "2",
				"libraryCatalog": "www.dbpia.co.kr",
				"pages": "180-185",
				"publicationTitle": "항공우주기술",
				"url": "https://www.dbpia.co.kr/Journal/articleDetail?nodeId=NODE02298184",
				"volume": "12",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "개념설계(Preliminary Design)"
					},
					{
						"tag": "공기역학적 성능(Aerodynamic Performance)"
					},
					{
						"tag": "인간동력 항공기(Human Powered Aircraft)"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.dbpia.co.kr/journal/articleDetail?nodeId=NODE06648914&language=ko_KR",
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
				"date": "2016/02",
				"DOI": "10.21562/kjs.2016.02.50.1.41",
				"ISSN": "1225-0120",
				"abstractNote": "이 논문의 목적은 일탈행위의 사회학에 기초하여 한국 청소년의 일탈행위가 다문화가족 유형에 따라 다른지에 관한 이론적 가설을 도출하고, 이를 경험적으로 검증하는 것이다. 분석 자료로 2011년부터 2014년까지 수집된 청소년건강행태온라인조사를 활용하였다. 이 논문에서는 가족유형을 양 부모 한국출생, 어머니만 외국출생, 아버지만 외국출생, 양 부모 외국출생으로 분류하였고, 흡연, 음주, 인터넷 중독, 성관계 경험, 약물남용으로 일탈행위를 측정하였다. 각 일탈행위에 있어서의 차이에 더해 항목응답이론(item response theory)에 근거한 일탈행위성향을 측정한 후 집단별 일탈행위성향의 차이를 분석하였다. 분석결과, 어머니만 외국출생인 청소년은 양 부모가 한국출생인 청소년에 비해 인터넷 중독 위험이 높았으나 다른 일탈행위에 있어서는 다르지 않았고, 음주경험에서는 오히려 낮았다. 아버지만 외국출생인 청소년은 양 부모가 한국출생인 청소년에 비해 성관계 경험이나 약물남용 위험이 높았으나 다른 일탈행위에서는 차이를 보이지 않았다. 양 부모가 외국출생인 청소년은 양 부모가 한국출생인 청소년에 비해 음주를 제외한 모든 일탈행위에서 커다란 위험에 놓여 있었다. 이러한 분석결과는 다문화가족 청소년들이 처한 가족 및 사회적 환경이 하위 유형에 따라 다르기 때문에 각 집단에 알맞은 사회 통합 정책이 고안되어야함을 시사한다.",
				"issue": "1",
				"libraryCatalog": "www.dbpia.co.kr",
				"pages": "41-74",
				"publicationTitle": "한국사회학",
				"url": "https://www.dbpia.co.kr/Journal/articleDetail?nodeId=NODE06648914",
				"volume": "50",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Adolescents of multi-cultural families"
					},
					{
						"tag": "juvenile delinquency"
					},
					{
						"tag": "sociological theories of delinquency"
					},
					{
						"tag": "다문화가족 청소년"
					},
					{
						"tag": "사회학적 일탈론"
					},
					{
						"tag": "일탈"
					},
					{
						"tag": "일탈행위성향"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.dbpia.co.kr/search/topSearch?startCount=0&collection=ALL&range=A&searchField=ALL&sort=RANK&query=flight&srchOption=*&includeAr=false&searchOption=*",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
