{
	"translatorID": "660fcf3e-3414-41b8-97a5-e672fc2e491d",
	"label": "EBSCO Discovery Layer",
	"creator": "Sebastian Karcher",
	"target": "^https?://(discovery|research)\\.ebsco\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-02-04 04:24:48"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Sebastian Karcher

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

const itemRegex = /\/c\/([^/]+)(?:\/search)?\/(?:details|viewer\/pdf)\/([^?]+)/;
function detectWeb(doc, url) {
	if (itemRegex.test(url)) {
		if (url.includes("/viewer/pdf")) {
			return "journalArticle";
		}
		Z.monitorDOMChanges(doc.querySelector('#page-container'));
		let type = text(doc, 'div[class*="article-type"]');
		if (type) {
			return getType(type);
		}
		return "book";
	}
	else if (url.includes("results")) {
		Z.monitorDOMChanges(doc.querySelector('#page-container'));
		if (getSearchResults(doc, true)) {
			return "multiple";
		}
		return false;
	}
	return false;
}

function getType(type) {
	// This can probably be fine-tuned, but it'll work for 90% of results
	type = type.toLowerCase();
	// Z.debug(type)
	if (type.includes("article") || type.includes("artikel")) {
		return "journalArticle";
	}
	else {
		return "book";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;

	var rows = doc.querySelectorAll('h2.result-item-title > a');
	if (!rows.length) {
		rows = doc.querySelectorAll('div[class*="result-item-title"]>a');
	}
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
		if (items) {
			await Promise.all(
				Object.keys(items)
					.map(url => requestDocument(url).then(scrape))
			);
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	// Z.debug(url);
	let itemMatch = url.match(itemRegex);
	// Z.debug(itemMatch)
	if (itemMatch) {
		var recordId = itemMatch[2];
		var opid = itemMatch[1];
	}
	
	let risURL = `/linkprocessor/v2-ris?recordId=${recordId}&opid=${opid}&lang=en`;
	// Z.debug(risURL)

	// this won't work always
	let pdfURL = `/linkprocessor/v2-pdf?recordId=${recordId}&sourceRecordId=${recordId}&profileIdentifier=${opid}&intent=download&lang=en`;


	let risText = await requestText(risURL);
	// Z.debug(risText)
	let translator = Zotero.loadTranslator('import');
	translator.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7'); // RIS
	translator.setString(risText);
	translator.setHandler('itemDone', (_obj, item) => {
		// the DB gets written to the Archive field
		delete item.archive;

		//fix single-field person authors
		for (let i = 0; i < item.creators.length; i++) {
			if (item.creators[i].fieldMode == 1 && item.creators[i].lastName && item.creators[i].lastName.includes(" ")) {
				item.creators[i] = ZU.cleanAuthor(item.creators[i].lastName, item.creators[i].creatorType, false);
			}
		}
		item.attachments.push({ url: pdfURL, title: "Full text PDF", mimeType: "application/pdf" });
		item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/

/** END TEST CASES **/
