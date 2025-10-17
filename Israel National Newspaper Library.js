{
	"translatorID": "9d8099b7-1c50-4159-9a67-f9fc1fb3b463",
	"label": "Israel National Newspaper Library",
	"creator": "Anonymus",
	"target": "^https:\\/\\/www\\.nli\\.org\\.il\\/(en|he|ar)\\/newspapers\\/.*",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-10-17 21:22:49"
}

/*
	***** BEGIN LICENSE BLOCK *****
 	This code is in the public domain
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
	if (url.includes("/article/") || url.includes("/page/")) {
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

	if (url.includes("/article/")) { // If article is an article and not just a page
		// Title
		const headline = JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent).headline || null;
		if (headline) item.title = ZU.trimInternal(headline);

		// Persistent link
		const linkNode = doc.querySelector("#sectionleveltabpersistentlinkarea .persistentlinkurl");
		item.url = linkNode ? ZU.trimInternal(linkNode.textContent) : url;

		// Language detection
		const paragraphs = Array.from(doc.querySelectorAll("#pagesectionstextcontainer p")).map(p => p.textContent.trim()).filter(Boolean);
		const sampleText = paragraphs.join(" ").slice(0, 1000); // Analyze first 1000 characters
		item.language = detectLanguageFromText(sampleText);

		// Page number
		const pageLabel = doc.querySelector('span.pagelabel.current b');
		if (pageLabel) {
			const split = pageLabel.textContent.split(" ");
			item.pages = split[1];
		}
	}

	// Date from <title>
	const date = ZU.trimInternal(doc.querySelector('li.breadcrumb-item:nth-child(3)').textContent);
	if (date) item.date = date;

	// Get publication
	const nliScript = doc.querySelector('script#nlijs');
	if (nliScript) {
		const rawJSON = nliScript.getAttribute('data-nli-data-json');
		try {
			const json = JSON.parse(rawJSON.replace(/&quot;/g, '"'));
			if (json.publicationTitle) {
				item.publicationTitle = json.publicationTitle;
			}
		}
		catch (e) {
			Zotero.debug("Failed to parse data-nli-data-json: " + e);
		}
	}

	if (url.includes("/page/")) { // If article is just a page
		const match = url.match(/\/page\/(\d+)(?:\/|$)/);
		if (match) {
			item.pages = match[1];
		}
		item.title = item.publicationTitle + ", " + item.date;
		item.url = url.split('?')[0].split('#')[0]; // No persistent link, just the original URL
	}

	item.libraryCatalog = "National Library of Israel";
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
