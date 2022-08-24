{
	"translatorID": "b937ee25-6686-4975-a5ce-95dcfc01b545",
	"label": "Mikromarc",
	"creator": "Abe Jellinek",
	"target": "^https?://[^/]+\\.mikromarc\\.no/mikromarc3/",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-03-07 21:18:01"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Abe Jellinek

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


async function detectWeb(doc, url) {
	if (url.includes('/detail.aspx')) {
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
	var rows = doc.querySelectorAll('#ctl00_PageContent_hitlist .rgRow a');
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
	if (await detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (items) {
			await Promise.all(
				Object.keys(items)
					.map(url => requestDocument(url).then(doc => scrape(doc, url)))
			);
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url) {
	let id = url.match(/[&?]Id=([^&#]+)/)[1];
	let db = url.match(/[&?]db=([^&#]+)/)[1];
	let unit = url.match(/[&?]Unit=([^&#]+)/)[1];

	let risURL = `/mikromarc3/RISHandler.ashx?marcId=${id}&db=${db}&Unit=${unit}`;
	let risText = await requestText(risURL);
	let translator = Zotero.loadTranslator('import');
	translator.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7'); // RIS
	translator.setString(risText);
	translator.setHandler('itemDone', (_, item) => {
		item.title = item.title.replace(' :', ':');
		if (item.numPages) {
			item.numPages = item.numPages.replace('s.', '');
		}
		item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://fjellhaug.mikromarc.no/mikromarc3/detail.aspx?Unit=6473&db=fjellhaug&Id=25197&SW=test%25&SC=FT&LB=FT&MT=0&SU=6475&DG=0&ST=Normal&Browse=1&P=1",
		"items": [
			{
				"itemType": "book",
				"title": "A concise New Testament theology",
				"creators": [
					{
						"lastName": "Marshall",
						"firstName": "I. Howard",
						"creatorType": "author"
					}
				],
				"date": "2008",
				"ISBN": "9780830827787",
				"libraryCatalog": "Mikromarc 3",
				"numPages": "310",
				"place": "Downers Grove, Ill.",
				"publisher": "IVP Academic",
				"attachments": [],
				"tags": [
					{
						"tag": "Bibelteologi. NT"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://fjellhaug.mikromarc.no/mikromarc3/detail.aspx?Unit=6473&db=fjellhaug&Id=16363&SW=sherlock%25&SC=FT&LB=FT&MT=0&SU=6475&DG=0&ST=Normal&Browse=1&P=1",
		"items": [
			{
				"itemType": "book",
				"title": "The illustrated Sherlock Holmes treasury: including the complete adventures and memoirs of Sherlock Holmes",
				"creators": [
					{
						"lastName": "Doyle",
						"firstName": "Arthur Conan",
						"creatorType": "author"
					},
					{
						"lastName": "Paget",
						"firstName": "Sidney",
						"creatorType": "author"
					}
				],
				"date": "1976",
				"libraryCatalog": "Mikromarc 3",
				"numPages": "631",
				"place": "New York (NY)",
				"publisher": "Avenel Books",
				"shortTitle": "The illustrated Sherlock Holmes treasury",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ansgarskolen.mikromarc.no/mikromarc3/detail.aspx?Unit=6463&db=ansgarskolen&Id=20597&SW=physics%25&SC=FT&LB=FT&MT=0&SU=7821&DG=0&ST=Normal&Browse=1&P=1",
		"items": [
			{
				"itemType": "book",
				"title": "Time in eternity: Pannenberg, physics, and eschatology in creative mutual interaction",
				"creators": [
					{
						"lastName": "Russell",
						"firstName": "Robert J",
						"creatorType": "author"
					}
				],
				"date": "0000 c",
				"libraryCatalog": "Mikromarc 3",
				"numPages": "XIII, 440",
				"place": "Notre Dame, Ind.",
				"publisher": "University of Notre Dame Press",
				"shortTitle": "Time in eternity",
				"attachments": [],
				"tags": [
					{
						"tag": "Eskatologi"
					},
					{
						"tag": "Evigheten"
					},
					{
						"tag": "Kosmologi"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ansgarskolen.mikromarc.no/mikromarc3/search.aspx?Unit=6463&db=ansgarskolen&SC=FT&SW=test%25&LB=FT&IN=&SU=0&DG=0",
		"items": "multiple"
	}
]
/** END TEST CASES **/
