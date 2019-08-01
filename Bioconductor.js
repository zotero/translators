{
	"translatorID": "21f62926-4343-4518-b6f2-a284e650e64a",
	"label": "Bioconductor",
	"creator": "Qiang Hu",
	"target": "^https?://bioconductor.org/(packages/release/bioc/html|packages/devel/bioc/html|help)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 150,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-07-31 21:02:28"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Bioconductor Packages Translator
	Copyright © 2019 Qiang Hu
	
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
/* function attr(docOrElem, selector, attr, index) {
	var elem = index ? docOrElem.querySelectorAll(selector).item(index) : docOrElem.querySelector(selector);
	return elem ? elem.getAttribute(attr) : null;
} */

function text(docOrElem, selector, index) {
	var elem = index ? docOrElem.querySelectorAll(selector).item(index) : docOrElem.querySelector(selector);
	return elem ? elem.textContent : null;
}


function detectWeb(doc, url) {
	if (url.includes('/bioc/html/')) {
		return "computerProgram";
	} else if (url.includes('/search/index.html') && getSearchResults(doc, true)) {
		return "multiple";
	}
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('dl>dt>a[href*="/bioc/html/"]');
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
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
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}


function scrape(doc, url) {
	var item = new Zotero.Item('computerProgram');
	item.title = text(doc, '#PageContent > div.do_not_rebase > h2');
	item.extra = "DOI: " + text(doc, '#PageContent > div.do_not_rebase > a:nth-child(1)');

	var rows = doc.querySelectorAll('#PageContent > div.do_not_rebase > p');
	for (let i = 0; i < rows.length; i++) {
		if (ZU.trimInternal(rows[i].textContent).startsWith('Bioconductor version:')) {
			item.abstractNote = ZU.trimInternal(rows[i + 1].textContent);
		}
		if (ZU.trimInternal(rows[i].textContent).startsWith('Author')) {
			var authorString = ZU.trimInternal(rows[i].textContent);
			if (authorString) {
				var creators = authorString.replace(/Author:\s*/, '').replace(/\[.+?\]/g, '').split(/,\s*/);
				for (let i = 0; i < creators.length; i++) {
					item.creators.push(ZU.cleanAuthor(creators[i], 'author'));
				}
			}
		}
	}

	item.versionNumber = ZU.xpathText(doc, '//table/tbody/tr/td[contains(text(), "Version")]/following-sibling::td');
	item.date = ZU.xpathText(doc, '//table/tbody/tr/td[contains(text(), "Published")]/following-sibling::td');
	item.rights = ZU.xpathText(doc, '//table/tbody/tr/td[contains(text(), "License")]/following-sibling::td');
	item.url = ZU.xpathText(doc, '//table/tbody/tr/td[contains(text(), "Package Short Url")]/following-sibling::td');

	var tags = ZU.xpath(doc, '//td[contains(text(), "biocViews")]/following-sibling::td/a');
	for (let i = 0; i < tags.length; i++) {
		item.tags.push(tags[i].textContent);
	}

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [{
		"type": "web",
		"url": "https://bioconductor.org/help/search/index.html?q=SummarizedExperiment/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://bioconductor.org/packages/release/bioc/html/SummarizedExperiment.html",
		"items": [{
			"itemType": "computerProgram",
			"title": "SummarizedExperiment container",
			"creators": [{
					"firstName": "Martin",
					"lastName": "Morgan",
					"creatorType": "author"
				},
				{
					"firstName": "Valerie",
					"lastName": "Obenchain",
					"creatorType": "author"
				},
				{
					"firstName": "Jim",
					"lastName": "Hester",
					"creatorType": "author"
				},
				{
					"firstName": "Hervé",
					"lastName": "Pagès",
					"creatorType": "author"
				}
			],
			"abstractNote": "The SummarizedExperiment container contains one or more assays, each represented by a matrix-like object of numeric or other mode. The rows typically represent genomic ranges of interest and the columns represent samples.",
			"extra": "DOI: 10.18129/B9.bioc.SummarizedExperiment",
			"libraryCatalog": "Bioconductor",
			"rights": "Artistic-2.0",
			"url": "http://bioconductor.org/packages/SummarizedExperiment/",
			"versionNumber": "1.14.0",
			"attachments": [],
			"tags": [{
					"tag": "Annotation"
				},
				{
					"tag": "Coverage"
				},
				{
					"tag": "Genetics"
				},
				{
					"tag": "GenomeAnnotation"
				},
				{
					"tag": "Infrastructure"
				},
				{
					"tag": "Sequencing"
				},
				{
					"tag": "Software"
				}
			],
			"notes": [],
			"seeAlso": []
		}]
	},
	{
		"type": "web",
		"url": "https://bioconductor.org/packages/devel/bioc/html/SummarizedExperiment.html",
		"items": [{
			"itemType": "computerProgram",
			"title": "SummarizedExperiment container",
			"creators": [{
					"firstName": "Martin",
					"lastName": "Morgan",
					"creatorType": "author"
				},
				{
					"firstName": "Valerie",
					"lastName": "Obenchain",
					"creatorType": "author"
				},
				{
					"firstName": "Jim",
					"lastName": "Hester",
					"creatorType": "author"
				},
				{
					"firstName": "Hervé",
					"lastName": "Pagès",
					"creatorType": "author"
				}
			],
			"abstractNote": "The SummarizedExperiment container contains one or more assays, each represented by a matrix-like object of numeric or other mode. The rows typically represent genomic ranges of interest and the columns represent samples.",
			"extra": "DOI: 10.18129/B9.bioc.SummarizedExperiment",
			"libraryCatalog": "Bioconductor",
			"rights": "Artistic-2.0",
			"url": "http://bioconductor.org/packages/SummarizedExperiment/",
			"versionNumber": "1.15.5",
			"attachments": [],
			"tags": [{
					"tag": "Annotation"
				},
				{
					"tag": "Coverage"
				},
				{
					"tag": "Genetics"
				},
				{
					"tag": "GenomeAnnotation"
				},
				{
					"tag": "Infrastructure"
				},
				{
					"tag": "Sequencing"
				},
				{
					"tag": "Software"
				}
			],
			"notes": [],
			"seeAlso": []
		}]
	}
]
/** END TEST CASES **/