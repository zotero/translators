{
	"translatorID": "951c027d-74ac-47d4-a107-9c3069ab7b48",
	"label": "Cowles Foundation",
	"creator": "Vincent Carret",
	"target": "^https?://(www\\.)?cowles\\.yale\\.edu/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-16 14:58:25"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Vincent Carret
	
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

// attr()/text() v2
// eslint-disable-next-line
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}

function detectWeb(doc, url) {
	if (url.includes('/cfp/')) {
		return "journalArticle";
	}
	else if (url.includes('/cfdp/')) {
		return "report";
	}
	else if (url.includes('/cfm-')) {
		return "book";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll(".views-table tbody tr");
	var href = "";
	var title = "";
	for (let row of rows) {
		var paper = text(row, "td")
			.trim()
			.toLowerCase()
			.replace(".", "")
			.split(" ");
		// There are three types of documents: monographs (books), discussion papers (reports) and papers which were published
		// This query method works on the monograph pages and the authors' pages for now
		if (paper[0] == "cfm") {
			href = "/" + paper.join("-");
			title = text(row, "td.views-field-field-paper-title a");
		}
		else if (paper[0] == "cfdp") {
			href = "/publications/" + paper[0] + "/" + paper.join("-");
			title = text(row, "td.views-field-field-author-from-list strong a");
		}
		else if (paper[0] == "cfp") {
			href = "/publications/" + paper[0] + "/" + paper.join("");
			title = text(row, "td.views-field-field-author-from-list strong a");
		}
		
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
	var pdfurl = "";
	var item = null;
	// Each type of document follow a different layout, which seems to be the same inside all three categories
	if (url.includes('/cfp/')) {
		item = new Zotero.Item("journalArticle");
		item.title = ZU.xpathText(doc, "//strong[contains(., 'CFP Paper Title')]/following-sibling::a/text()");
		item.publicationTitle = ZU.xpathText(doc, "//strong[contains(., 'Journal')]/following-sibling::em//text()");
		item.date = ZU.strToISO(ZU.xpathText(doc, "//strong[contains(., 'CFP Date')]/following-sibling::span//text()"));
		try {
			item.volume = ZU.xpathText(doc, "//strong[contains(., 'CFP Vol(Issue)')]/following-sibling::text()").split('(')[0];
			item.issue = ZU.xpathText(doc, "//strong[contains(., 'CFP Vol(Issue)')]/following-sibling::text()").split('(')[1][0];
		}
		catch (err) {}
		item.pages = ZU.xpathText(doc, "//strong[contains(., 'CFP page numbers')]/following-sibling::text()").split(',')[0];
		let author = doc.querySelectorAll("div.comma span.comma a");
		for (let auth of author) item.creators.push(ZU.cleanAuthor(auth.textContent, "author", false));
		item.url = ZU.xpathText(doc, "//strong[contains(., 'CFP Paper Title')]/following-sibling::a/@href");
		item.libraryCatalog = "Cowles Foundation";
		try {
			let seeAlso = "See also: " + ZU.xpathText(doc, "//strong[contains(., 'See CFDP')]/following-sibling::span//text()");
			if (seeAlso != "See also: null") item.notes.push({ note: seeAlso });
		}
		catch (err) {}
	}
	else if (url.includes('/cfdp/')) {
		item = new Zotero.Item("report");
		item.title = text(doc, 'h3 a');
		item.reportType = "Cowles Foundation Discussion Paper";
		item.reportNumber = text(doc, "#page-title").match(/\d+/)[0];
		let author = doc.querySelectorAll("div.comma span.comma a");
		for (let auth of author) item.creators.push(ZU.cleanAuthor(auth.textContent, "author", false));

		item.libraryCatalog = "Cowles Foundation";
		item.date = ZU.strToISO(ZU.xpathText(doc, "//strong[contains(., 'Publication Date')]/following-sibling::span//text()"));
		item.pages = ZU.xpathText(doc, "//strong[contains(., 'Pages')]/following-sibling::text()");
		try {
			item.abstractNote = ZU.xpathText(doc, "//p[contains(., 'Abstract')]/following-sibling::p/text()");
		}
		catch (err) {}
		pdfurl = attr(doc, 'h3 a', 'href');
	}
	else if (url.includes('/cfm-')) {
		item = new Zotero.Item("book");
		item.title = text(doc, 'a[href*="/pub/"]');
		item.series = "Cowles Monograph";
		item.seriesNumber = text(doc, "#page-title").match(/\d+/)[0];
		item.libraryCatalog = "Cowles Foundation";
		
		var creatorType = "author";
		var authors = doc.querySelector(".field-name-field-paper-title p a")
			.previousSibling
			.textContent
			.trim()
			.split(/, | and | & /);
			
		if (authors[authors.length - 1] == "ed.," || authors[authors.length - 1] == "eds.,") {
			creatorType = "editor";
			authors = authors.slice(0, -1);
		}
		else creatorType = "author";
		
		for (let auth of authors) {
			if (auth == "Associates,") continue;
			item.creators.push(ZU.cleanAuthor(auth, creatorType, false));
		}

		try {
			var editor = doc.querySelector(".field-name-field-paper-title p a").nextSibling.textContent.trim().split(", ");
			if (editor[1].includes("ed.")) {
				item.edition = editor[1];
				item.publisher = editor[2];
			}
			else item.publisher = editor[1];
			item.date = ZU.strToISO(editor[editor.length - 1].split(" ")[0]);
		}
		catch (err) {}
		
		pdfurl = attr(doc, 'a[href*="/pub/"]', 'href');
	}
	
	if (pdfurl) {
		item.attachments.push({
			title: item.title,
			mimeType: "application/pdf",
			url: pdfurl
		});
	}
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://cowles.yale.edu/author/herbert-e-scarf",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://cowles.yale.edu/publications/cfp/cfp1573",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "How to Compute Equilibrium Prices in 1891",
				"creators": [
					{
						"firstName": "William C.",
						"lastName": "Brainard",
						"creatorType": "author"
					},
					{
						"firstName": "Herbert E.",
						"lastName": "Scarf",
						"creatorType": "author"
					}
				],
				"date": "2005-01",
				"issue": "1",
				"libraryCatalog": "Cowles Foundation",
				"pages": "57–83",
				"publicationTitle": "American Journal of Economics and Sociology",
				"url": "http://onlinelibrary.wiley.com/doi/10.1111/j.1536-7150.2005.00349.x/full",
				"volume": "64",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "See also: CFDP 1272"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://cowles.yale.edu/publications/cfdp/cfdp-1415",
		"items": [
			{
				"itemType": "report",
				"title": "Two New Proofs of Afriat's Theorem",
				"creators": [
					{
						"firstName": "Ana",
						"lastName": "Fostel",
						"creatorType": "author"
					},
					{
						"firstName": "Herbert E.",
						"lastName": "Scarf",
						"creatorType": "author"
					},
					{
						"firstName": "Michael J.",
						"lastName": "Todd",
						"creatorType": "author"
					}
				],
				"date": "2003-05",
				"abstractNote": "We provide two new, simple proofs of Afriat’s celebrated theorem stating that a ﬁnite set of price-quantity observations is consistent with utility maximization if, and only if, the observations satisfy a variation of the Strong Axiom of Revealed Preference known as the Generalized Axiom of Revealed Preference.,  Afriat’s theorem, SARP, GARP",
				"libraryCatalog": "Cowles Foundation",
				"pages": "10",
				"reportNumber": "1415",
				"reportType": "Cowles Foundation Discussion Paper",
				"attachments": [
					{
						"title": "Two New Proofs of Afriat's Theorem",
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
		"url": "https://cowles.yale.edu/publications/archives/cfm",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://cowles.yale.edu/cfm-5",
		"items": [
			{
				"itemType": "book",
				"title": "The Variate Diﬀerence Method",
				"creators": [
					{
						"firstName": "Gerhard",
						"lastName": "Tintner",
						"creatorType": "author"
					}
				],
				"date": "1940",
				"libraryCatalog": "Cowles Foundation",
				"publisher": "Principia Press",
				"series": "Cowles Monograph",
				"seriesNumber": "5",
				"attachments": [
					{
						"title": "The Variate Diﬀerence Method",
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
