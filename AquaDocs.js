{
	"translatorID": "97b65138-71b7-424f-b305-4a2161e90661",
	"label": "AquaDocs",
	"creator": "Sebastian Karcher",
	"target": "^https?://aquadocs\\.org/(handle|discover|browse)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-08-24 02:41:29"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Sebastian Karcher

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
	if (url.includes('/handle/') && attr(doc, 'meta[name="DC.type"]', 'content')) {
		let type = attr(doc, 'meta[name="DC.type"]', 'content');
		// Z.debug(type);
		return getType(type);
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.main-content .description-content a');
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
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(url);
		}
	}
	else {
		await scrape(url);
	}
}

function getType(string) {
	string = string.toLowerCase();
	if (string.includes("book_section") || string.includes("chapter")) {
		return "bookSection";
	}
	else if (string.includes("book") || string.includes("monograph")) {
		return "book";
	}
	else if (string.includes("report")) {
		return "report";
	}
	else if (string.includes("proceedings") || string.includes("conference")) {
		return "conferencePaper";
	}
	else {
		return "journalArticle"; // default -- most of the catalog
	}
}

async function scrape(url) {
	let xmlURL = url.replace("/handle/", "/metadata/handle/").replace(/[?#].*$/, "") + "/mets.xml";
	// Z.debug(xmlURL);
	let xmlText = await requestText(xmlURL);
	// Z.debug(xmlText)
	let translator = Zotero.loadTranslator('import');
	translator.setTranslator('2c05e2d1-a533-448f-aa20-e919584864cb'); // DIM
	translator.setString(xmlText);
	translator.setHandler('itemDone', (_obj, item) => {
		for (let attachment of item.attachments) {
			if (attachment.url && !attachment.url.startsWith("http")) {
				attachment.url = "https://aquadocs.org" + attachment.url;
			}
		}
		item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://aquadocs.org/handle/1834/42391",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Upwelling phenomenon in the marine regions of Southern Central of Vietnam: a review",
				"creators": [
					{
						"firstName": "Hong Long",
						"lastName": "Bui",
						"creatorType": "author"
					},
					{
						"firstName": "Minh Thu",
						"lastName": "Phan",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"ISSN": "1859-3097",
				"abstractNote": "Upwelling is an oceanographic phenomenon that involves the physical process and contributes to changes in chemistry, biology, and natural resources. So, systematically, it is the particular ecosystems of whole marine regions with the upwelling. The strong upwelling waters in South Central Regions of Vietnam have uncertain features of the East Vietnam Sea (Bien Dong) and special characteristics of a coastal upwelling area, recorded in international scientific papers in the twentieth century. Their first signals were discovered in the early 1930s through conceptual ideas. The upwelling phenomenon is officially confirmed by scientific results of marine investigations of the NAGA Expedition (1959–1961). The paper aims to review and discuss the physical from Vietnamese investigation and results since 1990s. The following factors are the most contributing to forming and developing the strong upwelling in Southern Central Waters: (1) Influence scale (Mezo- and micro-scale); (2) Forming causes and developing mechanism of upwelling phenomenon, such as monsoon, morphography, shoreline, and western boundary current system of the East Vietnam Sea; (3) Influence of the water-mass from Mekong River on the upwelling area; (4) Ecological environmental consequences; (5) Impacts of the atmospheric-oceanic interaction processes on the western EVS on upwelling. Additionally, the review has targeted findings of upwelling phenomenon mainly in Vietnamese waters based on remote sensing analysis and reanalysis data series to simulate their forming, mechanizing, fluctuating models and the impacts of upwelling in the EVS on resources and ecosystems. The coupled atmosphere-ocean models resulted the upwelling mechanisms and formation. The long-time series of upwelling phenomenon (Macroscale) were evaluated by remote sensing and reanalyzed data series. It is also providing the supplementing and detailing causes and mechanisms of upwelling formation; impacts and interactions of upwelling on marine physics and hydrodynamics (ocean vortexes, seawater temperature), biochemical (nutrients, plankton organisms), and resources (fish, seafood). Within the framework of strong upwelling waters in the Southern Central Regions (Vietnam), the review has not only mentioned partly clarified scientific results but also indicates the limitations and challenges which were faced and encountered in the forecasters of upwelling phenomena in the future.",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "AquaDocs",
				"pages": "103-122",
				"publicationTitle": "Vietnam of Journal Marine Science and Technology",
				"shortTitle": "Upwelling phenomenon in the marine regions of Southern Central of Vietnam",
				"url": "http://hdl.handle.net/1834/42391",
				"volume": "22",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Natural resources"
					},
					{
						"tag": "Upwelling phenomenon"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://aquadocs.org/handle/1834/20117?show=full",
		"items": [
			{
				"itemType": "book",
				"title": "M/V CONNECTED Coral Reef Restoration Monitoring Report, Monitoring Events 2004-2005. Florida Keys National Marine Sanctuary Monroe County, Florida",
				"creators": [
					{
						"firstName": "Joe",
						"lastName": "Schittone",
						"creatorType": "author"
					},
					{
						"firstName": "Erik C.",
						"lastName": "Franklin",
						"creatorType": "author"
					},
					{
						"firstName": "J. Harold",
						"lastName": "Hudson",
						"creatorType": "author"
					},
					{
						"firstName": "Jeff",
						"lastName": "Anderson",
						"creatorType": "author"
					}
				],
				"date": "2006",
				"abstractNote": "This document presents the results of the monitoring of a repaired coral reef injured by the M/V Connected vessel grounding incident of March 27, 2001. This groundingoccurred in Florida state waters within the boundaries of the Florida Keys National Marine Sanctuary (FKNMS). The National Oceanic and Atmospheric Administration (NOAA) and the Board of Trustees of the Internal Improvement Trust Fund of the State of Florida, (“State of Florida” or “state”) are the co-trustees for the natural resourceswithin the FKNMS and, thus, are responsible for mediating the restoration of the damaged marine resources and monitoring the outcome of the restoration actions. Therestoration monitoring program tracks patterns of biological recovery, determines the success of restoration measures, and assesses the resiliency to environmental andanthropogenic disturbances of the site over time.The monitoring program at the Connected site was to have included an assessment of the structural stability of installed restoration modules and biological condition of reattached corals performed on the following schedule: immediately (i.e., baseline), 1, 3, and 6 years after restoration and following a catastrophic event. Restoration of this site was completed on July 20, 2001. Due to unavoidable delays in the settlement of the case, the“baseline” monitoring event for this site occurred in July 2004. The catastrophic monitoring event occurred on August 31, 2004, some 2 ½ weeks after the passage of Hurricane Charley which passed nearby, almost directly over the Dry Tortugas. In September 2005, the year one monitoring event occurred shortly after the passage of Hurricane Katrina, some 70 km to the NW. This report presents the results of all three monitoring events. (PDF contains 37 pages.)",
				"language": "en",
				"libraryCatalog": "AquaDocs",
				"place": "Silver Spring, MD",
				"publisher": "NOAA/National Ocean Service/National Marine Sanctuary Program",
				"series": "Marine Sanctuaries Conservation Series",
				"url": "http://hdl.handle.net/1834/20117",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Acropora palmata"
					},
					{
						"tag": "Coral"
					},
					{
						"tag": "Ecology"
					},
					{
						"tag": "Environment"
					},
					{
						"tag": "Florida Keys National Marine Sanctuary"
					},
					{
						"tag": "Grounding"
					},
					{
						"tag": "Hurricane Charley"
					},
					{
						"tag": "Hurricane Katrina"
					},
					{
						"tag": "Management"
					},
					{
						"tag": "Monitoring"
					},
					{
						"tag": "Restoration"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://aquadocs.org/discover",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://aquadocs.org/browse?type=subject&value=A.+gueldenstaedtii",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://aquadocs.org/handle/1834/30052?show=full",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Ecological Attribute Alteration: Measurement and Evaluation: Activity Assessment Routine: Ecological Systems Component, Ecological Systems Component Handbook",
				"creators": [],
				"date": "1978-08",
				"abstractNote": "This technical paper is intended to provide a more complete treatment of implicit principles and assumptions contained in the user's manual for the ecological systems component of the activity assessment routine. The ecological systems component (ESC) defines a method for evaluating changes in an ecosystem which may result from resource use and consumption. This paper begins by characterizing an ecosystem as an organized collection of attributes mutually dependent on energy exchange. The magnitude matrix with which altered energy flows are scaled is described in Chapter 4. The magnitude of an alteration is assessed somewhat differently for the two categories of attributes: discussion of conventions relevant to this distinction is provided in Chapter 5. However, effects on attributes are variable through time, and additional remarks concerning duration are included in Chapter 6. Finally, possible exceptions to the general guidelines for designating the direction of an effect are introduced in Chapter 7.",
				"bookTitle": "Ecological Systems Component Handbook",
				"language": "en",
				"libraryCatalog": "AquaDocs",
				"place": "Austin, TX",
				"publisher": "RPC, Inc.",
				"series": "Technical Paper",
				"shortTitle": "Ecological Attribute Alteration",
				"url": "http://hdl.handle.net/1834/30052",
				"attachments": [],
				"tags": [
					{
						"tag": "Ecology"
					},
					{
						"tag": "Management"
					},
					{
						"tag": "coastal zone management"
					},
					{
						"tag": "ecological assessment"
					},
					{
						"tag": "evaluation"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://aquadocs.org/handle/1834/970?show=full",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Report from the WPB on the Data Situation for Billfish",
				"creators": [],
				"date": "2000",
				"conferenceName": "IOTC 3",
				"language": "en",
				"libraryCatalog": "AquaDocs",
				"pages": "102-103",
				"proceedingsTitle": "IOTC Proceedings no. 3",
				"publisher": "IOTC",
				"url": "http://hdl.handle.net/1834/970",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Billfisheries"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://aquadocs.org/handle/1834/31638?show=full",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Introduction",
				"creators": [
					{
						"firstName": "Caroline M.",
						"lastName": "Isaacs",
						"creatorType": "author"
					}
				],
				"date": "1997",
				"abstractNote": "The Thirteenth Annual PACLIM Workshop was held at the Asilomar Conference Center on April 14-17, 1996. Attended by about 100 registered participants, the workshop included 27 talks and 26 poster presentations. The talks consisted of a one-day theme session of seven 45-minute talks and two featured evening talks. Throughout the remainder of the meeting were nearly 20 shorter, 20-minute presentations. Poster presenters gave a short 1-2 minute introduction to their posters, which were displayed during the entire meeting.All presenters were invited to expand their abstracts into a manuscript for inclusion in the Proceedings volume, and nearly all presentations are included in manuscript or abstract form. In this Proceedings volume, manuscripts are presented first, and abstracts of talks and then posters follow.",
				"conferenceName": "Thirteenth Annual Pacific Climate (PACLIM) Workshop",
				"language": "en",
				"libraryCatalog": "AquaDocs",
				"pages": "1-8",
				"url": "http://hdl.handle.net/1834/31638",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Atmospheric Sciences"
					},
					{
						"tag": "Earth Sciences"
					},
					{
						"tag": "Ecology"
					},
					{
						"tag": "Limnology"
					},
					{
						"tag": "Oceanography"
					},
					{
						"tag": "PACLIM"
					},
					{
						"tag": "hydrology"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
