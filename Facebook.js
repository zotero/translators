{
	"translatorID": "8ae0eca8-55a7-4b22-9cfd-a8b1dcdd4c33",
	"label": "Facebook",
	"creator": "Andy Kwok",
	"target": "^https?://(www\\.)?facebook\\.com",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-12-18 03:32:53"
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
	if (url.includes('/posts/')) {
		return 'forumPost';
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
		// item.section = 'News';

		/*
		splitTitle = item.title.split("-");
		item.title = splitTitle[0];
		item.creators.push({lastName: splitTitle[1], creatorType: "author", fieldMode: 1});
		*/
		
		item.postType = "text";
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'forumPost';
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
		"url": "https://www.facebook.com/angelica.healing.space/posts/pfbid027r9CEPHSA747fY5M3a4MknpMkjeud9ijuSuLQi5pghEja3su9wDuCGyNUZac16Ldl",
		"items": [
			{
				"itemType": "forumPost",
				"title": "跟下風😊... - Angelica Healing Space 天使草·療癒·空間",
				"creators": [],
				"abstractNote": "跟下風😊 如果你有緣睇到呢個po，就算有無點嚟玩過，無論是感覺好還是唔好，都喺下面分享一個同Angelica有關係嘅回憶，讓我們一起review and move forward 🙌 感謝在這裡遇上的每一位，感恩一切的交織、co-creation🌹 願平安健康智慧常伴著你們❤️...",
				"language": "en",
				"postType": "text",
				"url": "https://www.facebook.com/angelica.healing.space/posts/%E8%B7%9F%E4%B8%8B%E9%A2%A8%E5%A6%82%E6%9E%9C%E4%BD%A0%E6%9C%89%E7%B7%A3%E7%9D%87%E5%88%B0%E5%91%A2%E5%80%8Bpo%E5%B0%B1%E7%AE%97%E6%9C%89%E7%84%A1%E9%BB%9E%E5%9A%9F%E7%8E%A9%E9%81%8E%E7%84%A1%E8%AB%96%E6%98%AF%E6%84%9F%E8%A6%BA%E5%A5%BD%E9%82%84%E6%98%AF%E5%94%94%E5%A5%BD%E9%83%BD%E5%96%BA%E4%B8%8B%E9%9D%A2%E5%88%86%E4%BA%AB%E4%B8%80%E5%80%8B%E5%90%8Cangelica%E6%9C%89%E9%97%9C%E4%BF%82%E5%98%85%E5%9B%9E%E6%86%B6%E8%AE%93%E6%88%91%E5%80%91%E4%B8%80%E8%B5%B7review-and-move-forw/544766257673246/",
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
		"url": "https://www.facebook.com/ralph5973/posts/pfbid0mTWHqhFzqpnzE8tG76hmsNW3c17La8dmzT1qFWrqRXbdT6KEcWrGBczczTs7AfgDl",
		"items": [
			{
				"itemType": "forumPost",
				"title": "Rudolf Young - 墮落型喝咖啡法...",
				"creators": [],
				"abstractNote": "墮落型喝咖啡法 有讀者提議我，喝咖啡時除了加鮮奶以及鮮乳油提味外，也可以加三花奶水以及三花煉乳，進行墮落式喝法。 我很感謝讀者同學的好意，提議與分享經驗，但殊不知我是從七歲開始就已經墮落到這種程度了。唯一的差別是，以前的生鮮奶油是用總統牌，現在改為阿拉牌。 生鮮奶油 英文Whipped cream...",
				"language": "en",
				"postType": "text",
				"url": "https://www.facebook.com/ralph5973/posts/%E5%A2%AE%E8%90%BD%E5%9E%8B%E5%96%9D%E5%92%96%E5%95%A1%E6%B3%95%E6%9C%89%E8%AE%80%E8%80%85%E6%8F%90%E8%AD%B0%E6%88%91%E5%96%9D%E5%92%96%E5%95%A1%E6%99%82%E9%99%A4%E4%BA%86%E5%8A%A0%E9%AE%AE%E5%A5%B6%E4%BB%A5%E5%8F%8A%E9%AE%AE%E4%B9%B3%E6%B2%B9%E6%8F%90%E5%91%B3%E5%A4%96%E4%B9%9F%E5%8F%AF%E4%BB%A5%E5%8A%A0%E4%B8%89%E8%8A%B1%E5%A5%B6%E6%B0%B4%E4%BB%A5%E5%8F%8A%E4%B8%89%E8%8A%B1%E7%85%89%E4%B9%B3%E9%80%B2%E8%A1%8C%E5%A2%AE%E8%90%BD%E5%BC%8F%E5%96%9D%E6%B3%95%E6%88%91%E5%BE%88%E6%84%9F%E8%AC%9D%E8%AE%80%E8%80%85%E5%90%8C%E5%AD%B8%E7%9A%84%E5%A5%BD%E6%84%8F%E6%8F%90%E8%AD%B0%E8%88%87%E5%88%86%E4%BA%AB%E7%B6%93%E9%A9%97%E4%BD%86%E6%AE%8A%E4%B8%8D%E7%9F%A5%E6%88%91%E6%98%AF%E5%BE%9E%E4%B8%83%E6%AD%B2%E9%96%8B%E5%A7%8B/10161286982399100/",
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
