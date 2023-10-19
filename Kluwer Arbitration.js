{
	"translatorID": "8bbda047-de7c-463e-82cd-375444afa068",
	"label": "Kluwer Arbitration",
	"creator": "Jonas Zaugg",
	"target": "^https?://(www\\.|arbitrationblog\\.)?kluwerarbitration\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-10-19 23:04:06"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Jonas Zaugg

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

/*
- DocumentID examples:
  - bookSection: KLI-KA-Born-2021-Ch01
  - bookSection: KLI-KA-Lopez-Rodriguez-2019-Ch05
  - book: TOC-Lopez-Rodriguez-2019
  - journalArticle: KLI-KA-ASAB31020011
  - case: kli-ka-1105506-n
  - book: TOC-Born-2021
  - statute: kli-ka-1134507-n
  - statute: ipn15507
  - blog: https://arbitrationblog.kluwerarbitration.com/2023/10/18/hong-kong-arbitration-week-recap-a-step-forward-or-challenges-for-the-21st-century/
- Normal URL: https://www.kluwerarbitration.com/document/
- Publication details (whole book): https://www.kluwerarbitration.com/api/publicationdetail?documentId=
- Document details: https://www.kluwerarbitration.com/api/Document?id=
- PDF request: https://www.kluwerarbitration.com/document/print?title=PDF&ids=
*/

function getType(pubDetails, docDetails) {
	let pubType = pubDetails.publicationType ? pubDetails.publicationType : docDetails.PublicationType;
	let hasDocument = docDetails !== null;

	switch (pubType) {
		case 'book':
			// Multiple here would show a selection screen with the option to save the book or individual chapters, but we use the selection screen to indicate which items to download as part of the book
			return hasDocument ? 'bookSection' : 'book';
		case 'journal':
			switch (docDetails.Type) {
				case 'Court Decisions':
				case 'Awards':
					return 'case';
				case 'Conventions':
				case 'Rules':
				case 'Legislation':
				case 'BITs':
					return 'statute';
				case 'Commentary':
					return 'journalArticle';
			}
			break;
		case 'loose-leaf':
			switch (docDetails.Type) {
				case 'Models':
					return 'statute';
			}
			break;
		case 'internet':
			switch (docDetails.Type) {
				case 'Awards':
					return 'case';
				default:
					return 'webpage';
			}
		case 'blog': // Does it exist?
			return 'blogPost';
	}

	Z.debug("Could not match pairing: " + pubType + ", " + docDetails.Type);
	return false;
}

// Function used to get all documents contained within a collection (such as chapters of a book)
function flattenNodes(tocNodes) {
	let result = [];
	recursion(0, tocNodes, result);
	return result;
}

function recursion(index, inputArray, outputArray) {
	if (index >= inputArray.length) return;

	if (inputArray[index].children) {
		recursion(0, inputArray[index].children, outputArray);
	}
	else {
		outputArray.push(inputArray[index]);
	}

	recursion(index + 1, inputArray, outputArray);
}

// Get the JSON object describing the publication (i.e., the book for a section or the journal for an article)
async function getPublicationDetails(documentID) {
	let detailsURL = "https://www.kluwerarbitration.com/api/publicationdetail?documentId=" + documentID;
	Z.debug("Requesting publication details");
	Z.debug(detailsURL);
	return ZU.requestJSON(detailsURL);
}

// Get the JSON object describing the document itself (article, book section, etc.)
async function getDocumentDetails(documentID) {
	let detailsURL = "https://www.kluwerarbitration.com/api/Document?id=" + documentID;
	Z.debug("Requesting document details");
	Z.debug(detailsURL);
	return ZU.requestJSON(detailsURL);
}

function getDocId(url) {
	const segments = new URL(url).pathname.split('/');
	const documentID = segments.pop() || segments.pop(); // Handle potential trailing slash
	Z.debug("Document ID: " + documentID);
	return documentID;
}

async function getTypeAndDetails(doc, url) {
	if (url.includes('/document/')) {
		Z.debug('Found a document');
		
		let documentID = getDocId(url);
		let pubDetails = await getPublicationDetails(documentID);
		let docDetails = await getDocumentDetails(documentID);
		
		let pubType = pubDetails.publicationType;
		let zotType = getType(pubDetails, docDetails);
		if (zotType) {
			Z.debug("Document is: " + zotType);
			return { type: zotType, pubDetails: pubDetails, docDetails: docDetails };
		}
		else {
			Z.debug(pubType + " not yet suppported");
		}
	}
	else if (url.includes('/search')) {
		Z.debug("Investigating search page");
		let selector = 'div#vueApp';
		Z.debug(doc.querySelector(selector));
		Z.monitorDOMChanges(doc.querySelector(selector));
		if (getSearchResults(doc, true)) {
			return { type: 'multiple', pubDetails: null, docDetails: null };
		}
		return false;
	}
	else if (url.includes('arbitrationblog')) {
		return { type: 'blogPost', pubDetails: null, docDetails: null };
	}
	return { type: false, pubDetails: null, docDetails: null };
}

async function detectWeb(doc, url) {
	Z.debug("STARTING DETECT WEB");

	const result = await getTypeAndDetails(doc, url);

	Z.debug("Resulting Zotero type: " + result.type);

	return result.type;
}

function getSearchResults(doc, checkOnly) {
	Z.debug("Checking search results");
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
	Z.debug("STARTING DO WEB");

	const { type: zotType, pubDetails, docDetails } = await getTypeAndDetails(doc, url);

	Z.debug("detection result: " + zotType);
	if (zotType == 'multiple') {
		Z.debug('Will try to save multiple items');

		let items = await Zotero.selectItems(getSearchResults(doc, false));
		Z.debug(items);
		if (!items) return;
		for (let url of Object.keys(items)) {
			Z.debug(url);
			let docId = getDocId(url);
			await scrapeId(docId);
		}
	}
	else if (zotType == 'blogPost') {
		Z.debug("Scraping blog post");
		await scrapeBlog(doc);
	}
	else {
		Z.debug("Single document, start scrape");
		await scrapeDoc(url, zotType, pubDetails, docDetails);
	}
}

async function scrapeId(docId) {
	Z.debug("Scraping from web results not yet implemented. Doc: " + docId);
}

/*function addNote(item: Zotero.Item, note: String) {
	item.notes.push({note: note});
}*/

async function scrapeDoc(url, zotType, pubDetails, docDetails) {
	// Publication details
	let documentID = getDocId(url);

	Z.debug(zotType);

	var type = 'document';
	if (zotType) {
		type = zotType;
	}
	Z.debug("Type is " + type);
	var item = new Z.Item(type);
	Z.debug(item);

	if (pubDetails.publicationInfo) {
		let publicationInfo = pubDetails.publicationInfo;
		if (publicationInfo.isbn) {
			item.ISBN = publicationInfo.isbn;
		}
		if (publicationInfo.issn) {
			Z.debug(publicationInfo.issn);
			item.ISSN = publicationInfo.issn;
		}
		if (publicationInfo.publisher) {
			item.publisher = publicationInfo.publisher;
		}

		/*if(publicationInfo.publicationDate) {
			item.date = ZU.strToISO(publicationInfo.publicationDate);
		}*/
	}

	// Update type
	//item.itemType = getType(docDetails.PublicationType, docDetails.Type);

	if (docDetails) {
		item.title = docDetails.Title;
		item.date = docDetails.PublicationDate;
		item.creators = [];

		for (let author of docDetails.Authors) {
			item.creators.push({
				firstName: author.Name,
				lastName: author.Surname,
				creatorType: "author"
			});
		}

		// Potential editors
		// TODO check duplicates
		if (type == 'journalArticle' || type == 'bookSection') {
			for (let pubAuthor of pubDetails.authors) {
				item.creators.push({
					firstName: pubAuthor.name,
					lastName: pubAuthor.surname,
					creatorType: "editor"
				});
			}

			// Potential editors too
			// TODO check duplicates
			for (let pubEditor of pubDetails.editors) {
				item.creators.push({
					firstName: pubEditor.name,
					lastName: pubEditor.surname,
					creatorType: "editor"
				});
			}
		}

		if (type == 'case') item.reporter = docDetails.PublicationTitle;
		else item.publicationTitle = docDetails.PublicationTitle;

		if (docDetails.LegislationDate) item.dateEnacted = docDetails.LegislationDate;

		let bibRef = "Bibliographic reference: " + docDetails.BibliographicReference + ".";
		item.notes.push({ note: bibRef });

		// Case details if available, for articles too
		if (docDetails.CaseNumbers[0]) item.docketNumer = docDetails.CaseNumbers[0];
		if (docDetails.Parties) {
			let parties = "Parties: " + docDetails.Parties.join("<br/>");
			item.notes.push({ note: parties });
		}
		if (docDetails.Court[0]) item.court = docDetails.Court[0];
		if (docDetails.Organization[0] && docDetails.Type == 'Awards') item.court = docDetails.Organization[0];
		if (docDetails.CaseDate) item.dateDecided = docDetails.CaseDate;
		// How do we set jurisdiction for JurisM?
		if (docDetails.Jurisdictions[0]) item.country = docDetails.Jurisdictions[0];

		// Keywords
		if (docDetails.KeyWords) {
			for (let tag of docDetails.KeyWords) {
				item.tags.push({ tag: tag.trim() });
			}
		}
	} /*else if (pubDetails) {
		item.title = pubDetails.publicationTitle;
		item.abstractNote = pubDetails.descriptiveText

		for (let pubAuthor of pubDetails.authors) {
			item.creators.push({
				firstName: pubAuthor.name,
				lastName: pubAuthor.surname,
				creatorType: "author"
			});
		}

		for (let pubEditor of pubDetails.editors) {
			item.creators.push({
				firstName: pubEditor.name,
				lastName: pubEditor.surname,
				creatorType: "editor"
			});
		}
	}*/

	if (pubDetails && type == 'bookSection') {
		// Attempting to get page range for bookSection
		//let sectionNodes = pubDetails.tocNodes.flatMap((node) => (node.children ? node.children : node));
		let sectionNodes = flattenNodes(pubDetails.tocNodes);
		Z.debug(sectionNodes);
		let section = sectionNodes.find(node => (node.docId.toLowerCase() == documentID.toLowerCase()));
		if (section) Z.debug(section);
		if (section.pageRange.first && section.pageRange.last) item.pages = section.pageRange.first + "-" + section.pageRange.last;
	}
	else if (type == 'journalArticle' | type == 'case') {
		let volumeRegex = /Volume\s([a-zA-Z0-9]+)/;
		let issueRegex = /Issue\s([a-zA-Z0-9]+)/;
		let pagesRegex = /pp\.\s([a-zA-Z0-9]+)\s-\s([a-zA-Z0-9]+)/;

		let volume = docDetails.BibliographicReference.match(volumeRegex);
		let issue = docDetails.BibliographicReference.match(issueRegex);
		let pages = docDetails.BibliographicReference.match(pagesRegex);

		if (volume) item.volume = volume[1];
		if (issue) item.issue = issue[1];
		if (pages) {
			if (type == 'case') item.firstPage = pages[1];
			else item.pages = pages[1] + "-" + pages[2];
		}
	}

	//item.url = url;

	Z.debug(item);

	// Getting PDF
	if (type == 'book') {
		Z.debug("Before search: " + item);

		var search = Zotero.loadTranslator("search");

		search.setHandler("translators", function (obj, translators) {
			search.setTranslator(translators);
			search.translate();
		});

		search.setHandler("itemDone", function (obj, item) {
			// Getting PDFs of all sections
			let sectionNodes = flattenNodes(pubDetails.tocNodes);
			let sectionList = sectionNodes.map(node => ([node.docId, node.label]));
			let sections = Object.fromEntries(sectionList);
			Z.debug(sections);
			Z.selectItems(sections, function (items) {
				if (!items) {
					// CANCEL ITEM
					return;
				}

				for (const [sectionID, sectionLabel] of Object.entries(items)) {
					let pdfURL = "https://www.kluwerarbitration.com/document/print?title=PDF&ids=" + sectionID;
					Z.debug(pdfURL);
					item.attachments.push({
						title: sectionLabel,
						mimeType: "application/pdf",
						url: pdfURL
					});
				}
			});

			item.attachments.push({
				url: url,
				title: "Read on Kluwer Arbitration",
				mimeType: "text/html",
				snapshot: false
			});

			item.complete();
		});

		search.setSearch(item);
		// look for translators for given item
		search.getTranslators();
	}
	else {
		let pdfURL = '';
		if (type == 'case' && docDetails.PublicationType == 'internet') pdfURL = "https://www.kluwerarbitration.com/document/GetPdf/" + docDetails.Id;
		else pdfURL = "https://www.kluwerarbitration.com/document/print?title=PDF&ids=" + docDetails.Id;
		Z.debug(pdfURL);
		item.attachments.push({
			title: "Full Text PDF",
			mimeType: "application/pdf",
			url: pdfURL
		});

		item.attachments.push({
			url: url,
			title: "Read on Kluwer Arbitration",
			mimeType: "text/html",
			snapshot: false
		});

		item.complete();
	}
}

async function scrapeBlog(doc) {
	Z.debug("Saving blog post");
	var item = new Z.Item('blogPost');
	Z.debug(item);

	var translator = Z.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");

	translator.setHandler("itemDone", function (obj, item) {
		item.itemType = 'blogPost';

		item.complete();
	});

	translator.setDocument(doc);
	translator.translate();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.kluwerarbitration.com/search?q=counterclaim+OR+counterclaims&sortBy=date+desc",
		"detectedItemType": "multiple",
		"items": []
	},
	{
		"type": "web",
		"url": "https://www.kluwerarbitration.com/document/KLI-KA-Born-2021-Ch01",
		"detectedItemType": "bookSection",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Chapter 1: Overview of International Commercial Arbitration",
				"creators": [
					{
						"firstName": "Gary B.",
						"lastName": "Born",
						"creatorType": "author"
					}
				],
				"abstractNote": "Kluwer Arbitration, Home",
				"libraryCatalog": "www.kluwerarbitration.com",
				"url": "https://www.kluwerarbitration.com/document/KLI-KA-Born-2021-Ch01",
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
