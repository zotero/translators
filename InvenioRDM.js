{
	"translatorID": "a714cb93-6595-482f-b371-a4ca0be14449",
	"label": "InvenioRDM",
	"creator": "Philipp Zumstein, Sebastian Karcher and contributors",
	"target": "^https?://(zenodo\\.org|sandbox\\.zenodo\\.org|data\\.caltech\\.edu|repository\\.tugraz\\.at|researchdata\\.tuwien\\.at|ultraviolet\\.library\\.nyu\\.edu|adc\\.ei-basel\\.hasdai\\.org|fdat\\.uni-tuebingen\\.de|www\\.fdr\\.uni-hamburg\\.de|rodare\\.hzdr\\.de|aperta\\.ulakbim.gov\\.tr|www\\.openaccessrepository\\.it|eic-zenodo\\.sdcc\\.bnl\\.gov)",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-03-20 14:43:12"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2016-2023 Philipp Zumstein, Sebastian Karcher and contributors

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
For repositories based on InvenioRDM. Currently supported:
- Zenodo (including the sandbox platform) as of October 2023
- Caltech Data (California Institute of Technology, USA)
- FDAT Research Data Repository (University of Tübingen, USA)
- TU Graz Repository (Graz University of Technology, Austria)
- TU Wien Research Data (Vienna Technical University, Austria)
- UltraViolet (NYU, USA)

Also supports some repositories based on Zenodo's pre-October 2023 Invenio code base:
- Aperta (National Academic Network and Information Center, Turkey)
- Center for Sustainable Research Data Management, Universität Hamburg (Hamburg, Germany)
- EIC-Zenodo (Brookhaven National Laboratory, USA)
- INFN Open Access Repository (National Institute for Nuclear Physics, Italy)
- RODARE (Helmholtz-Zentrum Dresden-Rossendorf, Germany)


*/

// Only the pre-RDM is really necessary
//const invenioRdmRepositories = ['zenodo.org', 'sandbox.zenodo.org', 'data.caltech.edu', 'repository.tugraz.at', 'researchdata.tuwien.at', 'ultraviolet.library.nyu.edu', 'adc.ei-basel.hasdai.org', 'fdat.uni-tuebingen.de'];
const invenioPreRdmRepositories = ['www.fdr.uni-hamburg.de', 'rodare.hzdr.de', 'aperta.ulakbim.gov.tr', 'www.openaccessrepository.it', 'eic-zenodo.sdcc.bnl.gov'];


function detectWeb(doc, _url) {
	let collections;
	if (doc.location.pathname.startsWith('/record')) {
		if (invenioPreRdmRepositories.includes(doc.location.hostname)) {
			collections = ZU.xpath(doc, '//span[@class="pull-right"]/span[contains(@class, "label-default")]');
		}
		else {
			collections = doc.querySelectorAll('span[aria-label="Resource type"]');
			if (collections.length == 0) {
				// A common variant for other InvenioRDM repositories
				collections = doc.querySelectorAll('span[title="Resource type"]');
			}
		}

		for (let collection of collections) {
			let type = collection.textContent.toLowerCase().trim();
			Zotero.debug('type:', type);
			switch (type) {
				case "software":
					return "computerProgram";
				case "video/audio":
					return "videoRecording";//or audioRecording?
				case "figure":
				case "drawing":
				case "photo":
				case "diagram":
				case "plot":
					return "artwork";
				case "presentation":
				case "conference paper":
				case "poster":
				case "lesson":
					return "presentation";
				case "book":
					return "book";
				case "book section":
					return "bookSection";
				case "patent":
					return "patent";
				case "report":
				case "working paper":
				case "project deliverables":
					return "report";
				case "preprint":
					return "preprint";
				case "thesis":
					return "thesis";
				case "dataset":
				case "veri seti":
				//change when dataset as itemtype is available
					return "dataset";
				case "journal article":
					return "journalArticle";
			}
		}
		// Fall-back case
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	let rows;
	if (invenioPreRdmRepositories.includes(doc.location.hostname)) {
		rows = ZU.xpath(doc, '//invenio-search-results//h4/a');
	}
	else {
		// this section is not rendered in the 6.0 Scaffold browser, OK in v7
		rows = doc.querySelectorAll('h2>a[href*="/records/"]');
	}
	//Zotero.debug(rows);
	for (let row of rows) {
		let href = row.href;
		var title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return;
			}
			let articles = [];
			for (let i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url) {
	let abstract;
	let tags;
	let text;
	let doi = ZU.xpathText(doc, '//meta[@name="citation_doi"]/@content');
	let pdfURL = ZU.xpathText(doc, '//meta[@name="citation_pdf_url"]/@content');
	let cslURL = url.replace(/#.+/, "").replace(/\?.+/, "").replace(/\/export\/.+/, "") + "/export/csl";

	if (invenioPreRdmRepositories.includes(doc.location.hostname)) {
		Zotero.debug('scraping pre-RDM');
		abstract = ZU.xpathText(doc, '//meta[@name="description"]/@content');
		tags = ZU.xpath(doc, '//meta[@name="citation_keywords"]');
		let textPage = await requestText(cslURL);
		let newDoc = new DOMParser().parseFromString(textPage, "text/html");
		text = ZU.xpathText(newDoc, '//h3/following-sibling::pre');
	}
	else {
		tags = Array.from(doc.querySelectorAll('a.subject')).map(el => el.textContent.trim());
		text = await requestText(cslURL);
	}
	
	// use CSL JSON translator
	text = text.replace(/publisher_place/, "publisher-place");
	text = text.replace(/container_title/, "container-title");

	var trans = Zotero.loadTranslator('import');
	trans.setTranslator('bc03b4fe-436d-4a1f-ba59-de4d2d7a63f7'); // CSL JSON
	trans.setString(text);
	trans.setHandler("itemDone", function (obj, item) {
		item.itemType = detectWeb(doc, url);
		// The "note" field of CSL maps to Extra. Put it in a note instead
		if (item.extra) {
			item.notes.push({ note: item.extra });
			item.extra = "";
		}
		if (!ZU.fieldIsValidForType('DOI', item.itemType) && doi) {
			item.extra = "DOI: " + doi;
		}

		//get PDF attachment, otherwise just snapshot.
		if (pdfURL) {
			item.attachments.push({ url: pdfURL, title: "Full Text PDF", mimeType: "application/pdf" });
		}
		else {
			item.attachments.push({ url: url, title: "Snapshot", mimeType: "text/html" });
		}
		if (invenioPreRdmRepositories.includes(doc.location.hostname)) {
			for (let tag of tags) {
				item.tags.push(tag.content);
			}
		}
		else {
			for (let tag of tags) {
				item.tags.push(tag);
			}
		}

		//something is odd with zenodo's author parsing to CSL on some pages; fix it
		//e.g. https://zenodo.org/record/569323
		for (let i = 0; i < item.creators.length; i++) {
			let creator = item.creators[i];
			if (!creator.firstName || !creator.firstName.length) {
				if (creator.lastName.includes(",")) {
					creator.firstName = creator.lastName.replace(/.+?,\s*/, "");
					creator.lastName = creator.lastName.replace(/,.+/, "");
				}
				else {
					item.creators[i] = ZU.cleanAuthor(creator.lastName,
						creator.creatorType, false);
				}
			}
			delete item.creators[i].creatorTypeID;
		}

		//Don't use Zenodo as university for theses -- but use as archive
		if (item.itemType == "thesis" && item.publisher == "Zenodo") {
			item.publisher = "";
			item.archive = "Zenodo";
		}
		// or as institution for reports
		else if (item.itemType == "report" && item.institution == "Zenodo") {
			item.institution = "";
		}

		if (item.date) item.date = ZU.strToISO(item.date);
		if (url.includes('#')) {
			url = url.substring(0, url.indexOf('#'));
		}
		item.url = url;
		if (abstract) item.abstractNote = abstract;

		if (doc.location.hostname == "zenodo.org") {
			item.libraryCatalog = "Zenodo";
		}

		item.itemID = "";
		item.complete();
	});
	trans.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://zenodo.org/records/54766#.ZEAfIMQpAUE",
		"items": [
			{
				"itemType": "thesis",
				"title": "Measurement and Analysis of Strains Developed on Tie-rods of a Steering System",
				"creators": [
					{
						"lastName": "Asenov",
						"firstName": "Stefan",
						"creatorType": "author"
					}
				],
				"date": "2016-06-03",
				"abstractNote": "Modern day manufacturers research and develop vehicles that are equipped\nwith steering assist to help drivers undertake manoeuvres. However the lack of\nresearch for a situation where one tie-rod experiences different strains than the\nopposite one leads to failure in the tie-rod assembly and misalignment in the wheels over time. The performance of the steering system would be improved if this information existed. This bachelor’s dissertation looks into this specific situation and conducts an examination on the tie-rods.\nA simple kinematic model is used to determine how the steering system moves\nwhen there is a steering input. An investigation has been conducted to determine how the system’s geometry affects the strains.\nThe experiment vehicle is a Formula Student car which is designed by the\nstudents of Coventry University. The tests performed show the difference in situations where the two front tyres are on a single surface, two different surfaces – one with high friction, the other with low friction and a situation where there’s an obstacle in the way of one of the tyres.\nThe experiment results show a major difference in strain in the front tie-rods in\nthe different situations. Interesting conclusions can be made due to the results for the different surface situation where one of the tyres receives similar results in bothcompression and tension, but the other one receives results with great difference.\nThis results given in the report can be a starting ground and help with the\nimprovement in steering systems if more research is conducted.",
				"archive": "Zenodo",
				"extra": "DOI: 10.5281/zenodo.54766",
				"libraryCatalog": "Zenodo",
				"url": "https://zenodo.org/records/54766",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "strain steering system"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://zenodo.org/records/54747",
		"items": [
			{
				"itemType": "presentation",
				"title": "An introduction to data visualizations for open access advocacy",
				"creators": [
					{
						"lastName": "Guy",
						"firstName": "Marieke",
						"creatorType": "presenter"
					}
				],
				"date": "2015-09-17",
				"abstractNote": "Guides you through important steps in developing relevant visualizations by showcasing the work of PASTEUR4OA to develop visualizations from ROARMAP.",
				"extra": "DOI: 10.5281/zenodo.54747",
				"url": "https://zenodo.org/records/54747",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Data visualisation"
					},
					{
						"tag": "Open Access"
					},
					{
						"tag": "Open Access policy"
					},
					{
						"tag": "PASTEUR4OA"
					},
					{
						"tag": "ROARMAP"
					}
				],
				"notes": [
					{
						"note": "Funding by European Commission ROR 00k4n6c32."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://zenodo.org/records/14837",
		"items": [
			{
				"itemType": "artwork",
				"title": "Figures 8-11 in A new Savignia from Cretan caves (Araneae: Linyphiidae)",
				"creators": [
					{
						"lastName": "Bosselaers",
						"firstName": "Jan",
						"creatorType": "author"
					},
					{
						"lastName": "Henderickx",
						"firstName": "Hans",
						"creatorType": "author"
					}
				],
				"date": "2002-11-26",
				"abstractNote": "FIGURES 8-11. Savignia naniplopi sp. nov., female paratype. 8, epigyne, ventral view; 9, epigyne, posterior view; 10, epigyne, lateral view; 11, cleared vulva, ventral view. Scale bar: 8-10, 0.30 mm; 11, 0.13 mm.",
				"extra": "DOI: 10.5281/zenodo.14837",
				"libraryCatalog": "Zenodo",
				"shortTitle": "Figures 8-11 in A new Savignia from Cretan caves (Araneae",
				"url": "https://zenodo.org/records/14837",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Arachnida"
					},
					{
						"tag": "Araneae"
					},
					{
						"tag": "Crete"
					},
					{
						"tag": "Greece"
					},
					{
						"tag": "Linyphiidae"
					},
					{
						"tag": "Savignia"
					},
					{
						"tag": "cave"
					},
					{
						"tag": "new species"
					},
					{
						"tag": "troglobiont"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://zenodo.org/records/11879",
		"items": [
			{
				"itemType": "book",
				"title": "Sequence Comparison in Historical Linguistics",
				"creators": [
					{
						"lastName": "List",
						"firstName": "Johann-Mattis",
						"creatorType": "author"
					}
				],
				"date": "2014-09-04",
				"ISBN": "9783943460728",
				"abstractNote": "The comparison of sound sequences (words, morphemes) constitutes the core of many techniques and methods in historical linguistics. With the help of these techniques, corresponding sounds can be determined, historically related words can be identified, and the history of languages can be uncovered. So far, the application of traditional techniques for sequence comparison is very tedious and time-consuming, since scholars have to apply them manually, without computational support. In this study, algorithms from bioinformatics are used to develop computational methods for sequence comparison in historical linguistics. The new methods automatize several steps of the traditional comparative method and can thus help to ease the painstaking work of language comparison.",
				"extra": "DOI: 10.5281/zenodo.11879",
				"libraryCatalog": "Zenodo",
				"place": "Düsseldorf",
				"publisher": "Düsseldorf University Press",
				"url": "https://zenodo.org/records/11879",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "computational linguistics"
					},
					{
						"tag": "historical linguistics"
					},
					{
						"tag": "phonetic alignment"
					},
					{
						"tag": "sequence comparison"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://zenodo.org/records/45756#.ZEAe1sQpAUE",
		"items": [
			{
				"itemType": "dataset",
				"title": "X-ray diffraction images for  DPF3 tandem PHD fingers co-crystallized with an acetylated histone-derived peptide",
				"creators": [
					{
						"lastName": "Tempel",
						"firstName": "Wolfram",
						"creatorType": "author"
					},
					{
						"lastName": "Liu",
						"firstName": "Yanli",
						"creatorType": "author"
					},
					{
						"lastName": "Qin",
						"firstName": "Su",
						"creatorType": "author"
					},
					{
						"lastName": "Zhao",
						"firstName": "Anthony",
						"creatorType": "author"
					},
					{
						"lastName": "Loppnau",
						"firstName": "Peter",
						"creatorType": "author"
					},
					{
						"lastName": "Min",
						"firstName": "Jinrong",
						"creatorType": "author"
					}
				],
				"date": "2016-02-10",
				"DOI": "10.5281/zenodo.45756",
				"abstractNote": "This submission includes a tar archive of bzipped diffraction images recorded with the ADSC Q315r detector at the Advanced Photon Source of Argonne National Laboratory, Structural Biology Center beam line 19-ID. Relevant meta data can be found in the headers of those diffraction images.\n\n\nPlease find below the content of an input file XDS.INP for the program XDS (Kabsch, 2010), which may be used for data reduction. The \"NAME_TEMPLATE_OF_DATA_FRAMES=\" item inside XDS.INP may need to be edited to point to the location of the downloaded and untarred images.\n\n\n!!! Paste lines below in to a file named XDS.INP\n\n\nDETECTOR=ADSC  MINIMUM_VALID_PIXEL_VALUE=1  OVERLOAD= 65000\nDIRECTION_OF_DETECTOR_X-AXIS= 1.0 0.0 0.0\nDIRECTION_OF_DETECTOR_Y-AXIS= 0.0 1.0 0.0\nTRUSTED_REGION=0.0 1.05\nMAXIMUM_NUMBER_OF_JOBS=10\nORGX=   1582.82  ORGY=   1485.54\nDETECTOR_DISTANCE= 150\nROTATION_AXIS= -1.0 0.0 0.0\nOSCILLATION_RANGE=1\nX-RAY_WAVELENGTH= 1.2821511\nINCIDENT_BEAM_DIRECTION=0.0 0.0 1.0\nFRACTION_OF_POLARIZATION=0.90\nPOLARIZATION_PLANE_NORMAL= 0.0 1.0 0.0\nSPACE_GROUP_NUMBER=20\nUNIT_CELL_CONSTANTS= 100.030   121.697    56.554    90.000    90.000    90.000\nDATA_RANGE=1  180\nBACKGROUND_RANGE=1 6\nSPOT_RANGE=1 3\nSPOT_RANGE=31 33\nMAX_CELL_AXIS_ERROR=0.03\nMAX_CELL_ANGLE_ERROR=2.0\nTEST_RESOLUTION_RANGE=8.0 3.8\nMIN_RFL_Rmeas= 50\nMAX_FAC_Rmeas=2.0\nVALUE_RANGE_FOR_TRUSTED_DETECTOR_PIXELS= 6000 30000\nINCLUDE_RESOLUTION_RANGE=50.0 1.7\nFRIEDEL'S_LAW= FALSE\nSTARTING_ANGLE= -100      STARTING_FRAME=1\nNAME_TEMPLATE_OF_DATA_FRAMES= ../x247398/t1.0???.img\n\n\n!!! End of XDS.INP",
				"libraryCatalog": "Zenodo",
				"repository": "Zenodo",
				"url": "https://zenodo.org/records/45756",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Structural Genomics Consortium"
					},
					{
						"tag": "crystallography"
					},
					{
						"tag": "diffraction"
					},
					{
						"tag": "protein structure"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://zenodo.org/search?page=1&size=20&q=&type=video",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://zenodo.org/records/569323",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A few words about methodology",
				"creators": [
					{
						"lastName": "Schaffer",
						"firstName": "Frederic Charles",
						"creatorType": "author"
					}
				],
				"date": "2016-12-31",
				"DOI": "10.5281/zenodo.569323",
				"abstractNote": "In mulling over how to most productively respond to the reflections offered by Lahra Smith, Gary Goertz, and Patrick Jackson, I tried to place myself in the armchair of a Qualitative & Multi-Method Research reader. What big methodological questions, I asked myself, are raised by their reviews of my book? How might I weigh in, generatively, on those questions?",
				"issue": "1/2",
				"libraryCatalog": "Zenodo",
				"pages": "52-56",
				"publicationTitle": "Qualitative & Multi-Method Research",
				"url": "https://zenodo.org/records/569323",
				"volume": "14",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "qualitative methods"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://zenodo.org/records/1048320",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "ropensci/codemetar: codemetar: Generate CodeMeta Metadata for R Packages",
				"creators": [
					{
						"firstName": "Carl",
						"lastName": "Boettiger",
						"creatorType": "programmer"
					},
					{
						"firstName": "Maëlle",
						"lastName": "Salmon",
						"creatorType": "programmer"
					},
					{
						"firstName": "Noam",
						"lastName": "Ross",
						"creatorType": "programmer"
					},
					{
						"firstName": "Arfon",
						"lastName": "Smith",
						"creatorType": "programmer"
					},
					{
						"firstName": "Anna",
						"lastName": "Krystalli",
						"creatorType": "programmer"
					}
				],
				"date": "2017-11-13",
				"abstractNote": "an R package for generating and working with codemeta",
				"company": "Zenodo",
				"extra": "DOI: 10.5281/zenodo.1048320",
				"libraryCatalog": "Zenodo",
				"shortTitle": "ropensci/codemetar",
				"url": "https://zenodo.org/records/1048320",
				"versionNumber": "0.1.2",
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
		"url": "https://zenodo.org/records/8092340",
		"items": [
			{
				"itemType": "preprint",
				"title": "Creating Virtuous Cycles for DNA Barcoding: A Case Study in Science Innovation, Entrepreneurship, and Diplomacy",
				"creators": [
					{
						"lastName": "Schindel",
						"firstName": "David E.",
						"creatorType": "author"
					},
					{
						"lastName": "Page",
						"firstName": "Roderic D. M. Page",
						"creatorType": "author"
					}
				],
				"date": "2023-06-28",
				"DOI": "10.5281/zenodo.8092340",
				"abstractNote": "This essay on the history of the DNA barcoding enterprise attempts to set the stage for the more scholarly contributions that follow. How did the enterprise begin? What were its goals, how did it develop, and to what degree are its goals being realized? We have taken a keen interest in the barcoding movement and its relationship to taxonomy, collections and biodiversity informatics more broadly considered. This essay integrates our two different perspectives on barcoding. DES was the Executive Secretary of the Consortium for the Barcode of Life from 2004 to 2017, with the mission to support the success of DNA barcoding without being directly involved in generating barcode data. RDMP viewed barcoding as an important entry into the landscape of biodiversity data, with many potential linkages to other components of the landscape. We also saw it as a critical step toward the era of international genomic research that was sure to follow. Like the Mercury Program that paved the way for lunar landings by the Apollo Program, we saw DNA barcoding as the proving grounds for the interdisciplinary and international cooperation that would be needed for success of whole-genome research.",
				"libraryCatalog": "Zenodo",
				"repository": "Zenodo",
				"shortTitle": "Creating Virtuous Cycles for DNA Barcoding",
				"url": "https://zenodo.org/records/8092340",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "BOLD"
					},
					{
						"tag": "Barcode of Life Data System"
					},
					{
						"tag": "CBoL"
					},
					{
						"tag": "Consortium for the Barcode of Life"
					},
					{
						"tag": "DNA barcoding"
					},
					{
						"tag": "dark taxa"
					},
					{
						"tag": "preprint"
					},
					{
						"tag": "specimen voucher"
					},
					{
						"tag": "taxonomy"
					},
					{
						"tag": "virtuous cycles"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://data.caltech.edu/records/kas2z-0fe41",
		"items": [
			{
				"itemType": "dataset",
				"title": "Principles of Computation by Competitive Protein Dimerization Networks",
				"creators": [
					{
						"lastName": "Parres-Gold",
						"firstName": "Jacob",
						"creatorType": "author"
					},
					{
						"lastName": "Levine",
						"firstName": "Matthew",
						"creatorType": "author"
					},
					{
						"lastName": "Emert",
						"firstName": "Benjamin",
						"creatorType": "author"
					},
					{
						"lastName": "Stuart",
						"firstName": "Andrew M.",
						"creatorType": "author"
					},
					{
						"lastName": "Elowitz",
						"firstName": "Michael B.",
						"creatorType": "author"
					}
				],
				"date": "2023-10-20",
				"DOI": "10.22002/kas2z-0fe41",
				"abstractNote": "Many biological signaling pathways employ proteins that competitively dimerize in diverse combinations. These dimerization networks can perform biochemical computations, in which the concentrations of monomers (inputs) determine the concentrations of dimers (outputs). Despite their prevalence, little is known about the range of input-output computations that dimerization networks can perform (their \"expressivity\") and how it depends on network size and connectivity. Using a systematic computational approach, we demonstrate that even small dimerization networks (3-6 monomers) can perform diverse multi-input computations. Further, dimerization networks are versatile, performing different computations when their protein components are expressed at different levels, such as in different cell types. Remarkably, individual networks with random interaction affinities, when large enough (≥8 proteins), can perform nearly all (~90%) potential one-input network computations merely by tuning their monomer expression levels. Thus, even the simple process of competitive dimerization provides a powerful architecture for multi-input, cell-type-specific signal processing.",
				"language": "eng",
				"libraryCatalog": "InvenioRDM",
				"repository": "CaltechDATA",
				"url": "https://data.caltech.edu/records/kas2z-0fe41",
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
		"url": "https://repository.tugraz.at/records/7cqqh-nma57",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "Rohdaten zum Lernvideo: Herstellung von Textilbeton",
				"creators": [
					{
						"lastName": "Harden",
						"firstName": "Jakob",
						"creatorType": "director"
					}
				],
				"date": "2023-11-28",
				"abstractNote": "Dieser Datensatz beinhaltet die Rohdaten, die für die Produktion des Lernvideos verwendet wurden. Diese bestehen aus den Videoaufzeichnungen, den Präsentationsfolien und der H5P-Datei. Rohdaten und Lernvideo wurden für Lehrzwecke für die VU Konstruktionswerkstoffe [206.455] erstellt. Im Video wird die Herstellung von Probekörpern (Würfel, Balken) aus Textilbeton gezeigt.",
				"extra": "DOI: 10.3217/7cqqh-nma57",
				"language": "deu",
				"libraryCatalog": "InvenioRDM",
				"shortTitle": "Rohdaten zum Lernvideo",
				"studio": "Graz University of Technology",
				"url": "https://repository.tugraz.at/records/7cqqh-nma57",
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
		"url": "https://researchdata.tuwien.at/records/k1ce7-hrt53",
		"items": [
			{
				"itemType": "dataset",
				"title": "RAAV - Results of the PT-STA accessibility analysis",
				"creators": [
					{
						"lastName": "Gidam",
						"firstName": "Michael",
						"creatorType": "author"
					},
					{
						"lastName": "Dianin",
						"firstName": "Alberto",
						"creatorType": "author"
					},
					{
						"lastName": "Hauger",
						"firstName": "Georg",
						"creatorType": "author"
					},
					{
						"lastName": "Ravazzoli",
						"firstName": "Elisa",
						"creatorType": "author"
					}
				],
				"date": "2023-11-22",
				"DOI": "10.48436/k1ce7-hrt53",
				"abstractNote": "Dataset description\nAs part of the project \"RAAV - Rural Accessibility and Automated Vehicles\" between the TU Vienna (Austria) and the EURAC institute (Bolzano, Italy), this file serves to summarise the results of a test of the PT-STA method in a comprehensible manner and to make them publicly available.\nContext and methodology\nAn adaption of a classical STA accessibility analysis was formulated and the new method tested on a sample of over 100 individuals in Mühlwald, South Tyrol and over 100 individuals in Sooß, Lower Austria. The test is based on travel diaries, which have been attained in cooperation with and by interviewing said individuals.\nTo be as transparent as possible the data is provided in the Microsoft Excel format with all cell references. By doing this, we ensure that the data can also be used and adapted for other research. The travel diaries on which this research is based on can be accessed here: https://researchdata.tuwien.ac.at/records/hq7b7-xsa12\nTechnical details\nThe dataset contains one Microsoft Excel file containing multiple data sheets. All data from both regions, Mühlwald and Sooß were cumulated. In order to ensure data protection and anonymisation all names, addresses and coordinates of interviewed people, origins and destinations have been deleted from the dataset.\nOther than Microsoft Excel, there is no additional software needed to investigate the data. The first datasheet gives an overview of abbreviations and data stored in each data sheet.",
				"libraryCatalog": "InvenioRDM",
				"repository": "TU Wien",
				"url": "https://researchdata.tuwien.at/records/k1ce7-hrt53",
				"versionNumber": "1.0.0",
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
		"url": "https://ultraviolet.library.nyu.edu/records/vje3m-6z249",
		"items": [
			{
				"itemType": "dataset",
				"title": "Occupy Wall Street Archives Working Group Records FTIR dataset (TAM.630, Box 39, Conservation ID 21_098)",
				"creators": [
					{
						"lastName": "Jenks",
						"firstName": "Josephine",
						"creatorType": "author"
					},
					{
						"lastName": "Stephens",
						"firstName": "Catherine",
						"creatorType": "author"
					},
					{
						"lastName": "Pace",
						"firstName": "Jessica",
						"creatorType": "author"
					}
				],
				"date": "2023-08-30",
				"DOI": "10.58153/vje3m-6z249",
				"abstractNote": "This is a technical analysis dataset for cultural heritage materials that are in the collection of New York University Libraries and were examined by the NYU Barbara Goldsmith Preservation & Conservation Department. The materials were examined on June 28, 2021 and are part of the Occupy Wall Street Archives Working Group Records held by the NYU Special Collections (TAM.630, Box 39). The dataset includes a conservation report, FTIR (Fourier Transform Infrared) spectra and, if applicable, a standard visible light image of the object. For more information about this object or its FTIR spectra, please contact the Barbara Goldsmith Preservation & Conservation Department at lib-preservation@nyu.edu",
				"language": "eng",
				"libraryCatalog": "InvenioRDM",
				"repository": "New York University",
				"url": "https://ultraviolet.library.nyu.edu/records/vje3m-6z249",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Spectroscopy, Fourier Transform Infrared"
					},
					{
						"tag": "conservation science (cultural heritage discipline)"
					},
					{
						"tag": "preservation (function)"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://adc.ei-basel.hasdai.org/records/4yqf2-z8t98",
		"items": [
			{
				"itemType": "book",
				"title": "THE CHRONICLE & DIRECTORY",
				"creators": [
					{
						"lastName": "Yorick Jones",
						"firstName": "Murrow",
						"creatorType": "author"
					}
				],
				"date": "1874",
				"abstractNote": "1874 edition",
				"language": "eng",
				"libraryCatalog": "InvenioRDM",
				"publisher": "Hong Kong Daily Press",
				"url": "https://adc.ei-basel.hasdai.org/records/4yqf2-z8t98",
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
		"url": "https://fdat.uni-tuebingen.de/records/m3y4j-62y93",
		"items": [
			{
				"itemType": "dataset",
				"title": "Dissertation Rohmann: Experimentelle Daten",
				"creators": [
					{
						"lastName": "Rohmann",
						"firstName": "Florian",
						"creatorType": "author"
					}
				],
				"date": "2018-01-19",
				"DOI": "10.57754/FDAT.m3y4j-62y93",
				"abstractNote": "Eine typische Verhaltensweise beim Fällen numerischer Urteile ist die Ausrichtung an Vergleichswerten. Inwieweit dabei deren Quellen berücksichtigt werden, insbesondere soziale Charakteristika, war Ausgangspunkt von vier Experimenten. Experiment 1 liefert einen Beleg für die Relevanz der Quelle insofern, als die Anpassungen an die Anker stärker im Fall einer glaubwürdigenn(vs. unglaubwürdigen) Quelle ausfielen. Anhand von Experiment 2 und 3 wurde geprüft, ob sich die Ankerquelle auch auf die Richtung des Effekts auswirken, also nicht nur unterschiedlich starke Assimilation, sondern ebenso Kontrast nach sich ziehen kann. Um dies zu testen, wurde auf Quellen zurückgegriffen, die als voreingenommen gelten konnten, wobei der jeweils gesetzte Anker diese Erwartung entweder bestätigte oder verletzte.  Dabei wurde der Eindruck über die Voreingenommenheit zunächst durch Salientmachung von Quellen-Merkmalen (Experiment 2) und später indirekt durch die Erzeugung einer epistemisch ambigen Urteilskonstellation (Experiment 3) verstärkt. Während ein Effekt der Quelle in Experiment 2 ausblieb, wurde in Experiment 3 das vorhergesagte Muster gezeigt: Waren Quellen-Hinweisreiz und Anker    inkongruent (Verletzung der Erwartung), kam es zu einer Assimilation, im Fall von Kongruenz (Bestätigung) hingegen zu Kontrast. Schließlich offenbarte Experiment 4, dass die in Experiment 3 gefundenen Effekte nicht durch eine Warnung vor dem Anker neutralisiert werden konnten.",
				"libraryCatalog": "InvenioRDM",
				"repository": "University of Tübingen",
				"shortTitle": "Dissertation Rohmann",
				"url": "https://fdat.uni-tuebingen.de/records/m3y4j-62y93",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "linguistics"
					}
				],
				"notes": [
					{
						"note": "Funding by German Research Foundation (DFG) ROR 018mejw64."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.fdr.uni-hamburg.de/record/13706",
		"items": [
			{
				"itemType": "dataset",
				"title": "Temporal Model BERT-Large_TempEval-3",
				"creators": [
					{
						"firstName": "Kirsanov",
						"lastName": "Simon",
						"creatorType": "author"
					}
				],
				"date": "2023-11-01",
				"DOI": "10.25592/uhhfdm.13706",
				"abstractNote": "Temporal Model \"BERT-Large\" finetuned on the \"TempEval-3\" dataset to solve the tasks of extraction and classification of temporal entities. Model produced in the master's thesis \"Extraction and Classification of Time in Unstructured Data [Kirsanov, 2023]\".",
				"language": "eng",
				"libraryCatalog": "InvenioRDM",
				"url": "https://www.fdr.uni-hamburg.de/record/13706",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "aquaint"
					},
					{
						"tag": "bert"
					},
					{
						"tag": "information extraction"
					},
					{
						"tag": "named entity recognition"
					},
					{
						"tag": "natural language processing"
					},
					{
						"tag": "ner"
					},
					{
						"tag": "nlp"
					},
					{
						"tag": "tempeval"
					},
					{
						"tag": "temporal extraction"
					},
					{
						"tag": "temporal tagging"
					},
					{
						"tag": "timebank"
					},
					{
						"tag": "timex3"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://rodare.hzdr.de/record/2582",
		"items": [
			{
				"itemType": "dataset",
				"title": "Data publication: SAPPHIRE - Establishment of small animal proton and photon image-guided radiation experiments",
				"creators": [
					{
						"lastName": "Schneider",
						"firstName": "Moritz",
						"creatorType": "author"
					},
					{
						"lastName": "Schilz",
						"firstName": "Joshua",
						"creatorType": "author"
					},
					{
						"lastName": "Schürer",
						"firstName": "Michael",
						"creatorType": "author"
					},
					{
						"lastName": "Gantz",
						"firstName": "Sebastian",
						"creatorType": "author"
					},
					{
						"lastName": "Dreyer",
						"firstName": "Anne",
						"creatorType": "author"
					},
					{
						"lastName": "Rothe",
						"firstName": "Gerd",
						"creatorType": "author"
					},
					{
						"lastName": "Tillner",
						"firstName": "Falk",
						"creatorType": "author"
					},
					{
						"lastName": "Bodenstein",
						"firstName": "Elisabeth",
						"creatorType": "author"
					},
					{
						"lastName": "Horst",
						"firstName": "Felix",
						"creatorType": "author"
					},
					{
						"lastName": "Beyreuther",
						"firstName": "Elke",
						"creatorType": "author"
					}
				],
				"date": "2023-11-28",
				"DOI": "10.14278/rodare.2582",
				"abstractNote": "This repository contains the data shown in the results part of the paper entitled: SAPPHIRE - Establishment of small animal proton and photon image-guided radiation experiments.",
				"language": "eng",
				"libraryCatalog": "InvenioRDM",
				"repository": "Rodare",
				"shortTitle": "Data publication",
				"url": "https://rodare.hzdr.de/record/2582",
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
		"url": "https://www.openaccessrepository.it/record/143495",
		"items": [
			{
				"itemType": "presentation",
				"title": "Touch Option Model",
				"creators": [
					{
						"firstName": "Tim",
						"lastName": "Xiao",
						"creatorType": "presenter"
					}
				],
				"date": "2023-12-03",
				"abstractNote": "The valuation model of a touch option attempt to price Exotics with volatility smile surface. The idea behind Skew Touch is to build a hedging portfolio made of smile contracts (Call/Put or Risk Reversal /Butterfly) which, under volatility flatness assumption (ATM), matches Black-Scholes Vega and its derivatives with respect to FX spot and volatility, Vanna and Volga, of the target Touch Option.",
				"extra": "DOI: 10.15161/oar.it/143495",
				"language": "eng",
				"url": "https://www.openaccessrepository.it/record/143495",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "touch option, barrier option, option valuation model"
					}
				],
				"notes": [
					{
						"note": "https://www.kaggle.com/datasets/davidlee118856/convertible-bond-empirical-study/data"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://eic-zenodo.sdcc.bnl.gov/record/64",
		"items": [
			{
				"itemType": "presentation",
				"title": "Software documentation and the EICUG website maintenance",
				"creators": [
					{
						"lastName": "Potekhin",
						"firstName": "Maxim",
						"creatorType": "presenter"
					}
				],
				"date": "2020-11-12",
				"abstractNote": "Presentation for the BNL EIC Group on November 12th, 2020. Status of the EICUG software documentation and the Drupal site maintenance.",
				"extra": "DOI: 10.5072/zenodo.64",
				"language": "eng",
				"url": "https://eic-zenodo.sdcc.bnl.gov/record/64",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "collaborative tools"
					},
					{
						"tag": "software"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://aperta.ulakbim.gov.tr/record/252039",
		"detectedItemType": "dataset",
		"items": [
			{
				"itemType": "dataset",
				"title": "Statik ve Dinamik Mekânsal Panel Veri Modellerinde Sabit Varyanslılığın Testi",
				"creators": [
					{
						"lastName": "GÜLOĞLU",
						"firstName": " BÜLENT",
						"creatorType": "author"
					},
					{
						"lastName": "DOĞAN",
						"firstName": " OSMAN",
						"creatorType": "author"
					},
					{
						"lastName": "TAŞPINAR",
						"firstName": "SÜLEYMAN",
						"creatorType": "author"
					}
				],
				"date": "2022-10-30",
				"DOI": "10.48623/aperta.252038",
				"abstractNote": "Bu çalışmada gözlenemeyen sabit bireysel ve zaman etkilerinin bulunduğu mekânsal panel veri modelinde sabit varyanslılığı sınamak amacıyla düzeltilmiş skor fonksiyonlarına dayalı test istatistikleri geliştirilmektedir. Maksimum olabilirlik benzeri yaklaşımı çerçevesinde, skor fonksiyonlarının asimtotik varyanslarını tahmin etmek için martingal farkın dış çarpımı yöntemi kullanılmaktadır. Daha sonra bu varyans tahminleri ve düzeltilmiş skor fonksiyonları kullanılarak, sabit varyanslılığı test etmek için hesaplanması kolay ve güçlü test istatistikleri türetilmektedir. Önerilen test istatistikleri aşağıdaki özelliklere sahip olacaklardır: ·        Geliştirilen testler mekânsal panel modellerindeki hata terimlerinin normal dağılmamasına karşı güçlüdürüler. ·        Önerilen testler yerel parametrik model kurma hatasına güçlü olacak biçimde türetilmişlerdir. ·        Testlerin hesaplanması görece basit olup zaman alıcı sayısal optimizasyon gibi ileri düzey tekniklerin kullanılmasını gerektirmemektedir. Testler sabit bireysel ve zaman etkilerinin olduğu iki yönlü panel veri modelinden grup-içi tahminci kullanılarak elde edilebilmektedir.   Dolayısıyla statik mekânsal panel veri modeli çerçevesinde, önerilen test istatistiği bağımlı değişkendeki ve/veya hata teriminde mekânsal bağımlılığın varlığını gerektirmemektedir. Benzer biçimde dinamik panel veri modeli çerçevesinde geliştirilen test istatistiği i) bağımlı değişkenin mekânsal bağımlılığıyla, ii) bağımlı değişkenin zaman gecikmesiyle, iii) bağımlı değişkenin mekânsal-zaman gecikmesiyle, iv) hata teriminin mekânsal gecikmesiyle ilgili parametrelerin tahminini gerektirmemektedir. Proje çerçevesinde Monte Carlo Simülasyonları yardımıyla test istatistiklerinin sonlu (küçük) örneklem boyut ve güç analizleri yapılmıştır. Ayrıca, yatay kesit ve zaman boyut uzunluğunun, normallik varsayımının ihalalinin, mekânsal ağırlık matrislerinin yapısının, anakitle parametre değerlerindeki değişikliklerin test istaistiklerinin performansları üzerine etkileri de incelenmiştir. Gerçek veriler kullanılarak üç tane ampirik uygulama yapılarak test istatistiklerinin kullanılımı gösterilmiştir. Nihayet MATLAB kodu yazılarak test istatistiklerinin kolay biçimde hesaplanması sağlanmıştır.",
				"libraryCatalog": "InvenioRDM",
				"url": "https://aperta.ulakbim.gov.tr/record/252039",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Değişen varyans"
					},
					{
						"tag": "LM testleri"
					},
					{
						"tag": "Mekânsal Panel Veri Modelleri"
					},
					{
						"tag": "Mekânsal bağımlılık"
					},
					{
						"tag": "Yerel parametrik model kurma hatası"
					},
					{
						"tag": "İstatistiksel Çıkarım"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://zenodo.org/communities/oat23/records?q=&l=list&p=1&s=10&sort=newest",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
