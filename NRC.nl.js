{
	"translatorID": "8e708ceb-ce42-446f-bffd-21e2bdeb0742",
	"label": "NRC.nl",
	"creator": "Martijn Staal",
	"target": "^https?://www.nrc.nl",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-06-15 13:47:40"
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

	return false;
}

function doWeb(doc, url) {
	return scrape(doc, url)
}

function scrape(doc, url) {
	let item = new Zotero.Item("newspaperArticle");

	item.title = doc.querySelector("meta[property='og:title']").content
	item.language = "nl"
	item.url = doc.querySelector("meta[property='og:url']").content
	item.abstractNote = doc.querySelector("meta[property='og:description']").content
	item.rights = doc.querySelector("meta[name='dcterms.rights']").content
	item.date = doc.querySelector("meta[property='og:url']").content.match(/\d\d\d\d\/\d\d\/\d\d/)[0].replace(/\//g, "-");

	item.attachments.push({
		title: "Snapshot",
		url: item.url,
		mimeType: 'text/html',
		snapshot: true
	})

	item.complete();
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
				"creators": [],
				"date": "2023-06-15",
				"abstractNote": "Natuurherstel: Een aanzienlijke groep in het Europees Parlement is bereid om natuurplannen van Frans Timmermans de nek om te draaien, zo bleek donderdag.",
				"language": "nl",
				"libraryCatalog": "NRC.nl",
				"rights": "Copyright Mediahuis NRC BV",
				"url": "https://www.nrc.nl/nieuws/2023/06/15/lot-van-natuurherstelwet-timmermans-blijft-erg-onzeker-na-belangrijke-stemming-a4167267",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
				"language": "nl",
				"libraryCatalog": "NRC.nl",
				"rights": "Copyright Mediahuis NRC BV",
				"url": "https://www.nrc.nl/nieuws/1987/06/13/reagan-vraagt-russen-de-muur-af-te-breken-kb_000035184-a3528803",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
				"creators": [],
				"date": "2022-12-03",
				"abstractNote": "Column:Maxim Februari",
				"language": "nl",
				"libraryCatalog": "NRC.nl",
				"rights": "Copyright Mediahuis NRC BV",
				"url": "https://www.nrc.nl/nieuws/2022/12/03/wikipedia-wordt-onbetrouwbaar-alweer-a4150299",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
