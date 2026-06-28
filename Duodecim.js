{
	"translatorID": "63ef6a3b-2e64-4d58-aedc-07b31a108928",
	"label": "Duodecim",
	"creator": "Shiyu Wang",
	"target": "https?://(www\\.(terveysportti|terveyskirjasto|kaypahoito|oppiportti|duodecimlehti)\\.fi|www.ebm-guidelines.com)/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-06-26 09:32:41"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Shiyu WANG

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

// TL;DR: Duodecim platforms do not feature proper metadata.

/**
 * ***** COMMENT TYPES *****
 * Some comments are catagorized in the form <category>:? <comment text>
 *
 * // e.g.: followed by TDOIs OR a type of content. Some TDOIs require subscription and are not included in public testCases.
 * // Zotero.debug(): optional debug statements. Statements should beging with the member function name or the stages in doWeb().
 * // CAPITAL LETTERS: sections of code
 * // JS: JavaScript syntax
 * // ZU: adoption of Zotero.Utilities library functions OR reason why a ZU is not used
 * // ZOTERO: authomated/stock actions by Zotero connector/client
 * // ESLINT: warning from ESLINT during GitHub pull request test
 * // ESLINT-SCAFFOLD: discrepancies between Scafford (Zotero 9) and the test
 * // CITATION: compliances with / deriviations from standard APA 7th edition
 * // CSL: filling in CSL fields
 * // FINNISH: concerning handling the Finnish language or Finland exclusives
 * // TYPE: usually CSS selectors for spicific platform/content
 * // TODO: to-dos
 * // other comments beginning with lower case letters: line explaination; commented code blocks
 */

/**
 * ***** ABBREVIATIONS / KEY CONCEPTS *****
 * Duodecim: Finnish Medical Society Duodecim; also means Duodecim Publishing Company
 * TDOI: Duodecim uses universal URI. Most such URIs may be accessed in Terveysportti, in the form `https://www.terveysportti.fi/doi/<TDOI>`, hence 'T' starting the name.
 * DTK: Duodecim TietoKanta, 'Duodecim database'.
 *
 * Abbreviation list of Duodecim domains:
 * TP: terveysportti.fi, 'health portal'
 * - LäTK: LääkeTietoKanta, 'medicinal database'
 * OP: oppiportti.fi, 'learning portal'
 * TK: terveyskirjasto.fi, ' health library'
 * KP: kaypahoito.fi, Käypä hoito -suositus, offical English name Current Care Guideline(s)
 * - CCG: Current Care Guideline
 * see also:
 * - target URL regex
 * - comment block before testCases
 *
 * Abbreviation list of content published by or hosted on Duodecim platforms:
 * DLehti: Medical Journal Duodecim
 * SLL: Suomen LääkäriLehti, Finnish Medical Journal
 * YKT: Lääkärin käsikirja, 'Doctor's manual'
 * EBM/EBMG: Evidence-Based Medical Guidelines, English translations of YKT.
 */

// ***** GLOBAL HELPER FUNCITONS *****

/**
 * Parse author names with title removal (handles Finnish naming conventions)
 * This function might not preserve abbreviated middle names for articles like Cochrane or Dynamed summaries.
 * ZU.cleanAuthor() won't split raw name strings properly.
 * A complex example and its handling: voh00042 (paid article, requires subscription to TP)
 * @param {string} nameString From doWeb()
 * @param {boolean} isSingleString From doWeb()
 * @returns Object: Zotero author object
 */
function parseAuthors(nameString, isSingleAuthor) {
	// Zotero.debug('parseAuthors(): parsing authors.');
	// SINGLE-WORD, GROUP AUTHOR
	if (!/\s/.test(nameString)) {
		// Zotero.debug('parseAuthors(): Single-word author.');
		if (['Toimitus', 'Editors'].includes(nameString)) return []; // e.g. dlk00221, ykt00096, ebm00069
		return [{
			lastName: nameString,
			creatorType: 'author',
			fieldMode: 1 // cite: via other translators
		}];
	}

	// ONE GROUP AUTHOR
	const ccgGroup = /(^Käypä hoito|.*työryhmä).*/i.test(nameString); // single group author for CCG
	if (ccgGroup || isSingleAuthor) {
		return [{
			lastName: nameString,
			creatorType: ccgGroup ? 'bookAuthor' : 'author', // CITATION: APA citing CCG content: Long group author string
			fieldMode: 1 // CITATION: via other translators
		}];
	}

	// TWO-LINE AUTHOR FIELD
	nameString = /\n/.test(nameString) // in which the first line is usually the same as copyright/organization name
		? nameString.split('\n')[1] // e.g. nla00004
		: nameString;

	// HUMAN AUTHOR(s) / MULTIPLE AUTHORS
	var nameArray = [];
	const capitalRegex = /[A-ZÄ-Ö]/; // currently matching U+00C4 – U+00D6 (ASCII 192–214)
	// Iterating name candidates
	for (const seg of nameString.split(/,\s*|\s+(ja|and)\s+/i)) { // FINNISH: 'ja' means 'and'
		if (typeof seg !== 'string') continue;
		if (seg.toString().split(' ').length < 2) continue; // removing titles between commas and generic author placeholders
		var isGroupAuthor = false;
		// JS: anonymous function | I could not think of a better implementation.
		const nameToPush = ((str) => { // ESLINT: Function declared in a loop contains unsafe references to variable(s) 'isGroupAuthor'
			const words = str.toString().split(' ');
			var oneName = '';
			// Iterating words in a name candidateg
			for (const word of words) {
				// FINNISH: remove titles/degrees of authors.
				if (/(^\(?(TtM|AMK|YAMK)[(-]?.*|.*(lääkäri|asiantutkija)$)/i.test(word)) { // TODO collect statics
					// Zotero.debug(`parseAuthors(): Skipping author title "${word}" in name candidate "${str}"`);
					oneName = ''; // e.g. dlk00084, voh00042
					continue;
				}
				// regular name segment
				if (capitalRegex.test(word.charAt(0))
					&& !(capitalRegex.test(word.charAt(word.length - 1)))) { // not ending with capital letter
					oneName += word + ' ';
					continue;
				}
				// handling exceptions
				// Zotero.debug(`parseAuthors(): on name string '${seg}'. Judging exceptional word "${word}" in raw name string "${str}". Index from 0: i=${i} of ${words.length - 1}`);
				if (word === words[words.length - 1] // e.g. shk00004
					&& !(/[\W]/.test(word))) { // FINNISH: some organization names in Finnish may end with ry ('rekisteröity yhdistys', meaning 'association'), oy ('osakeyhtiö', like LLC or Ltd. in English), etc.
					oneName += word;
					isGroupAuthor = true;
					// Zotero.debug(`parseAuthors(): nameToPush group author ${oneName}`);
				}
				else {
					// Zotero.debug(`parseAuthors(): Skipping exceptional word "${word}" in name candidate "${str}"`);
					oneName = ''; // e.g. dlk00084
					// Zotero.debug(`parseAuthors(): excluding segment ${str}`);
				}
			}
			return oneName.trim();
		})(seg);
		if (!nameToPush.length) continue;

		if (!isGroupAuthor) {
			var parts = nameToPush.split(/\s+/);
			nameArray.push({
				firstName: parts.slice(0, -1).join(' '),
				lastName: parts[parts.length - 1],
				creatorType: 'author',
			});
			// Zotero.debug(`parseAuthors(): pushed name object ${JSON.stringify(nameArray[nameArray.length - 1])}`);
		}
		else {
			// Zotero.debug(`parseAuthors(): pushing non-CCG group author to nameArray ${nameToPush}`);
			nameArray.push({
				lastName: nameToPush,
				creatorType: 'author',
				fieldMode: 1
			});
		}
	}

	return nameArray;
}

/**
 * Regex cleanup would remove useful \n's
 * @param {string} inner innerText(sel)
 * @returns string
 */
function returnProtect(inner) {
	const innerArray = inner.split('\n');
	// Zotero.debug(`returnProtect() splitting: "${innerArray}"`);
	var output = '';
	if (innerArray.length === 1) return inner;
	for (const line of innerArray) {
		const cleanLine = line.replace(/[\xA0\r\s]+/g, " "); // ZU.superCleanString only trims; 260623: ZU.superCleanString also trims EOL period dot (.).
		output += `${cleanLine}\n`;
	}
	// Zotero.debug(`returnProtect output: "${output}"`);
	return output.substring(0, output.length - 1);
}

/**
 * More forceful string cleaning, especially when ZU.superCleanString() does not work as expected
 * @param {string} raw
 * @returns one-line, clean string
 */
function ultimateOneLiner(raw) {
	return raw.replace(/[\xA0\r\n\s]+/g, " ");
}

/**
 * Find book title as part of TDOI
 * Some TDOIs are exclusive to some DTKs.
 * Each prefix refer to one book or one type of resource.
 * Using 'prefix' to not be confused with `item.bookTitle`.
 * @param {string} tdoi
 * @returns {string} Prefix
 */
function findPrefixTDOI(tdoi) {
	const prefixRegex = /^([a-z]{3}|cd)(?![a-z])/;
	return (prefixRegex.test(tdoi)) ? tdoi.match(prefixRegex)[0] : tdoi;
}

/**
 * Fallback, static version of tdoiRedirect()
 * Collecting prefixes by containing DTKs.
 * @param {string} prefix
 * @returns {boolean} whether to shorten item.URL
 */
function urlShortenerStatic(prefix) {
	// const tdoiBook = tdoi.match(/^([a-z]{3}|cd)(?=\d)/)[0];
	// if (typeof tdoiBook !== 'string') return false;
	const doiLTK = 'pgr ima vid aud shp hpt lab sll yll san mat nla nko pjh pko tul fac lto nak evd ykt'.split(' ');
	const doiAHO = 'aho akt ala eho tpa myh aop kir knk ltp vat vla ava ekg'.split(' '); // phh > oppi
	// const doiTKT = '';
	const doiHAT = 'hml tod apl shl hka hvv'.split(' ');
	const doiSHK = 'shk voh mjp'.split(' ');
	// const doiVHT = ''; // e.g. hyvät käytännöt
	// const doiVSO = 'vso';
	// const doiOPPI = ''; // Naming: the legacy DTK containing textbook articles from Oppiportti is 'oppi'. Nowadays TDOI redirection goes to oppiportti.fi or specialized DTK
	// const doiBook = concat(doiLTK,' ',doiAHO,' ',doiTKT,' ',doiHAT,' ',doiSHK,' ',doiVHT,' ',doiVSO,' ',doiOPPI).split(' '); // TODO: also in attachment addiction
	const doiBook = 'ebm vso'.split(' ').concat(doiLTK, doiAHO, doiHAT, doiSHK).toSorted();
	if (doiBook.includes(prefix)) { // JS: array find
		Zotero.debug('urlShortenerStatic(): Shortening URL.');
		return true;
	}
	Zotero.debug('urlShortenerStatic(): not shortening URL.');
	return false;
}

/**
 * Sends a TDOI redirection request and checks whether the short link works and where it leads to.
 * @param {string} tdoi
 * @returns {boolean} Whether a TDOI is redirectable
 */
async function tdoiRedirect(tdoi) {
	const tdoiURL = 'https://www.terveysportti.fi/doi/' + tdoi;
	// Zotero.debug(`tdoiRedirect(): fetching TDOI URL`);
	const tdoiObj = new URL(await ZU.request(tdoiURL).then((response) => {
		Zotero.debug(`tdoiRedirect(): responsing URL: ${response.responseURL}`); // ZU: response JSON has its own structure.
		return response.responseURL;
	}));

	if (tdoiObj.hostname === 'www.terveysportti.fi' && /^\/apps\/dtk\/.*/.test(tdoiObj.pathname)) {
		// Zotero.debug('tdoiRedirect(): returning true > shortening item URL');
		return true;
	}
	// Zotero.debug(`tdoiRedirect(): No TDOI redirect loaded.`);
	return false;
}

/**
 * Streamlining item.url processing by domain or by calling tdoiRedirect()
 * @param {Object} urlObj passing in a URL object as doWeb() relies on URL object
 * @param {string} tdoi TDOI
 * @returns {string} generated URL
 */
async function urlGen(urlObj, tdoi) {
	// Determine base URL for item URL construction
	var genURL = urlObj.href;
	var divider = /\/article\/empty/.test(genURL) ? 'empty' : tdoi;

	// TODO: LäTK
	// const isLaake = /apps\/laake\//.test(url) ? true : false;

	try {
		if (await tdoiRedirect(tdoi)) { // if (urlShortenerStatic(prefix)) {
			Zotero.debug('urlGen(): tdoiRedirect(TDOI) leads to DTK page. Shortening URL.');
			genURL = 'https://www.terveysportti.fi/doi/' + tdoi;
		}
		else if (urlObj.hostname !== 'www.terveysportti.fi') {
			genURL = urlObj.origin + '/';
		}
		// else if (isLaake) {
		// 	baseUrl = doc.url;
		// }
		else if (divider) {
			// Zotero.debug('urlGen(): Constructing URL by source URL concatenation.');
			genURL = genURL.split(divider)[0] + tdoi;
		}
		else {
			genURL = genURL.split('/article/')[0] + '/article/' + tdoi;
		}
	}
	catch (e) {
		Zotero.debug(`urlGen(): encountered error ${e} on line ${e.lineNumber}`);
		Zotero.debug(`urlGen(): attempting static lookup`);
		genURL = urlShortenerStatic(findPrefixTDOI(tdoi)) ? 'https://www.terveysportti.fi/doi/' + tdoi : urlObj.href;
	}
	if (urlObj.href.includes(tdoi + '/artikkeli')) { // could be in LäTK.
		genURL = urlObj.href;
	}
	if (typeof genURL !== 'string') { // fallback
		genURL = urlObj.href;
	}

	return genURL;
}

/**
 * Some resources, namely those in ltk, are in English.
 * @param {string} prefix  // TODO: modify to prefix
 * @param {URL} url The URL object created at the beginning of doWeb()
 * @returns {boolean} Source is in English > true; otherwise > false
 */
function englishSource(prefix, url) {
	var isEN = false;
	if (url.hostname === 'www.ebm-guidelines.com') isEN = true;
	if (!isEN) isEN = 'ebm cd dyn ccs'.split(' ').includes(prefix); // TODO collect statics
	// Zotero.debug(`englishSource(): article ${isEN ? 'seems' : 'does not seem'} to be in English`);
	return isEN;
}

/**
 * Replicated from dtk-modern-devtools-generate-testcase.js line 106-111
 * Normalize publisher name: remove copyright symbols, years, standardize Duodecim
 * @param {string} raw copyright text
 * @returns {string} Final publisher text
 */
function normalizePublisher(raw) {
	if (!raw) return '';
	var s = raw.replace(/[©\u00A9]/g, '').replace(/\(?\d{4}\)?/, '').trim();
	if (/kustannus oy duodecim/i.test(s) || /duodecim/i.test(s)) return 'Duodecim'; // CITATION: 'Duodecim Publishing Company' would be verbose in APA style.
	return s;
}

/**
 * Parse NLM journal bibliography format.
 * @param {string} nlmString YYYY;volume(issue):pages
 * @returns {Array} or null
 */
function journalPage(nlmString) {
	const nlmRegex = /(?<year>\d{4});(?<volume>.*?)\((?<issue>.*?)\):(?<pages>.*)/; // also works for duodecimlehti.fi
	try {
		return nlmString.match(nlmRegex).groups;
	}
	catch (e) {
		Zotero.debug(`journalPage(): ERROR on line ${e.lineNumber}: ${e}`);
	}
	return null;
}

/**
 * Why not ZU: Zotero.Date.strToDate depends on local Zotero.locale.
 * @param {HTMLElement} dmy containing a date in d.m.y format
 * @returns {*} ISO date YYYY-MM-DD, or null
 */
function eurDateToISO(dmy) {
	const eurDateRegex = /(?<day>\d{1,2})\W(?<month>\d{1,2})\W(?<year>\d{4}$)/;
	if (!dmy) return null;
	try {
		const date = dmy.innerText.match(eurDateRegex).groups;
		const eurISODate = `${date.year}-${ZU.lpad(date.month, '0', 2)}-${ZU.lpad(date.day, '0', 2)}`;
		// Zotero.debug(`eurDateToISO(): returning ISO date: ${eurISODate}`);
		return eurISODate;
	}
	catch (e) {
		Zotero.debug(`eurDateToISO(): ERROR on line ${e.lineNumber}: ${e}`);
	}
	return null;
}

/**
 * For ykt/ebm articles with two dates
 * @param {HTMLElement} div containing date string
 * @returns {string} ISO date string YYYY-MM-DD
 */
function lastDate(div) {
	if (!div) return '';
	if (div.hasAttribute('datetime')) return div.getAttribute('datetime');

	if (div.childNodes.length > 1) {
		// Zotero.debug('lastDate(): retrieving last modified date.');
		var date = '';
		date = eurDateToISO(div.querySelector('var')); //  text in read
		if (!date) { // e.g. ykt/ebm 'Päivitetty kokonaisuudessaan' / two <span>s
			const spans = div.querySelectorAll('span');
			date = eurDateToISO(spans[1]);
			date = !date ? eurDateToISO(spans[0]) : date;
		}
		return date;
	}
	else {
		return eurDateToISO(div);
	}
}

/**
 * Primarily for downloading PDF for Lääkärilehti.
 * Since June 2026, title of all SLL articles are publicly available.
 * @param {*} path a pathname containing a Lääkärilehti article behind the paywall.
 * @returns {Promise<boolean>} whether the network IP is a subscriber to the url
 */
async function onCampus(path = '/e48243') {
	const sllTestDoc = await ZU.requestDocument(`https://www.laakarilehti.fi${path}`).then((doc) => {
		// return doc.title;
		return doc;
	});
	// if (sllTest.search(/Tiedemaailma/) != -1) {
	// if (!sllTestDoc.querySelector('div.article-preview-fade') && !sllTestDoc.querySelector('div.login-container')) {
	if (sllTestDoc.querySelector('div.utils')) {
		Zotero.debug('onCampus(): on a network with subscription to Lääkärilehti. Downloading the PDF via direct link');
		return true;
	}
	Zotero.debug('onCampus(): Not on campus. Need proxy for SLL.');
	return false;
}

/**
 * Main translator function to detect DTK content
 * @param {*} doc document
 * @param {string} url for SIC! detection
 * @returns content type {string} or false {boolean}
 */
async function detectWeb(doc, url) {
	if (doc.querySelector('.duo-meta_journal') // journals on DTK
		|| doc.querySelector('.dl-article-bibliographic') // duodecimlehti.fi; devtools inline test: document.querySelector('div.dl-article-bibliographic').innerText.match(/(?<year>\d{4});(?<volume>.*?)\((?<issue>.*?)\):(?<pages>.*)/).groups
		|| /article\/sic\d{5}/g.test(url) // in vht DTK: Sic! Fimea
		|| /\/sic\d{5}\/artikkeli/g.test(url)) { // in LäTK: Sic! Fimea
		return 'journalArticle';
	}
	else if (doc.querySelector('.duo-database') || doc.querySelector('.duo-sortkey') || doc.querySelector('h1')) { // TODO generalization
		return 'bookSection';
	} // TODO: audio/video?
	return false;
}

/**
 * doWeb(): Main translator function - extracts metadata from Duodecim page DOM
 * Parts:
 * link and locators, including
 * - Page layout inspection
 * author(s): handled fully by parseAuthors() after line selection
 * date
 * title
 * index options
 * publisher
 * journal-dependent fields and PDF attachment specifics
 * snapshot
 * abstract
 * @param {*} doc document
 * @param {*} url document.URL
 */
async function doWeb(doc, url) {
	var item = new Zotero.Item(await detectWeb(doc, url));

	const isJournal = (item.itemType === 'journalArticle');

	// PARSING LINK AND TDOI LOCATOR
	const urlObj = new URL(url); // TODO keep hash link
	const isTP = urlObj.host === 'www.terveysportti.fi';
	const isDTK = (/^\/apps\/dtk\/.*/.test(urlObj.pathname));
	// const isYktEbm = doc.querySelector('div.duo-authors-link');
	const isDTKLegacy = /\?p_artikkeli.*/.test(urlObj.search);
	const isDLehti = urlObj.host === 'www.duodecimlehti.fi';
	const isOP = urlObj.host === 'www.oppiportti.fi';
	const isTK = urlObj.host === 'www.terveyskirjasto.fi';
	const isKP = urlObj.host === 'www.kaypahoito.fi';

	// LOCATOR: PAGE LAYOUT INSPECTION: determining CSS class selector
	const dClass = (isDTKLegacy || isDLehti)
		? '' // legacy doc.querySelector('div.date')/ LäTK
		: (isOP || isTK || doc.querySelector('div.d-updated')) // also works for some articles on LäTK
			? 'd-'
			: 'duo-'; // DTK, CCG (CCG: header element for DTK is present in HTML but is not displayed (display: none in CCG's CSS))
	Zotero.debug(`doWeb(): Determined selector prefix dClass: '${dClass}'`);

	var urlMatchRegex = isDTK
		? /\/article\/(\w{2,3}\d{5,6})(?![\w\d])/
		: isDTKLegacy
			? /(?<=avaa\?p_artikkeli=)\w{3}\d{5}(?![\w\d])/
			: /(?<=\/)\w{3}\d{5}(?![\w\d])/; // TODO LäKT
	const tdoi = text(`div.${dClass}identifier span`) // TYPE TK, legacy
		|| text(`span.${dClass}identifier`)
		|| urlMatchRegex.test(url)
		? url.match(urlMatchRegex)[isDTK ? 1 : 0]
		: '';

	Zotero.debug(`doWeb(): ${/^(\w{3}\d{5}|cd\d{6})$/.test(tdoi) ? '' : 'INVALID '}TDOI=${tdoi}`);
	const prefix = findPrefixTDOI(tdoi);

	item.url = (isDTK && isTP) // keeping non-TP domains
		? await urlGen(urlObj, tdoi)
		: (isOP || isTK || isKP)
			? 'https://' + urlObj.host + '/' + tdoi // TYPE: OP and publicly accessible content
			: url;

	item.language = englishSource(prefix, urlObj) // CSL: ISO 639 set 1
		? 'en'
		: ((['khr', 'gvr'].includes(prefix)) // TODO collect statics
			? 'se'
			: 'fi'); // make Finnish the default language

	// PARSING AUTHORS
	var authorClass = doc.querySelector('div.duo-authors-link')
		? 'div.duo-authors-link' // TYPE ykt, ebm
		: isDLehti
			? 'div.dl-article-editors-container'
			: dClass === ''
				? 'div.person'
				: `div.${dClass}authors`;

	// ESLINT-SCAFFOLD: won't make <br> a \n
	// var authorsRaw = doc.querySelector(authorClass) ? innerText(authorClass) : null;
	const twoLineAuthor = doc.querySelector(authorClass) ? doc.querySelector(authorClass).querySelector('br') : false;
	var authorsRaw = doc.querySelector(authorClass)
		? twoLineAuthor
			? doc.querySelector(authorClass).innerHTML.split('<br>')[1]
			: innerText(authorClass)
		: null;
	Zotero.debug(`doWeb(): Raw author string: ${authorsRaw}`);

	const singleAuthor = ['lab'].includes(prefix); // TODO statics
	// var authors = singleAuthor ? authorsRaw : parseAuthors(authorsRaw, singleAuthor, item.language);
	if (authorsRaw) item.creators = parseAuthors(authorsRaw, singleAuthor, item.language);

	// PARSING DATE
	// extract updated element or journal metadata
	var dateSelector = doc.querySelector('div.date') ? 'div.date' : `div.${dClass}updated`;

	var dateStr = lastDate(doc.querySelector(dateSelector));
	// item.date: final date field determined in journal section

	// PARSING TITLE
	item.title = text('h1').replace(/[\xA0\r\s]+/g, " "); // e.g. hot00013
	// Zotero.debug(`item.title = ${item.title}`);
	if (/: /.test(item.title)) { // FINNISH: semicolon followed by a suffix in Finnish may be used in inflecting abbreviations, hence ': ' instead of ':'
		item.shortTitle = item.title.split(': ')[0];
		if (item.shortTitle === 'Tietoa potilaalle') { // TODO collect statics
			item.shortTitle = item.title.split(':')[1];
			item.title = item.shortTitle; // patient-oriented articles on terveyskirjasto.fi do not feature 'Tietoa potilaalle' in title.
			// ZU: Zotero would remove shortTitle since the two titles are now the same
		}
	}
	else if (/[-–]/.test(item.title)) { // en dash, Alt + (numpad) 0150 / (macOS) Option + -
		item.shortTitle = item.title.split(/[-–]/)[0];
	}

	const dbRaw = text(`div.${dClass}database`) || (isDLehti ? 'Lääketieteellinen Aikakauskirja Duodecim' : null); // CITATION: APA requires that journal titles be written in its offical, original form.
	if (dbRaw && isJournal) item.publicationTitle = dbRaw;
	if (dbRaw && !isJournal) item.bookTitle = dbRaw;
	if (prefix === 'nix' && isKP) item.bookTitle += `: ${innerText('div.additional-links.kh-noprint a')}`;

	// PARSING INDEX OPTIONS: tags, sortKey, TDOI
	if (isDTK) item.tags.push('duodecim-dtk'); // ZOTERO: tags for easy debugging
	if (isDTKLegacy) item.tags.push('duodecim-dtk-legacy');
	// constructing option 1: Get sort key from span.duo-sortkey (text in parentheses)
	var sortKeyText = text(`.${dClass}sortkey`)
		|| text(`div.d-identifier`); // TYPE: OP (textbook articles): sortKey goes after a span element containing TDOI.
	var sortKey = '';
	if (sortKeyText) {
		var match = sortKeyText.match(/(?<=\().*(?=\))/);
		if (match) sortKey = match[0];
		if (isDTKLegacy) sortKey = sortKeyText;
		// Zotero.debug(`sortKey = ${sortKey}`);
	}

	// constructing option 2: Set archive/call number
	var archive = isDTK
		? text('ul li.nav-item a.nav-link')
		: isTP
			? 'Terveysportti'
			: isOP
				? 'Oppiportti'
				: isTK
					? 'Terveyskirjasto'
					: isKP
						? 'Käypä hoito'
						: ''; // || innerText('div.dbbar');

	if (archive && (archive !== item.bookTitle)) item.archive = archive; // CITATION: prevent identical fields, esp. CCG
	item.archiveLocation = sortKey ? sortKey : tdoi;
	item.callNumber = tdoi; // for Zotero DB search by TDOI

	// PARSING PUBLISHER
	const copyrightRaw = text(`div.${dClass}copyrights`) || text(`div.${dClass}copyright`);
	item.publisher = (isDLehti || isOP || isKP) ? 'Duodecim' : normalizePublisher(copyrightRaw);
	if (item.creators && item.creators.length && item.creators[0].lastName === item.publisher) item.publisher = null; // e.g. shk00004

	// PARSING JOURNALS
	var journalMetadata = {}; // init container: page and section
	if (isJournal) {
		const pageSelector = (urlObj.host === 'www.duodecimlehti.fi')
			? 'div.dl-article-bibliographic'
			: `div.${dClass}meta_journal`;

		var nlmString = text(pageSelector);
		journalMetadata = nlmString
			? journalPage(nlmString)
			: journalMetadata;

		const genreClass = (urlObj.host === 'www.duodecimlehti.fi')
			? 'div.dl-article-section-title'
			: `div.${dClass}genre`; // e.g. Katsaus [Review], Näin hoidan [This is how I treat]; Teema: XXX (Theme issue)
		journalMetadata.genre = text(genreClass);
	}

	// SET DATE
	if (isJournal && journalMetadata.year && prefix !== 'sic') {
		item.date = journalMetadata.year;
	}
	else if (dateStr) {
		item.date = dateStr;
		if (prefix === 'sic') {
			// TODO extract issue number
		}
	}

	// JOURNAL-DEPENDENT FIELDS

	// TODO collect statics
	// TODO wrap statics
	// TODO Finna?
	var journalISSN = {};
	journalISSN.sll = '0039-5560, 2489-7493'; // ZOTERO: Using comma per Zotero forum discussion 94009
	journalISSN.duo = '0012-7183, 2242-3281';
	journalISSN.hle = '0786-5686, 2954-2464';

	var journalAbbr = {}; // for NLM styles using abbreviations
	journalAbbr.duo = 'Duodecim';
	journalAbbr.sll = 'Suom Lääkäril';

	if (isJournal) {
		// item.tags.push((isDTK || isDTKLegacy) ? 'duodecim-dtk-journal' : 'duodecim-journal'); // ZOTERO: searching with libraryCatalog==='Duodecim' && itemType==='journalArticle'
		item.ISSN = journalISSN[prefix];
		item.journalAbbreviation = journalAbbr[prefix];
		if (journalMetadata.volume) item.volume = journalMetadata.volume;
		if (journalMetadata.issue) item.issue = journalMetadata.issue;
		if (journalMetadata.pages) item.pages = journalMetadata.pages;
		if (journalMetadata.genre) item.section = journalMetadata.genre; // duodecimlehti.fi does not do a good job in searching for themed issue or series titles like 'Näin hoidan' [This is how I treat]
	}

	// var englishTitle = '';
	var englishSummary = ''; // English summary extraction for DUO and SLL. In recent years, articles on these journals no longer feature an English summary.
	// PARSING duo and sll: possible English title and abstract; PDF as file and hyperlink
	if (prefix === 'duo' || dbRaw === 'Lääketieteellinen Aikakauskirja Duodecim') {
		if (!isDLehti) item.archiveLocation = tdoi; // searching with sortkey in LTK won't find the item.

		const h2 = doc.querySelectorAll('h2');
		if (h2 && (/^English summary.*/i).test(h2[0].innerText)) {
			try {
				// item.title += ` [${h2[0].innerText.match(/(?<=English summary: ).*/m)[0].replace(/[\xA0\r\n\s]+/g, ' ')}]`; // ESLINT-SCAFFOLD: duo99748: matching null; innerText for innerHTML?
				item.title += ` [${ultimateOneLiner(innerText('h2')).match(/(?<=English summary: ).*/m)[0]}]`; // e.g. duo99748
			}
			catch (error) {
				Zotero.debug(`D-Lehti: error on line ${error.lineNumber} during English title addiction: ${error}`);
			}
			englishSummary = `${ultimateOneLiner(innerText('em', 1))}`; // Failsafe: no English summary before official Finnish abstract
			item.tags.push('duodecim-englanti-Dlehti');
		}
		else { // e.g. duo11158
			const em = doc.querySelectorAll('p em');
			if (em) {
				em.forEach((p) => {
					if (/^English summary.*/i.test(p.innerText)) {
						item.title += ` [${p.innerText.match(/(?<=English summary: ).*/)[0]}]`;
						englishSummary = `${p.parentNode.nextElementSibling.innerText}`;
						item.tags.push('duodecim-englanti-Dlehti');
					}
				});
			}
		}

		Zotero.debug('doWeb(): PDF for duo...');
		var pdfLink = `https://${urlObj.host}/xmedia/duo/${tdoi}.pdf`; // doc.querySelector('app-plugin-external-link a');
		// Zotero.debug(`${arguments.callee.name}(): downloading PDF link: ${pdfLink}`); // TODO callee deprecated
		item.attachments.push({
			url: pdfLink,
			title: `Linkki PDF-tiedostoon (${urlObj.host.replace('www.', '')})`,
			mimeType: "text/html",
			snapshot: false
		}, {
			url: pdfLink, // If you have arrived at the page, you must have legal cookie for PDF download.
			title: "PDF",
			mimeType: "application/pdf",
			proxy: false
		});
	}

	// sll: English summary (If applicable) comes usually before reference list aka the second to the last <h2>. Just in case, iterate through all <h2>s.
	if (prefix === 'sll' && dbRaw === 'Suomen Lääkärilehti') {
		doc.querySelectorAll('h2').forEach((h2) => {
			if ((/^English summary.*/i).test(h2.innerText)) {
				item.title += ` [${h2.innerText.match(/(?<=English summary: ).*$/)[0]}]`;
				englishSummary = `${h2.nextElementSibling.innerText.replace(/[\xA0\r\n\s]+/g, " ")}`;
				item.tags.push('duodecim-englanti-lääkärilehti');
			}
		});
	}

	// PARSING PDF: SLL and other journals or arbitrary items with PDF
	var firstLink;
	if ((!item.attachments.length) // already pushed for d-lehti
		&& doc.querySelectorAll(`article a.${dClass}anchor:not(.${dClass}article):not(.${dClass}external)`).length) {
		firstLink = doc.querySelectorAll(`article a.${dClass}anchor:not(.${dClass}article:not(.${dClass}external))`)[0].href;
		// rlink in article ${firstLink}`);
		if (!/.*\.pdf$/.test(firstLink)) firstLink = null;
	}

	const tdoiRegex = /\w{3}\d{5}\w*?(?![\w\d])/; // TODO: unified or more universal regex
	if (firstLink) {
		Zotero.debug(`doWeb(): handling first hyperlink as PDF: ${firstLink}`);
		if (prefix !== 'sll') { // generic PDF
			// Zotero.debug(`doWeb(): pushing PDF file ${firstLink}`);
			const pdfTDOI = tdoiRegex.test(firstLink) ? firstLink.match(tdoiRegex)[0] : null;
			const pdfPathname = pdfTDOI ? (firstLink.match(/(?<=\/)[^/]*(?=\.pdf)/)[0]) : null;
			const pdfSuffix = (pdfPathname && /[a-z]+$/.test(pdfPathname)) ? pdfPathname.match(/[a-z]+$/)[0] : null;
			const isMainPDF = pdfTDOI && pdfTDOI.substring(0, 8) === tdoi;
			const attachmentTitle = isMainPDF ? ((pdfSuffix && pdfSuffix === 'sv') ? 'På svenska' : "PDF") : "Supplementary PDF"; // e.g. nla00004

			Zotero.debug(`doWeb(): Pushing PDF ${pdfPathname} with ${pdfTDOI} and suffix '${pdfSuffix}' (${pdfSuffix === 'sv'}) as file attachment titled: ${attachmentTitle}`);
			item.attachments.push({
				// TODO find if PDF contains own TDOI and whether a match or a supplement path: `${tdoi}-${item.title}`,
				url: firstLink,
				title: attachmentTitle,
				mimeType: "application/pdf"
			});
		}
		else {
			Zotero.debug('doWeb(): PDF for sll...');
			const sllPDFPath = /(?<=laakarilehti\/).*/i.test(firstLink) ? firstLink.match(/(?<=laakarilehti\/).*/)[0] : null;

			if (sllPDFPath) {
				firstLink = 'https://www.laakarilehti.fi/' + sllPDFPath; // unless you have a FimNet credential, you need proxy to access the PDF on laakarilehti.fi.
				Zotero.debug(`doWeb(): sll: Pushing hyperlink to PDF ${firstLink}`);
				item.attachments.push({
					url: `https://www.laakarilehti.fi/${sllPDFPath}`,
					title: "Linkki PDF-tiedostoon (laakarilehti.fi)",
					mimeType: "text/html",
					snapshot: false
				});

				// unified PDF file push
				const directDL = await onCampus();
				if (!directDL) Zotero.debug('doWeb() sll PDF: attempting to scrape and push PDF via proxy.');
				// const metaProxyURL = attr(doc, 'meta[name="translator-proxy"]', 'content'); // NOT an official meta field. Can be configured with, e.g., a userscript injection.
				// Zotero.debug(`Experimental: userscript proxy URL from <meta>: ${metaProxyURL?metaProxyURL : 'NOT FOUND'}`);
				// const dlDomain = directDL ? `https://www.laakarilehti.fi/` : metaProxyURL ? metaProxyURL : null;
				const dlDomain = directDL ? `https://www.laakarilehti.fi/` : null;

				if (dlDomain) {
					item.attachments.push({
						url: dlDomain + sllPDFPath,
						title: `PDF${directDL ? '' : ' välityksellä'}`,
						mimeType: "application/pdf",
					});
				}
			}
		}
	}

	// Zotero.debug(`item.attachments: ${item.attachments.length} attachments before webpage snapshot: ${JSON.stringify(item.attachments)}`);

	// PULLING SNAPSHOT
	item.attachments.push({
		path: `${tdoi}-${item.title}`, // TODO verify filename
		title: `${item.language === 'fi' ? 'Tilannekuva artikkelista (article snapshot)' : 'Article snapshot'}`,
		document: doc,
		snapshot: true
	});

	// PARSING ABSTRACT
	// abstract block at the end because removing hyperlinks from abstract block would alter PDF and snapshot.
	// ESLINT-SCAFFOLD: innerText during ESLint test won't handle hyperlinks properly.
	// JS: using .textContent would break abstractNotes
	// Zotero.debug('doWeb(): extracting abstract');
	const abstractSelectors = [
		'section[role="main"] aside', // terveyskirjasto.fi: "Katso myös" is also an <aside>, although it is in the right column.
		'section[role="main"] p', // terveyskirjasto.fi does not use dClass class prefix. Element tags are used instead for some content elements.
		`div.${dClass}aside`, // a gray box containing usually bulleted lists
		// `div.${dClass}body > div.${dClass}section > ul:first-child`,	// e.g. shk02235
		`.${dClass}section .${dClass}header`, // removed '.${dClass}body >' before this selector: In many cases, duo-section does not reside right under a body class TODO examples
		`.${dClass}section > p > em`, // e.g. duo11158
		`.${dClass}section > p` // first paragraph
	];

	/**
	 * picking abstract selector
	 * @param {Object} Array: abstractSelectors
	 * @returns Element containing abstract text
	 */
	var abstractSelector = (function (selectors) {
		for (const sel of selectors) {
			const elementCandidate = doc.querySelector(sel);
			if (elementCandidate) {
				Zotero.debug(`ABSTRACT: querySelector is ${sel}`);
				elementCandidate._querySelector = sel;
				return elementCandidate;
			}
		}
		const ulAbstractSelector = `div.${dClass}body > div.${dClass}section > ul:first-child`; // e.g. shk02235
		const ulAbstractElement = doc.querySelector(ulAbstractSelector);
		if (ulAbstractElement && !ulAbstractElement.previousElementSibling) { // should be the <ul> at the beginning of the immediate .${dClass}section
			ulAbstractElement._querySelector = ulAbstractSelector;
			return ulAbstractElement;
		}
		return null;
	})(abstractSelectors);

	if (!abstractSelector) { // manual selection
		// if (innerText('h2') in [
		if ([ // TODO statics
			'Keskeistä', // ykt, dlk
			'Essentials', // ebm
			'Johdanto' // TODO examples
		].includes(innerText('h2'))) {
			// Zotero.debug('ABSTRACT: extracting designated section');
			abstractSelector = doc.querySelector('h2').nextElementSibling;
		}
	}

	if (abstractSelector) {
		if (abstractSelector.querySelector(`a`)) {
			abstractSelector.querySelectorAll('a span').forEach((linkSpan) => {
				linkSpan.remove();
			});
		}
		const abstractSelectorType = /(?<= )[\S]+$/.test(abstractSelector._querySelector)
			? abstractSelector._querySelector.match(/(?<= )[\S]+$/)[0]
			: null;
		item.abstractNote = /^(p|em)$/.test(abstractSelectorType)
			? ultimateOneLiner(abstractSelector.innerText) // e.g. duo11158
			: returnProtect(abstractSelector.innerText); // TODO: succeed in Scaffold but mess in Edge? Try FireFox?
		if (item.abstractNote.split(' ').length < 10) item.abstractNote = null; // arbitrarily remove texts unlikely to summarize the item.
		else {
			// Zotero.debug(`item.abstractNote: ${item.abstractNote}`)
		}
		if (englishSummary.length) {
			// englishSummary.replace(/[\xA0\r\n\s]+/g, " ");
			// Zotero.debug(`ABSTRACT: English summary before concatenation: ${englishSummary}`);
			item.abstractNote += `\n\n${ultimateOneLiner(englishSummary)}`;
		}
	}
	else {
		Zotero.debug(`ABSTRACT: no valid abstract extracted`);
	}

	// Finalize and save item
	// Zotero.debug(`Complete: item.attachments length: ${Object.keys(item.attachments).length}`);
	// Zotero.debug(`COMPLETE with ${item.attachments.length} attachments. Adding 'duodecim-translator' tag.`);
	// item.tags.push('duodecim-translator'); DEPRECATED: Zotero addes automatically a 'Duodecim' to libraryCatalog field
	// Zotero.debug(`item.complete(): ${JSON.stringify(item)}`);
	item.complete();
}

/**
 * A NOTE ON TEST CASES
 * All test cases were fetched in June 2026. Actual fetch time should be logged by Zotero at runtime.
 * I built this translator with APA citation style in mind.
 * Feel free to test in other formats, especially NLM-Vancouver-based formats and their Finnish variants
 * 		such as `styles/dependent/Suomen Laakarilehti.csl` (also part of Zotero Style Repository).
 *
 * For Zotero's automated checks, I kept only publicly available test cases. One free Terveysportti item is included as the last test case.
 * Other Terveysportti (TP) and Oppiportti (OP) test cases are not included in the public version.
 * Proceed with testing under a network with TP/OP subsciption TODO or log in first in Scaffold's browser.
 *
 * EXPLAINING TEST CASES: all cases referred to by their TDOI.
 *
 * TK Terveyskirjasto:
 * dlk00221: handling authors, editor author
 * dlk00084: handling author with title
 * BOTH: differences in extracting abstracts
 *
 * uux30190: should be the same as the version hosted on TP
 *
 * TP DTK:
 * nla00004: two-line author handling
 *
 * KP Käypä hoito (Current Care Guideline, CCG):
 * hoi50067: group author, abstract
 * dnd00039: group author
 * nix03607: addition of the CCG guideline the item belongs to
 *
 * D-lehti (Medical Journal Duodecim):
 * All: section/theme extracted
 * First three items: English titles and summary
 * duo95136: fully monolingual article.
 */

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.terveyskirjasto.fi/dlk00221",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Huimaus",
				"creators": [],
				"date": "2026-03-18",
				"abstractNote": "Huimaus on hyvin yleinen oire, joka ilmenee monin eri tavoin. Huimauksen luonne kertoo lääkärille paljon sen syystä, joten sen kuvailu sanallisesti on tärkeää. Huimaus voi olla esimerkiksi kiertävää, ikään kuin huone pyörisi ympäri. Se voi olla myös keinuvaa kuin olisi veneessä. Sitä voidaan kuvata pyörryttämisen tunteena, silmien pimentymisenä, epämääräisenä tasapainottomuutena tai huterana olona. Jotkut kuvaavat myös epätodellista olotilaa tai selkeästi johonkin liikkeeseen tai ylösnousuun liittyvää huimausta.",
				"archive": "Terveyskirjasto",
				"archiveLocation": "026.018",
				"bookTitle": "Lääkärikirja Duodecim",
				"callNumber": "dlk00221",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveyskirjasto.fi/dlk00221",
				"attachments": [
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
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
		"url": "https://www.terveyskirjasto.fi/dlk00084",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Sydämen vajaatoiminta",
				"creators": [
					{
						"firstName": "Raimo",
						"lastName": "Kettunen",
						"creatorType": "author"
					}
				],
				"date": "2023-11-27",
				"abstractNote": "Keskeistä\nSydämen vajaatoiminta on vakava, lähes aina elinikäistä lääke- ja muuta hoitoa vaativa sairaus, jonka tavallisimmat aiheuttajat ovat kohonnut verenpaine, sepelvaltimotauti ja läppäviat. Näiden sairauksien huolellinen hoito on tärkeää sydämen vajaatoiminnan kehittymisen ehkäisemiseksi.\nVarsinkin nuorilla ja työikäisillä alkavat sydänlihassairaudet (kardiomyopatiat) voivat aiheuttaa jopa vajaatoimintaa.\nLepo- ja rasitussykkeen nousu, rasitushengenahdistus ja suorituskyvyn lasku voivat olla sydämen vajaatoiminnan ensioireita ennen nilkka- tai muiden turvotusten ilmaantumista.\nVerinäytteestä mitattava natriureettinen peptidi ( proBNP) on sydänsähkötutkimuksen (EKG) ohella perusterveydenhuollossakin helposti saatavilla oleva vajaatoiminnan ensitutkimus.\nMuun muassa sydämen ultraäänitutkimuksen perusteella tehdään hoitosuunnitelma, jossa lääkehoidolla on tärkein osa.",
				"archive": "Terveyskirjasto",
				"archiveLocation": "002.014",
				"bookTitle": "Lääkärikirja Duodecim",
				"callNumber": "dlk00084",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveyskirjasto.fi/dlk00084",
				"attachments": [
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
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
		"url": "https://www.terveyskirjasto.fi/uux30190",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Nuoret kaupan alalla tekevät kuormittavaa työtä",
				"creators": [
					{
						"firstName": "Saara",
						"lastName": "Taponen",
						"creatorType": "author"
					}
				],
				"date": "2026-05-22",
				"abstractNote": "Kaupan alalla työskentelee paljon työuransa alkupuolella olevia nuoria, joiden työssä yhdistyy fyysisesti kuormittava työ ja psyykkisesti kuormittavat työtilanteet.",
				"archive": "Terveyskirjasto",
				"archiveLocation": "uux30190",
				"bookTitle": "Uutiset",
				"callNumber": "uux30190",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveyskirjasto.fi/uux30190",
				"attachments": [
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
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
		"url": "https://www.terveysportti.fi/uutiset/23/uux30190",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Nuoret kaupan alalla tekevät kuormittavaa työtä",
				"creators": [
					{
						"firstName": "Saara",
						"lastName": "Taponen",
						"creatorType": "author"
					}
				],
				"date": "2026-05-22",
				"abstractNote": "Kaupan alalla työskentelee paljon työuransa alkupuolella olevia nuoria, joiden työssä yhdistyy fyysisesti kuormittava työ ja psyykkisesti kuormittavat työtilanteet.",
				"archive": "Terveysportti",
				"archiveLocation": "uux30190",
				"bookTitle": "Uutiset",
				"callNumber": "uux30190",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/uutiset/23/uux30190",
				"attachments": [
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
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
		"url": "https://www.terveysportti.fi/apps/dtk/nko/article/nla00004?toc=1112237",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Neljän kuukauden ikäisen lapsen laaja terveystarkastus",
				"creators": [
					{
						"firstName": "Merja",
						"lastName": "Saarinen",
						"creatorType": "author"
					},
					{
						"firstName": "Tuovi",
						"lastName": "Hakulinen",
						"creatorType": "author"
					},
					{
						"firstName": "Jarmo",
						"lastName": "Salo",
						"creatorType": "author"
					}
				],
				"date": "2024-10-23",
				"archive": "NEUKO-tietokanta",
				"archiveLocation": "400.005",
				"bookTitle": "Äitiys- ja lastenneuvola",
				"callNumber": "nla00004",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Terveyden ja hyvinvoinnin laitos",
				"url": "https://www.terveysportti.fi/doi/nla00004",
				"attachments": [
					{
						"title": "På svenska",
						"mimeType": "application/pdf"
					},
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kaypahoito.fi/hoi50067",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Unettomuus",
				"creators": [
					{
						"lastName": "Suomalaisen Lääkäriseuran Duodecimin ja Suomen Unitutkimusseura ry:n asettama työryhmä",
						"creatorType": "bookAuthor",
						"fieldMode": 1
					}
				],
				"date": "2026-06-25",
				"abstractNote": "Unettomuudella tarkoitetaan joko unettomuusoireita tai unettomuushäiriötä. Hoitopäätösten kannalta on tärkeää tunnistaa, onko kyseessä unettomuusoire vai sairausasteinen unettomuushäiriö.\nTilapäiset unettomuusoireet kuuluvat elämään. Säännöllinen uni-valverytmi ja unta edistävät nukkumistottumukset ja olosuhteet ehkäisevät unettomuushäiriön kehittymistä.\nPitkäkestoinen (yli 3 kuukautta kestänyt) unettomuushäiriö suurentaa monien sairauksien ja tapaturmien riskiä, heikentää toimintakykyä ja huonontaa elämänlaatua.\nVastikään alkaneen lyhytkestoisen (1–3 kuukautta kestäneen) unettomuushäiriön tunnistamisella ja hyvällä hoidolla on mahdollista ehkäistä pitkäkestoisen unettomuushäiriön kehittyminen.\nJoskus lyhytkestoisetkin unettomuusoireet voivat olla sairausasteisia ja heikentää merkittävästi toimintakykyä.\nUnettomuushäiriön diagnoosi perustuu ensisijaisesti huolelliseen anamneesiin, kliiniseen tutkimukseen ja uni-valvepäiväkirjan (unipäiväkirja) pitämiseen.\nUnettomuusoireiden tarkempi selvitys on tärkeää, jotta potilas saa oikeanlaista hoitoa. Unettomuusoireet eivät automaattisesti tarkoita unettomuushäiriötä.\nUnettomuusoireiden taustalla mahdollisesti olevat ja oireisiin kytkeytyvät sairaudet ja muut tekijät tulee tunnistaa ja hoitaa asianmukaisesti. Tavanomaisimpia sairauksia ovat ahdistuneisuus-, mieliala- ja päihdehäiriöt, levottomat jalat -oireyhtymä (restless legs syndrome, RLS), unenaikaiset hengityshäiriöt, uni-valverytmin häiriöt ja muut unihäiriöt (ICD-11:ssä \"uni-valvehäiriöt\"). Myös vaihdevuosiin liittyy yleisesti unettomuusoireita.\nTilapäisiä unettomuusoireita ei pääsääntöisesti tarvitse hoitaa. Jos potilas kuitenkin hakeutuu hoitoon, on unettomuusoireista kärsivän potilaan tukeminen, taustalla olevien syiden ja laukaisevien tekijöiden käsitteleminen sekä unen huollon ohjaus tärkeää.\nUnettomuuden lyhytkestoista lääkehoitoa voidaan harkita, jos unettomuusoireet ovat vakavia ja heikentävät merkittävästi päiväaikaista vointia ja toimintakykyä.\nUnettomuushäiriön hoidossa kestävimmät tulokset saavutetaan unettomuuden kognitiivisen käyttäytymisterapian (cognitive behavioral therapy for insomnia, CBT-I) menetelmillä.\nCBT-I on osoittautunut tehokkaaksi myös silloin, kun potilaalla on unettomuushäiriön kanssa samanaikaisia sairauksia tai oireita.\nMyös näyttö CBT-I:n tehosta lasten ja nuorten unettomuuden hoidossa on lisääntynyt, ja CBT-I:tä voidaan pitää näytön perusteella lasten ja nuorten unettomuuden ensisijaisena hoitona. Sen sijaan tutkimusnäyttö lasten ja nuorten unettomuuden lääkehoidosta lähes puuttuu lukuun ottamatta melatoniinia, joten suosituksen lääkeohjeistuksia ei voi soveltaa tähän ikäryhmään.\nPerinteisiä unettomuuden hoitoon käytettäviä lääkkeitä (ns. unilääkkeitä) ovat bentsodiatsepiinit (mm. tematsepaami) ja niiden kaltaiset lääkkeet (ns. z-lääkkeet: tsopikloni ja tsolpideemi) 1.\nPerinteiset unilääkkeet pidentävät mutta myös keventävät yöunta, ja muitakin merkittäviä haittavaikutuksia on raportoitu. Siten ne sopivat ensisijaisesti vain lyhytaikaiseen käyttöön.\nPitkäkestoisessa unettomuushäiriössä lääkehoidon tarve tulee arvioida yksilöllisesti ja säännöllisesti. Myös hoitovastetta tulee arvioida säännöllisesti. Etenkin ikääntyneille bentsodiatsepiineista ja niiden kaltaisista lääkkeistä saattaa olla enemmän haittaa kuin hyötyä ja niiden määräämisessä tulee käyttää harkintaa.\nBentsodiatsepiinien kaltaisten unilääkkeiden lyhytaikaisesta käytöstä (alle 2 viikkoa) saattaa olla hyötyä unettomuudesta kärsivän uniapneapotilaan CPAP-hoitoa aloitettaessa.\nUnettomuuden hoidossa käytetään perinteisten unilääkkeiden lisäksi myös muita lääkkeitä, kuten melatoniinia ja pieniannoksista (< 10 mg) doksepiinia sekä eräitä muita vireystilaan, uni-valverytmiin tai muilla tavoin unen neurokemiaan vaikuttavia lääkeaineita, kuten oreksiinireseptoriantagonisteja.\nUnettomuuden hoidossa käytettävät lääkkeet voivat heikentää ajokykyä sekä suoriutumista myös muissa tarkkaavaisuutta vaativissa tehtävissä. Bentsodiatsepiinit ja niiden kaltaiset lääkkeet aiheuttavat eniten haittaa, erityisesti hoidon alkuvaiheessa.\nLiikunnan suotuisasta vaikutuksesta uneen on runsaasti näyttöä.\nUnettomuushäiriöistä kärsivän potilaan hoidon seuranta on välttämätöntä.",
				"archiveLocation": "050.067",
				"bookTitle": "Käypä hoito",
				"callNumber": "hoi50067",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.kaypahoito.fi/hoi50067",
				"attachments": [
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
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
		"url": "https://www.kaypahoito.fi/dnd00039",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Monityydyttymättömät rasvahapot lasten ja nuorten ADHD:n hoidossa",
				"creators": [
					{
						"lastName": "Käypä hoito -työryhmä ADHD (aktiivisuuden ja tarkkaavuuden häiriö)",
						"creatorType": "bookAuthor",
						"fieldMode": 1
					}
				],
				"date": "2025-05-19",
				"archive": "Käypä hoito",
				"archiveLocation": "050.061",
				"bookTitle": "Vältä viisaasti",
				"callNumber": "dnd00039",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"shortTitle": "Monityydyttymättömät rasvahapot lasten ja nuorten ADHD",
				"url": "https://www.kaypahoito.fi/dnd00039",
				"attachments": [
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
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
		"url": "https://www.kaypahoito.fi/nix03607",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Psykososiaalisten interventioiden vaikuttavuus keskenmenon jälkeen",
				"creators": [
					{
						"firstName": "Katri",
						"lastName": "Räikkönen",
						"creatorType": "author"
					}
				],
				"date": "2026-05-11",
				"archive": "Käypä hoito",
				"archiveLocation": "050.138",
				"bookTitle": "Lisätietoa aiheesta: Keskenmeno",
				"callNumber": "nix03607",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.kaypahoito.fi/nix03607",
				"attachments": [
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
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
		"url": "https://www.duodecimlehti.fi/duo99748",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Kaksoispaineventilaatio kroonisessa ventilaatiovajauksessa [Possibilities of bi-level positive pressure ventilation in chronic hypoventilation]",
				"creators": [
					{
						"firstName": "Tarja",
						"lastName": "Saaresranta",
						"creatorType": "author"
					},
					{
						"firstName": "Ulla",
						"lastName": "Anttalainen",
						"creatorType": "author"
					},
					{
						"firstName": "Olli",
						"lastName": "Polo",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"ISSN": "0012-7183, 2242-3281",
				"abstractNote": "Kajoamaton kaksoispaineventilaatiohoito on viimeisen vuosikymmenen aikana mahdollistanut hengityksen tukemisen tavallisella vuodeosastolla ja potilaan kotona. Kaksoispaineventilaattorilla voidaan usein välttää keinoilmatie ja respiraattorihoito, lyhentää potilaan sairaalassaoloaikaa ja säästää kustannuksia. Kaksoispaineventilaatiohoito vähentää kroonisesta hengitysvajauksesta kärsivän potilaan hengenahdistusta ja väsymystä, jolloin elämänlaatu paranee ja tietyissä tilanteissa myös elinikä pitenee. Hoito vaatii lääkäriltä perustietoja hengitysfysiologiasta ja perehtymistä kaksoispaineventilaattorin säätämiseen. Hoitohenkilökunnalta se edellyttää kokemusta hoidon toteutuksesta ja ohjauksesta.\n\nDuring the last decade, noninvasive bi-level positive pressure ventilation has enabled respiratory support in inpatient wards and at home. In many cases, a bi-level airway pressure ventilator can be used to avoid artificial airway and respirator therapy, and may shorten hospital stay and save costs. The treatment alleviates the patient's dyspnea and fatigue, whereby the quality of life improves, and in certain situations also the life span increases. The implementation of bi-level positive pressure ventilation by the physician requires knowledge of the basics of respiratory physiology and familiarization with the bi-level airway pressure ventilator.",
				"archiveLocation": "duo99748",
				"callNumber": "duo99748",
				"issue": "17",
				"journalAbbreviation": "Duodecim",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"pages": "1797-807",
				"publicationTitle": "Lääketieteellinen Aikakauskirja Duodecim",
				"publisher": "Duodecim",
				"section": "Katsaus",
				"url": "https://www.duodecimlehti.fi/duo99748",
				"volume": "127",
				"attachments": [
					{
						"title": "Linkki PDF-tiedostoon (duodecimlehti.fi)",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "PDF",
						"mimeType": "application/pdf",
						"proxy": false
					},
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-englanti-Dlehti"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.duodecimlehti.fi/duo11158",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Keuhkoputkien kaikutähystys - milloin tarpeen? [Endobronchial ultrasonography - when needed?]",
				"creators": [
					{
						"firstName": "Annamari",
						"lastName": "Rouhos",
						"creatorType": "author"
					},
					{
						"firstName": "Milla",
						"lastName": "Katajisto",
						"creatorType": "author"
					},
					{
						"firstName": "Maija",
						"lastName": "Halme",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"ISSN": "0012-7183, 2242-3281",
				"abstractNote": "Keuhkoputkien kaikutähystys (endobronchial ulrasound, EBUS) ja sen avulla otettava neulabiopsianäyte tarjoavat mini-invasiivisen tavan tutkia välikarsinan ja hilusalueiden imusolmukkeita ja kasvaimia. Reaaliaikaisessa kaikukuvausohjauksessa päästään biopsoimaan pieniäkin kohteita hyvällä tarkkuudella. EBUS-bronkoskoopissa on ultraäänianturi ja toimenpidekanava biopsianeulalle. Tutkimus tehdään polikliinisesti paikallispuudutuksessa ja kevyessä sedaatiossa tai anestesiassa ja se on hyvin siedetty. Pääasiallinen aihe on keuhkosyövän levinneisyysselvittely. Tutkimuksen tarkkuus on erittäin hyvä, ja välikarsinan tähystystä suositellaan täydentävänä tutkimuksena vain silloin, jos näytteissä ei todeta syöpää. Menetelmä soveltuu myös etiologialtaan epäselvän mediastinaalisen lymfadenopatian tai sentraalisten kasvainten primaaridiagnostiikkaan. Tutkimuksessa saatavat näytteet ovat usein riittäviä keuhkosyövän diagnostiikassa ja hoidon suunnittelussa tarvittaviin immunohistokemiallisiin värjäyksiin ja mutaatiomäärityksiin.\n\nEndobronchial ultrasonography (EBUS) and associated needle biopsy is a mini-invasive means to study mediastinal and hilar lymph nodes and tumors. Guidance by real-time ultrasound image allows the biopsy of even small targets with high accuracy. The investigation is well tolerated, highly specific and its main indication is the staging of lung cancer. The method is also suitable for primary diagnosis of mediastinal lymphadenopathy of unknown origin or central tumors.",
				"archiveLocation": "duo11158",
				"callNumber": "duo11158",
				"issue": "16",
				"journalAbbreviation": "Duodecim",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"pages": "1701-6",
				"publicationTitle": "Lääketieteellinen Aikakauskirja Duodecim",
				"publisher": "Duodecim",
				"section": "Näin tutkin",
				"shortTitle": "Keuhkoputkien kaikutähystys",
				"url": "https://www.duodecimlehti.fi/duo11158",
				"volume": "129",
				"attachments": [
					{
						"title": "Linkki PDF-tiedostoon (duodecimlehti.fi)",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "PDF",
						"mimeType": "application/pdf",
						"proxy": false
					},
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-englanti-Dlehti"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.duodecimlehti.fi/duo11912",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Parenteraalinen ravitsemus - lyhytaikainen ja pysyvä hoito [Parenteral nutrition - temporary and permanent treatment]",
				"creators": [
					{
						"firstName": "Minna",
						"lastName": "Bäcklund",
						"creatorType": "author"
					},
					{
						"firstName": "Heikki",
						"lastName": "Mäkisalo",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"ISSN": "0012-7183, 2242-3281",
				"abstractNote": "Sairaala- tai tehohoitoon ajautunut iäkäs potilas kärsii usein vajaaravitsemuksesta, joka lisääntyy nopeasti ja johtaa komplikaatioihin ilman asianmukaisia toimenpiteitä. Enteraalinen ravitsemus kannattaa aloittaa heti, kun se on teknisesti mahdollista. Jos ensimmäisen hoitoviikon aikana arvioidusta energiantarpeesta toteutuu alle 60 %, myös parenteraalinen ravitsemus tulee aloittaa. Tarvittava energiamäärä on aluksi 20 ja jatkossa 25 kcal/kg/vrk. Glukoosin perustarve on vuorokaudessa noin 2 - 3 g/kg, rasvojen 0,7 - 1,5 g/kg ja aminohappojen 0,8 - 1,0 g/kg. Keskuslaskimon kautta voidaan antaa tehokkaimmin energiaa ja ravintoaineita pienemmässä nestemäärässä, nykyisin turvallisimmin monikammiopusseissa. Parenteraalisen ravitsemuksen pitkittyessä sitä suositellaan annettavaksi jaksoittain maksavaurioriskin pienentämiseksi. Painon seuranta on tärkeää hoidon vaikutuksen mutta myös mahdollisen nestelastin kertymisen havaitsemiseksi. Ravitsemushoidon seurantaan kuuluvat elimistön happo-emästase, infektioparametrit, elektrolyytti- ja glukoositasapaino sekä maksa- ja rasva-arvot.\n\nEnteral nutrition of an elderly patient having ended up in hospital or intensive care and suffering from malnutrition should be started as soon as it is technically possible. If less than 60% of the estimated energy need is fulfilled during the first week of treatment, parenteral nutrition should also be initiated. Multi-chamber bags are the most effective means to provide energy and nutrients via the central vein. To reduce the risk of liver damage, parenteral nutrition is upon prolongation recommended to be administered periodically. Weight monitoring is important in order to observe the effect of the treatment and the possible accumulation of fluid load.",
				"archiveLocation": "duo11912",
				"callNumber": "duo11912",
				"issue": "21",
				"journalAbbreviation": "Duodecim",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"pages": "2265-70",
				"publicationTitle": "Lääketieteellinen Aikakauskirja Duodecim",
				"publisher": "Duodecim",
				"section": "Teema: Sairaan ihmisen ravitsemus (Erikoistoimittajat: Mikko Pakarinen, Jussi Pihlajamäki ja Heikki Mäkisalo)",
				"shortTitle": "Parenteraalinen ravitsemus",
				"url": "https://www.duodecimlehti.fi/duo11912",
				"volume": "130",
				"attachments": [
					{
						"title": "Linkki PDF-tiedostoon (duodecimlehti.fi)",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "PDF",
						"mimeType": "application/pdf",
						"proxy": false
					},
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-englanti-Dlehti"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.duodecimlehti.fi/duo95136",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Keskuslaskimokatetri-infektioiden ehkäisy",
				"creators": [
					{
						"firstName": "Tero",
						"lastName": "Ala-Kokko",
						"creatorType": "author"
					},
					{
						"firstName": "Hannu",
						"lastName": "Syrjälä",
						"creatorType": "author"
					}
				],
				"date": "2005",
				"ISSN": "0012-7183, 2242-3281",
				"abstractNote": "Katetriperäiseen sepsikseen liittyy sairastavuuden ja hoitokustannusten merkittävä lisääntyminen. Suurin uhka on katetrin kontaminoituminen terveydenhuoltohenkilöstön käsien välityksellä. Sitä voidaan vähentää aseptisella työskentelyllä katetria asetettaessa ja käsien desinfektiolla sekä suojakäsineitten käytöllä katetria myöhemmin käsiteltäessä. Antiseptisilla aineilla päällystetyt keskuslaskimokatetrit saattavat vähentää viikon kestoisissa hoidoissa katetrisepsiksiä. Niiden käyttöä voidaan harkita, jos katetrisepsisten ilmaantuvuus on suuri (yli 3,3/1-000 katetrivuorokautta) tavanomaisista infektioidentorjuntatoimenpiteistä huolimatta. Esiintyvyyden arvioiminen edellyttää systemaattista seurantaa.",
				"archiveLocation": "duo95136",
				"callNumber": "duo95136",
				"issue": "15",
				"journalAbbreviation": "Duodecim",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"pages": "1689-93",
				"publicationTitle": "Lääketieteellinen Aikakauskirja Duodecim",
				"publisher": "Duodecim",
				"section": "Teema: Sairaalainfektiot",
				"shortTitle": "Keskuslaskimokatetri",
				"url": "https://www.duodecimlehti.fi/duo95136",
				"volume": "121",
				"attachments": [
					{
						"title": "Linkki PDF-tiedostoon (duodecimlehti.fi)",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "PDF",
						"mimeType": "application/pdf",
						"proxy": false
					},
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
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
