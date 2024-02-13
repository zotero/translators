{
	"translatorID": "274f2f78-82d6-40d9-a441-ec3935edc0a9",
	"label": "The Independent",
	"creator": "Laurence Stevens",
	"target": "https?://(www\\.)?independent\\.co\\.uk",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-02-13 04:56:54"
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

function detectWeb(doc, _url) {
	try {
		// article metadata is located in the third application/ld+json section
		let metadata = JSON.parse(ZU.xpathText(doc, '//script[@type="application/ld+json"][3]'));
		if (metadata["@type"] === "NewsArticle") {
			return "newspaperArticle";
		}
	} catch (error) {
		Zotero.debug("Unable to find article metadata");
	}
	return false;
}

async function doWeb(doc, url) {
	await scrape(doc, url);
}

async function scrape(doc, url) {
	const translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // Embedded Metadata (EM)
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) { // corrections to EM
		item.publicationTitle = "The Independent";

		let linkedData = JSON.parse(ZU.xpathText(doc, '//script[@type="application/ld+json"][3]'));
		if (linkedData) {
			if (linkedData.headline) item.title = linkedData.headline;
			if (linkedData.description) item.abstractNote = linkedData.description;
			if (linkedData.datePublished) item.date = linkedData.datePublished;
			if (linkedData.author.name) item.creators = [ZU.cleanAuthor(linkedData.author.name, 'author')];
		}

		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = detectWeb(doc, url) || "newspaperArticle";
		trans.doWeb(doc, url);
	});
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.independent.co.uk/sport/football/everton-tottenham-result-final-score-richarlison-b2489969.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Everton v Tottenham result: The Pep Guardiola lesson behind the Toffees’ comeback",
				"creators": [
					{
						"firstName": "Richard",
						"lastName": "Jolly",
						"creatorType": "author"
					}
				],
				"date": "2024-02-03T16:10:05.000Z",
				"abstractNote": "Everton 2-2 Tottenham: Richarlison’s double was erased by two set-pieces to salvage a valuable point for the Toffees",
				"language": "en",
				"libraryCatalog": "www.independent.co.uk",
				"publicationTitle": "The Independent",
				"section": "Sport",
				"shortTitle": "Everton v Tottenham result",
				"url": "https://www.independent.co.uk/sport/football/everton-tottenham-result-final-score-richarlison-b2489969.html",
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
		"url": "https://www.independent.co.uk/independentpremium/lifestyle/working-from-home-health-wfh-b2493645.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "What working from home is really doing to your health",
				"creators": [
					{
						"firstName": "Anna",
						"lastName": "Magee",
						"creatorType": "author"
					}
				],
				"date": "2024-02-12T06:00:00.000Z",
				"abstractNote": "From calorie intake to our mental and physical health, new ways of remote and hybrid working are having some profound effects on our wellness. Anna Magee looks at the latest studies and speaks with health specialists to find out how we can make it work best for our bodies and minds",
				"language": "en",
				"libraryCatalog": "www.independent.co.uk",
				"publicationTitle": "The Independent",
				"section": "Independent Premium",
				"url": "https://www.independent.co.uk/independentpremium/lifestyle/working-from-home-health-wfh-b2493645.html",
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
