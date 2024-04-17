{
	"translatorID": "a59e99a6-42b0-4be6-bb0c-1ff688c3a8b3",
	"label": "Dalloz",
	"creator": "Alexandre Mimms",
	"target": "https?://(?:www[.-])?dalloz(?:[.-]fr)?",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-04-17 12:42:44"
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

const citationAvecNumero = new RegExp(/^([\D]+)\s*(\d{4}),?\s?(n°\s?\d+) *,?\s*(p\.\s?\d+)*/);
const citationSansNumero = new RegExp(/^([\D]+)\s*(\d{4}),?\s*(p\.\d+)?/);
const regAnnee = new RegExp(/\d{4}/);
const docTypeId = new RegExp(/id=([^%]+)(?:%2F)?/);

const codeDocument = new Map([
	["ENCY", "dictionary-entry"],
	["JA", "journalArticle"],
	["AJ", "journalArticle"],
	["ACTU", "blogPost"],
	["RFDA", "journalArticle"],
	["CONS", "journalArticle"],
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
	["RCJ", "journalArticle"]
]);

// The following function checks if the ID passed as argument has an associated key (some IDs start with the same letters - easier than filing all available IDs).
function idStartsWithKey(string) {
	for (let key of codeDocument.keys()) {
		if (key.startsWith(string.substring(0, 2))) {
			return true;
		}
    }
    return false;
}

function detectWeb(doc, url) {
	if (url.includes('/documentation/Document')) { // Checks if the page is a document.
		let id = url.match(docTypeId);
		id = id[1].substring(0, 4);
		Z.debug(id);
		if (idStartsWithKey(id)) {
			if (codeDocument.get(id)) { // If there is a corresponding ID.
				return codeDocument.get(id);
			}
			return codeDocument.get(id.substring(0, 2)); // Gets the value of the key if it is a shorthand.
			// Returns the type of the document according to the ID - refer to the const Map declared.
		}
	}
	else if (url.includes('/documentation/Liste')) { // Checks if the page is a list of results.
		return 'multiple';
	}
	return false;
}

// This function is basically as it was set by the template. I modified it so it is specific to Dalloz.
function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.result-content');
	for (let row of rows) {
		let href = attr(row, "a", "href", 0);
		let title = ZU.trimInternal(text(row, "a", 0));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

// Nothing changed here neither.
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


// Since searches trigger a "< >" markup around the searched words, we have to edit that away before storing the values.
async function scrape(doc, url = doc.location.href) {
	const titre = ZU.trimInternal(text(doc, ".chronTITRE", 0)).replace(/[<>]/g, ""); // gets the title of the document
	const abstract = ZU.trimInternal(text(doc, "#RESUFRAN")).replace(/[<>]/g, ""); // gets the abstract
	let refDoc = ZU.trimInternal(text(doc, ".refDoc", 0).replace(/[<>]/g, "")); // gets the reference

	let page, revue, numRevue, date;
	const signatures = doc.querySelectorAll(".chronSIGNATURE");
	let auteurs = [];

	// Loop over the "signatures" of the document, and store the author in the list.
	for (let signature of signatures) {
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

	newItem.title = titre;
	for (let auth of auteurs) { // loop over the list of authors and set them as authors.
		let authNames = auth.split(" ");
		newItem.creators.push({
			firstName: authNames[0],
			lastName: authNames[1],
			creatorType: "author",
			fieldMode: true
		});
	}

	newItem.publicationTitle = revue;
    newItem.abstractNote = abstract;
	if (numRevue !== "") newItem.issue = numRevue;
	newItem.pages = page;
	newItem.date = date;
	newItem.url = url;
	newItem.complete();
}

