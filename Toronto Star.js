{
	"translatorID": "6b0b11a6-9b77-4b49-b768-6b715792aa37",
	"label": "Toronto Star",
	"creator": "Philipp Zumstein, Bao Trinh",
	"target": "^https?://www\\.thestar\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-07 15:39:05"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017-2021 Philipp Zumstein, Bao Trinh
	
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
	let contentType = attr(doc, 'meta[property="og:type"]', 'content');
	switch (contentType) {
		case "article":
			return "newspaperArticle";
		case "website":
		default:
			if (getSearchResults(doc, true)) {
				return "multiple";
			}
			break;
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h3.tnt-headline > a');
	for (let row of rows) {
		let href = row.href;
		let title = row.textContent;
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
			if (!items) return;
			ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}


function scrape(doc, url) {
	var trans = Zotero.loadTranslator('web');
	trans.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // Embedded Metadata
	trans.setDocument(doc);

	trans.setHandler('itemDone', function (obj, item) {
		if (item.itemType == "newspaperArticle") {
			item.section = text(doc, '#main-nav_menu li.active > a');
			item.publicationTitle = "The Toronto Star";
			item.libraryCatalog = "Toronto Star";
			item.ISSN = "0319-0781";
		}
		item.creators = []; // These won't be correct
		item.language = "en-CA";

		for (let script of doc.querySelectorAll('script[type="application/ld+json"]')) {
			try {
				let articleData = JSON.parse(script.textContent);
				if (articleData["@type"] === "NewsArticle") {
					item.title = ZU.unescapeHTML(articleData.headline);
					item.date = ZU.strToISO(articleData.datePublished);
					item.abstractNote = articleData.description;

					if (articleData.author) {
						if (Array.isArray(articleData.author)) {
							for (let author of articleData.author) {
								if (!author.name || author.name === "Unknown") {
									continue;
								}
								for (let name of author.name.split(', ')) {
									// Remove bureau name
									name = name.replace(text(doc, '.bylinepub'), '');
									item.creators.push(ZU.cleanAuthor(name, 'author'));
								}
							}
						}
						else if (articleData.author.name) {
							item.creators.push(ZU.cleanAuthor(articleData.author.name, 'author'));
						}
					}

					break;
				}
			}
			catch {}
		}

		for (let tag of doc.querySelectorAll('div.tags a')) {
			item.tags.push(tag.textContent);
		}
		item.tags = item.tags.filter(tag => !tag.includes('_'));

		item.complete();
	});

	trans.getTranslatorObject(function (trans) {
		trans.itemType = detectWeb(doc, url);
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.thestar.com/news/world/2010/01/26/france_should_ban_muslim_veils_commission_says.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "France should ban Muslim veils, commission says",
				"creators": [],
				"date": "2010-01-26",
				"ISSN": "0319-0781",
				"abstractNote": "France's National Assembly should pass a resolution denouncing full Muslim face veils and then vote the strictest law possible to ban women from wearing them, a parliamentary commission proposed on Tuesday.",
				"language": "en-CA",
				"libraryCatalog": "Toronto Star",
				"publicationTitle": "The Toronto Star",
				"section": "World",
				"url": "https://www.thestar.com/news/world/france-should-ban-muslim-veils-commission-says/article_c5625062-0cb9-5e26-a634-1a1af3bb7544.html",
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
		"url": "https://www.thestar.com/business/tech_news/2011/07/29/hamilton_ontario_should_reconsider_offshore_wind.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Hamilton: Ontario should reconsider offshore wind",
				"creators": [
					{
						"firstName": "Tyler",
						"lastName": "Hamilton",
						"creatorType": "author"
					}
				],
				"date": "2011-07-29",
				"ISSN": "0319-0781",
				"abstractNote": "There’s no reason why Ontario can’t regain the momentum it once had.",
				"language": "en-CA",
				"libraryCatalog": "Toronto Star",
				"publicationTitle": "The Toronto Star",
				"section": "Business",
				"shortTitle": "Hamilton",
				"url": "https://www.thestar.com/business/technology/hamilton-ontario-should-reconsider-offshore-wind/article_6f9933c7-6793-52cb-966e-a7a4c6351404.html",
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
		"url": "https://www.thestar.com/news/canada/2012/07/03/bev_oda_resigns_as_international_cooperation_minister_conservative_mp_for_durham.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Bev Oda resigns as International Co-operation minister, Conservative MP for Durham",
				"creators": [
					{
						"firstName": "Joanna",
						"lastName": "Smith",
						"creatorType": "author"
					},
					{
						"firstName": "Allan",
						"lastName": "Woods",
						"creatorType": "author"
					}
				],
				"date": "2012-07-03",
				"ISSN": "0319-0781",
				"abstractNote": "Bev Oda will leave politics later this month following a series of scandals over her travel expenses and funding decisions.",
				"language": "en-CA",
				"libraryCatalog": "Toronto Star",
				"publicationTitle": "The Toronto Star",
				"section": "Canada",
				"url": "https://www.thestar.com/news/canada/bev-oda-resigns-as-international-co-operation-minister-conservative-mp-for-durham/article_9be7eded-cd3f-5f5e-8c2e-381f65700ae3.html",
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
		"url": "http://www.thestar.com/search.html?q=labor&contenttype=articles%2Cvideos%2Cslideshows",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.thestar.com/news/canada.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.thestar.com/authors.sarrouh_maria.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.thestar.com/topic.ottawa.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.thestar.com/news/canada/2021/08/12/yukon-reports-nine-new-cases-of-covid-19-territory-has-45-active-infections.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Yukon reports nine new cases of COVID-19; territory has 45 active infections",
				"creators": [],
				"date": "2021-08-12",
				"ISSN": "0319-0781",
				"abstractNote": "WHITEHORSE - Yukon health officials are reporting nine new cases of COVID-19.",
				"language": "en-CA",
				"libraryCatalog": "Toronto Star",
				"publicationTitle": "The Toronto Star",
				"section": "Canada",
				"url": "https://www.thestar.com/news/canada/yukon-reports-nine-new-cases-of-covid-19-territory-has-45-active-infections/article_6e7915d9-4fc1-5ccb-9a51-3dbf19dbd9b0.html",
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
