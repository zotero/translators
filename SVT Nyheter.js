{
	"translatorID": "4c6d887e-341d-4edb-b651-ea702a8918d7",
	"label": "SVT Nyheter",
	"creator": "Sebastian Berlin",
	"target": "^https?://www\\.svt\\.se/nyheter/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-06-27 15:32:02"
}

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2024 Abe Jellinek

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
	if (url.includes('/nyheter/') && doc.querySelector('#root > [data-typename="NewsArticle"]')) {
		return 'newspaperArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('ul[class^="TeaserFeed"] li article > a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(text(row, '.nyh_teaser__heading-title'));
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
		item.section = text(doc, 'h1 > a[class^="SectionHeader"]');
		if (item.section == 'Uutiset' && !url.includes('/svenska/')) {
			item.language = 'fi';
		}
		item.creators = Array.from(doc.querySelectorAll('footer a > span[itemprop="author"]'))
			.map(author => ZU.cleanAuthor(author.textContent, 'author'));
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'newspaperArticle';
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.svt.se/nyheter/lokalt/ost/kronobranneriet",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Arkeologer gräver efter brännvin",
				"creators": [
					{
						"firstName": "Lena",
						"lastName": "Liljeborg",
						"creatorType": "author"
					}
				],
				"date": "2018-02-27",
				"abstractNote": "Nu blottläggs den första politiska stridsfrågan i brännvinsbränningens historia.",
				"language": "sv",
				"libraryCatalog": "www.svt.se",
				"publicationTitle": "SVT Nyheter",
				"section": "Öst",
				"url": "https://www.svt.se/nyheter/lokalt/ost/kronobranneriet",
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
		"url": "https://www.svt.se/nyheter/utrikes/varldens-morkaste-byggnad-finns-i-sydkorea",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Världens mörkaste byggnad finns i Sydkorea",
				"creators": [
					{
						"firstName": "Sophia Garcia",
						"lastName": "Hasselberg",
						"creatorType": "author"
					}
				],
				"date": "2018-02-21",
				"abstractNote": "Den här byggnaden skapades inför vinter-OS i Sydkorea och ligger i närheten av tävlingsanläggningarna. Byggnaden är målad med en speciell färg som absorberar nästan 99 procent av allt ljus, och den svarta färgen kan därför skapa illusionen av ett tomrum.",
				"language": "sv",
				"libraryCatalog": "www.svt.se",
				"publicationTitle": "SVT Nyheter",
				"section": "Utrikes",
				"url": "https://www.svt.se/nyheter/utrikes/varldens-morkaste-byggnad-finns-i-sydkorea",
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
		"url": "https://www.svt.se/nyheter/vetenskap/extremt-viktigt-vikingafynd-i-england",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "”Extremt viktigt” vikingafynd i England",
				"creators": [],
				"date": "2018-02-19",
				"abstractNote": "På 1970-talet upptäcktes en massgrav som troddes härröra från den stora vikingaarmé som invaderade England i slutet av 800-talet. Men på grund av en felmätning föll fynden i glömska. Nu, mer än 40 år senare, gör massgraven en storstilad återkomst som ett av de viktigaste vikingafynden någonsin.",
				"language": "sv",
				"libraryCatalog": "www.svt.se",
				"publicationTitle": "SVT Nyheter",
				"section": "Vetenskap",
				"url": "https://www.svt.se/nyheter/vetenskap/extremt-viktigt-vikingafynd-i-england",
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
		"url": "https://www.svt.se/nyheter/inrikes/trafikanter-varnas-vissa-vagar-hala-som-skridskobanor",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Trafikanter varnas: ”Vissa vägar hala som skridskobanor”",
				"creators": [
					{
						"firstName": "Erik",
						"lastName": "Grönlund",
						"creatorType": "author"
					},
					{
						"firstName": "Maria",
						"lastName": "Makar",
						"creatorType": "author"
					}
				],
				"date": "2018-02-28",
				"abstractNote": "Snön fortsatte pumpa in över Sverige under onsdagen. Framförallt de östra delarna av landet har drabbats hårt. Onsdagens kraftiga snöfall får en fortsättning även under torsdagen. Lokalt kan det komma stora mängder och Trafikverket ger rådet att inte ge sig ut på vägarna om det inte är absolut nödvändigt.",
				"language": "sv",
				"libraryCatalog": "www.svt.se",
				"publicationTitle": "SVT Nyheter",
				"section": "Inrikes",
				"shortTitle": "Trafikanter varnas",
				"url": "https://www.svt.se/nyheter/inrikes/trafikanter-varnas-vissa-vagar-hala-som-skridskobanor",
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
		"url": "https://www.svt.se/nyheter/uutiset/meankielen-paivaa-juhlitaan-pajalassa",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Meänkielen päivää juhlitaan Pajalassa",
				"creators": [
					{
						"firstName": "Anna",
						"lastName": "Starckman",
						"creatorType": "author"
					}
				],
				"date": "2018-02-27",
				"abstractNote": "Tiistaina Pajalassa juhlistetaan meänkielen päivää. Meänkieli julistettiin omaksi kieleksi 30 vuotta sitten.",
				"language": "fi",
				"libraryCatalog": "www.svt.se",
				"publicationTitle": "SVT Nyheter",
				"section": "Uutiset",
				"url": "https://www.svt.se/nyheter/uutiset/meankielen-paivaa-juhlitaan-pajalassa",
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
		"url": "https://www.svt.se/nyheter/uutiset/svenska/finska-gymnasieelever-flyttar-till-sverige-for-sport",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Finska gymnasieelever flyttar till Sverige – för sport",
				"creators": [
					{
						"firstName": "Jonathan",
						"lastName": "Sseruwagi",
						"creatorType": "author"
					}
				],
				"date": "2018-02-28",
				"abstractNote": "Genom åren har finländska ungdomar tagit steget över till Sverige, då det finns över 150 skolor som erbjuder ett program som kombinerar idrott och gymnasiestudier.",
				"language": "sv",
				"libraryCatalog": "www.svt.se",
				"publicationTitle": "SVT Nyheter",
				"section": "Uutiset",
				"url": "https://www.svt.se/nyheter/uutiset/svenska/finska-gymnasieelever-flyttar-till-sverige-for-sport",
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
		"url": "https://www.svt.se/nyheter/utrikes/tyska-bilindustrin-testar-avgaser-pa-apor-och-manniskor",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Tyska bilindustrin testade avgaser på apor och människor",
				"creators": [
					{
						"firstName": "Ingrid",
						"lastName": "Thörnqvist",
						"creatorType": "author"
					}
				],
				"date": "2018-01-29",
				"abstractNote": "De stora tyska bilkoncernerna VW, Daimler och BMW har varit inblandade i tester av avgaser på apor och människor. Det avslöjas av tyska och amerikanska medier. Bilföretagen tar avstånd från experimenten och politiker kräver att saken utreds och att de skyldiga straffas.",
				"language": "sv",
				"libraryCatalog": "www.svt.se",
				"publicationTitle": "SVT Nyheter",
				"section": "Utrikes",
				"url": "https://www.svt.se/nyheter/utrikes/tyska-bilindustrin-testar-avgaser-pa-apor-och-manniskor",
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
		"url": "https://www.svt.se/nyheter/lokalt/vasterbotten/per-hakan-och-mahari-dog-efter-sina-pass-pa-northvolt",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Per-Håkan och Mahari dog efter sina pass på Northvolt",
				"creators": [
					{
						"firstName": "Oscar",
						"lastName": "Hansson",
						"creatorType": "author"
					},
					{
						"firstName": "Oskar",
						"lastName": "Jönsson",
						"creatorType": "author"
					},
					{
						"firstName": "Evelina",
						"lastName": "Dahlberg",
						"creatorType": "author"
					}
				],
				"date": "2024-06-24",
				"abstractNote": "Per-Håkan Söderström, 59, Mahari Bakari, 33, och en 19-årig man dog alla efter sina arbetspass på batterifabriken Northvolt. Nu utreder polisen dödsfallen på nytt. – Vågar de som jobbar kvar gå och lägga sig? Det kan ju hända dem med, säger Per-Håkans bror Lars-Erik.",
				"language": "sv",
				"libraryCatalog": "www.svt.se",
				"publicationTitle": "SVT Nyheter",
				"section": "Västerbotten",
				"url": "https://www.svt.se/nyheter/lokalt/vasterbotten/per-hakan-och-mahari-dog-efter-sina-pass-pa-northvolt",
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
		"url": "https://www.svt.se/nyheter/ekonomi/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
