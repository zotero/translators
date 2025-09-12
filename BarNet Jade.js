{
	"translatorID": "9797bd04-629f-4c3b-a1a7-5b020975d8eb",
	"label": "BarNet Jade",
	"creator": "Russell Brenner",
	"target": "^https://jade\\.io/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-09-02 06:34:21"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Russell Brenner
	This translator was generated using Claude AI and OpenAI Codex.

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


function textTrim(s) {
	return ZU.trimInternal((s || "").replace(/\s+/g, " ").replace(/\u00A0/g, " "));
}

function getMeta(doc, name, prop = "name") {
	return attr(doc, `meta[${prop}="${name}"]`, "content");
}

function getTitle(doc) {
	return getMeta(doc, "og:title", "property") || doc.title || "";
}

function getCanonicalURL(doc) {
	return getMeta(doc, "og:url", "property") || doc.location && doc.location.href || "";
}

function looksLikeLegislationTitle(t) {
	return /\bAct\s+\d{4}\b|\bRegulations?\b|\bRules?\b|\bOrdinance\b/i.test(t);
}

function getSectionFromURL(url) {
	const m = (url || "").match(/\/article\/\d+\/section\/(\d+)/i);
	return m ? m[1] : null;
}

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


function normaliseDate(d) {
	if (!d) return "";
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
	try {
		const dt = new Date(d);
		if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
	}
	catch (e) {
	}
	return d;
}

function findPDFLink(doc) {
	const link = doc.querySelector('a[href$=".pdf"], a[href*="download"][href*="pdf"], a[download$=".pdf"]');
	return link ? link.href : null;
}

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

	let results = [];
	results = results.concat(scanAll(getMeta(doc, "og:title", "property")));
	results = results.concat(scanAll(getMeta(doc, "og:description", "property")));
	const els = doc.querySelectorAll(
		".ribbon-citation, li.ribbon-citation, .citation, .citations, .case-citation"
	);
	for (const el of els) {
		results = results.concat(scanAll(el && el.textContent));
	}
	const dedup = new Map();
	for (const r of results) {
		dedup.set(`${r.volume}|${r.reporter}|${r.page}`, r);
	}
	return Array.from(dedup.values());
}

function pickBestLawReport(citations) {
	if (!citations || citations.length === 0) return null;
	citations.sort((a, b) => {
		const ai = LAW_REPORT_PRIORITY.indexOf(a.reporter);
		const bi = LAW_REPORT_PRIORITY.indexOf(b.reporter);
		if (ai !== bi) return ai - bi;
		return parseInt(b.volume) - parseInt(a.volume);
	});
	return citations[0];
}

function findNeutralCitation(doc) {
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
	return null;
}

function findSummaryURL(doc, _url) {
	let a = doc.querySelector('a[href*="/summary/mnc/"]');
	if (a && a.href) return a.href;
	a = doc.querySelector('a[href*="/j/?a=outline&id="]');
	if (a && a.href) return a.href;
	return null;
}

function extractCaseName(doc) {
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

	const title = getTitle(doc);
	if (title) {
		const parsed = parseNeutralCitationFromTitle(title);
		if (parsed && parsed.caseName) return parsed.caseName;
		return textTrim(title.replace(/^\s*BarNet\s+Jade\s*-\s*/i, '').replace(/\s*-\s*BarNet\s+Jade.*$/i, ''));
	}
	return '';
}

function isGenericCaseTitle(name) {
	return /BarNet\s+Jade|Find\s+recent\s+Australian\s+legal|Judgments\s+And\s+Decisions\s+Enhanced/i.test(name || '');
}


function detectWeb(doc, url) {
	if (/\/xml\/.+\.xml$/i.test(url)) return "multiple";

	if (/\/article\/\d+(?:\/section\/\d+)?(?:[?#].*)?$/i.test(url) || /\/summary\/mnc\//i.test(url) || /\/j\/\?a=outline&id=\d+/i.test(url)) {
		const t = getTitle(doc) || "";
		if (parseNeutralCitationFromTitle(t)) return "case";
		if (/\bv\b/i.test(t)) return "case";
		if (looksLikeLegislationTitle(t) || /\/section\//i.test(url)) return "statute";
		if (/\/article\/\d+/.test(url)) return "case";
		return "case";
	}

	if (url && url.includes('jade.io')) {
		const t = getTitle(doc) || "";
		if (parseNeutralCitationFromTitle(t)) return "case";
		if (/\bv\b/i.test(t)) return "case";
		if (looksLikeLegislationTitle(t)) return "statute";
		if (/\b(?:court|judgment|decision|case|act|regulation|statute)\b/i.test(t)) {
			return /\b(?:act|regulation|statute)\b/i.test(t) ? "statute" : "case";
		}
	}

	return false;
}


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


function doWeb(doc, url) {
	const type = detectWeb(doc, url);

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

	if (type === "case") {
		scrapeCase(doc, url);
	}
	else if (type === "statute") {
		scrapeStatute(doc, url);
	}
}


function scrapeCase(doc, url) {
	const item = new Zotero.Item("case");

	const title = textTrim(getTitle(doc));
	const ogDesc = getMeta(doc, "og:description", "property");
	const canonical = getCanonicalURL(doc);


	const betterTitle = getMeta(doc, 'citation_title') || getMeta(doc, 'DC.title') || title;

	let parsed = parseNeutralCitationFromTitle(betterTitle);
	let ncBareStr = null;
	let caseNameStr = null;
	const parallelSegments = [];

	if (parsed) {
		item.caseName = parsed.caseName;
		caseNameStr = item.caseName;
		item.court = parsed.courtAcronym;
		item.docketNumber = parsed.number;
		ncBareStr = `[${parsed.year}] ${parsed.courtAcronym} ${parsed.number}`;
		if (parsed.dateText) item.dateDecided = normaliseDate(parsed.dateText);
		if (!item.dateDecided && parsed.year) item.dateDecided = parsed.year;
	}
	else {
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
					const urlMatch = (url || '').match(/\/article\/(\d+)/i);
				item.caseName = urlMatch ? `JADE Article ${urlMatch[1]}` : 'Unknown Case';
			}
			caseNameStr = item.caseName;
			item.court = "";
		}
	}

	item.url = canonical || url;
	item.abstractNote = ogDesc || "";

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
					if (!parsed) {
					const nc2 = findNeutralCitation(sd);
					if (nc2) {
						item.court = item.court || nc2.courtAcronym;
						item.docketNumber = item.docketNumber || nc2.number;
						if (!ncBareStr) ncBareStr = `[${nc2.year}] ${nc2.courtAcronym} ${nc2.number}`;
						if (!item.dateDecided) item.dateDecided = nc2.year;
					}
				}
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

	(function () {
		if (item.dateDecided && /^(19|20)\d{2}$/.test(item.dateDecided) === false) return;
		let d = null;
		d = d || getMeta(doc, "citation_date");
		d = d || getMeta(doc, "DC.date");
		d = d || getMeta(doc, "dcterms.date");
		d = d || ZU.xpathText(doc, "//h1//time/@datetime")
			|| ZU.xpathText(doc, "//h1//time/text()")
			|| ZU.xpathText(doc, "//time/@datetime")
			|| ZU.xpathText(doc, "//time/text()");

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
			const yFromMNC = (parsed && parsed.year) ? String(parsed.year) : null;
			const yFromDate = (nd && nd.match(/^(\d{4})/)) ? RegExp.$1 : null;
			if (!yFromMNC || (yFromDate && yFromDate === yFromMNC)) {
				item.dateDecided = nd;
			}
		}
	})();

	function finalize() {
		if (ncBareStr) {
			const cn = (caseNameStr && !isGenericCaseTitle(caseNameStr)) ? caseNameStr : (item.caseName || '');
			const fullCitation = cn ? `${cn} ${ncBareStr}` : ncBareStr;
			item.notes.push({
				note: `<h1>Neutral Citation</h1>\n<p>${ncBareStr}</p>\n<h1>Full Neutral Citation</h1>\n<p>${fullCitation}</p>`
			});
			if (parallelSegments.length) {
				item.notes.push({
					note: `<h1>Parallel Citations</h1>\n<p>${parallelSegments.join('; ')}</p>`
				});
			}
		}
		item.attachments.push({ title: "Snapshot", document: doc });
		const pdf = findPDFLink(doc);
		if (pdf) item.attachments.push({ title: "Full Text PDF", url: pdf, mimeType: "application/pdf" });
		item.complete();
	}

	finalize();
}

function scrapeStatute(doc, url) {
	const item = new Zotero.Item("statute");

	const title = textTrim(getTitle(doc));
	const canonical = getCanonicalURL(doc);
	const sectionId = getSectionFromURL(url);

	let t = title
		.replace(/^\s*BarNet\s+Jade\s*-\s*/i, "")
		.replace(/\s*-\s*BarNet\s+Jade.*$/i, "");

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

	item.attachments.push({ title: "Snapshot", document: doc });

	const pdf = findPDFLink(doc);
	if (pdf) item.attachments.push({ title: "Full Text PDF", url: pdf, mimeType: "application/pdf" });

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
