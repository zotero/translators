{
	"translatorID": "ceace65b-4daf-4200-a617-a6bf24c75607",
	"label": "Library Catalog (COBISS)",
	"creator": "Brendan O'Connell",
	"target": "^https?://plus\\.cobiss\\.net/cobiss",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-03-01 12:01:15"
}

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
	// TODO: move this hash outside of detectWeb
	// TODO: waiting to hear from Abe if this section makes any sense.

	// Declare a new hashmap object
	var iconMap = {};

  // Initialize the hashmap object with key-value pairs
	iconMap['icon-1'] = 'book';
	iconMap['icon-2'] = 'journalArticle';
	iconMap['icon-3'] = 'newspaperArticle';
	iconMap['icon-4'] = 'audioRecording';
	iconMap['icon-5'] = 'film';
	iconMap['icon-6'] = 'book'; // keyboard (not sure what this would be)
	iconMap['icon-7'] = 'map';
	iconMap['icon-8'] = 'audioRecording'; // sheet music
	iconMap['icon-9'] = 'book'; // email icon
	iconMap['icon-10'] = 'book'; // toy
	iconMap['icon-11'] = 'book'; // graduation cap (thesis?)
	iconMap['icon-12'] = 'book'; // camera
	iconMap['icon-13'] = 'book'; // @ symbol
	iconMap['icon-14'] = 'videoRecording';
	iconMap['icon-15'] = 'audioRecording';
	iconMap['icon-16'] = 'film';
	iconMap['icon-17'] = 'book'; // set of books
	iconMap['icon-18'] = 'book'; // globe
	iconMap['icon-19'] = 'book'; // magazine?
	iconMap['icon-20'] = 'artwork'; // pictorial material
	iconMap['icon-21'] = 'audioRecording'; // record player
	iconMap['icon-22'] = 'audioRecording'; // microphone
	iconMap['icon-23'] = 'book'; // fountain pen
	iconMap['icon-24'] = 'book'; // prize medal
	iconMap['icon-25'] = 'videoRecording'; // DVD with small music icon
	iconMap['icon-26'] = 'videoRecording'; // Blu-ray
	iconMap['icon-27'] = 'book'; // e-book
	iconMap['icon-28'] = 'book'; // audiobook
	iconMap['icon-29'] = 'videoRecording'; // e-video
	iconMap['icon-30'] = 'book'; // work performed (event) (3 people icon)
	iconMap['icon-31'] = 'book'; // data
	iconMap['icon-32'] = 'newspaperArticle'; // e-newspaper



	const itemIDURL = /\d{8,}/

	if (url.match(itemIDURL)) {
		// TODO: clean up this selector, it's messy
		var icon = doc.querySelector('li[class="in"] > span').children[0].className;
	}

	if (icon) {
		return iconMap[icon];
	}

	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a[class="title value"]');

	for (let row of rows) {
		let href = row.href;
		let title = row.innerText;
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function constructRISURL(url) {
	// catalog page URL: https://plus.cobiss.net/cobiss/si/sl/bib/107937536
	// RIS URL: https://plus.cobiss.net/cobiss/si/sl/bib/92020483

	// capture first part of URL, e.g. https://plus.cobiss.net/cobiss/si/sl/bib/
	const firstRegex = /^(.*?)\/bib\//
	let firstUrl = url.match(firstRegex)[0];

	// captures item ID, e.g. /92020483
	const secondRegex = /\/([^/]+)$/
	let secondUrl = url.match(secondRegex)[0];

	// outputs RIS structure, e.g. https://plus.cobiss.net/cobiss/si/sl/bib/risCit/107937536
	let risURL = firstUrl + "risCit" + secondUrl;
	return risURL;
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

	let risURL = constructRISURL(url);
	let risText = await requestText(risURL);
	let fixedRisText = risText.replace(/^OK##/, '');
	let translator = Zotero.loadTranslator('import');
	translator.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7'); // RIS
	translator.setString(fixedRisText);
	translator.setHandler('itemDone', (_obj, item) => {

		// TODO are there ever attachments that can be saved? look at some examples
		// if (pdfLink) {
		// 	item.attachments.push({
		// 		url: pdfLink.href,
		// 		title: 'Full Text PDF',
		// 		mimeType: 'application/pdf'
		// 	});
		// }
		// TODO: Add item URL
		// TODO: Add item tags, see https://plus.cobiss.net/cobiss/si/sl/bib/17350659
		// for example of subject headings for a report

		item.attachments.push({
			title: 'Snapshot',
			document: doc
		});

		item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://plus.cobiss.net/cobiss/si/sl/bib/92020483",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Nauk o barvah po Goetheju. DVD 2/3, Poglobitev vsebine nauka o barvah, še posebej poglavja \"Fizične barve\" s prikazom eksperimentov",
				"creators": [
					{
						"lastName": "Kühl",
						"firstName": "Johannes",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"ISSN": "978-961-95275-4-2",
				"libraryCatalog": "Library Catalog (COBISS)",
				"pages": "1 video DVD (116 min, 37 sek)",
				"series": "Predavanja iz naravoslovja",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<p>Dialogi v slov. in nem. s konsekutivnim prevodom v slov.</p>"
					},
					{
						"note": "<p>Tisk po naročilu</p>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
