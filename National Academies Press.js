{
	"translatorID": "f76afa52-0524-440e-98ba-7c0c10a7b693",
	"label": "National Academies Press",
	"creator": "Abe Jellinek",
	"target": "^https?://(www\\.)?nap\\.edu/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-10 15:47:08"
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

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) Object.keys(items).forEach(scrapeFromURL);
		});
	}
	else {
		scrapeFromURL(url);
	}
}

function scrapeFromURL(url) {
	let recordID = url.match(/\/catalog\/([^/?#]+)/)[1];
	// absolute URLs so this can be called from the Transp. Research Board
	// translator; relative URLs don't always resolve correctly in processDocuments
	let enwURL = `https://www.nap.edu/citation.php?type=enw&record_id=${recordID}`;
	let pdfURL = `https://www.nap.edu/cart/download.cgi?record_id=${recordID}`;
	
	ZU.doGet(enwURL, function (enwText) {
		let translator = Zotero.loadTranslator('import');
		// Refer/BibIX
		translator.setTranslator('881f60f2-0802-411a-9228-ce5f47b64c7d');
		translator.setString(enwText);
		
		translator.setHandler('itemDone', function (obj, item) {
			for (let creator of item.creators) {
				if (/\b(board|academies|council|national)\b/i.test(creator.lastName)) {
					creator.lastName = creator.firstName + ' ' + creator.lastName;
					delete creator.firstName;
					creator.fieldMode = 1;
					
					if (/\bacademies\b/i.test(creator.lastName)) {
						// some name splitting heuristic in the Refer translator
						// really screws the name of the institution up
						creator.lastName = 'National Academies of Sciences, Engineering, and Medicine';
					}
				}
			}
			
			if (item.abstractNote) {
				item.abstractNote = ZU.unescapeHTML(item.abstractNote);
			}
			
			if (item.itemType == 'book' && item.pages) {
				item.numPages = item.pages;
				delete item.pages;
			}
			
			if (item.type && !item.DOI) {
				let DOI = ZU.cleanDOI(item.type);
				if (DOI) item.DOI = DOI;
				delete item.type;
			}
			
			item.attachments.push({
				title: 'Full Text PDF',
				mimeType: 'application/pdf',
				url: pdfURL
			});
			
			item.complete();
		});
		
		translator.translate();
	});
}

var exports = {
	scrapeFromURL
};

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.nap.edu/catalog/26186/the-use-of-limited-access-privilege-programs-in-mixed-use-fisheries",
		"items": [
			{
				"itemType": "book",
				"title": "The Use of Limited Access Privilege Programs in Mixed-Use Fisheries",
				"creators": [
					{
						"lastName": "National Academies of Sciences, Engineering, and Medicine",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2021",
				"ISBN": "9780309672979",
				"abstractNote": "A central goal of U.S. fisheries management is to control the exploitation of fish populations so that fisheries remain biologically productive, economically valuable, and socially equitable. Although the Magnuson-Stevens Fishery Conservation and Management Act led to many improvements, a number of fish populations remained overfished and some fisheries were considered economically inefficient. In response, Congress amended the Act in 2006 to allow additional management approaches, including Limited Access Privilege Programs (LAPPs) in which individuals receive a permit to harvest a defined portion of the total allowable catch for a particular fish stock.\nThis report examines the impacts of LAPPs on mixed-use fisheries, defined as fisheries where recreational, charter, and commercial fishing sectors target the same species or stocks. The report offers recommendations for NOAA's National Marine Fisheries Service (NMFS) and the Regional Fishery Management Councils (the Councils) who oversee and manage federally regulated fisheries. For each of the five mixed-use fisheries included in the report, the committee examined available fisheries data and analyses and collected testimony from fishery participants, relevant Councils, and NMFS regional experts through a series of public meetings.",
				"language": "English",
				"libraryCatalog": "National Academies Press",
				"numPages": "220",
				"place": "Washington, DC",
				"publisher": "The National Academies Press",
				"url": "https://www.nap.edu/catalog/26186/the-use-of-limited-access-privilege-programs-in-mixed-use-fisheries",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Agriculture"
					},
					{
						"tag": "Earth Sciences"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nap.edu/search/?term=sharks&x=0&y=0",
		"items": "multiple"
	}
]
/** END TEST CASES **/
