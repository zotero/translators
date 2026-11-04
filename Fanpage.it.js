{
	"translatorID": "3e64c8c1-c0b7-4d06-abb1-6a170031a23f",
	"label": "Fanpage.it",
	"creator": "Thaddeus Hetling",
	"target": "^https://www\\.fanpage\\.it/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-01-29 22:49:16"
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
	if (getSearchResults(doc, true)) return 'multiple'
	return 'newspaperArticle';
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('#posts_found .fp_article-card-image a.fp_article-card-image__title[href^="https://www.fanpage.it/"]');
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
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		let section = doc.querySelector('meta[property="og:site_name"]')?.content;
		let date = doc.querySelector('time.fp_info__date-updated')?.dateTime;
		let author = text(doc, '.fp_author__name a[data-anact="autore"]');

		let linkedData = document.querySelector('script[type="application/ld+json"]')?.textContent;
		if (linkedData) {
			try {
				linkedData = JSON.parse(linkedData);

				if (!section) section = linkedData?.articleSection?.[0];
				if (!date) date = linkedData?.datePublished;
				if (!author) author = linkedData?.author?.name;
			}
			catch {}
		}

		if (section) item.section = ZU.trim(section);
		if (date) item.date = ZU.trim(date);
		if (author) {
			item.creators.push({
				lastName: ZU.trim(author),
				fieldMode: 1,
				creatorType: 'author'
			});
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
		"url": "https://www.fanpage.it/innovazione/tecnologia/in-un-esperimento-i-topi-hanno-dimostrato-di-essere-ossessionati-dai-selfie-come-gli-esseri-umani/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "In un esperimento i topi hanno dimostrato di essere ossessionati dai selfie come gli esseri umani",
				"creators": [
					{
						"lastName": "Elisabetta Rosso",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"date": "2024-01-29T18:45:35+01:00",
				"abstractNote": "Due roditori sono stati chiusi in una scatola trasparente e hanno cominciato a scattare degli autoritratti premendo una levetta",
				"language": "it",
				"libraryCatalog": "www.fanpage.it",
				"publicationTitle": "Innovazione Fanpage",
				"section": "Innovazione Fanpage",
				"url": "https://www.fanpage.it/innovazione/tecnologia/in-un-esperimento-i-topi-hanno-dimostrato-di-essere-ossessionati-dai-selfie-come-gli-esseri-umani/",
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
		"url": "https://www.fanpage.it/innovazione/?s=topi",
		"items": "multiple"
	}
]
/** END TEST CASES **/
