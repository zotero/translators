{
	"translatorID": "ba26cdb5-403c-4e1c-bc58-a0717f2ec4dc",
	"label": "Il Post",
	"creator": "Thaddeus Hetling",
	"target": "^https://www\\.ilpost\\.it/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-01-30 00:09:51"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Thaddeus Hetling

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
	if (url.includes('/episodes/')) {
		// TODO
		// return 'podcast';
	}
	else if (url.includes('/newsletter/')) {
		// TODO
		// return 'blogPost';
	}
	else if (url.includes('/cerca/')) {
		return 'multiple';
	}
	else {
		return 'newspaperArticle';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h4[class^="_card-title_"] > a');
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
	await doWebInternal(doc, url, true);
}

async function doWebInternal(doc, url, includeSearch) {
	switch (detectWeb(doc, url)) {
		case 'newspaperArticle':
			await scrapeArticle(doc, url);
			break;
		case 'multiple':
			if (!includeSearch) return;
			let searchResults = getSearchResults(doc, false);
			if (!searchResults) return;
			let items = await Zotero.selectItems(getSearchResults(doc, false));
			if (!items) return;
			for (let url of Object.keys(items)) {
				await doWebInternal(await requestDocument(url), url, false);
			}
			break;
	}
}

const ISSN = '2610-9980';

async function scrapeArticle(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', (_obj, item) => {
		item.ISSN = ISSN;

		let nextData = doc.getElementById("__NEXT_DATA__")?.textContent;
		if (nextData) {
			try {
				nextData = JSON.parse(nextData);

				let author = nextData.props?.pageProps?.data?.data?.main?.data?.author;
				if (author?.first_name && author?.last_name) {
					item.creators.push({
						firstName: author.first_name,
						lastName: author.last_name,
						fieldMode: 0,
						creatorType: 'author'
					});
				}

				let taxonomyData = nextData.props?.pageProps?.data?.data?.taxonomy_info?.data;
				if (taxonomyData) {
					let sections = [];
					for (let taxonomy of taxonomyData) {
						if (!taxonomy.name) continue;
						switch (taxonomy?.taxonomy) {
							case 'category':
								sections.push(taxonomy.name);
								break;
							case 'post_tag':
								item.tags.push(taxonomy.name);
								break;
						}
					}
					if (sections.length > 0) item.section = sections.sort().join(', ');
				}
			}
			catch {}
		}
	
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
		"url": "https://www.ilpost.it/2024/01/25/trussardi-vendita-miroglio-fallimento/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Storia del fallimento di Trussardi",
				"creators": [
					{
						"firstName": "Arianna",
						"lastName": "Cavallo",
						"fieldMode": 0,
						"creatorType": "author"
					}
				],
				"date": "2024-01-25T13:16:56+01:00",
				"ISSN": "2610-9980",
				"abstractNote": "L'azienda bergamasca è in crisi da anni e sta per essere venduta: c'entrano la gestione familiare, la guerra con la Russia e la crisi del lusso",
				"language": "it",
				"libraryCatalog": "www.ilpost.it",
				"publicationTitle": "Il Post",
				"section": "Cultura, Moda",
				"url": "https://www.ilpost.it/2024/01/25/trussardi-vendita-miroglio-fallimento/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "miroglio"
					},
					{
						"tag": "moda"
					},
					{
						"tag": "nicola trussardi"
					},
					{
						"tag": "trussardi"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ilpost.it/2022/04/14/microplastiche-polmoni/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Le microplastiche nei nostri polmoni",
				"creators": [],
				"date": "2022-04-14T11:22:13+02:00",
				"ISSN": "2610-9980",
				"abstractNote": "Per la prima volta sono state rilevate nei tessuti polmonari di alcuni pazienti, a conferma della loro enorme diffusione nell'ambiente",
				"language": "it",
				"libraryCatalog": "www.ilpost.it",
				"publicationTitle": "Il Post",
				"section": "Scienza",
				"url": "https://www.ilpost.it/2022/04/14/microplastiche-polmoni/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Scienza"
					},
					{
						"tag": "inquinamento"
					},
					{
						"tag": "microplastiche"
					},
					{
						"tag": "pianeta"
					},
					{
						"tag": "plastica"
					},
					{
						"tag": "polmoni"
					},
					{
						"tag": "salute"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ilpost.it/cerca/?qs=microplastiche&pg=1&sort=default&filters=",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
