{
	"translatorID": "0fba73bf-f113-4d36-810f-2c654fa985fb",
	"label": "The New Yorker",
	"creator": "Philipp Zumstein and Abe Jellinek",
	"target": "^https?://www\\.newyorker\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-01-20 11:53:09"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017-2021 Philipp Zumstein and Abe Jellinek
	
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
	if (doc.querySelector('article.article')) {
		return "magazineArticle";
	}
	else if (url.includes('/search/') && getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//li//a[h4]');
	for (let row of rows) {
		var href = row.href;
		var title = ZU.trimInternal(row.textContent);
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
			if (!items) {
				return;
			}
			ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}


function scrape(doc, url) {
	var data = text(doc, 'script[type="application/ld+json"]');
	var json = JSON.parse(data);
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		if (item.creators.length <= 1 && json.author) {
			item.creators = [];
			// json.author can either be an array, or a object containing an array
			if (Array.isArray(json.author)) {
				for (let author of json.author) {
					item.creators.push(ZU.cleanAuthor(author.name, "author"));
				}
			}
			else if (json.author.name) {
				for (let name of json.author.name) {
					item.creators.push(ZU.cleanAuthor(name, "author"));
				}
			}
		}
		
		item.publicationTitle = 'The New Yorker';
		item.date = ZU.strToISO(json.dateModified || json.datePublished);
		item.section = json.articleSection;
		item.ISSN = "0028-792X";
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "magazineArticle";
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.newyorker.com/magazine/2011/10/31/foreign-campaigns",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Foreign Campaigns",
				"creators": [
					{
						"firstName": "David",
						"lastName": "Remnick",
						"creatorType": "author"
					}
				],
				"date": "2011-10-20",
				"ISSN": "0028-792X",
				"abstractNote": "The Republican professionals know it. The numbers show that more than half the country identifies the economy as the most pressing issue of the campaign; …",
				"language": "en-US",
				"libraryCatalog": "www.newyorker.com",
				"publicationTitle": "The New Yorker",
				"url": "https://www.newyorker.com/magazine/2011/10/31/foreign-campaigns",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "2012 election"
					},
					{
						"tag": "arab league"
					},
					{
						"tag": "arab spring"
					},
					{
						"tag": "barack obama"
					},
					{
						"tag": "death"
					},
					{
						"tag": "dictators"
					},
					{
						"tag": "elections"
					},
					{
						"tag": "foreign policy"
					},
					{
						"tag": "herman cain"
					},
					{
						"tag": "idi amin"
					},
					{
						"tag": "libya"
					},
					{
						"tag": "middle east"
					},
					{
						"tag": "mitt romney"
					},
					{
						"tag": "muammar qaddafi"
					},
					{
						"tag": "osama bin laden"
					},
					{
						"tag": "politics"
					},
					{
						"tag": "presidential candidates"
					},
					{
						"tag": "republican party"
					},
					{
						"tag": "republicans"
					},
					{
						"tag": "rick perry"
					},
					{
						"tag": "uzbekistan"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.newyorker.com/news/hendrik-hertzberg/is-that-rick-santorum-on-the-cafeteria-line",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Is That Rick Santorum on the Cafeteria Line?",
				"creators": [
					{
						"firstName": "Hendrik",
						"lastName": "Hertzberg",
						"creatorType": "author"
					}
				],
				"date": "2012-02-24",
				"ISSN": "0028-792X",
				"abstractNote": "I’m a week late with this, but Chris Matthews had a pretty devastating take on Santorum’s “phony theology” attack on Obama’s concern about what …",
				"language": "en-US",
				"libraryCatalog": "www.newyorker.com",
				"publicationTitle": "The New Yorker",
				"url": "https://www.newyorker.com/news/hendrik-hertzberg/is-that-rick-santorum-on-the-cafeteria-line",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "catholics"
					},
					{
						"tag": "rick santorum"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.newyorker.com/search/q/labor",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.newyorker.com/magazine/2017/06/19/remembering-the-murder-you-didnt-commit",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Remembering the Murder You Didn’t Commit",
				"creators": [
					{
						"firstName": "Rachel",
						"lastName": "Aviv",
						"creatorType": "author"
					}
				],
				"date": "2017-06-12",
				"ISSN": "0028-792X",
				"abstractNote": "DNA evidence exonerated six convicted killers. So why do some of them recall the crime so clearly?",
				"language": "en-US",
				"libraryCatalog": "www.newyorker.com",
				"publicationTitle": "The New Yorker",
				"url": "https://www.newyorker.com/magazine/2017/06/19/remembering-the-murder-you-didnt-commit",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "crime"
					},
					{
						"tag": "memory"
					},
					{
						"tag": "murder"
					},
					{
						"tag": "nebraska"
					},
					{
						"tag": "psychology"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.newyorker.com/culture/culture-desk/what-happens-when-a-bad-tempered-distractible-doofus-runs-an-empire",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "What Happens When a Bad-Tempered, Distractible Doofus Runs an Empire?",
				"creators": [
					{
						"firstName": "Miranda",
						"lastName": "Carter",
						"creatorType": "author"
					}
				],
				"date": "2018-06-06",
				"ISSN": "0028-792X",
				"abstractNote": "Donald Trump is reminiscent of Kaiser Wilhelm II, during whose reign the upper echelons of the German government began to unravel into a free-for-all.",
				"language": "en-US",
				"libraryCatalog": "www.newyorker.com",
				"publicationTitle": "The New Yorker",
				"url": "https://www.newyorker.com/culture/culture-desk/what-happens-when-a-bad-tempered-distractible-doofus-runs-an-empire",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "donald trump"
					},
					{
						"tag": "first world war"
					},
					{
						"tag": "germany"
					},
					{
						"tag": "leadership"
					},
					{
						"tag": "narcissism"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
