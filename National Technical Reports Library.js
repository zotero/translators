{
	"translatorID": "5b9511cd-9b0b-4816-812a-6cbb2b685046",
	"label": "National Technical Reports Library",
	"creator": "Abe Jellinek",
	"target": "^https?://ntrl\\.ntis\\.gov/NTRL/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-31 19:24:13"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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


function detectWeb(doc, _url) {
	if (doc.querySelector('#detailsForm')) {
		return "report";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('tr[data-rk]');
	for (let row of rows) {
		let rk = row.getAttribute('data-rk');
		let title = ZU.trimInternal(text(row, 'span'));
		if (!rk || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[`/NTRL/dashboard/searchResults/titleDetail/${rk}.xhtml`] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	let item = new Zotero.Item('report');
	
	item.title = text(doc, '#detailsForm\\:itemTitle');
	item.reportNumber = text(doc, '#detailsForm\\:itemAbbr');
	item.date = ZU.strToISO(text(doc, '#detailsForm\\:publicationDate'));
	item.numPages = text(doc, '#detailsForm\\:pageCount'); // will migrate in new schema
	item.abstractNote = text(doc, '#detailsForm\\:summary');
	item.institution = text(doc, '#detailsForm\\:corporateAuthors');
	item.url = url.replace(/[?#].*$/, '');
	
	for (let author of text(doc, '#detailsForm\\:personalAuthors').split('; ')) {
		item.creators.push(ZU.cleanAuthor(author, 'author', true));
	}
	
	for (let tag of doc.querySelectorAll('#detailsForm\\:keywords_list li')) {
		item.tags.push({ tag: tag.textContent.trim() });
	}
	
	let supplement = text(doc, '#detailsForm\\:supplementalNote');
	if (supplement) {
		item.notes.push({ note: supplement });
	}
	
	// we should grab the PDF, but it's only accessible via a POST request...
	
	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://ntrl.ntis.gov/NTRL/dashboard/searchResults/titleDetail/ADA551422.xhtml",
		"items": [
			{
				"itemType": "report",
				"title": "Convection Processes in the Ocean-Laboratory and Theoretical Studies.",
				"creators": [
					{
						"firstName": "J. A.",
						"lastName": "Whitehead",
						"creatorType": "author"
					}
				],
				"date": "1998",
				"abstractNote": "My long-term goal is to make observations in the laboratory and then conduct associated experiments based on the theory of nonlinear fluid dynamics in the ocean. Two processes were studied recently. The first is the behavior of convective flow driven by two distinct buoyancy sources in which more than one flow pattern is found for exactly the same forcing conditions. A primary objective was to determine the quantitative role of mixing upon circulation. The second is the strength and size of flows from sidewall forcing in rotating stratified fluid. The primary objective was to document the flow patterns near a line source of heat located at mid-depth on the periphery of a cylinder in a rotating stratified fluid. Both are poorly understood but known to be important in assorted oceanic phenomena. With the ultimate objective of conducting experiments for rotating flows, we have been able to develop a chamber whose floor was heated and which has an inflow of salty water near the top. This chamber was connected to a large tank of room temperature fresh water through a slot. The prototype experiments indicated that mixing within the chamber must be limited for the flows to differ from the simple box models mentioned above. Thus a theory for undermixed exchange flow was developed (theory supported by NSF) and successfully tested. The results were used to design an undermixed doubly driven chamber. Mixing was varied by changing the elevation of a tube which introduces the salty water. For boundary layer processes in rotating stratified fluid, boundary layers produced by heating from the side have been produced in a laboratory cylinder of thermally stratified water on a turntable. The results are compared with calculations by Joseph Pedlosky. A variety of other theoretical solutions have been developed which reveal these boundary layers and their strength in great detail.",
				"institution": "Woods Hole Oceanographic Institution, MA.",
				"libraryCatalog": "National Technical Reports Library",
				"reportNumber": "ADA551422",
				"url": "https://ntrl.ntis.gov/NTRL/dashboard/searchResults/titleDetail/ADA551422.xhtml",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Boundary layer"
					},
					{
						"tag": "Buoyancy"
					},
					{
						"tag": "Chambers"
					},
					{
						"tag": "Convection"
					},
					{
						"tag": "Convective flow"
					},
					{
						"tag": "Cylindrical bodies"
					},
					{
						"tag": "Density"
					},
					{
						"tag": "Fluid dynamics"
					},
					{
						"tag": "Fresh water"
					},
					{
						"tag": "Laboratory tests"
					},
					{
						"tag": "Mixing"
					},
					{
						"tag": "Nonlinear fluid dynamics"
					},
					{
						"tag": "Rotating flows"
					},
					{
						"tag": "Rotation"
					},
					{
						"tag": "Salinity"
					},
					{
						"tag": "Salt water"
					},
					{
						"tag": "Stratification"
					},
					{
						"tag": "Stratified fluids"
					},
					{
						"tag": "Temperature"
					}
				],
				"notes": [
					{
						"note": "See also ADM002252."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ntrl.ntis.gov/NTRL/dashboard/searchResults/titleDetail/PB2000102396.xhtml",
		"items": [
			{
				"itemType": "report",
				"title": "Preconceptual Design Studies and Cost Data of Depleted Uranium Hexafluoride Conversion Plants.",
				"creators": [],
				"date": "1999",
				"abstractNote": "One of the more important legacies left with the Department of Energy (DOE) after the privatization of the United States Enrichment Corporation is the large inventory of depleted uranium hexafluoride (DUF6). The current DUF6 program has largely focused on the ongoing maintenance of the cylinders containing DUF6. The first step for future use or disposition is to convert the material, which requires construction and long-term operation of one or more conversion plants. This report contains the final results from a preconceptual design study project. In this fast track, three month effort, Lawrence Livermore National Laboratory and Bechtel National Incorporated developed and evaluated seven different preconceptual design cases for a single plant. The preconceptual design, schedules, costs, and issues associated with specified DUF6 conversion approaches, operating periods, and ownership options were evaluated based on criteria established by DOE. The single-plant conversion options studies were similar to the dry-conversion process alternatives from the PEIS. For each of the seven cases considered, this report contains information on the conversion process, preconceptual plant description, rough capital and operating costs, and preliminary project schedule.",
				"institution": "Lawrence Livermore National Lab., CA.; Bechtel National, Inc., San Francisco, CA.; Department of Energy, Washington, DC. Office of Nuclear Energy, Science",
				"libraryCatalog": "National Technical Reports Library",
				"reportNumber": "PB2000102396",
				"url": "https://ntrl.ntis.gov/NTRL/dashboard/searchResults/titleDetail/PB2000102396.xhtml",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Capitalized costs"
					},
					{
						"tag": "Conversion plants"
					},
					{
						"tag": "Cost estimates"
					},
					{
						"tag": "Depleted uranium"
					},
					{
						"tag": "Design analysis"
					},
					{
						"tag": "Facilities management"
					},
					{
						"tag": "Nuclear fuel conversion"
					},
					{
						"tag": "Operating costs"
					},
					{
						"tag": "Operation and maintenance"
					},
					{
						"tag": "Process flow"
					},
					{
						"tag": "Project planning"
					},
					{
						"tag": "Scheduling"
					},
					{
						"tag": "Uranium hexafluoride"
					}
				],
				"notes": [
					{
						"note": "See also DE90002698, DE99002697, and DE98052047. Prepared in cooperation with Bechtel National, Inc., San Francisco, CA. Sponsored by Department of Energy, Washington, DC. Office of Nuclear Energy, Science and Technology."
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
