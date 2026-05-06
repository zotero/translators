{
	"translatorID": "a14ac3eb-64a0-4179-970c-92ecc2fec992",
	"label": "Scopus",
	"creator": "Michael Berkowitz, Rintze Zelle and Avram Lyon",
	"target": "^https?://www\\.scopus\\.com/",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-07-29 16:11:13"
}

/*
   Scopus Translator
   Copyright (C) 2008-2021 Center for History and New Media and Sebastian Karcher

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

function detectWeb(doc, url) {
	if (url.includes("/results/") && getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (url.includes("/pages/publications/")) {
		if (!doc.querySelector(".export-dropdown")) {
			// If this element never appears, the user isn't logged in, so export will fail
			Z.monitorDOMChanges(doc.body);
			return false;
		}
		switch (text(doc, '[data-testid="publication-document-type"]').trim()) {
			case 'Book Chapter':
				return 'bookSection';
			case 'Book':
				return 'book';
			default:
				return 'journalArticle';
		}
	}
	return false;
}

function getDocumentID(url) {
	return url.match(/\/publications\/([^?#]+)/)[1];
}

function toEID(documentID) {
	return '2-s2.0-' + documentID;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// Last version added 2025-02-19 -- not clear we need the others still
	var rows = doc.querySelectorAll('tr[id *= resultDataRow] td a[title = "Show document details"], tr[class *= "resultsRow"] h4 a[title = "Show document details"], div.table-title h4 a, div.document-results-list-layout table h3 a');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
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
		if (items) {
			for (let url of Object.keys(items)) {
				await scrape(await requestDocument(url), url);
				await new Promise(resolve => setTimeout(resolve, 500));
			}
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url) {
	const INFO_URL_BASE = "/gateway/doc-details/documents/";
	const EXPORT_URL = "/gateway/export-service/export";

	let documentID = getDocumentID(url);
	let eid = toEID(documentID);
	let infoJSON = await requestJSON(INFO_URL_BASE + eid);

	function parseCreator(json, creatorType) {
		return {
			lastName: json.lastName || "",
			firstName: json.firstName || json.initials || "",
			creatorType,
		};
	}

	// Get full names of creators
	// We'll change these to editors if Scopus returns multiple chapters later
	let creators = infoJSON.authors.map(author => parseCreator(author, "author"));

	try {
		if (infoJSON.source.type == "b") { // Book / book chapter?
			// Get the [other] chapters in the volume
			let chaptersJSON = await requestJSON(INFO_URL_BASE + documentID + "/chapters");
			// If we're looking at a book, just check whether it has chapters with individual authorship.
			// If it does, turn the authors we added above into editors.
			if (infoJSON.type == "bk") {
				if (chaptersJSON.chapters.length) {
					for (let creator of creators) {
						creator.creatorType = "editor";
					}
				}
			}
			// Otherwise, we're looking at a section, so add the editors of the volume
			// and keep the authors added above as the authors of the section
			else {
				let bookEID = toEID(chaptersJSON.book.documentId);
				let bookInfoJSON = await requestJSON(INFO_URL_BASE + bookEID);
				creators.push(...bookInfoJSON.authors.map(author => parseCreator(author, "editor")));
			}
		}
	}
	catch (e) {
		Z.debug(e);
	}

	let body = JSON.stringify({
		eids: [eid],
		fileType: "RIS",
	});
	Z.debug(body);

	let text = await requestText(EXPORT_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body,
	});
	// load translator for RIS
	// Z.debug(text)
	if (/T2 {2}-/.test(text) && /JF {2}-/.test(text)) {
		// SCOPUS RIS mishandles alternate titles and journal titles
		// if both fields are present, T2 is the alternate title and JF the journal title
		text = text.replace(/T2 {2}-/, "N1  -").replace(/JF {2}-/, "T2  -");
	}
	// Scopus places a stray TY right above the DB field
	text = text.replace(/TY.+\nDB/, "DB");
	// Some Journal Articles are oddly SER
	text = text.replace(/TY {2}- SER/, "TY  - JOUR");
	// Z.debug(text)
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
	translator.setString(text);
	translator.setHandler("itemDone", function (obj, item) {
		item.creators = creators;
		item.notes = item.notes.filter(note => !/Export Date:|Source:/.test(note.note));
		item.url = "";
		for (var i = 0; i < item.creators.length; i++) {
			if (item.creators[i].fieldMode == 1 && item.creators[i].lastName.includes(" ")) {
				item.creators[i].firstName = item.creators[i].lastName.match(/\s(.+)/)[1];
				item.creators[i].lastName = item.creators[i].lastName.replace(/\s.+/, "");
				delete item.creators[i].fieldMode;
			}
		}
		item.attachments.push({ document: doc, title: "Snapshot" });
		if (item.ISSN) item.ISSN = ZU.cleanISSN(item.ISSN);
		if (item.ISBN) item.ISBN = ZU.cleanISBN(item.ISBN);
		if (item.itemType == "book") {
			if (item.pages) {
				item.numPages = item.pages;
				delete item.pages;
			}
			if (item.series?.toLowerCase() == item.title.toLowerCase()) {
				delete item.series;
			}
			delete item.publicationTitle;
		}
		if (item.itemType == "bookSection") {
			if (item.publicationTitle && item.bookTitle) {
				delete item.publicationTitle; // Abbreviated
			}
		}
		if (item.itemType == "book" || item.itemType == "bookSection") {
			delete item.journalAbbreviation;
		}
		if (item.archive == "Scopus") {
			delete item.archive;
		}
		item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.scopus.com/results/results.uri?st1=test&st2=&s=TITLE-ABS-KEY%28test%29&limit=10&origin=searchbasic&sort=plf-f&src=s&sot=b&sdt=b&sessionSearchId=7592dbac900a5db70fa6b88f939cfd9e",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.scopus.com/pages/publications/105010060351",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Sideways exit during crowding utilises natural salmon behaviour for easier transfer",
				"creators": [
					{
						"lastName": "Warren-Myers",
						"firstName": "F.",
						"creatorType": "author"
					},
					{
						"lastName": "Folkedal",
						"firstName": "O.",
						"creatorType": "author"
					},
					{
						"lastName": "Nola",
						"firstName": "V.",
						"creatorType": "author"
					},
					{
						"lastName": "Oppedal",
						"firstName": "F.",
						"creatorType": "author"
					}
				],
				"date": "2026",
				"DOI": "10.1016/j.aquaculture.2025.742939",
				"ISSN": "0044-8486",
				"abstractNote": "Efficient crowding of fish in sea cages for the purpose of transferring them to fasting, treatments or slaughter, is critical for insuring fish are moved quickly with minimal stress. With the development of larger offshore cages holding millions of fish and/or submerged cage salmon aquaculture, extraction of fish will potentially be more difficult. Particularly if farmers seek to remove portions of the biomass at a time without lifting cages to the surface. Using salmon innate swimming behaviours may aid to develop innovative, simple, welfare-friendly removal methods. Here we investigate whether the direction of crowding in a submerged cage influences the exit behaviour of salmon when extracted at depth for the purpose of pumping to a well-boat or otherwise. Using replicates of 46 large (∼4.3 kg) or 128 small (∼1.3 kg) Atlantic salmon and a prototype submerged cube cage (27 m3) fitted with a movable wall, we test to see if crowding salmon towards a 50 cm diameter circular opening in either the top, side, or bottom of the cage influences fish exit rate. Our results show that when crowding fish by incrementally reducing the cage volume by a factor of 12 over 25 mins, for both fish sizes ∼80 % of fish exited the cage via sideways crowding, whereas only 20 to 50 % exited by top up or bottom down crowding directions. Furthermore, maximum relative fish densities reached during crowding tests were almost halved for sidewards crowding (37–43 kg m−3) compared to downwards or upwards crowding directions (59–73 kg m−3). We conclude that fish visualization of the exit hole and their natural circular swimming behaviour favoured sideways extraction. Hence, with a sea cage design that enables sideways crowding, it may be possible to extract fish quickly with minimal stress, and without needing to raise cages to the surface. © 2025 The Authors",
				"journalAbbreviation": "Aquaculture",
				"language": "English",
				"libraryCatalog": "Scopus",
				"publicationTitle": "Aquaculture",
				"volume": "610",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Crowding"
					},
					{
						"tag": "Pumping"
					},
					{
						"tag": "Submergence"
					},
					{
						"tag": "Welfare"
					},
					{
						"tag": "Well boat"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.scopus.com/pages/publications/105011138038",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "Advanced materials for next-generation technologies: Challenges and new prospects",
				"creators": [
					{
						"lastName": "Kulkarni",
						"firstName": "Shrikaant",
						"creatorType": "editor"
					},
					{
						"lastName": "Srivastava",
						"firstName": "Vipul",
						"creatorType": "editor"
					},
					{
						"lastName": "Khenata",
						"firstName": "Rabah",
						"creatorType": "editor"
					},
					{
						"lastName": "Al-Douri",
						"firstName": "Yarub",
						"creatorType": "editor"
					}
				],
				"date": "2025",
				"ISBN": "9781003558712",
				"abstractNote": "Advanced materials exhibiting novel properties with increased functionality are the future of technology. These materials have the potential to improve people's quality of life as well as to make affordable sustainable materials a reality. This new book, Advanced Materials for Next-Generation Technologies: Challenges and New Prospects, presents an enlightening insight into the advances in materials with special reference to their structure, physical behaviors, and applications. This book sheds light on the organizational and orientational order of the atoms responsible for characteristics and distinct architectures in these materials. It also discusses how the materials can be maneuvered for attaining structural optimality. It explores novel materials for new technologies that make use of their interesting and exciting properties, such as electronic band structure, band gap, half-metallicity, multi-feroic behavior, piezoelectricity, thermoelectricity, thermodynamics, optoelectronic behavior, and more. The book details novel materials for applications in frontier areas, discussing perovskites as promising materials for the future technology. It also discusses synthesis protocols for the design and development of some novel materials, spinel material synthesis and its structural analysis, green synthesis of metal oxides, etc. The book explores the property profiles of the materials for behavioral change, discussing materials such as ZnO nanostructures, ternary iron arsenide CaFe2As2, Cs-based halide double perovskites etc., and presenting a comprehensive pool of information on the latest advancements in this growing field. The book will be of interest to researchers, academicians, and scientists in the field of materials science and technology, computational physics, industrial technology, and related fields. © 2025 by Apple Academic Press, Inc. All rights reserved.",
				"language": "English",
				"libraryCatalog": "Scopus",
				"numPages": "296",
				"publisher": "Apple Academic Press",
				"shortTitle": "Advanced materials for next-generation technologies",
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
		"url": "https://www.scopus.com/pages/publications/105011137962",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Perovskite materials for photovoltaic applications",
				"creators": [
					{
						"lastName": "Sharma",
						"firstName": "Amit Kumar",
						"creatorType": "author"
					},
					{
						"lastName": "Prasher",
						"firstName": "Sangeeta",
						"creatorType": "author"
					},
					{
						"lastName": "Kumar",
						"firstName": "Mukesh",
						"creatorType": "author"
					},
					{
						"lastName": "Kulkarni",
						"firstName": "Shrikaant",
						"creatorType": "editor"
					},
					{
						"lastName": "Srivastava",
						"firstName": "Vipul",
						"creatorType": "editor"
					},
					{
						"lastName": "Khenata",
						"firstName": "Rabah",
						"creatorType": "editor"
					},
					{
						"lastName": "Al-Douri",
						"firstName": "Yarub",
						"creatorType": "editor"
					}
				],
				"date": "2025",
				"ISBN": "9781003558712",
				"abstractNote": "Natural abundant perovskite material has centered material scientist's attention on future technologies. The properties of these materials aligned and advanced research in superconductivity, energy storage, photovoltaics, lasers, sensors, and many other fields. This chapter is focussed on the photovoltaic applications of perovskite materials due to their efficient light-absorbing power. Perovskites are cheap and simple to synthesize in comparison to traditional photovoltaic materials available in the market. Perovskite materials based solar cells are advancing very rapidly and approaching power conversion efficiency more than 25% due to remarkable intrinsic electrical and optical properties like long charge carrier lifetimes, energy band gap tunability, remarkable charge carrier mobilities, tolerance against high defects, high absorption coefficient, small binding energy of excitons, and large diffusion lengths of charge carriers. Despite all of these materials' favorable characteristics for future solar technology, instability and degradation pose the biggest obstacles to their commercialization. Moreover, perovskite-based photovoltaic technology is advancing steadily toward commercialization. © 2025 Apple Academic Press, Inc. All rights reserved.",
				"bookTitle": "Advanced Materials for Next-Generation Technologies: Challenges and New Prospects",
				"language": "English",
				"libraryCatalog": "Scopus",
				"pages": "109-126",
				"publisher": "Apple Academic Press",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Charge carriers"
					},
					{
						"tag": "Lead toxicity"
					},
					{
						"tag": "Optical properties"
					},
					{
						"tag": "Perovskite materials"
					},
					{
						"tag": "Photovoltaic technology"
					},
					{
						"tag": "Stability"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
