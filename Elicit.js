{
	"translatorID": "e1c104ef-9f4d-44fb-bf84-59b99ead7329",
	"label": "Elicit",
	"creator": "Abe Jellinek",
	"target": "^https://elicit\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-04-28 21:18:17"
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


function detectWeb(doc, url) {
	if (doc.querySelector('.MuiModal-root a[href*="//doi.org/"]')) {
		return 'journalArticle';
	}
	else if (getSearchResults(doc)) {
		return 'multiple';
	}
	Z.monitorDOMChanges(doc.body, { childList: true });
	return false;
}

function getSearchResults(doc) {
	// Disable for now - not reliably able to detect or fetch results
	return false;

	// We have to make an HTTP request to actually get results,
	// so just cheat if we're checking in detectWeb()
	// return !!doc.querySelector('table[class^="ResultsTable"] tbody tr');
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let idToken = doc.cookie
			.split(';')
			.map(row => row.split('='))
			.find(row => row[0].trim() == 'idToken')[1];
		Zotero.debug(idToken)
		
		let postBody = JSON.stringify({
			input: text(doc, 'textarea'),
			requestOptions: { qaColumns: [] },
			seenPaperIds: [],
			starredPaperIds: [],
			start: 0,
			stop: doc.querySelectorAll('table[class^="ResultsTable"] tbody tr').length
		});
		Zotero.debug(postBody)

		ZU.doPost(
			'https://inference.elicit.org/elicit-red/lit-review',
			postBody,
			(respText) => {
				let json = JSON.parse(respText);
				let items = {};
				Object.values(json.papers)
					.forEach(p => items[p.doi || p.doiUrl] = p.title);
				Zotero.selectItems(items, (items) => {
					if (items) Object.keys(items).map(scrape);
				});
			}, 
			{
				'Authorization': 'Bearer ' + idToken,
				'Content-Type': 'application/json'
			}
		);
	}
	else {
		scrape(attr(doc, '.MuiModal-root a[href*="//doi.org/"]', 'href'));
	}
}

function scrape(doi) {
	let search = { DOI: ZU.cleanDOI(doi) };
	let trans = Zotero.loadTranslator('search');
	trans.setSearch(search);

	trans.setHandler('itemDone', (obj, item) => {
		item.complete();
	});

	trans.setHandler('translators', (obj, translators) => {
		trans.setTranslator(translators);
		trans.translate();
	});

	trans.getTranslators();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
