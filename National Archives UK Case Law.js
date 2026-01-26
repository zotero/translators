{
	"translatorID": "be076b36-b2ef-41e3-afd9-3ab9da626ff1",
	"label": "National Archives UK Case Law",
	"creator": "Michael Veale",
	"target": "^https?://caselaw\\.nationalarchives\\.gov\\.uk/.*",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-01-26 21:24:59"
}

function detectWeb(doc, url) {
	// Checks for the main judgment title bar (present afaik on all versions of the site)
	if (doc.getElementById("judgment-toolbar-title")) {
		return "case";
	}
	// Fallback for older pages
	if (doc.querySelector(".judgment-header__neutral-citation") || doc.querySelector(".ncn-nowrap")) {
		return "case";
	}
	return false;
}

function doWeb(doc, url) {
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
	} else {
		// Fallback for Tribunal pages where citation is hidden
		var hiddenEl = doc.querySelector(".visually-hidden");
		if (hiddenEl && hiddenEl.textContent.indexOf("Neutral Citation") > -1) {
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
			
			// Title Case Logic (Fixed for brackets) - for some reason the Zotero utility wasn't working
			var words = txt.split(" ");
			for (var j = 0; j < words.length; j++) {
				var w = words[j];
				// List of words to keep lowercase
				var small = ["of", "the", "and", "for", "at", "by", "from", "in"];
				
				// Clean the word of punctuation to check if it's "small" (e.g. "(of)")
				var cleanWord = w.replace(/[^a-z]/g, "");

				if (j > 0 && small.indexOf(cleanWord) > -1) {
					words[j] = w; // Keep lowercase
				} else {
					// Smart Capitalization: Find the first actual letter [a-z] and uppercase it
					// Issue it fixes: turns "(civil" into "(Civil" and "court" into "Court"
					words[j] = w.replace(/[a-z]/, function(match) { return match.toUpperCase(); });
				}
			}
			courtNames.push(words.join(" "));
		}
		item.court = courtNames.join(", ");
	} 
	// B. Fallback Mapping based on Citation rather than in text
	else {
		// --- TRIBUNALS ---
		if (docketStr.indexOf("UKIPTrib") > -1) item.court = "Investigatory Powers Tribunal";
		else if (docketStr.indexOf("UKSIAC") > -1) item.court = "Special Immigration Appeals Commission";
		else if (docketStr.indexOf("EAT") > -1) item.court = "Employment Appeal Tribunal";
		else if (docketStr.indexOf("CAT") > -1) item.court = "Competition Appeal Tribunal";
		
		// Upper Tribunal
		else if (docketStr.indexOf("UKUT") > -1) {
			item.court = "Upper Tribunal";
			if (docketStr.indexOf("(AAC)") > -1) item.court += " (Administrative Appeals Chamber)";
			else if (docketStr.indexOf("(IAC)") > -1) item.court += " (Immigration and Asylum Chamber)";
			else if (docketStr.indexOf("(LC)") > -1) item.court += " (Lands Chamber)";
			else if (docketStr.indexOf("(TCC)") > -1) item.court += " (Tax and Chancery Chamber)";
		}

		// First-tier Tribunal
		else if (docketStr.indexOf("UKFTT") > -1) {
			item.court = "First-tier Tribunal";
			if (docketStr.indexOf("(HESC)") > -1) item.court += " (Health, Education and Social Care Chamber)";
			else if (docketStr.indexOf("(CS)") > -1) item.court += " (Care Standards)";
			else if (docketStr.indexOf("(PHL)") > -1) item.court += " (Primary Health Lists)";
			else if (docketStr.indexOf("(TC)") > -1) item.court += " (Tax Chamber)";
			else if (docketStr.indexOf("(GRC)") > -1) item.court += " (General Regulatory Chamber)";
			else if (docketStr.indexOf("(IAC)") > -1) item.court += " (Immigration and Asylum Chamber)";
			else if (docketStr.indexOf("(PC)") > -1) item.court += " (Property Chamber)";
			else if (docketStr.indexOf("(WPC)") > -1) item.court += " (War Pensions and Armed Forces Compensation Chamber)";
			else if (docketStr.indexOf("(SEC)") > -1) item.court += " (Social Entitlement Chamber)";
		} 

		// Historic
		else if (docketStr.indexOf("UKIST") > -1) item.court = "Immigration Services Tribunal";
		else if (docketStr.indexOf("UKCCAT") > -1) item.court = "Consumer Credit Appeals Tribunal";
		else if (docketStr.indexOf("UKCMST") > -1) item.court = "Claims Management Services Tribunal";
		else if (docketStr.indexOf("UKTr") > -1) item.court = "Transport Tribunal";

		// Supreme Court / Privy Council
		else if (docketStr.indexOf("UKSC") > -1) item.court = "Supreme Court of the United Kingdom";
		else if (docketStr.indexOf("UKPC") > -1) item.court = "Judicial Committee of the Privy Council";

		// Specialized E&W
		else if (docketStr.indexOf("EWCOP") > -1) item.court = "Court of Protection";
		else if (docketStr.indexOf("EWFC") > -1) item.court = "Family Court";
		else if (docketStr.indexOf("SCCO") > -1) item.court = "Senior Courts Costs Office";
		else if (docketStr.indexOf("IPEC") > -1) item.court = "Intellectual Property Enterprise Court";

		// High Court / Appeal E&W
		else if (docketStr.indexOf("EWCA") > -1) {
			item.court = docketStr.indexOf("Crim") > -1 ? "Court of Appeal (Criminal Division)" : "Court of Appeal (Civil Division)";
		} 
		else if (docketStr.indexOf("EWHC") > -1) {
			if (docketStr.indexOf("Admin") > -1) item.court = "High Court (Administrative Court)";
			else if (docketStr.indexOf("Ch") > -1) item.court = "High Court (Chancery Division)";
			else if (docketStr.indexOf("Fam") > -1) item.court = "High Court (Family Division)";
			else if (docketStr.indexOf("Pat") > -1) item.court = "High Court (Patents Court)";
			else if (docketStr.indexOf("Admlty") > -1) item.court = "High Court (Admiralty Court)";
			else if (docketStr.indexOf("Comm") > -1) item.court = "High Court (Commercial Court)";
			else if (docketStr.indexOf("TCC") > -1) item.court = "High Court (Technology and Construction Court)";
			else if (docketStr.indexOf("KB") > -1) item.court = "High Court (King's Bench Division)";
			else if (docketStr.indexOf("QB") > -1) item.court = "High Court (Queen's Bench Division)";
			else item.court = "High Court of Justice";
		}

		// Northern Ireland
		else if (docketStr.indexOf("NICA") > -1) item.court = "Court of Appeal in Northern Ireland";
		else if (docketStr.indexOf("NIKB") > -1 || docketStr.indexOf("NIQB") > -1) item.court = "High Court of Justice in Northern Ireland (King's Bench Division)";
		else if (docketStr.indexOf("NICh") > -1) item.court = "High Court of Justice in Northern Ireland (Chancery Division)";
		else if (docketStr.indexOf("NIFam") > -1) item.court = "High Court of Justice in Northern Ireland (Family Division)";
		else if (docketStr.indexOf("NICC") > -1) item.court = "Crown Court in Northern Ireland";
		else if (docketStr.indexOf("NIMaster") > -1) item.court = "High Court of Justice in Northern Ireland (Master)";

		// Scotland
		else if (docketStr.indexOf("CSIH") > -1) item.court = "Court of Session (Inner House)";
		else if (docketStr.indexOf("CSOH") > -1) item.court = "Court of Session (Outer House)";
		else if (docketStr.indexOf("HCJ") > -1) item.court = "High Court of Justiciary";
		else if (docketStr.indexOf("SAC") > -1) item.court = "Sheriff Appeal Court";
		else if (docketStr.indexOf("SC") > -1) item.court = "Sheriff Court";
	}

	// 4. DATE
	var dateText = "";
	var dateEl = doc.querySelector(".judgment-header__date");
	
	if (dateEl) {
		dateText = dateEl.textContent;
	} else {
		// Fallback for tribunals: look for "On [Date]" in paragraphs
		var paragraphs = doc.querySelectorAll("p");
		for (var k = 0; k < paragraphs.length; k++) {
			var pTxt = paragraphs[k].textContent;
			if (pTxt.indexOf("On ") > -1 && pTxt.match(/\d{4}/)) {
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
	item.url = url;
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
