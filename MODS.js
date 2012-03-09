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
	"lastUpdated": "2012-03-09 13:02:20"
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
			newItem.ISBN = myIdentifier.text().toString()
		} else if(myIdentifier.@type == "issn") {
			newItem.ISSN = myIdentifier.text().toString()
		} else if(myIdentifier.@type == "doi") {
			newItem.DOI = myIdentifier.text().toString()
		}
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
		"bibliography":"book",
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
					newItem.title = titleInfo.m::title.text().toString();
					if(titleInfo.m::subTitle.length()) {
						newItem.title = newItem.title + ": " + titleInfo.m::subTitle.text().toString();
					}
				} else {
					newItem.title = titleInfo.*.text(); // including text from sub elements
				}
			}
		}
		// try to get genre from local genre
		for each(var genre in mods.m::genre) {
			if(genre.@authority == "local" && Zotero.Utilities.itemTypeExists(genre.text().toString())) {
				newItem.itemType = genre.text().toString();
			} else if(!newItem.itemType && (genre.@authority == "marcgt" || genre.@authority == "marc")) {
				// otherwise, look at the marc genre
				newItem.itemType = marcGenres[genre.text().toString()];
			} else if(!newItem.itemType && (genre.@authority == "dct")) {
				// otherwise, look at the dct genre
				newItem.itemType = dctGenres[genre.text().toString().replace(/\s+/g,"")];
			}
		}
		
		if(!newItem.itemType) {
			//try to get type information from typeOfResource
			for each(var typeOfResource in mods.m::typeOfResource) {
				newItem.itemType = modsTypeOfResources[typeOfResource.text().toString()];
			}
			if(!newItem.itemType) {
				// try to get genre data from host
				for each(var relatedItem in mods.m::relatedItem) {
					if(relatedItem.@type == "host") {
						for each(var genre in relatedItem.m::genre) {
							if(genre.@authority == "marcgt" || genre.@authority == "marc") {
								newItem.itemType = marcGenres[genre.text().toString()];
								break;
							}
						}
					}
				}
			}
				
			if(!newItem.itemType) newItem.itemType = "document";
		}
		
		var isPartialItem = partialItemTypes.indexOf(newItem.itemType) !== -1;
		
		// TODO: thesisType, type
		
		for each(var name in mods.m::name) {
			// TODO: institutional authors
			var creator = {};
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
					var backupName = namePart.text().toString();
				}
			}
			
			if(backupName && !creator.firstName && !creator.lastName) {
				if(name.@type == 'personal') {
					//remove any possible dates
					backupName = backupName.replace(/[\[\(][^A-Za-z]*[\]\)]/g,'');
					creator = Zotero.Utilities.cleanAuthor(backupName, "author", true);
				} else {
					creator.lastName = ZU.trimInternal(backupName);
					creator.fieldMode = 1;
				}
			}
			
			// look for roles
			for each(var role in name.m::role.m::roleTerm) {
				if(role.@type == "code" && role.@authority == "marcrelator") {
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
			
			newItem.creators.push(creator);
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
						newItem.journalAbbreviation = titleInfo.m::title.text().toString();
						if(!newItem.publicationTitle) newItem.publicationTitle = newItem.journalAbbreviation;
					} else {
						newItem.publicationTitle = titleInfo.m::title.text().toString();
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
		if(!part) {
			part = mods.m::part;
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
				}
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
			if(newItem.itemType == "webpage" || newItem.itemType == "website") {
				newItem.publicationTitle = originInfo.m::publisher[0].text().toString();
			} else {
				newItem.publisher = originInfo.m::publisher[0].text().toString();
			}
		}
		// date
		if(originInfo.m::copyrightDate.length()) {
			newItem.date = originInfo.m::copyrightDate[0].text().toString();
		} else if(originInfo.m::dateIssued.length()) {
			newItem.date = originInfo.m::dateIssued[0].text().toString();
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
		newItem.archiveLocation = mods.m::location.m::physicalLocation.text().toString();
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
			newItem.notes.push({note:note.text().toString()});
		}
		
		/** TAGS **/
		for each(var subject in mods.m::subject.m::topic) {
			newItem.tags.push(subject.text().toString());
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
				"itemType": "document",
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
				"url": "http://wayback-cgi1.alexa.com/e2002/*/http://www.franulmer.com/",
				"abstractNote": "Web site promoting the candidacy of Fran Ulmer, Democratic candidate for Governor, Alaska, 2002. Includes candidate biography, issue position statements, campaign contact information, privacy policy and campaign news press releases. Site features enable visitors to sign up for campaign email list, volunteer, make campaign contributions and follow links to other internet locations.",
				"language": "eng",
				"title": "FranUlmer.com -- Home Page"
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<modsCollection xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns=\"http://www.loc.gov/mods/v3\" xsi:schemaLocation=\"http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-3.xsd\">\n<mods version=\"3.3\">\n     <titleInfo>\n \t \t<title>At Gettysburg, or, What a Girl Saw and Heard of the Battle: A True Narrative</title>\n \t</titleInfo>\n \t<name type=\"personal\">\n \t \t<namePart>Alleman, Tillie Pierce [1848-1914]</namePart>\n \t \t<role>\n \t \t \t<roleTerm type=\"code\" authority=\"marcrelator\">aut</roleTerm>\n \t \t \t<roleTerm type=\"text\" authority=\"marcrelator\">Author</roleTerm>\n \t \t</role>\n \t</name>\n \t<typeOfResource>text</typeOfResource>\n \t<originInfo>\n \t \t<place>\n \t \t \t<placeTerm type=\"text\">New York</placeTerm>\n \t \t</place>\n \t \t<publisher>W. Lake Borland</publisher>\n \t \t<dateIssued keyDate=\"yes\" encoding=\"w3cdtf\">1889</dateIssued>\n \t</originInfo>\n \t<language>\n \t \t<languageTerm authority=\"iso639-2b\">eng</languageTerm>\n \t \t<languageTerm type=\"text\">English</languageTerm>\n \t</language>\n \t<physicalDescription>\n \t \t<internetMediaType>text/html</internetMediaType>\n \t \t<digitalOrigin>reformatted digital</digitalOrigin>\n \t</physicalDescription>\n \t<subject authority=\"lcsh\">\n \t \t<topic >Gettysburg, Battle of, Gettysburg, Pa., 1863</topic>\n \t</subject>\n \t<subject authority=\"lcsh\">\n \t \t<topic>Gettysburg (Pa.) -- History -- Civil War, 1861-1865</topic>\n \t</subject>\n \t<subject authority=\"lcsh\">\n \t \t<topic>United States -- History -- Civil War, 1861-1865 -- Campaigns</topic>\n \t</subject>\n \t<classification authority=\"lcc\">E475.53 .A42</classification>\n \t<relatedItem type=\"host\">\n \t \t<titleInfo type=\"uniform\" authority=\"dlfaqcoll\">\n \t \t \t<title>A Celebration of Women Writers: Americana</title>\n \t \t</titleInfo>\n \t</relatedItem>\n \t<location>\n \t \t<url usage=\"primary display\" access=\"object in context\"> http://digital.library.upenn.edu/women/alleman/gettysburg/gettysburg.html\n</url>\n \t</location>\n \t<accessCondition> Personal, noncommercial use of this item is permitted in the United States of America. Please see http://digital.library.upenn.edu/women/ for other rights and restrictions that may apply to this resource.\n</accessCondition>\n<recordInfo>\n \t<recordSource>University of Pennsylvania Digital Library</recordSource>\n \t<recordOrigin> MODS auto-converted from a simple Online Books Page metadata record. For details, see http://onlinebooks.library.upenn.edu/mods.html </recordOrigin>\n \t<languageOfCataloging>\n \t \t<languageTerm type=\"code\" authority=\"iso639-2b\">eng</languageTerm>\n \t</languageOfCataloging>\n</recordInfo>\n</mods>\n</modsCollection>",
		"items": [
			{
				"itemType": "document",
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
				"url": "http://quod.lib.umich.edu/m/mods/thumbs/Indiana/oai.dlib.indiana.edu/ archives/cushman/oai_3Aoai.dlib.indiana.edu_3Aarchives_5Ccushman_5CP07803.png"
			}
		]
	},
	{
		"type": "import",
		"input": "<modsCollection xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns=\"http://www.loc.gov/mods/v3\" xsi:schemaLocation=\"http://www.loc.gov/mods/v3 http://www.loc.gov/standards/mods/v3/mods-3-3.xsd\">\n<mods version=\"3.3\">\n     <titleInfo>\n \t \t<title>Hiring and recruitment practices in academic libraries</title>\n \t</titleInfo>\n \t<name type=\"personal\">\n \t \t<namePart>Raschke, Gregory K.</namePart>\n \t \t<displayForm>Gregory K. Raschke</displayForm>\n \t</name>\n \t<typeOfResource>text</typeOfResource>\n \t<genre>journal article</genre>\n \t<originInfo>\n \t \t<place>\n \t \t \t<text>Baltimore, Md.</text>\n \t \t</place>\n \t \t<publisher>Johns Hopkins University Press</publisher>\n \t \t<dateIssued>2003</dateIssued>\n \t \t<issuance>monographic</issuance>\n \t</originInfo>\n \t<language authority=\"iso639-2b\">eng</language>\n \t<physicalDescription>\n \t \t<form authority=\"marcform\">print</form>\n \t \t<extent>15 p.</extent>\n \t</physicalDescription>\n \t<abstract>\nAcademic libraries need to change their recruiting and hiring procedures to stay competitive in today's changing marketplace. By taking too long to find and to hire talented professionals in a tight labor market, academic libraries are losing out on top candidates and limiting their ability to become innovative and dynamic organizations. Traditional, deliberate, and risk-averse hiring models lead to positions remaining open for long periods, opportunities lost as top prospects find other positions, and a reduction in the overall talent level of the organization. To be more competitive and effective in their recruitment and hiring processes, academic libraries must foster manageable internal solutions, look to other professions for effective hiring techniques and models, and employ innovative concepts from modern personnel management literature. </abstract>\n \t<subject>\n \t \t<topic>College librarians</topic>\n \t \t<topic>Recruiting</topic>\n \t \t<geographic>United States</geographic>\n \t</subject>\n \t<subject>\n \t \t<topic>College librarians</topic>\n \t \t<topic>Selection and appointment</topic>\n \t \t<geographic>United States</geographic>\n \t</subject>\n \t<relatedItem type=\"host\">\n \t \t<titleInfo>\n \t \t \t<title>portal: libraries and the academy</title>\n \t \t</titleInfo>\n \t \t<part>\n \t \t \t<detail type=\"volume\">\n \t \t \t \t<number>3</number>\n \t \t \t \t<caption>vol.</caption>\n \t \t \t</detail>\n \t \t \t<detail type=\"number\">\n \t \t \t \t<number>1</number>\n \t \t \t \t<caption>no.</caption>\n \t \t \t</detail>\n \t \t \t<extent unit=\"page\">\n \t \t \t \t<start>53</start>\n \t \t \t \t<end>57</end>\n \t \t \t</extent>\n \t \t \t<date>Jan. 2003</date>\n \t \t</part>\n \t \t<identifier type=\"issn\">1531-2542</identifier>\n \t</relatedItem>\n</mods>\n\n</modsCollection>",
		"items": [
			{
				"itemType": "document",
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
				"abstractNote": "Academic libraries need to change their recruiting and hiring procedures to stay competitive in today's changing marketplace. By taking too long to find and to hire talented professionals in a tight labor market, academic libraries are losing out on top candidates and limiting their ability to become innovative and dynamic organizations. Traditional, deliberate, and risk-averse hiring models lead to positions remaining open for long periods, opportunities lost as top prospects find other positions, and a reduction in the overall talent level of the organization. To be more competitive and effective in their recruitment and hiring processes, academic libraries must foster manageable internal solutions, look to other professions for effective hiring techniques and models, and employ innovative concepts from modern personnel management literature.",
				"language": "eng",
				"title": "Hiring and recruitment practices in academic libraries"
			}
		]
	}
]
/** END TEST CASES **/