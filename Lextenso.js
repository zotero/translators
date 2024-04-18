{
	"translatorID": "3243d081-22c0-452c-8298-9d8a9fb5de2f",
	"label": "Lextenso",
	"creator": "Alexandre Mimms",
	"target": "https?://(?:www[.-])?labase[.-]lextenso[.-](?:[.-]fr)?",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-04-18 16:17:04"
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


async function scrapeJournalArticle(doc, url) {
	const references = ZU.trimInternal(text(doc, ".document-metadata-origin").replace("Issu de ", "")).split(" - ");
	const revue = references[0];
	const numeroRevue = references[1];
	const page = references[2];
	const titre = ZU.trimInternal(text(doc, "#page-title"));
	const auteurs = doc.querySelectorAll(".document-metadata-authors-name");
	const abstract = ZU.trimInternal(text(doc, ".cChapeau", 0));
	const date = ZU.trimInternal(text(doc, ".document-metadata-date", 0).replace("Date de parution : ", ""));


	let newItem = new Z.Item("journalArticle");
	newItem.title = titre;
	
	for (let auteur of auteurs) {
		const auteurNames = auteur.innerText.split(" ");
		newItem.creators.push({
			firstName: auteurNames[0],
			lastName: auteurNames[1],
			creatorType: "author",
			fieldMode: true,
		});
	}

	newItem.date = date;
	newItem.abstractNote = abstract;
	newItem.publicationTitle = revue;
	newItem.issue = numeroRevue.replace(/n°[0]?/, "");
	newItem.pages = page.replace(/page\s?/, "");
	newItem.url = url;
	newItem.language = "french";
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
		const auteurNames = auteur.innerText.split(" ");
		newItem.creators.push({
			firstName: auteurNames[0],
			lastName: auteurNames[1],
			creatorType: "author",
			fieldMode: true,
		});
	}

	newItem.date = date;
	newItem.publisher = publisher;
	newItem.ISBN = isbn;
	// newItem.pages = page.replace(/page\s?/, "");
	newItem.url = url;
	newItem.language = "french";
	newItem.complete();
}

function detectWeb(doc, url) {
	// TODO: adjust the logic here
	if (url.includes('/lextenso/rechercher')) {
		return 'multiple';
	}
	else if (doc.querySelectorAll(".node-type-ouvrage").length > 0) {
		return 'book';
	}
	else if (doc.querySelectorAll(".lextenso-document-article").length > 0) {
		return 'journalArticle';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;

	var rows = doc.querySelectorAll('h2 > a.title[href*="/article/"]');
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
		"url": "https://www-labase-lextenso-fr.docelec-u-paris2.idm.oclc.org/",
		"detectedItemType": false,
		"items": []
	}
]
/** END TEST CASES **/
