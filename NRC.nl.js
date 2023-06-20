{
	"translatorID": "8e708ceb-ce42-446f-bffd-21e2bdeb0742",
	"label": "NRC.nl",
	"creator": "Martijn Staal",
	"target": "^https?://www\\.nrc\\.nl",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-06-20 08:03:28"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2023 Martijn Staal
	
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
	if (url.includes('/nieuws/')) {
		return "newspaperArticle";
	}
	else if ((url.endsWith(".nl/") || url.endsWith(".nl") || url.includes("/index/") || url.includes("/search/")) && getSearchResults(doc, true)) {
		return "multiple";
	}

	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll("a.nmt-item__link");
	var isSearchPage = false;

	if (rows.length == 0) {
		// We are probably not in an index page, but in a search results page.
		rows = doc.querySelectorAll("div.search-results__item");
		isSearchPage = true;
	}

	for (let row of rows) {
		var href;
		var title;
		if (isSearchPage) {
			href = row.getAttribute("data-article-url");
			title = row.getAttribute("data-headline");
		}
		else {
			href = row.href;

			if (row.textContent.includes(">")) {
				title = ZU.trimInternal(row.textContent.split(">")[1]);
			}
			else {
				title = ZU.trimInternal(row.textContent);
			}
		}

		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}

	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
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
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		item.language = "nl-NL";
		var authors = Array.from(doc.querySelectorAll("a[rel='author']")).map(a => a.textContent);
		item.creators = authors.map(a => ZU.cleanAuthor(a, 'author', false));

		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "newspaperArticle";
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.nrc.nl/nieuws/2023/06/15/lot-van-natuurherstelwet-timmermans-blijft-erg-onzeker-na-belangrijke-stemming-a4167267",
		"detectedItemType": "newspaperArticle",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Lot van natuurherstelwet Timmermans blijft erg onzeker na belangrijke stemming",
				"creators": [
					{
						"firstName": "Clara van de",
						"lastName": "Wiel",
						"creatorType": "author"
					}
				],
				"date": "2023-06-15",
				"abstractNote": "Natuurherstel: Een aanzienlijke groep in het Europees Parlement is bereid om natuurplannen van Frans Timmermans de nek om te draaien, zo bleek donderdag.",
				"language": "nl-NL",
				"libraryCatalog": "www.nrc.nl",
				"publicationTitle": "NRC",
				"rights": "Copyright Mediahuis NRC BV",
				"url": "https://www.nrc.nl/nieuws/2023/06/15/lot-van-natuurherstelwet-timmermans-blijft-erg-onzeker-na-belangrijke-stemming-a4167267",
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
		"url": "https://www.nrc.nl/nieuws/1987/06/13/reagan-vraagt-russen-de-muur-af-te-breken-kb_000035184-a3528803?t=1686835084",
		"detectedItemType": "newspaperArticle",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Reagan vraagt Russen de Muur af te breken",
				"creators": [],
				"date": "1987-06-13",
				"abstractNote": "Door onze correspondent ROB MEINES BERLIJN, 13 juni - In zijn toespraak aan de Berlijnse Muur bij de Brandenburger Poort heeft president Ronald Reagan gisteren Sovjet-leider…",
				"language": "nl-NL",
				"libraryCatalog": "www.nrc.nl",
				"publicationTitle": "NRC",
				"rights": "Copyright Mediahuis NRC BV",
				"url": "https://www.nrc.nl/nieuws/1987/06/13/reagan-vraagt-russen-de-muur-af-te-breken-kb_000035184-a3528803",
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
		"url": "https://www.nrc.nl/nieuws/2022/12/03/wikipedia-wordt-onbetrouwbaar-alweer-a4150299",
		"detectedItemType": "newspaperArticle",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Column | Wikipedia wordt onbetrouwbaar. Alweer",
				"creators": [
					{
						"firstName": "Maxim",
						"lastName": "Februari",
						"creatorType": "author"
					}
				],
				"date": "2022-12-03",
				"abstractNote": "Column:Maxim Februari",
				"language": "nl-NL",
				"libraryCatalog": "www.nrc.nl",
				"publicationTitle": "NRC",
				"rights": "Copyright Mediahuis NRC BV",
				"url": "https://www.nrc.nl/nieuws/2022/12/03/wikipedia-wordt-onbetrouwbaar-alweer-a4150299",
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
		"url": "https://www.nrc.nl/index/economie/",
		"detectedItemType": "multiple",
		"items": "multiple"
	}
]
/** END TEST CASES **/
