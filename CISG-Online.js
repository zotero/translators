{
	"translatorID": "045d1f03-d17b-4437-9290-d3a4203c4cbc",
	"label": "CISG-Online",
	"creator": "Jonas Zaugg",
	"target": "^https?://cisg-online.org/search-for-cases",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-09-27 20:28:58"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Jonas Zaugg

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
	// TODO: adjust the logic here
	if (url.includes('caseId=')) {
		return 'case';
	}
	else if (url.includes('search-for-cases')) {
		// Only present on search form, not on top 50 pages
		let searchResultsContainer = doc.querySelector('div#searchCaseResult');
		if (searchResultsContainer) Z.monitorDOMChanges(searchResultsContainer);
		if (getSearchResults(doc, true)) {
			return 'multiple';
		}
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	let selector = 'div.search-result div.col-md-10 a.search-result-link';
	var rows = doc.querySelectorAll(selector);
	for (let row of rows) {
		// TODO: check and maybe adjust
		let href = row.href;
		// TODO: check and maybe adjust
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

// Turns a two-item row into a formatted label/value pair
function labellize(row) {
	let segments = row.querySelectorAll("div");
	if (segments.length != 2) {
		Z.debug("Row does not contain exactly 2 elements but " + segments.length);
		return null;
	}

	return "<b>" + ZU.trimInternal(segments[0].textContent) + "</b>: " + ZU.trimInternal(segments[1].textContent);
}

function getRow(doc, sectionName, rowName) {
	// the :not selector is to avoid selecting the drop-down rows
	let selector = `div.${sectionName}-rows div.row:not([data-has-content]):not([data-is-content])`;
	let rows = doc.querySelectorAll(selector);
	let result;
	for (let row of rows.values()) {
		if (row.textContent.includes(rowName)) return row.children[1];
	}
	return result;
}

function getRowText(doc, sectionName, rowName) {
	let row = getRow(doc, sectionName, rowName);
	return row ? ZU.trimInternal(row.textContent) : "";
}

// For sellers, buyers, claimants, respondents but not history
function getDataBlock(doc, selector, label) {
	let blocks = doc.querySelectorAll(`div[data-is-content='${selector}'] div.is-content`);

	if (!blocks.length) return null;

	let result = "";
	for (let block of blocks.values()) {
		result += `<h2>${label}</h2><ul>`;
		// TODO: check fragility
		let rows = block.querySelectorAll("div.row > div > div.row");
		for (let row of rows.values()) result += `<li>${labellize(row)}</li>`;
		result += "</ul>\n";
	}
	Z.debug(result);
	return result;
}

// For sellers, buyers, claimants, respondents but not history
function getCaseHistory(doc) {
	let cases = doc.querySelectorAll(`div[data-is-content='history'] div.is-content-history`);
	if (!cases.length) return null;

	let result = "<h2>Case History</h2><ul>";
	for (let cisgCase of cases.values()) {
		//result += `<li>${labellize(row)}</li>`;
		if (cisgCase.classList.contains('is-this-case')) result += "<li><b>Present decision</b></li>";
		else {
			let caseName = ZU.trimInternal(text(cisgCase, 'div.row'));
			let caseID = cisgCase.getAttribute('id').replace('searchCaseRow_', '');
			let caseURL = `https://cisg-online.org/search-for-cases?caseId=${caseID}`;
			result += `<li><a href="${caseURL}">${caseName}</a></li>`;
		}
	}
	result += "</ul>\n";
	Z.debug(result);
	return result;
}

function getInfoBlock(doc, selector, label) {
	let rows = doc.querySelectorAll(`div.${selector}-rows > div.row:not([data-has-content]):not([data-is-content])`);
	if (!rows.length) return null;

	let result = `<h1>${label}</h1><ul>`;
	for (let row of rows.values()) result += `<li>${labellize(row)}</li>`;
	result += "</ul>";
	return result;
}

function getContentCases(doc, selector) {
	return doc.querySelectorAll(`div[data-is-content='${selector}'] div.is-content-cases`);
}

function addPDFs(doc, item) {
	// Decision or abstract in PDF
	let caseFiles = getContentCases(doc, 'fullTextTranslationFiles');
	for (let caseFile of caseFiles.values()) {
		let caseFileName = ZU.trimInternal(caseFile.textContent);
		Z.debug("Adding case file: " + caseFileName);
		let caseFileAnchor = caseFile.querySelector("a");
		if (caseFileAnchor) {
			item.attachments.push({
				title: caseFileName,
				mimeType: "application/pdf",
				url: caseFileAnchor.href
			});
		}
	}
}

function getCISGCases(doc, selector, label) {
	let cases = getContentCases(doc, selector);
	Z.debug(`${label} ${cases.length} CISG-Online decisions.`);
	if (!cases.length) return null;

	let note = `<h1>${label} ${cases.length} case(s)</h1><ul>`;

	for (let cisgCase of cases.values()) {
		let caseName = ZU.trimInternal(text(cisgCase, 'div.row'));
		let caseID = cisgCase.getAttribute('id').replace('searchCaseRow_', '');
		let caseURL = `https://cisg-online.org/search-for-cases?caseId=${caseID}`;
		note += `<li><a href="${caseURL}">${caseName}</a></li>`;
	}

	note += "</ul>";
	return note;
}

function getCommentExtras(doc, item, selector, label) {
	let extras = getContentCases(doc, selector);
	if (!extras.length) return null;

	let note = `<h2>${label}</h2><ul>`;
	for (let extra of extras.values()) {
		let extraText = ZU.trimInternal(extra.textContent);
		let extraAnchor = extra.querySelector("a");
		
		if (extraAnchor) {
			note += `<li><a href="${extraAnchor.href}">${extraText}</a></li>`;
			item.attachments.push({
				title: label,
				mimeType: "application/pdf",
				url: extraAnchor.href
			});
		}
		else {
			note += `<li>${extraText}</li>`;
		}
	}

	note += "</ul>";
	return note;
}

function addNote(item, note) {
	if (note) item.notes.push({ note: note });
}

// Takes a string of judge names (with role in brackets) and returns a list of authors
/*function judgeCleanup(judges) {
	return judges.split(", ").map(function (judge) {
		let cleanJudge = judge.replace(/\s?\([^)]*\)/, '');
		return ZU.cleanAuthor(cleanJudge, 'author', false);
	});
}*/

async function scrape(doc, url = doc.location.href) {
	// General
	let eprint = getRowText(doc, "general-information", "CISG-online number");
	let caseName = getRowText(doc, "general-information", "Case name");
	let tribunal = getRowText(doc, "general-information", "Arbitral Tribunal");
	let court = getRowText(doc, "general-information", "Court");
	let jurisdiction = getRowText(doc, "general-information", "Jurisdiction");
	let judges = getRowText(doc, "general-information", "Judge"); // Also for Judges
	let seat = getRowText(doc, "general-information", "Seat of the arbitration");
	let date = getRowText(doc, "general-information", "Date of decision");
	let docket = getRowText(doc, "general-information", "Case nr./docket nr.");
	let claimants = getDataBlock(doc, "claimants", "Claimant");
	let respondents = getDataBlock(doc, "respondants", "Respondent"); // sic
	let caseHistory = 	getCaseHistory(doc);
	// +Chamber

	// Contract
	let contractInfo = getInfoBlock(doc, 'contract-information', 'Contract information');
	let sellers = getDataBlock(doc, "sellers", "Seller");
	let buyers = getDataBlock(doc, "buyers", "Buyer");
	if (sellers) contractInfo += sellers;
	if (buyers) contractInfo += buyers;

	// Decision info and comment
	let decisionInfo = getInfoBlock(doc, 'decision-information', 'Decision information');
	let comment = getInfoBlock(doc, 'comment', 'Comments');

	var item = new Z.Item('case');

	item.caseName = caseName;
	item.court = court ? court : tribunal;
	item.country = jurisdiction ? jurisdiction : seat;
	item.dateDecided = ZU.strToISO(date);
	item.docketNumber = docket;
	item["CISG-Online"] = eprint;

	//if (judges) judgeCleanup(judges).forEach(j => item.creators.push(j));

	// Add decision information and comments
	addNote(item, decisionInfo);
	comment = comment ? comment : "<h1>Comments</h1>";
	let publishedIn = getCommentExtras(doc, item, 'publishedIn', 'Decision published in');
	if (publishedIn) comment += publishedIn;
	let decisionComments = getCommentExtras(doc, item, 'decisionComments', 'Comment(s) on this decision');
	if (decisionComments) comment += decisionComments;
	addNote(item, comment);

	// Add notes for CISG-Online cases that this case cites or where this case is cited
	addNote(item, getCISGCases(doc, 'citedCISGs', 'Cites'));
	addNote(item, getCISGCases(doc, 'citedBY', 'Cited by'));

	// Add all abstracts and full-text PDFs
	addPDFs(doc, item);

	item.url = url;

	//item.notes.push({ note: decisionInfo });

	// General information
	if (judges || claimants || respondents || caseHistory) {
		let generalInfo = "<h1>General information</h1>";
		if (claimants) generalInfo += claimants + "\n";
		if (respondents) generalInfo += respondents + "\n";
		if (judges) generalInfo += "<h2>Judge(s)</h2>" + judges + "\n";
		if (caseHistory) generalInfo += caseHistory + "\n";
		addNote(item, generalInfo);
	}

	if (contractInfo || sellers || buyers) addNote(item, contractInfo);

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://cisg-online.org/search-for-cases?caseId=14425",
		"items": [
			{
				"itemType": "case",
				"caseName": "Brands International Corporation v. Reach Companies, LLC",
				"creators": [],
				"dateDecided": "2023-10-02",
				"court": "U.S. District Court for the District of Minnesota",
				"docketNumber": "21-1026 (JRT/DLM)",
				"url": "https://cisg-online.org/search-for-cases?caseId=14425",
				"attachments": [
					{
						"title": "Full text of decision Original language: English",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h1>Decision information</h1><ul><li><b>CISG applicable</b>: yes, agreement of the parties</li><li><b>CISG applied</b>: yes</li><li><b>(Domestic) law applied in addition</b>: Minnesota law</li><li><b>Key CISG provisions interpreted and applied</b>: Art. 74; Art. 78</li><li><b>Non-provision-specific issues addressed</b>: Recoverability of attorneys' fees as damages</li></ul>"
					},
					{
						"note": "<h1>Comments</h1><h2>Decision published in</h2><ul><li>2023 Westlaw (WL) 6391830 [Full text – in English]</li></ul>"
					},
					{
						"note": "<h1>Cites 4 case(s)</h1><ul><li><a href=\"https://cisg-online.org/search-for-cases?caseId=14193\">Brands International Corporation v. Reach Companies, LLC U.S. District Court for the District of Minnesota USA, 11 April 2023 – 0:2021cv01026, CISG-online 6279</a></li><li><a href=\"https://cisg-online.org/search-for-cases?caseId=13961\">Goodman Food Products, Inc. v. Sunrise Foods Int'l Inc. U.S. District Court for the Central District of California USA, 01 June 2022 – 2:21-cv-06518-SB-ADS, CISG-online 6047</a></li><li><a href=\"https://cisg-online.org/search-for-cases?caseId=13599\">Hefei Ziking Steel Pipe Co., Ltd. v. Meever & Meever et al. U.S. District Court for the Southern District of Texas USA, 20 September 2021 – 4:20-CV-00425, CISG-online 5685</a></li><li><a href=\"https://cisg-online.org/search-for-cases?caseId=7356\">Travelers Property Casualty Co. v. Saint-Gobain Technical Fabrics Canada Ltd U.S. District Court for the District of Minnesota USA, 31 January 2007 – Civ. 04-4386 ADM/AJB, CISG-online 1435</a></li></ul>"
					},
					{
						"note": "<h1>General information</h1><h2>Claimant</h2><ul><li><b>Name</b>: Brands International Corporation</li><li><b>Place of business</b>: Canada</li><li><b>Role in transaction</b>: Seller</li></ul>\n\n<h2>Respondent</h2><ul><li><b>Name</b>: Reach Companies, LLC</li><li><b>Place of business</b>: USA</li><li><b>Role in transaction</b>: Buyer</li></ul>\n\n<h2>Judge(s)</h2>John R. Tunheim (District Judge)\n<h2>Case History</h2><ul><li><a href=\"https://cisg-online.org/search-for-cases?caseId=14193\">Brands International Corporation v. Reach Companies, LLC U.S. District Court for the District of Minnesota USA, 11 April 2023 – 0:2021cv01026, CISG-online 6279</a></li><li><b>Present decision</b></li><li><a href=\"https://cisg-online.org/search-for-cases?caseId=14920\">Brands International Corporation v. Reach Companies, LLC U.S. Court of Appeals (8th Circuit) USA, 30 May 2024 – 23-2164, CISG-online 7006 affirming in part, reversing in part</a></li></ul>\n\n"
					},
					{
						"note": "<h1>Contract information</h1><ul><li><b>Category of goods</b>: 54: Medicinal and pharmaceutical products</li><li><b>Goods as per contract</b>: 3,696,766 units of hand sanitizer</li><li><b>Price</b>: 89'072.64 USD (U.S. Dollar)</li></ul><h2>Seller</h2><ul><li><b>Name</b>: Brands International Corporation</li><li><b>Place of business</b>: Canada</li><li><b>Role in trade</b>: Manufacturer of the goods sold</li></ul>\n<h2>Buyer</h2><ul><li><b>Name</b>: Reach Companies, LLC</li><li><b>Place of business</b>: USA</li><li><b>Role in trade</b>: Distributor</li></ul>\n"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://cisg-online.org/search-for-cases/50-most-recently-added-cases",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://cisg-online.org/search-for-cases?caseId=14276",
		"items": [
			{
				"itemType": "case",
				"caseName": "Alcala v. Verbruggen Palletizing Solutions, Inc.",
				"creators": [],
				"dateDecided": "2023-06-14",
				"court": "Supreme Court of the State of Idaho",
				"docketNumber": "49473, 49474",
				"url": "https://cisg-online.org/search-for-cases?caseId=14276",
				"attachments": [
					{
						"title": "Full text of decision Original language: English",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h1>Decision information</h1><ul><li><b>(Domestic) law applied in addition</b>: Wisconsin law</li><li><b>Non-provision-specific issues addressed</b>: Personal injury (allegedly) caused by goods sold under CISG contract</li></ul>"
					},
					{
						"note": "<h1>Comments</h1><ul><li><b>Editorial remark</b>: []The only reference to the CISG is found in para. 71 of the decision:\"Fourth, the governing law clause in the Equipment Contract states it «shall be governed and construed according to» the laws of the «State of Wisconsin» and not the provisions of the United Nations Convention on Contracts for the International Sale of Goods («C.I.S.G.»). From the inclusion of this clause, it is reasonable to infer that because this transaction involved a foreign manufacturer (VE) and its United States affiliate (VPS) – the parties cautioned against application of the C.I.S.G. with the understanding that the Equipment Contract was predominantly for the sale of goods. See Fercus, S.R.L. v. Palazzo, No. 98 CIV 7728 (BRB), 2000 WL 1118925, at *3 (S.D.N.Y. Aug. 8, 2000) (explaining that the C.I.S.G. applies when, inter alia, contracting parties have places of business in different nations and the contract omits a choice of law provision).\"[...]</li></ul><h2>Decision published in</h2><ul><li>531 Pacific Reporter, Third Series (P.3d) 1085 [Full text – in English]</li><li>2023 Westlaw (WL) 3985206 [Full text – in English]</li></ul>"
					},
					{
						"note": "<h1>Cites 1 case(s)</h1><ul><li><a href=\"https://cisg-online.org/search-for-cases?caseId=6551\">Fercus S.r.l. v. Palazzo et al. U.S. District Court for the Southern District of New York USA, 08 August 2000 – 98 Civ. 7728, CISG-online 588</a></li></ul>"
					},
					{
						"note": "<h1>General information</h1><h2>Judge(s)</h2>G. Richard Bevan (Presiding Judge), Robyn Brody (Reporting judge), Colleen Zahn (Judge), Gregory W. Moeller (Judge), John Stegner (Judge)\n"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://cisg-online.org/search-for-cases?caseId=6714",
		"items": [
			{
				"itemType": "case",
				"caseName": "Organic barley case",
				"creators": [],
				"dateDecided": "2002-11-13",
				"court": "Oberlandesgericht München (Court of Appeal Munich)",
				"docketNumber": "27 U 346/02",
				"url": "https://cisg-online.org/search-for-cases?caseId=6714",
				"attachments": [
					{
						"title": "Comment(s) on this decision",
						"mimeType": "application/pdf"
					},
					{
						"title": "Full text of decision Original language: German",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h1>Decision information</h1><ul><li><b>CISG applicable</b>: yes, Art. 1(1)(a)</li><li><b>Key CISG provisions applied</b>: Art. 35(1); Art. 39(1)</li><li><b>CISG provisions also cited</b>: Art. 30; Art. 34; Art. 44</li></ul>"
					},
					{
						"note": "<h1>Comments</h1><ul><li><b>European Case Law Identifier (ECLI)</b>: ECLI:DE:OLGMUEN:2002:1113.27U346.02.0A</li><li><b>Case identifier in the old Albert H. Kritzer Database</b>: 021113g1</li></ul><h2>Decision published in</h2><ul><li>Neue Juristische Wochenschrift – Rechtsprechungs-Report (NJW-RR) (2003), 849–850 [Full text – in German]</li><li>Juristische Schulung (JuS) (2003), 1134 [Leitsatz (headnote) – in German]</li></ul><h2>Comment(s) on this decision</h2><ul><li>Gerhard Hohloch, 'OLG München: „Bio”-Konformität unter UN-Kaufrecht - Ökologischer Landbau', Juristische Schulung (JuS) (2003), 1134–1135 [– in German]</li><li><a href=\"https://cisg-online.org/files/commentFiles/Latifah_Bajrektarevic_Salsabila_10-2_HasanuddinLRev_2024_171.pdf\">Emmy Latifah, Anis H. Bajrektarevic & Dini Kartika Salsabila, 'Suspicion on the Non-conformity of the Goods as a Foundation of Breach of International Sales Contract', 10(2) Hasanuddin Law Review (2024), 171–188, at 175–176 [– in English]</a></li></ul>"
					},
					{
						"note": "<h1>Cited by 1 case(s)</h1><ul><li><a href=\"https://cisg-online.org/search-for-cases?caseId=8382\">\"Bio Suisse\" certified organic juices and oils case Handelsgericht des Kantons St. Gallen (Commercial Court Canton St. Gallen) Switzerland, 14 June 2012 – HG.2010.421-HGK, CISG-online 2468</a></li></ul>"
					},
					{
						"note": "<h1>General information</h1><h2>Claimant</h2><ul><li><b>Place of business</b>: Belgium</li><li><b>Role in transaction</b>: Buyer</li></ul>\n\n<h2>Respondent</h2><ul><li><b>Place of business</b>: Germany</li><li><b>Role in transaction</b>: Seller</li></ul>\n\n<h2>Judge(s)</h2>Prof. Dr. Motzke (Presiding Judge), von Hofer (Judge), Dr. Ermer (Judge)\n<h2>Case History</h2><ul><li><a href=\"https://cisg-online.org/search-for-cases?caseId=9125\">Organic barley case Landgericht Augsburg (District Court Augsburg) Germany, 15 April 2002 – 3 O 3379/01, CISG-online 3211</a></li><li><b>Present decision</b></li></ul>\n\n"
					},
					{
						"note": "<h1>Contract information</h1><ul><li><b>Category of goods</b>: 4: Cereals and cereal preparations</li><li><b>Goods as per contract</b>: Organic barley</li></ul><h2>Seller</h2><ul><li><b>Place of business</b>: Germany</li></ul>\n<h2>Buyer</h2><ul><li><b>Place of business</b>: Belgium</li></ul>\n"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://cisg-online.org/search-for-cases?caseId=7035",
		"items": [
			{
				"itemType": "case",
				"caseName": "Dioctyl phthalate case",
				"creators": [],
				"dateDecided": "1996-08-16",
				"court": "China International Economic & Trade Arbitration Commission (CIETAC)",
				"docketNumber": "CISG/1996/39",
				"url": "https://cisg-online.org/search-for-cases?caseId=7035",
				"attachments": [
					{
						"title": "Translation of decision Language: English translated by Meihua Xu",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h1>Decision information</h1><ul><li><b>CISG applicable</b>: yes, Art. 1(1)(a) and parties' agreement</li><li><b>CISG applied</b>: yes</li><li><b>Key CISG provisions applied</b>: Art. 74; Art. 75; Art. 77; Art. 78</li><li><b>CISG provisions also cited</b>: Art. 18; Art. 35</li></ul>"
					},
					{
						"note": "<h1>Comments</h1><ul><li><b>Case identifier in the old Albert H. Kritzer Database</b>: 960730c1</li></ul>"
					},
					{
						"note": "<h1>General information</h1><h2>Claimant</h2><ul><li><b>Place of business</b>: China</li><li><b>Role in transaction</b>: Seller</li></ul>\n\n<h2>Respondent</h2><ul><li><b>Place of business</b>: Korea, Republic of (South Korea)</li><li><b>Role in transaction</b>: Buyer</li></ul>\n\n"
					},
					{
						"note": "<h1>Contract information</h1><ul><li><b>Category of goods</b>: 51: Organic chemicals</li><li><b>Goods as per contract</b>: 768 tons of DOP (dioctyl phthalate)</li><li><b>Price</b>: 1'551'360.00 USD (U.S. Dollar)</li></ul><h2>Seller</h2><ul><li><b>Place of business</b>: China</li></ul>\n<h2>Buyer</h2><ul><li><b>Place of business</b>: Korea, Republic of (South Korea)</li></ul>\n"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://cisg-online.org/search-for-cases?caseId=8138",
		"items": [
			{
				"itemType": "case",
				"caseName": "MSS, Inc. v. Maser Corp.",
				"creators": [],
				"dateDecided": "2011-07-18",
				"court": "U.S. District Court for the District of Maryland",
				"docketNumber": "3:09-cv-00601",
				"url": "https://cisg-online.org/search-for-cases?caseId=8138",
				"attachments": [
					{
						"title": "Full text of decision Original language: English",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h1>Decision information</h1><ul><li><b>CISG applicable</b>: left open</li><li><b>CISG applied</b>: no, the present decision deals only with the validity of a contractual limitation of liability clause and therefore a matter not governed by the CISG</li><li><b>(Domestic) law applied in addition</b>: Tennessee law</li><li><b>Key CISG provisions applied</b>: Art. 4</li><li><b>CISG provisions also cited</b>: Art. 1(1)(a)</li><li><b>Relevant CISG provisions not cited</b>: Art. 10</li></ul>"
					},
					{
						"note": "<h1>Comments</h1><ul><li><b>Editorial remark by Ulrich G. Schroeter</b>: In the present case, it was disputed whether the sales contract with the U.S. seller MSS, Inc. had been concluded by Maser, Corp. (based in the U.S.) as buyer (meaning that it was a domestic sales contract to which the CISG would not be applicable), or with its wholly-owned subsidiary Maser Canada, Inc. (meaning that it was an international sales contract governed by the CISG in accordance with Art. 1(1)(a)). The Court left the question open and held that the question to be determined by the present order - the validity of a limitation of liability clause found in the contract - was in any case not governed by the CISG, but only by domestic law.</li><li><b>Case identifier in the old Albert H. Kritzer Database</b>: 110718u1</li></ul><h2>Comment(s) on this decision</h2><ul><li>Gregory M. Duhl, 'International Sale of Goods', 67 Business Lawyer (Bus. Law.) (2012), 1337–1349, at 1346–1347 [– in English]</li></ul>"
					},
					{
						"note": "<h1>Cites 3 case(s)</h1><ul><li><a href=\"https://cisg-online.org/search-for-cases?caseId=7522\">Barbara Berry, S.A. de C.V. v. Ken M. Spooner Farms, Inc. U.S. Court of Appeals (9th Circuit) USA, 08 November 2007 – 06-35398, CISG-online 1603</a></li><li><a href=\"https://cisg-online.org/search-for-cases?caseId=7276\">Barbara Berry, S.A. de C.V. v. Ken M. Spooner Farms, Inc. U.S. District Court for the Western District of Washington USA, 13 April 2006 – C05-5538FDB, CISG-online 1354</a></li><li><a href=\"https://cisg-online.org/search-for-cases?caseId=6607\">Geneva Pharmaceuticals Technology Corp. v. Barr Laboratories, Inc. U.S. District Court for the Southern District of New York USA, 21 August 2002 – 98 CIV 861 RWS, 99 CIV 3607 RWS, CISG-online 664</a></li></ul>"
					},
					{
						"note": "<h1>General information</h1><h2>Claimant</h2><ul><li><b>Name</b>: MSS, Inc.</li><li><b>Place of business</b>: USA</li><li><b>Role in transaction</b>: Seller</li></ul>\n\n<h2>Respondent</h2><ul><li><b>Name</b>: Maser Corporation</li><li><b>Place of business</b>: USA</li><li><b>Role in transaction</b>: Buyer</li></ul>\n\n<h2>Judge(s)</h2>John T. Nixon (Sole judge)\n"
					},
					{
						"note": "<h1>Contract information</h1><ul><li><b>Category of goods</b>: 72: Machinery specialized for particular industries</li><li><b>Goods as per contract</b>: Metalsort machine for the sorting of plastics and metals for material recovery and recycling</li></ul><h2>Seller</h2><ul><li><b>Name</b>: MSS, Inc.</li><li><b>Place of business</b>: USA</li></ul>\n<h2>Buyer</h2><ul><li><b>Name</b>: Maser Corporation</li><li><b>Place of business</b>: USA</li></ul>\n<h2>Buyer</h2><ul><li><b>Name</b>: Maser Canada Inc.</li><li><b>Place of business</b>: Canada</li></ul>\n"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://cisg-online.org/search-for-cases?caseId=14193",
		"items": [
			{
				"itemType": "case",
				"caseName": "Brands International Corporation v. Reach Companies, LLC",
				"creators": [],
				"dateDecided": "2023-04-11",
				"court": "U.S. District Court for the District of Minnesota",
				"docketNumber": "0:2021cv01026",
				"url": "https://cisg-online.org/search-for-cases?caseId=14193",
				"attachments": [
					{
						"title": "Full text of decision Original language: English",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<h1>Decision information</h1><ul><li><b>CISG applicable</b>: yes, Art. 1(1)(a)</li><li><b>(Domestic) law applied in addition</b>: Minnesota law</li><li><b>Key CISG provisions interpreted</b>: Art. 7(1); Art. 74</li><li><b>Key CISG provisions applied</b>: Art. 1(1)(a); Art. 54; Art. 59; Art. 64; Art. 73(2); Art. 78</li><li><b>CISG provisions also cited</b>: Art. 7(2); Art. 14(1); Art. 18(1); Art. 23; Art. 25; Art. 33; Art. 71(1)</li><li><b>Non-provision-specific issues addressed</b>: Recoverability of attorneys' fees as damages</li></ul>"
					},
					{
						"note": "<h1>Comments</h1><ul><li><b>Editorial remark by Ulrich G. Schroeter</b>: In the present decision about a dispute arising from a sales contract between a Canadian seller (Claimant) and a U.S. buyer, the U.S. District Court for the District of Minnesota inter alia held (in paras. 38–44) that compensation for the attorneys’ fees incurred could be claimed by the Canadian seller as damages under Art. 74 CISG. The District Court thereby deviated from the U.S. Court of Appeal (7th Cir.)’s well-known decision in the Zapata case (CISG-online 684):„Whether the CISG contemplates the inclusion of attorney’s fees in the measure of damages is an issue of first impression in the Eighth Circuit. Though the Seventh Circuit has held that the CISG Article 74 does not include an award of attorney’s fees, the Court finds the Seventh Circuit’s analysis unpersuasive and will not apply it here. …“ [Further reasoning follows.]</li></ul>"
					},
					{
						"note": "<h1>Cites 5 case(s)</h1><ul><li><a href=\"https://cisg-online.org/search-for-cases?caseId=8172\">Dingxi Longhai Dairy, Ltd. v. Becwood Technology Group L.L.C. U.S. Court of Appeals (8th Circuit) USA, 14 February 2011 – 10-2612, CISG-online 2256</a></li><li><a href=\"https://cisg-online.org/search-for-cases?caseId=7356\">Travelers Property Casualty Co. v. Saint-Gobain Technical Fabrics Canada Ltd U.S. District Court for the District of Minnesota USA, 31 January 2007 – Civ. 04-4386 ADM/AJB, CISG-online 1435</a></li><li><a href=\"https://cisg-online.org/search-for-cases?caseId=6931\">Caterpillar, Inc. et al. v. Usinor Industeel et al. U.S. District Court for the Northern District of Illinois USA, 30 March 2005 – 04 C 2474, CISG-online 1007</a></li><li><a href=\"https://cisg-online.org/search-for-cases?caseId=6625\">Zapata Hermanos Sucesores, S.A. v. Hearthside Baking Comp. U.S. Court of Appeals (7th Circuit) USA, 19 November 2002 – 01-3402, 02-1867, 02-1915, CISG-online 684</a></li><li><a href=\"https://cisg-online.org/search-for-cases?caseId=6118\">Delchi Carrier, SpA v. Rotorex Corp. U.S. Court of Appeals (2nd Circuit) USA, 06 December 1995 – 95-7182, 95-7186, CISG-online 140</a></li></ul>"
					},
					{
						"note": "<h1>Cited by 1 case(s)</h1><ul><li><a href=\"https://cisg-online.org/search-for-cases?caseId=14425\">Brands International Corporation v. Reach Companies, LLC U.S. District Court for the District of Minnesota USA, 02 October 2023 – 21-1026 (JRT/DLM), CISG-online 6511</a></li></ul>"
					},
					{
						"note": "<h1>General information</h1><h2>Claimant</h2><ul><li><b>Name</b>: Brands International Corporation</li><li><b>Place of business</b>: Canada</li><li><b>Role in transaction</b>: Seller</li></ul>\n\n<h2>Respondent</h2><ul><li><b>Name</b>: Reach Companies, LLC</li><li><b>Place of business</b>: USA</li><li><b>Role in transaction</b>: Buyer</li></ul>\n\n<h2>Judge(s)</h2>John R. Tunheim (Sole judge)\n<h2>Case History</h2><ul><li><b>Present decision</b></li><li><a href=\"https://cisg-online.org/search-for-cases?caseId=14425\">Brands International Corporation v. Reach Companies, LLC U.S. District Court for the District of Minnesota USA, 02 October 2023 – 21-1026 (JRT/DLM), CISG-online 6511</a></li><li><a href=\"https://cisg-online.org/search-for-cases?caseId=14920\">Brands International Corporation v. Reach Companies, LLC U.S. Court of Appeals (8th Circuit) USA, 30 May 2024 – 23-2164, CISG-online 7006 affirming in part, reversing in part</a></li></ul>\n\n"
					},
					{
						"note": "<h1>Contract information</h1><ul><li><b>Category of goods</b>: 54: Medicinal and pharmaceutical products</li><li><b>Goods as per contract</b>: 3,696,766 units of hand sanitizer</li><li><b>Price</b>: 89'072.64 USD (U.S. Dollar)</li></ul><h2>Seller</h2><ul><li><b>Name</b>: Brands International Corporation</li><li><b>Place of business</b>: Canada</li><li><b>Role in trade</b>: Manufacturer of the goods sold</li></ul>\n<h2>Buyer</h2><ul><li><b>Name</b>: Reach Companies, LLC</li><li><b>Place of business</b>: USA</li><li><b>Role in trade</b>: Distributor</li></ul>\n"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
