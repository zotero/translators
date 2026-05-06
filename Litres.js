{
	"translatorID": "02bde528-c86d-42d5-904b-e74f85bd45f9",
	"label": "Litres",
	"creator": "Ilya Zonov",
	"target": "^https://(www\\.)?litres\\.ru/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-05-21 14:38:11"
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
	if (url.includes('/book/')) {
		return 'book';
	}
	else if (url.includes('/search/') && getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('div[data-testid="search__content--wrapper"] a[data-testid="art__title"][href*="/book/"]');
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
	const translator = Zotero.loadTranslator('web');

	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		item.publicationTitle = "";

		item.title = text(doc, 'h1[itemprop="name"]');

		const authors = doc.querySelectorAll('div[data-testid="art__author--details"] a[data-testid="art__personName--link"] span');
		for (const author of authors) {
			item.creators.push(ZU.cleanAuthor(author.textContent, 'author'));
		}

		item.series = text(doc, 'div[data-testid="art__inSeries--title"] a').replaceAll(/[«»]/g, '');

		const seriesInfo = text(doc, 'div[data-testid="art__inSeries--title"] div');
		const seriesMatch = seriesInfo.match(/([0-9]+) .+ из [0-9]+ в серии/);
		if (seriesMatch) {
			item.seriesNumber = seriesMatch[1];
		}

		item.ISBN = text(doc, 'span[itemprop="isbn"]');

		item.publisher = text(doc, 'div[data-testid="book__characteristicsCopyrightHolder"] a');

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
		"url": "https://www.litres.ru/book/daron-asemoglu/pochemu-odni-strany-bogatye-a-drugie-bednye-proishozhdenie-10748980/",
		"items": [
			{
				"itemType": "book",
				"title": "Почему одни страны богатые, а другие бедные. Происхождение власти, процветания и нищеты",
				"creators": [
					{
						"firstName": "Дарон",
						"lastName": "Аджемоглу",
						"creatorType": "author"
					},
					{
						"firstName": "Джеймс А.",
						"lastName": "Робинсон",
						"creatorType": "author"
					}
				],
				"date": "2016-02-17",
				"ISBN": "9785170927364",
				"abstractNote": "Исследовать экономическую ситуацию страны можно с различных позиций. Географический принцип берет за основу местоположение государства. Культурологический – особенности развития культурной составляющ…",
				"language": "ru",
				"libraryCatalog": "www.litres.ru",
				"publisher": "Издательство АСТ",
				"series": "Даймонд",
				"url": "https://www.litres.ru/book/daron-asemoglu/pochemu-odni-strany-bogatye-a-drugie-bednye-proishozhdenie-10748980/",
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
		"url": "https://www.litres.ru/book/dzho-aberkrombi/luchshe-podavat-holodnym-5025444/",
		"items": [
			{
				"itemType": "book",
				"title": "Лучше подавать холодным",
				"creators": [
					{
						"firstName": "Джо",
						"lastName": "Аберкромби",
						"creatorType": "author"
					}
				],
				"date": "2018-11-12",
				"ISBN": "9785699632114",
				"abstractNote": "Весна в Стирии означает войну…Девятнадцать лет длятся Кровавые Годы. Безжалостный великий герцог Орсо погряз в жестокой борьбе со вздорной Лигой Восьми. Белая земля меж ними залита кровью. Армии марш…",
				"language": "ru",
				"libraryCatalog": "www.litres.ru",
				"publisher": "Эксмо",
				"series": "Земной Круг",
				"seriesNumber": "4",
				"url": "https://www.litres.ru/book/dzho-aberkrombi/luchshe-podavat-holodnym-5025444/",
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
		"url": "https://www.litres.ru/book/maksim-ilyahov/pishi-sokraschay-2025-kak-sozdavat-silnyy-tekst-70193008/",
		"items": [
			{
				"itemType": "book",
				"title": "Пиши, сокращай 2025: Как создавать сильный текст (PDF + EPUB)",
				"creators": [
					{
						"firstName": "Максим",
						"lastName": "Ильяхов",
						"creatorType": "author"
					},
					{
						"firstName": "Людмила",
						"lastName": "Сарычева",
						"creatorType": "author"
					}
				],
				"date": "2023-12-31",
				"ISBN": "9785961494266",
				"abstractNote": "После покупки предоставляется дополнительная возможность скачать книгу в формате epub.«Пиши, сокращай» – книга о создании текста для всех, кто пишет по работе. Неважно, работает ли человек профессион…",
				"language": "ru",
				"libraryCatalog": "www.litres.ru",
				"publisher": "Альпина Диджитал",
				"shortTitle": "Пиши, сокращай 2025",
				"url": "https://www.litres.ru/book/maksim-ilyahov/pishi-sokraschay-2025-kak-sozdavat-silnyy-tekst-70193008/",
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
		"url": "https://www.litres.ru/search/?q=%D0%97%D0%B5%D0%BC%D0%BD%D0%BE%D0%BC%D0%BE%D1%80%D1%8C%D0%B5&art_types=text_book",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
