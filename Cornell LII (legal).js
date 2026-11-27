{
	"translatorID": "2b8c3a5e-7d41-4c8e-9a53-6e0f1d2c9b74",
	"label": "Cornell LII (legal)",
	"creator": "jnsheff",
	"target": "^https?://(?:www\\.)?law\\.cornell\\.edu/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 90,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-09-30 02:43:44"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 jnsheff

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

// ---- shared legal-citation parsing (identical in both translators; edit src/shared.js) ----

var MONTHS = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?';
function squash(s) {
	return (s || '').replace(/[\u200b-\u200f\u2060-\u2064\ufeff]/g, '').replace(/[\u00a0\s]+/g, ' ').trim();
}

// Text of an element with a space between text nodes (textContent glues neighbouring blocks together)
function spacedText(el) {
	if (!el) return '';
	var w = el.ownerDocument.createTreeWalker(el, 4), parts = [], n;
	while ((n = w.nextNode())) parts.push(n.nodeValue);
	return squash(parts.join(' '));
}

// Save the page itself with the item
function addSnapshot(item, doc) {
	item.attachments.push({ title: 'Snapshot', document: doc });
}


// Cornell Legal Information Institute: the primary-source collections (U.S. Code, CFR, Supreme Court opinions,
// the Constitution, the federal rules, the UCC and state regulations). Secondary material (Wex, CONAN, the
// Supreme Court Bulletin) is not handled.

var RULE_SETS = { frcp: 'Fed. R. Civ. P.', fre: 'Fed. R. Evid.', frap: 'Fed. R. App. P.', frcrmp: 'Fed. R. Crim. P.', frbp: 'Fed. R. Bankr. P.', supct: 'Sup. Ct. R.' };
var ORDINAL_WORDS = ('first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth thirteenth fourteenth '
	+ 'fifteenth sixteenth seventeenth eighteenth nineteenth twentieth twenty-first twenty-second twenty-third '
	+ 'twenty-fourth twenty-fifth twenty-sixth twenty-seventh').split(' ');

function toRoman(n) {
	var map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']], out = '';
	if (n >= 20) return 'XX' + toRoman(n - 20);
	map.forEach(function (p) {
		while (n >= p[0]) {
			out += p[1]; n -= p[0];
		}
	});
	return out;
}

var SMALL_WORDS = /^(a|an|and|as|at|but|by|for|in|of|on|or|the|to|v|vs|ex|rel|de|del|la)$/i;

// "GROFF" / "DeJOY" / "BOARD OF EDUCATION" -> "Groff" / "DeJoy" / "Board of Education"
function nameCase(s) {
	return s.split(/(\s+)/).map(function (w, i) {
		if (/^\s+$/.test(w) || !w) return w;
		var m = /^(De|Mc|Mac|Di|La|Le|Van|Von)([A-Z]{2,})([.,]?)$/.exec(w);
		if (m) return m[1] + m[2].charAt(0) + m[2].slice(1).toLowerCase() + m[3];
		if (w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w) && !/^(?:[A-Z]\.)+$/.test(w) && !/^(?:U\.S\.|N\.A\.|L\.L\.C\.|LLC|LLP|II|III|IV|USA|NLRB|EEOC|FCC|FTC|SEC|IRS|EPA)$/i.test(w)) {
			var lower = w.toLowerCase();
			return i > 0 && SMALL_WORDS.test(lower)
				? lower
				: lower.replace(/(^|[-'’(])([a-z])/g, function (x, p, c) {
					return p + c.toUpperCase();
				});
		}
		return w;
	}).join('');
}

// One side of a case name: drop roles, "et al." and the given names of an individual
function party(s) {
	s = squash(s).replace(/\s*,?\s*et al\.?/ig, '');
	var c = s.search(/,(?!\s*(?:Inc|Ltd|LLC|L\.L\.C|Co|Corp|Jr|Sr|II|III|IV|N\.A|P\.C|P\.A|L\.P|S\.A)\b)/i);
	if (c > 0) s = s.slice(0, c);
	s = s.replace(/[\s,;]+$/, '').replace(/\.$/, function () {
		return /(?:Co|Inc|Corp|Ltd|Jr|Sr|N\.A|L\.L\.C|P\.C|L\.P|Bros|Assn|Ass'n)\.$/.test(s.replace(/[\s,;]+$/, '')) ? '.' : '';
	});
	s = s.replace(/^(?:[A-Z][a-z]+\.?\s+){1,2}([A-Z][A-Z'’-]{2,})$/, '$1'); // "Jane ROE" -> "ROE"
	return nameCase(s);
}

// "Jane ROE, et al., Appellants, v. Henry WADE." -> "Roe v. Wade"; "GROFF v. DeJOY" -> "Groff v. DeJoy"
function caseName(title) {
	title = squash(title);
	var m = /^(.+?)\s+v\.?\s+(.+?)(?:\s+[A-Z][A-Za-z.'’ ]+?\s+v\.?\s+.*)?$/i.exec(title);
	return m ? party(m[1]) + ' v. ' + party(m[2]) : nameCase(title.replace(/[\s.]+$/, ''));
}

function path(url) {
	return url.replace(/^https?:\/\/[^/]+/, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
}

function pageTitle(doc) {
	return squash((doc.querySelector('#page_title, h1.title, h1') || {}).textContent || '');
}

// What kind of LII page is this? Returns { kind, ... fields } or null
function identify(doc, url) {
	var p = path(url), m, title = pageTitle(doc);
	if (!title) return null;

	if ((m = /^\/uscode\/text\/(\d+)\/([\w.-]+)$/.exec(p)) && (m = /^(\d+) U\.S\. Code §+\s*(\S+?)(?:\s+-\s+(.+))?$/.exec(title))) {
		return { kind: 'statute', codeNumber: m[1], code: 'U.S.C.', section: m[2], name: m[3] || '' };
	}
	if ((m = /^\/cfr\/text\/(\d+)\/([\w.-]+)$/.exec(p)) && (m = /^(\d+) CFR §+\s*(\S+?)(?:\s+-\s+(.+))?$/.exec(title))) {
		return { kind: 'statute', codeNumber: m[1], code: 'C.F.R.', section: m[2], name: (m[3] || '').replace(/\.$/, '') };
	}
	if ((m = /^\/rules\/([a-z]+)\/rule_([\w.-]+)$/.exec(p)) && RULE_SETS[m[1]]) {
		var n = /^Rule\s+(\S+?)\.?\s+(.+)$/.exec(title);
		return { kind: 'statute', codeNumber: '', code: RULE_SETS[m[1]], section: m[2], name: n ? n[2].replace(/\.$/, '') : '' };
	}
	if ((m = /^\/ucc\/(\w+)\/([\w.-]+)$/.exec(p)) && (m = /^§+\s*(\S+?)\.?\s+(.+)$/.exec(title))) {
		return { kind: 'statute', codeNumber: '', code: 'U.C.C.', section: m[1], name: m[2].replace(/\.$/, '') };
	}
	if ((m = /^\/regulations\/[\w-]+\/.+$/.exec(p)) && (m = /^(.+?)\s+§+\s*(\S+?)\s+-\s+(.+)$/.exec(title))) {
		return { kind: 'statute', codeNumber: '', code: m[1].replace(/\bTit\./, 'tit.'), section: m[2], name: m[3].replace(/\.$/, '') };
	}
	if ((m = /^\/constitution\/(articl[e\w]*|amendment[\w]*|[a-z]+_amendment|preamble)$/.exec(p)) && !/^U\.S\. Constitution$/.test(title)) {
		return constitutionEntry(p, title);
	}
	if ((m = /^\/supremecourt\/text\/(?:(\d+)\/(\d+)|([\w-]+))(?:\/[\w-]+)?$/.exec(p))) {
		if (/^Cases for /.test(title) && doc.querySelector('ul.citelist a')) return { kind: 'list' };
		if (/^Cases for /.test(title)) return null;
		return { kind: 'case', title: title, volume: m[1] || '', page: m[2] || '' };
	}
	return null;
}

// /constitution/articlei -> "U.S. Const. art. I";  /constitution/amendmentxiv -> "U.S. Const. amend. XIV"
function constitutionEntry(p, title) {
	var m = /^\/constitution\/(articl[e]?([ivx]+)|amendment([ivxl]+))$/i.exec(p), section;
	if (m && m[2]) section = 'art. ' + m[2].toUpperCase();
	else if (m && m[3]) section = 'amend. ' + m[3].toUpperCase();
	else if ((m = /^\/constitution\/([a-z]+)_amendment$/.exec(p)) && ORDINAL_WORDS.contains(m[1])) section = 'amend. ' + toRoman(ORDINAL_WORDS.indexOf(m[1]) + 1);
	else if (p === '/constitution/preamble') section = 'pmbl.';
	else return null;
	return { kind: 'statute', codeNumber: '', code: 'U.S. Const.', section: section, name: title };
}

function readCase(doc, info) {
	var bt = doc.querySelector('.bodytext') || doc.body, text = spacedText(bt).slice(0, 4000);
	var cites = doc.querySelectorAll('.case_cite'), vol = info.volume, pg = info.page, i, m;
	for (i = 0; i < cites.length; i++) {
		if ((m = /^(\d+) U\.\s?S\. (\d+)$/.exec(squash(cites[i].textContent)))) {
			vol = m[1]; pg = m[2]; break;
		}
	}
	var d = new RegExp('Decided\\s+((?:' + MONTHS + ')\\.?\\s+\\d{1,2},?\\s+\\d{4})', 'i').exec(text);
	var docket = /\bNos?\.\s*([\d\-–A-Za-z]+?)\.?(?:\s|$)/.exec(text);
	var parties = doc.querySelector('.parties');
	return {
		name: caseName(parties ? spacedText(parties) : info.title),
		volume: vol, page: pg,
		date: d ? d[1] : '',
		docket: docket ? docket[1].replace(/–/g, '-') : '',
	};
}

function detectWeb(doc, url) {
	var info = identify(doc, url);
	if (!info) return false;
	if (info.kind === 'list') return 'multiple';
	return info.kind === 'case' ? 'case' : 'statute';
}

function getSearchResults(doc) {
	var items = {}, links = doc.querySelectorAll('ul.citelist a'), found = false;
	for (var i = 0; i < links.length; i++) {
		var t = squash(links[i].getAttribute('title') || links[i].textContent);
		if (t && links[i].href) {
			items[links[i].href] = caseName(t); found = true;
		}
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc));
		if (!items) return;
		for (let u of Object.keys(items)) {
			try {
				await scrape(await requestDocument(u), u);
			}
			catch (e) {
				Zotero.debug('LII: skipped ' + u + ': ' + e.message);
			}
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url) {
	var info = identify(doc, url), item;
	if (!info || info.kind === 'list') throw new Error('LII: not a primary-source page');
	if (info.kind === 'case') {
		var c = readCase(doc, info);
		item = new Zotero.Item('case');
		item.caseName = c.name;
		item.court = 'U.S.';
		if (c.volume) {
			item.reporter = 'U.S.';
			item.reporterVolume = c.volume;
			item.firstPage = c.page;
		}
		item.dateDecided = c.date;
		item.docketNumber = c.docket;
	}
	else {
		item = new Zotero.Item('statute');
		item.nameOfAct = info.name;
		item.code = info.code;
		item.codeNumber = info.codeNumber;
		item.section = info.section;
	}
	item.url = url.replace(/[?#].*$/, '');
	addSnapshot(item, doc);
	item.complete();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.law.cornell.edu/uscode/text/15/1125",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "False designations of origin, false descriptions, and dilution forbidden",
				"creators": [],
				"code": "U.S.C.",
				"codeNumber": "15",
				"section": "1125",
				"url": "https://www.law.cornell.edu/uscode/text/15/1125",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://www.law.cornell.edu/cfr/text/37/42.108",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Institution of inter partes review",
				"creators": [],
				"code": "C.F.R.",
				"codeNumber": "37",
				"section": "42.108",
				"url": "https://www.law.cornell.edu/cfr/text/37/42.108",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://www.law.cornell.edu/supremecourt/text/22-174",
		"items": [
			{
				"itemType": "case",
				"caseName": "Groff v. DeJoy",
				"creators": [],
				"dateDecided": "June 29, 2023",
				"court": "U.S.",
				"docketNumber": "22-174",
				"url": "https://www.law.cornell.edu/supremecourt/text/22-174",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://www.law.cornell.edu/supremecourt/text/410/113",
		"items": [
			{
				"itemType": "case",
				"caseName": "Roe v. Wade",
				"creators": [],
				"dateDecided": "Jan. 22, 1973",
				"court": "U.S.",
				"docketNumber": "70-18",
				"firstPage": "113",
				"reporter": "U.S.",
				"reporterVolume": "410",
				"url": "https://www.law.cornell.edu/supremecourt/text/410/113",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://www.law.cornell.edu/constitution/amendmentxiv",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "14th Amendment",
				"creators": [],
				"code": "U.S. Const.",
				"section": "amend. XIV",
				"url": "https://www.law.cornell.edu/constitution/amendmentxiv",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://www.law.cornell.edu/rules/frcp/rule_11",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Signing Pleadings, Motions, and Other Papers; Representations to the Court; Sanctions",
				"creators": [],
				"code": "Fed. R. Civ. P.",
				"section": "11",
				"url": "https://www.law.cornell.edu/rules/frcp/rule_11",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://www.law.cornell.edu/ucc/2/2-207",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Additional Terms in Acceptance or Confirmation",
				"creators": [],
				"code": "U.C.C.",
				"section": "2-207",
				"url": "https://www.law.cornell.edu/ucc/2/2-207",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://www.law.cornell.edu/regulations/new-york/10-NYCRR-2.1",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Communicable diseases designated: cases, suspected cases and certain carriers to be reported to the state department of health",
				"creators": [],
				"code": "N.Y. Comp. Codes R. & Regs. tit. 10",
				"section": "2.1",
				"shortTitle": "Communicable diseases designated",
				"url": "https://www.law.cornell.edu/regulations/new-york/10-NYCRR-2.1",
				"attachments": [
					{
						"title": "Snapshot",
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
		"url": "https://www.law.cornell.edu/supremecourt/text/347/483",
		"items": "multiple"
	}
]
/** END TEST CASES **/
