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
	"lastUpdated": "2023-10-18 11:11:59"
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

// If the current page matches and returns "multiple", and there's no current
// page in the items to choose, we offer the current page with snapshot as a
// choice during item selection. This is triggered when all other translators
// fail to detect (incl. EM) while this translator (lowest priority) detects
// multiple. NOTE that when this translator fails to match, the user will get
// the "save web page" fallback by default.

var MAGIC_INVALID_DOI = "not a DOI; placeholder for current webpage"; // clearer than using a nullish value

async function retrieveDOIs(doiOrDOIs, fallbackDoc) {
	let showSelect = Array.isArray(doiOrDOIs);
	let dois = showSelect ? [MAGIC_INVALID_DOI, ...doiOrDOIs] : [doiOrDOIs];
	let items = {};
	let numDOIs = dois.length;

	for (const doi of dois) {
		items[doi] = null;

		let translate;
		if (doi === MAGIC_INVALID_DOI) {
			// First, create the special item for the current page, to be
			// saved as a webpage item if selected
			translate = Zotero.loadTranslator("web");
			// Embedded Metadata
			translate.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
			translate.setDocument(fallbackDoc);
		}
		else {
			translate = Zotero.loadTranslator("search");
			translate.setTranslator("b28d0d42-8549-4c6d-83fc-8382874a5cb9");
			translate.setSearch({ itemType: "journalArticle", DOI: doi });
		}

		// don't save when item is done
		translate.setHandler("itemDone", function (_translate, item) {
			let key = item.DOI || MAGIC_INVALID_DOI;
			if (!item.title) {
				Zotero.debug("No title available for " + key);
				item.title = "[No Title]";
			}
			items[key] = item;
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
				let select = buildSelections(items);
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
	
		await translate.translate();
	}
}

async function doWeb(doc, url) {
	let doiOrDOIs = getDOIs(doc, url);
	Z.debug(doiOrDOIs);
	await retrieveDOIs(doiOrDOIs);
}

function buildSelections(items) {
	let select = {};
	// The `select` mapping will be populated from the `items`
	// object keyed by DOI, but first, we check if the special item
	// "current web page" may be a duplicate of the DOI-resolved
	// items -- and if so, the "current web page" choice is no
	// longer offered.
	let possibleCurrentWebPageDOI;
	let minDissimilarity = 1;
	let currentWebPageItem = items[MAGIC_INVALID_DOI];
	if (currentWebPageItem) {
		for (let [doi, item] of Object.entries(items)) {
			if (doi === MAGIC_INVALID_DOI || !item) {
				continue;
			}
			let d = itemDissimilarity(currentWebPageItem, item);
			if (d < minDissimilarity) {
				minDissimilarity = d;
				possibleCurrentWebPageDOI = doi;
			}
		}
	}

	if (minDissimilarity <= 0.05) {
		delete items[MAGIC_INVALID_DOI];
	}

	for (let doi in items) {
		let item = items[doi];
		if (item) {
			if (doi === MAGIC_INVALID_DOI) {
				select[doi] = "Current Webpage"
					+ (item.title !== "[No title]" ? ` (${item.title})` : "");
			}
			else {
				let title = item.title || "[" + item.DOI + "]";
				if (doi === possibleCurrentWebPageDOI
					&& minDissimilarity <= 0.05) {
					title += " (possibly current web page)";
				}
				select[doi] = title;
			}
		}
	}
	return select;
}

// Item dissimilarity, for deduplicating the "current web page" among the
// multiple. It is a number between 0 (identical) and 1 (totally different),
// calculated as the minimum of URL- and title-based dissimilarity metric.
function itemDissimilarity(a, b) {
	return Math.min(urlDissimilarity(a, b), titleDissimilarity(a, b));
}

// URL-based dissimilarity. If either item's URL is missing, the dissimilarity
// maxes out at 1. If top-level domains differ, it also maxes out. When
// top-level domains are the same, only the pathnames (without subdomains,
// query, fragment, etc.) are checked. The trailing slash in the pathname, if
// present, is ignored.
function urlDissimilarity(a, b) {
	if (!(a.url && b.url)) {
		return 1;
	}
	let aURL = new URL(a.url);
	let bURL = new URL(b.url);
	// only consider top-level domains; if they differ, max out the
	// dissimilarity
	if (topLevelDomain(aURL.hostname) !== topLevelDomain(bURL.hostname)) {
		return 1;
	}
	// further check among the URLs with the same hostname, by computing the
	// dissimilarity of pathnames
	let options = { isPath: true };
	let aPath = normalizeString(aURL.pathname, options);
	let bPath = normalizeString(bURL.pathname, options);
	return ZU.levenshtein(aPath, bPath) / Math.max(aPath.length, bPath.length);
}

// Title-based dissimilarity. If either item's URL is missing, the dissimilarity
// maxes out at 1.
function titleDissimilarity(a, b) {
	let aTitle = a.title || "";
	let bTitle = b.title || "";
	if (!(a.title && b.title)) {
		return 1;
	}
	let options = { normalizeDiacritics: true };
	aTitle = normalizeString(
		ZU.cleanTags(
			ZU.trimInternal(aTitle.trim())
		),
		options
	);
	bTitle = normalizeString(
		ZU.cleanTags(
			ZU.trimInternal(bTitle.trim())
		),
		options
	);
	return ZU.levenshtein(aTitle, bTitle) / Math.max(aTitle.length, bTitle.length);
}

function normalizeString(str, options = {}) {
	let output = str;
	if (options.isPath) {
		output = output.replace(/\/$/, ""); // strip last slash if any
	}
	output = output.toLowerCase(); // case-normalize
	if (options.normalizeDiacritics) {
		output = ZU.removeDiacritics(output);
	}
	// encode the astrals so that the JS "length" property is equal to the
	// string's code-point length
	return encodeURI(output);
}

function topLevelDomain(hostname) {
	return hostname.toLowerCase()
		.split(".")
		.slice(-2)
		.join(".");
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
						"fieldMode": 1
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
	},
	{
		"type": "web",
		"url": "https://www.callingbullshit.org/syllabus.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://physics.aps.org/articles/v16/127",
		"items": "multiple"
	}
]
/** END TEST CASES **/
