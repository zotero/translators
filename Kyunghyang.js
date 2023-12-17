{
	"translatorID": "febee9a3-4a86-42ef-87bb-31998806363b",
	"label": "Kyunghyang",
	"creator": "Kagami Sascha Rosylight",
	"target": "^https://\\w+\\.khan\\.co\\.kr/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-12-17 17:33:40"
}

/*
	***** BEGIN LICENSE BLOCK *****

	khan.co.kr (경향신문) Translator
	Copyright © 2023 Kagami Sascha Rosylight

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


/* global attr, text */

function detectWeb(doc, _url) {
	if (attr(doc, "meta[property='og:type']", "content") === "article") {
		return "newspaperArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	const items = {};
	let found = false;
	const rows = doc.querySelectorAll(".phArtc a");
	for (const row of rows) {
		const href = row.href;
		const title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator("web");
	// Embedded Metadata
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");

	translator.setHandler("itemDone", function (obj, item) {
		const author = attr(doc, 'meta[property="article:author"]', "content");
		if (author) {
			item.creators = author.split(", ").map(name => ({
				lastName: name,
				fieldMode: 1,
				creatorType: "author"
			}));
		}
		if (!doc.querySelector(".srch-kw")) {
			// The meta keywords tag only repeats the title,
			// unless .srch-kw exists in the page.
			item.tags = [];
		}
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "newspaperArticle";
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.khan.co.kr/national/national-general/article/202311301518001",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "[단독]메이플 ‘집게손가락’ 콘티, 남자가 그렸다[못 이긴 척, 여혐 앞장선 넥슨]",
				"creators": [
					{
						"lastName": "이홍근 기자",
						"fieldMode": 1,
						"creatorType": "author"
					},
					{
						"lastName": "정효진 기자",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2023-11-30T15:18:00+09:00",
				"abstractNote": "남초 커뮤니티로부터 집중포화를 맞은 ‘메이플스토리’ 여성 캐릭터 엔젤릭버스터(엔버)의 ‘집게손...",
				"language": "ko",
				"libraryCatalog": "www.khan.co.kr",
				"publicationTitle": "경향신문",
				"section": "사회",
				"url": "https://www.khan.co.kr/article/202311301518001",
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
		"url": "https://www.khan.co.kr/national/national-general/article/202311262002001",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "‘남성혐오 표현 있다’ 유저들 항의에 곧바로 머리 숙인 게임사",
				"creators": [
					{
						"lastName": "김세훈 기자",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2023-11-26T20:02:00+09:00",
				"abstractNote": "게임 홍보영상에 남성혐오 표현이 들어갔다는 이용자들의 항의가 이어지자 게임사 넥슨이 사과문을...",
				"language": "ko",
				"libraryCatalog": "www.khan.co.kr",
				"publicationTitle": "경향신문",
				"section": "사회",
				"url": "https://www.khan.co.kr/article/202311262002001",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "게임업계 사상검증"
					},
					{
						"tag": "넥슨"
					},
					{
						"tag": "페미니즘"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.khan.co.kr/national/national-general/article/202311271450011/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "‘남성혐오 표현’ 일부 유저 항의에 ‘진심으로 사과’한 게임사 [플랫]",
				"creators": [
					{
						"lastName": "플랫팀 기자",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2023-11-27T14:50:00+09:00",
				"abstractNote": "게임 홍보영상에 남성혐오 표현이 들어갔다는 이용자들의 항의가 이어지자 게임사 넥슨이 사과문을...",
				"language": "ko",
				"libraryCatalog": "www.khan.co.kr",
				"publicationTitle": "경향신문",
				"section": "사회",
				"url": "https://www.khan.co.kr/article/202311271450011",
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
		"url": "https://www.khan.co.kr/national/national-general/article/202311281040001/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "‘낙인’찍고, ‘신상’털고… 다시 시작된 게임업계의 ‘패턴화된 백래시’ [플랫]",
				"creators": [
					{
						"lastName": "플랫팀 기자",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2023-11-28T10:40:00+09:00",
				"abstractNote": "넥슨 게임 홍보영상에 삽입된 이미지를 두고 게임업계 내에서 페미니즘에 대한 공격이 확산하고 ...",
				"language": "ko",
				"libraryCatalog": "www.khan.co.kr",
				"publicationTitle": "경향신문",
				"section": "사회",
				"url": "https://www.khan.co.kr/article/202311281040001",
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
		"url": "https://search.khan.co.kr/search.html?sect=1&path=1&q=+%EB%84%A5%EC%8A%A8",
		"detectedItemType": "multiple",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "넥슨 | 통합 검색 - 경향신문",
				"creators": [],
				"abstractNote": "넥슨 | 경향신문 통합신문 검색 결과입니다.",
				"libraryCatalog": "search.khan.co.kr",
				"url": "https://search.khan.co.kr/search.html?sect=1&path=1&q=+%EB%84%A5%EC%8A%A8",
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
