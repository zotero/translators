{
	"translatorID": "8d1fb775-df6d-4069-8830-1dfe8e8387dd",
	"label": "PubFactory Journals",
	"creator": "Brendan O'Connell",
	"target": "^https?:\\/\\/(?:[\\w-]+\\.)+[\\w-]+(?:\\/[^\\/\\s]*)+\\.xml(?:\\?.*)?$|^https:\\/\\/(?:[\\w-]+\\.)+[\\w-]+\\/search\\?[^\\/\\s]*source=%2Fjournals%2F\\w+%2F\\w+-overview\\.xml(?:&q=[^&\\s]*)?$",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-03-27 13:59:57"
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
	// Translator only covers multiple, because EM works perfectly on single articles.
  if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// TODO: adjust the CSS selector
	var rows = doc.querySelectorAll('h1 > a.c-Button--link');
	for (let row of rows) {
		// TODO: check and maybe adjust
		let href = row.href;
		// TODO: check and maybe adjust
		let title = ZU.trimInternal(row.innerText);
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
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', (_obj, item) => {
		item.complete();
	});
  // TODO: add attached PDFs
  // var pdfURL = getContent(doc, 'citation_pdf_url');

	let em = await translator.getTranslatorObject();
	em.itemType = 'journalArticle';
	await em.doWeb(doc, url);
}






// other examples of journals regexes:
// Atypon Journals.js


// issue pages with multiple:
// https://journals.humankinetics.com/view/journals/cssm/cssm-overview.xml
// https://journals.humankinetics.com/view/journals/ijsnem/ijsnem-overview.xml
// https://journals.humankinetics.com/view/journals/jab/jab-overview.xml
// https://journals.ametsoc.org/view/journals/amsm/59/1/amsm.59.issue-1.xml
// https://pubs.nctm.org/view/journals/mte/11/2/mte.11.issue-2.xml
// https://avmajournals.avma.org/view/journals/javma/261/4/javma.261.issue-4.xml
// https://avmajournals.avma.org/view/journals/javma/javma-overview.xml?_gl=1*1mk7zsf*_ga*MTI2MDA0NjE4NS4xNjc5NTc4NzIy*_ga_L7SBEK6H36*MTY3OTU3ODcyMS4xLjEuMTY3OTU3ODg0NS4wLjAuMA..
// https://www.ajtmh.org/view/journals/tpmd/108/3/tpmd.108.issue-3.xml
// https://journals.ashs.org/hortsci/view/journals/hortsci/hortsci-overview.xml

// searches:
// https://pubs.nctm.org/search?source=%2Fjournals%2Fmte%2Fmte-overview.xml
// https://journals.ashs.org/search?q1=sugar&searchBtn=
// https://avmajournals.avma.org/search?q=cats&source=%2Fjournals%2Fjavma%2Fjavma-overview.xml

// facet search:
// https://www.ajtmh.org/browse?access=all&pageSize=10&sort=datedescending&fromDate=2006&toDate=2013

// browse all:
// https://www.ajtmh.org/browse


// pages and their targets
// https://journals.ametsoc.org/view/journals/eint/27/1/eint.27.issue-1.xml
// a class="c-Button--link"
// https://journals.humankinetics.com/view/journals/cssm/cssm-overview.xml
// same, but with a span inside

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://journals.ametsoc.org/view/journals/amsm/59/1/amsm.59.issue-1.xml",
		"items": "multiple"
	}
]
/** END TEST CASES **/
