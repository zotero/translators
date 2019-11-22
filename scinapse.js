{
	"translatorID": "42680c5e-1ae8-4171-ab53-afe1d8e840d4",
	"label": "scinapse",
	"creator": "Vincent Carret",
	"target": "^https?://(www\\.)?scinapse\\.io/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-11-22 10:44:27"
}

function text(docOrElem, selector, index) {
	var elem = index ? docOrElem.querySelectorAll(selector).item(index) : docOrElem.querySelector(selector);
	return elem ? elem.textContent : null;
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

function detectWeb(doc, url) {
	if ((url.includes('/journals/') || url.includes('/authors/') || url.includes('/search?')) && getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (url.includes("/papers/")) {
		return "journalArticle";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;

	var rows = doc.querySelectorAll(".title_title_2TG0L");
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

function scrape(doc) {
	if (doc.querySelector(".doiInPaperShow_doiContext_1p7QW") !== null) {
		let DOI = text(doc, ".doiInPaperShow_doiContext_1p7QW");
	
		const translate = Zotero.loadTranslator("search");
		translate.setTranslator("b28d0d42-8549-4c6d-83fc-8382874a5cb9");
		translate.setSearch({ itemType: "journalArticle", DOI: DOI });
	
		translate.setHandler("itemDone", function (_translate, item) {
			if (!item.title) {
				Zotero.debug("No title available for " + item.DOI);
				item.title = "[No Title]";
			}
			try {
				item.abstractNote = doc.querySelector(".paperShow_abstractContent_3Zqzc, .mobilePaperShow_abstractContent_3ViME").textContent.replace("Abstract", "");
			}
			catch (err) {}
			item.complete();
		});
		// Don't throw on error
		translate.setHandler("error", function () {});
		translate.translate();
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://scinapse.io/papers/2981511200",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Natural resources in the theory of production: the Georgescu-Roegen/Daly versus Solow/Stiglitz controversy",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Quentin",
						"lastName": "Couix"
					}
				],
				"date": "2019-10-23",
				"DOI": "10.1080/09672567.2019.1679210",
				"ISSN": "0967-2567, 1469-5936",
				"abstractNote": "This paper provides a theoretical and methodological account of an important controversy between neoclassical resource economics and ecological economics from the early 1970s to the end of ...",
				"journalAbbreviation": "The European Journal of the History of Economic Thought",
				"language": "en",
				"libraryCatalog": "DOI.org (Crossref)",
				"pages": "1-38",
				"publicationTitle": "The European Journal of the History of Economic Thought",
				"shortTitle": "Natural resources in the theory of production",
				"url": "https://www.tandfonline.com/doi/full/10.1080/09672567.2019.1679210",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://scinapse.io/journals/105799767",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://scinapse.io/authors/290705619",
		"items": "multiple"
	}
]
/** END TEST CASES **/
