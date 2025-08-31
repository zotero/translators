{
	"translatorID": "625c6435-e235-4402-a48f-3095a9c1a09c",
	"label": "DBLP Computer Science Bibliography",
	"creator": "Sebastian Karcher, Philipp Zumstein, and Abe Jellinek",
	"target": "^https?://(www\\.)?(dblp\\d?(\\.org|\\.uni-trier\\.de/|\\.dagstuhl\\.de/))",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-04-20 13:37:43"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2011-2021 Sebastian Karcher, Philipp Zumstein, and Abe Jellinek

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
	if (doc.querySelector('#bibtex-section')) {
		if (url.includes('journals')) {
			return "journalArticle";
		}
		else if (url.includes('conf')) {
			return "conferencePaper";
		}
		else if (url.includes('series') || url.includes('reference')) {
			return "bookSection";
		}
		else if (url.includes('books')) {
			return "book";
		}
		else if (url.includes('phd')) {
			return "thesis";
		}
		else { // generic fallback
			return "journalArticle";
		}
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}


function scrape(doc, _url) {
	let allData = doc.querySelectorAll('#bibtex-section > pre');
	let firstData = allData[0];
	var firstDataText = firstData.textContent.replace(/ ee\s*=/, " url ="); // e.g. ee = {http://dx.doi.org/10.1007/978-3-319-00035-0_37},

	// conferencePapers and bookSections are linked in DBLP
	// with the crossref field to the second BibTeX entry
	// for the proceeding or book. In these cases the following
	// lines (if-part) are handling the second entry and extracting
	// relevant fields and save it (later) to the main entry.
	var secondData = allData[1];
	if (secondData) {
		var secondDataText = secondData.textContent;

		var trans = Zotero.loadTranslator('import');
		trans.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4');// https://github.com/zotero/translators/blob/master/BibTeX.js
		trans.setString(secondDataText);

		trans.setHandler('itemDone', function (obj, item) {
			scrapeMainPart(firstDataText, item);
		});

		trans.translate();
	}
	else { // if there are no secondData: scrape without additional data
		scrapeMainPart(firstDataText, null);
	}
}


function scrapeMainPart(firstDataText, secondDataItem) {
	// scrape from the firstDataText and if secondDataItem
	// is not null, add/update these information
	var trans = Zotero.loadTranslator('import');
	trans.setTranslator('9cb70025-a888-4a29-a210-93ec52da40d4');// https://github.com/zotero/translators/blob/master/BibTeX.js
	trans.setString(firstDataText);

	trans.setHandler('itemDone', function (obj, item) {
		if (secondDataItem) {
			if (secondDataItem.title && item.itemType == "conferencePaper") item.proceedingsTitle = secondDataItem.title;
			if (secondDataItem.title && item.itemType == "bookSection") item.bookTitle = secondDataItem.title;
			if (secondDataItem.creators && secondDataItem.creators.length > 0) item.creators = item.creators.concat(secondDataItem.creators);
			if (secondDataItem.publisher && !item.publisher) item.publisher = secondDataItem.publisher;
			if (secondDataItem.series && !item.series) item.series = secondDataItem.series;
			if (secondDataItem.volume && !item.volume) item.volume = secondDataItem.volume;
			if (secondDataItem.ISBN && !item.ISBN) item.ISBN = secondDataItem.ISBN;
		}
		
		// Assume that the url contains an doi. If the item does not
		// yet contain a doi, then save the doi and delete the url.
		// If the item contains the doi corresponding to the url
		// then just delete the url and keep the doi.
		if (item.url && /^https?:\/\/(?:dx\.)?doi\.org\/10\./i.test(item.url)) {
			var doi = ZU.cleanDOI(item.url);
			if (doi && (!item.DOI || item.DOI == doi)) {
				item.DOI = doi;
				delete item.url;
			}
		}
		
		item.complete();
	});

	trans.translate();
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.entry');
	for (let row of rows) {
		let href = attr(row, 'a[href*="view=bibtex"]', 'href');
		let title = text(row, '.title');
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


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://dblp.org/rec/journals/cssc/XuY12.html?view=bibtex",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "On the Preliminary Test Backfitting and Speckman Estimators in Partially Linear Models and Numerical Comparisons",
				"creators": [
					{
						"firstName": "Jianwen",
						"lastName": "Xu",
						"creatorType": "author"
					},
					{
						"firstName": "Hu",
						"lastName": "Yang",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"DOI": "10.1080/03610918.2011.588356",
				"issue": "3",
				"itemID": "DBLP:journals/cssc/XuY12",
				"libraryCatalog": "DBLP Computer Science Bibliography",
				"pages": "327–341",
				"publicationTitle": "Commun. Stat. Simul. Comput.",
				"volume": "41",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dblp.org/rec/conf/ats/KochteZBIWHCP10.html?view=bibtex",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Efficient Simulation of Structural Faults for the Reliability Evaluation at System-Level",
				"creators": [
					{
						"firstName": "Michael A.",
						"lastName": "Kochte",
						"creatorType": "author"
					},
					{
						"firstName": "Christian G.",
						"lastName": "Zoellin",
						"creatorType": "author"
					},
					{
						"firstName": "Rafal",
						"lastName": "Baranowski",
						"creatorType": "author"
					},
					{
						"firstName": "Michael E.",
						"lastName": "Imhof",
						"creatorType": "author"
					},
					{
						"firstName": "Hans-Joachim",
						"lastName": "Wunderlich",
						"creatorType": "author"
					},
					{
						"firstName": "Nadereh",
						"lastName": "Hatami",
						"creatorType": "author"
					},
					{
						"firstName": "Stefano Di",
						"lastName": "Carlo",
						"creatorType": "author"
					},
					{
						"firstName": "Paolo",
						"lastName": "Prinetto",
						"creatorType": "author"
					}
				],
				"date": "2010",
				"DOI": "10.1109/ATS.2010.10",
				"itemID": "DBLP:conf/ats/KochteZBIWHCP10",
				"libraryCatalog": "DBLP Computer Science Bibliography",
				"pages": "3–8",
				"proceedingsTitle": "Proceedings of the 19th IEEE Asian Test Symposium, ATS 2010, 1-4 December 2010, Shanghai, China",
				"publisher": "IEEE Computer Society",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dblp1.uni-trier.de/db/journals/tois/tois25.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dblp.uni-trier.de/db/journals/tods/tods31.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dblp.dagstuhl.de/pid/k/DonaldEKnuth.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dblp.uni-trier.de/rec/conf/approx/SchederT13.html?view=bibtex",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "On the Average Sensitivity and Density of k-CNF Formulas",
				"creators": [
					{
						"firstName": "Dominik",
						"lastName": "Scheder",
						"creatorType": "author"
					},
					{
						"firstName": "Li-Yang",
						"lastName": "Tan",
						"creatorType": "author"
					},
					{
						"firstName": "Prasad",
						"lastName": "Raghavendra",
						"creatorType": "editor"
					},
					{
						"firstName": "Sofya",
						"lastName": "Raskhodnikova",
						"creatorType": "editor"
					},
					{
						"firstName": "Klaus",
						"lastName": "Jansen",
						"creatorType": "editor"
					},
					{
						"firstName": "José D. P.",
						"lastName": "Rolim",
						"creatorType": "editor"
					}
				],
				"date": "2013",
				"DOI": "10.1007/978-3-642-40328-6_47",
				"itemID": "DBLP:conf/approx/SchederT13",
				"libraryCatalog": "DBLP Computer Science Bibliography",
				"pages": "683–698",
				"proceedingsTitle": "Approximation, Randomization, and Combinatorial Optimization. Algorithms and Techniques - 16th International Workshop, APPROX 2013, and 17th International Workshop, RANDOM 2013, Berkeley, CA, USA, August 21-23, 2013. Proceedings",
				"publisher": "Springer",
				"series": "Lecture Notes in Computer Science",
				"url": "https://doi.org/10.1007/978-3-642-40328-6\\_47",
				"volume": "8096",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dblp.org/rec/conf/iclr/DasMYTM19.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dblp.org/search?q=zotero",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dblp.org/db/series/ceurws/ceurws2600-2699.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dblp.org/db/conf/ircdl/viperc2020.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dblp.org/rec/conf/iclr/DasMYTM19.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dblp.org/rec/conf/iclr/DasMYTM19.html?view=bibtex",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Building Dynamic Knowledge Graphs from Text using Machine Reading Comprehension",
				"creators": [
					{
						"firstName": "Rajarshi",
						"lastName": "Das",
						"creatorType": "author"
					},
					{
						"firstName": "Tsendsuren",
						"lastName": "Munkhdalai",
						"creatorType": "author"
					},
					{
						"firstName": "Xingdi",
						"lastName": "Yuan",
						"creatorType": "author"
					},
					{
						"firstName": "Adam",
						"lastName": "Trischler",
						"creatorType": "author"
					},
					{
						"firstName": "Andrew",
						"lastName": "McCallum",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"itemID": "DBLP:conf/iclr/DasMYTM19",
				"libraryCatalog": "DBLP Computer Science Bibliography",
				"proceedingsTitle": "7th International Conference on Learning Representations, ICLR 2019, New Orleans, LA, USA, May 6-9, 2019",
				"publisher": "OpenReview.net",
				"url": "https://openreview.net/forum?id=S1lhbnRqF7",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dblp.org/rec/reference/choice/LangX16.html?view=bibtex&param=2",
		"detectedItemType": "bookSection",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Voting in Combinatorial Domains",
				"creators": [
					{
						"firstName": "Jérôme",
						"lastName": "Lang",
						"creatorType": "author"
					},
					{
						"firstName": "Lirong",
						"lastName": "Xia",
						"creatorType": "author"
					},
					{
						"firstName": "Felix",
						"lastName": "Brandt",
						"creatorType": "editor"
					},
					{
						"firstName": "Vincent",
						"lastName": "Conitzer",
						"creatorType": "editor"
					},
					{
						"firstName": "Ulle",
						"lastName": "Endriss",
						"creatorType": "editor"
					},
					{
						"firstName": "Jérôme",
						"lastName": "Lang",
						"creatorType": "editor"
					},
					{
						"firstName": "Ariel D.",
						"lastName": "Procaccia",
						"creatorType": "editor"
					}
				],
				"date": "2016",
				"ISBN": "9781107446984",
				"bookTitle": "Handbook of Computational Social Choice",
				"extra": "DOI: 10.1017/CBO9781107446984.010",
				"itemID": "DBLP:reference/choice/LangX16",
				"libraryCatalog": "DBLP Computer Science Bibliography",
				"pages": "197–222",
				"publisher": "Cambridge University Press",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
