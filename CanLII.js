{
	"translatorID": "84799379-7bc5-4e55-9817-baf297d129fe",
	"label": "CanLII",
	"creator": "Sebastian Karcher",
	"target": "^https?://(www\\.)?canlii\\.org/(en|fr)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-09 21:15:20"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2012 Sebastian Karcher
	
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


var canLiiRegexp = /^https?:\/\/(?:www\.)?canlii\.org\/(?:en|fr)\/[^/]+\/[^/]+\/doc\//;

function clean(value) {
	return (value || "").replace(/\s+/g, " ").trim();
}

function meta(doc, name) {
	var node = doc.querySelector('meta[name="' + name + '"]');
	return node ? clean(node.getAttribute("content")) : "";
}

function metadataValue(doc, labels) {
	// Both the current Bootstrap layout and the earlier documentMeta layout.
	var nodes = doc.querySelectorAll("#metas-container .row > div:first-child, #documentMeta > div, #documentMeta .row > div:first-child");
	for (var node of nodes) {
		var label = clean(node.textContent).replace(/\s*:\s*$/, "").toLowerCase();
		if (labels.includes(label) && node.nextElementSibling) {
			return clean(node.nextElementSibling.textContent);
		}
	}
	return "";
}

function detectWeb(doc, url) {
	if (canLiiRegexp.test(url)) return "case";
	for (var link of doc.querySelectorAll("a[href]")) {
		if (canLiiRegexp.test(link.href)) return "multiple";
	}
	return false;
}

function scrape(doc, url) {
	var item = new Zotero.Item("case");
	var citationNode = doc.querySelector(".documentMeta-citation + div");
	var citation = citationNode ? clean(citationNode.textContent) : meta(doc, "DC.Title");
	var citationMatch = citation.match(/^(.+),\s*((?:18|19|20)\d{2})\s+([A-Za-z][A-Za-z0-9-]*(?:\s+[A-Z]{2})?)\s+(\d+)(?:\s+\(([^)]+)\))?/);
	var heading = doc.querySelector("#title-container h1, #titleContainer h1, h1");
	item.caseName = meta(doc, "lbh-title") || (citationMatch ? citationMatch[1] : citation.split(",")[0]) || clean(heading && heading.textContent);
	item.court = metadataValue(doc, ["source", "court", "tribunal"]);
	if (!item.court) {
		var crumbs = doc.querySelectorAll('#canlii-breadcrumbs a, #breadcrumbs *[itemprop="name"]');
		if (crumbs.length > 2) item.court = clean(crumbs[2].textContent);
	}
	item.dateDecided = metadataValue(doc, ["date", "decision date", "date de la décision"]) || meta(doc, "DC.Date").slice(0, 10);
	item.docketNumber = metadataValue(doc, ["file number", "file numbers", "numéro de dossier", "numéros de dossier"]);
	var otherCitations = metadataValue(doc, ["other citation", "other citations", "autre citation", "autres citations"]);
	if (otherCitations) item.notes.push({ note: "Other Citations: " + otherCitations });

	// Preserve existing reporter citations. For cases without a reporter, CSL
	// page holds the neutral-citation decision number, not the actual docket.
	var reported = citation.match(/\[\d{4}\]\s+(\d+)\s+([A-Z]+)\s+(\d+)/);
	if (reported) {
		item.reporterVolume = reported[1];
		item.reporter = reported[2];
		item.firstPage = reported[3];
	}
	else if (citationMatch && citationMatch[3].toLowerCase() !== "canlii") {
		item.notes.push({ note: "Neutral citation: " + citationMatch[2] + " " + citationMatch[3] + " " + citationMatch[4]
			+ (item.court ? "; Court: " + item.court : "") });
		item.court = citationMatch[3];
		item.extra = "Page: " + citationMatch[4];
	}
	var shortURL = doc.querySelector(".documentStaticUrl");
	item.url = shortURL ? (shortURL.getAttribute("href") || clean(shortURL.textContent)) : url.replace(/[?#].*$/, "");
	item.attachments.push({ url: url.replace(/\.html(?:[?#].*)?$/, ".pdf"), title: "CanLII Full Text PDF", mimeType: "application/pdf" });
	item.attachments.push({ document: doc, title: "CanLII Snapshot" });
	item.complete();
}

async function doWeb(doc, url) {
	if (canLiiRegexp.test(url)) {
		scrape(doc, url);
	}
	else {
		var items = await Zotero.selectItems(ZU.getItemArray(doc, doc, canLiiRegexp));
		if (!items) return;
		for (var article of Object.keys(items)) {
			scrape(await requestDocument(article), article);
		}
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.canlii.org/en/ca/scc/doc/2010/2010scc2/2010scc2.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "MiningWatch Canada v. Canada (Fisheries and Oceans)",
				"creators": [],
				"dateDecided": "2010-01-21",
				"court": "Supreme Court of Canada",
				"docketNumber": "32797",
				"firstPage": "6",
				"reporter": "SCR",
				"reporterVolume": "1",
				"url": "https://canlii.ca/t/27jmr",
				"attachments": [
					{
						"title": "CanLII Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Other Citations: 315 DLR (4th) 434 — 397 NR 232 — 99 Admin LR (4th) 1 — [2010] SCJ No 2 (QL) — [2010] ACS no 2"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.canlii.org/fr/ca/csc/doc/2010/2010csc2/2010csc2.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "Mines Alerte Canada c. Canada (Pêches et Océans)",
				"creators": [],
				"dateDecided": "2010-01-21",
				"court": "Supreme Court of Canada",
				"docketNumber": "32797",
				"firstPage": "6",
				"reporter": "RCS",
				"reporterVolume": "1",
				"url": "https://canlii.ca/t/27jms",
				"attachments": [
					{
						"title": "CanLII Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Other Citations: 315 DLR (4th) 434 — 397 NR 232 — 99 Admin LR (4th) 1 — [2010] SCJ No 2 (QL) — [2010] ACS no 2"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.canlii.org/en/ca/fct/doc/2011/2011fc119/2011fc119.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "Suttie v. Canada (Attorney General)",
				"creators": [],
				"dateDecided": "2011-02-02",
				"court": "FC",
				"docketNumber": "T-1089-10",
				"extra": "Page: 119",
				"url": "https://canlii.ca/t/2flrk",
				"attachments": [
					{
						"title": "CanLII Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Neutral citation: 2011 FC 119; Court: Federal Court"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.canlii.org/fr/ca/cfpi/doc/2011/2011cf119/2011cf119.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "Suttie c. Canada (Procureur Général)",
				"creators": [],
				"dateDecided": "2011-02-02",
				"court": "CF",
				"docketNumber": "T-1089-10",
				"extra": "Page: 119",
				"url": "https://canlii.ca/t/fks9z",
				"attachments": [
					{
						"title": "CanLII Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Neutral citation: 2011 CF 119; Court: Federal Court"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.canlii.org/en/bc/bcca/doc/2019/2019bcca96/2019bcca96.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "R. v. Pootlass",
				"creators": [],
				"dateDecided": "2019-03-18",
				"court": "BCCA",
				"docketNumber": "CA44845",
				"extra": "Page: 96",
				"url": "https://canlii.ca/t/hz4ml",
				"attachments": [
					{
						"title": "CanLII Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Other Citations: 373 CCC (3d) 433"
					},
					{
						"note": "Neutral citation: 2019 BCCA 96; Court: Court of Appeal for British Columbia"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.canlii.org/en/bc/bcca/doc/2019/2019bcca96/2019bcca96.html?resultId=fa395df9e9774c0fbeeac1b3eed0b75a&searchId=2026-10-09T12:34:54:405/e8eb00c58ee44b35b702ffabaa041f0c&searchUrlHash=AAAAAQAbUiB2IFBvb3RsYXNzLCAyMDE5IEJDQ0EgOTYgAAAAAAE",
		"items": [
			{
				"itemType": "case",
				"caseName": "R. v. Pootlass",
				"creators": [],
				"dateDecided": "2019-03-18",
				"court": "BCCA",
				"docketNumber": "CA44845",
				"extra": "Page: 96",
				"url": "https://canlii.ca/t/hz4ml",
				"attachments": [
					{
						"title": "CanLII Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "CanLII Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "Other Citations: 373 CCC (3d) 433"
					},
					{
						"note": "Neutral citation: 2019 BCCA 96; Court: Court of Appeal for British Columbia"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
