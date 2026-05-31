{
	"translatorID": "63ef6a3b-2e64-4d58-aedc-07b31a108928",
	"label": "Duodecim",
	"creator": "Shiyu Wang",
	"target": "https?://(www\\.(terveysportti|terveyskirjasto|kaypahoito|oppiportti|duodecimlehti)\\.fi|www.ebm-guidelines.com)/.*",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 270,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-05-31 12:06:25"
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

// TL;DR: Duodecim (Finnish Medical Society) platforms do not feature proper metadata.

// TODO: determine minimal priority
// TODO: categorize comments with // <category>: <comment text>
// TODO: more targets including all Duodecim sites

// GLOBAL HELPER FUNCITONS

/**
 * Regex cleanup would remove useful \n's
 * @param {string} inner innerText(sel)
 * @returns string
 */
function returnProtect(inner) {
	const innerArray = inner.split('\n');
	Zotero.debug(`returnProtect split:\n${innerArray}`);
	var output = '';
	if (innerArray.length === 1) return inner;
	for (const line of innerArray) {
		const cleanLine = ZU.superCleanString(line.replace(/[\xA0\r\s]+/g, " ")); // ZU function only trims.
		output += `${cleanLine}\n`;
	}
	Zotero.debug(`returnProtect output:\n${output}`);
	return output.substring(0,output.length-1);
}

/**
 * Wrapping custom cleanstring for Zotero's innerText()
 * 
 */
/**
 * 
 * @param {*} doc 
 * @param {*} rawInput 
 * @returns 
 */
function innerClean (doc, rawInput) {
	// BUG: failsafe always returns null.
	if (typeof rawInput === 'string') {if (!doc.querySelector(rawInput)) {
		Zotero.debug(`innerClean: invalid selector ${rawInput}`);
		Zotero.debug(`innerClean: calling invalid selector ${document.querySelector(rawInput)}`);
		return ''
		};}

	return ((rawInput === 'string') ? innerText(document, rawInput).replace(/[\xA0\r\s]+/g, " ") : innerText(rawInput, '*').replace(/[\xA0\r\s]+/g, " ")) || '';
}

/**
 * Parse author names with title removal (handles Finnish naming conventions)
 * This function might not preserve abbreviated middle names for articles like Cochrane or Dynamed summaries.
 * A complex example and its handling is the first time in testCases with article ID voh00042, see the markdown documentation and the first test case.
 * @param {string} nameString 
 * @param {string} lang 'en' or 'fi'
 * @returns 
 */
function parseAuthors(nameString, lang) {
	// Zotero.debug('parseAuthors(): parsing authors.');
	if (!/\s/.test(nameString)) {
		Zotero.debug('parseAuthors(): Single-word author.');
		if (['Toimitus', 'Editors'].includes(nameString)) return ''; // TODO collect statics; ykt00096, ebm00069
		return nameString; // One-word institutions,
	}
	
	// TODO 260529 EBM bug: cleanAuthor() won't spllit multiple authors
	// if (lang === 'en') {
	// 	Zotero.debug('parseAuthors(): Handing over to ZU.cleanAuthor()');
	// 	const authorZU = ZU.cleanAuthor(nameString, 'author', true); 
	// 	Zotero.debug(`Returned from ZU.cleanAuthor(): ${JSON.stringify(authorZU)}`);
	// 	return ZU.cleanAuthor(nameString, 'author', true);}

	var nameArray = [];

	nameString = /\n/.test(nameString) ? // two-line author fields, 
		nameString.split('\n')[1] // in which the first line is usually the same as copyright/organization name
		: nameString;

	const capitalRegex = /[A-ZÄ-Ö]/; // currently match U+00C4 – U+00D6 (ASCII 192–214)

	for (const seg of nameString.split(/,\s*|\s+(ja|and)\s+/i)) {
		if (typeof seg !== 'string') continue;
		if (seg.toString().split(' ').length < 2) continue; // Removing titles between commas and generic author placeholders
		
		const toPush = (function titleRemove(str) {
			const words = str.toString().split(' ');
			var nameOnly = '';
			for (const word of words) {
				if (capitalRegex.test(word.charAt(0))  
					&& !(capitalRegex.test(word.charAt(word.length-1))) // not ending with capital letter
					&& !(/^TtM-?.*/.test(word))) { // specific title removal: exclude TtM prefix titles
					nameOnly += word + ' ';
				}
			}
			return nameOnly.trim();
		})(seg);
		
		if (toPush.length) {
			var parts = toPush.split(/\s+/);
			nameArray.push({
				first: parts.slice(0, -1).join(' '),
				last: parts[parts.length - 1]
			});
		}
	}
	return nameArray;
}

/**
 * Find book title as part of TDOI
 * Some TDOIs are exclusive to some DTKs.
 * Using prefix to not be confused with `item.bookTitle`.
 * @param {string} tdoi Duodecim uses universal URI, Most such URIs may be accessed in Terveysportti, hence the name.
 * @returns {string} Prefix
 */
function findPrefixTDOI(tdoi) {
	const prefixRegex = /^[a-z]{3}/;
	return (prefixRegex.test(tdoi)) ? tdoi.match(prefixRegex)[0] : tdoi;
}

/**
 * Backup, static version of tdoiRedirect()
 * Some Terveysportti articles may be accessed with a shorted URL than the final URL under a DTK, i.e. terveysportti.fi/doi/<TDOI>
 * @param {string} prefix
 * @returns {boolean} whether to shorten item.URL
 */
function urlShortenerStatic(prefix) {
	// A list of books that can be TDOI redirected, except the following prefixes as they would be redirected to another domain
	// 
	// duo > duodecimlehti.fi, Medical Journal Duodecim
	// hoi/nix > kaypahoito.fi, Current Care Guidelines
	// ebm > ebm-guidelines.com, a same DTK as ebmg but on dedicated domain for e.g. users. 
	// 
	// Oppiportti books are dealt with separately.
	// 
	// If a user wishes, they may implement their own urlShortenerStatic and include TDOI redirection for such.
	// One may also make this a urlTransformer and link to the redirected sites instead.
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
	const doiBook = 'ebm vso'.split(' ').concat(doiLTK, doiAHO, doiHAT, doiSHK ).toSorted();
	if (doiBook.includes(prefix)) {
		Zotero.debug('urlShortenerStatic(): Shortening URL.');
		return true; }// JS: array find
	Zotero.debug('urlShortenerStatic(): not shortening URL.');
	return false;
}

/**
 * Send a TDOI redirection request and see whether the short link works and where it leads to.
 * @param {string} tdoi 
 * @returns {boolean} Whether a TDOI is redirectable
 */
async function tdoiRedirect(tdoi) {
	const tdoiURL = 'https://www.terveysportti.fi/doi/' + tdoi;
	Zotero.debug(`tdoiRedirect(): fetching TDOI URL`);
	const tdoiObj = new URL(await ZU.request(tdoiURL).then(response => {
		Zotero.debug(`tdoiRedirect(): responsing URL: ${response.responseURL}`); // Zotero's response JSON has its own structure.
		return response.responseURL;
	}));

	if (tdoiObj.hostname === 'www.terveysportti.fi' && /^\/apps\/dtk\/.*/.test(tdoiObj.pathname)) {
		Zotero.debug('tdoiRedirect: returning true > shortening item URL');
		return true;}
	Zotero.debug(`tdoiRedirect(): No TDOI redirect loaded.`);
	return false;
}

/**
 * Streamlining item.url processing
 * @param {Object} urlObj passing in a URL object as doWeb() relies on URL object
 * @param {string} tdoi 
 * @returns {string} generated URL
 */
async function urlGen (urlObj, tdoi) {
	// Determine base URL for item URL construction
	var genURL = urlObj.href;
	var divider = /\/article\/empty/.test(genURL) ? 'empty' : tdoi;
	// const isLaake = /apps\/laake\//.test(url) ? true : false;
	// if (urlShortenerStatic(prefix)) {
	try {
	if (await tdoiRedirect(tdoi)) {
		Zotero.debug('urlGen(): TDOI leads to DTK page. Shortening URL.');
		genURL = 'https://www.terveysportti.fi/doi/' + tdoi;
	} else if (urlObj.hostname !== 'www.terveysportti.fi') { // Terveyskirjasto, Käypä hoito, D-lehti, Oppiportti
		genURL = urlObj.origin + '/'; 
	}
	// else if (isLaake) {
	// 	baseUrl = doc.url;
	// }
	else if (divider) {
		Zotero.debug('urlGen(): Constructing URL by source URL concatenation.');
		genURL = genURL.split(divider)[0] + tdoi;
	} else {
		genURL = genURL.split('/article/')[0] + '/article/' + tdoi;
	}}
	catch (e) {
		Zotero.debug(`urlGen(): encountered error ${e} on line ${e.lineNumber}`);
		Zotero.debug(`urlGen(): attempting static lookup`);
		genURL = urlShortenerStatic(findPrefixTDOI(tdoi)) ? 'https://www.terveysportti.fi/doi/' + tdoi : urlObj.href;
	}
	if (urlObj.href.includes(tdoi + '/artikkeli')) { // Could be in lääketietokanta.
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
	if(!isEN) isEN = 'ebm cd dyn ccs'.split(' ').includes(prefix); // TODO collect statics
	Zotero.debug(`englishSource(): article ${isEN ? 'seems' : 'does not seem'} to be in English`);
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
	if (/kustannus oy duodecim/i.test(s) || /duodecim/i.test(s)) return 'Duodecim'; // 'Duodecim Publishing Company' would be verbose in APA style.
	return s;
}

/**
 * Parse NLM journal bibliography format.
 * @param {string} nlmString YYYY;volume(issue):pages
 * @returns {Array} or null
 */
function journalPage(nlmString) {
	const nlmRegex = /(?<year>\d{4});(?<volume>.*?)\((?<issue>.*?)\):(?<pages>.*)/; // Also works for duodecimlehti.fi
	try { return nlmString.match(nlmRegex).groups;} catch (e){}
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
		const eurISODate = `${date.year}-${ZU.lpad(date.month, '0', 2)}-${ZU.lpad(date.day, '0', 2)}`
		Zotero.debug(`eurDateToISO(): returning ISO date: ${eurISODate}`);
		return eurISODate;
	}  catch (e) {}
	return null;
}

/**
 * For ykt/ebm articles with two dates
 * @param {HTMLElement} containing date string
 * @returns {string} ISO date string YYYY-MM-DD
 */
function lastDate(div) {
	if (!div) return '';
	if (div.hasAttribute('datetime')) return div.getAttribute('datetime');

	if (div.childNodes.length > 1) { // Zotero.debug('lastDate(): retrieving last modified date.');
		var date = '';
		date = eurDateToISO(div.querySelector('var')); //  text in read
		if (!date) { // e.g. 'Päivitetty kokonaisuudessaan' / two <span>s
			const spans = div.querySelectorAll('span');
			date = eurDateToISO(spans[1]);
			date = !date ? eurDateToISO(spans[0]) : date;
		}
		return date;
	} else {
		return eurDateToISO(div);
	}
}

/**
 * Primarily for downloading PDF for Lääkärilehti
 * @param {*} path a pathname containing a Lääkärilehti article behind the paywall.
 * @returns {Promise<boolean>} whether the network IP is a subscriber to the url
 */
async function onCampus(path = '/e48243') {
	const sllTest = await ZU.requestDocument(`https://www.laakarilehti.fi${path}`).then(doc => {return doc.title});
	if (sllTest.search(/Tiedemaailma/) != -1) {
		Zotero.debug('onCampus(): on a network with subscription to Lääkärilehti. Downloading the PDF via direct link');
		return true;
	}
	Zotero.debug('onCampus(): Not at school. Need proxy.');
	return false;
}

/**
 * Main translator function to detect DTK content
 * @param {*} doc 
 * @param {string} url for SIC! detection
 * @returns content type {string} or false {boolean}
 */
async function detectWeb(doc, url) {
	if (doc.querySelector('.duo-meta_journal') // DTK journals
		|| doc.querySelector('.dl-article-bibliographic') // duodecimlehti.fi; devtools inline test: document.querySelector('div.dl-article-bibliographic').innerText.match(/(?<year>\d{4});(?<volume>.*?)\((?<issue>.*?)\):(?<pages>.*)/).groups
		|| /article\/sic\d{5}/g.test(url) // Sic! Fimea in vht
		|| /\/sic\d{5}\/artikkeli/g.test(url)) { // Sic! Fimea in lääketietokanta
		return 'journalArticle';
	} else if (doc.querySelector('.duo-database') || doc.querySelector('.duo-sortkey') || doc.querySelector('h1')) {
	return 'bookSection';
  } // TODO: audio/video?
	return false;
}

/**
 * 
 * doWeb(): Main translator function - extracts metadata from Duodecim page DOM
 * 
 * Parts:
 * Page layout inspection
 * Translator sequence: 
 * link and locators,
 * author(s), 
 * date, 
 * title,
 * Zotero index options, 
 * abstract, 
 * publisher,
 * other fields, 
 * journal and PDF attachment specifics, 
 * webpage snapshot
 * 
 * @param {*} doc document
 * @param {*} url document.URL
 */
async function doWeb(doc, url) {
	// PAGE LAYOUT INSPECTION
	const dClass = doc.querySelector('div.date') ? '' // legacy / lääketietokanta
	: (doc.querySelector('div.d-updated') ? 'd-' // oppiportti / lääketietokanta
	: 'duo-' ); // DTK, CCG (CCG: header element for DTK is present in HTML but is not displayed (display: none in CCG's CSS))
	Zotero.debug(`Determined dClass prefix: ${dClass}`);

	var item = new Zotero.Item(await detectWeb(doc, url));

	// PARSING LINK AND TDOI LOCATOR 
	const urlObj = new URL(url, ); // TODO keep hash link
	const isTP = urlObj.host === 'www.terveysportti.fi';
	const isDTK = (/^\/apps\/dtk\/.*/.test(urlObj.pathname));
	// const isYktEbm = doc.querySelector('div.duo-authors-link');
	const isDTKLegacy = /\?p_artikkeli.*/.test(urlObj.search);
	const isDLehti = urlObj.host === 'www.duodecimlehti.fi';
	const isOP = urlObj.host === 'www.oppiportti.fi';
	const isTK = urlObj.host === 'www.terveyskirjasto.fi';
	const isKP = urlObj.host === 'www.kaypahoito.fi';

	const isJournal = (item.itemType === 'journalArticle'); // Determine item type; ready to extract journal-specific data
	// var isJournalDTK = doc.querySelector('.duo-meta_journal') ? true : false;
	// const isJournalDTK = (isJournal && isDTK); // removed for multi-site = DTK + LäTK + d-lehti

	var urlMatchRegex = isDTK ? (/\/article\/(.+?)(?:\?|$)/) : (/(?<=\/)\w{3}\d{5}(?![\w\d])/) ; // TODO legacy DTK, LäKT
	var tdoi = text(`div.${dClass}identifier span`) || // TK, legacy
		text(`span.${dClass}identifier`) || 
		urlMatchRegex.test(url) ? url.match(urlMatchRegex)[(isDTK ? 1 : 0)] : '';

	Zotero.debug(`doWeb(): ${/^\w{3}\d{5}$/.test(tdoi) ? '' : 'INVALID'}TDOI=${tdoi}`);
	const prefix = findPrefixTDOI(tdoi);

	item.url = (isDTK && isTP) // Keeping non-TP domains
		? await urlGen(urlObj, tdoi) 
		: (isOP || isTK || isKP) ? 'https://' + urlObj.host + '/' + tdoi // oppiportti and public
		: url;

	item.language = englishSource(prefix, urlObj) ? 'en' // ISO 639 set 1
		: ((['khr', 'gvr'].includes(prefix)) ? 'se' : 'fi'); // TODO collect statics // Make Finnish the default language 

	// PARSING AUTHORS 
	var authorClass =  doc.querySelector('div.duo-authors-link')
		? 'div.duo-authors-link' // ykt, ebm
		: isDLehti ? 'div.dl-article-editors-container' 
		: dClass === '' ? 'div.person'
		: `div.${dClass}authors`;
	var authorsRaw = doc.querySelector(authorClass) ? innerText(authorClass) : ''; 
	Zotero.debug(`Raw author string: ${authorsRaw}`);
	
	// Parse authors based on type
	const ccg = /(^Käypä hoito|.*työryhmä).*/i.test(authorsRaw); // Author handling: Determine if this is a CCG (Käypä hoito) page by a group author (regex: subitems under a main CCG without human authors | group authors)
	const otherSingleAuthor = (['lab'].includes(prefix)) ? true : false; // TODO statics

	var authors = (ccg || otherSingleAuthor) ? authorsRaw : parseAuthors(authorsRaw, item.language);
	
	// Add creators (authors)
	if ((ccg || otherSingleAuthor || typeof authors === 'string') && authors) {
		item.creators.push({
			lastName: authors,
			creatorType: ccg ? 'bookAuthor' : 'author', // APA citing CCG content: Long group author string
			fieldMode: 1 // cite: via other translators
		});
	} 
	
	if (Array.isArray(authors) && authors.length > 0) {
		for (let author of authors) {
			item.creators.push({
				firstName: author.first || '',
				lastName: author.last || '',
				creatorType: 'author'
			});
		}
	} 

	// PARSING DATE
	// Extract updated element or journal metadata
	var dateSelector = doc.querySelector('div.date') ? 'div.date' 
		:`div.${dClass}updated`;
		
	var dateStr = lastDate(doc.querySelector(dateSelector));
	// item.date: final date field determined in journal section

	// PARSING TITLE
	item.title = text('h1').replace(/[\xA0\r\s]+/g, " "); // hot00013
	Zotero.debug(`item.title: ${item.title}`);
	if (/: /.test(item.title)) { // Finnish language: semicolon in Finnish may be used in inflecting abbreviations, hence ': ' instead of ':'
		item.shortTitle = item.title.split(': ')[0];
		if (item.shortTitle === 'Tietoa potilaalle') { // TODO collect statics
			item.shortTitle = item.title.split(':')[1];
		}
	} else if (/[-–]/.test(item.title)) { // en dash, Alt + (numpad) 0150 / (macOS) Option + -
		item.shortTitle = item.title.split('-')[0];
	}

	const dbRaw = text(`div.${dClass}database`) || (isDLehti ? 'Lääketieteellinen Aikakauskirja Duodecim' : ''); // APA requires that journal titles be written in its offical, original form.
	if (dbRaw && isJournal) item.publicationTitle = dbRaw;
	if (dbRaw && !isJournal) item.bookTitle = dbRaw;
	
	// PARSING INDEX OPTIONS
	item.tags.push(isDTK ? 'dtk' : isDTKLegacy ? 'dtk-legacy' : 'duodecim');
	// Constructing option 1: Get sort key from span.duo-sortkey (text in parentheses)
	var sortKeyText = text(`.${dClass}sortkey`);
	var sortKey = '';
	if (sortKeyText) {
		var match = sortKeyText.match(/(?<=\().*(?=\))/);
		if (match) sortKey = match[0];
	}

	// Constructing option 2: Set archive/call number
	var archive = isDTK ? text('ul li.nav-item a.nav-link')
		: isTP ? 'Terveysportti' 
		: isOP ? 'Oppiportti' 
		: isTK ? 'Terveyskirjasto'
		: isKP ? 'Käypä hoito'
		: ''; // || getText('div.dbbar'); TODO: legacy: fetch DTK name?
	
	if (archive && (archive !== item.bookTitle)) item.archive = archive;
	item.archiveLocation = sortKey ? sortKey : tdoi;
	item.callNumber = tdoi; // for Zotero DB search by TDOI

	// PARSING ABSTRACT: try primary source, then fallback
	Zotero.debug('doWeb(): extracting abstract');
	var abstractRaw = innerText(`div.${dClass}aside`) // getText() removes 
		|| innerText(`.${dClass}body .${dClass}section .${dClass}header`) 
		|| innerText(`.${dClass}body > .${dClass}section em`).replace(/[\xA0\r\s]+/g, " ") // TODO example being?
		|| innerText('em').replace(/[\xA0\r\s]+/g, " ")  // duo11158
		|| '';
	Zotero.debug(`Duodecim: abstract text: ${abstractRaw}`);
	if (abstractRaw) item.abstractNote = returnProtect(abstractRaw); // TODO: succeed in Scaffold but mess in Edge? Try FireFox?

	// PARSING PUBLISHER
	const copyrightRaw = text(`div.${dClass}copyrights`) || text(`div.${dClass}copyright`);
	item.publisher = (isDLehti || isOP || isKP) ? 'Duodecim' : normalizePublisher(copyrightRaw);

	// PARSING JOURNALS
	var journalMetadata = {}; // init container: page and section
	if (isJournal) {
		const pageSelector = (urlObj.host === 'www.duodecimlehti.fi') ? 
			'div.dl-article-bibliographic' : `div.${dClass}meta_journal`;
		
		var nlmString = text(pageSelector);
		journalMetadata = nlmString ? journalPage(nlmString) :journalMetadata;

		const genreClass = (urlObj.host === 'www.duodecimlehti.fi') ? // e.g. Katsaus [Review], Näin hoidan [This is how I treat]; Teema: XXX (Theme issue)
			'div.dl-article-section-title' : `div.${dClass}genre`; 
		journalMetadata.genre = text(genreClass);
	}

	// Set date
	if (isJournal && journalMetadata.year && prefix !== 'sic') {
		item.date = journalMetadata.year;
	} else if (dateStr) {
		item.date = dateStr;
		if (prefix === 'sic') {
			// TODO extract issue number
		}
	}

	// TODO collect statics
	// TODO wrap statics
	// TODO Finna?
	// Add journal-specific fields
	var journalISSN = {};
	journalISSN.sll = '0039-5560, 2489-7493'; // Zotero: Using comma per Zotero forum discussion 94009
	journalISSN.duo = '0012-7183, 2242-3281';
	journalISSN.hle = '0786-5686, 2954-2464';
	
	var journalAbbr = {}; // for NLM styles using abbreviations
	journalAbbr.duo = 'Duodecim';
	journalAbbr.sll = 'Suom Lääkäril';
	
	if (isJournal) {
		item.tags.push((isDTK || isDTKLegacy) ? 'dtk-journal' : 'duodecim-journal');
		item.ISSN = journalISSN[prefix];
		item.journalAbbreviation = journalAbbr[prefix];
		if (journalMetadata.volume) item.volume = journalMetadata.volume;
		if (journalMetadata.issue) item.issue = journalMetadata.issue;
		if (journalMetadata.pages) item.pages = journalMetadata.pages;

		// Duodecim journal's website (duodecimlehti.fi) does not do a good job in searching for series titles like 'Näin hoidan' [This is how I treat]
		// Nevertheless, I have not found a citation style that requires adding this to bibliography list.
		if (journalMetadata.genre) item.section = journalMetadata.genre; 
	}

	// PARSING duo and sll: possible English title and abstract; PDF as file and hyperlink
	if (prefix === 'duo' && dbRaw === 'Lääketieteellinen Aikakauskirja Duodecim') { 
		Zotero.debug('PDF for duo...');
		if (!isDLehti) item.archiveLocation = tdoi; // searching with sortkey in LTK won't find the item.
		
		// English summary extraction
		const h2 = doc.querySelectorAll('h2');
		if (h2 && (/^English summary.*/i).test(h2[0].innerText)) {
			item.title += ` [${h2[0].innerText.match(/(?<=English summary: ).*$/)[0]}]`;
			item.abstractNote += `\n\n${doc.querySelectorAll('em')[1].innerText}`;
			item.tags.push('englanti-duodecim-lehti');
		} else { // e.g. duo11158
			const em = doc.querySelectorAll('p em');
			if (em) {
				em.forEach(p => {
					if (/^English summary.*/i.test(p.innerText)) {
						item.title += ` [${p.innerText.match(/(?<=English summary: ).*$/)[0]}]`;
						item.abstractNote += `\n\n${innerClean(p.parentNode.nextElementSibling, '*')}`;
						item.tags.push('englanti-duodecim-lehti');
					}
				})
			}
		}

		var pdfLink = `https://${urlObj.host}/xmedia/duo/${tdoi}.pdf` // doc.querySelector('app-plugin-external-link a');
		// Zotero.debug(`${arguments.callee.name}(): downloading PDF link: ${pdfLink}`); // TODO callee deprecated
		item.attachments.push({ 
			url: pdfLink,
			title: `Linkki PDF-tiedostoon (${urlObj.host.replace('www.','')})`,
			mimeType: "text/html",
			snapshot: false
		},{ 
			url: pdfLink, // If you have arrived at the page, you must have legal cookie for PDF download.
			title: "PDF",
			"mimeType": "application/pdf",
			"proxy": false
		});
	} 
	
	// sll: English summary (If applicable) comes usually before reference list. Just in case, iterate through all <h2>s.
	if (prefix === 'sll' && dbRaw === 'Suomen Lääkärilehti') {
		doc.querySelectorAll('h2').forEach(h2 => {
			if ((/^English summary.*/i).test(text(h2))) {
				item.title += ` [${h2.innerText.match(/(?<=English summary: ).*$/)[0]}]`;
				item.abstractNote += `\n\n${h2.nextElementSibling.innerText.replace(/[\xA0\r\s]+/g, " ")}`;
				item.tags.push('englanti-lääkärilehti');
		}});}

	// PARSING PDF: SLL and Other journals or arbitrary items with PDF
	var firstLink;
	if ((!item.attachments.length) // already pushed for d-lehti
		&& doc.querySelectorAll(`article a.${dClass}anchor:not(.${dClass}article):not(.${dClass}external)`).length){ 
		firstLink = doc.querySelectorAll(`article a.${dClass}anchor:not(.${dClass}article:not(.${dClass}external))`)[0].href;
		Zotero.debug(`doWeb(): first hyperlink in article ${firstLink}`);
		if (!/.*\.pdf$/.test(firstLink)) firstLink = null;
	}

	const tdoiRegex = /\w{3}\d{5}\w*?(?![\w\d])/; // TODO: unified or more universal regex
	if (firstLink) {
		Zotero.debug(`doWeb(): handling first hyperlink as PDF`);
		if (prefix !== 'sll') { // Zotero.debug(`doWeb(): pushing PDF file ${firstLink}`);
			const pdfTDOI = tdoiRegex.test(firstLink) ? firstLink.match(tdoiRegex)[0] : null;
			const isMainPDF = (pdfTDOI && pdfTDOI.substring(0,8) === tdoi) ? true : false;
			Zotero.debug(`Pushing PDF as file: ${firstLink}`);
			item.attachments.push({
				// TODO find if PDF contains own TDOI and whether a match or a supplement path: `${tdoi}-${item.title}`,
				url: firstLink,
				title: `PDF`,
				title: `${isMainPDF ? "PDF" : "Supplementary PDF"}`,
				mimeType: "application/pdf"
			});} 
		else {
			Zotero.debug('doWeb(): PDF for sll...');
			const sllPDFPath = firstLink.match(/(?<=laakarilehti\/).*/)[0];

			if (sllPDFPath) firstLink = 'https://www.laakarilehti.fi/' + sllPDFPath; // Unless you have a FimNet credential, you need proxy to access the PDF on laakarilehti.fi.
			Zotero.debug(`sll: Pushing hyperlink to PDF ${firstLink}`);
			item.attachments.push({
				url: `https://www.laakarilehti.fi/${sllPDFPath}`,
				title: "Linkki PDF-tiedostoon (laakarilehti.fi)",
				mimeType: "text/html",
				snapshot: false
			});
			
			// Unified PDF file push
			const directDL = await onCampus();
			if (!directDL) Zotero.debug('doWeb() sll PDF: attempting to scrape and push PDF via proxy.');
			const metaProxyURL=attr(doc, 'meta[name="translator-proxy"]', 'content');
			Zotero.debug(`Experimental: userscript proxy URL from <meta>: ${metaProxyURL?metaProxyURL : 'NOT FOUND'}`);
			const dlDomain = directDL?`https://www.laakarilehti.fi/`:metaProxyURL?metaProxyURL:null;
			
			if (dlDomain){
				item.attachments.push({
					url: dlDomain + sllPDFPath,
					title: `PDF${directDL ? '':' välityksellä'}`,
					mimeType: "application/pdf",
			});}
	}}

	Zotero.debug(`item.attachments: ${item.attachments.length} attachments before webpage snapshot: ${JSON.stringify(item.attachments)}`);
	
	// web page snapshot
	item.attachments.push({
		path: `${tdoi}-${item.title}`, // TODO verify filename
		title: `${item.language === 'fi' ? 'Tilannekuva artikkelista (article snapshot)' : 'Article snapshot'}`,
		document: doc,
		snapshot: true
	});

	// Finalize and save item
	// Zotero.debug(`Complete: item.attachments length: ${Object.keys(item.attachments).length}`);
	// Zotero.debug(`COMPLETE with ${item.attachments.length} attachments. Adding 'duodecim-translator' tag.`);
	item.tags.push('duodecim-translator');
	item.complete();
}

var exports = {onCampus: onCampus};

/**
 * A NOTE ON TEST CASES
 * All test cases were fetched in May 2026. Actual fetch time should be logged by Zotero at runtime. 
 * I built this translator with APA citation style in mind.
 * Feel free to test in other formats, especially NLM-Vancouver-based formats and their Finnish variants such as `styles/dependent/Suomen Laakarilehti.csl` (also part of Zotero Style Repository)
 * 
 * For terveysportti.fi cases, you should have subscription to each DTK of Terveysportti.
 * The journal case duo99748 is free to access only from duodecimlehti.fi.
 * 
 * Proceed with testing under a network with Terveysportti subsciption TODO or log in first in Scaffold's browser.
 * Free TDOIs:
 * hoi50138
 * dnd00039
 * duo11158
 * duo99748
 * AND everything in part 3.1
 * 
 * For each case, pay attention to the following fields. Each case would be referred to by their TDOI.
 * ========================================
 * PART 1: reasons for own helper functions
 * 
 * parseAuthors(): ZU.cleanAuthor() is incapable of either customizing the Finnish 'ja' as divider:
 * ykt01870
 *  
 * nor can it handle complex raw author strings containing titles such as
 * voh00042: sairaanhoitaja (AMK) Eeva-Maija Airas, sairaanhoitaja (AMK) Noora Päivärinta, sairaanhoitaja, TtM, hoitotyön lehtori Merja Jylkkä ja sairaanhoitaja (YAMK), hoitotyön lehtori Outi Lastumäki
 * 
 * Besides, institutional/group authors:
 * lab34165: HUS Diagnostiikkakeskus
 * dnd00039: Käypä hoito -työryhmä ADHD (aktiivisuuden ja tarkkaavuuden häiriö)
 * hoi50138: Suomalaisen Lääkäriseuran Duodecimin ja Suomen Gynekologiyhdistyksen asettama työryhmä
 * 
 * Note: My own helper is not perfect, e.g.
 * shk00004
 * 
 * innerClean():
 * duo11158 abstract
 * 
 * PART 2: Journals and PDF download
 * 
 * sll51576 // TODO SLL own translator
 * duo99748
 * hle00258
 * shk00004
 * 
 * PART 3: consistency between terveysportti.fi and other site versions
 * 
 * PART 3.1: with public sites (terveyskirjasto, kaypahoito)
 * dlk00221
 * dnd00039
 * hoi50138
 * nix03607
 * uux30190 * 2
 * 
 * PART 3.2: with other subscription-based sites
 * duo99748 * 2
 * fys00127 * 3
 * ebm01103 * 2
 * 
 * PART 4: legacy DTK: To my knowledge, this cannot be accessed with personal accounts
 * tvh00004: part of the only ebook hosted exclusively on the legacy DTK. 
 * fys00127
 * 
 * PART 5: English content: an example pair with same authors, processing with own and ZU helpers
 * ebm01103 + ykt01870
 */

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/shk/article/voh00042",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Aikuisen nuha, yskä ja kuume (flunssa)",
				"creators": [
					{
						"firstName": "Eeva-Maija",
						"lastName": "Airas",
						"creatorType": "author"
					},
					{
						"firstName": "Noora",
						"lastName": "Päivärinta",
						"creatorType": "author"
					},
					{
						"firstName": "Merja",
						"lastName": "Jylkkä",
						"creatorType": "author"
					},
					{
						"firstName": "Outi",
						"lastName": "Lastumäki",
						"creatorType": "author"
					}
				],
				"date": "2025-04-15",
				"abstractNote": "Nuha, yskä, kuume ja kurkkukipu ovat tavallisimmat oireet viruksen aiheuttamasta hengitystieinfektiosta, joka paranee ilman mikrobilääkehoitoa noin kahdessa viikossa.\nFlunssan aiheuttavat yleisimmin rinovirukset, A- ja B-virukset, RS-virukset, koronavirukset, parainfluenssavirukset ja adenovirukset.\nFlunssa on hyvin yleinen vaiva. Aikuisilla esiintyy tyypillisesti noin 2–4 flunssaa vuodessa.\nTutkimusten mukaan vilustuminen ei vaikuta flunssan kehittymiseen.\nFlunssan itämisaika on yleensä 24–72 tuntia.\nKuumeeton voi ulkoilla ja työskennellä välttäen kuitenkin kovaa fyysistä rasitusta.\nSairausloman tarve on 2–3 päivää, jos kuumetta ei ole. Influenssassa sairaanhoitaja voi yleensä kirjoittaa 5 päivää. Korona luokitellaan virusinfektioksi: sairauslomaa suositellaan, kunnes oireet alkavat helpottaa (yleensä 3–5 päivää).",
				"archive": "Hoitotyön tietokanta",
				"archiveLocation": "002.010",
				"bookTitle": "Sairaanhoitajan vastaanoton ohjeet",
				"callNumber": "voh00042",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/doi/voh00042",
				"attachments": [
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "dtk"
					},
					{
						"tag": "duodecim-translator"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/lab34165",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Verikaasuanalyysi (pO2, pCO2, pH ja laskenta), valtimoverestä",
				"creators": [
					{
						"lastName": "HUS Diagnostiikkakeskus",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2025-11-28",
				"archive": "Lääkärin tietokannat",
				"archiveLocation": "H-KL3647",
				"bookTitle": "Laboratoriotutkimukset",
				"callNumber": "lab34165",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "HUS Diagnostiikkakeskus",
				"url": "https://www.terveysportti.fi/doi/lab34165",
				"attachments": [
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "dtk"
					},
					{
						"tag": "duodecim-translator"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/shk/article/hot00013",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Onnistu laboratorionäytteissä - suositus tutkimusten valinnasta, potilaan tunnistamisesta ja ohjaamisesta",
				"creators": [
					{
						"firstName": "Seija",
						"lastName": "Tuokko",
						"creatorType": "author"
					},
					{
						"firstName": "Marja-Kaarina",
						"lastName": "Koskinen",
						"creatorType": "author"
					},
					{
						"firstName": "Timo",
						"lastName": "Kouri",
						"creatorType": "author"
					},
					{
						"firstName": "Maija",
						"lastName": "Saijonkari",
						"creatorType": "author"
					},
					{
						"firstName": "Kaija",
						"lastName": "Sopenlehto",
						"creatorType": "author"
					}
				],
				"date": "2021-12-08",
				"abstractNote": "Johdanto\nSuomessa tehdään vuosittain noin 80 miljoonaa laboratoriotutkimusta eli runsaat 10 tutkimusta henkeä kohti. Näihin tutkimuksiin liittyy näytteenottokertoja arviolta noin 10–20 miljoonaa.\nTapahtumat ennen näytteen saapumista laboratoriolaitteelle, eli laboratoriotutkimuksen preanalyyttinen vaihe, aiheuttaa potilaan turvallisuudelle useammin riskin kuin itse mittaus 1 2 3. Tyypillisiä virheitä ovat väärän tai turhan tutkimuksen valinta, potilaan informoinnin ja esivalmistelun puute, puutteellinen tutkimuspyyntö, tutkimuksen tallennus väärälle potilaalle, näytteen väärä ottotapa, näytteenotto väärältä potilaalta tai hoidon kannalta vääränä ajankohtana, puutteelliset näytetarrat, näytteiden sekaantuminen ja näytteiden virheellinen säilytys- tai kuljetustapa 4. Erityisesti potilaan tai näytteen virheellinen tunnistaminen voi aiheuttaa vakavia potilasturvallisuusriskejä\nLaboratoriotutkimuksiin liittyviä vaaratapahtumia (haittatapahtumia ja läheltä pititilanteita) esiintynee 1 % näytteenotoista, haittatapahtumia 0,1 % ja vakavia haittoja noin 1:100 000 näytteenottoa kohti. Näistä kertynee maassamme vuosittain noin 10 000 vaaratapahtumaa ja noin 1 000 haittatapahtumaa. Joka neljäs kaikista laboratoriotutkimuksesta johtuvista haittatapahtumista voi viivästyttää potilaan hoitoa, heikentää ennustetta ja aiheuttaa turhia kustannuksia. 1 6 7 Preanalyyttisten virheiden suorat kustannukset Suomen terveydenhuollolle lienevät vuosittain ainakin 10 miljoonaa euroa.\nPotilaan ohjaamisesta näytetutkimuksiin ei ole kattavia kansallisia toimintasuosituksia. Alueellisia potilasohjeita käytetään vaihtelevasti, eikä systemaattista seurantaohjelmaa ole. Kansallinen toimenpideohjelma puuttuu, vaikka potilaiden laboratoriodiagnostiikan puutteet, ja niistä aiheutuvat turhat kustannukset tunnistetaan",
				"archive": "Hoitotyön tietokanta",
				"archiveLocation": "hot00013",
				"bookTitle": "Hotus-hoitosuositukset®",
				"callNumber": "hot00013",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Hoitotyön tutkimussäätiö",
				"shortTitle": "Onnistu laboratorionäytteissä",
				"url": "https://www.terveysportti.fi/apps/dtk/shk/article/hot00013",
				"attachments": [
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "dtk"
					},
					{
						"tag": "duodecim-translator"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/sll51576?toc=1030597",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Sarjamagneettistimulaation mahdollisuudet psykiatriassa ja tulevaisuuden näkymät [Repetitive transcranial magnetic stimulation (rTMS) in psychiatry and future visions]",
				"creators": [
					{
						"firstName": "Tero",
						"lastName": "Taiminen",
						"creatorType": "author"
					},
					{
						"firstName": "Satu K.",
						"lastName": "Jääskeläinen",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISSN": "0039-5560, 2489-7493",
				"abstractNote": "Eurooppalaisessa näytönastekatsauksessa sarjamagneettistimulaatio (rTMS) on arvioitu varmasti tehokkaaksi masennuksen hoitomuodoksi (näytönaste A). Teho sijoittunee lääkehoidon ja sähköhoidon välille.\nrTMS on todennäköisesti tehokasta (näytönaste B) kaksisuuntaisen mielialahäiriön masennusjaksoissa, traumaperäisessä stressihäiriössä ja skitsofrenian negatiivissa oireissa.\nMenetelmän tekninen kehitys on nopeaa, ja lähitulevaisuudessa hoito todennäköisesti nopeutuu, tehostuu ja sen vaikuttavuus paranee edelleen.\n\nThe updated European guidelines state that rTMS is definitely effective against major depression (level A evidence). It is probably effective in depression in bipolar disorder, posttraumatic stress disorder and negative symptoms of schizophrenia. Technical development in the area is rapid, and in the near future rTMS treatment will probably be faster and more efficient.",
				"archive": "Lääkärin tietokannat",
				"archiveLocation": "202051-522853",
				"callNumber": "sll51576",
				"issue": "51-52",
				"journalAbbreviation": "Suom Lääkäril",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"pages": "2853-2858",
				"publicationTitle": "Suomen Lääkärilehti",
				"publisher": "Suomen Lääkäriliitto",
				"section": "Yleiskatsaus",
				"url": "https://www.terveysportti.fi/doi/sll51576",
				"volume": "75",
				"attachments": [
					{
						"title": "Linkki PDF-tiedostoon (laakarilehti.fi)",
						"mimeType": "text/html"
					},
					{
						"title": "PDF",
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
						"tag": "dtk"
					},
					{
						"tag": "dtk-journal"
					},
					{
						"tag": "duodecim-translator"
					},
					{
						"tag": "englanti-lääkärilehti"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/duo99748",
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
				"archive": "Lääkärin tietokannat",
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
				"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/duo99748",
				"volume": "127",
				"attachments": [
					{
						"title": "Linkki PDF-tiedostoon (terveysportti.fi)",
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
						"tag": "dtk"
					},
					{
						"tag": "dtk-journal"
					},
					{
						"tag": "duodecim-translator"
					},
					{
						"tag": "englanti-duodecim-lehti"
					}
				],
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
						"tag": "duodecim"
					},
					{
						"tag": "duodecim-journal"
					},
					{
						"tag": "duodecim-translator"
					},
					{
						"tag": "englanti-duodecim-lehti"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/shk/article/hle00258?toc=1126536",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Fenomenologinen metodi hoitotieteellisessä tutkimuksessa - kriittisten kohtien tunnistaminen tutkimusprosessissa",
				"creators": [
					{
						"firstName": "Anne",
						"lastName": "Vuori",
						"creatorType": "author"
					},
					{
						"firstName": "Päivi",
						"lastName": "Åstedt-Kurki",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"ISSN": "0786-5686, 2954-2464",
				"archive": "Hoitotyön tietokanta",
				"archiveLocation": "hle00258",
				"callNumber": "hle00258",
				"issue": "4",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"pages": "321-333",
				"publicationTitle": "Hoitotiede",
				"publisher": "Hoitotieteiden tutkimusseura HTTS r.y.",
				"url": "https://www.terveysportti.fi/apps/dtk/shk/article/hle00258",
				"volume": "34",
				"attachments": [
					{
						"title": "PDF",
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
						"tag": "dtk"
					},
					{
						"tag": "dtk-journal"
					},
					{
						"tag": "duodecim-translator"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/shk/article/shk00004/search/abcde",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "PEWS – Lasten aikaisen varoituksen pisteytysjärjestelmä",
				"creators": [
					{
						"firstName": "Suomen",
						"lastName": "Sairaanhoitajat",
						"creatorType": "author"
					}
				],
				"date": "2023-04-19",
				"archive": "Hoitotyön tietokanta",
				"archiveLocation": "001.004",
				"bookTitle": "Sairaanhoitajan käsikirja",
				"callNumber": "shk00004",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Suomen Sairaanhoitajat ry",
				"url": "https://www.terveysportti.fi/doi/shk00004",
				"attachments": [
					{
						"title": "Supplementary PDF",
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
						"tag": "dtk"
					},
					{
						"tag": "duodecim-translator"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/dlk00221?toc=7856",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Tietoa potilaalle: Huimaus",
				"creators": [],
				"date": "2026-03-18",
				"abstractNote": "Katso tietoiskuvideo:\nHuimaus pähkinänkuoressa",
				"archive": "Lääkärin tietokannat",
				"archiveLocation": "026.018",
				"bookTitle": "Lääkärikirja Duodecim",
				"callNumber": "dlk00221",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"shortTitle": "Huimaus",
				"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/dlk00221",
				"attachments": [
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "dtk"
					},
					{
						"tag": "duodecim-translator"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveyskirjasto.fi/dlk00221",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Huimaus",
				"creators": [],
				"date": "2026-03-18",
				"archive": "Terveyskirjasto",
				"archiveLocation": "dlk00221",
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
				"tags": [
					{
						"tag": "duodecim"
					},
					{
						"tag": "duodecim-translator"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/dnd00039",
		"defer": true,
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
				"abstractNote": "Älä ilman erityistä perustetta suosittele monityydyttymättömiä rasvahappoja lasten ja nuorten ADHD:n hoitoon.",
				"archive": "Lääkärin tietokannat",
				"archiveLocation": "050.061",
				"bookTitle": "Vältä viisaasti",
				"callNumber": "dnd00039",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"shortTitle": "Monityydyttymättömät rasvahapot lasten ja nuorten ADHD",
				"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/dnd00039",
				"attachments": [
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "dtk"
					},
					{
						"tag": "duodecim-translator"
					}
				],
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
				"abstractNote": "Älä ilman erityistä perustetta suosittele monityydyttymättömiä rasvahappoja lasten ja nuorten ADHD:n hoitoon.",
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
				"tags": [
					{
						"tag": "duodecim"
					},
					{
						"tag": "duodecim-translator"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/hoi50138",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Keskenmeno",
				"creators": [
					{
						"lastName": "Suomalaisen Lääkäriseuran Duodecimin ja Suomen Gynekologiyhdistyksen asettama työryhmä",
						"creatorType": "bookAuthor",
						"fieldMode": 1
					}
				],
				"date": "2026-05-11",
				"abstractNote": "Noin 10–15 % havaituista raskauksista päättyy keskenmenoon. Valtaosa keskenmenoista tapahtuu ensimmäisellä raskauskolmanneksella.\nKeskenmenoille on useita eri syitä. Suurin osa yksittäisistä keskenmenoista johtuu alkion kromosomipoikkeavuuksista.\nKeskenmenon riskiä lisäävät esimerkiksi yli 40 vuoden ikä, lihavuus ja tupakointi.\nKeskenmenon tyypillisiä oireita ovat verinen vuoto ja alavatsakipu, mutta se voi olla myös oireeton.\nEnsisijainen diagnostinen tutkimus keskenmenoa epäiltäessä on emättimen kautta tehtävä ultraäänitutkimus. Kliinisen keskenmenon diagnoosi voidaan asettaa, kun raskauden kesto on vähintään 6 viikkoa viimeisistä kuukautisista laskettuna.\nKeskenmenon hoitovaihtoehtoja ovat seuranta, lääkehoito ja kirurginen hoito.\nLääkehoito on ensisijainen, koska se on todettu tehokkaaksi ja turvalliseksi. Hoitovaihtoehdoista, niiden hyödyistä ja haitoista on tärkeää keskustella potilaan kanssa ennen hoidon aloitusta.\nRiittävä kivun hoito sekä potilaan empaattinen kohtaaminen ovat keskeisiä riippumatta valitusta hoitomenetelmästä.\nAlle 10. raskausviikon keskenmenoissa rutiinimainen anti-D-immunoglobuliinisuojaus RhD-negatiivisille ei ole tarpeen.\nKeskenmenon hoidon jälkeen ei ole tarpeen tehdä rutiinimaista ultraäänitutkimusta tai raskaustestiä.\nUuden raskauden onnistumisen todennäköisyys keskenmenon jälkeen on suuri. Valtaosa saa lapsen toistuvankin keskenmenon jälkeen.\nKeskenmenon jälkeen suositellaan jälkitarkastusta neuvolassa. Seurannassa on keskeistä varmistaa sekä fyysinen että psyykkinen toipuminen ja ohjata tarvittaessa tuen piiriin.\nToisen raskauskolmanneksen keskenmenon jälkeen keskenmenon syytä selvitetään erikoissairaanhoidossa.\nYhden tai kahden keskenmenon jälkeen keskenmenon kokeneen ja hänen kumppaninsa mahdollisia sairauksia ja elintapoja arvioidaan perusterveydenhuollossa.\nKolmen peräkkäisen keskenmenon jälkeen tilannetta arvioidaan erikoissairaanhoidossa.",
				"archive": "Lääkärin tietokannat",
				"archiveLocation": "050.138",
				"bookTitle": "Käypä hoito",
				"callNumber": "hoi50138",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/hoi50138",
				"attachments": [
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "dtk"
					},
					{
						"tag": "duodecim-translator"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kaypahoito.fi/hoi50138",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Keskenmeno",
				"creators": [
					{
						"lastName": "Suomalaisen Lääkäriseuran Duodecimin ja Suomen Gynekologiyhdistyksen asettama työryhmä",
						"creatorType": "bookAuthor",
						"fieldMode": 1
					}
				],
				"date": "2026-05-11",
				"abstractNote": "Noin 10–15 % havaituista raskauksista päättyy keskenmenoon. Valtaosa keskenmenoista tapahtuu ensimmäisellä raskauskolmanneksella.\nKeskenmenoille on useita eri syitä. Suurin osa yksittäisistä keskenmenoista johtuu alkion kromosomipoikkeavuuksista.\nKeskenmenon riskiä lisäävät esimerkiksi yli 40 vuoden ikä, lihavuus ja tupakointi.\nKeskenmenon tyypillisiä oireita ovat verinen vuoto ja alavatsakipu, mutta se voi olla myös oireeton.\nEnsisijainen diagnostinen tutkimus keskenmenoa epäiltäessä on emättimen kautta tehtävä ultraäänitutkimus. Kliinisen keskenmenon diagnoosi voidaan asettaa, kun raskauden kesto on vähintään 6 viikkoa viimeisistä kuukautisista laskettuna.\nKeskenmenon hoitovaihtoehtoja ovat seuranta, lääkehoito ja kirurginen hoito.\nLääkehoito on ensisijainen, koska se on todettu tehokkaaksi ja turvalliseksi. Hoitovaihtoehdoista, niiden hyödyistä ja haitoista on tärkeää keskustella potilaan kanssa ennen hoidon aloitusta.\nRiittävä kivun hoito sekä potilaan empaattinen kohtaaminen ovat keskeisiä riippumatta valitusta hoitomenetelmästä.\nAlle 10. raskausviikon keskenmenoissa rutiinimainen anti-D-immunoglobuliinisuojaus RhD-negatiivisille ei ole tarpeen.\nKeskenmenon hoidon jälkeen ei ole tarpeen tehdä rutiinimaista ultraäänitutkimusta tai raskaustestiä.\nUuden raskauden onnistumisen todennäköisyys keskenmenon jälkeen on suuri. Valtaosa saa lapsen toistuvankin keskenmenon jälkeen.\nKeskenmenon jälkeen suositellaan jälkitarkastusta neuvolassa. Seurannassa on keskeistä varmistaa sekä fyysinen että psyykkinen toipuminen ja ohjata tarvittaessa tuen piiriin.\nToisen raskauskolmanneksen keskenmenon jälkeen keskenmenon syytä selvitetään erikoissairaanhoidossa.\nYhden tai kahden keskenmenon jälkeen keskenmenon kokeneen ja hänen kumppaninsa mahdollisia sairauksia ja elintapoja arvioidaan perusterveydenhuollossa.\nKolmen peräkkäisen keskenmenon jälkeen tilannetta arvioidaan erikoissairaanhoidossa.",
				"archiveLocation": "050.138",
				"bookTitle": "Käypä hoito",
				"callNumber": "hoi50138",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.kaypahoito.fi/hoi50138",
				"attachments": [
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim"
					},
					{
						"tag": "duodecim-translator"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/nix03607",
		"defer": true,
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
				"abstractNote": "Yhteenveto:",
				"archive": "Lääkärin tietokannat",
				"archiveLocation": "050.138",
				"bookTitle": "Lisätietoa aiheesta",
				"callNumber": "nix03607",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/nix03607",
				"attachments": [
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "dtk"
					},
					{
						"tag": "duodecim-translator"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kaypahoito.fi/nix03607",
		"defer": true,
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
				"abstractNote": "Yhteenveto:",
				"archive": "Käypä hoito",
				"archiveLocation": "050.138",
				"bookTitle": "Lisätietoa aiheesta",
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
				"tags": [
					{
						"tag": "duodecim"
					},
					{
						"tag": "duodecim-translator"
					}
				],
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
				"tags": [
					{
						"tag": "duodecim"
					},
					{
						"tag": "duodecim-translator"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveyskirjasto.fi/uux30190",
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
				"tags": [
					{
						"tag": "duodecim"
					},
					{
						"tag": "duodecim-translator"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/tyt/article/fys00127?toc=1133617",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Kivun fysiologiaa",
				"creators": [
					{
						"firstName": "Maija",
						"lastName": "Haanpää",
						"creatorType": "author"
					},
					{
						"firstName": "Timo",
						"lastName": "Pohjolainen",
						"creatorType": "author"
					}
				],
				"date": "2024-08-30",
				"archive": "Työterveys ja kuntoutus",
				"archiveLocation": "004.003",
				"bookTitle": "Fysiatria",
				"callNumber": "fys00127",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/doi/fys00127",
				"attachments": [
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "dtk"
					},
					{
						"tag": "duodecim-translator"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.oppiportti.fi/oppikirjat/fys00127",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Kivun fysiologiaa",
				"creators": [
					{
						"firstName": "Maija",
						"lastName": "Haanpää",
						"creatorType": "author"
					},
					{
						"firstName": "Timo",
						"lastName": "Pohjolainen",
						"creatorType": "author"
					}
				],
				"date": "2024-08-30",
				"archive": "Oppiportti",
				"archiveLocation": "fys00127",
				"bookTitle": "Fysiatria",
				"callNumber": "fys00127",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.oppiportti.fi/fys00127",
				"attachments": [
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim"
					},
					{
						"tag": "duodecim-translator"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/dtk/oppi/avaa?p_artikkeli=fys00127",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Kivun fysiologiaa",
				"creators": [
					{
						"firstName": "Maija",
						"lastName": "Haanpää",
						"creatorType": "author"
					},
					{
						"firstName": "Timo",
						"lastName": "Pohjolainen",
						"creatorType": "author"
					}
				],
				"date": "2024-08-30",
				"archive": "Terveysportti",
				"archiveLocation": "fys00127",
				"bookTitle": "Fysiatria",
				"callNumber": "fys00127",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/dtk/oppi/avaa?p_artikkeli=fys00127",
				"attachments": [
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "dtk-legacy"
					},
					{
						"tag": "duodecim-translator"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.ebm-guidelines.com/apps/dtk/ebmg/article/ebm01103?toc=565604_bc",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Susceptibility to infections in adults",
				"creators": [
					{
						"firstName": "Timo",
						"lastName": "Hautala",
						"creatorType": "author"
					},
					{
						"firstName": "Mikko",
						"lastName": "Seppänen",
						"creatorType": "author"
					}
				],
				"date": "2022-03-04",
				"archive": "Evidence-Based Medicine Guidelines",
				"archiveLocation": "001.004",
				"bookTitle": "EBM Guidelines",
				"callNumber": "ebm01103",
				"language": "en",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.ebm-guidelines.com/apps/dtk/ebmg/article/ebm01103?toc=565604_bc",
				"attachments": [
					{
						"title": "Article snapshot",
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "dtk"
					},
					{
						"tag": "duodecim-translator"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/ebmg/article/ebm01103",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Susceptibility to infections in adults",
				"creators": [
					{
						"firstName": "Timo",
						"lastName": "Hautala",
						"creatorType": "author"
					},
					{
						"firstName": "Mikko",
						"lastName": "Seppänen",
						"creatorType": "author"
					}
				],
				"date": "2022-03-04",
				"archive": "Evidence-Based Medicine Guidelines",
				"archiveLocation": "001.004",
				"bookTitle": "EBM Guidelines",
				"callNumber": "ebm01103",
				"language": "en",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/apps/dtk/ebmg/article/ebm01103",
				"attachments": [
					{
						"title": "Article snapshot",
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "dtk"
					},
					{
						"tag": "duodecim-translator"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/ykt01870/search/ebm01103",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Aikuisen infektioalttius",
				"creators": [
					{
						"firstName": "Timo",
						"lastName": "Hautala",
						"creatorType": "author"
					},
					{
						"firstName": "Mikko",
						"lastName": "Seppänen",
						"creatorType": "author"
					}
				],
				"date": "2021-08-20",
				"abstractNote": "Vasta-ainepuutteisen potilaan tyypillisiä infektioita.",
				"archive": "Lääkärin tietokannat",
				"archiveLocation": "001.004",
				"bookTitle": "Lääkärin käsikirja",
				"callNumber": "ykt01870",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/doi/ykt01870",
				"attachments": [
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "dtk"
					},
					{
						"tag": "duodecim-translator"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/dtk/aho/avaa?p_artikkeli=tvh00004",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Ripuloivan potilaan hoito",
				"creators": [
					{
						"firstName": "Annika",
						"lastName": "Korpela",
						"creatorType": "author"
					},
					{
						"firstName": "Sanna",
						"lastName": "Nerjanto",
						"creatorType": "author"
					},
					{
						"firstName": "Heljä",
						"lastName": "Lundgrén-Laine",
						"creatorType": "author"
					}
				],
				"date": "2017-10-02",
				"archive": "Terveysportti",
				"archiveLocation": "tvh00004",
				"bookTitle": "Teho- ja valvontahoitotyön opas",
				"callNumber": "tvh00004",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/dtk/aho/avaa?p_artikkeli=tvh00004",
				"attachments": [
					{
						"title": "Tilannekuva artikkelista (article snapshot)",
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "dtk-legacy"
					},
					{
						"tag": "duodecim-translator"
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
						"tag": "duodecim"
					},
					{
						"tag": "duodecim-journal"
					},
					{
						"tag": "duodecim-translator"
					},
					{
						"tag": "englanti-duodecim-lehti"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/duo11158",
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
				"archive": "Lääkärin tietokannat",
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
				"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/duo11158",
				"volume": "129",
				"attachments": [
					{
						"title": "Linkki PDF-tiedostoon (terveysportti.fi)",
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
						"tag": "dtk"
					},
					{
						"tag": "dtk-journal"
					},
					{
						"tag": "duodecim-translator"
					},
					{
						"tag": "englanti-duodecim-lehti"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
