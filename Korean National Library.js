{
	"translatorID": "b077ea16-c6d6-48f8-906a-05a193da4c2f",
	"label": "Korean National Library",
	"creator": "Sebastian Karcher",
	"target": "^https?://www\\.nl\\.go\\.kr/(EN|NL)/contents/(eng)?[sS]earch\\.do",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-12-28 02:37:11"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Sebastian Karcher

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
	if (url.includes('viewKey=')) {
		let type = text(doc, 'h3.detail_tit>span.tit_top');
		if (!type) return "book";
		return getType(type);
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getType(type) {
	switch (type) {
		case "[이미지/사진]":
			return "artwork";
		case "[기사]":
		case "[Article]":
		case "[잡지/학술지]":
		case "[Magazine/Academic Journal]":
			return "journalArticle";
		case "[학위논문]":
		case "[Monograph]":
			return "thesis";
		case "[신문]":
		case "[Newspaper]":
			return "newspaperArticle";
		case "[음악자료]":
		case "[Music Album]":
			return "audioRecording";
		case "[영상자료]":
		case "[Videos]":
			return "videoRecording";
		case "[웹사이트]":
		case "[Website Retention Material]":
			return "webpage";
		default:
			return "book";
	}
}

function fixKoreanCreators(creators) {
	for (let i = 0; i < creators.length; i++) {
		var len = creators[i].lastName.length;
		var regex = "[\\p{hangul}\\{han}]{" + len + "}";
		var korean = new ZU.XRegExp(regex);
		if (creators[i].firstName) continue; // likely a Western name
		else if (len > 3) continue; // likely Japanese name
		else if (ZU.XRegExp.test(creators[i].lastName, korean)) {
			// name is almost certainly Korean. First character is lastName
			creators[i].firstName = creators[i].lastName.replace(/^./, "");
			creators[i].lastName = creators[i].lastName.replace(/^(.).*/, "$1");
		}
	}
	return creators;
}

function fixTitleCapitalization(title) {
	if (title == title.toUpperCase()) {
		title = ZU.capitalizeTitle(title, true);
	}
	return title;
}

function fixTags(tags) {
	var extraTags = [];
	for (let i = 0; i < tags.length; i++) {
		if (/.+\[.+\]/.test(tags[i])) {
			let extraTag = tags[i].match(/\[(.+)\]/)[1];
			extraTags.push(extraTag);
			tags[i] = tags[i].replace(/\[.+\]/, "");
		}
	}
	return tags.concat(extraTags);
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;

	var rows = doc.querySelectorAll('div.search_right_section  a.detail_btn_layer');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (items) {
			await Promise.all(
				Object.keys(items)
					.map(url => scrape(url))
			);
		}
	}
	else {
		await scrape(url);
	}
}

async function scrape(url) {
	let viewKey = url.match(/viewKey=([^&]+)/)[1];
	var modsURL, marcURL;
	if (viewKey.startsWith("CNTS")) {
		modsURL = "https://www.nl.go.kr/NL/search/mods_view.do?contentsId=" + viewKey;
	}
	else if (/^\d+$/.test(viewKey)) {
		marcURL = `https://www.nl.go.kr/NL/marcDownload.do?downData=${viewKey},AH1`;
	}

	
	if (modsURL) {
		let modsText = await requestText(modsURL);
		// Z.debug(modsText)
		// replace the Korean resourceType and genre with corresponding English terms
		modsText = modsText.replace("<typeOfResource>텍스트</typeOfResource>", "<typeOfResource>text</typeOfResource>")
						.replace("<typeOfResource>동영상</typeOfResource>", "<typeOfResource>moving image</typeOfResource>")
						.replace("<typeOfResource>이미지</typeOfResource>", "<typeOfResource>still image</typeOfResource>")
						.replace("<typeOfResource>사운드</typeOfResource>", "<typeOfResource>sound recording</typeOfResource>")
						.replace("<typeOfResource>인터랙티브자원</typeOfResource>", "<typeOfResource>software, multimedia</typeOfResource>");


		modsText = modsText.replace("<genre>일반도서</genre>", "<genre>book</genre>")
						.replace("<genre>학술논문</genre>", "<genre>article</genre>")
						.replace("<genre>연속간행물</genre>", "<genre>periodical</genre>")
						.replace("<genre>신문</genre>", "<genre>newspaper</genre>")
						.replace("<genre>사전</genre>", "<genre>book</genre>")
						.replace("<genre>사진</genre>", "<genre>picture</genre>")
						.replace("<genre>음악</genre>", "<genre>sound</genre>")
						.replace(/<genre>학위논문.*<\/genre>/, "<genre>thesis</genre>")
						.replace("<genre>웹사이트</genre>", "<genre>web site</genre>")
						.replace("<genre>웹사이트</genre>", "<genre>web site</genre>");
		// unmapped: 복합기록물 (composite record); 기록물 (record, likely archival)

		// we get the creator straight from MODS
		//  to fix author strings like "Botvinnik B,  Gilkey P,  Stolz S"
		let modsTextAlt = modsText.replace(/<mods.+?>/, "<mods>");
		var xml = (new DOMParser()).parseFromString(modsTextAlt, "text/xml");
		var creatorRegex = /^[A-Z][a-z]+\s[A-Z](,|$)/;
		var creatorNodes = ZU.xpath(xml, '//name');
		
		let translator = Zotero.loadTranslator('import');
		translator.setTranslator('0e2235e7-babf-413c-9acf-f27cce5f059c'); // MODS
		translator.setString(modsText);
		translator.setHandler('itemDone', (_obj, item) => {
			if (item.date) {
				// dates are in YYYYMMDD format
				item.date = ZU.strToISO(item.date.replace(/(\d{4})(\d{2})?(\d{2})?[-]*/, "$1-$2-$3"));
			}
			item.tags = fixTags(item.tags);

			// fixing poor quality MODS author data
			if (creatorNodes.length == 1 && item.creators.length == 1 && creatorRegex.test(ZU.xpathText(xml, '//name'))) {
				let creatorType = item.creators[0].creatorType;
				item.creators = [];

		
				let creators = ZU.xpathText(xml, '//name').split(", ");
				for (let creator of creators) {
					let lastName = creator.match(/^(.+)\s/);
					let firstName = creator.match(/.$/);
					if (lastName && firstName) {
						item.creators.push({ firstName: firstName[0], lastName: lastName[1], creatorType: creatorType });
					}
					else {
						item.creators.push({ lastName: creator, fieldMode: 1, creatorType: creatorType });
					}
				}
			}
			item.creators = fixKoreanCreators(item.creators);
			item.title = fixTitleCapitalization(item.title);
			item.complete();
		});
		await translator.translate();
	}
	else if (marcURL) {
		let marcText = await requestText(marcURL);
		let translator = Zotero.loadTranslator('import');
		translator.setTranslator('a6ee60df-1ddc-4aae-bb25-45e0537be973');
		translator.setString(marcText);
		translator.setHandler('itemDone', (_obj, item) => {
			item.creators = fixKoreanCreators(item.creators);
			item.tags = fixTags(item.tags);
			item.complete();
		});
		await translator.translate();
	}
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.nl.go.kr/EN/contents/engSearch.do?resultType=&pageNum=1&pageSize=30&order=&sort=&srchTarget=total&kwd=lawson&systemType=&lnbTypeName=&category=%ED%95%99%EC%9C%84%EB%85%BC%EB%AC%B8&hanjaFlag=&reSrchFlag=&licYn=&kdcName1s=&manageName=&langName=&ipubYear=&pubyearName=&seShelfCode=&detailSearch=&seriesName=&mediaCode=&offerDbcode2s=&f1=&v1=&f2=&v2=&f3=&v3=&f4=&v4=&and1=&and2=&and3=&and4=&and5=&and6=&and7=&and8=&and9=&and10=&and11=&and12=&isbnOp=&isbnCode=&guCode2=&guCode3=&guCode4=&guCode5=&guCode6=&guCode7=&guCode8=&guCode11=&gu2=&gu7=&gu8=&gu9=&gu10=&gu12=&gu13=&gu14=&gu15=&gu16=&subject=&sYear=&eYear=&sRegDate=&eRegDate=&typeCode=&acConNo=&acConNoSubject=&infoTxt=#viewKey=CNTS-00082435719&viewType=C&category=%ED%95%99%EC%9C%84%EB%85%BC%EB%AC%B8&pageIdx=19&jourId=",
		"items": [
			{
				"itemType": "thesis",
				"title": "장모-사위 갈등에 관련된 제변인 연구",
				"creators": [
					{
						"firstName": "정은",
						"lastName": "원",
						"creatorType": "author"
					}
				],
				"date": "2016",
				"archiveLocation": "국립중앙도서관",
				"callNumber": "332.24",
				"language": "kor; eng",
				"libraryCatalog": "Korean National Library",
				"numPages": "99",
				"place": "서울",
				"rights": "0",
				"university": "성신여자대학교",
				"attachments": [],
				"tags": [
					{
						"tag": "丈母"
					},
					{
						"tag": "家族關係"
					},
					{
						"tag": "가족 관계"
					},
					{
						"tag": "사위(혼인)"
					},
					{
						"tag": "장모(어머니)"
					},
					{
						"tag": "女壻"
					}
				],
				"notes": [
					{
						"note": "thesis: 학위논문(박사) -- 성신여자대학교 대학원, 생활문화소비자학과, 2016"
					},
					{
						"note": "language: 영어 요약 있음"
					},
					{
						"note": "bibliography: 참고문헌: p. [111]-[123]"
					},
					{
						"note": "지도교수: 김주희권말부록: 질문지 등"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nl.go.kr/EN/contents/engSearch.do?srchTarget=total&pageNum=1&pageSize=10&kwd=%EB%AF%B8%EA%B5%B0%EC%A0%95%EA%B3%BC%ED%95%9C%EA%B5%AD%EC%9D%98%EB%AF%BC%EC%A3%BC%EC%A3%BC%EC%9D%98#viewKey=CNTS-00092958535&viewType=C&category=%EB%8F%84%EC%84%9C&pageIdx=1&jourId=",
		"items": [
			{
				"itemType": "book",
				"title": "미군정과 한국의 민주주의",
				"creators": [
					{
						"firstName": "진",
						"lastName": "안",
						"creatorType": "author"
					}
				],
				"date": "2005",
				"ISBN": "9788946034662",
				"callNumber": "911.071, 951.904",
				"language": "kor",
				"libraryCatalog": "Korean National Library",
				"numPages": "436",
				"place": "파주",
				"publisher": "한울",
				"rights": "3",
				"series": "한울아카데미",
				"seriesNumber": "803",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "권말부록으로 \"반민족행위처벌법\" 수록"
					},
					{
						"note": "bibliography: 참고문헌: p.[390]-422, 색인수록"
					},
					{
						"note": "Table of Contents: 목차표지 = 0,1,0표제지 = 0,3,0책을 내면서 / 안진 = 0,5,0차례 = 0,10,0약어 목록(List of Abbreviations) = 0,14,0서론 : 미군정 연구의 범위와 방법 = 0,15,0제1부 분단국가의 형성과 미군정 = 0,49,0 제1장 해방 직후의 사회상황과 미국의 대한(對韓) 점령정책 = 0,51,0  1. 전후 세계체제의 변화와 해방의 성격 = 0,51,0  2. 해방 직후의 사회상황과 역사적 과제 = 0,56,0  3. 미군정의 성립과 미국의 점령정책 = 0,63,0  4. 미군의 진주 = 0,69,0 제2장 분단국가의 형성과 미국 = 0,72,0  1. 한미관계를 보는 시각 = 0,72,0  2. 미군정의 정책과 분단국가의 형성 = 0,83,0  3. 해방 직후 민족독립국가 수립운등: 임정과 건준 = 0,98,0  4. 해방 직후 사회세력들의 갈등과 미군정 = 0,119,0  5. 미군정의 동맹세력의 성장과 그 성격 = 0,139,0  6. 미군정 통치기구의 형성과 지배집단의 재편과정 = 0,144,0제2부 미군정 억압기구의 재편 = 0,155,0 제3장 미군정 행정관료제의 재편 = 0,157,0  1. 행정 관료기구의 재조직 과정 = 0,157,0  2. 관료의 충원과 그 특징 = 0,166,0  3. 군정 관료제의 특징 = 0,178,0찰의 재편과 그 성격 = 0,181,0  1. 군정경찰의 조직 = 0,181,0  2. 군정경찰의 충원 = 0,190,0  3. 군정경찰의 활동 = 0,193,0  4. 군정경찰의 특성 = 0,202,0 제5장 조선국방경비대의 창설과 성격 = 0,204,0  1. 해방 직전 해외무장독립군의 활동상황 = 0,204,0  2. 해방 직후 사설군사단체의 현황 = 0,207,0  3. 조선국방경비대의 창설과 충원 = 0,217,0 제6장 군정사법체제의 재편과정 = 0,225,0  1. 미군정의 법적 지위와 군정법령들의 주요내용 = 0,225,0  2. 군정 사법체제의 재편 = 0,235,0  3. 사법부 관료의 충원 = 0,242,0  4. 미군정 사법체제의 기능과 특성 = 0,250,0 제7장 미군정 국가기구 형성의 특징 = 0,253,0  1. 국가기구 형성의 구조적 조건 = 0,253,0  2. 미군정 국가기구 형성의 특징 = 0,256,0  3. 이론적 논의 = 0,260,0제3부 미군정의 경찰과 군 간부 = 0,265,0 제8장 미군정청 경무부장 조병옥 : 미군정하 한국인 최고권력자 = 0,267,0  1. 친미적 정치성향의 형성 배경 = 0,267,0  2. 신간회, 동우회 활동 = 0,269,0  3. 미군정 경무국장에 발탁된 한민당 총무 = 0,270,0  4. 집권세력에 타협적인 야당투사 = 0,278,0 제9장 미군정청 군사고문 이응준 : 군국주의 정신 투철한 일본군 대좌에서 창군의 주역으로 = 0,285,0  1. 미군정의 점령정책과 창군 = 0,285,0  2. 일본육사 출신의 조선인 대좌 = 0,286,0  3. 가족군인의 전형 = 0,289,0  4. 철저한 군국주의 정신의 일본군인 = 0,291,0  5. 대한민국 군대창설을 맡은 미군정청 군사고문 = 0,293,0 제10장 미군정청 경무부 수사국장 최능진: 친일경찰 숙청 주장했던 미군정 경찰간부 = 0,297,0  1. 동우회(同友會) 활동 = 0,298,0  2. 평남 건준 치안부장 = 0,300,0  3. 친일경찰 축출을 둘러싼 갈등 = 0,303,0  4. 서재필 추대운동 = 0,308,0  5. 이승만과의 대결: 5·10선거 출마의 좌절 = 0,310,0  6. 이승만의 정치적 보복과 투옥 = 0,314,0  7. 한국전쟁 중 '정전, 평화통일운동' = 0,315,0  8. 최능진의 정치사상과 민족주의 = 0,317,0 제11장 미군정청 수도경찰청 수사과장 노덕술 : 반민특위 요인 암살을 조종한 친일경찰의 거두 = 0,323,0  1. 친일경찰의 거두 = 0,323,0  2. 일경(日警)의 호랑이, 훈7등 종7위(勳7等 從7位) 훈장의 극악한 친일경력 = 0,324,0  3. 되살아난 고문의 악습 = 0,326,0  4. 반민특위 간부 암살 음모 = 0,328,0  5. 노덕술의 체포와 친일경찰의 저항 = 0,331,0 제12장 미군정 전남 경찰위원장 노주봉 : 해방 직후 암살된 친일경찰의 거두 = 0,337,0  1. 암살된 친일경찰 간부 = 0,337,0  2. 도 경찰부장으로 발탁된 친일경찰 = 0,338,0  3. 학생들에게 잔인했던 악명 높은 친일경찰 = 0,343,0  4. 암살된 친일경찰의 뒷이야기 = 0,348,0 보론 : 해방 후 친일파 처벌논의 = 0,351,0  1. 머리말 = 0,351,0  2. 미군정기 친일파 처벌에 관한 제논의 = 0,353,0  3. 정부수립 후「반민족행위처벌법」의 제정과 집행 = 0,370,0  4. 반민특위의 해체와「반민족행위처벌법」의 페지과정 = 0,377,0  5. 친일파 처벌의 구조적 제약요인 : 미군정 정책 = 0,384,0  6. 맺음말 = 0,386,0부록 : 반민족행위처벌법 = 0,388,0참고문헌 = 0,392,0찾아보기 = 0,425,0［저자소개］ = 0,433,0판권지 = 0,434,0［광고］ = 0,435,0뒤표지 = 0,436,0"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nl.go.kr/EN/contents/engSearch.do?srchTarget=total&pageNum=1&pageSize=10&kwd=%EB%AF%B8%EA%B5%B0%EC%A0%95%EA%B3%BC%ED%95%9C%EA%B5%AD%EC%9D%98%EB%AF%BC%EC%A3%BC%EC%A3%BC%EC%9D%98#viewKey=58200726&viewType=AH1&category=%EB%8F%84%EC%84%9C&pageIdx=2&jourId=",
		"items": [
			{
				"itemType": "book",
				"title": "미군정과 한국의 민주주의=",
				"creators": [
					{
						"firstName": "진",
						"lastName": "안",
						"creatorType": "author"
					}
				],
				"date": "2005",
				"ISBN": "9788946034662",
				"callNumber": "951.904",
				"libraryCatalog": "Korean National Library",
				"numPages": "430",
				"place": "파주",
				"publisher": "한울",
				"series": "한울아카데미",
				"seriesNumber": "803",
				"attachments": [],
				"tags": [
					{
						"tag": "美軍政時代"
					},
					{
						"tag": "미군정 시대"
					},
					{
						"tag": "미군정 한국 민주주의"
					}
				],
				"notes": [
					{
						"note": "권말부록으로 \"반민족행위처벌법\" 수록"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nl.go.kr/NL/contents/search.do?srchTarget=total&pageNum=1&pageSize=10&kwd=%EB%AF%B8%EA%B5%B0%EC%A0%95%EA%B3%BC+%ED%95%9C%EA%B5%AD%EC%9D%98+%EB%AF%BC%EC%A3%BC%EC%A3%BC%EC%9D%98",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.nl.go.kr/EN/contents/engSearch.do?resultType=&pageNum=1&pageSize=30&order=&sort=&srchTarget=total&kwd=smith&systemType=%EC%98%A8%EB%9D%BC%EC%9D%B8%EC%9E%90%EB%A3%8C&lnbTypeName=&category=%EB%A9%80%ED%8B%B0%EB%AF%B8%EB%94%94%EC%96%B4&hanjaFlag=&reSrchFlag=&licYn=&kdcName1s=&manageName=&langName=&ipubYear=&pubyearName=&seShelfCode=&detailSearch=&seriesName=&mediaCode=&offerDbcode2s=&f1=&v1=&f2=&v2=&f3=&v3=&f4=&v4=&and1=&and2=&and3=&and4=&and5=&and6=&and7=&and8=&and9=&and10=&and11=&and12=&isbnOp=&isbnCode=&guCode2=&guCode3=&guCode4=&guCode5=&guCode6=&guCode7=&guCode8=&guCode11=&gu2=&gu7=&gu8=&gu9=&gu10=&gu12=&gu13=&gu14=&gu15=&gu16=&subject=&sYear=&eYear=&sRegDate=&eRegDate=&typeCode=&acConNo=&acConNoSubject=&infoTxt=#viewKey=CNTS-00098977147&viewType=C&category=%EB%A9%80%ED%8B%B0%EB%AF%B8%EB%94%94%EC%96%B4&pageIdx=17&jourId=",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "두 단어 영어로 쉽게 대답하기 step 1. 별일 없이 지내. / Smith씨하고 통화할 수 있을까요?",
				"creators": [
					{
						"firstName": "정현",
						"lastName": "조",
						"creatorType": "director"
					}
				],
				"date": "2017",
				"abstractNote": "영어 초보자는 말을 길게 하고 싶어도 문법을 생각해야지 발음도 신경 써야지 입 밖으로 말 한마디 꺼내지 못하고 발만 동동 구를 때가 많습니다. 하지만 이제는 두려워하지 마세요. 짧은 단 한두 마디 단어로도 충분히 의사소통이 가능하고 말을 길게 하는 것보다 오히려 영어를 더 잘한다는 얘기를 들을 수 있습니다. 이젠 짧게 말하고도 당당하게 영어 회화의 고민을 시원하게 해결해 드립니다.",
				"archiveLocation": "국립중앙도서관",
				"callNumber": "740.77",
				"language": "kor",
				"libraryCatalog": "Korean National Library",
				"place": "서울",
				"rights": "국립중앙도서관, 정기이용증 소지자 공개, 8",
				"studio": "삼육오",
				"url": "http://e-contents.nl.go.kr:8071/hanulls/2017_KS49/2017_VIDEO_SANHAK_CP20174904.WMV",
				"attachments": [],
				"tags": [
					{
						"tag": "英語會話"
					},
					{
						"tag": "영어 회화"
					}
				],
				"notes": [
					{
						"note": "system details: 시스템사양: 화면비율, 720:416"
					},
					{
						"note": "Table of Contents: 4 별일 없이 지내. / Smith씨하고 통화할 수 있을까요?"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nl.go.kr/EN/contents/engSearch.do?resultType=&pageNum=1&pageSize=30&order=&sort=&srchTarget=total&kwd=lawson&systemType=&lnbTypeName=&category=&hanjaFlag=&reSrchFlag=&licYn=&kdcName1s=&manageName=&langName=&ipubYear=&pubyearName=&seShelfCode=&detailSearch=&seriesName=&mediaCode=&offerDbcode2s=&f1=&v1=&f2=&v2=&f3=&v3=&f4=&v4=&and1=&and2=&and3=&and4=&and5=&and6=&and7=&and8=&and9=&and10=&and11=&and12=&isbnOp=&isbnCode=&guCode2=&guCode3=&guCode4=&guCode5=&guCode6=&guCode7=&guCode8=&guCode11=&gu2=&gu7=&gu8=&gu9=&gu10=&gu12=&gu13=&gu14=&gu15=&gu16=&subject=&sYear=&eYear=&sRegDate=&eRegDate=&typeCode=&acConNo=&acConNoSubject=&infoTxt=#viewKey=CNTS-00068016306&viewType=C&category=%EC%8B%A0%EB%AC%B8&pageIdx=1&jourId=",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "MR. LAWSON-PANIC MAKER",
				"creators": [],
				"date": "1905-02-18",
				"archiveLocation": "국립중앙도서관",
				"callNumber": "084",
				"language": "kor",
				"libraryCatalog": "Korean National Library",
				"place": "서울",
				"publicationTitle": "大韓每日申報",
				"rights": "0",
				"attachments": [],
				"tags": [
					{
						"tag": "국외"
					},
					{
						"tag": "사회"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nl.go.kr/EN/contents/engSearch.do?resultType=&pageNum=1&pageSize=30&order=&sort=&srchTarget=total&kwd=lawson&systemType=&lnbTypeName=&category=%EB%A9%80%ED%8B%B0%EB%AF%B8%EB%94%94%EC%96%B4&hanjaFlag=&reSrchFlag=&licYn=&kdcName1s=&manageName=%EB%94%94%EC%A7%80%ED%84%B8%EB%8F%84%EC%84%9C%EA%B4%80&langName=&ipubYear=&pubyearName=&seShelfCode=&detailSearch=&seriesName=&mediaCode=&offerDbcode2s=&f1=&v1=&f2=&v2=&f3=&v3=&f4=&v4=&and1=&and2=&and3=&and4=&and5=&and6=&and7=&and8=&and9=&and10=&and11=&and12=&isbnOp=&isbnCode=&guCode2=&guCode3=&guCode4=&guCode5=&guCode6=&guCode7=&guCode8=&guCode11=&gu2=&gu7=&gu8=&gu9=&gu10=&gu12=&gu13=&gu14=&gu15=&gu16=&subject=&sYear=&eYear=&sRegDate=&eRegDate=&typeCode=&acConNo=&acConNoSubject=&infoTxt=#viewKey=CNTS-00070344711&viewType=C&category=%EB%A9%80%ED%8B%B0%EB%AF%B8%EB%94%94%EC%96%B4&pageIdx=14&jourId=",
		"items": [
			{
				"itemType": "audioRecording",
				"title": "LOSE YOUR MIND: feat.Yutaka Furukawa from DOPING PANDA",
				"creators": [
					{
						"firstName": "아",
						"lastName": "보",
						"creatorType": "performer"
					},
					{
						"firstName": "Damon",
						"lastName": "Sharpe",
						"creatorType": "performer"
					},
					{
						"lastName": "H-WONDER",
						"fieldMode": 1,
						"creatorType": "performer"
					},
					{
						"lastName": "GREG LAWSON",
						"fieldMode": 1,
						"creatorType": "performer"
					},
					{
						"lastName": "JONAS JEBERG",
						"fieldMode": 1,
						"creatorType": "performer"
					},
					{
						"lastName": "SIMON BRENTING",
						"fieldMode": 1,
						"creatorType": "performer"
					}
				],
				"date": "2007-12-12",
				"callNumber": "673.511",
				"libraryCatalog": "Korean National Library",
				"rights": "국립중앙도서관 공개, 2",
				"shortTitle": "LOSE YOUR MIND",
				"attachments": [],
				"tags": [
					{
						"tag": "大衆音樂"
					},
					{
						"tag": "대중 음악"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nl.go.kr/EN/contents/engSearch.do?resultType=&pageNum=1&pageSize=30&order=&sort=&srchTarget=total&kwd=smith&systemType=%EC%98%A8%EB%9D%BC%EC%9D%B8%EC%9E%90%EB%A3%8C&lnbTypeName=&category=%EB%A9%80%ED%8B%B0%EB%AF%B8%EB%94%94%EC%96%B4&hanjaFlag=&reSrchFlag=&licYn=&kdcName1s=&manageName=&langName=&ipubYear=&pubyearName=&seShelfCode=&detailSearch=&seriesName=&mediaCode=&offerDbcode2s=&f1=&v1=&f2=&v2=&f3=&v3=&f4=&v4=&and1=&and2=&and3=&and4=&and5=&and6=&and7=&and8=&and9=&and10=&and11=&and12=&isbnOp=&isbnCode=&guCode2=&guCode3=&guCode4=&guCode5=&guCode6=&guCode7=&guCode8=&guCode11=&gu2=&gu7=&gu8=&gu9=&gu10=&gu12=&gu13=&gu14=&gu15=&gu16=&subject=&sYear=&eYear=&sRegDate=&eRegDate=&typeCode=&acConNo=&acConNoSubject=&infoTxt=#viewKey=CNTS-00037185430&viewType=C&category=%EB%A9%80%ED%8B%B0%EB%AF%B8%EB%94%94%EC%96%B4&pageIdx=4&jourId=",
		"items": [
			{
				"itemType": "artwork",
				"title": "SMITH’S PHARMACY",
				"creators": [
					{
						"lastName": "저자미상",
						"fieldMode": 1,
						"creatorType": "artist"
					}
				],
				"date": "2009-01-19",
				"abstractNote": "이 올드 스타일의 금색으로 된 채널 레터(channel letter)가 이 스토어의 전통을 말해 준다.(이런 sign은 구식이니까 결과적으로는 역사가 길다는 의미가 된다) 중앙에 약을 가는 그릇인 유발 하나를 배치했다.",
				"archiveLocation": "국립중앙도서관",
				"callNumber": "658",
				"libraryCatalog": "Korean National Library",
				"rights": "2",
				"url": "http://www.bookrail.co.kr/data/ebook/nweb/P0907001/_data/900_530/067_008.jpg",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "표제출처: 꼬리에 꼬리를 무는 Sign배경지역: 이집트(Egypt), 카이로(Cairo)"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nl.go.kr/EN/contents/engSearch.do?resultType=&pageNum=1&pageSize=30&order=&sort=&srchTarget=total&kwd=lawson&systemType=&lnbTypeName=&category=&hanjaFlag=&reSrchFlag=&licYn=&kdcName1s=&manageName=%EB%94%94%EC%A7%80%ED%84%B8%EB%8F%84%EC%84%9C%EA%B4%80&langName=&ipubYear=&pubyearName=&seShelfCode=&detailSearch=&seriesName=&mediaCode=&offerDbcode2s=&f1=&v1=&f2=&v2=&f3=&v3=&f4=&v4=&and1=&and2=&and3=&and4=&and5=&and6=&and7=&and8=&and9=&and10=&and11=&and12=&isbnOp=&isbnCode=&guCode2=&guCode3=&guCode4=&guCode5=&guCode6=&guCode7=&guCode8=&guCode11=&gu2=&gu7=&gu8=&gu9=&gu10=&gu12=&gu13=&gu14=&gu15=&gu16=&subject=&sYear=&eYear=&sRegDate=&eRegDate=&typeCode=&acConNo=&acConNoSubject=&infoTxt=#viewKey=CNTS-00102120262&viewType=C&category=%EC%9B%B9%EC%82%AC%EC%9D%B4%ED%8A%B8&pageIdx=1&jourId=",
		"items": [
			{
				"itemType": "webpage",
				"title": "lawson.kr",
				"creators": [],
				"rights": "국립중앙도서관 공개, 2",
				"url": "http://lawson.kr/",
				"websiteTitle": "lawson.kr",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nl.go.kr/EN/contents/engSearch.do?resultType=&pageNum=1&pageSize=30&order=&sort=&srchTarget=total&kwd=lawson&systemType=&lnbTypeName=&category=&hanjaFlag=&reSrchFlag=&licYn=&kdcName1s=&manageName=&langName=&ipubYear=&pubyearName=&seShelfCode=&detailSearch=&seriesName=&mediaCode=&offerDbcode2s=&f1=&v1=&f2=&v2=&f3=&v3=&f4=&v4=&and1=&and2=&and3=&and4=&and5=&and6=&and7=&and8=&and9=&and10=&and11=&and12=&isbnOp=&isbnCode=&guCode2=&guCode3=&guCode4=&guCode5=&guCode6=&guCode7=&guCode8=&guCode11=&gu2=&gu7=&gu8=&gu9=&gu10=&gu12=&gu13=&gu14=&gu15=&gu16=&subject=&sYear=&eYear=&sRegDate=&eRegDate=&typeCode=&acConNo=&acConNoSubject=&infoTxt=#viewKey=CNTS-00091570741&viewType=C&category=%EA%B8%B0%EC%82%AC&pageIdx=2&jourId=",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Gromov-Lawson-Rosenberg Conjecture for Groups with Periodic Cohomology",
				"creators": [
					{
						"firstName": "B",
						"lastName": "Botvinnik",
						"creatorType": "author"
					},
					{
						"firstName": "P",
						"lastName": " Gilkey",
						"creatorType": "author"
					},
					{
						"firstName": "S",
						"lastName": " Stolz",
						"creatorType": "author"
					}
				],
				"date": "1997-07-01",
				"language": "eng",
				"libraryCatalog": "Korean National Library",
				"publicationTitle": "Journal of Differential Geometry. V.46 N.3",
				"rights": "2",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "자료 조회를 위해서는 별도 뷰어를 설치해야 합니다.뷰어 설치: https://www.cartesianinc.com/Products/CPCView/"
					},
					{
						"note": "LG상남도서관 기증 자료"
					},
					{
						"note": "Botvinnik B UNIV OREGON EUGENE, OR 97403 USA  UNIV NOTRE DAME NOTRE DAME, IN 46556 USA"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
