{
	"translatorID": "58c22122-2de2-4f73-a214-8149018f2d65",
	"label": "Local Call",
	"creator": "Abe Jellinek",
	"target": "https://www\\.mekomit\\.co\\.il/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-11-06 21:22:28"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Abe Jellinek

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
	if (doc.querySelector('.single_post_in_bx')) {
		return 'blogPost';
	}
	else if ((url.includes('/author/') || url.includes('/search/')) && getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.search_result_left > a');
	if (!rows.length) rows = doc.querySelectorAll('.author_posts_feed_li > a:first-child');
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
		item.date = ZU.strToISO(item.date);

		item.creators = [];
		// Some crazy guessing here -- if the author string has four or more segments, try splitting
		// on each letter vav at the start of a word that isn't followed by another vav. Those are probably -
		// not definitely, but probably - "and"s
		let authorName = text(doc, '.post_details [rel="author"]');
		if (authorName.split(' ').length >= 4) {
			let parts = authorName.split(/ \u05d5(?!\u05d5)/);
			for (let part of parts) {
				item.creators.push(ZU.cleanAuthor(part, 'author'));
			}
		}
		else {
			item.creators.push(ZU.cleanAuthor(authorName, 'author'));
		}

		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'blogPost';
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.mekomit.co.il/%d7%a7%d7%a9%d7%94-%d7%9c%d7%99-%d7%a2%d7%9d-%d7%94%d7%93%d7%94-%d7%9c%d7%92%d7%99%d7%98%d7%99%d7%9e%d7%a6%d7%99%d7%94-%d7%95%d7%94%d7%a8%d7%a6%d7%95%d7%9f-%d7%9c%d7%94%d7%97%d7%91%d7%99%d7%90/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "\"קשה לי עם הדה-לגיטימציה והרצון להחביא דעות כמו שלי\"",
				"creators": [
					{
						"firstName": "אורן",
						"lastName": "זיו",
						"creatorType": "author"
					}
				],
				"date": "2023-11-06",
				"abstractNote": "זיו שטהל, ילידת כפר עזה, היתה בבית משפחתה בקיבוץ בבוקר 7 באוקטובר, כשהחלה המתקפה הרצחנית של חמאס. במשך 14 שעות התחבאה בממ\"ד עם בני משפחתה, ובהם בן זוגה של אחייניתה, שנפגע מירי, בהמתנה לחילוץ. בהמשך גילתה כי גיסתה מירה, שהתחבאה בבית אחר בקיבוץ, נרצחה. שטהל, בת 46 מתל אביב, עובדת ב-13 השנים האחרונות בארגון \"יש […]",
				"blogTitle": "שיחה מקומית",
				"language": "he-IL",
				"url": "https://www.mekomit.co.il/קשה-לי-עם-הדה-לגיטימציה-והרצון-להחביא/",
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
		"url": "https://www.mekomit.co.il/%d7%a0%d7%aa%d7%99%d7%91%d7%95%d7%aa-%d7%94%d7%a9%d7%9c%d7%95%d7%9d-%d7%94%d7%a4%d7%9b%d7%95-%d7%9c%d7%a0%d7%aa%d7%99%d7%91%d7%95%d7%aa-%d7%9e%d7%9c%d7%97%d7%9e%d7%94-%d7%9c%d7%aa%d7%95%d7%a8%d7%94/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "נתיבות השלום הפכו לנתיבות מלחמה, לתורה של נקם",
				"creators": [
					{
						"firstName": "ידידיה",
						"lastName": "שלום",
						"creatorType": "author"
					},
					{
						"firstName": "שמואל",
						"lastName": "גלמידי",
						"creatorType": "author"
					}
				],
				"date": "2023-10-18",
				"abstractNote": "\"שִׁמְעוֹן וְלֵוִי אַחִים כְּלֵי חָמָס מְכֵרֹתֵיהֶם: בְּסֹדָם אַל תָּבֹא נַפְשִׁי בִּקְהָלָם אַל תֵּחַד כְּבֹדִי כִּי בְאַפָּם הָרְגוּ אִישׁ וּבִרְצֹנָם עִקְּרוּ שׁוֹר: אָרוּר אַפָּם כִּי עָז וְעֶבְרָתָם כִּי קָשָׁתָה אֲחַלְּקֵם בְּיַעֲקֹב וַאֲפִיצֵם בְּיִשְׂרָאֵל\" (בראשית מט: ה-ז) אנו שקועים בימים אלה עד צוואר במים העכורים של שכול, כאב, אובדן וכעס בממדים בלתי נתפסים. אנו מתמודדים עם תחושת […]",
				"blogTitle": "שיחה מקומית",
				"language": "he-IL",
				"url": "https://www.mekomit.co.il/נתיבות-השלום-הפכו-לנתיבות-מלחמה-לתורה/",
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
		"url": "https://www.mekomit.co.il/search/?s=%D7%99%D7%A9%D7%A8%D7%90%D7%9C",
		"items": "multiple"
	}
]
/** END TEST CASES **/
