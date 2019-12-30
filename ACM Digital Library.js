{
	"translatorID": "f3f092bf-ae09-4be6-8855-a22ddd817925",
	"label": "ACM Digital Library",
	"creator": "Guy Aglionby",
	"target": "^https://dl\\.acm\\.org/(doi|do|profile|toc|topic|keyword|action/doSearch|acmbooks)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-12-31 14:12:38"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Guy Aglionby
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
	if ((url.includes('/doi/') || url.includes('/do/')) && !url.includes('/doi/proceedings')) {
		let extractedContext = doc.querySelector('meta[name=pbContext]').content;
		let subtypeRegex = /csubtype:string:(\w+)/;
		let subtype = extractedContext.match(subtypeRegex)[1].toLowerCase();

		if (subtype == 'conference') {
			return 'conferencePaper';
		}
		else if (subtype == 'journal' || subtype == 'magazine' || subtype == 'newsletter') {
			return 'journalArticle';
		}
		else if (subtype == 'report' || subtype == 'rfc') {
			return 'report';
		}
		else if (subtype == 'thesis') {
			return 'thesis';
		}
		else if (subtype == 'software') {
			return 'computerProgram';
		}
		else if (subtype == 'dataset') {
			return 'document';
		}
		else if (subtype == 'book') {
			let bookTypeRegex = /page:string:([\w ]+)/;
			let bookType = extractedContext.match(bookTypeRegex)[1].toLowerCase();
			if (bookType == 'book page') {
				return 'book';
			}
			else {
				return 'bookSection';
			}
		}
	}
	else if (getSearchResults(doc, false)) {
		return 'multiple';
	}
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (selected) {
			if (selected) {
				ZU.processDocuments(Object.keys(selected), scrape);
			}
		});
	}
	else {
		scrape(doc);
	}
}

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	let results = doc.querySelectorAll('h5.issue-item__title a');
	
	for (let i = 0; i < results.length; i++) {
		let url = results[i].href;
		let title = ZU.trimInternal(results[i].textContent);
		if (!title || !url) {
			continue;
		}
		
		if (!(url.includes('/doi/') || url.includes('/do/')) || url.includes('/doi/proceedings')) {
			continue;
		}
		
		if (checkOnly) {
			return true;
		}
		found = true;
		items[url] = title;
	}
	
	return found ? items : false;
}

function scrape(doc) {
	let extractedContext = doc.querySelector('meta[name=pbContext]').content;
	let doiRegex = /article:article:doi\\:([^;]+)/;
	let doi = extractedContext.match(doiRegex)[1].toLowerCase();
	let lookupEndpoint = 'https://dl.acm.org/action/exportCiteProcCitation?targetFile=custom-bibtex&format=bibTex&dois=';
	ZU.doGet(lookupEndpoint + doi, function (text) {
		let json = JSON.parse(text);
		let cslItem = json.items[0][doi];
		cslItem.type = cslItem.type.toLowerCase().replace('_', '-');
		
		// For theses, the advisor is indicated as an editor in CSL which
		// ZU.itemFromCSLJSON incorrectly extracts as an author.
		if (cslItem.type == 'thesis') {
			delete cslItem.editor;
		}
		
		let item = new Zotero.Item();
		ZU.itemFromCSLJSON(item, cslItem);
		
		let abstractElements = doc.querySelectorAll('div.article__abstract p, div.abstractSection p');
		let abstract = Array.from(abstractElements).map(function (element) {
			return element.textContent;
		}).join(' ');
		if (abstract.length && abstract.toLowerCase() != 'no abstract available.') {
			item.abstractNote = ZU.trimInternal(abstract);
		}
		
		let pdfElement = doc.querySelector('a[title=PDF]');
		if (pdfElement) {
			item.attachments.push({
				url: pdfElement.href,
				title: 'Full Text PDF',
				mimeType: 'application/pdf'
			});
		}
		
		if (item.itemType == 'journalArticle') {
			// Publication name in the CSL is shortened; scrape from page to get full title.
			let expandedTitle = doc.querySelector('span.epub-section__title');
			if (expandedTitle) {
				item.publicationTitle = expandedTitle.textContent;
			}
		}
		
		if (item.itemType == 'bookSection' && item.creators.length == 0) {
			// A chapter of a book is extracted as a bookSection, but the
			// authors are not included in the CSL so we must scrape them.
			// e.g. https://dl.acm.org/doi/abs/10.5555/3336323.C5474411
			let authorElements = doc.querySelectorAll('div.citation span.loa__author-name');
			authorElements.forEach(function (element) {
				item.creators.push(ZU.cleanAuthor(element.textContent));
			});
		}
		
		if (!item.ISBN && cslItem.ISBN) {
			if (!item.extra) {
				item.extra = '';
			}
			let isbnLength = cslItem.ISBN.replace('-', '').length;
			item.extra += '\nISBN-' + isbnLength + ': ' + cslItem.ISBN;
		}
		
		let pagesElement = doc.querySelector('div.pages-info span');
		if (pagesElement) {
			item.numPages = pagesElement.textContent;
		}
		
		let tagElements = doc.querySelectorAll('div.tags-widget a');
		tagElements.forEach(function (tag) {
			item.tags.push(tag.textContent);
		});
		
		item.complete();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://dl.acm.org/doi/abs/10.1145/1596655.1596682",
		"defer": true,
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Tracking Performance Across Software Revisions",
				"creators": [
					{
						"firstName": "Nagy",
						"lastName": "Mostafa",
						"creatorType": "author"
					},
					{
						"firstName": "Chandra",
						"lastName": "Krintz",
						"creatorType": "author"
					}
				],
				"date": "2009",
				"DOI": "10.1145/1596655.1596682",
				"ISBN": "9781605585987",
				"abstractNote": "Repository-based revision control systems such as CVS, RCS, Subversion, and GIT, are extremely useful tools that enable software developers to concurrently modify source code, manage conflicting changes, and commit updates as new revisions. Such systems facilitate collaboration with and concurrent contribution to shared source code by large developer bases. In this work, we investigate a framework for \"performance-aware\" repository and revision control for Java programs. Our system automatically tracks behavioral differences across revisions to provide developers with feedback as to how their change impacts performance of the application. It does so as part of the repository commit process by profiling the performance of the program or component, and performing automatic analyses that identify differences in the dynamic behavior or performance between two code revisions. In this paper, we present our system that is based upon and extends prior work on calling context tree (CCT) profiling and performance differencing. Our framework couples the use of precise CCT information annotated with performance metrics and call-site information, with a simple tree comparison technique and novel heuristics that together target the cause of performance differences between code revisions without knowledge of program semantics. We evaluate the efficacy of the framework using a number of open source Java applications and present a case study in which we use the framework to distinguish two revisions of the popular FindBugs application.",
				"extra": "event-place: Calgary, Alberta, Canada",
				"itemID": "Mostafa:2009:TPA:1596655.1596682",
				"libraryCatalog": "ACM Digital Library",
				"pages": "162–171",
				"place": "New York, NY, USA",
				"proceedingsTitle": "Proceedings of the 7th International Conference on Principles and Practice of Programming in Java",
				"publisher": "ACM",
				"series": "PPPJ '09",
				"url": "http://doi.acm.org/10.1145/1596655.1596682",
				"attachments": [
					{
						"title": "ACM Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "calling context tree"
					},
					{
						"tag": "performance-aware revision control"
					},
					{
						"tag": "profiling"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dl.acm.org/doi/10.5555/1717186",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "Version Control with Git: Powerful Tools and Techniques for Collaborative Software Development",
				"creators": [
					{
						"firstName": "Jon",
						"lastName": "Loeliger",
						"creatorType": "author"
					}
				],
				"date": "2009",
				"ISBN": "9780596520120",
				"abstractNote": "Version Control with Git takes you step-by-step through ways to track, merge, and manage software projects, using this highly flexible, open source version control system. Git permits virtually an infinite variety of methods for development and collaboration. Created by Linus Torvalds to manage development of the Linux kernel, it's become the principal tool for distributed version control. But Git's flexibility also means that some users don't understand how to use it to their best advantage. Version Control with Git offers tutorials on the most effective ways to use it, as well as friendly yet rigorous advice to help you navigate Git's many functions. With this book, you will: Learn how to use Git in several real-world development environments Gain insight into Git's common-use cases, initial tasks, and basic functions Understand how to use Git for both centralized and distributed version control Use Git to manage patches, diffs, merges, and conflicts Acquire advanced techniques such as rebasing, hooks, and ways to handle submodules (subprojects) Learn how to use Git with Subversion Git has earned the respect of developers around the world. Find out how you can benefit from this amazing tool with Version Control with Git.",
				"edition": "1st",
				"itemID": "Loeliger:2009:VCG:1717186",
				"libraryCatalog": "ACM Digital Library",
				"publisher": "O'Reilly Media, Inc.",
				"shortTitle": "Version Control with Git",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dl.acm.org/doi/abs/10.1023/A:1008286901817",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Simulation Techniques for the Manufacturing Test of MCMs",
				"creators": [
					{
						"firstName": "Mick",
						"lastName": "Tegethoff",
						"creatorType": "author"
					},
					{
						"firstName": "Tom",
						"lastName": "Chen",
						"creatorType": "author"
					}
				],
				"date": "February 1997",
				"DOI": "10.1023/A:1008286901817",
				"ISSN": "0923-8174",
				"abstractNote": "Simulation techniques used in the Manufacturing Test SIMulator\n(MTSIM) are described. MTSIM is a Concurrent Engineering tool used to\nsimulate the manufacturing test and\nrepair aspects of boards and MCMs from design concept \nthrough manufacturing release. MTSIM helps designers select assembly\nprocess, specify Design For Test (DFT) features, select board test\ncoverage, specify ASIC defect level goals, establish product\nfeasibility, and predict manufacturing quality and cost goals. A new\nyield model for boards and MCMs which accounts for the\nclustering of solder defects is introduced and used to\npredict the yield at each test step. In addition, MTSIM\nestimates the average number of defects per board detected at each\ntest step, and estimates costs incurred in test execution, fault\nisolation and repair. MTSIM models were validated with\nhigh performance assemblies at Hewlett-Packard (HP).",
				"issue": "1-2",
				"itemID": "Tegethoff:1997:STM:254650.257486",
				"libraryCatalog": "ACM Digital Library",
				"pages": "137–149",
				"publicationTitle": "J. Electron. Test.",
				"url": "https://doi.org/10.1023/A:1008286901817",
				"volume": "10",
				"attachments": [],
				"tags": [
					{
						"tag": "DFM"
					},
					{
						"tag": "DFT"
					},
					{
						"tag": "MCM"
					},
					{
						"tag": "SMT"
					},
					{
						"tag": "board"
					},
					{
						"tag": "simulation"
					},
					{
						"tag": "test"
					},
					{
						"tag": "yield"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dl.acm.org/doi/abs/10.1145/258948.258973",
		"defer": true,
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Functional Reactive Animation",
				"creators": [
					{
						"firstName": "Conal",
						"lastName": "Elliott",
						"creatorType": "author"
					},
					{
						"firstName": "Paul",
						"lastName": "Hudak",
						"creatorType": "author"
					}
				],
				"date": "1997",
				"DOI": "10.1145/258948.258973",
				"ISBN": "9780897919180",
				"abstractNote": "Fran (Functional Reactive Animation) is a collection of data types and functions for composing richly interactive, multimedia animations. The key ideas in Fran are its notions of behaviors and events. Behaviors are time-varying, reactive values, while events are sets of arbitrarily complex conditions, carrying possibly rich information. Most traditional values can be treated as behaviors, and when images are thus treated, they become animations. Although these notions are captured as data types rather than a programming language, we provide them with a denotational semantics, including a proper treatment of real time, to guide reasoning and implementation. A method to effectively and efficiently perform event detection using interval analysis is also described, which relies on the partial information structure on the domain of event times. Fran has been implemented in Hugs, yielding surprisingly good performance for an interpreter-based system. Several examples are given, including the ability to describe physical phenomena involving gravity, springs, velocity, acceleration, etc. using ordinary differential equations.",
				"extra": "event-place: Amsterdam, The Netherlands",
				"itemID": "Elliott:1997:FRA:258948.258973",
				"libraryCatalog": "ACM Digital Library",
				"pages": "263–273",
				"place": "New York, NY, USA",
				"proceedingsTitle": "Proceedings of the Second ACM SIGPLAN International Conference on Functional Programming",
				"publisher": "ACM",
				"series": "ICFP '97",
				"url": "http://doi.acm.org/10.1145/258948.258973",
				"attachments": [
					{
						"title": "ACM Full Text PDF",
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
		"url": "https://dl.acm.org/doi/abs/10.1145/2566617",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Check-ins in “Blau Space”: Applying Blau’s Macrosociological Theory to Foursquare Check-ins from New York City",
				"creators": [
					{
						"firstName": "Kenneth",
						"lastName": "Joseph",
						"creatorType": "author"
					},
					{
						"firstName": "Kathleen M.",
						"lastName": "Carley",
						"creatorType": "author"
					},
					{
						"firstName": "Jason I.",
						"lastName": "Hong",
						"creatorType": "author"
					}
				],
				"date": "September 2014",
				"DOI": "10.1145/2566617",
				"ISSN": "2157-6904",
				"abstractNote": "Peter Blau was one of the first to define a latent social space and utilize it to provide concrete hypotheses. Blau defines social structure via social “parameters” (constraints). Actors that are closer together (more homogenous) in this social parameter space are more likely to interact. One of Blau’s most important hypotheses resulting from this work was that the consolidation of parameters could lead to isolated social groups. For example, the consolidation of race and income might lead to segregation. In the present work, we use Foursquare data from New York City to explore evidence of homogeneity along certain social parameters and consolidation that breeds social isolation in communities of locations checked in to by similar users. More specifically, we first test the extent to which communities detected via Latent Dirichlet Allocation are homogenous across a set of four social constraints—racial homophily, income homophily, personal interest homophily and physical space. Using a bootstrapping approach, we find that 14 (of 20) communities are statistically, and all but one qualitatively, homogenous along one of these social constraints, showing the relevance of Blau’s latent space model in venue communities determined via user check-in behavior. We then consider the extent to which communities with consolidated parameters, those homogenous on more than one parameter, represent socially isolated populations. We find communities homogenous on multiple parameters, including a homosexual community and a “hipster” community, that show support for Blau’s hypothesis that consolidation breeds social isolation. We consider these results in the context of mediated communication, in particular in the context of self-representation on social media.",
				"issue": "3",
				"itemID": "Joseph:2014:CLS:2648782.2566617",
				"libraryCatalog": "ACM Digital Library",
				"pages": "46:1–46:22",
				"publicationTitle": "ACM Trans. Intell. Syst. Technol.",
				"shortTitle": "Check-ins in “Blau Space”",
				"url": "http://doi.acm.org/10.1145/2566617",
				"volume": "5",
				"attachments": [
					{
						"title": "ACM Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					"Foursquare",
					"community structure",
					"latent social space",
					"urban analytics"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dl.acm.org/profile/81460641152/publications?Role=author",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dl.acm.org/toc/interactions/2016/24/1",
		"items": [
			{
				"itemType": "book",
				"title": "Interactions, January - February 2017",
				"creators": [
					{
						"firstName": "Ron",
						"lastName": "Wakkary",
						"creatorType": "editor"
					},
					{
						"firstName": "Erik",
						"lastName": "Stolterman",
						"creatorType": "editor"
					}
				],
				"date": "2016",
				"itemID": "Wakkary:2016:3029062",
				"libraryCatalog": "ACM Digital Library",
				"place": "New York, NY, USA",
				"publisher": "ACM",
				"volume": "24",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dl.acm.org/topic/ccs2012/10010147.10010341.10010342.10010343",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dl.acm.org/doi/proceedings/10.1145/2342541",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dl.acm.org/keyword/pesq",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dl.acm.org/action/doSearch?AllField=Zotero",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dl.acm.org/browse/book",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://dl.acm.org/subject/mobile",
		"items": "multiple"
	}
]
/** END TEST CASES **/
