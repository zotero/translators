{
	"translatorID": "0526c18d-8dc8-40c9-8314-399e0b743a4d",
	"label": "Dagstuhl Research Online Publication Server",
	"creator": "Philipp Zumstein",
	"target": "^https?://(www\\.)?drops\\.dagstuhl\\.de/",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-07-19 19:20:18"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2016-2025 Philipp Zumstein and Zotero contributors

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
	if (url.includes('/entities/document/')) {
		let bibtexEntry = text(doc, 'pre.bibtex');
		if (bibtexEntry.includes("@InCollection")) {
			return "bookSection";
		}
		if (bibtexEntry.includes("@Article")) {
			return "journalArticle";
		}
		return "conferencePaper";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}

	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a[href*="/entities/document/"]');
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
	if (detectWeb(doc, url) == "multiple") {
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

async function scrape(doc, _url = doc.location.href) {
	let bibtexEntry = text(doc, 'pre.bibtex');
	let pdfUrl = attr(doc, 'meta[name="citation_pdf_url"]', 'content');
	// One more try in case the meta tag didn't work, there are other tags with the PDF link
	if (!pdfUrl) {
		Z.debug("PDF URL extraction from the meta tag failed, trying other sources.");
		pdfUrl = attr(doc, 'section.files a[href$=".pdf"]', 'href');
	}

	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
	translator.setString(bibtexEntry);
	translator.setHandler("itemDone", function (obj, item) {
		// If a note is just a list of keywords, then save them as tags
		// and delete this note
		for (var i = 0; i < item.notes.length; i++) {
			var note = item.notes[i].note;
			if (note.includes('Keywords:')) {
				note = note.replace('<p>', '').replace('</p>', '').replace('Keywords:', '');
				var keywords = note.split(',');
				for (var j = 0; j < keywords.length; j++) {
					item.tags.push(keywords[j].trim());
				}
				item.notes.splice(i, 1);
			}
		}

		item.attachments.push({
			title: "Snapshot",
			document: doc
		});

		if (pdfUrl) {
			item.attachments.push({
				url: pdfUrl,
				title: "Full Text PDF",
				mimeType: "application/pdf"
			});
		}

		item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.STACS.2015.1",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Overcoming Intractability in Unsupervised Learning",
				"creators": [
					{
						"firstName": "Sanjeev",
						"lastName": "Arora",
						"creatorType": "author"
					},
					{
						"firstName": "Ernst W.",
						"lastName": "Mayr",
						"creatorType": "editor"
					},
					{
						"firstName": "Nicolas",
						"lastName": "Ollinger",
						"creatorType": "editor"
					}
				],
				"date": "2015",
				"DOI": "10.4230/LIPIcs.STACS.2015.1",
				"ISBN": "9783939897781",
				"itemID": "arora:LIPIcs.STACS.2015.1",
				"libraryCatalog": "Dagstuhl Research Online Publication Server",
				"pages": "1–1",
				"place": "Dagstuhl, Germany",
				"proceedingsTitle": "32nd International Symposium on Theoretical Aspects of Computer Science (STACS 2015)",
				"publisher": "Schloss Dagstuhl – Leibniz-Zentrum für Informatik",
				"series": "Leibniz International Proceedings in Informatics (LIPIcs)",
				"url": "https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.STACS.2015.1",
				"volume": "30",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					"NP-hardness",
					"intractability",
					"machine learning",
					"unsupervised learning"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://drops.dagstuhl.de/entities/volume/LIPIcs-volume-30",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://drops.dagstuhl.de/search?term=Hauzar%2C%20David",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.SoCG.2016.41",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "The Planar Tree Packing Theorem",
				"creators": [
					{
						"firstName": "Markus",
						"lastName": "Geyer",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Hoffmann",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Kaufmann",
						"creatorType": "author"
					},
					{
						"firstName": "Vincent",
						"lastName": "Kusters",
						"creatorType": "author"
					},
					{
						"firstName": "Csaba",
						"lastName": "Tóth",
						"creatorType": "author"
					},
					{
						"firstName": "Sándor",
						"lastName": "Fekete",
						"creatorType": "editor"
					},
					{
						"firstName": "Anna",
						"lastName": "Lubiw",
						"creatorType": "editor"
					}
				],
				"date": "2016",
				"DOI": "10.4230/LIPIcs.SoCG.2016.41",
				"ISBN": "9783959770095",
				"itemID": "geyer_et_al:LIPIcs.SoCG.2016.41",
				"libraryCatalog": "Dagstuhl Research Online Publication Server",
				"pages": "41:1–41:15",
				"place": "Dagstuhl, Germany",
				"proceedingsTitle": "32nd International Symposium on Computational Geometry (SoCG 2016)",
				"publisher": "Schloss Dagstuhl – Leibniz-Zentrum für Informatik",
				"series": "Leibniz International Proceedings in Informatics (LIPIcs)",
				"url": "https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.SoCG.2016.41",
				"volume": "51",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					"graph drawing",
					"graph packin",
					"planar graph",
					"simultaneous embedding"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
