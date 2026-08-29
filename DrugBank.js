{
	"translatorID": "b2a735f3-11ac-4e9f-b22b-00e1b1d3c9f6",
	"label": "DrugBank",
	"creator": "Tom Hodder <tom@limepepper.co.uk> and contributors",
	"target": "^https://go\\.drugbank\\.com/",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-10-28 15:29:51"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Tom Hodder <tom@limepepper.co.uk>, Zoë C. Ma, and
	contributors

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
	if (isDrugBankEntry(url)) {
		return 'encyclopediaArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	let urlObj = new URL(doc.location.href);
	let searchKind = urlObj.pathname.split("/")[1];
	let rowSelector;
	switch (searchKind) {
		case "indications": // don't include inactive tabs (otherwise too long)
			rowSelector = ".active .table tbody tr";
			break;
		// Molecular structure search or biochemical entity; just take table
		case "structures":
		case "spectra":
		case "bio_entities":
		case "reactions":
			rowSelector = ".table tbody tr";
			break;
		// This works around the overwriting by the "details" button
		case "classyfication": // sic
			rowSelector = ".table tbody tr td:nth-child(1) a[href^='/drugs/DB']";
			break;
		default:
			rowSelector = "a[href^='/drugs/DB']";
	}

	var items = {};
	var found = false;
	var rows = doc.querySelectorAll(rowSelector);
	for (let row of rows) {
		let href, title;

		switch (searchKind) {
			case "bio_entities":
			case "indications":
			case "spectra":
				[href, title] = getFirstTwoColumns(row);
				break;
			case "structures":
				[href, title] = getMoleculeColumns(row);
				break;
			case "reactions":
				[href, title] = getReactions(row);
				break;
			default: {
				href = row.href;
				title = ZU.trimInternal(row.textContent.trim());
			}
		}

		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

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

async function scrape(doc, url = doc.location.href) {
	let item = new Z.Item("encyclopediaArticle");

	item.encyclopediaTitle = "DrugBank Online";

	item.title = text(doc, "main h1");

	let abstract = ZU.trimInternal(attr(doc, "meta[name='description']", "content"));
	if (abstract) {
		item.abstractNote = abstract;
	}

	let itemURL = attr(doc, "link[rel='canonical']", "href");
	if (!itemURL) {
		let urlObj = new URL(url);
		itemURL = urlObj.origin + urlObj.pathname;
	}
	if (itemURL) {
		item.url = itemURL;
	}

	let extras = [];
	let dbIDMatch = item.url.match(/^https:\/\/[^/]+\/drugs\/(DB\d+)/);
	if (dbIDMatch) {
		extras.push(`DrugBank Accession Number: ${dbIDMatch[1]}`);
	}

	let dateLine = ZU.trimInternal(text(doc, "#drug-meta"));
	// Prefer updated date; fall back to creation date. Date in Month dd, yyyy
	let dateMatch = dateLine.match(/\bupdated at (\w+\s+\d+,\s+\d+)/i);
	let creationDateMatch = dateLine.match(/\bcreated at (\w+\s+\d+,\s+\d+)/i);
	if (dateMatch) {
		item.date = ZU.strToISO(dateMatch[1]);
		if (creationDateMatch) {
			extras.push(`Original Date: ${ZU.strToISO(creationDateMatch[1])}`);
		}
	}
	else if (creationDateMatch) {
		item.date = ZU.strToISO(creationDateMatch[1]);
	}

	item.extra = extras.join("\n");

	item.language = "en";

	// Snapshot because the content may be updated frequently
	item.attachments.push(
		{
			title: "Snapshot",
			document: doc,
			mimeType: "text/html",
		}
	);

	item.complete();
}

// Convenient function to test whether a URL path points to a DB entry (drug,
// drug reaction, protein, etc.)
function isDrugBankEntry(url) {
	return /^\/(drugs|products|polypeptides|metabolites|reactions)\/.+/.test(url.replace(/^https:\/\/go\.drugbank\.com/, ""));
}

// Extract drug link and drug name from molecular structure search (menu item
// "Chemical Structure" and "Molecular Weight").
function getMoleculeColumns(row) {
	let href = attr(row, "td a[href^='/drugs/DB']", "href");
	let title = text(row, ".search-hit-info strong");
	return [href, title];
}

// Extract drug link and name by looking at first two columns of table row
// (suitable for indications search and search by spectral properties)
function getFirstTwoColumns(row) {
	let href = attr(row, "td a[href^='/drugs/DB']", "href");
	let title = text(row, "td:nth-child(2)");
	return [href, title];
}

function getReactions(row) {
	let href = attr(row, "td a[href^='/reactions/']", "href");
	let substrate = text(row, "td:nth-child(1) a");
	let product = text(row, "td:nth-child(4) a");
	return [href, `${substrate} → ${product}`];
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://go.drugbank.com/drugs/DB00381",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Amlodipine",
				"creators": [],
				"date": "2023-08-21",
				"abstractNote": "Amlodipine is a calcium channel blocker used to treat hypertension and angina.",
				"encyclopediaTitle": "DrugBank Online",
				"extra": "DrugBank Accession Number: DB00381\nOriginal Date: 2005-06-13",
				"language": "en",
				"libraryCatalog": "DrugBank",
				"url": "https://go.drugbank.com/drugs/DB00381",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://go.drugbank.com/drugs/DB00599#enzymes",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Thiopental",
				"creators": [],
				"date": "2023-08-21",
				"abstractNote": "Thiopental is a barbiturate used to induce general anesthesia, treat convulsions, and reduce intracranial pressure.",
				"encyclopediaTitle": "DrugBank Online",
				"extra": "DrugBank Accession Number: DB00599\nOriginal Date: 2005-06-13",
				"language": "en",
				"libraryCatalog": "DrugBank",
				"url": "https://go.drugbank.com/drugs/DB00599",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://go.drugbank.com/drugs/DB01323#pharmacoeconomics",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "St. John's Wort",
				"creators": [],
				"date": "2023-08-21",
				"abstractNote": "St. John's Wort is an herbal ingredient used in non-prescription therapeutic products for the short-term treatment of minor skin irritations, insomnia, depression, and anxiety.",
				"encyclopediaTitle": "DrugBank Online",
				"extra": "DrugBank Accession Number: DB01323\nOriginal Date: 2007-06-30",
				"language": "en",
				"libraryCatalog": "DrugBank",
				"url": "https://go.drugbank.com/drugs/DB01323",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://go.drugbank.com/reactions?approved=0&nutraceutical=0&illicit=0&investigational=0&withdrawn=0&experimental=0&us=0&ca=0&eu=0&commit=Apply+Filter&q%5Bsubstrate%5D=Fluoxetine&q%5Benzyme%5D=&q%5Bproduct%5D=",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://go.drugbank.com/reactions/2180",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Reaction: (R)-Fluoxetine to 1 product",
				"creators": [],
				"encyclopediaTitle": "DrugBank Online",
				"language": "en",
				"libraryCatalog": "DrugBank",
				"shortTitle": "Reaction",
				"url": "https://go.drugbank.com/reactions/2180",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://go.drugbank.com/metabolites/DBMET00225",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Metabolite (+)-3-Methoxymorphinan",
				"creators": [],
				"encyclopediaTitle": "DrugBank Online",
				"language": "en",
				"libraryCatalog": "DrugBank",
				"url": "https://go.drugbank.com/metabolites/DBMET00225",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://go.drugbank.com/polypeptides/Q13936",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Voltage-dependent L-type calcium channel subunit alpha-1C",
				"creators": [],
				"encyclopediaTitle": "DrugBank Online",
				"language": "en",
				"libraryCatalog": "DrugBank",
				"url": "https://go.drugbank.com/polypeptides/Q13936",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://go.drugbank.com/products/Norvasc",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Norvasc",
				"creators": [],
				"abstractNote": "Norvasc is a prescription dihydropyridine calcium channel blocker available in multiple countries including the United States, Canada, and Italy. It was first marketed in 1992. It is available in an Oral Tablet. It contains one active ingredient: [Amlodipine], in its salt form Amlodipine besylate. [Amlodipine] is a heart medication used to treat high blood pressure and chest pain caused by heart disease.",
				"encyclopediaTitle": "DrugBank Online",
				"language": "en",
				"libraryCatalog": "DrugBank",
				"url": "https://go.drugbank.com/products/Norvasc",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://go.drugbank.com/structures/search/small_molecule_drugs/mass?query_from=100&query_to=200&filters%5Bdrug_groups%5D%5Bapproved%5D=on&commit=Search#results",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://go.drugbank.com/bio_entities/BE0002363",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://go.drugbank.com/categories/DBCAT002772",
		"items": "multiple"
	}
]
/** END TEST CASES **/
