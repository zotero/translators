{
	"translatorID": "1b052690-16dd-431d-9828-9dc675eb55f6",
	"label": "Papers Past",
	"creator": "Philipp Zumstein, Abe Jellinek, and Jason Murphy",
	"target": "^https?://(www\\.)?paperspast\\.natlib\\.govt\\.nz/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 200,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-09-30 06:00:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Philipp Zumstein, Abe Jellinek, and Jason Murphy

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
	Papers Past Translator
	
	Enhanced metadata extraction for newspaper articles using structured data sources
	(JSON-LD, Highwire Press, Dublin Core) with fallbacks to screen scraping.
	Legacy scraping maintained for other collection types (periodicals, manuscripts, parliamentary papers). 
*/

// ============================================================================
// Detection and Routing
// ============================================================================

function detectWeb(doc, url) {
	// Check for newspaper article
	if (isNewspaperArticle(doc, url)) {
		return "newspaperArticle";
	}

	// Handle search results
	if (/[?&]query=/.test(url) && getSearchResults(doc, true)) {
		return "multiple";
	}
	
	// Handle other collection types
	else if (ZU.xpathText(doc, '//h3[@itemprop="headline"]')) {
		if (url.includes('/periodicals/')) {
			return "journalArticle";
		}
		if (url.includes('/manuscripts/')) {
			return "letter";
		}
		if (url.includes('/parliamentary/')) {
			return "report";
		}
	}
	return false;
}

function doWeb(doc, url) {
	var detectedType = detectWeb(doc, url);

	if (detectedType == "newspaperArticle") {
		scrapeNewspaper(doc, url);
	}
	else if (detectedType == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrapeLegacy);
		});
	}
	else {
		scrapeLegacy(doc, url);
	}
}

// ============================================================================
// Newspaper Article Scraper
// ============================================================================

function isNewspaperArticle(doc, url) {
	// Check URL pattern
	if (/\/newspapers\/.+\.\d+\.\d+/.test(url)) return true;
	
	// Check for NewsArticle schema
	const hasNews = getJSONLD(doc)?.some(o => /NewsArticle|Article/i.test(o['@type']));
	if (hasNews) return true;
	
	return false;
}

function scrapeNewspaper(doc, url) {
	const item = new Zotero.Item("newspaperArticle");
	const ld = getJSONLD(doc);
	const news = ld && ld.find(o => /NewsArticle|Article/i.test(o['@type'])) || null;
	const meta = collectMeta(doc);

	// Extract title from multiple sources
	const titles = [];
	if (news?.headline) titles.push(clean(news.headline));
	if (meta.hw.citation_title) titles.push(clean(meta.hw.citation_title));
	if (meta.dc["DC.title"]) titles.push(clean(meta.dc["DC.title"]));
	item.title = fixTitleCase(dedupeFirst(titles));

	// Publication name
	item.publicationTitle =
		news?.isPartOf?.name ||
		meta.hw.citation_journal_title ||
		meta.dc["DC.publisher"] ||
		meta.dc["DC.source"] || "";

	// Publication date
	item.date =
		normalizeDate(news?.datePublished) ||
		normalizeDate(meta.hw.citation_date) ||
		normalizeDate(meta.dc["DC.date"]) || "";

	// Page numbers
	const pageStart = news?.pageStart || meta.hw.citation_firstpage || "";
	const pageEnd = news?.pageEnd || meta.hw.citation_lastpage || "";
	const pagesMeta = meta.hw.citation_pages || "";
	item.pages = pagesFrom(pageStart, pageEnd, pagesMeta);

	// Language and rights
	item.language = news?.inLanguage || meta.hw.citation_language || meta.dc["DC.language"] || "";
	item.rights = news?.copyrightNotice || meta.dc["DC.rights"] || "";

	// Clean URL
	item.url = canonicalURL(doc) || news?.url || meta.hw.citation_fulltext_html_url || meta.dc["DC.source"] || url;
	item.url = stripQueryAndHash(item.url);

	// Fallback to on-page citation if metadata missing
	const bib = parseBibliographicDetails(doc);
	if (!item.publicationTitle && bib.publicationTitle) item.publicationTitle = bib.publicationTitle;
	if (!item.date && bib.date) item.date = normalizeDate(bib.date);
	if (!item.pages && bib.pages) item.pages = bib.pages;

	// Store volume/issue in Extra field
	const vol = (news?.isPartOf?.volumeNumber ? String(news.isPartOf.volumeNumber) : "") || meta.hw.citation_volume || bib.volume || "";
	const iss = (news?.isPartOf?.issueNumber ? String(news.isPartOf.issueNumber) : "") || meta.hw.citation_issue || bib.issue || "";

	const extraParts = [];
	if (vol) extraParts.push(`Volume: ${vol}`);
	if (iss) extraParts.push(`Issue: ${iss}`);
	if (extraParts.length > 0) {
		item.extra = extraParts.join("\n");
	}

	// Most historical newspaper articles don't have bylines
	item.creators = [];
	
	item.attachments = [{
		title: "Snapshot",
		document: doc
	}];
	
	item.libraryCatalog = "Papers Past";
	item.complete();
}

// ============================================================================
// Legacy Scraper for Other Collections
// ============================================================================

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.search-results .article-preview__title a');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function scrapeLegacy(doc, url) {
	var type = detectWeb(doc, url);
	if (!type) return false;
	
	var item = new Zotero.Item(type);
	var title = ZU.xpathText(doc, '//h3[@itemprop="headline"]/text()[1]');
	if (title) {
		item.title = ZU.capitalizeTitle(title.toLowerCase(), true);
	}
	
	if (type == "journalArticle" || type == "newspaperArticle") {
		var nav = doc.querySelectorAll('#breadcrumbs .breadcrumbs__crumb');
		if (nav.length > 1) {
			item.publicationTitle = nav[1].textContent;
		}
		if (nav.length > 2) {
			item.date = ZU.strToISO(nav[2].textContent);
		}
		if (nav.length > 3) {
			var pageMatch = nav[3].textContent.match(/\d+/);
			if (pageMatch) {
				item.pages = pageMatch[0];
			}
		}
	}
	
	var container = ZU.xpathText(doc, '//h3[@itemprop="headline"]/small');
	if (container) {
		var volume = container.match(/Volume (\w+)\b/);
		if (volume) {
			item.volume = volume[1];
		}
		var issue = container.match(/Issue (\w+)\b/);
		if (issue) {
			item.issue = issue[1];
		}
	}
	
	if (type == "letter") {
		var author = ZU.xpathText(doc, '//div[@id="researcher-tools-tab"]//tr[td[.="Author"]]/td[2]');
		if (author && !author.includes("Unknown")) {
			author = author.replace(/^[0-9/]*/, '').replace(/[0-9-]*$/, '').replace('(Sir)', '');
			item.creators.push(ZU.cleanAuthor(author, "author"));
		}
		var recipient = ZU.xpathText(doc, '//div[@id="researcher-tools-tab"]//tr[td[.="Recipient"]]/td[2]');
		if (recipient && !recipient.includes("Unknown")) {
			recipient = recipient.replace(/^[0-9/]*/, '').replace(/[0-9-]*$/, '').replace('(Sir)', '');
			item.creators.push(ZU.cleanAuthor(recipient, "recipient"));
		}
		item.date = ZU.xpathText(doc, '//div[@id="researcher-tools-tab"]//tr[td[.="Date"]]/td[2]');
		item.language = ZU.xpathText(doc, '//div[@id="researcher-tools-tab"]//tr[td[.="Language"]]/td[2]');
	}
	
	item.abstractNote = ZU.xpathText(doc, '//div[@id="tab-english"]');
	item.url = ZU.xpathText(doc, '//div[@id="researcher-tools-tab"]/input/@value');
	if (!item.url) {
		item.url = ZU.xpathText(doc, '//div[@id="researcher-tools-tab"]//p');
	}
	if (!item.url || !item.url.startsWith('http')) {
		item.url = url;
	}
	
	item.attachments.push({
		title: "Snapshot",
		document: doc
	});
	
	var imagePageURL = ZU.xpathText(doc, '//div[@class="imagecontainer"]//a/@href');
	if (imagePageURL) {
		ZU.processDocuments(imagePageURL, function (imageDoc) {
			item.attachments.push({
				title: 'Image',
				mimeType: 'image/jpeg',
				url: ZU.xpathText(imageDoc, '//div[@class="imagecontainer"]//img/@src')
			});
			item.complete();
		});
	}
	else {
		item.complete();
	}
}

// ============================================================================
// Helper Functions
// ============================================================================

// Parse JSON-LD structured data from the page
function getJSONLD(doc) {
	const out = [];
	const nodes = doc.querySelectorAll('script[type="application/ld+json"]');
	for (const n of nodes) {
		try {
			const data = JSON.parse(n.textContent);
			if (Array.isArray(data)) data.forEach(d => out.push(d));
			else if (data) out.push(data);
		} catch (e) {}
	}
	return out;
}

// Collect Highwire Press and Dublin Core metadata tags
function collectMeta(doc) {
	const hw = {}, dc = {};
	const metas = doc.querySelectorAll("meta[name]");
	for (const m of metas) {
		const name = m.getAttribute("name");
		const content = m.getAttribute("content") || "";
		if (!name) continue;
		
		// Highwire Press tags (citation_*)
		if (/^citation_/i.test(name)) {
			if (name === "citation_author") {
				if (!hw[name]) hw[name] = [];
				hw[name].push(content);
			} else {
				hw[name] = content;
			}
			continue;
		}
		
		// Dublin Core tags (DC.*)
		if (/^DC\./.test(name) || /^dc\./.test(name)) {
			dc[name.replace(/^dc\./, "DC.")] = content;
		}
	}
	return { hw, dc };
}

// Parse bibliographic details from the on-page citation text
function parseBibliographicDetails(doc) {
	const cite = doc.querySelector('#researcher-tools-tab .citation, .tabs-panel .citation, p.citation');
	const text = cite ? cite.textContent : "";
	const out = { publicationTitle: "", volume: "", issue: "", date: "", pages: "" };
	if (!text) return out;

	const pubMatch = text.match(/^\s*([^,]+),/);
	if (pubMatch) out.publicationTitle = clean(pubMatch[1]);

	const volMatch = text.match(/Volume\s+([^,]+),/i);
	if (volMatch) out.volume = clean(volMatch[1]);

	const issMatch = text.match(/Issue\s+([^,]+),/i);
	if (issMatch) out.issue = clean(issMatch[1]);

	const dateMatch = text.match(/Issue\s+[^,]+,\s*([^,]+),\s*Page/i) || text.match(/,\s*([^,]+),\s*Page/i);
	if (dateMatch) out.date = clean(dateMatch[1]);

	const pageMatch = text.match(/Page\s+([0-9A-Za-z\-]+)/i);
	if (pageMatch) out.pages = clean(pageMatch[1]);

	return out;
}

// Trim and normalize whitespace
function clean(s) {
	return s ? s.replace(/\s+/g, " ").trim() : "";
}

// Return first non-duplicate value from array
function dedupeFirst(arr) {
	const seen = new Set();
	for (const v of arr) {
		if (!v) continue;
		const k = v.toLowerCase();
		if (!seen.has(k)) {
			seen.add(k);
			return v;
		}
	}
	return arr.find(Boolean) || "";
}

// Fix all-caps titles to title case, avoiding issues with apostrophes
function fixTitleCase(str) {
	if (!str) return str;
	const letters = str.replace(/[^A-Za-z]/g, "");
	if (!letters) return str;
	const uppers = (letters.match(/[A-Z]/g) || []).length;
	const upperRatio = uppers / letters.length;
	
	// If more than 60% uppercase, convert to title case
	if (upperRatio > 0.6) {
		// Only capitalize after spaces or at start, not after apostrophes
		return str.toLowerCase().replace(/(^|\s)\w/g, c => c.toUpperCase());
	}
	return str;
}

// Normalize date format
function normalizeDate(s) {
	return s ? s.replace(/\//g, "-").trim() : "";
}

// Construct page range from start/end or use existing format
function pagesFrom(start, end, meta) {
	const s = clean(start), e = clean(end), m = clean(meta);
	if (m) return m;
	if (s && e && s !== e) return `${s}-${e}`;
	if (s) return s;
	return "";
}

// Remove query parameters and hash from URL
function stripQueryAndHash(u) {
	try {
		const x = new URL(u);
		x.search = "";
		x.hash = "";
		return x.toString();
	} catch (e) {
		return u;
	}
}

// Get canonical URL from page metadata
function canonicalURL(doc) {
	const link = doc.querySelector('link[rel="canonical"]');
	if (link?.href) return link.href;
	const og = doc.querySelector('meta[property="og:url"]');
	if (og?.content) return og.content;
	return "";
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://paperspast.natlib.govt.nz/newspapers?items_per_page=10&snippet=true&query=argentina",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://paperspast.natlib.govt.nz/newspapers/MT19390701.2.6.3",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Inter-School Basketball And Rugby Football",
				"creators": [],
				"date": "1939-07-01",
				"extra": "Volume: 64\nIssue: 153",
				"libraryCatalog": "Papers Past",
				"pages": "2",
				"publicationTitle": "Manawatu Times",
				"url": "https://paperspast.natlib.govt.nz/newspapers/MT19390701.2.6.3",
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
		"url": "https://paperspast.natlib.govt.nz/periodicals/FRERE18831101.2.2",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "\"The Law Within the Law.\"",
				"creators": [],
				"date": "1883-11-01",
				"issue": "2",
				"libraryCatalog": "Papers Past",
				"pages": "3",
				"publicationTitle": "Freethought Review",
				"url": "https://paperspast.natlib.govt.nz/periodicals/FRERE18831101.2.2",
				"volume": "I",
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
		"url": "https://paperspast.natlib.govt.nz/manuscripts/MCLEAN-1024774.2.1",
		"items": [
			{
				"itemType": "letter",
				"title": "1 Page Written 19 Jun 1873 by James Mackay in Hamilton City to Sir Donald Mclean in Wellington",
				"creators": [
					{
						"firstName": "Mackay",
						"lastName": "James",
						"creatorType": "author"
					},
					{
						"firstName": "McLean",
						"lastName": "Donald",
						"creatorType": "recipient"
					}
				],
				"date": "1873-06-19",
				"language": "English",
				"libraryCatalog": "Papers Past",
				"url": "https://paperspast.natlib.govt.nz/manuscripts/MCLEAN-1024774.2.1",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "Image",
						"mimeType": "image/jpeg"
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
		"url": "https://paperspast.natlib.govt.nz/parliamentary/AJHR1899-I.2.4.2.3",
		"items": [
			{
				"itemType": "report",
				"title": "Rabbits And Rabbitskins, Exported From Colony During Years 1894 To 1898, And Number And Value Thereof.",
				"creators": [],
				"libraryCatalog": "Papers Past",
				"url": "https://paperspast.natlib.govt.nz/parliamentary/AJHR1899-I.2.4.2.3",
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
