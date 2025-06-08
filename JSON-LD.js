{
	"translatorID": "74008780-5d19-411c-b2e2-d56b7154fe74",
	"label": "JSON-LD",
	"creator": "Frédéric Glorieux",
	"target": "",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 2,
	"lastUpdated": "2025-06-08 17:15:48"
}

function doExport() {
	const ldList = [];
	while (zotItem = Zotero.nextItem()) {
		parseExtraFields(zotItem); // parse extra field as 
		ldList.push(zot2ldItem(zotItem));

		Zotero.write(JSON.stringify(zotItem, null, "\t"));
	}
	Zotero.write(JSON.stringify(ldList, null, "\t"))
}

/**
 * Parse a native zotero item and transform it
 * in a compatible JSON-LD record.
 */
function zot2ldItem(zotItem)
{
	// source list for zotero document types https://aurimasv.github.io/z2csl/typeMap.xml
	const zot2ldType = {
		"artwork": "VisualArtwork",
		"attachment": "Message",
		"audioRecording": "AudioObject",
		"bill": "Legislation",
		"blogPost": "Blog",
		"book": "Book",	
		"bookSection": "Chapter",
		"case": "Legislation",
		"computerProgram": "SoftwareApplication",
		"conferencePaper": "ScholarlyArticle",
		"dictionaryEntry": "Article",
		"document": "ArchiveComponent",
		"email": "email",
		"encyclopediaArticle": "Article",
		"film": "Movie",
		"forumPost": "DiscussionForumPosting",
		"hearing": "",
		"instantMessage": "DiscussionForumPosting",
		"interview": "",
		"journalArticle": "ScholarlyArticle",
		"letter": "",
		"magazineArticle": "NewsArticle",
		"manuscript": "Manuscript",	
		"map": "Map",
		"newspaperArticle": "NewsArticle",
		"note": "",
		"patent": "",
		"podcast": "",
		"preprint": "",
		"presentation": "PresentationDigitalDocument",
		"radioBroadcast": "",
		"report": "Report",
		"statute": "Legislation",
		"thesis": "Thesis",
		"tvBroadcast": "",
		"videoRecording": "",
		"webpage":	"WebPage"

    };
	let ldItem = {
        "@context": "https://schema.org",
        "@type": typeMap[zotItem.itemType] || "ScholarlyArticle"  // Default zotero item is a cited article 
    };
	if (zotItem.url) {
        ldItem["@id"] = zotItem.url;
        ldItem["sameAs"] = zotItem.url;
    }
	if (zotItem.title) ldItem["name"] = zotItem.title;

	// first test if it’s a chapter, because work 


    if (zotItem.creators && zotItem.creators.length) {
        let authors = zotItem.creators.filter(c => c.creatorType === 'author');
        if (authors.length === 1) {
            ldItem["author"] = zot2ldPers(authors[0]);
        } else if (authors.length > 1) {
            ldItem["author"] = authors.map(zot2ldPers);
        }
    }

    let editors = zotItem.creators.filter(c => c.creatorType === 'editor');
    if (zotItem.bookTitle || zotItem.publicationTitle || editors.length > 0) {
        let container = {
            "@type": "Book"
        };
        if (zotItem.bookTitle || zotItem.publicationTitle)
            container["name"] = zotItem.bookTitle || zotItem.publicationTitle;

        if (editors.length === 1) {
            container["editor"] = zot2ldPers(editors[0]);
        } else if (editors.length > 1) {
            container["editor"] = editors.map(zot2ldPers);
        }

        if (zotItem.publisher) {
            container["publisher"] = {
                "@type": "Organization",
                "name": zotItem.publisher
            };
        }

        if (zotItem.place) container["locationCreated"] = zotItem.place;
        if (zotItem.date) {
            let yearMatch = zotItem.date.match(/^(\d{4})/);
            if (yearMatch) container["datePublished"] = yearMatch[1];
        }

        ldItem["isPartOf"] = container;
    }

    if (zotItem.pages) ldItem["pagination"] = zotItem.pages;
    if (zotItem.language) ldItem["inLanguage"] = zotItem.language;
    if (zotItem.citationKey) ldItem["citation"] = zotItem.citationKey;

	return ldItem;
}

function zot2ldPers(pers) {
    return {
        "@type": "Person",
        "givenName": pers.firstName || "",
        "familyName": pers.lastName || ""
    };
}

/**
 * Parse the “extra” field to get “extra fields”.
 * Adaptation of Zotero.Utilities.Item.extraToCSL()
 * https://github.com/zotero/utilities/blob/9c89b23153ce621ed0f1d581a5e32248704c6fb7/utilities_item.js#L614
 * Syntax, one property by line
 *
 * known-propertie: value
 * Other Known: value
 *
 *
 * This: could be a free note.
 * [2024-01 FG]
 * @param {*} item
 * @returns
 */
function parseExtraFields(zotItem) {
	if (!zotItem.extra) return;

	/**
	 * For a parser of zot:extra field,
	 * List of CSL properties with zotero key if available.
	 * These properties are unique for a record and override
	 * values from zotero form.
	 * References https://aurimasv.github.io/z2csl/typeMap.xml
	 */
	const cslScalars = {
		abstract: "abstractNote",
		accessed: "accessDate",
		annote: "annote", // not zot
		archive: "archive",
		"archive-collection": "seriesTitle", // not zot
		"archive-location": "archiveLocation",
		"archive-place": "place", // not zot
		authority: "authority", // zot:legislativeBody, zot:court, zot:issuingAuthority
		"available-date": "available-date", // not zot
		"call-number": "callNumber",
		chair: "chair",
		"chapter-number": "session", // legal, audio
		"citation-label": "citationKey",
		"citation-number": "citationKey",
		"collection-number": "seriesNumber",
		"collection-title": "seriesTitle",
		container: "container",
		"container-title": "container-title", // zot:bookTitle, zot:proceedingsTitle, zot:encyclopediaTitle, zot:dictionaryTitle, zot:publicationTitle, zot:websiteTitle
		"container-title-short": "journalAbbreviation",
		dimensions: "dimensions", // zot:artworkSize, zot:runningTime
		division: "division", // not zot
		doi: "DOI",
		edition: "edition",
		// "event": "event", // Deprecated legacy variant of event-title
		"event-date": "date",
		"event-place": "place",
		"event-title": "event-title", // zot:conferenceName, zot:meetingName
		"first-reference-note-number": "first-reference-note-number", // not zot
		genre: "genre", // zot:websiteType, zot:programmingLanguage, zot:genre, zot:postType, zot:letterType, zot:manuscriptType, zot:mapType, zot:presentationType, zot:reportType, zot:thesisType
		isbn: "ISBN",
		issn: "ISSN",
		issue: "issue",
		issued: "date", // zot:dateDecided, zot:dateEnacted
		jurisdiction: "jurisdiction", // not zot
		language: "language",
		license: "rights",
		locator: "locator", // not zot
		medium: "medium", // zot:artworkMedium, zot:audioRecordingFormat, zot:system, zot:videoRecordingFormat, zot:interviewMedium, zot:audioFileType
		note: "extra",
		number: "number", // zot:billNumber
		"number-of-pages": "numPages",
		"number-of-volumes": "numberOfVolumes",
		"original-date": "original-date", // not zot
		"original-publisher": "original-publisher", // not zot
		"original-publisher-place": "original-publisher-place", // not zot
		"original-title": "original-title", // not zot
		page: "page", // zot:page, zot:codePage
		// "page-first": "page-first", // not zot
		"part-number": "part-number", // not zot
		"part-title": "part-title", // not zot
		pmcid: "PMCID",
		pmid: "PMID",
		publisher: "publisher",
		"publisher-place": "place",
		references: "references", // zot:history, zot:references
		"reviewed-genre": "reviewed-genre", // not zot
		"reviewed-title": "reviewed-title", // not zot
		scale: "scale",
		section: "section", // zot:section, zot:committee
		source: "libraryCatalog",
		status: "legalStatus",
		submitted: "filingDate",
		"supplement-number": "supplement-number", // not zot
		title: "title",
		"title-short": "shortTitle",
		url: "URL",
		version: "versionNumber",
		volume: "volume",
		"year-suffix": "year-suffix", // not zot
	};

	/**
	 * For a parser of zot:extra field,
	 * List of CSL properties with zotero key if available.
	 * These properties are repeatable and are appended.
	 * References https://aurimasv.github.io/z2csl/typeMap.xml
	 */
	const cslCreators = {
		author: "author",
		chair: "chair", // not zot
		"collection-editor": "seriesEditor",
		compiler: "compiler", // not zot
		composer: "composer",
		"container-author": "container-author",
		contributor: "contributor",
		curator: "curator", // not zot
		director: "author", // cinema
		editor: "editor",
		"editor-translator": "editorial-translator", // not zot
		"editorial-director": "editorial-director", // not zot
		"executive-producer": "executive-producer", // not zot
		guest: "guest",
		host: "host", // not zot
		illustrator: "illustrator", // not zot
		interviewer: "interviewer",
		narrator: "narrator", // not zot
		organizer: "organizer", // not zot
		"original-author": "original-author", // not zot
		performer: "performer",
		recipient: "recipient",
		"reviewed-author": "reviewedAuthor",
		"script-writer": "scriptWriter",
		translator: "translator",
	};


	const extra = zotItem.extra.trim();
	if (!extra) {
		delete zotItem.extra;
		return;
	}
	// loop on extra, extract known properties as a dictionary, let unknown lines as is
	let note = extra.replace(/^([A-Za-z\- ]+)[\s\u00A0]*:\s*(.+)/gum, function (_, label, value) {
		value = value.trim();
		if (!value) { // keep line as is
			return _;
		}
		const cslKey = label.toLowerCase().replace(/ /g, '-');
		const zotKey = cslScalars[cslKey];
		if (zotKey) { // Standard or Number property
			zotItem[zotKey] = value;
			return "";
		}
		const creatorType = cslCreators[cslKey];
		if (creatorType) { // a name to append
			if (!Array.isArray(zotItem.creators)) {
				zotItem.creators = [];
			}
			const creator = {};
			const i = value.indexOf('||');
			if (i < 0) {
				creator.name = value;
			}
			else {
				creator.lastName = value.slice(0, i).trim();
				creator.firstName = value.slice(i + 2).trim();
			}
			creator.creatorType = creatorType;
			zotItem.creators.push(creator);
			return "";
		}
		const field = "keyword";
		if (cslKey == "keyword") {
			if (!Array.isArray(zotItem["keyword"])) {
				zotItem["keyword"] = [];
			}
			zotItem["keyword"].push(value);
			return "";
		}
		// default, append to note
		return _;
	});
	note = note.trim();
	if (!note) {
		delete zotItem.extra;
	}
	else {
		zotItem.extra = note.replace(/\n\n+/g, "\n\n");
	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
