{
	"translatorID": "4fbb8dfd-459d-445e-bd2a-5ea89814b0c0",
	"label": "Perlego",
	"creator": "Brendan O'Connell",
	"target": "",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-03-30 13:27:53"
}

// example: https://github.com/zotero/translators/issues/2810
// metadata is contained in JSON-LD
// there are several good examples of translators that use JSON-LD
// step 1: build translator that captures all metadata
// step 2: sign up for free trial to test PDF attachment file saving


/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2023 Brendan O'Connell

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
	// TODO: adjust the logic here
	if (url.includes('/book/')) {
		return 'book';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// TODO: adjust the CSS selector
	var rows = doc.querySelectorAll('div.sc-bhhwZE');
	for (let row of rows) {
		// TODO: check and maybe adjust
		let href = row.href;
    // if row.href contains /null/ remove it, so this will work for non-logged in users
		// TODO: check and maybe adjust
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
	// TODO: implement or add a scrape function template
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
