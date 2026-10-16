{
	"translatorID": "fa7c0015-960d-4d11-89b0-3ecec4480419",
	"label": "Al Jazeera",
	"creator": "Vera de Kok",
	"target": "^https?://([a-z-]+\\.)?aljazeera\\.(?:com|net)/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-15 15:56:58"
}



/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Vera de Kok

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

function detectWeb(doc) {
	// contentType varies (post, opinion, analysis, ...) but every article page
	// shares the "Article Page" pageType and a title meta.
	if (getMetaContent(doc, 'pageType') === 'Article Page' && getMetaContent(doc, 'pageTitle')) {
		return 'newspaperArticle';
	}
	if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

// Meta names differ per edition; normalise while looking them up.
function getMetaContent(doc, name) {
	let wanted = name.toLowerCase();
	for (let el of doc.querySelectorAll('meta[name], meta[property]')) {
		let key = (el.getAttribute('name') || el.getAttribute('property') || '').toLowerCase();
		if (key === wanted) return el.content || '';
	}
	return '';
}

// Section, tag and search pages all list dated article cards. The link class is
// stable across the .com and .net editions.
function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.u-clickable-card__link[href]');
	for (let row of rows) {
		let href = row.href;
		let path = new URL(href).pathname;
		if (!/^\/(?:[a-z-]+\/)+\d{4}\/\d{2}\/\d{2}\//.test(path)
			|| /\/(?:liveblog|video|videos)\//.test(path)) continue;
		let title = ZU.trimInternal(row.textContent).replace(/\s*-\s*Al Jazeera\s*$/, '');
		if (!href || !title || title.length < 15) continue;
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

// Authors are usually in pageAuthors/displayAuthors, but some editions omit
// them there and only expose a Person in the NewsArticle JSON-LD.
function getAuthors(doc) {
	let authors = getMetaContent(doc, 'pageAuthors') || getMetaContent(doc, 'displayAuthors');
	if (authors) return authors.split(/\s*[,;]\s*|\s+and\s+/i).filter(Boolean);

	for (let el of doc.querySelectorAll('script[type="application/ld+json"]')) {
		let data;
		try {
			data = JSON.parse(el.textContent);
		}
		catch (e) {
			continue;
		}
		for (let article of [].concat(data)) {
			if (!article || article['@type'] != 'NewsArticle' || !article.author) continue;
			let list = [].concat(article.author);
			return list
				.filter(a => a && a['@type'] == 'Person' && a.name)
				.map(a => a.name);
		}
	}
	return [];
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		item.itemType = 'newspaperArticle';
		item.title = getMetaContent(doc, 'pageTitle') || item.title;
		item.abstractNote = getMetaContent(doc, 'description') || item.abstractNote;
		item.date = ZU.strToISO(getMetaContent(doc, 'publishedDate')) || item.date;
		item.url = doc.querySelector('link[rel="canonical"]')?.href || url;
		// og:site_name differs per edition ("Al Jazeera", "الجزيرة نت", ...).
		item.publicationTitle = getMetaContent(doc, 'og:site_name') || 'Al Jazeera';
		item.language = doc.documentElement.lang || 'en';
		item.libraryCatalog = 'Al Jazeera';
		item.creators = [];
		for (let author of getAuthors(doc)) {
			item.creators.push(ZU.cleanAuthor(author.trim(), 'author'));
		}
		item.complete();
	});
	let em = await translator.getTranslatorObject();
	em.itemType = 'newspaperArticle';
	em.addCustomFields({
		description: 'abstractNote'
	});
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.aljazeera.com/news/2026/10/15/from-morocco-to-south-africa-israel-election-watched-closely-across-africa",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "From Morocco to South Africa, Israel election watched closely across Africa",
				"creators": [
					{
						"firstName": "Mubarak",
						"lastName": "Aliyu",
						"creatorType": "author"
					}
				],
				"date": "2026-10-15",
				"abstractNote": "October 27 vote could test whether Israel’s ties with African countries withstand the fallout from the war on Gaza.",
				"language": "en",
				"libraryCatalog": "Al Jazeera",
				"publicationTitle": "Al Jazeera",
				"url": "https://www.aljazeera.com/news/2026/10/15/from-morocco-to-south-africa-israel-election-watched-closely-across-africa",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Africa"
					},
					{
						"tag": "Elections"
					},
					{
						"tag": "Israel"
					},
					{
						"tag": "Israel Election 2026"
					},
					{
						"tag": "Israel-Palestine conflict"
					},
					{
						"tag": "Middle East"
					},
					{
						"tag": "News"
					},
					{
						"tag": "News Analysis"
					},
					{
						"tag": "Nigeria"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.aljazeera.com/news/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.aljazeera.com/search/gaza",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.aljazeera.net/opinions/2026/10/15/%D9%83%D9%8A%D9%81-%D8%AA%D9%88%D8%B1%D8%B7-%D8%A7%D9%84%D8%B4%D8%A7%D8%B9%D8%B1-%D9%85%D8%AD%D9%85%D8%AF-%D8%A7%D9%84%D9%81%D9%8A%D8%AA%D9%88%D8%B1%D9%8A-%D9%81%D9%8A-%D8%B9%D9%85%D9%84%D9%8A%D8%A9",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "كيف تورط الشاعر محمد الفيتوري في عملية اختطاف الإمام موسى الصدر؟",
				"creators": [
					{
						"firstName": "الصادق",
						"lastName": "الرزيقي",
						"creatorType": "author"
					}
				],
				"date": "2026-10-15",
				"abstractNote": "من سحب جنسيته السودانية إلى اختطافه في لبنان على خلفية اختفاء الإمام موسى الصدر، تكشف سيرة الشاعر محمد الفيتوري كيف دفع ثمن مواقفه السياسية، وعاش بين المنافي شاعرا للحرية وأفريقيا ومقاومة الاستعمار.",
				"language": "ar",
				"libraryCatalog": "Al Jazeera",
				"publicationTitle": "الجزيرة نت",
				"url": "https://www.aljazeera.net/opinions/2026/10/15/%d9%83%d9%8a%d9%81-%d8%aa%d9%88%d8%b1%d8%b7-%d8%a7%d9%84%d8%b4%d8%a7%d8%b9%d8%b1-%d9%85%d8%ad%d9%85%d8%af-%d8%a7%d9%84%d9%81%d9%8a%d8%aa%d9%88%d8%b1%d9%8a-%d9%81%d9%8a-%d8%b9%d9%85%d9%84%d9%8a%d8%a9",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "ثقافة"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://balkans.aljazeera.net/teme/2026/10/15/oruzje-saveznistva-i-identitet-razliciti-odnosi-na-balkanu-prema-izraelu",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Oružje, savezništva i identitet: Različiti odnosi na Balkanu prema Izraelu",
				"creators": [
					{
						"firstName": "Mario",
						"lastName": "Pejović",
						"creatorType": "author"
					}
				],
				"date": "2026-10-15",
				"abstractNote": "Politike zemalja regije prema Izraelu oblikuju domaći interesi, transakcijska diplomatija i neriješena pitanja identiteta, a ne zajednički pogled na Bliski istok.",
				"language": "bs",
				"libraryCatalog": "Al Jazeera",
				"publicationTitle": "Al Jazeera Balkans",
				"shortTitle": "Oružje, savezništva i identitet",
				"url": "https://balkans.aljazeera.net/teme/2026/10/15/oruzje-saveznistva-i-identitet-razliciti-odnosi-na-balkanu-prema-izraelu",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Albanija"
					},
					{
						"tag": "Balkan"
					},
					{
						"tag": "BiH"
					},
					{
						"tag": "Bosna i Hercegovina"
					},
					{
						"tag": "Bugarska"
					},
					{
						"tag": "Crna Gora"
					},
					{
						"tag": "Gaza"
					},
					{
						"tag": "Geopolitika"
					},
					{
						"tag": "Hrvatska"
					},
					{
						"tag": "Izrael"
					},
					{
						"tag": "TEME"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.aljazeera.net/news/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
