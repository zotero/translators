{
	"translatorID": "2b8c3a5e-7d41-4c8e-9a53-6e0f1d2c9b74",
	"label": "Cornell LII (legal)",
	"creator": "jnsheff",
	"target": "^https?://(?:www\\.)?law\\.cornell\\.edu/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 90,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-09-30 02:06:31"
}

/*
	MIT License. Copyright (c) 2026 jnsheff. See LICENSE in the repository.
*/

// ---- shared legal-citation parsing (identical in both translators; edit src/shared.js) ----

var MONTHS = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?';
var DATE_RE = new RegExp('\\b(' + MONTHS + ')\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})\\b', 'i');

function squash(s) {
	return (s || '').replace(/[\u200b-\u200f\u2060-\u2064\ufeff]/g, '').replace(/[\u00a0\s]+/g, ' ').trim();
}

// Strip the site's suffix from a page title ("... - Westlaw", "... | Lexis+")
function cleanTitle(s) {
	return squash(s).replace(/\s*[-|\u2013\u2014]\s*(Westlaw(?: Edge| Next)?|Lexis\+?(?: Advance)?|Lexis(?:Nexis)?|Thomson Reuters)\b.*$/i, '');
}

// "S.D.N.Y. Jan. 1, 2023" / "9th Cir. 2001" / "1991" -> { court, date, year }
function parseParen(p) {
	p = squash(p);
	var out = { court: '', date: '', year: '' };
	var m = DATE_RE.exec(p);
	if (m) {
		out.date = m[1] + ' ' + m[2] + ', ' + m[3];
		out.year = m[3];
		out.court = squash(p.replace(m[0], ''));
	}
	else if ((m = /\b(\d{4})\b\s*$/.exec(p))) {
		out.year = m[1];
		out.date = m[1];
		out.court = squash(p.slice(0, m.index));
	}
	else {
		out.court = p;
	}
	out.court = out.court.replace(/[,\s]+$/, '');
	return out;
}

var NOT_A_CASE_RE = /\b(?:L\.? ?Rev|L\.? ?J\b|Law Review|Law Journal|Rev\.|Q\.|Stud\.|Pol'y|J\.)/;

// A full citation as a Bluebook string. Returns null if it is not a case or article citation.
//   Name v. Name, 499 U.S. 340, 345 (1991)
//   Name v. Name, 2023 WL 123456, at *3 (S.D.N.Y. Jan. 1, 2023)
//   Name v. Name, 2023 U.S. Dist. LEXIS 1234 (D. Del. Jan. 1, 2023)
//   Author, Title, 102 Harv. L. Rev. 1, 5 (1989)
function parseCitation(text) {
	text = squash(text);
	var m, out;

	// unpublished: WL and LEXIS numbers, "2023 WL 123456"
	m = /^(.+?),?\s+(\d{4})\s+((?:WL)|(?:[A-Z][A-Za-z.]*(?: [A-Z][A-Za-z.]*)*? LEXIS))\s+(\d+)(?:,?\s*at\s*\*+\s*[\d\-\u2013, ]+)?\s*\(([^)]*)\)/.exec(text);
	if (m) {
		var pp = parseParen(m[5]);
		return { kind: 'case', name: m[1].replace(/,$/, ''), volume: m[2], reporter: m[3], page: m[4], court: pp.court, date: pp.date, year: pp.year || m[2] };
	}

	// reported: volume reporter page [, pinpoint] (court year)
	m = /^(.+?),?\s+(\d{1,4})\s+([A-Z][A-Za-z0-9.'&\u2019 ]*?)\s+(\d{1,5})(?:,\s*(?:at\s*)?\*?[\d\-\u2013*n, ]+)?\s*\(([^)]*\d{4}[^)]*)\)/.exec(text);
	if (m && /[.']/.test(m[3])) {
		out = parseParen(m[5]);
		out.volume = m[2];
		out.reporter = squash(m[3]);
		out.page = m[4];
		out.name = m[1].replace(/,$/, '');
		var isCase = /\bv\.? |^In re |^Ex parte |^Matter of |^United States\b|^State\b|^People\b/.test(out.name);
		if (!isCase && NOT_A_CASE_RE.test(out.reporter)) {
			out.kind = 'article';
			out.author = '';
			var t = /^((?:[A-Z][\w.'\u2019\-]+(?: [A-Z][\w.'\u2019\-]*){0,3})(?: (?:&|and) [A-Z][\w.'\u2019\-]+(?: [A-Z][\w.'\u2019\-]*){0,3})*),\s+(.+)$/.exec(out.name);
			if (t) { out.author = t[1]; out.title = t[2]; }
			else out.title = out.name;
		}
		else out.kind = 'case';
		return out;
	}
	return null;
}

// U.S. Code as the sites print it (USC, USCA, USCS, U.S.C.A., U.S.C.S.) -> "U.S.C."; CFR -> "C.F.R."
function normCode(code) {
	code = squash(code);
	if (/^U\.?S\.?C\.?[AS]?\.?$/i.test(code)) return 'U.S.C.';
	if (/^C\.?F\.?R\.?$/i.test(code)) return 'C.F.R.';
	return code;
}

// Statutes and regulations
//   47 U.S.C.A. \u00a7 230(c)   /   Cal. Civ. Code \u00a7 1798.100   /   17 C.F.R. \u00a7 240.10b-5
function parseStatute(text) {
	text = squash(text);
	var m = /^(\d{1,3})\s+([A-Z][A-Za-z.&'\u2019 ]*?[A-Za-z.])\s+(?:\u00a7+|Sec(?:tions?|s?)\.?)\s*([\w.()\-\u2013,]+)/.exec(text);
	var out;
	if (m) out = { kind: 'statute', codeNumber: m[1], code: normCode(m[2]), section: m[3].replace(/[,.]$/, '') };
	else if ((m = /^(\d{1,3})\s+(U\.?S\.?C\.?[AS]?\.?|C\.?F\.?R\.?)\s+(?:\u00a7+\s*)?(\d[\w.()\-\u2013]*)/i.exec(text))) {
		// "37 CFR 42.108", "15 USC 1127"
		out = { kind: 'statute', codeNumber: m[1], code: normCode(m[2]), section: m[3].replace(/[,.]$/, '') };
	}
	else if ((m = /^([A-Z][A-Za-z.&'\u2019 ]*?[A-Za-z.])\s+(?:\u00a7+|Sec(?:tions?|s?)\.?)\s*([\w.()\-\u2013,]+)/.exec(text))) {
		out = { kind: 'statute', codeNumber: '', code: squash(m[1]), section: m[2].replace(/[,.]$/, '') };
	}
	else return null;
	out.rest = squash(text.slice(m[0].length)).replace(/^[\s,:;\u2013\u2014-]+/, '');
	var y = /\((?:[^)]*?)(\d{4})\)/.exec(out.rest);
	if (y) out.year = y[1];
	var pl = /(?:Pub(?:lic|\.)? ?L(?:aw|\.)?(?: ?No\.)?|P\.L\.)\s*(\d+-\d+)/i.exec(text);
	if (pl) out.publicLawNumber = pl[1];
	return out;
}

// Trim Westlaw/Lexis all-caps names ("FEIST PUBLICATIONS, INC. v. ...") into title case
function fixCase(s) {
	s = squash(s);
	var letters = s.replace(/[^A-Za-z]/g, ''), upper = s.replace(/[^A-Z]/g, '');
	if (letters.length > 3 && upper.length / letters.length > 0.8) {
		s = ZU.capitalizeTitle(s.toLowerCase(), true).replace(/\s[Vv]\.?\s/g, ' v. ').replace(/\bMc([a-z])/g, function (x, c) { return 'Mc' + c.toUpperCase(); });
	}
	return s;
}

var STATES = { Alabama: 'Ala.', Alaska: 'Alaska', Arizona: 'Ariz.', Arkansas: 'Ark.', California: 'Cal.', Colorado: 'Colo.', Connecticut: 'Conn.',
	Delaware: 'Del.', 'District of Columbia': 'D.C.', Florida: 'Fla.', Georgia: 'Ga.', Hawaii: 'Haw.', Idaho: 'Idaho', Illinois: 'Ill.', Indiana: 'Ind.',
	Iowa: 'Iowa', Kansas: 'Kan.', Kentucky: 'Ky.', Louisiana: 'La.', Maine: 'Me.', Maryland: 'Md.', Massachusetts: 'Mass.', Michigan: 'Mich.',
	Minnesota: 'Minn.', Mississippi: 'Miss.', Missouri: 'Mo.', Montana: 'Mont.', Nebraska: 'Neb.', Nevada: 'Nev.', 'New Hampshire': 'N.H.',
	'New Jersey': 'N.J.', 'New Mexico': 'N.M.', 'New York': 'N.Y.', 'North Carolina': 'N.C.', 'North Dakota': 'N.D.', Ohio: 'Ohio', Oklahoma: 'Okla.',
	Oregon: 'Or.', Pennsylvania: 'Pa.', 'Rhode Island': 'R.I.', 'South Carolina': 'S.C.', 'South Dakota': 'S.D.', Tennessee: 'Tenn.', Texas: 'Tex.',
	Utah: 'Utah', Vermont: 'Vt.', Virginia: 'Va.', Washington: 'Wash.', 'West Virginia': 'W. Va.', Wisconsin: 'Wis.', Wyoming: 'Wyo.',
	'Puerto Rico': 'P.R.', Guam: 'Guam' };
var STATE_CODES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
	DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
	KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
	MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
	NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island',
	SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
	WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', PR: 'Puerto Rico' };
var CIRCUITS = { First: '1st', Second: '2d', Third: '3d', Fourth: '4th', Fifth: '5th', Sixth: '6th', Seventh: '7th', Eighth: '8th', Ninth: '9th',
	Tenth: '10th', Eleventh: '11th', 'District of Columbia': 'D.C.', Federal: 'Fed.' };

// A court name as the sites print it -> its Bluebook abbreviation; unrecognised names are returned as given.
//   "United States Court of Appeals, Fifth Circuit." -> "5th Cir."    "United States District Court, E.D. Texas." -> "E.D. Tex."
function abbrevCourt(name) {
	var n = squash(name).replace(/[.,;\s]+$/, ''), m, div, st;
	if (/^(?:the )?(?:United States|U\.S\.) Supreme Court$|^Supreme Court of the United States$/i.test(n)) return 'U.S.';
	if ((m = /Court of Appeals(?:,| for the)? (?:the )?(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|District of Columbia|Federal) Circuit/i.exec(n))) {
		return CIRCUITS[m[1].replace(/^./, function (c) { return c.toUpperCase(); })] + ' Cir.';
	}
	// Westlaw: "United States District Court, E.D. Texas"; Lexis: "United States District Court for the Eastern District of Texas"
	if ((m = /District Court,? (?:for the )?((?:[NSEWMC]\.\s?)+D\.|D\.)\s*(.+)$/.exec(n))) {
		div = m[1].replace(/\s/g, '');
		st = STATES[squash(m[2]).replace(/^(?:of )?(?:the State of )?/i, '')];
	}
	else if ((m = /District Court,? (?:for the )?(?:(Northern|Southern|Eastern|Western|Middle|Central) )?District of (.+)$/i.exec(n))) {
		div = (m[1] ? m[1].charAt(0).toUpperCase() + '.D.' : 'D.');
		st = STATES[squash(m[2]).replace(/^the State of /i, '')] || STATES['District of ' + squash(m[2])];
	}
	if (div && st) return ((st === 'N.Y.' && div !== 'D.') || st === 'D.C.' ? div + st : div + ' ' + st);
	if ((m = /^Supreme Court of (?:the State of )?(.+)$/i.exec(n)) && STATES[m[1]] && m[1] !== 'New York') return STATES[m[1]];
	// unrecognised: keep an abbreviation such as "2d Cir." as it is, drop the sentence period after a full name
	return squash(name).split(' ').length > 3 ? n : squash(name);
}

var CODE_WORDS = { Civil: 'Civ.', Criminal: 'Crim.', Business: 'Bus.', Commerce: 'Com.', Procedure: 'Proc.', Professions: 'Prof.', Practice: 'Prac.',
	Remedies: 'Rem.', Government: 'Gov\'t', Education: 'Educ.', Insurance: 'Ins.', Labor: 'Lab.', Family: 'Fam.', Public: 'Pub.', Property: 'Prop.',
	Revenue: 'Rev.', Transportation: 'Transp.', Vehicle: 'Veh.', Corporations: 'Corp.', Corporation: 'Corp.', Agriculture: 'Agric.',
	Administrative: 'Admin.', Evidence: 'Evid.', Estates: 'Est.', Utilities: 'Util.', Natural: 'Nat.', Resources: 'Res.', Statutes: 'Stat.',
	Financial: 'Fin.', Human: 'Hum.', Judiciary: 'Jud.', Legislative: 'Legis.', Municipal: 'Mun.', Occupations: 'Occ.', Regulations: 'Regs.',
	Social: 'Soc.', Services: 'Servs.', Service: 'Serv.', Environmental: 'Envtl.', Conservation: 'Conserv.' };

// "New York" + "Civil Rights Law" -> "N.Y. Civ. Rights Law"
function stateCodeName(state, titleDesc) {
	var words = squash(titleDesc).replace(/^Title \d+\.?\s*/i, '').split(' ').map(function (w) { return CODE_WORDS[w] || w; });
	return squash((STATES[state] || state) + ' ' + words.join(' '));
}

// A citation with no name or parenthetical, as in a Westlaw header line: "168 F.4th 231", "2025 WL 458520"
function parseBareCite(text) {
	text = squash(text);
	var m = /^(\d{4})\s+((?:WL)|(?:[A-Z][A-Za-z.]*(?: [A-Z][A-Za-z.]*)*? LEXIS))\s+(\d+)$/.exec(text);
	if (m) return { volume: m[1], reporter: m[2], page: m[3] };
	m = /^(\d{1,4})\s+([A-Z][A-Za-z0-9.'&\u2019 ]*?)\s+(\d{1,5})$/.exec(text);
	return m && /[.']/.test(m[2]) ? { volume: m[1], reporter: squash(m[2]), page: m[3] } : null;
}

// A Zotero item from a parsed citation; `extra` = fields read from the page that fill any gaps.
function buildItem(parsed, extra) {
	extra = extra || {};
	var item, court, date, m;
	if (parsed.kind === 'statute') {
		item = new Zotero.Item('statute');
		item.nameOfAct = extra.title || (parsed.rest && !/^\(/.test(parsed.rest) ? parsed.rest.replace(/\s*\([^)]*\d{4}\)\s*$/, '') : '');
		item.code = parsed.code;
		item.codeNumber = parsed.codeNumber;
		item.section = parsed.section;
		if (parsed.publicLawNumber) item.publicLawNumber = parsed.publicLawNumber;
		if (extra.date) item.dateEnacted = extra.date;
		return item;
	}
	if (parsed.kind === 'treatise') {
		item = new Zotero.Item('bookSection');
		item.title = parsed.title;
		item.bookTitle = parsed.bookTitle;
		item.volume = parsed.volume;
		item.extra = 'Section: ' + parsed.section; // Zotero has no section field for book sections
		if (parsed.edition) item.edition = parsed.edition;
		if (parsed.date) item.date = parsed.date;
		(parsed.author || '').split(/\s*;\s*|\s+(?:&|and)\s+/).forEach(function (a) {
			if (squash(a)) item.creators.push(ZU.cleanAuthor(fixCase(a), 'bookAuthor'));
		});
		return item;
	}
	if (parsed.kind === 'article') {
		item = new Zotero.Item('journalArticle');
		item.title = fixCase(parsed.title.replace(/^(?:ARTICLE|RESPONSE|ESSAY|COMMENT|NOTE|SYMPOSIUM|TRIBUTE|BOOK REVIEW|FOREWORD|REPLY|COMMENTARY)S?:\s*/i, ''));
		if (parsed.author) {
			parsed.author.split(/\s*;\s*|\s+(?:&|and)\s+/).forEach(function (a) {
				if (squash(a)) item.creators.push(ZU.cleanAuthor(fixCase(a), 'author'));
			});
		}
		item.publicationTitle = parsed.publication || parsed.reporter;
		if (parsed.publication) item.journalAbbreviation = parsed.reporter;
		item.volume = parsed.volume;
		item.pages = parsed.page;
		item.date = parsed.date || parsed.year;
		return item;
	}
	item = new Zotero.Item('case');
	item.caseName = fixCase(parsed.name);
	court = abbrevCourt(parsed.court || extra.court || '');
	item.court = court;
	item.reporter = parsed.reporter;
	item.reporterVolume = parsed.volume;
	item.firstPage = parsed.page;
	date = parsed.date || extra.date || parsed.year || '';
	item.dateDecided = extra.date && /\d{4}/.test(extra.date) && extra.date.length > (parsed.date || '').length ? extra.date : date;
	if (extra.docket) item.docketNumber = extra.docket;
	return item;
}

// Docket number in a block of text ("No. 89-1909", "Civil Action No. 1:24-cv-01234", "Nos. 21-1, 21-2")
function findDocket(text) {
	var re = /\b((?:Civil Action |Civ\. ?(?:A\. )?|Case |Docket |Cause )?Nos?\.?\s*[A-Za-z0-9][\w:\-\u2013.\/]*(?:\s*(?:,|and|&)\s*\d[\w:\-\u2013.\/]*)*)/gi, m;
	text = squash(text);
	while ((m = re.exec(text))) {
		if (/\d/.test(m[1])) return m[1].replace(/[,;.]+$/, '');
	}
	return '';
}
// "March 27, 1991, Decided" -> "March 27, 1991"
function cleanDate(s) {
	return squash(s).replace(/[,;\s]*\b(?:Decided|Filed|Argued|Submitted|Entered|Amended)\b.*$/i, '');
}
function findDate(text) {
	var m = DATE_RE.exec(text || '');
	return m ? m[1] + ' ' + m[2] + ', ' + m[3] : '';
}
// ---- end shared ----

// Text of an element with a space between text nodes (textContent glues neighbouring blocks together)
function spacedText(el) {
	if (!el) return '';
	var w = el.ownerDocument.createTreeWalker(el, 4), parts = [], n;
	while ((n = w.nextNode())) parts.push(n.nodeValue);
	return squash(parts.join(' '));
}

// First non-empty text among CSS selectors
function firstText(doc, selectors) {
	for (var i = 0; i < selectors.length; i++) {
		var el = doc.querySelector(selectors[i]);
		var t = spacedText(el);
		if (t) return t;
	}
	return '';
}

// Work out what a document page is. `page` = { pageTitle, title, cite, court, date, body }
function classify(page) {
	page.date = cleanDate(page.date);
	var paren = squash([page.court, page.date].filter(Boolean).join(' '));
	var tries = [page.pageTitle, page.title];
	if (page.title && page.cite) tries.push(page.title + ', ' + page.cite + (paren ? ' (' + paren + ')' : ''));
	var parsed = null;
	// a code section (title "37 CFR 42.108", "15 USCS \u00a7 1127") is never a case, whatever else the page says
	var early = page.title && !/ v\.? /.test(page.title) && parseStatute(page.title);
	if (early) return statuteResult(early, page, findDate(page.date) || findDate(page.body) || '');
	var bare = page.cite && parseBareCite(page.cite);
	if (bare && page.title && (page.court || / v\.? /.test(page.title))) {
		var pp = parseParen(paren);
		parsed = { kind: 'case', name: page.title, volume: bare.volume, reporter: bare.reporter, page: bare.page, court: pp.court || page.court, date: pp.date, year: pp.year };
	}
	else if (bare && page.title && NOT_A_CASE_RE.test(bare.reporter)) {
		var my = new RegExp('(' + MONTHS + ')\\.?,?\\s+(?:\\d{1,2},?\\s+)?(\\d{4})', 'i').exec(page.date || '');
		parsed = { kind: 'article', author: page.author || '', title: page.title, volume: bare.volume, reporter: bare.reporter, page: bare.page, year: my ? my[2] : (/\b(\d{4})\b/.exec(page.date || '') || [])[1] || '', date: my ? my[1].replace(/\.$/, '') + ' ' + my[2] : '' };
	}
	for (var i = 0; !parsed && i < tries.length; i++) parsed = tries[i] && parseCitation(tries[i]);

	var extra = { court: page.court, date: findDate(page.date) || findDate(page.body) || '', docket: findDocket((page.info || '') + '\n' + (page.body || '').slice(0, 1200)) };
	if (parsed) {
		if (parsed.kind === 'case' && parsed.date && /^\d{4}$/.test(parsed.date) && extra.date && extra.date.slice(-4) === parsed.date) parsed.date = extra.date;
		return { parsed: parsed, extra: extra };
	}
	var st = [page.title, page.pageTitle, page.title + ' ' + page.cite].reduce(function (r, t) { return r || (t && parseStatute(t)); }, null);
	return st ? statuteResult(st, page, extra.date) : null;
}

function statuteResult(st, page, date) {
	if (!st.rest && page.body) {
		// the section heading in the text: "47-25-1102. Part definitions."
		var sec = st.section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		// "47-25-1102. Part definitions." or "\u00a7 42.108 Institution of inter partes review. (a)"
		var nm = new RegExp('(?:\\u00a7+\\s*' + sec + '\\.?|' + sec + '\\.)\\s+([A-Z][^.]{2,120}?)\\.\\s').exec(page.body);
		if (nm) st.rest = nm[1];
	}
	return { parsed: st, extra: { date: date, title: st.rest } };
}

var TYPE_OF = { 'case': 'case', statute: 'statute', article: 'journalArticle', treatise: 'bookSection' };

// "Author: Jeremy N. Sheff * * Associate Professor..." (Lexis) -> "Jeremy N. Sheff"
// "Author: JEANNE C. FROMER + & MARK P. MCKENNA ++ + Professor of Law..." -> "JEANNE C. FROMER; MARK P. MCKENNA"
// Names are read one at a time; after the footnote marks another name only follows if there is a "&", "and" or ";".
function findAuthor(text) {
	var m = /\bAuthors?:\s*(.*)$/.exec(squash(text));
	if (!m) return '';
	var rest = m[1].replace(/\s+(?:Text|Length:|Source:)\b.*$/, ''), names = [];
	var nameRE = /^\s*([A-Za-z][A-Za-z.'\u2019\-]*(?:\s+[A-Za-z][A-Za-z.'\u2019\-]*){1,4}?)\s*(?=[*+\u2020\u2021]|&|\band\b|;|$)/;
	for (;;) {
		var n = nameRE.exec(rest);
		if (!n) break;
		names.push(n[1]);
		rest = rest.slice(n[0].length).replace(/^[\s*+\u2020\u2021\d]+/, '');
		var sep = /^(?:&|and\b|;)\s*/.exec(rest);
		if (!sep) break;
		rest = rest.slice(sep[0].length);
	}
	return names.join('; ');
}

// Book-section treatises: parsed = { kind: 'treatise', title, bookTitle, volume, section, edition, date, author }

// Save the page itself with the item
function addSnapshot(item, doc) {
	item.attachments.push({ title: 'Snapshot', document: doc });
}


// Cornell Legal Information Institute: the primary-source collections (U.S. Code, CFR, Supreme Court opinions,
// the Constitution, the federal rules, the UCC and state regulations). Secondary material (Wex, CONAN, the
// Supreme Court Bulletin) is not handled.

var RULE_SETS = { frcp: 'Fed. R. Civ. P.', fre: 'Fed. R. Evid.', frap: 'Fed. R. App. P.', frcrmp: 'Fed. R. Crim. P.', frbp: 'Fed. R. Bankr. P.', supct: 'Sup. Ct. R.' };
var ORDINAL_WORDS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth',
	'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth', 'twenty-first', 'twenty-second', 'twenty-third',
	'twenty-fourth', 'twenty-fifth', 'twenty-sixth', 'twenty-seventh'];

function toRoman(n) {
	var map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']], out = '';
	if (n >= 20) return 'XX' + toRoman(n - 20);
	map.forEach(function (p) { while (n >= p[0]) { out += p[1]; n -= p[0]; } });
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
			return i > 0 && SMALL_WORDS.test(lower) ? lower : lower.replace(/(^|[-'’(])([a-z])/g, function (x, p, c) { return p + c.toUpperCase(); });
		}
		return w;
	}).join('');
}

// One side of a case name: drop roles, "et al." and the given names of an individual
function party(s) {
	s = squash(s).replace(/\s*,?\s*et al\.?/ig, '');
	var c = s.search(/,(?!\s*(?:Inc|Ltd|LLC|L\.L\.C|Co|Corp|Jr|Sr|II|III|IV|N\.A|P\.C|P\.A|L\.P|S\.A)\b)/i);
	if (c > 0) s = s.slice(0, c);
	s = s.replace(/[\s,;]+$/, '').replace(/\.$/, function () { return /(?:Co|Inc|Corp|Ltd|Jr|Sr|N\.A|L\.L\.C|P\.C|L\.P|Bros|Assn|Ass'n)\.$/.test(s.replace(/[\s,;]+$/, '')) ? '.' : ''; });
	s = s.replace(/^(?:[A-Z][a-z]+\.?\s+){1,2}([A-Z][A-Z'’\-]{2,})$/, '$1'); // "Jane ROE" -> "ROE"
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

	if ((m = /^\/uscode\/text\/(\d+)\/([\w.\-]+)$/.exec(p)) && (m = /^(\d+) U\.S\. Code §+\s*(\S+?)(?:\s+-\s+(.+))?$/.exec(title))) {
		return { kind: 'statute', codeNumber: m[1], code: 'U.S.C.', section: m[2], name: m[3] || '' };
	}
	if ((m = /^\/cfr\/text\/(\d+)\/([\w.\-]+)$/.exec(p)) && (m = /^(\d+) CFR §+\s*(\S+?)(?:\s+-\s+(.+))?$/.exec(title))) {
		return { kind: 'statute', codeNumber: m[1], code: 'C.F.R.', section: m[2], name: (m[3] || '').replace(/\.$/, '') };
	}
	if ((m = /^\/rules\/([a-z]+)\/rule_([\w.\-]+)$/.exec(p)) && RULE_SETS[m[1]]) {
		var n = /^Rule\s+(\S+?)\.?\s+(.+)$/.exec(title);
		return { kind: 'statute', codeNumber: '', code: RULE_SETS[m[1]], section: m[2], name: n ? n[2].replace(/\.$/, '') : '' };
	}
	if ((m = /^\/ucc\/(\w+)\/([\w.\-]+)$/.exec(p)) && (m = /^§+\s*(\S+?)\.?\s+(.+)$/.exec(title))) {
		return { kind: 'statute', codeNumber: '', code: 'U.C.C.', section: m[1], name: m[2].replace(/\.$/, '') };
	}
	if ((m = /^\/regulations\/[\w\-]+\/.+$/.exec(p)) && (m = /^(.+?)\s+§+\s*(\S+?)\s+-\s+(.+)$/.exec(title))) {
		return { kind: 'statute', codeNumber: '', code: m[1].replace(/\bTit\./, 'tit.'), section: m[2], name: m[3].replace(/\.$/, '') };
	}
	if ((m = /^\/constitution\/(articl[e\w]*|amendment[\w]*|[a-z]+_amendment|preamble)$/.exec(p)) && !/^U\.S\. Constitution$/.test(title)) {
		return constitutionEntry(p, title);
	}
	if ((m = /^\/supremecourt\/text\/(?:(\d+)\/(\d+)|([\w\-]+))(?:\/[\w\-]+)?$/.exec(p))) {
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
	else if ((m = /^\/constitution\/([a-z]+)_amendment$/.exec(p)) && ORDINAL_WORDS.indexOf(m[1]) >= 0) section = 'amend. ' + toRoman(ORDINAL_WORDS.indexOf(m[1]) + 1);
	else if (p === '/constitution/preamble') section = 'pmbl.';
	else return null;
	return { kind: 'statute', codeNumber: '', code: 'U.S. Const.', section: section, name: title };
}

function readCase(doc, info) {
	var bt = doc.querySelector('.bodytext') || doc.body, text = spacedText(bt).slice(0, 4000);
	var cites = doc.querySelectorAll('.case_cite'), vol = info.volume, pg = info.page, i, m;
	for (i = 0; i < cites.length; i++) {
		if ((m = /^(\d+) U\.\s?S\. (\d+)$/.exec(squash(cites[i].textContent)))) { vol = m[1]; pg = m[2]; break; }
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
		if (t && links[i].href) { items[links[i].href] = caseName(t); found = true; }
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
	item.libraryCatalog = 'Legal Information Institute';
	addSnapshot(item, doc);
	item.complete();
}
