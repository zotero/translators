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
	"lastUpdated": "2018-09-07 18:10:44"
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
			
			Object.keys(selected).forEach(function (id) {
				let bibtexUrl = ZU.xpath(doc, '//p[contains(., "' + id + '")]/a[img[@alt = "Export"]]')[0].href;
				ZU.doGet(bibtexUrl, function(responseString, responseObj) {
					scrapeBibtex(responseString);
				});
			});
		});
	} else if(url.endsWith('.bib')) {
		scrapeBibtex(ZU.xpath(doc, '//pre')[0].innerHTML);
	} else {
		let partialBibtexUrl = ZU.xpath(doc, '//a[contains(., "BibTeX")]/@href')[0].value;
		let bibtexUrl = WEBSITE_STUB + partialBibtexUrl;
		ZU.doGet(bibtexUrl, function(responseString, responseObj) {
			scrapeBibtex(responseString);
		});
	}
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
		items[id] = title;
	}
	return items;
}

function scrapeBibtex(responseString) {
	let translator = Zotero.loadTranslator("import");
	translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
	translator.setString(responseString);
	translator.setHandler("itemDone", function (obj, item) {
		item.attachments.push({
			url: item.url,
			title: 'Full Text PDF',
			mimeType: 'application/pdf'
		});
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
	}
]
/** END TEST CASES **/
