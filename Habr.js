{
	"translatorID": "b4c54248-6e78-4afc-b566-45fee8cd43b7",
	"label": "Habr",
	"creator": "Ilya Zonov",
	"target": "^https://habr\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-03-29 18:23:31"
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
	if (/\/(articles|news)\/.+/.test(url)) {
		return 'blogPost';
	}

	return false;
}

async function doWeb(doc, url) {
	await scrape(doc, url);
}

async function scrape(doc, url) {
	const translator = Zotero.loadTranslator('web');

	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		item.websiteType = "Хабр";

		// cleanup publicationTitle to switch off rewriting blogTitle
		item.publicationTitle = "";

		const blogTitle = text(doc, 'a.tm-company-snippet__title > span');
		if (blogTitle) {
			item.blogTitle = `Хабр - ${blogTitle}`;
		}
		else {
			item.blogTitle = "Хабр";
		}

		const date = attr(doc, 'meta[property="aiturec:datetime"]', 'content');
		item.date = ZU.strToISO(date);

		const author = text(doc, '.tm-article-presenter__header a.tm-user-info__username');
		item.creators.push(ZU.cleanAuthor(author, "author"));

		item.complete();
	});

	const em = await translator.getTranslatorObject();
	em.itemType = 'blogPost';
	em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://habr.com/ru/articles/889174/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Lookupper: как игровой оверлей помогает изучать языки",
				"creators": [
					{
						"firstName": "",
						"lastName": "AlekseiVekhov",
						"creatorType": "author"
					}
				],
				"date": "2025-03-08",
				"abstractNote": "Изучение иностранных языков — это как освоение сложной игры. Вроде бы правила понятны, но как только сталкиваешься с реальным использованием, всё кажется сложнее, чем на бумаге. Нужно постоянно...",
				"blogTitle": "Хабр",
				"language": "ru",
				"shortTitle": "Lookupper",
				"url": "https://habr.com/ru/articles/889174/",
				"websiteType": "Хабр",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "anki"
					},
					{
						"tag": "игры"
					},
					{
						"tag": "изучение английского"
					},
					{
						"tag": "изучение иностранных языков"
					},
					{
						"tag": "контекстное обучение"
					},
					{
						"tag": "разработка"
					},
					{
						"tag": "разработка приложений"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://habr.com/ru/companies/yandex/articles/888160/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "NeurIPS: тренды, инсайты и самые интересные статьи главной ML-конференции года",
				"creators": [
					{
						"firstName": "",
						"lastName": "nstbezz",
						"creatorType": "author"
					}
				],
				"date": "2025-03-07",
				"abstractNote": "Привет! Меня зовут Настя Беззубцева, и я руковожу аналитикой голоса в Алисе. Недавно побывала на одной из крупнейших международных конференций по машинному обучению — NeurIPS...",
				"blogTitle": "Хабр - Яндекс",
				"language": "ru",
				"shortTitle": "NeurIPS",
				"url": "https://habr.com/ru/companies/yandex/articles/888160/",
				"websiteType": "Хабр",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "LLM"
					},
					{
						"tag": "Taylor Swift"
					},
					{
						"tag": "machine learning"
					},
					{
						"tag": "neurips"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://habr.com/ru/news/840520/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Команда Rust для Linux терпит поражение в сражении с разработчиками на С, её лидер ушёл из-за «нетехнической ерунды»",
				"creators": [
					{
						"firstName": "",
						"lastName": "denis-19",
						"creatorType": "author"
					}
				],
				"date": "2024-09-03",
				"abstractNote": "В начале сентября 2024 года команда разработчиков проекта по внедрению Rust для ядра Linux потерпела поражение в сражении с разработчиками на С. Лидер Rust для Linux объявил, что уходит из проекта...",
				"blogTitle": "Хабр",
				"language": "ru",
				"url": "https://habr.com/ru/news/840520/",
				"websiteType": "Хабр",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Rust для Linux"
					},
					{
						"tag": "linux"
					},
					{
						"tag": "rust"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
