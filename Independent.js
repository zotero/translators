{
	"translatorID": "274f2f78-82d6-40d9-a441-ec3935edc0a9",
	"label": "Independent",
	"creator": "Laurence Stevens",
	"target": "https?://(www\\.)?independent\\.co\\.uk",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-02-04 10:05:56"
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
		return 'newspaperArticle'; // or should this be magazineArticle or even something else? i'm new so unsure.
	}
	else if (url.includes('/search')) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll('.news-link ');
	//Zotero.debug(rows);
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	Zotero.debug(items);
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let items = Zotero.selectItems(getSearchResults(doc, false));

		if (!items) {
			return true;
		}

		const articles = [];
		for (const i in items) {
			articles.push(i);
		}
		ZU.processDocuments(articles, scrape);
		return true;
	}
	else {
		return scrape(doc, url);
	}
}

function scrape(doc, url) {
	const translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // embedded metadata (EM)
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) { // corrections to EM
		item.publicationTitle = "The Independent";

		let linkedData = JSON.parse(text(doc, 'script[type="application/ld+json"]'));
		if (linkedData) {
			if (linkedData.headline) item.title = linkedData.headline;
			if (linkedData.description) item.abstractNote = linkedData.description;
			if (linkedData.datePublished) item.date = linkedData.datePublished;
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
]
/** END TEST CASES **/
