{
	"translatorID": "594ebe3c-90a0-4830-83bc-9502825a6810",
	"label": "Web of Science Tagged",
	"creator": "Michael Berkowitz, Avram Lyon, and contributors",
	"target": "txt",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 1,
	"lastUpdated": "2023-07-17 03:09:44"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2015-2021 Michael Berkowitz, Avram Lyon, and contributors.

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

// Lookup tables
var ITEM_TYPES = {
	// PT values
	J: "journalArticle",
	S: "bookSection", // Not sure
	P: "patent",
	B: "book",
	// DT overrides; not including anything already covered by the above.
	// TODO: Add more implementations for DT values as needed.
	"PROCEEDINGS PAPER": "conferencePaper",
};

var FIELD_MAP = {
	AE: "assignee",
	AB: "abstractNote",
	AR: "pages", // article number
	AW: "url",
	BN: "ISBN",
	BP: "pages", // start page
	CE: "edition",
	CL: "place", // conference location
	CT: "conferenceName",
	// NOTE: CY is conference date, not "issued" (published) date
	DI: "DOI",
	FN: "libraryCatalog", // almost always the database name
	// XXX: what is "GT: Time"?
	IO: "issuingAuthority",
	IS: "issue",
	JI: "journalAbbreviation",
	LA: "language",
	PA: "place",
	PC: "country", // patent country
	PD: "date",
	PG: "numPages",
	PI: "place", // publisher city
	PN: "patentNumber",
	PS: "pages",
	PU: "publisher",
	PV: "place", // place of publication
	PY: "date", // publication year
	UR: "url",
	VL: "volume",
	VN: "versionNumber", // NOTE: "VR" is the version of the export format
	// Title fields,
	SE: "seriesTitle",
	SO: "publicationTitle",
	TI: "title",
};

// Translator detect/do functions

function detectImport() {
	// If we don't find item type (PT or DT) within first 10 non-empty lines,
	// return false; see also RIS.js.
	let line;
	let i = 0;
	while ((line = Zotero.read()) !== false && i < 10) {
		let lineData = splitLine(line);
		if (lineData) {
			i += 1;
			if (["PT", "DT"].includes(lineData[0])) {
				return true;
			}
		}
	}
	return false;
}

function doImport() {
	let map = new ItemMap();

	let line;
	while (!map.terminate && ((line = Z.read()) !== false)) {
		map.scanLine(line);
	}
	// Try saving any leftover fields as an item; this can happen when the last
	// record lacks ER or EF. In that case, we shouldn't throw away the data
	// simply because the file didn't properly end.
	map.save();
	return false;
}

// Utilities

/**
 * Utility for mapping tagged data to item fields
 *
 * @constructor
 */
function ItemMap() {
	// Hold the property => value map for an item.
	this.records = new Map();
	// Cursor to current property
	this.currentKey = null;
	this.terminate = false;
}

ItemMap.prototype = {

	/**
	 * Validate a line and push it into the item map record if it's valid data
	 * line, or do an action if it is one of the special tags (ER and EF).
	 *
	 * This function is strictly concerned with the form of the lines and
	 * converting the line data to key-value pairs. It does not apply any
	 * semantics to the data.
	 *
	 * @param {string} line
	 * @throws {Error} When line fails validation
	 */
	scanLine: function (line) {
		let lineRecord = splitLine(line);
		if (!lineRecord) {
			return;
		}
		let [head, content] = lineRecord;

		if (head === "  ") { // two spaces for line continuation
			if (!this.currentKey) {
				throw new Error(`Dangling line continuation; the rest of line is ${content}`);
			}

			let currentValueArray = this.records.get(this.currentKey);

			if (!Array.isArray(currentValueArray)) {
				// Continued line can be traced to a tag but the tag's field is
				// not initialized. This should not happen and is an internal
				// error.
				throw new Error(`Unexpected uninitialized field at ${this.currentKey} found while handling line continuation`);
			}

			// Add the continued line, if non-empty, into the container for the
			// field value
			if (content) {
				currentValueArray.push(content);
			}
		}
		else { // Not line continuation; a new tag begins.
			if (head === "ER") {
				// End of Record; Save this item and reset for any subsequent
				// items.
				this.save();
				this.reset();
				return;
			}

			if (head === "EF") {
				// End of File; Simply signal the end of processing.
				this.terminate = true;
				return;
			}

			// Double check if there is duplicate tag
			if (this.records.has(head)) {
				// TODO: should it throw?
				Z.debug(`Warning: duplicate tag ${head}; new input field value is ${content}; old value was ${this.records.get(head).toString()}`);
			}

			// Initialize the tag field with a new array to accommodate
			// continued lines
			this.records.set(head, content ? [content] : []);
			this.currentKey = head;
		}
	},

	/**
	 * Create a new Zotero item, populate it using this item map after
	 * normalization, and complete the Zotero item.
	 */
	save: function () {
		this.normalize();

		// Pop the type string from the normalized record
		let type = this.records.get("DT");
		this.records.delete("DT");

		let item = new Z.Item(type);
		let extra = []; // temporary array for holding lines in the extra
		let tagMissed = 0; // number of tags unhandled

		for (let [wosTag, tagValueArray] of this.records) {
			// The array content concatenated into a single string
			let tagValueString = ZU.trimInternal(tagValueArray.join(" "));

			switch (wosTag) {
				// Main authors. After normalization, AF and AU cannot both
				// exist.
				case "AF":
				case "AU":
					addCreator(item, tagValueArray,
						type === "patent" ? "inventor" : "author");
					break;
				// Other types of creators
				case "BE": // Book editor
				case "ED": // Editors
					addCreator(item, tagValueArray, "editor");
					break;
				case "TR":
					addCreator(item, tagValueArray, "translator");
					break;
				case "AA": // Additional Authors
					addCreator(item, tagValueArray, "contributor");
					break;

				// Keywords, ontology terms, etc. as item tags
				case "BD": // broad terms, like DE below
				case "DE": // author-defined keywords
				case "ID": // keywords
				case "IP": // patent category
				case "MC": // Major Concepts or Derwent Manual Code(s)
				case "MQ": // methods, supplies
				case "OR": // organism descriptors
					item.tags.push(...tagValueString.split("; "));
					break;

				// Additional information that becomes lines in the extra field
				case "NO":
					extra.push(`Comments, Corrections, Erratum: ${tagValueString}`);
					break;
				case "NT":
					extra.push(`Notes: ${tagValueString}`);
					break;
				case "UT":
					extra.push(`Web of Science ID: ${tagValueString}`);
					break;

				// ISSN
				case "SN":
					item.ISSN = tagValueArray.join(", ") || undefined;
					break;

				// Title fields (often in all-caps) are turned into Title Case
				// if the pref "capitalizeTitles" is true (default false)
				case "SE":
				case "SO":
				case "TI":
					tagValueString = selectiveTitleCase(tagValueString);
					item[FIELD_MAP[wosTag]] = tagValueString;
					break;
				// The following non-title fields are converted to Title Case
				case "AE": // patent assignee
				case "CT": // conference name
				case "PU": // publisher
					tagValueString = selectiveTitleCase(tagValueString, true/* force */);
					/* NOTE: FALL THROUGH */
				default:
				{
					let itemField = FIELD_MAP[wosTag];
					if (!itemField) { // unknown tag
						Z.debug(`Unhandled tag ${wosTag} => ${tagValueArray}`);
						tagMissed += 1;
					}
					else {
						item[itemField] = tagValueString;
					}
				}
			} // bottom of the switch statement
		}

		if (tagMissed === this.records.size) { // item is not populated
			return;
		}

		if (extra.length) {
			item.extra = extra.join("\n");
		}

		item.complete();
	},

	/**
	 * Reset the internal state of the item map
	 */
	reset: function () {
		this.records.clear();
		this.currentKey = null;
		this.terminate = false;
	},

	/**
	 * Normalize the content of internal records. This must be called only
	 * after all the fields of an item is populated.
	 */
	normalize: function () {
		let r = this.records; // for ergonomics

		// Normalize type. Turn the field value into a Zotero item-type string
		// for convenience because it is always used in a special way, unlike
		// other tags. DT takes precedence over PT.
		// NOTE: After we identify the Zotero type, DT is set and PT deleted.
		let wosType = r.get("DT"); // If DT present, begin with it
		let zoteroType = wosToZoteroType(wosType, "DT");
		if (!zoteroType) {
			wosType = r.get("PT"); // Try PT next if DT not useable
			zoteroType = wosToZoteroType(wosType, "PT");
		}
		if (!zoteroType) {
			Z.debug("Warning: No type found for item; falling back to journal article");
			zoteroType = "journalArticle";
		}
		// Delete PT and set DT to Zotero type
		r.delete("PT");
		r.set("DT", zoteroType);

		// Authors. Use AF in preference to AU.
		if (r.has("AF") && r.has("AU")) {
			r.delete("AU");
		}

		// Normalize pages. If page range present, use it.
		if (r.has("PS")) {
			r.delete("BP"); // begin page
			r.delete("EP"); // end page
		}
		else { // no page range
			let begin = r.get("BP");
			let end = r.get("EP");
			// If BP exists, try construct a page range like "begin-end" if EP
			// exists, or without the "-end" suffix if EP is missing.
			if (begin) {
				let suffix = (end && end[0]) ? `-${end[0]}` : "";
				r.set("PS", [`${begin[0]}${suffix}`]);
				r.delete("BP");
				r.delete("EP");
			}
		}

		// Most electronic journals use article number (AR), but if both
		// article number and pages present, ignore article number.
		if (r.has("AR") && (r.has("PS") || r.has("BP"))) {
			r.delete("AR");
		}

		// Normalize dates. PY refers to the year, and PD is the more detailed
		// date, like month-day ("JAN 1"), month ("JAN"), season ("SPR"),
		// possibly with redundant year.
		if (r.has("PY")) { // year
			if (!r.has("PD")) { // but without PD
				Z.debug(`Using PY ${r.get("PY")} verbatim as date`);
				r.set("PD", r.get("PY"));
			}
			else {
				let year = r.get("PY")[0];
				let pd = r.get("PD")[0];
				if (!pd.includes(year)) { // PD doesn't have redundant year
					Z.debug(`Adding PY ${year} to PD ${pd}`);
					pd += ` ${year}`;
					r.set("PD", [pd]);
				}
			}
			// We have put whatever date details we have into PD, and PY is now
			// redundant
			r.delete("PY");
		}

		// Publisher address; don't use full address if PI (city) is available
		if (r.has("PI")) {
			let city = r.get("PI")[0];
			r.set("PI", [ZU.capitalizeTitle(city, true/* force */)]);
			r.delete("PA");
		}

		// ISSN; consolidate EI (eISSN) into SN
		let issn = [...(r.get("SN") || []), ...(r.get("EI") || [])]
			.filter(Boolean);
		if (issn.length) {
			r.set("SN", issn);
			r.delete("EI");
		}
	},
};

// split line into an array of [tag, tag value] (the latter optional).
function splitLine(line) {
	// First trim line end and strip the line of BOM (U+FEFF) if any, as
	// show in a test case
	// TODO: Use trimEnd() once Z6 support is dropped
	line = line.replace(/\s*$/, '');
	line = line.replace(/\uFEFF/g, "");

	// skip empty line
	if (!line.length) {
		return null;
	}

	// Split line into tag and "content" that comes after the tag.
	// NOTE: When the file doesn't use explicit line-continuation (three
	// spaces), there's ambiguity when the line meant to be continued data
	// happens to match the pattern of a tag-value line.
	let m = line.match(/^( {2}|[A-Z][A-Z0-9])( .+)?$/);
	if (!m) {
		// Z.debug(`Possible continued-line without explicit line continuation: ${line.slice(0, 5)}...`);
		return ["  "/* two spaces */, line];
	}

	return [m[1]/* tag */, m[2] && m[2].trim()/* tag content, or undefined */];
}

// Convenience functions

function addCreator(item, authorArray, authorType) {
	for (let author of authorArray) {
		item.creators.push(stringToCreator(author, authorType));
	}
}

function wosToZoteroType(wosType, debugTag) {
	let zoteroType;
	if (wosType) {
		// case-normalized WoS type string
		let wosTypeNormalized = wosType[0].toUpperCase();

		if (ITEM_TYPES[wosTypeNormalized]) { // value is understood
			Z.debug(`Using ${debugTag} ${wosType} for item type`);
			zoteroType = ITEM_TYPES[wosTypeNormalized];
		}
		else {
			Z.debug(`Ignoring unimplemented ${debugTag} value ${wosType}`);
		}
	}
	return zoteroType;
}

function stringToCreator(author, type) {
	// Strip any parenthesized text
	author = author.replace(/\(.*\)/g, "");
	if (!author.includes(",")) { // as "LAST F", rather than "Last, F"
		author = author.replace(" ", ", "); // replace first space
	}
	return ZU.cleanAuthor(author, type, true/* useComma */);
}

// like ZU.capitalizeTitle but mindful of some words that are often encountered
// in conference or publisher names. This is most useful for cleaning all-cap
// fields that are not titles.
function selectiveTitleCase(string, force) {
	let allCaps = ["ACM", "AIP", "BMC", "BMJ", "CRC"/* CRC Press */, "IEEE", "JAMA", "MDPI", "SAGE", "USA"];
	let wordForms = { IOP: "IoP", PEERJ: "PeerJ", PLOS: "PLoS" };
	for (let word of allCaps) {
		wordForms[word] = word;
	}

	let cleanInput = ZU.trimInternal(string);
	let cleanInputArray = cleanInput.split(" ");

	let arrayLocations = new Map();

	for (let [word, form] of Object.entries(wordForms)) {
		for (let index of indexOfAll(cleanInputArray, word)) {
			arrayLocations.set(index, form);
		}
	}

	let outputArray = ZU.capitalizeTitle(cleanInput, force).split(" ");

	for (let [index, form] of arrayLocations.entries()) {
		outputArray[index] = form;
	}
	return outputArray.join(" ");
}

// Search array for searchElement. Returns an array of indices where
// searchElement appears, or empty array if searchElement is missing.
function indexOfAll(array, searchElement) {
	return array
		.map((elem, index) => (elem === searchElement ? index : null))
		.filter(x => x !== null);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "﻿FN Thomson Reuters Web of Knowledge\nVR 1.0\nPT J\nAU Zelle, Rintze M.\n   Harrison, Jacob C.\n   Pronk, Jack T.\n   van Maris, Antonius J. A.\nTI Anaplerotic Role for Cytosolic Malic Enzyme in Engineered Saccharomyces\n   cerevisiae Strains\nSO APPLIED AND ENVIRONMENTAL MICROBIOLOGY\nVL 77\nIS 3\nBP 732\nEP 738\nDI 10.1128/AEM.02132-10\nPD FEB 2011\nPY 2011\nAB Malic enzyme catalyzes the reversible oxidative decarboxylation of\n   malate to pyruvate and CO(2). The Saccharomyces cerevisiae MAE1 gene\n   encodes a mitochondrial malic enzyme whose proposed physiological roles\n   are related to the oxidative, malate-decarboxylating reaction. Hitherto,\n   the inability of pyruvate carboxylase-negative (Pyc(-)) S. cerevisiae\n   strains to grow on glucose suggested that Mae1p cannot act as a\n   pyruvate-carboxylating, anaplerotic enzyme. In this study, relocation of\n   malic enzyme to the cytosol and creation of thermodynamically favorable\n   conditions for pyruvate carboxylation by metabolic engineering, process\n   design, and adaptive evolution, enabled malic enzyme to act as the sole\n   anaplerotic enzyme in S. cerevisiae. The Escherichia coli NADH-dependent\n   sfcA malic enzyme was expressed in a Pyc(-) S. cerevisiae background.\n   When PDC2, a transcriptional regulator of pyruvate decarboxylase genes,\n   was deleted to increase intracellular pyruvate levels and cells were\n   grown under a CO(2) atmosphere to favor carboxylation, adaptive\n   evolution yielded a strain that grew on glucose (specific growth rate,\n   0.06 +/- 0.01 h(-1)). Growth of the evolved strain was enabled by a\n   single point mutation (Asp336Gly) that switched the cofactor preference\n   of E. coli malic enzyme from NADH to NADPH. Consistently, cytosolic\n   relocalization of the native Mae1p, which can use both NADH and NADPH,\n   in a pyc1,2 Delta pdc2 Delta strain grown under a CO(2) atmosphere, also\n   enabled slow-growth on glucose. Although growth rates of these strains\n   are still low, the higher ATP efficiency of carboxylation via malic\n   enzyme, compared to the pyruvate carboxylase pathway, may contribute to\n   metabolic engineering of S. cerevisiae for anaerobic, high-yield\n   C(4)-dicarboxylic acid production.\nTC 0\nZ9 0\nSN 0099-2240\nUT WOS:000286597100004\nER\n\nPT J\nAU Zelle, Rintze M.\n   Trueheart, Josh\n   Harrison, Jacob C.\n   Pronk, Jack T.\n   van Maris, Antonius J. A.\nTI Phosphoenolpyruvate Carboxykinase as the Sole Anaplerotic Enzyme in\n   Saccharomyces cerevisiae\nSO APPLIED AND ENVIRONMENTAL MICROBIOLOGY\nVL 76\nIS 16\nBP 5383\nEP 5389\nDI 10.1128/AEM.01077-10\nPD AUG 2010\nPY 2010\nAB Pyruvate carboxylase is the sole anaplerotic enzyme in glucose-grown\n   cultures of wild-type Saccharomyces cerevisiae. Pyruvate\n   carboxylase-negative (Pyc(-)) S. cerevisiae strains cannot grow on\n   glucose unless media are supplemented with C(4) compounds, such as\n   aspartic acid. In several succinate-producing prokaryotes,\n   phosphoenolpyruvate carboxykinase (PEPCK) fulfills this anaplerotic\n   role. However, the S. cerevisiae PEPCK encoded by PCK1 is repressed by\n   glucose and is considered to have a purely decarboxylating and\n   gluconeogenic function. This study investigates whether and under which\n   conditions PEPCK can replace the anaplerotic function of pyruvate\n   carboxylase in S. cerevisiae. Pyc(-) S. cerevisiae strains\n   constitutively overexpressing the PEPCK either from S. cerevisiae or\n   from Actinobacillus succinogenes did not grow on glucose as the sole\n   carbon source. However, evolutionary engineering yielded mutants able to\n   grow on glucose as the sole carbon source at a maximum specific growth\n   rate of ca. 0.14 h(-1), one-half that of the (pyruvate\n   carboxylase-positive) reference strain grown under the same conditions.\n   Growth was dependent on high carbon dioxide concentrations, indicating\n   that the reaction catalyzed by PEPCK operates near thermodynamic\n   equilibrium. Analysis and reverse engineering of two independently\n   evolved strains showed that single point mutations in pyruvate kinase,\n   which competes with PEPCK for phosphoenolpyruvate, were sufficient to\n   enable the use of PEPCK as the sole anaplerotic enzyme. The PEPCK\n   reaction produces one ATP per carboxylation event, whereas the original\n   route through pyruvate kinase and pyruvate carboxylase is ATP neutral.\n   This increased ATP yield may prove crucial for engineering of efficient\n   and low-cost anaerobic production of C(4) dicarboxylic acids in S.\n   cerevisiae.\nTC 1\nZ9 1\nSN 0099-2240\nUT WOS:000280633400006\nER\n\nPT J\nAU Zelle, Rintze M.\n   De Hulster, Erik\n   Kloezen, Wendy\n   Pronk, Jack T.\n   van Maris, Antonius J. A.\nTI Key Process Conditions for Production of C(4) Dicarboxylic Acids in\n   Bioreactor Batch Cultures of an Engineered Saccharomyces cerevisiae\n   Strain\nSO APPLIED AND ENVIRONMENTAL MICROBIOLOGY\nVL 76\nIS 3\nBP 744\nEP 750\nDI 10.1128/AEM.02396-09\nPD FEB 2010\nPY 2010\nAB A recent effort to improve malic acid production by Saccharomyces\n   cerevisiae by means of metabolic engineering resulted in a strain that\n   produced up to 59 g liter(-1) of malate at a yield of 0.42 mol (mol\n   glucose)(-1) in calcium carbonate-buffered shake flask cultures. With\n   shake flasks, process parameters that are important for scaling up this\n   process cannot be controlled independently. In this study, growth and\n   product formation by the engineered strain were studied in bioreactors\n   in order to separately analyze the effects of pH, calcium, and carbon\n   dioxide and oxygen availability. A near-neutral pH, which in shake\n   flasks was achieved by adding CaCO(3), was required for efficient C(4)\n   dicarboxylic acid production. Increased calcium concentrations, a side\n   effect of CaCO(3) dissolution, had a small positive effect on malate\n   formation. Carbon dioxide enrichment of the sparging gas (up to 15%\n   [vol/vol]) improved production of both malate and succinate. At higher\n   concentrations, succinate titers further increased, reaching 0.29 mol\n   (mol glucose)(-1), whereas malate formation strongly decreased. Although\n   fully aerobic conditions could be achieved, it was found that moderate\n   oxygen limitation benefitted malate production. In conclusion, malic\n   acid production with the engineered S. cerevisiae strain could be\n   successfully transferred from shake flasks to 1-liter batch bioreactors\n   by simultaneous optimization of four process parameters (pH and\n   concentrations of CO(2), calcium, and O(2)). Under optimized conditions,\n   a malate yield of 0.48 +/- 0.01 mol (mol glucose)(-1) was obtained in\n   bioreactors, a 19% increase over yields in shake flask experiments.\nTC 2\nZ9 2\nSN 0099-2240\nUT WOS:000274017400015\nER\n\nPT J\nAU Abbott, Derek A.\n   Zelle, Rintze M.\n   Pronk, Jack T.\n   van Maris, Antonius J. A.\nTI Metabolic engineering of Saccharomyces cerevisiae for production of\n   carboxylic acids: current status and challenges\nSO FEMS YEAST RESEARCH\nVL 9\nIS 8\nBP 1123\nEP 1136\nDI 10.1111/j.1567-1364.2009.00537.x\nPD DEC 2009\nPY 2009\nAB To meet the demands of future generations for chemicals and energy and\n   to reduce the environmental footprint of the chemical industry,\n   alternatives for petrochemistry are required. Microbial conversion of\n   renewable feedstocks has a huge potential for cleaner, sustainable\n   industrial production of fuels and chemicals. Microbial production of\n   organic acids is a promising approach for production of chemical\n   building blocks that can replace their petrochemically derived\n   equivalents. Although Saccharomyces cerevisiae does not naturally\n   produce organic acids in large quantities, its robustness, pH tolerance,\n   simple nutrient requirements and long history as an industrial workhorse\n   make it an excellent candidate biocatalyst for such processes. Genetic\n   engineering, along with evolution and selection, has been successfully\n   used to divert carbon from ethanol, the natural endproduct of S.\n   cerevisiae, to pyruvate. Further engineering, which included expression\n   of heterologous enzymes and transporters, yielded strains capable of\n   producing lactate and malate from pyruvate. Besides these metabolic\n   engineering strategies, this review discusses the impact of transport\n   and energetics as well as the tolerance towards these organic acids. In\n   addition to recent progress in engineering S. cerevisiae for organic\n   acid production, the key limitations and challenges are discussed in the\n   context of sustainable industrial production of organic acids from\n   renewable feedstocks.\nTC 11\nZ9 11\nSN 1567-1356\nUT WOS:000271264400001\nER\n\nPT J\nAU Zelle, Rintze M.\n   de Hulster, Erik\n   van Winden, WoUter A.\n   de Waard, Pieter\n   Dijkema, Cor\n   Winkler, Aaron A.\n   Geertman, Jan-Maarten A.\n   van Dijken, Johannes P.\n   Pronk, Jack T.\n   van Maris, Antonius J. A.\nTI Malic acid production by Saccharomyces cerevisiae: Engineering of\n   pyruvate carboxylation, oxaloacetate reduction, and malate export\nSO APPLIED AND ENVIRONMENTAL MICROBIOLOGY\nVL 74\nIS 9\nBP 2766\nEP 2777\nDI 10.1128/AEM.02591-07\nPD MAY 2008\nPY 2008\nAB Malic acid is a potential biomass-derivable \"building block\" for\n   chemical synthesis. Since wild-type Saccharomyces cerevisiae strains\n   produce only low levels of malate, metabolic engineering is required to\n   achieve efficient malate production with this yeast. A promising pathway\n   for malate production from glucose proceeds via carboxylation of\n   pyruvate, followed by reduction of oxaloacetate to malate. This redox-\n   and ATP-neutral, CO2-fixing pathway has a theoretical maximum yield of 2\n   mol malate (mol glucose)(-1). A previously engineered glucose-tolerant,\n   C-2-independent pyruvate decarboxylase-negative S. cerevisiae strain was\n   used as the platform to evaluate the impact of individual and combined\n   introduction of three genetic modifications: (i) overexpression of the\n   native pyruvate carboxylase encoded by PYC2, (ii) high-level expression\n   of an allele of the MDH3 gene, of which the encoded malate dehydrogenase\n   was retargeted to the cytosol by deletion of the C-terminal peroxisomal\n   targeting sequence, and (iii) functional expression of the\n   Schizosaccharomyces pombe malate transporter gene SpMAE1. While single\n   or double modifications improved malate production, the highest malate\n   yields and titers were obtained with the simultaneous introduction of\n   all three modifications. In glucose-grown batch cultures, the resulting\n   engineered strain produced malate at titers of up to 59 g liter(-1) at a\n   malate yield of 0.42 mol (mol glucose)(-1). Metabolic flux analysis\n   showed that metabolite labeling patterns observed upon nuclear magnetic\n   resonance analyses of cultures grown on C-13-labeled glucose were\n   consistent with the envisaged nonoxidative, fermentative pathway for\n   malate production. The engineered strains still produced substantial\n   amounts of pyruvate, indicating that the pathway efficiency can be\n   further improved.\nTC 15\nZ9 17\nSN 0099-2240\nUT WOS:000255567900024\nER\n\nEF",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Anaplerotic Role for Cytosolic Malic Enzyme in Engineered Saccharomyces cerevisiae Strains",
				"creators": [
					{
						"firstName": "Rintze M.",
						"lastName": "Zelle",
						"creatorType": "author"
					},
					{
						"firstName": "Jacob C.",
						"lastName": "Harrison",
						"creatorType": "author"
					},
					{
						"firstName": "Jack T.",
						"lastName": "Pronk",
						"creatorType": "author"
					},
					{
						"firstName": "Antonius J. A.",
						"lastName": "van Maris",
						"creatorType": "author"
					}
				],
				"date": "FEB 2011",
				"DOI": "10.1128/AEM.02132-10",
				"ISSN": "0099-2240",
				"abstractNote": "Malic enzyme catalyzes the reversible oxidative decarboxylation of malate to pyruvate and CO(2). The Saccharomyces cerevisiae MAE1 gene encodes a mitochondrial malic enzyme whose proposed physiological roles are related to the oxidative, malate-decarboxylating reaction. Hitherto, the inability of pyruvate carboxylase-negative (Pyc(-)) S. cerevisiae strains to grow on glucose suggested that Mae1p cannot act as a pyruvate-carboxylating, anaplerotic enzyme. In this study, relocation of malic enzyme to the cytosol and creation of thermodynamically favorable conditions for pyruvate carboxylation by metabolic engineering, process design, and adaptive evolution, enabled malic enzyme to act as the sole anaplerotic enzyme in S. cerevisiae. The Escherichia coli NADH-dependent sfcA malic enzyme was expressed in a Pyc(-) S. cerevisiae background. When PDC2, a transcriptional regulator of pyruvate decarboxylase genes, was deleted to increase intracellular pyruvate levels and cells were grown under a CO(2) atmosphere to favor carboxylation, adaptive evolution yielded a strain that grew on glucose (specific growth rate, 0.06 +/- 0.01 h(-1)). Growth of the evolved strain was enabled by a single point mutation (Asp336Gly) that switched the cofactor preference of E. coli malic enzyme from NADH to NADPH. Consistently, cytosolic relocalization of the native Mae1p, which can use both NADH and NADPH, in a pyc1,2 Delta pdc2 Delta strain grown under a CO(2) atmosphere, also enabled slow-growth on glucose. Although growth rates of these strains are still low, the higher ATP efficiency of carboxylation via malic enzyme, compared to the pyruvate carboxylase pathway, may contribute to metabolic engineering of S. cerevisiae for anaerobic, high-yield C(4)-dicarboxylic acid production.",
				"extra": "Web of Science ID: WOS:000286597100004",
				"issue": "3",
				"libraryCatalog": "Thomson Reuters Web of Knowledge",
				"pages": "732-738",
				"publicationTitle": "APPLIED AND ENVIRONMENTAL MICROBIOLOGY",
				"volume": "77",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Phosphoenolpyruvate Carboxykinase as the Sole Anaplerotic Enzyme in Saccharomyces cerevisiae",
				"creators": [
					{
						"firstName": "Rintze M.",
						"lastName": "Zelle",
						"creatorType": "author"
					},
					{
						"firstName": "Josh",
						"lastName": "Trueheart",
						"creatorType": "author"
					},
					{
						"firstName": "Jacob C.",
						"lastName": "Harrison",
						"creatorType": "author"
					},
					{
						"firstName": "Jack T.",
						"lastName": "Pronk",
						"creatorType": "author"
					},
					{
						"firstName": "Antonius J. A.",
						"lastName": "van Maris",
						"creatorType": "author"
					}
				],
				"date": "AUG 2010",
				"DOI": "10.1128/AEM.01077-10",
				"ISSN": "0099-2240",
				"abstractNote": "Pyruvate carboxylase is the sole anaplerotic enzyme in glucose-grown cultures of wild-type Saccharomyces cerevisiae. Pyruvate carboxylase-negative (Pyc(-)) S. cerevisiae strains cannot grow on glucose unless media are supplemented with C(4) compounds, such as aspartic acid. In several succinate-producing prokaryotes, phosphoenolpyruvate carboxykinase (PEPCK) fulfills this anaplerotic role. However, the S. cerevisiae PEPCK encoded by PCK1 is repressed by glucose and is considered to have a purely decarboxylating and gluconeogenic function. This study investigates whether and under which conditions PEPCK can replace the anaplerotic function of pyruvate carboxylase in S. cerevisiae. Pyc(-) S. cerevisiae strains constitutively overexpressing the PEPCK either from S. cerevisiae or from Actinobacillus succinogenes did not grow on glucose as the sole carbon source. However, evolutionary engineering yielded mutants able to grow on glucose as the sole carbon source at a maximum specific growth rate of ca. 0.14 h(-1), one-half that of the (pyruvate carboxylase-positive) reference strain grown under the same conditions. Growth was dependent on high carbon dioxide concentrations, indicating that the reaction catalyzed by PEPCK operates near thermodynamic equilibrium. Analysis and reverse engineering of two independently evolved strains showed that single point mutations in pyruvate kinase, which competes with PEPCK for phosphoenolpyruvate, were sufficient to enable the use of PEPCK as the sole anaplerotic enzyme. The PEPCK reaction produces one ATP per carboxylation event, whereas the original route through pyruvate kinase and pyruvate carboxylase is ATP neutral. This increased ATP yield may prove crucial for engineering of efficient and low-cost anaerobic production of C(4) dicarboxylic acids in S. cerevisiae.",
				"extra": "Web of Science ID: WOS:000280633400006",
				"issue": "16",
				"pages": "5383-5389",
				"publicationTitle": "APPLIED AND ENVIRONMENTAL MICROBIOLOGY",
				"volume": "76",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Key Process Conditions for Production of C(4) Dicarboxylic Acids in Bioreactor Batch Cultures of an Engineered Saccharomyces cerevisiae Strain",
				"creators": [
					{
						"firstName": "Rintze M.",
						"lastName": "Zelle",
						"creatorType": "author"
					},
					{
						"firstName": "Erik",
						"lastName": "De Hulster",
						"creatorType": "author"
					},
					{
						"firstName": "Wendy",
						"lastName": "Kloezen",
						"creatorType": "author"
					},
					{
						"firstName": "Jack T.",
						"lastName": "Pronk",
						"creatorType": "author"
					},
					{
						"firstName": "Antonius J. A.",
						"lastName": "van Maris",
						"creatorType": "author"
					}
				],
				"date": "FEB 2010",
				"DOI": "10.1128/AEM.02396-09",
				"ISSN": "0099-2240",
				"abstractNote": "A recent effort to improve malic acid production by Saccharomyces cerevisiae by means of metabolic engineering resulted in a strain that produced up to 59 g liter(-1) of malate at a yield of 0.42 mol (mol glucose)(-1) in calcium carbonate-buffered shake flask cultures. With shake flasks, process parameters that are important for scaling up this process cannot be controlled independently. In this study, growth and product formation by the engineered strain were studied in bioreactors in order to separately analyze the effects of pH, calcium, and carbon dioxide and oxygen availability. A near-neutral pH, which in shake flasks was achieved by adding CaCO(3), was required for efficient C(4) dicarboxylic acid production. Increased calcium concentrations, a side effect of CaCO(3) dissolution, had a small positive effect on malate formation. Carbon dioxide enrichment of the sparging gas (up to 15% [vol/vol]) improved production of both malate and succinate. At higher concentrations, succinate titers further increased, reaching 0.29 mol (mol glucose)(-1), whereas malate formation strongly decreased. Although fully aerobic conditions could be achieved, it was found that moderate oxygen limitation benefitted malate production. In conclusion, malic acid production with the engineered S. cerevisiae strain could be successfully transferred from shake flasks to 1-liter batch bioreactors by simultaneous optimization of four process parameters (pH and concentrations of CO(2), calcium, and O(2)). Under optimized conditions, a malate yield of 0.48 +/- 0.01 mol (mol glucose)(-1) was obtained in bioreactors, a 19% increase over yields in shake flask experiments.",
				"extra": "Web of Science ID: WOS:000274017400015",
				"issue": "3",
				"pages": "744-750",
				"publicationTitle": "APPLIED AND ENVIRONMENTAL MICROBIOLOGY",
				"volume": "76",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Metabolic engineering of Saccharomyces cerevisiae for production of carboxylic acids: current status and challenges",
				"creators": [
					{
						"firstName": "Derek A.",
						"lastName": "Abbott",
						"creatorType": "author"
					},
					{
						"firstName": "Rintze M.",
						"lastName": "Zelle",
						"creatorType": "author"
					},
					{
						"firstName": "Jack T.",
						"lastName": "Pronk",
						"creatorType": "author"
					},
					{
						"firstName": "Antonius J. A.",
						"lastName": "van Maris",
						"creatorType": "author"
					}
				],
				"date": "DEC 2009",
				"DOI": "10.1111/j.1567-1364.2009.00537.x",
				"ISSN": "1567-1356",
				"abstractNote": "To meet the demands of future generations for chemicals and energy and to reduce the environmental footprint of the chemical industry, alternatives for petrochemistry are required. Microbial conversion of renewable feedstocks has a huge potential for cleaner, sustainable industrial production of fuels and chemicals. Microbial production of organic acids is a promising approach for production of chemical building blocks that can replace their petrochemically derived equivalents. Although Saccharomyces cerevisiae does not naturally produce organic acids in large quantities, its robustness, pH tolerance, simple nutrient requirements and long history as an industrial workhorse make it an excellent candidate biocatalyst for such processes. Genetic engineering, along with evolution and selection, has been successfully used to divert carbon from ethanol, the natural endproduct of S. cerevisiae, to pyruvate. Further engineering, which included expression of heterologous enzymes and transporters, yielded strains capable of producing lactate and malate from pyruvate. Besides these metabolic engineering strategies, this review discusses the impact of transport and energetics as well as the tolerance towards these organic acids. In addition to recent progress in engineering S. cerevisiae for organic acid production, the key limitations and challenges are discussed in the context of sustainable industrial production of organic acids from renewable feedstocks.",
				"extra": "Web of Science ID: WOS:000271264400001",
				"issue": "8",
				"pages": "1123-1136",
				"publicationTitle": "FEMS YEAST RESEARCH",
				"volume": "9",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Malic acid production by Saccharomyces cerevisiae: Engineering of pyruvate carboxylation, oxaloacetate reduction, and malate export",
				"creators": [
					{
						"firstName": "Rintze M.",
						"lastName": "Zelle",
						"creatorType": "author"
					},
					{
						"firstName": "Erik",
						"lastName": "de Hulster",
						"creatorType": "author"
					},
					{
						"firstName": "WoUter A.",
						"lastName": "van Winden",
						"creatorType": "author"
					},
					{
						"firstName": "Pieter",
						"lastName": "de Waard",
						"creatorType": "author"
					},
					{
						"firstName": "Cor",
						"lastName": "Dijkema",
						"creatorType": "author"
					},
					{
						"firstName": "Aaron A.",
						"lastName": "Winkler",
						"creatorType": "author"
					},
					{
						"firstName": "Jan-Maarten A.",
						"lastName": "Geertman",
						"creatorType": "author"
					},
					{
						"firstName": "Johannes P.",
						"lastName": "van Dijken",
						"creatorType": "author"
					},
					{
						"firstName": "Jack T.",
						"lastName": "Pronk",
						"creatorType": "author"
					},
					{
						"firstName": "Antonius J. A.",
						"lastName": "van Maris",
						"creatorType": "author"
					}
				],
				"date": "MAY 2008",
				"DOI": "10.1128/AEM.02591-07",
				"ISSN": "0099-2240",
				"abstractNote": "Malic acid is a potential biomass-derivable \"building block\" for chemical synthesis. Since wild-type Saccharomyces cerevisiae strains produce only low levels of malate, metabolic engineering is required to achieve efficient malate production with this yeast. A promising pathway for malate production from glucose proceeds via carboxylation of pyruvate, followed by reduction of oxaloacetate to malate. This redox- and ATP-neutral, CO2-fixing pathway has a theoretical maximum yield of 2 mol malate (mol glucose)(-1). A previously engineered glucose-tolerant, C-2-independent pyruvate decarboxylase-negative S. cerevisiae strain was used as the platform to evaluate the impact of individual and combined introduction of three genetic modifications: (i) overexpression of the native pyruvate carboxylase encoded by PYC2, (ii) high-level expression of an allele of the MDH3 gene, of which the encoded malate dehydrogenase was retargeted to the cytosol by deletion of the C-terminal peroxisomal targeting sequence, and (iii) functional expression of the Schizosaccharomyces pombe malate transporter gene SpMAE1. While single or double modifications improved malate production, the highest malate yields and titers were obtained with the simultaneous introduction of all three modifications. In glucose-grown batch cultures, the resulting engineered strain produced malate at titers of up to 59 g liter(-1) at a malate yield of 0.42 mol (mol glucose)(-1). Metabolic flux analysis showed that metabolite labeling patterns observed upon nuclear magnetic resonance analyses of cultures grown on C-13-labeled glucose were consistent with the envisaged nonoxidative, fermentative pathway for malate production. The engineered strains still produced substantial amounts of pyruvate, indicating that the pathway efficiency can be further improved.",
				"extra": "Web of Science ID: WOS:000255567900024",
				"issue": "9",
				"pages": "2766-2777",
				"publicationTitle": "APPLIED AND ENVIRONMENTAL MICROBIOLOGY",
				"volume": "74",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "FN Thomson Reuters Web of Knowledge\nVR 1.0\nPT J\nAU Smith, L. J.\n   Schwark, W. S.\n   Cook, D. R.\n   Moon, P. F.\n   Erb, H. N.\n   Looney, A. L.\nTI Pharmacokinetics of intravenous mivacurium in halothane-anesthetized\n   dogs.\nSO Veterinary Surgery\nVL 27\nIS 2\nPS 170\nPY 1998\nUT CABI:19982209000\nDT Abstract only\nLA English\nSN 0161-3499\nCC LL900Animal Toxicology, Poisoning and Pharmacology (Discontinued March\n   2000); LL070Pets and Companion Animals\nCN 151-67-7\nDE anaesthesia; halothane; muscle relaxants; pharmacokinetics\nOR dogs\nBD Canis; Canidae; Fissipeda; carnivores; mammals; vertebrates; Chordata;\n   animals; small mammals; eukaryotes\nER\n\nEF",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Pharmacokinetics of intravenous mivacurium in halothane-anesthetized dogs.",
				"creators": [
					{
						"firstName": "L. J.",
						"lastName": "Smith",
						"creatorType": "author"
					},
					{
						"firstName": "W. S.",
						"lastName": "Schwark",
						"creatorType": "author"
					},
					{
						"firstName": "D. R.",
						"lastName": "Cook",
						"creatorType": "author"
					},
					{
						"firstName": "P. F.",
						"lastName": "Moon",
						"creatorType": "author"
					},
					{
						"firstName": "H. N.",
						"lastName": "Erb",
						"creatorType": "author"
					},
					{
						"firstName": "A. L.",
						"lastName": "Looney",
						"creatorType": "author"
					}
				],
				"date": "1998",
				"ISSN": "0161-3499",
				"extra": "Web of Science ID: CABI:19982209000",
				"issue": "2",
				"language": "English",
				"libraryCatalog": "Thomson Reuters Web of Knowledge",
				"pages": "170",
				"publicationTitle": "Veterinary Surgery",
				"volume": "27",
				"attachments": [],
				"tags": [
					{
						"tag": "Canidae"
					},
					{
						"tag": "Canis"
					},
					{
						"tag": "Chordata"
					},
					{
						"tag": "Fissipeda"
					},
					{
						"tag": "anaesthesia"
					},
					{
						"tag": "animals"
					},
					{
						"tag": "carnivores"
					},
					{
						"tag": "dogs"
					},
					{
						"tag": "eukaryotes"
					},
					{
						"tag": "halothane"
					},
					{
						"tag": "mammals"
					},
					{
						"tag": "muscle relaxants"
					},
					{
						"tag": "pharmacokinetics"
					},
					{
						"tag": "small mammals"
					},
					{
						"tag": "vertebrates"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "FN Thomson Reuters Web of Knowledge\nVR 1.0\nPT J\nAU Smith, JM \nAF Smith, J. Mark\nTI Gripewater\nSO FIDDLEHEAD\nLA English \nDT Poetry\nNR 0\nTC 0\nZ9 0\nPU UNIV NEW BRUNSWICK\nPI FREDERICTON\nPA DEPT ENGLISH, CAMPUS HOUSE, PO BOX 4400, FREDERICTON, NB E3B 5A3, CANADA\nSN 0015-0630\nJ9 FIDDLEHEAD\nJI Fiddlehead\nPD SPR\nPY 2011\nIS 247\nBP 82\nEP 82\nPG 1\nWC Literary Reviews\nSC Literature\nGA 757VG\nUT WOS:000290115300030\nER\n\nEF",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Gripewater",
				"creators": [
					{
						"firstName": "J. Mark",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"date": "SPR 2011",
				"ISSN": "0015-0630",
				"extra": "Web of Science ID: WOS:000290115300030",
				"issue": "247",
				"journalAbbreviation": "Fiddlehead",
				"language": "English",
				"libraryCatalog": "Thomson Reuters Web of Knowledge",
				"pages": "82-82",
				"publicationTitle": "FIDDLEHEAD",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "﻿FN Thomson Reuters Web of Knowledge\nVR 1.0\nPT S\nAU McCormick, MC\n   Litt, JS\n   Smith, VC\n   Zupancic, JAF\nAF McCormick, Marie C.\n   Litt, Jonathan S.\n   Smith, Vincent C.\n   Zupancic, John A. F.\nBE Fielding, JE\n   Brownson, RC\n   Green, LW\nTI Prematurity: An Overview and Public Health Implications\nSO ANNUAL REVIEW OF PUBLIC HEALTH, VOL 32\nSE Annual Review of Public Health\nLA English\nDT Review\nDE infant mortality; childhood morbidity; prevention\nID LOW-BIRTH-WEIGHT; NEONATAL INTENSIVE-CARE; QUALITY-OF-LIFE; EXTREMELY\n   PRETERM BIRTH; YOUNG-ADULTS BORN; AGE 8 YEARS; CHILDREN BORN;\n   BRONCHOPULMONARY DYSPLASIA; LEARNING-DISABILITIES; EXTREME PREMATURITY\nAB The high rate of premature births in the United States remains a public\n   health concern. These infants experience substantial morbidity and\n   mortality in the newborn period, which translate into significant\n   medical costs. In early childhood, survivors are characterized by a\n   variety of health problems, including motor delay and/or cerebral palsy,\n   lower IQs, behavior problems, and respiratory illness, especially\n   asthma. Many experience difficulty with school work, lower\n   health-related quality of life, and family stress. Emerging information\n   in adolescence and young adulthood paints a more optimistic picture,\n   with persistence of many problems but with better adaptation and more\n   positive expectations by the young adults. Few opportunities for\n   prevention have been identified; therefore, public health approaches to\n   prematurity include assurance of delivery in a facility capable of\n   managing neonatal complications, quality improvement to minimize\n   interinstitutional variations, early developmental support for such\n   infants, and attention to related family health issues.\nC1 [McCormick, MC] Harvard Univ, Dept Soc Human Dev & Hlth, Sch Publ Hlth, Boston, MA 02115 USA\n   [McCormick, MC; Litt, JS; Smith, VC; Zupancic, JAF] Beth Israel Deaconess Med Ctr, Dept Neonatol, Boston, MA 02215 USA\n   [Litt, JS] Childrens Hosp Boston, Div Newborn Med, Boston, MA 02115 USA\nRP McCormick, MC (reprint author), Harvard Univ, Dept Soc Human Dev & Hlth, Sch Publ Hlth, Boston, MA 02115 USA\nEM mmccormi@hsph.harvard.edu\n   vsmith1@bidmc.harvard.edu\n   jzupanci@bidmc.harvard.edu\n   Jonathan.Litt@childrens.harvard.edu\nNR 91\nTC 1\nZ9 1\nPU ANNUAL REVIEWS\nPI PALO ALTO\nPA 4139 EL CAMINO WAY, PO BOX 10139, PALO ALTO, CA 94303-0897 USA\nSN 0163-7525\nBN 978-0-8243-2732-3\nJ9 ANNU REV PUBL HEALTH\nJI Annu. Rev. Public Health\nPY 2011\nVL 32\nBP 367\nEP 379\nDI 10.1146/annurev-publhealth-090810-182459\nPG 13\nGA BUZ33\nUT WOS:000290776200020\nER\n\nEF",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Prematurity: An Overview and Public Health Implications",
				"creators": [
					{
						"firstName": "Marie C.",
						"lastName": "McCormick",
						"creatorType": "author"
					},
					{
						"firstName": "Jonathan S.",
						"lastName": "Litt",
						"creatorType": "author"
					},
					{
						"firstName": "Vincent C.",
						"lastName": "Smith",
						"creatorType": "author"
					},
					{
						"firstName": "John A. F.",
						"lastName": "Zupancic",
						"creatorType": "author"
					},
					{
						"firstName": "J. E.",
						"lastName": "Fielding",
						"creatorType": "editor"
					},
					{
						"firstName": "R. C.",
						"lastName": "Brownson",
						"creatorType": "editor"
					},
					{
						"firstName": "L. W.",
						"lastName": "Green",
						"creatorType": "editor"
					}
				],
				"date": "2011",
				"ISBN": "978-0-8243-2732-3",
				"abstractNote": "The high rate of premature births in the United States remains a public health concern. These infants experience substantial morbidity and mortality in the newborn period, which translate into significant medical costs. In early childhood, survivors are characterized by a variety of health problems, including motor delay and/or cerebral palsy, lower IQs, behavior problems, and respiratory illness, especially asthma. Many experience difficulty with school work, lower health-related quality of life, and family stress. Emerging information in adolescence and young adulthood paints a more optimistic picture, with persistence of many problems but with better adaptation and more positive expectations by the young adults. Few opportunities for prevention have been identified; therefore, public health approaches to prematurity include assurance of delivery in a facility capable of managing neonatal complications, quality improvement to minimize interinstitutional variations, early developmental support for such infants, and attention to related family health issues.",
				"bookTitle": "ANNUAL REVIEW OF PUBLIC HEALTH, VOL 32",
				"extra": "Web of Science ID: WOS:000290776200020",
				"language": "English",
				"libraryCatalog": "Thomson Reuters Web of Knowledge",
				"pages": "367-379",
				"place": "Palo Alto",
				"publisher": "Annual Reviews",
				"volume": "32",
				"attachments": [],
				"tags": [
					{
						"tag": "AGE 8 YEARS"
					},
					{
						"tag": "BRONCHOPULMONARY DYSPLASIA"
					},
					{
						"tag": "CHILDREN BORN"
					},
					{
						"tag": "EXTREME PREMATURITY"
					},
					{
						"tag": "EXTREMELY PRETERM BIRTH"
					},
					{
						"tag": "LEARNING-DISABILITIES"
					},
					{
						"tag": "LOW-BIRTH-WEIGHT"
					},
					{
						"tag": "NEONATAL INTENSIVE-CARE"
					},
					{
						"tag": "QUALITY-OF-LIFE"
					},
					{
						"tag": "YOUNG-ADULTS BORN"
					},
					{
						"tag": "childhood morbidity"
					},
					{
						"tag": "infant mortality"
					},
					{
						"tag": "prevention"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "﻿FN Thomson Reuters Web of Knowledge\nVR 1.0\nPT P\nUT BIOSIS:PREV201100469175\nDT Patent\nTI Indexing cell delivery catheter\nAU Solar, Matthew S.\n   Parmer, Kari\n   Smith, Philip\n   Murdock, Frank\nPN US 07967789\nAE Medtronic Inc\nDG June 28, 2011\nPC USA\nPL 604-16501\nSO Official Gazette of the United States Patent and Trademark Office\n   Patents\nPY 2011\nPD JUN 28 2011\nLA English\nAB An insertion device with an insertion axis includes an axial actuator\n   with a first portion and a second portion. The first portion is moveable\n   along the insertion axis relative to the second portion. The insertion\n   device further includes a first tube coupled to the first portion of the\n   axial actuator, and the first tube is movable along the insertion axis\n   in response to movement of the first portion relative to the second\n   portion. The device further includes a second tube having a radially\n   biased distal end. The distal end is substantially contained within the\n   first tube in a first state, and the second tube is rotatable with\n   respect to the first tube. Also, the second tube is axially movable to a\n   second state, and a portion of a distal end of the second tube is\n   exposed from a distal end of the first tube in the second state.\nC1 Indialantic, FL USA\nSN 0098-1133\nMC Human Medicine (Medical Sciences); Equipment Apparatus Devices and\n   Instrumentation\nCC 12502, Pathology - General\nMQ indexing cell delivery catheter; medical supplies\nER\n\nEF",
		"items": [
			{
				"itemType": "patent",
				"title": "Indexing cell delivery catheter",
				"creators": [
					{
						"firstName": "Matthew S.",
						"lastName": "Solar",
						"creatorType": "inventor"
					},
					{
						"firstName": "Kari",
						"lastName": "Parmer",
						"creatorType": "inventor"
					},
					{
						"firstName": "Philip",
						"lastName": "Smith",
						"creatorType": "inventor"
					},
					{
						"firstName": "Frank",
						"lastName": "Murdock",
						"creatorType": "inventor"
					}
				],
				"issueDate": "JUN 28 2011",
				"abstractNote": "An insertion device with an insertion axis includes an axial actuator with a first portion and a second portion. The first portion is moveable along the insertion axis relative to the second portion. The insertion device further includes a first tube coupled to the first portion of the axial actuator, and the first tube is movable along the insertion axis in response to movement of the first portion relative to the second portion. The device further includes a second tube having a radially biased distal end. The distal end is substantially contained within the first tube in a first state, and the second tube is rotatable with respect to the first tube. Also, the second tube is axially movable to a second state, and a portion of a distal end of the second tube is exposed from a distal end of the first tube in the second state.",
				"assignee": "Medtronic Inc",
				"country": "USA",
				"extra": "Web of Science ID: BIOSIS:PREV201100469175",
				"language": "English",
				"patentNumber": "US 07967789",
				"attachments": [],
				"tags": [
					{
						"tag": "Equipment Apparatus Devices and Instrumentation"
					},
					{
						"tag": "Human Medicine (Medical Sciences)"
					},
					{
						"tag": "indexing cell delivery catheter"
					},
					{
						"tag": "medical supplies"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "﻿FN Thomson Reuters Web of Knowledge\nVR 1.0\nPT B\nAU Smith, W. G.\nTI Ecological anthropology of households in East Madura, Indonesia.\nSO Ecological anthropology of households in East Madura, Indonesia\nPD 2011\nPY 2011\nZ9 0\nBN 978-90-8585933-8\nUT CABI:20113178956\nER\n\nPT J\nAU Smith, S. A.\nTI Production and characterization of polyclonal antibodies to\n   hexanal-lysine adducts for use in an ELISA to monitor lipid oxidation in\n   a meat model system.\nSO Dissertation Abstracts International, B\nVL 58\nIS 9\nPD 1998, thesis publ. 1997\nPY 1998\nZ9 0\nSN 0419-4217\nUT FSTA:1998-09-Sn1570\nER\n\nPT J\nAU Smith, E. H.\nTI The enzymic oxidation of linoleic and linolenic acid.\nSO Dissertation Abstracts International, B\nVL 49\nIS 4\nBP BRD\nPD 1988\nPY 1988\nZ9 0\nSN 0419-4217\nUT FSTA:1989-04-N-0004\nER\n\nPT J\nAU Smith, C. S.\nTI The syneresis of renneted milk gels.\nSO Dissertation Abstracts International. B, Sciences and Engineering\nVL 49\nIS 5\nBP 1459\nPD 1988\nPY 1988\nZ9 0\nSN 0419-4217\nUT CABI:19910448509\nER\n\nEF",
		"items": [
			{
				"itemType": "book",
				"title": "Ecological anthropology of households in East Madura, Indonesia.",
				"creators": [
					{
						"firstName": "W. G.",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"ISBN": "978-90-8585933-8",
				"extra": "Web of Science ID: CABI:20113178956",
				"libraryCatalog": "Thomson Reuters Web of Knowledge",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Production and characterization of polyclonal antibodies to hexanal-lysine adducts for use in an ELISA to monitor lipid oxidation in a meat model system.",
				"creators": [
					{
						"firstName": "S. A.",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"date": "1998, thesis publ. 1997",
				"ISSN": "0419-4217",
				"extra": "Web of Science ID: FSTA:1998-09-Sn1570",
				"issue": "9",
				"publicationTitle": "Dissertation Abstracts International, B",
				"volume": "58",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "The enzymic oxidation of linoleic and linolenic acid.",
				"creators": [
					{
						"firstName": "E. H.",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"date": "1988",
				"ISSN": "0419-4217",
				"extra": "Web of Science ID: FSTA:1989-04-N-0004",
				"issue": "4",
				"pages": "BRD",
				"publicationTitle": "Dissertation Abstracts International, B",
				"volume": "49",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "The syneresis of renneted milk gels.",
				"creators": [
					{
						"firstName": "C. S.",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"date": "1988",
				"ISSN": "0419-4217",
				"extra": "Web of Science ID: CABI:19910448509",
				"issue": "5",
				"pages": "1459",
				"publicationTitle": "Dissertation Abstracts International. B, Sciences and Engineering",
				"volume": "49",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "FN Thomson Reuters Web of Knowledge\nVR 1.0\nPT J\nUT BCI:BCI201300112663\nTI Importance of methane-derived carbon as a basal resource for two benthic\nconsumers in arctic lakes\nAU Medvedeff, Cassandra A. (medvedeff22@ufl.edu)\nHershey, Anne E.\nSO Hydrobiologia\nPY 2013\nPD JAN 2013\nVL 700\nIS 1\nPS 221-230\nBP 221\nEP 230\nAB Microbial processing of detritus is known to be important to benthic\ninvertebrate nutrition, but the role of dissolved (DOC) versus\nparticulate organic carbon (POC), and pathways by which those resources\nare obtained, are poorly understood. We used stable isotopes to\ndetermine the importance of DOC, POC, and CH4-derived carbon to benthic\ninvertebrate consumers from arctic Alaskan Lakes. Intact sediment cores\nfrom Lake GTH 112 were enriched with C-13-labeled organic matter,\nincluding algal detritus, algal-derived DOC, methyl-labeled acetate, and\ncarboxyl-labeled acetate, and incubated for 1 month with either\ncaddisflies (Grensia praeterita ) or fingernail clams (Sphaerium\nnitidum), two invertebrate species that are important to fish nutrition.\nBoth species used basal resources derived from POC and DOC. Results\ngenerally suggest greater reliance on POC. Differential assimilation\nfrom acetate treatments suggests Sphaerium assimilated CH4-derived\ncarbon, which likely occurred through deposit-feeding. Grensia\nassimilated some microbially processed acetate, although its\nsurvivorship was poor in acetate treatments. Our data extend previous\nstudies reporting use of CH4-derived carbon by Chironomidae and\noligochaetes. Taken together, these results suggest that the use of\nCH4-derived carbon is common among deposit-feeding benthic\ninvertebrates.\nTC 0\nZ9 0\nSN 0018-8158\nEI 1573-5117\nDI 10.1007/s10750-012-1232-8\nER\n\nEF\n",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Importance of methane-derived carbon as a basal resource for two benthic consumers in arctic lakes",
				"creators": [
					{
						"firstName": "Cassandra A.",
						"lastName": "Medvedeff",
						"creatorType": "author"
					},
					{
						"firstName": "Anne E.",
						"lastName": "Hershey",
						"creatorType": "author"
					}
				],
				"date": "JAN 2013",
				"DOI": "10.1007/s10750-012-1232-8",
				"ISSN": "0018-8158, 1573-5117",
				"abstractNote": "Microbial processing of detritus is known to be important to benthic invertebrate nutrition, but the role of dissolved (DOC) versus particulate organic carbon (POC), and pathways by which those resources are obtained, are poorly understood. We used stable isotopes to determine the importance of DOC, POC, and CH4-derived carbon to benthic invertebrate consumers from arctic Alaskan Lakes. Intact sediment cores from Lake GTH 112 were enriched with C-13-labeled organic matter, including algal detritus, algal-derived DOC, methyl-labeled acetate, and carboxyl-labeled acetate, and incubated for 1 month with either caddisflies (Grensia praeterita ) or fingernail clams (Sphaerium nitidum), two invertebrate species that are important to fish nutrition. Both species used basal resources derived from POC and DOC. Results generally suggest greater reliance on POC. Differential assimilation from acetate treatments suggests Sphaerium assimilated CH4-derived carbon, which likely occurred through deposit-feeding. Grensia assimilated some microbially processed acetate, although its survivorship was poor in acetate treatments. Our data extend previous studies reporting use of CH4-derived carbon by Chironomidae and oligochaetes. Taken together, these results suggest that the use of CH4-derived carbon is common among deposit-feeding benthic invertebrates.",
				"extra": "Web of Science ID: BCI:BCI201300112663",
				"issue": "1",
				"libraryCatalog": "Thomson Reuters Web of Knowledge",
				"pages": "221-230",
				"publicationTitle": "Hydrobiologia",
				"volume": "700",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "FN Clarivate Analytics Web of Science\nVR 1.0\nPT P\nAU YANG Y\n   LI W\nTI Use of reagent for detecting syntaxin 12 protein autoantibodies in\n   preparation of lung cancer screening kit\nPN CN110836969-A\nAE UNIV SICHUAN WEST CHINA HOSPITAL\nAB \n   NOVELTY - Use of reagent for detecting syntaxin 12 (STX12) protein\n   autoantibodies, is claimed in preparation of a lung cancer screening\n   kit.\n   USE - The reagent for detecting STX12 protein autoantibodies is useful\n   in preparation of a lung cancer screening kit (claimed).\n   ADVANTAGE - The reagent realizes effective screening of lung cancer and\n   detects that the autoantibody level of the STX12 protein in the serum of\n   lung cancer patients is significantly lower than that of healthy\n   patients.\nZ9 0\nUT DIIDW:202018799C\nER\n\nEF",
		"items": [
			{
				"itemType": "patent",
				"title": "Use of reagent for detecting syntaxin 12 protein autoantibodies in preparation of lung cancer screening kit",
				"creators": [
					{
						"firstName": "Y.",
						"lastName": "YANG",
						"creatorType": "inventor"
					},
					{
						"firstName": "W.",
						"lastName": "LI",
						"creatorType": "inventor"
					}
				],
				"abstractNote": "NOVELTY - Use of reagent for detecting syntaxin 12 (STX12) protein autoantibodies, is claimed in preparation of a lung cancer screening kit. USE - The reagent for detecting STX12 protein autoantibodies is useful in preparation of a lung cancer screening kit (claimed). ADVANTAGE - The reagent realizes effective screening of lung cancer and detects that the autoantibody level of the STX12 protein in the serum of lung cancer patients is significantly lower than that of healthy patients.",
				"assignee": "Univ Sichuan West China Hospital",
				"extra": "Web of Science ID: DIIDW:202018799C",
				"patentNumber": "CN110836969-A",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "FN Clarivate Analytics Web of Science\nVR 1.0\nPT B\nAU Chen, L\nAF Chen, L\nGP IEEE\nTI A conference control protocol for small scale video conferencing system\nSO 7TH INTERNATIONAL CONFERENCE ON ADVANCED COMMUNICATION TECHNOLOGY, VOLS\n   1 AND 2, PROCEEDINGS\nLA English\nDT Proceedings Paper\nCT 7th International Conference on Advanced Communication Technology\nCY FEB 21-23, 2005\nCL Phoenix Pk, SOUTH KOREA\nSP Minist Informat & Commun, NCA, ETRI, Nida, IEEE Commun Soc Tech, Osia, KICS, KIF, IEEK ComSoc\nDE video conferencing; full mesh; loosely coupled; conference control\n   protocol\nAB Increased speeds of PCs and networks have made video conferencing systems possible in Internet. The proposed conference control protocol suits small scale video conferencing systems which employ full mesh conferencing architecture and loosely coupled conferencing mode. The protocol can ensure the number of conference member is less than the maximum value. Instant message services are used to do member authentication and notification. The protocol is verified in 32 concurrent conferencing scenarios and implemented in DigiParty which is a small scale video conferencing add-in application for MSN Messenger.\nC1 Zhejiang Univ, Coll Comp Sci, Hangzhou 310027, Peoples R China.\nRP Chen, L (corresponding author), Zhejiang Univ, Coll Comp Sci, Hangzhou 310027, Peoples R China.\nEM lingchen@cs.zju.edu.cn\nRI Chen, Ling/AAY-3744-2020\nNR 7\nTC 0\nZ9 0\nU1 0\nU2 3\nPU IEEE\nPI NEW YORK\nPA 345 E 47TH ST, NEW YORK, NY 10017 USA\nPY 2005\nBP 532\nEP 537\nDI 10.1109/ICACT.2005.245926\nPG 6\nWC Computer Science, Artificial Intelligence; Computer Science, Information\n   Systems; Telecommunications\nSC Computer Science; Telecommunications\nGA BCO79\nUT WOS:000230445900101\nDA 2021-07-21\nER\n\nEF",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "A conference control protocol for small scale video conferencing system",
				"creators": [
					{
						"firstName": "L.",
						"lastName": "Chen",
						"creatorType": "author"
					}
				],
				"date": "2005",
				"DOI": "10.1109/ICACT.2005.245926",
				"abstractNote": "Increased speeds of PCs and networks have made video conferencing systems possible in Internet. The proposed conference control protocol suits small scale video conferencing systems which employ full mesh conferencing architecture and loosely coupled conferencing mode. The protocol can ensure the number of conference member is less than the maximum value. Instant message services are used to do member authentication and notification. The protocol is verified in 32 concurrent conferencing scenarios and implemented in DigiParty which is a small scale video conferencing add-in application for MSN Messenger.",
				"conferenceName": "7th International Conference on Advanced Communication Technology",
				"extra": "Web of Science ID: WOS:000230445900101",
				"language": "English",
				"libraryCatalog": "Clarivate Analytics Web of Science",
				"pages": "532-537",
				"place": "New York",
				"proceedingsTitle": "7TH INTERNATIONAL CONFERENCE ON ADVANCED COMMUNICATION TECHNOLOGY, VOLS 1 AND 2, PROCEEDINGS",
				"publisher": "IEEE",
				"attachments": [],
				"tags": [
					{
						"tag": "conference control protocol"
					},
					{
						"tag": "full mesh"
					},
					{
						"tag": "loosely coupled"
					},
					{
						"tag": "video conferencing"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
