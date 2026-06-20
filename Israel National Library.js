{
	"translatorID": "15f290a3-4203-491b-887f-e76b2d94f8a2",
	"label": "Israel National Library",
	"creator": "Anonymus",
	"target": "^https://www\\.nli\\.org\\.il/",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-06-20 12:07:54"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Made by Zotero contributors.
	
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
	if (url.includes("/newspapers/") && (url.includes("/article/"))) {
		return "newspaperArticle"; // Matches valid Zotero item type
	}
	return false;
}

async function doWeb(doc, url = doc.location.href) {
	// Standard template fallback signature for web translators
	await scrape(doc, url);
}

async function scrape(doc, url = doc.location.href) {
	const item = new Zotero.Item("newspaperArticle");

	// 1. TITLE
	let title = text(doc, '#sectionleveltabtitlearea h2') || text(doc, '#pagesectionstextcontainer p');
	if (title) {
		item.title = title;
	}

	// 2. URL
	let persistentLink = text(doc, '#documentdisplayleftpanesectionlevelpersistentlinkcontainer .persistentlinkurl');
	if (persistentLink) {
		item.url = persistentLink;
	} else {
		item.url = url.split('?')[0].split('#')[0];
	}

	// 3. PUBLICATION: Grab from Breadcrumb
	item.publicationTitle = text(doc, 'li.breadcrumb-item:nth-child(2)');

	// 4. DATE: Grab from Breadcrumb
	item.date = text(doc, 'li.breadcrumb-item:nth-child(3)');

	// 5. PAGE: Grab the currently active highlighted page tab
	let pageText = text(doc, 'span.pagelabel.current b');
	if (pageText) {
		let parts = pageText.split(/\s+/);
		item.pages = parts.length > 1 ? parts[1] : parts[0]; // Grabs "3" from "Page 3"
	}

	// Fallback if title is completely blank
	if (!item.title && item.publicationTitle && item.date) {
		item.title = `${item.publicationTitle}, ${item.date}`;
	}

	item.libraryCatalog = "National Library of Israel";
	item.complete(); // Finishes translating and saves item
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
