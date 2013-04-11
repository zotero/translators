{
	"translatorID": "32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7",
	"label": "RIS",
	"creator": "Simon Kornblith and Aurimas Vinckevicius",
	"target": "ris",
	"minVersion": "3.0.4",
	"maxVersion": "",
	"priority": 100,
	"displayOptions": {
		"exportCharset": "UTF-8",
		"exportNotes": true,
		"exportFileData": false
	},
	"inRepository": true,
	"translatorType": 3,
	"browserSupport": "gcsv",
	"lastUpdated": "2013-04-05 21:36:25"
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

/********************
 * Exported options *
 ********************/
 //exported as translatorObject.options
 var exportedOptions = {
	itemType: false //allows translators to supply item type
};


/************************
 * TY <-> itemType maps *
 ************************/

var DEFAULT_EXPORT_TYPE = 'GEN';
var DEFAULT_IMPORT_TYPE = 'journalArticle';

var exportTypeMap = {
	artwork:"ART",
	audioRecording:"SOUND", //consider MUSIC
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
	document:"GEN" //imported as journalArticle
};

//These are degenerate types that are not exported as the same TY value
//These should not include any types from exportTypeMap
//We add the rest from exportTypeMap
var importTypeMap = {
	ABST:"journalArticle",
	ADVS:"film",
	AGGR:"document", //how can we handle "database" citations?
	ANCIENT:"document",
	CHART:"artwork",
	CLSWK:"book",
	CPAPER:"conferencePaper",
	CTLG:"magazineArticle",
	DATA:"document", //dataset
	DBASE:"document", //database
	EBOOK:"book",
	ECHAP:"bookSection",
	EDBOOK:"book",
	EJOUR:"journalArticle",
	EQUA:"document", //what's a good way to handle this?
	FIGURE:"artwork",
	GEN:"journalArticle",
	GOVDOC:"report",
	GRNT:"document",
	INPR:"manuscript",
	JFULL:"journalArticle",
	LEGAL:"case", //is this what they mean?
	MULTI:"videoRecording", //maybe?
	MUSIC:"audioRecording",
	PAMP:"manuscript",
	SER:"book",
	STAND:"report",
	UNBILL:"manuscript",
	UNPD:"manuscript",
	WEB:"webpage"	//not in spec, but used by EndNote
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
//(except for item types that do not have unique RIS types, see above)
var fieldMap = {
	//same for all itemTypes
	AB:"abstractNote",
	AN:"archiveLocation",
	CN:"callNumber",
	DB:"archive",
	DO:"DOI",
	DP:"libraryCatalog",
	IS:"issue",
	J2:"journalAbbreviation",
	KW:"tags",
	L1:"attachments/PDF",
	L2:"attachments/HTML",
	L4:"attachments/other",
	N1:"notes",
	NV:"numberOfVolumes",
	ST:"shortTitle",
	UR:"url",
	Y2:"accessDate",
//	ID:"__ignore",

	//type specific
	//tag => field:itemTypes
	//if itemType not explicitly given, __default field is used
	//  unless itemType is excluded in __exclude
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
	AU: {
		"__default":"creators/author",
		"creators/artist":["artwork"],
		"creators/cartographer":["map"],
		"creators/composer":["audioRecording"],
		"creators/director":["film", "radioBroadcast", "tvBroadcast", "videoRecording"], //this clashes with audioRecording
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
		"creators/editor":["journalArticle", "bookSection", "conferencePaper", "dictionaryEntry", "document", "encyclopediaArticle"],
		"creators/seriesEditor":["book"],
		"creators/recipient":["email", "instantMessage", "letter"],
		reporter:["case"],
		issuingAuthority:["patent"]
	},
	A3: {
		"creators/cosponsor":["bill"],
		"creators/producer":["film", "tvBroadcast", "videoRecording", "radioBroadcast"],
		"creators/editor":["book"],
		"creators/seriesEditor":["bookSection", "conferencePaper", "dictionaryEntry", "encyclopediaArticle", "map", "report"]
	},
	A4: {
		"__default":"creators/translator",
		"creators/counsel":["case"],
		"creators/contributor":["conferencePaper", "film"]	//translator does not fit these
	},
	C1: {
		filingDate:["patent"], //not in spec
		"creators/castMember":["radioBroadcast", "tvBroadcast", "videoRecording"],
		scale:["map"],
		place:["conferencePaper"]
	},
	C2: {
		issueDate:["patent"], //not in spec
		"creators/bookAuthor":["bookSection"],
		"creators/commenter":["blogPost"]
	},
	C3: {
		artworkSize:["artwork"],
		proceedingsTitle:["conferencePaper"],
		country:["patent"]
	},
	C4: {
		"creators/wordsBy":["audioRecording"], //not in spec
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
	CY: {
		"__default":"place",
		"__exclude":["conferencePaper"] //should be exported as C1
	},
	DA: { //also see PY when editing
		"__default":"date",
		dateEnacted:["statute"],
		dateDecided:["case"],
		issueDate:["patent"]
	},
	ET: {
		"__default":"edition",
//		"__ignore":["journalArticle"], //EPubDate
		session:["bill", "hearing", "statute"],
		version:["computerProgram"]
	},
	LA: {
		"__default":"language",
		programmingLanguage: ["computerProgram"]
	},
	M1: {
		billNumber:["bill"],
		system:["computerProgram"],
		documentNumber:["hearing"],
		applicationNumber:["patent"],
		publicLawNumber:["statute"],
		episodeNumber:["podcast", "radioBroadcast", "tvBroadcast"],
		"__exclude": ["webpage"]
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
		audioFileType:["podcast"]
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
	PY: { //duplicate of DA, but this will only output year
		"__default":"date",
		dateEnacted:["statute"],
		dateDecided:["case"],
		issueDate:["patent"]
	},
	SE: {
		"__default": "section",	//though this can refer to pages, start page, etc. for some types. Zotero does not support any of those combinations, however.
		"__exclude": ["case"]
	},
	SN: {
		"__default":"ISBN",
		ISSN:["journalArticle", "magazineArticle", "newspaperArticle"],
		patentNumber:["patent"],
		reportNumber:["report"],
	},
	SP: {
		"__default":"pages", //needs extra processing
		codePages:["bill"], //bill
		numPages:["book", "thesis", "manuscript"], //manuscript not really in spec
		firstPage:["case"],
		runningTime:["film"]
	},
	SV: {
		docketNumber: ["case"]	//not in spec. EndNote exports this way
	},
	VL: {
		"__default":"volume",
		codeNumber:["statute"],
		codeVolume:["bill"],
		reporterVolume:["case"],
		"__exclude":["patent", "webpage"]
	}
};

//non-standard or degenerate field maps
//used ONLY for importing and only if these fields are not specified above (e.g. M3)
//these are not exported the same way
var degenerateImportFieldMap = {
	A1: fieldMap["AU"],
	AD: {
		"__default": "unsupported/Author Address",
		"unsupported/Inventor Address": ["patent"]
	},
	BT: {
		title: ["book", "manuscript"],
		bookTitle: ["bookSection"],
		"__default": "backupPublicationTitle" //we do more filtering on this later
	},
	CA: "unsupported/Caption",
	CR: "rights",
	CT: "title",
	ED: "creators/editor",
	EP: "pages",
	JA: "journalAbbreviation",
	JF: "publicationTitle",
	JO: {
		"__default": "journalAbbreviation",
		conferenceName: ["conferencePaper"]
	},
	LB: "unsupported/Label",
	M1: {
		"__default":"extra",
		numberOfVolumes: ["bookSection"],	//EndNote exports here instead of IS
		accessDate: ["webpage"]		//this is access date when coming from EndNote
	},
	M2: "extra", //not in spec
	M3: "DOI",
	N2: "abstractNote",
	OP: {
		"__default": "unsupported/Original Publication",
		"unsupported/Content": ["blogPost", "computerProgram", "film", "presentation", "report", "videoRecording", "webpage"]
	},
	RI: {
		"__default":"unsupported/Reviewed Item",
		"unsupported/Article Number": ["statute"]
	},
	RN: "unsupported/Research Notes",
	SE: {
		"unsupported/File Date": ["case"]
	},
	T1: fieldMap["TI"],
	T2: "backupPublicationTitle", //most item types should be covered above
	T3: {
		series: ["book"]
	},
	TA: "unsupported/Translated Author",
	TT: "unsupported/Translated Title",
	VL: {
		"unsupported/Patent Version Number":['patent'],
		accessDate: ["webpage"]	//technically access year according to EndNote
	},
	Y1: fieldMap["PY"]
};

//generic tag mapping object with caching
//not intended to be used directly
var TagMapper = function(mapList) {
	this.cache = {};
	this.mapList = mapList;
};

TagMapper.prototype.getFields = function(itemType, tag) {
	if(!this.cache[itemType]) this.cache[itemType] = {};

	//retrieve from cache if available
	if(this.cache[itemType][tag]) {
		return this.cache[itemType][tag];
	}

	var fields = [];
	for(var i=0, n=this.mapList.length; i<n; i++) {
		var map = this.mapList[i];
		var field;
		if(typeof(map[tag]) == 'object') {
			var def, exclude = false;
			for(var f in map[tag]) {
				if(f == "__default") {
					def = map[tag][f];
					continue;
				}

				if(f == "__exclude") {
					if(map[tag][f].indexOf(itemType) != -1) {
						exclude = true;
					}
					continue;
				}

				if(map[tag][f].indexOf(itemType) != -1) {
					field = f;
				}
			}

			if(!field && def && !exclude) field = def;
		} else if(typeof(map[tag]) == 'string') {
			field = map[tag];
		}

		if(field) fields.push(field);
	}

	this.cache[itemType][tag] = fields;

	return fields;
};

/********************
 * Import Functions *
 ********************/

//set up import field mapping
var importFields = new TagMapper([fieldMap, degenerateImportFieldMap]);

function processTag(item, entry) {
	var tag = entry[1];
	var value = entry[2].trim();
	var rawLine = entry[0];

	var zField = importFields.getFields(item.itemType, tag)[0];
	if(!zField) {
		Z.debug("Unknown field " + tag + " in entry :\n" + rawLine);
		zField = 'unknown'; //this will result in the value being added as note
	}

	//drop empty fields
	if (value === "" || !zField) return;

	zField = zField.split('/');

	if (tag != "N1" && tag != "AB") {
		value = Zotero.Utilities.unescapeHTML(value);
	}

	//tag based manipulations
	var processFields = true; //whether we should continue processing by zField
	switch(tag) {
		case "N1":
			//seems that EndNote duplicates title in the note field sometimes
			if(item.title == value) {
				value = undefined;
				processFields = false;
			//do some HTML formatting in non-HTML notes
			} else if(!value.match(/<[^>]+>/)) { //from cleanTags
				value = '<p>'
					+ value.replace(/\n\n/g, '</p><p>')
					 .replace(/\n/g, '<br/>')
					 .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
					 .replace(/  /g, '&nbsp;&nbsp;')
					+ '</p>';
			}
		break;
		case "EP":
			if(item.pages) {
				if(item.pages.indexOf('-') == -1) {
					item.pages = item.pages + '-' + value;
				} else {
					item.backupNumPages = value;
				}
				value = undefined;
			} else {
				item.backupEndPage = value;	//store this for an odd case where SP comes after EP
				value = undefined;
			}
		break;
		case "M1":
			//Endnote exports access date for webpages to M1
			//It makes much more sense to export to Y2
			//We should make sure that M1 does not overwrite whatever may be in Y2
			if(zField == "accessDate") {
				item.backupAccessDate = {
					field: zField,
					value: dateRIStoZotero(value, zField)
				}
				value = undefined;
				processFields = false;
			}
		break;
		case "VL":
			if(zField == "accessDate") {
				//EndNote screws up webpage entries. VL is access year, but access date is available
				if(!item.backupAccessDate) {	//make sure we don't replace the M1 data
					item.backupAccessDate = {
						field: zField,
						value: dateRIStoZotero(value, zField)
					};
				}
				value = undefined;
				processFields = false;
			}
		break;
		//PY is typically less complete than other dates. We'll store it as backup
		case "PY":
			item.backupDate = {
				field: zField,
				value: dateRIStoZotero(value, zField)
			};
			value = undefined;
			processFields = false;
		break;
	}

	//zField based manipulations
	if(processFields){
		switch(zField[0]) {
			case "__ignore":
				value = undefined;
			break;
			case "backupPublicationTitle":
				item.backupPublicationTitle = value;
				value = undefined;
			break;
			case "creators":
				var creator = value.split(/\s*,\s*/);
				value = {lastName: creator[0], firstName:creator[1], creatorType:zField[1]};
				if(value.firstName === undefined) {	//corporate
					delete value.firstName;
					value.fieldMode = 1;
				}
			break;
			case "date":
			case "accessDate":
			case "filingDate":
			case "issueDate":
			case "dateEnacted":
			case "dateDecided":
				value = dateRIStoZotero(value, zField);
			break;
			case "tags":
				//allow new lines or semicolons. Commas, might be more problematic
				value = value.split(/\s*(?:[\r\n]+\s*)+|\s*(?:;\s*)+/);

				//the regex will take care of double semicolons and newlines
				//but it will still allow a blank tag if there is a newline or
				//semicolon at the begining or the end
				if(!value[0]) value.shift();
				if(value.length && !value[value.length-1]) value.pop();

				if(!value.length) {
					value = undefined;
				}
			break;
			case "notes":
				value = {note:value};
				//we can specify note title in the field mapping table
				if(zField[1]) {
					value.note = zField[1] + ': ' + value.note;
				}
			break;
			case "attachments":
				switch(zField[1]) {
					case 'PDF':
						value = {
							url: value.replace(/^internal-pdf:\/\//i,'PDF/'),	//support for EndNote's relative paths
							mimeType: "application/pdf",
							title:"Full Text (PDF)",
							downloadable:true
						};
					break;
					case 'HTML':
						value = {
							url: value,
							mimeType: "text/html",
							title: "Full Text (HTML)",
							downloadable:true
						};
					break;
					default:
						value = {
							url:value,
							title:"Attachment",
							downloadable:true
						};
				}
			break;
			case "unsupported":	//unsupported fields
				//we can convert a RIS tag to something more useful though
				if(zField[1]) {
					value = zField[1] + ': ' + value;
				}
			break;
		}
	}

	applyValue(item, zField[0], value, rawLine);
}

function applyValue(item, zField, value, rawLine) {
	if(!value) return;

	if(!zField || zField == 'unknown') {
		if(!Zotero.parentTranslator) {
			Z.debug("Entry stored in note: " + rawLine);
			item.unknownFields.push(rawLine);
		}
		return;
	}

	if(zField == 'unsupported') {
		if(!Zotero.parentTranslator) {
			Z.debug("Unsupported field will be stored in note: " + value);
			item.unsupportedFields.push(value);
		}
		return;
	}

	//check if field is valid for item type
	if(!Zotero.parentTranslator //cannot use this in connectors, plus we drop notes in most cases anyway
		&& zField != 'creators' && zField != 'tags'
		&& zField != 'notes' && zField != 'attachments'
		&& !ZU.fieldIsValidForType(zField, item.itemType)) {
		Z.debug("Invalid field '" + zField + "' for item type '" + item.itemType + "'.");
		if(!Zotero.parentTranslator) {
			Z.debug("Entry stored in note: " + rawLine);
			item.unknownFields.push(rawLine);
			return;
		}
		//otherwise, we can still store them and they will get dropped automatically
	}

	//special processing for certain fields
	switch(zField) {
		case 'notes':
		case 'attachments':
		case 'creators':
		case 'tags':
			if(!(value instanceof Array)) {
				value = [value];
			}
			item[zField] = item[zField].concat(value);
		break;
		case 'extra':
			if(item.extra) {
				item.extra += '; ' + value;
			} else {
				item.extra = value;
			}
		break;
		default:
			//check if value already exists. Don't overwrite existing values
			if(item[zField]) {
				//if the new value is not the same as existing value, store it as note
				if(!Zotero.parentTranslator && item[zField] != value) {
					item.unsupportedFields.push(zField + ': ' + value);
				}
			} else {
				item[zField] = value;
			}
	}
}

function dateRIStoZotero(risDate, zField) {
	var date = [];
	//we'll be very lenient about formatting
	//First, YYYY/MM/DD/other with everything but year optional
	var m = risDate.match(/^(\d+)(?:\/(\d{0,2})\/(\d{0,2})(?:\/?(.*))?)?/);
	var timeCheck, part;
	if(m) {
		date[0] = m[1];	//year
		date[1] = m[2];	//month
		date[2] = m[3]; //day
		timeCheck = m[4];
		part = m[4];
	} else {
		//EndNote suggests entering only Month and Day in the date field
		//We'll return this, but also add 0000 as a placeholder for year
		//This will come from PY at some point and we'll let Zotero figure out the date
		//This will NOT work with access date, but there's only so much we can do
		var y = risDate.match(/\b\d{4}\b/);
		var d = risDate.match(/\b(?:[1-3]\d|[1-9])\b/);
		m = risDate.match(/[A-Za-z]+/);
		if(!y && m) {
			return '0000 ' + m[0] + (d ? ' ' + d[0] : '');
		}

		//TODO: add more formats
		return risDate;
	}

	//sometimes unknown parts of date are given as 0. Drop these and anything that follows
	for(var i=0; i<3; i++) {
		if(date[i] !== undefined) date[i] = date[i].replace(/^0+/,'');	//drop leading 0s

		if(!date[i]) {
			date.splice(i);
			break;
		}
	}

	if(zField == "accessDate") {	//format this as SQL date
		if(!date[0]) return risDate;	//this should never happed

		//adjust month to be 0 based
		if(date[1]) {
			date[1] = parseInt(date[1], 10);
			if(date[1]) date[1] = '' + (date[1] - 1);	//make it a string again to keep things simpler
			else date[1] = '0';	//the regex above should ensure this never happens. We don't even test the day
		}

		//make sure we have a month and day
		if(!date[1]) date[1] = '0';	//0 based months
		if(!date[2]) date[2] = '1';

		var time;
		if(timeCheck) {
			time = timeCheck.match(/\b([0-2]?[1-9]):(\d{2})(?::(\d{2}))\s*(am|pm)?/i);
			if(time) {
				if(!time[3]) time[3] = '0';

				if(time[4]) {
					var hour = parseInt(time[1],10);	//this should not fail
					if(time[4].toLowerCase() == 'pm' && hour < 12) {
						time[1] = '' + (hour + 12);
					} else if(time[4].toLowerCase() == 'am' && hour == 12) {
						time[1] = '0';
					}
				}
			}
		}

		//assume this is local time and convert it to UTC
		var d = new Date();
		/** We intentionally avoid passing parameters in the constructor,
		 * because it interprets dates with 2 digits or less as 1900+ dates.
		 * This is clearly not a problem with accessDate, but maybe this will
		 * end up being used for something else later.
		 */
		d.setFullYear(date[0], date[1], date[2]);
		if(time) {
			d.setHours(time[1], time[2], time[3]);
		}

		var pad = function(n, width) {
			n = '000' + n;	//that should be sufficient for our purposes here
			return n.substr(n.length-width);
		}

		var sqlDate

		return pad(d.getUTCFullYear(), 4) + '-' + pad(d.getUTCMonth() + 1, 2)
			+ '-' + pad(d.getUTCDate(), 2)
			+ (time ? ' '	+ pad(d.getUTCHours(), 2) + ':'
							+ pad(d.getUTCMinutes(), 2) + ':'
							+ pad(d.getUTCSeconds(), 2)
					: '');
	} else {
		//adjust month (it's 0 based)
		if(date[1]) {
			date[1] = parseInt(date[1], 10);
			if(date[1]) date[1]--;
		}

		return ZU.formatDate({
				'year': date[0],
				'month': date[1],
				'day': date[2]
			});
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

	if(item.backupNumPages) {
		if(!item.numPages) {
			item.numPages = item.backupNumPages;
		}
		item.backupNumPages = undefined;
	}

	if(item.backupEndPage) {
		if(!item.pages) {
			item.pages = item.backupEndPage;
		} else if(item.pages.indexOf('-') == -1) {
			item.pages += '-' + item.backupEndPage;
		} else if(!item.numPages) {	//should we do this?
			item.numPages = item.backupEndPage;
		}
		item.backupEndPage = undefined;
	}

	//see if we have a backup date
	if(item.backupDate) {
		if(!item[item.backupDate.field]) {
			item[item.backupDate.field] = item.backupDate.value;
		} else {
			item[item.backupDate.field] = item[item.backupDate.field]
				.replace(/\b0000\b/, item.backupDate.value);
		}
		item.backupDate = undefined;
	}

	//same for access date
	if(item.backupAccessDate) {
		if(!item[item.backupAccessDate.field]) {
			item[item.backupAccessDate.field] = item.backupAccessDate.value;
		}
		item.backupAccessDate = undefined;
	}

	// Clean up DOI
	if(item.DOI) {
		item.DOI = ZU.cleanDOI(item.DOI);
	}

	// hack for sites like Nature, which only use JA, journal abbreviation
	if(item.journalAbbreviation && !item.publicationTitle){
		item.publicationTitle = item.journalAbbreviation;
	}

	// Hack for Endnote exports missing full title
	if(item.shortTitle && !item.title){
		item.title = item.shortTitle;
	}

	//if we only have one tag, try splitting it by comma
	//odds of this this backfiring are pretty low
	if(item.tags.length == 1) {
		item.tags = item.tags[0].split(/\s*(?:,\s*)+/);
		if(!item.tags[0]) item.tags.shift();
		if(item.tags.length && !item.tags[item.tags.length-1]) item.tags.pop();
	}

	//don't pass access date if this is called from (most likely) a web translator
	if(Zotero.parentTranslator) {
		item.accessDate = undefined;
	}

	//store unsupported and unknown fields in a single note
	if(!Zotero.parentTranslator) {
		var note = '';
		for(var i=0, n=item.unsupportedFields.length; i<n; i++) {
			note += item.unsupportedFields[i] + '<br/>';
		}
		for(var i=0, n=item.unknownFields.length; i<n; i++) {
			note += item.unknownFields[i] + '<br/>';
		}
	
		if(note) {
			note = "The following values have no corresponding Zotero field:<br/>" + note;
			item.notes.push({note: note.trim(), tags: ['_RIS import']});
		}
	}
	item.unsupportedFields = undefined;
	item.unknownFields = undefined;

	item.complete();
}

//get the next RIS entry that matches the RIS format
//returns an array in the format [raw "line", tag, value]
//lines may be combined into one entry
var RIS_format = /^([A-Z][A-Z0-9]) {1,2}-(?: (.*))?$/; //allow empty entries
function getLine() {
	var entry, lastLineLength;
	if(getLine.buffer) {
		entry = getLine.buffer.match(RIS_format); //this should always match
		if(entry[2] === undefined) entry[2] = '';
		lastLineLength = entry[2].length;
		getLine.buffer = undefined;
	}

	var nextLine, temp;
	while((nextLine = Zotero.read()) !== false) {
		temp = nextLine.match(RIS_format);
		if(temp && temp[2] === undefined) temp[2] = '';
		//if we are already processing an entry, then this is the next entry
		//store this line for later and return
		if(temp && entry) {
			getLine.buffer = temp[0];
			return entry;

		//otherwise this is a new entry
		} else if(temp) {
			entry = temp;
			lastLineLength = entry[2].length;

		//if this line didn't match, then we just attach it to the current value
		//Try to figure out if this is supposed to be on a new line or not
		} else if(entry) {
			//new lines would probably only be meaningful in notes and abstracts
			if(entry[1] == 'AB' || entry[1] == 'N1' || entry[1] == 'N2') {
				//if previous line was short, this would probably be on a new line
				//Might consider looking for periods and capital letters
				if(lastLineLength < 60) {
					nextLine = "\r\n" + nextLine;
				}
			}

			//don't remove new lines from keywords
			if(entry[1] == 'KW') {
				nextLine = "\r\n" + nextLine;
			}

			//check if we need to add a space
			if(entry[2].substr(entry[2].length-1) != ' ') {
				nextLine = ' ' + nextLine;
			}

			entry[0] += nextLine;
			entry[2] += nextLine;
		}
	}

	return entry;
}

//creates a new item of specified type
function getNewItem(type) {
	var item = new Zotero.Item(type);
	item.unknownFields = [];
	item.unsupportedFields = [];
	return item;
}

function doImport(attachments) {
	var entry;
	//skip to the first TY entry
	do {
		entry = getLine();
	} while(entry && entry[1] != 'TY');

	var item;
	var i = -1; //item counter for attachments
	while(entry) {
		switch(entry[1]) {
			//new item
			case 'TY':
				if(item) completeItem(item);
				var type = exportedOptions.itemType || importTypeMap[entry[2].trim().toUpperCase()];
				if(!type) {
					type = DEFAULT_IMPORT_TYPE;
					Z.debug("Unknown RIS item type: " + entry[2] + ". Defaulting to " + type);
				}
				var item = getNewItem(type);
				//add attachments
				i++;
				if(attachments && attachments[i]) {
					item.attachments = attachments[i];
				}
			break;
			case 'ER':
				if(item) completeItem(item);
				item = undefined;
			break;
			default:
				processTag(item, entry);
		}
		entry = getLine();
	}

	//complete last item if ER is missing
	if(item) completeItem(item);
}

/********************
 * Export Functions *
 ********************/

//RIS files have a certain structure, which is often meaningful
//Records always start with TY and end with ER. This is hardcoded below
var exportOrder = {
	"__default": ["TI", "AU", "T2", "A2", "T3", "A3", "A4", "AB", "C1", "C2", "C3",
	"C4", "C5", "C6", "CN", "CY", "DA", "PY", "DO", "DP", "ET", "VL", "IS", "SP",
	"J2", "LA", "M1", "M3", "NV", "OP", "PB", "SE", "SN", "ST", "SV", "UR", "AN",
	"DB", "Y2", "L1", "L2", "L4", "N1", "KW"],
	//in bill sponsor (A2) and cosponsor (A3) should be together and not split by legislativeBody (T3)
	"bill": ["TI", "AU", "T2", "A2", "A3", "T3", "A4", "AB", "C1", "C2", "C3",
	"C4", "C5", "C6", "CN", "CY", "DA", "PY", "DO", "DP", "ET", "VL", "IS", "SP",
	"J2", "LA", "M1", "M3", "NV", "OP", "PB", "SE", "SN", "ST", "SV", "UR", "AN",
	"DB", "Y2", "L1", "L2", "L4", "N1", "KW"]
};

var newLineChar = "\r\n"; //from spec

//set up export field mapping
var exportFields = new TagMapper([fieldMap]);

function addTag(tag, value) {
	if(!(value instanceof Array)) value = [value];

	for(var i=0, n=value.length; i<n; i++) {
		if(value[i] === undefined) return;
		//don't export empty strings
		var v = (value[i] + '').trim();
		if(!v) continue;

		Zotero.write(tag + "  - " + v + newLineChar);
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
		var type = exportTypeMap[item.itemType];
		if(!type) {
			type = DEFAULT_EXPORT_TYPE;
			Z.debug("Unknown item type: " + item.itemType + ". Defaulting to " + type);
		}
		addTag("TY", type);

		//before we begin, pre-sort attachments based on type
		var attachments = {
			PDF: [],
			HTML: [],
			other: []
		};

		for(var i=0, n=item.attachments.length; i<n; i++) {
			switch(item.attachments[i].mimeType) {
				case 'application/pdf':
					attachments.PDF.push(item.attachments[i]);
				break;
				case 'text/html':
					attachments.HTML.push(item.attachments[i]);
				break;
				default:
					attachments.other.push(item.attachments[i]);
			}
		}

		order = exportOrder[item.itemType] || exportOrder["__default"];
		for(var i=0, n=order.length; i<n; i++) {
			tag = order[i];
			//find the appropriate field to export for this item type
			field = exportFields.getFields(item.itemType, tag)[0];

			//if we didn't get anything, we don't need to export this tag for this item type
			if(!field) continue;

			value = undefined;
			//we can define fields that are nested (i.e. creators) using slashes
			field = field.split('/');

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
				case "attachments":
					value = [];
					var att = attachments[field[1]];
					for(var j=0, m=att.length; j<m; j++) {
						if(att[j].saveFile) {	//local file
							value.push(att[j].defaultPath);
							att[j].saveFile(att[j].defaultPath);
						} else {	//link to remote file
							value.push(att[j].url);
						}
					}
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
					if(date.year) {
						value = ('000' + date.year).substr(-4); //since this is in export, this should not be a problem with MS JavaScript implementation of substr
					} else {
						value = item[field];
					} 
				break;
				case "Y2":
				case "DA":
					var date = ZU.strToDate(item[field]);
					if(date.year) {
						date.year = ('000' + date.year).substr(-4);
						date.month = (date.month || date.month===0 || date.month==="0")?('0' + (date.month+1)).substr(-2):'';
						date.day = date.day?('0' + date.day).substr(-2):'';
						if(!date.part) date.part = '';
	
						value = date.year + '/' + date.month + '/' + date.day + '/' + date.part;
					} else {
						value = item[field];
					}
				break;
			}

			addTag(tag, value);
		}

		Zotero.write("ER  - " + newLineChar + newLineChar);
	}
}

var exports = {
	"doExport": doExport,
	"doImport": doImport,
	"options": exportedOptions
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
				"notes": [
					{
						"note": "The following values have no corresponding Zotero field:<br/>RP  - Not In File<br/>",
						"tags": [
							"_RIS import"
						]
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
				"title": "Blood-brain barrier breach following cortical contusion in the rat",
				"journalAbbreviation": "J.Neurosurg.",
				"date": "1996",
				"volume": "85",
				"pages": "476-481",
				"abstractNote": "Adult Fisher 344 rats were subjected to a unilateral impact to the dorsal cortex above the hippocampus at 3.5 m/sec with a 2 mm cortical depression. This caused severe cortical damage and neuronal loss in hippocampus subfields CA1, CA3 and hilus. Breakdown of the blood-brain barrier (BBB) was assessed by injecting the protein horseradish peroxidase (HRP) 5 minutes prior to or at various times following injury (5 minutes, 1, 2, 6, 12 hours, 1, 2, 5, and 10 days). Animals were killed 1 hour after HRP injection and brain sections were reacted with diaminobenzidine to visualize extravascular accumulation of the protein. Maximum staining occurred in animals injected with HRP 5 minutes prior to or 5 minutes after cortical contusion. Staining at these time points was observed in the ipsilateral hippocampus. Some modest staining occurred in the dorsal contralateral cortex near the superior sagittal sinus. Cortical HRP stain gradually decreased at increasing time intervals postinjury. By 10 days, no HRP stain was observed in any area of the brain. In the ipsilateral hippocampus, HRP stain was absent by 3 hours postinjury and remained so at the 6- and 12- hour time points. Surprisingly, HRP stain was again observed in the ipsilateral hippocampus 1 and 2 days following cortical contusion, indicating a biphasic opening of the BBB following head trauma and a possible second wave of secondary brain damage days after the contusion injury. These data indicate regions not initially destroyed by cortical impact, but evidencing BBB breach, may be accessible to neurotrophic factors administered intravenously both immediately and days after brain trauma.",
				"publicationTitle": "J.Neurosurg."
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
				"notes": [
					{
						"note": "The following values have no corresponding Zotero field:<br/>Patent Version Number: 877609<br/>IS  - 4,904,581<br/>RP  - Not In File<br/>",
						"tags": [
							"_RIS import"
						]
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
				"title": "Method of detecting AIDS virus infection",
				"issueDate": "February 27, 1990",
				"issuingAuthority": "Epitope,I.",
				"place": "OR",
				"assignee": "4,629,783",
				"accessDate": "1986-06-23",
				"applicationNumber": "G01N 33/569 G01N 33/577",
				"extra": "435/5 424/3 424/7.1 435/7 435/29 435/32 435/70.21 435/240.27 435/172.2 530/387 530/808 530/809 935/110",
				"abstractNote": "A method is disclosed for detecting the presence of HTLV III infected cells in a medium. The method comprises contacting the medium with monoclonal antibodies against an antigen produced as a result of the infection and detecting the binding of the antibodies to the antigen. The antigen may be a gene product of the HTLV III virus or may be bound to such gene product. On the other hand the antigen may not be a viral gene product but may be produced as a result of the infection and may further be bound to a lymphocyte. The medium may be a human body fluid or a culture medium. A particular embodiment of the present method involves a method for determining the presence of a AIDS virus in a person. The method comprises combining a sample of a body fluid from the person with a monoclonal antibody that binds to an antigen produced as a result of the infection and detecting the binding of the monoclonal antibody to the antigen. The presence of the binding indicates the presence of a AIDS virus infection. Also disclosed are novel monoclonal antibodies, noval compositions of matter, and novel diagnostic kits"
			}
		]
	},
	{
		"type": "import",
		"input": "TY  - AGGR\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nCA  - Caption\nCY  - Place Published\nDA  - Date Accessed\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Date Published\nJ2  - Periodical Title\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Publication Number\nM3  - Type of Work\nN1  - Notes\nOP  - Original Publication\nPB  - Publisher\nPY  - Year\nRN  - ResearchNotes\nSE  - Screens\nSN  - ISSN/ISBN\nSP  - Pages\nST  - Short Title\nT2  - Periodical\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nID  - 2\nER  - \n\n\nTY  - ANCIENT\nA2  - Editor\nA4  - Translator\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nCN  - Call Number\nCA  - Caption\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nJ2  - Abbreviated Publication\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Text Number\nM3  - Type of Work\nN1  - Notes\nNV  - Number of Volumes\nOP  - Original Publication\nPB  - Publisher\nPY  - Year\nRI  - Reviewed Item\nRN  - ResearchNotes\nRP  - Reprint Edition\nSN  - ISBN\nSP  - Pages\nST  - Short Title\nT2  - Publication Title\nT3  - Volume Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nY2  - Access Date\nID  - 3\nER  - \n\n\nTY  - ART\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Artist\nC3  - Size/Length\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDP  - Database Provider\nDO  - DOI\nET  - Edition\nJ2  - Periodical Title\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Size\nM3  - Type of Work\nN1  - Notes\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nSP  - Description\nST  - Short Title\nTI  - Title\nTT  - Translated Title\nTA  - Author, Translated\nUR  - URL\nY2  - Access Date\nID  - 4\nER  - \n\n\nTY  - ADVS\nA2  - Performers\nA3  - Editor, Series\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nC1  - Cast\nC2  - Credits\nC3  - Size/Length\nC5  - Format\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nJ2  - Periodical Title\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Number\nM3  - Type\nN1  - Notes\nNV  - Extent of Work\nOP  - Contents\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nSN  - ISBN\nST  - Short Title\nT3  - Series Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nY2  - Access Date\nID  - 5\nER  - \n\n\nTY  - BILL\nA2  - Sponsor\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nCA  - Caption\nCN  - Call Number\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Session\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nN1  - Notes\nM1  - Bill Number\nOP  - History\nPY  - Year\nRN  - Research Notes\nSE  - Code Section\nSP  - Code Pages\nST  - Short Title\nT2  - Code\nT3  - Legislative Body\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Code Volume\nY2  - Access Date\nID  - 6\nER  - \n\n\nTY  - BLOG\nA2  - Editor\nA3  - Illustrator\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nC1  - Author Affiliation\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Last Update Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nJ2  - Periodical Title\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM3  - Type of Medium\nN1  - Notes\nOP  - Contents\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nSE  - Message Number\nSN  - ISBN\nSP  - Description\nST  - Short Title\nT2  - Title of WebLog\nT3  - Institution\nTA  - Author, Translated\nTI  - Title of Entry\nTT  - Translated Title\nUR  - URL\nVL  - Access Year\nY2  - Number\nID  - 7\nER  - \n\n\nTY  - BOOK\nA2  - Editor, Series\nA3  - Editor\nA4  - Translator\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nC3  - Title Prefix\nC4  - Reviewer\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nJ2  - Abbreviation\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Series Volume\nM3  - Type of Work\nN1  - Notes\nNV  - Number of Volumes\nOP  - Original Publication\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nRP  - Reprint Edition\nSE  - Pages\nSN  - ISBN\nSP  - Number of Pages\nST  - Short Title\nT2  - Series Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nY2  - Access Date\nID  - 8\nER  - \n\n\nTY  - CHAP\nA2  - Editor\nA3  - Editor, Series\nA4  - Translator\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nC1  - Section\nC3  - Title Prefix\nC4  - Reviewer\nC5  - Packaging Method\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nJ2  - Abbreviation\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Number of Volumes\nOP  - Original Publication\nN1  - Notes\nPB  - Publisher\nPY  - Year\nRI  - Reviewed Item\nRN  - Research Notes\nRP  - Reprint Edition\nSE  - Chapter\nSN  - ISBN\nSP  - Pages\nST  - Short Title\nSV  - Series Volume\nT2  - Book Title\nT3  - Series Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nY2  - Access Date\nID  - 9\nER  - \n\n\nTY  - CASE\nA2  - Reporter\nA3  - Court, Higher\nA4  - Counsel\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nCA  - Caption\nCN  - Call Number\nDA  - Date Accessed\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Action of Higher Court\nJ2  - Parallel Citation\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM3  - Citation of Reversal\nN1  - Notes\nNV  - Reporter Abbreviation\nOP  - History\nPB  - Court\nPY  - Year Decided\nRN  - ResearchNotes\nSE  - Filed Date\nSP  - First Page\nST  - Abbreviated Case Name\nSV  - Docket Number\nT3  - Decision\nTA  - Author, Translated\nTI  - Case Name\nTT  - Translated Title\nUR  - URL\nVL  - Reporter Volume\nID  - 10\nER  - \n\n\nTY  - CTLG\nA2  - Institution\nA4  - Translator\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nC5  - Packaging Method\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nJ2  - Abbreviation\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Series Volume\nM3  - Type of Work\nN1  - Notes\nNV  - Catalog Number\nOP  - Original Publication\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nRP  - Reprint Edition\nSE  - Number of Pages\nSN  - ISBN\nSP  - Pages\nST  - Short Title\nT2  - Series Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nY2  - Access Date\nID  - 11\nER  - \n\n\nTY  - CHART\nA2  - File, Name of\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - By, Created\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Version\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Number\nM3  - Type of Image\nN1  - Notes\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nSP  - Description\nT2  - Image Source Program\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Image Size\nY2  - Access Date\nID  - 12\nER  - \n\n\nTY  - CLSWK\nA2  - Editor, Series\nA4  - Translator\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Attribution\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nJ2  - Periodical Title\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Series Volume\nM3  - Type\nN1  - Notes\nNV  - Number of Volumes\nOP  - Original Publication\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nRP  - Reprint Edition\nSN  - ISSN/ISBN\nSP  - Number of Pages\nST  - Short Title\nT2  - Series Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nY2  - Access Date\nID  - 23\nER  - \n\n\nTY  - COMP\nA2  - Editor, Series\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Programmer\nC1  - Computer\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Version\nJ2  - Periodical Title\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM3  - Type\nN1  - Notes\nOP  - Contents\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nSN  - ISBN\nSP  - Description\nST  - Short Title\nT2  - Series Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Edition\nY2  - Access Date\nID  - 14\nER  - \n\n\nTY  - CPAPER\nA2  - Editor\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nC1  - Place Published\nCA  - Caption\nCY  - Conference Location\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Issue\nM3  - Type\nN1  - Notes\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nSP  - Pages\nT2  - Conference Name\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nY2  - Access Date\nID  - 15\nER  - \n\n\nTY  - CONF\nA2  - Editor\nA3  - Editor, Series\nA4  - Sponsor\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nC1  - Place Published\nC2  - Year Published\nC3  - Proceedings Title\nC5  - Packaging Method\nCA  - Caption\nCN  - Call Number\nCY  - Conference Location\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Issue\nN1  - Notes\nNV  - Number of Volumes\nOP  - Source\nPB  - Publisher\nPY  - Year of Conference\nRN  - Research Notes\nSN  - ISBN\nSP  - Pages\nST  - Short Title\nT2  - Conference Name\nT3  - Series Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nY2  - Access Date\nID  - 16\nER  - \n\n\nTY  - DATA\nA2  - Producer\nA4  - Agency, Funding\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Investigators\nC1  - Time Period\nC2  - Unit of Observation\nC3  - Data Type\nC4  - Dataset(s)\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date of Collection\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Version\nJ2  - Abbreviation\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nN1  - Notes\nNV  - Study Number\nOP  - Version History\nPB  - Distributor\nPY  - Year\nRI  - Geographic Coverage\nRN  - Research Notes\nSE  - Original Release Date\nSN  - ISSN\nST  - Short Title\nT3  - Series Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nY2  - Access Date\nID  - 17\nER  - \n\n\nTY  - DICT\nA2  - Editor\nA4  - Translator\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nC1  - Term\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nJ2  - Abbreviation\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Number\nM3  - Type of Work\nN1  - Notes\nNV  - Number of Volumes\nOP  - Original Publication\nPB  - Publisher\nPY  - Year\nRI  - Reviewed Item\nRN  - Research Notes\nRP  - Reprint Edition\nSE  - Version\nSN  - ISBN\nSP  - Pages\nST  - Short Title\nT2  - Dictionary Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nY2  - Access Date\nID  - 13\nER  - \n\n\nTY  - EDBOOK\nA2  - Editor, Series\nA4  - Translator\nAB  - Abstract\nAD  - Editor Address\nAN  - Accession Number\nAU  - Editor\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nJ2  - Periodical Title\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Series Volume\nM3  - Type of Work\nN1  - Notes\nNV  - Number of Volumes\nOP  - Original Publication\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nRP  - Reprint Edition\nSN  - ISBN\nSP  - Number of Pages\nST  - Short Title\nT2  - Series Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nY2  - Access Date\nID  - 19\nER  - \n\n\nTY  - EJOUR\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nC1  - Year Cited\nC2  - Date Cited\nC3  - PMCID\nC4  - Reviewer\nC5  - Issue Title\nC6  - NIHMSID\nC7  - Article Number\nCA  - Caption\nCY  - Place Published\nDA  - Date Accessed\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nJ2  - Periodical Title\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Issue\nM3  - Type of Work\nN1  - Notes\nNV  - Document Number\nPB  - Publisher\nPY  - Year\nRI  - Reviewed Item\nRN  - Research Notes\nRP  - Reprint Edition\nSE  - E-Pub Date\nSN  - ISSN\nSP  - Pages\nST  - Short Title\nT2  - Periodical Title\nT3  - Website Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nID  - 20\nER  - \n\n\nTY  - EBOOK\nA2  - Editor\nA3  - Editor, Series\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nC1  - Year Cited\nC2  - Date Cited\nC3  - Title Prefix\nC4  - Reviewer\nC5  - Last Update Date\nC6  - NIHMSID\nC7  - PMCID\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date Accessed\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM3  - Type of Medium\nN1  - Notes\nNV  - Version\nOP  - Original Publication\nPB  - Publisher\nPY  - Year\nRI  - Reviewed Item\nRN  - Research Notes\nRP  - Reprint Edition\nSN  - ISBN\nSP  - Number of Pages\nT2  - Secondary Title\nT3  - Series Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nID  - 21\nER  - \n\n\nTY  - ECHAP\nA2  - Editor\nA3  - Editor, Series\nA4  - Translator\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nC1  - Section\nC3  - Title Prefix\nC4  - Reviewer\nC5  - Packaging Method\nC6  - NIHMSID\nC7  - PMCID\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Series Volume\nM3  - Type of Work\nN1  - Notes\nNV  - Number of Volumes\nOP  - Original Publication\nPB  - Publisher\nPY  - Year\nRI  - Reviewed Item\nRN  - Research Notes\nRP  - Reprint Edition\nSN  - ISSN/ISBN\nSP  - Number of Pages\nST  - Short Title\nT2  - Book Title\nT3  - Series Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nY2  - Access Date\nID  - 22\nER  - \n\n\nTY  - ENCYC\nA2  - Editor\nA4  - Translator\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nC1  - Term\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nJ2  - Abbreviation\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nN1  - Notes\nNV  - Number of Volumes\nOP  - Original Publication\nPB  - Publisher\nPY  - Year\nRI  - Reviewed Item\nRN  - Research Notes\nRP  - Reprint Edition\nSN  - ISBN\nSP  - Pages\nST  - Short Title\nT2  - Encyclopedia Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nY2  - Access Date\nID  - 18\nER  - \n\n\nTY  - EQUA\nA2  - File, Name of\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - By, Created\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Version\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Number\nM3  - Type of Image\nN1  - Notes\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nSP  - Description\nT2  - Image Source Program\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Image Size\nY2  - Access Date\nID  - 24\nER  - \n\n\nTY  - FIGURE\nA2  - File, Name of\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - By, Created\nCN  - Call Number\nCA  - Caption\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Version\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Number\nM3  - Type of Image\nN1  - Notes\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nSP  - Description\nT2  - Image Source Program\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Image Size\nY2  - Access Date\nID  - 25\nER  - \n\n\nTY  - MPCT\nA2  - Director, Series\nA3  - Producer\nA4  - Performers\nAB  - Synopsis\nAD  - Author Address\nAN  - Accession Number\nAU  - Director\nC1  - Cast\nC2  - Credits\nC4  - Genre\nC5  - Format\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date Released\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nJ2  - Periodical Title\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM3  - Medium\nN1  - Notes\nPB  - Distributor\nPY  - Year Released\nRN  - Research Notes\nRP  - Reprint Edition\nSP  - Running Time\nST  - Short Title\nT2  - Series Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nY2  - Access Date\nID  - 26\nER  - \n\n\nTY  - GEN\nA2  - Author, Secondary\nA3  - Author, Tertiary\nA4  - Author, Subsidiary\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nC1  - Custom 1\nC2  - Custom 2\nC3  - Custom 3\nC4  - Custom 4\nC5  - Custom 5\nC6  - Custom 6\nC7  - Custom 7\nC8  - Custom 8\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nJ2  - Periodical Title\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Number\nM3  - Type of Work\nN1  - Notes\nNV  - Number of Volumes\nOP  - Original Publication\nPB  - Publisher\nPY  - Year\nRI  - Reviewed Item\nRN  - Research Notes\nRP  - Reprint Edition\nSE  - Section\nSN  - ISSN/ISBN\nSP  - Pages\nST  - Short Title\nT2  - Secondary Title\nT3  - Tertiary Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nY2  - Access Date\nID  - 27\nER  - \n\n\nTY  - GOVDOC\nA2  - Department\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nC1  - Government Body\nC2  - Congress Number\nC3  - Congress Session\nCA  - Caption\nCY  - Place Published\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Number\nN1  - Notes\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nSE  - Section\nSN  - ISSN/ISBN\nSP  - Pages\nT3  - Series Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nY2  - Access Date\nID  - 28\nER  - \n\n\nTY  - GRANT\nA4  - Translator\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Investigators\nC1  - Contact Name\nC2  - Contact Address\nC3  - Contact Phone\nC4  - Contact Fax\nC5  - Funding Number\nC6  - CFDA Number\nCA  - Caption\nCN  - Call Number\nCY  - Activity Location\nDA  - Deadline\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Requirements\nJ2  - Periodical Title\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Status\nM3  - Funding Type\nN1  - Notes\nNV  - Amount Received\nOP  - Original Grant Number\nPB  - Sponsoring Agency\nPY  - Year\nRI  - Reviewed Item\nRN  - Research Notes\nRP  - Review Date\nSE  - Duration of Grant\nSP  - Pages\nST  - Short Title\nTA  - Author, Translated\nTI  - Title of Grant\nTT  - Translated Title\nUR  - URL\nVL  - Amount Requested\nY2  - Access Date\nID  - 29\nER  - \n\n\nTY  - HEAR\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nC2  - Congress Number\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Session\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Document Number\nN1  - Notes\nNV  - Number of Volumes\nOP  - History\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nSN  - ISBN\nSP  - Pages\nST  - Short Title\nT2  - Committee\nT3  - Legislative Body\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nY2  - Access Date\nID  - 30\nER  - \n\n\nTY  - JOUR\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nC1  - Legal Note\nC2  - PMCID\nC6  - NIHMSID\nC7  - Article Number\nCA  - Caption\nCN  - Call Number\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Epub Date\nJ2  - Periodical Title\nLA  - Language\nLB  - Label\nIS  - Issue\nM3  - Type of Article\nOP  - Original Publication\nPY  - Year\nRI  - Reviewed Item\nRN  - Research Notes\nRP  - Reprint Edition\nSE  - Start Page\nSN  - ISSN\nSP  - Pages\nST  - Short Title\nT2  - Journal\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nY2  - Access Date\nID  - 31\nER  - \n\n\nTY  - LEGAL\nA2  - Organization, Issuing\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date of Code Edition\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nJ2  - Periodical Title\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Start Page\nM3  - Type of Work\nN1  - Notes\nNV  - Session Number\nOP  - History\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nSE  - Section Number\nSN  - ISSN/ISBN\nSP  - Pages\nT2  - Title Number\nT3  - Supplement No.\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Rule Number\nY2  - Access Date\nID  - 32\nER  - \n\n\nTY  - MGZN\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nJ2  - Periodical Title\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Issue Number\nM3  - Type of Article\nN1  - Notes\nNV  - Frequency\nOP  - Original Publication\nPB  - Publisher\nPY  - Year\nRI  - Reviewed Item\nRN  - Research Notes\nRP  - Reprint Edition\nSE  - Start Page\nSN  - ISSN\nSP  - Pages\nST  - Short Title\nT2  - Magazine\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nY2  - Access Date\nID  - 33\nER  - \n\n\nTY  - MANSCPT\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Description of Material\nJ2  - Periodical Title\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Folio Number\nM3  - Type of Work\nN1  - Notes\nNV  - Manuscript Number\nPB  - Library/Archive\nPY  - Year\nRN  - Research Notes\nRP  - Reprint Edition\nSE  - Start Page\nSP  - Pages\nST  - Short Title\nT2  - Collection Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume/Storage Container\nY2  - Access Date\nID  - 34\nER  - \n\n\nTY  - MAP\nA2  - Editor, Series\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Cartographer\nC1  - Scale\nC2  - Area\nC3  - Size\nC5  - Packaging Method\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nJ2  - Periodical Title\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM3  - Type\nN1  - Notes\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nRP  - Reprint Edition\nSN  - ISSN/ISBN\nSP  - Description\nST  - Short Title\nT2  - Series Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nY2  - Access Date\nID  - 35\nER  - \n\n\nTY  - MUSIC\nA2  - Editor\nA3  - Editor, Series\nA4  - Producer\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Composer\nC1  - Format of Music\nC2  - Form of Composition\nC3  - Music Parts\nC4  - Target Audience\nC5  - Accompanying Matter\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM3  - Form of Item\nN1  - Notes\nNV  - Number of Volumes\nOP  - Original Publication\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nRP  - Reprint Edition\nSE  - Section\nSN  - ISBN\nSP  - Pages\nST  - Short Title\nT2  - Album Title\nT3  - Series Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nY2  - Access Date\nID  - 36\nER  - \n\n\nTY  - NEWS\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Reporter\nC1  - Column\nC2  - Issue\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Issue Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  -  Edition\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Start Page\nM3  - Type of Article\nN1  - Notes\nNV  - Frequency\nOP  - Original Publication\nPB  - Publisher\nPY  - Year\nRI  - Reviewed Item\nRN  - Research Notes\nRP  - Reprint Edition\nSE  - Section\nSN  - ISSN\nSP  - Pages\nST  - Short Title\nT2  - Newspaper\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nY2  - Access Date\nID  - 37\nER  - \n\n\nTY  - DBASE\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nCA  - Caption\nCY  - Place Published\nDA  - Date Accessed\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Date Published\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM3  - Type of Work\nN1  - Notes\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nSN  - Report Number\nSP  - Pages\nT2  - Periodical\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nID  - 38\nER  - \n\n\nTY  - MULTI\nA2  - Editor, Series\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - By, Created\nC1  - Year Cited\nC2  - Date Cited\nC5  - Format/Length\nCA  - Caption\nDA  - Date Accessed\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Number of Screens\nM3  - Type of Work\nN1  - Notes\nPB  - Distributor\nPY  - Year\nRN  - Research Notes\nT2  - Series Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nID  - 39\nER  - \n\n\nTY  - PAMP\nA2  - Institution\nA4  - Translator\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nC5  - Packaging Method\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nJ2  - Abbreviation\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Series Volume\nM3  - Type of Work\nN1  - Notes\nOP  - Original Publication\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nRP  - Reprint Edition\nM2  - Number of Pages\nSN  - ISBN\nSP  - Pages\nST  - Short Title\nT2  - Published Source\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Number\nY2  - Access Date\nID  - 40\nER  - \n\n\nTY  - PAT\nA2  - Organization, Issuing\nA3  - International Author\nAB  - Abstract\nAD  - Inventor Address\nAN  - Accession Number\nAU  - Inventor\nC2  - Issue Date\nC3  - Designated States\nC4  - Attorney/Agent\nC5  - References\nC6  - Legal Status\nCA  - Caption\nCN  - Call Number\nCY  - Country\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - International Patent Classification\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Application Number\nM3  - Patent Type\nN1  - Notes\nNV  - US Patent Classification\nOP  - Priority Numbers\nPB  - Assignee\nPY  - Year\nRN  - Research Notes\nSE  - International Patent Number\nSN  - Patent Number\nSP  - Pages\nST  - Short Title\nT2  - Published Source\nT3  - Title, International\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Patent Version Number\nY2  - Access Date\nID  - 41\nER  - \n\n\nTY  - PCOMM\nA2  - Recipient\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nC1  - Senders E-Mail\nC2  - Recipients E-Mail\nCN  - Call Number\nCA  - Caption\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Description\nJ2  - Abbreviation\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Folio Number\nM3  - Type\nN1  - Notes\nNV  - Communication Number\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nSP  - Pages\nST  - Short Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nY2  - Access Date\nID  - 42\nER  - \n\n\nTY  - RPRT\nA2  - Editor, Series\nA3  - Publisher\nA4  - Department/Division\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nC6  - Issue\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nJ2  - Periodical Title\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Document Number\nM3  - Type\nN1  - Notes\nNV  - Series Volume\nOP  - Contents\nPB  - Institution\nPY  - Year\nRN  - Research Notes\nRP  - Notes\nSN  - Report Number\nSP  - Pages\nST  - Short Title\nTA  - Author, Translated\nT2  - Series Title\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nY2  - Access Date\nID  - 43\nER  - \n\n\nTY  - SER\nA2  - Editor\nA3  - Editor, Series\nA4  - Editor, Volume\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nC1  - Section\nC2  - Report Number\nC5  - Packaging Method\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nJ2  - Abbreviation\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Series Volume\nM3  - Type of Work\nN1  - Notes\nNV  - Number of Volumes\nOP  - Original Publication\nPB  - Publisher\nPY  - Year\nRI  - Reviewed Item\nRN  - Research Notes\nRP  - Reprint Edition\nSE  - Chapter\nSN  - ISBN\nSP  - Pages\nST  - Short Title\nT2  - Secondary Title\nT3  - Series Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Volume\nY2  - Access Date\nID  - 44\nER  - \n\n\nTY  - STAND\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Institution\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nJ2  - Abbreviation\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Start Page\nM3  - Type of Work\nN1  - Notes\nNV  - Session Number\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nSE  - Section Number\nSN  - Document Number\nSP  - Pages\nT2  - Section Title\nT3  - Paper Number\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Rule Number\nY2  - Access Date\nID  - 45\nER  - \n\n\nTY  - STAT\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nC5  - Publisher\nC6  - Volume\nCA  - Caption\nCN  - Call Number\nCY  - Country\nDA  - Date Enacted\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Session\nJ2  - Abbreviation\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Public Law Number\nN1  - Notes\nNV  - Statute Number\nOP  - History\nPB  - Source\nPY  - Year\nRI  - Article Number\nRN  - Research Notes\nSE  - Sections\nSP  - Pages\nST  - Short Title\nT2  - Code\nT3  - International Source\nTA  - Author, Translated\nTI  - Name of Act\nTT  - Translated Title\nUR  - URL\nVL  - Code Number\nY2  - Access Date\nID  - 46\nER  - \n\n\nTY  - THES\nA3  - Advisor\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Document Number\nM3  - Thesis Type\nN1  - Notes\nPB  - University\nPY  - Year\nRN  - Research Notes\nSP  - Number of Pages\nST  - Short Title\nT2  - Academic Department\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Degree\nY2  - Access Date\nID  - 47\nER  - \n\n\nTY  - UNPB\nA2  - Editor, Series\nAB  - Abstract\nAD  - Author Address\nAU  - Name1, Author\nAU  - Name2, Author\nCA  - Caption\nCY  - Place Published\nDA  - Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nJ2  - Abbreviation\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Number\nM3  - Type of Work\nN1  - Notes\nPB  - Institution\nPY  - Year\nRN  - Research Notes\nSP  - Pages\nST  - Short Title\nT2  - Series Title\nT3  - Department\nTA  - Author, Translated\nTI  - Title of Work\nTT  - Translated Title\nUR  - URL\nY2  - Access Date\nID  - 48\nER  - \n\n\nTY  - WEB\nA2  - Editor, Series\nAB  - Abstract\nAD  - Author Address\nAN  - Accession Number\nAU  - Name1, Author\nAU  - Name2, Author\nC1  - Year Cited\nC2  - Date Cited\nCA  - Caption\nCN  - Call Number\nCY  - Place Published\nDA  - Last Update Date\nDB  - Name of Database\nDO  - DOI\nDP  - Database Provider\nET  - Edition\nJ2  - Periodical Title\nKW  - Keyword1, Keyword2, Keyword3\nKeyword4; Keyword5\nLA  - Language\nLB  - Label\nM1  - Access Date\nM3  - Type of Medium\nN1  - Notes\nOP  - Contents\nPB  - Publisher\nPY  - Year\nRN  - Research Notes\nSN  - ISBN\nSP  - Description\nST  - Short Title\nT2  - Series Title\nTA  - Author, Translated\nTI  - Title\nTT  - Translated Title\nUR  - URL\nVL  - Access Year\nID  - 49\nER  - \n\n\n",
		"items": [
			{
				"itemType": "document",
				"creators": [
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Original Publication: Original Publication<br/>Research Notes: ResearchNotes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>CY  - Place Published<br/>DO  - DOI<br/>ET  - Date Published<br/>J2  - Periodical Title<br/>M3  - Type of Work<br/>SE  - Screens<br/>SN  - ISSN/ISBN<br/>SP  - Pages<br/>VL  - Volume<br/>ID  - 2<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"extra": "Publication Number",
				"publisher": "Publisher",
				"shortTitle": "Short Title",
				"title": "Title",
				"url": "URL",
				"publicationTitle": "Periodical"
			},
			{
				"itemType": "document",
				"creators": [
					{
						"lastName": "Editor",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Translator",
						"creatorType": "translator",
						"fieldMode": 1
					},
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Original Publication: Original Publication<br/>Reviewed Item: Reviewed Item<br/>Research Notes: ResearchNotes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>CY  - Place Published<br/>DO  - DOI<br/>ET  - Edition<br/>J2  - Abbreviated Publication<br/>M3  - Type of Work<br/>NV  - Number of Volumes<br/>RP  - Reprint Edition<br/>SN  - ISBN<br/>SP  - Pages<br/>T3  - Volume Title<br/>VL  - Volume<br/>ID  - 3<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"extra": "Text Number",
				"publisher": "Publisher",
				"shortTitle": "Short Title",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access",
				"publicationTitle": "Publication Title"
			},
			{
				"itemType": "artwork",
				"creators": [
					{
						"lastName": "Artist",
						"creatorType": "artist",
						"fieldMode": 1
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Research Notes: Research Notes<br/>Translated Title: Translated Title<br/>Translated Author: Author, Translated<br/>CY  - Place Published<br/>DO  - DOI<br/>ET  - Edition<br/>J2  - Periodical Title<br/>PB  - Publisher<br/>SP  - Description<br/>ID  - 4<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"artworkSize": "Size/Length",
				"callNumber": "Call Number",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"extra": "Size",
				"artworkMedium": "Type of Work",
				"shortTitle": "Short Title",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "film",
				"creators": [
					{
						"lastName": "Editor",
						"firstName": "Series",
						"creatorType": "producer"
					},
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "director"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "director"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Content: Contents<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>A2  - Performers<br/>C1  - Cast<br/>C2  - Credits<br/>C3  - Size/Length<br/>CY  - Place Published<br/>DO  - DOI<br/>ET  - Edition<br/>J2  - Periodical Title<br/>M3  - Type<br/>NV  - Extent of Work<br/>SN  - ISBN<br/>T3  - Series Title<br/>VL  - Volume<br/>ID  - 5<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"videoRecordingFormat": "Format",
				"callNumber": "Call Number",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"extra": "Number",
				"distributor": "Publisher",
				"shortTitle": "Short Title",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "bill",
				"creators": [
					{
						"lastName": "Sponsor",
						"creatorType": "sponsor",
						"fieldMode": 1
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>AN  - Accession Number<br/>CN  - Call Number<br/>DB  - Name of Database<br/>DO  - DOI<br/>DP  - Database Provider<br/>ID  - 6<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"date": "0000 Year Date",
				"session": "Session",
				"language": "Language",
				"billNumber": "Bill Number",
				"history": "History",
				"section": "Code Section",
				"codePages": "Code Pages",
				"shortTitle": "Short Title",
				"code": "Code",
				"legislativeBody": "Legislative Body",
				"title": "Title",
				"url": "URL",
				"codeVolume": "Code Volume",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "blogPost",
				"creators": [
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Content: Contents<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>A2  - Editor<br/>A3  - Illustrator<br/>AN  - Accession Number<br/>C1  - Author Affiliation<br/>CN  - Call Number<br/>CY  - Place Published<br/>DB  - Name of Database<br/>DO  - DOI<br/>DP  - Database Provider<br/>ET  - Edition<br/>J2  - Periodical Title<br/>PB  - Publisher<br/>SE  - Message Number<br/>SN  - ISBN<br/>SP  - Description<br/>T3  - Institution<br/>VL  - Access Year<br/>ID  - 7<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"date": "0000 Year Last",
				"language": "Language",
				"websiteType": "Type of Medium",
				"shortTitle": "Short Title",
				"blogTitle": "Title of WebLog",
				"title": "Title of Entry",
				"url": "URL",
				"accessDate": "0000 Number"
			},
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Editor",
						"firstName": "Series",
						"creatorType": "seriesEditor"
					},
					{
						"lastName": "Editor",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Translator",
						"creatorType": "translator",
						"fieldMode": 1
					},
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Original Publication: Original Publication<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>C3  - Title Prefix<br/>C4  - Reviewer<br/>DO  - DOI<br/>J2  - Abbreviation<br/>M3  - Type of Work<br/>RP  - Reprint Edition<br/>SE  - Pages<br/>ID  - 8<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"place": "Place Published",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"edition": "Edition",
				"language": "Language",
				"extra": "Series Volume",
				"numberOfVolumes": "Number of Volumes",
				"publisher": "Publisher",
				"ISBN": "ISBN",
				"numPages": "Number of Pages",
				"shortTitle": "Short Title",
				"series": "Series Title",
				"title": "Title",
				"url": "URL",
				"volume": "Volume",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "bookSection",
				"creators": [
					{
						"lastName": "Editor",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Editor",
						"firstName": "Series",
						"creatorType": "seriesEditor"
					},
					{
						"lastName": "Translator",
						"creatorType": "translator",
						"fieldMode": 1
					},
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Original Publication: Original Publication<br/>Reviewed Item: Reviewed Item<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>C1  - Section<br/>C3  - Title Prefix<br/>C4  - Reviewer<br/>C5  - Packaging Method<br/>DO  - DOI<br/>J2  - Abbreviation<br/>RP  - Reprint Edition<br/>SE  - Chapter<br/>SV  - Series Volume<br/>ID  - 9<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"place": "Place Published",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"edition": "Edition",
				"language": "Language",
				"numberOfVolumes": "Number of Volumes",
				"publisher": "Publisher",
				"ISBN": "ISBN",
				"pages": "Pages",
				"shortTitle": "Short Title",
				"bookTitle": "Book Title",
				"series": "Series Title",
				"title": "Title",
				"url": "URL",
				"volume": "Volume",
				"accessDate": "0000 Access",
				"date": "0000 Year"
			},
			{
				"itemType": "case",
				"creators": [
					{
						"lastName": "Counsel",
						"creatorType": "counsel",
						"fieldMode": 1
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Research Notes: ResearchNotes<br/>File Date: Filed Date<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>A3  - Court, Higher<br/>AN  - Accession Number<br/>CN  - Call Number<br/>DB  - Name of Database<br/>DO  - DOI<br/>DP  - Database Provider<br/>ET  - Action of Higher Court<br/>J2  - Parallel Citation<br/>M3  - Citation of Reversal<br/>NV  - Reporter Abbreviation<br/>T3  - Decision<br/>ID  - 10<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"reporter": "Reporter",
				"abstractNote": "Abstract",
				"dateDecided": "0000 Year Date",
				"language": "Language",
				"history": "History",
				"court": "Court",
				"firstPage": "First Page",
				"shortTitle": "Abbreviated Case Name",
				"docketNumber": "Docket Number",
				"caseName": "Case Name",
				"url": "URL",
				"reporterVolume": "Reporter Volume",
				"title": "Abbreviated Case Name"
			},
			{
				"itemType": "magazineArticle",
				"creators": [
					{
						"lastName": "Translator",
						"creatorType": "translator",
						"fieldMode": 1
					},
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Original Publication: Original Publication<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>A2  - Institution<br/>C5  - Packaging Method<br/>CY  - Place Published<br/>DO  - DOI<br/>ET  - Edition<br/>J2  - Abbreviation<br/>M3  - Type of Work<br/>NV  - Catalog Number<br/>PB  - Publisher<br/>RP  - Reprint Edition<br/>SE  - Number of Pages<br/>ID  - 11<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"extra": "Series Volume",
				"ISSN": "ISBN",
				"pages": "Pages",
				"shortTitle": "Short Title",
				"publicationTitle": "Series Title",
				"title": "Title",
				"url": "URL",
				"volume": "Volume",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "artwork",
				"creators": [
					{
						"lastName": "By",
						"firstName": "Created",
						"creatorType": "artist"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>A2  - File, Name of<br/>CY  - Place Published<br/>DO  - DOI<br/>ET  - Version<br/>PB  - Publisher<br/>SP  - Description<br/>VL  - Image Size<br/>ID  - 12<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"extra": "Number",
				"artworkMedium": "Type of Image",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access",
				"publicationTitle": "Image Source Program"
			},
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Editor",
						"firstName": "Series",
						"creatorType": "seriesEditor"
					},
					{
						"lastName": "Translator",
						"creatorType": "translator",
						"fieldMode": 1
					},
					{
						"lastName": "Attribution",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Original Publication: Original Publication<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>DO  - DOI<br/>J2  - Periodical Title<br/>M3  - Type<br/>RP  - Reprint Edition<br/>ID  - 23<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"place": "Place Published",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"edition": "Edition",
				"language": "Language",
				"extra": "Series Volume",
				"numberOfVolumes": "Number of Volumes",
				"publisher": "Publisher",
				"ISBN": "ISSN/ISBN",
				"numPages": "Number of Pages",
				"shortTitle": "Short Title",
				"series": "Series Title",
				"title": "Title",
				"url": "URL",
				"volume": "Volume",
				"accessDate": "0000 Access",
				"date": "0000 Year"
			},
			{
				"itemType": "computerProgram",
				"creators": [
					{
						"lastName": "Programmer",
						"creatorType": "programmer",
						"fieldMode": 1
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Content: Contents<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>A2  - Editor, Series<br/>C1  - Computer<br/>DO  - DOI<br/>J2  - Periodical Title<br/>M3  - Type<br/>SP  - Description<br/>VL  - Edition<br/>ID  - 14<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"place": "Place Published",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"version": "Version",
				"programmingLanguage": "Language",
				"company": "Publisher",
				"ISBN": "ISBN",
				"shortTitle": "Short Title",
				"seriesTitle": "Series Title",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access",
				"date": "0000 Year"
			},
			{
				"itemType": "conferencePaper",
				"creators": [
					{
						"lastName": "Editor",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>DOI: Type<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>CY  - Conference Location<br/>ID  - 15<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"place": "Place Published",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"extra": "Issue",
				"publisher": "Publisher",
				"pages": "Pages",
				"conferenceName": "Conference Name",
				"title": "Title",
				"url": "URL",
				"volume": "Volume",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "conferencePaper",
				"creators": [
					{
						"lastName": "Editor",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Editor",
						"firstName": "Series",
						"creatorType": "seriesEditor"
					},
					{
						"lastName": "Sponsor",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Original Publication: Source<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>C2  - Year Published<br/>C5  - Packaging Method<br/>CY  - Conference Location<br/>ET  - Edition<br/>NV  - Number of Volumes<br/>ID  - 16<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"place": "Place Published",
				"proceedingsTitle": "Proceedings Title",
				"callNumber": "Call Number",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"extra": "Issue",
				"publisher": "Publisher",
				"ISBN": "ISBN",
				"pages": "Pages",
				"shortTitle": "Short Title",
				"conferenceName": "Conference Name",
				"series": "Series Title",
				"title": "Title",
				"url": "URL",
				"volume": "Volume",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "document",
				"creators": [
					{
						"lastName": "Producer",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Agency",
						"firstName": "Funding",
						"creatorType": "translator"
					},
					{
						"lastName": "Investigators",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Original Publication: Version History<br/>Reviewed Item: Geographic Coverage<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>C1  - Time Period<br/>C2  - Unit of Observation<br/>C3  - Data Type<br/>C4  - Dataset(s)<br/>CY  - Place Published<br/>DO  - DOI<br/>ET  - Version<br/>J2  - Abbreviation<br/>NV  - Study Number<br/>SE  - Original Release Date<br/>SN  - ISSN<br/>T3  - Series Title<br/>ID  - 17<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"publisher": "Distributor",
				"shortTitle": "Short Title",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "dictionaryEntry",
				"creators": [
					{
						"lastName": "Editor",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Translator",
						"creatorType": "translator",
						"fieldMode": 1
					},
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Original Publication: Original Publication<br/>Reviewed Item: Reviewed Item<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>C1  - Term<br/>DO  - DOI<br/>J2  - Abbreviation<br/>M3  - Type of Work<br/>RP  - Reprint Edition<br/>SE  - Version<br/>ID  - 13<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"place": "Place Published",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"edition": "Edition",
				"language": "Language",
				"extra": "Number",
				"numberOfVolumes": "Number of Volumes",
				"publisher": "Publisher",
				"ISBN": "ISBN",
				"pages": "Pages",
				"shortTitle": "Short Title",
				"dictionaryTitle": "Dictionary Title",
				"title": "Title",
				"url": "URL",
				"volume": "Volume",
				"accessDate": "0000 Access",
				"date": "0000 Year"
			},
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Editor",
						"firstName": "Series",
						"creatorType": "seriesEditor"
					},
					{
						"lastName": "Translator",
						"creatorType": "translator",
						"fieldMode": 1
					},
					{
						"lastName": "Editor",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Editor Address<br/>Caption: Caption<br/>Label: Label<br/>Original Publication: Original Publication<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>DO  - DOI<br/>J2  - Periodical Title<br/>M3  - Type of Work<br/>RP  - Reprint Edition<br/>ID  - 19<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"place": "Place Published",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"edition": "Edition",
				"language": "Language",
				"extra": "Series Volume",
				"numberOfVolumes": "Number of Volumes",
				"publisher": "Publisher",
				"ISBN": "ISBN",
				"numPages": "Number of Pages",
				"shortTitle": "Short Title",
				"series": "Series Title",
				"title": "Title",
				"url": "URL",
				"volume": "Volume",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>DOI: Type of Work<br/>Reviewed Item: Reviewed Item<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>C1  - Year Cited<br/>C2  - Date Cited<br/>C3  - PMCID<br/>C4  - Reviewer<br/>C5  - Issue Title<br/>C6  - NIHMSID<br/>C7  - Article Number<br/>CY  - Place Published<br/>ET  - Edition<br/>NV  - Document Number<br/>PB  - Publisher<br/>RP  - Reprint Edition<br/>SE  - E-Pub Date<br/>T3  - Website Title<br/>ID  - 20<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"journalAbbreviation": "Periodical Title",
				"language": "Language",
				"extra": "Issue",
				"ISSN": "ISSN",
				"pages": "Pages",
				"shortTitle": "Short Title",
				"publicationTitle": "Periodical Title",
				"title": "Title",
				"url": "URL",
				"volume": "Volume"
			},
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Editor",
						"creatorType": "seriesEditor",
						"fieldMode": 1
					},
					{
						"lastName": "Editor",
						"firstName": "Series",
						"creatorType": "editor"
					},
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Original Publication: Original Publication<br/>Reviewed Item: Reviewed Item<br/>Research Notes: Research Notes<br/>series: Series Title<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>C1  - Year Cited<br/>C2  - Date Cited<br/>C3  - Title Prefix<br/>C4  - Reviewer<br/>C5  - Last Update Date<br/>C6  - NIHMSID<br/>C7  - PMCID<br/>DO  - DOI<br/>M3  - Type of Medium<br/>RP  - Reprint Edition<br/>ID  - 21<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"place": "Place Published",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"edition": "Edition",
				"language": "Language",
				"numberOfVolumes": "Version",
				"publisher": "Publisher",
				"ISBN": "ISBN",
				"numPages": "Number of Pages",
				"series": "Secondary Title",
				"title": "Title",
				"url": "URL",
				"volume": "Volume"
			},
			{
				"itemType": "bookSection",
				"creators": [
					{
						"lastName": "Editor",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Editor",
						"firstName": "Series",
						"creatorType": "seriesEditor"
					},
					{
						"lastName": "Translator",
						"creatorType": "translator",
						"fieldMode": 1
					},
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>numberOfVolumes: Number of Volumes<br/>Original Publication: Original Publication<br/>Reviewed Item: Reviewed Item<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>C1  - Section<br/>C3  - Title Prefix<br/>C4  - Reviewer<br/>C5  - Packaging Method<br/>C6  - NIHMSID<br/>C7  - PMCID<br/>DO  - DOI<br/>M3  - Type of Work<br/>RP  - Reprint Edition<br/>ID  - 22<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"place": "Place Published",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"edition": "Edition",
				"language": "Language",
				"numberOfVolumes": "Series Volume",
				"publisher": "Publisher",
				"ISBN": "ISSN/ISBN",
				"pages": "Number of Pages",
				"shortTitle": "Short Title",
				"bookTitle": "Book Title",
				"series": "Series Title",
				"title": "Title",
				"url": "URL",
				"volume": "Volume",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "encyclopediaArticle",
				"creators": [
					{
						"lastName": "Editor",
						"creatorType": "editor",
						"fieldMode": 1
					},
					{
						"lastName": "Translator",
						"creatorType": "translator",
						"fieldMode": 1
					},
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Original Publication: Original Publication<br/>Reviewed Item: Reviewed Item<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>C1  - Term<br/>DO  - DOI<br/>J2  - Abbreviation<br/>RP  - Reprint Edition<br/>ID  - 18<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"place": "Place Published",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"edition": "Edition",
				"language": "Language",
				"numberOfVolumes": "Number of Volumes",
				"publisher": "Publisher",
				"ISBN": "ISBN",
				"pages": "Pages",
				"shortTitle": "Short Title",
				"encyclopediaTitle": "Encyclopedia Title",
				"title": "Title",
				"url": "URL",
				"volume": "Volume",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "document",
				"creators": [
					{
						"lastName": "File",
						"firstName": "Name of",
						"creatorType": "editor"
					},
					{
						"lastName": "By",
						"firstName": "Created",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>CY  - Place Published<br/>DO  - DOI<br/>ET  - Version<br/>M3  - Type of Image<br/>SP  - Description<br/>VL  - Image Size<br/>ID  - 24<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"extra": "Number",
				"publisher": "Publisher",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access",
				"publicationTitle": "Image Source Program"
			},
			{
				"itemType": "artwork",
				"creators": [
					{
						"lastName": "By",
						"firstName": "Created",
						"creatorType": "artist"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>A2  - File, Name of<br/>CY  - Place Published<br/>DO  - DOI<br/>ET  - Version<br/>PB  - Publisher<br/>SP  - Description<br/>VL  - Image Size<br/>ID  - 25<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"extra": "Number",
				"artworkMedium": "Type of Image",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access",
				"publicationTitle": "Image Source Program"
			},
			{
				"itemType": "film",
				"creators": [
					{
						"lastName": "Producer",
						"creatorType": "producer",
						"fieldMode": 1
					},
					{
						"lastName": "Performers",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "Director",
						"creatorType": "director",
						"fieldMode": 1
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>A2  - Director, Series<br/>C1  - Cast<br/>C2  - Credits<br/>CY  - Place Published<br/>DO  - DOI<br/>ET  - Edition<br/>J2  - Periodical Title<br/>M3  - Medium<br/>RP  - Reprint Edition<br/>ID  - 26<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Synopsis",
				"archiveLocation": "Accession Number",
				"genre": "Genre",
				"videoRecordingFormat": "Format",
				"callNumber": "Call Number",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"distributor": "Distributor",
				"runningTime": "Running Time",
				"shortTitle": "Short Title",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access",
				"publicationTitle": "Series Title"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Author",
						"firstName": "Secondary",
						"creatorType": "editor"
					},
					{
						"lastName": "Author",
						"firstName": "Subsidiary",
						"creatorType": "translator"
					},
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>DOI: Type of Work<br/>Original Publication: Original Publication<br/>Reviewed Item: Reviewed Item<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>A3  - Author, Tertiary<br/>C1  - Custom 1<br/>C2  - Custom 2<br/>C3  - Custom 3<br/>C4  - Custom 4<br/>C5  - Custom 5<br/>C6  - Custom 6<br/>C7  - Custom 7<br/>C8  - Custom 8<br/>CY  - Place Published<br/>ET  - Edition<br/>NV  - Number of Volumes<br/>PB  - Publisher<br/>RP  - Reprint Edition<br/>SE  - Section<br/>T3  - Tertiary Title<br/>ID  - 27<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"journalAbbreviation": "Periodical Title",
				"language": "Language",
				"extra": "Number",
				"ISSN": "ISSN/ISBN",
				"pages": "Pages",
				"shortTitle": "Short Title",
				"publicationTitle": "Secondary Title",
				"title": "Title",
				"url": "URL",
				"volume": "Volume",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "report",
				"creators": [
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>A2  - Department<br/>C1  - Government Body<br/>C2  - Congress Number<br/>C3  - Congress Session<br/>DO  - DOI<br/>ET  - Edition<br/>SE  - Section<br/>T3  - Series Title<br/>VL  - Volume<br/>ID  - 28<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"place": "Place Published",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"extra": "Number",
				"institution": "Publisher",
				"reportNumber": "ISSN/ISBN",
				"pages": "Pages",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access",
				"date": "0000 Year"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Translator",
						"creatorType": "translator",
						"fieldMode": 1
					},
					{
						"lastName": "Investigators",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>DOI: Funding Type<br/>Original Publication: Original Grant Number<br/>Reviewed Item: Reviewed Item<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>C1  - Contact Name<br/>C2  - Contact Address<br/>C3  - Contact Phone<br/>C4  - Contact Fax<br/>C5  - Funding Number<br/>C6  - CFDA Number<br/>CY  - Activity Location<br/>ET  - Requirements<br/>NV  - Amount Received<br/>PB  - Sponsoring Agency<br/>RP  - Review Date<br/>SE  - Duration of Grant<br/>ID  - 29<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"date": "0000 Year Deadline",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"journalAbbreviation": "Periodical Title",
				"language": "Language",
				"extra": "Status",
				"pages": "Pages",
				"shortTitle": "Short Title",
				"title": "Title of Grant",
				"url": "URL",
				"volume": "Amount Requested",
				"accessDate": "0000 Access",
				"publicationTitle": "Periodical Title"
			},
			{
				"itemType": "hearing",
				"creators": [],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>AN  - Accession Number<br/>C2  - Congress Number<br/>CN  - Call Number<br/>DB  - Name of Database<br/>DO  - DOI<br/>DP  - Database Provider<br/>SN  - ISBN<br/>ID  - 30<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"place": "Place Published",
				"date": "0000 Year Date",
				"session": "Session",
				"language": "Language",
				"documentNumber": "Document Number",
				"numberOfVolumes": "Number of Volumes",
				"history": "History",
				"publisher": "Publisher",
				"pages": "Pages",
				"shortTitle": "Short Title",
				"committee": "Committee",
				"legislativeBody": "Legislative Body",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>DOI: Type of Article<br/>Original Publication: Original Publication<br/>Reviewed Item: Reviewed Item<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>C1  - Legal Note<br/>C2  - PMCID<br/>C6  - NIHMSID<br/>C7  - Article Number<br/>ET  - Epub Date<br/>RP  - Reprint Edition<br/>SE  - Start Page<br/>ID  - 31<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"journalAbbreviation": "Periodical Title",
				"language": "Language",
				"issue": "Issue",
				"ISSN": "ISSN",
				"pages": "Pages",
				"shortTitle": "Short Title",
				"publicationTitle": "Journal",
				"title": "Title",
				"url": "URL",
				"volume": "Volume",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "case",
				"creators": [
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Research Notes: Research Notes<br/>File Date: Section Number<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>AN  - Accession Number<br/>CN  - Call Number<br/>CY  - Place Published<br/>DB  - Name of Database<br/>DO  - DOI<br/>DP  - Database Provider<br/>ET  - Edition<br/>J2  - Periodical Title<br/>M3  - Type of Work<br/>NV  - Session Number<br/>SN  - ISSN/ISBN<br/>T3  - Supplement No.<br/>ID  - 32<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"reporter": "Organization, Issuing",
				"abstractNote": "Abstract",
				"dateDecided": "0000 Year Date",
				"language": "Language",
				"extra": "Start Page",
				"history": "History",
				"court": "Publisher",
				"firstPage": "Pages",
				"caseName": "Title",
				"url": "URL",
				"reporterVolume": "Rule Number",
				"accessDate": "0000 Access",
				"publicationTitle": "Title Number"
			},
			{
				"itemType": "magazineArticle",
				"creators": [
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Original Publication: Original Publication<br/>Reviewed Item: Reviewed Item<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>CY  - Place Published<br/>DO  - DOI<br/>ET  - Edition<br/>J2  - Periodical Title<br/>M3  - Type of Article<br/>NV  - Frequency<br/>PB  - Publisher<br/>RP  - Reprint Edition<br/>SE  - Start Page<br/>ID  - 33<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"extra": "Issue Number",
				"ISSN": "ISSN",
				"pages": "Pages",
				"shortTitle": "Short Title",
				"publicationTitle": "Magazine",
				"title": "Title",
				"url": "URL",
				"volume": "Volume",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "manuscript",
				"creators": [
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>DO  - DOI<br/>ET  - Description of Material<br/>J2  - Periodical Title<br/>NV  - Manuscript Number<br/>PB  - Library/Archive<br/>RP  - Reprint Edition<br/>SE  - Start Page<br/>VL  - Volume/Storage Container<br/>ID  - 34<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"place": "Place Published",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"extra": "Folio Number",
				"manuscriptType": "Type of Work",
				"numPages": "Pages",
				"shortTitle": "Short Title",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access",
				"publicationTitle": "Collection Title"
			},
			{
				"itemType": "map",
				"creators": [
					{
						"lastName": "Cartographer",
						"creatorType": "cartographer",
						"fieldMode": 1
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>A2  - Editor, Series<br/>C2  - Area<br/>C3  - Size<br/>C5  - Packaging Method<br/>DO  - DOI<br/>J2  - Periodical Title<br/>RP  - Reprint Edition<br/>SP  - Description<br/>ID  - 35<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"scale": "Scale",
				"callNumber": "Call Number",
				"place": "Place Published",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"edition": "Edition",
				"language": "Language",
				"mapType": "Type",
				"publisher": "Publisher",
				"ISBN": "ISSN/ISBN",
				"shortTitle": "Short Title",
				"seriesTitle": "Series Title",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "audioRecording",
				"creators": [
					{
						"lastName": "Editor",
						"creatorType": "performer",
						"fieldMode": 1
					},
					{
						"lastName": "Producer",
						"creatorType": "translator",
						"fieldMode": 1
					},
					{
						"lastName": "Composer",
						"creatorType": "composer",
						"fieldMode": 1
					},
					{
						"lastName": "Target Audience",
						"creatorType": "wordsBy",
						"fieldMode": 1
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Original Publication: Original Publication<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>A3  - Editor, Series<br/>C1  - Format of Music<br/>C2  - Form of Composition<br/>C3  - Music Parts<br/>DO  - DOI<br/>ET  - Edition<br/>M3  - Form of Item<br/>RP  - Reprint Edition<br/>SE  - Section<br/>SP  - Pages<br/>ID  - 36<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"audioRecordingFormat": "Accompanying Matter",
				"callNumber": "Call Number",
				"place": "Place Published",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"numberOfVolumes": "Number of Volumes",
				"label": "Publisher",
				"ISBN": "ISBN",
				"shortTitle": "Short Title",
				"seriesTitle": "Series Title",
				"title": "Title",
				"url": "URL",
				"volume": "Volume",
				"accessDate": "0000 Access",
				"publicationTitle": "Album Title"
			},
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"lastName": "Reporter",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Original Publication: Original Publication<br/>Reviewed Item: Reviewed Item<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>C1  - Column<br/>C2  - Issue<br/>DO  - DOI<br/>M3  - Type of Article<br/>NV  - Frequency<br/>PB  - Publisher<br/>RP  - Reprint Edition<br/>VL  - Volume<br/>ID  - 37<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"place": "Place Published",
				"date": "0000 Year Issue",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"edition": "Edition",
				"language": "Language",
				"extra": "Start Page",
				"section": "Section",
				"ISSN": "ISSN",
				"pages": "Pages",
				"shortTitle": "Short Title",
				"publicationTitle": "Newspaper",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "document",
				"creators": [
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>CY  - Place Published<br/>DO  - DOI<br/>ET  - Date Published<br/>M3  - Type of Work<br/>SN  - Report Number<br/>SP  - Pages<br/>VL  - Volume<br/>ID  - 38<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"publisher": "Publisher",
				"title": "Title",
				"url": "URL",
				"publicationTitle": "Periodical"
			},
			{
				"itemType": "videoRecording",
				"creators": [
					{
						"lastName": "By",
						"firstName": "Created",
						"creatorType": "director"
					},
					{
						"lastName": "Year Cited",
						"creatorType": "castMember",
						"fieldMode": 1
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>A2  - Editor, Series<br/>C2  - Date Cited<br/>DO  - DOI<br/>M3  - Type of Work<br/>ID  - 39<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"videoRecordingFormat": "Format/Length",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"extra": "Number of Screens",
				"studio": "Distributor",
				"title": "Title",
				"url": "URL",
				"publicationTitle": "Series Title"
			},
			{
				"itemType": "manuscript",
				"creators": [
					{
						"lastName": "Translator",
						"creatorType": "translator",
						"fieldMode": 1
					},
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Original Publication: Original Publication<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>A2  - Institution<br/>C5  - Packaging Method<br/>DO  - DOI<br/>ET  - Edition<br/>J2  - Abbreviation<br/>PB  - Publisher<br/>RP  - Reprint Edition<br/>SN  - ISBN<br/>VL  - Number<br/>ID  - 40<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"place": "Place Published",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"extra": "Series Volume; Number of Pages",
				"manuscriptType": "Type of Work",
				"numPages": "Pages",
				"shortTitle": "Short Title",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access",
				"publicationTitle": "Published Source"
			},
			{
				"itemType": "patent",
				"creators": [
					{
						"lastName": "Inventor",
						"creatorType": "inventor",
						"fieldMode": 1
					},
					{
						"lastName": "Attorney/Agent",
						"creatorType": "attorneyAgent",
						"fieldMode": 1
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Inventor Address: Inventor Address<br/>Caption: Caption<br/>issueDate: 0000 Date<br/>Label: Label<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>Patent Version Number: Patent Version Number<br/>A3  - International Author<br/>AN  - Accession Number<br/>CN  - Call Number<br/>DB  - Name of Database<br/>DO  - DOI<br/>DP  - Database Provider<br/>ET  - International Patent Classification<br/>M3  - Patent Type<br/>NV  - US Patent Classification<br/>SE  - International Patent Number<br/>T3  - Title, International<br/>ID  - 41<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"issuingAuthority": "Organization, Issuing",
				"abstractNote": "Abstract",
				"issueDate": "0000 Year Issue",
				"country": "Designated States",
				"references": "References",
				"legalStatus": "Legal Status",
				"place": "Country",
				"language": "Language",
				"applicationNumber": "Application Number",
				"priorityNumbers": "Priority Numbers",
				"assignee": "Assignee",
				"patentNumber": "Patent Number",
				"pages": "Pages",
				"shortTitle": "Short Title",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access",
				"publicationTitle": "Published Source"
			},
			{
				"itemType": "letter",
				"creators": [
					{
						"lastName": "Recipient",
						"creatorType": "recipient",
						"fieldMode": 1
					},
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>C1  - Senders E-Mail<br/>C2  - Recipients E-Mail<br/>CY  - Place Published<br/>DO  - DOI<br/>ET  - Description<br/>J2  - Abbreviation<br/>NV  - Communication Number<br/>PB  - Publisher<br/>SP  - Pages<br/>ID  - 42<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"extra": "Folio Number",
				"letterType": "Type",
				"shortTitle": "Short Title",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "report",
				"creators": [
					{
						"lastName": "Publisher",
						"creatorType": "seriesEditor",
						"fieldMode": 1
					},
					{
						"lastName": "Department/Division",
						"creatorType": "translator",
						"fieldMode": 1
					},
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Content: Contents<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>A2  - Editor, Series<br/>C6  - Issue<br/>DO  - DOI<br/>ET  - Edition<br/>J2  - Periodical Title<br/>NV  - Series Volume<br/>RP  - Notes<br/>VL  - Volume<br/>ID  - 43<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"place": "Place Published",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"extra": "Document Number",
				"reportType": "Type",
				"institution": "Institution",
				"reportNumber": "Report Number",
				"pages": "Pages",
				"shortTitle": "Short Title",
				"seriesTitle": "Series Title",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Editor",
						"creatorType": "seriesEditor",
						"fieldMode": 1
					},
					{
						"lastName": "Editor",
						"firstName": "Series",
						"creatorType": "editor"
					},
					{
						"lastName": "Editor",
						"firstName": "Volume",
						"creatorType": "translator"
					},
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Original Publication: Original Publication<br/>Reviewed Item: Reviewed Item<br/>Research Notes: Research Notes<br/>series: Series Title<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>C1  - Section<br/>C2  - Report Number<br/>C5  - Packaging Method<br/>DO  - DOI<br/>J2  - Abbreviation<br/>M3  - Type of Work<br/>RP  - Reprint Edition<br/>SE  - Chapter<br/>ID  - 44<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"place": "Place Published",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"edition": "Edition",
				"language": "Language",
				"extra": "Series Volume",
				"numberOfVolumes": "Number of Volumes",
				"publisher": "Publisher",
				"ISBN": "ISBN",
				"numPages": "Pages",
				"shortTitle": "Short Title",
				"series": "Secondary Title",
				"title": "Title",
				"url": "URL",
				"volume": "Volume",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "report",
				"creators": [
					{
						"lastName": "Institution",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>DO  - DOI<br/>J2  - Abbreviation<br/>NV  - Session Number<br/>SE  - Section Number<br/>T3  - Paper Number<br/>VL  - Rule Number<br/>ID  - 45<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"place": "Place Published",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"extra": "Start Page",
				"reportType": "Type of Work",
				"institution": "Publisher",
				"reportNumber": "Document Number",
				"pages": "Pages",
				"seriesTitle": "Section Title",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "statute",
				"creators": [],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Article Number: Article Number<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>AN  - Accession Number<br/>C5  - Publisher<br/>C6  - Volume<br/>CN  - Call Number<br/>CY  - Country<br/>DB  - Name of Database<br/>DO  - DOI<br/>DP  - Database Provider<br/>J2  - Abbreviation<br/>NV  - Statute Number<br/>PB  - Source<br/>T3  - International Source<br/>ID  - 46<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"dateEnacted": "0000 Year Date",
				"session": "Session",
				"language": "Language",
				"publicLawNumber": "Public Law Number",
				"history": "History",
				"section": "Sections",
				"pages": "Pages",
				"shortTitle": "Short Title",
				"code": "Code",
				"nameOfAct": "Name of Act",
				"url": "URL",
				"codeNumber": "Code Number",
				"accessDate": "0000 Access",
				"title": "Short Title"
			},
			{
				"itemType": "thesis",
				"creators": [
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>A3  - Advisor<br/>DO  - DOI<br/>VL  - Degree<br/>ID  - 47<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"archiveLocation": "Accession Number",
				"callNumber": "Call Number",
				"place": "Place Published",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"language": "Language",
				"extra": "Document Number",
				"thesisType": "Thesis Type",
				"university": "University",
				"numPages": "Number of Pages",
				"shortTitle": "Short Title",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access",
				"publicationTitle": "Academic Department"
			},
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Editor",
						"firstName": "Series",
						"creatorType": "editor"
					},
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>DOI: Type of Work<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>CY  - Place Published<br/>PB  - Institution<br/>T3  - Department<br/>ID  - 48<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"date": "0000 Year Date",
				"archive": "Name of Database",
				"libraryCatalog": "Database Provider",
				"journalAbbreviation": "Abbreviation",
				"language": "Language",
				"extra": "Number",
				"pages": "Pages",
				"shortTitle": "Short Title",
				"publicationTitle": "Series Title",
				"title": "Title of Work",
				"url": "URL",
				"accessDate": "0000 Access"
			},
			{
				"itemType": "webpage",
				"creators": [
					{
						"lastName": "Name1",
						"firstName": "Author",
						"creatorType": "author"
					},
					{
						"lastName": "Name2",
						"firstName": "Author",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>Notes</p>"
					},
					{
						"note": "The following values have no corresponding Zotero field:<br/>Author Address: Author Address<br/>Caption: Caption<br/>Label: Label<br/>Content: Contents<br/>Research Notes: Research Notes<br/>Translated Author: Author, Translated<br/>Translated Title: Translated Title<br/>A2  - Editor, Series<br/>AN  - Accession Number<br/>C1  - Year Cited<br/>C2  - Date Cited<br/>CN  - Call Number<br/>CY  - Place Published<br/>DB  - Name of Database<br/>DO  - DOI<br/>DP  - Database Provider<br/>ET  - Edition<br/>J2  - Periodical Title<br/>PB  - Publisher<br/>SN  - ISBN<br/>SP  - Description<br/>ID  - 49<br/>",
						"tags": [
							"_RIS import"
						]
					}
				],
				"tags": [
					"Keyword1, Keyword2, Keyword3",
					"Keyword4",
					"Keyword5"
				],
				"seeAlso": [],
				"attachments": [],
				"abstractNote": "Abstract",
				"date": "0000 Year Last",
				"language": "Language",
				"websiteType": "Type of Medium",
				"shortTitle": "Short Title",
				"websiteTitle": "Series Title",
				"title": "Title",
				"url": "URL",
				"accessDate": "0000 Access"
			}
		]
	}
]
/** END TEST CASES **/