{
	"translatorID": "1f245496-4c1b-406a-8641-d286b3888231",
	"label": "The Boston Globe",
	"creator": "Matthew Weymar",
	"target": "^https?://(www\\.|search\\.|articles\\.|archive\\.)?boston(globe)?\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-04-14 00:00:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Matthew Weymar

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

/*
 * Rewritten 2026-04-14 to support the modern bostonglobe.com site.
 *
 * The modern site (Arc Publishing platform) embeds rich LD+JSON
 * (schema.org/NewsArticle) in every article page.  This translator
 * delegates to the Embedded Metadata translator for baseline extraction,
 * then post-processes the result using LD+JSON data for author, date,
 * section, and publication metadata.
 *
 * The legacy boston.com / archive.boston.com paths are retained via the
 * target regex but are handled by the Embedded Metadata fallback with
 * minimal post-processing.
 */


// -- Helpers ----------------------------------------------------------

/**
 * Parse the first LD+JSON block of type NewsArticle (or Article)
 * from the page.  Returns the parsed object, or null.
 */
function getLDJSON(doc) {
	var scripts = doc.querySelectorAll('script[type="application/ld+json"]');
	for (var i = 0; i < scripts.length; i++) {
		try {
			var data = JSON.parse(scripts[i].textContent);
			if (data && (data['@type'] === 'NewsArticle'
				|| data['@type'] === 'Article'
				|| data['@type'] === 'BlogPosting')) {
				return data;
			}
		}
		catch (e) {
			// malformed JSON, skip
		}
	}
	return null;
}


/**
 * Extract author name(s) from the LD+JSON author field.
 *
 * The Globe's LD+JSON uses:
 *   "author": {"@type": "Person", "name": ["Editorial Board"]}
 *   "author": [{"@type": "Person", "name": ["First Last"]}, ...]
 *
 * Note: "name" is an array (non-standard but consistent on this site).
 */
function extractAuthors(authorData) {
	if (!authorData) return [];

	// Normalise to an array of author objects
	var authors = Array.isArray(authorData) ? authorData : [authorData];
	var result = [];

	for (var i = 0; i < authors.length; i++) {
		var a = authors[i];
		var name = null;

		if (typeof a === 'string') {
			name = a;
		}
		else if (a && a.name) {
			// name can be a string or an array
			name = Array.isArray(a.name) ? a.name[0] : a.name;
		}

		if (name) {
			// "Editorial Board" etc. should be a single-field creator
			if (/board|staff|globe|editors/i.test(name)) {
				result.push({
					lastName: name,
					creatorType: 'author',
					fieldMode: 1
				});
			}
			else {
				result.push(ZU.cleanAuthor(name, 'author'));
			}
		}
	}
	return result;
}


// -- Translator API ---------------------------------------------------

function detectWeb(doc, url) {
	// Modern bostonglobe.com article URLs follow /YYYY/MM/DD/section/slug/
	if (/bostonglobe\.com\/\d{4}\/\d{2}\/\d{2}\//.test(url)) {
		return 'newspaperArticle';
	}
	// Legacy archive.boston.com
	if (/archive\.boston\.com\//.test(url)
		&& /\/\d{4}\/\d{2}\/\d{2}\//.test(url)) {
		return 'newspaperArticle';
	}
	// Search results (modern)
	if (url.includes('/search') && getSearchResults(doc, true)) {
		return 'multiple';
	}
	// Fallback: check og:type
	if (ZU.xpathText(doc, '//meta[@property="og:type" and @content="article"]/@content')) {
		return 'newspaperArticle';
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// Modern search result links
	var rows = doc.querySelectorAll('a[href*="/202"]');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = rows[i].textContent.trim();
		if (!href || !title) continue;
		if (!/bostonglobe\.com\/\d{4}\/\d{2}\/\d{2}\//.test(href)) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata translator
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');

	translator.setHandler('itemDone', function (obj, item) {
		item.itemType = 'newspaperArticle';
		item.publicationTitle = 'The Boston Globe';
		item.ISSN = '0743-1791';
		item.language = item.language || 'en-US';

		// LD+JSON is the most reliable source on the modern site
		var ld = getLDJSON(doc);

		if (ld) {
			// Headline (cleaner than og:title which appends " - The Boston Globe")
			if (ld.headline) {
				// Strip "Opinion | " prefix — this belongs in section, not title
				item.title = ld.headline.replace(/^Opinion\s*\|\s*/, '');
			}

			// Authors
			var authors = extractAuthors(ld.author);
			if (authors.length) {
				item.creators = authors;
			}

			// Date
			if (ld.datePublished) {
				item.date = ZU.strToISO(ld.datePublished);
			}

			// Section
			if (ld.articleSection) {
				item.section = ld.articleSection;
			}
		}

		// URL: prefer canonical link
		var canonical = ZU.xpathText(doc, '//link[@rel="canonical"]/@href');
		if (canonical) {
			item.url = canonical;
		}
		else {
			item.url = url;
		}

		// Clean up title: remove " - The Boston Globe" suffix if present
		if (item.title) {
			item.title = item.title.replace(/\s*-\s*The Boston Globe\s*$/, '');
		}

		// If LD+JSON had no authors, try the meta[name="author"] tag
		// (but only if Embedded Metadata didn't already get good ones)
		if (!item.creators || !item.creators.length) {
			var metaAuthor = ZU.xpathText(doc, '//meta[@name="author"]/@content');
			if (metaAuthor) {
				// Clean up common Globe quirks
				metaAuthor = metaAuthor.replace(/View\s*Comments?\s*\d*/gi, '').trim();
				var authorList = metaAuthor.split(/,\s*|\s+and\s+/);
				item.creators = [];
				for (var i = 0; i < authorList.length; i++) {
					var name = authorList[i].trim();
					if (name) {
						if (/board|staff|globe|editors/i.test(name)) {
							item.creators.push({
								lastName: name,
								creatorType: 'author',
								fieldMode: 1
							});
						}
						else {
							item.creators.push(ZU.cleanAuthor(name, 'author'));
						}
					}
				}
			}
		}

		item.libraryCatalog = 'The Boston Globe';

		Z.debug('Boston Globe translator: completed item');
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.splitTags = false;
		trans.doWeb(doc, url);
	});
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) === 'multiple') {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) return;
			var urls = [];
			for (var i in items) {
				urls.push(i);
			}
			ZU.processDocuments(urls, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.bostonglobe.com/2026/04/13/opinion/nantucket-geotubes-sea-level-rise/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Rising sea levels call for state leadership",
				"creators": [
					{
						"lastName": "Editorial Board",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2026-04-13",
				"abstractNote": "Nantucket homeowners have spent millions trying to hold back rising seas. Does that really make sense?",
				"ISSN": "0743-1791",
				"language": "en-US",
				"libraryCatalog": "The Boston Globe",
				"publicationTitle": "The Boston Globe",
				"section": "Editorials",
				"url": "https://www.bostonglobe.com/2026/04/13/opinion/nantucket-geotubes-sea-level-rise/",
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
		"url": "https://www.bostonglobe.com/2026/04/14/metro/healey-social-media-restrictions-teen-legislation/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Healey proposes restrictions on teen social media use",
				"creators": [
					{
						"firstName": "Anjali",
						"lastName": "Huynh",
						"creatorType": "author"
					}
				],
				"date": "2026-04-14",
				"abstractNote": "Governor Maura Healey said Tuesday that she wants \"to take the power away from social media platforms and Big Tech companies and put it back in the hands of our young people and our families.\"",
				"ISSN": "0743-1791",
				"language": "en-US",
				"libraryCatalog": "The Boston Globe",
				"publicationTitle": "The Boston Globe",
				"section": "Politics",
				"url": "https://www.bostonglobe.com/2026/04/14/metro/healey-social-media-restrictions-teen-legislation/",
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
		"url": "https://www.bostonglobe.com/2026/04/14/metro/old-mob-haunts-gentrification/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "What's now at an old Boston mob haunt? Something fancy.",
				"creators": [
					{
						"firstName": "Danny",
						"lastName": "McDonald",
						"creatorType": "author"
					}
				],
				"date": "2026-04-14",
				"abstractNote": "Where henchmen once made trouble, there are now $19 espresso martinis.",
				"shortTitle": "What's now at an old Boston mob haunt?",
				"ISSN": "0743-1791",
				"language": "en-US",
				"libraryCatalog": "The Boston Globe",
				"publicationTitle": "The Boston Globe",
				"section": "Cambridge & Somerville",
				"url": "https://www.bostonglobe.com/2026/04/14/metro/old-mob-haunts-gentrification/",
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
