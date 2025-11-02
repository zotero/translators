{
	"translatorID": "c2173d2c-5383-4a37-a374-fe6c72b9387a",
	"label": "This Day",
	"creator": "VWF",
	"target": "^https?://(www\\.)?thisdaylive\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-11-02 22:51:31"
}

/*  
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2025 VWF
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

// ===== Helper functions =====

// Get meta property or name content
function meta(doc, nameOrProp) {
	let m = doc.querySelector(`meta[property="${nameOrProp}"], meta[name="${nameOrProp}"]`);
	return m ? m.getAttribute("content") : "";
}

// Extract date from URL like /YYYY/MM/DD/
function extractDateFromURL(url) {
	let m = url.match(/thisdaylive\.com\/(\d{4})\/(\d{2})\/(\d{2})\//);
	if (m) return `${m[1]}-${m[2]}-${m[3]}`;
	return "";
}

// Identify article URL pattern
function isArticleURL(url) {
	return /thisdaylive\.com\/\d{4}\/\d{2}\/\d{2}\//.test(url);
}

// Identify index (listing) pages
function isIndexURL(url) {
	return url && (url.includes("/tag/") || url.includes("/category/"));
}

// ===== Web detection =====
function detectWeb(doc, url) {
	url = url || doc.location.href;

	if (isIndexURL(url)) return "multiple";

	if (
		isArticleURL(url)
		|| doc.querySelector("section#single_article h1.article-title.mb-2")
	) {
		return "newspaperArticle";
	}

	return false;
}

// ===== Main entry =====
async function doWeb(doc, url) {
	let type = detectWeb(doc, url);

	if (type === "newspaperArticle") {
		await scrape(doc, url);
	}
	else if (type === "multiple") {
		let items = getSearchResults(doc, true);
		if (!items || !Object.keys(items).length) {
			Zotero.debug("No articles found on index page.");
			return; // Avoid throwing error if empty
		}
		let selected = await Zotero.selectItems(items);
		if (!selected) return;

		for (let articleURL of Object.keys(selected)) {
			let articleDoc = await requestDocument(articleURL);
			await scrape(articleDoc, articleURL);
		}
	}
}

// ===== Get article list for index pages =====
function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;

	// Match both older and newer ThisDay layouts
	let rows = doc.querySelectorAll(
		"h2.h6 > a, h3.entry-title > a, div.post-title a, article h3 a"
	);

	for (let row of rows) {
		let href = row.href;
		let title = row.textContent.trim();
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}

	return found ? items : false;
}

// ===== Main scrape logic =====
async function scrape(doc, url) {
	let item = new Zotero.Item("newspaperArticle");

	// Canonical URL
	let canonical = doc.querySelector('link[rel="canonical"]');
	item.url = canonical ? canonical.href : url;

	// Title
	item.title =
		ZU.unescapeHTML(meta(doc, "og:title")) ||
		doc.querySelector("h1.article-title.mb-2")?.textContent.trim() ||
		"";

	// Date (from URL)
	item.date = extractDateFromURL(item.url || url);

	// ===== Author Detection =====
	function isSingleName(name) {
		if (!name) return true;
		name = name.trim();
		if (name.split(/\s+/).length === 1) return true;
		if (/^[A-Z0-9-]+$/.test(name)) return true;
		return false;
	}

	function cleanAuthor(raw) {
		if (!raw) return "";
		let name = raw.replace(/^\s*by\s+/i, "").trim();
		name = name.replace(/\s+reports?$/i, "").trim();
		name = name.replace(/\s+in\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/i, "").trim();
		return name;
	}

	function extractAuthorsFromParagraph(text) {
		if (!text) return [];
		text = text.trim();

		// Only accept if it looks like an author line (starts with By, or contains 'in City' or 'reports')
		if (!/^(by\s+[A-Z]|[A-Z][a-z]+.*\sin\s+[A-Z]|[A-Z].*\sreports?)/i.test(text)) {
			return [];
		}

		// Remove trailing punctuation and leading markers
		text = text.replace(/^\s*by\s+/i, "").replace(/\.\s*$/, "").trim();

		// Split authors by " and ", commas, or both
		let parts = text.split(/\s*(?:,|and)\s+/i);
		let authors = [];

		for (let part of parts) {
			let m = part.match(/[A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){0,3}/g);
			if (m) {
				let name = cleanAuthor(m[0]);
				if (name && !isSingleName(name)) {
					authors.push(name);
				}
			}
		}

		return authors;
	}

	let ps = doc.querySelectorAll("div.col-xs-12.col-sm-12.col-md-11 > p");
	let authorCandidates = [];

	// Check first three <p> tags, skipping invalid headline spillovers
	for (let i = 0; i < Math.min(ps.length, 3); i++) {
		let txt = ps[i].textContent.trim();
		if (!txt) continue;

		let found = extractAuthorsFromParagraph(txt);
		if (found.length) {
			authorCandidates = found;
			break;
		}
	}

	// Fallback to JSON-LD/meta author if no valid CSS author found
	if (!authorCandidates.length) {
		let metaAuthor = meta(doc, "author") || meta(doc, "article:author");
		if (metaAuthor) {
			authorCandidates = metaAuthor.split(/\s*(?:,|and)\s+/i).map(a => a.trim()).filter(Boolean);
		}
	}

	for (let a of authorCandidates) {
		item.creators.push(ZU.cleanAuthor(a, "author"));
	}

	// Publication info
	item.publicationTitle = "This Day";
	item.language = "en";
	item.place = "Nigeria";

	item.attachments.push({ document: doc, title: "Snapshot" });

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.thisdaylive.com/2025/11/02/the-anambra-governorship-poll/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "THE ANAMBRA GOVERNORSHIP POLL",
				"creators": [],
				"date": "2025-11-02",
				"language": "en",
				"libraryCatalog": "This Day",
				"place": "Nigeria",
				"publicationTitle": "This Day",
				"url": "https://www.thisdaylive.com/2025/11/02/the-anambra-governorship-poll/",
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
		"url": "https://www.thisdaylive.com/2025/10/30/tinubu-to-service-chiefs-its-time-to-defeat-terrorists-bandits/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Tinubu to Service Chiefs: It’s Time to Defeat Terrorists, Bandits",
				"creators": [
					{
						"firstName": "Deji",
						"lastName": "Elumoye",
						"creatorType": "author"
					}
				],
				"date": "2025-10-30",
				"language": "en",
				"libraryCatalog": "This Day",
				"place": "Nigeria",
				"publicationTitle": "This Day",
				"shortTitle": "Tinubu to Service Chiefs",
				"url": "https://www.thisdaylive.com/2025/10/30/tinubu-to-service-chiefs-its-time-to-defeat-terrorists-bandits/",
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
		"url": "https://www.thisdaylive.com/2025/10/31/when-senate-balances-transparency-and-security-in-screening-service-chiefs/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "When Senate Balances Transparency and Security in Screening Service Chiefs",
				"creators": [
					{
						"firstName": "Sunday",
						"lastName": "Aborisade",
						"creatorType": "author"
					}
				],
				"date": "2025-10-31",
				"language": "en",
				"libraryCatalog": "This Day",
				"place": "Nigeria",
				"publicationTitle": "This Day",
				"url": "https://www.thisdaylive.com/2025/10/31/when-senate-balances-transparency-and-security-in-screening-service-chiefs/",
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
		"url": "https://www.thisdaylive.com/2025/11/02/trump-in-tweet-threatens-military-action-against-terrorists-killing-christians-in-nigeria/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Trump in Tweet, Threatens Military Action against Terrorists Killing Christians in Nigeria",
				"creators": [
					{
						"firstName": "Festus",
						"lastName": "Akanbi",
						"creatorType": "author"
					},
					{
						"firstName": "Deji",
						"lastName": "Elumoye",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Olugbode",
						"creatorType": "author"
					}
				],
				"date": "2025-11-02",
				"language": "en",
				"libraryCatalog": "This Day",
				"place": "Nigeria",
				"publicationTitle": "This Day",
				"url": "https://www.thisdaylive.com/2025/11/02/trump-in-tweet-threatens-military-action-against-terrorists-killing-christians-in-nigeria/",
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
