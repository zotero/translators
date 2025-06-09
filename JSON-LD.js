{
	"translatorID": "74008780-5d19-411c-b2e2-d56b7154fe74",
	"label": "JSON-LD",
	"creator": "Frédéric Glorieux",
	"target": "json",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 2,
	"lastUpdated": "2025-06-09 12:18:52"
}

function doExport() {
	const ldList = [];
	let zotItem;
	while (zotItem = Zotero.nextItem()) {
		// Skip standalone notes
		if (zotItem.itemType == 'note') continue;
		parseExtraFields(zotItem); // parse extra field 
		ldList.push(zot2ldItem(zotItem));
	}
	Zotero.write(JSON.stringify(ldList, null, "\t"))
}

/**
 * Parse a native zotero item and transform it
 * in a compatible JSON-LD record.
 */
function zot2ldItem(zotItem)
{
	const tag2text = [
		[/<i>/g, "“"],             // “Title”
		[/<\/i>/g, "”"],           // “Title”
		[/<sup>st<\/sup>/g, "ˢᵗ"], // 1ˢᵗ
		[/<sup>nd<\/sup>/g, "ⁿᵈ"], // 2ⁿᵈ
		[/<sup>rd<\/sup>/g, "ʳᵈ"], // 3ʳᵈ
		[/<sup>th<\/sup>/g, "ᵗʰ"], // 4ᵗʰ
		[/<sup>er<\/sup>/g, "ᵉʳ"], // 1ᵉʳ
		[/<sup>e<\/sup>/g, "ᵉ"],   // 2ᵉ
		[/<\/?sup>/g, ""], // default superscript, remove
		[/<span style="font-variant:small-caps;">([^<]*)<\/span>/g, (match, word) => word.toUpperCase()], // small caps, to CAPS
		[/<[^>]+>/g, ""] // default strip alltags
	];
	// source list for zotero document types https://aurimasv.github.io/z2csl/typeMap.xml
	const zot2ldType = {
		"artwork": "VisualArtwork",
		"attachment": "DigitalDocument",
		"audioRecording": "AudioObject",
		"bill": "Legislation",
		"blogPost": "BlogPosting",
		"book": "Book",
		"bookSection": "Chapter",
		"case": "Legislation",
		"computerProgram": "SoftwareApplication",
		"conferencePaper": "ScholarlyArticle",
		"dictionaryEntry": "Article",
		"document": "ArchiveComponent",
		"email": "EmailMessage",
		"encyclopediaArticle": "Article",
		"film": "Movie",
		"forumPost": "DiscussionForumPosting",
		"hearing": "Legislation",
		"instantMessage": "Message",
		"interview": "Article",
		"journalArticle": "ScholarlyArticle",
		"letter": "Message", // or ArchiveComponent ?
		"magazineArticle": "Article",
		"manuscript": "Manuscript",
		"map": "Map",
		"newspaperArticle": "NewsArticle",
		"note": "DigitalDocument", // ask to Zotero experts
 		"patent": "Legislation",
		"podcast": "PodcastEpisode",
		"preprint": "ScholarlyArticle",
		"presentation": "DigitalDocument",
		"radioBroadcast": "RadioEpisode",
		"report": "Report",
		"statute": "Legislation",
		"thesis": "Thesis",
		"tvBroadcast": "TVEpisode",
		"videoRecording": "VideoObject",
		"webpage": "WebPage"
	};
	let ldItem = {
		"@context": "https://schema.org",
		"@type": zot2ldType[zotItem.itemType] || "ScholarlyArticle"  // Default zotero item is a cited article 
	};
	if (zotItem.url) {
		ldItem["@id"] = zotItem.url;
		ldItem["sameAs"] = zotItem.url;
	}
	if (zotItem.title) ldItem["name"] = regexReplaceAll(zotItem.title, tag2text);
	if (zotItem.creators && zotItem.creators.length) {
		let authors = zotItem.creators.filter(c => c.creatorType === 'author');
		if (authors.length === 1) {
			ldItem["author"] = zot2ldPers(authors[0]);
		} else if (authors.length > 1) {
			ldItem["author"] = authors.map(zot2ldPers);
		}
	}
	if (zotItem.date) ldItem["datePublished"] = ZU.strToISO(zotItem.date);
	if (zotItem.language) ldItem["inLanguage"] = zotItem.language;
	if (zotItem.citationKey) ldItem["citation"] = zotItem.citationKey;
	if (zotItem.rights) {
		if (zotItem.rights.startsWith("http")) {
			ldItem["license"] = zotItem.rights;
		} else {
			ldItem["copyrightNotice"] =  zotItem.rights;
		}
	}

	let editors = [];
	if (zotItem.creators && zotItem.creators.length) {
		editors = zotItem.creators.filter(c => (c.creatorType === 'editor' || c.creatorType === 'bookAuthor'));
	}
	if (zotItem.bookTitle || zotItem.publicationTitle || editors.length > 0) {
		let container = {};
		if (zotItem.bookTitle) container["@type"] = "Book";
		else if (zotItem.type == "newspaperArticle") container["@type"] = "Newspaper";
		else if (zotItem.publicationTitle) container["@type"] = "Periodical";
		else container["@type"] =  "CreativeWorkSeries";

		if (zotItem.bookTitle || zotItem.publicationTitle)
			container["name"] = zotItem.bookTitle || zotItem.publicationTitle;
		if (zotItem.ISSN) container["issn"] = zotItem.ISSN;
		if (editors.length === 1) {
			container["editor"] = zot2ldPers(editors[0]);
		} else if (editors.length > 1) {
			container["editor"] = editors.map(zot2ldPers);
		}

		if (zotItem.date) container["datePublished"] = ZU.strToISO(zotItem.date);
		if (zotItem.volume) container["volumeNumber"] = zotItem.volume;
		if (zotItem.issue) container["issueNumber"] = zotItem.volume;
		if (zotItem.publisher) {
			container["publisher"] = {
				"@type": "Organization",
				"name": zotItem.publisher
			};
		}
		if (zotItem.place) container["locationCreated"] = zotItem.place;

		ldItem["isPartOf"] = container;
	}
	if (zotItem.pages) ldItem["pagination"] = zotItem.pages;

	return ldItem;
}

function zot2ldPers(pers) {
	if (pers.firstName || pers.lastName) {
		return {
			"@type": "Person",
			"givenName": pers.firstName || "",
			"familyName": pers.lastName || ""
		};
	}
	else if (pers.name) {
		return {
			"@type": "Organization",
			"name": pers.name
		};
	}
}

/**
 * Applies a sequence of regex replacements to a string, similar to PHP's preg_replace.
 *
 * @param {string} str - The input string to be transformed.
 * @param {Array<[RegExp, string | ((substring: string, ...args: any[]) => string)]>} replacements - 
 *        An array of tuples, each containing a regex and a replacement string or function.
 * @returns {string} - The transformed string after applying all replacements sequentially.
 *
 * @example
 * regexReplaceAll("Have you read <i>1984</i> ?", 
 *   [
 *     [/<i>/g, '“']
 *     [/</i>/g, '”'],
 *   ]
 * );
 * returns: "Have you read “1984” ?"
 */
function regexReplaceAll(str, replacements) {
  return replacements.reduce(
	(currentStr, [regex, replacement]) => currentStr.replace(regex, replacement),
	str
  );
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
 * @param {*} zotItem
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
