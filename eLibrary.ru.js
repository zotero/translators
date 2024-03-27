{
	"translatorID": "587709d3-80c5-467d-9fc8-ed41c31e20cf",
	"label": "eLibrary.ru",
	"creator": "Avram Lyon",
	"target": "^https?://(www\\.)?elibrary\\.ru/",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-03-27 20:15:36"
}

/*
	***** BEGIN LICENSE BLOCK *****

	eLibrary.ru Translator
	Copyright © 2010-2011 Avram Lyon, ajlyon@gmail.com

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
	if (url.match(/\/item.asp/)) {
		return getDocType(doc);
	}
	else if (url.match(/\/(query_results|contents|org_items|itembox_items)\.asp/)) {
		return "multiple";
	}
	return false;
}

function doWeb(doc, url) {
	var articles = [];
	if (detectWeb(doc, url) == "multiple") {
		var results = ZU.xpath(doc, '//table[@id="restab"]/tbody/tr[starts-with(@id, "arw")]/td[2]');
		// Zotero.debug('results.length: ' + results.length);
		var items = {};
		for (let i = 0; i < results.length; i++) {
			// Zotero.debug('result [' + i + '] text: ' + results[i].textContent);
			var title = ZU.xpathText(results[i], './a');
			var uri = ZU.xpathText(results[i], ' ./a/@href');
			if (!title || !uri) continue;
			items[uri] = fixCasing(title);
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return;
			}
			for (let i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function fixCasing(string) {
	if (string && string == string.toUpperCase()) {
		return ZU.capitalizeTitle(string, true);
	}
	else return string;
}

function getDocType(doc) {
	var docType = ZU.xpathText(doc, '//tr/td/text()[contains(., "Тип:")]/following-sibling::*[1]');
	var itemType;
	
	switch (docType) {
		case "обзорная статья":
		case "статья в журнале - научная статья":
		case "научная статья":
		case "статья в журнале":
		case "статья в открытом архиве":
			itemType = "journalArticle";
			break;
		case "статья в сборнике трудов конференции":
			itemType = "conferencePaper";
			break;
		case "учебное пособие":
		case "монография":
			itemType = "book";
			break;
		case "публикация в сборнике трудов конференции":
			itemType = "conferencePaper";
			break;
		case "тезисы доклада на конференции":
			itemType = "conferencePaper";
			break;
		default:
			Zotero.debug("Unknown type: " + docType + ". Using 'journalArticle'");
			itemType = "journalArticle";
			break;
	}
	return itemType;
}

function scrape(doc, url) {
	var item = new Zotero.Item();
	item.itemType = getDocType(doc);
	item.title = fixCasing(doc.title);
	item.url = url;
	
	var rightPart = doc.getElementById("leftcol").nextSibling;
	var centralColumn = ZU.xpath(rightPart, './table/tbody/tr[2]/td[@align="left"]');
	var datablock = ZU.xpath(centralColumn, './div[2]');
	
	var authors = ZU.xpath(datablock, './/table[1]/tbody/tr/td[2]//b');
	// Zotero.debug('authors.length: ' + authors.length);
	
	for (let i = 0; i < authors.length; i++) {
		var dirty = authors[i].textContent;
		// Zotero.debug('author[' + i + '] text: ' + dirty);
		
		/* Common author field formats are:
			(1) "LAST FIRST PATRONIMIC"
			(2) "LAST F. P." || "LAST F.P." || "LAST F.P" || "LAST F."
			
		   In all these cases, we put comma after LAST for `ZU.cleanAuthor()` to work.
		   Other formats are rare, but possible, e.g. "ВАН ДЕ КЕРЧОВЕ Р." == "Van de Kerchove R.".
		   They go to single-field mode (assuming they got no comma). */
		var nameFormat1RE = new ZU.XRegExp("^\\p{Letter}+\\s\\p{Letter}+\\s\\p{Letter}+$");
		var nameFormat2RE = new ZU.XRegExp("^\\p{Letter}+\\s\\p{Letter}\\.(\\s?\\p{Letter}\\.?)?$");
		
		var isFormat1 = ZU.XRegExp.test(dirty, nameFormat1RE);
		var isFormat2 = ZU.XRegExp.test(dirty, nameFormat2RE);
		
		if (isFormat1 || isFormat2) {
			// add comma before the first space
			dirty = dirty.replace(/^([^\s]*)(\s)/, '$1, ');
		}
		
		var cleaned = ZU.cleanAuthor(dirty, "author", true);
		
		/* Now `cleaned.firstName` is:
			(1) "FIRST PATRONIMIC"
			(2) "F. P." || "F."
			
		   The `fixCasing()` makes 2nd letter lowercase sometimes,
		   for example, "S. V." -> "S. v.", but "S. K." -> "S. K.".
		   Thus, we can only apply it to Format1 . */
		
		if (isFormat1) {
			// "FIRST PATRONIMIC" -> "First Patronimic"
			cleaned.firstName = fixCasing(cleaned.firstName);
		}
		
		if (cleaned.firstName === undefined) {
			// Unable to parse. Restore punctuation.
			cleaned.fieldMode = true;
			cleaned.lastName = dirty;
		}
		
		cleaned.lastName = fixCasing(cleaned.lastName, true);
		
		// Skip entries with an @ sign-- email addresses slip in otherwise
		if (!cleaned.lastName.includes("@")) item.creators.push(cleaned);
	}

	var mapping = {
		Издательство: "publisher",
		"Дата депонирования": "date",
		"Год издания": "date",
		Год: "date",
		Том: "volume",
		Номер: "issue",
		ISSN: "ISSN",
		"Число страниц": "pages", // e.g. "83"
		Язык: "language",
		"Место издания": "place"
	};
	
	
	for (let key in mapping) {
		var t = ZU.xpathText(datablock, './/tr/td/text()[contains(., "' + key + ':")]/following-sibling::*[1]');
		if (t) {
			item[mapping[key]] = t;
		}
	}

	var pages = ZU.xpathText(datablock, '//tr/td/div/text()[contains(., "Страницы")]/following-sibling::*[1]');
	if (pages) item.pages = pages;
	
	/*
	// Times-cited in Russian-Science-Citation-Index.
	// This value is hardly useful for most users, would just clutter "extra" field.
	// Keeping this code just-in-case.
	var rsci = ZU.xpathText(doc, '//tr/td/text()[contains(., "Цитирований в РИНЦ")]/following-sibling::*[2]');
	Zotero.debug("Russian Science Citation Index: " + rsci);
	if (rsci) item.extra = "Цитируемость в РИНЦ: " + rsci;


	*/

	var journalBlock = ZU.xpath(datablock, './table/tbody[tr[1]/td/font[contains(text(), "ЖУРНАЛ:")]]/tr[2]/td[2]');
	if (!item.publicationTitle) item.publicationTitle = ZU.xpathText(journalBlock, ".//a[1]");
	item.publicationTitle = fixCasing(item.publicationTitle);

	var tags = ZU.xpath(datablock, './table[tbody/tr/td/font[contains(text(), "КЛЮЧЕВЫЕ СЛОВА:")]]//tr[2]/td/a');
	for (let j = 0; j < tags.length; j++) {
		item.tags.push(fixCasing(tags[j].textContent));
	}

	item.abstractNote = ZU.xpathText(datablock, './table/tbody/tr[td/font[text() = "АННОТАЦИЯ:"]]/following-sibling::*[1]');
	
	// Language to RFC-4646 code
	switch (item.language) {
		case "русский":
			item.language = "ru";
			break;
		case "английский":
			item.language = "en";
			break;
		default:
			Zotero.debug("Unknown language: " + item.language + " - keeping as-is.");
			break;
	}

	item.DOI = ZU.xpathText(doc, '/html/head/meta[@name="doi"]/@content');
	
	/* var pdf = false;
	// Now see if we have a free PDF to download
	var pdfImage = doc.evaluate('//a/img[@src="/images/pdf_green.gif"]', doc, null,XPathResult.ANY_TYPE, null).iterateNext();
	if (pdfImage) {
		// A green PDF is a free one. We need to construct the POST request
		var postData = [], postField;
		var postNode = doc.evaluate('//form[@name="results"]/input', doc, null,XPathResult.ANY_TYPE, null);
		while ((postField = postNode.iterateNext()) !== null) {
			postData.push(postField.name + "=" +postField.value);
		}
		postData = postData.join("&");
		Zotero.debug(postData + postNode.iterateNext());
		Zotero.Utilities.HTTP.doPost('http://elibrary.ru/full_text.asp', postData, function(text) {
			var href = text.match(/http:\/\/elibrary.ru\/download\/.*?\.pdf/)[0];
			pdf = {url:href, title:"eLibrary.ru полный текст", mimeType:"application/pdf"};
		});
	}*/

	item.complete();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.elibrary.ru/item.asp?id=59405787",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Динамика Показателей Видового И Количественного Состава И Метаболической Активности Микробиоты Слизистых Оболочек Ротоглотки При Оздоровлении Школьников",
				"creators": [
					{
						"firstName": "А. М.",
						"lastName": "Затевалов",
						"creatorType": "author"
					},
					{
						"firstName": "Л. В.",
						"lastName": "Феклисова",
						"creatorType": "author"
					},
					{
						"firstName": "Е. Е.",
						"lastName": "Целипанова",
						"creatorType": "author"
					},
					{
						"firstName": "Е. И.",
						"lastName": "Лиханская",
						"creatorType": "author"
					},
					{
						"firstName": "Ю. В.",
						"lastName": "Никитюк",
						"creatorType": "author"
					},
					{
						"firstName": "Н. В.",
						"lastName": "Гудова",
						"creatorType": "author"
					},
					{
						"firstName": "Т. Ш.",
						"lastName": "Садеков",
						"creatorType": "author"
					},
					{
						"firstName": "А. Ю.",
						"lastName": "Миронов",
						"creatorType": "author"
					},
					{
						"firstName": "Е. Б.",
						"lastName": "Мануйлова",
						"creatorType": "author"
					}
				],
				"date": "2024",
				"DOI": "10.51620/0869-2084-2024-69-1-37-44",
				"ISSN": "0869-2084, 2412-1320",
				"abstractNote": "Одним из факторов высокой заболеваемости респираторными инфекциями является неуклонный рост численности группы частоболеющих детей (ЧБД). Отличительной особенностью ЧБД детей являются особенности видового и количественного состава и функциональной активности микробиоты, с присутствием высоких титров условно-патогенной микроорганизмов (УПМ), в том числе Staphylococcus aureus. Оценка динамики изменений функциональной активности, видового и количественного состава микробиоценоза является актуальной задачей. Материал и методы. Исследована функциональная активность, видовой и количественный состав микробиоценоза ротоглотки у 63 школьников в возрасте от 8 до 15 лет, прибывших в осенне-зимний каникулярный период на 12 дней для оздоровления. Использовано культуральное исследование мазков из зева в день приезда и в день отъезда. Для оценки функциональной активности микробиоценоза сравнивнены концентрации короткоцепочечных жирных кислот в слюне так же двукратно в день приезда и в день отъезда, полученных газо-хроматографическим анализом слюны...\n\nОдним из факторов высокой заболеваемости респираторными инфекциями является неуклонный рост численности группы частоболеющих детей (ЧБД). Отличительной особенностью ЧБД детей являются особенности видового и количественного состава и функциональной активности микробиоты, с присутствием высоких титров условно-патогенной микроорганизмов (УПМ), в том числе Staphylococcus aureus. Оценка динамики изменений функциональной активности, видового и количественного состава микробиоценоза является актуальной задачей. Материал и методы. Исследована функциональная активность, видовой и количественный состав микробиоценоза ротоглотки у 63 школьников в возрасте от 8 до 15 лет, прибывших в осенне-зимний каникулярный период на 12 дней для оздоровления. Использовано культуральное исследование мазков из зева в день приезда и в день отъезда. Для оценки функциональной активности микробиоценоза сравнивнены концентрации короткоцепочечных жирных кислот в слюне так же двукратно в день приезда и в день отъезда, полученных газо-хроматографическим анализом слюны. Результаты. К окончанию 12-дневного срока пребывания в санатории на фоне улучшения общего состояния и повышения физической активности, дисбиотические нарушения ротоглотки в разной степени сохранялись у всех исследуемых. Наблюдается положительная тенденция к восстановлению микрофлоры верхних дыхательных путей, но появление новых видов УПМ в мазках из ротоглотки обусловлено колонизацией микроорганизмами в период совместного пребывания. Отмечается снижение концентрации масляной кислоты в слюне школьников, что может быть связано со сменой структуры микробного сообщества. Заключение. Рекомендовано учитывать результаты бактериологического анализа мазков с задней стенки глотки при формировании групп детей во время прохождения профилактических мероприятий.\n\nfunction show_abstract() {\n  $('#abstract1').hide();\n  $('#abstract2').show();\n  $('#abstract_expand').hide();\n}\n\n▼Показать полностью",
				"issue": "1",
				"language": "ru",
				"libraryCatalog": "eLibrary.ru",
				"pages": "37-44",
				"publicationTitle": "Клиническая Лабораторная Диагностика",
				"url": "https://elibrary.ru/item.asp?id=59405787",
				"volume": "69",
				"attachments": [],
				"tags": [
					{
						"tag": "Гжх"
					},
					{
						"tag": "Золотистый Стафилококк"
					},
					{
						"tag": "Короткоцепочечные Жирные Кислоты"
					},
					{
						"tag": "Математическое Моделирование"
					},
					{
						"tag": "Метаболомика"
					},
					{
						"tag": "Микробиота"
					},
					{
						"tag": "Слюна"
					},
					{
						"tag": "Частоболеющие Дети"
					},
					{
						"tag": "Школьники"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.elibrary.ru/item.asp?id=17339044",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Использование Молекулярно-Генетических Методов Установления Закономерностей Наследования Для Выявления Доноров Значимых Признаков Яблони",
				"creators": [
					{
						"firstName": "И. И.",
						"lastName": "Супрун",
						"creatorType": "author"
					},
					{
						"firstName": "Е. В.",
						"lastName": "Ульяновская",
						"creatorType": "author"
					},
					{
						"firstName": "Е. Н.",
						"lastName": "Седов",
						"creatorType": "author"
					},
					{
						"firstName": "Г. А.",
						"lastName": "Седышева",
						"creatorType": "author"
					},
					{
						"firstName": "З. М.",
						"lastName": "Серова",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"ISSN": "2219-5335",
				"abstractNote": "На основе полученных новых знаний по формированию и проявлению ценных селекционных признаков выделены новые доноры и комплексные доноры значимых признаков яблони.",
				"issue": "13 (1)",
				"language": "ru",
				"libraryCatalog": "eLibrary.ru",
				"pages": "1-10",
				"publicationTitle": "Плодоводство И Виноградарство Юга России",
				"url": "https://elibrary.ru/item.asp?id=17339044",
				"attachments": [],
				"tags": [
					{
						"tag": "Иммунитет"
					},
					{
						"tag": "Парша"
					},
					{
						"tag": "Сорт"
					},
					{
						"tag": "Яблоня"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.elibrary.ru/item.asp?id=50475554",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Влияние холодной гелиевой плазмы на способность к формированию биопленок Candida albicans",
				"creators": [
					{
						"firstName": "Т. В.",
						"lastName": "Махрова",
						"creatorType": "author"
					},
					{
						"firstName": "М. И.",
						"lastName": "Заславская",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"abstractNote": "Описан эффект холодной гелиевой плазмы на способность к формированию биопленок Candida albicans in vitro. Обработка кандид в планктонной форме вызывает снижение способности микромицетов к биопленкоформированию. Изучение различных режимов использования плазмы определит влияние данного фактора на процесс пленкообразования и даст возможность дополнительного применения санирующего эффекта в различных областях медицины.This article describes the effect of cold helium plasma on the ability to form biofilms of Candida albicans in vitro. Treatment of candida in planktonic form causes a decrease in the ability of micromycetes to biofilm formation. The study of various modes of plasma use will determine the effect of this factor on the film formation process and will provide additional options for applying the sanitizing effect in various fields of medicine.",
				"language": "ru",
				"libraryCatalog": "eLibrary.ru",
				"publisher": "Общество с ограниченной ответственностью  \"Издательско-полиграфическое объединение \"У Никитских ворот\"",
				"url": "https://elibrary.ru/item.asp?id=50475554",
				"attachments": [],
				"tags": [
					{
						"tag": "Биопленки"
					},
					{
						"tag": "Кандиды"
					},
					{
						"tag": "Холодная Плазма"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://elibrary.ru/item.asp?id=19407200",
		"items": [
			{
				"itemType": "book",
				"title": "Иммунология и аллергология",
				"creators": [
					{
						"firstName": "А. А.",
						"lastName": "Воробьев",
						"creatorType": "author"
					},
					{
						"firstName": "А. С.",
						"lastName": "Быков",
						"creatorType": "author"
					},
					{
						"firstName": "А. В.",
						"lastName": "Караулов",
						"creatorType": "author"
					},
					{
						"firstName": "С. А.",
						"lastName": "Быков",
						"creatorType": "author"
					},
					{
						"firstName": "М. Я.",
						"lastName": "Корн",
						"creatorType": "author"
					}
				],
				"abstractNote": "Атлас представляет собой иллюстрированное руководство по иммунологии, иммунопатологии и аллергологии. В книге описаны основы иммунологии, диагностические реакции, схемы патогенеза первичных и вторичных иммунодефицитов, аллергодерматозов, васкулитов, заболеваний системы крови, почек, печени, легких, желудочно-кишечного тракта и других систем организма, протекающих с иммунологическими нарушениями. Наряду с классическими понятиями иммунологии и иммунопатологии книга содержит современные данные об отдельных патологических процессах, представленные с позиций иммунопатогенеза. Это расширяет возможности учебников и руководств как по общей и клинической иммунологии и иммунопатологии, так и по другим клиническим дисциплинам. Материал изложен наглядно, в краткой и доступной форме. Иллюстрации созданы или скорректированы авторами с учетом последних достижений в области иммунологии, иммунопатологии и методов лабораторной диагностики. Для студентов медицинских вузов и врачей различных специальностей.",
				"language": "ru",
				"libraryCatalog": "eLibrary.ru",
				"publisher": "ИЗДАТЕЛЬСКИЙ ДОМ \"ПРАКТИЧЕСКАЯ МЕДИЦИНА\"",
				"url": "https://elibrary.ru/item.asp?id=19407200",
				"attachments": [],
				"tags": [
					{
						"tag": "Аллергология"
					},
					{
						"tag": "Иммунология"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
