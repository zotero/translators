{
	"translatorID": "01c3f3d1-95d2-46e6-be73-c783470ab9fb",
	"label": "HKET",
	"creator": "Andy Kwok",
	"target": "^https?://([^/]+\\.)?hket\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-12-18 04:30:03"
}

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2022 YOUR_NAME <- TODO

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
	// TODO: adjust the logic here
	if (url.includes('/article/')) {
		return 'newspaperArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// TODO: adjust the CSS selector
	var rows = doc.querySelectorAll('h2 > a.title[href*="/article/"]');
	for (let row of rows) {
		// TODO: check and maybe adjust
		let href = row.href;
		// TODO: check and maybe adjust
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
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		// TODO adjust if needed:
		
		// title
		var titleSplit = item.title.split("-");
		item.section = titleSplit.pop();
		item.title = titleSplit[0];

		//clean up author
		item.creators = null;

		item.publicationTitle = '經濟日報';
		item.place = '香港';
		item.libraryCatalog = 'hket.com';
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'newspaperArticle';
	// TODO map additional meta tags here, or delete completely
	em.addCustomFields({
		'twitter:description': 'abstractNote'
	});
	await em.doWeb(doc, url);
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://paper.hket.com/article/3671830",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "發展智慧醫院 浸會醫院醫療專業備受肯定",
				"abstractNote": "傳承關愛傳統 發展智慧醫院常說60年是一甲子，浸會醫院陪伴香港由工業蓬勃發展，走到今天的創科新世代，不變的是始終秉承「全人醫治 ‧ 榮神益人」的服務宗旨，時刻為病人做到最好，致使在不斷引入嶄新醫療科技",
				"language": "zh-Hant",
				"libraryCatalog": "hket.com",
				"place": "香港",
				"publicationTitle": "經濟日報",
				"section": "特約",
				"url": "https://paper.hket.com/article/3671830",
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
		"url": "https://inews.hket.com/article/3673187",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "【港股市況】商湯挫近12% 東方甄選反彈15% 航運股造好 恒指半日跌158點（不斷更新）",
				"abstractNote": "港股半日跌逾百點。恒指低開122點，開市後曾跌187點，低見16605點。恒指半日跌158點，報16633點，成交489.6億元。科指跌1.2%，報3736點。ATM個別發展，阿里巴巴（09988）升",
				"language": "zh-Hant",
				"libraryCatalog": "hket.com",
				"place": "香港",
				"publicationTitle": "經濟日報",
				"section": "股市",
				"url": "https://inews.hket.com/article/3673187",
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
		"url": "https://paper.hket.com/article/3672660",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "廟街夜市開鑼旺場 32美食檔激活氛圍 半年後檢視成效 檔主看俏盼開至凌晨",
				"abstractNote": "旅發局與廟街販商商會合辦的「廟街夜市」，昨晚7時半正式開鑼，為期半年，夜市美食街在佐敦道至南京街一段約百米街道，共有32個特色美食及懷舊小食攤檔。昨晚首天開放已人頭湧湧，部分食品提早售罄，檔主均對人流",
				"language": "zh-Hant",
				"libraryCatalog": "hket.com",
				"place": "香港",
				"publicationTitle": "經濟日報",
				"section": "港聞",
				"url": "https://paper.hket.com/article/3672660",
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
