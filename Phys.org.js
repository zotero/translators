{
	"translatorID": "e835ac2f-181b-41fe-a509-4f9d20797515",
	"label": "Phys.org",
	"creator": "Laurence Stevens",
	"target": "https?://(www\\.)?phys\\.org/news",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-02-12 05:01:36"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Laurence Stevens

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
	if (url.includes('/news')) {
		return 'blogPost';
	}
	else if (url.includes('/search') && getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll('.news-link');
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
	if (detectWeb(doc, url) == "multiple") {
		let items = await Zotero.selectItems(getSearchResults(doc, false));

		if (!items) {
			return true;
		}

		const articles = [];
		for (const i in items) {
			articles.push(i);
		}
		await ZU.processDocuments(articles, scrape);
		return true;
	}
	else {
		return await scrape(doc, url);
	}
}

function scrape(doc, url) {
	const translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // Embedded Metadata
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) { // corrections to EM
		item.publicationTitle = "Phys.org";

		let byline = text(doc, '.article-byline');
		let [name, publisher] = byline.split(', ');
		name = name.replace(/^by /, '');
		item.creators = ZU.cleanAuthor(name, 'author');
		if (publisher) {
			item.extra = (item.extra ? item.extra + '\n' : '') + 'Original Publisher: ' + publisher;
		}

		try {
			let linkedData = JSON.parse(text(doc, 'script[type="application/ld+json"]'));
			if (linkedData) {
				if (linkedData.headline) item.title = linkedData.headline;
				if (linkedData.description) item.abstractNote = linkedData.description;
				if (linkedData.datePublished) item.date = linkedData.datePublished;
			}
		} catch (error) {
			Zotero.debug("Error parsing JSON metadata");
		}

		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = detectWeb(doc, url);
		trans.doWeb(doc, url);
	});
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://phys.org/news/2023-11-colossal-biosciences-home-extinct-species.html",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Colossal Biosciences finds a home for one extinct species",
				"creators": {
					"firstName": "Irving",
					"lastName": "Mejia-Hilario",
					"creatorType": "author"
				},
				"date": "2023-11-22T10:01:06-05:00",
				"abstractNote": "After years of working on bringing back one of the most popular extinct animals—the dodo—Colossal Biosciences has found a home for its bird in Mauritius in a new partnership with the Mauritian Wildlife Foundation.",
				"blogTitle": "Phys.org",
				"extra": "Original Publisher: The Dallas Morning News",
				"language": "en",
				"url": "https://phys.org/news/2023-11-colossal-biosciences-home-extinct-species.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Materials"
					},
					{
						"tag": "Nanotech"
					},
					{
						"tag": "Physics"
					},
					{
						"tag": "Physics News"
					},
					{
						"tag": "Science"
					},
					{
						"tag": "Science"
					},
					{
						"tag": "Science news"
					},
					{
						"tag": "Technology"
					},
					{
						"tag": "Technology News"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://phys.org/news/2022-09-hormone-revealed-heart-properties.html",
		"items": [
			{
				"itemType": "blogPost",
				"title": "'Love hormone' is revealed to have heart healing properties",
				"creators": {
					"firstName": "",
					"lastName": "Frontiers",
					"creatorType": "author"
				},
				"date": "2022-09-30T00:10:01-04:00",
				"abstractNote": "The neurohormone oxytocin is well-known for promoting social bonds and generating pleasurable feelings, for example from art, exercise, or sex. But the hormone has many other functions, such as the regulation of lactation and uterine contractions in females, and the regulation of ejaculation, sperm transport, and testosterone production in males.",
				"blogTitle": "Phys.org",
				"language": "en",
				"url": "https://phys.org/news/2022-09-hormone-revealed-heart-properties.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Materials"
					},
					{
						"tag": "Nanotech"
					},
					{
						"tag": "Physics"
					},
					{
						"tag": "Physics News"
					},
					{
						"tag": "Science"
					},
					{
						"tag": "Science"
					},
					{
						"tag": "Science news"
					},
					{
						"tag": "Technology"
					},
					{
						"tag": "Technology News"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://phys.org/news/2024-02-multi-photon-state-remote-superconducting.html",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Researchers demonstrate multi-photon state transfer between remote superconducting nodes",
				"creators": {
					"firstName": "Ingrid",
					"lastName": "Fadelli",
					"creatorType": "author"
				},
				"date": "2024-02-10T08:30:01-05:00",
				"abstractNote": "Over the past few decades, quantum physicists and engineers have been trying to develop new, reliable quantum communication systems. These systems could ultimately serve as a testbed to evaluate and advance communication protocols.",
				"blogTitle": "Phys.org",
				"extra": "Original Publisher: Phys.org",
				"language": "en",
				"url": "https://phys.org/news/2024-02-multi-photon-state-remote-superconducting.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Materials"
					},
					{
						"tag": "Nanotech"
					},
					{
						"tag": "Physics"
					},
					{
						"tag": "Physics News"
					},
					{
						"tag": "Science"
					},
					{
						"tag": "Science"
					},
					{
						"tag": "Science news"
					},
					{
						"tag": "Technology"
					},
					{
						"tag": "Technology News"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://phys.org/search/?search=dodo&s=0",
		"items": "multiple"
	}
]
/** END TEST CASES **/
