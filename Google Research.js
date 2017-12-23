{
	"translatorID": "43293374-bf1d-4f6a-82de-cbd9a572ae7d",
	"label": "Google Research",
	"creator": "Guy Aglionby",
	"target": "^https?://(research\\.google\\.com/(pubs|search\\.html)|static\\.googleusercontent\\.com/media/research\\.google\\.com/en)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-01-27 23:57:56"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Guy Aglionby
	
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

// See also https://github.com/zotero/translators/blob/master/BibTeX.js
var bibtex2zoteroTypeMap = {
	"inproceedings": "conferencePaper",
	"conference"   : "conferencePaper",
	"article"      : "journalArticle",
	"techreport"   : "report",
	"patent"       : "patent"
};

function detectWeb(doc, url) {
	if (isSearchPage(url) || isAuthorPage(url)) {
		return 'multiple';
	} else if (isPaperPdf(url)) {
		return 'conferencePaper';
	} else {
		var citationElement = ZU.xpath(doc, "//div[h3[contains(., 'BibTeX')]]/textarea")[0];
		if (citationElement) {
			var type = citationElement.textContent.split("{")[0].replace("@", "");
			return bibtex2zoteroTypeMap[type];
		}
	}
}

function doWeb(doc, url) {
	if (isSearchPage(url)) {
		let results = scrapeSearchPage(doc);
		
		if (Object.keys(results).length) {
			Zotero.selectItems(results, function (selected) {
				if (selected) {
					let urls = Object.keys(selected);
					
					// Some links in the search (pubs/archive/) are direct links
					// to the paper. These sometimes, but not always, have a 
					// corresponding publication detail page, so use these to
					// get information about the paper if possible.
					
					let directLinks = urls.filter(function(selectedUrl) {
						return !selectedUrl.includes('pubs/archive/');
					});
					ZU.processDocuments(directLinks, scrape);
					
					let archiveLinks = urls.filter(function(selectedUrl) {
						return selectedUrl.includes('pubs/archive/');
					});
					archiveLinks = archiveLinks.map(archiveToPubUrl);
					archiveLinks.forEach(function(selectedUrl) {
						scrapeArchivePage(doc, selectedUrl);
					});
				}
			});
		}
	} else if (isPaperPdf(url)) {
		let paperId = url.replace('https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/', '');
		paperId = paperId.replace('.pdf', '');
		let publicationPage = 'https://research.google.com/pubs/pub' + paperId + '.html';
		scrapeArchivePage(null, publicationPage);
	} else if (isAuthorPage(url)) {
		let pubs = scrapeAuthorPage(doc);
		
		if (Object.keys(pubs).length) {
			Zotero.selectItems(pubs, function (selected) {
				if (selected) {
					ZU.processDocuments(Object.keys(selected), scrape);
				}
			});
		}
	} else {
		scrape(doc, url);
	}
}

function scrapeAuthorPage(doc) {
	let publicationLinks = ZU.xpath(doc, '//p[@class="pub-title"]/a');
	
	var results = {};
	publicationLinks.forEach(function(linkElement) {
		results[linkElement.href] = linkElement.innerText;
	});
	
	return results;
}

function scrapeSearchPage(doc) {
	const IS_RESEARCH = new RegExp('https://research\.google\.com/pubs/(pub|archive)');
	let titles = ZU.xpath(doc, '//div[contains(@class, "gsc-webResult")]//div[@class="gs-title"]//a[@class="gs-title"]');
	
	// Remove authors, blog posts and other miscellaneous items
	let publicationLinks = titles.filter(function(element) {
		return IS_RESEARCH.test(element.href);
	});
	
	var results = {};
	publicationLinks.forEach(function(linkElement) {
		results[linkElement.href] = linkElement.innerText;
	});
	
	return results;
}

function scrapeArchivePage(searchResultsDoc, url) {
	ZU.doGet(url, function(responseString, responseObj, url) {
		let noCorrespondingPubPage = responseString.includes('404') && responseString.includes('That’s an error.');
		
		if (noCorrespondingPubPage) {
			url = pubToArchiveUrl(url);
			
			var newItem = new Zotero.Item("book");
			newItem.attachments.push({
				title: "Full Text PDF",
				mimeType: "application/pdf",
				url: url
			});
			
			if (searchResultsDoc) {
				let titleElement = ZU.xpath(searchResultsDoc, '//div[contains(@class, "gsc-webResult")]//div[@class="gs-title"]//a[contains(@href, "' + url + '")]')[0];
				newItem.title = titleElement.innerText;
			} else {
				let paperId = url.replace('https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/', '');
				paperId = paperId.replace('.pdf', '');
				newItem.title = paperId;
			}
			
			newItem.complete();
		} else {
			ZU.processDocuments(url, scrape);
		}
	});
}

function scrape(doc, url) {
	var citationElement = ZU.xpath(doc, "//div[h3[contains(., 'BibTeX')]]/textarea")[0];
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
	translator.setString(citationElement.textContent);
	translator.setHandler("itemDone", function (obj, item) {
		var pdfElement = ZU.xpath(doc, '//a[contains(@class, "pdf-icon")]')[0];
		if (pdfElement) {
			var pdfLink = pdfElement.href;
			if (pdfLink.includes('http://arxiv.org')) {
				pdfLink = pdfLink.replace('abs', 'pdf');
				pdfLink = pdfLink + '.pdf';
			}
			
			item.attachments.push({
				url: pdfLink,
				title: 'Full Text PDF',
				mimeType: 'application/pdf'
			});
		}
		
		item.attachments.push({
 			url: url,
 			title: "Google Research Link",
 			mimeType: "text/html",
 			snapshot: false
 		});
		
		item.complete();
	});
	translator.translate();
}

function pubToArchiveUrl(url) {
	return url.replace('pubs/pub', 'pubs/archive/').replace('.html', '.pdf');
}

function archiveToPubUrl(url) {
	return url.replace('pubs/archive/', 'pubs/pub').replace('.pdf', '.html');
}

function isSearchPage(url) {
	return url.includes('search.html?q=');
}

function isAuthorPage(url) {
	return url.includes('/pubs/') && !url.includes('/pubs/pub');
}

function isPaperPdf(url) {
	return url.includes('.pdf');
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://research.google.com/pubs/pub45619.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "YouTube-8M: A Large-Scale Video Classification Benchmark",
				"creators": [
					{
						"firstName": "Sami",
						"lastName": "Abu-El-Haija",
						"creatorType": "author"
					},
					{
						"firstName": "Nisarg",
						"lastName": "Kothari",
						"creatorType": "author"
					},
					{
						"firstName": "Joonseok",
						"lastName": "Lee",
						"creatorType": "author"
					},
					{
						"firstName": "Apostol (Paul)",
						"lastName": "Natsev",
						"creatorType": "author"
					},
					{
						"firstName": "George",
						"lastName": "Toderici",
						"creatorType": "author"
					},
					{
						"firstName": "Balakrishnan",
						"lastName": "Varadarajan",
						"creatorType": "author"
					},
					{
						"firstName": "Sudheendra",
						"lastName": "Vijayanarasimhan",
						"creatorType": "author"
					}
				],
				"date": "2016",
				"itemID": "45619",
				"libraryCatalog": "Google Research",
				"proceedingsTitle": "arXiv:1609.08675",
				"shortTitle": "YouTube-8M",
				"url": "https://arxiv.org/pdf/1609.08675v1.pdf",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Google Research Link",
						"mimeType": "text/html",
						"snapshot": false
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
		"url": "https://research.google.com/pubs/pub45742.html",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "What’s your ML test score? A rubric for ML production systems",
				"creators": [
					{
						"firstName": "Eric",
						"lastName": "Breck",
						"creatorType": "author"
					},
					{
						"firstName": "Shanqing",
						"lastName": "Cai",
						"creatorType": "author"
					},
					{
						"firstName": "Eric",
						"lastName": "Nielsen",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Salib",
						"creatorType": "author"
					},
					{
						"firstName": "D.",
						"lastName": "Sculley",
						"creatorType": "author"
					}
				],
				"date": "2016",
				"itemID": "45742",
				"libraryCatalog": "Google Research",
				"shortTitle": "What’s your ML test score?",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Google Research Link",
						"mimeType": "text/html",
						"snapshot": false
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
		"url": "https://research.google.com/pubs/DaleWebster.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/43977.pdf",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Learning with Deep Cascades",
				"creators": [
					{
						"firstName": "Giulia",
						"lastName": "DeSalvo",
						"creatorType": "author"
					},
					{
						"firstName": "Mehryar",
						"lastName": "Mohri",
						"creatorType": "author"
					},
					{
						"firstName": "Umar",
						"lastName": "Syed",
						"creatorType": "author"
					}
				],
				"date": "2015",
				"itemID": "43977",
				"libraryCatalog": "Google Research",
				"proceedingsTitle": "Proceedings of the Twenty-Sixth International Conference on Algorithmic Learning Theory (ALT 2015)",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Google Research Link",
						"mimeType": "text/html",
						"snapshot": false
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
