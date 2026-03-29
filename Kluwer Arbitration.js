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
	"lastUpdated": "2024-10-01 21:29:59"
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

const kluwerAPIBaseURL = "https://www.kluwerarbitration.com/apiv1/";

// Get the JSON object describing the publication (i.e., the book for a section or the journal for an article)
async function getPublicationDetails(documentID) {
	let detailsURL = kluwerAPIBaseURL + `api/publicationdetail?documentId=${documentID}`;
	return requestJSON(detailsURL);
}

// Get the JSON object describing the document itself (article, book section, etc.)
async function getDocumentDetails(documentID) {
	let detailsURL = kluwerAPIBaseURL + `api/Document?id=${documentID}`;
	return requestJSON(detailsURL).catch(() => Zotero.debug(`No document details available for document ${documentID}`));
}

// Get the JSON object describing the standalone case (i.e., not contained in a journal)
async function getCaseDetails(caseID) {
	let detailsURL = kluwerAPIBaseURL + `case/GetDetailsByCaseId?caseId=${caseID}`;
	return requestJSON(detailsURL);
}

// Get the JSON object of the case ToC (history)
async function getCaseToc(caseID) {
	let detailsURL = kluwerAPIBaseURL + `case/${caseID}/GetToc`;
	return requestJSON(detailsURL);
}

async function getProceedingDetails(proceedingID) {
	let detailsURL = kluwerAPIBaseURL + `proceeding/${proceedingID}`;
	return requestJSON(detailsURL);
}

function getDocId(url) {
	let segments = new URL(url).pathname.split('/');
	let documentID = segments.pop() || segments.pop(); // Handle potential trailing slash
	return documentID;
}

function getCaseId(url) {
	let path = new URL(url).pathname;
	let m = path.match(/case\/(\d+)/);
	if (m) {
		return m[1];
	}
	return null;
}

function getProceedingId(url) {
	let path = new URL(url).pathname;
	let m = path.match(/case\/(\d+\/\d+)/);
	if (m) {
		return m[1];
	}
	return null;
}

async function getTypeAndDetails(url) {
	if (url.includes('document/case')) {
		return { type: 'case', pubDetails: null, docDetails: null };
	}
	else if (url.includes('/document/')) {
		let documentID = getDocId(url);
		let pubDetails = await getPublicationDetails(documentID);
		let docDetails = await getDocumentDetails(documentID);

		//let pubType = pubDetails.publicationType;
		let zotType = getType(pubDetails, docDetails);
		if (zotType) {
			return { type: zotType, pubDetails: pubDetails, docDetails: docDetails };
		}
	}
	else if (url.includes('arbitrationblog')) {
		// This limb is used when blog posts are found in a search on the main Kluwer Arbitration website.
		return { type: 'blogPost', pubDetails: null, docDetails: null };
	}
	return { type: false, pubDetails: null, docDetails: null };
}

function getType(pubDetails, docDetails) {
	if (!pubDetails && !docDetails) {
		return false;
	}
	let pubType = pubDetails && pubDetails.publicationType ? pubDetails.publicationType : docDetails.PublicationType;

	switch (pubType) {
		case 'book':
			if (docDetails) {
				switch (docDetails.Type) {
					case 'Court Decisions':
					case 'Awards':
						return 'case';
					default:
						return 'bookSection';
				}
			}
			else return 'book';
		// Multiple here would show a selection screen with the option to save the book or individual chapters, but we use the selection screen to indicate which items to download as part of the book
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
				case 'Court Decisions':
					return 'case';
				case 'Commentary': // For some online insights and commentaries, could be considered blog posts but that would change the logic
				default:
					return 'webpage';
			}
		case 'blog': // Only if we're reading from the search results JSON
			return 'blogPost';
	}

	throw new Error(`Could not match pairing: ${pubType}, ${docDetails.Type}`);
	return false;
}

async function detectWeb(doc, url) {
	let result = false;
	let urlObj = new URL(url);

	if (urlObj.hostname.includes("arbitrationblog")) {
		// Kluwer Arbitration blog
		let articleCount = doc.querySelectorAll('article').length;
		switch (true) {
			case (articleCount == 0):
				return false;
			case (articleCount == 1):
				return 'blogPost';
			case (articleCount > 1):
				return 'multiple';
		}
	}
	else if (urlObj.pathname.includes('/search')) {
		// Kluwer Arbitration search
		let selector = 'div#app';
		Z.monitorDOMChanges(doc.querySelector(selector));
		if (getSearchResults(doc, true)) {
			result = 'multiple';
		}
	}
	else {
		// Any other page
		result = (await getTypeAndDetails(url)).type;
	}
	return result;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;

	var searchResults = doc.querySelectorAll('div.search-results div.item-result div.content > div.title > a');

	for (let result of searchResults) {
		let href = result.href;
		let title = ZU.trimInternal(result.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	let urlObj = new URL(url);

	if (urlObj.hostname.includes('arbitrationblog')) {
		// Kluwer Arbitration blog
		let articles = doc.querySelectorAll("article h2.entry-title");
		switch (articles.length) {
			case 0:
				return;
			case 1:
				await scrapeBlog(doc);
				return;
			default: // Multiple articles
				let items = await Z.selectItems(ZU.getItemArray(doc, articles));
				if (items) {    
    				await Promise.all(Object.keys(items).map(async (url) => {
        				const doc = await requestDocument(url);
        				await scrapeBlog(doc, url);
    				}));
				}
		}
	}
	else if (urlObj.pathname.includes('/search')) {
		// Kluwer Arbitration search page

		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			// Scrape each search result's URL. We do not use processDocuments because they are not required for all situations
			await scrape(null, url);
		}
	}
	else {
		await scrape(doc, url);
	}
}

// This function calls the adequate scraper based on the URL or doc
async function scrape(doc, url) {
	if (url.includes('/document/case/')) {
		await scrapeCase(url);
	}
	else {
		let { type: zotType, pubDetails, docDetails } = await getTypeAndDetails(url);

		if (zotType == 'blogPost') {
			// If scrape() was called from the (main) Kluwer Arbitration search results, doc is null and we need to load it before the actual scraping
			if (!doc) doc = await requestDocument(url);
			await scrapeBlog(doc);
		}
		else if (zotType == 'book') {
			scrapeBook(url, pubDetails);
		}
		else {
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

	var item = new Z.Item(type);

	if (pubDetails.publicationInfo) {
		let publicationInfo = pubDetails.publicationInfo;
		if (publicationInfo.isbn) {
			item.ISBN = ZU.cleanISBN(publicationInfo.isbn);
		}
		if (publicationInfo.issn) {
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
		item.date = ZU.strToISO(docDetails.PublicationDate);
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

		if (docDetails.LegislationDate) item.dateEnacted = ZU.strToISO(docDetails.LegislationDate);
		if (item.itemType == 'statute' && item.dateEnacted) delete item.date;

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
		if (docDetails.CaseDate) item.dateDecided = ZU.strToISO(docDetails.CaseDate);
		if (item.itemType == 'case' && item.dateDecided) delete item.date;
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
		let section = sectionNodes.find(node => (node.docId.toLowerCase() == documentID.toLowerCase()));
		if (section.pageRange.first && section.pageRange.last) item.pages = section.pageRange.first + "-" + section.pageRange.last;
	}
	else if (type == 'journalArticle' || type == 'case') {
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

	item.url = url;

	// Getting PDF
	let pdfURL = '';
	if (type == 'case' && docDetails.PublicationType == 'internet') { 
		pdfURL = `https://www.kluwerarbitration.com/document/GetPdf/${docDetails.Id}`;
	}
	else {
		pdfURL = `https://www.kluwerarbitration.com/document/print?title=PDF&ids=${docDetails.Id}`;
	}

	// Snapshots are not added as they provide only marginally better hyperlinks to footnotes
	item.attachments.push({
		title: "Full Text PDF",
		mimeType: "application/pdf",
		url: pdfURL
	});

	item.complete();
}

function scrapeBook(url, pubDetails) {
	var item = new Z.Item('book');

	if (pubDetails && pubDetails.publicationInfo) {
		if (pubDetails.publicationInfo.isbn) item.ISBN = ZU.cleanISBN(pubDetails.publicationInfo.isbn);
		else if (pubDetails.publicationInfo.publicationTitle) item.title = pubDetails.publicationInfo.publicationTitle;
	}

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
		Z.debug(`ISBN search for ${item.ISBN} failed: ${error}`);
		Z.debug("Using publication details from Kluwer instead.");

		if (pubDetails) {
			item.title = pubDetails.publicationTitle;
			item.date = ZU.strToISO(pubDetails.publicationInfo.publicationDate);
			item.publisher = pubDetails.publicationInfo.publisher;
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

	Z.selectItems(sections, function (items) {
		if (!items) {
			return;
		}

		for (let [sectionID, sectionLabel] of Object.entries(items)) {
			let pdfURL = `https://www.kluwerarbitration.com/document/print?title=PDF&ids=${sectionID}`;

			item.attachments.push({
				title: sectionLabel,
				mimeType: "application/pdf",
				url: pdfURL
			});
		}
	});

	item.url = url;

	item.complete();
}

async function scrapeBlog(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', (_obj, item) => {
		// Add tags from blog header
		for (let tag of doc.querySelectorAll("div.entry-category > a[rel~='tag']")) {
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

	var item = new Z.Item('case');
	let caseDetails = await getCaseDetails(caseID);
	let caseToc = await getCaseToc(caseID);
	let docDetails = await getDocumentDetails(documentID);
	let procDetails = proceedingID ? await getProceedingDetails(proceedingID) : null;

	item.docketNumber = caseDetails.caseNo;
	item.court = caseDetails.institutionLong;
	item.caseName = caseDetails.casename;
	item.language = caseDetails.languages.join(", ");
	if (procDetails) {
		item.filingDate = ZU.strToISO(procDetails.commencementDate);
		item.dateDecided = ZU.strToISO(procDetails.dateOfOutcome);
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
		if (docDetails.PublicationType == 'internet') pdfURL = `https://www.kluwerarbitration.com/document/GetPdf/${docDetails.Id}`;
		else pdfURL = `https://www.kluwerarbitration.com/document/print?title=PDF&ids=${docDetails.Id}`;

		item.attachments.push({
			title: "Full Text PDF",
			mimeType: "application/pdf",
			url: pdfURL
		});
	}
	else {
		// Extract available documents from ToC nodes
		let docs = caseToc.tocItems.flatMap(node => node.documents).filter(doc => (doc && doc.documentId)).map(doc => [doc.documentId, doc.title]);
		let items = await Z.selectItems(Object.fromEntries(docs));
		if (items) {
			for (let [docId, docLabel] of Object.entries(items)) {
				let pdfURL = `https://www.kluwerarbitration.com/document/GetPdf/${docId}.pdf`;

				item.attachments.push({
					title: docLabel,
					mimeType: "application/pdf",
					url: pdfURL
				});
			}
		}
	}

	item.url = url;

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
				"title": "Chapter 1: Overview of International Commercial Arbitration (Updated November 2023)",
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
				"date": "2021-01",
				"ISBN": "9789403526430",
				"bookTitle": "International Commercial Arbitration (Third Edition)",
				"libraryCatalog": "Kluwer Arbitration",
				"publisher": "Kluwer Law International",
				"shortTitle": "Chapter 1",
				"url": "https://www.kluwerarbitration.com/document/KLI-KA-Born-2021-Ch01",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Bibliographic reference: 'Chapter 1: Overview of International Commercial Arbitration (Updated November 2023)', in Gary B. Born, International Commercial Arbitration (Third Edition),  (© Kluwer Law International; Kluwer Law International 2021)."
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
				"date": "2013-06",
				"ISSN": "1010-9153",
				"issue": "2",
				"libraryCatalog": "Kluwer Arbitration",
				"pages": "372-382",
				"publicationTitle": "ASA Bulletin",
				"shortTitle": "The Capacity of a Bankrupt Party to Be or Remain a Party to International Arbitral Proceedings",
				"url": "https://www.kluwerarbitration.com/document/KLI-KA-ASAB31020011",
				"volume": "31",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
				"dateDecided": "2009-07-08",
				"court": "Court of Cassation of France, First Civil Law Chamber",
				"firstPage": "529",
				"reporter": "Revue de l'Arbitrage",
				"reporterVolume": "2009",
				"url": "https://www.kluwerarbitration.com/document/kli-ka-1105506-n",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
				"dateEnacted": "2006-07-07",
				"url": "https://www.kluwerarbitration.com/document/kli-ka-1134507-n",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
						"firstName": "Michael",
						"lastName": "Hwang",
						"creatorType": "author"
					},
					{
						"firstName": "Charles",
						"lastName": "Poncet",
						"creatorType": "author"
					},
					{
						"firstName": "Boaz",
						"lastName": "Moselle",
						"creatorType": "author"
					},
					{
						"firstName": "Dean G.",
						"lastName": "Acheson",
						"creatorType": "counsel"
					},
					{
						"firstName": "Daniel",
						"lastName": "George",
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
					},
					{
						"firstName": "William B.",
						"lastName": "Cline",
						"creatorType": "author"
					},
					{
						"firstName": "Clovis J.",
						"lastName": "Trevino",
						"creatorType": "counsel"
					},
					{
						"firstName": "Anne-Carole",
						"lastName": "Cremades",
						"creatorType": "counsel"
					},
					{
						"firstName": "Anne-Carole",
						"lastName": "Cremades",
						"creatorType": "counsel"
					},
					{
						"firstName": "Mikhail",
						"lastName": "Vinogradov",
						"creatorType": "counsel"
					},
					{
						"firstName": "Elena Sergeevna",
						"lastName": "Burova",
						"creatorType": "counsel"
					},
					{
						"firstName": "Irina",
						"lastName": "Paliashvili",
						"creatorType": "author"
					}
				],
				"dateDecided": "2023-12-04",
				"court": "Permanent Court of Arbitration",
				"docketNumber": "PCA Case No. 2017-16",
				"language": "English",
				"url": "https://www.kluwerarbitration.com/document/case/2113/35563/kli-ka-kaces-25110",
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
		"url": "https://www.kluwerarbitration.com/document/case/2113",
		"detectedItemType": "case",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.kluwerarbitration.com/search?q=counterclaim+OR+counterclaims&sortBy=date+desc",
		"defer": true,
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
	},
	{
		"type": "web",
		"url": "https://arbitrationblog.kluwerarbitration.com/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.kluwerarbitration.com/document/kli-ka-1252105-n",
		"items": [
			{
				"itemType": "case",
				"caseName": "Sulamérica Cia Nacional de Seguros S.A. et al. v. Enesa Engenharia S.A. et al., Court of Appeal of England and Wales, Civil Division, A3/2012/0249, 16 May 2012",
				"creators": [],
				"dateDecided": "2012-05-16",
				"court": "Court of Appeal of England and Wales, Civil Division",
				"docketNumber": "A3/2012/0249",
				"firstPage": "464",
				"reporter": "ICCA Yearbook Commercial Arbitration 2012 - Volume XXXVII",
				"reporterVolume": "XXXVII",
				"url": "https://www.kluwerarbitration.com/document/kli-ka-1252105-n",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Bibliographic reference: 'Sulamérica Cia Nacional de Seguros S.A. et al. v. Enesa Engenharia S.A. et al., Court of Appeal of England and Wales, Civil Division, A3/2012/0249, 16 May 2012', in Albert Jan van den Berg (ed), ICCA Yearbook Commercial Arbitration 2012 - Volume XXXVII, Yearbook Commercial Arbitration, Volume 37 (© Kluwer Law International; ICCA & Kluwer Law International 2012), pp. 464 - 467."
					},
					{
						"note": "Parties: Claimant, Sulamérica Cia Nacional de Seguros S.A. et al.<br/>Defendant-Appellant, Enesa Engenharia S.A. et al."
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
