{
	"translatorID": "032ae9b7-ab90-9205-a479-baf81f49184a",
	"label": "TEI",
	"creator": "Stefan Majewski",
	"target": "xml",
	"minVersion": "4.0.27",
	"maxVersion": "",
	"priority": 25,
	"configOptions": {
		"dataMode": "xml/dom",
		"getCollections": "true"
	},
	"displayOptions": {
		"exportNotes": true,
		"Export Tags": true,
		"Generate XML IDs": false,
		"Full TEI Document": false,
		"Debug": true
	},
	"inRepository": true,
	"translatorType": 2,
	"lastUpdated": "2023-06-15 16:09:13"
}

// "displayOptions": "Export Collections": false // seems broken

// ********************************************************************
//
// tei-zotero-translator. Zotero 2 to TEI P5 exporter.
//
// Copyright (C) 2010 Stefan Majewski <xml@stefanmajewski.eu>

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.


// *********************************************************************
//
// This script does fairly well with papers, theses, websites and
// books. Some item properties, important for the more exotic
// publication types, are still missing. That means, the first 30 are
// implemented, the rest may be added when I need them. If you like to
// see some particular item property and you also have a basic idea
// how to represent them in TEI (without breaking the, to me, more
// important ones), please contact me or send a patch.
//
// <analytic> vs <monogr> Both elements are used. The script tries to
// figure out where which information might be appropriately placed. I
// hope this works.
//
// Zotero.addOption("exportNotes", false);
// Zotero.addOption("generateXMLIds", true);

const ns = {
	tei: "http://www.tei-c.org/ns/1.0",
	xml: "http://www.w3.org/XML/1998/namespace"
};


const exportedXMLIds = {};
const generatedItems = {};
const allItems = {};

// build one time
const xmlparser = new DOMParser();
const xmlser = new XMLSerializer();
const indent = "    ";

/**
 * Append possible rich text html as TEI element (<hi rend="…">)
 * [2023-06 FG]
 * @param {*} node 
 * @param {*} html 
 * @param {*} blocks 
 * @returns 
 */
const appendXML = function(node, html, blocks=false) {
	if (!html) return;
	// import html as dom and export is as xml to avoid xml malformations
	let dom = xmlparser.parseFromString(html, "text/html");
	let body = dom.getElementsByTagName("body").item(0);
	let root;
	// notes could be embed in an ugly <div>
	if (blocks 
		&& body.childElementCount === 1
		&& body.firstElementChild.tagName.toLowerCase() == 'div'
	) {
		root = body.firstElementChild;
	}
	else {
		root = body;
	}
	html = xmlser.serializeToString(root);
	// transform html to tei, xslt not available
	// https://forums.zotero.org/discussion/comment/344940/
	// tags supported by Zotero
	// https://www.zotero.org/support/kb/rich_text_bibliography
	let xml = html
		// changing namespace of root element
		.replace(/http:\/\/www.w3.org\/1999\/xhtml/g, 'http://www.tei-c.org/ns/1.0')
		// <b> bold
		.replace(/<b>/g, '<hi rend="bold">')
		.replace(/<\/b>/g, '</hi>')
		// <em> <emph>
		.replace(/<(\/?)em>/g, '<$1emph>')
		// <i> italic
		.replace(/<(i)>/g, '<hi rend="italic">')
		.replace(/<\/i>/g, '</hi>')
		// nocase
		.replace(/<span class="nocase">(.*?)<\/span>/g, '<hi rend="nocase">$1</hi>')
		// <sc> seems no more supported in Zotero desk client
		// small-caps
		.replace(/<span style="font-variant:\s*small-caps;">(.*?)<\/span>/g, '<hi rend="smallcaps">$1</hi>')
		// <sub> subscript
		.replace(/<sup>/g, '<hi rend="sup">')
		.replace(/<\/sup>/g, '</hi>')
		// <sup> superscript
		.replace(/<sup>/g, '<hi rend="sup">')
		.replace(/<\/sup>/g, '</hi>')
	;
	// notes can hav block level elementts
	if (blocks) {
		xml = xml
			.replace(/<(\/?)blockquote>/g, '<$1quote>')
			.replace(/<(\/?)li>/g, '<$1item>')
			.replace(/<ol>/g, '<list rend="numbered">')
			.replace(/<ul>/g, '<list rend="bulleted">')
			.replace(/<(h\d)>/g, '<label type="$1">')
			.replace(/<\/(h\d)>/g, '</label>')
			.replace(/<\/(ul|ol)>/g, '</list>')
			.replace(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, 
				'<ref target="$1">$2</ref>')
		;
	}
	dom = xmlparser.parseFromString(xml, "text/xml");
	const children = dom.documentElement.childNodes
	for (let i = 0, len = children.length; i < len; i++) {
		const child = children[i];
		const imported = node.ownerDocument.importNode(child, true);
		node.appendChild(imported);
	}
}

/**
 * Parse the “extra” field to get “extra fields”
 * Syntax, one property by line
 * 
 * key1: value
 * key2: value
 * 
 * This could be a free note, parse is stoped at first empty line.
 * [2023-06 FG]
 * @param {*} extra 
 * @returns 
 */
function parseExtraFields(extra) {
	let fields = {};
	if (!extra) return fields;
	// keep blank lines
	let lines = extra.replace('/\r\n/g', '\n').replace('/\r/g', '\n').split('\n');
	let count = 0;
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i].trim();
		var splitAt = line.indexOf(':');
		if (splitAt > 1) {
			let key = line.substr(0, splitAt).trim();
			key = key.replace(/\s+/g, '-').toLowerCase();
			let value = line.substr(splitAt + 1).trim();
			fields[key] = value;
			count++;
		}
		// skip empty lines at start
		else if (count === 0 && line.length === 0) {
			continue;
		}
		// break at first empty line (Extra may contain free text)
		else if (line.length === 0) {
			let note = lines.slice(i + 1).join('\n');
			fields['note'] = note;
			break;
		}
	}
	return fields;
}

/**
 * Stefan Majewski
 * @param {*} item 
 * @returns 
 */
function genXMLId(item) {
	// use Better BibTeX for Zotero citation key if available
	if (item.extra) {
		item.extra = item.extra.replace(/(?:^|\n)citation key\s*:\s*([^\s]+)(?:\n|$)/i, (m, citationKey) => {
			item.citationKey = citationKey;
			return '\n';
		}).trim();
	}
	if (item.citationKey) return item.citationKey;

	var xmlid = '';
	if (item.creators && item.creators[0] && (item.creators[0].lastName || item.creators[0].name)) {
		if (item.creators[0].lastName) {
			xmlid = item.creators[0].lastName;
		}
		if (item.creators[0].name) {
			xmlid = item.creators[0].name;
		}
		if (item.date) {
			var date = Zotero.Utilities.strToDate(item.date);
			if (date.year) {
				xmlid += date.year;
			}
		}
		// Replace space, tabulations, colon, punctuation, parenthesis and apostrophes by "_"
		xmlid = xmlid.replace(/([ \t[\]:\u00AD\u0021-\u002C\u2010-\u2021])+/g, "_");


		// Remove any non xml NCName characters

		// Namestart = ":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] |
		// [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF]
		// | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] |
		// [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] |
		// [#x10000-#xEFFFF]

		// Name = NameStartChar | "-" | "." | [0-9] | #xB7 |
		// [#x0300-#x036F] | [#x203F-#x2040]

		xmlid = xmlid.replace(/^[^A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u10000-\uEFFFF]/, "");
		xmlid = xmlid.replace(/[^-A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u10000-\uEFFFF.0-9\u00B7\u0300-\u036F\u203F-\u2040]/g, "");
	}
	else {
		// "zoteroItem_item.key" as value for entries without creator
		var str = item.uri;
		var n = str.lastIndexOf('/');
		var result = str.substring(n + 1);
		xmlid += 'zoteroItem_' + result;
	}
	// this is really inefficient
	var curXmlId = xmlid;
	if (exportedXMLIds[curXmlId]) {
		// append characters to make xml:id unique
		// a-z aa-az ba-bz
		var charA = 97;
		var charZ = 122;
		var firstId = xmlid + "a";
		// reset id of previous date-only item to <date> + "a";
		if (exportedXMLIds[curXmlId]
			&& !exportedXMLIds[firstId]) {
			exportedXMLIds[curXmlId].setAttributeNS(ns.xml, "xml:id", firstId);
			exportedXMLIds[firstId] = exportedXMLIds[curXmlId];
		}
		// then start from b
		for (var i = charA + 1; exportedXMLIds[curXmlId]; i++) {
			curXmlId = xmlid + String.fromCharCode(i);
			if (i == charZ) {
				i = charA;
				xmlid += String.fromCharCode(charA);
			}
		}
		xmlid = curXmlId;
	}
	// set in main loop
	// exportedXMLIds[xmlid] = true;
	return xmlid;
}

/**
 * Convert Zotero parsed date to xml date YYYY-MM-DD
 * [2023-06 FG]
 */
function date2iso(date) {
	let iso = null;
	let year = Number(date.year);
	if (isNaN(year)) return iso; 
	iso = String(date.year).padStart(4, '0');
	let month = Number(date.month);
	if (isNaN(month)) return iso;
	// january = 0
	iso += '-' + String(date.month + 1).padStart(2, '0');
	if (!date.day) return iso;
	iso += '-' + String(date.day).padStart(2, '0');
	return iso;
}

/**
 * Append a leave element with basic indentation
 * [2023-06 FG]
 * @param {*} parent 
 * @param {*} child 
 * @param {*} level 
 */
const appendIndent = function (parent, child, level) {
	const doc = parent.ownerDocument;
	parent.appendChild(doc.createTextNode(indent.repeat(level)));
	parent.appendChild(child);
	parent.appendChild(doc.createTextNode('\n'));
}

/**
 * Append simple value
 * [2023-06 FG]
 * @param {*} parent 
 * @param {*} name 
 * @param {*} value 
 * @param {*} atts 
 * @returns 
 */
const appendField = function(parent, name, value, level=2, atts={}) {
	if (!value) return;
	const doc = parent.ownerDocument;
	const child = doc.createElementNS(ns.tei, name);
	if (atts === null) atts = {};
	for (var key in atts) { 
		child.setAttribute(key, atts[key]);
	}
	child.appendChild(doc.createTextNode(value));
	appendIndent(parent, child, level);
}


/**
 * Populate a <biblStruct>
 * @param {*} item 
 * @param {*} teiDoc 
 * @returns 
 */
function generateItem(item, teiDoc) {
	// fixme not all conferencepapers are analytic!
	var analyticItemTypes = {
		journalArticle: true,
		bookSection: true,
		magazineArticle: true,
		newspaperArticle: true,
		conferencePaper: true,
		encyclopediaArticle: true,
		dictionaryEntry: true,
		webpage: true
	};
	const isAnalytic = !!analyticItemTypes[item.itemType];
	const bibl = teiDoc.createElementNS(ns.tei, "biblStruct");
	bibl.setAttribute("type", item.itemType);
	// create attribute for Zotero item URI
	bibl.setAttribute("corresp", item.uri);

	// parsed extra maybe useful in multiple places
	const extra = parseExtraFields(item.extra);
	// A variable used to calculate complx tests
	let test;


	if (Zotero.getOption("Generate XML IDs")) {
		var xmlid;
		if (!generatedItems[item.uri]) {
			xmlid = genXMLId(item);
			bibl.setAttributeNS(ns.xml, "xml:id", xmlid);
			exportedXMLIds[xmlid] = bibl;
		}
		else {
			xmlid = "#" + generatedItems[item.uri].getAttributeNS(ns.xml, "id");
			var myXmlid = "zoteroItem_" + item.uri;

			bibl.setAttribute("sameAs", xmlid);

			bibl.setAttributeNS(ns.xml, "xml:id", myXmlid);
			exportedXMLIds[myXmlid] = bibl;
		}
	}
	generatedItems[item.uri] = bibl;

	/** CORE FIELDS **/

	// analytic or monographic, XML structure with indent
	let monogr = teiDoc.createElementNS(ns.tei, "monogr");
	monogr.appendChild(teiDoc.createTextNode('\n'));
	let analytic = null;
	let series = null;
	if (isAnalytic) {
		analytic = teiDoc.createElementNS(ns.tei, "analytic");
		analytic.appendChild(teiDoc.createTextNode('\n'));
		bibl.appendChild(teiDoc.createTextNode('\n' + indent));
		bibl.appendChild(analytic);
		bibl.appendChild(teiDoc.createTextNode('\n' + indent));
		bibl.appendChild(monogr);
		bibl.appendChild(teiDoc.createTextNode('\n'));
	}
	else {
		bibl.appendChild(teiDoc.createTextNode('\n' + indent));
		bibl.appendChild(monogr);
		bibl.appendChild(teiDoc.createTextNode('\n'));
	}
	if (item.series || item.seriesTitle) {
		series = teiDoc.createElementNS(ns.tei, "series");
		bibl.appendChild(teiDoc.createTextNode(indent));
		bibl.appendChild(series);
		series.appendChild(teiDoc.createTextNode('\n'));
		bibl.appendChild(teiDoc.createTextNode('\n'));
	}


	// creators are all people only remotely involved into the creation of
	// a resource
	for (let creator of item.creators) {
		let pers = null;
		let resp = null;
		let levelNames = 3;
		const type = creator.creatorType;
		if (type == "author") {
			pers = teiDoc.createElementNS(ns.tei, "author");
		}
		else if (type == "editor") {
			pers = teiDoc.createElementNS(ns.tei, "editor");
		}
		else if (type == "seriesEditor") {
			pers = teiDoc.createElementNS(ns.tei, "editor");
		}
		else if (type == "bookAuthor") {
			pers = teiDoc.createElementNS(ns.tei, "author");
		}
		// a reponsability with a label
		else {
			resp = teiDoc.createElementNS(ns.tei, "respStmt");
			resp.appendChild(teiDoc.createTextNode('\n'));
			appendField(resp, 'resp', type, 3);
			pers = teiDoc.createElementNS(ns.tei, "persName");
			appendIndent(resp, pers, 3);
			levelNames++;
			resp.appendChild(teiDoc.createTextNode(indent.repeat(2)));
		}
		pers.appendChild(teiDoc.createTextNode('\n'));

		// add the names of a particular creator
		// A first name is alaways a first name
		appendField(pers, 'forename', creator.firstName, levelNames);
		// A last name is a family name with a first name
		if (creator.lastName && creator.firstName) {
			appendField(pers, 'surname', creator.lastName, levelNames);
		}
		// A last name without a first name is just a name
		else if (creator.lastName) {
			appendField(pers, 'name', creator.lastName, levelNames);
		}
		appendField(pers, 'name', creator.name, levelNames);
		pers.appendChild(teiDoc.createTextNode(indent.repeat(levelNames - 1)));


		// what to append
		let child = null;
		if (resp) {
			child = resp;
		}
		else {
			child = pers;
		}

		// decide where the creator shall appear
		if (type == "seriesEditor" && series) {
			appendIndent(series, child, 2);
		}
		else if (isAnalytic && (type != 'editor' && type != 'bookAuthor')) {
			// [Majewski] assuming that only authors go here [2023-06 FG] ??
			appendIndent(analytic, child, 2);
		}
		else {
			appendIndent(monogr, child, 2);
		}
	}

	// <title> is required, no test, but a block to limit variable scope
	{
		const title = teiDoc.createElementNS(ns.tei, "title");
		appendXML(title, item.title); // maybe rich text
		let parent = null;
		if (isAnalytic) {
			parent = analytic;
			title.setAttribute("level", "a");
		}
		else {
			parent = monogr;
			title.setAttribute("level", "m");
		}
		// append title to analytic or monogr
		parent.appendChild(teiDoc.createTextNode(indent.repeat(2)));
		parent.appendChild(title);
		parent.appendChild(teiDoc.createTextNode('\n'));
		// short title
		appendField(parent, 'title', item.shortTitle, 2, {'type': 'short'});
		// for analytic, a DOI is presumably for the article, not the journal.
		appendField(parent, 'idno', item.DOI, 2, {'type': 'DOI'});
	}

	// conference is not well tested
	if (item.conferenceName) {
		const title = teiDoc.createElementNS(ns.tei, "title");
		title.setAttribute("type", "conferenceName");
		appendXML(title, item.conferenceName);
		appendIndent(monogr, title, 2);
	}

	// publication title
	test = item.bookTitle || item.proceedingsTitle || item.encyclopediaTitle || item.dictionaryTitle || item.publicationTitle || item.websiteTitle;
	if (test) {
		const xml = test;
		const title = teiDoc.createElementNS(ns.tei, "title");
		if (item.itemType == "journalArticle") {
			title.setAttribute("level", "j");
		}
		else {
			title.setAttribute("level", "m");
		}
		appendXML(title, xml);
		appendIndent(monogr, title, 2)
	}
	

	// https://github.com/TEIC/TEI/issues/1788
	// url of item according to TEI spec
	if (item.url) {
		const ptr = teiDoc.createElementNS(ns.tei, "ptr");
		ptr.setAttribute("target", item.url);
		if (isAnalytic) {
			appendIndent(analytic, ptr, 2);
		}
		else {
			appendIndent(monogr, ptr, 2);
		}
	}
	// Other canonical ref nos come right after the title(s) in monogr.
	appendField(monogr, 'idno', item.ISBN, 2, {'type': 'ISBN'});
	appendField(monogr, 'idno', item.ISSN, 2, {'type': 'ISSN'});
	appendField(monogr, 'idno', item.callNumber, 2, {'type': 'callNumber'});


	// [2023-06 FG] series element should have been created here if needed
	if (item.series || item.seriesTitle) {
		if (item.series) {
			const title = teiDoc.createElementNS(ns.tei, "title");
			title.setAttribute("level", "s");
			appendXML(title, item.series);
			appendIndent(series, title, 2);
		}
		if (item.seriesTitle) {
			const title = teiDoc.createElementNS(ns.tei, "title");
			title.setAttribute("level", "s");
			title.setAttribute("type", "alternative");
			appendXML(title, item.seriesTitle);
			appendIndent(series, title, 2);
		}
		if (item.seriesText) {
			const note = teiDoc.createElementNS(ns.tei, "note");
			note.setAttribute("type", "description");
			// note.appendChild(teiDoc.createTextNode(item.seriesText));
			appendXML(note, item.seriesText, true);
			appendIndent(series, note, 2);
		}
		appendField(series, 'biblScope', item.seriesNumber, 2, {'unit': 'volume'});
	}


	if (item.edition) {
		const edition = teiDoc.createElementNS(ns.tei, "edition");
		if (item.versionNumber) {
			edition.setAttribute("n", item.versionNumber);
		}
		if (item.edition) {
			edition.appendChild(teiDoc.createTextNode(item.edition));
		}
		appendIndent(monogr, edition, 2);
	}
	// software, not well testes
	else if (item.versionNumber) {
		const edition = teiDoc.createElementNS(ns.tei, "edition");
		edition.appendChild(teiDoc.createTextNode(item.versionNumber));
		appendIndent(monogr, edition, 2);
	}
	appendField(monogr, 'edition', item.versionNumber, 2, {'type': 'callNumber'});


	// <imprint> is required
	const imprint = teiDoc.createElementNS(ns.tei, "imprint");
	appendIndent(monogr, imprint, 2);
	imprint.appendChild(teiDoc.createTextNode('\n'));
	// Date is required for an  <imprint> so create it by default
	{
		const date = teiDoc.createElementNS(ns.tei, "date");
		appendIndent(imprint, date, 3);
		// use @when 
		if (item.date) {
			const dateO = Zotero.Utilities.strToDate(item.date);
			const when = date2iso(dateO);
			date.setAttribute("when", when);
			if (extra['date-display']) {
				// A non iso date, ex: Christmas 1956 
				date.appendChild(teiDoc.createTextNode(extra['date-display']));
				delete extra['date-display'];
			}
			else {
				date.appendChild(teiDoc.createTextNode(item.date));
			}
		}
	}
	appendField(imprint, 'publisher', item.publisher, 3);
	// [FG] publisher, maybe kicked for Journal Article, get it back from extra
	appendField(imprint, 'publisher', extra.publisher, 3);
	delete extra.publisher; // delete used extra field
	appendField(imprint, 'pubPlace', extra['publisher-place'], 3);
	delete extra['publisher-place']; // delete used extra field
	appendField(imprint, 'pubPlace', extra['place'], 3);
	delete extra['place']; // delete used extra field
	appendField(imprint, 'biblScope', item.volume, 3, {'unit': 'volume'});
	appendField(imprint, 'biblScope', item.issue, 3, {'unit': 'issue'});
	appendField(imprint, 'biblScope', item.section, 3, {'unit': 'chapter'});
	appendField(imprint, 'biblScope', item.pages, 3, {'unit': 'page'});
	// date in @when ?
	appendField(imprint, 'date', item.accessDate, 3, {'type': 'accessed'});
	// not thought
	appendField(imprint, 'note', item.thesisType, 3, {'type': 'thesisType'});
	// ending indent
	imprint.appendChild(teiDoc.createTextNode(indent.repeat(2)));

	// after imprint
	if (item.numberOfVolumes || item.numPages) {
		const extent = teiDoc.createElementNS(ns.tei, "extent");
		extent.appendChild(teiDoc.createTextNode('\n'));
		if (item.numberOfVolumes) {
			// <measure unit="vol" quantity="4.2"/>
			const measure = teiDoc.createElementNS(ns.tei, "measure");
			measure.setAttribute("unit", "volume");
			measure.setAttribute("quantity", item.numberOfVolumes);
			appendIndent(extent, measure, 3);
		}
		if (item.numPages) {
			// <measure unit="vol" quantity="4.2"/>
			let measure = teiDoc.createElementNS(ns.tei, "measure");
			measure.setAttribute("unit", "page");
			measure.setAttribute("quantity", item.numPages);
			appendIndent(extent, measure, 3);
		}
		// indent closing </extent>
		extent.appendChild(teiDoc.createTextNode(indent.repeat(2)));
		appendIndent(monogr, extent, 2);
	}

	// Extra fields
	if (extra.note) {
		const note = teiDoc.createElementNS(ns.tei, "note");
		note.setAttribute("type", "extra");
		appendXML(note, extra.note, true);
		appendIndent(bibl, note, 1);
		delete extra.note; // delete used extra field
	}
	// if extra fields still not used, output them in a note
	if (Object.keys(extra).length) {
		const note = teiDoc.createElementNS(ns.tei, "note");
		note.setAttribute("type", "unused");
		note.appendChild(teiDoc.createTextNode(JSON.stringify(extra, null, 2)));
		appendIndent(bibl, note, 1);
	}
	
	// export notes, be conservative, do not strip tags
	// prefer output html even if is not correct TEI
	if (item.notes && Zotero.getOption("exportNotes")) {
		for (let noteObj of item.notes) {
			// keep HTML tags
			const note = teiDoc.createElementNS(ns.tei, "note");
			note.setAttribute('corresp', noteObj.uri);
			// spaces may be significative if formated text
			// note.setAttributeNS(ns.xml, "xml:space", 'preserve');
			appendXML(note, noteObj.note, true);
			appendIndent(bibl, note, 1);
		}
	}
			/* Notes could have relations and tags, what to do with that ?
    {
      "key": "NDE85Y8J",
      "version": 1721,
      "itemType": "note",
      "parentItem": "RCIWSIIV",
      "note": "&lt;div data-schema-version=\"8\"&gt;&lt;p&gt;A note&lt;/p&gt;\n&lt;/div&gt;",
      "tags": [
        {
          "tag": "TAG"
        }
      ],
      "relations": {
        "dc:relation": [
          "http://zotero.org/users/8989645/items/ZS5KBUK5"
        ]
      },
      "dateAdded": "2023-06-15T21:04:13Z",
      "dateModified": "2023-06-15T21:04:42Z",
      "uri": "http://zotero.org/users/8989645/items/NDE85Y8J"
    }
			*/
	// TODO, attachements  <listRef>   
	/*
	  "attachments": [
    {
      "version": 1718,
      "itemType": "attachment",
      "title": "An attached link",
      "url": "https://gogle.com/",
      "accessDate": "2023-06-15T21:04:01Z",
      "parentItem": "RCIWSIIV",
      "linkMode": "linked_url",
      "contentType": "",
      "charset": "",
      "tags": [],
      "relations": {},
      "dateAdded": "2023-06-15T21:04:01Z",
      "dateModified": "2023-06-15T21:04:01Z",
      "uri": "http://zotero.org/users/8989645/items/5YRYLNJW"
    }
  ],
  	*/

	// export tags, if available
	if (Zotero.getOption("Export Tags") && item.tags && item.tags.length > 0) {
		const tags = teiDoc.createElementNS(ns.tei, "note");
		tags.appendChild(teiDoc.createTextNode('\n'));
		appendIndent(bibl, tags, 1);
		tags.setAttribute("type", "tags");
		for (let tag of item.tags) {
			let term = teiDoc.createElementNS(ns.tei, "term");
			term.setAttribute("type", "tag");
			term.appendChild(teiDoc.createTextNode(tag.tag));
			appendIndent(tags, term, 2);
		}
		tags.appendChild(teiDoc.createTextNode(indent.repeat(1)));
	}
	// for debug
	if (Zotero.getOption("Debug")) {
		const note = teiDoc.createElementNS(ns.tei, "note");
		note.setAttribute("type", "debug");
		note.appendChild(teiDoc.createTextNode(JSON.stringify(item, null, 2)));
		appendIndent(bibl, note, 1);
	}
	// last indent
	monogr.appendChild(teiDoc.createTextNode(indent.repeat(1)));
	if (analytic) analytic.appendChild(teiDoc.createTextNode(indent.repeat(1)));
	if (series) series.appendChild(teiDoc.createTextNode(indent.repeat(1)));

	return bibl;
}

function generateCollection(collection, teiDoc) {
	var listBibl;
	var children = collection.children ? collection.children : collection.descendents;


	if (children.length > 0) {
		listBibl = teiDoc.createElementNS(ns.tei, "listBibl");
		var colHead = teiDoc.createElementNS(ns.tei, "head");
		colHead.appendChild(teiDoc.createTextNode(collection.name));
		listBibl.appendChild(colHead);
		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			if (child.type == "collection") {
				listBibl.appendChild(generateCollection(child, teiDoc));
			}
			else if (allItems[child.id]) {
				listBibl.appendChild(generateItem(allItems[child.id], teiDoc));
			}
		}
	}
	return listBibl;
}

function generateTEIDocument(listBibls, teiDoc) {
	var text = teiDoc.createElementNS(ns.tei, "text");
	var body = teiDoc.createElementNS(ns.tei, "body");
	teiDoc.documentElement.appendChild(text);
	text.appendChild(body);
	for (var i = 0; i < listBibls.length; i++) {
		body.appendChild(listBibls[i]);
	}
	return teiDoc;
}

function doExport() {
	Zotero.debug("starting TEI-XML export");
	Zotero.setCharacterSet("utf-8");
	Zotero.debug("TEI-XML Exporting items");


	// Initialize XML Doc
	var teiDoc // <TEI/>
		= xmlparser.parseFromString('<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader><fileDesc><titleStmt><title>Exported from Zotero</title></titleStmt><publicationStmt><p>unpublished</p></publicationStmt><sourceDesc><p>Generated from Zotero database</p></sourceDesc></fileDesc></teiHeader></TEI>', 'application/xml');

	var item = null;
	while (item = Zotero.nextItem()) { // eslint-disable-line no-cond-assign
		// Skip standalone notes
		if (item.itemType == 'note') {
			continue;
		}
		allItems[item.uri] = item;
	}


	var collection = Zotero.nextCollection();
	var listBibls = [];
	if (Zotero.getOption("Export Collections") && collection) {
		var curListBibl = generateCollection(collection, teiDoc);
		if (curListBibl) {
			listBibls.push(curListBibl);
		}
		while (collection = Zotero.nextCollection()) { // eslint-disable-line no-cond-assign
			curListBibl = generateCollection(collection, teiDoc);
			if (curListBibl) {
				listBibls.push(curListBibl);
			}
		}
	}
	else {
		var listBibl = teiDoc.createElementNS(ns.tei, "listBibl");
		for (let i in allItems) {
			item = allItems[i];
			// skip attachments
			if (item.itemType == "attachment") {
				continue;
			}
			listBibl.appendChild(teiDoc.createTextNode('\n'));
			listBibl.appendChild(generateItem(item, teiDoc));
			listBibl.appendChild(teiDoc.createTextNode('\n'));
		}
		listBibls.push(listBibl);
	}


	var outputElement;

	if (Zotero.getOption("Full TEI Document")) {
		outputElement = generateTEIDocument(listBibls, teiDoc);
	}
	else if (listBibls.length > 1) {
		outputElement = teiDoc.createElementNS(ns.tei, "listBibl");
		for (let i = 0; i < listBibls.length; i++) {
			outputElement.appendChild(listBibls[i]);
		}
	}
	else if (listBibls.length == 1) {
		outputElement = listBibls[0];
	}
	else {
		outputElement = teiDoc.createElement("empty");
	}

	// write to file.
	Zotero.write('<?xml version="1.0" encoding="UTF-8"?>\n');
	Zotero.write(xmlser.serializeToString(outputElement));
}
/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
