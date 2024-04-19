{
	"translatorID": "858fa86d-82e2-43ca-9fc7-cf75b98101cb",
	"label": "Vie Publique",
	"creator": "Alexandre Mimms",
	"target": "https?://(?:www.)?vie-publique(?:.fr)?",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-04-19 05:56:53"
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


function scrapeRapport(doc, url) {
	const titre = text(doc, "h1", 0);
	const auteursString = doc.querySelectorAll(".book--author a");
	const auteursMorauxString = doc.querySelectorAll(".book--author-moral a");
	const abstract = text(doc, "#fiche-item-présentation");
	const information = doc.querySelectorAll(".tabpanel--technique--details li");
	const date = text(doc, ".field--name-field-date-remise", 0);
	const page = information[1].innerText.replace("Pagination : ", "").replace(" pages", "");
	const reportType = information[0].innerText.replace("Type de document : ", "");
	const pdfLink = doc.querySelectorAll(".book--actionsBox a")[0].href;
	const tags = doc.querySelectorAll(".vp-item-tag");

	let newItem = new Z.Item('report');
	newItem.title = titre || "";
	newItem.date = date;
	newItem.institution = auteursMorauxString[0].innerText;
	newItem.abstractNote = abstract;
	newItem.pages = page;
	newItem.reportType = reportType;
	newItem.url = url;
	
	newItem.attachments = [{
		url: pdfLink,
		title: "Full Text PDF",
		mimeType: "application/pdf",
		snapshot: false
	}];

	for (let aut of auteursString) {
		const autNames = aut.innerText.split(" ");

		newItem.creators.push({
			firstName: autNames[0],
			lastName: autNames[1],
			creatorType: "author",
			fieldMode: true,
		});
	}

	for (let tag of tags) {
		newItem.tags.push(tag.innerText);
	}


	if (auteursMorauxString.length > 1) {
		for (let autMoral of auteursMorauxString) {
			newItem.institution += ", " + autMoral.innerText;
		}
	}

	newItem.complete();
}

function scrapeSpeech(doc, url) {
	const titre = text(doc, "h1", 0);
	const auteursString = doc.querySelectorAll(".line-intervenant a");
	const date = text(doc, ".datetime", 0);
	const tags = doc.querySelectorAll(".vp-item-tag");

	let newItem = new Z.Item('presentation');
	newItem.title = titre || "";
	newItem.date = date;
	newItem.url = url;

	for (let aut of auteursString) {
		const autNames = aut.innerText.split(" ");

		newItem.creators.push({
			firstName: autNames[0],
			lastName: autNames[1],
			creatorType: "author",
			fieldMode: true,
		});
	}

	for (let tag of tags) {
		newItem.tags.push(tag.innerText);
	}

	newItem.complete();
}

function detectWeb(doc, url) {
	// TODO: adjust the logic here
	if (url.includes('/rapport')) {
		return 'report';
	}
	else if (url.includes('/discours')) {
		return 'presentation';
	}
	else if (url.includes('/recherche')) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// TODO: adjust the CSS selector
	var rows = doc.querySelectorAll('h3 > a');
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
	const docType = detectWeb(doc, url);
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
	if (docType == "report") {
		scrapeRapport(doc, url);
	}
	else if (docType == "presentation") {
		scrapeSpeech(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
