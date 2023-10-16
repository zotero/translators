{
	"translatorID": "8bbda047-de7c-463e-82cd-375444afa068",
	"label": "Kluwer Arbitration",
	"creator": "Jonas Zaugg",
	"target": "^https?://(www\\.)?kluwerarbitration\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-06-01 14:41:38"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 YOUR_NAME <- TODO

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

function getType(pubType, type) {
	switch (pubType) {
		case 'book':
			return 'bookSection';
		case 'journal':
			return 'journalArticle';
		case 'internet':
			switch (type) {
				case 'Court Decisions':
				case 'Awards':
					return 'case';
				case 'Rules':
				case 'Legislation':
					return 'statute';
				case 'BITs':
					return 'treaty';
				default:
					return 'webpage';
			}
		case 'blog':
			return 'blogPost';
		default:
			return false;
	}
}

async function detectWeb(doc, url) {
	// TODO: use pure DOM for detection
	// TODO: support arbitrion blogs

	if (url.includes('/document/')) {
		Zotero.debug('Found a document');
		let urlObject = new URL(url);
		let documentID = urlObject.pathname.replace('/document/', '');
		Z.debug(documentID);

		let detailsURL = "https://www.kluwerarbitration.com/api/publicationdetail?documentId=" + documentID;
		let details = await ZU.requestJSON(detailsURL);

		let pubType = details.publicationType
		if (getType(pubType, '')) {
			Z.debug(getType(pubType, ''));
			return getType(pubType, '');
		}
		else {
			Z.debug(type + " not yet suppported");
		}
	} else if (url.includes('/search')) {
		Z.debug("Investigating search page");
		let selector = 'div#vueApp';
		Z.debug(doc.querySelector(selector));
		Z.monitorDOMChanges(doc.querySelector(selector));
		if (getSearchResults(doc, true)) {
			return 'multiple';
		}
		return false;
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	Z.debug("Checking search results")
	var items = {};
	var found = false;
	// TODO: adjust the CSS selector for blog posts as well
	var rows = doc.querySelectorAll('div.search-results div.item-result div.content > div.title > a[href*="/document/"]');
	Z.debug("Number of rows" + rows.length);

	for (let row of rows) {
		Z.debug(row);

		// TODO: check and maybe adjust
		let href = row.href;
		Z.debug(href);
		// TODO: check and maybe adjust
		let title = ZU.trimInternal(row.textContent);
		Z.debug(title);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		Z.debug('referecing url' + href);
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		Z.debug('Will try to save multiple items');
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		Z.debug(items);
		if (!items) return;
		for (let url of Object.keys(items)) {
			Z.debug(url);
			await scrape(await requestDocument(url));
		}
	}
	else {
		let urlObject = new URL(url);
		let documentID = urlObject.pathname.replace('/document/', '');
		await scrape(doc, url, documentID);
	}
}

/*function addNote(item: Zotero.Item, note: String) {
	item.notes.push({note: note});
}*/

async function scrape(doc, url, documentID) {
	// Publication details
	let detailsURL = "https://www.kluwerarbitration.com/api/publicationdetail?documentId=" + documentID;
	let details = await ZU.requestJSON(detailsURL);

	var type = 'document';
	if (getType(details.publicationType, '')) {
		type = getType(details.publicationType, '');
	}
	Z.debug("Type is " + type);
	var item = new Z.Item(type);
	Z.debug(item);

	if (details.publicationInfo) {
		let publicationInfo = details.publicationInfo
		if (publicationInfo.isbn) {
			item.ISBN = publicationInfo.isbn
		}
		if (publicationInfo.ISSN) {
			Z.debug(publicationInfo.issn)
			item.ISSN = publicationInfo.ISSN
		}
		if (publicationInfo.publisher) {
			item.publisher = publicationInfo.publisher
		}
		/*if(publicationInfo.publicationDate) {
			item.date = ZU.strToISO(publicationInfo.publicationDate);
		}*/
	}

	// All data
	let dataURL = 'https://www.kluwerarbitration.com/api/Document?id=' + documentID;

	Z.debug(dataURL);
	Z.debug('Testing JSON');
	let data = await requestJSON(dataURL);

	// Update type
	item.itemType = getType(data.PublicationType, data.Type);

	item.title = data.TitleHtml
	item.date = data.PublicationDate
	item.creators = [];

	for (let author of data.Authors) {
		item.creators.push({
			firstName: author.Name,
			lastName: author.Surname,
			creatorType: "author"
		});
	}

	// Potential editors
	// TODO check duplaciates
	for (let pubAuthor of details.authors) {
		item.creators.push({
			firstName: pubAuthor.name,
			lastName: pubAuthor.surname,
			creatorType: "editor"
		});
	}

	item.publicationTitle = data.PublicationTitle

	item.url = url;

	Z.debug(item);

	// Getting PDF
	let pdfURL = "https://www.kluwerarbitration.com/document/print?ids=" + data.Id + "&title=PDF";
	Z.debug(pdfURL);
	item.attachments.push({
		title: "Full Text PDF",
		mimeType: "application/pdf",
		url: pdfURL
	});
	
	item.complete();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.kluwerarbitration.com/document/KLI-KA-ASAB31020011",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Capacity of a Bankrupt Party to Be or Remain a Party to International Arbitral Proceedings: A Landmark Decision of the Swiss Federal Supreme Court",
				"creators": [
					{
						"firstName": "",
						"lastName": ""
					}
				],
				"abstractNote": "Kluwer Arbitration, Home",
				"libraryCatalog": "www.kluwerarbitration.com",
				"url": "https://www.kluwerarbitration.com/document/KLI-KA-ASAB31020011",
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
		"url": "https://www.kluwerarbitration.com/search?q=counterclaim+OR+counterclaims&sortBy=date+desc",
		"detectedItemType": "multiple",
		"items": []
	}
]
/** END TEST CASES **/
