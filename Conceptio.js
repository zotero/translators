{
	"translatorID": "9b482dac-6398-4bf5-aadb-7f47732f981b",
	"label": "Conceptio",
	"creator": "Conceptio",
	"target": "^https?://(www\\.)?(conceptio\\.app)/document/\\d+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-09-01 00:00:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Conceptio
	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

/*
	Conceptio — Open Knowledge Archive (https://www.conceptio.app)

	Server-rendered document pages (/document/{id}/{slug}) carry a full
	JSON-LD block (schema.org: ScholarlyArticle / Book / TechArticle /
	Legislation / Dataset / Report / Article / Patent) plus Zotero COinS
	(.Z3988) — see conceptio/docpage.py. This translator extracts from the
	JSON-LD first (richest: sameAs, license, publisher, datePublished) and
	falls back to the COinS span, then to XPath.

	Item-type mapping follows CONCEPTIO_SEO Phase 6:
	  ScholarlyArticle -> journalArticle
	  Book            -> book
	  TechArticle     -> report   (standards)
	  Legislation     -> statute
	  Dataset         -> dataset
	  Report          -> report
	  Article         -> document (contracts etc.)
	  Patent          -> patent
	  WebPage         -> webpage
	Known case-law sources refine Legislation -> case (a court ruling is not
	a statute).

	The page snapshot is attached as text/html so the researcher keeps an
	archived copy; `url` prefers the official source (sameAs) so
	bibliographies cite the canonical location; `extra` records the Conceptio
	archive record + license for provenance.
*/

var ITEM_TYPES = {
	ScholarlyArticle: "journalArticle",
	Book: "book",
	TechArticle: "report",
	Legislation: "statute",
	Dataset: "dataset",
	Report: "report",
	Article: "document",
	Patent: "patent",
	Course: "document", // Zotero has no Course type
	VisualArtwork: "artwork",
	WebPage: "webpage"
};

// Case-law source labels rendered in the page meta line. A court ruling
// saved as "statute" is wrong; these refine Legislation -> case.
var CASE_LAW_HINTS = [
	"caselaw",
	"court",
	"hudoc",
	"cassazione",
	"costituzionale",
	"dei conti",
	"giustizia"
];

function detectWeb(doc, _url) {
	var ld = _jsonld(doc);
	var type = ld ? (ITEM_TYPES[ld["@type"]] || "document") : "document";
	if (type === "statute" && _isCaseLaw(doc)) {
		type = "case";
	}
	return type;
}

function doWeb(doc, url) {
	var item = _itemFromJSONLD(doc, url);
	if (!item) {
		item = _itemFromCoins(doc, url);
	}
	if (!item) {
		item = _itemFromXPath(doc, url);
	}
	item.complete();
}

/* ------------------------- JSON-LD (primary) ------------------------- */

function _jsonld(doc) {
	var scripts = doc.querySelectorAll('script[type="application/ld+json"]');
	for (var i = 0; i < scripts.length; i++) {
		try {
			var data = JSON.parse(scripts[i].textContent);
		}
		catch (e) {
			continue;
		}
		var nodes = (data instanceof Array) ? data : [data];
		for (var j = 0; j < nodes.length; j++) {
			// The page carries one JSON-LD block; be tolerant of any graph
			// wrapper and pick the node that names this document.
			if (nodes[j] && !(nodes[j]["@type"] || "").includes("WebSite")
					&& !(nodes[j]["@type"] instanceof Array)) {
				return nodes[j];
			}
		}
	}
	return null;
}

function _itemFromJSONLD(doc, url) {
	var ld = _jsonld(doc);
	if (!ld) {
		return null;
	}
	var type = ITEM_TYPES[ld["@type"]] || "document";
	if (type === "statute" && _isCaseLaw(doc)) {
		type = "case";
	}
	var item = new Zotero.Item(type);
	item.title = ld.name || ZU.xpathText(doc, '//h1[@class="title"]');
	item.url = ld.sameAs || ld.url || url;
	item.libraryCatalog = "Conceptio";

	if (ld.author) {
		var authors = (ld.author instanceof Array) ? ld.author : [ld.author];
		for (var i = 0; i < authors.length; i++) {
			var author = authors[i] && authors[i].name;
			if (!author) continue;
			// The corpus stores authors APA-shaped: "Rose, Scott and Borghorst,
			// Wendy". Split on " and "; comma-parts become person creators,
			// no-comma names (orgs like "Joint Task Force", "European Union")
			// become name-type creators so citations render them verbatim.
			var parts = author.split(/\s+and\s+/i);
			for (var p = 0; p < parts.length; p++) {
				var part = parts[p].trim();
				if (!part) continue;
				if (part.includes(",")) {
					// useComma=true: APA parts are "Last, First" — without the flag
					// Zotero applies its "last space = last name" heuristic and
					// inverts them ("Rose, Scott" -> first "Rose", last "Scott").
					item.creators.push(ZU.cleanAuthor(part, "author", true));
				}
				else {
					item.creators.push({ name: part, creatorType: "author" });
				}
			}
		}
	}
	if (ld.datePublished) {
		item.date = String(ld.datePublished).slice(0, 10);
	}
	var publisher = ld.publisher && (ld.publisher.name || ld.publisher);
	if (publisher) {
		if (type === "journalArticle" || type === "magazineArticle" || type === "newspaperArticle") {
			item.publicationTitle = publisher;
		}
		else {
			item.publisher = publisher;
		}
	}
	if (ld.license) {
		item.rights = ld.license;
	}
	if (ld.isAccessibleForFree) {
		item.accessDate = Zotero.Utilities.strToISO(new Date().toISOString().slice(0, 10));
	}

	var abstract = _abstractText(doc);
	if (abstract) {
		item.abstractNote = abstract;
	}

	// Provenance in `extra` — the archive record + official source, so the
	// citation carries where this came from (the archive's differentiator).
	var extra = [];
	if (ld.url) {
		extra.push("Archive: Conceptio Open Knowledge Archive — " + ld.url);
	}
	if (ld.sameAs) {
		extra.push("Official source: " + ld.sameAs);
	}
	if (item.extra) {
		extra.unshift(item.extra);
	}
	item.extra = extra.join("\n");

	item.attachments.push({
		title: "Conceptio snapshot",
		mimeType: "text/html",
		url: ld.url || url
	});
	return item;
}

/* ---------------------- COinS / XPath fallbacks ---------------------- */

function _itemFromCoins(doc, _url) {
	var span = doc.querySelector(".Z3988");
	if (!span) {
		return null;
	}
	return ZU.itemFromCOinS(span, doc);
}

function _itemFromXPath(doc, url) {
	var type = detectWeb(doc, url);
	var item = new Zotero.Item(type);
	item.title = ZU.xpathText(doc, '//h1[@class="title"]');
	item.url = url;
	item.libraryCatalog = "Conceptio";
	var meta = doc.getElementsByTagName("meta");
	for (var i = 0; i < meta.length; i++) {
		if (meta[i].getAttribute("name") === "description") {
			item.abstractNote = meta[i].getAttribute("content");
			break;
		}
	}
	return item;
}

/* ------------------------------- helpers ------------------------------ */

function _isCaseLaw(doc) {
	var line = ZU.xpathText(doc, '//div[contains(@class,"meta")]/div');
	line = line || "";
	line = line.toLowerCase();
	for (var i = 0; i < CASE_LAW_HINTS.length; i++) {
		if (line.includes(CASE_LAW_HINTS[i])) {
			return true;
		}
	}
	return false;
}

function _abstractText(doc) {
	var abs = ZU.xpathText(doc, '//div[contains(@class,"abstract")]');
	if (abs) {
		return ZU.trimInternal(abs);
	}
	return ZU.xpathText(doc, '//meta[@name="description"]/@content');
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.conceptio.app/document/26040/funding-mechanisms-for-humanitarian-response-cerf-country-based-pooled",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Funding Mechanisms for Humanitarian Response: CERF, Country-Based Pooled Funds, and Donor Trends: An African Union Perspective",
				"creators": [
					{
						"firstName": "Abraham Kuol",
						"lastName": "Nyuon",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Conceptio snapshot",
						"mimeType": "text/html"
					}
				],
				"url": "https://doi.org/10.5281/zenodo.19537026",
				"libraryCatalog": "Conceptio",
				"publicationTitle": "Zenodo (CERN)",
				"rights": "Open Access",
				"abstractNote": "Humanitarian Response CERF, Response CERF Country-Based, CERF Country-Based Pooled, Country-Based Pooled Funds, African Union Perspective, Funding Mechanisms",
				"extra": "Archive: Conceptio Open Knowledge Archive — https://www.conceptio.app/document/26040/funding-mechanisms-for-humanitarian-response-cerf-country-based-pooled\nOfficial source: https://doi.org/10.5281/zenodo.19537026",
				"shortTitle": "Funding Mechanisms for Humanitarian Response"
			}
		]
	}
]
/** END TEST CASES **/
