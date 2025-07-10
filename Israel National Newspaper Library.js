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
	"lastUpdated": "2025-06-23 14:49:30"
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

function detectLanguageFromText(text) {
	if (/[\u0590-\u05FF]/.test(text)) return "he"; // Hebrew range
	if (/[\u0600-\u06FF]/.test(text)) return "ar"; // Arabic range
	if (/[a-zA-Z]/.test(text)) return "en"; // Basic Latin letters
	return null;
}

async function scrape(doc, url) {
	const item = new Zotero.Item("newspaperArticle");

	// Title
	const titleNode = doc.querySelector("#sectionleveltabtitlearea h2");
	if (titleNode) item.title = titleNode.textContent.trim();

	// Persistent link
	const linkNode = doc.querySelector("#sectionleveltabpersistentlinkarea .persistentlinkurl");
	item.url = linkNode ? linkNode.textContent.trim() : url;

	// Date from <title>
	const pubMatch = doc.title.match(/\|\s*(\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \d{4})\s*\|/);
	if (pubMatch) item.date = pubMatch[1];

	// Abstract + Full Text
	const paragraphs = Array.from(doc.querySelectorAll("#pagesectionstextcontainer p")).map(p => p.textContent.trim()).filter(Boolean);
	if (paragraphs.length) {
		item.abstractNote = paragraphs[0];
		item.extra = "Full Text:\n" + paragraphs.join("\n\n");
	}

	// Publication from <title>
	const parts = doc.title.split("|").map(part => part.trim());
	if (parts.length >= 4) {
		item.publicationTitle = parts[parts.length - 4];
	}

	// Language detection
	const sampleText = paragraphs.join(" ").slice(0, 1000); // Analyze first 1000 characters
	item.language = detectLanguageFromText(sampleText);
	item.libraryCatalog = "National Library of Israel";

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	
]
/** END TEST CASES **/
