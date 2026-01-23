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
	"lastUpdated": "2025-12-17 12:22:10"
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
	ldList.sort(function(a,b){
		const ua = a['@id'] ?? '';
		const ub = b['@id'] ?? '';
		return ua < ub ? -1 : ua > ub ? 1 : 0;
	});
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
		[/<[^>]+>/g, ""], // default strip alltags
		[/[\u00A0\u202F]/g, ' ']
	];

	// Normalize rich-text (Zotero HTML-ish) to plain text for schema.org.
	// Rationale: keep JSON-LD stable for exact-match deduplication and indexing.
	// If you want French typographic spacing, do it at rendering time (HTML/CSS), not inside the data.
	const normalize = (s) => regexReplaceAll(s, tag2text);

	function asOrganization(name) {
		if (!name) return null;
		return { "@type": "Organization", "name": normalize(name) };
	}

	function asPlace(name) {
		if (!name) return null;
		return { "@type": "Place", "name": normalize(name) };
	}

	// Canonical identifier policy:
	// - @id and url must be the canonical public URL when available.
	// - keep Zotero's internal URI as sameAs when it exists and differs.
	function addCanonicalId(ldItem, zotItem) {
		const canonical = zotItem.url || zotItem.URL || zotItem.uri;
		ldItem["@id"] = canonical;
		ldItem["url"] = canonical;
		if (zotItem.uri && zotItem.uri !== canonical) {
			// sameAs can be a string or array later (e.g., to add a DOI URL).
			ldItem.sameAs = zotItem.uri;
		}
	}

	// Pagination: keep free-text `pagination`.
	// If the string is a simple range, also set pageStart/pageEnd (widely consumed by importers).
	function addPages(ldItem, pages) {
		if (!pages) return;
		ldItem.pagination = pages;
		// Accept Arabic or Roman numerals; accept hyphen or en-dash.
		const m = /^\s*([0-9ivxlcdm]+)\s*[-–]\s*([0-9ivxlcdm]+)\s*$/i.exec(pages);
		if (m) {
			ldItem.pageStart = m[1];
			ldItem.pageEnd = m[2];
		}
	}

	// Build a journal container chain only to the depth that is actually known.
	// Periodical → (optional) PublicationVolume → (optional) PublicationIssue.
	function buildPeriodicalContainer(zotItem) {
		if (!zotItem.publicationTitle) return null;

		const periodical = { "@type": "Periodical", "name": normalize(zotItem.publicationTitle) };
		if (zotItem.ISSN) periodical.issn = zotItem.ISSN;

		let container = periodical;
		if (zotItem.volume) {
			container = { "@type": "PublicationVolume", "volumeNumber": zotItem.volume, "isPartOf": container };
		}
		if (zotItem.issue) {
			container = { "@type": "PublicationIssue", "issueNumber": zotItem.issue, "isPartOf": container };
		}
		return container;
	}

	// Conference paper support (schema.org-only):
	// - keep the paper as ScholarlyArticle
	// - link proceedings via isPartOf (Book)
	// - attach conference context via `publication` (PublicationEvent) when available
	function buildProceedings(zotItem) {
		const title = zotItem.proceedingsTitle || zotItem.bookTitle;
		if (!title) return null;

		const proc = { "@type": "Book", "name": normalize(title) };
		if (zotItem.publisher) proc.publisher = asOrganization(zotItem.publisher);
		if (zotItem.place) proc.locationCreated = asPlace(zotItem.place);
		if (zotItem.date) proc.datePublished = ZU.strToISO(zotItem.date);
		if (zotItem.ISBN) proc.isbn = zotItem.ISBN;
		return proc;
	}

	function buildPublicationEvent(zotItem) {
		// Prefer dedicated Zotero fields; fall back to Extra parsing keys when present.
		const confName = zotItem.conferenceName || zotItem.meetingName || zotItem.eventTitle || zotItem["event-title"];
		if (!confName) return null;

		const ev = { "@type": "PublicationEvent", "name": normalize(confName) };

		// Only use explicit eventPlace/eventDate to avoid confusing publisher-place with conference-place.
		if (zotItem.eventPlace) ev.location = asPlace(zotItem.eventPlace);
		if (zotItem.eventDate) ev.startDate = ZU.strToISO(zotItem.eventDate);

		return ev;
	}

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
	addCanonicalId(ldItem, zotItem);
	if (zotItem.title) ldItem["name"] = regexReplaceAll(zotItem.title, tag2text);
	// what about items with no title?
	if (zotItem.creators && zotItem.creators.length) {
		let authors = zotItem.creators.filter(c => c.creatorType === 'author');
		if (authors.length === 1) {
			ldItem["author"] = zot2ldPers(authors[0]);
		} else if (authors.length > 1) {
			ldItem["author"] = authors.map(zot2ldPers);
		}
	}
	if (zotItem.date) ldItem["datePublished"] = ZU.strToISO(zotItem.date);

	// DOI: emit both a structured identifier and a resolvable URL.
	if (zotItem.DOI) {
		const doi = ("" + zotItem.DOI).trim();
		if (doi) {
			ldItem["identifier"] = { "@type": "PropertyValue", "propertyID": "doi", "value": doi };
			const doiUrl = doi.startsWith("http") ? doi : ("https://doi.org/" + doi);
			if (ldItem.sameAs) {
				ldItem.sameAs = Array.isArray(ldItem.sameAs) ? ldItem.sameAs : [ ldItem.sameAs ];
				if (!ldItem.sameAs.includes(doiUrl)) ldItem.sameAs.push(doiUrl);
			} else {
				ldItem.sameAs = doiUrl;
			}
		}
	}
	if (zotItem.language) ldItem["inLanguage"] = zotItem.language;
	// bad inference
	// if (zotItem.citationKey) ldItem["citation"] = zotItem.citationKey;
	if (zotItem.rights) {
		if (zotItem.rights.startsWith("http")) {
			ldItem["license"] = zotItem.rights;
		} else {
			ldItem["copyrightNotice"] =  zotItem.rights;
		}
	}


	const isConferencePaper = (zotItem.itemType === "conferencePaper");

	if (isConferencePaper) {
		// Conference paper (proceedings + optional event context)
		const proceedings = buildProceedings(zotItem);
		if (proceedings) ldItem["isPartOf"] = proceedings;

		const pubEvent = buildPublicationEvent(zotItem);
		if (pubEvent) ldItem["publication"] = pubEvent;
	}
	else if (zotItem.bookTitle) {
		// Book chapter / contribution inside a book
		let book = {};
		book["@type"] = "Book";
		book["name"] = normalize(zotItem.bookTitle);

		if (zotItem.creators && zotItem.creators.length) {
			let creators = zotItem.creators.filter(c => (c.creatorType === 'editor'));
			if (creators.length === 1) {
				book["editor"] = zot2ldPers(creators[0]);
			} else if (creators.length > 1) {
				book["editor"] = creators.map(zot2ldPers);
			}
			creators = zotItem.creators.filter(c => (c.creatorType === 'bookAuthor'));
			if (creators.length === 1) {
				book["author"] = zot2ldPers(creators[0]);
			} else if (creators.length > 1) {
				book["author"] = creators.map(zot2ldPers);
			}
		}
		if (zotItem.publisher) book["publisher"] = asOrganization(zotItem.publisher);
		if (zotItem.place) book["locationCreated"] = asPlace(zotItem.place);
		if (zotItem.date) book["datePublished"] = ZU.strToISO(zotItem.date);

		ldItem["isPartOf"] = book;
	}
	else {
		// Journal / periodical container, only to the depth we actually know.
		const container = buildPeriodicalContainer(zotItem);
		if (container) ldItem["isPartOf"] = container;
	}
	addPages(ldItem, zotItem.pages);

	if (zotItem.tags && zotItem.tags.length > 0) {
		const keywords=[];
		// sort tags to keep order between exports
		zotItem.tags.sort(function(a,b){return a.tag.localeCompare(b.tag); });
		for (let oTag of zotItem.tags) {
			const value = oTag.tag;
			if (value.startsWith("#")) continue;
			keywords.push(value);
		}
		if (keywords.length > 0) ldItem["keywords"] = keywords;
		/*
		const tags = teiDoc.createElementNS(ns.tei, "note");
		bibl.append("\n", indent, tags);
		tags.setAttribute("type", "tags");
		// sort tags to keep order between exports
		item.tags.sort(function(a,b){return a.tag.localeCompare(b.tag); });
		for (let tag of item.tags) {
			let term = teiDoc.createElementNS(ns.tei, "term");
			term.setAttribute("type", "tag");
			term.append(tag.tag);
			tags.append("\n", indent.repeat(2), term);
		}
		tags.append("\n", indent);
		*/
	}

	return ldItem;
}

function zot2ldPers(pers) {
	let out = {};
	if (pers.firstName || pers.lastName) {
		out["@type"] = "Person";
		if (pers.lastName) out.familyName = pers.lastName;
		if (pers.firstName) out.givenName = pers.firstName;
		let name = pers.name;
		if (!name) {
			name="";
			if (pers.firstName) name = pers.firstName + " ";
			name += pers.lastName;
		}
		out.name = name;
	}
	else if (pers.name) {
		out["@type"]= "Organization";
		out.name = pers.name;
	}
	return out;
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
		"event-date": "eventDate",
		"event-place": "eventPlace",
		"event-title": "eventTitle", // zot:conferenceName, zot:meetingName
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
		url: "url",
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
			zotItem["keyword"].sort(function(a,b){return a.localeCompare(b); });
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
