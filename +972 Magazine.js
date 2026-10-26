{
	"translatorID": "7b4bd835-d8c6-4779-bfaa-6100e221a708",
	"label": "+972 Magazine",
	"creator": "Abe Jellinek",
	"target": "^https://www\\.972mag\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-11-06 20:26:59"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Abe Jellinek

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
	if (doc.querySelector('.article')) {
		return 'magazineArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.headline a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
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
	let articleRoots = doc.querySelectorAll('.article[data-article_url]');
	let articleRoot = [...articleRoots].find(root => url.startsWith(root.getAttribute('data-article_url')))
		|| doc.body;

	let date = text(articleRoot, 'header .byline .date');
	
	let creators = [];
	for (let authorElem of articleRoot.querySelectorAll('header .byline .author')) {
		let authorName = authorElem.textContent.trim();
		// Can't reliably detect institutional authors, but there aren't that many in this publication
		if (authorName == 'Sebastian Ben Daniel (John Brown)') {
			creators.push({
				firstName: 'Sebastian (John Brown)',
				lastName: 'Ben Daniel',
				creatorType: 'author'
			});
		}
		else if (authorName == 'The Seventh Eye' || authorName == 'Local Call') {
			creators.push({
				lastName: authorName,
				creatorType: 'author',
				fieldMode: 1
			});
		}
		else {
			creators.push(ZU.cleanAuthor(authorName, 'author'));
		}
	}

	let tags = [];
	for (let tag of articleRoot.querySelectorAll('.tags [rel="tag"]')) {
		tags.push({ tag: tag.textContent });
	}

	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		item.url = item.url.replace('http://', 'https://');
		if (date) item.date = ZU.strToISO(date);
		item.creators = creators;
		item.tags = tags;
		
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'magazineArticle';
	await em.doWeb(doc, url);
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.972mag.com/al-jazeera-israel-gaza-censorship/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Will Israel shut down Al Jazeera?",
				"creators": [
					{
						"firstName": "Oren",
						"lastName": "Persico",
						"creatorType": "author"
					},
					{
						"lastName": "The Seventh Eye",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2023-11-01",
				"abstractNote": "The gov't is advancing regulations to close the network's Israel branch, a move journalists and free press defenders decry as baseless and dangerous.",
				"language": "en-US",
				"libraryCatalog": "www.972mag.com",
				"url": "https://www.972mag.com/al-jazeera-israel-gaza-censorship/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Al Jazeera"
					},
					{
						"tag": "Media"
					},
					{
						"tag": "Netanyahu's sixth government"
					},
					{
						"tag": "October 2023 war"
					},
					{
						"tag": "Palestinian journalists"
					},
					{
						"tag": "The Seventh Eye"
					},
					{
						"tag": "censorship"
					},
					{
						"tag": "freedom of press"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.972mag.com/israeli-protest-gaza-war-repression/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Risking arrest and assault, Israelis begin protesting Gaza war",
				"creators": [
					{
						"firstName": "Oren",
						"lastName": "Ziv",
						"creatorType": "author"
					}
				],
				"date": "2023-10-31",
				"abstractNote": "Gathering outside the army’s HQ in central Tel Aviv, dozens of Israelis called for a ceasefire and the release of all hostages.",
				"language": "en-US",
				"libraryCatalog": "www.972mag.com",
				"url": "https://www.972mag.com/israeli-protest-gaza-war-repression/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Gaza"
					},
					{
						"tag": "Local Call"
					},
					{
						"tag": "October 2023 war"
					},
					{
						"tag": "censorship"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.972mag.com/israel-gaza-war-political-persecution/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Israel cracks down on internal critics of its Gaza war",
				"creators": [
					{
						"firstName": "Ghousoon",
						"lastName": "Bisharat",
						"creatorType": "author"
					},
					{
						"firstName": "Oren",
						"lastName": "Ziv",
						"creatorType": "author"
					},
					{
						"firstName": "Baker",
						"lastName": "Zoubi",
						"creatorType": "author"
					}
				],
				"date": "2023-10-17",
				"abstractNote": "Palestinians, as well as some left-wing Jews, are being suspended from studies, fired from jobs, or arrested at night — all because of social media posts.",
				"language": "en-US",
				"libraryCatalog": "www.972mag.com",
				"url": "https://www.972mag.com/israel-gaza-war-political-persecution/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Gaza"
					},
					{
						"tag": "Israeli Police"
					},
					{
						"tag": "Local Call"
					},
					{
						"tag": "October 2023 war"
					},
					{
						"tag": "Palestinian Citizens of Israel"
					},
					{
						"tag": "freedom of expression"
					},
					{
						"tag": "political persecution"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.972mag.com/high-court-israeli-officers-prosecution/",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Israel's security brass are defending the High Court to save themselves",
				"creators": [
					{
						"firstName": "Sebastian (John Brown)",
						"lastName": "Ben Daniel",
						"creatorType": "author"
					}
				],
				"date": "2023-09-11",
				"abstractNote": "Israel's top court has consistently shielded soldiers from standing trial. Now they fear the judicial overhaul could expose them to prosecution overseas.",
				"language": "en-US",
				"libraryCatalog": "www.972mag.com",
				"url": "https://www.972mag.com/high-court-israeli-officers-prosecution/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "High Court of Justice"
					},
					{
						"tag": "International Criminal Court"
					},
					{
						"tag": "Local Call"
					},
					{
						"tag": "impunity"
					},
					{
						"tag": "israeli soldiers"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.972mag.com/search/?q=overhaul",
		"items": "multiple"
	}
]
/** END TEST CASES **/
