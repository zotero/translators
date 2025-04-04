{
	"translatorID": "6b4bf64d-2894-48ac-a7cb-d1da7fae7271",
	"label": "Yandex Books",
	"creator": "Ilya Zonov",
	"target": "^https://books\\.yandex\\.ru/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-03-29 17:52:25"
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
	if (url.match(/\/books\/.+/)) {
		return 'book';
	}
	return false;
}

async function doWeb(doc, url) {
	await scrape(doc, url);
}

async function scrape(doc, url = doc.location.href) {
	const translator = Zotero.loadTranslator('web');

	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		const title = text(doc, 'span[data-e2e="content.title.main"]');
		item.title = title;

		const authors = doc.querySelectorAll('h1[data-e2e="content.title"] a[data-e2e="content.author.name"]');
		for (const author of authors) {
			item.creators.push(ZU.cleanAuthor(author.textContent, "author"));
		}

		const detailsBlock = doc.querySelector('div[data-e2e="content.details"]');

		const abstract = text(detailsBlock, 'div[data-e2e^="content.expandable"] > div > div > span > span');
		item.abstractNote = abstract;

		const publisher = text(detailsBlock, 'div[data-e2e="content.info.publisher"] a[data-e2e="content.author.name"]');
		item.publisher = publisher;

		const yearSpan = detailsBlock.querySelectorAll('div[data-e2e="content.info.publication.year"] span:last-child')[0];
		if (yearSpan) {
			item.date = yearSpan.textContent;
		}

		const series = text(detailsBlock, 'div[data-e2e="content.info.series"] a');
		item.series = series;

		item.complete();
	});

	const em = await translator.getTranslatorObject();
	em.itemType = 'book';
	em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://books.yandex.ru/books/rKRshcgC",
		"items": [
			{
				"itemType": "book",
				"title": "Экспедиция в преисподнюю",
				"creators": [
					{
						"firstName": "Аркадий",
						"lastName": "Стругацкий",
						"creatorType": "author"
					},
					{
						"firstName": "Борис",
						"lastName": "Стругацкий",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"abstractNote": "«Экспедиция в преисподнюю» — одно из немногих сочинений Стругацких, где не стоит искать глубокого смысла или скрытого подтекста; кроме стремительных погонь, схваток с инопланетными монстрами, таинственных перемещений во времени и пространстве, в ней есть только искреннее веселье — веселье от души, в которое лишь изредка вплетаются грустные нотки. Это история о трех закадычных друзьях, этаких трех мушкетерах (собственно, все их так и звали — Атос, Портос и Арамис), которые спасают свою лучшую подругу Галю, «д'Артаньяна в юбке», из лап космических пиратов, а именно — банды Двуглавого Юла.",
				"language": "ru",
				"libraryCatalog": "books.yandex.ru",
				"publisher": "Мультимедийное издательство Стрельбицкого",
				"url": "https://books.yandex.ru/books/rKRshcgC",
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
		"url": "https://books.yandex.ru/books/xkPTmlsj",
		"items": [
			{
				"itemType": "book",
				"title": "О мышах и людях. Жемчужина (сборник)",
				"creators": [
					{
						"firstName": "Джон",
						"lastName": "Стейнбек",
						"creatorType": "author"
					}
				],
				"abstractNote": "«О мышах и людях» — повесть, не выходящая из ТОР-100 «Amazon», наряду с «Убить пересмешника» Харпер Ли, «Великим Гэтсби» Фицджеральда, «1984» Оруэлла. Книга, включенная Американской библиотечной ассоциацией в список запрещенных вместе с «451° по Фаренгейту» Р. Брэдбери и «Над пропастью во ржи» Дж. Д. Сэлинджера. Обе ее экранизации стали заметным событием в киномире: картина 1939 года была номинирована на 4 премии «Оскар», фильм 1992-го — на «Золотую пальмовую ветвь». В издание также включена повесть «Жемчужина».",
				"language": "ru",
				"libraryCatalog": "books.yandex.ru",
				"publisher": "Издательство АСТ",
				"url": "https://books.yandex.ru/books/xkPTmlsj",
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
		"url": "https://books.yandex.ru/books/kRN3dPRr",
		"items": [
			{
				"itemType": "book",
				"title": "Release it! Проектирование и дизайн ПО для тех, кому не все равно",
				"creators": [
					{
						"firstName": "Майкл",
						"lastName": "Нейгард",
						"creatorType": "author"
					}
				],
				"date": "2017",
				"abstractNote": "Не важно, каким инструментом вы пользуетесь для программной разработки — Java,. NET или Ruby on Rails. Написание кода — это еще только полдела. Готовы ли вы к внезапному наплыву ботов на ваш сайт? Предусмотрена ли в вашем ПО «защита от дурака»? Правильно ли вы понимаете юзабилити? Майкл Нейгард утверждает, что большинство проблем в программных продуктах были заложены в них еще на стадии дизайна и проектирования. Вы можете двигаться к идеалу сами — методом проб и ошибок, а можете использовать опыт автора. В этой книге вы найдете множество шаблонов проектирования, помогающих избежать критических ситуаций и не меньшее количество антишаблонов, иллюстрирующих неправильные подходы с подробным анализом возможных последствий. Любой разработчик, имеющий опыт многопоточного программирования, легко разберется в примерах на Java, которые подробно поясняются и комментируются.Стабильность, безопасность и дружественный интерфейс — вот три важнейших слагаемых успеха вашего программного продукта. Если в ваши планы не входит в течение последующих лет отвечать на недовольные письма пользователей, выслушивать критику заказчиков и постоянно латать дыры, устраняя возникающие баги, то прежде чем выпустить финальный релиз, прочтите эту книгу.",
				"language": "ru",
				"libraryCatalog": "books.yandex.ru",
				"publisher": "Питер",
				"url": "https://books.yandex.ru/books/kRN3dPRr",
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
		"url": "https://books.yandex.ru/books/WvlvVfrL",
		"items": [
			{
				"itemType": "book",
				"title": "Архив Буресвета. Книга 1 : Путь королей",
				"creators": [
					{
						"firstName": "Брендон",
						"lastName": "Сандерсон",
						"creatorType": "author"
					}
				],
				"abstractNote": "Масштабная сага погружает читателя в удивительный мир, не уступающий мирам Дж. Р.Р. Толкина, Р. Джордана и Р. Сальваторе. Уникальная флора и фауна, тщательно продуманное политическое устройство и богатая духовная культура — здесь нет ничего случайного. Рошар — мир во власти великих бурь, сметающих все живое на своем пути. Но есть и то, что страшнее любой великой бури, — это истинное опустошение. Одно лишь его ожидание меняет судьбы целых народов. Сумеют ли люди сплотиться перед лицом страшной угрозы? Найдется ли тот, для кого древняя клятва — жизнь прежде смерти, сила прежде слабости, путь прежде цели — станет чем-то большим, нежели просто слова?",
				"language": "ru",
				"libraryCatalog": "books.yandex.ru",
				"publisher": "Азбука Аттикус",
				"series": "Архив Буресвета",
				"shortTitle": "Архив Буресвета. Книга 1",
				"url": "https://books.yandex.ru/books/WvlvVfrL",
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
