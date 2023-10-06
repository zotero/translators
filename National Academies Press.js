{
	"translatorID": "f76afa52-0524-440e-98ba-7c0c10a7b693",
	"label": "National Academies Press",
	"creator": "Abe Jellinek",
	"target": "^https?://nap\\.nationalacademies\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-12-12 19:59:23"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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
	if (url.includes('/catalog/')) {
		return "book";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h4.results-title a');
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
	if (detectWeb(doc, url) == "multiple") {
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
	let DOI = attr(doc, 'meta[name="citation_doi"]', 'content');
	let trans = Zotero.loadTranslator('search');
	trans.setSearch({ DOI });

	trans.setHandler('translators', (_, translators) => {
		trans.setTranslator(translators);
		trans.translate();
	});

	trans.setHandler('itemDone', (_, item) => {
		for (let creator of item.creators) {
			if (creator.fieldMode == 1) {
				creator.creatorType = 'contributor';
			}
		}

		if (item.itemType == 'book') {
			delete item.pages;
		}

		let recordID = url.match(/\/catalog\/([^/#?]+)/)[1];
		item.attachments.push({
			title: 'Full Text PDF',
			mimeType: 'application/pdf',
			url: `https://nap.nationalacademies.org/cart/download.cgi?record_id=${recordID}`
		});

		item.tags = [];
		for (let tag of doc.querySelectorAll('.book-topics > li')) {
			item.tags.push(ZU.trimInternal(tag.textContent.replace(/\s*—\s*/, '--')));
		}

		item.libraryCatalog = 'National Academies Press';

		item.complete();
	});

	await trans.getTranslators();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://nap.nationalacademies.org/catalog/26186/the-use-of-limited-access-privilege-programs-in-mixed-use-fisheries",
		"items": [
			{
				"itemType": "book",
				"title": "The Use of Limited Access Privilege Programs in Mixed-Use Fisheries",
				"creators": [
					{
						"creatorType": "contributor",
						"fieldMode": 1,
						"lastName": "Committee on the Use of Limited Access Privilege Programs in Mixed-Use Fisheries"
					},
					{
						"creatorType": "contributor",
						"fieldMode": 1,
						"lastName": "Ocean Studies Board"
					},
					{
						"creatorType": "contributor",
						"fieldMode": 1,
						"lastName": "Division on Earth and Life Studies"
					},
					{
						"creatorType": "contributor",
						"fieldMode": 1,
						"lastName": "National Academies of Sciences, Engineering, and Medicine"
					}
				],
				"date": "2021-12-16",
				"ISBN": "9780309672979",
				"extra": "DOI: 10.17226/26186",
				"libraryCatalog": "National Academies Press",
				"place": "Washington, D.C.",
				"publisher": "National Academies Press",
				"url": "https://www.nap.edu/catalog/26186",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Agriculture--Aquaculture and Fisheries"
					},
					{
						"tag": "Agriculture--Policy, Reviews and Evaluations"
					},
					{
						"tag": "Earth Sciences--Ocean Studies"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://nap.nationalacademies.org/search/?term=sharks&x=0&y=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://nap.nationalacademies.org/catalog/25359/socioeconomic-impacts-of-automated-and-connected-vehicles",
		"items": [
			{
				"itemType": "book",
				"title": "Socioeconomic Impacts of Automated and Connected Vehicles",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Andrea",
						"lastName": "Ricci"
					},
					{
						"creatorType": "contributor",
						"fieldMode": 1,
						"lastName": "Technical Activities Division"
					},
					{
						"creatorType": "contributor",
						"fieldMode": 1,
						"lastName": "Transportation Research Board"
					},
					{
						"creatorType": "contributor",
						"fieldMode": 1,
						"lastName": "National Academies of Sciences, Engineering, and Medicine"
					}
				],
				"date": "2018-01-10",
				"ISBN": "9780309480062",
				"extra": "DOI: 10.17226/25359",
				"libraryCatalog": "National Academies Press",
				"place": "Washington, D.C.",
				"publisher": "Transportation Research Board",
				"url": "https://www.nap.edu/catalog/25359",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Transportation and Infrastructure--Economics"
					},
					{
						"tag": "Transportation and Infrastructure--Society"
					},
					{
						"tag": "Transportation and Infrastructure--Vehicles and Equipment"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
