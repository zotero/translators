{
	"translatorID": "b2d07a2a-c8c6-4426-ba6b-35f094a4d916",
	"label": "Bosworth Toller's Anglo-Saxon Dictionary Online",
	"creator": "Zoë C. Ma",
	"target": "^https://bosworthtoller\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-06-20 02:57:32"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Zoë C. Ma

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


function detectWeb(doc) {
	// The logic is that "a page's type is determined by its content", because
	// the current implementation of the dictionary web app may not be able to
	// sync URL correctly all the time.
	if (getSearchResults(doc, true/* checkOnly */)) {
		return "multiple";
	}

	if (doc.querySelector("#btd--entry-single")) {
		return "dictionaryEntry";
	}

	return false;
}

function getSearchResults(doc, checkOnly = false) {
	let items = {};
	let found = false;
	let rows = doc.querySelectorAll(".btd--search-entry");
	for (let row of rows) {
		// Don't retrieve the "similar entry" links
		let href = attr(row, ".btd--search-entry-header a", "href");
		let title = ZU.trimInternal(text(row, ".btd--entry-grammar").trim());
		if (!title) {
			title = text(row, ".btd--search-entry-header a"); // fallback
		}
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc) === 'multiple') {
		let items = await Z.selectItems(getSearchResults(doc));
		if (!items) return;
		for (let url of Object.keys(items)) {
			scrape(await requestDocument(url));
		}
	}
	else {
		scrape(doc, url);
	}
}

const BOSWORTH_TOLLER_INFO = {
	dictionaryTitle: "An Anglo-Saxon Dictionary Online",
	language: "en",
	place: "Prague",
	publisher: "Faculty of Arts, Charles University",
	date: "2014",
	originalPublisher: "Oxford University Press",
	originalPlace: "London",
	creators: [
		ZU.cleanAuthor("Joseph Bosworth", "author"),
		ZU.cleanAuthor("Thomas Northcote Toller", "editor"),
		ZU.cleanAuthor("Christ Sean", "editor"),
		ZU.cleanAuthor("Ondřej Tichy", "editor"),
	],
};

function scrape(doc, url = doc.location.href) {
	let item = new Z.Item("dictionaryEntry");

	// "Constant" fields
	Object.assign(item, BOSWORTH_TOLLER_INFO);
	item.rights = ZU.trimInternal(text(doc, ".btd--copyright-citation p")); // first paragraph

	// Page-specific data
	item.url = url;

	// Word entry
	item.title = normalizeLemma(doc) || "[Unknown entry]";

	// Original publication and page number in it, if any
	let tmp = getPage(doc); // may be null, which is OK for assign
	Object.assign(item, tmp);

	// Notes (summary of word definitions)
	if ((tmp = getNotes(doc, item.title))) { // NOTE: assignment
		item.notes = tmp;
	}

	// Snapshot
	item.attachments = [{
		document: doc,
		title: "Snapshot",
		mimeType: "text/html"
	}];

	item.complete();
}

// See https://bosworthtoller.com/images-dictionary/frontback_matter.pdf
var BOOK_ORIG_INFO = {
	b: {
		originalDictionaryTitle: "An Anglo-Saxon Dictionary, Based on the Manuscript Collections of the Late Joseph Bosworth, D.D., F.R.S.",
		originalDate: "1898",
	},
	d: {
		originalDictionaryTitle: "An Anglo-Saxon Dictionary, Based on the Manuscript Collections of the Late Joseph Bosworth; Supplement",
		originalDate: "1921",
	},
};

// Get the original volume info and page number by parsing the URL of the
// scanned page linked to the article. Returns an object with the fields
// suitably populated.
function getPage(doc) {
	let imageURL = attr(doc, ".btd--image-pin-pan > img", "src");
	if (!imageURL) {
		return null;
	}
	// "b" for main book (1898), "d" for supplement (1912)
	let pageMatch = imageURL.match(/^\/images-dictionary\/bt_([bd])(\d+)\..+$/);
	if (!pageMatch) {
		return null;
	}
	let [, bookKey, page] = pageMatch;
	let info = BOOK_ORIG_INFO[bookKey];
	// NOTE that this modifies the book info object in-place
	info.originalPage = page.replace(/^0*/, "");
	return info;
}

// Normalize the lemma's vowel display-form, following the original book's
// orthography (acute for long vowel).
// Why is this necessary? Because the lemma prominently displayed on the page
// main body can be configured by the user (by clicking on the icons: acute,
// macron, and none). But we want the form used in our item data normalized, no
// matter the display option, in order to not lose information and avoid
// duplication.
// NOTE that the letter case is not normalized -- the display on the page
// corresponds to the lemma in the original book.
function normalizeLemma(doc) {
	// The key is to apply the correct vowel length even if the user disables
	// its display. This "canonical" form (which corresponds to the original
	// form in the print book) can be found either in the metadata or in the
	// "citation" block under "entry information" in the doc, no matter the
	// citation style in use on the page.
	let titleRaw = text(doc, "#btd--entry-lemma").trim();
	let titleNormalized = removeDiacritics(titleRaw);

	// lemma from the meta field, not normally amenable to client-side
	// modification
	let metaTitle = attr(doc, 'meta[property="og:title"]', "content").trim();
	let metaTitleNormalized = removeDiacritics(metaTitle);

	if (metaTitle && titleNormalized === metaTitleNormalized) {
		return metaTitle;
	}

	return null;
}

// Return an array of a single Note object representing the word definitions,
// word-category info, and the grammar info, or false if none of such info is
// found.
function getNotes(doc, title) {
	// We do so by creating a detached DOM subtree at "root" using the text
	// info gleaned from the page. We will only use plain-text info scraped
	// from the doc to construct our own subtree; no node from the doc, apart
	// from its textContent, is directly used. This is done so as to return a
	// minimal HTML-fragment usable as the note, with no attributes etc.
	// Once done, the subtree's innerHTML (which contains only text nodes and
	// elements we created on our own, with sanitized input) is used as the
	// source of the Note.
	let root = doc.createElement("div");
	let done = false; // truthiness of "done" is used as guard for return value

	// Make an element with enclosed text content (must not be a void element)
	function newElement(tag, content) {
		let element = doc.createElement(tag);
		if (content) {
			element.textContent = content; // this also sanitizes the content
		}
		return element;
	}

	// Add a section under the given heading level and text, and if "textBelow"
	// is truthy, append it (i.e. it becomes the content below the heading).
	function addSection(headingLevel, headingText, textBelow) {
		root.append(newElement(headingLevel, headingText));
		if (textBelow) {
			root.append(textBelow);
		}
		return root;
	}

	// Make an <ul> element, with given array of strings as the text content
	// in its <li> child elements.
	function itemize(stringArray) {
		let list = doc.createElement("ul");
		list.append(...stringArray.map(str => newElement("li", str)));
		return list;
	}

	addSection("h1", "Summary", title);

	// Word category, or part of speech (brief summary)
	// get an array of cleaned text into "tmp"
	let tmp = cleanupWordCategories(doc.querySelector(".btd--entry-word-categories"));
	if ((done = (tmp && tmp.length))) { // NOTE: assignment
		addSection("h2", "Word category", itemize(tmp));
	}

	// Principal parts for inflection, etc. "tmp" is a string.
	tmp = ZU.trimInternal(text(doc, ".btd--entry-grammar").trim());
	if ((done = tmp)) { // NOTE: assignment
		addSection("h2", "Grammar", tmp);
	}

	// XXX: see complex definitions: https://bosworthtoller.com/27305
	// This doesn't work reliably because for complex definitions the data may
	// not have been correctly tagged.
	// Here we are only collecting "definitions" (brief definition in modern
	// English). Each entry is properly understood as a "sense" with context
	// around the definitions under it, and a sense can embed more senses
	// recursively.
	// NOTE: Some entries have extra "blurb" for addenda ("Add:") before all
	// senses that also uses the ".btd--entry-definition" class, but not for
	// definitions.
	let definitionNodes = doc.querySelectorAll(".btd--entry-definition");
	let definitions
		= Array.prototype.map.call(
			definitionNodes,
			node => ZU.trimInternal(node.innerText.trim())
		).filter(str => str && !str.startsWith("Add: "));

	const maxDefinitions = 5;
	if ((done = definitions.length)) { // NOTE: assignment
		if (definitions.length > maxDefinitions) {
			let numTruncated = definitions.length - maxDefinitions;
			definitions[maxDefinitions] = `[${numTruncated} more item${numTruncated > 1 ? "s" : ""} omitted]`;
		}
		addSection("h2", "Definition",
			itemize(definitions.slice(0, maxDefinitions + 1))
		);
	}

	return !!done && [{ note: root.innerHTML }];
}

// Clean-up the text of the word categories which makes heavy use of CSS
// pseudoelements. Without cleaning, the text in the brackets may run into each
// other without word-break. Given an input element, returns an array of
// cleaned strings for each <li> element under it.
function cleanupWordCategories(listElement) {
	if (!listElement) {
		return null;
	}
	let listItems = listElement.querySelectorAll(":scope li");
	return Array.prototype.map.call(listItems, cleanListItem)
		.filter(Boolean); // Don't keep empty output.
}

// Clean up the text of a single <li> element in the word-category section.
// This is done by duplicating the node, selecting a nodelist of
// ".btd--entry-word-category-detail" elements, fix all but the last one of
// them (which we assume are sibling elements, as it happens), and return the
// text of the fixed subtree. This is not the most efficient, but probably a
// lot easier to read than a more sophisticated solution.
function cleanListItem(element) {
	let dup = element.cloneNode(true/* deep */);
	let fixables = dup.querySelectorAll(":scope .btd--entry-word-category-detail");

	const numFixables = fixables.length;
	if (numFixables > 1) { // If no more than one "fixable", no need to fix anything.
		// Fix all but the last "fixables"
		for (let node of Array.prototype.slice.call(fixables, 0, numFixables - 1)) {
			// This amounts to recovering the ::after pseudoelement manually
			node.textContent = node.textContent.trim() + ", ";
		}
	}
	return ZU.trimInternal(dup.textContent);
}

// Utility functions

// Remove the diacritics on the letters, by decomposing and removing the
// combining diacritic characters in the \u0300-\u036F range.
function removeDiacritics(str) {
	return str.normalize("NFD").replace(/[\u0300-\u036F]/g, "");
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://bosworthtoller.com/search?q=heorte",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://bosworthtoller.com/search/advanced?q=%7B%22minFields%22%3A1,%22fields%22%3A%5B%7B%22query%22%3A%22diacon%22,%22field%22%3A%22headword%22,%22is_regex%22%3Afalse%7D,%7B%22query%22%3A%22%22,%22field%22%3A%22headword%22,%22condition%22%3A%22and%22,%22is_regex%22%3Afalse%7D%5D,%22wordclass%22%3A%7B%22include%22%3A%5B%221%22%5D,%22exclude%22%3A%5B%5D%7D,%22gender%22%3A%7B%22include%22%3A%5B%221%22%5D,%22exclude%22%3A%5B%5D%7D,%22subcategory%22%3A%7B%22include%22%3A%5B%5D,%22exclude%22%3A%5B%5D%7D,%22volume%22%3Anull%7D",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://bosworthtoller.com/23205",
		"items": [
			{
				"itemType": "dictionaryEntry",
				"title": "mucg-wyrt",
				"creators": [
					{
						"firstName": "Joseph",
						"lastName": "Bosworth",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas Northcote",
						"lastName": "Toller",
						"creatorType": "editor"
					},
					{
						"firstName": "Christ",
						"lastName": "Sean",
						"creatorType": "editor"
					},
					{
						"firstName": "Ondřej",
						"lastName": "Tichy",
						"creatorType": "editor"
					}
				],
				"date": "2014",
				"dictionaryTitle": "An Anglo-Saxon Dictionary Online",
				"language": "en",
				"libraryCatalog": "Bosworth Toller's Anglo-Saxon Dictionary Online",
				"place": "Prague",
				"publisher": "Faculty of Arts, Charles University",
				"rights": "All the data provided here are free for any purpose. If you use the data for academic purposes, we ask that you kindly cite us as your source. In case you need a large portion of the dictionary data or you need it in a specific format, let us know through the contact form, we are happy to do custom database dumps for researchers.",
				"url": "https://bosworthtoller.com/23205",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h1>Summary</h1>mucg-wyrt<h2>Grammar</h2>mucg-wyrt, mug-wyrt, e; f.<h2>Definition</h2><ul><li>A plant name mug-wort, (Scott. ) muggart, muggon, also called mother-wort. In the Herbarium, Lchdm. i, three kinds of mug-wort are mentioned</li></ul>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bosworthtoller.com/7096",
		"items": [
			{
				"itemType": "dictionaryEntry",
				"title": "CYN",
				"creators": [
					{
						"firstName": "Joseph",
						"lastName": "Bosworth",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas Northcote",
						"lastName": "Toller",
						"creatorType": "editor"
					},
					{
						"firstName": "Christ",
						"lastName": "Sean",
						"creatorType": "editor"
					},
					{
						"firstName": "Ondřej",
						"lastName": "Tichy",
						"creatorType": "editor"
					}
				],
				"date": "2014",
				"dictionaryTitle": "An Anglo-Saxon Dictionary Online",
				"language": "en",
				"libraryCatalog": "Bosworth Toller's Anglo-Saxon Dictionary Online",
				"place": "Prague",
				"publisher": "Faculty of Arts, Charles University",
				"rights": "All the data provided here are free for any purpose. If you use the data for academic purposes, we ask that you kindly cite us as your source. In case you need a large portion of the dictionary data or you need it in a specific format, let us know through the contact form, we are happy to do custom database dumps for researchers.",
				"url": "https://bosworthtoller.com/7096",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h1>Summary</h1>CYN<h2>Word category</h2><ul><li>noun [ masculine, neuter ]</li></ul><h2>Grammar</h2>CYN, cynn,es; n.<h2>Definition</h2><ul><li>every being of one kind, a kindred, kind, race, nation, people, tribe, family, lineage, generation, progeny, KIN ; genus, gens, natio, populus, stirps, tribus, familia, natales, origo, generatio, proles, progenies</li><li>Gender; genus</li><li>a sex; sexus</li></ul>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bosworthtoller.com/27305",
		"items": [
			{
				"itemType": "dictionaryEntry",
				"title": "secgan",
				"creators": [
					{
						"firstName": "Joseph",
						"lastName": "Bosworth",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas Northcote",
						"lastName": "Toller",
						"creatorType": "editor"
					},
					{
						"firstName": "Christ",
						"lastName": "Sean",
						"creatorType": "editor"
					},
					{
						"firstName": "Ondřej",
						"lastName": "Tichy",
						"creatorType": "editor"
					}
				],
				"date": "2014",
				"dictionaryTitle": "An Anglo-Saxon Dictionary Online",
				"language": "en",
				"libraryCatalog": "Bosworth Toller's Anglo-Saxon Dictionary Online",
				"place": "Prague",
				"publisher": "Faculty of Arts, Charles University",
				"rights": "All the data provided here are free for any purpose. If you use the data for academic purposes, we ask that you kindly cite us as your source. In case you need a large portion of the dictionary data or you need it in a specific format, let us know through the contact form, we are happy to do custom database dumps for researchers.",
				"url": "https://bosworthtoller.com/27305",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h1>Summary</h1>secgan<h2>Word category</h2><ul><li>verb [ weak ]</li></ul><h2>Grammar</h2>secgan, secgean, secggan, secggean, sæcgan ; p. sægde, sǽde; pp. sægd, sǽd. [Forms as from an infin. sagian—sagast, sagaþ ; p. sagode; imp. saga, are given here.]<h2>Definition</h2><ul><li>To say (of written or spoken words).</li><li>to say certain words, the words used being given</li><li>pronounce, deliver</li><li>to speak of, tell, relate, narrate, declare, announce, give an account of something</li><li>Ger. Dank sagen)</li><li>[5 more items omitted]</li></ul>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bosworthtoller.com/23035",
		"items": [
			{
				"itemType": "dictionaryEntry",
				"title": "mód-c-wánig",
				"creators": [
					{
						"firstName": "Joseph",
						"lastName": "Bosworth",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas Northcote",
						"lastName": "Toller",
						"creatorType": "editor"
					},
					{
						"firstName": "Christ",
						"lastName": "Sean",
						"creatorType": "editor"
					},
					{
						"firstName": "Ondřej",
						"lastName": "Tichy",
						"creatorType": "editor"
					}
				],
				"date": "2014",
				"dictionaryTitle": "An Anglo-Saxon Dictionary Online",
				"language": "en",
				"libraryCatalog": "Bosworth Toller's Anglo-Saxon Dictionary Online",
				"place": "Prague",
				"publisher": "Faculty of Arts, Charles University",
				"rights": "All the data provided here are free for any purpose. If you use the data for academic purposes, we ask that you kindly cite us as your source. In case you need a large portion of the dictionary data or you need it in a specific format, let us know through the contact form, we are happy to do custom database dumps for researchers.",
				"url": "https://bosworthtoller.com/23035",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h1>Summary</h1>mód-c-wánig<h2>Word category</h2><ul><li>adjective</li></ul><h2>Grammar</h2>mód-c-wánig, adj.<h2>Definition</h2><ul><li>Sad at heart</li></ul>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bosworthtoller.com/53107",
		"items": [
			{
				"itemType": "dictionaryEntry",
				"title": "hrǽw",
				"creators": [
					{
						"firstName": "Joseph",
						"lastName": "Bosworth",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas Northcote",
						"lastName": "Toller",
						"creatorType": "editor"
					},
					{
						"firstName": "Christ",
						"lastName": "Sean",
						"creatorType": "editor"
					},
					{
						"firstName": "Ondřej",
						"lastName": "Tichy",
						"creatorType": "editor"
					}
				],
				"date": "2014",
				"dictionaryTitle": "An Anglo-Saxon Dictionary Online",
				"language": "en",
				"libraryCatalog": "Bosworth Toller's Anglo-Saxon Dictionary Online",
				"place": "Prague",
				"publisher": "Faculty of Arts, Charles University",
				"rights": "All the data provided here are free for any purpose. If you use the data for academic purposes, we ask that you kindly cite us as your source. In case you need a large portion of the dictionary data or you need it in a specific format, let us know through the contact form, we are happy to do custom database dumps for researchers.",
				"url": "https://bosworthtoller.com/53107",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h1>Summary</h1>hrǽw<h2>Definition</h2><ul><li>A living body</li><li>a dead body, corpse</li></ul>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://bosworthtoller.com/42878",
		"items": [
			{
				"itemType": "dictionaryEntry",
				"title": "dón",
				"creators": [
					{
						"firstName": "Joseph",
						"lastName": "Bosworth",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas Northcote",
						"lastName": "Toller",
						"creatorType": "editor"
					},
					{
						"firstName": "Christ",
						"lastName": "Sean",
						"creatorType": "editor"
					},
					{
						"firstName": "Ondřej",
						"lastName": "Tichy",
						"creatorType": "editor"
					}
				],
				"date": "2014",
				"dictionaryTitle": "An Anglo-Saxon Dictionary Online",
				"language": "en",
				"libraryCatalog": "Bosworth Toller's Anglo-Saxon Dictionary Online",
				"place": "Prague",
				"publisher": "Faculty of Arts, Charles University",
				"rights": "All the data provided here are free for any purpose. If you use the data for academic purposes, we ask that you kindly cite us as your source. In case you need a large portion of the dictionary data or you need it in a specific format, let us know through the contact form, we are happy to do custom database dumps for researchers.",
				"url": "https://bosworthtoller.com/42878",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h1>Summary</h1>dón<h2>Word category</h2><ul><li>verb</li></ul><h2>Definition</h2><ul><li>to do, act</li><li>make war</li><li>to make.</li><li>with acc.</li><li>to cause.</li><li>[9 more items omitted]</li></ul>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
