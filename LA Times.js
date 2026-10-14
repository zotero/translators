{
	"translatorID": "e4fe1596-a8c4-4d09-945f-120c4d83e580",
	"label": "LA Times",
	"creator": "Sebastian Karcher",
	"target": "^https?://(www\\.|travel\\.|articles\\.|latimesblogs\\.)?latimes\\.com",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-14 17:10:00"
}

/*
   LA Times Translator
   Copyright (C) 2012 Sebastian Karcher

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url) {
	if (/\/search\//.test(url) && getSearchResults(doc, true)) {
		return "multiple";
	}
	if (ZU.xpathText(doc, '//meta[@property="og:type"]/@content') == 'article'
		|| getJSONLD(doc)) {
		return "newspaperArticle";
	}
	return false;
}
function getJSONLD(doc) {
	for (let script of doc.querySelectorAll('script[type="application/ld+json"]')) {
		let data;
		try {
			data = JSON.parse(script.textContent);
		}
		catch (e) {
			continue;
		}
		for (let block of (Array.isArray(data) ? data : [data])) {
			if (!block || typeof block !== 'object') continue;
			for (let node of (block['@graph'] ? block['@graph'] : [block])) {
				if (node['@type'] == 'NewsArticle'
					|| (node['@type'] == 'Article' && node.headline)) {
					return node;
				}
			}
		}
	}
	return null;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	for (let a of doc.querySelectorAll('a[data-element="search-result-title"]')) {
		let href = a.href;
		let title = ZU.trimInternal(a.textContent);
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
			if (!items) return;
			ZU.requestDocument(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

// Wire services and syndication credits are organizations, never people.
const AGENCY_BYLINE = /^(?:the\s+)?(?:associated press|a\.?p\.?|agence france-presse|efe|afp|bloomberg(?: news)?|reuters|cnn|nbc news|cnbc|getty images|city news service|tribune news service|the new york times|the washington post)$/i;
const ROLE_ONLY = /^(?:staff writers?|staff|columnists?|contributing writers?|bureau chief|correspondents?|reporters?|editors?)$/i;
// "Jane Doe, Staff Writer" leaves the role in the name; "Jane Doe - Bureau Chief" too.
const ROLE_SUFFIX = /(?:[-,]\s*|\s+)(?:staff writers?|staff|columnists?|contributing writers?|bureau chief|correspondents?|reporters?|editors?)$/i;
// Translated (Espanol) pages join co-authors with " y " (or " e " before i-/hi- sounds).
const BYLINE_SPLIT = /\s+(?:y|e|and|&)\s+/i;

// A JSON-LD author name can be one person, several co-authors, or a wire service.
// Return the people only, with roles stripped.
function cleanBylines(name) {
	name = ZU.trimInternal(name).replace(/^by\s+/i, '').replace(/[,\s]+$/, '');
	let previous;
	do {
		previous = name;
		name = name.replace(ROLE_SUFFIX, '');
	} while (name && name !== previous);
	return name.split(BYLINE_SPLIT).map(s => fixNameCase(s.trim()))
		.filter(s => s && !AGENCY_BYLINE.test(s) && !ROLE_ONLY.test(s));
}

// Staff bylines frequently arrive in ALL CAPS; title-case them, keeping
// name particles lowercase.
function fixNameCase(name) {
	if (!name || name !== name.toUpperCase()) return name;
	const particle = /^(?:de|del|della|der|den|van|von|la|las|los|da|di|du|bin|al|el|y|e|and)$/i;
	return name.toLowerCase().split(/\s+/)
		.map((w, i) => (i > 0 && particle.test(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}

function scrape(doc, url) {
	var item = new Zotero.Item("newspaperArticle");
	var data = getJSONLD(doc);
	if (!data) {
		return;
	}
	item.title = data.headline || ZU.xpathText(doc, '//meta[@property="og:title"]/@content');
	item.abstractNote = data.description
		|| ZU.xpathText(doc, '//meta[@property="og:description"]/@content');
	item.date = data.datePublished
		|| ZU.xpathText(doc, '//meta[@property="article:published_time"]/@content');
	item.section = ZU.xpathText(doc, '//meta[@property="article:section"]/@content');
	// The site stopped emitting og:locale; <html lang> carries the real page
	// language ("es-US" on the Espanol edition, "en-US" otherwise).
	let lang = doc.documentElement.lang
		|| ZU.xpathText(doc, '//meta[@property="og:locale"]/@content')
		|| 'en-US';
	item.language = lang.replace('_', '-');
	item.ISSN = "0458-3035";
	item.publicationTitle = "Los Angeles Times";
	item.url = ZU.xpathText(doc, '//link[@rel="canonical"]/@href') || url;
	item.libraryCatalog = "www.latimes.com";

	for (let tag of doc.querySelectorAll('.tags a')) {
		let value = ZU.trimInternal(tag.textContent);
		if (value) item.tags.push(value);
	}

	let authors = data.author || [];
	if (typeof authors == 'object' && !Array.isArray(authors)) {
		authors = [authors];
	}
	for (let author of authors) {
		let name = typeof author == 'string' ? author : author.name;
		if (!name) continue;
		for (let person of cleanBylines(name)) {
			if (person.split(/\s+/).length > 3) {
				item.creators.push({ lastName: person, creatorType: "author", fieldMode: 1 });
			}
			else {
				item.creators.push(ZU.cleanAuthor(person, "author"));
			}
		}
	}

	item.attachments.push({
		title: "LA Times Snapshot",
		url: url,
		mimeType: "text/html"
	});

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.latimes.com/california/story/2026-10-13/bass-raman-tussle-in-final-televised-la-mayoral-debate",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Bass and Raman tussle in final televised L.A. mayoral debate",
				"creators": [
					{
						"firstName": "Noah",
						"lastName": "Goldberg",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Zahniser",
						"creatorType": "author"
					}
				],
				"date": "2026-10-14T03:52:38.500Z",
				"ISSN": "0458-3035",
				"abstractNote": "Bass portrayed Raman as someone who isn't ready to lead the city, while Raman described the mayor as being \"missing in action\" during fires in Pacific Palisades and Boyle Heights.",
				"language": "en-US",
				"libraryCatalog": "www.latimes.com",
				"publicationTitle": "Los Angeles Times",
				"section": "California",
				"url": "https://www.latimes.com/california/story/2026-10-13/bass-raman-tussle-in-final-televised-la-mayoral-debate",
				"attachments": [
					{
						"title": "LA Times Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": ["California"],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.latimes.com/business/hollywood/la-fi-ct-youtube-tv-20170405-story.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "YouTube TV launches today. It has some cool features and some big drawbacks",
				"creators": [],
				"date": "2017-04-05T18:00:00.000Z",
				"ISSN": "0458-3035",
				"abstractNote": "YouTube TV, Google's new streaming package of about 40 television channels, is the tech industry's latest bid to get cable-shunning millennials to pay for live TV over the Internet.",
				"language": "en-US",
				"libraryCatalog": "www.latimes.com",
				"publicationTitle": "Los Angeles Times",
				"section": "Hollywood Inc.",
				"url": "https://www.latimes.com/business/hollywood/la-fi-ct-youtube-tv-20170405-story.html",
				"attachments": [
					{
						"title": "LA Times Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": ["Hollywood Inc."],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.latimes.com/espanol/educacion/articulo/2026-10-13/eeuu-propone-tarifa-de-70-000-dolares-para-estudiantes-internacionales",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "EEUU propone tarifa de 70.000 dólares para estudiantes internacionales",
				"creators": [
					{
						"firstName": "Annie",
						"lastName": "Ma",
						"creatorType": "author"
					},
					{
						"firstName": "Heather",
						"lastName": "Hollingsworth",
						"creatorType": "author"
					}
				],
				"date": "2026-10-14T05:40:37.916Z",
				"ISSN": "0458-3035",
				"abstractNote": "El gobierno estadounidense propuso el miércoles una tarifa de 70.000 dólares para los estudiantes internacionales que buscan trabajar en el país, el más reciente en sus esfuerzos por endurecer las medidas contra la matrícula de extranjeros.",
				"language": "es-US",
				"libraryCatalog": "www.latimes.com",
				"publicationTitle": "Los Angeles Times",
				"section": "Educación",
				"url": "https://www.latimes.com/espanol/educacion/articulo/2026-10-13/eeuu-propone-tarifa-de-70-000-dolares-para-estudiantes-internacionales",
				"attachments": [
					{
						"title": "LA Times Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": ["Educación", "Noticas-Más", "EEUU", "California", "Vida y Estilo"],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
