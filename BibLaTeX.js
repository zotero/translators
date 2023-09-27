{
	"translatorID": "b6e39b57-8942-4d11-8259-342c46ce395f",
	"translatorType": 2,
	"label": "BibLaTeX",
	"creator": "Simon Kornblith, Richard Karnesky and Anders Johansson",
	"target": "bib",
	"minVersion": "2.1.9",
	"maxVersion": "null",
	"priority": 100,
	"inRepository": true,
	"configOptions": {
		"getCollections": true
	},
	"displayOptions": {
		"exportCharset": "UTF-8",
		"exportNotes": false,
		"exportFileData": false,
		"useJournalAbbreviation": false
	},
	"lastUpdated": "2023-09-27 11:08:00"
}

/*
  ***** BEGIN LICENSE BLOCK *****

  Copyright © 2019 Simon Kornblith, Richard Karnesky and Anders Johansson

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

// %a = first listed creator surname
// %y = year
// %t = first word of title
var citeKeyFormat = "%a_%t_%y";


var fieldMap = {
	location: "place",
	chapter: "chapter",
	edition: "edition",
	title: "title",
	volume: "volume",
	rights: "rights", // it's rights in zotero nowadays
	isbn: "ISBN",
	issn: "ISSN",
	url: "url",
	doi: "DOI",
	series: "series",
	shorttitle: "shortTitle",
	holder: "assignee",
	abstract: "abstractNote",
	volumes: "numberOfVolumes",
	version: "version",
	eventtitle: "conferenceName",
	pages: "pages",
	pagetotal: "numPages"
};
// more conversions done below with special rules

/**
 * Identifiers from item.extra
 * Copied from BibTeX
 */
// Exported in BibTeX and BibLaTeX
var revExtraIds = {
	LCCN: 'lccn',
	MR: 'mrnumber',
	Zbl: 'zmnumber',
	PMCID: 'pmcid',
	PMID: 'pmid',
	DOI: 'doi'
};

// Imported by BibTeX. Exported by BibLaTeX only
var revEprintIds = {
	// eprinttype: Zotero label

	// From BibLaTeX manual
	arXiv: 'arxiv', // Sorry, but no support for eprintclass yet
	JSTOR: 'jstor',
	// PMID: 'pubmed', // Not sure if we should do this instead
	HDL: 'hdl',
	GoogleBooksID: 'googlebooks'
};

function parseExtraFields(extra) {
	var lines = extra.split(/[\r\n]+/);
	var fields = [];
	for (var i = 0; i < lines.length; i++) {
		var rec = { raw: lines[i] };
		var line = lines[i].trim();
		var splitAt = line.indexOf(':');
		if (splitAt > 1) {
			rec.field = line.substr(0, splitAt).trim();
			rec.value = line.substr(splitAt + 1).trim();
		}
		fields.push(rec);
	}
	return fields;
}

function processExtraFields(item, fields) {
	for (const field of fields) {
		switch (field.field.toLowerCase().replace(/[^a-z ]/g, '')) {
			case "doi":
				if (!item.DOI) item.DOI = field.value;
				break;
			case "isbn":
				if (!item.ISBN) item.ISBN = field.value;
				break;
			case "issn":
				if (!item.ISSN) item.ISSN = field.value;
				break;
			case "abstract":
				if (!item.abstractNote) item.abstractNote = field.value;
				break;
			case "accessed":
				if (!item.accessDate) item.accessDate = field.value;
				break;
			case "application number":
				if (!item.applicationNumber) item.applicationNumber = field.value;
				break;
			case "archive":
				if (!item.archive) item.archive = field.value;
				break;
			case "archive id":
				if (!item.archiveID) item.archiveID = field.value;
				break;
			case "loc in archive":
				if (!item.archiveLocation) item.archiveLocation = field.value;
				break;
			case "medium":
				if (!item.artworkMedium) item.artworkMedium = field.value;
				break;
			case "artwork size":
				if (!item.artworkSize) item.artworkSize = field.value;
				break;
			case "assignee":
				if (!item.assignee) item.assignee = field.value;
				break;
			case "file type":
				if (!item.audioFileType) item.audioFileType = field.value;
				break;
			case "format":
				if (!item.audioRecordingFormat) item.audioRecordingFormat = field.value;
				break;
			case "authority":
				if (!item.authority) item.authority = item.court = item.issuingAuthority = item.legislativeBody = item.organization = field.value;
				break;
			case "bill number":
				if (!item.billNumber) item.billNumber = field.value;
				break;
			case "blog title":
				if (!item.blogTitle) item.blogTitle = field.value;
				break;
			case "book title":
				if (!item.bookTitle) item.bookTitle = field.value;
				break;
			case "call number":
				if (!item.callNumber) item.callNumber = field.value;
				break;
			case "case name":
				if (!item.caseName) item.caseName = field.value;
				break;
			case "citation key":
				if (!item.citationKey) item.citationKey = field.value;
				break;
			case "code":
				if (!item.code) item.code = field.value;
				break;
			case "code number":
				if (!item.codeNumber) item.codeNumber = field.value;
				break;
			case "code pages":
				if (!item.codePages) item.codePages = field.value;
				break;
			case "code volume":
				if (!item.codeVolume) item.codeVolume = field.value;
				break;
			case "committee":
				if (!item.committee) item.committee = field.value;
				break;
			case "company":
				if (!item.company) item.company = field.value;
				break;
			case "conference name":
				if (!item.conferenceName) item.conferenceName = field.value;
				break;
			case "country":
				if (!item.country) item.country = field.value;
				break;
			case "court":
				if (!item.court) item.court = field.value;
				break;
			case "date":
				if (!item.date) item.date = item.dateDecided = item.dateEnacted = item.issueDate = field.value;
				break;
			case "date added":
				if (!item.dateAdded) item.dateAdded = field.value;
				break;
			case "date decided":
				if (!item.dateDecided) item.dateDecided = field.value;
				break;
			case "date enacted":
				if (!item.dateEnacted) item.dateEnacted = field.value;
				break;
			case "modified":
				if (!item.dateModified) item.dateModified = field.value;
				break;
			case "dictionary title":
				if (!item.dictionaryTitle) item.dictionaryTitle = field.value;
				break;
			case "distributor":
				if (!item.distributor) item.distributor = field.value;
				break;
			case "docket number":
				if (!item.docketNumber) item.docketNumber = field.value;
				break;
			case "document number":
				if (!item.documentNumber) item.documentNumber = field.value;
				break;
			case "edition":
				if (!item.edition) item.edition = field.value;
				break;
			case "encyclopedia title":
				if (!item.encyclopediaTitle) item.encyclopediaTitle = field.value;
				break;
			case "episode number":
				if (!item.episodeNumber) item.episodeNumber = field.value;
				break;
			case "filing date":
				if (!item.filingDate) item.filingDate = field.value;
				break;
			case "first page":
				if (!item.firstPage) item.firstPage = field.value;
				break;
			case "format":
				if (!item.format) item.format = field.value;
				break;
			case "forumlistserv title":
				if (!item.forumTitle) item.forumTitle = field.value;
				break;
			case "genre":
				if (!item.genre) item.genre = field.value;
				break;
			case "history":
				if (!item.history) item.history = field.value;
				break;
			case "identifier":
				if (!item.identifier) item.identifier = field.value;
				break;
			case "institution":
				if (!item.institution) item.institution = field.value;
				break;
			case "medium":
				if (!item.interviewMedium) item.interviewMedium = field.value;
				break;
			case "issue":
				if (!item.issue) item.issue = field.value;
				break;
			case "issue date":
				if (!item.issueDate) item.issueDate = field.value;
				break;
			case "issuing authority":
				if (!item.issuingAuthority) item.issuingAuthority = field.value;
				break;
			case "item type":
				if (!item.itemType) item.itemType = field.value;
				break;
			case "journal abbr":
				if (!item.journalAbbreviation) item.journalAbbreviation = field.value;
				break;
			case "label":
				if (!item.label) item.label = field.value;
				break;
			case "language":
				if (!item.language) item.language = field.value;
				break;
			case "legal status":
				if (!item.legalStatus) item.legalStatus = field.value;
				break;
			case "legislative body":
				if (!item.legislativeBody) item.legislativeBody = field.value;
				break;
			case "type":
				if (!item.letterType) item.letterType = field.value;
				break;
			case "library catalogue":
				if (!item.libraryCatalog) item.libraryCatalog = field.value;
				break;
			case "type":
				if (!item.manuscriptType) item.manuscriptType = field.value;
				break;
			case "type":
				if (!item.mapType) item.mapType = field.value;
				break;
			case "medium":
				if (!item.artworkMedium) item.artworkMedium = item.audioFileType = item.audioRecordingFormat = item.format = item.interviewMedium = item.medium = item.videoRecordingFormat = field.value;
				break;
			case "meeting name":
				if (!item.meetingName) item.meetingName = field.value;
				break;
			case "name of act":
				if (!item.nameOfAct) item.nameOfAct = field.value;
				break;
			case "network":
				if (!item.network) item.network = field.value;
				break;
			case " of pages":
				if (!item.numPages) item.numPages = field.value;
				break;
			case "number":
				if (!item.archiveID) item.archiveID = item.billNumber = item.docketNumber = item.documentNumber = item.episodeNumber = item.identifier = item.number = item.patentNumber = item.publicLawNumber = item.reportNumber = field.value;
				break;
			case " of volumes":
				if (!item.numberOfVolumes) item.numberOfVolumes = field.value;
				break;
			case "organization":
				if (!item.organization) item.organization = field.value;
				break;
			case "pages":
				if (!item.codePages) item.codePages = item.firstPage = item.pages = field.value;
				break;
			case "patent number":
				if (!item.patentNumber) item.patentNumber = field.value;
				break;
			case "place":
				if (!item.place) item.place = item.repositoryLocation = field.value;
				break;
			case "post type":
				if (!item.postType) item.postType = field.value;
				break;
			case "type":
				if (!item.presentationType) item.presentationType = field.value;
				break;
			case "priority numbers":
				if (!item.priorityNumbers) item.priorityNumbers = field.value;
				break;
			case "proceedings title":
				if (!item.proceedingsTitle) item.proceedingsTitle = field.value;
				break;
			case "program title":
				if (!item.programTitle) item.programTitle = field.value;
				break;
			case "prog language":
				if (!item.programmingLanguage) item.programmingLanguage = field.value;
				break;
			case "public law number":
				if (!item.publicLawNumber) item.publicLawNumber = field.value;
				break;
			case "publication":
				if (!item.blogTitle) item.blogTitle = item.bookTitle = item.dictionaryTitle = item.encyclopediaTitle = item.forumTitle = item.proceedingsTitle = item.programTitle = item.publicationTitle = item.websiteTitle = field.value;
				break;
			case "publisher":
				if (!item.company) item.company = item.distributor = item.institution = item.label = item.network = item.publisher = item.repository = item.studio = item.university = field.value;
				break;
			case "references":
				if (!item.references) item.references = field.value;
				break;
			case "report number":
				if (!item.reportNumber) item.reportNumber = field.value;
				break;
			case "report type":
				if (!item.reportType) item.reportType = field.value;
				break;
			case "reporter":
				if (!item.reporter) item.reporter = field.value;
				break;
			case "reporter volume":
				if (!item.reporterVolume) item.reporterVolume = field.value;
				break;
			case "repository":
				if (!item.repository) item.repository = field.value;
				break;
			case "repo location":
				if (!item.repositoryLocation) item.repositoryLocation = field.value;
				break;
			case "rights":
				if (!item.rights) item.rights = field.value;
				break;
			case "running time":
				if (!item.runningTime) item.runningTime = field.value;
				break;
			case "scale":
				if (!item.scale) item.scale = field.value;
				break;
			case "section":
				if (!item.section) item.section = field.value;
				break;
			case "series":
				if (!item.series) item.series = field.value;
				break;
			case "series number":
				if (!item.seriesNumber) item.seriesNumber = field.value;
				break;
			case "series text":
				if (!item.seriesText) item.seriesText = field.value;
				break;
			case "series title":
				if (!item.seriesTitle) item.seriesTitle = field.value;
				break;
			case "session":
				if (!item.session) item.session = field.value;
				break;
			case "short title":
				if (!item.shortTitle) item.shortTitle = field.value;
				break;
			case "status":
				if (!item.legalStatus) item.legalStatus = item.status = field.value;
				break;
			case "studio":
				if (!item.studio) item.studio = field.value;
				break;
			case "subject":
				if (!item.subject) item.subject = field.value;
				break;
			case "system":
				if (!item.system) item.system = field.value;
				break;
			case "type":
				if (!item.thesisType) item.thesisType = field.value;
				break;
			case "title":
				if (!item.caseName) item.caseName = item.nameOfAct = item.subject = item.title = field.value;
				break;
			case "type":
				if (!item.genre) item.genre = item.letterType = item.manuscriptType = item.mapType = item.postType = item.presentationType = item.reportType = item.thesisType = item.type = item.websiteType = field.value;
				break;
			case "university":
				if (!item.university) item.university = field.value;
				break;
			case "url":
				if (!item.url) item.url = field.value;
				break;
			case "version":
				if (!item.versionNumber) item.versionNumber = field.value;
				break;
			case "format":
				if (!item.videoRecordingFormat) item.videoRecordingFormat = field.value;
				break;
			case "volume":
				if (!item.codeVolume) item.codeVolume = item.reporterVolume = item.volume = field.value;
				break;
			case "website title":
				if (!item.websiteTitle) item.websiteTitle = field.value;
				break;
			case "website type":
				if (!item.websiteType) item.websiteType = field.value;
				break;
		}
	}
}

function extraFieldsToString(extra) {
	var str = '';
	for (var i = 0; i < extra.length; i++) {
		if (!extra[i].raw) {
			str += '\n' + extra[i].field + ': ' + extra[i].value;
		}
		else {
			str += '\n' + extra[i].raw;
		}
	}

	return str.substr(1);
}

// POTENTIAL ISSUES
// accessDate:"accessDate", //only written on attached webpage snapshots by zotero


var zotero2biblatexTypeMap = {
	book: "book",
	bookSection: "incollection",
	journalArticle: "article",
	magazineArticle: "article",
	newspaperArticle: "article",
	thesis: "thesis",
	letter: "letter",
	manuscript: "unpublished",
	interview: "misc",
	film: "movie",
	artwork: "artwork",
	webpage: "online",
	conferencePaper: "inproceedings",
	report: "report",
	bill: "legislation",
	case: "jurisdiction",
	hearing: "jurisdiction",
	patent: "patent",
	statute: "legislation",
	email: "letter",
	map: "misc",
	blogPost: "online",
	instantMessage: "misc",
	forumPost: "online",
	audioRecording: "audio",
	presentation: "unpublished",
	videoRecording: "video",
	tvBroadcast: "misc",
	radioBroadcast: "misc",
	podcast: "audio",
	computerProgram: "software",
	document: "misc",
	encyclopediaArticle: "inreference",
	dictionaryEntry: "inreference"
};


var alwaysMap = {
	"|": "{\\textbar}",
	"<": "{\\textless}",
	">": "{\\textgreater}",
	"~": "{\\textasciitilde}",
	"^": "{\\textasciicircum}",
	"\\": "{\\textbackslash}",
	"{": "\\{",
	"}": "\\}"
};


// to map ISO language codes (tries to follow IETF RFC5646) to babel
// language codes used in biblatex. Taken from Babel manual 3.9h.
var babelLanguageMap = {
	af: "afrikaans",
	ar: "arabic",
	// bahasa (see malay and indonesian)
	eu: "basque",
	br: "breton",
	bg: "bulgarian",
	ca: "catalan",
	hr: "croatian",
	cz: "czech",
	da: "danish",
	nl: "dutch",
	en: {
		"": "english", // same as american
		US: "american",
		GB: "british",
		CA: "canadian",
		AU: "australian",
		NZ: "newzealand"
	},
	eo: "esperanto",
	et: "estonian",
	// ethiop (package for many languages)
	fa: "farsi",
	fi: "finnish",
	fr: {
		"": "french",
		CA: "canadien"
		// frenchle (a special package)
	},
	fur: "friulan",
	gl: "galician",
	de: {
		"": "german",
		AT: "austrian",
		"DE-1996": "ngerman", // these are valid IETF language codes
		"AT-1996": "naustrian",
		1996: "ngerman"
	},
	el: {
		"": "greek",
		polyton: "polutonikogreek"
	},
	he: "hebrew",
	hi: "hindi",
	is: "icelandic",
	id: "indonesian", // aliases: bahasai, indon
	ia: "interlingua",
	ga: "irish",
	it: "italian",
	ja: "japanese",
	la: "latin",
	lv: "latvian",
	lt: "lithuanian",
	dsb: "lowersorbian",
	hu: "magyar",
	zlm: "malay", // aliases: bahasam, melayu (currently, there's no
	// real difference between bahasam and bahasai in babel)
	mn: "mongolian",
	se: "samin",
	nn: "nynorsk", // nynorsk
	nb: "norsk", // bokmål
	no: "norwegian", // "no" could be used, norwegian is an alias for "norsk" in babel
	zh: {
		"": "pinyin", // only supported chinese in babel is the romanization pinyin?
		Latn: "pinyin"
	},
	pl: "polish",
	pt: {
		"": "portuguese",
		PT: "portuguese",
		BR: "brazil"
	},
	ro: "romanian",
	rm: "romansh",
	ru: "russian",
	gd: "scottish",
	sr: {
		"": "serbian", // latin script as default?
		Cyrl: "serbianc",
		Latn: "serbian",
	},
	sk: "slovak",
	sl: "slovene",
	// spanglish (pseudo language)
	es: "spanish",
	sv: "swedish",
	th: "thaicjk", // thaicjk preferred?
	tr: "turkish",
	tk: "turkmen",
	uk: "ukrainian",
	hsb: "uppersorbian",
	vi: "vietnamese",
	cy: "welsh",
};


// some fields are, in fact, macros.  If that is the case then we should not put the
// data in the braces as it will cause the macros to not expand properly
function writeField(field, value, isMacro, noEscape) {
	if (!value && typeof value != "number") return;
	value += ""; // convert integers to strings
	Zotero.write(",\n\t" + field + " = ");
	if (!isMacro) Zotero.write("{");
	// url field is preserved, for use with \href and \url
	// Other fields (DOI?) may need similar treatment
	if (!noEscape && !isMacro && !(field == "url" || field == "doi" || field == "file" || field == "lccn")) {
		// var titleCase = isTitleCase(value);	//figure this out before escaping all the characters
		// I hope these are all the escape characters! (except for < > which are handled later)
		value = value.replace(/[|~^\\{}]/g, mapEscape).replace(/[#$%&_]/g, "\\$&");
		// convert the HTML markup allowed in Zotero for rich text to TeX
		value = mapHTMLmarkup(value);
		// escape < > if mapHTMLmarkup did not convert some
		value = value.replace(/[<>]/g, mapEscape);


		// Case of words with uppercase characters in non-initial positions is preserved with braces.
		// we're looking at all unicode letters
		var protectCaps = new ZU.XRegExp("\\b\\p{Letter}+\\p{Uppercase_Letter}\\p{Letter}*", 'g');
		if (field != "pages") {
			value = ZU.XRegExp.replace(value, protectCaps, "{$0}");
		}

		// Page ranges should use double dash
		if (field == "pages") {
			value = value.replace(/[-\u2012-\u2015\u2053]+/g, "--");
		}
	}
	// we write utf8
	// convert the HTML markup allowed in Zotero for rich text to TeX; excluding doi/url/file shouldn't be necessary, but better to be safe;
	if (!((field == "url") || (field == "doi") || (field == "file"))) value = mapHTMLmarkup(value);
	Zotero.write(value);
	if (!isMacro) Zotero.write("}");
}

function mapHTMLmarkup(characters) {
	// converts the HTML markup allowed in Zotero for rich text to TeX
	// since  < and > have already been escaped, we need this rather hideous code - I couldn't see a way around it though.
	// italics and bold
	characters = characters.replace(/\{\\textless\}i\{\\textgreater\}(((?!\{\\textless\}\/i{\\textgreater\}).)+)\{\\textless\}\/i{\\textgreater\}/g, "\\textit{$1}").replace(/\{\\textless\}b\{\\textgreater\}(((?!\{\\textless\}\/b{\\textgreater\}).)+)\{\\textless\}\/b{\\textgreater\}/g, "\\textbf{$1}");
	// sub and superscript
	characters = characters.replace(/\{\\textless\}sup\{\\textgreater\}(((?!\{\\textless\}\/sup\{\\textgreater\}).)+)\{\\textless\}\/sup{\\textgreater\}/g, "$^{\\textrm{$1}}$").replace(/\{\\textless\}sub\{\\textgreater\}(((?!\{\\textless\}\/sub\{\\textgreater\}).)+)\{\\textless\}\/sub\{\\textgreater\}/g, "$_{\\textrm{$1}}$");
	// two variants of small caps
	characters = characters.replace(/\{\\textless\}span\sstyle="small-caps"\{\\textgreater\}(((?!\{\\textless\}\/span\{\\textgreater\}).)+)\{\\textless\}\/span{\\textgreater\}/g, "\\textsc{$1}").replace(/\{\\textless\}sc\{\\textgreater\}(((?!\{\\textless\}\/sc\{\\textgreater\}).)+)\{\\textless\}\/sc\{\\textgreater\}/g, "\\textsc{$1}");
	return characters;
}

function mapEscape(character) {
	return alwaysMap[character];
}

// a little substitution function for BibTeX keys, where we don't want LaTeX
// escaping, but we do want to preserve the base characters

function tidyAccents(s) {
	var r = s.toLowerCase();

	// XXX Remove conditional when we drop Zotero 2.1.x support
	// This is supported in Zotero 3.0 and higher
	if (ZU.removeDiacritics !== undefined) {
		r = ZU.removeDiacritics(r, true);
	}
	else {
		// We fall back on the replacement list we used previously
		r = r.replace(new RegExp("[ä]", 'g'), "ae");
		r = r.replace(new RegExp("[ö]", 'g'), "oe");
		r = r.replace(new RegExp("[ü]", 'g'), "ue");
		r = r.replace(new RegExp("[àáâãå]", 'g'), "a");
		r = r.replace(new RegExp("æ", 'g'), "ae");
		r = r.replace(new RegExp("ç", 'g'), "c");
		r = r.replace(new RegExp("[èéêë]", 'g'), "e");
		r = r.replace(new RegExp("[ìíîï]", 'g'), "i");
		r = r.replace(new RegExp("ñ", 'g'), "n");
		r = r.replace(new RegExp("[òóôõ]", 'g'), "o");
		r = r.replace(new RegExp("œ", 'g'), "oe");
		r = r.replace(new RegExp("[ùúû]", 'g'), "u");
		r = r.replace(new RegExp("[ýÿ]", 'g'), "y");
	}

	return r;
}

var numberRe = /^[0-9]+/;
// Below is a list of words that should not appear as part of the citation key
// it includes the indefinite articles of English, German, French and Spanish, as well as a small set of English prepositions whose
// force is more grammatical than lexical, i.e. which are likely to strike many as 'insignificant'.
// The assumption is that most who want a title word in their key would prefer the first word of significance.
var citeKeyTitleBannedRe = /\b(a|an|the|some|from|on|in|to|of|do|with|der|die|das|ein|eine|einer|eines|einem|einen|un|une|la|le|l'|el|las|los|al|uno|una|unos|unas|de|des|del|d')(\s+|\b)|(<\/?(i|b|sup|sub|sc|span style="small-caps"|span)>)/g;
var citeKeyConversionsRe = /%([a-zA-Z])/;

var citeKeyConversions = {
	a: function (flags, item) {
		if (item.creators && item.creators[0] && item.creators[0].lastName) {
			return item.creators[0].lastName.toLowerCase().replace(/ /g, "_").replace(/,/g, "");
		}
		return "noauthor";
	},
	t: function (flags, item) {
		if (item.title) {
			return item.title.toLowerCase().replace(citeKeyTitleBannedRe, "").split(/\s+/g)[0];
		}
		return "notitle";
	},
	y: function (flags, item) {
		if (item.date) {
			var date = Zotero.Utilities.strToDate(item.date);
			if (date.year && numberRe.test(date.year)) {
				return date.year;
			}
		}
		return "nodate";
	}
};

// checks whether an item contains any creator of type ctype
function creatorCheck(item, ctype) {
	if (item.creators && item.creators.length) {
		for (var i = 0; i < item.creators.length; i++) {
			if (item.creators[i].creatorType == ctype) {
				return true; // found a ctype creator
			}
		}
	}
	// didn't find any ctype creator (or no creators at all)
	return false;
}

function buildCiteKey(item, extraFields, citekeys) {
	if (extraFields) {
		const citationKey = extraFields.findIndex(field => field.field && field.value && field.field.toLowerCase() === 'citation key');
		if (citationKey >= 0) return extraFields.splice(citationKey, 1)[0].value;
	}

	if (item.citationKey) return item.citationKey;

	var basekey = "";
	var counter = 0;
	var citeKeyFormatRemaining = citeKeyFormat;
	while (citeKeyConversionsRe.test(citeKeyFormatRemaining)) {
		if (counter > 100) {
			Zotero.debug("Pathological BibTeX format: " + citeKeyFormat);
			break;
		}
		var m = citeKeyFormatRemaining.match(citeKeyConversionsRe);
		if (m.index > 0) {
			// add data before the conversion match to basekey
			basekey += citeKeyFormatRemaining.substr(0, m.index);
		}
		var flags = ""; // for now
		var f = citeKeyConversions[m[1]];
		if (typeof (f) == "function") {
			var value = f(flags, item);
			Zotero.debug("Got value " + value + " for %" + m[1]);
			// add conversion to basekey
			basekey += value;
		}
		citeKeyFormatRemaining = citeKeyFormatRemaining.substr(m.index + m.length);
		counter++;
	}
	if (citeKeyFormatRemaining.length > 0) {
		basekey += citeKeyFormatRemaining;
	}

	// for now, remove any characters not explicitly known to be allowed;
	// we might want to allow UTF-8 citation keys in the future, depending
	// on implementation support.
	//
	// no matter what, we want to make sure we exclude
	// " # % ' ( ) , = { } ~ and backslash
	// however, we want to keep the base characters

	basekey = tidyAccents(basekey);
	// use legacy pattern for all old items to not break existing usages
	var citeKeyCleanRe = /[^a-z0-9!$&*+\-./:;<>?[\]^_`|]+/g;
	// but use the simple pattern for all newly added items
	// or always if the hiddenPref is set
	// extensions.zotero.translators.BibLaTeX.export.simpleCitekey
	if ((Zotero.getHiddenPref && Zotero.getHiddenPref('BibLaTeX.export.simpleCitekey'))
			|| (item.dateAdded && parseInt(item.dateAdded.substr(0, 4)) >= 2020)) {
		citeKeyCleanRe = /[^a-z0-9_-]/g;
	}
	basekey = basekey.replace(citeKeyCleanRe, "");
	var citekey = basekey;
	var i = 0;
	while (citekeys[citekey]) {
		i++;
		citekey = basekey + "-" + i;
	}
	citekeys[citekey] = true;
	return citekey;
}

var filePathSpecialChars = '\\\\:;{}$'; // $ for Mendeley
var encodeFilePathRE = new RegExp('[' + filePathSpecialChars + ']', 'g');

function encodeFilePathComponent(value) {
	if (!value) return '';
	return value.replace(encodeFilePathRE, "\\$&");
}

// We strip out {} in general, because \{ and \} break BibLaTeX
function cleanFilePath(str) {
	if (!str) return '';
	return str.replace(/(?:\s*[{}]+)+\s*/g, ' ');
}

function doExport() {
	// Zotero.write("% biblatex export generated by Zotero "+Zotero.Utilities.getVersion());
	// to make sure the BOM gets ignored
	Zotero.write("\n");

	var first = true;
	var citekeys = {};
	var item;
	// eslint-disable-next-line no-cond-assign
	while (item = Zotero.nextItem()) {
		// don't export standalone notes and attachments
		if (item.itemType == "note" || item.itemType == "attachment") continue;

		var noteused = false; // a switch for keeping track whether the
		// field "note" has been written to
		// determine type
		var type = zotero2biblatexTypeMap[item.itemType];
		if (typeof (type) == "function") {
			type = type(item);
		}

		// inbook is reasonable at times, using a bookauthor should
		// indicate this
		if (item.itemType == "bookSection"
			&& creatorCheck(item, "bookAuthor")) type = "inbook";

		// a book without author but with editors is a collection
		if (item.itemType == "book" && !creatorCheck(item, "author")
			&& creatorCheck(item, "editor")) type = "collection";

		// biblatex recommends us to use mvbook for multi-volume book
		// i.e. a book with "# of vols" filled
		if (type == "book" && item.numberOfVolumes) type = "mvbook";

		if (!type) type = "misc";

		var extraFields = item.extra ? parseExtraFields(item.extra) : null;
		var citekey = buildCiteKey(item, extraFields, citekeys);
		processExtraFields(item, extraFields);

		// write citation key (removed the comma)
		Zotero.write((first ? "" : "\n\n") + "@" + type + "{" + citekey);
		first = false;

		for (var field in fieldMap) {
			if (item[fieldMap[field]]) {
				writeField(field, item[fieldMap[field]]);
			}
		}

		// Fields needing special treatment and not easily translatable via fieldMap
		// e.g. where fieldname translation is dependent upon type, or special transformations
		// has to be made

		// all kinds of numbers except patents, which need post-processing
		if (item.reportNumber || item.seriesNumber || item.billNumber || item.episodeNumber || item.number && !item.patentNumber) {
			writeField("number", item.reportNumber || item.seriesNumber || item.billNumber || item.episodeNumber || item.number);
		}

		// split numeric and nonnumeric issue specifications (for journals) into "number" and "issue"
		if (item.issue) { // issue
			var jnumber = parseInt(item.issue);
			if (!isNaN(jnumber)) {
				writeField("number", jnumber);
			}
			else {
				writeField("issue", item.issue);
			}
		}


		// publicationTitles and special titles
		if (item.publicationTitle) {
			if (item.itemType == "bookSection" || item.itemType == "conferencePaper" || item.itemType == "dictionaryEntry" || item.itemType == "encyclopediaArticle") {
				writeField("booktitle", item.publicationTitle);
			}
			else if (item.itemType == "magazineArticle" || item.itemType == "newspaperArticle") {
				writeField("journaltitle", item.publicationTitle);
			}
			else if (item.itemType == "journalArticle") {
				if (Zotero.getOption("useJournalAbbreviation") && item.journalAbbreviation) {
					writeField("journaltitle", item.journalAbbreviation);
				}
				else {
					writeField("journaltitle", item.publicationTitle);
					writeField("shortjournal", item.journalAbbreviation);
				}
			}
		}

		if (item.websiteTitle || item.forumTitle || item.blogTitle || item.programTitle) {
			writeField("titleaddon", item.websiteTitle || item.forumTitle || item.blogTitle || item.programTitle);
		}


		// publishers
		if (item.publisher) {
			if (item.itemType == "thesis" || item.itemType == "report") {
				writeField("institution", item.publisher);
			}
			else {
				writeField("publisher", item.publisher);
			}
		}

		// things concerning "type"
		if (item.itemType == "letter") {
			if (item.letterType) {
				writeField("type", item.letterType);
			}
			else {
				writeField("type", "Letter"); // this isn't optimal, perhaps later versions of biblatex will add some suitable localization key
			}
		}
		else if (item.itemType == "email") {
			writeField("type", "E-mail");
		}
		else if (item.itemType == "thesis"
					&& (!item.thesisType || item.thesisType.search(/ph\.?d/i) != -1)) {
			writeField("type", "phdthesis");
		}
		else if (item.manuscriptType || item.thesisType || item.websiteType || item.presentationType || item.reportType || item.mapType) {
			writeField("type", item.manuscriptType || item.thesisType || item.websiteType || item.presentationType || item.reportType || item.mapType);
		}
		else if (item.itemType == "patent") {
			// see https://tex.stackexchange.com/questions/447383/biblatex-biber-patent-citation-support-based-on-zoterobbl-output/447508
			if (!item.patentNumber) {
				writeField("type", "patent");
			}
			else if (item.patentNumber.startsWith("US")) {
				writeField("type", "patentus");
				writeField("number", item.patentNumber.replace(/^US/, ""));
			}
			else if (item.patentNumber.startsWith("EP")) {
				writeField("type", "patenteu");
				writeField("number", item.patentNumber.replace(/^EP/, ""));
			}
			else if (item.patentNumber.startsWith("GB")) {
				writeField("type", "patentuk");
				writeField("number", item.patentNumber.replace(/^GB/, ""));
			}
			else if (item.patentNumber.startsWith("DE")) {
				writeField("type", "patentde");
				writeField("number", item.patentNumber.replace(/^DE/, ""));
			}
			else if (item.patentNumber.startsWith("FR")) {
				writeField("type", "patentfr");
				writeField("number", item.patentNumber.replace(/^FR/, ""));
			}
			else {
				writeField("type", "patent");
				writeField("number", item.patentNumber);
			}
		}

		if (item.presentationType || item.manuscriptType) {
			writeField("howpublished", item.presentationType || item.manuscriptType);
		}

		// case of specific eprint-archives in archive-fields
		if (item.archive && item.archiveLocation) {
			if (item.archive == "arXiv" || item.archive == "arxiv") {
				writeField("eprinttype", "arxiv");
				writeField("eprint", item.archiveLocation);
				if (item.callNumber) { // assume call number is used for arxiv class
					writeField("eprintclass", item.callNumber);
				}
			}
			else if (item.archive == "JSTOR" || item.archive == "jstor") {
				writeField("eprinttype", "jstor");
				writeField("eprint", item.archiveLocation);
			}
			else if (item.archive == "PubMed" || item.archive == "pubmed") {
				writeField("eprinttype", "pubmed");
				writeField("eprint", item.archiveLocation);
			}
			else if (item.archive == "HDL" || item.archive == "hdl") {
				writeField("eprinttype", "hdl");
				writeField("eprint", item.archiveLocation);
			}
			else if (item.archive == "googlebooks" || item.archive == "Google Books") {
				writeField("eprinttype", "googlebooks");
				writeField("eprint", item.archiveLocation);
			}
		}

		// presentations have a meetingName field which we want to
		// map to note
		if (item.meetingName) {
			writeField("note", item.meetingName);
			noteused = true;
		}

		if (item.creators && item.creators.length) {
			// split creators into subcategories
			var author = "";
			var bookauthor = "";
			var commentator = "";
			var editor = "";
			var editora = "";
			var editorb = "";
			var holder = "";
			var translator = "";
			var noEscape = false;

			for (let i = 0; i < item.creators.length; i++) {
				var creator = item.creators[i];
				var creatorString;

				if (creator.firstName) {
					var fname = creator.firstName.split(/\s*,!?\s*/);
					fname.push(fname.shift()); // If we have a Jr. part(s), it should precede first name
					creatorString = creator.lastName + ", " + fname.join(', ');
				}
				else {
					creatorString = creator.lastName;
				}

				creatorString = creatorString.replace(/[|<>~^\\{}]/g, mapEscape)
					.replace(/([#$%&_])/g, "\\$1");

				if (creator.fieldMode == true) { // fieldMode true, assume corporate author
					creatorString = "{" + creatorString + "}";
					noEscape = true;
				}
				else {
					creatorString = creatorString.replace(/ (and) /gi, ' {$1} ');
				}

				if (creator.creatorType == "author" || creator.creatorType == "interviewer" || creator.creatorType == "inventor" || creator.creatorType == "director" || creator.creatorType == "programmer" || creator.creatorType == "artist" || creator.creatorType == "podcaster" || creator.creatorType == "presenter") {
					author += " and " + creatorString;
				}
				else if (creator.creatorType == "bookAuthor") {
					bookauthor += " and " + creatorString;
				}
				else if (creator.creatorType == "commenter") {
					commentator += " and " + creatorString;
				}
				else if (creator.creatorType == "editor") {
					editor += " and " + creatorString;
				}
				else if (creator.creatorType == "translator") {
					translator += " and " + creatorString;
				}
				else if (creator.creatorType == "seriesEditor") { // let's call them redacors
					editorb += " and " + creatorString;
				}
				else { // the rest into editora with editoratype = collaborator
					editora += " and " + creatorString;
				}
			}

			// remove first " and " string
			if (author) {
				writeField("author", author.substr(5), false, noEscape);
			}
			if (bookauthor) {
				writeField("bookauthor", bookauthor.substr(5), false, noEscape);
			}
			if (commentator) {
				writeField("commentator", commentator.substr(5), false, noEscape);
			}
			if (editor) {
				writeField("editor", editor.substr(5), false, noEscape);
			}
			if (editora) {
				writeField("editora", editora.substr(5), false, noEscape);
				writeField("editoratype", "collaborator");
			}
			if (editorb) {
				writeField("editorb", editorb.substr(5), false, noEscape);
				writeField("editorbtype", "redactor");
			}
			if (holder) {
				writeField("holder", holder.substr(5), false, noEscape);
			}
			if (translator) {
				writeField("translator", translator.substr(5), false, noEscape);
			}
		}

		if (item.accessDate) {
			writeField("urldate", Zotero.Utilities.strToISO(item.accessDate));
		}

		// TODO enable handling of date ranges when that's added to zotero
		if (item.date) {
			writeField("date", Zotero.Utilities.strToISO(item.date));
		}

		// Map Languages to biblatex-field "langid" (used for
		// hyphenation with a correct setting of the "autolang" option)
		// if possible. See babelLanguageMap above for languagecodes to use
		if (item.language) {
			var langcode = item.language.match(/^([a-z]{2,3})(?:[^a-z](.+))?$/i); // not too strict
			if (langcode) {
				var lang = babelLanguageMap[langcode[1]];
				if (typeof lang == 'string') {
					// if there are no variants for this language
					writeField("langid", lang);
				}
				else if (typeof lang == 'object') {
					var variant = lang[langcode[2]];
					if (variant) {
						writeField("langid", variant);
					}
					else {
						writeField("langid", lang[""]); // use default variant
					}
				}
			}
		}

		if (extraFields) {
			// Export identifiers
			// Dedicated fields
			for (let i = 0; i < extraFields.length; i++) {
				var rec = extraFields[i];
				if (!rec.field) continue;

				if (!revExtraIds[rec.field] && !revEprintIds[rec.field]) continue;

				var value = rec.value.trim();
				if (!value) continue;

				var label = revExtraIds[rec.field];
				if (label) {
					writeField(label, '{' + value + '}', true);
				}
				else {
					label = revEprintIds[rec.field];
					if (label) {
						writeField('eprinttype', label);
						writeField('eprint', '{' + value + '}', true);
					}
				}
				extraFields.splice(i, 1);
				i--;
			}

			var extra = extraFieldsToString(extraFields);
			if (extra && !noteused) writeField("note", extra);
		}

		if (item.tags && item.tags.length) {
			var tagString = "";
			for (let i = 0; i < item.tags.length; i++) {
				tagString += ", " + item.tags[i].tag;
			}
			writeField("keywords", tagString.substr(2));
		}


		if (item.notes && Zotero.getOption("exportNotes")) {
			for (let i = 0; i < item.notes.length; i++) {
				var note = item.notes[i];
				writeField("annotation", Zotero.Utilities.unescapeHTML(note.note));
			}
		}

		if (item.attachments) {
			var attachmentString = "";

			for (let i = 0; i < item.attachments.length; i++) {
				var attachment = item.attachments[i];
				var title = cleanFilePath(attachment.title),
					path = null;

				if (Zotero.getOption("exportFileData") && attachment.saveFile) {
					path = cleanFilePath(attachment.defaultPath);
					attachment.saveFile(path, true);
				}
				else if (attachment.localPath) {
					path = cleanFilePath(attachment.localPath);
				}

				if (path) {
					attachmentString += ";" + encodeFilePathComponent(title)
						+ ":" + encodeFilePathComponent(path)
						+ ":" + encodeFilePathComponent(attachment.mimeType);
				}
			}

			if (attachmentString) {
				writeField("file", attachmentString.substr(1));
			}
		}

		Zotero.write(",\n}");
	}

	Zotero.write("\n");
}
