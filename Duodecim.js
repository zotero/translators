{
	"translatorID": "63ef6a3b-2e64-4d58-aedc-07b31a108928",
	"label": "Duodecim",
	"creator": "Shiyu Wang",
	"target": "^https?://(www\\.(terveysportti|terveyskirjasto|kaypahoito|oppiportti|duodecimlehti)\\.fi|www\\.ebm-guidelines\\.com)/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 200,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-08-10 11:21:12"
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

// Changelog commit msg: Readability; cleanup; SLL PDF fix; TODO

/**
 * ***** COMMENT TYPES *****
 * Some comments are categorized in the form <category>:? <comment text>
 *
 * // e.g.: followed by TDOIs OR a type of content.
 * - Some TDOIs require subscription and are not included in public testCases.
 * // Zotero.debug(): optional debug statements.
 * - Statements should begin with the member function name or the stages in scrape().
 * // <CAPS>: sections of code / one-off topic
 * // ZU: adoption of Zotero.Utilities library functions OR reason why a ZU is not used
 * // ZOTERO: automated/stock actions by Zotero connector/client
 * // CITATION: compliances with / deriviations from standard APA 7th edition
 * // FINNISH: concerning handling the Finnish language or Finland exclusives
 * // TYPE: usually CSS selectors for specific platform/content
 */

/**
 * ***** ABBREVIATIONS / KEY CONCEPTS *****
 * Duodecim: Finnish Medical Society Duodecim / Duodecim Publishing Company
 * - In this translator Duodecim refers to both.
 *
 * DTK: possibly Finnish *Duodecim TietoKanta*, 'Duodecim database'.
 *
 * `TDOI`: Duodecim uses URI.
 * - Most of such URIs may be accessed in Terveysportti
 * - Some of which in the form `https://www.terveysportti.fi/doi/<TDOI>`
 * - Plus, *tunnus* in Finnish means 'ID'
 * - hence 'T' in 'TDOI'.
 *
 * Unofficial abbreviations of Duodecim domains/platforms/content:
 * TP: terveysportti.fi, 'health portal', requires subscription
 * - LaTK: LääkeTietoKanta, 'medicinal database'
 * OP: oppiportti.fi, 'learning portal', requires subscription
 * TK: terveyskirjasto.fi, 'health library', free to public
 * KP: kaypahoito.fi, *Käypä hoito -suositus*, free to public
 * - official English name Current Care Guideline
 * - In this translator, 'CCG' refers to content hosted on KP, while
 * - KP refers to the domain name
 *
 * DLehti: Medical Journal Duodecim
 * SLL: *Suomen LääkäriLehti*, Finnish Medical Journal
 * YKT: *Lääkärin käsikirja*, 'Doctor's manual'
 * EBM/EBMG: Evidence-Based Medical Guidelines, English translations of YKT.
 *
 * See also comment block right before testCases.
 */

const tdoiURLRegex = /(?<=(\/|=))(?<TDOI>(?<prefix>(\w{3}|cd))\d{5,6})($|\/|\?)/i;
const capsRegex = /[A-ZÄ-Ö]/; // Finnish/Swedish U+00C4 – U+00D6 (ASCII 196–214);
const nimikkeetRegex = /(^\(?(Tt[KLM]|AMK|YAMK|LT)[()-]?.*|.*(lääkäri|asiantuntija|terapeutti|toimitus|tohtori)$)/i; // TODO statics; 260806 use array?

const journalISSN = {
	sll: '0039-5560, 2489-7434',
	yll: '1796-2889, 1796-2897',
	san: '0788-0227, 3087-6451',
	duo: '0012-7183, 2242-3281',
	hle: '0786-5686, 2954-2464',
	tul: '1459-4846, 2489-8775',
	sic: '1799-3903, 1799-3911',
	dos: '0783-4233, 2489-7302',
	vty: '0358-7304, 2737-2669',
	gtl: '0784-0039, 2489-494X',
	shl: '0355-4090, 2489-5008',
	apl: '2984-5351',
	ttl: '0780-2218',
	trh: '0356-1232'
}; // ZOTERO: Using comma `,` per Zotero forum discussion 9400

const journalAbbr = {
	duo: 'Duodecim',
	sll: 'Suom Lääkäril',
	shl: 'Suom Hammaslaakarilehti'
}; // for NLM styles using abbreviation

/**
 * Parse author names and remove Finnish-language titles
 * - `ZU.cleanAuthor()` won't split raw name strings properly.
 * - May not preserve abbreviated names or 'von', 'van', etc.
 * - Does not consider a mix of human names AND organization names
 *
 * @param {string} nameString
 * @param {boolean} [isSingleAuthor="false"]
 * @param {"author"|"contributor"|"bookAuthor"} [creatorRole="author"]
 * @returns {Array<Z.Creator<"author" | "contributor" | "bookAuthor">>} Parsed creator objects as item.creators
 */
function parseCreators(nameString, isSingleAuthor = false, creatorRole = 'author') {
	// TWO-LINE AUTHOR FIELD, e.g. nla00004
	if (/\n/.test(nameString)) nameString = nameString.split('\n')[1];

	// SINGLE-WORD, GROUP AUTHOR
	if (!/\s/.test(nameString)) {
		if (['Toimitus', 'Editors'].includes(nameString)) return []; // e.g. dlk00221, ykt00096, ebm00069
		return [{
			lastName: nameString,
			creatorType: creatorRole,
			fieldMode: 1 // cite: via other translators
		}];
	}

	// SINGLE, GROUP AUTHOR; does not consider mixes with human names, e.g. khp00020
	const ccgGroup = /(^Käypä hoito|.*työryhmä).*/i.test(nameString); // single group author for CCG
	if (ccgGroup || isSingleAuthor) return [{
		lastName: nameString,
		creatorType: ccgGroup ? 'bookAuthor' : creatorRole, // CITATION: APA citing CCG content: Long group author string
		fieldMode: 1 // CITATION: via other translators
	}];

	// HUMAN AUTHOR(s)
	let nameArray = [];
	const nameStringSplit = nameString.split(/\s?,\s*|\s+(ja|and)\s+/i);
	for (const seg of nameStringSplit) { // FINNISH: 'ja' means 'and'
		if (typeof seg !== 'string') continue;
		if (seg.toString().split(' ').length < 2) continue;

		const [nameToPush, isGroupAuthor] = ((str) => {
			let groupAuthorFlag = false;
			const words = str.toString().split(' ');
			let oneName = '';
			for (const word of words) {
				if (nimikkeetRegex.test(word)) {
					// Zotero.debug(`parseCreators(): Skipping author title "${word}" in name candidate "${str}"`);
					oneName = '';
					continue; // FINNISH: remove titles/degrees of authors.
				}
				if (capsRegex.test(word.charAt(0))
					&& !(capsRegex.test(word.slice(-1)))) {
					oneName += word + ' ';
					continue;
				}

				if (word === words[words.length - 1] // e.g. shk00004
					&& !(/[\W]/.test(word))) { // FINNISH: ending of some organization names
					oneName += word;
					groupAuthorFlag = true;
					continue;
				}
				else oneName = ''; // e.g. dlk00084
			}
			return [oneName.trim(), groupAuthorFlag];
		})(seg);

		if (isGroupAuthor
			&& seg !== nameStringSplit[nameStringSplit.length - 1]) continue; // e.g. dlk01420
		if (!nameToPush.length) continue;

		if (!isGroupAuthor) {
			const parts = nameToPush.split(/\s+/);
			if (parts.length > 1) nameArray.push({
				firstName: parts.slice(0, -1).join(' '), // TODY 260810 why?
				lastName: parts[parts.length - 1],
				creatorType: creatorRole,
			});
		}
		// previous author is group author; Exclude longer titles in human author
		else if ((nameArray.length && nameArray[nameArray.length - 1].fieldMode)
			|| !nameArray.length // e.g. dlk01420
			|| seg === nameString) { // e.g. shk00004
			nameArray.push({
				lastName: nameToPush,
				creatorType: creatorRole,
				fieldMode: 1
			});
		}
	}

	return nameArray;
}

/**
 * Streamlining `item.url` processing
 *
 * @param {URL} urlObj
 * @returns {Promise<string>} generated URL
 */
async function urlGen(urlObj) {
	const tdoi = tdoiURLRegex.exec(urlObj.pathname)?.groups?.TDOI;
	if (!tdoi) return urlObj.href;

	if (!['www.terveysportti.fi', 'www.ebm-guidelines.com']
		.includes(urlObj.hostname)) return urlObj.origin + '/' + tdoi;

	const tdoiURL = 'https://www.terveysportti.fi/doi/' + tdoi;
	const tdoiObj = new URL((await request(tdoiURL)).responseURL);
	// Zotero.debug(`TDOI redirection: responding URL: ${tdoiObj.href}`);

	if (!tdoiObj.href.includes(tdoiURL) // !404
		&& tdoiObj.hostname === urlObj.hostname // strict: redirection must return to original domain
		&& tdoiObj.pathname.includes(tdoi)) return tdoiURL; // async tdoiRedirect(tdoi, ogHost)

	if (tdoiURLRegex.test(urlObj.pathname)
		&& /^\/apps\/dtk/.test(urlObj.pathname)) {
		Zotero.debug('urlGen(): item on modern DTK, removing excess');
		return urlObj.href.split(tdoi)[0] + tdoi;
	}
	else if (!tdoiURLRegex.test(urlObj.search)) {
		Zotero.debug('urlGen(): no TDOI match, returning host + pathname');
		return `https://${urlObj.host}${urlObj.pathname}`;
	}

	return urlObj.href;
}

/**
 * Primarily for downloading PDF for *Lääkärilehti*.
 *
 * @param {string} [ePage = '/e48243'] a pathname to an article needing subscription.
 * @returns {Promise<boolean>} whether the network IP is a subscriber
 */
async function directAccess(ePage = '/e48243') {
	if (ePage.charAt(0) != '/') ePage = '/' + ePage;

	const sllResponse = await request(`https://www.laakarilehti.fi${ePage}`);
	Zotero.debug(`directAccess(): accessed ${ePage}\n> returned ${sllResponse.responseURL}\n> with status ${sllResponse.status}`);

	if (sllResponse.status != 200) return false; // path === '/404'
	if (sllResponse.headers['content-type'] === 'application/pdf') return true;

	// const sllBody = document.createElement('html'); ESLINT no-restricted-globals
	// sllBody.innerHTML = sllResponse.body;
	const parser = new DOMParser();
	const sllBody = parser.parseFromString(sllResponse.body, 'text/html');
	return !!sllBody?.querySelector('div.utils');
}

/**
 * Parse NLM journal bibliography format.
 *
 * @param {string} nlmString YYYY;volume(issue):pages
 * @returns {Object|undefined} date, volume, issue, page numbers
 */
function journalPage(nlmString) {
	return /(?<date>\d{4});(?<volume>.*?)\((?<issue>.*?)\):(?<pages>.*)/
		.exec(nlmString)?.groups;
}

/**
 * @param {string|null|undefined} raw
 * @returns {string|null}
 */
function normalizePublisher(raw) {
	if (!raw || typeof raw !== "string") return null;

	const publisherString = raw.replace(/[©\u00A9]/g, '').replace(/\(?\d{4}\)?/, '').trim();

	// CITATION: 'Duodecim Publishing Company' would be verbose in APA style.
	if (/(kustannus oy )?duodecim/i.test(publisherString)) return 'Duodecim';

	return publisherString;
}

/**
 * Inspired by `ZU.strToISO()` but forces dmy source format
 *
 * @param {string|Node} dmy is or contains a date in d.m.yyyy format
 * @returns {string|null} ISO date YYYY-MM-DD | null
 */
function dmyToISO(dmy) {
	// return ZU.strToISO(dmy.innerText); client Zotero.locale being US may mistake dmy for mdy.
	if (!dmy) return null;
	const dateText = ZU.trimInternal((typeof dmy === 'string') ? dmy : dmy.textContent);

	const date = /(?<day>\d{1,2})\W(?<month>\d{1,2})\W(?<year>\d{4}$)/.exec(dateText)?.groups;
	if (!date) return null;

	return `${date.year}-${ZU.lpad(date.month, '0', 2)}-${ZU.lpad(date.day, '0', 2)}`;
}

/**
 * Seeks date field in `d.m.yyyy` format and passes to `dmyToISO()`
 *
 * @param {Document} doc
 * @param {string} divSelector
 * @returns {string|null} strToISO() or ISO date string
 */
function lastDate(doc, divSelector) {
	const div = doc.querySelector(divSelector);
	if (!div) return null;

	return attr(doc, divSelector, 'datetime')
		|| dmyToISO(div.querySelectorAll('span')[1])
		|| dmyToISO(div.querySelectorAll('span')[0])
		|| dmyToISO(div.querySelector('var'))
		|| dmyToISO(div.childNodes[0])
		|| dmyToISO(div);
}

/**
 * Keep meaningful `\n`'s
 *
 * @param {string} raw
 * @returns {string}
 */
function returnProtect(raw) {
	let output = '';
	raw.split(/[\n\r]+/).forEach((lineCandidate) => {
		const toAppend = ZU.trimInternal(lineCandidate);
		if (!capsRegex.test(toAppend.charAt(0))) output = output.replace(/\n$/, ' ');
		output += toAppend + `\n`;
	});
	return output;
}

/**
 * scrape(): extracts DTK derivatives
 *
 * @param {Document} doc
 * @param {string} url
 * @param {string} type
 * @returns {Promise<Z.BookSectionItem|Z.JournalArticleItem>}
 */
async function scrape(doc, url, type) {
	const isJournal = type === 'journalArticle';
	const urlObj = new URL(url);

	const isTP = urlObj.host === 'www.terveysportti.fi';
	const isLaTK = /^\/apps\/laake\/.*/.test(urlObj.pathname);
	const isDTK = /^\/apps\/dtk\/.*/.test(urlObj.pathname);
	const isDTKLegacy = isTP && /\?p_artikkeli.*/.test(urlObj.search);
	const dtkMatch = urlObj.pathname.match(/(?<=^(\/apps)?\/dtk\/)\w+/);
	const dtk = dtkMatch ? dtkMatch[0] : null;
	
	const isOP = urlObj.host === 'www.oppiportti.fi' || dtk === 'oppi';
	const isDLehti = urlObj.host === 'www.duodecimlehti.fi';
	const isTK = urlObj.host === 'www.terveyskirjasto.fi';
	const isKP = urlObj.host === 'www.kaypahoito.fi';

	const item = new Zotero.Item(type);
	if (isDTK) item.tags.push('duodecim-dtk'); // ZOTERO: tags for easy debugging
	if (isDTKLegacy) item.tags.push('duodecim-dtk-legacy');

	let dClass = 'duo-'; // e.g. nla00004
	if ((isDTKLegacy || isDLehti || doc.querySelector('div.identity'))
		&& !doc.querySelector('div.duo-authors')) dClass = ''; // TYPE legacy/LaTK
	else if (isOP || isTK || doc.querySelector('div.d-updated')) dClass = 'd-';
	Zotero.debug(`scrape(): Determined selector prefix dClass: '${dClass}'`);

	const tdoi = text(`div.${dClass}identifier span`) // TYPE TK, legacy
		|| text(`span.${dClass}identifier`)
		|| url.match(tdoiURLRegex)?.groups.TDOI;
	if (tdoi) item.callNumber = tdoi;

	const prefix = tdoi?.match(/[a-z]+/)[0]
		|| url.match(tdoiURLRegex)?.groups.prefix;

	Zotero.debug(`scrape(): ${/^(\w{3}\d{5}|cd\d{6})$/.test(tdoi)
		? 'TDOI=' + tdoi
		: 'No valid TDOI in URL: ' + url}`);

	item.language = 'fi'; // CSL: ISO 639 set 1
	if (urlObj.hostname === 'www.ebm-guidelines.com'
		|| 'ebm cd dyn ccs'.split(' ').includes(prefix)) item.language = 'en';
	if (['khr', 'gvr'].includes(prefix)) item.language = 'sv'; // TODO statics

	item.date = lastDate(doc, 'div.date')
		|| lastDate(doc, isDTKLegacy ? 'div.duo-updated' : `div.${dClass}updated`)
		|| undefined; // Jounal items are handled by journalPage()

	var authorClass = `div.${dClass}authors`;
	if (doc.querySelector('div.duo-authors-link')) authorClass = 'div.duo-authors-link'; // e.g. ykt, ebm
	if (isDLehti) authorClass = 'div.dl-article-editors-container';

	const twoLineAuthor = doc.querySelector(authorClass)?.querySelector('br');
	const authorsRaw = ZU.trimInternal(twoLineAuthor
		? doc.querySelector(authorClass).innerHTML.split('<br>')[1]
		: innerText(authorClass)); // SCAFFOLD vs browser, e.g. voh00078

	const singleAuthor = ['lab'].includes(prefix); // TODO statics
	if (authorsRaw) item.creators = parseCreators(authorsRaw, singleAuthor);

	if (!item.creators.length || !isJournal) {
		const footerSelector = dClass === ''
			? 'div#footer'
			: `.${dClass}article-footer`;
		var contributorsRaw = '';
		const footerDivs = doc.querySelector(footerSelector)?.querySelectorAll('div');
		if (footerDivs) for (const divCandidate of footerDivs) {
			if (divCandidate.classList.value.includes('retired')) {
				contributorsRaw += ZU.trimInternal(divCandidate.innerText) + ', ';
				break;
			}
			// rarer field only in legacy DTK, e.g. shk02235
			if (divCandidate.classList.value.includes('referees')) {
				contributorsRaw += ZU.trimInternal(divCandidate.innerText) + ', ';
			}
		}
		if (contributorsRaw.length) {
			item.creators.push(...parseCreators(contributorsRaw, singleAuthor, 'contributor'));
		}
	}

	item.title = ZU.trimInternal(text('h1')); // e.g. hot00013
	if (/: /.test(item.title)) {
		item.shortTitle = item.title.split(': ')[0];
		Zotero.debug(`scrape(): shortTitle: ${item.shortTitle}`);
		if (['Tietoa potilaalle', 'Potilasohje'].includes(item.shortTitle)) { // TODO statics
			item.shortTitle = item.title.split(': ')[1];

			if (item.shortTitle === 'Tietoa potilaalle') {
				item.title = item.shortTitle;
			}
		}
	}
	else if (/\s+[-–]\s+/.test(item.title)) {
		item.shortTitle = item.title.split(/\s+[-–]\s+/)[0];
		Zotero.debug(`scrape(): shortTitle: ${item.shortTitle}`);
	}
	// FINNISH: colon (:) in Finnish is also for declining acronyms.
	// > ZOTERO may automatically generate a wrong short title by splitting ':'.

	const bookNameText = text(`div.${dClass}database`)
		|| (isDLehti ? 'Lääketieteellinen Aikakauskirja Duodecim' : null);
	if (bookNameText && prefix != 'hoi' && !isJournal) item.bookTitle = bookNameText;
	if (isKP && ['nix', 'nak'].includes(prefix)) {
		item.bookTitle += `: ${innerText('div.additional-links.kh-noprint a')}`;
	}

	const archive = (() => {
		if (prefix === 'hoi') return 'Käypä hoito -suositus';
		if (isKP) return 'Käypä hoito';
		if (isDTK) return text('ul li.nav-item a.nav-link');
		if (isLaTK) return 'Lääketietokanta';
		if (isOP) return 'Oppiportti';
		if (isTK) return 'Terveyskirjasto';
		return undefined;
	})();
	if (archive && (archive !== item.bookTitle)) item.archive = archive;
	else if (isTP) item.archive = 'Terveysportti';

	const sortKeyText = text(`.${dClass}sortkey`) || text(`div.d-identifier`); // footer text in parentheses after TDOI
	const sortKeyMatch = sortKeyText?.match(/(?<=\().*(?=\))/);
	if (sortKeyMatch) item.archiveLocation = sortKeyMatch[0];
	else if (isDTKLegacy || dClass === '') item.archiveLocation = sortKeyText;
	if (!item.archiveLocation
		|| item.archiveLocation === '000.000') item.archiveLocation = tdoi;

	const copyrightRaw = text(`div.${dClass}copyrights`) || text(`div.${dClass}copyright`);
	if (isDLehti || isOP || isKP) item.publisher = 'Duodecim';
	else if (copyrightRaw) item.publisher = normalizePublisher(copyrightRaw);

	if (item.creators?.length
		&& item.creators[0].lastName === item.publisher) item.publisher = undefined; // e.g. shk00004

	let pdfLinks = [];
	const linkSelector = `${dClass === 'duo-' ? 'div.duo-body' : 'article'}`
		+ ` a.${dClass}anchor:not(.${dClass}article):not(.${dClass}anchor-article)`
		+ `:not(.${dClass}reference):not(.${dClass}references a):not(.refs a)`; // citation; bibliography list
	doc.querySelectorAll(linkSelector)?.forEach((aLink) => {
		const linkObj = new URL(aLink);
		
		// Zotero.debug(`scrape() PDF: on link candidate ${aLink}, link path ${linkObj.pathname}`);
		if (/(external|extra|internet)$/.test(aLink.classList.value) // internet: SLL PDF
			&& /\.pdf$/.test(linkObj.pathname)
			&& !pdfLinks.includes(aLink.href)) pdfLinks.push(aLink.href);
	});

	for (const pdfLink of pdfLinks) Zotero.debug(`scrape(): found PDF link: \n${pdfLink}`);

	if (pdfLinks?.length && prefix !== 'sll') for (const pdfLink of pdfLinks) {
		if (!pdfLink.includes(urlObj.host)) continue;

		Zotero.debug(`scrape(): analyzing PDF candidate ${pdfLink}`);
		const pdfFileName = pdfLink.match(/[^/]*$/)[0];

		const pdfTDOImatch = pdfFileName.match(new RegExp(`${tdoi}\\w*?\\.`, 'i'));
		const pdfTDOI = pdfTDOImatch ? pdfTDOImatch[0] : null;

		const isMainPDF = pdfTDOI && pdfTDOI.startsWith(tdoi);

		const pdfSuffixMatch = pdfFileName.match(/[a-z]+(?=\.pdf$)/);
		const pdfSuffix = pdfSuffixMatch ? pdfSuffixMatch[0] : null;

		let attachmentTitle = "Supplementary PDF";
		if (isMainPDF && pdfSuffix
			&& pdfSuffix === 'sv') attachmentTitle = "På svenska";
		if (isMainPDF && !pdfSuffix) attachmentTitle = 'PDF';

		// Zotero.debug(`scrape(): Pushing PDF ${pdfFileName} with ${pdfTDOI ? 'TDOI=' + pdfTDOI : ''}`
		//	+ ` ${pdfSuffix ? "and suffix '" + pdfSuffix + "'" : ''} as ${(isMainPDF && !pdfSuffix) ? 'main' : 'supplementary'} PDF attachment`);
		const asFile = pdfTDOI?.startsWith(tdoi) || pdfLinks.length === 1; // e.g. dlk00221 || hoi50067, nla00004
		const pdfToPush = {
			url: pdfLink,
			title: attachmentTitle,
			mimeType: asFile ? "application/pdf" : "text/html" // TODO 260810 verify as link instead of file
		};
		if (!asFile) pdfToPush.snapshot = false; // TODO live test, necessary?
		item.attachments.push(pdfToPush);
	}

	var englishSummary = '';
	if (isJournal) { // PARSING JOURNALS
		item.publicationTitle = bookNameText;
		var pageSelector = `div.${dClass}meta_journal`;
		if (isDLehti) pageSelector = 'div.dl-article-bibliographic';
		if (isDTKLegacy) pageSelector = 'div.date';

		const journalMetadata = journalPage(innerText(pageSelector)) || undefined;
		if (typeof journalMetadata === 'object') Object.assign(item, journalMetadata);

		var genreClass = `div.${dClass}genre`;
		if (isDLehti) genreClass = 'div.dl-article-section-title';
		if (isDTKLegacy) genreClass = 'div.duo-genre';
		item.section = ZU.trimInternal(text(genreClass));

		item.ISSN = journalISSN[prefix];
		item.journalAbbreviation = journalAbbr[prefix];

		const h2s = doc.querySelectorAll('h2');
		if (prefix === 'duo') {
			if (h2s?.length) {
				const englishInTitle = /English summary/i.test(h2s[0].innerText);
				if (englishInTitle || h2s[0].nextElementSibling?.childNodes[0]?.tagName === 'EM') {
					const englishTitleRegex = new RegExp(`${englishInTitle
						? '(?<=English summary: )'
						: ''}.*`, 'm'); // e.g. duo99748; duo14888, duo13519, duo14124

					const englishTitleMatch = ZU.trimInternal(innerText('h2'))?.match(englishTitleRegex);
					if (englishTitleMatch) item.title += ` [${englishTitleMatch[0]}]`;
					englishSummary = `${ZU.trimInternal(innerText('em', 1))}`;
				}
			}

			if (!item.title.includes(']')) {
				const ems = doc.querySelectorAll('p em');
				if (ems?.length) for (const p of ems) if (/^English summary: .*/i.test(p.innerText)) { // e.g. duo11158
					item.title += ` [${p.innerText.match(/(?<=English summary: ).*/)[0]}]`;
					englishSummary = `${p.parentNode.nextElementSibling.innerText}`;
					break;
				}
			}

			if (item.title.includes(']')) item.tags.push('duodecim-englanti-Dlehti');
			if (!isDLehti) item.archiveLocation = tdoi;
			item.attachments.push({
				url: `https://${urlObj.host}/xmedia/duo/${tdoi}.pdf`,
				title: "PDF",
				mimeType: "application/pdf",
			});
		}

		if (prefix === 'sll') {
			if (h2s?.length) for (const h2 of h2s) if ((/^English summary: .*/i).test(h2.innerText)) {
				// item.title += ` [${h2.innerText.match(/(?<=English summary: ).*$/i)[0]}]`;
				// englishSummary = `${ZU.trimInternal(h2.nextElementSibling.innerText).replace(/[\xA0\n\s]+/g, " ")}`;
				item.title += ` [${ZU.trimInternal(h2.innerText.replace('English summary: ', ''))}]`;
				englishSummary = ZU.trimInternal(h2.nextElementSibling.innerText);
				item.tags.push('duodecim-englanti-lääkärilehti');
				break;
			}

			let sllPDFPath;
			if (pdfLinks.length && pdfLinks[0].includes('/laakarilehti/')) {
				sllPDFPath = pdfLinks[0].replace(/.*laakarilehti/, '');
			}
			else if (journalMetadata) { // usually for LTK-hosted articles before 2011.
				Zotero.debug(`scrape() SLL: constructing link to PDF`);
				let issueSeg = item.issue.match(/^\d+/)[0];
				if (item.date > 2021) issueSeg = item.issue + '-'; // rare.

				let pdfBase = `/pdf/${item.date}/SLL${issueSeg}${item.date}-${item.pages.match(/^\d+/)[0]}.pdf`;
				if (await directAccess(pdfBase)) sllPDFPath = pdfBase;
			}
			if (sllPDFPath) {
				const directDL = await directAccess();

				const pdfToPush = {
					// In LTK, the SLL PDF link requires a Fimnet credential for a doctor, medical student, or pharmacist, etc.
					url: 'https://www.laakarilehti.fi' + sllPDFPath,
					title: directDL ? "PDF" : "Linkki PDF-tiedostoon (laakarilehti.fi)",
					mimeType: directDL ? "application/pdf" : "text/html",
				};
				if (!directDL) pdfToPush.snapshot = false;
				item.attachments.push(pdfToPush);
			}
		}
	}

	// PARSING ABSTRACT
	const abstractSelectors = [
		'section[role="main"] aside', // TK
		`div.${dClass}aside`,
		'header p', // e.g. uux30190
		`.${dClass}section .${dClass}header`,
		'section[role="main"] > section > p', // TK
		`.${dClass}section > p > em`, // e.g. duo11158
		`div.${dClass}body > div.${dClass}section > ul:first-child`, // e.g. shk02235
		`.${dClass}section > p:nth-child(1)`
	];

	const abstractElement = ((selectors) => {
		for (const sel of selectors) {
			const elementCandidate = doc.querySelector(sel);
			if (elementCandidate) {
				Zotero.debug(`scrape() ABSTRACT: querySelector is ${sel}`);
				return elementCandidate;
			}
		}

		if (['Keskeistä', 'Essentials', 'Johdanto'].includes(innerText(`div.${dClass}body h2`))) { // TODO statics
			return doc.querySelector(`div.${dClass}body h2`).nextElementSibling;
		}

		return null;
	})(abstractSelectors);

	if (abstractElement) {
		abstractElement.querySelectorAll('a span')?.forEach(linkSpan => linkSpan.remove()); // TODO 260728 lossless?
		item.abstractNote = ['P', 'EM'].includes(abstractElement.tagName)
			? ZU.trimInternal(abstractElement.innerText) // e.g. duo11158
			: returnProtect(abstractElement.innerText); // e.g. voh00078
		if (item.abstractNote.split(' ').length < 10) item.abstractNote = undefined;
		else if (englishSummary?.length) {
			item.abstractNote += `\n\n${ZU.trimInternal(englishSummary)}`;
		}
	}

	// Zotero.debug(`scrape(): item.shortTitle before return: ${item.shortTitle}`);
	return item;
}

async function scrapeDict(doc, url) {
	const item = new Zotero.Item('dictionaryEntry');
	item.language = 'fi';
	item.publisher = 'Duodecim';

	if (/^https:\/\/www\.terveyskirjasto\.fi\/ltt\d{5}(\D*|\/.*)?$/.test(url)
		&& text('h1')) {
		item.archive = 'Terveyskirjasto';

		item.title = text('h1');
		item.date = dmyToISO(text('div.d-updated'));
		item.publicationTitle = text('div.d-database');
		const authorsRaw = text('div.d-authors');
		if (authorsRaw?.length && item.publicationTitle !== authorsRaw) {
			item.creators = parseCreators(authorsRaw);
		}

		item.abstractNote = ZU.trimInternal(text('section[role="main"] aside p'));
	}
	else {
		const searchKeyword = url.match(/(?<=\/apps\/sanakirjat\/\d+\/).*/);
		if (searchKeyword) {
			item.archive = 'Termit ja sanakirjat';

			const firstResultAsTitle = doc.querySelectorAll('span.d-k')?.length === 1
				|| (!doc.querySelector('div.hit span.d-k') && searchKeyword[0] === text('span.d-k'));
			item.title = firstResultAsTitle ? text('span.d-k') : searchKeyword[0];
			item.dictionaryTitle = text('h2');
			if (/^\w{3}\d{5}$/.test(searchKeyword[0])) item.callNumber = searchKeyword[0]; // TDOI
			else item.url = url;

			const dateMatch = text('div.duodecim-footer-copyright div')?.match(/\d+/);
			if (dateMatch) item.date = dateMatch[0];
		}
	}

	return item.title ? item : null;
}

const labelLookup = {
	a: 'Kolmiolääke', // Voi haitata suorituskyky\xe4 liikenteess\xe4
	b: 'Biologinen lääke',
	bs: 'Biosimilaari',
	e: 'Erityislupavalmiste',
	ex: 'Ex tempore -valmiste',
	expensive: 'Kallis lääke', // not in h2, innerText === "€" \u20ac
	h: 'Huumeresepti',
	i: 'Itsehoitovalmiste',
	ka: 'Koneellisessa annosjakelussa',
	me: 'Määräaikainen erityislupa',
	pkv: 'pkv',
	'pkv-pa': 'pkv-pa',
	'pkv-z': 'pkv-z',
	'pkv-za': 'pkv-za',
	r: 'Reseptivalmiste',
	R: 'Suuren riskin lääke',
	u: "Uusi lääkevalmiste"
};

async function scrapeDrug(doc, url) {
	const item = new Zotero.Item('bookSection');

	const urlObj = new URL(url);
	const browseOrQuery = /(?<=apps\/laake\/)(selaus|haku)(?=\/)/.exec(urlObj.pathname)[0];
	Zotero.debug(`scrapeDrug(): now on ${browseOrQuery}`);
	const tab = /(?<=\/)(spc\/)?\w+$/.exec(urlObj?.pathname)[0];
	const drugIDRegex = new RegExp(`(?<=/)[^\\/]+(?=/${tab}$)`);

	if (tab) item.archiveLocation = decodeURIComponent(drugIDRegex.exec(urlObj.pathname)[0]);

	Zotero.debug(`scrapeDrug(): now on\n> drugID ${item.archiveLocation}\n> tab '${tab}'`);

	const title = doc.querySelector('h2#articleHeaderText');
	title.querySelectorAll("span a[class*='lk-']")?.forEach((label) => {
		const labelClass = /(?<=lk-)[\S]*?$/.exec(label.classList.value)[0];
		if (labelClass.includes('pkv-')) item.tags.push('pkv');
		item.tags.push(labelLookup[labelClass]);
	});

	item.title = ZU.trimInternal(title.childNodes[0].textContent);
	item.url = url;
	item.publisher = 'Duodecim';
	item.archive = 'Lääketietokanta';
	item.shortTitle = /^[A-ZÄ-Ö ]+/.exec(item.title)[0] || undefined; // brand name
	item.language = /\/spc\/sv$/.test(urlObj?.pathname) ? 'sv' : "fi";

	const rightHeaders = doc.querySelectorAll("#appContent div.section-header");
	if (rightHeaders) for (const header of rightHeaders) {
		if (header.innerText.includes('Potilaan lääkeopas')) {
			header.parentElement.querySelectorAll('a')?.forEach(dloLink => item.attachments.push({
				url: dloLink.href,
				title: 'Potilaan lääkeopas: ' + dloLink.innerText,
				snapshot: false,
				mimeType: "text/html"
			}));
			break;
		}
	}

	if (tab === "start") {
		const substancesSplit = text('section.substances')?.split(': ');
		if (substancesSplit?.length > 1) item.activeIngredients = substancesSplit[1];
		const atcElement = doc.querySelector("section.classification")?.previousElementSibling?.querySelector('p');
		if (atcElement) item.ATC = atcElement.innerText;
		const h2s = doc.querySelectorAll('app-start-page h2');
		if (!item.ATC) for (const h2 of h2s) {
			if (/^ATC/.test(h2.innerText)) {
				item.ATC = h2.nextElementSibling.innerText;
				break;
			}
		}

		doc.querySelectorAll("app-package-list span[class*='lk-']")?.forEach((label) => {
			const classToTag = /(?<=lk-)[\S]*?$/.exec(label.classList.value);
			if (classToTag?.length) {
				const tagToPush = labelLookup[classToTag[0]];
				if (tagToPush) item.tags.push(tagToPush);
			}
		});

		const articleSections = doc.querySelectorAll('section.article > section:nth-child(1) > div.spc-section');
		if (articleSections?.length) {
			const lastArticleSection = articleSections[articleSections.length - 1];
			item.date = dmyToISO(lastArticleSection.querySelector('p')); // user needs to reveal by clicking
		}
	}

	if (tab.includes("spc/")) {
		const h2s = doc.querySelectorAll('h2');
		if (h2s) {
			item.date = dmyToISO(h2s[h2s.length - 1].nextElementSibling);
			for (const h2 of h2s) if (/^ATC/.test(h2.innerText)) {
				item.ATC = h2.nextElementSibling.innerText;
				break;
			}
		}
	}

	if (tab === "classification") item.ATC = doc.querySelector('p')?.innerText;

	// Zotero.debug(`scrapeDrug() tags: ${JSON.stringify(item.tags)}`);
	return item;
}

async function detectWeb(doc, url) {
	if (/^https:\/\/www.terveysportti.fi\/apps\/sanakirjat\/\d+\/.*/.test(url)
		&& doc.querySelector('h2')) return 'dictionaryEntry';
	if (/^https:\/\/www.terveyskirjasto.fi\/ltt\d{5}(\D*|\/.*)?$/.test(url)
		&& doc.querySelector('h1')) return 'dictionaryEntry';

	const tdoiPrefix = url.match(tdoiURLRegex)?.groups.prefix;

	if (doc.querySelector('.duo-meta_journal') // DTK
		|| doc.querySelector('.dl-article-bibliographic') // duodecimlehti.fi
		|| (Object.keys(journalISSN).includes(tdoiPrefix)
			&& tdoiPrefix != 'duo')
		|| journalPage(text('div.date'))) /* legacy DTK */ return 'journalArticle';

	if (doc.querySelector(`h1`) && tdoiURLRegex.test(url)) return 'bookSection';
	else if (doc.querySelector(`h2#articleHeaderText`)
		&& /\/apps\/laake\/(selaus|haku)\/.*/.test(url)) return 'bookSection';

	return false;
}

async function doWeb(doc, url) {
	const type = await detectWeb(doc, url);

	let item;
	if (/^https:\/\/www.terveysportti.fi\/apps\/laake\/.*/.test(url)
		&& doc.querySelector('app-tab-bar app-article-header h2#articleHeaderText')
		&& !doc.querySelector('h1:not(app-spc h1)')) item = await scrapeDrug(doc, url);

	if (type === 'dictionaryEntry') item = await scrapeDict(doc, url);

	if (!item && type) item = await scrape(doc, url, type);

	if (item) {
		if (!item.url) item.url = await urlGen(new URL(url));
		item.attachments.push({ document: doc, snapshot: true });
		item.complete();
	}
}

/**
 * A NOTE ON TEST CASES
 * For Zotero's automated checks, I kept only publicly available test cases. One free TP item is included as the last test case.
 * Proceed with testing under a network with TP/OP subscription TODO or log in first in Scaffold's browser.
 *
 * I built this translator with APA citation style in mind.
 * Feel free to test other formats, especially NLM-Vancouver-based formats and their Finnish variants
 * such as `styles/dependent/Suomen Laakarilehti.csl` (also part of Zotero Style Repository).
 */

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.terveyskirjasto.fi/ltt01270/icd",
		"items": [
			{
				"itemType": "dictionaryEntry",
				"title": "ICD",
				"creators": [],
				"date": "2016-10-18",
				"abstractNote": "International Classification of Diseases, kansainvälinen tautiluokitus; Maailman terveysjärjestön (WHO:n) julkaisemia kansainvälisiä tautiluokituksia, esim. ICD-10",
				"archive": "Terveyskirjasto",
				"dictionaryTitle": "Lääketieteen sanasto",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveyskirjasto.fi/ltt01270",
				"attachments": [
					{
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
		"url": "https://www.terveyskirjasto.fi/dlk00221",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Huimaus",
				"creators": [
					{
						"firstName": "Osmo",
						"lastName": "Saarelma",
						"creatorType": "contributor"
					}
				],
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
						"title": "Supplementary PDF",
						"mimeType": "application/pdf"
					},
					{
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
					},
					{
						"firstName": "Markku",
						"lastName": "Ellonen",
						"creatorType": "contributor"
					},
					{
						"firstName": "Pertti",
						"lastName": "Mustajoki",
						"creatorType": "contributor"
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
		"url": "https://www.terveyskirjasto.fi/dlk01420",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Maitovalmisteet ja kasvipohjaiset maitovalmisteiden tyyppiset tuotteet",
				"creators": [
					{
						"firstName": "Ursula",
						"lastName": "Schwab",
						"creatorType": "author"
					}
				],
				"date": "2025-05-14",
				"abstractNote": "Keskeistä\nMaitovalmisteet ovat erinomaisia proteiinin, kalsiumin ja jodin lähteitä.\nMaitovalmisteiden rasva on kovaa, joten niistä on hyvä suosia rasvattomia ja vähärasvaisia vaihtoehtoja.\nKasvipohjaisista tuotteista suositellaan kalsiumilla, D-vitamiinilla ja jodilla täydennettyjä tuotteita.",
				"archive": "Terveyskirjasto",
				"archiveLocation": "dlk01420",
				"bookTitle": "Lääkärikirja Duodecim",
				"callNumber": "dlk01420",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveyskirjasto.fi/dlk01420",
				"attachments": [
					{
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
		"url": "https://www.kaypahoito.fi/hoi50138",
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
				"archive": "Käypä hoito -suositus",
				"archiveLocation": "050.138",
				"callNumber": "hoi50138",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.kaypahoito.fi/hoi50138",
				"attachments": [
					{
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
				"archive": "Käypä hoito -suositus",
				"archiveLocation": "050.067",
				"callNumber": "hoi50067",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.kaypahoito.fi/hoi50067",
				"attachments": [
					{
						"title": "Supplementary PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Supplementary PDF",
						"mimeType": "text/html",
						"snapshot": false
					},
					{
						"title": "Supplementary PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Supplementary PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Supplementary PDF",
						"mimeType": "application/pdf"
					},
					{
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
		"url": "https://www.kaypahoito.fi/nak06071",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Monityydyttymättömät rasvahapot lasten ja nuorten ADHD:n hoidossa",
				"creators": [
					{
						"firstName": "Hertta",
						"lastName": "Ollikainen",
						"creatorType": "author"
					}
				],
				"date": "2025-05-19",
				"archive": "Käypä hoito",
				"archiveLocation": "050.061",
				"bookTitle": "Näytönastekatsaukset: ADHD (aktiivisuuden ja tarkkaavuuden häiriö)",
				"callNumber": "nak06071",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"shortTitle": "Monityydyttymättömät rasvahapot lasten ja nuorten ADHD",
				"url": "https://www.kaypahoito.fi/nak06071",
				"attachments": [
					{
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
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
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
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
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
		"url": "https://www.duodecimlehti.fi/duo13519",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Akuutin mesenteriaali-iskemian hoitomahdollisuudet parantuneet [Treatment options for acute mesenteric ischemia have improved]",
				"creators": [
					{
						"firstName": "Jussi M.",
						"lastName": "Kärkkäinen",
						"creatorType": "author"
					},
					{
						"firstName": "Hannu",
						"lastName": "Manninen",
						"creatorType": "author"
					},
					{
						"firstName": "Hannu",
						"lastName": "Paajanen",
						"creatorType": "author"
					}
				],
				"date": "2017",
				"ISSN": "0012-7183, 2242-3281",
				"abstractNote": "Suolilievevaltimon tukoksesta johtuva akuutti mesenteriaali-iskemia on hengenvaarallinen sydän- ja verisuonisairauksien komplikaatio, jonka oireet vaihtelevat äkillisesti alkaneesta vatsakivusta useita vuorokausia kestäviin epämääräisiin oireisiin. Varjoainetehosteinen tietokonetomografia (TT) on erinomainen diagnostinen tutkimus, mutta taudin toteaminen ajoissa ennen pysyvän suolivaurion kehittymistä on silti vaikeaa. Noin kolmasosalla potilaista iskemialle tyypilliset löydökset puuttuvat kuvantamishetkellä. Tällöinkin TT:llä voidaan usein tunnistaa epäsuoria viitteitä taudin iskeemisestä taustasta. Löydösten tulkinta vaatii päivystävän radiologin ja kliinikon yhteistyötä viiveiden välttämiseksi. Hoidon tavoitteena on nopea suoliston verenkierron palauttaminen, ja erityisesti endovaskulaarinen hoito on osoittautunut tässä tehokkaaksi. Myös krooninen mesenteriaali-iskemia on vakava sairaus, joka vaatii kiireellistä tunnistamista ja hoitoa palautumattoman suoli-iskemian ehkäisemiseksi.\n\nAcute mesenteric ischemia resulting from mesenteric arterial thrombosis is a life-threatening cardiovascular complication with symptoms ranging from sudden-onset abdominal pain to vague symptoms of several days' duration. Although contrast-enhanced computed tomography is an excellent diagnostic tool, detection of the disease before the development of permanent intestinal injury is still difficult. Endovascular treatment is usually successful in restoring intestinal blood flow acutely. Chronic mesenteric ischemia requires urgent detection and therapy in order to prevent irreversible intestinal ischemia.",
				"archiveLocation": "duo13519",
				"callNumber": "duo13519",
				"issue": "2",
				"journalAbbreviation": "Duodecim",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"pages": "150-8",
				"publicationTitle": "Lääketieteellinen Aikakauskirja Duodecim",
				"publisher": "Duodecim",
				"section": "Katsaus",
				"url": "https://www.duodecimlehti.fi/duo13519",
				"volume": "133",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
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
		"url": "https://www.duodecimlehti.fi/duo14888",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Aivo-selkäydinnestenäytteen ottaminen ja siihen liittyvät komplikaatiot [Lumbar puncture and related complications]",
				"creators": [
					{
						"firstName": "Sari",
						"lastName": "Atula",
						"creatorType": "author"
					},
					{
						"firstName": "Anne",
						"lastName": "Pesonen",
						"creatorType": "author"
					},
					{
						"firstName": "Markus",
						"lastName": "Färkkilä",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"ISSN": "0012-7183, 2242-3281",
				"abstractNote": "Aivo-selkäydinnestenäytettä käytetään neurologisessa päivystys- ja kiireettömässä diagnostiikassa muun muassa epäiltäessä tulehdustiloja tai keskushermoston akuuttia tai kroonista infektiota sekä lukinkalvon alaisen verenvuodon poissulkemiseen. Ennen lannepistoa tehdään tarvittavat muutokset veren hyytymiseen vaikuttavaan lääkitykseen ja suljetaan pois kohonneen aivopaineen mahdollisuus. Lannepiston onnistumisessa tärkeintä on potilaan huolellinen asettelu oikeaan asentoon toimenpidettä varten sekä riittävän informaation antaminen. Toimenpide on oikein tehtynä hyvin turvallinen. Yleisin jälkikomplikaatio on pystyasennossa tuntuva kova päänsärky, jota hoidetaan ensisijaisesti vuodelevolla, runsaalla juomisella ja särkylääkkeillä. Mikäli postspinaalipäänsärky jatkuu, päivystyspoliklinikassa annetaan suonensisäinen nestehoito ja kofeiinitiputus, ja mikäli nämäkään eivät auta, anestesialääkäri voi tehdä heräämössä veripaikan. Muut toimenpiteeseen liittyvät komplikaatiot ovat hyvin harvinaisia.\n\nLumbar punctures are performed for diagnosing infections and inflammatory diseases of the central nervous system and excluding subarachnoid hemorrhage. Antithrombotic and anticoagulative medication is assessed beforehand, the necessary interruptions for medication are made and increased intracranial pressure is excluded. The most important things for the successful procedure are optimal posturing and good information of the patient. The procedure is very safe when done properly. The most common complication afterwards is postdural puncture headache. It is first treated with bed rest and painkillers, followed by intravenous fluid therapy and caffeine infusion in the hospital, or blood patching in the most severe cases.",
				"archiveLocation": "duo14888",
				"callNumber": "duo14888",
				"issue": "8",
				"journalAbbreviation": "Duodecim",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"pages": "772-80",
				"publicationTitle": "Lääketieteellinen Aikakauskirja Duodecim",
				"publisher": "Duodecim",
				"section": "Näin hoidan",
				"url": "https://www.duodecimlehti.fi/duo14888",
				"volume": "135",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
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
				"url": "https://www.duodecimlehti.fi/duo95136",
				"volume": "121",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
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
		"url": "https://www.terveysportti.fi/dtk/nko/avaa?p_artikkeli=nla00004",
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
				"archive": "Terveysportti",
				"archiveLocation": "400.005",
				"bookTitle": "Äitiys- ja lastenneuvola",
				"callNumber": "nla00004",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Terveyden ja hyvinvoinnin laitos",
				"url": "https://www.terveysportti.fi/dtk/nko/avaa?p_artikkeli=nla00004",
				"attachments": [
					{
						"title": "På svenska",
						"mimeType": "application/pdf"
					},
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk-legacy"
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
						"lastName": "Suomen Sairaanhoitajat ry",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2023-04-19",
				"archive": "Hoitotyön tietokanta",
				"archiveLocation": "001.004",
				"bookTitle": "Sairaanhoitajan käsikirja",
				"callNumber": "shk00004",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"shortTitle": "PEWS",
				"url": "https://www.terveysportti.fi/doi/shk00004",
				"attachments": [
					{
						"title": "Supplementary PDF",
						"mimeType": "application/pdf"
					},
					{
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
		"url": "https://www.terveysportti.fi/dtk/shk/avaa?p_artikkeli=shk00004",
		"items": [
			{
				"itemType": "bookSection",
				"title": "PEWS – Lasten aikaisen varoituksen pisteytysjärjestelmä",
				"creators": [
					{
						"lastName": "Suomen Sairaanhoitajat ry",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2023-04-19",
				"archive": "Terveysportti",
				"archiveLocation": "001.004",
				"bookTitle": "Sairaanhoitajan käsikirja",
				"callNumber": "shk00004",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"shortTitle": "PEWS",
				"url": "https://www.terveysportti.fi/dtk/shk/avaa?p_artikkeli=shk00004",
				"attachments": [
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk-legacy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
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
					},
					{
						"firstName": "Anne",
						"lastName": "Larkko",
						"creatorType": "contributor"
					},
					{
						"firstName": "Niina",
						"lastName": "Poikonen",
						"creatorType": "contributor"
					},
					{
						"firstName": "Marjatta",
						"lastName": "Jokinen",
						"creatorType": "contributor"
					},
					{
						"firstName": "Seija",
						"lastName": "Kärkinen",
						"creatorType": "contributor"
					}
				],
				"date": "2025-04-15",
				"abstractNote": "Nuha, yskä, kuume ja kurkkukipu ovat tavallisimmat oireet viruksen aiheuttamasta hengitystieinfektiosta, joka paranee ilman mikrobilääkehoitoa noin kahdessa viikossa.\nFlunssan aiheuttavat yleisimmin rinovirukset, A- ja B-virukset, RS-virukset, koronavirukset, parainfluenssavirukset ja adenovirukset.\nFlunssa on hyvin yleinen vaiva. Aikuisilla esiintyy tyypillisesti noin 2–4 flunssaa vuodessa.\nTutkimusten mukaan vilustuminen ei vaikuta flunssan kehittymiseen.\nFlunssan itämisaika on yleensä 24–72 tuntia.\nKuumeeton voi ulkoilla ja työskennellä välttäen kuitenkin kovaa fyysistä rasitusta.\nSairausloman tarve on 2–3 päivää, jos kuumetta ei ole. Influenssassa sairaanhoitaja voi yleensä kirjoittaa 5 päivää. Korona luokitellaan virusinfektioksi: sairauslomaa suositellaan, kunnes oireet alkavat helpottaa (yleensä 3–5 päivää).",
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
		"url": "https://www.terveysportti.fi/dtk/shk/avaa?p_artikkeli=voh00042",
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
					},
					{
						"firstName": "Ilkka",
						"lastName": "Kunnamo",
						"creatorType": "contributor"
					},
					{
						"firstName": "Anne",
						"lastName": "Larkko",
						"creatorType": "contributor"
					},
					{
						"firstName": "Niina",
						"lastName": "Poikonen",
						"creatorType": "contributor"
					},
					{
						"firstName": "Marjatta",
						"lastName": "Jokinen",
						"creatorType": "contributor"
					},
					{
						"firstName": "Seija",
						"lastName": "Kärkinen",
						"creatorType": "contributor"
					}
				],
				"date": "2025-04-15",
				"abstractNote": "Nuha, yskä, kuume ja kurkkukipu ovat tavallisimmat oireet viruksen aiheuttamasta hengitystieinfektiosta, joka paranee ilman mikrobilääkehoitoa noin kahdessa viikossa.\nFlunssan aiheuttavat yleisimmin rinovirukset, A- ja B-virukset, RS-virukset, koronavirukset, parainfluenssavirukset ja adenovirukset.\nFlunssa on hyvin yleinen vaiva. Aikuisilla esiintyy tyypillisesti noin 2–4 flunssaa vuodessa.\nTutkimusten mukaan vilustuminen ei vaikuta flunssan kehittymiseen.\nFlunssan itämisaika on yleensä 24–72 tuntia.\nKuumeeton voi ulkoilla ja työskennellä välttäen kuitenkin kovaa fyysistä rasitusta.\nSairausloman tarve on 2–3 päivää, jos kuumetta ei ole. Influenssassa sairaanhoitaja voi yleensä kirjoittaa 5 päivää. Korona luokitellaan virusinfektioksi: sairauslomaa suositellaan, kunnes oireet alkavat helpottaa (yleensä 3–5 päivää).",
				"archive": "Terveysportti",
				"archiveLocation": "002.010",
				"bookTitle": "Sairaanhoitajan vastaanoton ohjeet",
				"callNumber": "voh00042",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/dtk/shk/avaa?p_artikkeli=voh00042",
				"attachments": [
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk-legacy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/shk/article/voh02379",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Potilasohje: Teipatun haavan kotihoito",
				"creators": [
					{
						"firstName": "Tuija",
						"lastName": "Alahäivälä",
						"creatorType": "author"
					},
					{
						"firstName": "Henna-Mari",
						"lastName": "Tolonen",
						"creatorType": "author"
					}
				],
				"date": "2025-04-07",
				"archive": "Hoitotyön tietokanta",
				"archiveLocation": "voh02379",
				"bookTitle": "Sairaanhoitajan vastaanoton ohjeet",
				"callNumber": "voh02379",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"shortTitle": "Teipatun haavan kotihoito",
				"url": "https://www.terveysportti.fi/doi/voh02379",
				"attachments": [
					{
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
				"url": "https://www.terveysportti.fi/doi/lab34165",
				"attachments": [
					{
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
		"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=lab34165",
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
				"archive": "Terveysportti",
				"archiveLocation": "H-KL3647",
				"bookTitle": "Laboratoriotutkimukset",
				"callNumber": "lab34165",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=lab34165",
				"attachments": [
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk-legacy"
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
				"shortTitle": "Fenomenologinen metodi hoitotieteellisessä tutkimuksessa",
				"url": "https://www.terveysportti.fi/apps/dtk/shk/article/hle00258",
				"volume": "34",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
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
		"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/dlk00221?toc=7856",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Tietoa potilaalle: Huimaus",
				"creators": [
					{
						"firstName": "Osmo",
						"lastName": "Saarelma",
						"creatorType": "contributor"
					}
				],
				"date": "2026-03-18",
				"abstractNote": "Huimaus on hyvin yleinen oire, joka ilmenee monin eri tavoin. Huimauksen luonne kertoo lääkärille paljon sen syystä, joten sen kuvailu sanallisesti on tärkeää. Huimaus voi olla esimerkiksi kiertävää, ikään kuin huone pyörisi ympäri. Se voi olla myös keinuvaa kuin olisi veneessä. Sitä voidaan kuvata pyörryttämisen tunteena, silmien pimentymisenä, epämääräisenä tasapainottomuutena tai huterana olona. Jotkut kuvaavat myös epätodellista olotilaa tai selkeästi johonkin liikkeeseen tai ylösnousuun liittyvää huimausta.",
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
						"title": "Supplementary PDF",
						"mimeType": "application/pdf"
					},
					{
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
		"url": "https://www.terveysportti.fi/dtk/shk/avaa?p_artikkeli=dlk00221",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Tietoa potilaalle: Huimaus",
				"creators": [
					{
						"firstName": "Osmo",
						"lastName": "Saarelma",
						"creatorType": "contributor"
					}
				],
				"date": "2026-03-18",
				"abstractNote": "Huimaus on hyvin yleinen oire, joka ilmenee monin eri tavoin. Huimauksen luonne kertoo lääkärille paljon sen syystä, joten sen kuvailu sanallisesti on tärkeää. Huimaus voi olla esimerkiksi kiertävää, ikään kuin huone pyörisi ympäri. Se voi olla myös keinuvaa kuin olisi veneessä. Sitä voidaan kuvata pyörryttämisen tunteena, silmien pimentymisenä, epämääräisenä tasapainottomuutena tai huterana olona. Jotkut kuvaavat myös epätodellista olotilaa tai selkeästi johonkin liikkeeseen tai ylösnousuun liittyvää huimausta.",
				"archive": "Terveysportti",
				"archiveLocation": "026.018",
				"bookTitle": "Lääkärikirja Duodecim",
				"callNumber": "dlk00221",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"shortTitle": "Huimaus",
				"url": "https://www.terveysportti.fi/dtk/shk/avaa?p_artikkeli=dlk00221",
				"attachments": [
					{
						"title": "Supplementary PDF",
						"mimeType": "application/pdf"
					},
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk-legacy"
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
					},
					{
						"firstName": "Anita",
						"lastName": "Puustjärvi",
						"creatorType": "contributor"
					},
					{
						"firstName": "Leena",
						"lastName": "Pihlakoski",
						"creatorType": "contributor"
					},
					{
						"firstName": "Arja",
						"lastName": "Tuunainen",
						"creatorType": "contributor"
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
				"archive": "Käypä hoito -suositus",
				"archiveLocation": "050.138",
				"callNumber": "hoi50138",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/hoi50138",
				"attachments": [
					{
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
		"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/hoi50103",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Kipu",
				"creators": [
					{
						"lastName": "Suomalaisen Lääkäriseuran Duodecimin, Suomen Anestesiologiyhdistyksen ja Suomen Yleislääketieteen yhdistyksen asettama työryhmä",
						"creatorType": "bookAuthor",
						"fieldMode": 1
					}
				],
				"date": "2026-03-03",
				"abstractNote": "Suositus keskittyy pääosin pitkäaikaisen kivun arviointiin ja hoitoon.\nKipupotilaan hyvä hoito perustuu toimivaan hoitosuhteeseen sekä huolelliseen arvioon potilaan kivusta (haastattelu ja tutkiminen) ja kokonaistilanteesta (muut sairaudet, elämäntavat ja psykososiaalinen tilanne).\nPotilaan kipu ja toimintakyky tulee arvioida ja kirjata jokaisella kivun vuoksi tapahtuvalla vastaanottokäynnillä.\nHoitosuunnitelma laaditaan yhdessä potilaan kanssa.\nHoidon tavoitteina ovat kivun lievittyminen, toimintakyvyn koheneminen ja elämänlaadun paraneminen.\nPitkäaikaisen kivun hoidolla voidaan vaikuttaa merkittävästi toimintakykyyn ja elämänlaatuun, vaikka hoito johtaakin harvoin kivuttomuuteen.\nLiitännäissairauksien, kuten unettomuus, masennus ja ahdistuneisuus, hoito on tärkeää.\nPotilasohjauksessa keskeisiä ovat psykoedukaatio, potilaan aktiivinen rooli, toimijuuden tukeminen ja ammattilaisten yhtenäinen sanoma.\nPitkäaikaisen kivun hoidossa ja kuntoutuksessa moniammatillinen lähestymistapa on usein tarpeen.\nLääkkeettömät hoidot ovat kivunhoidon perusta.\nKeskeisiä lääkkeettömiä hoitoja ovat liikunta, terapeuttinen harjoittelu, kognitiivis-behavioraalinen terapia, kylmä- ja lämpöhoito sekä transkutaaninen sähköinen hermostimulaatio (TENS).\nLääkkeetöntä hoitoa voi täydentää tarvittaessa lääkehoidolla.\nKudosvauriokivun hoidossa käytetään parasetamolia ja tulehduskipulääkkeitä.\nNeuropaattisen kivun ensisijaisia lääkehoitoja ovat trisykliset masennuslääkkeet, gabapentinoidit, ja SNRI-ryhmän masennuslääkkeet.\nSekamuotoisen kivun hoidossa voidaan yhdistää eri mekanismeilla vaikuttavia lääkkeitä.\nOpioideja käytetään vain erityistilanteissa.",
				"archive": "Käypä hoito -suositus",
				"archiveLocation": "050.103",
				"callNumber": "hoi50103",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/hoi50103",
				"attachments": [
					{
						"title": "Supplementary PDF",
						"mimeType": "application/pdf"
					},
					{
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
				"archiveLocation": "004.003",
				"bookTitle": "Fysiatria",
				"callNumber": "fys00127",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.oppiportti.fi/fys00127",
				"attachments": [
					{
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
				"archive": "Oppiportti",
				"archiveLocation": "004.003",
				"bookTitle": "Fysiatria",
				"callNumber": "fys00127",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/dtk/oppi/avaa?p_artikkeli=fys00127",
				"attachments": [
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk-legacy"
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
				"abstractNote": "Increased susceptibility to infections is more often due to patient characteristics (age, damaged skin or mucous membranes, structural characteristics of the lungs or maxillary sinuses, sufficient vasculature), diseases, prevalence of infections (day care), or habits (smoking, intoxicants) than to immunodeficiency.\nHIV infection is the most common disease causing immunodeficiency worldwide. All patients with suspected increased susceptibility to infections should have an HIV test.\nIncreased susceptibility to infections may be due to genetically defined (primary) or secondary immunodeficiency.\nHospital treatment, medication (glucocorticoids, anticancer or antirheumatic drugs), foreign bodies (cannulas, prostheses) and procedures may increase the susceptibility to infections.\nSignificant susceptibility to infections threatens the patient's health and, untreated, leads to premature death and/or sustained damage to target organs (e.g. the lungs).\nSignificant susceptibility to infections requiring immunological studies can normally be identified by careful history taking.\nAn explanation should be sought for the increased susceptibility to infections, and in cases of unclear aetiology, based on the history, referral to an outpatient clinic specializing in such cases should be considered.",
				"archive": "Evidence-Based Medicine Guidelines",
				"archiveLocation": "001.004",
				"bookTitle": "EBM Guidelines",
				"callNumber": "ebm01103",
				"language": "en",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/doi/ebm01103",
				"attachments": [
					{
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
				"abstractNote": "Increased susceptibility to infections is more often due to patient characteristics (age, damaged skin or mucous membranes, structural characteristics of the lungs or maxillary sinuses, sufficient vasculature), diseases, prevalence of infections (day care), or habits (smoking, intoxicants) than to immunodeficiency.\nHIV infection is the most common disease causing immunodeficiency worldwide. All patients with suspected increased susceptibility to infections should have an HIV test.\nIncreased susceptibility to infections may be due to genetically defined (primary) or secondary immunodeficiency.\nHospital treatment, medication (glucocorticoids, anticancer or antirheumatic drugs), foreign bodies (cannulas, prostheses) and procedures may increase the susceptibility to infections.\nSignificant susceptibility to infections threatens the patient's health and, untreated, leads to premature death and/or sustained damage to target organs (e.g. the lungs).\nSignificant susceptibility to infections requiring immunological studies can normally be identified by careful history taking.\nAn explanation should be sought for the increased susceptibility to infections, and in cases of unclear aetiology, based on the history, referral to an outpatient clinic specializing in such cases should be considered.",
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
		"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=ebm01103",
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
				"abstractNote": "Increased susceptibility to infections is more often due to patient characteristics (age, damaged skin or mucous membranes, structural characteristics of the lungs or maxillary sinuses, sufficient vasculature), diseases, prevalence of infections (day care), or habits (smoking, intoxicants) than to immunodeficiency.\nHIV infection is the most common disease causing immunodeficiency worldwide. All patients with suspected increased susceptibility to infections should have an HIV test.\nIncreased susceptibility to infections may be due to genetically defined (primary) or secondary immunodeficiency.\nHospital treatment, medication (glucocorticoids, anticancer or antirheumatic drugs), foreign bodies (cannulas, prostheses) and procedures may increase the susceptibility to infections.\nSignificant susceptibility to infections threatens the patient's health and, untreated, leads to premature death and/or sustained damage to target organs (e.g. the lungs).\nSignificant susceptibility to infections requiring immunological studies can normally be identified by careful history taking.\nAn explanation should be sought for the increased susceptibility to infections, and in cases of unclear aetiology, based on the history, referral to an outpatient clinic specializing in such cases should be considered.",
				"archive": "Terveysportti",
				"archiveLocation": "001.004",
				"bookTitle": "EBM Guidelines",
				"callNumber": "ebm01103",
				"language": "en",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=ebm01103",
				"attachments": [
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk-legacy"
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
				"abstractNote": "Potilaiden ominaisuuksista (ikä, ihon ja limakalvojen vauriot, keuhkojen ja poskionteloiden rakenne, riittävä verisuonitus), sairauksista, infektiotarjonnasta (päivähoito) ja elämäntavoista (tupakointi, päihteet) johtuva infektioalttius on yleisempää kuin immuunipuutoksen aiheuttama infektiotaipumus.\nHIV-infektio on maailmanlaajuisesti yleisin immuunipuutosta aiheuttava sairaus. HIV-testi tulee tehdä kaikille potilaille, joilla epäillään lisääntynyttä infektioalttiutta.\nLisääntynyt infektioalttius voi johtua geneettisesti määräytyneestä (primaarisesta) tai sekundaarisesta immuunivajeesta.\nSairaalahoito, lääkitys (glukokortikoidit, syöpä- ja reumalääkkeet), vierasesineet (kanyylit, proteesit) ja toimenpiteet voivat lisätä infektioalttiutta. Näihin liittyvien infektioiden torjunta: ks. kirja Hoitoon liittyvien infektioiden torjunta 7.\nMerkittävä infektioalttius on uhka potilaan terveydelle ja johtaa ilman hoitoa ennenaikaiseen kuolemaan ja/tai pitkäaikaisiin kohde-elinvaurioihin (esim. keuhkot).\nImmunologisia tutkimuksia vaativa merkittävä infektioalttius on yleensä mahdollista tunnistaa huolellisesti otetun anamneesin perusteella.\nInfektioalttiudelle pitää pyrkiä löytämään selitys ja etiologialtaan epäselvissä tapauksissa anamneesin perusteella harkita lähettämistä aiheeseen erikoistuneelle poliklinikalle.",
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
		"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=ykt01870",
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
				"abstractNote": "Potilaiden ominaisuuksista (ikä, ihon ja limakalvojen vauriot, keuhkojen ja poskionteloiden rakenne, riittävä verisuonitus), sairauksista, infektiotarjonnasta (päivähoito) ja elämäntavoista (tupakointi, päihteet) johtuva infektioalttius on yleisempää kuin immuunipuutoksen aiheuttama infektiotaipumus.\nHIV-infektio on maailmanlaajuisesti yleisin immuunipuutosta aiheuttava sairaus. HIV-testi tulee tehdä kaikille potilaille, joilla epäillään lisääntynyttä infektioalttiutta.\nLisääntynyt infektioalttius voi johtua geneettisesti määräytyneestä (primaarisesta) tai sekundaarisesta immuunivajeesta.\nSairaalahoito, lääkitys (glukokortikoidit, syöpä- ja reumalääkkeet), vierasesineet (kanyylit, proteesit) ja toimenpiteet voivat lisätä infektioalttiutta. Näihin liittyvien infektioiden torjunta: ks. kirja Hoitoon liittyvien infektioiden torjunta .\nMerkittävä infektioalttius on uhka potilaan terveydelle ja johtaa ilman hoitoa ennenaikaiseen kuolemaan ja/tai pitkäaikaisiin kohde-elinvaurioihin (esim. keuhkot).\nImmunologisia tutkimuksia vaativa merkittävä infektioalttius on yleensä mahdollista tunnistaa huolellisesti otetun anamneesin perusteella.\nInfektioalttiudelle pitää pyrkiä löytämään selitys ja etiologialtaan epäselvissä tapauksissa anamneesin perusteella harkita lähettämistä aiheeseen erikoistuneelle poliklinikalle.",
				"archive": "Terveysportti",
				"archiveLocation": "001.004",
				"bookTitle": "Lääkärin käsikirja",
				"callNumber": "ykt01870",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=ykt01870",
				"attachments": [
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk-legacy"
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
				"abstractNote": "Runsas ripulointi aiheuttaa tehohoitopotilaalle vakavia neste- ja ravitsemustasapainon häiriöitä.\nRipulin määrän arviointi on tärkeää.\nYli neljä vetistä ulostuskertaa vuorokaudessa katsotaan runsaaksi ripuloinniksi.",
				"archive": "Terveysportti",
				"archiveLocation": "004.020",
				"bookTitle": "Teho- ja valvontahoitotyön opas",
				"callNumber": "tvh00004",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/dtk/aho/avaa?p_artikkeli=tvh00004",
				"attachments": [
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk-legacy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/shk/article/shk02235",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Suun hoito palliatiivisessa hoidossa ja saattohoidossa",
				"creators": [
					{
						"firstName": "Riitta",
						"lastName": "Saarela",
						"creatorType": "contributor"
					}
				],
				"date": "2024-02-26",
				"abstractNote": "Huolellinen päivittäinen suun hoito kuuluu hyvään saattohoitoon.\nHuolehdi saattohoitopotilaan päivittäisestä suuhygieniasta ja oirehoidosta. Arvioi suun terveyttä ja lievitä mahdollisia oireita. Elämänlaatua heikentävät infektiot on tärkeää hoitaa.\nHuolehdi omalta osaltasi siitä, että kaikki työyhteisön jäsenet huomioivat potilaan suun hoidon.\nKirjaa suun hoito rakenteisesti jokaisessa vuorossa.",
				"archive": "Hoitotyön tietokanta",
				"archiveLocation": "009.005",
				"bookTitle": "Sairaanhoitajan käsikirja",
				"callNumber": "shk02235",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/doi/shk02235",
				"attachments": [
					{
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
		"url": "https://www.terveysportti.fi/dtk/shk/avaa?p_artikkeli=shk02235",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Suun hoito palliatiivisessa hoidossa ja saattohoidossa",
				"creators": [
					{
						"firstName": "Kaija",
						"lastName": "Hiltunen",
						"creatorType": "contributor"
					},
					{
						"firstName": "Tuuli",
						"lastName": "Simola",
						"creatorType": "contributor"
					},
					{
						"firstName": "Riitta",
						"lastName": "Saarela",
						"creatorType": "contributor"
					}
				],
				"date": "2024-02-26",
				"abstractNote": "Huolellinen päivittäinen suun hoito kuuluu hyvään saattohoitoon.\nHuolehdi saattohoitopotilaan päivittäisestä suuhygieniasta ja oirehoidosta. Arvioi suun terveyttä ja lievitä mahdollisia oireita. Elämänlaatua heikentävät infektiot on tärkeää hoitaa.\nHuolehdi omalta osaltasi siitä, että kaikki työyhteisön jäsenet huomioivat potilaan suun hoidon.\nKirjaa suun hoito rakenteisesti jokaisessa vuorossa.",
				"archive": "Terveysportti",
				"archiveLocation": "009.005",
				"bookTitle": "Sairaanhoitajan käsikirja",
				"callNumber": "shk02235",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/dtk/shk/avaa?p_artikkeli=shk02235",
				"attachments": [
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk-legacy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/shk/article/hnt00005/search/vuodepesu",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Potilaan vuodepesu",
				"creators": [
					{
						"firstName": "Nina",
						"lastName": "Sarell",
						"creatorType": "author"
					}
				],
				"date": "2023-01-20",
				"archive": "Hoitotyön tietokanta",
				"archiveLocation": "008.001",
				"bookTitle": "Hoitotyön toiminnot",
				"callNumber": "hnt00005",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/apps/dtk/shk/article/hnt00005",
				"attachments": [
					{
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
		"url": "https://www.terveysportti.fi/apps/dtk/shk/article/hot00012",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Aikuisten diabetesta sairastavien insuliinihoidon ohjauksen sisältö",
				"creators": [
					{
						"firstName": "Tuula-Maria",
						"lastName": "Rintala",
						"creatorType": "author"
					},
					{
						"firstName": "Marja-Anneli",
						"lastName": "Hynynen",
						"creatorType": "author"
					},
					{
						"firstName": "Taru",
						"lastName": "Kettunen",
						"creatorType": "author"
					},
					{
						"firstName": "Seija",
						"lastName": "Olli",
						"creatorType": "author"
					},
					{
						"firstName": "Markku",
						"lastName": "Vähätalo",
						"creatorType": "author"
					}
				],
				"date": "2021-12-08",
				"abstractNote": "Johdanto\nDiabetes on yleinen, jatkuvasti yleistyvä sairaus 1.\nDiabetesbarometrin 2 mukaan Suomessa oli diabetesta sairastavia vuonna 2017 yhteensä 452 244. Heistä tyypin 1 diabetesta sairasti 52 836 ja tyypin 2 diabetes 399 408 henkilöä.\nDiabeteksen hoitokustannusten osuus Suomen terveydenhuollon kokonaismenoista on noin 15 %, joista kaksi kolmasosaa aiheutuu diabeteksen liitännäissairauksista 1.\nKomplisoituneen diabeteksen hoito maksaa 5 700 €/hlö vuodessa, kun ilman liitännäissairautta vastaava luku on 1 300 €/hlö 3.\nDiabeteslääkkeitä käyttävistä noin joka kolmannella on insuliinihoito.\nDiabeteksen hoidon tavoitteet määritellään yksilöllisesti, mutta yleisesti hoidon ja omahoidon tavoitteena on ehkäistä diabetekseen liittyviä komplikaatioita, tukea oireettomuutta ja parantaa elämänlaatua 1.",
				"archive": "Hoitotyön tietokanta",
				"archiveLocation": "hot00012",
				"bookTitle": "Hotus-hoitosuositukset®",
				"callNumber": "hot00012",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Hoitotyön tutkimussäätiö",
				"url": "https://www.terveysportti.fi/apps/dtk/shk/article/hot00012",
				"attachments": [
					{
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
		"url": "https://www.terveysportti.fi/apps/sanakirjat/27278/katekoliamiinien",
		"defer": true,
		"items": [
			{
				"itemType": "dictionaryEntry",
				"title": "katekoliamiinien",
				"creators": [],
				"date": "2021",
				"archive": "Termit ja sanakirjat",
				"dictionaryTitle": "Lääketieteen termit",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/apps/sanakirjat/27278/katekoliamiinien",
				"attachments": [
					{
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
		"url": "https://www.terveysportti.fi/apps/sanakirjat/27278/lse13569",
		"defer": true,
		"items": [
			{
				"itemType": "dictionaryEntry",
				"title": "H-antigeeni",
				"creators": [],
				"date": "2021",
				"archive": "Termit ja sanakirjat",
				"callNumber": "lse13569",
				"dictionaryTitle": "Lääketieteen suomi-englanti -sanakirja",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/apps/sanakirjat/27278/lse13569",
				"attachments": [
					{
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
		"url": "https://www.terveysportti.fi/apps/sanakirjat/0/lte16925",
		"defer": true,
		"items": [
			{
				"itemType": "dictionaryEntry",
				"title": "parotiitti",
				"creators": [],
				"date": "2021",
				"archive": "Termit ja sanakirjat",
				"callNumber": "lte16925",
				"dictionaryTitle": "Lääketieteen termit",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/doi/lte16925",
				"attachments": [
					{
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
		"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/sll42417",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "EKG-poikkeavuuksien kliininen merkitys [Clinical significance of abnormal ECG findings]",
				"creators": [
					{
						"firstName": "Aapo",
						"lastName": "Aro",
						"creatorType": "author"
					},
					{
						"firstName": "Hannu",
						"lastName": "Parikka",
						"creatorType": "author"
					}
				],
				"date": "2015",
				"ISSN": "0039-5560, 2489-7434",
				"abstractNote": "EKG:ssa nähtävien muutosten tulkintaan vaikuttaa kliinisen tilanteen lisäksi mm. potilaan ikä, sukupuoli, ruumiinrakenne ja urheilutausta.\nYleensä hyvänlaatuisia ilmiöitä ovat lievästi pidentynyt PR-aika, osittainen oikea haarakatkos sekä varhainen repolarisaatio.\nTarkempia selvittelyjä vaativat leventynyt QRS-heilahdus (yli 110 ms), täydellinen haarakatkos, poikkeava QRS-heilahduksen sähköinen akseli, ST-tason lasku, T-aallon inversiot ja pidentynyt QTc-aika (≥ 470 ms).\nNuorilla ja urheilijoilla ainoastaan volttikriteerein rintakytkennöistä todettava vasemman kammion hypertrofia ilman muita EKG-muutoksia on hyvänlaatuinen ilmiö, joka ei vaadi jatkotutkimuksia.\n\nThe 12-lead electrocardiogram (ECG) is a widely available tool for studying the electrical activity of the heart. A vast number of ECGs are also recorded from asymptomatic individuals for various reasons. ECG findings should be interpreted in the context of the clinical picture, but age, gender, race, body structure and athletic background should also be taken into account.",
				"archive": "Lääkärin tietokannat",
				"archiveLocation": "20156301",
				"callNumber": "sll42417",
				"issue": "6",
				"journalAbbreviation": "Suom Lääkäril",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"pages": "301-307",
				"publicationTitle": "Suomen Lääkärilehti",
				"publisher": "Suomen Lääkäriliitto",
				"section": "Yleiskatsaus",
				"url": "https://www.terveysportti.fi/doi/sll42417",
				"volume": "70",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk"
					},
					{
						"tag": "duodecim-englanti-lääkärilehti"
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
				"ISSN": "0039-5560, 2489-7434",
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
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk"
					},
					{
						"tag": "duodecim-englanti-lääkärilehti"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/sll27920?toc=14549",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Tehohoidon toimintakokonaisuus erikoissairaanhoidossa",
				"creators": [
					{
						"firstName": "Tero",
						"lastName": "Varpula",
						"creatorType": "author"
					},
					{
						"firstName": "Ari",
						"lastName": "Uusaro",
						"creatorType": "author"
					},
					{
						"firstName": "Tero",
						"lastName": "Ala-Kokko",
						"creatorType": "author"
					},
					{
						"firstName": "Jyrki",
						"lastName": "Tenhunen",
						"creatorType": "author"
					},
					{
						"firstName": "Esko",
						"lastName": "Ruokonen",
						"creatorType": "author"
					},
					{
						"firstName": "Juha",
						"lastName": "Perttilä",
						"creatorType": "author"
					},
					{
						"firstName": "Ville",
						"lastName": "Pettilä",
						"creatorType": "author"
					}
				],
				"date": "2007",
				"ISSN": "0039-5560, 2489-7434",
				"abstractNote": "Tehohoidon tarpeen ja siihen liittyvien kustannusten on ennustettu lisääntyvän lähivuosikymmeninä huomattavasti, jopa 20-30 % (1). Vanhusten määrän kasvu, uusien kalliiden hoitomuotojen käyttöönotto ja erilaisten toimenpiteiden käyttöaiheiden laajeneminen yhä vanhempiin ikäryhmiin lisäävät tehohoidon kustannuksia (2,3). Suomen yliopistosairaaloissa tehohoitojakson hinta kotiin selvinnyttä potilasta kohti on noin 10 000 euroa. Kertasuoritteena kallista hintaa tulee arvioida suhteessa muihin lääketieteellisiin interventioihin ja niillä saavutettavaan hyötyyn. Verrattaessa saavutettavien laatupainotteisten elinvuosien (quality adjusted life year, QALY) hintaa on tehohoidon kustannusvaikuttavuus varsin hyvä ja kestää hyvin vertailun moniin edullisinakin pidettyihin terveydenhuollon interventioihin (4). Laajassa pitkäaikaisseurannassa tehohoidon jälkeen saavutettujen laatupainotteisten elinvuosien mediaani oli eri ikäryhmissä 22-4,1 vuotta potilasta kohti (5). Jaettaessa tehohoidon kustannukset laatupainotteisten elinvuosien kokonaismäärällä saadaan tehohoidon keskimääräisiksi kustannuksiksi noin 1 100 ?/QALY. Silti tehohoidon ja tehovalvontahoidon kokonaiskustannuksien väistämätön kasvu asettaa jatkossa huomattavia paineita erikoissairaanhoidon rahoitukselle. Yhdysvalloissa jo nyt noin 20 % akuuttisairaaloiden kustannuksista kuluu tehohoitoon ja tehovalvontaan - summa vastaa jopa 0,9 %:a maan bruttokansantuotteesta (6). Suomessa terveydenhoitojärjestelmä ja tehohoidon järjestämistapa ovat erilaiset, mutta uhkakuva on silti varoittava.",
				"archive": "Lääkärin tietokannat",
				"archiveLocation": "2007121271",
				"callNumber": "sll27920",
				"issue": "12",
				"journalAbbreviation": "Suom Lääkäril",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"pages": "1271-1276",
				"publicationTitle": "Suomen Lääkärilehti",
				"publisher": "Suomen Lääkäriliitto",
				"section": "Terveydenhuoltoartikkeli",
				"url": "https://www.terveysportti.fi/doi/sll27920",
				"volume": "62",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
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
		"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=sll42417",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "EKG-poikkeavuuksien kliininen merkitys [Clinical significance of abnormal ECG findings]",
				"creators": [
					{
						"firstName": "Aapo",
						"lastName": "Aro",
						"creatorType": "author"
					},
					{
						"firstName": "Hannu",
						"lastName": "Parikka",
						"creatorType": "author"
					}
				],
				"date": "2015",
				"ISSN": "0039-5560, 2489-7434",
				"abstractNote": "EKG:ssa nähtävien muutosten tulkintaan vaikuttaa kliinisen tilanteen lisäksi mm. potilaan ikä, sukupuoli, ruumiinrakenne ja urheilutausta.\nYleensä hyvänlaatuisia ilmiöitä ovat lievästi pidentynyt PR-aika, osittainen oikea haarakatkos sekä varhainen repolarisaatio.\nTarkempia selvittelyjä vaativat leventynyt QRS-heilahdus (yli 110 ms), täydellinen haarakatkos, poikkeava QRS-heilahduksen sähköinen akseli, ST-tason lasku, T-aallon inversiot ja pidentynyt QTc-aika (≥ 470 ms).\nNuorilla ja urheilijoilla ainoastaan volttikriteerein rintakytkennöistä todettava vasemman kammion hypertrofia ilman muita EKG-muutoksia on hyvänlaatuinen ilmiö, joka ei vaadi jatkotutkimuksia.\n\nThe 12-lead electrocardiogram (ECG) is a widely available tool for studying the electrical activity of the heart. A vast number of ECGs are also recorded from asymptomatic individuals for various reasons. ECG findings should be interpreted in the context of the clinical picture, but age, gender, race, body structure and athletic background should also be taken into account.",
				"archive": "Terveysportti",
				"archiveLocation": "20156301",
				"callNumber": "sll42417",
				"issue": "6",
				"journalAbbreviation": "Suom Lääkäril",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"pages": "301-307",
				"publicationTitle": "Suomen Lääkärilehti",
				"publisher": "Suomen Lääkäriliitto",
				"section": "Yleiskatsaus",
				"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=sll42417",
				"volume": "70",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk-legacy"
					},
					{
						"tag": "duodecim-englanti-lääkärilehti"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=sll27920",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Tehohoidon toimintakokonaisuus erikoissairaanhoidossa",
				"creators": [
					{
						"firstName": "Tero",
						"lastName": "Varpula",
						"creatorType": "author"
					},
					{
						"firstName": "Ari",
						"lastName": "Uusaro",
						"creatorType": "author"
					},
					{
						"firstName": "Tero",
						"lastName": "Ala-Kokko",
						"creatorType": "author"
					},
					{
						"firstName": "Jyrki",
						"lastName": "Tenhunen",
						"creatorType": "author"
					},
					{
						"firstName": "Esko",
						"lastName": "Ruokonen",
						"creatorType": "author"
					},
					{
						"firstName": "Juha",
						"lastName": "Perttilä",
						"creatorType": "author"
					},
					{
						"firstName": "Ville",
						"lastName": "Pettilä",
						"creatorType": "author"
					}
				],
				"date": "2007",
				"ISSN": "0039-5560, 2489-7434",
				"abstractNote": "Tehohoidon tarpeen ja siihen liittyvien kustannusten on ennustettu lisääntyvän lähivuosikymmeninä huomattavasti, jopa 20-30 % (1). Vanhusten määrän kasvu, uusien kalliiden hoitomuotojen käyttöönotto ja erilaisten toimenpiteiden käyttöaiheiden laajeneminen yhä vanhempiin ikäryhmiin lisäävät tehohoidon kustannuksia (2,3). Suomen yliopistosairaaloissa tehohoitojakson hinta kotiin selvinnyttä potilasta kohti on noin 10 000 euroa. Kertasuoritteena kallista hintaa tulee arvioida suhteessa muihin lääketieteellisiin interventioihin ja niillä saavutettavaan hyötyyn. Verrattaessa saavutettavien laatupainotteisten elinvuosien (quality adjusted life year, QALY) hintaa on tehohoidon kustannusvaikuttavuus varsin hyvä ja kestää hyvin vertailun moniin edullisinakin pidettyihin terveydenhuollon interventioihin (4). Laajassa pitkäaikaisseurannassa tehohoidon jälkeen saavutettujen laatupainotteisten elinvuosien mediaani oli eri ikäryhmissä 22-4,1 vuotta potilasta kohti (5). Jaettaessa tehohoidon kustannukset laatupainotteisten elinvuosien kokonaismäärällä saadaan tehohoidon keskimääräisiksi kustannuksiksi noin 1 100 ?/QALY. Silti tehohoidon ja tehovalvontahoidon kokonaiskustannuksien väistämätön kasvu asettaa jatkossa huomattavia paineita erikoissairaanhoidon rahoitukselle. Yhdysvalloissa jo nyt noin 20 % akuuttisairaaloiden kustannuksista kuluu tehohoitoon ja tehovalvontaan - summa vastaa jopa 0,9 %:a maan bruttokansantuotteesta (6). Suomessa terveydenhoitojärjestelmä ja tehohoidon järjestämistapa ovat erilaiset, mutta uhkakuva on silti varoittava.",
				"archive": "Terveysportti",
				"archiveLocation": "2007121271",
				"callNumber": "sll27920",
				"issue": "12",
				"journalAbbreviation": "Suom Lääkäril",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"pages": "1271-1276",
				"publicationTitle": "Suomen Lääkärilehti",
				"publisher": "Suomen Lääkäriliitto",
				"section": "Terveydenhuoltoartikkeli",
				"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=sll27920",
				"volume": "62",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk-legacy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=sll51576",
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
				"ISSN": "0039-5560, 2489-7434",
				"abstractNote": "Eurooppalaisessa näytönastekatsauksessa sarjamagneettistimulaatio (rTMS) on arvioitu varmasti tehokkaaksi masennuksen hoitomuodoksi (näytönaste A). Teho sijoittunee lääkehoidon ja sähköhoidon välille.\nrTMS on todennäköisesti tehokasta (näytönaste B) kaksisuuntaisen mielialahäiriön masennusjaksoissa, traumaperäisessä stressihäiriössä ja skitsofrenian negatiivissa oireissa.\nMenetelmän tekninen kehitys on nopeaa, ja lähitulevaisuudessa hoito todennäköisesti nopeutuu, tehostuu ja sen vaikuttavuus paranee edelleen.\n\nThe updated European guidelines state that rTMS is definitely effective against major depression (level A evidence). It is probably effective in depression in bipolar disorder, posttraumatic stress disorder and negative symptoms of schizophrenia. Technical development in the area is rapid, and in the near future rTMS treatment will probably be faster and more efficient.",
				"archive": "Terveysportti",
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
				"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=sll51576",
				"volume": "75",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk-legacy"
					},
					{
						"tag": "duodecim-englanti-lääkärilehti"
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
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk"
					},
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
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk"
					},
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
		"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/duo13519",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Akuutin mesenteriaali-iskemian hoitomahdollisuudet parantuneet [Treatment options for acute mesenteric ischemia have improved]",
				"creators": [
					{
						"firstName": "Jussi M.",
						"lastName": "Kärkkäinen",
						"creatorType": "author"
					},
					{
						"firstName": "Hannu",
						"lastName": "Manninen",
						"creatorType": "author"
					},
					{
						"firstName": "Hannu",
						"lastName": "Paajanen",
						"creatorType": "author"
					}
				],
				"date": "2017",
				"ISSN": "0012-7183, 2242-3281",
				"abstractNote": "Suolilievevaltimon tukoksesta johtuva akuutti mesenteriaali-iskemia on hengenvaarallinen sydän- ja verisuonisairauksien komplikaatio, jonka oireet vaihtelevat äkillisesti alkaneesta vatsakivusta useita vuorokausia kestäviin epämääräisiin oireisiin. Varjoainetehosteinen tietokonetomografia (TT) on erinomainen diagnostinen tutkimus, mutta taudin toteaminen ajoissa ennen pysyvän suolivaurion kehittymistä on silti vaikeaa. Noin kolmasosalla potilaista iskemialle tyypilliset löydökset puuttuvat kuvantamishetkellä. Tällöinkin TT:llä voidaan usein tunnistaa epäsuoria viitteitä taudin iskeemisestä taustasta. Löydösten tulkinta vaatii päivystävän radiologin ja kliinikon yhteistyötä viiveiden välttämiseksi. Hoidon tavoitteena on nopea suoliston verenkierron palauttaminen, ja erityisesti endovaskulaarinen hoito on osoittautunut tässä tehokkaaksi. Myös krooninen mesenteriaali-iskemia on vakava sairaus, joka vaatii kiireellistä tunnistamista ja hoitoa palautumattoman suoli-iskemian ehkäisemiseksi.\n\nAcute mesenteric ischemia resulting from mesenteric arterial thrombosis is a life-threatening cardiovascular complication with symptoms ranging from sudden-onset abdominal pain to vague symptoms of several days' duration. Although contrast-enhanced computed tomography is an excellent diagnostic tool, detection of the disease before the development of permanent intestinal injury is still difficult. Endovascular treatment is usually successful in restoring intestinal blood flow acutely. Chronic mesenteric ischemia requires urgent detection and therapy in order to prevent irreversible intestinal ischemia.",
				"archive": "Lääkärin tietokannat",
				"archiveLocation": "duo13519",
				"callNumber": "duo13519",
				"issue": "2",
				"journalAbbreviation": "Duodecim",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"pages": "150-8",
				"publicationTitle": "Lääketieteellinen Aikakauskirja Duodecim",
				"publisher": "Duodecim",
				"section": "Katsaus",
				"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/duo13519",
				"volume": "133",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk"
					},
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
		"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/duo14888",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Aivo-selkäydinnestenäytteen ottaminen ja siihen liittyvät komplikaatiot [Lumbar puncture and related complications]",
				"creators": [
					{
						"firstName": "Sari",
						"lastName": "Atula",
						"creatorType": "author"
					},
					{
						"firstName": "Anne",
						"lastName": "Pesonen",
						"creatorType": "author"
					},
					{
						"firstName": "Markus",
						"lastName": "Färkkilä",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"ISSN": "0012-7183, 2242-3281",
				"abstractNote": "Aivo-selkäydinnestenäytettä käytetään neurologisessa päivystys- ja kiireettömässä diagnostiikassa muun muassa epäiltäessä tulehdustiloja tai keskushermoston akuuttia tai kroonista infektiota sekä lukinkalvon alaisen verenvuodon poissulkemiseen. Ennen lannepistoa tehdään tarvittavat muutokset veren hyytymiseen vaikuttavaan lääkitykseen ja suljetaan pois kohonneen aivopaineen mahdollisuus. Lannepiston onnistumisessa tärkeintä on potilaan huolellinen asettelu oikeaan asentoon toimenpidettä varten sekä riittävän informaation antaminen. Toimenpide on oikein tehtynä hyvin turvallinen. Yleisin jälkikomplikaatio on pystyasennossa tuntuva kova päänsärky, jota hoidetaan ensisijaisesti vuodelevolla, runsaalla juomisella ja särkylääkkeillä. Mikäli postspinaalipäänsärky jatkuu, päivystyspoliklinikassa annetaan suonensisäinen nestehoito ja kofeiinitiputus, ja mikäli nämäkään eivät auta, anestesialääkäri voi tehdä heräämössä veripaikan. Muut toimenpiteeseen liittyvät komplikaatiot ovat hyvin harvinaisia.\n\nLumbar punctures are performed for diagnosing infections and inflammatory diseases of the central nervous system and excluding subarachnoid hemorrhage. Antithrombotic and anticoagulative medication is assessed beforehand, the necessary interruptions for medication are made and increased intracranial pressure is excluded. The most important things for the successful procedure are optimal posturing and good information of the patient. The procedure is very safe when done properly. The most common complication afterwards is postdural puncture headache. It is first treated with bed rest and painkillers, followed by intravenous fluid therapy and caffeine infusion in the hospital, or blood patching in the most severe cases.",
				"archive": "Lääkärin tietokannat",
				"archiveLocation": "duo14888",
				"callNumber": "duo14888",
				"issue": "8",
				"journalAbbreviation": "Duodecim",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"pages": "772-80",
				"publicationTitle": "Lääketieteellinen Aikakauskirja Duodecim",
				"publisher": "Duodecim",
				"section": "Näin hoidan",
				"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/duo14888",
				"volume": "135",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk"
					},
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
		"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/duo95136",
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
				"archive": "Lääkärin tietokannat",
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
				"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/duo95136",
				"volume": "121",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
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
		"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=duo99748",
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
				"archive": "Terveysportti",
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
				"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=duo99748",
				"volume": "127",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk-legacy"
					},
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
		"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=duo11158",
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
				"archive": "Terveysportti",
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
				"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=duo11158",
				"volume": "129",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk-legacy"
					},
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
		"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=duo13519",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Akuutin mesenteriaali-iskemian hoitomahdollisuudet parantuneet [Treatment options for acute mesenteric ischemia have improved]",
				"creators": [
					{
						"firstName": "Jussi M.",
						"lastName": "Kärkkäinen",
						"creatorType": "author"
					},
					{
						"firstName": "Hannu",
						"lastName": "Manninen",
						"creatorType": "author"
					},
					{
						"firstName": "Hannu",
						"lastName": "Paajanen",
						"creatorType": "author"
					}
				],
				"date": "2017",
				"ISSN": "0012-7183, 2242-3281",
				"abstractNote": "Suolilievevaltimon tukoksesta johtuva akuutti mesenteriaali-iskemia on hengenvaarallinen sydän- ja verisuonisairauksien komplikaatio, jonka oireet vaihtelevat äkillisesti alkaneesta vatsakivusta useita vuorokausia kestäviin epämääräisiin oireisiin. Varjoainetehosteinen tietokonetomografia (TT) on erinomainen diagnostinen tutkimus, mutta taudin toteaminen ajoissa ennen pysyvän suolivaurion kehittymistä on silti vaikeaa. Noin kolmasosalla potilaista iskemialle tyypilliset löydökset puuttuvat kuvantamishetkellä. Tällöinkin TT:llä voidaan usein tunnistaa epäsuoria viitteitä taudin iskeemisestä taustasta. Löydösten tulkinta vaatii päivystävän radiologin ja kliinikon yhteistyötä viiveiden välttämiseksi. Hoidon tavoitteena on nopea suoliston verenkierron palauttaminen, ja erityisesti endovaskulaarinen hoito on osoittautunut tässä tehokkaaksi. Myös krooninen mesenteriaali-iskemia on vakava sairaus, joka vaatii kiireellistä tunnistamista ja hoitoa palautumattoman suoli-iskemian ehkäisemiseksi.\n\nAcute mesenteric ischemia resulting from mesenteric arterial thrombosis is a life-threatening cardiovascular complication with symptoms ranging from sudden-onset abdominal pain to vague symptoms of several days' duration. Although contrast-enhanced computed tomography is an excellent diagnostic tool, detection of the disease before the development of permanent intestinal injury is still difficult. Endovascular treatment is usually successful in restoring intestinal blood flow acutely. Chronic mesenteric ischemia requires urgent detection and therapy in order to prevent irreversible intestinal ischemia.",
				"archive": "Terveysportti",
				"archiveLocation": "duo13519",
				"callNumber": "duo13519",
				"issue": "2",
				"journalAbbreviation": "Duodecim",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"pages": "150-8",
				"publicationTitle": "Lääketieteellinen Aikakauskirja Duodecim",
				"publisher": "Duodecim",
				"section": "Katsaus",
				"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=duo13519",
				"volume": "133",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk-legacy"
					},
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
		"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=duo14888",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Aivo-selkäydinnestenäytteen ottaminen ja siihen liittyvät komplikaatiot [Lumbar puncture and related complications]",
				"creators": [
					{
						"firstName": "Sari",
						"lastName": "Atula",
						"creatorType": "author"
					},
					{
						"firstName": "Anne",
						"lastName": "Pesonen",
						"creatorType": "author"
					},
					{
						"firstName": "Markus",
						"lastName": "Färkkilä",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"ISSN": "0012-7183, 2242-3281",
				"abstractNote": "Aivo-selkäydinnestenäytettä käytetään neurologisessa päivystys- ja kiireettömässä diagnostiikassa muun muassa epäiltäessä tulehdustiloja tai keskushermoston akuuttia tai kroonista infektiota sekä lukinkalvon alaisen verenvuodon poissulkemiseen. Ennen lannepistoa tehdään tarvittavat muutokset veren hyytymiseen vaikuttavaan lääkitykseen ja suljetaan pois kohonneen aivopaineen mahdollisuus. Lannepiston onnistumisessa tärkeintä on potilaan huolellinen asettelu oikeaan asentoon toimenpidettä varten sekä riittävän informaation antaminen. Toimenpide on oikein tehtynä hyvin turvallinen. Yleisin jälkikomplikaatio on pystyasennossa tuntuva kova päänsärky, jota hoidetaan ensisijaisesti vuodelevolla, runsaalla juomisella ja särkylääkkeillä. Mikäli postspinaalipäänsärky jatkuu, päivystyspoliklinikassa annetaan suonensisäinen nestehoito ja kofeiinitiputus, ja mikäli nämäkään eivät auta, anestesialääkäri voi tehdä heräämössä veripaikan. Muut toimenpiteeseen liittyvät komplikaatiot ovat hyvin harvinaisia.\n\nLumbar punctures are performed for diagnosing infections and inflammatory diseases of the central nervous system and excluding subarachnoid hemorrhage. Antithrombotic and anticoagulative medication is assessed beforehand, the necessary interruptions for medication are made and increased intracranial pressure is excluded. The most important things for the successful procedure are optimal posturing and good information of the patient. The procedure is very safe when done properly. The most common complication afterwards is postdural puncture headache. It is first treated with bed rest and painkillers, followed by intravenous fluid therapy and caffeine infusion in the hospital, or blood patching in the most severe cases.",
				"archive": "Terveysportti",
				"archiveLocation": "duo14888",
				"callNumber": "duo14888",
				"issue": "8",
				"journalAbbreviation": "Duodecim",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"pages": "772-80",
				"publicationTitle": "Lääketieteellinen Aikakauskirja Duodecim",
				"publisher": "Duodecim",
				"section": "Näin hoidan",
				"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=duo14888",
				"volume": "135",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk-legacy"
					},
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
		"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=duo95136",
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
				"archive": "Terveysportti",
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
				"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=duo95136",
				"volume": "121",
				"attachments": [
					{
						"title": "PDF",
						"mimeType": "application/pdf"
					},
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk-legacy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/laake/selaus/dos00677/artikkeli",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Koska pääsemme Suomessa syöpälääkeostojen seurannasta syöpälääkehoitojen arkivaikuttavuuden arviointiin?",
				"creators": [
					{
						"firstName": "Maarit",
						"lastName": "Bärlund",
						"creatorType": "author"
					}
				],
				"date": "2024",
				"ISSN": "0783-4233, 2489-7302",
				"archive": "Lääketietokanta",
				"archiveLocation": "dos00677",
				"callNumber": "dos00677",
				"issue": "3",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"pages": "235-238",
				"publicationTitle": "Farmaseuttinen Aikakauskirja Dosis",
				"publisher": "Suomen Farmasialiitto ry",
				"url": "https://www.terveysportti.fi/apps/laake/selaus/dos00677/artikkeli",
				"volume": "40",
				"attachments": [
					{
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
		"url": "https://www.terveysportti.fi/apps/dtk/shk/article/voh00078",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Varfariinihoidon seuranta ja toteutus avoterveydenhuollossa",
				"creators": [
					{
						"firstName": "Tuija",
						"lastName": "Alahäivälä",
						"creatorType": "author"
					},
					{
						"firstName": "Henna-Mari",
						"lastName": "Tolonen",
						"creatorType": "author"
					},
					{
						"firstName": "Niina",
						"lastName": "Poikonen",
						"creatorType": "contributor"
					},
					{
						"firstName": "Ilkka",
						"lastName": "Kunnamo",
						"creatorType": "contributor"
					}
				],
				"date": "2026-07-31",
				"abstractNote": "Lääkäri tekee päätöksen varfariinihoidon aloituksesta ja INR-tavoitetasosta.\nKoulutuksen saanut sairaanhoitaja voi määrittää varfariiniannoksen ja toteuttaa hoidon seurantaa.\nJos pitkään hoitotasolla pysynyt INR-arvo yhtäkkisesti poikkeaa, pyri selvittämään, mistä tämä johtuu. Ruokavalio, elintapamuutokset, alkoholinkäyttö ja sairastumiset vaikuttavat merkittävästi hoitotasapainoon.\nSeuraa potilaan vointia. Jos varfariinihoitoa saavalla potilaalla on jatkuvia nenäverenvuotoja, viitteitä vakavasta verenvuodosta, verivirtsaisuutta tai mustia tai verisiä ulosteita, potilas tarvitsee päivystyksellisesti lääkärin konsultaation ja kuuluu sairaalahoitoon.\nPäivystyksellistä sairaalahoitoa tarvitaan myös varfariinin yliannostustapauksissa.",
				"archive": "Hoitotyön tietokanta",
				"archiveLocation": "004.080",
				"bookTitle": "Sairaanhoitajan vastaanoton ohjeet",
				"callNumber": "voh00078",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/doi/voh00078",
				"attachments": [
					{
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
		"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=ykt00575",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Hyperkalemia",
				"creators": [
					{
						"firstName": "Niina",
						"lastName": "Matikainen",
						"creatorType": "author"
					},
					{
						"firstName": "Olavi",
						"lastName": "Ukkola",
						"creatorType": "contributor"
					}
				],
				"date": "2023-04-28",
				"abstractNote": "Hyperkalemian oireet vaihtelevat oireettomuudesta aina henkeä uhkaaviin rytmihäiriöihin.\nHyperkalemian syynä voi olla kaliumin siirtyminen intrasellulaaritilasta ekstrasellulaaritilaan, munuaisperäinen erityshäiriö tai pseudohyperkalemia.\nKaliumvalmisteita ja reniini-angiotensiini-aldosteroni (RAA) -järjestelmään vaikuttavia lääkkeitä (kaliumia säästäviä diureetteja, ACE:n estäjiä, ATR:n salpaajia) käyttävien potilaiden kaliumarvoja seurataan.\nHyperkalemian ehkäisyn ja hoidon avulla pyritään jatkamaan ennustetta parantavia RAA-estäjiä suurimmalla siedetyllä annoksella esim. sydämen tai munuaisten vajaatoimintaa sairastavilla.\nHemolyysi, trombosytoosi tai leukosytoosi voivat aiheuttaa koeputkessa pseudohyperkalemiaa. Liian pitkäaikainen staasi ja käden puristusliikkeet voivat aikaansaada paikallisen asidoosin ja hyperkalemian verinäytettä ottaessa.",
				"archive": "Terveysportti",
				"archiveLocation": "024.011",
				"bookTitle": "Lääkärin käsikirja",
				"callNumber": "ykt00575",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=ykt00575",
				"attachments": [
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk-legacy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/ltk/article/ykt00575",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Hyperkalemia",
				"creators": [
					{
						"firstName": "Niina",
						"lastName": "Matikainen",
						"creatorType": "author"
					},
					{
						"firstName": "Olavi",
						"lastName": "Ukkola",
						"creatorType": "contributor"
					}
				],
				"date": "2023-04-28",
				"abstractNote": "Hyperkalemian oireet vaihtelevat oireettomuudesta aina henkeä uhkaaviin rytmihäiriöihin.\nHyperkalemian syynä voi olla kaliumin siirtyminen intrasellulaaritilasta ekstrasellulaaritilaan, munuaisperäinen erityshäiriö tai pseudohyperkalemia.\nKaliumvalmisteita ja reniini-angiotensiini-aldosteroni (RAA) -järjestelmään vaikuttavia lääkkeitä (kaliumia säästäviä diureetteja, ACE:n estäjiä, ATR:n salpaajia) käyttävien potilaiden kaliumarvoja seurataan.\nHyperkalemian ehkäisyn ja hoidon avulla pyritään jatkamaan ennustetta parantavia RAA-estäjiä suurimmalla siedetyllä annoksella esim. sydämen tai munuaisten vajaatoimintaa sairastavilla.\nHemolyysi, trombosytoosi tai leukosytoosi voivat aiheuttaa koeputkessa pseudohyperkalemiaa. Liian pitkäaikainen staasi ja käden puristusliikkeet voivat aikaansaada paikallisen asidoosin ja hyperkalemian verinäytettä ottaessa.",
				"archive": "Lääkärin tietokannat",
				"archiveLocation": "024.011",
				"bookTitle": "Lääkärin käsikirja",
				"callNumber": "ykt00575",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/doi/ykt00575",
				"attachments": [
					{
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
		"url": "https://www.terveysportti.fi/apps/dtk/ebmg/article/ebm00505",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Hyperkalaemia",
				"creators": [
					{
						"firstName": "Niina",
						"lastName": "Matikainen",
						"creatorType": "author"
					},
					{
						"firstName": "Olavi",
						"lastName": "Ukkola",
						"creatorType": "contributor"
					}
				],
				"date": "2024-01-04",
				"abstractNote": "The symptoms of hyperkalaemia vary from asymptomatic to life-threatening cardiac arrhythmias.\nThe cause of hyperkalaemia may be a shift of potassium from the intracellular to the extracellular space, a disturbance in renal excretion or pseudohyperkalaemia.\nMonitor serum potassium in patients using potassium preparations or drugs affecting the renin-angiotensin-aldosterone (RAA) system (potassium-sparing diuretics, ACE inhibitors or ATR blockers).\nBy preventing and treating hyperkalaemia, the aim is to continue the use of prognosis-improving RAAS inhibitors with the highest tolerable dose in patients with diseases such as cardiac or renal failure.\nHaemolysis in the test tube, thrombocytosis or leucocytosis may cause pseudohyperkalaemia. Prolonged tourniquet use and fist clenching during blood sampling may cause local acidosis and hyperkalaemia.",
				"archive": "Evidence-Based Medicine Guidelines",
				"archiveLocation": "024.011",
				"bookTitle": "EBM Guidelines",
				"callNumber": "ebm00505",
				"language": "en",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/apps/dtk/ebmg/article/ebm00505",
				"attachments": [
					{
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
		"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=ebm00505",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Hyperkalaemia",
				"creators": [
					{
						"firstName": "Niina",
						"lastName": "Matikainen",
						"creatorType": "author"
					},
					{
						"firstName": "Olavi",
						"lastName": "Ukkola",
						"creatorType": "contributor"
					}
				],
				"date": "2024-01-04",
				"abstractNote": "The symptoms of hyperkalaemia vary from asymptomatic to life-threatening cardiac arrhythmias.\nThe cause of hyperkalaemia may be a shift of potassium from the intracellular to the extracellular space, a disturbance in renal excretion or pseudohyperkalaemia.\nMonitor serum potassium in patients using potassium preparations or drugs affecting the renin-angiotensin-aldosterone (RAA) system (potassium-sparing diuretics, ACE inhibitors or ATR blockers).\nBy preventing and treating hyperkalaemia, the aim is to continue the use of prognosis-improving RAAS inhibitors with the highest tolerable dose in patients with diseases such as cardiac or renal failure.\nHaemolysis in the test tube, thrombocytosis or leucocytosis may cause pseudohyperkalaemia. Prolonged tourniquet use and fist clenching during blood sampling may cause local acidosis and hyperkalaemia.",
				"archive": "Terveysportti",
				"archiveLocation": "024.011",
				"bookTitle": "EBM Guidelines",
				"callNumber": "ebm00505",
				"language": "en",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/dtk/ebmg/avaa?p_artikkeli=ebm00505",
				"attachments": [
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "duodecim-dtk-legacy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/dtk/vht/article/sic00083",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Milloin tarvitaan ASAa tyypin 2 diabeteksen hoidossa?",
				"creators": [
					{
						"firstName": "Jorma",
						"lastName": "Lahtela",
						"creatorType": "author"
					}
				],
				"date": "2013-12-13",
				"ISSN": "1799-3903, 1799-3911",
				"abstractNote": "Verihiutaleiden toimintaa estävillä lääkkeillä pyritään vähentämään tyypin 2 diabetesta sairastavien valtimotautitapahtumia. Sekundaaripreventiossa ASAn asema on vakiintunut. Primaaripreventiossa ASA ei kuulu kaikkien lääkitykseen, vaan on mietittävä valtimotapahtuman riskin suuruutta. Tärkein ASAn käyttöön liittyvä haitta on suolistoverenvuodot.",
				"archive": "Vanhusten hoito ja hoiva",
				"archiveLocation": "000.083",
				"callNumber": "sic00083",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publicationTitle": "Sic! - Lääketietoa Fimeasta",
				"publisher": "Lääkealan turvallisuus- ja kehittämiskeskus Fimea",
				"url": "https://www.terveysportti.fi/apps/dtk/vht/article/sic00083",
				"attachments": [
					{
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
		"url": "https://www.terveysportti.fi/apps/laake/haku/klopidogreeli%2520asa*/sic00083/artikkeli",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Milloin tarvitaan ASAa tyypin 2 diabeteksen hoidossa?",
				"creators": [
					{
						"firstName": "Jorma",
						"lastName": "Lahtela",
						"creatorType": "author"
					}
				],
				"date": "2013-12-13",
				"ISSN": "1799-3903, 1799-3911",
				"archive": "Lääketietokanta",
				"archiveLocation": "000.083",
				"callNumber": "sic00083",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publicationTitle": "Sic! - Lääketietoa Fimeasta",
				"publisher": "Lääkealan turvallisuus- ja kehittämiskeskus Fimea",
				"url": "https://www.terveysportti.fi/apps/laake/haku/klopidogreeli%2520asa*/sic00083/artikkeli",
				"attachments": [
					{
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
		"url": "https://www.terveysportti.fi/apps/laake/haku/*/dlo00704/artikkeli",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "Tetsepelumabi",
				"creators": [],
				"date": "2025-12-02",
				"archive": "Lääketietokanta",
				"archiveLocation": "613.000",
				"bookTitle": "Potilaan Lääkeopas",
				"callNumber": "dlo00704",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"url": "https://www.terveysportti.fi/apps/laake/haku/*/dlo00704/artikkeli",
				"attachments": [
					{
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
		"url": "https://www.terveysportti.fi/apps/laake/haku/nifedipiini/20497/start",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "NIFEDIPIN ALTERNOVA 30 mg depottabletti",
				"creators": [],
				"date": "2024-05-15",
				"archiveLocation": "20497",
				"bookTitle": "Lääketietokanta",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"shortTitle": "NIFEDIPIN ALTERNOVA",
				"url": "https://www.terveysportti.fi/apps/laake/haku/nifedipiini/20497/start",
				"attachments": [
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Reseptivalmiste"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/laake/haku/ent*/9358/start",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "CREON 10 000 enterokapseli, kova",
				"creators": [],
				"date": "2023-11-13",
				"archiveLocation": "9358",
				"bookTitle": "Lääketietokanta",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"shortTitle": "CREON",
				"url": "https://www.terveysportti.fi/apps/laake/haku/ent*/9358/start",
				"attachments": [
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Boilologin lääke"
					},
					{
						"tag": "Itsehoitovalmiste"
					},
					{
						"tag": "Koneellisessa annosjakelussa"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/laake/haku/minims*/duo575577/spc/fi",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "MINIMS FLUORESCEIN SODIUM 2% W/V 2 % silmätipat, liuos, kerta-annospakkaus",
				"creators": [],
				"archiveLocation": "duo575577",
				"bookTitle": "Lääketietokanta",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"shortTitle": "MINIMS FLUORESCEIN SODIUM",
				"url": "https://www.terveysportti.fi/apps/laake/haku/minims*/duo575577/spc/fi",
				"attachments": [
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Erityislupavalmiste"
					},
					{
						"tag": "Reseptivalmiste"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/laake/haku/minims*/duo575577/classification",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "MINIMS FLUORESCEIN SODIUM 2% W/V 2 % silmätipat, liuos, kerta-annospakkaus",
				"creators": [],
				"archiveLocation": "duo575577",
				"bookTitle": "Lääketietokanta",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"shortTitle": "MINIMS FLUORESCEIN SODIUM",
				"url": "https://www.terveysportti.fi/apps/laake/haku/minims*/duo575577/classification",
				"attachments": [
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Erityislupavalmiste"
					},
					{
						"tag": "Reseptivalmiste"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/laake/selaus/EU%2F1%2F24%2F1906%2F001/start",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "BEYONTTRA 356 mg tabletti, kalvopäällysteinen",
				"creators": [],
				"date": "2025-11-03",
				"archiveLocation": "EU/1/24/1906/001",
				"bookTitle": "Lääketietokanta",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"publisher": "Duodecim",
				"shortTitle": "BEYONTTRA",
				"url": "https://www.terveysportti.fi/apps/laake/selaus/EU%2F1%2F24%2F1906%2F001/start",
				"attachments": [
					{
						"snapshot": true,
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Kallis lääke"
					},
					{
						"tag": "Reseptivalmiste"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.terveysportti.fi/apps/laake/haku/bisoprololi*/33419/spc/sv",
		"defer": true,
		"items": [
			{
				"itemType": "bookSection",
				"title": "4. KLINISKA UPPGIFTER",
				"creators": [],
				"archive": "Lääketietokanta",
				"language": "fi",
				"libraryCatalog": "Duodecim",
				"url": "https://www.terveysportti.fi/apps/laake/haku/bisoprololi*/33419/spc/sv",
				"attachments": [
					{
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
