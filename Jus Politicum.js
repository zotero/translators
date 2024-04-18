{
	"translatorID": "aeb7f19b-0907-4117-bef4-08e36af4d31f",
	"label": "Jus Politicum",
	"creator": "Alexandre Mimms",
	"target": "https?://(?:www[.-])?juspoliticum.com",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-04-18 16:40:24"
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
	if (url.includes('/article/')) {
		return 'journalArticle';
	}
	else if (url.includes('/searches')) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('#search-section h2 a');
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
	const abstract = ZU.trimInternal(text(doc, "#content"));
	const titre = ZU.trimInternal(text(doc, "h2"))
	const numero = text(doc, ".release-title .num").replace("N°", "");
	const linkURL = doc.querySelectorAll(".documentsAssocies a")[0].href;
	const auteurs = text(doc, ".article-author").split(", ");

	let newItem = new Zotero.Item("journalArticle");

	for (let auteur of auteurs) {
		const auteurNames = auteur.split(" ");
		newItem.creators.push({
			firstName: auteurNames[0],
			lastName: auteurNames[1],
			creatorType: "author",
			fieldMode: true
		})
	}

	newItem.title = titre;
	newItem.issue = numero;
	newItem.abstractNote = abstract;

	newItem.attachments = [{
		url: linkURL,
		title: "Full text PDF",
		mimeType: "application/pdf",
	}];

	newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
