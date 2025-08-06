{
	"translatorID": "05986f07-c138-4640-9a83-86426215abc2",
	"label": "Arutz Sheva",
	"creator": "Anonymous",
	"target": "^https?:\\/\\/(?:www\\.)?(?:akhbar7\\.co\\.il|inn\\.co\\.il|7kanal\\.co\\.il|israelnationalnews\\.com)\\/news\\/.*",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-08-06 16:52:46",
	"skipTest": true
}

/*
	***** BEGIN LICENSE BLOCK *****

	Free license for any purpose

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

function detectWeb() {
	return "newspaperArticle";
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function scrape(doc, url) {
	let item = new Zotero.Item("newspaperArticle");

	// Clean the URL to remove any tracking parameters or fragments
	let cleanedUrl = url.split(/[?#]/)[0];
	item.url = cleanedUrl;

	// Title - Dynamically gets the title from the h1 tag or the document title
	item.title = textContent(doc, "h1") || doc.title;

	// Abstract/lead paragraph - gets the first paragraph within the article content
	let leadParagraph = doc.querySelector(".article-content--text p");
	item.abstractNote = leadParagraph ? leadParagraph.textContent.trim() : "";

	// Author - Using the new, specific selector provided by the user
	let authorEl = doc.querySelector(".article-info--author");
	if (authorEl) {
		let author = authorEl.textContent.trim();
		if (author !== "القناة 7" && author !== "Israel National News" && author !== "ערוץ 7")
		item.creators = [{
			firstName: "",
			lastName: author,
			creatorType: "author"
		}];
	}

	// Date - Gets the date from the datetime attribute and formats it to YYYY-MM-DD
	let time = doc.querySelector("time");
	if (time) {
		let rawDate = time.getAttribute("datetime") || time.textContent.trim();
		let date = new Date(rawDate);
		if (!isNaN(date.getTime())) {
			let year = date.getFullYear();
			let month = (date.getMonth() + 1).toString().padStart(2, '0');
			let day = date.getDate().toString().padStart(2, '0');
			item.date = `${year}-${month}-${day}`;
		}
	}

	// Tags - Using the new, specific selector provided by the user
	let tags = doc.querySelectorAll(".article-tags a");
	tags.forEach(tag => {
		item.tags.push(tag.textContent.trim());
	});

	// Publication - Dynamically gets the publication name from the meta tag
	let siteNameMeta = doc.querySelector('meta[property="og:site_name"]');
	if (siteNameMeta) {
		item.publicationTitle = siteNameMeta.getAttribute("content");
	}

	// Language - Dynamically gets the language from the HTML tag
	let lang = doc.documentElement.lang;
	if (lang) {
		item.language = lang;
	}

	item.attachments = [{
		title: "Snapshot",
		document: doc
	}];

	item.complete();
}

function textContent(doc, selector, attribute) {
	let el = doc.querySelector(selector);
	if (!el) return "";
	return attribute ? el.getAttribute(attribute) : el.textContent.trim();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.israelnationalnews.com/news/412849?5345345",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Woman found dead in Jerusalem apartment",
				"creators": [],
				"date": "2025-08-06",
				"language": "en",
				"libraryCatalog": "Arutz Sheva",
				"publicationTitle": "Israel National News",
				"url": "https://www.israelnationalnews.com/news/412849",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Armon Hanatziv"
					},
					{
						"tag": "Israel Police"
					},
					{
						"tag": "Jerusalem"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.7kanal.co.il/news/278345?ssr=1",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Неудачная попытка настроить ИИ против Нетаньяху",
				"creators": [
					{
						"firstName": "",
						"lastName": "Ян Голд",
						"creatorType": "author"
					}
				],
				"language": "ru",
				"libraryCatalog": "Arutz Sheva",
				"publicationTitle": "7 КАНАЛ",
				"url": "https://www.7kanal.co.il/news/278345",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "\"Grok\""
					},
					{
						"tag": "Биньямин Нетаньяху"
					},
					{
						"tag": "Итай Лешем"
					},
					{
						"tag": "искусственный интеллект"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.inn.co.il/news/675874",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "כך נשמע מפגש בין עולמות",
				"creators": [],
				"language": "he",
				"libraryCatalog": "Arutz Sheva",
				"publicationTitle": "ערוץ 7",
				"url": "https://www.inn.co.il/news/675874",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "אהרון רזאל"
					},
					{
						"tag": "בן ארצי"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.akhbar7.co.il/news/562",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "الجيش الإسرائيلي يمنع دخول السيارات الصينية إلى قواعده",
				"creators": [],
				"language": "ar",
				"libraryCatalog": "Arutz Sheva",
				"publicationTitle": "القناة 7",
				"url": "https://www.akhbar7.co.il/news/562",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "إسرائيل"
					},
					{
						"tag": "الأمن السيبراني"
					},
					{
						"tag": "الجيش الإسرائيلي"
					},
					{
						"tag": "الصين"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
