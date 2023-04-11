{
	"translatorID": "c159dcfe-8a53-4301-a499-30f6549c340d",
	"label": "DOI",
	"creator": "Simon Kornblith, Abe Jellinek, Aurimas Vinckevicius, Avram Lyon, Dan Stillman, Emiliano Heyns, Matt Burton, Philipp Zumstein, Sebastian Karcher, and Zoë C. Ma",
	"target": "",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 400,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-04-11 06:13:53"
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

// NOTE: This is the web translator for scraping DOI from text and links. Not
// to be confused with the DOI search translator, which it makes use of.

/* General reference for DOI numbering:
 * https://www.doi.org/the-identifier/resources/handbook/2_numbering
 *
 * In a previous version the DOI prefix after "10." is restricted to a digit
 * sequence not shorter than 4. However, the DOI spec clearly states that part
 * should just be a "string", and makes use of examples like "10.123/abc".
 * In practice these are rare (but you never know), and we only use the
 * alphanumeric characters with the full stop.
 */

/*
	Non-URLEncoded DOI (i.e. the underlying identifier as-is, as a sequence of
	Unicode code points). This is for scraping DOIs from text, hence the name
	"contextual".

	There is little restriction on the DOI syntax, except it that should
	consist of printable Unicode characters (even whitespaces are allowed). In
	practice, for "contextual" matches we should...
		1) exclude whitespaces, and
		2) normally terminate at the last appearance (with possible intervening
		non-whitespace characters) of typical "delimiting" punctuations such as
		the comma. These delimiting characters, although permitted, are not
		very probable in practice.

	NOTE: Despite these restrictions, the RegExp can be too lenient. For
	example, it will match the following text:

	"Example DOI: 10.0000/example(but this is a bad example)"

	The match will be "10.0000/example(but", which is rarely a sensible output.

	BUT, we will sanitize any unmatched or badly nested parentheses, brackets,
	braces, and angular braces (lt and gt signs), so the last example will end
	up being "10.0000/example", which is likely more salvageable.

	The expression reads
	"word-boundary, prefix (10 dot something), slash, as many non-whitespace
	non-quotation-mark chars as possible, and the furthermost non-whitespace
	non-delimiting-punct character"

	Here these delimiting characters (in the last negated bracket character
	class) are the quotation marks, opening parentheses (matching parentheses
	pairs may appear in the DOI, except we currently exclude the CJK
	parentheses), and typical language-segment-delimiting puncts (full stop,
	comma, semicolon, etc.), but excluding the hyphen.
*/
// ASCII double and single quotes plus common Unicode quotation marks.
const quotationMarks = String.raw`"'«»‘’\u201A-\u201F‹›⹂\u300C-\u300F`;
const contextualDOIRe
	= new RegExp(String.raw`\b10\.[0-9A-Za-z.]+/` // prefix
		+ String.raw`[^\s${quotationMarks}]*` // non-ws non-quote characters
		// word delimiting puncts
		+ String.raw`[^\s${quotationMarks}([{（）《》.,;:?!。，：；、？！]`,
	"g");

/*
	For percent-encoded, or more precisely percent-decodeable URL (absolute or
	relative) as the value of HTML "href" attribute, it will be preprocessed by
	splitting at the literal ? (query delimiter), # (fragment delimiter), and &
	(query parameter separator) characters (if these characters are not
	percent-encoded, they're special delimiters in the URL).

	Then, each segment will be percent-decoded, then parsed by the RE below.

	In each segment, we match *a lot* more leniently: we will match *including*
	the whitespaces and puncts. The reason is that the URL or segment should be
	much less "noisy" because they are machine-readable in nature. If a part of
	the URL contains the DOI signature "10.xxx.../" it is likely that the DOI
	goes to the end of the segment, if the segment decodes successfully.

	NOTE again: This RE should only be applied to the decoded URL segment.
*/
const hrefValueDOIRe = /\b10\.[^/]+\/.+/g;
// NOTE: For some implementations there could be "doubly (or more) encoded"
// strings in the attribute values -- "doubly encoded" if interpreted as
// DOI, but perfectly OK as a redirect parameter value, e.g., for login pages.
// These links are unlikely to produce any DOI we don't otherwise have.

/*
	The recommended way to present a DOI *as* a URL string
	(as path under the https://doi.org/ proxy origin), *even in text*, is to
	percent-encode the URL, for good interoperability reasons. The problem is
	that we don't necessarily know whether any such string is *meant* to be
	decoded or not. And guessing the correct semantics may incur its own
	penalty.

	But IRL this is rarely a problem, because such URL-like strings in text are
	most likely hyperlinked to the correct URL, and that link value will be
	processed under our strategy.

	We may still generate a false positive (the encoded form that is taken as
	raw DOI by our algorithm), but this will incur a resolution failure and
	we'll not further process it.

	Nevertheless, we are still interested in improving the accuracy, because we
	want to minimize the number of bad resolution requests. If more accurate
	algorithms can be reasonably implemented without great detriment to code
	maintainability, or even improving it, we should welcome them.
 */

/**
 * @return {string | string[]} A single string if the URL contains a DOI
 * 		and the document contains no others, or an array of DOIs otherwise
 */
function getDOIs(doc, url) {
	let fromURL = sanitizePairedPunct(getDOIFromURL(url));
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

// NOTE: We should case-normalize according to the DOI spec, which says the
// registry uses all uppercase internally. We follow this convention.

// for convenience in map().
function toUpper(str) {
	return str.toUpperCase();
}

// Parse the input string url (assuming it's well-formed encoded URL or
// component) for DOIs. If getAll, returns an array of matches or false when no
// match is found. If not getAll (default), return the first match if any, or
// false if not found. Note that this function itself doesn't sanitize or
// case-normalize.
function getDOIFromURL(url, getAll = false) {
	// Split on #, ?, and &, to minimize noise while match leniently (see
	// comment at hrefValueDOIRe).
	const result = [];

	let urlParts = url.split(/[#?&]/);
	for (const urlPart of urlParts) {
		if (!urlPart) {
			continue;
		}

		try {
			// NOTE: Must decode...
			const matches = decodeURIComponent(urlPart).match(hrefValueDOIRe);
			if (matches) {
				if (getAll) {
					result.push(...matches.map(toUpper));
				}
				else {
					// Return on first match.
					return toUpper(matches[0]);
				}
			}
		}
		catch (err) {
			// ...but decoding may fail. In that case, skip it.
			if (!(err instanceof URIError)) {
				throw err;
			}
		}
	}

	return result.length && result;
}

// Filter out <script> and <style> tags in tree walker.
const TEXT_NODE_FILTER = new (function () {
	const ignore = ["script", "style"];
	this.acceptNode
		= node => !ignore.includes(node.parentNode.tagName.toLowerCase());
})();

// Add the sanitized and normalized results (if any) from an array of string
// matches to the set.
function addCleanMatchesTo(set, matchesArray) {
	matchesArray.forEach((match) => {
		const cleanMatch = sanitizePairedPunct(toUpper(match));
		if (cleanMatch) {
			set.add(cleanMatch);
		}
	});
}

// Scrape the document's text nodes (excluding those of <script> and <style>)
// and <a> or <link> tag's href attribute values for DOIs, keeping the
// sanitized and case-normalized valus. If not found, return empty array.
function getDOIsFromDocument(doc) {
	const dois = new Set();

	doc.body.normalize();
	const treeWalker = doc.createTreeWalker(doc.body, 4, TEXT_NODE_FILTER);

	let node;
	while ((node = treeWalker.nextNode()) !== null) {
		// Z.debug(node.nodeValue)
		const textMatches = node.nodeValue.match(contextualDOIRe);
		if (textMatches) {
			addCleanMatchesTo(dois, textMatches);
		}
	}
	
	const links = doc.querySelectorAll('a[href], link[href]');
	for (node of links) {
		// NOTE: The "href" property returns the whole URL. It is not necessary
		// to use the whole URL, because we look for DOIs in each segment. The
		// base URL is processed as its own. So we retrieve the attribute value
		// verbatim using getAttribute().
		const linkHref = node.getAttribute("href");
		const hrefMatches = getDOIFromURL(linkHref, true/* getAll */);
		if (hrefMatches) {
			// TODO: Should we even "clean" this?
			addCleanMatchesTo(dois, hrefMatches);
		}
	}

	return Array.from(dois);
}

// Sanitize input string by counting the appearance of the following paired
// punct characters: ( ), [ ], { }, < >. It is highly unlikely that a
// well-formed DOI should contain unmatched parentheses or so.
//
// The string is returned unchanged if it passes the sanitization. Otherwise,
// return the slice truncated at the furthermost location that will leave the
// parentheses match (here "match" includes total absence, and the returned
// slice may be empty).
//
// Constant lookup table for groups of puncts.
const PUNCT_LOOKUP = {
	"(": "(",
	"[": "[",
	"{": "{",
	"<": "<",
	")": "(",
	"]": "[",
	"}": "{",
	">": "<",
};

function sanitizePairedPunct(str) {
	// This is beyond the reach of regular languages; we need stacks.
	const stack = [];

	for (let i = 0; i < str.length; i++) {
		const c = str[i]; // current character
		const stackKey = PUNCT_LOOKUP[c]; // find pairing group if any


		const curObj = { index: i, character: c };
		if (stackKey) { // skip irrelevant characters
			if (c === stackKey) {
				// opening character
				stack.push(curObj);
			}
			else {
				// closing character
				const lastObj = stack.pop();

				if (!lastObj) { // dangling closing character
					stack.push(curObj);
					break;
				}
				else if (lastObj.character !== stackKey) { // badly nested
					stack.push(lastObj);
					break;
				}
			}
		}
	}

	return stack.length ? str.slice(0, stack[0].index) : str;
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
		"url": "https://onlinelibrary.wiley.com/action/showCitFormats?doi=10.7448%2FIAS.15.5.18440",
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
		"url": "https://analyticalsciencejournals.onlinelibrary.wiley.com/action/showCitFormats?doi=10.1002%2F%28SICI%291096-9918%28199804%2926%3A4%3C235%3A%3AAID-SIA360%3E3.0.CO%3B2-A",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Oxidation of molybdenum surfaces by reactive oxygen plasma and O2+ bombardment: an auger and XPS study",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "L. D.",
						"lastName": "López-Carreño"
					},
					{
						"creatorType": "author",
						"firstName": "G.",
						"lastName": "Benítez"
					},
					{
						"creatorType": "author",
						"firstName": "L.",
						"lastName": "Viscido"
					},
					{
						"creatorType": "author",
						"firstName": "J. M.",
						"lastName": "Heras"
					},
					{
						"creatorType": "author",
						"firstName": "F.",
						"lastName": "Yubero"
					},
					{
						"creatorType": "author",
						"firstName": "J. P.",
						"lastName": "Espinós"
					},
					{
						"creatorType": "author",
						"firstName": "A. R.",
						"lastName": "González-Elipe"
					}
				],
				"date": "04/1998",
				"DOI": "10.1002/(SICI)1096-9918(199804)26:4<235::AID-SIA360>3.0.CO;2-A",
				"ISSN": "0142-2421, 1096-9918",
				"issue": "4",
				"journalAbbreviation": "Surf. Interface Anal.",
				"language": "en",
				"libraryCatalog": "DOI.org (Crossref)",
				"pages": "235-241",
				"publicationTitle": "Surface and Interface Analysis",
				"shortTitle": "Oxidation of molybdenum surfaces by reactive oxygen plasma and O2+ bombardment",
				"url": "https://onlinelibrary.wiley.com/doi/10.1002/(SICI)1096-9918(199804)26:4<235::AID-SIA360>3.0.CO;2-A",
				"volume": "26",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://aurimasv.github.io/z2csl/typeMap.xml",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://onlinelibrary.wiley.com/action/showCitFormats?doi=10.1002%2F(SICI)1521-3951(199911)216%3A1%3C135%3A%3AAID-PSSB135%3E3.0.CO%3B2-%23",
		"items": "multiple"
	}
]
/** END TEST CASES **/
