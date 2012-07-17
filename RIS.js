{
	"translatorID": "32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7",
	"label": "RIS",
	"creator": "Simon Kornblith and Aurimas Vinckevicius",
	"target": "ris",
	"minVersion": "2.1.3",
	"maxVersion": "",
	"priority": 100,
	"displayOptions": {
		"exportCharset": "UTF-8",
		"exportNotes": true
	},
	"inRepository": true,
	"translatorType": 3,
	"browserSupport": "gcsv",
	"lastUpdated": "2012-04-24 15:51:20"
}

function detectImport() {
	var line;
	var i = 0;
	while((line = Zotero.read()) !== false) {
		line = line.replace(/^\s+/, "");
		if(line != "") {
			if(line.substr(0, 6).match(/^TY {1,2}- /)) {
				return true;
			} else {
				if(i++ > 3) {
					return false;
				}
			}
		}
	}
}

/************************
 * TY <-> itemType maps *
 ************************/

var exportTypeMap = {
	artwork:"ART",
	audioRecording:"SOUND",	//consider MUSIC
	bill:"BILL",
	blogPost:"BLOG",
	book:"BOOK",
	bookSection:"CHAP",
	"case":"CASE",
	computerProgram:"COMP",
	conferencePaper:"CONF",
	dictionaryEntry:"DICT",
	encyclopediaArticle:"ENCYC",
	email:"ICOMM",
	film:"MPCT",
	hearing:"HEAR",
	journalArticle:"JOUR",
	letter:"PCOMM",
	magazineArticle:"MGZN",
	manuscript:"MANSCPT",
	map:"MAP",
	newspaperArticle:"NEWS",
	patent:"PAT",
	presentation:"SLIDE",
	report:"RPRT",
	statute:"STAT",
	thesis:"THES",
	videoRecording:"VIDEO",
	webpage:"ELEC"
};

//These export type maps are degenerate
//They will cause loss of information when exported and reimported
//These should either be duplicates of some of the RIS types above
//  or be different from the importTypeMap mappings
var degenerateExportTypeMap = {
	interview:"PCOMM",
	instantMessage:"ICOMM",
	forumPost:"ICOMM",
	tvBroadcast:"MPCT",
	radioBroadcast:"SOUND",
	podcast:"SOUND",
	document:"GEN"	//imported as journalArticle
};

//These are degenerate types that are not exported as the same TY value
//These should not include any types from exportTypeMap
//We add the rest from exportTypeMap
var importTypeMap = {
	ABST:"journalArticle",
	ADVS:"film",
	AGGR:"document",	//how can we handle "database" citations?
	ANCIENT:"document",
	CHART:"artwork",
	CLSWK:"book",
	CPAPER:"conferencePaper",
	CTLG:"magazineArticle",
	DATA:"document",	//dataset
	DBASE:"document",	//database
	EBOOK:"book",
	ECHAP:"bookSection",
	EDBOOK:"book",
	EJOUR:"journalArticle",
	EQUA:"document",	//what's a good way to handle this?
	FIGURE:"artwork",
	GEN:"journalArticle",
	GOVDOC:"report",
	GRNT:"document",
	INPR:"manuscript",
	JFULL:"journalArticle",
	LEGAL:"case",		//is this what they mean?
	MULTI:"videoRecording",	//maybe?
	MUSIC:"audioRecording",
	PAMP:"manuscript",
	SER:"book",
	STAND:"report",
	UNBILL:"manuscript",
	UNPD:"manuscript"
};

//supplement input map with export
var ty;
for(ty in exportTypeMap) {
	importTypeMap[exportTypeMap[ty]] = ty;
}

//merge degenerate export type map into main list
for(ty in degenerateExportTypeMap) {
	exportTypeMap[ty] = degenerateExportTypeMap[ty];
}

/*****************************
 * Tag <-> zotero field maps *
 *****************************/

//used for exporting and importing
//this ensures that we can mostly reimport everything the same way
//(except for item types that do not have unique RIS types)
var fieldMap = {
	//same for all itemTypes
	AB:"abstractNote",
	AN:"archiveLocation",
	DB:"archive",
	DO:"DOI",
	DP:"libraryCatalog",
	IS:"issue",
	J2:"journalAbbreviation",
	KW:"tags",
	LA:"language",
	N1:"notes",
	NV:"numberOfVolumes",
	SE:"section",
	ST:"shortTitle",
	UR:"url",
	Y2:"accessDate",

	//type specific
	//tag => field:itemTypes
	//if itemType not explicitly given, __default field is used
	//	unless itemType is excluded in __exclude
	TI: {
		"__default":"title",
		subject:["email"],
		caseName:["case"],
		nameOfAct:["statute"]
	},
	T2: {
		code:["bill", "statute"],
		bookTitle:["bookSection"],
		blogTitle:["blogPost"],
		conferenceName:["conferencePaper"],
		dictionaryTitle:["dictionaryEntry"],
		encyclopediaTitle:["encyclopediaArticle"],
		committee:["hearing"],
		forumTitle:["forumPost"],
		websiteTitle:["webpage"],
		programTitle:["radioBroadcast", "tvBroadcast"],
		meetingName:["presentation"],
		seriesTitle:["computerProgram", "map", "report"],
		series: ["book"],
		publicationTitle:["journalArticle", "magazineArticle", "newspaperArticle"]
	},
	T3: {
		legislativeBody:["hearing", "bill"],
		series:["bookSection", "conferencePaper"],
		seriesTitle:["audioRecording"]
	},
	//NOT HANDLED: reviewedAuthor, scriptwriter, contributor, guest
	AU: {		"__default":"creators/author",
		"creators/artist":["artwork"],
		"creators/cartographer":["map"],
		"creators/composer":["audioRecording"],
		"creators/director":["film", "radioBroadcast", "tvBroadcast", "videoRecording"],  //this clashes with audioRecording
		"creators/interviewee":["interview"],
		"creators/inventor":["patent"],
		"creators/podcaster":["podcast"],
		"creators/programmer":["computerProgram"]
	},
	A2: {
		"creators/sponsor":["bill"],
		"creators/performer":["audioRecording"],
		"creators/presenter":["presentation"],
		"creators/interviewer":["interview"],
		"creators/editor":["journalArticle", "book", "bookSection", "conferencePaper", "dictionaryEntry", "document", "encyclopediaArticle"],
		"creators/recipient":["email", "instantMessage", "letter"],
		reporter:["case"],
		issuingAuthority:["patent"]
	},
	A3: {
		"creators/cosponsor":["bill"],
		"creators/producer":["film", "tvBroadcast", "videoRecording", "radioBroadcast"],
		"creators/seriesEditor":["book", "bookSection", "conferencePaper", "dictionaryEntry", "encyclopediaArticle", "map", "report"]
	},
	A4: {
		"__default":"creators/translator",
		"creators/counsel":["case"]
	},
	C1: {
		filingDate:["patent"],	//not in spec
		"creators/castMember":["radioBroadcast", "tvBroadcast", "videoRecording"],
		scale:["map"],
		place:["conferencePaper"]
	},
	C2: {
		issueDate:["patent"],		//not in spec
		"creators/bookAuthor":["bookSection"],
		"creators/commenter":["blogPost"]
	},
	C3: {
		artworkSize:["artwork"],
		proceedingsTitle:["conferencePaper"],
		country:["patent"]
	},
	C4: {
		"creators/wordsBy":["audioRecording"],	//not in spec
		"creators/attorneyAgent":["patent"],
		genre:["film"]
	},
	C5: {
		references:["patent"],
		audioRecordingFormat:["audioRecording", "radioBroadcast"],
		videoRecordingFormat:["film", "tvBroadcast", "videoRecording"]
	},
	C6: {
		legalStatus:["patent"],
	},
	CN: {
		"__default":"callNumber",
		docketNumber:["case"]
	},
	CY: {
		"__default":"place",
		"__exclude":["conferencePaper"]		//should be exported as C1
	},
	DA: {
		"__default":"date",
		dateEnacted:["statute"],
		dateDecided:["case"]
	},
	PY: {	//duplicate of DA, but this will only output year
		"__default":"date",
		dateEnacted:["statute"],
		dateDecided:["case"]
	},
	ET: {
		"__default":"edition",
		session:["bill", "hearing", "statute"],
		version:["computerProgram"]
	},
	M1: {
		billNumber:["bill"],
		system:["computerProgram"],
		documentNumber:["hearing"],
		applicationNumber:["patent"],
		publicLawNumber:["statute"],
		episodeNumber:["podcast", "radioBroadcast", "tvBroadcast"]
	},
	M3: {
		manuscriptType:["manuscript"],
		mapType:["map"],
		reportType:["report"],
		thesisType:["thesis"],
		websiteType:["blogPost", "webpage"],
		postType:["forumPost"],
		letterType:["letter"],
		interviewMedium:["interview"],
		presentationType:["presentation"],
		artworkMedium:["artwork"],
		audioFileType:["podcast"],
		programmingLanguage:["computerProgram"]
	},
	OP: {
		history:["hearing", "statute", "bill", "case"],
		priorityNumbers:["patent"]
	},
	PB: {
		"__default":"publisher",
		label:["audioRecording"],
		court:["case"],
		distributor:["film"],
		assignee:["patent"],
		institution:["report"],
		university:["thesis"],
		company:["computerProgram"],
		studio:["videoRecording"],
		network:["radioBroadcast", "tvBroadcast"]
	},
	SN: {
		"__default":"ISBN",
		ISSN:["journalArticle", "magazineArticle", "newspaperArticle"],
		patentNumber:["patent"],
		reportNumber:["report"],
	},
	SP: {
		"__default":"pages",	//needs extra processing
		codePages:["bill"],	//bill
		numPages:["book", "thesis", "manuscript"],	//manuscript not really in spec
		firstPage:["case"]
	},
	VL: {
		"__default":"volume",
		codeNumber:["statute"],
		codeVolume:["bill"],
		reporterVolume:["case"]
	}
};

//non-standard or degenerate field maps
//used ONLY for importing and only if these fields are not specified above (e.g. M3)
//these are not exported the same way
var degenerateImportFieldMap = {
	CT:"title",
	JF:"publicationTitle",
	JA:"journalAbbreviation",
	M3:"DOI",
	ED:"creators/editor"
};

/********************
 * Import Functions *
 ********************/
 
function processTag(item, tag, value) {
	// Drop empty fields
	if (value === undefined || value === null || value == "") return item;	

	if (tag != "N1" && tag != "AB" && value !== undefined
				&& Zotero.Utilities.unescapeHTML) {
		value = Zotero.Utilities.unescapeHTML(value);
	}

	if(importFieldMap[tag]) {
		item[importFieldMap[tag]] = value;
	} else if(tag == "TY") {
		// look for type
		
		// trim the whitespace that some providers (e.g. ProQuest) include
		value = Zotero.Utilities.trim(value);
		
			// check importTypeMap
			if(importTypeMap[value]) {
				item.itemType = importTypeMap[value];
			} else {
				// default to document
				item.itemType = "document";
			}
	} else if(tag == "JO") {
		if (item.itemType == "conferencePaper"){
			item.conferenceName = value;
		} else {
			item.publicationTitle = value;
		}
	} else if(tag == "BT") {
		// ignore, unless this is a book or unpublished work, as per spec
		if(item.itemType == "book" || item.itemType == "manuscript") {
			item.title = value;
		// allow for book sections as well, since it makes sense
		} else if(item.itemType == "bookSection") {
			item.bookTitle = value;
		} else {
			item.backupPublicationTitle = value;
		}
	} else if(tag == "T2") {
		item.backupPublicationTitle = value;
	} else if(tag == "A1" || tag == "AU") {
		// primary author (patent: inventor)
		// store Zotero "creator type" in temporary variable
		var tempType;
		if (item.itemType == "patent") {
			tempType = "inventor";
		} else {
			tempType = "author";
		}
		var names = value.split(/, ?/);
		item.creators.push({lastName:names[0], firstName:names[1], creatorType:tempType});
	} else if(tag == "ED") {
		var names = value.split(/, ?/);
		item.creators.push({lastName:names[0], firstName:names[1], creatorType:"editor"});
	} else if(tag == "A2") {
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
			var names = value.split(/, ?/);
			item.creators.push({lastName:names[0], firstName:names[1], creatorType:"contributor"});
		}
	} else if(tag == "Y1" || tag == "PY") {
		// year or date
		var dateParts = value.split("/");

		if(dateParts.length == 1) {
			// technically, if there's only one date part, the file isn't valid
			// RIS, but EndNote writes this, so we have to too
			// Nick: RIS spec example records also only contain a single part
			// even though it says the slashes are not optional (?)
			item.date = value;
		} else {
			// in the case that we have a year and other data, format that way

			var month = parseInt(dateParts[1]);
			if(month) {
				month--;
			} else {
				month = undefined;
			}

			item.date = Zotero.Utilities.formatDate({year:dateParts[0],
								  month:month,
								  day:dateParts[2],
								  part:dateParts[3]});
		}
	} else if(tag == "Y2") {
		// the secondary date field can mean two things, a secondary date, or an
		// invalid EndNote-style date. let's see which one this is.
		// patent: application (filing) date -- do not append to date field 
		// Secondary dates could be access dates-- they don't need to be appended
		// to the existing date
		var dateParts = value.split("/");
		if(dateParts.length != 4 && item.itemType != "patent") {
			// an invalid date and not a patent. 
			item.accessDate = value;
		} else if (item.itemType == "patent") {
			// Date-handling code copied from above
			if(dateParts.length == 1) {
				// technically, if there's only one date part, the file isn't valid
				// RIS, but EndNote writes this, so we have to too
				// Nick: RIS spec example records also only contain a single part
				// even though it says the slashes are not optional (?)
				item.filingDate = value;
			} else {
				// in the case that we have a year and other data, format that way

				var month = parseInt(dateParts[1]);
				if(month) {
					month--;
				} else {
					month = undefined;
				}

				item.filingDate = Zotero.Utilities.formatDate({year:dateParts[0],
								  month:month,
								  day:dateParts[2],
								  part:dateParts[3]});
			}
		} else {
			// Consensus is that Y2 can be treated as accessDate
			// Date-handling code copied from above
			if(dateParts.length == 1) {
				// technically, if there's only one date part, the file isn't valid
				// RIS, but EndNote writes this, so we have to too
				// Nick: RIS spec example records also only contain a single part
				// even though it says the slashes are not optional (?)
				item.accessDate = value;
			} else {
				// in the case that we have a year and other data, format that way

				var month = parseInt(dateParts[1]);
				if(month) {
					month--;
				} else {
					month = undefined;
				}

				item.accessDate = Zotero.Utilities.formatDate({year:dateParts[0],
								  month:month,
								  day:dateParts[2],
								  part:dateParts[3]});
			}
		} 
		// ToDo: Handle correctly formatted Y2 fields (secondary date)
	} else if(tag == "N1") {
		// notes
		if(value != item.title) {       // why does EndNote do this!?
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
			} else item.notes.push({note:value});
		}
	// The RIS spec insanely claims that AB == N1, but other software seems
	// to overlook or ignore this, so we will too on import
	} else if(tag == "N2" || tag == "AB") {
		// abstract
		if (item.abstractNote) item.abstractNote += "\n" + value;
		else item.abstractNote = value;
	} else if(tag == "KW") {
		// keywords/tags
		
		// technically, treating newlines as new tags breaks the RIS spec, but
		// it's required to work with EndNote
		item.tags = item.tags.concat(value.split("\n"));
	} else if(tag == "SP") {
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
	} else if(tag == "EP") {
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
	} else if(tag == "SN") {
		// ISSN/ISBN - just add both
		// TODO We should be able to tell these apart
		if(!item.ISBN) {
			item.ISBN = value;
		}
		if(!item.ISSN) {
			item.ISSN = value;
		}
	} else if(tag == "UR" || tag == "L1" || tag == "L2" || tag == "L4") {
		// URL
		if(!item.url) {
			item.url = value;
		}
		if(tag == "UR") {
			item.attachments.push({url:value});
		} else if(tag == "L1") {
			item.attachments.push({url:value, mimeType:"application/pdf",
				title:"Full Text (PDF)", downloadable:true});
		} else if(tag == "L2") {
			item.attachments.push({url:value, mimeType:"text/html",
				title:"Full Text (HTML)", downloadable:true});
		} else if(tag == "L4") {
			item.attachments.push({url:value,
				title:"Image", downloadable:true});
		}
	} else if (tag == "IS") {
		// Issue Number (patent: patentNumber)
		if (item.itemType == "patent") {
			item.patentNumber = value;
		} else {
			item.issue = value;
		}
	} else if (tag == "VL") {
		// Volume Number (patent: applicationNumber)
		if (item.itemType == "patent") {
			item.applicationNumber = value;
		// Report Number (report: reportNumber)
		} else if(item.itemType == "report") {
			item.reportNumber = value;
		} else {
			item.volume = value;
		}
	} else if (tag == "PB") {
		// publisher (patent: references)
		if (item.itemType == "patent") {
			item.references = value;
		} else {
			item.publisher = value;
		}
	} else if (tag == "M1" || tag == "M2") {
		// Miscellaneous fields
		if (!item.extra) {
			item.extra = value;
		} else {
			item.extra += "; "+value;
		}
	}
}

function completeItem(item) {
	// if backup publication title exists but not proper, use backup
	// (hack to get newspaper titles from EndNote)
	if(item.backupPublicationTitle) {
		if(!item.publicationTitle) {
			item.publicationTitle = item.backupPublicationTitle;
		}
		item.backupPublicationTitle = undefined;
	}

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

function doImport(attachments) {
	var line = true;
	var tag = data = false;
	do {    // first valid line is type
		line = Zotero.read();
		line = line.replace(/^\s+/, "");
	} while(line !== false && !line.substr(0, 6).match(/^TY {1,2}- /));

	var item = new Zotero.Item();
	var i = 0;
	if(attachments && attachments[i]) {
		item.attachments = attachments[i];
	}

	var tag = "TY";
	
	// Handle out-of-spec old EndNote exports
	if (line.substr(0, 5) == "TY - ") {
		var data = line.substr(5);
	}
	else {
		var data = line.substr(6);
	}
	
	var rawLine;
	while((rawLine = Zotero.read()) !== false) {    // until EOF
		// trim leading space if this line is not part of a note
		line = rawLine.replace(/^\s+/, "");
		// Handle out-of-spec old EndNote exports with one space
		var split = line.match(/^([A-Z0-9]{2}) {1,2}-(?: ([^\n]*))?/);
		if(split) {
			// if this line is a tag, take a look at the previous line to map
			// its tag
			if(tag) {
				//Zotero.debug("tag: '"+tag+"'; data: '"+data+"'");
				processTag(item, tag, data);
			}

			// then fetch the tag and data from this line
			tag = split[1];
			data = split[2];

			if(tag == "ER") {	       // ER signals end of reference
				// unset info
				tag = data = false;
				completeItem(item);
			}
			if(tag == "TY") {
				// new item
				item = new Zotero.Item();
				i++;
				if(attachments && attachments[i]) {
					item.attachments = attachments[i];
				}
			}
		} else {
			// otherwise, assume this is data from the previous line continued
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
		}
	}

	if(tag && tag != "ER") {	// save any unprocessed tags
		//Zotero.debug(tag);
		processTag(item, tag, data);
		completeItem(item);
	}
}

/********************
 * Export Functions *
 ********************/

//RIS files have a certain structure, which is often meaningful
//Records always start with TY and ER. This is hardcoded below
var exportOrder = {
	"__default": ["TI", "AU", "T2", "A2", "T3", "A3", "A4", "AB",	"C1", "C2", "C3",
		"C4", "C5",	"C6", "CN", "CY", "DA", "PY", "DO", "DP", "ET", "VL", "IS", "SP",
		"J2", "LA", "M1", "M3", "NV", "OP", "PB", "SE", "SN", "ST", "UR", "AN", "DB",
		"Y2", "N1", "KW"],
	//in bill sponsor (A2) and cosponsor (A3) should be together and not split by legislativeBody (T3)
	"bill": ["TI", "AU", "T2", "A2", "A3", "T3", "A4", "AB",	"C1", "C2", "C3",
		"C4", "C5",	"C6", "CN", "CY", "DA", "PY", "DO", "DP", "ET", "VL", "IS", "SP",
		"J2", "LA", "M1", "M3", "NV", "OP", "PB", "SE", "SN", "ST", "UR", "AN", "DB",
		"Y2", "N1", "KW"]
};

var newLineChar = "\r\n";		//from spec

//get item fields to export for a given tag
//cache previous requests so that this is much faster if multiple items are exported
function getExportFields(itemType, tag) {
	if(!getExportFields.cache[itemType]) getExportFields.cache[itemType] = {};

	//retrieve from cache if available
	if(getExportFields.cache[itemType][tag]) {
		return getExportFields.cache[itemType][tag];
	}

	var fields = [];
	if(typeof(fieldMap[tag]) == 'object') {
		var def, exclude = false;
		for(var f in fieldMap[tag]) {
			if(f == "__default") {
				def = fieldMap[tag][f];
				continue;
			}
			if(f == "__exclude") {
				if(fieldMap[tag][f].indexOf(itemType) != -1) {
					exclude = true;
				}
				continue;
			}
	
			if(fieldMap[tag][f].indexOf(itemType) != -1) {
				fields.push(f);
			}
		}

		if(!fields.length && def && !exclude) fields.push(def);
	} else if(typeof(fieldMap[tag]) == 'string') {
		fields.push(fieldMap[tag];
	}

	getExportFields.cache[itemType][tag] = fields;

	return fields;
}
getExportFields.cache = {};

function addTag(tag, value) {
	if((!value && value !== 0 && value !== "0")
	  || (typeof(value) == 'string' && value.trim()==='')) return;

	if(typeof(value) == 'object') {
		for(var i=0, n=value.length; i<n; i++) {
			if((!value[i] && value[i] !== 0 && value[i] !== "0")
	      || (typeof(value[i]) == 'string' && value[i].trim()==='')) continue;

			Zotero.write(tag + "  - " + value[i] + newLineChar);
		}
	} else {
		Zotero.write(tag + "  - " + value + newLineChar);
	}
}

function doExport() {
	var item, order, tag, fields, field, value;

	while(item = Zotero.nextItem()) {
		// can't store independent notes in RIS
		if(item.itemType == "note" || item.itemType == "attachment") {
			continue;
		}

		// type
		addTag("TY", exportTypeMap[item.itemType] || "GEN");

		order = exportOrder[item.itemType] || exportOrder["__default"];
		for(var i=0, n=order.length; i<n; i++) {
			tag = order[i];
			//find the appropriate field to export for this item type
			fields = getExportFields(item.itemType, tag);

			//if we didn't get anything, we don't need to export this tag for this item type
			if(!fields.length) continue;

			for(var k=0, p=fields.length; k<p; k++) {
	      value = undefined;
  			//we can define fields that are nested (i.e. creators) using slashes
  			field = fields[k].split(/\//);
  
  			//handle special cases based on item field
  			switch(field[0]) {
  				case "creators":
  					//according to spec, one author per line in the "Lastname, Firstname, Suffix" format
  					//Zotero does not store suffixes in a separate field
  					value = [];
  					var name;
  					for(var j=0, m=item.creators.length; j<m; j++) {
  					  name = [];
  						if(item.creators[j].creatorType == field[1]) {
  							name.push(item.creators[j].lastName);
  							if(item.creators[j].firstName) name.push(item.creators[j].firstName);
  							value.push(name.join(', '));
  						}
  					}
  					if(!value.length) value = undefined;
  				break;
  				case "notes":
  					value = item.notes.map(function(n) { return n.note.replace(/(?:\r\n?|\n)/g, "\r\n"); });
  				break;
  				case "tags":
  				  value = item.tags.map(function(t) { return t.tag; });
  				break;
  				case "pages":
  					if(tag == "SP" && item.pages) {
  						var m = item.pages.trim().match(/(.+?)[\u002D\u00AD\u2010-\u2015\u2212\u2E3A\u2E3B\s]+(.+)/);
  						if(m) {
  							addTag(tag, m[1]);
  							tag = "EP";
  							value = m[2];
  						}
  					}
  				break;
  				default:
  					value = item[field];
  			}
  
  			//handle special cases based on RIS tag
  			switch(tag) {
  				case "PY":
  					var date = ZU.strToDate(item[field]);
  					if(!date.year) continue;
  					value = ('000' + date.year).substr(-4); //since this is in export, this should not be a problem with MS JavaScript implementation of substr
  				break;
  				case "Y2":
  				case "DA":
  					var date = ZU.strToDate(item[field]);
  					if(!date.year) continue;
  					date.year = ('000' + date.year).substr(-4);
  					date.month = (date.month || date.month===0 || date.month==="0")?('0' + (date.month+1)).substr(-2):'';
  					date.day = date.day?('0' + date.day).substr(-2):'';
  					if(!date.part) date.part = '';
  
  					value = date.year + '/' + date.month + '/' + date.day + '/'; //+ date.part;   //part is probably a mess of day of the week and time
  				break;
  			}
  
  			addTag(tag, value);
  		}
		}

		Zotero.write("ER  - ," + newLineChar + newLineChar);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "TY  - JOUR\nA1  - Baldwin,S.A.\nA1  - Fugaccia,I.\nA1  - Brown,D.R.\nA1  - Brown,L.V.\nA1  - Scheff,S.W.\nT1  - Blood-brain barrier breach following\ncortical contusion in the rat\nJO  - J.Neurosurg.\nY1  - 1996\nVL  - 85\nSP  - 476\nEP  - 481\nRP  - Not In File\nKW  - cortical contusion\nKW  - blood-brain barrier\nKW  - horseradish peroxidase\nKW  - head trauma\nKW  - hippocampus\nKW  - rat\nN2  - Adult Fisher 344 rats were subjected to a unilateral impact to the dorsal cortex above the hippocampus at 3.5 m/sec with a 2 mm cortical depression. This caused severe cortical damage and neuronal loss in hippocampus subfields CA1, CA3 and hilus. Breakdown of the blood-brain barrier (BBB) was assessed by injecting the protein horseradish peroxidase (HRP) 5 minutes prior to or at various times following injury (5 minutes, 1, 2, 6, 12 hours, 1, 2, 5, and 10 days). Animals were killed 1 hour after HRP injection and brain sections were reacted with diaminobenzidine to visualize extravascular accumulation of the protein. Maximum staining occurred in animals injected with HRP 5 minutes prior to or 5 minutes after cortical contusion. Staining at these time points was observed in the ipsilateral hippocampus. Some modest staining occurred in the dorsal contralateral cortex near the superior sagittal sinus. Cortical HRP stain gradually decreased at increasing time intervals postinjury. By 10 days, no HRP stain was observed in any area of the brain. In the ipsilateral hippocampus, HRP stain was absent by 3 hours postinjury and remained so at the 6- and 12- hour time points. Surprisingly, HRP stain was again observed in the ipsilateral hippocampus 1 and 2 days following cortical contusion, indicating a biphasic opening of the BBB following head trauma and a possible second wave of secondary brain damage days after the contusion injury. These data indicate regions not initially destroyed by cortical impact, but evidencing BBB breach, may be accessible to neurotrophic factors administered intravenously both immediately and days after brain trauma.\nER  - ",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Baldwin",
						"firstName": "S.A.",
						"creatorType": "author"
					},
					{
						"lastName": "Fugaccia",
						"firstName": "I.",
						"creatorType": "author"
					},
					{
						"lastName": "Brown",
						"firstName": "D.R.",
						"creatorType": "author"
					},
					{
						"lastName": "Brown",
						"firstName": "L.V.",
						"creatorType": "author"
					},
					{
						"lastName": "Scheff",
						"firstName": "S.W.",
						"creatorType": "author"
					}
				],
				"notes": [],
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
				"title": "Blood-brain barrier breach following cortical contusion in the rat",
				"publicationTitle": "J.Neurosurg.",
				"date": "1996",
				"volume": "85",
				"pages": "476-481",
				"abstractNote": "Adult Fisher 344 rats were subjected to a unilateral impact to the dorsal cortex above the hippocampus at 3.5 m/sec with a 2 mm cortical depression. This caused severe cortical damage and neuronal loss in hippocampus subfields CA1, CA3 and hilus. Breakdown of the blood-brain barrier (BBB) was assessed by injecting the protein horseradish peroxidase (HRP) 5 minutes prior to or at various times following injury (5 minutes, 1, 2, 6, 12 hours, 1, 2, 5, and 10 days). Animals were killed 1 hour after HRP injection and brain sections were reacted with diaminobenzidine to visualize extravascular accumulation of the protein. Maximum staining occurred in animals injected with HRP 5 minutes prior to or 5 minutes after cortical contusion. Staining at these time points was observed in the ipsilateral hippocampus. Some modest staining occurred in the dorsal contralateral cortex near the superior sagittal sinus. Cortical HRP stain gradually decreased at increasing time intervals postinjury. By 10 days, no HRP stain was observed in any area of the brain. In the ipsilateral hippocampus, HRP stain was absent by 3 hours postinjury and remained so at the 6- and 12- hour time points. Surprisingly, HRP stain was again observed in the ipsilateral hippocampus 1 and 2 days following cortical contusion, indicating a biphasic opening of the BBB following head trauma and a possible second wave of secondary brain damage days after the contusion injury. These data indicate regions not initially destroyed by cortical impact, but evidencing BBB breach, may be accessible to neurotrophic factors administered intravenously both immediately and days after brain trauma."
			}
		]
	},
	{
		"type": "import",
		"input": "TY  - PAT\nA1  - Burger,D.R.\nA1  - Goldstein,A.S.\nT1  - Method of detecting AIDS virus infection\nY1  - 1990/2/27\nVL  - 877609\nIS  - 4,904,581\nRP  - Not In File\nA2  - Epitope,I.\nCY  - OR\nPB  - 4,629,783\nKW  - AIDS\nKW  - virus\nKW  - infection\nKW  - antigens\nY2  - 1986/6/23\nM1  - G01N 33/569 G01N 33/577\nM2  - 435/5 424/3 424/7.1 435/7 435/29 435/32 435/70.21 435/240.27 435/172.2 530/387 530/808 530/809 935/110\nN2  - A method is disclosed for detecting the presence of HTLV III infected cells in a medium. The method comprises contacting the medium with monoclonal antibodies against an antigen produced as a result of the infection and detecting the binding of the antibodies to the antigen. The antigen may be a gene product of the HTLV III virus or may be bound to such gene product. On the other hand the antigen may not be a viral gene product but may be produced as a result of the infection and may further be bound to a lymphocyte. The medium may be a human body fluid or a culture medium. A particular embodiment of the present method involves a method for determining the presence of a AIDS virus in a person. The method comprises combining a sample of a body fluid from the person with a monoclonal antibody that binds to an antigen produced as a result of the infection and detecting the binding of the monoclonal antibody to the antigen. The presence of the binding indicates the presence of a AIDS virus infection. Also disclosed are novel monoclonal antibodies, noval compositions of matter, and novel diagnostic kits\nER  - ",
		"items": [
			{
				"itemType": "patent",
				"creators": [
					{
						"lastName": "Burger",
						"firstName": "D.R.",
						"creatorType": "inventor"
					},
					{
						"lastName": "Goldstein",
						"firstName": "A.S.",
						"creatorType": "inventor"
					}
				],
				"notes": [],
				"tags": [
					"AIDS",
					"virus",
					"infection",
					"antigens"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Method of detecting AIDS virus infection",
				"date": "February 27, 1990",
				"applicationNumber": "877609",
				"patentNumber": "4,904,581",
				"assignee": "Epitope,I.",
				"place": "OR",
				"references": "4,629,783",
				"filingDate": "June 23, 1986",
				"extra": "G01N 33/569 G01N 33/577; 435/5 424/3 424/7.1 435/7 435/29 435/32 435/70.21 435/240.27 435/172.2 530/387 530/808 530/809 935/110",
				"abstractNote": "A method is disclosed for detecting the presence of HTLV III infected cells in a medium. The method comprises contacting the medium with monoclonal antibodies against an antigen produced as a result of the infection and detecting the binding of the antibodies to the antigen. The antigen may be a gene product of the HTLV III virus or may be bound to such gene product. On the other hand the antigen may not be a viral gene product but may be produced as a result of the infection and may further be bound to a lymphocyte. The medium may be a human body fluid or a culture medium. A particular embodiment of the present method involves a method for determining the presence of a AIDS virus in a person. The method comprises combining a sample of a body fluid from the person with a monoclonal antibody that binds to an antigen produced as a result of the infection and detecting the binding of the monoclonal antibody to the antigen. The presence of the binding indicates the presence of a AIDS virus infection. Also disclosed are novel monoclonal antibodies, noval compositions of matter, and novel diagnostic kits"
			}
		]
	}
]
/** END TEST CASES **/
