{
	"translatorID": "25f28dc9-901f-4920-8b9a-5baefad91493",
	"label": "PubPub",
	"creator": "Abe Jellinek",
	"target": "/pub/[^/]+/release/\\d+|^https?://[^/]+\\.pubpub\\.org/search\\?",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 270,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-14 20:35:00"
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


function detectWeb(doc, url) {
	if (!doc.querySelector('.built-on > a[href*="pubpub"]')
		&& !url.includes('pubpub.org')) {
		return false;
	}
	
	// this won't match search result pages not hosted on pubpub.org, but the
	// results URL (/search?q=) is just too generic to justify including it in
	// the target.
	if (getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (doc.querySelector('#search-container')) {
		Z.monitorDOMChanges(doc.querySelector('#search-container'));
	}
	else if (doc.querySelector('meta[name="citation_title"]')) {
		if (doc.querySelector('meta[name="citation_inbook_title"]')) {
			return "bookSection";
		}
		// this is, of course, a bad heuristic, but it's unlikely to lead to
		// false positives and PubPub doesn't give us anything better.
		else if (attr(doc, 'meta[property="og:site_name"]', 'content').endsWith('Rxiv')) {
			return "report";
		}
		else {
			return "journalArticle";
		}
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.title > a.pub-title');
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
		if (!item.publicationTitle) {
			item.publicationTitle = attr(doc, 'meta[property="og:site_name"]', 'content');
		}

		if (item.publicationTitle.endsWith('Rxiv')) {
			item.itemType = 'report';
			item.extra = (item.extra || '') + '\nType: article';
		}
		
		if (item.itemType == 'bookSection' && item.bookTitle) {
			delete item.publicationTitle;
		}
		
		if (item.publisher == 'PubPub') {
			delete item.publisher;
		}
		
		delete item.institution;
		delete item.company;
		delete item.label;
		delete item.distributor;
		
		if (item.date) {
			item.date = ZU.strToISO(item.date);
		}
		
		if (item.ISSN == ',') {
			delete item.ISSN;
		}
		
		if (item.attachments.length > 1) {
			item.attachments = item.attachments.filter(at => at.title != 'Snapshot');
		}
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = detectWeb(doc, url);
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://cursor.pubpub.org/pub/teuchert-isenheimeraltar/release/5",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Christus als Infektionstoter: Der Isenheimer Altar und die Corona-Pandemie",
				"creators": [
					{
						"firstName": "Lisanne",
						"lastName": "Teuchert",
						"creatorType": "author"
					}
				],
				"date": "2020-04-03",
				"abstractNote": "Von der Corona-Krise aus fällt ein neuer Blick auf den Isenheimer Altar: Der Gekreuzigte trägt Spuren einer Infektionskrankheit, der Pest. Der Artikel erklärt den Hintergrund und stellt Gedanken zur theologischen Rezeption heute an.",
				"language": "en",
				"libraryCatalog": "cursor.pubpub.org",
				"publicationTitle": "Cursor_ Zeitschrift für explorative Theologie",
				"shortTitle": "Christus als Infektionstoter",
				"url": "https://cursor.pubpub.org/pub/teuchert-isenheimeraltar/release/5",
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
		"url": "https://hdsr.mitpress.mit.edu/pub/w075glo6/release/2?readingCollection=c6a3a10e",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Designing for Interactive Exploratory Data Analysis Requires Theories of Graphical Inference",
				"creators": [
					{
						"firstName": "Jessica",
						"lastName": "Hullman",
						"creatorType": "author"
					},
					{
						"firstName": "Andrew",
						"lastName": "Gelman",
						"creatorType": "author"
					}
				],
				"date": "2021-07-30",
				"DOI": "10.1162/99608f92.3ab8a587",
				"abstractNote": "Research and development in computer science and statistics have produced increasingly sophisticated software interfaces for interactive and exploratory analysis, optimized for easy pattern finding and data exposure. But design philosophies that emphasize exploration over other phases of analysis risk confusing a need for flexibility with a conclusion that exploratory visual analysis is inherently “model free” and cannot be formalized. We describe how without a grounding in theories of human statistical inference, research in exploratory visual analysis can lead to contradictory interface objectives and representations of uncertainty that can discourage users from drawing valid inferences. We discuss how the concept of a model check in a Bayesian statistical framework unites exploratory and confirmatory analysis, and how this understanding relates to other proposed theories of graphical inference. Viewing interactive analysis as driven by model checks suggests new directions for software and empirical research around exploratory and visual analysis. For example, systems might enable specifying and explicitly comparing data to null and other reference distributions and better representations of uncertainty. Implications of Bayesian and other theories of graphical inference can be tested against outcomes of interactive analysis by people to drive theory development.",
				"language": "en",
				"libraryCatalog": "hdsr.mitpress.mit.edu",
				"publicationTitle": "Harvard Data Science Review",
				"url": "https://hdsr.mitpress.mit.edu/pub/w075glo6/release/2",
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
		"url": "https://www.crimrxiv.com/pub/xbjbnyb8/release/1?readingCollection=e3ec78b4",
		"items": [
			{
				"itemType": "report",
				"title": "The Impact of COVID-19 on the Spatial Distribution of Shooting Violence in Buffalo, NY",
				"creators": [
					{
						"firstName": "Gregory",
						"lastName": "Drake",
						"creatorType": "author"
					},
					{
						"firstName": "Andrew",
						"lastName": "Wheeler",
						"creatorType": "author"
					},
					{
						"firstName": "Dae-Young",
						"lastName": "Kim",
						"creatorType": "author"
					},
					{
						"firstName": "Scott W.",
						"lastName": "Phillips",
						"creatorType": "author"
					},
					{
						"firstName": "Kathryn",
						"lastName": "Mendolera",
						"creatorType": "author"
					}
				],
				"date": "2021-09-01",
				"abstractNote": "Objectives: This paper examines the extent to which hotspots of shooting violence changed following the emergence of Covid-19. Methods: This analysis uses Andresen's Spatial Point Pattern test, correcting for multiple comparisons, on a 10-year sample of geocoded shooting data from Buffalo New York. Results: This work finds zero micro grid cells are statistically different from pre to post Covid stay at home orders and instead that the observed rise in shootings in the sample appears to be a consistent proportional increase across the city. Conclusions: These findings provide law enforcement with useful information about how to respond to the recent rise in shooting violence but additional work is needed to better understand what, among a number of competing theories, is driving the increase.",
				"extra": "DOI: 10.21428/cb6ab371.e187aede\nType: article",
				"language": "en",
				"libraryCatalog": "www.crimrxiv.com",
				"url": "https://www.crimrxiv.com/pub/xbjbnyb8/release/1",
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
		"url": "https://www.crimrxiv.com/pub/auhg43cx/release/1",
		"items": [
			{
				"itemType": "report",
				"title": "Fault lines of food fraud: key issues in research and policy",
				"creators": [
					{
						"firstName": "Nicholas",
						"lastName": "Lord",
						"creatorType": "author"
					},
					{
						"firstName": "Cecilia Flores",
						"lastName": "Elizondo",
						"creatorType": "author"
					},
					{
						"firstName": "Jon",
						"lastName": "Davies",
						"creatorType": "author"
					},
					{
						"firstName": "Jon",
						"lastName": "Spencer",
						"creatorType": "author"
					}
				],
				"date": "2021-09-14",
				"extra": "Type: article",
				"language": "en",
				"libraryCatalog": "www.crimrxiv.com",
				"shortTitle": "Fault lines of food fraud",
				"url": "https://www.crimrxiv.com/pub/auhg43cx/release/1",
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
		"url": "https://wip.mitpress.mit.edu/pub/pnxgvubq/release/2",
		"items": [
			{
				"itemType": "bookSection",
				"title": "2. Data Cooperatives",
				"creators": [
					{
						"firstName": "Alex",
						"lastName": "Pentland",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas",
						"lastName": "Hardjono",
						"creatorType": "author"
					}
				],
				"date": "2020-04-30",
				"bookTitle": "Building the New Economy",
				"language": "en",
				"libraryCatalog": "wip.mitpress.mit.edu",
				"url": "https://wip.mitpress.mit.edu/pub/pnxgvubq/release/2",
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
		"url": "https://www.sustainabilityscience.org/pub/eto8m67b/release/2",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Capacity to Promote Equity",
				"creators": [
					{
						"firstName": "Alicia G.",
						"lastName": "Harley",
						"creatorType": "author"
					},
					{
						"firstName": "William C.",
						"lastName": "Clark",
						"creatorType": "author"
					}
				],
				"date": "2020-09-10",
				"abstractNote": "Achieving fair or equitable distribution of the fruits of the earth’s resources both within and between generations is a central objective of sustainable development. Accelerating progress requires above all more effective means for empowering those who are now losing out.",
				"bookTitle": "Sustainability Science: A guide for researchers",
				"extra": "DOI: 10.21428/f8d85a02.e1e84ad7",
				"language": "en",
				"libraryCatalog": "www.sustainabilityscience.org",
				"url": "https://www.sustainabilityscience.org/pub/eto8m67b/release/2",
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
		"url": "https://pandemics-and-games-essay-jam.pubpub.org/pub/xj5pgzcn/release/2",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Void: Turgor and Porousness",
				"creators": [
					{
						"firstName": "Andrew",
						"lastName": "McCarrell",
						"creatorType": "author"
					}
				],
				"date": "2021-01-10",
				"language": "en",
				"libraryCatalog": "pandemics-and-games-essay-jam.pubpub.org",
				"publicationTitle": "Pandemics and Games Essay Jam",
				"shortTitle": "The Void",
				"url": "https://pandemics-and-games-essay-jam.pubpub.org/pub/xj5pgzcn/release/2",
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
		"url": "https://covid-19.mitpress.mit.edu/pub/m72dtwsg/release/1",
		"items": [
			{
				"itemType": "bookSection",
				"title": "1. Theory and Exegesis: On Health and the Body Politic",
				"creators": [
					{
						"lastName": "Andrew T. Price-Smith",
						"creatorType": "author"
					}
				],
				"date": "2020-04-16",
				"ISBN": "9780262162487",
				"bookTitle": "Contagion and Chaos",
				"language": "en",
				"libraryCatalog": "covid-19.mitpress.mit.edu",
				"shortTitle": "1. Theory and Exegesis",
				"url": "https://covid-19.mitpress.mit.edu/pub/m72dtwsg/release/1",
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
		"url": "https://beexml.pubpub.org/pub/sz2ok365/release/1",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Bee Corp’s Method of Hive Strength Assessment for Pollination Effectiveness",
				"creators": [
					{
						"firstName": "Ellie",
						"lastName": "Symes",
						"creatorType": "author"
					},
					{
						"firstName": "Joseph",
						"lastName": "Cazier",
						"creatorType": "author"
					}
				],
				"date": "2021-04-26",
				"language": "en",
				"libraryCatalog": "beexml.pubpub.org",
				"publicationTitle": "Bee XML Journal",
				"url": "https://beexml.pubpub.org/pub/sz2ok365/release/1",
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
		"url": "https://association.aap.cornell.edu/pub/oefofyds/release/2",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Reverse Turing Test",
				"creators": [
					{
						"firstName": "Sabrina",
						"lastName": "Haertig",
						"creatorType": "author"
					}
				],
				"date": "2020-05-28",
				"language": "en",
				"libraryCatalog": "association.aap.cornell.edu",
				"publicationTitle": "ASSOCIATION",
				"url": "https://association.aap.cornell.edu/pub/oefofyds/release/2",
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
		"url": "https://cursor.pubpub.org/search?q=sprache",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
