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
	"lastUpdated": "2023-02-28 12:40:57"
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
	// TODO: adjust the logic here
	if (url.includes('/article/')) {
		return 'newspaperArticle';
	}

  // Declare a new hashmap object
	const iconMap = {};

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





	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}



// icon-1 : book
// icon-2 : journal article
// icon-3 : newspaper article
// icon-4 : CD
// icon-5 : video, movie
// icon-6 :
// icon-7 : cartographic material
// icon-8 : sheet music
// icon-9 : email icon
// icon-10 : player, object (soccer ball)
// icon-11 : graduation cap (thesis?)
// icon-12 : camera
// icon-13 : @ symbol
// icon-14 : DVD
// icon-15 : music, soundtrack
// icon-16 : filmstrip
// icon-17 : set of books
// icon-18 : globe
// icon-19 : magazine?
// icon-20 : pictorial material
// icon-21 : record player
// icon-22 : microphone
// icon-23 : fountain pen
// icon-24 : first prize medal
// icon-25 : DVD with small music icon
// icon-26 : blu-ray
// icon-27 : e-book
// icon-28 : audiobook
// icon-29 : e-video
// icon-30 : work performed (event) (3 people icon)
// icon-31 : data
// icon-32 : e-newspaper

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// TODO: adjust the CSS selector
	var rows = doc.querySelectorAll('h2 > a.title[href*="/article/"]');
	for (let row of rows) {
		// TODO: check and maybe adjust
		let href = row.href;
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
	// TODO: implement or add a scrape function template
	let DOI = url.match(/\/(10\.[^#?]+)/)[1];
	// TODO adjust the URL here
	let risURL = `http://citation-needed.services.springer.com/v2/references/${DOI}?format=refman&flavour=citation`;
	// Z.debug(risURL)

	// TODO adjust this
	let pdfLink = doc.querySelector('#articlePDF');
	// Z.debug("pdfURL: " + pdfURL);

	let risText = await requestText(risURL);
	let translator = Zotero.loadTranslator('import');
	translator.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7'); // RIS
	translator.setString(risText);
	translator.setHandler('itemDone', (_obj, item) => {
		// TODO tweak some of the output here
		if (pdfLink) {
			item.attachments.push({
				url: pdfLink.href,
				title: 'Full Text PDF',
				mimeType: 'application/pdf'
			});
		}

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
]
/** END TEST CASES **/
