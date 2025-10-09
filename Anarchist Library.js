{
	"translatorID": "1a31e4c5-22ed-4b5b-a75f-55476db29a44",
	"label": "Anarchist Library",
	"creator": "Sister Baæ'l",
	"target": "https://theanarchistlibrary.org/(latest|library|stats/popular|category/topic|category/author|special/index|search)",
	"minVersion": "7.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-07 11:18:38"
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

var urlBase = "https://theanarchistlibrary.org/";

// ToDo: Localization
var languageNames = new Intl.DisplayNames(['en'], { type: 'language' });

function getListItems(doc) {
	// todo copied from below
	let items = {};
	let results = doc.querySelectorAll('a.list-group-item');
	for (let i = 0; i < results.length; i++) {
		items[results[i].href] = text(results[i], "strong").trim();
	}
	return items;
}

function getSearchItems(doc) {
	let items = {};
	let results = doc.querySelectorAll('a.list-group-item');
	for (let i = 0; i < results.length; i++) {
		items[results[i].href] = text(results[i], "strong").trim();
	}
	return items;
}

async function doLibraryItem(doc, url = doc.location.href) {
	// ToDo: get fancier here, allow other types
	let item = new Zotero.Item('webpage');

	let language = languageNames.of(attr(doc, "html", "lang"));

	item.accessed = new Date().toString();
	item.url = url;
	item.language = language;

	let itemType = attr(doc, '[property~="og:type"]', 'content');
	const tagNodeList = doc.querySelectorAll(`[property~="og:${itemType}:tag"]`);
	let description = attr(doc, '[property~="og:description"]', 'content');
	let author = attr(doc, `[property~="og:${itemType}:author"]`, 'content');
	let authorFirstName = author.substring(0, author.indexOf(' '));
	let authorLastName = author.substring(author.indexOf(' ') + 1);
	item.creators.push({ creatorType: "author", firstName: authorFirstName, lastName: authorLastName });

	if (description) {
		item.description = description;
		// misses https://theanarchistlibrary.org/library/leo-tolstoy-the-complete-works-of-count-tolstoy-volume-12
		let re = /(?<=[Tt]ranslated(?: +to [Ee]nglish)? +by ).*$/u;
		let translatedMatch = description.match(re);
		if (translatedMatch) {
			let translator = { creatorType: "translator" };
			if (translatedMatch[0].match(/ /)) {
				translator.firstName = translatedMatch[0].substring(0, translatedMatch.indexOf(' '));
				translator.lastName = translatedMatch[0].substring(translatedMatch.indexOf(' ') + 1);
			}
			else {
				translator.lastName = translatedMatch[0];
			}
			item.creators.push(translator);
		}
	}

	let date = getPreambleVal(doc, "textdate");
	let notes = getPreambleVal(doc, "preamblenotes");
	// misses link here: https://theanarchistlibrary.org/library/margaret-killjoy-it-s-time-to-build-resilient-communities
	let source = getPreambleVal(doc, "preamblesrc");

	let tags = [];
	for (let i = 0; i < tagNodeList.length; i++) {
		tags = tags.concat(tagNodeList[i].content);
	}

	let title = attr(doc.head, '[property~="og:title"][content]', 'content');
	item.title = title;
	item.tags = tags;
	item.date = date;
	if (notes) {
		item.notes.push({ note: notes.trim() });
	}
	if (source) {
		item.notes.push({ note: `Source: ${source.trim()}` });
	}
	item.attachments = [{
		document: doc,
		title: "Snapshot",
		snapshot: true
	},
	{
		title: "Epub",
		url: `${doc.location.href}.epub`
	},
	// ToDo: Do this conditionally
	{
		title: "Latex",
		url: `${doc.location.href}.tex`
	}];
	return item.complete();
}

var listRe = new RegExp(String.raw`${urlBase}(category/topic/|category/author/|latest|popular)`);
var searchRe = new RegExp(String.raw`${urlBase}search?`);
var libraryRe = new RegExp(String.raw`library/`);


var matchers = {
	list: { matcher: listRe, type: "multiple", do: null, get: getListItems },
	search: { matcher: searchRe, type: "multiple", do: null, get: getSearchItems },
	document: { matcher: libraryRe, type: "webpage", do: doLibraryItem, get: null }
};


function detectWeb(doc, url) {
	// ToDo: Error handling
	// ToDo: let itemType = doc.head.querySelector('[property~="og:type"]').content;
	for (const matcherConfig of Object.values(matchers)) {
		if (url.match(matcherConfig.matcher)) {
			return matcherConfig.type;
		}
	}

	return false;
}

function getPreambleVal(doc, id) {
	let preamble = doc.body.querySelector("div#preamble");
	return text(preamble, `div#${id}`).slice(text(preamble, `span#${id}-label`).length);
}

async function doWeb(doc, url) {
	// ToDo: localize this
	for (const matcherConfig of Object.values(matchers)) {
		if (url.match(matcherConfig.matcher)) {
			if (matcherConfig.type == "multiple") {
				let items = await Zotero.selectItems(matcherConfig.get(doc));
				if (!items) break;
				for (let url of Object.keys(items)) {
					await doLibraryItem(await requestDocument(url));
				}
			}
			else {
				await matcherConfig.do(doc, url);
			}
			break;
		}
	}
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://theanarchistlibrary.org/library/abel-paz-durruti-in-the-spanish-revolution",
		"items": [
			{
				"itemType": "webpage",
				"title": "Durruti in the Spanish Revolution",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Abel",
						"lastName": "Paz"
					},
					{
						"creatorType": "translator",
						"firstName": "",
						"lastName": "Chuck Morse"
					}
				],
				"date": "1996",
				"url": "https://theanarchistlibrary.org/library/abel-paz-durruti-in-the-spanish-revolution",
				"language": "English",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					},
					{
						"title": "Epub"
					},
					{
						"title": "Latex"
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
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://theanarchistlibrary.org/library/jp-o-malley-the-utopia-of-rules-david-graeber-interview",
		"items": [
			{
				"itemType": "webpage",
				"title": "The Utopia of Rules, David Graeber Interview",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "JP",
						"lastName": "O’ Malley"
					}
				],
				"date": "1st April 2015",
				"language": "English",
				"url": "https://theanarchistlibrary.org/library/jp-o-malley-the-utopia-of-rules-david-graeber-interview",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					},
					{
						"title": "Epub"
					},
					{
						"title": "Latex"
					}
				],
				"tags": [
					{
						"tag": "bureaucracy"
					},
					{
						"tag": "interview"
					}
				],
				"notes": [
					{
						"note": "JP O’ Malley interviews anthropologist, activist, anarchist and author, David Graeber, who was one of the early organisers of Occupy Wall Street."
					},
					{
						"note": "Source: Retrieved on 15th October 2024 from bellacaledonia.org.uk"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://theanarchistlibrary.org/library/errico-malatesta-the-general-strike-and-the-insurrection-in-italy",
		"items": [
			{
				"itemType": "webpage",
				"title": "The General Strike and the Insurrection in Italy",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Errico",
						"lastName": "Malatesta"
					}
				],
				"date": "1914",
				"language": "English",
				"url": "https://theanarchistlibrary.org/library/errico-malatesta-the-general-strike-and-the-insurrection-in-italy",
				"attachments": [
					{
						"title": "Snapshot",
						"snapshot": true,
						"mimeType": "text/html"
					},
					{
						"title": "Epub"
					},
					{
						"title": "Latex"
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
		"url": "https://theanarchistlibrary.org/library/voltairine-de-cleyre-report-of-the-work-of-the-chicago-mexican-liberal-defense-league",
		"items": [
			{
				"itemType": "webpage",
				"title": "Report of the Work of the Chicago Mexican Liberal Defense League",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Voltairine",
						"lastName": "de Cleyre"
					}
				],
				"date": "1912",
				"language": "English",
				"url": "https://theanarchistlibrary.org/library/voltairine-de-cleyre-report-of-the-work-of-the-chicago-mexican-liberal-defense-league",
				"attachments": [
					{
						"title": "Snapshot",
						"snapshot": true,
						"mimeType": "text/html"
					},
					{
						"title": "Epub"
					},
					{
						"title": "Latex"
					}
				],
				"tags": [
					{
						"tag": "Mexican revolution"
					},
					{
						"tag": "history"
					}
				],
				"notes": [
					{
						"note": "From ‘Mother Earth’, April 1912, New York City, published by Emma Goldman, edited by Alexander Berkman."
					},
					{
						"note": "Source: Retrieved on 2024-02-02 from <mgouldhawke.wordpress.com/2024/02/01/report-of-the-work-of-the-chicago-mexican-liberal-defense-league-voltairine-de-cleyre-1912>"
					}
				],
				"seeAlso": []
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
