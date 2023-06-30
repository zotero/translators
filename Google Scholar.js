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
	"lastUpdated": "2023-06-29 23:52:53"
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

	var type = detectWeb(doc, url);
	if (type == "multiple") {
		// An appropriate "multi-scraper" async function will be constructed
		// depending on how the entry row info is generated
		let multiScraper;

		if (getSearchResults(doc, true/* checkOnly */)) {
			let items = await Z.selectItems(getSearchResults(doc, false));
			if (!items) {
				return;
			}

			multiScraper = makeGSScraper(
				Object.keys(items),
				rowsFromSearchResult,
				new URL(doc.location)
			);
		}
		else if (getProfileResults(doc, true/* checkOnly */)) {
			let urls = await Z.selectItems(getProfileResults(doc, false));
			if (!urls) {
				return;
			}
			const profileName = text(doc, "#gsc_prf_in");

			multiScraper = makeGSScraper(
				Object.keys(urls),
				rowsFromProfile,
				getEmulatedSearchURL(profileName),
				true/* expensive */
			);
		}

		await multiScraper(doc);
	}
	else {
		// e.g. https://scholar.google.de/citations?view_op=view_citation&hl=de&user=INQwsQkAAAAJ&citation_for_view=INQwsQkAAAAJ:u5HHmVD_uO8C
		await scrape(doc, url, type);
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
		// Single-item row computed from "View article" page content.
		let row = parseViewArticle(doc);
		if (row.id) {
			// Create an async scraper that reuses the profile scraper, for
			// this one entry only.
			let singleScraper = makeGSScraper(
				[url],
				function* () {
					yield row;
				},
				getEmulatedSearchURL(profileName),
				true/* expensive */);

			await singleScraper(doc);
		}
		else {
			throw new Error(`Expected 'View article' page at ${url}, but failed to extract article info from it.`);
		}
	}
}

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
 * Information object for one Google Scholar entry or "row"
 *
 * @typedef {Object} RowObj
 * @property {?string} id
 * @property {string} [directLink]
 * @property {string} [attachmentLink]
 * @property {string} [attachmentType]
 * @property {string} [byline]
 */


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

// Reusable external-search utility for both DOI and ArXiv

/**
 * Search using external ID
 *
 * @constructor
 * @param {string} searchKey - The property to be used for the ID in the
 * item-stub object used as the basis of search (e.g. "DOI", "arXiv", etc.)
 * @param {string} translatorUUID - The id of the search translator
 * @param {boolean} [doAttach=false] - Whether we should use a workaround to
 * save attachments
 * @property {Z.Translate<Z.SearchTranslator>} translator
 * @property {string} key
 */
function ExternalSearch(searchKey, translatorUUID, doAttach = false) {
	let trans = Z.loadTranslator("search");
	trans.setTranslator(translatorUUID);
	// NOTE that any error during translation is suppressed, but as no item
	// gets saved, there will be an error raised anyway.
	trans.setHandler("error", () => {});

	if (doAttach) {
		trans.setHandler("itemDone", (obj, item) => {
			addAttachment(item, this.row); // hack for attachment saving.
		});
	}
	// NOTE: Here setHandler() is best understood as "append handler".
	trans.setHandler("itemDone", extHandler);

	this.translate = trans;
	this.key = searchKey;
	this.doAttach = doAttach;
}

/**
 * The signature of the work function (the function that is called for the
 * translation of each row)
 *
 * @typedef {Function} WorkFunction
 * @async
 * @param {string} identifier - Identifier (internal or external) of the row
 * @param {RowObj} [row] - The row being translated
 * @param {*} [context] - A "free-form" context object that the work
 * function can use
 * @returns {Promise} A promise that fulfills upon the completion of the
 * translation
 */

/**
 * Execute the translation using identifier. This is intended to be used as the
 * work function of a TranslationPipeline.
 *
 * @type {WorkFunction}
 */
ExternalSearch.prototype.work = function (identifier, row) {
	this.translate.setSearch({ [this.key]: identifier });
	if (this.doAttach) {
		this.row = row; // hack for attachment saving.
	}

	Z.debug(`Processing external id ${identifier} (${this.key})`);
	// Let any translation exception (most likely the "no item saved" error)
	// propagate, and make it a rule for the caller to handle it.
	return this.translate.translate();
};

// "itemDone" handler callback. Currently, only adds "via Google Scholar" to
// external libraryCatalog, and saves the item.
function extHandler(obj, item) { // eslint-disable-line no-unused-vars
	item.libraryCatalog = `${item.libraryCatalog} via Google Scholar`;
	item.complete();
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
	let m = path.match(/(10\.\d{4,}\/.+?)(?:\.(?:pdf|htm|html|xhtml|epub|xml))?$/i);
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

// Translation pipeline utilities
//
// The translations are attempted in the order of DOI -> ArXiv -> GS native.
// Each pipeline item will execute the translation and consume the row object
// if it succeeds, or pass it to the next one if it fails. The pipelines can be
// composed, building up a chain.
//
// The pipeline head has two special properties, "bin" for rows that failed all
// translations, and "trace" for the translation-task promises, suitable to be
// passed to Promise.all().

/**
 * A translation pipeline component (e.g. DOI search, ArXiv search, GS BibTeX
 * import, or indirect GS import via GS profile)
 *
 * @constructor
 * @param {Function} identify - Function that takes a RowObj and
 * returns a string ID, or falsy if the input row cannot be processed by this
 * pipeline
 * @param {WorkFunction} work - The function that implements the processing
 * work of the pipeline. The "context" parameter's value is this.context.
 * @param {number} rest - The minimum "rest" duration, between successive tasks
 * processed by this pipeline, in milliseconds
 * @param {Object} context - A free-form context variable, to be interpreted by
 * this.work as it sees fit
 * @property {TranslationPipeline?} next - Next pipeline in the chain
 * @property {RowObj[]} bin - Row objects that failed all translations
 * @property {Promise} current - The current task-queue tail to which further
 * tasks will be appended
 * @property {Promise[]} trace - Array holding references to each task promise
 * that passes through the pipeline
 * @property {boolean} restOnLead - Whether the "rest" shall apply to the
 * leading edge of a work task, in addition to the trailing edge
 */
function TranslationPipeline(identify, work, rest, context, label = "[unnamed]") {
	Object.assign(this, { identify, work, rest, context, label });
	this.next = undefined;
	this.bin = [];
	this.current = Promise.resolve();
	this.trace = [];
	this.restOnLead = false;
}

TranslationPipeline.prototype = {

	/**
	 * Accept a row and create the queued task for it, or delegate to the next
	 * in the pipeline, if any, when the identification fails.
	 *
	 * @param {RowObj} row - The row sent into the pipeline
	 */
	handleRow: function (row) {
		// Identify the row; falsy means we can't handle it.
		let id;
		try {
			id = this.identify(row);
		}
		catch (error) {
			// failed identification falls through to the case of falsy id
		}
		if (!id) {
			this.pass(row);
			return;
		}
		let currPromise = this.current.then(this.getTask(id, row));
		// TODO: Can we add less promises to the "trace"?
		this.trace.push(currPromise);
		this.current = currPromise;
	},

	/**
	 * Create an async function that executes the task -- this.work(id, row,
	 * this.context) -- with mandatory "rest" after task execution
	 *
	 * @param {string} id - ID string as returned by this.identify(row)
	 * @param {RowObj} row - The row object being operated on
	 * @returns {AsyncFunction} An async function that takes no arguments. It
	 * will execute the task on the row, and, if the task raises no exceptions,
	 * the row will not be further processed. If however the task throws, the
	 * row will be passed to downstream pipelines if any. The thrown error is
	 * suppressed, and the task always fulfills.
	 */
	getTask: function (id, row) {
		let that = this;
		async function task() {
			if (that.restOnLead && that.rest) {
				await delay(that.rest);
			}

			// Suppress any error because the pipeline isn't designed to handle
			// true rejection of the task. The rows that failed all pipelines
			// will end up in the bin.
			try {
				await that.work(id, row, that.context);
			}
			catch (error) {
				Z.debug(`Pipeline ${that.label} work-function failed with input row:`);
				Z.debug(row);
				Z.debug(error);
				that.pass(row);
			}

			// Rest no matter the success status. Unless the row says not.
			if (that.rest && !row.last) {
				await delay(that.rest);
			}
		}
		return task;
	},

	/**
	 * Pass the row to the next in the pipeline, if any. If this is the last in
	 * the pipeline, push the row into the "bin" array.
	 *
	 * @param {RowObj} row
	 */
	pass: function (row) {
		if (this.next) {
			this.next.handleRow(row);
		}
		else {
			this.bin.push(row);
		}
	},

	/**
	 * Compose the pipeline chain by adding another pipeline item
	 *
	 * The input pipeline will be appended to the tail of the current pipeline.
	 * Its "trace" and "bin" properties will be set to reference the head
	 * pipeline's.
	 *
	 * @param {TranslationPipeline} other - The pipeline to be appended
	 * @returns {TranslationPipeline} Returns this, to facilitate cascading
	 * composition
	 */
	add: function (other) {
		let p = this; // eslint-disable-line consistent-this
		while (p.next) {
			p = p.next;
		}
		p.next = other;
		other.trace = this.trace;
		other.bin = this.bin;
		return this;
	},
};

// Factory functions that creates reusable components from the translation
// implementations and the pipelines controlling them

/**
 * Convenience function that creates an external-search pipeline (DOI or
 * ArXiV)
 *
 * @param {string} key - Search key, e.g. "DOI" or "arXiv"
 * @param {string} uuid - UUID of the search translator
 * @param {Function} identify - Row-identification function
 * @param {number} rest - "Rest" time between consecutive task runs in
 * milliseconds
 * @param {boolean} [attach=false] - Whether this pipeline should attach the
 * documents as appearing on the left side on GS pages
 * @returns {TranslationPipeline}
 */
function makeExternalPipeline(key, uuid, identify, rest, attach = false) {
	let searchObj = new ExternalSearch(key, uuid, attach);
	return new TranslationPipeline(
		identify,
		searchObj.work.bind(searchObj), // work function.
		rest, null/* context */,
		`[${key}]` // use the key as pipeline label, for debugging
	);
}

/**
 * Work-function impementation for the Google Scholar translation
 *
 * @async
 */
function workGS(id, row, referrer) {
	// URL of the citation-info page fragment for the current row
	let citeURL;

	if (referrer.searchParams.get("scilib") === "1") { // My Library
		citeURL = `${GS_CONFIG.baseURL}/scholar?scila=${id}&output=cite&scirp=0&hl=${GS_CONFIG.lang}`;
	}
	else { // Normal search page
		citeURL = `${GS_CONFIG.baseURL}/scholar?q=info:${id}:scholar.google.com/&output=cite&scirp=0&hl=${GS_CONFIG.lang}`;
	}

	return processCitePage(citeURL, row, referrer.href);
}

/**
 * Generate the row objects from the GS IDs on a search-result document
 *
 * @param {string[]} gsIDs - Array of GS IDs computed from those entries on the
 * search-result page that are selected by the user
 * @param {Document} doc - The document from which the IDs are extracted
 * @yields {RowObj}
 */
function* rowsFromSearchResult(gsIDs, doc) {
	for (const id of gsIDs) {
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

		yield { id, directLink, attachmentLink, attachmentType, byline };
	}
}

/**
 * Asynchronously generate rows from the selected entries of a GS profile page,
 * for each selected URL
 *
 * @async
 * @param {string[]} viewArticleURLs - The URLs on the profile page (leading to
 * "View article" pages) selected by the user, as returned by
 * getProfileResults()
 * @param {Document} profileDoc - The profile-page document being scraped
 * @yields {Promise<(RowObj|undefined)>} Promise that resolves to the row object, obtained
 * by requesting the "View article" document at the selected URL, or undefined
 * in the case of failure
 */
function* rowsFromProfile(viewArticleURLs, profileDoc) {
	// To "navigate" to the linked "View article" page from the profile page, a
	// referrer is sent as header in the request
	const requestOptions = { headers: { Referer: profileDoc.location.href } };

	for (let i = 0; i < viewArticleURLs.length; i++) {
		let url = viewArticleURLs[i];
		Z.debug(url);

		yield requestDocument(url, requestOptions)
			.then((viewArticleDoc) => {
				let row = parseViewArticle(viewArticleDoc);
				if (row.id !== null) {
					return row;
				}
				else {
					Z.debug(`Warning: cannot find Google Scholar id in profile view-article page at ${url}; skipping.`);
					return undefined;
				}
			}, (error) => {
				Z.debug(`Warning: cannot get retrieve the profile view-article page at ${url}; skipping. The error was:`);
				Z.debug(error);
				return undefined;
			});
	}
}

/**
 * Create a TranslationPipeline instance for translating using Google Scholar
 * resources
 *
 * @param {URL} searchReferrer - URL object to be used as the referrer of
 * requests to citation-info page fragments
 * @param {number} pause - Mimium duration of the pause after each translation
 * run, in milliseconds
 * @param {boolean} [restOnLead=false] - Whether the rest should apply to the
 * leading edge as well as the trailing edge of the request-response roundtrip
 * @returns {TranslationPipeline} The pipeline object that utilizes
 * citation-info from Google Scholar itself
 */
function makeGSPipeline(searchReferrer, pause, restOnLead = false) {
	let p = new TranslationPipeline(row => row.id, // trivial identification function
		workGS, pause, searchReferrer/* context */, "[GS native]");
	p.restOnLead = restOnLead;
	return p;
}

/**
 * Convenience function that creates a GS-based multiscraper
 *
 * @param {string[]} inputStrings - Array of strings that is the key array of
 * the object returned by getSearchResults() or getProfileResults()
 * @param {Generator|AsyncGenerator} rowGenerator - Generator of rows, e.g.
 * rowsFromSearchResult or rowsFromProfile
 * @param {URL} referrerURL - URL object for the referrer, actual or emulated
 * @param {boolean} [expensive=false] - Whether the scraper is "expensive" in
 * the sense of using GS resources for both row-generation and translation
 * (this is true for profile scraping).
 * @returns {AsyncFunction} Multiscraper function that operates on the doc
 * being scraped
 */
function makeGSScraper(inputStrings, rowGenerator, referrerURL,
	expensive = false) {
	return async function (doc) {
		let rows = rowGenerator(inputStrings, doc);

		let pipeline = makeExternalPipeline(
			"DOI",
			"b28d0d42-8549-4c6d-83fc-8382874a5cb9", // DOI Content Negotiation
			extractDOI,
			20, true/* attach */
		).add(makeExternalPipeline(
			"arXiv",
			"ecddda2e-4fc6-4aea-9f17-ef3b56d7377a", // arXiv.org
			extractArXiv,
			3000)
		).add(makeGSPipeline( // "native" GS pipeline
			referrerURL,
			expensive ? Math.ceil(DELAY_INTERVAL / 2) : DELAY_INTERVAL,
			expensive/* restOnLead */)
		);

		let n = inputStrings.length;
		for (let rowPromise of rows) {
			let row = await rowPromise;
			// NOTE that unecessary after-operation delays (for the last item)
			// are cancelled
			if (row) {
				if (n <= 1) {
					row.last = true; // cancel trailing delays in the pipelines
				}

				pipeline.handleRow(row);
			}
			if (expensive && (n > 1)) {
				// Pause before getting next row; necessary for async
				// row-generation from the profile page.
				await delay(DELAY_INTERVAL);
			}
			n -= 1;
		}

		// Barrier for the conclusion of all translation tasks.
		await Promise.all(pipeline.trace);

		if (pipeline.bin.length) {
			throw new Error(`${pipeline.bin.length} row(s) failed to translate.`);
		}
	};
}

// Page-processing utilities

/**
 * Parse the "View article" page and returns the equivalent of a GS
 * search-result row
 *
 * @param {Document} viewArticleDoc - "View article" document
 * @returns {RowObj} The row object; if the id property is null, the parsing
 * failed.
 */
function parseViewArticle(viewArticleDoc) {
	let related = ZU.xpathText(viewArticleDoc,
		'//a[contains(@href, "q=related:")]/@href');
	if (!related) {
		Z.debug("Could not locate 'related' link on the 'View article' page.");
		return { id: null };
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
		return { id: null };
	}
}

/**
 * Request and read the page-fragment with citation info, retrieve BibTeX, and
 * import.
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
	const citePage = await ZU.requestText(citeURL, requestOptions);

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
	const bibTeXBody = await ZU.requestText(bibTeXURL, requestOptions);

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
			title: "Available Version via Google Scholar",
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
						"title": "Available Version via Google Scholar",
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
	}
]
/** END TEST CASES **/
