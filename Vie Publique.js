{
	"translatorID": "858fa86d-82e2-43ca-9fc7-cf75b98101cb",
	"label": "Vie Publique",
	"creator": "Alexandre Mimms",
	"target": "https?://(www\\.)?vie-publique\\.fr/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-04-23 12:20:52"
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

function detectWeb(doc, url) {
	if (url.includes('/rapport/')) {
		return 'report';
	}
	else if (url.includes('/discours')) {
		return 'presentation';
	}
	else if (url.includes('/recherche') && getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}


function scrapeRapport(doc, url) {
	let page, reportType;
	const titre = text(doc, "h1");
	const auteursString = doc.querySelectorAll(".book--author a");
	const auteursMoraux = doc.querySelectorAll(".book--author-moral a");
	const abstract = text(doc, "#fiche-item-présentation");
	const information = doc.querySelectorAll(".tabpanel--technique--details li");

	if (information.length > 0) {
		for (let info of information) {
			let value = info.innerText
			if (value.startsWith('Pagination')) {
				page = info.innerText.replace("Pagination : ", "").replace(" pages", "");
			}
			else if (value.startsWith('Type de document')) {
				reportType = information[0].innerText.replace("Type de document : ", "");
			}
		}
	}

	const date = text(doc, ".field--name-field-date-remise");

	const pdfLink = doc.querySelectorAll(".book--actionsBox a")[0].href; 

	const tags = doc.querySelectorAll(".vp-item-tag");

	let newItem = new Z.Item('report');
	newItem.title = titre || "";
	newItem.date = date;

	for (let aut of auteursString) {
		newItem.creators.push(ZU.cleanAuthor(aut.innerText, "author"))
	}

	if (auteursMoraux.length > 1) {
		for (let autMoral of auteursMoraux) {
			newItem.institution += ", " + autMoral.innerText;
		}
	}
	else { newItem.institution = auteursMoraux[0].innerText; }
	
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

	for (let tag of tags) {
		newItem.tags.push({ tag: tag.innerText });
	}

	newItem.complete();
}

function scrapeSpeech(doc, url) {
	const titre = text(doc, "h1");
	const auteursString = doc.querySelectorAll(".line-intervenant a");
	const date = text(doc, ".datetime");
	const tags = doc.querySelectorAll(".vp-item-tag");

	let newItem = new Z.Item('presentation');
	newItem.title = titre || "";
	newItem.date = date;
	newItem.url = url;

	for (let aut of auteursString) {
		newItem.creators.push(ZU.cleanAuthor(aut, "author"));
	}

	for (let tag of tags) {
		newItem.tags.push({ tag: tag.innerText });
	}

	newItem.complete();
}



function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h3 > a');
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

async function scrape(doc, url = doc.location.href) {
	const docType = detectWeb(doc, url);
	if (docType == "report") {
		scrapeRapport(doc, url);
	}
	else if (docType == "presentation") {
		scrapeSpeech(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.vie-publique.fr/",
		"detectedItemType": false,
		"items": []
	},
	{
		"type": "web",
		"url": "https://www.vie-publique.fr/rapport/286137-les-outre-mer-dans-la-constitution",
		"items": [
			{
				"itemType": "report",
				"title": "Rapport d'information (...) sur les outre-mer dans la Constitution",
				"creators": [
					{
						"firstName": "Stéphane",
						"lastName": "Artano",
						"creatorType": "author"
					}
				],
				"date": "18 juillet 2022",
				"abstractNote": "Le 29 juin 2022, les membres de la Délégation sénatoriale aux outre-mer et ceux de l'Association des juristes en droit des outre-mer (AJDOM) ont échangé au Sénat sur la situation des outre-mer dans la Constitution et débattu des trajectoires d'avenir pour les territoires concernés.\nCette réunion conjointe s'est déroulée autour de deux tables rondes.\nLa première, consacrée à la Nouvelle-Calédonie, a permis de pointer plusieurs interrogations. Il ressort notamment que la question du corps électoral est sans doute la plus sensible, à la fois politiquement et juridiquement, et qu'il sera très difficile de faire l'impasse sur une révision de la Constitution.\nLa seconde, axée sur les collectivités régies par les articles 73 et 74 de la Constitution, a mis en évidence les défauts et le caractère artificiel de cette dichotomie affichée.",
				"institution": "Sénat. Délégation aux outre-mer",
				"libraryCatalog": "Vie Publique",
				"pages": "67",
				"reportType": "Rapport parlementaire",
				"url": "https://www.vie-publique.fr/rapport/286137-les-outre-mer-dans-la-constitution",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Collectivité d'outre mer"
					},
					{
						"tag": "Collectivités territoriales"
					},
					{
						"tag": "Constitution"
					},
					{
						"tag": "Institutions"
					},
					{
						"tag": "Institutions de l'Etat"
					},
					{
						"tag": "Outre-mer"
					},
					{
						"tag": "Statut juridique"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.vie-publique.fr/recherche?search_api_fulltext=constitution&f%5B0%5D=categories%3Arapport",
		"items": "multiple"
	}
]
/** END TEST CASES **/
