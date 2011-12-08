{
	"translatorID": "32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7",
	"label": "RIS",
	"creator": "Simon Kornblith",
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
	"browserSupport": "gcs",
	"lastUpdated": "2011-10-10 20:43:17"
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

var fieldMap = {
	ID:"itemID",
	T1:"title",
	T3:"series",
	JF:"publicationTitle",
	CY:"place",
	JA:"journalAbbreviation",
	M3:"DOI"
};

var bookSectionFieldMap = {
	ID:"itemID",
	T1:"title",
	T2:"publicationTitle",
	T3:"series",
	T2:"bookTitle",
	CY:"place",
	JA:"journalAbbreviation",
	M3:"DOI"
};

// Accounting for input fields that we don't export the same way;
// mainly for common abuses of the spec
var inputFieldMap = {
	TI:"title",
	CT:"title",
	CY:"place",
	ST:"shortTitle",
	DO:"DOI"
};

// TODO: figure out if these are the best types for letter, interview, webpage
var typeMap = {
	book:"BOOK",
	bookSection:"CHAP",
	journalArticle:"JOUR",
	magazineArticle:"MGZN",
	newspaperArticle:"NEWS",
	thesis:"THES",
	letter:"PCOMM",
	manuscript:"PAMP",
	interview:"PCOMM",
	film:"MPCT",
	artwork:"ART",
	report:"RPRT",
	bill:"BILL",
	"case":"CASE",
	hearing:"HEAR",
	patent:"PAT",
	statute:"STAT",
	map:"MAP",
	blogPost:"ELEC",
	webpage:"ELEC",
	instantMessage:"ICOMM",
	forumPost:"ICOMM",
	email:"ICOMM",
	audioRecording:"SOUND",
	presentation:"GEN",
	videoRecording:"VIDEO",
	tvBroadcast:"GEN",
	radioBroadcast:"GEN",
	podcast:"GEN",
	computerProgram:"COMP",
	conferencePaper:"CONF",
	document:"GEN"
};

// supplements outputTypeMap for importing
// TODO: DATA, MUSIC
var inputTypeMap = {
	ABST:"journalArticle",
	ADVS:"film",
	CTLG:"magazineArticle",
	INPR:"manuscript",
	JFULL:"journalArticle",
	PAMP:"manuscript",
	SER:"book",
	SLIDE:"artwork",
	UNBILL:"manuscript",
	CPAPER:"conferencePaper",
	WEB:"webpage",
	EDBOOK:"book",
	MANSCPT:"manuscript",
	GOVDOC:"document"
};

function processTag(item, tag, value) {
	if (tag != "N1" && tag != "AB" && value !== undefined
				&& Zotero.Utilities.unescapeHTML) {
		value = Zotero.Utilities.unescapeHTML(value);
	}
	
	if(fieldMap[tag]) {
		item[fieldMap[tag]] = value;
	} else if(inputFieldMap[tag]) {
		item[inputFieldMap[tag]] = value;
	} else if(tag == "TY") {
		// look for type
		
		// trim the whitespace that some providers (e.g. ProQuest) include
		value = Zotero.Utilities.trim(value);
		
		// first check typeMap
		for(var i in typeMap) {
			if(value.toUpperCase() == typeMap[i]) {
				item.itemType = i;
			}
		}
		// then check inputTypeMap
		if(!item.itemType) {
			if(inputTypeMap[value]) {
				item.itemType = inputTypeMap[value];
			} else {
				// default to document
				item.itemType = "document";
			}
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

function addTag(tag, value) {
	if(value) {
		Zotero.write(tag+"  - "+value+"\r\n");
	}
}

function doExport() {
	var item;

	while(item = Zotero.nextItem()) {
		// can't store independent notes in RIS
		if(item.itemType == "note" || item.itemType == "attachment") {
			continue;
		}

		// type
		addTag("TY", typeMap[item.itemType] ? typeMap[item.itemType] : "GEN");

		// use field map
		if (item.itemType == "bookSection" || item.itemType == "conferencePaper") {
			for(var j in bookSectionFieldMap) {
				if(item[bookSectionFieldMap[j]]) addTag(j, item[bookSectionFieldMap[j]]);
			}
		} else {
			for(var j in fieldMap) {
				if(item[fieldMap[j]]) addTag(j, item[fieldMap[j]]);
			}
		}

		// creators
		for(var j in item.creators) {
			// only two types, primary and secondary
			var risTag;
			// authors and inventors are primary creators
			if (item.creators[j].creatorType == "author" || item.creators[j].creatorType == "inventor") {
				risTag = "A1";
			} else if (item.creators[j].creatorType == "editor") {
				risTag = "ED";
			} else {
				risTag = "A2";
			}

			var names = [];
			if (item.creators[j].lastName) names.push(item.creators[j].lastName);
			if (item.creators[j].firstName) names.push(item.creators[j].firstName);

			addTag(risTag, names.join(","));
		}
		
		// assignee (patent)
		if(item.assignee) {
			addTag("A2", item.assignee);
		}
		
		// volume (patent: applicationNumber, report: reportNumber)
		if(item.volume || item.applicationNumber || item.reportNumber) {
			if (item.volume) {
				var value = item.volume;
			} else if(item.applicationNumber) {
				var value = item.applicationNumber;
			} else if(item.reportNumber) {
				var value = item.reportNumber;
			}
			addTag("VL", value);
		}
		
		// issue (patent: patentNumber)
		if(item.issue || item.patentNumber) {
			var value = (item.issue) ? item.issue : item.patentNumber;
			addTag("IS", value);
		}

		// publisher (patent: references)
		if(item.publisher || item.references) {
			var value = (item.publisher) ? item.publisher : item.references;
			addTag("PB", value);
		}


		// date
		if(item.date) {
			var date = Zotero.Utilities.strToDate(item.date);
			var string = date.year+"/";
			if(date.month != undefined) {
				// deal with javascript months
				date.month++;
				if(date.month < 10) string += "0";
				string += date.month;
			}
			string += "/";
			if(date.day != undefined) {
				if(date.day < 10) string += "0";
				string += date.day;
			}
			string += "/";
			if(date.part != undefined) {
				string += date.part;
			}
			addTag("PY", string);
		}
		
		// filingDate (patents)
		if(item.filingDate) {
			var date = Zotero.Utilities.strToDate(item.filingDate);
			var string = date.year+"/";
			if(date.month != undefined) {
				// deal with javascript months
				date.month++;
				if(date.month < 10) string += "0";
				string += date.month;
			}
			string += "/";
			if(date.day != undefined) {
				if(date.day < 10) string += "0";
				string += date.day;
			}
			string += "/";
			if(date.part != undefined) {
				string += date.part;
			}
			addTag("Y2", string);
		}

		// notes
		if(Zotero.getOption("exportNotes")) {
			for(var j in item.notes) {
				addTag("N1", item.notes[j].note.replace(/(?:\r\n?|\n)/g, "\r\n"));
			}
		}

		if(item.abstractNote) {
			addTag("N2", item.abstractNote.replace(/(?:\r\n?|\n)/g, "\r\n"));
		}
		else if(item["abstract"]) {
			// patent type has abstract
			addTag("N2", item["abstract"].replace(/(?:\r\n?|\n)/g, "\r\n"));
		}

		// tags
		for each(var tag in item.tags) {
			addTag("KW", tag.tag);
		}

		// pages
		if(item.pages) {
			if(item.itemType == "book") {
				addTag("EP", item.pages);
			} else {
				var range = Zotero.Utilities.getPageRange(item.pages);
				addTag("SP", range[0]);
				addTag("EP", range[1]);
			}
		}

		// ISBN/ISSN
		addTag("SN", item.ISBN);
		addTag("SN", item.ISSN);

		// URL
		if(item.url) {
			addTag("UR", item.url);
		} else if(item.source && item.source.substr(0, 7) == "http://") {
			addTag("UR", item.source);
		}

		Zotero.write("ER  - \r\n\r\n");
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
