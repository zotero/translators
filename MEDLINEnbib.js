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
	"lastUpdated": "2022-02-21 17:06:30"
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
	"Book Chapter": "bookSection", // can't find in specs, but is used.
	"Journal Article": "journalArticle",
	"Newspaper Article": "newspaperArticle",
	"Video-Audio Media": "videoRecording",
	"Technical Report": "report",
	"Legal Case": "case",
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
	// Save link to attached link
	else if (tag == "LID") {
		// Pubmed adds all sorts of different IDs in here, so make sure these are URLs
		if (value.startsWith("http")) {
			item.attachments.push({ url: value, title: "Catalog Link", snapshot: false });
		// If the value is tagged as a PII, we can use this as a page number if we have not previously managed to extract one
		} else if (value.includes("[pii]")) item.pagesBackup = value.replace(/\s*\[pii\]/, "");
	}
	else if (tag == "MH" || tag == "OT") {
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
	} while (line !== false && line.search(/^[A-Z0-9]+\s*-/) == -1);

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
		else if (line.search(/^[A-Z0-9]+\s*-/) != -1) {
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
	} else if (item.pagesBackup) item.pages = item.pagesBackup;
	delete item.pagesBackup;
	// check for and remove duplicate ISSNs
	if (item.ISSN && item.ISSN.includes(" ")) {
		let ISSN = item.ISSN.split(/\s/);
		// convert to Set and back
		ISSN = [...new Set(ISSN)];
		item.ISSN = ISSN.join(" ");
	}
	
	// journal article is the fallback item type
	if (!item.itemType) item.itemType = inputTypeMap["Journal Article"];
	// titles for books are mapped to bookTitle
	if (item.itemType == "book") item.title = item.bookTitle;
	item.complete();
}/** BEGIN TEST CASES **/
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
				"ISSN": "EISSN-2375-5636",
				"abstractNote": "When developing a digital test, one of the first decisions that need to be made is which type of Computer-Based Test (CBT) to develop. Six different CBT types are considered here: linear tests, automatically generated tests, computerized adaptive tests, adaptive learning environments, educational simulations, and educational games. The selection of a CBT type needs to be guided by the intended purposes of the test. The test approach determines which purposes can be achieved by using a particular test. Four different test approaches are discussed here: formative assessment, formative evaluation, summative assessment, and summative evaluation. The suitability of each CBT type to measure performance for the different test approaches is evaluated based on four test characteristics: test purpose, test length, level of interest for measurement (student, class, school, system), and test report. This article aims to provide some guidance in the selection of the most appropriate type of CBT.",
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
				"ISSN": "EISSN-2229-0443",
				"abstractNote": "Background: Research on the test-taker perception of assessments has been conducted under the assumption that negative test-taker perception may influence test performance by decreasing test-taking motivation. This assumption, however, has not been verified in the field of language testing. Building on expectancy-value theory, this study explored the relationships between test-taker perception, test-taking motivation, and test performance in the context of a computer-delivered speaking test. Methods: Sixty-four Japanese university students took the TOEIC Speaking test and completed a questionnaire that included statements about their test perception, test-taking motivation, and self-perceived test performance. Five students participated in follow-up interviews. Results: Questionnaire results showed that students regarded the TOEIC Speaking test positively in terms of test validity but showed reservations about computer delivery, and that they felt sufficiently motivated during the test. Interview results revealed various reasons for their reservations about computer delivery and factors that distracted them during the test. According to correlation analysis, the effects of test-taker perception and test-taking motivation seemed to be minimal on test performance, and participants' perception of computer delivery was directly related to test-taking effort, but their perception of test validity seemed to be related to test-taking effort only indirectly through the mediation of perceived test importance. Conclusion: Our findings not only provide empirical evidence for the relationship between test-taker perception and test performance but also highlight the importance of considering test-taker reactions in developing tests.",
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
				"itemType": "journalArticle",
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
				"publicationTitle": "ACT, Inc.",
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
	}
]
/** END TEST CASES **/
