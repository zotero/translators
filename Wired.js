{
	"translatorID": "f054a3d9-d705-4d2e-a96a-258508bebba3",
	"label": "Wired",
	"creator": "czar",
	"target": "^https?://(www\\.)?wired\\.(com|co\\.uk)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-01-23 16:11:56"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 czar
	http://en.wikipedia.org/wiki/User_talk:Czar

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
	if (/\/(\d{4}\/\d{2}|story|article)\//.test(url)) {
		return "magazineArticle";
	}
	else if (/\/(category|tag|topic)\/|search\/?\?q=|wired\.com\/?$|wired\.co\.uk\/?$/.test(url) && getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}


function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // embedded metadata
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		item.itemType = "magazineArticle";
		if (url.includes("wired.co.uk/article")) {
			item.publicationTitle = "Wired UK";
			item.ISSN = "1357-0978";
			item.date = Zotero.Utilities.strToISO(text(doc, 'div.a-author__article-date')); // use LSON-LD when implemented in EM
		}
		else { // if not wired.co.uk
			item.publicationTitle = "Wired";
			item.ISSN = "1059-1028";
			item.date = ZU.strToISO(text(doc, 'time[data-testid="ContentHeaderPublishDate"]'));			item.creators = [];
			item.creators = [];
			var authorLinks = doc.querySelectorAll('span[data-testid="BylineName"] a');
			for (let link of authorLinks) {
				var name = link.textContent.trim();
				if (name) {
					item.creators.push(ZU.cleanAuthor(name, "author"));
				}
			}
			if (item.tags) { // catch volume/issue if in tags
				var match = null;
				for (let tag of item.tags) {
					match = tag.match(/^(\d{2})\.(\d{2})$/);
					if (match) {
						item.volume = match[1];
						item.issue = parseInt(match[2]);
						item.tags.splice(item.tags.indexOf(tag), 1);
						break;
					}
				}
			}
		}
		item.complete();
	});
	translator.getTranslatorObject(function (trans) {
		trans.doWeb(doc, url);
	});
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('div.card-component h2, li.archive-item-component, section.c-card-section article.c-card h3, .summary-item__content');
	for (let row of rows) {
		let href = attr(row, 'a:first-of-type', 'href');
		let title = ZU.trimInternal(text(row, 'h3') || row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	switch (detectWeb(doc, url)) {
		case "multiple":
			Zotero.selectItems(getSearchResults(doc, false), function (items) {
				if (!items) {
					return;
				}
				var articles = [];
				for (var i in items) {
					articles.push(i);
				}
				ZU.processDocuments(articles, scrape);
			});
			break;
		case "magazineArticle":
			scrape(doc, url);
			break;
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.wired.com/story/in-defense-of-the-vegan-hot-dog/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "In Defense of the Vegan Hot Dog",
				"creators": [
					{
						"firstName": "Emily",
						"lastName": "Dreyfuss",
						"creatorType": "author"
					}
				],
				"date": "2018-07-04",
				"ISSN": "1059-1028",
				"abstractNote": "One carnivore's advice: When a tofu dog snuggles up to your tube steak on the grill, don’t be a jerk about it.",
				"language": "en-US",
				"libraryCatalog": "www.wired.com",
				"publicationTitle": "Wired",
				"url": "https://www.wired.com/story/in-defense-of-the-vegan-hot-dog/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "cooking and recipes"
					},
					{
						"tag": "food and drink"
					},
					{
						"tag": "grilling"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.wired.com/tag/kickstarter/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.wired.com/category/culture/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.wired.com/search/?q=kickstarter&page=1&sort=score",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.wired.co.uk/article/olafur-eliasson-little-sun-charge",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Olafur Eliasson is Kickstarting a solar-powered phone charger",
				"creators": [
					{
						"firstName": "James",
						"lastName": "Temperton",
						"creatorType": "author"
					}
				],
				"date": "2015-09-03",
				"ISSN": "1357-0978",
				"abstractNote": "A high-performance, solar-powered phone charger designed by artist Olafur Eliasson and engineer Frederik Ottesen has raised more than €40,000 (£29,100) on Kickstarter",
				"language": "en-GB",
				"libraryCatalog": "www.wired.co.uk",
				"publicationTitle": "Wired UK",
				"url": "https://www.wired.co.uk/article/olafur-eliasson-little-sun-charge",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Design"
					},
					{
						"tag": "Technology"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.wired.com/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.wired.co.uk/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.wired.co.uk/topic/culture",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.wired.co.uk/search?q=kickstarter",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.wired.com/story/proposed-legislation-self-driving-cars-in-new-york-state/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "New Proposed Legislation Would Let Self-Driving Cars Operate in New York State",
				"creators": [
					{
						"firstName": "Aarian",
						"lastName": "Marshall",
						"creatorType": "author"
					}
				],
				"date": "2026-01-12",
				"ISSN": "1059-1028",
				"abstractNote": "New York governor Kathy Hochul says she will propose a new law allowing limited autonomous vehicle pilots in smaller cities. Full-blown services could be next.",
				"language": "en-US",
				"libraryCatalog": "www.wired.com",
				"publicationTitle": "Wired",
				"url": "https://www.wired.com/story/proposed-legislation-self-driving-cars-in-new-york-state/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "autonomous vehicles"
					},
					{
						"tag": "cities"
					},
					{
						"tag": "new york"
					},
					{
						"tag": "regulation"
					},
					{
						"tag": "self-driving cars"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.wired.com/story/fbi-agents-sworn-testimony-contradicts-claims-ices-jonathan-ross-made-under-oath/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "FBI Agent’s Sworn Testimony Contradicts Claims ICE’s Jonathan Ross Made Under Oath",
				"creators": [
					{
						"firstName": "Matt",
						"lastName": "Giles",
						"creatorType": "author"
					},
					{
						"firstName": "Tim",
						"lastName": "Marchman",
						"creatorType": "author"
					}
				],
				"date": "2026-01-12",
				"ISSN": "1059-1028",
				"abstractNote": "The testimony also calls into question whether Ross failed to follow his training during the incident in which he reportedly shot and killed Minnesota citizen Renee Good.",
				"language": "en-US",
				"libraryCatalog": "www.wired.com",
				"publicationTitle": "Wired",
				"url": "https://www.wired.com/story/fbi-agents-sworn-testimony-contradicts-claims-ices-jonathan-ross-made-under-oath/",
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
						"tag": "department of homeland security"
					},
					{
						"tag": "fbi"
					},
					{
						"tag": "immigration"
					},
					{
						"tag": "immigration and customs enforcement"
					},
					{
						"tag": "minnesota"
					},
					{
						"tag": "police"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
