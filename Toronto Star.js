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
	"lastUpdated": "2021-08-13 15:59:47"
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
	var rows = doc.querySelectorAll('a[class*="-mediacard"]');
	for (let row of rows) {
		let href = row.href;
		let title = text(row, 'h3');
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
			item.publicationTitle = "The Toronto Star";
			item.libraryCatalog = "Toronto Star";
			item.ISSN = "0319-0781";
		}
		item.language = "en-CA";

		let linkedData = JSON.parse(text(doc, 'script[type="application/ld+json"]'))["@graph"];
		if (linkedData.length > 0) {
			let articleData = linkedData.find(x => x["@type"] == "ReportageNewsArticle");
			if (articleData) {
				item.title = articleData.headline;
				item.date = articleData.datePublished;
				item.abstractNote = articleData.description;

				if (articleData.author) {
					if (Array.isArray(articleData.author)) {
						for (let author of articleData.author) {
							if (author.name) item.creators.push(ZU.cleanAuthor(author.name, 'author'));
						}
					}
					else if (articleData.author.name) {
						item.creators.push(ZU.cleanAuthor(articleData.author.name, 'author'));
					}
				}
			}
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
				"url": "https://www.thestar.com/news/world/2010/01/26/france_should_ban_muslim_veils_commission_says.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "France"
					}
				],
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
				"abstractNote": "There&rsquo;s no reason why Ontario can&rsquo;t regain the momentum it once had.",
				"language": "en-CA",
				"libraryCatalog": "Toronto Star",
				"publicationTitle": "The Toronto Star",
				"section": "Tech News",
				"shortTitle": "Hamilton",
				"url": "https://www.thestar.com/business/tech_news/2011/07/29/hamilton_ontario_should_reconsider_offshore_wind.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Great Lakes"
					}
				],
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
				"url": "https://www.thestar.com/news/canada/2012/07/03/bev_oda_resigns_as_international_cooperation_minister_conservative_mp_for_durham.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Bev Oda"
					},
					{
						"tag": "Conservatives"
					},
					{
						"tag": "Durham"
					},
					{
						"tag": "Stephen Harper"
					},
					{
						"tag": "orange juice"
					},
					{
						"tag": "savoy hotel"
					}
				],
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
				"url": "https://www.thestar.com/news/canada/2021/08/12/yukon-reports-nine-new-cases-of-covid-19-territory-has-45-active-infections.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Canada"
					},
					{
						"tag": "Health"
					},
					{
						"tag": "Whitehorse"
					},
					{
						"tag": "bc"
					},
					{
						"tag": "social"
					},
					{
						"tag": "yukon territory"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
