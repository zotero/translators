{
	"translatorID": "1e2a9aba-eb04-4398-9e3a-630e6132db13",
	"label": "Chicago Journal of Theoretical Computer Science",
	"creator": "Morgan Shirley",
	"target": "^https?://cjtcs\\.cs\\.uchicago\\.edu/articles",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-05-14 00:10:19"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Morgan Shirley

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

/**
 * Volumes are at articles/year/contents.html
 * Individual articles are at articles/year/#/contents.html
 * Special issues at articles/[issue name]/contents.html
 */
function detectWeb(doc, url) {
	var singleRe = /^https?:\/\/cjtcs\.cs\.uchicago\.edu\/articles\/\w+\/\d+\/contents.html/
	var multipleRe = /^https?:\/\/cjtcs\.cs\.uchicago\.edu\/articles\/\w+\/contents.html/
	if (multipleRe.test(url)) {
		return getMultiple(doc, true) && "multiple";
	}
	else if (singleRe.test(url)) {
		return "journalArticle";
	}
	else return false;
}

function getMultiple(doc, checkOnly) {
	var items = {};
	var found = false;
	// We need to be specific to avoid navigating to special issues
	var rows = doc.querySelectorAll('ul > li > ul > li');
	for (let row of rows) {
		// Only the first link in a list item is an article
		let article_link = row.querySelector('a[href*="contents.html"]');
		let href = article_link.href;
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
		let items = await Zotero.selectItems(getMultiple(doc, false));
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
	let bibUrl = doc.querySelector('a[href*=".bib"]')
	let bibText = fixAuthorLine(await requestText(bibUrl.href));
	let translator = Zotero.loadTranslator("import");
	translator.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4');
	translator.setString(bibText);
	translator.setHandler('itemDone', (_obj, item) => {
		//DOI is listed on page
		let doiElement = doc.querySelector('a[href*="dx.doi.org"]');
		item.DOI = ZU.cleanDOI(doiElement.href);

		//Download PDF, or Snapshot if unavailable
		let pdfElement = doc.querySelector('a[href*=".pdf"]');
		if (pdfElement) {
			item.attachments.push({
				url: pdfElement.href,
				title: 'Full Text PDF',
				mimeType: 'application/pdf'
			});
		}
		else {
			item.attachments.push({
				title: 'Snapshot',
				document: doc
			});
		}
		item.complete();
	});
	await translator.translate();
}

// Sometimes the bibtex will omit an equals sign after "author"
function fixAuthorLine(input) {
    return input.split('\n').map(line => {
        return line.replace(/^(\s*author)(?!\s*=)/, '$1=');
    }).join('\n');
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://cjtcs.cs.uchicago.edu/articles/2010/1/contents.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Quantum Boolean Functions",
				"creators": [
					{
						"firstName": "Ashley",
						"lastName": "Montanaro",
						"creatorType": "author"
					},
					{
						"firstName": "Tobias J.",
						"lastName": "Osborne",
						"creatorType": "author"
					}
				],
				"date": "2010-01",
				"DOI": "10.4086/cjtcs.2010.001",
				"issue": "1",
				"itemID": "cj10-01",
				"libraryCatalog": "Chicago Journal of Theoretical Computer Science",
				"publicationTitle": "Chicago Journal of Theoretical Computer Science",
				"volume": "2010",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "http://cjtcs.cs.uchicago.edu/articles/2010/contents.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://cjtcs.cs.uchicago.edu/articles/CATS2009/1/contents.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "On Process Complexity",
				"creators": [
					{
						"firstName": "Adam R.",
						"lastName": "Day",
						"creatorType": "author"
					}
				],
				"date": "2010-06",
				"DOI": "10.4086/cjtcs.2010.004",
				"issue": "4",
				"itemID": "cats9-1",
				"libraryCatalog": "Chicago Journal of Theoretical Computer Science",
				"publicationTitle": "Chicago Journal of Theoretical Computer Science",
				"volume": "2010",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
