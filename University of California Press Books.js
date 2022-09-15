{
	"translatorID": "f27b5031-01fb-4f14-8829-6748f819eac4",
	"label": "University of California Press Books",
	"creator": "Abe Jellinek",
	"target": "^https://www\\.ucpress\\.edu/(book/|search\\.php\\?)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-06-29 06:45:51"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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
	if (url.includes('/book/')) {
		return "book";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.gs-title[href*="/book/"]');
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

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		item.creators = [];
		for (let contrib of doc.querySelectorAll('span.contrib')) {
			let name = text(contrib, 'a');
			let type = mapContribType(
				text(contrib, '.contribtype')
					.replace(/[()]/g, '')
					.toLowerCase());
			item.creators.push(ZU.cleanAuthor(name, type));
		}
		
		let fields = {
			Rights: 'rights',
			Pages: 'numPages',
			ISBN: 'ISBN'
		};
		
		for (let metadata of doc.querySelector('.details p').innerHTML.split('<br>')) {
			metadata = ZU.trimInternal(metadata);
			
			let matches = metadata.match(/([^:]+): (.*)/);
			if (!matches) continue;
			
			let [, key, value] = matches;
			if (fields[key]) item[fields[key]] = value;
		}
		
		if (item.ISBN) {
			item.ISBN = ZU.cleanISBN(item.ISBN);
		}
		
		item.abstractNote = text(doc, '#link-about-book article');
		item.date = ZU.strToISO(text(doc, '.date'));
		item.edition = cleanEdition(text(doc, '.edition'));
		
		if (doc.querySelector('h1 span')) {
			let subtitle = ZU.trimInternal(text(doc, 'h1 span'));
			if (!item.title.includes(subtitle)) {
				item.title += `: ${subtitle}`;
			}
		}
		
		item.attachments = [];
		item.url = '';
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "book";
		trans.doWeb(doc, url);
	});
}


function cleanEdition(text) {
	if (!text) return text;

	// from Taylor & Francis eBooks translator, slightly adapted

	const ordinals = {
		first: "1",
		second: "2",
		third: "3",
		fourth: "4",
		fifth: "5",
		sixth: "6",
		seventh: "7",
		eighth: "8",
		ninth: "9",
		tenth: "10"
	};

	text = ZU.trimInternal(text).replace(/[[\]]/g, '');
	// this somewhat complicated regex tries to isolate the number (spelled out
	// or not) and make sure that it isn't followed by any extra info
	let matches = text
		.match(/^(?:(?:([0-9]+)(?:st|nd|rd|th)?)|(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth))(?:\s?ed?\.?|\sedition)?$/i);
	if (matches) {
		let edition = matches[1] || matches[2];
		edition = ordinals[edition.toLowerCase()] || edition;
		return edition == "1" ? null : edition;
	}
	else {
		return text;
	}
}

function mapContribType(type) {
	switch (type) {
		case 'author':
			return 'author';
		case 'editor':
			return 'editor';
		case 'series editor':
			return 'seriesEditor';
		case 'translator':
			return 'translator';
		default:
			return 'contributor';
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.ucpress.edu/book/9780520344907/the-gentrification-of-the-internet",
		"items": [
			{
				"itemType": "book",
				"title": "The Gentrification of the Internet: How to Reclaim Our Digital Freedom",
				"creators": [
					{
						"firstName": "Jessa",
						"lastName": "Lingel",
						"creatorType": "author"
					}
				],
				"date": "2021-05",
				"ISBN": "9780520344907",
				"abstractNote": "How we lost control of the internet—and how to win it back. The internet has become a battleground. Although it was unlikely to live up to the hype and hopes of the 1990s, only the most skeptical cynics could have predicted the World Wide Web as we know it today: commercial, isolating, and full of, even fueled by, bias. This was not inevitable. The Gentrification of the Internet argues that much like our cities, the internet has become gentrified, dominated by the interests of business and capital rather than the interests of the people who use it. Jessa Lingel uses the politics and debates of gentrification to diagnose the massive, systemic problems blighting our contemporary internet: erosions of privacy and individual ownership, small businesses wiped out by wealthy corporations, the ubiquitous paywall. But there are still steps we can take to reclaim the heady possibilities of the early internet. Lingel outlines actions that internet activists and everyday users can take to defend and secure more protections for the individual and to carve out more spaces of freedom for the people—not businesses—online.",
				"language": "en",
				"libraryCatalog": "www.ucpress.edu",
				"numPages": "168",
				"rights": "Available worldwide",
				"shortTitle": "The Gentrification of the Internet",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ucpress.edu/book/9780520253124/the-jepson-manual",
		"items": [
			{
				"itemType": "book",
				"title": "The Jepson Manual: Vascular Plants of California, Thoroughly Revised and Expanded",
				"creators": [
					{
						"firstName": "Bruce G.",
						"lastName": "Baldwin",
						"creatorType": "editor"
					},
					{
						"firstName": "Douglas",
						"lastName": "Goldman",
						"creatorType": "editor"
					},
					{
						"firstName": "David J.",
						"lastName": "Keil",
						"creatorType": "editor"
					},
					{
						"firstName": "Robert",
						"lastName": "Patterson",
						"creatorType": "editor"
					},
					{
						"firstName": "Thomas J.",
						"lastName": "Rosatti",
						"creatorType": "editor"
					},
					{
						"firstName": "Dieter",
						"lastName": "Wilken",
						"creatorType": "editor"
					}
				],
				"date": "2012-01",
				"ISBN": "9780520253124",
				"abstractNote": "The second edition of The Jepson Manual thoroughly updates this acclaimed work, the single most comprehensive resource on California's amazingly diverse flora. Integrating the latest science with the results of intensive fieldwork, institutional collaboration, and the efforts of hundreds of contributing authors, this new edition is an essential reference on California's native and naturalized vascular plants. This edition includes treatments of many newly described or discovered taxa and recently introduced plants, and it reflects major improvements in plant taxonomy. Nearly two-thirds of the 7,600 species, subspecies, and varieties that the volume describes are now illustrated with diagnostic drawings. Geographic distributions, elevation ranges, flowering times, nomenclature, and the status of non-natives and native taxa of special concern have all been updated throughout. The second edition also allows for identification of 240 alien taxa that are not fully naturalized and features a new chapter on geologic, climatic, and vegetation history of California.",
				"edition": "2",
				"language": "en",
				"libraryCatalog": "www.ucpress.edu",
				"numPages": "1600",
				"rights": "Available worldwide",
				"shortTitle": "The Jepson Manual",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ucpress.edu/book/9780520240964/sierra-nevada-natural-history",
		"items": [
			{
				"itemType": "book",
				"title": "Sierra Nevada Natural History: Revised Edition",
				"creators": [
					{
						"firstName": "Tracy I.",
						"lastName": "Storer",
						"creatorType": "author"
					},
					{
						"firstName": "Robert L.",
						"lastName": "Usinger",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Lukas",
						"creatorType": "author"
					},
					{
						"firstName": "John",
						"lastName": "Game",
						"creatorType": "contributor"
					},
					{
						"firstName": "Peter",
						"lastName": "Gaede",
						"creatorType": "contributor"
					},
					{
						"firstName": "Christopher",
						"lastName": "Rogers",
						"creatorType": "contributor"
					},
					{
						"firstName": "Tom",
						"lastName": "Taylor",
						"creatorType": "contributor"
					},
					{
						"firstName": "Bill",
						"lastName": "Nelson",
						"creatorType": "contributor"
					},
					{
						"firstName": "Phyllis M.",
						"lastName": "Faber",
						"creatorType": "seriesEditor"
					},
					{
						"firstName": "Bruce M.",
						"lastName": "Pavlik",
						"creatorType": "seriesEditor"
					}
				],
				"date": "2004-09",
				"ISBN": "9780520240964",
				"abstractNote": "The magnificent and much-loved Sierra Nevada, called the \"Range of Light\" by John Muir, is the dominant feature on the California landscape. First published forty years ago, this handbook has become an enduring natural history classic, used by thousands to learn more about virtually every aspect of this spectacular mountain range—from its superb flora and fauna to its rugged topography. Comprehensive yet concise and portable, the book describes hundreds of species: trees and shrubs, flowering plants and ferns, fungi and lichens, insects and fish, amphibians and reptiles, and birds and mammals. Now completely updated and revised, it will continue to be the essential guide to the Sierra Nevada for a new generation of hikers, campers, tourists, naturalists, students, and teachers—everyone who wants to know more about this unique and beautiful mountain range. * Describes more than 750 of the species most likely to be encountered with more than 500 new color photographs and 218 detailed black-and-white drawings * Includes engaging and accessible introductory sections on Sierra Nevada topography, climate, geological history, and human history * The compact, updated species accounts make identification easy, provide informative remarks on ecology and life history, and note which species are threatened or endangered",
				"language": "en",
				"libraryCatalog": "www.ucpress.edu",
				"numPages": "592",
				"rights": "Available worldwide",
				"shortTitle": "Sierra Nevada Natural History",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ucpress.edu/book/9780520289888/division-system-in-crisis",
		"items": [
			{
				"itemType": "book",
				"title": "Division System in Crisis",
				"creators": [
					{
						"firstName": "Nak-chung",
						"lastName": "Paik",
						"creatorType": "author"
					},
					{
						"firstName": "Kim",
						"lastName": "Myung-hwan",
						"creatorType": "translator"
					},
					{
						"firstName": "Sol",
						"lastName": "June-Kyu",
						"creatorType": "translator"
					},
					{
						"firstName": "Song",
						"lastName": "Seung-chul",
						"creatorType": "translator"
					},
					{
						"firstName": "Young-joo",
						"lastName": "Ryu",
						"creatorType": "translator"
					},
					{
						"firstName": "Bruce",
						"lastName": "Cumings",
						"creatorType": "contributor"
					}
				],
				"date": "2011-10",
				"ISBN": "9780520289888",
				"abstractNote": "Paik Nak-chung is one of Korea’s most incisive contemporary public intellectuals. By training a literary scholar, he is perhaps best known as an eloquent cultural and political critic. This volume represents the first book-length collection of his writings in English. Paik’s distinctive theme is the notion of a “division system” on the Korean peninsula, the peculiar geopolitical and cultural logic by which one nation continues to be divided into two states, South and North. Identifying a single structure encompassing both Koreas and placing it within the framework of the contemporary world-system, Paik shows how this reality has insinuated itself into virtually every corner of modern Korean life.",
				"language": "en",
				"libraryCatalog": "www.ucpress.edu",
				"numPages": "280",
				"rights": "Available worldwide",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ucpress.edu/search.php?q=homer&submit=",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
