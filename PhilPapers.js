{
	"translatorID": "8df4f61b-0881-4c85-9186-05f457edb4d3",
	"label": "PhilPapers",
	"creator": "Sebastian Karcher",
	"target": "^https?://phil(papers|archive)\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-09-16 03:30:01"
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


function detectWeb(doc, url) {
	if (url.includes('/rec/')) {
		return 'journalArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.entryList .citation>a');
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

function idFromUrl(url) {
	return url.match(/\/rec\/([A-Z-\d]+)/)[1];
}
async function doWeb(doc, url) {
	let isPhilArchive = /^https?:\/\/philarchive\.org\//.test(url);
	var ids = [];

	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			let id = idFromUrl(url);
			ids.push(id);
		}
		await scrape(ids, isPhilArchive);
	}
	else {
		let identifier = idFromUrl(url);
		// Z.debug(identifier)
		await scrape([identifier], isPhilArchive);
	}
}


async function scrape(identifiers, isPhilArchive) {
	let baseUrl = isPhilArchive ? "https://philarchive.org" : "https://philpapers.org";
	for (let id of identifiers) {
		let bibUrl = `${baseUrl}/item.pl?eId=${id}&format=bib`;
		let bibText = await requestText(bibUrl);
		let url = "/rec/" + id;
		let translator = Zotero.loadTranslator("import");
		translator.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4');
		translator.setString(bibText);
		translator.setHandler('itemDone', (_obj, item) => {
			if (isPhilArchive) {
				item.libraryCatalog = 'PhilArchive';
				item.url = `https://philarchive.org/rec/${id}`; // full-text
				item.attachments.push({
					title: 'Full Text PDF',
					mimeType: 'application/pdf',
					url: `/archive/${id}`
				});
			}
			else {
				item.attachments.push({ url,
					title: 'Snapshot',
					mimeType: 'text/html' });
			}
			item.complete();
		});
		await translator.translate();
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://philpapers.org/rec/COROCA-4",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Observation, Character, and a Purely First-Person Point of View",
				"creators": [
					{
						"firstName": "Josep E.",
						"lastName": "Corbí",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"DOI": "10.1007/s12136-011-0124-2",
				"issue": "4",
				"itemID": "Corbi2011-COROCA-4",
				"libraryCatalog": "PhilPapers",
				"pages": "311–328",
				"publicationTitle": "Acta Analytica",
				"volume": "26",
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
		"url": "https://philpapers.org/browse/causal-realism",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://philpapers.org/pub/6",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://philpapers.org/s/solipsism",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://philarchive.org/rec/RAYNGF",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Norm-Based Governance for a New Era: Lessons From Climate Change and Covid-19",
				"creators": [
					{
						"firstName": "Leigh",
						"lastName": "Raymond",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel",
						"lastName": "Kelly",
						"creatorType": "author"
					},
					{
						"firstName": "Erin",
						"lastName": "Hennes",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"itemID": "Raymond2021-RAYNGF",
				"libraryCatalog": "PhilArchive",
				"pages": "1–14",
				"publicationTitle": "Perspectives on Politics",
				"shortTitle": "Norm-Based Governance for a New Era",
				"url": "https://philarchive.org/rec/RAYNGF",
				"volume": "1",
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
		"url": "https://philarchive.org/rec/LANTEO-39",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Ethics of Partiality",
				"creators": [
					{
						"firstName": "Benjamin",
						"lastName": "Lange",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"DOI": "10.1111/phc3.12860",
				"issue": "8",
				"itemID": "Lange2022-LANTEO-39",
				"libraryCatalog": "PhilArchive",
				"pages": "1–15",
				"publicationTitle": "Philosophy Compass",
				"url": "https://philarchive.org/rec/LANTEO-39",
				"volume": "1",
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
