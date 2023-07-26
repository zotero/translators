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
		"Export Tags": true,
		"Export Notes": true,
		"Generate XML IDs": false,
		"Full TEI Document": false,
		"Debug": false
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
const xmlParser = new DOMParser();
const xmlSerializer = new XMLSerializer();
const indent = "    ";

/**
 * Inline markup allowed in titles and some other rich text fields
 * startElement: opening tag event (required if no endElement)
 * endElement: closing tag event (required if no startElement)
 * tei: required, tei TagName element to create
 * rend: optional, tei attribute rend="value" 
 */

const inlineMarkup = {
	'<b>': {
		startElement: 'b',
		tei: 'hi',
		rend: "bold",
	},
	'</b>': {
		endElement: 'b',
		tei: 'hi',
	},
	'<i>': {
		startElement: 'i',
		tei: 'hi',
		rend: 'italic',
	},
	'</i>': {
		endElement: 'i',
		tei: 'hi',
	},
	'<span style="font-variant:small-caps;">': {
		startElement: 'span',
		tei: 'hi',
		rend: 'small-caps',
	},
	'<span class="nocase">': {
		startElement: 'span',
		tei: 'hi',
		rend: 'nocase',
	},
	'</span>': {
		endElement: 'span',
		tei: 'hi',
	},
	'<sub>': {
		startElement: 'sub',
		tei: 'hi',
		rend: 'sub',
	},
	'</sub>': {
		endElement: 'sub',
		tei: 'hi',
	},
	'<sup>': {
		startElement: 'sup',
		tei: 'hi',
		rend: 'sup',
	},
	'</sup>': {
		endElement: 'sup',
		tei: 'hi',
	}
};

/**
 * Taken from Zotero source
 * https://github.com/zotero/zotero/blob/main/chrome/content/zotero/itemTree.jsx#L2610
 * Advised by @dstillman 
 * https://github.com/zotero/translators/pull/3054#discussion_r1252896581
 * 
 * The problem: rich text in fields is not html. Ex:
 * Not closing <b> or<strong>unknown tag</strong>, kept as text nodes; <i>italic</i>, is an element
 * 
 * @param {*} tagSoup
 * @param {*} dstParent
 * @returns 
 */
function inlineParse(tagSoup, dstParent) {
	if (!tagSoup) return;
	/** stack of markup events in source to ensure close/open */
	const markupStack = [];
	/** stack of created elements */
	const nodeStack = [dstParent];
	/** text content of  */
	let textContent = '';
	/** Document to create nodes */
	const document = dstParent.ownerDocument;

	for (let token of tagSoup.split(/(<[^>]+>)/)) {

		if (inlineMarkup.hasOwnProperty(token)) {
			const markup = inlineMarkup[token];
			if (markup.startElement) {
				let node = document.createElementNS(ns.tei, markup.tei);
				if (markup.rend) {
					node.setAttribute('rend', markup.rend);
				}
				// copy markup fields with token as a new object
				markupStack.push({ ...markup, token });
				nodeStack.push(node);
				continue;
			}
			// close tag, only if one of same name is opened
			else if (
				markup.endElement
				&& markupStack.some(
					otherMarkup => otherMarkup.startElement === markup.endElement
				)
			) {
				// rewind the stacks
				while (markupStack.length) {
					let discardedMarkup = markupStack.pop();
					let discardedNode = nodeStack.pop();
					// the startElement event matching with this endElement
					// append it
					if (discardedMarkup.startElement === markup.endElement) {
						// append the element created to previous 
						nodeStack[nodeStack.length - 1].append(discardedNode);
						break;
					}
					// an open tag without closing
					// append the token as text, and possible children 
					// (text or element)
					else {
						nodeStack[nodeStack.length - 1].append(discardedMarkup.token, ...discardedNode.childNodes);
					}
				}

				continue;
			}
			// markup event without opening or closing
		}
		// default case, not recognized as markup, append as text
		nodeStack[nodeStack.length - 1].append(token);
		textContent += token;
	}
	// exhausts possible attenpt to open an element
	while (markupStack.length) {
		let discardedMarkup = markupStack.pop();
		let discardedNode = nodeStack.pop();
		nodeStack[0].append(discardedMarkup.token, ...discardedNode.childNodes);
	}
	// really the textContent ? Even with non closing tags ?
	return textContent;
}


/**
 * Transform note html in tei
 * @param {*} html 
 * @param {*} dstParent 
 * @returns 
 */
function noteParse(html, dstParent) {
	if (!html) return;
	// import html as dom
	let dom = xmlParser.parseFromString(html, "text/html");
	let body = dom.getElementsByTagName("body").item(0);
	let srcParent;
	// notes could be embed in an ugly <div>
	if (
		body.childElementCount === 1
		&& body.firstElementChild.tagName.toLowerCase() == 'div'
	) {
		srcParent = body.firstElementChild;
	}
	else {
		srcParent = body;
	}
	domWalk(srcParent, dstParent)
}

/**
 * A simple tag translator
 */
const html2tei = {
	"a" : {tei: "ref"},
	"b" : {tei: "hi", rend: "bold"},
	"blockquote" : {tei:"quote"},
	"em" : {tei:"emph"},
	"i" : {tei:"hi", rend:"italic"},
	"li" : {tei:"item"},
	"ol" : {tei:"list", rend:"numbered"},
	"p" : {tei:"p"},
	"ul" : {tei:"list", rend:"bulleted"},
	"sub" : {tei:"hi", rend:"sub"},
	"sup" : {tei:"hi", rend:"sup"},
};

/**
 * Recursive dom translator, for notes
 * @param {*} srcParent 
 * @param {*} dstParent 
 */
function domWalk(srcParent, dstParent) {
	const dstDoc = dstParent.ownerDocument;
	for(
		let srcChild = srcParent.firstChild; 
		srcChild !== null; 
		srcChild = srcChild.nextSibling
	) {
		if (srcChild.nodeType == Node.TEXT_NODE) {
			dstParent.append(srcChild.textContent);
			continue;
		}
		if (srcChild.nodeType == Node.ELEMENT_NODE) {
			let dstChild = null;
			const srcName = srcChild.tagName.toLowerCase();
			if (html2tei.hasOwnProperty(srcName)) {
				const dstName = html2tei[srcName].tei;
				dstChild = dstDoc.createElementNS(ns.tei, dstName);
				if (html2tei[srcName].rend) {
					dstChild.setAttribute("rend", html2tei[srcName].rend);
				}
				// special case of links
				if (srcChild.hasAttribute('href')) {
					dstChild.setAttribute("target", srcChild.getAttribute("href"))
				}
			}
			else {
				// unknown tag, send it n TEI ns, consumer will correct by hand
				dstChild = dstDoc.createElementNS(ns.tei, srcName);
			}
			domWalk(srcChild, dstChild);
			dstParent.append(dstChild);
			continue;
		}
		// commenty ? PI ?
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
function appendIndent(parent, child, level) {
	const doc = parent.ownerDocument;
	parent.append(indent.repeat(level), child, '\n');
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
function appendField(parent, name, value, level = 2, atts = {}) {
	if (!value) return;
	const doc = parent.ownerDocument;
	const child = doc.createElementNS(ns.tei, name);
	if (atts === null) atts = {};
	for (var key in atts) {
		// no empty attribute value
		if (!atts[key]) continue;
		child.setAttribute(key, atts[key]);
	}
	child.append(value);
	appendIndent(parent, child, level);
}


/**
 * Populate a <biblStruct>
 * @param {*} item 
 * @param {*} teiDoc 
 * @returns {Node}
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
	// A variable used to calculate complex tests
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
	// most specific parent for fields
	let monoana = monogr;
	monogr.append("\n");
	let analytic = null;
	let series = null;
	// (TEI schema) analytic before monogr
	if (isAnalytic) {
		analytic = teiDoc.createElementNS(ns.tei, "analytic");
		analytic.append("\n");
		bibl.append("\n" + indent, analytic);
		monoana = analytic;
	}
	// (TEI schema) always monogr
	bibl.append("\n" + indent, monogr, "\n");

	// creators are all people only remotely involved into the creation of
	// a resource
	for (let creator of item.creators) {
		let pers = null;
		let resp = null;
		let levelNames = 3;
		const type = creator.creatorType;
		if (type == "reviewedAuthor") {
			// A reviewed author is not a statement of responsability
			// is a subject, sent in a note
			continue
		}
		else if (type == "author") {
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
			resp.append("\n");
			appendField(resp, 'resp', type, 3);
			pers = teiDoc.createElementNS(ns.tei, "persName");
			appendIndent(resp, pers, 3);
			levelNames++;
			resp.append(indent.repeat(2));
		}

		// append names of a particular creator
		persName(pers, creator, levelNames);


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

	// <title> is required
	{
		const title = teiDoc.createElementNS(ns.tei, "title");
		inlineParse(item.title, title); // maybe rich text
		if (isAnalytic) {
			title.setAttribute("level", "a");
		}
		else {
			title.setAttribute("level", "m");
		}
		// append title to analytic or monogr
		monoana.append(indent.repeat(2), title, "\n");
		// short title
		appendField(monoana, 'title', item.shortTitle, 2, { 'type': 'short' });
		// for analytic, a DOI is presumably for the article, not the journal.
		appendField(monoana, 'idno', item.DOI, 2, { 'type': 'DOI' });
	}

	// conference is not well tested
	if (item.conferenceName) {
		const title = teiDoc.createElementNS(ns.tei, "title");
		title.setAttribute("type", "conferenceName");
		inlineParse(item.conferenceName, title);
		appendIndent(monogr, title, 2);
	}

	// publication title
	test = item.bookTitle || item.proceedingsTitle || item.encyclopediaTitle || item.dictionaryTitle || item.publicationTitle || item.websiteTitle;
	if (test) {
		const tagsoup = test;
		const title = teiDoc.createElementNS(ns.tei, "title");
		if (item.itemType == "journalArticle") {
			title.setAttribute("level", "j");
		}
		else {
			title.setAttribute("level", "m");
		}
		inlineParse(tagsoup, title);
		appendIndent(monogr, title, 2)
	}


	// https://github.com/TEIC/TEI/issues/1788
	// url of item according to TEI spec
	if (item.url) {
		const ptr = teiDoc.createElementNS(ns.tei, "ptr");
		ptr.setAttribute("target", item.url);
		appendIndent(monoana, ptr, 2);
	}
	// Other canonical ref nos come right after the title(s)
	appendField(monogr, 'idno', item.ISBN, 2, { 'type': 'ISBN' });
	appendField(monogr, 'idno', item.ISSN, 2, { 'type': 'ISSN' });
	// if analytic, call number is for analytic 
	appendField(monoana, 'idno', item.callNumber, 2, { 'type': 'callNumber' });


	appendField(monogr, 'edition', item.edition, 2, { 'n': item.versionNumber });
	// maybe a software with a version number but no edition name
	if (!item.edition && item.versionNumber) {
		appendField(monogr, 'edition', item.versionNumber, 2, { 'type': 'callNumber' });
	}


	// <imprint> is required
	const imprint = teiDoc.createElementNS(ns.tei, "imprint");
	appendIndent(monogr, imprint, 2);
	imprint.append("\n");
	// Date is required for an  <imprint> so create it by default
	{
		const date = teiDoc.createElementNS(ns.tei, "date");
		appendIndent(imprint, date, 3);
		// use @when 
		if (item.date) {
			const dateO = Zotero.Utilities.strToDate(item.date);
			const when = date2iso(dateO);
			date.setAttribute("when", when);
			let display = item.date;
			if (extra['date-display']) {
				// A non iso date, ex: Christmas 1956 
				display = extra['date-display'];
				delete extra['date-display'];
			}
			if (display != when) {
				date.append(display);
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
	appendField(imprint, 'biblScope', item.volume, 3, { 'unit': 'volume' });
	appendField(imprint, 'biblScope', item.issue, 3, { 'unit': 'issue' });
	appendField(imprint, 'biblScope', item.section, 3, { 'unit': 'chapter' });
	appendField(imprint, 'biblScope', item.pages, 3, { 'unit': 'page' });
	appendField(imprint, 'date', item.accessDate, 3, { 'type': 'accessed' });
	// not well thought
	appendField(imprint, 'note', item.thesisType, 3, { 'type': 'thesisType' });
	// ending indent
	imprint.append(indent.repeat(2));

	// after imprint
	if (item.numberOfVolumes || item.numPages) {
		const extent = teiDoc.createElementNS(ns.tei, "extent");
		extent.append("\n");
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
		extent.append(indent.repeat(2));
		appendIndent(monogr, extent, 2);
	}
	// other physical informations in extra field
	appendField(monogr, 'extent', extra['format'], 2);
	delete extra['format']; // delete used extra field

	if (item.series || item.seriesTitle) {
		// (TEI schema) series after monogr
		series = teiDoc.createElementNS(ns.tei, "series");
		series.append("\n");
		bibl.append(indent, series, "\n");
		if (item.series) {
			const title = teiDoc.createElementNS(ns.tei, "title");
			title.setAttribute("level", "s");
			inlineParse(item.series, title);
			appendIndent(series, title, 2);
		}
		if (item.seriesTitle) {
			const title = teiDoc.createElementNS(ns.tei, "title");
			title.setAttribute("level", "s");
			title.setAttribute("type", "alternative");
			inlineParse(item.seriesTitle, title);
			appendIndent(series, title, 2);
		}
		if (item.seriesText) {
			const note = teiDoc.createElementNS(ns.tei, "note");
			note.setAttribute("type", "description");
			noteParse(item.seriesText, note);
			appendIndent(series, note, 2);
		}
		appendField(series, 'biblScope', item.seriesNumber, 2, { 'unit': 'volume' });
	}

	// abstract
	if (item.abstractNote) {
		const note = teiDoc.createElementNS(ns.tei, "note");
		note.setAttribute("type", "abstract");
		noteParse(item.abstractNote, note);
		appendIndent(bibl, note, 1);
	}

	// Review: author(s) and title in a note
	{
		const note = teiDoc.createElementNS(ns.tei, "note");
		note.setAttribute("type", "review");
		note.append("\n");
		let count = 0;
		for (let creator of item.creators) {
			const type = creator.creatorType;
			if (type != "reviewedAuthor") {
				continue;
			}
			count++;
			const pers = teiDoc.createElementNS(ns.tei, "persName");
			pers.setAttribute("type", "reviewed");
			// append names
			persName(pers, creator, 3);
			appendIndent(note, pers, 2);
		}
		// APA7, extra field for reviewed title
		if (extra['reviewed-title']) {
			const title = teiDoc.createElementNS(ns.tei, "title");
			title.setAttribute("type", "reviewed");
			inlineParse(extra['reviewed-title'], title); // maybe rich text
			note.append(indent.repeat(2), title, "\n");
			delete extra['reviewed-title'];
			count++;
		}
		if (count) {
			appendIndent(bibl, note, 1);
			note.append(indent);
		}
		
	}



	// Extra fields
	if (extra.note) {
		const note = teiDoc.createElementNS(ns.tei, "note");
		note.setAttribute("type", "extra");
		noteParse(extra.note, note);
		appendIndent(bibl, note, 1);
		delete extra.note; // delete used extra field
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
			noteParse(noteObj.note, note);
			appendIndent(bibl, note, 1);
		}
	}

	// export tags, if available
	if (Zotero.getOption("Export Tags") && item.tags && item.tags.length > 0) {
		const tags = teiDoc.createElementNS(ns.tei, "note");
		tags.append("\n");
		appendIndent(bibl, tags, 1);
		tags.setAttribute("type", "tags");
		for (let tag of item.tags) {
			let term = teiDoc.createElementNS(ns.tei, "term");
			term.setAttribute("type", "tag");
			term.append(tag.tag);
			appendIndent(tags, term, 2);
		}
		tags.append(indent);
	}
	// for debug
	if (Zotero.getOption("Debug")) {
		// if extra fields still not used, output them in a note
		if (Object.keys(extra).length) {
			const note = teiDoc.createElementNS(ns.tei, "note");
			note.setAttribute("type", "extra-unused");
			note.append(JSON.stringify(extra, null, 2));
			appendIndent(bibl, note, 1);
		}
		const note = teiDoc.createElementNS(ns.tei, "note");
		note.setAttribute("type", "debug");
		note.append(JSON.stringify(item, null, 2));
		appendIndent(bibl, note, 1);
	}
	// last indent
	monogr.append(indent);
	if (analytic) analytic.append(indent);
	if (series) series.append(indent);

	return bibl;
}

/**
 * Append name components to a parent element according
 * to a zotero creator object
 * @param {*} parent 
 * @param {*} creator 
 */
function persName(parent, creator, level = 3) {
	if (level < 1) level = 1;
	parent.append("\n");
	// A first name is alaways a first name
	appendField(parent, 'forename', creator.firstName, level);
	// A last name is a family name with a first name
	if (creator.lastName && creator.firstName) {
		appendField(parent, 'surname', creator.lastName, level);
	}
	// A last name without a first name is just a name
	else if (creator.lastName) {
		appendField(parent, 'name', creator.lastName, level);
	}
	// a name, is a name
	appendField(parent, 'name', creator.name, level);
	// indent closing tag
	parent.append(indent.repeat(level - 1));

}

function generateCollection(collection, teiDoc) {
	var listBibl;
	var children = collection.children ? collection.children : collection.descendents;


	if (children.length > 0) {
		listBibl = teiDoc.createElementNS(ns.tei, "listBibl");
		var colHead = teiDoc.createElementNS(ns.tei, "head");
		colHead.append(collection.name);
		listBibl.append(colHead);
		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			if (child.type == "collection") {
				listBibl.append(generateCollection(child, teiDoc));
			}
			else if (allItems[child.id]) {
				listBibl.append(generateItem(allItems[child.id], teiDoc));
			}
		}
	}
	return listBibl;
}

function generateTEIDocument(listBibls, teiDoc) {
	var text = teiDoc.createElementNS(ns.tei, "text");
	var body = teiDoc.createElementNS(ns.tei, "body");
	teiDoc.documentElement.append(text);
	text.append(body);
	for (var i = 0; i < listBibls.length; i++) {
		body.append(listBibls[i]);
	}
	return teiDoc;
}

function doExport() {
	Zotero.debug("starting TEI-XML export");
	Zotero.setCharacterSet("utf-8");
	Zotero.debug("TEI-XML Exporting items");


	// Initialize XML Doc
	var teiDoc // <TEI/>
		= xmlParser.parseFromString('<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader><fileDesc><titleStmt><title>Exported from Zotero</title></titleStmt><publicationStmt><p>unpublished</p></publicationStmt><sourceDesc><p>Generated from Zotero database</p></sourceDesc></fileDesc></teiHeader></TEI>', 'application/xml');

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
			listBibl.append("\n", generateItem(item, teiDoc), "\n");
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
			outputElement.append(listBibls[i]);
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
	Zotero.write(xmlSerializer.serializeToString(outputElement));
}
/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
