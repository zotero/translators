{
	"translatorID": "71285b71-1714-4b9a-a47f-6c52a2d1c273",
	"label": "Vas3k Club",
	"creator": "Ilya Zonov",
	"target": "^https://vas3k.club",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-03-08 19:10:27"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Ilya Zonov

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
	if (url.includes('/post/')) {
		return 'blogPost';
	}
	return false;
}

async function doWeb(doc, url) {
	await scrape(doc, url);
}

function parseDate(date) {
	const monthNames = {
		'января': '01',
		'февраля': '02',
		'марта': '03',
		'апреля': '04',
		'мая': '05',
		'июня': '06',
		'июля': '07',
		'августа': '08',
		'сентября': '09',
		'октября': '10',
		'ноября': '11',
		'декабря': '12'
	};

	const dateArray = date.trim().split(' ');
	const month = monthNames[dateArray[1]];

	if (month) {
		return ZU.strToISO(`${dateArray[2]}-${month}-${dateArray[0]}`);
	}

	return date;
}

async function scrape(doc, url) {
	const translator = Zotero.loadTranslator('web');

	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		item.itemType = detectWeb(doc, url) || "webpage";
		
		const date = text(doc, 'header div.post-actions-line span');
		item.date = parseDate(date);

		const authors = doc.querySelectorAll('header > div.post-author > a > span.user-name');
		for (const author of authors) {
			item.creators.push(ZU.cleanAuthor(author.textContent, "author"));
		}

		item.complete();
	});

	translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://vas3k.club/post/27748/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Твердая научная фантастика: наука vs литература",
				"creators": [
					{
						"firstName": "Mikhail",
						"lastName": "Korobko",
						"creatorType": "author"
					}
				],
				"date": "2025-03-07",
				"abstractNote": "Я много читаю, и научная фантастика составляет большую часть моего читательского рациона. Часто НФ делят по шкале Бристоля твердости на основании бал…",
				"blogTitle": "Вастрик.Клуб",
				"language": "ru",
				"shortTitle": "Твердая научная фантастика",
				"url": "https://vas3k.club/post/27748/",
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
		"url": "https://vas3k.club/post/27655/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Вастрик 🔥 Кэмп и Вастрик ⛵ Флот 2025. МЫ ВЕРНУЛИСЬ. МЫ ГОТОВЫ!",
				"creators": [
					{
						"firstName": "",
						"lastName": "Вастрик",
						"creatorType": "author"
					},
					{
						"firstName": "Katerina",
						"lastName": "Petrova",
						"creatorType": "author"
					},
					{
						"firstName": "",
						"lastName": "Лена",
						"creatorType": "author"
					}
				],
				"date": "2025-02-26",
				"abstractNote": "Я знаю, вы ждали этот пост!\nБуквально на этой неделе мы внесли предоплату за аренду площадки для Вастрик Кэмпа и за последнюю лодку для Флота, так чт…",
				"blogTitle": "Вастрик.Клуб",
				"language": "ru",
				"url": "https://vas3k.club/post/27655/",
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
