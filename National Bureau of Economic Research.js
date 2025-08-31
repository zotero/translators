{
	"translatorID": "99f958ab-0732-483d-833f-6bd8e42f6277",
	"label": "National Bureau of Economic Research",
	"creator": "Michael Berkowitz, Philipp Zumstein, Abe Jellinek",
	"target": "^https?://(papers\\.|www2?\\.)?nber\\.org/(system/files/)?(papers|s|new|custom|books-and-chapters|chapters)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-04-04 18:13:34"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018-2021 Philipp Zumstein and Abe Jellinek
	
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


const pdfSlugRe = /\/files(\/[^/]+\/[^/]+)/;
const preprintType = ZU.fieldIsValidForType('title', 'preprint')
	? 'preprint'
	: 'report';

function detectWeb(doc, url) {
	if (doc.querySelector('meta[name="citation_title"]')
		|| (pdfSlugRe.test(url) && url.endsWith('.pdf'))) {
		if (url.includes('/papers/')) {
			return preprintType;
		}
		else if (url.includes('/books-and-chapters/')) {
			if (url.match(/\/books-and-chapters\/[^/]+\/[^/]+/)) {
				// if the URL has two locators, we're on a chapter
				return "bookSection";
			}
			else {
				return "book";
			}
		}
		else if (url.includes('/chapters/')) {
			return "bookSection";
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
	var rows = doc.querySelectorAll('.digest-card__title a');
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (href.match(/\.pdf$/)) continue;
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
	if (doc.querySelector('form.download-citation')) {
		scrapeWithBib(doc, url, getBibURL(doc));
	}
	else if (doc.querySelector('a[href$=".bib"]')) {
		scrapeWithBib(doc, url, attr(doc, 'a[href$=".bib"]', 'href'));
	}
	else if (url.endsWith('.pdf')) {
		let catalogSlug = url.match(pdfSlugRe);
		if (catalogSlug && catalogSlug != url) {
			catalogSlug = catalogSlug[1];
			ZU.processDocuments(catalogSlug, doc => scrape(doc, catalogSlug));
		}
	}
	else if (doc.querySelector('.table-of-contents__title a')) {
		// if we're on a book page without a citation form, we'll navigate to
		// the first chapter and grab the BibTeX from there. it'll contain a
		// citation for the book.
		ZU.processDocuments(attr(doc, '.table-of-contents__title a', 'href'),
			chapterDoc => scrapeWithBib(doc, url, getBibURL(chapterDoc)));
	}
	else {
		throw new Error('No BibTeX source found');
	}
}


function scrapeWithBib(doc, url, bibURL) {
	ZU.doGet(bibURL, function (respText) {
		// first we preprocess a bit: the BibTeX sometimes contains unescaped
		// quotes within the quoted title, so we'll fix it
		respText = respText.replace(/(^\s*)title = "(.+)"/gm, (_, spaces, title) => {
			let escapedTitle = title.replace(/"(.+)"/g, "``$1''");
			return `${spaces}title = "${escapedTitle}"`;
		});
		
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		translator.setString(respText);
		translator.setHandler("itemDone", function (obj, item) {
			// NBER gives us a BibTeX citation for the book when we try to pull
			// the citation for one chapter, so we'll just skip it. vice versa
			// for generating book citations by grabbing a chapter detail page.
			// we don't want to blindly skip when itemType != detected, because
			// detectWeb might make mistakes.
			let detected = detectWeb(doc, url);

			if ((item.itemType == 'book' && detected == 'bookSection')
				|| (item.itemType == 'bookSection' && detected == 'book')) {
				return;
			}

			if (item.itemType == 'report' && detected == 'preprint') {
				item.itemType = 'preprint';
				item.archiveID = item.reportNumber;
				delete item.reportNumber;
			}

			if (item.itemType == 'book' && item.publisher.includes(', volume ')) {
				let [series, vol, issue] = item.publisher.split(', ');
				delete item.publisher;
				item.series = series;
				item.volume = vol.replace(/^volume\b/, '');
				item.seriesNumber = issue.replace(/^issue\b/, '');
			}
			
			var pdfURL = attr(doc, 'meta[name="citation_pdf_url"]', 'content');
			if (!pdfURL) {
				pdfURL = attr(doc, '.page-header__intro-links a[href$=".pdf"]', 'href');
			}
			item.attachments.push({
				url: pdfURL,
				title: "Full Text PDF",
				mimeType: "application/pdf"
			});
			
			item.url = attr(doc, 'link[rel="canonical"]', 'href') || item.url;
			
			for (let creator of item.creators) {
				// fix initials without period ("William H Macy")
				if (creator.firstName && creator.firstName.match(/\b[A-Z]$/)) {
					creator.firstName += '.';
				}
			}
			
			item.complete();
		});
		translator.translate();
	});
}


function getBibURL(doc) {
	let paperNumber = attr(doc, 'meta[name="citation_technical_report_number"]', 'content');
	return `https://back.nber.org/bibliographic/${paperNumber}.bib`;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.nber.org/papers/w17577",
		"items": [
			{
				"itemType": "preprint",
				"title": "The Dynamics of Firm Lobbying",
				"creators": [
					{
						"firstName": "William R.",
						"lastName": "Kerr",
						"creatorType": "author"
					},
					{
						"firstName": "William F.",
						"lastName": "Lincoln",
						"creatorType": "author"
					},
					{
						"firstName": "Prachi",
						"lastName": "Mishra",
						"creatorType": "author"
					}
				],
				"date": "2011-11",
				"DOI": "10.3386/w17577",
				"abstractNote": "We study the determinants of the dynamics of firm lobbying behavior using a panel data set covering 1998-2006. Our data exhibit three striking facts: (i) few firms lobby, (ii) lobbying status is strongly associated with firm size, and (iii) lobbying status is highly persistent over time. Estimating a model of a firm's decision to engage in lobbying, we find significant evidence that up-front costs associated with entering the political process help explain all three facts. We then exploit a natural experiment in the expiration in legislation surrounding the H-1B visa cap for high-skilled immigrant workers to study how these costs affect firms' responses to policy changes. We find that companies primarily adjusted on the intensive margin: the firms that began to lobby for immigration were those who were sensitive to H-1B policy changes and who were already advocating for other issues, rather than firms that became involved in lobbying anew. For a firm already lobbying, the response is determined by the importance of the issue to the firm's business rather than the scale of the firm's prior lobbying efforts. These results support the existence of significant barriers to entry in the lobbying process.",
				"archiveID": "17577",
				"extra": "DOI: 10.3386/w17577",
				"genre": "Working Paper",
				"itemID": "NBERw17577",
				"libraryCatalog": "National Bureau of Economic Research",
				"repository": "National Bureau of Economic Research",
				"series": "Working Paper Series",
				"url": "https://www.nber.org/papers/w17577",
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
		"url": "https://papers.nber.org/s/search?restrict_papers=yes&whichsearch=db&client=test3_fe&proxystylesheet=test3_fe&site=default_collection&entqr=0&ud=1&output=xml_no_dtd&oe=UTF-8&ie=UTF-8&sort=date%253AD%253AL%253Ad1&q=labor",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.nber.org/papers?page=1&perPage=50&sortBy=public_date",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.nber.org/books-and-chapters/economics-research-and-innovation-agriculture/introduction-economics-research-and-innovation-agriculture",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Introduction to “Economics of Research and Innovation in Agriculture”",
				"creators": [
					{
						"firstName": "Petra",
						"lastName": "Moser",
						"creatorType": "author"
					}
				],
				"date": "2020-09",
				"bookTitle": "Economics of Research and Innovation in Agriculture",
				"itemID": "NBERc14291",
				"libraryCatalog": "National Bureau of Economic Research",
				"pages": "1-19",
				"publisher": "University of Chicago Press",
				"url": "https://www.nber.org/books-and-chapters/economics-research-and-innovation-agriculture/introduction-economics-research-and-innovation-agriculture",
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
		"url": "https://www.nber.org/books-and-chapters/incentives-and-limitations-employment-policies-retirement-transitions-comparisons-public-and-private",
		"items": [
			{
				"itemType": "book",
				"title": "Incentives and Limitations of Employment Policies on Retirement Transitions: Comparisons of Public and Private Sectors",
				"creators": [
					{
						"firstName": "Robert L.",
						"lastName": "Clark",
						"creatorType": "author"
					},
					{
						"firstName": "Joseph P.",
						"lastName": "Newhouse",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"itemID": "NBERclar-12",
				"libraryCatalog": "National Bureau of Economic Research",
				"series": "Journal of Pension Economics and Finance",
				"seriesNumber": "special issue 3",
				"shortTitle": "Incentives and Limitations of Employment Policies on Retirement Transitions",
				"url": "https://www.nber.org/books-and-chapters/incentives-and-limitations-employment-policies-retirement-transitions-comparisons-public-and-private",
				"volume": "20",
				"attachments": [
					{
						"url": "",
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
		"url": "https://www.nber.org/books-and-chapters/economics-research-and-innovation-agriculture/introduction-economics-research-and-innovation-agriculture",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Introduction to “Economics of Research and Innovation in Agriculture”",
				"creators": [
					{
						"firstName": "Petra",
						"lastName": "Moser",
						"creatorType": "author"
					}
				],
				"date": "2020-09",
				"bookTitle": "Economics of Research and Innovation in Agriculture",
				"itemID": "NBERc14291",
				"libraryCatalog": "National Bureau of Economic Research",
				"pages": "1-19",
				"publisher": "University of Chicago Press",
				"url": "https://www.nber.org/books-and-chapters/economics-research-and-innovation-agriculture/introduction-economics-research-and-innovation-agriculture",
				"attachments": [
					{
						"url": "",
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
