{
	"translatorID": "e0d6c5bd-ad9a-4b28-b53d-e1355979ca02",
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
		"Full TEI Document": false
	},
	"inRepository": true,
	"translatorType": 2,
	"lastUpdated": "2025-06-09 10:51:06"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright (C) 2010 Stefan Majewski <xml@stefanmajewski.eu>

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


/* 2010, Stefan Majewski.

	This script does fairly well with papers, theses, websites and
	books. Some item properties, important for the more exotic
	publication types, are still missing. That means, the first 30 are
	implemented, the rest may be added when I need them. If you like to
	see some particular item property and you also have a basic idea
	how to represent them in TEI (without breaking the, to me, more
	important ones), please contact me or send a patch.

	<analytic> vs <monogr> Both elements are used. The script tries to
	figure out where which information might be appropriately placed. I
	hope this works.
*/

/* 2024, Frédéric Glorieux.

Documentation and discussion in the Pull Request.
https://github.com/zotero/translators/pull/3245
*/

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
const indent = "\t";

/**
 * Inline markup allowed in titles and some other rich text fields,
 * conversion in TEI.
 * Imitated from zotero source code
 * https://github.com/zotero/zotero/blob/main/chrome/content/zotero/itemTree.jsx#L2472
 * According to the CSL specification
 * https://citeproc-js.readthedocs.io/en/latest/csl-json/markup.html#html-like-formatting-tags
 *
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
	}
	// exhausts possible attenpt to open an element
	while (markupStack.length) {
		let discardedMarkup = markupStack.pop();
		let discardedNode = nodeStack.pop();
		nodeStack[0].append(discardedMarkup.token, ...discardedNode.childNodes);
	}
}


/**
 * Zotero notes may contain rich text (html).
 * Transform in in tei by traversing the dom tree.
 * @param {*} html
 * @param {*} dstParent
 * @returns
 */
function noteParse(html, dstParent) {
	if (!html) return;
	// import html as dom
	let dom = xmlParser.parseFromString(html, "text/html");
	let body = dom.body;
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
	domWalk(srcParent, dstParent);
}

/**
 * A simple tag translator html -> tei
 */
const html2tei = {
	a: { tei: "ref" },
	b: { tei: "hi", rend: "bold" },
	blockquote: { tei: "quote" },
	em: { tei: "emph" },
	i: { tei: "hi", rend: "italic" },
	li: { tei: "item" },
	ol: { tei: "list", rend: "numbered" },
	p: { tei: "p" },
	u: { tei: "hi", rend: "u" },
	ul: { tei: "list", rend: "bulleted" },
	strong: { tei: "hi", rend: "strong" },
	sub: { tei: "hi", rend: "sub" },
	sup: { tei: "hi", rend: "sup" },
};

/**
 * Recursive dom translator, for zotero notes.
 * @param {*} srcParent
 * @param {*} dstParent
 */
function domWalk(srcParent, dstParent) {
	const dstDoc = dstParent.ownerDocument;
	for (
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
			// go through some non significative elements
			if (srcName == 'span'
				&& srcChild.hasAttribute('style')
				&& srcChild.getAttribute("style") == 'color: black'
			) {
				domWalk(srcChild, dstParent);
				continue;
			}


			if (html2tei.hasOwnProperty(srcName)) {
				const dstName = html2tei[srcName].tei;
				dstChild = dstDoc.createElementNS(ns.tei, dstName);
				if (html2tei[srcName].rend) {
					dstChild.setAttribute("rend", html2tei[srcName].rend);
				}
				// special case of links
				if (srcChild.hasAttribute('href')) {
					dstChild.setAttribute("target", srcChild.getAttribute("href"));
				}
			}
			else {
				// unknown tag, send it n TEI ns, consumer will correct by hand
				dstChild = dstDoc.createElementNS(ns.tei, srcName);
				// copy attributes
				for (let i = 0; i < srcChild.attributes.length; i++) {
					const att = srcChild.attributes[i];
					dstChild.setAttribute(att.name, att.value);
				}
			}
			domWalk(srcChild, dstChild);
			dstParent.append(dstChild);
			continue;
		}
		// commenty ? PI ?
	}
}

/**
 * Parse the “extra” field to get “extra fields”.
 * Adaptation of Zotero.Utilities.Item.extraToCSL()
 * https://github.com/zotero/utilities/blob/9c89b23153ce621ed0f1d581a5e32248704c6fb7/utilities_item.js#L614
 * Syntax, one property by line
 *
 * known-propertie: value
 * Other Known: value
 *
 *
 * This: could be a free note.
 * [2024-01 FG]
 * @param {*} zotItem
 * @returns
 */
function parseExtraFields(zotItem) {
	if (!zotItem.extra) return;

	/**
	 * For a parser of zot:extra field,
	 * List of CSL properties with zotero key if available.
	 * These properties are unique for a record and override
	 * values from zotero form.
	 * References https://aurimasv.github.io/z2csl/typeMap.xml
	 */
	const cslScalars = {
		abstract: "abstractNote",
		accessed: "accessDate",
		annote: "annote", // not zot
		archive: "archive",
		"archive-collection": "seriesTitle", // not zot
		"archive-location": "archiveLocation",
		"archive-place": "place", // not zot
		authority: "authority", // zot:legislativeBody, zot:court, zot:issuingAuthority
		"available-date": "available-date", // not zot
		"call-number": "callNumber",
		chair: "chair",
		"chapter-number": "session", // legal, audio
		"citation-label": "citationKey",
		"citation-number": "citationKey",
		"collection-number": "seriesNumber",
		"collection-title": "seriesTitle",
		container: "container",
		"container-title": "container-title", // zot:bookTitle, zot:proceedingsTitle, zot:encyclopediaTitle, zot:dictionaryTitle, zot:publicationTitle, zot:websiteTitle
		"container-title-short": "journalAbbreviation",
		dimensions: "dimensions", // zot:artworkSize, zot:runningTime
		division: "division", // not zot
		doi: "DOI",
		edition: "edition",
		// "event": "event", // Deprecated legacy variant of event-title
		"event-date": "date",
		"event-place": "place",
		"event-title": "event-title", // zot:conferenceName, zot:meetingName
		"first-reference-note-number": "first-reference-note-number", // not zot
		genre: "genre", // zot:websiteType, zot:programmingLanguage, zot:genre, zot:postType, zot:letterType, zot:manuscriptType, zot:mapType, zot:presentationType, zot:reportType, zot:thesisType
		isbn: "ISBN",
		issn: "ISSN",
		issue: "issue",
		issued: "date", // zot:dateDecided, zot:dateEnacted
		jurisdiction: "jurisdiction", // not zot
		language: "language",
		license: "rights",
		locator: "locator", // not zot
		medium: "medium", // zot:artworkMedium, zot:audioRecordingFormat, zot:system, zot:videoRecordingFormat, zot:interviewMedium, zot:audioFileType
		note: "extra",
		number: "number", // zot:billNumber
		"number-of-pages": "numPages",
		"number-of-volumes": "numberOfVolumes",
		"original-date": "original-date", // not zot
		"original-publisher": "original-publisher", // not zot
		"original-publisher-place": "original-publisher-place", // not zot
		"original-title": "original-title", // not zot
		page: "page", // zot:page, zot:codePage
		// "page-first": "page-first", // not zot
		"part-number": "part-number", // not zot
		"part-title": "part-title", // not zot
		pmcid: "PMCID",
		pmid: "PMID",
		publisher: "publisher",
		"publisher-place": "place",
		references: "references", // zot:history, zot:references
		"reviewed-genre": "reviewed-genre", // not zot
		"reviewed-title": "reviewed-title", // not zot
		scale: "scale",
		section: "section", // zot:section, zot:committee
		source: "libraryCatalog",
		status: "legalStatus",
		submitted: "filingDate",
		"supplement-number": "supplement-number", // not zot
		title: "title",
		"title-short": "shortTitle",
		url: "URL",
		version: "versionNumber",
		volume: "volume",
		"year-suffix": "year-suffix", // not zot
	};

	/**
	 * For a parser of zot:extra field,
	 * List of CSL properties with zotero key if available.
	 * These properties are repeatable and are appended.
	 * References https://aurimasv.github.io/z2csl/typeMap.xml
	 */
	const cslCreators = {
		author: "author",
		chair: "chair", // not zot
		"collection-editor": "seriesEditor",
		compiler: "compiler", // not zot
		composer: "composer",
		"container-author": "container-author",
		contributor: "contributor",
		curator: "curator", // not zot
		director: "author", // cinema
		editor: "editor",
		"editor-translator": "editorial-translator", // not zot
		"editorial-director": "editorial-director", // not zot
		"executive-producer": "executive-producer", // not zot
		guest: "guest",
		host: "host", // not zot
		illustrator: "illustrator", // not zot
		interviewer: "interviewer",
		narrator: "narrator", // not zot
		organizer: "organizer", // not zot
		"original-author": "original-author", // not zot
		performer: "performer",
		recipient: "recipient",
		"reviewed-author": "reviewedAuthor",
		"script-writer": "scriptWriter",
		translator: "translator",
	};


	const extra = zotItem.extra.trim();
	if (!extra) {
		delete zotItem.extra;
		return;
	}
	// loop on extra, extract known properties as a dictionary, let unknown lines as is
	let note = extra.replace(/^([A-Za-z\- ]+)[\s\u00A0]*:\s*(.+)/gum, function (_, label, value) {
		value = value.trim();
		if (!value) { // keep line as is
			return _;
		}
		const cslKey = label.toLowerCase().replace(/ /g, '-');
		const zotKey = cslScalars[cslKey];
		if (zotKey) { // Standard or Number property
			zotItem[zotKey] = value;
			return "";
		}
		const creatorType = cslCreators[cslKey];
		if (creatorType) { // a name to append
			if (!Array.isArray(zotItem.creators)) {
				zotItem.creators = [];
			}
			const creator = {};
			const i = value.indexOf('||');
			if (i < 0) {
				creator.name = value;
			}
			else {
				creator.lastName = value.slice(0, i).trim();
				creator.firstName = value.slice(i + 2).trim();
			}
			creator.creatorType = creatorType;
			zotItem.creators.push(creator);
			return "";
		}
		const field = "keyword";
		if (cslKey == "keyword") {
			if (!Array.isArray(zotItem["keyword"])) {
				zotItem["keyword"] = [];
			}
			zotItem["keyword"].push(value);
			return "";
		}
		// default, append to note
		return _;
	});
	note = note.trim();
	if (!note) {
		delete zotItem.extra;
	}
	else {
		zotItem.extra = note.replace(/\n\n+/g, "\n\n");
	}
}

/**
 * RegeExp for allowed chars in XML names.
 */
const nameRE = new ZU.XRegExp("[^\\p{Letter}\\d]+");

/**
 * Stefan Majewski
 * @param {*} item
 * @returns
 */
function genXMLId(item) {
	// use Better BibTeX for Zotero citation key if available
	if (item.citationKey) return item.citationKey;
	if (item.callNumber) return item.callNumber;

	var xmlid = '';
	if (item.creators && item.creators[0] && (item.creators[0].lastName || item.creators[0].name)) {
		if (item.creators[0].lastName) {
			xmlid = item.creators[0].lastName.trim();
		}
		if (item.creators[0].name) {
			xmlid = item.creators[0].name.trim();
		}
		if (item.date) {
			var date = ZU.strToDate(item.date);
			if (date.year) {
				xmlid += date.year;
			}
		}
		// https://github.com/slevithan/xregexp
		// strip non xml name chars
		xmlid = ZU.XRegExp.replace(xmlid, nameRE, '');
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
 * Append simple value
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
	parent.append("\n", indent.repeat(level), child);
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

	// Enrich item with extra fields
	parseExtraFields(item);

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
	let analytic = null;
	let series = null;
	// (TEI schema) analytic before monogr
	if (isAnalytic) {
		analytic = teiDoc.createElementNS(ns.tei, "analytic");
		bibl.append("\n" + indent, analytic);
		monoana = analytic;
	}
	// (TEI schema) always monogr
	bibl.append("\n" + indent, monogr);
	// (TEI schema) series after monogr
	if (item.series || item.seriesTitle) {
		series = teiDoc.createElementNS(ns.tei, "series");
		bibl.append("\n", indent, series);
		if (item.series) {
			const title = teiDoc.createElementNS(ns.tei, "title");
			title.setAttribute("level", "s");
			inlineParse(item.series, title);
			series.append("\n", indent.repeat(2), title);
		}
		if (item.seriesTitle) {
			const title = teiDoc.createElementNS(ns.tei, "title");
			title.setAttribute("level", "s");
			title.setAttribute("type", "alternative");
			inlineParse(item.seriesTitle, title);
			series.append("\n", indent.repeat(2), title);
		}
		if (item.seriesText) {
			const note = teiDoc.createElementNS(ns.tei, "note");
			note.setAttribute("type", "description");
			noteParse(item.seriesText, note);
			series.append("\n", indent.repeat(2), note);
		}
		appendField(series, 'biblScope', item.seriesNumber, 2, { unit: 'volume' });
	}


	// language of text
	if (item.language) {
		monoana.setAttributeNS(ns.xml, "xml:lang", item.language);
	}

	// creators are all people only remotely involved into the creation of
	// a resource
	for (let creator of item.creators) {
		let pers = null;
		let respStmt = null;
		let levelNames = 3;
		const type = creator.creatorType;
		if (type == "reviewedAuthor") {
			// A reviewed author is not a statement of responsability
			// send it to relatedItem
			continue;
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
			respStmt = teiDoc.createElementNS(ns.tei, "respStmt");
			appendField(respStmt, 'resp', type, 3);
			pers = teiDoc.createElementNS(ns.tei, "persName");
			respStmt.append('\n', indent.repeat(3), pers);
			levelNames++;
			respStmt.append("\n", indent.repeat(2));
		}

		// append names of a particular creator
		persName(pers, creator, levelNames);


		// what to append
		let child = null;
		if (respStmt) {
			child = respStmt;
		}
		else {
			child = pers;
		}

		// decide where the creator shall appear
		if (type == "seriesEditor" && series) {
			series.append("\n", indent.repeat(2), child);
		}
		else if (isAnalytic && (type != 'editor' && type != 'bookAuthor')) {
			analytic.append("\n", indent.repeat(2), child);
		}
		else {
			monogr.append("\n", indent.repeat(2), child);
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
		monoana.append("\n", indent.repeat(2), title);
		// short title
		appendField(monoana, 'title', item.shortTitle, 2, { type: 'short' });
		// for analytic, a DOI is presumably for the article, not the journal.
		appendField(monoana, 'idno', item.DOI, 2, { type: 'DOI' });
	}

	// conference is not well tested
	if (item.conferenceName) {
		const title = teiDoc.createElementNS(ns.tei, "title");
		title.setAttribute("type", "conferenceName");
		inlineParse(item.conferenceName, title);
		monogr.append('\n', indent.repeat(2), title);
	}

	// publication title, csl:container-title may come from extra
	do {
		const tagsoup = item['container-title'] || item.bookTitle || item.proceedingsTitle || item.encyclopediaTitle || item.dictionaryTitle || item.publicationTitle || item.websiteTitle;
		if (!tagsoup) break;
		const title = teiDoc.createElementNS(ns.tei, "title");
		if (item.itemType == "journalArticle") {
			title.setAttribute("level", "j");
		}
		else {
			title.setAttribute("level", "m");
		}
		inlineParse(tagsoup, title);
		monogr.append('\n', indent.repeat(2), title);
	} while (false);

	// https://github.com/TEIC/TEI/issues/1788
	// url of item according to TEI spec
	if (item.url) {
		const ptr = teiDoc.createElementNS(ns.tei, "ptr");
		ptr.setAttribute("target", item.url);
		monoana.append('\n', indent.repeat(2), ptr);
	}
	// Other canonical ref nos come right after the title(s)
	appendField(monogr, 'idno', item.ISBN, 2, { type: 'ISBN' });
	appendField(monogr, 'idno', item.ISSN, 2, { type: 'ISSN' });
	// if analytic, call number is for analytic
	appendField(monoana, 'idno', item.callNumber, 2, { type: 'callNumber' });

	// copyright
	if (item.rights) {
		const availability = teiDoc.createElementNS(ns.tei, "availability");
		availability.setAttribute("status", "restricted");
		const p = teiDoc.createElementNS(ns.tei, "p");
		inlineParse(item.rights, p);
		availability.append('\n', indent.repeat(3), p, '\n', indent.repeat(2));
		monoana.append('\n', indent.repeat(2), availability);
	}

	appendField(monogr, 'edition', item.edition, 2, { n: item.versionNumber });
	// maybe a software with a version number but no edition name
	if (!item.edition && item.versionNumber) {
		appendField(monogr, 'edition', item.versionNumber, 2, { type: 'callNumber' });
	}

	// <imprint> is required
	const imprint = teiDoc.createElementNS(ns.tei, "imprint");
	monogr.append('\n', indent.repeat(2), imprint);
	// Date is required for an  <imprint> so create it by default
	{
		const date = teiDoc.createElementNS(ns.tei, "date");
		imprint.append('\n', indent.repeat(3), date);
		// use @when
		if (item.date) {
			date.setAttribute("when", ZU.strToISO(item.date));
			let display = item.date;
			date.append(display);
		}
	}
	appendField(imprint, 'publisher', item.publisher, 3);
	appendField(imprint, 'pubPlace', item.place, 3);
	appendField(imprint, 'biblScope', item.volume, 3, { unit: 'volume' });
	appendField(imprint, 'biblScope', item.issue, 3, { unit: 'issue' });
	appendField(imprint, 'biblScope', item.section, 3, { unit: 'chapter' });
	appendField(imprint, 'biblScope', item.pages, 3, { unit: 'page' });
	appendField(imprint, 'date', item.accessDate, 3, { type: 'accessed' });
	// not well thought
	appendField(imprint, 'note', item.thesisType, 3, { type: 'thesisType' });
	// ending indent
	imprint.append("\n", indent.repeat(2));

	// after imprint
	if (item.numberOfVolumes || item.numPages || item.dimensions) {
		const extent = teiDoc.createElementNS(ns.tei, "extent");
		if (item.numberOfVolumes) {
			// <measure unit="vol" quantity="4.2"/>
			const measure = teiDoc.createElementNS(ns.tei, "measure");
			measure.setAttribute("unit", "volume");
			measure.setAttribute("quantity", item.numberOfVolumes);
			extent.append('\n', indent.repeat(3), measure);
		}
		if (item.numPages) {
			// <measure unit="vol" quantity="4.2"/>
			let measure = teiDoc.createElementNS(ns.tei, "measure");
			measure.setAttribute("unit", "page");
			measure.setAttribute("quantity", item.numPages);
			extent.append('\n', indent.repeat(3), measure);
		}
		// other physical informations in extra field
		appendField(extent, 'measure', item.dimensions, 3);
		// indent closing </extent>
		extent.append("\n", indent.repeat(2));
		monogr.append('\n', indent.repeat(2), extent);
	}


	// abstract
	if (item.abstractNote) {
		const note = teiDoc.createElementNS(ns.tei, "note");
		note.setAttribute("type", "abstract");
		noteParse(item.abstractNote, note);
		bibl.append("\n", indent, note);
	}

	/*
	* review
	* <relatedItem type="reviewed">
	*   <bibl>
	*     <title>Reviewed title</title>
	*     <author>
	*       <forename>John</forename>
	*       <surname>Doe</surname>
	*     </author>
	*   </bibl>
	* </relatedItem>
	*/

	{
		const relatedItem = teiDoc.createElementNS(ns.tei, "relatedItem");
		relatedItem.setAttribute("type", "reviewed");
		const biblReviewed = teiDoc.createElementNS(ns.tei, "bibl");
		relatedItem.append("\n", indent.repeat(2), biblReviewed, "\n", indent);
		let found = false;
		for (let creator of item.creators) {
			const type = creator.creatorType;
			if (type != "reviewedAuthor") {
				continue;
			}
			found = true;
			const author = teiDoc.createElementNS(ns.tei, "author");
			persName(author, creator, 4);
			biblReviewed.append("\n", indent.repeat(3), author);
		}
		// APA7, extra field for reviewed title
		if (item['reviewed-title']) {
			const title = teiDoc.createElementNS(ns.tei, "title");
			inlineParse(item['reviewed-title'], title); // maybe rich text
			biblReviewed.append("\n", indent.repeat(3), title);
			found = true;
			// if reviewed-title, medium is its inprint
			appendField(biblReviewed, 'edition', item.medium, 3);
		}
		if (found) {
			biblReviewed.append("\n", indent.repeat(2));
			bibl.append("\n", indent, relatedItem);
		}
	}


	// Extra field contains free text considered as a note
	if (item.extra) {
		const note = teiDoc.createElementNS(ns.tei, "note");
		note.setAttribute("type", "extra");
		noteParse(item.extra, note);
		bibl.append("\n", indent, note);
	}

	// notes
	if (item.notes && Zotero.getOption("Export Notes")) {
		for (let noteObj of item.notes) {
			const note = teiDoc.createElementNS(ns.tei, "note");
			note.setAttribute('corresp', noteObj.uri);
			// spaces may be significative if formated text
			// note.setAttributeNS(ns.xml, "xml:space", 'preserve');
			noteParse(noteObj.note, note);
			bibl.append("\n", indent, note);
		}
	}

	// export tags, if available
	if (Zotero.getOption("Export Tags") && item.tags && item.tags.length > 0) {
		const tags = teiDoc.createElementNS(ns.tei, "note");
		bibl.append("\n", indent, tags);
		tags.setAttribute("type", "tags");
		// sort tags to keep order
		item.tags.sort();
		for (let tag of item.tags) {
			let term = teiDoc.createElementNS(ns.tei, "term");
			term.setAttribute("type", "tag");
			term.append(tag.tag);
			tags.append("\n", indent.repeat(2), term);
		}
		tags.append("\n", indent);
	}

	// last indent
	bibl.append("\n");
	monogr.append("\n", indent);
	if (analytic) analytic.append("\n", indent);
	if (series) series.append("\n", indent);

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
	parent.append("\n", indent.repeat(level - 1));
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
	Zotero.setCharacterSet("utf-8");


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
