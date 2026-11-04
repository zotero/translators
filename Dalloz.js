{
	"translatorID": "a59e99a6-42b0-4be6-bb0c-1ff688c3a8b3",
	"label": "Dalloz",
	"creator": "Alexandre Mimms",
	"target": "https?://(www\\.)?dalloz\\.fr",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-04-23 09:45:03"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Alexandre Mimms

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
// TODO
// - Make sure that the case report are correctly saved.
// - PDF import : needs reverse engineering the internal api of the service. Seems like a quite complex one.

const citationAvecNumero = /^([\D]+)\s*(\d{4}),?\s?(n°\s?\d+) *,?\s*(p\.\s?\d+)*/;
const citationSansNumero = /^([\D]+)\s*(\d{4}),?\s*(p\.\d+)?/;
const regAnnee = /\d{4}/;
const docTypeId = /id=([^%_]+)(?:%2F|_)?/;

const codeDocument = new Map([
	["ENCY", "dictionary-entry"],
	["JA", "journalArticle"],
	["AJ", "journalArticle"],
	["ACTU", "blogPost"],
	["RFDA", "journalArticle"],
	["CONSCONST", "case"],
	["CONSTIT", "journalArticle"],
	["DIPI", "journalArticle"],
	["DS", "journalArticle"],
	["JA", "journalArticle"],
	["JT", "journalArticle"],
	["JS", "journalArticle"],
	["JCAS", "journalArticle"],
	["LEGI", "journalArticle"],
	["CAHJ", "journalArticle"],
	["RDI", "journalArticle"],
	["RDSS", "journalArticle"],
	["RECU", "journalArticle"],
	["LEBO", "case"],
	["REV", "journalArticle"],
	["RMC", "journalArticle"],
	["RSC", "journalArticle"],
	["RTD", "journalArticle"],
	["RPR", "journalArticle"],
	["RCJ", "journalArticle"],

]);



function detectWeb(doc, url) {
	if (url.includes('/documentation/Document')) { // Checks if the page is a document.
		let id = url.match(docTypeId)[1];
		Z.debug(id);
		if (codeDocument.get(id)) { return codeDocument.get(id) }
		else if (idStartsWithKey(id)) { return codeDocument.get(id.substring(0, 2)); }  // Gets the value of the key if it is a shorthand.
			// Returns the type of the document according to the ID - refer to the const Map declared.
	}
	else if (url.includes('/documentation/Liste') && getSearchResults(doc, true)) { // Checks if the page is a list of results.
		return 'multiple';
	}
	return false;
}

// The following function checks if the ID passed as argument has an associated key (some IDs start with the same letters - easier than filing all available IDs).
function idStartsWithKey(string) {
	for (let key of codeDocument.keys()) {
		if (key.startsWith(string.substring(0, 2))) {
			return true;
		}
	}
	return false;
}

function scrapeJournalArticle(doc, url = doc.location.href) {
	// Since searches trigger a "< >" markup around the searched words, we have to edit that away before storing the values.
	let refDoc = ZU.trimInternal(text(doc, ".refDoc").replace(/[<>]/g, "")); // gets the reference
	let page, revue, numRevue, date;
	let auteurs = [];

	// Loop over the "signatures" of the document, and store the author in the list.
	for (let signature of doc.querySelectorAll(".chronSIGNATURE")) {
		auteurs.push(signature.innerText.replace(/[<>]/g, "").split(',')[0]);
	}

	if (citationAvecNumero.test(refDoc)) {
		refDoc = refDoc.split(citationAvecNumero);
	}
	else if (citationSansNumero.test(refDoc)) {
		refDoc = refDoc.split(citationSansNumero);
	}

	for (let item of refDoc) {
		if (item.startsWith("p")) {
			page = item.replace("p.", "");
		}
		else if (item.startsWith("n")) {
			numRevue = item.replace("n°", "");
		}
		else if (regAnnee.test(item)) {
			date = item;
		}
		else if (item !== "") {
			revue = item;
		}
	}

	let newItem = new Z.Item("journalArticle");

	newItem.title = ZU.trimInternal(text(doc, ".chronTITRE")).replace(/[<>]/g, "");
	for (let auth of auteurs) { // loop over the list of authors and set them as authors.
		newItem.creators.push(ZU.cleanAuthor(auth, "author"));
	}

	newItem.publicationTitle = revue;
	newItem.abstractNote = ZU.trimInternal(text(doc, "#RESUFRAN")).replace(/[<>]/g, "");
	if (numRevue !== "") newItem.issue = numRevue;
	newItem.pages = page;
	newItem.date = date;
	newItem.url = url;
	newItem.language = "fr";
	newItem.complete();
}

function scrapeCase(doc, url = doc.location.href) {
	let juridiction, titre, abstract, formation, date, volume, mentionPublication, numeroAffaire;

	if (url.includes("LEBON")) {
		juridiction = "Conseil d'État";
		// Since searches trigger a "< >" markup around the searched words, we have to edit that away before storing the values.
		titre = ZU.trimInternal(text(doc, ".jurisJURI")).replace(/[<>]/g, ""); // gets the title of the document
		abstract = ZU.trimInternal(text(doc, ".jurisSOMMAIRE")).replace(/[<>]/g, ""); // gets the abstract
		formation = ZU.trimInternal(text(doc, ".jurisCHAM").replace(/[<>]/g, "")); // gets the reference
		date = ZU.trimInternal(text(doc, ".jurisDATE").replace(/[<>]/g, ""));
		volume = date.split("-")[2];
		mentionPublication = ZU.trimInternal(text(doc, ".commentPopupNDC b").replace(/[<>]/g, ""));
		numeroAffaire = ZU.trimInternal(text(doc, ".jurisNAAF").replace(/[<>]/g, "").replace("n° ", ""));
	}
	else {
		juridiction = ZU.trimInternal(text(doc, ".book-header-title-caselaw__juridiction"));
		date = ZU.trimInternal(text(doc, ".book-header-title-caselaw__date"));
		numeroAffaire = ZU.trimInternal(text(doc, ".book-header-title-caselaw__references"));
		abstract = "";

		if (juridiction == "Conseil constitutionnel") { titre = `Cons. constit., ${numeroAffaire}, ${date}`; }
		else { titre = `${juridiction}, ${date}, ${numeroAffaire}`; }

	}

	let newItem = new Z.Item("case");

	newItem.caseName = titre;
	newItem.court = juridiction;
	newItem.reporter = mentionPublication;
	newItem.abstractNote = abstract.replace("Sommaire : ", "");
	newItem.court = juridiction;
	newItem.dateDecided = date;
	newItem.reporterVolume = volume || "";
	newItem.docketNumber = numeroAffaire;
	newItem.language = "fr";
	newItem.url = url;
	newItem.extra = formation;
	newItem.complete();
}


// This function is basically as it was set by the template. I modified it so it is specific to Dalloz.
function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.result-content');
	for (let row of rows) {
		let href = attr(row, "a", "href");
		let title = ZU.trimInternal(text(row, "a"));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

// Nothing changed here neither.
async function doWeb(doc, url) {
	const docType = detectWeb(doc, url); // calling detectWeb once and passing it to scrape function,
	// so we don't have to call it multiple times to check in the scrape function what type of document it is.

	if (docType == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url, docType);
	}
}

async function scrape(doc, url = doc.location.href, docType) {
	if (docType == "journalArticle") {
		scrapeJournalArticle(doc, url);
	}
	else if (docType == "case") {
		scrapeCase(doc, url);
	}
}


/** BEGIN TEST CASES **/
var testCases = [

]
/** END TEST CASES **/
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.dalloz.fr/dalloz",
		"detectedItemType": false,
		"items": []
	},
	{
		"type": "web",
		"url": "https://www.dalloz.fr/documentation/Document?ctxt=0_YSR0MD1jb25zdGl0dXRpb27Cp3gkc2Y9c2ltcGxlLXNlYXJjaA%3D%3D&ctxtl=0_cyRwYWdlTnVtPTHCp3MkdHJpZGF0ZT1GYWxzZcKncyRzb3J0PSNkZWZhdWx0X0Rlc2PCp3Mkc2xOYlBhZz0yMMKncyRpc2Fibz1UcnVlwqdzJHBhZ2luZz1UcnVlwqdzJG9uZ2xldD3Cp3MkZnJlZXNjb3BlPVRydWXCp3Mkd29JUz1GYWxzZcKncyR3b1NQQ0g9RmFsc2XCp3MkZmxvd01vZGU9RmFsc2XCp3MkYnE9wqdzJHNlYXJjaExhYmVsPcKncyRzZWFyY2hDbGFzcz3Cp3Mkej0wREJGQzhEQi8xOEUwNjY0Mw%3D%3D&id=CONSCONST_LIEUVIDE_2024-01-18_20231076QPC",
		"items": [
			{
				"itemType": "case",
				"caseName": "Cons. constit., n° 2023-1076 QPC, 18 janvier 2024",
				"creators": [],
				"dateDecided": "18 janvier 2024",
				"court": "Conseil constitutionnel",
				"docketNumber": "n° 2023-1076 QPC",
				"language": "fr",
				"url": "https://www.dalloz.fr/documentation/Document?ctxt=0_YSR0MD1jb25zdGl0dXRpb27Cp3gkc2Y9c2ltcGxlLXNlYXJjaA%3D%3D&ctxtl=0_cyRwYWdlTnVtPTHCp3MkdHJpZGF0ZT1GYWxzZcKncyRzb3J0PSNkZWZhdWx0X0Rlc2PCp3Mkc2xOYlBhZz0yMMKncyRpc2Fibz1UcnVlwqdzJHBhZ2luZz1UcnVlwqdzJG9uZ2xldD3Cp3MkZnJlZXNjb3BlPVRydWXCp3Mkd29JUz1GYWxzZcKncyR3b1NQQ0g9RmFsc2XCp3MkZmxvd01vZGU9RmFsc2XCp3MkYnE9wqdzJHNlYXJjaExhYmVsPcKncyRzZWFyY2hDbGFzcz3Cp3Mkej0wREJGQzhEQi8xOEUwNjY0Mw%3D%3D&id=CONSCONST_LIEUVIDE_2024-01-18_20231076QPC",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
