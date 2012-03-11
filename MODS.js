{
	"translatorID": "0e2235e7-babf-413c-9acf-f27cce5f059c",
	"label": "MODS",
	"creator": "Simon Kornblith and Richard Karnesky",
	"target": "xml",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 50,
	"configOptions": {
		"dataMode": "xml/e4x"
	},
	"displayOptions": {
		"exportNotes": true
	},
	"inRepository": true,
	"translatorType": 3,
	"browserSupport": "g",
	"lastUpdated": "2012-03-11 14:34:21"
}

function detectImport() {
	var name = Zotero.getXML().name();
	if (!name) {
		return false;
	}
	return name.uri == "http://www.loc.gov/mods/v3" && (name.localName == "modsCollection" || name.localName == "mods");
}

var partialItemTypes = ["bookSection", "journalArticle", "magazineArticle", "newspaperArticle"];

function doExport() {
	Zotero.setCharacterSet("utf-8");
	var modsCollection = <modsCollection xmlns="http://www.loc.gov/mods/v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-2.xsd" />;
	
	var item;
	while(item = Zotero.nextItem()) {
		var isPartialItem = partialItemTypes.indexOf(item.itemType) !== -1;
		
		var mods = <mods />;
		
		/** CORE FIELDS **/
		
		// XML tag titleInfo; object field title
		if(item.title) {
			mods.titleInfo.title = item.title;
		}
		if(item.shortTitle) {
			mods.titleInfo += <titleInfo type="abbreviated"><title>{item.shortTitle}</title></titleInfo>;
		}
		
		// XML tag typeOfResource/genre; object field type
		// 
		// The exact marcGenre of a book section can, perhaps, be debated;
		// But it should have 'book' as the host's genre.
		var modsType, marcGenre;
		if(item.itemType == "book" || item.itemType == "bookSection") {
			modsType = "text";
			marcGenre = "book";
		} else if(item.itemType == "journalArticle" || item.itemType == "magazineArticle") {
			modsType = "text";
			marcGenre = "periodical";
		} else if(item.itemType == "newspaperArticle") {
			modsType = "text";
			marcGenre = "newspaper";
		} else if(item.itemType == "thesis") {
			modsType = "text";
			marcGenre = "thesis";
		} else if(item.itemType == "letter") {
			modsType = "text";
			marcGenre = "letter";
		} else if(item.itemType == "manuscript") {
			modsType = "text";
			mods.typeOfResource.@manuscript = "yes";
		} else if(item.itemType == "interview") {
			modsType = "text";
			marcGenre = "interview";
		} else if(item.itemType == "film") {
			modsType = "moving image";
			marcGenre = "motion picture";
		} else if(item.itemType == "artwork") {
			modsType = "still image";
			marcGenre = "art original";
		} else if(item.itemType == "webpage") {
			modsType = "multimedia";
			marcGenre = "web site";
		} else if(item.itemType == "note" || item.itemType == "attachment") {
			continue;
		}
		mods.typeOfResource = modsType;
		mods.genre += <genre authority="local">{item.itemType}</genre>;
		if(marcGenre) {
			mods.genre += <genre authority="marcgt">{marcGenre}</genre>;
		}
		
		// XML tag genre; object field thesisType, type
		if(item.thesisType) {
			mods.genre += <genre>{item.thesisType}</genre>;
		} else if(item.type) {
			mods.genre += <genre>{item.type}</genre>;
		}
		
		// XML tag name; object field creators
		for(var j in item.creators) {
			var roleTerm = "";
			if(item.creators[j].creatorType == "author") {
				roleTerm = "aut";
			} else if(item.creators[j].creatorType == "editor") {
				roleTerm = "edt";
			} else if(item.creators[j].creatorType == "translator") {
				roleTerm = "trl";
			} else {
				roleTerm = "ctb";
			}

			if(item.creators[j].creatorType != "seriesEditor") {
				if(isPartialItem && item.creators[j].creatorType == "editor"){
					if(item.creators[j].fieldMode == 1) {
						mods.relatedItem.name += <name type="corporate">
							<namePart>{item.creators[j].lastName}</namePart>
							<role><roleTerm type="code" authority="marcrelator">{roleTerm}</roleTerm></role>
							</name>;
					} else {
						mods.relatedItem.name += <name type="personal">
							<namePart type="family">{item.creators[j].lastName}</namePart>
							<namePart type="given">{item.creators[j].firstName}</namePart>
							<role><roleTerm type="code" authority="marcrelator">{roleTerm}</roleTerm></role>
							</name>;
					}
				} else {
					if(item.creators[j].fieldMode == 1) {
						mods.name += <name type="corporate">
							<namePart>{item.creators[j].lastName}</namePart>
							<role><roleTerm type="code" authority="marcrelator">{roleTerm}</roleTerm></role>
							</name>;
					} else {
						mods.name += <name type="personal">
							<namePart type="family">{item.creators[j].lastName}</namePart>
							<namePart type="given">{item.creators[j].firstName}</namePart>
							<role><roleTerm type="code" authority="marcrelator">{roleTerm}</roleTerm></role>
							</name>;
					}
				}
			}
		}
		
		// XML tag recordInfo.recordOrigin; used to store our generator note
		//mods.recordInfo.recordOrigin = "Zotero for Firefox "+Zotero.Utilities.getVersion();
		
		/** FIELDS ON NEARLY EVERYTHING BUT NOT A PART OF THE CORE **/
		
		// XML tag recordInfo.recordContentSource; object field source
		if(item.source) {
			mods.recordInfo.recordContentSource = item.source;
		}
		// XML tag recordInfo.recordIdentifier; object field accessionNumber
		if(item.accessionNumber) {
			mods.recordInfo.recordIdentifier = item.accessionNumber;
		}
		
		// XML tag accessCondition; object field rights
		if(item.rights) {
			mods.accessCondition = item.rights;
		}
		
		/** SUPPLEMENTAL FIELDS **/
		
		// Make part its own tag so we can figure out where it goes later
		var part = new XML();
		
		// XML tag detail; object field volume
		if(item.volume) {
			part += <detail type="volume"><number>{item.volume}</number></detail>;
		}
		
		// XML tag detail; object field number
		if(item.issue) {
			part += <detail type="issue"><number>{item.issue}</number></detail>;
		}
		
		// XML tag detail; object field section
		if(item.section) {
			part += <detail type="section"><number>{item.section}</number></detail>;
		}
		
		// XML tag detail; object field pages
		if(item.pages) {
			var range = Zotero.Utilities.getPageRange(item.pages);
			part += <extent unit="pages"><start>{range[0]}</start><end>{range[1]}</end></extent>;
		}
		
		// Assign part if something was assigned
		if(part.length() != 1) {
			if(isPartialItem) {
				// For a journal article, bookSection, etc., the part is the host
				mods.relatedItem.part += <part>{part}</part>;
			} else {
				mods.part += <part>{part}</part>;
			}
		}
		
		// XML tag originInfo; object fields edition, place, publisher, year, date
		var originInfo = new XML();
		if(item.edition) {
			originInfo += <edition>{item.edition}</edition>;
		}
		if(item.place) {
			originInfo += <place><placeTerm type="text">{item.place}</placeTerm></place>;
		}
		if(item.publisher) {
			originInfo += <publisher>{item.publisher}</publisher>;
		} else if(item.distributor) {
			originInfo += <publisher>{item.distributor}</publisher>;
		}
		if(item.date) {
			if(["book", "bookSection"].indexOf(item.itemType) !== -1) {
				// Assume year is copyright date
				var dateType = "copyrightDate";
			} else if(["journalArticle", "magazineArticle", "newspaperArticle"].indexOf(item.itemType) !== -1) {
				// Assume date is date issued
				var dateType = "dateIssued";
			} else {
				// Assume date is date created
				var dateType = "dateCreated";
			}
			var tag = <{dateType}>{item.date}</{dateType}>;
			originInfo += tag;
		}

		if(item.numPages) {
			mods.physicalDescription = <physicalDescription><extent unit="pages"><total>{item.numPages}</total></extent></physicalDescription>;
 		}

		if(originInfo.length() != 1) {
			if(isPartialItem) {
				// For a journal article, bookSection, etc., this goes under the host
				mods.relatedItem.originInfo += <originInfo>{originInfo}</originInfo>;
			} else {
				mods.originInfo += <originInfo>{originInfo}</originInfo>;
			}
		}

		// eXist Solutions points out that most types are more often
		// monographic than not & will use this internally.
		// Perhaps comment this out in the main distribution, though.
		mods.originInfo.issuance = "monographic";

		if(isPartialItem) {
			// eXist Solutions points out that these types are more often
			// continuing than not & will use this internally.
			// Perhaps comment this out in the main distribution, though.
			if(item.itemType == "journalArticle" || item.itemType == "magazineArticle" || item.itemType == "newspaperArticle") {
				mods.relatedItem.originInfo.issuance = "continuing";
				if(item.itemType == "journalArticle" || item.itemType == "magazineArticle") {
					mods.relatedItem.genre += <genre authority="marcgt">periodical</genre>;
				} else if (item.itemType == "newspaperArticle") {
					mods.relatedItem.genre += <genre authority="marcgt">newspaper</genre>;
				}
			}
			else if (item.itemType == "bookSection" || item.itemType == "conferencePaper" || item.itemType == "encyclopediaArticle") {
				mods.relatedItem.originInfo.issuance = "monographic";
				if (item.itemType == "bookSection") {
					mods.relatedItem.genre += <genre authority="marcgt">book</genre>;
				} else if (item.itemType == "conferencePaper") {
					mods.relatedItem.genre += <genre authority="marcgt">conference publication</genre>;
					if (item.conferenceName) {
						mods.relatedItem.name += <name type="conference">
							<namePart>{item.conferenceName}</namePart>
							</name>;
					}
				} else if (item.itemType == "encyclopediaArticle") {
					mods.relatedItem.genre += <genre authority="marcgt">encyclopedia</genre>;
				}
			}
		}
		
		// XML tag identifier; object fields ISBN, ISSN
		if(isPartialItem) {
			var identifier = mods.relatedItem;
		} else {
			var identifier = mods;
		}
		if(item.ISBN) {
			identifier.identifier += <identifier type="isbn">{item.ISBN}</identifier>;
		}
		if(item.ISSN) {
			identifier.identifier += <identifier type="issn">{item.ISSN}</identifier>;
		}
		if(item.DOI) {
			mods.identifier += <identifier type="doi">{item.DOI}</identifier>;
		}
		
		// XML tag relatedItem.titleInfo; object field publication
		if(item.publicationTitle) {
			mods.relatedItem.titleInfo += <titleInfo><title>{item.publicationTitle}</title></titleInfo>;
		}
		
		// XML tag classification; object field callNumber
		if(item.callNumber) {
			mods.classification = item.callNumber;
		}

		// XML tag location.url; object field archiveLocation
		if(item.url) {
			mods.location.url += item.url;
			if(item.accessDate) {
				mods.location.url.@dateLastAccessed = item.accessDate;
			}
		}

		
		// XML tag location.physicalLocation; object field archiveLocation
		if(item.archiveLocation) {
			mods.location += <location><physicalLocation>{item.archiveLocation}</physicalLocation></location>;
		}
		
		// XML tag title.titleInfo; object field journalAbbreviation
		if(item.journalAbbreviation) {
			mods.relatedItem.titleInfo += <titleInfo type="abbreviated"><title>{item.journalAbbreviation}</title></titleInfo>;
		}
		
		// XML tag abstract; object field abstractNote
		if(item.abstractNote) {
			mods.abstract = item.abstractNote;
		}
		
		if(mods.relatedItem.length() == 1 && isPartialItem) {
			mods.relatedItem.@type = "host";
		}
		
		/** NOTES **/
		
		if(Zotero.getOption("exportNotes")) {
			for(var j in item.notes) {
				// Add note tag
				var note = <note type="content">{item.notes[j].note}</note>;
				mods.note += note;
			}
		}
		
		/** TAGS **/
		
		for(var j in item.tags) {
			mods.subject += <subject><topic>{item.tags[j].tag}</topic></subject>;
		}

		/** LANGUAGE **/

		if(item.language) {
			mods.language.languageTerm = <languageTerm type="text">{item.language}</languageTerm>;
		}

		/** EXTRA->NOTE **/
		if(item.extra) {
			mods.note += <note>{item.extra}</note>;
		}
		
		
		// XML tag relatedItem.titleInfo; object field series
		if(item.seriesTitle || item.series || item.seriesNumber || item.seriesText) {
			var series = <relatedItem type="series"/>;

			// eXist Solutions points out that these types are more often
			// continuing than not & will use this internally.
			// Perhaps comment this out in the main distribution, though.
			series.originInfo.issuance = "continuing";
			
			if(item.series) {
				series.titleInfo.title = item.series;
			}
			
			if(item.seriesTitle) {
				series.titleInfo.title += <title>{item.seriesTitle}</title>;
			}
			
			if(item.seriesText) {
				series.titleInfo.subTitle = item.seriesText;
			}
			
			if(item.seriesNumber) {
				series.part.detail = <detail type="volume"><number>{item.seriesNumber}</number></detail>;
			}

			// handle series editors
			for(var j in item.creators) {
				var roleTerm = "";
				if(item.creators[j].creatorType == "seriesEditor") {
					roleTerm = "pbd";
					if(item.creators[j].fieldMode == 1) {
						series.name += <name type="corporate">
							<namePart>{item.creators[j].lastName}</namePart>
							<role><roleTerm type="code" authority="marcrelator">{roleTerm}</roleTerm></role>
							</name>;
					} else {
						series.name += <name type="personal">
							<namePart type="family">{item.creators[j].lastName}</namePart>
							<namePart type="given">{item.creators[j].firstName}</namePart>
							<role><roleTerm type="code" authority="marcrelator">{roleTerm}</roleTerm></role>
							</name>;
					}
				}
			}
			
			// TODO: make this work in import
			//
			if(isPartialItem) {
				mods.relatedItem.relatedItem = series;
			} else {
				mods.relatedItem += series;
			}
		}
		
		modsCollection.mods += mods;
	}
	
	Zotero.write('<?xml version="1.0"?>'+"\n");
	Zotero.write(modsCollection.toXMLString());
}

function processIdentifiers(newItem, identifier) {
	for each(var myIdentifier in identifier) {
		if(myIdentifier.@type == "isbn") {
			var m = myIdentifier.text().toString()
					.replace(/\s*-\s*/g,'').match(/(?:[\dX]{10}|\d{13})/i);
			if(m) newItem.ISBN = m[0];
		} else if(myIdentifier.@type == "issn") {
			var m = myIdentifier.text().toString().match(/\b\d{4}\s*-?\s*\d{4}\b/);
			if(m) newItem.ISSN = m[0];
		} else if(myIdentifier.@type == "doi") {
			newItem.DOI = myIdentifier.text().toString();
		}
	}
}

function processTitle(titleInfo, m) {
	var title = titleInfo.m::title.text().toString().trim();

	if(titleInfo.m::subTitle.length()) {
		title = title.replace(/:$/,'') + ': ' + titleInfo.m::subTitle.text().toString().trim();
	}

	if(titleInfo.m::nonSort.length()) {
		title = titleInfo.m::nonSort.text().toString().trim() + ' ' + title;
	}

	return title;
}

function processCreator(name, m) {
	// TODO: institutional authors
	var creator = {};
	var backupName = new Array();
	creator.firstName = "";
	for each(var namePart in name.m::namePart) {
		if(namePart.@type == "given") {
			if(creator.firstName != "")
				creator.firstName = creator.firstName + " ";
			creator.firstName = creator.firstName + namePart.text().toString();
		} else if(namePart.@type == "family") {
			creator.lastName = namePart.text().toString();
		} else if(namePart.@type == "date" || namePart.@type == "termsOfAddress") {
			// ignore these non name types for now
		} else {
			backupName.push(namePart.text().toString());
		}
	}
	
	if(backupName.length && !creator.firstName && !creator.lastName) {
		if(name.@type == 'personal') {
			backupName = backupName.join(' ');
			//remove any possible dates
			backupName = backupName.replace(/[\[\(][^A-Za-z]*[\]\)]/g,'');
			creator = ZU.cleanAuthor(backupName, "author", true);
		} else {
			backupName = backupName.join(': ');
			creator.lastName = ZU.trimInternal(backupName);
			creator.fieldMode = 1;
		}
	}

	// look for roles
	for each(var role in name.m::role.m::roleTerm) {
		if(role.@type == 'text' || !role.@type.toString()) {
			switch(role.toLowerCase()) {
				case 'author':
				case 'editor':
				case 'contributor':
				case 'translator':
					creator.creatorType = role.toLowerCase();
					break;
			}
		} else if(role.@type == "code" && role.@authority == "marcrelator") {
			if(role == "edt") {
				creator.creatorType = "editor";
			} else if(role == "ctb") {
				creator.creatorType = "contributor";
			} else if(role == "trl") {
				creator.creatorType = "translator";
			}
		}
	}

	if(!creator.creatorType) creator.creatorType = "author";

	return creator.lastName ? creator : null;
}

function processExtent(newItem, extent) {
	//try to parse extent according to
	//http://www.loc.gov/standards/mods/v3/mods-userguide-elements.html#extent
	//i.e. http://www.loc.gov/marc/bibliographic/bd300.html
	//and http://www.loc.gov/marc/bibliographic/bd306.html
	var extentRe = new RegExp(
		'^(.*?)(?=(?:[:;]|$))' +	//extent [1]
		'(?::.*?(?=(?:;|$)))?' +	//other physical details
		'(?:;(.*))?' +				//dimensions [2]
		'$'							//make sure to capture the rest of the line
		);

	var ma = extentRe.exec(extent.text().toString());
	if(ma && ma[1]) {
		//drop supplemental info (i.e. everything after +)
		if(ma[1].indexOf('+') >= 0) {
			ma[1] = ma[1].slice(0, ma[1].indexOf('+'));
		}

		// pages
		if(!newItem.pages && ZU.fieldIsValidForType('pages', newItem.itemType)) {
			var pages = ma[1].match(/\bp(?:ages?)?\.?\s+([a-z]?\d+(?:\s*-\s*[a-z]?\d+))/i);
			if(pages) {
				newItem.pages = pages[1].replace(/\s+/,'');
			}
		}

		// volume
		if(ZU.fieldIsValidForType('volume', newItem.itemType)) {
			var volume = ma[1].match(/\bv(?:ol(?:ume)?)?\.?\s+(\d+)/i);
			if(volume) {
				newItem.volume = volume[1];
			}
		}

		//issue
		if(ZU.fieldIsValidForType('issue', newItem.itemType)) {
			var issue = ma[1].match(/\b(?:no?|iss(?:ue)?)\.?\s+(\d+)/i);
			if(issue) {
				newItem.issue = issue[1];
			}
		}

		// numPages
		if(ZU.fieldIsValidForType('numPages', newItem.itemType)) {
			var pages = ma[1].match(/(\d+)\s*p(?:ages?)?\b/i);
			if(pages) {
				newItem.numPages = pages[1];
			}
		}

		// numberOfVolumes
		if(ZU.fieldIsValidForType('numberOfVolumes', newItem.itemType)) {
			//includes volumes, scores, sound (discs, but I think there could be others)
			//video (cassette, but could have others)
			var nVol = ma[1].match(/(\d+)\s+(?:v(?:olumes?)?|scores?|sound|video)\b/i);
			if(nVol) {
				newItem.numberOfVolumes = nVol[1];
			}
		}

		// runningTime
		if(ZU.fieldIsValidForType('runningTime', newItem.itemType)) {
			//several possible formats:
			var rt;
			// 002016 = 20 min., 16 sec.
			if(rt = ma[1].match(/\b(\d{2,3})(\d{2})(\d{2})\b/)) {
				newItem.runningTime = rt[1] + ':' + rt[2] + ':' + rt[3];
			// (ca. 124 min.)
			} else if(rt = ma[1].match(/((\d+)\s*((?:hours?|hrs?)|(?:minutes?|mins?)|(?:seconds?|secs?))\.?\s+)?((\d+)\s*((?:hours?|hrs?)|(?:minutes?|mins?)|(?:seconds?|secs?))\.?\s+)?((\d+)\s*((?:hours?|hrs?)|(?:minutes?|mins?)|(?:seconds?|secs?))\.?)/i)) {
				var hrs=0, mins=0, secs=0;
				for(var i=2; i<7; i+=2) {
					if(!rt[i]) continue;

					switch(rt[i].charAt(0).toLowerCase()) {
						case 'h':
							hrs = rt[i-1];
							break;
						case 'm':
							mins = rt[i-1];
							break;
						case 's':
							secs = rt[i-1];
							break;
					}
				}

				if(secs > 59) {
					mins += secs/60;
					secs %= 60;
				}
				if(secs < 10) {
					secs = '0' + secs;
				}

				if(mins > 59) {
					hrs += hrs/60;
					mins %= 60;
				}
				if(mins < 10) {
					mins = '0' + mins;
				}

				newItem.runningTime = ( (hrs*1) ? hrs + ':' : '' ) + mins + ':' + secs;
			// (46:00)
			} else if(rt = ma[1].match(/\b(\d{0,3}:\d{1,2}:\d{2})\b/)) {
				newItem.runningTime = rt[1];								
			}
		}
	}

	// dimensions: artworkSize
	// only part of artwork right now, but maybe will be in other types in the future
	if(ma && ma[2] && ZU.fieldIsValidForType('artworkSize', newItem.itemType)) {
		//drop supplemental info (i.e. everything after +)
		if(ma[2].indexOf('+') >= 0) {
			ma[2] = ma[2].slice(0, ma[2].indexOf('+'));
		}
		//26 cm. or 33 x 15 cm. or 1/2 in. or 1 1/2 x 15/16 in.
		var dim = ma[2].match(/(?:(?:(?:\d+\s+)?\d+\/)?\d+\s*x\s*)?(?:(?:\d+\s+)?\d+\/)?\d+\s*(?:cm|mm|m|in|ft)\./i);
		if(dim) newItem.dimensions = dim[0];
	}
}

function doImport() {
	var marcGenres = {
//		"abstract or summary":XXX,
//		"abstract":XXX,
//		"summary":XXX,
		"art reproduction":"artwork",
		"article":"journalArticle",
		"autobiography":"book",
		"bibliography":"bookSection",
		"biography":"book",
		"book":"book",
//		"calendar":XXX,
//		"catalog":XXX,
		"chart":"artwork",
		"comic or graphic novel":"book",
		"comic":"book",
		"graphic novel":"book",
		"comic strip":"artwork",
		"conference publication":"conferencePaper",
//		"database":XXX,
		"dictionary":"dictionaryEntry",
		"diorama":"artwork",
//		"directory":XXX,
		"drama":"book",
		"encyclopedia":"encyclopediaArticle",
//		"essay":XXX,
		"festschrift":"book",
		"fiction":"book",
//		"filmography":XXX,
		"filmstrip":"videoRecording",
//		"findingaid":XXX,
//		"flash card":XXX,
		"folktale":"book",
//		"font":XXX,
//		"game":XXX,
		"government publication":"book",
		"graphic":"artwork",
		"globe":"map",
		"handbook":"book",
		"history":"book",
		"hymnal":"book",
		"humor,satire":"book",
		"humor":"book",
		"satire":"book",
//		"index":XXX,
//		"instruction":XXX,
//		"interview":XXX,
//		"issue":XXX,
		"journal":"journalArticle",
		"kit":"artwork",
//		"language instruction":XXX,
		"law report or digest":"journalArticle",
		"law report":"journalArticle",
		"digest":"journalArticle",
		"law digest":"journalArticle",
		"legal article":"journalArticle",
		"legal case and case notes":"case",
		"legal case":"case",
		"case notes":"case",
		"legislation":"statute",
		"loose-leaf":"manuscript",
		"map":"map",
		"memoir":"book",
		"microscope slide":"artwork",
		"model":"artwork",
//		"multivolume monograph":XXX,
		"novel":"book",
//		"numeric data":XXX,
//		"offprint":XXX,
		"online system or service":"webpage",
		"online system":"webpage",
		"service":"webpage",
		"online service":"webpage",
		"patent":"patent",
		"periodical":"journalArticle",
		"picture":"artwork",
//		"poetry":XXX,
//		"programmed text":XXX,
		"realia":"artwork",
//		"rehearsal":XXX,
//		"remote sensing image":XXX,
//		"reporting":XXX,
//		"review":XXX,
		"script":"book",
//		"series":XXX,
//		"short story":XXX,
		"slide":"artwork",
		"sound":"audioRecording",
		"speech":"audioRecording",
//		"standard or specification":XXX,
//		"standard":XXX,
//		"specification":XXX,
//		"statistics":XXX,
//		"survey of literature":XXX,
		"technical report":"report",
		"newspaper":"newspaperArticle",
		"theses":"thesis",
		"thesis":"thesis",
//		"toy":XXX,
		"transparency":"artwork",
//		"treaty":XXX,
		"videorecording":"videoRecording",
		"letter":"letter",
		"motion picture":"film",
		"art original":"artwork",
		"web site":"webpage",
		"yearbook":"book"
	};
	
	var dctGenres = {
		//"collection":XXX,
		//"dataset":XXX,
		//"event":XXX,
		"image":"artwork",
		"interactiveresource":"webpage",
		//"model":XXX,
		"movingimage":"videoRecording",
		//"physical object":XXX,
		//"place":XXX,
		//"resource":XXX,
		//"service":XXX,
		"software":"computerProgram",
		"sound":"audioRecording",
		"stillimage":"artwork"
		//"text":XXX
	};

	var modsTypeOfResources = {
		//"text":XXX,
		"cartographic":"map",
		//"notated music":XXX,
		"sound recording-musical":"audioRecording",
		"sound recording-nonmusical":"audioRecording",
		"sound recording":"audioRecording",
		"still image":"artwork",
		"moving image":"videoRecording",
		//"three dimensional object":XXX,
		"software, multimedia":"computerProgram"
	};

	var modsTypeRegex = {
	//	'artwork': 
	//	'audioRecording': /\bmusic/i,
	//	'bill': 
		'blogPost': /\bblog/i,
	//	'book': 
	//	'bookSection': 
	//	'case': 
	//	'computerProgram': 
	//	'conferencePaper': 
	//	'dictionaryEntry': 
	//	'email': 
	//	'encyclopediaArticle': 
	//	'film': 
	//	'forumPost': 
	//	'hearing': 
	//	'instantMessage': 
	//	'interview': 
		'journalArticle': /journal\s*article/i,
	//	'letter': 
		'magazineArticle': /magazine\s*article/i,
	//	'manuscript': 
	//	'map': 
		'newspaperArticle': /newspaper\*article/i
	//	'patent': 
	//	'podcast': 
	//	'presentation': 
	//	'radioBroadcast': 
	//	'report': 
	//	'statute': 
	//	'thesis': 
	//	'tvBroadcast': 
	//	'videoRecording': 
	//	'webpage': 
	}

	var modsInternetMediaTypes = {
		//a ton of types listed at http://www.iana.org/assignments/media-types/index.html
		'text/html': 'webpage'
	}

	// parse with E4X
	var m = new Namespace("http://www.loc.gov/mods/v3");
	// why does this default namespace declaration not work!?
	default xml namespace = m;
	var xml = Zotero.getXML();
	
	if(xml.m::mods.length()) {
		var modsElements = xml.m::mods;
		var nModsElements = modsElements.length();
	} else {
		var modsElements = [xml];
		var nModsElements = 1;
	}
	
	var i = 0;
	for each(var mods in modsElements) {
		var newItem = new Zotero.Item();
		
		// title
		for each(var titleInfo in mods.m::titleInfo) {
			// dropping other title types so they don't overwrite the main title
			// we have same behaviour in the MARC translator
			if(!titleInfo.@type.toString()) { 
				if(titleInfo.m::title.length()) {
					newItem.title = processTitle(titleInfo, m);
				} else {
					newItem.title = titleInfo.*.text(); // including text from sub elements
				}
			}
		}
		// try to get genre from local genre
		for each(var genre in mods.m::genre) {
			var genreStr = genre.text().toString().trim().toLowerCase();
			if(genre.@authority == "local" && Zotero.Utilities.itemTypeExists(genre.text().toString())) {
				newItem.itemType = genre.text().toString();
			} else if(!newItem.itemType && (genre.@authority == "marcgt" || genre.@authority == "marc")) {
				// otherwise, look at the marc genre
				newItem.itemType = marcGenres[genreStr];
			} else if(!newItem.itemType && (genre.@authority == "dct")) {
				// otherwise, look at the dct genre
				newItem.itemType = dctGenres[genreStr.replace(/\s+/g,"")];
			} else {
				// in case authority was not defined, go through all of the lists anyway
				newItem.itemType = marcGenres[genreStr] ||
									dctGenres[genreStr];
			}

			// try some regex matching
			if(!newItem.itemType) {
				for(var type in modsTypeRegex) {
					if(modsTypeRegex[type].exec(genreStr)) {
						newItem.itemType = type;
						break;
					}
				}
			}

			if(newItem.itemType) {
				break;
			}
		}

		if(!newItem.itemType) {
			//try to get type information from typeOfResource
			for each(var typeOfResource in mods.m::typeOfResource) {
				newItem.itemType = modsTypeOfResources[typeOfResource.text().toString()];
				//try some regex matching
				if(!newItem.itemType) {
					for(var type in modsTypeRegex) {
						if(modsTypeRegex[type].exec(typeOfResource.text().toString().trim())) {
							newItem.itemType = type;
							break;
						}
					}
				}

				if(newItem.itemType) break;
			}
			var hasHost = false;
			var periodical = false;
			if(!newItem.itemType) {
				// try to get genre data from host
				for each(var relatedItem in mods.m::relatedItem) {
					if(relatedItem.@type == "host") {
						hasHost = true;
						for each(var genre in relatedItem.m::genre) {
							if(genre.@authority == "marcgt" || genre.@authority == "marc") {
								newItem.itemType = marcGenres[genre.text().toString()];
								break;
							}
						}
						//figure out if it's a periodical
						for each(var issuance in relatedItem.m::originInfo.m::issuance) {
							switch(issuance.text().toString().trim().toLowerCase()) {
								case 'continuing':
								case 'serial':
									periodical = true;
							}
						}
					}
				}
			}

			if(!newItem.itemType) {
				//try physicalDescription/internetMediaType
				for each(var type in mods.m::physicalDescription.m::internetMediaType) {
					newItem.itemType = modsInternetMediaTypes[type.text().toString().trim().toLowerCase()];
					if(newItem.itemType) break;
				}
			}

			//as a last resort, if it has a host, let's set it to book chapter,
			//so we can import more info. Otherwise default to document
			if(!newItem.itemType) {
				if(hasHost) {
					if(periodical) newItem.itemType = 'journalArticle';
					else newItem.itemType = 'bookSection';
				} else {
					newItem.itemType = "document";
				}
			}
		}
		
		var isPartialItem = partialItemTypes.indexOf(newItem.itemType) !== -1;
		
		// TODO: thesisType, type
		
		for each(var name in mods.m::name) {
			var creator = processCreator(name, m);
			if(creator) {
				newItem.creators.push(creator);
			}
		}
		
		// source
		newItem.source = mods.m::recordInfo.m::recordContentSource.text().toString();
		// accessionNumber
		newItem.accessionNumber = mods.m::recordInfo.m::recordIdentifier.text().toString();
		// rights
		newItem.rights = mods.m::accessCondition.text().toString();
		
		/** SUPPLEMENTAL FIELDS **/
		
		var part = false, originInfo = false;
		
		// series
		for each(var relatedItem in mods.m::relatedItem) {
			if(relatedItem.@type == "host") {
				for each(var titleInfo in relatedItem.m::titleInfo) {
					if(titleInfo.@type == "abbreviated") {
						newItem.journalAbbreviation = processTitle(titleInfo, m);
						if(!newItem.publicationTitle) newItem.publicationTitle = newItem.journalAbbreviation;
					} else {
						newItem.publicationTitle = processTitle(titleInfo, m);
					}
				}
				//possible editors
				for each(var editor in relatedItem.m::name) {
					var creator = processCreator(editor, m);
					if(creator) {
						newItem.creators.push(creator);
					}
				}

				part = relatedItem.m::part;
				originInfo = relatedItem.m::originInfo;
				processIdentifiers(newItem, relatedItem.m::identifier);
			} else if(relatedItem.@type == "series") {
				newItem.series = relatedItem.m::titleInfo.m::title.text().toString();
				newItem.seriesTitle = relatedItem.m::titleInfo.m::partTitle.text().toString();
				newItem.seriesText = relatedItem.m::titleInfo.m::subTitle.text().toString();
				newItem.seriesNumber = relatedItem.m::titleInfo.m::partNumber.text().toString();
			}
		}
		
		// get part
		if(!part || !part.length()) {
			part = mods.m::part;
			originInfo = mods.m::originInfo;
		} else if(!originInfo.length()) {
			originInfo = mods.m::originInfo;
		}
		
		if(part) {
			for each(var detail in part.m::detail) {
				// volume
				if(detail.@type == "volume") {
					newItem.volume = detail.m::number.text().toString();
					if(!newItem.volume) {
						newItem.volume = detail.m::text.text().toString();
					}
				}
				
				// number
				if(detail.@type == "issue") {
					newItem.issue = detail.m::number.text().toString();
					if(!newItem.issue) {
						newItem.issue = detail.m::text.text().toString();
					}
				}
				
				// section
				if(detail.@type == "section") {
					newItem.section = detail.m::number.text().toString();
					if(!newItem.section) {
						newItem.section = detail.m::text.text().toString();
					}
				}
			}

			// pages
			for each(var extent in part.m::extent) {
				if(extent.@unit == "pages" || extent.@unit == "page") {
					var pagesStart = extent.m::start.text().toString();
					var pagesEnd = extent.m::end.text().toString();
					if(pagesStart || pagesEnd) {
						if(pagesStart == pagesEnd) {
							newItem.pages = pagesStart;
						} else if(pagesStart && pagesEnd) {
							newItem.pages = pagesStart+"-"+pagesEnd;
						} else {
							newItem.pages = pagesStart+pagesEnd;
						}
					}
				} else {
					processExtent(newItem, extent);
				}
			}

			// date
			for each(var date in part.m::date) {
				if(date.@point == 'end' && !newItem.date) {
					newItem.date = date.text().toString();
				} else if(!date.@point.toString()) {
					newItem.date = date.text().toString();
					//prefer structured dates
					if(date.@encoding.toString()) break;
				}
			}
		}

		//physical description
		if(mods.m::physicalDescription.length()) {
			for each(var extent in mods.m::physicalDescription.m::extent) {
				processExtent(newItem, extent);
			}
		}

		// identifier
		processIdentifiers(newItem, mods.m::identifier);
		// edition
		newItem.edition = originInfo.m::edition.text().toString();
		// place
		for each(var placeTerm in originInfo.m::place.m::placeTerm) {
			if(placeTerm.@type == "text") {
				newItem.place = placeTerm.text().toString();
			}
		}
		// publisher/distributor
		if(originInfo.m::publisher.length()) {
			newItem.publisher = originInfo.m::publisher[0].text().toString();
			if(newItem.itemType == "webpage" && !newItem.publicationTitle) {
				newItem.publicationTitle = newItem.publisher;
			}
		}
		// date
		if(originInfo.m::copyrightDate.length()) {
			newItem.date = originInfo.m::copyrightDate[0].text().toString();
		} else if(originInfo.m::dateIssued.length()) {
			for each(var date in originInfo.m::dateIssued) {
				if(date.@point == 'end' && !newItem.date) {
					newItem.date = date.text().toString();
				} else if(!date.@point.toString()) {
					newItem.date = date.text().toString();
					if(date.@encoding.toString()) break;
				}
			}
		} else if(originInfo.m::dateCreated.length()) {
			newItem.date = originInfo.m::dateCreated[0].text().toString();
		}
		// lastModified
		newItem.lastModified = originInfo.m::dateModified.text().toString();
		// accessDate
		newItem.accessDate = originInfo.m::dateCaptured.text().toString();
		
		// call number
		newItem.callNumber = mods.m::classification.text().toString();
		// archiveLocation
		var loc = new Array();
		for each(var location in mods.m::location.m::physicalLocation) {
			loc.push(location.text().toString());
		}
		if(loc.length) newItem.archiveLocation = loc.join('; ');

		// attachments and url
		for each(var url in mods.m::location.m::url) {
			var value = url.text().toString();
			if (url.@access == "raw object") {
				var filetitle;
				if (url.@displayLabel){
					filetitle = url.@displayLabel.toString();
				} else {
					filetitle = "Attachment";
				}
				if (value.substr(-4,4)==".pdf") {
					newItem.attachments.push({url:value, mimeType:"application/pdf", title:filetitle, downloadable:true});
				} else {
					newItem.attachments.push({url:value, title:filetitle, downloadable:true});
				}
			} else {
				newItem.url = value;
			}
		}
		// abstract
		newItem.abstractNote = mods.m::abstract.text().toString();
		
		/** NOTES **/
		for each(var note in mods.m::note) {
			newItem.notes.push({ note:
				(note.@type.toString()?note.@type.toString() + ': ':'') +
				note.text().toString()
			});
		}

		// ToC - goes into notes
		for each(var toc in mods.m::tableOfContents) {
			newItem.notes.push({note:'Table of Contents: ' + toc.text().toString()});
		}

		/** TAGS **/
		for each(var subject in mods.m::subject.m::topic) {
			newItem.tags.push(ZU.trimInternal(subject.text().toString()));
		}

		// scale
		if(ZU.fieldIsValidForType('scale', newItem.itemType)) {
			var scale = mods.m::subject.m::cartographics.m::scale.text()
						.toString().match(/1\s*:\s*\d+(?:,\d+)/);
			if(scale) {
				newItem.scale = scale[0];
			}
		}
		
		// Language
		// create an array of languages
		var languages = new Array();
		for each(var language in mods.m::language) {
			var code = false;
			for each(var term in language.m::languageTerm) {
				if (term.@type == "text") {
					languages.push(term.text().toString());
					code = false;
					break;
				// code authorities should be used, not ignored
				// but we ignore them for now
				} else if (term.@type == "code" || term.@authority) {
					code = term.text().toString();
				}
			}
			// If we have a code or text content of the node
			// (prefer the former), then we add that
			if (code || (code = language.text().toString())) {
				languages.push(code);
			}
		}
		// join the list separated by semicolons & add it to zotero item
		newItem.language = languages.join('; ');
		
		Zotero.setProgress(i++/nModsElements*100);
		newItem.complete();
	}
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<modsCollection xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns=\"http://www.loc.gov/mods/v3\" xsi:schemaLocation=\"http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-3.xsd\">\n<mods version=\"3.3\">\n     <titleInfo>\n \t \t<title>FranUlmer.com -- Home Page</title>\n \t</titleInfo>\n \t<titleInfo type=\"alternative\"><title>Fran Ulmer, Democratic candidate for Governor, Alaska, 2002</title>\n \t</titleInfo>\n \t<name type=\"personal\">\n \t \t<namePart>Ulmer, Fran</namePart>\n \t</name>\n \t<genre>Web site</genre>\n \t<originInfo>\n \t \t<dateCaptured point=\"start\" encoding=\"iso8601\">20020702 </dateCaptured>\n \t \t<dateCaptured point=\"end\" encoding=\"iso8601\"> 20021203</dateCaptured>\n \t</originInfo>\n \t<language>\n \t \t<languageTerm authority=\"iso639-2b\">eng</languageTerm>\n \t</language>\n \t<physicalDescription>\n \t \t<internetMediaType>text/html</internetMediaType>\n \t \t<internetMediaType>image/jpg</internetMediaType>\n \t</physicalDescription>\n \t<abstract>Web site promoting the candidacy of Fran Ulmer, Democratic candidate for Governor, Alaska, 2002. Includes candidate biography, issue position statements, campaign contact information, privacy policy and campaign news press releases. Site features enable visitors to sign up for campaign email list, volunteer, make campaign contributions and follow links to other internet locations. </abstract>\n \t<subject>\n \t \t<topic>Elections</topic>\n \t \t<geographic>Alaska</geographic>\n \t</subject>\n \t<subject>\n \t \t<topic>Governors</topic>\n \t \t<geographic>Alaska</geographic>\n \t \t<topic>Election</topic>\n \t</subject>\n \t<subject>\n \t \t<topic>Democratic Party (AK)</topic>\n \t</subject>\n \t<relatedItem type=\"host\">\n \t \t<titleInfo>\n \t \t \t<title>Election 2002 Web Archive</title>\n \t \t</titleInfo>\n \t \t<location>\n \t \t \t<url>http://www.loc.gov/minerva/collect/elec2002/</url>\n \t \t</location>\n \t</relatedItem>\n \t<location>\n \t \t<url displayLabel=\"Active site (if available)\">http://www.franulmer.com/</url>\n \t</location>\n \t<location>\n \t \t<url displayLabel=\"Archived site\">http://wayback-cgi1.alexa.com/e2002/*/http://www.franulmer.com/</url>\n \t</location>\n</mods>\n</modsCollection>",
		"items": [
			{
				"itemType": "webpage",
				"creators": [
					{
						"firstName": "Fran",
						"lastName": "Ulmer",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Elections",
					"Governors",
					"Election",
					"Democratic Party (AK)"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "FranUlmer.com -- Home Page",
				"publicationTitle": "Election 2002 Web Archive",
				"accessDate": "20020702  20021203",
				"url": "http://wayback-cgi1.alexa.com/e2002/*/http://www.franulmer.com/",
				"abstractNote": "Web site promoting the candidacy of Fran Ulmer, Democratic candidate for Governor, Alaska, 2002. Includes candidate biography, issue position statements, campaign contact information, privacy policy and campaign news press releases. Site features enable visitors to sign up for campaign email list, volunteer, make campaign contributions and follow links to other internet locations.",
				"language": "eng"
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<modsCollection xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns=\"http://www.loc.gov/mods/v3\" xsi:schemaLocation=\"http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-3.xsd\">\n<mods version=\"3.3\">\n     <titleInfo>\n \t \t<title>At Gettysburg, or, What a Girl Saw and Heard of the Battle: A True Narrative</title>\n \t</titleInfo>\n \t<name type=\"personal\">\n \t \t<namePart>Alleman, Tillie Pierce [1848-1914]</namePart>\n \t \t<role>\n \t \t \t<roleTerm type=\"code\" authority=\"marcrelator\">aut</roleTerm>\n \t \t \t<roleTerm type=\"text\" authority=\"marcrelator\">Author</roleTerm>\n \t \t</role>\n \t</name>\n \t<typeOfResource>text</typeOfResource>\n \t<originInfo>\n \t \t<place>\n \t \t \t<placeTerm type=\"text\">New York</placeTerm>\n \t \t</place>\n \t \t<publisher>W. Lake Borland</publisher>\n \t \t<dateIssued keyDate=\"yes\" encoding=\"w3cdtf\">1889</dateIssued>\n \t</originInfo>\n \t<language>\n \t \t<languageTerm authority=\"iso639-2b\">eng</languageTerm>\n \t \t<languageTerm type=\"text\">English</languageTerm>\n \t</language>\n \t<physicalDescription>\n \t \t<internetMediaType>text/html</internetMediaType>\n \t \t<digitalOrigin>reformatted digital</digitalOrigin>\n \t</physicalDescription>\n \t<subject authority=\"lcsh\">\n \t \t<topic >Gettysburg, Battle of, Gettysburg, Pa., 1863</topic>\n \t</subject>\n \t<subject authority=\"lcsh\">\n \t \t<topic>Gettysburg (Pa.) -- History -- Civil War, 1861-1865</topic>\n \t</subject>\n \t<subject authority=\"lcsh\">\n \t \t<topic>United States -- History -- Civil War, 1861-1865 -- Campaigns</topic>\n \t</subject>\n \t<classification authority=\"lcc\">E475.53 .A42</classification>\n \t<relatedItem type=\"host\">\n \t \t<titleInfo type=\"uniform\" authority=\"dlfaqcoll\">\n \t \t \t<title>A Celebration of Women Writers: Americana</title>\n \t \t</titleInfo>\n \t</relatedItem>\n \t<location>\n \t \t<url usage=\"primary display\" access=\"object in context\"> http://digital.library.upenn.edu/women/alleman/gettysburg/gettysburg.html\n</url>\n \t</location>\n \t<accessCondition> Personal, noncommercial use of this item is permitted in the United States of America. Please see http://digital.library.upenn.edu/women/ for other rights and restrictions that may apply to this resource.\n</accessCondition>\n<recordInfo>\n \t<recordSource>University of Pennsylvania Digital Library</recordSource>\n \t<recordOrigin> MODS auto-converted from a simple Online Books Page metadata record. For details, see http://onlinebooks.library.upenn.edu/mods.html </recordOrigin>\n \t<languageOfCataloging>\n \t \t<languageTerm type=\"code\" authority=\"iso639-2b\">eng</languageTerm>\n \t</languageOfCataloging>\n</recordInfo>\n</mods>\n</modsCollection>",
		"items": [
			{
				"itemType": "webpage",
				"creators": [
					{
						"firstName": "Tillie Pierce",
						"lastName": "Alleman",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Gettysburg, Battle of, Gettysburg, Pa., 1863",
					"Gettysburg (Pa.) -- History -- Civil War, 1861-1865",
					"United States -- History -- Civil War, 1861-1865 -- Campaigns"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "At Gettysburg, or, What a Girl Saw and Heard of the Battle: A True Narrative",
				"rights": "Personal, noncommercial use of this item is permitted in the United States of America. Please see http://digital.library.upenn.edu/women/ for other rights and restrictions that may apply to this resource.",
				"publicationTitle": "A Celebration of Women Writers: Americana",
				"place": "New York",
				"publisher": "W. Lake Borland",
				"date": "1889",
				"callNumber": "E475.53 .A42",
				"url": "http://digital.library.upenn.edu/women/alleman/gettysburg/gettysburg.html",
				"language": "English"
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<modsCollection xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns=\"http://www.loc.gov/mods/v3\" xsi:schemaLocation=\"http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-3.xsd\">\n<mods version=\"3.3\">\n     <titleInfo>\n \t \t<title>Telescope Peak from Zabriskie Point</title>\n \t</titleInfo>\n \t<titleInfo type=\"alternative\" >\n \t \t<title>Telescope PK from Zabriskie Pt.</title>\n \t</titleInfo>\n \t<name type=\"personal\">\n \t \t<namePart type=\"family\">Cushman</namePart>\n \t \t<namePart type=\"given\">Charles Weever</namePart>\n \t \t<namePart type=\"date\">1896-1972</namePart>\n \t \t<role>\n \t \t \t<roleTerm type=\"code\" authority=\"marcrelator\">pht</roleTerm>\n \t \t \t<roleTerm type=\"text\" authority=\"marcrelator\">Photographer</roleTerm>\n \t \t</role>\n \t</name>\n \t<typeOfResource>still image</typeOfResource>\n \t<genre authority=\"gmgpc\">Landscape photographs</genre>\n \t<originInfo>\n \t \t<dateCreated encoding=\"w3cdtf\" keyDate=\"yes\">1955-03-22</dateCreated>\n \t \t<copyrightDate encoding=\"w3cdtf\">2003</copyrightDate>\n \t</originInfo>\n \t<physicalDescription>\n \t \t<internetMediaType>image/jpeg</internetMediaType>\n \t \t<digitalOrigin>reformatted digital</digitalOrigin>\n \t \t<note> Original 35mm slide was digitized in 2003 as a TIFF image. Display versions in JPEG format in three sizes are available.</note>\n \t \t<note>100 f 6.3 tl</note>\n \t</physicalDescription>\n \t<subject authority=\"lctgm\">\n \t \t<topic>Mountains</topic>\n \t</subject>\n \t<subject authority=\"lctgm\">\n \t \t<topic>Snow</topic>\n \t</subject>\n \t<subject>\n \t \t<topic>Telescope Peak (Inyo County, Calif.)</topic>\n \t</subject>\n \t<subject>\n \t \t<topic>Zabriskie Point (Calif.)</topic>\n \t</subject>\n \t<subject>\n \t \t<hierarchicalGeographic>\n \t \t \t<country>United States</country>\n \t \t \t<state>California</state>\n \t \t \t<county>Inyo</county>\n \t \t</hierarchicalGeographic>\n \t</subject>\n \t<relatedItem type=\"original\">\n \t \t<originInfo>\n \t \t \t<dateCreated encoding=\"w3cdtf\" keyDate=\"yes\">1955-03-22</dateCreated>\n \t \t</originInfo>\n \t \t<physicalDescription>\n \t \t \t<form authority=\"gmd\">graphic</form>\n \t \t \t<extent>1 slide : col. ; 35mm</extent>\n \t \t \t<note>Original 35mm slide was digitized in 2003 as a TIFF image. Display versions in JPEG format in three sizes are available.</note>\n \t \t</physicalDescription>\n \t \t<location>\n \t \t \t<physicalLocation displayLabel=\"Original slide\"> Indiana University, Bloomington. University Archives P07803 </physicalLocation>\n \t \t</location>\n \t</relatedItem>\n \t<relatedItem type=\"host\">\n \t \t<titleInfo type=\"uniform\" authority=\"dlfaqcoll\">\n \t \t \t<title> Indiana University Digital Library Program: Charles W. Cushman Photograph Collection</title>\n \t \t</titleInfo>\n \t</relatedItem>\n \t<identifier displayLabel=\"Cushman number\" type=\"local\">955.11</identifier>\n \t<identifier displayLabel=\"IU Archives number\" type=\"local\">P07803</identifier>\n \t<location>\n \t \t<url>http://purl.dlib.indiana.edu/iudl/archives/cushman/P07803</url>\n \t \t<url access=\"preview\">http://quod.lib.umich.edu/m/mods/thumbs/Indiana/oai.dlib.indiana.edu/ archives/cushman/oai_3Aoai.dlib.indiana.edu_3Aarchives_5Ccushman_5CP07803.png</url>\n \t</location>\n \t<accessCondition> Copyright and reproduction rights for all Charles W. Cushman photographs are held by Indiana University and administered by the University Archives, Indiana University, Bloomington, IN 47405</accessCondition>\n \t<recordInfo>\n \t<recordContentSource>Indiana University Digital Library Program</recordContentSource>\n \t<recordCreationDate encoding=\"w3cdtf\">2004-09-09</recordCreationDate>\n \t<recordIdentifier>archives/cushman/P07803</recordIdentifier>\n \t</recordInfo>\n</mods>\n\n</modsCollection>",
		"items": [
			{
				"itemType": "artwork",
				"creators": [
					{
						"firstName": "Charles Weever",
						"lastName": "Cushman",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Mountains",
					"Snow",
					"Telescope Peak (Inyo County, Calif.)",
					"Zabriskie Point (Calif.)"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Telescope Peak from Zabriskie Point",
				"source": "Indiana University Digital Library Program",
				"accessionNumber": "archives/cushman/P07803",
				"rights": "Copyright and reproduction rights for all Charles W. Cushman photographs are held by Indiana University and administered by the University Archives, Indiana University, Bloomington, IN 47405",
				"publicationTitle": "Indiana University Digital Library Program: Charles W. Cushman Photograph Collection",
				"date": "2003",
				"url": "http://quod.lib.umich.edu/m/mods/thumbs/Indiana/oai.dlib.indiana.edu/ archives/cushman/oai_3Aoai.dlib.indiana.edu_3Aarchives_5Ccushman_5CP07803.png"
			}
		]
	},
	{
		"type": "import",
		"input": "<modsCollection xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns=\"http://www.loc.gov/mods/v3\" xsi:schemaLocation=\"http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-3.xsd\">\n<mods version=\"3.3\">\n     <titleInfo>\n \t \t<title>Hiring and recruitment practices in academic libraries</title>\n \t</titleInfo>\n \t<name type=\"personal\">\n \t \t<namePart>Raschke, Gregory K.</namePart>\n \t \t<displayForm>Gregory K. Raschke</displayForm>\n \t</name>\n \t<typeOfResource>text</typeOfResource>\n \t<genre>journal article</genre>\n \t<originInfo>\n \t \t<place>\n \t \t \t<text>Baltimore, Md.</text>\n \t \t</place>\n \t \t<publisher>Johns Hopkins University Press</publisher>\n \t \t<dateIssued>2003</dateIssued>\n \t \t<issuance>monographic</issuance>\n \t</originInfo>\n \t<language authority=\"iso639-2b\">eng</language>\n \t<physicalDescription>\n \t \t<form authority=\"marcform\">print</form>\n \t \t<extent>15 p.</extent>\n \t</physicalDescription>\n \t<abstract>\nAcademic libraries need to change their recruiting and hiring procedures to stay competitive in today's changing marketplace. By taking too long to find and to hire talented professionals in a tight labor market, academic libraries are losing out on top candidates and limiting their ability to become innovative and dynamic organizations. Traditional, deliberate, and risk-averse hiring models lead to positions remaining open for long periods, opportunities lost as top prospects find other positions, and a reduction in the overall talent level of the organization. To be more competitive and effective in their recruitment and hiring processes, academic libraries must foster manageable internal solutions, look to other professions for effective hiring techniques and models, and employ innovative concepts from modern personnel management literature. </abstract>\n \t<subject>\n \t \t<topic>College librarians</topic>\n \t \t<topic>Recruiting</topic>\n \t \t<geographic>United States</geographic>\n \t</subject>\n \t<subject>\n \t \t<topic>College librarians</topic>\n \t \t<topic>Selection and appointment</topic>\n \t \t<geographic>United States</geographic>\n \t</subject>\n \t<relatedItem type=\"host\">\n \t \t<titleInfo>\n \t \t \t<title>portal: libraries and the academy</title>\n \t \t</titleInfo>\n \t \t<part>\n \t \t \t<detail type=\"volume\">\n \t \t \t \t<number>3</number>\n \t \t \t \t<caption>vol.</caption>\n \t \t \t</detail>\n \t \t \t<detail type=\"number\">\n \t \t \t \t<number>1</number>\n \t \t \t \t<caption>no.</caption>\n \t \t \t</detail>\n \t \t \t<extent unit=\"page\">\n \t \t \t \t<start>53</start>\n \t \t \t \t<end>57</end>\n \t \t \t</extent>\n \t \t \t<date>Jan. 2003</date>\n \t \t</part>\n \t \t<identifier type=\"issn\">1531-2542</identifier>\n \t</relatedItem>\n</mods>\n\n</modsCollection>",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Gregory K",
						"lastName": "Raschke",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"College librarians",
					"Recruiting",
					"College librarians",
					"Selection and appointment"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Hiring and recruitment practices in academic libraries",
				"publicationTitle": "portal: libraries and the academy",
				"ISSN": "1531-2542",
				"volume": "3",
				"pages": "53-57",
				"date": "2003",
				"publisher": "Johns Hopkins University Press",
				"abstractNote": "Academic libraries need to change their recruiting and hiring procedures to stay competitive in today's changing marketplace. By taking too long to find and to hire talented professionals in a tight labor market, academic libraries are losing out on top candidates and limiting their ability to become innovative and dynamic organizations. Traditional, deliberate, and risk-averse hiring models lead to positions remaining open for long periods, opportunities lost as top prospects find other positions, and a reduction in the overall talent level of the organization. To be more competitive and effective in their recruitment and hiring processes, academic libraries must foster manageable internal solutions, look to other professions for effective hiring techniques and models, and employ innovative concepts from modern personnel management literature.",
				"language": "eng"
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version='1.0' encoding='UTF-8' ?>\n<mods xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"3.4\"\n  xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns=\"http://www.loc.gov/mods/v3\"\n  xsi:schemaLocation=\"http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-4.xsd\">\n\n  <titleInfo>\n    <title>Sound and fury</title>\n    <subTitle>the making of the punditocracy</subTitle>\n  </titleInfo>\n\n  <name type=\"personal\" authorityURI=\"http://id.loc.gov/authorities/names\"\n    valueURI=\"http://id.loc.gov/authorities/names/n92101908\">\n    <namePart>Alterman, Eric</namePart>\n\n    <role>\n      <roleTerm type=\"text\">creator</roleTerm>\n    </role>\n  </name>\n\n  <typeOfResource>text</typeOfResource>\n\n  <genre authority=\"marcgt\">bibliography</genre>\n\n  <originInfo>\n    <place>\n      <placeTerm authority=\"marccountry\" type=\"code\"\n        authorityURI=\"http://id.loc.gov/vocabulary/countries\"\n        valueURI=\"http://id.loc.gov/vocabulary/countries/nyu\">nyu</placeTerm>\n    </place>\n    <place>\n      <placeTerm type=\"text\">Ithaca, N.Y</placeTerm>\n    </place>\n\n    <publisher>Cornell University Press</publisher>\n    <dateIssued>c1999</dateIssued>\n    <dateIssued encoding=\"marc\">1999</dateIssued>\n    <issuance>monographic</issuance>\n  </originInfo>\n\n  <language>\n\n    <languageTerm authority=\"iso639-2b\" type=\"code\"\n      authorityURI=\"http://id.loc.gov/vocabulary/iso639-2\"\n      valueURI=\"http://id.loc.gov/vocabulary/iso639-2/eng\">eng</languageTerm>\n  </language>\n\n  <physicalDescription>\n    <form authority=\"marcform\">print</form>\n    <extent>vii, 322 p. ; 23 cm.</extent>\n  </physicalDescription>\n\n  <note type=\"statement of responsibility\">Eric Alterman.</note>\n  <note>Includes bibliographical references (p. 291-312) and index.</note>\n\n  <subject authority=\"lcsh\" authorityURI=\"http://id.loc.gov/authorities/subjects\">\n    <topic valueURI=\"http://id.loc.gov/authorities/subjects/sh85070736\">Journalism</topic>\n    <topic valueURI=\"http://id.loc.gov/authorities/subjects/sh00005651\">Political aspects</topic>\n    <geographic valueURI=\"http://id.loc.gov/authorities/names/n78095330\">United States</geographic>\n\n  </subject>\n\n  <subject authority=\"lcsh\" authorityURI=\"http://id.loc.gov/authorities/subjects\">\n    <geographic valueURI=\"http://id.loc.gov/authorities/names/n78095330\">United States</geographic>\n    <topic valueURI=\"http://id.loc.gov/authorities/subjects/sh2002011436\">Politics and\n      government</topic>\n    <temporal valueURI=\"http://id.loc.gov/authorities/subjects/sh2002012476\">20th century</temporal>\n  </subject>\n\n  <subject authority=\"lcsh\" authorityURI=\"http://id.loc.gov/authorities/subjects\"\n    valueURI=\"http://id.loc.gov/authorities/subjects/sh2008107507\">\n    <topic valueURI=\"http://id.loc.gov/authorities/subjects/sh85081863\">Mass media</topic>\n    <topic valueURI=\"http://id.loc.gov/authorities/subjects/sh00005651\">Political aspects</topic>\n    <geographic valueURI=\"http://id.loc.gov/authorities/names/n78095330\">United States</geographic>\n  </subject>\n\n  <subject authority=\"lcsh\" authorityURI=\"http://id.loc.gov/authorities/subjects\"\n    valueURI=\"http://id.loc.gov/authorities/subjects/sh2010115992\">\n    <topic valueURI=\"http://id.loc.gov/authorities/subjects/sh85133490\">Television and\n      politics</topic>\n\n    <geographic valueURI=\"http://id.loc.gov/authorities/names/n78095330\">United States</geographic>\n  </subject>\n\n  <subject authority=\"lcsh\" authorityURI=\"http://id.loc.gov/authorities/subjects\"\n    valueURI=\"http://id.loc.gov/authorities/subjects/sh2008109555\">\n    <topic valueURI=\"http://id.loc.gov/authorities/subjects/sh85106514\">Press and politics</topic>\n    <geographic valueURI=\"http://id.loc.gov/authorities/names/n78095330\">United States</geographic>\n  </subject>\n\n  <subject authority=\"lcsh\" authorityURI=\"http://id.loc.gov/authorities/subjects\">\n    <topic>Talk shows</topic>\n    <geographic valueURI=\"http://id.loc.gov/authorities/names/n78095330\">United States</geographic>\n  </subject>\n\n  <classification authority=\"lcc\">PN4888.P6 A48 1999</classification>\n  <classification edition=\"21\" authority=\"ddc\">071/.3</classification>\n\n  <identifier type=\"isbn\">0801486394 (pbk. : acid-free, recycled paper)</identifier>\n  <identifier type=\"lccn\">99042030</identifier>\n\n  <recordInfo>\n    <descriptionStandard>aacr</descriptionStandard>\n    <recordContentSource>DLC</recordContentSource>\n    <recordCreationDate encoding=\"marc\">990730</recordCreationDate>\n\n    <recordChangeDate encoding=\"iso8601\">20000406144503.0</recordChangeDate>\n    <recordIdentifier>11761548</recordIdentifier>\n    <recordOrigin>Converted from MARCXML to MODS version 3.4 using MARC21slim2MODS3-4.xsl (Revision\n      1.74), valueURIs and authorityURIs added by hand 20120123</recordOrigin>\n  </recordInfo>\n</mods>\n",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "Eric",
						"lastName": "Alterman",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "statement of responsibility: Eric Alterman."
					},
					{
						"note": "Includes bibliographical references (p. 291-312) and index."
					}
				],
				"tags": [
					"Journalism",
					"Political aspects",
					"Politics and government",
					"Mass media",
					"Political aspects",
					"Television and politics",
					"Press and politics",
					"Talk shows"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Sound and fury: the making of the punditocracy",
				"source": "DLC",
				"accessionNumber": "11761548",
				"ISBN": "0801486394",
				"place": "Ithaca, N.Y",
				"publisher": "Cornell University Press",
				"date": "1999",
				"callNumber": "PN4888.P6 A48 1999071/.3",
				"language": "eng"
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<mods xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"3.4\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns=\"http://www.loc.gov/mods/v3\" xsi:schemaLocation=\"http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-4.xsd\">\n    <titleInfo>\n\t\t<title>Models, Fantasies and Phantoms of Transition</title>\n\t</titleInfo>\n\t<name type=\"personal\">\n\t\t<namePart type=\"given\">Ash</namePart>\n\t\t<namePart type=\"family\">Amin</namePart>\n\n\t\t<role>\n\t\t\t<roleTerm type=\"text\">author</roleTerm>\n\t\t</role>\n\t</name>\n\t<typeOfResource>text</typeOfResource>\n\t<relatedItem type=\"host\">\n\t\t<titleInfo>\n\t\t\t<title>Post-Fordism</title>\n\n\t\t\t<subTitle>A Reader</subTitle>\n\t\t</titleInfo>\n\t\t<name type=\"personal\">\n\t\t\t<namePart type=\"given\">Ash</namePart>\n\t\t\t<namePart type=\"family\">Amin</namePart>\n\t\t\t<role>\n\t\t\t\t<roleTerm type=\"text\">editor</roleTerm>\n\n\t\t\t</role>\n\t\t</name>\n\t\t<originInfo>\n\t\t\t<dateIssued>1994</dateIssued>\n\t\t\t<publisher>Blackwell Publishers</publisher>\n\t\t\t<place>\n\t\t\t\t<placeTerm type=\"text\">Oxford</placeTerm>\n\n\t\t\t</place>\n\t\t</originInfo>\n\t\t<part>\n\t\t\t<extent unit=\"page\">\n\t\t\t\t<start>23</start>\n\t\t\t\t<end>45</end>\n\t\t\t</extent>\n\t\t</part>\n\n\t</relatedItem>\n\t<identifier>Amin1994a</identifier>\n</mods>",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "Ash",
						"lastName": "Amin",
						"creatorType": "author"
					},
					{
						"firstName": "Ash",
						"lastName": "Amin",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Models, Fantasies and Phantoms of Transition",
				"publicationTitle": "Post-Fordism: A Reader",
				"pages": "23-45",
				"place": "Oxford",
				"publisher": "Blackwell Publishers",
				"date": "1994"
			}
		]
	},
	{
		"type": "import",
		"input": "<mods xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"3.4\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns=\"http://www.loc.gov/mods/v3\" xsi:schemaLocation=\"http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-4.xsd\">\n    \t<titleInfo>\n\t\t\t<nonSort>The</nonSort>\n\t\t\t<title>Urban Question as a Scale Question</title>\n\t\t\t<subTitle>Reflections on Henri Lefebre, Urban Theory and the Politics of Scale</subTitle>\n\t\t</titleInfo>\n\t\t<name type=\"personal\">\n\t\t\t<namePart type=\"given\">Neil</namePart>\n\n\t\t\t<namePart type=\"family\">Brenner</namePart>\n\t\t\t<role>\n\t\t\t\t<roleTerm type=\"text\">author</roleTerm>\n\t\t\t</role>\n\t\t</name>\n\t\t<typeOfResource>text</typeOfResource>\n\t\t<genre>article</genre>\n\n\t\t<originInfo>\n\t\t\t<issuance>monographic</issuance>\n\t\t</originInfo>\n\t\t<relatedItem type=\"host\">\n\t\t\t<titleInfo>\n\t\t\t\t<title>International Journal of Urban and Regional Research</title>\n\t\t\t</titleInfo>\n\t\t\t<originInfo>\n\n\t\t\t<issuance>continuing</issuance>\n\t\t</originInfo>\n\t\t\t<part>\n\t\t\t\t<detail type=\"volume\">\n\t\t\t\t\t<number>24</number>\n\t\t\t\t</detail>\n\t\t\t\t<detail type=\"issue\">\n\t\t\t\t\t<number>2</number>\n\n\t\t\t\t\t<caption>no.</caption>\n\t\t\t\t</detail>\n\t\t\t\t<extent unit=\"pages\">\n\t\t\t\t\t<start>361</start>\n\t\t\t\t\t<end>378</end>\n\t\t\t\t</extent>\n\t\t\t\t<date>2000</date>\n\n\t\t\t</part>\n\t\t</relatedItem>\n\t\t<identifier>BrennerN2000a</identifier>\n\t</mods>",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Neil",
						"lastName": "Brenner",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "The Urban Question as a Scale Question: Reflections on Henri Lefebre, Urban Theory and the Politics of Scale",
				"publicationTitle": "International Journal of Urban and Regional Research",
				"volume": "24",
				"issue": "2",
				"pages": "361-378",
				"date": "2000"
			}
		]
	},
	{
		"type": "import",
		"input": "<mods xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"3.4\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns=\"http://www.loc.gov/mods/v3\" xsi:schemaLocation=\"http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-4.xsd\">\n    \t<titleInfo>\n\t\t\t<title>Fifth-Grade Boys' Decisions about Participation in Sports Activities</title>\n\t\t</titleInfo>\n\t\t<name type=\"personal\">\n\t\t\t<namePart type=\"family\">Conley</namePart>\n\t\t\t<namePart type=\"given\">Alice</namePart>\n\t\t\t<role>\n\n\t\t\t\t<roleTerm type=\"text\">author</roleTerm>\n\t\t\t</role>\n\t\t</name>\n\t\t<typeOfResource>text</typeOfResource>\n\t\t<relatedItem type=\"host\">\n\t\t\t<titleInfo>\n\t\t\t\t<title>Non-subject-matter Outcomes of Schooling</title>\n\n\t\t\t</titleInfo>\n\t\t\t<name>\n\t\t\t\t<namePart>Good, Thomas L.</namePart>\n\t\t\t\t<role>\n\t\t\t\t\t<roleTerm>editor</roleTerm>\n\t\t\t\t</role>\n\t\t\t</name>\n\t\t\t<note type=\"statement of responsibility\">ed.  Thomas L. Good</note>\n\n\t\t\t<originInfo>\n\t\t\t\t<issuance>continuing</issuance>\n\t\t\t</originInfo>\n\t\t\t<part>\n\t\t\t\t<detail type=\"title\">\n\t\t\t\t\t<title>Special issue, Elementary School Journal</title>\n\t\t\t\t</detail>\n\t\t\t\t<detail type=\"volume\">\n\n\t\t\t\t\t<number>99</number>\n\t\t\t\t</detail>\n\t\t\t\t<detail type=\"issue\">\n\t\t\t\t\t<number>5</number>\n\t\t\t\t\t<caption>no.</caption>\n\t\t\t\t</detail>\n\t\t\t\t<extent unit=\"pages\">\n\n\t\t\t\t\t<start>131</start>\n\t\t\t\t\t<end>146</end>\n\t\t\t\t</extent>\n\t\t\t\t<date>1999</date>\n\t\t\t</part>\n\t\t</relatedItem>\n\t</mods>",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Alice",
						"lastName": "Conley",
						"creatorType": "author"
					},
					{
						"firstName": "",
						"lastName": "Good, Thomas L.",
						"fieldMode": 1,
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Fifth-Grade Boys' Decisions about Participation in Sports Activities",
				"publicationTitle": "Non-subject-matter Outcomes of Schooling",
				"volume": "99",
				"issue": "5",
				"pages": "131-146",
				"date": "1999"
			}
		]
	},
	{
		"type": "import",
		"input": "<mods xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"3.4\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns=\"http://www.loc.gov/mods/v3\" xsi:schemaLocation=\"http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-4.xsd\">\n    <titleInfo>\n\t\t<title>2700 MHz observations of 4c radio sources in the declination zone +4 to -4</title>\n\t</titleInfo>\n\t<name type=\"personal\">\n\t\t<namePart type=\"family\">Wall</namePart>\n\t\t<namePart type=\"given\">J. V.</namePart>\n\t\t<role>\n\n\t\t\t<roleTerm type=\"text\">author</roleTerm>\n\t\t</role>\n\t</name>\n\t<typeOfResource>text</typeOfResource>\n\t<relatedItem type=\"host\">\n\t<titleInfo>\n\t\t<title>Australian Journal of Physics and Astronphysics</title>\n\n\t</titleInfo>\n\t\t<titleInfo type=\"abbreviated\">\n\t\t\t<title>Australian J. Phys. Astronphys.</title>\n\t\t</titleInfo>\n\t\t<originInfo>\n\t\t\t<issuance>continuing</issuance>\n\t\t</originInfo>\n\t\t<genre>academic journal</genre>\n\n\t\t<part>\n\t\t\t<detail type=\"supplement\">\n\t\t\t\t<caption>Suppl. no.</caption>\n\t\t\t\t<number>20</number>\n\t\t\t</detail>\n\t\t\t<date>1971</date>\n\t\t</part>\n\n\t</relatedItem>\n</mods>",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "J. V.",
						"lastName": "Wall",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "2700 MHz observations of 4c radio sources in the declination zone +4 to -4",
				"publicationTitle": "Australian Journal of Physics and Astronphysics",
				"journalAbbreviation": "Australian J. Phys. Astronphys.",
				"date": "1971"
			}
		]
	},
	{
		"type": "import",
		"input": "<mods xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"3.0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns=\"http://www.loc.gov/mods/v3\" xsi:schemaLocation=\"http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-0.xsd\">\n    \t<titleInfo>\n\t\t\t<title>Emergence and Dissolvence in the Self-Organization of Complex Systems</title>\n\t\t</titleInfo>\n\t\t<name type=\"personal\">\n\t\t\t<namePart type=\"family\">Testa</namePart>\n\t\t\t<namePart type=\"given\">Bernard</namePart>\n\t\t\t<role>\n\n\t\t\t\t<roleTerm>author</roleTerm>\n\t\t\t</role>\n\t\t</name>\n\t\t<name type=\"personal\">\n\t\t\t<namePart type=\"family\">Kier</namePart>\n\t\t\t<namePart type=\"given\">Lamont B.</namePart>\n\t\t\t<role>\n\n\t\t\t\t<roleTerm>author</roleTerm>\n\t\t\t</role>\n\t\t</name>\n\t\t<typeOfResource>text</typeOfResource>\n\t\t<identifier type=\"uri\">http://www.mdpi.org/entropy/papers/e2010001.pdf</identifier>\n\t\t<relatedItem type=\"host\">\n\t\t\t<titleInfo>\n\n\t\t\t\t<title>Entropy</title>\n\t\t\t</titleInfo>\n\t\t\t<originInfo>\n\t\t\t\t<issuance>continuing</issuance>\n\t\t\t</originInfo>\n\t\t\t<part>\n\t\t\t\t<detail type=\"volume\">\n\t\t\t\t\t<number>2</number>\n\n\t\t\t\t</detail>\n\t\t\t\t<detail type=\"issue\">\n\t\t\t\t\t<caption>no.</caption>\n\t\t\t\t\t<number>1</number>\n\t\t\t\t</detail>\n\t\t\t\t<extent unit=\"pages\">\n\t\t\t\t\t<start>17</start>\n\n\t\t\t\t\t<end>17</end>\n\t\t\t\t</extent>\n\t\t\t\t<date>2000</date>\n\t\t\t</part>\n\t\t</relatedItem>\n\t</mods>",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Bernard",
						"lastName": "Testa",
						"creatorType": "author"
					},
					{
						"firstName": "Lamont B.",
						"lastName": "Kier",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Emergence and Dissolvence in the Self-Organization of Complex Systems",
				"publicationTitle": "Entropy",
				"volume": "2",
				"issue": "1",
				"pages": "17",
				"date": "2000"
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<mods xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"3.4\"\n    xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns=\"http://www.loc.gov/mods/v3\"\n\txsi:schemaLocation=\"http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-4.xsd\">\n\n\t<titleInfo>\n\t\t<title>3 Viennese arias :</title>\n\t\t<subTitle>for soprano, obbligato clarinet in B flat, and piano</subTitle>\n\t</titleInfo>\n\n\t<name type=\"personal\" authorityURI=\"http://id.loc.gov/authorities/names\"\n\t\tvalueURI=\"http://id.loc.gov/authorities/names/n81100426\">\n\t\t<namePart>Lawson, Colin (Colin James)</namePart>\n\n\t</name>\n\n\t<typeOfResource>notated music</typeOfResource>\n\n\t<originInfo>\n\t\t<place>\n\t\t\t<placeTerm authority=\"marccountry\" type=\"code\"\n\t\t\t\tauthorityURI=\"http://id.loc.gov/vocabulary/countries\"\n\t\t\t\tvalueURI=\"http://id.loc.gov/vocabulary/countries/enk\">enk</placeTerm>\n\t\t</place>\n\t\t<place>\n\n\t\t\t<placeTerm type=\"text\">London</placeTerm>\n\t\t</place>\n\t\t<publisher>Nova Music</publisher>\n\t\t<dateIssued>c1984</dateIssued>\n\t\t<dateIssued encoding=\"marc\">1984</dateIssued>\n\t\t<issuance>monographic</issuance>\n\n\t</originInfo>\n\n\t<language>\n\t\t<languageTerm authority=\"iso639-2b\" type=\"code\"\n\t\t\tauthorityURI=\"http://id.loc.gov/vocabulary/iso639-2\"\n\t\t\tvalueURI=\"http://id.loc.gov/vocabulary/iso639-2/ita\">ita</languageTerm>\n\t</language>\n\t<language objectPart=\"libretto\">\n\t\t<languageTerm type=\"code\" authority=\"iso639-2b\">eng</languageTerm>\n\t</language>\n\n\t<physicalDescription>\n\t\t<form authority=\"marcform\">print</form>\n\t\t<extent>1 score (12 p.) + 2 parts ; 31 cm.</extent>\n\t</physicalDescription>\n\n\t<tableOfContents>Tutto in pianto il cor struggete / Emperor Joseph I -- E sempre inquieto quel\n\t\tcore infelice : from Endimione / G. Bononcini -- L'adorata genitrice : from Muzio [i.e.\n\t\tMutio] Scevola / G. Bononcini.</tableOfContents>\n\n\t<note type=\"statement of responsibility\">G.B. Bononcini and Emperor Joseph I ; edited by Colin\n\t\tLawson.</note>\n\n\t<note>Opera excerpts.</note>\n\t<note>Acc. arr. for piano; obbligato for the 2nd-3rd excerpts originally for chalumeau.</note>\n\t<note>Italian words.</note>\n\t<note>Cover title.</note>\n\t<note>The 1st excerpt composed for inclusion in M.A. Ziani's Chilonida.</note>\n\t<note>Texts with English translations on cover p. [2].</note>\n\n\t<subject authority=\"lcsh\" authorityURI=\"http://id.loc.gov/authorities/subjects\"\n\t\tvalueURI=\"http://id.loc.gov/authorities/subjects/sh2008108658\">\n\t\t<topic valueURI=\"http://id.loc.gov/authorities/subjects/sh85094914\">Operas</topic>\n\t\t<genre valueURI=\"http://id.loc.gov/authorities/subjects/sh99001548\">Excerpts,\n\t\t\tArranged</genre>\n\t\t<genre valueURI=\"http://id.loc.gov/authorities/subjects/sh99001780\">Scores and parts</genre>\n\t</subject>\n\n\t<subject authority=\"lcsh\" authorityURI=\"http://id.loc.gov/authorities/subjects\">\n\n\t\t<topic valueURI=\"http://id.loc.gov/authorities/subjects/sh85125142\">Songs (High voice) with\n\t\t\tinstrumental ensemble</topic>\n\t\t<genre valueURI=\"http://id.loc.gov/authorities/subjects/sh99001780\">Scores and parts</genre>\n\t</subject>\n\n\t<classification authority=\"lcc\">M1506 .A14 1984</classification>\n\n\t<relatedItem type=\"series\">\n\t\t<titleInfo>\n\n\t\t\t<title>Music for voice and instrument</title>\n\t\t</titleInfo>\n\t</relatedItem>\n\n\t<relatedItem type=\"constituent\">\n\t\t<titleInfo type=\"uniform\" authorityURI=\"http://id.loc.gov/authorities/names\"\n\t\t\tvalueURI=\"http://id.loc.gov/authorities/names/no97083914\">\n\t\t\t<title>Tutto in pianto il cor struggete</title>\n\t\t</titleInfo>\n\n\t\t<name type=\"personal\" authorityURI=\"http://id.loc.gov/authorities/names\"\n\t\t\tvalueURI=\"http://id.loc.gov/authorities/names/n79055650\">\n\t\t\t<namePart>Joseph I, Holy Roman Emperor,</namePart>\n\t\t\t<namePart type=\"date\">1678-1711</namePart>\n\t\t</name>\n\t</relatedItem>\n\n\t<relatedItem type=\"constituent\">\n\t\t<titleInfo type=\"uniform\" authorityURI=\"http://id.loc.gov/authorities/names\"\n\t\t\tvalueURI=\"http://id.loc.gov/authorities/names/n85337311\">\n\n\t\t\t<title>Endimione.</title>\n\t\t\t<partName>E sempre inquieto quel core infelice.</partName>\n\t\t</titleInfo>\n\t\t<name type=\"personal\" authorityURI=\"http://id.loc.gov/authorities/names\"\n\t\t\tvalueURI=\"http://id.loc.gov/authorities/names/n81005197\">\n\t\t\t<namePart>Bononcini, Giovanni,</namePart>\n\t\t\t<namePart type=\"date\">1670-1747</namePart>\n\t\t</name>\n\n\t</relatedItem>\n\n\t<relatedItem type=\"constituent\">\n\t\t<titleInfo type=\"uniform\" authorityURI=\"http://id.loc.gov/authorities/names\"\n\t\t\tvalueURI=\"http://id.loc.gov/authorities/names/n85337312\">\n\t\t\t<title>Mutio Scevola.</title>\n\t\t\t<partName>Adorata genitrice.</partName>\n\t\t</titleInfo>\n\t\t<name type=\"personal\" authorityURI=\"http://id.loc.gov/authorities/names\"\n\t\t\tvalueURI=\"http://id.loc.gov/authorities/names/n81005197\">\n\n\t\t\t<namePart>Bononcini, Giovanni,</namePart>\n\t\t\t<namePart type=\"date\">1670-1747</namePart>\n\t\t</name>\n\t</relatedItem>\n\n\t<relatedItem type=\"constituent\">\n\t\t<titleInfo>\n\t\t\t<title>Three Viennese arias.</title>\n\n\t\t</titleInfo>\n\t</relatedItem>\n\n\t<relatedItem type=\"constituent\">\n\t\t<titleInfo>\n\t\t\t<title>Viennese arias.</title>\n\t\t</titleInfo>\n\t</relatedItem>\n\n\t<recordInfo>\n\t\t<descriptionStandard>aacr</descriptionStandard>\n\t\t<recordContentSource>DLC</recordContentSource>\n\t\t<recordCreationDate encoding=\"marc\">850813</recordCreationDate>\n\t\t<recordChangeDate encoding=\"iso8601\">19950601141653.9</recordChangeDate>\n\t\t<recordIdentifier>5594130</recordIdentifier>\n\n\t\t<recordOrigin>Converted from MARCXML to MODS version 3.4 using MARC21slim2MODS3-4.xsl\n\t\t\t(Revision 1.74), valueURIs and authority URIs added by hand 20120124</recordOrigin>\n\t</recordInfo>\n</mods>",
		"items": [
			{
				"itemType": "document",
				"creators": [
					{
						"firstName": "Colin (Colin James)",
						"lastName": "Lawson",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "statement of responsibility: G.B. Bononcini and Emperor Joseph I ; edited by Colin\n\t\tLawson."
					},
					{
						"note": "Opera excerpts."
					},
					{
						"note": "Acc. arr. for piano; obbligato for the 2nd-3rd excerpts originally for chalumeau."
					},
					{
						"note": "Italian words."
					},
					{
						"note": "Cover title."
					},
					{
						"note": "The 1st excerpt composed for inclusion in M.A. Ziani's Chilonida."
					},
					{
						"note": "Texts with English translations on cover p. [2]."
					},
					{
						"note": "Table of Contents: Tutto in pianto il cor struggete / Emperor Joseph I -- E sempre inquieto quel\n\t\tcore infelice : from Endimione / G. Bononcini -- L'adorata genitrice : from Muzio [i.e.\n\t\tMutio] Scevola / G. Bononcini."
					}
				],
				"tags": [
					"Operas",
					"Songs (High voice) with instrumental ensemble"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "3 Viennese arias : for soprano, obbligato clarinet in B flat, and piano",
				"source": "DLC",
				"accessionNumber": "5594130",
				"series": "Music for voice and instrument",
				"place": "London",
				"publisher": "Nova Music",
				"date": "1984",
				"callNumber": "M1506 .A14 1984",
				"language": "ita; eng"
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<mods xmlns=\"http://www.loc.gov/mods/v3\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-4.xsd\" version=\"3.4\">\n    <titleInfo>\n        <title>Directory of computer assisted research in musicology</title>\n    </titleInfo>\n    <titleInfo type=\"alternative\">\n        <title>Computer assisted research in musicology</title>\n    </titleInfo>\n    <name type=\"corporate\">\n        <namePart>Center for Computer Assisted Research in the Humanities</namePart>\n    </name>\n    <typeOfResource>text</typeOfResource>\n    <genre authority=\"marcgt\">directory</genre>\n    <originInfo>\n        <place>\n            <placeTerm type=\"code\" authority=\"marccountry\">cau</placeTerm>\n        </place>\n        <place>\n            <placeTerm type=\"text\">Menlo Park, CA</placeTerm>\n        </place>\n        <publisher>Center for Computer Assisted Research in the Humanities</publisher>\n        <dateIssued>-1988</dateIssued>\n        <dateIssued point=\"start\" encoding=\"marc\">1985</dateIssued>\n        <dateIssued point=\"end\" encoding=\"marc\">1988</dateIssued>\n        <issuance>serial</issuance>\n        <frequency authority=\"marcfrequency\">Annual</frequency>\n        <frequency>Annual</frequency>\n    </originInfo>\n    <language>\n        <languageTerm type=\"code\" authority=\"iso639-2b\">eng</languageTerm>\n    </language>\n    <physicalDescription>\n        <form authority=\"marcform\">print</form>\n        <extent>4 v. : ill., music ; 26 cm.</extent>\n    </physicalDescription>\n    <note type=\"date/sequential designation\">Began in 1985.</note>\n    <note type=\"date/sequential designation\">-1988.</note>\n    <note>Description based on: 1986.</note>\n    <subject authority=\"lcsh\">\n        <topic>Musicology</topic>\n        <topic>Data processing</topic>\n        <genre>Periodicals</genre>\n    </subject>\n    <subject authority=\"lcsh\">\n        <topic>Music</topic>\n        <genre>Bibliography</genre>\n        <genre>Periodicals</genre>\n    </subject>\n    <subject authority=\"lcsh\">\n        <topic>Musicians</topic>\n        <genre>Directories</genre>\n    </subject>\n    <subject authority=\"lcsh\">\n        <topic>Musicologists</topic>\n        <genre>Directories</genre>\n    </subject>\n    <subject authority=\"lcsh\">\n        <topic>Musicology</topic>\n        <topic>Data processing</topic>\n        <genre>Directories</genre>\n    </subject>\n    <classification authority=\"lcc\">ML73 .D57</classification>\n    <classification authority=\"ddc\" edition=\"19\">780/.01/02584</classification>\n    <relatedItem type=\"succeeding\">\n        <titleInfo>\n            <title>Computing in musicology</title>\n        </titleInfo>\n        <identifier type=\"issn\">1057-9478</identifier>\n        <identifier type=\"local\">(DLC)   91656596</identifier>\n        <identifier type=\"local\">(OCoLC)21202412</identifier>\n    </relatedItem>\n    <identifier type=\"lccn\">86646620</identifier>\n    <identifier invalid=\"yes\" type=\"lccn\">86101572</identifier>\n    <identifier type=\"oclc\">ocm14913926</identifier>\n    <recordInfo>\n        <descriptionStandard>aacr</descriptionStandard>\n        <recordContentSource authority=\"marcorg\">DLC</recordContentSource>\n        <recordCreationDate encoding=\"marc\">861202</recordCreationDate>\n        <recordChangeDate encoding=\"iso8601\">20120109163740.0</recordChangeDate>\n        <recordIdentifier>11315879</recordIdentifier>\n        <recordOrigin>Converted from MARCXML to MODS version 3.4 using MARC21slim2MODS3-4.xsl\n        \t\t(Revision 1.76 2012/02/01)</recordOrigin>\n    </recordInfo>\n</mods>",
		"items": [
			{
				"itemType": "document",
				"creators": [
					{
						"firstName": "",
						"lastName": "Center for Computer Assisted Research in the Humanities",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "date/sequential designation: Began in 1985."
					},
					{
						"note": "date/sequential designation: -1988."
					},
					{
						"note": "Description based on: 1986."
					}
				],
				"tags": [
					"Musicology",
					"Data processing",
					"Music",
					"Musicians",
					"Musicologists",
					"Musicology",
					"Data processing"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Directory of computer assisted research in musicology",
				"source": "DLC",
				"accessionNumber": "11315879",
				"place": "Menlo Park, CA",
				"publisher": "Center for Computer Assisted Research in the Humanities",
				"date": "-1988",
				"callNumber": "ML73 .D57780/.01/02584",
				"language": "eng"
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<mods xmlns=\"http://www.loc.gov/mods/v3\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-4.xsd\" version=\"3.4\">\n    <titleInfo>\n        <nonSort>The </nonSort>\n        <title>American ballroom companion</title>\n        <subTitle>dance instruction manuals, ca. 1600-1920</subTitle>\n    </titleInfo>\n    <titleInfo type=\"alternative\">\n        <title>Dance instruction manuals, ca. 1600-1920</title>\n    </titleInfo>\n    <name type=\"corporate\">\n        <namePart>Library of Congress</namePart>\n        <namePart>Music Division.</namePart>\n    </name>\n    <name type=\"corporate\">\n        <namePart>Library of Congress</namePart>\n        <namePart>National Digital Library Program.</namePart>\n    </name>\n    <typeOfResource>software, multimedia</typeOfResource>\n    <originInfo>\n        <place>\n            <placeTerm type=\"code\" authority=\"marccountry\">dcu</placeTerm>\n        </place>\n        <place>\n            <placeTerm type=\"text\">Washington, D.C</placeTerm>\n        </place>\n        <publisher>Library of Congress</publisher>\n        <dateIssued>1998-]</dateIssued>\n        <dateIssued point=\"start\" encoding=\"marc\">1998</dateIssued>\n        <dateIssued point=\"end\" encoding=\"marc\">9999</dateIssued>\n        <issuance>monographic</issuance>\n    </originInfo>\n    <language>\n        <languageTerm type=\"code\" authority=\"iso639-2b\">eng</languageTerm>\n    </language>\n    <physicalDescription>\n        <form authority=\"marcform\">electronic</form>\n        <form authority=\"gmd\">electronic resource</form>\n        <form>Computer data and programs.</form>\n    </physicalDescription>\n    <abstract>Presents over two hundred social dance manuals, pocket-sized books with diagrams used by itinerant dancing masters to teach the American gentry the latest dance steps. Includes anti-dance manuals as well as treatises on etiquette. Offered as part of the American Memory online resource compiled by the National Digital Library Program of the Library of Congress.</abstract>\n    <note>Title from title screen dated Mar. 23, 1998.</note>\n    <note type=\"system details\">System requirements: World Wide Web (WWW) browser software.</note>\n    <note type=\"system details\">Mode of access: Internet.</note>\n    <subject>\n        <geographicCode authority=\"marcgac\">n-us---</geographicCode>\n    </subject>\n    <subject authority=\"lcsh\">\n        <topic>Ballroom dancing</topic>\n        <geographic>United States</geographic>\n    </subject>\n    <classification authority=\"lcc\">GV1623</classification>\n    <classification authority=\"ddc\" edition=\"13\">793.3</classification>\n    <location>\n        <url displayLabel=\"electronic resource\" usage=\"primary display\">http://hdl.loc.gov/loc.music/collmus.mu000010</url>\n    </location>\n    <identifier type=\"lccn\">98801326</identifier>\n    <identifier type=\"hdl\">hdl:loc.music/collmus.mu000010</identifier>\n    <identifier type=\"hdl\">hdl:loc.music/collmus.mu000010</identifier>\n    <recordInfo>\n        <descriptionStandard>aacr</descriptionStandard>\n        <recordContentSource authority=\"marcorg\">DLC</recordContentSource>\n        <recordCreationDate encoding=\"marc\">980323</recordCreationDate>\n        <recordChangeDate encoding=\"iso8601\">20060131154904.0</recordChangeDate>\n        <recordIdentifier>5004836</recordIdentifier>\n        <recordOrigin>Converted from MARCXML to MODS version 3.4 using MARC21slim2MODS3-4.xsl\n        \t\t(Revision 1.76 2012/02/01)</recordOrigin>\n    </recordInfo>\n</mods>",
		"items": [
			{
				"itemType": "computerProgram",
				"creators": [
					{
						"firstName": "",
						"lastName": "Library of Congress: Music Division.",
						"fieldMode": 1,
						"creatorType": "author"
					},
					{
						"firstName": "",
						"lastName": "Library of Congress: National Digital Library Program.",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "Title from title screen dated Mar. 23, 1998."
					},
					{
						"note": "system details: System requirements: World Wide Web (WWW) browser software."
					},
					{
						"note": "system details: Mode of access: Internet."
					}
				],
				"tags": [
					"Ballroom dancing"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "The American ballroom companion: dance instruction manuals, ca. 1600-1920",
				"source": "DLC",
				"accessionNumber": "5004836",
				"place": "Washington, D.C",
				"publisher": "Library of Congress",
				"date": "1998-]",
				"callNumber": "GV1623793.3",
				"url": "http://hdl.loc.gov/loc.music/collmus.mu000010",
				"abstractNote": "Presents over two hundred social dance manuals, pocket-sized books with diagrams used by itinerant dancing masters to teach the American gentry the latest dance steps. Includes anti-dance manuals as well as treatises on etiquette. Offered as part of the American Memory online resource compiled by the National Digital Library Program of the Library of Congress.",
				"language": "eng"
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<mods xmlns=\"http://www.loc.gov/mods/v3\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-4.xsd\" version=\"3.4\">\n    <titleInfo>\n        <title>Papers from the First International Workshop on Plasma-Based Ion Implantation</title>\n        <subTitle>4-6 August 1993, University of Wisconsin--Madison, Madison, Wisconsin</subTitle>\n    </titleInfo>\n    <name type=\"conference\">\n        <namePart>International Workshop on Plasma-Based Ion Implantation 1993 : University of Wisconsin--Madison)</namePart>\n    </name>\n    <name type=\"personal\">\n        <namePart>Conrad, John R.</namePart>\n    </name>\n    <name type=\"personal\">\n        <namePart>Sridharan, Kumar.</namePart>\n    </name>\n    <name type=\"corporate\">\n        <namePart>Applied Science and Technology (ASTeX), Inc</namePart>\n    </name>\n    <typeOfResource>text</typeOfResource>\n    <genre authority=\"marcgt\">bibliography</genre>\n    <genre authority=\"marcgt\">conference publication</genre>\n    <originInfo>\n        <place>\n            <placeTerm type=\"code\" authority=\"marccountry\">nyu</placeTerm>\n        </place>\n        <place>\n            <placeTerm type=\"text\">New York</placeTerm>\n        </place>\n        <publisher>Published for the American Vacuum Society by the American Institute of Physics</publisher>\n        <dateIssued>1994</dateIssued>\n        <issuance>monographic</issuance>\n    </originInfo>\n    <language>\n        <languageTerm type=\"code\" authority=\"iso639-2b\">eng</languageTerm>\n    </language>\n    <physicalDescription>\n        <form authority=\"marcform\">print</form>\n        <extent>p. 813-998 : ill. ; 30 cm.</extent>\n    </physicalDescription>\n    <note>\"Published in both 1994 March/April issue of the Journal of vacuum science and technology B, vol. 12, no. 2\"--T.p. verso.</note>\n    <note type=\"bibliography\">Includes bibliographical references and index.</note>\n    <subject authority=\"lcsh\">\n        <topic>Ion implantation</topic>\n        <topic>Congresses</topic>\n    </subject>\n    <classification authority=\"lcc\">TS695.25 .I57 1993</classification>\n    <classification authority=\"ddc\" edition=\"21\">621.3815/2</classification>\n    <relatedItem type=\"host\">\n        <titleInfo>\n            <title>Journal of vacuum science &amp; technology. B, Microelectronics and nanometer structures processing, measurement and phenomena</title>\n        </titleInfo>\n        <identifier type=\"issn\">1071-1023</identifier>\n        <identifier type=\"local\">(OCoLC)23276603</identifier>\n        <identifier type=\"local\">(DLC)sn 92021098</identifier>\n        <part>\n            <text>2nd ser., v. 12, no. 2</text>\n        </part>\n    </relatedItem>\n    <identifier type=\"isbn\">1563963442</identifier>\n    <identifier type=\"lccn\">97129132</identifier>\n    <identifier type=\"oclc\">35547175</identifier>\n    <recordInfo>\n        <descriptionStandard>aacr</descriptionStandard>\n        <recordContentSource authority=\"marcorg\">DLC</recordContentSource>\n        <recordCreationDate encoding=\"marc\">940504</recordCreationDate>\n        <recordChangeDate encoding=\"iso8601\">19970618142736.9</recordChangeDate>\n        <recordIdentifier>4968605</recordIdentifier>\n        <recordOrigin>Converted from MARCXML to MODS version 3.4 using MARC21slim2MODS3-4.xsl\n        \t\t(Revision 1.76 2012/02/01)</recordOrigin>\n    </recordInfo>\n</mods>",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "",
						"lastName": "International Workshop on Plasma-Based Ion Implantation 1993 : University of Wisconsin--Madison)",
						"fieldMode": 1,
						"creatorType": "author"
					},
					{
						"firstName": "John R",
						"lastName": "Conrad",
						"creatorType": "author"
					},
					{
						"firstName": "Kumar",
						"lastName": "Sridharan",
						"creatorType": "author"
					},
					{
						"firstName": "",
						"lastName": "Applied Science and Technology (ASTeX), Inc",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "\"Published in both 1994 March/April issue of the Journal of vacuum science and technology B, vol. 12, no. 2\"--T.p. verso."
					},
					{
						"note": "bibliography: Includes bibliographical references and index."
					}
				],
				"tags": [
					"Ion implantation",
					"Congresses"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Papers from the First International Workshop on Plasma-Based Ion Implantation: 4-6 August 1993, University of Wisconsin--Madison, Madison, Wisconsin",
				"source": "DLC",
				"accessionNumber": "4968605",
				"publicationTitle": "Journal of vacuum science & technology. B, Microelectronics and nanometer structures processing, measurement and phenomena",
				"ISSN": "1071-1023",
				"pages": "813-998",
				"ISBN": "1563963442",
				"place": "New York",
				"publisher": "Published for the American Vacuum Society by the American Institute of Physics",
				"date": "1994",
				"callNumber": "TS695.25 .I57 1993621.3815/2",
				"language": "eng"
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<mods xmlns=\"http://www.loc.gov/mods/v3\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-4.xsd\" version=\"3.4\">\n    <titleInfo>\n        <title>Campbell County, Wyoming</title>\n    </titleInfo>\n    <name type=\"corporate\">\n        <namePart>Campbell County Chamber of Commerce</namePart>\n    </name>\n    <typeOfResource>cartographic</typeOfResource>\n    <genre authority=\"marcgt\">map</genre>\n    <originInfo>\n        <place>\n            <placeTerm type=\"code\" authority=\"marccountry\">wyu</placeTerm>\n        </place>\n        <place>\n            <placeTerm type=\"text\">Gillette, Wyo.]</placeTerm>\n        </place>\n        <publisher>Campbell County Chamber of Commerce</publisher>\n        <dateIssued>[1982?]</dateIssued>\n        <dateIssued encoding=\"marc\">1982</dateIssued>\n        <issuance>monographic</issuance>\n    </originInfo>\n    <language>\n        <languageTerm type=\"code\" authority=\"iso639-2b\">eng</languageTerm>\n    </language>\n    <physicalDescription>\n        <extent>1 map ; 33 x 15 cm.</extent>\n    </physicalDescription>\n    <note>In lower right corner: Kintzels-Casper.</note>\n    <subject>\n        <cartographics>\n            <scale>Scale [ca. 1:510,000].</scale>\n        </cartographics>\n    </subject>\n    <subject authority=\"lcsh\">\n        <geographic>Campbell County (Wyo.)</geographic>\n        <topic>Maps</topic>\n    </subject>\n    <classification authority=\"lcc\">G4263.C3 1982  .C3</classification>\n    <identifier type=\"lccn\">83691515</identifier>\n    <recordInfo>\n        <descriptionStandard>aacr</descriptionStandard>\n        <recordContentSource authority=\"marcorg\">DLC</recordContentSource>\n        <recordCreationDate encoding=\"marc\">830222</recordCreationDate>\n        <recordChangeDate encoding=\"iso8601\">19830426000000.0</recordChangeDate>\n        <recordIdentifier>5466714</recordIdentifier>\n        <recordOrigin>Converted from MARCXML to MODS version 3.4 using MARC21slim2MODS3-4.xsl\n        \t\t(Revision 1.76 2012/02/01)</recordOrigin>\n    </recordInfo>\n</mods>",
		"items": [
			{
				"itemType": "map",
				"creators": [
					{
						"lastName": "Campbell County Chamber of Commerce",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [
					{
						"note": "In lower right corner: Kintzels-Casper."
					}
				],
				"tags": [
					"Maps"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Campbell County, Wyoming",
				"source": "DLC",
				"accessionNumber": "5466714",
				"place": "Gillette, Wyo.]",
				"publisher": "Campbell County Chamber of Commerce",
				"date": "1982",
				"callNumber": "G4263.C3 1982  .C3",
				"scale": "1:510,000",
				"language": "eng"
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<mods xmlns=\"http://www.loc.gov/mods/v3\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-4.xsd\" version=\"3.4\">\n    <titleInfo>\n        <title>3 Viennese arias</title>\n        <subTitle>for soprano, obbligato clarinet in B flat, and piano</subTitle>\n    </titleInfo>\n    <titleInfo type=\"alternative\">\n        <title>Three Viennese arias</title>\n    </titleInfo>\n    <titleInfo type=\"alternative\">\n        <title>Viennese arias</title>\n    </titleInfo>\n    <name type=\"personal\">\n        <namePart>Lawson, Colin (Colin James)</namePart>\n    </name>\n    <name type=\"personal\">\n        <namePart>Joseph</namePart>\n        <namePart type=\"termsOfAddress\">I, Holy Roman Emperor</namePart>\n        <namePart type=\"date\">1678-1711</namePart>\n    </name>\n    <name type=\"personal\">\n        <namePart>Bononcini, Giovanni</namePart>\n        <namePart type=\"date\">1670-1747</namePart>\n    </name>\n    <name type=\"personal\">\n        <namePart>Bononcini, Giovanni</namePart>\n        <namePart type=\"date\">1670-1747</namePart>\n    </name>\n    <typeOfResource>notated music</typeOfResource>\n    <originInfo>\n        <place>\n            <placeTerm type=\"code\" authority=\"marccountry\">enk</placeTerm>\n        </place>\n        <place>\n            <placeTerm type=\"text\">London</placeTerm>\n        </place>\n        <publisher>Nova Music</publisher>\n        <dateIssued>c1984</dateIssued>\n        <dateIssued encoding=\"marc\">1984</dateIssued>\n        <issuance>monographic</issuance>\n    </originInfo>\n    <language>\n        <languageTerm type=\"code\" authority=\"iso639-2b\">ita</languageTerm>\n    </language>\n    <language objectPart=\"libretto\">\n        <languageTerm type=\"code\" authority=\"iso639-2b\">eng</languageTerm>\n    </language>\n    <physicalDescription>\n        <form authority=\"marcform\">print</form>\n        <extent>1 score (12 p.) + 2 parts ; 31 cm.</extent>\n    </physicalDescription>\n    <tableOfContents>Tutto in pianto il cor struggete / Emperor Joseph I -- E sempre inquieto quel core infelice : from Endimione / G. Bononcini -- L'adorata genitrice : from Muzio [i.e. Mutio] Scevola / G. Bononcini.</tableOfContents>\n    <note>Opera excerpts.</note>\n    <note>Acc. arr. for piano; obbligato for the 2nd-3rd excerpts originally for chalumeau.</note>\n    <note>Italian words.</note>\n    <note>Cover title.</note>\n    <note>The 1st excerpt composed for inclusion in M.A. Ziani's Chilonida.</note>\n    <note>Texts with English translations on cover p. [2].</note>\n    <subject authority=\"lcsh\">\n        <topic>Operas</topic>\n        <topic>Excerpts, Arranged</topic>\n        <topic>Scores and parts</topic>\n    </subject>\n    <subject authority=\"lcsh\">\n        <topic>Songs (High voice) with instrumental ensemble</topic>\n        <topic>Scores and parts</topic>\n    </subject>\n    <classification authority=\"lcc\">M1506 .A14 1984</classification>\n    <relatedItem type=\"series\">\n        <titleInfo>\n            <title>Music for voice and instrument</title>\n        </titleInfo>\n    </relatedItem>\n    <relatedItem type=\"constituent\">\n        <titleInfo>\n            <title>Tutto in pianto il cor struggete; arr. 1984</title>\n        </titleInfo>\n        <name type=\"personal\">\n            <namePart>Joseph</namePart>\n            <namePart type=\"termsOfAddress\">I, Holy Roman Emperor</namePart>\n            <namePart type=\"date\">1678-1711</namePart>\n        </name>\n    </relatedItem>\n    <relatedItem type=\"constituent\">\n        <titleInfo>\n            <title>Endimione. arr. 1984</title>\n            <partName>E sempre inquieto quel core infelice; arr. 1984</partName>\n        </titleInfo>\n        <name type=\"personal\">\n            <namePart>Bononcini, Giovanni,</namePart>\n            <namePart type=\"date\">1670-1747</namePart>\n        </name>\n    </relatedItem>\n    <relatedItem type=\"constituent\">\n        <titleInfo>\n            <title>Mutio Scevola. arr. 1984</title>\n            <partName>Adorata genitrice; arr. 1984</partName>\n        </titleInfo>\n        <name type=\"personal\">\n            <namePart>Bononcini, Giovanni,</namePart>\n            <namePart type=\"date\">1670-1747</namePart>\n        </name>\n    </relatedItem>\n    <identifier type=\"lccn\">85753651</identifier>\n    <identifier type=\"music publisher\">N.M. 275 Nova Music</identifier>\n    <recordInfo>\n        <descriptionStandard>aacr</descriptionStandard>\n        <recordContentSource authority=\"marcorg\">DLC</recordContentSource>\n        <recordCreationDate encoding=\"marc\">850813</recordCreationDate>\n        <recordChangeDate encoding=\"iso8601\">19950601141653.9</recordChangeDate>\n        <recordIdentifier>5594130</recordIdentifier>\n        <recordOrigin>Converted from MARCXML to MODS version 3.4 using MARC21slim2MODS3-4.xsl\n        \t\t(Revision 1.76 2012/02/01)</recordOrigin>\n    </recordInfo>\n</mods>",
		"items": [
			{
				"itemType": "document",
				"creators": [
					{
						"firstName": "Colin (Colin James)",
						"lastName": "Lawson",
						"creatorType": "author"
					},
					{
						"lastName": "Joseph",
						"creatorType": "author"
					},
					{
						"firstName": "Giovanni",
						"lastName": "Bononcini",
						"creatorType": "author"
					},
					{
						"firstName": "Giovanni",
						"lastName": "Bononcini",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "Opera excerpts."
					},
					{
						"note": "Acc. arr. for piano; obbligato for the 2nd-3rd excerpts originally for chalumeau."
					},
					{
						"note": "Italian words."
					},
					{
						"note": "Cover title."
					},
					{
						"note": "The 1st excerpt composed for inclusion in M.A. Ziani's Chilonida."
					},
					{
						"note": "Texts with English translations on cover p. [2]."
					},
					{
						"note": "Table of Contents: Tutto in pianto il cor struggete / Emperor Joseph I -- E sempre inquieto quel core infelice : from Endimione / G. Bononcini -- L'adorata genitrice : from Muzio [i.e. Mutio] Scevola / G. Bononcini."
					}
				],
				"tags": [
					"Operas",
					"Excerpts, Arranged",
					"Scores and parts",
					"Songs (High voice) with instrumental ensemble",
					"Scores and parts"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "3 Viennese arias: for soprano, obbligato clarinet in B flat, and piano",
				"source": "DLC",
				"accessionNumber": "5594130",
				"series": "Music for voice and instrument",
				"place": "London",
				"publisher": "Nova Music",
				"date": "1984",
				"callNumber": "M1506 .A14 1984",
				"language": "ita; eng"
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<mods xmlns=\"http://www.loc.gov/mods/v3\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-4.xsd\" version=\"3.4\">\n    <titleInfo>\n        <title>2001 bluegrass odyssey</title>\n    </titleInfo>\n    <name type=\"corporate\">\n        <namePart>Roustabouts (Musical group)</namePart>\n        <role>\n            <roleTerm type=\"code\" authority=\"marcrelator\">prf</roleTerm>\n        </role>\n    </name>\n    <typeOfResource>sound recording-musical</typeOfResource>\n    <originInfo>\n        <place>\n            <placeTerm type=\"code\" authority=\"marccountry\">ncu</placeTerm>\n        </place>\n        <place>\n            <placeTerm type=\"text\">Charlotte, NC</placeTerm>\n        </place>\n        <publisher>Lamon Records</publisher>\n        <dateIssued>p1980</dateIssued>\n        <dateIssued encoding=\"marc\">1980</dateIssued>\n        <issuance>monographic</issuance>\n    </originInfo>\n    <language>\n        <languageTerm type=\"code\" authority=\"iso639-2b\">eng</languageTerm>\n    </language>\n    <physicalDescription>\n        <form authority=\"gmd\">sound recording</form>\n        <form authority=\"marccategory\">sound recording</form>\n        <form authority=\"marcsmd\">sound disc</form>\n        <extent>1 sound disc : analog, 33 1/3 rpm ; 12 in.</extent>\n    </physicalDescription>\n    <tableOfContents>Bluegrass odyssey -- Hills of Tennessee -- Sassafrass -- Muddy river -- Take your shoes off Moses -- Don't let Smokey Mountain smoke get in your eyes -- Farewell party -- Faded love -- Super sonic bluegrass -- Old love letters -- Will the circle be unbroken.</tableOfContents>\n    <note>Brief record.</note>\n    <note type=\"performers\">Performed by the Roustabouts.</note>\n    <subject authority=\"lcsh\">\n        <topic>Country music</topic>\n        <temporal>1971-1980</temporal>\n    </subject>\n    <subject authority=\"lcsh\">\n        <topic>Bluegrass music</topic>\n        <temporal>1971-1980</temporal>\n    </subject>\n    <classification authority=\"lcc\">Lamon Records LR-4280</classification>\n    <identifier type=\"lccn\">94759273</identifier>\n    <identifier type=\"issue number\">LR-4280 Lamon Records</identifier>\n    <identifier type=\"oclc\">31023015</identifier>\n    <recordInfo>\n        <descriptionStandard>aacr</descriptionStandard>\n        <recordContentSource authority=\"marcorg\">DLC</recordContentSource>\n        <recordCreationDate encoding=\"marc\">940829</recordCreationDate>\n        <recordChangeDate encoding=\"iso8601\">19940830080228.8</recordChangeDate>\n        <recordIdentifier>5718053</recordIdentifier>\n        <recordOrigin>Converted from MARCXML to MODS version 3.4 using MARC21slim2MODS3-4.xsl\n        \t\t(Revision 1.76 2012/02/01)</recordOrigin>\n    </recordInfo>\n</mods>",
		"items": [
			{
				"itemType": "audioRecording",
				"creators": [
					{
						"firstName": "",
						"lastName": "Roustabouts (Musical group)",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "Brief record."
					},
					{
						"note": "performers: Performed by the Roustabouts."
					},
					{
						"note": "Table of Contents: Bluegrass odyssey -- Hills of Tennessee -- Sassafrass -- Muddy river -- Take your shoes off Moses -- Don't let Smokey Mountain smoke get in your eyes -- Farewell party -- Faded love -- Super sonic bluegrass -- Old love letters -- Will the circle be unbroken."
					}
				],
				"tags": [
					"Country music",
					"Bluegrass music"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "2001 bluegrass odyssey",
				"source": "DLC",
				"accessionNumber": "5718053",
				"numberOfVolumes": "1",
				"place": "Charlotte, NC",
				"publisher": "Lamon Records",
				"date": "1980",
				"callNumber": "Lamon Records LR-4280",
				"language": "eng"
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<mods xmlns=\"http://www.loc.gov/mods/v3\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-4.xsd\" version=\"3.4\">\n    <titleInfo>\n        <title>Massachusetts death and marriage records, 1837-1897</title>\n    </titleInfo>\n    <typeOfResource collection=\"yes\" manuscript=\"yes\">mixed material</typeOfResource>\n    <originInfo>\n        <issuance>monographic</issuance>\n    </originInfo>\n    <language>\n        <languageTerm type=\"code\" authority=\"iso639-2b\">eng</languageTerm>\n    </language>\n    <physicalDescription>\n        <extent>2 volumes.</extent>\n    </physicalDescription>\n    <abstract>Records of deaths and marriages in Millbury and Springfield, Mass.</abstract>\n    <accessCondition type=\"restrictionOnAccess\">Open to research.</accessCondition>\n    <note type=\"acquisition\">Purchase, 1946.</note>\n    <note type=\"language\">Collection material in English.</note>\n    <note>Forms part of: Miscellaneous Manuscripts collection.</note>\n    <subject authority=\"lcsh\">\n        <topic>Registers of births, etc</topic>\n        <geographic>Massachusetts</geographic>\n        <geographic>Millbury</geographic>\n    </subject>\n    <subject authority=\"lcsh\">\n        <topic>Registers of births, etc</topic>\n        <geographic>Massachusetts</geographic>\n        <geographic>Springfield</geographic>\n    </subject>\n    <location>\n        <physicalLocation>Library of Congress Manuscript Division Washington, D.C. 20540 USA</physicalLocation>\n        <physicalLocation xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"http://hdl.loc.gov/loc.mss/mss.home\">http://hdl.loc.gov/loc.mss/mss.home</physicalLocation>\n    </location>\n    <identifier type=\"lccn\">mm 83001404</identifier>\n    <recordInfo>\n        <descriptionStandard>aacr</descriptionStandard>\n        <descriptionStandard>dacs</descriptionStandard>\n        <recordContentSource authority=\"marcorg\">DLC</recordContentSource>\n        <recordCreationDate encoding=\"marc\">830926</recordCreationDate>\n        <recordChangeDate encoding=\"iso8601\">20110707103737.0</recordChangeDate>\n        <recordIdentifier>5810505</recordIdentifier>\n        <recordOrigin>Converted from MARCXML to MODS version 3.4 using MARC21slim2MODS3-4.xsl\n        \t\t(Revision 1.76 2012/02/01)</recordOrigin>\n    </recordInfo>\n</mods>",
		"items": [
			{
				"itemType": "document",
				"creators": [],
				"notes": [
					{
						"note": "acquisition: Purchase, 1946."
					},
					{
						"note": "language: Collection material in English."
					},
					{
						"note": "Forms part of: Miscellaneous Manuscripts collection."
					}
				],
				"tags": [
					"Registers of births, etc",
					"Registers of births, etc"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Massachusetts death and marriage records, 1837-1897",
				"source": "DLC",
				"accessionNumber": "5810505",
				"rights": "Open to research.",
				"archiveLocation": "Library of Congress Manuscript Division Washington, D.C. 20540 USA; http://hdl.loc.gov/loc.mss/mss.home",
				"abstractNote": "Records of deaths and marriages in Millbury and Springfield, Mass.",
				"language": "eng"
			}
		]
	}
]
/** END TEST CASES **/