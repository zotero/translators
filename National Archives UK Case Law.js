{
	"translatorID": "be076b36-b2ef-41e3-afd9-3ab9da626ff1",
	"label": "National Archives UK Case Law",
	"creator": "Michael Veale",
	"target": "^https?://caselaw\\.nationalarchives\\.gov\\.uk/.*",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-01-26 21:45:32"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Michael Veale

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

function detectWeb(doc, _url) {
	// Checks for the main judgment title bar (present on all versions of the site)
	if (doc.getElementById("judgment-toolbar-title")) {
		return "case";
	}
	// Fallback for older pages
	if (doc.querySelector(".judgment-header__neutral-citation") || doc.querySelector(".ncn-nowrap")) {
		return "case";
	}
	return false;
}

function doWeb(doc, _url) {
	var item = new Zotero.Item("case");

	// 1. CASE NAME
	var titleEl = doc.getElementById("judgment-toolbar-title");
	if (titleEl) {
		item.caseName = Zotero.Utilities.trimInternal(titleEl.textContent);
	}

	// 2. NEUTRAL CITATION (Docket Number)
	var docketStr = "";
	var citationEl = doc.querySelector(".ncn-nowrap");
	if (citationEl) {
		docketStr = Zotero.Utilities.trimInternal(citationEl.textContent);
	}
	else {
		// Fallback for Tribunal pages where citation is hidden
		var hiddenEl = doc.querySelector(".visually-hidden");
		if (hiddenEl && hiddenEl.textContent.includes("Neutral Citation")) {
			var parentText = hiddenEl.parentElement.textContent;
			docketStr = parentText.replace("Neutral Citation Number", "").trim();
		}
	}
	item.docketNumber = docketStr;

	// 3. COURT DETECTION
	var courtEls = doc.querySelectorAll(".judgment-header__court");

	// A. Explicit Court Headers found (High Court, Appeal, etc.)
	if (courtEls.length > 0) {
		var courtNames = [];
		for (var i = 0; i < courtEls.length; i++) {
			var txt = courtEls[i].textContent.trim().toLowerCase();
			// Clean prefixes like "in the court of"
			txt = txt.replace(/^\s*(in\s+the|in\s+the\s+court\s+of)\s+/i, "");

			// Title Case Logic
			var words = txt.split(" ");
			for (var j = 0; j < words.length; j++) {
				var w = words[j];
				var small = ["of", "the", "and", "for", "at", "by", "from", "in"];

				// Clean the word of punctuation to check if it's "small" (e.g. "(of)")
				var cleanWord = w.replace(/[^a-z]/g, "");

				if (j > 0 && small.includes(cleanWord)) {
					words[j] = w;
				}
				else {
					// Smart Capitalization: Find the first actual letter [a-z] and uppercase it
					words[j] = w.replace(/[a-z]/, function (match) {
						return match.toUpperCase();
					});
				}
			}
			courtNames.push(words.join(" "));
		}
		item.court = courtNames.join(", ");
	}
	// B. Fallback Mapping based on Citation
	else if (docketStr.includes("UKIPTrib")) {
		item.court = "Investigatory Powers Tribunal";
	}
	else if (docketStr.includes("UKSIAC")) {
		item.court = "Special Immigration Appeals Commission";
	}
	else if (docketStr.includes("EAT")) {
		item.court = "Employment Appeal Tribunal";
	}
	else if (docketStr.includes("CAT")) {
		item.court = "Competition Appeal Tribunal";
	}
	// Upper Tribunal
	else if (docketStr.includes("UKUT")) {
		item.court = "Upper Tribunal";
		if (docketStr.includes("(AAC)")) item.court += " (Administrative Appeals Chamber)";
		else if (docketStr.includes("(IAC)")) item.court += " (Immigration and Asylum Chamber)";
		else if (docketStr.includes("(LC)")) item.court += " (Lands Chamber)";
		else if (docketStr.includes("(TCC)")) item.court += " (Tax and Chancery Chamber)";
	}
	// First-tier Tribunal
	else if (docketStr.includes("UKFTT")) {
		item.court = "First-tier Tribunal";
		if (docketStr.includes("(HESC)")) item.court += " (Health, Education and Social Care Chamber)";
		else if (docketStr.includes("(CS)")) item.court += " (Care Standards)";
		else if (docketStr.includes("(PHL)")) item.court += " (Primary Health Lists)";
		else if (docketStr.includes("(TC)")) item.court += " (Tax Chamber)";
		else if (docketStr.includes("(GRC)")) item.court += " (General Regulatory Chamber)";
		else if (docketStr.includes("(IAC)")) item.court += " (Immigration and Asylum Chamber)";
		else if (docketStr.includes("(PC)")) item.court += " (Property Chamber)";
		else if (docketStr.includes("(WPC)")) item.court += " (War Pensions and Armed Forces Compensation Chamber)";
		else if (docketStr.includes("(SEC)")) item.court += " (Social Entitlement Chamber)";
	}
	// Historic
	else if (docketStr.includes("UKIST")) {
		item.court = "Immigration Services Tribunal";
	}
	else if (docketStr.includes("UKCCAT")) {
		item.court = "Consumer Credit Appeals Tribunal";
	}
	else if (docketStr.includes("UKCMST")) {
		item.court = "Claims Management Services Tribunal";
	}
	else if (docketStr.includes("UKTr")) {
		item.court = "Transport Tribunal";
	}
	// Supreme Court / Privy Council
	else if (docketStr.includes("UKSC")) {
		item.court = "Supreme Court of the United Kingdom";
	}
	else if (docketStr.includes("UKPC")) {
		item.court = "Judicial Committee of the Privy Council";
	}
	// Specialized E&W
	else if (docketStr.includes("EWCOP")) {
		item.court = "Court of Protection";
	}
	else if (docketStr.includes("EWFC")) {
		item.court = "Family Court";
	}
	else if (docketStr.includes("SCCO")) {
		item.court = "Senior Courts Costs Office";
	}
	else if (docketStr.includes("IPEC")) {
		item.court = "Intellectual Property Enterprise Court";
	}
	// High Court / Appeal E&W
	else if (docketStr.includes("EWCA")) {
		item.court = docketStr.includes("Crim") ? "Court of Appeal (Criminal Division)" : "Court of Appeal (Civil Division)";
	}
	else if (docketStr.includes("EWHC")) {
		if (docketStr.includes("Admin")) item.court = "High Court (Administrative Court)";
		else if (docketStr.includes("Ch")) item.court = "High Court (Chancery Division)";
		else if (docketStr.includes("Fam")) item.court = "High Court (Family Division)";
		else if (docketStr.includes("Pat")) item.court = "High Court (Patents Court)";
		else if (docketStr.includes("Admlty")) item.court = "High Court (Admiralty Court)";
		else if (docketStr.includes("Comm")) item.court = "High Court (Commercial Court)";
		else if (docketStr.includes("TCC")) item.court = "High Court (Technology and Construction Court)";
		else if (docketStr.includes("KB")) item.court = "High Court (King's Bench Division)";
		else if (docketStr.includes("QB")) item.court = "High Court (Queen's Bench Division)";
		else item.court = "High Court of Justice";
	}
	// Northern Ireland
	else if (docketStr.includes("NICA")) {
		item.court = "Court of Appeal in Northern Ireland";
	}
	else if (docketStr.includes("NIKB") || docketStr.includes("NIQB")) {
		item.court = "High Court of Justice in Northern Ireland (King's Bench Division)";
	}
	else if (docketStr.includes("NICh")) {
		item.court = "High Court of Justice in Northern Ireland (Chancery Division)";
	}
	else if (docketStr.includes("NIFam")) {
		item.court = "High Court of Justice in Northern Ireland (Family Division)";
	}
	else if (docketStr.includes("NICC")) {
		item.court = "Crown Court in Northern Ireland";
	}
	else if (docketStr.includes("NIMaster")) {
		item.court = "High Court of Justice in Northern Ireland (Master)";
	}
	// Scotland
	else if (docketStr.includes("CSIH")) {
		item.court = "Court of Session (Inner House)";
	}
	else if (docketStr.includes("CSOH")) {
		item.court = "Court of Session (Outer House)";
	}
	else if (docketStr.includes("HCJ")) {
		item.court = "High Court of Justiciary";
	}
	else if (docketStr.includes("SAC")) {
		item.court = "Sheriff Appeal Court";
	}
	else if (docketStr.includes("SC")) {
		item.court = "Sheriff Court";
	}

	// 4. DATE
	var dateText = "";
	var dateEl = doc.querySelector(".judgment-header__date");

	if (dateEl) {
		dateText = dateEl.textContent;
	}
	else {
		// Fallback for tribunals: look for "On [Date]" in paragraphs
		var paragraphs = doc.querySelectorAll("p");
		for (var k = 0; k < paragraphs.length; k++) {
			var pTxt = paragraphs[k].textContent;
			if (pTxt.includes("On ") && pTxt.match(/\d{4}/)) {
				dateText = pTxt;
				break;
			}
		}
	}

	// Regex for "22 January 2026" or "22/01/2026"
	var dateMatch = dateText.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})|(\d{1,2}\/[\d]{1,2}\/\d{4})/);
	if (dateMatch) {
		item.dateDecided = dateMatch[0];
	}

	// 5. PDF
	var pdfLink = doc.querySelector('a[href$=".pdf"]');
	if (pdfLink) {
		item.attachments.push({
			title: "Full Text PDF",
			mimeType: "application/pdf",
			url: pdfLink.href
		});
	}

	// 6. SAVE
	item.url = _url;
	item.attachments.push({
		title: "National Archives Snapshot",
		document: doc,
		snapshot: true
	});

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://caselaw.nationalarchives.gov.uk/uksc/2025/46",
		"items": [
			{
				"itemType": "case",
				"caseName": "Commissioners for His Majesty's Revenue and Customs v Hotel La Tour Ltd",
				"creators": [],
				"dateDecided": "17 December 2025",
				"court": "Supreme Court of the United Kingdom",
				"docketNumber": "[2025] UKSC 46",
				"url": "https://caselaw.nationalarchives.gov.uk/uksc/2025/46",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "National Archives Snapshot",
						"snapshot": true,
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
		"url": "https://caselaw.nationalarchives.gov.uk/ewhc/scco/2026/120",
		"items": [
			{
				"itemType": "case",
				"caseName": "R v Jian Wen",
				"creators": [],
				"dateDecided": "23/01/2026",
				"court": "High Court of Justice, Senior Courts Costs Office",
				"docketNumber": "[2026] EWHC 120 (SCCO)",
				"url": "https://caselaw.nationalarchives.gov.uk/ewhc/scco/2026/120",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "National Archives Snapshot",
						"snapshot": true,
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
		"url": "https://caselaw.nationalarchives.gov.uk/ukiptrib/2023/8",
		"items": [
			{
				"itemType": "case",
				"caseName": "Christine Lee v Security Service",
				"creators": [],
				"dateDecided": "22 September 2023",
				"court": "Investigatory Powers Tribunal",
				"docketNumber": "[2023] UKIPTrib 8",
				"url": "https://caselaw.nationalarchives.gov.uk/ukiptrib/2023/8",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "National Archives Snapshot",
						"snapshot": true,
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
		"url": "https://caselaw.nationalarchives.gov.uk/ewca/civ/2026/25",
		"items": [
			{
				"itemType": "case",
				"caseName": "The Federal Republic of Nigeria v VR Global Partners LP & Ors",
				"creators": [],
				"dateDecided": "23/01/2026",
				"court": "Court of Appeal (Civil Division)",
				"docketNumber": "[2026] EWCA Civ 25",
				"url": "https://caselaw.nationalarchives.gov.uk/ewca/civ/2026/25",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "National Archives Snapshot",
						"snapshot": true,
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
		"url": "https://caselaw.nationalarchives.gov.uk/ewhc/comm/2026/110",
		"items": [
			{
				"itemType": "case",
				"caseName": "McLaren Indy LLC & Anor v Alpa Racing USA LLC & Ors",
				"creators": [],
				"dateDecided": "23 January 2026",
				"court": "High Court (Commercial Court)",
				"docketNumber": "[2026] EWHC 110 (Comm)",
				"url": "https://caselaw.nationalarchives.gov.uk/ewhc/comm/2026/110",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "National Archives Snapshot",
						"snapshot": true,
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
		"url": "https://caselaw.nationalarchives.gov.uk/ewhc/ch/2026/100",
		"items": [
			{
				"itemType": "case",
				"caseName": "Helen Ginger & Ors v Robert Mickleburgh & Ors",
				"creators": [],
				"dateDecided": "23/1/2026",
				"court": "High Court (Chancery Division)",
				"docketNumber": "[2026] EWHC 100 (Ch)",
				"url": "https://caselaw.nationalarchives.gov.uk/ewhc/ch/2026/100",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "National Archives Snapshot",
						"snapshot": true,
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
		"url": "https://caselaw.nationalarchives.gov.uk/ewhc/kb/2025/111",
		"items": [
			{
				"itemType": "case",
				"caseName": "RTM v Bonne Terre Limited & Anor",
				"creators": [],
				"dateDecided": "23/01/2025",
				"court": "High Court of Justice, King's Bench Division",
				"docketNumber": "[2025] EWHC 111 (KB)",
				"url": "https://caselaw.nationalarchives.gov.uk/ewhc/kb/2025/111",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "National Archives Snapshot",
						"snapshot": true,
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
