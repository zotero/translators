{
	"translatorID": "3243d081-22c0-452c-8298-9d8a9fb5de2f",
	"label": "Lextenso",
	"creator": "Alexandre Mimms",
	"target": "https?://(www\\.)?labase-lextenso\\.fr/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-04-23 11:30:31"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Alexandre Mimms

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
	if (url.includes('/lextenso/rechercher') && getSearchResults(doc, true)) {
		return 'multiple';
	}
	else if (doc.querySelector(".node-type-ouvrage")) {
		return 'book';
	}
	else if (doc.querySelector(".lextenso-document-article")) {
		return 'journalArticle';
	}
	return false;
}


async function scrapeJournalArticle(doc, url) {
	const references = ZU.trimInternal(text(doc, ".document-metadata-origin").replace("Issu de ", "")).split(" - ");
	const revue = references[0];
	const numeroRevue = references[1];
	const page = references[2];
	const titre = ZU.trimInternal(text(doc, "#page-title"));
	const auteurs = doc.querySelectorAll(".document-metadata-authors-name");
	const abstract = ZU.trimInternal(text(doc, ".cChapeau"));
	const date = ZU.trimInternal(text(doc, ".document-metadata-date").replace("Date de parution : ", ""));

	let newItem = new Z.Item("journalArticle");
	newItem.title = titre;

	for (let auteur of auteurs) {
		newItem.creators.push(ZU.cleanAuthor(auteur.innerText, "author"));
	}

	newItem.date = date;
	newItem.abstractNote = abstract;
	newItem.publicationTitle = revue;
	if (numeroRevue) { newItem.issue = numeroRevue.replace(/n°[0]?/, ""); }
	if (page) { newItem.pages = page.replace(/page\s?/, ""); }
	newItem.complete();
}

async function scrapeBook(doc, url) {
	// weirdly enough no real information is displayed on the book summary page, but
	// some info, like ISBN, is shown on individual pages.
	// So, we get the first url to one of those individual pages, then request it so we
	// can fetch the information.
	// I did not yet find a way to fetch the number of page or edition.
	// I tried accessing the link of the shop, where those are displayed, but the request
	// fails.
	const firstItemUrl = doc.querySelectorAll(".book-summary-list li a")[0].href;
	Z.debug(firstItemUrl);
	const indivPage = await requestDocument(firstItemUrl);

	// Accessing the metadata - reversing the list, since there can be multiple authors
	// the end of the list will always be the same, so easier and surer to do it like that.
	const ref = text(indivPage, ".document-metadata-ref .value", 0).split(", ").reverse();
	const date = ref[2];
	const publisher = ref[1];
	const isbn = ref[0];

	const auteurs = indivPage.querySelectorAll(".document-metadata-authors-name");

	const titre = text(doc, "#page-title");

	let newItem = new Z.Item("book");
	newItem.title = titre;
	
	for (let auteur of auteurs) {
		newItem.creators.push(ZU.cleanAuthor(auteur.innerText, "author"));
	}

	newItem.date = date;
	newItem.publisher = publisher;
	newItem.ISBN = isbn;
	newItem.pages = page.replace(/page\s?/, "");
	newItem.url = url;
	newItem.language = "fr";
	newItem.complete();
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;

	var rows = doc.querySelectorAll('.hit');
	for (let row of rows) {
		let href = row.querySelectorAll("a")[0].href;
		let title = ZU.trimInternal(row.querySelectorAll("h3")[0].innerText);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	const docType = detectWeb(doc, url);
	if (docType == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url), docType);
		}
	}
	else {
		await scrape(doc, url, docType);
	}
}

async function scrape(doc, url = doc.location.href, docType) {
	if (docType == "journalArticle") {
		scrapeJournalArticle(doc, url);
	}
	else if (docType == "book") {
		scrapeBook(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.labase-lextenso.fr/",
		"detectedItemType": false,
		"items": []
	},
	{
		"type": "web",
		"url": "https://www.labase-lextenso.fr/revue-generale-du-droit-des-assurances/RGA201v5",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "La priorité du tiers lésé sur l'indemnité d'assurance",
				"creators": [
					{
						"firstName": "James",
						"lastName": "Landel",
						"creatorType": "author"
					}
				],
				"abstractNote": "Action directe ; C. assur., art. L. 124-3 ; Somme versée par l’assureur du responsable à la personne indiquée comme « preneur d'assurance / assuré » et « conducteur » sur le constat amiable ; Condamnation de l’assureur envers le tiers lésé, propriétaire du véhicule ; Montant ; Cour d’appel : soustraction des sommes payées au tiers lésé une somme versée à un tiers ; Cassation",
				"libraryCatalog": "Lextenso",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
