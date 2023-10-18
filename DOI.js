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
	"lastUpdated": "2023-10-18 13:29:55"
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

var FALLBACK_CURRENT_PAGE_KEY = "not a DOI; placeholder for current web page"; // clearer than using a nullish value

async function retrieveDOIs(doiOrDOIs, fallbackDoc) {
	// Use the URL of the current page (the page from which the translation was
	// initiated) as the key for the item corresponding to the current page.
	// This will have special meaning for Connector and its title will be
	// marked as current page, in the correct localization.
	let currentPageKey = fallbackDoc.location.href;
	// In the rare case the location.href is falsy or not looking like a real
	// location, don't use it; instead use a string that doesn't match DOI.
	if (!/^https?:\/\/.+/.test(currentPageKey)) {
		currentPageKey = FALLBACK_CURRENT_PAGE_KEY;
	}
	let showSelect = Array.isArray(doiOrDOIs);
	let dois = showSelect ? [currentPageKey, ...doiOrDOIs] : [doiOrDOIs];
	let items = {};
	let numDOIs = dois.length;

	for (const doi of dois) {
		items[doi] = null;

		let translate;
		if (doi === currentPageKey) {
			// First, create the special item for the current page, to be
			// saved as a webpage item if selected
			translate = Zotero.loadTranslator("web");
			// Embedded Metadata
			translate.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
			translate.setDocument(fallbackDoc);
			// Expando flag as a hack to be used in itemDone handler callback.
			// This is a workaround for the case when the DOI resolution API
			// returns an item without actual DOI field; very much an edge case
			// (but see the "Template_talk:Doi" test case). TODO: Actually
			// purge those invalid items.
			translate.isEM = true;
		}
		else {
			translate = Zotero.loadTranslator("search");
			translate.setTranslator("b28d0d42-8549-4c6d-83fc-8382874a5cb9");
			translate.setSearch({ itemType: "journalArticle", DOI: doi });
		}

		// don't save when item is done
		translate.setHandler("itemDone", function (_translate, item) {
			let key = translate.isEM ? currentPageKey : item.DOI;
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
					let firstItem = Object.values(items)[0];
					if (firstItem) {
						firstItem.complete();
					}
					return;
				}

				// Otherwise, allow the user to select among items that resolved successfully
				// build the selection options by filtering through the
				// "items", skipping any failed resolution, and do some
				// cross-correlation to detect whether one of the DOI-resolved
				// item could refer to the current page. In the latter case,
				// "item" will be updated to use the special "currentPageKey"
				// for that item.
				let select = buildSelections(items, currentPageKey);
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
	await retrieveDOIs(doiOrDOIs, doc);
}

// Build a key -> title mapping to be passed to Z.selectItems().
// "currentPageKey" is the URL of the page on which the translation is
// initiated. If none of the DOI-items looks like the current page, we keep the
// first, EM-generated item, as a choice presented to the user. Otherwise, if
// one of the DOI-items looks like it's referring to the current page, its key
// is set to the reference URL in both the input "items" (NOTE: this is a
// side-effect) and the output object.
function buildSelections(items, currentPageKey) {
	let possibleCurrentWebPageDOI;
	// min. dissimilarity of DOI-items to the current-page special item
	let minDissimilarity = 2; // starting with a value greater than max
	let currentWebPageItem = items[currentPageKey];
	if (currentWebPageItem) {
		for (let [key, item] of Object.entries(items)) {
			if (key === currentPageKey || !item) {
				// Either it's the special item or the item failed to resolve
				continue;
			}
			let d = itemDissimilarity(currentWebPageItem, item);
			if (d < minDissimilarity) {
				minDissimilarity = d; // update min
				possibleCurrentWebPageDOI = key;
			}
		}
	}

	// Populate the output
	let select = {};
	let empty = true;
	if (minDissimilarity <= 0.05) { // One of the DOI-items is current page
		// In the input "items", reset the current-page-as-DOI-item's key to
		// the special key "currentPageKey", by deleting the old key and
		// insert the value at "currentPageKey"; this also overwrites the old
		// value -- the EM-generated item -- if any.
		items[currentPageKey] = items[possibleCurrentWebPageDOI];
		delete items[possibleCurrentWebPageDOI];
	}
	for (let [key, item] of Object.entries(items)) {
		if (!item) continue;

		let title = item.title;
		if (key === currentPageKey) {
			title = `Current Web Page (${title})`;
		}
		select[key] = title;
		empty = false;
	}
	return !empty && select;
}

// Item dissimilarity, for deduplicating the "current web page" among the
// multiple. It is a number between 0 (identical) and 1 (totally different).
function itemDissimilarity(a, b) {
	return urlDissimilarity(a, b) && titleDissimilarity(a, b);
}

// URL-based dissimilarity. If either item's URL is missing, the dissimilarity
// maxes out. Scheme, query, fragment are ignored; domain comparison is modulo
// subdomains and letter case. Pathname equality check is done ignoring the
// last trailing slash but otherwise verbatim. The output is either 0 or 1.
function urlDissimilarity(a, b) {
	if (!(a.url && b.url)) {
		return 1;
	}
	let aURL = new URL(a.url);
	let bURL = new URL(b.url);
	if (aURL.pathname.replace(/\/$/, "") !== bURL.pathname.replace(/\/$/, "")) {
		return 1;
	}
	if (!isSubDomain(aURL.hostname, bURL.hostname)) {
		return 1;
	}
	return 0;
}

// Title-based dissimilarity. If either item's URL is missing, the dissimilarity
// maxes out at 1.
function titleDissimilarity(a, b) {
	let aTitle = a.title || "";
	let bTitle = b.title || "";
	if (!(a.title && b.title)) {
		return 1;
	}
	aTitle = normalizeTitle(aTitle);
	bTitle = normalizeTitle(bTitle);
	let d = ZU.levenshtein(aTitle, bTitle) / Math.max(aTitle.length, bTitle.length);
	return d;
}

var NORM_TITLE_CACHE = {};
function normalizeTitle(str) {
	if (Object.hasOwn(NORM_TITLE_CACHE, str)) {
		return NORM_TITLE_CACHE[str];
	}
	let output = ZU.cleanTags(str).toLowerCase(); // case-normalize
	output = ZU.removeDiacritics(output);
	output = ZU.trimInternal(
		ZU.XRegExp.replace(
			output,
			ZU.XRegExp('[^\\pL\\pN\\s]', "g"), // Remove punctuations
			""
		)
	);
	// encode the astrals so that the JS "length" property is equal to the
	// string's code-point length, but reinstate the space for debugging
	output = encodeURI(output).replace(/%20/g, " ");
	NORM_TITLE_CACHE[str] = output;
	return output;
}

// Test whether a is a subdomain of b or vice versa
function isSubDomain(a, b) {
	let aParts = a.replace(/\.$/, "").toLowerCase().split(".");
	let bParts = b.replace(/\.$/, "").toLowerCase().split(".");
	let long, short;
	if (aParts.length >= bParts.length) {
		long = aParts;
		short = bParts;
	}
	else {
		short = aParts;
		long = bParts;
	}
	let str;
	let result = true;
	while (typeof (str = short.pop()) !== "undefined") {
		if (str !== long.pop()) {
			result = false;
			break;
		}
	}
	return result;
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
