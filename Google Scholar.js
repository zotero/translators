{
	"translatorID": "57a00950-f0d1-4b41-b6ba-44ff0fc30289",
	"label": "Google Scholar",
	"creator": "Simon Kornblith, Frank Bennett, Aurimas Vinckevicius",
	"target": "^https?://scholar[-.]google[-.](com|cat|(com?[-.])?[a-z]{2})(\\.[^/]+)?/(scholar(_case)?\\?|citations\\?)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-07-11 07:58:52"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Simon Kornblith, Frank Bennett, Aurimas Vinckevicius, and
	Zoë C. Ma.

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

const DELAY_INTERVAL = 2000; // in milliseconds

var GS_CONFIG = { baseURL: undefined, lang: undefined };

const MIME_TYPES = {
	PDF: 'application/pdf',
	DOC: 'application/msword',
	HTML: 'text/html',
};

// The only "typedef" that needs to be kept in mind: a data object representing
// a row in the seach/profile listing.

/**
 * Information object for one Google Scholar entry or "row"
 *
 * @typedef {Object} RowObj
 * @property {?string} id - Google Scholar ID string
 * @property {string} [directLink] - href of the title link
 * @property {string} [attachmentLink] - href of the attachment link found by GS
 * @property {string} [attachmentType] - type (file extension) of the attachment
 * @property {string} [byline] - the line of text below the title (in green)
 */


/* Detection for law cases, but not "How cited" pages,
 * e.g. url of "how cited" page:
 *   http://scholar.google.co.jp/scholar_case?about=1101424605047973909&q=kelo&hl=en&as_sdt=2002
 */
function detectWeb(doc, url) {
	if (url.includes('/scholar_case?')
		&& url.includes('case=')
	) {
		return "case";
	}
	else if (url.includes('/citations?')) {
		if (getProfileResults(doc, true)) {
			return "multiple";
		}
		
		// individual saved citation
		var link = ZU.xpathText(doc, '//a[@class="gsc_oci_title_link"]/@href');
		if (!link) return false;
		if (link.includes('/scholar_case?')) {
			return 'case';
		}
		else {
			// Can't distinguish book from journalArticle
			// Both have "Journal" fields
			return 'journalArticle';
		}
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.gs_r[data-cid]');
	for (var i = 0; i < rows.length; i++) {
		var id = rows[i].dataset.cid;
		var title = text(rows[i], '.gs_rt');
		if (!id || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[id] = title;
	}
	return found ? items : false;
}


function getProfileResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.gsc_a_at');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = rows[i].textContent;
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


async function doWeb(doc, url) {
	// Determine the domain and language variant of the page.
	let urlObj = new URL(url);
	GS_CONFIG.baseURL = urlObj.origin;
	GS_CONFIG.lang = urlObj.searchParams.get("hl") || "en";

	let type = detectWeb(doc, url);

	if (type == "multiple") {
		let referrerURL;
		let getRow;
		let keys;

		if (getSearchResults(doc, true/* checkOnly */)) {
			let items = await Z.selectItems(getSearchResults(doc, false));
			if (!items) {
				return;
			}
			referrerURL = new URL(doc.location);
			getRow = rowFromSearchResult;
			keys = Object.keys(items);
		}
		else if (getProfileResults(doc, true/* checkOnly */)) {
			let urls = await Z.selectItems(getProfileResults(doc, false));
			if (!urls) {
				return;
			}
			const profileName = text(doc, "#gsc_prf_in");
			referrerURL = getEmulatedSearchURL(profileName);
			getRow = rowFromProfile;
			keys = Object.keys(urls);
		}

		await scrapeMany(keys, doc, getRow, referrerURL);
	}
	else {
		// e.g. https://scholar.google.de/citations?view_op=view_citation&hl=de&user=INQwsQkAAAAJ&citation_for_view=INQwsQkAAAAJ:u5HHmVD_uO8C
		await scrape(doc, url, type);
	}
}


// Scrape an array of string IDs or URLs (keys) that are obtained from
// the GS search/profile document (baseDocument). rowRequestor is a function
// that returns the row or a promise resolving to a row when called as
// rowRequestor(key, baseDocument).
// This function will reject if some rows failed to translate.
async function scrapeMany(keys, baseDocument, rowRequestor, referrerURL) {
	let failedRows = [];
	let promises = [];
	for (let i = 0; i < keys.length; i++) {
		let key = keys[i];
		let row = await rowRequestor(key, baseDocument);
		if (row) {
			// NOTE: here we start a promise that scrapes the row in the stages
			// of DOI -> arXiv -> Google Scholar, but don't wait for it in the
			// loop over rows
			promises.push(scrapeInStages(row, referrerURL, failedRows));
		}
		if (i < keys.length - 1) {
			// But we do wait between iterations over the rows
			await delay(DELAY_INTERVAL);
		}
	}
	await Promise.all(promises);
	if (failedRows.length) {
		throw new Error(`${failedRows.length} row(s) failed to translate`);
	}
}


// Scrape one GS entry
async function scrape(doc, url, type) {
	if (type && type == "case") {
		scrapeCase(doc, url);
	}
	else {
		// Stand-alone "View article" page
		const profileName = text(doc, "#gsc_sb_ui > div > a");
		let referrerURL = getEmulatedSearchURL(profileName);
		// Single-item row computed from "View article" page content.
		let row = parseViewArticle(doc);
		if (row) {
			let failedRow = [];
			await scrapeInStages(row, referrerURL, failedRow);
			if (failedRow.length) {
				throw new Error(`Failed to translate: ${row}`);
			}
		}
		else {
			throw new Error(`Expected 'View article' page at ${url}, but failed to extract article info from it.`);
		}
	}
}

// "row requestor" functions
// For search results - given ID and the document it originates, return a row.
// This function does not incur additional network requests.
function rowFromSearchResult(id, doc) {
	try {
		let entryElem = doc.querySelector(`.gs_r[data-cid="${id}"]`);
		// href from an <a> tag, direct link to the source. Note that the ID
		// starting with number can be fine, but the selector is a pain.
		let aElem = doc.getElementById(id);
		let directLink = aElem ? aElem.href : undefined;
		let attachmentLink = attr(entryElem, ".gs_ggs a", "href");
		let attachmentType = text(entryElem, ".gs_ctg2");
		if (attachmentType) {
			// Remove the brackets
			attachmentType = attachmentType.slice(1, -1).toUpperCase();
		}
		let byline = text(entryElem, ".gs_a");

		return { id, directLink, attachmentLink, attachmentType, byline };
	}
	catch (error) {
		Z.debug(`Warning: failed to get row info for GS id ${id}`);
		return undefined;
	}
}

// For search results - given "Article view" URLs and the profile document it
// originates, return a row. This will incur one request (to get the "Article
// view" document) per row.
async function rowFromProfile(url, profileDoc) {
	// To "navigate" to the linked "View article" page from the profile page, a
	// referrer is sent as header in the request
	const requestOptions = { headers: { Referer: profileDoc.location.href } };

	try {
		let viewArticleDoc = await requestDocument(url, requestOptions);
		let row = parseViewArticle(viewArticleDoc);
		if (row) {
			return row;
		}
	}
	catch (error) {
		Z.debug(`Warning: cannot retrieve the profile view-article page at ${url}; skipping. The error was:`);
		Z.debug(error);
		return undefined;
	}

	Z.debug(`Warning: cannot find Google Scholar id in profile view-article page at ${url}; skipping.`);
	return undefined;
}

// process the row in the order of DOI -> arXiv -> GS. If all fail, add the row
// to the array failedRows. This function never rejects.
async function scrapeInStages(row, referrerURL, failedRows) {
	try {
		await scrapeDOI(row);
		return;
	}
	catch (error) {
	}

	try {
		await scrapeArXiv(row);
		return;
	}
	catch (error) {
	}

	try {
		await scrapeGoogleScholar(row, referrerURL);
	}
	catch (error) {
		Z.debug(`Error with Google Scholar scraping of row ${row.directLink}`);
		Z.debug(`The error was: ${error}`);
		failedRows.push(row);
	}
}

function scrapeDOI(row) {
	let doi = extractDOI(row);
	if (!doi) {
		throw new Error(`No DOI found for link: ${row.directLink}`);
	}

	let translate = Z.loadTranslator("search");
	// DOI Content Negotiation
	translate.setTranslator("b28d0d42-8549-4c6d-83fc-8382874a5cb9");
	translate.setHandler("error", () => {});
	translate.setHandler("itemDone", (obj, item) => {
		// NOTE: The 'DOI Content Negotiation' translator does not add
		// attachments on its own
		addAttachment(item, row);
		item.complete();
	});
	translate.setSearch({ DOI: doi });
	Z.debug(`Trying DOI search for ${row.directLink}`);
	return translate.translate();
}

function scrapeArXiv(row) {
	let eprintID = extractArXiv(row);
	if (!eprintID) {
		throw new Error(`No ArXiv eprint ID found for link: ${row.directLink}`);
	}

	let translate = Z.loadTranslator("search");
	// arXiv.org
	translate.setTranslator("ecddda2e-4fc6-4aea-9f17-ef3b56d7377a");
	translate.setHandler("error", () => {});
	translate.setHandler("itemDone", (obj, item) => {
		// NOTE: Attachment is handled by the arXiv.org search translator
		item.complete();
	});
	translate.setSearch({ arXiv: eprintID });
	Z.debug(`Trying ArXiv search for ${row.directLink}`);
	return translate.translate();
}

function scrapeGoogleScholar(row, referrerURL) {
	// URL of the citation-info page fragment for the current row
	let citeURL;

	if (referrerURL.searchParams.get("scilib") === "1") { // My Library
		citeURL = `${GS_CONFIG.baseURL}/scholar?scila=${row.id}&output=cite&scirp=0&hl=${GS_CONFIG.lang}`;
	}
	else { // Normal search page
		citeURL = `${GS_CONFIG.baseURL}/scholar?q=info:${row.id}:scholar.google.com/&output=cite&scirp=0&hl=${GS_CONFIG.lang}`;
	}

	Z.debug(`Falling back to Google Scholar scraping for ${row.directLink || "citation-only entry"}`);
	return processCitePage(citeURL, row, referrerURL.href);
}

/*
 * #########################
 * ### Scraper Functions ###
 * #########################
 */
 
var bogusItemID = 1;

var scrapeCase = function (doc, url) {
	// Citelet is identified by
	// id="gsl_reference"
	var refFrag = doc.evaluate('//div[@id="gsl_reference"] | //div[@id="gs_reference"]',
		doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if (refFrag) {
		// citelet looks kind of like this
		// Powell v. McCormack, 395 US 486 - Supreme Court 1969
		var attachmentPointer = url;
		if (Zotero.isMLZ) {
			var block = doc.getElementById("gs_opinion_wrapper");
			if (block) {
				attachmentPointer = block;
			}
		}
		var factory = new ItemFactory(doc, refFrag.textContent, [attachmentPointer]);
		factory.repairCitelet();
		factory.getDate();
		factory.getCourt();
		factory.getVolRepPag();
		if (!factory.hasReporter()) {
			// Look for docket number in the current document
			factory.getDocketNumber(doc);
		}
		factory.getTitle();
		factory.saveItem();
	}
};


/*
 * ####################
 * ### Item Factory ###
 * ####################
 */

var ItemFactory = function (doc, citeletString, attachmentLinks, titleString /* , bibtexLink*/) {
	// var strings
	this.v = {};
	this.v.title = titleString;
	this.v.number = false;
	this.v.court = false;
	this.v.extra = false;
	this.v.date = undefined;
	this.v.jurisdiction = false;
	this.v.docketNumber = false;
	this.vv = {};
	this.vv.volRepPag = [];
	// portable array
	this.attachmentLinks = attachmentLinks;
	this.doc = doc;
	// working strings
	this.citelet = citeletString;

	/** handled outside of item factory
	this.bibtexLink = bibtexLink;
	this.bibtexData = undefined;
*/
	this.trailingInfo = false;
	// simple arrays of strings
	this.hyphenSplit = false;
	this.commaSplit = false;
};


ItemFactory.prototype.repairCitelet = function () {
	if (!this.citelet.match(/\s+-\s+/)) {
		this.citelet = this.citelet.replace(/,\s+([A-Z][a-z]+:)/, " - $1");
	}
};


ItemFactory.prototype.repairTitle = function () {
	// All-caps words of four or more characters probably need fixing.
	if (this.v.title.match(/(?:[^a-z]|^)[A-Z]{4,}(?:[^a-z]|$)/)) {
		this.v.title = ZU.capitalizeTitle(this.v.title.toLowerCase(), true)
								.replace(/([^0-9a-z])V([^0-9a-z])/, "$1v$2");
	}
};


ItemFactory.prototype.hasUsefulData = function () {
	if (this.getDate()) {
		return true;
	}
	if (this.hasInitials()) {
		return true;
	}
	return false;
};


ItemFactory.prototype.hasInitials = function () {
	if (this.hyphenSplit.length && this.hyphenSplit[0].match(/[A-Z] /)) {
		return true;
	}
	return false;
};


ItemFactory.prototype.hasReporter = function () {
	if (this.vv.volRepPag.length > 0) {
		return true;
	}
	return false;
};


ItemFactory.prototype.getDate = function () {
	var i, m;
	// Citelet parsing, step (1)
	if (!this.hyphenSplit) {
		if (this.citelet.match(/\s+-\s+/)) {
			this.hyphenSplit = this.citelet.split(/\s+-\s+/);
		}
		else {
			m = this.citelet.match(/^(.*),\s+([^,]+Court,\s+[^,]+)$/);
			if (m) {
				this.hyphenSplit = [m[1], m[2]];
			}
			else {
				this.hyphenSplit = [this.citelet];
			}
		}
		this.trailingInfo = this.hyphenSplit.slice(-1);
	}
	if (!this.v.date && this.v.date !== false) {
		this.v.date = false;
		for (i = this.hyphenSplit.length - 1; i > -1; i += -1) {
			m = this.hyphenSplit[i].match(/(?:(.*)\s+)*([0-9]{4})$/);
			if (m) {
				this.v.date = m[2];
				if (m[1]) {
					this.hyphenSplit[i] = m[1];
				}
				else {
					this.hyphenSplit[i] = "";
				}
				this.hyphenSplit = this.hyphenSplit.slice(0, i + 1);
				break;
			}
		}
	}
	// If we can find a more specific date in the case's centered text then use it
	var nodesSnapshot = this.doc.evaluate('//div[@id="gs_opinion"]/center', this.doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
	for (var iNode = 0; iNode < nodesSnapshot.snapshotLength; iNode++) {
		var specificDate = nodesSnapshot.snapshotItem(iNode).textContent.trim();
		// Remove the first word through the first space
		//  if it starts with "Deci" or it doesn't start with the first three letters of a month
		//  and if it doesn't start with Submitted or Argued
		// (So, words like "Decided", "Dated", and "Released" will be removed)
		specificDate = specificDate.replace(/^(?:Deci|(?!Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Submitted|Argued))[a-z]+[.:]?\s*/i, "")
		// Remove the trailing period, if it is there
			.replace(/\.$/, "");
		// If the remaining text is a valid date...
		if (!isNaN(Date.parse(specificDate))) {
			// ...then use it
			this.v.date = specificDate;
			break;
		}
	}
	return this.v.date;
};


ItemFactory.prototype.getCourt = function () {
	var s, m;
	// Citelet parsing, step (2)
	s = this.hyphenSplit.pop().replace(/,\s*$/, "").replace(/\u2026\s*$/, "Court");
	var court = null;
	var jurisdiction = null;
	m = s.match(/(.* Court),\s+(.*)/);
	if (m) {
		court = m[1];
		jurisdiction = m[2];
	}
	if (!court) {
		m = s.match(/(?:([a-zA-Z]+):\s*)*(.*)/);
		if (m) {
			court = m[2].replace(/_/g, " ");
			jurisdiction = m[1];
		}
	}
	if (court) {
		this.v.court = court;
	}
	if (jurisdiction) {
		this.v.extra = "Jurisdiction: " + jurisdiction;
	}
};


ItemFactory.prototype.getVolRepPag = function () {
	var i, m;
	// Citelet parsing, step (3)
	if (this.hyphenSplit.length) {
		this.commaSplit = this.hyphenSplit.slice(-1)[0].split(/\s*,\s+/);
		var gotOne = false;
		for (i = this.commaSplit.length - 1; i > -1; i += -1) {
			m = this.commaSplit[i].match(/^([0-9]+)\s+(.*)\s+(.*)/);
			if (m) {
				var volRepPag = {};
				volRepPag.volume = m[1];
				volRepPag.reporter = m[2];
				volRepPag.pages = m[3].replace(/\s*$/, "");
				this.commaSplit.pop();
				if (!volRepPag.pages.match(/[0-9]$/) && (i > 0 || gotOne)) {
					continue;
				}
				gotOne = true;
				this.vv.volRepPag.push(volRepPag);
			}
			else {
				break;
			}
		}
	}
};


ItemFactory.prototype.getTitle = function () {
	// Citelet parsing, step (4) [optional]
	if (this.commaSplit) {
		this.v.title = this.commaSplit.join(", ");
	}
};


ItemFactory.prototype.getDocketNumber = function (doc) {
	var docNumFrag = doc.evaluate(
		'//center[preceding-sibling::center//h3[@id="gsl_case_name"]]	| //div[@class="gsc_value" and preceding-sibling::div[text()="Docket id"]]',
		doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if (docNumFrag) {
		this.v.docketNumber = docNumFrag.textContent
								.replace(/^\s*[Nn][Oo](?:.|\s+)\s*/, "")
								.replace(/\.\s*$/, "");
	}
};

ItemFactory.prototype.getAttachments = function (doctype) {
	var i, ilen, attachments;
	var attachmentTitle = "Google Scholar " + doctype;
	attachments = [];
	for (i = 0, ilen = this.attachmentLinks.length; i < ilen; i += 1) {
		if (!this.attachmentLinks[i]) continue;
		if ("string" === typeof this.attachmentLinks[i]) {
			attachments.push({
				title: attachmentTitle,
				url: this.attachmentLinks[i],
				type: "text/html"
			});
		}
		else {
			// DOM fragment and parent doc
			var block = this.attachmentLinks[i];
			var doc = block.ownerDocument;

			// String content (title, url, css)
			var title = doc.getElementsByTagName("title")[0].textContent;
			var url = doc.documentURI;
			var css = "*{margin:0;padding:0;}div.mlz-outer{width: 60em;margin:0 auto;text-align:left;}body{text-align:center;}p{margin-top:0.75em;margin-bottom:0.75em;}div.mlz-link-button a{text-decoration:none;background:#cccccc;color:white;border-radius:1em;font-family:sans;padding:0.2em 0.8em 0.2em 0.8em;}div.mlz-link-button a:hover{background:#bbbbbb;}div.mlz-link-button{margin: 0.7em 0 0.8em 0;}";

			// head element
			var head = doc.createElement("head");
			head.innerHTML = '<title>' + title + '</title>';
			head.innerHTML += '<style type="text/css">' + css + '</style>';

			var attachmentdoc = Zotero.Utilities.composeDoc(doc, head, block);
			attachments.push({
				title: attachmentTitle,
				document: attachmentdoc
			});

			// URL for this item
			this.item.url = url;
		}
	}
	return attachments;
};


ItemFactory.prototype.pushAttachments = function (doctype) {
	this.item.attachments = this.getAttachments(doctype);
};

/*
ItemFactory.prototype.getBibtexData = function (callback) {
	if (!this.bibtexData) {
		if (this.bibtexData !== false) {
			Zotero.Utilities.doGet(this.bibtexLink, function(bibtexData) {
				if (!bibtexData.match(/title={{}}/)) {
					this.bibtexData = bibtexData;
				} else {
					this.bibtexData = false;
				}
				callback(this.bibtexData);
			});
			return;
		}
	}
	callback(this.bibtexData);
};
*/

ItemFactory.prototype.saveItem = function () {
	var i, ilen, key;
	if (this.v.title) {
		this.repairTitle();
		if (this.vv.volRepPag.length) {
			var completedItems = [];
			for (i = 0, ilen = this.vv.volRepPag.length; i < ilen; i += 1) {
				this.item = new Zotero.Item("case");
				for (key in this.vv.volRepPag[i]) {
					if (this.vv.volRepPag[i][key]) {
						this.item[key] = this.vv.volRepPag[i][key];
					}
				}
				this.saveItemCommonVars();
				if (i === (this.vv.volRepPag.length - 1)) {
					this.pushAttachments("Judgement");
				}
				this.item.itemID = "" + bogusItemID;
				bogusItemID += 1;
				completedItems.push(this.item);
			}
			if (completedItems.length === 0) {
				throw new Error("Failed to parse \"" + this.citelet + "\"");
			}
			for (i = 0, ilen = completedItems.length; i < ilen; i += 1) {
				for (let j = 0, jlen = completedItems.length; j < jlen; j += 1) {
					if (i === j) {
						continue;
					}
					completedItems[i].seeAlso.push(completedItems[j].itemID);
				}
				completedItems[i].complete();
			}
		}
		else {
			this.item = new Zotero.Item("case");
			this.saveItemCommonVars();
			this.pushAttachments("Judgement");
			this.item.complete();
		}
	}
	else {
		throw new Error("Failed to find title in \"" + this.citelet + "\"");
	}
};


ItemFactory.prototype.saveItemCommonVars = function () {
	for (let key in this.v) {
		if (this.v[key]) {
			this.item[key] = this.v[key];
		}
	}
};


/*
 * #########################
 * ### Utility Functions ###
 * #########################
 */

// Returns a promise that resolves (to undefined) after the minimum time delay
// specified in milliseconds
function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// Identification functions for external searches

/**
 * Extract candidate DOI from row by parsing its direct-link URL
 *
 * @param {RowObj} row
 * @returns {string?} Candidate DOI string, or null if not found
 */
function extractDOI(row) {
	let path = decodeURIComponent((new URL(row.directLink)).pathname);
	// Normally, match to the end of the path, because we couldn't have known
	// better.
	// But we can try clean up a bit, for common file extensions tacked to the
	// end, e.g. the link in the header title of
	// https://scholar.google.com/citations?view_op=view_citation&hl=en&user=Cz6X6UYAAAAJ&citation_for_view=Cz6X6UYAAAAJ:zYLM7Y9cAGgC
	// https://www.nomos-elibrary.de/10.5771/9783845229614-153.pdf
	let m = path.match(/(10\.\d{4,}\/.+?)(?:[./](?:pdf|htm|html|xhtml|epub|xml))?$/i);
	return m && m[1];
}

/**
 * Extract arXiv ID from row by parsing its direct-link URL
 *
 * @param {RowObj} row
 * @returns {string?} ArXiv ID, or null if not found
 */
function extractArXiv(row) {
	let urlObj = new URL(row.directLink);
	if (urlObj.hostname.toLowerCase() !== "arxiv.org") {
		return null;
	}
	let path = decodeURIComponent(urlObj.pathname);
	let m = path.match(/\/\w+\/([a-z-]+\/\d+|\d+\.\d+)$/i);
	return m && m[1];
}

// Page-processing utilities

/**
 * Returns an emulated search URL for a GS search with the profile name as the
 * search term
 *
 * @param {string} profileName - Name of the profile's owner
 * @returns {URL}
 */
function getEmulatedSearchURL(profileName) {
	return new URL(`/scholar?hl=${GS_CONFIG.lang}&as_sdt=0%2C5&q=${encodeURIComponent(profileName).replace(/%20/g, "+")}&btnG=`, GS_CONFIG.baseURL);
}

/**
 * Parse the "View article" page and returns the equivalent of a GS
 * search-result row
 *
 * @param {Document} viewArticleDoc - "View article" document
 * @returns {RowObj?} The row object, or null if parsing failed.
 */
function parseViewArticle(viewArticleDoc) {
	let related = ZU.xpathText(viewArticleDoc,
		'//a[contains(@href, "q=related:")]/@href');
	if (!related) {
		Z.debug("Could not locate 'related' link on the 'View article' page.");
		return null;
	}

	let m = related.match(/=related:([^:]+):/); // GS id
	if (m) {
		let id = m[1];
		let directLink = attr(viewArticleDoc, ".gsc_oci_title_link", "href");
		let attachmentLink = attr(viewArticleDoc, "#gsc_oci_title_gg a", "href");
		let attachmentType = text(viewArticleDoc, ".gsc_vcd_title_ggt");
		if (attachmentType) {
			attachmentType = attachmentType.slice(1, -1).toUpperCase();
		}
		return { id, directLink, attachmentLink, attachmentType };
	}
	else {
		Z.debug("Unexpected format of 'related' URL; can't find Google Scholar id. 'related' URL is " + related);
		return null;
	}
}

/**
 * Request and read the page-fragment with citation info, retrieve BibTeX, and
 * import. Each call sends two network requests, and each request is preceded
 * by a delay.
 *
 * @param {string} citeURL - The citation-info page fragment's URL, to be
 * requested.
 * @param {RowObj} row - The row object carrying the information of the entry's
 * identity.
 * @param {string} referrer - The referrer for the citation-info page fragment
 * request.
 */
async function processCitePage(citeURL, row, referrer) {
	let requestOptions = { headers: { Referer: referrer } };
	// Note that the page at citeURL has no doctype and is not a complete HTML
	// document. The browser can parse it in quirks mode but ZU.requestDocument
	// has trouble with it.
	await delay(DELAY_INTERVAL);
	const citePage = await requestText(citeURL, requestOptions);

	let m = citePage.match(/href="((https?:\/\/[a-z.]*)?\/scholar.bib\?[^"]+)/);
	if (!m) {
		// Saved lists and possibly other places have different formats for
		// BibTeX URLs
		// Trying to catch them here (can't add test bc lists are tied to
		// google accounts)
		m = citePage.match(/href="(.+?)">BibTeX<\/a>/);
	}
	if (!m) {
		var msg = "Could not find BibTeX URL";
		var title = citePage.match(/<title>(.*?)<\/title>/i);
		if (title) {
			msg += ' Got page with title "' + title[1] + '"';
		}
		throw new Error(msg);
	}
	const bibTeXURL = ZU.unescapeHTML(m[1]);

	// Pause between obtaining the citation info page and sending the request
	// for the BibTeX document
	await delay(DELAY_INTERVAL);

	// NOTE: To emulate the web app, the referrer for the BibTeX text is always
	// set to the origin (e.g. https://scholar.google.com/), imitating
	// strict-origin-when-cross-origin
	requestOptions.headers.Referer = GS_CONFIG.baseURL + "/";
	const bibTeXBody = await requestText(bibTeXURL, requestOptions);

	let translator = Z.loadTranslator("import");
	translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4"); // BibTeX
	translator.setString(bibTeXBody);
	translator.setHandler("itemDone", function (obj, item) {
		// case are not recognized and can be characterized by the
		// title link, or that the second line starts with a number
		// e.g. 1 Cr. 137 - Supreme Court, 1803
		if ((row.directLink && row.directLink.includes('/scholar_case?'))
			|| row.byline && "01234567890".includes(row.byline[0])) {
			item.itemType = "case";
			item.caseName = item.title;
			item.reporter = item.publicationTitle;
			item.reporterVolume = item.volume;
			item.dateDecided = item.date;
			item.court = item.publisher;
		}
		// patents are not recognized but are easily detected
		// by the titleLink or second line
		if ((row.directLink && row.directLink.includes('google.com/patents/'))
			|| (row.byline && row.byline.includes('Google Patents'))) {
			item.itemType = "patent";
			// authors are inventors
			for (let i = 0, n = item.creators.length; i < n; i++) {
				item.creators[i].creatorType = 'inventor';
			}
			// country and patent number
			if (row.directLink) {
				let m = row.directLink.match(/\/patents\/([A-Za-z]+)(.*)$/);
				if (m) {
					item.country = m[1];
					item.patentNumber = m[2];
				}
			}
		}

		// Add the title link as the url of the item
		if (row.directLink) {
			item.url = row.directLink;
		}

		// fix titles in all upper case, e.g. some patents in search results
		if (item.title.toUpperCase() === item.title) {
			item.title = ZU.capitalizeTitle(item.title);
		}

		// delete "others" as author
		if (item.creators.length) {
			var lastCreatorIndex = item.creators.length - 1,
				lastCreator = item.creators[lastCreatorIndex];
			if (lastCreator.lastName === "others" && (lastCreator.fieldMode === 1 || lastCreator.firstName === "")) {
				item.creators.splice(lastCreatorIndex, 1);
			}
		}

		// clean author names
		for (let j = 0, m = item.creators.length; j < m; j++) {
			if (!item.creators[j].firstName) {
				continue;
			}

			item.creators[j] = ZU.cleanAuthor(
				item.creators[j].lastName + ', '
					+ item.creators[j].firstName,
				item.creators[j].creatorType,
				true);
		}

		addAttachment(item, row);

		item.complete();
	});
	return translator.translate();
}

function addAttachment(item, row) {
	// attach linked document as attachment if available
	if (row.attachmentLink) {
		let	attachment = {
			title: "Available Version (via Google Scholar)",
			url: row.attachmentLink,
		};
		let mimeType = MIME_TYPES[row.attachmentType];
		if (mimeType) {
			attachment.mimeType = mimeType;
		}
		item.attachments.push(attachment);
	}
}

/*
  Test Case Descriptions:  (these have not been included in the test case JSON below as per
							aurimasv's comment on https://github.com/zotero/translators/pull/833)

		"description": "Legacy test case",
	"url": "http://scholar.google.com/scholar?q=marbury&hl=en&btnG=Search&as_sdt=1%2C22&as_sdtp=on",
	
		"description": "Legacy test case",
		"url": "http://scholar.google.com/scholar?hl=en&q=kelo&btnG=Search&as_sdt=0%2C22&as_ylo=&as_vis=0",
	
		"description": "Legacy test case",
		"url": "http://scholar.google.com/scholar?hl=en&q=smith&btnG=Search&as_sdt=0%2C22&as_ylo=&as_vis=0",
	
		"description": "Legacy test case",
		"url": "http://scholar.google.com/scholar?hl=en&q=view+of+the+cathedral&btnG=Search&as_sdt=0%2C22&as_ylo=&as_vis=0",

		"description": "Legacy test case",
		"url": "http://scholar.google.com/scholar?hl=en&q=clifford&btnG=Search&as_sdt=0%2C22&as_ylo=&as_vis=0",

		"description": "Legacy test case",
		"url": "http://scholar.google.com/scholar_case?case=9834052745083343188&q=marbury+v+madison&hl=en&as_sdt=2,5",

		"description": "Decided date not preceded by any word or any other date line",
		"url": "http://scholar.google.com/scholar_case?case=11350538941232186766",

		"description": "Decided date preceded by 'Dated'",
		"url": "http://scholar.google.com/scholar_case?case=4250138655935640563",

		"description": "Decided date preceded by 'Released'",
		"url": "http://scholar.google.com/scholar_case?case=8121501341214166807",

		"description": "Decided date preceded by 'Decided' and also by a 'Submitted' date line",
		"url": "http://scholar.google.com/scholar_case?case=834584264358299037",

		"description": "Decided date preceded by 'Decided' and also by an 'Argued' date line",
		"url": "http://scholar.google.com/scholar_case?case=15235797139493194004",

		"description": "Decided date preceded by 'Decided' and also by an 'Argued' date line and followed by an 'As Modified' line; most citers of this case appear to use the Decided date, not the As Modified date",
		"url": "http://scholar.google.com/scholar_case?case=163483131267446711",
	
*/

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://scholar.google.com/scholar?q=marbury&hl=en&btnG=Search&as_sdt=1%2C22&as_sdtp=on",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://scholar.google.com/scholar?hl=en&q=kelo&btnG=Search&as_sdt=0%2C22&as_ylo=&as_vis=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://scholar.google.com/scholar?hl=en&q=smith&btnG=Search&as_sdt=0%2C22&as_ylo=&as_vis=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://scholar.google.com/scholar?hl=en&q=view+of+the+cathedral&btnG=Search&as_sdt=0%2C22&as_ylo=&as_vis=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://scholar.google.com/scholar?hl=en&q=clifford&btnG=Search&as_sdt=0%2C22&as_ylo=&as_vis=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://scholar.google.com/scholar_case?case=9834052745083343188&q=marbury+v+madison&hl=en&as_sdt=2,5",
		"items": [
			{
				"itemType": "case",
				"caseName": "Marbury v. Madison",
				"creators": [],
				"dateDecided": "1803",
				"court": "Supreme Court",
				"firstPage": "137",
				"itemID": "1",
				"reporter": "US",
				"reporterVolume": "5",
				"attachments": [
					{
						"title": "Google Scholar Judgement",
						"type": "text/html"
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
		"url": "http://scholar.google.com/scholar_case?case=11350538941232186766",
		"items": [
			{
				"itemType": "case",
				"caseName": "Meier ex rel. Meier v. Sun Intern. Hotels, Ltd.",
				"creators": [],
				"dateDecided": "April 19, 2002",
				"court": "Court of Appeals, 11th Circuit",
				"firstPage": "1264",
				"itemID": "1",
				"reporter": "F. 3d",
				"reporterVolume": "288",
				"attachments": [
					{
						"title": "Google Scholar Judgement",
						"type": "text/html"
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
		"url": "http://scholar.google.com/scholar_case?case=4250138655935640563",
		"items": [
			{
				"itemType": "case",
				"caseName": "Patio Enclosures, Inc. v. Four Seasons Marketing Corp.",
				"creators": [],
				"dateDecided": "September 21, 2005",
				"court": "Court of Appeals, 9th Appellate Dist.",
				"extra": "Jurisdiction: Ohio",
				"firstPage": "4933",
				"itemID": "1",
				"reporter": "Ohio",
				"reporterVolume": "2005",
				"attachments": [
					{
						"title": "Google Scholar Judgement",
						"type": "text/html"
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
		"url": "http://scholar.google.com/scholar_case?case=8121501341214166807",
		"items": [
			{
				"itemType": "case",
				"caseName": "Click v. Estate of Click",
				"creators": [],
				"dateDecided": "June 13, 2007",
				"court": "Court of Appeals, 4th Appellate Dist.",
				"extra": "Jurisdiction: Ohio",
				"firstPage": "3029",
				"itemID": "1",
				"reporter": "Ohio",
				"reporterVolume": "2007",
				"attachments": [
					{
						"title": "Google Scholar Judgement",
						"type": "text/html"
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
		"url": "http://scholar.google.com/scholar_case?case=834584264358299037",
		"items": [
			{
				"itemType": "case",
				"caseName": "Kenty v. Transamerica Premium Ins. Co.",
				"creators": [],
				"dateDecided": "July 5, 1995",
				"court": "Supreme Court",
				"extra": "Jurisdiction: Ohio",
				"firstPage": "415",
				"itemID": "1",
				"reporter": "Ohio St. 3d",
				"reporterVolume": "72",
				"attachments": [
					{
						"title": "Google Scholar Judgement",
						"type": "text/html"
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
		"url": "http://scholar.google.com/scholar_case?case=15235797139493194004",
		"items": [
			{
				"itemType": "case",
				"caseName": "Tinker v. Des Moines Independent Community School Dist.",
				"creators": [],
				"dateDecided": "February 24, 1969",
				"court": "Supreme Court",
				"firstPage": "503",
				"itemID": "1",
				"reporter": "US",
				"reporterVolume": "393",
				"attachments": [
					{
						"title": "Google Scholar Judgement",
						"type": "text/html"
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
		"url": "http://scholar.google.com/scholar_case?case=163483131267446711",
		"items": [
			{
				"itemType": "case",
				"caseName": "Kaimowitz v. Board of Trustees of U. of Illinois",
				"creators": [],
				"dateDecided": "December 23, 1991",
				"court": "Court of Appeals, 7th Circuit",
				"firstPage": "765",
				"itemID": "1",
				"reporter": "F. 2d",
				"reporterVolume": "951",
				"attachments": [
					{
						"title": "Google Scholar Judgement",
						"type": "text/html"
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
		"url": "https://scholar.google.com/scholar_case?case=608089472037924072",
		"items": [
			{
				"itemType": "case",
				"caseName": "Kline v. Mortgage Electronic Security Systems",
				"creators": [],
				"dateDecided": "February 27, 2013",
				"court": "Dist. Court",
				"docketNumber": "Case No. 3:08cv408",
				"extra": "Jurisdiction: SD Ohio",
				"attachments": [
					{
						"title": "Google Scholar Judgement",
						"type": "text/html"
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
		"url": "https://scholar.google.de/citations?view_op=view_citation&hl=de&user=INQwsQkAAAAJ&citation_for_view=INQwsQkAAAAJ:u5HHmVD_uO8C",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Linked data: The story so far",
				"creators": [
					{
						"firstName": "Christian",
						"lastName": "Bizer",
						"creatorType": "author"
					},
					{
						"firstName": "Tom",
						"lastName": "Heath",
						"creatorType": "author"
					},
					{
						"firstName": "Tim",
						"lastName": "Berners-Lee",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"bookTitle": "Semantic services, interoperability and web applications: emerging concepts",
				"itemID": "bizer2011linked",
				"libraryCatalog": "Google Scholar",
				"pages": "205–227",
				"publisher": "IGI global",
				"shortTitle": "Linked data",
				"url": "https://www.igi-global.com/chapter/linkeddata-story-far/55046",
				"attachments": [
					{
						"title": "Available Version (via Google Scholar)",
						"mimeType": "application/pdf"
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
		"url": "https://scholar.google.de/citations?user=INQwsQkAAAAJ&hl=de&oi=sra",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://scholar.google.be/scholar?hl=en&as_sdt=1,5&as_vis=1&q=%22transformative+works+and+cultures%22&scisbd=1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://scholar.google.com/citations?user=Cz6X6UYAAAAJ&hl=en",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://scholar.google.com/scholar_case?case=16585781351150334057",
		"items": [
			{
				"itemType": "case",
				"caseName": "Strickland v. Washington",
				"creators": [],
				"dateDecided": "May 14, 1984",
				"court": "Supreme Court",
				"firstPage": "668",
				"itemID": "1",
				"reporter": "US",
				"reporterVolume": "466",
				"attachments": [
					{
						"title": "Google Scholar Judgement",
						"type": "text/html"
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
		"url": "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=RjsFKYEAAAAJ&cstart=20&pagesize=80&citation_for_view=RjsFKYEAAAAJ:5nxA0vEk-isC",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Weakness of Power and the Power of Weakness: The Ethics of War in a Time of Terror",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Michael",
						"lastName": "Northcott"
					}
				],
				"date": "04/2007",
				"DOI": "10.1177/0953946806075493",
				"ISSN": "0953-9468, 1745-5235",
				"abstractNote": "In 2002 a significant number of American theologians declared that the ‘war on terror’ was a just war. But the indiscriminate strategies and munitions technologies deployed in the invasion and occupation of Iraq fall short of the just war principles of non-combatant immunity, and proportionate response. The just war tradition is one of Christendom's most enduring legacies to the law of nations. Its practice implies a standard of virtue in war that is undermined by the indiscriminate effects of many modern weapons and by the deliberate targeting of civilian infrastructure. The violent power represented by the technology of what the Vatican calls ‘total war’has occasioned a significant shift in Catholic social teaching on just war since the Second World War. Total war generates an asymmetry of weakness in those subjected to these techniques of terror, and this has only strengthened the violence of the Islamist struggle against the West. But those who draw inspiration and legitimacy from this weakness in their struggle with the West also reject virtue in war. In a time of terror the theological vocation is to speak peace and to recall the terms in which the peace of God was achieved by way of the cross.",
				"issue": "1",
				"journalAbbreviation": "Studies in Christian Ethics",
				"language": "en",
				"libraryCatalog": "DOI.org (Crossref)",
				"pages": "88-101",
				"publicationTitle": "Studies in Christian Ethics",
				"shortTitle": "The Weakness of Power and the Power of Weakness",
				"url": "http://journals.sagepub.com/doi/10.1177/0953946806075493",
				"volume": "20",
				"attachments": [
					{
						"title": "Available Version (via Google Scholar)",
						"mimeType": "application/pdf"
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
