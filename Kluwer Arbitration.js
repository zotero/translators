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
	"lastUpdated": "2023-10-24 23:19:05"
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
See test cases for examples. URLs used:
- Document URL: https://www.kluwerarbitration.com/document/
- Publication details (whole book): https://www.kluwerarbitration.com/api/publicationdetail?documentId=
- Document details: https://www.kluwerarbitration.com/api/Document?id=
- PDF request: https://www.kluwerarbitration.com/document/print?title=PDF&ids=
*/

function getType(pubDetails, docDetails) {
	if (!pubDetails && !docDetails) {
		Z.debug("Cannot get type when there are no publication and document details! Check if requests succeed.");
		return false;
	}
	let pubType = pubDetails && pubDetails.publicationType ? pubDetails.publicationType : docDetails.PublicationType;
	let hasDocument = docDetails !== null;

	Z.debug(`Publication type is ${pubType}`);
	if (docDetails) Z.debug(`Document type is ${docDetails.Type}`);

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
				case 'Commentary':
					return 'report';
			}
			break;
		case 'internet':
			switch (docDetails.Type) {
				case 'Awards':
					return 'case';
				case 'Commentary': // For some online insights and commentaries, could be considered blog posts but that would change the logic
				default:
					return 'webpage';
			}
		case 'blog': // Only if we're reading from the search results JSON
			return 'blogPost';
	}

	Z.debug("Could not match pairing: " + pubType + ", " + docDetails.Type);
	return false;
}

// Function used to get all documents contained within a collection (such as chapters of a book) based on its ToC
// ToC nodes can be used to retrieve page numbers and documents
function flattenNodes(tocNodes) {
	let result = [];
	depthFirstFlatten(0, tocNodes, result);
	return result;
}

function depthFirstFlatten(index, inputArray, outputArray) {
	if (index >= inputArray.length) return;

	if (inputArray[index].children) {
		depthFirstFlatten(0, inputArray[index].children, outputArray);
	}
	else {
		outputArray.push(inputArray[index]);
	}

	depthFirstFlatten(index + 1, inputArray, outputArray);
}

// Get the JSON object describing the publication (i.e., the book for a section or the journal for an article)
async function getPublicationDetails(documentID) {
	let detailsURL = "https://www.kluwerarbitration.com/api/publicationdetail?documentId=" + documentID;
	Z.debug("Requesting publication details");
	Z.debug(detailsURL);
	return requestJSON(detailsURL);
}

// Get the JSON object describing the document itself (article, book section, etc.)
async function getDocumentDetails(documentID) {
	let detailsURL = "https://www.kluwerarbitration.com/api/Document?id=" + documentID;
	Z.debug("Requesting document details");
	Z.debug(detailsURL);
	return requestJSON(detailsURL);
}

// Get the JSON object describing the standalone case (i.e., not contained in a journal)
async function getCaseDetails(caseID) {
	let detailsURL = "https://www.kluwerarbitration.com/case/GetDetailsByCaseId?caseId=" + caseID;
	Z.debug("Requesting case details");
	Z.debug(detailsURL);
	return requestJSON(detailsURL);
}

// Get the JSON object of the case ToC (history)
async function getCaseToc(caseID) {
	let detailsURL = "https://www.kluwerarbitration.com/case/" + caseID + "/GetToc";
	Z.debug("Requesting case ToC");
	Z.debug(detailsURL);
	return requestJSON(detailsURL);
}

async function getProceedingDetails(proceedingID) {
	let detailsURL = "https://www.kluwerarbitration.com/proceeding/" + proceedingID;
	Z.debug("Requesting proceeding details");
	Z.debug(detailsURL);
	return requestJSON(detailsURL);
}

function getDocId(url) {
	let segments = new URL(url).pathname.split('/');
	let documentID = segments.pop() || segments.pop(); // Handle potential trailing slash
	Z.debug("Document ID: " + documentID);
	return documentID;
}

function getCaseId(url) {
	let path = new URL(url).pathname;
	let m = path.match(/case\/(\d+)/);
	if (m) {
		Z.debug("Case ID: " + m[1]);
		return m[1];
	}
	return null;
}

function getProceedingId(url) {
	let path = new URL(url).pathname;
	let m = path.match(/case\/(\d+\/\d+)/);
	if (m) {
		Z.debug("Proceeding ID: " + m[1]);
		return m[1];
	}
	return null;
}

async function getTypeAndDetails(doc, url) {
	if (url.includes('document/case')) {
		Z.debug('Found a case');

		return { type: 'case', pubDetails: null, docDetails: null };
	}
	else if (url.includes('/document/')) {
		Z.debug('Found a document');
		
		let documentID = getDocId(url);
		let pubDetails = await getPublicationDetails(documentID);
		let docDetails = await getDocumentDetails(documentID);
		
		//let pubType = pubDetails.publicationType;
		let zotType = getType(pubDetails, docDetails);
		if (zotType) {
			Z.debug("Document is: " + zotType);
			return { type: zotType, pubDetails: pubDetails, docDetails: docDetails };
		}
	}
	else if (url.includes('/search')) {
		Z.debug("Investigating search page");
		let selector = 'div#vueApp';
		Z.debug("Monitoring " + selector);
		Z.monitorDOMChanges(doc.querySelector(selector));
		if (getSearchResults(doc, true)) {
			return { type: 'multiple', pubDetails: null, docDetails: null };
		}
	}
	else if (url.includes('arbitrationblog')) {
		return { type: 'blogPost', pubDetails: null, docDetails: null };
	}
	return { type: false, pubDetails: null, docDetails: null };
}

async function detectWeb(doc, url) {
	Z.debug("STARTING DETECT WEB");

	let result = await getTypeAndDetails(doc, url);

	Z.debug("Resulting Zotero type: " + result.type);

	return result.type;
}

function getSearchResults(doc, checkOnly) {
	Z.debug("Checking search results");
	var items = {};
	var found = false;

	var searchResults = doc.querySelectorAll('div.search-results div.item-result div.content > div.title > a');
	Z.debug("Number of results: " + searchResults.length);

	for (let result of searchResults) {
		let href = result.href;
		Z.debug(href);

		let title = ZU.trimInternal(result.textContent);
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
	
	if (url.includes('/document/case/')) {
		Z.debug('Scraping standalone case');

		await scrapeCase(url);
	}
	else if (url.includes('/search')) {
		Z.debug('Scraping search results');

		let items = await Zotero.selectItems(getSearchResults(doc, false));
		Z.debug(items);
		if (!items) return;
		for (let url of Object.keys(items)) {
			// Scrape each search result's URL. We do not use processDocuments because they are not required for all situations
			Z.debug("Scraping from search result for: " + url);
			await doWeb(null, url);
		}
	}
	else {
		// If doWeb() was called from the search results, we need to load the document
		if (!doc) requestDocument(url);

		let { type: zotType, pubDetails, docDetails } = await getTypeAndDetails(doc, url);

		Z.debug("detection result: " + zotType);
		if (zotType == 'blogPost') {
			Z.debug("Scraping blog post");
			await scrapeBlog(doc);
		}
		else if (zotType == 'book') {
			Z.debug("Scraping full book");
			scrapeBook(url, pubDetails);
		}
		else {
			Z.debug("Scraping document");
			scrapeDoc(url, zotType, pubDetails, docDetails);
		}
	}
}

function scrapeDoc(url, zotType, pubDetails, docDetails) {
	// Publication details
	let documentID = getDocId(url);

	var type = 'document';
	if (zotType) {
		type = zotType;
	}
	Z.debug("Creating new item of type: " + type);
	var item = new Z.Item(type);

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
		if (docDetails.CaseNumbers[0]) item.docketNumber = docDetails.CaseNumbers[0];
		if (docDetails.Parties.length) {
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

	if (type == 'webpage') item.url = url;

	// Getting PDF
	let pdfURL = '';
	if (type == 'case' && docDetails.PublicationType == 'internet') pdfURL = "https://www.kluwerarbitration.com/document/GetPdf/" + docDetails.Id;
	else pdfURL = "https://www.kluwerarbitration.com/document/print?title=PDF&ids=" + docDetails.Id;
	Z.debug(pdfURL);
	item.attachments.push({
		title: "Full Text PDF",
		mimeType: "application/pdf",
		url: pdfURL
	});

	if (type != 'webpage') {
		item.attachments.push({
			url: url,
			title: "Read on Kluwer Arbitration",
			mimeType: "text/html",
			snapshot: false
		});
	}

	item.complete();
}

function scrapeBook(url, pubDetails) {
	var item = new Z.Item('book');

	if (pubDetails && pubDetails.publicationInfo) {
		if (pubDetails.publicationInfo.isbn) item.ISBN = pubDetails.publicationInfo.isbn;
		else if (pubDetails.publicationInfo.publicationTitle) item.title = pubDetails.publicationInfo.publicationTitle;
	}

	Z.debug("Searching book with item: ");
	Z.debug(item);

	var search = Zotero.loadTranslator("search");

	search.setHandler("translators", function (obj, translators) {
		search.setTranslator(translators);
		search.translate();
	});

	search.setHandler("itemDone", function (obj, item) {
		completeBookScrape(url, pubDetails, item);
	});

	search.setHandler("error", function (error) {
		// If ISBN search failed for some reason, use the publication details from Kluwer
		Z.debug("ISBN search for " + item.ISBN + " failed: " + error);
		Z.debug("Using publication details from Kluwer instead.");

		if (pubDetails) {
			item.title = pubDetails.publicationTitle;
			item.date = pubDetails.publicationDate;
			item.publisher = pubDetails.publisher;
			item.abstractNote = pubDetails.descriptiveText;

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
		}

		completeBookScrape(url, pubDetails, item);
	});

	search.setSearch(item);
	// look for translators for given item
	search.getTranslators();
}

function completeBookScrape(url, pubDetails, item) {
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

		for (let [sectionID, sectionLabel] of Object.entries(items)) {
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
		title: "Kluwer Arbitration Link",
		mimeType: "text/html",
		snapshot: false
	});

	item.complete();
}

async function scrapeBlog(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		for (let tag of doc.querySelectorAll("div.entry-category > a[rel='category tag']")) {
			item.tags.push({ tag: tag.textContent.trim() });
		}
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'blogPost';
	await em.doWeb(doc, url);
}

async function scrapeCase(url) {
	let caseID = getCaseId(url);
	let documentID = getDocId(url);
	let proceedingID = getProceedingId(url);
	Z.debug("Scraping standalone case: " + caseID);
	Z.debug("Proceeding: " + proceedingID);
	Z.debug("Matching document: " + documentID);

	var item = new Z.Item('case');
	let caseDetails = await getCaseDetails(caseID);
	let caseToc = await getCaseToc(caseID);
	let docDetails = await getDocumentDetails(documentID);
	let procDetails = proceedingID ? await getProceedingDetails(proceedingID) : null;

	/*Z.debug(caseDetails);
	Z.debug(caseToc);
	Z.debug(docDetails);
	Z.debug(procDetails);*/

	item.docketNumber = caseDetails.caseNo;
	item.court = caseDetails.institutionLong;
	item.caseName = caseDetails.casename;
	item.language = caseDetails.languages.join(" ");
	if (procDetails) {
		item.filingDate = procDetails.commencementDate;
		item.dateDecided = procDetails.dateOfOutcome;
	}

	// Counsels and arbitrators
	for (let person of caseDetails.arbitrators) {
		item.creators.push({
			firstName: person.firstName,
			lastName: person.lastName,
			creatorType: person.role == "Counsel" ? "counsel" : "author"
		});
	}

	if (docDetails) {
		let pdfURL = '';
		if (docDetails.PublicationType == 'internet') pdfURL = "https://www.kluwerarbitration.com/document/GetPdf/" + docDetails.Id;
		else pdfURL = "https://www.kluwerarbitration.com/document/print?title=PDF&ids=" + docDetails.Id;
		Z.debug(pdfURL);
		item.attachments.push({
			title: "Full Text PDF",
			mimeType: "application/pdf",
			url: pdfURL
		});
	}
	else {
		// Select case files to download
		let docs = caseToc.tocItems.flatMap(node => node.documents).filter(doc => (doc ? doc.documentId : false)).map(doc => [doc.documentId, doc.title]);
		let items = await Z.selectItems(Object.fromEntries(docs));
		if (items) {
			for (let [docId, docLabel] of Object.entries(items)) {
				let pdfURL = "https://www.kluwerarbitration.com/document/GetPdf/" + docId + ".pdf";
				Z.debug(pdfURL);
				item.attachments.push({
					title: docLabel,
					mimeType: "application/pdf",
					url: pdfURL
				});
			}
		}
	}

	item.attachments.push({
		url: url,
		title: "Read on Kluwer Arbitration",
		mimeType: "text/html",
		snapshot: false
	});

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.kluwerarbitration.com/document/KLI-KA-Born-2021-Ch01",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Chapter 1: Overview of International Commercial Arbitration",
				"creators": [
					{
						"firstName": "Gary B.",
						"lastName": "Born",
						"creatorType": "author"
					},
					{
						"firstName": "Gary B.",
						"lastName": "Born",
						"creatorType": "editor"
					}
				],
				"date": "Jan 2021",
				"ISBN": "9789403526430",
				"bookTitle": "International Commercial Arbitration (Third Edition)",
				"libraryCatalog": "Kluwer Arbitration",
				"publisher": "Kluwer Law International",
				"shortTitle": "Chapter 1",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Read on Kluwer Arbitration",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Bibliographic reference: 'Chapter 1: Overview of International Commercial Arbitration', in Gary B. Born, International Commercial Arbitration (Third Edition),  (© Kluwer Law International; Kluwer Law International 2021)."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://arbitrationblog.kluwerarbitration.com/2023/10/18/hong-kong-arbitration-week-recap-a-step-forward-or-challenges-for-the-21st-century/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Hong Kong Arbitration Week Recap: A Step Forward or Challenges for the 21st Century?",
				"creators": [
					{
						"firstName": "Vera",
						"lastName": "He",
						"creatorType": "author"
					}
				],
				"date": "2023-10-18T06:49:12+00:00",
				"abstractNote": "On the second day of Hong Kong Arbitration Week 2023, the ICC International Court of Arbitration (ICC) and the International Chamber of Commerce – Hong Kong (ICC-HK) hosted an in-person event on “Challenges of the 21st Century: Regulation of Use of AI in Dispute Resolution and Making ADR Work.” The event explored the appropriate techniques... Continue reading",
				"blogTitle": "Kluwer Arbitration Blog",
				"language": "en-US",
				"shortTitle": "Hong Kong Arbitration Week Recap",
				"url": "https://arbitrationblog.kluwerarbitration.com/2023/10/18/hong-kong-arbitration-week-recap-a-step-forward-or-challenges-for-the-21st-century/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "ADR"
					},
					{
						"tag": "Artificial Intelligence"
					},
					{
						"tag": "HK Arbitration Week"
					},
					{
						"tag": "HKIAC"
					},
					{
						"tag": "Hong Kong"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kluwerarbitration.com/document/TOC-Lopez-Rodriguez-2019",
		"detectedItemType": "book",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.kluwerarbitration.com/document/KLI-KA-ASAB31020011",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Capacity of a Bankrupt Party to Be or Remain a Party to International Arbitral Proceedings: A Landmark Decision of the Swiss Federal Supreme Court",
				"creators": [
					{
						"firstName": "Georg",
						"lastName": "Naegeli",
						"creatorType": "author"
					},
					{
						"firstName": "Matthias",
						"lastName": "Scherer",
						"creatorType": "editor"
					}
				],
				"date": "Jun 2013",
				"ISSN": "1010-9153",
				"issue": "2",
				"libraryCatalog": "Kluwer Arbitration",
				"pages": "372-382",
				"publicationTitle": "ASA Bulletin",
				"shortTitle": "The Capacity of a Bankrupt Party to Be or Remain a Party to International Arbitral Proceedings",
				"volume": "31",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Read on Kluwer Arbitration",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Bibliographic reference: Georg Naegeli, 'The Capacity of a Bankrupt Party to Be or Remain a Party to International Arbitral Proceedings: A Landmark Decision of the Swiss Federal Supreme Court', ASA Bulletin, (© Association Suisse de l'Arbitrage; Kluwer Law International 2013, Volume 31, Issue 2), pp. 372 - 382."
					},
					{
						"note": "Parties: Claimant, X. Lda., handelnd durch Dr. M., Administradora de Insolvencia<br/>Defendant, Y. Ltd."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kluwerarbitration.com/document/kli-ka-1105506-n",
		"items": [
			{
				"itemType": "case",
				"caseName": "Société d'études et représentations navales et industrielles (Soerni) et autres v. société Air Sea Broker Ltd. (ASB), Cour de cassation (1re Ch. civ.), Not Indicated, 8 July 2009",
				"creators": [],
				"dateDecided": "2009",
				"court": "Court of Cassation of France, First Civil Law Chamber",
				"firstPage": "529",
				"reporter": "Revue de l'Arbitrage",
				"reporterVolume": "2009",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Read on Kluwer Arbitration",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Arbitrage international"
					},
					{
						"tag": "Clause compromissoire"
					},
					{
						"tag": "Croyance légitime dans les pouvoirs du signataire de la clause pour conclure un acte de gestion courante liant la société"
					},
					{
						"tag": "Engagement d'une société à l'arbitrage"
					},
					{
						"tag": "Engagement ne s'appréciant pas par référence à une quelconque loi nationale"
					},
					{
						"tag": "Exigence de bonne foi"
					},
					{
						"tag": "Fondement de cette règle"
					},
					{
						"tag": "Règle matérielle déduite du principe de validité de la convention d'arbitrage"
					},
					{
						"tag": "Volonté commune des parties"
					}
				],
				"notes": [
					{
						"note": "Bibliographic reference: 'Société d'études et représentations navales et industrielles (Soerni) et autres v. société Air Sea Broker Ltd. (ASB), Cour de cassation (1re Ch. civ.), Not Indicated, 8 July 2009', Revue de l'Arbitrage, (© Comité Français de l'Arbitrage; Comité Français de l'Arbitrage 2009, Volume 2009, Issue 3), pp. 529 - 532."
					},
					{
						"note": "Parties: Claimant, Société d'études et représentations navales et industrielles (Soerni) et autres<br/>Defendant, société Air Sea Broker Ltd. (ASB)"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kluwerarbitration.com/document/kli-ka-1134507-n",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "UNCITRAL Model Law on International Commercial Arbitration (1985, with 2006 amendments)",
				"creators": [],
				"dateEnacted": "2008",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Read on Kluwer Arbitration",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Bibliographic reference: 'UNCITRAL Model Law on International Commercial Arbitration (1985, with 2006 amendments)', in Lise Bosman (ed), ICCA International Handbook on Commercial Arbitration, (© Kluwer Law International; ICCA & Kluwer Law International 2023, Supplement No. 52, June 2008), pp. 1 - 17."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kluwerarbitration.com/document/case/2113/35563/kli-ka-kaces-25110",
		"items": [
			{
				"itemType": "case",
				"caseName": "NJSC Naftogaz of Ukraine, PJSC State Joint Stock Company Chornomornaftogaz, PJSC Ukrgasvydobuvannya, Others. v. Russian Federation",
				"creators": [
					{
						"firstName": "Anna",
						"lastName": "Kozmenko",
						"creatorType": "counsel"
					},
					{
						"firstName": "William Ian Cornell",
						"lastName": "Binnie",
						"creatorType": "author"
					},
					{
						"firstName": "Baiju S.",
						"lastName": "Vasani",
						"creatorType": "counsel"
					},
					{
						"firstName": "Christopher",
						"lastName": "Boog",
						"creatorType": "counsel"
					},
					{
						"firstName": "Elliott",
						"lastName": "Geisinger",
						"creatorType": "counsel"
					},
					{
						"firstName": "Julie",
						"lastName": "Raneda",
						"creatorType": "counsel"
					},
					{
						"firstName": "Charles",
						"lastName": "Poncet",
						"creatorType": "author"
					},
					{
						"firstName": "Maja",
						"lastName": "Stanivuković",
						"creatorType": "author"
					},
					{
						"firstName": "Erin",
						"lastName": "Thomas",
						"creatorType": "counsel"
					},
					{
						"firstName": "Joshua B.",
						"lastName": "Picker",
						"creatorType": "counsel"
					},
					{
						"firstName": "Marney L.",
						"lastName": "Cheek",
						"creatorType": "counsel"
					}
				],
				"dateDecided": "12/04/2023",
				"court": "Permanent Court of Arbitration",
				"docketNumber": "PCA Case No. 2017-16",
				"language": "English",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Read on Kluwer Arbitration",
						"mimeType": "text/html",
						"snapshot": false
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
		"url": "https://www.kluwerarbitration.com/document/case/2113",
		"detectedItemType": "case",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.kluwerarbitration.com/search?q=counterclaim+OR+counterclaims&sortBy=date+desc",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.kluwerarbitration.com/document/kli-kapp-piap-tp-mca",
		"items": [
			{
				"itemType": "webpage",
				"title": "Practical Insights on Third Parties – Multi-Contract Arbitration",
				"creators": [
					{
						"firstName": "Bernard",
						"lastName": "Hanotiau",
						"creatorType": "author"
					}
				],
				"url": "https://www.kluwerarbitration.com/document/kli-kapp-piap-tp-mca",
				"websiteTitle": "Practical Insights on Arbitral Procedure",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Third Parties – Multi-Contract Arbitration"
					}
				],
				"notes": [
					{
						"note": "Bibliographic reference: Bernard Hanotiau, 'Practical Insights on Third Parties – Multi-Contract Arbitration', Practical Insights on Arbitral Procedure (© Kluwer Law International; Kluwer Law International)."
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
