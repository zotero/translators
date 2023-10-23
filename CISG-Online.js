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
	"lastUpdated": "2023-10-23 21:05:55"
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

// For sellers, buyers, claimants, respondants (sic) but not history
function getDataBlock(doc, contentName, heading) {
	let blocks = doc.querySelectorAll(`div[data-is-content='${contentName}'] div.is-content`);
	let result = [];
	for (let block of blocks.values()) {
		// TODO: check fragility
		let lines = block.querySelectorAll("div.row > div > div.row");
		let formattedBlock = Array.from(lines.values()).map(function (line) {
			let lineElements = Array.from(line.children).map(c => ZU.trimInternal(c.textContent));
			let value = `${lineElements[0]}: ${lineElements[1]}`;
			return value;
		}).map(line => "\t- " + line)
		.join("\n");
		result.push(formattedBlock);
	}
	return result.map(s => `- ${heading}\n${s}`).join("\n");
}

function getInfoBlock(doc, sectionName) {
	let info = doc.querySelectorAll(`div.${sectionName}-rows > div.row:not([data-has-content]):not([data-is-content])`);
	return Array.from(info).map(function (node) {
		return Array.from(node.querySelectorAll("div")).map(blob => ZU.trimInternal(blob.textContent)).join(": ");
	}).map(line => "- " + line)
	.join("\n");
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
	// +Chamber
	// +Case History

	// Contract
	let contractInfo = getInfoBlock(doc, "contract-information");
	let sellers = getDataBlock(doc, "sellers", "Seller");
	let buyers = getDataBlock(doc, "buyers", "Buyer");
	if (sellers) contractInfo += "\n" + sellers;
	if (buyers) contractInfo += "\n" + buyers;

	// Decision information and comment
	let decisionInfo = getInfoBlock(doc, "decision-information");
	// TODO: add cited cisg-online cases
	let comment = getInfoBlock(doc, "comment");

	let caseFile = doc.querySelector("div[data-is-content='fullTextTranslationFiles'] div.is-content-cases div.row");
	let caseFileName = caseFile ? ZU.trimInternal(caseFile.textContent) : "";
	let caseFileURL = caseFile ? caseFile.querySelector("a").href : "";

	var item = new Z.Item('case');

	item.caseName = caseName;
	item.court = court ? court : tribunal;
	item.country = jurisdiction ? jurisdiction : seat;
	item.dateDecided = date;
	item.docketNumber = docket;
	item.cisgOnline = eprint;

	//if (judges) judgeCleanup(judges).forEach(j => item.creators.push(j));

	if (caseFileName && caseFileURL) {
		item.attachments.push({
			title: caseFileName,
			mimeType: "application/pdf",
			url: caseFileURL
		});
	}

	item.attachments.push({
		url: url,
		title: "CISG-Online Link",
		mimeType: "text/html",
		snapshot: false
	});

	// Building abstract
	let abstract = "";
	if (judges || claimants || respondents) {
		abstract += "## General information:\n";
		if (claimants) abstract += claimants + "\n";
		if (respondents) abstract += respondents + "\n";
		if (judges) abstract += "- Judge(s): " + judges + "\n";
		abstract += "\n";
	}
	abstract += "## Decision information:\n" + decisionInfo + "\n";
	if (contractInfo || sellers || buyers) abstract += "\n## Contract information:\n" + contractInfo + "\n";
	if (comment) abstract += "\n## Comment:\n" + comment;
	//Z.debug(abstract)
	item.abstractNote = abstract;

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
				"dateDecided": "02 October 2023",
				"abstractNote": "## General information:\n- Claimant\n\t- Name: Brands International Corporation\n\t- Place of business: Canada\n\t- Role in transaction: Seller\n- Respondent\n\t- Name: Reach Companies, LLC\n\t- Place of business: USA\n\t- Role in transaction: Buyer\n- Judge(s): John R. Tunheim (District Judge)\n\n## Decision information:\n- CISG applicable: yes, agreement of the parties\n- CISG applied: yes\n- (Domestic) law applied in addition: Minnesota law\n- Key CISG provisions interpreted and applied: Art. 74; Art. 78\n- Non-provision-specific issues addressed: Recoverability of attorneys' fees as damages\n\n## Contract information:\n- Category of goods: 54: Medicinal and pharmaceutical products\n- Goods as per contract: 3,696,766 units of hand sanitizer\n- Price: 89'072.64 USD (U.S. Dollar)\n- Seller\n\t- Name: Brands International Corporation\n\t- Place of business: Canada\n\t- Role in trade: Manufacturer of the goods sold\n- Buyer\n\t- Name: Reach Companies, LLC\n\t- Place of business: USA\n\t- Role in trade: Distributor",
				"court": "U.S. District Court for the District of Minnesota",
				"docketNumber": "21-1026 (JRT/DLM)",
				"attachments": [
					{
						"title": "Full text of decision Original language: English",
						"mimeType": "application/pdf"
					},
					{
						"title": "CISG-Online Link",
						"mimeType": "text/html",
						"snapshot": false
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
		"url": "https://cisg-online.org/search-for-cases",
		"items": "multiple"
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
				"dateDecided": "14 June 2023",
				"abstractNote": "## General information:\n- Judge(s): G. Richard Bevan (Presiding Judge), Robyn Brody (Reporting judge), Colleen Zahn (Judge), Gregory W. Moeller (Judge), John Stegner (Judge)\n\n## Decision information:\n- (Domestic) law applied in addition: Wisconsin law\n- Non-provision-specific issues addressed: Personal injury (allegedly) caused by goods sold under CISG contract\n\n## Comment:\n- Editorial remark: []The only reference to the CISG is found in para. 71 of the decision:\"Fourth, the governing law clause in the Equipment Contract states it «shall be governed and construed according to» the laws of the «State of Wisconsin» and not the provisions of the United Nations Convention on Contracts for the International Sale of Goods («C.I.S.G.»). From the inclusion of this clause, it is reasonable to infer that because this transaction involved a foreign manufacturer (VE) and its United States affiliate (VPS) – the parties cautioned against application of the C.I.S.G. with the understanding that the Equipment Contract was predominantly for the sale of goods. See Fercus, S.R.L. v. Palazzo, No. 98 CIV 7728 (BRB), 2000 WL 1118925, at *3 (S.D.N.Y. Aug. 8, 2000) (explaining that the C.I.S.G. applies when, inter alia, contracting parties have places of business in different nations and the contract omits a choice of law provision).\"[...]",
				"court": "Supreme Court of the State of Idaho",
				"docketNumber": "49473, 49474",
				"attachments": [
					{
						"title": "Full text of decision Original language: English",
						"mimeType": "application/pdf"
					},
					{
						"title": "CISG-Online Link",
						"mimeType": "text/html",
						"snapshot": false
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
		"url": "https://cisg-online.org/search-for-cases?caseId=6714",
		"items": [
			{
				"itemType": "case",
				"caseName": "Organic barley case",
				"creators": [],
				"dateDecided": "13 November 2002",
				"abstractNote": "## General information:\n- Claimant\n\t- Place of business: Belgium\n\t- Role in transaction: Buyer\n- Respondent\n\t- Place of business: Germany\n\t- Role in transaction: Seller\n- Judge(s): Prof. Dr. Motzke (Presiding Judge), von Hofer (Judge), Dr. Ermer (Judge)\n\n## Decision information:\n- CISG applicable: yes, Art. 1(1)(a)\n- Key CISG provisions applied: Art. 35(1); Art. 39(1)\n- CISG provisions also cited: Art. 30; Art. 34; Art. 44\n\n## Contract information:\n- Category of goods: 4: Cereals and cereal preparations\n- Goods as per contract: Organic barley\n- Seller\n\t- Place of business: Germany\n- Buyer\n\t- Place of business: Belgium\n\n## Comment:\n- European Case Law Identifier (ECLI): ECLI:DE:OLGMUEN:2002:1113.27U346.02.0A\n- Case identifier in the old Albert H. Kritzer Database: 021113g1",
				"court": "Oberlandesgericht München (Court of Appeal Munich)",
				"docketNumber": "27 U 346/02",
				"attachments": [
					{
						"title": "Full text of decision Original language: German",
						"mimeType": "application/pdf"
					},
					{
						"title": "CISG-Online Link",
						"mimeType": "text/html",
						"snapshot": false
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
		"url": "https://cisg-online.org/search-for-cases?caseId=7035",
		"items": [
			{
				"itemType": "case",
				"caseName": "Dioctyl phthalate case",
				"creators": [],
				"dateDecided": "16 August 1996",
				"abstractNote": "## General information:\n- Claimant\n\t- Place of business: China\n\t- Role in transaction: Seller\n- Respondent\n\t- Place of business: Korea, Republic of (South Korea)\n\t- Role in transaction: Buyer\n\n## Decision information:\n- CISG applicable: yes, Art. 1(1)(a) and parties' agreement\n- CISG applied: yes\n- Key CISG provisions applied: Art. 74; Art. 75; Art. 77; Art. 78\n- CISG provisions also cited: Art. 18; Art. 35\n\n## Contract information:\n- Category of goods: 51: Organic chemicals\n- Goods as per contract: 768 tons of DOP (dioctyl phthalate)\n- Price: 1'551'360.00 USD (U.S. Dollar)\n- Seller\n\t- Place of business: China\n- Buyer\n\t- Place of business: Korea, Republic of (South Korea)\n\n## Comment:\n- Case identifier in the old Albert H. Kritzer Database: 960730c1",
				"court": "China International Economic & Trade Arbitration Commission (CIETAC)",
				"docketNumber": "CISG/1996/39",
				"attachments": [
					{
						"title": "Translation of decision Language: English",
						"mimeType": "application/pdf"
					},
					{
						"title": "CISG-Online Link",
						"mimeType": "text/html",
						"snapshot": false
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
		"url": "https://cisg-online.org/search-for-cases?caseId=8138",
		"items": [
			{
				"itemType": "case",
				"caseName": "MSS, Inc. v. Maser Corp.",
				"creators": [],
				"dateDecided": "18 July 2011",
				"abstractNote": "## General information:\n- Claimant\n\t- Name: MSS, Inc.\n\t- Place of business: USA\n\t- Role in transaction: Seller\n- Respondent\n\t- Name: Maser Corporation\n\t- Place of business: USA\n\t- Role in transaction: Buyer\n- Judge(s): John T. Nixon (Sole judge)\n\n## Decision information:\n- CISG applicable: left open\n- CISG applied: no, the present decision deals only with the validity of a contractual limitation of liability clause and therefore a matter not governed by the CISG\n- (Domestic) law applied in addition: Tennessee law\n- Key CISG provisions applied: Art. 4\n- CISG provisions also cited: Art. 1(1)(a)\n- Relevant CISG provisions not cited: Art. 10\n\n## Contract information:\n- Category of goods: 72: Machinery specialized for particular industries\n- Goods as per contract: Metalsort machine for the sorting of plastics and metals for material recovery and recycling\n- Seller\n\t- Name: MSS, Inc.\n\t- Place of business: USA\n- Buyer\n\t- Name: Maser Corporation\n\t- Place of business: USA\n- Buyer\n\t- Name: Maser Canada Inc.\n\t- Place of business: Canada\n\n## Comment:\n- Editorial remark by Ulrich G. Schroeter: In the present case, it was disputed whether the sales contract with the U.S. seller MSS, Inc. had been concluded by Maser, Corp. (based in the U.S.) as buyer (meaning that it was a domestic sales contract to which the CISG would not be applicable), or with its wholly-owned subsidiary Maser Canada, Inc. (meaning that it was an international sales contract governed by the CISG in accordance with Art. 1(1)(a)). The Court left the question open and held that the question to be determined by the present order - the validity of a limitation of liability clause found in the contract - was in any case not governed by the CISG, but only by domestic law.\n- Case identifier in the old Albert H. Kritzer Database: 110718u1",
				"court": "U.S. District Court for the District of Maryland",
				"docketNumber": "3:09-cv-00601",
				"attachments": [
					{
						"title": "Full text of decision Original language: English",
						"mimeType": "application/pdf"
					},
					{
						"title": "CISG-Online Link",
						"mimeType": "text/html",
						"snapshot": false
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
