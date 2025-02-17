{
	"translatorID": "7db6b01b-612a-46be-8b53-72c7b01551df",
	"label": "Ansa",
	"creator": "Thaddeus Hetling",
	"target": "^https://www\\.ansa\\.it/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-01-29 23:04:09"
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
	if (url.includes('/notizie/')) {
		return 'newspaperArticle';
	}
	else if (url.includes('/ricerca/')) {
		if (getSearchResults(doc, true)) return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h2.title > a');
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

function getMetadataItem(doc, prop) {
	return attr(doc, "html>head>meta[itemprop='" + prop + "']", 'content');
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		// Parse authors
		let authors = getMetadataItem(doc, 'author').replace(/^di\s+/i, '').split(/\s+e\s+/);

		item.creators = authors.map((author) => ({
			fieldMode: 1,
			lastName: author,
			creatorType: 'author'
		}));

		// Clean up abstract
		item.abstractNote = item.abstractNote.replace(/\s+\(ANSA\)$/, '');

		// Section
		let section = document.querySelector('li.is-section > a');
		if (section) {
			item.section = section.textContent;
		}

		// Replace tags with correctly formatted, cleaned up list
		let redundantTags = new Set(authors);
		redundantTags.add('ANSA');

		let tags = Array.prototype.map.call(document.querySelectorAll('ul#all-tags > li:not(.show-more) > a.tag'), (t) => t.textContent);
		item.tags = tags.filter((t) => !redundantTags.has(t));

		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'newspaperArticle';
	em.addCustomFields({
		'EdTitle': 'title'
	});
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.ansa.it/sito/notizie/speciali/tempo_di_esami/2024/01/29/greco-al-classico-matematica-allo-scientifico_a0eb4aef-0261-41c1-9fbc-8b792c525076.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Greco al Classico, matematica allo Scientifico",
				"creators": [
					{
						"fieldMode": 1,
						"lastName": "Valentina Roncati",
						"creatorType": "author"
					}
				],
				"date": "2024-01-29T18:41",
				"abstractNote": "Il ministro: 'Esame come lo scorso anno, due scritti e l'orale'",
				"language": "it",
				"libraryCatalog": "www.ansa.it",
				"publicationTitle": "Agenzia ANSA",
				"section": "ANSA",
				"url": "https://www.ansa.it/sito/notizie/speciali/tempo_di_esami/2024/01/29/greco-al-classico-matematica-allo-scientifico_a0eb4aef-0261-41c1-9fbc-8b792c525076.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Esami, Test"
					},
					{
						"tag": "Giuseppe Valditara"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ansa.it/sito/notizie/mondo/2024/01/29/ue-e-ungheria-in-stallo-su-aiuti-a-kiev-situazione-difficile_9b1ee9cc-01f6-4541-a3db-30e7b7043841.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Ue e Ungheria in stallo su aiuti a Kiev, 'situazione difficile'",
				"creators": [
					{
						"fieldMode": 1,
						"lastName": "Redazione ANSA",
						"creatorType": "author"
					}
				],
				"date": "2024-01-29T23:37",
				"abstractNote": "Fumata grigia al termine della riunione degli ambasciatori dei 27 in vista del Consiglio europeo straordinario sulla revisione del bilancio comune e sul finanziamento da 50 miliardi all'Ungheria.",
				"language": "it",
				"libraryCatalog": "www.ansa.it",
				"publicationTitle": "Agenzia ANSA",
				"section": "Mondo",
				"url": "https://www.ansa.it/sito/notizie/mondo/2024/01/29/ue-e-ungheria-in-stallo-su-aiuti-a-kiev-situazione-difficile_9b1ee9cc-01f6-4541-a3db-30e7b7043841.html",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Consiglio Europeo"
					},
					{
						"tag": "Contabilità, Revisione"
					},
					{
						"tag": "Rendicontazione, Verifica"
					},
					{
						"tag": "Unione Europea"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ansa.it/ricerca/ansait/search.shtml?tag=Liliana+Segre",
		"items": "multiple"
	}
]
/** END TEST CASES **/
