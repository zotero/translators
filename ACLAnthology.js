{
	"translatorID": "9b2f2d29-02e3-4693-b728-4cd435650669",
	"label": "ACLAnthology",
	"creator": "Guy Aglionby",
	"target": "^https://aclanthology(\\.coli\\.uni\\-saarland\\.de|\\.info)/(events|papers|volumes)/[^#]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-01-26 15:05:16"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Guy Aglionby
	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	if (url.includes('/events/') || url.includes('/volumes/')) {
		return 'multiple';
	} else if (url.includes('/papers/')) {
		let id = url.split('/').pop().toLowerCase();
		return id[0] == 'j' || id[0] == 'q' ? 'journalArticle' : 'conferencePaper';
	}
}

function doWeb(doc, url) {
	const WEBSITE_STUB = 'https://aclanthology.coli.uni-saarland.de/';
	if (detectWeb(doc, url) === 'multiple') {
		Zotero.selectItems(getSearchResults(doc), function (selected) {
			if (!selected) {
				return true;
			}
			
			let venue = getVenue(doc);
			
			Object.keys(selected).forEach(function (id) {
				let bibtexUrl = ZU.xpath(doc, '//p[contains(., "' + id + '")]/a[img[@alt = "Export"]]')[0].href;
				ZU.doGet(bibtexUrl, function(responseString, responseObj) {
					if (!venue) {
						let paperUrl = bibtexUrl.replace('.bib', '');
						ZU.processDocuments(paperUrl, function(responseBody) {
							let thisVenue = getVenue(responseBody);
							scrapeBibtex(responseString, thisVenue);
						});
					} else {
						scrapeBibtex(responseString, venue);
					}
				});
			});
		});
	} else if(url.endsWith('.bib')) {
		let paperUrl = url.replace('.bib', '');
		ZU.processDocuments(paperUrl, function(responseBody) {
			let venue = getVenue(responseBody);
			scrapeBibtex(ZU.xpath(doc, '//pre')[0].innerHTML, venue);
		});
	} else {
		let partialBibtexUrl = ZU.xpath(doc, '//a[contains(., "BibTeX")]/@href')[0].value;
		let bibtexUrl = WEBSITE_STUB + partialBibtexUrl;
		let venue = getVenue(doc);
		ZU.doGet(bibtexUrl, function(responseString, responseObj) {
			scrapeBibtex(responseString, venue);
		});
	}
}

function getVenue(doc) {
	let venueElements = ZU.xpath(doc, '//dt[strong[contains(text(), "Venue")]]/following::dd[1]/a');
	let venues = venueElements.map(function (v) {
		return v.innerText.trim();
	});
	
	if (!venues.length) {
		return;
	}
	
	let venueString = venues.join('-');
	let year = ZU.xpath(doc, '//dt[strong[contains(text(), "Year")]]/following::dd[1]')[0].textContent;
	return venueString + ' ' + year;
}

function getSearchResults(doc) {
	// additional example not covered in tests (fails in automated testing)
	// https://aclanthology.coli.uni-saarland.de/volumes/computational-linguistics-volume-44-issue-1-april-2018",

	let listing = ZU.xpath(doc, '//div[@id="content"]//p');
	let items = {};
	for (let i = 0; i < listing.length; i++) {
		let title = ZU.xpath(listing[i], 'strong')[0].textContent;
		let bibtexLink = ZU.xpath(listing[i], 'a[img[@alt = "Export"]]/@href')[0].value;
		let id = bibtexLink.split('/')[2];
		items[id] = title.trim().replace(/\n\s*/g, ' ');
	}
	return items;
}

function scrapeBibtex(responseString, venue) {
	let translator = Zotero.loadTranslator("import");
	translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
	translator.setString(responseString);
	translator.setHandler("itemDone", function (obj, item) {
		item.attachments.push({
			url: item.url,
			title: 'Full Text PDF',
			mimeType: 'application/pdf'
		});
		let publicationTitle = item.publicationTitle;
		if (!publicationTitle.includes('Student') 
				&& !publicationTitle.includes('Demonstration')
				&& !publicationTitle.includes('Tutorial')) {
			if (venue.includes('*SEMEVAL')) {
				if (publicationTitle.includes('SENSEVAL')) {
					venue = 'SENSEVAL';
				} else if (publicationTitle.includes('Evaluation') && !publicationTitle.includes('Joint')) {
					venue = 'SemEval';
				} else if (!publicationTitle.includes('Evaluation') && publicationTitle.includes('Joint')) {
					venue = '*SEM';
				} else if (publicationTitle.includes('Volume 1') && publicationTitle.includes('Volume 2')) {
					venue = '*SEM/SemEval';
				} else if (publicationTitle.includes('SemEval')) {
					venue = 'SemEval';
				} else {
					venue = '*SEM';
				}
			}
			if (!venue.includes('WS')) {
				item.conferenceName = venue;
			}
		}
		
		delete item.itemID;
		item.complete();
	});
	translator.translate();
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://aclanthology.coli.uni-saarland.de/events/cl-2018",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://aclanthology.coli.uni-saarland.de/papers/J18-1002/j18-1002",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "On the Derivational Entropy of Left-to-Right Probabilistic Finite-State Automata and Hidden Markov Models",
				"creators": [
					{
						"firstName": "Joan Andreu",
						"lastName": "Sánchez",
						"creatorType": "author"
					},
					{
						"firstName": "Martha Alicia",
						"lastName": "Rocha",
						"creatorType": "author"
					},
					{
						"firstName": "Verónica",
						"lastName": "Romero",
						"creatorType": "author"
					},
					{
						"firstName": "Mauricio",
						"lastName": "Villegas",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"DOI": "10.1162/COLI_a_00306",
				"issue": "1",
				"libraryCatalog": "ACLAnthology",
				"pages": "17–37",
				"publicationTitle": "Computational Linguistics",
				"url": "http://aclweb.org/anthology/J18-1002",
				"volume": "44",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"url": "https://aclanthology.coli.uni-saarland.de/papers/N18-3001/n18-3001",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Scalable Wide and Deep Learning for Computer Assisted Coding",
				"creators": [
					{
						"firstName": "Marilisa",
						"lastName": "Amoia",
						"creatorType": "author"
					},
					{
						"firstName": "Frank",
						"lastName": "Diehl",
						"creatorType": "author"
					},
					{
						"firstName": "Jesus",
						"lastName": "Gimenez",
						"creatorType": "author"
					},
					{
						"firstName": "Joel",
						"lastName": "Pinto",
						"creatorType": "author"
					},
					{
						"firstName": "Raphael",
						"lastName": "Schumann",
						"creatorType": "author"
					},
					{
						"firstName": "Fabian",
						"lastName": "Stemmer",
						"creatorType": "author"
					},
					{
						"firstName": "Paul",
						"lastName": "Vozila",
						"creatorType": "author"
					},
					{
						"firstName": "Yi",
						"lastName": "Zhang",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"DOI": "10.18653/v1/N18-3001",
				"conferenceName": "NAACL-HLT 2018",
				"libraryCatalog": "ACLAnthology",
				"pages": "1–7",
				"place": "New Orleans - Louisiana",
				"proceedingsTitle": "Proceedings of the 2018 Conference of the North American Chapter of the Association for Computational Linguistics: Human Language Technologies, Volume 3 (Industry Papers)",
				"publisher": "Association for Computational Linguistics",
				"url": "http://aclweb.org/anthology/N18-3001",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"url": "https://aclanthology.coli.uni-saarland.de/papers/N12-2003/n12-2003",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Beauty Before Age? Applying Subjectivity to Automatic English Adjective Ordering",
				"creators": [
					{
						"firstName": "Felix",
						"lastName": "Hill",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"libraryCatalog": "ACLAnthology",
				"pages": "11–16",
				"place": "Montrèal, Canada",
				"proceedingsTitle": "Proceedings of the NAACL HLT 2012 Student Research Workshop",
				"publisher": "Association for Computational Linguistics",
				"shortTitle": "Beauty Before Age?",
				"url": "http://aclweb.org/anthology/N12-2003",
				"attachments": [
					{
						"title": "Full Text PDF",
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
