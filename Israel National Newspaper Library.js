{
	"translatorID": "af178ee7-0feb-485d-9cba-3312daf7ebad",
	"label": "Israel National Newspaper Library",
	"creator": "Anonymus",
	"target": "^https:\\/\\/www\\.nli\\.org\\.il\\/(en|he|ar)\\/newspapers\\/[a-z]+\\/\\d{4}\\/\\d{2}\\/\\d{2}\\/\\d{2}\\/article\\/\\d{1,3}\\/?(\\?.*)?$",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-06-08 07:51:10"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2015 Philipp Zumstein

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
	if (url.includes("/article/")) {
		return "newspaperArticle";
	}
	return false;
}

async function doWeb(doc, url) {
	await scrape(doc, url);
}

async function scrape(doc, url) {
	try {
		let item = new Zotero.Item("newspaperArticle");

		let urlMatch = url.match(/^(https?:\/\/www\.nli\.org\.il\/(?:en|he|ar)\/newspapers\/[a-z]+\/\d{4}\/\d{2}\/\d{2}\/\d{2}\/article\/\d{1,3}\/)/);
		item.url = urlMatch ? urlMatch[1] : url;

		// Fallback values
		item.title = "Untitled";
		item.publicationTitle = "Unknown";
		item.date = "Unknown";

		// Extract from document title
		let rawTitle = doc.title;
		let parts = rawTitle.split("|").map(p => p.trim());
		if (parts.length >= 3) {
			item.title = parts[0].replace(/[\u200E\u2068\u2069]/g, "");
			item.publicationTitle = parts[1].replace(/[\u200E\u2068\u2069]/g, "");
			let parsed = Zotero.Utilities.strToDate(parts[2]);
			item.date = parsed.date || parts[2];
		} else {
			Zotero.debug(" Unexpected title format: " + rawTitle);
			item.title = rawTitle;
		}

		// Extract article body
		let bodyElement = doc.querySelector("#pagesectionstextcontainer");
		if (bodyElement) {
			item.abstractNote = Zotero.Utilities.trimInternal(bodyElement.textContent);
		}

		// Page number (broken)
		/*let scripts = doc.querySelectorAll("script");
		for (let script of scripts) {
			let text = script.textContent || "";
			let match = text.match(/sectionPageBlockAreas\['\d+\.(\d+)'\]\s*=\s*\[\{pageID:'\d+\.(\d+)'/);
			if (match) {
				item.pages = match[2];
				break;
			}
		}*/

		Zotero.debug(" Finished scraping, calling item.complete()");
		item.complete();
	} catch (e) {
		Zotero.debug(" Error in scrape(): " + e);
		throw e;
	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
