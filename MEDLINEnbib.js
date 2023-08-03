{
	"translatorID": "9ec64cfd-bea7-472a-9557-493c0c26b0fb",
	"label": "MEDLINE/nbib",
	"creator": "Sebastian Karcher",
	"target": "txt",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 1,
	"lastUpdated": "2023-06-09 02:21:30"
}

/*
	***** BEGIN LICENSE BLOCK *****

	MEDLINE/nbib import translator
	(Based on http://www.nlm.nih.gov/bsd/mms/medlineelements.html)
	Copyright © 2014-15 Sebastian Karcher

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

function detectImport() {
	var line;
	var i = 0;
	while ((line = Zotero.read()) !== false) {
		line = line.replace(/^\s+/, "");
		if (line != "") {
			// Actual MEDLINE format starts with PMID
			// ERIC .nbib starts with "OWN -  ERIC"
			if (line.substr(0, 6).match(/^PMID( {1, 2})?- /) || line.includes("OWN - ERIC")) {
				return true;
			}
			else if (i++ > 3) {
				return false;
			}
		}
	}
	return false;
}

var fieldMap = {
	TI: "title",
	VI: "volume",
	IP: "issue",
	PL: "place",
	PB: "publisher", // not in the specs, but is used
	BTI: "bookTitle",
	JT: "publicationTitle",
	TA: "journalAbbreviation",
	PG: "pages",
	CI: "rights",
	ISBN: "ISBN",
	ISSN: "ISSN",
	LA: "language",
	EN: "edition",
	AB: "abstractNote"
};


// Only the most basic types. Most official MEDLINE types make little sense as item types
var inputTypeMap = {
	Book: "book",
	Books: "book", // ERIC
	"Book Chapter": "bookSection", // can't find in specs, but is used.
	"Case Reports": "journalArticle", // Case reports in medicine are basically always in journals
	"Case Report": "journalArticle",
	"Journal Article": "journalArticle",
	"Newspaper Article": "newspaperArticle",
	"Video-Audio Media": "videoRecording",
	"Technical Report": "report",
	"Legal Case": "case",
	Preprint: "preprint",
	Legislation: "statute"
};

function processTag(item, tag, value) {
	value = Zotero.Utilities.trim(value);
	var type;

	if (fieldMap[tag]) {
		item[fieldMap[tag]] = value;
	}
	else if (tag == "PT") {
		if (inputTypeMap[value]) { // first check inputTypeMap
			item.itemType = inputTypeMap[value];
		}
		else if (value.includes("Dissertation")) {
			item.itemType = "thesis";
		}
		else if (value.includes("Report")) {
			// ERIC nbib has multiple PT tags; Reports can also be other item types
			// so we're only using this as a fallback
			item.itemTypeBackup = "report";
		}
	}
	else if (tag == "FAU" || tag == "FED") {
		if (tag == "FAU") {
			type = "author";
		}
		else if (tag == "FED") {
			type = "editor";
		}
		item.creators.push(Zotero.Utilities.cleanAuthor(value, type, value.includes(",")));
	}
	else if (tag == "AU" || tag == "ED") { // save normal author tags as fallback
		if (tag == "AU") {
			type = "author";
		}
		else if (tag == "ED") {
			type = "editor";
		}
		value = value.replace(/\s([A-Z]+)$/, ", $1");
		item.creatorsBackup.push(Zotero.Utilities.cleanAuthor(value, type, value.includes(",")));
	}
	else if (tag == "OID" && /E[JD]\d+/.test(value)) {
		item.extra = "ERIC Number: " + value;
	}
	else if (tag == "PMID") {
		item.extra = "PMID: " + value;
	}
	else if (tag == "PMC") {
		item.extra += " \nPMCID: " + value;
	}
	else if (tag == "IS") {
		if (ZU.cleanISSN(value)) {
			if (!item.ISSN) {
				item.ISSN = ZU.cleanISSN(value);
			}
			else {
				item.ISSN += " " + ZU.cleanISSN(value);
			}
		}
		else if (ZU.cleanISBN(value)) {
			if (!item.ISBN) {
				item.ISBN = ZU.cleanISBN(value);
			}
			else {
				item.ISBN += " " + ZU.cleanISBN(value);
			}
		}
	}
	else if (tag == "AID") {
		if (value.includes("[doi]")) item.DOI = value.replace(/\s*\[doi\]/, "");
	}
	else if (tag == "DP") {
		item.date = value;
	}
	else if (tag == "SO") {
		item.citation = value;
	}

	// Save link to attached link
	else if (tag == "LID") {
		// Pubmed adds all sorts of different IDs in here, so make sure these are URLs
		if (value.startsWith("http")) {
			item.attachments.push({ url: value, title: "Catalog Link", snapshot: false });
		// If the value is tagged as a PII, we can use this as a page number if we have not previously managed to extract one
		}
		else if (value.includes("[pii]")) item.pagesBackup = value.replace(/\s*\[pii\]/, "");
	}
	else if (tag == "MH" || tag == "OT" || tag == "KW") { // KoreaMed uses KW
		item.tags.push(value);
	}
}

function doImport() {
	var line = true;
	var tag = false;
	var data = false;
	do { // first valid line is type
		Zotero.debug("ignoring " + line);
		line = Zotero.read();
	} while (line !== false && !(/^[A-Z0-9]+\s*-/.test(line)));

	var item = new Zotero.Item();
	item.creatorsBackup = [];
	tag = line.match(/^[A-Z0-9]+/)[0];
	data = line.substr(line.indexOf("-") + 1);
	while ((line = Zotero.read()) !== false) { // until EOF
		if (!line) {
			if (tag) {
				processTag(item, tag, data);
				// unset info
				tag = data = false;
				// new item
				finalizeItem(item);
				item = new Zotero.Item();
				item.creatorsBackup = [];
			}
		}
		else if (/^[A-Z0-9]+\s*-/.test(line)) {
			// if this line is a tag, take a look at the previous line to map
			// its tag
			if (tag) {
				processTag(item, tag, data);
			}

			// then fetch the tag and data from this line
			tag = line.match(/^[A-Z0-9]+/)[0];
			data = line.substr(line.indexOf("-") + 1).trim();
		}
		else if (tag) {
			// otherwise, assume this is data from the previous line continued
			data += " " + line.replace(/^\s+/, "");
		}
	}

	if (tag) { // save any unprocessed tags
		processTag(item, tag, data);
		// and finalize with some post-processing
		finalizeItem(item);
	}
}

function finalizeItem(item) {
	// if we didn't get full authors (included post 2002, sub in the basic authors)
	if (item.creators.length == 0 && item.creatorsBackup.length > 0) {
		item.creators = item.creatorsBackup;
	}
	delete item.creatorsBackup;
	if (item.pages) {
		// where page ranges are given in an abbreviated format, convert to full
		// taken verbatim from NCBI Pubmed translator
		var pageRangeRE = /(\d+)-(\d+)/g;
		pageRangeRE.lastIndex = 0;
		var range;

		while (range = pageRangeRE.exec(item.pages)) { // eslint-disable-line no-cond-assign
			var pageRangeStart = range[1];
			var pageRangeEnd = range[2];
			var diff = pageRangeStart.length - pageRangeEnd.length;
			if (diff > 0) {
				pageRangeEnd = pageRangeStart.substring(0, diff) + pageRangeEnd;
				var newRange = pageRangeStart + "-" + pageRangeEnd;
				var fullPageRange = item.pages.substring(0, range.index) // everything before current range
					+ newRange	// insert the new range
					+ item.pages.substring(range.index + range[0].length);	// everything after the old range
				// adjust RE index
				pageRangeRE.lastIndex += newRange.length - range[0].length;
			}
		}
		if (fullPageRange) {
			item.pages = fullPageRange;
		}
	// If there is not an explicitly defined page range, try and use the value extracted from the LID field
	}
	else if (item.pagesBackup) item.pages = item.pagesBackup;
	delete item.pagesBackup;

	// check for and remove duplicate ISSNs
	if (item.ISSN && item.ISSN.includes(" ")) {
		let ISSN = item.ISSN.split(/\s/);
		// convert to Set and back
		ISSN = [...new Set(ISSN)];
		item.ISSN = ISSN.join(" ");
	}
	else if (item.ISSN) {
		item.ISSN = ZU.cleanISSN(item.ISSN.replace(/E?ISSN-/, ""));
	}
	if (item.ISBN) {
		item.ISBN = ZU.cleanISBN(item.ISBN.replace("ISBN-", ""));
	}
	
	if (item.itemType == "book") {
		item.publisher = item.publicationTitle;
		delete item.publicationTitle;
	}
	else if (item.itemType == "thesis") {
		if (item.citation && /,[^,]+ University/.test(item.citation)) {
			// Get the University as good as we can
			item.university = item.citation.match(/,\s*([^,]+ University)/)[1];
		}
		item.archive = item.publicationTitle; // Typically ProQuest here
		delete item.publicationTitle;
	}
	else if (!item.itemType) {
		if (item.itemTypeBackup && (!item.extra || !item.extra.includes("ERIC Number: EJ"))) {
			item.itemType = item.itemTypeBackup; // using report from above
			item.institution = item.publicationTitle;
			delete item.publicationTitle;
		}
		else {
			item.itemType = "journalArticle"; 	// journal article is the fallback item type
		}
	}

	delete item.citation;
	delete item.itemTypeBackup;
	// titles for books are mapped to bookTitle
	if (item.itemType == "book") item.title = item.bookTitle;
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "PMID- 000000000000\nOWN - NLM\nSTAT- In-Process\nLR  - 20200715\nTI  - Mickey Mouse had an \n      O-some day!\nAB  - Mickey Mouse had a quiet day until something happened and\n      SAMD9L was caught in the end. \nFAU - Mouse, Mickey\nAU  - Mouse M",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Mickey Mouse had an O-some day!",
				"creators": [
					{
						"firstName": "Mickey",
						"lastName": "Mouse",
						"creatorType": "author"
					}
				],
				"abstractNote": "Mickey Mouse had a quiet day until something happened and SAMD9L was caught in the end.",
				"extra": "PMID: 000000000000",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "PMID- 8692918\nOWN - NLM\nSTAT- MEDLINE\nDA  - 19960829\nDCOM- 19960829\nLR  - 20131121\nIS  - 0027-8424 (Print)\nIS  - 0027-8424 (Linking)\nVI  - 93\nIP  - 14\nDP  - 1996 Jul 9\nTI  - The structure of bovine F1-ATPase complexed with the antibiotic inhibitor\n      aurovertin B.\nPG  - 6913-7\nAB  - In the structure of bovine mitochondrial F1-ATPase that was previously determined\n      with crystals grown in the presence of adenylyl-imidodiphosphate (AMP-PNP) and\n      ADP, the three catalytic beta-subunits have different conformations and\n      nucleotide occupancies. Adenylyl-imidodiphosphate is bound to one beta-subunit\n      (betaTP), ADP is bound to the second (betaDP), and no nucleotide is bound to the \n      third (betaE). Here we show that the uncompetitive inhibitor aurovertin B binds\n      to bovine F1 at two equivalent sites in betaTP and betaE, in a cleft between the \n      nucleotide binding and C-terminal domains. In betaDP, the aurovertin B pocket is \n      incomplete and is inaccessible to the inhibitor. The aurovertin B bound to betaTP\n      interacts with alpha-Glu399 in the adjacent alphaTP subunit, whereas the\n      aurovertin B bound to betaE is too distant from alphaE to make an equivalent\n      interaction. Both sites encompass betaArg-412, which was shown by mutational\n      studies to be involved in binding aurovertin. Except for minor changes around the\n      aurovertin pockets, the structure of bovine F1-ATPase is the same as determined\n      previously. Aurovertin B appears to act by preventing closure of the catalytic\n      interfaces, which is essential for a catalytic mechanism involving cyclic\n      interconversion of catalytic sites.\nFAU - van Raaij, M J\nAU  - van Raaij MJ\nAD  - Medical Research Council Laboratory of Molecular Biology, Cambridge, United\n      Kingdom.\nFAU - Abrahams, J P\nAU  - Abrahams JP\nFAU - Leslie, A G\nAU  - Leslie AG\nFAU - Walker, J E\nAU  - Walker JE\nLA  - eng\nPT  - Journal Article\nPT  - Research Support, Non-U.S. Gov't\nPL  - UNITED STATES\nTA  - Proc Natl Acad Sci U S A\nJT  - Proceedings of the National Academy of Sciences of the United States of America\nJID - 7505876\nRN  - 0 (Aurovertins)\nRN  - 0 (Enzyme Inhibitors)\nRN  - 0 (Macromolecular Substances)\nRN  - 25612-73-1 (Adenylyl Imidodiphosphate)\nRN  - 3KX376GY7L (Glutamic Acid)\nRN  - 55350-03-3 (aurovertin B)\nRN  - 94ZLA3W45F (Arginine)\nRN  - EC 3.6.3.14 (Proton-Translocating ATPases)\nSB  - IM\nMH  - Adenylyl Imidodiphosphate/pharmacology\nMH  - Animals\nMH  - Arginine\nMH  - Aurovertins/*chemistry/*metabolism\nMH  - Binding Sites\nMH  - Cattle\nMH  - Crystallography, X-Ray\nMH  - Enzyme Inhibitors/chemistry/metabolism\nMH  - Glutamic Acid\nMH  - Macromolecular Substances\nMH  - Models, Molecular\nMH  - Molecular Structure\nMH  - Myocardium/enzymology\nMH  - *Protein Structure, Secondary\nMH  - Proton-Translocating ATPases/*chemistry/*metabolism\nPMC - PMC38908\nOID - NLM: PMC38908\nEDAT- 1996/07/09\nMHDA- 1996/07/09 00:01\nCRDT- 1996/07/09 00:00\nPST - ppublish\nSO  - Proc Natl Acad Sci U S A. 1996 Jul 9;93(14):6913-7.\n\nPMID- 21249755\nSTAT- Publisher\nDA  - 20110121\nDRDT- 20080809\nCTDT- 20080718\nPB  - National Center for Biotechnology Information (US)\nDP  - 2009\nTI  - Peutz-Jeghers Syndrome\nBTI - Cancer Syndromes\nAB  - PJS is a rare disease. (\"Peutz-Jeghers syndrome is no frequent nosological unit\".\n      (1)) There are no high-quality estimates of the prevalence or incidence of PJS.\n      Estimates have included 1 in 8,500 to 23,000 live births (2), 1 in 50,000 to 1 in\n      100,000 in Finland (3), and 1 in 200,000 (4). A report on the incidence of PJS is\n      available at www.peutz-jeghers.com. At Mayo Clinic from 1945 to 1996 the\n      incidence of PJS was 0.9 PJS patients per 100,000 patients. PJS has been reported\n      in Western Europeans (5), African Americans (5), Nigerians (6), Japanese (7),\n      Chinese (8, 9), Indians (10, 11), and other populations (12-15). PJS occurs\n      equally in males and females (7).\nCI  - Copyright (c) 2009-, Douglas L Riegert-Johnson\nFED - Riegert-Johnson, Douglas L\nED  - Riegert-Johnson DL\nFED - Boardman, Lisa A\nED  - Boardman LA\nFED - Hefferon, Timothy\nED  - Hefferon T\nFED - Roberts, Maegan\nED  - Roberts M\nFAU - Riegert-Johnson, Douglas\nAU  - Riegert-Johnson D\nFAU - Gleeson, Ferga C.\nAU  - Gleeson FC\nFAU - Westra, Wytske\nAU  - Westra W\nFAU - Hefferon, Timothy\nAU  - Hefferon T\nFAU - Wong Kee Song, Louis M.\nAU  - Wong Kee Song LM\nFAU - Spurck, Lauren\nAU  - Spurck L\nFAU - Boardman, Lisa A.\nAU  - Boardman LA\nLA  - eng\nPT  - Book Chapter\nPL  - Bethesda (MD)\nEDAT- 2011/01/21 06:00\nMHDA- 2011/01/21 06:00\nCDAT- 2011/01/21 06:00\nAID - NBK1826 [bookaccession]\n\n",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The structure of bovine F1-ATPase complexed with the antibiotic inhibitor aurovertin B.",
				"creators": [
					{
						"firstName": "M. J.",
						"lastName": "van Raaij",
						"creatorType": "author"
					},
					{
						"firstName": "J. P.",
						"lastName": "Abrahams",
						"creatorType": "author"
					},
					{
						"firstName": "A. G.",
						"lastName": "Leslie",
						"creatorType": "author"
					},
					{
						"firstName": "J. E.",
						"lastName": "Walker",
						"creatorType": "author"
					}
				],
				"date": "1996 Jul 9",
				"ISSN": "0027-8424",
				"abstractNote": "In the structure of bovine mitochondrial F1-ATPase that was previously determined with crystals grown in the presence of adenylyl-imidodiphosphate (AMP-PNP) and ADP, the three catalytic beta-subunits have different conformations and nucleotide occupancies. Adenylyl-imidodiphosphate is bound to one beta-subunit (betaTP), ADP is bound to the second (betaDP), and no nucleotide is bound to the  third (betaE). Here we show that the uncompetitive inhibitor aurovertin B binds to bovine F1 at two equivalent sites in betaTP and betaE, in a cleft between the  nucleotide binding and C-terminal domains. In betaDP, the aurovertin B pocket is  incomplete and is inaccessible to the inhibitor. The aurovertin B bound to betaTP interacts with alpha-Glu399 in the adjacent alphaTP subunit, whereas the aurovertin B bound to betaE is too distant from alphaE to make an equivalent interaction. Both sites encompass betaArg-412, which was shown by mutational studies to be involved in binding aurovertin. Except for minor changes around the aurovertin pockets, the structure of bovine F1-ATPase is the same as determined previously. Aurovertin B appears to act by preventing closure of the catalytic interfaces, which is essential for a catalytic mechanism involving cyclic interconversion of catalytic sites.",
				"extra": "PMID: 8692918 \nPMCID: PMC38908",
				"issue": "14",
				"journalAbbreviation": "Proc Natl Acad Sci U S A",
				"language": "eng",
				"pages": "6913-6917",
				"publicationTitle": "Proceedings of the National Academy of Sciences of the United States of America",
				"volume": "93",
				"attachments": [],
				"tags": [
					{
						"tag": "*Protein Structure, Secondary"
					},
					{
						"tag": "Adenylyl Imidodiphosphate/pharmacology"
					},
					{
						"tag": "Animals"
					},
					{
						"tag": "Arginine"
					},
					{
						"tag": "Aurovertins/*chemistry/*metabolism"
					},
					{
						"tag": "Binding Sites"
					},
					{
						"tag": "Cattle"
					},
					{
						"tag": "Crystallography, X-Ray"
					},
					{
						"tag": "Enzyme Inhibitors/chemistry/metabolism"
					},
					{
						"tag": "Glutamic Acid"
					},
					{
						"tag": "Macromolecular Substances"
					},
					{
						"tag": "Models, Molecular"
					},
					{
						"tag": "Molecular Structure"
					},
					{
						"tag": "Myocardium/enzymology"
					},
					{
						"tag": "Proton-Translocating ATPases/*chemistry/*metabolism"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "bookSection",
				"title": "Peutz-Jeghers Syndrome",
				"creators": [
					{
						"firstName": "Douglas L.",
						"lastName": "Riegert-Johnson",
						"creatorType": "editor"
					},
					{
						"firstName": "Lisa A.",
						"lastName": "Boardman",
						"creatorType": "editor"
					},
					{
						"firstName": "Timothy",
						"lastName": "Hefferon",
						"creatorType": "editor"
					},
					{
						"firstName": "Maegan",
						"lastName": "Roberts",
						"creatorType": "editor"
					},
					{
						"firstName": "Douglas",
						"lastName": "Riegert-Johnson",
						"creatorType": "author"
					},
					{
						"firstName": "Ferga C.",
						"lastName": "Gleeson",
						"creatorType": "author"
					},
					{
						"firstName": "Wytske",
						"lastName": "Westra",
						"creatorType": "author"
					},
					{
						"firstName": "Timothy",
						"lastName": "Hefferon",
						"creatorType": "author"
					},
					{
						"firstName": "Louis M.",
						"lastName": "Wong Kee Song",
						"creatorType": "author"
					},
					{
						"firstName": "Lauren",
						"lastName": "Spurck",
						"creatorType": "author"
					},
					{
						"firstName": "Lisa A.",
						"lastName": "Boardman",
						"creatorType": "author"
					}
				],
				"date": "2009",
				"abstractNote": "PJS is a rare disease. (\"Peutz-Jeghers syndrome is no frequent nosological unit\". (1)) There are no high-quality estimates of the prevalence or incidence of PJS. Estimates have included 1 in 8,500 to 23,000 live births (2), 1 in 50,000 to 1 in 100,000 in Finland (3), and 1 in 200,000 (4). A report on the incidence of PJS is available at www.peutz-jeghers.com. At Mayo Clinic from 1945 to 1996 the incidence of PJS was 0.9 PJS patients per 100,000 patients. PJS has been reported in Western Europeans (5), African Americans (5), Nigerians (6), Japanese (7), Chinese (8, 9), Indians (10, 11), and other populations (12-15). PJS occurs equally in males and females (7).",
				"bookTitle": "Cancer Syndromes",
				"extra": "PMID: 21249755",
				"language": "eng",
				"place": "Bethesda (MD)",
				"publisher": "National Center for Biotechnology Information (US)",
				"rights": "Copyright (c) 2009-, Douglas L Riegert-Johnson",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "\nPMID- 8402898\nOWN - NLM\nSTAT- MEDLINE\nDA  - 19931118\nDCOM- 19931118\nLR  - 20061115\nIS  - 0092-8674 (Print)\nIS  - 0092-8674 (Linking)\nVI  - 75\nIP  - 1\nDP  - 1993 Oct 8\nTI  - The GTPase dynamin binds to and is activated by a subset of SH3 domains.\nPG  - 25-36\nAB  - Src homology 3 (SH3) domains have been implicated in mediating protein-protein\n      interactions in receptor signaling processes; however, the precise role of this\n      domain remains unclear. In this report, affinity purification techniques were\n      used to identify the GTPase dynamin as an SH3 domain-binding protein. Selective\n      binding to a subset of 15 different recombinant SH3 domains occurs through\n      proline-rich sequence motifs similar to those that mediate the interaction of the\n      SH3 domains of Grb2 and Abl proteins to the guanine nucleotide exchange protein, \n      Sos, and to the 3BP1 protein, respectively. Dynamin GTPase activity is stimulated\n      by several of the bound SH3 domains, suggesting that the function of the SH3\n      module is not restricted to protein-protein interactions but may also include the\n      interactive regulation of GTP-binding proteins.\nFAU - Gout, I\nAU  - Gout I\nAD  - Ludwig Institute for Cancer Research, London, England.\nFAU - Dhand, R\nAU  - Dhand R\nFAU - Hiles, I D\nAU  - Hiles ID\nFAU - Fry, M J\nAU  - Fry MJ\nFAU - Panayotou, G\nAU  - Panayotou G\nFAU - Das, P\nAU  - Das P\nFAU - Truong, O\nAU  - Truong O\nFAU - Totty, N F\nAU  - Totty NF\nFAU - Hsuan, J\nAU  - Hsuan J\nFAU - Booker, G W\nAU  - Booker GW\nAU  - et al.\nLA  - eng\nPT  - Comparative Study\nPT  - Journal Article\nPT  - Research Support, Non-U.S. Gov't\nPL  - UNITED STATES\nTA  - Cell\nJT  - Cell\nJID - 0413066\nRN  - 0 (Recombinant Fusion Proteins)\nRN  - 0 (Recombinant Proteins)\nRN  - EC 2.5.1.18 (Glutathione Transferase)\nRN  - EC 3.6.1.- (GTP Phosphohydrolases)\nRN  - EC 3.6.5.5 (Dynamins)\nSB  - IM\nMH  - Amino Acid Sequence\nMH  - Animals\nMH  - Binding Sites\nMH  - Brain/*enzymology\nMH  - Drosophila/genetics\nMH  - Dynamins\nMH  - Enzyme Activation\nMH  - GTP Phosphohydrolases/isolation & purification/*metabolism\nMH  - Glutathione Transferase/metabolism\nMH  - Humans\nMH  - Kinetics\nMH  - Mice\nMH  - Molecular Sequence Data\nMH  - Rats\nMH  - Recombinant Fusion Proteins/metabolism\nMH  - Recombinant Proteins/isolation & purification/metabolism\nMH  - Sequence Homology, Amino Acid\nMH  - Signal Transduction\nEDAT- 1993/10/08\nMHDA- 1993/10/08 00:01\nCRDT- 1993/10/08 00:00\nAID - 0092-8674(93)90676-H [pii]\nPST - ppublish\nSO  - Cell. 1993 Oct 8;75(1):25-36.",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The GTPase dynamin binds to and is activated by a subset of SH3 domains.",
				"creators": [
					{
						"firstName": "I.",
						"lastName": "Gout",
						"creatorType": "author"
					},
					{
						"firstName": "R.",
						"lastName": "Dhand",
						"creatorType": "author"
					},
					{
						"firstName": "I. D.",
						"lastName": "Hiles",
						"creatorType": "author"
					},
					{
						"firstName": "M. J.",
						"lastName": "Fry",
						"creatorType": "author"
					},
					{
						"firstName": "G.",
						"lastName": "Panayotou",
						"creatorType": "author"
					},
					{
						"firstName": "P.",
						"lastName": "Das",
						"creatorType": "author"
					},
					{
						"firstName": "O.",
						"lastName": "Truong",
						"creatorType": "author"
					},
					{
						"firstName": "N. F.",
						"lastName": "Totty",
						"creatorType": "author"
					},
					{
						"firstName": "J.",
						"lastName": "Hsuan",
						"creatorType": "author"
					},
					{
						"firstName": "G. W.",
						"lastName": "Booker",
						"creatorType": "author"
					}
				],
				"date": "1993 Oct 8",
				"ISSN": "0092-8674",
				"abstractNote": "Src homology 3 (SH3) domains have been implicated in mediating protein-protein interactions in receptor signaling processes; however, the precise role of this domain remains unclear. In this report, affinity purification techniques were used to identify the GTPase dynamin as an SH3 domain-binding protein. Selective binding to a subset of 15 different recombinant SH3 domains occurs through proline-rich sequence motifs similar to those that mediate the interaction of the SH3 domains of Grb2 and Abl proteins to the guanine nucleotide exchange protein,  Sos, and to the 3BP1 protein, respectively. Dynamin GTPase activity is stimulated by several of the bound SH3 domains, suggesting that the function of the SH3 module is not restricted to protein-protein interactions but may also include the interactive regulation of GTP-binding proteins.",
				"extra": "PMID: 8402898",
				"issue": "1",
				"journalAbbreviation": "Cell",
				"language": "eng",
				"pages": "25-36",
				"publicationTitle": "Cell",
				"volume": "75",
				"attachments": [],
				"tags": [
					{
						"tag": "Amino Acid Sequence"
					},
					{
						"tag": "Animals"
					},
					{
						"tag": "Binding Sites"
					},
					{
						"tag": "Brain/*enzymology"
					},
					{
						"tag": "Drosophila/genetics"
					},
					{
						"tag": "Dynamins"
					},
					{
						"tag": "Enzyme Activation"
					},
					{
						"tag": "GTP Phosphohydrolases/isolation & purification/*metabolism"
					},
					{
						"tag": "Glutathione Transferase/metabolism"
					},
					{
						"tag": "Humans"
					},
					{
						"tag": "Kinetics"
					},
					{
						"tag": "Mice"
					},
					{
						"tag": "Molecular Sequence Data"
					},
					{
						"tag": "Rats"
					},
					{
						"tag": "Recombinant Fusion Proteins/metabolism"
					},
					{
						"tag": "Recombinant Proteins/isolation & purification/metabolism"
					},
					{
						"tag": "Sequence Homology, Amino Acid"
					},
					{
						"tag": "Signal Transduction"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "PMID- 25744111\nOWN - NLM\nSTAT- MEDLINE\nDA  - 20150525\nDCOM- 20150819\nIS  - 1476-5616 (Electronic)\nIS  - 0033-3506 (Linking)\nVI  - 129\nIP  - 5\nDP  - 2015 May\nTI  - Effectiveness of public health practices against shaken baby syndrome/abusive\n      head trauma in Japan.\nPG  - 475-82\nLID - 10.1016/j.puhe.2015.01.018 [doi]\nLID - S0033-3506(15)00037-2 [pii]\nAB  - OBJECTIVES: Previous studies have demonstrated the effectiveness of educational\n      materials on infant crying to change caregivers' knowledge and behaviours related\n      to shaken baby syndrome or abusive head trauma (SBS/AHT) using selected samples\n      in randomized controlled trials. This study investigated the impact of public\n      health practices to prevent SBS/AHT in Japan through the use of educational\n      materials. STUDY DESIGN: Cross-sectional study. METHODS: The intervention was\n      comprised of two parts: (1) the screening of an educational DVD at a prenatal\n      class; and (2) the distribution of a public health pamphlet at a postnatal home\n      visit. Expectant parents watched a DVD (The Period of PURPLE Crying) about the\n      features of infant crying and recommended behaviours (walking away if frustrated \n      in the event of unsoothable crying, sharing information on crying with other\n      caregivers) at a preterm parenting class held at eight months' gestation. A\n      postnatal home-visit service was implemented in which a maternity nurse\n      distributed a pamphlet to explain information about infant crying. Before the\n      four-month health check-up, a self-administered questionnaire was distributed to \n      assess exposure to these public health practices and outcome variables (i.e.\n      infant crying knowledge, walk-away and information-sharing behaviours), and\n      responses were collected at the four-month health check-up (n = 1316). The\n      impacts of these interventions on outcome variables were analysed by comparing\n      those exposed to both interventions, either intervention and neither intervention\n      after adjusting for covariates. RESULTS: Crying and shaking knowledge were\n      significantly higher among women exposed to the public health practices, with a\n      dose-response relationship (both P < 0.001). Further, walk-away behaviour during \n      periods of unsoothable crying was higher among the intervention group. However,\n      sharing information about infant crying with other caregivers was less likely\n      among the intervention group. CONCLUSIONS: The impact of educational materials in\n      public health practice on knowledge of crying and shaking, and walk-away\n      behaviour in Japan had a dose-response relationship; however, an increase in\n      sharing information with other caregivers was not observed.\nCI  - Copyright (c) 2015 The Royal Society for Public Health. Published by Elsevier\n      Ltd. All rights reserved.\nFAU - Fujiwara, T\nAU  - Fujiwara T\nAD  - Department of Social Medicine, National Research Institute for Child Health and\n      Development, Okura, Setagaya-ku, Tokyo, Japan. Electronic address:\n      fujiwara-tk@ncchd.go.jp.\nLA  - eng\nPT  - Evaluation Studies\nPT  - Journal Article\nPT  - Research Support, Non-U.S. Gov't\nDEP - 20150303\nPL  - Netherlands\nTA  - Public Health\nJT  - Public health\nJID - 0376507\nSB  - IM\nMH  - Adolescent\nMH  - Adult\nMH  - Caregivers/*education/psychology/statistics & numerical data\nMH  - Child Abuse/*prevention & control\nMH  - Craniocerebral Trauma/*prevention & control\nMH  - Cross-Sectional Studies\nMH  - Crying/psychology\nMH  - Female\nMH  - Follow-Up Studies\nMH  - *Health Knowledge, Attitudes, Practice\nMH  - Humans\nMH  - Infant\nMH  - Infant, Newborn\nMH  - Japan\nMH  - Male\nMH  - Pamphlets\nMH  - Parents/*education/psychology\nMH  - Program Evaluation\nMH  - *Public Health Practice\nMH  - Questionnaires\nMH  - Shaken Baby Syndrome/*prevention & control\nMH  - Videodisc Recording\nMH  - Young Adult\nOTO - NOTNLM\nOT  - Abusive head trauma\nOT  - Crying\nOT  - Intervention\nOT  - Japan\nOT  - Public health\nOT  - Shaken baby syndrome\nEDAT- 2015/03/07 06:00\nMHDA- 2015/08/20 06:00\nCRDT- 2015/03/07 06:00\nPHST- 2014/05/29 [received]\nPHST- 2014/11/26 [revised]\nPHST- 2015/01/20 [accepted]\nPHST- 2015/03/03 [aheadofprint]\nAID - S0033-3506(15)00037-2 [pii]\nAID - 10.1016/j.puhe.2015.01.018 [doi]\nPST - ppublish\nSO  - Public Health. 2015 May;129(5):475-82. doi: 10.1016/j.puhe.2015.01.018. Epub 2015\n      Mar 3.",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Effectiveness of public health practices against shaken baby syndrome/abusive head trauma in Japan.",
				"creators": [
					{
						"firstName": "T.",
						"lastName": "Fujiwara",
						"creatorType": "author"
					}
				],
				"date": "2015 May",
				"DOI": "10.1016/j.puhe.2015.01.018",
				"ISSN": "1476-5616 0033-3506",
				"abstractNote": "OBJECTIVES: Previous studies have demonstrated the effectiveness of educational materials on infant crying to change caregivers' knowledge and behaviours related to shaken baby syndrome or abusive head trauma (SBS/AHT) using selected samples in randomized controlled trials. This study investigated the impact of public health practices to prevent SBS/AHT in Japan through the use of educational materials. STUDY DESIGN: Cross-sectional study. METHODS: The intervention was comprised of two parts: (1) the screening of an educational DVD at a prenatal class; and (2) the distribution of a public health pamphlet at a postnatal home visit. Expectant parents watched a DVD (The Period of PURPLE Crying) about the features of infant crying and recommended behaviours (walking away if frustrated  in the event of unsoothable crying, sharing information on crying with other caregivers) at a preterm parenting class held at eight months' gestation. A postnatal home-visit service was implemented in which a maternity nurse distributed a pamphlet to explain information about infant crying. Before the four-month health check-up, a self-administered questionnaire was distributed to  assess exposure to these public health practices and outcome variables (i.e. infant crying knowledge, walk-away and information-sharing behaviours), and responses were collected at the four-month health check-up (n = 1316). The impacts of these interventions on outcome variables were analysed by comparing those exposed to both interventions, either intervention and neither intervention after adjusting for covariates. RESULTS: Crying and shaking knowledge were significantly higher among women exposed to the public health practices, with a dose-response relationship (both P < 0.001). Further, walk-away behaviour during  periods of unsoothable crying was higher among the intervention group. However, sharing information about infant crying with other caregivers was less likely among the intervention group. CONCLUSIONS: The impact of educational materials in public health practice on knowledge of crying and shaking, and walk-away behaviour in Japan had a dose-response relationship; however, an increase in sharing information with other caregivers was not observed.",
				"extra": "PMID: 25744111",
				"issue": "5",
				"journalAbbreviation": "Public Health",
				"language": "eng",
				"pages": "475-482",
				"publicationTitle": "Public health",
				"rights": "Copyright (c) 2015 The Royal Society for Public Health. Published by Elsevier Ltd. All rights reserved.",
				"volume": "129",
				"attachments": [],
				"tags": [
					{
						"tag": "*Health Knowledge, Attitudes, Practice"
					},
					{
						"tag": "*Public Health Practice"
					},
					{
						"tag": "Abusive head trauma"
					},
					{
						"tag": "Adolescent"
					},
					{
						"tag": "Adult"
					},
					{
						"tag": "Caregivers/*education/psychology/statistics & numerical data"
					},
					{
						"tag": "Child Abuse/*prevention & control"
					},
					{
						"tag": "Craniocerebral Trauma/*prevention & control"
					},
					{
						"tag": "Cross-Sectional Studies"
					},
					{
						"tag": "Crying"
					},
					{
						"tag": "Crying/psychology"
					},
					{
						"tag": "Female"
					},
					{
						"tag": "Follow-Up Studies"
					},
					{
						"tag": "Humans"
					},
					{
						"tag": "Infant"
					},
					{
						"tag": "Infant, Newborn"
					},
					{
						"tag": "Intervention"
					},
					{
						"tag": "Japan"
					},
					{
						"tag": "Japan"
					},
					{
						"tag": "Male"
					},
					{
						"tag": "Pamphlets"
					},
					{
						"tag": "Parents/*education/psychology"
					},
					{
						"tag": "Program Evaluation"
					},
					{
						"tag": "Public health"
					},
					{
						"tag": "Questionnaires"
					},
					{
						"tag": "Shaken Baby Syndrome/*prevention & control"
					},
					{
						"tag": "Shaken baby syndrome"
					},
					{
						"tag": "Videodisc Recording"
					},
					{
						"tag": "Young Adult"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "\nOWN - ERIC\nTI  - Educational Test Approaches: The Suitability of Computer-Based Test Types for Assessment and Evaluation in Formative and Summative Contexts\nAU  - van Groen, Maaike M.\nAU  - Eggen, Theo J. H. M.\nOT  - Computer Assisted Testing\nOT  - Formative Evaluation\nOT  - Summative Evaluation\nOT  - Adaptive Testing\nOT  - Educational Games\nOT  - Computer Simulation\nOT  - Automation\nOT  - Educational Testing\nJT  - Journal of Applied Testing Technology\nSO  - v21 n1 p12-24 2020\nAID - http://www.jattjournal.com/index.php/atp/article/view/146484\nOID - EJ1227990\nVI  - 21\nIP  - 1\nPG  - 12-24\nDP  - 2020\nLID - http://eric.ed.gov/?id=EJ1227990\nAB  - When developing a digital test, one of the first decisions that need to be made is which type of Computer-Based Test (CBT) to develop. Six different CBT types are considered here: linear tests, automatically generated tests, computerized adaptive tests, adaptive learning environments, educational simulations, and educational games. The selection of a CBT type needs to be guided by the intended purposes of the test. The test approach determines which purposes can be achieved by using a particular test. Four different test approaches are discussed here: formative assessment, formative evaluation, summative assessment, and summative evaluation. The suitability of each CBT type to measure performance for the different test approaches is evaluated based on four test characteristics: test purpose, test length, level of interest for measurement (student, class, school, system), and test report. This article aims to provide some guidance in the selection of the most appropriate type of CBT.\nISSN - EISSN-2375-5636\nLA  - English\nPT  - Journal Articles\nPT  - Reports - Research\n\nOWN - ERIC\nTI  - Test-Taker Perception of and Test Performance on Computer-Delivered Speaking Tests: The Mediational Role of Test-Taking Motivation\nAU  - Zhou, Yujia\nAU  - Yoshitomi, Asako\nOT  - Computer Literacy\nOT  - Computer Assisted Testing\nOT  - College Students\nOT  - Language Tests\nOT  - English (Second Language)\nOT  - Second Language Learning\nOT  - Speech Communication\nOT  - Test Validity\nOT  - Foreign Countries\nOT  - Student Attitudes\nOT  - Correlation\nOT  - Test Construction\nOT  - Student Motivation\nJT  - Language Testing in Asia\nSO  - v9 Article 10 2019\nAID - http://dx.doi.org/10.1186/s40468-019-0086-7\nOID - EJ1245375\nVI  - 9\nDP  - Article 10 2019\nLID - http://eric.ed.gov/?id=EJ1245375\nAB  - Background: Research on the test-taker perception of assessments has been conducted under the assumption that negative test-taker perception may influence test performance by decreasing test-taking motivation. This assumption, however, has not been verified in the field of language testing. Building on expectancy-value theory, this study explored the relationships between test-taker perception, test-taking motivation, and test performance in the context of a computer-delivered speaking test. Methods: Sixty-four Japanese university students took the TOEIC Speaking test and completed a questionnaire that included statements about their test perception, test-taking motivation, and self-perceived test performance. Five students participated in follow-up interviews. Results: Questionnaire results showed that students regarded the TOEIC Speaking test positively in terms of test validity but showed reservations about computer delivery, and that they felt sufficiently motivated during the test. Interview results revealed various reasons for their reservations about computer delivery and factors that distracted them during the test. According to correlation analysis, the effects of test-taker perception and test-taking motivation seemed to be minimal on test performance, and participants' perception of computer delivery was directly related to test-taking effort, but their perception of test validity seemed to be related to test-taking effort only indirectly through the mediation of perceived test importance. Conclusion: Our findings not only provide empirical evidence for the relationship between test-taker perception and test performance but also highlight the importance of considering test-taker reactions in developing tests.\nISSN - EISSN-2229-0443\nLA  - English\nPT  - Journal Articles\nPT  - Reports - Research\n\nOWN - ERIC\nTI  - College Entrance Exams: How Does Test Preparation Affect Retest Scores? Research Report 2019-2\nAU  - Moore, Raeal\nAU  - Sanchez, Edgar\nAU  - San Pedro, Sweet\nOT  - College Entrance Examinations\nOT  - Test Preparation\nOT  - Scores\nOT  - Achievement Gains\nOT  - Pretests Posttests\nOT  - Tutoring\nOT  - High School Students\nOT  - Outcomes of Education\nJT  - ACT, Inc.\nOID - ED602023\nDP  - 2019\nLID - http://eric.ed.gov/?id=ED602023\nAB  - As test preparation becomes widely accessible through different delivery systems, large-scale studies of test preparation efficacy that involve a variety of test preparation activities become more important to understanding the value and impact of test preparation activities on both the ACT and SAT. In this paper, the authors examine the impact of participating in test preparation prior to retaking the ACT test. The study focused on addressing three questions: (1) Using a pretest-posttest design, do students who participate in test preparation have larger score gains relative to students who did not participate in test preparation; does the test preparation effect depend on students' pretest scores?; (2) Among students who participated in test preparation, is the number of hours spent participating in each of 10 test preparation activities related to retest scores?; and (3) Among students who participated in test preparation, do their own beliefs that they might have been ill-prepared to take the test, regardless of the test preparation activities they engaged in, impact retest scores? The study findings showed that test preparation improved students' retest scores, and this effect did not differ depending on students' first ACT score. Among specific test prep activities, only the number of hours using a private tutor resulted in increased score gains above the overall effect of test prep. Students who reported feeling inadequately prepared for the second test had ACT Composite scores that were lower than those students who felt adequately prepared.\nPT  - Reports - Research",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Educational Test Approaches: The Suitability of Computer-Based Test Types for Assessment and Evaluation in Formative and Summative Contexts",
				"creators": [
					{
						"firstName": "Maaike M.",
						"lastName": "van Groen",
						"creatorType": "author"
					},
					{
						"firstName": "Theo J. H. M.",
						"lastName": "Eggen",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISSN": "2375-5636",
				"abstractNote": "When developing a digital test, one of the first decisions that need to be made is which type of Computer-Based Test (CBT) to develop. Six different CBT types are considered here: linear tests, automatically generated tests, computerized adaptive tests, adaptive learning environments, educational simulations, and educational games. The selection of a CBT type needs to be guided by the intended purposes of the test. The test approach determines which purposes can be achieved by using a particular test. Four different test approaches are discussed here: formative assessment, formative evaluation, summative assessment, and summative evaluation. The suitability of each CBT type to measure performance for the different test approaches is evaluated based on four test characteristics: test purpose, test length, level of interest for measurement (student, class, school, system), and test report. This article aims to provide some guidance in the selection of the most appropriate type of CBT.",
				"extra": "ERIC Number: EJ1227990",
				"issue": "1",
				"language": "English",
				"pages": "12-24",
				"publicationTitle": "Journal of Applied Testing Technology",
				"volume": "21",
				"attachments": [
					{
						"title": "Catalog Link",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Adaptive Testing"
					},
					{
						"tag": "Automation"
					},
					{
						"tag": "Computer Assisted Testing"
					},
					{
						"tag": "Computer Simulation"
					},
					{
						"tag": "Educational Games"
					},
					{
						"tag": "Educational Testing"
					},
					{
						"tag": "Formative Evaluation"
					},
					{
						"tag": "Summative Evaluation"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Test-Taker Perception of and Test Performance on Computer-Delivered Speaking Tests: The Mediational Role of Test-Taking Motivation",
				"creators": [
					{
						"firstName": "Yujia",
						"lastName": "Zhou",
						"creatorType": "author"
					},
					{
						"firstName": "Asako",
						"lastName": "Yoshitomi",
						"creatorType": "author"
					}
				],
				"date": "Article 10 2019",
				"ISSN": "2229-0443",
				"abstractNote": "Background: Research on the test-taker perception of assessments has been conducted under the assumption that negative test-taker perception may influence test performance by decreasing test-taking motivation. This assumption, however, has not been verified in the field of language testing. Building on expectancy-value theory, this study explored the relationships between test-taker perception, test-taking motivation, and test performance in the context of a computer-delivered speaking test. Methods: Sixty-four Japanese university students took the TOEIC Speaking test and completed a questionnaire that included statements about their test perception, test-taking motivation, and self-perceived test performance. Five students participated in follow-up interviews. Results: Questionnaire results showed that students regarded the TOEIC Speaking test positively in terms of test validity but showed reservations about computer delivery, and that they felt sufficiently motivated during the test. Interview results revealed various reasons for their reservations about computer delivery and factors that distracted them during the test. According to correlation analysis, the effects of test-taker perception and test-taking motivation seemed to be minimal on test performance, and participants' perception of computer delivery was directly related to test-taking effort, but their perception of test validity seemed to be related to test-taking effort only indirectly through the mediation of perceived test importance. Conclusion: Our findings not only provide empirical evidence for the relationship between test-taker perception and test performance but also highlight the importance of considering test-taker reactions in developing tests.",
				"extra": "ERIC Number: EJ1245375",
				"language": "English",
				"publicationTitle": "Language Testing in Asia",
				"volume": "9",
				"attachments": [
					{
						"title": "Catalog Link",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "College Students"
					},
					{
						"tag": "Computer Assisted Testing"
					},
					{
						"tag": "Computer Literacy"
					},
					{
						"tag": "Correlation"
					},
					{
						"tag": "English (Second Language)"
					},
					{
						"tag": "Foreign Countries"
					},
					{
						"tag": "Language Tests"
					},
					{
						"tag": "Second Language Learning"
					},
					{
						"tag": "Speech Communication"
					},
					{
						"tag": "Student Attitudes"
					},
					{
						"tag": "Student Motivation"
					},
					{
						"tag": "Test Construction"
					},
					{
						"tag": "Test Validity"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "report",
				"title": "College Entrance Exams: How Does Test Preparation Affect Retest Scores? Research Report 2019-2",
				"creators": [
					{
						"firstName": "Raeal",
						"lastName": "Moore",
						"creatorType": "author"
					},
					{
						"firstName": "Edgar",
						"lastName": "Sanchez",
						"creatorType": "author"
					},
					{
						"firstName": "Sweet",
						"lastName": "San Pedro",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"abstractNote": "As test preparation becomes widely accessible through different delivery systems, large-scale studies of test preparation efficacy that involve a variety of test preparation activities become more important to understanding the value and impact of test preparation activities on both the ACT and SAT. In this paper, the authors examine the impact of participating in test preparation prior to retaking the ACT test. The study focused on addressing three questions: (1) Using a pretest-posttest design, do students who participate in test preparation have larger score gains relative to students who did not participate in test preparation; does the test preparation effect depend on students' pretest scores?; (2) Among students who participated in test preparation, is the number of hours spent participating in each of 10 test preparation activities related to retest scores?; and (3) Among students who participated in test preparation, do their own beliefs that they might have been ill-prepared to take the test, regardless of the test preparation activities they engaged in, impact retest scores? The study findings showed that test preparation improved students' retest scores, and this effect did not differ depending on students' first ACT score. Among specific test prep activities, only the number of hours using a private tutor resulted in increased score gains above the overall effect of test prep. Students who reported feeling inadequately prepared for the second test had ACT Composite scores that were lower than those students who felt adequately prepared.",
				"extra": "ERIC Number: ED602023",
				"institution": "ACT, Inc.",
				"attachments": [
					{
						"title": "Catalog Link",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Achievement Gains"
					},
					{
						"tag": "College Entrance Examinations"
					},
					{
						"tag": "High School Students"
					},
					{
						"tag": "Outcomes of Education"
					},
					{
						"tag": "Pretests Posttests"
					},
					{
						"tag": "Scores"
					},
					{
						"tag": "Test Preparation"
					},
					{
						"tag": "Tutoring"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "PMID- 35128459\nOWN - NLM\nSTAT- PubMed-not-MEDLINE\nLR  - 20220208\nIS  - 2641-9157 (Electronic)\nIS  - 2641-9157 (Linking)\nVI  - 4\nIP  - 1\nDP  - 2021\nTI  - Slow Burns: A Qualitative Study of Burn Pit and Toxic Exposures Among Military \n      Veterans Serving in Afghanistan, Iraq and Throughout the Middle East.\nLID - 1042 [pii]\nAB  - During deployment to the Persian Gulf War and Southwest Asia theatre of operations, \n      Veterans often experienced various hazards, foremost being open-air burn pits and \n      oil well fires. While over 23 presumptive conditions (ranging from brain cancer, \n      interstitial lung disease, and lymphomas to sleep/mood disorders, depression, and \n      cognitive impairment) have been studied in connection with their military-related \n      exposures, there is a paucity of qualitative research on this topic. This is \n      especially true in the context of explanatory models and health belief systems, \n      vis-à-vis underlying social and cultural factors. The current paper provides a \n      balanced conceptual framework (summarizing causal virtues and shortcomings) about \n      the challenges that Veterans encounter when seeking medical care, screening \n      assessments and subsequent treatments.\nFAU - Bith-Melander, Pollie\nAU  - Bith-Melander P\nAD  - Department of Social Work, California State University, Stanislaus, Turlock, CA, \n      USA.\nFAU - Ratliff, Jack\nAU  - Ratliff J\nAD  - Department of Medical-Surgical Oncology, James A Haley Veterans Affairs Hospital, \n      Tampa, FL, USA.\nAD  - Military Exposures Team, HunterSeven Foundation, Providence, RI, USA.\nFAU - Poisson, Chelsey\nAU  - Poisson C\nAD  - Military Exposures Team, HunterSeven Foundation, Providence, RI, USA.\nFAU - Jindal, Charulata\nAU  - Jindal C\nAD  - Harvard Medical School, Harvard University, Boston, USA.\nFAU - Ming Choi, Yuk\nAU  - Ming Choi Y\nAD  - Signify Health, Dallas, TX, 75244, USA.\nFAU - Efird, Jimmy T\nAU  - Efird JT\nAD  - Cooperative Studies Program Epidemiology Center, Health Services Research and \n      Development, DVAHCS, Durham, USA.\nLA  - eng\nPT  - Journal Article\nDEP - 20211227\nTA  - Ann Psychiatry Clin Neurosci\nJT  - Annals of psychiatry and clinical neuroscience\nJID - 9918334788106676\nPMC - PMC8816568\nMID - NIHMS1773706\nOTO - NOTNLM\nOT  - Burn pits\nOT  - Deployment anthropology\nOT  - Explanatory models\nOT  - Military exposures\nOT  - Oil well fires\nOT  - Qualitative analysis\nEDAT- 2022/02/08 06:00\nMHDA- 2022/02/08 06:01\nCRDT- 2022/02/07 05:37\nPHST- 2022/02/07 05:37 [entrez]\nPHST- 2022/02/08 06:00 [pubmed]\nPHST- 2022/02/08 06:01 [medline]\nAID - 1042 [pii]\nPST - ppublish\nSO  - Ann Psychiatry Clin Neurosci. 2021;4(1):1042. Epub 2021 Dec 27.\n",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Slow Burns: A Qualitative Study of Burn Pit and Toxic Exposures Among Military Veterans Serving in Afghanistan, Iraq and Throughout the Middle East.",
				"creators": [
					{
						"firstName": "Pollie",
						"lastName": "Bith-Melander",
						"creatorType": "author"
					},
					{
						"firstName": "Jack",
						"lastName": "Ratliff",
						"creatorType": "author"
					},
					{
						"firstName": "Chelsey",
						"lastName": "Poisson",
						"creatorType": "author"
					},
					{
						"firstName": "Charulata",
						"lastName": "Jindal",
						"creatorType": "author"
					},
					{
						"firstName": "Yuk",
						"lastName": "Ming Choi",
						"creatorType": "author"
					},
					{
						"firstName": "Jimmy T.",
						"lastName": "Efird",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"ISSN": "2641-9157",
				"abstractNote": "During deployment to the Persian Gulf War and Southwest Asia theatre of operations, Veterans often experienced various hazards, foremost being open-air burn pits and  oil well fires. While over 23 presumptive conditions (ranging from brain cancer,  interstitial lung disease, and lymphomas to sleep/mood disorders, depression, and  cognitive impairment) have been studied in connection with their military-related  exposures, there is a paucity of qualitative research on this topic. This is  especially true in the context of explanatory models and health belief systems,  vis-à-vis underlying social and cultural factors. The current paper provides a  balanced conceptual framework (summarizing causal virtues and shortcomings) about  the challenges that Veterans encounter when seeking medical care, screening  assessments and subsequent treatments.",
				"extra": "PMID: 35128459 \nPMCID: PMC8816568",
				"issue": "1",
				"journalAbbreviation": "Ann Psychiatry Clin Neurosci",
				"language": "eng",
				"pages": "1042",
				"publicationTitle": "Annals of psychiatry and clinical neuroscience",
				"volume": "4",
				"attachments": [],
				"tags": [
					{
						"tag": "Burn pits"
					},
					{
						"tag": "Deployment anthropology"
					},
					{
						"tag": "Explanatory models"
					},
					{
						"tag": "Military exposures"
					},
					{
						"tag": "Oil well fires"
					},
					{
						"tag": "Qualitative analysis"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "\r\nOWN - ERIC\r\nTI  - Findings from the PISA for Development Field Trial of the School-Based Assessment. PISA for Development Brief 16\r\nOT  - International Assessment\r\nOT  - Secondary School Students\r\nOT  - Foreign Countries\r\nOT  - Achievement Tests\r\nOT  - Field Tests\r\nOT  - Educational Assessment\r\nOT  - Cognitive Tests\r\nOT  - Reading Tests\r\nOT  - Mathematics Tests\r\nOT  - Science Tests\r\nOT  - Developing Nations\r\nJT  - OECD Publishing\r\nAID - www.oecd.org/pisa/pisa-for-development/16-Findings-from-in-school-FT.pdf\r\nOID - ED576982\r\nDP  - 2017\r\nLID - http://eric.ed.gov/?id=ED576982\r\nAB  - The PISA for Development (PISA-D) project aims to make PISA more accessible and relevant to middle- and low-income countries by introducing new features to the assessment, including tests that are specially designed to measure lower levels of performance, contextual questionnaires that better reflect the situations of 15-year-olds across a diverse group of countries, and approaches to include out-of-school youth. The PISA-D school-based tests and contextual questionnaires are being piloted in eight countries: Bhutan, Cambodia, Ecuador, Guatemala, Honduras, Paraguay, Senegal, and Zambia. The field trial of the school-based assessment instruments took place from August to December 2016 in seven countries. Based on results of the field trial, the instruments and survey operations were modified as necessary for the main study. The PISA-D school-based assessment field trial reveals that the instruments work as intended. Findings from the analysis of the PISA-D cognitive test field trial data are organised around three major goals and are summarised in the table provided. The test covers reading, mathematics and science. Findings include: (1) The results of the field trial of the PISA for Development (PISA-D) school-based component confirm that the initiative is on track to deliver an assessment that is more relevant to middleand low-income countries; (2) PISA-D instruments work: they capture a wider range of student performance and the diverse contexts found in middle- and low-income countries while ensuring that results are comparable to those of the main PISA test; and (3) Lessons from the field trial are used to inform preparations for the main data collection, which will take place from August to December 2017.\r\nPT  - Reports - Research\r\nPT  - Reports - Evaluative\r\n\r\nOWN - ERIC\r\nTI  - From Here to There! Elementary: A Game-Based Approach to Developing Number Sense and Early Algebraic Understanding\r\nAU  - Hulse, Taylyn\r\nAU  - Daigle, Maria\r\nAU  - Manzo, Daniel\r\nAU  - Braith, Lindsay\r\nAU  - Harrison, Avery\r\nAU  - Ottmar, Erin\r\nOT  - Mathematics Instruction\r\nOT  - Educational Technology\r\nOT  - Technology Uses in Education\r\nOT  - Algebra\r\nOT  - Mathematical Concepts\r\nOT  - Concept Formation\r\nOT  - Educational Games\r\nOT  - Interaction\r\nOT  - Problem Solving\r\nOT  - Student Behavior\r\nOT  - Teaching Methods\r\nOT  - Instructional Effectiveness\r\nOT  - Mathematics Achievement\r\nJT  - Educational Technology Research and Development\r\nSO  - v67 n2 p423-441 Apr 2019\r\nAID - http://dx.doi.org/10.1007/s11423-019-09653-8\r\nOID - EJ1208101\r\nVI  - 67\r\nIP  - 2\r\nPG  - 423-441\r\nDP  - Apr 2019\r\nLID - http://eric.ed.gov/?id=EJ1208101\r\nAB  - This paper examines whether using \"From Here to There!\" (FH2T:E), a dynamic game-based mathematics learning technology relates to improved early algebraic understanding. We use student log files within FH2T to explore the possible benefits of student behaviors and gamification on learning gains. Using in app measures of student interactions (mouse clicks, resets, errors, problem solving steps, and completions), 19 variables were identified to summarize overall problem solving processes. An exploratory factor analysis identified five clear factors including engagement in problem solving, progress, strategic flexibility, strategic efficiency, and speed. Regression analyses reveal that after accounting for behavior within the app, playing the gamified version of the app contributed to higher learning gains than playing a nongamified version. Next, completing more problems within the game related to higher achievement on the post-test. Third, two significant interactions were found between progress and prior knowledge and engagement in problem solving and prior knowledge, where low performing students gained more when they completed more problems and engaged more with those problems.\r\nISSN - ISSN-1042-1629\r\nLA  - English\r\nPT  - Reports - Research\r\nPT  - Reports - Evaluative\r\n\r\nOWN - ERIC\r\nTI  - International Comparative Assessments: Broadening the Interpretability, Application and Relevance to the United States. Research in Review 2012-5\r\nAU  - Di Giacomo, F. Tony\r\nAU  - Fishbein, Bethany G.\r\nAU  - Buckley, Vanessa W.\r\nOT  - Comparative Testing\r\nOT  - International Assessment\r\nOT  - Relevance (Education)\r\nOT  - Testing Programs\r\nOT  - Program Descriptions\r\nOT  - Best Practices\r\nOT  - Adoption (Ideas)\r\nOT  - Technology Transfer\r\nOT  - Economic Impact\r\nOT  - Academic Achievement\r\nOT  - Educational Assessment\r\nOT  - Educational Indicators\r\nOT  - Comparative Education\r\nOT  - Comparative Analysis\r\nOT  - Common Core State Standards\r\nOT  - Educational Policy\r\nOT  - Tables (Data)\r\nOT  - Educational Change\r\nOT  - Educational Practices\r\nOT  - National Competency Tests\r\nOT  - Foreign Countries\r\nOT  - Mathematics Tests\r\nOT  - Science Tests\r\nOT  - Mathematics Achievement\r\nOT  - Elementary Secondary Education\r\nOT  - Science Achievement\r\nOT  - Reading Tests\r\nOT  - Achievement Tests\r\nOT  - Reading Achievement\r\nOT  - Grade 4\r\nJT  - College Board\r\nOID - ED562752\r\nDP  - 2013\r\nLID - http://eric.ed.gov/?id=ED562752\r\nAB  - Many articles and reports have reviewed, researched, and commented on international assessments from the perspective of exploring what is relevant for the United States' education systems. Researchers make claims about whether the top-performing systems have transferable practices or policies that could be applied to the United States. However, looking only at top-performing education systems may omit important knowledge that could be applied from countries with similar demographic, geographic, linguistic, or economic characteristics--even if these countries do not perform highly on comparative assessments. Moreover, by exploring only the top performers, a presumption exists that these international assessments are in alignment with a country's curricular, pedagogic, political, and economic goals, which may falsely lead to the conclusion that by copying top performers, test scores would invariably increase and also meet the nation's needs. While international comparative assessments can be valuable when developing national or state policies, the way in which they are interpreted can be broadened cautiously to better inform their interpretability, relevance, and application to countries such as the United States--all while considering the purpose of each international assessment in the context of a nation's priorities. Ultimately, this report serves as a reference guide for various international assessments, as well as a review of literature that explores a possible relationship between national economies and international assessment performance. In addition, this review will discuss how policymakers might use international assessment results from various systems to adapt successful policies in the United States. Tables are appended.\r\nPT  - Reports - Evaluative\r\nPT  - Information Analyses\r\nPT  - Reports - Research\r\n\r\nOWN - ERIC\r\nTI  - A Test of the Test of Problem Solving (TOPS).\r\nAU  - Bernhardt, Barbara\r\nOT  - Content Validity\r\nOT  - Elementary Education\r\nOT  - Language Handicaps\r\nOT  - Language Tests\r\nOT  - Linguistics\r\nOT  - Problem Solving\r\nOT  - Semantics\r\nOT  - Speech Therapy\r\nOT  - Test Validity\r\nOT  - Thinking Skills\r\nJT  - Language, Speech, and Hearing Services in Schools\r\nSO  - v21 n2 p98-101 Apr 1990\r\nOID - EJ410320\r\nVI  - 21\r\nIP  - 2\r\nPG  - 98-101\r\nDP  - Apr 1990\r\nLID - http://eric.ed.gov/?id=EJ410320\r\nAB  - The Test of Problem Solving (TOPS) was evaluated by 20 speech-language clinicians based on designer claims that the test assesses integration of semantic, linguistic, and reasoning ability and taps skills needed for academic and social acceptance. Results challenged the content validity of the test. (Author/DB)\r\nPT  - Journal Articles\r\nPT  - Reports - Research\r\nPT  - Reports - Evaluative\r\n\r\n",
		"items": [
			{
				"itemType": "report",
				"title": "Findings from the PISA for Development Field Trial of the School-Based Assessment. PISA for Development Brief 16",
				"creators": [],
				"date": "2017",
				"abstractNote": "The PISA for Development (PISA-D) project aims to make PISA more accessible and relevant to middle- and low-income countries by introducing new features to the assessment, including tests that are specially designed to measure lower levels of performance, contextual questionnaires that better reflect the situations of 15-year-olds across a diverse group of countries, and approaches to include out-of-school youth. The PISA-D school-based tests and contextual questionnaires are being piloted in eight countries: Bhutan, Cambodia, Ecuador, Guatemala, Honduras, Paraguay, Senegal, and Zambia. The field trial of the school-based assessment instruments took place from August to December 2016 in seven countries. Based on results of the field trial, the instruments and survey operations were modified as necessary for the main study. The PISA-D school-based assessment field trial reveals that the instruments work as intended. Findings from the analysis of the PISA-D cognitive test field trial data are organised around three major goals and are summarised in the table provided. The test covers reading, mathematics and science. Findings include: (1) The results of the field trial of the PISA for Development (PISA-D) school-based component confirm that the initiative is on track to deliver an assessment that is more relevant to middleand low-income countries; (2) PISA-D instruments work: they capture a wider range of student performance and the diverse contexts found in middle- and low-income countries while ensuring that results are comparable to those of the main PISA test; and (3) Lessons from the field trial are used to inform preparations for the main data collection, which will take place from August to December 2017.",
				"extra": "ERIC Number: ED576982",
				"institution": "OECD Publishing",
				"attachments": [
					{
						"title": "Catalog Link",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Achievement Tests"
					},
					{
						"tag": "Cognitive Tests"
					},
					{
						"tag": "Developing Nations"
					},
					{
						"tag": "Educational Assessment"
					},
					{
						"tag": "Field Tests"
					},
					{
						"tag": "Foreign Countries"
					},
					{
						"tag": "International Assessment"
					},
					{
						"tag": "Mathematics Tests"
					},
					{
						"tag": "Reading Tests"
					},
					{
						"tag": "Science Tests"
					},
					{
						"tag": "Secondary School Students"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "From Here to There! Elementary: A Game-Based Approach to Developing Number Sense and Early Algebraic Understanding",
				"creators": [
					{
						"firstName": "Taylyn",
						"lastName": "Hulse",
						"creatorType": "author"
					},
					{
						"firstName": "Maria",
						"lastName": "Daigle",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel",
						"lastName": "Manzo",
						"creatorType": "author"
					},
					{
						"firstName": "Lindsay",
						"lastName": "Braith",
						"creatorType": "author"
					},
					{
						"firstName": "Avery",
						"lastName": "Harrison",
						"creatorType": "author"
					},
					{
						"firstName": "Erin",
						"lastName": "Ottmar",
						"creatorType": "author"
					}
				],
				"date": "Apr 2019",
				"ISSN": "1042-1629",
				"abstractNote": "This paper examines whether using \"From Here to There!\" (FH2T:E), a dynamic game-based mathematics learning technology relates to improved early algebraic understanding. We use student log files within FH2T to explore the possible benefits of student behaviors and gamification on learning gains. Using in app measures of student interactions (mouse clicks, resets, errors, problem solving steps, and completions), 19 variables were identified to summarize overall problem solving processes. An exploratory factor analysis identified five clear factors including engagement in problem solving, progress, strategic flexibility, strategic efficiency, and speed. Regression analyses reveal that after accounting for behavior within the app, playing the gamified version of the app contributed to higher learning gains than playing a nongamified version. Next, completing more problems within the game related to higher achievement on the post-test. Third, two significant interactions were found between progress and prior knowledge and engagement in problem solving and prior knowledge, where low performing students gained more when they completed more problems and engaged more with those problems.",
				"extra": "ERIC Number: EJ1208101",
				"issue": "2",
				"language": "English",
				"pages": "423-441",
				"publicationTitle": "Educational Technology Research and Development",
				"volume": "67",
				"attachments": [
					{
						"title": "Catalog Link",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Algebra"
					},
					{
						"tag": "Concept Formation"
					},
					{
						"tag": "Educational Games"
					},
					{
						"tag": "Educational Technology"
					},
					{
						"tag": "Instructional Effectiveness"
					},
					{
						"tag": "Interaction"
					},
					{
						"tag": "Mathematical Concepts"
					},
					{
						"tag": "Mathematics Achievement"
					},
					{
						"tag": "Mathematics Instruction"
					},
					{
						"tag": "Problem Solving"
					},
					{
						"tag": "Student Behavior"
					},
					{
						"tag": "Teaching Methods"
					},
					{
						"tag": "Technology Uses in Education"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "report",
				"title": "International Comparative Assessments: Broadening the Interpretability, Application and Relevance to the United States. Research in Review 2012-5",
				"creators": [
					{
						"firstName": "F. Tony",
						"lastName": "Di Giacomo",
						"creatorType": "author"
					},
					{
						"firstName": "Bethany G.",
						"lastName": "Fishbein",
						"creatorType": "author"
					},
					{
						"firstName": "Vanessa W.",
						"lastName": "Buckley",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"abstractNote": "Many articles and reports have reviewed, researched, and commented on international assessments from the perspective of exploring what is relevant for the United States' education systems. Researchers make claims about whether the top-performing systems have transferable practices or policies that could be applied to the United States. However, looking only at top-performing education systems may omit important knowledge that could be applied from countries with similar demographic, geographic, linguistic, or economic characteristics--even if these countries do not perform highly on comparative assessments. Moreover, by exploring only the top performers, a presumption exists that these international assessments are in alignment with a country's curricular, pedagogic, political, and economic goals, which may falsely lead to the conclusion that by copying top performers, test scores would invariably increase and also meet the nation's needs. While international comparative assessments can be valuable when developing national or state policies, the way in which they are interpreted can be broadened cautiously to better inform their interpretability, relevance, and application to countries such as the United States--all while considering the purpose of each international assessment in the context of a nation's priorities. Ultimately, this report serves as a reference guide for various international assessments, as well as a review of literature that explores a possible relationship between national economies and international assessment performance. In addition, this review will discuss how policymakers might use international assessment results from various systems to adapt successful policies in the United States. Tables are appended.",
				"extra": "ERIC Number: ED562752",
				"institution": "College Board",
				"attachments": [
					{
						"title": "Catalog Link",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Academic Achievement"
					},
					{
						"tag": "Achievement Tests"
					},
					{
						"tag": "Adoption (Ideas)"
					},
					{
						"tag": "Best Practices"
					},
					{
						"tag": "Common Core State Standards"
					},
					{
						"tag": "Comparative Analysis"
					},
					{
						"tag": "Comparative Education"
					},
					{
						"tag": "Comparative Testing"
					},
					{
						"tag": "Economic Impact"
					},
					{
						"tag": "Educational Assessment"
					},
					{
						"tag": "Educational Change"
					},
					{
						"tag": "Educational Indicators"
					},
					{
						"tag": "Educational Policy"
					},
					{
						"tag": "Educational Practices"
					},
					{
						"tag": "Elementary Secondary Education"
					},
					{
						"tag": "Foreign Countries"
					},
					{
						"tag": "Grade 4"
					},
					{
						"tag": "International Assessment"
					},
					{
						"tag": "Mathematics Achievement"
					},
					{
						"tag": "Mathematics Tests"
					},
					{
						"tag": "National Competency Tests"
					},
					{
						"tag": "Program Descriptions"
					},
					{
						"tag": "Reading Achievement"
					},
					{
						"tag": "Reading Tests"
					},
					{
						"tag": "Relevance (Education)"
					},
					{
						"tag": "Science Achievement"
					},
					{
						"tag": "Science Tests"
					},
					{
						"tag": "Tables (Data)"
					},
					{
						"tag": "Technology Transfer"
					},
					{
						"tag": "Testing Programs"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "A Test of the Test of Problem Solving (TOPS).",
				"creators": [
					{
						"firstName": "Barbara",
						"lastName": "Bernhardt",
						"creatorType": "author"
					}
				],
				"date": "Apr 1990",
				"abstractNote": "The Test of Problem Solving (TOPS) was evaluated by 20 speech-language clinicians based on designer claims that the test assesses integration of semantic, linguistic, and reasoning ability and taps skills needed for academic and social acceptance. Results challenged the content validity of the test. (Author/DB)",
				"extra": "ERIC Number: EJ410320",
				"issue": "2",
				"pages": "98-101",
				"publicationTitle": "Language, Speech, and Hearing Services in Schools",
				"volume": "21",
				"attachments": [
					{
						"title": "Catalog Link",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Content Validity"
					},
					{
						"tag": "Elementary Education"
					},
					{
						"tag": "Language Handicaps"
					},
					{
						"tag": "Language Tests"
					},
					{
						"tag": "Linguistics"
					},
					{
						"tag": "Problem Solving"
					},
					{
						"tag": "Semantics"
					},
					{
						"tag": "Speech Therapy"
					},
					{
						"tag": "Test Validity"
					},
					{
						"tag": "Thinking Skills"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "OWN - ERIC\r\nTI  - Tests of Robustness in Peer Review\r\nAU  - Leipzig, Jeremy\r\nOT  - Robustness (Statistics)\r\nOT  - Peer Evaluation\r\nOT  - Data Analysis\r\nOT  - Computer Software\r\nOT  - Evaluation Methods\r\nOT  - Research Methodology\r\nJT  - ProQuest LLC\r\nSO  - Ph.D. Dissertation, Drexel University\r\nAID - http://gateway.proquest.com/openurl?url_ver=Z39.88-2004&rft_val_fmt=info:ofi/fmt:kev:mtx:dissertation&res_dat=xri:pqm&rft_dat=xri:pqdiss:28967820\r\nOID - ED620611\r\nDP  - 2021\r\nLID - http://eric.ed.gov/?id=ED620611\r\nAB  - Purpose: The purpose of this dissertation is to investigate the feasibility of using tests of robustness in peer review. This study involved selecting three high-impact papers which featured open data and utilized bioinformatic analyses but provided no source code and refactoring these to allow external survey participants to swap tools, parameters, and data subsets to evaluate the robustness and underlying validity of these analyses. Technical advances that have taken place in recent years--scientific computing infrastructure has matured to support the distribution of reproducible computational analyses--enable this approach. These advances, along with cultural shifts encompassing open data and open code initiatives, promise to address technical stumbling blocks that have contributed to the \"reproducibility crisis.\" To take full advantage of these developments toward improving scientific quality, authors, reviewers, and publishers must integrate reproducible analysis into the peer review process. Seven existing major case study types - reproduction, replication, refactor, robustness test, survey, census, and case narrative - have been invaluable toward establishing reproducibility as a serious and independent area of research. Of particular interest are refactors, in which an existing analysis with abstract methods is reimplemented by a third party, and robustness tests, which involve the manipulation of tools, parameters, and data to assess the scientific validity of an analysis. This thesis describes efforts to test the feasibility of robustness testing in the context of in silico peer review. The contributions described are complemented with extensive source code. Design and Methods: A multi-method approach was employed for this study consisting of user surveys and tests of robustness--hands-on, self-directed software development exercises. Three high-impact genomics publications with open data, but no source code, were selected, refactored, and distributed to active study participants who acted as quasi-external reviewers. The process of the refactor was used to evaluate the limitations of reproducibility using conventional tools and to study how best to present analyses for peer review, and the tests of robustness were employed under the hypothesis this practice would help to evaluate the underlying validity of an analysis. Three different approaches were taken in these tests of robustness--a faithful reproduction of the original manuscript into a framework that could be manipulated by participants, a workflow-library approach in which participants were encouraged to employ modern \"off-the-shelf\" pre-built pipelines to triangulate tests, and an advisor-led approach in which senior experts suggested alternate tools to be implemented and I generated a report for their evaluation. Findings: The refactors and tests of robustness produced numerous discoveries both in terms of the underlying scientific content and, more importantly, into the strengths and weakness of the three robustness approaches (faithful/workflow-library/advisor-led) and pain points in the analytic stack, which may be addressed with appropriate software and metadata. The principal findings are that the faithful approach may often discourage aggressive robustness testing because of the inertia imposed by the existing framework, the workflow-library approach is efficient but can prove inconclusive, and the advisor-led approach may be most practical for journals but requires a higher level of communication to be effective. The vast majority of time in all these refactors was spent on sample metadata management, particularly organizing sample groups of biological and technical replicates to produce the numerous and varied tool input manifests. Practical Implications: Reproducibility-enabled in silico peer review is substantially more time-consuming than traditional manuscript peer review and will require economic, cultural, and technical change to bring to reality. The work presented here could contribute to developing new models to minimize the increased effort of this type of peer review while incentivizing reproducibility. Value: This study provides practical guidance toward designing the future of reproducibility-enabled in silico peer review, which is a logical extension of the computational reproducibility afforded by technical advances in dependency management, containerization, pipeline frameworks, and notebooks. [The dissertation citations contained here are published with the permission of ProQuest LLC. Further reproduction is prohibited without permission. Copies of dissertations may be obtained by Telephone (800) 1-800-521-0600. Web page: http://www.proquest.com/en-US/products/dissertations/individuals.shtml.]\r\nISBN - 979-8-2098-8762-1\r\nISSN - EISSN-\r\nLA  - English\r\nPT  - Dissertations/Theses - Doctoral Dissertations\r\n\r\n\r\n\r\nOWN - ERIC\r\nTI  - Evidence-Based Instructional Strategies for Transition. Brookes Transition to Adulthood Series\r\nAU  - Test, David W.\r\nOT  - Adolescents\r\nOT  - Young Adults\r\nOT  - Disabilities\r\nOT  - Transitional Programs\r\nOT  - Special Education Teachers\r\nOT  - School Counselors\r\nOT  - Specialists\r\nOT  - Related Services (Special Education)\r\nOT  - Alignment (Education)\r\nOT  - Student Needs\r\nOT  - Student Interests\r\nOT  - Informal Assessment\r\nOT  - Educational Objectives\r\nOT  - Skill Development\r\nOT  - Job Application\r\nOT  - Interpersonal Competence\r\nOT  - Instructional Effectiveness\r\nOT  - Educational Strategies\r\nOT  - Family Involvement\r\nOT  - Evidence\r\nJT  - Brookes Publishing Company\r\nAID - http://www.brookespublishing.com/store/books/test-71929/index.htm\r\nOID - ED529121\r\nDP  - 2012\r\nLID - http://eric.ed.gov/?id=ED529121\r\nAB  - To meet the high-stakes requirements of IDEA's Indicator 13, professionals need proven and practical ways to support successful transitions for young adults with significant disabilities. Now there's a single guidebook to help them meet that critical goal--straight from David Test, one of today's most highly respected authorities on transitions to adulthood. Packed with down-to-earth, immediately useful transition strategies, this book has the evidence-based guidance readers need to help students with moderate and severe disabilities prepare for every aspect of adult life, from applying for a job to improving social skills. Special educators, transition specialists, guidance counselors, and other professionals will discover how to: (1) align instruction with IDEA requirements; (2) pinpoint student needs and interests with formal and informal assessment strategies; (3) strengthen IEPs with measurable, relevant, and specific postsecondary goals; (4) teach students the skills needed to succeed; (5) use the most effective instructional strategies, such as mnemonics, response prompting, peer assistance, visual displays, and computer-assisted instruction; (6) assess effectiveness of instruction; (7) increase student and family involvement in transition planning--the best way to ensure positive outcomes that reflect a student's individual choices. Readers will help make transition as seamless as possible with practical materials that guide the planning process, including IEP templates and worksheets, checklists and key questions, thumbnails of key research studies, and sample scenarios that show teaching strategies in action. An essential road map for all professionals involved in transition planning, this book will help ensure that students with moderate and severe disabilities reach their destination: a successful adult life that reflects their goals and dreams. Contents of this book include: (1) Transition-Focused Education (David W. Test); (2) Transition Assessment for Instruction (Dawn A. Rowe, Larry Kortering, and David W. Test); (3) Teaching Strategies (Sharon M. Richter, April L. Mustian, and David W. Test); (4) Data Collection Strategies (Valerie L. Mazzotti and David W. Test); (5) Student-Focused Planning (Nicole Uphold and Melissa Hudson); (6) Student Development: Employment Skills (Allison Walker and Audrey Bartholomew); (7) Bound for Success: Teaching Life Skills (April L. Mustian and Sharon L. Richter); and (8) Strategies for Teaching Academic Skills (Allison Walker and Kelly Kelley). An index is included.\r\nISBN - ISBN-978-1-5985-7192-9\r\nPT  - Books\r\nPT  - Collected Works - General",
		"items": [
			{
				"itemType": "thesis",
				"title": "Tests of Robustness in Peer Review",
				"creators": [
					{
						"firstName": "Jeremy",
						"lastName": "Leipzig",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"abstractNote": "Purpose: The purpose of this dissertation is to investigate the feasibility of using tests of robustness in peer review. This study involved selecting three high-impact papers which featured open data and utilized bioinformatic analyses but provided no source code and refactoring these to allow external survey participants to swap tools, parameters, and data subsets to evaluate the robustness and underlying validity of these analyses. Technical advances that have taken place in recent years--scientific computing infrastructure has matured to support the distribution of reproducible computational analyses--enable this approach. These advances, along with cultural shifts encompassing open data and open code initiatives, promise to address technical stumbling blocks that have contributed to the \"reproducibility crisis.\" To take full advantage of these developments toward improving scientific quality, authors, reviewers, and publishers must integrate reproducible analysis into the peer review process. Seven existing major case study types - reproduction, replication, refactor, robustness test, survey, census, and case narrative - have been invaluable toward establishing reproducibility as a serious and independent area of research. Of particular interest are refactors, in which an existing analysis with abstract methods is reimplemented by a third party, and robustness tests, which involve the manipulation of tools, parameters, and data to assess the scientific validity of an analysis. This thesis describes efforts to test the feasibility of robustness testing in the context of in silico peer review. The contributions described are complemented with extensive source code. Design and Methods: A multi-method approach was employed for this study consisting of user surveys and tests of robustness--hands-on, self-directed software development exercises. Three high-impact genomics publications with open data, but no source code, were selected, refactored, and distributed to active study participants who acted as quasi-external reviewers. The process of the refactor was used to evaluate the limitations of reproducibility using conventional tools and to study how best to present analyses for peer review, and the tests of robustness were employed under the hypothesis this practice would help to evaluate the underlying validity of an analysis. Three different approaches were taken in these tests of robustness--a faithful reproduction of the original manuscript into a framework that could be manipulated by participants, a workflow-library approach in which participants were encouraged to employ modern \"off-the-shelf\" pre-built pipelines to triangulate tests, and an advisor-led approach in which senior experts suggested alternate tools to be implemented and I generated a report for their evaluation. Findings: The refactors and tests of robustness produced numerous discoveries both in terms of the underlying scientific content and, more importantly, into the strengths and weakness of the three robustness approaches (faithful/workflow-library/advisor-led) and pain points in the analytic stack, which may be addressed with appropriate software and metadata. The principal findings are that the faithful approach may often discourage aggressive robustness testing because of the inertia imposed by the existing framework, the workflow-library approach is efficient but can prove inconclusive, and the advisor-led approach may be most practical for journals but requires a higher level of communication to be effective. The vast majority of time in all these refactors was spent on sample metadata management, particularly organizing sample groups of biological and technical replicates to produce the numerous and varied tool input manifests. Practical Implications: Reproducibility-enabled in silico peer review is substantially more time-consuming than traditional manuscript peer review and will require economic, cultural, and technical change to bring to reality. The work presented here could contribute to developing new models to minimize the increased effort of this type of peer review while incentivizing reproducibility. Value: This study provides practical guidance toward designing the future of reproducibility-enabled in silico peer review, which is a logical extension of the computational reproducibility afforded by technical advances in dependency management, containerization, pipeline frameworks, and notebooks. [The dissertation citations contained here are published with the permission of ProQuest LLC. Further reproduction is prohibited without permission. Copies of dissertations may be obtained by Telephone (800) 1-800-521-0600. Web page: http://www.proquest.com/en-US/products/dissertations/individuals.shtml.]",
				"archive": "ProQuest LLC",
				"extra": "ERIC Number: ED620611",
				"language": "English",
				"university": "Drexel University",
				"attachments": [
					{
						"title": "Catalog Link",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Computer Software"
					},
					{
						"tag": "Data Analysis"
					},
					{
						"tag": "Evaluation Methods"
					},
					{
						"tag": "Peer Evaluation"
					},
					{
						"tag": "Research Methodology"
					},
					{
						"tag": "Robustness (Statistics)"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "David W.",
						"lastName": "Test",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"ISBN": "9781598571929",
				"abstractNote": "To meet the high-stakes requirements of IDEA's Indicator 13, professionals need proven and practical ways to support successful transitions for young adults with significant disabilities. Now there's a single guidebook to help them meet that critical goal--straight from David Test, one of today's most highly respected authorities on transitions to adulthood. Packed with down-to-earth, immediately useful transition strategies, this book has the evidence-based guidance readers need to help students with moderate and severe disabilities prepare for every aspect of adult life, from applying for a job to improving social skills. Special educators, transition specialists, guidance counselors, and other professionals will discover how to: (1) align instruction with IDEA requirements; (2) pinpoint student needs and interests with formal and informal assessment strategies; (3) strengthen IEPs with measurable, relevant, and specific postsecondary goals; (4) teach students the skills needed to succeed; (5) use the most effective instructional strategies, such as mnemonics, response prompting, peer assistance, visual displays, and computer-assisted instruction; (6) assess effectiveness of instruction; (7) increase student and family involvement in transition planning--the best way to ensure positive outcomes that reflect a student's individual choices. Readers will help make transition as seamless as possible with practical materials that guide the planning process, including IEP templates and worksheets, checklists and key questions, thumbnails of key research studies, and sample scenarios that show teaching strategies in action. An essential road map for all professionals involved in transition planning, this book will help ensure that students with moderate and severe disabilities reach their destination: a successful adult life that reflects their goals and dreams. Contents of this book include: (1) Transition-Focused Education (David W. Test); (2) Transition Assessment for Instruction (Dawn A. Rowe, Larry Kortering, and David W. Test); (3) Teaching Strategies (Sharon M. Richter, April L. Mustian, and David W. Test); (4) Data Collection Strategies (Valerie L. Mazzotti and David W. Test); (5) Student-Focused Planning (Nicole Uphold and Melissa Hudson); (6) Student Development: Employment Skills (Allison Walker and Audrey Bartholomew); (7) Bound for Success: Teaching Life Skills (April L. Mustian and Sharon L. Richter); and (8) Strategies for Teaching Academic Skills (Allison Walker and Kelly Kelley). An index is included.",
				"extra": "ERIC Number: ED529121",
				"publisher": "Brookes Publishing Company",
				"attachments": [
					{
						"title": "Catalog Link",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Adolescents"
					},
					{
						"tag": "Alignment (Education)"
					},
					{
						"tag": "Disabilities"
					},
					{
						"tag": "Educational Objectives"
					},
					{
						"tag": "Educational Strategies"
					},
					{
						"tag": "Evidence"
					},
					{
						"tag": "Family Involvement"
					},
					{
						"tag": "Informal Assessment"
					},
					{
						"tag": "Instructional Effectiveness"
					},
					{
						"tag": "Interpersonal Competence"
					},
					{
						"tag": "Job Application"
					},
					{
						"tag": "Related Services (Special Education)"
					},
					{
						"tag": "School Counselors"
					},
					{
						"tag": "Skill Development"
					},
					{
						"tag": "Special Education Teachers"
					},
					{
						"tag": "Specialists"
					},
					{
						"tag": "Student Interests"
					},
					{
						"tag": "Student Needs"
					},
					{
						"tag": "Transitional Programs"
					},
					{
						"tag": "Young Adults"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "PMID- 36216673\r\nOWN - NLM\r\nSTAT- Publisher\r\nLR  - 20221010\r\nIS  - 1545-1534 (Electronic)\r\nIS  - 1080-6032 (Linking)\r\nDP  - 2022 Oct 7\r\nTI  - Lichtenberg Figures: How a Cutaneous Sign Can Solve Suspicious Death Cases.\r\nLID - S1080-6032(22)00139-9 [pii]\r\nLID - 10.1016/j.wem.2022.07.008 [doi]\r\nAB  - Lightning is a natural weather phenomenon that occurs most commonly during the \r\n      summer months in the afternoon or early evening. Lightning strikes can cause \r\n      accidental deaths. In developed countries, lightning fatalities occur almost \r\n      exclusively outdoors. Deaths from lightning may be in remote places with no \r\n      witnesses. Forensic pathologists may not be able to reach the scene of death \r\n      because it is too hazardous or inaccessible. Bodies may have neither evidence of \r\n      skin burns nor torn areas on their clothes. The presumption of accidental death \r\n      may be difficult to prove. We present 3 cases in which neither the examination of \r\n      the death scene nor the examination of the bodies by those who attested to the \r\n      death were performed. The bodies were transported to the morgue for a forensic \r\n      autopsy because the deaths were considered suspicious. Physicians who attest to \r\n      death in open spaces during weather that could produce lightning should actively \r\n      search for Lichtenberg figures, which are considered irrefutable proof of fatal \r\n      lightning in such settings. They should also photograph them and submit them as \r\n      evidence. Nevertheless, physicians should keep in mind that Lichtenberg figures \r\n      are not considered pathognomonic of lightning because some skin manifestations \r\n      may mimic them.\r\nCI  - Copyright © 2022 Wilderness Medical Society. Published by Elsevier Inc. All \r\n      rights reserved.\r\nFAU - Manoubi, Syrine Azza\r\nAU  - Manoubi SA\r\nAD  - Universite de Tunis El Manar Faculte de Medecine de Tunis, Tunis, Tunisia. \r\n      Electronic address: syrine.manoubi.lajmi@gmail.com.\r\nFAU - Shimi, Maha\r\nAU  - Shimi M\r\nAD  - Universite de Tunis El Manar Faculte de Medecine de Tunis, Tunis, Tunisia.\r\nFAU - Gharbaoui, Meriem\r\nAU  - Gharbaoui M\r\nAD  - Universite de Tunis El Manar Faculte de Medecine de Tunis, Tunis, Tunisia.\r\nFAU - Allouche, Mohamed\r\nAU  - Allouche M\r\nAD  - Universite de Tunis El Manar Faculte de Medecine de Tunis, Tunis, Tunisia.\r\nLA  - eng\r\nPT  - Case Reports\r\nDEP - 20221007\r\nPL  - United States\r\nTA  - Wilderness Environ Med\r\nJT  - Wilderness & environmental medicine\r\nJID - 9505185\r\nSB  - IM\r\nOTO - NOTNLM\r\nOT  - autopsy\r\nOT  - forensic pathology\r\nOT  - lightning injury\r\nOT  - natural disaster\r\nOT  - skin manifestation\r\nEDAT- 2022/10/11 06:00\r\nMHDA- 2022/10/11 06:00\r\nCRDT- 2022/10/10 22:05\r\nPHST- 2022/03/21 00:00 [received]\r\nPHST- 2022/07/02 00:00 [revised]\r\nPHST- 2022/07/14 00:00 [accepted]\r\nPHST- 2022/10/10 22:05 [entrez]\r\nPHST- 2022/10/11 06:00 [pubmed]\r\nPHST- 2022/10/11 06:00 [medline]\r\nAID - S1080-6032(22)00139-9 [pii]\r\nAID - 10.1016/j.wem.2022.07.008 [doi]\r\nPST - aheadofprint\r\nSO  - Wilderness Environ Med. 2022 Oct 7:S1080-6032(22)00139-9. doi: \r\n      10.1016/j.wem.2022.07.008.\r\n",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Lichtenberg Figures: How a Cutaneous Sign Can Solve Suspicious Death Cases.",
				"creators": [
					{
						"firstName": "Syrine Azza",
						"lastName": "Manoubi",
						"creatorType": "author"
					},
					{
						"firstName": "Maha",
						"lastName": "Shimi",
						"creatorType": "author"
					},
					{
						"firstName": "Meriem",
						"lastName": "Gharbaoui",
						"creatorType": "author"
					},
					{
						"firstName": "Mohamed",
						"lastName": "Allouche",
						"creatorType": "author"
					}
				],
				"date": "2022 Oct 7",
				"DOI": "10.1016/j.wem.2022.07.008",
				"ISSN": "1545-1534 1080-6032",
				"abstractNote": "Lightning is a natural weather phenomenon that occurs most commonly during the summer months in the afternoon or early evening. Lightning strikes can cause  accidental deaths. In developed countries, lightning fatalities occur almost  exclusively outdoors. Deaths from lightning may be in remote places with no  witnesses. Forensic pathologists may not be able to reach the scene of death  because it is too hazardous or inaccessible. Bodies may have neither evidence of  skin burns nor torn areas on their clothes. The presumption of accidental death  may be difficult to prove. We present 3 cases in which neither the examination of  the death scene nor the examination of the bodies by those who attested to the  death were performed. The bodies were transported to the morgue for a forensic  autopsy because the deaths were considered suspicious. Physicians who attest to  death in open spaces during weather that could produce lightning should actively  search for Lichtenberg figures, which are considered irrefutable proof of fatal  lightning in such settings. They should also photograph them and submit them as  evidence. Nevertheless, physicians should keep in mind that Lichtenberg figures  are not considered pathognomonic of lightning because some skin manifestations  may mimic them.",
				"extra": "PMID: 36216673",
				"journalAbbreviation": "Wilderness Environ Med",
				"language": "eng",
				"pages": "S1080-6032(22)00139-9",
				"publicationTitle": "Wilderness & environmental medicine",
				"rights": "Copyright © 2022 Wilderness Medical Society. Published by Elsevier Inc. All rights reserved.",
				"attachments": [],
				"tags": [
					{
						"tag": "autopsy"
					},
					{
						"tag": "forensic pathology"
					},
					{
						"tag": "lightning injury"
					},
					{
						"tag": "natural disaster"
					},
					{
						"tag": "skin manifestation"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
