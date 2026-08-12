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
	"lastUpdated": "2026-08-12 15:44:49"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Shiyu Wang

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
 * - In this translator 'Duodecim' refers to both.
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

const tdoiURLRegex = /(?<=(\/|=))(?<TDOI>(?<prefix>(\w{3}|cd))\d{5,6})($|[/#?])/i;
const capsRegex = /[A-ZÄ-Ö]/; // Finnish/Swedish U+00C4 – U+00D6 (ASCII 196–214);
const nimikkeetRegex = /(^\(?(Tt[KLM]|AMK|YAMK|LT)[()-]?.*|.*(lääkäri|asiantuntija|terapeutti|toimitus|tohtori)$)/i; // TODO statics

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
				firstName: parts.slice(0, -1).join(' '), // I forgot why I wrote this way.
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
 * @returns {Promise<boolean>} whether the network IP is a subscriber to SLL / whether the URL is valid
 */
async function directAccess(ePage = '/e48243') {
	if (ePage.charAt(0) != '/') ePage = '/' + ePage;

	const sllResponse = await request(`https://www.laakarilehti.fi${ePage}`);
	Zotero.debug(`directAccess(): accessed ${ePage}\n> returned ${sllResponse.responseURL}\n> with status ${sllResponse.status}`);

	if (sllResponse.status != 200) return false;
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

	const dmyDate = /(?<day>\d{1,2})\W(?<month>\d{1,2})\W(?<year>\d{4}$)/.exec(dateText)?.groups;
	const ymdDate = /(?<year>\d{4})\W(?<month>\d{1,2})\W\d{1,2}/.exec(dateText)?.groups;

	const date = dmyDate || ymdDate;
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
			mimeType: asFile ? "application/pdf" : "text/html"
		};
		if (!asFile) pdfToPush.snapshot = false; // TODO live test, necessary?
		item.attachments.push(pdfToPush);
	}

	var englishSummary = '';
	if (isJournal) {
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
			if (!journalMetadata) item.date = dmyToISO(innerText(pageSelector)); // *Verkossa ensin*, Online ahead of print, e.g. duo19390

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

			item.attachments.push({
				url: `https://${urlObj.host}/xmedia/duo/${tdoi}.pdf`,
				title: "PDF",
				mimeType: "application/pdf",
			});
		}

		if (prefix === 'sll') {
			if (h2s?.length) for (const h2 of h2s) if ((/^English summary: .*/i).test(h2.innerText)) {
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
					url: 'https://www.laakarilehti.fi' + sllPDFPath,
					title: directDL ? "PDF" : "Linkki PDF-tiedostoon (laakarilehti.fi)",
					mimeType: directDL ? "application/pdf" : "text/html",
				};
				if (!directDL) pdfToPush.snapshot = false;
				item.attachments.push(pdfToPush);
			}
		}
	}

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
			item.dictionaryTitle = text('h2');

			if (/^\w{3}\d{5}$/.test(searchKeyword[0])) { // TDOI
				item.title = text('span.d-k') || 'Sanakirja'; // TDOI shall never be entry title. TODO e.g.?
				Zotero.debug(`scrapeDict(): TDOI, item.title=${item.title}`);
				item.callNumber = searchKeyword[0];
			}
			else {
				const firstResultAsTitle = doc.querySelectorAll('span.d-k')?.length === 1
				|| (!doc.querySelector('div.hit span.d-k') && searchKeyword[0] === text('span.d-k'));
				item.title = firstResultAsTitle ? text('span.d-k') : searchKeyword[0];
				Zotero.debug(`scrapeDict(): item.title=${item.title}`);
				item.url = url; // If applicable esp. lte-prefix entries, TDOI may be found by searching at "www.terveysportti.fi"
			}
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
		|| (url.includes('www.duodecimlehti.fi')
			&& tdoiURLRegex.test(url))
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
