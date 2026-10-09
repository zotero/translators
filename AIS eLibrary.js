{
	"translatorID": "f2e7a5a0-c3b8-4e1d-9b2f-8d6e3a1c5b4d",
	"label": "AIS eLibrary",
	"creator": "José Fernandes (introfini@gmail.com)",
	"target": "^https?://aisel\\.aisnet\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-03-23 18:00:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright (C) 2026 Jose Fernandes (introfini@gmail.com)

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
	AIS eLibrary (AISeL) Translator for Zotero
	
	Handles three page types:
	1. Search results pages (/do/search/) - AJAX-rendered into #results-list
	2. Collection/browse pages (conference tracks, journal issues)
	3. Individual paper pages (with bepress_citation_* meta tags)
	
	AISeL runs on bepress Digital Commons. Search results are loaded via AJAX
	into div#results-list as div.result[role="listitem"] elements. Each result
	contains span.title > a (paper link), span.author, span.pub, span.year.
	
	INSTALLATION:
	1. In Zotero: Edit > Settings > Advanced > Files and Folders > Show Data Directory
	2. Copy this .js file into the "translators" subfolder
	3. Restart Zotero
	4. In Zotero Connector preferences: click "Update Translators" (or restart browser)
*/

// URL pattern for individual paper pages on AISeL
// Matches: /icis2024/track/6, /jais/vol25/iss3/2, /amcis2005/313, etc.
// Excludes: /do/search, /cgi/, /assets/, navigation pages
var defined_paper_re = /aisel\.aisnet\.org\/(?!do\/|cgi\/|assets\/|communities|authors|announcements|faq|about|help|accessibility|journals\/?$|conferences\/?$)[^?#]*\/\d+\/?$/;

function detectWeb(doc, url) {
	// 1. Search results page (AJAX-rendered)
	if (url.includes('/do/search')) {
		// Results load via AJAX after page load. Monitor the container
		// so Zotero re-runs detectWeb when results appear in the DOM.
		var queryResults = doc.getElementById('query-results');
		if (queryResults) {
			Zotero.monitorDOMChanges(queryResults, {childList: true, subtree: true});
		}
		var resultsList = doc.getElementById('results-list');
		if (resultsList) {
			Zotero.monitorDOMChanges(resultsList, {childList: true});
		}
		
		if (getSearchResults(doc, true)) {
			return 'multiple';
		}
		return false;
	}
	
	// 2. Individual paper page — bepress meta tags
	if (getMetaContent(doc, 'bepress_citation_title')
		|| getMetaContent(doc, 'citation_title')) {
		return getItemType(url);
	}
	
	// 3. Collection/browse pages with multiple papers
	if (getBrowseResults(doc, true)) {
		return 'multiple';
	}
	
	return false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) === 'multiple') {
		let items;
		if (url.includes('/do/search')) {
			items = getSearchResults(doc, false);
		}
		else {
			items = getBrowseResults(doc, false);
		}

		let selectedItems = await Zotero.selectItems(items);
		if (selectedItems) {
			for (let selectedURL of Object.keys(selectedItems)) {
				let selectedDoc = await requestDocument(selectedURL);
				scrape(selectedDoc, selectedURL);
			}
		}
	}
	else {
		scrape(doc, url);
	}
}

// ===========================================================================
//  SEARCH RESULTS — rendered by AJAX into #results-list
// ===========================================================================
// Structure:
//   <div id="results-list" role="list">
//     <div class="result query" role="listitem">
//       <p class="grid_10">
//         <span class="title"><a href="{url}">{title}</a></span>
//         <span class="author"><strong>{names}</strong></span>
//         <span class="pub"><a href="{url}">{publication}</a></span>
//         <span class="download pdf"><a href="{url}">Download</a></span>
//       </p>
//       <p class="grid_2 fr">
//         <span class="year"><strong>{date}</strong></span>
//       </p>
//     </div>
//   </div>

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	
	// Primary selector: the exact Digital Commons search result structure
	var results = doc.querySelectorAll(
		'#results-list div.result[role="listitem"], '
		+ '#results-list .result.query, '
		+ 'div[role="list"] div.result[role="listitem"]'
	);
	
	if (results.length) {
		for (var i = 0; i < results.length; i++) {
			var titleLink = results[i].querySelector('span.title a[href]');
			if (!titleLink) continue;
			
			var href = titleLink.href;
			var title = ZU.trimInternal(titleLink.textContent);
			if (!href || !title || title.length < 5) continue;
			
			if (checkOnly) return true;
			found = true;
			items[href] = title;
		}
		return found ? items : false;
	}
	
	// Fallback: scan for any paper links in #main or #query-results
	var container = doc.querySelector('#query-results, #results-list, #main');
	if (!container) return false;
	
	var links = container.querySelectorAll('a[href]');
	var seen = {};
	
	for (var j = 0; j < links.length; j++) {
		var linkHref = links[j].href;
		var linkTitle = ZU.trimInternal(links[j].textContent);
		
		if (!linkHref || !linkTitle) continue;
		if (!isPaperURL(linkHref)) continue;
		if (linkTitle.length < 10) continue;
		if (/^(Download|PDF|Save|Search|Browse|Next|Prev|Home|About|FAQ|Login|Join|Follow)\b/i.test(linkTitle)) continue;
		
		var norm = linkHref.replace(/\/+$/, '');
		if (seen[norm]) continue;
		
		if (checkOnly) return true;
		seen[norm] = true;
		found = true;
		items[linkHref] = linkTitle;
	}
	
	return found ? items : false;
}

// ===========================================================================
//  BROWSE/COLLECTION PAGES
// ===========================================================================

function getBrowseResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var count = 0;
	var seen = {};
	
	var mainContent = doc.querySelector('#main, #content, #series-home, body');
	if (!mainContent) return false;
	
	var links = mainContent.querySelectorAll('a[href]');
	
	for (var i = 0; i < links.length; i++) {
		var href = links[i].href;
		var title = ZU.trimInternal(links[i].textContent);
		
		if (!href || !title) continue;
		if (!isPaperURL(href)) continue;
		if (title.length < 15) continue;
		if (/^(Download|PDF|Subscribe|RSS|Search|Browse|Next|Prev|Home|About|FAQ|Login|Join|Follow|Notify|All Content|Authors|eLibrary|AIS Home|JAIS|CAIS|TRR|THCI|MISQE|PAJAIS|Previous Event|Next Event|Advanced Search)\b/i.test(title)) continue;
		
		var norm = href.replace(/\/+$/, '');
		if (seen[norm]) continue;
		
		if (checkOnly) return true;
		seen[norm] = true;
		found = true;
		count++;
		items[href] = title;
	}
	
	if (count < 2) return false;
	return found ? items : false;
}

// ===========================================================================
//  HELPERS
// ===========================================================================

function isPaperURL(url) {
	if (!url) return false;
	return defined_paper_re.test(url);
}

function getItemType(url) {
	if (/\/(jais|cais|misqe|thci|trr|pajais|ajis|jmwais|sjis|jistem|reclasi)\//i.test(url)) {
		return 'journalArticle';
	}
	if (/\/vol\d+\/iss\d+\//i.test(url)) {
		return 'journalArticle';
	}
	return 'conferencePaper';
}

// ===========================================================================
//  SCRAPE INDIVIDUAL PAPER PAGE
// ===========================================================================

function scrape(doc, url) {
	url = url || doc.location.href;
	var title = getMetaContent(doc, 'bepress_citation_title')
		|| getMetaContent(doc, 'citation_title');
	if (title) title = ZU.trimInternal(title);

	if (!title) {
		var headings = ['#title h1', 'h1.article_title', '.article-title', '#main h1', 'h1'];
		for (var h = 0; h < headings.length; h++) {
			var candidate = text(doc, headings[h]);
			if (candidate && candidate.length > 5) {
				title = candidate;
				break;
			}
		}
	}

	if (!title) {
		// Fall back to Embedded Metadata translator
		var translator = Zotero.loadTranslator('web');
		translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
		translator.setDocument(doc);
		translator.setHandler('itemDone', function (_obj, item) {
			item.libraryCatalog = 'AIS eLibrary';
			item.complete();
		});
		translator.translate();
		return;
	}

	var itemType = getItemType(url);
	var item = new Zotero.Item(itemType);
	item.title = title;
	item.url = url;
	
	// Authors
	var authors = getMetaContentAll(doc, 'bepress_citation_author');
	if (!authors.length) authors = getMetaContentAll(doc, 'citation_author');
	for (var i = 0; i < authors.length; i++) {
		item.creators.push(
			ZU.cleanAuthor(authors[i], 'author', authors[i].includes(','))
		);
	}
	
	// Date
	var date = getMetaContent(doc, 'bepress_citation_date')
		|| getMetaContent(doc, 'citation_date')
		|| getMetaContent(doc, 'citation_publication_date')
		|| getMetaContent(doc, 'bepress_citation_online_date');
	if (date) item.date = ZU.strToISO(date) || date;
	
	// Abstract
	var absSelectors = [
		'#abstract', 'div.abstract', '.article-abstract',
		'section.abstract', '[id*="abstract"]'
	];
	for (var a = 0; a < absSelectors.length; a++) {
		var absContainer = doc.querySelector(absSelectors[a]);
		if (absContainer) {
			var absP = absContainer.querySelector('p');
			item.abstractNote = ZU.trimInternal((absP || absContainer).textContent);
			if (item.abstractNote) break;
		}
	}
	if (!item.abstractNote) {
		item.abstractNote = getMetaContent(doc, 'bepress_citation_abstract')
			|| getMetaContent(doc, 'description');
	}
	if (item.abstractNote) {
		item.abstractNote = item.abstractNote.replace(/^Abstract[\s:]*/, '');
	}
	
	// DOI
	var doi = getMetaContent(doc, 'bepress_citation_doi')
		|| getMetaContent(doc, 'citation_doi');
	if (doi) item.DOI = ZU.cleanDOI(doi);
	
	// PDF attachment
	var pdfURL = getMetaContent(doc, 'bepress_citation_pdf_url')
		|| getMetaContent(doc, 'citation_pdf_url');
	if (!pdfURL) {
		pdfURL = attr(doc, 'a[href*="viewcontent.cgi"][href*="article="]', 'href');
	}
	if (pdfURL) {
		item.attachments.push({
			url: pdfURL,
			title: 'Full Text PDF',
			mimeType: 'application/pdf',
			proxy: false
		});
	}
	
	// Conference paper fields
	if (itemType === 'conferencePaper') {
		var allLinks = doc.querySelectorAll('a[href]');
		for (var j = 0; j < allLinks.length; j++) {
			var crumbText = ZU.trimInternal(allLinks[j].textContent);
			if (/\b(ICIS|ECIS|AMCIS|PACIS|HICSS|MCIS|SAIS|ACIS|ISD|CONF-IRM|ICMB|ICEB|Wuhan)\b.*\d{4}/i.test(crumbText)
				|| (/proceedings/i.test(crumbText) && crumbText.length > 10)) {
				item.proceedingsTitle = crumbText;
				break;
			}
		}
		if (!item.proceedingsTitle) {
			item.proceedingsTitle = getMetaContent(doc, 'bepress_citation_conference_title');
		}
	}
	else {
		// Journal article fields
		item.publicationTitle = getMetaContent(doc, 'bepress_citation_journal_title')
			|| getMetaContent(doc, 'citation_journal_title');
		item.volume = getMetaContent(doc, 'bepress_citation_volume')
			|| getMetaContent(doc, 'citation_volume');
		item.issue = getMetaContent(doc, 'bepress_citation_issue')
			|| getMetaContent(doc, 'citation_issue');
		var firstPage = getMetaContent(doc, 'bepress_citation_firstpage')
			|| getMetaContent(doc, 'citation_firstpage');
		var lastPage = getMetaContent(doc, 'bepress_citation_lastpage')
			|| getMetaContent(doc, 'citation_lastpage');
		if (firstPage) {
			item.pages = lastPage ? firstPage + '\u2013' + lastPage : firstPage;
		}
		item.ISSN = getMetaContent(doc, 'bepress_citation_issn')
			|| getMetaContent(doc, 'citation_issn');
	}
	
	// Keywords (deduplicate across bepress and citation meta tags)
	var keywords = getMetaContentAll(doc, 'bepress_citation_keywords')
		.concat(getMetaContentAll(doc, 'citation_keywords'));
	if (!keywords.length) {
		var kwSection = doc.querySelector('#keywords p, .keywords p, [id*="keyword"] p');
		if (kwSection) {
			keywords = kwSection.textContent.split(/[,;]/)
				.map(function (kw) { return ZU.trimInternal(kw); })
				.filter(function (kw) { return kw.length > 0; });
		}
	}
	var seenKeywords = {};
	for (var k = 0; k < keywords.length; k++) {
		var kwLower = keywords[k].toLowerCase();
		if (!seenKeywords[kwLower]) {
			seenKeywords[kwLower] = true;
			item.tags.push(keywords[k]);
		}
	}
	
	// Finalize
	item.libraryCatalog = 'AIS eLibrary';
	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});
	
	item.complete();
}

// ===========================================================================
//  META TAG HELPERS
// ===========================================================================

function getMetaContent(doc, name) {
	var el = doc.querySelector(
		'meta[name="' + name + '"], meta[property="' + name + '"]'
	);
	return el ? el.getAttribute('content') : null;
}

function getMetaContentAll(doc, name) {
	var els = doc.querySelectorAll(
		'meta[name="' + name + '"], meta[property="' + name + '"]'
	);
	var values = [];
	for (var i = 0; i < els.length; i++) {
		var content = els[i].getAttribute('content');
		if (content) values.push(content);
	}
	return values;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://aisel.aisnet.org/icis2025/conf_theme/conf_theme/6/",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Fostering Trustworthy Human-AI Collaboration through Explainable AI and Uncertainty Quantification",
				"creators": [
					{
						"firstName": "Andreas",
						"lastName": "Schauer",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel",
						"lastName": "Schnurr",
						"creatorType": "author"
					}
				],
				"date": "2025",
				"proceedingsTitle": "ICIS 2025 Proceedings",
				"url": "https://aisel.aisnet.org/icis2025/conf_theme/conf_theme/6/",
				"libraryCatalog": "AIS eLibrary",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
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
		"url": "https://aisel.aisnet.org/amcis2023/sig_dsa/sig_dsa/7/",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Identifying Intimacy of Self-Disclosure: A Design Based on Social Penetration Theory and Deep Learning",
				"creators": [
					{
						"firstName": "Xi",
						"lastName": "Zhang",
						"creatorType": "author"
					},
					{
						"firstName": "Chengzhu",
						"lastName": "Qi",
						"creatorType": "author"
					},
					{
						"firstName": "Xin",
						"lastName": "Wei",
						"creatorType": "author"
					},
					{
						"firstName": "Wei",
						"lastName": "He",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"proceedingsTitle": "AMCIS 2023 Proceedings",
				"url": "https://aisel.aisnet.org/amcis2023/sig_dsa/sig_dsa/7/",
				"libraryCatalog": "AIS eLibrary",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
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
		"url": "https://aisel.aisnet.org/jais/vol25/iss3/2/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Mechanisms for Achieving Ambidexterity in the Context of Digital Transformation: Insights from Digital Innovation Labs",
				"creators": [
					{
						"firstName": "Friedrich",
						"lastName": "Holotiuk",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel",
						"lastName": "Beimborn",
						"creatorType": "author"
					},
					{
						"firstName": "Axel",
						"lastName": "Hund",
						"creatorType": "author"
					}
				],
				"date": "2024",
				"DOI": "10.17705/1jais.00885",
				"ISSN": "1536-9323",
				"volume": "25",
				"issue": "3",
				"pages": "738\u2013780",
				"publicationTitle": "Journal of the Association for Information Systems",
				"url": "https://aisel.aisnet.org/jais/vol25/iss3/2/",
				"libraryCatalog": "AIS eLibrary",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
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
		"url": "https://aisel.aisnet.org/thci/vol16/iss3/4/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Generative AI for Intelligence Augmentation: Categorization and Evaluation Frameworks for Large Language Model Adaptation",
				"creators": [
					{
						"firstName": "Jie",
						"lastName": "Tao",
						"creatorType": "author"
					},
					{
						"firstName": "Lina",
						"lastName": "Zhou",
						"creatorType": "author"
					},
					{
						"firstName": "Xing",
						"lastName": "Fang",
						"creatorType": "author"
					}
				],
				"date": "2024",
				"DOI": "10.17705/1thci.00210",
				"ISSN": "1944-3900",
				"volume": "16",
				"issue": "3",
				"pages": "364\u2013387",
				"publicationTitle": "AIS Transactions on Human-Computer Interaction",
				"url": "https://aisel.aisnet.org/thci/vol16/iss3/4/",
				"libraryCatalog": "AIS eLibrary",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
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
		"url": "https://aisel.aisnet.org/misqe/vol23/iss1/5/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Leveraging Information Systems for Environmental Sustainability and Business Value",
				"creators": [
					{
						"firstName": "Anne",
						"lastName": "Ixmeier",
						"creatorType": "author"
					},
					{
						"firstName": "Franziska",
						"lastName": "Wagner",
						"creatorType": "author"
					},
					{
						"firstName": "Johann",
						"lastName": "Kranz",
						"creatorType": "author"
					}
				],
				"date": "2024",
				"ISSN": "1540-1960",
				"volume": "23",
				"issue": "1",
				"pages": "5",
				"publicationTitle": "MIS Quarterly Executive",
				"url": "https://aisel.aisnet.org/misqe/vol23/iss1/5/",
				"libraryCatalog": "AIS eLibrary",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
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
		"url": "https://aisel.aisnet.org/cais/vol54/iss1/32/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Influence of Context Factors on Cooperation in IS Integration Projects",
				"creators": [
					{
						"firstName": "Carol V.",
						"lastName": "Brown",
						"creatorType": "author"
					},
					{
						"firstName": "William J.",
						"lastName": "Kettinger",
						"creatorType": "author"
					},
					{
						"firstName": "Esra",
						"lastName": "Goren",
						"creatorType": "author"
					},
					{
						"firstName": "Barbara",
						"lastName": "Wixom",
						"creatorType": "author"
					}
				],
				"date": "2024",
				"DOI": "10.17705/1CAIS.05427",
				"ISSN": "1529-3181",
				"volume": "54",
				"issue": "1",
				"pages": "736\u2013772",
				"publicationTitle": "Communications of the Association for Information Systems",
				"url": "https://aisel.aisnet.org/cais/vol54/iss1/32/",
				"libraryCatalog": "AIS eLibrary",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
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
		"url": "https://aisel.aisnet.org/ecis2024/track06_humanaicollab/track06_humanaicollab/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
