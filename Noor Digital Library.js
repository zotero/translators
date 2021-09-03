{
	"translatorID": "91170c85-7547-4716-b3ae-b82a68d8b19f",
	"label": "Noor Digital Library",
	"creator": "Abe Jellinek",
	"target": "^https?://noorlib\\.ir/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-03 19:35:04"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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


let idRe = /(?:\/([a-z]{2}))?\/book\/(?:info|view)\/([^#?/]+)/;

function detectWeb(doc, url) {
	if (idRe.test(url)) {
		return "book";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (url.includes('/search')) {
		Z.monitorDOMChanges(doc.querySelector('.main-wrapper'));
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.book-link[href*="/book/"], a.book-title[href*="/book/"]');
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

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	let [, lang, id] = url.match(idRe);
	let risURL = attr(doc, '#refDownload > a[href*="RIS" i]', 'href');
	if (!risURL) {
		risURL = `/api/citation/getCitationFile?format=RIS&bookId=${id}&language=${lang}`;
	}

	ZU.doGet(risURL, function (risText) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(risText);
		translator.setHandler("itemDone", function (obj, item) {
			let hijri = false;
			for (let dateElem of doc.querySelectorAll('[id^="publishYear"]')) {
				let date = dateElem.textContent;
				if (!hijri && date.includes('هجری')) { // hijri
					item.date += lang == 'en' ? ' AH' : 'هـ ';
					hijri = true;
				}
				else if (date.includes('میلادی')) { // miladi (gregorian)
					item.date = ZU.strToISO(date);
					break;
				}
			}
			
			for (let creator of item.creators) {
				if (creator.fieldMode && creator.lastName.includes('،')) {
					let newCreator = ZU.cleanAuthor(
						creator.lastName.replace(/،/g, ','),
						creator.creatorType,
						true
					);
					delete creator.fieldMode;
					Object.assign(creator, newCreator);
				}
			}
			
			// downloading full-text content requires repeated requests to check
			// status and likely some manual user input, so it isn't possible
			// here.
			
			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://noorlib.ir/en/book/info/939",
		"items": [
			{
				"itemType": "book",
				"title": "زندگانی حضرت امام حسین بن علی علیه السلام، بررسی و تحلیل (ترجمه)",
				"creators": [
					{
						"lastName": "قرشی",
						"creatorType": "author",
						"firstName": "باقر شریف"
					},
					{
						"lastName": "محفوظی موسوی",
						"creatorType": "author",
						"firstName": "حسین"
					}
				],
				"date": "1380 AH",
				"language": "فارسی",
				"libraryCatalog": "Noor Digital Library",
				"publisher": "بنیاد معارف اسلامی",
				"series": "زندگانی حضرت امام حسین بن علی علیه السلام، بررسی و تحلیل (ترجمه)",
				"url": "https://noorlib.ir/book/view/939",
				"volume": "1",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://noorlib.ir/en/book/view/939?viewType=html",
		"items": [
			{
				"itemType": "book",
				"title": "زندگانی حضرت امام حسین بن علی علیه السلام، بررسی و تحلیل (ترجمه)",
				"creators": [
					{
						"lastName": "قرشی",
						"creatorType": "author",
						"firstName": "باقر شریف"
					},
					{
						"lastName": "محفوظی موسوی",
						"creatorType": "author",
						"firstName": "حسین"
					}
				],
				"date": "1380",
				"language": "فارسی",
				"libraryCatalog": "Noor Digital Library",
				"publisher": "بنیاد معارف اسلامی",
				"series": "زندگانی حضرت امام حسین بن علی علیه السلام، بررسی و تحلیل (ترجمه)",
				"url": "https://noorlib.ir/book/view/939",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://noorlib.ir/en/book/info/89234",
		"items": [
			{
				"itemType": "book",
				"title": "10 [عشر] الشخصية القوية",
				"creators": [
					{
						"lastName": "کامل",
						"creatorType": "author",
						"firstName": "مجدی"
					}
				],
				"date": "1997",
				"language": "العربية",
				"libraryCatalog": "Noor Digital Library",
				"publisher": "دار الامین",
				"series": "10 [عشر] الشخصية القوية",
				"url": "https://noorlib.ir/book/view/89234",
				"volume": "1",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://noorlib.ir/fa/book/info/66199",
		"items": [
			{
				"itemType": "book",
				"title": "ترتیب‌ الفروق‌ و إختصا‌رها",
				"creators": [
					{
						"lastName": "قرافی",
						"creatorType": "author",
						"firstName": "احمد بن ادریس"
					},
					{
						"lastName": "ابن بقوری",
						"creatorType": "author",
						"firstName": "محمد"
					},
					{
						"lastName": "ابن عباد",
						"creatorType": "author",
						"firstName": "عمر"
					}
				],
				"date": "1994",
				"language": "العربية",
				"libraryCatalog": "Noor Digital Library",
				"publisher": "المملکة المغربیة. وزارة الأوقاف و الشؤون الإسلامیة",
				"series": "ترتیب‌ الفروق‌ و إختصا‌رها",
				"url": "https://noorlib.ir/book/view/66199",
				"volume": "1",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://noorlib.ir/en/search?query=%D8%A7%D9%84%D9%82%D8%B1%D8%A2%D9%86",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
