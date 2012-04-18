{
	"translatorID": "298fd9e6-bd24-413e-8a47-991621ad5f76",
	"label": "RIS-ProCite",
	"creator": "Simon Kornblith and Aurimas Vinckevicius",
	"target": "ris",
	"minVersion": "2.1.3",
	"maxVersion": "",
	"priority": 90,
	"inRepository": true,
	"translatorType": 1,
	"browserSupport": "gcs",
	"lastUpdated": "2012-04-17 23:27:18"
}

function detectImport() {
	var line, m, foundTY = false, foundPCNote = false;
	var i = 0;
	while((line = Zotero.read()) !== false) {
		line = line.replace(/^\s+/, "");
		if(line != "") {
			if(!foundTY && line.substr(0, 6).match(/^TY {1,2}- /)) {
				foundTY = true;
			} else if (line.substr(0,2) == 'N1' &&
				( m = line.match(/^N1 {1,2}- ([^:\r\n]+):/) ) ){
				foundPCNote = parseProCiteNote.noteFieldMap[m[1]] !== undefined;
			} else {
				if(i++ > 100) {
					return false;
				}
			}

			if(foundTY && foundPCNote) {
				return true;
			}
		}
	}
}

var inputFieldMap = {
	// These should match up with exportFieldMap
	ID:"itemID",
	JF:"publicationTitle",
	CY:"place",
	JA:"journalAbbreviation",
	M3:"DOI",
	// Accounting for input fields that we don't export the same way;
	// mainly for common abuses of the spec
	TI:"title",
	CT:"title",
	CY:"place",
	ST:"shortTitle",
	DO:"DOI"
};

// type map for input
// these should match up with typeMap (export) in the RIS translator
var inputTypeMap = {
	ABST:"journalArticle",
	ADVS:"film",
	AGGR:"document",	//how can we handle "database" citations?
	ANCIENT:"document",
	ART:"artwork",
	BILL:"bill",
	BLOG:"blogPost",
	BOOK:"book",
	CASE:"case",
	CHAP:"bookSection",
	CHART:"artwork",
	CLSWK:"book",
	COMP:"computerProgram",
	CONF:"conferencePaper",
	CPAPER:"conferencePaper",
	CTLG:"magazineArticle",
	DATA:"document",	//dataset
	DBASE:"document",	//database
	DICT:"dictionaryEntry",
	EBOOK:"book",
	ECHAP:"bookSection",
	EDBOOK:"book",
	EJOUR:"journalArticle",
	ELEC:"webpage",
	ENCYC:"encyclopediaArticle",
	EQUA:"document",	//what's a good way to handle this?
	FIGURE:"artwork",
	GEN:"journalArticle",
	GOVDOC:"report",
	GRNT:"document",
	HEAR:"hearing",
	ICOMM:"email",
	INPR:"manuscript",
	JFULL:"journalArticle",
	JOUR:"journalArticle",
	LEGAL:"case",		//is this what they mean?
	MANSCPT:"manuscript",
	MAP:"map",
	MGZN:"magazineArticle",
	MPCT:"film",
	MULTI:"videoRecording",	//maybe?
	MUSIC:"audioRecording",
	NEWS:"newspaperArticle",
	PAMP:"manuscript",
	PAT:"patent",
	PCOMM:"letter",
	RPRT:"report",
	SER:"book",
	SLIDE:"presentation",
	SOUND:"audioRecording",
	STAND:"report",
	STAT:"statute",
	THES:"thesis",
	UNBILL:"manuscript",
	UNPD:"manuscript",
	VIDEO:"videoRecording",
	WEB:"webpage"
};

//this will help us determine if we need to do any lookAhead and when to stop
var lookAheadTags = {
	'A1': {
		stop: function(tag) { return tag != 'A1' }
	},
	'A2': {
		stop: function(tag) { return tag != 'A2' }
	},
	'A3': {
		stop: function(tag) { return tag != 'A3' }
	},
	'N1': {
		check: function(tag, data) {
			var label = data.split(':');
			switch(label[0]) {
				case 'Author, Monographic':
				case 'Author, Subsidiary':
				case 'Director':
				case 'Editor':
				case 'Editor/Compiler':
				case 'Producer':
				case 'Series Editor':
					//we need to store label so we know when to stop
					lookAheadTags.N1.currentLabel = label[0];
					return true;
				case 'Extent of Work':
					lookAheadTags.N1.currentLabel = label[0];
					return true;
			}
		},
		stop: function(tag, data) {
			//keep looking ahead if we're on the same label
			if(tag == 'N1' &&
				data.split(':')[0] == lookAheadTags.N1.currentLabel) {
				return false;
			}
			return true;
		}
	}
}

//resolves note data to a Zotero value for a particular field
function resolveField(field, prop, label) {
	if(!resolveField.dataToValMaps[field]) {
		Z.debug('Unknown field: ' + field);
		return;
	}

	var val = resolveField.dataToValMaps[field](prop, label);

	if(!val) {
		Z.debug('Unknown ' + field + ': ' + prop);
		return;
	} else {
		return val;
	}
}

// Maps for data in various fields
// use all lower cases in singular
// (i,e. s gets trimmed off from the end of all words)
resolveField.dataToValMaps = {
	creatorType: function(val, label) {
		//special case: Series Editor Role should always be series editor
		if(label == 'Series Editor Role') {
			return ['series-editor'];
		}

		val = val.toLowerCase()
			//make things singular (careful with words that end in s)
			.replace(/s\b/g,'')
			//remove periods
			.replace(/\./g,'')
			//remove by
			.replace(/\s+by\b/g,'')
			//remove "with an" for things like "with an introduction by"
			.replace(/with an/,'')
			//split multiple types
			.split(/\s*(?:,|and)\s*/);

		var types = new Array();
		for(var i=0, n=val.length; i<n; i++) {
			switch(val[i].trim()) {
				case 'actor':
					types.push('cast-member');
					break;
				case 'author':
					types.push('author');
					break;
				case 'cartographer':
					types.push('cartographer');
					break;
				case 'composer':
				case 'composed':
					types.push('composer');
					break;
				case 'director':
				case 'directed':
					types.push('director');
					break;
				//conductor
				//illustrator
				//librettist,
				case 'performer':
				case 'performed':
					types.push('performer');
					break;
				case 'producer':
				case 'produced':
					types.push('producer');
					break;
				case 'editor':
				case 'ed':
				case 'edited':
				case 'editor-in-chief':
				case 'compiler':
				case 'compiled':
				case 'collected':
				case 'assembled':
					types.push('editor');
					break;
				case 'presenter':
				case 'presented':
					types.push('presenter');
					break;
				case 'translator':
				case 'translated':
					types.push('translator');
					break;
				case 'introduction':
					types.push('contributor');
					break;
				//if we can't match one of them
				//we'll just store the whole thing as a note
				default:
					return false;
			}
		}
		return types;
	},
	packagingMethod: function(val) {
		//grab first word
		val = val.toLowerCase().match(/[a-z]+/);
		if(!val) return false;

		//make it singular
		val = val[0].replace(/s\b/, '');
		switch(val) {
			case 'pp':
			case 'page':
				return 'pages';
			case 'vol':
			case 'volume':
				return 'volumes';
			default:
				return false;
		}
	}
};

//returns the value of the resolved field
function getProperty(props, field) {
	if(!props || !props[field]) return;

	return props[field];
}

//cleans up a note and adds it to item
function addNote(item, value) {
	var clean = Zotero.Utilities.cleanTags(value);
	if (clean == value) {
		// \n\n => <p>, \n => <br/>
		//str = Zotero.Utilities.htmlSpecialChars(str);
		value = '<p>'
			+ value.replace(/\n\n/g, '</p><p>')
				.replace(/\n/g, '<br/>')
				.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
				.replace(/  /g, '&nbsp;&nbsp;')
			+ '</p>';
		item.notes.push({note:value});
	} else {
		item.notes.push({note:value});
	}
}

//try to parse note as if it were exported by ProCite
function parseProCiteNote(item, value, props) {
	var split = value.trim().match(/(.+?)\s*:\s*([\s\S]*)/);
	if(split) {
		var func = parseProCiteNote.noteFieldMap[split[1]];
		if(typeof(func) == 'string') {
			assign(item, func, split[2], 'N1  - ' + value);
			return true;
		} else if(func === false) {
			//skip note
			return true;
		} else if(func) {	//this should be a function
			return func(item, split[2], props);
		}
	}
}

/**we can parse some note fields
 * can be bool, string, or func
 * if bool, true means skip, false means attach as note
 * if string, place the contents of the note into the indicated field
 * if func, arguments are item object, note (without the label),
 *		and the properties object
 * 		func should return a boolean with the same meaning
 *		as the bool value above.
 */
parseProCiteNote.noteFieldMap = {
	'Record ID': false,	//skip this
	'Record Number': false,
	'Place of Publication': 'place',
	//'Place of Meeting': 'place',
	'Call Number': 'callNumber',
	'Connective Phrase': function(item, note) {
		if(note.trim().toUpperCase() == 'IN') {
			return true;
		} else {
			return false;
		}
	},
	'Notes': function(item, note) {
			addNote(item, note);
			return true;
		},
	'Edition': 'edition',
	'ISBN': 'ISBN',
	'Language': 'language',
	'Publisher Name': 'publisher',
	'Series Title': 'series',
	'Proceedings Title': 'proceedingsTitle',
	'Author, Monographic': function(item, note, properties) {
		var authors = note.split(/\s*;\s*/);
		var creatorType = getProperty(properties, 'creatorType') || ['author'];
		for(var i=0, n=authors.length; i<n; i++) {
			addAuthor(item, authors[i], creatorType);
		}
		return true;
	},
	'Author, Subsidiary': function(item, note, properties) {
		//we reuse the function above
		return parseProCiteNote.noteFieldMap['Author, Monographic'](item, note, properties);
	},
	'Extent of Work': function(item, note, properties, field) {
		field = field?field:'Extent of Work';
		var raw = 'N1  - ' + field + ': ' + note;
		//grab the first number
		note = note.match(/\d+/);
		if(!note) return false;

		note = note[0];
		switch(getProperty(properties, 'packagingMethod')) {
			case 'volumes':
				assign(item, 'numberOfVolumes', note, raw + ' vols');
				return true;
			case 'pages':
				assign(item, 'numPages', note, raw + ' pages');
				return true;
			default:
				return false;
			
		}
	},
	'Copyright Date': function(item, note, properties, field) {
		field = field?field:'Copyright Date';
		var raw = 'N1  - ' + field + ': ' + note;
		assign(item, 'rights', '© ' + note, raw);
		return true;
	},
	'Date of Copyright': function(item, note, properties) {
		return parseProCiteNote.noteFieldMap
			['Copyright Date'](item, note, properties, 'Date of Copyright');
	},
	'Issue ID': function(item, note, properties, field) {
		field = field?field:'Issue ID';
		var raw = 'N1  - ' + field + ': ' + note;
		//we expect a number (may be preceded by no.)
		var m = note.replace(/no?\.?\s+\d+/i).trim().match(/^\d+$/);
		if(!m) return false;

		assign(item, 'issue', m[0], raw);
		return true;
	},
	'Issue Identification': function(item, note, properties) {
		return parseProCiteNote.noteFieldMap
			['Issue ID'](item, note, properties, 'Issue Identification');
	},
	'Page(s)': 'pages',
	'Volume ID': 'volume',
	'Series Volume ID': 'seriesNumber',
	'Scale': 'scale'
};

//Adds a creator for each creatorType that's passed in creatorTypes
function addAuthor(item, author, creatorTypes) {
	for(var i=0, n=creatorTypes.length; i<n; i++) {
		item.creators.push(ZU.cleanAuthor(author, creatorTypes[i], true));
	}
}

//mark an item with "unmapped" tag if something cannot be mapped to a field
function markUnmapped(item) {
	if(!completeItem.unmapped) {
		item.tags.push({
			name: '*Some fields not mapped*',
			type: 1
		});
		completeItem.unmapped = true;
	}
}

//assign value to item if it's a valid field for that item type
//otherwise attach it as note
function assign(item, field, value, raw) {
	if(field !== false && ZU.fieldIsValidForType(field, item.itemType)) {
		item[field] = value;
	} else {
		item.notes.push({note: raw});
		markUnmapped(item);
	}
}

//parse dates and date ranges
function parseDate(value) {
	//check if it's a range
	var m = value.replace(/[\u002D\u00AD\u2010-\u2015\u2212\u2E3A\u2E3B]/g,'-')
		.split('-');
	if(m.length == 2 && m[0].match(/\d{4}|\d\/\d/) && m[1].match(/\d{4}|\d\/\d/)) {
		var d = ZU.strToDate(m[0]);
		var d2 = ZU.strToDate(m[1]);
		var date = {
			d: ZU.formatDate(d),
			dSQL: [(d.year || '0000'),(d.month || 0) + 1,(d.day || '01')]
				.join('-').replace(/-(\d)(?=[^\d])/, '-0$1'),
			d2: ZU.formatDate(d2)
		};
		//check if from and to are the same
		if(date.d2 && date.d.day == date.d2.day &&
			date.d.month == date.d2.month && date.d.year == date.d2.year &&
			date.d.part == date.d2.part) {
			delete date.d2;
		}
		return date;
	} else {
		var d = ZU.strToDate(value);
		return {
			d: ZU.formatDate(d),
			dSQL: [(d.year || '0000'),(d.month || 0) + 1,(d.day || '01')]
				.join('-').replace(/-(\d)(?=[^\d])/, '-0$1')
		};
	}
}

function processTag(item, tag, value, properties) {
	// Drop empty fields
	if (value === undefined || value === null || value == "") return item;	

	if (tag != "N1" && tag != "AB" && value !== undefined
				&& Zotero.Utilities.unescapeHTML) {
		value = Zotero.Utilities.unescapeHTML(value);
	}

	var raw = tag + '  - ' + value;
	
	if(inputFieldMap[tag]) {
		item[inputFieldMap[tag]] = value;
	} else {
		switch(tag) {
		case "TY":
			// look for type
			
			// trim the whitespace that some providers (e.g. ProQuest) include
			value = Zotero.Utilities.trim(value);
	
			// check inputTypeMap
			if(inputTypeMap[value]) {
				item.itemType = inputTypeMap[value];
				if(value == 'GEN') {
					item.tags.push({name:'*Verify imported item type*', type:1});
				}
			} else {
				// default to document
				item.itemType = "document";
			}
		break;
		case "JO":
			if (item.itemType == "conferencePaper"){
				item.conferenceName = value;
			} else {
				assign(item, 'publicationTitle', value, raw);
			}
		break;
		case "BT":
			// ignore, unless this is a book or unpublished work, as per spec
			if(item.itemType == "book" || item.itemType == "manuscript") {
				item.title = value;
			// allow for book sections as well, since it makes sense
			} else if(item.itemType == "bookSection") {
				item.bookTitle = value;
			} else {
				completeItem.titles.T2.push(value);
			}
		break;
		case "T1":
		case "T2":
		case "T3":
			completeItem.titles[tag].push(value);
		break;
		case "A1":
		case "AU":
			// primary author (patent: inventor)
			// store Zotero "creator type" in temporary variable
			var tempType;
			switch(item.itemType) {
				case "artwork":
					tempType = "artist";
				break;
				case "audioRecording":
					tempType = "performer";
				break;
				case 'bill':
					tempType = "sponsor";
				break;
				case "patent":
					tempType = "inventor";
				break;
				case "computerProgram":
					tempType = 'programmer';
				break;
				default:
					tempType = "author";
			}
	
			//this could have been supplied in the properties
			tempType = getProperty(properties, 'creatorType') || [tempType];
	
			addAuthor(item, value, tempType);
		break;
		case "ED":
			addAuthor(item, value, ['editor']);
		break;
		case "A2":
			var tempType;
			switch(item.itemType) {
				case 'bill':
					tempType = 'sponsor';
				break;
				case 'case':
					tempType = 'contributor';
				break;
				default:
					tempType = 'editor';
			}
			tempType = [tempType]
		case "A3":
		/**TODO: split these up*/
		case "A4":
			// contributing author (patent: assignee)
			if (item.itemType == "patent") {
				if (item.assignee) {
					// Patents can have multiple assignees (applicants) but Zotero only allows a single
					// assignee field, so we  have to concatenate them together
					item.assignee += ", "+value;
				} else {
					item.assignee =  value;
				}
			} else {
				if(!tempType) {
					var tempType;
					switch(item.itemType) {
						case 'book':
						case 'bookSection':
						case 'conferencePaper':
							tempType = 'series-editor';
						break;
						default:
							tempType = 'contributor';
					}
					tempType = [tempType];
				}
				var tempType = getProperty(properties, 'creatorType') || 
					tempType;
				addAuthor(item, value, tempType);
			}
		break;
		case "Y1":
		case "PY":
			var field;
			switch(item.itemType) {
				case 'patent':
					field = 'issueDate';
				break;
				default:
					field = 'date';
			}
		case "Y2":
			var date = parseDate(value);

			switch(item.itemType) {
				case 'patent':
					if(!field) var field = 'filingDate';
					date = date.d;
				break;
				default:
					if(!field) {
						var field = 'accessDate';
						date = date.dSQL;
						//a small hack so we don't drop Y2 fields that cannot
						//be formatted into an SQL date
						if(date == '0000-01-01') {
							//this will cause the RIS line to be attached as note
							field = false;
						}
					} else {
						date = date.d;
					}
			}
			/**TODO: handle date ranges*/
			assign(item, field, date, raw);
		break;
		case "N1":
			// notes
			if(value != item.title) {       // why does EndNote do this!?
				//some software (e.g. ProCite) adds labels to notes
				if(!parseProCiteNote(item, value, properties)) {
					addNote(item, value);
				}
			}
		break;
		// The RIS spec insanely claims that AB == N1, but other software seems
		// to overlook or ignore this, so we will too on import
		case "N2":
		case "AB":
			// abstract
			if (item.abstractNote) item.abstractNote += "\n" + value;
			else item.abstractNote = value;
		break;
		case "KW":
			// keywords/tags
			
			// technically, treating newlines as new tags breaks the RIS spec, but
			// it's required to work with EndNote
			item.tags = item.tags.concat(value.split("\n"));
		break;
		case "SP":
			/**TODO: make sure these are never dropped*/
			// start page
			if(!item.pages) {
				item.pages = value;
				// EndNote uses SP without EP for number of pages
				// Save as numPages only if there were no previous pages tags
				if (item.itemType == "book") item.numPages = value;
			} else if(item.pages[0] == "-") {       // already have ending page
				item.pages = value + item.pages;
			} else {	// multiple ranges? hey, it's a possibility
				item.pages += ", "+value;
			}
		break;
		case "EP":
			// end page
			if(value) {
				if(!item.pages) {
					item.pages = value;
				} else if(value != item.pages) {
					item.pages += "-"+value;
					// EndNote uses SP without EP for number of pages
					// Here, clear numPages if we have an EP != SP
					if (item.itemType == "book") item.numPages = undefined;
				}
			}
		break;
		case "SN":
			// ISSN/ISBN - just add both
			// TODO We should be able to tell these apart
			if(!item.ISBN) {
				item.ISBN = value;
			}
			if(!item.ISSN) {
				item.ISSN = value;
			}

			if(!ZU.fieldIsValidForType(item.itemType, 'ISBN') ||
				!ZU.fieldIsValidForType(item.itemType, 'ISSN')) {
				item.notes.push({note:raw});
				markUnmapped(item);
			}
		break;
		case "UR":
		case "L1":
		case "L2":
		case "L4":
			// URL
			if(!item.url) {
				item.url = value;
			}
			if(tag == "UR") {
				item.attachments.push({url:value});
			} else if(tag == "L1") {
				item.attachments.push({url:value, mimeType:"application/pdf",
					title:"Full Text (PDF)"});
			} else if(tag == "L2") {
				item.attachments.push({url:value, mimeType:"text/html",
					title:"Full Text (HTML)"});
			} else if(tag == "L4") {
				item.attachments.push({url:value,
					title:"Image"});
			}
		break;
		case "IS":
			// Issue Number (patent: patentNumber)
			if (item.itemType == "patent") {
				item.patentNumber = value;
			} else if(item.itemType == "computerProgram") {
				if(!item.version) item.version = value;
			} else {
				assign(item, 'issue', value, raw);
			}
		break;
		case "VL":
			// Volume Number (patent: applicationNumber)
			if (item.itemType == "patent") {
				item.applicationNumber = value;
			// Report Number (report: reportNumber)
			} else if(item.itemType == "report") {
				item.reportNumber = value;
			} else {
				assign(item, 'volume', value, raw);
			}
		break;
		case "PB":
			// publisher (patent: references)
			if (item.itemType == "patent") {
				item.references = value;
			} else {
				assign(item, 'publisher', value, raw);
			}
		break;
		case "M1":
		case "M2":
			// Miscellaneous fields
			if (!item.extra) {
				item.extra = value;
			} else {
				item.extra += "; "+value;
			}
		break;
		default:
			//store whatever we can't parse inside a note
			item.notes.push( {note: tag + ' - ' + value } );
			markUnmapped(item);
		}
	}
}

function completeItem(item) {
	var titles = completeItem.titles.T1.concat(
					completeItem.titles.T2.concat(
						completeItem.titles.T3));
	var i;
	if(!item.title) {
		item.title = titles.shift();
	//in case there are duplicate entries, remove them
	} else {
		i = titles.indexOf(item.title);
		while(i != -1) {
			titles.splice(i, 1);
			i = titles.indexOf(item.title);
		}
	}
	

	if(ZU.fieldIsValidForType('bookTitle', item.itemType) ||
		ZU.fieldIsValidForType('publicationTitle', item.itemType)) {
		if(!item.bookTitle) item.bookTitle = item.publicationTitle;
		if(!item.bookTitle) {
			item.bookTitle = titles.shift();
		//in case there are duplicate entries, remove them
		} else {
			i = titles.indexOf(item.bookTitle);
			while(i != -1) {
				titles.splice(i, 1);
				i = titles.indexOf(item.bookTitle);
			}
		}
		item.publicationTitle = item.bookTitle;
	}

	if(!item.series) item.series = titles.shift();

	completeItem.titles.T1 = [];
	completeItem.titles.T2 = [];
	completeItem.titles.T3 = [];

	delete completeItem.unmapped;

	// fix for doi: prefixed to DOI
	if(item.DOI) {
		item.DOI = item.DOI.replace(/\s*doi:\s*/,'');
	}

	// hack for sites like Nature, which only use JA, journal abbreviation
	if(item.journalAbbreviation && !item.publicationTitle){
		item.publicationTitle = item.journalAbbreviation;
	}
	// Hack for Endnote exports missing full title
	if(item.shortTitle && !item.title){
		item.title = item.shortTitle;
	}
	item.complete();
}

completeItem.titles = {
	T1: [],
	T2: [],
	T3: []
};

function appendData(tag, data, rawLine) {
	if(tag == "N1" || tag == "N2" || tag == "AB" || tag == "KW") {
		// preserve line endings for N1/N2/AB fields, for EndNote
		// compatibility
		data += "\n"+rawLine;
	} else if(tag) {
		// otherwise, follow the RIS spec
		if(data[data.length-1] == " ") {
			data += rawLine;
		} else {
			data += " "+rawLine;
		}
	}

	return data;
}

//tries to extract some properties from the given RIS line
function extractProperties(tag, data) {
	if(tag != 'N1') {
		return;
	}

	var split = data.match(/(.+?)\s*:\s*(.+)/);
	//if there is no label, then don't proceed
	if(!split) {
		return;
	}

	var propName = extractProperties.propertiesMap[split[1]];
	if(!propName) {
		Z.debug('Unhandled property "' + split[1] + '"');
		return;
	}

	var value = resolveField(propName, split[2], split[1]);
	if(!value) {
		return;
	}

	var props = new Object();
	props[propName] = value;

	return props;
}

// Maps a ProCite label to a Zotero field name
extractProperties.propertiesMap = {
	'Author Role': 'creatorType',
	'Editor/Compiler Role': 'creatorType',
	'Series Editor Role': 'creatorType',
	'Author Role, Analytic': 'creatorType',
	'Artist Role': 'creatorType',
	'Cartographer Role': 'creatorType',
	'Composer Role': 'creatorType',
	'Director Role': 'creatorType',
	'Performer Role': 'creatorType',
	'Producer Role': 'creatorType',

	'Packaging Method': 'packagingMethod'
};

function processBacklog(item, backlog, props) {
	for(var i=0, n=backlog.length; i<n; i++) {
		processTag(item, backlog[i].tag, backlog[i].data, props);
	}
}


// returns the next set of tag and data
function getNextField() {
	line = getNextField.line || Zotero.read();
	getNextField.line = undefined;	//clear it

	var tag, data;
	while(line !== false) {
		// trim leading space if this line is not part of a note
		line = line.replace(/^\s+/, "");
	
		// Handle out-of-spec old EndNote exports with one space
		var split = line.match(/^([A-Z0-9]{2}) {1,2}-(?: ([^\n]*))?/);

		if(tag) {
			//if this is a new field, we return the current tag+data and store
			//this line for later
			if(split) {
				getNextField.line = line;
				return {tag: tag, data: data};
			//otherwise we append this to the current data
			} else {
				data = appendData(tag, data, line);
			}
		//if we don't already have a tag...
		} else if(split) {
			tag = split[1];
			data = split[2];
		}

		line = Zotero.read();
	}

	if(tag) {
		return {tag: tag, data: data};
	}
}

function lookAhead(tag, data, item) {
	var backlog = new Array();
	//tells us when to stop looking ahead
	var stop = lookAheadTags[tag].stop;

	do {
		backlog.push({tag: tag, data: data});
		var split = getNextField();

		//this should never happen
		if(!split) {
			Z.debug('File ended inside lookAhead! Missing ER tag or we did not stop on it!');
			processBacklog(item, backlog);
			return {tag:true, data:false}; //we let the calling function complete item
		}

		tag = split.tag;
		data = split.data;
	} while(!stop(tag, data));

	var properties = extractProperties(tag, data);
	//process backlog and return the last tag and data
	processBacklog(item, backlog, properties);

	//we can skip the note if it was resolved to a property
	return {tag: tag, data: data, skip: (properties?true:false)};
}

function doImport(attachments) {
	var split = getNextField();
	//skip to the first TY field
	while(split && split.tag != 'TY') {
		split = getNextField();
	}

	//this should never happen if detectImport passes
	if(!split) {
		Z,debug('No TY field found');
		return;
	}

	var tag = split.tag;
	var data = split.data;
	var item = new Zotero.Item();

	var i=0;	//attachment counter
	if(attachments && attachments[i]) {
		item.attachments = attachments[i];
	}

	var skip = false;
	var repeat;

	while(split = getNextField()) {    // until EOF
		if(tag && !skip) {
			//Zotero.debug("tag: '"+tag+"'; data: '"+data+"'");
			processTag(item, tag, data);
		}

		skip = false;

		// then fetch the tag and data from this line
		tag = split.tag;
		data = split.data;

		do {
			//we may need to redo the check for ER and TY if we lookAhead
			repeat = false;
			switch(tag) {
				case 'ER':		// ER signals end of reference
					// unset info
					tag = data = false;
					completeItem(item);
					break;
				case 'TY':
					// new item
					item = new Zotero.Item();
					i++;
					if(attachments && attachments[i]) {
						item.attachments = attachments[i];
					}
					break;
				default:
					//see if we need to do any lookahead
					if(lookAheadTags[tag] &&
						(!lookAheadTags[tag].check ||		//if there is no check function, we lookAhead
							lookAheadTags[tag].check(tag, data))) {	//otherwise run a check
						var newLine = lookAhead(tag, data, item);
						tag = newLine.tag;
						data = newLine.data;
						skip = newLine.skip;
						repeat = true;
					}
			}
		} while(repeat);
	}

	if(tag && tag != "ER") {	// save any unprocessed tags
		//Zotero.debug(tag);
		processTag(item, tag, data);
		completeItem(item);
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "TY  - JOUR\nN1  - Record ID: 1\nA1  - Baldwin,S.A.\nA1  - Fugaccia,I.\nA1  - Brown,D.R.\nA1  - Brown,L.V.\nA1  - Scheff,S.W.\nT1  - Blood-brain barrier breach following\ncortical contusion in the rat\nJO  - J.Neurosurg.\nY1  - 1996\nVL  - 85\nSP  - 476\nEP  - 481\nRP  - Not In File\nKW  - cortical contusion\nKW  - blood-brain barrier\nKW  - horseradish peroxidase\nKW  - head trauma\nKW  - hippocampus\nKW  - rat\nN2  - Adult Fisher 344 rats were subjected to a unilateral impact to the dorsal cortex above the hippocampus at 3.5 m/sec with a 2 mm cortical depression. This caused severe cortical damage and neuronal loss in hippocampus subfields CA1, CA3 and hilus. Breakdown of the blood-brain barrier (BBB) was assessed by injecting the protein horseradish peroxidase (HRP) 5 minutes prior to or at various times following injury (5 minutes, 1, 2, 6, 12 hours, 1, 2, 5, and 10 days). Animals were killed 1 hour after HRP injection and brain sections were reacted with diaminobenzidine to visualize extravascular accumulation of the protein. Maximum staining occurred in animals injected with HRP 5 minutes prior to or 5 minutes after cortical contusion. Staining at these time points was observed in the ipsilateral hippocampus. Some modest staining occurred in the dorsal contralateral cortex near the superior sagittal sinus. Cortical HRP stain gradually decreased at increasing time intervals postinjury. By 10 days, no HRP stain was observed in any area of the brain. In the ipsilateral hippocampus, HRP stain was absent by 3 hours postinjury and remained so at the 6- and 12- hour time points. Surprisingly, HRP stain was again observed in the ipsilateral hippocampus 1 and 2 days following cortical contusion, indicating a biphasic opening of the BBB following head trauma and a possible second wave of secondary brain damage days after the contusion injury. These data indicate regions not initially destroyed by cortical impact, but evidencing BBB breach, may be accessible to neurotrophic factors administered intravenously both immediately and days after brain trauma.\nER  - ",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "S. A.",
						"lastName": "Baldwin",
						"creatorType": "author"
					},
					{
						"firstName": "I.",
						"lastName": "Fugaccia",
						"creatorType": "author"
					},
					{
						"firstName": "D. R.",
						"lastName": "Brown",
						"creatorType": "author"
					},
					{
						"firstName": "L. V.",
						"lastName": "Brown",
						"creatorType": "author"
					},
					{
						"firstName": "S. W.",
						"lastName": "Scheff",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "RP - Not In File"
					}
				],
				"tags": [
					"cortical contusion",
					"blood-brain barrier",
					"horseradish peroxidase",
					"head trauma",
					"hippocampus",
					"rat"
				],
				"seeAlso": [],
				"attachments": [],
				"publicationTitle": "J.Neurosurg.",
				"date": "1996",
				"volume": "85",
				"pages": "476-481",
				"abstractNote": "Adult Fisher 344 rats were subjected to a unilateral impact to the dorsal cortex above the hippocampus at 3.5 m/sec with a 2 mm cortical depression. This caused severe cortical damage and neuronal loss in hippocampus subfields CA1, CA3 and hilus. Breakdown of the blood-brain barrier (BBB) was assessed by injecting the protein horseradish peroxidase (HRP) 5 minutes prior to or at various times following injury (5 minutes, 1, 2, 6, 12 hours, 1, 2, 5, and 10 days). Animals were killed 1 hour after HRP injection and brain sections were reacted with diaminobenzidine to visualize extravascular accumulation of the protein. Maximum staining occurred in animals injected with HRP 5 minutes prior to or 5 minutes after cortical contusion. Staining at these time points was observed in the ipsilateral hippocampus. Some modest staining occurred in the dorsal contralateral cortex near the superior sagittal sinus. Cortical HRP stain gradually decreased at increasing time intervals postinjury. By 10 days, no HRP stain was observed in any area of the brain. In the ipsilateral hippocampus, HRP stain was absent by 3 hours postinjury and remained so at the 6- and 12- hour time points. Surprisingly, HRP stain was again observed in the ipsilateral hippocampus 1 and 2 days following cortical contusion, indicating a biphasic opening of the BBB following head trauma and a possible second wave of secondary brain damage days after the contusion injury. These data indicate regions not initially destroyed by cortical impact, but evidencing BBB breach, may be accessible to neurotrophic factors administered intravenously both immediately and days after brain trauma.",
				"title": "Blood-brain barrier breach following cortical contusion in the rat",
				"bookTitle": "J.Neurosurg."
			}
		]
	},
	{
		"type": "import",
		"input": "TY  - PAT\nN1  - Record ID: 2\nA1  - Burger,D.R.\nA1  - Goldstein,A.S.\nT1  - Method of detecting AIDS virus infection\nY1  - 1990/2/27\nVL  - 877609\nIS  - 4,904,581\nRP  - Not In File\nA2  - Epitope,I.\nCY  - OR\nPB  - 4,629,783\nKW  - AIDS\nKW  - virus\nKW  - infection\nKW  - antigens\nY2  - 1986/6/23\nM1  - G01N 33/569 G01N 33/577\nM2  - 435/5 424/3 424/7.1 435/7 435/29 435/32 435/70.21 435/240.27 435/172.2 530/387 530/808 530/809 935/110\nN2  - A method is disclosed for detecting the presence of HTLV III infected cells in a medium. The method comprises contacting the medium with monoclonal antibodies against an antigen produced as a result of the infection and detecting the binding of the antibodies to the antigen. The antigen may be a gene product of the HTLV III virus or may be bound to such gene product. On the other hand the antigen may not be a viral gene product but may be produced as a result of the infection and may further be bound to a lymphocyte. The medium may be a human body fluid or a culture medium. A particular embodiment of the present method involves a method for determining the presence of a AIDS virus in a person. The method comprises combining a sample of a body fluid from the person with a monoclonal antibody that binds to an antigen produced as a result of the infection and detecting the binding of the monoclonal antibody to the antigen. The presence of the binding indicates the presence of a AIDS virus infection. Also disclosed are novel monoclonal antibodies, noval compositions of matter, and novel diagnostic kits\nER  - ",
		"items": [
			{
				"itemType": "patent",
				"creators": [
					{
						"firstName": "D. R.",
						"lastName": "Burger",
						"creatorType": "inventor"
					},
					{
						"firstName": "A. S.",
						"lastName": "Goldstein",
						"creatorType": "inventor"
					}
				],
				"notes": [
					{
						"note": "RP - Not In File"
					}
				],
				"tags": [
					"AIDS",
					"virus",
					"infection",
					"antigens"
				],
				"seeAlso": [],
				"attachments": [],
				"date": "February 27, 1990",
				"applicationNumber": "877609",
				"patentNumber": "4,904,581",
				"assignee": "Epitope,I.",
				"place": "OR",
				"references": "4,629,783",
				"filingDate": "June 23, 1986",
				"extra": "G01N 33/569 G01N 33/577; 435/5 424/3 424/7.1 435/7 435/29 435/32 435/70.21 435/240.27 435/172.2 530/387 530/808 530/809 935/110",
				"abstractNote": "A method is disclosed for detecting the presence of HTLV III infected cells in a medium. The method comprises contacting the medium with monoclonal antibodies against an antigen produced as a result of the infection and detecting the binding of the antibodies to the antigen. The antigen may be a gene product of the HTLV III virus or may be bound to such gene product. On the other hand the antigen may not be a viral gene product but may be produced as a result of the infection and may further be bound to a lymphocyte. The medium may be a human body fluid or a culture medium. A particular embodiment of the present method involves a method for determining the presence of a AIDS virus in a person. The method comprises combining a sample of a body fluid from the person with a monoclonal antibody that binds to an antigen produced as a result of the infection and detecting the binding of the monoclonal antibody to the antigen. The presence of the binding indicates the presence of a AIDS virus infection. Also disclosed are novel monoclonal antibodies, noval compositions of matter, and novel diagnostic kits",
				"title": "Method of detecting AIDS virus infection"
			}
		]
	},
	{
		"type": "import",
		"input": "TY  - CHAP\nN1  - Record ID: 7\nA1  - Adams, Robert McC.\nT1  - The Emerging Place of Trade in Civilizational Studies\nN1  - Connective Phrase: In\nA2  - Sabloff, Jeremy\nA2  - Lamberg-Karlovsky, C.\nN1  - Author Role: edited by\nT2  - Ancient Subsistence and Trade\nCY  - Albuquerque\nPB  - University of New Mexico Press\nPY  - 1975\nSP  - 451-465\nKW  - trade\nER  - ",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "Robert McC",
						"lastName": "Adams",
						"creatorType": "author"
					},
					{
						"firstName": "Jeremy",
						"lastName": "Sabloff",
						"creatorType": "editor"
					},
					{
						"firstName": "C.",
						"lastName": "Lamberg-Karlovsky",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [
					"trade"
				],
				"seeAlso": [],
				"attachments": [],
				"place": "Albuquerque",
				"publisher": "University of New Mexico Press",
				"date": "1975",
				"pages": "451-465",
				"title": "The Emerging Place of Trade in Civilizational Studies",
				"bookTitle": "Ancient Subsistence and Trade",
				"publicationTitle": "Ancient Subsistence and Trade"
			}
		]
	},
	{
		"type": "import",
		"input": "TY  - BOOK\nN1  - Record ID: 2648\nA1  - Van Gennep, A.\nA2  - Vizedom, M. B.\nA2  - Coffee, G. L.\nN1  - Author Role: translated by\nT2  - The Rites of Passage\nN1  - Author, Subsidiary: Kimball S. T.\nN1  - Author Role: with an introduction by\nCY  - Chicago\nPB  - University of Chicago Press\nPY  - 1960\nKW  - anthropological theory\nER  - ",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "A.",
						"lastName": "Van Gennep",
						"creatorType": "author"
					},
					{
						"firstName": "M. B.",
						"lastName": "Vizedom",
						"creatorType": "translator"
					},
					{
						"firstName": "G. L.",
						"lastName": "Coffee",
						"creatorType": "translator"
					},
					{
						"lastName": "Kimball S. T",
						"creatorType": "contributor"
					}
				],
				"notes": [],
				"tags": [
					"anthropological theory"
				],
				"seeAlso": [],
				"attachments": [],
				"place": "Chicago",
				"publisher": "University of Chicago Press",
				"date": "1960",
				"title": "The Rites of Passage"
			}
		]
	},
	{
		"type": "import",
		"input": "TY  - CONF\nN1  - Record Number: 330\nA1  - Allard, Francis\nT1  - Investigating the Bronze Age of Khanuy Valley, Central Mongolia\nN1  - Connective Phrase: In\nA2  - Hanks, Bryan\nA2  - Linduff, Kathy\nN1  - Proceedings Title: New Research Directions in Eurasian Steppe Archaeology: The Emergence of Complex Societies in the Third to First Millennia BCE\nY2  - 2006/02/10-2006/02/10\nN1  - Place of Meeting: University of Pittsburgh\nCY  - Pittsburgh\nPB  - Department of Anthropology & Center for Russian and East European Studies\nPY  - 2006\nN1  - Notes: have, seen\nAllard 2006\n\n1.    Herders in the Khanuy valley move their camps 2 to 4 times per year. 1\n2.\tA few families cultivate vegetables on small plots. 1\n3.\tHerders in the valley move camp 2 to 4 times per year, “with maximum movements not exceeding 10 km. 6\n4.\tRussian ethnographer A.D. Simukov identified a mobility pattern he called “Hangai”.  Considering the productivity of the region camps did not move far in response to drought. 6\n5.\tSimukov “estimated the diameter of the annual movement cycle to be no more than 7-8 km.” 6\n6.\t“Nomadic pastoralism is politically centrifugal, militating against central and hierarchical power… Nomadic mobility, in consequence, has a dampening effect on hierarchy and centralization and on chiefly coercion and oppression…. Chiefships arise in nomadic tribes in confrontation with powerful external populations (Irons 1979). Thus, acephalous, egalitarian, decentralized, nomadic tribes are more likely to be found in remote regions far from centers of power, population, and trade, and nomadic tribal chiefdoms are more likely to be found in proximity to agricultural settlements, cities, state agencies, and major markets” (2004).” 7 [we need to deal with this perspective within the household model]\n\nKW  - Mongolia\nKW  - pastoralism\nER  - ",
		"items": [
			{
				"itemType": "conferencePaper",
				"creators": [
					{
						"firstName": "Francis",
						"lastName": "Allard",
						"creatorType": "author"
					},
					{
						"firstName": "Bryan",
						"lastName": "Hanks",
						"creatorType": "contributor"
					},
					{
						"firstName": "Kathy",
						"lastName": "Linduff",
						"creatorType": "contributor"
					}
				],
				"notes": [
					{
						"note": "<p>have, seen<br/>Allard 2006</p><p>1.&nbsp;&nbsp;&nbsp;&nbsp;Herders in the Khanuy valley move their camps 2 to 4 times per year. 1<br/>2.&nbsp;&nbsp;&nbsp;&nbsp;A few families cultivate vegetables on small plots. 1<br/>3.&nbsp;&nbsp;&nbsp;&nbsp;Herders in the valley move camp 2 to 4 times per year, “with maximum movements not exceeding 10 km. 6<br/>4.&nbsp;&nbsp;&nbsp;&nbsp;Russian ethnographer A.D. Simukov identified a mobility pattern he called “Hangai”.&nbsp;&nbsp;Considering the productivity of the region camps did not move far in response to drought. 6<br/>5.&nbsp;&nbsp;&nbsp;&nbsp;Simukov “estimated the diameter of the annual movement cycle to be no more than 7-8 km.” 6<br/>6.&nbsp;&nbsp;&nbsp;&nbsp;“Nomadic pastoralism is politically centrifugal, militating against central and hierarchical power… Nomadic mobility, in consequence, has a dampening effect on hierarchy and centralization and on chiefly coercion and oppression…. Chiefships arise in nomadic tribes in confrontation with powerful external populations (Irons 1979). Thus, acephalous, egalitarian, decentralized, nomadic tribes are more likely to be found in remote regions far from centers of power, population, and trade, and nomadic tribal chiefdoms are more likely to be found in proximity to agricultural settlements, cities, state agencies, and major markets” (2004).” 7 [we need to deal with this perspective within the household model]</p>"
					}
				],
				"tags": [
					"Mongolia",
					"pastoralism"
				],
				"seeAlso": [],
				"attachments": [],
				"proceedingsTitle": "New Research Directions in Eurasian Steppe Archaeology: The Emergence of Complex Societies in the Third to First Millennia BCE",
				"accessDate": "2006/02/10-2006/02/10",
				"place": "Pittsburgh",
				"publisher": "Department of Anthropology & Center for Russian and East European Studies",
				"date": "2006",
				"title": "Investigating the Bronze Age of Khanuy Valley, Central Mongolia"
			}
		]
	},
	{
		"type": "import",
		"input": "TY - CHAP\nA1 - Adams, Robert McC.\nT2 - Contexts of Civilizational Collapse: A Mesopotamian View\nN1 - Connective Phrase: In\nA2 - Yoffee, Norman\nA2 - Cowgill, George L.\nN1 - Author Role: editors\nT2 - The Collapse of Ancient States and Civilizations\nCY - Arizona\nPB - University of Arizona Press\nPY - 1988\nSP - 20-43\nN1 - Notes: have, seen\nKW - Asia\nKW - empire\nKW - archaeological theory\nKW - social organization\nER - ",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "Robert McC",
						"lastName": "Adams",
						"creatorType": "author"
					},
					{
						"firstName": "Norman",
						"lastName": "Yoffee",
						"creatorType": "editor"
					},
					{
						"firstName": "George L.",
						"lastName": "Cowgill",
						"creatorType": "editor"
					}
				],
				"notes": [
					{
						"note": "<p>have, seen</p>"
					}
				],
				"tags": [
					"Asia",
					"empire",
					"archaeological theory",
					"social organization"
				],
				"seeAlso": [],
				"attachments": [],
				"place": "Arizona",
				"publisher": "University of Arizona Press",
				"date": "1988",
				"pages": "20-43",
				"title": "Contexts of Civilizational Collapse: A Mesopotamian View",
				"bookTitle": "The Collapse of Ancient States and Civilizations",
				"publicationTitle": "The Collapse of Ancient States and Civilizations"
			}
		]
	}
]
/** END TEST CASES **/