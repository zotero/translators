{
	"translatorID": "c159dcfe-8a53-4301-a499-30f6549c340d",
	"label": "DOI",
	"creator": "Simon Kornblith",
	"target": "",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 400,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-03-12 01:46:07"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Simon Kornblith

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

// TODO Detect DOIs more correctly.
// The actual rules for DOIs are very lax-- but we're more strict.
// Specifically, we should allow space characters, and all Unicode
// characters except for control characters. Here, we're cheating
// by not allowing ampersands, to fix an issue with getting DOIs
// out of URLs.
// Additionally, all content inside <noscript> is picked up as text()
// by the xpath, which we don't necessarily want to exclude, but
// that means that we can get DOIs inside node attributes and we should
// exclude quotes in this case.
// DOI should never end with a period or a comma (we hope)
// Description at: http://www.doi.org/handbook_2000/appendix_1.html#A1-4
const DOIre = /\b10\.[0-9]{4,}\/[^\s&"']*[^\s&"'.,]/g;

/**
 * @return {string | string[]} A single string if the URL contains a DOI
 * 		and the document contains no others, or an array of DOIs otherwise
 */
function getDOIs(doc, url) {
	let fromURL = getDOIFromURL(url);
	let fromDocument = getDOIsFromDocument(doc);
	if (
		// We got a DOI from the URL
		fromURL && (
			// And none from the document
			fromDocument.length == 0
			// Or one from the document, but the same one that was in the URL
			|| fromDocument.length == 1 && fromDocument[0] == fromURL
		)
	) {
		return fromURL;
	}
	// De-duplicate before returning
	return Array.from(new Set(fromURL ? [fromURL, ...fromDocument] : fromDocument));
}

function getDOIFromURL(url) {
	// Split on # and ?, so that we don't allow DOIs to contain those characters
	// but do allow finding DOIs on either side of them (e.g. a DOI in the URL hash)
	let urlParts = url.split(/[#?]/);
	for (let urlPart of urlParts) {
		let match = DOIre.exec(urlPart);
		if (match) {
			// Only return a single DOI from the URL
			return match[0];
		}
	}
	return null;
}

function getDOIsFromDocument(doc) {
	var dois = new Set();

	var m, DOI;
	var treeWalker = doc.createTreeWalker(doc.documentElement, 4, null, false);
	var ignore = ['script', 'style'];
	while (treeWalker.nextNode()) {
		if (ignore.includes(treeWalker.currentNode.parentNode.tagName.toLowerCase())) continue;
		// Z.debug(node.nodeValue)
		DOIre.lastIndex = 0;
		while ((m = DOIre.exec(treeWalker.currentNode.nodeValue))) {
			DOI = m[0];
			if (DOI.endsWith(")") && !DOI.includes("(")) {
				DOI = DOI.substr(0, DOI.length - 1);
			}
			if (DOI.endsWith("}") && !DOI.includes("{")) {
				DOI = DOI.substr(0, DOI.length - 1);
			}
			// only add new DOIs
			if (!dois.has(DOI)) {
				dois.add(DOI);
			}
		}
	}
	
	// FIXME: The test for this (developmentbookshelf.com) fails in Scaffold due
	// to a cookie error, though running the code in Scaffold still works
	var links = doc.querySelectorAll('a[href]');
	for (let link of links) {
		DOIre.lastIndex = 0;
		let m = DOIre.exec(link.href);
		if (m) {
			let doi = m[0];
			if (doi.endsWith(")") && !doi.includes("(")) {
				doi = doi.substr(0, doi.length - 1);
			}
			if (doi.endsWith("}") && !doi.includes("{")) {
				doi = doi.substr(0, doi.length - 1);
			}
			// only add new DOIs
			if (!dois.has(doi) && !dois.has(doi.replace(/#.*/, ''))) {
				dois.add(doi);
			}
		}
	}

	return Array.from(dois);
}

function detectWeb(doc, url) {
	// Blacklist the advertising iframe in ScienceDirect guest mode:
	// http://www.sciencedirect.com/science/advertisement/options/num/264322/mainCat/general/cat/general/acct/...
	// This can be removed from blacklist when 5c324134c636a3a3e0432f1d2f277a6bc2717c2a hits all clients (Z 3.0+)
	const blacklistRe = /^https?:\/\/[^/]*(?:google\.com|sciencedirect\.com\/science\/advertisement\/)/i;
	if (blacklistRe.test(url)) {
		return false;
	}

	let doiOrDOIs = getDOIs(doc, url);
	if (Array.isArray(doiOrDOIs)) {
		return doiOrDOIs.length ? "multiple" : false;
	}

	return "journalArticle"; // A decent guess
}

function retrieveDOIs(doiOrDOIs) {
	let showSelect = Array.isArray(doiOrDOIs);
	let dois = showSelect ? doiOrDOIs : [doiOrDOIs];
	let items = {};
	let numDOIs = dois.length;

	for (const doi of dois) {
		items[doi] = null;
		
		const translate = Zotero.loadTranslator("search");
		translate.setTranslator("b28d0d42-8549-4c6d-83fc-8382874a5cb9");
		translate.setSearch({ itemType: "journalArticle", DOI: doi });
	
		// don't save when item is done
		translate.setHandler("itemDone", function (_translate, item) {
			if (!item.title) {
				Zotero.debug("No title available for " + item.DOI);
				item.title = "[No Title]";
			}
			items[item.DOI] = item;
		});
		/* eslint-disable no-loop-func */
		translate.setHandler("done", function () {
			numDOIs--;
			
			// All DOIs retrieved
			if (numDOIs <= 0) {
				// Check to see if there's at least one DOI
				if (!Object.keys(items).length) {
					throw new Error("DOI Translator: could not find DOI");
				}
				
				// If showSelect is false, don't show a Select Items dialog,
				// just complete if we can
				if (!showSelect) {
					let firstItem = items[Object.keys(items)[0]];
					if (firstItem) {
						firstItem.complete();
					}
					return;
				}

				// Otherwise, allow the user to select among items that resolved successfully
				let select = {};
				for (let doi in items) {
					let item = items[doi];
					if (item) {
						select[doi] = item.title || "[" + item.DOI + "]";
					}
				}
				Zotero.selectItems(select, function (selectedDOIs) {
					if (!selectedDOIs) return;
					
					for (let selectedDOI in selectedDOIs) {
						items[selectedDOI].complete();
					}
				});
			}
		});
	
		// Don't throw on error
		translate.setHandler("error", function () {});
	
		translate.translate();
	}
}

function doWeb(doc, url) {
	let doiOrDOIs = getDOIs(doc, url);
	Z.debug(doiOrDOIs);
	retrieveDOIs(doiOrDOIs);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://blog.apastyle.org/apastyle/digital-object-identifier-doi/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://libguides.csuchico.edu/citingbusiness",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.egms.de/static/de/journals/mbi/2015-15/mbi000336.shtml",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.roboticsproceedings.org/rss09/p23.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://en.wikipedia.org/wiki/Template_talk:Doi",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://onlinelibrary.wiley.com/doi/full/10.7448/IAS.15.5.18440",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Track C Epidemiology and Prevention Science",
				"creators": [],
				"date": "2012-10-22",
				"DOI": "10.7448/IAS.15.5.18440",
				"ISSN": "1758-2652",
				"issue": "Suppl 3",
				"journalAbbreviation": "Journal of the International AIDS Society",
				"libraryCatalog": "DOI.org (Crossref)",
				"publicationTitle": "Journal of the International AIDS Society",
				"url": "http://doi.wiley.com/10.7448/IAS.15.5.18440",
				"volume": "15",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/BEJTMI",
		"items": [
			{
				"itemType": "document",
				"title": "Transfer of 50 thousand improved genetically improved farmed tilapia (GIFT) fry to Nigeria",
				"creators": [
					{
						"lastName": "Trinh",
						"firstName": "Trong",
						"creatorType": "author"
					},
					{
						"lastName": "Trinh",
						"firstName": "Trong",
						"creatorType": "contributor"
					},
					{
						"lastName": "WorldFish",
						"creatorType": "contributor",
						"fieldMode": true
					}
				],
				"date": "2023",
				"abstractNote": "The data contains the list of female broodstock that produced improved GIFT fry sent to Nigeria in three batches in 2022",
				"extra": "Type: dataset\nDOI: 10.7910/DVN/BEJTMI",
				"libraryCatalog": "DOI.org (Datacite)",
				"publisher": "Harvard Dataverse",
				"url": "https://dataverse.harvard.edu/citation?persistentId=doi:10.7910/DVN/BEJTMI",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
