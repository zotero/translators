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
	"lastUpdated": "2023-08-18 07:39:58"
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
	creators: [
		{ firstName: "Joseph", lastName: "Bosworth", creatorType: "author" },
		{ firstName: "Thomas Northcote", lastName: "Toller", creatorType: "editor" },
		{ firstName: "Christ", lastName: "Sean", creatorType: "editor" },
		{ firstName: "Ondřej", lastName: "Tichy", creatorType: "editor" },
	],
};

function scrape(doc, url = doc.location.href) {
	let item = new Z.Item("dictionaryEntry");

	// "Constant" fields
	Object.assign(item, BOSWORTH_TOLLER_INFO);

	// Page-specific data
	item.url = url;

	// Word entry
	item.title = normalizeLemma(doc) || "[Unknown entry]";

	// Original publication and page number in it, if any, as extra
	item.extra = getExtraInfo(doc);

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
	b: "Original Dictionary Title: An Anglo-Saxon Dictionary, Based on the Manuscript Collections of the Late Joseph Bosworth, D.D., F.R.S.\nOriginal Date: 1898\nOriginal Publisher: Oxford University Press\nOriginal Place: London",
	d: "Original Dictionary Title: An Anglo-Saxon Dictionary, Based on the Manuscript Collections of the Late Joseph Bosworth; Supplement\nOriginal Date: 1921\nOriginal Publisher: Oxford University Press\nOriginal Place: London",
};

// Get the extra info including original volume info and page number by parsing
// the URL of the scanned page linked to the article. Returns a string where
// each extra entry occupies one line in `key: value` format, or empty string
// if the original book and page cannot be determined.
function getExtraInfo(doc) {
	let imageURL = attr(doc, ".btd--image-pin-pan > img", "src");
	if (!imageURL) {
		return "";
	}
	// "b" for main book (1898), "d" for supplement (1912)
	let pageMatch = imageURL.match(/^\/images-dictionary\/bt_([bd])(\d+)\..+$/);
	if (!pageMatch) {
		return "";
	}
	let [, bookKey, page] = pageMatch;
	return BOOK_ORIG_INFO[bookKey] // static original publication info
		+ "\nOriginal Page: " + page.replace(/^0*/, ""); // trim leading zero
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

// Utility functions

// Remove the acute accent and macron if any.
function removeDiacritics(str) {
	return str.normalize("NFD").replace(/[\u0301\u0304]/g, "");
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
				"extra": "Original Dictionary Title: An Anglo-Saxon Dictionary, Based on the Manuscript Collections of the Late Joseph Bosworth, D.D., F.R.S.\nOriginal Date: 1898\nOriginal Publisher: Oxford University Press\nOriginal Place: London\nOriginal Page: 700",
				"language": "en",
				"libraryCatalog": "Bosworth Toller's Anglo-Saxon Dictionary Online",
				"place": "Prague",
				"publisher": "Faculty of Arts, Charles University",
				"url": "https://bosworthtoller.com/23205",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
				"extra": "Original Dictionary Title: An Anglo-Saxon Dictionary, Based on the Manuscript Collections of the Late Joseph Bosworth, D.D., F.R.S.\nOriginal Date: 1898\nOriginal Publisher: Oxford University Press\nOriginal Place: London\nOriginal Page: 183",
				"language": "en",
				"libraryCatalog": "Bosworth Toller's Anglo-Saxon Dictionary Online",
				"place": "Prague",
				"publisher": "Faculty of Arts, Charles University",
				"url": "https://bosworthtoller.com/7096",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
				"extra": "Original Dictionary Title: An Anglo-Saxon Dictionary, Based on the Manuscript Collections of the Late Joseph Bosworth, D.D., F.R.S.\nOriginal Date: 1898\nOriginal Publisher: Oxford University Press\nOriginal Place: London\nOriginal Page: 855",
				"language": "en",
				"libraryCatalog": "Bosworth Toller's Anglo-Saxon Dictionary Online",
				"place": "Prague",
				"publisher": "Faculty of Arts, Charles University",
				"url": "https://bosworthtoller.com/27305",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
				"extra": "Original Dictionary Title: An Anglo-Saxon Dictionary, Based on the Manuscript Collections of the Late Joseph Bosworth, D.D., F.R.S.\nOriginal Date: 1898\nOriginal Publisher: Oxford University Press\nOriginal Place: London\nOriginal Page: 694",
				"language": "en",
				"libraryCatalog": "Bosworth Toller's Anglo-Saxon Dictionary Online",
				"place": "Prague",
				"publisher": "Faculty of Arts, Charles University",
				"url": "https://bosworthtoller.com/23035",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
				"extra": "Original Dictionary Title: An Anglo-Saxon Dictionary, Based on the Manuscript Collections of the Late Joseph Bosworth; Supplement\nOriginal Date: 1921\nOriginal Publisher: Oxford University Press\nOriginal Place: London\nOriginal Page: 562",
				"language": "en",
				"libraryCatalog": "Bosworth Toller's Anglo-Saxon Dictionary Online",
				"place": "Prague",
				"publisher": "Faculty of Arts, Charles University",
				"url": "https://bosworthtoller.com/53107",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
				"extra": "Original Dictionary Title: An Anglo-Saxon Dictionary, Based on the Manuscript Collections of the Late Joseph Bosworth; Supplement\nOriginal Date: 1921\nOriginal Publisher: Oxford University Press\nOriginal Place: London\nOriginal Page: 154",
				"language": "en",
				"libraryCatalog": "Bosworth Toller's Anglo-Saxon Dictionary Online",
				"place": "Prague",
				"publisher": "Faculty of Arts, Charles University",
				"url": "https://bosworthtoller.com/42878",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
