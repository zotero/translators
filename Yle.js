{
	"translatorID": "635dbe6d-12c1-4d7c-b3ce-a9096923abbc",
	"label": "Yle",
	"creator": "Vera de Kok",
	"target": "^https?://(?:(?:www|svenska|haku)\\.)?yle\\.fi/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-11-04 21:55:54"
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

function detectWeb(doc, url) {
	if (/\/(?:a\/\d+-\d+|uutiset\/lyhyesti\/\d+-\d+|aihe\/artikkeli\/|artikel\/)/.test(url)
		&& doc.querySelector('article.yle__article, article.ydd-article')) {
		return 'newspaperArticle';
	}
	if (getSearchResults(doc, true)) return 'multiple';
	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	for (let link of doc.querySelectorAll('main a[href], [class*="ArticleResults"] a[href]')) {
		let href = link.href;
		if (!/^https?:\/\/(?:svenska\.)?yle\.fi\/(?:aihe\/)?a\/\d+-\d+(?:[?#]|$)/.test(href)) continue;
		let heading = link.querySelector('h2, h3, h4');
		if (!heading) continue;
		let title = cleanText(heading.textContent);
		if (!title) continue;
		if (checkOnly) return true;
		items[href.replace(/[?#].*$/, '')] = title;
	}
	return Object.keys(items).length ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let link of Object.keys(items)) {
			await scrape(await requestDocument(link), link);
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url) {
	let article = doc.querySelector('article.yle__article, article.ydd-article');
	let translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		item.itemType = 'newspaperArticle';
		let heading = article.querySelector('.yle__article__heading--1, .ydd-article-headline');
		if (heading) item.title = cleanText(heading.textContent);

		// Briefs include other stories in the same document; do not collect their bylines.
		let names = new Set();
		for (let entry of article.querySelectorAll('.yle__article__header ul > li, .ydd-author-list [itemprop="name"]')) {
			let author = entry.querySelector('a[href*="/p/56-"]:not([aria-hidden]), span') || entry;
			let name = cleanText(author.textContent);
			if (name) names.add(name);
		}
		if (names.size) {
			item.creators = Array.from(names, name => (name.includes(' ') && !/^Служба новостей Yle$/i.test(name)
				? ZU.cleanAuthor(name, 'author')
				: { lastName: name, creatorType: 'author', fieldMode: 1 }));
		}

		let published = article.querySelector('time.yle__article__date--published, [itemprop="datePublished"]');
		if (published) {
			let date = published.getAttribute('datetime') || published.getAttribute('content');
			if (date) item.date = ZU.strToISO(date) || date;
		}

		let language = doc.documentElement.lang;
		if (language) item.language = language;
		let publications = { en: 'Yle News', sv: 'Svenska Yle', ru: 'Yle Novosti', se: 'Yle Sápmi' };
		item.publicationTitle = publications[language.split('-')[0]] || 'Yle';
		let canonical = doc.querySelector('link[rel="canonical"]');
		item.url = canonical ? canonical.href : url;

		let section = article.querySelector('.yle__article__header a[href*="/t/"]');
		if (!section) section = doc.querySelector('.ydd-brandbyline h2');
		if (section) item.section = cleanText(section.textContent);

		let tags = new Map();
		let addTag = (value) => {
			let tag = cleanText(value);
			if (tag && !tags.has(tag.toLowerCase())) tags.set(tag.toLowerCase(), { tag });
		};
		for (let tag of item.tags) addTag(typeof tag == 'string' ? tag : tag.tag);
		let keywords = doc.querySelector('meta[name="keywords"]');
		if (keywords) {
			for (let tag of keywords.content.split(',')) addTag(tag);
		}
		for (let link of article.querySelectorAll('.yle__article__header a[href*="/t/"]')) addTag(link.textContent);
		item.tags = Array.from(tags.values());
		item.complete();
	});
	await translator.translate();
}

function cleanText(value) {
	return ZU.trimInternal(value.replace(/\u00ad/g, ''));
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://yle.fi/a/74-20255133",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Demokraattien murskavoitto vaikuttaa myös Eurooppaan – listasimme neljä asiaa",
				"creators": [
					{
						"firstName": "Anna",
						"lastName": "Karismo",
						"creatorType": "author"
					},
					{
						"firstName": "Elli",
						"lastName": "Hiilamo",
						"creatorType": "author"
					}
				],
				"date": "2026-11-04",
				"abstractNote": "Demokraattien murskavoitto välivaaleissa heijastuu Eurooppaan monin tavoin, kirjoittavat Eurooppa-kirjeenvaihtaja Anna Karismo ja EU-kirjeenvaihtaja Elli Hiilamo.",
				"language": "fi",
				"libraryCatalog": "yle.fi",
				"publicationTitle": "Yle",
				"section": "Kansainvälinen politiikka",
				"url": "https://yle.fi/a/74-20255133",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Euroopan unioni"
					},
					{
						"tag": "USA:n välivaalit 2026"
					},
					{
						"tag": "Ukraina"
					},
					{
						"tag": "Venäjän hyökkäys"
					},
					{
						"tag": "Yhdysvallat"
					},
					{
						"tag": "kansainvälinen politiikka"
					},
					{
						"tag": "laitaoikeisto"
					},
					{
						"tag": "politiikka"
					},
					{
						"tag": "talous"
					},
					{
						"tag": "ulkomaat"
					},
					{
						"tag": "vaalit"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://yle.fi/a/74-20255026",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "\"All kids deserve an education\" — Finnish-American family can't get son into high school",
				"creators": [
					{
						"firstName": "Zena",
						"lastName": "Iovino",
						"creatorType": "author"
					},
					{
						"firstName": "Ronan",
						"lastName": "Browne",
						"creatorType": "author"
					}
				],
				"date": "2026-11-04",
				"abstractNote": "Sixteen-year-old Cameron just wants to get into high school, but the programmes supposed to help kids like him are instead keeping him out.",
				"language": "en",
				"libraryCatalog": "yle.fi",
				"publicationTitle": "Yle News",
				"url": "https://yle.fi/a/74-20255026",
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
		"url": "https://yle.fi/a/7-10108110",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Utrikesminister Elina Valtonen: Trump har fortfarande omfattande maktbefogenheter",
				"creators": [
					{
						"firstName": "Carmela",
						"lastName": "Walder",
						"creatorType": "author"
					},
					{
						"firstName": "Jyrki",
						"lastName": "Hara",
						"creatorType": "author"
					}
				],
				"date": "2026-11-04",
				"abstractNote": "Utrikesminister Valtonen uttalar sig försiktigt om valresultatet i USA. Försvarsminister Häkkänen ser däremot en risk för att läget i Mellanöstern eskalerar.",
				"language": "sv-FI",
				"libraryCatalog": "yle.fi",
				"publicationTitle": "Svenska Yle",
				"section": "Inrikes",
				"shortTitle": "Utrikesminister Elina Valtonen",
				"url": "https://yle.fi/a/7-10108110",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Donald Trump"
					},
					{
						"tag": "Elina Valtonen"
					},
					{
						"tag": "Finland"
					},
					{
						"tag": "Mellanårsvalet i USA 2026"
					},
					{
						"tag": "Ryssland"
					},
					{
						"tag": "Tytti Tuppurainen"
					},
					{
						"tag": "USA:s kongress"
					},
					{
						"tag": "USA:s politik"
					},
					{
						"tag": "inrikes"
					},
					{
						"tag": "internationell politik"
					},
					{
						"tag": "politik"
					},
					{
						"tag": "utrikes"
					},
					{
						"tag": "utrikespolitik"
					},
					{
						"tag": "val"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://yle.fi/aihe/artikkeli/2014/08/15/0409-kino-suomi-kuutamosonaatti-ja-transvestjan-tarinoita",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "04.09. Kino Suomi: Kuutamosonaatti ja Transvestjan tarinoita",
				"creators": [
					{
						"firstName": "Harto",
						"lastName": "Hänninen",
						"creatorType": "author"
					}
				],
				"date": "2014-08-15",
				"language": "fi",
				"libraryCatalog": "yle.fi",
				"publicationTitle": "Yle",
				"section": "Yle Teema",
				"shortTitle": "04.09. Kino Suomi",
				"url": "https://yle.fi/aihe/a/20-62200",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Jukka Sipilä"
					},
					{
						"tag": "Mikko Kivinen (näyttelijä)"
					},
					{
						"tag": "Olli Soinio"
					},
					{
						"tag": "Soli Labbart"
					},
					{
						"tag": "kauhu"
					},
					{
						"tag": "kauhuelokuvat"
					},
					{
						"tag": "kauhukomediat"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://yle.fi/uutiset/lyhyesti/74-20249422",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Britannian ja Iranin kaksoiskansalainen pidätetty Fairfordin tapauksessa",
				"creators": [
					{
						"firstName": "Elise",
						"lastName": "Aaltonen",
						"creatorType": "author"
					}
				],
				"date": "2026-10-01",
				"abstractNote": "Uutiset nopeasti ja luotettavasti.",
				"language": "fi",
				"libraryCatalog": "yle.fi",
				"publicationTitle": "Yle",
				"url": "https://yle.fi/a/74-20249422",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Britannia"
					},
					{
						"tag": "Iran"
					},
					{
						"tag": "terrorismi"
					},
					{
						"tag": "ulkomaat"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://haku.yle.fi/?query=ilmasto",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://yle.fi/uutiset/lyhyesti/74-20255087",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Hallitus sai eduskunnan luottamuksen äänin 95-77",
				"creators": [
					{
						"lastName": "STT",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2026-11-04",
				"abstractNote": "Opposition välikysymys koski arjen kustannusten nousua.",
				"language": "fi",
				"libraryCatalog": "yle.fi",
				"publicationTitle": "Yle",
				"url": "https://yle.fi/a/74-20255087",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Orpon hallitus"
					},
					{
						"tag": "Välikysymyskeskustelu"
					},
					{
						"tag": "politiikka"
					},
					{
						"tag": "välikysymykset"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://yle.fi/a/74-20255074",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Сокращения в системе соцздрава бьют по детям, инвалидам и пожилым – THL выявил серьёзные проблемы в предоставлении услуг",
				"creators": [
					{
						"lastName": "Служба новостей Yle",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2026-11-04",
				"abstractNote": "Сильные различия между регионами благополучия в финансовом положении и потребностях жителей влияют на всю их деятельность.",
				"language": "ru",
				"libraryCatalog": "yle.fi",
				"publicationTitle": "Yle Novosti",
				"url": "https://yle.fi/a/74-20255074",
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
		"url": "https://yle.fi/a/74-20254260",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Sámediggi lea hábmemin dárkilis evttohusaid duohtavuohta- ja soabadankommišuvnna doaibmabijuide",
				"creators": [
					{
						"firstName": "Piibe",
						"lastName": "Aikio",
						"creatorType": "author"
					},
					{
						"firstName": "Susanna",
						"lastName": "Guttorm",
						"creatorType": "author"
					}
				],
				"date": "2026-11-02",
				"abstractNote": "Sámediggi ráđđádallagoahtá juovlamánus parlamentáralaš bargojoavkkuin doaibmabidjoevttohusaid birra.",
				"language": "se",
				"libraryCatalog": "yle.fi",
				"publicationTitle": "Yle Sápmi",
				"url": "https://yle.fi/a/74-20254260",
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
		"url": "https://svenska.yle.fi/artikel/2016/03/31/fotbollsligan-1990-kuusela-ledde-hjk-till-guld",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Fotbollsligan 1990: Kuusela ledde HJK till guld",
				"creators": [
					{
						"firstName": "Antti",
						"lastName": "Koivukangas",
						"creatorType": "author"
					}
				],
				"date": "2016-03-31",
				"abstractNote": "År 1990 föddes Fotbollsligan, på lördag börjar 27:e säsongen",
				"language": "sv-FI",
				"libraryCatalog": "yle.fi",
				"publicationTitle": "Svenska Yle",
				"section": "Sport",
				"shortTitle": "Fotbollsligan 1990",
				"url": "https://yle.fi/a/7-1056274",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "FC Kuusysi"
					},
					{
						"tag": "Fotbollsligan"
					},
					{
						"tag": "HJK Helsingfors"
					},
					{
						"tag": "Jari Litmanen"
					},
					{
						"tag": "Kimmo Tarkkio"
					},
					{
						"tag": "Kokkolan Palloveikot"
					},
					{
						"tag": "Martti Kuusela"
					},
					{
						"tag": "Pasi Rautiainen"
					},
					{
						"tag": "Yle Sporten"
					},
					{
						"tag": "fotboll"
					},
					{
						"tag": "fotbollspelare herrar"
					},
					{
						"tag": "idrottshändelser"
					},
					{
						"tag": "sport"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
