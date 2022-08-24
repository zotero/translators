{
	"translatorID": "2100cedb-0a7d-4166-ab97-5e84e516cd81",
	"label": "OAPEN",
	"creator": "Abe Jellinek",
	"target": "^https?://library\\.oapen\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-10-22 00:17:40"
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
	if (doc.querySelector('meta[name="citation_title"]')) {
		if (attr(doc, 'meta[name="DC.type"]', 'content') == 'chapter') {
			return "bookSection";
		}
		else {
			return "book";
		}
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.artifact-description > a');
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
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		item.title = item.title.replace(' : ', ': ');
		
		delete item.journalAbbreviation;
		
		if (item.attachments.some(at => at.title == 'Full Text PDF')) {
			item.attachments = item.attachments.filter(at => at.title != 'Snapshot');
		}
		
		for (let creator of item.creators) {
			if (creator.firstName) {
				creator.firstName = creator.firstName.replace(/\s*\[.*$/, '');
			}
		}
		
		if (item.itemType == 'bookSection') {
			let search = Zotero.loadTranslator('search');
			search.setSearch({ DOI: item.DOI });
			
			search.setHandler('translators', function (_, translators) {
				search.setTranslator(translators);
				search.translate();
			});
			
			search.setHandler('itemDone', function (_, doiItem) {
				item.title = doiItem.title;
				item.bookTitle = doiItem.bookTitle;
				item.creators = doiItem.creators;
				item.ISBN = doiItem.ISBN;
				item.date = doiItem.date;
				item.complete();
			});
			
			search.getTranslators();
		}
		else {
			item.complete();
		}
	});

	translator.getTranslatorObject(function (trans) {
		if (attr(doc, 'meta[name="DC.type"]', 'content') == 'chapter') {
			trans.itemType = 'bookSection';
		}
		
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://library.oapen.org/handle/20.500.12657/39719",
		"items": [
			{
				"itemType": "book",
				"title": "Thou Shalt Forget: Indigenous sovereignty, resistance and the production of cultural oblivion in Canada",
				"creators": [
					{
						"firstName": "Pierrot",
						"lastName": "Ross-Tremblay",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISBN": "9781912250097",
				"abstractNote": "What is ‘cultural oblivion’ and ‘psychological colonialism’, and how are they affecting the capacity of Indigenous Peoples in Canada to actively resist systematic and territorial oppression by the state? Following a decade-long research project, this new book by Pierrot Ross-Tremblay examines the production of oblivion among his own community, the Essipiunnuat [or, ‘People of the Brook Shells River’] and the relationship between a colonial imperative to forget. The book illustrates how the ‘cultural oblivion’ of vulnerable minority communities is a critical human rights issue but also asks us to reflect upon both the role of the state and the local elite in creating and warping our perception and understanding of history.",
				"extra": "DOI: 10.14296/620.9781912250424",
				"language": "English",
				"libraryCatalog": "library.oapen.org",
				"publisher": "University of London Press",
				"shortTitle": "Thou Shalt Forget",
				"url": "https://library.oapen.org/handle/20.500.12657/39719",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "colonialism"
					},
					{
						"tag": "communities"
					},
					{
						"tag": "indigenous people"
					},
					{
						"tag": "minority"
					},
					{
						"tag": "territory"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://library.oapen.org/handle/20.500.12657/39444",
		"items": [
			{
				"itemType": "book",
				"title": "Atlas: Makerspaces in Public Libraries in The Netherlands",
				"creators": [
					{
						"firstName": "Olindo",
						"lastName": "Caso",
						"creatorType": "author"
					},
					{
						"firstName": "Joran",
						"lastName": "Kuijper",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"ISBN": "9789463661478",
				"abstractNote": "Public libraries want to contribute to an inclusive and innovative society and aim to enable their patrons to acquire the necessary 21st century skills. Dutch public libraries are therefore gradually adding more and more activities to their curriculum, teaching these different types of skills, such as ‘invention literacy’. They also often provide a ‘performative space’ (i.e. a makerspace) for their patrons. This means library spaces are no longer dominated by books, but rather reflect the current development in libraries’ core business, moving from collections to connections in order to serve their local communities. The KB, the National Library of The Netherlands, participated in the KIEM1 project Performative Spaces in Dutch Public Libraries. Stepping Stones of Inclusive Innovation, researching the development of performative spaces in libraries. This project, a collaboration with the Faculty of Architecture and the Built Environment at the Delft University of Technology, fits the KBs strategic interests in providing an innovative and socially aware library system.",
				"language": "English",
				"libraryCatalog": "library.oapen.org",
				"publisher": "TU Delft Open",
				"shortTitle": "Atlas",
				"url": "https://library.oapen.org/handle/20.500.12657/39444",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "AMG"
					},
					{
						"tag": "GL"
					},
					{
						"tag": "The Netherlands"
					},
					{
						"tag": "bic Book Industry Communication::A The arts::AM Architecture::AMG Public buildings: civic"
					},
					{
						"tag": "commercial"
					},
					{
						"tag": "etc"
					},
					{
						"tag": "industrial"
					},
					{
						"tag": "library space"
					},
					{
						"tag": "public libraries"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://library.oapen.org/discover?query=test",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://library.oapen.org/handle/20.500.12657/49284",
		"items": [
			{
				"itemType": "bookSection",
				"title": "MEMS Technologies Enabling the Future Wafer Test Systems",
				"creators": [
					{
						"creatorType": "editor",
						"firstName": "Siva",
						"lastName": "Yellampalli"
					},
					{
						"creatorType": "author",
						"firstName": "Bahadir",
						"lastName": "Tunaboylu"
					},
					{
						"creatorType": "author",
						"firstName": "Ali M.",
						"lastName": "Soydan"
					}
				],
				"date": "2018-07-18",
				"ISBN": "9781789233940 9781789233957",
				"abstractNote": "As the form factor of microelectronic systems and chips are continuing to shrink, the demand for increased connectivity and functionality shows an unabated rising trend. This is driving the evolution of technologies that requires 3D approaches for the integration of devices and system design. The 3D technology allows higher packing densities as well as shorter chip-to-chip interconnects. Micro-bump technology with through-silicon vias (TSVs) and advances in flip chip technology enable the development and manufacturing of devices at bump pitch of 14 μm or less. Silicon carrier or interposer enabling 3D chip stacking between the chip and the carrier used in packaging may also offer probing solutions by providing a bonding platform or intermediate board for a substrate or a component probe card assembly. Standard vertical probing technologies use microfabrication technologies for probes, templates and substrate-ceramic packages. Fine pitches, below 50 μm bump pitch, pose enormous challenges and microelectromechanical system (MEMS) processes are finding applications in producing springs, probes, carrier or substrate structures. In this chapter, we explore the application of MEMS-based technologies on manufacturing of advanced probe cards for probing dies with various new pad or bump structures.",
				"bookTitle": "MEMS Sensors - Design and Application",
				"extra": "DOI: 10.5772/intechopen.73144",
				"language": "English",
				"libraryCatalog": "library.oapen.org",
				"publisher": "InTechOpen",
				"url": "https://library.oapen.org/handle/20.500.12657/49284",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "MEMS technology"
					},
					{
						"tag": "agriculture::TJ Electronics & communications engineering::TJF Electronics engineering::TJFC Circuits & components"
					},
					{
						"tag": "bic Book Industry Communication::T Technology"
					},
					{
						"tag": "engineering"
					},
					{
						"tag": "interconnects"
					},
					{
						"tag": "interposer"
					},
					{
						"tag": "wafer and package test systems"
					},
					{
						"tag": "wafer probes"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
