{
	"translatorID": "9797bd04-629f-4c3b-a1a7-5b020975d8eb",
	"label": "JADE.io (Australia)",
	"creator": "Russell Brenner",
	"target": "^https?://([^/]+\\.)?jade\\.io/.*",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-09-01 03:27:48"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Russell Brenner

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
 * JADE.io (Australia) Translator for Zotero
 *
 * This translator extracts bibliographic metadata from JADE.io (jade.io),
 * Australia's premier legal database providing access to:
 * - Case law from High Court, Federal Courts, and State/Territory courts
 * - Commonwealth and State/Territory legislation (Acts, Regulations, Rules)
 *
 * Key Features:
 * - Comprehensive citation parsing for Australian neutral citations
 * - Support for parallel citations and law reports
 * - Robust metadata extraction with multiple fallback strategies
 * - Handles both case law and legislation documents
 * - PDF attachment detection and linking
 *
 * Author: Russell Brenner
 * Version: 1.0
 * Last Updated: 2025-08-31
*/

/**
 * Normalises whitespace in text strings
 * Combines multiple whitespace characters into single spaces and removes non-breaking spaces
 *
 * @param {string} s - Input string to normalise
 * @returns {string} - Normalised string with cleaned whitespace
 */
function textTrim(s) {
	return ZU.trimInternal((s || "").replace(/\s+/g, " ").replace(/\u00A0/g, " "));
}

/**
 * Extracts content from HTML meta tags using XPath
 *
 * @param {Document} doc - HTML document object
 * @param {string} name - The meta tag name or property value to search for
 * @param {string} prop - The attribute to match against ("name" or "property")
 * @returns {string|null} - The content attribute value or null if not found
 */
function getMeta(doc, name, prop = "name") {
	return ZU.xpathText(doc, `//meta[@${prop}="${name}"]/@content`) || null;
}

/**
 * Extracts the page title with preference for OpenGraph title
 * Falls back to document.title if OpenGraph title not available
 *
 * @param {Document} doc - HTML document object
 * @returns {string} - The page title or empty string
 */
function getTitle(doc) {
	return getMeta(doc, "og:title", "property") || doc.title || "";
}

/**
 * Extracts the canonical URL for the page
 * Prefers OpenGraph URL, falls back to current location
 *
 * @param {Document} doc - HTML document object
 * @returns {string} - The canonical URL or empty string
 */
function getCanonicalURL(doc) {
	return getMeta(doc, "og:url", "property") || doc.location && doc.location.href || "";
}

/**
 * Determines if a title appears to be legislation rather than case law
 * Looks for common legislative keywords: Act, Regulations, Rules, Ordinance
 *
 * @param {string} t - Title text to analyse
 * @returns {boolean} - True if title appears to be legislation
 */
function looksLikeLegislationTitle(t) {
	return /\bAct\s+\d{4}\b|\bRegulations?\b|\bRules?\b|\bOrdinance\b/i.test(t);
}

/**
 * Extracts section number from JADE.io URLs that link to specific sections
 * Handles URLs like: https://jade.io/article/12345/section/42
 *
 * @param {string} url - The URL to parse
 * @returns {string|null} - Section number if found, null otherwise
 */
function getSectionFromURL(url) {
	const m = (url || "").match(/\/article\/\d+\/section\/(\d+)/i);
	return m ? m[1] : null;
}

/**
 * Parses Australian neutral citation from case title
 * Handles format: "Case Name [YYYY] COURT ### (Date)"
 * Example: "Commissioner of Taxation v PepsiCo Inc [2025] HCA 30 (13 August 2025)"
 *
 * @param {string} title - The case title to parse
 * @returns {Object|null} - Parsed citation components or null if no match
 * @returns {string} returns.caseName - The case name
 * @returns {string} returns.year - The citation year
 * @returns {string} returns.courtAcronym - Court abbreviation (HCA, NSWCA, etc.)
 * @returns {string} returns.number - Case number
 * @returns {string|null} returns.dateText - Decision date text (optional)
 */
function parseNeutralCitationFromTitle(title) {
	const m = textTrim(title).match(/^(.*?)\s*\[([12]\d{3})\]\s*([A-Z][A-Z0-9]+)\s+(\d+)(?:\s*\(([^)]+)\))?/);
	if (!m) return null;
	return {
		caseName: textTrim(m[1]),
		year: m[2],
		courtAcronym: m[3],
		number: m[4],
		dateText: m[5] ? textTrim(m[5]) : null
	};
}

/**
 * Mapping from Australian court abbreviations to full court names
 * Used for reference and validation - we typically store the abbreviation in item.court
 * following Australian Guide to Legal Citation (AGLC) standards
 *
 * Includes major Federal, High Court, and State/Territory courts
 */
const JADE_COURT_MAP = {
	HCA: "High Court of Australia",
	VSCA: "Supreme Court of Victoria, Court of Appeal",
	VSC: "Supreme Court of Victoria",
	FCA: "Federal Court of Australia",
	FCAFC: "Federal Court of Australia, Full Court",
	NSWCA: "Supreme Court of New South Wales, Court of Appeal",
	NSWSC: "Supreme Court of New South Wales",
	QCA: "Supreme Court of Queensland, Court of Appeal",
	WASCA: "Supreme Court of Western Australia, Court of Appeal",
	SASC: "Supreme Court of South Australia",
	SASCA: "Supreme Court of South Australia, Court of Appeal",
	NTCA: "Supreme Court of the Northern Territory, Court of Appeal",
	ACTCA: "Court of Appeal of the Australian Capital Territory",
	VCC: "County Court of Victoria",
	FCC: "Federal Circuit Court of Australia",
	FedCFamC1A: "Federal Circuit and Family Court of Australia - Division 1 Appellate",
	FedCFamC1F: "Federal Circuit and Family Court of Australia - Division 1 First Instance",
	FedCFamC2F: "Federal Circuit and Family Court of Australia - Division 2 First Instance"
};

// Helper function - not directly used but available for court name expansion if needed
// eslint-disable-next-line no-unused-vars
function courtFromAcronym(acr) {
	return JADE_COURT_MAP[acr] || acr;
}

/**
 * Normalises Australian date formats to ISO format (YYYY-MM-DD)
 * Handles common formats like "13 August 2025" and falls back to Date parsing
 *
 * @param {string} d - Date string to normalise
 * @returns {string} - ISO date format or original string if parsing fails
 */
function normaliseDate(d) {
	if (!d) return "";
	// Handle "13 August 2025" and similar AU formats
	const m = String(d).match(/(\d{1,2})\s+([A-Za-z]+)\s+([12]\d{3})/);
	if (m) {
		const day = m[1].padStart(2, "0");
		const months = {
			january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
			july: "07", august: "08", september: "09", october: "10", november: "11", december: "12"
		};
		const mon = months[m[2].toLowerCase()];
		if (mon) return `${m[3]}-${mon}-${day}`;
	}
	// Fallback to Date parsing (may be locale dependent)
	try {
		const dt = new Date(d);
		if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
	}
	catch (e) {
		// Date parsing failed - return original
	}
	return d;
}

/**
 * Locates PDF download links on the page for attachment
 * Searches for links with .pdf extension or download attributes
 *
 * @param {Document} doc - HTML document object
 * @returns {string|null} - PDF URL if found, null otherwise
 */
function findPDFLink(doc) {
	const link = doc.querySelector('a[href$=".pdf"], a[href*="download"][href*="pdf"], a[download$=".pdf"]');
	return link ? link.href : null;
}

/**
 * Preferred law report series ordering for parallel citations
 * Based on Australian Guide to Legal Citation (AGLC) hierarchy
 * Used to determine which parallel citation to use in main reporter fields
 *
 * Priority: Commonwealth Law Reports (CLR) > Australian Law Journal Reports (ALJR) > etc.
 */
const LAW_REPORT_PRIORITY = [
	'CLR',
	'ALJR',
	'ALR',
	'FCR',
	'NSWLR',
	'VR',
	'Qd R',
	'SASR',
	'WAR',
	'NTLR',
	'ACTR',
	'FamLR',
	'FLR',
	'IR',
	'A Crim R',
	'ACSR',
	'ATPR',
	'ATC'
];

/**
 * Finds all parallel law report citations in the document
 * Searches for patterns like "274 CLR 450" throughout the page text
 *
 * @param {Document} doc - HTML document object
 * @returns {Array} - Array of {volume, reporter, page} citation objects, de-duplicated
 */
function findLawReportCitations(doc) {
	const repPattern = LAW_REPORT_PRIORITY
		.map(r => r.replace(/\s+/g, "\\s+"))
		.join("|");
	const re = new RegExp(`\\b(\\d{1,4})\\s+(${repPattern})\\s+(\\d{1,5})\\b`, 'g');

	function scanAll(s) {
		if (!s) return [];
		const out = [];
		let m;
		while ((m = re.exec(s))) {
			out.push({ volume: m[1], reporter: m[2].replace(/\s+/g, ' '), page: m[3] });
		}
		return out;
	}

	// Aggregate from focused sources only to avoid cited-case noise
	let results = [];
	results = results.concat(scanAll(getMeta(doc, "og:title", "property")));
	results = results.concat(scanAll(getMeta(doc, "og:description", "property")));
	const els = doc.querySelectorAll(
		".ribbon-citation, li.ribbon-citation, .citation, .citations, .case-citation"
	);
	for (const el of els) {
		results = results.concat(scanAll(el && el.textContent));
	}
	// De-duplicate identical citations
	const dedup = new Map();
	for (const r of results) {
		dedup.set(`${r.volume}|${r.reporter}|${r.page}`, r);
	}
	return Array.from(dedup.values());
}

/**
 * Chooses the best reporter from a list of parallel citations
 * Uses AGLC hierarchy: CLR > ALJR > ALR > State reports
 * Secondary sort by volume number for same reporter
 *
 * @param {Array} citations - Array of citation objects
 * @returns {Object|null} - Best citation or null if none
 */
function pickBestLawReport(citations) {
	if (!citations || citations.length === 0) return null;
	// Choose by reporter priority, then by higher volume as a tiebreaker
	citations.sort((a, b) => {
		const ai = LAW_REPORT_PRIORITY.indexOf(a.reporter);
		const bi = LAW_REPORT_PRIORITY.indexOf(b.reporter);
		if (ai !== bi) return ai - bi;
		return parseInt(b.volume) - parseInt(a.volume);
	});
	return citations[0];
}

/**
 * Extracts a Medium Neutral Citation from page metadata
 * Searches for patterns like "[2006] NSWCA 231" in meta tags and title
 * Avoids full document scan to prevent capturing cited cases
 *
 * @param {Document} doc - HTML document object
 * @returns {Object|null} - {year, courtAcronym, number} or null
 */
function findNeutralCitation(doc) {
	// Find patterns like "[2006] NSWCA 231"
	const re = /\[\s*([12]\d{3})\s*\]\s*([A-Z][A-Z0-9]{1,7})\s+(\d{1,4})/;
	function scan(s) {
		if (!s) return null;
		const m = s.match(re);
		return m ? { year: m[1], courtAcronym: m[2], number: m[3] } : null;
	}
	let nc = scan(getMeta(doc, 'citation_reference'))
		|| scan(getMeta(doc, 'citation_title'))
		|| scan(getMeta(doc, 'og:title', 'property'))
		|| scan(getMeta(doc, 'og:description', 'property'))
		|| scan(doc.title || "");
	if (nc) return nc;
	// Avoid scanning the whole document to prevent pulling cited cases
	return null;
}

/**
 * Locates a JADE summary/outline page URL for additional metadata
 * These pages often contain more complete parallel citations
 *
 * @param {Document} doc - HTML document object
 * @param {string} _url - Current page URL (unused)
 * @returns {string|null} - Summary page URL or null
 */
function findSummaryURL(doc, _url) {
	// Prefer explicit links in the page
	let a = doc.querySelector('a[href*="/summary/mnc/"]');
	if (a && a.href) return a.href;
	a = doc.querySelector('a[href*="/j/?a=outline&id="]');
	if (a && a.href) return a.href;
	return null;
}

/**
 * Extracts case name from page using multiple strategies
 * Priority order: citation meta tags → headings → cleaned title
 * Filters out generic site titles and branding
 *
 * @param {Document} doc - HTML document object
 * @returns {string} - Case name or empty string
 */
function extractCaseName(doc) {
	// 1) Common meta tags
	let c = getMeta(doc, 'citation_title')
		|| getMeta(doc, 'DC.title')
		|| getMeta(doc, 'dcterms.title')
		|| getMeta(doc, 'og:title', 'property')
		|| getMeta(doc, 'og:description', 'property');
	if (c) {
		const parsed = parseNeutralCitationFromTitle(c);
		if (parsed && parsed.caseName) return parsed.caseName;
		if (/\bv\.?\b|\bversus\b/i.test(c)) return textTrim(c.replace(/\s*-\s*BarNet\s+Jade.*$/i, ''));
	}

	// 2) Headings and prominent title containers
	const els = doc.querySelectorAll('h1, h2, .title, .heading, header h1, header h2, .case-metadata h1, .case-metadata h2');
	for (const el of els) {
		const t = textTrim(el && el.textContent || '');
		if (!t) continue;
		const parsed = parseNeutralCitationFromTitle(t);
		if (parsed && parsed.caseName) return parsed.caseName;
		if (/\bv\.?\b|\bversus\b/i.test(t)) {
			const m = t.match(/^(.*?)(?:\s*\[[12]\d{3}.*|\s*\(\d{1,2}\s+[A-Za-z]+\s+[12]\d{3}\).*)?$/);
			if (m && m[1]) return textTrim(m[1]);
			return t;
		}
	}

	// 3) Fallback: og:title/doc.title but cleaned
	const title = getTitle(doc);
	if (title) {
		const parsed = parseNeutralCitationFromTitle(title);
		if (parsed && parsed.caseName) return parsed.caseName;
		return textTrim(title.replace(/^\s*BarNet\s+Jade\s*-\s*/i, '').replace(/\s*-\s*BarNet\s+Jade.*$/i, ''));
	}
	return '';
}

// Case-name quality checks
function isGenericCaseTitle(name) {
	return /BarNet\s+Jade|Find\s+recent\s+Australian\s+legal|Judgments\s+And\s+Decisions\s+Enhanced/i.test(name || '');
}

// -------------------- Detection --------------------

/**
 * Zotero detection function - determines document type and whether page is scrapable
 * Analyses URL patterns and title content to classify documents
 *
 * @param {Document} doc - HTML document object
 * @param {string} url - Current page URL
 * @returns {string|false} - "case", "statute", "multiple" or false if not scrapable
 */
function detectWeb(doc, url) {
	// Multiples via JADE RSS/XML feeds
	if (/\/xml\/.+\.xml$/i.test(url)) return "multiple";

	// Content pages: articles, summary/outline views
	if (/\/article\/\d+(?:\/section\/\d+)?(?:[?#].*)?$/i.test(url) || /\/summary\/mnc\//i.test(url) || /\/j\/\?a=outline&id=\d+/i.test(url)) {
		const t = getTitle(doc) || "";
		// If the title carries an MNC or looks like a case caption, treat as case
		if (parseNeutralCitationFromTitle(t)) return "case";
		if (/\bv\b/i.test(t)) return "case";
		// Clear legislation signals → statute
		if (looksLikeLegislationTitle(t) || /\/section\//i.test(url)) return "statute";
		// Default JADE article pages to case if uncertain
		if (/\/article\/\d+/.test(url)) return "case";
		return "case";
	}

	return false;
}

// -------------------- Multiples (RSS/XML) --------------------

function getSearchResults(doc, checkOnly) {
	let items = {};
	let found = false;
	const rows = doc.querySelectorAll("item");
	for (const row of rows) {
		const title = textTrim(ZU.xpathText(row, "title/text()"));
		const href = textTrim(ZU.xpathText(row, "link/text()"));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : {};
}

// -------------------- doWeb (entry point) --------------------

/**
 * Main Zotero scraping function and entry point
 * Routes to appropriate scraper based on document type detection
 * Handles multiple document selection from search/feed pages
 *
 * @param {Document} doc - HTML document object
 * @param {string} url - Current page URL
 */
function doWeb(doc, url) {
	const type = detectWeb(doc, url);

	// Handle multiple document selection (RSS feeds, search results)
	if (type === "multiple") {
		const choices = getSearchResults(doc, false);
		if (!choices) return;
		Zotero.selectItems(choices, function (selected) {
			if (!selected) return;
			const urls = Object.keys(selected);
			ZU.processDocuments(urls, function (d) {
				const t = detectWeb(d, d.location ? d.location.href : "");
				if (t === "case") scrapeCase(d, d.location && d.location.href || "");
				else if (t === "statute") scrapeStatute(d, d.location && d.location.href || "");
			});
		});
		return;
	}

	// Route to appropriate single document scraper
	if (type === "case") {
		scrapeCase(doc, url);
	}
	else if (type === "statute") {
		scrapeStatute(doc, url);
	}
}

// -------------------- Scrapers --------------------

/**
 * Scrapes case law documents from JADE.io
 * Extracts neutral citations, parallel reports, court details, and case metadata
 * Handles various Australian court formats and citation styles
 *
 * @param {Document} doc - HTML document object
 * @param {string} url - Current page URL
 */
function scrapeCase(doc, url) {
	const item = new Zotero.Item("case");

	const title = textTrim(getTitle(doc));
	const ogDesc = getMeta(doc, "og:description", "property");
	const canonical = getCanonicalURL(doc);


	// Try to get better title from meta tags first
	const betterTitle = getMeta(doc, 'citation_title') || getMeta(doc, 'DC.title') || title;

	// Parse MNC from title; may be updated later if not present
	let parsed = parseNeutralCitationFromTitle(betterTitle);
	let ncBareStr = null; // "[YYYY] COURT N"
	let caseNameStr = null; // authoritative case name we determine
	const parallelSegments = [];

	if (parsed) {
		item.caseName = parsed.caseName;
		caseNameStr = item.caseName;
		// Use AGLC-style court abbreviation in the court field
		item.court = parsed.courtAcronym;
		// Map MNC number to docket; keep reporter fields for parallel report series
		item.docketNumber = parsed.number;
		// Record neutral citation for Extra construction later
		ncBareStr = `[${parsed.year}] ${parsed.courtAcronym} ${parsed.number}`;
		if (parsed.dateText) item.dateDecided = normaliseDate(parsed.dateText);
		// Prefer dateDecided over generic date for case items. If no full date available yet,
		// keep the year as a fallback in dateDecided and try to improve it below.
		if (!item.dateDecided && parsed.year) item.dateDecided = parsed.year;
	}
	else {
		// Try to find MNC elsewhere on the page
		parsed = findNeutralCitation(doc);
		if (parsed) {
			item.caseName = extractCaseName(doc) || title.replace(/^\s*BarNet\s+Jade\s*-\s*/i, '').replace(/\s*-\s*BarNet\s+Jade.*$/i, "");
			caseNameStr = item.caseName;
			item.court = parsed.courtAcronym;
			item.docketNumber = parsed.number;
			ncBareStr = `[${parsed.year}] ${parsed.courtAcronym} ${parsed.number}`;
			item.dateDecided = item.dateDecided || parsed.year;
		}
		else {
			const fromPage = extractCaseName(doc);
			if (fromPage && !isGenericCaseTitle(fromPage)) {
				item.caseName = fromPage;
			}
			else {
				// Last resort: use URL article number
				const urlMatch = (url || '').match(/\/article\/(\d+)/i);
				item.caseName = urlMatch ? `JADE Article ${urlMatch[1]}` : 'Unknown Case';
			}
			caseNameStr = item.caseName;
			item.court = "";
		}
	}

	item.url = canonical || url;
	item.abstractNote = ogDesc || "";

	// Detect parallel law report citation and map to reporter fields
	const citationsHere = findLawReportCitations(doc);
	function applyParallel(prc, allList) {
		if (!prc) return;
		item.reporterVolume = prc.volume;
		item.reporter = prc.reporter;
		item.firstPage = prc.page;
		const toAppend = (allList && allList.length) ? allList : [prc];
		for (const c of toAppend) {
			const seg = `${c.volume} ${c.reporter} ${c.page}`;
			if (!parallelSegments.includes(seg)) parallelSegments.push(seg);
		}
	}
	if (citationsHere && citationsHere.length) {
		applyParallel(pickBestLawReport(citationsHere), citationsHere);
	}
	else {
		const summaryURL = findSummaryURL(doc, url);
		if (summaryURL) {
			ZU.processDocuments(summaryURL, function (sd) {
				// Capture MNC if still missing
				if (!parsed) {
					const nc2 = findNeutralCitation(sd);
					if (nc2) {
						item.court = item.court || nc2.courtAcronym;
						item.docketNumber = item.docketNumber || nc2.number;
						if (!ncBareStr) ncBareStr = `[${nc2.year}] ${nc2.courtAcronym} ${nc2.number}`;
						if (!item.dateDecided) item.dateDecided = nc2.year;
					}
				}
				// Update case name from summary if missing/generic
				const cn2 = extractCaseName(sd);
				if (cn2 && (!caseNameStr || isGenericCaseTitle(caseNameStr) || !/(?:\bv\.?\b|\bversus\b)/i.test(caseNameStr))) {
					item.caseName = cn2;
					caseNameStr = cn2;
				}
				const list = findLawReportCitations(sd);
				if (list && list.length) applyParallel(pickBestLawReport(list), list);
				finalize();
			});
			return;
		}
	}

	// Try to improve decision date from page metadata/content if we only have a year
	(function () {
		if (item.dateDecided && /^(19|20)\d{2}$/.test(item.dateDecided) === false) return;
		let d = null;
		// Prefer authoritative decision date hints; avoid generic publish/update timestamps
		d = d || getMeta(doc, "citation_date");
		d = d || getMeta(doc, "DC.date");
		d = d || getMeta(doc, "dcterms.date");
		// time elements sometimes contain the decision date near the heading
		d = d || ZU.xpathText(doc, "//h1//time/@datetime")
			|| ZU.xpathText(doc, "//h1//time/text()")
			|| ZU.xpathText(doc, "//time/@datetime")
			|| ZU.xpathText(doc, "//time/text()");

		// Scan typical header/metadata containers for an AU-style date
		if (!d) {
			const candidates = doc.querySelectorAll("header, h1, h2, .metadata, .meta, .case-metadata, .article-info, .title, .heading, dl, .dl-horizontal");
			const re = /(\d{1,2})\s+([A-Za-z]+)\s+([12]\d{3})/;
			for (const el of candidates) {
				const m = (el.textContent || "").match(re);
				if (m) {
					d = m[0];
					break;
				}
			}
		}

		if (d) {
			const nd = normaliseDate(d);
			// If we have an MNC year, require the same year to avoid site publish dates
			const yFromMNC = (parsed && parsed.year) ? String(parsed.year) : null;
			const yFromDate = (nd && nd.match(/^(\d{4})/)) ? RegExp.$1 : null;
			if (!yFromMNC || (yFromDate && yFromDate === yFromMNC)) {
				item.dateDecided = nd;
			}
		}
	})();

	function finalize() {
		// Build Extra using the collected case name, MNC, and parallels
		if (ncBareStr) {
			const cn = (caseNameStr && !isGenericCaseTitle(caseNameStr)) ? caseNameStr : (item.caseName || '');
			const segs = parallelSegments.length ? `; ${parallelSegments.join('; ')}` : '';
			item.extra = `neutralCitation: ${ncBareStr}\nfullNeutralCitation: ${cn ? `${cn} ${ncBareStr}` : ncBareStr}${segs}`;
		}
		item.attachments.push({ title: "JADE snapshot", document: doc });
		const pdf = findPDFLink(doc);
		if (pdf) item.attachments.push({ title: "PDF", url: pdf, mimeType: "application/pdf" });
		item.complete();
	}

	finalize();
}

/**
 * Scrapes legislation documents from JADE.io
 * Extracts Act titles, section numbers, and legislative metadata
 * Handles Commonwealth and State/Territory Acts, Regulations, and Rules
 *
 * @param {Document} doc - HTML document object
 * @param {string} url - Current page URL
 */
function scrapeStatute(doc, url) {
	const item = new Zotero.Item("statute");

	const title = textTrim(getTitle(doc));
	const canonical = getCanonicalURL(doc);
	const sectionId = getSectionFromURL(url);

	let t = title
		.replace(/^\s*BarNet\s+Jade\s*-\s*/i, "") // leading site name
		.replace(/\s*-\s*BarNet\s+Jade.*$/i, ""); // trailing site name

	// Require a digit in the section capture to avoid matching words like "summaries"
	const sectionMatch = t.match(/\b(?:s|sec|section)\s*([0-9][0-9A-Za-z.-]*)\b/i);
	const actMatch = t.match(/^(.+?\bAct\s+\d{4}\b\s*\([^)]+\))/i) || t.match(/^(.+?\bAct\s+\d{4}\b)/i);

	const nameOfAct = actMatch ? textTrim(actMatch[1]) : t;
	const section = sectionId || (sectionMatch ? sectionMatch[1] : "");

	const yearMatch = nameOfAct.match(/\b(19|20)\d{2}\b/);
	const dateEnacted = yearMatch ? yearMatch[0] : "";

	const jurisMatch = nameOfAct.match(/\((Cth|Vic|NSW|Qld|SA|WA|Tas|ACT|NT)\)/i);
	const jurisdiction = jurisMatch ? jurisMatch[1].toUpperCase() : "";

	item.nameOfAct = nameOfAct;
	item.code = jurisdiction ? `AU ${jurisdiction}` : "AU";
	item.section = section;
	item.dateEnacted = dateEnacted;
	item.url = canonical || url;

	item.attachments.push({ title: "JADE snapshot", document: doc });

	const pdf = findPDFLink(doc);
	if (pdf) item.attachments.push({ title: "PDF", url: pdf, mimeType: "application/pdf" });

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://jade.io/article/1370",
		"items": [
			{
				"itemType": "case",
				"caseName": "Australian Broadcasting Corporation v Obeid",
				"creators": [],
				"dateDecided": "2006",
				"court": "NSWCA",
				"docketNumber": "231",
				"extra": "neutralCitation: [2006] NSWCA 231\nfullNeutralCitation: Australian Broadcasting Corporation v Obeid [2006] NSWCA 231",
				"url": "https://jade.io/article/1370",
				"attachments": [
					{
						"title": "JADE snapshot",
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
		"url": "https://jade.io/article/282664",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Surveying Act 2004 (Vic)",
				"creators": [],
				"dateEnacted": "2004",
				"code": "AU VIC",
				"url": "https://jade.io/article/282664",
				"attachments": [
					{
						"title": "JADE snapshot",
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
		"url": "https://jade.io/article/253888",
		"items": [
			{
				"itemType": "case",
				"caseName": "Lithgow City Council v Jackson",
				"creators": [],
				"dateDecided": "2011",
				"court": "HCA",
				"docketNumber": "36",
				"extra": "neutralCitation: [2011] HCA 36\nfullNeutralCitation: Lithgow City Council v Jackson [2011] HCA 36",
				"url": "https://jade.io/article/253888",
				"attachments": [
					{
						"title": "JADE snapshot",
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
		"url": "https://jade.io/article/282518",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Residential Tenancies Act 1997 (Vic)",
				"creators": [],
				"dateEnacted": "1997",
				"code": "AU VIC",
				"url": "https://jade.io/article/282518",
				"attachments": [
					{
						"title": "JADE snapshot",
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
