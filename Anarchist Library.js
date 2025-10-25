{
	"translatorID": "1a31e4c5-22ed-4b5b-a75f-55476db29a44",
	"label": "Anarchist Library",
	"creator": "Sister Baæ'l",
	"target": "https://theanarchistlibrary\\.org/(latest|library|stats/popular|category/topic|category/author|special/index|search)",
	"minVersion": "7.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-25 01:31:43"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Dandelion Good and the righteous Anti Toil Theologians at Iliff
	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

/*
***** BEGIN ATTRIBUTION BLOCK *****
This translator was developed by Dandelion Good.

If you do any work on this translator, please add yourself here <3.
*/

var allAttachmentTypes = {
	"Plain PDF": { ext: ".pdf", mimeType: "application/pdf" },
	"A4 PDF": { ext: ".a4.pdf", mimeType: "application/pdf" },
	"Letter PDF": { ext: ".lt.pdf", mimeType: "application/pdf" },
	EPub: { ext: ".epub", mimeType: "application/epub+zip" },
	"Printer-friendly HTML": { ext: ".html", mimeType: "text/html" },
	LaTeX: { ext: ".tex", mimeType: "application/x-tex" },
	"Plain Text": { ext: ".muse", mimeType: "text/plain" },
	"Source Zip:": { ext: ".zip", mimeType: "application/zip" },
	Snapshot: { ext: "snapshot", mimeType: "text/html" }
};

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll("a.list-group-item");
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(text(row, "strong"));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function scrape(doc, url = doc.location.href) {
	// ToDo: get fancier here, allow other types
	let item = new Zotero.Item('manuscript');

	// These may be expanded on in the future
	let attachmentTypes = {
		PDF: allAttachmentTypes["Plain PDF"],
	};

	item.url = url;
	item.language = attr(doc, "html", "lang");

	let itemType = attr(doc, '[property~="og:type"]', 'content');
	let tagNodeList = doc.querySelectorAll(`[property~="og:${itemType}:tag"]`);
	let description = attr(doc, '[property~="og:description"]', 'content');
	let author = attr(doc, `[property~="og:${itemType}:author"]`, 'content');
	item.creators.push(ZU.cleanAuthor(author, "author"));

	if (description) {
		item.description = description;
		// misses https://theanarchistlibrary.org/library/leo-tolstoy-the-complete-works-of-count-tolstoy-volume-12
		let re = /(?<=[Tt]ranslated(?: +to [Ee]nglish)? +by ).*$/u;
		let translatedMatch = description.match(re);
		if (translatedMatch) {
			item.creators.push(ZU.cleanAuthor(translatedMatch[0], "translator", translatedMatch[0].includes(",")));
		}
	}

	let date = getPreambleVal(doc, "textdate");
	let notes = getPreambleVal(doc, "preamblenotes");
	// misses link here: https://theanarchistlibrary.org/library/margaret-killjoy-it-s-time-to-build-resilient-communities
	let source = getPreambleVal(doc, "preamblesrc");

	for (let tagNode of tagNodeList) {
		item.tags.push({ tag: tagNode.content });
	}

	let title = attr(doc.head, '[property~="og:title"][content]', 'content');
	item.title = title;
	item.date = date;
	if (notes) {
		item.notes.push({ note: ZU.trimInternal(notes) });
	}
	if (source) {
		item.notes.push({ note: `Source: ${ZU.trimInternal(source)}` });
	}

	for (let [typeName, typeInfo] of Object.entries(attachmentTypes)) {
		let attachment = {
			title: typeName,
			url: `${doc.location.href}${typeInfo.ext}`,
			mimeType: typeInfo.mimeType
		};

		if (typeInfo.ext == "snapshot") {
			attachment.document = doc;
		}

		item.attachments.push(attachment);
	}

	item.complete();
}

var libraryRe = /library\//;


function detectWeb(doc, url) {
	if (libraryRe.test(url)) {
		return 'manuscript';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getPreambleVal(doc, id) {
	let preamble = doc.body.querySelector("div#preamble");
	return text(preamble, `div#${id}`).slice(text(preamble, `span#${id}-label`).length);
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://theanarchistlibrary.org/library/abel-paz-durruti-in-the-spanish-revolution",
		"items": [
			{
				"itemType": "manuscript",
				"title": "Durruti in the Spanish Revolution",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Abel",
						"lastName": "Paz"
					},
					{
						"creatorType": "translator",
						"firstName": "Chuck",
						"lastName": "Morse"
					}
				],
				"date": "1996",
				"url": "https://theanarchistlibrary.org/library/abel-paz-durruti-in-the-spanish-revolution",
				"language": "en",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Buenaventura Durruti"
					},
					{
						"tag": "Spanish Revolution"
					},
					{
						"tag": "biography"
					}
				],
				"notes": [
					{
						"note": "Translated to English by Chuck Morse"
					},
					{
						"note": "Source: Published by AK Press in 2006 (please support the publisher!). Retrieved on 19th September 2020 from https://libcom.org/library/durruti-spanish-revolution"
					}
				],
				"seeAlso": [],
				"libraryCatalog": "Anarchist Library"
			}
		]
	},
	{
		"type": "web",
		"url": "https://theanarchistlibrary.org/library/errico-malatesta-the-general-strike-and-the-insurrection-in-italy",
		"items": [
			{
				"itemType": "manuscript",
				"title": "The General Strike and the Insurrection in Italy",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Errico",
						"lastName": "Malatesta"
					}
				],
				"date": "1914",
				"language": "en",
				"url": "https://theanarchistlibrary.org/library/errico-malatesta-the-general-strike-and-the-insurrection-in-italy",
				"libraryCatalog": "Anarchist Library",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "General Strike"
					},
					{
						"tag": "Italy"
					},
					{
						"tag": "history"
					},
					{
						"tag": "insurrection"
					}
				],
				"notes": [
					{
						"note": "Freedom (London) 28, no. 303 (July 1914). In the article, written shortly after his escape from Italy and return to London, Malatesta provides an account of the Red Week, which broke out on 7 June 1914 in Ancona, where Malatesta lived."
					},
					{
						"note": "Source: The Method of Freedom: An Errico Malatesta Reader, edited by Davide Turcato, translated by Paul Sharkey."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://theanarchistlibrary.org/library/ulrika-holgersson-britta-grondahl",
		"items": [
			{
				"title": "Britta Gröndahl",
				"itemType": "manuscript",
				"creators": [
					{
						"firstName": "Ulrika",
						"lastName": "Holgersson",
						"creatorType": "author"
					},
					{
						"firstName": "Alexia",
						"lastName": "Grosjean",
						"creatorType": "translator"
					}
				],
				"notes": [
					{
						"note": "Translated by Alexia Grosjean."
					},
					{
						"note": "Source: Retrieved on 11th March 2025 from www.skbl.se"
					}
				],
				"tags": [
					{
						"tag": "Sweden"
					},
					{
						"tag": "biography"
					}
				],
				"date": "2018-03-08",
				"seeAlso": [],
				"libraryCatalog": "Anarchist Library",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					}
				],
				"url": "https://theanarchistlibrary.org/library/ulrika-holgersson-britta-grondahl",
				"language": "en"
			}
		]
	},
	{
		"type": "web",
		"url": "https://theanarchistlibrary.org/library/emile-armand-the-forerunners-of-anarchism",
		"items": [
			{
				"itemType": "manuscript",
				"title": "The Forerunners of Anarchism",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Emile",
						"lastName": "Armand"
					},
					{
						"creatorType": "translator",
						"firstName": "",
						"lastName": "Reddebrek"
					}
				],
				"notes": [
					{
						"note": "Translated by Reddebrek."
					},
					{
						"note": "Source: Provided by the translator."
					}
				],
				"tags": [
					{
						"tag": "history"
					},
					{
						"tag": "individualism"
					},
					{
						"tag": "proto-anarchism"
					}
				],
				"date": "1933",
				"seeAlso": [],
				"libraryCatalog": "Anarchist Library",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					}
				],
				"url": "https://theanarchistlibrary.org/library/emile-armand-the-forerunners-of-anarchism",
				"language": "en"
			}
		]
	},
	{
		"type": "web",
		"url": "https://theanarchistlibrary.org/search?query=kropotkin",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://theanarchistlibrary.org/search?query=spirit",
		"items": "multiple"
	}
]
/** END TEST CASES **/
