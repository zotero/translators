{
	"translatorID": "8e451b8f-49d6-47d0-8f97-9c10b66e17bc",
	"label": "Eerste Kamer der Staten-Generaal",
	"creator": "Martijn Staal",
	"target": "https://www\\.eerstekamer\\.nl",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-06-18 14:47:59"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2023 Martijn Staal
	
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
	Notes on used document types:
	hearing: for Handelingen (are there other meeting reports?)
	document: any Kamerstuk that is not a proposed piece of legislation, any Bijlage for a Kamerstuk
	bill: any Voorstel van wet or Gewijzigd voorstel van wet (proposed legislation)
	statute: any Staatsblad publication
 */

function detectWeb(doc, url) {
	Zotero.debug("Detecting url: " + url);
	if (url.includes('/wetsvoorstel/')) {
		// An overview page for any wetsvoorstel
		// e.g. https://www.eerstekamer.nl/wetsvoorstel/36217_uitbreiding
		return 'multiple';
	}
	else if (url.includes('/behandeling/') && url.includes('/info')) {
		// Overview page for any document related to a wetsvoorstel. Might have attachments
		if (url.includes('voorstel_van_wet')) {
			return 'bill';
		} else {
			// Any other document in a Kamerdossier
			// optionally has attachments, e.g. https://www.eerstekamer.nl/behandeling/20221003/memorie_van_toelichting_2/info
			return 'document';
		}
	}
	else if (url.includes('/behandeling/') && !url.includes('/info') && url.includes('.pdf')) {
		if (url.includes('voorstel_van_wet')) {
			return 'bill';
		} else {
			// Any other document in a Kamerdossier
			// optionally has attachments, e.g. https://www.eerstekamer.nl/behandeling/20221003/memorie_van_toelichting_2/info
			return 'document';
		}
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	if (doc.URL.includes('/wetsvoorstel/')) {
		return getSearchResultsWetsvoorstel(doc, checkOnly);
	} else {
		return false;
	}
}

function getSearchResultsWetsvoorstel(doc, checkOnly) {
	// for overview pages for a single bill, e.g. https://www.eerstekamer.nl/wetsvoorstel/36217_uitbreiding
	var items = {};
	var found = false;

	var rows = doc.querySelectorAll("div[class='behandeling'] li[class='grid-x nowr'] a");

	for (let row of rows) {
		let href = row.href;
		let title = row.textContent.replace('PDF-document', '');

		if (!href || !title) continue;
		if (href.includes("/korteaantekening/")) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}

	return found ? items : false;
}

async function doWeb(doc, url) {
	Zotero.debug("doWeb url:" + url);
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		Zotero.debug("found items: " + items);
		if (!items) return;
		for (let url of Object.keys(items)) {
			Zotero.debug(url);
			doc = await requestDocument(url);
			await scrape(await requestDocument(url), url);
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url) {
	Zotero.debug("scraping url: " + url);
	if (url.includes("/behandeling/") && url.includes(".pdf")) {
		Zotero.debug("Found direct PDF link, requesting info page");
		info_url = url.replace(/document3.*/, 'info');
		Zotero.debug("Generated info url" + info_url + " from url " + url);
		newdoc = await requestDocument(info_url);
		await scrapeWetsvoorstelInfo(newdoc, info_url);
	}
	else if (url.includes('/behandeling/') && url.includes('/info')) {
		await scrapeWetsvoorstelInfo(doc, url);
	}

	return;
}

async function scrapeWetsvoorstelInfo(doc, url) {
	// Scrape overview pages
	// e.g. https://www.eerstekamer.nl/behandeling/20221003/memorie_van_toelichting_2/info
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		// TODO adjust if needed:
		item.date = doc.querySelector("div[class='pubdate']").textContent;
		item.language = "nl-NL";
		item.title = correctTitle(doc.querySelector("meta[property='og:title']").content);

		main_document_pdf_url = doc.querySelector("div[id='main_content_wrapper'] div[class='seriekeuze'] a[title]").href;
		attachment_infos = getSearchResultsWetsvoorstel(doc, false); // incidentally, this one works for these pages as well

		var attachments = [
			{
				url: main_document_pdf_url,
				title: item.title,
				mimeType: "application/pdf"
			}
		];

		for (const [att_url, att_title] of Object.entries(attachment_infos)) {
			attachments.push({
				url: att_url.replace("meta", "document"),
				title: att_title,
				mimeType: "application/pdf"
			})
		}

		item.attachments = attachments;
		item.libraryCatalog = "Eerste Kamer der Staten-Generaal"

		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'document';
	await em.doWeb(doc, url);
}

function correctTitle(name) {
	// By default the titles of each Kamerstuk start with the name of the bill, and then afterwards
	// the name of the specific document. Since bill names can be quite long, it is more practical to
	// switch these around. Luckily, they are separated by a semicolon.
	// e.g.: "Uitbreiding sluitingsbevoegdheid burgemeester en gezaghebber ter handhaving van de openbare orde (36.217); Memorie van toelichting (TK, 3)"

	splitTitle = name.split("; ");
	return (splitTitle[1] + "; " + splitTitle[0]);
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.eerstekamer.nl/wetsvoorstel/36217_uitbreiding",
		"detectedItemType": "multiple",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.eerstekamer.nl/behandeling/20221003/memorie_van_toelichting_2/info",
		"detectedItemType": "document",
		"items": [
			{
				"itemType": "document",
				"title": "Uitbreiding sluitingsbevoegdheid burgemeester en gezaghebber ter handhaving van de openbare orde (36.217); Memorie van toelichting (TK, 3)",
				"creators": [],
				"date": "3 oktober 2022",
				"language": "nl-NL",
				"libraryCatalog": "Eerste Kamer der Staten-Generaal",
				"url": "https://www.eerstekamer.nl/behandeling/20221003/memorie_van_toelichting_2/info",
				"attachments": [
					{
						"title": "Uitbreiding sluitingsbevoegdheid burgemeester en gezaghebber ter handhaving van de openbare orde (36.217); Memorie van toelichting (TK, 3)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Advies ATR",
						"mimeType": "application/pdf"
					},
					{
						"title": "Advies Aedes",
						"mimeType": "application/pdf"
					},
					{
						"title": "Advies Gemeente Leeuwaarden",
						"mimeType": "application/pdf"
					},
					{
						"title": "Advies NVvR",
						"mimeType": "application/pdf"
					},
					{
						"title": "Advies Nederlands genootschap van burgemeesters",
						"mimeType": "application/pdf"
					},
					{
						"title": "Advies Nijmegen",
						"mimeType": "application/pdf"
					},
					{
						"title": "Advies OM",
						"mimeType": "application/pdf"
					},
					{
						"title": "Advies Politie",
						"mimeType": "application/pdf"
					},
					{
						"title": "Advies Rotterdam en Amsterdam",
						"mimeType": "application/pdf"
					},
					{
						"title": "Advies Rvdr",
						"mimeType": "application/pdf"
					},
					{
						"title": "Advies Stichting Stadlander",
						"mimeType": "application/pdf"
					},
					{
						"title": "Advies VGM NL",
						"mimeType": "application/pdf"
					},
					{
						"title": "Advies VNG",
						"mimeType": "application/pdf"
					},
					{
						"title": "Advies advocaat",
						"mimeType": "application/pdf"
					},
					{
						"title": "Advies hoofddocent",
						"mimeType": "application/pdf"
					},
					{
						"title": "Advies particulier 1",
						"mimeType": "application/pdf"
					},
					{
						"title": "Advies particulier 2",
						"mimeType": "application/pdf"
					},
					{
						"title": "Advies particulier 3",
						"mimeType": "application/pdf"
					},
					{
						"title": "Advies particulier 4",
						"mimeType": "application/pdf"
					},
					{
						"title": "Advies particulier 5",
						"mimeType": "application/pdf"
					},
					{
						"title": "Beslisnota wetsvoorstel sluitingsbevoegdheid burgemeester",
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
		"url": "https://www.eerstekamer.nl/behandeling/20221003/voorstel_van_wet_2/info",
		"detectedItemType": "bill",
		"items": [
			{
				"itemType": "document",
				"title": "voorstel van wet  (TK, 2); Uitbreiding sluitingsbevoegdheid burgemeester en gezaghebber ter handhaving van de openbare orde (36.217)",
				"creators": [],
				"date": "3 oktober 2022",
				"language": "nl-NL",
				"libraryCatalog": "Eerste Kamer der Staten-Generaal",
				"url": "https://www.eerstekamer.nl/behandeling/20221003/voorstel_van_wet_2/info",
				"attachments": [
					{
						"title": "voorstel van wet  (TK, 2); Uitbreiding sluitingsbevoegdheid burgemeester en gezaghebber ter handhaving van de openbare orde (36.217)",
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
