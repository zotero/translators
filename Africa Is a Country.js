{
	"translatorID": "fe8b49e4-1b74-4982-9880-af86e2a8304d",
	"label": "Africa Is a Country",
	"creator": "Jan Baykara",
	"target": "^https?://(www\\.)?africasacountry\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-09 09:56:55"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Jan Baykara

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
	if (/\/\d{4}\/\d{2}\//.test(url)) {
		return 'magazineArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a[href*="/20"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title || !/\/\d{4}\/\d{2}\//.test(href)) continue;
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

function parseDate(date) {
	// Site uses MM.DD.YYYY (e.g. 10.06.2026); strToISO misreads this as DD.MM.YYYY
	let m = date.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
	if (m) {
		return m[3] + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2);
	}
	return ZU.strToISO(date) || date;
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // Embedded Metadata
	translator.setDocument(doc);

	translator.setHandler('itemDone', (_obj, item) => {
		item.publicationTitle = 'Africa Is a Country';

		if (item.abstractNote) {
			item.abstractNote = ZU.unescapeHTML(item.abstractNote);
		}

		let authors = doc.querySelectorAll('a.po-hr-cn__author-link');
		if (authors.length) {
			item.creators = [];
			for (let author of authors) {
				item.creators.push(ZU.cleanAuthor(author.textContent, 'author'));
			}
		}

		let date = text(doc, 'time.po-hr-fl__date');
		if (date) {
			item.date = parseDate(date);
		}

		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'magazineArticle';
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://africasacountry.com/2026/10/old-nollywood-2-0",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Old Nollywood 2.0",
				"creators": [
					{
						"firstName": "Folakemi",
						"lastName": "Ogungbe",
						"creatorType": "author"
					},
					{
						"firstName": "Steven W.",
						"lastName": "Thomas",
						"creatorType": "author"
					},
					{
						"firstName": "Folashade",
						"lastName": "Roberts",
						"creatorType": "author"
					}
				],
				"date": "2026-10-06",
				"abstractNote": "Some of Nigeria’s biggest filmmakers now look to YouTube for opportunity instead of cinemas and streamers. But is what looks like a new era really a return to an old one?",
				"language": "en-US",
				"libraryCatalog": "africasacountry.com",
				"publicationTitle": "Africa Is a Country",
				"url": "https://africasacountry.com/2026/10/old-nollywood-2-0",
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
		"url": "https://africasacountry.com/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
