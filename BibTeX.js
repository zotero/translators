{
	"translatorID": "9cb70025-a888-4a29-a210-93ec52da40d4",
	"label": "BibTeX",
	"creator": "Simon Kornblith, Richard Karnesky and Emiliano heyns",
	"target": "bib",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 200,
	"configOptions": {
		"async": true,
		"getCollections": true
	},
	"displayOptions": {
		"exportCharset": "UTF-8",
		"exportNotes": true,
		"exportFileData": false,
		"useJournalAbbreviation": false
	},
	"inRepository": true,
	"translatorType": 3,
	"lastUpdated": "2024-03-25 14:51:02"
}

/*
   BibTeX Translator
   Copyright (C) 2019 CHNM, Simon Kornblith, Richard Karnesky and Emiliano heyns

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

function detectImport() {
	var maxChars = 1048576; // 1MB
	
	var inComment = false;
	var block = "";
	var buffer = "";
	var chr = "";
	var charsRead = 0;
	
	var re = /^\s*@[a-zA-Z]+[\(\{]/;
	while ((buffer = Zotero.read(4096)) && charsRead < maxChars) {
		Zotero.debug("Scanning " + buffer.length + " characters for BibTeX");
		charsRead += buffer.length;
		for (var i=0; i<buffer.length; i++) {
			chr = buffer[i];
			
			if (inComment && chr != "\r" && chr != "\n") {
				continue;
			}
			inComment = false;
			
			if (chr == "%") {
				// read until next newline
				block = "";
				inComment = true;
			} else if ((chr == "\n" || chr == "\r"
				// allow one-line entries
						|| i == (buffer.length - 1))
						&& block) {
				// check if this is a BibTeX entry
				if (re.test(block)) {
					return true;
				}
				
				block = "";
			} else if (!" \n\r\t".includes(chr)) {
				block += chr;
			}
		}
	}
}

//%a = first listed creator surname
//%y = year
//%t = first word of title
var citeKeyFormat = "%a_%t_%y";

var fieldMap = {
	address:"place",
	chapter:"section",
	edition:"edition",
	type:"type",
	series:"series",
	title:"title",
	volume:"volume",
	copyright:"rights",
	isbn:"ISBN",
	issn:"ISSN",
	shorttitle:"shortTitle",
	url:"url",
	doi:"DOI",
	abstract:"abstractNote",
  	nationality: "country",
  	language:"language",
  	assignee:"assignee"
};

// Fields for which upper case letters will be protected on export
var caseProtectedFields = [
	"title",
	"type",
	"shorttitle",
	"booktitle",
	"series"
];

// Import/export in BibTeX
var extraIdentifiers = {
	lccn: 'LCCN',
	mrnumber: 'MR',
	zmnumber: 'Zbl',
	pmid: 'PMID',
	pmcid: 'PMCID'
	
	//Mostly from Wikipedia citation templates
	//asin - Amazon ID
	//bibcode/refcode - used in astronomy, but haven't seen any Bib(La)TeX examples
	//jfm - Jahrbuch ID, but it seems to be part of Zentralblatt MATH, so Zbl
	//oclc
	//ol - openlibrary.org ID
	//osti
	//rfc
	//ssrn? http://cyber.law.harvard.edu/cybersecurity/Guidelines_for_adding_Bibliography_entries
};

// Make a reverse map for convenience with additional DOI handling
var revExtraIds = {'DOI': 'doi'};
for (var field in extraIdentifiers) {
	revExtraIds[extraIdentifiers[field]] = field;
}

// Import only. Exported by BibLaTeX
var eprintIds = {
	// eprinttype: Zotero label
	
	// From BibLaTeX manual
	'arxiv': 'arXiv', // Sorry, but no support for eprintclass yet
	'jstor': 'JSTOR',
	'pubmed': 'PMID',
	'hdl': 'HDL',
	'googlebooks': 'GoogleBooksID'
};

function dateFieldsToDate(year, month, day) {
	// per the latest ISO 8601 standard, you can't have a month/day without a
	// year (and it would be silly anyway)
	if (year) {
		let date = year;
		if (month) {
			if (month.includes(date)) {
				date = month;
			}
			else {
				date += `-${month}`;
			}
			
			if (day) {
				date += `-${day}`;
			}
		}
		return ZU.strToISO(date);
	}
	return false;
}

function parseExtraFields(extra) {
	var lines = extra.split(/[\r\n]+/);
	var fields = [];
	for (var i=0; i<lines.length; i++) {
		var rec = { raw: lines[i] };
		var line = lines[i].trim();
		var splitAt = line.indexOf(':');
		if (splitAt > 1) {
			rec.field = line.substr(0,splitAt).trim();
			rec.value = line.substr(splitAt + 1).trim();
		}
		fields.push(rec);
	}
	return fields;
}

function extraFieldsToString(extra) {
	var str = '';
	for (var i=0; i<extra.length; i++) {
		if (!extra[i].raw) {
			str += '\n' + extra[i].field + ': ' + extra[i].value;
		} else {
			str += '\n' + extra[i].raw;
		}
	}
	
	return str.substr(1);
}

var inputFieldMap = {
	booktitle :"publicationTitle",
	school:"publisher",
	publisher:"publisher",
	issue:"issue",
	// import also BibLaTeX fields:
	journaltitle:"publicationTitle",
	shortjournal:"journalAbbreviation",
	eventtitle:"conferenceName",
	pagetotal:"numPages",
	version:"version"
};

var zotero2bibtexTypeMap = {
	"book":"book",
	"bookSection":"incollection",
	"journalArticle":"article",
	"magazineArticle":"article",
	"newspaperArticle":"article",
	"thesis":"phdthesis",
	"letter":"misc",
	"manuscript":"unpublished",
	"patent" :"patent",
	"interview":"misc",
	"film":"misc",
	"artwork":"misc",
	"webpage":"misc",
	"conferencePaper":"inproceedings",
	"report":"techreport"
};

var bibtex2zoteroTypeMap = {
	"book":"book", // or booklet, proceedings
	"inbook":"bookSection",
	"incollection":"bookSection",
	"article":"journalArticle", // or magazineArticle or newspaperArticle
	"patent" :"patent",
	"phdthesis":"thesis",
	"unpublished":"manuscript",
	"inproceedings":"conferencePaper", // check for conference also
	"conference":"conferencePaper",
	"techreport":"report",
	"booklet":"book",
	"manual":"book",
	"mastersthesis":"thesis",
	"misc":"document",
	"proceedings":"book",
	"online":"webpage",
	// alias for online from BibLaTeX:
	"electronic":"webpage",
	// from BibLaTeX translator:
	"thesis":"thesis",
	"letter":"letter",
	"movie":"film",
	"artwork":"artwork",
	"report":"report",
	"legislation":"bill",
	"jurisdiction":"case",
	"audio":"audioRecording",
	"video":"videoRecording",
	"software":"computerProgram",
	"inreference":"encyclopediaArticle",
	"collection":"book",
	"mvbook":"book"
};

/*
 * three-letter month abbreviations. i assume these are the same ones that the
 * docs say are defined in some appendix of the LaTeX book. (i don't have the
 * LaTeX book.)
 */
var months = ["jan", "feb", "mar", "apr", "may", "jun",
			  "jul", "aug", "sep", "oct", "nov", "dec"];

var jabref = {
	format: null,
	root: {}
};

var alwaysMap = {
	"|":"{\\textbar}",
	"<":"{\\textless}",
	">":"{\\textgreater}",
	"~":"{\\textasciitilde}",
	"^":"{\\textasciicircum}",
	"\\":"{\\textbackslash}",
	// See http://tex.stackexchange.com/questions/230750/open-brace-in-bibtex-fields/230754
	"{" : "\\{\\vphantom{\\}}",
	"}" : "\\vphantom{\\{}\\}"
};


var strings = {};
var keyRe = /[a-zA-Z0-9\-]/;

// Split keywords on space by default when called from another translator
// This is purely for historical reasons. Otherwise we risk breaking tag import
// from some websites
var keywordSplitOnSpace = !!Zotero.parentTranslator;
var keywordDelimRe = /\s*[,;]\s*/;

function setKeywordSplitOnSpace( val ) {
	keywordSplitOnSpace = val;
}

function setKeywordDelimRe( val, flags ) {
	//expect string, but it could be RegExp
	if (typeof(val) != 'string') {
		val = val.toString();
		flags = val.slice(val.lastIndexOf('/')+1);
		val = val.slice(1, val.lastIndexOf('/'));
	}
	
	keywordDelimRe = new RegExp(val, flags);
}

function processField(item, field, value, rawValue) {
	if (Zotero.Utilities.trim(value) == '') return null;
	if (fieldMap[field]) {
		//map DOIs + Label to Extra for unsupported item types
		if (field == "doi" &&!ZU.fieldIsValidForType("DOI", item.itemType) && ZU.cleanDOI(value)) {
			item._extraFields.push({field: "DOI", value: ZU.cleanDOI(value)});
		}
		if (field == "url") { // pass raw values for URL
			item.url = rawValue;	
		}
		else {
			item[fieldMap[field]] = value;
		}
	} else if (inputFieldMap[field]) {
		item[inputFieldMap[field]] = value;
	} else if (field == "subtitle") {
		if (!item.title) item.title = '';
		item.title = item.title.trim();
		value = value.trim();
		
		if (!/[-–—:!?.;]$/.test(item.title)
			&& !/^[-–—:.;¡¿]/.test(value)
		) {
			item.title += ': ';
		} else if (item.title.length) {
			item.title += ' ';
		}
		
		item.title += value;
	} else if (field == "journal") {
		if (item.publicationTitle) {
			item.journalAbbreviation = value;
		} else {
			item.publicationTitle = value;
		}
	} else if (field == "fjournal") {
		if (item.publicationTitle) {
			// move publicationTitle to abbreviation, since it probably came from 'journal'
			item.journalAbbreviation = item.publicationTitle;
		}
		item.publicationTitle = value;
	} else if (field == "author" || field == "editor" || field == "translator") {
		// parse authors/editors/translators
		var names = splitUnprotected(rawValue.trim(), /\s+and\s+/gi);
		for (var i in names) {
			var name = names[i];
			// skip empty names
			if (!name) continue;
			
			// Names in BibTeX can have three commas
			var pieces = splitUnprotected(name, /\s*,\s*/g);
			var creator = {};
			if (pieces.length > 1) {
				creator.firstName = pieces.pop();
				creator.lastName = unescapeBibTeX(pieces.shift());
				if (pieces.length) {
					// If anything is left, it should only be the 'Jr' part
					creator.firstName += ', ' + pieces.join(', ');
				}
				creator.firstName = unescapeBibTeX(creator.firstName);
				creator.creatorType = field;
			} else if (splitUnprotected(name, / +/g).length > 1){
				creator = Zotero.Utilities.cleanAuthor(unescapeBibTeX(name), field, false);
			} else {
				creator = {
					lastName: unescapeBibTeX(name),
					creatorType: field,
					fieldMode: 1
				};
			}
			item.creators.push(creator);
		}
	} else if (field == "institution" || field == "organization") {
		item.backupPublisher = value;
	} else if (field == "location") {
		item.backupLocation = value;
	} else if (field == "number") { // fix for techreport
		if (item.itemType == "report") {
			item.reportNumber = value;
		} else if (item.itemType == "book" || item.itemType == "bookSection") {
			item.seriesNumber = value;
		} else if (item.itemType == "patent"){
			item.patentNumber = value;
		} else {
			item.issue = value;
		}
	} else if (field == "day") {
		// this and the following two blocks assign to temporary fields that
		// are cleared before the item is completed. "day" isn't an official
		// field, but some sites use it.
		item.day = value;
	} else if (field == "month") {
		var monthIndex = months.indexOf(value.toLowerCase());
		if (monthIndex != -1) {
			value = Zotero.Utilities.formatDate({month:monthIndex});
		}
		
		item.month = value;
	} else if (field == "year") {
		item.year = value;
	} else if (field == "date") {
	//We're going to assume that "date" and the date parts don't occur together. If they do, we pick date, which should hold all.
		item.date = value;
	} else if (field == "pages") {
		if (item.itemType == "book" || item.itemType == "thesis" || item.itemType == "manuscript") {
			item.numPages = value;
		}
		else {
			item.pages = value.replace(/--/g, "-");
		}
	} else if (field == "note") {
		var isExtraId = false;
		for (var element in extraIdentifiers) {
			if (value.trim().startsWith(extraIdentifiers[element])) {
				isExtraId = true;
			}
		}
		if (isExtraId) {
			item._extraFields.push({raw: value.trim()});
		} else {
			item.notes.push({note:Zotero.Utilities.text2html(value)});
		}
	} else if (field == "howpublished") {
		if (value.length >= 7) {
			var str = value.substr(0, 7);
			if (str == "http://" || str == "https:/" || str == "mailto:") {
				item.url = value;
			} else {
				item._extraFields.push({field: 'Published', value: value});
			}
		}
	
	}
	//accept lastchecked or urldate for access date. These should never both occur.
	//If they do we don't know which is better so we might as well just take the second one
	else if (field == "lastchecked"|| field == "urldate"){
		item.accessDate = value;
	} else if (field == "keywords" || field == "keyword") {
		item.tags = value.split(keywordDelimRe);
		if (item.tags.length == 1 && keywordSplitOnSpace) {
			item.tags = value.split(/\s+/);
		}
	} else if (field == "comment" || field == "annote" || field == "review" || field == "notes") {
		item.notes.push({note:Zotero.Utilities.text2html(value)});
	} else if (field == "pdf" || field == "path" /*Papers2 compatibility*/) {
		item.attachments.push({path:value, mimeType:"application/pdf"});
	} else if (field == "sentelink") { // the reference manager 'Sente' has a unique file scheme in exported BibTeX; it can occur multiple times
		item.attachments.push({path:value.split(",")[0], mimeType:"application/pdf"});
	} else if (field == "file") {
		var start = 0, attachment;
		rawValue = rawValue.replace(/\$\\backslash\$/g, '\\') // Mendeley invention?
			.replace(/([^\\](?:\\\\)*)\\(.){}/g, '$1$2'); // part of Mendeley's escaping (e.g. \~{} = ~)
		for (var i=0; i<rawValue.length; i++) {
			if (rawValue[i] == '\\') {
				i++; //skip next char
				continue;
			}
			if (rawValue[i] == ';') {
				attachment = parseFilePathRecord(rawValue.slice(start, i));
				if (attachment) item.attachments.push(attachment);
				start = i+1;
			}
		}
		
		attachment = parseFilePathRecord(rawValue.slice(start));
		if (attachment) item.attachments.push(attachment);
	} else if (field == "eprint" || field == "eprinttype") {
		// Support for IDs exported by BibLaTeX
		if (field == 'eprint') item._eprint = value;
		else item._eprinttype = value;
		
		var eprint = item._eprint;
		var eprinttype = item._eprinttype;
		// If we don't have both yet, continue
		if (!eprint || !eprinttype) return;
		
		var label = eprintIds[eprinttype.trim().toLowerCase()];
		if (!label) return;
		
		item._extraFields.push({field: label, value: eprint.trim()});
		
		delete item._eprinttype;
		delete item._eprint;
	} else if (extraIdentifiers[field]) {
		var label = extraIdentifiers[field];
		item._extraFields.push({field: label, value: value.trim()});
	}
}

/**
 * Split a string on a provided delimiter, but not if delimiter appears inside { }
 * @param {String} str String to split
 * @param {RegExp} delim RegExp object for the split delimiter. Use g flag to split on each
 * @return {String[]} Array of strings without delimiters
 */
function splitUnprotected(str, delim) {
	delim.lastIndex = 0; // In case we're reusing a regexp
	var nextPossibleSplit = delim.exec(str);
	if (!nextPossibleSplit) return [str];
	
	var parts = [], open = 0, nextPartStart = 0;
	for (var i=0; i<str.length; i++) {
		if (i>nextPossibleSplit.index) {
			// Must have been inside braces
			nextPossibleSplit = delim.exec(str);
			if (!nextPossibleSplit) {
				parts.push(str.substr(nextPartStart));
				return parts;
			}
		}
		
		if (str[i] == '\\') {
			// Skip next character
			i++;
			continue;
		}
		
		if (str[i] == '{') {
			open++;
			continue;
		}
		
		if (str[i] == '}') {
			open--;
			if (open < 0) open = 0; // Shouldn't happen, but...
			continue;
		}
		
		if (open) continue;
		
		if (i == nextPossibleSplit.index) {
			parts.push(str.substring(nextPartStart, i));
			i += nextPossibleSplit[0].length - 1; // We can jump past the split delim
			nextPartStart = i + 1;
			nextPossibleSplit = delim.exec(str);
			if (!nextPossibleSplit) {
				parts.push(str.substr(nextPartStart));
				return parts;
			}
		}
	}
	
	// I don't think we should ever get here*, but just to be safe
	// *we should always be returning from the for loop
	var last = str.substr(nextPartStart).trim();
	if (last) parts.push(last);
	
	return parts;
}

function parseFilePathRecord(record) {
	var start = 0, fields = [];
	for (var i=0; i<record.length; i++) {
		if (record[i] == '\\') {
			i++;
			continue;
		}
		if (record[i] == ':') {
			fields.push(decodeFilePathComponent(record.slice(start, i)));
			start = i+1;
		}
	}
	
	fields.push(decodeFilePathComponent(record.slice(start)));
	
	if (fields.length != 3 && fields.length != 1) {
		Zotero.debug("Unknown file path record format: " + record);
		return;
	}
	
	var attachment = {};
	if (fields.length == 3) {
		attachment.title = fields[0].trim() || 'Attachment';
		attachment.path = fields[1];
		attachment.mimeType = fields[2];
		if (attachment.mimeType.search(/pdf/i) != -1) {
			attachment.mimeType = 'application/pdf';
		}
	} else {
		attachment.title = 'Attachment';
		attachment.path = fields[0];
	}
	
	attachment.path = attachment.path.trim();
	if (!attachment.path) return;
	
	return attachment;
}

function getFieldValue(read) {
	var value = "";
	// now, we have the first character of the field
	if (read == "{") {
		// character is a brace
		var openBraces = 1, nextAsLiteral = false;
		while (read = Zotero.read(1)) {
			if (nextAsLiteral) { // Previous character was a backslash
				value += read;
				nextAsLiteral = false;
				continue;
			}
			
			if (read == "\\") {
				value += read;
				nextAsLiteral = true;
				continue;
			}
			
			if (read == "{") {
				openBraces++;
				value += "{";
			} else if (read == "}") {
				openBraces--;
				if (openBraces == 0) {
					break;
				} else {
					value += "}";
				}
			} else {
				value += read;
			}
		}
		
	} else if (read == '"') {
		var openBraces = 0;
		while (read = Zotero.read(1)) {
			if (read == "{" && value[value.length-1] != "\\") {
				openBraces++;
				value += "{";
			} else if (read == "}" && value[value.length-1] != "\\") {
				openBraces--;
				value += "}";
			} else if (read == '"' && openBraces == 0) {
				break;
			} else {
				value += read;
			}
		}
	}

	return value;
}

function unescapeBibTeX(value) {
	if (value.length < 2) return value;
	
	// replace accented characters (yucky slow)
	value = value.replace(/{?(\\[`"'^~=]){?\\?([A-Za-z])}/g, "{$1$2}");
	// normalize some special characters, e.g. caron \v{c} -> {\v c}
	value = value.replace(/(\\[a-z]){(\\?[A-Za-z])}/g, "{$1 $2}");
	//convert tex markup into permitted HTML
	value = mapTeXmarkup(value);
	for (var mapped in reversemappingTable) { // really really slow!
		var unicode = reversemappingTable[mapped];
		while (value.includes(mapped)) {
			Zotero.debug("Replace " + mapped + " in " + value + " with " + unicode);
			value = value.replace(mapped, unicode);
		}
		mapped = mapped.replace(/[{}]/g, "");
		while (value.includes(mapped)) {
			//Z.debug(value)
			Zotero.debug("Replace(2) " + mapped + " in " + value + " with " + unicode);
			value = value.replace(mapped, unicode);
		}
	}
	value = value.replace(/\$([^$]+)\$/g, '$1')
	
	// kill braces
	value = value.replace(/([^\\])[{}]+/g, "$1");
	if (value[0] == "{") {
		value = value.substr(1);
	}
	
	// chop off backslashes
	value = value.replace(/([^\\])\\([#$%&~_^\\{}])/g, "$1$2");
	value = value.replace(/([^\\])\\([#$%&~_^\\{}])/g, "$1$2");
	if (value[0] == "\\" && "#$%&~_^\\{}".includes(value[1])) {
		value = value.substr(1);
	}
	if (value[value.length-1] == "\\" && "#$%&~_^\\{}".includes(value[value.length-2])) {
		value = value.substr(0, value.length-1);
	}
	value = value.replace(/\\\\/g, "\\");
	value = value.replace(/\s+/g, " ");
	
	// Unescape HTML entities coming from web translators
	if (Zotero.parentTranslator && value.includes('&')) {
		value = value.replace(/&#?\w+;/g, function(entity) {
			var char = ZU.unescapeHTML(entity);
			if (char == entity) char = ZU.unescapeHTML(entity.toLowerCase()); // Sometimes case can be incorrect and entities are case-sensitive
			
			return char;
		});
	}
	
	return value;
}

function jabrefSplit(str, sep) {
	var quoted = false;
	var result = [];

	str = str.split('');
	while (str.length > 0) {
		if (result.length == 0) { result = ['']; }

		if (str[0] == sep) {
			str.shift();
			result.push('');
		} else {
			if (str[0] == '\\') { str.shift(); }
			result[result.length - 1] += str.shift();
		}
	}
	return result;
}

function jabrefCollect(arr, func) {
	if (arr == null) { return []; }

	var result = [];

	for (var i = 0; i < arr.length; i++) {
		if (func(arr[i])) {
			result.push(arr[i]);
		}
	}
	return result;
}

function processComment() {
	var comment = "";
	var read;
	var collectionPath = [];
	var parentCollection, collection;

	while (read = Zotero.read(1)) {
		if (read == "}") { break; } // JabRef ought to escape '}' but doesn't; embedded '}' chars will break the import just as it will on JabRef itself
		comment += read;
	}

	if (comment == 'jabref-meta: groupsversion:3;') {
		jabref.format = 3;
		return;
	}

	if (comment.startsWith('jabref-meta: groupstree:')) {
		if (jabref.format != 3) {
			Zotero.debug("jabref: fatal: unsupported group format: " + jabref.format);
			return;
		}
		comment = comment.replace(/^jabref-meta: groupstree:/, '').replace(/[\r\n]/gm, '');

		var records = jabrefSplit(comment, ';');
		while (records.length > 0) {
			var record = records.shift();
			var keys = jabrefSplit(record, ';');
			if (keys.length < 2) { continue; }

			var record = {id: keys.shift()};
			record.data = record.id.match(/^([0-9]) ([^:]*):(.*)/);
			if (record.data == null) {
				Zotero.debug("jabref: fatal: unexpected non-match for group " + record.id);
				return;
			}
			record.level = parseInt(record.data[1]);
			record.type = record.data[2];
			record.name = record.data[3];
			record.intersection = keys.shift(); // 0 = independent, 1 = intersection, 2 = union

			if (isNaN(record.level)) {
				Zotero.debug("jabref: fatal: unexpected record level in " + record.id);
				return;
			}

			if (record.level == 0) { continue; }
			if (record.type != 'ExplicitGroup') {
				Zotero.debug("jabref: fatal: group type " + record.type + " is not supported");
				return;
			}

			collectionPath = collectionPath.slice(0, record.level - 1).concat([record.name]);
			Zotero.debug("jabref: locating level " + record.level + ": " + collectionPath.join('/'));

			if (jabref.root.hasOwnProperty(collectionPath[0])) {
				collection = jabref.root[collectionPath[0]];
				Zotero.debug("jabref: root " + collection.name + " found");
			} else {
				collection = new Zotero.Collection();
				collection.name = collectionPath[0];
				collection.type = 'collection';
				collection.children = [];
				jabref.root[collectionPath[0]] = collection;
				Zotero.debug("jabref: root " + collection.name + " created");
			}
			parentCollection = null;

			for (var i = 1; i < collectionPath.length; i++) {
				var path = collectionPath[i];
				Zotero.debug("jabref: looking for child " + path + " under " + collection.name);

				var child = jabrefCollect(collection.children, function(n) { return (n.name == path); });
				if (child.length != 0) {
					child = child[0];
					Zotero.debug("jabref: child " + child.name + " found under " + collection.name);
				} else {
					child = new Zotero.Collection();
					child.name = path;
					child.type = 'collection';
					child.children = [];

					collection.children.push(child);
					Zotero.debug("jabref: child " + child.name + " created under " + collection.name);
				}

				parentCollection = collection;
				collection = child;
			}

			if (parentCollection) {
				parentCollection = jabrefCollect(parentCollection.children, function(n) { return (n.type == 'item'); });
			}

			if (record.intersection == '2' && parentCollection) { // union with parent
				collection.children = parentCollection;
			}

			while (keys.length > 0) {
				var key = keys.shift();
				if (key != '') {
					Zotero.debug('jabref: adding ' + key + ' to ' + collection.name);
					collection.children.push({type: 'item', id: key});
				}
			}

			if (parentCollection && record.intersection == '1') { // intersection with parent
				collection.children = jabrefMap(collection.children, function(n) { parentCollection.includes(n); });
			}
		}
	}
}

function beginRecord(type, closeChar) {
	type = Zotero.Utilities.trimInternal(type.toLowerCase());
	if (type !== "string" && type !== "preamble") {
		var zoteroType = bibtex2zoteroTypeMap[type];
		if (!zoteroType) {
			Zotero.debug("discarded item from BibTeX; type was "+type);
			return;
		}
		var item = new Zotero.Item(zoteroType);
		item._extraFields = [];
	} 
	else if (type == "preamble") { // Preamble (keeping separate in case we want to do something with these)
		Zotero.debug("discarded preamble from BibTeX");
		return;
	}
	
	// For theses write the thesisType determined by the BibTeX type.
	if (type == "mastersthesis" && item) item.type = "Master's Thesis";
	if (type == "phdthesis" && item) item.type = "PhD Thesis";

	var field = "";
	
	// by setting dontRead to true, we can skip a read on the next iteration
	// of this loop. this is useful after we read past the end of a string.
	var dontRead = false;
	
	var value, rawValue;
	while (dontRead || (read = Zotero.read(1))) {
		dontRead = false;
		
		// the equal sign indicate the start of the value
		// which will be handled in the following part
		// possible formats are:
		//    = 42,
		//    = "42",
		//    = {42},
		//    = name,  (where this is defined as a string)
		if (read == "=") {
			var valueArray = [];
			var rawValueArray = [];
			// concatenation is possible with # and for that we
			// do this do-while-loop here, e.g.
			//     = name # " and " # "Adam Smith",
			do {
				var read = Zotero.read(1);
				// skip whitespaces
				while (" \n\r\t".includes(read)) {
					read = Zotero.read(1);
				}
				
				if (keyRe.test(read)) {
					// read numeric data here, since we might get an end bracket
					// that we should care about
					value = "";
					value += read;
					
					// character is a number or part of a string name
					while ((read = Zotero.read(1)) && /[a-zA-Z0-9\-:_]/.test(read)) {
						value += read;
					}
					
					// don't read the next char; instead, process the character
					// we already read past the end of the string
					dontRead = true;
					
					// see if there's a defined string
					if (strings[value.toLowerCase()]) value = strings[value.toLowerCase()];
					
					// rawValue has to be set for some fields to process
					// thus, in this case, we set it equal to value
					rawValue = value;
				} else {
					rawValue = getFieldValue(read);
					value = unescapeBibTeX(rawValue);
				}
				
				valueArray.push(value);
				rawValueArray.push(rawValue);
				
				while (" \n\r\t".includes(read)) {
					read = Zotero.read(1);
				}
			
			} while (read === "#");
			
			value = valueArray.join('');
			rawValue = rawValueArray.join('');
			
			if (item) {
				processField(item, field.toLowerCase(), value, rawValue);
			} else if (type == "string") {
				strings[field.toLowerCase()] = value;
			}
			field = "";
		}
		// commas reset, i.e. we are not reading a field
		// but rather we are reading the bibkey
		else if (read == ",") {
			if (item.itemID == null) {
				item.itemID = field; // itemID = citekey
			}
			field = "";

		}
		// closing character
		else if (read == closeChar) {
			if (item) {
				if (item.backupLocation) {
					if (item.itemType=="conferencePaper") {
						item._extraFields.push({field: "event-place", value: item.backupLocation});
					} else if (!item.place) {
						item.place = item.backupLocation;
					}
					delete item.backupLocation;
				}
				
				if (!item.date) {
					item.date = dateFieldsToDate(item.year, item.month, item.day);
				}
				delete item.year;
				delete item.month;
				delete item.day;
				
				item.extra = extraFieldsToString(item._extraFields);
				delete item._extraFields;
				
				if (!item.publisher && item.backupPublisher){
					item.publisher=item.backupPublisher;
					delete item.backupPublisher;
				}
				return item.complete();
			}
			return;
		}
		// skip whitespaces; the rest will become
		// the field name (or bibkey)
		else if (!" \n\r\t".includes(read)) {
			field += read;
		}
	}
}

function doImport() {
	if (typeof Promise == 'undefined') {
		readString(
			function () {},
			function (e) {
				throw e;
			}
		);
	}
	else {
		return new Promise(function (resolve, reject) {
			readString(resolve, reject);
		});
	}
}

function readString(resolve, reject) {
	var read = "";
	var type = false;
	
	var next = function () {
		readString(resolve, reject);
	};
	
	try {
		while (read = Zotero.read(1)) {
			if (read == "@") {
				type = "";
			} else if (type !== false) {
				if (type == "comment") {
					processComment();
					type = false;
				} else if (read == "{") {		// possible open character
					// This might return a promise if an item was saved
					// TODO: When 5.0-only, make sure this always returns a promise
					var maybePromise = beginRecord(type, "}");
					if (maybePromise) {
						maybePromise.then(next);
						return;
					}
				} else if (read == "(") {		// possible open character
					var maybePromise = beginRecord(type, ")");
					if (maybePromise) {
						maybePromise.then(next);
						return;
					}
				} else if (/[a-zA-Z0-9-_]/.test(read)) {
					type += read;
				}
			}
		}
		for (var key in jabref.root) {
			// TODO: Handle promise?
			if (jabref.root.hasOwnProperty(key)) { jabref.root[key].complete(); }
		}
	}
	catch (e) {
		reject(e);
		return;
	}
	
	resolve();
}

// some fields are, in fact, macros.  If that is the case then we should not put the
// data in the braces as it will cause the macros to not expand properly
function writeField(field, value, isMacro) {
	if (!value && typeof value != "number") return;
	value = value + ""; // convert integers to strings

	Zotero.write(",\n\t" + field + " = ");
	if (!isMacro) Zotero.write("{");
	// url field is preserved, for use with \href and \url
	// Other fields (DOI?) may need similar treatment
	if (!isMacro && !(field == "url" || field == "doi" || field == "file" || field == "lccn" )) {
		// I hope these are all the escape characters!
		value = escapeSpecialCharacters(value);
		
		if (caseProtectedFields.includes(field)) {
			value = ZU.XRegExp.replace(value, protectCapsRE, "$1{$2$3}"); // only $2 or $3 will have a value, not both
		}
	}
	var exportCharset = Zotero.getOption("exportCharset");
	if (exportCharset && !exportCharset.startsWith("UTF-8")) {
		value = value.replace(/[\u0080-\uFFFF]/g, mapAccent);
	}
	//convert the HTML markup allowed in Zotero for rich text to TeX; excluding doi/url/file shouldn't be necessary, but better to be safe;
	if (!((field == "url") || (field == "doi") || (field == "file"))) value = mapHTMLmarkup(value);
	Zotero.write(value);
	if (!isMacro) Zotero.write("}");
}

function mapHTMLmarkup(characters){
	//converts the HTML markup allowed in Zotero for rich text to TeX
	//since  < and > have already been escaped, we need this rather hideous code - I couldn't see a way around it though.
	//italics and bold
	characters = characters.replace(/\{\\textless\}i\{\\textgreater\}(.+?)\{\\textless\}\/i{\\textgreater\}/g, "\\textit{$1}")
		.replace(/\{\\textless\}b\{\\textgreater\}(.+?)\{\\textless\}\/b{\\textgreater\}/g, "\\textbf{$1}");
	//sub and superscript
	characters = characters.replace(/\{\\textless\}sup\{\\textgreater\}(.+?)\{\\textless\}\/sup{\\textgreater\}/g, "\$^{\\textrm{$1}}\$")
		.replace(/\{\\textless\}sub\{\\textgreater\}(.+?)\{\\textless\}\/sub\{\\textgreater\}/g, "\$_{\\textrm{$1}}\$");
	//two variants of small caps
	characters = characters.replace(/\{\\textless\}span\sstyle=\"small\-caps\"\{\\textgreater\}(.+?)\{\\textless\}\/span{\\textgreater\}/g, "\\textsc{$1}")
		.replace(/\{\\textless\}sc\{\\textgreater\}(.+?)\{\\textless\}\/sc\{\\textgreater\}/g, "\\textsc{$1}");
	return characters;
}

function xcase(prefix, cased, tag, tex) {
	return (prefix ? `$${prefix}$` : '') + (reversemappingTable[`$${tex}{${cased}}$`] || `<${tag}>${cased}</${tag}>`)
}
function sup(match, prefix, cased) {
	return xcase(prefix, cased, 'sup', '^');
}
function sub(match, prefix, cased) {
	return xcase(prefix, cased, 'sub', '_');
}
function mapTeXmarkup(tex){
	//reverse of the above - converts tex mark-up into html mark-up permitted by Zotero
	//italics and bold
	tex = tex.replace(/\\textit\{([^\}]+\})/g, "<i>$1</i>").replace(/\\textbf\{([^\}]+\})/g, "<b>$1</b>");
	//two versions of subscript the .* after $ is necessary because people m
	tex = tex.replace(/\$([^\{\$]*)_\{([^\}]+)\}\$/g, sub).replace(/\$([^\{\$]*)_\{\\textrm\{([^\}\$]+)\}\}\$/g, sub);
	//two version of superscript
	tex = tex.replace(/\$([^\{\$]*)\^\{([^\}]+)\}\$/g, sup).replace(/\$([^\{\$]*)\^\{\\textrm\{([^\}]+)\}\}\$/g, sup);
	//small caps
	tex = tex.replace(/\\textsc\{([^\}]+)/g, "<span style=\"small-caps\">$1</span>");
	return tex;
}
//Disable the isTitleCase function until we decide what to do with it.
/* const skipWords = ["but", "or", "yet", "so", "for", "and", "nor",
	"a", "an", "the", "at", "by", "from", "in", "into", "of", "on",
	"to", "with", "up", "down", "as", "while", "aboard", "about",
	"above", "across", "after", "against", "along", "amid", "among",
	"anti", "around", "as", "before", "behind", "below", "beneath",
	"beside", "besides", "between", "beyond", "but", "despite",
	"down", "during", "except", "for", "inside", "like", "near",
	"off", "onto", "over", "past", "per", "plus", "round", "save",
	"since", "than", "through", "toward", "towards", "under",
	"underneath", "unlike", "until", "upon", "versus", "via",
	"within", "without"];

function isTitleCase(string) {
	const wordRE = /[\s[(]([^\s,\.:?!\])]+)/g;

	var word;
	while (word = wordRE.exec(string)) {
		word = word[1];
		if (word.search(/\d/) != -1	//ignore words with numbers (including just numbers)
			|| skipWords.includes(word.toLowerCase())) {
			continue;
		}

		if (word.toLowerCase() == word) return false;
	}
	return true;
}
*/

// See http://tex.stackexchange.com/questions/230750/open-brace-in-bibtex-fields/230754
var vphantomRe = /\\vphantom{\\}}((?:.(?!\\vphantom{\\}}))*)\\vphantom{\\{}/g;
function escapeSpecialCharacters(str) {
	var newStr = str.replace(/[|\<\>\~\^\\\{\}]/g, function(c) { return alwaysMap[c]; })
		.replace(/([\#\$\%\&\_])/g, "\\$1");
	
	// We escape each brace in the text by making sure that it has a counterpart,
	// but sometimes this is overkill if the brace already has a counterpart in
	// the text.
	if (newStr.includes('\\vphantom')) {
		var m;
		while (m = vphantomRe.exec(newStr)) {
			// Can't use a simple replace, because we want to match up inner with inner
			// and outer with outer
			newStr = newStr.substr(0,m.index) + m[1] + newStr.substr(m.index + m[0].length);
			vphantomRe.lastIndex = 0; // Start over, because the previous replacement could have created a new pair
		}
	}
	
	return newStr;
}

function mapAccent(character) {
	return (mappingTable[character] ? mappingTable[character] : "?");
}

var filePathSpecialChars = '\\\\:;$'; // $ for Mendeley (see cleanFilePath for {})
var encodeFilePathRE = new RegExp('[' + filePathSpecialChars + ']', 'g');

// We strip out {} in general, because \{ and \} still break BibTeX (0.99d)
function cleanFilePath(str) {
	if (!str) return '';
	return str.replace(/(?:\s*[{}]+)+\s*/g, ' ');
}

function encodeFilePathComponent(value) {
	if (!value) return '';
	return value.replace(encodeFilePathRE, "\\$&");
}

function decodeFilePathComponent(value) {
	if (!value) return '';
	return value.replace(/\\([^A-Za-z0-9.])/g, "$1");
}

// a little substitution function for BibTeX keys, where we don't want LaTeX
// escaping, but we do want to preserve the base characters

function tidyAccents(s) {
	var r=s.toLowerCase();

	// XXX Remove conditional when we drop Zotero 2.1.x support
	// This is supported in Zotero 3.0 and higher
	if (ZU.removeDiacritics !== undefined)
		r = ZU.removeDiacritics(r, true);
	else {
	// We fall back on the replacement list we used previously
		r = r.replace(new RegExp("[ä]", 'g'),"ae");
		r = r.replace(new RegExp("[ö]", 'g'),"oe");
		r = r.replace(new RegExp("[ü]", 'g'),"ue");
		r = r.replace(new RegExp("[àáâãå]", 'g'),"a");
		r = r.replace(new RegExp("æ", 'g'),"ae");
		r = r.replace(new RegExp("ç", 'g'),"c");
		r = r.replace(new RegExp("[èéêë]", 'g'),"e");
		r = r.replace(new RegExp("[ìíîï]", 'g'),"i");
		r = r.replace(new RegExp("ñ", 'g'),"n");
		r = r.replace(new RegExp("[òóôõ]", 'g'),"o");
		r = r.replace(new RegExp("œ", 'g'),"oe");
		r = r.replace(new RegExp("[ùúû]", 'g'),"u");
		r = r.replace(new RegExp("[ýÿ]", 'g'),"y");
	}

	return r;
};

var numberRe = /^[0-9]+/;
// Below is a list of words that should not appear as part of the citation key
// it includes the indefinite articles of English, German, French and Spanish, as well as a small set of English prepositions whose
// force is more grammatical than lexical, i.e. which are likely to strike many as 'insignificant'.
// The assumption is that most who want a title word in their key would prefer the first word of significance.
// Also remove markup
var citeKeyTitleBannedRe = /\b(a|an|the|some|from|on|in|to|of|do|with|der|die|das|ein|eine|einer|eines|einem|einen|un|une|la|le|l\'|les|el|las|los|al|uno|una|unos|unas|de|des|del|d\')(\s+|\b)|(<\/?(i|b|sup|sub|sc|span style=\"small-caps\"|span)>)/g;
var citeKeyConversionsRe = /%([a-zA-Z])/;

var citeKeyConversions = {
	"a":function (flags, item) {
		if (item.creators && item.creators[0] && item.creators[0].lastName) {
			return item.creators[0].lastName.toLowerCase().replace(/ /g,"_").replace(/,/g,"");
		}
		return "noauthor";
	},
	"t":function (flags, item) {
		if (item["title"]) {
			return item["title"].toLowerCase().replace(citeKeyTitleBannedRe, "").split(/\s+/g)[0];
		}
		return "notitle";
	},
	"y":function (flags, item) {
		if (item.date) {
			var date = Zotero.Utilities.strToDate(item.date);
			if (date.year && numberRe.test(date.year)) {
				return date.year;
			}
		}
		return "nodate";
	}
};


function buildCiteKey (item, extraFields, citekeys) {
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
			//add data before the conversion match to basekey
			basekey = basekey + citeKeyFormatRemaining.substr(0, m.index);
		}
		var flags = ""; // for now
		var f = citeKeyConversions[m[1]];
		if (typeof(f) == "function") {
			var value = f(flags, item);
			Zotero.debug("Got value " + value + " for %" + m[1]);
			//add conversion to basekey
			basekey = basekey + value;
		}
		citeKeyFormatRemaining = citeKeyFormatRemaining.substr(m.index + m.length);
		counter++;
	}
	if (citeKeyFormatRemaining.length > 0) {
		basekey = basekey + citeKeyFormatRemaining;
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
	var citeKeyCleanRe = /[^a-z0-9\!\$\&\*\+\-\.\/\:\;\<\>\?\[\]\^\_\`\|]+/g;
	// but use the simple pattern for all newly added items
	// or always if the hiddenPref is set
	// extensions.zotero.translators.BibTeX.export.simpleCitekey
	if ((Zotero.getHiddenPref && Zotero.getHiddenPref('BibTeX.export.simpleCitekey'))
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

var protectCapsRE;
function doExport() {
	if (Zotero.getHiddenPref && Zotero.getHiddenPref('BibTeX.export.dontProtectInitialCase')) {
		// Case of words with uppercase characters in non-initial positions is
		// preserved with braces.
		// Two extra captures because of the other regexp below
		protectCapsRE = new ZU.XRegExp("()()\\b([\\p{Letter}\\d]+\\p{Uppercase_Letter}[\\p{Letter}\\d]*)", 'g');
	} else {
		// Protect all upper case letters, even if the uppercase letter is only in
		// initial position of the word.
		// Don't protect first word if only first letter is capitalized
		protectCapsRE = new ZU.XRegExp(
			"(.)\\b([\\p{Letter}\\d]*\\p{Uppercase_Letter}[\\p{Letter}\\d]*)" // Non-initial words with capital letter anywhere
				+ "|^([\\p{Letter}\\d]+\\p{Uppercase_Letter}[\\p{Letter}\\d]*)" // Initial word with capital in non-initial position
			, 'g');
	}
	
	//Zotero.write("% BibTeX export generated by Zotero "+Zotero.Utilities.getVersion());
	// to make sure the BOM gets ignored
	Zotero.write("\n");
	
	var first = true;
	var citekeys = new Object();
	var item;
	while (item = Zotero.nextItem()) {
		//don't export standalone notes and attachments
		if (item.itemType == "note" || item.itemType == "attachment") continue;

		// determine type
		var type = zotero2bibtexTypeMap[item.itemType];
		if (typeof(type) == "function") { type = type(item); }

		// For theses BibTeX distinguish between @mastersthesis and @phdthesis
		// and the default mapping will map all Zotero thesis items to a
		// BibTeX phdthesis item. Here we try to fix this by examining the
		// Zotero thesisType field.
		if (type == "phdthesis") {
			// In practice, we just want to separate out masters theses,
			// and will assume everything else maps to @phdthesis. Better to
			// err on the side of caution.
			var thesisType = item.type && item.type.toLowerCase().replace(/[\s.]+|thesis|unpublished/g, '');
			if (thesisType &&  (thesisType == 'master' || thesisType == 'masters'  || thesisType == "master's" || thesisType == 'ms' || thesisType == 'msc' || thesisType == 'ma')) {
				type = "mastersthesis";
				item["type"] = "";
			}
		}

		if (!type) type = "misc";
		
		// create a unique citation key
		var extraFields = item.extra ? parseExtraFields(item.extra) : null;
		var citekey = buildCiteKey(item, extraFields, citekeys);
		
		// write citation key
		Zotero.write((first ? "" : "\n\n") + "@"+type+"{"+citekey);
		first = false;
		
		for (var field in fieldMap) {
			if (item[fieldMap[field]]) {
				writeField(field, item[fieldMap[field]]);
			}
		}

		if (item.reportNumber || item.issue || item.seriesNumber || item.patentNumber) {
			writeField("number", item.reportNumber || item.issue || item.seriesNumber|| item.patentNumber);
		}
		
		if (item.accessDate){
			var accessYMD = item.accessDate.replace(/\s*\d+:\d+:\d+/, "");
			writeField("urldate", accessYMD);
		}
		
		if (item.publicationTitle) {
			if (item.itemType == "bookSection" || item.itemType == "conferencePaper") {
				writeField("booktitle", item.publicationTitle);
			} else if (Zotero.getOption("useJournalAbbreviation") && item.journalAbbreviation){
				writeField("journal", item.journalAbbreviation);
			} else {
				writeField("journal", item.publicationTitle);
			}
		}
		
		if (item.publisher) {
			if (item.itemType == "thesis") {
				writeField("school", item.publisher);
			} else if (item.itemType =="report") {
				writeField("institution", item.publisher);
			} else {
				writeField("publisher", item.publisher);
			}
		}
		
		if (item.creators && item.creators.length) {
			// split creators into subcategories
			var author = "";
			var editor = "";
			var translator = "";
			var collaborator = "";
			var primaryCreatorType = Zotero.Utilities.getCreatorsForType(item.itemType)[0];
			for (var i in item.creators) {
				var creator = item.creators[i];
				var creatorString;

				if (creator.firstName) {
					var fname = creator.firstName.split(/\s*,!?\s*/);
					fname.push(fname.shift()); // If we have a Jr. part(s), it should precede first name
					creatorString = creator.lastName + ", " + fname.join(', ');
				} else {
					creatorString = creator.lastName;
				}
				
				creatorString = escapeSpecialCharacters(creatorString);
				
				if (creator.fieldMode == true) { // fieldMode true, assume corporate author
					creatorString = "{" + creatorString + "}";
				} else {
					creatorString = creatorString.replace(/ (and) /gi, ' {$1} ');
				}

				if (creator.creatorType == "editor" || creator.creatorType == "seriesEditor") {
					editor += " and "+creatorString;
				} else if (creator.creatorType == "translator") {
					translator += " and "+creatorString;
				} else if (creator.creatorType == primaryCreatorType) {
					author += " and "+creatorString;
				} else {
					collaborator += " and "+creatorString;
				}
			}
			
			if (author) {
				writeField("author", "{" + author.substr(5) + "}", true);
			}
			if (editor) {
				writeField("editor", "{" + editor.substr(5) + "}", true);
			}
			if (translator) {
				writeField("translator",  "{" + translator.substr(5) + "}", true);
			}
			if (collaborator) {
				writeField("collaborator",  "{" + collaborator.substr(5) + "}", true);
			}
		}
		
		if (item.date) {
			var date = Zotero.Utilities.strToDate(item.date);
			// need to use non-localized abbreviation
			if (typeof date.month == "number") {
				writeField("month", months[date.month], true);
			}
			if (date.year) {
				writeField("year", date.year);
			}
		}
		
		if (extraFields) {
			// Export identifiers
			for (var i=0; i<extraFields.length; i++) {
				var rec = extraFields[i];
				if (!rec.field || !revExtraIds[rec.field]) continue;
				var value = rec.value.trim();
				if (value) {
					writeField(revExtraIds[rec.field], '{'+value+'}', true);
					extraFields.splice(i, 1);
					i--;
				}
			}
			var extra = extraFieldsToString(extraFields); // Make sure we join exactly with what we split
			if (extra) writeField("note", extra);
		}
		
		if (item.tags && item.tags.length) {
			var tagString = "";
			for (var i in item.tags) {
				var tag = item.tags[i];
				tagString += ", "+tag.tag;
			}
			writeField("keywords", tagString.substr(2));
		}
		
		if (item.pages) {
			writeField("pages", item.pages.replace(/[-\u2012-\u2015\u2053]+/g,"--"));
		}
		
		// Commented out, because we don't want a books number of pages in the BibTeX "pages" field for books.
		//if (item.numPages) {
		//	writeField("pages", item.numPages);
		//}
		
		/* We'll prefer url over howpublished see
		https://forums.zotero.org/discussion/24554/bibtex-doubled-url/#Comment_157802
		
		if (item.itemType == "webpage") {
			writeField("howpublished", item.url);
		}*/
		if (item.notes && Zotero.getOption("exportNotes")) {
			for (var i in item.notes) {
				var note = item.notes[i];
				writeField("annote", Zotero.Utilities.unescapeHTML(note["note"]));
			}
		}
		
		if (item.attachments) {
			var attachmentString = "";
			
			for (var i in item.attachments) {
				var attachment = item.attachments[i];
				// Unfortunately, it looks like \{ in file field breaks BibTeX (0.99d)
				// even if properly backslash escaped, so we have to make sure that
				// it doesn't make it into this field at all
				var title = cleanFilePath(attachment.title),
					path = null;
				
				if (Zotero.getOption("exportFileData") && attachment.saveFile) {
					path = cleanFilePath(attachment.defaultPath);
					attachment.saveFile(path, true);
				} else if (attachment.localPath) {
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

var exports = {
	"doExport": doExport,
	"doImport": doImport,
	"setKeywordDelimRe": setKeywordDelimRe,
	"setKeywordSplitOnSpace": setKeywordSplitOnSpace
};

/*
 * new mapping table based on that from Matthias Steffens,
 * then enhanced with some fields generated from the unicode table.
 */

var mappingTable = {
	"\u00A0":"~", // NO-BREAK SPACE
	"\u00A1":"{\\textexclamdown}", // INVERTED EXCLAMATION MARK
	"\u00A2":"{\\textcent}", // CENT SIGN
	"\u00A3":"{\\textsterling}", // POUND SIGN
	"\u00A5":"{\\textyen}", // YEN SIGN
	"\u00A6":"{\\textbrokenbar}", // BROKEN BAR
	"\u00A7":"{\\textsection}", // SECTION SIGN
	"\u00A8":"{\\textasciidieresis}", // DIAERESIS
	"\u00A9":"{\\textcopyright}", // COPYRIGHT SIGN
	"\u00AA":"{\\textordfeminine}", // FEMININE ORDINAL INDICATOR
	"\u00AB":"{\\guillemotleft}", // LEFT-POINTING DOUBLE ANGLE QUOTATION MARK
	"\u00AC":"{\\textlnot}", // NOT SIGN
	"\u00AD":"-", // SOFT HYPHEN
	"\u00AE":"{\\textregistered}", // REGISTERED SIGN
	"\u00AF":"{\\textasciimacron}", // MACRON
	"\u00B0":"{\\textdegree}", // DEGREE SIGN
	"\u00B1":"{\\textpm}", // PLUS-MINUS SIGN
	"\u00B2":"{\\texttwosuperior}", // SUPERSCRIPT TWO
	"\u00B3":"{\\textthreesuperior}", // SUPERSCRIPT THREE
	"\u00B4":"{\\textasciiacute}", // ACUTE ACCENT
	"\u00B5":"{\\textmu}", // MICRO SIGN
	"\u00B6":"{\\textparagraph}", // PILCROW SIGN
	"\u00B7":"{\\textperiodcentered}", // MIDDLE DOT
	"\u00B8":"{\\c\\ }", // CEDILLA
	"\u00B9":"{\\textonesuperior}", // SUPERSCRIPT ONE
	"\u00BA":"{\\textordmasculine}", // MASCULINE ORDINAL INDICATOR
	"\u00BB":"{\\guillemotright}", // RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK
	"\u00BC":"{\\textonequarter}", // VULGAR FRACTION ONE QUARTER
	"\u00BD":"{\\textonehalf}", // VULGAR FRACTION ONE HALF
	"\u00BE":"{\\textthreequarters}", // VULGAR FRACTION THREE QUARTERS
	"\u00BF":"{\\textquestiondown}", // INVERTED QUESTION MARK
	"\u00C6":"{\\AE}", // LATIN CAPITAL LETTER AE
	"\u00D0":"{\\DH}", // LATIN CAPITAL LETTER ETH
	"\u00D7":"{\\texttimes}", // MULTIPLICATION SIGN
	"\u00D8":"{\\O}", // LATIN CAPITAL LETTER O WITH STROKE
	"\u00DE":"{\\TH}", // LATIN CAPITAL LETTER THORN
	"\u00DF":"{\\ss}", // LATIN SMALL LETTER SHARP S
	"\u00E6":"{\\ae}", // LATIN SMALL LETTER AE
	"\u00F0":"{\\dh}", // LATIN SMALL LETTER ETH
	"\u00F7":"{\\textdiv}", // DIVISION SIGN
	"\u00F8":"{\\o}", // LATIN SMALL LETTER O WITH STROKE
	"\u00FE":"{\\th}", // LATIN SMALL LETTER THORN
	"\u0131":"{\\i}", // LATIN SMALL LETTER DOTLESS I
	"\u0132":"IJ", // LATIN CAPITAL LIGATURE IJ
	"\u0133":"ij", // LATIN SMALL LIGATURE IJ
	"\u0138":"k", // LATIN SMALL LETTER KRA
	"\u0149":"'n", // LATIN SMALL LETTER N PRECEDED BY APOSTROPHE
	"\u014A":"{\\NG}", // LATIN CAPITAL LETTER ENG
	"\u014B":"{\\ng}", // LATIN SMALL LETTER ENG
	"\u0152":"{\\OE}", // LATIN CAPITAL LIGATURE OE
	"\u0153":"{\\oe}", // LATIN SMALL LIGATURE OE
	"\u017F":"s", // LATIN SMALL LETTER LONG S
	"\u02B9":"'", // MODIFIER LETTER PRIME
	"\u02BB":"'", // MODIFIER LETTER TURNED COMMA
	"\u02BC":"'", // MODIFIER LETTER APOSTROPHE
	"\u02BD":"'", // MODIFIER LETTER REVERSED COMMA
	"\u02C6":"{\\textasciicircum}", // MODIFIER LETTER CIRCUMFLEX ACCENT
	"\u02C8":"'", // MODIFIER LETTER VERTICAL LINE
	"\u02C9":"-", // MODIFIER LETTER MACRON
	"\u02CC":",", // MODIFIER LETTER LOW VERTICAL LINE
	"\u02D0":":", // MODIFIER LETTER TRIANGULAR COLON
	"\u02DA":"o", // RING ABOVE
	"\u02DC":"\\~{}", // SMALL TILDE
	"\u02DD":"{\\textacutedbl}", // DOUBLE ACUTE ACCENT
	"\u0374":"'", // GREEK NUMERAL SIGN
	"\u0375":",", // GREEK LOWER NUMERAL SIGN
	"\u037E":";", // GREEK QUESTION MARK
	//Greek letters courtesy of spartanroc
	"\u0393":"$\\Gamma$", // GREEK Gamma
	"\u0394":"$\\Delta$", // GREEK Delta
	"\u0398":"$\\Theta$", // GREEK Theta
	"\u039B":"$\\Lambda$", // GREEK Lambda
	"\u039E":"$\\Xi$", // GREEK Xi
	"\u03A0":"$\\Pi$", // GREEK Pi
	"\u03A3":"$\\Sigma$", // GREEK Sigma
	"\u03A6":"$\\Phi$", // GREEK Phi
	"\u03A8":"$\\Psi$", // GREEK Psi
	"\u03A9":"$\\Omega$", // GREEK Omega
	"\u03B1":"$\\alpha$", // GREEK alpha
	"\u03B2":"$\\beta$", // GREEK beta
	"\u03B3":"$\\gamma$", // GREEK gamma
	"\u03B4":"$\\delta$", // GREEK delta
	"\u03B5":"$\\varepsilon$", // GREEK var-epsilon
	"\u03B6":"$\\zeta$", // GREEK zeta
	"\u03B7":"$\\eta$", // GREEK eta
	"\u03B8":"$\\theta$", // GREEK theta
	"\u03B9":"$\\iota$", // GREEK iota
	"\u03BA":"$\\kappa$", // GREEK kappa
	"\u03BB":"$\\lambda$", // GREEK lambda
	"\u03BC":"$\\mu$", // GREEK mu
	"\u03BD":"$\\nu$", // GREEK nu
	"\u03BE":"$\\xi$", // GREEK xi
	"\u03C0":"$\\pi$", // GREEK pi
	"\u03C1":"$\\rho$", // GREEK rho
	"\u03C2":"$\\varsigma$", // GREEK var-sigma
	"\u03C3":"$\\sigma$", // GREEK sigma
	"\u03C4":"$\\tau$", // GREEK tau
	"\u03C5":"$\\upsilon$", // GREEK upsilon
	"\u03C6":"$\\varphi$", // GREEK var-phi
	"\u03C7":"$\\chi$", // GREEK chi
	"\u03C8":"$\\psi$", // GREEK psi
	"\u03C9":"$\\omega$", // GREEK omega
	"\u03D1":"$\\vartheta$", // GREEK var-theta
	"\u03D2":"$\\Upsilon$", // GREEK Upsilon
	"\u03D5":"$\\phi$", // GREEK phi
	"\u03D6":"$\\varpi$", // GREEK var-pi
	"\u03F1":"$\\varrho$", // GREEK var-rho
	"\u03F5":"$\\epsilon$", // GREEK epsilon
	//Greek letters end
	"\u2000":" ", // EN QUAD
	"\u2001":"  ", // EM QUAD
	"\u2002":" ", // EN SPACE
	"\u2003":"  ", // EM SPACE
	"\u2004":" ", // THREE-PER-EM SPACE
	"\u2005":" ", // FOUR-PER-EM SPACE
	"\u2006":" ", // SIX-PER-EM SPACE
	"\u2007":" ", // FIGURE SPACE
	"\u2008":" ", // PUNCTUATION SPACE
	"\u2009":" ", // THIN SPACE
	"\u2010":"-", // HYPHEN
	"\u2011":"-", // NON-BREAKING HYPHEN
	"\u2012":"-", // FIGURE DASH
	"\u2013":"{\\textendash}", // EN DASH
	"\u2014":"{\\textemdash}", // EM DASH
	"\u2015":"{\\textemdash}", // HORIZONTAL BAR or QUOTATION DASH (not in LaTeX -- use EM DASH)
	"\u2016":"{\\textbardbl}", // DOUBLE VERTICAL LINE
	"\u2017":"{\\textunderscore}", // DOUBLE LOW LINE
	"\u2018":"{\\textquoteleft}", // LEFT SINGLE QUOTATION MARK
	"\u2019":"{\\textquoteright}", // RIGHT SINGLE QUOTATION MARK
	"`" : "\u2018", // LEFT SINGLE QUOTATION MARK
	"'" : "\u2019", // RIGHT SINGLE QUOTATION MARK
	"\u201A":"{\\quotesinglbase}", // SINGLE LOW-9 QUOTATION MARK
	"\u201B":"'", // SINGLE HIGH-REVERSED-9 QUOTATION MARK
	"\u201C":"{\\textquotedblleft}", // LEFT DOUBLE QUOTATION MARK
	"\u201D":"{\\textquotedblright}", // RIGHT DOUBLE QUOTATION MARK
	"\u201E":"{\\quotedblbase}", // DOUBLE LOW-9 QUOTATION MARK
	"\u201F":"{\\quotedblbase}", // DOUBLE HIGH-REVERSED-9 QUOTATION MARK
	"\u2020":"{\\textdagger}", // DAGGER
	"\u2021":"{\\textdaggerdbl}", // DOUBLE DAGGER
	"\u2022":"{\\textbullet}", // BULLET
	"\u2023":">", // TRIANGULAR BULLET
	"\u2024":".", // ONE DOT LEADER
	"\u2025":"..", // TWO DOT LEADER
	"\u2026":"{\\textellipsis}", // HORIZONTAL ELLIPSIS
	"\u2027":"-", // HYPHENATION POINT
	"\u202F":" ", // NARROW NO-BREAK SPACE
	"\u2030":"{\\textperthousand}", // PER MILLE SIGN
	"\u2032":"'", // PRIME
	"\u2033":"'", // DOUBLE PRIME
	"\u2034":"'''", // TRIPLE PRIME
	"\u2035":"`", // REVERSED PRIME
	"\u2036":"``", // REVERSED DOUBLE PRIME
	"\u2037":"```", // REVERSED TRIPLE PRIME
	"\u2039":"{\\guilsinglleft}", // SINGLE LEFT-POINTING ANGLE QUOTATION MARK
	"\u203A":"{\\guilsinglright}", // SINGLE RIGHT-POINTING ANGLE QUOTATION MARK
	"\u203C":"!!", // DOUBLE EXCLAMATION MARK
	"\u203E":"-", // OVERLINE
	"\u2043":"-", // HYPHEN BULLET
	"\u2044":"{\\textfractionsolidus}", // FRACTION SLASH
	"\u2048":"?!", // QUESTION EXCLAMATION MARK
	"\u2049":"!?", // EXCLAMATION QUESTION MARK
	"\u204A":"7", // TIRONIAN SIGN ET
	"\u2070":"$^{0}$", // SUPERSCRIPT ZERO
	"\u2074":"$^{4}$", // SUPERSCRIPT FOUR
	"\u2075":"$^{5}$", // SUPERSCRIPT FIVE
	"\u2076":"$^{6}$", // SUPERSCRIPT SIX
	"\u2077":"$^{7}$", // SUPERSCRIPT SEVEN
	"\u2078":"$^{8}$", // SUPERSCRIPT EIGHT
	"\u2079":"$^{9}$", // SUPERSCRIPT NINE
	"\u207A":"$^{+}$", // SUPERSCRIPT PLUS SIGN
	"\u207B":"$^{-}$", // SUPERSCRIPT MINUS
	"\u207C":"$^{=}$", // SUPERSCRIPT EQUALS SIGN
	"\u207D":"$^{(}$", // SUPERSCRIPT LEFT PARENTHESIS
	"\u207E":"$^{)}$", // SUPERSCRIPT RIGHT PARENTHESIS
	"\u207F":"$^{n}$", // SUPERSCRIPT LATIN SMALL LETTER N
	"\u2080":"$_{0}$", // SUBSCRIPT ZERO
	"\u2081":"$_{1}$", // SUBSCRIPT ONE
	"\u2082":"$_{2}$", // SUBSCRIPT TWO
	"\u2083":"$_{3}$", // SUBSCRIPT THREE
	"\u2084":"$_{4}$", // SUBSCRIPT FOUR
	"\u2085":"$_{5}$", // SUBSCRIPT FIVE
	"\u2086":"$_{6}$", // SUBSCRIPT SIX
	"\u2087":"$_{7}$", // SUBSCRIPT SEVEN
	"\u2088":"$_{8}$", // SUBSCRIPT EIGHT
	"\u2089":"$_{9}$", // SUBSCRIPT NINE
	"\u208A":"$_{+}$", // SUBSCRIPT PLUS SIGN
	"\u208B":"$_{-}$", // SUBSCRIPT MINUS
	"\u208C":"$_{=}$", // SUBSCRIPT EQUALS SIGN
	"\u208D":"$_{(}$", // SUBSCRIPT LEFT PARENTHESIS
	"\u208E":"$_{)}$", // SUBSCRIPT RIGHT PARENTHESIS
	"\u20AC":"{\\texteuro}", // EURO SIGN
	"\u2100":"a/c", // ACCOUNT OF
	"\u2101":"a/s", // ADDRESSED TO THE SUBJECT
	"\u2103":"{\\textcelsius}", // DEGREE CELSIUS
	"\u2105":"c/o", // CARE OF
	"\u2106":"c/u", // CADA UNA
	"\u2109":"F", // DEGREE FAHRENHEIT
	"\u2113":"l", // SCRIPT SMALL L
	"\u2116":"{\\textnumero}", // NUMERO SIGN
	"\u2117":"{\\textcircledP}", // SOUND RECORDING COPYRIGHT
	"\u2120":"{\\textservicemark}", // SERVICE MARK
	"\u2121":"TEL", // TELEPHONE SIGN
	"\u2122":"{\\texttrademark}", // TRADE MARK SIGN
	"\u2126":"{\\textohm}", // OHM SIGN
	"\u212A":"K", // KELVIN SIGN
	"\u212B":"A", // ANGSTROM SIGN
	"\u212E":"{\\textestimated}", // ESTIMATED SYMBOL
	"\u2153":" 1/3", // VULGAR FRACTION ONE THIRD
	"\u2154":" 2/3", // VULGAR FRACTION TWO THIRDS
	"\u2155":" 1/5", // VULGAR FRACTION ONE FIFTH
	"\u2156":" 2/5", // VULGAR FRACTION TWO FIFTHS
	"\u2157":" 3/5", // VULGAR FRACTION THREE FIFTHS
	"\u2158":" 4/5", // VULGAR FRACTION FOUR FIFTHS
	"\u2159":" 1/6", // VULGAR FRACTION ONE SIXTH
	"\u215A":" 5/6", // VULGAR FRACTION FIVE SIXTHS
	"\u215B":" 1/8", // VULGAR FRACTION ONE EIGHTH
	"\u215C":" 3/8", // VULGAR FRACTION THREE EIGHTHS
	"\u215D":" 5/8", // VULGAR FRACTION FIVE EIGHTHS
	"\u215E":" 7/8", // VULGAR FRACTION SEVEN EIGHTHS
	"\u215F":" 1/", // FRACTION NUMERATOR ONE
	"\u2160":"I", // ROMAN NUMERAL ONE
	"\u2161":"II", // ROMAN NUMERAL TWO
	"\u2162":"III", // ROMAN NUMERAL THREE
	"\u2163":"IV", // ROMAN NUMERAL FOUR
	"\u2164":"V", // ROMAN NUMERAL FIVE
	"\u2165":"VI", // ROMAN NUMERAL SIX
	"\u2166":"VII", // ROMAN NUMERAL SEVEN
	"\u2167":"VIII", // ROMAN NUMERAL EIGHT
	"\u2168":"IX", // ROMAN NUMERAL NINE
	"\u2169":"X", // ROMAN NUMERAL TEN
	"\u216A":"XI", // ROMAN NUMERAL ELEVEN
	"\u216B":"XII", // ROMAN NUMERAL TWELVE
	"\u216C":"L", // ROMAN NUMERAL FIFTY
	"\u216D":"C", // ROMAN NUMERAL ONE HUNDRED
	"\u216E":"D", // ROMAN NUMERAL FIVE HUNDRED
	"\u216F":"M", // ROMAN NUMERAL ONE THOUSAND
	"\u2170":"i", // SMALL ROMAN NUMERAL ONE
	"\u2171":"ii", // SMALL ROMAN NUMERAL TWO
	"\u2172":"iii", // SMALL ROMAN NUMERAL THREE
	"\u2173":"iv", // SMALL ROMAN NUMERAL FOUR
	"\u2174":"v", // SMALL ROMAN NUMERAL FIVE
	"\u2175":"vi", // SMALL ROMAN NUMERAL SIX
	"\u2176":"vii", // SMALL ROMAN NUMERAL SEVEN
	"\u2177":"viii", // SMALL ROMAN NUMERAL EIGHT
	"\u2178":"ix", // SMALL ROMAN NUMERAL NINE
	"\u2179":"x", // SMALL ROMAN NUMERAL TEN
	"\u217A":"xi", // SMALL ROMAN NUMERAL ELEVEN
	"\u217B":"xii", // SMALL ROMAN NUMERAL TWELVE
	"\u217C":"l", // SMALL ROMAN NUMERAL FIFTY
	"\u217D":"c", // SMALL ROMAN NUMERAL ONE HUNDRED
	"\u217E":"d", // SMALL ROMAN NUMERAL FIVE HUNDRED
	"\u217F":"m", // SMALL ROMAN NUMERAL ONE THOUSAND
	"\u2190":"{\\textleftarrow}", // LEFTWARDS ARROW
	"\u2191":"{\\textuparrow}", // UPWARDS ARROW
	"\u2192":"{\\textrightarrow}", // RIGHTWARDS ARROW
	"\u2193":"{\\textdownarrow}", // DOWNWARDS ARROW
	"\u2194":"<->", // LEFT RIGHT ARROW
	"\u21D0":"<=", // LEFTWARDS DOUBLE ARROW
	"\u21D2":"=>", // RIGHTWARDS DOUBLE ARROW
	"\u21D4":"<=>", // LEFT RIGHT DOUBLE ARROW
	"\u2212":"-", // MINUS SIGN
	"\u2215":"/", // DIVISION SLASH
	"\u2216":"\\", // SET MINUS
	"\u2217":"*", // ASTERISK OPERATOR
	"\u2218":"o", // RING OPERATOR
	"\u2219":".", // BULLET OPERATOR
	"\u221E":"$\\infty$", // INFINITY
	"\u2223":"|", // DIVIDES
	"\u2225":"||", // PARALLEL TO
	"\u2236":":", // RATIO
	"\u223C":"\\~{}", // TILDE OPERATOR
	"\u2260":"/=", // NOT EQUAL TO
	"\u2261":"=", // IDENTICAL TO
	"\u2264":"<=", // LESS-THAN OR EQUAL TO
	"\u2265":">=", // GREATER-THAN OR EQUAL TO
	"\u226A":"<<", // MUCH LESS-THAN
	"\u226B":">>", // MUCH GREATER-THAN
	"\u2295":"(+)", // CIRCLED PLUS
	"\u2296":"(-)", // CIRCLED MINUS
	"\u2297":"(x)", // CIRCLED TIMES
	"\u2298":"(/)", // CIRCLED DIVISION SLASH
	"\u22A2":"|-", // RIGHT TACK
	"\u22A3":"-|", // LEFT TACK
	"\u22A6":"|-", // ASSERTION
	"\u22A7":"|=", // MODELS
	"\u22A8":"|=", // TRUE
	"\u22A9":"||-", // FORCES
	"\u22C5":".", // DOT OPERATOR
	"\u22C6":"*", // STAR OPERATOR
	"\u22D5":"$\\#$", // EQUAL AND PARALLEL TO
	"\u22D8":"<<<", // VERY MUCH LESS-THAN
	"\u22D9":">>>", // VERY MUCH GREATER-THAN
	"\u2329":"{\\textlangle}", // LEFT-POINTING ANGLE BRACKET
	"\u232A":"{\\textrangle}", // RIGHT-POINTING ANGLE BRACKET
	"\u2400":"NUL", // SYMBOL FOR NULL
	"\u2401":"SOH", // SYMBOL FOR START OF HEADING
	"\u2402":"STX", // SYMBOL FOR START OF TEXT
	"\u2403":"ETX", // SYMBOL FOR END OF TEXT
	"\u2404":"EOT", // SYMBOL FOR END OF TRANSMISSION
	"\u2405":"ENQ", // SYMBOL FOR ENQUIRY
	"\u2406":"ACK", // SYMBOL FOR ACKNOWLEDGE
	"\u2407":"BEL", // SYMBOL FOR BELL
	"\u2408":"BS", // SYMBOL FOR BACKSPACE
	"\u2409":"HT", // SYMBOL FOR HORIZONTAL TABULATION
	"\u240A":"LF", // SYMBOL FOR LINE FEED
	"\u240B":"VT", // SYMBOL FOR VERTICAL TABULATION
	"\u240C":"FF", // SYMBOL FOR FORM FEED
	"\u240D":"CR", // SYMBOL FOR CARRIAGE RETURN
	"\u240E":"SO", // SYMBOL FOR SHIFT OUT
	"\u240F":"SI", // SYMBOL FOR SHIFT IN
	"\u2410":"DLE", // SYMBOL FOR DATA LINK ESCAPE
	"\u2411":"DC1", // SYMBOL FOR DEVICE CONTROL ONE
	"\u2412":"DC2", // SYMBOL FOR DEVICE CONTROL TWO
	"\u2413":"DC3", // SYMBOL FOR DEVICE CONTROL THREE
	"\u2414":"DC4", // SYMBOL FOR DEVICE CONTROL FOUR
	"\u2415":"NAK", // SYMBOL FOR NEGATIVE ACKNOWLEDGE
	"\u2416":"SYN", // SYMBOL FOR SYNCHRONOUS IDLE
	"\u2417":"ETB", // SYMBOL FOR END OF TRANSMISSION BLOCK
	"\u2418":"CAN", // SYMBOL FOR CANCEL
	"\u2419":"EM", // SYMBOL FOR END OF MEDIUM
	"\u241A":"SUB", // SYMBOL FOR SUBSTITUTE
	"\u241B":"ESC", // SYMBOL FOR ESCAPE
	"\u241C":"FS", // SYMBOL FOR FILE SEPARATOR
	"\u241D":"GS", // SYMBOL FOR GROUP SEPARATOR
	"\u241E":"RS", // SYMBOL FOR RECORD SEPARATOR
	"\u241F":"US", // SYMBOL FOR UNIT SEPARATOR
	"\u2420":"SP", // SYMBOL FOR SPACE
	"\u2421":"DEL", // SYMBOL FOR DELETE
	"\u2423":"{\\textvisiblespace}", // OPEN BOX
	"\u2424":"NL", // SYMBOL FOR NEWLINE
	"\u2425":"///", // SYMBOL FOR DELETE FORM TWO
	"\u2426":"?", // SYMBOL FOR SUBSTITUTE FORM TWO
	"\u2460":"(1)", // CIRCLED DIGIT ONE
	"\u2461":"(2)", // CIRCLED DIGIT TWO
	"\u2462":"(3)", // CIRCLED DIGIT THREE
	"\u2463":"(4)", // CIRCLED DIGIT FOUR
	"\u2464":"(5)", // CIRCLED DIGIT FIVE
	"\u2465":"(6)", // CIRCLED DIGIT SIX
	"\u2466":"(7)", // CIRCLED DIGIT SEVEN
	"\u2467":"(8)", // CIRCLED DIGIT EIGHT
	"\u2468":"(9)", // CIRCLED DIGIT NINE
	"\u2469":"(10)", // CIRCLED NUMBER TEN
	"\u246A":"(11)", // CIRCLED NUMBER ELEVEN
	"\u246B":"(12)", // CIRCLED NUMBER TWELVE
	"\u246C":"(13)", // CIRCLED NUMBER THIRTEEN
	"\u246D":"(14)", // CIRCLED NUMBER FOURTEEN
	"\u246E":"(15)", // CIRCLED NUMBER FIFTEEN
	"\u246F":"(16)", // CIRCLED NUMBER SIXTEEN
	"\u2470":"(17)", // CIRCLED NUMBER SEVENTEEN
	"\u2471":"(18)", // CIRCLED NUMBER EIGHTEEN
	"\u2472":"(19)", // CIRCLED NUMBER NINETEEN
	"\u2473":"(20)", // CIRCLED NUMBER TWENTY
	"\u2474":"(1)", // PARENTHESIZED DIGIT ONE
	"\u2475":"(2)", // PARENTHESIZED DIGIT TWO
	"\u2476":"(3)", // PARENTHESIZED DIGIT THREE
	"\u2477":"(4)", // PARENTHESIZED DIGIT FOUR
	"\u2478":"(5)", // PARENTHESIZED DIGIT FIVE
	"\u2479":"(6)", // PARENTHESIZED DIGIT SIX
	"\u247A":"(7)", // PARENTHESIZED DIGIT SEVEN
	"\u247B":"(8)", // PARENTHESIZED DIGIT EIGHT
	"\u247C":"(9)", // PARENTHESIZED DIGIT NINE
	"\u247D":"(10)", // PARENTHESIZED NUMBER TEN
	"\u247E":"(11)", // PARENTHESIZED NUMBER ELEVEN
	"\u247F":"(12)", // PARENTHESIZED NUMBER TWELVE
	"\u2480":"(13)", // PARENTHESIZED NUMBER THIRTEEN
	"\u2481":"(14)", // PARENTHESIZED NUMBER FOURTEEN
	"\u2482":"(15)", // PARENTHESIZED NUMBER FIFTEEN
	"\u2483":"(16)", // PARENTHESIZED NUMBER SIXTEEN
	"\u2484":"(17)", // PARENTHESIZED NUMBER SEVENTEEN
	"\u2485":"(18)", // PARENTHESIZED NUMBER EIGHTEEN
	"\u2486":"(19)", // PARENTHESIZED NUMBER NINETEEN
	"\u2487":"(20)", // PARENTHESIZED NUMBER TWENTY
	"\u2488":"1.", // DIGIT ONE FULL STOP
	"\u2489":"2.", // DIGIT TWO FULL STOP
	"\u248A":"3.", // DIGIT THREE FULL STOP
	"\u248B":"4.", // DIGIT FOUR FULL STOP
	"\u248C":"5.", // DIGIT FIVE FULL STOP
	"\u248D":"6.", // DIGIT SIX FULL STOP
	"\u248E":"7.", // DIGIT SEVEN FULL STOP
	"\u248F":"8.", // DIGIT EIGHT FULL STOP
	"\u2490":"9.", // DIGIT NINE FULL STOP
	"\u2491":"10.", // NUMBER TEN FULL STOP
	"\u2492":"11.", // NUMBER ELEVEN FULL STOP
	"\u2493":"12.", // NUMBER TWELVE FULL STOP
	"\u2494":"13.", // NUMBER THIRTEEN FULL STOP
	"\u2495":"14.", // NUMBER FOURTEEN FULL STOP
	"\u2496":"15.", // NUMBER FIFTEEN FULL STOP
	"\u2497":"16.", // NUMBER SIXTEEN FULL STOP
	"\u2498":"17.", // NUMBER SEVENTEEN FULL STOP
	"\u2499":"18.", // NUMBER EIGHTEEN FULL STOP
	"\u249A":"19.", // NUMBER NINETEEN FULL STOP
	"\u249B":"20.", // NUMBER TWENTY FULL STOP
	"\u249C":"(a)", // PARENTHESIZED LATIN SMALL LETTER A
	"\u249D":"(b)", // PARENTHESIZED LATIN SMALL LETTER B
	"\u249E":"(c)", // PARENTHESIZED LATIN SMALL LETTER C
	"\u249F":"(d)", // PARENTHESIZED LATIN SMALL LETTER D
	"\u24A0":"(e)", // PARENTHESIZED LATIN SMALL LETTER E
	"\u24A1":"(f)", // PARENTHESIZED LATIN SMALL LETTER F
	"\u24A2":"(g)", // PARENTHESIZED LATIN SMALL LETTER G
	"\u24A3":"(h)", // PARENTHESIZED LATIN SMALL LETTER H
	"\u24A4":"(i)", // PARENTHESIZED LATIN SMALL LETTER I
	"\u24A5":"(j)", // PARENTHESIZED LATIN SMALL LETTER J
	"\u24A6":"(k)", // PARENTHESIZED LATIN SMALL LETTER K
	"\u24A7":"(l)", // PARENTHESIZED LATIN SMALL LETTER L
	"\u24A8":"(m)", // PARENTHESIZED LATIN SMALL LETTER M
	"\u24A9":"(n)", // PARENTHESIZED LATIN SMALL LETTER N
	"\u24AA":"(o)", // PARENTHESIZED LATIN SMALL LETTER O
	"\u24AB":"(p)", // PARENTHESIZED LATIN SMALL LETTER P
	"\u24AC":"(q)", // PARENTHESIZED LATIN SMALL LETTER Q
	"\u24AD":"(r)", // PARENTHESIZED LATIN SMALL LETTER R
	"\u24AE":"(s)", // PARENTHESIZED LATIN SMALL LETTER S
	"\u24AF":"(t)", // PARENTHESIZED LATIN SMALL LETTER T
	"\u24B0":"(u)", // PARENTHESIZED LATIN SMALL LETTER U
	"\u24B1":"(v)", // PARENTHESIZED LATIN SMALL LETTER V
	"\u24B2":"(w)", // PARENTHESIZED LATIN SMALL LETTER W
	"\u24B3":"(x)", // PARENTHESIZED LATIN SMALL LETTER X
	"\u24B4":"(y)", // PARENTHESIZED LATIN SMALL LETTER Y
	"\u24B5":"(z)", // PARENTHESIZED LATIN SMALL LETTER Z
	"\u24B6":"(A)", // CIRCLED LATIN CAPITAL LETTER A
	"\u24B7":"(B)", // CIRCLED LATIN CAPITAL LETTER B
	"\u24B8":"(C)", // CIRCLED LATIN CAPITAL LETTER C
	"\u24B9":"(D)", // CIRCLED LATIN CAPITAL LETTER D
	"\u24BA":"(E)", // CIRCLED LATIN CAPITAL LETTER E
	"\u24BB":"(F)", // CIRCLED LATIN CAPITAL LETTER F
	"\u24BC":"(G)", // CIRCLED LATIN CAPITAL LETTER G
	"\u24BD":"(H)", // CIRCLED LATIN CAPITAL LETTER H
	"\u24BE":"(I)", // CIRCLED LATIN CAPITAL LETTER I
	"\u24BF":"(J)", // CIRCLED LATIN CAPITAL LETTER J
	"\u24C0":"(K)", // CIRCLED LATIN CAPITAL LETTER K
	"\u24C1":"(L)", // CIRCLED LATIN CAPITAL LETTER L
	"\u24C2":"(M)", // CIRCLED LATIN CAPITAL LETTER M
	"\u24C3":"(N)", // CIRCLED LATIN CAPITAL LETTER N
	"\u24C4":"(O)", // CIRCLED LATIN CAPITAL LETTER O
	"\u24C5":"(P)", // CIRCLED LATIN CAPITAL LETTER P
	"\u24C6":"(Q)", // CIRCLED LATIN CAPITAL LETTER Q
	"\u24C7":"(R)", // CIRCLED LATIN CAPITAL LETTER R
	"\u24C8":"(S)", // CIRCLED LATIN CAPITAL LETTER S
	"\u24C9":"(T)", // CIRCLED LATIN CAPITAL LETTER T
	"\u24CA":"(U)", // CIRCLED LATIN CAPITAL LETTER U
	"\u24CB":"(V)", // CIRCLED LATIN CAPITAL LETTER V
	"\u24CC":"(W)", // CIRCLED LATIN CAPITAL LETTER W
	"\u24CD":"(X)", // CIRCLED LATIN CAPITAL LETTER X
	"\u24CE":"(Y)", // CIRCLED LATIN CAPITAL LETTER Y
	"\u24CF":"(Z)", // CIRCLED LATIN CAPITAL LETTER Z
	"\u24D0":"(a)", // CIRCLED LATIN SMALL LETTER A
	"\u24D1":"(b)", // CIRCLED LATIN SMALL LETTER B
	"\u24D2":"(c)", // CIRCLED LATIN SMALL LETTER C
	"\u24D3":"(d)", // CIRCLED LATIN SMALL LETTER D
	"\u24D4":"(e)", // CIRCLED LATIN SMALL LETTER E
	"\u24D5":"(f)", // CIRCLED LATIN SMALL LETTER F
	"\u24D6":"(g)", // CIRCLED LATIN SMALL LETTER G
	"\u24D7":"(h)", // CIRCLED LATIN SMALL LETTER H
	"\u24D8":"(i)", // CIRCLED LATIN SMALL LETTER I
	"\u24D9":"(j)", // CIRCLED LATIN SMALL LETTER J
	"\u24DA":"(k)", // CIRCLED LATIN SMALL LETTER K
	"\u24DB":"(l)", // CIRCLED LATIN SMALL LETTER L
	"\u24DC":"(m)", // CIRCLED LATIN SMALL LETTER M
	"\u24DD":"(n)", // CIRCLED LATIN SMALL LETTER N
	"\u24DE":"(o)", // CIRCLED LATIN SMALL LETTER O
	"\u24DF":"(p)", // CIRCLED LATIN SMALL LETTER P
	"\u24E0":"(q)", // CIRCLED LATIN SMALL LETTER Q
	"\u24E1":"(r)", // CIRCLED LATIN SMALL LETTER R
	"\u24E2":"(s)", // CIRCLED LATIN SMALL LETTER S
	"\u24E3":"(t)", // CIRCLED LATIN SMALL LETTER T
	"\u24E4":"(u)", // CIRCLED LATIN SMALL LETTER U
	"\u24E5":"(v)", // CIRCLED LATIN SMALL LETTER V
	"\u24E6":"(w)", // CIRCLED LATIN SMALL LETTER W
	"\u24E7":"(x)", // CIRCLED LATIN SMALL LETTER X
	"\u24E8":"(y)", // CIRCLED LATIN SMALL LETTER Y
	"\u24E9":"(z)", // CIRCLED LATIN SMALL LETTER Z
	"\u24EA":"(0)", // CIRCLED DIGIT ZERO
	"\u2500":"-", // BOX DRAWINGS LIGHT HORIZONTAL
	"\u2501":"=", // BOX DRAWINGS HEAVY HORIZONTAL
	"\u2502":"|", // BOX DRAWINGS LIGHT VERTICAL
	"\u2503":"|", // BOX DRAWINGS HEAVY VERTICAL
	"\u2504":"-", // BOX DRAWINGS LIGHT TRIPLE DASH HORIZONTAL
	"\u2505":"=", // BOX DRAWINGS HEAVY TRIPLE DASH HORIZONTAL
	"\u2506":"|", // BOX DRAWINGS LIGHT TRIPLE DASH VERTICAL
	"\u2507":"|", // BOX DRAWINGS HEAVY TRIPLE DASH VERTICAL
	"\u2508":"-", // BOX DRAWINGS LIGHT QUADRUPLE DASH HORIZONTAL
	"\u2509":"=", // BOX DRAWINGS HEAVY QUADRUPLE DASH HORIZONTAL
	"\u250A":"|", // BOX DRAWINGS LIGHT QUADRUPLE DASH VERTICAL
	"\u250B":"|", // BOX DRAWINGS HEAVY QUADRUPLE DASH VERTICAL
	"\u250C":"+", // BOX DRAWINGS LIGHT DOWN AND RIGHT
	"\u250D":"+", // BOX DRAWINGS DOWN LIGHT AND RIGHT HEAVY
	"\u250E":"+", // BOX DRAWINGS DOWN HEAVY AND RIGHT LIGHT
	"\u250F":"+", // BOX DRAWINGS HEAVY DOWN AND RIGHT
	"\u2510":"+", // BOX DRAWINGS LIGHT DOWN AND LEFT
	"\u2511":"+", // BOX DRAWINGS DOWN LIGHT AND LEFT HEAVY
	"\u2512":"+", // BOX DRAWINGS DOWN HEAVY AND LEFT LIGHT
	"\u2513":"+", // BOX DRAWINGS HEAVY DOWN AND LEFT
	"\u2514":"+", // BOX DRAWINGS LIGHT UP AND RIGHT
	"\u2515":"+", // BOX DRAWINGS UP LIGHT AND RIGHT HEAVY
	"\u2516":"+", // BOX DRAWINGS UP HEAVY AND RIGHT LIGHT
	"\u2517":"+", // BOX DRAWINGS HEAVY UP AND RIGHT
	"\u2518":"+", // BOX DRAWINGS LIGHT UP AND LEFT
	"\u2519":"+", // BOX DRAWINGS UP LIGHT AND LEFT HEAVY
	"\u251A":"+", // BOX DRAWINGS UP HEAVY AND LEFT LIGHT
	"\u251B":"+", // BOX DRAWINGS HEAVY UP AND LEFT
	"\u251C":"+", // BOX DRAWINGS LIGHT VERTICAL AND RIGHT
	"\u251D":"+", // BOX DRAWINGS VERTICAL LIGHT AND RIGHT HEAVY
	"\u251E":"+", // BOX DRAWINGS UP HEAVY AND RIGHT DOWN LIGHT
	"\u251F":"+", // BOX DRAWINGS DOWN HEAVY AND RIGHT UP LIGHT
	"\u2520":"+", // BOX DRAWINGS VERTICAL HEAVY AND RIGHT LIGHT
	"\u2521":"+", // BOX DRAWINGS DOWN LIGHT AND RIGHT UP HEAVY
	"\u2522":"+", // BOX DRAWINGS UP LIGHT AND RIGHT DOWN HEAVY
	"\u2523":"+", // BOX DRAWINGS HEAVY VERTICAL AND RIGHT
	"\u2524":"+", // BOX DRAWINGS LIGHT VERTICAL AND LEFT
	"\u2525":"+", // BOX DRAWINGS VERTICAL LIGHT AND LEFT HEAVY
	"\u2526":"+", // BOX DRAWINGS UP HEAVY AND LEFT DOWN LIGHT
	"\u2527":"+", // BOX DRAWINGS DOWN HEAVY AND LEFT UP LIGHT
	"\u2528":"+", // BOX DRAWINGS VERTICAL HEAVY AND LEFT LIGHT
	"\u2529":"+", // BOX DRAWINGS DOWN LIGHT AND LEFT UP HEAVY
	"\u252A":"+", // BOX DRAWINGS UP LIGHT AND LEFT DOWN HEAVY
	"\u252B":"+", // BOX DRAWINGS HEAVY VERTICAL AND LEFT
	"\u252C":"+", // BOX DRAWINGS LIGHT DOWN AND HORIZONTAL
	"\u252D":"+", // BOX DRAWINGS LEFT HEAVY AND RIGHT DOWN LIGHT
	"\u252E":"+", // BOX DRAWINGS RIGHT HEAVY AND LEFT DOWN LIGHT
	"\u252F":"+", // BOX DRAWINGS DOWN LIGHT AND HORIZONTAL HEAVY
	"\u2530":"+", // BOX DRAWINGS DOWN HEAVY AND HORIZONTAL LIGHT
	"\u2531":"+", // BOX DRAWINGS RIGHT LIGHT AND LEFT DOWN HEAVY
	"\u2532":"+", // BOX DRAWINGS LEFT LIGHT AND RIGHT DOWN HEAVY
	"\u2533":"+", // BOX DRAWINGS HEAVY DOWN AND HORIZONTAL
	"\u2534":"+", // BOX DRAWINGS LIGHT UP AND HORIZONTAL
	"\u2535":"+", // BOX DRAWINGS LEFT HEAVY AND RIGHT UP LIGHT
	"\u2536":"+", // BOX DRAWINGS RIGHT HEAVY AND LEFT UP LIGHT
	"\u2537":"+", // BOX DRAWINGS UP LIGHT AND HORIZONTAL HEAVY
	"\u2538":"+", // BOX DRAWINGS UP HEAVY AND HORIZONTAL LIGHT
	"\u2539":"+", // BOX DRAWINGS RIGHT LIGHT AND LEFT UP HEAVY
	"\u253A":"+", // BOX DRAWINGS LEFT LIGHT AND RIGHT UP HEAVY
	"\u253B":"+", // BOX DRAWINGS HEAVY UP AND HORIZONTAL
	"\u253C":"+", // BOX DRAWINGS LIGHT VERTICAL AND HORIZONTAL
	"\u253D":"+", // BOX DRAWINGS LEFT HEAVY AND RIGHT VERTICAL LIGHT
	"\u253E":"+", // BOX DRAWINGS RIGHT HEAVY AND LEFT VERTICAL LIGHT
	"\u253F":"+", // BOX DRAWINGS VERTICAL LIGHT AND HORIZONTAL HEAVY
	"\u2540":"+", // BOX DRAWINGS UP HEAVY AND DOWN HORIZONTAL LIGHT
	"\u2541":"+", // BOX DRAWINGS DOWN HEAVY AND UP HORIZONTAL LIGHT
	"\u2542":"+", // BOX DRAWINGS VERTICAL HEAVY AND HORIZONTAL LIGHT
	"\u2543":"+", // BOX DRAWINGS LEFT UP HEAVY AND RIGHT DOWN LIGHT
	"\u2544":"+", // BOX DRAWINGS RIGHT UP HEAVY AND LEFT DOWN LIGHT
	"\u2545":"+", // BOX DRAWINGS LEFT DOWN HEAVY AND RIGHT UP LIGHT
	"\u2546":"+", // BOX DRAWINGS RIGHT DOWN HEAVY AND LEFT UP LIGHT
	"\u2547":"+", // BOX DRAWINGS DOWN LIGHT AND UP HORIZONTAL HEAVY
	"\u2548":"+", // BOX DRAWINGS UP LIGHT AND DOWN HORIZONTAL HEAVY
	"\u2549":"+", // BOX DRAWINGS RIGHT LIGHT AND LEFT VERTICAL HEAVY
	"\u254A":"+", // BOX DRAWINGS LEFT LIGHT AND RIGHT VERTICAL HEAVY
	"\u254B":"+", // BOX DRAWINGS HEAVY VERTICAL AND HORIZONTAL
	"\u254C":"-", // BOX DRAWINGS LIGHT DOUBLE DASH HORIZONTAL
	"\u254D":"=", // BOX DRAWINGS HEAVY DOUBLE DASH HORIZONTAL
	"\u254E":"|", // BOX DRAWINGS LIGHT DOUBLE DASH VERTICAL
	"\u254F":"|", // BOX DRAWINGS HEAVY DOUBLE DASH VERTICAL
	"\u2550":"=", // BOX DRAWINGS DOUBLE HORIZONTAL
	"\u2551":"|", // BOX DRAWINGS DOUBLE VERTICAL
	"\u2552":"+", // BOX DRAWINGS DOWN SINGLE AND RIGHT DOUBLE
	"\u2553":"+", // BOX DRAWINGS DOWN DOUBLE AND RIGHT SINGLE
	"\u2554":"+", // BOX DRAWINGS DOUBLE DOWN AND RIGHT
	"\u2555":"+", // BOX DRAWINGS DOWN SINGLE AND LEFT DOUBLE
	"\u2556":"+", // BOX DRAWINGS DOWN DOUBLE AND LEFT SINGLE
	"\u2557":"+", // BOX DRAWINGS DOUBLE DOWN AND LEFT
	"\u2558":"+", // BOX DRAWINGS UP SINGLE AND RIGHT DOUBLE
	"\u2559":"+", // BOX DRAWINGS UP DOUBLE AND RIGHT SINGLE
	"\u255A":"+", // BOX DRAWINGS DOUBLE UP AND RIGHT
	"\u255B":"+", // BOX DRAWINGS UP SINGLE AND LEFT DOUBLE
	"\u255C":"+", // BOX DRAWINGS UP DOUBLE AND LEFT SINGLE
	"\u255D":"+", // BOX DRAWINGS DOUBLE UP AND LEFT
	"\u255E":"+", // BOX DRAWINGS VERTICAL SINGLE AND RIGHT DOUBLE
	"\u255F":"+", // BOX DRAWINGS VERTICAL DOUBLE AND RIGHT SINGLE
	"\u2560":"+", // BOX DRAWINGS DOUBLE VERTICAL AND RIGHT
	"\u2561":"+", // BOX DRAWINGS VERTICAL SINGLE AND LEFT DOUBLE
	"\u2562":"+", // BOX DRAWINGS VERTICAL DOUBLE AND LEFT SINGLE
	"\u2563":"+", // BOX DRAWINGS DOUBLE VERTICAL AND LEFT
	"\u2564":"+", // BOX DRAWINGS DOWN SINGLE AND HORIZONTAL DOUBLE
	"\u2565":"+", // BOX DRAWINGS DOWN DOUBLE AND HORIZONTAL SINGLE
	"\u2566":"+", // BOX DRAWINGS DOUBLE DOWN AND HORIZONTAL
	"\u2567":"+", // BOX DRAWINGS UP SINGLE AND HORIZONTAL DOUBLE
	"\u2568":"+", // BOX DRAWINGS UP DOUBLE AND HORIZONTAL SINGLE
	"\u2569":"+", // BOX DRAWINGS DOUBLE UP AND HORIZONTAL
	"\u256A":"+", // BOX DRAWINGS VERTICAL SINGLE AND HORIZONTAL DOUBLE
	"\u256B":"+", // BOX DRAWINGS VERTICAL DOUBLE AND HORIZONTAL SINGLE
	"\u256C":"+", // BOX DRAWINGS DOUBLE VERTICAL AND HORIZONTAL
	"\u256D":"+", // BOX DRAWINGS LIGHT ARC DOWN AND RIGHT
	"\u256E":"+", // BOX DRAWINGS LIGHT ARC DOWN AND LEFT
	"\u256F":"+", // BOX DRAWINGS LIGHT ARC UP AND LEFT
	"\u2570":"+", // BOX DRAWINGS LIGHT ARC UP AND RIGHT
	"\u2571":"/", // BOX DRAWINGS LIGHT DIAGONAL UPPER RIGHT TO LOWER LEFT
	"\u2572":"\\", // BOX DRAWINGS LIGHT DIAGONAL UPPER LEFT TO LOWER RIGHT
	"\u2573":"X", // BOX DRAWINGS LIGHT DIAGONAL CROSS
	"\u257C":"-", // BOX DRAWINGS LIGHT LEFT AND HEAVY RIGHT
	"\u257D":"|", // BOX DRAWINGS LIGHT UP AND HEAVY DOWN
	"\u257E":"-", // BOX DRAWINGS HEAVY LEFT AND LIGHT RIGHT
	"\u257F":"|", // BOX DRAWINGS HEAVY UP AND LIGHT DOWN
	"\u25CB":"o", // WHITE CIRCLE
	"\u25E6":"{\\textopenbullet}", // WHITE BULLET
	"\u2605":"*", // BLACK STAR
	"\u2606":"*", // WHITE STAR
	"\u2612":"X", // BALLOT BOX WITH X
	"\u2613":"X", // SALTIRE
	"\u2639":":-(", // WHITE FROWNING FACE
	"\u263A":":-)", // WHITE SMILING FACE
	"\u263B":"(-:", // BLACK SMILING FACE
	"\u266D":"b", // MUSIC FLAT SIGN
	"\u266F":"$\\#$", // MUSIC SHARP SIGN
	"\u2701":"$\\%<$", // UPPER BLADE SCISSORS
	"\u2702":"$\\%<$", // BLACK SCISSORS
	"\u2703":"$\\%<$", // LOWER BLADE SCISSORS
	"\u2704":"$\\%<$", // WHITE SCISSORS
	"\u270C":"V", // VICTORY HAND
	"\u2713":"v", // CHECK MARK
	"\u2714":"V", // HEAVY CHECK MARK
	"\u2715":"x", // MULTIPLICATION X
	"\u2716":"x", // HEAVY MULTIPLICATION X
	"\u2717":"X", // BALLOT X
	"\u2718":"X", // HEAVY BALLOT X
	"\u2719":"+", // OUTLINED GREEK CROSS
	"\u271A":"+", // HEAVY GREEK CROSS
	"\u271B":"+", // OPEN CENTRE CROSS
	"\u271C":"+", // HEAVY OPEN CENTRE CROSS
	"\u271D":"+", // LATIN CROSS
	"\u271E":"+", // SHADOWED WHITE LATIN CROSS
	"\u271F":"+", // OUTLINED LATIN CROSS
	"\u2720":"+", // MALTESE CROSS
	"\u2721":"*", // STAR OF DAVID
	"\u2722":"+", // FOUR TEARDROP-SPOKED ASTERISK
	"\u2723":"+", // FOUR BALLOON-SPOKED ASTERISK
	"\u2724":"+", // HEAVY FOUR BALLOON-SPOKED ASTERISK
	"\u2725":"+", // FOUR CLUB-SPOKED ASTERISK
	"\u2726":"+", // BLACK FOUR POINTED STAR
	"\u2727":"+", // WHITE FOUR POINTED STAR
	"\u2729":"*", // STRESS OUTLINED WHITE STAR
	"\u272A":"*", // CIRCLED WHITE STAR
	"\u272B":"*", // OPEN CENTRE BLACK STAR
	"\u272C":"*", // BLACK CENTRE WHITE STAR
	"\u272D":"*", // OUTLINED BLACK STAR
	"\u272E":"*", // HEAVY OUTLINED BLACK STAR
	"\u272F":"*", // PINWHEEL STAR
	"\u2730":"*", // SHADOWED WHITE STAR
	"\u2731":"*", // HEAVY ASTERISK
	"\u2732":"*", // OPEN CENTRE ASTERISK
	"\u2733":"*", // EIGHT SPOKED ASTERISK
	"\u2734":"*", // EIGHT POINTED BLACK STAR
	"\u2735":"*", // EIGHT POINTED PINWHEEL STAR
	"\u2736":"*", // SIX POINTED BLACK STAR
	"\u2737":"*", // EIGHT POINTED RECTILINEAR BLACK STAR
	"\u2738":"*", // HEAVY EIGHT POINTED RECTILINEAR BLACK STAR
	"\u2739":"*", // TWELVE POINTED BLACK STAR
	"\u273A":"*", // SIXTEEN POINTED ASTERISK
	"\u273B":"*", // TEARDROP-SPOKED ASTERISK
	"\u273C":"*", // OPEN CENTRE TEARDROP-SPOKED ASTERISK
	"\u273D":"*", // HEAVY TEARDROP-SPOKED ASTERISK
	"\u273E":"*", // SIX PETALLED BLACK AND WHITE FLORETTE
	"\u273F":"*", // BLACK FLORETTE
	"\u2740":"*", // WHITE FLORETTE
	"\u2741":"*", // EIGHT PETALLED OUTLINED BLACK FLORETTE
	"\u2742":"*", // CIRCLED OPEN CENTRE EIGHT POINTED STAR
	"\u2743":"*", // HEAVY TEARDROP-SPOKED PINWHEEL ASTERISK
	"\u2744":"*", // SNOWFLAKE
	"\u2745":"*", // TIGHT TRIFOLIATE SNOWFLAKE
	"\u2746":"*", // HEAVY CHEVRON SNOWFLAKE
	"\u2747":"*", // SPARKLE
	"\u2748":"*", // HEAVY SPARKLE
	"\u2749":"*", // BALLOON-SPOKED ASTERISK
	"\u274A":"*", // EIGHT TEARDROP-SPOKED PROPELLER ASTERISK
	"\u274B":"*", // HEAVY EIGHT TEARDROP-SPOKED PROPELLER ASTERISK
	"\uFB00":"ff", // LATIN SMALL LIGATURE FF
	"\uFB01":"fi", // LATIN SMALL LIGATURE FI
	"\uFB02":"fl", // LATIN SMALL LIGATURE FL
	"\uFB03":"ffi", // LATIN SMALL LIGATURE FFI
	"\uFB04":"ffl", // LATIN SMALL LIGATURE FFL
	"\uFB05":"st", // LATIN SMALL LIGATURE LONG S T
	"\uFB06":"st", // LATIN SMALL LIGATURE ST
	/* Derived accented characters */

	/* These two require the "semtrans" package to work; uncomment to enable */
	/*	"\u02BF":"\{\\Ayn}", // MGR Ayn
		"\u02BE":"\{\\Alif}", // MGR Alif/Hamza
	*/
	"\u00C0":"{\\`A}", // LATIN CAPITAL LETTER A WITH GRAVE
	"\u00C1":"{\\'A}", // LATIN CAPITAL LETTER A WITH ACUTE
	"\u00C2":"{\\^A}", // LATIN CAPITAL LETTER A WITH CIRCUMFLEX
	"\u00C3":"{\\~A}", // LATIN CAPITAL LETTER A WITH TILDE
	"\u00C4":"{\\\"A}", // LATIN CAPITAL LETTER A WITH DIAERESIS
	"\u00C5":"{\\r A}", // LATIN CAPITAL LETTER A WITH RING ABOVE
	"\u00C7":"{\\c C}", // LATIN CAPITAL LETTER C WITH CEDILLA
	"\u00C8":"{\\`E}", // LATIN CAPITAL LETTER E WITH GRAVE
	"\u00C9":"{\\'E}", // LATIN CAPITAL LETTER E WITH ACUTE
	"\u00CA":"{\\^E}", // LATIN CAPITAL LETTER E WITH CIRCUMFLEX
	"\u00CB":"{\\\"E}", // LATIN CAPITAL LETTER E WITH DIAERESIS
	"\u00CC":"{\\`I}", // LATIN CAPITAL LETTER I WITH GRAVE
	"\u00CD":"{\\'I}", // LATIN CAPITAL LETTER I WITH ACUTE
	"\u00CE":"{\\^I}", // LATIN CAPITAL LETTER I WITH CIRCUMFLEX
	"\u00CF":"{\\\"I}", // LATIN CAPITAL LETTER I WITH DIAERESIS
	"\u00D1":"{\\~N}", // LATIN CAPITAL LETTER N WITH TILDE
	"\u00D2":"{\\`O}", // LATIN CAPITAL LETTER O WITH GRAVE
	"\u00D3":"{\\'O}", // LATIN CAPITAL LETTER O WITH ACUTE
	"\u00D4":"{\\^O}", // LATIN CAPITAL LETTER O WITH CIRCUMFLEX
	"\u00D5":"{\\~O}", // LATIN CAPITAL LETTER O WITH TILDE
	"\u00D6":"{\\\"O}", // LATIN CAPITAL LETTER O WITH DIAERESIS
	"\u00D9":"{\\`U}", // LATIN CAPITAL LETTER U WITH GRAVE
	"\u00DA":"{\\'U}", // LATIN CAPITAL LETTER U WITH ACUTE
	"\u00DB":"{\\^U}", // LATIN CAPITAL LETTER U WITH CIRCUMFLEX
	"\u00DC":"{\\\"U}", // LATIN CAPITAL LETTER U WITH DIAERESIS
	"\u00DD":"{\\'Y}", // LATIN CAPITAL LETTER Y WITH ACUTE
	"\u00E0":"{\\`a}", // LATIN SMALL LETTER A WITH GRAVE
	"\u00E1":"{\\'a}", // LATIN SMALL LETTER A WITH ACUTE
	"\u00E2":"{\\^a}", // LATIN SMALL LETTER A WITH CIRCUMFLEX
	"\u00E3":"{\\~a}", // LATIN SMALL LETTER A WITH TILDE
	"\u00E4":"{\\\"a}", // LATIN SMALL LETTER A WITH DIAERESIS
	"\u00E5":"{\\r a}", // LATIN SMALL LETTER A WITH RING ABOVE
	"\u00E7":"{\\c c}", // LATIN SMALL LETTER C WITH CEDILLA
	"\u00E8":"{\\`e}", // LATIN SMALL LETTER E WITH GRAVE
	"\u00E9":"{\\'e}", // LATIN SMALL LETTER E WITH ACUTE
	"\u00EA":"{\\^e}", // LATIN SMALL LETTER E WITH CIRCUMFLEX
	"\u00EB":"{\\\"e}", // LATIN SMALL LETTER E WITH DIAERESIS
	"\u00EC":"{\\`i}", // LATIN SMALL LETTER I WITH GRAVE
	"\u00ED":"{\\'i}", // LATIN SMALL LETTER I WITH ACUTE
	"\u00EE":"{\\^i}", // LATIN SMALL LETTER I WITH CIRCUMFLEX
	"\u00EF":"{\\\"i}", // LATIN SMALL LETTER I WITH DIAERESIS
	"\u00F1":"{\\~n}", // LATIN SMALL LETTER N WITH TILDE
	"\u00F2":"{\\`o}", // LATIN SMALL LETTER O WITH GRAVE
	"\u00F3":"{\\'o}", // LATIN SMALL LETTER O WITH ACUTE
	"\u00F4":"{\\^o}", // LATIN SMALL LETTER O WITH CIRCUMFLEX
	"\u00F5":"{\\~o}", // LATIN SMALL LETTER O WITH TILDE
	"\u00F6":"{\\\"o}", // LATIN SMALL LETTER O WITH DIAERESIS
	"\u00F9":"{\\`u}", // LATIN SMALL LETTER U WITH GRAVE
	"\u00FA":"{\\'u}", // LATIN SMALL LETTER U WITH ACUTE
	"\u00FB":"{\\^u}", // LATIN SMALL LETTER U WITH CIRCUMFLEX
	"\u00FC":"{\\\"u}", // LATIN SMALL LETTER U WITH DIAERESIS
	"\u00FD":"{\\'y}", // LATIN SMALL LETTER Y WITH ACUTE
	"\u00FF":"{\\\"y}", // LATIN SMALL LETTER Y WITH DIAERESIS
	"\u0100":"{\\=A}", // LATIN CAPITAL LETTER A WITH MACRON
	"\u0101":"{\\=a}", // LATIN SMALL LETTER A WITH MACRON
	"\u0102":"{\\u A}", // LATIN CAPITAL LETTER A WITH BREVE
	"\u0103":"{\\u a}", // LATIN SMALL LETTER A WITH BREVE
	"\u0104":"{\\k A}", // LATIN CAPITAL LETTER A WITH OGONEK
	"\u0105":"{\\k a}", // LATIN SMALL LETTER A WITH OGONEK
	"\u0106":"{\\'C}", // LATIN CAPITAL LETTER C WITH ACUTE
	"\u0107":"{\\'c}", // LATIN SMALL LETTER C WITH ACUTE
	"\u0108":"{\\^C}", // LATIN CAPITAL LETTER C WITH CIRCUMFLEX
	"\u0109":"{\\^c}", // LATIN SMALL LETTER C WITH CIRCUMFLEX
	"\u010A":"{\\.C}", // LATIN CAPITAL LETTER C WITH DOT ABOVE
	"\u010B":"{\\.c}", // LATIN SMALL LETTER C WITH DOT ABOVE
	"\u010C":"{\\v C}", // LATIN CAPITAL LETTER C WITH CARON
	"\u010D":"{\\v c}", // LATIN SMALL LETTER C WITH CARON
	"\u010E":"{\\v D}", // LATIN CAPITAL LETTER D WITH CARON
	"\u010F":"{\\v d}", // LATIN SMALL LETTER D WITH CARON
	"\u0112":"{\\=E}", // LATIN CAPITAL LETTER E WITH MACRON
	"\u0113":"{\\=e}", // LATIN SMALL LETTER E WITH MACRON
	"\u0114":"{\\u E}", // LATIN CAPITAL LETTER E WITH BREVE
	"\u0115":"{\\u e}", // LATIN SMALL LETTER E WITH BREVE
	"\u0116":"{\\.E}", // LATIN CAPITAL LETTER E WITH DOT ABOVE
	"\u0117":"{\\.e}", // LATIN SMALL LETTER E WITH DOT ABOVE
	"\u0118":"{\\k E}", // LATIN CAPITAL LETTER E WITH OGONEK
	"\u0119":"{\\k e}", // LATIN SMALL LETTER E WITH OGONEK
	"\u011A":"{\\v E}", // LATIN CAPITAL LETTER E WITH CARON
	"\u011B":"{\\v e}", // LATIN SMALL LETTER E WITH CARON
	"\u011C":"{\\^G}", // LATIN CAPITAL LETTER G WITH CIRCUMFLEX
	"\u011D":"{\\^g}", // LATIN SMALL LETTER G WITH CIRCUMFLEX
	"\u011E":"{\\u G}", // LATIN CAPITAL LETTER G WITH BREVE
	"\u011F":"{\\u g}", // LATIN SMALL LETTER G WITH BREVE
	"\u0120":"{\\.G}", // LATIN CAPITAL LETTER G WITH DOT ABOVE
	"\u0121":"{\\.g}", // LATIN SMALL LETTER G WITH DOT ABOVE
	"\u0122":"{\\c G}", // LATIN CAPITAL LETTER G WITH CEDILLA
	"\u0123":"{\\c g}", // LATIN SMALL LETTER G WITH CEDILLA
	"\u0124":"{\\^H}", // LATIN CAPITAL LETTER H WITH CIRCUMFLEX
	"\u0125":"{\\^h}", // LATIN SMALL LETTER H WITH CIRCUMFLEX
	"\u0128":"{\\~I}", // LATIN CAPITAL LETTER I WITH TILDE
	"\u0129":"{\\~i}", // LATIN SMALL LETTER I WITH TILDE
	"\u012A":"{\\=I}", // LATIN CAPITAL LETTER I WITH MACRON
	"\u012B":"{\\=\\i}", // LATIN SMALL LETTER I WITH MACRON
	"\u012C":"{\\u I}", // LATIN CAPITAL LETTER I WITH BREVE
	"\u012D":"{\\u i}", // LATIN SMALL LETTER I WITH BREVE
	"\u012E":"{\\k I}", // LATIN CAPITAL LETTER I WITH OGONEK
	"\u012F":"{\\k i}", // LATIN SMALL LETTER I WITH OGONEK
	"\u0130":"{\\.I}", // LATIN CAPITAL LETTER I WITH DOT ABOVE
	"\u0134":"{\\^J}", // LATIN CAPITAL LETTER J WITH CIRCUMFLEX
	"\u0135":"{\\^j}", // LATIN SMALL LETTER J WITH CIRCUMFLEX
	"\u0136":"{\\c K}", // LATIN CAPITAL LETTER K WITH CEDILLA
	"\u0137":"{\\c k}", // LATIN SMALL LETTER K WITH CEDILLA
	"\u0139":"{\\'L}", // LATIN CAPITAL LETTER L WITH ACUTE
	"\u013A":"{\\'l}", // LATIN SMALL LETTER L WITH ACUTE
	"\u013B":"{\\c L}", // LATIN CAPITAL LETTER L WITH CEDILLA
	"\u013C":"{\\c l}", // LATIN SMALL LETTER L WITH CEDILLA
	"\u013D":"{\\v L}", // LATIN CAPITAL LETTER L WITH CARON
	"\u013E":"{\\v l}", // LATIN SMALL LETTER L WITH CARON
	"\u0141":"{\\L }", //LATIN CAPITAL LETTER L WITH STROKE
	"\u0142":"{\\l }", //LATIN SMALL LETTER L WITH STROKE
	"\u0143":"{\\'N}", // LATIN CAPITAL LETTER N WITH ACUTE
	"\u0144":"{\\'n}", // LATIN SMALL LETTER N WITH ACUTE
	"\u0145":"{\\c N}", // LATIN CAPITAL LETTER N WITH CEDILLA
	"\u0146":"{\\c n}", // LATIN SMALL LETTER N WITH CEDILLA
	"\u0147":"{\\v N}", // LATIN CAPITAL LETTER N WITH CARON
	"\u0148":"{\\v n}", // LATIN SMALL LETTER N WITH CARON
	"\u014C":"{\\=O}", // LATIN CAPITAL LETTER O WITH MACRON
	"\u014D":"{\\=o}", // LATIN SMALL LETTER O WITH MACRON
	"\u014E":"{\\u O}", // LATIN CAPITAL LETTER O WITH BREVE
	"\u014F":"{\\u o}", // LATIN SMALL LETTER O WITH BREVE
	"\u0150":"{\\H O}", // LATIN CAPITAL LETTER O WITH DOUBLE ACUTE
	"\u0151":"{\\H o}", // LATIN SMALL LETTER O WITH DOUBLE ACUTE
	"\u0154":"{\\'R}", // LATIN CAPITAL LETTER R WITH ACUTE
	"\u0155":"{\\'r}", // LATIN SMALL LETTER R WITH ACUTE
	"\u0156":"{\\c R}", // LATIN CAPITAL LETTER R WITH CEDILLA
	"\u0157":"{\\c r}", // LATIN SMALL LETTER R WITH CEDILLA
	"\u0158":"{\\v R}", // LATIN CAPITAL LETTER R WITH CARON
	"\u0159":"{\\v r}", // LATIN SMALL LETTER R WITH CARON
	"\u015A":"{\\'S}", // LATIN CAPITAL LETTER S WITH ACUTE
	"\u015B":"{\\'s}", // LATIN SMALL LETTER S WITH ACUTE
	"\u015C":"{\\^S}", // LATIN CAPITAL LETTER S WITH CIRCUMFLEX
	"\u015D":"{\\^s}", // LATIN SMALL LETTER S WITH CIRCUMFLEX
	"\u015E":"{\\c S}", // LATIN CAPITAL LETTER S WITH CEDILLA
	"\u015F":"{\\c s}", // LATIN SMALL LETTER S WITH CEDILLA
	"\u0160":"{\\v S}", // LATIN CAPITAL LETTER S WITH CARON
	"\u0161":"{\\v s}", // LATIN SMALL LETTER S WITH CARON
	"\u0162":"{\\c T}", // LATIN CAPITAL LETTER T WITH CEDILLA
	"\u0163":"{\\c t}", // LATIN SMALL LETTER T WITH CEDILLA
	"\u0164":"{\\v T}", // LATIN CAPITAL LETTER T WITH CARON
	"\u0165":"{\\v t}", // LATIN SMALL LETTER T WITH CARON
	"\u0168":"{\\~U}", // LATIN CAPITAL LETTER U WITH TILDE
	"\u0169":"{\\~u}", // LATIN SMALL LETTER U WITH TILDE
	"\u016A":"{\\=U}", // LATIN CAPITAL LETTER U WITH MACRON
	"\u016B":"{\\=u}", // LATIN SMALL LETTER U WITH MACRON
	"\u016C":"{\\u U}", // LATIN CAPITAL LETTER U WITH BREVE
	"\u016D":"{\\u u}", // LATIN SMALL LETTER U WITH BREVE
	"\u016E":"{\\r U}", // LATIN CAPITAL U WITH A RING ABOVE
	"\u016F":"{\\r u}", // LATIN SMALL U WITH A RING ABOVE
	"\u0170":"{\\H U}", // LATIN CAPITAL LETTER U WITH DOUBLE ACUTE
	"\u0171":"{\\H u}", // LATIN SMALL LETTER U WITH DOUBLE ACUTE
	"\u0172":"{\\k U}", // LATIN CAPITAL LETTER U WITH OGONEK
	"\u0173":"{\\k u}", // LATIN SMALL LETTER U WITH OGONEK
	"\u0174":"{\\^W}", // LATIN CAPITAL LETTER W WITH CIRCUMFLEX
	"\u0175":"{\\^w}", // LATIN SMALL LETTER W WITH CIRCUMFLEX
	"\u0176":"{\\^Y}", // LATIN CAPITAL LETTER Y WITH CIRCUMFLEX
	"\u0177":"{\\^y}", // LATIN SMALL LETTER Y WITH CIRCUMFLEX
	"\u0178":"{\\\"Y}", // LATIN CAPITAL LETTER Y WITH DIAERESIS
	"\u0179":"{\\'Z}", // LATIN CAPITAL LETTER Z WITH ACUTE
	"\u017A":"{\\'z}", // LATIN SMALL LETTER Z WITH ACUTE
	"\u017B":"{\\.Z}", // LATIN CAPITAL LETTER Z WITH DOT ABOVE
	"\u017C":"{\\.z}", // LATIN SMALL LETTER Z WITH DOT ABOVE
	"\u017D":"{\\v Z}", // LATIN CAPITAL LETTER Z WITH CARON
	"\u017E":"{\\v z}", // LATIN SMALL LETTER Z WITH CARON
	"\u01CD":"{\\v A}", // LATIN CAPITAL LETTER A WITH CARON
	"\u01CE":"{\\v a}", // LATIN SMALL LETTER A WITH CARON
	"\u01CF":"{\\v I}", // LATIN CAPITAL LETTER I WITH CARON
	"\u01D0":"{\\v i}", // LATIN SMALL LETTER I WITH CARON
	"\u01D1":"{\\v O}", // LATIN CAPITAL LETTER O WITH CARON
	"\u01D2":"{\\v o}", // LATIN SMALL LETTER O WITH CARON
	"\u01D3":"{\\v U}", // LATIN CAPITAL LETTER U WITH CARON
	"\u01D4":"{\\v u}", // LATIN SMALL LETTER U WITH CARON
	"\u01E6":"{\\v G}", // LATIN CAPITAL LETTER G WITH CARON
	"\u01E7":"{\\v g}", // LATIN SMALL LETTER G WITH CARON
	"\u01E8":"{\\v K}", // LATIN CAPITAL LETTER K WITH CARON
	"\u01E9":"{\\v k}", // LATIN SMALL LETTER K WITH CARON
	"\u01EA":"{\\k O}", // LATIN CAPITAL LETTER O WITH OGONEK
	"\u01EB":"{\\k o}", // LATIN SMALL LETTER O WITH OGONEK
	"\u01F0":"{\\v j}", // LATIN SMALL LETTER J WITH CARON
	"\u01F4":"{\\'G}", // LATIN CAPITAL LETTER G WITH ACUTE
	"\u01F5":"{\\'g}", // LATIN SMALL LETTER G WITH ACUTE
	"\u1E02":"{\\.B}", // LATIN CAPITAL LETTER B WITH DOT ABOVE
	"\u1E03":"{\\.b}", // LATIN SMALL LETTER B WITH DOT ABOVE
	"\u1E04":"{\\d B}", // LATIN CAPITAL LETTER B WITH DOT BELOW
	"\u1E05":"{\\d b}", // LATIN SMALL LETTER B WITH DOT BELOW
	"\u1E06":"{\\b B}", // LATIN CAPITAL LETTER B WITH LINE BELOW
	"\u1E07":"{\\b b}", // LATIN SMALL LETTER B WITH LINE BELOW
	"\u1E0A":"{\\.D}", // LATIN CAPITAL LETTER D WITH DOT ABOVE
	"\u1E0B":"{\\.d}", // LATIN SMALL LETTER D WITH DOT ABOVE
	"\u1E0C":"{\\d D}", // LATIN CAPITAL LETTER D WITH DOT BELOW
	"\u1E0D":"{\\d d}", // LATIN SMALL LETTER D WITH DOT BELOW
	"\u1E0E":"{\\b D}", // LATIN CAPITAL LETTER D WITH LINE BELOW
	"\u1E0F":"{\\b d}", // LATIN SMALL LETTER D WITH LINE BELOW
	"\u1E10":"{\\c D}", // LATIN CAPITAL LETTER D WITH CEDILLA
	"\u1E11":"{\\c d}", // LATIN SMALL LETTER D WITH CEDILLA
	"\u1E1E":"{\\.F}", // LATIN CAPITAL LETTER F WITH DOT ABOVE
	"\u1E1F":"{\\.f}", // LATIN SMALL LETTER F WITH DOT ABOVE
	"\u1E20":"{\\=G}", // LATIN CAPITAL LETTER G WITH MACRON
	"\u1E21":"{\\=g}", // LATIN SMALL LETTER G WITH MACRON
	"\u1E22":"{\\.H}", // LATIN CAPITAL LETTER H WITH DOT ABOVE
	"\u1E23":"{\\.h}", // LATIN SMALL LETTER H WITH DOT ABOVE
	"\u1E24":"{\\d H}", // LATIN CAPITAL LETTER H WITH DOT BELOW
	"\u1E25":"{\\d h}", // LATIN SMALL LETTER H WITH DOT BELOW
	"\u1E26":"{\\\"H}", // LATIN CAPITAL LETTER H WITH DIAERESIS
	"\u1E27":"{\\\"h}", // LATIN SMALL LETTER H WITH DIAERESIS
	"\u1E28":"{\\c H}", // LATIN CAPITAL LETTER H WITH CEDILLA
	"\u1E29":"{\\c h}", // LATIN SMALL LETTER H WITH CEDILLA
	"\u1E30":"{\\'K}", // LATIN CAPITAL LETTER K WITH ACUTE
	"\u1E31":"{\\'k}", // LATIN SMALL LETTER K WITH ACUTE
	"\u1E32":"{\\d K}", // LATIN CAPITAL LETTER K WITH DOT BELOW
	"\u1E33":"{\\d k}", // LATIN SMALL LETTER K WITH DOT BELOW
	"\u1E34":"{\\b K}", // LATIN CAPITAL LETTER K WITH LINE BELOW
	"\u1E35":"{\\b k}", // LATIN SMALL LETTER K WITH LINE BELOW
	"\u1E36":"{\\d L}", // LATIN CAPITAL LETTER L WITH DOT BELOW
	"\u1E37":"{\\d l}", // LATIN SMALL LETTER L WITH DOT BELOW
	"\u1E3A":"{\\b L}", // LATIN CAPITAL LETTER L WITH LINE BELOW
	"\u1E3B":"{\\b l}", // LATIN SMALL LETTER L WITH LINE BELOW
	"\u1E3E":"{\\'M}", // LATIN CAPITAL LETTER M WITH ACUTE
	"\u1E3F":"{\\'m}", // LATIN SMALL LETTER M WITH ACUTE
	"\u1E40":"{\\.M}", // LATIN CAPITAL LETTER M WITH DOT ABOVE
	"\u1E41":"{\\.m}", // LATIN SMALL LETTER M WITH DOT ABOVE
	"\u1E42":"{\\d M}", // LATIN CAPITAL LETTER M WITH DOT BELOW
	"\u1E43":"{\\d m}", // LATIN SMALL LETTER M WITH DOT BELOW
	"\u1E44":"{\\.N}", // LATIN CAPITAL LETTER N WITH DOT ABOVE
	"\u1E45":"{\\.n}", // LATIN SMALL LETTER N WITH DOT ABOVE
	"\u1E46":"{\\d N}", // LATIN CAPITAL LETTER N WITH DOT BELOW
	"\u1E47":"{\\d n}", // LATIN SMALL LETTER N WITH DOT BELOW
	"\u1E48":"{\\b N}", // LATIN CAPITAL LETTER N WITH LINE BELOW
	"\u1E49":"{\\b n}", // LATIN SMALL LETTER N WITH LINE BELOW
	"\u1E54":"{\\'P}", // LATIN CAPITAL LETTER P WITH ACUTE
	"\u1E55":"{\\'p}", // LATIN SMALL LETTER P WITH ACUTE
	"\u1E56":"{\\.P}", // LATIN CAPITAL LETTER P WITH DOT ABOVE
	"\u1E57":"{\\.p}", // LATIN SMALL LETTER P WITH DOT ABOVE
	"\u1E58":"{\\.R}", // LATIN CAPITAL LETTER R WITH DOT ABOVE
	"\u1E59":"{\\.r}", // LATIN SMALL LETTER R WITH DOT ABOVE
	"\u1E5A":"{\\d R}", // LATIN CAPITAL LETTER R WITH DOT BELOW
	"\u1E5B":"{\\d r}", // LATIN SMALL LETTER R WITH DOT BELOW
	"\u1E5E":"{\\b R}", // LATIN CAPITAL LETTER R WITH LINE BELOW
	"\u1E5F":"{\\b r}", // LATIN SMALL LETTER R WITH LINE BELOW
	"\u1E60":"{\\.S}", // LATIN CAPITAL LETTER S WITH DOT ABOVE
	"\u1E61":"{\\.s}", // LATIN SMALL LETTER S WITH DOT ABOVE
	"\u1E62":"{\\d S}", // LATIN CAPITAL LETTER S WITH DOT BELOW
	"\u1E63":"{\\d s}", // LATIN SMALL LETTER S WITH DOT BELOW
	"\u1E6A":"{\\.T}", // LATIN CAPITAL LETTER T WITH DOT ABOVE
	"\u1E6B":"{\\.t}", // LATIN SMALL LETTER T WITH DOT ABOVE
	"\u1E6C":"{\\d T}", // LATIN CAPITAL LETTER T WITH DOT BELOW
	"\u1E6D":"{\\d t}", // LATIN SMALL LETTER T WITH DOT BELOW
	"\u1E6E":"{\\b T}", // LATIN CAPITAL LETTER T WITH LINE BELOW
	"\u1E6F":"{\\b t}", // LATIN SMALL LETTER T WITH LINE BELOW
	"\u1E7C":"{\\~V}", // LATIN CAPITAL LETTER V WITH TILDE
	"\u1E7D":"{\\~v}", // LATIN SMALL LETTER V WITH TILDE
	"\u1E7E":"{\\d V}", // LATIN CAPITAL LETTER V WITH DOT BELOW
	"\u1E7F":"{\\d v}", // LATIN SMALL LETTER V WITH DOT BELOW
	"\u1E80":"{\\`W}", // LATIN CAPITAL LETTER W WITH GRAVE
	"\u1E81":"{\\`w}", // LATIN SMALL LETTER W WITH GRAVE
	"\u1E82":"{\\'W}", // LATIN CAPITAL LETTER W WITH ACUTE
	"\u1E83":"{\\'w}", // LATIN SMALL LETTER W WITH ACUTE
	"\u1E84":"{\\\"W}", // LATIN CAPITAL LETTER W WITH DIAERESIS
	"\u1E85":"{\\\"w}", // LATIN SMALL LETTER W WITH DIAERESIS
	"\u1E86":"{\\.W}", // LATIN CAPITAL LETTER W WITH DOT ABOVE
	"\u1E87":"{\\.w}", // LATIN SMALL LETTER W WITH DOT ABOVE
	"\u1E88":"{\\d W}", // LATIN CAPITAL LETTER W WITH DOT BELOW
	"\u1E89":"{\\d w}", // LATIN SMALL LETTER W WITH DOT BELOW
	"\u1E8A":"{\\.X}", // LATIN CAPITAL LETTER X WITH DOT ABOVE
	"\u1E8B":"{\\.x}", // LATIN SMALL LETTER X WITH DOT ABOVE
	"\u1E8C":"{\\\"X}", // LATIN CAPITAL LETTER X WITH DIAERESIS
	"\u1E8D":"{\\\"x}", // LATIN SMALL LETTER X WITH DIAERESIS
	"\u1E8E":"{\\.Y}", // LATIN CAPITAL LETTER Y WITH DOT ABOVE
	"\u1E8F":"{\\.y}", // LATIN SMALL LETTER Y WITH DOT ABOVE
	"\u1E90":"{\\^Z}", // LATIN CAPITAL LETTER Z WITH CIRCUMFLEX
	"\u1E91":"{\\^z}", // LATIN SMALL LETTER Z WITH CIRCUMFLEX
	"\u1E92":"{\\d Z}", // LATIN CAPITAL LETTER Z WITH DOT BELOW
	"\u1E93":"{\\d z}", // LATIN SMALL LETTER Z WITH DOT BELOW
	"\u1E94":"{\\b Z}", // LATIN CAPITAL LETTER Z WITH LINE BELOW
	"\u1E95":"{\\b z}", // LATIN SMALL LETTER Z WITH LINE BELOW
	"\u1E96":"{\\b h}", // LATIN SMALL LETTER H WITH LINE BELOW
	"\u1E97":"{\\\"t}", // LATIN SMALL LETTER T WITH DIAERESIS
	"\u1E98":"{\\r w}", // LATIN SMALL W WITH A RING ABOVE
	"\u1E99":"{\\r y}", // LATIN SMALL Y WITH A RING ABOVE
	"\u1EA0":"{\\d A}", // LATIN CAPITAL LETTER A WITH DOT BELOW
	"\u1EA1":"{\\d a}", // LATIN SMALL LETTER A WITH DOT BELOW
	"\u1EB8":"{\\d E}", // LATIN CAPITAL LETTER E WITH DOT BELOW
	"\u1EB9":"{\\d e}", // LATIN SMALL LETTER E WITH DOT BELOW
	"\u1EBC":"{\\~E}", // LATIN CAPITAL LETTER E WITH TILDE
	"\u1EBD":"{\\~e}", // LATIN SMALL LETTER E WITH TILDE
	"\u1ECA":"{\\d I}", // LATIN CAPITAL LETTER I WITH DOT BELOW
	"\u1ECB":"{\\d i}", // LATIN SMALL LETTER I WITH DOT BELOW
	"\u1ECC":"{\\d O}", // LATIN CAPITAL LETTER O WITH DOT BELOW
	"\u1ECD":"{\\d o}", // LATIN SMALL LETTER O WITH DOT BELOW
	"\u1EE4":"{\\d U}", // LATIN CAPITAL LETTER U WITH DOT BELOW
	"\u1EE5":"{\\d u}", // LATIN SMALL LETTER U WITH DOT BELOW
	"\u1EF2":"{\\`Y}", // LATIN CAPITAL LETTER Y WITH GRAVE
	"\u1EF3":"{\\`y}", // LATIN SMALL LETTER Y WITH GRAVE
	"\u1EF4":"{\\d Y}", // LATIN CAPITAL LETTER Y WITH DOT BELOW
	"\u1EF5":"{\\d y}", // LATIN SMALL LETTER Y WITH DOT BELOW
	"\u1EF8":"{\\~Y}", // LATIN CAPITAL LETTER Y WITH TILDE
	"\u1EF9":"{\\~y}," // LATIN SMALL LETTER Y WITH TILDE
	// BBT
	'\u00A4': "\\textcurrency{}", // CURRENCY SIGN
	'\u0110': "\\DJ{}", // LATIN CAPITAL LETTER D WITH STROKE
	'\u0111': "\\dj{}", // LATIN SMALL LETTER D WITH STROKE
	'\u0126': "{\\fontencoding{LELA}\\selectfont\\char40}", // LATIN CAPITAL LETTER H WITH STROKE
	'\u0127': "$\\Elzxh{}$", // LATIN SMALL LETTER H WITH STROKE
	'\u013F': "{\\fontencoding{LELA}\\selectfont\\char201}", // LATIN CAPITAL LETTER L WITH MIDDLE DOT
	'\u0140': "{\\fontencoding{LELA}\\selectfont\\char202}", // LATIN SMALL LETTER L WITH MIDDLE DOT
	'\u0166': "{\\fontencoding{LELA}\\selectfont\\char47}", // LATIN CAPITAL LETTER T WITH STROKE
	'\u0167': "{\\fontencoding{LELA}\\selectfont\\char63}", // LATIN SMALL LETTER T WITH STROKE
	'\u0192': "$f$", // LATIN SMALL LETTER F WITH HOOK
	'\u0195': "\\texthvlig{}", // LATIN SMALL LETTER HV
	'\u019E': "\\textnrleg{}", // LATIN SMALL LETTER N WITH LONG RIGHT LEG
	'\u01AA': "$\\eth{}$", // LATIN LETTER REVERSED ESH LOOP
	'\u01B5': "$\\Zbar{}$", // impedance
	'\u01BA': "{\\fontencoding{LELA}\\selectfont\\char195}", // LATIN SMALL LETTER EZH WITH TAIL
	'\u01C2': "\\textdoublepipe{}", // LATIN LETTER ALVEOLAR CLICK
	'\u0237': "$\\jmath{}$", // jmath
	'\u0250': "$\\Elztrna{}$", // LATIN SMALL LETTER TURNED A
	'\u0252': "$\\Elztrnsa{}$", // LATIN SMALL LETTER TURNED ALPHA
	'\u0254': "$\\Elzopeno{}$", // LATIN SMALL LETTER OPEN O
	'\u0256': "$\\Elzrtld{}$", // LATIN SMALL LETTER D WITH TAIL
	'\u0258': "{\\fontencoding{LEIP}\\selectfont\\char61}", // LATIN SMALL LETTER REVERSED E
	'\u0259': "$\\Elzschwa{}$", // LATIN SMALL LETTER SCHWA
	'\u025B': "$\\varepsilon{}$", // LATIN SMALL LETTER OPEN E
	'\u0261': "g", // LATIN SMALL LETTER SCRIPT G
	'\u0263': "$\\Elzpgamma{}$", // LATIN SMALL LETTER GAMMA
	'\u0264': "$\\Elzpbgam{}$", // LATIN SMALL LETTER RAMS HORN
	'\u0265': "$\\Elztrnh{}$", // LATIN SMALL LETTER TURNED H
	'\u026C': "$\\Elzbtdl{}$", // LATIN SMALL LETTER L WITH BELT
	'\u026D': "$\\Elzrtll{}$", // LATIN SMALL LETTER L WITH RETROFLEX HOOK
	'\u026F': "$\\Elztrnm{}$", // LATIN SMALL LETTER TURNED M
	'\u0270': "$\\Elztrnmlr{}$", // LATIN SMALL LETTER TURNED M WITH LONG LEG
	'\u0271': "$\\Elzltlmr{}$", // LATIN SMALL LETTER M WITH HOOK
	'\u0272': "\\Elzltln{}", // LATIN SMALL LETTER N WITH LEFT HOOK
	'\u0273': "$\\Elzrtln{}$", // LATIN SMALL LETTER N WITH RETROFLEX HOOK
	'\u0277': "$\\Elzclomeg{}$", // LATIN SMALL LETTER CLOSED OMEGA
	'\u0278': "\\textphi{}", // LATIN SMALL LETTER PHI
	'\u0279': "$\\Elztrnr{}$", // LATIN SMALL LETTER TURNED R
	'\u027A': "$\\Elztrnrl{}$", // LATIN SMALL LETTER TURNED R WITH LONG LEG
	'\u027B': "$\\Elzrttrnr{}$", // LATIN SMALL LETTER TURNED R WITH HOOK
	'\u027C': "$\\Elzrl{}$", // LATIN SMALL LETTER R WITH LONG LEG
	'\u027D': "$\\Elzrtlr{}$", // LATIN SMALL LETTER R WITH TAIL
	'\u027E': "$\\Elzfhr{}$", // LATIN SMALL LETTER R WITH FISHHOOK
	'\u027F': "{\\fontencoding{LEIP}\\selectfont\\char202}", // LATIN SMALL LETTER REVERSED R WITH FISHHOOK
	'\u0282': "$\\Elzrtls{}$", // LATIN SMALL LETTER S WITH HOOK
	'\u0283': "$\\Elzesh{}$", // LATIN SMALL LETTER ESH
	'\u0287': "$\\Elztrnt{}$", // LATIN SMALL LETTER TURNED T
	'\u0288': "$\\Elzrtlt{}$", // LATIN SMALL LETTER T WITH RETROFLEX HOOK
	'\u028A': "$\\Elzpupsil{}$", // LATIN SMALL LETTER UPSILON
	'\u028B': "$\\Elzpscrv{}$", // LATIN SMALL LETTER V WITH HOOK
	'\u028C': "$\\Elzinvv{}$", // LATIN SMALL LETTER TURNED V
	'\u028D': "$\\Elzinvw{}$", // LATIN SMALL LETTER TURNED W
	'\u028E': "$\\Elztrny{}$", // LATIN SMALL LETTER TURNED Y
	'\u0290': "$\\Elzrtlz{}$", // LATIN SMALL LETTER Z WITH RETROFLEX HOOK
	'\u0292': "$\\Elzyogh{}$", // LATIN SMALL LETTER EZH
	'\u0294': "$\\Elzglst{}$", // LATIN LETTER GLOTTAL STOP
	'\u0295': "$\\Elzreglst{}$", // LATIN LETTER PHARYNGEAL VOICED FRICATIVE
	'\u0296': "$\\Elzinglst{}$", // LATIN LETTER INVERTED GLOTTAL STOP
	'\u029E': "\\textturnk{}", // LATIN SMALL LETTER TURNED K
	'\u02A4': "$\\Elzdyogh{}$", // LATIN SMALL LETTER DEZH DIGRAPH
	'\u02A7': "$\\Elztesh{}$", // LATIN SMALL LETTER TESH DIGRAPH
	'\u02C7': "\\textasciicaron{}", // CARON
	'\u02D1': "$\\Elzhlmrk{}$", // MODIFIER LETTER HALF TRIANGULAR COLON
	'\u02D2': "$\\Elzsbrhr{}$", // MODIFIER LETTER CENTRED RIGHT HALF RING
	'\u02D3': "$\\Elzsblhr{}$", // MODIFIER LETTER CENTRED LEFT HALF RING
	'\u02D4': "$\\Elzrais{}$", // MODIFIER LETTER UP TACK
	'\u02D5': "$\\Elzlow{}$", // MODIFIER LETTER DOWN TACK
	'\u02D8': "\\textasciibreve{}", // BREVE
	'\u02D9': "\\textperiodcentered{}", // DOT ABOVE
	'\u02DB': "\\k{}", // OGONEK
	'\u02E5': "\\tone{55}", // MODIFIER LETTER EXTRA-HIGH TONE BAR
	'\u02E6': "\\tone{44}", // MODIFIER LETTER HIGH TONE BAR
	'\u02E7': "\\tone{33}", // MODIFIER LETTER MID TONE BAR
	'\u02E8': "\\tone{22}", // MODIFIER LETTER LOW TONE BAR
	'\u02E9': "\\tone{11}", // MODIFIER LETTER EXTRA-LOW TONE BAR
	'\u0300': "\\`", // COMBINING GRAVE ACCENT
	'\u0301': "\\'", // COMBINING ACUTE ACCENT
	'\u0302': "\\^", // COMBINING CIRCUMFLEX ACCENT
	'\u0303': "\\~", // COMBINING TILDE
	'\u0304': "\\=", // COMBINING MACRON
	'\u0305': "$\\overline{}$", // overbar embellishment
	'\u0306': "\\u{}", // COMBINING BREVE
	'\u0307': "\\.", // COMBINING DOT ABOVE
	'\u0308': "\\\"", // COMBINING DIAERESIS
	'\u0309': "$\\ovhook{}$", // COMBINING HOOK ABOVE
	'\u030A': "\\r{}", // COMBINING RING ABOVE
	'\u030B': "\\H{}", // COMBINING DOUBLE ACUTE ACCENT
	'\u030C': "\\v{}", // COMBINING CARON
	'\u030F': "\\cyrchar\\C{}", // COMBINING DOUBLE GRAVE ACCENT
	'\u0310': "$\\candra{}$", // candrabindu (non-spacing)
	'\u0311': "{\\fontencoding{LECO}\\selectfont\\char177}", // COMBINING INVERTED BREVE
	'\u0312': "$\\oturnedcomma{}$", // COMBINING TURNED COMMA ABOVE
	'\u0315': "$\\ocommatopright{}$", // COMBINING COMMA ABOVE RIGHT
	'\u0318': "{\\fontencoding{LECO}\\selectfont\\char184}", // COMBINING LEFT TACK BELOW
	'\u0319': "{\\fontencoding{LECO}\\selectfont\\char185}", // COMBINING RIGHT TACK BELOW
	'\u031A': "$\\droang{}$", // left angle above (non-spacing)
	'\u0321': "$\\Elzpalh{}$", // COMBINING PALATALIZED HOOK BELOW
	'\u0322': "\\Elzrh{}", // COMBINING RETROFLEX HOOK BELOW
	'\u0327': "\\c{}", // COMBINING CEDILLA
	'\u0328': "\\k{}", // COMBINING OGONEK
	'\u032A': "$\\Elzsbbrg{}$", // COMBINING BRIDGE BELOW
	'\u032B': "{\\fontencoding{LECO}\\selectfont\\char203}", // COMBINING INVERTED DOUBLE ARCH BELOW
	'\u032F': "{\\fontencoding{LECO}\\selectfont\\char207}", // COMBINING INVERTED BREVE BELOW
	'\u0330': "$\\utilde{}$", // under tilde accent (multiple characters and non-spacing)
	'\u0331': "$\\underbar{}$", // COMBINING MACRON BELOW
	'\u0332': "$\\underline{}$", // COMBINING LOW LINE
	'\u0335': "\\Elzxl{}", // COMBINING SHORT STROKE OVERLAY
	'\u0336': "\\Elzbar{}", // COMBINING LONG STROKE OVERLAY
	'\u0337': "{\\fontencoding{LECO}\\selectfont\\char215}", // COMBINING SHORT SOLIDUS OVERLAY
	'\u0338': "{\\fontencoding{LECO}\\selectfont\\char216}", // COMBINING LONG SOLIDUS OVERLAY
	'\u033A': "{\\fontencoding{LECO}\\selectfont\\char218}", // COMBINING INVERTED BRIDGE BELOW
	'\u033B': "{\\fontencoding{LECO}\\selectfont\\char219}", // COMBINING SQUARE BELOW
	'\u033C': "{\\fontencoding{LECO}\\selectfont\\char220}", // COMBINING SEAGULL BELOW
	'\u033D': "{\\fontencoding{LECO}\\selectfont\\char221}", // COMBINING X ABOVE
	'\u0361': "{\\fontencoding{LECO}\\selectfont\\char225}", // COMBINING DOUBLE INVERTED BREVE
	'\u0386': "{\\'A}", // GREEK CAPITAL LETTER ALPHA WITH TONOS
	'\u0388': "{\\'E}", // GREEK CAPITAL LETTER EPSILON WITH TONOS
	'\u0389': "{\\'H}", // GREEK CAPITAL LETTER ETA WITH TONOS
	'\u038A': "\\'{}{I}", // GREEK CAPITAL LETTER IOTA WITH TONOS
	'\u038C': "{\\'{}O}", // GREEK CAPITAL LETTER OMICRON WITH TONOS
	'\u038E': "$\\mathrm{'Y}$", // GREEK CAPITAL LETTER UPSILON WITH TONOS
	'\u038F': "$\\mathrm{'\\Omega}$", // GREEK CAPITAL LETTER OMEGA WITH TONOS
	'\u0390': "$\\acute{\\ddot{\\iota}}$", // GREEK SMALL LETTER IOTA WITH DIALYTIKA AND TONOS
	'\u0391': "$\\Alpha{}$", // GREEK CAPITAL LETTER ALPHA
	'\u0392': "$\\Beta{}$", // GREEK CAPITAL LETTER BETA
	'\u0395': "$\\Epsilon{}$", // GREEK CAPITAL LETTER EPSILON
	'\u0396': "$\\Zeta{}$", // GREEK CAPITAL LETTER ZETA
	'\u0397': "$\\Eta{}$", // GREEK CAPITAL LETTER ETA
	'\u0399': "$\\Iota{}$", // GREEK CAPITAL LETTER IOTA
	'\u039A': "$\\Kappa{}$", // GREEK CAPITAL LETTER KAPPA
	'\u039C': "$M$", // GREEK CAPITAL LETTER MU
	'\u039D': "$N$", // GREEK CAPITAL LETTER NU
	'\u039F': "$O$", // GREEK CAPITAL LETTER OMICRON
	'\u03A1': "$\\Rho{}$", // GREEK CAPITAL LETTER RHO
	'\u03A4': "$\\Tau{}$", // GREEK CAPITAL LETTER TAU
	'\u03A5': "$\\Upsilon{}$", // GREEK CAPITAL LETTER UPSILON
	'\u03A7': "$\\Chi{}$", // GREEK CAPITAL LETTER CHI
	'\u03AA': "$\\mathrm{\\ddot{I}}$", // GREEK CAPITAL LETTER IOTA WITH DIALYTIKA
	'\u03AB': "$\\mathrm{\\ddot{Y}}$", // GREEK CAPITAL LETTER UPSILON WITH DIALYTIKA
	'\u03AC': "{\\'$\\alpha$}", // GREEK SMALL LETTER ALPHA WITH TONOS
	'\u03AD': "$\\acute{\\epsilon}$", // GREEK SMALL LETTER EPSILON WITH TONOS
	'\u03AE': "$\\acute{\\eta}$", // GREEK SMALL LETTER ETA WITH TONOS
	'\u03AF': "$\\acute{\\iota}$", // GREEK SMALL LETTER IOTA WITH TONOS
	'\u03B0': "$\\acute{\\ddot{\\upsilon}}$", // GREEK SMALL LETTER UPSILON WITH DIALYTIKA AND TONOS
	'\u03BF': "$o$", // GREEK SMALL LETTER OMICRON
	'\u03CA': "$\\ddot{\\iota}$", // GREEK SMALL LETTER IOTA WITH DIALYTIKA
	'\u03CB': "$\\ddot{\\upsilon}$", // GREEK SMALL LETTER UPSILON WITH DIALYTIKA
	'\u03CC': "{\\'o}", // GREEK SMALL LETTER OMICRON WITH TONOS
	'\u03CD': "$\\acute{\\upsilon}$", // GREEK SMALL LETTER UPSILON WITH TONOS
	'\u03CE': "$\\acute{\\omega}$", // GREEK SMALL LETTER OMEGA WITH TONOS
	'\u03D0': "\\Pisymbol{ppi022}{87}", // GREEK BETA SYMBOL
	'\u03D8': "$\\Qoppa{}$", // = \Koppa (wrisym), t \Qoppa (LGR), GREEK LETTER ARCHAIC KOPPA
	'\u03D9': "$\\qoppa{}$", // = \koppa (wrisym), t \qoppa (LGR), GREEK SMALL LETTER ARCHAIC KOPPA
	'\u03DA': "$\\Stigma{}$", // GREEK LETTER STIGMA
	'\u03DB': "$\\stigma{}$", // GREEK SMALL LETTER STIGMA
	'\u03DC': "$\\Digamma{}$", // GREEK LETTER DIGAMMA
	'\u03DD': "$\\digamma{}$", // GREEK SMALL LETTER DIGAMMA
	'\u03DE': "$\\Koppa{}$", // GREEK LETTER KOPPA
	'\u03DF': "$\\koppa{}$", // GREEK SMALL LETTER KOPPA
	'\u03E0': "$\\Sampi{}$", // GREEK LETTER SAMPI
	'\u03E1': "$\\sampi{}$", // # \sampi (wrisym), GREEK SMALL LETTER SAMPI
	'\u03F0': "$\\varkappa{}$", // GREEK KAPPA SYMBOL
	'\u03F4': "\\textTheta{}", // GREEK CAPITAL THETA SYMBOL
	'\u03F6': "$\\backepsilon{}$", // GREEK REVERSED LUNATE EPSILON SYMBOL
	'\u0401': "\\cyrchar\\CYRYO{}", // CYRILLIC CAPITAL LETTER IO
	'\u0402': "\\cyrchar\\CYRDJE{}", // CYRILLIC CAPITAL LETTER DJE
	'\u0403': "\\cyrchar{\\'\\CYRG}", // CYRILLIC CAPITAL LETTER GJE
	'\u0404': "\\cyrchar\\CYRIE{}", // CYRILLIC CAPITAL LETTER UKRAINIAN IE
	'\u0405': "\\cyrchar\\CYRDZE{}", // CYRILLIC CAPITAL LETTER DZE
	'\u0406': "\\cyrchar\\CYRII{}", // CYRILLIC CAPITAL LETTER BYELORUSSIAN-UKRAINIAN I
	'\u0407': "\\cyrchar\\CYRYI{}", // CYRILLIC CAPITAL LETTER YI
	'\u0408': "\\cyrchar\\CYRJE{}", // CYRILLIC CAPITAL LETTER JE
	'\u0409': "\\cyrchar\\CYRLJE{}", // CYRILLIC CAPITAL LETTER LJE
	'\u040A': "\\cyrchar\\CYRNJE{}", // CYRILLIC CAPITAL LETTER NJE
	'\u040B': "\\cyrchar\\CYRTSHE{}", // CYRILLIC CAPITAL LETTER TSHE
	'\u040C': "\\cyrchar{\\'\\CYRK}", // CYRILLIC CAPITAL LETTER KJE
	'\u040E': "\\cyrchar\\CYRUSHRT{}", // CYRILLIC CAPITAL LETTER SHORT U
	'\u040F': "\\cyrchar\\CYRDZHE{}", // CYRILLIC CAPITAL LETTER DZHE
	'\u0410': "\\cyrchar\\CYRA{}", // CYRILLIC CAPITAL LETTER A
	'\u0411': "\\cyrchar\\CYRB{}", // CYRILLIC CAPITAL LETTER BE
	'\u0412': "\\cyrchar\\CYRV{}", // CYRILLIC CAPITAL LETTER VE
	'\u0413': "\\cyrchar\\CYRG{}", // CYRILLIC CAPITAL LETTER GHE
	'\u0414': "\\cyrchar\\CYRD{}", // CYRILLIC CAPITAL LETTER DE
	'\u0415': "\\cyrchar\\CYRE{}", // CYRILLIC CAPITAL LETTER IE
	'\u0416': "\\cyrchar\\CYRZH{}", // CYRILLIC CAPITAL LETTER ZHE
	'\u0417': "\\cyrchar\\CYRZ{}", // CYRILLIC CAPITAL LETTER ZE
	'\u0418': "\\cyrchar\\CYRI{}", // CYRILLIC CAPITAL LETTER I
	'\u0419': "\\cyrchar\\CYRISHRT{}", // CYRILLIC CAPITAL LETTER SHORT I
	'\u041A': "\\cyrchar\\CYRK{}", // CYRILLIC CAPITAL LETTER KA
	'\u041B': "\\cyrchar\\CYRL{}", // CYRILLIC CAPITAL LETTER EL
	'\u041C': "\\cyrchar\\CYRM{}", // CYRILLIC CAPITAL LETTER EM
	'\u041D': "\\cyrchar\\CYRN{}", // CYRILLIC CAPITAL LETTER EN
	'\u041E': "\\cyrchar\\CYRO{}", // CYRILLIC CAPITAL LETTER O
	'\u041F': "\\cyrchar\\CYRP{}", // CYRILLIC CAPITAL LETTER PE
	'\u0420': "\\cyrchar\\CYRR{}", // CYRILLIC CAPITAL LETTER ER
	'\u0421': "\\cyrchar\\CYRS{}", // CYRILLIC CAPITAL LETTER ES
	'\u0422': "\\cyrchar\\CYRT{}", // CYRILLIC CAPITAL LETTER TE
	'\u0423': "\\cyrchar\\CYRU{}", // CYRILLIC CAPITAL LETTER U
	'\u0424': "\\cyrchar\\CYRF{}", // CYRILLIC CAPITAL LETTER EF
	'\u0425': "\\cyrchar\\CYRH{}", // CYRILLIC CAPITAL LETTER HA
	'\u0426': "\\cyrchar\\CYRC{}", // CYRILLIC CAPITAL LETTER TSE
	'\u0427': "\\cyrchar\\CYRCH{}", // CYRILLIC CAPITAL LETTER CHE
	'\u0428': "\\cyrchar\\CYRSH{}", // CYRILLIC CAPITAL LETTER SHA
	'\u0429': "\\cyrchar\\CYRSHCH{}", // CYRILLIC CAPITAL LETTER SHCHA
	'\u042A': "\\cyrchar\\CYRHRDSN{}", // CYRILLIC CAPITAL LETTER HARD SIGN
	'\u042B': "\\cyrchar\\CYRERY{}", // CYRILLIC CAPITAL LETTER YERU
	'\u042C': "\\cyrchar\\CYRSFTSN{}", // CYRILLIC CAPITAL LETTER SOFT SIGN
	'\u042D': "\\cyrchar\\CYREREV{}", // CYRILLIC CAPITAL LETTER E
	'\u042E': "\\cyrchar\\CYRYU{}", // CYRILLIC CAPITAL LETTER YU
	'\u042F': "\\cyrchar\\CYRYA{}", // CYRILLIC CAPITAL LETTER YA
	'\u0430': "\\cyrchar\\cyra{}", // CYRILLIC SMALL LETTER A
	'\u0431': "\\cyrchar\\cyrb{}", // CYRILLIC SMALL LETTER BE
	'\u0432': "\\cyrchar\\cyrv{}", // CYRILLIC SMALL LETTER VE
	'\u0433': "\\cyrchar\\cyrg{}", // CYRILLIC SMALL LETTER GHE
	'\u0434': "\\cyrchar\\cyrd{}", // CYRILLIC SMALL LETTER DE
	'\u0435': "\\cyrchar\\cyre{}", // CYRILLIC SMALL LETTER IE
	'\u0436': "\\cyrchar\\cyrzh{}", // CYRILLIC SMALL LETTER ZHE
	'\u0437': "\\cyrchar\\cyrz{}", // CYRILLIC SMALL LETTER ZE
	'\u0438': "\\cyrchar\\cyri{}", // CYRILLIC SMALL LETTER I
	'\u0439': "\\cyrchar\\cyrishrt{}", // CYRILLIC SMALL LETTER SHORT I
	'\u043A': "\\cyrchar\\cyrk{}", // CYRILLIC SMALL LETTER KA
	'\u043B': "\\cyrchar\\cyrl{}", // CYRILLIC SMALL LETTER EL
	'\u043C': "\\cyrchar\\cyrm{}", // CYRILLIC SMALL LETTER EM
	'\u043D': "\\cyrchar\\cyrn{}", // CYRILLIC SMALL LETTER EN
	'\u043E': "\\cyrchar\\cyro{}", // CYRILLIC SMALL LETTER O
	'\u043F': "\\cyrchar\\cyrp{}", // CYRILLIC SMALL LETTER PE
	'\u0440': "\\cyrchar\\cyrr{}", // CYRILLIC SMALL LETTER ER
	'\u0441': "\\cyrchar\\cyrs{}", // CYRILLIC SMALL LETTER ES
	'\u0442': "\\cyrchar\\cyrt{}", // CYRILLIC SMALL LETTER TE
	'\u0443': "\\cyrchar\\cyru{}", // CYRILLIC SMALL LETTER U
	'\u0444': "\\cyrchar\\cyrf{}", // CYRILLIC SMALL LETTER EF
	'\u0445': "\\cyrchar\\cyrh{}", // CYRILLIC SMALL LETTER HA
	'\u0446': "\\cyrchar\\cyrc{}", // CYRILLIC SMALL LETTER TSE
	'\u0447': "\\cyrchar\\cyrch{}", // CYRILLIC SMALL LETTER CHE
	'\u0448': "\\cyrchar\\cyrsh{}", // CYRILLIC SMALL LETTER SHA
	'\u0449': "\\cyrchar\\cyrshch{}", // CYRILLIC SMALL LETTER SHCHA
	'\u044A': "\\cyrchar\\cyrhrdsn{}", // CYRILLIC SMALL LETTER HARD SIGN
	'\u044B': "\\cyrchar\\cyrery{}", // CYRILLIC SMALL LETTER YERU
	'\u044C': "\\cyrchar\\cyrsftsn{}", // CYRILLIC SMALL LETTER SOFT SIGN
	'\u044D': "\\cyrchar\\cyrerev{}", // CYRILLIC SMALL LETTER E
	'\u044E': "\\cyrchar\\cyryu{}", // CYRILLIC SMALL LETTER YU
	'\u044F': "\\cyrchar\\cyrya{}", // CYRILLIC SMALL LETTER YA
	'\u0451': "\\cyrchar\\cyryo{}", // CYRILLIC SMALL LETTER IO
	'\u0452': "\\cyrchar\\cyrdje{}", // CYRILLIC SMALL LETTER DJE
	'\u0453': "\\cyrchar{\\'\\cyrg}", // CYRILLIC SMALL LETTER GJE
	'\u0454': "\\cyrchar\\cyrie{}", // CYRILLIC SMALL LETTER UKRAINIAN IE
	'\u0455': "\\cyrchar\\cyrdze{}", // CYRILLIC SMALL LETTER DZE
	'\u0456': "\\cyrchar\\cyrii{}", // CYRILLIC SMALL LETTER BYELORUSSIAN-UKRAINIAN I
	'\u0457': "\\cyrchar\\cyryi{}", // CYRILLIC SMALL LETTER YI
	'\u0458': "\\cyrchar\\cyrje{}", // CYRILLIC SMALL LETTER JE
	'\u0459': "\\cyrchar\\cyrlje{}", // CYRILLIC SMALL LETTER LJE
	'\u045A': "\\cyrchar\\cyrnje{}", // CYRILLIC SMALL LETTER NJE
	'\u045B': "\\cyrchar\\cyrtshe{}", // CYRILLIC SMALL LETTER TSHE
	'\u045C': "\\cyrchar{\\'\\cyrk}", // CYRILLIC SMALL LETTER KJE
	'\u045E': "\\cyrchar\\cyrushrt{}", // CYRILLIC SMALL LETTER SHORT U
	'\u045F': "\\cyrchar\\cyrdzhe{}", // CYRILLIC SMALL LETTER DZHE
	'\u0460': "\\cyrchar\\CYROMEGA{}", // CYRILLIC CAPITAL LETTER OMEGA
	'\u0461': "\\cyrchar\\cyromega{}", // CYRILLIC SMALL LETTER OMEGA
	'\u0462': "\\cyrchar\\CYRYAT{}", // CYRILLIC CAPITAL LETTER YAT
	'\u0464': "\\cyrchar\\CYRIOTE{}", // CYRILLIC CAPITAL LETTER IOTIFIED E
	'\u0465': "\\cyrchar\\cyriote{}", // CYRILLIC SMALL LETTER IOTIFIED E
	'\u0466': "\\cyrchar\\CYRLYUS{}", // CYRILLIC CAPITAL LETTER LITTLE YUS
	'\u0467': "\\cyrchar\\cyrlyus{}", // CYRILLIC SMALL LETTER LITTLE YUS
	'\u0468': "\\cyrchar\\CYRIOTLYUS{}", // CYRILLIC CAPITAL LETTER IOTIFIED LITTLE YUS
	'\u0469': "\\cyrchar\\cyriotlyus{}", // CYRILLIC SMALL LETTER IOTIFIED LITTLE YUS
	'\u046A': "\\cyrchar\\CYRBYUS{}", // CYRILLIC CAPITAL LETTER BIG YUS
	'\u046C': "\\cyrchar\\CYRIOTBYUS{}", // CYRILLIC CAPITAL LETTER IOTIFIED BIG YUS
	'\u046D': "\\cyrchar\\cyriotbyus{}", // CYRILLIC SMALL LETTER IOTIFIED BIG YUS
	'\u046E': "\\cyrchar\\CYRKSI{}", // CYRILLIC CAPITAL LETTER KSI
	'\u046F': "\\cyrchar\\cyrksi{}", // CYRILLIC SMALL LETTER KSI
	'\u0470': "\\cyrchar\\CYRPSI{}", // CYRILLIC CAPITAL LETTER PSI
	'\u0471': "\\cyrchar\\cyrpsi{}", // CYRILLIC SMALL LETTER PSI
	'\u0472': "\\cyrchar\\CYRFITA{}", // CYRILLIC CAPITAL LETTER FITA
	'\u0474': "\\cyrchar\\CYRIZH{}", // CYRILLIC CAPITAL LETTER IZHITSA
	'\u0478': "\\cyrchar\\CYRUK{}", // CYRILLIC CAPITAL LETTER UK
	'\u0479': "\\cyrchar\\cyruk{}", // CYRILLIC SMALL LETTER UK
	'\u047A': "\\cyrchar\\CYROMEGARND{}", // CYRILLIC CAPITAL LETTER ROUND OMEGA
	'\u047B': "\\cyrchar\\cyromegarnd{}", // CYRILLIC SMALL LETTER ROUND OMEGA
	'\u047C': "\\cyrchar\\CYROMEGATITLO{}", // CYRILLIC CAPITAL LETTER OMEGA WITH TITLO
	'\u047D': "\\cyrchar\\cyromegatitlo{}", // CYRILLIC SMALL LETTER OMEGA WITH TITLO
	'\u047E': "\\cyrchar\\CYROT{}", // CYRILLIC CAPITAL LETTER OT
	'\u047F': "\\cyrchar\\cyrot{}", // CYRILLIC SMALL LETTER OT
	'\u0480': "\\cyrchar\\CYRKOPPA{}", // CYRILLIC CAPITAL LETTER KOPPA
	'\u0481': "\\cyrchar\\cyrkoppa{}", // CYRILLIC SMALL LETTER KOPPA
	'\u0482': "\\cyrchar\\cyrthousands{}", // CYRILLIC THOUSANDS SIGN
	'\u0488': "\\cyrchar\\cyrhundredthousands{}", // COMBINING CYRILLIC HUNDRED THOUSANDS SIGN
	'\u0489': "\\cyrchar\\cyrmillions{}", // COMBINING CYRILLIC MILLIONS SIGN
	'\u048C': "\\cyrchar\\CYRSEMISFTSN{}", // CYRILLIC CAPITAL LETTER SEMISOFT SIGN
	'\u048D': "\\cyrchar\\cyrsemisftsn{}", // CYRILLIC SMALL LETTER SEMISOFT SIGN
	'\u048E': "\\cyrchar\\CYRRTICK{}", // CYRILLIC CAPITAL LETTER ER WITH TICK
	'\u048F': "\\cyrchar\\cyrrtick{}", // CYRILLIC SMALL LETTER ER WITH TICK
	'\u0490': "\\cyrchar\\CYRGUP{}", // CYRILLIC CAPITAL LETTER GHE WITH UPTURN
	'\u0491': "\\cyrchar\\cyrgup{}", // CYRILLIC SMALL LETTER GHE WITH UPTURN
	'\u0492': "\\cyrchar\\CYRGHCRS{}", // CYRILLIC CAPITAL LETTER GHE WITH STROKE
	'\u0493': "\\cyrchar\\cyrghcrs{}", // CYRILLIC SMALL LETTER GHE WITH STROKE
	'\u0494': "\\cyrchar\\CYRGHK{}", // CYRILLIC CAPITAL LETTER GHE WITH MIDDLE HOOK
	'\u0495': "\\cyrchar\\cyrghk{}", // CYRILLIC SMALL LETTER GHE WITH MIDDLE HOOK
	'\u0496': "\\cyrchar\\CYRZHDSC{}", // CYRILLIC CAPITAL LETTER ZHE WITH DESCENDER
	'\u0497': "\\cyrchar\\cyrzhdsc{}", // CYRILLIC SMALL LETTER ZHE WITH DESCENDER
	'\u0498': "\\cyrchar\\CYRZDSC{}", // CYRILLIC CAPITAL LETTER ZE WITH DESCENDER
	'\u0499': "\\cyrchar\\cyrzdsc{}", // CYRILLIC SMALL LETTER ZE WITH DESCENDER
	'\u049A': "\\cyrchar\\CYRKDSC{}", // CYRILLIC CAPITAL LETTER KA WITH DESCENDER
	'\u049B': "\\cyrchar\\cyrkdsc{}", // CYRILLIC SMALL LETTER KA WITH DESCENDER
	'\u049C': "\\cyrchar\\CYRKVCRS{}", // CYRILLIC CAPITAL LETTER KA WITH VERTICAL STROKE
	'\u049D': "\\cyrchar\\cyrkvcrs{}", // CYRILLIC SMALL LETTER KA WITH VERTICAL STROKE
	'\u049E': "\\cyrchar\\CYRKHCRS{}", // CYRILLIC CAPITAL LETTER KA WITH STROKE
	'\u049F': "\\cyrchar\\cyrkhcrs{}", // CYRILLIC SMALL LETTER KA WITH STROKE
	'\u04A0': "\\cyrchar\\CYRKBEAK{}", // CYRILLIC CAPITAL LETTER BASHKIR KA
	'\u04A1': "\\cyrchar\\cyrkbeak{}", // CYRILLIC SMALL LETTER BASHKIR KA
	'\u04A2': "\\cyrchar\\CYRNDSC{}", // CYRILLIC CAPITAL LETTER EN WITH DESCENDER
	'\u04A3': "\\cyrchar\\cyrndsc{}", // CYRILLIC SMALL LETTER EN WITH DESCENDER
	'\u04A4': "\\cyrchar\\CYRNG{}", // CYRILLIC CAPITAL LIGATURE EN GHE
	'\u04A5': "\\cyrchar\\cyrng{}", // CYRILLIC SMALL LIGATURE EN GHE
	'\u04A6': "\\cyrchar\\CYRPHK{}", // CYRILLIC CAPITAL LETTER PE WITH MIDDLE HOOK
	'\u04A7': "\\cyrchar\\cyrphk{}", // CYRILLIC SMALL LETTER PE WITH MIDDLE HOOK
	'\u04A8': "\\cyrchar\\CYRABHHA{}", // CYRILLIC CAPITAL LETTER ABKHASIAN HA
	'\u04A9': "\\cyrchar\\cyrabhha{}", // CYRILLIC SMALL LETTER ABKHASIAN HA
	'\u04AA': "\\cyrchar\\CYRSDSC{}", // CYRILLIC CAPITAL LETTER ES WITH DESCENDER
	'\u04AB': "\\cyrchar\\cyrsdsc{}", // CYRILLIC SMALL LETTER ES WITH DESCENDER
	'\u04AC': "\\cyrchar\\CYRTDSC{}", // CYRILLIC CAPITAL LETTER TE WITH DESCENDER
	'\u04AD': "\\cyrchar\\cyrtdsc{}", // CYRILLIC SMALL LETTER TE WITH DESCENDER
	'\u04AE': "\\cyrchar\\CYRY{}", // CYRILLIC CAPITAL LETTER STRAIGHT U
	'\u04AF': "\\cyrchar\\cyry{}", // CYRILLIC SMALL LETTER STRAIGHT U
	'\u04B0': "\\cyrchar\\CYRYHCRS{}", // CYRILLIC CAPITAL LETTER STRAIGHT U WITH STROKE
	'\u04B1': "\\cyrchar\\cyryhcrs{}", // CYRILLIC SMALL LETTER STRAIGHT U WITH STROKE
	'\u04B2': "\\cyrchar\\CYRHDSC{}", // CYRILLIC CAPITAL LETTER HA WITH DESCENDER
	'\u04B3': "\\cyrchar\\cyrhdsc{}", // CYRILLIC SMALL LETTER HA WITH DESCENDER
	'\u04B4': "\\cyrchar\\CYRTETSE{}", // CYRILLIC CAPITAL LIGATURE TE TSE
	'\u04B5': "\\cyrchar\\cyrtetse{}", // CYRILLIC SMALL LIGATURE TE TSE
	'\u04B6': "\\cyrchar\\CYRCHRDSC{}", // CYRILLIC CAPITAL LETTER CHE WITH DESCENDER
	'\u04B7': "\\cyrchar\\cyrchrdsc{}", // CYRILLIC SMALL LETTER CHE WITH DESCENDER
	'\u04B8': "\\cyrchar\\CYRCHVCRS{}", // CYRILLIC CAPITAL LETTER CHE WITH VERTICAL STROKE
	'\u04B9': "\\cyrchar\\cyrchvcrs{}", // CYRILLIC SMALL LETTER CHE WITH VERTICAL STROKE
	'\u04BA': "\\cyrchar\\CYRSHHA{}", // CYRILLIC CAPITAL LETTER SHHA
	'\u04BB': "\\cyrchar\\cyrshha{}", // CYRILLIC SMALL LETTER SHHA
	'\u04BC': "\\cyrchar\\CYRABHCH{}", // CYRILLIC CAPITAL LETTER ABKHASIAN CHE
	'\u04BD': "\\cyrchar\\cyrabhch{}", // CYRILLIC SMALL LETTER ABKHASIAN CHE
	'\u04BE': "\\cyrchar\\CYRABHCHDSC{}", // CYRILLIC CAPITAL LETTER ABKHASIAN CHE WITH DESCENDER
	'\u04BF': "\\cyrchar\\cyrabhchdsc{}", // CYRILLIC SMALL LETTER ABKHASIAN CHE WITH DESCENDER
	'\u04C0': "\\cyrchar\\CYRpalochka{}", // CYRILLIC LETTER PALOCHKA
	'\u04C3': "\\cyrchar\\CYRKHK{}", // CYRILLIC CAPITAL LETTER KA WITH HOOK
	'\u04C4': "\\cyrchar\\cyrkhk{}", // CYRILLIC SMALL LETTER KA WITH HOOK
	'\u04C7': "\\cyrchar\\CYRNHK{}", // CYRILLIC CAPITAL LETTER EN WITH HOOK
	'\u04C8': "\\cyrchar\\cyrnhk{}", // CYRILLIC SMALL LETTER EN WITH HOOK
	'\u04CB': "\\cyrchar\\CYRCHLDSC{}", // CYRILLIC CAPITAL LETTER KHAKASSIAN CHE
	'\u04CC': "\\cyrchar\\cyrchldsc{}", // CYRILLIC SMALL LETTER KHAKASSIAN CHE
	'\u04D4': "\\cyrchar\\CYRAE{}", // CYRILLIC CAPITAL LIGATURE A IE
	'\u04D5': "\\cyrchar\\cyrae{}", // CYRILLIC SMALL LIGATURE A IE
	'\u04D8': "\\cyrchar\\CYRSCHWA{}", // CYRILLIC CAPITAL LETTER SCHWA
	'\u04D9': "\\cyrchar\\cyrschwa{}", // CYRILLIC SMALL LETTER SCHWA
	'\u04E0': "\\cyrchar\\CYRABHDZE{}", // CYRILLIC CAPITAL LETTER ABKHASIAN DZE
	'\u04E1': "\\cyrchar\\cyrabhdze{}", // CYRILLIC SMALL LETTER ABKHASIAN DZE
	'\u04E8': "\\cyrchar\\CYROTLD{}", // CYRILLIC CAPITAL LETTER BARRED O
	'\u04E9': "\\cyrchar\\cyrotld{}", // CYRILLIC SMALL LETTER BARRED O
	'\u200A': "$\\mkern1mu{}$", // HAIR SPACE
	'\u200B': "\\hspace{0pt}",
	'\u2031': "\\textpertenthousand{}", // PER TEN THOUSAND SIGN
	'\u2038': "$\\caretinsert{}$", // CARET (insertion mark)
	'\u2040': "$\\cat{}$", // CHARACTER TIE, z notation sequence concatenation
	'\u2047': "$\\Question{}$", // # ??, DOUBLE QUESTION MARK
	'\u2050': "$\\closure{}$", // CLOSE UP (editing mark)
	'\u2057': "$''''$", // QUADRUPLE PRIME
	'\u205F': "\\:",
	'\u2060': "\\nolinebreak{}", // WORD JOINER
	'\u20A7': "\\ensuremath{\\Elzpes}", // PESETA SIGN
	'\u20D0': "$\\lvec{}$", // COMBINING LEFT HARPOON ABOVE
	'\u20D1': "$\\vec{}$", // COMBINING RIGHT HARPOON ABOVE
	'\u20D2': "$\\vertoverlay{}$", // COMBINING LONG VERTICAL LINE OVERLAY
	'\u20D6': "$\\LVec{}$", // # \overleftarrow, COMBINING LEFT ARROW ABOVE
	'\u20D7': "$\\vec{}$", // = \Vec (wrisym), # \overrightarrow, COMBINING RIGHT ARROW ABOVE
	'\u20DB': "$\\dddot{}$", // COMBINING THREE DOTS ABOVE
	'\u20DC': "$\\ddddot{}$", // COMBINING FOUR DOTS ABOVE
	'\u20DD': "$\\enclosecircle{}$", // COMBINING ENCLOSING CIRCLE
	'\u20DE': "$\\enclosesquare{}$", // COMBINING ENCLOSING SQUARE
	'\u20DF': "$\\enclosediamond{}$", // COMBINING ENCLOSING DIAMOND
	'\u20E1': "$\\overleftrightarrow{}$", // COMBINING LEFT RIGHT ARROW ABOVE
	'\u20E4': "$\\enclosetriangle{}$", // COMBINING ENCLOSING UPWARD POINTING TRIANGLE
	'\u20E7': "$\\annuity{}$", // COMBINING ANNUITY SYMBOL
	'\u20E8': "$\\threeunderdot{}$", // COMBINING TRIPLE UNDERDOT
	'\u20E9': "$\\widebridgeabove{}$", // COMBINING WIDE BRIDGE ABOVE
	'\u20EC': "$\\underrightharpoondown{}$", // COMBINING RIGHTWARDS HARPOON WITH BARB DOWNWARDS
	'\u20ED': "$\\underleftharpoondown{}$", // COMBINING LEFTWARDS HARPOON WITH BARB DOWNWARDS
	'\u20EE': "$\\underleftarrow{}$", // COMBINING LEFT ARROW BELOW
	'\u20EF': "$\\underrightarrow{}$", // COMBINING RIGHT ARROW BELOW
	'\u20F0': "$\\asteraccent{}$", // COMBINING ASTERISK ABOVE
	'\u2102': "$\\mathbb{C}$", // DOUBLE-STRUCK CAPITAL C
	'\u2107': "$\\Euler{}$", // EULER CONSTANT
	'\u210A': "\\mathscr{g}", // SCRIPT SMALL G
	'\u210B': "$\\mathscr{H}$", // SCRIPT CAPITAL H
	'\u210C': "$\\mathfrak{H}$", // BLACK-LETTER CAPITAL H
	'\u210D': "$\\mathbb{H}$", // DOUBLE-STRUCK CAPITAL H
	'\u210E': "$\\Planckconst{}$", // # h, Planck constant
	'\u210F': "$\\hslash{}$", // PLANCK CONSTANT OVER TWO PI
	'\u2110': "$\\mathscr{I}$", // SCRIPT CAPITAL I
	'\u2111': "$\\mathfrak{I}$", // BLACK-LETTER CAPITAL I
	'\u2112': "$\\mathscr{L}$", // SCRIPT CAPITAL L
	'\u2115': "$\\mathbb{N}$", // DOUBLE-STRUCK CAPITAL N
	'\u2118': "$\\wp{}$", // SCRIPT CAPITAL P
	'\u2119': "$\\mathbb{P}$", // DOUBLE-STRUCK CAPITAL P
	'\u211A': "$\\mathbb{Q}$", // DOUBLE-STRUCK CAPITAL Q
	'\u211B': "$\\mathscr{R}$", // SCRIPT CAPITAL R
	'\u211C': "$\\mathfrak{R}$", // BLACK-LETTER CAPITAL R
	'\u211D': "$\\mathbb{R}$", // DOUBLE-STRUCK CAPITAL R
	'\u211E': "$\\Elzxrat{}$", // PRESCRIPTION TAKE
	'\u2124': "$\\mathbb{Z}$", // DOUBLE-STRUCK CAPITAL Z
	'\u2127': "$\\mho{}$", // INVERTED OHM SIGN
	'\u2128': "$\\mathfrak{Z}$", // BLACK-LETTER CAPITAL Z
	'\u2129': "$\\ElsevierGlyph{2129}$", // TURNED GREEK SMALL LETTER IOTA
	'\u212C': "$\\mathscr{B}$", // SCRIPT CAPITAL B
	'\u212D': "$\\mathfrak{C}$", // BLACK-LETTER CAPITAL C
	'\u212F': "$\\mathscr{e}$", // SCRIPT SMALL E
	'\u2130': "$\\mathscr{E}$", // SCRIPT CAPITAL E
	'\u2131': "$\\mathscr{F}$", // SCRIPT CAPITAL F
	'\u2132': "$\\Finv{}$", // TURNED CAPITAL F
	'\u2133': "$\\mathscr{M}$", // SCRIPT CAPITAL M
	'\u2134': "$\\mathscr{o}$", // SCRIPT SMALL O
	'\u2135': "$\\aleph{}$", // ALEF SYMBOL
	'\u2136': "$\\beth{}$", // BET SYMBOL
	'\u2137': "$\\gimel{}$", // GIMEL SYMBOL
	'\u2138': "$\\daleth{}$", // DALET SYMBOL
	'\u213C': "$\\mathbb{\\pi}$", // \DoublePi (wrisym), DOUBLE-STRUCK SMALL PI
	'\u213D': "$\\mathbb{\\gamma}$", // \EulerGamma (wrisym), DOUBLE-STRUCK SMALL GAMMA
	'\u213E': "$\\mathbb{\\Gamma}$", // DOUBLE-STRUCK CAPITAL GAMMA
	'\u213F': "$\\mathbb{\\Pi}$", // DOUBLE-STRUCK CAPITAL PI
	'\u2140': "$\\mathbb{\\Sigma}$", // DOUBLE-STRUCK N-ARY SUMMATION
	'\u2141': "$\\Game{}$", // # \Game (amssymb), TURNED SANS-SERIF CAPITAL G (amssymb has mirrored G)
	'\u2142': "$\\sansLturned{}$", // TURNED SANS-SERIF CAPITAL L
	'\u2143': "$\\sansLmirrored{}$", // REVERSED SANS-SERIF CAPITAL L
	'\u2144': "$\\Yup{}$", // TURNED SANS-SERIF CAPITAL Y
	'\u2145': "$\\CapitalDifferentialD{}$", // = \DD (wrisym), DOUBLE-STRUCK ITALIC CAPITAL D
	'\u2146': "$\\DifferentialD{}$", // = \dd (wrisym), DOUBLE-STRUCK ITALIC SMALL D
	'\u2147': "$\\ExponetialE{}$", // = \ee (wrisym), DOUBLE-STRUCK ITALIC SMALL E
	'\u2148': "$\\ComplexI{}$", // = \ii (wrisym), DOUBLE-STRUCK ITALIC SMALL I
	'\u2149': "$\\ComplexJ{}$", // = \jj (wrisym), DOUBLE-STRUCK ITALIC SMALL J
	'\u214A': "$\\PropertyLine{}$", // PROPERTY LINE
	'\u214B': "$\\invamp{}$", // # \bindnasrepma (stmaryrd), TURNED AMPERSAND
	'\u2195': "$\\updownarrow{}$", // UP DOWN ARROW
	'\u2196': "$\\nwarrow{}$", // NORTH WEST ARROW
	'\u2197': "$\\nearrow{}$", // NORTH EAST ARROW
	'\u2198': "$\\searrow{}$", // SOUTH EAST ARROW
	'\u2199': "$\\swarrow{}$", // SOUTH WEST ARROW
	'\u219A': "$\\nleftarrow{}$", // LEFTWARDS ARROW WITH STROKE
	'\u219B': "$\\nrightarrow{}$", // RIGHTWARDS ARROW WITH STROKE
	'\u219C': "$\\arrowwaveleft{}$",
	'\u219D': "$\\arrowwaveright{}$", // RIGHTWARDS WAVE ARROW
	'\u219E': "$\\twoheadleftarrow{}$", // LEFTWARDS TWO HEADED ARROW
	'\u219F': "$\\twoheaduparrow{}$", // up two-headed arrow
	'\u21A0': "$\\twoheadrightarrow{}$", // RIGHTWARDS TWO HEADED ARROW
	'\u21A1': "$\\twoheaddownarrow{}$", // down two-headed arrow
	'\u21A2': "$\\leftarrowtail{}$", // LEFTWARDS ARROW WITH TAIL
	'\u21A3': "$\\rightarrowtail{}$", // RIGHTWARDS ARROW WITH TAIL
	'\u21A4': "$\\mapsfrom{}$", // = \mappedfrom (kpfonts), maps to, leftward
	'\u21A5': "$\\MapsUp{}$", // maps to, upward
	'\u21A6': "$\\mapsto{}$", // RIGHTWARDS ARROW FROM BAR
	'\u21A7': "$\\MapsDown{}$", // maps to, downward
	'\u21A8': "$\\updownarrowbar{}$", // UP DOWN ARROW WITH BASE (perpendicular)
	'\u21A9': "$\\hookleftarrow{}$", // LEFTWARDS ARROW WITH HOOK
	'\u21AA': "$\\hookrightarrow{}$", // RIGHTWARDS ARROW WITH HOOK
	'\u21AB': "$\\looparrowleft{}$", // LEFTWARDS ARROW WITH LOOP
	'\u21AC': "$\\looparrowright{}$", // RIGHTWARDS ARROW WITH LOOP
	'\u21AD': "$\\leftrightsquigarrow{}$", // LEFT RIGHT WAVE ARROW
	'\u21AE': "$\\nleftrightarrow{}$", // LEFT RIGHT ARROW WITH STROKE
	'\u21AF': "$\\lightning{}$", // t \Lightning (marvosym), DOWNWARDS ZIGZAG ARROW
	'\u21B0': "$\\Lsh{}$", // UPWARDS ARROW WITH TIP LEFTWARDS
	'\u21B1': "$\\Rsh{}$", // UPWARDS ARROW WITH TIP RIGHTWARDS
	'\u21B2': "$\\dlsh{}$", // left down angled arrow
	'\u21B3': "$\\ElsevierGlyph{21B3}$", // DOWNWARDS ARROW WITH TIP RIGHTWARDS
	'\u21B4': "$\\linefeed{}$", // RIGHTWARDS ARROW WITH CORNER DOWNWARDS
	'\u21B5': "$\\carriagereturn{}$", // downwards arrow with corner leftward = carriage return
	'\u21B6': "$\\curvearrowleft{}$", // ANTICLOCKWISE TOP SEMICIRCLE ARROW
	'\u21B7': "$\\curvearrowright{}$", // CLOCKWISE TOP SEMICIRCLE ARROW
	'\u21B8': "$\\barovernorthwestarrow{}$", // NORTH WEST ARROW TO LONG BAR
	'\u21B9': "$\\barleftarrowrightarrowba{}$", // LEFTWARDS ARROW TO BAR OVER RIGHTWARDS ARROW TO BAR
	'\u21BA': "$\\circlearrowleft{}$", // ANTICLOCKWISE OPEN CIRCLE ARROW
	'\u21BB': "$\\circlearrowright{}$", // CLOCKWISE OPEN CIRCLE ARROW
	'\u21BC': "$\\leftharpoonup{}$", // LEFTWARDS HARPOON WITH BARB UPWARDS
	'\u21BD': "$\\leftharpoondown{}$", // LEFTWARDS HARPOON WITH BARB DOWNWARDS
	'\u21BE': "$\\upharpoonright{}$", // UPWARDS HARPOON WITH BARB RIGHTWARDS
	'\u21BF': "$\\upharpoonleft{}$", // UPWARDS HARPOON WITH BARB LEFTWARDS
	'\u21C0': "$\\rightharpoonup{}$", // RIGHTWARDS HARPOON WITH BARB UPWARDS
	'\u21C1': "$\\rightharpoondown{}$", // RIGHTWARDS HARPOON WITH BARB DOWNWARDS
	'\u21C2': "$\\downharpoonright{}$", // DOWNWARDS HARPOON WITH BARB RIGHTWARDS
	'\u21C3': "$\\downharpoonleft{}$", // DOWNWARDS HARPOON WITH BARB LEFTWARDS
	'\u21C4': "$\\rightleftarrows{}$", // RIGHTWARDS ARROW OVER LEFTWARDS ARROW
	'\u21C5': "$\\dblarrowupdown{}$", // UPWARDS ARROW LEFTWARDS OF DOWNWARDS ARROW
	'\u21C6': "$\\leftrightarrows{}$", // LEFTWARDS ARROW OVER RIGHTWARDS ARROW
	'\u21C7': "$\\leftleftarrows{}$", // LEFTWARDS PAIRED ARROWS
	'\u21C8': "$\\upuparrows{}$", // UPWARDS PAIRED ARROWS
	'\u21C9': "$\\rightrightarrows{}$", // RIGHTWARDS PAIRED ARROWS
	'\u21CA': "$\\downdownarrows{}$", // DOWNWARDS PAIRED ARROWS
	'\u21CB': "$\\leftrightharpoons{}$", // LEFTWARDS HARPOON OVER RIGHTWARDS HARPOON
	'\u21CC': "$\\rightleftharpoons{}$", // RIGHTWARDS HARPOON OVER LEFTWARDS HARPOON
	'\u21CD': "$\\nLeftarrow{}$", // LEFTWARDS DOUBLE ARROW WITH STROKE
	'\u21CE': "$\\nLeftrightarrow{}$", // LEFT RIGHT DOUBLE ARROW WITH STROKE
	'\u21CF': "$\\nRightarrow{}$", // RIGHTWARDS DOUBLE ARROW WITH STROKE
	'\u21D1': "$\\Uparrow{}$", // UPWARDS DOUBLE ARROW
	'\u21D3': "$\\Downarrow{}$", // DOWNWARDS DOUBLE ARROW
	'\u21D5': "$\\Updownarrow{}$", // UP DOWN DOUBLE ARROW
	'\u21D6': "$\\Nwarrow{}$", // nw pointing double arrow
	'\u21D7': "$\\Nearrow{}$", // ne pointing double arrow
	'\u21D8': "$\\Searrow{}$", // se pointing double arrow
	'\u21D9': "$\\Swarrow{}$", // sw pointing double arrow
	'\u21DA': "$\\Lleftarrow{}$", // LEFTWARDS TRIPLE ARROW
	'\u21DB': "$\\Rrightarrow{}$", // RIGHTWARDS TRIPLE ARROW
	'\u21DC': "$\\leftsquigarrow{}$", // LEFTWARDS SQUIGGLE ARROW
	'\u21DD': "$\\rightsquigarrow{}$", // RIGHTWARDS SQUIGGLE ARROW
	'\u21DE': "$\\nHuparrow{}$", // UPWARDS ARROW WITH DOUBLE STROKE
	'\u21DF': "$\\nHdownarrow{}$", // DOWNWARDS ARROW WITH DOUBLE STROKE
	'\u21E0': "$\\dashleftarrow{}$", // LEFTWARDS DASHED ARROW
	'\u21E1': "$\\updasharrow{}$", // UPWARDS DASHED ARROW
	'\u21E2': "$\\dashrightarrow{}$", // = \dasharrow (amsfonts), RIGHTWARDS DASHED ARROW
	'\u21E3': "$\\downdasharrow{}$", // DOWNWARDS DASHED ARROW
	'\u21E4': "$\\LeftArrowBar{}$", // LEFTWARDS ARROW TO BAR
	'\u21E5': "$\\RightArrowBar{}$", // RIGHTWARDS ARROW TO BAR
	'\u21E6': "$\\leftwhitearrow{}$", // LEFTWARDS WHITE ARROW
	'\u21E7': "$\\upwhitearrow{}$", // UPWARDS WHITE ARROW
	'\u21E8': "$\\rightwhitearrow{}$", // RIGHTWARDS WHITE ARROW
	'\u21E9': "$\\downwhitearrow{}$", // DOWNWARDS WHITE ARROW
	'\u21EA': "$\\whitearrowupfrombar{}$", // UPWARDS WHITE ARROW FROM BAR
	'\u21F4': "$\\circleonrightarrow{}$", // RIGHT ARROW WITH SMALL CIRCLE
	'\u21F5': "$\\DownArrowUpArrow{}$", // DOWNWARDS ARROW LEFTWARDS OF UPWARDS ARROW
	'\u21F6': "$\\rightthreearrows{}$", // THREE RIGHTWARDS ARROWS
	'\u21F7': "$\\nvleftarrow{}$", // LEFTWARDS ARROW WITH VERTICAL STROKE
	'\u21F8': "$\\pfun{}$", // RIGHTWARDS ARROW WITH VERTICAL STROKE, z notation partial function
	'\u21F9': "$\\nvleftrightarrow{}$", // LEFT RIGHT ARROW WITH VERTICAL STROKE, z notation partial relation
	'\u21FA': "$\\nVleftarrow{}$", // LEFTWARDS ARROW WITH DOUBLE VERTICAL STROKE
	'\u21FB': "$\\ffun{}$", // RIGHTWARDS ARROW WITH DOUBLE VERTICAL STROKE, z notation finite function
	'\u21FC': "$\\nVleftrightarrow{}$", // LEFT RIGHT ARROW WITH DOUBLE VERTICAL STROKE, z notation finite relation
	'\u21FD': "$\\leftarrowtriangle{}$", // LEFTWARDS OPEN-HEADED ARROW
	'\u21FE': "$\\rightarrowtriangle{}$", // RIGHTWARDS OPEN-HEADED ARROW
	'\u21FF': "$\\leftrightarrowtriangle{}$", // LEFT RIGHT OPEN-HEADED ARROW
	'\u2200': "$\\forall{}$", // FOR ALL
	'\u2201': "$\\complement{}$", // COMPLEMENT
	'\u2202': "$\\partial{}$", // PARTIAL DIFFERENTIAL
	'\u2203': "$\\exists{}$", // THERE EXISTS
	'\u2204': "$\\nexists{}$", // THERE DOES NOT EXIST
	'\u2205': "$\\varnothing{}$", // EMPTY SET
	'\u2206': "$\\increment{}$", // # \mathrm{\Delta}, laplacian (Delta; nabla square)
	'\u2207': "$\\nabla{}$", // NABLA
	'\u2208': "$\\in{}$", // ELEMENT OF
	'\u2209': "$\\not\\in{}$", // NOT AN ELEMENT OF
	'\u220A': "$\\smallin{}$", // set membership (small set membership)
	'\u220B': "$\\ni{}$", // CONTAINS AS MEMBER
	'\u220C': "$\\not\\ni{}$", // DOES NOT CONTAIN AS MEMBER
	'\u220D': "$\\smallni{}$", // r: contains (SMALL CONTAINS AS MEMBER)
	'\u220E': "$\\QED{}$", // # \blacksquare (amssymb), END OF PROOF
	'\u220F': "$\\prod{}$", // N-ARY PRODUCT
	'\u2210': "$\\coprod{}$", // N-ARY COPRODUCT
	'\u2211': "$\\sum{}$", // N-ARY SUMMATION
	'\u2213': "$\\mp{}$", // MINUS-OR-PLUS SIGN
	'\u2214': "$\\dotplus{}$", // DOT PLUS
	'\u221A': "$\\surd{}$", // SQUARE ROOT
	'\u221B': "$\\sqrt[3]$", // CUBE ROOT
	'\u221C': "$\\sqrt[4]$", // FOURTH ROOT
	'\u221D': "$\\propto{}$", // PROPORTIONAL TO
	'\u221F': "$\\rightangle{}$", // RIGHT ANGLE
	'\u2220': "$\\angle{}$", // ANGLE
	'\u2221': "$\\measuredangle{}$", // MEASURED ANGLE
	'\u2222': "$\\sphericalangle{}$", // SPHERICAL ANGLE
	'\u2224': "$\\nmid{}$", // DOES NOT DIVIDE
	'\u2226': "$\\nparallel{}$", // NOT PARALLEL TO
	'\u2227': "$\\wedge{}$", // LOGICAL AND
	'\u2228': "$\\vee{}$", // LOGICAL OR
	'\u2229': "$\\cap{}$", // INTERSECTION
	'\u222A': "$\\cup{}$", // UNION
	'\u222B': "$\\int{}$", // INTEGRAL
	'\u222C': "${\\int\\!\\int}$", // DOUBLE INTEGRAL
	'\u222D': "${\\int\\!\\int\\!\\int}$", // TRIPLE INTEGRAL
	'\u222E': "$\\oint{}$", // CONTOUR INTEGRAL
	'\u222F': "$\\surfintegral{}$", // SURFACE INTEGRAL
	'\u2230': "$\\volintegral{}$", // VOLUME INTEGRAL
	'\u2231': "$\\clwintegral{}$", // CLOCKWISE INTEGRAL
	'\u2232': "$\\ElsevierGlyph{2232}$", // CLOCKWISE CONTOUR INTEGRAL
	'\u2233': "$\\ElsevierGlyph{2233}$", // ANTICLOCKWISE CONTOUR INTEGRAL
	'\u2234': "$\\therefore{}$", // THEREFORE
	'\u2235': "$\\because{}$", // BECAUSE
	'\u2237': "$\\Colon{}$", // PROPORTION
	'\u2238': "$\\ElsevierGlyph{2238}$", // DOT MINUS
	'\u2239': "$\\eqcolon{}$", // # -: ,EXCESS
	'\u223A': "$\\mathbin{{:}\\!\\!{-}\\!\\!{:}}$", // GEOMETRIC PROPORTION
	'\u223B': "$\\homothetic{}$", // HOMOTHETIC
	'\u223D': "$\\backsim{}$", // REVERSED TILDE
	'\u223E': "$\\lazysinv{}$", // INVERTED LAZY S
	'\u223F': "$\\AC{}$", // SINE WAVE, alternating current
	'\u2240': "$\\wr{}$", // WREATH PRODUCT
	'\u2241': "$\\not\\sim{}$", // NOT TILDE
	'\u2242': "$\\ElsevierGlyph{2242}$", // MINUS TILDE
	'\u2243': "$\\simeq{}$", // ASYMPTOTICALLY EQUAL TO
	'\u2244': "$\\not\\simeq{}$", // NOT ASYMPTOTICALLY EQUAL TO
	'\u2245': "$\\cong{}$", // APPROXIMATELY EQUAL TO
	'\u2246': "$\\approxnotequal{}$", // APPROXIMATELY BUT NOT ACTUALLY EQUAL TO
	'\u2247': "$\\not\\cong{}$", // NEITHER APPROXIMATELY NOR ACTUALLY EQUAL TO
	'\u2248': "$\\approx{}$", // ALMOST EQUAL TO
	'\u2249': "$\\not\\approx{}$", // NOT ALMOST EQUAL TO
	'\u224A': "$\\approxeq{}$", // ALMOST EQUAL OR EQUAL TO
	'\u224B': "$\\tildetrpl{}$", // TRIPLE TILDE
	'\u224C': "$\\allequal{}$", // ALL EQUAL TO
	'\u224D': "$\\asymp{}$", // EQUIVALENT TO
	'\u224E': "$\\Bumpeq{}$", // GEOMETRICALLY EQUIVALENT TO
	'\u224F': "$\\bumpeq{}$", // DIFFERENCE BETWEEN
	'\u2250': "$\\doteq{}$", // APPROACHES THE LIMIT
	'\u2251': "$\\doteqdot{}$", // GEOMETRICALLY EQUAL TO
	'\u2252': "$\\fallingdotseq{}$", // APPROXIMATELY EQUAL TO OR THE IMAGE OF
	'\u2253': "$\\risingdotseq{}$", // IMAGE OF OR APPROXIMATELY EQUAL TO
	'\u2254': ":=", // COLON EQUALS
	'\u2255': "$=:$", // EQUALS COLON
	'\u2256': "$\\eqcirc{}$", // RING IN EQUAL TO
	'\u2257': "$\\circeq{}$", // RING EQUAL TO
	'\u2258': "$\\arceq{}$", // arc, equals; CORRESPONDS TO
	'\u2259': "$\\estimates{}$", // ESTIMATES
	'\u225A': "$\\ElsevierGlyph{225A}$", // EQUIANGULAR TO
	'\u225B': "$\\starequal{}$", // STAR EQUALS
	'\u225C': "$\\triangleq{}$", // DELTA EQUAL TO
	'\u225D': "$\\eqdef{}$", // equals by definition
	'\u225E': "$\\measeq{}$", // MEASURED BY (m over equals)
	'\u225F': "$\\ElsevierGlyph{225F}$", // QUESTIONED EQUAL TO
	'\u2262': "$\\not\\equiv{}$", // NOT IDENTICAL TO
	'\u2263': "$\\Equiv{}$", // strict equivalence (4 lines)
	'\u2266': "$\\leqq{}$", // LESS-THAN OVER EQUAL TO
	'\u2267': "$\\geqq{}$", // GREATER-THAN OVER EQUAL TO
	'\u2268': "$\\lneqq{}$", // LESS-THAN BUT NOT EQUAL TO
	'\u2269': "$\\gneqq{}$", // GREATER-THAN BUT NOT EQUAL TO
	'\u226C': "$\\between{}$", // BETWEEN
	'\u226D': "${\\not\\kern-0.3em\\times}$", // NOT EQUIVALENT TO
	'\u226E': "$\\not<$", // NOT LESS-THAN
	'\u226F': "$\\not>$", // NOT GREATER-THAN
	'\u2270': "$\\not\\leq{}$", // NEITHER LESS-THAN NOR EQUAL TO
	'\u2271': "$\\not\\geq{}$", // NEITHER GREATER-THAN NOR EQUAL TO
	'\u2272': "$\\lessequivlnt{}$", // LESS-THAN OR EQUIVALENT TO
	'\u2273': "$\\greaterequivlnt{}$", // GREATER-THAN OR EQUIVALENT TO
	'\u2274': "$\\ElsevierGlyph{2274}$", // NEITHER LESS-THAN NOR EQUIVALENT TO
	'\u2275': "$\\ElsevierGlyph{2275}$", // NEITHER GREATER-THAN NOR EQUIVALENT TO
	'\u2276': "$\\lessgtr{}$", // LESS-THAN OR GREATER-THAN
	'\u2277': "$\\gtrless{}$", // GREATER-THAN OR LESS-THAN
	'\u2278': "$\\notlessgreater{}$", // NEITHER LESS-THAN NOR GREATER-THAN
	'\u2279': "$\\notgreaterless{}$", // NEITHER GREATER-THAN NOR LESS-THAN
	'\u227A': "$\\prec{}$", // PRECEDES
	'\u227B': "$\\succ{}$", // SUCCEEDS
	'\u227C': "$\\preccurlyeq{}$", // PRECEDES OR EQUAL TO
	'\u227D': "$\\succcurlyeq{}$", // SUCCEEDS OR EQUAL TO
	'\u227E': "$\\precapprox{}$", // PRECEDES OR EQUIVALENT TO
	'\u227F': "$\\succapprox{}$", // SUCCEEDS OR EQUIVALENT TO
	'\u2280': "$\\not\\prec{}$", // DOES NOT PRECEDE
	'\u2281': "$\\not\\succ{}$", // DOES NOT SUCCEED
	'\u2282': "$\\subset{}$", // SUBSET OF
	'\u2283': "$\\supset{}$", // SUPERSET OF
	'\u2284': "$\\not\\subset{}$", // NOT A SUBSET OF
	'\u2285': "$\\not\\supset{}$", // NOT A SUPERSET OF
	'\u2286': "$\\subseteq{}$", // SUBSET OF OR EQUAL TO
	'\u2287': "$\\supseteq{}$", // SUPERSET OF OR EQUAL TO
	'\u2288': "$\\not\\subseteq{}$", // NEITHER A SUBSET OF NOR EQUAL TO
	'\u2289': "$\\not\\supseteq{}$", // NEITHER A SUPERSET OF NOR EQUAL TO
	'\u228A': "$\\subsetneq{}$", // SUBSET OF WITH NOT EQUAL TO
	'\u228B': "$\\supsetneq{}$", // SUPERSET OF WITH NOT EQUAL TO
	'\u228C': "$\\cupleftarrow{}$", // MULTISET
	'\u228D': "$\\cupdot{}$", // union, with dot
	'\u228E': "$\\uplus{}$", // MULTISET UNION
	'\u228F': "$\\sqsubset{}$", // SQUARE IMAGE OF
	'\u2290': "$\\sqsupset{}$", // SQUARE ORIGINAL OF
	'\u2291': "$\\sqsubseteq{}$", // SQUARE IMAGE OF OR EQUAL TO
	'\u2292': "$\\sqsupseteq{}$", // SQUARE ORIGINAL OF OR EQUAL TO
	'\u2293': "$\\sqcap{}$", // SQUARE CAP
	'\u2294': "$\\sqcup{}$", // SQUARE CUP
	'\u2299': "$\\odot{}$", // CIRCLED DOT OPERATOR
	'\u229A': "$\\circledcirc{}$", // CIRCLED RING OPERATOR
	'\u229B': "$\\circledast{}$", // CIRCLED ASTERISK OPERATOR
	'\u229C': "$\\circledequal{}$", // equal in circle
	'\u229D': "$\\circleddash{}$", // CIRCLED DASH
	'\u229E': "$\\boxplus{}$", // SQUARED PLUS
	'\u229F': "$\\boxminus{}$", // SQUARED MINUS
	'\u22A0': "$\\boxtimes{}$", // SQUARED TIMES
	'\u22A1': "$\\boxdot{}$", // SQUARED DOT OPERATOR
	'\u22A4': "$\\top{}$", // DOWN TACK
	'\u22A5': "$\\perp{}$", // UP TACK
	'\u22AA': "$\\Vvdash{}$", // TRIPLE VERTICAL BAR RIGHT TURNSTILE
	'\u22AB': "$\\VDash{}$", // DOUBLE VERTICAL BAR DOUBLE RIGHT TURNSTILE
	'\u22AC': "$\\nvdash{}$", // DOES NOT PROVE
	'\u22AD': "$\\nvDash{}$", // NOT TRUE
	'\u22AE': "$\\nVdash{}$", // DOES NOT FORCE
	'\u22AF': "$\\nVDash{}$", // NEGATED DOUBLE VERTICAL BAR DOUBLE RIGHT TURNSTILE
	'\u22B0': "$\\prurel{}$", // element PRECEDES UNDER RELATION
	'\u22B1': "$\\scurel{}$", // SUCCEEDS UNDER RELATION
	'\u22B2': "$\\vartriangleleft{}$", // NORMAL SUBGROUP OF
	'\u22B3': "$\\vartriangleright{}$", // CONTAINS AS NORMAL SUBGROUP
	'\u22B4': "$\\trianglelefteq{}$", // NORMAL SUBGROUP OF OR EQUAL TO
	'\u22B5': "$\\trianglerighteq{}$", // CONTAINS AS NORMAL SUBGROUP OR EQUAL TO
	'\u22B6': "$\\original{}$", // ORIGINAL OF
	'\u22B7': "$\\image{}$", // IMAGE OF
	'\u22B8': "$\\multimap{}$", // MULTIMAP
	'\u22B9': "$\\hermitconjmatrix{}$", // HERMITIAN CONJUGATE MATRIX
	'\u22BA': "$\\intercal{}$", // INTERCALATE
	'\u22BB': "$\\veebar{}$", // XOR
	'\u22BC': "$\\barwedge{}$", // logical NAND (bar over wedge)
	'\u22BD': "$\\barvee{}$", // bar, vee (large vee)
	'\u22BE': "$\\rightanglearc{}$", // RIGHT ANGLE WITH ARC
	'\u22BF': "$\\varlrtriangle{}$", // RIGHT TRIANGLE
	'\u22C0': "$\\ElsevierGlyph{22C0}$", // N-ARY LOGICAL AND
	'\u22C1': "$\\ElsevierGlyph{22C1}$", // N-ARY LOGICAL OR
	'\u22C2': "$\\bigcap{}$", // N-ARY INTERSECTION
	'\u22C3': "$\\bigcup{}$", // N-ARY UNION
	'\u22C4': "$\\diamond{}$", // DIAMOND OPERATOR
	'\u22C7': "$\\divideontimes{}$", // DIVISION TIMES
	'\u22C8': "$\\bowtie{}$", // BOWTIE
	'\u22C9': "$\\ltimes{}$", // LEFT NORMAL FACTOR SEMIDIRECT PRODUCT
	'\u22CA': "$\\rtimes{}$", // RIGHT NORMAL FACTOR SEMIDIRECT PRODUCT
	'\u22CB': "$\\leftthreetimes{}$", // LEFT SEMIDIRECT PRODUCT
	'\u22CC': "$\\rightthreetimes{}$", // RIGHT SEMIDIRECT PRODUCT
	'\u22CD': "$\\backsimeq{}$", // REVERSED TILDE EQUALS
	'\u22CE': "$\\curlyvee{}$", // CURLY LOGICAL OR
	'\u22CF': "$\\curlywedge{}$", // CURLY LOGICAL AND
	'\u22D0': "$\\Subset{}$", // DOUBLE SUBSET
	'\u22D1': "$\\Supset{}$", // DOUBLE SUPERSET
	'\u22D2': "$\\Cap{}$", // DOUBLE INTERSECTION
	'\u22D3': "$\\Cup{}$", // DOUBLE UNION
	'\u22D4': "$\\pitchfork{}$", // PITCHFORK
	'\u22D6': "$\\lessdot{}$", // LESS-THAN WITH DOT
	'\u22D7': "$\\gtrdot{}$", // GREATER-THAN WITH DOT
	'\u22DA': "$\\lesseqgtr{}$", // LESS-THAN EQUAL TO OR GREATER-THAN
	'\u22DB': "$\\gtreqless{}$", // GREATER-THAN EQUAL TO OR LESS-THAN
	'\u22DC': "$\\eqless{}$", // equal-or-less
	'\u22DD': "$\\eqgtr{}$", // equal-or-greater
	'\u22DE': "$\\curlyeqprec{}$", // EQUAL TO OR PRECEDES
	'\u22DF': "$\\curlyeqsucc{}$", // EQUAL TO OR SUCCEEDS
	'\u22E0': "$\\npreceq{}$", // DOES NOT PRECEDE OR EQUAL
	'\u22E1': "$\\nsucceq{}$", // not succeeds, curly equals
	'\u22E2': "$\\not\\sqsubseteq{}$", // NOT SQUARE IMAGE OF OR EQUAL TO
	'\u22E3': "$\\not\\sqsupseteq{}$", // NOT SQUARE ORIGINAL OF OR EQUAL TO
	'\u22E4': "$\\sqsubsetneq{}$", // square subset, not equals
	'\u22E5': "$\\Elzsqspne{}$", // SQUARE ORIGINAL OF OR NOT EQUAL TO
	'\u22E6': "$\\lnsim{}$", // LESS-THAN BUT NOT EQUIVALENT TO
	'\u22E7': "$\\gnsim{}$", // GREATER-THAN BUT NOT EQUIVALENT TO
	'\u22E8': "$\\precedesnotsimilar{}$", // PRECEDES BUT NOT EQUIVALENT TO
	'\u22E9': "$\\succnsim{}$", // SUCCEEDS BUT NOT EQUIVALENT TO
	'\u22EA': "$\\ntriangleleft{}$", // NOT NORMAL SUBGROUP OF
	'\u22EB': "$\\ntriangleright{}$", // DOES NOT CONTAIN AS NORMAL SUBGROUP
	'\u22EC': "$\\ntrianglelefteq{}$", // NOT NORMAL SUBGROUP OF OR EQUAL TO
	'\u22ED': "$\\ntrianglerighteq{}$", // DOES NOT CONTAIN AS NORMAL SUBGROUP OR EQUAL
	'\u22EE': "$\\vdots{}$", // VERTICAL ELLIPSIS
	'\u22EF': "$\\cdots{}$", // MIDLINE HORIZONTAL ELLIPSIS
	'\u22F0': "$\\upslopeellipsis{}$", // UP RIGHT DIAGONAL ELLIPSIS
	'\u22F1': "$\\downslopeellipsis{}$", // DOWN RIGHT DIAGONAL ELLIPSIS
	'\u22F2': "$\\disin{}$", // ELEMENT OF WITH LONG HORIZONTAL STROKE
	'\u22F3': "$\\varisins{}$", // ELEMENT OF WITH VERTICAL BAR AT END OF HORIZONTAL STROKE
	'\u22F4': "$\\isins{}$", // SMALL ELEMENT OF WITH VERTICAL BAR AT END OF HORIZONTAL STROKE
	'\u22F5': "$\\isindot{}$", // ELEMENT OF WITH DOT ABOVE
	'\u22F6': "$\\barin{}$", // ELEMENT OF WITH OVERBAR
	'\u22F7': "$\\isinobar{}$", // SMALL ELEMENT OF WITH OVERBAR
	'\u22F8': "$\\isinvb{}$", // ELEMENT OF WITH UNDERBAR
	'\u22F9': "$\\isinE{}$", // ELEMENT OF WITH TWO HORIZONTAL STROKES
	'\u22FA': "$\\nisd{}$", // CONTAINS WITH LONG HORIZONTAL STROKE
	'\u22FB': "$\\varnis{}$", // CONTAINS WITH VERTICAL BAR AT END OF HORIZONTAL STROKE
	'\u22FC': "$\\nis{}$", // SMALL CONTAINS WITH VERTICAL BAR AT END OF HORIZONTAL STROKE
	'\u22FD': "$\\varniobar{}$", // CONTAINS WITH OVERBAR
	'\u22FE': "$\\niobar{}$", // SMALL CONTAINS WITH OVERBAR
	'\u22FF': "$\\bagmember{}$", // # \mathsf{E}, Z NOTATION BAG MEMBERSHIP
	'\u2300': "$\\diameter{}$", // # \varnothing (amssymb), DIAMETER SIGN
	'\u2302': "$\\house{}$", // HOUSE
	'\u2305': "\\barwedge{}", // PROJECTIVE
	'\u2306': "$\\perspcorrespond{}$", // PERSPECTIVE
	'\u2308': "$\\lceil{}$", // LEFT CEILING
	'\u2309': "$\\rceil{}$", // RIGHT CEILING
	'\u230A': "$\\lfloor{}$", // LEFT FLOOR
	'\u230B': "$\\rfloor{}$", // RIGHT FLOOR
	'\u2310': "$\\invneg{}$", // reverse not
	'\u2311': "$\\wasylozenge{}$", // SQUARE LOZENGE
	'\u2312': "$\\profline{}$", // profile of a line
	'\u2313': "$\\profsurf{}$", // profile of a surface
	'\u2315': "$\\recorder{}$", // TELEPHONE RECORDER
	'\u2316': "${\\mathchar\"2208}$", // POSITION INDICATOR
	'\u2317': "$\\viewdata{}$", // VIEWDATA SQUARE
	'\u2319': "$\\turnednot{}$", // TURNED NOT SIGN
	'\u231C': "$\\ulcorner{}$", // TOP LEFT CORNER
	'\u231D': "$\\urcorner{}$", // TOP RIGHT CORNER
	'\u231E': "$\\llcorner{}$", // BOTTOM LEFT CORNER
	'\u231F': "$\\lrcorner{}$", // BOTTOM RIGHT CORNER
	'\u2320': "$\\inttop{}$", // TOP HALF INTEGRAL
	'\u2321': "$\\intbottom{}$", // BOTTOM HALF INTEGRAL
	'\u2322': "$\\frown{}$", // FROWN
	'\u2323': "$\\smile{}$", // SMILE
	'\u232C': "$\\varhexagonlrbonds{}$", // six carbon ring, corner down, double bonds lower right etc
	'\u2332': "$\\conictaper{}$", // CONICAL TAPER
	'\u2336': "$\\topbot{}$", // APL FUNCTIONAL SYMBOL I-BEAM, top and bottom
	'\u2339': "$\\APLinv{}$", // APL FUNCTIONAL SYMBOL QUAD DIVIDE
	'\u233D': "$\\ElsevierGlyph{E838}$", // APL FUNCTIONAL SYMBOL CIRCLE STILE
	'\u233F': "$\\notslash{}$", // APL FUNCTIONAL SYMBOL SLASH BAR, solidus, bar through
	'\u2340': "$\\notbackslash{}$", // APL FUNCTIONAL SYMBOL BACKSLASH BAR
	'\u2347': "$\\APLleftarrowbox{}$", // APL FUNCTIONAL SYMBOL QUAD LEFTWARDS ARROW
	'\u2348': "$\\APLrightarrowbox{}$", // APL FUNCTIONAL SYMBOL QUAD RIGHTWARDS ARROW
	'\u2350': "$\\APLuparrowbox{}$", // APL FUNCTIONAL SYMBOL QUAD UPWARDS ARROW
	'\u2353': "$\\APLboxupcaret{}$", // APL FUNCTIONAL SYMBOL QUAD UP CARET
	'\u2357': "$\\APLdownarrowbox{}$", // APL FUNCTIONAL SYMBOL QUAD DOWNWARDS ARROW
	'\u235D': "$\\APLcomment{}$", // APL FUNCTIONAL SYMBOL UP SHOE JOT
	'\u235E': "$\\APLinput{}$", // APL FUNCTIONAL SYMBOL QUOTE QUAD
	'\u235F': "$\\APLlog{}$", // APL FUNCTIONAL SYMBOL CIRCLE STAR
	'\u2370': "$\\APLboxquestion{}$", // APL FUNCTIONAL SYMBOL QUAD QUESTION
	'\u237C': "$\\rangledownzigzagarrow{}$", // RIGHT ANGLE WITH DOWNWARDS ZIGZAG ARROW
	'\u2394': "$\\hexagon{}$", // horizontal benzene ring [hexagon flat open]
	'\u239B': "$\\lparenuend{}$", // LEFT PARENTHESIS UPPER HOOK
	'\u239C': "$\\lparenextender{}$", // LEFT PARENTHESIS EXTENSION
	'\u239D': "$\\lparenlend{}$", // LEFT PARENTHESIS LOWER HOOK
	'\u239E': "$\\rparenuend{}$", // RIGHT PARENTHESIS UPPER HOOK
	'\u239F': "$\\rparenextender{}$", // RIGHT PARENTHESIS EXTENSION
	'\u23A0': "$\\rparenlend{}$", // RIGHT PARENTHESIS LOWER HOOK
	'\u23A1': "$\\lbrackuend{}$", // LEFT SQUARE BRACKET UPPER CORNER
	'\u23A2': "$\\lbrackextender{}$", // LEFT SQUARE BRACKET EXTENSION
	'\u23A3': "$\\Elzdlcorn{}$", // LEFT SQUARE BRACKET LOWER CORNER
	'\u23A4': "$\\rbrackuend{}$", // RIGHT SQUARE BRACKET UPPER CORNER
	'\u23A5': "$\\rbrackextender{}$", // RIGHT SQUARE BRACKET EXTENSION
	'\u23A6': "$\\rbracklend{}$", // RIGHT SQUARE BRACKET LOWER CORNER
	'\u23A7': "$\\lbraceuend{}$", // LEFT CURLY BRACKET UPPER HOOK
	'\u23A8': "$\\lbracemid{}$", // LEFT CURLY BRACKET MIDDLE PIECE
	'\u23A9': "$\\lbracelend{}$", // LEFT CURLY BRACKET LOWER HOOK
	'\u23AA': "$\\vbraceextender{}$", // CURLY BRACKET EXTENSION
	'\u23AB': "$\\rbraceuend{}$", // RIGHT CURLY BRACKET UPPER HOOK
	'\u23AC': "$\\rbracemid{}$", // RIGHT CURLY BRACKET MIDDLE PIECE
	'\u23AD': "$\\rbracelend{}$", // RIGHT CURLY BRACKET LOWER HOOK
	'\u23AE': "$\\intextender{}$", // INTEGRAL EXTENSION
	'\u23AF': "$\\harrowextender{}$", // HORIZONTAL LINE EXTENSION (used to extend arrows)
	'\u23B0': "$\\lmoustache{}$", // UPPER LEFT OR LOWER RIGHT CURLY BRACKET SECTION
	'\u23B1': "$\\rmoustache{}$", // UPPER RIGHT OR LOWER LEFT CURLY BRACKET SECTION
	'\u23B2': "$\\sumtop{}$", // SUMMATION TOP
	'\u23B3': "$\\sumbottom{}$", // SUMMATION BOTTOM
	'\u23B4': "$\\overbracket{}$", // TOP SQUARE BRACKET
	'\u23B5': "$\\underbracket{}$", // BOTTOM SQUARE BRACKET
	'\u23B6': "$\\bbrktbrk{}$", // BOTTOM SQUARE BRACKET OVER TOP SQUARE BRACKET
	'\u23B7': "$\\sqrtbottom{}$", // RADICAL SYMBOL BOTTOM
	'\u23B8': "$\\lvboxline{}$", // LEFT VERTICAL BOX LINE
	'\u23B9': "$\\rvboxline{}$", // RIGHT VERTICAL BOX LINE
	'\u23CE': "$\\varcarriagereturn{}$", // RETURN SYMBOL
	'\u23DC': "$\\overparen{}$", // = \wideparen (yhmath mathabx fourier), TOP PARENTHESIS (mathematical use)
	'\u23DD': "$\\underparen{}$", // BOTTOM PARENTHESIS (mathematical use)
	'\u23DE': "$\\overbrace{}$", // TOP CURLY BRACKET (mathematical use)
	'\u23DF': "$\\underbrace{}$", // BOTTOM CURLY BRACKET (mathematical use)
	'\u23E0': "$\\obrbrak{}$", // TOP TORTOISE SHELL BRACKET (mathematical use)
	'\u23E1': "$\\ubrbrak{}$", // BOTTOM TORTOISE SHELL BRACKET (mathematical use)
	'\u23E2': "$\\trapezium{}$", // WHITE TRAPEZIUM
	'\u23E3': "$\\benzenr{}$", // BENZENE RING WITH CIRCLE
	'\u23E4': "$\\strns{}$", // STRAIGHTNESS
	'\u23E5': "$\\fltns{}$", // FLATNESS
	'\u23E6': "$\\accurrent{}$", // # \AC (wasysym), AC CURRENT
	'\u23E7': "$\\elinters{}$", // ELECTRICAL INTERSECTION
	'\u2580': "$\\blockuphalf{}$", // UPPER HALF BLOCK
	'\u2584': "$\\blocklowhalf{}$", // LOWER HALF BLOCK
	'\u2588': "$\\blockfull{}$", // FULL BLOCK
	'\u258C': "$\\blocklefthalf{}$", // LEFT HALF BLOCK
	'\u2590': "$\\blockrighthalf{}$", // RIGHT HALF BLOCK
	'\u2591': "$\\blockqtrshaded{}$", // 25\% shaded block
	'\u2592': "$\\blockhalfshaded{}$", // 50\% shaded block
	'\u2593': "$\\blockthreeqtrshaded{}$", // 75\% shaded block
	'\u25A0': "\\ding{110}", // BLACK SQUARE
	'\u25A1': "$\\square{}$", // WHITE SQUARE
	'\u25A2': "$\\squoval{}$", // WHITE SQUARE WITH ROUNDED CORNERS
	'\u25A3': "$\\blackinwhitesquare{}$", // WHITE SQUARE CONTAINING BLACK SMALL SQUARE
	'\u25A4': "$\\squarehfill{}$", // square, horizontal rule filled
	'\u25A5': "$\\squarevfill{}$", // square, vertical rule filled
	'\u25A6': "$\\squarehvfill{}$", // SQUARE WITH ORTHOGONAL CROSSHATCH FILL
	'\u25A7': "$\\squarenwsefill{}$", // square, nw-to-se rule filled
	'\u25A8': "$\\squareneswfill{}$", // square, ne-to-sw rule filled
	'\u25A9': "$\\squarecrossfill{}$", // SQUARE WITH DIAGONAL CROSSHATCH FILL
	'\u25AA': "$\\blacksquare{}$", // BLACK SMALL SQUARE
	'\u25AB': "$\\smwhtsquare{}$", // WHITE SMALL SQUARE
	'\u25AC': "$\\hrectangleblack{}$", // BLACK RECTANGLE
	'\u25AD': "$\\fbox{~~}$", // WHITE RECTANGLE
	'\u25AE': "$\\vrectangleblack{}$", // BLACK VERTICAL RECTANGLE
	'\u25AF': "$\\Elzvrecto{}$", // WHITE VERTICAL RECTANGLE
	'\u25B0': "$\\parallelogramblack{}$", // BLACK PARALLELOGRAM
	'\u25B1': "$\\ElsevierGlyph{E381}$", // WHITE PARALLELOGRAM
	'\u25B2': "\\ding{115}", // BLACK UP-POINTING TRIANGLE
	'\u25B3': "$\\bigtriangleup{}$", // WHITE UP-POINTING TRIANGLE
	'\u25B4': "$\\blacktriangle{}$", // BLACK UP-POINTING SMALL TRIANGLE
	'\u25B5': "$\\vartriangle{}$", // WHITE UP-POINTING SMALL TRIANGLE
	'\u25B6': "$\\RHD{}$", // = \blacktriangleright (fourier -mathabx), (large) right triangle, filled
	'\u25B7': "$\\rhd{}$", // = \rres (oz), = \RightTriangle (wrisym), (large) right triangle, open; z notation range restriction
	'\u25B8': "$\\blacktriangleright{}$", // BLACK RIGHT-POINTING SMALL TRIANGLE
	'\u25B9': "$\\triangleright{}$", // WHITE RIGHT-POINTING SMALL TRIANGLE
	'\u25BA': "$\\blackpointerright{}$", // BLACK RIGHT-POINTING POINTER
	'\u25BB': "$\\whitepointerright{}$", // # \triangleright (mathabx), WHITE RIGHT-POINTING POINTER
	'\u25BC': "\\ding{116}", // BLACK DOWN-POINTING TRIANGLE
	'\u25BD': "$\\bigtriangledown{}$", // WHITE DOWN-POINTING TRIANGLE
	'\u25BE': "$\\blacktriangledown{}$", // BLACK DOWN-POINTING SMALL TRIANGLE
	'\u25BF': "$\\triangledown{}$", // WHITE DOWN-POINTING SMALL TRIANGLE
	'\u25C0': "$\\LHD{}$", // = \blacktriangleleft (fourier -mathabx), (large) left triangle, filled
	'\u25C1': "$\\lhd{}$", // = \dres (oz), = \LeftTriangle (wrisym), (large) left triangle, open; z notation domain restriction
	'\u25C2': "$\\blacktriangleleft{}$", // BLACK LEFT-POINTING SMALL TRIANGLE
	'\u25C3': "$\\triangleleft{}$", // WHITE LEFT-POINTING SMALL TRIANGLE
	'\u25C4': "$\\blackpointerleft{}$", // BLACK LEFT-POINTING POINTER
	'\u25C5': "$\\whitepointerleft{}$", // # \triangleleft (mathabx), WHITE LEFT-POINTING POINTER
	'\u25C6': "\\ding{117}", // BLACK DIAMOND
	'\u25C7': "$\\Diamond{}$", // WHITE DIAMOND; diamond, open
	'\u25C8': "$\\blackinwhitediamond{}$", // WHITE DIAMOND CONTAINING BLACK SMALL DIAMOND
	'\u25C9': "$\\fisheye{}$", // FISHEYE
	'\u25CA': "$\\lozenge{}$", // LOZENGE
	'\u25CC': "$\\dottedcircle{}$", // DOTTED CIRCLE
	'\u25CD': "$\\circlevertfill{}$", // CIRCLE WITH VERTICAL FILL
	'\u25CE': "$\\bullseye{}$", // # \circledcirc (amssymb), BULLSEYE
	'\u25CF': "\\ding{108}", // BLACK CIRCLE
	'\u25D0': "$\\Elzcirfl{}$", // CIRCLE WITH LEFT HALF BLACK
	'\u25D1': "$\\Elzcirfr{}$", // CIRCLE WITH RIGHT HALF BLACK
	'\u25D2': "$\\Elzcirfb{}$", // CIRCLE WITH LOWER HALF BLACK
	'\u25D3': "$\\circletophalfblack{}$", // circle, filled top half
	'\u25D4': "$\\circleurquadblack{}$", // CIRCLE WITH UPPER RIGHT QUADRANT BLACK
	'\u25D5': "$\\blackcircleulquadwhite{}$", // CIRCLE WITH ALL BUT UPPER LEFT QUADRANT BLACK
	'\u25D6': "$\\LEFTCIRCLE{}$", // LEFT HALF BLACK CIRCLE
	'\u25D7': "\\ding{119}", // RIGHT HALF BLACK CIRCLE
	'\u25D8': "$\\Elzrvbull{}$", // INVERSE BULLET
	'\u25D9': "$\\inversewhitecircle{}$", // INVERSE WHITE CIRCLE
	'\u25DA': "$\\invwhiteupperhalfcircle{}$", // UPPER HALF INVERSE WHITE CIRCLE
	'\u25DB': "$\\invwhitelowerhalfcircle{}$", // LOWER HALF INVERSE WHITE CIRCLE
	'\u25DC': "$\\ularc{}$", // UPPER LEFT QUADRANT CIRCULAR ARC
	'\u25DD': "$\\urarc{}$", // UPPER RIGHT QUADRANT CIRCULAR ARC
	'\u25DE': "$\\lrarc{}$", // LOWER RIGHT QUADRANT CIRCULAR ARC
	'\u25DF': "$\\llarc{}$", // LOWER LEFT QUADRANT CIRCULAR ARC
	'\u25E0': "$\\topsemicircle{}$", // UPPER HALF CIRCLE
	'\u25E1': "$\\botsemicircle{}$", // LOWER HALF CIRCLE
	'\u25E2': "$\\lrblacktriangle{}$", // lower right triangle, filled
	'\u25E3': "$\\llblacktriangle{}$", // lower left triangle, filled
	'\u25E4': "$\\ulblacktriangle{}$", // upper left triangle, filled
	'\u25E5': "$\\urblacktriangle{}$", // upper right triangle, filled
	'\u25E7': "$\\Elzsqfl{}$", // SQUARE WITH LEFT HALF BLACK
	'\u25E8': "$\\Elzsqfr{}$", // SQUARE WITH RIGHT HALF BLACK
	'\u25E9': "$\\squareulblack{}$", // square, filled top left corner
	'\u25EA': "$\\Elzsqfse{}$", // SQUARE WITH LOWER RIGHT DIAGONAL HALF BLACK
	'\u25EB': "$\\boxbar{}$", // vertical bar in box
	'\u25EC': "$\\trianglecdot{}$", // triangle with centered dot
	'\u25ED': "$\\triangleleftblack{}$", // UP-POINTING TRIANGLE WITH LEFT HALF BLACK
	'\u25EE': "$\\trianglerightblack{}$", // UP-POINTING TRIANGLE WITH RIGHT HALF BLACK
	'\u25EF': "$\\bigcirc{}$", // LARGE CIRCLE
	'\u25F0': "$\\squareulquad{}$", // WHITE SQUARE WITH UPPER LEFT QUADRANT
	'\u25F1': "$\\squarellquad{}$", // WHITE SQUARE WITH LOWER LEFT QUADRANT
	'\u25F2': "$\\squarelrquad{}$", // WHITE SQUARE WITH LOWER RIGHT QUADRANT
	'\u25F3': "$\\squareurquad{}$", // WHITE SQUARE WITH UPPER RIGHT QUADRANT
	'\u25F4': "$\\circleulquad{}$", // WHITE CIRCLE WITH UPPER LEFT QUADRANT
	'\u25F5': "$\\circlellquad{}$", // WHITE CIRCLE WITH LOWER LEFT QUADRANT
	'\u25F6': "$\\circlelrquad{}$", // WHITE CIRCLE WITH LOWER RIGHT QUADRANT
	'\u25F7': "$\\circleurquad{}$", // WHITE CIRCLE WITH UPPER RIGHT QUADRANT
	'\u25F8': "$\\ultriangle{}$", // UPPER LEFT TRIANGLE
	'\u25F9': "$\\urtriangle{}$", // UPPER RIGHT TRIANGLE
	'\u25FA': "$\\lltriangle{}$", // LOWER LEFT TRIANGLE
	'\u25FB': "$\\square{}$", // WHITE MEDIUM SQUARE
	'\u25FC': "$\\blacksquare{}$", // BLACK MEDIUM SQUARE
	'\u25FD': "$\\mdsmwhtsquare{}$", // WHITE MEDIUM SMALL SQUARE
	'\u25FE': "$\\mdsmblksquare{}$", // BLACK MEDIUM SMALL SQUARE
	'\u25FF': "$\\lrtriangle{}$", // LOWER RIGHT TRIANGLE
	'\u2609': "$\\Sun{}$", // SUN
	'\u260E': "\\ding{37}", // BLACK TELEPHONE
	'\u2610': "$\\Square{}$", // BALLOT BOX
	'\u2611': "$\\CheckedBox{}$", // t \Checkedbox (marvosym), BALLOT BOX WITH CHECK
	'\u2615': "$\\steaming{}$", // HOT BEVERAGE
	'\u261B': "\\ding{42}", // BLACK RIGHT POINTING INDEX
	'\u261E': "\\ding{43}", // WHITE RIGHT POINTING INDEX
	'\u2620': "$\\skull{}$", // SKULL AND CROSSBONES
	'\u2621': "$\\danger{}$", // CAUTION SIGN, dangerous bend
	'\u2622': "$\\radiation{}$", // RADIOACTIVE SIGN
	'\u2623': "$\\biohazard{}$", // BIOHAZARD SIGN
	'\u262F': "$\\yinyang{}$", // YIN YANG
	'\u263C': "$\\sun{}$", // WHITE SUN WITH RAYS
	'\u263D': "$\\rightmoon{}$", // FIRST QUARTER MOON
	'\u263E': "\\rightmoon{}", // LAST QUARTER MOON
	'\u263F': "\\mercury{}", // MERCURY
	'\u2640': "\\venus{}", // FEMALE SIGN
	'\u2641': "$\\earth{}$", // = \varEarth (mathabx), EARTH
	'\u2642': "\\male{}", // MALE SIGN
	'\u2643': "\\jupiter{}", // JUPITER
	'\u2644': "\\saturn{}", // SATURN
	'\u2645': "\\uranus{}", // URANUS
	'\u2646': "\\neptune{}", // NEPTUNE
	'\u2647': "\\pluto{}", // PLUTO
	'\u2648': "\\aries{}", // ARIES
	'\u2649': "\\taurus{}", // TAURUS
	'\u264A': "\\gemini{}", // GEMINI
	'\u264B': "\\cancer{}", // CANCER
	'\u264C': "\\leo{}", // LEO
	'\u264D': "\\virgo{}", // VIRGO
	'\u264E': "\\libra{}", // LIBRA
	'\u264F': "\\scorpio{}", // SCORPIUS
	'\u2650': "\\sagittarius{}", // SAGITTARIUS
	'\u2651': "\\capricornus{}", // CAPRICORN
	'\u2652': "\\aquarius{}", // AQUARIUS
	'\u2653': "\\pisces{}", // PISCES
	'\u2660': "\\ding{171}", // BLACK SPADE SUIT
	'\u2661': "$\\heartsuit{}$", // heart suit symbol
	'\u2662': "$\\diamond{}$", // WHITE DIAMOND SUIT
	'\u2663': "\\ding{168}", // BLACK CLUB SUIT
	'\u2664': "$\\varspadesuit{}$", // = \varspade (arevmath), spade, white (card suit)
	'\u2665': "\\ding{170}", // BLACK HEART SUIT
	'\u2666': "\\ding{169}", // BLACK DIAMOND SUIT
	'\u2667': "$\\varclubsuit{}$", // = \varclub (arevmath), club, white (card suit)
	'\u2669': "\\quarternote{}", // QUARTER NOTE
	'\u266A': "\\eighthnote{}", // EIGHTH NOTE
	'\u266B': "$\\twonotes{}$", // BEAMED EIGHTH NOTES
	'\u266C': "$\\sixteenthnote{}$", // BEAMED SIXTEENTH NOTES
	'\u266E': "$\\natural{}$", // MUSIC NATURAL SIGN
	'\u267B': "$\\recycle{}$", // BLACK UNIVERSAL RECYCLING SYMBOL
	'\u267E': "$\\acidfree{}$", // PERMANENT PAPER SIGN
	'\u2680': "$\\dicei{}$", // DIE FACE-1
	'\u2681': "$\\diceii{}$", // DIE FACE-2
	'\u2682': "$\\diceiii{}$", // DIE FACE-3
	'\u2683': "$\\diceiv{}$", // DIE FACE-4
	'\u2684': "$\\dicev{}$", // DIE FACE-5
	'\u2685': "$\\dicevi{}$", // DIE FACE-6
	'\u2686': "$\\circledrightdot{}$", // WHITE CIRCLE WITH DOT RIGHT
	'\u2687': "$\\circledtwodots{}$", // WHITE CIRCLE WITH TWO DOTS
	'\u2688': "$\\blackcircledrightdot{}$", // BLACK CIRCLE WITH WHITE DOT RIGHT
	'\u2689': "$\\blackcircledtwodots{}$", // BLACK CIRCLE WITH TWO WHITE DOTS
	'\u2693': "$\\anchor{}$", // ANCHOR
	'\u2694': "$\\swords{}$", // CROSSED SWORDS
	'\u26A0': "$\\warning{}$", // WARNING SIGN
	'\u26A5': "$\\Hermaphrodite{}$", // MALE AND FEMALE SIGN
	'\u26AA': "$\\medcirc{}$", // MEDIUM WHITE CIRCLE
	'\u26AB': "$\\medbullet{}$", // MEDIUM BLACK CIRCLE
	'\u26AC': "$\\mdsmwhtcircle{}$", // MEDIUM SMALL WHITE CIRCLE
	'\u26B2': "$\\neuter{}$", // NEUTER
	'\u2706': "\\ding{38}", // TELEPHONE LOCATION SIGN
	'\u2707': "\\ding{39}", // TAPE DRIVE
	'\u2708': "\\ding{40}", // AIRPLANE
	'\u2709': "\\ding{41}", // ENVELOPE
	'\u270D': "\\ding{45}", // WRITING HAND
	'\u270E': "\\ding{46}", // LOWER RIGHT PENCIL
	'\u270F': "\\ding{47}", // PENCIL
	'\u2710': "\\ding{48}", // UPPER RIGHT PENCIL
	'\u2711': "\\ding{49}", // WHITE NIB
	'\u2712': "\\ding{50}", // BLACK NIB
	'\u274D': "\\ding{109}", // SHADOWED WHITE CIRCLE
	'\u274F': "\\ding{111}", // LOWER RIGHT DROP-SHADOWED WHITE SQUARE
	'\u2750': "\\ding{112}", // UPPER RIGHT DROP-SHADOWED WHITE SQUARE
	'\u2751': "\\ding{113}", // LOWER RIGHT SHADOWED WHITE SQUARE
	'\u2752': "\\ding{114}", // UPPER RIGHT SHADOWED WHITE SQUARE
	'\u2756': "\\ding{118}", // BLACK DIAMOND MINUS WHITE X
	'\u2758': "\\ding{120}", // LIGHT VERTICAL BAR
	'\u2759': "\\ding{121}", // MEDIUM VERTICAL BAR
	'\u275A': "\\ding{122}", // HEAVY VERTICAL BAR
	'\u275B': "\\ding{123}", // HEAVY SINGLE TURNED COMMA QUOTATION MARK ORNAMENT
	'\u275C': "\\ding{124}", // HEAVY SINGLE COMMA QUOTATION MARK ORNAMENT
	'\u275D': "\\ding{125}", // HEAVY DOUBLE TURNED COMMA QUOTATION MARK ORNAMENT
	'\u275E': "\\ding{126}", // HEAVY DOUBLE COMMA QUOTATION MARK ORNAMENT
	'\u2761': "\\ding{161}", // CURVED STEM PARAGRAPH SIGN ORNAMENT
	'\u2762': "\\ding{162}", // HEAVY EXCLAMATION MARK ORNAMENT
	'\u2763': "\\ding{163}", // HEAVY HEART EXCLAMATION MARK ORNAMENT
	'\u2764': "\\ding{164}", // HEAVY BLACK HEART
	'\u2765': "\\ding{165}", // ROTATED HEAVY BLACK HEART BULLET
	'\u2766': "\\ding{166}", // FLORAL HEART
	'\u2767': "\\ding{167}", // ROTATED FLORAL HEART BULLET
	'\u2772': "$\\lbrbrak{}$", // LIGHT LEFT TORTOISE SHELL BRACKET ORNAMENT
	'\u2773': "$\\rbrbrak{}$", // LIGHT RIGHT TORTOISE SHELL BRACKET ORNAMENT
	'\u2776': "\\ding{182}", // DINGBAT NEGATIVE CIRCLED DIGIT ONE
	'\u2777': "\\ding{183}", // DINGBAT NEGATIVE CIRCLED DIGIT TWO
	'\u2778': "\\ding{184}", // DINGBAT NEGATIVE CIRCLED DIGIT THREE
	'\u2779': "\\ding{185}", // DINGBAT NEGATIVE CIRCLED DIGIT FOUR
	'\u277A': "\\ding{186}", // DINGBAT NEGATIVE CIRCLED DIGIT FIVE
	'\u277B': "\\ding{187}", // DINGBAT NEGATIVE CIRCLED DIGIT SIX
	'\u277C': "\\ding{188}", // DINGBAT NEGATIVE CIRCLED DIGIT SEVEN
	'\u277D': "\\ding{189}", // DINGBAT NEGATIVE CIRCLED DIGIT EIGHT
	'\u277E': "\\ding{190}", // DINGBAT NEGATIVE CIRCLED DIGIT NINE
	'\u277F': "\\ding{191}", // DINGBAT NEGATIVE CIRCLED NUMBER TEN
	'\u2780': "\\ding{192}", // DINGBAT CIRCLED SANS-SERIF DIGIT ONE
	'\u2781': "\\ding{193}", // DINGBAT CIRCLED SANS-SERIF DIGIT TWO
	'\u2782': "\\ding{194}", // DINGBAT CIRCLED SANS-SERIF DIGIT THREE
	'\u2783': "\\ding{195}", // DINGBAT CIRCLED SANS-SERIF DIGIT FOUR
	'\u2784': "\\ding{196}", // DINGBAT CIRCLED SANS-SERIF DIGIT FIVE
	'\u2785': "\\ding{197}", // DINGBAT CIRCLED SANS-SERIF DIGIT SIX
	'\u2786': "\\ding{198}", // DINGBAT CIRCLED SANS-SERIF DIGIT SEVEN
	'\u2787': "\\ding{199}", // DINGBAT CIRCLED SANS-SERIF DIGIT EIGHT
	'\u2788': "\\ding{200}", // DINGBAT CIRCLED SANS-SERIF DIGIT NINE
	'\u2789': "\\ding{201}", // DINGBAT CIRCLED SANS-SERIF NUMBER TEN
	'\u278A': "\\ding{202}", // DINGBAT NEGATIVE CIRCLED SANS-SERIF DIGIT ONE
	'\u278B': "\\ding{203}", // DINGBAT NEGATIVE CIRCLED SANS-SERIF DIGIT TWO
	'\u278C': "\\ding{204}", // DINGBAT NEGATIVE CIRCLED SANS-SERIF DIGIT THREE
	'\u278D': "\\ding{205}", // DINGBAT NEGATIVE CIRCLED SANS-SERIF DIGIT FOUR
	'\u278E': "\\ding{206}", // DINGBAT NEGATIVE CIRCLED SANS-SERIF DIGIT FIVE
	'\u278F': "\\ding{207}", // DINGBAT NEGATIVE CIRCLED SANS-SERIF DIGIT SIX
	'\u2790': "\\ding{208}", // DINGBAT NEGATIVE CIRCLED SANS-SERIF DIGIT SEVEN
	'\u2791': "\\ding{209}", // DINGBAT NEGATIVE CIRCLED SANS-SERIF DIGIT EIGHT
	'\u2792': "\\ding{210}", // DINGBAT NEGATIVE CIRCLED SANS-SERIF DIGIT NINE
	'\u2793': "\\ding{211}", // DINGBAT NEGATIVE CIRCLED SANS-SERIF NUMBER TEN
	'\u2794': "\\ding{212}", // HEAVY WIDE-HEADED RIGHTWARDS ARROW
	'\u2798': "\\ding{216}", // HEAVY SOUTH EAST ARROW
	'\u2799': "\\ding{217}", // HEAVY RIGHTWARDS ARROW
	'\u279A': "\\ding{218}", // HEAVY NORTH EAST ARROW
	'\u279B': "\\ding{219}", // DRAFTING POINT RIGHTWARDS ARROW
	'\u279C': "\\ding{220}", // HEAVY ROUND-TIPPED RIGHTWARDS ARROW
	'\u279D': "\\ding{221}", // TRIANGLE-HEADED RIGHTWARDS ARROW
	'\u279E': "\\ding{222}", // HEAVY TRIANGLE-HEADED RIGHTWARDS ARROW
	'\u279F': "\\ding{223}", // DASHED TRIANGLE-HEADED RIGHTWARDS ARROW
	'\u27A0': "\\ding{224}", // HEAVY DASHED TRIANGLE-HEADED RIGHTWARDS ARROW
	'\u27A1': "\\ding{225}", // BLACK RIGHTWARDS ARROW
	'\u27A2': "\\ding{226}", // THREE-D TOP-LIGHTED RIGHTWARDS ARROWHEAD
	'\u27A3': "\\ding{227}", // THREE-D BOTTOM-LIGHTED RIGHTWARDS ARROWHEAD
	'\u27A4': "\\ding{228}", // BLACK RIGHTWARDS ARROWHEAD
	'\u27A5': "\\ding{229}", // HEAVY BLACK CURVED DOWNWARDS AND RIGHTWARDS ARROW
	'\u27A6': "\\ding{230}", // HEAVY BLACK CURVED UPWARDS AND RIGHTWARDS ARROW
	'\u27A7': "\\ding{231}", // SQUAT BLACK RIGHTWARDS ARROW
	'\u27A8': "\\ding{232}", // HEAVY CONCAVE-POINTED BLACK RIGHTWARDS ARROW
	'\u27A9': "\\ding{233}", // RIGHT-SHADED WHITE RIGHTWARDS ARROW
	'\u27AA': "\\ding{234}", // LEFT-SHADED WHITE RIGHTWARDS ARROW
	'\u27AB': "\\ding{235}", // BACK-TILTED SHADOWED WHITE RIGHTWARDS ARROW
	'\u27AC': "\\ding{236}", // FRONT-TILTED SHADOWED WHITE RIGHTWARDS ARROW
	'\u27AD': "\\ding{237}", // HEAVY LOWER RIGHT-SHADOWED WHITE RIGHTWARDS ARROW
	'\u27AE': "\\ding{238}", // HEAVY UPPER RIGHT-SHADOWED WHITE RIGHTWARDS ARROW
	'\u27AF': "\\ding{239}", // NOTCHED LOWER RIGHT-SHADOWED WHITE RIGHTWARDS ARROW
	'\u27B1': "\\ding{241}", // NOTCHED UPPER RIGHT-SHADOWED WHITE RIGHTWARDS ARROW
	'\u27B2': "\\ding{242}", // CIRCLED HEAVY WHITE RIGHTWARDS ARROW
	'\u27B3': "\\ding{243}", // WHITE-FEATHERED RIGHTWARDS ARROW
	'\u27B4': "\\ding{244}", // BLACK-FEATHERED SOUTH EAST ARROW
	'\u27B5': "\\ding{245}", // BLACK-FEATHERED RIGHTWARDS ARROW
	'\u27B6': "\\ding{246}", // BLACK-FEATHERED NORTH EAST ARROW
	'\u27B7': "\\ding{247}", // HEAVY BLACK-FEATHERED SOUTH EAST ARROW
	'\u27B8': "\\ding{248}", // HEAVY BLACK-FEATHERED RIGHTWARDS ARROW
	'\u27B9': "\\ding{249}", // HEAVY BLACK-FEATHERED NORTH EAST ARROW
	'\u27BA': "\\ding{250}", // TEARDROP-BARBED RIGHTWARDS ARROW
	'\u27BB': "\\ding{251}", // HEAVY TEARDROP-SHANKED RIGHTWARDS ARROW
	'\u27BC': "\\ding{252}", // WEDGE-TAILED RIGHTWARDS ARROW
	'\u27BD': "\\ding{253}", // HEAVY WEDGE-TAILED RIGHTWARDS ARROW
	'\u27BE': "\\ding{254}", // OPEN-OUTLINED RIGHTWARDS ARROW
	'\u27C0': "$\\threedangle{}$", // THREE DIMENSIONAL ANGLE
	'\u27C1': "$\\whiteinwhitetriangle{}$", // WHITE TRIANGLE CONTAINING SMALL WHITE TRIANGLE
	'\u27C2': "$\\perp{}$", // PERPENDICULAR
	'\u27C3': "$\\subsetcirc{}$", // OPEN SUBSET
	'\u27C4': "$\\supsetcirc{}$", // OPEN SUPERSET
	'\u27C5': "$\\Lbag{}$", // = \lbag (stmaryrd -oz), LEFT S-SHAPED BAG DELIMITER
	'\u27C6': "$\\Rbag{}$", // = \rbag (stmaryrd -oz), RIGHT S-SHAPED BAG DELIMITER
	'\u27C7': "$\\veedot{}$", // OR WITH DOT INSIDE
	'\u27C8': "$\\bsolhsub{}$", // REVERSE SOLIDUS PRECEDING SUBSET
	'\u27C9': "$\\suphsol{}$", // SUPERSET PRECEDING SOLIDUS
	'\u27CC': "$\\longdivision{}$", // LONG DIVISION
	'\u27D0': "$\\Diamonddot{}$", // WHITE DIAMOND WITH CENTRED DOT
	'\u27D1': "$\\wedgedot{}$", // AND WITH DOT
	'\u27D2': "$\\upin{}$", // ELEMENT OF OPENING UPWARDS
	'\u27D3': "$\\pullback{}$", // LOWER RIGHT CORNER WITH DOT
	'\u27D4': "$\\pushout{}$", // UPPER LEFT CORNER WITH DOT
	'\u27D5': "$\\leftouterjoin{}$", // LEFT OUTER JOIN
	'\u27D6': "$\\rightouterjoin{}$", // RIGHT OUTER JOIN
	'\u27D7': "$\\fullouterjoin{}$", // FULL OUTER JOIN
	'\u27D8': "$\\bigbot{}$", // LARGE UP TACK
	'\u27D9': "$\\bigtop{}$", // LARGE DOWN TACK
	'\u27DA': "$\\DashVDash{}$", // LEFT AND RIGHT DOUBLE TURNSTILE
	'\u27DB': "$\\dashVdash{}$", // LEFT AND RIGHT TACK
	'\u27DC': "$\\multimapinv{}$", // LEFT MULTIMAP
	'\u27DD': "$\\vlongdash{}$", // long left tack
	'\u27DE': "$\\longdashv{}$", // long right tack
	'\u27DF': "$\\cirbot{}$", // UP TACK WITH CIRCLE ABOVE
	'\u27E0': "$\\lozengeminus{}$", // LOZENGE DIVIDED BY HORIZONTAL RULE
	'\u27E1': "$\\concavediamond{}$", // WHITE CONCAVE-SIDED DIAMOND
	'\u27E2': "$\\concavediamondtickleft{}$", // WHITE CONCAVE-SIDED DIAMOND WITH LEFTWARDS TICK
	'\u27E3': "$\\concavediamondtickright{}$", // WHITE CONCAVE-SIDED DIAMOND WITH RIGHTWARDS TICK
	'\u27E4': "$\\whitesquaretickleft{}$", // WHITE SQUARE WITH LEFTWARDS TICK
	'\u27E5': "$\\whitesquaretickright{}$", // WHITE SQUARE WITH RIGHTWARDS TICK
	'\u27E6': "$\\llbracket{}$", // = \Lbrack (mathbbol), = \lbag (oz -stmaryrd), MATHEMATICAL LEFT WHITE SQUARE BRACKET
	'\u27E7': "$\\rrbracket{}$", // = \Rbrack (mathbbol), = \rbag (oz -stmaryrd), MATHEMATICAL RIGHT WHITE SQUARE BRACKET
	'\u27E8': "\\langle{}", // MATHEMATICAL LEFT ANGLE BRACKET
	'\u27E9': "\\rangle{}", // MATHEMATICAL RIGHT ANGLE BRACKET
	'\u27EA': "$\\lang{}$", // MATHEMATICAL LEFT DOUBLE ANGLE BRACKET, z notation left chevron bracket
	'\u27EB': "$\\rang{}$", // MATHEMATICAL RIGHT DOUBLE ANGLE BRACKET, z notation right chevron bracket
	'\u27EC': "$\\Lbrbrak{}$", // MATHEMATICAL LEFT WHITE TORTOISE SHELL BRACKET
	'\u27ED': "$\\Rbrbrak{}$", // MATHEMATICAL RIGHT WHITE TORTOISE SHELL BRACKET
	'\u27EE': "$\\lgroup{}$", // MATHEMATICAL LEFT FLATTENED PARENTHESIS
	'\u27EF': "$\\rgroup{}$", // MATHEMATICAL RIGHT FLATTENED PARENTHESIS
	'\u27F0': "$\\UUparrow{}$", // UPWARDS QUADRUPLE ARROW
	'\u27F1': "$\\DDownarrow{}$", // DOWNWARDS QUADRUPLE ARROW
	'\u27F2': "$\\acwgapcirclearrow{}$", // ANTICLOCKWISE GAPPED CIRCLE ARROW
	'\u27F3': "$\\cwgapcirclearrow{}$", // CLOCKWISE GAPPED CIRCLE ARROW
	'\u27F4': "$\\rightarrowonoplus{}$", // RIGHT ARROW WITH CIRCLED PLUS
	'\u27F5': "$\\longleftarrow{}$", // LONG LEFTWARDS ARROW
	'\u27F6': "$\\longrightarrow{}$", // LONG RIGHTWARDS ARROW
	'\u27F7': "$\\longleftrightarrow{}$", // LONG LEFT RIGHT ARROW
	'\u27F8': "$\\Longleftarrow{}$", // LONG LEFTWARDS DOUBLE ARROW
	'\u27F9': "$\\Longrightarrow{}$", // LONG RIGHTWARDS DOUBLE ARROW
	'\u27FA': "$\\Longleftrightarrow{}$", // LONG LEFT RIGHT DOUBLE ARROW
	'\u27FB': "$\\longmapsfrom{}$", // = \longmappedfrom (kpfonts), LONG LEFTWARDS ARROW FROM BAR
	'\u27FC': "$\\longmapsto{}$", // LONG RIGHTWARDS ARROW FROM BAR
	'\u27FD': "$\\Longmapsfrom{}$", // = \Longmappedfrom (kpfonts), LONG LEFTWARDS DOUBLE ARROW FROM BAR
	'\u27FE': "$\\Longmapsto{}$", // LONG RIGHTWARDS DOUBLE ARROW FROM BAR
	'\u27FF': "$\\sim\\joinrel\\leadsto{}$", // LONG RIGHTWARDS SQUIGGLE ARROW
	'\u2900': "$\\psur{}$", // = \psurj (oz), RIGHTWARDS TWO-HEADED ARROW WITH VERTICAL STROKE, z notation partial surjection
	'\u2901': "$\\nVtwoheadrightarrow{}$", // RIGHTWARDS TWO-HEADED ARROW WITH DOUBLE VERTICAL STROKE, z notation finite surjection
	'\u2902': "$\\nvLeftarrow{}$", // LEFTWARDS DOUBLE ARROW WITH VERTICAL STROKE
	'\u2903': "$\\nvRightarrow{}$", // RIGHTWARDS DOUBLE ARROW WITH VERTICAL STROKE
	'\u2904': "$\\nvLeftrightarrow{}$", // LEFT RIGHT DOUBLE ARROW WITH VERTICAL STROKE
	'\u2905': "$\\ElsevierGlyph{E212}$", // RIGHTWARDS TWO-HEADED ARROW FROM BAR
	'\u2906': "$\\Mapsfrom{}$", // = \Mappedfrom (kpfonts), LEFTWARDS DOUBLE ARROW FROM BAR
	'\u2907': "$\\Mapsto{}$", // RIGHTWARDS DOUBLE ARROW FROM BAR
	'\u2908': "$\\downarrowbarred{}$", // DOWNWARDS ARROW WITH HORIZONTAL STROKE
	'\u2909': "$\\uparrowbarred{}$", // UPWARDS ARROW WITH HORIZONTAL STROKE
	'\u290A': "$\\Uuparrow{}$", // UPWARDS TRIPLE ARROW
	'\u290B': "$\\Ddownarrow{}$", // DOWNWARDS TRIPLE ARROW
	'\u290C': "$\\leftbkarrow{}$", // LEFTWARDS DOUBLE DASH ARROW
	'\u290D': "$\\rightbkarrow{}$", // RIGHTWARDS DOUBLE DASH ARROW
	'\u290E': "$\\leftdbkarrow{}$", // LEFTWARDS TRIPLE DASH ARROW
	'\u290F': "$\\dbkarow{}$", // RIGHTWARDS TRIPLE DASH ARROW
	'\u2910': "$\\drbkarow{}$", // RIGHTWARDS TWO-HEADED TRIPLE DASH ARROW
	'\u2911': "$\\rightdotarrow{}$", // RIGHTWARDS ARROW WITH DOTTED STEM
	'\u2912': "$\\UpArrowBar{}$", // UPWARDS ARROW TO BAR
	'\u2913': "$\\DownArrowBar{}$", // DOWNWARDS ARROW TO BAR
	'\u2914': "$\\pinj{}$", // RIGHTWARDS ARROW WITH TAIL WITH VERTICAL STROKE, z notation partial injection
	'\u2915': "$\\finj{}$", // RIGHTWARDS ARROW WITH TAIL WITH DOUBLE VERTICAL STROKE, z notation finite injection
	'\u2916': "$\\bij{}$", // RIGHTWARDS TWO-HEADED ARROW WITH TAIL, z notation bijection
	'\u2917': "$\\nvtwoheadrightarrowtail{}$", // RIGHTWARDS TWO-HEADED ARROW WITH TAIL WITH VERTICAL STROKE, z notation surjective injection
	'\u2918': "$\\nVtwoheadrightarrowtail{}$", // RIGHTWARDS TWO-HEADED ARROW WITH TAIL WITH DOUBLE VERTICAL STROKE, z notation finite surjective injection
	'\u2919': "$\\lefttail{}$", // LEFTWARDS ARROW-TAIL
	'\u291A': "$\\righttail{}$", // RIGHTWARDS ARROW-TAIL
	'\u291B': "$\\leftdbltail{}$", // LEFTWARDS DOUBLE ARROW-TAIL
	'\u291C': "$\\rightdbltail{}$", // RIGHTWARDS DOUBLE ARROW-TAIL
	'\u291D': "$\\diamondleftarrow{}$", // LEFTWARDS ARROW TO BLACK DIAMOND
	'\u291E': "$\\rightarrowdiamond{}$", // RIGHTWARDS ARROW TO BLACK DIAMOND
	'\u291F': "$\\diamondleftarrowbar{}$", // LEFTWARDS ARROW FROM BAR TO BLACK DIAMOND
	'\u2920': "$\\barrightarrowdiamond{}$", // RIGHTWARDS ARROW FROM BAR TO BLACK DIAMOND
	'\u2921': "$\\nwsearrow{}$", // NORTH WEST AND SOUTH EAST ARROW
	'\u2922': "$\\neswarrow{}$", // NORTH EAST AND SOUTH WEST ARROW
	'\u2923': "$\\ElsevierGlyph{E20C}$", // NORTH WEST ARROW WITH HOOK
	'\u2924': "$\\ElsevierGlyph{E20D}$", // NORTH EAST ARROW WITH HOOK
	'\u2925': "$\\ElsevierGlyph{E20B}$", // SOUTH EAST ARROW WITH HOOK
	'\u2926': "$\\ElsevierGlyph{E20A}$", // SOUTH WEST ARROW WITH HOOK
	'\u2927': "$\\ElsevierGlyph{E211}$", // NORTH WEST ARROW AND NORTH EAST ARROW
	'\u2928': "$\\ElsevierGlyph{E20E}$", // NORTH EAST ARROW AND SOUTH EAST ARROW
	'\u2929': "$\\ElsevierGlyph{E20F}$", // SOUTH EAST ARROW AND SOUTH WEST ARROW
	'\u292A': "$\\ElsevierGlyph{E210}$", // SOUTH WEST ARROW AND NORTH WEST ARROW
	'\u292B': "$\\rdiagovfdiag{}$", // RISING DIAGONAL CROSSING FALLING DIAGONAL
	'\u292C': "$\\fdiagovrdiag{}$", // FALLING DIAGONAL CROSSING RISING DIAGONAL
	'\u292D': "$\\seovnearrow{}$", // SOUTH EAST ARROW CROSSING NORTH EAST ARROW
	'\u292E': "$\\neovsearrow{}$", // NORTH EAST ARROW CROSSING SOUTH EAST ARROW
	'\u292F': "$\\fdiagovnearrow{}$", // FALLING DIAGONAL CROSSING NORTH EAST ARROW
	'\u2930': "$\\rdiagovsearrow{}$", // RISING DIAGONAL CROSSING SOUTH EAST ARROW
	'\u2931': "$\\neovnwarrow{}$", // NORTH EAST ARROW CROSSING NORTH WEST ARROW
	'\u2932': "$\\nwovnearrow{}$", // NORTH WEST ARROW CROSSING NORTH EAST ARROW
	'\u2933': "$\\ElsevierGlyph{E21C}$", // WAVE ARROW POINTING DIRECTLY RIGHT
	'\u2934': "$\\uprightcurvearrow{}$", // ARROW POINTING RIGHTWARDS THEN CURVING UPWARDS
	'\u2935': "$\\downrightcurvedarrow{}$", // ARROW POINTING RIGHTWARDS THEN CURVING DOWNWARDS
	'\u2936': "$\\ElsevierGlyph{E21A}$", // ARROW POINTING DOWNWARDS THEN CURVING LEFTWARDS
	'\u2937': "$\\ElsevierGlyph{E219}$", // ARROW POINTING DOWNWARDS THEN CURVING RIGHTWARDS
	'\u2938': "$\\cwrightarcarrow{}$", // RIGHT-SIDE ARC CLOCKWISE ARROW
	'\u2939': "$\\acwleftarcarrow{}$", // LEFT-SIDE ARC ANTICLOCKWISE ARROW
	'\u293A': "$\\acwoverarcarrow{}$", // TOP ARC ANTICLOCKWISE ARROW
	'\u293B': "$\\acwunderarcarrow{}$", // BOTTOM ARC ANTICLOCKWISE ARROW
	'\u293C': "$\\curvearrowrightminus{}$", // TOP ARC CLOCKWISE ARROW WITH MINUS
	'\u293D': "$\\curvearrowleftplus{}$", // TOP ARC ANTICLOCKWISE ARROW WITH PLUS
	'\u293E': "$\\cwundercurvearrow{}$", // LOWER RIGHT SEMICIRCULAR CLOCKWISE ARROW
	'\u293F': "$\\ccwundercurvearrow{}$", // LOWER LEFT SEMICIRCULAR ANTICLOCKWISE ARROW
	'\u2940': "$\\Elolarr{}$", // ANTICLOCKWISE CLOSED CIRCLE ARROW
	'\u2941': "$\\Elorarr{}$", // CLOCKWISE CLOSED CIRCLE ARROW
	'\u2942': "$\\ElzRlarr{}$", // RIGHTWARDS ARROW ABOVE SHORT LEFTWARDS ARROW
	'\u2943': "$\\leftarrowshortrightarrow{}$", // LEFTWARDS ARROW ABOVE SHORT RIGHTWARDS ARROW
	'\u2944': "$\\ElzrLarr{}$", // SHORT RIGHTWARDS ARROW ABOVE LEFTWARDS ARROW
	'\u2945': "$\\rightarrowplus{}$", // RIGHTWARDS ARROW WITH PLUS BELOW
	'\u2946': "$\\leftarrowplus{}$", // LEFTWARDS ARROW WITH PLUS BELOW
	'\u2947': "$\\Elzrarrx{}$", // RIGHTWARDS ARROW THROUGH X
	'\u2948': "$\\leftrightarrowcircle{}$", // LEFT RIGHT ARROW THROUGH SMALL CIRCLE
	'\u2949': "$\\twoheaduparrowcircle{}$", // UPWARDS TWO-HEADED ARROW FROM SMALL CIRCLE
	'\u294A': "$\\leftrightharpoon{}$", // LEFT BARB UP RIGHT BARB DOWN HARPOON
	'\u294B': "$\\rightleftharpoon{}$", // LEFT BARB DOWN RIGHT BARB UP HARPOON
	'\u294C': "$\\updownharpoonrightleft{}$", // UP BARB RIGHT DOWN BARB LEFT HARPOON
	'\u294D': "$\\updownharpoonleftright{}$", // UP BARB LEFT DOWN BARB RIGHT HARPOON
	'\u294E': "$\\LeftRightVector{}$", // LEFT BARB UP RIGHT BARB UP HARPOON
	'\u294F': "$\\RightUpDownVector{}$", // UP BARB RIGHT DOWN BARB RIGHT HARPOON
	'\u2950': "$\\DownLeftRightVector{}$", // LEFT BARB DOWN RIGHT BARB DOWN HARPOON
	'\u2951': "$\\LeftUpDownVector{}$", // UP BARB LEFT DOWN BARB LEFT HARPOON
	'\u2952': "$\\LeftVectorBar{}$", // LEFTWARDS HARPOON WITH BARB UP TO BAR
	'\u2953': "$\\RightVectorBar{}$", // RIGHTWARDS HARPOON WITH BARB UP TO BAR
	'\u2954': "$\\RightUpVectorBar{}$", // UPWARDS HARPOON WITH BARB RIGHT TO BAR
	'\u2955': "$\\RightDownVectorBar{}$", // DOWNWARDS HARPOON WITH BARB RIGHT TO BAR
	'\u2956': "$\\DownLeftVectorBar{}$", // LEFTWARDS HARPOON WITH BARB DOWN TO BAR
	'\u2957': "$\\DownRightVectorBar{}$", // RIGHTWARDS HARPOON WITH BARB DOWN TO BAR
	'\u2958': "$\\LeftUpVectorBar{}$", // UPWARDS HARPOON WITH BARB LEFT TO BAR
	'\u2959': "$\\LeftDownVectorBar{}$", // DOWNWARDS HARPOON WITH BARB LEFT TO BAR
	'\u295A': "$\\LeftTeeVector{}$", // LEFTWARDS HARPOON WITH BARB UP FROM BAR
	'\u295B': "$\\RightTeeVector{}$", // RIGHTWARDS HARPOON WITH BARB UP FROM BAR
	'\u295C': "$\\RightUpTeeVector{}$", // UPWARDS HARPOON WITH BARB RIGHT FROM BAR
	'\u295D': "$\\RightDownTeeVector{}$", // DOWNWARDS HARPOON WITH BARB RIGHT FROM BAR
	'\u295E': "$\\DownLeftTeeVector{}$", // LEFTWARDS HARPOON WITH BARB DOWN FROM BAR
	'\u295F': "$\\DownRightTeeVector{}$", // RIGHTWARDS HARPOON WITH BARB DOWN FROM BAR
	'\u2960': "$\\LeftUpTeeVector{}$", // UPWARDS HARPOON WITH BARB LEFT FROM BAR
	'\u2961': "$\\LeftDownTeeVector{}$", // DOWNWARDS HARPOON WITH BARB LEFT FROM BAR
	'\u2962': "$\\leftleftharpoons{}$", // LEFTWARDS HARPOON WITH BARB UP ABOVE LEFTWARDS HARPOON WITH BARB DOWN
	'\u2963': "$\\upupharpoons{}$", // UPWARDS HARPOON WITH BARB LEFT BESIDE UPWARDS HARPOON WITH BARB RIGHT
	'\u2964': "$\\rightrightharpoons{}$", // RIGHTWARDS HARPOON WITH BARB UP ABOVE RIGHTWARDS HARPOON WITH BARB DOWN
	'\u2965': "$\\downdownharpoons{}$", // DOWNWARDS HARPOON WITH BARB LEFT BESIDE DOWNWARDS HARPOON WITH BARB RIGHT
	'\u2966': "$\\leftrightharpoonsup{}$", // LEFTWARDS HARPOON WITH BARB UP ABOVE RIGHTWARDS HARPOON WITH BARB UP
	'\u2967': "$\\leftrightharpoonsdown{}$", // LEFTWARDS HARPOON WITH BARB DOWN ABOVE RIGHTWARDS HARPOON WITH BARB DOWN
	'\u2968': "$\\rightleftharpoonsup{}$", // RIGHTWARDS HARPOON WITH BARB UP ABOVE LEFTWARDS HARPOON WITH BARB UP
	'\u2969': "$\\rightleftharpoonsdown{}$", // RIGHTWARDS HARPOON WITH BARB DOWN ABOVE LEFTWARDS HARPOON WITH BARB DOWN
	'\u296A': "$\\leftbarharpoon{}$", // LEFTWARDS HARPOON WITH BARB UP ABOVE LONG DASH
	'\u296B': "$\\barleftharpoon{}$", // LEFTWARDS HARPOON WITH BARB DOWN BELOW LONG DASH
	'\u296C': "$\\rightbarharpoon{}$", // RIGHTWARDS HARPOON WITH BARB UP ABOVE LONG DASH
	'\u296D': "$\\barrightharpoon{}$", // RIGHTWARDS HARPOON WITH BARB DOWN BELOW LONG DASH
	'\u296E': "$\\UpEquilibrium{}$", // UPWARDS HARPOON WITH BARB LEFT BESIDE DOWNWARDS HARPOON WITH BARB RIGHT
	'\u296F': "$\\ReverseUpEquilibrium{}$", // DOWNWARDS HARPOON WITH BARB LEFT BESIDE UPWARDS HARPOON WITH BARB RIGHT
	'\u2970': "$\\RoundImplies{}$", // RIGHT DOUBLE ARROW WITH ROUNDED HEAD
	'\u2971': "$\\equalrightarrow{}$", // EQUALS SIGN ABOVE RIGHTWARDS ARROW
	'\u2972': "$\\similarrightarrow{}$", // TILDE OPERATOR ABOVE RIGHTWARDS ARROW
	'\u2973': "$\\leftarrowsimilar{}$", // LEFTWARDS ARROW ABOVE TILDE OPERATOR
	'\u2974': "$\\rightarrowsimilar{}$", // RIGHTWARDS ARROW ABOVE TILDE OPERATOR
	'\u2975': "$\\rightarrowapprox{}$", // RIGHTWARDS ARROW ABOVE ALMOST EQUAL TO
	'\u2976': "$\\ltlarr{}$", // LESS-THAN ABOVE LEFTWARDS ARROW
	'\u2977': "$\\leftarrowless{}$", // LEFTWARDS ARROW THROUGH LESS-THAN
	'\u2978': "$\\gtrarr{}$", // GREATER-THAN ABOVE RIGHTWARDS ARROW
	'\u2979': "$\\subrarr{}$", // SUBSET ABOVE RIGHTWARDS ARROW
	'\u297A': "$\\leftarrowsubset{}$", // LEFTWARDS ARROW THROUGH SUBSET
	'\u297B': "$\\suplarr{}$", // SUPERSET ABOVE LEFTWARDS ARROW
	'\u297C': "$\\ElsevierGlyph{E214}$", // LEFT FISH TAIL
	'\u297D': "$\\ElsevierGlyph{E215}$", // RIGHT FISH TAIL
	'\u297E': "$\\upfishtail{}$", // UP FISH TAIL
	'\u297F': "$\\downfishtail{}$", // DOWN FISH TAIL
	'\u2980': "$\\Elztfnc{}$", // TRIPLE VERTICAL BAR DELIMITER
	'\u2981': "$\\spot{}$", // = \dot (oz), Z NOTATION SPOT
	'\u2982': "$\\typecolon{}$", // Z NOTATION TYPE COLON, (present in bbold font but no command)
	'\u2983': "$\\lBrace{}$", // LEFT WHITE CURLY BRACKET
	'\u2984': "$\\rBrace{}$", // RIGHT WHITE CURLY BRACKET
	'\u2985': "$\\ElsevierGlyph{3018}$", // LEFT WHITE PARENTHESIS
	'\u2986': "$\\Elroang{}$", // RIGHT WHITE PARENTHESIS
	'\u2987': "$\\limg{}$", // = \llparenthesis (stmaryrd), Z NOTATION LEFT IMAGE BRACKET
	'\u2988': "$\\rimg{}$", // = \rrparenthesis (stmaryrd), Z NOTATION RIGHT IMAGE BRACKET
	'\u2989': "$\\lblot{}$", // Z NOTATION LEFT BINDING BRACKET
	'\u298A': "$\\rblot{}$", // Z NOTATION RIGHT BINDING BRACKET
	'\u298B': "$\\lbrackubar{}$", // LEFT SQUARE BRACKET WITH UNDERBAR
	'\u298C': "$\\rbrackubar{}$", // RIGHT SQUARE BRACKET WITH UNDERBAR
	'\u298D': "$\\lbrackultick{}$", // LEFT SQUARE BRACKET WITH TICK IN TOP CORNER
	'\u298E': "$\\rbracklrtick{}$", // RIGHT SQUARE BRACKET WITH TICK IN BOTTOM CORNER
	'\u298F': "$\\lbracklltick{}$", // LEFT SQUARE BRACKET WITH TICK IN BOTTOM CORNER
	'\u2990': "$\\rbrackurtick{}$", // RIGHT SQUARE BRACKET WITH TICK IN TOP CORNER
	'\u2991': "$\\langledot{}$", // LEFT ANGLE BRACKET WITH DOT
	'\u2992': "$\\rangledot{}$", // RIGHT ANGLE BRACKET WITH DOT
	'\u2993': "$<\\kern-0.58em($", // LEFT ARC LESS-THAN BRACKET
	'\u2994': "$\\ElsevierGlyph{E291}$", // RIGHT ARC GREATER-THAN BRACKET
	'\u2995': "$\\Lparengtr{}$", // DOUBLE LEFT ARC GREATER-THAN BRACKET
	'\u2996': "$\\Rparenless{}$", // DOUBLE RIGHT ARC LESS-THAN BRACKET
	'\u2997': "$\\lblkbrbrak{}$", // LEFT BLACK TORTOISE SHELL BRACKET
	'\u2998': "$\\rblkbrbrak{}$", // RIGHT BLACK TORTOISE SHELL BRACKET
	'\u2999': "$\\Elzddfnc{}$", // DOTTED FENCE
	'\u299A': "$\\vzigzag{}$", // VERTICAL ZIGZAG LINE
	'\u299B': "$\\measuredangleleft{}$", // MEASURED ANGLE OPENING LEFT
	'\u299C': "$\\Angle{}$", // RIGHT ANGLE VARIANT WITH SQUARE
	'\u299D': "$\\rightanglemdot{}$", // MEASURED RIGHT ANGLE WITH DOT
	'\u299E': "$\\angles{}$", // ANGLE WITH S INSIDE
	'\u299F': "$\\angdnr{}$", // ACUTE ANGLE
	'\u29A0': "$\\Elzlpargt{}$", // SPHERICAL ANGLE OPENING LEFT
	'\u29A1': "$\\sphericalangleup{}$", // SPHERICAL ANGLE OPENING UP
	'\u29A2': "$\\turnangle{}$", // TURNED ANGLE
	'\u29A3': "$\\revangle{}$", // REVERSED ANGLE
	'\u29A4': "$\\angleubar{}$", // ANGLE WITH UNDERBAR
	'\u29A5': "$\\revangleubar{}$", // REVERSED ANGLE WITH UNDERBAR
	'\u29A6': "$\\wideangledown{}$", // OBLIQUE ANGLE OPENING UP
	'\u29A7': "$\\wideangleup{}$", // OBLIQUE ANGLE OPENING DOWN
	'\u29A8': "$\\measanglerutone{}$", // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING UP AND RIGHT
	'\u29A9': "$\\measanglelutonw{}$", // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING UP AND LEFT
	'\u29AA': "$\\measanglerdtose{}$", // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING DOWN AND RIGHT
	'\u29AB': "$\\measangleldtosw{}$", // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING DOWN AND LEFT
	'\u29AC': "$\\measangleurtone{}$", // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING RIGHT AND UP
	'\u29AD': "$\\measangleultonw{}$", // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING LEFT AND UP
	'\u29AE': "$\\measangledrtose{}$", // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING RIGHT AND DOWN
	'\u29AF': "$\\measangledltosw{}$", // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING LEFT AND DOWN
	'\u29B0': "$\\revemptyset{}$", // REVERSED EMPTY SET
	'\u29B1': "$\\emptysetobar{}$", // EMPTY SET WITH OVERBAR
	'\u29B2': "$\\emptysetocirc{}$", // EMPTY SET WITH SMALL CIRCLE ABOVE
	'\u29B3': "$\\emptysetoarr{}$", // EMPTY SET WITH RIGHT ARROW ABOVE
	'\u29B4': "$\\emptysetoarrl{}$", // EMPTY SET WITH LEFT ARROW ABOVE
	'\u29B5': "$\\ElsevierGlyph{E260}$", // CIRCLE WITH HORIZONTAL BAR
	'\u29B6': "$\\ElsevierGlyph{E61B}$", // CIRCLED VERTICAL BAR
	'\u29B7': "$\\circledparallel{}$", // CIRCLED PARALLEL
	'\u29B8': "$\\circledbslash{}$", // CIRCLED REVERSE SOLIDUS
	'\u29B9': "$\\operp{}$", // CIRCLED PERPENDICULAR
	'\u29BA': "$\\obot{}$", // CIRCLE DIVIDED BY HORIZONTAL BAR AND TOP HALF DIVIDED BY VERTICAL BAR
	'\u29BB': "$\\olcross{}$", // CIRCLE WITH SUPERIMPOSED X
	'\u29BC': "$\\odotslashdot{}$", // CIRCLED ANTICLOCKWISE-ROTATED DIVISION SIGN
	'\u29BD': "$\\uparrowoncircle{}$", // UP ARROW THROUGH CIRCLE
	'\u29BE': "$\\circledwhitebullet{}$", // CIRCLED WHITE BULLET
	'\u29BF': "$\\circledbullet{}$", // CIRCLED BULLET
	'\u29C0': "$\\circledless{}$", // CIRCLED LESS-THAN
	'\u29C1': "$\\circledgtr{}$", // CIRCLED GREATER-THAN
	'\u29C2': "$\\cirscir{}$", // CIRCLE WITH SMALL CIRCLE TO THE RIGHT
	'\u29C3': "$\\cirE{}$", // CIRCLE WITH TWO HORIZONTAL STROKES TO THE RIGHT
	'\u29C4': "$\\boxslash{}$", // SQUARED RISING DIAGONAL SLASH
	'\u29C5': "$\\boxbslash{}$", // SQUARED FALLING DIAGONAL SLASH
	'\u29C6': "$\\boxast{}$", // SQUARED ASTERISK
	'\u29C7': "$\\boxcircle{}$", // SQUARED SMALL CIRCLE
	'\u29C8': "$\\boxbox{}$", // SQUARED SQUARE
	'\u29C9': "$\\boxonbox{}$", // TWO JOINED SQUARES
	'\u29CA': "$\\ElzLap{}$", // TRIANGLE WITH DOT ABOVE
	'\u29CB': "$\\Elzdefas{}$", // TRIANGLE WITH UNDERBAR
	'\u29CC': "$\\triangles{}$", // S IN TRIANGLE
	'\u29CD': "$\\triangleserifs{}$", // TRIANGLE WITH SERIFS AT BOTTOM
	'\u29CE': "$\\rtriltri{}$", // RIGHT TRIANGLE ABOVE LEFT TRIANGLE
	'\u29CF': "$\\LeftTriangleBar{}$", // LEFT TRIANGLE BESIDE VERTICAL BAR
	'\u29D0': "$\\RightTriangleBar{}$", // VERTICAL BAR BESIDE RIGHT TRIANGLE
	'\u29D1': "$\\lfbowtie{}$", // left black bowtie
	'\u29D2': "$\\rfbowtie{}$", // right black bowtie
	'\u29D3': "$\\fbowtie{}$", // BLACK BOWTIE
	'\u29D4': "$\\lftimes{}$", // left black times
	'\u29D5': "$\\rftimes{}$", // right black times
	'\u29D6': "$\\hourglass{}$", // WHITE HOURGLASS
	'\u29D7': "$\\blackhourglass{}$", // BLACK HOURGLASS
	'\u29D8': "$\\lvzigzag{}$", // LEFT WIGGLY FENCE
	'\u29D9': "$\\rvzigzag{}$", // RIGHT WIGGLY FENCE
	'\u29DA': "$\\Lvzigzag{}$", // LEFT DOUBLE WIGGLY FENCE
	'\u29DB': "$\\Rvzigzag{}$", // RIGHT DOUBLE WIGGLY FENCE
	'\u29DC': "$\\ElsevierGlyph{E372}$", // INCOMPLETE INFINITY
	'\u29DD': "$\\tieinfty{}$", // TIE OVER INFINITY
	'\u29DE': "$\\nvinfty{}$", // INFINITY NEGATED WITH VERTICAL BAR
	'\u29DF': "$\\multimapboth{}$", // DOUBLE-ENDED MULTIMAP
	'\u29E0': "$\\laplac{}$", // SQUARE WITH CONTOURED OUTLINE
	'\u29E1': "$\\lrtriangleeq{}$", // INCREASES AS
	'\u29E2': "$\\shuffle{}$", // SHUFFLE PRODUCT
	'\u29E3': "$\\eparsl{}$", // EQUALS SIGN AND SLANTED PARALLEL
	'\u29E4': "$\\smeparsl{}$", // EQUALS SIGN AND SLANTED PARALLEL WITH TILDE ABOVE
	'\u29E5': "$\\eqvparsl{}$", // IDENTICAL TO AND SLANTED PARALLEL
	'\u29E6': "$\\gleichstark{}$", // GLEICH STARK
	'\u29E7': "$\\thermod{}$", // THERMODYNAMIC
	'\u29E8': "$\\downtriangleleftblack{}$", // DOWN-POINTING TRIANGLE WITH LEFT HALF BLACK
	'\u29E9': "$\\downtrianglerightblack{}$", // DOWN-POINTING TRIANGLE WITH RIGHT HALF BLACK
	'\u29EA': "$\\blackdiamonddownarrow{}$", // BLACK DIAMOND WITH DOWN ARROW
	'\u29EB': "$\\blacklozenge{}$", // BLACK LOZENGE
	'\u29EC': "$\\circledownarrow{}$", // WHITE CIRCLE WITH DOWN ARROW
	'\u29ED': "$\\blackcircledownarrow{}$", // BLACK CIRCLE WITH DOWN ARROW
	'\u29EE': "$\\errbarsquare{}$", // ERROR-BARRED WHITE SQUARE
	'\u29EF': "$\\errbarblacksquare{}$", // ERROR-BARRED BLACK SQUARE
	'\u29F0': "$\\errbardiamond{}$", // ERROR-BARRED WHITE DIAMOND
	'\u29F1': "$\\errbarblackdiamond{}$", // ERROR-BARRED BLACK DIAMOND
	'\u29F2': "$\\errbarcircle{}$", // ERROR-BARRED WHITE CIRCLE
	'\u29F3': "$\\errbarblackcircle{}$", // ERROR-BARRED BLACK CIRCLE
	'\u29F4': "$\\RuleDelayed{}$", // RULE-DELAYED
	'\u29F5': "$\\setminus{}$", // REVERSE SOLIDUS OPERATOR
	'\u29F6': "$\\dsol{}$", // SOLIDUS WITH OVERBAR
	'\u29F7': "$\\rsolbar{}$", // REVERSE SOLIDUS WITH HORIZONTAL STROKE
	'\u29F8': "$\\xsol{}$", // BIG SOLIDUS
	'\u29F9': "$\\zhide{}$", // = \hide (oz), BIG REVERSE SOLIDUS, z notation schema hiding
	'\u29FA': "$\\doubleplus{}$", // DOUBLE PLUS
	'\u29FB': "$\\tripleplus{}$", // TRIPLE PLUS
	'\u29FC': "$\\lcurvyangle{}$", // left pointing curved angle bracket
	'\u29FD': "$\\rcurvyangle{}$", // right pointing curved angle bracket
	'\u29FE': "$\\tplus{}$", // TINY
	'\u29FF': "$\\tminus{}$", // MINY
	'\u2A00': "$\\bigodot{}$", // N-ARY CIRCLED DOT OPERATOR
	'\u2A01': "$\\bigoplus{}$", // N-ARY CIRCLED PLUS OPERATOR
	'\u2A02': "$\\bigotimes{}$", // N-ARY CIRCLED TIMES OPERATOR
	'\u2A03': "$\\bigcupdot{}$", // N-ARY UNION OPERATOR WITH DOT
	'\u2A04': "$\\Elxuplus{}$", // N-ARY UNION OPERATOR WITH PLUS
	'\u2A05': "$\\ElzThr{}$", // N-ARY SQUARE INTERSECTION OPERATOR
	'\u2A06': "$\\Elxsqcup{}$", // N-ARY SQUARE UNION OPERATOR
	'\u2A07': "$\\ElzInf{}$", // TWO LOGICAL AND OPERATOR
	'\u2A08': "$\\ElzSup{}$", // TWO LOGICAL OR OPERATOR
	'\u2A09': "$\\varprod{}$", // N-ARY TIMES OPERATOR
	'\u2A0A': "$\\modtwosum{}$", // MODULO TWO SUM
	'\u2A0B': "$\\sumint{}$", // SUMMATION WITH INTEGRAL
	'\u2A0C': "$\\iiiint{}$", // QUADRUPLE INTEGRAL OPERATOR
	'\u2A0D': "$\\ElzCint{}$", // FINITE PART INTEGRAL
	'\u2A0E': "$\\intBar{}$", // INTEGRAL WITH DOUBLE STROKE
	'\u2A0F': "$\\clockoint{}$", // INTEGRAL AVERAGE WITH SLASH
	'\u2A10': "$\\ElsevierGlyph{E395}$", // CIRCULATION FUNCTION
	'\u2A11': "$\\awint{}$", // ANTICLOCKWISE INTEGRATION
	'\u2A12': "$\\rppolint{}$", // LINE INTEGRATION WITH RECTANGULAR PATH AROUND POLE
	'\u2A13': "$\\scpolint{}$", // LINE INTEGRATION WITH SEMICIRCULAR PATH AROUND POLE
	'\u2A14': "$\\npolint{}$", // LINE INTEGRATION NOT INCLUDING THE POLE
	'\u2A15': "$\\pointint{}$", // INTEGRAL AROUND A POINT OPERATOR
	'\u2A16': "$\\sqrint{}$", // QUATERNION INTEGRAL OPERATOR
	'\u2A17': "$\\intlarhk{}$", // INTEGRAL WITH LEFTWARDS ARROW WITH HOOK
	'\u2A18': "$\\intx{}$", // INTEGRAL WITH TIMES SIGN
	'\u2A19': "$\\intcap{}$", // INTEGRAL WITH INTERSECTION
	'\u2A1A': "$\\intcup{}$", // INTEGRAL WITH UNION
	'\u2A1B': "$\\upint{}$", // INTEGRAL WITH OVERBAR
	'\u2A1C': "$\\lowint{}$", // INTEGRAL WITH UNDERBAR
	'\u2A1D': "$\\Join{}$", // JOIN
	'\u2A1E': "$\\bigtriangleleft{}$", // LARGE LEFT TRIANGLE OPERATOR
	'\u2A1F': "$\\zcmp{}$", // = \semi (oz), = \fatsemi (stmaryrd), Z NOTATION SCHEMA COMPOSITION
	'\u2A20': "$\\zpipe{}$", // Z NOTATION SCHEMA PIPING
	'\u2A21': "$\\zproject{}$", // = \project (oz), Z NOTATION SCHEMA PROJECTION
	'\u2A22': "$\\ringplus{}$", // PLUS SIGN WITH SMALL CIRCLE ABOVE
	'\u2A23': "$\\plushat{}$", // PLUS SIGN WITH CIRCUMFLEX ACCENT ABOVE
	'\u2A24': "$\\simplus{}$", // PLUS SIGN WITH TILDE ABOVE
	'\u2A25': "$\\ElsevierGlyph{E25A}$", // PLUS SIGN WITH DOT BELOW
	'\u2A26': "$\\plussim{}$", // PLUS SIGN WITH TILDE BELOW
	'\u2A27': "$\\plussubtwo{}$", // PLUS SIGN WITH SUBSCRIPT TWO
	'\u2A28': "$\\plustrif{}$", // PLUS SIGN WITH BLACK TRIANGLE
	'\u2A29': "$\\commaminus{}$", // MINUS SIGN WITH COMMA ABOVE
	'\u2A2A': "$\\ElsevierGlyph{E25B}$", // MINUS SIGN WITH DOT BELOW
	'\u2A2B': "$\\minusfdots{}$", // MINUS SIGN WITH FALLING DOTS
	'\u2A2C': "$\\minusrdots{}$", // MINUS SIGN WITH RISING DOTS
	'\u2A2D': "$\\ElsevierGlyph{E25C}$", // PLUS SIGN IN LEFT HALF CIRCLE
	'\u2A2E': "$\\ElsevierGlyph{E25D}$", // PLUS SIGN IN RIGHT HALF CIRCLE
	'\u2A2F': "$\\ElzTimes{}$", // VECTOR OR CROSS PRODUCT
	'\u2A30': "$\\dottimes{}$", // MULTIPLICATION SIGN WITH DOT ABOVE
	'\u2A31': "$\\timesbar{}$", // MULTIPLICATION SIGN WITH UNDERBAR
	'\u2A32': "$\\btimes{}$", // SEMIDIRECT PRODUCT WITH BOTTOM CLOSED
	'\u2A33': "$\\smashtimes{}$", // SMASH PRODUCT
	'\u2A34': "$\\ElsevierGlyph{E25E}$", // MULTIPLICATION SIGN IN LEFT HALF CIRCLE
	'\u2A35': "$\\ElsevierGlyph{E25E}$", // MULTIPLICATION SIGN IN RIGHT HALF CIRCLE
	'\u2A36': "$\\otimeshat{}$", // CIRCLED MULTIPLICATION SIGN WITH CIRCUMFLEX ACCENT
	'\u2A37': "$\\Otimes{}$", // MULTIPLICATION SIGN IN DOUBLE CIRCLE
	'\u2A38': "$\\odiv{}$", // CIRCLED DIVISION SIGN
	'\u2A39': "$\\triangleplus{}$", // PLUS SIGN IN TRIANGLE
	'\u2A3A': "$\\triangleminus{}$", // MINUS SIGN IN TRIANGLE
	'\u2A3B': "$\\triangletimes{}$", // MULTIPLICATION SIGN IN TRIANGLE
	'\u2A3C': "$\\ElsevierGlyph{E259}$", // INTERIOR PRODUCT
	'\u2A3D': "$\\intprodr{}$", // RIGHTHAND INTERIOR PRODUCT
	'\u2A3E': "$\\fcmp{}$", // = \comp (oz), Z NOTATION RELATIONAL COMPOSITION
	'\u2A3F': "$\\amalg{}$", // AMALGAMATION OR COPRODUCT
	'\u2A40': "$\\capdot{}$", // INTERSECTION WITH DOT
	'\u2A41': "$\\uminus{}$", // UNION WITH MINUS SIGN, z notation bag subtraction
	'\u2A42': "$\\barcup{}$", // UNION WITH OVERBAR
	'\u2A43': "$\\barcap{}$", // INTERSECTION WITH OVERBAR
	'\u2A44': "$\\capwedge{}$", // INTERSECTION WITH LOGICAL AND
	'\u2A45': "$\\cupvee{}$", // UNION WITH LOGICAL OR
	'\u2A46': "$\\cupovercap{}$", // UNION ABOVE INTERSECTION
	'\u2A47': "$\\capovercup{}$", // INTERSECTION ABOVE UNION
	'\u2A48': "$\\cupbarcap{}$", // UNION ABOVE BAR ABOVE INTERSECTION
	'\u2A49': "$\\capbarcup{}$", // INTERSECTION ABOVE BAR ABOVE UNION
	'\u2A4A': "$\\twocups{}$", // UNION BESIDE AND JOINED WITH UNION
	'\u2A4B': "$\\twocaps{}$", // INTERSECTION BESIDE AND JOINED WITH INTERSECTION
	'\u2A4C': "$\\closedvarcup{}$", // CLOSED UNION WITH SERIFS
	'\u2A4D': "$\\closedvarcap{}$", // CLOSED INTERSECTION WITH SERIFS
	'\u2A4E': "$\\Sqcap{}$", // DOUBLE SQUARE INTERSECTION
	'\u2A4F': "$\\Sqcup{}$", // DOUBLE SQUARE UNION
	'\u2A50': "$\\closedvarcupsmashprod{}$", // CLOSED UNION WITH SERIFS AND SMASH PRODUCT
	'\u2A51': "$\\wedgeodot{}$", // LOGICAL AND WITH DOT ABOVE
	'\u2A52': "$\\veeodot{}$", // LOGICAL OR WITH DOT ABOVE
	'\u2A53': "$\\ElzAnd{}$", // DOUBLE LOGICAL AND
	'\u2A54': "$\\ElzOr{}$", // DOUBLE LOGICAL OR
	'\u2A55': "$\\ElsevierGlyph{E36E}$", // TWO INTERSECTING LOGICAL AND
	'\u2A56': "$\\ElOr{}$", // TWO INTERSECTING LOGICAL OR
	'\u2A57': "$\\bigslopedvee{}$", // SLOPING LARGE OR
	'\u2A58': "$\\bigslopedwedge{}$", // SLOPING LARGE AND
	'\u2A59': "$\\veeonwedge{}$", // LOGICAL OR OVERLAPPING LOGICAL AND
	'\u2A5A': "$\\wedgemidvert{}$", // LOGICAL AND WITH MIDDLE STEM
	'\u2A5B': "$\\veemidvert{}$", // LOGICAL OR WITH MIDDLE STEM
	'\u2A5C': "$\\midbarwedge{}$", // ogical and with horizontal dash
	'\u2A5D': "$\\midbarvee{}$", // LOGICAL OR WITH HORIZONTAL DASH
	'\u2A5E': "$\\perspcorrespond{}$", // LOGICAL AND WITH DOUBLE OVERBAR
	'\u2A5F': "$\\Elzminhat{}$", // LOGICAL AND WITH UNDERBAR
	'\u2A60': "$\\wedgedoublebar{}$", // LOGICAL AND WITH DOUBLE UNDERBAR
	'\u2A61': "$\\varveebar{}$", // SMALL VEE WITH UNDERBAR
	'\u2A62': "$\\doublebarvee{}$", // LOGICAL OR WITH DOUBLE OVERBAR
	'\u2A63': "$\\ElsevierGlyph{225A}$", // LOGICAL OR WITH DOUBLE UNDERBAR
	'\u2A64': "$\\dsub{}$", // = \ndres (oz), Z NOTATION DOMAIN ANTIRESTRICTION
	'\u2A65': "$\\rsub{}$", // = \nrres (oz), Z NOTATION RANGE ANTIRESTRICTION
	'\u2A66': "$\\eqdot{}$", // EQUALS SIGN WITH DOT BELOW
	'\u2A67': "$\\dotequiv{}$", // IDENTICAL WITH DOT ABOVE
	'\u2A68': "$\\equivVert{}$", // TRIPLE HORIZONTAL BAR WITH DOUBLE VERTICAL STROKE
	'\u2A69': "$\\equivVvert{}$", // TRIPLE HORIZONTAL BAR WITH TRIPLE VERTICAL STROKE
	'\u2A6A': "$\\dotsim{}$", // TILDE OPERATOR WITH DOT ABOVE
	'\u2A6B': "$\\simrdots{}$", // TILDE OPERATOR WITH RISING DOTS
	'\u2A6C': "$\\simminussim{}$", // SIMILAR MINUS SIMILAR
	'\u2A6D': "$\\congdot{}$", // CONGRUENT WITH DOT ABOVE
	'\u2A6E': "$\\stackrel{*}{=}$", // EQUALS WITH ASTERISK
	'\u2A6F': "$\\hatapprox{}$", // ALMOST EQUAL TO WITH CIRCUMFLEX ACCENT
	'\u2A70': "$\\approxeqq{}$", // APPROXIMATELY EQUAL OR EQUAL TO
	'\u2A71': "$\\eqqplus{}$", // EQUALS SIGN ABOVE PLUS SIGN
	'\u2A72': "$\\pluseqq{}$", // PLUS SIGN ABOVE EQUALS SIGN
	'\u2A73': "$\\eqqsim{}$", // EQUALS SIGN ABOVE TILDE OPERATOR
	'\u2A74': "$\\Coloneqq{}$", // # ::=, x \Coloneq (txfonts), DOUBLE COLON EQUAL
	'\u2A75': "$\\Equal{}$", // TWO CONSECUTIVE EQUALS SIGNS
	'\u2A76': "$\\Same{}$", // # ===, THREE CONSECUTIVE EQUALS SIGNS
	'\u2A77': "$\\ddotseq{}$", // EQUALS SIGN WITH TWO DOTS ABOVE AND TWO DOTS BELOW
	'\u2A78': "$\\equivDD{}$", // EQUIVALENT WITH FOUR DOTS ABOVE
	'\u2A79': "$\\ltcir{}$", // LESS-THAN WITH CIRCLE INSIDE
	'\u2A7A': "$\\gtcir{}$", // GREATER-THAN WITH CIRCLE INSIDE
	'\u2A7B': "$\\ltquest{}$", // LESS-THAN WITH QUESTION MARK ABOVE
	'\u2A7C': "$\\gtquest{}$", // GREATER-THAN WITH QUESTION MARK ABOVE
	'\u2A7D': "$\\leqslant{}$", // LESS-THAN OR SLANTED EQUAL TO
	'\u2A7E': "$\\geqslant{}$", // GREATER-THAN OR SLANTED EQUAL TO
	'\u2A7F': "$\\lesdot{}$", // LESS-THAN OR SLANTED EQUAL TO WITH DOT INSIDE
	'\u2A80': "$\\gesdot{}$", // GREATER-THAN OR SLANTED EQUAL TO WITH DOT INSIDE
	'\u2A81': "$\\lesdoto{}$", // LESS-THAN OR SLANTED EQUAL TO WITH DOT ABOVE
	'\u2A82': "$\\gesdoto{}$", // GREATER-THAN OR SLANTED EQUAL TO WITH DOT ABOVE
	'\u2A83': "$\\lesdotor{}$", // LESS-THAN OR SLANTED EQUAL TO WITH DOT ABOVE RIGHT
	'\u2A84': "$\\gesdotol{}$", // GREATER-THAN OR SLANTED EQUAL TO WITH DOT ABOVE LEFT
	'\u2A85': "$\\lessapprox{}$", // LESS-THAN OR APPROXIMATE
	'\u2A86': "$\\gtrapprox{}$", // GREATER-THAN OR APPROXIMATE
	'\u2A87': "$\\lneq{}$", // LESS-THAN AND SINGLE-LINE NOT EQUAL TO
	'\u2A88': "$\\gneq{}$", // GREATER-THAN AND SINGLE-LINE NOT EQUAL TO
	'\u2A89': "$\\lnapprox{}$", // LESS-THAN AND NOT APPROXIMATE
	'\u2A8A': "$\\gnapprox{}$", // GREATER-THAN AND NOT APPROXIMATE
	'\u2A8B': "$\\lesseqqgtr{}$", // LESS-THAN ABOVE DOUBLE-LINE EQUAL ABOVE GREATER-THAN
	'\u2A8C': "$\\gtreqqless{}$", // GREATER-THAN ABOVE DOUBLE-LINE EQUAL ABOVE LESS-THAN
	'\u2A8D': "$\\lsime{}$", // LESS-THAN ABOVE SIMILAR OR EQUAL
	'\u2A8E': "$\\gsime{}$", // GREATER-THAN ABOVE SIMILAR OR EQUAL
	'\u2A8F': "$\\lsimg{}$", // LESS-THAN ABOVE SIMILAR ABOVE GREATER-THAN
	'\u2A90': "$\\gsiml{}$", // GREATER-THAN ABOVE SIMILAR ABOVE LESS-THAN
	'\u2A91': "$\\lgE{}$", // LESS-THAN ABOVE GREATER-THAN ABOVE DOUBLE-LINE EQUAL
	'\u2A92': "$\\glE{}$", // GREATER-THAN ABOVE LESS-THAN ABOVE DOUBLE-LINE EQUAL
	'\u2A93': "$\\lesges{}$", // LESS-THAN ABOVE SLANTED EQUAL ABOVE GREATER-THAN ABOVE SLANTED EQUAL
	'\u2A94': "$\\gesles{}$", // GREATER-THAN ABOVE SLANTED EQUAL ABOVE LESS-THAN ABOVE SLANTED EQUAL
	'\u2A95': "$\\eqslantless{}$", // SLANTED EQUAL TO OR LESS-THAN
	'\u2A96': "$\\eqslantgtr{}$", // SLANTED EQUAL TO OR GREATER-THAN
	'\u2A97': "$\\elsdot{}$", // SLANTED EQUAL TO OR LESS-THAN WITH DOT INSIDE
	'\u2A98': "$\\egsdot{}$", // SLANTED EQUAL TO OR GREATER-THAN WITH DOT INSIDE
	'\u2A99': "$\\eqqless{}$", // DOUBLE-LINE EQUAL TO OR LESS-THAN
	'\u2A9A': "$\\eqqgtr{}$", // DOUBLE-LINE EQUAL TO OR GREATER-THAN
	'\u2A9B': "$\\eqqslantless{}$", // DOUBLE-LINE SLANTED EQUAL TO OR LESS-THAN
	'\u2A9C': "$\\eqqslantgtr{}$", // DOUBLE-LINE SLANTED EQUAL TO OR GREATER-THAN
	'\u2A9D': "$\\Pisymbol{ppi020}{117}$", // SIMILAR OR LESS-THAN
	'\u2A9E': "$\\Pisymbol{ppi020}{105}$", // SIMILAR OR GREATER-THAN
	'\u2A9F': "$\\simlE{}$", // SIMILAR ABOVE LESS-THAN ABOVE EQUALS SIGN
	'\u2AA0': "$\\simgE{}$", // SIMILAR ABOVE GREATER-THAN ABOVE EQUALS SIGN
	'\u2AA1': "$\\NestedLessLess{}$", // DOUBLE NESTED LESS-THAN
	'\u2AA2': "$\\NestedGreaterGreater{}$", // DOUBLE NESTED GREATER-THAN
	'\u2AA3': "$\\partialmeetcontraction{}$", // double less-than with underbar
	'\u2AA4': "$\\glj{}$", // GREATER-THAN OVERLAPPING LESS-THAN
	'\u2AA5': "$\\gla{}$", // GREATER-THAN BESIDE LESS-THAN
	'\u2AA6': "$\\leftslice{}$", // LESS-THAN CLOSED BY CURVE
	'\u2AA7': "$\\rightslice{}$", // GREATER-THAN CLOSED BY CURVE
	'\u2AA8': "$\\lescc{}$", // LESS-THAN CLOSED BY CURVE ABOVE SLANTED EQUAL
	'\u2AA9': "$\\gescc{}$", // GREATER-THAN CLOSED BY CURVE ABOVE SLANTED EQUAL
	'\u2AAA': "$\\smt{}$", // SMALLER THAN
	'\u2AAB': "$\\lat{}$", // LARGER THAN
	'\u2AAC': "$\\smte{}$", // SMALLER THAN OR EQUAL TO
	'\u2AAD': "$\\late{}$", // LARGER THAN OR EQUAL TO
	'\u2AAE': "$\\bumpeqq{}$", // EQUALS SIGN WITH BUMPY ABOVE
	'\u2AAF': "$\\preceq{}$", // PRECEDES ABOVE SINGLE-LINE EQUALS SIGN
	'\u2AB0': "$\\succeq{}$", // SUCCEEDS ABOVE SINGLE-LINE EQUALS SIGN
	'\u2AB1': "$\\precneq{}$", // PRECEDES ABOVE SINGLE-LINE NOT EQUAL TO
	'\u2AB2': "$\\succneq{}$", // SUCCEEDS ABOVE SINGLE-LINE NOT EQUAL TO
	'\u2AB3': "$\\preceqq{}$", // PRECEDES ABOVE EQUALS SIGN
	'\u2AB4': "$\\succeqq{}$", // SUCCEEDS ABOVE EQUALS SIGN
	'\u2AB5': "$\\precneqq{}$", // PRECEDES ABOVE NOT EQUAL TO
	'\u2AB6': "$\\succneqq{}$", // SUCCEEDS ABOVE NOT EQUAL TO
	'\u2AB7': "$\\precapprox{}$", // PRECEDES ABOVE ALMOST EQUAL TO
	'\u2AB8': "$\\succapprox{}$", // SUCCEEDS ABOVE ALMOST EQUAL TO
	'\u2AB9': "$\\precnapprox{}$", // PRECEDES ABOVE NOT ALMOST EQUAL TO
	'\u2ABA': "$\\succnapprox{}$", // SUCCEEDS ABOVE NOT ALMOST EQUAL TO
	'\u2ABB': "$\\llcurly{}$", // DOUBLE PRECEDES
	'\u2ABC': "$\\ggcurly{}$", // DOUBLE SUCCEEDS
	'\u2ABD': "$\\subsetdot{}$", // SUBSET WITH DOT
	'\u2ABE': "$\\supsetdot{}$", // SUPERSET WITH DOT
	'\u2ABF': "$\\subsetplus{}$", // SUBSET WITH PLUS SIGN BELOW
	'\u2AC0': "$\\supsetplus{}$", // SUPERSET WITH PLUS SIGN BELOW
	'\u2AC1': "$\\submult{}$", // SUBSET WITH MULTIPLICATION SIGN BELOW
	'\u2AC2': "$\\supmult{}$", // SUPERSET WITH MULTIPLICATION SIGN BELOW
	'\u2AC3': "$\\subedot{}$", // SUBSET OF OR EQUAL TO WITH DOT ABOVE
	'\u2AC4': "$\\supedot{}$", // SUPERSET OF OR EQUAL TO WITH DOT ABOVE
	'\u2AC5': "$\\subseteqq{}$", // SUBSET OF ABOVE EQUALS SIGN
	'\u2AC6': "$\\supseteqq{}$", // SUPERSET OF ABOVE EQUALS SIGN
	'\u2AC7': "$\\subsim{}$", // SUBSET OF ABOVE TILDE OPERATOR
	'\u2AC8': "$\\supsim{}$", // SUPERSET OF ABOVE TILDE OPERATOR
	'\u2AC9': "$\\subsetapprox{}$", // SUBSET OF ABOVE ALMOST EQUAL TO
	'\u2ACA': "$\\supsetapprox{}$", // SUPERSET OF ABOVE ALMOST EQUAL TO
	'\u2ACB': "$\\subsetneqq{}$", // SUBSET OF ABOVE NOT EQUAL TO
	'\u2ACC': "$\\supsetneqq{}$", // SUPERSET OF ABOVE NOT EQUAL TO
	'\u2ACD': "$\\lsqhook{}$", // SQUARE LEFT OPEN BOX OPERATOR
	'\u2ACE': "$\\rsqhook{}$", // SQUARE RIGHT OPEN BOX OPERATOR
	'\u2ACF': "$\\csub{}$", // CLOSED SUBSET
	'\u2AD0': "$\\csup{}$", // CLOSED SUPERSET
	'\u2AD1': "$\\csube{}$", // CLOSED SUBSET OR EQUAL TO
	'\u2AD2': "$\\csupe{}$", // CLOSED SUPERSET OR EQUAL TO
	'\u2AD3': "$\\subsup{}$", // SUBSET ABOVE SUPERSET
	'\u2AD4': "$\\supsub{}$", // SUPERSET ABOVE SUBSET
	'\u2AD5': "$\\subsub{}$", // SUBSET ABOVE SUBSET
	'\u2AD6': "$\\supsup{}$", // SUPERSET ABOVE SUPERSET
	'\u2AD7': "$\\suphsub{}$", // SUPERSET BESIDE SUBSET
	'\u2AD8': "$\\supdsub{}$", // SUPERSET BESIDE AND JOINED BY DASH WITH SUBSET
	'\u2AD9': "$\\forkv{}$", // ELEMENT OF OPENING DOWNWARDS
	'\u2ADA': "$\\topfork{}$", // PITCHFORK WITH TEE TOP
	'\u2ADB': "$\\mlcp{}$", // TRANSVERSAL INTERSECTION
	'\u2ADC': "$\\forks{}$", // FORKING
	'\u2ADD': "$\\forksnot{}$", // NONFORKING
	'\u2ADE': "$\\shortlefttack{}$", // SHORT LEFT TACK
	'\u2ADF': "$\\shortdowntack{}$", // SHORT DOWN TACK
	'\u2AE0': "$\\shortuptack{}$", // SHORT UP TACK
	'\u2AE1': "$\\perps{}$", // PERPENDICULAR WITH S
	'\u2AE2': "$\\vDdash{}$", // VERTICAL BAR TRIPLE RIGHT TURNSTILE
	'\u2AE3': "$\\dashV{}$", // DOUBLE VERTICAL BAR LEFT TURNSTILE
	'\u2AE4': "$\\Dashv{}$", // VERTICAL BAR DOUBLE LEFT TURNSTILE
	'\u2AE5': "$\\DashV{}$", // DOUBLE VERTICAL BAR DOUBLE LEFT TURNSTILE
	'\u2AE6': "$\\varVdash{}$", // LONG DASH FROM LEFT MEMBER OF DOUBLE VERTICAL
	'\u2AE7': "$\\Barv{}$", // SHORT DOWN TACK WITH OVERBAR
	'\u2AE8': "$\\vBar{}$", // SHORT UP TACK WITH UNDERBAR
	'\u2AE9': "$\\vBarv{}$", // SHORT UP TACK ABOVE SHORT DOWN TACK
	'\u2AEA': "$\\Top{}$", // DOUBLE DOWN TACK
	'\u2AEB': "$\\ElsevierGlyph{E30D}$", // DOUBLE UP TACK
	'\u2AEC': "$\\Not{}$", // DOUBLE STROKE NOT SIGN
	'\u2AED': "$\\bNot{}$", // REVERSED DOUBLE STROKE NOT SIGN
	'\u2AEE': "$\\revnmid{}$", // DOES NOT DIVIDE WITH REVERSED NEGATION SLASH
	'\u2AEF': "$\\cirmid{}$", // VERTICAL LINE WITH CIRCLE ABOVE
	'\u2AF0': "$\\midcir{}$", // VERTICAL LINE WITH CIRCLE BELOW
	'\u2AF1': "$\\topcir{}$", // DOWN TACK WITH CIRCLE BELOW
	'\u2AF2': "$\\nhpar{}$", // PARALLEL WITH HORIZONTAL STROKE
	'\u2AF3': "$\\parsim{}$", // PARALLEL WITH TILDE OPERATOR
	'\u2AF4': "$\\interleave{}$", // TRIPLE VERTICAL BAR BINARY RELATION
	'\u2AF5': "$\\nhVvert{}$", // TRIPLE VERTICAL BAR WITH HORIZONTAL STROKE
	'\u2AF6': "$\\Elztdcol{}$", // TRIPLE COLON OPERATOR
	'\u2AF7': "$\\lllnest{}$", // TRIPLE NESTED LESS-THAN
	'\u2AF8': "$\\gggnest{}$", // TRIPLE NESTED GREATER-THAN
	'\u2AF9': "$\\leqqslant{}$", // DOUBLE-LINE SLANTED LESS-THAN OR EQUAL TO
	'\u2AFA': "$\\geqqslant{}$", // DOUBLE-LINE SLANTED GREATER-THAN OR EQUAL TO
	'\u2AFB': "$\\trslash{}$", // TRIPLE SOLIDUS BINARY RELATION
	'\u2AFC': "$\\biginterleave{}$", // LARGE TRIPLE VERTICAL BAR OPERATOR
	'\u2AFD': "${{/}\\!\\!{/}}$", // DOUBLE SOLIDUS OPERATOR
	'\u2AFE': "$\\talloblong{}$", // WHITE VERTICAL BAR
	'\u2AFF': "$\\bigtalloblong{}$", // N-ARY WHITE VERTICAL BAR
	'\u2B12': "$\\squaretopblack{}$", // SQUARE WITH TOP HALF BLACK
	'\u2B13': "$\\squarebotblack{}$", // SQUARE WITH BOTTOM HALF BLACK
	'\u2B14': "$\\squareurblack{}$", // SQUARE WITH UPPER RIGHT DIAGONAL HALF BLACK
	'\u2B15': "$\\squarellblack{}$", // SQUARE WITH LOWER LEFT DIAGONAL HALF BLACK
	'\u2B16': "$\\diamondleftblack{}$", // DIAMOND WITH LEFT HALF BLACK
	'\u2B17': "$\\diamondrightblack{}$", // DIAMOND WITH RIGHT HALF BLACK
	'\u2B18': "$\\diamondtopblack{}$", // DIAMOND WITH TOP HALF BLACK
	'\u2B19': "$\\diamondbotblack{}$", // DIAMOND WITH BOTTOM HALF BLACK
	'\u2B1A': "$\\dottedsquare{}$", // DOTTED SQUARE
	'\u2B1B': "$\\blacksquare{}$", // BLACK LARGE SQUARE
	'\u2B1C': "$\\square{}$", // WHITE LARGE SQUARE
	'\u2B1D': "$\\vysmblksquare{}$", // # \centerdot (amssymb), t \Squaredot (marvosym), BLACK VERY SMALL SQUARE
	'\u2B1E': "$\\vysmwhtsquare{}$", // WHITE VERY SMALL SQUARE
	'\u2B1F': "$\\pentagonblack{}$", // BLACK PENTAGON
	'\u2B20': "$\\pentagon{}$", // WHITE PENTAGON
	'\u2B21': "$\\varhexagon{}$", // WHITE HEXAGON
	'\u2B22': "$\\varhexagonblack{}$", // BLACK HEXAGON
	'\u2B23': "$\\hexagonblack{}$", // HORIZONTAL BLACK HEXAGON
	'\u2B24': "$\\lgblkcircle{}$", // BLACK LARGE CIRCLE
	'\u2B25': "$\\mdblkdiamond{}$", // BLACK MEDIUM DIAMOND
	'\u2B26': "$\\mdwhtdiamond{}$", // WHITE MEDIUM DIAMOND
	'\u2B27': "$\\mdblklozenge{}$", // # \blacklozenge (amssymb), BLACK MEDIUM LOZENGE
	'\u2B28': "$\\mdwhtlozenge{}$", // # \lozenge (amssymb), WHITE MEDIUM LOZENGE
	'\u2B29': "$\\smblkdiamond{}$", // BLACK SMALL DIAMOND
	'\u2B2A': "$\\smblklozenge{}$", // BLACK SMALL LOZENGE
	'\u2B2B': "$\\smwhtlozenge{}$", // WHITE SMALL LOZENGE
	'\u2B2C': "$\\blkhorzoval{}$", // BLACK HORIZONTAL ELLIPSE
	'\u2B2D': "$\\whthorzoval{}$", // WHITE HORIZONTAL ELLIPSE
	'\u2B2E': "$\\blkvertoval{}$", // BLACK VERTICAL ELLIPSE
	'\u2B2F': "$\\whtvertoval{}$", // WHITE VERTICAL ELLIPSE
	'\u2B30': "$\\circleonleftarrow{}$", // LEFT ARROW WITH SMALL CIRCLE
	'\u2B31': "$\\leftthreearrows{}$", // THREE LEFTWARDS ARROWS
	'\u2B32': "$\\leftarrowonoplus{}$", // LEFT ARROW WITH CIRCLED PLUS
	'\u2B33': "$\\longleftsquigarrow{}$", // LONG LEFTWARDS SQUIGGLE ARROW
	'\u2B34': "$\\nvtwoheadleftarrow{}$", // LEFTWARDS TWO-HEADED ARROW WITH VERTICAL STROKE
	'\u2B35': "$\\nVtwoheadleftarrow{}$", // LEFTWARDS TWO-HEADED ARROW WITH DOUBLE VERTICAL STROKE
	'\u2B36': "$\\twoheadmapsfrom{}$", // LEFTWARDS TWO-HEADED ARROW FROM BAR
	'\u2B37': "$\\twoheadleftdbkarrow{}$", // leftwards two-headed triple-dash arrow
	'\u2B38': "$\\leftdotarrow{}$", // LEFTWARDS ARROW WITH DOTTED STEM
	'\u2B39': "$\\nvleftarrowtail{}$", // LEFTWARDS ARROW WITH TAIL WITH VERTICAL STROKE
	'\u2B3A': "$\\nVleftarrowtail{}$", // LEFTWARDS ARROW WITH TAIL WITH DOUBLE VERTICAL STROKE
	'\u2B3B': "$\\twoheadleftarrowtail{}$", // LEFTWARDS TWO-HEADED ARROW WITH TAIL
	'\u2B3C': "$\\nvtwoheadleftarrowtail{}$", // LEFTWARDS TWO-HEADED ARROW WITH TAIL WITH VERTICAL STROKE
	'\u2B3D': "$\\nVtwoheadleftarrowtail{}$", // LEFTWARDS TWO-HEADED ARROW WITH TAIL WITH DOUBLE VERTICAL STROKE
	'\u2B3E': "$\\leftarrowx{}$", // LEFTWARDS ARROW THROUGH X
	'\u2B3F': "$\\leftcurvedarrow{}$", // WAVE ARROW POINTING DIRECTLY LEFT
	'\u2B40': "$\\equalleftarrow{}$", // EQUALS SIGN ABOVE LEFTWARDS ARROW
	'\u2B41': "$\\bsimilarleftarrow{}$", // REVERSE TILDE OPERATOR ABOVE LEFTWARDS ARROW
	'\u2B42': "$\\leftarrowbackapprox{}$", // LEFTWARDS ARROW ABOVE REVERSE ALMOST EQUAL TO
	'\u2B43': "$\\rightarrowgtr{}$", // rightwards arrow through less-than
	'\u2B44': "$\\rightarrowsupset{}$", // rightwards arrow through subset
	'\u2B45': "$\\LLeftarrow{}$", // LEFTWARDS QUADRUPLE ARROW
	'\u2B46': "$\\RRightarrow{}$", // RIGHTWARDS QUADRUPLE ARROW
	'\u2B47': "$\\bsimilarrightarrow{}$", // REVERSE TILDE OPERATOR ABOVE RIGHTWARDS ARROW
	'\u2B48': "$\\rightarrowbackapprox{}$", // RIGHTWARDS ARROW ABOVE REVERSE ALMOST EQUAL TO
	'\u2B49': "$\\similarleftarrow{}$", // TILDE OPERATOR ABOVE LEFTWARDS ARROW
	'\u2B4A': "$\\leftarrowapprox{}$", // LEFTWARDS ARROW ABOVE ALMOST EQUAL TO
	'\u2B4B': "$\\leftarrowbsimilar{}$", // LEFTWARDS ARROW ABOVE REVERSE TILDE OPERATOR
	'\u2B4C': "$\\rightarrowbsimilar{}$", // righttwards arrow above reverse tilde operator
	'\u2B50': "$\\medwhitestar{}$", // WHITE MEDIUM STAR
	'\u2B51': "$\\medblackstar{}$", // black medium star
	'\u2B52': "$\\smwhitestar{}$", // WHITE SMALL STAR
	'\u2B53': "$\\rightpentagonblack{}$", // BLACK RIGHT-POINTING PENTAGON
	'\u2B54': "$\\rightpentagon{}$", // WHITE RIGHT-POINTING PENTAGON
	'\u300A': "$\\ElsevierGlyph{300A}$", // LEFT DOUBLE ANGLE BRACKET
	'\u300B': "$\\ElsevierGlyph{300B}$", // RIGHT DOUBLE ANGLE BRACKET
	'\u3012': "$\\postalmark{}$", // POSTAL MARK
	'\u3014': "$\\lbrbrak{}$", // left broken bracket
	'\u3015': "$\\rbrbrak{}$", // right broken bracket
	'\u3018': "$\\ElsevierGlyph{3018}$", // LEFT WHITE TORTOISE SHELL BRACKET
	'\u3019': "$\\ElsevierGlyph{3019}$", // RIGHT WHITE TORTOISE SHELL BRACKET
	'\u301A': "$\\openbracketleft{}$", // LEFT WHITE SQUARE BRACKET
	'\u301B': "$\\openbracketright{}$", // RIGHT WHITE SQUARE BRACKET
	'\u3030': "$\\hzigzag{}$", // zigzag
	'\uFFFD': "\\dbend{}",
	'\uD835\uDC00': "$\\mathbf{A}$", // MATHEMATICAL BOLD CAPITAL A
	'\uD835\uDC01': "$\\mathbf{B}$", // MATHEMATICAL BOLD CAPITAL B
	'\uD835\uDC02': "$\\mathbf{C}$", // MATHEMATICAL BOLD CAPITAL C
	'\uD835\uDC03': "$\\mathbf{D}$", // MATHEMATICAL BOLD CAPITAL D
	'\uD835\uDC04': "$\\mathbf{E}$", // MATHEMATICAL BOLD CAPITAL E
	'\uD835\uDC05': "$\\mathbf{F}$", // MATHEMATICAL BOLD CAPITAL F
	'\uD835\uDC06': "$\\mathbf{G}$", // MATHEMATICAL BOLD CAPITAL G
	'\uD835\uDC07': "$\\mathbf{H}$", // MATHEMATICAL BOLD CAPITAL H
	'\uD835\uDC08': "$\\mathbf{I}$", // MATHEMATICAL BOLD CAPITAL I
	'\uD835\uDC09': "$\\mathbf{J}$", // MATHEMATICAL BOLD CAPITAL J
	'\uD835\uDC0A': "$\\mathbf{K}$", // MATHEMATICAL BOLD CAPITAL K
	'\uD835\uDC0B': "$\\mathbf{L}$", // MATHEMATICAL BOLD CAPITAL L
	'\uD835\uDC0C': "$\\mathbf{M}$", // MATHEMATICAL BOLD CAPITAL M
	'\uD835\uDC0D': "$\\mathbf{N}$", // MATHEMATICAL BOLD CAPITAL N
	'\uD835\uDC0E': "$\\mathbf{O}$", // MATHEMATICAL BOLD CAPITAL O
	'\uD835\uDC0F': "$\\mathbf{P}$", // MATHEMATICAL BOLD CAPITAL P
	'\uD835\uDC10': "$\\mathbf{Q}$", // MATHEMATICAL BOLD CAPITAL Q
	'\uD835\uDC11': "$\\mathbf{R}$", // MATHEMATICAL BOLD CAPITAL R
	'\uD835\uDC12': "$\\mathbf{S}$", // MATHEMATICAL BOLD CAPITAL S
	'\uD835\uDC13': "$\\mathbf{T}$", // MATHEMATICAL BOLD CAPITAL T
	'\uD835\uDC14': "$\\mathbf{U}$", // MATHEMATICAL BOLD CAPITAL U
	'\uD835\uDC15': "$\\mathbf{V}$", // MATHEMATICAL BOLD CAPITAL V
	'\uD835\uDC16': "$\\mathbf{W}$", // MATHEMATICAL BOLD CAPITAL W
	'\uD835\uDC17': "$\\mathbf{X}$", // MATHEMATICAL BOLD CAPITAL X
	'\uD835\uDC18': "$\\mathbf{Y}$", // MATHEMATICAL BOLD CAPITAL Y
	'\uD835\uDC19': "$\\mathbf{Z}$", // MATHEMATICAL BOLD CAPITAL Z
	'\uD835\uDC1A': "$\\mathbf{a}$", // MATHEMATICAL BOLD SMALL A
	'\uD835\uDC1B': "$\\mathbf{b}$", // MATHEMATICAL BOLD SMALL B
	'\uD835\uDC1C': "$\\mathbf{c}$", // MATHEMATICAL BOLD SMALL C
	'\uD835\uDC1D': "$\\mathbf{d}$", // MATHEMATICAL BOLD SMALL D
	'\uD835\uDC1E': "$\\mathbf{e}$", // MATHEMATICAL BOLD SMALL E
	'\uD835\uDC1F': "$\\mathbf{f}$", // MATHEMATICAL BOLD SMALL F
	'\uD835\uDC20': "$\\mathbf{g}$", // MATHEMATICAL BOLD SMALL G
	'\uD835\uDC21': "$\\mathbf{h}$", // MATHEMATICAL BOLD SMALL H
	'\uD835\uDC22': "$\\mathbf{i}$", // MATHEMATICAL BOLD SMALL I
	'\uD835\uDC23': "$\\mathbf{j}$", // MATHEMATICAL BOLD SMALL J
	'\uD835\uDC24': "$\\mathbf{k}$", // MATHEMATICAL BOLD SMALL K
	'\uD835\uDC25': "$\\mathbf{l}$", // MATHEMATICAL BOLD SMALL L
	'\uD835\uDC26': "$\\mathbf{m}$", // MATHEMATICAL BOLD SMALL M
	'\uD835\uDC27': "$\\mathbf{n}$", // MATHEMATICAL BOLD SMALL N
	'\uD835\uDC28': "$\\mathbf{o}$", // MATHEMATICAL BOLD SMALL O
	'\uD835\uDC29': "$\\mathbf{p}$", // MATHEMATICAL BOLD SMALL P
	'\uD835\uDC2A': "$\\mathbf{q}$", // MATHEMATICAL BOLD SMALL Q
	'\uD835\uDC2B': "$\\mathbf{r}$", // MATHEMATICAL BOLD SMALL R
	'\uD835\uDC2C': "$\\mathbf{s}$", // MATHEMATICAL BOLD SMALL S
	'\uD835\uDC2D': "$\\mathbf{t}$", // MATHEMATICAL BOLD SMALL T
	'\uD835\uDC2E': "$\\mathbf{u}$", // MATHEMATICAL BOLD SMALL U
	'\uD835\uDC2F': "$\\mathbf{v}$", // MATHEMATICAL BOLD SMALL V
	'\uD835\uDC30': "$\\mathbf{w}$", // MATHEMATICAL BOLD SMALL W
	'\uD835\uDC31': "$\\mathbf{x}$", // MATHEMATICAL BOLD SMALL X
	'\uD835\uDC32': "$\\mathbf{y}$", // MATHEMATICAL BOLD SMALL Y
	'\uD835\uDC33': "$\\mathbf{z}$", // MATHEMATICAL BOLD SMALL Z
	'\uD835\uDC34': "$\\mathsl{A}$", // MATHEMATICAL ITALIC CAPITAL A
	'\uD835\uDC35': "$\\mathsl{B}$", // MATHEMATICAL ITALIC CAPITAL B
	'\uD835\uDC36': "$\\mathsl{C}$", // MATHEMATICAL ITALIC CAPITAL C
	'\uD835\uDC37': "$\\mathsl{D}$", // MATHEMATICAL ITALIC CAPITAL D
	'\uD835\uDC38': "$\\mathsl{E}$", // MATHEMATICAL ITALIC CAPITAL E
	'\uD835\uDC39': "$\\mathsl{F}$", // MATHEMATICAL ITALIC CAPITAL F
	'\uD835\uDC3A': "$\\mathsl{G}$", // MATHEMATICAL ITALIC CAPITAL G
	'\uD835\uDC3B': "$\\mathsl{H}$", // MATHEMATICAL ITALIC CAPITAL H
	'\uD835\uDC3C': "$\\mathsl{I}$", // MATHEMATICAL ITALIC CAPITAL I
	'\uD835\uDC3D': "$\\mathsl{J}$", // MATHEMATICAL ITALIC CAPITAL J
	'\uD835\uDC3E': "$\\mathsl{K}$", // MATHEMATICAL ITALIC CAPITAL K
	'\uD835\uDC3F': "$\\mathsl{L}$", // MATHEMATICAL ITALIC CAPITAL L
	'\uD835\uDC40': "$\\mathsl{M}$", // MATHEMATICAL ITALIC CAPITAL M
	'\uD835\uDC41': "$\\mathsl{N}$", // MATHEMATICAL ITALIC CAPITAL N
	'\uD835\uDC42': "$\\mathsl{O}$", // MATHEMATICAL ITALIC CAPITAL O
	'\uD835\uDC43': "$\\mathsl{P}$", // MATHEMATICAL ITALIC CAPITAL P
	'\uD835\uDC44': "$\\mathsl{Q}$", // MATHEMATICAL ITALIC CAPITAL Q
	'\uD835\uDC45': "$\\mathsl{R}$", // MATHEMATICAL ITALIC CAPITAL R
	'\uD835\uDC46': "$\\mathsl{S}$", // MATHEMATICAL ITALIC CAPITAL S
	'\uD835\uDC47': "$\\mathsl{T}$", // MATHEMATICAL ITALIC CAPITAL T
	'\uD835\uDC48': "$\\mathsl{U}$", // MATHEMATICAL ITALIC CAPITAL U
	'\uD835\uDC49': "$\\mathsl{V}$", // MATHEMATICAL ITALIC CAPITAL V
	'\uD835\uDC4A': "$\\mathsl{W}$", // MATHEMATICAL ITALIC CAPITAL W
	'\uD835\uDC4B': "$\\mathsl{X}$", // MATHEMATICAL ITALIC CAPITAL X
	'\uD835\uDC4C': "$\\mathsl{Y}$", // MATHEMATICAL ITALIC CAPITAL Y
	'\uD835\uDC4D': "$\\mathsl{Z}$", // MATHEMATICAL ITALIC CAPITAL Z
	'\uD835\uDC4E': "$\\mathsl{a}$", // MATHEMATICAL ITALIC SMALL A
	'\uD835\uDC4F': "$\\mathsl{b}$", // MATHEMATICAL ITALIC SMALL B
	'\uD835\uDC50': "$\\mathsl{c}$", // MATHEMATICAL ITALIC SMALL C
	'\uD835\uDC51': "$\\mathsl{d}$", // MATHEMATICAL ITALIC SMALL D
	'\uD835\uDC52': "$\\mathsl{e}$", // MATHEMATICAL ITALIC SMALL E
	'\uD835\uDC53': "$\\mathsl{f}$", // MATHEMATICAL ITALIC SMALL F
	'\uD835\uDC54': "$\\mathsl{g}$", // MATHEMATICAL ITALIC SMALL G
	'\uD835\uDC56': "$\\mathsl{i}$", // MATHEMATICAL ITALIC SMALL I
	'\uD835\uDC57': "$\\mathsl{j}$", // MATHEMATICAL ITALIC SMALL J
	'\uD835\uDC58': "$\\mathsl{k}$", // MATHEMATICAL ITALIC SMALL K
	'\uD835\uDC59': "$\\mathsl{l}$", // MATHEMATICAL ITALIC SMALL L
	'\uD835\uDC5A': "$\\mathsl{m}$", // MATHEMATICAL ITALIC SMALL M
	'\uD835\uDC5B': "$\\mathsl{n}$", // MATHEMATICAL ITALIC SMALL N
	'\uD835\uDC5C': "$\\mathsl{o}$", // MATHEMATICAL ITALIC SMALL O
	'\uD835\uDC5D': "$\\mathsl{p}$", // MATHEMATICAL ITALIC SMALL P
	'\uD835\uDC5E': "$\\mathsl{q}$", // MATHEMATICAL ITALIC SMALL Q
	'\uD835\uDC5F': "$\\mathsl{r}$", // MATHEMATICAL ITALIC SMALL R
	'\uD835\uDC60': "$\\mathsl{s}$", // MATHEMATICAL ITALIC SMALL S
	'\uD835\uDC61': "$\\mathsl{t}$", // MATHEMATICAL ITALIC SMALL T
	'\uD835\uDC62': "$\\mathsl{u}$", // MATHEMATICAL ITALIC SMALL U
	'\uD835\uDC63': "$\\mathsl{v}$", // MATHEMATICAL ITALIC SMALL V
	'\uD835\uDC64': "$\\mathsl{w}$", // MATHEMATICAL ITALIC SMALL W
	'\uD835\uDC65': "$\\mathsl{x}$", // MATHEMATICAL ITALIC SMALL X
	'\uD835\uDC66': "$\\mathsl{y}$", // MATHEMATICAL ITALIC SMALL Y
	'\uD835\uDC67': "$\\mathsl{z}$", // MATHEMATICAL ITALIC SMALL Z
	'\uD835\uDC68': "$\\mathbit{A}$", // MATHEMATICAL BOLD ITALIC CAPITAL A
	'\uD835\uDC69': "$\\mathbit{B}$", // MATHEMATICAL BOLD ITALIC CAPITAL B
	'\uD835\uDC6A': "$\\mathbit{C}$", // MATHEMATICAL BOLD ITALIC CAPITAL C
	'\uD835\uDC6B': "$\\mathbit{D}$", // MATHEMATICAL BOLD ITALIC CAPITAL D
	'\uD835\uDC6C': "$\\mathbit{E}$", // MATHEMATICAL BOLD ITALIC CAPITAL E
	'\uD835\uDC6D': "$\\mathbit{F}$", // MATHEMATICAL BOLD ITALIC CAPITAL F
	'\uD835\uDC6E': "$\\mathbit{G}$", // MATHEMATICAL BOLD ITALIC CAPITAL G
	'\uD835\uDC6F': "$\\mathbit{H}$", // MATHEMATICAL BOLD ITALIC CAPITAL H
	'\uD835\uDC70': "$\\mathbit{I}$", // MATHEMATICAL BOLD ITALIC CAPITAL I
	'\uD835\uDC71': "$\\mathbit{J}$", // MATHEMATICAL BOLD ITALIC CAPITAL J
	'\uD835\uDC72': "$\\mathbit{K}$", // MATHEMATICAL BOLD ITALIC CAPITAL K
	'\uD835\uDC73': "$\\mathbit{L}$", // MATHEMATICAL BOLD ITALIC CAPITAL L
	'\uD835\uDC74': "$\\mathbit{M}$", // MATHEMATICAL BOLD ITALIC CAPITAL M
	'\uD835\uDC75': "$\\mathbit{N}$", // MATHEMATICAL BOLD ITALIC CAPITAL N
	'\uD835\uDC76': "$\\mathbit{O}$", // MATHEMATICAL BOLD ITALIC CAPITAL O
	'\uD835\uDC77': "$\\mathbit{P}$", // MATHEMATICAL BOLD ITALIC CAPITAL P
	'\uD835\uDC78': "$\\mathbit{Q}$", // MATHEMATICAL BOLD ITALIC CAPITAL Q
	'\uD835\uDC79': "$\\mathbit{R}$", // MATHEMATICAL BOLD ITALIC CAPITAL R
	'\uD835\uDC7A': "$\\mathbit{S}$", // MATHEMATICAL BOLD ITALIC CAPITAL S
	'\uD835\uDC7B': "$\\mathbit{T}$", // MATHEMATICAL BOLD ITALIC CAPITAL T
	'\uD835\uDC7C': "$\\mathbit{U}$", // MATHEMATICAL BOLD ITALIC CAPITAL U
	'\uD835\uDC7D': "$\\mathbit{V}$", // MATHEMATICAL BOLD ITALIC CAPITAL V
	'\uD835\uDC7E': "$\\mathbit{W}$", // MATHEMATICAL BOLD ITALIC CAPITAL W
	'\uD835\uDC7F': "$\\mathbit{X}$", // MATHEMATICAL BOLD ITALIC CAPITAL X
	'\uD835\uDC80': "$\\mathbit{Y}$", // MATHEMATICAL BOLD ITALIC CAPITAL Y
	'\uD835\uDC81': "$\\mathbit{Z}$", // MATHEMATICAL BOLD ITALIC CAPITAL Z
	'\uD835\uDC82': "$\\mathbit{a}$", // MATHEMATICAL BOLD ITALIC SMALL A
	'\uD835\uDC83': "$\\mathbit{b}$", // MATHEMATICAL BOLD ITALIC SMALL B
	'\uD835\uDC84': "$\\mathbit{c}$", // MATHEMATICAL BOLD ITALIC SMALL C
	'\uD835\uDC85': "$\\mathbit{d}$", // MATHEMATICAL BOLD ITALIC SMALL D
	'\uD835\uDC86': "$\\mathbit{e}$", // MATHEMATICAL BOLD ITALIC SMALL E
	'\uD835\uDC87': "$\\mathbit{f}$", // MATHEMATICAL BOLD ITALIC SMALL F
	'\uD835\uDC88': "$\\mathbit{g}$", // MATHEMATICAL BOLD ITALIC SMALL G
	'\uD835\uDC89': "$\\mathbit{h}$", // MATHEMATICAL BOLD ITALIC SMALL H
	'\uD835\uDC8A': "$\\mathbit{i}$", // MATHEMATICAL BOLD ITALIC SMALL I
	'\uD835\uDC8B': "$\\mathbit{j}$", // MATHEMATICAL BOLD ITALIC SMALL J
	'\uD835\uDC8C': "$\\mathbit{k}$", // MATHEMATICAL BOLD ITALIC SMALL K
	'\uD835\uDC8D': "$\\mathbit{l}$", // MATHEMATICAL BOLD ITALIC SMALL L
	'\uD835\uDC8E': "$\\mathbit{m}$", // MATHEMATICAL BOLD ITALIC SMALL M
	'\uD835\uDC8F': "$\\mathbit{n}$", // MATHEMATICAL BOLD ITALIC SMALL N
	'\uD835\uDC90': "$\\mathbit{o}$", // MATHEMATICAL BOLD ITALIC SMALL O
	'\uD835\uDC91': "$\\mathbit{p}$", // MATHEMATICAL BOLD ITALIC SMALL P
	'\uD835\uDC92': "$\\mathbit{q}$", // MATHEMATICAL BOLD ITALIC SMALL Q
	'\uD835\uDC93': "$\\mathbit{r}$", // MATHEMATICAL BOLD ITALIC SMALL R
	'\uD835\uDC94': "$\\mathbit{s}$", // MATHEMATICAL BOLD ITALIC SMALL S
	'\uD835\uDC95': "$\\mathbit{t}$", // MATHEMATICAL BOLD ITALIC SMALL T
	'\uD835\uDC96': "$\\mathbit{u}$", // MATHEMATICAL BOLD ITALIC SMALL U
	'\uD835\uDC97': "$\\mathbit{v}$", // MATHEMATICAL BOLD ITALIC SMALL V
	'\uD835\uDC98': "$\\mathbit{w}$", // MATHEMATICAL BOLD ITALIC SMALL W
	'\uD835\uDC99': "$\\mathbit{x}$", // MATHEMATICAL BOLD ITALIC SMALL X
	'\uD835\uDC9A': "$\\mathbit{y}$", // MATHEMATICAL BOLD ITALIC SMALL Y
	'\uD835\uDC9B': "$\\mathbit{z}$", // MATHEMATICAL BOLD ITALIC SMALL Z
	'\uD835\uDC9C': "$\\mathscr{A}$", // MATHEMATICAL SCRIPT CAPITAL A
	'\uD835\uDC9E': "$\\mathscr{C}$", // MATHEMATICAL SCRIPT CAPITAL C
	'\uD835\uDC9F': "$\\mathscr{D}$", // MATHEMATICAL SCRIPT CAPITAL D
	'\uD835\uDCA2': "$\\mathscr{G}$", // MATHEMATICAL SCRIPT CAPITAL G
	'\uD835\uDCA5': "$\\mathscr{J}$", // MATHEMATICAL SCRIPT CAPITAL J
	'\uD835\uDCA6': "$\\mathscr{K}$", // MATHEMATICAL SCRIPT CAPITAL K
	'\uD835\uDCA9': "$\\mathscr{N}$", // MATHEMATICAL SCRIPT CAPITAL N
	'\uD835\uDCAA': "$\\mathscr{O}$", // MATHEMATICAL SCRIPT CAPITAL O
	'\uD835\uDCAB': "$\\mathscr{P}$", // MATHEMATICAL SCRIPT CAPITAL P
	'\uD835\uDCAC': "$\\mathscr{Q}$", // MATHEMATICAL SCRIPT CAPITAL Q
	'\uD835\uDCAE': "$\\mathscr{S}$", // MATHEMATICAL SCRIPT CAPITAL S
	'\uD835\uDCAF': "$\\mathscr{T}$", // MATHEMATICAL SCRIPT CAPITAL T
	'\uD835\uDCB0': "$\\mathscr{U}$", // MATHEMATICAL SCRIPT CAPITAL U
	'\uD835\uDCB1': "$\\mathscr{V}$", // MATHEMATICAL SCRIPT CAPITAL V
	'\uD835\uDCB2': "$\\mathscr{W}$", // MATHEMATICAL SCRIPT CAPITAL W
	'\uD835\uDCB3': "$\\mathscr{X}$", // MATHEMATICAL SCRIPT CAPITAL X
	'\uD835\uDCB4': "$\\mathscr{Y}$", // MATHEMATICAL SCRIPT CAPITAL Y
	'\uD835\uDCB5': "$\\mathscr{Z}$", // MATHEMATICAL SCRIPT CAPITAL Z
	'\uD835\uDCB6': "$\\mathscr{a}$", // MATHEMATICAL SCRIPT SMALL A
	'\uD835\uDCB7': "$\\mathscr{b}$", // MATHEMATICAL SCRIPT SMALL B
	'\uD835\uDCB8': "$\\mathscr{c}$", // MATHEMATICAL SCRIPT SMALL C
	'\uD835\uDCB9': "$\\mathscr{d}$", // MATHEMATICAL SCRIPT SMALL D
	'\uD835\uDCBB': "$\\mathscr{f}$", // MATHEMATICAL SCRIPT SMALL F
	'\uD835\uDCBD': "$\\mathscr{h}$", // MATHEMATICAL SCRIPT SMALL H
	'\uD835\uDCBE': "$\\mathscr{i}$", // MATHEMATICAL SCRIPT SMALL I
	'\uD835\uDCBF': "$\\mathscr{j}$", // MATHEMATICAL SCRIPT SMALL J
	'\uD835\uDCC0': "$\\mathscr{k}$", // MATHEMATICAL SCRIPT SMALL K
	'\uD835\uDCC1': "$\\mathscr{l}$", // MATHEMATICAL SCRIPT SMALL L
	'\uD835\uDCC2': "$\\mathscr{m}$", // MATHEMATICAL SCRIPT SMALL M
	'\uD835\uDCC3': "$\\mathscr{n}$", // MATHEMATICAL SCRIPT SMALL N
	'\uD835\uDCC5': "$\\mathscr{p}$", // MATHEMATICAL SCRIPT SMALL P
	'\uD835\uDCC6': "$\\mathscr{q}$", // MATHEMATICAL SCRIPT SMALL Q
	'\uD835\uDCC7': "$\\mathscr{r}$", // MATHEMATICAL SCRIPT SMALL R
	'\uD835\uDCC8': "$\\mathscr{s}$", // MATHEMATICAL SCRIPT SMALL S
	'\uD835\uDCC9': "$\\mathscr{t}$", // MATHEMATICAL SCRIPT SMALL T
	'\uD835\uDCCA': "$\\mathscr{u}$", // MATHEMATICAL SCRIPT SMALL U
	'\uD835\uDCCB': "$\\mathscr{v}$", // MATHEMATICAL SCRIPT SMALL V
	'\uD835\uDCCC': "$\\mathscr{w}$", // MATHEMATICAL SCRIPT SMALL W
	'\uD835\uDCCD': "$\\mathscr{x}$", // MATHEMATICAL SCRIPT SMALL X
	'\uD835\uDCCE': "$\\mathscr{y}$", // MATHEMATICAL SCRIPT SMALL Y
	'\uD835\uDCCF': "$\\mathscr{z}$", // MATHEMATICAL SCRIPT SMALL Z
	'\uD835\uDCD0': "$\\mathmit{A}$", // MATHEMATICAL BOLD SCRIPT CAPITAL A
	'\uD835\uDCD1': "$\\mathmit{B}$", // MATHEMATICAL BOLD SCRIPT CAPITAL B
	'\uD835\uDCD2': "$\\mathmit{C}$", // MATHEMATICAL BOLD SCRIPT CAPITAL C
	'\uD835\uDCD3': "$\\mathmit{D}$", // MATHEMATICAL BOLD SCRIPT CAPITAL D
	'\uD835\uDCD4': "$\\mathmit{E}$", // MATHEMATICAL BOLD SCRIPT CAPITAL E
	'\uD835\uDCD5': "$\\mathmit{F}$", // MATHEMATICAL BOLD SCRIPT CAPITAL F
	'\uD835\uDCD6': "$\\mathmit{G}$", // MATHEMATICAL BOLD SCRIPT CAPITAL G
	'\uD835\uDCD7': "$\\mathmit{H}$", // MATHEMATICAL BOLD SCRIPT CAPITAL H
	'\uD835\uDCD8': "$\\mathmit{I}$", // MATHEMATICAL BOLD SCRIPT CAPITAL I
	'\uD835\uDCD9': "$\\mathmit{J}$", // MATHEMATICAL BOLD SCRIPT CAPITAL J
	'\uD835\uDCDA': "$\\mathmit{K}$", // MATHEMATICAL BOLD SCRIPT CAPITAL K
	'\uD835\uDCDB': "$\\mathmit{L}$", // MATHEMATICAL BOLD SCRIPT CAPITAL L
	'\uD835\uDCDC': "$\\mathmit{M}$", // MATHEMATICAL BOLD SCRIPT CAPITAL M
	'\uD835\uDCDD': "$\\mathmit{N}$", // MATHEMATICAL BOLD SCRIPT CAPITAL N
	'\uD835\uDCDE': "$\\mathmit{O}$", // MATHEMATICAL BOLD SCRIPT CAPITAL O
	'\uD835\uDCDF': "$\\mathmit{P}$", // MATHEMATICAL BOLD SCRIPT CAPITAL P
	'\uD835\uDCE0': "$\\mathmit{Q}$", // MATHEMATICAL BOLD SCRIPT CAPITAL Q
	'\uD835\uDCE1': "$\\mathmit{R}$", // MATHEMATICAL BOLD SCRIPT CAPITAL R
	'\uD835\uDCE2': "$\\mathmit{S}$", // MATHEMATICAL BOLD SCRIPT CAPITAL S
	'\uD835\uDCE3': "$\\mathmit{T}$", // MATHEMATICAL BOLD SCRIPT CAPITAL T
	'\uD835\uDCE4': "$\\mathmit{U}$", // MATHEMATICAL BOLD SCRIPT CAPITAL U
	'\uD835\uDCE5': "$\\mathmit{V}$", // MATHEMATICAL BOLD SCRIPT CAPITAL V
	'\uD835\uDCE6': "$\\mathmit{W}$", // MATHEMATICAL BOLD SCRIPT CAPITAL W
	'\uD835\uDCE7': "$\\mathmit{X}$", // MATHEMATICAL BOLD SCRIPT CAPITAL X
	'\uD835\uDCE8': "$\\mathmit{Y}$", // MATHEMATICAL BOLD SCRIPT CAPITAL Y
	'\uD835\uDCE9': "$\\mathmit{Z}$", // MATHEMATICAL BOLD SCRIPT CAPITAL Z
	'\uD835\uDCEA': "$\\mathmit{a}$", // MATHEMATICAL BOLD SCRIPT SMALL A
	'\uD835\uDCEB': "$\\mathmit{b}$", // MATHEMATICAL BOLD SCRIPT SMALL B
	'\uD835\uDCEC': "$\\mathmit{c}$", // MATHEMATICAL BOLD SCRIPT SMALL C
	'\uD835\uDCED': "$\\mathmit{d}$", // MATHEMATICAL BOLD SCRIPT SMALL D
	'\uD835\uDCEE': "$\\mathmit{e}$", // MATHEMATICAL BOLD SCRIPT SMALL E
	'\uD835\uDCEF': "$\\mathmit{f}$", // MATHEMATICAL BOLD SCRIPT SMALL F
	'\uD835\uDCF0': "$\\mathmit{g}$", // MATHEMATICAL BOLD SCRIPT SMALL G
	'\uD835\uDCF1': "$\\mathmit{h}$", // MATHEMATICAL BOLD SCRIPT SMALL H
	'\uD835\uDCF2': "$\\mathmit{i}$", // MATHEMATICAL BOLD SCRIPT SMALL I
	'\uD835\uDCF3': "$\\mathmit{j}$", // MATHEMATICAL BOLD SCRIPT SMALL J
	'\uD835\uDCF4': "$\\mathmit{k}$", // MATHEMATICAL BOLD SCRIPT SMALL K
	'\uD835\uDCF5': "$\\mathmit{l}$", // MATHEMATICAL BOLD SCRIPT SMALL L
	'\uD835\uDCF6': "$\\mathmit{m}$", // MATHEMATICAL BOLD SCRIPT SMALL M
	'\uD835\uDCF7': "$\\mathmit{n}$", // MATHEMATICAL BOLD SCRIPT SMALL N
	'\uD835\uDCF8': "$\\mathmit{o}$", // MATHEMATICAL BOLD SCRIPT SMALL O
	'\uD835\uDCF9': "$\\mathmit{p}$", // MATHEMATICAL BOLD SCRIPT SMALL P
	'\uD835\uDCFA': "$\\mathmit{q}$", // MATHEMATICAL BOLD SCRIPT SMALL Q
	'\uD835\uDCFB': "$\\mathmit{r}$", // MATHEMATICAL BOLD SCRIPT SMALL R
	'\uD835\uDCFC': "$\\mathmit{s}$", // MATHEMATICAL BOLD SCRIPT SMALL S
	'\uD835\uDCFD': "$\\mathmit{t}$", // MATHEMATICAL BOLD SCRIPT SMALL T
	'\uD835\uDCFE': "$\\mathmit{u}$", // MATHEMATICAL BOLD SCRIPT SMALL U
	'\uD835\uDCFF': "$\\mathmit{v}$", // MATHEMATICAL BOLD SCRIPT SMALL V
	'\uD835\uDD00': "$\\mathmit{w}$", // MATHEMATICAL BOLD SCRIPT SMALL W
	'\uD835\uDD01': "$\\mathmit{x}$", // MATHEMATICAL BOLD SCRIPT SMALL X
	'\uD835\uDD02': "$\\mathmit{y}$", // MATHEMATICAL BOLD SCRIPT SMALL Y
	'\uD835\uDD03': "$\\mathmit{z}$", // MATHEMATICAL BOLD SCRIPT SMALL Z
	'\uD835\uDD04': "$\\mathfrak{A}$", // MATHEMATICAL FRAKTUR CAPITAL A
	'\uD835\uDD05': "$\\mathfrak{B}$", // MATHEMATICAL FRAKTUR CAPITAL B
	'\uD835\uDD07': "$\\mathfrak{D}$", // MATHEMATICAL FRAKTUR CAPITAL D
	'\uD835\uDD08': "$\\mathfrak{E}$", // MATHEMATICAL FRAKTUR CAPITAL E
	'\uD835\uDD09': "$\\mathfrak{F}$", // MATHEMATICAL FRAKTUR CAPITAL F
	'\uD835\uDD0A': "$\\mathfrak{G}$", // MATHEMATICAL FRAKTUR CAPITAL G
	'\uD835\uDD0D': "$\\mathfrak{J}$", // MATHEMATICAL FRAKTUR CAPITAL J
	'\uD835\uDD0E': "$\\mathfrak{K}$", // MATHEMATICAL FRAKTUR CAPITAL K
	'\uD835\uDD0F': "$\\mathfrak{L}$", // MATHEMATICAL FRAKTUR CAPITAL L
	'\uD835\uDD10': "$\\mathfrak{M}$", // MATHEMATICAL FRAKTUR CAPITAL M
	'\uD835\uDD11': "$\\mathfrak{N}$", // MATHEMATICAL FRAKTUR CAPITAL N
	'\uD835\uDD12': "$\\mathfrak{O}$", // MATHEMATICAL FRAKTUR CAPITAL O
	'\uD835\uDD13': "$\\mathfrak{P}$", // MATHEMATICAL FRAKTUR CAPITAL P
	'\uD835\uDD14': "$\\mathfrak{Q}$", // MATHEMATICAL FRAKTUR CAPITAL Q
	'\uD835\uDD16': "$\\mathfrak{S}$", // MATHEMATICAL FRAKTUR CAPITAL S
	'\uD835\uDD17': "$\\mathfrak{T}$", // MATHEMATICAL FRAKTUR CAPITAL T
	'\uD835\uDD18': "$\\mathfrak{U}$", // MATHEMATICAL FRAKTUR CAPITAL U
	'\uD835\uDD19': "$\\mathfrak{V}$", // MATHEMATICAL FRAKTUR CAPITAL V
	'\uD835\uDD1A': "$\\mathfrak{W}$", // MATHEMATICAL FRAKTUR CAPITAL W
	'\uD835\uDD1B': "$\\mathfrak{X}$", // MATHEMATICAL FRAKTUR CAPITAL X
	'\uD835\uDD1C': "$\\mathfrak{Y}$", // MATHEMATICAL FRAKTUR CAPITAL Y
	'\uD835\uDD1E': "$\\mathfrak{a}$", // MATHEMATICAL FRAKTUR SMALL A
	'\uD835\uDD1F': "$\\mathfrak{b}$", // MATHEMATICAL FRAKTUR SMALL B
	'\uD835\uDD20': "$\\mathfrak{c}$", // MATHEMATICAL FRAKTUR SMALL C
	'\uD835\uDD21': "$\\mathfrak{d}$", // MATHEMATICAL FRAKTUR SMALL D
	'\uD835\uDD22': "$\\mathfrak{e}$", // MATHEMATICAL FRAKTUR SMALL E
	'\uD835\uDD23': "$\\mathfrak{f}$", // MATHEMATICAL FRAKTUR SMALL F
	'\uD835\uDD24': "$\\mathfrak{g}$", // MATHEMATICAL FRAKTUR SMALL G
	'\uD835\uDD25': "$\\mathfrak{h}$", // MATHEMATICAL FRAKTUR SMALL H
	'\uD835\uDD26': "$\\mathfrak{i}$", // MATHEMATICAL FRAKTUR SMALL I
	'\uD835\uDD27': "$\\mathfrak{j}$", // MATHEMATICAL FRAKTUR SMALL J
	'\uD835\uDD28': "$\\mathfrak{k}$", // MATHEMATICAL FRAKTUR SMALL K
	'\uD835\uDD29': "$\\mathfrak{l}$", // MATHEMATICAL FRAKTUR SMALL L
	'\uD835\uDD2A': "$\\mathfrak{m}$", // MATHEMATICAL FRAKTUR SMALL M
	'\uD835\uDD2B': "$\\mathfrak{n}$", // MATHEMATICAL FRAKTUR SMALL N
	'\uD835\uDD2C': "$\\mathfrak{o}$", // MATHEMATICAL FRAKTUR SMALL O
	'\uD835\uDD2D': "$\\mathfrak{p}$", // MATHEMATICAL FRAKTUR SMALL P
	'\uD835\uDD2E': "$\\mathfrak{q}$", // MATHEMATICAL FRAKTUR SMALL Q
	'\uD835\uDD2F': "$\\mathfrak{r}$", // MATHEMATICAL FRAKTUR SMALL R
	'\uD835\uDD30': "$\\mathfrak{s}$", // MATHEMATICAL FRAKTUR SMALL S
	'\uD835\uDD31': "$\\mathfrak{t}$", // MATHEMATICAL FRAKTUR SMALL T
	'\uD835\uDD32': "$\\mathfrak{u}$", // MATHEMATICAL FRAKTUR SMALL U
	'\uD835\uDD33': "$\\mathfrak{v}$", // MATHEMATICAL FRAKTUR SMALL V
	'\uD835\uDD34': "$\\mathfrak{w}$", // MATHEMATICAL FRAKTUR SMALL W
	'\uD835\uDD35': "$\\mathfrak{x}$", // MATHEMATICAL FRAKTUR SMALL X
	'\uD835\uDD36': "$\\mathfrak{y}$", // MATHEMATICAL FRAKTUR SMALL Y
	'\uD835\uDD37': "$\\mathfrak{z}$", // MATHEMATICAL FRAKTUR SMALL Z
	'\uD835\uDD38': "$\\mathbb{A}$", // MATHEMATICAL DOUBLE-STRUCK CAPITAL A
	'\uD835\uDD39': "$\\mathbb{B}$", // MATHEMATICAL DOUBLE-STRUCK CAPITAL B
	'\uD835\uDD3B': "$\\mathbb{D}$", // MATHEMATICAL DOUBLE-STRUCK CAPITAL D
	'\uD835\uDD3C': "$\\mathbb{E}$", // MATHEMATICAL DOUBLE-STRUCK CAPITAL E
	'\uD835\uDD3D': "$\\mathbb{F}$", // MATHEMATICAL DOUBLE-STRUCK CAPITAL F
	'\uD835\uDD3E': "$\\mathbb{G}$", // MATHEMATICAL DOUBLE-STRUCK CAPITAL G
	'\uD835\uDD40': "$\\mathbb{I}$", // MATHEMATICAL DOUBLE-STRUCK CAPITAL I
	'\uD835\uDD41': "$\\mathbb{J}$", // MATHEMATICAL DOUBLE-STRUCK CAPITAL J
	'\uD835\uDD42': "$\\mathbb{K}$", // MATHEMATICAL DOUBLE-STRUCK CAPITAL K
	'\uD835\uDD43': "$\\mathbb{L}$", // MATHEMATICAL DOUBLE-STRUCK CAPITAL L
	'\uD835\uDD44': "$\\mathbb{M}$", // MATHEMATICAL DOUBLE-STRUCK CAPITAL M
	'\uD835\uDD46': "$\\mathbb{O}$", // MATHEMATICAL DOUBLE-STRUCK CAPITAL O
	'\uD835\uDD4A': "$\\mathbb{S}$", // MATHEMATICAL DOUBLE-STRUCK CAPITAL S
	'\uD835\uDD4B': "$\\mathbb{T}$", // MATHEMATICAL DOUBLE-STRUCK CAPITAL T
	'\uD835\uDD4C': "$\\mathbb{U}$", // MATHEMATICAL DOUBLE-STRUCK CAPITAL U
	'\uD835\uDD4D': "$\\mathbb{V}$", // MATHEMATICAL DOUBLE-STRUCK CAPITAL V
	'\uD835\uDD4E': "$\\mathbb{W}$", // MATHEMATICAL DOUBLE-STRUCK CAPITAL W
	'\uD835\uDD4F': "$\\mathbb{X}$", // MATHEMATICAL DOUBLE-STRUCK CAPITAL X
	'\uD835\uDD50': "$\\mathbb{Y}$", // MATHEMATICAL DOUBLE-STRUCK CAPITAL Y
	'\uD835\uDD52': "$\\mathbb{a}$", // MATHEMATICAL DOUBLE-STRUCK SMALL A
	'\uD835\uDD53': "$\\mathbb{b}$", // MATHEMATICAL DOUBLE-STRUCK SMALL B
	'\uD835\uDD54': "$\\mathbb{c}$", // MATHEMATICAL DOUBLE-STRUCK SMALL C
	'\uD835\uDD55': "$\\mathbb{d}$", // MATHEMATICAL DOUBLE-STRUCK SMALL D
	'\uD835\uDD56': "$\\mathbb{e}$", // MATHEMATICAL DOUBLE-STRUCK SMALL E
	'\uD835\uDD57': "$\\mathbb{f}$", // MATHEMATICAL DOUBLE-STRUCK SMALL F
	'\uD835\uDD58': "$\\mathbb{g}$", // MATHEMATICAL DOUBLE-STRUCK SMALL G
	'\uD835\uDD59': "$\\mathbb{h}$", // MATHEMATICAL DOUBLE-STRUCK SMALL H
	'\uD835\uDD5A': "$\\mathbb{i}$", // MATHEMATICAL DOUBLE-STRUCK SMALL I
	'\uD835\uDD5B': "$\\mathbb{j}$", // MATHEMATICAL DOUBLE-STRUCK SMALL J
	'\uD835\uDD5C': "$\\mathbb{k}$", // MATHEMATICAL DOUBLE-STRUCK SMALL K
	'\uD835\uDD5D': "$\\mathbb{l}$", // MATHEMATICAL DOUBLE-STRUCK SMALL L
	'\uD835\uDD5E': "$\\mathbb{m}$", // MATHEMATICAL DOUBLE-STRUCK SMALL M
	'\uD835\uDD5F': "$\\mathbb{n}$", // MATHEMATICAL DOUBLE-STRUCK SMALL N
	'\uD835\uDD60': "$\\mathbb{o}$", // MATHEMATICAL DOUBLE-STRUCK SMALL O
	'\uD835\uDD61': "$\\mathbb{p}$", // MATHEMATICAL DOUBLE-STRUCK SMALL P
	'\uD835\uDD62': "$\\mathbb{q}$", // MATHEMATICAL DOUBLE-STRUCK SMALL Q
	'\uD835\uDD63': "$\\mathbb{r}$", // MATHEMATICAL DOUBLE-STRUCK SMALL R
	'\uD835\uDD64': "$\\mathbb{s}$", // MATHEMATICAL DOUBLE-STRUCK SMALL S
	'\uD835\uDD65': "$\\mathbb{t}$", // MATHEMATICAL DOUBLE-STRUCK SMALL T
	'\uD835\uDD66': "$\\mathbb{u}$", // MATHEMATICAL DOUBLE-STRUCK SMALL U
	'\uD835\uDD67': "$\\mathbb{v}$", // MATHEMATICAL DOUBLE-STRUCK SMALL V
	'\uD835\uDD68': "$\\mathbb{w}$", // MATHEMATICAL DOUBLE-STRUCK SMALL W
	'\uD835\uDD69': "$\\mathbb{x}$", // MATHEMATICAL DOUBLE-STRUCK SMALL X
	'\uD835\uDD6A': "$\\mathbb{y}$", // MATHEMATICAL DOUBLE-STRUCK SMALL Y
	'\uD835\uDD6B': "$\\mathbb{z}$", // MATHEMATICAL DOUBLE-STRUCK SMALL Z
	'\uD835\uDD6C': "$\\mathslbb{A}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL A
	'\uD835\uDD6D': "$\\mathslbb{B}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL B
	'\uD835\uDD6E': "$\\mathslbb{C}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL C
	'\uD835\uDD6F': "$\\mathslbb{D}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL D
	'\uD835\uDD70': "$\\mathslbb{E}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL E
	'\uD835\uDD71': "$\\mathslbb{F}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL F
	'\uD835\uDD72': "$\\mathslbb{G}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL G
	'\uD835\uDD73': "$\\mathslbb{H}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL H
	'\uD835\uDD74': "$\\mathslbb{I}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL I
	'\uD835\uDD75': "$\\mathslbb{J}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL J
	'\uD835\uDD76': "$\\mathslbb{K}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL K
	'\uD835\uDD77': "$\\mathslbb{L}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL L
	'\uD835\uDD78': "$\\mathslbb{M}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL M
	'\uD835\uDD79': "$\\mathslbb{N}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL N
	'\uD835\uDD7A': "$\\mathslbb{O}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL O
	'\uD835\uDD7B': "$\\mathslbb{P}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL P
	'\uD835\uDD7C': "$\\mathslbb{Q}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL Q
	'\uD835\uDD7D': "$\\mathslbb{R}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL R
	'\uD835\uDD7E': "$\\mathslbb{S}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL S
	'\uD835\uDD7F': "$\\mathslbb{T}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL T
	'\uD835\uDD80': "$\\mathslbb{U}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL U
	'\uD835\uDD81': "$\\mathslbb{V}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL V
	'\uD835\uDD82': "$\\mathslbb{W}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL W
	'\uD835\uDD83': "$\\mathslbb{X}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL X
	'\uD835\uDD84': "$\\mathslbb{Y}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL Y
	'\uD835\uDD85': "$\\mathslbb{Z}$", // MATHEMATICAL BOLD FRAKTUR CAPITAL Z
	'\uD835\uDD86': "$\\mathslbb{a}$", // MATHEMATICAL BOLD FRAKTUR SMALL A
	'\uD835\uDD87': "$\\mathslbb{b}$", // MATHEMATICAL BOLD FRAKTUR SMALL B
	'\uD835\uDD88': "$\\mathslbb{c}$", // MATHEMATICAL BOLD FRAKTUR SMALL C
	'\uD835\uDD89': "$\\mathslbb{d}$", // MATHEMATICAL BOLD FRAKTUR SMALL D
	'\uD835\uDD8A': "$\\mathslbb{e}$", // MATHEMATICAL BOLD FRAKTUR SMALL E
	'\uD835\uDD8B': "$\\mathslbb{f}$", // MATHEMATICAL BOLD FRAKTUR SMALL F
	'\uD835\uDD8C': "$\\mathslbb{g}$", // MATHEMATICAL BOLD FRAKTUR SMALL G
	'\uD835\uDD8D': "$\\mathslbb{h}$", // MATHEMATICAL BOLD FRAKTUR SMALL H
	'\uD835\uDD8E': "$\\mathslbb{i}$", // MATHEMATICAL BOLD FRAKTUR SMALL I
	'\uD835\uDD8F': "$\\mathslbb{j}$", // MATHEMATICAL BOLD FRAKTUR SMALL J
	'\uD835\uDD90': "$\\mathslbb{k}$", // MATHEMATICAL BOLD FRAKTUR SMALL K
	'\uD835\uDD91': "$\\mathslbb{l}$", // MATHEMATICAL BOLD FRAKTUR SMALL L
	'\uD835\uDD92': "$\\mathslbb{m}$", // MATHEMATICAL BOLD FRAKTUR SMALL M
	'\uD835\uDD93': "$\\mathslbb{n}$", // MATHEMATICAL BOLD FRAKTUR SMALL N
	'\uD835\uDD94': "$\\mathslbb{o}$", // MATHEMATICAL BOLD FRAKTUR SMALL O
	'\uD835\uDD95': "$\\mathslbb{p}$", // MATHEMATICAL BOLD FRAKTUR SMALL P
	'\uD835\uDD96': "$\\mathslbb{q}$", // MATHEMATICAL BOLD FRAKTUR SMALL Q
	'\uD835\uDD97': "$\\mathslbb{r}$", // MATHEMATICAL BOLD FRAKTUR SMALL R
	'\uD835\uDD98': "$\\mathslbb{s}$", // MATHEMATICAL BOLD FRAKTUR SMALL S
	'\uD835\uDD99': "$\\mathslbb{t}$", // MATHEMATICAL BOLD FRAKTUR SMALL T
	'\uD835\uDD9A': "$\\mathslbb{u}$", // MATHEMATICAL BOLD FRAKTUR SMALL U
	'\uD835\uDD9B': "$\\mathslbb{v}$", // MATHEMATICAL BOLD FRAKTUR SMALL V
	'\uD835\uDD9C': "$\\mathslbb{w}$", // MATHEMATICAL BOLD FRAKTUR SMALL W
	'\uD835\uDD9D': "$\\mathslbb{x}$", // MATHEMATICAL BOLD FRAKTUR SMALL X
	'\uD835\uDD9E': "$\\mathslbb{y}$", // MATHEMATICAL BOLD FRAKTUR SMALL Y
	'\uD835\uDD9F': "$\\mathslbb{z}$", // MATHEMATICAL BOLD FRAKTUR SMALL Z
	'\uD835\uDDA0': "$\\mathsf{A}$", // MATHEMATICAL SANS-SERIF CAPITAL A
	'\uD835\uDDA1': "$\\mathsf{B}$", // MATHEMATICAL SANS-SERIF CAPITAL B
	'\uD835\uDDA2': "$\\mathsf{C}$", // MATHEMATICAL SANS-SERIF CAPITAL C
	'\uD835\uDDA3': "$\\mathsf{D}$", // MATHEMATICAL SANS-SERIF CAPITAL D
	'\uD835\uDDA4': "$\\mathsf{E}$", // MATHEMATICAL SANS-SERIF CAPITAL E
	'\uD835\uDDA5': "$\\mathsf{F}$", // MATHEMATICAL SANS-SERIF CAPITAL F
	'\uD835\uDDA6': "$\\mathsf{G}$", // MATHEMATICAL SANS-SERIF CAPITAL G
	'\uD835\uDDA7': "$\\mathsf{H}$", // MATHEMATICAL SANS-SERIF CAPITAL H
	'\uD835\uDDA8': "$\\mathsf{I}$", // MATHEMATICAL SANS-SERIF CAPITAL I
	'\uD835\uDDA9': "$\\mathsf{J}$", // MATHEMATICAL SANS-SERIF CAPITAL J
	'\uD835\uDDAA': "$\\mathsf{K}$", // MATHEMATICAL SANS-SERIF CAPITAL K
	'\uD835\uDDAB': "$\\mathsf{L}$", // MATHEMATICAL SANS-SERIF CAPITAL L
	'\uD835\uDDAC': "$\\mathsf{M}$", // MATHEMATICAL SANS-SERIF CAPITAL M
	'\uD835\uDDAD': "$\\mathsf{N}$", // MATHEMATICAL SANS-SERIF CAPITAL N
	'\uD835\uDDAE': "$\\mathsf{O}$", // MATHEMATICAL SANS-SERIF CAPITAL O
	'\uD835\uDDAF': "$\\mathsf{P}$", // MATHEMATICAL SANS-SERIF CAPITAL P
	'\uD835\uDDB0': "$\\mathsf{Q}$", // MATHEMATICAL SANS-SERIF CAPITAL Q
	'\uD835\uDDB1': "$\\mathsf{R}$", // MATHEMATICAL SANS-SERIF CAPITAL R
	'\uD835\uDDB2': "$\\mathsf{S}$", // MATHEMATICAL SANS-SERIF CAPITAL S
	'\uD835\uDDB3': "$\\mathsf{T}$", // MATHEMATICAL SANS-SERIF CAPITAL T
	'\uD835\uDDB4': "$\\mathsf{U}$", // MATHEMATICAL SANS-SERIF CAPITAL U
	'\uD835\uDDB5': "$\\mathsf{V}$", // MATHEMATICAL SANS-SERIF CAPITAL V
	'\uD835\uDDB6': "$\\mathsf{W}$", // MATHEMATICAL SANS-SERIF CAPITAL W
	'\uD835\uDDB7': "$\\mathsf{X}$", // MATHEMATICAL SANS-SERIF CAPITAL X
	'\uD835\uDDB8': "$\\mathsf{Y}$", // MATHEMATICAL SANS-SERIF CAPITAL Y
	'\uD835\uDDB9': "$\\mathsf{Z}$", // MATHEMATICAL SANS-SERIF CAPITAL Z
	'\uD835\uDDBA': "$\\mathsf{a}$", // MATHEMATICAL SANS-SERIF SMALL A
	'\uD835\uDDBB': "$\\mathsf{b}$", // MATHEMATICAL SANS-SERIF SMALL B
	'\uD835\uDDBC': "$\\mathsf{c}$", // MATHEMATICAL SANS-SERIF SMALL C
	'\uD835\uDDBD': "$\\mathsf{d}$", // MATHEMATICAL SANS-SERIF SMALL D
	'\uD835\uDDBE': "$\\mathsf{e}$", // MATHEMATICAL SANS-SERIF SMALL E
	'\uD835\uDDBF': "$\\mathsf{f}$", // MATHEMATICAL SANS-SERIF SMALL F
	'\uD835\uDDC0': "$\\mathsf{g}$", // MATHEMATICAL SANS-SERIF SMALL G
	'\uD835\uDDC1': "$\\mathsf{h}$", // MATHEMATICAL SANS-SERIF SMALL H
	'\uD835\uDDC2': "$\\mathsf{i}$", // MATHEMATICAL SANS-SERIF SMALL I
	'\uD835\uDDC3': "$\\mathsf{j}$", // MATHEMATICAL SANS-SERIF SMALL J
	'\uD835\uDDC4': "$\\mathsf{k}$", // MATHEMATICAL SANS-SERIF SMALL K
	'\uD835\uDDC5': "$\\mathsf{l}$", // MATHEMATICAL SANS-SERIF SMALL L
	'\uD835\uDDC6': "$\\mathsf{m}$", // MATHEMATICAL SANS-SERIF SMALL M
	'\uD835\uDDC7': "$\\mathsf{n}$", // MATHEMATICAL SANS-SERIF SMALL N
	'\uD835\uDDC8': "$\\mathsf{o}$", // MATHEMATICAL SANS-SERIF SMALL O
	'\uD835\uDDC9': "$\\mathsf{p}$", // MATHEMATICAL SANS-SERIF SMALL P
	'\uD835\uDDCA': "$\\mathsf{q}$", // MATHEMATICAL SANS-SERIF SMALL Q
	'\uD835\uDDCB': "$\\mathsf{r}$", // MATHEMATICAL SANS-SERIF SMALL R
	'\uD835\uDDCC': "$\\mathsf{s}$", // MATHEMATICAL SANS-SERIF SMALL S
	'\uD835\uDDCD': "$\\mathsf{t}$", // MATHEMATICAL SANS-SERIF SMALL T
	'\uD835\uDDCE': "$\\mathsf{u}$", // MATHEMATICAL SANS-SERIF SMALL U
	'\uD835\uDDCF': "$\\mathsf{v}$", // MATHEMATICAL SANS-SERIF SMALL V
	'\uD835\uDDD0': "$\\mathsf{w}$", // MATHEMATICAL SANS-SERIF SMALL W
	'\uD835\uDDD1': "$\\mathsf{x}$", // MATHEMATICAL SANS-SERIF SMALL X
	'\uD835\uDDD2': "$\\mathsf{y}$", // MATHEMATICAL SANS-SERIF SMALL Y
	'\uD835\uDDD3': "$\\mathsf{z}$", // MATHEMATICAL SANS-SERIF SMALL Z
	'\uD835\uDDD4': "$\\mathsfbf{A}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL A
	'\uD835\uDDD5': "$\\mathsfbf{B}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL B
	'\uD835\uDDD6': "$\\mathsfbf{C}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL C
	'\uD835\uDDD7': "$\\mathsfbf{D}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL D
	'\uD835\uDDD8': "$\\mathsfbf{E}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL E
	'\uD835\uDDD9': "$\\mathsfbf{F}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL F
	'\uD835\uDDDA': "$\\mathsfbf{G}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL G
	'\uD835\uDDDB': "$\\mathsfbf{H}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL H
	'\uD835\uDDDC': "$\\mathsfbf{I}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL I
	'\uD835\uDDDD': "$\\mathsfbf{J}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL J
	'\uD835\uDDDE': "$\\mathsfbf{K}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL K
	'\uD835\uDDDF': "$\\mathsfbf{L}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL L
	'\uD835\uDDE0': "$\\mathsfbf{M}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL M
	'\uD835\uDDE1': "$\\mathsfbf{N}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL N
	'\uD835\uDDE2': "$\\mathsfbf{O}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL O
	'\uD835\uDDE3': "$\\mathsfbf{P}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL P
	'\uD835\uDDE4': "$\\mathsfbf{Q}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL Q
	'\uD835\uDDE5': "$\\mathsfbf{R}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL R
	'\uD835\uDDE6': "$\\mathsfbf{S}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL S
	'\uD835\uDDE7': "$\\mathsfbf{T}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL T
	'\uD835\uDDE8': "$\\mathsfbf{U}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL U
	'\uD835\uDDE9': "$\\mathsfbf{V}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL V
	'\uD835\uDDEA': "$\\mathsfbf{W}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL W
	'\uD835\uDDEB': "$\\mathsfbf{X}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL X
	'\uD835\uDDEC': "$\\mathsfbf{Y}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL Y
	'\uD835\uDDED': "$\\mathsfbf{Z}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL Z
	'\uD835\uDDEE': "$\\mathsfbf{a}$", // MATHEMATICAL SANS-SERIF BOLD SMALL A
	'\uD835\uDDEF': "$\\mathsfbf{b}$", // MATHEMATICAL SANS-SERIF BOLD SMALL B
	'\uD835\uDDF0': "$\\mathsfbf{c}$", // MATHEMATICAL SANS-SERIF BOLD SMALL C
	'\uD835\uDDF1': "$\\mathsfbf{d}$", // MATHEMATICAL SANS-SERIF BOLD SMALL D
	'\uD835\uDDF2': "$\\mathsfbf{e}$", // MATHEMATICAL SANS-SERIF BOLD SMALL E
	'\uD835\uDDF3': "$\\mathsfbf{f}$", // MATHEMATICAL SANS-SERIF BOLD SMALL F
	'\uD835\uDDF4': "$\\mathsfbf{g}$", // MATHEMATICAL SANS-SERIF BOLD SMALL G
	'\uD835\uDDF5': "$\\mathsfbf{h}$", // MATHEMATICAL SANS-SERIF BOLD SMALL H
	'\uD835\uDDF6': "$\\mathsfbf{i}$", // MATHEMATICAL SANS-SERIF BOLD SMALL I
	'\uD835\uDDF7': "$\\mathsfbf{j}$", // MATHEMATICAL SANS-SERIF BOLD SMALL J
	'\uD835\uDDF8': "$\\mathsfbf{k}$", // MATHEMATICAL SANS-SERIF BOLD SMALL K
	'\uD835\uDDF9': "$\\mathsfbf{l}$", // MATHEMATICAL SANS-SERIF BOLD SMALL L
	'\uD835\uDDFA': "$\\mathsfbf{m}$", // MATHEMATICAL SANS-SERIF BOLD SMALL M
	'\uD835\uDDFB': "$\\mathsfbf{n}$", // MATHEMATICAL SANS-SERIF BOLD SMALL N
	'\uD835\uDDFC': "$\\mathsfbf{o}$", // MATHEMATICAL SANS-SERIF BOLD SMALL O
	'\uD835\uDDFD': "$\\mathsfbf{p}$", // MATHEMATICAL SANS-SERIF BOLD SMALL P
	'\uD835\uDDFE': "$\\mathsfbf{q}$", // MATHEMATICAL SANS-SERIF BOLD SMALL Q
	'\uD835\uDDFF': "$\\mathsfbf{r}$", // MATHEMATICAL SANS-SERIF BOLD SMALL R
	'\uD835\uDE00': "$\\mathsfbf{s}$", // MATHEMATICAL SANS-SERIF BOLD SMALL S
	'\uD835\uDE01': "$\\mathsfbf{t}$", // MATHEMATICAL SANS-SERIF BOLD SMALL T
	'\uD835\uDE02': "$\\mathsfbf{u}$", // MATHEMATICAL SANS-SERIF BOLD SMALL U
	'\uD835\uDE03': "$\\mathsfbf{v}$", // MATHEMATICAL SANS-SERIF BOLD SMALL V
	'\uD835\uDE04': "$\\mathsfbf{w}$", // MATHEMATICAL SANS-SERIF BOLD SMALL W
	'\uD835\uDE05': "$\\mathsfbf{x}$", // MATHEMATICAL SANS-SERIF BOLD SMALL X
	'\uD835\uDE06': "$\\mathsfbf{y}$", // MATHEMATICAL SANS-SERIF BOLD SMALL Y
	'\uD835\uDE07': "$\\mathsfbf{z}$", // MATHEMATICAL SANS-SERIF BOLD SMALL Z
	'\uD835\uDE08': "$\\mathsfsl{A}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL A
	'\uD835\uDE09': "$\\mathsfsl{B}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL B
	'\uD835\uDE0A': "$\\mathsfsl{C}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL C
	'\uD835\uDE0B': "$\\mathsfsl{D}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL D
	'\uD835\uDE0C': "$\\mathsfsl{E}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL E
	'\uD835\uDE0D': "$\\mathsfsl{F}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL F
	'\uD835\uDE0E': "$\\mathsfsl{G}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL G
	'\uD835\uDE0F': "$\\mathsfsl{H}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL H
	'\uD835\uDE10': "$\\mathsfsl{I}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL I
	'\uD835\uDE11': "$\\mathsfsl{J}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL J
	'\uD835\uDE12': "$\\mathsfsl{K}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL K
	'\uD835\uDE13': "$\\mathsfsl{L}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL L
	'\uD835\uDE14': "$\\mathsfsl{M}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL M
	'\uD835\uDE15': "$\\mathsfsl{N}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL N
	'\uD835\uDE16': "$\\mathsfsl{O}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL O
	'\uD835\uDE17': "$\\mathsfsl{P}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL P
	'\uD835\uDE18': "$\\mathsfsl{Q}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL Q
	'\uD835\uDE19': "$\\mathsfsl{R}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL R
	'\uD835\uDE1A': "$\\mathsfsl{S}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL S
	'\uD835\uDE1B': "$\\mathsfsl{T}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL T
	'\uD835\uDE1C': "$\\mathsfsl{U}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL U
	'\uD835\uDE1D': "$\\mathsfsl{V}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL V
	'\uD835\uDE1E': "$\\mathsfsl{W}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL W
	'\uD835\uDE1F': "$\\mathsfsl{X}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL X
	'\uD835\uDE20': "$\\mathsfsl{Y}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL Y
	'\uD835\uDE21': "$\\mathsfsl{Z}$", // MATHEMATICAL SANS-SERIF ITALIC CAPITAL Z
	'\uD835\uDE22': "$\\mathsfsl{a}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL A
	'\uD835\uDE23': "$\\mathsfsl{b}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL B
	'\uD835\uDE24': "$\\mathsfsl{c}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL C
	'\uD835\uDE25': "$\\mathsfsl{d}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL D
	'\uD835\uDE26': "$\\mathsfsl{e}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL E
	'\uD835\uDE27': "$\\mathsfsl{f}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL F
	'\uD835\uDE28': "$\\mathsfsl{g}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL G
	'\uD835\uDE29': "$\\mathsfsl{h}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL H
	'\uD835\uDE2A': "$\\mathsfsl{i}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL I
	'\uD835\uDE2B': "$\\mathsfsl{j}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL J
	'\uD835\uDE2C': "$\\mathsfsl{k}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL K
	'\uD835\uDE2D': "$\\mathsfsl{l}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL L
	'\uD835\uDE2E': "$\\mathsfsl{m}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL M
	'\uD835\uDE2F': "$\\mathsfsl{n}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL N
	'\uD835\uDE30': "$\\mathsfsl{o}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL O
	'\uD835\uDE31': "$\\mathsfsl{p}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL P
	'\uD835\uDE32': "$\\mathsfsl{q}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL Q
	'\uD835\uDE33': "$\\mathsfsl{r}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL R
	'\uD835\uDE34': "$\\mathsfsl{s}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL S
	'\uD835\uDE35': "$\\mathsfsl{t}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL T
	'\uD835\uDE36': "$\\mathsfsl{u}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL U
	'\uD835\uDE37': "$\\mathsfsl{v}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL V
	'\uD835\uDE38': "$\\mathsfsl{w}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL W
	'\uD835\uDE39': "$\\mathsfsl{x}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL X
	'\uD835\uDE3A': "$\\mathsfsl{y}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL Y
	'\uD835\uDE3B': "$\\mathsfsl{z}$", // MATHEMATICAL SANS-SERIF ITALIC SMALL Z
	'\uD835\uDE3C': "$\\mathsfbfsl{A}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL A
	'\uD835\uDE3D': "$\\mathsfbfsl{B}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL B
	'\uD835\uDE3E': "$\\mathsfbfsl{C}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL C
	'\uD835\uDE3F': "$\\mathsfbfsl{D}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL D
	'\uD835\uDE40': "$\\mathsfbfsl{E}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL E
	'\uD835\uDE41': "$\\mathsfbfsl{F}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL F
	'\uD835\uDE42': "$\\mathsfbfsl{G}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL G
	'\uD835\uDE43': "$\\mathsfbfsl{H}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL H
	'\uD835\uDE44': "$\\mathsfbfsl{I}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL I
	'\uD835\uDE45': "$\\mathsfbfsl{J}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL J
	'\uD835\uDE46': "$\\mathsfbfsl{K}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL K
	'\uD835\uDE47': "$\\mathsfbfsl{L}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL L
	'\uD835\uDE48': "$\\mathsfbfsl{M}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL M
	'\uD835\uDE49': "$\\mathsfbfsl{N}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL N
	'\uD835\uDE4A': "$\\mathsfbfsl{O}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL O
	'\uD835\uDE4B': "$\\mathsfbfsl{P}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL P
	'\uD835\uDE4C': "$\\mathsfbfsl{Q}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL Q
	'\uD835\uDE4D': "$\\mathsfbfsl{R}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL R
	'\uD835\uDE4E': "$\\mathsfbfsl{S}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL S
	'\uD835\uDE4F': "$\\mathsfbfsl{T}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL T
	'\uD835\uDE50': "$\\mathsfbfsl{U}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL U
	'\uD835\uDE51': "$\\mathsfbfsl{V}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL V
	'\uD835\uDE52': "$\\mathsfbfsl{W}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL W
	'\uD835\uDE53': "$\\mathsfbfsl{X}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL X
	'\uD835\uDE54': "$\\mathsfbfsl{Y}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL Y
	'\uD835\uDE55': "$\\mathsfbfsl{Z}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL Z
	'\uD835\uDE56': "$\\mathsfbfsl{a}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL A
	'\uD835\uDE57': "$\\mathsfbfsl{b}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL B
	'\uD835\uDE58': "$\\mathsfbfsl{c}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL C
	'\uD835\uDE59': "$\\mathsfbfsl{d}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL D
	'\uD835\uDE5A': "$\\mathsfbfsl{e}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL E
	'\uD835\uDE5B': "$\\mathsfbfsl{f}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL F
	'\uD835\uDE5C': "$\\mathsfbfsl{g}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL G
	'\uD835\uDE5D': "$\\mathsfbfsl{h}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL H
	'\uD835\uDE5E': "$\\mathsfbfsl{i}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL I
	'\uD835\uDE5F': "$\\mathsfbfsl{j}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL J
	'\uD835\uDE60': "$\\mathsfbfsl{k}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL K
	'\uD835\uDE61': "$\\mathsfbfsl{l}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL L
	'\uD835\uDE62': "$\\mathsfbfsl{m}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL M
	'\uD835\uDE63': "$\\mathsfbfsl{n}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL N
	'\uD835\uDE64': "$\\mathsfbfsl{o}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL O
	'\uD835\uDE65': "$\\mathsfbfsl{p}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL P
	'\uD835\uDE66': "$\\mathsfbfsl{q}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL Q
	'\uD835\uDE67': "$\\mathsfbfsl{r}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL R
	'\uD835\uDE68': "$\\mathsfbfsl{s}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL S
	'\uD835\uDE69': "$\\mathsfbfsl{t}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL T
	'\uD835\uDE6A': "$\\mathsfbfsl{u}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL U
	'\uD835\uDE6B': "$\\mathsfbfsl{v}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL V
	'\uD835\uDE6C': "$\\mathsfbfsl{w}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL W
	'\uD835\uDE6D': "$\\mathsfbfsl{x}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL X
	'\uD835\uDE6E': "$\\mathsfbfsl{y}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL Y
	'\uD835\uDE6F': "$\\mathsfbfsl{z}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL Z
	'\uD835\uDE70': "$\\mathtt{A}$", // MATHEMATICAL MONOSPACE CAPITAL A
	'\uD835\uDE71': "$\\mathtt{B}$", // MATHEMATICAL MONOSPACE CAPITAL B
	'\uD835\uDE72': "$\\mathtt{C}$", // MATHEMATICAL MONOSPACE CAPITAL C
	'\uD835\uDE73': "$\\mathtt{D}$", // MATHEMATICAL MONOSPACE CAPITAL D
	'\uD835\uDE74': "$\\mathtt{E}$", // MATHEMATICAL MONOSPACE CAPITAL E
	'\uD835\uDE75': "$\\mathtt{F}$", // MATHEMATICAL MONOSPACE CAPITAL F
	'\uD835\uDE76': "$\\mathtt{G}$", // MATHEMATICAL MONOSPACE CAPITAL G
	'\uD835\uDE77': "$\\mathtt{H}$", // MATHEMATICAL MONOSPACE CAPITAL H
	'\uD835\uDE78': "$\\mathtt{I}$", // MATHEMATICAL MONOSPACE CAPITAL I
	'\uD835\uDE79': "$\\mathtt{J}$", // MATHEMATICAL MONOSPACE CAPITAL J
	'\uD835\uDE7A': "$\\mathtt{K}$", // MATHEMATICAL MONOSPACE CAPITAL K
	'\uD835\uDE7B': "$\\mathtt{L}$", // MATHEMATICAL MONOSPACE CAPITAL L
	'\uD835\uDE7C': "$\\mathtt{M}$", // MATHEMATICAL MONOSPACE CAPITAL M
	'\uD835\uDE7D': "$\\mathtt{N}$", // MATHEMATICAL MONOSPACE CAPITAL N
	'\uD835\uDE7E': "$\\mathtt{O}$", // MATHEMATICAL MONOSPACE CAPITAL O
	'\uD835\uDE7F': "$\\mathtt{P}$", // MATHEMATICAL MONOSPACE CAPITAL P
	'\uD835\uDE80': "$\\mathtt{Q}$", // MATHEMATICAL MONOSPACE CAPITAL Q
	'\uD835\uDE81': "$\\mathtt{R}$", // MATHEMATICAL MONOSPACE CAPITAL R
	'\uD835\uDE82': "$\\mathtt{S}$", // MATHEMATICAL MONOSPACE CAPITAL S
	'\uD835\uDE83': "$\\mathtt{T}$", // MATHEMATICAL MONOSPACE CAPITAL T
	'\uD835\uDE84': "$\\mathtt{U}$", // MATHEMATICAL MONOSPACE CAPITAL U
	'\uD835\uDE85': "$\\mathtt{V}$", // MATHEMATICAL MONOSPACE CAPITAL V
	'\uD835\uDE86': "$\\mathtt{W}$", // MATHEMATICAL MONOSPACE CAPITAL W
	'\uD835\uDE87': "$\\mathtt{X}$", // MATHEMATICAL MONOSPACE CAPITAL X
	'\uD835\uDE88': "$\\mathtt{Y}$", // MATHEMATICAL MONOSPACE CAPITAL Y
	'\uD835\uDE89': "$\\mathtt{Z}$", // MATHEMATICAL MONOSPACE CAPITAL Z
	'\uD835\uDE8A': "$\\mathtt{a}$", // MATHEMATICAL MONOSPACE SMALL A
	'\uD835\uDE8B': "$\\mathtt{b}$", // MATHEMATICAL MONOSPACE SMALL B
	'\uD835\uDE8C': "$\\mathtt{c}$", // MATHEMATICAL MONOSPACE SMALL C
	'\uD835\uDE8D': "$\\mathtt{d}$", // MATHEMATICAL MONOSPACE SMALL D
	'\uD835\uDE8E': "$\\mathtt{e}$", // MATHEMATICAL MONOSPACE SMALL E
	'\uD835\uDE8F': "$\\mathtt{f}$", // MATHEMATICAL MONOSPACE SMALL F
	'\uD835\uDE90': "$\\mathtt{g}$", // MATHEMATICAL MONOSPACE SMALL G
	'\uD835\uDE91': "$\\mathtt{h}$", // MATHEMATICAL MONOSPACE SMALL H
	'\uD835\uDE92': "$\\mathtt{i}$", // MATHEMATICAL MONOSPACE SMALL I
	'\uD835\uDE93': "$\\mathtt{j}$", // MATHEMATICAL MONOSPACE SMALL J
	'\uD835\uDE94': "$\\mathtt{k}$", // MATHEMATICAL MONOSPACE SMALL K
	'\uD835\uDE95': "$\\mathtt{l}$", // MATHEMATICAL MONOSPACE SMALL L
	'\uD835\uDE96': "$\\mathtt{m}$", // MATHEMATICAL MONOSPACE SMALL M
	'\uD835\uDE97': "$\\mathtt{n}$", // MATHEMATICAL MONOSPACE SMALL N
	'\uD835\uDE98': "$\\mathtt{o}$", // MATHEMATICAL MONOSPACE SMALL O
	'\uD835\uDE99': "$\\mathtt{p}$", // MATHEMATICAL MONOSPACE SMALL P
	'\uD835\uDE9A': "$\\mathtt{q}$", // MATHEMATICAL MONOSPACE SMALL Q
	'\uD835\uDE9B': "$\\mathtt{r}$", // MATHEMATICAL MONOSPACE SMALL R
	'\uD835\uDE9C': "$\\mathtt{s}$", // MATHEMATICAL MONOSPACE SMALL S
	'\uD835\uDE9D': "$\\mathtt{t}$", // MATHEMATICAL MONOSPACE SMALL T
	'\uD835\uDE9E': "$\\mathtt{u}$", // MATHEMATICAL MONOSPACE SMALL U
	'\uD835\uDE9F': "$\\mathtt{v}$", // MATHEMATICAL MONOSPACE SMALL V
	'\uD835\uDEA0': "$\\mathtt{w}$", // MATHEMATICAL MONOSPACE SMALL W
	'\uD835\uDEA1': "$\\mathtt{x}$", // MATHEMATICAL MONOSPACE SMALL X
	'\uD835\uDEA2': "$\\mathtt{y}$", // MATHEMATICAL MONOSPACE SMALL Y
	'\uD835\uDEA3': "$\\mathtt{z}$", // MATHEMATICAL MONOSPACE SMALL Z
	'\uD835\uDEA4': "$\\imath{}$", // MATHEMATICAL ITALIC SMALL DOTLESS I
	'\uD835\uDEA5': "$\\jmath{}$", // MATHEMATICAL ITALIC SMALL DOTLESS J
	'\uD835\uDEA8': "$\\mathbf{\\Alpha}$", // MATHEMATICAL BOLD CAPITAL ALPHA
	'\uD835\uDEA9': "$\\mathbf{\\Beta}$", // MATHEMATICAL BOLD CAPITAL BETA
	'\uD835\uDEAA': "$\\mathbf{\\Gamma}$", // MATHEMATICAL BOLD CAPITAL GAMMA
	'\uD835\uDEAB': "$\\mathbf{\\Delta}$", // MATHEMATICAL BOLD CAPITAL DELTA
	'\uD835\uDEAC': "$\\mathbf{\\Epsilon}$", // MATHEMATICAL BOLD CAPITAL EPSILON
	'\uD835\uDEAD': "$\\mathbf{\\Zeta}$", // MATHEMATICAL BOLD CAPITAL ZETA
	'\uD835\uDEAE': "$\\mathbf{\\Eta}$", // MATHEMATICAL BOLD CAPITAL ETA
	'\uD835\uDEAF': "$\\mathbf{\\Theta}$", // MATHEMATICAL BOLD CAPITAL THETA
	'\uD835\uDEB0': "$\\mathbf{\\Iota}$", // MATHEMATICAL BOLD CAPITAL IOTA
	'\uD835\uDEB1': "$\\mathbf{\\Kappa}$", // MATHEMATICAL BOLD CAPITAL KAPPA
	'\uD835\uDEB2': "$\\mathbf{\\Lambda}$", // MATHEMATICAL BOLD CAPITAL LAMDA
	'\uD835\uDEB3': "$M$", // MATHEMATICAL BOLD CAPITAL MU
	'\uD835\uDEB4': "$N$", // MATHEMATICAL BOLD CAPITAL NU
	'\uD835\uDEB5': "$\\mathbf{\\Xi}$", // MATHEMATICAL BOLD CAPITAL XI
	'\uD835\uDEB6': "$O$", // MATHEMATICAL BOLD CAPITAL OMICRON
	'\uD835\uDEB7': "$\\mathbf{\\Pi}$", // MATHEMATICAL BOLD CAPITAL PI
	'\uD835\uDEB8': "$\\mathbf{\\Rho}$", // MATHEMATICAL BOLD CAPITAL RHO
	'\uD835\uDEB9': "\\mathbf{\\vartheta}", // MATHEMATICAL BOLD CAPITAL THETA SYMBOL
	'\uD835\uDEBA': "$\\mathbf{\\Sigma}$", // MATHEMATICAL BOLD CAPITAL SIGMA
	'\uD835\uDEBB': "$\\mathbf{\\Tau}$", // MATHEMATICAL BOLD CAPITAL TAU
	'\uD835\uDEBC': "$\\mathbf{\\Upsilon}$", // MATHEMATICAL BOLD CAPITAL UPSILON
	'\uD835\uDEBD': "$\\mathbf{\\Phi}$", // MATHEMATICAL BOLD CAPITAL PHI
	'\uD835\uDEBE': "$\\mathbf{\\Chi}$", // MATHEMATICAL BOLD CAPITAL CHI
	'\uD835\uDEBF': "$\\mathbf{\\Psi}$", // MATHEMATICAL BOLD CAPITAL PSI
	'\uD835\uDEC0': "$\\mathbf{\\Omega}$", // MATHEMATICAL BOLD CAPITAL OMEGA
	'\uD835\uDEC1': "$\\mathbf{\\nabla}$", // MATHEMATICAL BOLD NABLA
	'\uD835\uDEC2': "$\\mathbf{\\Alpha}$", // MATHEMATICAL BOLD SMALL ALPHA
	'\uD835\uDEC3': "$\\mathbf{\\Beta}$", // MATHEMATICAL BOLD SMALL BETA
	'\uD835\uDEC4': "$\\mathbf{\\Gamma}$", // MATHEMATICAL BOLD SMALL GAMMA
	'\uD835\uDEC5': "$\\mathbf{\\Delta}$", // MATHEMATICAL BOLD SMALL DELTA
	'\uD835\uDEC6': "$\\mathbf{\\Epsilon}$", // MATHEMATICAL BOLD SMALL EPSILON
	'\uD835\uDEC7': "$\\mathbf{\\Zeta}$", // MATHEMATICAL BOLD SMALL ZETA
	'\uD835\uDEC8': "$\\mathbf{\\Eta}$", // MATHEMATICAL BOLD SMALL ETA
	'\uD835\uDEC9': "$\\mathbf{\\theta}$", // MATHEMATICAL BOLD SMALL THETA
	'\uD835\uDECA': "$\\mathbf{\\Iota}$", // MATHEMATICAL BOLD SMALL IOTA
	'\uD835\uDECB': "$\\mathbf{\\Kappa}$", // MATHEMATICAL BOLD SMALL KAPPA
	'\uD835\uDECC': "$\\mathbf{\\Lambda}$", // MATHEMATICAL BOLD SMALL LAMDA
	'\uD835\uDECD': "$M$", // MATHEMATICAL BOLD SMALL MU
	'\uD835\uDECE': "$N$", // MATHEMATICAL BOLD SMALL NU
	'\uD835\uDECF': "$\\mathbf{\\Xi}$", // MATHEMATICAL BOLD SMALL XI
	'\uD835\uDED0': "$O$", // MATHEMATICAL BOLD SMALL OMICRON
	'\uD835\uDED1': "$\\mathbf{\\Pi}$", // MATHEMATICAL BOLD SMALL PI
	'\uD835\uDED2': "$\\mathbf{\\Rho}$", // MATHEMATICAL BOLD SMALL RHO
	'\uD835\uDED3': "$\\mathbf{\\varsigma}$", // MATHEMATICAL BOLD SMALL FINAL SIGMA
	'\uD835\uDED4': "$\\mathbf{\\Sigma}$", // MATHEMATICAL BOLD SMALL SIGMA
	'\uD835\uDED5': "$\\mathbf{\\Tau}$", // MATHEMATICAL BOLD SMALL TAU
	'\uD835\uDED6': "$\\mathbf{\\Upsilon}$", // MATHEMATICAL BOLD SMALL UPSILON
	'\uD835\uDED7': "$\\mathbf{\\Phi}$", // MATHEMATICAL BOLD SMALL PHI
	'\uD835\uDED8': "$\\mathbf{\\Chi}$", // MATHEMATICAL BOLD SMALL CHI
	'\uD835\uDED9': "$\\mathbf{\\Psi}$", // MATHEMATICAL BOLD SMALL PSI
	'\uD835\uDEDA': "$\\mathbf{\\Omega}$", // MATHEMATICAL BOLD SMALL OMEGA
	'\uD835\uDEDB': "$\\partial{}$", // MATHEMATICAL BOLD PARTIAL DIFFERENTIAL
	'\uD835\uDEDC': "$\\in{}$", // MATHEMATICAL BOLD EPSILON SYMBOL
	'\uD835\uDEDD': "\\mathbf{\\vartheta}", // MATHEMATICAL BOLD THETA SYMBOL
	'\uD835\uDEDE': "\\mathbf{\\varkappa}", // MATHEMATICAL BOLD KAPPA SYMBOL
	'\uD835\uDEDF': "\\mathbf{\\phi}", // MATHEMATICAL BOLD PHI SYMBOL
	'\uD835\uDEE0': "\\mathbf{\\varrho}", // MATHEMATICAL BOLD RHO SYMBOL
	'\uD835\uDEE1': "\\mathbf{\\varpi}", // MATHEMATICAL BOLD PI SYMBOL
	'\uD835\uDEE2': "$\\mathsl{\\Alpha}$", // MATHEMATICAL ITALIC CAPITAL ALPHA
	'\uD835\uDEE3': "$\\mathsl{\\Beta}$", // MATHEMATICAL ITALIC CAPITAL BETA
	'\uD835\uDEE4': "$\\mathsl{\\Gamma}$", // MATHEMATICAL ITALIC CAPITAL GAMMA
	'\uD835\uDEE5': "$\\mathsl{\\Delta}$", // MATHEMATICAL ITALIC CAPITAL DELTA
	'\uD835\uDEE6': "$\\mathsl{\\Epsilon}$", // MATHEMATICAL ITALIC CAPITAL EPSILON
	'\uD835\uDEE7': "$\\mathsl{\\Zeta}$", // MATHEMATICAL ITALIC CAPITAL ZETA
	'\uD835\uDEE8': "$\\mathsl{\\Eta}$", // MATHEMATICAL ITALIC CAPITAL ETA
	'\uD835\uDEE9': "$\\mathsl{\\Theta}$", // MATHEMATICAL ITALIC CAPITAL THETA
	'\uD835\uDEEA': "$\\mathsl{\\Iota}$", // MATHEMATICAL ITALIC CAPITAL IOTA
	'\uD835\uDEEB': "$\\mathsl{\\Kappa}$", // MATHEMATICAL ITALIC CAPITAL KAPPA
	'\uD835\uDEEC': "$\\mathsl{\\Lambda}$", // MATHEMATICAL ITALIC CAPITAL LAMDA
	'\uD835\uDEED': "$M$", // MATHEMATICAL ITALIC CAPITAL MU
	'\uD835\uDEEE': "$N$", // MATHEMATICAL ITALIC CAPITAL NU
	'\uD835\uDEEF': "$\\mathsl{\\Xi}$", // MATHEMATICAL ITALIC CAPITAL XI
	'\uD835\uDEF0': "$O$", // MATHEMATICAL ITALIC CAPITAL OMICRON
	'\uD835\uDEF1': "$\\mathsl{\\Pi}$", // MATHEMATICAL ITALIC CAPITAL PI
	'\uD835\uDEF2': "$\\mathsl{\\Rho}$", // MATHEMATICAL ITALIC CAPITAL RHO
	'\uD835\uDEF3': "\\mathsl{\\vartheta}", // MATHEMATICAL ITALIC CAPITAL THETA SYMBOL
	'\uD835\uDEF4': "$\\mathsl{\\Sigma}$", // MATHEMATICAL ITALIC CAPITAL SIGMA
	'\uD835\uDEF5': "$\\mathsl{\\Tau}$", // MATHEMATICAL ITALIC CAPITAL TAU
	'\uD835\uDEF6': "$\\mathsl{\\Upsilon}$", // MATHEMATICAL ITALIC CAPITAL UPSILON
	'\uD835\uDEF7': "$\\mathsl{\\Phi}$", // MATHEMATICAL ITALIC CAPITAL PHI
	'\uD835\uDEF8': "$\\mathsl{\\Chi}$", // MATHEMATICAL ITALIC CAPITAL CHI
	'\uD835\uDEF9': "$\\mathsl{\\Psi}$", // MATHEMATICAL ITALIC CAPITAL PSI
	'\uD835\uDEFA': "$\\mathsl{\\Omega}$", // MATHEMATICAL ITALIC CAPITAL OMEGA
	'\uD835\uDEFB': "$\\mathsl{\\nabla}$", // MATHEMATICAL ITALIC NABLA
	'\uD835\uDEFC': "$\\mathsl{\\Alpha}$", // MATHEMATICAL ITALIC SMALL ALPHA
	'\uD835\uDEFD': "$\\mathsl{\\Beta}$", // MATHEMATICAL ITALIC SMALL BETA
	'\uD835\uDEFE': "$\\mathsl{\\Gamma}$", // MATHEMATICAL ITALIC SMALL GAMMA
	'\uD835\uDEFF': "$\\mathsl{\\Delta}$", // MATHEMATICAL ITALIC SMALL DELTA
	'\uD835\uDF00': "$\\mathsl{\\Epsilon}$", // MATHEMATICAL ITALIC SMALL EPSILON
	'\uD835\uDF01': "$\\mathsl{\\Zeta}$", // MATHEMATICAL ITALIC SMALL ZETA
	'\uD835\uDF02': "$\\mathsl{\\Eta}$", // MATHEMATICAL ITALIC SMALL ETA
	'\uD835\uDF03': "$\\mathsl{\\Theta}$", // MATHEMATICAL ITALIC SMALL THETA
	'\uD835\uDF04': "$\\mathsl{\\Iota}$", // MATHEMATICAL ITALIC SMALL IOTA
	'\uD835\uDF05': "$\\mathsl{\\Kappa}$", // MATHEMATICAL ITALIC SMALL KAPPA
	'\uD835\uDF06': "$\\mathsl{\\Lambda}$", // MATHEMATICAL ITALIC SMALL LAMDA
	'\uD835\uDF07': "$M$", // MATHEMATICAL ITALIC SMALL MU
	'\uD835\uDF08': "$N$", // MATHEMATICAL ITALIC SMALL NU
	'\uD835\uDF09': "$\\mathsl{\\Xi}$", // MATHEMATICAL ITALIC SMALL XI
	'\uD835\uDF0A': "$O$", // MATHEMATICAL ITALIC SMALL OMICRON
	'\uD835\uDF0B': "$\\mathsl{\\Pi}$", // MATHEMATICAL ITALIC SMALL PI
	'\uD835\uDF0C': "$\\mathsl{\\Rho}$", // MATHEMATICAL ITALIC SMALL RHO
	'\uD835\uDF0D': "$\\mathsl{\\varsigma}$", // MATHEMATICAL ITALIC SMALL FINAL SIGMA
	'\uD835\uDF0E': "$\\mathsl{\\Sigma}$", // MATHEMATICAL ITALIC SMALL SIGMA
	'\uD835\uDF0F': "$\\mathsl{\\Tau}$", // MATHEMATICAL ITALIC SMALL TAU
	'\uD835\uDF10': "$\\mathsl{\\Upsilon}$", // MATHEMATICAL ITALIC SMALL UPSILON
	'\uD835\uDF11': "$\\mathsl{\\Phi}$", // MATHEMATICAL ITALIC SMALL PHI
	'\uD835\uDF12': "$\\mathsl{\\Chi}$", // MATHEMATICAL ITALIC SMALL CHI
	'\uD835\uDF13': "$\\mathsl{\\Psi}$", // MATHEMATICAL ITALIC SMALL PSI
	'\uD835\uDF14': "$\\mathsl{\\Omega}$", // MATHEMATICAL ITALIC SMALL OMEGA
	'\uD835\uDF15': "$\\partial{}$", // MATHEMATICAL ITALIC PARTIAL DIFFERENTIAL
	'\uD835\uDF16': "$\\in{}$", // MATHEMATICAL ITALIC EPSILON SYMBOL
	'\uD835\uDF17': "\\mathsl{\\vartheta}", // MATHEMATICAL ITALIC THETA SYMBOL
	'\uD835\uDF18': "\\mathsl{\\varkappa}", // MATHEMATICAL ITALIC KAPPA SYMBOL
	'\uD835\uDF19': "\\mathsl{\\phi}", // MATHEMATICAL ITALIC PHI SYMBOL
	'\uD835\uDF1A': "\\mathsl{\\varrho}", // MATHEMATICAL ITALIC RHO SYMBOL
	'\uD835\uDF1B': "\\mathsl{\\varpi}", // MATHEMATICAL ITALIC PI SYMBOL
	'\uD835\uDF1C': "$\\mathbit{\\Alpha}$", // MATHEMATICAL BOLD ITALIC CAPITAL ALPHA
	'\uD835\uDF1D': "$\\mathbit{\\Beta}$", // MATHEMATICAL BOLD ITALIC CAPITAL BETA
	'\uD835\uDF1E': "$\\mathbit{\\Gamma}$", // MATHEMATICAL BOLD ITALIC CAPITAL GAMMA
	'\uD835\uDF1F': "$\\mathbit{\\Delta}$", // MATHEMATICAL BOLD ITALIC CAPITAL DELTA
	'\uD835\uDF20': "$\\mathbit{\\Epsilon}$", // MATHEMATICAL BOLD ITALIC CAPITAL EPSILON
	'\uD835\uDF21': "$\\mathbit{\\Zeta}$", // MATHEMATICAL BOLD ITALIC CAPITAL ZETA
	'\uD835\uDF22': "$\\mathbit{\\Eta}$", // MATHEMATICAL BOLD ITALIC CAPITAL ETA
	'\uD835\uDF23': "$\\mathbit{\\Theta}$", // MATHEMATICAL BOLD ITALIC CAPITAL THETA
	'\uD835\uDF24': "$\\mathbit{\\Iota}$", // MATHEMATICAL BOLD ITALIC CAPITAL IOTA
	'\uD835\uDF25': "$\\mathbit{\\Kappa}$", // MATHEMATICAL BOLD ITALIC CAPITAL KAPPA
	'\uD835\uDF26': "$\\mathbit{\\Lambda}$", // MATHEMATICAL BOLD ITALIC CAPITAL LAMDA
	'\uD835\uDF27': "$M$", // MATHEMATICAL BOLD ITALIC CAPITAL MU
	'\uD835\uDF28': "$N$", // MATHEMATICAL BOLD ITALIC CAPITAL NU
	'\uD835\uDF29': "$\\mathbit{\\Xi}$", // MATHEMATICAL BOLD ITALIC CAPITAL XI
	'\uD835\uDF2A': "$O$", // MATHEMATICAL BOLD ITALIC CAPITAL OMICRON
	'\uD835\uDF2B': "$\\mathbit{\\Pi}$", // MATHEMATICAL BOLD ITALIC CAPITAL PI
	'\uD835\uDF2C': "$\\mathbit{\\Rho}$", // MATHEMATICAL BOLD ITALIC CAPITAL RHO
	'\uD835\uDF2D': "\\mathbit{O}", // MATHEMATICAL BOLD ITALIC CAPITAL THETA SYMBOL
	'\uD835\uDF2E': "$\\mathbit{\\Sigma}$", // MATHEMATICAL BOLD ITALIC CAPITAL SIGMA
	'\uD835\uDF2F': "$\\mathbit{\\Tau}$", // MATHEMATICAL BOLD ITALIC CAPITAL TAU
	'\uD835\uDF30': "$\\mathbit{\\Upsilon}$", // MATHEMATICAL BOLD ITALIC CAPITAL UPSILON
	'\uD835\uDF31': "$\\mathbit{\\Phi}$", // MATHEMATICAL BOLD ITALIC CAPITAL PHI
	'\uD835\uDF32': "$\\mathbit{\\Chi}$", // MATHEMATICAL BOLD ITALIC CAPITAL CHI
	'\uD835\uDF33': "$\\mathbit{\\Psi}$", // MATHEMATICAL BOLD ITALIC CAPITAL PSI
	'\uD835\uDF34': "$\\mathbit{\\Omega}$", // MATHEMATICAL BOLD ITALIC CAPITAL OMEGA
	'\uD835\uDF35': "$\\mathbit{\\nabla}$", // MATHEMATICAL BOLD ITALIC NABLA
	'\uD835\uDF36': "$\\mathbit{\\Alpha}$", // MATHEMATICAL BOLD ITALIC SMALL ALPHA
	'\uD835\uDF37': "$\\mathbit{\\Beta}$", // MATHEMATICAL BOLD ITALIC SMALL BETA
	'\uD835\uDF38': "$\\mathbit{\\Gamma}$", // MATHEMATICAL BOLD ITALIC SMALL GAMMA
	'\uD835\uDF39': "$\\mathbit{\\Delta}$", // MATHEMATICAL BOLD ITALIC SMALL DELTA
	'\uD835\uDF3A': "$\\mathbit{\\Epsilon}$", // MATHEMATICAL BOLD ITALIC SMALL EPSILON
	'\uD835\uDF3B': "$\\mathbit{\\Zeta}$", // MATHEMATICAL BOLD ITALIC SMALL ZETA
	'\uD835\uDF3C': "$\\mathbit{\\Eta}$", // MATHEMATICAL BOLD ITALIC SMALL ETA
	'\uD835\uDF3D': "$\\mathbit{\\Theta}$", // MATHEMATICAL BOLD ITALIC SMALL THETA
	'\uD835\uDF3E': "$\\mathbit{\\Iota}$", // MATHEMATICAL BOLD ITALIC SMALL IOTA
	'\uD835\uDF3F': "$\\mathbit{\\Kappa}$", // MATHEMATICAL BOLD ITALIC SMALL KAPPA
	'\uD835\uDF40': "$\\mathbit{\\Lambda}$", // MATHEMATICAL BOLD ITALIC SMALL LAMDA
	'\uD835\uDF41': "$M$", // MATHEMATICAL BOLD ITALIC SMALL MU
	'\uD835\uDF42': "$N$", // MATHEMATICAL BOLD ITALIC SMALL NU
	'\uD835\uDF43': "$\\mathbit{\\Xi}$", // MATHEMATICAL BOLD ITALIC SMALL XI
	'\uD835\uDF44': "$O$", // MATHEMATICAL BOLD ITALIC SMALL OMICRON
	'\uD835\uDF45': "$\\mathbit{\\Pi}$", // MATHEMATICAL BOLD ITALIC SMALL PI
	'\uD835\uDF46': "$\\mathbit{\\Rho}$", // MATHEMATICAL BOLD ITALIC SMALL RHO
	'\uD835\uDF47': "$\\mathbit{\\varsigma}$", // MATHEMATICAL BOLD ITALIC SMALL FINAL SIGMA
	'\uD835\uDF48': "$\\mathbit{\\Sigma}$", // MATHEMATICAL BOLD ITALIC SMALL SIGMA
	'\uD835\uDF49': "$\\mathbit{\\Tau}$", // MATHEMATICAL BOLD ITALIC SMALL TAU
	'\uD835\uDF4A': "$\\mathbit{\\Upsilon}$", // MATHEMATICAL BOLD ITALIC SMALL UPSILON
	'\uD835\uDF4B': "$\\mathbit{\\Phi}$", // MATHEMATICAL BOLD ITALIC SMALL PHI
	'\uD835\uDF4C': "$\\mathbit{\\Chi}$", // MATHEMATICAL BOLD ITALIC SMALL CHI
	'\uD835\uDF4D': "$\\mathbit{\\Psi}$", // MATHEMATICAL BOLD ITALIC SMALL PSI
	'\uD835\uDF4E': "$\\mathbit{\\Omega}$", // MATHEMATICAL BOLD ITALIC SMALL OMEGA
	'\uD835\uDF4F': "$\\partial{}$", // MATHEMATICAL BOLD ITALIC PARTIAL DIFFERENTIAL
	'\uD835\uDF50': "$\\in{}$", // MATHEMATICAL BOLD ITALIC EPSILON SYMBOL
	'\uD835\uDF51': "\\mathbit{\\vartheta}", // MATHEMATICAL BOLD ITALIC THETA SYMBOL
	'\uD835\uDF52': "\\mathbit{\\varkappa}", // MATHEMATICAL BOLD ITALIC KAPPA SYMBOL
	'\uD835\uDF53': "\\mathbit{\\phi}", // MATHEMATICAL BOLD ITALIC PHI SYMBOL
	'\uD835\uDF54': "\\mathbit{\\varrho}", // MATHEMATICAL BOLD ITALIC RHO SYMBOL
	'\uD835\uDF55': "\\mathbit{\\varpi}", // MATHEMATICAL BOLD ITALIC PI SYMBOL
	'\uD835\uDF56': "$\\mathsfbf{\\Alpha}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL ALPHA
	'\uD835\uDF57': "$\\mathsfbf{\\Beta}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL BETA
	'\uD835\uDF58': "$\\mathsfbf{\\Gamma}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL GAMMA
	'\uD835\uDF59': "$\\mathsfbf{\\Delta}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL DELTA
	'\uD835\uDF5A': "$\\mathsfbf{\\Epsilon}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL EPSILON
	'\uD835\uDF5B': "$\\mathsfbf{\\Zeta}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL ZETA
	'\uD835\uDF5C': "$\\mathsfbf{\\Eta}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL ETA
	'\uD835\uDF5D': "$\\mathsfbf{\\Theta}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL THETA
	'\uD835\uDF5E': "$\\mathsfbf{\\Iota}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL IOTA
	'\uD835\uDF5F': "$\\mathsfbf{\\Kappa}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL KAPPA
	'\uD835\uDF60': "$\\mathsfbf{\\Lambda}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL LAMDA
	'\uD835\uDF61': "$M$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL MU
	'\uD835\uDF62': "$N$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL NU
	'\uD835\uDF63': "$\\mathsfbf{\\Xi}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL XI
	'\uD835\uDF64': "$O$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL OMICRON
	'\uD835\uDF65': "$\\mathsfbf{\\Pi}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL PI
	'\uD835\uDF66': "$\\mathsfbf{\\Rho}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL RHO
	'\uD835\uDF67': "\\mathsfbf{\\vartheta}", // MATHEMATICAL SANS-SERIF BOLD CAPITAL THETA SYMBOL
	'\uD835\uDF68': "$\\mathsfbf{\\Sigma}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL SIGMA
	'\uD835\uDF69': "$\\mathsfbf{\\Tau}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL TAU
	'\uD835\uDF6A': "$\\mathsfbf{\\Upsilon}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL UPSILON
	'\uD835\uDF6B': "$\\mathsfbf{\\Phi}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL PHI
	'\uD835\uDF6C': "$\\mathsfbf{\\Chi}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL CHI
	'\uD835\uDF6D': "$\\mathsfbf{\\Psi}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL PSI
	'\uD835\uDF6E': "$\\mathsfbf{\\Omega}$", // MATHEMATICAL SANS-SERIF BOLD CAPITAL OMEGA
	'\uD835\uDF6F': "$\\mathsfbf{\\nabla}$", // MATHEMATICAL SANS-SERIF BOLD NABLA
	'\uD835\uDF70': "$\\mathsfbf{\\Alpha}$", // MATHEMATICAL SANS-SERIF BOLD SMALL ALPHA
	'\uD835\uDF71': "$\\mathsfbf{\\Beta}$", // MATHEMATICAL SANS-SERIF BOLD SMALL BETA
	'\uD835\uDF72': "$\\mathsfbf{\\Gamma}$", // MATHEMATICAL SANS-SERIF BOLD SMALL GAMMA
	'\uD835\uDF73': "$\\mathsfbf{\\Delta}$", // MATHEMATICAL SANS-SERIF BOLD SMALL DELTA
	'\uD835\uDF74': "$\\mathsfbf{\\Epsilon}$", // MATHEMATICAL SANS-SERIF BOLD SMALL EPSILON
	'\uD835\uDF75': "$\\mathsfbf{\\Zeta}$", // MATHEMATICAL SANS-SERIF BOLD SMALL ZETA
	'\uD835\uDF76': "$\\mathsfbf{\\Eta}$", // MATHEMATICAL SANS-SERIF BOLD SMALL ETA
	'\uD835\uDF77': "$\\mathsfbf{\\Theta}$", // MATHEMATICAL SANS-SERIF BOLD SMALL THETA
	'\uD835\uDF78': "$\\mathsfbf{\\Iota}$", // MATHEMATICAL SANS-SERIF BOLD SMALL IOTA
	'\uD835\uDF79': "$\\mathsfbf{\\Kappa}$", // MATHEMATICAL SANS-SERIF BOLD SMALL KAPPA
	'\uD835\uDF7A': "$\\mathsfbf{\\Lambda}$", // MATHEMATICAL SANS-SERIF BOLD SMALL LAMDA
	'\uD835\uDF7B': "$M$", // MATHEMATICAL SANS-SERIF BOLD SMALL MU
	'\uD835\uDF7C': "$N$", // MATHEMATICAL SANS-SERIF BOLD SMALL NU
	'\uD835\uDF7D': "$\\mathsfbf{\\Xi}$", // MATHEMATICAL SANS-SERIF BOLD SMALL XI
	'\uD835\uDF7E': "$O$", // MATHEMATICAL SANS-SERIF BOLD SMALL OMICRON
	'\uD835\uDF7F': "$\\mathsfbf{\\Pi}$", // MATHEMATICAL SANS-SERIF BOLD SMALL PI
	'\uD835\uDF80': "$\\mathsfbf{\\Rho}$", // MATHEMATICAL SANS-SERIF BOLD SMALL RHO
	'\uD835\uDF81': "$\\mathsfbf{\\varsigma}$", // MATHEMATICAL SANS-SERIF BOLD SMALL FINAL SIGMA
	'\uD835\uDF82': "$\\mathsfbf{\\Sigma}$", // MATHEMATICAL SANS-SERIF BOLD SMALL SIGMA
	'\uD835\uDF83': "$\\mathsfbf{\\Tau}$", // MATHEMATICAL SANS-SERIF BOLD SMALL TAU
	'\uD835\uDF84': "$\\mathsfbf{\\Upsilon}$", // MATHEMATICAL SANS-SERIF BOLD SMALL UPSILON
	'\uD835\uDF85': "$\\mathsfbf{\\Phi}$", // MATHEMATICAL SANS-SERIF BOLD SMALL PHI
	'\uD835\uDF86': "$\\mathsfbf{\\Chi}$", // MATHEMATICAL SANS-SERIF BOLD SMALL CHI
	'\uD835\uDF87': "$\\mathsfbf{\\Psi}$", // MATHEMATICAL SANS-SERIF BOLD SMALL PSI
	'\uD835\uDF88': "$\\mathsfbf{\\Omega}$", // MATHEMATICAL SANS-SERIF BOLD SMALL OMEGA
	'\uD835\uDF89': "$\\partial{}$", // MATHEMATICAL SANS-SERIF BOLD PARTIAL DIFFERENTIAL
	'\uD835\uDF8A': "$\\in{}$", // MATHEMATICAL SANS-SERIF BOLD EPSILON SYMBOL
	'\uD835\uDF8B': "\\mathsfbf{\\vartheta}", // MATHEMATICAL SANS-SERIF BOLD THETA SYMBOL
	'\uD835\uDF8C': "\\mathsfbf{\\varkappa}", // MATHEMATICAL SANS-SERIF BOLD KAPPA SYMBOL
	'\uD835\uDF8D': "\\mathsfbf{\\phi}", // MATHEMATICAL SANS-SERIF BOLD PHI SYMBOL
	'\uD835\uDF8E': "\\mathsfbf{\\varrho}", // MATHEMATICAL SANS-SERIF BOLD RHO SYMBOL
	'\uD835\uDF8F': "\\mathsfbf{\\varpi}", // MATHEMATICAL SANS-SERIF BOLD PI SYMBOL
	'\uD835\uDF90': "$\\mathsfbfsl{\\Alpha}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL ALPHA
	'\uD835\uDF91': "$\\mathsfbfsl{\\Beta}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL BETA
	'\uD835\uDF92': "$\\mathsfbfsl{\\Gamma}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL GAMMA
	'\uD835\uDF93': "$\\mathsfbfsl{\\Delta}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL DELTA
	'\uD835\uDF94': "$\\mathsfbfsl{\\Epsilon}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL EPSILON
	'\uD835\uDF95': "$\\mathsfbfsl{\\Zeta}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL ZETA
	'\uD835\uDF96': "$\\mathsfbfsl{\\Eta}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL ETA
	'\uD835\uDF97': "$\\mathsfbfsl{\\vartheta}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL THETA
	'\uD835\uDF98': "$\\mathsfbfsl{\\Iota}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL IOTA
	'\uD835\uDF99': "$\\mathsfbfsl{\\Kappa}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL KAPPA
	'\uD835\uDF9A': "$\\mathsfbfsl{\\Lambda}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL LAMDA
	'\uD835\uDF9B': "$M$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL MU
	'\uD835\uDF9C': "$N$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL NU
	'\uD835\uDF9D': "$\\mathsfbfsl{\\Xi}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL XI
	'\uD835\uDF9E': "$O$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL OMICRON
	'\uD835\uDF9F': "$\\mathsfbfsl{\\Pi}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL PI
	'\uD835\uDFA0': "$\\mathsfbfsl{\\Rho}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL RHO
	'\uD835\uDFA1': "\\mathsfbfsl{\\vartheta}", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL THETA SYMBOL
	'\uD835\uDFA2': "$\\mathsfbfsl{\\Sigma}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL SIGMA
	'\uD835\uDFA3': "$\\mathsfbfsl{\\Tau}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL TAU
	'\uD835\uDFA4': "$\\mathsfbfsl{\\Upsilon}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL UPSILON
	'\uD835\uDFA5': "$\\mathsfbfsl{\\Phi}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL PHI
	'\uD835\uDFA6': "$\\mathsfbfsl{\\Chi}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL CHI
	'\uD835\uDFA7': "$\\mathsfbfsl{\\Psi}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL PSI
	'\uD835\uDFA8': "$\\mathsfbfsl{\\Omega}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL OMEGA
	'\uD835\uDFA9': "$\\mathsfbfsl{\\nabla}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC NABLA
	'\uD835\uDFAA': "$\\mathsfbfsl{\\Alpha}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL ALPHA
	'\uD835\uDFAB': "$\\mathsfbfsl{\\Beta}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL BETA
	'\uD835\uDFAC': "$\\mathsfbfsl{\\Gamma}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL GAMMA
	'\uD835\uDFAD': "$\\mathsfbfsl{\\Delta}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL DELTA
	'\uD835\uDFAE': "$\\mathsfbfsl{\\Epsilon}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL EPSILON
	'\uD835\uDFAF': "$\\mathsfbfsl{\\Zeta}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL ZETA
	'\uD835\uDFB0': "$\\mathsfbfsl{\\Eta}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL ETA
	'\uD835\uDFB1': "$\\mathsfbfsl{\\vartheta}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL THETA
	'\uD835\uDFB2': "$\\mathsfbfsl{\\Iota}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL IOTA
	'\uD835\uDFB3': "$\\mathsfbfsl{\\Kappa}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL KAPPA
	'\uD835\uDFB4': "$\\mathsfbfsl{\\Lambda}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL LAMDA
	'\uD835\uDFB5': "$M$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL MU
	'\uD835\uDFB6': "$N$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL NU
	'\uD835\uDFB7': "$\\mathsfbfsl{\\Xi}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL XI
	'\uD835\uDFB8': "$O$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL OMICRON
	'\uD835\uDFB9': "$\\mathsfbfsl{\\Pi}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL PI
	'\uD835\uDFBA': "$\\mathsfbfsl{\\Rho}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL RHO
	'\uD835\uDFBB': "$\\mathsfbfsl{\\varsigma}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL FINAL SIGMA
	'\uD835\uDFBC': "$\\mathsfbfsl{\\Sigma}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL SIGMA
	'\uD835\uDFBD': "$\\mathsfbfsl{\\Tau}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL TAU
	'\uD835\uDFBE': "$\\mathsfbfsl{\\Upsilon}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL UPSILON
	'\uD835\uDFBF': "$\\mathsfbfsl{\\Phi}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL PHI
	'\uD835\uDFC0': "$\\mathsfbfsl{\\Chi}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL CHI
	'\uD835\uDFC1': "$\\mathsfbfsl{\\Psi}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL PSI
	'\uD835\uDFC2': "$\\mathsfbfsl{\\Omega}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL OMEGA
	'\uD835\uDFC3': "$\\partial{}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC PARTIAL DIFFERENTIAL
	'\uD835\uDFC4': "$\\in{}$", // MATHEMATICAL SANS-SERIF BOLD ITALIC EPSILON SYMBOL
	'\uD835\uDFC5': "\\mathsfbfsl{\\vartheta}", // MATHEMATICAL SANS-SERIF BOLD ITALIC THETA SYMBOL
	'\uD835\uDFC6': "\\mathsfbfsl{\\varkappa}", // MATHEMATICAL SANS-SERIF BOLD ITALIC KAPPA SYMBOL
	'\uD835\uDFC7': "\\mathsfbfsl{\\phi}", // MATHEMATICAL SANS-SERIF BOLD ITALIC PHI SYMBOL
	'\uD835\uDFC8': "\\mathsfbfsl{\\varrho}", // MATHEMATICAL SANS-SERIF BOLD ITALIC RHO SYMBOL
	'\uD835\uDFC9': "\\mathsfbfsl{\\varpi}", // MATHEMATICAL SANS-SERIF BOLD ITALIC PI SYMBOL
	'\uD835\uDFCA': "$\\mbfDigamma{}$", // MATHEMATICAL BOLD CAPITAL DIGAMMA
	'\uD835\uDFCB': "$\\mbfdigamma{}$", // MATHEMATICAL BOLD SMALL DIGAMMA
	'\uD835\uDFCE': "$\\mathbf{0}$", // MATHEMATICAL BOLD DIGIT ZERO
	'\uD835\uDFCF': "$\\mathbf{1}$", // MATHEMATICAL BOLD DIGIT ONE
	'\uD835\uDFD0': "$\\mathbf{2}$", // MATHEMATICAL BOLD DIGIT TWO
	'\uD835\uDFD1': "$\\mathbf{3}$", // MATHEMATICAL BOLD DIGIT THREE
	'\uD835\uDFD2': "$\\mathbf{4}$", // MATHEMATICAL BOLD DIGIT FOUR
	'\uD835\uDFD3': "$\\mathbf{5}$", // MATHEMATICAL BOLD DIGIT FIVE
	'\uD835\uDFD4': "$\\mathbf{6}$", // MATHEMATICAL BOLD DIGIT SIX
	'\uD835\uDFD5': "$\\mathbf{7}$", // MATHEMATICAL BOLD DIGIT SEVEN
	'\uD835\uDFD6': "$\\mathbf{8}$", // MATHEMATICAL BOLD DIGIT EIGHT
	'\uD835\uDFD7': "$\\mathbf{9}$", // MATHEMATICAL BOLD DIGIT NINE
	'\uD835\uDFD8': "$\\mathbb{0}$", // MATHEMATICAL DOUBLE-STRUCK DIGIT ZERO
	'\uD835\uDFD9': "$\\mathbb{1}$", // MATHEMATICAL DOUBLE-STRUCK DIGIT ONE
	'\uD835\uDFDA': "$\\mathbb{2}$", // MATHEMATICAL DOUBLE-STRUCK DIGIT TWO
	'\uD835\uDFDB': "$\\mathbb{3}$", // MATHEMATICAL DOUBLE-STRUCK DIGIT THREE
	'\uD835\uDFDC': "$\\mathbb{4}$", // MATHEMATICAL DOUBLE-STRUCK DIGIT FOUR
	'\uD835\uDFDD': "$\\mathbb{5}$", // MATHEMATICAL DOUBLE-STRUCK DIGIT FIVE
	'\uD835\uDFDE': "$\\mathbb{6}$", // MATHEMATICAL DOUBLE-STRUCK DIGIT SIX
	'\uD835\uDFDF': "$\\mathbb{7}$", // MATHEMATICAL DOUBLE-STRUCK DIGIT SEVEN
	'\uD835\uDFE0': "$\\mathbb{8}$", // MATHEMATICAL DOUBLE-STRUCK DIGIT EIGHT
	'\uD835\uDFE1': "$\\mathbb{9}$", // MATHEMATICAL DOUBLE-STRUCK DIGIT NINE
	'\uD835\uDFE2': "$\\mathsf{0}$", // MATHEMATICAL SANS-SERIF DIGIT ZERO
	'\uD835\uDFE3': "$\\mathsf{1}$", // MATHEMATICAL SANS-SERIF DIGIT ONE
	'\uD835\uDFE4': "$\\mathsf{2}$", // MATHEMATICAL SANS-SERIF DIGIT TWO
	'\uD835\uDFE5': "$\\mathsf{3}$", // MATHEMATICAL SANS-SERIF DIGIT THREE
	'\uD835\uDFE6': "$\\mathsf{4}$", // MATHEMATICAL SANS-SERIF DIGIT FOUR
	'\uD835\uDFE7': "$\\mathsf{5}$", // MATHEMATICAL SANS-SERIF DIGIT FIVE
	'\uD835\uDFE8': "$\\mathsf{6}$", // MATHEMATICAL SANS-SERIF DIGIT SIX
	'\uD835\uDFE9': "$\\mathsf{7}$", // MATHEMATICAL SANS-SERIF DIGIT SEVEN
	'\uD835\uDFEA': "$\\mathsf{8}$", // MATHEMATICAL SANS-SERIF DIGIT EIGHT
	'\uD835\uDFEB': "$\\mathsf{9}$", // MATHEMATICAL SANS-SERIF DIGIT NINE
	'\uD835\uDFEC': "$\\mathsfbf{0}$", // MATHEMATICAL SANS-SERIF BOLD DIGIT ZERO
	'\uD835\uDFED': "$\\mathsfbf{1}$", // MATHEMATICAL SANS-SERIF BOLD DIGIT ONE
	'\uD835\uDFEE': "$\\mathsfbf{2}$", // MATHEMATICAL SANS-SERIF BOLD DIGIT TWO
	'\uD835\uDFEF': "$\\mathsfbf{3}$", // MATHEMATICAL SANS-SERIF BOLD DIGIT THREE
	'\uD835\uDFF0': "$\\mathsfbf{4}$", // MATHEMATICAL SANS-SERIF BOLD DIGIT FOUR
	'\uD835\uDFF1': "$\\mathsfbf{5}$", // MATHEMATICAL SANS-SERIF BOLD DIGIT FIVE
	'\uD835\uDFF2': "$\\mathsfbf{6}$", // MATHEMATICAL SANS-SERIF BOLD DIGIT SIX
	'\uD835\uDFF3': "$\\mathsfbf{7}$", // MATHEMATICAL SANS-SERIF BOLD DIGIT SEVEN
	'\uD835\uDFF4': "$\\mathsfbf{8}$", // MATHEMATICAL SANS-SERIF BOLD DIGIT EIGHT
	'\uD835\uDFF5': "$\\mathsfbf{9}$", // MATHEMATICAL SANS-SERIF BOLD DIGIT NINE
	'\uD835\uDFF6': "$\\mathtt{0}$", // MATHEMATICAL MONOSPACE DIGIT ZERO
	'\uD835\uDFF7': "$\\mathtt{1}$", // MATHEMATICAL MONOSPACE DIGIT ONE
	'\uD835\uDFF8': "$\\mathtt{2}$", // MATHEMATICAL MONOSPACE DIGIT TWO
	'\uD835\uDFF9': "$\\mathtt{3}$", // MATHEMATICAL MONOSPACE DIGIT THREE
	'\uD835\uDFFA': "$\\mathtt{4}$", // MATHEMATICAL MONOSPACE DIGIT FOUR
	'\uD835\uDFFB': "$\\mathtt{5}$", // MATHEMATICAL MONOSPACE DIGIT FIVE
	'\uD835\uDFFC': "$\\mathtt{6}$", // MATHEMATICAL MONOSPACE DIGIT SIX
	'\uD835\uDFFD': "$\\mathtt{7}$", // MATHEMATICAL MONOSPACE DIGIT SEVEN
	'\uD835\uDFFE': "$\\mathtt{8}$", // MATHEMATICAL MONOSPACE DIGIT EIGHT
	'\uD835\uDFFF': "$\\mathtt{9}$" // MATHEMATICAL MONOSPACE DIGIT NINE
};

/* unfortunately the mapping isn't reversible - hence this second table - sigh! */
var reversemappingTable = {
	"\\url"                           : "",       // strip 'url'
	"\\href"                          : "",       // strip 'href'
	"{\\textexclamdown}"              : "\u00A1", // INVERTED EXCLAMATION MARK
	"{\\textcent}"                    : "\u00A2", // CENT SIGN
	"{\\textsterling}"                : "\u00A3", // POUND SIGN
	"{\\textyen}"                     : "\u00A5", // YEN SIGN
	"{\\textbrokenbar}"               : "\u00A6", // BROKEN BAR
	"{\\textsection}"                 : "\u00A7", // SECTION SIGN
	"{\\textasciidieresis}"           : "\u00A8", // DIAERESIS
	"{\\textcopyright}"               : "\u00A9", // COPYRIGHT SIGN
	"{\\textordfeminine}"             : "\u00AA", // FEMININE ORDINAL INDICATOR
	"{\\guillemotleft}"               : "\u00AB", // LEFT-POINTING DOUBLE ANGLE QUOTATION MARK
	"{\\textlnot}"                    : "\u00AC", // NOT SIGN
	"{\\textregistered}"              : "\u00AE", // REGISTERED SIGN
	"{\\textasciimacron}"             : "\u00AF", // MACRON
	"{\\textdegree}"                  : "\u00B0", // DEGREE SIGN
	"{\\textpm}"                      : "\u00B1", // PLUS-MINUS SIGN
	"{\\texttwosuperior}"             : "\u00B2", // SUPERSCRIPT TWO
	"{\\textthreesuperior}"           : "\u00B3", // SUPERSCRIPT THREE
	"{\\textasciiacute}"              : "\u00B4", // ACUTE ACCENT
	"{\\textmu}"                      : "\u00B5", // MICRO SIGN
	"{\\textparagraph}"               : "\u00B6", // PILCROW SIGN
	"{\\textperiodcentered}"          : "\u00B7", // MIDDLE DOT
	"{\\c\\ }"                        : "\u00B8", // CEDILLA
	"{\\textonesuperior}"             : "\u00B9", // SUPERSCRIPT ONE
	"{\\textordmasculine}"            : "\u00BA", // MASCULINE ORDINAL INDICATOR
	"{\\guillemotright}"              : "\u00BB", // RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK
	"{\\textonequarter}"              : "\u00BC", // VULGAR FRACTION ONE QUARTER
	"{\\textonehalf}"                 : "\u00BD", // VULGAR FRACTION ONE HALF
	"{\\textthreequarters}"           : "\u00BE", // VULGAR FRACTION THREE QUARTERS
	"{\\textquestiondown}"            : "\u00BF", // INVERTED QUESTION MARK
	"{\\AE}"                          : "\u00C6", // LATIN CAPITAL LETTER AE
	"{\\DH}"                          : "\u00D0", // LATIN CAPITAL LETTER ETH
	"{\\texttimes}"                   : "\u00D7", // MULTIPLICATION SIGN
	"{\\O}"                          : 	"\u00D8", // LATIN SMALL LETTER O WITH STROKE
	"{\\TH}"                          : "\u00DE", // LATIN CAPITAL LETTER THORN
	"{\\ss}"                          : "\u00DF", // LATIN SMALL LETTER SHARP S
	"{\\ae}"                          : "\u00E6", // LATIN SMALL LETTER AE
	"{\\dh}"                          : "\u00F0", // LATIN SMALL LETTER ETH
	"{\\textdiv}"                     : "\u00F7", // DIVISION SIGN
	"{\\o}"                          : "\u00F8", // LATIN SMALL LETTER O WITH STROKE
	"{\\th}"                          : "\u00FE", // LATIN SMALL LETTER THORN
	"{\\i}"                           : "\u0131", // LATIN SMALL LETTER DOTLESS I
	//"'n"                              : "\u0149", // LATIN SMALL LETTER N PRECEDED BY APOSTROPHE
	"{\\NG}"                          : "\u014A", // LATIN CAPITAL LETTER ENG
	"{\\ng}"                          : "\u014B", // LATIN SMALL LETTER ENG
	"{\\OE}"                          : "\u0152", // LATIN CAPITAL LIGATURE OE
	"{\\oe}"                          : "\u0153", // LATIN SMALL LIGATURE OE
	"{\\textasciicircum}"             : "\u02C6", // MODIFIER LETTER CIRCUMFLEX ACCENT
	//    "\\~{}"                           : "\u02DC", // SMALL TILDE
	"{\\textacutedbl}"                : "\u02DD", // DOUBLE ACUTE ACCENT
	
	//Greek Letters Courtesy of Spartanroc
	"$\\Gamma$" : "\u0393", // GREEK Gamma
	"$\\Delta$" : "\u0394", // GREEK Delta
	"$\\Theta$" : "\u0398", // GREEK Theta
	"$\\Lambda$" : "\u039B", // GREEK Lambda
	"$\\Xi$" : "\u039E", // GREEK Xi
	"$\\Pi$" : "\u03A0", // GREEK Pi
	"$\\Sigma$" : "\u03A3", // GREEK Sigma
	"$\\Phi$" : "\u03A6", // GREEK Phi
	"$\\Psi$" : "\u03A8", // GREEK Psi
	"$\\Omega$" : "\u03A9", // GREEK Omega
	"$\\alpha$" : "\u03B1", // GREEK alpha
	"$\\beta$" : "\u03B2", // GREEK beta
	"$\\gamma$" : "\u03B3", // GREEK gamma
	"$\\delta$" : "\u03B4", // GREEK delta
	"$\\varepsilon$": "\u03B5", // GREEK var-epsilon
	"$\\zeta$" : "\u03B6", // GREEK zeta
	"$\\eta$" : "\u03B7", // GREEK eta
	"$\\theta$" : "\u03B8", // GREEK theta
	"$\\iota$" : "\u03B9", // GREEK iota
	"$\\kappa$" : "\u03BA", // GREEK kappa
	"$\\lambda$" : "\u03BB", // GREEK lambda
	"$\\mu$" : "\u03BC", // GREEK mu
	"$\\nu$" : "\u03BD", // GREEK nu
	"$\\xi$" : "\u03BE", // GREEK xi
	"$\\pi$" : "\u03C0", // GREEK pi
	"$\\rho$" : "\u03C1", // GREEK rho
	"$\\varsigma$" : "\u03C2", // GREEK var-sigma
	"$\\sigma$" : "\u03C3", // GREEK sigma
	"$\\tau$" : "\u03C4", // GREEK tau
	"$\\upsilon$" : "\u03C5", // GREEK upsilon
	"$\\varphi$" : "\u03C6", // GREEK var-phi
	"$\\chi$" : "\u03C7", // GREEK chi
	"$\\psi$" : "\u03C8", // GREEK psi
	"$\\omega$" : "\u03C9", // GREEK omega
	"$\\vartheta$" : "\u03D1", // GREEK var-theta
	"$\\Upsilon$" : "\u03D2", // GREEK Upsilon
	"$\\phi$" : "\u03D5", // GREEK phi
	"$\\varpi$" : "\u03D6", // GREEK var-pi
	"$\\varrho$" : "\u03F1", // GREEK var-rho
	"$\\epsilon$" : "\u03F5", // GREEK epsilon
	//Greek letters end
	"{\\textendash}"                  : "\u2013", // EN DASH
	"{\\textemdash}"                  : "\u2014", // EM DASH
	"---"                             : "\u2014", // EM DASH
	"--"                              : "\u2013", // EN DASH
	"{\\textbardbl}"                  : "\u2016", // DOUBLE VERTICAL LINE
	"{\\textunderscore}"              : "\u2017", // DOUBLE LOW LINE
	"{\\textquoteleft}"               : "\u2018", // LEFT SINGLE QUOTATION MARK
	"{\\textquoteright}"              : "\u2019", // RIGHT SINGLE QUOTATION MARK
	"{\\textquotesingle}"              : "'", // APOSTROPHE / NEUTRAL SINGLE QUOTATION MARK
	"{\\quotesinglbase}"              : "\u201A", // SINGLE LOW-9 QUOTATION MARK
	"{\\textquotedblleft}"            : "\u201C", // LEFT DOUBLE QUOTATION MARK
	"{\\textquotedblright}"           : "\u201D", // RIGHT DOUBLE QUOTATION MARK
	"{\\quotedblbase}"                : "\u201E", // DOUBLE LOW-9 QUOTATION MARK
	//    "{\\quotedblbase}"                : "\u201F", // DOUBLE HIGH-REVERSED-9 QUOTATION MARK
	"{\\textdagger}"                  : "\u2020", // DAGGER
	"{\\textdaggerdbl}"               : "\u2021", // DOUBLE DAGGER
	"{\\textbullet}"                  : "\u2022", // BULLET
	"{\\textellipsis}"                : "\u2026", // HORIZONTAL ELLIPSIS
	"{\\textperthousand}"             : "\u2030", // PER MILLE SIGN
	"'''"                             : "\u2034", // TRIPLE PRIME
	"''"                              : "\u201D", // RIGHT DOUBLE QUOTATION MARK (could be a double prime)
	"``"                              : "\u201C", // LEFT DOUBLE QUOTATION MARK (could be a reversed double prime)
	"```"                             : "\u2037", // REVERSED TRIPLE PRIME
	"{\\guilsinglleft}"               : "\u2039", // SINGLE LEFT-POINTING ANGLE QUOTATION MARK
	"{\\guilsinglright}"              : "\u203A", // SINGLE RIGHT-POINTING ANGLE QUOTATION MARK
	"!!"                              : "\u203C", // DOUBLE EXCLAMATION MARK
	"{\\textfractionsolidus}"         : "\u2044", // FRACTION SLASH
	"?!"                              : "\u2048", // QUESTION EXCLAMATION MARK
	"!?"                              : "\u2049", // EXCLAMATION QUESTION MARK
	"$^{0}$"                          : "\u2070", // SUPERSCRIPT ZERO
	"$^{4}$"                          : "\u2074", // SUPERSCRIPT FOUR
	"$^{5}$"                          : "\u2075", // SUPERSCRIPT FIVE
	"$^{6}$"                          : "\u2076", // SUPERSCRIPT SIX
	"$^{7}$"                          : "\u2077", // SUPERSCRIPT SEVEN
	"$^{8}$"                          : "\u2078", // SUPERSCRIPT EIGHT
	"$^{9}$"                          : "\u2079", // SUPERSCRIPT NINE
	"$^{+}$"                          : "\u207A", // SUPERSCRIPT PLUS SIGN
	"$^{-}$"                          : "\u207B", // SUPERSCRIPT MINUS
	"$^{=}$"                          : "\u207C", // SUPERSCRIPT EQUALS SIGN
	"$^{(}$"                          : "\u207D", // SUPERSCRIPT LEFT PARENTHESIS
	"$^{)}$"                          : "\u207E", // SUPERSCRIPT RIGHT PARENTHESIS
	"$^{n}$"                          : "\u207F", // SUPERSCRIPT LATIN SMALL LETTER N
	"$_{0}$"                          : "\u2080", // SUBSCRIPT ZERO
	"$_{1}$"                          : "\u2081", // SUBSCRIPT ONE
	"$_{2}$"                          : "\u2082", // SUBSCRIPT TWO
	"$_{3}$"                          : "\u2083", // SUBSCRIPT THREE
	"$_{4}$"                          : "\u2084", // SUBSCRIPT FOUR
	"$_{5}$"                          : "\u2085", // SUBSCRIPT FIVE
	"$_{6}$"                          : "\u2086", // SUBSCRIPT SIX
	"$_{7}$"                          : "\u2087", // SUBSCRIPT SEVEN
	"$_{8}$"                          : "\u2088", // SUBSCRIPT EIGHT
	"$_{9}$"                          : "\u2089", // SUBSCRIPT NINE
	"$_{+}$"                          : "\u208A", // SUBSCRIPT PLUS SIGN
	"$_{-}$"                          : "\u208B", // SUBSCRIPT MINUS
	"$_{=}$"                          : "\u208C", // SUBSCRIPT EQUALS SIGN
	"$_{(}$"                          : "\u208D", // SUBSCRIPT LEFT PARENTHESIS
	"$_{)}$"                          : "\u208E", // SUBSCRIPT RIGHT PARENTHESIS
	"{\\texteuro}"                    : "\u20AC", // EURO SIGN
	//"a/c"                             : "\u2100", // ACCOUNT OF
	//"a/s"                             : "\u2101", // ADDRESSED TO THE SUBJECT
	"{\\textcelsius}"                 : "\u2103", // DEGREE CELSIUS
	//"c/o"                             : "\u2105", // CARE OF
	//"c/u"                             : "\u2106", // CADA UNA
	"{\\textnumero}"                  : "\u2116", // NUMERO SIGN
	"{\\textcircledP}"                : "\u2117", // SOUND RECORDING COPYRIGHT
	"{\\textservicemark}"             : "\u2120", // SERVICE MARK
	"{TEL}"                           : "\u2121", // TELEPHONE SIGN
	"{\\texttrademark}"               : "\u2122", // TRADE MARK SIGN
	"{\\textohm}"                     : "\u2126", // OHM SIGN
	"{\\textestimated}"               : "\u212E", // ESTIMATED SYMBOL
	
	/*" 1/3"                            : "\u2153", // VULGAR FRACTION ONE THIRD
	" 2/3"                            : "\u2154", // VULGAR FRACTION TWO THIRDS
	" 1/5"                            : "\u2155", // VULGAR FRACTION ONE FIFTH
	" 2/5"                            : "\u2156", // VULGAR FRACTION TWO FIFTHS
	" 3/5"                            : "\u2157", // VULGAR FRACTION THREE FIFTHS
	" 4/5"                            : "\u2158", // VULGAR FRACTION FOUR FIFTHS
	" 1/6"                            : "\u2159", // VULGAR FRACTION ONE SIXTH
	" 5/6"                            : "\u215A", // VULGAR FRACTION FIVE SIXTHS
	" 1/8"                            : "\u215B", // VULGAR FRACTION ONE EIGHTH
	" 3/8"                            : "\u215C", // VULGAR FRACTION THREE EIGHTHS
	" 5/8"                            : "\u215D", // VULGAR FRACTION FIVE EIGHTHS
	" 7/8"                            : "\u215E", // VULGAR FRACTION SEVEN EIGHTHS
	" 1/"                             : "\u215F", // FRACTION NUMERATOR ONE */
	
	"{\\textleftarrow}"               : "\u2190", // LEFTWARDS ARROW
	"{\\textuparrow}"                 : "\u2191", // UPWARDS ARROW
	"{\\textrightarrow}"              : "\u2192", // RIGHTWARDS ARROW
	"{\\textdownarrow}"               : "\u2193", // DOWNWARDS ARROW
	/*"<->"                             : "\u2194", // LEFT RIGHT ARROW
	"<="                              : "\u21D0", // LEFTWARDS DOUBLE ARROW
	"=>"                              : "\u21D2", // RIGHTWARDS DOUBLE ARROW
	"<=>"                             : "\u21D4", // LEFT RIGHT DOUBLE ARROW */
	"$\\infty$"                       : "\u221E", // INFINITY
	
	/*"||"                              : "\u2225", // PARALLEL TO
	"/="                              : "\u2260", // NOT EQUAL TO
	"<="                              : "\u2264", // LESS-THAN OR EQUAL TO
	">="                              : "\u2265", // GREATER-THAN OR EQUAL TO
	"<<"                              : "\u226A", // MUCH LESS-THAN
	">>"                              : "\u226B", // MUCH GREATER-THAN
	"(+)"                             : "\u2295", // CIRCLED PLUS
	"(-)"                             : "\u2296", // CIRCLED MINUS
	"(x)"                             : "\u2297", // CIRCLED TIMES
	"(/)"                             : "\u2298", // CIRCLED DIVISION SLASH
	"|-"                              : "\u22A2", // RIGHT TACK
	"-|"                              : "\u22A3", // LEFT TACK
	"|-"                              : "\u22A6", // ASSERTION
	"|="                              : "\u22A7", // MODELS
	"|="                              : "\u22A8", // TRUE
	"||-"                             : "\u22A9", // FORCES */
	
	"$\\#$"                           : "\u22D5", // EQUAL AND PARALLEL TO
	//"<<<"                             : "\u22D8", // VERY MUCH LESS-THAN
	//">>>"                             : "\u22D9", // VERY MUCH GREATER-THAN
	"{\\textlangle}"                  : "\u2329", // LEFT-POINTING ANGLE BRACKET
	"{\\textrangle}"                  : "\u232A", // RIGHT-POINTING ANGLE BRACKET
	"{\\textvisiblespace}"            : "\u2423", // OPEN BOX
	//"///"                             : "\u2425", // SYMBOL FOR DELETE FORM TWO
	"{\\textopenbullet}"              : "\u25E6", // WHITE BULLET
	//":-("                             : "\u2639", // WHITE FROWNING FACE
	//":-)"                             : "\u263A", // WHITE SMILING FACE
	//"(-: "                            : "\u263B", // BLACK SMILING FACE
	//    "$\\#$"                           : "\u266F", // MUSIC SHARP SIGN
	"$\\%<$"                          : "\u2701", // UPPER BLADE SCISSORS
	/*    "$\\%<$"                          : "\u2702", // BLACK SCISSORS
	"$\\%<$"                          : "\u2703", // LOWER BLADE SCISSORS
	"$\\%<$"                          : "\u2704", // WHITE SCISSORS */
	/* Derived accented characters */
	"{\\`A}"                          : "\u00C0", // LATIN CAPITAL LETTER A WITH GRAVE
	"{\\'A}"                          : "\u00C1", // LATIN CAPITAL LETTER A WITH ACUTE
	"{\\^A}"                          : "\u00C2", // LATIN CAPITAL LETTER A WITH CIRCUMFLEX
	"{\\~A}"                          : "\u00C3", // LATIN CAPITAL LETTER A WITH TILDE
	"{\\\"A}"                         : "\u00C4", // LATIN CAPITAL LETTER A WITH DIAERESIS
	"{\\r A}"                          : "\u00C5", // LATIN CAPITAL LETTER A WITH RING ABOVE
	"{\\AA}"                          : "\u00C5", // LATIN CAPITAL LETTER A WITH RING ABOVE
	"{\\c C}"                          : "\u00C7", // LATIN CAPITAL LETTER C WITH CEDILLA
	"{\\`E}"                          : "\u00C8", // LATIN CAPITAL LETTER E WITH GRAVE
	"{\\'E}"                          : "\u00C9", // LATIN CAPITAL LETTER E WITH ACUTE
	"{\\^E}"                          : "\u00CA", // LATIN CAPITAL LETTER E WITH CIRCUMFLEX
	"{\\\"E}"                         : "\u00CB", // LATIN CAPITAL LETTER E WITH DIAERESIS
	"{\\`I}"                          : "\u00CC", // LATIN CAPITAL LETTER I WITH GRAVE
	"{\\'I}"                          : "\u00CD", // LATIN CAPITAL LETTER I WITH ACUTE
	"{\\^I}"                          : "\u00CE", // LATIN CAPITAL LETTER I WITH CIRCUMFLEX
	"{\\\"I}"                         : "\u00CF", // LATIN CAPITAL LETTER I WITH DIAERESIS
	"{\\~N}"                          : "\u00D1", // LATIN CAPITAL LETTER N WITH TILDE
	"{\\`O}"                          : "\u00D2", // LATIN CAPITAL LETTER O WITH GRAVE
	"{\\'O}"                          : "\u00D3", // LATIN CAPITAL LETTER O WITH ACUTE
	"{\\^O}"                          : "\u00D4", // LATIN CAPITAL LETTER O WITH CIRCUMFLEX
	"{\\~O}"                          : "\u00D5", // LATIN CAPITAL LETTER O WITH TILDE
	"{\\\"O}"                         : "\u00D6", // LATIN CAPITAL LETTER O WITH DIAERESIS
	"{\\`U}"                          : "\u00D9", // LATIN CAPITAL LETTER U WITH GRAVE
	"{\\'U}"                          : "\u00DA", // LATIN CAPITAL LETTER U WITH ACUTE
	"{\\^U}"                          : "\u00DB", // LATIN CAPITAL LETTER U WITH CIRCUMFLEX
	"{\\\"U}"                         : "\u00DC", // LATIN CAPITAL LETTER U WITH DIAERESIS
	"{\\'Y}"                          : "\u00DD", // LATIN CAPITAL LETTER Y WITH ACUTE
	"{\\`a}"                          : "\u00E0", // LATIN SMALL LETTER A WITH GRAVE
	"{\\'a}"                          : "\u00E1", // LATIN SMALL LETTER A WITH ACUTE
	"{\\^a}"                          : "\u00E2", // LATIN SMALL LETTER A WITH CIRCUMFLEX
	"{\\~a}"                          : "\u00E3", // LATIN SMALL LETTER A WITH TILDE
	"{\\\"a}"                         : "\u00E4", // LATIN SMALL LETTER A WITH DIAERESIS
	"{\\r a}"                          : "\u00E5", // LATIN SMALL LETTER A WITH RING ABOVE
	"{\\aa}"                          : "\u00E5", // LATIN SMALL LETTER A WITH RING ABOVE
	"{\\c c}"                          : "\u00E7", // LATIN SMALL LETTER C WITH CEDILLA
	"{\\`e}"                          : "\u00E8", // LATIN SMALL LETTER E WITH GRAVE
	"{\\'e}"                          : "\u00E9", // LATIN SMALL LETTER E WITH ACUTE
	"{\\^e}"                          : "\u00EA", // LATIN SMALL LETTER E WITH CIRCUMFLEX
	"{\\\"e}"                         : "\u00EB", // LATIN SMALL LETTER E WITH DIAERESIS
	"{\\`i}"                          : "\u00EC", // LATIN SMALL LETTER I WITH GRAVE
	"{\\'i}"                          : "\u00ED", // LATIN SMALL LETTER I WITH ACUTE
	"{\\^i}"                          : "\u00EE", // LATIN SMALL LETTER I WITH CIRCUMFLEX
	"{\\\"i}"                         : "\u00EF", // LATIN SMALL LETTER I WITH DIAERESIS
	"{\\~n}"                          : "\u00F1", // LATIN SMALL LETTER N WITH TILDE
	"{\\`o}"                          : "\u00F2", // LATIN SMALL LETTER O WITH GRAVE
	"{\\'o}"                          : "\u00F3", // LATIN SMALL LETTER O WITH ACUTE
	"{\\^o}"                          : "\u00F4", // LATIN SMALL LETTER O WITH CIRCUMFLEX
	"{\\~o}"                          : "\u00F5", // LATIN SMALL LETTER O WITH TILDE
	"{\\\"o}"                         : "\u00F6", // LATIN SMALL LETTER O WITH DIAERESIS
	"{\\`u}"                          : "\u00F9", // LATIN SMALL LETTER U WITH GRAVE
	"{\\'u}"                          : "\u00FA", // LATIN SMALL LETTER U WITH ACUTE
	"{\\^u}"                          : "\u00FB", // LATIN SMALL LETTER U WITH CIRCUMFLEX
	"{\\\"u}"                         : "\u00FC", // LATIN SMALL LETTER U WITH DIAERESIS
	"{\\'y}"                          : "\u00FD", // LATIN SMALL LETTER Y WITH ACUTE
	"{\\\"y}"                         : "\u00FF", // LATIN SMALL LETTER Y WITH DIAERESIS
	"{\\=A}"                          : "\u0100", // LATIN CAPITAL LETTER A WITH MACRON
	"{\\=a}"                          : "\u0101", // LATIN SMALL LETTER A WITH MACRON
	"{\\u A}"                          : "\u0102", // LATIN CAPITAL LETTER A WITH BREVE
	"{\\u a}"                          : "\u0103", // LATIN SMALL LETTER A WITH BREVE
	"{\\k A}"                          : "\u0104", // LATIN CAPITAL LETTER A WITH OGONEK
	"{\\k a}"                          : "\u0105", // LATIN SMALL LETTER A WITH OGONEK
	"{\\'C}"                          : "\u0106", // LATIN CAPITAL LETTER C WITH ACUTE
	"{\\'c}"                          : "\u0107", // LATIN SMALL LETTER C WITH ACUTE
	"{\\^C}"                          : "\u0108", // LATIN CAPITAL LETTER C WITH CIRCUMFLEX
	"{\\^c}"                          : "\u0109", // LATIN SMALL LETTER C WITH CIRCUMFLEX
	"{\\.C}"                          : "\u010A", // LATIN CAPITAL LETTER C WITH DOT ABOVE
	"{\\.c}"                          : "\u010B", // LATIN SMALL LETTER C WITH DOT ABOVE
	"{\\v C}"                          : "\u010C", // LATIN CAPITAL LETTER C WITH CARON
	"{\\v c}"                          : "\u010D", // LATIN SMALL LETTER C WITH CARON
	"{\\v D}"                          : "\u010E", // LATIN CAPITAL LETTER D WITH CARON
	"{\\v d}"                          : "\u010F", // LATIN SMALL LETTER D WITH CARON
	"{\\=E}"                          : "\u0112", // LATIN CAPITAL LETTER E WITH MACRON
	"{\\=e}"                          : "\u0113", // LATIN SMALL LETTER E WITH MACRON
	"{\\u E}"                          : "\u0114", // LATIN CAPITAL LETTER E WITH BREVE
	"{\\u e}"                          : "\u0115", // LATIN SMALL LETTER E WITH BREVE
	"{\\.E}"                          : "\u0116", // LATIN CAPITAL LETTER E WITH DOT ABOVE
	"{\\.e}"                          : "\u0117", // LATIN SMALL LETTER E WITH DOT ABOVE
	"{\\k E}"                          : "\u0118", // LATIN CAPITAL LETTER E WITH OGONEK
	"{\\k e}"                          : "\u0119", // LATIN SMALL LETTER E WITH OGONEK
	"{\\v E}"                          : "\u011A", // LATIN CAPITAL LETTER E WITH CARON
	"{\\v e}"                          : "\u011B", // LATIN SMALL LETTER E WITH CARON
	"{\\^G}"                          : "\u011C", // LATIN CAPITAL LETTER G WITH CIRCUMFLEX
	"{\\^g}"                          : "\u011D", // LATIN SMALL LETTER G WITH CIRCUMFLEX
	"{\\u G}"                          : "\u011E", // LATIN CAPITAL LETTER G WITH BREVE
	"{\\u g}"                          : "\u011F", // LATIN SMALL LETTER G WITH BREVE
	"{\\.G}"                          : "\u0120", // LATIN CAPITAL LETTER G WITH DOT ABOVE
	"{\\.g}"                          : "\u0121", // LATIN SMALL LETTER G WITH DOT ABOVE
	"{\\c G}"                          : "\u0122", // LATIN CAPITAL LETTER G WITH CEDILLA
	"{\\c g}"                          : "\u0123", // LATIN SMALL LETTER G WITH CEDILLA
	"{\\^H}"                          : "\u0124", // LATIN CAPITAL LETTER H WITH CIRCUMFLEX
	"{\\^h}"                          : "\u0125", // LATIN SMALL LETTER H WITH CIRCUMFLEX
	"{\\~I}"                          : "\u0128", // LATIN CAPITAL LETTER I WITH TILDE
	"{\\~i}"                          : "\u0129", // LATIN SMALL LETTER I WITH TILDE
	"{\\=I}"                          : "\u012A", // LATIN CAPITAL LETTER I WITH MACRON
	"{\\=i}"                          : "\u012B", // LATIN SMALL LETTER I WITH MACRON
	"{\\=\\i}"                        : "\u012B", // LATIN SMALL LETTER I WITH MACRON
	"{\\u I}"                          : "\u012C", // LATIN CAPITAL LETTER I WITH BREVE
	"{\\u i}"                          : "\u012D", // LATIN SMALL LETTER I WITH BREVE
	"{\\k I}"                          : "\u012E", // LATIN CAPITAL LETTER I WITH OGONEK
	"{\\k i}"                          : "\u012F", // LATIN SMALL LETTER I WITH OGONEK
	"{\\.I}"                          : "\u0130", // LATIN CAPITAL LETTER I WITH DOT ABOVE
	"{\\^J}"                          : "\u0134", // LATIN CAPITAL LETTER J WITH CIRCUMFLEX
	"{\\^j}"                          : "\u0135", // LATIN SMALL LETTER J WITH CIRCUMFLEX
	"{\\c K}"                          : "\u0136", // LATIN CAPITAL LETTER K WITH CEDILLA
	"{\\c k}"                          : "\u0137", // LATIN SMALL LETTER K WITH CEDILLA
	"{\\'L}"                          : "\u0139", // LATIN CAPITAL LETTER L WITH ACUTE
	"{\\'l}"                          : "\u013A", // LATIN SMALL LETTER L WITH ACUTE
	"{\\c L}"                          : "\u013B", // LATIN CAPITAL LETTER L WITH CEDILLA
	"{\\c l}"                          : "\u013C", // LATIN SMALL LETTER L WITH CEDILLA
	"{\\v L}"                          : "\u013D", // LATIN CAPITAL LETTER L WITH CARON
	"{\\v l}"                          : "\u013E", // LATIN SMALL LETTER L WITH CARON
	"{\\L}"                           : "\u0141", //LATIN CAPITAL LETTER L WITH STROKE
	"{\\l}"                           : "\u0142", //LATIN SMALL LETTER L WITH STROKE
	"{\\'N}"                          : "\u0143", // LATIN CAPITAL LETTER N WITH ACUTE
	"{\\'n}"                          : "\u0144", // LATIN SMALL LETTER N WITH ACUTE
	"{\\c N}"                          : "\u0145", // LATIN CAPITAL LETTER N WITH CEDILLA
	"{\\c n}"                          : "\u0146", // LATIN SMALL LETTER N WITH CEDILLA
	"{\\v N}"                          : "\u0147", // LATIN CAPITAL LETTER N WITH CARON
	"{\\v n}"                          : "\u0148", // LATIN SMALL LETTER N WITH CARON
	"{\\=O}"                          : "\u014C", // LATIN CAPITAL LETTER O WITH MACRON
	"{\\=o}"                          : "\u014D", // LATIN SMALL LETTER O WITH MACRON
	"{\\u O}"                          : "\u014E", // LATIN CAPITAL LETTER O WITH BREVE
	"{\\u o}"                          : "\u014F", // LATIN SMALL LETTER O WITH BREVE
	"{\\H O}"                          : "\u0150", // LATIN CAPITAL LETTER O WITH DOUBLE ACUTE
	"{\\H o}"                          : "\u0151", // LATIN SMALL LETTER O WITH DOUBLE ACUTE
	"{\\'R}"                          : "\u0154", // LATIN CAPITAL LETTER R WITH ACUTE
	"{\\'r}"                          : "\u0155", // LATIN SMALL LETTER R WITH ACUTE
	"{\\c R}"                          : "\u0156", // LATIN CAPITAL LETTER R WITH CEDILLA
	"{\\c r}"                          : "\u0157", // LATIN SMALL LETTER R WITH CEDILLA
	"{\\v R}"                          : "\u0158", // LATIN CAPITAL LETTER R WITH CARON
	"{\\v r}"                          : "\u0159", // LATIN SMALL LETTER R WITH CARON
	"{\\'S}"                          : "\u015A", // LATIN CAPITAL LETTER S WITH ACUTE
	"{\\'s}"                          : "\u015B", // LATIN SMALL LETTER S WITH ACUTE
	"{\\^S}"                          : "\u015C", // LATIN CAPITAL LETTER S WITH CIRCUMFLEX
	"{\\^s}"                          : "\u015D", // LATIN SMALL LETTER S WITH CIRCUMFLEX
	"{\\c S}"                          : "\u015E", // LATIN CAPITAL LETTER S WITH CEDILLA
	"{\\c s}"                          : "\u015F", // LATIN SMALL LETTER S WITH CEDILLA
	"{\\v S}"                          : "\u0160", // LATIN CAPITAL LETTER S WITH CARON
	"{\\v s}"                          : "\u0161", // LATIN SMALL LETTER S WITH CARON
	"{\\c T}"                          : "\u0162", // LATIN CAPITAL LETTER T WITH CEDILLA
	"{\\c t}"                          : "\u0163", // LATIN SMALL LETTER T WITH CEDILLA
	"{\\v T}"                          : "\u0164", // LATIN CAPITAL LETTER T WITH CARON
	"{\\v t}"                          : "\u0165", // LATIN SMALL LETTER T WITH CARON
	"{\\~U}"                          : "\u0168", // LATIN CAPITAL LETTER U WITH TILDE
	"{\\~u}"                          : "\u0169", // LATIN SMALL LETTER U WITH TILDE
	"{\\=U}"                          : "\u016A", // LATIN CAPITAL LETTER U WITH MACRON
	"{\\=u}"                          : "\u016B", // LATIN SMALL LETTER U WITH MACRON
	"{\\u U}"                          : "\u016C", // LATIN CAPITAL LETTER U WITH BREVE
	"{\\u u}"                          : "\u016D", // LATIN SMALL LETTER U WITH BREVE
	"{\\r U}"                          : "\u016E", // LATIN CAPITAL LETTER U WITH RING ABOVE
	"{\\r u}"                          : "\u016F", // LATIN SMALL LETTER U WITH RING ABOVE
	"{\\H U}"                          : "\u0170", // LATIN CAPITAL LETTER U WITH DOUBLE ACUTE
	"{\\H u}"                          : "\u0171", // LATIN SMALL LETTER U WITH DOUBLE ACUTE
	"{\\k U}"                          : "\u0172", // LATIN CAPITAL LETTER U WITH OGONEK
	"{\\k u}"                          : "\u0173", // LATIN SMALL LETTER U WITH OGONEK
	"{\\^W}"                          : "\u0174", // LATIN CAPITAL LETTER W WITH CIRCUMFLEX
	"{\\^w}"                          : "\u0175", // LATIN SMALL LETTER W WITH CIRCUMFLEX
	"{\\^Y}"                          : "\u0176", // LATIN CAPITAL LETTER Y WITH CIRCUMFLEX
	"{\\^y}"                          : "\u0177", // LATIN SMALL LETTER Y WITH CIRCUMFLEX
	"{\\\"Y}"                         : "\u0178", // LATIN CAPITAL LETTER Y WITH DIAERESIS
	"{\\'Z}"                          : "\u0179", // LATIN CAPITAL LETTER Z WITH ACUTE
	"{\\'z}"                          : "\u017A", // LATIN SMALL LETTER Z WITH ACUTE
	"{\\.Z}"                          : "\u017B", // LATIN CAPITAL LETTER Z WITH DOT ABOVE
	"{\\.z}"                          : "\u017C", // LATIN SMALL LETTER Z WITH DOT ABOVE
	"{\\v Z}"                          : "\u017D", // LATIN CAPITAL LETTER Z WITH CARON
	"{\\v z}"                          : "\u017E", // LATIN SMALL LETTER Z WITH CARON
	"{\\v A}"                          : "\u01CD", // LATIN CAPITAL LETTER A WITH CARON
	"{\\v a}"                          : "\u01CE", // LATIN SMALL LETTER A WITH CARON
	"{\\v I}"                          : "\u01CF", // LATIN CAPITAL LETTER I WITH CARON
	"{\\v i}"                          : "\u01D0", // LATIN SMALL LETTER I WITH CARON
	"{\\v O}"                          : "\u01D1", // LATIN CAPITAL LETTER O WITH CARON
	"{\\v o}"                          : "\u01D2", // LATIN SMALL LETTER O WITH CARON
	"{\\v U}"                          : "\u01D3", // LATIN CAPITAL LETTER U WITH CARON
	"{\\v u}"                          : "\u01D4", // LATIN SMALL LETTER U WITH CARON
	"{\\v G}"                          : "\u01E6", // LATIN CAPITAL LETTER G WITH CARON
	"{\\v g}"                          : "\u01E7", // LATIN SMALL LETTER G WITH CARON
	"{\\v K}"                          : "\u01E8", // LATIN CAPITAL LETTER K WITH CARON
	"{\\v k}"                          : "\u01E9", // LATIN SMALL LETTER K WITH CARON
	"{\\k O}"                          : "\u01EA", // LATIN CAPITAL LETTER O WITH OGONEK
	"{\\k o}"                          : "\u01EB", // LATIN SMALL LETTER O WITH OGONEK
	"{\\v j}"                          : "\u01F0", // LATIN SMALL LETTER J WITH CARON
	"{\\'G}"                          : "\u01F4", // LATIN CAPITAL LETTER G WITH ACUTE
	"{\\'g}"                          : "\u01F5", // LATIN SMALL LETTER G WITH ACUTE
	"{\\.B}"                          : "\u1E02", // LATIN CAPITAL LETTER B WITH DOT ABOVE
	"{\\.b}"                          : "\u1E03", // LATIN SMALL LETTER B WITH DOT ABOVE
	"{\\d B}"                          : "\u1E04", // LATIN CAPITAL LETTER B WITH DOT BELOW
	"{\\d b}"                          : "\u1E05", // LATIN SMALL LETTER B WITH DOT BELOW
	"{\\b B}"                          : "\u1E06", // LATIN CAPITAL LETTER B WITH LINE BELOW
	"{\\b b}"                          : "\u1E07", // LATIN SMALL LETTER B WITH LINE BELOW
	"{\\.D}"                          : "\u1E0A", // LATIN CAPITAL LETTER D WITH DOT ABOVE
	"{\\.d}"                          : "\u1E0B", // LATIN SMALL LETTER D WITH DOT ABOVE
	"{\\d D}"                          : "\u1E0C", // LATIN CAPITAL LETTER D WITH DOT BELOW
	"{\\d d}"                          : "\u1E0D", // LATIN SMALL LETTER D WITH DOT BELOW
	"{\\b D}"                          : "\u1E0E", // LATIN CAPITAL LETTER D WITH LINE BELOW
	"{\\b d}"                          : "\u1E0F", // LATIN SMALL LETTER D WITH LINE BELOW
	"{\\c D}"                          : "\u1E10", // LATIN CAPITAL LETTER D WITH CEDILLA
	"{\\c d}"                          : "\u1E11", // LATIN SMALL LETTER D WITH CEDILLA
	"{\\.F}"                          : "\u1E1E", // LATIN CAPITAL LETTER F WITH DOT ABOVE
	"{\\.f}"                          : "\u1E1F", // LATIN SMALL LETTER F WITH DOT ABOVE
	"{\\=G}"                          : "\u1E20", // LATIN CAPITAL LETTER G WITH MACRON
	"{\\=g}"                          : "\u1E21", // LATIN SMALL LETTER G WITH MACRON
	"{\\.H}"                          : "\u1E22", // LATIN CAPITAL LETTER H WITH DOT ABOVE
	"{\\.h}"                          : "\u1E23", // LATIN SMALL LETTER H WITH DOT ABOVE
	"{\\d H}"                          : "\u1E24", // LATIN CAPITAL LETTER H WITH DOT BELOW
	"{\\d h}"                          : "\u1E25", // LATIN SMALL LETTER H WITH DOT BELOW
	"{\\\"H}"                         : "\u1E26", // LATIN CAPITAL LETTER H WITH DIAERESIS
	"{\\\"h}"                         : "\u1E27", // LATIN SMALL LETTER H WITH DIAERESIS
	"{\\c H}"                          : "\u1E28", // LATIN CAPITAL LETTER H WITH CEDILLA
	"{\\c h}"                          : "\u1E29", // LATIN SMALL LETTER H WITH CEDILLA
	"{\\'K}"                          : "\u1E30", // LATIN CAPITAL LETTER K WITH ACUTE
	"{\\'k}"                          : "\u1E31", // LATIN SMALL LETTER K WITH ACUTE
	"{\\d K}"                          : "\u1E32", // LATIN CAPITAL LETTER K WITH DOT BELOW
	"{\\d k}"                          : "\u1E33", // LATIN SMALL LETTER K WITH DOT BELOW
	"{\\b K}"                          : "\u1E34", // LATIN CAPITAL LETTER K WITH LINE BELOW
	"{\\b k}"                          : "\u1E35", // LATIN SMALL LETTER K WITH LINE BELOW
	"{\\d L}"                          : "\u1E36", // LATIN CAPITAL LETTER L WITH DOT BELOW
	"{\\d l}"                          : "\u1E37", // LATIN SMALL LETTER L WITH DOT BELOW
	"{\\b L}"                          : "\u1E3A", // LATIN CAPITAL LETTER L WITH LINE BELOW
	"{\\b l}"                          : "\u1E3B", // LATIN SMALL LETTER L WITH LINE BELOW
	"{\\'M}"                          : "\u1E3E", // LATIN CAPITAL LETTER M WITH ACUTE
	"{\\'m}"                          : "\u1E3F", // LATIN SMALL LETTER M WITH ACUTE
	"{\\.M}"                          : "\u1E40", // LATIN CAPITAL LETTER M WITH DOT ABOVE
	"{\\.m}"                          : "\u1E41", // LATIN SMALL LETTER M WITH DOT ABOVE
	"{\\d M}"                          : "\u1E42", // LATIN CAPITAL LETTER M WITH DOT BELOW
	"{\\d m}"                          : "\u1E43", // LATIN SMALL LETTER M WITH DOT BELOW
	"{\\.N}"                          : "\u1E44", // LATIN CAPITAL LETTER N WITH DOT ABOVE
	"{\\.n}"                          : "\u1E45", // LATIN SMALL LETTER N WITH DOT ABOVE
	"{\\d N}"                          : "\u1E46", // LATIN CAPITAL LETTER N WITH DOT BELOW
	"{\\d n}"                          : "\u1E47", // LATIN SMALL LETTER N WITH DOT BELOW
	"{\\b N}"                          : "\u1E48", // LATIN CAPITAL LETTER N WITH LINE BELOW
	"{\\b n}"                          : "\u1E49", // LATIN SMALL LETTER N WITH LINE BELOW
	"{\\'P}"                          : "\u1E54", // LATIN CAPITAL LETTER P WITH ACUTE
	"{\\'p}"                          : "\u1E55", // LATIN SMALL LETTER P WITH ACUTE
	"{\\.P}"                          : "\u1E56", // LATIN CAPITAL LETTER P WITH DOT ABOVE
	"{\\.p}"                          : "\u1E57", // LATIN SMALL LETTER P WITH DOT ABOVE
	"{\\.R}"                          : "\u1E58", // LATIN CAPITAL LETTER R WITH DOT ABOVE
	"{\\.r}"                          : "\u1E59", // LATIN SMALL LETTER R WITH DOT ABOVE
	"{\\d R}"                          : "\u1E5A", // LATIN CAPITAL LETTER R WITH DOT BELOW
	"{\\d r}"                          : "\u1E5B", // LATIN SMALL LETTER R WITH DOT BELOW
	"{\\b R}"                          : "\u1E5E", // LATIN CAPITAL LETTER R WITH LINE BELOW
	"{\\b r}"                          : "\u1E5F", // LATIN SMALL LETTER R WITH LINE BELOW
	"{\\.S}"                          : "\u1E60", // LATIN CAPITAL LETTER S WITH DOT ABOVE
	"{\\.s}"                          : "\u1E61", // LATIN SMALL LETTER S WITH DOT ABOVE
	"{\\d S}"                          : "\u1E62", // LATIN CAPITAL LETTER S WITH DOT BELOW
	"{\\d s}"                          : "\u1E63", // LATIN SMALL LETTER S WITH DOT BELOW
	"{\\.T}"                          : "\u1E6A", // LATIN CAPITAL LETTER T WITH DOT ABOVE
	"{\\.t}"                          : "\u1E6B", // LATIN SMALL LETTER T WITH DOT ABOVE
	"{\\d T}"                          : "\u1E6C", // LATIN CAPITAL LETTER T WITH DOT BELOW
	"{\\d t}"                          : "\u1E6D", // LATIN SMALL LETTER T WITH DOT BELOW
	"{\\b T}"                          : "\u1E6E", // LATIN CAPITAL LETTER T WITH LINE BELOW
	"{\\b t}"                          : "\u1E6F", // LATIN SMALL LETTER T WITH LINE BELOW
	"{\\~V}"                          : "\u1E7C", // LATIN CAPITAL LETTER V WITH TILDE
	"{\\~v}"                          : "\u1E7D", // LATIN SMALL LETTER V WITH TILDE
	"{\\d V}"                          : "\u1E7E", // LATIN CAPITAL LETTER V WITH DOT BELOW
	"{\\d v}"                          : "\u1E7F", // LATIN SMALL LETTER V WITH DOT BELOW
	"{\\`W}"                          : "\u1E80", // LATIN CAPITAL LETTER W WITH GRAVE
	"{\\`w}"                          : "\u1E81", // LATIN SMALL LETTER W WITH GRAVE
	"{\\'W}"                          : "\u1E82", // LATIN CAPITAL LETTER W WITH ACUTE
	"{\\'w}"                          : "\u1E83", // LATIN SMALL LETTER W WITH ACUTE
	"{\\\"W}"                         : "\u1E84", // LATIN CAPITAL LETTER W WITH DIAERESIS
	"{\\\"w}"                         : "\u1E85", // LATIN SMALL LETTER W WITH DIAERESIS
	"{\\.W}"                          : "\u1E86", // LATIN CAPITAL LETTER W WITH DOT ABOVE
	"{\\.w}"                          : "\u1E87", // LATIN SMALL LETTER W WITH DOT ABOVE
	"{\\d W}"                          : "\u1E88", // LATIN CAPITAL LETTER W WITH DOT BELOW
	"{\\d w}"                          : "\u1E89", // LATIN SMALL LETTER W WITH DOT BELOW
	"{\\.X}"                          : "\u1E8A", // LATIN CAPITAL LETTER X WITH DOT ABOVE
	"{\\.x}"                          : "\u1E8B", // LATIN SMALL LETTER X WITH DOT ABOVE
	"{\\\"X}"                         : "\u1E8C", // LATIN CAPITAL LETTER X WITH DIAERESIS
	"{\\\"x}"                         : "\u1E8D", // LATIN SMALL LETTER X WITH DIAERESIS
	"{\\.Y}"                          : "\u1E8E", // LATIN CAPITAL LETTER Y WITH DOT ABOVE
	"{\\.y}"                          : "\u1E8F", // LATIN SMALL LETTER Y WITH DOT ABOVE
	"{\\^Z}"                          : "\u1E90", // LATIN CAPITAL LETTER Z WITH CIRCUMFLEX
	"{\\^z}"                          : "\u1E91", // LATIN SMALL LETTER Z WITH CIRCUMFLEX
	"{\\d Z}"                          : "\u1E92", // LATIN CAPITAL LETTER Z WITH DOT BELOW
	"{\\d z}"                          : "\u1E93", // LATIN SMALL LETTER Z WITH DOT BELOW
	"{\\b Z}"                          : "\u1E94", // LATIN CAPITAL LETTER Z WITH LINE BELOW
	"{\\b z}"                          : "\u1E95", // LATIN SMALL LETTER Z WITH LINE BELOW
	"{\\b h}"                          : "\u1E96", // LATIN SMALL LETTER H WITH LINE BELOW
	"{\\\"t}"                         : "\u1E97", // LATIN SMALL LETTER T WITH DIAERESIS
	"{\\r w}"                          : "\u1E98", // LATIN SMALL LETTER W WITH RING ABOVE
	"{\\r y}"                          : "\u1e99", // LATIN SMALL LETTER Y WITH RING ABOVE
	"{\\d A}"                          : "\u1EA0", // LATIN CAPITAL LETTER A WITH DOT BELOW
	"{\\d a}"                          : "\u1EA1", // LATIN SMALL LETTER A WITH DOT BELOW
	"{\\d E}"                          : "\u1EB8", // LATIN CAPITAL LETTER E WITH DOT BELOW
	"{\\d e}"                          : "\u1EB9", // LATIN SMALL LETTER E WITH DOT BELOW
	"{\\~E}"                          : "\u1EBC", // LATIN CAPITAL LETTER E WITH TILDE
	"{\\~e}"                          : "\u1EBD", // LATIN SMALL LETTER E WITH TILDE
	"{\\d I}"                          : "\u1ECA", // LATIN CAPITAL LETTER I WITH DOT BELOW
	"{\\d i}"                          : "\u1ECB", // LATIN SMALL LETTER I WITH DOT BELOW
	"{\\d O}"                          : "\u1ECC", // LATIN CAPITAL LETTER O WITH DOT BELOW
	"{\\d o}"                          : "\u1ECD", // LATIN SMALL LETTER O WITH DOT BELOW
	"{\\d U}"                          : "\u1EE4", // LATIN CAPITAL LETTER U WITH DOT BELOW
	"{\\d u}"                          : "\u1EE5", // LATIN SMALL LETTER U WITH DOT BELOW
	"{\\`Y}"                          : "\u1EF2", // LATIN CAPITAL LETTER Y WITH GRAVE
	"{\\`y}"                          : "\u1EF3", // LATIN SMALL LETTER Y WITH GRAVE
	"{\\d Y}"                          : "\u1EF4", // LATIN CAPITAL LETTER Y WITH DOT BELOW
	"{\\d y}"                          : "\u1EF5", // LATIN SMALL LETTER Y WITH DOT BELOW
	"{\\~Y}"                          : "\u1EF8", // LATIN CAPITAL LETTER Y WITH TILDE
	"{\\~y}"                          : "\u1EF9", // LATIN SMALL LETTER Y WITH TILDE
	"{\\~}"                           : "\u223C", // TILDE OPERATOR
	"~",                               : "\u00A0" // NO-BREAK SPACE
	// BBT
	"'": '\u02BC', // MODIFIER LETTER APOSTROPHE
	"''": '\u201D',
	"''''": '\u2057', // QUADRUPLE PRIME
	"'n": '\u0149', // LATIN SMALL LETTER N PRECEDED BY APOSTROPHE
	"'n{}": '\u0149', // LATIN SMALL LETTER N PRECEDED BY APOSTROPHE
	",": '\u201A', // SINGLE LOW-9 QUOTATION MARK
	",,": '\u201E', // DOUBLE LOW-9 QUOTATION MARK
	"-": '\u2010', // HYPHEN
	".": '\u2024', // ONE DOT LEADER
	"..": '\u2025', // TWO DOT LEADER
	":": '\u2236', // x \colon, RATIO
	":=": '\u2254', // COLON EQUALS
	"<\\kern-0.58em(": '\u2993', // LEFT ARC LESS-THAN BRACKET
	"=:": '\u2255', // EQUALS COLON
	"IJ{}": '\u0132', // LATIN CAPITAL LIGATURE IJ
	"M{}": '\u039C', // GREEK CAPITAL LETTER MU
	"N{}": '\u039D', // GREEK CAPITAL LETTER NU
	"O{}": '\u039F', // GREEK CAPITAL LETTER OMICRON
	"\\#": '#', // NUMBER SIGN
	"\\$": '$',
	"\\%": '%', // PERCENT SIGN
	"\\&": '&',
	"\\'": '\u0301', // COMBINING ACUTE ACCENT
	"\\'$\\alpha$": '\u03AC', // GREEK SMALL LETTER ALPHA WITH TONOS
	"\\'$\\alpha${}": '\u03AC', // GREEK SMALL LETTER ALPHA WITH TONOS
	"\\'A": '\u00C1', // LATIN CAPITAL LETTER A WITH ACUTE
	"\\'C": '\u0106', // LATIN CAPITAL LETTER C WITH ACUTE
	"\\'E": '\u00C9', // LATIN CAPITAL LETTER E WITH ACUTE
	"\\'H": '\u0389', // GREEK CAPITAL LETTER ETA WITH TONOS
	"\\'I": '\u00CD', // LATIN CAPITAL LETTER I WITH ACUTE
	"\\'L": '\u0139', // LATIN CAPITAL LETTER L WITH ACUTE
	"\\'N": '\u0143', // LATIN CAPITAL LETTER N WITH ACUTE
	"\\'O": '\u00D3', // LATIN CAPITAL LETTER O WITH ACUTE
	"\\'R": '\u0154', // LATIN CAPITAL LETTER R WITH ACUTE
	"\\'S": '\u015A', // LATIN CAPITAL LETTER S WITH ACUTE
	"\\'U": '\u00DA', // LATIN CAPITAL LETTER U WITH ACUTE
	"\\'Y": '\u00DD', // LATIN CAPITAL LETTER Y WITH ACUTE
	"\\'Z": '\u0179', // LATIN CAPITAL LETTER Z WITH ACUTE
	"\\'\\i": '\u00ED', // LATIN SMALL LETTER I WITH ACUTE
	"\\'\\i{}": '\u00ED', // LATIN SMALL LETTER I WITH ACUTE
	"\\'a": '\u00E1', // LATIN SMALL LETTER A WITH ACUTE
	"\\'c": '\u0107', // LATIN SMALL LETTER C WITH ACUTE
	"\\'e": '\u00E9', // LATIN SMALL LETTER E WITH ACUTE
	"\\'g": '\u01F5', // LATIN SMALL LETTER G WITH ACUTE
	"\\'l": '\u013A', // LATIN SMALL LETTER L WITH ACUTE
	"\\'n": '\u0144', // LATIN SMALL LETTER N WITH ACUTE
	"\\'o": '\u00F3', // LATIN SMALL LETTER O WITH ACUTE
	"\\'r": '\u0155', // LATIN SMALL LETTER R WITH ACUTE
	"\\'s": '\u015B', // LATIN SMALL LETTER S WITH ACUTE
	"\\'u": '\u00FA', // LATIN SMALL LETTER U WITH ACUTE
	"\\'y": '\u00FD', // LATIN SMALL LETTER Y WITH ACUTE
	"\\'z": '\u017A', // LATIN SMALL LETTER Z WITH ACUTE
	"\\'{A}": '\u00C1', // LATIN CAPITAL LETTER A WITH ACUTE
	"\\'{C}": '\u0106', // LATIN CAPITAL LETTER C WITH ACUTE
	"\\'{E}": '\u00C9', // LATIN CAPITAL LETTER E WITH ACUTE
	"\\'{H}": '\u0389', // GREEK CAPITAL LETTER ETA WITH TONOS
	"\\'{I}": '\u00CD', // LATIN CAPITAL LETTER I WITH ACUTE
	"\\'{L}": '\u0139', // LATIN CAPITAL LETTER L WITH ACUTE
	"\\'{N}": '\u0143', // LATIN CAPITAL LETTER N WITH ACUTE
	"\\'{O}": '\u00D3', // LATIN CAPITAL LETTER O WITH ACUTE
	"\\'{R}": '\u0154', // LATIN CAPITAL LETTER R WITH ACUTE
	"\\'{S}": '\u015A', // LATIN CAPITAL LETTER S WITH ACUTE
	"\\'{U}": '\u00DA', // LATIN CAPITAL LETTER U WITH ACUTE
	"\\'{Y}": '\u00DD', // LATIN CAPITAL LETTER Y WITH ACUTE
	"\\'{Z}": '\u0179', // LATIN CAPITAL LETTER Z WITH ACUTE
	"\\'{a}": '\u00E1', // LATIN SMALL LETTER A WITH ACUTE
	"\\'{c}": '\u0107', // LATIN SMALL LETTER C WITH ACUTE
	"\\'{e}": '\u00E9', // LATIN SMALL LETTER E WITH ACUTE
	"\\'{g}": '\u01F5', // LATIN SMALL LETTER G WITH ACUTE
	"\\'{l}": '\u013A', // LATIN SMALL LETTER L WITH ACUTE
	"\\'{n}": '\u0144', // LATIN SMALL LETTER N WITH ACUTE
	"\\'{o}": '\u00F3', // LATIN SMALL LETTER O WITH ACUTE
	"\\'{r}": '\u0155', // LATIN SMALL LETTER R WITH ACUTE
	"\\'{s}": '\u015B', // LATIN SMALL LETTER S WITH ACUTE
	"\\'{u}": '\u00FA', // LATIN SMALL LETTER U WITH ACUTE
	"\\'{y}": '\u00FD', // LATIN SMALL LETTER Y WITH ACUTE
	"\\'{z}": '\u017A', // LATIN SMALL LETTER Z WITH ACUTE
	"\\'{}O": '\u038C', // GREEK CAPITAL LETTER OMICRON WITH TONOS
	"\\'{}O{}": '\u038C', // GREEK CAPITAL LETTER OMICRON WITH TONOS
	"\\'{}{I}": '\u038A', // GREEK CAPITAL LETTER IOTA WITH TONOS
	"\\,": '\u2009',
	"\\-": '\u00AD', // SOFT HYPHEN
	"\\.": '\u0307', // COMBINING DOT ABOVE
	"\\.C": '\u010A', // LATIN CAPITAL LETTER C WITH DOT ABOVE
	"\\.E": '\u0116', // LATIN CAPITAL LETTER E WITH DOT ABOVE
	"\\.G": '\u0120', // LATIN CAPITAL LETTER G WITH DOT ABOVE
	"\\.I": '\u0130', // LATIN CAPITAL LETTER I WITH DOT ABOVE
	"\\.Z": '\u017B', // LATIN CAPITAL LETTER Z WITH DOT ABOVE
	"\\.c": '\u010B', // LATIN SMALL LETTER C WITH DOT ABOVE
	"\\.e": '\u0117', // LATIN SMALL LETTER E WITH DOT ABOVE
	"\\.g": '\u0121', // LATIN SMALL LETTER G WITH DOT ABOVE
	"\\.z": '\u017C', // LATIN SMALL LETTER Z WITH DOT ABOVE
	"\\.{C}": '\u010A', // LATIN CAPITAL LETTER C WITH DOT ABOVE
	"\\.{E}": '\u0116', // LATIN CAPITAL LETTER E WITH DOT ABOVE
	"\\.{G}": '\u0120', // LATIN CAPITAL LETTER G WITH DOT ABOVE
	"\\.{I}": '\u0130', // LATIN CAPITAL LETTER I WITH DOT ABOVE
	"\\.{Z}": '\u017B', // LATIN CAPITAL LETTER Z WITH DOT ABOVE
	"\\.{c}": '\u010B', // LATIN SMALL LETTER C WITH DOT ABOVE
	"\\.{e}": '\u0117', // LATIN SMALL LETTER E WITH DOT ABOVE
	"\\.{g}": '\u0121', // LATIN SMALL LETTER G WITH DOT ABOVE
	"\\.{z}": '\u017C', // LATIN SMALL LETTER Z WITH DOT ABOVE
	"\\:": '\u205F',
	"\\;": '\u2004',
	"\\=": '\u0304', // COMBINING MACRON
	"\\=A": '\u0100', // LATIN CAPITAL LETTER A WITH MACRON
	"\\=E": '\u0112', // LATIN CAPITAL LETTER E WITH MACRON
	"\\=I": '\u012A', // LATIN CAPITAL LETTER I WITH MACRON
	"\\=O": '\u014C', // LATIN CAPITAL LETTER O WITH MACRON
	"\\=U": '\u016A', // LATIN CAPITAL LETTER U WITH MACRON
	"\\=a": '\u0101', // LATIN SMALL LETTER A WITH MACRON
	"\\=e": '\u0113', // LATIN SMALL LETTER E WITH MACRON
	"\\=o": '\u014D', // LATIN SMALL LETTER O WITH MACRON
	"\\=u": '\u016B', // LATIN SMALL LETTER U WITH MACRON
	"\\={A}": '\u0100', // LATIN CAPITAL LETTER A WITH MACRON
	"\\={E}": '\u0112', // LATIN CAPITAL LETTER E WITH MACRON
	"\\={I}": '\u012A', // LATIN CAPITAL LETTER I WITH MACRON
	"\\={O}": '\u014C', // LATIN CAPITAL LETTER O WITH MACRON
	"\\={U}": '\u016A', // LATIN CAPITAL LETTER U WITH MACRON
	"\\={\\i}": '\u012B', // LATIN SMALL LETTER I WITH MACRON
	"\\={a}": '\u0101', // LATIN SMALL LETTER A WITH MACRON
	"\\={e}": '\u0113', // LATIN SMALL LETTER E WITH MACRON
	"\\={o}": '\u014D', // LATIN SMALL LETTER O WITH MACRON
	"\\={u}": '\u016B', // LATIN SMALL LETTER U WITH MACRON
	"\\AA": '\u00C5', // LATIN CAPITAL LETTER A WITH RING ABOVE
	"\\AA{}": '\u00C5', // LATIN CAPITAL LETTER A WITH RING ABOVE
	"\\AC": '\u223F', // SINE WAVE, alternating current
	"\\AC{}": '\u223F', // SINE WAVE, alternating current
	"\\AE": '\u00C6', // LATIN CAPITAL LETTER AE
	"\\AE{}": '\u00C6', // LATIN CAPITAL LETTER AE
	"\\APLboxquestion": '\u2370', // APL FUNCTIONAL SYMBOL QUAD QUESTION
	"\\APLboxquestion{}": '\u2370', // APL FUNCTIONAL SYMBOL QUAD QUESTION
	"\\APLboxupcaret": '\u2353', // APL FUNCTIONAL SYMBOL QUAD UP CARET
	"\\APLboxupcaret{}": '\u2353', // APL FUNCTIONAL SYMBOL QUAD UP CARET
	"\\APLcomment": '\u235D', // APL FUNCTIONAL SYMBOL UP SHOE JOT
	"\\APLcomment{}": '\u235D', // APL FUNCTIONAL SYMBOL UP SHOE JOT
	"\\APLdownarrowbox": '\u2357', // APL FUNCTIONAL SYMBOL QUAD DOWNWARDS ARROW
	"\\APLdownarrowbox{}": '\u2357', // APL FUNCTIONAL SYMBOL QUAD DOWNWARDS ARROW
	"\\APLinput": '\u235E', // APL FUNCTIONAL SYMBOL QUOTE QUAD
	"\\APLinput{}": '\u235E', // APL FUNCTIONAL SYMBOL QUOTE QUAD
	"\\APLinv": '\u2339', // APL FUNCTIONAL SYMBOL QUAD DIVIDE
	"\\APLinv{}": '\u2339', // APL FUNCTIONAL SYMBOL QUAD DIVIDE
	"\\APLleftarrowbox": '\u2347', // APL FUNCTIONAL SYMBOL QUAD LEFTWARDS ARROW
	"\\APLleftarrowbox{}": '\u2347', // APL FUNCTIONAL SYMBOL QUAD LEFTWARDS ARROW
	"\\APLlog": '\u235F', // APL FUNCTIONAL SYMBOL CIRCLE STAR
	"\\APLlog{}": '\u235F', // APL FUNCTIONAL SYMBOL CIRCLE STAR
	"\\APLrightarrowbox": '\u2348', // APL FUNCTIONAL SYMBOL QUAD RIGHTWARDS ARROW
	"\\APLrightarrowbox{}": '\u2348', // APL FUNCTIONAL SYMBOL QUAD RIGHTWARDS ARROW
	"\\APLuparrowbox": '\u2350', // APL FUNCTIONAL SYMBOL QUAD UPWARDS ARROW
	"\\APLuparrowbox{}": '\u2350', // APL FUNCTIONAL SYMBOL QUAD UPWARDS ARROW
	"\\Alpha": '\u0391', // GREEK CAPITAL LETTER ALPHA
	"\\Alpha{}": '\u0391', // GREEK CAPITAL LETTER ALPHA
	"\\Angle": '\u299C', // RIGHT ANGLE VARIANT WITH SQUARE
	"\\Angle{}": '\u299C', // RIGHT ANGLE VARIANT WITH SQUARE
	"\\A{A}": '\u00C5', // LATIN CAPITAL LETTER A WITH RING ABOVE
	"\\A{C}": '\u223F', // SINE WAVE, alternating current
	"\\A{E}": '\u00C6', // LATIN CAPITAL LETTER AE
	"\\Barv": '\u2AE7', // SHORT DOWN TACK WITH OVERBAR
	"\\Barv{}": '\u2AE7', // SHORT DOWN TACK WITH OVERBAR
	"\\Beta": '\u0392', // GREEK CAPITAL LETTER BETA
	"\\Beta{}": '\u0392', // GREEK CAPITAL LETTER BETA
	"\\Bumpeq": '\u224E', // GEOMETRICALLY EQUIVALENT TO
	"\\Bumpeq{}": '\u224E', // GEOMETRICALLY EQUIVALENT TO
	"\\Cap": '\u22D2', // DOUBLE INTERSECTION
	"\\CapitalDifferentialD": '\u2145', // = \DD (wrisym), DOUBLE-STRUCK ITALIC CAPITAL D
	"\\CapitalDifferentialD{}": '\u2145', // = \DD (wrisym), DOUBLE-STRUCK ITALIC CAPITAL D
	"\\Cap{}": '\u22D2', // DOUBLE INTERSECTION
	"\\CheckedBox": '\u2611', // t \Checkedbox (marvosym), BALLOT BOX WITH CHECK
	"\\CheckedBox{}": '\u2611', // t \Checkedbox (marvosym), BALLOT BOX WITH CHECK
	"\\Chi": '\u03A7', // GREEK CAPITAL LETTER CHI
	"\\Chi{}": '\u03A7', // GREEK CAPITAL LETTER CHI
	"\\Colon": '\u2237', // PROPORTION
	"\\Coloneqq": '\u2A74', // # ::=, x \Coloneq (txfonts), DOUBLE COLON EQUAL
	"\\Coloneqq{}": '\u2A74', // # ::=, x \Coloneq (txfonts), DOUBLE COLON EQUAL
	"\\Colon{}": '\u2237', // PROPORTION
	"\\ComplexI": '\u2148', // = \ii (wrisym), DOUBLE-STRUCK ITALIC SMALL I
	"\\ComplexI{}": '\u2148', // = \ii (wrisym), DOUBLE-STRUCK ITALIC SMALL I
	"\\ComplexJ": '\u2149', // = \jj (wrisym), DOUBLE-STRUCK ITALIC SMALL J
	"\\ComplexJ{}": '\u2149', // = \jj (wrisym), DOUBLE-STRUCK ITALIC SMALL J
	"\\Cup": '\u22D3', // DOUBLE UNION
	"\\Cup{}": '\u22D3', // DOUBLE UNION
	"\\DDownarrow": '\u27F1', // DOWNWARDS QUADRUPLE ARROW
	"\\DDownarrow{}": '\u27F1', // DOWNWARDS QUADRUPLE ARROW
	"\\DH": '\u00D0', // LATIN CAPITAL LETTER ETH
	"\\DH{}": '\u00D0', // LATIN CAPITAL LETTER ETH
	"\\DJ": '\u0110', // LATIN CAPITAL LETTER D WITH STROKE
	"\\DJ{}": '\u0110', // LATIN CAPITAL LETTER D WITH STROKE
	"\\DashV": '\u2AE5', // DOUBLE VERTICAL BAR DOUBLE LEFT TURNSTILE
	"\\DashVDash": '\u27DA', // LEFT AND RIGHT DOUBLE TURNSTILE
	"\\DashVDash{}": '\u27DA', // LEFT AND RIGHT DOUBLE TURNSTILE
	"\\DashV{}": '\u2AE5', // DOUBLE VERTICAL BAR DOUBLE LEFT TURNSTILE
	"\\Dashv": '\u2AE4', // VERTICAL BAR DOUBLE LEFT TURNSTILE
	"\\Dashv{}": '\u2AE4', // VERTICAL BAR DOUBLE LEFT TURNSTILE
	"\\Ddownarrow": '\u290B', // DOWNWARDS TRIPLE ARROW
	"\\Ddownarrow{}": '\u290B', // DOWNWARDS TRIPLE ARROW
	"\\Delta": '\u0394', // GREEK CAPITAL LETTER DELTA
	"\\Delta{}": '\u0394', // GREEK CAPITAL LETTER DELTA
	"\\Diamond": '\u25C7', // WHITE DIAMOND; diamond, open
	"\\Diamonddot": '\u27D0', // WHITE DIAMOND WITH CENTRED DOT
	"\\Diamonddot{}": '\u27D0', // WHITE DIAMOND WITH CENTRED DOT
	"\\Diamond{}": '\u25C7', // WHITE DIAMOND; diamond, open
	"\\DifferentialD": '\u2146', // = \dd (wrisym), DOUBLE-STRUCK ITALIC SMALL D
	"\\DifferentialD{}": '\u2146', // = \dd (wrisym), DOUBLE-STRUCK ITALIC SMALL D
	"\\Digamma": '\u03DC', // GREEK LETTER DIGAMMA
	"\\Digamma{}": '\u03DC', // GREEK LETTER DIGAMMA
	"\\DownArrowBar": '\u2913', // DOWNWARDS ARROW TO BAR
	"\\DownArrowBar{}": '\u2913', // DOWNWARDS ARROW TO BAR
	"\\DownArrowUpArrow": '\u21F5', // DOWNWARDS ARROW LEFTWARDS OF UPWARDS ARROW
	"\\DownArrowUpArrow{}": '\u21F5', // DOWNWARDS ARROW LEFTWARDS OF UPWARDS ARROW
	"\\DownLeftRightVector": '\u2950', // LEFT BARB DOWN RIGHT BARB DOWN HARPOON
	"\\DownLeftRightVector{}": '\u2950', // LEFT BARB DOWN RIGHT BARB DOWN HARPOON
	"\\DownLeftTeeVector": '\u295E', // LEFTWARDS HARPOON WITH BARB DOWN FROM BAR
	"\\DownLeftTeeVector{}": '\u295E', // LEFTWARDS HARPOON WITH BARB DOWN FROM BAR
	"\\DownLeftVectorBar": '\u2956', // LEFTWARDS HARPOON WITH BARB DOWN TO BAR
	"\\DownLeftVectorBar{}": '\u2956', // LEFTWARDS HARPOON WITH BARB DOWN TO BAR
	"\\DownRightTeeVector": '\u295F', // RIGHTWARDS HARPOON WITH BARB DOWN FROM BAR
	"\\DownRightTeeVector{}": '\u295F', // RIGHTWARDS HARPOON WITH BARB DOWN FROM BAR
	"\\DownRightVectorBar": '\u2957', // RIGHTWARDS HARPOON WITH BARB DOWN TO BAR
	"\\DownRightVectorBar{}": '\u2957', // RIGHTWARDS HARPOON WITH BARB DOWN TO BAR
	"\\Downarrow": '\u21D3', // DOWNWARDS DOUBLE ARROW
	"\\Downarrow{}": '\u21D3', // DOWNWARDS DOUBLE ARROW
	"\\D{H}": '\u00D0', // LATIN CAPITAL LETTER ETH
	"\\D{J}": '\u0110', // LATIN CAPITAL LETTER D WITH STROKE
	"\\ElOr": '\u2A56', // TWO INTERSECTING LOGICAL OR
	"\\ElOr{}": '\u2A56', // TWO INTERSECTING LOGICAL OR
	"\\Elolarr": '\u2940', // ANTICLOCKWISE CLOSED CIRCLE ARROW
	"\\Elolarr{}": '\u2940', // ANTICLOCKWISE CLOSED CIRCLE ARROW
	"\\Elorarr": '\u2941', // CLOCKWISE CLOSED CIRCLE ARROW
	"\\Elorarr{}": '\u2941', // CLOCKWISE CLOSED CIRCLE ARROW
	"\\Elroang": '\u2986', // RIGHT WHITE PARENTHESIS
	"\\Elroang{}": '\u2986', // RIGHT WHITE PARENTHESIS
	"\\ElsevierGlyph{2129}": '\u2129', // TURNED GREEK SMALL LETTER IOTA
	"\\ElsevierGlyph{21B3}": '\u21B3', // DOWNWARDS ARROW WITH TIP RIGHTWARDS
	"\\ElsevierGlyph{2232}": '\u2232', // CLOCKWISE CONTOUR INTEGRAL
	"\\ElsevierGlyph{2233}": '\u2233', // ANTICLOCKWISE CONTOUR INTEGRAL
	"\\ElsevierGlyph{2238}": '\u2238', // DOT MINUS
	"\\ElsevierGlyph{2242}": '\u2242', // MINUS TILDE
	"\\ElsevierGlyph{225A}": '\u225A', // EQUIANGULAR TO
	"\\ElsevierGlyph{225F}": '\u225F', // QUESTIONED EQUAL TO
	"\\ElsevierGlyph{2274}": '\u2274', // NEITHER LESS-THAN NOR EQUIVALENT TO
	"\\ElsevierGlyph{2275}": '\u2275', // NEITHER GREATER-THAN NOR EQUIVALENT TO
	"\\ElsevierGlyph{22C0}": '\u22C0', // N-ARY LOGICAL AND
	"\\ElsevierGlyph{22C1}": '\u22C1', // N-ARY LOGICAL OR
	"\\ElsevierGlyph{300A}": '\u300A', // LEFT DOUBLE ANGLE BRACKET
	"\\ElsevierGlyph{300B}": '\u300B', // RIGHT DOUBLE ANGLE BRACKET
	"\\ElsevierGlyph{3018}": '\u2985', // LEFT WHITE PARENTHESIS
	"\\ElsevierGlyph{3019}": '\u3019', // RIGHT WHITE TORTOISE SHELL BRACKET
	"\\ElsevierGlyph{E20A}": '\u2926', // SOUTH WEST ARROW WITH HOOK
	"\\ElsevierGlyph{E20B}": '\u2925', // SOUTH EAST ARROW WITH HOOK
	"\\ElsevierGlyph{E20C}": '\u2923', // NORTH WEST ARROW WITH HOOK
	"\\ElsevierGlyph{E20D}": '\u2924', // NORTH EAST ARROW WITH HOOK
	"\\ElsevierGlyph{E20E}": '\u2928', // NORTH EAST ARROW AND SOUTH EAST ARROW
	"\\ElsevierGlyph{E20F}": '\u2929', // SOUTH EAST ARROW AND SOUTH WEST ARROW
	"\\ElsevierGlyph{E210}": '\u292A', // SOUTH WEST ARROW AND NORTH WEST ARROW
	"\\ElsevierGlyph{E211}": '\u2927', // NORTH WEST ARROW AND NORTH EAST ARROW
	"\\ElsevierGlyph{E212}": '\u2905', // RIGHTWARDS TWO-HEADED ARROW FROM BAR
	"\\ElsevierGlyph{E214}": '\u297C', // LEFT FISH TAIL
	"\\ElsevierGlyph{E215}": '\u297D', // RIGHT FISH TAIL
	"\\ElsevierGlyph{E219}": '\u2937', // ARROW POINTING DOWNWARDS THEN CURVING RIGHTWARDS
	"\\ElsevierGlyph{E21A}": '\u2936', // ARROW POINTING DOWNWARDS THEN CURVING LEFTWARDS
	"\\ElsevierGlyph{E21C}": '\u2933', // WAVE ARROW POINTING DIRECTLY RIGHT
	"\\ElsevierGlyph{E259}": '\u2A3C', // INTERIOR PRODUCT
	"\\ElsevierGlyph{E25A}": '\u2A25', // PLUS SIGN WITH DOT BELOW
	"\\ElsevierGlyph{E25B}": '\u2A2A', // MINUS SIGN WITH DOT BELOW
	"\\ElsevierGlyph{E25C}": '\u2A2D', // PLUS SIGN IN LEFT HALF CIRCLE
	"\\ElsevierGlyph{E25D}": '\u2A2E', // PLUS SIGN IN RIGHT HALF CIRCLE
	"\\ElsevierGlyph{E25E}": '\u2A34', // MULTIPLICATION SIGN IN LEFT HALF CIRCLE
	"\\ElsevierGlyph{E260}": '\u29B5', // CIRCLE WITH HORIZONTAL BAR
	"\\ElsevierGlyph{E291}": '\u2994', // RIGHT ARC GREATER-THAN BRACKET
	"\\ElsevierGlyph{E30D}": '\u2AEB', // DOUBLE UP TACK
	"\\ElsevierGlyph{E36E}": '\u2A55', // TWO INTERSECTING LOGICAL AND
	"\\ElsevierGlyph{E372}": '\u29DC', // INCOMPLETE INFINITY
	"\\ElsevierGlyph{E381}": '\u25B1', // WHITE PARALLELOGRAM
	"\\ElsevierGlyph{E395}": '\u2A10', // CIRCULATION FUNCTION
	"\\ElsevierGlyph{E61B}": '\u29B6', // CIRCLED VERTICAL BAR
	"\\ElsevierGlyph{E838}": '\u233D', // APL FUNCTIONAL SYMBOL CIRCLE STILE
	"\\Elxsqcup": '\u2A06', // N-ARY SQUARE UNION OPERATOR
	"\\Elxsqcup{}": '\u2A06', // N-ARY SQUARE UNION OPERATOR
	"\\Elxuplus": '\u2A04', // N-ARY UNION OPERATOR WITH PLUS
	"\\Elxuplus{}": '\u2A04', // N-ARY UNION OPERATOR WITH PLUS
	"\\ElzAnd": '\u2A53', // DOUBLE LOGICAL AND
	"\\ElzAnd{}": '\u2A53', // DOUBLE LOGICAL AND
	"\\ElzCint": '\u2A0D', // FINITE PART INTEGRAL
	"\\ElzCint{}": '\u2A0D', // FINITE PART INTEGRAL
	"\\ElzInf": '\u2A07', // TWO LOGICAL AND OPERATOR
	"\\ElzInf{}": '\u2A07', // TWO LOGICAL AND OPERATOR
	"\\ElzLap": '\u29CA', // TRIANGLE WITH DOT ABOVE
	"\\ElzLap{}": '\u29CA', // TRIANGLE WITH DOT ABOVE
	"\\ElzOr": '\u2A54', // DOUBLE LOGICAL OR
	"\\ElzOr{}": '\u2A54', // DOUBLE LOGICAL OR
	"\\ElzRlarr": '\u2942', // RIGHTWARDS ARROW ABOVE SHORT LEFTWARDS ARROW
	"\\ElzRlarr{}": '\u2942', // RIGHTWARDS ARROW ABOVE SHORT LEFTWARDS ARROW
	"\\ElzSup": '\u2A08', // TWO LOGICAL OR OPERATOR
	"\\ElzSup{}": '\u2A08', // TWO LOGICAL OR OPERATOR
	"\\ElzThr": '\u2A05', // N-ARY SQUARE INTERSECTION OPERATOR
	"\\ElzThr{}": '\u2A05', // N-ARY SQUARE INTERSECTION OPERATOR
	"\\ElzTimes": '\u2A2F', // VECTOR OR CROSS PRODUCT
	"\\ElzTimes{}": '\u2A2F', // VECTOR OR CROSS PRODUCT
	"\\Elzbar": '\u0336', // COMBINING LONG STROKE OVERLAY
	"\\Elzbar{}": '\u0336', // COMBINING LONG STROKE OVERLAY
	"\\Elzbtdl": '\u026C', // LATIN SMALL LETTER L WITH BELT
	"\\Elzbtdl{}": '\u026C', // LATIN SMALL LETTER L WITH BELT
	"\\Elzcirfb": '\u25D2', // CIRCLE WITH LOWER HALF BLACK
	"\\Elzcirfb{}": '\u25D2', // CIRCLE WITH LOWER HALF BLACK
	"\\Elzcirfl": '\u25D0', // CIRCLE WITH LEFT HALF BLACK
	"\\Elzcirfl{}": '\u25D0', // CIRCLE WITH LEFT HALF BLACK
	"\\Elzcirfr": '\u25D1', // CIRCLE WITH RIGHT HALF BLACK
	"\\Elzcirfr{}": '\u25D1', // CIRCLE WITH RIGHT HALF BLACK
	"\\Elzclomeg": '\u0277', // LATIN SMALL LETTER CLOSED OMEGA
	"\\Elzclomeg{}": '\u0277', // LATIN SMALL LETTER CLOSED OMEGA
	"\\Elzddfnc": '\u2999', // DOTTED FENCE
	"\\Elzddfnc{}": '\u2999', // DOTTED FENCE
	"\\Elzdefas": '\u29CB', // TRIANGLE WITH UNDERBAR
	"\\Elzdefas{}": '\u29CB', // TRIANGLE WITH UNDERBAR
	"\\Elzdlcorn": '\u23A3', // LEFT SQUARE BRACKET LOWER CORNER
	"\\Elzdlcorn{}": '\u23A3', // LEFT SQUARE BRACKET LOWER CORNER
	"\\Elzdshfnc": '\u2506', // BOX DRAWINGS LIGHT TRIPLE DASH VERTICAL
	"\\Elzdshfnc{}": '\u2506', // BOX DRAWINGS LIGHT TRIPLE DASH VERTICAL
	"\\Elzdyogh": '\u02A4', // LATIN SMALL LETTER DEZH DIGRAPH
	"\\Elzdyogh{}": '\u02A4', // LATIN SMALL LETTER DEZH DIGRAPH
	"\\Elzesh": '\u0283', // LATIN SMALL LETTER ESH
	"\\Elzesh{}": '\u0283', // LATIN SMALL LETTER ESH
	"\\Elzfhr": '\u027E', // LATIN SMALL LETTER R WITH FISHHOOK
	"\\Elzfhr{}": '\u027E', // LATIN SMALL LETTER R WITH FISHHOOK
	"\\Elzglst": '\u0294', // LATIN LETTER GLOTTAL STOP
	"\\Elzglst{}": '\u0294', // LATIN LETTER GLOTTAL STOP
	"\\Elzhlmrk": '\u02D1', // MODIFIER LETTER HALF TRIANGULAR COLON
	"\\Elzhlmrk{}": '\u02D1', // MODIFIER LETTER HALF TRIANGULAR COLON
	"\\Elzinglst": '\u0296', // LATIN LETTER INVERTED GLOTTAL STOP
	"\\Elzinglst{}": '\u0296', // LATIN LETTER INVERTED GLOTTAL STOP
	"\\Elzinvv": '\u028C', // LATIN SMALL LETTER TURNED V
	"\\Elzinvv{}": '\u028C', // LATIN SMALL LETTER TURNED V
	"\\Elzinvw": '\u028D', // LATIN SMALL LETTER TURNED W
	"\\Elzinvw{}": '\u028D', // LATIN SMALL LETTER TURNED W
	"\\Elzlmrk": '\u02D0', // MODIFIER LETTER TRIANGULAR COLON
	"\\Elzlmrk{}": '\u02D0', // MODIFIER LETTER TRIANGULAR COLON
	"\\Elzlow": '\u02D5', // MODIFIER LETTER DOWN TACK
	"\\Elzlow{}": '\u02D5', // MODIFIER LETTER DOWN TACK
	"\\Elzlpargt": '\u29A0', // SPHERICAL ANGLE OPENING LEFT
	"\\Elzlpargt{}": '\u29A0', // SPHERICAL ANGLE OPENING LEFT
	"\\Elzltlmr": '\u0271', // LATIN SMALL LETTER M WITH HOOK
	"\\Elzltlmr{}": '\u0271', // LATIN SMALL LETTER M WITH HOOK
	"\\Elzltln": '\u0272', // LATIN SMALL LETTER N WITH LEFT HOOK
	"\\Elzltln{}": '\u0272', // LATIN SMALL LETTER N WITH LEFT HOOK
	"\\Elzminhat": '\u2A5F', // LOGICAL AND WITH UNDERBAR
	"\\Elzminhat{}": '\u2A5F', // LOGICAL AND WITH UNDERBAR
	"\\Elzopeno": '\u0254', // LATIN SMALL LETTER OPEN O
	"\\Elzopeno{}": '\u0254', // LATIN SMALL LETTER OPEN O
	"\\Elzpalh": '\u0321', // COMBINING PALATALIZED HOOK BELOW
	"\\Elzpalh{}": '\u0321', // COMBINING PALATALIZED HOOK BELOW
	"\\Elzpbgam": '\u0264', // LATIN SMALL LETTER RAMS HORN
	"\\Elzpbgam{}": '\u0264', // LATIN SMALL LETTER RAMS HORN
	"\\Elzpgamma": '\u0263', // LATIN SMALL LETTER GAMMA
	"\\Elzpgamma{}": '\u0263', // LATIN SMALL LETTER GAMMA
	"\\Elzpscrv": '\u028B', // LATIN SMALL LETTER V WITH HOOK
	"\\Elzpscrv{}": '\u028B', // LATIN SMALL LETTER V WITH HOOK
	"\\Elzpupsil": '\u028A', // LATIN SMALL LETTER UPSILON
	"\\Elzpupsil{}": '\u028A', // LATIN SMALL LETTER UPSILON
	"\\ElzrLarr": '\u2944', // SHORT RIGHTWARDS ARROW ABOVE LEFTWARDS ARROW
	"\\ElzrLarr{}": '\u2944', // SHORT RIGHTWARDS ARROW ABOVE LEFTWARDS ARROW
	"\\Elzrais": '\u02D4', // MODIFIER LETTER UP TACK
	"\\Elzrais{}": '\u02D4', // MODIFIER LETTER UP TACK
	"\\Elzrarrx": '\u2947', // RIGHTWARDS ARROW THROUGH X
	"\\Elzrarrx{}": '\u2947', // RIGHTWARDS ARROW THROUGH X
	"\\Elzreapos": '\u201B', // SINGLE HIGH-REVERSED-9 QUOTATION MARK
	"\\Elzreapos{}": '\u201B', // SINGLE HIGH-REVERSED-9 QUOTATION MARK
	"\\Elzreglst": '\u0295', // LATIN LETTER PHARYNGEAL VOICED FRICATIVE
	"\\Elzreglst{}": '\u0295', // LATIN LETTER PHARYNGEAL VOICED FRICATIVE
	"\\Elzrh": '\u0322', // COMBINING RETROFLEX HOOK BELOW
	"\\Elzrh{}": '\u0322', // COMBINING RETROFLEX HOOK BELOW
	"\\Elzrl": '\u027C', // LATIN SMALL LETTER R WITH LONG LEG
	"\\Elzrl{}": '\u027C', // LATIN SMALL LETTER R WITH LONG LEG
	"\\Elzrtld": '\u0256', // LATIN SMALL LETTER D WITH TAIL
	"\\Elzrtld{}": '\u0256', // LATIN SMALL LETTER D WITH TAIL
	"\\Elzrtll": '\u026D', // LATIN SMALL LETTER L WITH RETROFLEX HOOK
	"\\Elzrtll{}": '\u026D', // LATIN SMALL LETTER L WITH RETROFLEX HOOK
	"\\Elzrtln": '\u0273', // LATIN SMALL LETTER N WITH RETROFLEX HOOK
	"\\Elzrtln{}": '\u0273', // LATIN SMALL LETTER N WITH RETROFLEX HOOK
	"\\Elzrtlr": '\u027D', // LATIN SMALL LETTER R WITH TAIL
	"\\Elzrtlr{}": '\u027D', // LATIN SMALL LETTER R WITH TAIL
	"\\Elzrtls": '\u0282', // LATIN SMALL LETTER S WITH HOOK
	"\\Elzrtls{}": '\u0282', // LATIN SMALL LETTER S WITH HOOK
	"\\Elzrtlt": '\u0288', // LATIN SMALL LETTER T WITH RETROFLEX HOOK
	"\\Elzrtlt{}": '\u0288', // LATIN SMALL LETTER T WITH RETROFLEX HOOK
	"\\Elzrtlz": '\u0290', // LATIN SMALL LETTER Z WITH RETROFLEX HOOK
	"\\Elzrtlz{}": '\u0290', // LATIN SMALL LETTER Z WITH RETROFLEX HOOK
	"\\Elzrttrnr": '\u027B', // LATIN SMALL LETTER TURNED R WITH HOOK
	"\\Elzrttrnr{}": '\u027B', // LATIN SMALL LETTER TURNED R WITH HOOK
	"\\Elzrvbull": '\u25D8', // INVERSE BULLET
	"\\Elzrvbull{}": '\u25D8', // INVERSE BULLET
	"\\Elzsbbrg": '\u032A', // COMBINING BRIDGE BELOW
	"\\Elzsbbrg{}": '\u032A', // COMBINING BRIDGE BELOW
	"\\Elzsblhr": '\u02D3', // MODIFIER LETTER CENTRED LEFT HALF RING
	"\\Elzsblhr{}": '\u02D3', // MODIFIER LETTER CENTRED LEFT HALF RING
	"\\Elzsbrhr": '\u02D2', // MODIFIER LETTER CENTRED RIGHT HALF RING
	"\\Elzsbrhr{}": '\u02D2', // MODIFIER LETTER CENTRED RIGHT HALF RING
	"\\Elzschwa": '\u0259', // LATIN SMALL LETTER SCHWA
	"\\Elzschwa{}": '\u0259', // LATIN SMALL LETTER SCHWA
	"\\Elzsqfl": '\u25E7', // SQUARE WITH LEFT HALF BLACK
	"\\Elzsqfl{}": '\u25E7', // SQUARE WITH LEFT HALF BLACK
	"\\Elzsqfnw": '\u2519', // BOX DRAWINGS UP LIGHT AND LEFT HEAVY
	"\\Elzsqfnw{}": '\u2519', // BOX DRAWINGS UP LIGHT AND LEFT HEAVY
	"\\Elzsqfr": '\u25E8', // SQUARE WITH RIGHT HALF BLACK
	"\\Elzsqfr{}": '\u25E8', // SQUARE WITH RIGHT HALF BLACK
	"\\Elzsqfse": '\u25EA', // SQUARE WITH LOWER RIGHT DIAGONAL HALF BLACK
	"\\Elzsqfse{}": '\u25EA', // SQUARE WITH LOWER RIGHT DIAGONAL HALF BLACK
	"\\Elzsqspne": '\u22E5', // SQUARE ORIGINAL OF OR NOT EQUAL TO
	"\\Elzsqspne{}": '\u22E5', // SQUARE ORIGINAL OF OR NOT EQUAL TO
	"\\Elztdcol": '\u2AF6', // TRIPLE COLON OPERATOR
	"\\Elztdcol{}": '\u2AF6', // TRIPLE COLON OPERATOR
	"\\Elztesh": '\u02A7', // LATIN SMALL LETTER TESH DIGRAPH
	"\\Elztesh{}": '\u02A7', // LATIN SMALL LETTER TESH DIGRAPH
	"\\Elztfnc": '\u2980', // TRIPLE VERTICAL BAR DELIMITER
	"\\Elztfnc{}": '\u2980', // TRIPLE VERTICAL BAR DELIMITER
	"\\Elztrna": '\u0250', // LATIN SMALL LETTER TURNED A
	"\\Elztrna{}": '\u0250', // LATIN SMALL LETTER TURNED A
	"\\Elztrnh": '\u0265', // LATIN SMALL LETTER TURNED H
	"\\Elztrnh{}": '\u0265', // LATIN SMALL LETTER TURNED H
	"\\Elztrnm": '\u026F', // LATIN SMALL LETTER TURNED M
	"\\Elztrnmlr": '\u0270', // LATIN SMALL LETTER TURNED M WITH LONG LEG
	"\\Elztrnmlr{}": '\u0270', // LATIN SMALL LETTER TURNED M WITH LONG LEG
	"\\Elztrnm{}": '\u026F', // LATIN SMALL LETTER TURNED M
	"\\Elztrnr": '\u0279', // LATIN SMALL LETTER TURNED R
	"\\Elztrnrl": '\u027A', // LATIN SMALL LETTER TURNED R WITH LONG LEG
	"\\Elztrnrl{}": '\u027A', // LATIN SMALL LETTER TURNED R WITH LONG LEG
	"\\Elztrnr{}": '\u0279', // LATIN SMALL LETTER TURNED R
	"\\Elztrnsa": '\u0252', // LATIN SMALL LETTER TURNED ALPHA
	"\\Elztrnsa{}": '\u0252', // LATIN SMALL LETTER TURNED ALPHA
	"\\Elztrnt": '\u0287', // LATIN SMALL LETTER TURNED T
	"\\Elztrnt{}": '\u0287', // LATIN SMALL LETTER TURNED T
	"\\Elztrny": '\u028E', // LATIN SMALL LETTER TURNED Y
	"\\Elztrny{}": '\u028E', // LATIN SMALL LETTER TURNED Y
	"\\Elzverti": '\u02CC', // MODIFIER LETTER LOW VERTICAL LINE
	"\\Elzverti{}": '\u02CC', // MODIFIER LETTER LOW VERTICAL LINE
	"\\Elzverts": '\u02C8', // MODIFIER LETTER VERTICAL LINE
	"\\Elzverts{}": '\u02C8', // MODIFIER LETTER VERTICAL LINE
	"\\Elzvrecto": '\u25AF', // WHITE VERTICAL RECTANGLE
	"\\Elzvrecto{}": '\u25AF', // WHITE VERTICAL RECTANGLE
	"\\Elzxh": '\u0127', // LATIN SMALL LETTER H WITH STROKE
	"\\Elzxh{}": '\u0127', // LATIN SMALL LETTER H WITH STROKE
	"\\Elzxl": '\u0335', // COMBINING SHORT STROKE OVERLAY
	"\\Elzxl{}": '\u0335', // COMBINING SHORT STROKE OVERLAY
	"\\Elzxrat": '\u211E', // PRESCRIPTION TAKE
	"\\Elzxrat{}": '\u211E', // PRESCRIPTION TAKE
	"\\Elzyogh": '\u0292', // LATIN SMALL LETTER EZH
	"\\Elzyogh{}": '\u0292', // LATIN SMALL LETTER EZH
	"\\Epsilon": '\u0395', // GREEK CAPITAL LETTER EPSILON
	"\\Epsilon{}": '\u0395', // GREEK CAPITAL LETTER EPSILON
	"\\Equal": '\u2A75', // TWO CONSECUTIVE EQUALS SIGNS
	"\\Equal{}": '\u2A75', // TWO CONSECUTIVE EQUALS SIGNS
	"\\Equiv": '\u2263', // strict equivalence (4 lines)
	"\\Equiv{}": '\u2263', // strict equivalence (4 lines)
	"\\Eta": '\u0397', // GREEK CAPITAL LETTER ETA
	"\\Eta{}": '\u0397', // GREEK CAPITAL LETTER ETA
	"\\Euler": '\u2107', // EULER CONSTANT
	"\\Euler{}": '\u2107', // EULER CONSTANT
	"\\Exclam": '\u203C', // # !!, DOUBLE EXCLAMATION MARK
	"\\Exclam{}": '\u203C', // # !!, DOUBLE EXCLAMATION MARK
	"\\ExponetialE": '\u2147', // = \ee (wrisym), DOUBLE-STRUCK ITALIC SMALL E
	"\\ExponetialE{}": '\u2147', // = \ee (wrisym), DOUBLE-STRUCK ITALIC SMALL E
	"\\Finv": '\u2132', // TURNED CAPITAL F
	"\\Finv{}": '\u2132', // TURNED CAPITAL F
	"\\Game": '\u2141', // # \Game (amssymb), TURNED SANS-SERIF CAPITAL G (amssymb has mirrored G)
	"\\Game{}": '\u2141', // # \Game (amssymb), TURNED SANS-SERIF CAPITAL G (amssymb has mirrored G)
	"\\Gamma": '\u0393', // GREEK CAPITAL LETTER GAMMA
	"\\Gamma{}": '\u0393', // GREEK CAPITAL LETTER GAMMA
	"\\H O": '\u0150', // LATIN CAPITAL LETTER O WITH DOUBLE ACUTE
	"\\H O{}": '\u0150', // LATIN CAPITAL LETTER O WITH DOUBLE ACUTE
	"\\H U": '\u0170', // LATIN CAPITAL LETTER U WITH DOUBLE ACUTE
	"\\H U{}": '\u0170', // LATIN CAPITAL LETTER U WITH DOUBLE ACUTE
	"\\H o": '\u0151', // LATIN SMALL LETTER O WITH DOUBLE ACUTE
	"\\H o{}": '\u0151', // LATIN SMALL LETTER O WITH DOUBLE ACUTE
	"\\H u": '\u0171', // LATIN SMALL LETTER U WITH DOUBLE ACUTE
	"\\H u{}": '\u0171', // LATIN SMALL LETTER U WITH DOUBLE ACUTE
	"\\H": '\u02DD', // DOUBLE ACUTE ACCENT
	"\\Hermaphrodite": '\u26A5', // MALE AND FEMALE SIGN
	"\\Hermaphrodite{}": '\u26A5', // MALE AND FEMALE SIGN
	"\\H{}": '\u02DD', // DOUBLE ACUTE ACCENT
	"\\Iota": '\u0399', // GREEK CAPITAL LETTER IOTA
	"\\Iota{}": '\u0399', // GREEK CAPITAL LETTER IOTA
	"\\Join": '\u2A1D', // JOIN
	"\\Join{}": '\u2A1D', // JOIN
	"\\Kappa": '\u039A', // GREEK CAPITAL LETTER KAPPA
	"\\Kappa{}": '\u039A', // GREEK CAPITAL LETTER KAPPA
	"\\Koppa": '\u03DE', // GREEK LETTER KOPPA
	"\\Koppa{}": '\u03DE', // GREEK LETTER KOPPA
	"\\L": '\u0141', // LATIN CAPITAL LETTER L WITH STROKE
	"\\LEFTCIRCLE": '\u25D6', // LEFT HALF BLACK CIRCLE
	"\\LEFTCIRCLE{}": '\u25D6', // LEFT HALF BLACK CIRCLE
	"\\LHD": '\u25C0', // = \blacktriangleleft (fourier -mathabx), (large) left triangle, filled
	"\\LHD{}": '\u25C0', // = \blacktriangleleft (fourier -mathabx), (large) left triangle, filled
	"\\LLeftarrow": '\u2B45', // LEFTWARDS QUADRUPLE ARROW
	"\\LLeftarrow{}": '\u2B45', // LEFTWARDS QUADRUPLE ARROW
	"\\LVec": '\u20D6', // # \overleftarrow, COMBINING LEFT ARROW ABOVE
	"\\LVec{}": '\u20D6', // # \overleftarrow, COMBINING LEFT ARROW ABOVE
	"\\Lambda": '\u039B', // GREEK CAPITAL LETTER LAMDA
	"\\Lambda{}": '\u039B', // GREEK CAPITAL LETTER LAMDA
	"\\Lbag": '\u27C5', // = \lbag (stmaryrd -oz), LEFT S-SHAPED BAG DELIMITER
	"\\Lbag{}": '\u27C5', // = \lbag (stmaryrd -oz), LEFT S-SHAPED BAG DELIMITER
	"\\Lbrbrak": '\u27EC', // MATHEMATICAL LEFT WHITE TORTOISE SHELL BRACKET
	"\\Lbrbrak{}": '\u27EC', // MATHEMATICAL LEFT WHITE TORTOISE SHELL BRACKET
	"\\LeftArrowBar": '\u21E4', // LEFTWARDS ARROW TO BAR
	"\\LeftArrowBar{}": '\u21E4', // LEFTWARDS ARROW TO BAR
	"\\LeftDownTeeVector": '\u2961', // DOWNWARDS HARPOON WITH BARB LEFT FROM BAR
	"\\LeftDownTeeVector{}": '\u2961', // DOWNWARDS HARPOON WITH BARB LEFT FROM BAR
	"\\LeftDownVectorBar": '\u2959', // DOWNWARDS HARPOON WITH BARB LEFT TO BAR
	"\\LeftDownVectorBar{}": '\u2959', // DOWNWARDS HARPOON WITH BARB LEFT TO BAR
	"\\LeftRightVector": '\u294E', // LEFT BARB UP RIGHT BARB UP HARPOON
	"\\LeftRightVector{}": '\u294E', // LEFT BARB UP RIGHT BARB UP HARPOON
	"\\LeftTeeVector": '\u295A', // LEFTWARDS HARPOON WITH BARB UP FROM BAR
	"\\LeftTeeVector{}": '\u295A', // LEFTWARDS HARPOON WITH BARB UP FROM BAR
	"\\LeftTriangleBar": '\u29CF', // LEFT TRIANGLE BESIDE VERTICAL BAR
	"\\LeftTriangleBar{}": '\u29CF', // LEFT TRIANGLE BESIDE VERTICAL BAR
	"\\LeftUpDownVector": '\u2951', // UP BARB LEFT DOWN BARB LEFT HARPOON
	"\\LeftUpDownVector{}": '\u2951', // UP BARB LEFT DOWN BARB LEFT HARPOON
	"\\LeftUpTeeVector": '\u2960', // UPWARDS HARPOON WITH BARB LEFT FROM BAR
	"\\LeftUpTeeVector{}": '\u2960', // UPWARDS HARPOON WITH BARB LEFT FROM BAR
	"\\LeftUpVectorBar": '\u2958', // UPWARDS HARPOON WITH BARB LEFT TO BAR
	"\\LeftUpVectorBar{}": '\u2958', // UPWARDS HARPOON WITH BARB LEFT TO BAR
	"\\LeftVectorBar": '\u2952', // LEFTWARDS HARPOON WITH BARB UP TO BAR
	"\\LeftVectorBar{}": '\u2952', // LEFTWARDS HARPOON WITH BARB UP TO BAR
	"\\Leftarrow": '\u21D0', // LEFTWARDS DOUBLE ARROW
	"\\Leftarrow{}": '\u21D0', // LEFTWARDS DOUBLE ARROW
	"\\Leftrightarrow": '\u21D4', // LEFT RIGHT DOUBLE ARROW
	"\\Leftrightarrow{}": '\u21D4', // LEFT RIGHT DOUBLE ARROW
	"\\Lleftarrow": '\u21DA', // LEFTWARDS TRIPLE ARROW
	"\\Lleftarrow{}": '\u21DA', // LEFTWARDS TRIPLE ARROW
	"\\Longleftarrow": '\u27F8', // LONG LEFTWARDS DOUBLE ARROW
	"\\Longleftarrow{}": '\u27F8', // LONG LEFTWARDS DOUBLE ARROW
	"\\Longleftrightarrow": '\u27FA', // LONG LEFT RIGHT DOUBLE ARROW
	"\\Longleftrightarrow{}": '\u27FA', // LONG LEFT RIGHT DOUBLE ARROW
	"\\Longmapsfrom": '\u27FD', // = \Longmappedfrom (kpfonts), LONG LEFTWARDS DOUBLE ARROW FROM BAR
	"\\Longmapsfrom{}": '\u27FD', // = \Longmappedfrom (kpfonts), LONG LEFTWARDS DOUBLE ARROW FROM BAR
	"\\Longmapsto": '\u27FE', // LONG RIGHTWARDS DOUBLE ARROW FROM BAR
	"\\Longmapsto{}": '\u27FE', // LONG RIGHTWARDS DOUBLE ARROW FROM BAR
	"\\Longrightarrow": '\u27F9', // LONG RIGHTWARDS DOUBLE ARROW
	"\\Longrightarrow{}": '\u27F9', // LONG RIGHTWARDS DOUBLE ARROW
	"\\Lparengtr": '\u2995', // DOUBLE LEFT ARC GREATER-THAN BRACKET
	"\\Lparengtr{}": '\u2995', // DOUBLE LEFT ARC GREATER-THAN BRACKET
	"\\Lsh": '\u21B0', // UPWARDS ARROW WITH TIP LEFTWARDS
	"\\Lsh{}": '\u21B0', // UPWARDS ARROW WITH TIP LEFTWARDS
	"\\Lvzigzag": '\u29DA', // LEFT DOUBLE WIGGLY FENCE
	"\\Lvzigzag{}": '\u29DA', // LEFT DOUBLE WIGGLY FENCE
	"\\L{}": '\u0141', // LATIN CAPITAL LETTER L WITH STROKE
	"\\MapsDown": '\u21A7', // maps to, downward
	"\\MapsDown{}": '\u21A7', // maps to, downward
	"\\MapsUp": '\u21A5', // maps to, upward
	"\\MapsUp{}": '\u21A5', // maps to, upward
	"\\Mapsfrom": '\u2906', // = \Mappedfrom (kpfonts), LEFTWARDS DOUBLE ARROW FROM BAR
	"\\Mapsfrom{}": '\u2906', // = \Mappedfrom (kpfonts), LEFTWARDS DOUBLE ARROW FROM BAR
	"\\Mapsto": '\u2907', // RIGHTWARDS DOUBLE ARROW FROM BAR
	"\\Mapsto{}": '\u2907', // RIGHTWARDS DOUBLE ARROW FROM BAR
	"\\NG": '\u014A', // LATIN CAPITAL LETTER ENG
	"\\NG{}": '\u014A', // LATIN CAPITAL LETTER ENG
	"\\Nearrow": '\u21D7', // ne pointing double arrow
	"\\Nearrow{}": '\u21D7', // ne pointing double arrow
	"\\NestedGreaterGreater": '\u2AA2', // DOUBLE NESTED GREATER-THAN
	"\\NestedGreaterGreater{}": '\u2AA2', // DOUBLE NESTED GREATER-THAN
	"\\NestedLessLess": '\u2AA1', // DOUBLE NESTED LESS-THAN
	"\\NestedLessLess{}": '\u2AA1', // DOUBLE NESTED LESS-THAN
	"\\Not": '\u2AEC', // DOUBLE STROKE NOT SIGN
	"\\Not{}": '\u2AEC', // DOUBLE STROKE NOT SIGN
	"\\Nwarrow": '\u21D6', // nw pointing double arrow
	"\\Nwarrow{}": '\u21D6', // nw pointing double arrow
	"\\N{G}": '\u014A', // LATIN CAPITAL LETTER ENG
	"\\O": '\u00D8', // LATIN CAPITAL LETTER O WITH STROKE
	"\\OE": '\u0152', // LATIN CAPITAL LIGATURE OE
	"\\OE{}": '\u0152', // LATIN CAPITAL LIGATURE OE
	"\\Omega": '\u03A9', // GREEK CAPITAL LETTER OMEGA
	"\\Omega{}": '\u03A9', // GREEK CAPITAL LETTER OMEGA
	"\\Otimes": '\u2A37', // MULTIPLICATION SIGN IN DOUBLE CIRCLE
	"\\Otimes{}": '\u2A37', // MULTIPLICATION SIGN IN DOUBLE CIRCLE
	"\\O{E}": '\u0152', // LATIN CAPITAL LIGATURE OE
	"\\O{}": '\u00D8', // LATIN CAPITAL LETTER O WITH STROKE
	"\\Phi": '\u03A6', // GREEK CAPITAL LETTER PHI
	"\\Phi{}": '\u03A6', // GREEK CAPITAL LETTER PHI
	"\\Pi": '\u03A0', // GREEK CAPITAL LETTER PI
	"\\Pisymbol{ppi020}{105}": '\u2A9E', // SIMILAR OR GREATER-THAN
	"\\Pisymbol{ppi020}{117}": '\u2A9D', // SIMILAR OR LESS-THAN
	"\\Pisymbol{ppi022}{87}": '\u03D0', // GREEK BETA SYMBOL
	"\\Pi{}": '\u03A0', // GREEK CAPITAL LETTER PI
	"\\Planckconst": '\u210E', // # h, Planck constant
	"\\Planckconst{}": '\u210E', // # h, Planck constant
	"\\PropertyLine": '\u214A', // PROPERTY LINE
	"\\PropertyLine{}": '\u214A', // PROPERTY LINE
	"\\Psi": '\u03A8', // GREEK CAPITAL LETTER PSI
	"\\Psi{}": '\u03A8', // GREEK CAPITAL LETTER PSI
	"\\P{i}": '\u03A0', // GREEK CAPITAL LETTER PI
	"\\QED": '\u220E', // # \blacksquare (amssymb), END OF PROOF
	"\\QED{}": '\u220E', // # \blacksquare (amssymb), END OF PROOF
	"\\Qoppa": '\u03D8', // = \Koppa (wrisym), t \Qoppa (LGR), GREEK LETTER ARCHAIC KOPPA
	"\\Qoppa{}": '\u03D8', // = \Koppa (wrisym), t \Qoppa (LGR), GREEK LETTER ARCHAIC KOPPA
	"\\Question": '\u2047', // # ??, DOUBLE QUESTION MARK
	"\\Question{}": '\u2047', // # ??, DOUBLE QUESTION MARK
	"\\RHD": '\u25B6', // = \blacktriangleright (fourier -mathabx), (large) right triangle, filled
	"\\RHD{}": '\u25B6', // = \blacktriangleright (fourier -mathabx), (large) right triangle, filled
	"\\RRightarrow": '\u2B46', // RIGHTWARDS QUADRUPLE ARROW
	"\\RRightarrow{}": '\u2B46', // RIGHTWARDS QUADRUPLE ARROW
	"\\Rbag": '\u27C6', // = \rbag (stmaryrd -oz), RIGHT S-SHAPED BAG DELIMITER
	"\\Rbag{}": '\u27C6', // = \rbag (stmaryrd -oz), RIGHT S-SHAPED BAG DELIMITER
	"\\Rbrbrak": '\u27ED', // MATHEMATICAL RIGHT WHITE TORTOISE SHELL BRACKET
	"\\Rbrbrak{}": '\u27ED', // MATHEMATICAL RIGHT WHITE TORTOISE SHELL BRACKET
	"\\ReverseUpEquilibrium": '\u296F', // DOWNWARDS HARPOON WITH BARB LEFT BESIDE UPWARDS HARPOON WITH BARB RIGHT
	"\\ReverseUpEquilibrium{}": '\u296F', // DOWNWARDS HARPOON WITH BARB LEFT BESIDE UPWARDS HARPOON WITH BARB RIGHT
	"\\Rho": '\u03A1', // GREEK CAPITAL LETTER RHO
	"\\Rho{}": '\u03A1', // GREEK CAPITAL LETTER RHO
	"\\RightArrowBar": '\u21E5', // RIGHTWARDS ARROW TO BAR
	"\\RightArrowBar{}": '\u21E5', // RIGHTWARDS ARROW TO BAR
	"\\RightDownTeeVector": '\u295D', // DOWNWARDS HARPOON WITH BARB RIGHT FROM BAR
	"\\RightDownTeeVector{}": '\u295D', // DOWNWARDS HARPOON WITH BARB RIGHT FROM BAR
	"\\RightDownVectorBar": '\u2955', // DOWNWARDS HARPOON WITH BARB RIGHT TO BAR
	"\\RightDownVectorBar{}": '\u2955', // DOWNWARDS HARPOON WITH BARB RIGHT TO BAR
	"\\RightTeeVector": '\u295B', // RIGHTWARDS HARPOON WITH BARB UP FROM BAR
	"\\RightTeeVector{}": '\u295B', // RIGHTWARDS HARPOON WITH BARB UP FROM BAR
	"\\RightTriangleBar": '\u29D0', // VERTICAL BAR BESIDE RIGHT TRIANGLE
	"\\RightTriangleBar{}": '\u29D0', // VERTICAL BAR BESIDE RIGHT TRIANGLE
	"\\RightUpDownVector": '\u294F', // UP BARB RIGHT DOWN BARB RIGHT HARPOON
	"\\RightUpDownVector{}": '\u294F', // UP BARB RIGHT DOWN BARB RIGHT HARPOON
	"\\RightUpTeeVector": '\u295C', // UPWARDS HARPOON WITH BARB RIGHT FROM BAR
	"\\RightUpTeeVector{}": '\u295C', // UPWARDS HARPOON WITH BARB RIGHT FROM BAR
	"\\RightUpVectorBar": '\u2954', // UPWARDS HARPOON WITH BARB RIGHT TO BAR
	"\\RightUpVectorBar{}": '\u2954', // UPWARDS HARPOON WITH BARB RIGHT TO BAR
	"\\RightVectorBar": '\u2953', // RIGHTWARDS HARPOON WITH BARB UP TO BAR
	"\\RightVectorBar{}": '\u2953', // RIGHTWARDS HARPOON WITH BARB UP TO BAR
	"\\Rightarrow": '\u21D2', // RIGHTWARDS DOUBLE ARROW
	"\\Rightarrow{}": '\u21D2', // RIGHTWARDS DOUBLE ARROW
	"\\RoundImplies": '\u2970', // RIGHT DOUBLE ARROW WITH ROUNDED HEAD
	"\\RoundImplies{}": '\u2970', // RIGHT DOUBLE ARROW WITH ROUNDED HEAD
	"\\Rparenless": '\u2996', // DOUBLE RIGHT ARC LESS-THAN BRACKET
	"\\Rparenless{}": '\u2996', // DOUBLE RIGHT ARC LESS-THAN BRACKET
	"\\Rrightarrow": '\u21DB', // RIGHTWARDS TRIPLE ARROW
	"\\Rrightarrow{}": '\u21DB', // RIGHTWARDS TRIPLE ARROW
	"\\Rsh": '\u21B1', // UPWARDS ARROW WITH TIP RIGHTWARDS
	"\\Rsh{}": '\u21B1', // UPWARDS ARROW WITH TIP RIGHTWARDS
	"\\RuleDelayed": '\u29F4', // RULE-DELAYED
	"\\RuleDelayed{}": '\u29F4', // RULE-DELAYED
	"\\Rvzigzag": '\u29DB', // RIGHT DOUBLE WIGGLY FENCE
	"\\Rvzigzag{}": '\u29DB', // RIGHT DOUBLE WIGGLY FENCE
	"\\Same": '\u2A76', // # ===, THREE CONSECUTIVE EQUALS SIGNS
	"\\Same{}": '\u2A76', // # ===, THREE CONSECUTIVE EQUALS SIGNS
	"\\Sampi": '\u03E0', // GREEK LETTER SAMPI
	"\\Sampi{}": '\u03E0', // GREEK LETTER SAMPI
	"\\Searrow": '\u21D8', // se pointing double arrow
	"\\Searrow{}": '\u21D8', // se pointing double arrow
	"\\Sigma": '\u03A3', // GREEK CAPITAL LETTER SIGMA
	"\\Sigma{}": '\u03A3', // GREEK CAPITAL LETTER SIGMA
	"\\Sqcap": '\u2A4E', // DOUBLE SQUARE INTERSECTION
	"\\Sqcap{}": '\u2A4E', // DOUBLE SQUARE INTERSECTION
	"\\Sqcup": '\u2A4F', // DOUBLE SQUARE UNION
	"\\Sqcup{}": '\u2A4F', // DOUBLE SQUARE UNION
	"\\Square": '\u2610', // BALLOT BOX
	"\\Square{}": '\u2610', // BALLOT BOX
	"\\Stigma": '\u03DA', // GREEK LETTER STIGMA
	"\\Stigma{}": '\u03DA', // GREEK LETTER STIGMA
	"\\Subset": '\u22D0', // DOUBLE SUBSET
	"\\Subset{}": '\u22D0', // DOUBLE SUBSET
	"\\Sun": '\u2609', // SUN
	"\\Sun{}": '\u2609', // SUN
	"\\Supset": '\u22D1', // DOUBLE SUPERSET
	"\\Supset{}": '\u22D1', // DOUBLE SUPERSET
	"\\Swarrow": '\u21D9', // sw pointing double arrow
	"\\Swarrow{}": '\u21D9', // sw pointing double arrow
	"\\TH": '\u00DE', // LATIN CAPITAL LETTER THORN
	"\\TH{}": '\u00DE', // LATIN CAPITAL LETTER THORN
	"\\Tau": '\u03A4', // GREEK CAPITAL LETTER TAU
	"\\Tau{}": '\u03A4', // GREEK CAPITAL LETTER TAU
	"\\Theta": '\u0398', // GREEK CAPITAL LETTER THETA
	"\\Theta{}": '\u0398', // GREEK CAPITAL LETTER THETA
	"\\Top": '\u2AEA', // DOUBLE DOWN TACK
	"\\Top{}": '\u2AEA', // DOUBLE DOWN TACK
	"\\T{H}": '\u00DE', // LATIN CAPITAL LETTER THORN
	"\\UUparrow": '\u27F0', // UPWARDS QUADRUPLE ARROW
	"\\UUparrow{}": '\u27F0', // UPWARDS QUADRUPLE ARROW
	"\\UpArrowBar": '\u2912', // UPWARDS ARROW TO BAR
	"\\UpArrowBar{}": '\u2912', // UPWARDS ARROW TO BAR
	"\\UpEquilibrium": '\u296E', // UPWARDS HARPOON WITH BARB LEFT BESIDE DOWNWARDS HARPOON WITH BARB RIGHT
	"\\UpEquilibrium{}": '\u296E', // UPWARDS HARPOON WITH BARB LEFT BESIDE DOWNWARDS HARPOON WITH BARB RIGHT
	"\\Uparrow": '\u21D1', // UPWARDS DOUBLE ARROW
	"\\Uparrow{}": '\u21D1', // UPWARDS DOUBLE ARROW
	"\\Updownarrow": '\u21D5', // UP DOWN DOUBLE ARROW
	"\\Updownarrow{}": '\u21D5', // UP DOWN DOUBLE ARROW
	"\\Upsilon": '\u03A5', // GREEK CAPITAL LETTER UPSILON
	"\\Upsilon{}": '\u03A5', // GREEK CAPITAL LETTER UPSILON
	"\\Uuparrow": '\u290A', // UPWARDS TRIPLE ARROW
	"\\Uuparrow{}": '\u290A', // UPWARDS TRIPLE ARROW
	"\\VDash": '\u22AB', // DOUBLE VERTICAL BAR DOUBLE RIGHT TURNSTILE
	"\\VDash{}": '\u22AB', // DOUBLE VERTICAL BAR DOUBLE RIGHT TURNSTILE
	"\\Vdash": '\u22A9', // FORCES
	"\\Vdash{}": '\u22A9', // FORCES
	"\\Vert": '\u2016', // DOUBLE VERTICAL LINE
	"\\Vert{}": '\u2016', // DOUBLE VERTICAL LINE
	"\\Vvdash": '\u22AA', // TRIPLE VERTICAL BAR RIGHT TURNSTILE
	"\\Vvdash{}": '\u22AA', // TRIPLE VERTICAL BAR RIGHT TURNSTILE
	"\\XBox": '\u2612', // t \Crossedbox (marvosym), BALLOT BOX WITH X
	"\\XBox{}": '\u2612', // t \Crossedbox (marvosym), BALLOT BOX WITH X
	"\\Xi": '\u039E', // GREEK CAPITAL LETTER XI
	"\\Xi{}": '\u039E', // GREEK CAPITAL LETTER XI
	"\\X{i}": '\u039E', // GREEK CAPITAL LETTER XI
	"\\Yup": '\u2144', // TURNED SANS-SERIF CAPITAL Y
	"\\Yup{}": '\u2144', // TURNED SANS-SERIF CAPITAL Y
	"\\Zbar": '\u01B5', // impedance
	"\\Zbar{}": '\u01B5', // impedance
	"\\Zeta": '\u0396', // GREEK CAPITAL LETTER ZETA
	"\\Zeta{}": '\u0396', // GREEK CAPITAL LETTER ZETA
	"\\\"": '\u0308', // COMBINING DIAERESIS
	"\\\"A": '\u00C4', // LATIN CAPITAL LETTER A WITH DIAERESIS
	"\\\"E": '\u00CB', // LATIN CAPITAL LETTER E WITH DIAERESIS
	"\\\"I": '\u00CF', // LATIN CAPITAL LETTER I WITH DIAERESIS
	"\\\"O": '\u00D6', // LATIN CAPITAL LETTER O WITH DIAERESIS
	"\\\"U": '\u00DC', // LATIN CAPITAL LETTER U WITH DIAERESIS
	"\\\"Y": '\u0178', // LATIN CAPITAL LETTER Y WITH DIAERESIS
	"\\\"\\i": '\u00EF', // LATIN SMALL LETTER I WITH DIAERESIS
	"\\\"\\i{}": '\u00EF', // LATIN SMALL LETTER I WITH DIAERESIS
	"\\\"a": '\u00E4', // LATIN SMALL LETTER A WITH DIAERESIS
	"\\\"e": '\u00EB', // LATIN SMALL LETTER E WITH DIAERESIS
	"\\\"o": '\u00F6', // LATIN SMALL LETTER O WITH DIAERESIS
	"\\\"u": '\u00FC', // LATIN SMALL LETTER U WITH DIAERESIS
	"\\\"y": '\u00FF', // LATIN SMALL LETTER Y WITH DIAERESIS
	"\\\"{A}": '\u00C4', // LATIN CAPITAL LETTER A WITH DIAERESIS
	"\\\"{E}": '\u00CB', // LATIN CAPITAL LETTER E WITH DIAERESIS
	"\\\"{I}": '\u00CF', // LATIN CAPITAL LETTER I WITH DIAERESIS
	"\\\"{O}": '\u00D6', // LATIN CAPITAL LETTER O WITH DIAERESIS
	"\\\"{U}": '\u00DC', // LATIN CAPITAL LETTER U WITH DIAERESIS
	"\\\"{Y}": '\u0178', // LATIN CAPITAL LETTER Y WITH DIAERESIS
	"\\\"{a}": '\u00E4', // LATIN SMALL LETTER A WITH DIAERESIS
	"\\\"{e}": '\u00EB', // LATIN SMALL LETTER E WITH DIAERESIS
	"\\\"{o}": '\u00F6', // LATIN SMALL LETTER O WITH DIAERESIS
	"\\\"{u}": '\u00FC', // LATIN SMALL LETTER U WITH DIAERESIS
	"\\\"{y}": '\u00FF', // LATIN SMALL LETTER Y WITH DIAERESIS
	"\\^": '^', // CIRCUMFLEX ACCENT
	"\\^A": '\u00C2', // LATIN CAPITAL LETTER A WITH CIRCUMFLEX
	"\\^C": '\u0108', // LATIN CAPITAL LETTER C WITH CIRCUMFLEX
	"\\^E": '\u00CA', // LATIN CAPITAL LETTER E WITH CIRCUMFLEX
	"\\^G": '\u011C', // LATIN CAPITAL LETTER G WITH CIRCUMFLEX
	"\\^H": '\u0124', // LATIN CAPITAL LETTER H WITH CIRCUMFLEX
	"\\^I": '\u00CE', // LATIN CAPITAL LETTER I WITH CIRCUMFLEX
	"\\^J": '\u0134', // LATIN CAPITAL LETTER J WITH CIRCUMFLEX
	"\\^O": '\u00D4', // LATIN CAPITAL LETTER O WITH CIRCUMFLEX
	"\\^S": '\u015C', // LATIN CAPITAL LETTER S WITH CIRCUMFLEX
	"\\^U": '\u00DB', // LATIN CAPITAL LETTER U WITH CIRCUMFLEX
	"\\^W": '\u0174', // LATIN CAPITAL LETTER W WITH CIRCUMFLEX
	"\\^Y": '\u0176', // LATIN CAPITAL LETTER Y WITH CIRCUMFLEX
	"\\^\\i": '\u00EE', // LATIN SMALL LETTER I WITH CIRCUMFLEX
	"\\^\\i{}": '\u00EE', // LATIN SMALL LETTER I WITH CIRCUMFLEX
	"\\^\\j": '\u0135', // LATIN SMALL LETTER J WITH CIRCUMFLEX
	"\\^\\j{}": '\u0135', // LATIN SMALL LETTER J WITH CIRCUMFLEX
	"\\^a": '\u00E2', // LATIN SMALL LETTER A WITH CIRCUMFLEX
	"\\^c": '\u0109', // LATIN SMALL LETTER C WITH CIRCUMFLEX
	"\\^e": '\u00EA', // LATIN SMALL LETTER E WITH CIRCUMFLEX
	"\\^g": '\u011D', // LATIN SMALL LETTER G WITH CIRCUMFLEX
	"\\^h": '\u0125', // LATIN SMALL LETTER H WITH CIRCUMFLEX
	"\\^o": '\u00F4', // LATIN SMALL LETTER O WITH CIRCUMFLEX
	"\\^s": '\u015D', // LATIN SMALL LETTER S WITH CIRCUMFLEX
	"\\^u": '\u00FB', // LATIN SMALL LETTER U WITH CIRCUMFLEX
	"\\^w": '\u0175', // LATIN SMALL LETTER W WITH CIRCUMFLEX
	"\\^y": '\u0177', // LATIN SMALL LETTER Y WITH CIRCUMFLEX
	"\\^{A}": '\u00C2', // LATIN CAPITAL LETTER A WITH CIRCUMFLEX
	"\\^{C}": '\u0108', // LATIN CAPITAL LETTER C WITH CIRCUMFLEX
	"\\^{E}": '\u00CA', // LATIN CAPITAL LETTER E WITH CIRCUMFLEX
	"\\^{G}": '\u011C', // LATIN CAPITAL LETTER G WITH CIRCUMFLEX
	"\\^{H}": '\u0124', // LATIN CAPITAL LETTER H WITH CIRCUMFLEX
	"\\^{I}": '\u00CE', // LATIN CAPITAL LETTER I WITH CIRCUMFLEX
	"\\^{J}": '\u0134', // LATIN CAPITAL LETTER J WITH CIRCUMFLEX
	"\\^{O}": '\u00D4', // LATIN CAPITAL LETTER O WITH CIRCUMFLEX
	"\\^{S}": '\u015C', // LATIN CAPITAL LETTER S WITH CIRCUMFLEX
	"\\^{U}": '\u00DB', // LATIN CAPITAL LETTER U WITH CIRCUMFLEX
	"\\^{W}": '\u0174', // LATIN CAPITAL LETTER W WITH CIRCUMFLEX
	"\\^{Y}": '\u0176', // LATIN CAPITAL LETTER Y WITH CIRCUMFLEX
	"\\^{a}": '\u00E2', // LATIN SMALL LETTER A WITH CIRCUMFLEX
	"\\^{c}": '\u0109', // LATIN SMALL LETTER C WITH CIRCUMFLEX
	"\\^{e}": '\u00EA', // LATIN SMALL LETTER E WITH CIRCUMFLEX
	"\\^{g}": '\u011D', // LATIN SMALL LETTER G WITH CIRCUMFLEX
	"\\^{h}": '\u0125', // LATIN SMALL LETTER H WITH CIRCUMFLEX
	"\\^{o}": '\u00F4', // LATIN SMALL LETTER O WITH CIRCUMFLEX
	"\\^{s}": '\u015D', // LATIN SMALL LETTER S WITH CIRCUMFLEX
	"\\^{u}": '\u00FB', // LATIN SMALL LETTER U WITH CIRCUMFLEX
	"\\^{w}": '\u0175', // LATIN SMALL LETTER W WITH CIRCUMFLEX
	"\\^{y}": '\u0177', // LATIN SMALL LETTER Y WITH CIRCUMFLEX
	"\\^{}": '^', // CIRCUMFLEX ACCENT
	"\\_": '_',
	"\\`": '\u0300', // COMBINING GRAVE ACCENT
	"\\`A": '\u00C0', // LATIN CAPITAL LETTER A WITH GRAVE
	"\\`E": '\u00C8', // LATIN CAPITAL LETTER E WITH GRAVE
	"\\`I": '\u00CC', // LATIN CAPITAL LETTER I WITH GRAVE
	"\\`O": '\u00D2', // LATIN CAPITAL LETTER O WITH GRAVE
	"\\`U": '\u00D9', // LATIN CAPITAL LETTER U WITH GRAVE
	"\\`\\i": '\u00EC', // LATIN SMALL LETTER I WITH GRAVE
	"\\`\\i{}": '\u00EC', // LATIN SMALL LETTER I WITH GRAVE
	"\\`a": '\u00E0', // LATIN SMALL LETTER A WITH GRAVE
	"\\`e": '\u00E8', // LATIN SMALL LETTER E WITH GRAVE
	"\\`o": '\u00F2', // LATIN SMALL LETTER O WITH GRAVE
	"\\`u": '\u00F9', // LATIN SMALL LETTER U WITH GRAVE
	"\\`{A}": '\u00C0', // LATIN CAPITAL LETTER A WITH GRAVE
	"\\`{E}": '\u00C8', // LATIN CAPITAL LETTER E WITH GRAVE
	"\\`{I}": '\u00CC', // LATIN CAPITAL LETTER I WITH GRAVE
	"\\`{O}": '\u00D2', // LATIN CAPITAL LETTER O WITH GRAVE
	"\\`{U}": '\u00D9', // LATIN CAPITAL LETTER U WITH GRAVE
	"\\`{a}": '\u00E0', // LATIN SMALL LETTER A WITH GRAVE
	"\\`{e}": '\u00E8', // LATIN SMALL LETTER E WITH GRAVE
	"\\`{o}": '\u00F2', // LATIN SMALL LETTER O WITH GRAVE
	"\\`{u}": '\u00F9', // LATIN SMALL LETTER U WITH GRAVE
	"\\aa": '\u00E5', // LATIN SMALL LETTER A WITH RING ABOVE
	"\\aa{}": '\u00E5', // LATIN SMALL LETTER A WITH RING ABOVE
	"\\accurrent": '\u23E6', // # \AC (wasysym), AC CURRENT
	"\\accurrent{}": '\u23E6', // # \AC (wasysym), AC CURRENT
	"\\acidfree": '\u267E', // PERMANENT PAPER SIGN
	"\\acidfree{}": '\u267E', // PERMANENT PAPER SIGN
	"\\acute{\\ddot{\\iota}}": '\u0390', // GREEK SMALL LETTER IOTA WITH DIALYTIKA AND TONOS
	"\\acute{\\ddot{\\upsilon}}": '\u03B0', // GREEK SMALL LETTER UPSILON WITH DIALYTIKA AND TONOS
	"\\acute{\\epsilon}": '\u03AD', // GREEK SMALL LETTER EPSILON WITH TONOS
	"\\acute{\\eta}": '\u03AE', // GREEK SMALL LETTER ETA WITH TONOS
	"\\acute{\\iota}": '\u03AF', // GREEK SMALL LETTER IOTA WITH TONOS
	"\\acute{\\omega}": '\u03CE', // GREEK SMALL LETTER OMEGA WITH TONOS
	"\\acute{\\upsilon}": '\u03CD', // GREEK SMALL LETTER UPSILON WITH TONOS
	"\\acwgapcirclearrow": '\u27F2', // ANTICLOCKWISE GAPPED CIRCLE ARROW
	"\\acwgapcirclearrow{}": '\u27F2', // ANTICLOCKWISE GAPPED CIRCLE ARROW
	"\\acwleftarcarrow": '\u2939', // LEFT-SIDE ARC ANTICLOCKWISE ARROW
	"\\acwleftarcarrow{}": '\u2939', // LEFT-SIDE ARC ANTICLOCKWISE ARROW
	"\\acwoverarcarrow": '\u293A', // TOP ARC ANTICLOCKWISE ARROW
	"\\acwoverarcarrow{}": '\u293A', // TOP ARC ANTICLOCKWISE ARROW
	"\\acwunderarcarrow": '\u293B', // BOTTOM ARC ANTICLOCKWISE ARROW
	"\\acwunderarcarrow{}": '\u293B', // BOTTOM ARC ANTICLOCKWISE ARROW
	"\\ae": '\u00E6', // LATIN SMALL LETTER AE
	"\\ae{}": '\u00E6', // LATIN SMALL LETTER AE
	"\\aleph": '\u2135', // ALEF SYMBOL
	"\\aleph{}": '\u2135', // ALEF SYMBOL
	"\\allequal": '\u224C', // ALL EQUAL TO
	"\\allequal{}": '\u224C', // ALL EQUAL TO
	"\\alpha": '\u03B1', // GREEK SMALL LETTER ALPHA
	"\\alpha{}": '\u03B1', // GREEK SMALL LETTER ALPHA
	"\\amalg": '\u2A3F', // AMALGAMATION OR COPRODUCT
	"\\amalg{}": '\u2A3F', // AMALGAMATION OR COPRODUCT
	"\\anchor": '\u2693', // ANCHOR
	"\\anchor{}": '\u2693', // ANCHOR
	"\\angdnr": '\u299F', // ACUTE ANGLE
	"\\angdnr{}": '\u299F', // ACUTE ANGLE
	"\\angle": '\u2220', // ANGLE
	"\\angles": '\u299E', // ANGLE WITH S INSIDE
	"\\angles{}": '\u299E', // ANGLE WITH S INSIDE
	"\\angleubar": '\u29A4', // ANGLE WITH UNDERBAR
	"\\angleubar{}": '\u29A4', // ANGLE WITH UNDERBAR
	"\\angle{}": '\u2220', // ANGLE
	"\\annuity": '\u20E7', // COMBINING ANNUITY SYMBOL
	"\\annuity{}": '\u20E7', // COMBINING ANNUITY SYMBOL
	"\\approx": '\u2248', // ALMOST EQUAL TO
	"\\approxeq": '\u224A', // ALMOST EQUAL OR EQUAL TO
	"\\approxeqq": '\u2A70', // APPROXIMATELY EQUAL OR EQUAL TO
	"\\approxeqq{}": '\u2A70', // APPROXIMATELY EQUAL OR EQUAL TO
	"\\approxeq{}": '\u224A', // ALMOST EQUAL OR EQUAL TO
	"\\approxnotequal": '\u2246', // APPROXIMATELY BUT NOT ACTUALLY EQUAL TO
	"\\approxnotequal{}": '\u2246', // APPROXIMATELY BUT NOT ACTUALLY EQUAL TO
	"\\approx{}": '\u2248', // ALMOST EQUAL TO
	"\\aquarius": '\u2652', // AQUARIUS
	"\\aquarius{}": '\u2652', // AQUARIUS
	"\\arceq": '\u2258', // arc, equals; CORRESPONDS TO
	"\\arceq{}": '\u2258', // arc, equals; CORRESPONDS TO
	"\\aries": '\u2648', // ARIES
	"\\aries{}": '\u2648', // ARIES
	"\\arrowwaveleft": '\u219C',
	"\\arrowwaveleft{}": '\u219C',
	"\\arrowwaveright": '\u219C', // LEFTWARDS WAVE ARROW
	"\\arrowwaveright{}": '\u219C', // LEFTWARDS WAVE ARROW
	"\\assert": '\u22A6', // # \vdash, ASSERTION (vertical, short dash)
	"\\assert{}": '\u22A6', // # \vdash, ASSERTION (vertical, short dash)
	"\\asteraccent": '\u20F0', // COMBINING ASTERISK ABOVE
	"\\asteraccent{}": '\u20F0', // COMBINING ASTERISK ABOVE
	"\\asymp": '\u224D', // EQUIVALENT TO
	"\\asymp{}": '\u224D', // EQUIVALENT TO
	"\\awint": '\u2A11', // ANTICLOCKWISE INTEGRATION
	"\\awint{}": '\u2A11', // ANTICLOCKWISE INTEGRATION
	"\\bNot": '\u2AED', // REVERSED DOUBLE STROKE NOT SIGN
	"\\bNot{}": '\u2AED', // REVERSED DOUBLE STROKE NOT SIGN
	"\\backdprime": '\u2036', // double reverse prime, not superscripted
	"\\backdprime{}": '\u2036', // double reverse prime, not superscripted
	"\\backepsilon": '\u03F6', // GREEK REVERSED LUNATE EPSILON SYMBOL
	"\\backepsilon{}": '\u03F6', // GREEK REVERSED LUNATE EPSILON SYMBOL
	"\\backprime": '\u2035', // REVERSED PRIME
	"\\backprime{}": '\u2035', // REVERSED PRIME
	"\\backsim": '\u223D', // REVERSED TILDE
	"\\backsimeq": '\u22CD', // REVERSED TILDE EQUALS
	"\\backsimeq{}": '\u22CD', // REVERSED TILDE EQUALS
	"\\backsim{}": '\u223D', // REVERSED TILDE
	"\\backslash": '\\',
	"\\backslash{}": '\\',
	"\\backtrprime": '\u2037', // triple reverse prime, not superscripted
	"\\backtrprime{}": '\u2037', // triple reverse prime, not superscripted
	"\\bagmember": '\u22FF', // # \mathsf{E}, Z NOTATION BAG MEMBERSHIP
	"\\bagmember{}": '\u22FF', // # \mathsf{E}, Z NOTATION BAG MEMBERSHIP
	"\\barcap": '\u2A43', // INTERSECTION WITH OVERBAR
	"\\barcap{}": '\u2A43', // INTERSECTION WITH OVERBAR
	"\\barcup": '\u2A42', // UNION WITH OVERBAR
	"\\barcup{}": '\u2A42', // UNION WITH OVERBAR
	"\\barin": '\u22F6', // ELEMENT OF WITH OVERBAR
	"\\barin{}": '\u22F6', // ELEMENT OF WITH OVERBAR
	"\\barleftarrowrightarrowba": '\u21B9', // LEFTWARDS ARROW TO BAR OVER RIGHTWARDS ARROW TO BAR
	"\\barleftarrowrightarrowba{}": '\u21B9', // LEFTWARDS ARROW TO BAR OVER RIGHTWARDS ARROW TO BAR
	"\\barleftharpoon": '\u296B', // LEFTWARDS HARPOON WITH BARB DOWN BELOW LONG DASH
	"\\barleftharpoon{}": '\u296B', // LEFTWARDS HARPOON WITH BARB DOWN BELOW LONG DASH
	"\\barovernorthwestarrow": '\u21B8', // NORTH WEST ARROW TO LONG BAR
	"\\barovernorthwestarrow{}": '\u21B8', // NORTH WEST ARROW TO LONG BAR
	"\\barrightarrowdiamond": '\u2920', // RIGHTWARDS ARROW FROM BAR TO BLACK DIAMOND
	"\\barrightarrowdiamond{}": '\u2920', // RIGHTWARDS ARROW FROM BAR TO BLACK DIAMOND
	"\\barrightharpoon": '\u296D', // RIGHTWARDS HARPOON WITH BARB DOWN BELOW LONG DASH
	"\\barrightharpoon{}": '\u296D', // RIGHTWARDS HARPOON WITH BARB DOWN BELOW LONG DASH
	"\\barvee": '\u22BD', // bar, vee (large vee)
	"\\barvee{}": '\u22BD', // bar, vee (large vee)
	"\\barwedge": '\u22BC', // logical NAND (bar over wedge)
	"\\barwedge{}": '\u22BC', // logical NAND (bar over wedge)
	"\\bbrktbrk": '\u23B6', // BOTTOM SQUARE BRACKET OVER TOP SQUARE BRACKET
	"\\bbrktbrk{}": '\u23B6', // BOTTOM SQUARE BRACKET OVER TOP SQUARE BRACKET
	"\\because": '\u2235', // BECAUSE
	"\\because{}": '\u2235', // BECAUSE
	"\\benzenr": '\u23E3', // BENZENE RING WITH CIRCLE
	"\\benzenr{}": '\u23E3', // BENZENE RING WITH CIRCLE
	"\\beta": '\u03B2', // GREEK SMALL LETTER BETA
	"\\beta{}": '\u03B2', // GREEK SMALL LETTER BETA
	"\\beth": '\u2136', // BET SYMBOL
	"\\beth{}": '\u2136', // BET SYMBOL
	"\\between": '\u226C', // BETWEEN
	"\\between{}": '\u226C', // BETWEEN
	"\\bigbot": '\u27D8', // LARGE UP TACK
	"\\bigbot{}": '\u27D8', // LARGE UP TACK
	"\\bigcap": '\u22C2', // N-ARY INTERSECTION
	"\\bigcap{}": '\u22C2', // N-ARY INTERSECTION
	"\\bigcirc": '\u25CB', // WHITE CIRCLE
	"\\bigcirc{}": '\u25CB', // WHITE CIRCLE
	"\\bigcup": '\u22C3', // N-ARY UNION
	"\\bigcupdot": '\u2A03', // N-ARY UNION OPERATOR WITH DOT
	"\\bigcupdot{}": '\u2A03', // N-ARY UNION OPERATOR WITH DOT
	"\\bigcup{}": '\u22C3', // N-ARY UNION
	"\\biginterleave": '\u2AFC', // LARGE TRIPLE VERTICAL BAR OPERATOR
	"\\biginterleave{}": '\u2AFC', // LARGE TRIPLE VERTICAL BAR OPERATOR
	"\\bigodot": '\u2A00', // N-ARY CIRCLED DOT OPERATOR
	"\\bigodot{}": '\u2A00', // N-ARY CIRCLED DOT OPERATOR
	"\\bigoplus": '\u2A01', // N-ARY CIRCLED PLUS OPERATOR
	"\\bigoplus{}": '\u2A01', // N-ARY CIRCLED PLUS OPERATOR
	"\\bigotimes": '\u2A02', // N-ARY CIRCLED TIMES OPERATOR
	"\\bigotimes{}": '\u2A02', // N-ARY CIRCLED TIMES OPERATOR
	"\\bigslopedvee": '\u2A57', // SLOPING LARGE OR
	"\\bigslopedvee{}": '\u2A57', // SLOPING LARGE OR
	"\\bigslopedwedge": '\u2A58', // SLOPING LARGE AND
	"\\bigslopedwedge{}": '\u2A58', // SLOPING LARGE AND
	"\\bigtalloblong": '\u2AFF', // N-ARY WHITE VERTICAL BAR
	"\\bigtalloblong{}": '\u2AFF', // N-ARY WHITE VERTICAL BAR
	"\\bigtop": '\u27D9', // LARGE DOWN TACK
	"\\bigtop{}": '\u27D9', // LARGE DOWN TACK
	"\\bigtriangledown": '\u25BD', // WHITE DOWN-POINTING TRIANGLE
	"\\bigtriangledown{}": '\u25BD', // WHITE DOWN-POINTING TRIANGLE
	"\\bigtriangleleft": '\u2A1E', // LARGE LEFT TRIANGLE OPERATOR
	"\\bigtriangleleft{}": '\u2A1E', // LARGE LEFT TRIANGLE OPERATOR
	"\\bigtriangleup": '\u25B3', // WHITE UP-POINTING TRIANGLE
	"\\bigtriangleup{}": '\u25B3', // WHITE UP-POINTING TRIANGLE
	"\\bij": '\u2916', // RIGHTWARDS TWO-HEADED ARROW WITH TAIL, z notation bijection
	"\\bij{}": '\u2916', // RIGHTWARDS TWO-HEADED ARROW WITH TAIL, z notation bijection
	"\\biohazard": '\u2623', // BIOHAZARD SIGN
	"\\biohazard{}": '\u2623', // BIOHAZARD SIGN
	"\\blackcircledownarrow": '\u29ED', // BLACK CIRCLE WITH DOWN ARROW
	"\\blackcircledownarrow{}": '\u29ED', // BLACK CIRCLE WITH DOWN ARROW
	"\\blackcircledrightdot": '\u2688', // BLACK CIRCLE WITH WHITE DOT RIGHT
	"\\blackcircledrightdot{}": '\u2688', // BLACK CIRCLE WITH WHITE DOT RIGHT
	"\\blackcircledtwodots": '\u2689', // BLACK CIRCLE WITH TWO WHITE DOTS
	"\\blackcircledtwodots{}": '\u2689', // BLACK CIRCLE WITH TWO WHITE DOTS
	"\\blackcircleulquadwhite": '\u25D5', // CIRCLE WITH ALL BUT UPPER LEFT QUADRANT BLACK
	"\\blackcircleulquadwhite{}": '\u25D5', // CIRCLE WITH ALL BUT UPPER LEFT QUADRANT BLACK
	"\\blackdiamonddownarrow": '\u29EA', // BLACK DIAMOND WITH DOWN ARROW
	"\\blackdiamonddownarrow{}": '\u29EA', // BLACK DIAMOND WITH DOWN ARROW
	"\\blackhourglass": '\u29D7', // BLACK HOURGLASS
	"\\blackhourglass{}": '\u29D7', // BLACK HOURGLASS
	"\\blackinwhitediamond": '\u25C8', // WHITE DIAMOND CONTAINING BLACK SMALL DIAMOND
	"\\blackinwhitediamond{}": '\u25C8', // WHITE DIAMOND CONTAINING BLACK SMALL DIAMOND
	"\\blackinwhitesquare": '\u25A3', // WHITE SQUARE CONTAINING BLACK SMALL SQUARE
	"\\blackinwhitesquare{}": '\u25A3', // WHITE SQUARE CONTAINING BLACK SMALL SQUARE
	"\\blacklozenge": '\u29EB', // BLACK LOZENGE
	"\\blacklozenge{}": '\u29EB', // BLACK LOZENGE
	"\\blackpointerleft": '\u25C4', // BLACK LEFT-POINTING POINTER
	"\\blackpointerleft{}": '\u25C4', // BLACK LEFT-POINTING POINTER
	"\\blackpointerright": '\u25BA', // BLACK RIGHT-POINTING POINTER
	"\\blackpointerright{}": '\u25BA', // BLACK RIGHT-POINTING POINTER
	"\\blacksmiley": '\u263B', // = \invsmileface (arevmath), BLACK SMILING FACE
	"\\blacksmiley{}": '\u263B', // = \invsmileface (arevmath), BLACK SMILING FACE
	"\\blacksquare": '\u25AA', // BLACK SMALL SQUARE
	"\\blacksquare{}": '\u25AA', // BLACK SMALL SQUARE
	"\\blacktriangle": '\u25B4', // BLACK UP-POINTING SMALL TRIANGLE
	"\\blacktriangledown": '\u25BE', // BLACK DOWN-POINTING SMALL TRIANGLE
	"\\blacktriangledown{}": '\u25BE', // BLACK DOWN-POINTING SMALL TRIANGLE
	"\\blacktriangleleft": '\u25C2', // BLACK LEFT-POINTING SMALL TRIANGLE
	"\\blacktriangleleft{}": '\u25C2', // BLACK LEFT-POINTING SMALL TRIANGLE
	"\\blacktriangleright": '\u25B8', // BLACK RIGHT-POINTING SMALL TRIANGLE
	"\\blacktriangleright{}": '\u25B8', // BLACK RIGHT-POINTING SMALL TRIANGLE
	"\\blacktriangle{}": '\u25B4', // BLACK UP-POINTING SMALL TRIANGLE
	"\\blkhorzoval": '\u2B2C', // BLACK HORIZONTAL ELLIPSE
	"\\blkhorzoval{}": '\u2B2C', // BLACK HORIZONTAL ELLIPSE
	"\\blkvertoval": '\u2B2E', // BLACK VERTICAL ELLIPSE
	"\\blkvertoval{}": '\u2B2E', // BLACK VERTICAL ELLIPSE
	"\\blockfull": '\u2588', // FULL BLOCK
	"\\blockfull{}": '\u2588', // FULL BLOCK
	"\\blockhalfshaded": '\u2592', // 50\% shaded block
	"\\blockhalfshaded{}": '\u2592', // 50\% shaded block
	"\\blocklefthalf": '\u258C', // LEFT HALF BLOCK
	"\\blocklefthalf{}": '\u258C', // LEFT HALF BLOCK
	"\\blocklowhalf": '\u2584', // LOWER HALF BLOCK
	"\\blocklowhalf{}": '\u2584', // LOWER HALF BLOCK
	"\\blockqtrshaded": '\u2591', // 25\% shaded block
	"\\blockqtrshaded{}": '\u2591', // 25\% shaded block
	"\\blockrighthalf": '\u2590', // RIGHT HALF BLOCK
	"\\blockrighthalf{}": '\u2590', // RIGHT HALF BLOCK
	"\\blockthreeqtrshaded": '\u2593', // 75\% shaded block
	"\\blockthreeqtrshaded{}": '\u2593', // 75\% shaded block
	"\\blockuphalf": '\u2580', // UPPER HALF BLOCK
	"\\blockuphalf{}": '\u2580', // UPPER HALF BLOCK
	"\\botsemicircle": '\u25E1', // LOWER HALF CIRCLE
	"\\botsemicircle{}": '\u25E1', // LOWER HALF CIRCLE
	"\\bowtie": '\u22C8', // BOWTIE
	"\\bowtie{}": '\u22C8', // BOWTIE
	"\\boxast": '\u29C6', // SQUARED ASTERISK
	"\\boxast{}": '\u29C6', // SQUARED ASTERISK
	"\\boxbar": '\u25EB', // vertical bar in box
	"\\boxbar{}": '\u25EB', // vertical bar in box
	"\\boxbox": '\u29C8', // SQUARED SQUARE
	"\\boxbox{}": '\u29C8', // SQUARED SQUARE
	"\\boxbslash": '\u29C5', // SQUARED FALLING DIAGONAL SLASH
	"\\boxbslash{}": '\u29C5', // SQUARED FALLING DIAGONAL SLASH
	"\\boxcircle": '\u29C7', // SQUARED SMALL CIRCLE
	"\\boxcircle{}": '\u29C7', // SQUARED SMALL CIRCLE
	"\\boxdot": '\u22A1', // SQUARED DOT OPERATOR
	"\\boxdot{}": '\u22A1', // SQUARED DOT OPERATOR
	"\\boxminus": '\u229F', // SQUARED MINUS
	"\\boxminus{}": '\u229F', // SQUARED MINUS
	"\\boxonbox": '\u29C9', // TWO JOINED SQUARES
	"\\boxonbox{}": '\u29C9', // TWO JOINED SQUARES
	"\\boxplus": '\u229E', // SQUARED PLUS
	"\\boxplus{}": '\u229E', // SQUARED PLUS
	"\\boxslash": '\u29C4', // SQUARED RISING DIAGONAL SLASH
	"\\boxslash{}": '\u29C4', // SQUARED RISING DIAGONAL SLASH
	"\\boxtimes": '\u22A0', // SQUARED TIMES
	"\\boxtimes{}": '\u22A0', // SQUARED TIMES
	"\\bsimilarleftarrow": '\u2B41', // REVERSE TILDE OPERATOR ABOVE LEFTWARDS ARROW
	"\\bsimilarleftarrow{}": '\u2B41', // REVERSE TILDE OPERATOR ABOVE LEFTWARDS ARROW
	"\\bsimilarrightarrow": '\u2B47', // REVERSE TILDE OPERATOR ABOVE RIGHTWARDS ARROW
	"\\bsimilarrightarrow{}": '\u2B47', // REVERSE TILDE OPERATOR ABOVE RIGHTWARDS ARROW
	"\\bsolhsub": '\u27C8', // REVERSE SOLIDUS PRECEDING SUBSET
	"\\bsolhsub{}": '\u27C8', // REVERSE SOLIDUS PRECEDING SUBSET
	"\\btimes": '\u2A32', // SEMIDIRECT PRODUCT WITH BOTTOM CLOSED
	"\\btimes{}": '\u2A32', // SEMIDIRECT PRODUCT WITH BOTTOM CLOSED
	"\\bullet": '\u2219', // BULLET OPERATOR
	"\\bullet{}": '\u2219', // BULLET OPERATOR
	"\\bullseye": '\u25CE', // # \circledcirc (amssymb), BULLSEYE
	"\\bullseye{}": '\u25CE', // # \circledcirc (amssymb), BULLSEYE
	"\\bumpeq": '\u224F', // DIFFERENCE BETWEEN
	"\\bumpeqq": '\u2AAE', // EQUALS SIGN WITH BUMPY ABOVE
	"\\bumpeqq{}": '\u2AAE', // EQUALS SIGN WITH BUMPY ABOVE
	"\\bumpeq{}": '\u224F', // DIFFERENCE BETWEEN
	"\\c C": '\u00C7', // LATIN CAPITAL LETTER C WITH CEDILLA
	"\\c C{}": '\u00C7', // LATIN CAPITAL LETTER C WITH CEDILLA
	"\\c G": '\u0122', // LATIN CAPITAL LETTER G WITH CEDILLA
	"\\c G{}": '\u0122', // LATIN CAPITAL LETTER G WITH CEDILLA
	"\\c K": '\u0136', // LATIN CAPITAL LETTER K WITH CEDILLA
	"\\c K{}": '\u0136', // LATIN CAPITAL LETTER K WITH CEDILLA
	"\\c L": '\u013B', // LATIN CAPITAL LETTER L WITH CEDILLA
	"\\c L{}": '\u013B', // LATIN CAPITAL LETTER L WITH CEDILLA
	"\\c N": '\u0145', // LATIN CAPITAL LETTER N WITH CEDILLA
	"\\c N{}": '\u0145', // LATIN CAPITAL LETTER N WITH CEDILLA
	"\\c R": '\u0156', // LATIN CAPITAL LETTER R WITH CEDILLA
	"\\c R{}": '\u0156', // LATIN CAPITAL LETTER R WITH CEDILLA
	"\\c S": '\u015E', // LATIN CAPITAL LETTER S WITH CEDILLA
	"\\c S{}": '\u015E', // LATIN CAPITAL LETTER S WITH CEDILLA
	"\\c T": '\u0162', // LATIN CAPITAL LETTER T WITH CEDILLA
	"\\c T{}": '\u0162', // LATIN CAPITAL LETTER T WITH CEDILLA
	"\\c c": '\u00E7', // LATIN SMALL LETTER C WITH CEDILLA
	"\\c c{}": '\u00E7', // LATIN SMALL LETTER C WITH CEDILLA
	"\\c g": '\u0123', // LATIN SMALL LETTER G WITH CEDILLA
	"\\c g{}": '\u0123', // LATIN SMALL LETTER G WITH CEDILLA
	"\\c k": '\u0137', // LATIN SMALL LETTER K WITH CEDILLA
	"\\c k{}": '\u0137', // LATIN SMALL LETTER K WITH CEDILLA
	"\\c l": '\u013C', // LATIN SMALL LETTER L WITH CEDILLA
	"\\c l{}": '\u013C', // LATIN SMALL LETTER L WITH CEDILLA
	"\\c n": '\u0146', // LATIN SMALL LETTER N WITH CEDILLA
	"\\c n{}": '\u0146', // LATIN SMALL LETTER N WITH CEDILLA
	"\\c r": '\u0157', // LATIN SMALL LETTER R WITH CEDILLA
	"\\c r{}": '\u0157', // LATIN SMALL LETTER R WITH CEDILLA
	"\\c s": '\u015F', // LATIN SMALL LETTER S WITH CEDILLA
	"\\c s{}": '\u015F', // LATIN SMALL LETTER S WITH CEDILLA
	"\\c t": '\u0163', // LATIN SMALL LETTER T WITH CEDILLA
	"\\c t{}": '\u0163', // LATIN SMALL LETTER T WITH CEDILLA
	"\\c": '\u00B8', // CEDILLA
	"\\cancer": '\u264B', // CANCER
	"\\cancer{}": '\u264B', // CANCER
	"\\candra": '\u0310', // candrabindu (non-spacing)
	"\\candra{}": '\u0310', // candrabindu (non-spacing)
	"\\cap": '\u2229', // INTERSECTION
	"\\capbarcup": '\u2A49', // INTERSECTION ABOVE BAR ABOVE UNION
	"\\capbarcup{}": '\u2A49', // INTERSECTION ABOVE BAR ABOVE UNION
	"\\capdot": '\u2A40', // INTERSECTION WITH DOT
	"\\capdot{}": '\u2A40', // INTERSECTION WITH DOT
	"\\capovercup": '\u2A47', // INTERSECTION ABOVE UNION
	"\\capovercup{}": '\u2A47', // INTERSECTION ABOVE UNION
	"\\capricornus": '\u2651', // CAPRICORN
	"\\capricornus{}": '\u2651', // CAPRICORN
	"\\capwedge": '\u2A44', // INTERSECTION WITH LOGICAL AND
	"\\capwedge{}": '\u2A44', // INTERSECTION WITH LOGICAL AND
	"\\cap{}": '\u2229', // INTERSECTION
	"\\caretinsert": '\u2038', // CARET (insertion mark)
	"\\caretinsert{}": '\u2038', // CARET (insertion mark)
	"\\carriagereturn": '\u21B5', // downwards arrow with corner leftward = carriage return
	"\\carriagereturn{}": '\u21B5', // downwards arrow with corner leftward = carriage return
	"\\cat": '\u2040', // CHARACTER TIE, z notation sequence concatenation
	"\\cat{}": '\u2040', // CHARACTER TIE, z notation sequence concatenation
	"\\ccwundercurvearrow": '\u293F', // LOWER LEFT SEMICIRCULAR ANTICLOCKWISE ARROW
	"\\ccwundercurvearrow{}": '\u293F', // LOWER LEFT SEMICIRCULAR ANTICLOCKWISE ARROW
	"\\cdot": '\u00B7', // MIDDLE DOT
	"\\cdots": '\u22EF', // MIDLINE HORIZONTAL ELLIPSIS
	"\\cdots{}": '\u22EF', // MIDLINE HORIZONTAL ELLIPSIS
	"\\cdot{}": '\u00B7', // MIDDLE DOT
	"\\chi": '\u03C7', // GREEK SMALL LETTER CHI
	"\\chi{}": '\u03C7', // GREEK SMALL LETTER CHI
	"\\cirE": '\u29C3', // CIRCLE WITH TWO HORIZONTAL STROKES TO THE RIGHT
	"\\cirE{}": '\u29C3', // CIRCLE WITH TWO HORIZONTAL STROKES TO THE RIGHT
	"\\cirbot": '\u27DF', // UP TACK WITH CIRCLE ABOVE
	"\\cirbot{}": '\u27DF', // UP TACK WITH CIRCLE ABOVE
	"\\circ": '\u2218', // RING OPERATOR
	"\\circeq": '\u2257', // RING EQUAL TO
	"\\circeq{}": '\u2257', // RING EQUAL TO
	"\\circlearrowleft": '\u21BA', // ANTICLOCKWISE OPEN CIRCLE ARROW
	"\\circlearrowleft{}": '\u21BA', // ANTICLOCKWISE OPEN CIRCLE ARROW
	"\\circlearrowright": '\u21BB', // CLOCKWISE OPEN CIRCLE ARROW
	"\\circlearrowright{}": '\u21BB', // CLOCKWISE OPEN CIRCLE ARROW
	"\\circledS": '\u24C8', // CIRCLED LATIN CAPITAL LETTER S
	"\\circledS{}": '\u24C8', // CIRCLED LATIN CAPITAL LETTER S
	"\\circledast": '\u229B', // CIRCLED ASTERISK OPERATOR
	"\\circledast{}": '\u229B', // CIRCLED ASTERISK OPERATOR
	"\\circledbslash": '\u29B8', // CIRCLED REVERSE SOLIDUS
	"\\circledbslash{}": '\u29B8', // CIRCLED REVERSE SOLIDUS
	"\\circledbullet": '\u29BF', // CIRCLED BULLET
	"\\circledbullet{}": '\u29BF', // CIRCLED BULLET
	"\\circledcirc": '\u229A', // CIRCLED RING OPERATOR
	"\\circledcirc{}": '\u229A', // CIRCLED RING OPERATOR
	"\\circleddash": '\u229D', // CIRCLED DASH
	"\\circleddash{}": '\u229D', // CIRCLED DASH
	"\\circledequal": '\u229C', // equal in circle
	"\\circledequal{}": '\u229C', // equal in circle
	"\\circledgtr": '\u29C1', // CIRCLED GREATER-THAN
	"\\circledgtr{}": '\u29C1', // CIRCLED GREATER-THAN
	"\\circledless": '\u29C0', // CIRCLED LESS-THAN
	"\\circledless{}": '\u29C0', // CIRCLED LESS-THAN
	"\\circledownarrow": '\u29EC', // WHITE CIRCLE WITH DOWN ARROW
	"\\circledownarrow{}": '\u29EC', // WHITE CIRCLE WITH DOWN ARROW
	"\\circledparallel": '\u29B7', // CIRCLED PARALLEL
	"\\circledparallel{}": '\u29B7', // CIRCLED PARALLEL
	"\\circledrightdot": '\u2686', // WHITE CIRCLE WITH DOT RIGHT
	"\\circledrightdot{}": '\u2686', // WHITE CIRCLE WITH DOT RIGHT
	"\\circledtwodots": '\u2687', // WHITE CIRCLE WITH TWO DOTS
	"\\circledtwodots{}": '\u2687', // WHITE CIRCLE WITH TWO DOTS
	"\\circledwhitebullet": '\u29BE', // CIRCLED WHITE BULLET
	"\\circledwhitebullet{}": '\u29BE', // CIRCLED WHITE BULLET
	"\\circlellquad": '\u25F5', // WHITE CIRCLE WITH LOWER LEFT QUADRANT
	"\\circlellquad{}": '\u25F5', // WHITE CIRCLE WITH LOWER LEFT QUADRANT
	"\\circlelrquad": '\u25F6', // WHITE CIRCLE WITH LOWER RIGHT QUADRANT
	"\\circlelrquad{}": '\u25F6', // WHITE CIRCLE WITH LOWER RIGHT QUADRANT
	"\\circleonleftarrow": '\u2B30', // LEFT ARROW WITH SMALL CIRCLE
	"\\circleonleftarrow{}": '\u2B30', // LEFT ARROW WITH SMALL CIRCLE
	"\\circleonrightarrow": '\u21F4', // RIGHT ARROW WITH SMALL CIRCLE
	"\\circleonrightarrow{}": '\u21F4', // RIGHT ARROW WITH SMALL CIRCLE
	"\\circletophalfblack": '\u25D3', // circle, filled top half
	"\\circletophalfblack{}": '\u25D3', // circle, filled top half
	"\\circleulquad": '\u25F4', // WHITE CIRCLE WITH UPPER LEFT QUADRANT
	"\\circleulquad{}": '\u25F4', // WHITE CIRCLE WITH UPPER LEFT QUADRANT
	"\\circleurquad": '\u25F7', // WHITE CIRCLE WITH UPPER RIGHT QUADRANT
	"\\circleurquadblack": '\u25D4', // CIRCLE WITH UPPER RIGHT QUADRANT BLACK
	"\\circleurquadblack{}": '\u25D4', // CIRCLE WITH UPPER RIGHT QUADRANT BLACK
	"\\circleurquad{}": '\u25F7', // WHITE CIRCLE WITH UPPER RIGHT QUADRANT
	"\\circlevertfill": '\u25CD', // CIRCLE WITH VERTICAL FILL
	"\\circlevertfill{}": '\u25CD', // CIRCLE WITH VERTICAL FILL
	"\\circ{}": '\u2218', // RING OPERATOR
	"\\cirmid": '\u2AEF', // VERTICAL LINE WITH CIRCLE ABOVE
	"\\cirmid{}": '\u2AEF', // VERTICAL LINE WITH CIRCLE ABOVE
	"\\cirscir": '\u29C2', // CIRCLE WITH SMALL CIRCLE TO THE RIGHT
	"\\cirscir{}": '\u29C2', // CIRCLE WITH SMALL CIRCLE TO THE RIGHT
	"\\clockoint": '\u2A0F', // INTEGRAL AVERAGE WITH SLASH
	"\\clockoint{}": '\u2A0F', // INTEGRAL AVERAGE WITH SLASH
	"\\closedvarcap": '\u2A4D', // CLOSED INTERSECTION WITH SERIFS
	"\\closedvarcap{}": '\u2A4D', // CLOSED INTERSECTION WITH SERIFS
	"\\closedvarcup": '\u2A4C', // CLOSED UNION WITH SERIFS
	"\\closedvarcupsmashprod": '\u2A50', // CLOSED UNION WITH SERIFS AND SMASH PRODUCT
	"\\closedvarcupsmashprod{}": '\u2A50', // CLOSED UNION WITH SERIFS AND SMASH PRODUCT
	"\\closedvarcup{}": '\u2A4C', // CLOSED UNION WITH SERIFS
	"\\closure": '\u2050', // CLOSE UP (editing mark)
	"\\closure{}": '\u2050', // CLOSE UP (editing mark)
	"\\clwintegral": '\u2231', // CLOCKWISE INTEGRAL
	"\\clwintegral{}": '\u2231', // CLOCKWISE INTEGRAL
	"\\commaminus": '\u2A29', // MINUS SIGN WITH COMMA ABOVE
	"\\commaminus{}": '\u2A29', // MINUS SIGN WITH COMMA ABOVE
	"\\complement": '\u2201', // COMPLEMENT
	"\\complement{}": '\u2201', // COMPLEMENT
	"\\concavediamond": '\u27E1', // WHITE CONCAVE-SIDED DIAMOND
	"\\concavediamondtickleft": '\u27E2', // WHITE CONCAVE-SIDED DIAMOND WITH LEFTWARDS TICK
	"\\concavediamondtickleft{}": '\u27E2', // WHITE CONCAVE-SIDED DIAMOND WITH LEFTWARDS TICK
	"\\concavediamondtickright": '\u27E3', // WHITE CONCAVE-SIDED DIAMOND WITH RIGHTWARDS TICK
	"\\concavediamondtickright{}": '\u27E3', // WHITE CONCAVE-SIDED DIAMOND WITH RIGHTWARDS TICK
	"\\concavediamond{}": '\u27E1', // WHITE CONCAVE-SIDED DIAMOND
	"\\cong": '\u2245', // APPROXIMATELY EQUAL TO
	"\\congdot": '\u2A6D', // CONGRUENT WITH DOT ABOVE
	"\\congdot{}": '\u2A6D', // CONGRUENT WITH DOT ABOVE
	"\\cong{}": '\u2245', // APPROXIMATELY EQUAL TO
	"\\conictaper": '\u2332', // CONICAL TAPER
	"\\conictaper{}": '\u2332', // CONICAL TAPER
	"\\coprod": '\u2210', // N-ARY COPRODUCT
	"\\coprod{}": '\u2210', // N-ARY COPRODUCT
	"\\csub": '\u2ACF', // CLOSED SUBSET
	"\\csube": '\u2AD1', // CLOSED SUBSET OR EQUAL TO
	"\\csube{}": '\u2AD1', // CLOSED SUBSET OR EQUAL TO
	"\\csub{}": '\u2ACF', // CLOSED SUBSET
	"\\csup": '\u2AD0', // CLOSED SUPERSET
	"\\csupe": '\u2AD2', // CLOSED SUPERSET OR EQUAL TO
	"\\csupe{}": '\u2AD2', // CLOSED SUPERSET OR EQUAL TO
	"\\csup{}": '\u2AD0', // CLOSED SUPERSET
	"\\cup": '\u222A', // UNION
	"\\cupbarcap": '\u2A48', // UNION ABOVE BAR ABOVE INTERSECTION
	"\\cupbarcap{}": '\u2A48', // UNION ABOVE BAR ABOVE INTERSECTION
	"\\cupdot": '\u228D', // union, with dot
	"\\cupdot{}": '\u228D', // union, with dot
	"\\cupleftarrow": '\u228C', // MULTISET
	"\\cupleftarrow{}": '\u228C', // MULTISET
	"\\cupovercap": '\u2A46', // UNION ABOVE INTERSECTION
	"\\cupovercap{}": '\u2A46', // UNION ABOVE INTERSECTION
	"\\cupvee": '\u2A45', // UNION WITH LOGICAL OR
	"\\cupvee{}": '\u2A45', // UNION WITH LOGICAL OR
	"\\cup{}": '\u222A', // UNION
	"\\curlyeqprec": '\u22DE', // EQUAL TO OR PRECEDES
	"\\curlyeqprec{}": '\u22DE', // EQUAL TO OR PRECEDES
	"\\curlyeqsucc": '\u22DF', // EQUAL TO OR SUCCEEDS
	"\\curlyeqsucc{}": '\u22DF', // EQUAL TO OR SUCCEEDS
	"\\curlyvee": '\u22CE', // CURLY LOGICAL OR
	"\\curlyvee{}": '\u22CE', // CURLY LOGICAL OR
	"\\curlywedge": '\u22CF', // CURLY LOGICAL AND
	"\\curlywedge{}": '\u22CF', // CURLY LOGICAL AND
	"\\curvearrowleft": '\u21B6', // ANTICLOCKWISE TOP SEMICIRCLE ARROW
	"\\curvearrowleftplus": '\u293D', // TOP ARC ANTICLOCKWISE ARROW WITH PLUS
	"\\curvearrowleftplus{}": '\u293D', // TOP ARC ANTICLOCKWISE ARROW WITH PLUS
	"\\curvearrowleft{}": '\u21B6', // ANTICLOCKWISE TOP SEMICIRCLE ARROW
	"\\curvearrowright": '\u21B7', // CLOCKWISE TOP SEMICIRCLE ARROW
	"\\curvearrowrightminus": '\u293C', // TOP ARC CLOCKWISE ARROW WITH MINUS
	"\\curvearrowrightminus{}": '\u293C', // TOP ARC CLOCKWISE ARROW WITH MINUS
	"\\curvearrowright{}": '\u21B7', // CLOCKWISE TOP SEMICIRCLE ARROW
	"\\cwgapcirclearrow": '\u27F3', // CLOCKWISE GAPPED CIRCLE ARROW
	"\\cwgapcirclearrow{}": '\u27F3', // CLOCKWISE GAPPED CIRCLE ARROW
	"\\cwrightarcarrow": '\u2938', // RIGHT-SIDE ARC CLOCKWISE ARROW
	"\\cwrightarcarrow{}": '\u2938', // RIGHT-SIDE ARC CLOCKWISE ARROW
	"\\cwundercurvearrow": '\u293E', // LOWER RIGHT SEMICIRCULAR CLOCKWISE ARROW
	"\\cwundercurvearrow{}": '\u293E', // LOWER RIGHT SEMICIRCULAR CLOCKWISE ARROW
	"\\cyrchar\\C": '\u030F', // COMBINING DOUBLE GRAVE ACCENT
	"\\cyrchar\\CYRA": '\u0410', // CYRILLIC CAPITAL LETTER A
	"\\cyrchar\\CYRABHCH": '\u04BC', // CYRILLIC CAPITAL LETTER ABKHASIAN CHE
	"\\cyrchar\\CYRABHCHDSC": '\u04BE', // CYRILLIC CAPITAL LETTER ABKHASIAN CHE WITH DESCENDER
	"\\cyrchar\\CYRABHCHDSC{}": '\u04BE', // CYRILLIC CAPITAL LETTER ABKHASIAN CHE WITH DESCENDER
	"\\cyrchar\\CYRABHCH{}": '\u04BC', // CYRILLIC CAPITAL LETTER ABKHASIAN CHE
	"\\cyrchar\\CYRABHDZE": '\u04E0', // CYRILLIC CAPITAL LETTER ABKHASIAN DZE
	"\\cyrchar\\CYRABHDZE{}": '\u04E0', // CYRILLIC CAPITAL LETTER ABKHASIAN DZE
	"\\cyrchar\\CYRABHHA": '\u04A8', // CYRILLIC CAPITAL LETTER ABKHASIAN HA
	"\\cyrchar\\CYRABHHA{}": '\u04A8', // CYRILLIC CAPITAL LETTER ABKHASIAN HA
	"\\cyrchar\\CYRAE": '\u04D4', // CYRILLIC CAPITAL LIGATURE A IE
	"\\cyrchar\\CYRAE{}": '\u04D4', // CYRILLIC CAPITAL LIGATURE A IE
	"\\cyrchar\\CYRA{}": '\u0410', // CYRILLIC CAPITAL LETTER A
	"\\cyrchar\\CYRB": '\u0411', // CYRILLIC CAPITAL LETTER BE
	"\\cyrchar\\CYRBYUS": '\u046A', // CYRILLIC CAPITAL LETTER BIG YUS
	"\\cyrchar\\CYRBYUS{}": '\u046A', // CYRILLIC CAPITAL LETTER BIG YUS
	"\\cyrchar\\CYRB{}": '\u0411', // CYRILLIC CAPITAL LETTER BE
	"\\cyrchar\\CYRC": '\u0426', // CYRILLIC CAPITAL LETTER TSE
	"\\cyrchar\\CYRCH": '\u0427', // CYRILLIC CAPITAL LETTER CHE
	"\\cyrchar\\CYRCHLDSC": '\u04CB', // CYRILLIC CAPITAL LETTER KHAKASSIAN CHE
	"\\cyrchar\\CYRCHLDSC{}": '\u04CB', // CYRILLIC CAPITAL LETTER KHAKASSIAN CHE
	"\\cyrchar\\CYRCHRDSC": '\u04B6', // CYRILLIC CAPITAL LETTER CHE WITH DESCENDER
	"\\cyrchar\\CYRCHRDSC{}": '\u04B6', // CYRILLIC CAPITAL LETTER CHE WITH DESCENDER
	"\\cyrchar\\CYRCHVCRS": '\u04B8', // CYRILLIC CAPITAL LETTER CHE WITH VERTICAL STROKE
	"\\cyrchar\\CYRCHVCRS{}": '\u04B8', // CYRILLIC CAPITAL LETTER CHE WITH VERTICAL STROKE
	"\\cyrchar\\CYRCH{}": '\u0427', // CYRILLIC CAPITAL LETTER CHE
	"\\cyrchar\\CYRC{}": '\u0426', // CYRILLIC CAPITAL LETTER TSE
	"\\cyrchar\\CYRD": '\u0414', // CYRILLIC CAPITAL LETTER DE
	"\\cyrchar\\CYRDJE": '\u0402', // CYRILLIC CAPITAL LETTER DJE
	"\\cyrchar\\CYRDJE{}": '\u0402', // CYRILLIC CAPITAL LETTER DJE
	"\\cyrchar\\CYRDZE": '\u0405', // CYRILLIC CAPITAL LETTER DZE
	"\\cyrchar\\CYRDZE{}": '\u0405', // CYRILLIC CAPITAL LETTER DZE
	"\\cyrchar\\CYRDZHE": '\u040F', // CYRILLIC CAPITAL LETTER DZHE
	"\\cyrchar\\CYRDZHE{}": '\u040F', // CYRILLIC CAPITAL LETTER DZHE
	"\\cyrchar\\CYRD{}": '\u0414', // CYRILLIC CAPITAL LETTER DE
	"\\cyrchar\\CYRE": '\u0415', // CYRILLIC CAPITAL LETTER IE
	"\\cyrchar\\CYREREV": '\u042D', // CYRILLIC CAPITAL LETTER E
	"\\cyrchar\\CYREREV{}": '\u042D', // CYRILLIC CAPITAL LETTER E
	"\\cyrchar\\CYRERY": '\u042B', // CYRILLIC CAPITAL LETTER YERU
	"\\cyrchar\\CYRERY{}": '\u042B', // CYRILLIC CAPITAL LETTER YERU
	"\\cyrchar\\CYRE{}": '\u0415', // CYRILLIC CAPITAL LETTER IE
	"\\cyrchar\\CYRF": '\u0424', // CYRILLIC CAPITAL LETTER EF
	"\\cyrchar\\CYRFITA": '\u0472', // CYRILLIC CAPITAL LETTER FITA
	"\\cyrchar\\CYRFITA{}": '\u0472', // CYRILLIC CAPITAL LETTER FITA
	"\\cyrchar\\CYRF{}": '\u0424', // CYRILLIC CAPITAL LETTER EF
	"\\cyrchar\\CYRG": '\u0413', // CYRILLIC CAPITAL LETTER GHE
	"\\cyrchar\\CYRGHCRS": '\u0492', // CYRILLIC CAPITAL LETTER GHE WITH STROKE
	"\\cyrchar\\CYRGHCRS{}": '\u0492', // CYRILLIC CAPITAL LETTER GHE WITH STROKE
	"\\cyrchar\\CYRGHK": '\u0494', // CYRILLIC CAPITAL LETTER GHE WITH MIDDLE HOOK
	"\\cyrchar\\CYRGHK{}": '\u0494', // CYRILLIC CAPITAL LETTER GHE WITH MIDDLE HOOK
	"\\cyrchar\\CYRGUP": '\u0490', // CYRILLIC CAPITAL LETTER GHE WITH UPTURN
	"\\cyrchar\\CYRGUP{}": '\u0490', // CYRILLIC CAPITAL LETTER GHE WITH UPTURN
	"\\cyrchar\\CYRG{}": '\u0413', // CYRILLIC CAPITAL LETTER GHE
	"\\cyrchar\\CYRH": '\u0425', // CYRILLIC CAPITAL LETTER HA
	"\\cyrchar\\CYRHDSC": '\u04B2', // CYRILLIC CAPITAL LETTER HA WITH DESCENDER
	"\\cyrchar\\CYRHDSC{}": '\u04B2', // CYRILLIC CAPITAL LETTER HA WITH DESCENDER
	"\\cyrchar\\CYRHRDSN": '\u042A', // CYRILLIC CAPITAL LETTER HARD SIGN
	"\\cyrchar\\CYRHRDSN{}": '\u042A', // CYRILLIC CAPITAL LETTER HARD SIGN
	"\\cyrchar\\CYRH{}": '\u0425', // CYRILLIC CAPITAL LETTER HA
	"\\cyrchar\\CYRI": '\u0418', // CYRILLIC CAPITAL LETTER I
	"\\cyrchar\\CYRIE": '\u0404', // CYRILLIC CAPITAL LETTER UKRAINIAN IE
	"\\cyrchar\\CYRIE{}": '\u0404', // CYRILLIC CAPITAL LETTER UKRAINIAN IE
	"\\cyrchar\\CYRII": '\u0406', // CYRILLIC CAPITAL LETTER BYELORUSSIAN-UKRAINIAN I
	"\\cyrchar\\CYRII{}": '\u0406', // CYRILLIC CAPITAL LETTER BYELORUSSIAN-UKRAINIAN I
	"\\cyrchar\\CYRIOTBYUS": '\u046C', // CYRILLIC CAPITAL LETTER IOTIFIED BIG YUS
	"\\cyrchar\\CYRIOTBYUS{}": '\u046C', // CYRILLIC CAPITAL LETTER IOTIFIED BIG YUS
	"\\cyrchar\\CYRIOTE": '\u0464', // CYRILLIC CAPITAL LETTER IOTIFIED E
	"\\cyrchar\\CYRIOTE{}": '\u0464', // CYRILLIC CAPITAL LETTER IOTIFIED E
	"\\cyrchar\\CYRIOTLYUS": '\u0468', // CYRILLIC CAPITAL LETTER IOTIFIED LITTLE YUS
	"\\cyrchar\\CYRIOTLYUS{}": '\u0468', // CYRILLIC CAPITAL LETTER IOTIFIED LITTLE YUS
	"\\cyrchar\\CYRISHRT": '\u0419', // CYRILLIC CAPITAL LETTER SHORT I
	"\\cyrchar\\CYRISHRT{}": '\u0419', // CYRILLIC CAPITAL LETTER SHORT I
	"\\cyrchar\\CYRIZH": '\u0474', // CYRILLIC CAPITAL LETTER IZHITSA
	"\\cyrchar\\CYRIZH{}": '\u0474', // CYRILLIC CAPITAL LETTER IZHITSA
	"\\cyrchar\\CYRI{}": '\u0418', // CYRILLIC CAPITAL LETTER I
	"\\cyrchar\\CYRJE": '\u0408', // CYRILLIC CAPITAL LETTER JE
	"\\cyrchar\\CYRJE{}": '\u0408', // CYRILLIC CAPITAL LETTER JE
	"\\cyrchar\\CYRK": '\u041A', // CYRILLIC CAPITAL LETTER KA
	"\\cyrchar\\CYRKBEAK": '\u04A0', // CYRILLIC CAPITAL LETTER BASHKIR KA
	"\\cyrchar\\CYRKBEAK{}": '\u04A0', // CYRILLIC CAPITAL LETTER BASHKIR KA
	"\\cyrchar\\CYRKDSC": '\u049A', // CYRILLIC CAPITAL LETTER KA WITH DESCENDER
	"\\cyrchar\\CYRKDSC{}": '\u049A', // CYRILLIC CAPITAL LETTER KA WITH DESCENDER
	"\\cyrchar\\CYRKHCRS": '\u049E', // CYRILLIC CAPITAL LETTER KA WITH STROKE
	"\\cyrchar\\CYRKHCRS{}": '\u049E', // CYRILLIC CAPITAL LETTER KA WITH STROKE
	"\\cyrchar\\CYRKHK": '\u04C3', // CYRILLIC CAPITAL LETTER KA WITH HOOK
	"\\cyrchar\\CYRKHK{}": '\u04C3', // CYRILLIC CAPITAL LETTER KA WITH HOOK
	"\\cyrchar\\CYRKOPPA": '\u0480', // CYRILLIC CAPITAL LETTER KOPPA
	"\\cyrchar\\CYRKOPPA{}": '\u0480', // CYRILLIC CAPITAL LETTER KOPPA
	"\\cyrchar\\CYRKSI": '\u046E', // CYRILLIC CAPITAL LETTER KSI
	"\\cyrchar\\CYRKSI{}": '\u046E', // CYRILLIC CAPITAL LETTER KSI
	"\\cyrchar\\CYRKVCRS": '\u049C', // CYRILLIC CAPITAL LETTER KA WITH VERTICAL STROKE
	"\\cyrchar\\CYRKVCRS{}": '\u049C', // CYRILLIC CAPITAL LETTER KA WITH VERTICAL STROKE
	"\\cyrchar\\CYRK{}": '\u041A', // CYRILLIC CAPITAL LETTER KA
	"\\cyrchar\\CYRL": '\u041B', // CYRILLIC CAPITAL LETTER EL
	"\\cyrchar\\CYRLJE": '\u0409', // CYRILLIC CAPITAL LETTER LJE
	"\\cyrchar\\CYRLJE{}": '\u0409', // CYRILLIC CAPITAL LETTER LJE
	"\\cyrchar\\CYRLYUS": '\u0466', // CYRILLIC CAPITAL LETTER LITTLE YUS
	"\\cyrchar\\CYRLYUS{}": '\u0466', // CYRILLIC CAPITAL LETTER LITTLE YUS
	"\\cyrchar\\CYRL{}": '\u041B', // CYRILLIC CAPITAL LETTER EL
	"\\cyrchar\\CYRM": '\u041C', // CYRILLIC CAPITAL LETTER EM
	"\\cyrchar\\CYRM{}": '\u041C', // CYRILLIC CAPITAL LETTER EM
	"\\cyrchar\\CYRN": '\u041D', // CYRILLIC CAPITAL LETTER EN
	"\\cyrchar\\CYRNDSC": '\u04A2', // CYRILLIC CAPITAL LETTER EN WITH DESCENDER
	"\\cyrchar\\CYRNDSC{}": '\u04A2', // CYRILLIC CAPITAL LETTER EN WITH DESCENDER
	"\\cyrchar\\CYRNG": '\u04A4', // CYRILLIC CAPITAL LIGATURE EN GHE
	"\\cyrchar\\CYRNG{}": '\u04A4', // CYRILLIC CAPITAL LIGATURE EN GHE
	"\\cyrchar\\CYRNHK": '\u04C7', // CYRILLIC CAPITAL LETTER EN WITH HOOK
	"\\cyrchar\\CYRNHK{}": '\u04C7', // CYRILLIC CAPITAL LETTER EN WITH HOOK
	"\\cyrchar\\CYRNJE": '\u040A', // CYRILLIC CAPITAL LETTER NJE
	"\\cyrchar\\CYRNJE{}": '\u040A', // CYRILLIC CAPITAL LETTER NJE
	"\\cyrchar\\CYRN{}": '\u041D', // CYRILLIC CAPITAL LETTER EN
	"\\cyrchar\\CYRO": '\u041E', // CYRILLIC CAPITAL LETTER O
	"\\cyrchar\\CYROMEGA": '\u0460', // CYRILLIC CAPITAL LETTER OMEGA
	"\\cyrchar\\CYROMEGARND": '\u047A', // CYRILLIC CAPITAL LETTER ROUND OMEGA
	"\\cyrchar\\CYROMEGARND{}": '\u047A', // CYRILLIC CAPITAL LETTER ROUND OMEGA
	"\\cyrchar\\CYROMEGATITLO": '\u047C', // CYRILLIC CAPITAL LETTER OMEGA WITH TITLO
	"\\cyrchar\\CYROMEGATITLO{}": '\u047C', // CYRILLIC CAPITAL LETTER OMEGA WITH TITLO
	"\\cyrchar\\CYROMEGA{}": '\u0460', // CYRILLIC CAPITAL LETTER OMEGA
	"\\cyrchar\\CYROT": '\u047E', // CYRILLIC CAPITAL LETTER OT
	"\\cyrchar\\CYROTLD": '\u04E8', // CYRILLIC CAPITAL LETTER BARRED O
	"\\cyrchar\\CYROTLD{}": '\u04E8', // CYRILLIC CAPITAL LETTER BARRED O
	"\\cyrchar\\CYROT{}": '\u047E', // CYRILLIC CAPITAL LETTER OT
	"\\cyrchar\\CYRO{}": '\u041E', // CYRILLIC CAPITAL LETTER O
	"\\cyrchar\\CYRP": '\u041F', // CYRILLIC CAPITAL LETTER PE
	"\\cyrchar\\CYRPHK": '\u04A6', // CYRILLIC CAPITAL LETTER PE WITH MIDDLE HOOK
	"\\cyrchar\\CYRPHK{}": '\u04A6', // CYRILLIC CAPITAL LETTER PE WITH MIDDLE HOOK
	"\\cyrchar\\CYRPSI": '\u0470', // CYRILLIC CAPITAL LETTER PSI
	"\\cyrchar\\CYRPSI{}": '\u0470', // CYRILLIC CAPITAL LETTER PSI
	"\\cyrchar\\CYRP{}": '\u041F', // CYRILLIC CAPITAL LETTER PE
	"\\cyrchar\\CYRR": '\u0420', // CYRILLIC CAPITAL LETTER ER
	"\\cyrchar\\CYRRTICK": '\u048E', // CYRILLIC CAPITAL LETTER ER WITH TICK
	"\\cyrchar\\CYRRTICK{}": '\u048E', // CYRILLIC CAPITAL LETTER ER WITH TICK
	"\\cyrchar\\CYRR{}": '\u0420', // CYRILLIC CAPITAL LETTER ER
	"\\cyrchar\\CYRS": '\u0421', // CYRILLIC CAPITAL LETTER ES
	"\\cyrchar\\CYRSCHWA": '\u04D8', // CYRILLIC CAPITAL LETTER SCHWA
	"\\cyrchar\\CYRSCHWA{}": '\u04D8', // CYRILLIC CAPITAL LETTER SCHWA
	"\\cyrchar\\CYRSDSC": '\u04AA', // CYRILLIC CAPITAL LETTER ES WITH DESCENDER
	"\\cyrchar\\CYRSDSC{}": '\u04AA', // CYRILLIC CAPITAL LETTER ES WITH DESCENDER
	"\\cyrchar\\CYRSEMISFTSN": '\u048C', // CYRILLIC CAPITAL LETTER SEMISOFT SIGN
	"\\cyrchar\\CYRSEMISFTSN{}": '\u048C', // CYRILLIC CAPITAL LETTER SEMISOFT SIGN
	"\\cyrchar\\CYRSFTSN": '\u042C', // CYRILLIC CAPITAL LETTER SOFT SIGN
	"\\cyrchar\\CYRSFTSN{}": '\u042C', // CYRILLIC CAPITAL LETTER SOFT SIGN
	"\\cyrchar\\CYRSH": '\u0428', // CYRILLIC CAPITAL LETTER SHA
	"\\cyrchar\\CYRSHCH": '\u0429', // CYRILLIC CAPITAL LETTER SHCHA
	"\\cyrchar\\CYRSHCH{}": '\u0429', // CYRILLIC CAPITAL LETTER SHCHA
	"\\cyrchar\\CYRSHHA": '\u04BA', // CYRILLIC CAPITAL LETTER SHHA
	"\\cyrchar\\CYRSHHA{}": '\u04BA', // CYRILLIC CAPITAL LETTER SHHA
	"\\cyrchar\\CYRSH{}": '\u0428', // CYRILLIC CAPITAL LETTER SHA
	"\\cyrchar\\CYRS{}": '\u0421', // CYRILLIC CAPITAL LETTER ES
	"\\cyrchar\\CYRT": '\u0422', // CYRILLIC CAPITAL LETTER TE
	"\\cyrchar\\CYRTDSC": '\u04AC', // CYRILLIC CAPITAL LETTER TE WITH DESCENDER
	"\\cyrchar\\CYRTDSC{}": '\u04AC', // CYRILLIC CAPITAL LETTER TE WITH DESCENDER
	"\\cyrchar\\CYRTETSE": '\u04B4', // CYRILLIC CAPITAL LIGATURE TE TSE
	"\\cyrchar\\CYRTETSE{}": '\u04B4', // CYRILLIC CAPITAL LIGATURE TE TSE
	"\\cyrchar\\CYRTSHE": '\u040B', // CYRILLIC CAPITAL LETTER TSHE
	"\\cyrchar\\CYRTSHE{}": '\u040B', // CYRILLIC CAPITAL LETTER TSHE
	"\\cyrchar\\CYRT{}": '\u0422', // CYRILLIC CAPITAL LETTER TE
	"\\cyrchar\\CYRU": '\u0423', // CYRILLIC CAPITAL LETTER U
	"\\cyrchar\\CYRUK": '\u0478', // CYRILLIC CAPITAL LETTER UK
	"\\cyrchar\\CYRUK{}": '\u0478', // CYRILLIC CAPITAL LETTER UK
	"\\cyrchar\\CYRUSHRT": '\u040E', // CYRILLIC CAPITAL LETTER SHORT U
	"\\cyrchar\\CYRUSHRT{}": '\u040E', // CYRILLIC CAPITAL LETTER SHORT U
	"\\cyrchar\\CYRU{}": '\u0423', // CYRILLIC CAPITAL LETTER U
	"\\cyrchar\\CYRV": '\u0412', // CYRILLIC CAPITAL LETTER VE
	"\\cyrchar\\CYRV{}": '\u0412', // CYRILLIC CAPITAL LETTER VE
	"\\cyrchar\\CYRY": '\u04AE', // CYRILLIC CAPITAL LETTER STRAIGHT U
	"\\cyrchar\\CYRYA": '\u042F', // CYRILLIC CAPITAL LETTER YA
	"\\cyrchar\\CYRYAT": '\u0462', // CYRILLIC CAPITAL LETTER YAT
	"\\cyrchar\\CYRYAT{}": '\u0462', // CYRILLIC CAPITAL LETTER YAT
	"\\cyrchar\\CYRYA{}": '\u042F', // CYRILLIC CAPITAL LETTER YA
	"\\cyrchar\\CYRYHCRS": '\u04B0', // CYRILLIC CAPITAL LETTER STRAIGHT U WITH STROKE
	"\\cyrchar\\CYRYHCRS{}": '\u04B0', // CYRILLIC CAPITAL LETTER STRAIGHT U WITH STROKE
	"\\cyrchar\\CYRYI": '\u0407', // CYRILLIC CAPITAL LETTER YI
	"\\cyrchar\\CYRYI{}": '\u0407', // CYRILLIC CAPITAL LETTER YI
	"\\cyrchar\\CYRYO": '\u0401', // CYRILLIC CAPITAL LETTER IO
	"\\cyrchar\\CYRYO{}": '\u0401', // CYRILLIC CAPITAL LETTER IO
	"\\cyrchar\\CYRYU": '\u042E', // CYRILLIC CAPITAL LETTER YU
	"\\cyrchar\\CYRYU{}": '\u042E', // CYRILLIC CAPITAL LETTER YU
	"\\cyrchar\\CYRY{}": '\u04AE', // CYRILLIC CAPITAL LETTER STRAIGHT U
	"\\cyrchar\\CYRZ": '\u0417', // CYRILLIC CAPITAL LETTER ZE
	"\\cyrchar\\CYRZDSC": '\u0498', // CYRILLIC CAPITAL LETTER ZE WITH DESCENDER
	"\\cyrchar\\CYRZDSC{}": '\u0498', // CYRILLIC CAPITAL LETTER ZE WITH DESCENDER
	"\\cyrchar\\CYRZH": '\u0416', // CYRILLIC CAPITAL LETTER ZHE
	"\\cyrchar\\CYRZHDSC": '\u0496', // CYRILLIC CAPITAL LETTER ZHE WITH DESCENDER
	"\\cyrchar\\CYRZHDSC{}": '\u0496', // CYRILLIC CAPITAL LETTER ZHE WITH DESCENDER
	"\\cyrchar\\CYRZH{}": '\u0416', // CYRILLIC CAPITAL LETTER ZHE
	"\\cyrchar\\CYRZ{}": '\u0417', // CYRILLIC CAPITAL LETTER ZE
	"\\cyrchar\\CYRpalochka": '\u04C0', // CYRILLIC LETTER PALOCHKA
	"\\cyrchar\\CYRpalochka{}": '\u04C0', // CYRILLIC LETTER PALOCHKA
	"\\cyrchar\\C{}": '\u030F', // COMBINING DOUBLE GRAVE ACCENT
	"\\cyrchar\\cyra": '\u0430', // CYRILLIC SMALL LETTER A
	"\\cyrchar\\cyrabhch": '\u04BD', // CYRILLIC SMALL LETTER ABKHASIAN CHE
	"\\cyrchar\\cyrabhchdsc": '\u04BF', // CYRILLIC SMALL LETTER ABKHASIAN CHE WITH DESCENDER
	"\\cyrchar\\cyrabhchdsc{}": '\u04BF', // CYRILLIC SMALL LETTER ABKHASIAN CHE WITH DESCENDER
	"\\cyrchar\\cyrabhch{}": '\u04BD', // CYRILLIC SMALL LETTER ABKHASIAN CHE
	"\\cyrchar\\cyrabhdze": '\u04E1', // CYRILLIC SMALL LETTER ABKHASIAN DZE
	"\\cyrchar\\cyrabhdze{}": '\u04E1', // CYRILLIC SMALL LETTER ABKHASIAN DZE
	"\\cyrchar\\cyrabhha": '\u04A9', // CYRILLIC SMALL LETTER ABKHASIAN HA
	"\\cyrchar\\cyrabhha{}": '\u04A9', // CYRILLIC SMALL LETTER ABKHASIAN HA
	"\\cyrchar\\cyrae": '\u04D5', // CYRILLIC SMALL LIGATURE A IE
	"\\cyrchar\\cyrae{}": '\u04D5', // CYRILLIC SMALL LIGATURE A IE
	"\\cyrchar\\cyra{}": '\u0430', // CYRILLIC SMALL LETTER A
	"\\cyrchar\\cyrb": '\u0431', // CYRILLIC SMALL LETTER BE
	"\\cyrchar\\cyrb{}": '\u0431', // CYRILLIC SMALL LETTER BE
	"\\cyrchar\\cyrc": '\u0446', // CYRILLIC SMALL LETTER TSE
	"\\cyrchar\\cyrch": '\u0447', // CYRILLIC SMALL LETTER CHE
	"\\cyrchar\\cyrchldsc": '\u04CC', // CYRILLIC SMALL LETTER KHAKASSIAN CHE
	"\\cyrchar\\cyrchldsc{}": '\u04CC', // CYRILLIC SMALL LETTER KHAKASSIAN CHE
	"\\cyrchar\\cyrchrdsc": '\u04B7', // CYRILLIC SMALL LETTER CHE WITH DESCENDER
	"\\cyrchar\\cyrchrdsc{}": '\u04B7', // CYRILLIC SMALL LETTER CHE WITH DESCENDER
	"\\cyrchar\\cyrchvcrs": '\u04B9', // CYRILLIC SMALL LETTER CHE WITH VERTICAL STROKE
	"\\cyrchar\\cyrchvcrs{}": '\u04B9', // CYRILLIC SMALL LETTER CHE WITH VERTICAL STROKE
	"\\cyrchar\\cyrch{}": '\u0447', // CYRILLIC SMALL LETTER CHE
	"\\cyrchar\\cyrc{}": '\u0446', // CYRILLIC SMALL LETTER TSE
	"\\cyrchar\\cyrd": '\u0434', // CYRILLIC SMALL LETTER DE
	"\\cyrchar\\cyrdje": '\u0452', // CYRILLIC SMALL LETTER DJE
	"\\cyrchar\\cyrdje{}": '\u0452', // CYRILLIC SMALL LETTER DJE
	"\\cyrchar\\cyrdze": '\u0455', // CYRILLIC SMALL LETTER DZE
	"\\cyrchar\\cyrdze{}": '\u0455', // CYRILLIC SMALL LETTER DZE
	"\\cyrchar\\cyrdzhe": '\u045F', // CYRILLIC SMALL LETTER DZHE
	"\\cyrchar\\cyrdzhe{}": '\u045F', // CYRILLIC SMALL LETTER DZHE
	"\\cyrchar\\cyrd{}": '\u0434', // CYRILLIC SMALL LETTER DE
	"\\cyrchar\\cyre": '\u0435', // CYRILLIC SMALL LETTER IE
	"\\cyrchar\\cyrerev": '\u044D', // CYRILLIC SMALL LETTER E
	"\\cyrchar\\cyrerev{}": '\u044D', // CYRILLIC SMALL LETTER E
	"\\cyrchar\\cyrery": '\u044B', // CYRILLIC SMALL LETTER YERU
	"\\cyrchar\\cyrery{}": '\u044B', // CYRILLIC SMALL LETTER YERU
	"\\cyrchar\\cyre{}": '\u0435', // CYRILLIC SMALL LETTER IE
	"\\cyrchar\\cyrf": '\u0444', // CYRILLIC SMALL LETTER EF
	"\\cyrchar\\cyrf{}": '\u0444', // CYRILLIC SMALL LETTER EF
	"\\cyrchar\\cyrg": '\u0433', // CYRILLIC SMALL LETTER GHE
	"\\cyrchar\\cyrghcrs": '\u0493', // CYRILLIC SMALL LETTER GHE WITH STROKE
	"\\cyrchar\\cyrghcrs{}": '\u0493', // CYRILLIC SMALL LETTER GHE WITH STROKE
	"\\cyrchar\\cyrghk": '\u0495', // CYRILLIC SMALL LETTER GHE WITH MIDDLE HOOK
	"\\cyrchar\\cyrghk{}": '\u0495', // CYRILLIC SMALL LETTER GHE WITH MIDDLE HOOK
	"\\cyrchar\\cyrgup": '\u0491', // CYRILLIC SMALL LETTER GHE WITH UPTURN
	"\\cyrchar\\cyrgup{}": '\u0491', // CYRILLIC SMALL LETTER GHE WITH UPTURN
	"\\cyrchar\\cyrg{}": '\u0433', // CYRILLIC SMALL LETTER GHE
	"\\cyrchar\\cyrh": '\u0445', // CYRILLIC SMALL LETTER HA
	"\\cyrchar\\cyrhdsc": '\u04B3', // CYRILLIC SMALL LETTER HA WITH DESCENDER
	"\\cyrchar\\cyrhdsc{}": '\u04B3', // CYRILLIC SMALL LETTER HA WITH DESCENDER
	"\\cyrchar\\cyrhrdsn": '\u044A', // CYRILLIC SMALL LETTER HARD SIGN
	"\\cyrchar\\cyrhrdsn{}": '\u044A', // CYRILLIC SMALL LETTER HARD SIGN
	"\\cyrchar\\cyrhundredthousands": '\u0488', // COMBINING CYRILLIC HUNDRED THOUSANDS SIGN
	"\\cyrchar\\cyrhundredthousands{}": '\u0488', // COMBINING CYRILLIC HUNDRED THOUSANDS SIGN
	"\\cyrchar\\cyrh{}": '\u0445', // CYRILLIC SMALL LETTER HA
	"\\cyrchar\\cyri": '\u0438', // CYRILLIC SMALL LETTER I
	"\\cyrchar\\cyrie": '\u0454', // CYRILLIC SMALL LETTER UKRAINIAN IE
	"\\cyrchar\\cyrie{}": '\u0454', // CYRILLIC SMALL LETTER UKRAINIAN IE
	"\\cyrchar\\cyrii": '\u0456', // CYRILLIC SMALL LETTER BYELORUSSIAN-UKRAINIAN I
	"\\cyrchar\\cyrii{}": '\u0456', // CYRILLIC SMALL LETTER BYELORUSSIAN-UKRAINIAN I
	"\\cyrchar\\cyriotbyus": '\u046D', // CYRILLIC SMALL LETTER IOTIFIED BIG YUS
	"\\cyrchar\\cyriotbyus{}": '\u046D', // CYRILLIC SMALL LETTER IOTIFIED BIG YUS
	"\\cyrchar\\cyriote": '\u0465', // CYRILLIC SMALL LETTER IOTIFIED E
	"\\cyrchar\\cyriote{}": '\u0465', // CYRILLIC SMALL LETTER IOTIFIED E
	"\\cyrchar\\cyriotlyus": '\u0469', // CYRILLIC SMALL LETTER IOTIFIED LITTLE YUS
	"\\cyrchar\\cyriotlyus{}": '\u0469', // CYRILLIC SMALL LETTER IOTIFIED LITTLE YUS
	"\\cyrchar\\cyrishrt": '\u0439', // CYRILLIC SMALL LETTER SHORT I
	"\\cyrchar\\cyrishrt{}": '\u0439', // CYRILLIC SMALL LETTER SHORT I
	"\\cyrchar\\cyri{}": '\u0438', // CYRILLIC SMALL LETTER I
	"\\cyrchar\\cyrje": '\u0458', // CYRILLIC SMALL LETTER JE
	"\\cyrchar\\cyrje{}": '\u0458', // CYRILLIC SMALL LETTER JE
	"\\cyrchar\\cyrk": '\u043A', // CYRILLIC SMALL LETTER KA
	"\\cyrchar\\cyrkbeak": '\u04A1', // CYRILLIC SMALL LETTER BASHKIR KA
	"\\cyrchar\\cyrkbeak{}": '\u04A1', // CYRILLIC SMALL LETTER BASHKIR KA
	"\\cyrchar\\cyrkdsc": '\u049B', // CYRILLIC SMALL LETTER KA WITH DESCENDER
	"\\cyrchar\\cyrkdsc{}": '\u049B', // CYRILLIC SMALL LETTER KA WITH DESCENDER
	"\\cyrchar\\cyrkhcrs": '\u049F', // CYRILLIC SMALL LETTER KA WITH STROKE
	"\\cyrchar\\cyrkhcrs{}": '\u049F', // CYRILLIC SMALL LETTER KA WITH STROKE
	"\\cyrchar\\cyrkhk": '\u04C4', // CYRILLIC SMALL LETTER KA WITH HOOK
	"\\cyrchar\\cyrkhk{}": '\u04C4', // CYRILLIC SMALL LETTER KA WITH HOOK
	"\\cyrchar\\cyrkoppa": '\u0481', // CYRILLIC SMALL LETTER KOPPA
	"\\cyrchar\\cyrkoppa{}": '\u0481', // CYRILLIC SMALL LETTER KOPPA
	"\\cyrchar\\cyrksi": '\u046F', // CYRILLIC SMALL LETTER KSI
	"\\cyrchar\\cyrksi{}": '\u046F', // CYRILLIC SMALL LETTER KSI
	"\\cyrchar\\cyrkvcrs": '\u049D', // CYRILLIC SMALL LETTER KA WITH VERTICAL STROKE
	"\\cyrchar\\cyrkvcrs{}": '\u049D', // CYRILLIC SMALL LETTER KA WITH VERTICAL STROKE
	"\\cyrchar\\cyrk{}": '\u043A', // CYRILLIC SMALL LETTER KA
	"\\cyrchar\\cyrl": '\u043B', // CYRILLIC SMALL LETTER EL
	"\\cyrchar\\cyrlje": '\u0459', // CYRILLIC SMALL LETTER LJE
	"\\cyrchar\\cyrlje{}": '\u0459', // CYRILLIC SMALL LETTER LJE
	"\\cyrchar\\cyrlyus": '\u0467', // CYRILLIC SMALL LETTER LITTLE YUS
	"\\cyrchar\\cyrlyus{}": '\u0467', // CYRILLIC SMALL LETTER LITTLE YUS
	"\\cyrchar\\cyrl{}": '\u043B', // CYRILLIC SMALL LETTER EL
	"\\cyrchar\\cyrm": '\u043C', // CYRILLIC SMALL LETTER EM
	"\\cyrchar\\cyrmillions": '\u0489', // COMBINING CYRILLIC MILLIONS SIGN
	"\\cyrchar\\cyrmillions{}": '\u0489', // COMBINING CYRILLIC MILLIONS SIGN
	"\\cyrchar\\cyrm{}": '\u043C', // CYRILLIC SMALL LETTER EM
	"\\cyrchar\\cyrn": '\u043D', // CYRILLIC SMALL LETTER EN
	"\\cyrchar\\cyrndsc": '\u04A3', // CYRILLIC SMALL LETTER EN WITH DESCENDER
	"\\cyrchar\\cyrndsc{}": '\u04A3', // CYRILLIC SMALL LETTER EN WITH DESCENDER
	"\\cyrchar\\cyrng": '\u04A5', // CYRILLIC SMALL LIGATURE EN GHE
	"\\cyrchar\\cyrng{}": '\u04A5', // CYRILLIC SMALL LIGATURE EN GHE
	"\\cyrchar\\cyrnhk": '\u04C8', // CYRILLIC SMALL LETTER EN WITH HOOK
	"\\cyrchar\\cyrnhk{}": '\u04C8', // CYRILLIC SMALL LETTER EN WITH HOOK
	"\\cyrchar\\cyrnje": '\u045A', // CYRILLIC SMALL LETTER NJE
	"\\cyrchar\\cyrnje{}": '\u045A', // CYRILLIC SMALL LETTER NJE
	"\\cyrchar\\cyrn{}": '\u043D', // CYRILLIC SMALL LETTER EN
	"\\cyrchar\\cyro": '\u043E', // CYRILLIC SMALL LETTER O
	"\\cyrchar\\cyromega": '\u0461', // CYRILLIC SMALL LETTER OMEGA
	"\\cyrchar\\cyromegarnd": '\u047B', // CYRILLIC SMALL LETTER ROUND OMEGA
	"\\cyrchar\\cyromegarnd{}": '\u047B', // CYRILLIC SMALL LETTER ROUND OMEGA
	"\\cyrchar\\cyromegatitlo": '\u047D', // CYRILLIC SMALL LETTER OMEGA WITH TITLO
	"\\cyrchar\\cyromegatitlo{}": '\u047D', // CYRILLIC SMALL LETTER OMEGA WITH TITLO
	"\\cyrchar\\cyromega{}": '\u0461', // CYRILLIC SMALL LETTER OMEGA
	"\\cyrchar\\cyrot": '\u047F', // CYRILLIC SMALL LETTER OT
	"\\cyrchar\\cyrotld": '\u04E9', // CYRILLIC SMALL LETTER BARRED O
	"\\cyrchar\\cyrotld{}": '\u04E9', // CYRILLIC SMALL LETTER BARRED O
	"\\cyrchar\\cyrot{}": '\u047F', // CYRILLIC SMALL LETTER OT
	"\\cyrchar\\cyro{}": '\u043E', // CYRILLIC SMALL LETTER O
	"\\cyrchar\\cyrp": '\u043F', // CYRILLIC SMALL LETTER PE
	"\\cyrchar\\cyrphk": '\u04A7', // CYRILLIC SMALL LETTER PE WITH MIDDLE HOOK
	"\\cyrchar\\cyrphk{}": '\u04A7', // CYRILLIC SMALL LETTER PE WITH MIDDLE HOOK
	"\\cyrchar\\cyrpsi": '\u0471', // CYRILLIC SMALL LETTER PSI
	"\\cyrchar\\cyrpsi{}": '\u0471', // CYRILLIC SMALL LETTER PSI
	"\\cyrchar\\cyrp{}": '\u043F', // CYRILLIC SMALL LETTER PE
	"\\cyrchar\\cyrr": '\u0440', // CYRILLIC SMALL LETTER ER
	"\\cyrchar\\cyrrtick": '\u048F', // CYRILLIC SMALL LETTER ER WITH TICK
	"\\cyrchar\\cyrrtick{}": '\u048F', // CYRILLIC SMALL LETTER ER WITH TICK
	"\\cyrchar\\cyrr{}": '\u0440', // CYRILLIC SMALL LETTER ER
	"\\cyrchar\\cyrs": '\u0441', // CYRILLIC SMALL LETTER ES
	"\\cyrchar\\cyrschwa": '\u04D9', // CYRILLIC SMALL LETTER SCHWA
	"\\cyrchar\\cyrschwa{}": '\u04D9', // CYRILLIC SMALL LETTER SCHWA
	"\\cyrchar\\cyrsdsc": '\u04AB', // CYRILLIC SMALL LETTER ES WITH DESCENDER
	"\\cyrchar\\cyrsdsc{}": '\u04AB', // CYRILLIC SMALL LETTER ES WITH DESCENDER
	"\\cyrchar\\cyrsemisftsn": '\u048D', // CYRILLIC SMALL LETTER SEMISOFT SIGN
	"\\cyrchar\\cyrsemisftsn{}": '\u048D', // CYRILLIC SMALL LETTER SEMISOFT SIGN
	"\\cyrchar\\cyrsftsn": '\u044C', // CYRILLIC SMALL LETTER SOFT SIGN
	"\\cyrchar\\cyrsftsn{}": '\u044C', // CYRILLIC SMALL LETTER SOFT SIGN
	"\\cyrchar\\cyrsh": '\u0448', // CYRILLIC SMALL LETTER SHA
	"\\cyrchar\\cyrshch": '\u0449', // CYRILLIC SMALL LETTER SHCHA
	"\\cyrchar\\cyrshch{}": '\u0449', // CYRILLIC SMALL LETTER SHCHA
	"\\cyrchar\\cyrshha": '\u04BB', // CYRILLIC SMALL LETTER SHHA
	"\\cyrchar\\cyrshha{}": '\u04BB', // CYRILLIC SMALL LETTER SHHA
	"\\cyrchar\\cyrsh{}": '\u0448', // CYRILLIC SMALL LETTER SHA
	"\\cyrchar\\cyrs{}": '\u0441', // CYRILLIC SMALL LETTER ES
	"\\cyrchar\\cyrt": '\u0442', // CYRILLIC SMALL LETTER TE
	"\\cyrchar\\cyrtdsc": '\u04AD', // CYRILLIC SMALL LETTER TE WITH DESCENDER
	"\\cyrchar\\cyrtdsc{}": '\u04AD', // CYRILLIC SMALL LETTER TE WITH DESCENDER
	"\\cyrchar\\cyrtetse": '\u04B5', // CYRILLIC SMALL LIGATURE TE TSE
	"\\cyrchar\\cyrtetse{}": '\u04B5', // CYRILLIC SMALL LIGATURE TE TSE
	"\\cyrchar\\cyrthousands": '\u0482', // CYRILLIC THOUSANDS SIGN
	"\\cyrchar\\cyrthousands{}": '\u0482', // CYRILLIC THOUSANDS SIGN
	"\\cyrchar\\cyrtshe": '\u045B', // CYRILLIC SMALL LETTER TSHE
	"\\cyrchar\\cyrtshe{}": '\u045B', // CYRILLIC SMALL LETTER TSHE
	"\\cyrchar\\cyrt{}": '\u0442', // CYRILLIC SMALL LETTER TE
	"\\cyrchar\\cyru": '\u0443', // CYRILLIC SMALL LETTER U
	"\\cyrchar\\cyruk": '\u0479', // CYRILLIC SMALL LETTER UK
	"\\cyrchar\\cyruk{}": '\u0479', // CYRILLIC SMALL LETTER UK
	"\\cyrchar\\cyrushrt": '\u045E', // CYRILLIC SMALL LETTER SHORT U
	"\\cyrchar\\cyrushrt{}": '\u045E', // CYRILLIC SMALL LETTER SHORT U
	"\\cyrchar\\cyru{}": '\u0443', // CYRILLIC SMALL LETTER U
	"\\cyrchar\\cyrv": '\u0432', // CYRILLIC SMALL LETTER VE
	"\\cyrchar\\cyrv{}": '\u0432', // CYRILLIC SMALL LETTER VE
	"\\cyrchar\\cyry": '\u04AF', // CYRILLIC SMALL LETTER STRAIGHT U
	"\\cyrchar\\cyrya": '\u044F', // CYRILLIC SMALL LETTER YA
	"\\cyrchar\\cyrya{}": '\u044F', // CYRILLIC SMALL LETTER YA
	"\\cyrchar\\cyryhcrs": '\u04B1', // CYRILLIC SMALL LETTER STRAIGHT U WITH STROKE
	"\\cyrchar\\cyryhcrs{}": '\u04B1', // CYRILLIC SMALL LETTER STRAIGHT U WITH STROKE
	"\\cyrchar\\cyryi": '\u0457', // CYRILLIC SMALL LETTER YI
	"\\cyrchar\\cyryi{}": '\u0457', // CYRILLIC SMALL LETTER YI
	"\\cyrchar\\cyryo": '\u0451', // CYRILLIC SMALL LETTER IO
	"\\cyrchar\\cyryo{}": '\u0451', // CYRILLIC SMALL LETTER IO
	"\\cyrchar\\cyryu": '\u044E', // CYRILLIC SMALL LETTER YU
	"\\cyrchar\\cyryu{}": '\u044E', // CYRILLIC SMALL LETTER YU
	"\\cyrchar\\cyry{}": '\u04AF', // CYRILLIC SMALL LETTER STRAIGHT U
	"\\cyrchar\\cyrz": '\u0437', // CYRILLIC SMALL LETTER ZE
	"\\cyrchar\\cyrzdsc": '\u0499', // CYRILLIC SMALL LETTER ZE WITH DESCENDER
	"\\cyrchar\\cyrzdsc{}": '\u0499', // CYRILLIC SMALL LETTER ZE WITH DESCENDER
	"\\cyrchar\\cyrzh": '\u0436', // CYRILLIC SMALL LETTER ZHE
	"\\cyrchar\\cyrzhdsc": '\u0497', // CYRILLIC SMALL LETTER ZHE WITH DESCENDER
	"\\cyrchar\\cyrzhdsc{}": '\u0497', // CYRILLIC SMALL LETTER ZHE WITH DESCENDER
	"\\cyrchar\\cyrzh{}": '\u0436', // CYRILLIC SMALL LETTER ZHE
	"\\cyrchar\\cyrz{}": '\u0437', // CYRILLIC SMALL LETTER ZE
	"\\cyrchar\\textnumero": '\u2116', // NUMERO SIGN
	"\\cyrchar\\textnumero{}": '\u2116', // NUMERO SIGN
	"\\cyrchar{\\'\\CYRG}": '\u0403', // CYRILLIC CAPITAL LETTER GJE
	"\\cyrchar{\\'\\CYRK}": '\u040C', // CYRILLIC CAPITAL LETTER KJE
	"\\cyrchar{\\'\\cyrg}": '\u0453', // CYRILLIC SMALL LETTER GJE
	"\\cyrchar{\\'\\cyrk}": '\u045C', // CYRILLIC SMALL LETTER KJE
	"\\c{}": '\u00B8', // CEDILLA
	"\\daleth": '\u2138', // DALET SYMBOL
	"\\daleth{}": '\u2138', // DALET SYMBOL
	"\\danger": '\u2621', // CAUTION SIGN, dangerous bend
	"\\danger{}": '\u2621', // CAUTION SIGN, dangerous bend
	"\\dashV": '\u2AE3', // DOUBLE VERTICAL BAR LEFT TURNSTILE
	"\\dashVdash": '\u27DB', // LEFT AND RIGHT TACK
	"\\dashVdash{}": '\u27DB', // LEFT AND RIGHT TACK
	"\\dashV{}": '\u2AE3', // DOUBLE VERTICAL BAR LEFT TURNSTILE
	"\\dashleftarrow": '\u21E0', // LEFTWARDS DASHED ARROW
	"\\dashleftarrow{}": '\u21E0', // LEFTWARDS DASHED ARROW
	"\\dashrightarrow": '\u21E2', // = \dasharrow (amsfonts), RIGHTWARDS DASHED ARROW
	"\\dashrightarrow{}": '\u21E2', // = \dasharrow (amsfonts), RIGHTWARDS DASHED ARROW
	"\\dashv": '\u22A3', // LEFT TACK
	"\\dashv{}": '\u22A3', // LEFT TACK
	"\\dbend": '\uFFFD',
	"\\dbend{}": '\uFFFD',
	"\\dbkarow": '\u290F', // RIGHTWARDS TRIPLE DASH ARROW
	"\\dbkarow{}": '\u290F', // RIGHTWARDS TRIPLE DASH ARROW
	"\\dblarrowupdown": '\u21C5', // UPWARDS ARROW LEFTWARDS OF DOWNWARDS ARROW
	"\\dblarrowupdown{}": '\u21C5', // UPWARDS ARROW LEFTWARDS OF DOWNWARDS ARROW
	"\\ddddot": '\u20DC', // COMBINING FOUR DOTS ABOVE
	"\\ddddot{}": '\u20DC', // COMBINING FOUR DOTS ABOVE
	"\\dddot": '\u20DB', // COMBINING THREE DOTS ABOVE
	"\\dddot{}": '\u20DB', // COMBINING THREE DOTS ABOVE
	"\\ddotseq": '\u2A77', // EQUALS SIGN WITH TWO DOTS ABOVE AND TWO DOTS BELOW
	"\\ddotseq{}": '\u2A77', // EQUALS SIGN WITH TWO DOTS ABOVE AND TWO DOTS BELOW
	"\\ddot{\\iota}": '\u03CA', // GREEK SMALL LETTER IOTA WITH DIALYTIKA
	"\\ddot{\\upsilon}": '\u03CB', // GREEK SMALL LETTER UPSILON WITH DIALYTIKA
	"\\delta": '\u03B4', // GREEK SMALL LETTER DELTA
	"\\delta{}": '\u03B4', // GREEK SMALL LETTER DELTA
	"\\dh": '\u00F0', // LATIN SMALL LETTER ETH
	"\\dh{}": '\u00F0', // LATIN SMALL LETTER ETH
	"\\diagup": '\u2571', // BOX DRAWINGS LIGHT DIAGONAL UPPER RIGHT TO LOWER LEFT
	"\\diagup{}": '\u2571', // BOX DRAWINGS LIGHT DIAGONAL UPPER RIGHT TO LOWER LEFT
	"\\diameter": '\u2300', // # \varnothing (amssymb), DIAMETER SIGN
	"\\diameter{}": '\u2300', // # \varnothing (amssymb), DIAMETER SIGN
	"\\diamond": '\u22C4', // DIAMOND OPERATOR
	"\\diamondbotblack": '\u2B19', // DIAMOND WITH BOTTOM HALF BLACK
	"\\diamondbotblack{}": '\u2B19', // DIAMOND WITH BOTTOM HALF BLACK
	"\\diamondleftarrow": '\u291D', // LEFTWARDS ARROW TO BLACK DIAMOND
	"\\diamondleftarrowbar": '\u291F', // LEFTWARDS ARROW FROM BAR TO BLACK DIAMOND
	"\\diamondleftarrowbar{}": '\u291F', // LEFTWARDS ARROW FROM BAR TO BLACK DIAMOND
	"\\diamondleftarrow{}": '\u291D', // LEFTWARDS ARROW TO BLACK DIAMOND
	"\\diamondleftblack": '\u2B16', // DIAMOND WITH LEFT HALF BLACK
	"\\diamondleftblack{}": '\u2B16', // DIAMOND WITH LEFT HALF BLACK
	"\\diamondrightblack": '\u2B17', // DIAMOND WITH RIGHT HALF BLACK
	"\\diamondrightblack{}": '\u2B17', // DIAMOND WITH RIGHT HALF BLACK
	"\\diamondtopblack": '\u2B18', // DIAMOND WITH TOP HALF BLACK
	"\\diamondtopblack{}": '\u2B18', // DIAMOND WITH TOP HALF BLACK
	"\\diamond{}": '\u22C4', // DIAMOND OPERATOR
	"\\dicei": '\u2680', // DIE FACE-1
	"\\diceii": '\u2681', // DIE FACE-2
	"\\diceiii": '\u2682', // DIE FACE-3
	"\\diceiii{}": '\u2682', // DIE FACE-3
	"\\diceii{}": '\u2681', // DIE FACE-2
	"\\diceiv": '\u2683', // DIE FACE-4
	"\\diceiv{}": '\u2683', // DIE FACE-4
	"\\dicei{}": '\u2680', // DIE FACE-1
	"\\dicev": '\u2684', // DIE FACE-5
	"\\dicevi": '\u2685', // DIE FACE-6
	"\\dicevi{}": '\u2685', // DIE FACE-6
	"\\dicev{}": '\u2684', // DIE FACE-5
	"\\digamma": '\u03DD', // GREEK SMALL LETTER DIGAMMA
	"\\digamma{}": '\u03DD', // GREEK SMALL LETTER DIGAMMA
	"\\ding{100}": '\u2744', // SNOWFLAKE
	"\\ding{101}": '\u2745', // TIGHT TRIFOLIATE SNOWFLAKE
	"\\ding{102}": '\u2746', // HEAVY CHEVRON SNOWFLAKE
	"\\ding{103}": '\u2747', // SPARKLE
	"\\ding{104}": '\u2748', // HEAVY SPARKLE
	"\\ding{105}": '\u2749', // BALLOON-SPOKED ASTERISK
	"\\ding{106}": '\u274A', // EIGHT TEARDROP-SPOKED PROPELLER ASTERISK
	"\\ding{107}": '\u274B', // HEAVY EIGHT TEARDROP-SPOKED PROPELLER ASTERISK
	"\\ding{108}": '\u25CF', // BLACK CIRCLE
	"\\ding{109}": '\u274D', // SHADOWED WHITE CIRCLE
	"\\ding{110}": '\u25A0', // BLACK SQUARE
	"\\ding{111}": '\u274F', // LOWER RIGHT DROP-SHADOWED WHITE SQUARE
	"\\ding{112}": '\u2750', // UPPER RIGHT DROP-SHADOWED WHITE SQUARE
	"\\ding{113}": '\u2751', // LOWER RIGHT SHADOWED WHITE SQUARE
	"\\ding{114}": '\u2752', // UPPER RIGHT SHADOWED WHITE SQUARE
	"\\ding{115}": '\u25B2', // BLACK UP-POINTING TRIANGLE
	"\\ding{116}": '\u25BC', // BLACK DOWN-POINTING TRIANGLE
	"\\ding{117}": '\u25C6', // BLACK DIAMOND
	"\\ding{118}": '\u2756', // BLACK DIAMOND MINUS WHITE X
	"\\ding{119}": '\u25D7', // RIGHT HALF BLACK CIRCLE
	"\\ding{120}": '\u2758', // LIGHT VERTICAL BAR
	"\\ding{121}": '\u2759', // MEDIUM VERTICAL BAR
	"\\ding{122}": '\u275A', // HEAVY VERTICAL BAR
	"\\ding{123}": '\u275B', // HEAVY SINGLE TURNED COMMA QUOTATION MARK ORNAMENT
	"\\ding{124}": '\u275C', // HEAVY SINGLE COMMA QUOTATION MARK ORNAMENT
	"\\ding{125}": '\u275D', // HEAVY DOUBLE TURNED COMMA QUOTATION MARK ORNAMENT
	"\\ding{126}": '\u275E', // HEAVY DOUBLE COMMA QUOTATION MARK ORNAMENT
	"\\ding{161}": '\u2761', // CURVED STEM PARAGRAPH SIGN ORNAMENT
	"\\ding{162}": '\u2762', // HEAVY EXCLAMATION MARK ORNAMENT
	"\\ding{163}": '\u2763', // HEAVY HEART EXCLAMATION MARK ORNAMENT
	"\\ding{164}": '\u2764', // HEAVY BLACK HEART
	"\\ding{165}": '\u2765', // ROTATED HEAVY BLACK HEART BULLET
	"\\ding{166}": '\u2766', // FLORAL HEART
	"\\ding{167}": '\u2767', // ROTATED FLORAL HEART BULLET
	"\\ding{168}": '\u2663', // BLACK CLUB SUIT
	"\\ding{169}": '\u2666', // BLACK DIAMOND SUIT
	"\\ding{170}": '\u2665', // BLACK HEART SUIT
	"\\ding{171}": '\u2660', // BLACK SPADE SUIT
	"\\ding{172}": '\u2460', // CIRCLED DIGIT ONE
	"\\ding{173}": '\u2461', // CIRCLED DIGIT TWO
	"\\ding{174}": '\u2462', // CIRCLED DIGIT THREE
	"\\ding{175}": '\u2463', // CIRCLED DIGIT FOUR
	"\\ding{176}": '\u2464', // CIRCLED DIGIT FIVE
	"\\ding{177}": '\u2465', // CIRCLED DIGIT SIX
	"\\ding{178}": '\u2466', // CIRCLED DIGIT SEVEN
	"\\ding{179}": '\u2467', // CIRCLED DIGIT EIGHT
	"\\ding{180}": '\u2468', // CIRCLED DIGIT NINE
	"\\ding{181}": '\u2469', // CIRCLED NUMBER TEN
	"\\ding{182}": '\u2776', // DINGBAT NEGATIVE CIRCLED DIGIT ONE
	"\\ding{183}": '\u2777', // DINGBAT NEGATIVE CIRCLED DIGIT TWO
	"\\ding{184}": '\u2778', // DINGBAT NEGATIVE CIRCLED DIGIT THREE
	"\\ding{185}": '\u2779', // DINGBAT NEGATIVE CIRCLED DIGIT FOUR
	"\\ding{186}": '\u277A', // DINGBAT NEGATIVE CIRCLED DIGIT FIVE
	"\\ding{187}": '\u277B', // DINGBAT NEGATIVE CIRCLED DIGIT SIX
	"\\ding{188}": '\u277C', // DINGBAT NEGATIVE CIRCLED DIGIT SEVEN
	"\\ding{189}": '\u277D', // DINGBAT NEGATIVE CIRCLED DIGIT EIGHT
	"\\ding{190}": '\u277E', // DINGBAT NEGATIVE CIRCLED DIGIT NINE
	"\\ding{191}": '\u277F', // DINGBAT NEGATIVE CIRCLED NUMBER TEN
	"\\ding{192}": '\u2780', // DINGBAT CIRCLED SANS-SERIF DIGIT ONE
	"\\ding{193}": '\u2781', // DINGBAT CIRCLED SANS-SERIF DIGIT TWO
	"\\ding{194}": '\u2782', // DINGBAT CIRCLED SANS-SERIF DIGIT THREE
	"\\ding{195}": '\u2783', // DINGBAT CIRCLED SANS-SERIF DIGIT FOUR
	"\\ding{196}": '\u2784', // DINGBAT CIRCLED SANS-SERIF DIGIT FIVE
	"\\ding{197}": '\u2785', // DINGBAT CIRCLED SANS-SERIF DIGIT SIX
	"\\ding{198}": '\u2786', // DINGBAT CIRCLED SANS-SERIF DIGIT SEVEN
	"\\ding{199}": '\u2787', // DINGBAT CIRCLED SANS-SERIF DIGIT EIGHT
	"\\ding{200}": '\u2788', // DINGBAT CIRCLED SANS-SERIF DIGIT NINE
	"\\ding{201}": '\u2789', // DINGBAT CIRCLED SANS-SERIF NUMBER TEN
	"\\ding{202}": '\u278A', // DINGBAT NEGATIVE CIRCLED SANS-SERIF DIGIT ONE
	"\\ding{203}": '\u278B', // DINGBAT NEGATIVE CIRCLED SANS-SERIF DIGIT TWO
	"\\ding{204}": '\u278C', // DINGBAT NEGATIVE CIRCLED SANS-SERIF DIGIT THREE
	"\\ding{205}": '\u278D', // DINGBAT NEGATIVE CIRCLED SANS-SERIF DIGIT FOUR
	"\\ding{206}": '\u278E', // DINGBAT NEGATIVE CIRCLED SANS-SERIF DIGIT FIVE
	"\\ding{207}": '\u278F', // DINGBAT NEGATIVE CIRCLED SANS-SERIF DIGIT SIX
	"\\ding{208}": '\u2790', // DINGBAT NEGATIVE CIRCLED SANS-SERIF DIGIT SEVEN
	"\\ding{209}": '\u2791', // DINGBAT NEGATIVE CIRCLED SANS-SERIF DIGIT EIGHT
	"\\ding{210}": '\u2792', // DINGBAT NEGATIVE CIRCLED SANS-SERIF DIGIT NINE
	"\\ding{211}": '\u2793', // DINGBAT NEGATIVE CIRCLED SANS-SERIF NUMBER TEN
	"\\ding{212}": '\u2794', // HEAVY WIDE-HEADED RIGHTWARDS ARROW
	"\\ding{216}": '\u2798', // HEAVY SOUTH EAST ARROW
	"\\ding{217}": '\u2799', // HEAVY RIGHTWARDS ARROW
	"\\ding{218}": '\u279A', // HEAVY NORTH EAST ARROW
	"\\ding{219}": '\u279B', // DRAFTING POINT RIGHTWARDS ARROW
	"\\ding{220}": '\u279C', // HEAVY ROUND-TIPPED RIGHTWARDS ARROW
	"\\ding{221}": '\u279D', // TRIANGLE-HEADED RIGHTWARDS ARROW
	"\\ding{222}": '\u279E', // HEAVY TRIANGLE-HEADED RIGHTWARDS ARROW
	"\\ding{223}": '\u279F', // DASHED TRIANGLE-HEADED RIGHTWARDS ARROW
	"\\ding{224}": '\u27A0', // HEAVY DASHED TRIANGLE-HEADED RIGHTWARDS ARROW
	"\\ding{225}": '\u27A1', // BLACK RIGHTWARDS ARROW
	"\\ding{226}": '\u27A2', // THREE-D TOP-LIGHTED RIGHTWARDS ARROWHEAD
	"\\ding{227}": '\u27A3', // THREE-D BOTTOM-LIGHTED RIGHTWARDS ARROWHEAD
	"\\ding{228}": '\u27A4', // BLACK RIGHTWARDS ARROWHEAD
	"\\ding{229}": '\u27A5', // HEAVY BLACK CURVED DOWNWARDS AND RIGHTWARDS ARROW
	"\\ding{230}": '\u27A6', // HEAVY BLACK CURVED UPWARDS AND RIGHTWARDS ARROW
	"\\ding{231}": '\u27A7', // SQUAT BLACK RIGHTWARDS ARROW
	"\\ding{232}": '\u27A8', // HEAVY CONCAVE-POINTED BLACK RIGHTWARDS ARROW
	"\\ding{233}": '\u27A9', // RIGHT-SHADED WHITE RIGHTWARDS ARROW
	"\\ding{234}": '\u27AA', // LEFT-SHADED WHITE RIGHTWARDS ARROW
	"\\ding{235}": '\u27AB', // BACK-TILTED SHADOWED WHITE RIGHTWARDS ARROW
	"\\ding{236}": '\u27AC', // FRONT-TILTED SHADOWED WHITE RIGHTWARDS ARROW
	"\\ding{237}": '\u27AD', // HEAVY LOWER RIGHT-SHADOWED WHITE RIGHTWARDS ARROW
	"\\ding{238}": '\u27AE', // HEAVY UPPER RIGHT-SHADOWED WHITE RIGHTWARDS ARROW
	"\\ding{239}": '\u27AF', // NOTCHED LOWER RIGHT-SHADOWED WHITE RIGHTWARDS ARROW
	"\\ding{241}": '\u27B1', // NOTCHED UPPER RIGHT-SHADOWED WHITE RIGHTWARDS ARROW
	"\\ding{242}": '\u27B2', // CIRCLED HEAVY WHITE RIGHTWARDS ARROW
	"\\ding{243}": '\u27B3', // WHITE-FEATHERED RIGHTWARDS ARROW
	"\\ding{244}": '\u27B4', // BLACK-FEATHERED SOUTH EAST ARROW
	"\\ding{245}": '\u27B5', // BLACK-FEATHERED RIGHTWARDS ARROW
	"\\ding{246}": '\u27B6', // BLACK-FEATHERED NORTH EAST ARROW
	"\\ding{247}": '\u27B7', // HEAVY BLACK-FEATHERED SOUTH EAST ARROW
	"\\ding{248}": '\u27B8', // HEAVY BLACK-FEATHERED RIGHTWARDS ARROW
	"\\ding{249}": '\u27B9', // HEAVY BLACK-FEATHERED NORTH EAST ARROW
	"\\ding{250}": '\u27BA', // TEARDROP-BARBED RIGHTWARDS ARROW
	"\\ding{251}": '\u27BB', // HEAVY TEARDROP-SHANKED RIGHTWARDS ARROW
	"\\ding{252}": '\u27BC', // WEDGE-TAILED RIGHTWARDS ARROW
	"\\ding{253}": '\u27BD', // HEAVY WEDGE-TAILED RIGHTWARDS ARROW
	"\\ding{254}": '\u27BE', // OPEN-OUTLINED RIGHTWARDS ARROW
	"\\ding{33}": '\u2701', // UPPER BLADE SCISSORS
	"\\ding{34}": '\u2702', // BLACK SCISSORS
	"\\ding{35}": '\u2703', // LOWER BLADE SCISSORS
	"\\ding{36}": '\u2704', // WHITE SCISSORS
	"\\ding{37}": '\u260E', // BLACK TELEPHONE
	"\\ding{38}": '\u2706', // TELEPHONE LOCATION SIGN
	"\\ding{39}": '\u2707', // TAPE DRIVE
	"\\ding{40}": '\u2708', // AIRPLANE
	"\\ding{41}": '\u2709', // ENVELOPE
	"\\ding{42}": '\u261B', // BLACK RIGHT POINTING INDEX
	"\\ding{43}": '\u261E', // WHITE RIGHT POINTING INDEX
	"\\ding{44}": '\u270C', // VICTORY HAND
	"\\ding{45}": '\u270D', // WRITING HAND
	"\\ding{46}": '\u270E', // LOWER RIGHT PENCIL
	"\\ding{47}": '\u270F', // PENCIL
	"\\ding{48}": '\u2710', // UPPER RIGHT PENCIL
	"\\ding{49}": '\u2711', // WHITE NIB
	"\\ding{50}": '\u2712', // BLACK NIB
	"\\ding{51}": '\u2713', // CHECK MARK
	"\\ding{52}": '\u2714', // HEAVY CHECK MARK
	"\\ding{53}": '\u2715', // MULTIPLICATION X
	"\\ding{54}": '\u2716', // HEAVY MULTIPLICATION X
	"\\ding{55}": '\u2717', // BALLOT X
	"\\ding{56}": '\u2718', // HEAVY BALLOT X
	"\\ding{57}": '\u2719', // OUTLINED GREEK CROSS
	"\\ding{58}": '\u271A', // HEAVY GREEK CROSS
	"\\ding{59}": '\u271B', // OPEN CENTRE CROSS
	"\\ding{60}": '\u271C', // HEAVY OPEN CENTRE CROSS
	"\\ding{61}": '\u271D', // LATIN CROSS
	"\\ding{62}": '\u271E', // SHADOWED WHITE LATIN CROSS
	"\\ding{63}": '\u271F', // OUTLINED LATIN CROSS
	"\\ding{64}": '\u2720', // MALTESE CROSS
	"\\ding{65}": '\u2721', // STAR OF DAVID
	"\\ding{66}": '\u2722', // FOUR TEARDROP-SPOKED ASTERISK
	"\\ding{67}": '\u2723', // FOUR BALLOON-SPOKED ASTERISK
	"\\ding{68}": '\u2724', // HEAVY FOUR BALLOON-SPOKED ASTERISK
	"\\ding{69}": '\u2725', // FOUR CLUB-SPOKED ASTERISK
	"\\ding{70}": '\u2726', // BLACK FOUR POINTED STAR
	"\\ding{71}": '\u2727', // WHITE FOUR POINTED STAR
	"\\ding{72}": '\u2605', // BLACK STAR
	"\\ding{73}": '\u2606', // WHITE STAR
	"\\ding{74}": '\u272A', // CIRCLED WHITE STAR
	"\\ding{75}": '\u272B', // OPEN CENTRE BLACK STAR
	"\\ding{76}": '\u272C', // BLACK CENTRE WHITE STAR
	"\\ding{77}": '\u272D', // OUTLINED BLACK STAR
	"\\ding{78}": '\u272E', // HEAVY OUTLINED BLACK STAR
	"\\ding{79}": '\u272F', // PINWHEEL STAR
	"\\ding{80}": '\u2730', // SHADOWED WHITE STAR
	"\\ding{81}": '\u2731', // HEAVY ASTERISK
	"\\ding{82}": '\u2732', // OPEN CENTRE ASTERISK
	"\\ding{83}": '\u2733', // EIGHT SPOKED ASTERISK
	"\\ding{84}": '\u2734', // EIGHT POINTED BLACK STAR
	"\\ding{85}": '\u2735', // EIGHT POINTED PINWHEEL STAR
	"\\ding{86}": '\u2736', // SIX POINTED BLACK STAR
	"\\ding{87}": '\u2737', // EIGHT POINTED RECTILINEAR BLACK STAR
	"\\ding{88}": '\u2738', // HEAVY EIGHT POINTED RECTILINEAR BLACK STAR
	"\\ding{89}": '\u2739', // TWELVE POINTED BLACK STAR
	"\\ding{90}": '\u273A', // SIXTEEN POINTED ASTERISK
	"\\ding{91}": '\u273B', // TEARDROP-SPOKED ASTERISK
	"\\ding{92}": '\u273C', // OPEN CENTRE TEARDROP-SPOKED ASTERISK
	"\\ding{93}": '\u273D', // HEAVY TEARDROP-SPOKED ASTERISK
	"\\ding{94}": '\u273E', // SIX PETALLED BLACK AND WHITE FLORETTE
	"\\ding{95}": '\u273F', // BLACK FLORETTE
	"\\ding{96}": '\u2740', // WHITE FLORETTE
	"\\ding{97}": '\u2741', // EIGHT PETALLED OUTLINED BLACK FLORETTE
	"\\ding{98}": '\u2742', // CIRCLED OPEN CENTRE EIGHT POINTED STAR
	"\\ding{99}": '\u2743', // HEAVY TEARDROP-SPOKED PINWHEEL ASTERISK
	"\\disin": '\u22F2', // ELEMENT OF WITH LONG HORIZONTAL STROKE
	"\\disin{}": '\u22F2', // ELEMENT OF WITH LONG HORIZONTAL STROKE
	"\\div": '\u00F7', // DIVISION SIGN
	"\\divideontimes": '\u22C7', // DIVISION TIMES
	"\\divideontimes{}": '\u22C7', // DIVISION TIMES
	"\\div{}": '\u00F7', // DIVISION SIGN
	"\\dj": '\u0111', // LATIN SMALL LETTER D WITH STROKE
	"\\dj{}": '\u0111', // LATIN SMALL LETTER D WITH STROKE
	"\\dlsh": '\u21B2', // left down angled arrow
	"\\dlsh{}": '\u21B2', // left down angled arrow
	"\\doteq": '\u2250', // APPROACHES THE LIMIT
	"\\doteqdot": '\u2251', // GEOMETRICALLY EQUAL TO
	"\\doteqdot{}": '\u2251', // GEOMETRICALLY EQUAL TO
	"\\dotequiv": '\u2A67', // IDENTICAL WITH DOT ABOVE
	"\\dotequiv{}": '\u2A67', // IDENTICAL WITH DOT ABOVE
	"\\doteq{}": '\u2250', // APPROACHES THE LIMIT
	"\\dotplus": '\u2214', // DOT PLUS
	"\\dotplus{}": '\u2214', // DOT PLUS
	"\\dotsim": '\u2A6A', // TILDE OPERATOR WITH DOT ABOVE
	"\\dotsim{}": '\u2A6A', // TILDE OPERATOR WITH DOT ABOVE
	"\\dottedcircle": '\u25CC', // DOTTED CIRCLE
	"\\dottedcircle{}": '\u25CC', // DOTTED CIRCLE
	"\\dottedsquare": '\u2B1A', // DOTTED SQUARE
	"\\dottedsquare{}": '\u2B1A', // DOTTED SQUARE
	"\\dottimes": '\u2A30', // MULTIPLICATION SIGN WITH DOT ABOVE
	"\\dottimes{}": '\u2A30', // MULTIPLICATION SIGN WITH DOT ABOVE
	"\\doublebarvee": '\u2A62', // LOGICAL OR WITH DOUBLE OVERBAR
	"\\doublebarvee{}": '\u2A62', // LOGICAL OR WITH DOUBLE OVERBAR
	"\\doubleplus": '\u29FA', // DOUBLE PLUS
	"\\doubleplus{}": '\u29FA', // DOUBLE PLUS
	"\\downarrow": '\u2193', // DOWNWARDS ARROW
	"\\downarrowbarred": '\u2908', // DOWNWARDS ARROW WITH HORIZONTAL STROKE
	"\\downarrowbarred{}": '\u2908', // DOWNWARDS ARROW WITH HORIZONTAL STROKE
	"\\downarrow{}": '\u2193', // DOWNWARDS ARROW
	"\\downdasharrow": '\u21E3', // DOWNWARDS DASHED ARROW
	"\\downdasharrow{}": '\u21E3', // DOWNWARDS DASHED ARROW
	"\\downdownarrows": '\u21CA', // DOWNWARDS PAIRED ARROWS
	"\\downdownarrows{}": '\u21CA', // DOWNWARDS PAIRED ARROWS
	"\\downdownharpoons": '\u2965', // DOWNWARDS HARPOON WITH BARB LEFT BESIDE DOWNWARDS HARPOON WITH BARB RIGHT
	"\\downdownharpoons{}": '\u2965', // DOWNWARDS HARPOON WITH BARB LEFT BESIDE DOWNWARDS HARPOON WITH BARB RIGHT
	"\\downfishtail": '\u297F', // DOWN FISH TAIL
	"\\downfishtail{}": '\u297F', // DOWN FISH TAIL
	"\\downharpoonleft": '\u21C3', // DOWNWARDS HARPOON WITH BARB LEFTWARDS
	"\\downharpoonleft{}": '\u21C3', // DOWNWARDS HARPOON WITH BARB LEFTWARDS
	"\\downharpoonright": '\u21C2', // DOWNWARDS HARPOON WITH BARB RIGHTWARDS
	"\\downharpoonright{}": '\u21C2', // DOWNWARDS HARPOON WITH BARB RIGHTWARDS
	"\\downrightcurvedarrow": '\u2935', // ARROW POINTING RIGHTWARDS THEN CURVING DOWNWARDS
	"\\downrightcurvedarrow{}": '\u2935', // ARROW POINTING RIGHTWARDS THEN CURVING DOWNWARDS
	"\\downslopeellipsis": '\u22F1', // DOWN RIGHT DIAGONAL ELLIPSIS
	"\\downslopeellipsis{}": '\u22F1', // DOWN RIGHT DIAGONAL ELLIPSIS
	"\\downtriangleleftblack": '\u29E8', // DOWN-POINTING TRIANGLE WITH LEFT HALF BLACK
	"\\downtriangleleftblack{}": '\u29E8', // DOWN-POINTING TRIANGLE WITH LEFT HALF BLACK
	"\\downtrianglerightblack": '\u29E9', // DOWN-POINTING TRIANGLE WITH RIGHT HALF BLACK
	"\\downtrianglerightblack{}": '\u29E9', // DOWN-POINTING TRIANGLE WITH RIGHT HALF BLACK
	"\\downwhitearrow": '\u21E9', // DOWNWARDS WHITE ARROW
	"\\downwhitearrow{}": '\u21E9', // DOWNWARDS WHITE ARROW
	"\\drbkarow": '\u2910', // RIGHTWARDS TWO-HEADED TRIPLE DASH ARROW
	"\\drbkarow{}": '\u2910', // RIGHTWARDS TWO-HEADED TRIPLE DASH ARROW
	"\\droang": '\u031A', // left angle above (non-spacing)
	"\\droang{}": '\u031A', // left angle above (non-spacing)
	"\\dsol": '\u29F6', // SOLIDUS WITH OVERBAR
	"\\dsol{}": '\u29F6', // SOLIDUS WITH OVERBAR
	"\\dsub": '\u2A64', // = \ndres (oz), Z NOTATION DOMAIN ANTIRESTRICTION
	"\\dsub{}": '\u2A64', // = \ndres (oz), Z NOTATION DOMAIN ANTIRESTRICTION
	"\\earth": '\u2641', // = \varEarth (mathabx), EARTH
	"\\earth{}": '\u2641', // = \varEarth (mathabx), EARTH
	"\\egsdot": '\u2A98', // SLANTED EQUAL TO OR GREATER-THAN WITH DOT INSIDE
	"\\egsdot{}": '\u2A98', // SLANTED EQUAL TO OR GREATER-THAN WITH DOT INSIDE
	"\\eighthnote": '\u266A', // EIGHTH NOTE
	"\\eighthnote{}": '\u266A', // EIGHTH NOTE
	"\\elinters": '\u23E7', // ELECTRICAL INTERSECTION
	"\\elinters{}": '\u23E7', // ELECTRICAL INTERSECTION
	"\\elsdot": '\u2A97', // SLANTED EQUAL TO OR LESS-THAN WITH DOT INSIDE
	"\\elsdot{}": '\u2A97', // SLANTED EQUAL TO OR LESS-THAN WITH DOT INSIDE
	"\\emptysetoarr": '\u29B3', // EMPTY SET WITH RIGHT ARROW ABOVE
	"\\emptysetoarrl": '\u29B4', // EMPTY SET WITH LEFT ARROW ABOVE
	"\\emptysetoarrl{}": '\u29B4', // EMPTY SET WITH LEFT ARROW ABOVE
	"\\emptysetoarr{}": '\u29B3', // EMPTY SET WITH RIGHT ARROW ABOVE
	"\\emptysetobar": '\u29B1', // EMPTY SET WITH OVERBAR
	"\\emptysetobar{}": '\u29B1', // EMPTY SET WITH OVERBAR
	"\\emptysetocirc": '\u29B2', // EMPTY SET WITH SMALL CIRCLE ABOVE
	"\\emptysetocirc{}": '\u29B2', // EMPTY SET WITH SMALL CIRCLE ABOVE
	"\\enclosecircle": '\u20DD', // COMBINING ENCLOSING CIRCLE
	"\\enclosecircle{}": '\u20DD', // COMBINING ENCLOSING CIRCLE
	"\\enclosediamond": '\u20DF', // COMBINING ENCLOSING DIAMOND
	"\\enclosediamond{}": '\u20DF', // COMBINING ENCLOSING DIAMOND
	"\\enclosesquare": '\u20DE', // COMBINING ENCLOSING SQUARE
	"\\enclosesquare{}": '\u20DE', // COMBINING ENCLOSING SQUARE
	"\\enclosetriangle": '\u20E4', // COMBINING ENCLOSING UPWARD POINTING TRIANGLE
	"\\enclosetriangle{}": '\u20E4', // COMBINING ENCLOSING UPWARD POINTING TRIANGLE
	"\\ensuremath{\\Elzpes}": '\u20A7', // PESETA SIGN
	"\\eparsl": '\u29E3', // EQUALS SIGN AND SLANTED PARALLEL
	"\\eparsl{}": '\u29E3', // EQUALS SIGN AND SLANTED PARALLEL
	"\\epsilon": '\u03B5', // GREEK SMALL LETTER EPSILON
	"\\epsilon{}": '\u03B5', // GREEK SMALL LETTER EPSILON
	"\\eqcirc": '\u2256', // RING IN EQUAL TO
	"\\eqcirc{}": '\u2256', // RING IN EQUAL TO
	"\\eqcolon": '\u2239', // # -: ,EXCESS
	"\\eqcolon{}": '\u2239', // # -: ,EXCESS
	"\\eqdef": '\u225D', // equals by definition
	"\\eqdef{}": '\u225D', // equals by definition
	"\\eqdot": '\u2A66', // EQUALS SIGN WITH DOT BELOW
	"\\eqdot{}": '\u2A66', // EQUALS SIGN WITH DOT BELOW
	"\\eqgtr": '\u22DD', // equal-or-greater
	"\\eqgtr{}": '\u22DD', // equal-or-greater
	"\\eqless": '\u22DC', // equal-or-less
	"\\eqless{}": '\u22DC', // equal-or-less
	"\\eqqgtr": '\u2A9A', // DOUBLE-LINE EQUAL TO OR GREATER-THAN
	"\\eqqgtr{}": '\u2A9A', // DOUBLE-LINE EQUAL TO OR GREATER-THAN
	"\\eqqless": '\u2A99', // DOUBLE-LINE EQUAL TO OR LESS-THAN
	"\\eqqless{}": '\u2A99', // DOUBLE-LINE EQUAL TO OR LESS-THAN
	"\\eqqplus": '\u2A71', // EQUALS SIGN ABOVE PLUS SIGN
	"\\eqqplus{}": '\u2A71', // EQUALS SIGN ABOVE PLUS SIGN
	"\\eqqsim": '\u2A73', // EQUALS SIGN ABOVE TILDE OPERATOR
	"\\eqqsim{}": '\u2A73', // EQUALS SIGN ABOVE TILDE OPERATOR
	"\\eqqslantgtr": '\u2A9C', // DOUBLE-LINE SLANTED EQUAL TO OR GREATER-THAN
	"\\eqqslantgtr{}": '\u2A9C', // DOUBLE-LINE SLANTED EQUAL TO OR GREATER-THAN
	"\\eqqslantless": '\u2A9B', // DOUBLE-LINE SLANTED EQUAL TO OR LESS-THAN
	"\\eqqslantless{}": '\u2A9B', // DOUBLE-LINE SLANTED EQUAL TO OR LESS-THAN
	"\\eqslantgtr": '\u2A96', // SLANTED EQUAL TO OR GREATER-THAN
	"\\eqslantgtr{}": '\u2A96', // SLANTED EQUAL TO OR GREATER-THAN
	"\\eqslantless": '\u2A95', // SLANTED EQUAL TO OR LESS-THAN
	"\\eqslantless{}": '\u2A95', // SLANTED EQUAL TO OR LESS-THAN
	"\\equalleftarrow": '\u2B40', // EQUALS SIGN ABOVE LEFTWARDS ARROW
	"\\equalleftarrow{}": '\u2B40', // EQUALS SIGN ABOVE LEFTWARDS ARROW
	"\\equalrightarrow": '\u2971', // EQUALS SIGN ABOVE RIGHTWARDS ARROW
	"\\equalrightarrow{}": '\u2971', // EQUALS SIGN ABOVE RIGHTWARDS ARROW
	"\\equiv": '\u2261', // IDENTICAL TO
	"\\equivDD": '\u2A78', // EQUIVALENT WITH FOUR DOTS ABOVE
	"\\equivDD{}": '\u2A78', // EQUIVALENT WITH FOUR DOTS ABOVE
	"\\equivVert": '\u2A68', // TRIPLE HORIZONTAL BAR WITH DOUBLE VERTICAL STROKE
	"\\equivVert{}": '\u2A68', // TRIPLE HORIZONTAL BAR WITH DOUBLE VERTICAL STROKE
	"\\equivVvert": '\u2A69', // TRIPLE HORIZONTAL BAR WITH TRIPLE VERTICAL STROKE
	"\\equivVvert{}": '\u2A69', // TRIPLE HORIZONTAL BAR WITH TRIPLE VERTICAL STROKE
	"\\equiv{}": '\u2261', // IDENTICAL TO
	"\\eqvparsl": '\u29E5', // IDENTICAL TO AND SLANTED PARALLEL
	"\\eqvparsl{}": '\u29E5', // IDENTICAL TO AND SLANTED PARALLEL
	"\\errbarblackcircle": '\u29F3', // ERROR-BARRED BLACK CIRCLE
	"\\errbarblackcircle{}": '\u29F3', // ERROR-BARRED BLACK CIRCLE
	"\\errbarblackdiamond": '\u29F1', // ERROR-BARRED BLACK DIAMOND
	"\\errbarblackdiamond{}": '\u29F1', // ERROR-BARRED BLACK DIAMOND
	"\\errbarblacksquare": '\u29EF', // ERROR-BARRED BLACK SQUARE
	"\\errbarblacksquare{}": '\u29EF', // ERROR-BARRED BLACK SQUARE
	"\\errbarcircle": '\u29F2', // ERROR-BARRED WHITE CIRCLE
	"\\errbarcircle{}": '\u29F2', // ERROR-BARRED WHITE CIRCLE
	"\\errbardiamond": '\u29F0', // ERROR-BARRED WHITE DIAMOND
	"\\errbardiamond{}": '\u29F0', // ERROR-BARRED WHITE DIAMOND
	"\\errbarsquare": '\u29EE', // ERROR-BARRED WHITE SQUARE
	"\\errbarsquare{}": '\u29EE', // ERROR-BARRED WHITE SQUARE
	"\\estimates": '\u2259', // ESTIMATES
	"\\estimates{}": '\u2259', // ESTIMATES
	"\\eta": '\u03B7', // GREEK SMALL LETTER ETA
	"\\eta{}": '\u03B7', // GREEK SMALL LETTER ETA
	"\\eth": '\u01AA', // LATIN LETTER REVERSED ESH LOOP
	"\\eth{}": '\u01AA', // LATIN LETTER REVERSED ESH LOOP
	"\\exists": '\u2203', // THERE EXISTS
	"\\exists{}": '\u2203', // THERE EXISTS
	"\\fallingdotseq": '\u2252', // APPROXIMATELY EQUAL TO OR THE IMAGE OF
	"\\fallingdotseq{}": '\u2252', // APPROXIMATELY EQUAL TO OR THE IMAGE OF
	"\\fbowtie": '\u29D3', // BLACK BOWTIE
	"\\fbowtie{}": '\u29D3', // BLACK BOWTIE
	"\\fbox{~~}": '\u25AD', // WHITE RECTANGLE
	"\\fcmp": '\u2A3E', // = \comp (oz), Z NOTATION RELATIONAL COMPOSITION
	"\\fcmp{}": '\u2A3E', // = \comp (oz), Z NOTATION RELATIONAL COMPOSITION
	"\\fdiagovnearrow": '\u292F', // FALLING DIAGONAL CROSSING NORTH EAST ARROW
	"\\fdiagovnearrow{}": '\u292F', // FALLING DIAGONAL CROSSING NORTH EAST ARROW
	"\\fdiagovrdiag": '\u292C', // FALLING DIAGONAL CROSSING RISING DIAGONAL
	"\\fdiagovrdiag{}": '\u292C', // FALLING DIAGONAL CROSSING RISING DIAGONAL
	"\\ffun": '\u21FB', // RIGHTWARDS ARROW WITH DOUBLE VERTICAL STROKE, z notation finite function
	"\\ffun{}": '\u21FB', // RIGHTWARDS ARROW WITH DOUBLE VERTICAL STROKE, z notation finite function
	"\\finj": '\u2915', // RIGHTWARDS ARROW WITH TAIL WITH DOUBLE VERTICAL STROKE, z notation finite injection
	"\\finj{}": '\u2915', // RIGHTWARDS ARROW WITH TAIL WITH DOUBLE VERTICAL STROKE, z notation finite injection
	"\\fisheye": '\u25C9', // FISHEYE
	"\\fisheye{}": '\u25C9', // FISHEYE
	"\\flat": '\u266D', // MUSIC FLAT SIGN
	"\\flat{}": '\u266D', // MUSIC FLAT SIGN
	"\\fltns": '\u23E5', // FLATNESS
	"\\fltns{}": '\u23E5', // FLATNESS
	"\\fontencoding{LECO}\\selectfont\\char177": '\u0311', // COMBINING INVERTED BREVE
	"\\fontencoding{LECO}\\selectfont\\char177{}": '\u0311', // COMBINING INVERTED BREVE
	"\\fontencoding{LECO}\\selectfont\\char184": '\u0318', // COMBINING LEFT TACK BELOW
	"\\fontencoding{LECO}\\selectfont\\char184{}": '\u0318', // COMBINING LEFT TACK BELOW
	"\\fontencoding{LECO}\\selectfont\\char185": '\u0319', // COMBINING RIGHT TACK BELOW
	"\\fontencoding{LECO}\\selectfont\\char185{}": '\u0319', // COMBINING RIGHT TACK BELOW
	"\\fontencoding{LECO}\\selectfont\\char203": '\u032B', // COMBINING INVERTED DOUBLE ARCH BELOW
	"\\fontencoding{LECO}\\selectfont\\char203{}": '\u032B', // COMBINING INVERTED DOUBLE ARCH BELOW
	"\\fontencoding{LECO}\\selectfont\\char207": '\u032F', // COMBINING INVERTED BREVE BELOW
	"\\fontencoding{LECO}\\selectfont\\char207{}": '\u032F', // COMBINING INVERTED BREVE BELOW
	"\\fontencoding{LECO}\\selectfont\\char215": '\u0337', // COMBINING SHORT SOLIDUS OVERLAY
	"\\fontencoding{LECO}\\selectfont\\char215{}": '\u0337', // COMBINING SHORT SOLIDUS OVERLAY
	"\\fontencoding{LECO}\\selectfont\\char216": '\u0338', // COMBINING LONG SOLIDUS OVERLAY
	"\\fontencoding{LECO}\\selectfont\\char216{}": '\u0338', // COMBINING LONG SOLIDUS OVERLAY
	"\\fontencoding{LECO}\\selectfont\\char218": '\u033A', // COMBINING INVERTED BRIDGE BELOW
	"\\fontencoding{LECO}\\selectfont\\char218{}": '\u033A', // COMBINING INVERTED BRIDGE BELOW
	"\\fontencoding{LECO}\\selectfont\\char219": '\u033B', // COMBINING SQUARE BELOW
	"\\fontencoding{LECO}\\selectfont\\char219{}": '\u033B', // COMBINING SQUARE BELOW
	"\\fontencoding{LECO}\\selectfont\\char220": '\u033C', // COMBINING SEAGULL BELOW
	"\\fontencoding{LECO}\\selectfont\\char220{}": '\u033C', // COMBINING SEAGULL BELOW
	"\\fontencoding{LECO}\\selectfont\\char221": '\u033D', // COMBINING X ABOVE
	"\\fontencoding{LECO}\\selectfont\\char221{}": '\u033D', // COMBINING X ABOVE
	"\\fontencoding{LECO}\\selectfont\\char225": '\u0361', // COMBINING DOUBLE INVERTED BREVE
	"\\fontencoding{LECO}\\selectfont\\char225{}": '\u0361', // COMBINING DOUBLE INVERTED BREVE
	"\\fontencoding{LEIP}\\selectfont\\char202": '\u027F', // LATIN SMALL LETTER REVERSED R WITH FISHHOOK
	"\\fontencoding{LEIP}\\selectfont\\char202{}": '\u027F', // LATIN SMALL LETTER REVERSED R WITH FISHHOOK
	"\\fontencoding{LEIP}\\selectfont\\char61": '\u0258', // LATIN SMALL LETTER REVERSED E
	"\\fontencoding{LEIP}\\selectfont\\char61{}": '\u0258', // LATIN SMALL LETTER REVERSED E
	"\\fontencoding{LELA}\\selectfont\\char195": '\u01BA', // LATIN SMALL LETTER EZH WITH TAIL
	"\\fontencoding{LELA}\\selectfont\\char195{}": '\u01BA', // LATIN SMALL LETTER EZH WITH TAIL
	"\\fontencoding{LELA}\\selectfont\\char201": '\u013F', // LATIN CAPITAL LETTER L WITH MIDDLE DOT
	"\\fontencoding{LELA}\\selectfont\\char201{}": '\u013F', // LATIN CAPITAL LETTER L WITH MIDDLE DOT
	"\\fontencoding{LELA}\\selectfont\\char202": '\u0140', // LATIN SMALL LETTER L WITH MIDDLE DOT
	"\\fontencoding{LELA}\\selectfont\\char202{}": '\u0140', // LATIN SMALL LETTER L WITH MIDDLE DOT
	"\\fontencoding{LELA}\\selectfont\\char40": '\u0126', // LATIN CAPITAL LETTER H WITH STROKE
	"\\fontencoding{LELA}\\selectfont\\char40{}": '\u0126', // LATIN CAPITAL LETTER H WITH STROKE
	"\\fontencoding{LELA}\\selectfont\\char47": '\u0166', // LATIN CAPITAL LETTER T WITH STROKE
	"\\fontencoding{LELA}\\selectfont\\char47{}": '\u0166', // LATIN CAPITAL LETTER T WITH STROKE
	"\\fontencoding{LELA}\\selectfont\\char63": '\u0167', // LATIN SMALL LETTER T WITH STROKE
	"\\fontencoding{LELA}\\selectfont\\char63{}": '\u0167', // LATIN SMALL LETTER T WITH STROKE
	"\\fontencoding{LELA}\\selectfont\\char91": '\u0138', // LATIN SMALL LETTER KRA
	"\\fontencoding{LELA}\\selectfont\\char91{}": '\u0138', // LATIN SMALL LETTER KRA
	"\\forall": '\u2200', // FOR ALL
	"\\forall{}": '\u2200', // FOR ALL
	"\\forcesextra": '\u22A8', // TRUE
	"\\forcesextra{}": '\u22A8', // TRUE
	"\\forks": '\u2ADC', // FORKING
	"\\forksnot": '\u2ADD', // NONFORKING
	"\\forksnot{}": '\u2ADD', // NONFORKING
	"\\forks{}": '\u2ADC', // FORKING
	"\\forkv": '\u2AD9', // ELEMENT OF OPENING DOWNWARDS
	"\\forkv{}": '\u2AD9', // ELEMENT OF OPENING DOWNWARDS
	"\\fracslash": '\u2044', // # /, FRACTION SLASH
	"\\fracslash{}": '\u2044', // # /, FRACTION SLASH
	"\\frown": '\u2322', // FROWN
	"\\frownie": '\u2639', // = \sadface (arevmath), WHITE FROWNING FACE
	"\\frownie{}": '\u2639', // = \sadface (arevmath), WHITE FROWNING FACE
	"\\frown{}": '\u2322', // FROWN
	"\\fullouterjoin": '\u27D7', // FULL OUTER JOIN
	"\\fullouterjoin{}": '\u27D7', // FULL OUTER JOIN
	"\\gamma": '\u03B3', // GREEK SMALL LETTER GAMMA
	"\\gamma{}": '\u03B3', // GREEK SMALL LETTER GAMMA
	"\\gemini": '\u264A', // GEMINI
	"\\gemini{}": '\u264A', // GEMINI
	"\\geq": '\u2265', // GREATER-THAN OR EQUAL TO
	"\\geqq": '\u2267', // GREATER-THAN OVER EQUAL TO
	"\\geqqslant": '\u2AFA', // DOUBLE-LINE SLANTED GREATER-THAN OR EQUAL TO
	"\\geqqslant{}": '\u2AFA', // DOUBLE-LINE SLANTED GREATER-THAN OR EQUAL TO
	"\\geqq{}": '\u2267', // GREATER-THAN OVER EQUAL TO
	"\\geqslant": '\u2A7E', // GREATER-THAN OR SLANTED EQUAL TO
	"\\geqslant{}": '\u2A7E', // GREATER-THAN OR SLANTED EQUAL TO
	"\\geq{}": '\u2265', // GREATER-THAN OR EQUAL TO
	"\\gescc": '\u2AA9', // GREATER-THAN CLOSED BY CURVE ABOVE SLANTED EQUAL
	"\\gescc{}": '\u2AA9', // GREATER-THAN CLOSED BY CURVE ABOVE SLANTED EQUAL
	"\\gesdot": '\u2A80', // GREATER-THAN OR SLANTED EQUAL TO WITH DOT INSIDE
	"\\gesdoto": '\u2A82', // GREATER-THAN OR SLANTED EQUAL TO WITH DOT ABOVE
	"\\gesdotol": '\u2A84', // GREATER-THAN OR SLANTED EQUAL TO WITH DOT ABOVE LEFT
	"\\gesdotol{}": '\u2A84', // GREATER-THAN OR SLANTED EQUAL TO WITH DOT ABOVE LEFT
	"\\gesdoto{}": '\u2A82', // GREATER-THAN OR SLANTED EQUAL TO WITH DOT ABOVE
	"\\gesdot{}": '\u2A80', // GREATER-THAN OR SLANTED EQUAL TO WITH DOT INSIDE
	"\\gesles": '\u2A94', // GREATER-THAN ABOVE SLANTED EQUAL ABOVE LESS-THAN ABOVE SLANTED EQUAL
	"\\gesles{}": '\u2A94', // GREATER-THAN ABOVE SLANTED EQUAL ABOVE LESS-THAN ABOVE SLANTED EQUAL
	"\\gg": '\u226B', // MUCH GREATER-THAN
	"\\ggcurly": '\u2ABC', // DOUBLE SUCCEEDS
	"\\ggcurly{}": '\u2ABC', // DOUBLE SUCCEEDS
	"\\gggnest": '\u2AF8', // TRIPLE NESTED GREATER-THAN
	"\\gggnest{}": '\u2AF8', // TRIPLE NESTED GREATER-THAN
	"\\gg{}": '\u226B', // MUCH GREATER-THAN
	"\\gimel": '\u2137', // GIMEL SYMBOL
	"\\gimel{}": '\u2137', // GIMEL SYMBOL
	"\\glE": '\u2A92', // GREATER-THAN ABOVE LESS-THAN ABOVE DOUBLE-LINE EQUAL
	"\\glE{}": '\u2A92', // GREATER-THAN ABOVE LESS-THAN ABOVE DOUBLE-LINE EQUAL
	"\\gla": '\u2AA5', // GREATER-THAN BESIDE LESS-THAN
	"\\gla{}": '\u2AA5', // GREATER-THAN BESIDE LESS-THAN
	"\\gleichstark": '\u29E6', // GLEICH STARK
	"\\gleichstark{}": '\u29E6', // GLEICH STARK
	"\\glj": '\u2AA4', // GREATER-THAN OVERLAPPING LESS-THAN
	"\\glj{}": '\u2AA4', // GREATER-THAN OVERLAPPING LESS-THAN
	"\\gnapprox": '\u2A8A', // GREATER-THAN AND NOT APPROXIMATE
	"\\gnapprox{}": '\u2A8A', // GREATER-THAN AND NOT APPROXIMATE
	"\\gneq": '\u2A88', // GREATER-THAN AND SINGLE-LINE NOT EQUAL TO
	"\\gneqq": '\u2269', // GREATER-THAN BUT NOT EQUAL TO
	"\\gneqq{}": '\u2269', // GREATER-THAN BUT NOT EQUAL TO
	"\\gneq{}": '\u2A88', // GREATER-THAN AND SINGLE-LINE NOT EQUAL TO
	"\\gnsim": '\u22E7', // GREATER-THAN BUT NOT EQUIVALENT TO
	"\\gnsim{}": '\u22E7', // GREATER-THAN BUT NOT EQUIVALENT TO
	"\\greaterequivlnt": '\u2273', // GREATER-THAN OR EQUIVALENT TO
	"\\greaterequivlnt{}": '\u2273', // GREATER-THAN OR EQUIVALENT TO
	"\\gsime": '\u2A8E', // GREATER-THAN ABOVE SIMILAR OR EQUAL
	"\\gsime{}": '\u2A8E', // GREATER-THAN ABOVE SIMILAR OR EQUAL
	"\\gsiml": '\u2A90', // GREATER-THAN ABOVE SIMILAR ABOVE LESS-THAN
	"\\gsiml{}": '\u2A90', // GREATER-THAN ABOVE SIMILAR ABOVE LESS-THAN
	"\\gtcir": '\u2A7A', // GREATER-THAN WITH CIRCLE INSIDE
	"\\gtcir{}": '\u2A7A', // GREATER-THAN WITH CIRCLE INSIDE
	"\\gtquest": '\u2A7C', // GREATER-THAN WITH QUESTION MARK ABOVE
	"\\gtquest{}": '\u2A7C', // GREATER-THAN WITH QUESTION MARK ABOVE
	"\\gtrapprox": '\u2A86', // GREATER-THAN OR APPROXIMATE
	"\\gtrapprox{}": '\u2A86', // GREATER-THAN OR APPROXIMATE
	"\\gtrarr": '\u2978', // GREATER-THAN ABOVE RIGHTWARDS ARROW
	"\\gtrarr{}": '\u2978', // GREATER-THAN ABOVE RIGHTWARDS ARROW
	"\\gtrdot": '\u22D7', // GREATER-THAN WITH DOT
	"\\gtrdot{}": '\u22D7', // GREATER-THAN WITH DOT
	"\\gtreqless": '\u22DB', // GREATER-THAN EQUAL TO OR LESS-THAN
	"\\gtreqless{}": '\u22DB', // GREATER-THAN EQUAL TO OR LESS-THAN
	"\\gtreqqless": '\u2A8C', // GREATER-THAN ABOVE DOUBLE-LINE EQUAL ABOVE LESS-THAN
	"\\gtreqqless{}": '\u2A8C', // GREATER-THAN ABOVE DOUBLE-LINE EQUAL ABOVE LESS-THAN
	"\\gtrless": '\u2277', // GREATER-THAN OR LESS-THAN
	"\\gtrless{}": '\u2277', // GREATER-THAN OR LESS-THAN
	"\\guillemotleft": '\u00AB', // LEFT-POINTING DOUBLE ANGLE QUOTATION MARK
	"\\guillemotleft{}": '\u00AB', // LEFT-POINTING DOUBLE ANGLE QUOTATION MARK
	"\\guillemotright": '\u00BB', // RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK
	"\\guillemotright{}": '\u00BB', // RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK
	"\\guilsinglleft": '\u2039', // SINGLE LEFT-POINTING ANGLE QUOTATION MARK
	"\\guilsinglleft{}": '\u2039', // SINGLE LEFT-POINTING ANGLE QUOTATION MARK
	"\\guilsinglright": '\u203A', // SINGLE RIGHT-POINTING ANGLE QUOTATION MARK
	"\\guilsinglright{}": '\u203A', // SINGLE RIGHT-POINTING ANGLE QUOTATION MARK
	"\\harrowextender": '\u23AF', // HORIZONTAL LINE EXTENSION (used to extend arrows)
	"\\harrowextender{}": '\u23AF', // HORIZONTAL LINE EXTENSION (used to extend arrows)
	"\\hash": '\u22D5', // parallel, equal; equal or parallel
	"\\hash{}": '\u22D5', // parallel, equal; equal or parallel
	"\\hatapprox": '\u2A6F', // ALMOST EQUAL TO WITH CIRCUMFLEX ACCENT
	"\\hatapprox{}": '\u2A6F', // ALMOST EQUAL TO WITH CIRCUMFLEX ACCENT
	"\\heartsuit": '\u2661', // heart suit symbol
	"\\heartsuit{}": '\u2661', // heart suit symbol
	"\\hermitconjmatrix": '\u22B9', // HERMITIAN CONJUGATE MATRIX
	"\\hermitconjmatrix{}": '\u22B9', // HERMITIAN CONJUGATE MATRIX
	"\\hexagon": '\u2394', // horizontal benzene ring [hexagon flat open]
	"\\hexagonblack": '\u2B23', // HORIZONTAL BLACK HEXAGON
	"\\hexagonblack{}": '\u2B23', // HORIZONTAL BLACK HEXAGON
	"\\hexagon{}": '\u2394', // horizontal benzene ring [hexagon flat open]
	"\\homothetic": '\u223B', // HOMOTHETIC
	"\\homothetic{}": '\u223B', // HOMOTHETIC
	"\\hookleftarrow": '\u21A9', // LEFTWARDS ARROW WITH HOOK
	"\\hookleftarrow{}": '\u21A9', // LEFTWARDS ARROW WITH HOOK
	"\\hookrightarrow": '\u21AA', // RIGHTWARDS ARROW WITH HOOK
	"\\hookrightarrow{}": '\u21AA', // RIGHTWARDS ARROW WITH HOOK
	"\\hourglass": '\u29D6', // WHITE HOURGLASS
	"\\hourglass{}": '\u29D6', // WHITE HOURGLASS
	"\\house": '\u2302', // HOUSE
	"\\house{}": '\u2302', // HOUSE
	"\\hphantom{,}": '\u2008', // PUNCTUATION SPACE
	"\\hphantom{0}": '\u2007', // FIGURE SPACE
	"\\hrectangleblack": '\u25AC', // BLACK RECTANGLE
	"\\hrectangleblack{}": '\u25AC', // BLACK RECTANGLE
	"\\hslash": '\u210F', // PLANCK CONSTANT OVER TWO PI
	"\\hslash{}": '\u210F', // PLANCK CONSTANT OVER TWO PI
	"\\hspace{0.166em}": '\u2006', // SIX-PER-EM SPACE
	"\\hspace{0.167em}": '\u2009', // THIN SPACE
	"\\hspace{0.25em}": '\u2005', // FOUR-PER-EM SPACE
	"\\hspace{0.33em}": '\u2004', // THREE-PER-EM SPACE
	"\\hspace{0.6em}": '\u2002', // EN SPACE
	"\\hspace{0pt}": '\u200B',
	"\\hspace{1em}": '\u2003', // EM SPACE
	"\\hyphenbullet": '\u2043', // rectangle, filled (HYPHEN BULLET)
	"\\hyphenbullet{}": '\u2043', // rectangle, filled (HYPHEN BULLET)
	"\\hzigzag": '\u3030', // zigzag
	"\\hzigzag{}": '\u3030', // zigzag
	"\\i": '\u0131', // LATIN SMALL LETTER DOTLESS I
	"\\iiiint": '\u2A0C', // QUADRUPLE INTEGRAL OPERATOR
	"\\iiiint{}": '\u2A0C', // QUADRUPLE INTEGRAL OPERATOR
	"\\image": '\u22B7', // IMAGE OF
	"\\image{}": '\u22B7', // IMAGE OF
	"\\imath": '\uD835\uDEA4', // MATHEMATICAL ITALIC SMALL DOTLESS I
	"\\imath{}": '\uD835\uDEA4', // MATHEMATICAL ITALIC SMALL DOTLESS I
	"\\in": '\u2208', // ELEMENT OF
	"\\increment": '\u2206', // # \mathrm{\Delta}, laplacian (Delta; nabla square)
	"\\increment{}": '\u2206', // # \mathrm{\Delta}, laplacian (Delta; nabla square)
	"\\infty": '\u221E', // INFINITY
	"\\infty{}": '\u221E', // INFINITY
	"\\int": '\u222B', // INTEGRAL
	"\\intBar": '\u2A0E', // INTEGRAL WITH DOUBLE STROKE
	"\\intBar{}": '\u2A0E', // INTEGRAL WITH DOUBLE STROKE
	"\\int\\!\\int": '\u222C', // DOUBLE INTEGRAL
	"\\int\\!\\int\\!\\int": '\u222D', // TRIPLE INTEGRAL
	"\\int\\!\\int\\!\\int{}": '\u222D', // TRIPLE INTEGRAL
	"\\int\\!\\int{}": '\u222C', // DOUBLE INTEGRAL
	"\\intbottom": '\u2321', // BOTTOM HALF INTEGRAL
	"\\intbottom{}": '\u2321', // BOTTOM HALF INTEGRAL
	"\\intcap": '\u2A19', // INTEGRAL WITH INTERSECTION
	"\\intcap{}": '\u2A19', // INTEGRAL WITH INTERSECTION
	"\\intcup": '\u2A1A', // INTEGRAL WITH UNION
	"\\intcup{}": '\u2A1A', // INTEGRAL WITH UNION
	"\\intercal": '\u22BA', // INTERCALATE
	"\\intercal{}": '\u22BA', // INTERCALATE
	"\\interleave": '\u2AF4', // TRIPLE VERTICAL BAR BINARY RELATION
	"\\interleave{}": '\u2AF4', // TRIPLE VERTICAL BAR BINARY RELATION
	"\\intextender": '\u23AE', // INTEGRAL EXTENSION
	"\\intextender{}": '\u23AE', // INTEGRAL EXTENSION
	"\\intlarhk": '\u2A17', // INTEGRAL WITH LEFTWARDS ARROW WITH HOOK
	"\\intlarhk{}": '\u2A17', // INTEGRAL WITH LEFTWARDS ARROW WITH HOOK
	"\\intprodr": '\u2A3D', // RIGHTHAND INTERIOR PRODUCT
	"\\intprodr{}": '\u2A3D', // RIGHTHAND INTERIOR PRODUCT
	"\\inttop": '\u2320', // TOP HALF INTEGRAL
	"\\inttop{}": '\u2320', // TOP HALF INTEGRAL
	"\\intx": '\u2A18', // INTEGRAL WITH TIMES SIGN
	"\\intx{}": '\u2A18', // INTEGRAL WITH TIMES SIGN
	"\\int{}": '\u222B', // INTEGRAL
	"\\invamp": '\u214B', // # \bindnasrepma (stmaryrd), TURNED AMPERSAND
	"\\invamp{}": '\u214B', // # \bindnasrepma (stmaryrd), TURNED AMPERSAND
	"\\inversewhitecircle": '\u25D9', // INVERSE WHITE CIRCLE
	"\\inversewhitecircle{}": '\u25D9', // INVERSE WHITE CIRCLE
	"\\invneg": '\u2310', // reverse not
	"\\invneg{}": '\u2310', // reverse not
	"\\invwhitelowerhalfcircle": '\u25DB', // LOWER HALF INVERSE WHITE CIRCLE
	"\\invwhitelowerhalfcircle{}": '\u25DB', // LOWER HALF INVERSE WHITE CIRCLE
	"\\invwhiteupperhalfcircle": '\u25DA', // UPPER HALF INVERSE WHITE CIRCLE
	"\\invwhiteupperhalfcircle{}": '\u25DA', // UPPER HALF INVERSE WHITE CIRCLE
	"\\in{}": '\u2208', // ELEMENT OF
	"\\iota": '\u03B9', // GREEK SMALL LETTER IOTA
	"\\iota{}": '\u03B9', // GREEK SMALL LETTER IOTA
	"\\isinE": '\u22F9', // ELEMENT OF WITH TWO HORIZONTAL STROKES
	"\\isinE{}": '\u22F9', // ELEMENT OF WITH TWO HORIZONTAL STROKES
	"\\isindot": '\u22F5', // ELEMENT OF WITH DOT ABOVE
	"\\isindot{}": '\u22F5', // ELEMENT OF WITH DOT ABOVE
	"\\isinobar": '\u22F7', // SMALL ELEMENT OF WITH OVERBAR
	"\\isinobar{}": '\u22F7', // SMALL ELEMENT OF WITH OVERBAR
	"\\isins": '\u22F4', // SMALL ELEMENT OF WITH VERTICAL BAR AT END OF HORIZONTAL STROKE
	"\\isins{}": '\u22F4', // SMALL ELEMENT OF WITH VERTICAL BAR AT END OF HORIZONTAL STROKE
	"\\isinvb": '\u22F8', // ELEMENT OF WITH UNDERBAR
	"\\isinvb{}": '\u22F8', // ELEMENT OF WITH UNDERBAR
	"\\i{}": '\u0131', // LATIN SMALL LETTER DOTLESS I
	"\\jmath": '\u0237', // jmath
	"\\jmath{}": '\u0237', // jmath
	"\\jupiter": '\u2643', // JUPITER
	"\\jupiter{}": '\u2643', // JUPITER
	"\\k": '\u02DB', // OGONEK
	"\\kappa": '\u03BA', // GREEK SMALL LETTER KAPPA
	"\\kappa{}": '\u03BA', // GREEK SMALL LETTER KAPPA
	"\\koppa": '\u03DF', // GREEK SMALL LETTER KOPPA
	"\\koppa{}": '\u03DF', // GREEK SMALL LETTER KOPPA
	"\\k{A}": '\u0104', // LATIN CAPITAL LETTER A WITH OGONEK
	"\\k{E}": '\u0118', // LATIN CAPITAL LETTER E WITH OGONEK
	"\\k{I}": '\u012E', // LATIN CAPITAL LETTER I WITH OGONEK
	"\\k{U}": '\u0172', // LATIN CAPITAL LETTER U WITH OGONEK
	"\\k{a}": '\u0105', // LATIN SMALL LETTER A WITH OGONEK
	"\\k{e}": '\u0119', // LATIN SMALL LETTER E WITH OGONEK
	"\\k{i}": '\u012F', // LATIN SMALL LETTER I WITH OGONEK
	"\\k{u}": '\u0173', // LATIN SMALL LETTER U WITH OGONEK
	"\\k{}": '\u02DB', // OGONEK
	"\\l": '\u0142', // LATIN SMALL LETTER L WITH STROKE
	"\\lBrace": '\u2983', // LEFT WHITE CURLY BRACKET
	"\\lBrace{}": '\u2983', // LEFT WHITE CURLY BRACKET
	"\\lambda": '\u03BB', // GREEK SMALL LETTER LAMDA
	"\\lambda{}": '\u03BB', // GREEK SMALL LETTER LAMDA
	"\\lang": '\u27EA', // MATHEMATICAL LEFT DOUBLE ANGLE BRACKET, z notation left chevron bracket
	"\\langle": '\u2329', // LEFT-POINTING ANGLE BRACKET
	"\\langledot": '\u2991', // LEFT ANGLE BRACKET WITH DOT
	"\\langledot{}": '\u2991', // LEFT ANGLE BRACKET WITH DOT
	"\\langle{}": '\u2329', // LEFT-POINTING ANGLE BRACKET
	"\\lang{}": '\u27EA', // MATHEMATICAL LEFT DOUBLE ANGLE BRACKET, z notation left chevron bracket
	"\\laplac": '\u29E0', // SQUARE WITH CONTOURED OUTLINE
	"\\laplac{}": '\u29E0', // SQUARE WITH CONTOURED OUTLINE
	"\\lat": '\u2AAB', // LARGER THAN
	"\\late": '\u2AAD', // LARGER THAN OR EQUAL TO
	"\\late{}": '\u2AAD', // LARGER THAN OR EQUAL TO
	"\\lat{}": '\u2AAB', // LARGER THAN
	"\\lazysinv": '\u223E', // INVERTED LAZY S
	"\\lazysinv{}": '\u223E', // INVERTED LAZY S
	"\\lblkbrbrak": '\u2997', // LEFT BLACK TORTOISE SHELL BRACKET
	"\\lblkbrbrak{}": '\u2997', // LEFT BLACK TORTOISE SHELL BRACKET
	"\\lblot": '\u2989', // Z NOTATION LEFT BINDING BRACKET
	"\\lblot{}": '\u2989', // Z NOTATION LEFT BINDING BRACKET
	"\\lbrace": '{', // LEFT CURLY BRACKET
	"\\lbracelend": '\u23A9', // LEFT CURLY BRACKET LOWER HOOK
	"\\lbracelend{}": '\u23A9', // LEFT CURLY BRACKET LOWER HOOK
	"\\lbracemid": '\u23A8', // LEFT CURLY BRACKET MIDDLE PIECE
	"\\lbracemid{}": '\u23A8', // LEFT CURLY BRACKET MIDDLE PIECE
	"\\lbraceuend": '\u23A7', // LEFT CURLY BRACKET UPPER HOOK
	"\\lbraceuend{}": '\u23A7', // LEFT CURLY BRACKET UPPER HOOK
	"\\lbrace{}": '{', // LEFT CURLY BRACKET
	"\\lbrackextender": '\u23A2', // LEFT SQUARE BRACKET EXTENSION
	"\\lbrackextender{}": '\u23A2', // LEFT SQUARE BRACKET EXTENSION
	"\\lbracklltick": '\u298F', // LEFT SQUARE BRACKET WITH TICK IN BOTTOM CORNER
	"\\lbracklltick{}": '\u298F', // LEFT SQUARE BRACKET WITH TICK IN BOTTOM CORNER
	"\\lbrackubar": '\u298B', // LEFT SQUARE BRACKET WITH UNDERBAR
	"\\lbrackubar{}": '\u298B', // LEFT SQUARE BRACKET WITH UNDERBAR
	"\\lbrackuend": '\u23A1', // LEFT SQUARE BRACKET UPPER CORNER
	"\\lbrackuend{}": '\u23A1', // LEFT SQUARE BRACKET UPPER CORNER
	"\\lbrackultick": '\u298D', // LEFT SQUARE BRACKET WITH TICK IN TOP CORNER
	"\\lbrackultick{}": '\u298D', // LEFT SQUARE BRACKET WITH TICK IN TOP CORNER
	"\\lbrbrak": '\u2772', // LIGHT LEFT TORTOISE SHELL BRACKET ORNAMENT
	"\\lbrbrak{}": '\u2772', // LIGHT LEFT TORTOISE SHELL BRACKET ORNAMENT
	"\\lceil": '\u2308', // LEFT CEILING
	"\\lceil{}": '\u2308', // LEFT CEILING
	"\\lcurvyangle": '\u29FC', // left pointing curved angle bracket
	"\\lcurvyangle{}": '\u29FC', // left pointing curved angle bracket
	"\\ldots": '\u2026', // HORIZONTAL ELLIPSIS
	"\\ldots{}": '\u2026', // HORIZONTAL ELLIPSIS
	"\\leftarrow": '\u2190', // LEFTWARDS ARROW
	"\\leftarrowapprox": '\u2B4A', // LEFTWARDS ARROW ABOVE ALMOST EQUAL TO
	"\\leftarrowapprox{}": '\u2B4A', // LEFTWARDS ARROW ABOVE ALMOST EQUAL TO
	"\\leftarrowbackapprox": '\u2B42', // LEFTWARDS ARROW ABOVE REVERSE ALMOST EQUAL TO
	"\\leftarrowbackapprox{}": '\u2B42', // LEFTWARDS ARROW ABOVE REVERSE ALMOST EQUAL TO
	"\\leftarrowbsimilar": '\u2B4B', // LEFTWARDS ARROW ABOVE REVERSE TILDE OPERATOR
	"\\leftarrowbsimilar{}": '\u2B4B', // LEFTWARDS ARROW ABOVE REVERSE TILDE OPERATOR
	"\\leftarrowless": '\u2977', // LEFTWARDS ARROW THROUGH LESS-THAN
	"\\leftarrowless{}": '\u2977', // LEFTWARDS ARROW THROUGH LESS-THAN
	"\\leftarrowonoplus": '\u2B32', // LEFT ARROW WITH CIRCLED PLUS
	"\\leftarrowonoplus{}": '\u2B32', // LEFT ARROW WITH CIRCLED PLUS
	"\\leftarrowplus": '\u2946', // LEFTWARDS ARROW WITH PLUS BELOW
	"\\leftarrowplus{}": '\u2946', // LEFTWARDS ARROW WITH PLUS BELOW
	"\\leftarrowshortrightarrow": '\u2943', // LEFTWARDS ARROW ABOVE SHORT RIGHTWARDS ARROW
	"\\leftarrowshortrightarrow{}": '\u2943', // LEFTWARDS ARROW ABOVE SHORT RIGHTWARDS ARROW
	"\\leftarrowsimilar": '\u2973', // LEFTWARDS ARROW ABOVE TILDE OPERATOR
	"\\leftarrowsimilar{}": '\u2973', // LEFTWARDS ARROW ABOVE TILDE OPERATOR
	"\\leftarrowsubset": '\u297A', // LEFTWARDS ARROW THROUGH SUBSET
	"\\leftarrowsubset{}": '\u297A', // LEFTWARDS ARROW THROUGH SUBSET
	"\\leftarrowtail": '\u21A2', // LEFTWARDS ARROW WITH TAIL
	"\\leftarrowtail{}": '\u21A2', // LEFTWARDS ARROW WITH TAIL
	"\\leftarrowtriangle": '\u21FD', // LEFTWARDS OPEN-HEADED ARROW
	"\\leftarrowtriangle{}": '\u21FD', // LEFTWARDS OPEN-HEADED ARROW
	"\\leftarrowx": '\u2B3E', // LEFTWARDS ARROW THROUGH X
	"\\leftarrowx{}": '\u2B3E', // LEFTWARDS ARROW THROUGH X
	"\\leftarrow{}": '\u2190', // LEFTWARDS ARROW
	"\\leftbarharpoon": '\u296A', // LEFTWARDS HARPOON WITH BARB UP ABOVE LONG DASH
	"\\leftbarharpoon{}": '\u296A', // LEFTWARDS HARPOON WITH BARB UP ABOVE LONG DASH
	"\\leftbkarrow": '\u290C', // LEFTWARDS DOUBLE DASH ARROW
	"\\leftbkarrow{}": '\u290C', // LEFTWARDS DOUBLE DASH ARROW
	"\\leftcurvedarrow": '\u2B3F', // WAVE ARROW POINTING DIRECTLY LEFT
	"\\leftcurvedarrow{}": '\u2B3F', // WAVE ARROW POINTING DIRECTLY LEFT
	"\\leftdbkarrow": '\u290E', // LEFTWARDS TRIPLE DASH ARROW
	"\\leftdbkarrow{}": '\u290E', // LEFTWARDS TRIPLE DASH ARROW
	"\\leftdbltail": '\u291B', // LEFTWARDS DOUBLE ARROW-TAIL
	"\\leftdbltail{}": '\u291B', // LEFTWARDS DOUBLE ARROW-TAIL
	"\\leftdotarrow": '\u2B38', // LEFTWARDS ARROW WITH DOTTED STEM
	"\\leftdotarrow{}": '\u2B38', // LEFTWARDS ARROW WITH DOTTED STEM
	"\\leftharpoondown": '\u21BD', // LEFTWARDS HARPOON WITH BARB DOWNWARDS
	"\\leftharpoondown{}": '\u21BD', // LEFTWARDS HARPOON WITH BARB DOWNWARDS
	"\\leftharpoonup": '\u21BC', // LEFTWARDS HARPOON WITH BARB UPWARDS
	"\\leftharpoonup{}": '\u21BC', // LEFTWARDS HARPOON WITH BARB UPWARDS
	"\\leftleftarrows": '\u21C7', // LEFTWARDS PAIRED ARROWS
	"\\leftleftarrows{}": '\u21C7', // LEFTWARDS PAIRED ARROWS
	"\\leftleftharpoons": '\u2962', // LEFTWARDS HARPOON WITH BARB UP ABOVE LEFTWARDS HARPOON WITH BARB DOWN
	"\\leftleftharpoons{}": '\u2962', // LEFTWARDS HARPOON WITH BARB UP ABOVE LEFTWARDS HARPOON WITH BARB DOWN
	"\\leftouterjoin": '\u27D5', // LEFT OUTER JOIN
	"\\leftouterjoin{}": '\u27D5', // LEFT OUTER JOIN
	"\\leftrightarrow": '\u2194', // LEFT RIGHT ARROW
	"\\leftrightarrowcircle": '\u2948', // LEFT RIGHT ARROW THROUGH SMALL CIRCLE
	"\\leftrightarrowcircle{}": '\u2948', // LEFT RIGHT ARROW THROUGH SMALL CIRCLE
	"\\leftrightarrows": '\u21C6', // LEFTWARDS ARROW OVER RIGHTWARDS ARROW
	"\\leftrightarrows{}": '\u21C6', // LEFTWARDS ARROW OVER RIGHTWARDS ARROW
	"\\leftrightarrowtriangle": '\u21FF', // LEFT RIGHT OPEN-HEADED ARROW
	"\\leftrightarrowtriangle{}": '\u21FF', // LEFT RIGHT OPEN-HEADED ARROW
	"\\leftrightarrow{}": '\u2194', // LEFT RIGHT ARROW
	"\\leftrightharpoon": '\u294A', // LEFT BARB UP RIGHT BARB DOWN HARPOON
	"\\leftrightharpoons": '\u21CB', // LEFTWARDS HARPOON OVER RIGHTWARDS HARPOON
	"\\leftrightharpoonsdown": '\u2967', // LEFTWARDS HARPOON WITH BARB DOWN ABOVE RIGHTWARDS HARPOON WITH BARB DOWN
	"\\leftrightharpoonsdown{}": '\u2967', // LEFTWARDS HARPOON WITH BARB DOWN ABOVE RIGHTWARDS HARPOON WITH BARB DOWN
	"\\leftrightharpoonsup": '\u2966', // LEFTWARDS HARPOON WITH BARB UP ABOVE RIGHTWARDS HARPOON WITH BARB UP
	"\\leftrightharpoonsup{}": '\u2966', // LEFTWARDS HARPOON WITH BARB UP ABOVE RIGHTWARDS HARPOON WITH BARB UP
	"\\leftrightharpoons{}": '\u21CB', // LEFTWARDS HARPOON OVER RIGHTWARDS HARPOON
	"\\leftrightharpoon{}": '\u294A', // LEFT BARB UP RIGHT BARB DOWN HARPOON
	"\\leftrightsquigarrow": '\u21AD', // LEFT RIGHT WAVE ARROW
	"\\leftrightsquigarrow{}": '\u21AD', // LEFT RIGHT WAVE ARROW
	"\\leftslice": '\u2AA6', // LESS-THAN CLOSED BY CURVE
	"\\leftslice{}": '\u2AA6', // LESS-THAN CLOSED BY CURVE
	"\\leftsquigarrow": '\u21DC', // LEFTWARDS SQUIGGLE ARROW
	"\\leftsquigarrow{}": '\u21DC', // LEFTWARDS SQUIGGLE ARROW
	"\\lefttail": '\u2919', // LEFTWARDS ARROW-TAIL
	"\\lefttail{}": '\u2919', // LEFTWARDS ARROW-TAIL
	"\\leftthreearrows": '\u2B31', // THREE LEFTWARDS ARROWS
	"\\leftthreearrows{}": '\u2B31', // THREE LEFTWARDS ARROWS
	"\\leftthreetimes": '\u22CB', // LEFT SEMIDIRECT PRODUCT
	"\\leftthreetimes{}": '\u22CB', // LEFT SEMIDIRECT PRODUCT
	"\\leftwhitearrow": '\u21E6', // LEFTWARDS WHITE ARROW
	"\\leftwhitearrow{}": '\u21E6', // LEFTWARDS WHITE ARROW
	"\\leo": '\u264C', // LEO
	"\\leo{}": '\u264C', // LEO
	"\\leq": '\u2264', // LESS-THAN OR EQUAL TO
	"\\leqq": '\u2266', // LESS-THAN OVER EQUAL TO
	"\\leqqslant": '\u2AF9', // DOUBLE-LINE SLANTED LESS-THAN OR EQUAL TO
	"\\leqqslant{}": '\u2AF9', // DOUBLE-LINE SLANTED LESS-THAN OR EQUAL TO
	"\\leqq{}": '\u2266', // LESS-THAN OVER EQUAL TO
	"\\leqslant": '\u2A7D', // LESS-THAN OR SLANTED EQUAL TO
	"\\leqslant{}": '\u2A7D', // LESS-THAN OR SLANTED EQUAL TO
	"\\leq{}": '\u2264', // LESS-THAN OR EQUAL TO
	"\\lescc": '\u2AA8', // LESS-THAN CLOSED BY CURVE ABOVE SLANTED EQUAL
	"\\lescc{}": '\u2AA8', // LESS-THAN CLOSED BY CURVE ABOVE SLANTED EQUAL
	"\\lesdot": '\u2A7F', // LESS-THAN OR SLANTED EQUAL TO WITH DOT INSIDE
	"\\lesdoto": '\u2A81', // LESS-THAN OR SLANTED EQUAL TO WITH DOT ABOVE
	"\\lesdotor": '\u2A83', // LESS-THAN OR SLANTED EQUAL TO WITH DOT ABOVE RIGHT
	"\\lesdotor{}": '\u2A83', // LESS-THAN OR SLANTED EQUAL TO WITH DOT ABOVE RIGHT
	"\\lesdoto{}": '\u2A81', // LESS-THAN OR SLANTED EQUAL TO WITH DOT ABOVE
	"\\lesdot{}": '\u2A7F', // LESS-THAN OR SLANTED EQUAL TO WITH DOT INSIDE
	"\\lesges": '\u2A93', // LESS-THAN ABOVE SLANTED EQUAL ABOVE GREATER-THAN ABOVE SLANTED EQUAL
	"\\lesges{}": '\u2A93', // LESS-THAN ABOVE SLANTED EQUAL ABOVE GREATER-THAN ABOVE SLANTED EQUAL
	"\\lessapprox": '\u2A85', // LESS-THAN OR APPROXIMATE
	"\\lessapprox{}": '\u2A85', // LESS-THAN OR APPROXIMATE
	"\\lessdot": '\u22D6', // LESS-THAN WITH DOT
	"\\lessdot{}": '\u22D6', // LESS-THAN WITH DOT
	"\\lesseqgtr": '\u22DA', // LESS-THAN EQUAL TO OR GREATER-THAN
	"\\lesseqgtr{}": '\u22DA', // LESS-THAN EQUAL TO OR GREATER-THAN
	"\\lesseqqgtr": '\u2A8B', // LESS-THAN ABOVE DOUBLE-LINE EQUAL ABOVE GREATER-THAN
	"\\lesseqqgtr{}": '\u2A8B', // LESS-THAN ABOVE DOUBLE-LINE EQUAL ABOVE GREATER-THAN
	"\\lessequivlnt": '\u2272', // LESS-THAN OR EQUIVALENT TO
	"\\lessequivlnt{}": '\u2272', // LESS-THAN OR EQUIVALENT TO
	"\\lessgtr": '\u2276', // LESS-THAN OR GREATER-THAN
	"\\lessgtr{}": '\u2276', // LESS-THAN OR GREATER-THAN
	"\\lfbowtie": '\u29D1', // left black bowtie
	"\\lfbowtie{}": '\u29D1', // left black bowtie
	"\\lfloor": '\u230A', // LEFT FLOOR
	"\\lfloor{}": '\u230A', // LEFT FLOOR
	"\\lftimes": '\u29D4', // left black times
	"\\lftimes{}": '\u29D4', // left black times
	"\\lgE": '\u2A91', // LESS-THAN ABOVE GREATER-THAN ABOVE DOUBLE-LINE EQUAL
	"\\lgE{}": '\u2A91', // LESS-THAN ABOVE GREATER-THAN ABOVE DOUBLE-LINE EQUAL
	"\\lgblkcircle": '\u2B24', // BLACK LARGE CIRCLE
	"\\lgblkcircle{}": '\u2B24', // BLACK LARGE CIRCLE
	"\\lgroup": '\u27EE', // MATHEMATICAL LEFT FLATTENED PARENTHESIS
	"\\lgroup{}": '\u27EE', // MATHEMATICAL LEFT FLATTENED PARENTHESIS
	"\\lhd": '\u25C1', // = \dres (oz), = \LeftTriangle (wrisym), (large) left triangle, open; z notation domain restriction
	"\\lhd{}": '\u25C1', // = \dres (oz), = \LeftTriangle (wrisym), (large) left triangle, open; z notation domain restriction
	"\\libra": '\u264E', // LIBRA
	"\\libra{}": '\u264E', // LIBRA
	"\\lightning": '\u21AF', // t \Lightning (marvosym), DOWNWARDS ZIGZAG ARROW
	"\\lightning{}": '\u21AF', // t \Lightning (marvosym), DOWNWARDS ZIGZAG ARROW
	"\\limg": '\u2987', // = \llparenthesis (stmaryrd), Z NOTATION LEFT IMAGE BRACKET
	"\\limg{}": '\u2987', // = \llparenthesis (stmaryrd), Z NOTATION LEFT IMAGE BRACKET
	"\\linefeed": '\u21B4', // RIGHTWARDS ARROW WITH CORNER DOWNWARDS
	"\\linefeed{}": '\u21B4', // RIGHTWARDS ARROW WITH CORNER DOWNWARDS
	"\\ll": '\u226A', // MUCH LESS-THAN
	"\\llarc": '\u25DF', // LOWER LEFT QUADRANT CIRCULAR ARC
	"\\llarc{}": '\u25DF', // LOWER LEFT QUADRANT CIRCULAR ARC
	"\\llblacktriangle": '\u25E3', // lower left triangle, filled
	"\\llblacktriangle{}": '\u25E3', // lower left triangle, filled
	"\\llbracket": '\u27E6', // = \Lbrack (mathbbol), = \lbag (oz -stmaryrd), MATHEMATICAL LEFT WHITE SQUARE BRACKET
	"\\llbracket{}": '\u27E6', // = \Lbrack (mathbbol), = \lbag (oz -stmaryrd), MATHEMATICAL LEFT WHITE SQUARE BRACKET
	"\\llcorner": '\u231E', // BOTTOM LEFT CORNER
	"\\llcorner{}": '\u231E', // BOTTOM LEFT CORNER
	"\\llcurly": '\u2ABB', // DOUBLE PRECEDES
	"\\llcurly{}": '\u2ABB', // DOUBLE PRECEDES
	"\\lllnest": '\u2AF7', // TRIPLE NESTED LESS-THAN
	"\\lllnest{}": '\u2AF7', // TRIPLE NESTED LESS-THAN
	"\\lltriangle": '\u25FA', // LOWER LEFT TRIANGLE
	"\\lltriangle{}": '\u25FA', // LOWER LEFT TRIANGLE
	"\\ll{}": '\u226A', // MUCH LESS-THAN
	"\\lmoustache": '\u23B0', // UPPER LEFT OR LOWER RIGHT CURLY BRACKET SECTION
	"\\lmoustache{}": '\u23B0', // UPPER LEFT OR LOWER RIGHT CURLY BRACKET SECTION
	"\\lnapprox": '\u2A89', // LESS-THAN AND NOT APPROXIMATE
	"\\lnapprox{}": '\u2A89', // LESS-THAN AND NOT APPROXIMATE
	"\\lneq": '\u2A87', // LESS-THAN AND SINGLE-LINE NOT EQUAL TO
	"\\lneqq": '\u2268', // LESS-THAN BUT NOT EQUAL TO
	"\\lneqq{}": '\u2268', // LESS-THAN BUT NOT EQUAL TO
	"\\lneq{}": '\u2A87', // LESS-THAN AND SINGLE-LINE NOT EQUAL TO
	"\\lnot": '\u00AC', // NOT SIGN
	"\\lnot{}": '\u00AC', // NOT SIGN
	"\\lnsim": '\u22E6', // LESS-THAN BUT NOT EQUIVALENT TO
	"\\lnsim{}": '\u22E6', // LESS-THAN BUT NOT EQUIVALENT TO
	"\\longdashv": '\u27DE', // long right tack
	"\\longdashv{}": '\u27DE', // long right tack
	"\\longdivision": '\u27CC', // LONG DIVISION
	"\\longdivision{}": '\u27CC', // LONG DIVISION
	"\\longleftarrow": '\u27F5', // LONG LEFTWARDS ARROW
	"\\longleftarrow{}": '\u27F5', // LONG LEFTWARDS ARROW
	"\\longleftrightarrow": '\u27F7', // LONG LEFT RIGHT ARROW
	"\\longleftrightarrow{}": '\u27F7', // LONG LEFT RIGHT ARROW
	"\\longleftsquigarrow": '\u2B33', // LONG LEFTWARDS SQUIGGLE ARROW
	"\\longleftsquigarrow{}": '\u2B33', // LONG LEFTWARDS SQUIGGLE ARROW
	"\\longmapsfrom": '\u27FB', // = \longmappedfrom (kpfonts), LONG LEFTWARDS ARROW FROM BAR
	"\\longmapsfrom{}": '\u27FB', // = \longmappedfrom (kpfonts), LONG LEFTWARDS ARROW FROM BAR
	"\\longmapsto": '\u27FC', // LONG RIGHTWARDS ARROW FROM BAR
	"\\longmapsto{}": '\u27FC', // LONG RIGHTWARDS ARROW FROM BAR
	"\\longrightarrow": '\u27F6', // LONG RIGHTWARDS ARROW
	"\\longrightarrow{}": '\u27F6', // LONG RIGHTWARDS ARROW
	"\\looparrowleft": '\u21AB', // LEFTWARDS ARROW WITH LOOP
	"\\looparrowleft{}": '\u21AB', // LEFTWARDS ARROW WITH LOOP
	"\\looparrowright": '\u21AC', // RIGHTWARDS ARROW WITH LOOP
	"\\looparrowright{}": '\u21AC', // RIGHTWARDS ARROW WITH LOOP
	"\\lowint": '\u2A1C', // INTEGRAL WITH UNDERBAR
	"\\lowint{}": '\u2A1C', // INTEGRAL WITH UNDERBAR
	"\\lozenge": '\u25CA', // LOZENGE
	"\\lozengeminus": '\u27E0', // LOZENGE DIVIDED BY HORIZONTAL RULE
	"\\lozengeminus{}": '\u27E0', // LOZENGE DIVIDED BY HORIZONTAL RULE
	"\\lozenge{}": '\u25CA', // LOZENGE
	"\\lparenextender": '\u239C', // LEFT PARENTHESIS EXTENSION
	"\\lparenextender{}": '\u239C', // LEFT PARENTHESIS EXTENSION
	"\\lparenlend": '\u239D', // LEFT PARENTHESIS LOWER HOOK
	"\\lparenlend{}": '\u239D', // LEFT PARENTHESIS LOWER HOOK
	"\\lparenuend": '\u239B', // LEFT PARENTHESIS UPPER HOOK
	"\\lparenuend{}": '\u239B', // LEFT PARENTHESIS UPPER HOOK
	"\\lrarc": '\u25DE', // LOWER RIGHT QUADRANT CIRCULAR ARC
	"\\lrarc{}": '\u25DE', // LOWER RIGHT QUADRANT CIRCULAR ARC
	"\\lrblacktriangle": '\u25E2', // lower right triangle, filled
	"\\lrblacktriangle{}": '\u25E2', // lower right triangle, filled
	"\\lrcorner": '\u231F', // BOTTOM RIGHT CORNER
	"\\lrcorner{}": '\u231F', // BOTTOM RIGHT CORNER
	"\\lrtriangle": '\u25FF', // LOWER RIGHT TRIANGLE
	"\\lrtriangleeq": '\u29E1', // INCREASES AS
	"\\lrtriangleeq{}": '\u29E1', // INCREASES AS
	"\\lrtriangle{}": '\u25FF', // LOWER RIGHT TRIANGLE
	"\\lsime": '\u2A8D', // LESS-THAN ABOVE SIMILAR OR EQUAL
	"\\lsime{}": '\u2A8D', // LESS-THAN ABOVE SIMILAR OR EQUAL
	"\\lsimg": '\u2A8F', // LESS-THAN ABOVE SIMILAR ABOVE GREATER-THAN
	"\\lsimg{}": '\u2A8F', // LESS-THAN ABOVE SIMILAR ABOVE GREATER-THAN
	"\\lsqhook": '\u2ACD', // SQUARE LEFT OPEN BOX OPERATOR
	"\\lsqhook{}": '\u2ACD', // SQUARE LEFT OPEN BOX OPERATOR
	"\\ltcir": '\u2A79', // LESS-THAN WITH CIRCLE INSIDE
	"\\ltcir{}": '\u2A79', // LESS-THAN WITH CIRCLE INSIDE
	"\\ltimes": '\u22C9', // LEFT NORMAL FACTOR SEMIDIRECT PRODUCT
	"\\ltimes{}": '\u22C9', // LEFT NORMAL FACTOR SEMIDIRECT PRODUCT
	"\\ltlarr": '\u2976', // LESS-THAN ABOVE LEFTWARDS ARROW
	"\\ltlarr{}": '\u2976', // LESS-THAN ABOVE LEFTWARDS ARROW
	"\\ltquest": '\u2A7B', // LESS-THAN WITH QUESTION MARK ABOVE
	"\\ltquest{}": '\u2A7B', // LESS-THAN WITH QUESTION MARK ABOVE
	"\\lvboxline": '\u23B8', // LEFT VERTICAL BOX LINE
	"\\lvboxline{}": '\u23B8', // LEFT VERTICAL BOX LINE
	"\\lvec": '\u20D0', // COMBINING LEFT HARPOON ABOVE
	"\\lvec{}": '\u20D0', // COMBINING LEFT HARPOON ABOVE
	"\\lvzigzag": '\u29D8', // LEFT WIGGLY FENCE
	"\\lvzigzag{}": '\u29D8', // LEFT WIGGLY FENCE
	"\\l{}": '\u0142', // LATIN SMALL LETTER L WITH STROKE
	"\\male": '\u2642', // MALE SIGN
	"\\male{}": '\u2642', // MALE SIGN
	"\\mapsfrom": '\u21A4', // = \mappedfrom (kpfonts), maps to, leftward
	"\\mapsfrom{}": '\u21A4', // = \mappedfrom (kpfonts), maps to, leftward
	"\\mapsto": '\u21A6', // RIGHTWARDS ARROW FROM BAR
	"\\mapsto{}": '\u21A6', // RIGHTWARDS ARROW FROM BAR
	"\\mathbb{0}": '\uD835\uDFD8', // MATHEMATICAL DOUBLE-STRUCK DIGIT ZERO
	"\\mathbb{1}": '\uD835\uDFD9', // MATHEMATICAL DOUBLE-STRUCK DIGIT ONE
	"\\mathbb{2}": '\uD835\uDFDA', // MATHEMATICAL DOUBLE-STRUCK DIGIT TWO
	"\\mathbb{3}": '\uD835\uDFDB', // MATHEMATICAL DOUBLE-STRUCK DIGIT THREE
	"\\mathbb{4}": '\uD835\uDFDC', // MATHEMATICAL DOUBLE-STRUCK DIGIT FOUR
	"\\mathbb{5}": '\uD835\uDFDD', // MATHEMATICAL DOUBLE-STRUCK DIGIT FIVE
	"\\mathbb{6}": '\uD835\uDFDE', // MATHEMATICAL DOUBLE-STRUCK DIGIT SIX
	"\\mathbb{7}": '\uD835\uDFDF', // MATHEMATICAL DOUBLE-STRUCK DIGIT SEVEN
	"\\mathbb{8}": '\uD835\uDFE0', // MATHEMATICAL DOUBLE-STRUCK DIGIT EIGHT
	"\\mathbb{9}": '\uD835\uDFE1', // MATHEMATICAL DOUBLE-STRUCK DIGIT NINE
	"\\mathbb{A}": '\uD835\uDD38', // MATHEMATICAL DOUBLE-STRUCK CAPITAL A
	"\\mathbb{B}": '\uD835\uDD39', // MATHEMATICAL DOUBLE-STRUCK CAPITAL B
	"\\mathbb{C}": '\u2102', // DOUBLE-STRUCK CAPITAL C
	"\\mathbb{D}": '\uD835\uDD3B', // MATHEMATICAL DOUBLE-STRUCK CAPITAL D
	"\\mathbb{E}": '\uD835\uDD3C', // MATHEMATICAL DOUBLE-STRUCK CAPITAL E
	"\\mathbb{F}": '\uD835\uDD3D', // MATHEMATICAL DOUBLE-STRUCK CAPITAL F
	"\\mathbb{G}": '\uD835\uDD3E', // MATHEMATICAL DOUBLE-STRUCK CAPITAL G
	"\\mathbb{H}": '\u210D', // DOUBLE-STRUCK CAPITAL H
	"\\mathbb{I}": '\uD835\uDD40', // MATHEMATICAL DOUBLE-STRUCK CAPITAL I
	"\\mathbb{J}": '\uD835\uDD41', // MATHEMATICAL DOUBLE-STRUCK CAPITAL J
	"\\mathbb{K}": '\uD835\uDD42', // MATHEMATICAL DOUBLE-STRUCK CAPITAL K
	"\\mathbb{L}": '\uD835\uDD43', // MATHEMATICAL DOUBLE-STRUCK CAPITAL L
	"\\mathbb{M}": '\uD835\uDD44', // MATHEMATICAL DOUBLE-STRUCK CAPITAL M
	"\\mathbb{N}": '\u2115', // DOUBLE-STRUCK CAPITAL N
	"\\mathbb{O}": '\uD835\uDD46', // MATHEMATICAL DOUBLE-STRUCK CAPITAL O
	"\\mathbb{P}": '\u2119', // DOUBLE-STRUCK CAPITAL P
	"\\mathbb{Q}": '\u211A', // DOUBLE-STRUCK CAPITAL Q
	"\\mathbb{R}": '\u211D', // DOUBLE-STRUCK CAPITAL R
	"\\mathbb{S}": '\uD835\uDD4A', // MATHEMATICAL DOUBLE-STRUCK CAPITAL S
	"\\mathbb{T}": '\uD835\uDD4B', // MATHEMATICAL DOUBLE-STRUCK CAPITAL T
	"\\mathbb{U}": '\uD835\uDD4C', // MATHEMATICAL DOUBLE-STRUCK CAPITAL U
	"\\mathbb{V}": '\uD835\uDD4D', // MATHEMATICAL DOUBLE-STRUCK CAPITAL V
	"\\mathbb{W}": '\uD835\uDD4E', // MATHEMATICAL DOUBLE-STRUCK CAPITAL W
	"\\mathbb{X}": '\uD835\uDD4F', // MATHEMATICAL DOUBLE-STRUCK CAPITAL X
	"\\mathbb{Y}": '\uD835\uDD50', // MATHEMATICAL DOUBLE-STRUCK CAPITAL Y
	"\\mathbb{Z}": '\u2124', // DOUBLE-STRUCK CAPITAL Z
	"\\mathbb{\\Gamma}": '\u213E', // DOUBLE-STRUCK CAPITAL GAMMA
	"\\mathbb{\\Pi}": '\u213F', // DOUBLE-STRUCK CAPITAL PI
	"\\mathbb{\\Sigma}": '\u2140', // DOUBLE-STRUCK N-ARY SUMMATION
	"\\mathbb{\\gamma}": '\u213D', // \EulerGamma (wrisym), DOUBLE-STRUCK SMALL GAMMA
	"\\mathbb{\\pi}": '\u213C', // \DoublePi (wrisym), DOUBLE-STRUCK SMALL PI
	"\\mathbb{a}": '\uD835\uDD52', // MATHEMATICAL DOUBLE-STRUCK SMALL A
	"\\mathbb{b}": '\uD835\uDD53', // MATHEMATICAL DOUBLE-STRUCK SMALL B
	"\\mathbb{c}": '\uD835\uDD54', // MATHEMATICAL DOUBLE-STRUCK SMALL C
	"\\mathbb{d}": '\uD835\uDD55', // MATHEMATICAL DOUBLE-STRUCK SMALL D
	"\\mathbb{e}": '\uD835\uDD56', // MATHEMATICAL DOUBLE-STRUCK SMALL E
	"\\mathbb{f}": '\uD835\uDD57', // MATHEMATICAL DOUBLE-STRUCK SMALL F
	"\\mathbb{g}": '\uD835\uDD58', // MATHEMATICAL DOUBLE-STRUCK SMALL G
	"\\mathbb{h}": '\uD835\uDD59', // MATHEMATICAL DOUBLE-STRUCK SMALL H
	"\\mathbb{i}": '\uD835\uDD5A', // MATHEMATICAL DOUBLE-STRUCK SMALL I
	"\\mathbb{j}": '\uD835\uDD5B', // MATHEMATICAL DOUBLE-STRUCK SMALL J
	"\\mathbb{k}": '\uD835\uDD5C', // MATHEMATICAL DOUBLE-STRUCK SMALL K
	"\\mathbb{l}": '\uD835\uDD5D', // MATHEMATICAL DOUBLE-STRUCK SMALL L
	"\\mathbb{m}": '\uD835\uDD5E', // MATHEMATICAL DOUBLE-STRUCK SMALL M
	"\\mathbb{n}": '\uD835\uDD5F', // MATHEMATICAL DOUBLE-STRUCK SMALL N
	"\\mathbb{o}": '\uD835\uDD60', // MATHEMATICAL DOUBLE-STRUCK SMALL O
	"\\mathbb{p}": '\uD835\uDD61', // MATHEMATICAL DOUBLE-STRUCK SMALL P
	"\\mathbb{q}": '\uD835\uDD62', // MATHEMATICAL DOUBLE-STRUCK SMALL Q
	"\\mathbb{r}": '\uD835\uDD63', // MATHEMATICAL DOUBLE-STRUCK SMALL R
	"\\mathbb{s}": '\uD835\uDD64', // MATHEMATICAL DOUBLE-STRUCK SMALL S
	"\\mathbb{t}": '\uD835\uDD65', // MATHEMATICAL DOUBLE-STRUCK SMALL T
	"\\mathbb{u}": '\uD835\uDD66', // MATHEMATICAL DOUBLE-STRUCK SMALL U
	"\\mathbb{v}": '\uD835\uDD67', // MATHEMATICAL DOUBLE-STRUCK SMALL V
	"\\mathbb{w}": '\uD835\uDD68', // MATHEMATICAL DOUBLE-STRUCK SMALL W
	"\\mathbb{x}": '\uD835\uDD69', // MATHEMATICAL DOUBLE-STRUCK SMALL X
	"\\mathbb{y}": '\uD835\uDD6A', // MATHEMATICAL DOUBLE-STRUCK SMALL Y
	"\\mathbb{z}": '\uD835\uDD6B', // MATHEMATICAL DOUBLE-STRUCK SMALL Z
	"\\mathbf{0}": '\uD835\uDFCE', // MATHEMATICAL BOLD DIGIT ZERO
	"\\mathbf{1}": '\uD835\uDFCF', // MATHEMATICAL BOLD DIGIT ONE
	"\\mathbf{2}": '\uD835\uDFD0', // MATHEMATICAL BOLD DIGIT TWO
	"\\mathbf{3}": '\uD835\uDFD1', // MATHEMATICAL BOLD DIGIT THREE
	"\\mathbf{4}": '\uD835\uDFD2', // MATHEMATICAL BOLD DIGIT FOUR
	"\\mathbf{5}": '\uD835\uDFD3', // MATHEMATICAL BOLD DIGIT FIVE
	"\\mathbf{6}": '\uD835\uDFD4', // MATHEMATICAL BOLD DIGIT SIX
	"\\mathbf{7}": '\uD835\uDFD5', // MATHEMATICAL BOLD DIGIT SEVEN
	"\\mathbf{8}": '\uD835\uDFD6', // MATHEMATICAL BOLD DIGIT EIGHT
	"\\mathbf{9}": '\uD835\uDFD7', // MATHEMATICAL BOLD DIGIT NINE
	"\\mathbf{A}": '\uD835\uDC00', // MATHEMATICAL BOLD CAPITAL A
	"\\mathbf{B}": '\uD835\uDC01', // MATHEMATICAL BOLD CAPITAL B
	"\\mathbf{C}": '\uD835\uDC02', // MATHEMATICAL BOLD CAPITAL C
	"\\mathbf{D}": '\uD835\uDC03', // MATHEMATICAL BOLD CAPITAL D
	"\\mathbf{E}": '\uD835\uDC04', // MATHEMATICAL BOLD CAPITAL E
	"\\mathbf{F}": '\uD835\uDC05', // MATHEMATICAL BOLD CAPITAL F
	"\\mathbf{G}": '\uD835\uDC06', // MATHEMATICAL BOLD CAPITAL G
	"\\mathbf{H}": '\uD835\uDC07', // MATHEMATICAL BOLD CAPITAL H
	"\\mathbf{I}": '\uD835\uDC08', // MATHEMATICAL BOLD CAPITAL I
	"\\mathbf{J}": '\uD835\uDC09', // MATHEMATICAL BOLD CAPITAL J
	"\\mathbf{K}": '\uD835\uDC0A', // MATHEMATICAL BOLD CAPITAL K
	"\\mathbf{L}": '\uD835\uDC0B', // MATHEMATICAL BOLD CAPITAL L
	"\\mathbf{M}": '\uD835\uDC0C', // MATHEMATICAL BOLD CAPITAL M
	"\\mathbf{N}": '\uD835\uDC0D', // MATHEMATICAL BOLD CAPITAL N
	"\\mathbf{O}": '\uD835\uDC0E', // MATHEMATICAL BOLD CAPITAL O
	"\\mathbf{P}": '\uD835\uDC0F', // MATHEMATICAL BOLD CAPITAL P
	"\\mathbf{Q}": '\uD835\uDC10', // MATHEMATICAL BOLD CAPITAL Q
	"\\mathbf{R}": '\uD835\uDC11', // MATHEMATICAL BOLD CAPITAL R
	"\\mathbf{S}": '\uD835\uDC12', // MATHEMATICAL BOLD CAPITAL S
	"\\mathbf{T}": '\uD835\uDC13', // MATHEMATICAL BOLD CAPITAL T
	"\\mathbf{U}": '\uD835\uDC14', // MATHEMATICAL BOLD CAPITAL U
	"\\mathbf{V}": '\uD835\uDC15', // MATHEMATICAL BOLD CAPITAL V
	"\\mathbf{W}": '\uD835\uDC16', // MATHEMATICAL BOLD CAPITAL W
	"\\mathbf{X}": '\uD835\uDC17', // MATHEMATICAL BOLD CAPITAL X
	"\\mathbf{Y}": '\uD835\uDC18', // MATHEMATICAL BOLD CAPITAL Y
	"\\mathbf{Z}": '\uD835\uDC19', // MATHEMATICAL BOLD CAPITAL Z
	"\\mathbf{\\Alpha}": '\uD835\uDEA8', // MATHEMATICAL BOLD CAPITAL ALPHA
	"\\mathbf{\\Beta}": '\uD835\uDEA9', // MATHEMATICAL BOLD CAPITAL BETA
	"\\mathbf{\\Chi}": '\uD835\uDEBE', // MATHEMATICAL BOLD CAPITAL CHI
	"\\mathbf{\\Delta}": '\uD835\uDEAB', // MATHEMATICAL BOLD CAPITAL DELTA
	"\\mathbf{\\Epsilon}": '\uD835\uDEAC', // MATHEMATICAL BOLD CAPITAL EPSILON
	"\\mathbf{\\Eta}": '\uD835\uDEAE', // MATHEMATICAL BOLD CAPITAL ETA
	"\\mathbf{\\Gamma}": '\uD835\uDEAA', // MATHEMATICAL BOLD CAPITAL GAMMA
	"\\mathbf{\\Iota}": '\uD835\uDEB0', // MATHEMATICAL BOLD CAPITAL IOTA
	"\\mathbf{\\Kappa}": '\uD835\uDEB1', // MATHEMATICAL BOLD CAPITAL KAPPA
	"\\mathbf{\\Lambda}": '\uD835\uDEB2', // MATHEMATICAL BOLD CAPITAL LAMDA
	"\\mathbf{\\Omega}": '\uD835\uDEC0', // MATHEMATICAL BOLD CAPITAL OMEGA
	"\\mathbf{\\Phi}": '\uD835\uDEBD', // MATHEMATICAL BOLD CAPITAL PHI
	"\\mathbf{\\Pi}": '\uD835\uDEB7', // MATHEMATICAL BOLD CAPITAL PI
	"\\mathbf{\\Psi}": '\uD835\uDEBF', // MATHEMATICAL BOLD CAPITAL PSI
	"\\mathbf{\\Rho}": '\uD835\uDEB8', // MATHEMATICAL BOLD CAPITAL RHO
	"\\mathbf{\\Sigma}": '\uD835\uDEBA', // MATHEMATICAL BOLD CAPITAL SIGMA
	"\\mathbf{\\Tau}": '\uD835\uDEBB', // MATHEMATICAL BOLD CAPITAL TAU
	"\\mathbf{\\Theta}": '\uD835\uDEAF', // MATHEMATICAL BOLD CAPITAL THETA
	"\\mathbf{\\Upsilon}": '\uD835\uDEBC', // MATHEMATICAL BOLD CAPITAL UPSILON
	"\\mathbf{\\Xi}": '\uD835\uDEB5', // MATHEMATICAL BOLD CAPITAL XI
	"\\mathbf{\\Zeta}": '\uD835\uDEAD', // MATHEMATICAL BOLD CAPITAL ZETA
	"\\mathbf{\\nabla}": '\uD835\uDEC1', // MATHEMATICAL BOLD NABLA
	"\\mathbf{\\phi}": '\uD835\uDEDF', // MATHEMATICAL BOLD PHI SYMBOL
	"\\mathbf{\\theta}": '\uD835\uDEC9', // MATHEMATICAL BOLD SMALL THETA
	"\\mathbf{\\varkappa}": '\uD835\uDEDE', // MATHEMATICAL BOLD KAPPA SYMBOL
	"\\mathbf{\\varpi}": '\uD835\uDEE1', // MATHEMATICAL BOLD PI SYMBOL
	"\\mathbf{\\varrho}": '\uD835\uDEE0', // MATHEMATICAL BOLD RHO SYMBOL
	"\\mathbf{\\varsigma}": '\uD835\uDED3', // MATHEMATICAL BOLD SMALL FINAL SIGMA
	"\\mathbf{\\vartheta}": '\uD835\uDEB9', // MATHEMATICAL BOLD CAPITAL THETA SYMBOL
	"\\mathbf{a}": '\uD835\uDC1A', // MATHEMATICAL BOLD SMALL A
	"\\mathbf{b}": '\uD835\uDC1B', // MATHEMATICAL BOLD SMALL B
	"\\mathbf{c}": '\uD835\uDC1C', // MATHEMATICAL BOLD SMALL C
	"\\mathbf{d}": '\uD835\uDC1D', // MATHEMATICAL BOLD SMALL D
	"\\mathbf{e}": '\uD835\uDC1E', // MATHEMATICAL BOLD SMALL E
	"\\mathbf{f}": '\uD835\uDC1F', // MATHEMATICAL BOLD SMALL F
	"\\mathbf{g}": '\uD835\uDC20', // MATHEMATICAL BOLD SMALL G
	"\\mathbf{h}": '\uD835\uDC21', // MATHEMATICAL BOLD SMALL H
	"\\mathbf{i}": '\uD835\uDC22', // MATHEMATICAL BOLD SMALL I
	"\\mathbf{j}": '\uD835\uDC23', // MATHEMATICAL BOLD SMALL J
	"\\mathbf{k}": '\uD835\uDC24', // MATHEMATICAL BOLD SMALL K
	"\\mathbf{l}": '\uD835\uDC25', // MATHEMATICAL BOLD SMALL L
	"\\mathbf{m}": '\uD835\uDC26', // MATHEMATICAL BOLD SMALL M
	"\\mathbf{n}": '\uD835\uDC27', // MATHEMATICAL BOLD SMALL N
	"\\mathbf{o}": '\uD835\uDC28', // MATHEMATICAL BOLD SMALL O
	"\\mathbf{p}": '\uD835\uDC29', // MATHEMATICAL BOLD SMALL P
	"\\mathbf{q}": '\uD835\uDC2A', // MATHEMATICAL BOLD SMALL Q
	"\\mathbf{r}": '\uD835\uDC2B', // MATHEMATICAL BOLD SMALL R
	"\\mathbf{s}": '\uD835\uDC2C', // MATHEMATICAL BOLD SMALL S
	"\\mathbf{t}": '\uD835\uDC2D', // MATHEMATICAL BOLD SMALL T
	"\\mathbf{u}": '\uD835\uDC2E', // MATHEMATICAL BOLD SMALL U
	"\\mathbf{v}": '\uD835\uDC2F', // MATHEMATICAL BOLD SMALL V
	"\\mathbf{w}": '\uD835\uDC30', // MATHEMATICAL BOLD SMALL W
	"\\mathbf{x}": '\uD835\uDC31', // MATHEMATICAL BOLD SMALL X
	"\\mathbf{y}": '\uD835\uDC32', // MATHEMATICAL BOLD SMALL Y
	"\\mathbf{z}": '\uD835\uDC33', // MATHEMATICAL BOLD SMALL Z
	"\\mathbin{{:}\\!\\!{-}\\!\\!{:}}": '\u223A', // GEOMETRIC PROPORTION
	"\\mathbit{A}": '\uD835\uDC68', // MATHEMATICAL BOLD ITALIC CAPITAL A
	"\\mathbit{B}": '\uD835\uDC69', // MATHEMATICAL BOLD ITALIC CAPITAL B
	"\\mathbit{C}": '\uD835\uDC6A', // MATHEMATICAL BOLD ITALIC CAPITAL C
	"\\mathbit{D}": '\uD835\uDC6B', // MATHEMATICAL BOLD ITALIC CAPITAL D
	"\\mathbit{E}": '\uD835\uDC6C', // MATHEMATICAL BOLD ITALIC CAPITAL E
	"\\mathbit{F}": '\uD835\uDC6D', // MATHEMATICAL BOLD ITALIC CAPITAL F
	"\\mathbit{G}": '\uD835\uDC6E', // MATHEMATICAL BOLD ITALIC CAPITAL G
	"\\mathbit{H}": '\uD835\uDC6F', // MATHEMATICAL BOLD ITALIC CAPITAL H
	"\\mathbit{I}": '\uD835\uDC70', // MATHEMATICAL BOLD ITALIC CAPITAL I
	"\\mathbit{J}": '\uD835\uDC71', // MATHEMATICAL BOLD ITALIC CAPITAL J
	"\\mathbit{K}": '\uD835\uDC72', // MATHEMATICAL BOLD ITALIC CAPITAL K
	"\\mathbit{L}": '\uD835\uDC73', // MATHEMATICAL BOLD ITALIC CAPITAL L
	"\\mathbit{M}": '\uD835\uDC74', // MATHEMATICAL BOLD ITALIC CAPITAL M
	"\\mathbit{N}": '\uD835\uDC75', // MATHEMATICAL BOLD ITALIC CAPITAL N
	"\\mathbit{O}": '\uD835\uDC76', // MATHEMATICAL BOLD ITALIC CAPITAL O
	"\\mathbit{P}": '\uD835\uDC77', // MATHEMATICAL BOLD ITALIC CAPITAL P
	"\\mathbit{Q}": '\uD835\uDC78', // MATHEMATICAL BOLD ITALIC CAPITAL Q
	"\\mathbit{R}": '\uD835\uDC79', // MATHEMATICAL BOLD ITALIC CAPITAL R
	"\\mathbit{S}": '\uD835\uDC7A', // MATHEMATICAL BOLD ITALIC CAPITAL S
	"\\mathbit{T}": '\uD835\uDC7B', // MATHEMATICAL BOLD ITALIC CAPITAL T
	"\\mathbit{U}": '\uD835\uDC7C', // MATHEMATICAL BOLD ITALIC CAPITAL U
	"\\mathbit{V}": '\uD835\uDC7D', // MATHEMATICAL BOLD ITALIC CAPITAL V
	"\\mathbit{W}": '\uD835\uDC7E', // MATHEMATICAL BOLD ITALIC CAPITAL W
	"\\mathbit{X}": '\uD835\uDC7F', // MATHEMATICAL BOLD ITALIC CAPITAL X
	"\\mathbit{Y}": '\uD835\uDC80', // MATHEMATICAL BOLD ITALIC CAPITAL Y
	"\\mathbit{Z}": '\uD835\uDC81', // MATHEMATICAL BOLD ITALIC CAPITAL Z
	"\\mathbit{\\Alpha}": '\uD835\uDF1C', // MATHEMATICAL BOLD ITALIC CAPITAL ALPHA
	"\\mathbit{\\Beta}": '\uD835\uDF1D', // MATHEMATICAL BOLD ITALIC CAPITAL BETA
	"\\mathbit{\\Chi}": '\uD835\uDF32', // MATHEMATICAL BOLD ITALIC CAPITAL CHI
	"\\mathbit{\\Delta}": '\uD835\uDF1F', // MATHEMATICAL BOLD ITALIC CAPITAL DELTA
	"\\mathbit{\\Epsilon}": '\uD835\uDF20', // MATHEMATICAL BOLD ITALIC CAPITAL EPSILON
	"\\mathbit{\\Eta}": '\uD835\uDF22', // MATHEMATICAL BOLD ITALIC CAPITAL ETA
	"\\mathbit{\\Gamma}": '\uD835\uDF1E', // MATHEMATICAL BOLD ITALIC CAPITAL GAMMA
	"\\mathbit{\\Iota}": '\uD835\uDF24', // MATHEMATICAL BOLD ITALIC CAPITAL IOTA
	"\\mathbit{\\Kappa}": '\uD835\uDF25', // MATHEMATICAL BOLD ITALIC CAPITAL KAPPA
	"\\mathbit{\\Lambda}": '\uD835\uDF26', // MATHEMATICAL BOLD ITALIC CAPITAL LAMDA
	"\\mathbit{\\Omega}": '\uD835\uDF34', // MATHEMATICAL BOLD ITALIC CAPITAL OMEGA
	"\\mathbit{\\Phi}": '\uD835\uDF31', // MATHEMATICAL BOLD ITALIC CAPITAL PHI
	"\\mathbit{\\Pi}": '\uD835\uDF2B', // MATHEMATICAL BOLD ITALIC CAPITAL PI
	"\\mathbit{\\Psi}": '\uD835\uDF33', // MATHEMATICAL BOLD ITALIC CAPITAL PSI
	"\\mathbit{\\Rho}": '\uD835\uDF2C', // MATHEMATICAL BOLD ITALIC CAPITAL RHO
	"\\mathbit{\\Sigma}": '\uD835\uDF2E', // MATHEMATICAL BOLD ITALIC CAPITAL SIGMA
	"\\mathbit{\\Tau}": '\uD835\uDF2F', // MATHEMATICAL BOLD ITALIC CAPITAL TAU
	"\\mathbit{\\Theta}": '\uD835\uDF23', // MATHEMATICAL BOLD ITALIC CAPITAL THETA
	"\\mathbit{\\Upsilon}": '\uD835\uDF30', // MATHEMATICAL BOLD ITALIC CAPITAL UPSILON
	"\\mathbit{\\Xi}": '\uD835\uDF29', // MATHEMATICAL BOLD ITALIC CAPITAL XI
	"\\mathbit{\\Zeta}": '\uD835\uDF21', // MATHEMATICAL BOLD ITALIC CAPITAL ZETA
	"\\mathbit{\\nabla}": '\uD835\uDF35', // MATHEMATICAL BOLD ITALIC NABLA
	"\\mathbit{\\phi}": '\uD835\uDF53', // MATHEMATICAL BOLD ITALIC PHI SYMBOL
	"\\mathbit{\\varkappa}": '\uD835\uDF52', // MATHEMATICAL BOLD ITALIC KAPPA SYMBOL
	"\\mathbit{\\varpi}": '\uD835\uDF55', // MATHEMATICAL BOLD ITALIC PI SYMBOL
	"\\mathbit{\\varrho}": '\uD835\uDF54', // MATHEMATICAL BOLD ITALIC RHO SYMBOL
	"\\mathbit{\\varsigma}": '\uD835\uDF47', // MATHEMATICAL BOLD ITALIC SMALL FINAL SIGMA
	"\\mathbit{\\vartheta}": '\uD835\uDF51', // MATHEMATICAL BOLD ITALIC THETA SYMBOL
	"\\mathbit{a}": '\uD835\uDC82', // MATHEMATICAL BOLD ITALIC SMALL A
	"\\mathbit{b}": '\uD835\uDC83', // MATHEMATICAL BOLD ITALIC SMALL B
	"\\mathbit{c}": '\uD835\uDC84', // MATHEMATICAL BOLD ITALIC SMALL C
	"\\mathbit{d}": '\uD835\uDC85', // MATHEMATICAL BOLD ITALIC SMALL D
	"\\mathbit{e}": '\uD835\uDC86', // MATHEMATICAL BOLD ITALIC SMALL E
	"\\mathbit{f}": '\uD835\uDC87', // MATHEMATICAL BOLD ITALIC SMALL F
	"\\mathbit{g}": '\uD835\uDC88', // MATHEMATICAL BOLD ITALIC SMALL G
	"\\mathbit{h}": '\uD835\uDC89', // MATHEMATICAL BOLD ITALIC SMALL H
	"\\mathbit{i}": '\uD835\uDC8A', // MATHEMATICAL BOLD ITALIC SMALL I
	"\\mathbit{j}": '\uD835\uDC8B', // MATHEMATICAL BOLD ITALIC SMALL J
	"\\mathbit{k}": '\uD835\uDC8C', // MATHEMATICAL BOLD ITALIC SMALL K
	"\\mathbit{l}": '\uD835\uDC8D', // MATHEMATICAL BOLD ITALIC SMALL L
	"\\mathbit{m}": '\uD835\uDC8E', // MATHEMATICAL BOLD ITALIC SMALL M
	"\\mathbit{n}": '\uD835\uDC8F', // MATHEMATICAL BOLD ITALIC SMALL N
	"\\mathbit{o}": '\uD835\uDC90', // MATHEMATICAL BOLD ITALIC SMALL O
	"\\mathbit{p}": '\uD835\uDC91', // MATHEMATICAL BOLD ITALIC SMALL P
	"\\mathbit{q}": '\uD835\uDC92', // MATHEMATICAL BOLD ITALIC SMALL Q
	"\\mathbit{r}": '\uD835\uDC93', // MATHEMATICAL BOLD ITALIC SMALL R
	"\\mathbit{s}": '\uD835\uDC94', // MATHEMATICAL BOLD ITALIC SMALL S
	"\\mathbit{t}": '\uD835\uDC95', // MATHEMATICAL BOLD ITALIC SMALL T
	"\\mathbit{u}": '\uD835\uDC96', // MATHEMATICAL BOLD ITALIC SMALL U
	"\\mathbit{v}": '\uD835\uDC97', // MATHEMATICAL BOLD ITALIC SMALL V
	"\\mathbit{w}": '\uD835\uDC98', // MATHEMATICAL BOLD ITALIC SMALL W
	"\\mathbit{x}": '\uD835\uDC99', // MATHEMATICAL BOLD ITALIC SMALL X
	"\\mathbit{y}": '\uD835\uDC9A', // MATHEMATICAL BOLD ITALIC SMALL Y
	"\\mathbit{z}": '\uD835\uDC9B', // MATHEMATICAL BOLD ITALIC SMALL Z
	"\\mathchar\"2208": '\u2316', // POSITION INDICATOR
	"\\mathchar\"2208{}": '\u2316', // POSITION INDICATOR
	"\\mathfrak{A}": '\uD835\uDD04', // MATHEMATICAL FRAKTUR CAPITAL A
	"\\mathfrak{B}": '\uD835\uDD05', // MATHEMATICAL FRAKTUR CAPITAL B
	"\\mathfrak{C}": '\u212D', // BLACK-LETTER CAPITAL C
	"\\mathfrak{D}": '\uD835\uDD07', // MATHEMATICAL FRAKTUR CAPITAL D
	"\\mathfrak{E}": '\uD835\uDD08', // MATHEMATICAL FRAKTUR CAPITAL E
	"\\mathfrak{F}": '\uD835\uDD09', // MATHEMATICAL FRAKTUR CAPITAL F
	"\\mathfrak{G}": '\uD835\uDD0A', // MATHEMATICAL FRAKTUR CAPITAL G
	"\\mathfrak{H}": '\u210C', // BLACK-LETTER CAPITAL H
	"\\mathfrak{I}": '\u2111', // BLACK-LETTER CAPITAL I
	"\\mathfrak{J}": '\uD835\uDD0D', // MATHEMATICAL FRAKTUR CAPITAL J
	"\\mathfrak{K}": '\uD835\uDD0E', // MATHEMATICAL FRAKTUR CAPITAL K
	"\\mathfrak{L}": '\uD835\uDD0F', // MATHEMATICAL FRAKTUR CAPITAL L
	"\\mathfrak{M}": '\uD835\uDD10', // MATHEMATICAL FRAKTUR CAPITAL M
	"\\mathfrak{N}": '\uD835\uDD11', // MATHEMATICAL FRAKTUR CAPITAL N
	"\\mathfrak{O}": '\uD835\uDD12', // MATHEMATICAL FRAKTUR CAPITAL O
	"\\mathfrak{P}": '\uD835\uDD13', // MATHEMATICAL FRAKTUR CAPITAL P
	"\\mathfrak{Q}": '\uD835\uDD14', // MATHEMATICAL FRAKTUR CAPITAL Q
	"\\mathfrak{R}": '\u211C', // BLACK-LETTER CAPITAL R
	"\\mathfrak{S}": '\uD835\uDD16', // MATHEMATICAL FRAKTUR CAPITAL S
	"\\mathfrak{T}": '\uD835\uDD17', // MATHEMATICAL FRAKTUR CAPITAL T
	"\\mathfrak{U}": '\uD835\uDD18', // MATHEMATICAL FRAKTUR CAPITAL U
	"\\mathfrak{V}": '\uD835\uDD19', // MATHEMATICAL FRAKTUR CAPITAL V
	"\\mathfrak{W}": '\uD835\uDD1A', // MATHEMATICAL FRAKTUR CAPITAL W
	"\\mathfrak{X}": '\uD835\uDD1B', // MATHEMATICAL FRAKTUR CAPITAL X
	"\\mathfrak{Y}": '\uD835\uDD1C', // MATHEMATICAL FRAKTUR CAPITAL Y
	"\\mathfrak{Z}": '\u2128', // BLACK-LETTER CAPITAL Z
	"\\mathfrak{a}": '\uD835\uDD1E', // MATHEMATICAL FRAKTUR SMALL A
	"\\mathfrak{b}": '\uD835\uDD1F', // MATHEMATICAL FRAKTUR SMALL B
	"\\mathfrak{c}": '\uD835\uDD20', // MATHEMATICAL FRAKTUR SMALL C
	"\\mathfrak{d}": '\uD835\uDD21', // MATHEMATICAL FRAKTUR SMALL D
	"\\mathfrak{e}": '\uD835\uDD22', // MATHEMATICAL FRAKTUR SMALL E
	"\\mathfrak{f}": '\uD835\uDD23', // MATHEMATICAL FRAKTUR SMALL F
	"\\mathfrak{g}": '\uD835\uDD24', // MATHEMATICAL FRAKTUR SMALL G
	"\\mathfrak{h}": '\uD835\uDD25', // MATHEMATICAL FRAKTUR SMALL H
	"\\mathfrak{i}": '\uD835\uDD26', // MATHEMATICAL FRAKTUR SMALL I
	"\\mathfrak{j}": '\uD835\uDD27', // MATHEMATICAL FRAKTUR SMALL J
	"\\mathfrak{k}": '\uD835\uDD28', // MATHEMATICAL FRAKTUR SMALL K
	"\\mathfrak{l}": '\uD835\uDD29', // MATHEMATICAL FRAKTUR SMALL L
	"\\mathfrak{m}": '\uD835\uDD2A', // MATHEMATICAL FRAKTUR SMALL M
	"\\mathfrak{n}": '\uD835\uDD2B', // MATHEMATICAL FRAKTUR SMALL N
	"\\mathfrak{o}": '\uD835\uDD2C', // MATHEMATICAL FRAKTUR SMALL O
	"\\mathfrak{p}": '\uD835\uDD2D', // MATHEMATICAL FRAKTUR SMALL P
	"\\mathfrak{q}": '\uD835\uDD2E', // MATHEMATICAL FRAKTUR SMALL Q
	"\\mathfrak{r}": '\uD835\uDD2F', // MATHEMATICAL FRAKTUR SMALL R
	"\\mathfrak{s}": '\uD835\uDD30', // MATHEMATICAL FRAKTUR SMALL S
	"\\mathfrak{t}": '\uD835\uDD31', // MATHEMATICAL FRAKTUR SMALL T
	"\\mathfrak{u}": '\uD835\uDD32', // MATHEMATICAL FRAKTUR SMALL U
	"\\mathfrak{v}": '\uD835\uDD33', // MATHEMATICAL FRAKTUR SMALL V
	"\\mathfrak{w}": '\uD835\uDD34', // MATHEMATICAL FRAKTUR SMALL W
	"\\mathfrak{x}": '\uD835\uDD35', // MATHEMATICAL FRAKTUR SMALL X
	"\\mathfrak{y}": '\uD835\uDD36', // MATHEMATICAL FRAKTUR SMALL Y
	"\\mathfrak{z}": '\uD835\uDD37', // MATHEMATICAL FRAKTUR SMALL Z
	"\\mathmit{A}": '\uD835\uDCD0', // MATHEMATICAL BOLD SCRIPT CAPITAL A
	"\\mathmit{B}": '\uD835\uDCD1', // MATHEMATICAL BOLD SCRIPT CAPITAL B
	"\\mathmit{C}": '\uD835\uDCD2', // MATHEMATICAL BOLD SCRIPT CAPITAL C
	"\\mathmit{D}": '\uD835\uDCD3', // MATHEMATICAL BOLD SCRIPT CAPITAL D
	"\\mathmit{E}": '\uD835\uDCD4', // MATHEMATICAL BOLD SCRIPT CAPITAL E
	"\\mathmit{F}": '\uD835\uDCD5', // MATHEMATICAL BOLD SCRIPT CAPITAL F
	"\\mathmit{G}": '\uD835\uDCD6', // MATHEMATICAL BOLD SCRIPT CAPITAL G
	"\\mathmit{H}": '\uD835\uDCD7', // MATHEMATICAL BOLD SCRIPT CAPITAL H
	"\\mathmit{I}": '\uD835\uDCD8', // MATHEMATICAL BOLD SCRIPT CAPITAL I
	"\\mathmit{J}": '\uD835\uDCD9', // MATHEMATICAL BOLD SCRIPT CAPITAL J
	"\\mathmit{K}": '\uD835\uDCDA', // MATHEMATICAL BOLD SCRIPT CAPITAL K
	"\\mathmit{L}": '\uD835\uDCDB', // MATHEMATICAL BOLD SCRIPT CAPITAL L
	"\\mathmit{M}": '\uD835\uDCDC', // MATHEMATICAL BOLD SCRIPT CAPITAL M
	"\\mathmit{N}": '\uD835\uDCDD', // MATHEMATICAL BOLD SCRIPT CAPITAL N
	"\\mathmit{O}": '\uD835\uDCDE', // MATHEMATICAL BOLD SCRIPT CAPITAL O
	"\\mathmit{P}": '\uD835\uDCDF', // MATHEMATICAL BOLD SCRIPT CAPITAL P
	"\\mathmit{Q}": '\uD835\uDCE0', // MATHEMATICAL BOLD SCRIPT CAPITAL Q
	"\\mathmit{R}": '\uD835\uDCE1', // MATHEMATICAL BOLD SCRIPT CAPITAL R
	"\\mathmit{S}": '\uD835\uDCE2', // MATHEMATICAL BOLD SCRIPT CAPITAL S
	"\\mathmit{T}": '\uD835\uDCE3', // MATHEMATICAL BOLD SCRIPT CAPITAL T
	"\\mathmit{U}": '\uD835\uDCE4', // MATHEMATICAL BOLD SCRIPT CAPITAL U
	"\\mathmit{V}": '\uD835\uDCE5', // MATHEMATICAL BOLD SCRIPT CAPITAL V
	"\\mathmit{W}": '\uD835\uDCE6', // MATHEMATICAL BOLD SCRIPT CAPITAL W
	"\\mathmit{X}": '\uD835\uDCE7', // MATHEMATICAL BOLD SCRIPT CAPITAL X
	"\\mathmit{Y}": '\uD835\uDCE8', // MATHEMATICAL BOLD SCRIPT CAPITAL Y
	"\\mathmit{Z}": '\uD835\uDCE9', // MATHEMATICAL BOLD SCRIPT CAPITAL Z
	"\\mathmit{a}": '\uD835\uDCEA', // MATHEMATICAL BOLD SCRIPT SMALL A
	"\\mathmit{b}": '\uD835\uDCEB', // MATHEMATICAL BOLD SCRIPT SMALL B
	"\\mathmit{c}": '\uD835\uDCEC', // MATHEMATICAL BOLD SCRIPT SMALL C
	"\\mathmit{d}": '\uD835\uDCED', // MATHEMATICAL BOLD SCRIPT SMALL D
	"\\mathmit{e}": '\uD835\uDCEE', // MATHEMATICAL BOLD SCRIPT SMALL E
	"\\mathmit{f}": '\uD835\uDCEF', // MATHEMATICAL BOLD SCRIPT SMALL F
	"\\mathmit{g}": '\uD835\uDCF0', // MATHEMATICAL BOLD SCRIPT SMALL G
	"\\mathmit{h}": '\uD835\uDCF1', // MATHEMATICAL BOLD SCRIPT SMALL H
	"\\mathmit{i}": '\uD835\uDCF2', // MATHEMATICAL BOLD SCRIPT SMALL I
	"\\mathmit{j}": '\uD835\uDCF3', // MATHEMATICAL BOLD SCRIPT SMALL J
	"\\mathmit{k}": '\uD835\uDCF4', // MATHEMATICAL BOLD SCRIPT SMALL K
	"\\mathmit{l}": '\uD835\uDCF5', // MATHEMATICAL BOLD SCRIPT SMALL L
	"\\mathmit{m}": '\uD835\uDCF6', // MATHEMATICAL BOLD SCRIPT SMALL M
	"\\mathmit{n}": '\uD835\uDCF7', // MATHEMATICAL BOLD SCRIPT SMALL N
	"\\mathmit{o}": '\uD835\uDCF8', // MATHEMATICAL BOLD SCRIPT SMALL O
	"\\mathmit{p}": '\uD835\uDCF9', // MATHEMATICAL BOLD SCRIPT SMALL P
	"\\mathmit{q}": '\uD835\uDCFA', // MATHEMATICAL BOLD SCRIPT SMALL Q
	"\\mathmit{r}": '\uD835\uDCFB', // MATHEMATICAL BOLD SCRIPT SMALL R
	"\\mathmit{s}": '\uD835\uDCFC', // MATHEMATICAL BOLD SCRIPT SMALL S
	"\\mathmit{t}": '\uD835\uDCFD', // MATHEMATICAL BOLD SCRIPT SMALL T
	"\\mathmit{u}": '\uD835\uDCFE', // MATHEMATICAL BOLD SCRIPT SMALL U
	"\\mathmit{v}": '\uD835\uDCFF', // MATHEMATICAL BOLD SCRIPT SMALL V
	"\\mathmit{w}": '\uD835\uDD00', // MATHEMATICAL BOLD SCRIPT SMALL W
	"\\mathmit{x}": '\uD835\uDD01', // MATHEMATICAL BOLD SCRIPT SMALL X
	"\\mathmit{y}": '\uD835\uDD02', // MATHEMATICAL BOLD SCRIPT SMALL Y
	"\\mathmit{z}": '\uD835\uDD03', // MATHEMATICAL BOLD SCRIPT SMALL Z
	"\\mathrm{'Y}": '\u038E', // GREEK CAPITAL LETTER UPSILON WITH TONOS
	"\\mathrm{'\\Omega}": '\u038F', // GREEK CAPITAL LETTER OMEGA WITH TONOS
	"\\mathrm{\\ddot{I}}": '\u03AA', // GREEK CAPITAL LETTER IOTA WITH DIALYTIKA
	"\\mathrm{\\ddot{Y}}": '\u03AB', // GREEK CAPITAL LETTER UPSILON WITH DIALYTIKA
	"\\mathrm{\\mu}": '\u00B5', // MICRO SIGN
	"\\mathscr{A}": '\uD835\uDC9C', // MATHEMATICAL SCRIPT CAPITAL A
	"\\mathscr{B}": '\u212C', // SCRIPT CAPITAL B
	"\\mathscr{C}": '\uD835\uDC9E', // MATHEMATICAL SCRIPT CAPITAL C
	"\\mathscr{D}": '\uD835\uDC9F', // MATHEMATICAL SCRIPT CAPITAL D
	"\\mathscr{E}": '\u2130', // SCRIPT CAPITAL E
	"\\mathscr{F}": '\u2131', // SCRIPT CAPITAL F
	"\\mathscr{G}": '\uD835\uDCA2', // MATHEMATICAL SCRIPT CAPITAL G
	"\\mathscr{H}": '\u210B', // SCRIPT CAPITAL H
	"\\mathscr{I}": '\u2110', // SCRIPT CAPITAL I
	"\\mathscr{J}": '\uD835\uDCA5', // MATHEMATICAL SCRIPT CAPITAL J
	"\\mathscr{K}": '\uD835\uDCA6', // MATHEMATICAL SCRIPT CAPITAL K
	"\\mathscr{L}": '\u2112', // SCRIPT CAPITAL L
	"\\mathscr{M}": '\u2133', // SCRIPT CAPITAL M
	"\\mathscr{N}": '\uD835\uDCA9', // MATHEMATICAL SCRIPT CAPITAL N
	"\\mathscr{O}": '\uD835\uDCAA', // MATHEMATICAL SCRIPT CAPITAL O
	"\\mathscr{P}": '\uD835\uDCAB', // MATHEMATICAL SCRIPT CAPITAL P
	"\\mathscr{Q}": '\uD835\uDCAC', // MATHEMATICAL SCRIPT CAPITAL Q
	"\\mathscr{R}": '\u211B', // SCRIPT CAPITAL R
	"\\mathscr{S}": '\uD835\uDCAE', // MATHEMATICAL SCRIPT CAPITAL S
	"\\mathscr{T}": '\uD835\uDCAF', // MATHEMATICAL SCRIPT CAPITAL T
	"\\mathscr{U}": '\uD835\uDCB0', // MATHEMATICAL SCRIPT CAPITAL U
	"\\mathscr{V}": '\uD835\uDCB1', // MATHEMATICAL SCRIPT CAPITAL V
	"\\mathscr{W}": '\uD835\uDCB2', // MATHEMATICAL SCRIPT CAPITAL W
	"\\mathscr{X}": '\uD835\uDCB3', // MATHEMATICAL SCRIPT CAPITAL X
	"\\mathscr{Y}": '\uD835\uDCB4', // MATHEMATICAL SCRIPT CAPITAL Y
	"\\mathscr{Z}": '\uD835\uDCB5', // MATHEMATICAL SCRIPT CAPITAL Z
	"\\mathscr{a}": '\uD835\uDCB6', // MATHEMATICAL SCRIPT SMALL A
	"\\mathscr{b}": '\uD835\uDCB7', // MATHEMATICAL SCRIPT SMALL B
	"\\mathscr{c}": '\uD835\uDCB8', // MATHEMATICAL SCRIPT SMALL C
	"\\mathscr{d}": '\uD835\uDCB9', // MATHEMATICAL SCRIPT SMALL D
	"\\mathscr{e}": '\u212F', // SCRIPT SMALL E
	"\\mathscr{f}": '\uD835\uDCBB', // MATHEMATICAL SCRIPT SMALL F
	"\\mathscr{g}": '\u210A', // SCRIPT SMALL G
	"\\mathscr{h}": '\uD835\uDCBD', // MATHEMATICAL SCRIPT SMALL H
	"\\mathscr{i}": '\uD835\uDCBE', // MATHEMATICAL SCRIPT SMALL I
	"\\mathscr{j}": '\uD835\uDCBF', // MATHEMATICAL SCRIPT SMALL J
	"\\mathscr{k}": '\uD835\uDCC0', // MATHEMATICAL SCRIPT SMALL K
	"\\mathscr{l}": '\u2113', // SCRIPT SMALL L
	"\\mathscr{m}": '\uD835\uDCC2', // MATHEMATICAL SCRIPT SMALL M
	"\\mathscr{n}": '\uD835\uDCC3', // MATHEMATICAL SCRIPT SMALL N
	"\\mathscr{o}": '\u2134', // SCRIPT SMALL O
	"\\mathscr{p}": '\uD835\uDCC5', // MATHEMATICAL SCRIPT SMALL P
	"\\mathscr{q}": '\uD835\uDCC6', // MATHEMATICAL SCRIPT SMALL Q
	"\\mathscr{r}": '\uD835\uDCC7', // MATHEMATICAL SCRIPT SMALL R
	"\\mathscr{s}": '\uD835\uDCC8', // MATHEMATICAL SCRIPT SMALL S
	"\\mathscr{t}": '\uD835\uDCC9', // MATHEMATICAL SCRIPT SMALL T
	"\\mathscr{u}": '\uD835\uDCCA', // MATHEMATICAL SCRIPT SMALL U
	"\\mathscr{v}": '\uD835\uDCCB', // MATHEMATICAL SCRIPT SMALL V
	"\\mathscr{w}": '\uD835\uDCCC', // MATHEMATICAL SCRIPT SMALL W
	"\\mathscr{x}": '\uD835\uDCCD', // MATHEMATICAL SCRIPT SMALL X
	"\\mathscr{y}": '\uD835\uDCCE', // MATHEMATICAL SCRIPT SMALL Y
	"\\mathscr{z}": '\uD835\uDCCF', // MATHEMATICAL SCRIPT SMALL Z
	"\\mathsfbfsl{A}": '\uD835\uDE3C', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL A
	"\\mathsfbfsl{B}": '\uD835\uDE3D', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL B
	"\\mathsfbfsl{C}": '\uD835\uDE3E', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL C
	"\\mathsfbfsl{D}": '\uD835\uDE3F', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL D
	"\\mathsfbfsl{E}": '\uD835\uDE40', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL E
	"\\mathsfbfsl{F}": '\uD835\uDE41', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL F
	"\\mathsfbfsl{G}": '\uD835\uDE42', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL G
	"\\mathsfbfsl{H}": '\uD835\uDE43', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL H
	"\\mathsfbfsl{I}": '\uD835\uDE44', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL I
	"\\mathsfbfsl{J}": '\uD835\uDE45', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL J
	"\\mathsfbfsl{K}": '\uD835\uDE46', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL K
	"\\mathsfbfsl{L}": '\uD835\uDE47', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL L
	"\\mathsfbfsl{M}": '\uD835\uDE48', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL M
	"\\mathsfbfsl{N}": '\uD835\uDE49', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL N
	"\\mathsfbfsl{O}": '\uD835\uDE4A', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL O
	"\\mathsfbfsl{P}": '\uD835\uDE4B', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL P
	"\\mathsfbfsl{Q}": '\uD835\uDE4C', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL Q
	"\\mathsfbfsl{R}": '\uD835\uDE4D', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL R
	"\\mathsfbfsl{S}": '\uD835\uDE4E', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL S
	"\\mathsfbfsl{T}": '\uD835\uDE4F', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL T
	"\\mathsfbfsl{U}": '\uD835\uDE50', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL U
	"\\mathsfbfsl{V}": '\uD835\uDE51', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL V
	"\\mathsfbfsl{W}": '\uD835\uDE52', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL W
	"\\mathsfbfsl{X}": '\uD835\uDE53', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL X
	"\\mathsfbfsl{Y}": '\uD835\uDE54', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL Y
	"\\mathsfbfsl{Z}": '\uD835\uDE55', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL Z
	"\\mathsfbfsl{\\Alpha}": '\uD835\uDF90', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL ALPHA
	"\\mathsfbfsl{\\Beta}": '\uD835\uDF91', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL BETA
	"\\mathsfbfsl{\\Chi}": '\uD835\uDFA6', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL CHI
	"\\mathsfbfsl{\\Delta}": '\uD835\uDF93', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL DELTA
	"\\mathsfbfsl{\\Epsilon}": '\uD835\uDF94', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL EPSILON
	"\\mathsfbfsl{\\Eta}": '\uD835\uDF96', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL ETA
	"\\mathsfbfsl{\\Gamma}": '\uD835\uDF92', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL GAMMA
	"\\mathsfbfsl{\\Iota}": '\uD835\uDF98', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL IOTA
	"\\mathsfbfsl{\\Kappa}": '\uD835\uDF99', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL KAPPA
	"\\mathsfbfsl{\\Lambda}": '\uD835\uDF9A', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL LAMDA
	"\\mathsfbfsl{\\Omega}": '\uD835\uDFA8', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL OMEGA
	"\\mathsfbfsl{\\Phi}": '\uD835\uDFA5', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL PHI
	"\\mathsfbfsl{\\Pi}": '\uD835\uDF9F', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL PI
	"\\mathsfbfsl{\\Psi}": '\uD835\uDFA7', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL PSI
	"\\mathsfbfsl{\\Rho}": '\uD835\uDFA0', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL RHO
	"\\mathsfbfsl{\\Sigma}": '\uD835\uDFA2', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL SIGMA
	"\\mathsfbfsl{\\Tau}": '\uD835\uDFA3', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL TAU
	"\\mathsfbfsl{\\Upsilon}": '\uD835\uDFA4', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL UPSILON
	"\\mathsfbfsl{\\Xi}": '\uD835\uDF9D', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL XI
	"\\mathsfbfsl{\\Zeta}": '\uD835\uDF95', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL ZETA
	"\\mathsfbfsl{\\nabla}": '\uD835\uDFA9', // MATHEMATICAL SANS-SERIF BOLD ITALIC NABLA
	"\\mathsfbfsl{\\phi}": '\uD835\uDFC7', // MATHEMATICAL SANS-SERIF BOLD ITALIC PHI SYMBOL
	"\\mathsfbfsl{\\varkappa}": '\uD835\uDFC6', // MATHEMATICAL SANS-SERIF BOLD ITALIC KAPPA SYMBOL
	"\\mathsfbfsl{\\varpi}": '\uD835\uDFC9', // MATHEMATICAL SANS-SERIF BOLD ITALIC PI SYMBOL
	"\\mathsfbfsl{\\varrho}": '\uD835\uDFC8', // MATHEMATICAL SANS-SERIF BOLD ITALIC RHO SYMBOL
	"\\mathsfbfsl{\\varsigma}": '\uD835\uDFBB', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL FINAL SIGMA
	"\\mathsfbfsl{\\vartheta}": '\uD835\uDF97', // MATHEMATICAL SANS-SERIF BOLD ITALIC CAPITAL THETA
	"\\mathsfbfsl{a}": '\uD835\uDE56', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL A
	"\\mathsfbfsl{b}": '\uD835\uDE57', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL B
	"\\mathsfbfsl{c}": '\uD835\uDE58', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL C
	"\\mathsfbfsl{d}": '\uD835\uDE59', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL D
	"\\mathsfbfsl{e}": '\uD835\uDE5A', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL E
	"\\mathsfbfsl{f}": '\uD835\uDE5B', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL F
	"\\mathsfbfsl{g}": '\uD835\uDE5C', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL G
	"\\mathsfbfsl{h}": '\uD835\uDE5D', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL H
	"\\mathsfbfsl{i}": '\uD835\uDE5E', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL I
	"\\mathsfbfsl{j}": '\uD835\uDE5F', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL J
	"\\mathsfbfsl{k}": '\uD835\uDE60', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL K
	"\\mathsfbfsl{l}": '\uD835\uDE61', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL L
	"\\mathsfbfsl{m}": '\uD835\uDE62', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL M
	"\\mathsfbfsl{n}": '\uD835\uDE63', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL N
	"\\mathsfbfsl{o}": '\uD835\uDE64', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL O
	"\\mathsfbfsl{p}": '\uD835\uDE65', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL P
	"\\mathsfbfsl{q}": '\uD835\uDE66', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL Q
	"\\mathsfbfsl{r}": '\uD835\uDE67', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL R
	"\\mathsfbfsl{s}": '\uD835\uDE68', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL S
	"\\mathsfbfsl{t}": '\uD835\uDE69', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL T
	"\\mathsfbfsl{u}": '\uD835\uDE6A', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL U
	"\\mathsfbfsl{v}": '\uD835\uDE6B', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL V
	"\\mathsfbfsl{w}": '\uD835\uDE6C', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL W
	"\\mathsfbfsl{x}": '\uD835\uDE6D', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL X
	"\\mathsfbfsl{y}": '\uD835\uDE6E', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL Y
	"\\mathsfbfsl{z}": '\uD835\uDE6F', // MATHEMATICAL SANS-SERIF BOLD ITALIC SMALL Z
	"\\mathsfbf{0}": '\uD835\uDFEC', // MATHEMATICAL SANS-SERIF BOLD DIGIT ZERO
	"\\mathsfbf{1}": '\uD835\uDFED', // MATHEMATICAL SANS-SERIF BOLD DIGIT ONE
	"\\mathsfbf{2}": '\uD835\uDFEE', // MATHEMATICAL SANS-SERIF BOLD DIGIT TWO
	"\\mathsfbf{3}": '\uD835\uDFEF', // MATHEMATICAL SANS-SERIF BOLD DIGIT THREE
	"\\mathsfbf{4}": '\uD835\uDFF0', // MATHEMATICAL SANS-SERIF BOLD DIGIT FOUR
	"\\mathsfbf{5}": '\uD835\uDFF1', // MATHEMATICAL SANS-SERIF BOLD DIGIT FIVE
	"\\mathsfbf{6}": '\uD835\uDFF2', // MATHEMATICAL SANS-SERIF BOLD DIGIT SIX
	"\\mathsfbf{7}": '\uD835\uDFF3', // MATHEMATICAL SANS-SERIF BOLD DIGIT SEVEN
	"\\mathsfbf{8}": '\uD835\uDFF4', // MATHEMATICAL SANS-SERIF BOLD DIGIT EIGHT
	"\\mathsfbf{9}": '\uD835\uDFF5', // MATHEMATICAL SANS-SERIF BOLD DIGIT NINE
	"\\mathsfbf{A}": '\uD835\uDDD4', // MATHEMATICAL SANS-SERIF BOLD CAPITAL A
	"\\mathsfbf{B}": '\uD835\uDDD5', // MATHEMATICAL SANS-SERIF BOLD CAPITAL B
	"\\mathsfbf{C}": '\uD835\uDDD6', // MATHEMATICAL SANS-SERIF BOLD CAPITAL C
	"\\mathsfbf{D}": '\uD835\uDDD7', // MATHEMATICAL SANS-SERIF BOLD CAPITAL D
	"\\mathsfbf{E}": '\uD835\uDDD8', // MATHEMATICAL SANS-SERIF BOLD CAPITAL E
	"\\mathsfbf{F}": '\uD835\uDDD9', // MATHEMATICAL SANS-SERIF BOLD CAPITAL F
	"\\mathsfbf{G}": '\uD835\uDDDA', // MATHEMATICAL SANS-SERIF BOLD CAPITAL G
	"\\mathsfbf{H}": '\uD835\uDDDB', // MATHEMATICAL SANS-SERIF BOLD CAPITAL H
	"\\mathsfbf{I}": '\uD835\uDDDC', // MATHEMATICAL SANS-SERIF BOLD CAPITAL I
	"\\mathsfbf{J}": '\uD835\uDDDD', // MATHEMATICAL SANS-SERIF BOLD CAPITAL J
	"\\mathsfbf{K}": '\uD835\uDDDE', // MATHEMATICAL SANS-SERIF BOLD CAPITAL K
	"\\mathsfbf{L}": '\uD835\uDDDF', // MATHEMATICAL SANS-SERIF BOLD CAPITAL L
	"\\mathsfbf{M}": '\uD835\uDDE0', // MATHEMATICAL SANS-SERIF BOLD CAPITAL M
	"\\mathsfbf{N}": '\uD835\uDDE1', // MATHEMATICAL SANS-SERIF BOLD CAPITAL N
	"\\mathsfbf{O}": '\uD835\uDDE2', // MATHEMATICAL SANS-SERIF BOLD CAPITAL O
	"\\mathsfbf{P}": '\uD835\uDDE3', // MATHEMATICAL SANS-SERIF BOLD CAPITAL P
	"\\mathsfbf{Q}": '\uD835\uDDE4', // MATHEMATICAL SANS-SERIF BOLD CAPITAL Q
	"\\mathsfbf{R}": '\uD835\uDDE5', // MATHEMATICAL SANS-SERIF BOLD CAPITAL R
	"\\mathsfbf{S}": '\uD835\uDDE6', // MATHEMATICAL SANS-SERIF BOLD CAPITAL S
	"\\mathsfbf{T}": '\uD835\uDDE7', // MATHEMATICAL SANS-SERIF BOLD CAPITAL T
	"\\mathsfbf{U}": '\uD835\uDDE8', // MATHEMATICAL SANS-SERIF BOLD CAPITAL U
	"\\mathsfbf{V}": '\uD835\uDDE9', // MATHEMATICAL SANS-SERIF BOLD CAPITAL V
	"\\mathsfbf{W}": '\uD835\uDDEA', // MATHEMATICAL SANS-SERIF BOLD CAPITAL W
	"\\mathsfbf{X}": '\uD835\uDDEB', // MATHEMATICAL SANS-SERIF BOLD CAPITAL X
	"\\mathsfbf{Y}": '\uD835\uDDEC', // MATHEMATICAL SANS-SERIF BOLD CAPITAL Y
	"\\mathsfbf{Z}": '\uD835\uDDED', // MATHEMATICAL SANS-SERIF BOLD CAPITAL Z
	"\\mathsfbf{\\Alpha}": '\uD835\uDF56', // MATHEMATICAL SANS-SERIF BOLD CAPITAL ALPHA
	"\\mathsfbf{\\Beta}": '\uD835\uDF57', // MATHEMATICAL SANS-SERIF BOLD CAPITAL BETA
	"\\mathsfbf{\\Chi}": '\uD835\uDF6C', // MATHEMATICAL SANS-SERIF BOLD CAPITAL CHI
	"\\mathsfbf{\\Delta}": '\uD835\uDF59', // MATHEMATICAL SANS-SERIF BOLD CAPITAL DELTA
	"\\mathsfbf{\\Epsilon}": '\uD835\uDF5A', // MATHEMATICAL SANS-SERIF BOLD CAPITAL EPSILON
	"\\mathsfbf{\\Eta}": '\uD835\uDF5C', // MATHEMATICAL SANS-SERIF BOLD CAPITAL ETA
	"\\mathsfbf{\\Gamma}": '\uD835\uDF58', // MATHEMATICAL SANS-SERIF BOLD CAPITAL GAMMA
	"\\mathsfbf{\\Iota}": '\uD835\uDF5E', // MATHEMATICAL SANS-SERIF BOLD CAPITAL IOTA
	"\\mathsfbf{\\Kappa}": '\uD835\uDF5F', // MATHEMATICAL SANS-SERIF BOLD CAPITAL KAPPA
	"\\mathsfbf{\\Lambda}": '\uD835\uDF60', // MATHEMATICAL SANS-SERIF BOLD CAPITAL LAMDA
	"\\mathsfbf{\\Omega}": '\uD835\uDF6E', // MATHEMATICAL SANS-SERIF BOLD CAPITAL OMEGA
	"\\mathsfbf{\\Phi}": '\uD835\uDF6B', // MATHEMATICAL SANS-SERIF BOLD CAPITAL PHI
	"\\mathsfbf{\\Pi}": '\uD835\uDF65', // MATHEMATICAL SANS-SERIF BOLD CAPITAL PI
	"\\mathsfbf{\\Psi}": '\uD835\uDF6D', // MATHEMATICAL SANS-SERIF BOLD CAPITAL PSI
	"\\mathsfbf{\\Rho}": '\uD835\uDF66', // MATHEMATICAL SANS-SERIF BOLD CAPITAL RHO
	"\\mathsfbf{\\Sigma}": '\uD835\uDF68', // MATHEMATICAL SANS-SERIF BOLD CAPITAL SIGMA
	"\\mathsfbf{\\Tau}": '\uD835\uDF69', // MATHEMATICAL SANS-SERIF BOLD CAPITAL TAU
	"\\mathsfbf{\\Theta}": '\uD835\uDF5D', // MATHEMATICAL SANS-SERIF BOLD CAPITAL THETA
	"\\mathsfbf{\\Upsilon}": '\uD835\uDF6A', // MATHEMATICAL SANS-SERIF BOLD CAPITAL UPSILON
	"\\mathsfbf{\\Xi}": '\uD835\uDF63', // MATHEMATICAL SANS-SERIF BOLD CAPITAL XI
	"\\mathsfbf{\\Zeta}": '\uD835\uDF5B', // MATHEMATICAL SANS-SERIF BOLD CAPITAL ZETA
	"\\mathsfbf{\\nabla}": '\uD835\uDF6F', // MATHEMATICAL SANS-SERIF BOLD NABLA
	"\\mathsfbf{\\phi}": '\uD835\uDF8D', // MATHEMATICAL SANS-SERIF BOLD PHI SYMBOL
	"\\mathsfbf{\\varkappa}": '\uD835\uDF8C', // MATHEMATICAL SANS-SERIF BOLD KAPPA SYMBOL
	"\\mathsfbf{\\varpi}": '\uD835\uDF8F', // MATHEMATICAL SANS-SERIF BOLD PI SYMBOL
	"\\mathsfbf{\\varrho}": '\uD835\uDF8E', // MATHEMATICAL SANS-SERIF BOLD RHO SYMBOL
	"\\mathsfbf{\\varsigma}": '\uD835\uDF81', // MATHEMATICAL SANS-SERIF BOLD SMALL FINAL SIGMA
	"\\mathsfbf{\\vartheta}": '\uD835\uDF67', // MATHEMATICAL SANS-SERIF BOLD CAPITAL THETA SYMBOL
	"\\mathsfbf{a}": '\uD835\uDDEE', // MATHEMATICAL SANS-SERIF BOLD SMALL A
	"\\mathsfbf{b}": '\uD835\uDDEF', // MATHEMATICAL SANS-SERIF BOLD SMALL B
	"\\mathsfbf{c}": '\uD835\uDDF0', // MATHEMATICAL SANS-SERIF BOLD SMALL C
	"\\mathsfbf{d}": '\uD835\uDDF1', // MATHEMATICAL SANS-SERIF BOLD SMALL D
	"\\mathsfbf{e}": '\uD835\uDDF2', // MATHEMATICAL SANS-SERIF BOLD SMALL E
	"\\mathsfbf{f}": '\uD835\uDDF3', // MATHEMATICAL SANS-SERIF BOLD SMALL F
	"\\mathsfbf{g}": '\uD835\uDDF4', // MATHEMATICAL SANS-SERIF BOLD SMALL G
	"\\mathsfbf{h}": '\uD835\uDDF5', // MATHEMATICAL SANS-SERIF BOLD SMALL H
	"\\mathsfbf{i}": '\uD835\uDDF6', // MATHEMATICAL SANS-SERIF BOLD SMALL I
	"\\mathsfbf{j}": '\uD835\uDDF7', // MATHEMATICAL SANS-SERIF BOLD SMALL J
	"\\mathsfbf{k}": '\uD835\uDDF8', // MATHEMATICAL SANS-SERIF BOLD SMALL K
	"\\mathsfbf{l}": '\uD835\uDDF9', // MATHEMATICAL SANS-SERIF BOLD SMALL L
	"\\mathsfbf{m}": '\uD835\uDDFA', // MATHEMATICAL SANS-SERIF BOLD SMALL M
	"\\mathsfbf{n}": '\uD835\uDDFB', // MATHEMATICAL SANS-SERIF BOLD SMALL N
	"\\mathsfbf{o}": '\uD835\uDDFC', // MATHEMATICAL SANS-SERIF BOLD SMALL O
	"\\mathsfbf{p}": '\uD835\uDDFD', // MATHEMATICAL SANS-SERIF BOLD SMALL P
	"\\mathsfbf{q}": '\uD835\uDDFE', // MATHEMATICAL SANS-SERIF BOLD SMALL Q
	"\\mathsfbf{r}": '\uD835\uDDFF', // MATHEMATICAL SANS-SERIF BOLD SMALL R
	"\\mathsfbf{s}": '\uD835\uDE00', // MATHEMATICAL SANS-SERIF BOLD SMALL S
	"\\mathsfbf{t}": '\uD835\uDE01', // MATHEMATICAL SANS-SERIF BOLD SMALL T
	"\\mathsfbf{u}": '\uD835\uDE02', // MATHEMATICAL SANS-SERIF BOLD SMALL U
	"\\mathsfbf{v}": '\uD835\uDE03', // MATHEMATICAL SANS-SERIF BOLD SMALL V
	"\\mathsfbf{w}": '\uD835\uDE04', // MATHEMATICAL SANS-SERIF BOLD SMALL W
	"\\mathsfbf{x}": '\uD835\uDE05', // MATHEMATICAL SANS-SERIF BOLD SMALL X
	"\\mathsfbf{y}": '\uD835\uDE06', // MATHEMATICAL SANS-SERIF BOLD SMALL Y
	"\\mathsfbf{z}": '\uD835\uDE07', // MATHEMATICAL SANS-SERIF BOLD SMALL Z
	"\\mathsfsl{A}": '\uD835\uDE08', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL A
	"\\mathsfsl{B}": '\uD835\uDE09', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL B
	"\\mathsfsl{C}": '\uD835\uDE0A', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL C
	"\\mathsfsl{D}": '\uD835\uDE0B', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL D
	"\\mathsfsl{E}": '\uD835\uDE0C', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL E
	"\\mathsfsl{F}": '\uD835\uDE0D', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL F
	"\\mathsfsl{G}": '\uD835\uDE0E', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL G
	"\\mathsfsl{H}": '\uD835\uDE0F', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL H
	"\\mathsfsl{I}": '\uD835\uDE10', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL I
	"\\mathsfsl{J}": '\uD835\uDE11', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL J
	"\\mathsfsl{K}": '\uD835\uDE12', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL K
	"\\mathsfsl{L}": '\uD835\uDE13', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL L
	"\\mathsfsl{M}": '\uD835\uDE14', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL M
	"\\mathsfsl{N}": '\uD835\uDE15', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL N
	"\\mathsfsl{O}": '\uD835\uDE16', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL O
	"\\mathsfsl{P}": '\uD835\uDE17', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL P
	"\\mathsfsl{Q}": '\uD835\uDE18', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL Q
	"\\mathsfsl{R}": '\uD835\uDE19', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL R
	"\\mathsfsl{S}": '\uD835\uDE1A', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL S
	"\\mathsfsl{T}": '\uD835\uDE1B', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL T
	"\\mathsfsl{U}": '\uD835\uDE1C', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL U
	"\\mathsfsl{V}": '\uD835\uDE1D', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL V
	"\\mathsfsl{W}": '\uD835\uDE1E', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL W
	"\\mathsfsl{X}": '\uD835\uDE1F', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL X
	"\\mathsfsl{Y}": '\uD835\uDE20', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL Y
	"\\mathsfsl{Z}": '\uD835\uDE21', // MATHEMATICAL SANS-SERIF ITALIC CAPITAL Z
	"\\mathsfsl{a}": '\uD835\uDE22', // MATHEMATICAL SANS-SERIF ITALIC SMALL A
	"\\mathsfsl{b}": '\uD835\uDE23', // MATHEMATICAL SANS-SERIF ITALIC SMALL B
	"\\mathsfsl{c}": '\uD835\uDE24', // MATHEMATICAL SANS-SERIF ITALIC SMALL C
	"\\mathsfsl{d}": '\uD835\uDE25', // MATHEMATICAL SANS-SERIF ITALIC SMALL D
	"\\mathsfsl{e}": '\uD835\uDE26', // MATHEMATICAL SANS-SERIF ITALIC SMALL E
	"\\mathsfsl{f}": '\uD835\uDE27', // MATHEMATICAL SANS-SERIF ITALIC SMALL F
	"\\mathsfsl{g}": '\uD835\uDE28', // MATHEMATICAL SANS-SERIF ITALIC SMALL G
	"\\mathsfsl{h}": '\uD835\uDE29', // MATHEMATICAL SANS-SERIF ITALIC SMALL H
	"\\mathsfsl{i}": '\uD835\uDE2A', // MATHEMATICAL SANS-SERIF ITALIC SMALL I
	"\\mathsfsl{j}": '\uD835\uDE2B', // MATHEMATICAL SANS-SERIF ITALIC SMALL J
	"\\mathsfsl{k}": '\uD835\uDE2C', // MATHEMATICAL SANS-SERIF ITALIC SMALL K
	"\\mathsfsl{l}": '\uD835\uDE2D', // MATHEMATICAL SANS-SERIF ITALIC SMALL L
	"\\mathsfsl{m}": '\uD835\uDE2E', // MATHEMATICAL SANS-SERIF ITALIC SMALL M
	"\\mathsfsl{n}": '\uD835\uDE2F', // MATHEMATICAL SANS-SERIF ITALIC SMALL N
	"\\mathsfsl{o}": '\uD835\uDE30', // MATHEMATICAL SANS-SERIF ITALIC SMALL O
	"\\mathsfsl{p}": '\uD835\uDE31', // MATHEMATICAL SANS-SERIF ITALIC SMALL P
	"\\mathsfsl{q}": '\uD835\uDE32', // MATHEMATICAL SANS-SERIF ITALIC SMALL Q
	"\\mathsfsl{r}": '\uD835\uDE33', // MATHEMATICAL SANS-SERIF ITALIC SMALL R
	"\\mathsfsl{s}": '\uD835\uDE34', // MATHEMATICAL SANS-SERIF ITALIC SMALL S
	"\\mathsfsl{t}": '\uD835\uDE35', // MATHEMATICAL SANS-SERIF ITALIC SMALL T
	"\\mathsfsl{u}": '\uD835\uDE36', // MATHEMATICAL SANS-SERIF ITALIC SMALL U
	"\\mathsfsl{v}": '\uD835\uDE37', // MATHEMATICAL SANS-SERIF ITALIC SMALL V
	"\\mathsfsl{w}": '\uD835\uDE38', // MATHEMATICAL SANS-SERIF ITALIC SMALL W
	"\\mathsfsl{x}": '\uD835\uDE39', // MATHEMATICAL SANS-SERIF ITALIC SMALL X
	"\\mathsfsl{y}": '\uD835\uDE3A', // MATHEMATICAL SANS-SERIF ITALIC SMALL Y
	"\\mathsfsl{z}": '\uD835\uDE3B', // MATHEMATICAL SANS-SERIF ITALIC SMALL Z
	"\\mathsf{0}": '\uD835\uDFE2', // MATHEMATICAL SANS-SERIF DIGIT ZERO
	"\\mathsf{1}": '\uD835\uDFE3', // MATHEMATICAL SANS-SERIF DIGIT ONE
	"\\mathsf{2}": '\uD835\uDFE4', // MATHEMATICAL SANS-SERIF DIGIT TWO
	"\\mathsf{3}": '\uD835\uDFE5', // MATHEMATICAL SANS-SERIF DIGIT THREE
	"\\mathsf{4}": '\uD835\uDFE6', // MATHEMATICAL SANS-SERIF DIGIT FOUR
	"\\mathsf{5}": '\uD835\uDFE7', // MATHEMATICAL SANS-SERIF DIGIT FIVE
	"\\mathsf{6}": '\uD835\uDFE8', // MATHEMATICAL SANS-SERIF DIGIT SIX
	"\\mathsf{7}": '\uD835\uDFE9', // MATHEMATICAL SANS-SERIF DIGIT SEVEN
	"\\mathsf{8}": '\uD835\uDFEA', // MATHEMATICAL SANS-SERIF DIGIT EIGHT
	"\\mathsf{9}": '\uD835\uDFEB', // MATHEMATICAL SANS-SERIF DIGIT NINE
	"\\mathsf{A}": '\uD835\uDDA0', // MATHEMATICAL SANS-SERIF CAPITAL A
	"\\mathsf{B}": '\uD835\uDDA1', // MATHEMATICAL SANS-SERIF CAPITAL B
	"\\mathsf{C}": '\uD835\uDDA2', // MATHEMATICAL SANS-SERIF CAPITAL C
	"\\mathsf{D}": '\uD835\uDDA3', // MATHEMATICAL SANS-SERIF CAPITAL D
	"\\mathsf{E}": '\uD835\uDDA4', // MATHEMATICAL SANS-SERIF CAPITAL E
	"\\mathsf{F}": '\uD835\uDDA5', // MATHEMATICAL SANS-SERIF CAPITAL F
	"\\mathsf{G}": '\uD835\uDDA6', // MATHEMATICAL SANS-SERIF CAPITAL G
	"\\mathsf{H}": '\uD835\uDDA7', // MATHEMATICAL SANS-SERIF CAPITAL H
	"\\mathsf{I}": '\uD835\uDDA8', // MATHEMATICAL SANS-SERIF CAPITAL I
	"\\mathsf{J}": '\uD835\uDDA9', // MATHEMATICAL SANS-SERIF CAPITAL J
	"\\mathsf{K}": '\uD835\uDDAA', // MATHEMATICAL SANS-SERIF CAPITAL K
	"\\mathsf{L}": '\uD835\uDDAB', // MATHEMATICAL SANS-SERIF CAPITAL L
	"\\mathsf{M}": '\uD835\uDDAC', // MATHEMATICAL SANS-SERIF CAPITAL M
	"\\mathsf{N}": '\uD835\uDDAD', // MATHEMATICAL SANS-SERIF CAPITAL N
	"\\mathsf{O}": '\uD835\uDDAE', // MATHEMATICAL SANS-SERIF CAPITAL O
	"\\mathsf{P}": '\uD835\uDDAF', // MATHEMATICAL SANS-SERIF CAPITAL P
	"\\mathsf{Q}": '\uD835\uDDB0', // MATHEMATICAL SANS-SERIF CAPITAL Q
	"\\mathsf{R}": '\uD835\uDDB1', // MATHEMATICAL SANS-SERIF CAPITAL R
	"\\mathsf{S}": '\uD835\uDDB2', // MATHEMATICAL SANS-SERIF CAPITAL S
	"\\mathsf{T}": '\uD835\uDDB3', // MATHEMATICAL SANS-SERIF CAPITAL T
	"\\mathsf{U}": '\uD835\uDDB4', // MATHEMATICAL SANS-SERIF CAPITAL U
	"\\mathsf{V}": '\uD835\uDDB5', // MATHEMATICAL SANS-SERIF CAPITAL V
	"\\mathsf{W}": '\uD835\uDDB6', // MATHEMATICAL SANS-SERIF CAPITAL W
	"\\mathsf{X}": '\uD835\uDDB7', // MATHEMATICAL SANS-SERIF CAPITAL X
	"\\mathsf{Y}": '\uD835\uDDB8', // MATHEMATICAL SANS-SERIF CAPITAL Y
	"\\mathsf{Z}": '\uD835\uDDB9', // MATHEMATICAL SANS-SERIF CAPITAL Z
	"\\mathsf{a}": '\uD835\uDDBA', // MATHEMATICAL SANS-SERIF SMALL A
	"\\mathsf{b}": '\uD835\uDDBB', // MATHEMATICAL SANS-SERIF SMALL B
	"\\mathsf{c}": '\uD835\uDDBC', // MATHEMATICAL SANS-SERIF SMALL C
	"\\mathsf{d}": '\uD835\uDDBD', // MATHEMATICAL SANS-SERIF SMALL D
	"\\mathsf{e}": '\uD835\uDDBE', // MATHEMATICAL SANS-SERIF SMALL E
	"\\mathsf{f}": '\uD835\uDDBF', // MATHEMATICAL SANS-SERIF SMALL F
	"\\mathsf{g}": '\uD835\uDDC0', // MATHEMATICAL SANS-SERIF SMALL G
	"\\mathsf{h}": '\uD835\uDDC1', // MATHEMATICAL SANS-SERIF SMALL H
	"\\mathsf{i}": '\uD835\uDDC2', // MATHEMATICAL SANS-SERIF SMALL I
	"\\mathsf{j}": '\uD835\uDDC3', // MATHEMATICAL SANS-SERIF SMALL J
	"\\mathsf{k}": '\uD835\uDDC4', // MATHEMATICAL SANS-SERIF SMALL K
	"\\mathsf{l}": '\uD835\uDDC5', // MATHEMATICAL SANS-SERIF SMALL L
	"\\mathsf{m}": '\uD835\uDDC6', // MATHEMATICAL SANS-SERIF SMALL M
	"\\mathsf{n}": '\uD835\uDDC7', // MATHEMATICAL SANS-SERIF SMALL N
	"\\mathsf{o}": '\uD835\uDDC8', // MATHEMATICAL SANS-SERIF SMALL O
	"\\mathsf{p}": '\uD835\uDDC9', // MATHEMATICAL SANS-SERIF SMALL P
	"\\mathsf{q}": '\uD835\uDDCA', // MATHEMATICAL SANS-SERIF SMALL Q
	"\\mathsf{r}": '\uD835\uDDCB', // MATHEMATICAL SANS-SERIF SMALL R
	"\\mathsf{s}": '\uD835\uDDCC', // MATHEMATICAL SANS-SERIF SMALL S
	"\\mathsf{t}": '\uD835\uDDCD', // MATHEMATICAL SANS-SERIF SMALL T
	"\\mathsf{u}": '\uD835\uDDCE', // MATHEMATICAL SANS-SERIF SMALL U
	"\\mathsf{v}": '\uD835\uDDCF', // MATHEMATICAL SANS-SERIF SMALL V
	"\\mathsf{w}": '\uD835\uDDD0', // MATHEMATICAL SANS-SERIF SMALL W
	"\\mathsf{x}": '\uD835\uDDD1', // MATHEMATICAL SANS-SERIF SMALL X
	"\\mathsf{y}": '\uD835\uDDD2', // MATHEMATICAL SANS-SERIF SMALL Y
	"\\mathsf{z}": '\uD835\uDDD3', // MATHEMATICAL SANS-SERIF SMALL Z
	"\\mathslbb{A}": '\uD835\uDD6C', // MATHEMATICAL BOLD FRAKTUR CAPITAL A
	"\\mathslbb{B}": '\uD835\uDD6D', // MATHEMATICAL BOLD FRAKTUR CAPITAL B
	"\\mathslbb{C}": '\uD835\uDD6E', // MATHEMATICAL BOLD FRAKTUR CAPITAL C
	"\\mathslbb{D}": '\uD835\uDD6F', // MATHEMATICAL BOLD FRAKTUR CAPITAL D
	"\\mathslbb{E}": '\uD835\uDD70', // MATHEMATICAL BOLD FRAKTUR CAPITAL E
	"\\mathslbb{F}": '\uD835\uDD71', // MATHEMATICAL BOLD FRAKTUR CAPITAL F
	"\\mathslbb{G}": '\uD835\uDD72', // MATHEMATICAL BOLD FRAKTUR CAPITAL G
	"\\mathslbb{H}": '\uD835\uDD73', // MATHEMATICAL BOLD FRAKTUR CAPITAL H
	"\\mathslbb{I}": '\uD835\uDD74', // MATHEMATICAL BOLD FRAKTUR CAPITAL I
	"\\mathslbb{J}": '\uD835\uDD75', // MATHEMATICAL BOLD FRAKTUR CAPITAL J
	"\\mathslbb{K}": '\uD835\uDD76', // MATHEMATICAL BOLD FRAKTUR CAPITAL K
	"\\mathslbb{L}": '\uD835\uDD77', // MATHEMATICAL BOLD FRAKTUR CAPITAL L
	"\\mathslbb{M}": '\uD835\uDD78', // MATHEMATICAL BOLD FRAKTUR CAPITAL M
	"\\mathslbb{N}": '\uD835\uDD79', // MATHEMATICAL BOLD FRAKTUR CAPITAL N
	"\\mathslbb{O}": '\uD835\uDD7A', // MATHEMATICAL BOLD FRAKTUR CAPITAL O
	"\\mathslbb{P}": '\uD835\uDD7B', // MATHEMATICAL BOLD FRAKTUR CAPITAL P
	"\\mathslbb{Q}": '\uD835\uDD7C', // MATHEMATICAL BOLD FRAKTUR CAPITAL Q
	"\\mathslbb{R}": '\uD835\uDD7D', // MATHEMATICAL BOLD FRAKTUR CAPITAL R
	"\\mathslbb{S}": '\uD835\uDD7E', // MATHEMATICAL BOLD FRAKTUR CAPITAL S
	"\\mathslbb{T}": '\uD835\uDD7F', // MATHEMATICAL BOLD FRAKTUR CAPITAL T
	"\\mathslbb{U}": '\uD835\uDD80', // MATHEMATICAL BOLD FRAKTUR CAPITAL U
	"\\mathslbb{V}": '\uD835\uDD81', // MATHEMATICAL BOLD FRAKTUR CAPITAL V
	"\\mathslbb{W}": '\uD835\uDD82', // MATHEMATICAL BOLD FRAKTUR CAPITAL W
	"\\mathslbb{X}": '\uD835\uDD83', // MATHEMATICAL BOLD FRAKTUR CAPITAL X
	"\\mathslbb{Y}": '\uD835\uDD84', // MATHEMATICAL BOLD FRAKTUR CAPITAL Y
	"\\mathslbb{Z}": '\uD835\uDD85', // MATHEMATICAL BOLD FRAKTUR CAPITAL Z
	"\\mathslbb{a}": '\uD835\uDD86', // MATHEMATICAL BOLD FRAKTUR SMALL A
	"\\mathslbb{b}": '\uD835\uDD87', // MATHEMATICAL BOLD FRAKTUR SMALL B
	"\\mathslbb{c}": '\uD835\uDD88', // MATHEMATICAL BOLD FRAKTUR SMALL C
	"\\mathslbb{d}": '\uD835\uDD89', // MATHEMATICAL BOLD FRAKTUR SMALL D
	"\\mathslbb{e}": '\uD835\uDD8A', // MATHEMATICAL BOLD FRAKTUR SMALL E
	"\\mathslbb{f}": '\uD835\uDD8B', // MATHEMATICAL BOLD FRAKTUR SMALL F
	"\\mathslbb{g}": '\uD835\uDD8C', // MATHEMATICAL BOLD FRAKTUR SMALL G
	"\\mathslbb{h}": '\uD835\uDD8D', // MATHEMATICAL BOLD FRAKTUR SMALL H
	"\\mathslbb{i}": '\uD835\uDD8E', // MATHEMATICAL BOLD FRAKTUR SMALL I
	"\\mathslbb{j}": '\uD835\uDD8F', // MATHEMATICAL BOLD FRAKTUR SMALL J
	"\\mathslbb{k}": '\uD835\uDD90', // MATHEMATICAL BOLD FRAKTUR SMALL K
	"\\mathslbb{l}": '\uD835\uDD91', // MATHEMATICAL BOLD FRAKTUR SMALL L
	"\\mathslbb{m}": '\uD835\uDD92', // MATHEMATICAL BOLD FRAKTUR SMALL M
	"\\mathslbb{n}": '\uD835\uDD93', // MATHEMATICAL BOLD FRAKTUR SMALL N
	"\\mathslbb{o}": '\uD835\uDD94', // MATHEMATICAL BOLD FRAKTUR SMALL O
	"\\mathslbb{p}": '\uD835\uDD95', // MATHEMATICAL BOLD FRAKTUR SMALL P
	"\\mathslbb{q}": '\uD835\uDD96', // MATHEMATICAL BOLD FRAKTUR SMALL Q
	"\\mathslbb{r}": '\uD835\uDD97', // MATHEMATICAL BOLD FRAKTUR SMALL R
	"\\mathslbb{s}": '\uD835\uDD98', // MATHEMATICAL BOLD FRAKTUR SMALL S
	"\\mathslbb{t}": '\uD835\uDD99', // MATHEMATICAL BOLD FRAKTUR SMALL T
	"\\mathslbb{u}": '\uD835\uDD9A', // MATHEMATICAL BOLD FRAKTUR SMALL U
	"\\mathslbb{v}": '\uD835\uDD9B', // MATHEMATICAL BOLD FRAKTUR SMALL V
	"\\mathslbb{w}": '\uD835\uDD9C', // MATHEMATICAL BOLD FRAKTUR SMALL W
	"\\mathslbb{x}": '\uD835\uDD9D', // MATHEMATICAL BOLD FRAKTUR SMALL X
	"\\mathslbb{y}": '\uD835\uDD9E', // MATHEMATICAL BOLD FRAKTUR SMALL Y
	"\\mathslbb{z}": '\uD835\uDD9F', // MATHEMATICAL BOLD FRAKTUR SMALL Z
	"\\mathsl{A}": '\uD835\uDC34', // MATHEMATICAL ITALIC CAPITAL A
	"\\mathsl{B}": '\uD835\uDC35', // MATHEMATICAL ITALIC CAPITAL B
	"\\mathsl{C}": '\uD835\uDC36', // MATHEMATICAL ITALIC CAPITAL C
	"\\mathsl{D}": '\uD835\uDC37', // MATHEMATICAL ITALIC CAPITAL D
	"\\mathsl{E}": '\uD835\uDC38', // MATHEMATICAL ITALIC CAPITAL E
	"\\mathsl{F}": '\uD835\uDC39', // MATHEMATICAL ITALIC CAPITAL F
	"\\mathsl{G}": '\uD835\uDC3A', // MATHEMATICAL ITALIC CAPITAL G
	"\\mathsl{H}": '\uD835\uDC3B', // MATHEMATICAL ITALIC CAPITAL H
	"\\mathsl{I}": '\uD835\uDC3C', // MATHEMATICAL ITALIC CAPITAL I
	"\\mathsl{J}": '\uD835\uDC3D', // MATHEMATICAL ITALIC CAPITAL J
	"\\mathsl{K}": '\uD835\uDC3E', // MATHEMATICAL ITALIC CAPITAL K
	"\\mathsl{L}": '\uD835\uDC3F', // MATHEMATICAL ITALIC CAPITAL L
	"\\mathsl{M}": '\uD835\uDC40', // MATHEMATICAL ITALIC CAPITAL M
	"\\mathsl{N}": '\uD835\uDC41', // MATHEMATICAL ITALIC CAPITAL N
	"\\mathsl{O}": '\uD835\uDC42', // MATHEMATICAL ITALIC CAPITAL O
	"\\mathsl{P}": '\uD835\uDC43', // MATHEMATICAL ITALIC CAPITAL P
	"\\mathsl{Q}": '\uD835\uDC44', // MATHEMATICAL ITALIC CAPITAL Q
	"\\mathsl{R}": '\uD835\uDC45', // MATHEMATICAL ITALIC CAPITAL R
	"\\mathsl{S}": '\uD835\uDC46', // MATHEMATICAL ITALIC CAPITAL S
	"\\mathsl{T}": '\uD835\uDC47', // MATHEMATICAL ITALIC CAPITAL T
	"\\mathsl{U}": '\uD835\uDC48', // MATHEMATICAL ITALIC CAPITAL U
	"\\mathsl{V}": '\uD835\uDC49', // MATHEMATICAL ITALIC CAPITAL V
	"\\mathsl{W}": '\uD835\uDC4A', // MATHEMATICAL ITALIC CAPITAL W
	"\\mathsl{X}": '\uD835\uDC4B', // MATHEMATICAL ITALIC CAPITAL X
	"\\mathsl{Y}": '\uD835\uDC4C', // MATHEMATICAL ITALIC CAPITAL Y
	"\\mathsl{Z}": '\uD835\uDC4D', // MATHEMATICAL ITALIC CAPITAL Z
	"\\mathsl{\\Alpha}": '\uD835\uDEE2', // MATHEMATICAL ITALIC CAPITAL ALPHA
	"\\mathsl{\\Beta}": '\uD835\uDEE3', // MATHEMATICAL ITALIC CAPITAL BETA
	"\\mathsl{\\Chi}": '\uD835\uDEF8', // MATHEMATICAL ITALIC CAPITAL CHI
	"\\mathsl{\\Delta}": '\uD835\uDEE5', // MATHEMATICAL ITALIC CAPITAL DELTA
	"\\mathsl{\\Epsilon}": '\uD835\uDEE6', // MATHEMATICAL ITALIC CAPITAL EPSILON
	"\\mathsl{\\Eta}": '\uD835\uDEE8', // MATHEMATICAL ITALIC CAPITAL ETA
	"\\mathsl{\\Gamma}": '\uD835\uDEE4', // MATHEMATICAL ITALIC CAPITAL GAMMA
	"\\mathsl{\\Iota}": '\uD835\uDEEA', // MATHEMATICAL ITALIC CAPITAL IOTA
	"\\mathsl{\\Kappa}": '\uD835\uDEEB', // MATHEMATICAL ITALIC CAPITAL KAPPA
	"\\mathsl{\\Lambda}": '\uD835\uDEEC', // MATHEMATICAL ITALIC CAPITAL LAMDA
	"\\mathsl{\\Omega}": '\uD835\uDEFA', // MATHEMATICAL ITALIC CAPITAL OMEGA
	"\\mathsl{\\Phi}": '\uD835\uDEF7', // MATHEMATICAL ITALIC CAPITAL PHI
	"\\mathsl{\\Pi}": '\uD835\uDEF1', // MATHEMATICAL ITALIC CAPITAL PI
	"\\mathsl{\\Psi}": '\uD835\uDEF9', // MATHEMATICAL ITALIC CAPITAL PSI
	"\\mathsl{\\Rho}": '\uD835\uDEF2', // MATHEMATICAL ITALIC CAPITAL RHO
	"\\mathsl{\\Sigma}": '\uD835\uDEF4', // MATHEMATICAL ITALIC CAPITAL SIGMA
	"\\mathsl{\\Tau}": '\uD835\uDEF5', // MATHEMATICAL ITALIC CAPITAL TAU
	"\\mathsl{\\Theta}": '\uD835\uDEE9', // MATHEMATICAL ITALIC CAPITAL THETA
	"\\mathsl{\\Upsilon}": '\uD835\uDEF6', // MATHEMATICAL ITALIC CAPITAL UPSILON
	"\\mathsl{\\Xi}": '\uD835\uDEEF', // MATHEMATICAL ITALIC CAPITAL XI
	"\\mathsl{\\Zeta}": '\uD835\uDEE7', // MATHEMATICAL ITALIC CAPITAL ZETA
	"\\mathsl{\\nabla}": '\uD835\uDEFB', // MATHEMATICAL ITALIC NABLA
	"\\mathsl{\\phi}": '\uD835\uDF19', // MATHEMATICAL ITALIC PHI SYMBOL
	"\\mathsl{\\varkappa}": '\uD835\uDF18', // MATHEMATICAL ITALIC KAPPA SYMBOL
	"\\mathsl{\\varpi}": '\uD835\uDF1B', // MATHEMATICAL ITALIC PI SYMBOL
	"\\mathsl{\\varrho}": '\uD835\uDF1A', // MATHEMATICAL ITALIC RHO SYMBOL
	"\\mathsl{\\varsigma}": '\uD835\uDF0D', // MATHEMATICAL ITALIC SMALL FINAL SIGMA
	"\\mathsl{\\vartheta}": '\uD835\uDEF3', // MATHEMATICAL ITALIC CAPITAL THETA SYMBOL
	"\\mathsl{a}": '\uD835\uDC4E', // MATHEMATICAL ITALIC SMALL A
	"\\mathsl{b}": '\uD835\uDC4F', // MATHEMATICAL ITALIC SMALL B
	"\\mathsl{c}": '\uD835\uDC50', // MATHEMATICAL ITALIC SMALL C
	"\\mathsl{d}": '\uD835\uDC51', // MATHEMATICAL ITALIC SMALL D
	"\\mathsl{e}": '\uD835\uDC52', // MATHEMATICAL ITALIC SMALL E
	"\\mathsl{f}": '\uD835\uDC53', // MATHEMATICAL ITALIC SMALL F
	"\\mathsl{g}": '\uD835\uDC54', // MATHEMATICAL ITALIC SMALL G
	"\\mathsl{i}": '\uD835\uDC56', // MATHEMATICAL ITALIC SMALL I
	"\\mathsl{j}": '\uD835\uDC57', // MATHEMATICAL ITALIC SMALL J
	"\\mathsl{k}": '\uD835\uDC58', // MATHEMATICAL ITALIC SMALL K
	"\\mathsl{l}": '\uD835\uDC59', // MATHEMATICAL ITALIC SMALL L
	"\\mathsl{m}": '\uD835\uDC5A', // MATHEMATICAL ITALIC SMALL M
	"\\mathsl{n}": '\uD835\uDC5B', // MATHEMATICAL ITALIC SMALL N
	"\\mathsl{o}": '\uD835\uDC5C', // MATHEMATICAL ITALIC SMALL O
	"\\mathsl{p}": '\uD835\uDC5D', // MATHEMATICAL ITALIC SMALL P
	"\\mathsl{q}": '\uD835\uDC5E', // MATHEMATICAL ITALIC SMALL Q
	"\\mathsl{r}": '\uD835\uDC5F', // MATHEMATICAL ITALIC SMALL R
	"\\mathsl{s}": '\uD835\uDC60', // MATHEMATICAL ITALIC SMALL S
	"\\mathsl{t}": '\uD835\uDC61', // MATHEMATICAL ITALIC SMALL T
	"\\mathsl{u}": '\uD835\uDC62', // MATHEMATICAL ITALIC SMALL U
	"\\mathsl{v}": '\uD835\uDC63', // MATHEMATICAL ITALIC SMALL V
	"\\mathsl{w}": '\uD835\uDC64', // MATHEMATICAL ITALIC SMALL W
	"\\mathsl{x}": '\uD835\uDC65', // MATHEMATICAL ITALIC SMALL X
	"\\mathsl{y}": '\uD835\uDC66', // MATHEMATICAL ITALIC SMALL Y
	"\\mathsl{z}": '\uD835\uDC67', // MATHEMATICAL ITALIC SMALL Z
	"\\mathtt{0}": '\uD835\uDFF6', // MATHEMATICAL MONOSPACE DIGIT ZERO
	"\\mathtt{1}": '\uD835\uDFF7', // MATHEMATICAL MONOSPACE DIGIT ONE
	"\\mathtt{2}": '\uD835\uDFF8', // MATHEMATICAL MONOSPACE DIGIT TWO
	"\\mathtt{3}": '\uD835\uDFF9', // MATHEMATICAL MONOSPACE DIGIT THREE
	"\\mathtt{4}": '\uD835\uDFFA', // MATHEMATICAL MONOSPACE DIGIT FOUR
	"\\mathtt{5}": '\uD835\uDFFB', // MATHEMATICAL MONOSPACE DIGIT FIVE
	"\\mathtt{6}": '\uD835\uDFFC', // MATHEMATICAL MONOSPACE DIGIT SIX
	"\\mathtt{7}": '\uD835\uDFFD', // MATHEMATICAL MONOSPACE DIGIT SEVEN
	"\\mathtt{8}": '\uD835\uDFFE', // MATHEMATICAL MONOSPACE DIGIT EIGHT
	"\\mathtt{9}": '\uD835\uDFFF', // MATHEMATICAL MONOSPACE DIGIT NINE
	"\\mathtt{A}": '\uD835\uDE70', // MATHEMATICAL MONOSPACE CAPITAL A
	"\\mathtt{B}": '\uD835\uDE71', // MATHEMATICAL MONOSPACE CAPITAL B
	"\\mathtt{C}": '\uD835\uDE72', // MATHEMATICAL MONOSPACE CAPITAL C
	"\\mathtt{D}": '\uD835\uDE73', // MATHEMATICAL MONOSPACE CAPITAL D
	"\\mathtt{E}": '\uD835\uDE74', // MATHEMATICAL MONOSPACE CAPITAL E
	"\\mathtt{F}": '\uD835\uDE75', // MATHEMATICAL MONOSPACE CAPITAL F
	"\\mathtt{G}": '\uD835\uDE76', // MATHEMATICAL MONOSPACE CAPITAL G
	"\\mathtt{H}": '\uD835\uDE77', // MATHEMATICAL MONOSPACE CAPITAL H
	"\\mathtt{I}": '\uD835\uDE78', // MATHEMATICAL MONOSPACE CAPITAL I
	"\\mathtt{J}": '\uD835\uDE79', // MATHEMATICAL MONOSPACE CAPITAL J
	"\\mathtt{K}": '\uD835\uDE7A', // MATHEMATICAL MONOSPACE CAPITAL K
	"\\mathtt{L}": '\uD835\uDE7B', // MATHEMATICAL MONOSPACE CAPITAL L
	"\\mathtt{M}": '\uD835\uDE7C', // MATHEMATICAL MONOSPACE CAPITAL M
	"\\mathtt{N}": '\uD835\uDE7D', // MATHEMATICAL MONOSPACE CAPITAL N
	"\\mathtt{O}": '\uD835\uDE7E', // MATHEMATICAL MONOSPACE CAPITAL O
	"\\mathtt{P}": '\uD835\uDE7F', // MATHEMATICAL MONOSPACE CAPITAL P
	"\\mathtt{Q}": '\uD835\uDE80', // MATHEMATICAL MONOSPACE CAPITAL Q
	"\\mathtt{R}": '\uD835\uDE81', // MATHEMATICAL MONOSPACE CAPITAL R
	"\\mathtt{S}": '\uD835\uDE82', // MATHEMATICAL MONOSPACE CAPITAL S
	"\\mathtt{T}": '\uD835\uDE83', // MATHEMATICAL MONOSPACE CAPITAL T
	"\\mathtt{U}": '\uD835\uDE84', // MATHEMATICAL MONOSPACE CAPITAL U
	"\\mathtt{V}": '\uD835\uDE85', // MATHEMATICAL MONOSPACE CAPITAL V
	"\\mathtt{W}": '\uD835\uDE86', // MATHEMATICAL MONOSPACE CAPITAL W
	"\\mathtt{X}": '\uD835\uDE87', // MATHEMATICAL MONOSPACE CAPITAL X
	"\\mathtt{Y}": '\uD835\uDE88', // MATHEMATICAL MONOSPACE CAPITAL Y
	"\\mathtt{Z}": '\uD835\uDE89', // MATHEMATICAL MONOSPACE CAPITAL Z
	"\\mathtt{a}": '\uD835\uDE8A', // MATHEMATICAL MONOSPACE SMALL A
	"\\mathtt{b}": '\uD835\uDE8B', // MATHEMATICAL MONOSPACE SMALL B
	"\\mathtt{c}": '\uD835\uDE8C', // MATHEMATICAL MONOSPACE SMALL C
	"\\mathtt{d}": '\uD835\uDE8D', // MATHEMATICAL MONOSPACE SMALL D
	"\\mathtt{e}": '\uD835\uDE8E', // MATHEMATICAL MONOSPACE SMALL E
	"\\mathtt{f}": '\uD835\uDE8F', // MATHEMATICAL MONOSPACE SMALL F
	"\\mathtt{g}": '\uD835\uDE90', // MATHEMATICAL MONOSPACE SMALL G
	"\\mathtt{h}": '\uD835\uDE91', // MATHEMATICAL MONOSPACE SMALL H
	"\\mathtt{i}": '\uD835\uDE92', // MATHEMATICAL MONOSPACE SMALL I
	"\\mathtt{j}": '\uD835\uDE93', // MATHEMATICAL MONOSPACE SMALL J
	"\\mathtt{k}": '\uD835\uDE94', // MATHEMATICAL MONOSPACE SMALL K
	"\\mathtt{l}": '\uD835\uDE95', // MATHEMATICAL MONOSPACE SMALL L
	"\\mathtt{m}": '\uD835\uDE96', // MATHEMATICAL MONOSPACE SMALL M
	"\\mathtt{n}": '\uD835\uDE97', // MATHEMATICAL MONOSPACE SMALL N
	"\\mathtt{o}": '\uD835\uDE98', // MATHEMATICAL MONOSPACE SMALL O
	"\\mathtt{p}": '\uD835\uDE99', // MATHEMATICAL MONOSPACE SMALL P
	"\\mathtt{q}": '\uD835\uDE9A', // MATHEMATICAL MONOSPACE SMALL Q
	"\\mathtt{r}": '\uD835\uDE9B', // MATHEMATICAL MONOSPACE SMALL R
	"\\mathtt{s}": '\uD835\uDE9C', // MATHEMATICAL MONOSPACE SMALL S
	"\\mathtt{t}": '\uD835\uDE9D', // MATHEMATICAL MONOSPACE SMALL T
	"\\mathtt{u}": '\uD835\uDE9E', // MATHEMATICAL MONOSPACE SMALL U
	"\\mathtt{v}": '\uD835\uDE9F', // MATHEMATICAL MONOSPACE SMALL V
	"\\mathtt{w}": '\uD835\uDEA0', // MATHEMATICAL MONOSPACE SMALL W
	"\\mathtt{x}": '\uD835\uDEA1', // MATHEMATICAL MONOSPACE SMALL X
	"\\mathtt{y}": '\uD835\uDEA2', // MATHEMATICAL MONOSPACE SMALL Y
	"\\mathtt{z}": '\uD835\uDEA3', // MATHEMATICAL MONOSPACE SMALL Z
	"\\mbfDigamma": '\uD835\uDFCA', // MATHEMATICAL BOLD CAPITAL DIGAMMA
	"\\mbfDigamma{}": '\uD835\uDFCA', // MATHEMATICAL BOLD CAPITAL DIGAMMA
	"\\mbfdigamma": '\uD835\uDFCB', // MATHEMATICAL BOLD SMALL DIGAMMA
	"\\mbfdigamma{}": '\uD835\uDFCB', // MATHEMATICAL BOLD SMALL DIGAMMA
	"\\mbox{\\texteuro}": '\u20AC', // EURO SIGN
	"\\mbox{\\texteuro}{}": '\u20AC', // EURO SIGN
	"\\mdblkdiamond": '\u2B25', // BLACK MEDIUM DIAMOND
	"\\mdblkdiamond{}": '\u2B25', // BLACK MEDIUM DIAMOND
	"\\mdblklozenge": '\u2B27', // # \blacklozenge (amssymb), BLACK MEDIUM LOZENGE
	"\\mdblklozenge{}": '\u2B27', // # \blacklozenge (amssymb), BLACK MEDIUM LOZENGE
	"\\mdsmblksquare": '\u25FE', // BLACK MEDIUM SMALL SQUARE
	"\\mdsmblksquare{}": '\u25FE', // BLACK MEDIUM SMALL SQUARE
	"\\mdsmwhtcircle": '\u26AC', // MEDIUM SMALL WHITE CIRCLE
	"\\mdsmwhtcircle{}": '\u26AC', // MEDIUM SMALL WHITE CIRCLE
	"\\mdsmwhtsquare": '\u25FD', // WHITE MEDIUM SMALL SQUARE
	"\\mdsmwhtsquare{}": '\u25FD', // WHITE MEDIUM SMALL SQUARE
	"\\mdwhtdiamond": '\u2B26', // WHITE MEDIUM DIAMOND
	"\\mdwhtdiamond{}": '\u2B26', // WHITE MEDIUM DIAMOND
	"\\mdwhtlozenge": '\u2B28', // # \lozenge (amssymb), WHITE MEDIUM LOZENGE
	"\\mdwhtlozenge{}": '\u2B28', // # \lozenge (amssymb), WHITE MEDIUM LOZENGE
	"\\measangledltosw": '\u29AF', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING LEFT AND DOWN
	"\\measangledltosw{}": '\u29AF', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING LEFT AND DOWN
	"\\measangledrtose": '\u29AE', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING RIGHT AND DOWN
	"\\measangledrtose{}": '\u29AE', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING RIGHT AND DOWN
	"\\measangleldtosw": '\u29AB', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING DOWN AND LEFT
	"\\measangleldtosw{}": '\u29AB', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING DOWN AND LEFT
	"\\measanglelutonw": '\u29A9', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING UP AND LEFT
	"\\measanglelutonw{}": '\u29A9', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING UP AND LEFT
	"\\measanglerdtose": '\u29AA', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING DOWN AND RIGHT
	"\\measanglerdtose{}": '\u29AA', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING DOWN AND RIGHT
	"\\measanglerutone": '\u29A8', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING UP AND RIGHT
	"\\measanglerutone{}": '\u29A8', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING UP AND RIGHT
	"\\measangleultonw": '\u29AD', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING LEFT AND UP
	"\\measangleultonw{}": '\u29AD', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING LEFT AND UP
	"\\measangleurtone": '\u29AC', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING RIGHT AND UP
	"\\measangleurtone{}": '\u29AC', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING RIGHT AND UP
	"\\measeq": '\u225E', // MEASURED BY (m over equals)
	"\\measeq{}": '\u225E', // MEASURED BY (m over equals)
	"\\measuredangle": '\u2221', // MEASURED ANGLE
	"\\measuredangleleft": '\u299B', // MEASURED ANGLE OPENING LEFT
	"\\measuredangleleft{}": '\u299B', // MEASURED ANGLE OPENING LEFT
	"\\measuredangle{}": '\u2221', // MEASURED ANGLE
	"\\medblackstar": '\u2B51', // black medium star
	"\\medblackstar{}": '\u2B51', // black medium star
	"\\medbullet": '\u26AB', // MEDIUM BLACK CIRCLE
	"\\medbullet{}": '\u26AB', // MEDIUM BLACK CIRCLE
	"\\medcirc": '\u26AA', // MEDIUM WHITE CIRCLE
	"\\medcirc{}": '\u26AA', // MEDIUM WHITE CIRCLE
	"\\medwhitestar": '\u2B50', // WHITE MEDIUM STAR
	"\\medwhitestar{}": '\u2B50', // WHITE MEDIUM STAR
	"\\mercury": '\u263F', // MERCURY
	"\\mercury{}": '\u263F', // MERCURY
	"\\mho": '\u2127', // INVERTED OHM SIGN
	"\\mho{}": '\u2127', // INVERTED OHM SIGN
	"\\mid": '\u2223', // DIVIDES
	"\\midbarvee": '\u2A5D', // LOGICAL OR WITH HORIZONTAL DASH
	"\\midbarvee{}": '\u2A5D', // LOGICAL OR WITH HORIZONTAL DASH
	"\\midbarwedge": '\u2A5C', // ogical and with horizontal dash
	"\\midbarwedge{}": '\u2A5C', // ogical and with horizontal dash
	"\\midcir": '\u2AF0', // VERTICAL LINE WITH CIRCLE BELOW
	"\\midcir{}": '\u2AF0', // VERTICAL LINE WITH CIRCLE BELOW
	"\\mid{}": '\u2223', // DIVIDES
	"\\minusfdots": '\u2A2B', // MINUS SIGN WITH FALLING DOTS
	"\\minusfdots{}": '\u2A2B', // MINUS SIGN WITH FALLING DOTS
	"\\minusrdots": '\u2A2C', // MINUS SIGN WITH RISING DOTS
	"\\minusrdots{}": '\u2A2C', // MINUS SIGN WITH RISING DOTS
	"\\mkern1mu": '\u200A', // HAIR SPACE
	"\\mkern1mu{}": '\u200A', // HAIR SPACE
	"\\mkern4mu": '\u205F', // MEDIUM MATHEMATICAL SPACE
	"\\mkern4mu{}": '\u205F', // MEDIUM MATHEMATICAL SPACE
	"\\mlcp": '\u2ADB', // TRANSVERSAL INTERSECTION
	"\\mlcp{}": '\u2ADB', // TRANSVERSAL INTERSECTION
	"\\modtwosum": '\u2A0A', // MODULO TWO SUM
	"\\modtwosum{}": '\u2A0A', // MODULO TWO SUM
	"\\mp": '\u2213', // MINUS-OR-PLUS SIGN
	"\\mp{}": '\u2213', // MINUS-OR-PLUS SIGN
	"\\mu": '\u03BC', // GREEK SMALL LETTER MU
	"\\multimap": '\u22B8', // MULTIMAP
	"\\multimapboth": '\u29DF', // DOUBLE-ENDED MULTIMAP
	"\\multimapboth{}": '\u29DF', // DOUBLE-ENDED MULTIMAP
	"\\multimapinv": '\u27DC', // LEFT MULTIMAP
	"\\multimapinv{}": '\u27DC', // LEFT MULTIMAP
	"\\multimap{}": '\u22B8', // MULTIMAP
	"\\mu{}": '\u03BC', // GREEK SMALL LETTER MU
	"\\nHdownarrow": '\u21DF', // DOWNWARDS ARROW WITH DOUBLE STROKE
	"\\nHdownarrow{}": '\u21DF', // DOWNWARDS ARROW WITH DOUBLE STROKE
	"\\nHuparrow": '\u21DE', // UPWARDS ARROW WITH DOUBLE STROKE
	"\\nHuparrow{}": '\u21DE', // UPWARDS ARROW WITH DOUBLE STROKE
	"\\nLeftarrow": '\u21CD', // LEFTWARDS DOUBLE ARROW WITH STROKE
	"\\nLeftarrow{}": '\u21CD', // LEFTWARDS DOUBLE ARROW WITH STROKE
	"\\nLeftrightarrow": '\u21CE', // LEFT RIGHT DOUBLE ARROW WITH STROKE
	"\\nLeftrightarrow{}": '\u21CE', // LEFT RIGHT DOUBLE ARROW WITH STROKE
	"\\nRightarrow": '\u21CF', // RIGHTWARDS DOUBLE ARROW WITH STROKE
	"\\nRightarrow{}": '\u21CF', // RIGHTWARDS DOUBLE ARROW WITH STROKE
	"\\nVDash": '\u22AF', // NEGATED DOUBLE VERTICAL BAR DOUBLE RIGHT TURNSTILE
	"\\nVDash{}": '\u22AF', // NEGATED DOUBLE VERTICAL BAR DOUBLE RIGHT TURNSTILE
	"\\nVdash": '\u22AE', // DOES NOT FORCE
	"\\nVdash{}": '\u22AE', // DOES NOT FORCE
	"\\nVleftarrow": '\u21FA', // LEFTWARDS ARROW WITH DOUBLE VERTICAL STROKE
	"\\nVleftarrowtail": '\u2B3A', // LEFTWARDS ARROW WITH TAIL WITH DOUBLE VERTICAL STROKE
	"\\nVleftarrowtail{}": '\u2B3A', // LEFTWARDS ARROW WITH TAIL WITH DOUBLE VERTICAL STROKE
	"\\nVleftarrow{}": '\u21FA', // LEFTWARDS ARROW WITH DOUBLE VERTICAL STROKE
	"\\nVleftrightarrow": '\u21FC', // LEFT RIGHT ARROW WITH DOUBLE VERTICAL STROKE, z notation finite relation
	"\\nVleftrightarrow{}": '\u21FC', // LEFT RIGHT ARROW WITH DOUBLE VERTICAL STROKE, z notation finite relation
	"\\nVtwoheadleftarrow": '\u2B35', // LEFTWARDS TWO-HEADED ARROW WITH DOUBLE VERTICAL STROKE
	"\\nVtwoheadleftarrowtail": '\u2B3D', // LEFTWARDS TWO-HEADED ARROW WITH TAIL WITH DOUBLE VERTICAL STROKE
	"\\nVtwoheadleftarrowtail{}": '\u2B3D', // LEFTWARDS TWO-HEADED ARROW WITH TAIL WITH DOUBLE VERTICAL STROKE
	"\\nVtwoheadleftarrow{}": '\u2B35', // LEFTWARDS TWO-HEADED ARROW WITH DOUBLE VERTICAL STROKE
	"\\nVtwoheadrightarrow": '\u2901', // RIGHTWARDS TWO-HEADED ARROW WITH DOUBLE VERTICAL STROKE, z notation finite surjection
	"\\nVtwoheadrightarrowtail": '\u2918', // RIGHTWARDS TWO-HEADED ARROW WITH TAIL WITH DOUBLE VERTICAL STROKE, z notation finite surjective injection
	"\\nVtwoheadrightarrowtail{}": '\u2918', // RIGHTWARDS TWO-HEADED ARROW WITH TAIL WITH DOUBLE VERTICAL STROKE, z notation finite surjective injection
	"\\nVtwoheadrightarrow{}": '\u2901', // RIGHTWARDS TWO-HEADED ARROW WITH DOUBLE VERTICAL STROKE, z notation finite surjection
	"\\nabla": '\u2207', // NABLA
	"\\nabla{}": '\u2207', // NABLA
	"\\natural": '\u266E', // MUSIC NATURAL SIGN
	"\\natural{}": '\u266E', // MUSIC NATURAL SIGN
	"\\nearrow": '\u2197', // NORTH EAST ARROW
	"\\nearrow{}": '\u2197', // NORTH EAST ARROW
	"\\neovnwarrow": '\u2931', // NORTH EAST ARROW CROSSING NORTH WEST ARROW
	"\\neovnwarrow{}": '\u2931', // NORTH EAST ARROW CROSSING NORTH WEST ARROW
	"\\neovsearrow": '\u292E', // NORTH EAST ARROW CROSSING SOUTH EAST ARROW
	"\\neovsearrow{}": '\u292E', // NORTH EAST ARROW CROSSING SOUTH EAST ARROW
	"\\neptune": '\u2646', // NEPTUNE
	"\\neptune{}": '\u2646', // NEPTUNE
	"\\neswarrow": '\u2922', // NORTH EAST AND SOUTH WEST ARROW
	"\\neswarrow{}": '\u2922', // NORTH EAST AND SOUTH WEST ARROW
	"\\neuter": '\u26B2', // NEUTER
	"\\neuter{}": '\u26B2', // NEUTER
	"\\nexists": '\u2204', // THERE DOES NOT EXIST
	"\\nexists{}": '\u2204', // THERE DOES NOT EXIST
	"\\ng": '\u014B', // LATIN SMALL LETTER ENG
	"\\ng{}": '\u014B', // LATIN SMALL LETTER ENG
	"\\nhVvert": '\u2AF5', // TRIPLE VERTICAL BAR WITH HORIZONTAL STROKE
	"\\nhVvert{}": '\u2AF5', // TRIPLE VERTICAL BAR WITH HORIZONTAL STROKE
	"\\nhpar": '\u2AF2', // PARALLEL WITH HORIZONTAL STROKE
	"\\nhpar{}": '\u2AF2', // PARALLEL WITH HORIZONTAL STROKE
	"\\ni": '\u220B', // CONTAINS AS MEMBER
	"\\niobar": '\u22FE', // SMALL CONTAINS WITH OVERBAR
	"\\niobar{}": '\u22FE', // SMALL CONTAINS WITH OVERBAR
	"\\nis": '\u22FC', // SMALL CONTAINS WITH VERTICAL BAR AT END OF HORIZONTAL STROKE
	"\\nisd": '\u22FA', // CONTAINS WITH LONG HORIZONTAL STROKE
	"\\nisd{}": '\u22FA', // CONTAINS WITH LONG HORIZONTAL STROKE
	"\\nis{}": '\u22FC', // SMALL CONTAINS WITH VERTICAL BAR AT END OF HORIZONTAL STROKE
	"\\ni{}": '\u220B', // CONTAINS AS MEMBER
	"\\nleftarrow": '\u219A', // LEFTWARDS ARROW WITH STROKE
	"\\nleftarrow{}": '\u219A', // LEFTWARDS ARROW WITH STROKE
	"\\nleftrightarrow": '\u21AE', // LEFT RIGHT ARROW WITH STROKE
	"\\nleftrightarrow{}": '\u21AE', // LEFT RIGHT ARROW WITH STROKE
	"\\nmid": '\u2224', // DOES NOT DIVIDE
	"\\nmid{}": '\u2224', // DOES NOT DIVIDE
	"\\nolinebreak": '\u2060', // WORD JOINER
	"\\nolinebreak{}": '\u2060', // WORD JOINER
	"\\not =": '\u2260', // NOT EQUAL TO
	"\\not<": '\u226E', // NOT LESS-THAN
	"\\not>": '\u226F', // NOT GREATER-THAN
	"\\not\\approx": '\u2249', // NOT ALMOST EQUAL TO
	"\\not\\approx{}": '\u2249', // NOT ALMOST EQUAL TO
	"\\not\\cong": '\u2247', // NEITHER APPROXIMATELY NOR ACTUALLY EQUAL TO
	"\\not\\cong{}": '\u2247', // NEITHER APPROXIMATELY NOR ACTUALLY EQUAL TO
	"\\not\\equiv": '\u2262', // NOT IDENTICAL TO
	"\\not\\equiv{}": '\u2262', // NOT IDENTICAL TO
	"\\not\\geq": '\u2271', // NEITHER GREATER-THAN NOR EQUAL TO
	"\\not\\geq{}": '\u2271', // NEITHER GREATER-THAN NOR EQUAL TO
	"\\not\\in": '\u2209', // NOT AN ELEMENT OF
	"\\not\\in{}": '\u2209', // NOT AN ELEMENT OF
	"\\not\\kern-0.3em\\times": '\u226D', // NOT EQUIVALENT TO
	"\\not\\kern-0.3em\\times{}": '\u226D', // NOT EQUIVALENT TO
	"\\not\\leq": '\u2270', // NEITHER LESS-THAN NOR EQUAL TO
	"\\not\\leq{}": '\u2270', // NEITHER LESS-THAN NOR EQUAL TO
	"\\not\\ni": '\u220C', // DOES NOT CONTAIN AS MEMBER
	"\\not\\ni{}": '\u220C', // DOES NOT CONTAIN AS MEMBER
	"\\not\\prec": '\u2280', // DOES NOT PRECEDE
	"\\not\\prec{}": '\u2280', // DOES NOT PRECEDE
	"\\not\\sim": '\u2241', // NOT TILDE
	"\\not\\simeq": '\u2244', // NOT ASYMPTOTICALLY EQUAL TO
	"\\not\\simeq{}": '\u2244', // NOT ASYMPTOTICALLY EQUAL TO
	"\\not\\sim{}": '\u2241', // NOT TILDE
	"\\not\\sqsubseteq": '\u22E2', // NOT SQUARE IMAGE OF OR EQUAL TO
	"\\not\\sqsubseteq{}": '\u22E2', // NOT SQUARE IMAGE OF OR EQUAL TO
	"\\not\\sqsupseteq": '\u22E3', // NOT SQUARE ORIGINAL OF OR EQUAL TO
	"\\not\\sqsupseteq{}": '\u22E3', // NOT SQUARE ORIGINAL OF OR EQUAL TO
	"\\not\\subset": '\u2284', // NOT A SUBSET OF
	"\\not\\subseteq": '\u2288', // NEITHER A SUBSET OF NOR EQUAL TO
	"\\not\\subseteq{}": '\u2288', // NEITHER A SUBSET OF NOR EQUAL TO
	"\\not\\subset{}": '\u2284', // NOT A SUBSET OF
	"\\not\\succ": '\u2281', // DOES NOT SUCCEED
	"\\not\\succ{}": '\u2281', // DOES NOT SUCCEED
	"\\not\\supset": '\u2285', // NOT A SUPERSET OF
	"\\not\\supseteq": '\u2289', // NEITHER A SUPERSET OF NOR EQUAL TO
	"\\not\\supseteq{}": '\u2289', // NEITHER A SUPERSET OF NOR EQUAL TO
	"\\not\\supset{}": '\u2285', // NOT A SUPERSET OF
	"\\notbackslash": '\u2340', // APL FUNCTIONAL SYMBOL BACKSLASH BAR
	"\\notbackslash{}": '\u2340', // APL FUNCTIONAL SYMBOL BACKSLASH BAR
	"\\notgreaterless": '\u2279', // NEITHER GREATER-THAN NOR LESS-THAN
	"\\notgreaterless{}": '\u2279', // NEITHER GREATER-THAN NOR LESS-THAN
	"\\notlessgreater": '\u2278', // NEITHER LESS-THAN NOR GREATER-THAN
	"\\notlessgreater{}": '\u2278', // NEITHER LESS-THAN NOR GREATER-THAN
	"\\notslash": '\u233F', // APL FUNCTIONAL SYMBOL SLASH BAR, solidus, bar through
	"\\notslash{}": '\u233F', // APL FUNCTIONAL SYMBOL SLASH BAR, solidus, bar through
	"\\nparallel": '\u2226', // NOT PARALLEL TO
	"\\nparallel{}": '\u2226', // NOT PARALLEL TO
	"\\npolint": '\u2A14', // LINE INTEGRATION NOT INCLUDING THE POLE
	"\\npolint{}": '\u2A14', // LINE INTEGRATION NOT INCLUDING THE POLE
	"\\npreceq": '\u22E0', // DOES NOT PRECEDE OR EQUAL
	"\\npreceq{}": '\u22E0', // DOES NOT PRECEDE OR EQUAL
	"\\nrightarrow": '\u219B', // RIGHTWARDS ARROW WITH STROKE
	"\\nrightarrow{}": '\u219B', // RIGHTWARDS ARROW WITH STROKE
	"\\nsucceq": '\u22E1', // not succeeds, curly equals
	"\\nsucceq{}": '\u22E1', // not succeeds, curly equals
	"\\ntriangleleft": '\u22EA', // NOT NORMAL SUBGROUP OF
	"\\ntrianglelefteq": '\u22EC', // NOT NORMAL SUBGROUP OF OR EQUAL TO
	"\\ntrianglelefteq{}": '\u22EC', // NOT NORMAL SUBGROUP OF OR EQUAL TO
	"\\ntriangleleft{}": '\u22EA', // NOT NORMAL SUBGROUP OF
	"\\ntriangleright": '\u22EB', // DOES NOT CONTAIN AS NORMAL SUBGROUP
	"\\ntrianglerighteq": '\u22ED', // DOES NOT CONTAIN AS NORMAL SUBGROUP OR EQUAL
	"\\ntrianglerighteq{}": '\u22ED', // DOES NOT CONTAIN AS NORMAL SUBGROUP OR EQUAL
	"\\ntriangleright{}": '\u22EB', // DOES NOT CONTAIN AS NORMAL SUBGROUP
	"\\nu": '\u03BD', // GREEK SMALL LETTER NU
	"\\nu{}": '\u03BD', // GREEK SMALL LETTER NU
	"\\nvDash": '\u22AD', // NOT TRUE
	"\\nvDash{}": '\u22AD', // NOT TRUE
	"\\nvLeftarrow": '\u2902', // LEFTWARDS DOUBLE ARROW WITH VERTICAL STROKE
	"\\nvLeftarrow{}": '\u2902', // LEFTWARDS DOUBLE ARROW WITH VERTICAL STROKE
	"\\nvLeftrightarrow": '\u2904', // LEFT RIGHT DOUBLE ARROW WITH VERTICAL STROKE
	"\\nvLeftrightarrow{}": '\u2904', // LEFT RIGHT DOUBLE ARROW WITH VERTICAL STROKE
	"\\nvRightarrow": '\u2903', // RIGHTWARDS DOUBLE ARROW WITH VERTICAL STROKE
	"\\nvRightarrow{}": '\u2903', // RIGHTWARDS DOUBLE ARROW WITH VERTICAL STROKE
	"\\nvdash": '\u22AC', // DOES NOT PROVE
	"\\nvdash{}": '\u22AC', // DOES NOT PROVE
	"\\nvinfty": '\u29DE', // INFINITY NEGATED WITH VERTICAL BAR
	"\\nvinfty{}": '\u29DE', // INFINITY NEGATED WITH VERTICAL BAR
	"\\nvleftarrow": '\u21F7', // LEFTWARDS ARROW WITH VERTICAL STROKE
	"\\nvleftarrowtail": '\u2B39', // LEFTWARDS ARROW WITH TAIL WITH VERTICAL STROKE
	"\\nvleftarrowtail{}": '\u2B39', // LEFTWARDS ARROW WITH TAIL WITH VERTICAL STROKE
	"\\nvleftarrow{}": '\u21F7', // LEFTWARDS ARROW WITH VERTICAL STROKE
	"\\nvleftrightarrow": '\u21F9', // LEFT RIGHT ARROW WITH VERTICAL STROKE, z notation partial relation
	"\\nvleftrightarrow{}": '\u21F9', // LEFT RIGHT ARROW WITH VERTICAL STROKE, z notation partial relation
	"\\nvtwoheadleftarrow": '\u2B34', // LEFTWARDS TWO-HEADED ARROW WITH VERTICAL STROKE
	"\\nvtwoheadleftarrowtail": '\u2B3C', // LEFTWARDS TWO-HEADED ARROW WITH TAIL WITH VERTICAL STROKE
	"\\nvtwoheadleftarrowtail{}": '\u2B3C', // LEFTWARDS TWO-HEADED ARROW WITH TAIL WITH VERTICAL STROKE
	"\\nvtwoheadleftarrow{}": '\u2B34', // LEFTWARDS TWO-HEADED ARROW WITH VERTICAL STROKE
	"\\nvtwoheadrightarrowtail": '\u2917', // RIGHTWARDS TWO-HEADED ARROW WITH TAIL WITH VERTICAL STROKE, z notation surjective injection
	"\\nvtwoheadrightarrowtail{}": '\u2917', // RIGHTWARDS TWO-HEADED ARROW WITH TAIL WITH VERTICAL STROKE, z notation surjective injection
	"\\nwarrow": '\u2196', // NORTH WEST ARROW
	"\\nwarrow{}": '\u2196', // NORTH WEST ARROW
	"\\nwovnearrow": '\u2932', // NORTH WEST ARROW CROSSING NORTH EAST ARROW
	"\\nwovnearrow{}": '\u2932', // NORTH WEST ARROW CROSSING NORTH EAST ARROW
	"\\nwsearrow": '\u2921', // NORTH WEST AND SOUTH EAST ARROW
	"\\nwsearrow{}": '\u2921', // NORTH WEST AND SOUTH EAST ARROW
	"\\o": '\u00F8', // LATIN SMALL LETTER O WITH STROKE
	"\\obot": '\u29BA', // CIRCLE DIVIDED BY HORIZONTAL BAR AND TOP HALF DIVIDED BY VERTICAL BAR
	"\\obot{}": '\u29BA', // CIRCLE DIVIDED BY HORIZONTAL BAR AND TOP HALF DIVIDED BY VERTICAL BAR
	"\\obrbrak": '\u23E0', // TOP TORTOISE SHELL BRACKET (mathematical use)
	"\\obrbrak{}": '\u23E0', // TOP TORTOISE SHELL BRACKET (mathematical use)
	"\\ocommatopright": '\u0315', // COMBINING COMMA ABOVE RIGHT
	"\\ocommatopright{}": '\u0315', // COMBINING COMMA ABOVE RIGHT
	"\\odiv": '\u2A38', // CIRCLED DIVISION SIGN
	"\\odiv{}": '\u2A38', // CIRCLED DIVISION SIGN
	"\\odot": '\u2299', // CIRCLED DOT OPERATOR
	"\\odotslashdot": '\u29BC', // CIRCLED ANTICLOCKWISE-ROTATED DIVISION SIGN
	"\\odotslashdot{}": '\u29BC', // CIRCLED ANTICLOCKWISE-ROTATED DIVISION SIGN
	"\\odot{}": '\u2299', // CIRCLED DOT OPERATOR
	"\\oe": '\u0153', // LATIN SMALL LIGATURE OE
	"\\oe{}": '\u0153', // LATIN SMALL LIGATURE OE
	"\\oint": '\u222E', // CONTOUR INTEGRAL
	"\\oint{}": '\u222E', // CONTOUR INTEGRAL
	"\\olcross": '\u29BB', // CIRCLE WITH SUPERIMPOSED X
	"\\olcross{}": '\u29BB', // CIRCLE WITH SUPERIMPOSED X
	"\\omega": '\u03C9', // GREEK SMALL LETTER OMEGA
	"\\omega{}": '\u03C9', // GREEK SMALL LETTER OMEGA
	"\\ominus": '\u2296', // CIRCLED MINUS
	"\\ominus{}": '\u2296', // CIRCLED MINUS
	"\\openbracketleft": '\u301A', // LEFT WHITE SQUARE BRACKET
	"\\openbracketleft{}": '\u301A', // LEFT WHITE SQUARE BRACKET
	"\\openbracketright": '\u301B', // RIGHT WHITE SQUARE BRACKET
	"\\openbracketright{}": '\u301B', // RIGHT WHITE SQUARE BRACKET
	"\\operp": '\u29B9', // CIRCLED PERPENDICULAR
	"\\operp{}": '\u29B9', // CIRCLED PERPENDICULAR
	"\\oplus": '\u2295', // CIRCLED PLUS
	"\\oplus{}": '\u2295', // CIRCLED PLUS
	"\\original": '\u22B6', // ORIGINAL OF
	"\\original{}": '\u22B6', // ORIGINAL OF
	"\\oslash": '\u2298', // CIRCLED DIVISION SLASH
	"\\oslash{}": '\u2298', // CIRCLED DIVISION SLASH
	"\\otimes": '\u2297', // CIRCLED TIMES
	"\\otimeshat": '\u2A36', // CIRCLED MULTIPLICATION SIGN WITH CIRCUMFLEX ACCENT
	"\\otimeshat{}": '\u2A36', // CIRCLED MULTIPLICATION SIGN WITH CIRCUMFLEX ACCENT
	"\\otimes{}": '\u2297', // CIRCLED TIMES
	"\\oturnedcomma": '\u0312', // COMBINING TURNED COMMA ABOVE
	"\\oturnedcomma{}": '\u0312', // COMBINING TURNED COMMA ABOVE
	"\\overbrace": '\u23DE', // TOP CURLY BRACKET (mathematical use)
	"\\overbrace{}": '\u23DE', // TOP CURLY BRACKET (mathematical use)
	"\\overbracket": '\u23B4', // TOP SQUARE BRACKET
	"\\overbracket{}": '\u23B4', // TOP SQUARE BRACKET
	"\\overleftrightarrow": '\u20E1', // COMBINING LEFT RIGHT ARROW ABOVE
	"\\overleftrightarrow{}": '\u20E1', // COMBINING LEFT RIGHT ARROW ABOVE
	"\\overline": '\u0305', // overbar embellishment
	"\\overline{}": '\u0305', // overbar embellishment
	"\\overparen": '\u23DC', // = \wideparen (yhmath mathabx fourier), TOP PARENTHESIS (mathematical use)
	"\\overparen{}": '\u23DC', // = \wideparen (yhmath mathabx fourier), TOP PARENTHESIS (mathematical use)
	"\\ovhook": '\u0309', // COMBINING HOOK ABOVE
	"\\ovhook{}": '\u0309', // COMBINING HOOK ABOVE
	"\\o{}": '\u00F8', // LATIN SMALL LETTER O WITH STROKE
	"\\parallel": '\u2225', // PARALLEL TO
	"\\parallelogramblack": '\u25B0', // BLACK PARALLELOGRAM
	"\\parallelogramblack{}": '\u25B0', // BLACK PARALLELOGRAM
	"\\parallel{}": '\u2225', // PARALLEL TO
	"\\parsim": '\u2AF3', // PARALLEL WITH TILDE OPERATOR
	"\\parsim{}": '\u2AF3', // PARALLEL WITH TILDE OPERATOR
	"\\partial": '\u2202', // PARTIAL DIFFERENTIAL
	"\\partialmeetcontraction": '\u2AA3', // double less-than with underbar
	"\\partialmeetcontraction{}": '\u2AA3', // double less-than with underbar
	"\\partial{}": '\u2202', // PARTIAL DIFFERENTIAL
	"\\pentagon": '\u2B20', // WHITE PENTAGON
	"\\pentagonblack": '\u2B1F', // BLACK PENTAGON
	"\\pentagonblack{}": '\u2B1F', // BLACK PENTAGON
	"\\pentagon{}": '\u2B20', // WHITE PENTAGON
	"\\perp": '\u22A5', // UP TACK
	"\\perps": '\u2AE1', // PERPENDICULAR WITH S
	"\\perps{}": '\u2AE1', // PERPENDICULAR WITH S
	"\\perp{}": '\u22A5', // UP TACK
	"\\perspcorrespond": '\u2306', // PERSPECTIVE
	"\\perspcorrespond{}": '\u2306', // PERSPECTIVE
	"\\pfun": '\u21F8', // RIGHTWARDS ARROW WITH VERTICAL STROKE, z notation partial function
	"\\pfun{}": '\u21F8', // RIGHTWARDS ARROW WITH VERTICAL STROKE, z notation partial function
	"\\phi": '\u03D5', // GREEK PHI SYMBOL
	"\\phi{}": '\u03D5', // GREEK PHI SYMBOL
	"\\pi": '\u03C0', // GREEK SMALL LETTER PI
	"\\pinj": '\u2914', // RIGHTWARDS ARROW WITH TAIL WITH VERTICAL STROKE, z notation partial injection
	"\\pinj{}": '\u2914', // RIGHTWARDS ARROW WITH TAIL WITH VERTICAL STROKE, z notation partial injection
	"\\pisces": '\u2653', // PISCES
	"\\pisces{}": '\u2653', // PISCES
	"\\pitchfork": '\u22D4', // PITCHFORK
	"\\pitchfork{}": '\u22D4', // PITCHFORK
	"\\pi{}": '\u03C0', // GREEK SMALL LETTER PI
	"\\pluseqq": '\u2A72', // PLUS SIGN ABOVE EQUALS SIGN
	"\\pluseqq{}": '\u2A72', // PLUS SIGN ABOVE EQUALS SIGN
	"\\plushat": '\u2A23', // PLUS SIGN WITH CIRCUMFLEX ACCENT ABOVE
	"\\plushat{}": '\u2A23', // PLUS SIGN WITH CIRCUMFLEX ACCENT ABOVE
	"\\plussim": '\u2A26', // PLUS SIGN WITH TILDE BELOW
	"\\plussim{}": '\u2A26', // PLUS SIGN WITH TILDE BELOW
	"\\plussubtwo": '\u2A27', // PLUS SIGN WITH SUBSCRIPT TWO
	"\\plussubtwo{}": '\u2A27', // PLUS SIGN WITH SUBSCRIPT TWO
	"\\plustrif": '\u2A28', // PLUS SIGN WITH BLACK TRIANGLE
	"\\plustrif{}": '\u2A28', // PLUS SIGN WITH BLACK TRIANGLE
	"\\pluto": '\u2647', // PLUTO
	"\\pluto{}": '\u2647', // PLUTO
	"\\pm": '\u00B1', // PLUS-MINUS SIGN
	"\\pm{}": '\u00B1', // PLUS-MINUS SIGN
	"\\pointint": '\u2A15', // INTEGRAL AROUND A POINT OPERATOR
	"\\pointint{}": '\u2A15', // INTEGRAL AROUND A POINT OPERATOR
	"\\postalmark": '\u3012', // POSTAL MARK
	"\\postalmark{}": '\u3012', // POSTAL MARK
	"\\prec": '\u227A', // PRECEDES
	"\\precapprox": '\u227E', // PRECEDES OR EQUIVALENT TO
	"\\precapprox{}": '\u227E', // PRECEDES OR EQUIVALENT TO
	"\\preccurlyeq": '\u227C', // PRECEDES OR EQUAL TO
	"\\preccurlyeq{}": '\u227C', // PRECEDES OR EQUAL TO
	"\\precedesnotsimilar": '\u22E8', // PRECEDES BUT NOT EQUIVALENT TO
	"\\precedesnotsimilar{}": '\u22E8', // PRECEDES BUT NOT EQUIVALENT TO
	"\\preceq": '\u2AAF', // PRECEDES ABOVE SINGLE-LINE EQUALS SIGN
	"\\preceqq": '\u2AB3', // PRECEDES ABOVE EQUALS SIGN
	"\\preceqq{}": '\u2AB3', // PRECEDES ABOVE EQUALS SIGN
	"\\preceq{}": '\u2AAF', // PRECEDES ABOVE SINGLE-LINE EQUALS SIGN
	"\\precnapprox": '\u2AB9', // PRECEDES ABOVE NOT ALMOST EQUAL TO
	"\\precnapprox{}": '\u2AB9', // PRECEDES ABOVE NOT ALMOST EQUAL TO
	"\\precneq": '\u2AB1', // PRECEDES ABOVE SINGLE-LINE NOT EQUAL TO
	"\\precneqq": '\u2AB5', // PRECEDES ABOVE NOT EQUAL TO
	"\\precneqq{}": '\u2AB5', // PRECEDES ABOVE NOT EQUAL TO
	"\\precneq{}": '\u2AB1', // PRECEDES ABOVE SINGLE-LINE NOT EQUAL TO
	"\\prec{}": '\u227A', // PRECEDES
	"\\prod": '\u220F', // N-ARY PRODUCT
	"\\prod{}": '\u220F', // N-ARY PRODUCT
	"\\profline": '\u2312', // profile of a line
	"\\profline{}": '\u2312', // profile of a line
	"\\profsurf": '\u2313', // profile of a surface
	"\\profsurf{}": '\u2313', // profile of a surface
	"\\propto": '\u221D', // PROPORTIONAL TO
	"\\propto{}": '\u221D', // PROPORTIONAL TO
	"\\prurel": '\u22B0', // element PRECEDES UNDER RELATION
	"\\prurel{}": '\u22B0', // element PRECEDES UNDER RELATION
	"\\psi": '\u03C8', // GREEK SMALL LETTER PSI
	"\\psi{}": '\u03C8', // GREEK SMALL LETTER PSI
	"\\psur": '\u2900', // = \psurj (oz), RIGHTWARDS TWO-HEADED ARROW WITH VERTICAL STROKE, z notation partial surjection
	"\\psur{}": '\u2900', // = \psurj (oz), RIGHTWARDS TWO-HEADED ARROW WITH VERTICAL STROKE, z notation partial surjection
	"\\pullback": '\u27D3', // LOWER RIGHT CORNER WITH DOT
	"\\pullback{}": '\u27D3', // LOWER RIGHT CORNER WITH DOT
	"\\pushout": '\u27D4', // UPPER LEFT CORNER WITH DOT
	"\\pushout{}": '\u27D4', // UPPER LEFT CORNER WITH DOT
	"\\qoppa": '\u03D9', // = \koppa (wrisym), t \qoppa (LGR), GREEK SMALL LETTER ARCHAIC KOPPA
	"\\qoppa{}": '\u03D9', // = \koppa (wrisym), t \qoppa (LGR), GREEK SMALL LETTER ARCHAIC KOPPA
	"\\quad": '\u2001', // emquad
	"\\quad{}": '\u2001', // emquad
	"\\quarternote": '\u2669', // QUARTER NOTE
	"\\quarternote{}": '\u2669', // QUARTER NOTE
	"\\r": '\u02DA', // RING ABOVE
	"\\rBrace": '\u2984', // RIGHT WHITE CURLY BRACKET
	"\\rBrace{}": '\u2984', // RIGHT WHITE CURLY BRACKET
	"\\radiation": '\u2622', // RADIOACTIVE SIGN
	"\\radiation{}": '\u2622', // RADIOACTIVE SIGN
	"\\rang": '\u27EB', // MATHEMATICAL RIGHT DOUBLE ANGLE BRACKET, z notation right chevron bracket
	"\\rangle": '\u232A', // RIGHT-POINTING ANGLE BRACKET
	"\\rangledot": '\u2992', // RIGHT ANGLE BRACKET WITH DOT
	"\\rangledot{}": '\u2992', // RIGHT ANGLE BRACKET WITH DOT
	"\\rangledownzigzagarrow": '\u237C', // RIGHT ANGLE WITH DOWNWARDS ZIGZAG ARROW
	"\\rangledownzigzagarrow{}": '\u237C', // RIGHT ANGLE WITH DOWNWARDS ZIGZAG ARROW
	"\\rangle{}": '\u232A', // RIGHT-POINTING ANGLE BRACKET
	"\\rang{}": '\u27EB', // MATHEMATICAL RIGHT DOUBLE ANGLE BRACKET, z notation right chevron bracket
	"\\rblkbrbrak": '\u2998', // RIGHT BLACK TORTOISE SHELL BRACKET
	"\\rblkbrbrak{}": '\u2998', // RIGHT BLACK TORTOISE SHELL BRACKET
	"\\rblot": '\u298A', // Z NOTATION RIGHT BINDING BRACKET
	"\\rblot{}": '\u298A', // Z NOTATION RIGHT BINDING BRACKET
	"\\rbrace": '}', // RIGHT CURLY BRACKET
	"\\rbracelend": '\u23AD', // RIGHT CURLY BRACKET LOWER HOOK
	"\\rbracelend{}": '\u23AD', // RIGHT CURLY BRACKET LOWER HOOK
	"\\rbracemid": '\u23AC', // RIGHT CURLY BRACKET MIDDLE PIECE
	"\\rbracemid{}": '\u23AC', // RIGHT CURLY BRACKET MIDDLE PIECE
	"\\rbraceuend": '\u23AB', // RIGHT CURLY BRACKET UPPER HOOK
	"\\rbraceuend{}": '\u23AB', // RIGHT CURLY BRACKET UPPER HOOK
	"\\rbrace{}": '}', // RIGHT CURLY BRACKET
	"\\rbrackextender": '\u23A5', // RIGHT SQUARE BRACKET EXTENSION
	"\\rbrackextender{}": '\u23A5', // RIGHT SQUARE BRACKET EXTENSION
	"\\rbracklend": '\u23A6', // RIGHT SQUARE BRACKET LOWER CORNER
	"\\rbracklend{}": '\u23A6', // RIGHT SQUARE BRACKET LOWER CORNER
	"\\rbracklrtick": '\u298E', // RIGHT SQUARE BRACKET WITH TICK IN BOTTOM CORNER
	"\\rbracklrtick{}": '\u298E', // RIGHT SQUARE BRACKET WITH TICK IN BOTTOM CORNER
	"\\rbrackubar": '\u298C', // RIGHT SQUARE BRACKET WITH UNDERBAR
	"\\rbrackubar{}": '\u298C', // RIGHT SQUARE BRACKET WITH UNDERBAR
	"\\rbrackuend": '\u23A4', // RIGHT SQUARE BRACKET UPPER CORNER
	"\\rbrackuend{}": '\u23A4', // RIGHT SQUARE BRACKET UPPER CORNER
	"\\rbrackurtick": '\u2990', // RIGHT SQUARE BRACKET WITH TICK IN TOP CORNER
	"\\rbrackurtick{}": '\u2990', // RIGHT SQUARE BRACKET WITH TICK IN TOP CORNER
	"\\rbrbrak": '\u2773', // LIGHT RIGHT TORTOISE SHELL BRACKET ORNAMENT
	"\\rbrbrak{}": '\u2773', // LIGHT RIGHT TORTOISE SHELL BRACKET ORNAMENT
	"\\rceil": '\u2309', // RIGHT CEILING
	"\\rceil{}": '\u2309', // RIGHT CEILING
	"\\rcurvyangle": '\u29FD', // right pointing curved angle bracket
	"\\rcurvyangle{}": '\u29FD', // right pointing curved angle bracket
	"\\rdiagovfdiag": '\u292B', // RISING DIAGONAL CROSSING FALLING DIAGONAL
	"\\rdiagovfdiag{}": '\u292B', // RISING DIAGONAL CROSSING FALLING DIAGONAL
	"\\rdiagovsearrow": '\u2930', // RISING DIAGONAL CROSSING SOUTH EAST ARROW
	"\\rdiagovsearrow{}": '\u2930', // RISING DIAGONAL CROSSING SOUTH EAST ARROW
	"\\recorder": '\u2315', // TELEPHONE RECORDER
	"\\recorder{}": '\u2315', // TELEPHONE RECORDER
	"\\recycle": '\u267B', // BLACK UNIVERSAL RECYCLING SYMBOL
	"\\recycle{}": '\u267B', // BLACK UNIVERSAL RECYCLING SYMBOL
	"\\revangle": '\u29A3', // REVERSED ANGLE
	"\\revangleubar": '\u29A5', // REVERSED ANGLE WITH UNDERBAR
	"\\revangleubar{}": '\u29A5', // REVERSED ANGLE WITH UNDERBAR
	"\\revangle{}": '\u29A3', // REVERSED ANGLE
	"\\revemptyset": '\u29B0', // REVERSED EMPTY SET
	"\\revemptyset{}": '\u29B0', // REVERSED EMPTY SET
	"\\revnmid": '\u2AEE', // DOES NOT DIVIDE WITH REVERSED NEGATION SLASH
	"\\revnmid{}": '\u2AEE', // DOES NOT DIVIDE WITH REVERSED NEGATION SLASH
	"\\rfbowtie": '\u29D2', // right black bowtie
	"\\rfbowtie{}": '\u29D2', // right black bowtie
	"\\rfloor": '\u230B', // RIGHT FLOOR
	"\\rfloor{}": '\u230B', // RIGHT FLOOR
	"\\rftimes": '\u29D5', // right black times
	"\\rftimes{}": '\u29D5', // right black times
	"\\rgroup": '\u27EF', // MATHEMATICAL RIGHT FLATTENED PARENTHESIS
	"\\rgroup{}": '\u27EF', // MATHEMATICAL RIGHT FLATTENED PARENTHESIS
	"\\rhd": '\u25B7', // = \rres (oz), = \RightTriangle (wrisym), (large) right triangle, open; z notation range restriction
	"\\rhd{}": '\u25B7', // = \rres (oz), = \RightTriangle (wrisym), (large) right triangle, open; z notation range restriction
	"\\rho": '\u03C1', // GREEK SMALL LETTER RHO
	"\\rho{}": '\u03C1', // GREEK SMALL LETTER RHO
	"\\rightangle": '\u221F', // RIGHT ANGLE
	"\\rightanglearc": '\u22BE', // RIGHT ANGLE WITH ARC
	"\\rightanglearc{}": '\u22BE', // RIGHT ANGLE WITH ARC
	"\\rightanglemdot": '\u299D', // MEASURED RIGHT ANGLE WITH DOT
	"\\rightanglemdot{}": '\u299D', // MEASURED RIGHT ANGLE WITH DOT
	"\\rightangle{}": '\u221F', // RIGHT ANGLE
	"\\rightarrow": '\u2192', // RIGHTWARDS ARROW
	"\\rightarrowapprox": '\u2975', // RIGHTWARDS ARROW ABOVE ALMOST EQUAL TO
	"\\rightarrowapprox{}": '\u2975', // RIGHTWARDS ARROW ABOVE ALMOST EQUAL TO
	"\\rightarrowbackapprox": '\u2B48', // RIGHTWARDS ARROW ABOVE REVERSE ALMOST EQUAL TO
	"\\rightarrowbackapprox{}": '\u2B48', // RIGHTWARDS ARROW ABOVE REVERSE ALMOST EQUAL TO
	"\\rightarrowbsimilar": '\u2B4C', // righttwards arrow above reverse tilde operator
	"\\rightarrowbsimilar{}": '\u2B4C', // righttwards arrow above reverse tilde operator
	"\\rightarrowdiamond": '\u291E', // RIGHTWARDS ARROW TO BLACK DIAMOND
	"\\rightarrowdiamond{}": '\u291E', // RIGHTWARDS ARROW TO BLACK DIAMOND
	"\\rightarrowgtr": '\u2B43', // rightwards arrow through less-than
	"\\rightarrowgtr{}": '\u2B43', // rightwards arrow through less-than
	"\\rightarrowonoplus": '\u27F4', // RIGHT ARROW WITH CIRCLED PLUS
	"\\rightarrowonoplus{}": '\u27F4', // RIGHT ARROW WITH CIRCLED PLUS
	"\\rightarrowplus": '\u2945', // RIGHTWARDS ARROW WITH PLUS BELOW
	"\\rightarrowplus{}": '\u2945', // RIGHTWARDS ARROW WITH PLUS BELOW
	"\\rightarrowsimilar": '\u2974', // RIGHTWARDS ARROW ABOVE TILDE OPERATOR
	"\\rightarrowsimilar{}": '\u2974', // RIGHTWARDS ARROW ABOVE TILDE OPERATOR
	"\\rightarrowsupset": '\u2B44', // rightwards arrow through subset
	"\\rightarrowsupset{}": '\u2B44', // rightwards arrow through subset
	"\\rightarrowtail": '\u21A3', // RIGHTWARDS ARROW WITH TAIL
	"\\rightarrowtail{}": '\u21A3', // RIGHTWARDS ARROW WITH TAIL
	"\\rightarrowtriangle": '\u21FE', // RIGHTWARDS OPEN-HEADED ARROW
	"\\rightarrowtriangle{}": '\u21FE', // RIGHTWARDS OPEN-HEADED ARROW
	"\\rightarrow{}": '\u2192', // RIGHTWARDS ARROW
	"\\rightbarharpoon": '\u296C', // RIGHTWARDS HARPOON WITH BARB UP ABOVE LONG DASH
	"\\rightbarharpoon{}": '\u296C', // RIGHTWARDS HARPOON WITH BARB UP ABOVE LONG DASH
	"\\rightbkarrow": '\u290D', // RIGHTWARDS DOUBLE DASH ARROW
	"\\rightbkarrow{}": '\u290D', // RIGHTWARDS DOUBLE DASH ARROW
	"\\rightdbltail": '\u291C', // RIGHTWARDS DOUBLE ARROW-TAIL
	"\\rightdbltail{}": '\u291C', // RIGHTWARDS DOUBLE ARROW-TAIL
	"\\rightdotarrow": '\u2911', // RIGHTWARDS ARROW WITH DOTTED STEM
	"\\rightdotarrow{}": '\u2911', // RIGHTWARDS ARROW WITH DOTTED STEM
	"\\rightharpoondown": '\u21C1', // RIGHTWARDS HARPOON WITH BARB DOWNWARDS
	"\\rightharpoondown{}": '\u21C1', // RIGHTWARDS HARPOON WITH BARB DOWNWARDS
	"\\rightharpoonup": '\u21C0', // RIGHTWARDS HARPOON WITH BARB UPWARDS
	"\\rightharpoonup{}": '\u21C0', // RIGHTWARDS HARPOON WITH BARB UPWARDS
	"\\rightleftarrows": '\u21C4', // RIGHTWARDS ARROW OVER LEFTWARDS ARROW
	"\\rightleftarrows{}": '\u21C4', // RIGHTWARDS ARROW OVER LEFTWARDS ARROW
	"\\rightleftharpoon": '\u294B', // LEFT BARB DOWN RIGHT BARB UP HARPOON
	"\\rightleftharpoons": '\u21CC', // RIGHTWARDS HARPOON OVER LEFTWARDS HARPOON
	"\\rightleftharpoonsdown": '\u2969', // RIGHTWARDS HARPOON WITH BARB DOWN ABOVE LEFTWARDS HARPOON WITH BARB DOWN
	"\\rightleftharpoonsdown{}": '\u2969', // RIGHTWARDS HARPOON WITH BARB DOWN ABOVE LEFTWARDS HARPOON WITH BARB DOWN
	"\\rightleftharpoonsup": '\u2968', // RIGHTWARDS HARPOON WITH BARB UP ABOVE LEFTWARDS HARPOON WITH BARB UP
	"\\rightleftharpoonsup{}": '\u2968', // RIGHTWARDS HARPOON WITH BARB UP ABOVE LEFTWARDS HARPOON WITH BARB UP
	"\\rightleftharpoons{}": '\u21CC', // RIGHTWARDS HARPOON OVER LEFTWARDS HARPOON
	"\\rightleftharpoon{}": '\u294B', // LEFT BARB DOWN RIGHT BARB UP HARPOON
	"\\rightmoon": '\u263D', // FIRST QUARTER MOON
	"\\rightmoon{}": '\u263D', // FIRST QUARTER MOON
	"\\rightouterjoin": '\u27D6', // RIGHT OUTER JOIN
	"\\rightouterjoin{}": '\u27D6', // RIGHT OUTER JOIN
	"\\rightpentagon": '\u2B54', // WHITE RIGHT-POINTING PENTAGON
	"\\rightpentagonblack": '\u2B53', // BLACK RIGHT-POINTING PENTAGON
	"\\rightpentagonblack{}": '\u2B53', // BLACK RIGHT-POINTING PENTAGON
	"\\rightpentagon{}": '\u2B54', // WHITE RIGHT-POINTING PENTAGON
	"\\rightrightarrows": '\u21C9', // RIGHTWARDS PAIRED ARROWS
	"\\rightrightarrows{}": '\u21C9', // RIGHTWARDS PAIRED ARROWS
	"\\rightrightharpoons": '\u2964', // RIGHTWARDS HARPOON WITH BARB UP ABOVE RIGHTWARDS HARPOON WITH BARB DOWN
	"\\rightrightharpoons{}": '\u2964', // RIGHTWARDS HARPOON WITH BARB UP ABOVE RIGHTWARDS HARPOON WITH BARB DOWN
	"\\rightslice": '\u2AA7', // GREATER-THAN CLOSED BY CURVE
	"\\rightslice{}": '\u2AA7', // GREATER-THAN CLOSED BY CURVE
	"\\rightsquigarrow": '\u21DD', // RIGHTWARDS SQUIGGLE ARROW
	"\\rightsquigarrow{}": '\u21DD', // RIGHTWARDS SQUIGGLE ARROW
	"\\righttail": '\u291A', // RIGHTWARDS ARROW-TAIL
	"\\righttail{}": '\u291A', // RIGHTWARDS ARROW-TAIL
	"\\rightthreearrows": '\u21F6', // THREE RIGHTWARDS ARROWS
	"\\rightthreearrows{}": '\u21F6', // THREE RIGHTWARDS ARROWS
	"\\rightthreetimes": '\u22CC', // RIGHT SEMIDIRECT PRODUCT
	"\\rightthreetimes{}": '\u22CC', // RIGHT SEMIDIRECT PRODUCT
	"\\rightwhitearrow": '\u21E8', // RIGHTWARDS WHITE ARROW
	"\\rightwhitearrow{}": '\u21E8', // RIGHTWARDS WHITE ARROW
	"\\rimg": '\u2988', // = \rrparenthesis (stmaryrd), Z NOTATION RIGHT IMAGE BRACKET
	"\\rimg{}": '\u2988', // = \rrparenthesis (stmaryrd), Z NOTATION RIGHT IMAGE BRACKET
	"\\ringplus": '\u2A22', // PLUS SIGN WITH SMALL CIRCLE ABOVE
	"\\ringplus{}": '\u2A22', // PLUS SIGN WITH SMALL CIRCLE ABOVE
	"\\risingdotseq": '\u2253', // IMAGE OF OR APPROXIMATELY EQUAL TO
	"\\risingdotseq{}": '\u2253', // IMAGE OF OR APPROXIMATELY EQUAL TO
	"\\rmoustache": '\u23B1', // UPPER RIGHT OR LOWER LEFT CURLY BRACKET SECTION
	"\\rmoustache{}": '\u23B1', // UPPER RIGHT OR LOWER LEFT CURLY BRACKET SECTION
	"\\rparenextender": '\u239F', // RIGHT PARENTHESIS EXTENSION
	"\\rparenextender{}": '\u239F', // RIGHT PARENTHESIS EXTENSION
	"\\rparenlend": '\u23A0', // RIGHT PARENTHESIS LOWER HOOK
	"\\rparenlend{}": '\u23A0', // RIGHT PARENTHESIS LOWER HOOK
	"\\rparenuend": '\u239E', // RIGHT PARENTHESIS UPPER HOOK
	"\\rparenuend{}": '\u239E', // RIGHT PARENTHESIS UPPER HOOK
	"\\rppolint": '\u2A12', // LINE INTEGRATION WITH RECTANGULAR PATH AROUND POLE
	"\\rppolint{}": '\u2A12', // LINE INTEGRATION WITH RECTANGULAR PATH AROUND POLE
	"\\rrbracket": '\u27E7', // = \Rbrack (mathbbol), = \rbag (oz -stmaryrd), MATHEMATICAL RIGHT WHITE SQUARE BRACKET
	"\\rrbracket{}": '\u27E7', // = \Rbrack (mathbbol), = \rbag (oz -stmaryrd), MATHEMATICAL RIGHT WHITE SQUARE BRACKET
	"\\rsolbar": '\u29F7', // REVERSE SOLIDUS WITH HORIZONTAL STROKE
	"\\rsolbar{}": '\u29F7', // REVERSE SOLIDUS WITH HORIZONTAL STROKE
	"\\rsqhook": '\u2ACE', // SQUARE RIGHT OPEN BOX OPERATOR
	"\\rsqhook{}": '\u2ACE', // SQUARE RIGHT OPEN BOX OPERATOR
	"\\rsub": '\u2A65', // = \nrres (oz), Z NOTATION RANGE ANTIRESTRICTION
	"\\rsub{}": '\u2A65', // = \nrres (oz), Z NOTATION RANGE ANTIRESTRICTION
	"\\rtimes": '\u22CA', // RIGHT NORMAL FACTOR SEMIDIRECT PRODUCT
	"\\rtimes{}": '\u22CA', // RIGHT NORMAL FACTOR SEMIDIRECT PRODUCT
	"\\rtriltri": '\u29CE', // RIGHT TRIANGLE ABOVE LEFT TRIANGLE
	"\\rtriltri{}": '\u29CE', // RIGHT TRIANGLE ABOVE LEFT TRIANGLE
	"\\rule{1em}{1pt}": '\u2015', // HORIZONTAL BAR
	"\\rvboxline": '\u23B9', // RIGHT VERTICAL BOX LINE
	"\\rvboxline{}": '\u23B9', // RIGHT VERTICAL BOX LINE
	"\\rvzigzag": '\u29D9', // RIGHT WIGGLY FENCE
	"\\rvzigzag{}": '\u29D9', // RIGHT WIGGLY FENCE
	"\\r{U}": '\u016E', // LATIN CAPITAL LETTER U WITH RING ABOVE
	"\\r{u}": '\u016F', // LATIN SMALL LETTER U WITH RING ABOVE
	"\\r{}": '\u02DA', // RING ABOVE
	"\\sagittarius": '\u2650', // SAGITTARIUS
	"\\sagittarius{}": '\u2650', // SAGITTARIUS
	"\\sampi": '\u03E1', // # \sampi (wrisym), GREEK SMALL LETTER SAMPI
	"\\sampi{}": '\u03E1', // # \sampi (wrisym), GREEK SMALL LETTER SAMPI
	"\\sansLmirrored": '\u2143', // REVERSED SANS-SERIF CAPITAL L
	"\\sansLmirrored{}": '\u2143', // REVERSED SANS-SERIF CAPITAL L
	"\\sansLturned": '\u2142', // TURNED SANS-SERIF CAPITAL L
	"\\sansLturned{}": '\u2142', // TURNED SANS-SERIF CAPITAL L
	"\\saturn": '\u2644', // SATURN
	"\\saturn{}": '\u2644', // SATURN
	"\\scorpio": '\u264F', // SCORPIUS
	"\\scorpio{}": '\u264F', // SCORPIUS
	"\\scpolint": '\u2A13', // LINE INTEGRATION WITH SEMICIRCULAR PATH AROUND POLE
	"\\scpolint{}": '\u2A13', // LINE INTEGRATION WITH SEMICIRCULAR PATH AROUND POLE
	"\\scurel": '\u22B1', // SUCCEEDS UNDER RELATION
	"\\scurel{}": '\u22B1', // SUCCEEDS UNDER RELATION
	"\\searrow": '\u2198', // SOUTH EAST ARROW
	"\\searrow{}": '\u2198', // SOUTH EAST ARROW
	"\\seovnearrow": '\u292D', // SOUTH EAST ARROW CROSSING NORTH EAST ARROW
	"\\seovnearrow{}": '\u292D', // SOUTH EAST ARROW CROSSING NORTH EAST ARROW
	"\\setminus": '\u2216', // SET MINUS
	"\\setminus{}": '\u2216', // SET MINUS
	"\\sharp": '\u266F', // MUSIC SHARP SIGN
	"\\sharp{}": '\u266F', // MUSIC SHARP SIGN
	"\\shortdowntack": '\u2ADF', // SHORT DOWN TACK
	"\\shortdowntack{}": '\u2ADF', // SHORT DOWN TACK
	"\\shortlefttack": '\u2ADE', // SHORT LEFT TACK
	"\\shortlefttack{}": '\u2ADE', // SHORT LEFT TACK
	"\\shortuptack": '\u2AE0', // SHORT UP TACK
	"\\shortuptack{}": '\u2AE0', // SHORT UP TACK
	"\\shuffle": '\u29E2', // SHUFFLE PRODUCT
	"\\shuffle{}": '\u29E2', // SHUFFLE PRODUCT
	"\\sigma": '\u03C3', // GREEK SMALL LETTER SIGMA
	"\\sigma{}": '\u03C3', // GREEK SMALL LETTER SIGMA
	"\\sim": '\u223C', // TILDE OPERATOR
	"\\sim\\joinrel\\leadsto": '\u27FF', // LONG RIGHTWARDS SQUIGGLE ARROW
	"\\sim\\joinrel\\leadsto{}": '\u27FF', // LONG RIGHTWARDS SQUIGGLE ARROW
	"\\simeq": '\u2243', // ASYMPTOTICALLY EQUAL TO
	"\\simeq{}": '\u2243', // ASYMPTOTICALLY EQUAL TO
	"\\simgE": '\u2AA0', // SIMILAR ABOVE GREATER-THAN ABOVE EQUALS SIGN
	"\\simgE{}": '\u2AA0', // SIMILAR ABOVE GREATER-THAN ABOVE EQUALS SIGN
	"\\similarleftarrow": '\u2B49', // TILDE OPERATOR ABOVE LEFTWARDS ARROW
	"\\similarleftarrow{}": '\u2B49', // TILDE OPERATOR ABOVE LEFTWARDS ARROW
	"\\similarrightarrow": '\u2972', // TILDE OPERATOR ABOVE RIGHTWARDS ARROW
	"\\similarrightarrow{}": '\u2972', // TILDE OPERATOR ABOVE RIGHTWARDS ARROW
	"\\simlE": '\u2A9F', // SIMILAR ABOVE LESS-THAN ABOVE EQUALS SIGN
	"\\simlE{}": '\u2A9F', // SIMILAR ABOVE LESS-THAN ABOVE EQUALS SIGN
	"\\simminussim": '\u2A6C', // SIMILAR MINUS SIMILAR
	"\\simminussim{}": '\u2A6C', // SIMILAR MINUS SIMILAR
	"\\simplus": '\u2A24', // PLUS SIGN WITH TILDE ABOVE
	"\\simplus{}": '\u2A24', // PLUS SIGN WITH TILDE ABOVE
	"\\simrdots": '\u2A6B', // TILDE OPERATOR WITH RISING DOTS
	"\\simrdots{}": '\u2A6B', // TILDE OPERATOR WITH RISING DOTS
	"\\sim{}": '\u223C', // TILDE OPERATOR
	"\\sixteenthnote": '\u266C', // BEAMED SIXTEENTH NOTES
	"\\sixteenthnote{}": '\u266C', // BEAMED SIXTEENTH NOTES
	"\\skull": '\u2620', // SKULL AND CROSSBONES
	"\\skull{}": '\u2620', // SKULL AND CROSSBONES
	"\\slash": '\u2215', // DIVISION SLASH
	"\\slash{}": '\u2215', // DIVISION SLASH
	"\\smallin": '\u220A', // set membership (small set membership)
	"\\smallin{}": '\u220A', // set membership (small set membership)
	"\\smallni": '\u220D', // r: contains (SMALL CONTAINS AS MEMBER)
	"\\smallni{}": '\u220D', // r: contains (SMALL CONTAINS AS MEMBER)
	"\\smashtimes": '\u2A33', // SMASH PRODUCT
	"\\smashtimes{}": '\u2A33', // SMASH PRODUCT
	"\\smblkdiamond": '\u2B29', // BLACK SMALL DIAMOND
	"\\smblkdiamond{}": '\u2B29', // BLACK SMALL DIAMOND
	"\\smblklozenge": '\u2B2A', // BLACK SMALL LOZENGE
	"\\smblklozenge{}": '\u2B2A', // BLACK SMALL LOZENGE
	"\\smeparsl": '\u29E4', // EQUALS SIGN AND SLANTED PARALLEL WITH TILDE ABOVE
	"\\smeparsl{}": '\u29E4', // EQUALS SIGN AND SLANTED PARALLEL WITH TILDE ABOVE
	"\\smile": '\u2323', // SMILE
	"\\smiley": '\u263A', // = \smileface (arevmath), WHITE SMILING FACE
	"\\smiley{}": '\u263A', // = \smileface (arevmath), WHITE SMILING FACE
	"\\smile{}": '\u2323', // SMILE
	"\\smt": '\u2AAA', // SMALLER THAN
	"\\smte": '\u2AAC', // SMALLER THAN OR EQUAL TO
	"\\smte{}": '\u2AAC', // SMALLER THAN OR EQUAL TO
	"\\smt{}": '\u2AAA', // SMALLER THAN
	"\\smwhitestar": '\u2B52', // WHITE SMALL STAR
	"\\smwhitestar{}": '\u2B52', // WHITE SMALL STAR
	"\\smwhtcircle": '\u25E6', // WHITE BULLET
	"\\smwhtcircle{}": '\u25E6', // WHITE BULLET
	"\\smwhtlozenge": '\u2B2B', // WHITE SMALL LOZENGE
	"\\smwhtlozenge{}": '\u2B2B', // WHITE SMALL LOZENGE
	"\\smwhtsquare": '\u25AB', // WHITE SMALL SQUARE
	"\\smwhtsquare{}": '\u25AB', // WHITE SMALL SQUARE
	"\\space": ' ',
	"\\space{}": ' ',
	"\\sphericalangle": '\u2222', // SPHERICAL ANGLE
	"\\sphericalangleup": '\u29A1', // SPHERICAL ANGLE OPENING UP
	"\\sphericalangleup{}": '\u29A1', // SPHERICAL ANGLE OPENING UP
	"\\sphericalangle{}": '\u2222', // SPHERICAL ANGLE
	"\\spot": '\u2981', // = \dot (oz), Z NOTATION SPOT
	"\\spot{}": '\u2981', // = \dot (oz), Z NOTATION SPOT
	"\\sqcap": '\u2293', // SQUARE CAP
	"\\sqcap{}": '\u2293', // SQUARE CAP
	"\\sqcup": '\u2294', // SQUARE CUP
	"\\sqcup{}": '\u2294', // SQUARE CUP
	"\\sqrint": '\u2A16', // QUATERNION INTEGRAL OPERATOR
	"\\sqrint{}": '\u2A16', // QUATERNION INTEGRAL OPERATOR
	"\\sqrt[3]": '\u221B', // CUBE ROOT
	"\\sqrt[4]": '\u221C', // FOURTH ROOT
	"\\sqrtbottom": '\u23B7', // RADICAL SYMBOL BOTTOM
	"\\sqrtbottom{}": '\u23B7', // RADICAL SYMBOL BOTTOM
	"\\sqsubset": '\u228F', // SQUARE IMAGE OF
	"\\sqsubseteq": '\u2291', // SQUARE IMAGE OF OR EQUAL TO
	"\\sqsubseteq{}": '\u2291', // SQUARE IMAGE OF OR EQUAL TO
	"\\sqsubsetneq": '\u22E4', // square subset, not equals
	"\\sqsubsetneq{}": '\u22E4', // square subset, not equals
	"\\sqsubset{}": '\u228F', // SQUARE IMAGE OF
	"\\sqsupset": '\u2290', // SQUARE ORIGINAL OF
	"\\sqsupseteq": '\u2292', // SQUARE ORIGINAL OF OR EQUAL TO
	"\\sqsupseteq{}": '\u2292', // SQUARE ORIGINAL OF OR EQUAL TO
	"\\sqsupset{}": '\u2290', // SQUARE ORIGINAL OF
	"\\square": '\u25A1', // WHITE SQUARE
	"\\squarebotblack": '\u2B13', // SQUARE WITH BOTTOM HALF BLACK
	"\\squarebotblack{}": '\u2B13', // SQUARE WITH BOTTOM HALF BLACK
	"\\squarecrossfill": '\u25A9', // SQUARE WITH DIAGONAL CROSSHATCH FILL
	"\\squarecrossfill{}": '\u25A9', // SQUARE WITH DIAGONAL CROSSHATCH FILL
	"\\squarehfill": '\u25A4', // square, horizontal rule filled
	"\\squarehfill{}": '\u25A4', // square, horizontal rule filled
	"\\squarehvfill": '\u25A6', // SQUARE WITH ORTHOGONAL CROSSHATCH FILL
	"\\squarehvfill{}": '\u25A6', // SQUARE WITH ORTHOGONAL CROSSHATCH FILL
	"\\squarellblack": '\u2B15', // SQUARE WITH LOWER LEFT DIAGONAL HALF BLACK
	"\\squarellblack{}": '\u2B15', // SQUARE WITH LOWER LEFT DIAGONAL HALF BLACK
	"\\squarellquad": '\u25F1', // WHITE SQUARE WITH LOWER LEFT QUADRANT
	"\\squarellquad{}": '\u25F1', // WHITE SQUARE WITH LOWER LEFT QUADRANT
	"\\squarelrquad": '\u25F2', // WHITE SQUARE WITH LOWER RIGHT QUADRANT
	"\\squarelrquad{}": '\u25F2', // WHITE SQUARE WITH LOWER RIGHT QUADRANT
	"\\squareneswfill": '\u25A8', // square, ne-to-sw rule filled
	"\\squareneswfill{}": '\u25A8', // square, ne-to-sw rule filled
	"\\squarenwsefill": '\u25A7', // square, nw-to-se rule filled
	"\\squarenwsefill{}": '\u25A7', // square, nw-to-se rule filled
	"\\squaretopblack": '\u2B12', // SQUARE WITH TOP HALF BLACK
	"\\squaretopblack{}": '\u2B12', // SQUARE WITH TOP HALF BLACK
	"\\squareulblack": '\u25E9', // square, filled top left corner
	"\\squareulblack{}": '\u25E9', // square, filled top left corner
	"\\squareulquad": '\u25F0', // WHITE SQUARE WITH UPPER LEFT QUADRANT
	"\\squareulquad{}": '\u25F0', // WHITE SQUARE WITH UPPER LEFT QUADRANT
	"\\squareurblack": '\u2B14', // SQUARE WITH UPPER RIGHT DIAGONAL HALF BLACK
	"\\squareurblack{}": '\u2B14', // SQUARE WITH UPPER RIGHT DIAGONAL HALF BLACK
	"\\squareurquad": '\u25F3', // WHITE SQUARE WITH UPPER RIGHT QUADRANT
	"\\squareurquad{}": '\u25F3', // WHITE SQUARE WITH UPPER RIGHT QUADRANT
	"\\squarevfill": '\u25A5', // square, vertical rule filled
	"\\squarevfill{}": '\u25A5', // square, vertical rule filled
	"\\square{}": '\u25A1', // WHITE SQUARE
	"\\squoval": '\u25A2', // WHITE SQUARE WITH ROUNDED CORNERS
	"\\squoval{}": '\u25A2', // WHITE SQUARE WITH ROUNDED CORNERS
	"\\ss": '\u00DF', // LATIN SMALL LETTER SHARP S
	"\\ss{}": '\u00DF', // LATIN SMALL LETTER SHARP S
	"\\stackrel{*}{=}": '\u2A6E', // EQUALS WITH ASTERISK
	"\\star": '\u22C6', // STAR OPERATOR
	"\\starequal": '\u225B', // STAR EQUALS
	"\\starequal{}": '\u225B', // STAR EQUALS
	"\\star{}": '\u22C6', // STAR OPERATOR
	"\\steaming": '\u2615', // HOT BEVERAGE
	"\\steaming{}": '\u2615', // HOT BEVERAGE
	"\\stigma": '\u03DB', // GREEK SMALL LETTER STIGMA
	"\\stigma{}": '\u03DB', // GREEK SMALL LETTER STIGMA
	"\\strns": '\u23E4', // STRAIGHTNESS
	"\\strns{}": '\u23E4', // STRAIGHTNESS
	"\\subedot": '\u2AC3', // SUBSET OF OR EQUAL TO WITH DOT ABOVE
	"\\subedot{}": '\u2AC3', // SUBSET OF OR EQUAL TO WITH DOT ABOVE
	"\\submult": '\u2AC1', // SUBSET WITH MULTIPLICATION SIGN BELOW
	"\\submult{}": '\u2AC1', // SUBSET WITH MULTIPLICATION SIGN BELOW
	"\\subrarr": '\u2979', // SUBSET ABOVE RIGHTWARDS ARROW
	"\\subrarr{}": '\u2979', // SUBSET ABOVE RIGHTWARDS ARROW
	"\\subset": '\u2282', // SUBSET OF
	"\\subsetapprox": '\u2AC9', // SUBSET OF ABOVE ALMOST EQUAL TO
	"\\subsetapprox{}": '\u2AC9', // SUBSET OF ABOVE ALMOST EQUAL TO
	"\\subsetcirc": '\u27C3', // OPEN SUBSET
	"\\subsetcirc{}": '\u27C3', // OPEN SUBSET
	"\\subsetdot": '\u2ABD', // SUBSET WITH DOT
	"\\subsetdot{}": '\u2ABD', // SUBSET WITH DOT
	"\\subseteq": '\u2286', // SUBSET OF OR EQUAL TO
	"\\subseteqq": '\u2AC5', // SUBSET OF ABOVE EQUALS SIGN
	"\\subseteqq{}": '\u2AC5', // SUBSET OF ABOVE EQUALS SIGN
	"\\subseteq{}": '\u2286', // SUBSET OF OR EQUAL TO
	"\\subsetneq": '\u228A', // SUBSET OF WITH NOT EQUAL TO
	"\\subsetneqq": '\u2ACB', // SUBSET OF ABOVE NOT EQUAL TO
	"\\subsetneqq{}": '\u2ACB', // SUBSET OF ABOVE NOT EQUAL TO
	"\\subsetneq{}": '\u228A', // SUBSET OF WITH NOT EQUAL TO
	"\\subsetplus": '\u2ABF', // SUBSET WITH PLUS SIGN BELOW
	"\\subsetplus{}": '\u2ABF', // SUBSET WITH PLUS SIGN BELOW
	"\\subset{}": '\u2282', // SUBSET OF
	"\\subsim": '\u2AC7', // SUBSET OF ABOVE TILDE OPERATOR
	"\\subsim{}": '\u2AC7', // SUBSET OF ABOVE TILDE OPERATOR
	"\\subsub": '\u2AD5', // SUBSET ABOVE SUBSET
	"\\subsub{}": '\u2AD5', // SUBSET ABOVE SUBSET
	"\\subsup": '\u2AD3', // SUBSET ABOVE SUPERSET
	"\\subsup{}": '\u2AD3', // SUBSET ABOVE SUPERSET
	"\\succ": '\u227B', // SUCCEEDS
	"\\succapprox": '\u227F', // SUCCEEDS OR EQUIVALENT TO
	"\\succapprox{}": '\u227F', // SUCCEEDS OR EQUIVALENT TO
	"\\succcurlyeq": '\u227D', // SUCCEEDS OR EQUAL TO
	"\\succcurlyeq{}": '\u227D', // SUCCEEDS OR EQUAL TO
	"\\succeq": '\u2AB0', // SUCCEEDS ABOVE SINGLE-LINE EQUALS SIGN
	"\\succeqq": '\u2AB4', // SUCCEEDS ABOVE EQUALS SIGN
	"\\succeqq{}": '\u2AB4', // SUCCEEDS ABOVE EQUALS SIGN
	"\\succeq{}": '\u2AB0', // SUCCEEDS ABOVE SINGLE-LINE EQUALS SIGN
	"\\succnapprox": '\u2ABA', // SUCCEEDS ABOVE NOT ALMOST EQUAL TO
	"\\succnapprox{}": '\u2ABA', // SUCCEEDS ABOVE NOT ALMOST EQUAL TO
	"\\succneq": '\u2AB2', // SUCCEEDS ABOVE SINGLE-LINE NOT EQUAL TO
	"\\succneqq": '\u2AB6', // SUCCEEDS ABOVE NOT EQUAL TO
	"\\succneqq{}": '\u2AB6', // SUCCEEDS ABOVE NOT EQUAL TO
	"\\succneq{}": '\u2AB2', // SUCCEEDS ABOVE SINGLE-LINE NOT EQUAL TO
	"\\succnsim": '\u22E9', // SUCCEEDS BUT NOT EQUIVALENT TO
	"\\succnsim{}": '\u22E9', // SUCCEEDS BUT NOT EQUIVALENT TO
	"\\succ{}": '\u227B', // SUCCEEDS
	"\\sum": '\u2211', // N-ARY SUMMATION
	"\\sumbottom": '\u23B3', // SUMMATION BOTTOM
	"\\sumbottom{}": '\u23B3', // SUMMATION BOTTOM
	"\\sumint": '\u2A0B', // SUMMATION WITH INTEGRAL
	"\\sumint{}": '\u2A0B', // SUMMATION WITH INTEGRAL
	"\\sumtop": '\u23B2', // SUMMATION TOP
	"\\sumtop{}": '\u23B2', // SUMMATION TOP
	"\\sum{}": '\u2211', // N-ARY SUMMATION
	"\\sun": '\u263C', // WHITE SUN WITH RAYS
	"\\sun{}": '\u263C', // WHITE SUN WITH RAYS
	"\\supdsub": '\u2AD8', // SUPERSET BESIDE AND JOINED BY DASH WITH SUBSET
	"\\supdsub{}": '\u2AD8', // SUPERSET BESIDE AND JOINED BY DASH WITH SUBSET
	"\\supedot": '\u2AC4', // SUPERSET OF OR EQUAL TO WITH DOT ABOVE
	"\\supedot{}": '\u2AC4', // SUPERSET OF OR EQUAL TO WITH DOT ABOVE
	"\\suphsol": '\u27C9', // SUPERSET PRECEDING SOLIDUS
	"\\suphsol{}": '\u27C9', // SUPERSET PRECEDING SOLIDUS
	"\\suphsub": '\u2AD7', // SUPERSET BESIDE SUBSET
	"\\suphsub{}": '\u2AD7', // SUPERSET BESIDE SUBSET
	"\\suplarr": '\u297B', // SUPERSET ABOVE LEFTWARDS ARROW
	"\\suplarr{}": '\u297B', // SUPERSET ABOVE LEFTWARDS ARROW
	"\\supmult": '\u2AC2', // SUPERSET WITH MULTIPLICATION SIGN BELOW
	"\\supmult{}": '\u2AC2', // SUPERSET WITH MULTIPLICATION SIGN BELOW
	"\\supset": '\u2283', // SUPERSET OF
	"\\supsetapprox": '\u2ACA', // SUPERSET OF ABOVE ALMOST EQUAL TO
	"\\supsetapprox{}": '\u2ACA', // SUPERSET OF ABOVE ALMOST EQUAL TO
	"\\supsetcirc": '\u27C4', // OPEN SUPERSET
	"\\supsetcirc{}": '\u27C4', // OPEN SUPERSET
	"\\supsetdot": '\u2ABE', // SUPERSET WITH DOT
	"\\supsetdot{}": '\u2ABE', // SUPERSET WITH DOT
	"\\supseteq": '\u2287', // SUPERSET OF OR EQUAL TO
	"\\supseteqq": '\u2AC6', // SUPERSET OF ABOVE EQUALS SIGN
	"\\supseteqq{}": '\u2AC6', // SUPERSET OF ABOVE EQUALS SIGN
	"\\supseteq{}": '\u2287', // SUPERSET OF OR EQUAL TO
	"\\supsetneq": '\u228B', // SUPERSET OF WITH NOT EQUAL TO
	"\\supsetneqq": '\u2ACC', // SUPERSET OF ABOVE NOT EQUAL TO
	"\\supsetneqq{}": '\u2ACC', // SUPERSET OF ABOVE NOT EQUAL TO
	"\\supsetneq{}": '\u228B', // SUPERSET OF WITH NOT EQUAL TO
	"\\supsetplus": '\u2AC0', // SUPERSET WITH PLUS SIGN BELOW
	"\\supsetplus{}": '\u2AC0', // SUPERSET WITH PLUS SIGN BELOW
	"\\supset{}": '\u2283', // SUPERSET OF
	"\\supsim": '\u2AC8', // SUPERSET OF ABOVE TILDE OPERATOR
	"\\supsim{}": '\u2AC8', // SUPERSET OF ABOVE TILDE OPERATOR
	"\\supsub": '\u2AD4', // SUPERSET ABOVE SUBSET
	"\\supsub{}": '\u2AD4', // SUPERSET ABOVE SUBSET
	"\\supsup": '\u2AD6', // SUPERSET ABOVE SUPERSET
	"\\supsup{}": '\u2AD6', // SUPERSET ABOVE SUPERSET
	"\\surd": '\u221A', // SQUARE ROOT
	"\\surd{}": '\u221A', // SQUARE ROOT
	"\\surfintegral": '\u222F', // SURFACE INTEGRAL
	"\\surfintegral{}": '\u222F', // SURFACE INTEGRAL
	"\\swarrow": '\u2199', // SOUTH WEST ARROW
	"\\swarrow{}": '\u2199', // SOUTH WEST ARROW
	"\\swords": '\u2694', // CROSSED SWORDS
	"\\swords{}": '\u2694', // CROSSED SWORDS
	"\\talloblong": '\u2AFE', // WHITE VERTICAL BAR
	"\\talloblong{}": '\u2AFE', // WHITE VERTICAL BAR
	"\\tau": '\u03C4', // GREEK SMALL LETTER TAU
	"\\taurus": '\u2649', // TAURUS
	"\\taurus{}": '\u2649', // TAURUS
	"\\tau{}": '\u03C4', // GREEK SMALL LETTER TAU
	"\\textTheta": '\u03F4', // GREEK CAPITAL THETA SYMBOL
	"\\textTheta{}": '\u03F4', // GREEK CAPITAL THETA SYMBOL
	"\\textasciiacute": '\u00B4', // ACUTE ACCENT
	"\\textasciiacute{}": '\u00B4', // ACUTE ACCENT
	"\\textasciibreve": '\u02D8', // BREVE
	"\\textasciibreve{}": '\u02D8', // BREVE
	"\\textasciicaron": '\u02C7', // CARON
	"\\textasciicaron{}": '\u02C7', // CARON
	"\\textasciidieresis": '\u00A8', // DIAERESIS
	"\\textasciidieresis{}": '\u00A8', // DIAERESIS
	"\\textasciigrave": '`',
	"\\textasciigrave{}": '`',
	"\\textasciimacron": '\u00AF', // MACRON
	"\\textasciimacron{}": '\u00AF', // MACRON
	"\\textasciitilde": '~', // TILDE
	"\\textasciitilde{}": '~', // TILDE
	"\\textbackslash": '\\', // REVERSE SOLIDUS
	"\\textbackslash{}": '\\', // REVERSE SOLIDUS
	"\\textbrokenbar": '\u00A6', // BROKEN BAR
	"\\textbrokenbar{}": '\u00A6', // BROKEN BAR
	"\\textbullet": '\u2022', // BULLET
	"\\textbullet{}": '\u2022', // BULLET
	"\\textcent": '\u00A2', // CENT SIGN
	"\\textcent{}": '\u00A2', // CENT SIGN
	"\\textcopyright": '\u00A9', // COPYRIGHT SIGN
	"\\textcopyright{}": '\u00A9', // COPYRIGHT SIGN
	"\\textcurrency": '\u00A4', // CURRENCY SIGN
	"\\textcurrency{}": '\u00A4', // CURRENCY SIGN
	"\\textdagger": '\u2020', // DAGGER
	"\\textdaggerdbl": '\u2021', // DOUBLE DAGGER
	"\\textdaggerdbl{}": '\u2021', // DOUBLE DAGGER
	"\\textdagger{}": '\u2020', // DAGGER
	"\\textdegree": '\u00B0', // DEGREE SIGN
	"\\textdegree{}": '\u00B0', // DEGREE SIGN
	"\\textdollar": '$', // DOLLAR SIGN
	"\\textdollar{}": '$', // DOLLAR SIGN
	"\\textdoublepipe": '\u01C2', // LATIN LETTER ALVEOLAR CLICK
	"\\textdoublepipe{}": '\u01C2', // LATIN LETTER ALVEOLAR CLICK
	"\\textemdash": '\u2014', // EM DASH
	"\\textemdash{}": '\u2014', // EM DASH
	"\\textendash": '\u2013', // EN DASH
	"\\textendash{}": '\u2013', // EN DASH
	"\\textexclamdown": '\u00A1', // INVERTED EXCLAMATION MARK
	"\\textexclamdown{}": '\u00A1', // INVERTED EXCLAMATION MARK
	"\\textfrac{1}{3}": '\u2153', // VULGAR FRACTION ONE THIRD
	"\\textfrac{1}{5}": '\u2155', // VULGAR FRACTION ONE FIFTH
	"\\textfrac{1}{6}": '\u2159', // VULGAR FRACTION ONE SIXTH
	"\\textfrac{1}{8}": '\u215B', // VULGAR FRACTION ONE EIGHTH
	"\\textfrac{2}{3}": '\u2154', // VULGAR FRACTION TWO THIRDS
	"\\textfrac{2}{5}": '\u2156', // VULGAR FRACTION TWO FIFTHS
	"\\textfrac{3}{5}": '\u2157', // VULGAR FRACTION THREE FIFTHS
	"\\textfrac{3}{8}": '\u215C', // VULGAR FRACTION THREE EIGHTHS
	"\\textfrac{4}{5}": '\u2158', // VULGAR FRACTION FOUR FIFTHS
	"\\textfrac{5}{6}": '\u215A', // VULGAR FRACTION FIVE SIXTHS
	"\\textfrac{5}{8}": '\u215D', // VULGAR FRACTION FIVE EIGHTHS
	"\\textfrac{7}{8}": '\u215E', // VULGAR FRACTION SEVEN EIGHTHS
	"\\texthvlig": '\u0195', // LATIN SMALL LETTER HV
	"\\texthvlig{}": '\u0195', // LATIN SMALL LETTER HV
	"\\textnrleg": '\u019E', // LATIN SMALL LETTER N WITH LONG RIGHT LEG
	"\\textnrleg{}": '\u019E', // LATIN SMALL LETTER N WITH LONG RIGHT LEG
	"\\textonehalf": '\u00BD', // VULGAR FRACTION ONE HALF
	"\\textonehalf{}": '\u00BD', // VULGAR FRACTION ONE HALF
	"\\textonequarter": '\u00BC', // VULGAR FRACTION ONE QUARTER
	"\\textonequarter{}": '\u00BC', // VULGAR FRACTION ONE QUARTER
	"\\textordfeminine": '\u00AA', // FEMININE ORDINAL INDICATOR
	"\\textordfeminine{}": '\u00AA', // FEMININE ORDINAL INDICATOR
	"\\textordmasculine": '\u00BA', // MASCULINE ORDINAL INDICATOR
	"\\textordmasculine{}": '\u00BA', // MASCULINE ORDINAL INDICATOR
	"\\textparagraph": '\u00B6', // PILCROW SIGN
	"\\textparagraph{}": '\u00B6', // PILCROW SIGN
	"\\textperiodcentered": '\u02D9', // DOT ABOVE
	"\\textperiodcentered{}": '\u02D9', // DOT ABOVE
	"\\textpertenthousand": '\u2031', // PER TEN THOUSAND SIGN
	"\\textpertenthousand{}": '\u2031', // PER TEN THOUSAND SIGN
	"\\textperthousand": '\u2030', // PER MILLE SIGN
	"\\textperthousand{}": '\u2030', // PER MILLE SIGN
	"\\textphi": '\u0278', // LATIN SMALL LETTER PHI
	"\\textphi{}": '\u0278', // LATIN SMALL LETTER PHI
	"\\textquestiondown": '\u00BF', // INVERTED QUESTION MARK
	"\\textquestiondown{}": '\u00BF', // INVERTED QUESTION MARK
	"\\textquotedblleft": '\u201C', // LEFT DOUBLE QUOTATION MARK
	"\\textquotedblleft{}": '\u201C', // LEFT DOUBLE QUOTATION MARK
	"\\textquotedblright": '\u201D', // RIGHT DOUBLE QUOTATION MARK
	"\\textquotedblright{}": '\u201D', // RIGHT DOUBLE QUOTATION MARK
	"\\textquotesingle": "'",
	"\\textquotesingle{}": "'",
	"\\textregistered": '\u00AE', // REGISTERED SIGN
	"\\textregistered{}": '\u00AE', // REGISTERED SIGN
	"\\textsection": '\u00A7', // SECTION SIGN
	"\\textsection{}": '\u00A7', // SECTION SIGN
	"\\textsterling": '\u00A3', // POUND SIGN
	"\\textsterling{}": '\u00A3', // POUND SIGN
	"\\texttheta": '\u03B8', // GREEK SMALL LETTER THETA
	"\\texttheta{}": '\u03B8', // GREEK SMALL LETTER THETA
	"\\textthreequarters": '\u00BE', // VULGAR FRACTION THREE QUARTERS
	"\\textthreequarters{}": '\u00BE', // VULGAR FRACTION THREE QUARTERS
	"\\texttildelow": '\u02DC', // SMALL TILDE
	"\\texttildelow{}": '\u02DC', // SMALL TILDE
	"\\texttimes": '\u00D7', // MULTIPLICATION SIGN
	"\\texttimes{}": '\u00D7', // MULTIPLICATION SIGN
	"\\texttrademark": '\u2122', // TRADE MARK SIGN
	"\\texttrademark{}": '\u2122', // TRADE MARK SIGN
	"\\textturnk": '\u029E', // LATIN SMALL LETTER TURNED K
	"\\textturnk{}": '\u029E', // LATIN SMALL LETTER TURNED K
	"\\textvartheta": '\u03D1', // GREEK THETA SYMBOL
	"\\textvartheta{}": '\u03D1', // GREEK THETA SYMBOL
	"\\textvisiblespace": '\u2423', // OPEN BOX
	"\\textvisiblespace{}": '\u2423', // OPEN BOX
	"\\textyen": '\u00A5', // YEN SIGN
	"\\textyen{}": '\u00A5', // YEN SIGN
	"\\th": '\u00FE', // LATIN SMALL LETTER THORN
	"\\therefore": '\u2234', // THEREFORE
	"\\therefore{}": '\u2234', // THEREFORE
	"\\thermod": '\u29E7', // THERMODYNAMIC
	"\\thermod{}": '\u29E7', // THERMODYNAMIC
	"\\threedangle": '\u27C0', // THREE DIMENSIONAL ANGLE
	"\\threedangle{}": '\u27C0', // THREE DIMENSIONAL ANGLE
	"\\threeunderdot": '\u20E8', // COMBINING TRIPLE UNDERDOT
	"\\threeunderdot{}": '\u20E8', // COMBINING TRIPLE UNDERDOT
	"\\th{}": '\u00FE', // LATIN SMALL LETTER THORN
	"\\tieinfty": '\u29DD', // TIE OVER INFINITY
	"\\tieinfty{}": '\u29DD', // TIE OVER INFINITY
	"\\tildetrpl": '\u224B', // TRIPLE TILDE
	"\\tildetrpl{}": '\u224B', // TRIPLE TILDE
	"\\timesbar": '\u2A31', // MULTIPLICATION SIGN WITH UNDERBAR
	"\\timesbar{}": '\u2A31', // MULTIPLICATION SIGN WITH UNDERBAR
	"\\tminus": '\u29FF', // MINY
	"\\tminus{}": '\u29FF', // MINY
	"\\tone{11}": '\u02E9', // MODIFIER LETTER EXTRA-LOW TONE BAR
	"\\tone{22}": '\u02E8', // MODIFIER LETTER LOW TONE BAR
	"\\tone{33}": '\u02E7', // MODIFIER LETTER MID TONE BAR
	"\\tone{44}": '\u02E6', // MODIFIER LETTER HIGH TONE BAR
	"\\tone{55}": '\u02E5', // MODIFIER LETTER EXTRA-HIGH TONE BAR
	"\\top": '\u22A4', // DOWN TACK
	"\\topbot": '\u2336', // APL FUNCTIONAL SYMBOL I-BEAM, top and bottom
	"\\topbot{}": '\u2336', // APL FUNCTIONAL SYMBOL I-BEAM, top and bottom
	"\\topcir": '\u2AF1', // DOWN TACK WITH CIRCLE BELOW
	"\\topcir{}": '\u2AF1', // DOWN TACK WITH CIRCLE BELOW
	"\\topfork": '\u2ADA', // PITCHFORK WITH TEE TOP
	"\\topfork{}": '\u2ADA', // PITCHFORK WITH TEE TOP
	"\\topsemicircle": '\u25E0', // UPPER HALF CIRCLE
	"\\topsemicircle{}": '\u25E0', // UPPER HALF CIRCLE
	"\\top{}": '\u22A4', // DOWN TACK
	"\\tplus": '\u29FE', // TINY
	"\\tplus{}": '\u29FE', // TINY
	"\\trapezium": '\u23E2', // WHITE TRAPEZIUM
	"\\trapezium{}": '\u23E2', // WHITE TRAPEZIUM
	"\\trianglecdot": '\u25EC', // triangle with centered dot
	"\\trianglecdot{}": '\u25EC', // triangle with centered dot
	"\\triangledown": '\u25BF', // WHITE DOWN-POINTING SMALL TRIANGLE
	"\\triangledown{}": '\u25BF', // WHITE DOWN-POINTING SMALL TRIANGLE
	"\\triangleleft": '\u25C3', // WHITE LEFT-POINTING SMALL TRIANGLE
	"\\triangleleftblack": '\u25ED', // UP-POINTING TRIANGLE WITH LEFT HALF BLACK
	"\\triangleleftblack{}": '\u25ED', // UP-POINTING TRIANGLE WITH LEFT HALF BLACK
	"\\trianglelefteq": '\u22B4', // NORMAL SUBGROUP OF OR EQUAL TO
	"\\trianglelefteq{}": '\u22B4', // NORMAL SUBGROUP OF OR EQUAL TO
	"\\triangleleft{}": '\u25C3', // WHITE LEFT-POINTING SMALL TRIANGLE
	"\\triangleminus": '\u2A3A', // MINUS SIGN IN TRIANGLE
	"\\triangleminus{}": '\u2A3A', // MINUS SIGN IN TRIANGLE
	"\\triangleplus": '\u2A39', // PLUS SIGN IN TRIANGLE
	"\\triangleplus{}": '\u2A39', // PLUS SIGN IN TRIANGLE
	"\\triangleq": '\u225C', // DELTA EQUAL TO
	"\\triangleq{}": '\u225C', // DELTA EQUAL TO
	"\\triangleright": '\u25B9', // WHITE RIGHT-POINTING SMALL TRIANGLE
	"\\trianglerightblack": '\u25EE', // UP-POINTING TRIANGLE WITH RIGHT HALF BLACK
	"\\trianglerightblack{}": '\u25EE', // UP-POINTING TRIANGLE WITH RIGHT HALF BLACK
	"\\trianglerighteq": '\u22B5', // CONTAINS AS NORMAL SUBGROUP OR EQUAL TO
	"\\trianglerighteq{}": '\u22B5', // CONTAINS AS NORMAL SUBGROUP OR EQUAL TO
	"\\triangleright{}": '\u25B9', // WHITE RIGHT-POINTING SMALL TRIANGLE
	"\\triangles": '\u29CC', // S IN TRIANGLE
	"\\triangleserifs": '\u29CD', // TRIANGLE WITH SERIFS AT BOTTOM
	"\\triangleserifs{}": '\u29CD', // TRIANGLE WITH SERIFS AT BOTTOM
	"\\triangles{}": '\u29CC', // S IN TRIANGLE
	"\\triangletimes": '\u2A3B', // MULTIPLICATION SIGN IN TRIANGLE
	"\\triangletimes{}": '\u2A3B', // MULTIPLICATION SIGN IN TRIANGLE
	"\\tripleplus": '\u29FB', // TRIPLE PLUS
	"\\tripleplus{}": '\u29FB', // TRIPLE PLUS
	"\\trslash": '\u2AFB', // TRIPLE SOLIDUS BINARY RELATION
	"\\trslash{}": '\u2AFB', // TRIPLE SOLIDUS BINARY RELATION
	"\\truestate": '\u22A7', // MODELS
	"\\truestate{}": '\u22A7', // MODELS
	"\\turnangle": '\u29A2', // TURNED ANGLE
	"\\turnangle{}": '\u29A2', // TURNED ANGLE
	"\\turnednot": '\u2319', // TURNED NOT SIGN
	"\\turnednot{}": '\u2319', // TURNED NOT SIGN
	"\\twocaps": '\u2A4B', // INTERSECTION BESIDE AND JOINED WITH INTERSECTION
	"\\twocaps{}": '\u2A4B', // INTERSECTION BESIDE AND JOINED WITH INTERSECTION
	"\\twocups": '\u2A4A', // UNION BESIDE AND JOINED WITH UNION
	"\\twocups{}": '\u2A4A', // UNION BESIDE AND JOINED WITH UNION
	"\\twoheaddownarrow": '\u21A1', // down two-headed arrow
	"\\twoheaddownarrow{}": '\u21A1', // down two-headed arrow
	"\\twoheadleftarrow": '\u219E', // LEFTWARDS TWO HEADED ARROW
	"\\twoheadleftarrowtail": '\u2B3B', // LEFTWARDS TWO-HEADED ARROW WITH TAIL
	"\\twoheadleftarrowtail{}": '\u2B3B', // LEFTWARDS TWO-HEADED ARROW WITH TAIL
	"\\twoheadleftarrow{}": '\u219E', // LEFTWARDS TWO HEADED ARROW
	"\\twoheadleftdbkarrow": '\u2B37', // leftwards two-headed triple-dash arrow
	"\\twoheadleftdbkarrow{}": '\u2B37', // leftwards two-headed triple-dash arrow
	"\\twoheadmapsfrom": '\u2B36', // LEFTWARDS TWO-HEADED ARROW FROM BAR
	"\\twoheadmapsfrom{}": '\u2B36', // LEFTWARDS TWO-HEADED ARROW FROM BAR
	"\\twoheadrightarrow": '\u21A0', // RIGHTWARDS TWO HEADED ARROW
	"\\twoheadrightarrow{}": '\u21A0', // RIGHTWARDS TWO HEADED ARROW
	"\\twoheaduparrow": '\u219F', // up two-headed arrow
	"\\twoheaduparrowcircle": '\u2949', // UPWARDS TWO-HEADED ARROW FROM SMALL CIRCLE
	"\\twoheaduparrowcircle{}": '\u2949', // UPWARDS TWO-HEADED ARROW FROM SMALL CIRCLE
	"\\twoheaduparrow{}": '\u219F', // up two-headed arrow
	"\\twolowline": '\u2017', // DOUBLE LOW LINE (spacing)
	"\\twolowline{}": '\u2017', // DOUBLE LOW LINE (spacing)
	"\\twonotes": '\u266B', // BEAMED EIGHTH NOTES
	"\\twonotes{}": '\u266B', // BEAMED EIGHTH NOTES
	"\\typecolon": '\u2982', // Z NOTATION TYPE COLON, (present in bbold font but no command)
	"\\typecolon{}": '\u2982', // Z NOTATION TYPE COLON, (present in bbold font but no command)
	"\\u A": '\u0102', // LATIN CAPITAL LETTER A WITH BREVE
	"\\u A{}": '\u0102', // LATIN CAPITAL LETTER A WITH BREVE
	"\\u E": '\u0114', // LATIN CAPITAL LETTER E WITH BREVE
	"\\u E{}": '\u0114', // LATIN CAPITAL LETTER E WITH BREVE
	"\\u G": '\u011E', // LATIN CAPITAL LETTER G WITH BREVE
	"\\u G{}": '\u011E', // LATIN CAPITAL LETTER G WITH BREVE
	"\\u I": '\u012C', // LATIN CAPITAL LETTER I WITH BREVE
	"\\u I{}": '\u012C', // LATIN CAPITAL LETTER I WITH BREVE
	"\\u O": '\u014E', // LATIN CAPITAL LETTER O WITH BREVE
	"\\u O{}": '\u014E', // LATIN CAPITAL LETTER O WITH BREVE
	"\\u U": '\u016C', // LATIN CAPITAL LETTER U WITH BREVE
	"\\u U{}": '\u016C', // LATIN CAPITAL LETTER U WITH BREVE
	"\\u \\i": '\u012D', // LATIN SMALL LETTER I WITH BREVE
	"\\u \\i{}": '\u012D', // LATIN SMALL LETTER I WITH BREVE
	"\\u a": '\u0103', // LATIN SMALL LETTER A WITH BREVE
	"\\u a{}": '\u0103', // LATIN SMALL LETTER A WITH BREVE
	"\\u e": '\u0115', // LATIN SMALL LETTER E WITH BREVE
	"\\u e{}": '\u0115', // LATIN SMALL LETTER E WITH BREVE
	"\\u g": '\u011F', // LATIN SMALL LETTER G WITH BREVE
	"\\u g{}": '\u011F', // LATIN SMALL LETTER G WITH BREVE
	"\\u o": '\u014F', // LATIN SMALL LETTER O WITH BREVE
	"\\u o{}": '\u014F', // LATIN SMALL LETTER O WITH BREVE
	"\\u u": '\u016D', // LATIN SMALL LETTER U WITH BREVE
	"\\u u{}": '\u016D', // LATIN SMALL LETTER U WITH BREVE
	"\\u": '\u0306', // COMBINING BREVE
	"\\ubrbrak": '\u23E1', // BOTTOM TORTOISE SHELL BRACKET (mathematical use)
	"\\ubrbrak{}": '\u23E1', // BOTTOM TORTOISE SHELL BRACKET (mathematical use)
	"\\ularc": '\u25DC', // UPPER LEFT QUADRANT CIRCULAR ARC
	"\\ularc{}": '\u25DC', // UPPER LEFT QUADRANT CIRCULAR ARC
	"\\ulblacktriangle": '\u25E4', // upper left triangle, filled
	"\\ulblacktriangle{}": '\u25E4', // upper left triangle, filled
	"\\ulcorner": '\u231C', // TOP LEFT CORNER
	"\\ulcorner{}": '\u231C', // TOP LEFT CORNER
	"\\ultriangle": '\u25F8', // UPPER LEFT TRIANGLE
	"\\ultriangle{}": '\u25F8', // UPPER LEFT TRIANGLE
	"\\uminus": '\u2A41', // UNION WITH MINUS SIGN, z notation bag subtraction
	"\\uminus{}": '\u2A41', // UNION WITH MINUS SIGN, z notation bag subtraction
	"\\underbar": '\u0331', // COMBINING MACRON BELOW
	"\\underbar{}": '\u0331', // COMBINING MACRON BELOW
	"\\underbrace": '\u23DF', // BOTTOM CURLY BRACKET (mathematical use)
	"\\underbrace{}": '\u23DF', // BOTTOM CURLY BRACKET (mathematical use)
	"\\underbracket": '\u23B5', // BOTTOM SQUARE BRACKET
	"\\underbracket{}": '\u23B5', // BOTTOM SQUARE BRACKET
	"\\underleftarrow": '\u20EE', // COMBINING LEFT ARROW BELOW
	"\\underleftarrow{}": '\u20EE', // COMBINING LEFT ARROW BELOW
	"\\underleftharpoondown": '\u20ED', // COMBINING LEFTWARDS HARPOON WITH BARB DOWNWARDS
	"\\underleftharpoondown{}": '\u20ED', // COMBINING LEFTWARDS HARPOON WITH BARB DOWNWARDS
	"\\underline": '\u0332', // COMBINING LOW LINE
	"\\underline{}": '\u0332', // COMBINING LOW LINE
	"\\underparen": '\u23DD', // BOTTOM PARENTHESIS (mathematical use)
	"\\underparen{}": '\u23DD', // BOTTOM PARENTHESIS (mathematical use)
	"\\underrightarrow": '\u20EF', // COMBINING RIGHT ARROW BELOW
	"\\underrightarrow{}": '\u20EF', // COMBINING RIGHT ARROW BELOW
	"\\underrightharpoondown": '\u20EC', // COMBINING RIGHTWARDS HARPOON WITH BARB DOWNWARDS
	"\\underrightharpoondown{}": '\u20EC', // COMBINING RIGHTWARDS HARPOON WITH BARB DOWNWARDS
	"\\uparrow": '\u2191', // UPWARDS ARROW
	"\\uparrowbarred": '\u2909', // UPWARDS ARROW WITH HORIZONTAL STROKE
	"\\uparrowbarred{}": '\u2909', // UPWARDS ARROW WITH HORIZONTAL STROKE
	"\\uparrowoncircle": '\u29BD', // UP ARROW THROUGH CIRCLE
	"\\uparrowoncircle{}": '\u29BD', // UP ARROW THROUGH CIRCLE
	"\\uparrow{}": '\u2191', // UPWARDS ARROW
	"\\updasharrow": '\u21E1', // UPWARDS DASHED ARROW
	"\\updasharrow{}": '\u21E1', // UPWARDS DASHED ARROW
	"\\updownarrow": '\u2195', // UP DOWN ARROW
	"\\updownarrowbar": '\u21A8', // UP DOWN ARROW WITH BASE (perpendicular)
	"\\updownarrowbar{}": '\u21A8', // UP DOWN ARROW WITH BASE (perpendicular)
	"\\updownarrow{}": '\u2195', // UP DOWN ARROW
	"\\updownharpoonleftright": '\u294D', // UP BARB LEFT DOWN BARB RIGHT HARPOON
	"\\updownharpoonleftright{}": '\u294D', // UP BARB LEFT DOWN BARB RIGHT HARPOON
	"\\updownharpoonrightleft": '\u294C', // UP BARB RIGHT DOWN BARB LEFT HARPOON
	"\\updownharpoonrightleft{}": '\u294C', // UP BARB RIGHT DOWN BARB LEFT HARPOON
	"\\upfishtail": '\u297E', // UP FISH TAIL
	"\\upfishtail{}": '\u297E', // UP FISH TAIL
	"\\upharpoonleft": '\u21BF', // UPWARDS HARPOON WITH BARB LEFTWARDS
	"\\upharpoonleft{}": '\u21BF', // UPWARDS HARPOON WITH BARB LEFTWARDS
	"\\upharpoonright": '\u21BE', // UPWARDS HARPOON WITH BARB RIGHTWARDS
	"\\upharpoonright{}": '\u21BE', // UPWARDS HARPOON WITH BARB RIGHTWARDS
	"\\upin": '\u27D2', // ELEMENT OF OPENING UPWARDS
	"\\upint": '\u2A1B', // INTEGRAL WITH OVERBAR
	"\\upint{}": '\u2A1B', // INTEGRAL WITH OVERBAR
	"\\upin{}": '\u27D2', // ELEMENT OF OPENING UPWARDS
	"\\uplus": '\u228E', // MULTISET UNION
	"\\uplus{}": '\u228E', // MULTISET UNION
	"\\uprightcurvearrow": '\u2934', // ARROW POINTING RIGHTWARDS THEN CURVING UPWARDS
	"\\uprightcurvearrow{}": '\u2934', // ARROW POINTING RIGHTWARDS THEN CURVING UPWARDS
	"\\upsilon": '\u03C5', // GREEK SMALL LETTER UPSILON
	"\\upsilon{}": '\u03C5', // GREEK SMALL LETTER UPSILON
	"\\upslopeellipsis": '\u22F0', // UP RIGHT DIAGONAL ELLIPSIS
	"\\upslopeellipsis{}": '\u22F0', // UP RIGHT DIAGONAL ELLIPSIS
	"\\upuparrows": '\u21C8', // UPWARDS PAIRED ARROWS
	"\\upuparrows{}": '\u21C8', // UPWARDS PAIRED ARROWS
	"\\upupharpoons": '\u2963', // UPWARDS HARPOON WITH BARB LEFT BESIDE UPWARDS HARPOON WITH BARB RIGHT
	"\\upupharpoons{}": '\u2963', // UPWARDS HARPOON WITH BARB LEFT BESIDE UPWARDS HARPOON WITH BARB RIGHT
	"\\upwhitearrow": '\u21E7', // UPWARDS WHITE ARROW
	"\\upwhitearrow{}": '\u21E7', // UPWARDS WHITE ARROW
	"\\uranus": '\u2645', // URANUS
	"\\uranus{}": '\u2645', // URANUS
	"\\urarc": '\u25DD', // UPPER RIGHT QUADRANT CIRCULAR ARC
	"\\urarc{}": '\u25DD', // UPPER RIGHT QUADRANT CIRCULAR ARC
	"\\urblacktriangle": '\u25E5', // upper right triangle, filled
	"\\urblacktriangle{}": '\u25E5', // upper right triangle, filled
	"\\urcorner": '\u231D', // TOP RIGHT CORNER
	"\\urcorner{}": '\u231D', // TOP RIGHT CORNER
	"\\urtriangle": '\u25F9', // UPPER RIGHT TRIANGLE
	"\\urtriangle{}": '\u25F9', // UPPER RIGHT TRIANGLE
	"\\utilde": '\u0330', // under tilde accent (multiple characters and non-spacing)
	"\\utilde{}": '\u0330', // under tilde accent (multiple characters and non-spacing)
	"\\u{}": '\u0306', // COMBINING BREVE
	"\\v C": '\u010C', // LATIN CAPITAL LETTER C WITH CARON
	"\\v C{}": '\u010C', // LATIN CAPITAL LETTER C WITH CARON
	"\\v D": '\u010E', // LATIN CAPITAL LETTER D WITH CARON
	"\\v D{}": '\u010E', // LATIN CAPITAL LETTER D WITH CARON
	"\\v E": '\u011A', // LATIN CAPITAL LETTER E WITH CARON
	"\\v E{}": '\u011A', // LATIN CAPITAL LETTER E WITH CARON
	"\\v L": '\u013D', // LATIN CAPITAL LETTER L WITH CARON
	"\\v L{}": '\u013D', // LATIN CAPITAL LETTER L WITH CARON
	"\\v N": '\u0147', // LATIN CAPITAL LETTER N WITH CARON
	"\\v N{}": '\u0147', // LATIN CAPITAL LETTER N WITH CARON
	"\\v R": '\u0158', // LATIN CAPITAL LETTER R WITH CARON
	"\\v R{}": '\u0158', // LATIN CAPITAL LETTER R WITH CARON
	"\\v S": '\u0160', // LATIN CAPITAL LETTER S WITH CARON
	"\\v S{}": '\u0160', // LATIN CAPITAL LETTER S WITH CARON
	"\\v T": '\u0164', // LATIN CAPITAL LETTER T WITH CARON
	"\\v T{}": '\u0164', // LATIN CAPITAL LETTER T WITH CARON
	"\\v Z": '\u017D', // LATIN CAPITAL LETTER Z WITH CARON
	"\\v Z{}": '\u017D', // LATIN CAPITAL LETTER Z WITH CARON
	"\\v c": '\u010D', // LATIN SMALL LETTER C WITH CARON
	"\\v c{}": '\u010D', // LATIN SMALL LETTER C WITH CARON
	"\\v d": '\u010F', // LATIN SMALL LETTER D WITH CARON
	"\\v d{}": '\u010F', // LATIN SMALL LETTER D WITH CARON
	"\\v e": '\u011B', // LATIN SMALL LETTER E WITH CARON
	"\\v e{}": '\u011B', // LATIN SMALL LETTER E WITH CARON
	"\\v l": '\u013E', // LATIN SMALL LETTER L WITH CARON
	"\\v l{}": '\u013E', // LATIN SMALL LETTER L WITH CARON
	"\\v n": '\u0148', // LATIN SMALL LETTER N WITH CARON
	"\\v n{}": '\u0148', // LATIN SMALL LETTER N WITH CARON
	"\\v r": '\u0159', // LATIN SMALL LETTER R WITH CARON
	"\\v r{}": '\u0159', // LATIN SMALL LETTER R WITH CARON
	"\\v s": '\u0161', // LATIN SMALL LETTER S WITH CARON
	"\\v s{}": '\u0161', // LATIN SMALL LETTER S WITH CARON
	"\\v t": '\u0165', // LATIN SMALL LETTER T WITH CARON
	"\\v t{}": '\u0165', // LATIN SMALL LETTER T WITH CARON
	"\\v z": '\u017E', // LATIN SMALL LETTER Z WITH CARON
	"\\v z{}": '\u017E', // LATIN SMALL LETTER Z WITH CARON
	"\\v": '\u030C', // COMBINING CARON
	"\\vBar": '\u2AE8', // SHORT UP TACK WITH UNDERBAR
	"\\vBarv": '\u2AE9', // SHORT UP TACK ABOVE SHORT DOWN TACK
	"\\vBarv{}": '\u2AE9', // SHORT UP TACK ABOVE SHORT DOWN TACK
	"\\vBar{}": '\u2AE8', // SHORT UP TACK WITH UNDERBAR
	"\\vDdash": '\u2AE2', // VERTICAL BAR TRIPLE RIGHT TURNSTILE
	"\\vDdash{}": '\u2AE2', // VERTICAL BAR TRIPLE RIGHT TURNSTILE
	"\\varVdash": '\u2AE6', // LONG DASH FROM LEFT MEMBER OF DOUBLE VERTICAL
	"\\varVdash{}": '\u2AE6', // LONG DASH FROM LEFT MEMBER OF DOUBLE VERTICAL
	"\\varcarriagereturn": '\u23CE', // RETURN SYMBOL
	"\\varcarriagereturn{}": '\u23CE', // RETURN SYMBOL
	"\\varclubsuit": '\u2667', // = \varclub (arevmath), club, white (card suit)
	"\\varclubsuit{}": '\u2667', // = \varclub (arevmath), club, white (card suit)
	"\\varepsilon": '\u025B', // LATIN SMALL LETTER OPEN E
	"\\varepsilon{}": '\u025B', // LATIN SMALL LETTER OPEN E
	"\\varhexagon": '\u2B21', // WHITE HEXAGON
	"\\varhexagonblack": '\u2B22', // BLACK HEXAGON
	"\\varhexagonblack{}": '\u2B22', // BLACK HEXAGON
	"\\varhexagonlrbonds": '\u232C', // six carbon ring, corner down, double bonds lower right etc
	"\\varhexagonlrbonds{}": '\u232C', // six carbon ring, corner down, double bonds lower right etc
	"\\varhexagon{}": '\u2B21', // WHITE HEXAGON
	"\\varisins": '\u22F3', // ELEMENT OF WITH VERTICAL BAR AT END OF HORIZONTAL STROKE
	"\\varisins{}": '\u22F3', // ELEMENT OF WITH VERTICAL BAR AT END OF HORIZONTAL STROKE
	"\\varkappa": '\u03F0', // GREEK KAPPA SYMBOL
	"\\varkappa{}": '\u03F0', // GREEK KAPPA SYMBOL
	"\\varlrtriangle": '\u22BF', // RIGHT TRIANGLE
	"\\varlrtriangle{}": '\u22BF', // RIGHT TRIANGLE
	"\\varniobar": '\u22FD', // CONTAINS WITH OVERBAR
	"\\varniobar{}": '\u22FD', // CONTAINS WITH OVERBAR
	"\\varnis": '\u22FB', // CONTAINS WITH VERTICAL BAR AT END OF HORIZONTAL STROKE
	"\\varnis{}": '\u22FB', // CONTAINS WITH VERTICAL BAR AT END OF HORIZONTAL STROKE
	"\\varnothing": '\u2205', // EMPTY SET
	"\\varnothing{}": '\u2205', // EMPTY SET
	"\\varphi": '\u03C6', // GREEK SMALL LETTER PHI
	"\\varphi{}": '\u03C6', // GREEK SMALL LETTER PHI
	"\\varpi": '\u03D6', // GREEK PI SYMBOL
	"\\varpi{}": '\u03D6', // GREEK PI SYMBOL
	"\\varprod": '\u2A09', // N-ARY TIMES OPERATOR
	"\\varprod{}": '\u2A09', // N-ARY TIMES OPERATOR
	"\\varrho": '\u03F1', // GREEK RHO SYMBOL
	"\\varrho{}": '\u03F1', // GREEK RHO SYMBOL
	"\\varsigma": '\u03C2', // GREEK SMALL LETTER FINAL SIGMA
	"\\varsigma{}": '\u03C2', // GREEK SMALL LETTER FINAL SIGMA
	"\\varspadesuit": '\u2664', // = \varspade (arevmath), spade, white (card suit)
	"\\varspadesuit{}": '\u2664', // = \varspade (arevmath), spade, white (card suit)
	"\\vartriangle": '\u25B5', // WHITE UP-POINTING SMALL TRIANGLE
	"\\vartriangleleft": '\u22B2', // NORMAL SUBGROUP OF
	"\\vartriangleleft{}": '\u22B2', // NORMAL SUBGROUP OF
	"\\vartriangleright": '\u22B3', // CONTAINS AS NORMAL SUBGROUP
	"\\vartriangleright{}": '\u22B3', // CONTAINS AS NORMAL SUBGROUP
	"\\vartriangle{}": '\u25B5', // WHITE UP-POINTING SMALL TRIANGLE
	"\\varveebar": '\u2A61', // SMALL VEE WITH UNDERBAR
	"\\varveebar{}": '\u2A61', // SMALL VEE WITH UNDERBAR
	"\\vbraceextender": '\u23AA', // CURLY BRACKET EXTENSION
	"\\vbraceextender{}": '\u23AA', // CURLY BRACKET EXTENSION
	"\\vdash": '\u22A2', // RIGHT TACK
	"\\vdash{}": '\u22A2', // RIGHT TACK
	"\\vdots": '\u22EE', // VERTICAL ELLIPSIS
	"\\vdots{}": '\u22EE', // VERTICAL ELLIPSIS
	"\\vec": '\u20D1', // COMBINING RIGHT HARPOON ABOVE
	"\\vec{}": '\u20D1', // COMBINING RIGHT HARPOON ABOVE
	"\\vee": '\u2228', // LOGICAL OR
	"\\veebar": '\u22BB', // XOR
	"\\veebar{}": '\u22BB', // XOR
	"\\veedot": '\u27C7', // OR WITH DOT INSIDE
	"\\veedot{}": '\u27C7', // OR WITH DOT INSIDE
	"\\veemidvert": '\u2A5B', // LOGICAL OR WITH MIDDLE STEM
	"\\veemidvert{}": '\u2A5B', // LOGICAL OR WITH MIDDLE STEM
	"\\veeodot": '\u2A52', // LOGICAL OR WITH DOT ABOVE
	"\\veeodot{}": '\u2A52', // LOGICAL OR WITH DOT ABOVE
	"\\veeonwedge": '\u2A59', // LOGICAL OR OVERLAPPING LOGICAL AND
	"\\veeonwedge{}": '\u2A59', // LOGICAL OR OVERLAPPING LOGICAL AND
	"\\vee{}": '\u2228', // LOGICAL OR
	"\\venus": '\u2640', // FEMALE SIGN
	"\\venus{}": '\u2640', // FEMALE SIGN
	"\\vertoverlay": '\u20D2', // COMBINING LONG VERTICAL LINE OVERLAY
	"\\vertoverlay{}": '\u20D2', // COMBINING LONG VERTICAL LINE OVERLAY
	"\\verymuchgreater": '\u22D9', // VERY MUCH GREATER-THAN
	"\\verymuchgreater{}": '\u22D9', // VERY MUCH GREATER-THAN
	"\\verymuchless": '\u22D8', // VERY MUCH LESS-THAN
	"\\verymuchless{}": '\u22D8', // VERY MUCH LESS-THAN
	"\\viewdata": '\u2317', // VIEWDATA SQUARE
	"\\viewdata{}": '\u2317', // VIEWDATA SQUARE
	"\\virgo": '\u264D', // VIRGO
	"\\virgo{}": '\u264D', // VIRGO
	"\\vlongdash": '\u27DD', // long left tack
	"\\vlongdash{}": '\u27DD', // long left tack
	"\\volintegral": '\u2230', // VOLUME INTEGRAL
	"\\volintegral{}": '\u2230', // VOLUME INTEGRAL
	"\\vrectangleblack": '\u25AE', // BLACK VERTICAL RECTANGLE
	"\\vrectangleblack{}": '\u25AE', // BLACK VERTICAL RECTANGLE
	"\\vysmblksquare": '\u2B1D', // # \centerdot (amssymb), t \Squaredot (marvosym), BLACK VERY SMALL SQUARE
	"\\vysmblksquare{}": '\u2B1D', // # \centerdot (amssymb), t \Squaredot (marvosym), BLACK VERY SMALL SQUARE
	"\\vysmwhtsquare": '\u2B1E', // WHITE VERY SMALL SQUARE
	"\\vysmwhtsquare{}": '\u2B1E', // WHITE VERY SMALL SQUARE
	"\\vzigzag": '\u299A', // VERTICAL ZIGZAG LINE
	"\\vzigzag{}": '\u299A', // VERTICAL ZIGZAG LINE
	"\\v{}": '\u030C', // COMBINING CARON
	"\\warning": '\u26A0', // WARNING SIGN
	"\\warning{}": '\u26A0', // WARNING SIGN
	"\\wasylozenge": '\u2311', // SQUARE LOZENGE
	"\\wasylozenge{}": '\u2311', // SQUARE LOZENGE
	"\\wedge": '\u2227', // LOGICAL AND
	"\\wedgedot": '\u27D1', // AND WITH DOT
	"\\wedgedot{}": '\u27D1', // AND WITH DOT
	"\\wedgedoublebar": '\u2A60', // LOGICAL AND WITH DOUBLE UNDERBAR
	"\\wedgedoublebar{}": '\u2A60', // LOGICAL AND WITH DOUBLE UNDERBAR
	"\\wedgemidvert": '\u2A5A', // LOGICAL AND WITH MIDDLE STEM
	"\\wedgemidvert{}": '\u2A5A', // LOGICAL AND WITH MIDDLE STEM
	"\\wedgeodot": '\u2A51', // LOGICAL AND WITH DOT ABOVE
	"\\wedgeodot{}": '\u2A51', // LOGICAL AND WITH DOT ABOVE
	"\\wedge{}": '\u2227', // LOGICAL AND
	"\\whitearrowupfrombar": '\u21EA', // UPWARDS WHITE ARROW FROM BAR
	"\\whitearrowupfrombar{}": '\u21EA', // UPWARDS WHITE ARROW FROM BAR
	"\\whiteinwhitetriangle": '\u27C1', // WHITE TRIANGLE CONTAINING SMALL WHITE TRIANGLE
	"\\whiteinwhitetriangle{}": '\u27C1', // WHITE TRIANGLE CONTAINING SMALL WHITE TRIANGLE
	"\\whitepointerleft": '\u25C5', // # \triangleleft (mathabx), WHITE LEFT-POINTING POINTER
	"\\whitepointerleft{}": '\u25C5', // # \triangleleft (mathabx), WHITE LEFT-POINTING POINTER
	"\\whitepointerright": '\u25BB', // # \triangleright (mathabx), WHITE RIGHT-POINTING POINTER
	"\\whitepointerright{}": '\u25BB', // # \triangleright (mathabx), WHITE RIGHT-POINTING POINTER
	"\\whitesquaretickleft": '\u27E4', // WHITE SQUARE WITH LEFTWARDS TICK
	"\\whitesquaretickleft{}": '\u27E4', // WHITE SQUARE WITH LEFTWARDS TICK
	"\\whitesquaretickright": '\u27E5', // WHITE SQUARE WITH RIGHTWARDS TICK
	"\\whitesquaretickright{}": '\u27E5', // WHITE SQUARE WITH RIGHTWARDS TICK
	"\\whthorzoval": '\u2B2D', // WHITE HORIZONTAL ELLIPSE
	"\\whthorzoval{}": '\u2B2D', // WHITE HORIZONTAL ELLIPSE
	"\\whtvertoval": '\u2B2F', // WHITE VERTICAL ELLIPSE
	"\\whtvertoval{}": '\u2B2F', // WHITE VERTICAL ELLIPSE
	"\\wideangledown": '\u29A6', // OBLIQUE ANGLE OPENING UP
	"\\wideangledown{}": '\u29A6', // OBLIQUE ANGLE OPENING UP
	"\\wideangleup": '\u29A7', // OBLIQUE ANGLE OPENING DOWN
	"\\wideangleup{}": '\u29A7', // OBLIQUE ANGLE OPENING DOWN
	"\\widebridgeabove": '\u20E9', // COMBINING WIDE BRIDGE ABOVE
	"\\widebridgeabove{}": '\u20E9', // COMBINING WIDE BRIDGE ABOVE
	"\\wp": '\u2118', // SCRIPT CAPITAL P
	"\\wp{}": '\u2118', // SCRIPT CAPITAL P
	"\\wr": '\u2240', // WREATH PRODUCT
	"\\wr{}": '\u2240', // WREATH PRODUCT
	"\\xi": '\u03BE', // GREEK SMALL LETTER XI
	"\\xi{}": '\u03BE', // GREEK SMALL LETTER XI
	"\\xsol": '\u29F8', // BIG SOLIDUS
	"\\xsol{}": '\u29F8', // BIG SOLIDUS
	"\\yinyang": '\u262F', // YIN YANG
	"\\yinyang{}": '\u262F', // YIN YANG
	"\\zcmp": '\u2A1F', // = \semi (oz), = \fatsemi (stmaryrd), Z NOTATION SCHEMA COMPOSITION
	"\\zcmp{}": '\u2A1F', // = \semi (oz), = \fatsemi (stmaryrd), Z NOTATION SCHEMA COMPOSITION
	"\\zeta": '\u03B6', // GREEK SMALL LETTER ZETA
	"\\zeta{}": '\u03B6', // GREEK SMALL LETTER ZETA
	"\\zhide": '\u29F9', // = \hide (oz), BIG REVERSE SOLIDUS, z notation schema hiding
	"\\zhide{}": '\u29F9', // = \hide (oz), BIG REVERSE SOLIDUS, z notation schema hiding
	"\\zpipe": '\u2A20', // Z NOTATION SCHEMA PIPING
	"\\zpipe{}": '\u2A20', // Z NOTATION SCHEMA PIPING
	"\\zproject": '\u2A21', // = \project (oz), Z NOTATION SCHEMA PROJECTION
	"\\zproject{}": '\u2A21', // = \project (oz), Z NOTATION SCHEMA PROJECTION
	"\\{": '{',
	"\\}": '}',
	"\\~": '\u0303', // COMBINING TILDE
	"\\~A": '\u00C3', // LATIN CAPITAL LETTER A WITH TILDE
	"\\~I": '\u0128', // LATIN CAPITAL LETTER I WITH TILDE
	"\\~N": '\u00D1', // LATIN CAPITAL LETTER N WITH TILDE
	"\\~O": '\u00D5', // LATIN CAPITAL LETTER O WITH TILDE
	"\\~U": '\u0168', // LATIN CAPITAL LETTER U WITH TILDE
	"\\~\\i": '\u0129', // LATIN SMALL LETTER I WITH TILDE
	"\\~\\i{}": '\u0129', // LATIN SMALL LETTER I WITH TILDE
	"\\~a": '\u00E3', // LATIN SMALL LETTER A WITH TILDE
	"\\~n": '\u00F1', // LATIN SMALL LETTER N WITH TILDE
	"\\~o": '\u00F5', // LATIN SMALL LETTER O WITH TILDE
	"\\~u": '\u0169', // LATIN SMALL LETTER U WITH TILDE
	"\\~{A}": '\u00C3', // LATIN CAPITAL LETTER A WITH TILDE
	"\\~{I}": '\u0128', // LATIN CAPITAL LETTER I WITH TILDE
	"\\~{N}": '\u00D1', // LATIN CAPITAL LETTER N WITH TILDE
	"\\~{O}": '\u00D5', // LATIN CAPITAL LETTER O WITH TILDE
	"\\~{U}": '\u0168', // LATIN CAPITAL LETTER U WITH TILDE
	"\\~{a}": '\u00E3', // LATIN SMALL LETTER A WITH TILDE
	"\\~{n}": '\u00F1', // LATIN SMALL LETTER N WITH TILDE
	"\\~{o}": '\u00F5', // LATIN SMALL LETTER O WITH TILDE
	"\\~{u}": '\u0169', // LATIN SMALL LETTER U WITH TILDE
	"^1": '\u00B9', // SUPERSCRIPT ONE
	"^2": '\u00B2', // SUPERSCRIPT TWO
	"^3": '\u00B3', // SUPERSCRIPT THREE
	"^\\circ": '\u00B0',
	"^\\circ{}": '\u00B0',
	"`": '\u2018', // LEFT SINGLE QUOTATION MARK
	"``": '\u201C',
	"ffi{}": '\uFB03', // LATIN SMALL LIGATURE FFI
	"ffl{}": '\uFB04', // LATIN SMALL LIGATURE FFL
	"ff{}": '\uFB00', // LATIN SMALL LIGATURE FF
	"fi{}": '\uFB01', // LATIN SMALL LIGATURE FI
	"fl{}": '\uFB02', // LATIN SMALL LIGATURE FL
	"f{}": '\u0192', // LATIN SMALL LETTER F WITH HOOK
	"g{}": '\u0261', // LATIN SMALL LETTER SCRIPT G
	"ij{}": '\u0133', // LATIN SMALL LIGATURE IJ
	"o{}": '\u03BF', // GREEK SMALL LETTER OMICRON
	"{'''}": '\u2034', // TRIPLE PRIME
	"{''}": '\u2033', // DOUBLE PRIME
	"{'}": '\u2032', // PRIME
	"{\\'$\\alpha$}": '\u03AC', // GREEK SMALL LETTER ALPHA WITH TONOS
	"{\\'A}": '\u00C1', // LATIN CAPITAL LETTER A WITH ACUTE
	"{\\'C}": '\u0106', // LATIN CAPITAL LETTER C WITH ACUTE
	"{\\'E}": '\u00C9', // LATIN CAPITAL LETTER E WITH ACUTE
	"{\\'H}": '\u0389', // GREEK CAPITAL LETTER ETA WITH TONOS
	"{\\'I}": '\u00CD', // LATIN CAPITAL LETTER I WITH ACUTE
	"{\\'L}": '\u0139', // LATIN CAPITAL LETTER L WITH ACUTE
	"{\\'N}": '\u0143', // LATIN CAPITAL LETTER N WITH ACUTE
	"{\\'O}": '\u00D3', // LATIN CAPITAL LETTER O WITH ACUTE
	"{\\'R}": '\u0154', // LATIN CAPITAL LETTER R WITH ACUTE
	"{\\'S}": '\u015A', // LATIN CAPITAL LETTER S WITH ACUTE
	"{\\'U}": '\u00DA', // LATIN CAPITAL LETTER U WITH ACUTE
	"{\\'Y}": '\u00DD', // LATIN CAPITAL LETTER Y WITH ACUTE
	"{\\'Z}": '\u0179', // LATIN CAPITAL LETTER Z WITH ACUTE
	"{\\'\\i}": '\u00ED', // LATIN SMALL LETTER I WITH ACUTE
	"{\\'a}": '\u00E1', // LATIN SMALL LETTER A WITH ACUTE
	"{\\'c}": '\u0107', // LATIN SMALL LETTER C WITH ACUTE
	"{\\'e}": '\u00E9', // LATIN SMALL LETTER E WITH ACUTE
	"{\\'g}": '\u01F5', // LATIN SMALL LETTER G WITH ACUTE
	"{\\'l}": '\u013A', // LATIN SMALL LETTER L WITH ACUTE
	"{\\'n}": '\u0144', // LATIN SMALL LETTER N WITH ACUTE
	"{\\'o}": '\u00F3', // LATIN SMALL LETTER O WITH ACUTE
	"{\\'r}": '\u0155', // LATIN SMALL LETTER R WITH ACUTE
	"{\\'s}": '\u015B', // LATIN SMALL LETTER S WITH ACUTE
	"{\\'u}": '\u00FA', // LATIN SMALL LETTER U WITH ACUTE
	"{\\'y}": '\u00FD', // LATIN SMALL LETTER Y WITH ACUTE
	"{\\'z}": '\u017A', // LATIN SMALL LETTER Z WITH ACUTE
	"{\\'{}O}": '\u038C', // GREEK CAPITAL LETTER OMICRON WITH TONOS
	"{\\.C}": '\u010A', // LATIN CAPITAL LETTER C WITH DOT ABOVE
	"{\\.E}": '\u0116', // LATIN CAPITAL LETTER E WITH DOT ABOVE
	"{\\.G}": '\u0120', // LATIN CAPITAL LETTER G WITH DOT ABOVE
	"{\\.I}": '\u0130', // LATIN CAPITAL LETTER I WITH DOT ABOVE
	"{\\.Z}": '\u017B', // LATIN CAPITAL LETTER Z WITH DOT ABOVE
	"{\\.c}": '\u010B', // LATIN SMALL LETTER C WITH DOT ABOVE
	"{\\.e}": '\u0117', // LATIN SMALL LETTER E WITH DOT ABOVE
	"{\\.g}": '\u0121', // LATIN SMALL LETTER G WITH DOT ABOVE
	"{\\.z}": '\u017C', // LATIN SMALL LETTER Z WITH DOT ABOVE
	"{\\=A}": '\u0100', // LATIN CAPITAL LETTER A WITH MACRON
	"{\\=E}": '\u0112', // LATIN CAPITAL LETTER E WITH MACRON
	"{\\=I}": '\u012A', // LATIN CAPITAL LETTER I WITH MACRON
	"{\\=O}": '\u014C', // LATIN CAPITAL LETTER O WITH MACRON
	"{\\=U}": '\u016A', // LATIN CAPITAL LETTER U WITH MACRON
	"{\\=a}": '\u0101', // LATIN SMALL LETTER A WITH MACRON
	"{\\=e}": '\u0113', // LATIN SMALL LETTER E WITH MACRON
	"{\\=o}": '\u014D', // LATIN SMALL LETTER O WITH MACRON
	"{\\=u}": '\u016B', // LATIN SMALL LETTER U WITH MACRON
	"{\\AA}": '\u00C5', // LATIN CAPITAL LETTER A WITH RING ABOVE
	"{\\AC}": '\u223F', // SINE WAVE, alternating current
	"{\\AE}": '\u00C6', // LATIN CAPITAL LETTER AE
	"{\\APLboxquestion}": '\u2370', // APL FUNCTIONAL SYMBOL QUAD QUESTION
	"{\\APLboxupcaret}": '\u2353', // APL FUNCTIONAL SYMBOL QUAD UP CARET
	"{\\APLcomment}": '\u235D', // APL FUNCTIONAL SYMBOL UP SHOE JOT
	"{\\APLdownarrowbox}": '\u2357', // APL FUNCTIONAL SYMBOL QUAD DOWNWARDS ARROW
	"{\\APLinput}": '\u235E', // APL FUNCTIONAL SYMBOL QUOTE QUAD
	"{\\APLinv}": '\u2339', // APL FUNCTIONAL SYMBOL QUAD DIVIDE
	"{\\APLleftarrowbox}": '\u2347', // APL FUNCTIONAL SYMBOL QUAD LEFTWARDS ARROW
	"{\\APLlog}": '\u235F', // APL FUNCTIONAL SYMBOL CIRCLE STAR
	"{\\APLrightarrowbox}": '\u2348', // APL FUNCTIONAL SYMBOL QUAD RIGHTWARDS ARROW
	"{\\APLuparrowbox}": '\u2350', // APL FUNCTIONAL SYMBOL QUAD UPWARDS ARROW
	"{\\Alpha}": '\u0391', // GREEK CAPITAL LETTER ALPHA
	"{\\Angle}": '\u299C', // RIGHT ANGLE VARIANT WITH SQUARE
	"{\\Barv}": '\u2AE7', // SHORT DOWN TACK WITH OVERBAR
	"{\\Beta}": '\u0392', // GREEK CAPITAL LETTER BETA
	"{\\Bumpeq}": '\u224E', // GEOMETRICALLY EQUIVALENT TO
	"{\\CapitalDifferentialD}": '\u2145', // = \DD (wrisym), DOUBLE-STRUCK ITALIC CAPITAL D
	"{\\Cap}": '\u22D2', // DOUBLE INTERSECTION
	"{\\CheckedBox}": '\u2611', // t \Checkedbox (marvosym), BALLOT BOX WITH CHECK
	"{\\Chi}": '\u03A7', // GREEK CAPITAL LETTER CHI
	"{\\Coloneqq}": '\u2A74', // # ::=, x \Coloneq (txfonts), DOUBLE COLON EQUAL
	"{\\Colon}": '\u2237', // PROPORTION
	"{\\ComplexI}": '\u2148', // = \ii (wrisym), DOUBLE-STRUCK ITALIC SMALL I
	"{\\ComplexJ}": '\u2149', // = \jj (wrisym), DOUBLE-STRUCK ITALIC SMALL J
	"{\\Cup}": '\u22D3', // DOUBLE UNION
	"{\\DDownarrow}": '\u27F1', // DOWNWARDS QUADRUPLE ARROW
	"{\\DH}": '\u00D0', // LATIN CAPITAL LETTER ETH
	"{\\DJ}": '\u0110', // LATIN CAPITAL LETTER D WITH STROKE
	"{\\DashVDash}": '\u27DA', // LEFT AND RIGHT DOUBLE TURNSTILE
	"{\\DashV}": '\u2AE5', // DOUBLE VERTICAL BAR DOUBLE LEFT TURNSTILE
	"{\\Dashv}": '\u2AE4', // VERTICAL BAR DOUBLE LEFT TURNSTILE
	"{\\Ddownarrow}": '\u290B', // DOWNWARDS TRIPLE ARROW
	"{\\Delta}": '\u0394', // GREEK CAPITAL LETTER DELTA
	"{\\Diamonddot}": '\u27D0', // WHITE DIAMOND WITH CENTRED DOT
	"{\\Diamond}": '\u25C7', // WHITE DIAMOND; diamond, open
	"{\\DifferentialD}": '\u2146', // = \dd (wrisym), DOUBLE-STRUCK ITALIC SMALL D
	"{\\Digamma}": '\u03DC', // GREEK LETTER DIGAMMA
	"{\\DownArrowBar}": '\u2913', // DOWNWARDS ARROW TO BAR
	"{\\DownArrowUpArrow}": '\u21F5', // DOWNWARDS ARROW LEFTWARDS OF UPWARDS ARROW
	"{\\DownLeftRightVector}": '\u2950', // LEFT BARB DOWN RIGHT BARB DOWN HARPOON
	"{\\DownLeftTeeVector}": '\u295E', // LEFTWARDS HARPOON WITH BARB DOWN FROM BAR
	"{\\DownLeftVectorBar}": '\u2956', // LEFTWARDS HARPOON WITH BARB DOWN TO BAR
	"{\\DownRightTeeVector}": '\u295F', // RIGHTWARDS HARPOON WITH BARB DOWN FROM BAR
	"{\\DownRightVectorBar}": '\u2957', // RIGHTWARDS HARPOON WITH BARB DOWN TO BAR
	"{\\Downarrow}": '\u21D3', // DOWNWARDS DOUBLE ARROW
	"{\\ElOr}": '\u2A56', // TWO INTERSECTING LOGICAL OR
	"{\\Elolarr}": '\u2940', // ANTICLOCKWISE CLOSED CIRCLE ARROW
	"{\\Elorarr}": '\u2941', // CLOCKWISE CLOSED CIRCLE ARROW
	"{\\Elroang}": '\u2986', // RIGHT WHITE PARENTHESIS
	"{\\Elxsqcup}": '\u2A06', // N-ARY SQUARE UNION OPERATOR
	"{\\Elxuplus}": '\u2A04', // N-ARY UNION OPERATOR WITH PLUS
	"{\\ElzAnd}": '\u2A53', // DOUBLE LOGICAL AND
	"{\\ElzCint}": '\u2A0D', // FINITE PART INTEGRAL
	"{\\ElzInf}": '\u2A07', // TWO LOGICAL AND OPERATOR
	"{\\ElzLap}": '\u29CA', // TRIANGLE WITH DOT ABOVE
	"{\\ElzOr}": '\u2A54', // DOUBLE LOGICAL OR
	"{\\ElzRlarr}": '\u2942', // RIGHTWARDS ARROW ABOVE SHORT LEFTWARDS ARROW
	"{\\ElzSup}": '\u2A08', // TWO LOGICAL OR OPERATOR
	"{\\ElzThr}": '\u2A05', // N-ARY SQUARE INTERSECTION OPERATOR
	"{\\ElzTimes}": '\u2A2F', // VECTOR OR CROSS PRODUCT
	"{\\Elzbar}": '\u0336', // COMBINING LONG STROKE OVERLAY
	"{\\Elzbtdl}": '\u026C', // LATIN SMALL LETTER L WITH BELT
	"{\\Elzcirfb}": '\u25D2', // CIRCLE WITH LOWER HALF BLACK
	"{\\Elzcirfl}": '\u25D0', // CIRCLE WITH LEFT HALF BLACK
	"{\\Elzcirfr}": '\u25D1', // CIRCLE WITH RIGHT HALF BLACK
	"{\\Elzclomeg}": '\u0277', // LATIN SMALL LETTER CLOSED OMEGA
	"{\\Elzddfnc}": '\u2999', // DOTTED FENCE
	"{\\Elzdefas}": '\u29CB', // TRIANGLE WITH UNDERBAR
	"{\\Elzdlcorn}": '\u23A3', // LEFT SQUARE BRACKET LOWER CORNER
	"{\\Elzdshfnc}": '\u2506', // BOX DRAWINGS LIGHT TRIPLE DASH VERTICAL
	"{\\Elzdyogh}": '\u02A4', // LATIN SMALL LETTER DEZH DIGRAPH
	"{\\Elzesh}": '\u0283', // LATIN SMALL LETTER ESH
	"{\\Elzfhr}": '\u027E', // LATIN SMALL LETTER R WITH FISHHOOK
	"{\\Elzglst}": '\u0294', // LATIN LETTER GLOTTAL STOP
	"{\\Elzhlmrk}": '\u02D1', // MODIFIER LETTER HALF TRIANGULAR COLON
	"{\\Elzinglst}": '\u0296', // LATIN LETTER INVERTED GLOTTAL STOP
	"{\\Elzinvv}": '\u028C', // LATIN SMALL LETTER TURNED V
	"{\\Elzinvw}": '\u028D', // LATIN SMALL LETTER TURNED W
	"{\\Elzlmrk}": '\u02D0', // MODIFIER LETTER TRIANGULAR COLON
	"{\\Elzlow}": '\u02D5', // MODIFIER LETTER DOWN TACK
	"{\\Elzlpargt}": '\u29A0', // SPHERICAL ANGLE OPENING LEFT
	"{\\Elzltlmr}": '\u0271', // LATIN SMALL LETTER M WITH HOOK
	"{\\Elzltln}": '\u0272', // LATIN SMALL LETTER N WITH LEFT HOOK
	"{\\Elzminhat}": '\u2A5F', // LOGICAL AND WITH UNDERBAR
	"{\\Elzopeno}": '\u0254', // LATIN SMALL LETTER OPEN O
	"{\\Elzpalh}": '\u0321', // COMBINING PALATALIZED HOOK BELOW
	"{\\Elzpbgam}": '\u0264', // LATIN SMALL LETTER RAMS HORN
	"{\\Elzpgamma}": '\u0263', // LATIN SMALL LETTER GAMMA
	"{\\Elzpscrv}": '\u028B', // LATIN SMALL LETTER V WITH HOOK
	"{\\Elzpupsil}": '\u028A', // LATIN SMALL LETTER UPSILON
	"{\\ElzrLarr}": '\u2944', // SHORT RIGHTWARDS ARROW ABOVE LEFTWARDS ARROW
	"{\\Elzrais}": '\u02D4', // MODIFIER LETTER UP TACK
	"{\\Elzrarrx}": '\u2947', // RIGHTWARDS ARROW THROUGH X
	"{\\Elzreapos}": '\u201B', // SINGLE HIGH-REVERSED-9 QUOTATION MARK
	"{\\Elzreglst}": '\u0295', // LATIN LETTER PHARYNGEAL VOICED FRICATIVE
	"{\\Elzrh}": '\u0322', // COMBINING RETROFLEX HOOK BELOW
	"{\\Elzrl}": '\u027C', // LATIN SMALL LETTER R WITH LONG LEG
	"{\\Elzrtld}": '\u0256', // LATIN SMALL LETTER D WITH TAIL
	"{\\Elzrtll}": '\u026D', // LATIN SMALL LETTER L WITH RETROFLEX HOOK
	"{\\Elzrtln}": '\u0273', // LATIN SMALL LETTER N WITH RETROFLEX HOOK
	"{\\Elzrtlr}": '\u027D', // LATIN SMALL LETTER R WITH TAIL
	"{\\Elzrtls}": '\u0282', // LATIN SMALL LETTER S WITH HOOK
	"{\\Elzrtlt}": '\u0288', // LATIN SMALL LETTER T WITH RETROFLEX HOOK
	"{\\Elzrtlz}": '\u0290', // LATIN SMALL LETTER Z WITH RETROFLEX HOOK
	"{\\Elzrttrnr}": '\u027B', // LATIN SMALL LETTER TURNED R WITH HOOK
	"{\\Elzrvbull}": '\u25D8', // INVERSE BULLET
	"{\\Elzsbbrg}": '\u032A', // COMBINING BRIDGE BELOW
	"{\\Elzsblhr}": '\u02D3', // MODIFIER LETTER CENTRED LEFT HALF RING
	"{\\Elzsbrhr}": '\u02D2', // MODIFIER LETTER CENTRED RIGHT HALF RING
	"{\\Elzschwa}": '\u0259', // LATIN SMALL LETTER SCHWA
	"{\\Elzsqfl}": '\u25E7', // SQUARE WITH LEFT HALF BLACK
	"{\\Elzsqfnw}": '\u2519', // BOX DRAWINGS UP LIGHT AND LEFT HEAVY
	"{\\Elzsqfr}": '\u25E8', // SQUARE WITH RIGHT HALF BLACK
	"{\\Elzsqfse}": '\u25EA', // SQUARE WITH LOWER RIGHT DIAGONAL HALF BLACK
	"{\\Elzsqspne}": '\u22E5', // SQUARE ORIGINAL OF OR NOT EQUAL TO
	"{\\Elztdcol}": '\u2AF6', // TRIPLE COLON OPERATOR
	"{\\Elztesh}": '\u02A7', // LATIN SMALL LETTER TESH DIGRAPH
	"{\\Elztfnc}": '\u2980', // TRIPLE VERTICAL BAR DELIMITER
	"{\\Elztrna}": '\u0250', // LATIN SMALL LETTER TURNED A
	"{\\Elztrnh}": '\u0265', // LATIN SMALL LETTER TURNED H
	"{\\Elztrnmlr}": '\u0270', // LATIN SMALL LETTER TURNED M WITH LONG LEG
	"{\\Elztrnm}": '\u026F', // LATIN SMALL LETTER TURNED M
	"{\\Elztrnrl}": '\u027A', // LATIN SMALL LETTER TURNED R WITH LONG LEG
	"{\\Elztrnr}": '\u0279', // LATIN SMALL LETTER TURNED R
	"{\\Elztrnsa}": '\u0252', // LATIN SMALL LETTER TURNED ALPHA
	"{\\Elztrnt}": '\u0287', // LATIN SMALL LETTER TURNED T
	"{\\Elztrny}": '\u028E', // LATIN SMALL LETTER TURNED Y
	"{\\Elzverti}": '\u02CC', // MODIFIER LETTER LOW VERTICAL LINE
	"{\\Elzverts}": '\u02C8', // MODIFIER LETTER VERTICAL LINE
	"{\\Elzvrecto}": '\u25AF', // WHITE VERTICAL RECTANGLE
	"{\\Elzxh}": '\u0127', // LATIN SMALL LETTER H WITH STROKE
	"{\\Elzxl}": '\u0335', // COMBINING SHORT STROKE OVERLAY
	"{\\Elzxrat}": '\u211E', // PRESCRIPTION TAKE
	"{\\Elzyogh}": '\u0292', // LATIN SMALL LETTER EZH
	"{\\Epsilon}": '\u0395', // GREEK CAPITAL LETTER EPSILON
	"{\\Equal}": '\u2A75', // TWO CONSECUTIVE EQUALS SIGNS
	"{\\Equiv}": '\u2263', // strict equivalence (4 lines)
	"{\\Eta}": '\u0397', // GREEK CAPITAL LETTER ETA
	"{\\Euler}": '\u2107', // EULER CONSTANT
	"{\\Exclam}": '\u203C', // # !!, DOUBLE EXCLAMATION MARK
	"{\\ExponetialE}": '\u2147', // = \ee (wrisym), DOUBLE-STRUCK ITALIC SMALL E
	"{\\Finv}": '\u2132', // TURNED CAPITAL F
	"{\\Game}": '\u2141', // # \Game (amssymb), TURNED SANS-SERIF CAPITAL G (amssymb has mirrored G)
	"{\\Gamma}": '\u0393', // GREEK CAPITAL LETTER GAMMA
	"{\\H O}": '\u0150', // LATIN CAPITAL LETTER O WITH DOUBLE ACUTE
	"{\\H U}": '\u0170', // LATIN CAPITAL LETTER U WITH DOUBLE ACUTE
	"{\\H o}": '\u0151', // LATIN SMALL LETTER O WITH DOUBLE ACUTE
	"{\\H u}": '\u0171', // LATIN SMALL LETTER U WITH DOUBLE ACUTE
	"{\\Hermaphrodite}": '\u26A5', // MALE AND FEMALE SIGN
	"{\\H}": '\u02DD', // DOUBLE ACUTE ACCENT
	"{\\Iota}": '\u0399', // GREEK CAPITAL LETTER IOTA
	"{\\Join}": '\u2A1D', // JOIN
	"{\\Kappa}": '\u039A', // GREEK CAPITAL LETTER KAPPA
	"{\\Koppa}": '\u03DE', // GREEK LETTER KOPPA
	"{\\LEFTCIRCLE}": '\u25D6', // LEFT HALF BLACK CIRCLE
	"{\\LHD}": '\u25C0', // = \blacktriangleleft (fourier -mathabx), (large) left triangle, filled
	"{\\LLeftarrow}": '\u2B45', // LEFTWARDS QUADRUPLE ARROW
	"{\\LVec}": '\u20D6', // # \overleftarrow, COMBINING LEFT ARROW ABOVE
	"{\\Lambda}": '\u039B', // GREEK CAPITAL LETTER LAMDA
	"{\\Lbag}": '\u27C5', // = \lbag (stmaryrd -oz), LEFT S-SHAPED BAG DELIMITER
	"{\\Lbrbrak}": '\u27EC', // MATHEMATICAL LEFT WHITE TORTOISE SHELL BRACKET
	"{\\LeftArrowBar}": '\u21E4', // LEFTWARDS ARROW TO BAR
	"{\\LeftDownTeeVector}": '\u2961', // DOWNWARDS HARPOON WITH BARB LEFT FROM BAR
	"{\\LeftDownVectorBar}": '\u2959', // DOWNWARDS HARPOON WITH BARB LEFT TO BAR
	"{\\LeftRightVector}": '\u294E', // LEFT BARB UP RIGHT BARB UP HARPOON
	"{\\LeftTeeVector}": '\u295A', // LEFTWARDS HARPOON WITH BARB UP FROM BAR
	"{\\LeftTriangleBar}": '\u29CF', // LEFT TRIANGLE BESIDE VERTICAL BAR
	"{\\LeftUpDownVector}": '\u2951', // UP BARB LEFT DOWN BARB LEFT HARPOON
	"{\\LeftUpTeeVector}": '\u2960', // UPWARDS HARPOON WITH BARB LEFT FROM BAR
	"{\\LeftUpVectorBar}": '\u2958', // UPWARDS HARPOON WITH BARB LEFT TO BAR
	"{\\LeftVectorBar}": '\u2952', // LEFTWARDS HARPOON WITH BARB UP TO BAR
	"{\\Leftarrow}": '\u21D0', // LEFTWARDS DOUBLE ARROW
	"{\\Leftrightarrow}": '\u21D4', // LEFT RIGHT DOUBLE ARROW
	"{\\Lleftarrow}": '\u21DA', // LEFTWARDS TRIPLE ARROW
	"{\\Longleftarrow}": '\u27F8', // LONG LEFTWARDS DOUBLE ARROW
	"{\\Longleftrightarrow}": '\u27FA', // LONG LEFT RIGHT DOUBLE ARROW
	"{\\Longmapsfrom}": '\u27FD', // = \Longmappedfrom (kpfonts), LONG LEFTWARDS DOUBLE ARROW FROM BAR
	"{\\Longmapsto}": '\u27FE', // LONG RIGHTWARDS DOUBLE ARROW FROM BAR
	"{\\Longrightarrow}": '\u27F9', // LONG RIGHTWARDS DOUBLE ARROW
	"{\\Lparengtr}": '\u2995', // DOUBLE LEFT ARC GREATER-THAN BRACKET
	"{\\Lsh}": '\u21B0', // UPWARDS ARROW WITH TIP LEFTWARDS
	"{\\Lvzigzag}": '\u29DA', // LEFT DOUBLE WIGGLY FENCE
	"{\\L}": '\u0141', // LATIN CAPITAL LETTER L WITH STROKE
	"{\\MapsDown}": '\u21A7', // maps to, downward
	"{\\MapsUp}": '\u21A5', // maps to, upward
	"{\\Mapsfrom}": '\u2906', // = \Mappedfrom (kpfonts), LEFTWARDS DOUBLE ARROW FROM BAR
	"{\\Mapsto}": '\u2907', // RIGHTWARDS DOUBLE ARROW FROM BAR
	"{\\NG}": '\u014A', // LATIN CAPITAL LETTER ENG
	"{\\Nearrow}": '\u21D7', // ne pointing double arrow
	"{\\NestedGreaterGreater}": '\u2AA2', // DOUBLE NESTED GREATER-THAN
	"{\\NestedLessLess}": '\u2AA1', // DOUBLE NESTED LESS-THAN
	"{\\Not}": '\u2AEC', // DOUBLE STROKE NOT SIGN
	"{\\Nwarrow}": '\u21D6', // nw pointing double arrow
	"{\\OE}": '\u0152', // LATIN CAPITAL LIGATURE OE
	"{\\Omega}": '\u03A9', // GREEK CAPITAL LETTER OMEGA
	"{\\Otimes}": '\u2A37', // MULTIPLICATION SIGN IN DOUBLE CIRCLE
	"{\\O}": '\u00D8', // LATIN CAPITAL LETTER O WITH STROKE
	"{\\Phi}": '\u03A6', // GREEK CAPITAL LETTER PHI
	"{\\Pi}": '\u03A0', // GREEK CAPITAL LETTER PI
	"{\\Planckconst}": '\u210E', // # h, Planck constant
	"{\\PropertyLine}": '\u214A', // PROPERTY LINE
	"{\\Psi}": '\u03A8', // GREEK CAPITAL LETTER PSI
	"{\\QED}": '\u220E', // # \blacksquare (amssymb), END OF PROOF
	"{\\Qoppa}": '\u03D8', // = \Koppa (wrisym), t \Qoppa (LGR), GREEK LETTER ARCHAIC KOPPA
	"{\\Question}": '\u2047', // # ??, DOUBLE QUESTION MARK
	"{\\RHD}": '\u25B6', // = \blacktriangleright (fourier -mathabx), (large) right triangle, filled
	"{\\RRightarrow}": '\u2B46', // RIGHTWARDS QUADRUPLE ARROW
	"{\\Rbag}": '\u27C6', // = \rbag (stmaryrd -oz), RIGHT S-SHAPED BAG DELIMITER
	"{\\Rbrbrak}": '\u27ED', // MATHEMATICAL RIGHT WHITE TORTOISE SHELL BRACKET
	"{\\ReverseUpEquilibrium}": '\u296F', // DOWNWARDS HARPOON WITH BARB LEFT BESIDE UPWARDS HARPOON WITH BARB RIGHT
	"{\\Rho}": '\u03A1', // GREEK CAPITAL LETTER RHO
	"{\\RightArrowBar}": '\u21E5', // RIGHTWARDS ARROW TO BAR
	"{\\RightDownTeeVector}": '\u295D', // DOWNWARDS HARPOON WITH BARB RIGHT FROM BAR
	"{\\RightDownVectorBar}": '\u2955', // DOWNWARDS HARPOON WITH BARB RIGHT TO BAR
	"{\\RightTeeVector}": '\u295B', // RIGHTWARDS HARPOON WITH BARB UP FROM BAR
	"{\\RightTriangleBar}": '\u29D0', // VERTICAL BAR BESIDE RIGHT TRIANGLE
	"{\\RightUpDownVector}": '\u294F', // UP BARB RIGHT DOWN BARB RIGHT HARPOON
	"{\\RightUpTeeVector}": '\u295C', // UPWARDS HARPOON WITH BARB RIGHT FROM BAR
	"{\\RightUpVectorBar}": '\u2954', // UPWARDS HARPOON WITH BARB RIGHT TO BAR
	"{\\RightVectorBar}": '\u2953', // RIGHTWARDS HARPOON WITH BARB UP TO BAR
	"{\\Rightarrow}": '\u21D2', // RIGHTWARDS DOUBLE ARROW
	"{\\RoundImplies}": '\u2970', // RIGHT DOUBLE ARROW WITH ROUNDED HEAD
	"{\\Rparenless}": '\u2996', // DOUBLE RIGHT ARC LESS-THAN BRACKET
	"{\\Rrightarrow}": '\u21DB', // RIGHTWARDS TRIPLE ARROW
	"{\\Rsh}": '\u21B1', // UPWARDS ARROW WITH TIP RIGHTWARDS
	"{\\RuleDelayed}": '\u29F4', // RULE-DELAYED
	"{\\Rvzigzag}": '\u29DB', // RIGHT DOUBLE WIGGLY FENCE
	"{\\Same}": '\u2A76', // # ===, THREE CONSECUTIVE EQUALS SIGNS
	"{\\Sampi}": '\u03E0', // GREEK LETTER SAMPI
	"{\\Searrow}": '\u21D8', // se pointing double arrow
	"{\\Sigma}": '\u03A3', // GREEK CAPITAL LETTER SIGMA
	"{\\Sqcap}": '\u2A4E', // DOUBLE SQUARE INTERSECTION
	"{\\Sqcup}": '\u2A4F', // DOUBLE SQUARE UNION
	"{\\Square}": '\u2610', // BALLOT BOX
	"{\\Stigma}": '\u03DA', // GREEK LETTER STIGMA
	"{\\Subset}": '\u22D0', // DOUBLE SUBSET
	"{\\Sun}": '\u2609', // SUN
	"{\\Supset}": '\u22D1', // DOUBLE SUPERSET
	"{\\Swarrow}": '\u21D9', // sw pointing double arrow
	"{\\TH}": '\u00DE', // LATIN CAPITAL LETTER THORN
	"{\\Tau}": '\u03A4', // GREEK CAPITAL LETTER TAU
	"{\\Theta}": '\u0398', // GREEK CAPITAL LETTER THETA
	"{\\Top}": '\u2AEA', // DOUBLE DOWN TACK
	"{\\UUparrow}": '\u27F0', // UPWARDS QUADRUPLE ARROW
	"{\\UpArrowBar}": '\u2912', // UPWARDS ARROW TO BAR
	"{\\UpEquilibrium}": '\u296E', // UPWARDS HARPOON WITH BARB LEFT BESIDE DOWNWARDS HARPOON WITH BARB RIGHT
	"{\\Uparrow}": '\u21D1', // UPWARDS DOUBLE ARROW
	"{\\Updownarrow}": '\u21D5', // UP DOWN DOUBLE ARROW
	"{\\Upsilon}": '\u03A5', // GREEK CAPITAL LETTER UPSILON
	"{\\Uuparrow}": '\u290A', // UPWARDS TRIPLE ARROW
	"{\\VDash}": '\u22AB', // DOUBLE VERTICAL BAR DOUBLE RIGHT TURNSTILE
	"{\\Vdash}": '\u22A9', // FORCES
	"{\\Vert}": '\u2016', // DOUBLE VERTICAL LINE
	"{\\Vvdash}": '\u22AA', // TRIPLE VERTICAL BAR RIGHT TURNSTILE
	"{\\XBox}": '\u2612', // t \Crossedbox (marvosym), BALLOT BOX WITH X
	"{\\Xi}": '\u039E', // GREEK CAPITAL LETTER XI
	"{\\Yup}": '\u2144', // TURNED SANS-SERIF CAPITAL Y
	"{\\Zbar}": '\u01B5', // impedance
	"{\\Zeta}": '\u0396', // GREEK CAPITAL LETTER ZETA
	"{\\\"A}": '\u00C4', // LATIN CAPITAL LETTER A WITH DIAERESIS
	"{\\\"E}": '\u00CB', // LATIN CAPITAL LETTER E WITH DIAERESIS
	"{\\\"I}": '\u00CF', // LATIN CAPITAL LETTER I WITH DIAERESIS
	"{\\\"O}": '\u00D6', // LATIN CAPITAL LETTER O WITH DIAERESIS
	"{\\\"U}": '\u00DC', // LATIN CAPITAL LETTER U WITH DIAERESIS
	"{\\\"Y}": '\u0178', // LATIN CAPITAL LETTER Y WITH DIAERESIS
	"{\\\"\\i}": '\u00EF', // LATIN SMALL LETTER I WITH DIAERESIS
	"{\\\"a}": '\u00E4', // LATIN SMALL LETTER A WITH DIAERESIS
	"{\\\"e}": '\u00EB', // LATIN SMALL LETTER E WITH DIAERESIS
	"{\\\"o}": '\u00F6', // LATIN SMALL LETTER O WITH DIAERESIS
	"{\\\"u}": '\u00FC', // LATIN SMALL LETTER U WITH DIAERESIS
	"{\\\"y}": '\u00FF', // LATIN SMALL LETTER Y WITH DIAERESIS
	"{\\^A}": '\u00C2', // LATIN CAPITAL LETTER A WITH CIRCUMFLEX
	"{\\^C}": '\u0108', // LATIN CAPITAL LETTER C WITH CIRCUMFLEX
	"{\\^E}": '\u00CA', // LATIN CAPITAL LETTER E WITH CIRCUMFLEX
	"{\\^G}": '\u011C', // LATIN CAPITAL LETTER G WITH CIRCUMFLEX
	"{\\^H}": '\u0124', // LATIN CAPITAL LETTER H WITH CIRCUMFLEX
	"{\\^I}": '\u00CE', // LATIN CAPITAL LETTER I WITH CIRCUMFLEX
	"{\\^J}": '\u0134', // LATIN CAPITAL LETTER J WITH CIRCUMFLEX
	"{\\^O}": '\u00D4', // LATIN CAPITAL LETTER O WITH CIRCUMFLEX
	"{\\^S}": '\u015C', // LATIN CAPITAL LETTER S WITH CIRCUMFLEX
	"{\\^U}": '\u00DB', // LATIN CAPITAL LETTER U WITH CIRCUMFLEX
	"{\\^W}": '\u0174', // LATIN CAPITAL LETTER W WITH CIRCUMFLEX
	"{\\^Y}": '\u0176', // LATIN CAPITAL LETTER Y WITH CIRCUMFLEX
	"{\\^\\i}": '\u00EE', // LATIN SMALL LETTER I WITH CIRCUMFLEX
	"{\\^\\j}": '\u0135', // LATIN SMALL LETTER J WITH CIRCUMFLEX
	"{\\^a}": '\u00E2', // LATIN SMALL LETTER A WITH CIRCUMFLEX
	"{\\^c}": '\u0109', // LATIN SMALL LETTER C WITH CIRCUMFLEX
	"{\\^e}": '\u00EA', // LATIN SMALL LETTER E WITH CIRCUMFLEX
	"{\\^g}": '\u011D', // LATIN SMALL LETTER G WITH CIRCUMFLEX
	"{\\^h}": '\u0125', // LATIN SMALL LETTER H WITH CIRCUMFLEX
	"{\\^o}": '\u00F4', // LATIN SMALL LETTER O WITH CIRCUMFLEX
	"{\\^s}": '\u015D', // LATIN SMALL LETTER S WITH CIRCUMFLEX
	"{\\^u}": '\u00FB', // LATIN SMALL LETTER U WITH CIRCUMFLEX
	"{\\^w}": '\u0175', // LATIN SMALL LETTER W WITH CIRCUMFLEX
	"{\\^y}": '\u0177', // LATIN SMALL LETTER Y WITH CIRCUMFLEX
	"{\\^}": '^', // CIRCUMFLEX ACCENT
	"{\\`A}": '\u00C0', // LATIN CAPITAL LETTER A WITH GRAVE
	"{\\`E}": '\u00C8', // LATIN CAPITAL LETTER E WITH GRAVE
	"{\\`I}": '\u00CC', // LATIN CAPITAL LETTER I WITH GRAVE
	"{\\`O}": '\u00D2', // LATIN CAPITAL LETTER O WITH GRAVE
	"{\\`U}": '\u00D9', // LATIN CAPITAL LETTER U WITH GRAVE
	"{\\`\\i}": '\u00EC', // LATIN SMALL LETTER I WITH GRAVE
	"{\\`a}": '\u00E0', // LATIN SMALL LETTER A WITH GRAVE
	"{\\`e}": '\u00E8', // LATIN SMALL LETTER E WITH GRAVE
	"{\\`o}": '\u00F2', // LATIN SMALL LETTER O WITH GRAVE
	"{\\`u}": '\u00F9', // LATIN SMALL LETTER U WITH GRAVE
	"{\\aa}": '\u00E5', // LATIN SMALL LETTER A WITH RING ABOVE
	"{\\accurrent}": '\u23E6', // # \AC (wasysym), AC CURRENT
	"{\\acidfree}": '\u267E', // PERMANENT PAPER SIGN
	"{\\acwgapcirclearrow}": '\u27F2', // ANTICLOCKWISE GAPPED CIRCLE ARROW
	"{\\acwleftarcarrow}": '\u2939', // LEFT-SIDE ARC ANTICLOCKWISE ARROW
	"{\\acwoverarcarrow}": '\u293A', // TOP ARC ANTICLOCKWISE ARROW
	"{\\acwunderarcarrow}": '\u293B', // BOTTOM ARC ANTICLOCKWISE ARROW
	"{\\ae}": '\u00E6', // LATIN SMALL LETTER AE
	"{\\aleph}": '\u2135', // ALEF SYMBOL
	"{\\allequal}": '\u224C', // ALL EQUAL TO
	"{\\alpha}": '\u03B1', // GREEK SMALL LETTER ALPHA
	"{\\amalg}": '\u2A3F', // AMALGAMATION OR COPRODUCT
	"{\\anchor}": '\u2693', // ANCHOR
	"{\\angdnr}": '\u299F', // ACUTE ANGLE
	"{\\angles}": '\u299E', // ANGLE WITH S INSIDE
	"{\\angleubar}": '\u29A4', // ANGLE WITH UNDERBAR
	"{\\angle}": '\u2220', // ANGLE
	"{\\annuity}": '\u20E7', // COMBINING ANNUITY SYMBOL
	"{\\approxeqq}": '\u2A70', // APPROXIMATELY EQUAL OR EQUAL TO
	"{\\approxeq}": '\u224A', // ALMOST EQUAL OR EQUAL TO
	"{\\approxnotequal}": '\u2246', // APPROXIMATELY BUT NOT ACTUALLY EQUAL TO
	"{\\approx}": '\u2248', // ALMOST EQUAL TO
	"{\\aquarius}": '\u2652', // AQUARIUS
	"{\\arceq}": '\u2258', // arc, equals; CORRESPONDS TO
	"{\\aries}": '\u2648', // ARIES
	"{\\arrowwaveleft}": '\u219C',
	"{\\arrowwaveright}": '\u219C', // LEFTWARDS WAVE ARROW
	"{\\assert}": '\u22A6', // # \vdash, ASSERTION (vertical, short dash)
	"{\\asteraccent}": '\u20F0', // COMBINING ASTERISK ABOVE
	"{\\asymp}": '\u224D', // EQUIVALENT TO
	"{\\awint}": '\u2A11', // ANTICLOCKWISE INTEGRATION
	"{\\bNot}": '\u2AED', // REVERSED DOUBLE STROKE NOT SIGN
	"{\\backdprime}": '\u2036', // double reverse prime, not superscripted
	"{\\backepsilon}": '\u03F6', // GREEK REVERSED LUNATE EPSILON SYMBOL
	"{\\backprime}": '\u2035', // REVERSED PRIME
	"{\\backsimeq}": '\u22CD', // REVERSED TILDE EQUALS
	"{\\backsim}": '\u223D', // REVERSED TILDE
	"{\\backslash}": '\\',
	"{\\backtrprime}": '\u2037', // triple reverse prime, not superscripted
	"{\\bagmember}": '\u22FF', // # \mathsf{E}, Z NOTATION BAG MEMBERSHIP
	"{\\barcap}": '\u2A43', // INTERSECTION WITH OVERBAR
	"{\\barcup}": '\u2A42', // UNION WITH OVERBAR
	"{\\barin}": '\u22F6', // ELEMENT OF WITH OVERBAR
	"{\\barleftarrowrightarrowba}": '\u21B9', // LEFTWARDS ARROW TO BAR OVER RIGHTWARDS ARROW TO BAR
	"{\\barleftharpoon}": '\u296B', // LEFTWARDS HARPOON WITH BARB DOWN BELOW LONG DASH
	"{\\barovernorthwestarrow}": '\u21B8', // NORTH WEST ARROW TO LONG BAR
	"{\\barrightarrowdiamond}": '\u2920', // RIGHTWARDS ARROW FROM BAR TO BLACK DIAMOND
	"{\\barrightharpoon}": '\u296D', // RIGHTWARDS HARPOON WITH BARB DOWN BELOW LONG DASH
	"{\\barvee}": '\u22BD', // bar, vee (large vee)
	"{\\barwedge}": '\u22BC', // logical NAND (bar over wedge)
	"{\\bbrktbrk}": '\u23B6', // BOTTOM SQUARE BRACKET OVER TOP SQUARE BRACKET
	"{\\because}": '\u2235', // BECAUSE
	"{\\benzenr}": '\u23E3', // BENZENE RING WITH CIRCLE
	"{\\beta}": '\u03B2', // GREEK SMALL LETTER BETA
	"{\\beth}": '\u2136', // BET SYMBOL
	"{\\between}": '\u226C', // BETWEEN
	"{\\bigbot}": '\u27D8', // LARGE UP TACK
	"{\\bigcap}": '\u22C2', // N-ARY INTERSECTION
	"{\\bigcirc}": '\u25CB', // WHITE CIRCLE
	"{\\bigcupdot}": '\u2A03', // N-ARY UNION OPERATOR WITH DOT
	"{\\bigcup}": '\u22C3', // N-ARY UNION
	"{\\biginterleave}": '\u2AFC', // LARGE TRIPLE VERTICAL BAR OPERATOR
	"{\\bigodot}": '\u2A00', // N-ARY CIRCLED DOT OPERATOR
	"{\\bigoplus}": '\u2A01', // N-ARY CIRCLED PLUS OPERATOR
	"{\\bigotimes}": '\u2A02', // N-ARY CIRCLED TIMES OPERATOR
	"{\\bigslopedvee}": '\u2A57', // SLOPING LARGE OR
	"{\\bigslopedwedge}": '\u2A58', // SLOPING LARGE AND
	"{\\bigtalloblong}": '\u2AFF', // N-ARY WHITE VERTICAL BAR
	"{\\bigtop}": '\u27D9', // LARGE DOWN TACK
	"{\\bigtriangledown}": '\u25BD', // WHITE DOWN-POINTING TRIANGLE
	"{\\bigtriangleleft}": '\u2A1E', // LARGE LEFT TRIANGLE OPERATOR
	"{\\bigtriangleup}": '\u25B3', // WHITE UP-POINTING TRIANGLE
	"{\\bij}": '\u2916', // RIGHTWARDS TWO-HEADED ARROW WITH TAIL, z notation bijection
	"{\\biohazard}": '\u2623', // BIOHAZARD SIGN
	"{\\blackcircledownarrow}": '\u29ED', // BLACK CIRCLE WITH DOWN ARROW
	"{\\blackcircledrightdot}": '\u2688', // BLACK CIRCLE WITH WHITE DOT RIGHT
	"{\\blackcircledtwodots}": '\u2689', // BLACK CIRCLE WITH TWO WHITE DOTS
	"{\\blackcircleulquadwhite}": '\u25D5', // CIRCLE WITH ALL BUT UPPER LEFT QUADRANT BLACK
	"{\\blackdiamonddownarrow}": '\u29EA', // BLACK DIAMOND WITH DOWN ARROW
	"{\\blackhourglass}": '\u29D7', // BLACK HOURGLASS
	"{\\blackinwhitediamond}": '\u25C8', // WHITE DIAMOND CONTAINING BLACK SMALL DIAMOND
	"{\\blackinwhitesquare}": '\u25A3', // WHITE SQUARE CONTAINING BLACK SMALL SQUARE
	"{\\blacklozenge}": '\u29EB', // BLACK LOZENGE
	"{\\blackpointerleft}": '\u25C4', // BLACK LEFT-POINTING POINTER
	"{\\blackpointerright}": '\u25BA', // BLACK RIGHT-POINTING POINTER
	"{\\blacksmiley}": '\u263B', // = \invsmileface (arevmath), BLACK SMILING FACE
	"{\\blacksquare}": '\u25AA', // BLACK SMALL SQUARE
	"{\\blacktriangledown}": '\u25BE', // BLACK DOWN-POINTING SMALL TRIANGLE
	"{\\blacktriangleleft}": '\u25C2', // BLACK LEFT-POINTING SMALL TRIANGLE
	"{\\blacktriangleright}": '\u25B8', // BLACK RIGHT-POINTING SMALL TRIANGLE
	"{\\blacktriangle}": '\u25B4', // BLACK UP-POINTING SMALL TRIANGLE
	"{\\blkhorzoval}": '\u2B2C', // BLACK HORIZONTAL ELLIPSE
	"{\\blkvertoval}": '\u2B2E', // BLACK VERTICAL ELLIPSE
	"{\\blockfull}": '\u2588', // FULL BLOCK
	"{\\blockhalfshaded}": '\u2592', // 50\% shaded block
	"{\\blocklefthalf}": '\u258C', // LEFT HALF BLOCK
	"{\\blocklowhalf}": '\u2584', // LOWER HALF BLOCK
	"{\\blockqtrshaded}": '\u2591', // 25\% shaded block
	"{\\blockrighthalf}": '\u2590', // RIGHT HALF BLOCK
	"{\\blockthreeqtrshaded}": '\u2593', // 75\% shaded block
	"{\\blockuphalf}": '\u2580', // UPPER HALF BLOCK
	"{\\botsemicircle}": '\u25E1', // LOWER HALF CIRCLE
	"{\\bowtie}": '\u22C8', // BOWTIE
	"{\\boxast}": '\u29C6', // SQUARED ASTERISK
	"{\\boxbar}": '\u25EB', // vertical bar in box
	"{\\boxbox}": '\u29C8', // SQUARED SQUARE
	"{\\boxbslash}": '\u29C5', // SQUARED FALLING DIAGONAL SLASH
	"{\\boxcircle}": '\u29C7', // SQUARED SMALL CIRCLE
	"{\\boxdot}": '\u22A1', // SQUARED DOT OPERATOR
	"{\\boxminus}": '\u229F', // SQUARED MINUS
	"{\\boxonbox}": '\u29C9', // TWO JOINED SQUARES
	"{\\boxplus}": '\u229E', // SQUARED PLUS
	"{\\boxslash}": '\u29C4', // SQUARED RISING DIAGONAL SLASH
	"{\\boxtimes}": '\u22A0', // SQUARED TIMES
	"{\\bsimilarleftarrow}": '\u2B41', // REVERSE TILDE OPERATOR ABOVE LEFTWARDS ARROW
	"{\\bsimilarrightarrow}": '\u2B47', // REVERSE TILDE OPERATOR ABOVE RIGHTWARDS ARROW
	"{\\bsolhsub}": '\u27C8', // REVERSE SOLIDUS PRECEDING SUBSET
	"{\\btimes}": '\u2A32', // SEMIDIRECT PRODUCT WITH BOTTOM CLOSED
	"{\\bullet}": '\u2219', // BULLET OPERATOR
	"{\\bullseye}": '\u25CE', // # \circledcirc (amssymb), BULLSEYE
	"{\\bumpeqq}": '\u2AAE', // EQUALS SIGN WITH BUMPY ABOVE
	"{\\bumpeq}": '\u224F', // DIFFERENCE BETWEEN
	"{\\c C}": '\u00C7', // LATIN CAPITAL LETTER C WITH CEDILLA
	"{\\c G}": '\u0122', // LATIN CAPITAL LETTER G WITH CEDILLA
	"{\\c K}": '\u0136', // LATIN CAPITAL LETTER K WITH CEDILLA
	"{\\c L}": '\u013B', // LATIN CAPITAL LETTER L WITH CEDILLA
	"{\\c N}": '\u0145', // LATIN CAPITAL LETTER N WITH CEDILLA
	"{\\c R}": '\u0156', // LATIN CAPITAL LETTER R WITH CEDILLA
	"{\\c S}": '\u015E', // LATIN CAPITAL LETTER S WITH CEDILLA
	"{\\c T}": '\u0162', // LATIN CAPITAL LETTER T WITH CEDILLA
	"{\\c c}": '\u00E7', // LATIN SMALL LETTER C WITH CEDILLA
	"{\\c g}": '\u0123', // LATIN SMALL LETTER G WITH CEDILLA
	"{\\c k}": '\u0137', // LATIN SMALL LETTER K WITH CEDILLA
	"{\\c l}": '\u013C', // LATIN SMALL LETTER L WITH CEDILLA
	"{\\c n}": '\u0146', // LATIN SMALL LETTER N WITH CEDILLA
	"{\\c r}": '\u0157', // LATIN SMALL LETTER R WITH CEDILLA
	"{\\c s}": '\u015F', // LATIN SMALL LETTER S WITH CEDILLA
	"{\\c t}": '\u0163', // LATIN SMALL LETTER T WITH CEDILLA
	"{\\cancer}": '\u264B', // CANCER
	"{\\candra}": '\u0310', // candrabindu (non-spacing)
	"{\\capbarcup}": '\u2A49', // INTERSECTION ABOVE BAR ABOVE UNION
	"{\\capdot}": '\u2A40', // INTERSECTION WITH DOT
	"{\\capovercup}": '\u2A47', // INTERSECTION ABOVE UNION
	"{\\capricornus}": '\u2651', // CAPRICORN
	"{\\capwedge}": '\u2A44', // INTERSECTION WITH LOGICAL AND
	"{\\cap}": '\u2229', // INTERSECTION
	"{\\caretinsert}": '\u2038', // CARET (insertion mark)
	"{\\carriagereturn}": '\u21B5', // downwards arrow with corner leftward = carriage return
	"{\\cat}": '\u2040', // CHARACTER TIE, z notation sequence concatenation
	"{\\ccwundercurvearrow}": '\u293F', // LOWER LEFT SEMICIRCULAR ANTICLOCKWISE ARROW
	"{\\cdots}": '\u22EF', // MIDLINE HORIZONTAL ELLIPSIS
	"{\\cdot}": '\u00B7', // MIDDLE DOT
	"{\\chi}": '\u03C7', // GREEK SMALL LETTER CHI
	"{\\cirE}": '\u29C3', // CIRCLE WITH TWO HORIZONTAL STROKES TO THE RIGHT
	"{\\cirbot}": '\u27DF', // UP TACK WITH CIRCLE ABOVE
	"{\\circeq}": '\u2257', // RING EQUAL TO
	"{\\circlearrowleft}": '\u21BA', // ANTICLOCKWISE OPEN CIRCLE ARROW
	"{\\circlearrowright}": '\u21BB', // CLOCKWISE OPEN CIRCLE ARROW
	"{\\circledS}": '\u24C8', // CIRCLED LATIN CAPITAL LETTER S
	"{\\circledast}": '\u229B', // CIRCLED ASTERISK OPERATOR
	"{\\circledbslash}": '\u29B8', // CIRCLED REVERSE SOLIDUS
	"{\\circledbullet}": '\u29BF', // CIRCLED BULLET
	"{\\circledcirc}": '\u229A', // CIRCLED RING OPERATOR
	"{\\circleddash}": '\u229D', // CIRCLED DASH
	"{\\circledequal}": '\u229C', // equal in circle
	"{\\circledgtr}": '\u29C1', // CIRCLED GREATER-THAN
	"{\\circledless}": '\u29C0', // CIRCLED LESS-THAN
	"{\\circledownarrow}": '\u29EC', // WHITE CIRCLE WITH DOWN ARROW
	"{\\circledparallel}": '\u29B7', // CIRCLED PARALLEL
	"{\\circledrightdot}": '\u2686', // WHITE CIRCLE WITH DOT RIGHT
	"{\\circledtwodots}": '\u2687', // WHITE CIRCLE WITH TWO DOTS
	"{\\circledwhitebullet}": '\u29BE', // CIRCLED WHITE BULLET
	"{\\circlellquad}": '\u25F5', // WHITE CIRCLE WITH LOWER LEFT QUADRANT
	"{\\circlelrquad}": '\u25F6', // WHITE CIRCLE WITH LOWER RIGHT QUADRANT
	"{\\circleonleftarrow}": '\u2B30', // LEFT ARROW WITH SMALL CIRCLE
	"{\\circleonrightarrow}": '\u21F4', // RIGHT ARROW WITH SMALL CIRCLE
	"{\\circletophalfblack}": '\u25D3', // circle, filled top half
	"{\\circleulquad}": '\u25F4', // WHITE CIRCLE WITH UPPER LEFT QUADRANT
	"{\\circleurquadblack}": '\u25D4', // CIRCLE WITH UPPER RIGHT QUADRANT BLACK
	"{\\circleurquad}": '\u25F7', // WHITE CIRCLE WITH UPPER RIGHT QUADRANT
	"{\\circlevertfill}": '\u25CD', // CIRCLE WITH VERTICAL FILL
	"{\\circ}": '\u2218', // RING OPERATOR
	"{\\cirmid}": '\u2AEF', // VERTICAL LINE WITH CIRCLE ABOVE
	"{\\cirscir}": '\u29C2', // CIRCLE WITH SMALL CIRCLE TO THE RIGHT
	"{\\clockoint}": '\u2A0F', // INTEGRAL AVERAGE WITH SLASH
	"{\\closedvarcap}": '\u2A4D', // CLOSED INTERSECTION WITH SERIFS
	"{\\closedvarcupsmashprod}": '\u2A50', // CLOSED UNION WITH SERIFS AND SMASH PRODUCT
	"{\\closedvarcup}": '\u2A4C', // CLOSED UNION WITH SERIFS
	"{\\closure}": '\u2050', // CLOSE UP (editing mark)
	"{\\clwintegral}": '\u2231', // CLOCKWISE INTEGRAL
	"{\\commaminus}": '\u2A29', // MINUS SIGN WITH COMMA ABOVE
	"{\\complement}": '\u2201', // COMPLEMENT
	"{\\concavediamondtickleft}": '\u27E2', // WHITE CONCAVE-SIDED DIAMOND WITH LEFTWARDS TICK
	"{\\concavediamondtickright}": '\u27E3', // WHITE CONCAVE-SIDED DIAMOND WITH RIGHTWARDS TICK
	"{\\concavediamond}": '\u27E1', // WHITE CONCAVE-SIDED DIAMOND
	"{\\congdot}": '\u2A6D', // CONGRUENT WITH DOT ABOVE
	"{\\cong}": '\u2245', // APPROXIMATELY EQUAL TO
	"{\\conictaper}": '\u2332', // CONICAL TAPER
	"{\\coprod}": '\u2210', // N-ARY COPRODUCT
	"{\\csube}": '\u2AD1', // CLOSED SUBSET OR EQUAL TO
	"{\\csub}": '\u2ACF', // CLOSED SUBSET
	"{\\csupe}": '\u2AD2', // CLOSED SUPERSET OR EQUAL TO
	"{\\csup}": '\u2AD0', // CLOSED SUPERSET
	"{\\cupbarcap}": '\u2A48', // UNION ABOVE BAR ABOVE INTERSECTION
	"{\\cupdot}": '\u228D', // union, with dot
	"{\\cupleftarrow}": '\u228C', // MULTISET
	"{\\cupovercap}": '\u2A46', // UNION ABOVE INTERSECTION
	"{\\cupvee}": '\u2A45', // UNION WITH LOGICAL OR
	"{\\cup}": '\u222A', // UNION
	"{\\curlyeqprec}": '\u22DE', // EQUAL TO OR PRECEDES
	"{\\curlyeqsucc}": '\u22DF', // EQUAL TO OR SUCCEEDS
	"{\\curlyvee}": '\u22CE', // CURLY LOGICAL OR
	"{\\curlywedge}": '\u22CF', // CURLY LOGICAL AND
	"{\\curvearrowleftplus}": '\u293D', // TOP ARC ANTICLOCKWISE ARROW WITH PLUS
	"{\\curvearrowleft}": '\u21B6', // ANTICLOCKWISE TOP SEMICIRCLE ARROW
	"{\\curvearrowrightminus}": '\u293C', // TOP ARC CLOCKWISE ARROW WITH MINUS
	"{\\curvearrowright}": '\u21B7', // CLOCKWISE TOP SEMICIRCLE ARROW
	"{\\cwgapcirclearrow}": '\u27F3', // CLOCKWISE GAPPED CIRCLE ARROW
	"{\\cwrightarcarrow}": '\u2938', // RIGHT-SIDE ARC CLOCKWISE ARROW
	"{\\cwundercurvearrow}": '\u293E', // LOWER RIGHT SEMICIRCULAR CLOCKWISE ARROW
	"{\\cyrchar\\CYRABHCHDSC}": '\u04BE', // CYRILLIC CAPITAL LETTER ABKHASIAN CHE WITH DESCENDER
	"{\\cyrchar\\CYRABHCH}": '\u04BC', // CYRILLIC CAPITAL LETTER ABKHASIAN CHE
	"{\\cyrchar\\CYRABHDZE}": '\u04E0', // CYRILLIC CAPITAL LETTER ABKHASIAN DZE
	"{\\cyrchar\\CYRABHHA}": '\u04A8', // CYRILLIC CAPITAL LETTER ABKHASIAN HA
	"{\\cyrchar\\CYRAE}": '\u04D4', // CYRILLIC CAPITAL LIGATURE A IE
	"{\\cyrchar\\CYRA}": '\u0410', // CYRILLIC CAPITAL LETTER A
	"{\\cyrchar\\CYRBYUS}": '\u046A', // CYRILLIC CAPITAL LETTER BIG YUS
	"{\\cyrchar\\CYRB}": '\u0411', // CYRILLIC CAPITAL LETTER BE
	"{\\cyrchar\\CYRCHLDSC}": '\u04CB', // CYRILLIC CAPITAL LETTER KHAKASSIAN CHE
	"{\\cyrchar\\CYRCHRDSC}": '\u04B6', // CYRILLIC CAPITAL LETTER CHE WITH DESCENDER
	"{\\cyrchar\\CYRCHVCRS}": '\u04B8', // CYRILLIC CAPITAL LETTER CHE WITH VERTICAL STROKE
	"{\\cyrchar\\CYRCH}": '\u0427', // CYRILLIC CAPITAL LETTER CHE
	"{\\cyrchar\\CYRC}": '\u0426', // CYRILLIC CAPITAL LETTER TSE
	"{\\cyrchar\\CYRDJE}": '\u0402', // CYRILLIC CAPITAL LETTER DJE
	"{\\cyrchar\\CYRDZE}": '\u0405', // CYRILLIC CAPITAL LETTER DZE
	"{\\cyrchar\\CYRDZHE}": '\u040F', // CYRILLIC CAPITAL LETTER DZHE
	"{\\cyrchar\\CYRD}": '\u0414', // CYRILLIC CAPITAL LETTER DE
	"{\\cyrchar\\CYREREV}": '\u042D', // CYRILLIC CAPITAL LETTER E
	"{\\cyrchar\\CYRERY}": '\u042B', // CYRILLIC CAPITAL LETTER YERU
	"{\\cyrchar\\CYRE}": '\u0415', // CYRILLIC CAPITAL LETTER IE
	"{\\cyrchar\\CYRFITA}": '\u0472', // CYRILLIC CAPITAL LETTER FITA
	"{\\cyrchar\\CYRF}": '\u0424', // CYRILLIC CAPITAL LETTER EF
	"{\\cyrchar\\CYRGHCRS}": '\u0492', // CYRILLIC CAPITAL LETTER GHE WITH STROKE
	"{\\cyrchar\\CYRGHK}": '\u0494', // CYRILLIC CAPITAL LETTER GHE WITH MIDDLE HOOK
	"{\\cyrchar\\CYRGUP}": '\u0490', // CYRILLIC CAPITAL LETTER GHE WITH UPTURN
	"{\\cyrchar\\CYRG}": '\u0413', // CYRILLIC CAPITAL LETTER GHE
	"{\\cyrchar\\CYRHDSC}": '\u04B2', // CYRILLIC CAPITAL LETTER HA WITH DESCENDER
	"{\\cyrchar\\CYRHRDSN}": '\u042A', // CYRILLIC CAPITAL LETTER HARD SIGN
	"{\\cyrchar\\CYRH}": '\u0425', // CYRILLIC CAPITAL LETTER HA
	"{\\cyrchar\\CYRIE}": '\u0404', // CYRILLIC CAPITAL LETTER UKRAINIAN IE
	"{\\cyrchar\\CYRII}": '\u0406', // CYRILLIC CAPITAL LETTER BYELORUSSIAN-UKRAINIAN I
	"{\\cyrchar\\CYRIOTBYUS}": '\u046C', // CYRILLIC CAPITAL LETTER IOTIFIED BIG YUS
	"{\\cyrchar\\CYRIOTE}": '\u0464', // CYRILLIC CAPITAL LETTER IOTIFIED E
	"{\\cyrchar\\CYRIOTLYUS}": '\u0468', // CYRILLIC CAPITAL LETTER IOTIFIED LITTLE YUS
	"{\\cyrchar\\CYRISHRT}": '\u0419', // CYRILLIC CAPITAL LETTER SHORT I
	"{\\cyrchar\\CYRIZH}": '\u0474', // CYRILLIC CAPITAL LETTER IZHITSA
	"{\\cyrchar\\CYRI}": '\u0418', // CYRILLIC CAPITAL LETTER I
	"{\\cyrchar\\CYRJE}": '\u0408', // CYRILLIC CAPITAL LETTER JE
	"{\\cyrchar\\CYRKBEAK}": '\u04A0', // CYRILLIC CAPITAL LETTER BASHKIR KA
	"{\\cyrchar\\CYRKDSC}": '\u049A', // CYRILLIC CAPITAL LETTER KA WITH DESCENDER
	"{\\cyrchar\\CYRKHCRS}": '\u049E', // CYRILLIC CAPITAL LETTER KA WITH STROKE
	"{\\cyrchar\\CYRKHK}": '\u04C3', // CYRILLIC CAPITAL LETTER KA WITH HOOK
	"{\\cyrchar\\CYRKOPPA}": '\u0480', // CYRILLIC CAPITAL LETTER KOPPA
	"{\\cyrchar\\CYRKSI}": '\u046E', // CYRILLIC CAPITAL LETTER KSI
	"{\\cyrchar\\CYRKVCRS}": '\u049C', // CYRILLIC CAPITAL LETTER KA WITH VERTICAL STROKE
	"{\\cyrchar\\CYRK}": '\u041A', // CYRILLIC CAPITAL LETTER KA
	"{\\cyrchar\\CYRLJE}": '\u0409', // CYRILLIC CAPITAL LETTER LJE
	"{\\cyrchar\\CYRLYUS}": '\u0466', // CYRILLIC CAPITAL LETTER LITTLE YUS
	"{\\cyrchar\\CYRL}": '\u041B', // CYRILLIC CAPITAL LETTER EL
	"{\\cyrchar\\CYRM}": '\u041C', // CYRILLIC CAPITAL LETTER EM
	"{\\cyrchar\\CYRNDSC}": '\u04A2', // CYRILLIC CAPITAL LETTER EN WITH DESCENDER
	"{\\cyrchar\\CYRNG}": '\u04A4', // CYRILLIC CAPITAL LIGATURE EN GHE
	"{\\cyrchar\\CYRNHK}": '\u04C7', // CYRILLIC CAPITAL LETTER EN WITH HOOK
	"{\\cyrchar\\CYRNJE}": '\u040A', // CYRILLIC CAPITAL LETTER NJE
	"{\\cyrchar\\CYRN}": '\u041D', // CYRILLIC CAPITAL LETTER EN
	"{\\cyrchar\\CYROMEGARND}": '\u047A', // CYRILLIC CAPITAL LETTER ROUND OMEGA
	"{\\cyrchar\\CYROMEGATITLO}": '\u047C', // CYRILLIC CAPITAL LETTER OMEGA WITH TITLO
	"{\\cyrchar\\CYROMEGA}": '\u0460', // CYRILLIC CAPITAL LETTER OMEGA
	"{\\cyrchar\\CYROTLD}": '\u04E8', // CYRILLIC CAPITAL LETTER BARRED O
	"{\\cyrchar\\CYROT}": '\u047E', // CYRILLIC CAPITAL LETTER OT
	"{\\cyrchar\\CYRO}": '\u041E', // CYRILLIC CAPITAL LETTER O
	"{\\cyrchar\\CYRPHK}": '\u04A6', // CYRILLIC CAPITAL LETTER PE WITH MIDDLE HOOK
	"{\\cyrchar\\CYRPSI}": '\u0470', // CYRILLIC CAPITAL LETTER PSI
	"{\\cyrchar\\CYRP}": '\u041F', // CYRILLIC CAPITAL LETTER PE
	"{\\cyrchar\\CYRRTICK}": '\u048E', // CYRILLIC CAPITAL LETTER ER WITH TICK
	"{\\cyrchar\\CYRR}": '\u0420', // CYRILLIC CAPITAL LETTER ER
	"{\\cyrchar\\CYRSCHWA}": '\u04D8', // CYRILLIC CAPITAL LETTER SCHWA
	"{\\cyrchar\\CYRSDSC}": '\u04AA', // CYRILLIC CAPITAL LETTER ES WITH DESCENDER
	"{\\cyrchar\\CYRSEMISFTSN}": '\u048C', // CYRILLIC CAPITAL LETTER SEMISOFT SIGN
	"{\\cyrchar\\CYRSFTSN}": '\u042C', // CYRILLIC CAPITAL LETTER SOFT SIGN
	"{\\cyrchar\\CYRSHCH}": '\u0429', // CYRILLIC CAPITAL LETTER SHCHA
	"{\\cyrchar\\CYRSHHA}": '\u04BA', // CYRILLIC CAPITAL LETTER SHHA
	"{\\cyrchar\\CYRSH}": '\u0428', // CYRILLIC CAPITAL LETTER SHA
	"{\\cyrchar\\CYRS}": '\u0421', // CYRILLIC CAPITAL LETTER ES
	"{\\cyrchar\\CYRTDSC}": '\u04AC', // CYRILLIC CAPITAL LETTER TE WITH DESCENDER
	"{\\cyrchar\\CYRTETSE}": '\u04B4', // CYRILLIC CAPITAL LIGATURE TE TSE
	"{\\cyrchar\\CYRTSHE}": '\u040B', // CYRILLIC CAPITAL LETTER TSHE
	"{\\cyrchar\\CYRT}": '\u0422', // CYRILLIC CAPITAL LETTER TE
	"{\\cyrchar\\CYRUK}": '\u0478', // CYRILLIC CAPITAL LETTER UK
	"{\\cyrchar\\CYRUSHRT}": '\u040E', // CYRILLIC CAPITAL LETTER SHORT U
	"{\\cyrchar\\CYRU}": '\u0423', // CYRILLIC CAPITAL LETTER U
	"{\\cyrchar\\CYRV}": '\u0412', // CYRILLIC CAPITAL LETTER VE
	"{\\cyrchar\\CYRYAT}": '\u0462', // CYRILLIC CAPITAL LETTER YAT
	"{\\cyrchar\\CYRYA}": '\u042F', // CYRILLIC CAPITAL LETTER YA
	"{\\cyrchar\\CYRYHCRS}": '\u04B0', // CYRILLIC CAPITAL LETTER STRAIGHT U WITH STROKE
	"{\\cyrchar\\CYRYI}": '\u0407', // CYRILLIC CAPITAL LETTER YI
	"{\\cyrchar\\CYRYO}": '\u0401', // CYRILLIC CAPITAL LETTER IO
	"{\\cyrchar\\CYRYU}": '\u042E', // CYRILLIC CAPITAL LETTER YU
	"{\\cyrchar\\CYRY}": '\u04AE', // CYRILLIC CAPITAL LETTER STRAIGHT U
	"{\\cyrchar\\CYRZDSC}": '\u0498', // CYRILLIC CAPITAL LETTER ZE WITH DESCENDER
	"{\\cyrchar\\CYRZHDSC}": '\u0496', // CYRILLIC CAPITAL LETTER ZHE WITH DESCENDER
	"{\\cyrchar\\CYRZH}": '\u0416', // CYRILLIC CAPITAL LETTER ZHE
	"{\\cyrchar\\CYRZ}": '\u0417', // CYRILLIC CAPITAL LETTER ZE
	"{\\cyrchar\\CYRpalochka}": '\u04C0', // CYRILLIC LETTER PALOCHKA
	"{\\cyrchar\\C}": '\u030F', // COMBINING DOUBLE GRAVE ACCENT
	"{\\cyrchar\\cyrabhchdsc}": '\u04BF', // CYRILLIC SMALL LETTER ABKHASIAN CHE WITH DESCENDER
	"{\\cyrchar\\cyrabhch}": '\u04BD', // CYRILLIC SMALL LETTER ABKHASIAN CHE
	"{\\cyrchar\\cyrabhdze}": '\u04E1', // CYRILLIC SMALL LETTER ABKHASIAN DZE
	"{\\cyrchar\\cyrabhha}": '\u04A9', // CYRILLIC SMALL LETTER ABKHASIAN HA
	"{\\cyrchar\\cyrae}": '\u04D5', // CYRILLIC SMALL LIGATURE A IE
	"{\\cyrchar\\cyra}": '\u0430', // CYRILLIC SMALL LETTER A
	"{\\cyrchar\\cyrb}": '\u0431', // CYRILLIC SMALL LETTER BE
	"{\\cyrchar\\cyrchldsc}": '\u04CC', // CYRILLIC SMALL LETTER KHAKASSIAN CHE
	"{\\cyrchar\\cyrchrdsc}": '\u04B7', // CYRILLIC SMALL LETTER CHE WITH DESCENDER
	"{\\cyrchar\\cyrchvcrs}": '\u04B9', // CYRILLIC SMALL LETTER CHE WITH VERTICAL STROKE
	"{\\cyrchar\\cyrch}": '\u0447', // CYRILLIC SMALL LETTER CHE
	"{\\cyrchar\\cyrc}": '\u0446', // CYRILLIC SMALL LETTER TSE
	"{\\cyrchar\\cyrdje}": '\u0452', // CYRILLIC SMALL LETTER DJE
	"{\\cyrchar\\cyrdze}": '\u0455', // CYRILLIC SMALL LETTER DZE
	"{\\cyrchar\\cyrdzhe}": '\u045F', // CYRILLIC SMALL LETTER DZHE
	"{\\cyrchar\\cyrd}": '\u0434', // CYRILLIC SMALL LETTER DE
	"{\\cyrchar\\cyrerev}": '\u044D', // CYRILLIC SMALL LETTER E
	"{\\cyrchar\\cyrery}": '\u044B', // CYRILLIC SMALL LETTER YERU
	"{\\cyrchar\\cyre}": '\u0435', // CYRILLIC SMALL LETTER IE
	"{\\cyrchar\\cyrf}": '\u0444', // CYRILLIC SMALL LETTER EF
	"{\\cyrchar\\cyrghcrs}": '\u0493', // CYRILLIC SMALL LETTER GHE WITH STROKE
	"{\\cyrchar\\cyrghk}": '\u0495', // CYRILLIC SMALL LETTER GHE WITH MIDDLE HOOK
	"{\\cyrchar\\cyrgup}": '\u0491', // CYRILLIC SMALL LETTER GHE WITH UPTURN
	"{\\cyrchar\\cyrg}": '\u0433', // CYRILLIC SMALL LETTER GHE
	"{\\cyrchar\\cyrhdsc}": '\u04B3', // CYRILLIC SMALL LETTER HA WITH DESCENDER
	"{\\cyrchar\\cyrhrdsn}": '\u044A', // CYRILLIC SMALL LETTER HARD SIGN
	"{\\cyrchar\\cyrhundredthousands}": '\u0488', // COMBINING CYRILLIC HUNDRED THOUSANDS SIGN
	"{\\cyrchar\\cyrh}": '\u0445', // CYRILLIC SMALL LETTER HA
	"{\\cyrchar\\cyrie}": '\u0454', // CYRILLIC SMALL LETTER UKRAINIAN IE
	"{\\cyrchar\\cyrii}": '\u0456', // CYRILLIC SMALL LETTER BYELORUSSIAN-UKRAINIAN I
	"{\\cyrchar\\cyriotbyus}": '\u046D', // CYRILLIC SMALL LETTER IOTIFIED BIG YUS
	"{\\cyrchar\\cyriote}": '\u0465', // CYRILLIC SMALL LETTER IOTIFIED E
	"{\\cyrchar\\cyriotlyus}": '\u0469', // CYRILLIC SMALL LETTER IOTIFIED LITTLE YUS
	"{\\cyrchar\\cyrishrt}": '\u0439', // CYRILLIC SMALL LETTER SHORT I
	"{\\cyrchar\\cyri}": '\u0438', // CYRILLIC SMALL LETTER I
	"{\\cyrchar\\cyrje}": '\u0458', // CYRILLIC SMALL LETTER JE
	"{\\cyrchar\\cyrkbeak}": '\u04A1', // CYRILLIC SMALL LETTER BASHKIR KA
	"{\\cyrchar\\cyrkdsc}": '\u049B', // CYRILLIC SMALL LETTER KA WITH DESCENDER
	"{\\cyrchar\\cyrkhcrs}": '\u049F', // CYRILLIC SMALL LETTER KA WITH STROKE
	"{\\cyrchar\\cyrkhk}": '\u04C4', // CYRILLIC SMALL LETTER KA WITH HOOK
	"{\\cyrchar\\cyrkoppa}": '\u0481', // CYRILLIC SMALL LETTER KOPPA
	"{\\cyrchar\\cyrksi}": '\u046F', // CYRILLIC SMALL LETTER KSI
	"{\\cyrchar\\cyrkvcrs}": '\u049D', // CYRILLIC SMALL LETTER KA WITH VERTICAL STROKE
	"{\\cyrchar\\cyrk}": '\u043A', // CYRILLIC SMALL LETTER KA
	"{\\cyrchar\\cyrlje}": '\u0459', // CYRILLIC SMALL LETTER LJE
	"{\\cyrchar\\cyrlyus}": '\u0467', // CYRILLIC SMALL LETTER LITTLE YUS
	"{\\cyrchar\\cyrl}": '\u043B', // CYRILLIC SMALL LETTER EL
	"{\\cyrchar\\cyrmillions}": '\u0489', // COMBINING CYRILLIC MILLIONS SIGN
	"{\\cyrchar\\cyrm}": '\u043C', // CYRILLIC SMALL LETTER EM
	"{\\cyrchar\\cyrndsc}": '\u04A3', // CYRILLIC SMALL LETTER EN WITH DESCENDER
	"{\\cyrchar\\cyrng}": '\u04A5', // CYRILLIC SMALL LIGATURE EN GHE
	"{\\cyrchar\\cyrnhk}": '\u04C8', // CYRILLIC SMALL LETTER EN WITH HOOK
	"{\\cyrchar\\cyrnje}": '\u045A', // CYRILLIC SMALL LETTER NJE
	"{\\cyrchar\\cyrn}": '\u043D', // CYRILLIC SMALL LETTER EN
	"{\\cyrchar\\cyromegarnd}": '\u047B', // CYRILLIC SMALL LETTER ROUND OMEGA
	"{\\cyrchar\\cyromegatitlo}": '\u047D', // CYRILLIC SMALL LETTER OMEGA WITH TITLO
	"{\\cyrchar\\cyromega}": '\u0461', // CYRILLIC SMALL LETTER OMEGA
	"{\\cyrchar\\cyrotld}": '\u04E9', // CYRILLIC SMALL LETTER BARRED O
	"{\\cyrchar\\cyrot}": '\u047F', // CYRILLIC SMALL LETTER OT
	"{\\cyrchar\\cyro}": '\u043E', // CYRILLIC SMALL LETTER O
	"{\\cyrchar\\cyrphk}": '\u04A7', // CYRILLIC SMALL LETTER PE WITH MIDDLE HOOK
	"{\\cyrchar\\cyrpsi}": '\u0471', // CYRILLIC SMALL LETTER PSI
	"{\\cyrchar\\cyrp}": '\u043F', // CYRILLIC SMALL LETTER PE
	"{\\cyrchar\\cyrrtick}": '\u048F', // CYRILLIC SMALL LETTER ER WITH TICK
	"{\\cyrchar\\cyrr}": '\u0440', // CYRILLIC SMALL LETTER ER
	"{\\cyrchar\\cyrschwa}": '\u04D9', // CYRILLIC SMALL LETTER SCHWA
	"{\\cyrchar\\cyrsdsc}": '\u04AB', // CYRILLIC SMALL LETTER ES WITH DESCENDER
	"{\\cyrchar\\cyrsemisftsn}": '\u048D', // CYRILLIC SMALL LETTER SEMISOFT SIGN
	"{\\cyrchar\\cyrsftsn}": '\u044C', // CYRILLIC SMALL LETTER SOFT SIGN
	"{\\cyrchar\\cyrshch}": '\u0449', // CYRILLIC SMALL LETTER SHCHA
	"{\\cyrchar\\cyrshha}": '\u04BB', // CYRILLIC SMALL LETTER SHHA
	"{\\cyrchar\\cyrsh}": '\u0448', // CYRILLIC SMALL LETTER SHA
	"{\\cyrchar\\cyrs}": '\u0441', // CYRILLIC SMALL LETTER ES
	"{\\cyrchar\\cyrtdsc}": '\u04AD', // CYRILLIC SMALL LETTER TE WITH DESCENDER
	"{\\cyrchar\\cyrtetse}": '\u04B5', // CYRILLIC SMALL LIGATURE TE TSE
	"{\\cyrchar\\cyrthousands}": '\u0482', // CYRILLIC THOUSANDS SIGN
	"{\\cyrchar\\cyrtshe}": '\u045B', // CYRILLIC SMALL LETTER TSHE
	"{\\cyrchar\\cyrt}": '\u0442', // CYRILLIC SMALL LETTER TE
	"{\\cyrchar\\cyruk}": '\u0479', // CYRILLIC SMALL LETTER UK
	"{\\cyrchar\\cyrushrt}": '\u045E', // CYRILLIC SMALL LETTER SHORT U
	"{\\cyrchar\\cyru}": '\u0443', // CYRILLIC SMALL LETTER U
	"{\\cyrchar\\cyrv}": '\u0432', // CYRILLIC SMALL LETTER VE
	"{\\cyrchar\\cyrya}": '\u044F', // CYRILLIC SMALL LETTER YA
	"{\\cyrchar\\cyryhcrs}": '\u04B1', // CYRILLIC SMALL LETTER STRAIGHT U WITH STROKE
	"{\\cyrchar\\cyryi}": '\u0457', // CYRILLIC SMALL LETTER YI
	"{\\cyrchar\\cyryo}": '\u0451', // CYRILLIC SMALL LETTER IO
	"{\\cyrchar\\cyryu}": '\u044E', // CYRILLIC SMALL LETTER YU
	"{\\cyrchar\\cyry}": '\u04AF', // CYRILLIC SMALL LETTER STRAIGHT U
	"{\\cyrchar\\cyrzdsc}": '\u0499', // CYRILLIC SMALL LETTER ZE WITH DESCENDER
	"{\\cyrchar\\cyrzhdsc}": '\u0497', // CYRILLIC SMALL LETTER ZHE WITH DESCENDER
	"{\\cyrchar\\cyrzh}": '\u0436', // CYRILLIC SMALL LETTER ZHE
	"{\\cyrchar\\cyrz}": '\u0437', // CYRILLIC SMALL LETTER ZE
	"{\\cyrchar\\textnumero}": '\u2116', // NUMERO SIGN
	"{\\c}": '\u00B8', // CEDILLA
	"{\\daleth}": '\u2138', // DALET SYMBOL
	"{\\danger}": '\u2621', // CAUTION SIGN, dangerous bend
	"{\\dashVdash}": '\u27DB', // LEFT AND RIGHT TACK
	"{\\dashV}": '\u2AE3', // DOUBLE VERTICAL BAR LEFT TURNSTILE
	"{\\dashleftarrow}": '\u21E0', // LEFTWARDS DASHED ARROW
	"{\\dashrightarrow}": '\u21E2', // = \dasharrow (amsfonts), RIGHTWARDS DASHED ARROW
	"{\\dashv}": '\u22A3', // LEFT TACK
	"{\\dbend}": '\uFFFD',
	"{\\dbkarow}": '\u290F', // RIGHTWARDS TRIPLE DASH ARROW
	"{\\dblarrowupdown}": '\u21C5', // UPWARDS ARROW LEFTWARDS OF DOWNWARDS ARROW
	"{\\ddddot}": '\u20DC', // COMBINING FOUR DOTS ABOVE
	"{\\dddot}": '\u20DB', // COMBINING THREE DOTS ABOVE
	"{\\ddotseq}": '\u2A77', // EQUALS SIGN WITH TWO DOTS ABOVE AND TWO DOTS BELOW
	"{\\delta}": '\u03B4', // GREEK SMALL LETTER DELTA
	"{\\dh}": '\u00F0', // LATIN SMALL LETTER ETH
	"{\\diagup}": '\u2571', // BOX DRAWINGS LIGHT DIAGONAL UPPER RIGHT TO LOWER LEFT
	"{\\diameter}": '\u2300', // # \varnothing (amssymb), DIAMETER SIGN
	"{\\diamondbotblack}": '\u2B19', // DIAMOND WITH BOTTOM HALF BLACK
	"{\\diamondleftarrowbar}": '\u291F', // LEFTWARDS ARROW FROM BAR TO BLACK DIAMOND
	"{\\diamondleftarrow}": '\u291D', // LEFTWARDS ARROW TO BLACK DIAMOND
	"{\\diamondleftblack}": '\u2B16', // DIAMOND WITH LEFT HALF BLACK
	"{\\diamondrightblack}": '\u2B17', // DIAMOND WITH RIGHT HALF BLACK
	"{\\diamondtopblack}": '\u2B18', // DIAMOND WITH TOP HALF BLACK
	"{\\diamond}": '\u22C4', // DIAMOND OPERATOR
	"{\\diceiii}": '\u2682', // DIE FACE-3
	"{\\diceii}": '\u2681', // DIE FACE-2
	"{\\diceiv}": '\u2683', // DIE FACE-4
	"{\\dicei}": '\u2680', // DIE FACE-1
	"{\\dicevi}": '\u2685', // DIE FACE-6
	"{\\dicev}": '\u2684', // DIE FACE-5
	"{\\digamma}": '\u03DD', // GREEK SMALL LETTER DIGAMMA
	"{\\disin}": '\u22F2', // ELEMENT OF WITH LONG HORIZONTAL STROKE
	"{\\divideontimes}": '\u22C7', // DIVISION TIMES
	"{\\div}": '\u00F7', // DIVISION SIGN
	"{\\dj}": '\u0111', // LATIN SMALL LETTER D WITH STROKE
	"{\\dlsh}": '\u21B2', // left down angled arrow
	"{\\doteqdot}": '\u2251', // GEOMETRICALLY EQUAL TO
	"{\\dotequiv}": '\u2A67', // IDENTICAL WITH DOT ABOVE
	"{\\doteq}": '\u2250', // APPROACHES THE LIMIT
	"{\\dotplus}": '\u2214', // DOT PLUS
	"{\\dotsim}": '\u2A6A', // TILDE OPERATOR WITH DOT ABOVE
	"{\\dottedcircle}": '\u25CC', // DOTTED CIRCLE
	"{\\dottedsquare}": '\u2B1A', // DOTTED SQUARE
	"{\\dottimes}": '\u2A30', // MULTIPLICATION SIGN WITH DOT ABOVE
	"{\\doublebarvee}": '\u2A62', // LOGICAL OR WITH DOUBLE OVERBAR
	"{\\doubleplus}": '\u29FA', // DOUBLE PLUS
	"{\\downarrowbarred}": '\u2908', // DOWNWARDS ARROW WITH HORIZONTAL STROKE
	"{\\downarrow}": '\u2193', // DOWNWARDS ARROW
	"{\\downdasharrow}": '\u21E3', // DOWNWARDS DASHED ARROW
	"{\\downdownarrows}": '\u21CA', // DOWNWARDS PAIRED ARROWS
	"{\\downdownharpoons}": '\u2965', // DOWNWARDS HARPOON WITH BARB LEFT BESIDE DOWNWARDS HARPOON WITH BARB RIGHT
	"{\\downfishtail}": '\u297F', // DOWN FISH TAIL
	"{\\downharpoonleft}": '\u21C3', // DOWNWARDS HARPOON WITH BARB LEFTWARDS
	"{\\downharpoonright}": '\u21C2', // DOWNWARDS HARPOON WITH BARB RIGHTWARDS
	"{\\downrightcurvedarrow}": '\u2935', // ARROW POINTING RIGHTWARDS THEN CURVING DOWNWARDS
	"{\\downslopeellipsis}": '\u22F1', // DOWN RIGHT DIAGONAL ELLIPSIS
	"{\\downtriangleleftblack}": '\u29E8', // DOWN-POINTING TRIANGLE WITH LEFT HALF BLACK
	"{\\downtrianglerightblack}": '\u29E9', // DOWN-POINTING TRIANGLE WITH RIGHT HALF BLACK
	"{\\downwhitearrow}": '\u21E9', // DOWNWARDS WHITE ARROW
	"{\\drbkarow}": '\u2910', // RIGHTWARDS TWO-HEADED TRIPLE DASH ARROW
	"{\\droang}": '\u031A', // left angle above (non-spacing)
	"{\\dsol}": '\u29F6', // SOLIDUS WITH OVERBAR
	"{\\dsub}": '\u2A64', // = \ndres (oz), Z NOTATION DOMAIN ANTIRESTRICTION
	"{\\earth}": '\u2641', // = \varEarth (mathabx), EARTH
	"{\\egsdot}": '\u2A98', // SLANTED EQUAL TO OR GREATER-THAN WITH DOT INSIDE
	"{\\eighthnote}": '\u266A', // EIGHTH NOTE
	"{\\elinters}": '\u23E7', // ELECTRICAL INTERSECTION
	"{\\elsdot}": '\u2A97', // SLANTED EQUAL TO OR LESS-THAN WITH DOT INSIDE
	"{\\emptysetoarrl}": '\u29B4', // EMPTY SET WITH LEFT ARROW ABOVE
	"{\\emptysetoarr}": '\u29B3', // EMPTY SET WITH RIGHT ARROW ABOVE
	"{\\emptysetobar}": '\u29B1', // EMPTY SET WITH OVERBAR
	"{\\emptysetocirc}": '\u29B2', // EMPTY SET WITH SMALL CIRCLE ABOVE
	"{\\enclosecircle}": '\u20DD', // COMBINING ENCLOSING CIRCLE
	"{\\enclosediamond}": '\u20DF', // COMBINING ENCLOSING DIAMOND
	"{\\enclosesquare}": '\u20DE', // COMBINING ENCLOSING SQUARE
	"{\\enclosetriangle}": '\u20E4', // COMBINING ENCLOSING UPWARD POINTING TRIANGLE
	"{\\eparsl}": '\u29E3', // EQUALS SIGN AND SLANTED PARALLEL
	"{\\epsilon}": '\u03B5', // GREEK SMALL LETTER EPSILON
	"{\\eqcirc}": '\u2256', // RING IN EQUAL TO
	"{\\eqcolon}": '\u2239', // # -: ,EXCESS
	"{\\eqdef}": '\u225D', // equals by definition
	"{\\eqdot}": '\u2A66', // EQUALS SIGN WITH DOT BELOW
	"{\\eqgtr}": '\u22DD', // equal-or-greater
	"{\\eqless}": '\u22DC', // equal-or-less
	"{\\eqqgtr}": '\u2A9A', // DOUBLE-LINE EQUAL TO OR GREATER-THAN
	"{\\eqqless}": '\u2A99', // DOUBLE-LINE EQUAL TO OR LESS-THAN
	"{\\eqqplus}": '\u2A71', // EQUALS SIGN ABOVE PLUS SIGN
	"{\\eqqsim}": '\u2A73', // EQUALS SIGN ABOVE TILDE OPERATOR
	"{\\eqqslantgtr}": '\u2A9C', // DOUBLE-LINE SLANTED EQUAL TO OR GREATER-THAN
	"{\\eqqslantless}": '\u2A9B', // DOUBLE-LINE SLANTED EQUAL TO OR LESS-THAN
	"{\\eqslantgtr}": '\u2A96', // SLANTED EQUAL TO OR GREATER-THAN
	"{\\eqslantless}": '\u2A95', // SLANTED EQUAL TO OR LESS-THAN
	"{\\equalleftarrow}": '\u2B40', // EQUALS SIGN ABOVE LEFTWARDS ARROW
	"{\\equalrightarrow}": '\u2971', // EQUALS SIGN ABOVE RIGHTWARDS ARROW
	"{\\equivDD}": '\u2A78', // EQUIVALENT WITH FOUR DOTS ABOVE
	"{\\equivVert}": '\u2A68', // TRIPLE HORIZONTAL BAR WITH DOUBLE VERTICAL STROKE
	"{\\equivVvert}": '\u2A69', // TRIPLE HORIZONTAL BAR WITH TRIPLE VERTICAL STROKE
	"{\\equiv}": '\u2261', // IDENTICAL TO
	"{\\eqvparsl}": '\u29E5', // IDENTICAL TO AND SLANTED PARALLEL
	"{\\errbarblackcircle}": '\u29F3', // ERROR-BARRED BLACK CIRCLE
	"{\\errbarblackdiamond}": '\u29F1', // ERROR-BARRED BLACK DIAMOND
	"{\\errbarblacksquare}": '\u29EF', // ERROR-BARRED BLACK SQUARE
	"{\\errbarcircle}": '\u29F2', // ERROR-BARRED WHITE CIRCLE
	"{\\errbardiamond}": '\u29F0', // ERROR-BARRED WHITE DIAMOND
	"{\\errbarsquare}": '\u29EE', // ERROR-BARRED WHITE SQUARE
	"{\\estimates}": '\u2259', // ESTIMATES
	"{\\eta}": '\u03B7', // GREEK SMALL LETTER ETA
	"{\\eth}": '\u01AA', // LATIN LETTER REVERSED ESH LOOP
	"{\\exists}": '\u2203', // THERE EXISTS
	"{\\fallingdotseq}": '\u2252', // APPROXIMATELY EQUAL TO OR THE IMAGE OF
	"{\\fbowtie}": '\u29D3', // BLACK BOWTIE
	"{\\fcmp}": '\u2A3E', // = \comp (oz), Z NOTATION RELATIONAL COMPOSITION
	"{\\fdiagovnearrow}": '\u292F', // FALLING DIAGONAL CROSSING NORTH EAST ARROW
	"{\\fdiagovrdiag}": '\u292C', // FALLING DIAGONAL CROSSING RISING DIAGONAL
	"{\\ffun}": '\u21FB', // RIGHTWARDS ARROW WITH DOUBLE VERTICAL STROKE, z notation finite function
	"{\\finj}": '\u2915', // RIGHTWARDS ARROW WITH TAIL WITH DOUBLE VERTICAL STROKE, z notation finite injection
	"{\\fisheye}": '\u25C9', // FISHEYE
	"{\\flat}": '\u266D', // MUSIC FLAT SIGN
	"{\\fltns}": '\u23E5', // FLATNESS
	"{\\fontencoding{LECO}\\selectfont\\char177}": '\u0311', // COMBINING INVERTED BREVE
	"{\\fontencoding{LECO}\\selectfont\\char184}": '\u0318', // COMBINING LEFT TACK BELOW
	"{\\fontencoding{LECO}\\selectfont\\char185}": '\u0319', // COMBINING RIGHT TACK BELOW
	"{\\fontencoding{LECO}\\selectfont\\char203}": '\u032B', // COMBINING INVERTED DOUBLE ARCH BELOW
	"{\\fontencoding{LECO}\\selectfont\\char207}": '\u032F', // COMBINING INVERTED BREVE BELOW
	"{\\fontencoding{LECO}\\selectfont\\char215}": '\u0337', // COMBINING SHORT SOLIDUS OVERLAY
	"{\\fontencoding{LECO}\\selectfont\\char216}": '\u0338', // COMBINING LONG SOLIDUS OVERLAY
	"{\\fontencoding{LECO}\\selectfont\\char218}": '\u033A', // COMBINING INVERTED BRIDGE BELOW
	"{\\fontencoding{LECO}\\selectfont\\char219}": '\u033B', // COMBINING SQUARE BELOW
	"{\\fontencoding{LECO}\\selectfont\\char220}": '\u033C', // COMBINING SEAGULL BELOW
	"{\\fontencoding{LECO}\\selectfont\\char221}": '\u033D', // COMBINING X ABOVE
	"{\\fontencoding{LECO}\\selectfont\\char225}": '\u0361', // COMBINING DOUBLE INVERTED BREVE
	"{\\fontencoding{LEIP}\\selectfont\\char202}": '\u027F', // LATIN SMALL LETTER REVERSED R WITH FISHHOOK
	"{\\fontencoding{LEIP}\\selectfont\\char61}": '\u0258', // LATIN SMALL LETTER REVERSED E
	"{\\fontencoding{LELA}\\selectfont\\char195}": '\u01BA', // LATIN SMALL LETTER EZH WITH TAIL
	"{\\fontencoding{LELA}\\selectfont\\char201}": '\u013F', // LATIN CAPITAL LETTER L WITH MIDDLE DOT
	"{\\fontencoding{LELA}\\selectfont\\char202}": '\u0140', // LATIN SMALL LETTER L WITH MIDDLE DOT
	"{\\fontencoding{LELA}\\selectfont\\char40}": '\u0126', // LATIN CAPITAL LETTER H WITH STROKE
	"{\\fontencoding{LELA}\\selectfont\\char47}": '\u0166', // LATIN CAPITAL LETTER T WITH STROKE
	"{\\fontencoding{LELA}\\selectfont\\char63}": '\u0167', // LATIN SMALL LETTER T WITH STROKE
	"{\\fontencoding{LELA}\\selectfont\\char91}": '\u0138', // LATIN SMALL LETTER KRA
	"{\\forall}": '\u2200', // FOR ALL
	"{\\forcesextra}": '\u22A8', // TRUE
	"{\\forksnot}": '\u2ADD', // NONFORKING
	"{\\forks}": '\u2ADC', // FORKING
	"{\\forkv}": '\u2AD9', // ELEMENT OF OPENING DOWNWARDS
	"{\\fracslash}": '\u2044', // # /, FRACTION SLASH
	"{\\frownie}": '\u2639', // = \sadface (arevmath), WHITE FROWNING FACE
	"{\\frown}": '\u2322', // FROWN
	"{\\fullouterjoin}": '\u27D7', // FULL OUTER JOIN
	"{\\gamma}": '\u03B3', // GREEK SMALL LETTER GAMMA
	"{\\gemini}": '\u264A', // GEMINI
	"{\\geqqslant}": '\u2AFA', // DOUBLE-LINE SLANTED GREATER-THAN OR EQUAL TO
	"{\\geqq}": '\u2267', // GREATER-THAN OVER EQUAL TO
	"{\\geqslant}": '\u2A7E', // GREATER-THAN OR SLANTED EQUAL TO
	"{\\geq}": '\u2265', // GREATER-THAN OR EQUAL TO
	"{\\gescc}": '\u2AA9', // GREATER-THAN CLOSED BY CURVE ABOVE SLANTED EQUAL
	"{\\gesdotol}": '\u2A84', // GREATER-THAN OR SLANTED EQUAL TO WITH DOT ABOVE LEFT
	"{\\gesdoto}": '\u2A82', // GREATER-THAN OR SLANTED EQUAL TO WITH DOT ABOVE
	"{\\gesdot}": '\u2A80', // GREATER-THAN OR SLANTED EQUAL TO WITH DOT INSIDE
	"{\\gesles}": '\u2A94', // GREATER-THAN ABOVE SLANTED EQUAL ABOVE LESS-THAN ABOVE SLANTED EQUAL
	"{\\ggcurly}": '\u2ABC', // DOUBLE SUCCEEDS
	"{\\gggnest}": '\u2AF8', // TRIPLE NESTED GREATER-THAN
	"{\\gg}": '\u226B', // MUCH GREATER-THAN
	"{\\gimel}": '\u2137', // GIMEL SYMBOL
	"{\\glE}": '\u2A92', // GREATER-THAN ABOVE LESS-THAN ABOVE DOUBLE-LINE EQUAL
	"{\\gla}": '\u2AA5', // GREATER-THAN BESIDE LESS-THAN
	"{\\gleichstark}": '\u29E6', // GLEICH STARK
	"{\\glj}": '\u2AA4', // GREATER-THAN OVERLAPPING LESS-THAN
	"{\\gnapprox}": '\u2A8A', // GREATER-THAN AND NOT APPROXIMATE
	"{\\gneqq}": '\u2269', // GREATER-THAN BUT NOT EQUAL TO
	"{\\gneq}": '\u2A88', // GREATER-THAN AND SINGLE-LINE NOT EQUAL TO
	"{\\gnsim}": '\u22E7', // GREATER-THAN BUT NOT EQUIVALENT TO
	"{\\greaterequivlnt}": '\u2273', // GREATER-THAN OR EQUIVALENT TO
	"{\\gsime}": '\u2A8E', // GREATER-THAN ABOVE SIMILAR OR EQUAL
	"{\\gsiml}": '\u2A90', // GREATER-THAN ABOVE SIMILAR ABOVE LESS-THAN
	"{\\gtcir}": '\u2A7A', // GREATER-THAN WITH CIRCLE INSIDE
	"{\\gtquest}": '\u2A7C', // GREATER-THAN WITH QUESTION MARK ABOVE
	"{\\gtrapprox}": '\u2A86', // GREATER-THAN OR APPROXIMATE
	"{\\gtrarr}": '\u2978', // GREATER-THAN ABOVE RIGHTWARDS ARROW
	"{\\gtrdot}": '\u22D7', // GREATER-THAN WITH DOT
	"{\\gtreqless}": '\u22DB', // GREATER-THAN EQUAL TO OR LESS-THAN
	"{\\gtreqqless}": '\u2A8C', // GREATER-THAN ABOVE DOUBLE-LINE EQUAL ABOVE LESS-THAN
	"{\\gtrless}": '\u2277', // GREATER-THAN OR LESS-THAN
	"{\\guillemotleft}": '\u00AB', // LEFT-POINTING DOUBLE ANGLE QUOTATION MARK
	"{\\guillemotright}": '\u00BB', // RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK
	"{\\guilsinglleft}": '\u2039', // SINGLE LEFT-POINTING ANGLE QUOTATION MARK
	"{\\guilsinglright}": '\u203A', // SINGLE RIGHT-POINTING ANGLE QUOTATION MARK
	"{\\harrowextender}": '\u23AF', // HORIZONTAL LINE EXTENSION (used to extend arrows)
	"{\\hash}": '\u22D5', // parallel, equal; equal or parallel
	"{\\hatapprox}": '\u2A6F', // ALMOST EQUAL TO WITH CIRCUMFLEX ACCENT
	"{\\heartsuit}": '\u2661', // heart suit symbol
	"{\\hermitconjmatrix}": '\u22B9', // HERMITIAN CONJUGATE MATRIX
	"{\\hexagonblack}": '\u2B23', // HORIZONTAL BLACK HEXAGON
	"{\\hexagon}": '\u2394', // horizontal benzene ring [hexagon flat open]
	"{\\homothetic}": '\u223B', // HOMOTHETIC
	"{\\hookleftarrow}": '\u21A9', // LEFTWARDS ARROW WITH HOOK
	"{\\hookrightarrow}": '\u21AA', // RIGHTWARDS ARROW WITH HOOK
	"{\\hourglass}": '\u29D6', // WHITE HOURGLASS
	"{\\house}": '\u2302', // HOUSE
	"{\\hrectangleblack}": '\u25AC', // BLACK RECTANGLE
	"{\\hslash}": '\u210F', // PLANCK CONSTANT OVER TWO PI
	"{\\hyphenbullet}": '\u2043', // rectangle, filled (HYPHEN BULLET)
	"{\\hzigzag}": '\u3030', // zigzag
	"{\\iiiint}": '\u2A0C', // QUADRUPLE INTEGRAL OPERATOR
	"{\\image}": '\u22B7', // IMAGE OF
	"{\\imath}": '\uD835\uDEA4', // MATHEMATICAL ITALIC SMALL DOTLESS I
	"{\\increment}": '\u2206', // # \mathrm{\Delta}, laplacian (Delta; nabla square)
	"{\\infty}": '\u221E', // INFINITY
	"{\\intBar}": '\u2A0E', // INTEGRAL WITH DOUBLE STROKE
	"{\\int\\!\\int\\!\\int}": '\u222D', // TRIPLE INTEGRAL
	"{\\int\\!\\int}": '\u222C', // DOUBLE INTEGRAL
	"{\\intbottom}": '\u2321', // BOTTOM HALF INTEGRAL
	"{\\intcap}": '\u2A19', // INTEGRAL WITH INTERSECTION
	"{\\intcup}": '\u2A1A', // INTEGRAL WITH UNION
	"{\\intercal}": '\u22BA', // INTERCALATE
	"{\\interleave}": '\u2AF4', // TRIPLE VERTICAL BAR BINARY RELATION
	"{\\intextender}": '\u23AE', // INTEGRAL EXTENSION
	"{\\intlarhk}": '\u2A17', // INTEGRAL WITH LEFTWARDS ARROW WITH HOOK
	"{\\intprodr}": '\u2A3D', // RIGHTHAND INTERIOR PRODUCT
	"{\\inttop}": '\u2320', // TOP HALF INTEGRAL
	"{\\intx}": '\u2A18', // INTEGRAL WITH TIMES SIGN
	"{\\int}": '\u222B', // INTEGRAL
	"{\\invamp}": '\u214B', // # \bindnasrepma (stmaryrd), TURNED AMPERSAND
	"{\\inversewhitecircle}": '\u25D9', // INVERSE WHITE CIRCLE
	"{\\invneg}": '\u2310', // reverse not
	"{\\invwhitelowerhalfcircle}": '\u25DB', // LOWER HALF INVERSE WHITE CIRCLE
	"{\\invwhiteupperhalfcircle}": '\u25DA', // UPPER HALF INVERSE WHITE CIRCLE
	"{\\in}": '\u2208', // ELEMENT OF
	"{\\iota}": '\u03B9', // GREEK SMALL LETTER IOTA
	"{\\isinE}": '\u22F9', // ELEMENT OF WITH TWO HORIZONTAL STROKES
	"{\\isindot}": '\u22F5', // ELEMENT OF WITH DOT ABOVE
	"{\\isinobar}": '\u22F7', // SMALL ELEMENT OF WITH OVERBAR
	"{\\isins}": '\u22F4', // SMALL ELEMENT OF WITH VERTICAL BAR AT END OF HORIZONTAL STROKE
	"{\\isinvb}": '\u22F8', // ELEMENT OF WITH UNDERBAR
	"{\\i}": '\u0131', // LATIN SMALL LETTER DOTLESS I
	"{\\jmath}": '\u0237', // jmath
	"{\\jupiter}": '\u2643', // JUPITER
	"{\\kappa}": '\u03BA', // GREEK SMALL LETTER KAPPA
	"{\\koppa}": '\u03DF', // GREEK SMALL LETTER KOPPA
	"{\\k}": '\u02DB', // OGONEK
	"{\\lBrace}": '\u2983', // LEFT WHITE CURLY BRACKET
	"{\\lambda}": '\u03BB', // GREEK SMALL LETTER LAMDA
	"{\\langledot}": '\u2991', // LEFT ANGLE BRACKET WITH DOT
	"{\\langle}": '\u2329', // LEFT-POINTING ANGLE BRACKET
	"{\\lang}": '\u27EA', // MATHEMATICAL LEFT DOUBLE ANGLE BRACKET, z notation left chevron bracket
	"{\\laplac}": '\u29E0', // SQUARE WITH CONTOURED OUTLINE
	"{\\late}": '\u2AAD', // LARGER THAN OR EQUAL TO
	"{\\lat}": '\u2AAB', // LARGER THAN
	"{\\lazysinv}": '\u223E', // INVERTED LAZY S
	"{\\lblkbrbrak}": '\u2997', // LEFT BLACK TORTOISE SHELL BRACKET
	"{\\lblot}": '\u2989', // Z NOTATION LEFT BINDING BRACKET
	"{\\lbracelend}": '\u23A9', // LEFT CURLY BRACKET LOWER HOOK
	"{\\lbracemid}": '\u23A8', // LEFT CURLY BRACKET MIDDLE PIECE
	"{\\lbraceuend}": '\u23A7', // LEFT CURLY BRACKET UPPER HOOK
	"{\\lbrace}": '{', // LEFT CURLY BRACKET
	"{\\lbrackextender}": '\u23A2', // LEFT SQUARE BRACKET EXTENSION
	"{\\lbracklltick}": '\u298F', // LEFT SQUARE BRACKET WITH TICK IN BOTTOM CORNER
	"{\\lbrackubar}": '\u298B', // LEFT SQUARE BRACKET WITH UNDERBAR
	"{\\lbrackuend}": '\u23A1', // LEFT SQUARE BRACKET UPPER CORNER
	"{\\lbrackultick}": '\u298D', // LEFT SQUARE BRACKET WITH TICK IN TOP CORNER
	"{\\lbrbrak}": '\u2772', // LIGHT LEFT TORTOISE SHELL BRACKET ORNAMENT
	"{\\lceil}": '\u2308', // LEFT CEILING
	"{\\lcurvyangle}": '\u29FC', // left pointing curved angle bracket
	"{\\ldots}": '\u2026', // HORIZONTAL ELLIPSIS
	"{\\leftarrowapprox}": '\u2B4A', // LEFTWARDS ARROW ABOVE ALMOST EQUAL TO
	"{\\leftarrowbackapprox}": '\u2B42', // LEFTWARDS ARROW ABOVE REVERSE ALMOST EQUAL TO
	"{\\leftarrowbsimilar}": '\u2B4B', // LEFTWARDS ARROW ABOVE REVERSE TILDE OPERATOR
	"{\\leftarrowless}": '\u2977', // LEFTWARDS ARROW THROUGH LESS-THAN
	"{\\leftarrowonoplus}": '\u2B32', // LEFT ARROW WITH CIRCLED PLUS
	"{\\leftarrowplus}": '\u2946', // LEFTWARDS ARROW WITH PLUS BELOW
	"{\\leftarrowshortrightarrow}": '\u2943', // LEFTWARDS ARROW ABOVE SHORT RIGHTWARDS ARROW
	"{\\leftarrowsimilar}": '\u2973', // LEFTWARDS ARROW ABOVE TILDE OPERATOR
	"{\\leftarrowsubset}": '\u297A', // LEFTWARDS ARROW THROUGH SUBSET
	"{\\leftarrowtail}": '\u21A2', // LEFTWARDS ARROW WITH TAIL
	"{\\leftarrowtriangle}": '\u21FD', // LEFTWARDS OPEN-HEADED ARROW
	"{\\leftarrowx}": '\u2B3E', // LEFTWARDS ARROW THROUGH X
	"{\\leftarrow}": '\u2190', // LEFTWARDS ARROW
	"{\\leftbarharpoon}": '\u296A', // LEFTWARDS HARPOON WITH BARB UP ABOVE LONG DASH
	"{\\leftbkarrow}": '\u290C', // LEFTWARDS DOUBLE DASH ARROW
	"{\\leftcurvedarrow}": '\u2B3F', // WAVE ARROW POINTING DIRECTLY LEFT
	"{\\leftdbkarrow}": '\u290E', // LEFTWARDS TRIPLE DASH ARROW
	"{\\leftdbltail}": '\u291B', // LEFTWARDS DOUBLE ARROW-TAIL
	"{\\leftdotarrow}": '\u2B38', // LEFTWARDS ARROW WITH DOTTED STEM
	"{\\leftharpoondown}": '\u21BD', // LEFTWARDS HARPOON WITH BARB DOWNWARDS
	"{\\leftharpoonup}": '\u21BC', // LEFTWARDS HARPOON WITH BARB UPWARDS
	"{\\leftleftarrows}": '\u21C7', // LEFTWARDS PAIRED ARROWS
	"{\\leftleftharpoons}": '\u2962', // LEFTWARDS HARPOON WITH BARB UP ABOVE LEFTWARDS HARPOON WITH BARB DOWN
	"{\\leftouterjoin}": '\u27D5', // LEFT OUTER JOIN
	"{\\leftrightarrowcircle}": '\u2948', // LEFT RIGHT ARROW THROUGH SMALL CIRCLE
	"{\\leftrightarrows}": '\u21C6', // LEFTWARDS ARROW OVER RIGHTWARDS ARROW
	"{\\leftrightarrowtriangle}": '\u21FF', // LEFT RIGHT OPEN-HEADED ARROW
	"{\\leftrightarrow}": '\u2194', // LEFT RIGHT ARROW
	"{\\leftrightharpoonsdown}": '\u2967', // LEFTWARDS HARPOON WITH BARB DOWN ABOVE RIGHTWARDS HARPOON WITH BARB DOWN
	"{\\leftrightharpoonsup}": '\u2966', // LEFTWARDS HARPOON WITH BARB UP ABOVE RIGHTWARDS HARPOON WITH BARB UP
	"{\\leftrightharpoons}": '\u21CB', // LEFTWARDS HARPOON OVER RIGHTWARDS HARPOON
	"{\\leftrightharpoon}": '\u294A', // LEFT BARB UP RIGHT BARB DOWN HARPOON
	"{\\leftrightsquigarrow}": '\u21AD', // LEFT RIGHT WAVE ARROW
	"{\\leftslice}": '\u2AA6', // LESS-THAN CLOSED BY CURVE
	"{\\leftsquigarrow}": '\u21DC', // LEFTWARDS SQUIGGLE ARROW
	"{\\lefttail}": '\u2919', // LEFTWARDS ARROW-TAIL
	"{\\leftthreearrows}": '\u2B31', // THREE LEFTWARDS ARROWS
	"{\\leftthreetimes}": '\u22CB', // LEFT SEMIDIRECT PRODUCT
	"{\\leftwhitearrow}": '\u21E6', // LEFTWARDS WHITE ARROW
	"{\\leo}": '\u264C', // LEO
	"{\\leqqslant}": '\u2AF9', // DOUBLE-LINE SLANTED LESS-THAN OR EQUAL TO
	"{\\leqq}": '\u2266', // LESS-THAN OVER EQUAL TO
	"{\\leqslant}": '\u2A7D', // LESS-THAN OR SLANTED EQUAL TO
	"{\\leq}": '\u2264', // LESS-THAN OR EQUAL TO
	"{\\lescc}": '\u2AA8', // LESS-THAN CLOSED BY CURVE ABOVE SLANTED EQUAL
	"{\\lesdotor}": '\u2A83', // LESS-THAN OR SLANTED EQUAL TO WITH DOT ABOVE RIGHT
	"{\\lesdoto}": '\u2A81', // LESS-THAN OR SLANTED EQUAL TO WITH DOT ABOVE
	"{\\lesdot}": '\u2A7F', // LESS-THAN OR SLANTED EQUAL TO WITH DOT INSIDE
	"{\\lesges}": '\u2A93', // LESS-THAN ABOVE SLANTED EQUAL ABOVE GREATER-THAN ABOVE SLANTED EQUAL
	"{\\lessapprox}": '\u2A85', // LESS-THAN OR APPROXIMATE
	"{\\lessdot}": '\u22D6', // LESS-THAN WITH DOT
	"{\\lesseqgtr}": '\u22DA', // LESS-THAN EQUAL TO OR GREATER-THAN
	"{\\lesseqqgtr}": '\u2A8B', // LESS-THAN ABOVE DOUBLE-LINE EQUAL ABOVE GREATER-THAN
	"{\\lessequivlnt}": '\u2272', // LESS-THAN OR EQUIVALENT TO
	"{\\lessgtr}": '\u2276', // LESS-THAN OR GREATER-THAN
	"{\\lfbowtie}": '\u29D1', // left black bowtie
	"{\\lfloor}": '\u230A', // LEFT FLOOR
	"{\\lftimes}": '\u29D4', // left black times
	"{\\lgE}": '\u2A91', // LESS-THAN ABOVE GREATER-THAN ABOVE DOUBLE-LINE EQUAL
	"{\\lgblkcircle}": '\u2B24', // BLACK LARGE CIRCLE
	"{\\lgroup}": '\u27EE', // MATHEMATICAL LEFT FLATTENED PARENTHESIS
	"{\\lhd}": '\u25C1', // = \dres (oz), = \LeftTriangle (wrisym), (large) left triangle, open; z notation domain restriction
	"{\\libra}": '\u264E', // LIBRA
	"{\\lightning}": '\u21AF', // t \Lightning (marvosym), DOWNWARDS ZIGZAG ARROW
	"{\\limg}": '\u2987', // = \llparenthesis (stmaryrd), Z NOTATION LEFT IMAGE BRACKET
	"{\\linefeed}": '\u21B4', // RIGHTWARDS ARROW WITH CORNER DOWNWARDS
	"{\\llarc}": '\u25DF', // LOWER LEFT QUADRANT CIRCULAR ARC
	"{\\llblacktriangle}": '\u25E3', // lower left triangle, filled
	"{\\llbracket}": '\u27E6', // = \Lbrack (mathbbol), = \lbag (oz -stmaryrd), MATHEMATICAL LEFT WHITE SQUARE BRACKET
	"{\\llcorner}": '\u231E', // BOTTOM LEFT CORNER
	"{\\llcurly}": '\u2ABB', // DOUBLE PRECEDES
	"{\\lllnest}": '\u2AF7', // TRIPLE NESTED LESS-THAN
	"{\\lltriangle}": '\u25FA', // LOWER LEFT TRIANGLE
	"{\\ll}": '\u226A', // MUCH LESS-THAN
	"{\\lmoustache}": '\u23B0', // UPPER LEFT OR LOWER RIGHT CURLY BRACKET SECTION
	"{\\lnapprox}": '\u2A89', // LESS-THAN AND NOT APPROXIMATE
	"{\\lneqq}": '\u2268', // LESS-THAN BUT NOT EQUAL TO
	"{\\lneq}": '\u2A87', // LESS-THAN AND SINGLE-LINE NOT EQUAL TO
	"{\\lnot}": '\u00AC', // NOT SIGN
	"{\\lnsim}": '\u22E6', // LESS-THAN BUT NOT EQUIVALENT TO
	"{\\longdashv}": '\u27DE', // long right tack
	"{\\longdivision}": '\u27CC', // LONG DIVISION
	"{\\longleftarrow}": '\u27F5', // LONG LEFTWARDS ARROW
	"{\\longleftrightarrow}": '\u27F7', // LONG LEFT RIGHT ARROW
	"{\\longleftsquigarrow}": '\u2B33', // LONG LEFTWARDS SQUIGGLE ARROW
	"{\\longmapsfrom}": '\u27FB', // = \longmappedfrom (kpfonts), LONG LEFTWARDS ARROW FROM BAR
	"{\\longmapsto}": '\u27FC', // LONG RIGHTWARDS ARROW FROM BAR
	"{\\longrightarrow}": '\u27F6', // LONG RIGHTWARDS ARROW
	"{\\looparrowleft}": '\u21AB', // LEFTWARDS ARROW WITH LOOP
	"{\\looparrowright}": '\u21AC', // RIGHTWARDS ARROW WITH LOOP
	"{\\lowint}": '\u2A1C', // INTEGRAL WITH UNDERBAR
	"{\\lozengeminus}": '\u27E0', // LOZENGE DIVIDED BY HORIZONTAL RULE
	"{\\lozenge}": '\u25CA', // LOZENGE
	"{\\lparenextender}": '\u239C', // LEFT PARENTHESIS EXTENSION
	"{\\lparenlend}": '\u239D', // LEFT PARENTHESIS LOWER HOOK
	"{\\lparenuend}": '\u239B', // LEFT PARENTHESIS UPPER HOOK
	"{\\lrarc}": '\u25DE', // LOWER RIGHT QUADRANT CIRCULAR ARC
	"{\\lrblacktriangle}": '\u25E2', // lower right triangle, filled
	"{\\lrcorner}": '\u231F', // BOTTOM RIGHT CORNER
	"{\\lrtriangleeq}": '\u29E1', // INCREASES AS
	"{\\lrtriangle}": '\u25FF', // LOWER RIGHT TRIANGLE
	"{\\lsime}": '\u2A8D', // LESS-THAN ABOVE SIMILAR OR EQUAL
	"{\\lsimg}": '\u2A8F', // LESS-THAN ABOVE SIMILAR ABOVE GREATER-THAN
	"{\\lsqhook}": '\u2ACD', // SQUARE LEFT OPEN BOX OPERATOR
	"{\\ltcir}": '\u2A79', // LESS-THAN WITH CIRCLE INSIDE
	"{\\ltimes}": '\u22C9', // LEFT NORMAL FACTOR SEMIDIRECT PRODUCT
	"{\\ltlarr}": '\u2976', // LESS-THAN ABOVE LEFTWARDS ARROW
	"{\\ltquest}": '\u2A7B', // LESS-THAN WITH QUESTION MARK ABOVE
	"{\\lvboxline}": '\u23B8', // LEFT VERTICAL BOX LINE
	"{\\lvec}": '\u20D0', // COMBINING LEFT HARPOON ABOVE
	"{\\lvzigzag}": '\u29D8', // LEFT WIGGLY FENCE
	"{\\l}": '\u0142', // LATIN SMALL LETTER L WITH STROKE
	"{\\male}": '\u2642', // MALE SIGN
	"{\\mapsfrom}": '\u21A4', // = \mappedfrom (kpfonts), maps to, leftward
	"{\\mapsto}": '\u21A6', // RIGHTWARDS ARROW FROM BAR
	"{\\mathchar\"2208}": '\u2316', // POSITION INDICATOR
	"{\\mbfDigamma}": '\uD835\uDFCA', // MATHEMATICAL BOLD CAPITAL DIGAMMA
	"{\\mbfdigamma}": '\uD835\uDFCB', // MATHEMATICAL BOLD SMALL DIGAMMA
	"{\\mbox{\\texteuro}}": '\u20AC', // EURO SIGN
	"{\\mdblkdiamond}": '\u2B25', // BLACK MEDIUM DIAMOND
	"{\\mdblklozenge}": '\u2B27', // # \blacklozenge (amssymb), BLACK MEDIUM LOZENGE
	"{\\mdsmblksquare}": '\u25FE', // BLACK MEDIUM SMALL SQUARE
	"{\\mdsmwhtcircle}": '\u26AC', // MEDIUM SMALL WHITE CIRCLE
	"{\\mdsmwhtsquare}": '\u25FD', // WHITE MEDIUM SMALL SQUARE
	"{\\mdwhtdiamond}": '\u2B26', // WHITE MEDIUM DIAMOND
	"{\\mdwhtlozenge}": '\u2B28', // # \lozenge (amssymb), WHITE MEDIUM LOZENGE
	"{\\measangledltosw}": '\u29AF', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING LEFT AND DOWN
	"{\\measangledrtose}": '\u29AE', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING RIGHT AND DOWN
	"{\\measangleldtosw}": '\u29AB', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING DOWN AND LEFT
	"{\\measanglelutonw}": '\u29A9', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING UP AND LEFT
	"{\\measanglerdtose}": '\u29AA', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING DOWN AND RIGHT
	"{\\measanglerutone}": '\u29A8', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING UP AND RIGHT
	"{\\measangleultonw}": '\u29AD', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING LEFT AND UP
	"{\\measangleurtone}": '\u29AC', // MEASURED ANGLE WITH OPEN ARM ENDING IN ARROW POINTING RIGHT AND UP
	"{\\measeq}": '\u225E', // MEASURED BY (m over equals)
	"{\\measuredangleleft}": '\u299B', // MEASURED ANGLE OPENING LEFT
	"{\\measuredangle}": '\u2221', // MEASURED ANGLE
	"{\\medblackstar}": '\u2B51', // black medium star
	"{\\medbullet}": '\u26AB', // MEDIUM BLACK CIRCLE
	"{\\medcirc}": '\u26AA', // MEDIUM WHITE CIRCLE
	"{\\medwhitestar}": '\u2B50', // WHITE MEDIUM STAR
	"{\\mercury}": '\u263F', // MERCURY
	"{\\mho}": '\u2127', // INVERTED OHM SIGN
	"{\\midbarvee}": '\u2A5D', // LOGICAL OR WITH HORIZONTAL DASH
	"{\\midbarwedge}": '\u2A5C', // ogical and with horizontal dash
	"{\\midcir}": '\u2AF0', // VERTICAL LINE WITH CIRCLE BELOW
	"{\\mid}": '\u2223', // DIVIDES
	"{\\minusfdots}": '\u2A2B', // MINUS SIGN WITH FALLING DOTS
	"{\\minusrdots}": '\u2A2C', // MINUS SIGN WITH RISING DOTS
	"{\\mkern1mu}": '\u200A', // HAIR SPACE
	"{\\mkern4mu}": '\u205F', // MEDIUM MATHEMATICAL SPACE
	"{\\mlcp}": '\u2ADB', // TRANSVERSAL INTERSECTION
	"{\\modtwosum}": '\u2A0A', // MODULO TWO SUM
	"{\\mp}": '\u2213', // MINUS-OR-PLUS SIGN
	"{\\multimapboth}": '\u29DF', // DOUBLE-ENDED MULTIMAP
	"{\\multimapinv}": '\u27DC', // LEFT MULTIMAP
	"{\\multimap}": '\u22B8', // MULTIMAP
	"{\\mu}": '\u03BC', // GREEK SMALL LETTER MU
	"{\\nHdownarrow}": '\u21DF', // DOWNWARDS ARROW WITH DOUBLE STROKE
	"{\\nHuparrow}": '\u21DE', // UPWARDS ARROW WITH DOUBLE STROKE
	"{\\nLeftarrow}": '\u21CD', // LEFTWARDS DOUBLE ARROW WITH STROKE
	"{\\nLeftrightarrow}": '\u21CE', // LEFT RIGHT DOUBLE ARROW WITH STROKE
	"{\\nRightarrow}": '\u21CF', // RIGHTWARDS DOUBLE ARROW WITH STROKE
	"{\\nVDash}": '\u22AF', // NEGATED DOUBLE VERTICAL BAR DOUBLE RIGHT TURNSTILE
	"{\\nVdash}": '\u22AE', // DOES NOT FORCE
	"{\\nVleftarrowtail}": '\u2B3A', // LEFTWARDS ARROW WITH TAIL WITH DOUBLE VERTICAL STROKE
	"{\\nVleftarrow}": '\u21FA', // LEFTWARDS ARROW WITH DOUBLE VERTICAL STROKE
	"{\\nVleftrightarrow}": '\u21FC', // LEFT RIGHT ARROW WITH DOUBLE VERTICAL STROKE, z notation finite relation
	"{\\nVtwoheadleftarrowtail}": '\u2B3D', // LEFTWARDS TWO-HEADED ARROW WITH TAIL WITH DOUBLE VERTICAL STROKE
	"{\\nVtwoheadleftarrow}": '\u2B35', // LEFTWARDS TWO-HEADED ARROW WITH DOUBLE VERTICAL STROKE
	"{\\nVtwoheadrightarrowtail}": '\u2918', // RIGHTWARDS TWO-HEADED ARROW WITH TAIL WITH DOUBLE VERTICAL STROKE, z notation finite surjective injection
	"{\\nVtwoheadrightarrow}": '\u2901', // RIGHTWARDS TWO-HEADED ARROW WITH DOUBLE VERTICAL STROKE, z notation finite surjection
	"{\\nabla}": '\u2207', // NABLA
	"{\\natural}": '\u266E', // MUSIC NATURAL SIGN
	"{\\nearrow}": '\u2197', // NORTH EAST ARROW
	"{\\neovnwarrow}": '\u2931', // NORTH EAST ARROW CROSSING NORTH WEST ARROW
	"{\\neovsearrow}": '\u292E', // NORTH EAST ARROW CROSSING SOUTH EAST ARROW
	"{\\neptune}": '\u2646', // NEPTUNE
	"{\\neswarrow}": '\u2922', // NORTH EAST AND SOUTH WEST ARROW
	"{\\neuter}": '\u26B2', // NEUTER
	"{\\nexists}": '\u2204', // THERE DOES NOT EXIST
	"{\\ng}": '\u014B', // LATIN SMALL LETTER ENG
	"{\\nhVvert}": '\u2AF5', // TRIPLE VERTICAL BAR WITH HORIZONTAL STROKE
	"{\\nhpar}": '\u2AF2', // PARALLEL WITH HORIZONTAL STROKE
	"{\\niobar}": '\u22FE', // SMALL CONTAINS WITH OVERBAR
	"{\\nisd}": '\u22FA', // CONTAINS WITH LONG HORIZONTAL STROKE
	"{\\nis}": '\u22FC', // SMALL CONTAINS WITH VERTICAL BAR AT END OF HORIZONTAL STROKE
	"{\\ni}": '\u220B', // CONTAINS AS MEMBER
	"{\\nleftarrow}": '\u219A', // LEFTWARDS ARROW WITH STROKE
	"{\\nleftrightarrow}": '\u21AE', // LEFT RIGHT ARROW WITH STROKE
	"{\\nmid}": '\u2224', // DOES NOT DIVIDE
	"{\\nolinebreak}": '\u2060', // WORD JOINER
	"{\\not\\approx}": '\u2249', // NOT ALMOST EQUAL TO
	"{\\not\\cong}": '\u2247', // NEITHER APPROXIMATELY NOR ACTUALLY EQUAL TO
	"{\\not\\equiv}": '\u2262', // NOT IDENTICAL TO
	"{\\not\\geq}": '\u2271', // NEITHER GREATER-THAN NOR EQUAL TO
	"{\\not\\in}": '\u2209', // NOT AN ELEMENT OF
	"{\\not\\kern-0.3em\\times}": '\u226D', // NOT EQUIVALENT TO
	"{\\not\\leq}": '\u2270', // NEITHER LESS-THAN NOR EQUAL TO
	"{\\not\\ni}": '\u220C', // DOES NOT CONTAIN AS MEMBER
	"{\\not\\prec}": '\u2280', // DOES NOT PRECEDE
	"{\\not\\simeq}": '\u2244', // NOT ASYMPTOTICALLY EQUAL TO
	"{\\not\\sim}": '\u2241', // NOT TILDE
	"{\\not\\sqsubseteq}": '\u22E2', // NOT SQUARE IMAGE OF OR EQUAL TO
	"{\\not\\sqsupseteq}": '\u22E3', // NOT SQUARE ORIGINAL OF OR EQUAL TO
	"{\\not\\subseteq}": '\u2288', // NEITHER A SUBSET OF NOR EQUAL TO
	"{\\not\\subset}": '\u2284', // NOT A SUBSET OF
	"{\\not\\succ}": '\u2281', // DOES NOT SUCCEED
	"{\\not\\supseteq}": '\u2289', // NEITHER A SUPERSET OF NOR EQUAL TO
	"{\\not\\supset}": '\u2285', // NOT A SUPERSET OF
	"{\\notbackslash}": '\u2340', // APL FUNCTIONAL SYMBOL BACKSLASH BAR
	"{\\notgreaterless}": '\u2279', // NEITHER GREATER-THAN NOR LESS-THAN
	"{\\notlessgreater}": '\u2278', // NEITHER LESS-THAN NOR GREATER-THAN
	"{\\notslash}": '\u233F', // APL FUNCTIONAL SYMBOL SLASH BAR, solidus, bar through
	"{\\nparallel}": '\u2226', // NOT PARALLEL TO
	"{\\npolint}": '\u2A14', // LINE INTEGRATION NOT INCLUDING THE POLE
	"{\\npreceq}": '\u22E0', // DOES NOT PRECEDE OR EQUAL
	"{\\nrightarrow}": '\u219B', // RIGHTWARDS ARROW WITH STROKE
	"{\\nsucceq}": '\u22E1', // not succeeds, curly equals
	"{\\ntrianglelefteq}": '\u22EC', // NOT NORMAL SUBGROUP OF OR EQUAL TO
	"{\\ntriangleleft}": '\u22EA', // NOT NORMAL SUBGROUP OF
	"{\\ntrianglerighteq}": '\u22ED', // DOES NOT CONTAIN AS NORMAL SUBGROUP OR EQUAL
	"{\\ntriangleright}": '\u22EB', // DOES NOT CONTAIN AS NORMAL SUBGROUP
	"{\\nu}": '\u03BD', // GREEK SMALL LETTER NU
	"{\\nvDash}": '\u22AD', // NOT TRUE
	"{\\nvLeftarrow}": '\u2902', // LEFTWARDS DOUBLE ARROW WITH VERTICAL STROKE
	"{\\nvLeftrightarrow}": '\u2904', // LEFT RIGHT DOUBLE ARROW WITH VERTICAL STROKE
	"{\\nvRightarrow}": '\u2903', // RIGHTWARDS DOUBLE ARROW WITH VERTICAL STROKE
	"{\\nvdash}": '\u22AC', // DOES NOT PROVE
	"{\\nvinfty}": '\u29DE', // INFINITY NEGATED WITH VERTICAL BAR
	"{\\nvleftarrowtail}": '\u2B39', // LEFTWARDS ARROW WITH TAIL WITH VERTICAL STROKE
	"{\\nvleftarrow}": '\u21F7', // LEFTWARDS ARROW WITH VERTICAL STROKE
	"{\\nvleftrightarrow}": '\u21F9', // LEFT RIGHT ARROW WITH VERTICAL STROKE, z notation partial relation
	"{\\nvtwoheadleftarrowtail}": '\u2B3C', // LEFTWARDS TWO-HEADED ARROW WITH TAIL WITH VERTICAL STROKE
	"{\\nvtwoheadleftarrow}": '\u2B34', // LEFTWARDS TWO-HEADED ARROW WITH VERTICAL STROKE
	"{\\nvtwoheadrightarrowtail}": '\u2917', // RIGHTWARDS TWO-HEADED ARROW WITH TAIL WITH VERTICAL STROKE, z notation surjective injection
	"{\\nwarrow}": '\u2196', // NORTH WEST ARROW
	"{\\nwovnearrow}": '\u2932', // NORTH WEST ARROW CROSSING NORTH EAST ARROW
	"{\\nwsearrow}": '\u2921', // NORTH WEST AND SOUTH EAST ARROW
	"{\\obot}": '\u29BA', // CIRCLE DIVIDED BY HORIZONTAL BAR AND TOP HALF DIVIDED BY VERTICAL BAR
	"{\\obrbrak}": '\u23E0', // TOP TORTOISE SHELL BRACKET (mathematical use)
	"{\\ocommatopright}": '\u0315', // COMBINING COMMA ABOVE RIGHT
	"{\\odiv}": '\u2A38', // CIRCLED DIVISION SIGN
	"{\\odotslashdot}": '\u29BC', // CIRCLED ANTICLOCKWISE-ROTATED DIVISION SIGN
	"{\\odot}": '\u2299', // CIRCLED DOT OPERATOR
	"{\\oe}": '\u0153', // LATIN SMALL LIGATURE OE
	"{\\oint}": '\u222E', // CONTOUR INTEGRAL
	"{\\olcross}": '\u29BB', // CIRCLE WITH SUPERIMPOSED X
	"{\\omega}": '\u03C9', // GREEK SMALL LETTER OMEGA
	"{\\ominus}": '\u2296', // CIRCLED MINUS
	"{\\openbracketleft}": '\u301A', // LEFT WHITE SQUARE BRACKET
	"{\\openbracketright}": '\u301B', // RIGHT WHITE SQUARE BRACKET
	"{\\operp}": '\u29B9', // CIRCLED PERPENDICULAR
	"{\\oplus}": '\u2295', // CIRCLED PLUS
	"{\\original}": '\u22B6', // ORIGINAL OF
	"{\\oslash}": '\u2298', // CIRCLED DIVISION SLASH
	"{\\otimeshat}": '\u2A36', // CIRCLED MULTIPLICATION SIGN WITH CIRCUMFLEX ACCENT
	"{\\otimes}": '\u2297', // CIRCLED TIMES
	"{\\oturnedcomma}": '\u0312', // COMBINING TURNED COMMA ABOVE
	"{\\overbrace}": '\u23DE', // TOP CURLY BRACKET (mathematical use)
	"{\\overbracket}": '\u23B4', // TOP SQUARE BRACKET
	"{\\overleftrightarrow}": '\u20E1', // COMBINING LEFT RIGHT ARROW ABOVE
	"{\\overline}": '\u0305', // overbar embellishment
	"{\\overparen}": '\u23DC', // = \wideparen (yhmath mathabx fourier), TOP PARENTHESIS (mathematical use)
	"{\\ovhook}": '\u0309', // COMBINING HOOK ABOVE
	"{\\o}": '\u00F8', // LATIN SMALL LETTER O WITH STROKE
	"{\\parallelogramblack}": '\u25B0', // BLACK PARALLELOGRAM
	"{\\parallel}": '\u2225', // PARALLEL TO
	"{\\parsim}": '\u2AF3', // PARALLEL WITH TILDE OPERATOR
	"{\\partialmeetcontraction}": '\u2AA3', // double less-than with underbar
	"{\\partial}": '\u2202', // PARTIAL DIFFERENTIAL
	"{\\pentagonblack}": '\u2B1F', // BLACK PENTAGON
	"{\\pentagon}": '\u2B20', // WHITE PENTAGON
	"{\\perps}": '\u2AE1', // PERPENDICULAR WITH S
	"{\\perp}": '\u22A5', // UP TACK
	"{\\perspcorrespond}": '\u2306', // PERSPECTIVE
	"{\\pfun}": '\u21F8', // RIGHTWARDS ARROW WITH VERTICAL STROKE, z notation partial function
	"{\\phi}": '\u03D5', // GREEK PHI SYMBOL
	"{\\pinj}": '\u2914', // RIGHTWARDS ARROW WITH TAIL WITH VERTICAL STROKE, z notation partial injection
	"{\\pisces}": '\u2653', // PISCES
	"{\\pitchfork}": '\u22D4', // PITCHFORK
	"{\\pi}": '\u03C0', // GREEK SMALL LETTER PI
	"{\\pluseqq}": '\u2A72', // PLUS SIGN ABOVE EQUALS SIGN
	"{\\plushat}": '\u2A23', // PLUS SIGN WITH CIRCUMFLEX ACCENT ABOVE
	"{\\plussim}": '\u2A26', // PLUS SIGN WITH TILDE BELOW
	"{\\plussubtwo}": '\u2A27', // PLUS SIGN WITH SUBSCRIPT TWO
	"{\\plustrif}": '\u2A28', // PLUS SIGN WITH BLACK TRIANGLE
	"{\\pluto}": '\u2647', // PLUTO
	"{\\pm}": '\u00B1', // PLUS-MINUS SIGN
	"{\\pointint}": '\u2A15', // INTEGRAL AROUND A POINT OPERATOR
	"{\\postalmark}": '\u3012', // POSTAL MARK
	"{\\precapprox}": '\u227E', // PRECEDES OR EQUIVALENT TO
	"{\\preccurlyeq}": '\u227C', // PRECEDES OR EQUAL TO
	"{\\precedesnotsimilar}": '\u22E8', // PRECEDES BUT NOT EQUIVALENT TO
	"{\\preceqq}": '\u2AB3', // PRECEDES ABOVE EQUALS SIGN
	"{\\preceq}": '\u2AAF', // PRECEDES ABOVE SINGLE-LINE EQUALS SIGN
	"{\\precnapprox}": '\u2AB9', // PRECEDES ABOVE NOT ALMOST EQUAL TO
	"{\\precneqq}": '\u2AB5', // PRECEDES ABOVE NOT EQUAL TO
	"{\\precneq}": '\u2AB1', // PRECEDES ABOVE SINGLE-LINE NOT EQUAL TO
	"{\\prec}": '\u227A', // PRECEDES
	"{\\prod}": '\u220F', // N-ARY PRODUCT
	"{\\profline}": '\u2312', // profile of a line
	"{\\profsurf}": '\u2313', // profile of a surface
	"{\\propto}": '\u221D', // PROPORTIONAL TO
	"{\\prurel}": '\u22B0', // element PRECEDES UNDER RELATION
	"{\\psi}": '\u03C8', // GREEK SMALL LETTER PSI
	"{\\psur}": '\u2900', // = \psurj (oz), RIGHTWARDS TWO-HEADED ARROW WITH VERTICAL STROKE, z notation partial surjection
	"{\\pullback}": '\u27D3', // LOWER RIGHT CORNER WITH DOT
	"{\\pushout}": '\u27D4', // UPPER LEFT CORNER WITH DOT
	"{\\qoppa}": '\u03D9', // = \koppa (wrisym), t \qoppa (LGR), GREEK SMALL LETTER ARCHAIC KOPPA
	"{\\quad}": '\u2001', // emquad
	"{\\quarternote}": '\u2669', // QUARTER NOTE
	"{\\rBrace}": '\u2984', // RIGHT WHITE CURLY BRACKET
	"{\\radiation}": '\u2622', // RADIOACTIVE SIGN
	"{\\rangledot}": '\u2992', // RIGHT ANGLE BRACKET WITH DOT
	"{\\rangledownzigzagarrow}": '\u237C', // RIGHT ANGLE WITH DOWNWARDS ZIGZAG ARROW
	"{\\rangle}": '\u232A', // RIGHT-POINTING ANGLE BRACKET
	"{\\rang}": '\u27EB', // MATHEMATICAL RIGHT DOUBLE ANGLE BRACKET, z notation right chevron bracket
	"{\\rblkbrbrak}": '\u2998', // RIGHT BLACK TORTOISE SHELL BRACKET
	"{\\rblot}": '\u298A', // Z NOTATION RIGHT BINDING BRACKET
	"{\\rbracelend}": '\u23AD', // RIGHT CURLY BRACKET LOWER HOOK
	"{\\rbracemid}": '\u23AC', // RIGHT CURLY BRACKET MIDDLE PIECE
	"{\\rbraceuend}": '\u23AB', // RIGHT CURLY BRACKET UPPER HOOK
	"{\\rbrace}": '}', // RIGHT CURLY BRACKET
	"{\\rbrackextender}": '\u23A5', // RIGHT SQUARE BRACKET EXTENSION
	"{\\rbracklend}": '\u23A6', // RIGHT SQUARE BRACKET LOWER CORNER
	"{\\rbracklrtick}": '\u298E', // RIGHT SQUARE BRACKET WITH TICK IN BOTTOM CORNER
	"{\\rbrackubar}": '\u298C', // RIGHT SQUARE BRACKET WITH UNDERBAR
	"{\\rbrackuend}": '\u23A4', // RIGHT SQUARE BRACKET UPPER CORNER
	"{\\rbrackurtick}": '\u2990', // RIGHT SQUARE BRACKET WITH TICK IN TOP CORNER
	"{\\rbrbrak}": '\u2773', // LIGHT RIGHT TORTOISE SHELL BRACKET ORNAMENT
	"{\\rceil}": '\u2309', // RIGHT CEILING
	"{\\rcurvyangle}": '\u29FD', // right pointing curved angle bracket
	"{\\rdiagovfdiag}": '\u292B', // RISING DIAGONAL CROSSING FALLING DIAGONAL
	"{\\rdiagovsearrow}": '\u2930', // RISING DIAGONAL CROSSING SOUTH EAST ARROW
	"{\\recorder}": '\u2315', // TELEPHONE RECORDER
	"{\\recycle}": '\u267B', // BLACK UNIVERSAL RECYCLING SYMBOL
	"{\\revangleubar}": '\u29A5', // REVERSED ANGLE WITH UNDERBAR
	"{\\revangle}": '\u29A3', // REVERSED ANGLE
	"{\\revemptyset}": '\u29B0', // REVERSED EMPTY SET
	"{\\revnmid}": '\u2AEE', // DOES NOT DIVIDE WITH REVERSED NEGATION SLASH
	"{\\rfbowtie}": '\u29D2', // right black bowtie
	"{\\rfloor}": '\u230B', // RIGHT FLOOR
	"{\\rftimes}": '\u29D5', // right black times
	"{\\rgroup}": '\u27EF', // MATHEMATICAL RIGHT FLATTENED PARENTHESIS
	"{\\rhd}": '\u25B7', // = \rres (oz), = \RightTriangle (wrisym), (large) right triangle, open; z notation range restriction
	"{\\rho}": '\u03C1', // GREEK SMALL LETTER RHO
	"{\\rightanglearc}": '\u22BE', // RIGHT ANGLE WITH ARC
	"{\\rightanglemdot}": '\u299D', // MEASURED RIGHT ANGLE WITH DOT
	"{\\rightangle}": '\u221F', // RIGHT ANGLE
	"{\\rightarrowapprox}": '\u2975', // RIGHTWARDS ARROW ABOVE ALMOST EQUAL TO
	"{\\rightarrowbackapprox}": '\u2B48', // RIGHTWARDS ARROW ABOVE REVERSE ALMOST EQUAL TO
	"{\\rightarrowbsimilar}": '\u2B4C', // righttwards arrow above reverse tilde operator
	"{\\rightarrowdiamond}": '\u291E', // RIGHTWARDS ARROW TO BLACK DIAMOND
	"{\\rightarrowgtr}": '\u2B43', // rightwards arrow through less-than
	"{\\rightarrowonoplus}": '\u27F4', // RIGHT ARROW WITH CIRCLED PLUS
	"{\\rightarrowplus}": '\u2945', // RIGHTWARDS ARROW WITH PLUS BELOW
	"{\\rightarrowsimilar}": '\u2974', // RIGHTWARDS ARROW ABOVE TILDE OPERATOR
	"{\\rightarrowsupset}": '\u2B44', // rightwards arrow through subset
	"{\\rightarrowtail}": '\u21A3', // RIGHTWARDS ARROW WITH TAIL
	"{\\rightarrowtriangle}": '\u21FE', // RIGHTWARDS OPEN-HEADED ARROW
	"{\\rightarrow}": '\u2192', // RIGHTWARDS ARROW
	"{\\rightbarharpoon}": '\u296C', // RIGHTWARDS HARPOON WITH BARB UP ABOVE LONG DASH
	"{\\rightbkarrow}": '\u290D', // RIGHTWARDS DOUBLE DASH ARROW
	"{\\rightdbltail}": '\u291C', // RIGHTWARDS DOUBLE ARROW-TAIL
	"{\\rightdotarrow}": '\u2911', // RIGHTWARDS ARROW WITH DOTTED STEM
	"{\\rightharpoondown}": '\u21C1', // RIGHTWARDS HARPOON WITH BARB DOWNWARDS
	"{\\rightharpoonup}": '\u21C0', // RIGHTWARDS HARPOON WITH BARB UPWARDS
	"{\\rightleftarrows}": '\u21C4', // RIGHTWARDS ARROW OVER LEFTWARDS ARROW
	"{\\rightleftharpoonsdown}": '\u2969', // RIGHTWARDS HARPOON WITH BARB DOWN ABOVE LEFTWARDS HARPOON WITH BARB DOWN
	"{\\rightleftharpoonsup}": '\u2968', // RIGHTWARDS HARPOON WITH BARB UP ABOVE LEFTWARDS HARPOON WITH BARB UP
	"{\\rightleftharpoons}": '\u21CC', // RIGHTWARDS HARPOON OVER LEFTWARDS HARPOON
	"{\\rightleftharpoon}": '\u294B', // LEFT BARB DOWN RIGHT BARB UP HARPOON
	"{\\rightmoon}": '\u263D', // FIRST QUARTER MOON
	"{\\rightouterjoin}": '\u27D6', // RIGHT OUTER JOIN
	"{\\rightpentagonblack}": '\u2B53', // BLACK RIGHT-POINTING PENTAGON
	"{\\rightpentagon}": '\u2B54', // WHITE RIGHT-POINTING PENTAGON
	"{\\rightrightarrows}": '\u21C9', // RIGHTWARDS PAIRED ARROWS
	"{\\rightrightharpoons}": '\u2964', // RIGHTWARDS HARPOON WITH BARB UP ABOVE RIGHTWARDS HARPOON WITH BARB DOWN
	"{\\rightslice}": '\u2AA7', // GREATER-THAN CLOSED BY CURVE
	"{\\rightsquigarrow}": '\u21DD', // RIGHTWARDS SQUIGGLE ARROW
	"{\\righttail}": '\u291A', // RIGHTWARDS ARROW-TAIL
	"{\\rightthreearrows}": '\u21F6', // THREE RIGHTWARDS ARROWS
	"{\\rightthreetimes}": '\u22CC', // RIGHT SEMIDIRECT PRODUCT
	"{\\rightwhitearrow}": '\u21E8', // RIGHTWARDS WHITE ARROW
	"{\\rimg}": '\u2988', // = \rrparenthesis (stmaryrd), Z NOTATION RIGHT IMAGE BRACKET
	"{\\ringplus}": '\u2A22', // PLUS SIGN WITH SMALL CIRCLE ABOVE
	"{\\risingdotseq}": '\u2253', // IMAGE OF OR APPROXIMATELY EQUAL TO
	"{\\rmoustache}": '\u23B1', // UPPER RIGHT OR LOWER LEFT CURLY BRACKET SECTION
	"{\\rparenextender}": '\u239F', // RIGHT PARENTHESIS EXTENSION
	"{\\rparenlend}": '\u23A0', // RIGHT PARENTHESIS LOWER HOOK
	"{\\rparenuend}": '\u239E', // RIGHT PARENTHESIS UPPER HOOK
	"{\\rppolint}": '\u2A12', // LINE INTEGRATION WITH RECTANGULAR PATH AROUND POLE
	"{\\rrbracket}": '\u27E7', // = \Rbrack (mathbbol), = \rbag (oz -stmaryrd), MATHEMATICAL RIGHT WHITE SQUARE BRACKET
	"{\\rsolbar}": '\u29F7', // REVERSE SOLIDUS WITH HORIZONTAL STROKE
	"{\\rsqhook}": '\u2ACE', // SQUARE RIGHT OPEN BOX OPERATOR
	"{\\rsub}": '\u2A65', // = \nrres (oz), Z NOTATION RANGE ANTIRESTRICTION
	"{\\rtimes}": '\u22CA', // RIGHT NORMAL FACTOR SEMIDIRECT PRODUCT
	"{\\rtriltri}": '\u29CE', // RIGHT TRIANGLE ABOVE LEFT TRIANGLE
	"{\\rvboxline}": '\u23B9', // RIGHT VERTICAL BOX LINE
	"{\\rvzigzag}": '\u29D9', // RIGHT WIGGLY FENCE
	"{\\r}": '\u02DA', // RING ABOVE
	"{\\sagittarius}": '\u2650', // SAGITTARIUS
	"{\\sampi}": '\u03E1', // # \sampi (wrisym), GREEK SMALL LETTER SAMPI
	"{\\sansLmirrored}": '\u2143', // REVERSED SANS-SERIF CAPITAL L
	"{\\sansLturned}": '\u2142', // TURNED SANS-SERIF CAPITAL L
	"{\\saturn}": '\u2644', // SATURN
	"{\\scorpio}": '\u264F', // SCORPIUS
	"{\\scpolint}": '\u2A13', // LINE INTEGRATION WITH SEMICIRCULAR PATH AROUND POLE
	"{\\scurel}": '\u22B1', // SUCCEEDS UNDER RELATION
	"{\\searrow}": '\u2198', // SOUTH EAST ARROW
	"{\\seovnearrow}": '\u292D', // SOUTH EAST ARROW CROSSING NORTH EAST ARROW
	"{\\setminus}": '\u2216', // SET MINUS
	"{\\sharp}": '\u266F', // MUSIC SHARP SIGN
	"{\\shortdowntack}": '\u2ADF', // SHORT DOWN TACK
	"{\\shortlefttack}": '\u2ADE', // SHORT LEFT TACK
	"{\\shortuptack}": '\u2AE0', // SHORT UP TACK
	"{\\shuffle}": '\u29E2', // SHUFFLE PRODUCT
	"{\\sigma}": '\u03C3', // GREEK SMALL LETTER SIGMA
	"{\\sim\\joinrel\\leadsto}": '\u27FF', // LONG RIGHTWARDS SQUIGGLE ARROW
	"{\\simeq}": '\u2243', // ASYMPTOTICALLY EQUAL TO
	"{\\simgE}": '\u2AA0', // SIMILAR ABOVE GREATER-THAN ABOVE EQUALS SIGN
	"{\\similarleftarrow}": '\u2B49', // TILDE OPERATOR ABOVE LEFTWARDS ARROW
	"{\\similarrightarrow}": '\u2972', // TILDE OPERATOR ABOVE RIGHTWARDS ARROW
	"{\\simlE}": '\u2A9F', // SIMILAR ABOVE LESS-THAN ABOVE EQUALS SIGN
	"{\\simminussim}": '\u2A6C', // SIMILAR MINUS SIMILAR
	"{\\simplus}": '\u2A24', // PLUS SIGN WITH TILDE ABOVE
	"{\\simrdots}": '\u2A6B', // TILDE OPERATOR WITH RISING DOTS
	"{\\sim}": '\u223C', // TILDE OPERATOR
	"{\\sixteenthnote}": '\u266C', // BEAMED SIXTEENTH NOTES
	"{\\skull}": '\u2620', // SKULL AND CROSSBONES
	"{\\slash}": '\u2215', // DIVISION SLASH
	"{\\smallin}": '\u220A', // set membership (small set membership)
	"{\\smallni}": '\u220D', // r: contains (SMALL CONTAINS AS MEMBER)
	"{\\smashtimes}": '\u2A33', // SMASH PRODUCT
	"{\\smblkdiamond}": '\u2B29', // BLACK SMALL DIAMOND
	"{\\smblklozenge}": '\u2B2A', // BLACK SMALL LOZENGE
	"{\\smeparsl}": '\u29E4', // EQUALS SIGN AND SLANTED PARALLEL WITH TILDE ABOVE
	"{\\smiley}": '\u263A', // = \smileface (arevmath), WHITE SMILING FACE
	"{\\smile}": '\u2323', // SMILE
	"{\\smte}": '\u2AAC', // SMALLER THAN OR EQUAL TO
	"{\\smt}": '\u2AAA', // SMALLER THAN
	"{\\smwhitestar}": '\u2B52', // WHITE SMALL STAR
	"{\\smwhtcircle}": '\u25E6', // WHITE BULLET
	"{\\smwhtlozenge}": '\u2B2B', // WHITE SMALL LOZENGE
	"{\\smwhtsquare}": '\u25AB', // WHITE SMALL SQUARE
	"{\\space}": ' ',
	"{\\sphericalangleup}": '\u29A1', // SPHERICAL ANGLE OPENING UP
	"{\\sphericalangle}": '\u2222', // SPHERICAL ANGLE
	"{\\spot}": '\u2981', // = \dot (oz), Z NOTATION SPOT
	"{\\sqcap}": '\u2293', // SQUARE CAP
	"{\\sqcup}": '\u2294', // SQUARE CUP
	"{\\sqrint}": '\u2A16', // QUATERNION INTEGRAL OPERATOR
	"{\\sqrtbottom}": '\u23B7', // RADICAL SYMBOL BOTTOM
	"{\\sqsubseteq}": '\u2291', // SQUARE IMAGE OF OR EQUAL TO
	"{\\sqsubsetneq}": '\u22E4', // square subset, not equals
	"{\\sqsubset}": '\u228F', // SQUARE IMAGE OF
	"{\\sqsupseteq}": '\u2292', // SQUARE ORIGINAL OF OR EQUAL TO
	"{\\sqsupset}": '\u2290', // SQUARE ORIGINAL OF
	"{\\squarebotblack}": '\u2B13', // SQUARE WITH BOTTOM HALF BLACK
	"{\\squarecrossfill}": '\u25A9', // SQUARE WITH DIAGONAL CROSSHATCH FILL
	"{\\squarehfill}": '\u25A4', // square, horizontal rule filled
	"{\\squarehvfill}": '\u25A6', // SQUARE WITH ORTHOGONAL CROSSHATCH FILL
	"{\\squarellblack}": '\u2B15', // SQUARE WITH LOWER LEFT DIAGONAL HALF BLACK
	"{\\squarellquad}": '\u25F1', // WHITE SQUARE WITH LOWER LEFT QUADRANT
	"{\\squarelrquad}": '\u25F2', // WHITE SQUARE WITH LOWER RIGHT QUADRANT
	"{\\squareneswfill}": '\u25A8', // square, ne-to-sw rule filled
	"{\\squarenwsefill}": '\u25A7', // square, nw-to-se rule filled
	"{\\squaretopblack}": '\u2B12', // SQUARE WITH TOP HALF BLACK
	"{\\squareulblack}": '\u25E9', // square, filled top left corner
	"{\\squareulquad}": '\u25F0', // WHITE SQUARE WITH UPPER LEFT QUADRANT
	"{\\squareurblack}": '\u2B14', // SQUARE WITH UPPER RIGHT DIAGONAL HALF BLACK
	"{\\squareurquad}": '\u25F3', // WHITE SQUARE WITH UPPER RIGHT QUADRANT
	"{\\squarevfill}": '\u25A5', // square, vertical rule filled
	"{\\square}": '\u25A1', // WHITE SQUARE
	"{\\squoval}": '\u25A2', // WHITE SQUARE WITH ROUNDED CORNERS
	"{\\ss}": '\u00DF', // LATIN SMALL LETTER SHARP S
	"{\\starequal}": '\u225B', // STAR EQUALS
	"{\\star}": '\u22C6', // STAR OPERATOR
	"{\\steaming}": '\u2615', // HOT BEVERAGE
	"{\\stigma}": '\u03DB', // GREEK SMALL LETTER STIGMA
	"{\\strns}": '\u23E4', // STRAIGHTNESS
	"{\\subedot}": '\u2AC3', // SUBSET OF OR EQUAL TO WITH DOT ABOVE
	"{\\submult}": '\u2AC1', // SUBSET WITH MULTIPLICATION SIGN BELOW
	"{\\subrarr}": '\u2979', // SUBSET ABOVE RIGHTWARDS ARROW
	"{\\subsetapprox}": '\u2AC9', // SUBSET OF ABOVE ALMOST EQUAL TO
	"{\\subsetcirc}": '\u27C3', // OPEN SUBSET
	"{\\subsetdot}": '\u2ABD', // SUBSET WITH DOT
	"{\\subseteqq}": '\u2AC5', // SUBSET OF ABOVE EQUALS SIGN
	"{\\subseteq}": '\u2286', // SUBSET OF OR EQUAL TO
	"{\\subsetneqq}": '\u2ACB', // SUBSET OF ABOVE NOT EQUAL TO
	"{\\subsetneq}": '\u228A', // SUBSET OF WITH NOT EQUAL TO
	"{\\subsetplus}": '\u2ABF', // SUBSET WITH PLUS SIGN BELOW
	"{\\subset}": '\u2282', // SUBSET OF
	"{\\subsim}": '\u2AC7', // SUBSET OF ABOVE TILDE OPERATOR
	"{\\subsub}": '\u2AD5', // SUBSET ABOVE SUBSET
	"{\\subsup}": '\u2AD3', // SUBSET ABOVE SUPERSET
	"{\\succapprox}": '\u227F', // SUCCEEDS OR EQUIVALENT TO
	"{\\succcurlyeq}": '\u227D', // SUCCEEDS OR EQUAL TO
	"{\\succeqq}": '\u2AB4', // SUCCEEDS ABOVE EQUALS SIGN
	"{\\succeq}": '\u2AB0', // SUCCEEDS ABOVE SINGLE-LINE EQUALS SIGN
	"{\\succnapprox}": '\u2ABA', // SUCCEEDS ABOVE NOT ALMOST EQUAL TO
	"{\\succneqq}": '\u2AB6', // SUCCEEDS ABOVE NOT EQUAL TO
	"{\\succneq}": '\u2AB2', // SUCCEEDS ABOVE SINGLE-LINE NOT EQUAL TO
	"{\\succnsim}": '\u22E9', // SUCCEEDS BUT NOT EQUIVALENT TO
	"{\\succ}": '\u227B', // SUCCEEDS
	"{\\sumbottom}": '\u23B3', // SUMMATION BOTTOM
	"{\\sumint}": '\u2A0B', // SUMMATION WITH INTEGRAL
	"{\\sumtop}": '\u23B2', // SUMMATION TOP
	"{\\sum}": '\u2211', // N-ARY SUMMATION
	"{\\sun}": '\u263C', // WHITE SUN WITH RAYS
	"{\\supdsub}": '\u2AD8', // SUPERSET BESIDE AND JOINED BY DASH WITH SUBSET
	"{\\supedot}": '\u2AC4', // SUPERSET OF OR EQUAL TO WITH DOT ABOVE
	"{\\suphsol}": '\u27C9', // SUPERSET PRECEDING SOLIDUS
	"{\\suphsub}": '\u2AD7', // SUPERSET BESIDE SUBSET
	"{\\suplarr}": '\u297B', // SUPERSET ABOVE LEFTWARDS ARROW
	"{\\supmult}": '\u2AC2', // SUPERSET WITH MULTIPLICATION SIGN BELOW
	"{\\supsetapprox}": '\u2ACA', // SUPERSET OF ABOVE ALMOST EQUAL TO
	"{\\supsetcirc}": '\u27C4', // OPEN SUPERSET
	"{\\supsetdot}": '\u2ABE', // SUPERSET WITH DOT
	"{\\supseteqq}": '\u2AC6', // SUPERSET OF ABOVE EQUALS SIGN
	"{\\supseteq}": '\u2287', // SUPERSET OF OR EQUAL TO
	"{\\supsetneqq}": '\u2ACC', // SUPERSET OF ABOVE NOT EQUAL TO
	"{\\supsetneq}": '\u228B', // SUPERSET OF WITH NOT EQUAL TO
	"{\\supsetplus}": '\u2AC0', // SUPERSET WITH PLUS SIGN BELOW
	"{\\supset}": '\u2283', // SUPERSET OF
	"{\\supsim}": '\u2AC8', // SUPERSET OF ABOVE TILDE OPERATOR
	"{\\supsub}": '\u2AD4', // SUPERSET ABOVE SUBSET
	"{\\supsup}": '\u2AD6', // SUPERSET ABOVE SUPERSET
	"{\\surd}": '\u221A', // SQUARE ROOT
	"{\\surfintegral}": '\u222F', // SURFACE INTEGRAL
	"{\\swarrow}": '\u2199', // SOUTH WEST ARROW
	"{\\swords}": '\u2694', // CROSSED SWORDS
	"{\\talloblong}": '\u2AFE', // WHITE VERTICAL BAR
	"{\\taurus}": '\u2649', // TAURUS
	"{\\tau}": '\u03C4', // GREEK SMALL LETTER TAU
	"{\\textTheta}": '\u03F4', // GREEK CAPITAL THETA SYMBOL
	"{\\textasciiacute}": '\u00B4', // ACUTE ACCENT
	"{\\textasciibreve}": '\u02D8', // BREVE
	"{\\textasciicaron}": '\u02C7', // CARON
	"{\\textasciidieresis}": '\u00A8', // DIAERESIS
	"{\\textasciigrave}": '`',
	"{\\textasciimacron}": '\u00AF', // MACRON
	"{\\textasciitilde}": '~', // TILDE
	"{\\textbackslash}": '\\', // REVERSE SOLIDUS
	"{\\textbrokenbar}": '\u00A6', // BROKEN BAR
	"{\\textbullet}": '\u2022', // BULLET
	"{\\textcent}": '\u00A2', // CENT SIGN
	"{\\textcopyright}": '\u00A9', // COPYRIGHT SIGN
	"{\\textcurrency}": '\u00A4', // CURRENCY SIGN
	"{\\textdaggerdbl}": '\u2021', // DOUBLE DAGGER
	"{\\textdagger}": '\u2020', // DAGGER
	"{\\textdegree}": '\u00B0', // DEGREE SIGN
	"{\\textdollar}": '$', // DOLLAR SIGN
	"{\\textdoublepipe}": '\u01C2', // LATIN LETTER ALVEOLAR CLICK
	"{\\textemdash}": '\u2014', // EM DASH
	"{\\textendash}": '\u2013', // EN DASH
	"{\\textexclamdown}": '\u00A1', // INVERTED EXCLAMATION MARK
	"{\\texthvlig}": '\u0195', // LATIN SMALL LETTER HV
	"{\\textnrleg}": '\u019E', // LATIN SMALL LETTER N WITH LONG RIGHT LEG
	"{\\textonehalf}": '\u00BD', // VULGAR FRACTION ONE HALF
	"{\\textonequarter}": '\u00BC', // VULGAR FRACTION ONE QUARTER
	"{\\textordfeminine}": '\u00AA', // FEMININE ORDINAL INDICATOR
	"{\\textordmasculine}": '\u00BA', // MASCULINE ORDINAL INDICATOR
	"{\\textparagraph}": '\u00B6', // PILCROW SIGN
	"{\\textperiodcentered}": '\u02D9', // DOT ABOVE
	"{\\textpertenthousand}": '\u2031', // PER TEN THOUSAND SIGN
	"{\\textperthousand}": '\u2030', // PER MILLE SIGN
	"{\\textphi}": '\u0278', // LATIN SMALL LETTER PHI
	"{\\textquestiondown}": '\u00BF', // INVERTED QUESTION MARK
	"{\\textquotedblleft}": '\u201C', // LEFT DOUBLE QUOTATION MARK
	"{\\textquotedblright}": '\u201D', // RIGHT DOUBLE QUOTATION MARK
	"{\\textquotesingle}": "'",
	"{\\textregistered}": '\u00AE', // REGISTERED SIGN
	"{\\textsection}": '\u00A7', // SECTION SIGN
	"{\\textsterling}": '\u00A3', // POUND SIGN
	"{\\texttheta}": '\u03B8', // GREEK SMALL LETTER THETA
	"{\\textthreequarters}": '\u00BE', // VULGAR FRACTION THREE QUARTERS
	"{\\texttildelow}": '\u02DC', // SMALL TILDE
	"{\\texttimes}": '\u00D7', // MULTIPLICATION SIGN
	"{\\texttrademark}": '\u2122', // TRADE MARK SIGN
	"{\\textturnk}": '\u029E', // LATIN SMALL LETTER TURNED K
	"{\\textvartheta}": '\u03D1', // GREEK THETA SYMBOL
	"{\\textvisiblespace}": '\u2423', // OPEN BOX
	"{\\textyen}": '\u00A5', // YEN SIGN
	"{\\therefore}": '\u2234', // THEREFORE
	"{\\thermod}": '\u29E7', // THERMODYNAMIC
	"{\\threedangle}": '\u27C0', // THREE DIMENSIONAL ANGLE
	"{\\threeunderdot}": '\u20E8', // COMBINING TRIPLE UNDERDOT
	"{\\th}": '\u00FE', // LATIN SMALL LETTER THORN
	"{\\tieinfty}": '\u29DD', // TIE OVER INFINITY
	"{\\tildetrpl}": '\u224B', // TRIPLE TILDE
	"{\\timesbar}": '\u2A31', // MULTIPLICATION SIGN WITH UNDERBAR
	"{\\tminus}": '\u29FF', // MINY
	"{\\topbot}": '\u2336', // APL FUNCTIONAL SYMBOL I-BEAM, top and bottom
	"{\\topcir}": '\u2AF1', // DOWN TACK WITH CIRCLE BELOW
	"{\\topfork}": '\u2ADA', // PITCHFORK WITH TEE TOP
	"{\\topsemicircle}": '\u25E0', // UPPER HALF CIRCLE
	"{\\top}": '\u22A4', // DOWN TACK
	"{\\tplus}": '\u29FE', // TINY
	"{\\trapezium}": '\u23E2', // WHITE TRAPEZIUM
	"{\\trianglecdot}": '\u25EC', // triangle with centered dot
	"{\\triangledown}": '\u25BF', // WHITE DOWN-POINTING SMALL TRIANGLE
	"{\\triangleleftblack}": '\u25ED', // UP-POINTING TRIANGLE WITH LEFT HALF BLACK
	"{\\trianglelefteq}": '\u22B4', // NORMAL SUBGROUP OF OR EQUAL TO
	"{\\triangleleft}": '\u25C3', // WHITE LEFT-POINTING SMALL TRIANGLE
	"{\\triangleminus}": '\u2A3A', // MINUS SIGN IN TRIANGLE
	"{\\triangleplus}": '\u2A39', // PLUS SIGN IN TRIANGLE
	"{\\triangleq}": '\u225C', // DELTA EQUAL TO
	"{\\trianglerightblack}": '\u25EE', // UP-POINTING TRIANGLE WITH RIGHT HALF BLACK
	"{\\trianglerighteq}": '\u22B5', // CONTAINS AS NORMAL SUBGROUP OR EQUAL TO
	"{\\triangleright}": '\u25B9', // WHITE RIGHT-POINTING SMALL TRIANGLE
	"{\\triangleserifs}": '\u29CD', // TRIANGLE WITH SERIFS AT BOTTOM
	"{\\triangles}": '\u29CC', // S IN TRIANGLE
	"{\\triangletimes}": '\u2A3B', // MULTIPLICATION SIGN IN TRIANGLE
	"{\\tripleplus}": '\u29FB', // TRIPLE PLUS
	"{\\trslash}": '\u2AFB', // TRIPLE SOLIDUS BINARY RELATION
	"{\\truestate}": '\u22A7', // MODELS
	"{\\turnangle}": '\u29A2', // TURNED ANGLE
	"{\\turnednot}": '\u2319', // TURNED NOT SIGN
	"{\\twocaps}": '\u2A4B', // INTERSECTION BESIDE AND JOINED WITH INTERSECTION
	"{\\twocups}": '\u2A4A', // UNION BESIDE AND JOINED WITH UNION
	"{\\twoheaddownarrow}": '\u21A1', // down two-headed arrow
	"{\\twoheadleftarrowtail}": '\u2B3B', // LEFTWARDS TWO-HEADED ARROW WITH TAIL
	"{\\twoheadleftarrow}": '\u219E', // LEFTWARDS TWO HEADED ARROW
	"{\\twoheadleftdbkarrow}": '\u2B37', // leftwards two-headed triple-dash arrow
	"{\\twoheadmapsfrom}": '\u2B36', // LEFTWARDS TWO-HEADED ARROW FROM BAR
	"{\\twoheadrightarrow}": '\u21A0', // RIGHTWARDS TWO HEADED ARROW
	"{\\twoheaduparrowcircle}": '\u2949', // UPWARDS TWO-HEADED ARROW FROM SMALL CIRCLE
	"{\\twoheaduparrow}": '\u219F', // up two-headed arrow
	"{\\twolowline}": '\u2017', // DOUBLE LOW LINE (spacing)
	"{\\twonotes}": '\u266B', // BEAMED EIGHTH NOTES
	"{\\typecolon}": '\u2982', // Z NOTATION TYPE COLON, (present in bbold font but no command)
	"{\\u A}": '\u0102', // LATIN CAPITAL LETTER A WITH BREVE
	"{\\u E}": '\u0114', // LATIN CAPITAL LETTER E WITH BREVE
	"{\\u G}": '\u011E', // LATIN CAPITAL LETTER G WITH BREVE
	"{\\u I}": '\u012C', // LATIN CAPITAL LETTER I WITH BREVE
	"{\\u O}": '\u014E', // LATIN CAPITAL LETTER O WITH BREVE
	"{\\u U}": '\u016C', // LATIN CAPITAL LETTER U WITH BREVE
	"{\\u \\i}": '\u012D', // LATIN SMALL LETTER I WITH BREVE
	"{\\u a}": '\u0103', // LATIN SMALL LETTER A WITH BREVE
	"{\\u e}": '\u0115', // LATIN SMALL LETTER E WITH BREVE
	"{\\u g}": '\u011F', // LATIN SMALL LETTER G WITH BREVE
	"{\\u o}": '\u014F', // LATIN SMALL LETTER O WITH BREVE
	"{\\u u}": '\u016D', // LATIN SMALL LETTER U WITH BREVE
	"{\\ubrbrak}": '\u23E1', // BOTTOM TORTOISE SHELL BRACKET (mathematical use)
	"{\\ularc}": '\u25DC', // UPPER LEFT QUADRANT CIRCULAR ARC
	"{\\ulblacktriangle}": '\u25E4', // upper left triangle, filled
	"{\\ulcorner}": '\u231C', // TOP LEFT CORNER
	"{\\ultriangle}": '\u25F8', // UPPER LEFT TRIANGLE
	"{\\uminus}": '\u2A41', // UNION WITH MINUS SIGN, z notation bag subtraction
	"{\\underbar}": '\u0331', // COMBINING MACRON BELOW
	"{\\underbrace}": '\u23DF', // BOTTOM CURLY BRACKET (mathematical use)
	"{\\underbracket}": '\u23B5', // BOTTOM SQUARE BRACKET
	"{\\underleftarrow}": '\u20EE', // COMBINING LEFT ARROW BELOW
	"{\\underleftharpoondown}": '\u20ED', // COMBINING LEFTWARDS HARPOON WITH BARB DOWNWARDS
	"{\\underline}": '\u0332', // COMBINING LOW LINE
	"{\\underparen}": '\u23DD', // BOTTOM PARENTHESIS (mathematical use)
	"{\\underrightarrow}": '\u20EF', // COMBINING RIGHT ARROW BELOW
	"{\\underrightharpoondown}": '\u20EC', // COMBINING RIGHTWARDS HARPOON WITH BARB DOWNWARDS
	"{\\uparrowbarred}": '\u2909', // UPWARDS ARROW WITH HORIZONTAL STROKE
	"{\\uparrowoncircle}": '\u29BD', // UP ARROW THROUGH CIRCLE
	"{\\uparrow}": '\u2191', // UPWARDS ARROW
	"{\\updasharrow}": '\u21E1', // UPWARDS DASHED ARROW
	"{\\updownarrowbar}": '\u21A8', // UP DOWN ARROW WITH BASE (perpendicular)
	"{\\updownarrow}": '\u2195', // UP DOWN ARROW
	"{\\updownharpoonleftright}": '\u294D', // UP BARB LEFT DOWN BARB RIGHT HARPOON
	"{\\updownharpoonrightleft}": '\u294C', // UP BARB RIGHT DOWN BARB LEFT HARPOON
	"{\\upfishtail}": '\u297E', // UP FISH TAIL
	"{\\upharpoonleft}": '\u21BF', // UPWARDS HARPOON WITH BARB LEFTWARDS
	"{\\upharpoonright}": '\u21BE', // UPWARDS HARPOON WITH BARB RIGHTWARDS
	"{\\upint}": '\u2A1B', // INTEGRAL WITH OVERBAR
	"{\\upin}": '\u27D2', // ELEMENT OF OPENING UPWARDS
	"{\\uplus}": '\u228E', // MULTISET UNION
	"{\\uprightcurvearrow}": '\u2934', // ARROW POINTING RIGHTWARDS THEN CURVING UPWARDS
	"{\\upsilon}": '\u03C5', // GREEK SMALL LETTER UPSILON
	"{\\upslopeellipsis}": '\u22F0', // UP RIGHT DIAGONAL ELLIPSIS
	"{\\upuparrows}": '\u21C8', // UPWARDS PAIRED ARROWS
	"{\\upupharpoons}": '\u2963', // UPWARDS HARPOON WITH BARB LEFT BESIDE UPWARDS HARPOON WITH BARB RIGHT
	"{\\upwhitearrow}": '\u21E7', // UPWARDS WHITE ARROW
	"{\\uranus}": '\u2645', // URANUS
	"{\\urarc}": '\u25DD', // UPPER RIGHT QUADRANT CIRCULAR ARC
	"{\\urblacktriangle}": '\u25E5', // upper right triangle, filled
	"{\\urcorner}": '\u231D', // TOP RIGHT CORNER
	"{\\urtriangle}": '\u25F9', // UPPER RIGHT TRIANGLE
	"{\\utilde}": '\u0330', // under tilde accent (multiple characters and non-spacing)
	"{\\u}": '\u0306', // COMBINING BREVE
	"{\\v C}": '\u010C', // LATIN CAPITAL LETTER C WITH CARON
	"{\\v D}": '\u010E', // LATIN CAPITAL LETTER D WITH CARON
	"{\\v E}": '\u011A', // LATIN CAPITAL LETTER E WITH CARON
	"{\\v L}": '\u013D', // LATIN CAPITAL LETTER L WITH CARON
	"{\\v N}": '\u0147', // LATIN CAPITAL LETTER N WITH CARON
	"{\\v R}": '\u0158', // LATIN CAPITAL LETTER R WITH CARON
	"{\\v S}": '\u0160', // LATIN CAPITAL LETTER S WITH CARON
	"{\\v T}": '\u0164', // LATIN CAPITAL LETTER T WITH CARON
	"{\\v Z}": '\u017D', // LATIN CAPITAL LETTER Z WITH CARON
	"{\\v c}": '\u010D', // LATIN SMALL LETTER C WITH CARON
	"{\\v d}": '\u010F', // LATIN SMALL LETTER D WITH CARON
	"{\\v e}": '\u011B', // LATIN SMALL LETTER E WITH CARON
	"{\\v l}": '\u013E', // LATIN SMALL LETTER L WITH CARON
	"{\\v n}": '\u0148', // LATIN SMALL LETTER N WITH CARON
	"{\\v r}": '\u0159', // LATIN SMALL LETTER R WITH CARON
	"{\\v s}": '\u0161', // LATIN SMALL LETTER S WITH CARON
	"{\\v t}": '\u0165', // LATIN SMALL LETTER T WITH CARON
	"{\\v z}": '\u017E', // LATIN SMALL LETTER Z WITH CARON
	"{\\vBarv}": '\u2AE9', // SHORT UP TACK ABOVE SHORT DOWN TACK
	"{\\vBar}": '\u2AE8', // SHORT UP TACK WITH UNDERBAR
	"{\\vDdash}": '\u2AE2', // VERTICAL BAR TRIPLE RIGHT TURNSTILE
	"{\\varVdash}": '\u2AE6', // LONG DASH FROM LEFT MEMBER OF DOUBLE VERTICAL
	"{\\varcarriagereturn}": '\u23CE', // RETURN SYMBOL
	"{\\varclubsuit}": '\u2667', // = \varclub (arevmath), club, white (card suit)
	"{\\varepsilon}": '\u025B', // LATIN SMALL LETTER OPEN E
	"{\\varhexagonblack}": '\u2B22', // BLACK HEXAGON
	"{\\varhexagonlrbonds}": '\u232C', // six carbon ring, corner down, double bonds lower right etc
	"{\\varhexagon}": '\u2B21', // WHITE HEXAGON
	"{\\varisins}": '\u22F3', // ELEMENT OF WITH VERTICAL BAR AT END OF HORIZONTAL STROKE
	"{\\varkappa}": '\u03F0', // GREEK KAPPA SYMBOL
	"{\\varlrtriangle}": '\u22BF', // RIGHT TRIANGLE
	"{\\varniobar}": '\u22FD', // CONTAINS WITH OVERBAR
	"{\\varnis}": '\u22FB', // CONTAINS WITH VERTICAL BAR AT END OF HORIZONTAL STROKE
	"{\\varnothing}": '\u2205', // EMPTY SET
	"{\\varphi}": '\u03C6', // GREEK SMALL LETTER PHI
	"{\\varpi}": '\u03D6', // GREEK PI SYMBOL
	"{\\varprod}": '\u2A09', // N-ARY TIMES OPERATOR
	"{\\varrho}": '\u03F1', // GREEK RHO SYMBOL
	"{\\varsigma}": '\u03C2', // GREEK SMALL LETTER FINAL SIGMA
	"{\\varspadesuit}": '\u2664', // = \varspade (arevmath), spade, white (card suit)
	"{\\vartriangleleft}": '\u22B2', // NORMAL SUBGROUP OF
	"{\\vartriangleright}": '\u22B3', // CONTAINS AS NORMAL SUBGROUP
	"{\\vartriangle}": '\u25B5', // WHITE UP-POINTING SMALL TRIANGLE
	"{\\varveebar}": '\u2A61', // SMALL VEE WITH UNDERBAR
	"{\\vbraceextender}": '\u23AA', // CURLY BRACKET EXTENSION
	"{\\vdash}": '\u22A2', // RIGHT TACK
	"{\\vdots}": '\u22EE', // VERTICAL ELLIPSIS
	"{\\vec}": '\u20D1', // COMBINING RIGHT HARPOON ABOVE
	"{\\veebar}": '\u22BB', // XOR
	"{\\veedot}": '\u27C7', // OR WITH DOT INSIDE
	"{\\veemidvert}": '\u2A5B', // LOGICAL OR WITH MIDDLE STEM
	"{\\veeodot}": '\u2A52', // LOGICAL OR WITH DOT ABOVE
	"{\\veeonwedge}": '\u2A59', // LOGICAL OR OVERLAPPING LOGICAL AND
	"{\\vee}": '\u2228', // LOGICAL OR
	"{\\venus}": '\u2640', // FEMALE SIGN
	"{\\vertoverlay}": '\u20D2', // COMBINING LONG VERTICAL LINE OVERLAY
	"{\\verymuchgreater}": '\u22D9', // VERY MUCH GREATER-THAN
	"{\\verymuchless}": '\u22D8', // VERY MUCH LESS-THAN
	"{\\viewdata}": '\u2317', // VIEWDATA SQUARE
	"{\\virgo}": '\u264D', // VIRGO
	"{\\vlongdash}": '\u27DD', // long left tack
	"{\\volintegral}": '\u2230', // VOLUME INTEGRAL
	"{\\vrectangleblack}": '\u25AE', // BLACK VERTICAL RECTANGLE
	"{\\vysmblksquare}": '\u2B1D', // # \centerdot (amssymb), t \Squaredot (marvosym), BLACK VERY SMALL SQUARE
	"{\\vysmwhtsquare}": '\u2B1E', // WHITE VERY SMALL SQUARE
	"{\\vzigzag}": '\u299A', // VERTICAL ZIGZAG LINE
	"{\\v}": '\u030C', // COMBINING CARON
	"{\\warning}": '\u26A0', // WARNING SIGN
	"{\\wasylozenge}": '\u2311', // SQUARE LOZENGE
	"{\\wedgedot}": '\u27D1', // AND WITH DOT
	"{\\wedgedoublebar}": '\u2A60', // LOGICAL AND WITH DOUBLE UNDERBAR
	"{\\wedgemidvert}": '\u2A5A', // LOGICAL AND WITH MIDDLE STEM
	"{\\wedgeodot}": '\u2A51', // LOGICAL AND WITH DOT ABOVE
	"{\\wedge}": '\u2227', // LOGICAL AND
	"{\\whitearrowupfrombar}": '\u21EA', // UPWARDS WHITE ARROW FROM BAR
	"{\\whiteinwhitetriangle}": '\u27C1', // WHITE TRIANGLE CONTAINING SMALL WHITE TRIANGLE
	"{\\whitepointerleft}": '\u25C5', // # \triangleleft (mathabx), WHITE LEFT-POINTING POINTER
	"{\\whitepointerright}": '\u25BB', // # \triangleright (mathabx), WHITE RIGHT-POINTING POINTER
	"{\\whitesquaretickleft}": '\u27E4', // WHITE SQUARE WITH LEFTWARDS TICK
	"{\\whitesquaretickright}": '\u27E5', // WHITE SQUARE WITH RIGHTWARDS TICK
	"{\\whthorzoval}": '\u2B2D', // WHITE HORIZONTAL ELLIPSE
	"{\\whtvertoval}": '\u2B2F', // WHITE VERTICAL ELLIPSE
	"{\\wideangledown}": '\u29A6', // OBLIQUE ANGLE OPENING UP
	"{\\wideangleup}": '\u29A7', // OBLIQUE ANGLE OPENING DOWN
	"{\\widebridgeabove}": '\u20E9', // COMBINING WIDE BRIDGE ABOVE
	"{\\wp}": '\u2118', // SCRIPT CAPITAL P
	"{\\wr}": '\u2240', // WREATH PRODUCT
	"{\\xi}": '\u03BE', // GREEK SMALL LETTER XI
	"{\\xsol}": '\u29F8', // BIG SOLIDUS
	"{\\yinyang}": '\u262F', // YIN YANG
	"{\\zcmp}": '\u2A1F', // = \semi (oz), = \fatsemi (stmaryrd), Z NOTATION SCHEMA COMPOSITION
	"{\\zeta}": '\u03B6', // GREEK SMALL LETTER ZETA
	"{\\zhide}": '\u29F9', // = \hide (oz), BIG REVERSE SOLIDUS, z notation schema hiding
	"{\\zpipe}": '\u2A20', // Z NOTATION SCHEMA PIPING
	"{\\zproject}": '\u2A21', // = \project (oz), Z NOTATION SCHEMA PROJECTION
	"{\\~A}": '\u00C3', // LATIN CAPITAL LETTER A WITH TILDE
	"{\\~I}": '\u0128', // LATIN CAPITAL LETTER I WITH TILDE
	"{\\~N}": '\u00D1', // LATIN CAPITAL LETTER N WITH TILDE
	"{\\~O}": '\u00D5', // LATIN CAPITAL LETTER O WITH TILDE
	"{\\~U}": '\u0168', // LATIN CAPITAL LETTER U WITH TILDE
	"{\\~\\i}": '\u0129', // LATIN SMALL LETTER I WITH TILDE
	"{\\~a}": '\u00E3', // LATIN SMALL LETTER A WITH TILDE
	"{\\~n}": '\u00F1', // LATIN SMALL LETTER N WITH TILDE
	"{\\~o}": '\u00F5', // LATIN SMALL LETTER O WITH TILDE
	"{\\~u}": '\u0169', // LATIN SMALL LETTER U WITH TILDE
	"{^1}": '\u00B9', // SUPERSCRIPT ONE
	"{^2}": '\u00B2', // SUPERSCRIPT TWO
	"{^3}": '\u00B3', // SUPERSCRIPT THREE
	"{_\\ast}": '\u2217', // ASTERISK OPERATOR
	"{{/}\\!\\!{/}}": '\u2AFD' // DOUBLE SOLIDUS OPERATOR
};/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "@article{Adams2001,\nauthor = {Adams, Nancy K and DeSilva, Shanaka L and Self, Steven and Salas, Guido and Schubring, Steven and Permenter, Jason L and Arbesman, Kendra},\nfile = {:Users/heatherwright/Documents/Scientific Papers/Adams\\_Huaynaputina.pdf:pdf;::},\njournal = {Bulletin of Volcanology},\nkeywords = {Vulcanian eruptions,breadcrust,plinian},\npages = {493--518},\ntitle = {{The physical volcanology of the 1600 eruption of Huaynaputina, southern Peru}},\nvolume = {62},\nyear = {2001}\n}",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The physical volcanology of the 1600 eruption of Huaynaputina, southern Peru",
				"creators": [
					{
						"firstName": "Nancy K",
						"lastName": "Adams",
						"creatorType": "author"
					},
					{
						"firstName": "Shanaka L",
						"lastName": "DeSilva",
						"creatorType": "author"
					},
					{
						"firstName": "Steven",
						"lastName": "Self",
						"creatorType": "author"
					},
					{
						"firstName": "Guido",
						"lastName": "Salas",
						"creatorType": "author"
					},
					{
						"firstName": "Steven",
						"lastName": "Schubring",
						"creatorType": "author"
					},
					{
						"firstName": "Jason L",
						"lastName": "Permenter",
						"creatorType": "author"
					},
					{
						"firstName": "Kendra",
						"lastName": "Arbesman",
						"creatorType": "author"
					}
				],
				"date": "2001",
				"itemID": "Adams2001",
				"pages": "493–518",
				"publicationTitle": "Bulletin of Volcanology",
				"volume": "62",
				"attachments": [
					{
						"path": "Users/heatherwright/Documents/Scientific Papers/Adams_Huaynaputina.pdf",
						"mimeType": "application/pdf",
						"title": "Attachment"
					}
				],
				"tags": [
					"Vulcanian eruptions",
					"breadcrust",
					"plinian"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@Book{abramowitz+stegun,\n author    = \"Milton {Abramowitz} and Irene A. {Stegun}\",\n title     = \"Handbook of Mathematical Functions with\n              Formulas, Graphs, and Mathematical Tables\",\n publisher = \"Dover\",\n year      =  1964,\n address   = \"New York\",\n edition   = \"ninth Dover printing, tenth GPO printing\"\n}\n\n@Book{Torre2008,\n author    = \"Joe Torre and Tom Verducci\",\n publisher = \"Doubleday\",\n title     = \"The Yankee Years\",\n year      =  2008,\n isbn      = \"0385527403\"\n}\n",
		"items": [
			{
				"itemType": "book",
				"title": "Handbook of Mathematical Functions with Formulas, Graphs, and Mathematical Tables",
				"creators": [
					{
						"firstName": "Milton",
						"lastName": "Abramowitz",
						"creatorType": "author"
					},
					{
						"firstName": "Irene A.",
						"lastName": "Stegun",
						"creatorType": "author"
					}
				],
				"date": "1964",
				"edition": "ninth Dover printing, tenth GPO printing",
				"itemID": "abramowitz+stegun",
				"place": "New York",
				"publisher": "Dover",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "book",
				"title": "The Yankee Years",
				"creators": [
					{
						"firstName": "Joe",
						"lastName": "Torre",
						"creatorType": "author"
					},
					{
						"firstName": "Tom",
						"lastName": "Verducci",
						"creatorType": "author"
					}
				],
				"date": "2008",
				"ISBN": "0385527403",
				"itemID": "Torre2008",
				"publisher": "Doubleday",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@INPROCEEDINGS {author:06,\n title    = {Some publication title},\n author   = {First Author and Second Author},\n crossref = {conference:06},\n pages    = {330—331},\n}\n@PROCEEDINGS {conference:06,\n editor    = {First Editor and Second Editor},\n title     = {Proceedings of the Xth Conference on XYZ},\n booktitle = {Proceedings of the Xth Conference on XYZ},\n year      = {2006},\n month     = oct,\n}",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Some publication title",
				"creators": [
					{
						"firstName": "First",
						"lastName": "Author",
						"creatorType": "author"
					},
					{
						"firstName": "Second",
						"lastName": "Author",
						"creatorType": "author"
					}
				],
				"itemID": "author:06",
				"pages": "330—331",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "book",
				"title": "Proceedings of the Xth Conference on XYZ",
				"creators": [
					{
						"firstName": "First",
						"lastName": "Editor",
						"creatorType": "editor"
					},
					{
						"firstName": "Second",
						"lastName": "Editor",
						"creatorType": "editor"
					}
				],
				"date": "2006-10",
				"itemID": "conference:06",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@Book{hicks2001,\n author    = \"von Hicks, III, Michael\",\n title     = \"Design of a Carbon Fiber Composite Grid Structure for the GLAST\n              Spacecraft Using a Novel Manufacturing Technique\",\n publisher = \"Stanford Press\",\n year      =  2001,\n address   = \"Palo Alto\",\n edition   = \"1st,\",\n isbn      = \"0-69-697269-4\"\n}",
		"items": [
			{
				"itemType": "book",
				"title": "Design of a Carbon Fiber Composite Grid Structure for the GLAST Spacecraft Using a Novel Manufacturing Technique",
				"creators": [
					{
						"firstName": "Michael, III",
						"lastName": "von Hicks",
						"creatorType": "author"
					}
				],
				"date": "2001",
				"ISBN": "0-69-697269-4",
				"edition": "1st,",
				"itemID": "hicks2001",
				"place": "Palo Alto",
				"publisher": "Stanford Press",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@article{Oliveira_2009, title={USGS monitoring ecological impacts}, volume={107}, number={29}, journal={Oil & Gas Journal}, author={Oliveira, A}, year={2009}, pages={29}}",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "USGS monitoring ecological impacts",
				"creators": [
					{
						"firstName": "A",
						"lastName": "Oliveira",
						"creatorType": "author"
					}
				],
				"date": "2009",
				"issue": "29",
				"itemID": "Oliveira_2009",
				"pages": "29",
				"publicationTitle": "Oil & Gas Journal",
				"volume": "107",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@article{test-ticket1661,\ntitle={non-braking space: ~; accented characters: {\\~n} and \\~{n}; tilde operator: \\~},\n} ",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "non-braking space: ; accented characters: ñ and ñ; tilde operator: ∼",
				"creators": [],
				"itemID": "test-ticket1661",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@ARTICLE{Frit2,\n  author = {Fritz, U. and Corti, C. and P\\\"{a}ckert, M.},\n  title = {Test of markupconversion: Italics, bold, superscript, subscript, and small caps: Mitochondrial DNA$_{\\textrm{2}}$ sequences suggest unexpected phylogenetic position\n        of Corso-Sardinian grass snakes (\\textit{Natrix cetti}) and \\textbf{do not}\n        support their \\textsc{species status}, with notes on phylogeography and subspecies\n        delineation of grass snakes.},\n  journal = {Actes du $4^{\\textrm{ème}}$ Congrès Français d'Acoustique},\n  year = {2012},\n  volume = {12},\n  pages = {71-80},\n  doi = {10.1007/s13127-011-0069-8}\n}\n",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Test of markupconversion: Italics, bold, superscript, subscript, and small caps: Mitochondrial DNA₂ sequences suggest unexpected phylogenetic position of Corso-Sardinian grass snakes (<i>Natrix cetti</i>) and <b>do not</b> support their <span style=\"small-caps\">species status</span>, with notes on phylogeography and subspecies delineation of grass snakes.",
				"creators": [
					{
						"firstName": "U.",
						"lastName": "Fritz",
						"creatorType": "author"
					},
					{
						"firstName": "C.",
						"lastName": "Corti",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Päckert",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"DOI": "10.1007/s13127-011-0069-8",
				"itemID": "Frit2",
				"pages": "71-80",
				"publicationTitle": "Actes du 4<sup>ème</sup> Congrès Français d'Acoustique",
				"volume": "12",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@misc{american_rights_at_work_public_2012,\n    title = {Public Service Research Foundation},\n\turl = {http://www.americanrightsatwork.org/blogcategory-275/},\n\turldate = {2012-07-27},\n\tauthor = {American Rights at Work},\n\tyear = {2012},\n\thowpublished = {http://www.americanrightsatwork.org/blogcategory-275/},\n}",
		"items": [
			{
				"itemType": "document",
				"title": "Public Service Research Foundation",
				"creators": [
					{
						"firstName": "American Rights at",
						"lastName": "Work",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"itemID": "american_rights_at_work_public_2012",
				"url": "http://www.americanrightsatwork.org/blogcategory-275/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@article{zoteroFilePath1,\n    title = {Zotero: single attachment},\n    file = {Test:files/47/test2.pdf:application/pdf}\n}\n\n@article{zoteroFilePaths2,\n    title = {Zotero: multiple attachments},\n    file = {Test1:files/47/test2.pdf:application/pdf;Test2:files/46/test2-min.pdf:application/pdf}\n}\n\n@article{zoteroFilePaths3,\n    title = {Zotero: linked attachments (old)},\n    file = {Test:E:\\some\\random\\folder\\test2.pdf:application/pdf}\n}\n\n@article{zoteroFilePaths4,\n    title = {Zotero: linked attachments},\n    file = {Test:E\\:\\\\some\\\\random\\\\folder\\\\test2.pdf:application/pdf}\n}\n\n@article{mendeleyFilePaths1,\n    title = {Mendeley: single attachment},\n    url = {https://forums.zotero.org/discussion/28347/unable-to-get-pdfs-stored-on-computer-into-zotero-standalone/},\n    file = {:C$\\backslash$:/Users/somewhere/AppData/Local/Mendeley Ltd./Mendeley Desktop/Downloaded/test.pdf:pdf}\n}\n\n@article{mendeleyFilePaths2,\ntitle = {Mendeley: escaped characters}\nfile = {:C$\\backslash$:/some/path/,.$\\backslash$;'[]\\{\\}`-=\\~{}!@\\#\\$\\%\\^{}\\&()\\_+.pdf:pdf},\n}\n\n@article{citaviFilePaths1,\n    title = {Citavi: single attachment},\n    url = {https://forums.zotero.org/discussion/35909/bibtex-import-from-citavi-including-pdf-attachments/},\n    file = {Test:Q\\:\\\\some\\\\random\\\\folder\\\\test.pdf:pdf}\n}",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Zotero: single attachment",
				"creators": [],
				"itemID": "zoteroFilePath1",
				"attachments": [
					{
						"title": "Test",
						"path": "files/47/test2.pdf",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Zotero: multiple attachments",
				"creators": [],
				"itemID": "zoteroFilePaths2",
				"attachments": [
					{
						"title": "Test1",
						"path": "files/47/test2.pdf",
						"mimeType": "application/pdf"
					},
					{
						"title": "Test2",
						"path": "files/46/test2-min.pdf",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Zotero: linked attachments (old)",
				"creators": [],
				"itemID": "zoteroFilePaths3",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Zotero: linked attachments",
				"creators": [],
				"itemID": "zoteroFilePaths4",
				"attachments": [
					{
						"title": "Test",
						"path": "E:\\some\\random\\folder\\test2.pdf",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Mendeley: single attachment",
				"creators": [],
				"itemID": "mendeleyFilePaths1",
				"url": "https://forums.zotero.org/discussion/28347/unable-to-get-pdfs-stored-on-computer-into-zotero-standalone/",
				"attachments": [
					{
						"title": "Attachment",
						"path": "C:/Users/somewhere/AppData/Local/Mendeley Ltd./Mendeley Desktop/Downloaded/test.pdf",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Mendeley: escaped characters",
				"creators": [],
				"itemID": "mendeleyFilePaths2",
				"attachments": [
					{
						"title": "Attachment",
						"path": "C:/some/path/,.;'[]{}`-=~!@#$%^&()_+.pdf",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Citavi: single attachment",
				"creators": [],
				"itemID": "citaviFilePaths1",
				"url": "https://forums.zotero.org/discussion/35909/bibtex-import-from-citavi-including-pdf-attachments/",
				"attachments": [
					{
						"title": "Test",
						"path": "Q:\\some\\random\\folder\\test.pdf",
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
		"type": "import",
		"input": "@article{BibTeXEscapeTest1,\n    title = {\textbackslash\textbackslash\\{\\}: \\\\{}}\n}",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "extbackslash extbackslash{}: {",
				"creators": [],
				"itemID": "BibTeXEscapeTest1",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@article{sasson_increasing_2013,\n    title = {Increasing cardiopulmonary resuscitation provision in communities with low bystander cardiopulmonary resuscitation rates: a science advisory from the American Heart Association for healthcare providers, policymakers, public health departments, and community leaders},\n\tvolume = {127},\n\tissn = {1524-4539},\n\tshorttitle = {Increasing cardiopulmonary resuscitation provision in communities with low bystander cardiopulmonary resuscitation rates},\n\tdoi = {10.1161/CIR.0b013e318288b4dd},\n\tlanguage = {eng},\n\tnumber = {12},\n\tjournal = {Circulation},\n\tauthor = {Sasson, Comilla and Meischke, Hendrika and Abella, Benjamin S and Berg, Robert A and Bobrow, Bentley J and Chan, Paul S and Root, Elisabeth Dowling and Heisler, Michele and Levy, Jerrold H and Link, Mark and Masoudi, Frederick and Ong, Marcus and Sayre, Michael R and Rumsfeld, John S and Rea, Thomas D and {American Heart Association Council on Quality of Care and Outcomes Research} and {Emergency Cardiovascular Care Committee} and {Council on Cardiopulmonary, Critical Care, Perioperative and Resuscitation} and {Council on Clinical Cardiology} and {Council on Cardiovascular Surgery and Anesthesia}},\n\tmonth = mar,\n\tyear = {2013},\n\tnote = {{PMID:} 23439512},\n\tkeywords = {Administrative Personnel, American Heart Association, Cardiopulmonary Resuscitation, Community Health Services, Health Personnel, Heart Arrest, Humans, Leadership, Public Health, United States},\n\tpages = {1342--1350}\n}",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Increasing cardiopulmonary resuscitation provision in communities with low bystander cardiopulmonary resuscitation rates: a science advisory from the American Heart Association for healthcare providers, policymakers, public health departments, and community leaders",
				"creators": [
					{
						"firstName": "Comilla",
						"lastName": "Sasson",
						"creatorType": "author"
					},
					{
						"firstName": "Hendrika",
						"lastName": "Meischke",
						"creatorType": "author"
					},
					{
						"firstName": "Benjamin S",
						"lastName": "Abella",
						"creatorType": "author"
					},
					{
						"firstName": "Robert A",
						"lastName": "Berg",
						"creatorType": "author"
					},
					{
						"firstName": "Bentley J",
						"lastName": "Bobrow",
						"creatorType": "author"
					},
					{
						"firstName": "Paul S",
						"lastName": "Chan",
						"creatorType": "author"
					},
					{
						"firstName": "Elisabeth Dowling",
						"lastName": "Root",
						"creatorType": "author"
					},
					{
						"firstName": "Michele",
						"lastName": "Heisler",
						"creatorType": "author"
					},
					{
						"firstName": "Jerrold H",
						"lastName": "Levy",
						"creatorType": "author"
					},
					{
						"firstName": "Mark",
						"lastName": "Link",
						"creatorType": "author"
					},
					{
						"firstName": "Frederick",
						"lastName": "Masoudi",
						"creatorType": "author"
					},
					{
						"firstName": "Marcus",
						"lastName": "Ong",
						"creatorType": "author"
					},
					{
						"firstName": "Michael R",
						"lastName": "Sayre",
						"creatorType": "author"
					},
					{
						"firstName": "John S",
						"lastName": "Rumsfeld",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas D",
						"lastName": "Rea",
						"creatorType": "author"
					},
					{
						"lastName": "American Heart Association Council on Quality of Care and Outcomes Research",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Emergency Cardiovascular Care Committee",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Council on Cardiopulmonary, Critical Care, Perioperative and Resuscitation",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Council on Clinical Cardiology",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Council on Cardiovascular Surgery and Anesthesia",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2013-03",
				"DOI": "10.1161/CIR.0b013e318288b4dd",
				"ISSN": "1524-4539",
				"extra": "PMID: 23439512",
				"issue": "12",
				"itemID": "sasson_increasing_2013",
				"language": "eng",
				"pages": "1342–1350",
				"publicationTitle": "Circulation",
				"shortTitle": "Increasing cardiopulmonary resuscitation provision in communities with low bystander cardiopulmonary resuscitation rates",
				"volume": "127",
				"attachments": [],
				"tags": [
					{
						"tag": "Administrative Personnel"
					},
					{
						"tag": "American Heart Association"
					},
					{
						"tag": "Cardiopulmonary Resuscitation"
					},
					{
						"tag": "Community Health Services"
					},
					{
						"tag": "Health Personnel"
					},
					{
						"tag": "Heart Arrest"
					},
					{
						"tag": "Humans"
					},
					{
						"tag": "Leadership"
					},
					{
						"tag": "Public Health"
					},
					{
						"tag": "United States"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@article{smith_testing_????,\n    title = {Testing identifier import},\n\tauthor = {Smith, John},\n\tdoi = {10.12345/123456},\n\tlccn = {L123456},\n\tmrnumber = {MR123456},\n\tzmnumber = {ZM123456},\n\tpmid = {P123456},\n\tpmcid = {PMC123456},\n\teprinttype = {arxiv},\n\teprint = {AX123456}\n}",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Testing identifier import",
				"creators": [
					{
						"firstName": "John",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"DOI": "10.12345/123456",
				"extra": "LCCN: L123456\nMR: MR123456\nZbl: ZM123456\nPMID: P123456\nPMCID: PMC123456\narXiv: AX123456",
				"itemID": "smith_testing_????",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@inbook{smith_testing_????,\n    title = {Testing identifier import chapter},\n\tauthor = {Smith, John},\n\tdoi = {10.12345/123456},\n\tlccn = {L123456},\n\tmrnumber = {MR123456},\n\tzmnumber = {ZM123456},\n\tpmid = {P123456},\n\tpmcid = {PMC123456},\n\teprinttype = {arxiv},\n\teprint = {AX123456}\n}",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Testing identifier import chapter",
				"creators": [
					{
						"firstName": "John",
						"lastName": "Smith",
						"creatorType": "author"
					}
				],
				"extra": "DOI: 10.12345/123456\nLCCN: L123456\nMR: MR123456\nZbl: ZM123456\nPMID: P123456\nPMCID: PMC123456\narXiv: AX123456",
				"itemID": "smith_testing_????",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@mastersthesis{DBLP:ms/Hoffmann2008,\n  author    = {Oliver Hoffmann},\n  title     = {Regelbasierte Extraktion und asymmetrische Fusion bibliographischer\n               Informationen},\n  school    = {Diplomarbeit, Universit{\\\"{a}}t Trier, {FB} IV, {DBIS/DBLP}},\n  year      = {2009},\n  url       = {http://dblp.uni-trier.de/papers/DiplomarbeitOliverHoffmann.pdf},\n  timestamp = {Wed, 03 Aug 2011 15:40:21 +0200},\n  biburl    = {http://dblp.org/rec/bib/ms/Hoffmann2008},\n  bibsource = {dblp computer science bibliography, http://dblp.org}\n}\n\n@phdthesis{DBLP:phd/Ackermann2009,\n  author    = {Marcel R. Ackermann},\n  title     = {Algorithms for the Bregman k-Median problem},\n  school    = {University of Paderborn},\n  year      = {2009},\n  url       = {http://digital.ub.uni-paderborn.de/hs/content/titleinfo/1561},\n  urn       = {urn:nbn:de:hbz:466-20100407029},\n  timestamp = {Thu, 01 Dec 2016 16:33:49 +0100},\n  biburl    = {http://dblp.org/rec/bib/phd/Ackermann2009},\n  bibsource = {dblp computer science bibliography, http://dblp.org}\n}",
		"items": [
			{
				"itemType": "thesis",
				"title": "Regelbasierte Extraktion und asymmetrische Fusion bibliographischer Informationen",
				"creators": [
					{
						"firstName": "Oliver",
						"lastName": "Hoffmann",
						"creatorType": "author"
					}
				],
				"date": "2009",
				"itemID": "DBLP:ms/Hoffmann2008",
				"thesisType": "Master's Thesis",
				"university": "Diplomarbeit, Universität Trier, FB IV, DBIS/DBLP",
				"url": "http://dblp.uni-trier.de/papers/DiplomarbeitOliverHoffmann.pdf",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "thesis",
				"title": "Algorithms for the Bregman k-Median problem",
				"creators": [
					{
						"firstName": "Marcel R.",
						"lastName": "Ackermann",
						"creatorType": "author"
					}
				],
				"date": "2009",
				"itemID": "DBLP:phd/Ackermann2009",
				"thesisType": "PhD Thesis",
				"university": "University of Paderborn",
				"url": "http://digital.ub.uni-paderborn.de/hs/content/titleinfo/1561",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@inproceedings{Giannotti:2007:TPM:1281192.1281230,\n          author = {Giannotti, Fosca and Nanni, Mirco and Pinelli, Fabio and Pedreschi, Dino},\n          title = {Trajectory Pattern Mining},\n          booktitle = {Proceedings of the 13th ACM SIGKDD International Conference on Knowledge Discovery and Data Mining},\n          series = {KDD '07},\n          year = {2007},\n          isbn = {978-1-59593-609-7},\n          location = {San Jose, California, USA},\n          pages = {330--339},\n          numpages = {10},\n          url = {http://doi.acm.org/10.1145/1281192.1281230},\n          doi = {10.1145/1281192.1281230},\n          acmid = {1281230},\n          publisher = {ACM},\n          address = {New York, NY, USA},\n          keywords = {spatio-temporal data mining, trajectory patterns},\n         }",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Trajectory Pattern Mining",
				"creators": [
					{
						"firstName": "Fosca",
						"lastName": "Giannotti",
						"creatorType": "author"
					},
					{
						"firstName": "Mirco",
						"lastName": "Nanni",
						"creatorType": "author"
					},
					{
						"firstName": "Fabio",
						"lastName": "Pinelli",
						"creatorType": "author"
					},
					{
						"firstName": "Dino",
						"lastName": "Pedreschi",
						"creatorType": "author"
					}
				],
				"date": "2007",
				"DOI": "10.1145/1281192.1281230",
				"ISBN": "978-1-59593-609-7",
				"extra": "event-place: San Jose, California, USA",
				"itemID": "Giannotti:2007:TPM:1281192.1281230",
				"pages": "330–339",
				"place": "New York, NY, USA",
				"proceedingsTitle": "Proceedings of the 13th ACM SIGKDD International Conference on Knowledge Discovery and Data Mining",
				"publisher": "ACM",
				"series": "KDD '07",
				"url": "http://doi.acm.org/10.1145/1281192.1281230",
				"attachments": [],
				"tags": [
					{
						"tag": "spatio-temporal data mining"
					},
					{
						"tag": "trajectory patterns"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@article{madoc40756,\n          author = {Elias Naumann and Moritz He{\\ss} and Leander Steinkopf},\n          number = {6},\n        language = {Deutsch},\n          volume = {44},\n       publisher = {Lucius \\& Lucius},\n         address = {Stuttgart},\n           pages = {426--446},\n         journal = {Zeitschrift f{\\\"u}r Soziologie : ZfS},\n            year = {2015},\n             doi = {10.1515/zfsoz-2015-0604},\n           title = {Die Alterung der Gesellschaft und der Generationenkonflikt in Europa},\n             url = {https://madoc.bib.uni-mannheim.de/40756/}\n}\n\n@article {MR3077863,\nAUTHOR = {Eli{\\'a}{\\v{s}}, Marek and Matou{\\v{s}}ek, Ji{\\v{r}}{\\'{\\i}}},\nTITLE = {Higher-order {E}rd{\\H o}s-{S}zekeres theorems},\nJOURNAL = {Adv. Math.},\nFJOURNAL = {Advances in Mathematics},\nVOLUME = {244},\nYEAR = {2013},\nPAGES = {1--15},\nISSN = {0001-8708},\nMRCLASS = {05C65 (05C55 52C10)},\nMRNUMBER = {3077863},\nMRREVIEWER = {David Conlon},\nDOI = {10.1016/j.aim.2013.04.020},\nURL = {http://dx.doi.org/10.1016/j.aim.2013.04.020},\n}",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Die Alterung der Gesellschaft und der Generationenkonflikt in Europa",
				"creators": [
					{
						"firstName": "Elias",
						"lastName": "Naumann",
						"creatorType": "author"
					},
					{
						"firstName": "Moritz",
						"lastName": "Heß",
						"creatorType": "author"
					},
					{
						"firstName": "Leander",
						"lastName": "Steinkopf",
						"creatorType": "author"
					}
				],
				"date": "2015",
				"DOI": "10.1515/zfsoz-2015-0604",
				"issue": "6",
				"itemID": "madoc40756",
				"language": "Deutsch",
				"pages": "426–446",
				"publicationTitle": "Zeitschrift für Soziologie : ZfS",
				"url": "https://madoc.bib.uni-mannheim.de/40756/",
				"volume": "44",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Higher-order Erdős-Szekeres theorems",
				"creators": [
					{
						"firstName": "Marek",
						"lastName": "Eliáš",
						"creatorType": "author"
					},
					{
						"firstName": "Jiří",
						"lastName": "Matoušek",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"DOI": "10.1016/j.aim.2013.04.020",
				"ISSN": "0001-8708",
				"extra": "MR: 3077863",
				"itemID": "MR3077863",
				"journalAbbreviation": "Adv. Math.",
				"pages": "1–15",
				"publicationTitle": "Advances in Mathematics",
				"url": "http://dx.doi.org/10.1016/j.aim.2013.04.020",
				"volume": "244",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@incollection{madoc44942,\n        language = {isl},\n          author = {Eva H. {\\\"O}nnud{\\'o}ttir},\n           title = {B{\\'u}s{\\'a}haldabyltingin : P{\\'o}lit{\\'i}skt jafnr{\\ae}{\\dh}i og {\\th}{\\'a}tttaka almennings {\\'i} m{\\'o}tm{\\ae}lum},\n            year = {2011},\n       publisher = {F{\\'e}lagsv{\\'i}sindastofnun H{\\'a}sk{\\'o}la {\\'I}slands},\n         address = {Reykjavik},\n           pages = {36--44}\n}\n",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Búsáhaldabyltingin : Pólitískt jafnræði og þátttaka almennings í mótmælum",
				"creators": [
					{
						"firstName": "Eva H.",
						"lastName": "Önnudóttir",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"itemID": "madoc44942",
				"language": "isl",
				"pages": "36–44",
				"place": "Reykjavik",
				"publisher": "Félagsvísindastofnun Háskóla Íslands",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@String {zotero-url = {https://www.zotero.org/}}\n@string(zotero-creator = \"Corporation for Digital Scholarship\"))\n\n@Electronic{example-electronic-string,\n  author = zotero-creator,\n  title= {Zotero's Homepage},\n  year = 2019,\n  url       =zotero-url,\n  urldate=\"2019-10-12\"\n}\n",
		"items": [
			{
				"itemType": "webpage",
				"title": "Zotero's Homepage",
				"creators": [
					{
						"firstName": "Corporation for Digital",
						"lastName": "Scholarship",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"itemID": "example-electronic-string",
				"url": "https://www.zotero.org/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@String {meta:maintainer = \"Xavier D\\\\'ecoret\"}\n\n@\n  %a\npreamble\n  %a\n{ \"Maintained by \" # meta:maintainer }\n@String(Stefan = \"Stefan Swe{\\\\i}g\")\n@String(and = \" and \")\n\n@Book{sweig42,\n  Author =\t stefan # And # meta:maintainer,\n  title =\t { The {impossible} TEL---book },\n  publisher =\t { D\\\\\"ead Po$_{eee}$t Society},\n  yEAr =\t 1942,\n  month =        mar\n}",
		"items": [
			{
				"itemType": "book",
				"title": "The impossible ℡—book",
				"creators": [
					{
						"firstName": "Stefan",
						"lastName": "Swe\\ıg",
						"creatorType": "author"
					},
					{
						"firstName": "Xavier",
						"lastName": "D\\écoret",
						"creatorType": "author"
					}
				],
				"date": "1942-03",
				"itemID": "sweig42",
				"publisher": "D\\ëad Po<sub>eee</sub>t Society",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@preamble{BibTeX for papers by David Kotz; for complete/updated list see\nhttps://www.cs.dartmouth.edu/~kotz/research/papers.html}\n\n@Article{batsis:rural,\n  author =        {John A. Batsis and Curtis L. Petersen and Matthew M. Clark and Summer B. Cook and David Kotz and Tyler L. Gooding and Meredith N. Roderka and Rima I. Al-Nimr and Dawna M. Pidgeon and Ann Haedrich and KC Wright and Christina Aquila and Todd A. Mackenzie},\n  title =         {A Rural Mobile Health Obesity Wellness Intervention for Older Adults with Obesity},\n  journal =       {BMC Geriatrics},\n  year =          2020,\n  month =         {December},\n  copyright =     {the authors},\n  URL =           {https://www.cs.dartmouth.edu/~kotz/research/batsis-rural/index.html},\n  note =          {Accepted for publication},\n}\n",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A Rural Mobile Health Obesity Wellness Intervention for Older Adults with Obesity",
				"creators": [
					{
						"firstName": "John A.",
						"lastName": "Batsis",
						"creatorType": "author"
					},
					{
						"firstName": "Curtis L.",
						"lastName": "Petersen",
						"creatorType": "author"
					},
					{
						"firstName": "Matthew M.",
						"lastName": "Clark",
						"creatorType": "author"
					},
					{
						"firstName": "Summer B.",
						"lastName": "Cook",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Kotz",
						"creatorType": "author"
					},
					{
						"firstName": "Tyler L.",
						"lastName": "Gooding",
						"creatorType": "author"
					},
					{
						"firstName": "Meredith N.",
						"lastName": "Roderka",
						"creatorType": "author"
					},
					{
						"firstName": "Rima I.",
						"lastName": "Al-Nimr",
						"creatorType": "author"
					},
					{
						"firstName": "Dawna M.",
						"lastName": "Pidgeon",
						"creatorType": "author"
					},
					{
						"firstName": "Ann",
						"lastName": "Haedrich",
						"creatorType": "author"
					},
					{
						"firstName": "K. C.",
						"lastName": "Wright",
						"creatorType": "author"
					},
					{
						"firstName": "Christina",
						"lastName": "Aquila",
						"creatorType": "author"
					},
					{
						"firstName": "Todd A.",
						"lastName": "Mackenzie",
						"creatorType": "author"
					}
				],
				"date": "2020-12",
				"itemID": "batsis:rural",
				"publicationTitle": "BMC Geriatrics",
				"rights": "the authors",
				"url": "https://www.cs.dartmouth.edu/~kotz/research/batsis-rural/index.html",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "<p>Accepted for publication</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@techreport{ietf-bmwg-evpntest-09,\n\tnumber =\t{draft-ietf-bmwg-evpntest-09},\n\ttype =\t\t{Internet-Draft},\n\tinstitution =\t{Internet Engineering Task Force},\n\tpublisher =\t{Internet Engineering Task Force},\n\tnote =\t\t{Work in Progress},\n\turl =\t\t{https://datatracker.ietf.org/doc/html/draft-ietf-bmwg-evpntest-09},\n        author =\t{sudhin jacob and Kishore Tiruveedhula},\n\ttitle =\t\t{{Benchmarking Methodology for EVPN and PBB-EVPN}},\n\tpagetotal =\t28,\n\tyear =\t\t2021,\n\tmonth =\t\tjun,\n\tday =\t\t18,\n\tabstract =\t{This document defines methodologies for benchmarking EVPN and PBB- EVPN performance. EVPN is defined in RFC 7432, and is being deployed in Service Provider networks. Specifically, this document defines the methodologies for benchmarking EVPN/PBB-EVPN convergence, data plane performance, and control plane performance.},\n}\n",
		"items": [
			{
				"itemType": "report",
				"title": "Benchmarking Methodology for EVPN and PBB-EVPN",
				"creators": [
					{
						"firstName": "sudhin",
						"lastName": "jacob",
						"creatorType": "author"
					},
					{
						"firstName": "Kishore",
						"lastName": "Tiruveedhula",
						"creatorType": "author"
					}
				],
				"date": "2021-06-18",
				"abstractNote": "This document defines methodologies for benchmarking EVPN and PBB- EVPN performance. EVPN is defined in RFC 7432, and is being deployed in Service Provider networks. Specifically, this document defines the methodologies for benchmarking EVPN/PBB-EVPN convergence, data plane performance, and control plane performance.",
				"institution": "Internet Engineering Task Force",
				"itemID": "ietf-bmwg-evpntest-09",
				"reportNumber": "draft-ietf-bmwg-evpntest-09",
				"reportType": "Internet-Draft",
				"url": "https://datatracker.ietf.org/doc/html/draft-ietf-bmwg-evpntest-09",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "<p>Work in Progress</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@inproceedings{NIPS2009_0188e8b8,\n author = {Cuturi, Marco and Vert, Jean-philippe and D\\textquotesingle aspremont, Alexandre},\n booktitle = {Advances in Neural Information Processing Systems},\n editor = {Y. Bengio and D. Schuurmans and J. Lafferty and C. Williams and A. Culotta},\n pages = {},\n publisher = {Curran Associates, Inc.},\n title = {White Functionals for Anomaly Detection in Dynamical Systems},\n url = {https://proceedings.neurips.cc/paper/2009/file/0188e8b8b014829e2fa0f430f0a95961-Paper.pdf},\n volume = {22},\n year = {2009}\n}",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "White Functionals for Anomaly Detection in Dynamical Systems",
				"creators": [
					{
						"firstName": "Marco",
						"lastName": "Cuturi",
						"creatorType": "author"
					},
					{
						"firstName": "Jean-philippe",
						"lastName": "Vert",
						"creatorType": "author"
					},
					{
						"firstName": "Alexandre",
						"lastName": "D' aspremont",
						"creatorType": "author"
					},
					{
						"firstName": "Y.",
						"lastName": "Bengio",
						"creatorType": "editor"
					},
					{
						"firstName": "D.",
						"lastName": "Schuurmans",
						"creatorType": "editor"
					},
					{
						"firstName": "J.",
						"lastName": "Lafferty",
						"creatorType": "editor"
					},
					{
						"firstName": "C.",
						"lastName": "Williams",
						"creatorType": "editor"
					},
					{
						"firstName": "A.",
						"lastName": "Culotta",
						"creatorType": "editor"
					}
				],
				"date": "2009",
				"itemID": "NIPS2009_0188e8b8",
				"proceedingsTitle": "Advances in Neural Information Processing Systems",
				"publisher": "Curran Associates, Inc.",
				"url": "https://proceedings.neurips.cc/paper/2009/file/0188e8b8b014829e2fa0f430f0a95961-Paper.pdf",
				"volume": "22",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@article{Borissov:2855446,\r\n              author        = \"Borissov, Alexander and Solokhin, Sergei\",\r\n              collaboration = \"ALICE\",\r\n              title         = \"{Production of $\\Sigma^{0}$ Hyperon and Search of\r\n                               $\\Sigma^{0}$ Hypernuclei at LHC with ALICE}\",\r\n              journal       = \"Phys. At. Nucl.\",\r\n              volume        = \"85\",\r\n              number        = \"6\",\r\n              pages         = \"970-975\",\r\n              year          = \"2023\",\r\n              url           = \"https://cds.cern.ch/record/2855446\",\r\n              doi           = \"10.1134/S1063778823010131\",\r\n        }",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Production of Σ⁰ Hyperon and Search of Σ⁰ Hypernuclei at LHC with ALICE",
				"creators": [
					{
						"firstName": "Alexander",
						"lastName": "Borissov",
						"creatorType": "author"
					},
					{
						"firstName": "Sergei",
						"lastName": "Solokhin",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"DOI": "10.1134/S1063778823010131",
				"issue": "6",
				"itemID": "Borissov:2855446",
				"pages": "970-975",
				"publicationTitle": "Phys. At. Nucl.",
				"url": "https://cds.cern.ch/record/2855446",
				"volume": "85",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "@book{derbis1998poczucie,\r\ntitle={Poczucie jako{\\'s}ci {\\.z}ycia a swoboda dzia{\\l}ania i odpowiedzialno{\\'s}{\\'c}},\r\nauthor={Derbis, Romuald and Ba{\\'n}ka, Augustyn},\r\nyear={1998},\r\npublisher={Stowarzyszenie Psychologia i Architektura}\r\n}",
		"items": [
			{
				"itemType": "book",
				"title": "Poczucie jakości życia a swoboda działania i odpowiedzialność",
				"creators": [
					{
						"firstName": "Romuald",
						"lastName": "Derbis",
						"creatorType": "author"
					},
					{
						"firstName": "Augustyn",
						"lastName": "Bańka",
						"creatorType": "author"
					}
				],
				"date": "1998",
				"itemID": "derbis1998poczucie",
				"publisher": "Stowarzyszenie Psychologia i Architektura",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
