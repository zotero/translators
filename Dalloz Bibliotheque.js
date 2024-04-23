{
	"translatorID": "2ea86ad9-71ca-410c-9126-9d7d98722acf",
	"label": "Dalloz Bibliothèque",
	"creator": "Alexandre Mimms",
	"target": "https?://(?:www[.-])?bibliotheque[.-]lefebvre[.-]dalloz(?:[.-]fr)?",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-04-19 13:07:42"
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
	if (url.includes('/ouvrage/')) {
		return 'book';
	}
	else if (url.includes('/recherche')) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.result-list-grid-item');

	for (let row of rows) {
		let href = row.querySelectorAll("a")[0].href;
		let title = ZU.trimInternal(row.querySelectorAll(".detail-title")[0].innerText);
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
	const edition = ZU.trimInternal(text(doc, ".editions-edition.css-p7sjbi", 0)).split(" ")[0];
	const date = ZU.trimInternal(text(doc, ".editions-date.css-p7sjbi", 0)).replace(/Edition\s?:\s?/, "");
	const collection = ZU.trimInternal(text(doc, ".notice-header-grid-item.css-1o256gd.e4d31s30:not(.first-item) .notice-header-link", 0));
	const isbn = ZU.trimInternal(text(doc, ".notice-header-grid-item.css-leol38.e4d31s30 .notice-header-link", 0));
	let marque = ZU.trimInternal(text(doc, ".notice-header-grid-item.css-xc5jw0.e4d31s30 .notice-header-link", 0));
	marque = marque.substring(0, 1) + marque.substring(1).toLowerCase();
	const auteurs = ZU.trimInternal(text(doc, ".notice-header-grid-item.css-2bwjgy.e4d31s30 .notice-header-link", 0)).split(" • ");
	const titre = ZU.trimInternal(text(doc, ".title", 0));
	const abstract = ZU.trimInternal(text(doc, ".description", 0)).replace("Description", "");

	let newItem = new Z.Item("book");

	for (let auteur of auteurs) {
		const auteurNames = auteur.split(" ");
		newItem.creators.push({
			firstName: auteurNames[0],
			lastName: auteurNames[1],
			creatorType: "author",
			fieldMode: true
		});
	}

	newItem.title = titre;
	newItem.date = date;
	newItem.abstractNote = abstract;
	newItem.ISBN = isbn;
	newItem.edition = edition;
	newItem.publisher = marque;
	newItem.language = "french";
	newItem.series = collection;
	newItem.url = url;

	newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
