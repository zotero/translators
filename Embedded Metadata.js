{
	"translatorID": "951c027d-74ac-47d4-a107-9c3069ab7b48",
	"label": "Embedded Metadata",
	"creator": "Simon Kornblith and Avram Lyon",
	"target": "",
	"minVersion": "3.0.4",
	"maxVersion": "",
	"priority": 320,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-06-13 15:58:28"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2011 Avram Lyon and the Center for History and New Media
					 George Mason University, Fairfax, Virginia, USA
					 http://zotero.org

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


/* eslint-disable camelcase */
var HIGHWIRE_MAPPINGS = {
	citation_title: "title",
	citation_publication_date: "date",	// perhaps this is still used in some old implementations
	citation_cover_date: "date", // used e.g. by Springer http://link.springer.com/article/10.1023/A:1021669308832
	citation_date: "date",
	citation_journal_title: "publicationTitle",
	citation_journal_abbrev: "journalAbbreviation",
	citation_inbook_title: "publicationTitle", // used as bookTitle or proceedingTitle, e.g. http://pubs.rsc.org/en/content/chapter/bk9781849730518-00330/978-1-84973-051-8
	citation_book_title: "bookTitle",
	citation_volume: "volume",
	citation_issue: "issue",
	citation_series_title: "series",
	citation_conference_title: "conferenceName",
	citation_conference: "conferenceName",
	citation_dissertation_institution: "university",
	citation_technical_report_institution: "institution",
	citation_technical_report_number: "number",
	citation_publisher: "publisher",
	citation_isbn: "ISBN",
	citation_abstract: "abstractNote",
	citation_doi: "DOI",
	citation_public_url: "url",
	citation_language: "language"

/* the following are handled separately in addHighwireMetadata()
	"citation_author"
	"citation_authors"
	"citation_firstpage"
	"citation_lastpage"
	"citation_issn"
	"citation_eIssn"
	"citation_pdf_url"
	"citation_abstract_html_url"
	"citation_fulltext_html_url"
	"citation_pmid"
	"citation_online_date"
	"citation_year"
	"citation_keywords"
*/
};

/* eslint-enable */

// Maps actual prefix in use to URI
// The defaults are set to help out in case a namespace is not declared
// Copied from RDF translator
var _prefixes = {
	bib: "http://purl.org/net/biblio#",
	bibo: "http://purl.org/ontology/bibo/",
	dc: "http://purl.org/dc/elements/1.1/",
	dcterms: "http://purl.org/dc/terms/",
	prism: "http://prismstandard.org/namespaces/1.2/basic/",
	foaf: "http://xmlns.com/foaf/0.1/",
	vcard: "http://nwalsh.com/rdf/vCard#",
	link: "http://purl.org/rss/1.0/modules/link/",
	z: "http://www.zotero.org/namespaces/export#",
	eprint: "http://purl.org/eprint/terms/",
	eprints: "http://purl.org/eprint/terms/",
	og: "http://ogp.me/ns#",				// Used for Facebook's OpenGraph Protocol
	article: "http://ogp.me/ns/article#",
	book: "http://ogp.me/ns/book#",
	music: "http://ogp.me/ns/music#",
	video: "http://ogp.me/ns/video#",
	so: "http://schema.org/",
	codemeta: "https://codemeta.github.io/terms/",
	rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
};

var _prefixRemap = {
	// DC should be in lower case
	"http://purl.org/DC/elements/1.0/": "http://purl.org/dc/elements/1.0/",
	"http://purl.org/DC/elements/1.1/": "http://purl.org/dc/elements/1.1/"
};

var namespaces = {};

var _haveItem = false,
	_itemType;

var RDF;

var CUSTOM_FIELD_MAPPINGS;

function addCustomFields(customFields) {
	CUSTOM_FIELD_MAPPINGS = customFields;
}

function setPrefixRemap(map) {
	_prefixRemap = map;
}

function remapPrefix(uri) {
	if (_prefixRemap[uri]) return _prefixRemap[uri];
	return uri;
}

function getPrefixes(doc) {
	var links = doc.getElementsByTagName("link");
	for (let i = 0; i < links.length; i++) {
		let link = links[i];
		// Look for the schema's URI in our known schemata
		var rel = link.getAttribute("rel");
		if (rel) {
			var matches = rel.match(/^schema\.([a-zA-Z]+)/);
			if (matches) {
				let uri = remapPrefix(link.getAttribute("href"));
				// Zotero.debug("Prefix '" + matches[1].toLowerCase() +"' => '" + uri + "'");
				_prefixes[matches[1].toLowerCase()] = uri;
			}
		}
	}

	// also look in html and head elements
	var prefixes = (doc.documentElement.getAttribute('prefix') || '')
		+ (doc.head.getAttribute('prefix') || '');
	var prefixRE = /(\w+):\s+(\S+)/g;
	var m;
	while ((m = prefixRE.exec(prefixes))) {
		let uri = remapPrefix(m[2]);
		Z.debug("Prefix '" + m[1].toLowerCase() + "' => '" + uri + "'");
		_prefixes[m[1].toLowerCase()] = uri;
	}
}

// Boolean Parameters (default values false)
//   * strict = false: compare only ending substring, e.g. bepress
//   * strict = true: compare exactly
//   * all = false: return only first match
//   * all = true: concatenate all values
function getContentText(doc, name, strict, all) {
	let csspath = 'html>head>meta[name' + (strict ? '="' : '$="') + name + '"]';
	if (all) {
		return Array.from(doc.querySelectorAll(csspath)).map(obj => obj.content || obj.contents).join(', ');
	}
	else {
		return attr(doc, csspath, 'content') || attr(doc, csspath, 'contents');
	}
}

function getContent(doc, name, strict) {
	var xpath = '/x:html'
		+ '/*[local-name() = "head" or local-name() = "body"]'
		+ '/x:meta['
		+ (strict ? '@name' : 'substring(@name, string-length(@name)-' + (name.length - 1) + ')')
		+ '="' + name + '"]/';
	return ZU.xpath(doc, xpath + '@content | ' + xpath + '@contents', namespaces);
}

function fixCase(authorName) {
	// fix case if all upper or all lower case
	if (authorName.toUpperCase() === authorName
		|| authorName.toLowerCase() === authorName) {
		return ZU.capitalizeTitle(authorName, true);
	}

	return authorName;
}

function processFields(doc, item, fieldMap, strict) {
	for (var metaName in fieldMap) {
		var zoteroName = fieldMap[metaName];
		// only concatenate values for ISSN and ISBN; otherwise take the first
		var allValues = (zoteroName == "ISSN" || zoteroName == "ISBN");
		var value = getContentText(doc, metaName, strict, allValues);
		if (value && value.trim()) {
			item[zoteroName] = ZU.trimInternal(value);
		}
	}
}

function completeItem(doc, newItem, hwType) {
	// Strip off potential junk from RDF
	newItem.seeAlso = [];

	addHighwireMetadata(doc, newItem, hwType);
	addOtherMetadata(doc, newItem);
	addLowQualityMetadata(doc, newItem);
	finalDataCleanup(doc, newItem);

	if (CUSTOM_FIELD_MAPPINGS) {
		processFields(doc, newItem, CUSTOM_FIELD_MAPPINGS, true);
	}

	newItem.complete();
}

// eslint-disable-next-line consistent-return
function detectWeb(doc, url) {
	// blacklist wordpress jetpack comment plugin so it doesn't override other metadata
	if (url.includes("jetpack.wordpress.com/jetpack-comment/")) return false;
	if (exports.itemType) return exports.itemType;
	init(doc, url, Zotero.done);
}

function init(doc, url, callback, forceLoadRDF) {
	getPrefixes(doc);

	var metaTags = doc.querySelectorAll("meta");
	Z.debug("Embedded Metadata: found " + metaTags.length + " meta tags");
	if (forceLoadRDF /* check if this is called from doWeb */ && !metaTags.length) {
		Z.debug("Embedded Metadata: No meta tags found");
	}

	var hwType, hwTypeGuess, generatorType, statements = [];

	for (let i = 0; i < metaTags.length; i++) {
		let metaTag = metaTags[i];
		// Two formats allowed:
		// 	<meta name="..." content="..." />
		//	<meta property="..." content="..." />
		// The first is more common; the second is recommended by Facebook
		// for their OpenGraph vocabulary
		var tags = metaTag.getAttribute("name");
		if (!tags) tags = metaTag.getAttribute("property");
		var value = metaTag.getAttribute("content");
		if (!tags || !value) continue;
		// Z.debug(tags + " -> " + value);

		tags = tags.split(/\s+/);
		for (var j = 0, m = tags.length; j < m; j++) {
			var tag = tags[j];
			let parts = tag.split(/[.:_]/);
			let prefix;
			let prefixLength;
			if (parts.length > 2) {
				// e.g. og:video:release_date
				prefix = parts[1].toLowerCase();
				prefixLength = parts[0].length + parts[1].length + 1;
			}
			if (!prefix || !_prefixes[prefix]) {
				prefix = parts[0].toLowerCase();
				prefixLength = parts[0].length;
			}
			if (_prefixes[prefix]) {
				var prop = tag.substr(prefixLength + 1);
				prop = prop.charAt(0).toLowerCase() + prop.slice(1);
				// bib and bibo types are special, they use rdf:type to define type
				var specialNS = [_prefixes.bib, _prefixes.bibo];
				if (prop == 'type' && specialNS.includes(_prefixes[prefix])) {
					value = _prefixes[prefix] + value;
					prefix = 'rdf';
				}

				// This debug is for seeing what is being sent to RDF
				// Zotero.debug(_prefixes[prefix]+prop +"=>"+value);
				statements.push([url, _prefixes[prefix] + prop, value]);
			}
			else if (tag.toLowerCase() == 'generator') {
				var lcValue = value.toLowerCase();
				if (lcValue.includes('blogger')
					|| lcValue.includes('wordpress')
					|| lcValue.includes('wooframework')
				) {
					generatorType = 'blogPost';
				}
			}
			else {
				var shortTag = tag.slice(tag.lastIndexOf('citation_'));
				switch (shortTag) {
					case "citation_journal_title":
						hwType = "journalArticle";
						break;
					case "citation_technical_report_institution":
						hwType = "report";
						break;
					case "citation_conference_title":
					case "citation_conference":
						hwType = "conferencePaper";
						break;
					case "citation_book_title":
					case "citation_inbook_title":
						hwType = "bookSection";
						break;
					case "citation_dissertation_institution":
						hwType = "thesis";
						break;
					case "citation_title":		// fall back to journalArticle, since this is quite common
					case "citation_series_title":	// possibly journal article, though it could be book
						hwTypeGuess = hwTypeGuess || "journalArticle";
						break;
					case 'citation_isbn':
						hwTypeGuess = "book"; // Unlikely, but other item types may have ISBNs as well (e.g. Reports?)
						break;
				}
			}
		}
	}

	if (statements.length || forceLoadRDF) {
		// load RDF translator, so that we don't need to replicate import code
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("5e3ad958-ac79-463d-812b-a86a9235c28f");
		translator.setHandler("itemDone", function (obj, newItem) {
			_haveItem = true;
			// Z.debug(newItem)
			completeItem(doc, newItem, hwType);
		});

		translator.getTranslatorObject(function (rdf) {
			for (var i = 0; i < statements.length; i++) {
				var statement = statements[i];
				rdf.Zotero.RDF.addStatement(statement[0], statement[1], statement[2], true);
			}
			var nodes = rdf.getNodes(true);
			rdf.defaultUnknownType = hwTypeGuess || generatorType
				// if we have RDF data, then default to webpage
				|| (nodes.length ? "webpage" : false);

			// if itemType is overridden, no reason to run RDF.detectWeb
			if (exports.itemType) {
				rdf.itemType = exports.itemType;
				_itemType = exports.itemType;
			}
			else if (hwType) _itemType = hwType; // hwTypes are generally most accurate
			else {
				_itemType = nodes.length ? rdf.detectType({}, nodes[0], {}) : rdf.defaultUnknownType;
			}

			RDF = rdf;
			callback(_itemType);
		});
	}
	else {
		callback(exports.itemType || hwType || hwTypeGuess || generatorType);
	}
}

function doWeb(doc, url) {
	// set default namespace
	namespaces.x = doc.documentElement.namespaceURI;
	// populate _rdfPresent, _itemType, and _prefixes
	// As of https://github.com/zotero/zotero/commit/0cd183613f5dacc85676109c3a5c6930e3632fae
	// globals do not seem to be isolated to individual translators, so
	// RDF object, importantly the "itemDone" handlers, can get overridden
	// by other translators, so we cannot reuse the RDF object from detectWeb
	RDF = false;
	if (!RDF) init(doc, url, function () {
		importRDF(doc, url);
	}, true);
	else importRDF(doc, url);
}

// perform RDF import
function importRDF(doc) {
	RDF.doImport();
	if (!_haveItem) {
		completeItem(doc, new Zotero.Item(_itemType));
	}
}

/**
 * Adds HighWire metadata and completes the item
 */
function addHighwireMetadata(doc, newItem, hwType) {
	// HighWire metadata
	processFields(doc, newItem, HIGHWIRE_MAPPINGS);
	var authorNodes = getContent(doc, 'citation_author');
	if (authorNodes.length == 0) {
		authorNodes = getContent(doc, 'citation_authors');
	}

	var editorNodes = getContent(doc, 'citation_editor');
	if (editorNodes.length == 0) {
		editorNodes = getContent(doc, 'citation_editors');
	}
	// save rdfCreators for later
	var rdfCreators = newItem.creators;
	newItem.creators = processHighwireCreators(authorNodes, "author", doc).concat(processHighwireCreators(editorNodes, "editor", doc));


	if (!newItem.creators.length) {
		newItem.creators = rdfCreators;
	}
	else if (rdfCreators.length) {
		// try to use RDF creator roles to update the creators we have
		for (let i = 0, n = newItem.creators.length; i < n; i++) {
			var name = newItem.creators[i].firstName
				+ newItem.creators[i].lastName;
			for (let j = 0, m = rdfCreators.length; j < m; j++) {
				var creator = rdfCreators[j];
				if (name.toLowerCase() == (creator.firstName + creator.lastName).toLowerCase()) {
					// highwire should set all to author, so we only care about editor
					// contributor is not always a contributor
					if (creator.creatorType == 'editor') {
						newItem.creators[i].creatorType = creator.creatorType;
					}
					rdfCreators.splice(j, 1);
					break;
				}
			}
		}

		/* This may introduce duplicates
		// if there are leftover creators from RDF, we should use them
		if(rdfCreators.length) {
			for(var i=0, n=rdfCreators.length; i<n; i++) {
				newItem.creators.push(rdfCreators[i]);
			}
		}*/
	}

	// Deal with tags in a string
	// we might want to look at the citation_keyword metatag later
	if (!newItem.tags || !newItem.tags.length) {
		var tags = getContent(doc, 'citation_keywords');
		newItem.tags = [];
		for (let i = 0; i < tags.length; i++) {
			var tag = tags[i].textContent.trim();
			if (tag) {
				var splitTags = tag.split(';');
				for (let j = 0; j < splitTags.length; j++) {
					if (!splitTags[j].trim()) continue;
					newItem.tags.push(splitTags[j].trim());
				}
			}
		}
	}

	// sometimes RDF has more info, let's not drop it
	var rdfPages = (newItem.pages) ? newItem.pages.split(/\s*-\s*/) : [];
	
	// matches hyphens and en-dashes
	let dashRe = /[-\u2013]/g;
	var firstpage = getContentText(doc, 'citation_firstpage');
	var lastpage = getContentText(doc, 'citation_lastpage');
	if (firstpage) {
		firstpage = firstpage.replace(dashRe, '-');
		if (firstpage.includes("-")) {
			firstpage = firstpage.split(/\s*-\s*/)[0];
			lastpage = lastpage || firstpage.split(/\s*-\s*/)[1];
		}
	}
	if (lastpage) {
		lastpage = lastpage.replace(dashRe, '-');
		if (lastpage.includes('-')) {
			firstpage = firstpage || lastpage.split(/\s*-\s*/)[0];
			lastpage = lastpage.split(/\s*-\s*/)[1];
		}
	}
	firstpage = firstpage || rdfPages[0];
	lastpage = lastpage || rdfPages[1];
	if (firstpage && (firstpage = firstpage.trim())) {
		newItem.pages = firstpage
			+ ((lastpage && (lastpage = lastpage.trim())) ? '-' + lastpage : '');
	}
	
	// swap in hwType for itemType
	if (hwType && hwType != newItem.itemType) {
		newItem.itemType = hwType;
	}
	
	
	// fall back to some other date options
	if (!newItem.date) {
		var onlineDate = getContentText(doc, 'citation_online_date');
		var citationYear = getContentText(doc, 'citation_year');
		
		if (onlineDate && citationYear) {
			onlineDate = ZU.strToISO(onlineDate);
			if (citationYear < onlineDate.substr(0, 4)) {
				// online date can be years after the citation year
				newItem.date = citationYear;
			}
			else {
				newItem.date = onlineDate;
			}
		}
		else {
			newItem.date = onlineDate || citationYear;
		}
	}

	// prefer ISSN over eISSN
	var issn = getContentText(doc, 'citation_issn', null, true)
			|| getContentText(doc, 'citation_ISSN', null, true)
			|| getContentText(doc, 'citation_eIssn', null, true);

	if (issn) newItem.ISSN = issn;

	// This may not always yield desired results
	// i.e. if there is more than one pdf attachment (not common)
	var pdfURL = getContent(doc, 'citation_pdf_url');
	if (pdfURL.length) {
		pdfURL = pdfURL[0].textContent;
		// delete any pdf attachments if present
		// would it be ok to just delete all attachments??
		for (let i = newItem.attachments.length - 1; i >= 0; i--) {
			if (newItem.attachments[i].mimeType == 'application/pdf') {
				newItem.attachments.splice(i, 1);
			}
		}

		newItem.attachments.push({ title: "Full Text PDF", url: pdfURL, mimeType: "application/pdf" });
	}
	else {
		// Only add snapshot if we didn't add a PDF
		newItem.attachments.push({ document: doc, title: "Snapshot" });
	}

	// store PMID in Extra and as a link attachment
	// e.g. http://www.sciencemag.org/content/332/6032/977.full
	var PMID = getContentText(doc, 'citation_pmid');
	if (PMID) {
		if (newItem.extra) newItem.extra += '\n';
		else newItem.extra = '';

		newItem.extra += 'PMID: ' + PMID;

		newItem.attachments.push({
			title: "PubMed entry",
			url: "http://www.ncbi.nlm.nih.gov/pubmed/" + PMID,
			mimeType: "text/html",
			snapshot: false
		});
	}

	// Other last chances
	if (!newItem.url) {
		newItem.url = getContentText(doc, "citation_abstract_html_url")
			|| getContentText(doc, "citation_fulltext_html_url");
	}
}

// process highwire creators; currently only editor and author, but easy to extend
function processHighwireCreators(creatorNodes, role, doc) {
	let itemCreators = [];
	let lastCreator = null;
	for (let creatorNode of creatorNodes) {
		let creators = creatorNode.nodeValue.split(/\s*;\s*/);
		if (creators.length == 1 && creatorNodes.length == 1) {
			var authorsByComma = creators[0].split(/\s*,\s*/);
	
			/* If there is only one author node and
			we get nothing when splitting by semicolon, there are at least two
			words on either side of a comma, and it doesn't appear to be a
			two-word Spanish surname, we split by comma. */
			
			let lang = getContentText(doc, 'citation_language');
			let twoWordName = authorsByComma.length == 2
				&& ['es', 'spa', 'Spanish', 'español'].includes(lang)
				&& authorsByComma[0].split(' ').length == 2;
			if (authorsByComma.length > 1
				&& authorsByComma[0].includes(" ")
				&& authorsByComma[1].includes(" ")
				&& !twoWordName) creators = authorsByComma;
		}
		
		for (let creator of creators) {
			creator = creator.trim();

			// skip empty authors. Try to match something other than punctuation
			if (!creator || !creator.match(/[^\s,-.;]/)) continue;

			// Skip adjacent repeated authors
			if (lastCreator && creator == lastCreator) continue;

			lastCreator = creator;

			creator = ZU.cleanAuthor(creator, role, creator.includes(","));
			if (creator.firstName) {
				// fix case for personal names
				creator.firstName = fixCase(creator.firstName);
				creator.lastName = fixCase(creator.lastName);
			}
			itemCreators.push(creator);
		}
	}
	return itemCreators;
}

function addOtherMetadata(doc, newItem) {
	// Scrape parsely metadata http://parsely.com/api/crawler.html
	var parselyJSON = ZU.xpathText(doc, '(//x:meta[@name="parsely-page"]/@content)[1]', namespaces);
	if (parselyJSON) {
		try {
			var parsely = JSON.parse(parselyJSON);
		}
		catch (e) {}

		if (parsely) {
			if (!newItem.title && parsely.title) {
				newItem.title = parsely.title;
			}

			if (!newItem.url && parsely.url) {
				newItem.url = parsely.url;
			}

			if (!newItem.date && parsely.pub_date) {
				var date = new Date(parsely.pub_date);
				if (!isNaN(date.getUTCFullYear())) {
					newItem.date = ZU.formatDate({
						year: date.getUTCFullYear(),
						month: date.getUTCMonth(),
						day: date.getUTCDate()
					}, true);
				}
			}

			if (!newItem.creators.length && parsely.author) {
				newItem.creators.push(ZU.cleanAuthor('' + parsely.author, 'author'));
			}

			if (!newItem.tags.length && parsely.tags && parsely.tags.length) {
				newItem.tags = parsely.tags;
			}
		}
	}
}

function addLowQualityMetadata(doc, newItem) {
	// if we don't have a creator, look for byline on the page
	// but first, we're desperate for a title
	if (!newItem.title) {
		Z.debug("Title was not found in meta tags. Using document title as title");
		newItem.title = doc.title;
	}

	if (newItem.title) {
		newItem.title = newItem.title.replace(/\s+/g, ' '); // make sure all spaces are \u0020

		if (newItem.publicationTitle) {
			// remove publication title from the end of title (see #604)
			// this can occur if we have to doc.title, og:title etc.
			// Make sure we escape all regex special chars in publication title
			var removePubTitleRegex = new RegExp('\\s*[-–—=_:|~#]\\s*'
				+ newItem.publicationTitle.replace(/([()[\]$^*+.?|])/g, '\\$1') + '\\s*$', 'i');
			newItem.title = newItem.title.replace(removePubTitleRegex, '');
		}
	}

	if (!newItem.creators.length) {
		// the authors in the standard W3 author tag are safer than byline guessing
		var w3authors = new Set(
			Array.from(doc.querySelectorAll('meta[name="author" i], meta[property="author" i]'))
				.map(authorNode => authorNode.content)
				.filter(content => content && /[^\s,-.;]/.test(content)));
		// Condé Nast is a company, not an author
		if (w3authors.size && !(w3authors.size == 1 && w3authors.has("Condé Nast"))) {
			for (let author of w3authors) {
				newItem.creators.push(ZU.cleanAuthor(author, "author"));
			}
		}
		else if (tryOgAuthors(doc)) {
			newItem.creators = tryOgAuthors(doc);
		}
		else {
			getAuthorFromByline(doc, newItem);
		}
	}
	// fall back to "keywords"
	if (!newItem.tags.length) {
		newItem.tags = attr(doc, 'meta[name="keywords" i]', 'content');
	}

	// We can try getting abstract from 'description'
	if (!newItem.abstractNote) {
		newItem.abstractNote = ZU.trimInternal(
			attr(doc, 'meta[name="description" i]', 'content'));
	}

	if (!newItem.url) {
		newItem.url = ZU.xpathText(doc, '//head/link[@rel="canonical"]/@href') || doc.location.href;
	}
	
	if (!newItem.language) {
		newItem.language = attr(doc, 'meta[name="language" i]', 'content')
			|| ZU.xpathText(doc, '//x:meta[@name="lang"]/@content', namespaces)
			|| ZU.xpathText(doc, '//x:meta[@http-equiv="content-language"]/@content', namespaces)
			|| ZU.xpathText(doc, '//html/@lang')
			|| doc.documentElement.getAttribute('xml:lang');
	}

	if (!newItem.date) {
		newItem.date = ZU.strToISO(attr(doc, 'time[datetime]', 'datetime'));
	}


	newItem.libraryCatalog = doc.location.host;

	// add access date
	newItem.accessDate = 'CURRENT_TIMESTAMP';
}

/* returns an array of objects of Og authors, but only where they do not contain a URL to prevent getting facebook profiles
In a worst case scenario, where real authors and social media profiles are mixed, we might miss some, but that's still
preferable to garbage */
function tryOgAuthors(doc) {
	var authors = [];
	var ogAuthors = ZU.xpath(doc, '//meta[@property="article:author" or @property="video:director" or @property="music:musician"]');
	for (var i = 0; i < ogAuthors.length; i++) {
		if (ogAuthors[i].content && !/(https?:\/\/)?[\da-z.-]+\.[a-z.]{2,6}/.test(ogAuthors[i].content) && ogAuthors[i].content !== "false") {
			authors.push(ZU.cleanAuthor(ogAuthors[i].content, "author"));
		}
	}
	return authors.length ? authors : null;
}

function getAuthorFromByline(doc, newItem) {
	var bylineClasses = ['byline', 'bylines', 'vcard', 'article-byline'];
	Z.debug("Looking for authors in " + bylineClasses.join(', '));
	var bylines = [], byline;
	for (var i = 0; i < bylineClasses.length; i++) {
		byline = doc.getElementsByClassName(bylineClasses[i]);
		Z.debug("Found " + byline.length + " elements with '" + bylineClasses[i] + "' class");
		for (var j = 0; j < byline.length; j++) {
			if (!byline[j].innerText.trim()) continue;

			bylines.push(byline[j]);
		}
	}

	var actualByline;
	if (!bylines.length) {
		Z.debug("No byline found.");
		return;
	}
	else if (bylines.length == 1) {
		actualByline = bylines[0];
	}
	else if (newItem.title) {
		Z.debug(bylines.length + " bylines found:");
		Z.debug(bylines.map(function (n) {
			return ZU.trimInternal(n.innerText);
		}).join('\n'));
		Z.debug("Locating the one closest to title.");

		// find the closest one to the title (in DOM)
		actualByline = false;
		var parentLevel = 1;
		var skipList = [];

		// Wrap title in quotes so we can use it in the xpath
		var xpathTitle = newItem.title.toLowerCase();
		if (xpathTitle.includes('"')) {
			if (!xpathTitle.includes("'")) {
				// We can just use single quotes then
				xpathTitle = "'" + xpathTitle + "'";
			}
			else {
				// Escaping double quotes in xpaths is really hard
				// Solution taken from http://kushalm.com/the-perils-of-xpath-expressions-specifically-escaping-quotes
				xpathTitle = 'concat("' + xpathTitle.replace(/"+/g, '",\'$&\', "') + '")';
			}
		}
		else {
			xpathTitle = '"' + xpathTitle + '"';
		}

		var titleXPath = './/*[normalize-space(translate(text(),"ABCDEFGHJIKLMNOPQRSTUVWXYZ\u00a0","abcdefghjiklmnopqrstuvwxyz "))='
			+ xpathTitle + ']';
		Z.debug("Looking for title using: " + titleXPath);
		while (!actualByline && bylines.length != skipList.length && parentLevel < 5) {
			Z.debug("Parent level " + parentLevel);
			for (let i = 0; i < bylines.length; i++) {
				if (skipList.includes(i)) continue;

				if (parentLevel == 1) {
					// skip bylines that contain bylines
					var containsBylines = false;
					for (let j = 0; !containsBylines && j < bylineClasses.length; j++) {
						containsBylines = bylines[i].getElementsByClassName(bylineClasses[j]).length;
					}
					if (containsBylines) {
						Z.debug("Skipping potential byline " + i + ". Contains other bylines");
						skipList.push(i);
						continue;
					}
				}

				var bylineParent = bylines[i];
				for (let j = 0; j < parentLevel; j++) {
					bylineParent = bylineParent.parentElement;
				}
				if (!bylineParent) {
					Z.debug("Skipping potential byline " + i + ". Nowhere near title");
					skipList.push(i);
					continue;
				}

				if (ZU.xpath(bylineParent, titleXPath).length) {
					if (actualByline) {
						// found more than one, bail
						Z.debug('More than one possible byline found. Will not proceed');
						return;
					}
					actualByline = bylines[i];
				}
			}

			parentLevel++;
		}
	}

	if (actualByline) {
		// are any of these actual likely to appear in the real world?
		// well, no, but things happen:
		//   https://github.com/zotero/translators/issues/2001
		let irrelevantTags = 'time, button, textarea, script';
		if (actualByline.querySelector(irrelevantTags)) {
			actualByline = actualByline.cloneNode(true);
			for (let child of actualByline.querySelectorAll(irrelevantTags)) {
				child.parentNode.removeChild(child);
			}
		}
		
		byline = ZU.trimInternal(actualByline.innerText);
		Z.debug("Extracting author(s) from byline: " + byline);
		var li = actualByline.getElementsByTagName('li');
		if (li.length) {
			for (let i = 0; i < li.length; i++) {
				var author = ZU.trimInternal(li[i].textContent).replace(/[,\s]+$/, "");
				newItem.creators.push(ZU.cleanAuthor(fixCase(author), 'author', author.includes(',')));
			}
		}
		else {
			byline = byline.split(/\bby[:\s]+/i);
			byline = byline[byline.length - 1].replace(/\s*[[(].+?[)\]]\s*/g, '');
			var authors = byline.split(/\s*(?:(?:,\s*)?\band\b|,|&)\s*/i);
			if (authors.length == 2 && authors[0].split(' ').length == 1) {
				// this was probably last, first
				newItem.creators.push(ZU.cleanAuthor(fixCase(byline), 'author', true));
			}
			else {
				for (let i = 0, n = authors.length; i < n; i++) {
					if (!authors[i].length || authors[i].includes('@')) {
						// skip some odd splits and twitter handles
						continue;
					}

					if (authors[i].split(/\s/).length == 1) {
						// probably corporate author
						newItem.creators.push({
							lastName: authors[i],
							creatorType: 'author',
							fieldMode: 1
						});
					}
					else {
						newItem.creators.push(
							ZU.cleanAuthor(fixCase(authors[i]), 'author'));
					}
				}
			}
		}
	}
	else {
		Z.debug("No reliable byline found.");
	}
}


/** If we already have tags - run through them one by one,
 * split where necessary and concat them.
 * This will deal with multiple tags, some of them comma delimited,
 * some semicolon, some individual
 */
function finalDataCleanup(doc, newItem) {
	if (typeof newItem.tags == 'string') {
		newItem.tags = [newItem.tags];
	}
	if (newItem.tags && newItem.tags.length && Zotero.parentTranslator) {
		if (exports.splitTags) {
			var tags = [];
			for (let i in newItem.tags) {
				newItem.tags[i] = newItem.tags[i].trim();
				if (!newItem.tags[i].includes(';')) {
					// split by comma, since there are no semicolons
					tags = tags.concat(newItem.tags[i].split(/\s*,\s*/));
				}
				else {
					tags = tags.concat(newItem.tags[i].split(/\s*;\s*/));
				}
			}
			for (let i = 0; i < tags.length; i++) {
				if (tags[i] === "") tags.splice(i, 1);
			}
			newItem.tags = tags;
		}
	}
	else {
		// Unless called from another translator, don't include automatic tags,
		// because most of the time they are not right
		newItem.tags = [];
	}

	// Cleanup DOI
	if (newItem.DOI) {
		newItem.DOI = ZU.cleanDOI(newItem.DOI);
	}

	// Add DOI to non-supported item types
	if (newItem.DOI && !ZU.fieldIsValidForType("DOI", newItem.itemType)) {
		if (newItem.extra) {
			newItem.extra += "\nDOI: " + newItem.DOI;
		}
		else {
			newItem.extra = "DOI: " + newItem.DOI;
		}
	}
	
	// URLs in meta tags can technically be relative (see the ccc.de test for
	// an example), so we need to handle that
	if (newItem.url) {
		newItem.url = relativeToAbsolute(doc, newItem.url);
	}


	// remove itemID - comes from RDF translator, doesn't make any sense for online data
	newItem.itemID = "";

	// worst case, if this is not called from another translator, use URL for title
	if (!newItem.title && !Zotero.parentTranslator) newItem.title = newItem.url;
}

function relativeToAbsolute(doc, url) {
	if (ZU.resolveURL) {
		return ZU.resolveURL(url);
	}
	
	// adapted from Nuclear Receptor Signaling translator

	if (!url) {
		return doc.location.href;
	}

	// check whether it's already absolute
	if (url.match(/^(\w+:)?\/\//)) {
		return url;
	}

	if (url[0] == '/') {
		if (url[1] == '/') {
			// protocol-relative
			return doc.location.protocol + url;
		}
		else {
			// relative to root
			return doc.location.protocol + '//' + doc.location.host
				+ url;
		}
	}
	
	// relative to current directory
	let location = doc.location.href;
	if (location.includes('?')) {
		location = location.slice(0, location.indexOf('?'));
	}
	return location.replace(/([^/]\/)[^/]+$/, '$1') + url;
}

var exports = {
	doWeb: doWeb,
	detectWeb: detectWeb,
	addCustomFields: addCustomFields,
	itemType: false,
	// activate/deactivate splitting tags in final data cleanup when they contain commas or semicolons
	splitTags: true,
	fixSchemaURI: setPrefixRemap
};

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.ajol.info/index.php/thrb/article/view/63347",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Knowledge, treatment seeking and preventive practices in respect of malaria among patients with HIV at the Lagos University Teaching Hospital",
				"creators": [
					{
						"firstName": "Akinwumi A.",
						"lastName": "Akinyede",
						"creatorType": "author"
					},
					{
						"firstName": "Alade",
						"lastName": "Akintonwa",
						"creatorType": "author"
					},
					{
						"firstName": "Charles",
						"lastName": "Okany",
						"creatorType": "author"
					},
					{
						"firstName": "Olufunsho",
						"lastName": "Awodele",
						"creatorType": "author"
					},
					{
						"firstName": "Duro C.",
						"lastName": "Dolapo",
						"creatorType": "author"
					},
					{
						"firstName": "Adebimpe",
						"lastName": "Adeyinka",
						"creatorType": "author"
					},
					{
						"firstName": "Ademola",
						"lastName": "Yusuf",
						"creatorType": "author"
					}
				],
				"date": "2011/10/17",
				"DOI": "10.4314/thrb.v13i4.63347",
				"ISSN": "1821-9241",
				"abstractNote": "The synergistic interaction between Human Immunodeficiency virus (HIV) disease and Malaria makes it mandatory for patients with HIV to respond appropriately in preventing and treating malaria. Such response will help to control the two diseases. This study assessed the knowledge of 495 patients attending the HIV clinic, in Lagos University Teaching Hospital, Nigeria.&nbsp; Their treatment seeking, preventive practices with regards to malaria, as well as the impact of socio &ndash; demographic / socio - economic status were assessed. Out of these patients, 245 (49.5 %) used insecticide treated bed nets; this practice was not influenced by socio &ndash; demographic or socio &ndash; economic factors.&nbsp; However, knowledge of the cause, knowledge of prevention of malaria, appropriate use of antimalarial drugs and seeking treatment from the right source increased with increasing level of education (p &lt; 0.05). A greater proportion of the patients, 321 (64.9 %) utilized hospitals, pharmacy outlets or health centres when they perceived an attack of malaria. Educational intervention may result in these patients seeking treatment from the right place when an attack of malaria fever is perceived.",
				"issue": "4",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "www.ajol.info",
				"publicationTitle": "Tanzania Journal of Health Research",
				"rights": "Copyright (c)",
				"url": "https://www.ajol.info/index.php/thrb/article/view/63347",
				"volume": "13",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"type": "web",
		"url": "https://scholarworks.umass.edu/climate_nuclearpower/2011/nov19/34/",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Session F: Contributed Oral Papers – F2: Energy, Climate, Nuclear Medicine: Reducing Energy Consumption and CO2 One Street Lamp at a Time",
				"creators": [
					{
						"firstName": "Peter",
						"lastName": "Somssich",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"abstractNote": "Why wait for federal action on incentives to reduce energy use and address  Greenhouse Gas (GHG) reductions (e.g. CO2), when we can take personal  actions right now in our private lives and in our communities? One such  initiative by private citizens working with Portsmouth NH officials resulted  in the installation of energy reducing lighting products on Court St. and  the benefits to taxpayers are still coming after over 4 years of operation.  This citizen initiative to save money and reduce CO2 emissions, while only  one small effort, could easily be duplicated in many towns and cities.  Replacing old lamps in just one street fixture with a more energy efficient  (Non-LED) lamp has resulted after 4 years of operation ($\\sim $15,000 hr.  life of product) in real electrical energy savings of $>$ {\\$}43. and CO2  emission reduction of $>$ 465 lbs. The return on investment (ROI) was less  than 2 years. This is much better than any financial investment available  today and far safer. Our street only had 30 such lamps installed; however,  the rest of Portsmouth (population 22,000) has at least another 150 street  lamp fixtures that are candidates for such an upgrade. The talk will also  address other energy reduction measures that green the planet and also put  more green in the pockets of citizens and municipalities.",
				"conferenceName": "Climate Change and the Future of Nuclear Power",
				"language": "en",
				"libraryCatalog": "scholarworks.umass.edu",
				"shortTitle": "Session F",
				"url": "https://scholarworks.umass.edu/climate_nuclearpower/2011/nov19/34",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://scholarworks.umass.edu/lov/vol2/iss1/2/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Wabanaki Resistance and Healing: An Exploration of the Contemporary Role of an Eighteenth Century Bounty Proclamation in an Indigenous Decolonization Process",
				"creators": [
					{
						"firstName": "Bonnie D.",
						"lastName": "Newsom",
						"creatorType": "author"
					},
					{
						"firstName": "Jamie",
						"lastName": "Bissonette-Lewey",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"DOI": "10.7275/R5KW5CXB",
				"ISSN": "1947-508X",
				"abstractNote": "The purpose of this paper is to examine the contemporary role of an eighteenth century bounty proclamation issued on the Penobscot Indians of Maine. We focus specifically on how the changing cultural context of the 1755 Spencer Phips Bounty Proclamation has transformed the document from serving as a tool for sanctioned violence to a tool of decolonization for the Indigenous peoples of Maine. We explore examples of the ways indigenous and non-indigenous people use the Phips Proclamation to illustrate past violence directed against Indigenous peoples. This exploration is enhanced with an analysis of the re-introduction of the Phips Proclamation using concepts of decolonization theory.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "scholarworks.umass.edu",
				"pages": "2",
				"publicationTitle": "Landscapes of Violence",
				"shortTitle": "Wabanaki Resistance and Healing",
				"url": "https://scholarworks.umass.edu/lov/vol2/iss1/2",
				"volume": "2",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"type": "web",
		"url": "https://scholarworks.umass.edu/open_access_dissertations/508/",
		"items": [
			{
				"itemType": "thesis",
				"title": "Decision-Theoretic Meta-reasoning in Partially Observable and Decentralized Settings",
				"creators": [
					{
						"firstName": "Alan Scott",
						"lastName": "Carlin",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"abstractNote": "This thesis examines decentralized meta-reasoning. For a single agent or multiple agents, it may not be enough for agents to compute correct decisions if they do not do so in a timely or resource efficient fashion. The utility of agent decisions typically increases with decision quality, but decreases with computation time. The reasoning about one's computation process is referred to as meta-reasoning. Aspects of meta-reasoning considered in this thesis include the reasoning about how to allocate computational resources, including when to stop one type of computation and begin another, and when to stop all computation and report an answer. Given a computational model, this translates into computing how to schedule the basic computations that solve a problem. This thesis constructs meta-reasoning strategies for the purposes of monitoring and control in multi-agent settings, specifically settings that can be modeled by the Decentralized Partially Observable Markov Decision Process (Dec-POMDP). It uses decision theory to optimize computation for efficiency in time and space in communicative and non-communicative decentralized settings. Whereas base-level reasoning describes the optimization of actual agent behaviors, the meta-reasoning strategies produced by this thesis dynamically optimize the computational resources which lead to the selection of base-level behaviors.",
				"extra": "DOI: 10.7275/n8e9-xy93",
				"language": "en",
				"libraryCatalog": "scholarworks.umass.edu",
				"university": "University of Massachusetts Amherst",
				"url": "https://scholarworks.umass.edu/open_access_dissertations/508",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"type": "web",
		"url": "https://scielosp.org/article/rsp/2007.v41suppl2/94-100/en/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Perceptions of HIV rapid testing among injecting drug users in Brazil",
				"creators": [
					{
						"firstName": "P. R.",
						"lastName": "Telles-Dias",
						"creatorType": "author"
					},
					{
						"firstName": "S.",
						"lastName": "Westman",
						"creatorType": "author"
					},
					{
						"firstName": "A. E.",
						"lastName": "Fernandez",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Sanchez",
						"creatorType": "author"
					}
				],
				"date": "2007-12",
				"DOI": "10.1590/S0034-89102007000900015",
				"ISSN": "0034-8910, 0034-8910, 1518-8787",
				"abstractNote": "OBJETIVO: Descrever as impressões, experiências, conhecimentos, crenças e a receptividade de usuários de drogas injetáveis para participar das estratégias de testagem rápida para HIV. MÉTODOS: Estudo qualitativo exploratório foi conduzido entre usuários de drogas injetáveis, de dezembro de 2003 a fevereiro de 2004, em cinco cidades brasileiras, localizadas em quatro regiões do País. Um roteiro de entrevista semi-estruturado contendo questões fechadas e abertas foi usado para avaliar percepções desses usuários sobre procedimentos e formas alternativas de acesso e testagem. Foram realizadas 106 entrevistas, aproximadamente 26 por região. RESULTADOS: Características da população estudada, opiniões sobre o teste rápido e preferências por usar amostras de sangue ou saliva foram apresentadas junto com as vantagens e desvantagens associadas a cada opção. Os resultados mostraram a viabilidade do uso de testes rápidos entre usuários de drogas injetáveis e o interesse deles quanto à utilização destes métodos, especialmente se puderem ser equacionadas questões relacionadas à confidencialidade e confiabilidade dos testes. CONCLUSÕES: Os resultados indicam que os testes rápidos para HIV seriam bem recebidos por essa população. Esses testes podem ser considerados uma ferramenta valiosa, ao permitir que mais usuários de drogas injetáveis conheçam sua sorologia para o HIV e possam ser referidos para tratamento, como subsidiar a melhoria das estratégias de testagem entre usuários de drogas injetáveis.",
				"journalAbbreviation": "Rev. Saúde Pública",
				"language": "en",
				"libraryCatalog": "scielosp.org",
				"pages": "94-100",
				"publicationTitle": "Revista de Saúde Pública",
				"url": "https://scielosp.org/article/rsp/2007.v41suppl2/94-100/en/",
				"volume": "41",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"type": "web",
		"url": "https://www.hindawi.com/journals/mpe/2013/868174/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Robust Filtering for Networked Stochastic Systems Subject to Sensor Nonlinearity",
				"creators": [
					{
						"firstName": "Guoqiang",
						"lastName": "Wu",
						"creatorType": "author"
					},
					{
						"firstName": "Jianwei",
						"lastName": "Zhang",
						"creatorType": "author"
					},
					{
						"firstName": "Yuguang",
						"lastName": "Bai",
						"creatorType": "author"
					}
				],
				"date": "2013/2/20",
				"DOI": "10.1155/2013/868174",
				"ISSN": "1024-123X",
				"abstractNote": "The problem of network-based robust filtering for stochastic systems with sensor nonlinearity is investigated in this paper. In the network environment, the effects of the sensor saturation, output quantization, and network-induced delay are taken into simultaneous consideration, and the output measurements received in the filter side are incomplete. The random delays are modeled as a linear function of the stochastic variable described by a Bernoulli random binary distribution. The derived criteria for performance analysis of the filtering-error system and filter design are proposed which can be solved by using convex optimization method. Numerical examples show the effectiveness of the design method.",
				"language": "en",
				"libraryCatalog": "www.hindawi.com",
				"publicationTitle": "Mathematical Problems in Engineering",
				"url": "https://www.hindawi.com/journals/mpe/2013/868174/",
				"volume": "2013",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"type": "web",
		"url": "https://volokh.com/2013/12/22/northwestern-cant-quit-asa-boycott-member/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Northwestern Can't Quit ASA Over Boycott Because it is Not a Member",
				"creators": [
					{
						"firstName": "Eugene",
						"lastName": "Kontorovich",
						"creatorType": "author"
					}
				],
				"date": "2013-12-22T16:58:34+00:00",
				"abstractNote": "Northwestern University recently condemned the American Studies Association boycott of Israel. Unlike some other schools that quit their institutional membership in the ASA over the boycott, Northwestern has not. Many of my Northwestern colleagues were about to start urging a similar withdrawal. Then we learned from our administration that despite being listed as in institutional […]",
				"blogTitle": "The Volokh Conspiracy",
				"language": "en-US",
				"url": "https://volokh.com/2013/12/22/northwestern-cant-quit-asa-boycott-member/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://hbr.org/2015/08/how-to-do-walking-meetings-right",
		"items": [
			{
				"itemType": "webpage",
				"title": "How to Do Walking Meetings Right",
				"creators": [
					{
						"firstName": "Russell",
						"lastName": "Clayton",
						"creatorType": "author"
					},
					{
						"firstName": "Christopher",
						"lastName": "Thomas",
						"creatorType": "author"
					},
					{
						"firstName": "Jack",
						"lastName": "Smothers",
						"creatorType": "author"
					}
				],
				"date": "2015-08-05T12:05:17Z",
				"abstractNote": "New research finds creativity benefits.",
				"url": "https://hbr.org/2015/08/how-to-do-walking-meetings-right",
				"websiteTitle": "Harvard Business Review",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://olh.openlibhums.org/article/id/4400/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Opening the Open Library of Humanities",
				"creators": [
					{
						"firstName": "Martin Paul",
						"lastName": "Eve",
						"creatorType": "author"
					},
					{
						"firstName": "Caroline",
						"lastName": "Edwards",
						"creatorType": "author"
					}
				],
				"date": "2015-09-28",
				"DOI": "10.16995/olh.46",
				"ISSN": "2056-6700",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "olh.openlibhums.org",
				"publicationTitle": "Open Library of Humanities",
				"url": "https://olh.openlibhums.org/article/id/4400/",
				"volume": "1",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"type": "web",
		"url": "https://www.vox.com/2016/1/7/10726296/wheres-rey-star-wars-monopoly",
		"items": [
			{
				"itemType": "webpage",
				"title": "#WheresRey and the big Star Wars toy controversy, explained",
				"creators": [
					{
						"firstName": "Caroline",
						"lastName": "Framke",
						"creatorType": "author"
					}
				],
				"date": "2016-01-07T08:20:02-05:00",
				"abstractNote": "Excluding female characters in merchandise is an ongoing pattern.",
				"language": "en",
				"url": "https://www.vox.com/2016/1/7/10726296/wheres-rey-star-wars-monopoly",
				"websiteTitle": "Vox",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.diva-portal.org/smash/record.jsf?pid=diva2%3A766397&dswid=5057",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Mobility modeling for transport efficiency : Analysis of travel characteristics based on mobile phone data",
				"creators": [
					{
						"firstName": "Vangelis",
						"lastName": "Angelakis",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Gundlegård",
						"creatorType": "author"
					},
					{
						"firstName": "Clas",
						"lastName": "Rydergren",
						"creatorType": "author"
					},
					{
						"firstName": "Botond",
						"lastName": "Rajna",
						"creatorType": "author"
					},
					{
						"firstName": "Katerina",
						"lastName": "Vrotsou",
						"creatorType": "author"
					},
					{
						"firstName": "Richard",
						"lastName": "Carlsson",
						"creatorType": "author"
					},
					{
						"firstName": "Julien",
						"lastName": "Forgeat",
						"creatorType": "author"
					},
					{
						"firstName": "Tracy H.",
						"lastName": "Hu",
						"creatorType": "author"
					},
					{
						"firstName": "Evan L.",
						"lastName": "Liu",
						"creatorType": "author"
					},
					{
						"firstName": "Simon",
						"lastName": "Moritz",
						"creatorType": "author"
					},
					{
						"firstName": "Sky",
						"lastName": "Zhao",
						"creatorType": "author"
					},
					{
						"firstName": "Yaotian",
						"lastName": "Zheng",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"abstractNote": "DiVA portal is a finding tool for research publications and student theses written at the following 50 universities and research institutions.",
				"conferenceName": "Netmob 2013 - Third International Conference on the Analysis of Mobile Phone Datasets, May 1-3, 2013, MIT, Cambridge, MA, USA",
				"language": "eng",
				"libraryCatalog": "www.diva-portal.org",
				"shortTitle": "Mobility modeling for transport efficiency",
				"url": "http://urn.kb.se/resolve?urn=urn:nbn:se:liu:diva-112443",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"type": "web",
		"url": "https://link.springer.com/article/10.1023/A:1021669308832",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Why Bohm's Quantum Theory?",
				"creators": [
					{
						"firstName": "H. D.",
						"lastName": "Zeh",
						"creatorType": "author"
					}
				],
				"date": "1999/04/01",
				"DOI": "10.1023/A:1021669308832",
				"ISSN": "1572-9524",
				"abstractNote": "This is a brief reply to S. Goldstein's article “Quantum theory without observers” in Physics Today. It is pointed out that Bohm's pilot wave theory is successful only because it keeps Schrödinger's (exact) wave mechanics unchanged, while the rest of it is observationally meaningless and solely based on classical prejudice.",
				"issue": "2",
				"journalAbbreviation": "Found Phys Lett",
				"language": "en",
				"libraryCatalog": "link.springer.com",
				"pages": "197-200",
				"publicationTitle": "Foundations of Physics Letters",
				"rights": "1999 Plenum Publishing Corporation",
				"url": "https://link.springer.com/article/10.1023/A:1021669308832",
				"volume": "12",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"type": "web",
		"url": "https://muse.jhu.edu/article/234097",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Serfs on the Move: Peasant Seasonal Migration in Pre-Reform Russia, 1800–61",
				"creators": [
					{
						"firstName": "Boris B.",
						"lastName": "Gorshkov",
						"creatorType": "author"
					}
				],
				"date": "2000",
				"DOI": "10.1353/kri.2008.0061",
				"ISSN": "1538-5000",
				"issue": "4",
				"language": "en",
				"libraryCatalog": "muse.jhu.edu",
				"pages": "627-656",
				"publicationTitle": "Kritika: Explorations in Russian and Eurasian History",
				"shortTitle": "Serfs on the Move",
				"url": "https://muse.jhu.edu/article/234097",
				"volume": "1",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"type": "web",
		"url": "https://media.ccc.de/v/35c3-9386-introduction_to_deep_learning",
		"items": [
			{
				"itemType": "videoRecording",
				"title": "Introduction to Deep Learning",
				"creators": [
					{
						"firstName": "",
						"lastName": "teubi",
						"creatorType": "author"
					}
				],
				"date": "2018-12-27 01:00:00 +0100",
				"abstractNote": "This talk will teach you the fundamentals of machine learning and give you a sneak peek into the internals of the mystical black box. You...",
				"language": "en",
				"libraryCatalog": "media.ccc.de",
				"url": "https://media.ccc.de/v/35c3-9386-introduction_to_deep_learning",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://upcommons.upc.edu/handle/2117/114657",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Necesidad y morfología: la forma racional",
				"creators": [
					{
						"firstName": "Antonio A.",
						"lastName": "García García",
						"creatorType": "author"
					}
				],
				"date": "2015-06",
				"ISBN": "9788460842118",
				"abstractNote": "Abstracts aceptados sin presentacion / Accepted abstracts without presentation",
				"conferenceName": "International Conference Arquitectonics Network: Architecture, Education and Society, Barcelona, 3-5 June 2015: Abstracts",
				"language": "spa",
				"libraryCatalog": "upcommons.upc.edu",
				"publisher": "GIRAS. Universitat Politècnica de Catalunya",
				"rights": "Open Access",
				"shortTitle": "Necesidad y morfología",
				"url": "https://upcommons.upc.edu/handle/2117/114657",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"type": "web",
		"url": "https://www.pewresearch.org/fact-tank/2019/12/12/u-s-children-more-likely-than-children-in-other-countries-to-live-with-just-one-parent/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "U.S. has world’s highest rate of children living in single-parent households",
				"creators": [
					{
						"firstName": "Stephanie",
						"lastName": "Kramer",
						"creatorType": "author"
					}
				],
				"abstractNote": "Almost a quarter of U.S. children under 18 live with one parent and no other adults, more than three times the share of children around the world who do so.",
				"blogTitle": "Pew Research Center",
				"language": "en-US",
				"url": "https://www.pewresearch.org/fact-tank/2019/12/12/u-s-children-more-likely-than-children-in-other-countries-to-live-with-just-one-parent/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cambridge.org/core/books/conservation-research-policy-and-practice/22AB241C45F182E40FC7F13637485D7E",
		"items": [
			{
				"itemType": "webpage",
				"title": "Conservation Research, Policy and Practice",
				"creators": [
					{
						"firstName": "William J.",
						"lastName": "Sutherland",
						"creatorType": "editor"
					},
					{
						"firstName": "Peter N. M.",
						"lastName": "Brotherton",
						"creatorType": "editor"
					},
					{
						"firstName": "Zoe G.",
						"lastName": "Davies",
						"creatorType": "editor"
					},
					{
						"firstName": "Nancy",
						"lastName": "Ockendon",
						"creatorType": "editor"
					},
					{
						"firstName": "Nathalie",
						"lastName": "Pettorelli",
						"creatorType": "editor"
					},
					{
						"firstName": "Juliet A.",
						"lastName": "Vickery",
						"creatorType": "editor"
					}
				],
				"date": "2020/04",
				"abstractNote": "Conservation research is essential for advancing knowledge but to make an impact scientific evidence must influence conservation policies, decision making and practice. This raises a multitude of challenges. How should evidence be collated and presented to policymakers to maximise its impact? How can effective collaboration between conservation scientists and decision-makers be established? How can the resulting messages be communicated to bring about change? Emerging from a successful international symposium organised by the British Ecological Society and the Cambridge Conservation Initiative, this is the first book to practically address these questions across a wide range of conservation topics. Well-renowned experts guide readers through global case studies and their own experiences. A must-read for practitioners, researchers, graduate students and policymakers wishing to enhance the prospect of their work 'making a difference'. This title is also available as Open Access on Cambridge Core.",
				"extra": "DOI: 10.1017/9781108638210",
				"language": "en",
				"url": "https://www.cambridge.org/core/books/conservation-research-policy-and-practice/22AB241C45F182E40FC7F13637485D7E",
				"websiteTitle": "Cambridge Core",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.linguisticsociety.org/proceedings/index.php/PLSA/article/view/4468",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A Robin Hood approach to forced alignment: English-trained algorithms and their use on Australian languages",
				"creators": [
					{
						"firstName": "Sarah",
						"lastName": "Babinski",
						"creatorType": "author"
					},
					{
						"firstName": "Rikker",
						"lastName": "Dockum",
						"creatorType": "author"
					},
					{
						"firstName": "J. Hunter",
						"lastName": "Craft",
						"creatorType": "author"
					},
					{
						"firstName": "Anelisa",
						"lastName": "Fergus",
						"creatorType": "author"
					},
					{
						"firstName": "Dolly",
						"lastName": "Goldenberg",
						"creatorType": "author"
					},
					{
						"firstName": "Claire",
						"lastName": "Bowern",
						"creatorType": "author"
					}
				],
				"date": "2019/03/15",
				"DOI": "10.3765/plsa.v4i1.4468",
				"ISSN": "2473-8689",
				"abstractNote": "Forced alignment automatically aligns audio recordings of spoken language with transcripts at the segment level, greatly reducing the time required to prepare data for phonetic analysis. However, existing algorithms are mostly trained on a few well-documented languages. We test the performance of three algorithms against manually aligned data. For at least some tasks, unsupervised alignment (either based on English or trained from a small corpus) is sufficiently reliable for it to be used on legacy data for low-resource languages. Descriptive phonetic work on vowel inventories and prosody can be accurately captured by automatic alignment with minimal training data. Consonants provided significantly more challenges for forced alignment.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "journals.linguisticsociety.org",
				"pages": "3-12",
				"publicationTitle": "Proceedings of the Linguistic Society of America",
				"rights": "Copyright (c) 2019 Sarah Babinski, Rikker Dockum, J. Hunter Craft, Anelisa Fergus, Dolly Goldenberg, Claire Bowern",
				"shortTitle": "A Robin Hood approach to forced alignment",
				"url": "https://journals.linguisticsociety.org/proceedings/index.php/PLSA/article/view/4468",
				"volume": "4",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"type": "web",
		"url": "https://www.swr.de/wissen/1000-antworten/kultur/woher-kommt-redensart-ueber-die-wupper-gehen-100.html",
		"items": [
			{
				"itemType": "webpage",
				"title": "Woher kommt \"über die Wupper gehen\"?",
				"creators": [
					{
						"firstName": "",
						"lastName": "SWRWissen",
						"creatorType": "author"
					}
				],
				"date": "2019-04-11",
				"abstractNote": "Es gibt eine Vergleichsredensart: \"Der ist über den Jordan gegangen.“ Das heißt, er ist gestorben. Das bezieht sich auf die alten Grenzen Israels. In Wuppertal jedoch liegt jenseits des Flusses das Gefängnis.",
				"language": "de",
				"url": "https://www.swr.de/wissen/1000-antworten/woher-kommt-redensart-ueber-die-wupper-gehen-100.html",
				"websiteTitle": "swr.online",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.azatliq.org/a/24281041.html",
		"items": [
			{
				"itemType": "webpage",
				"title": "Татар яшьләре татарлыкны сакларга тырыша",
				"creators": [
					{
						"firstName": "гүзәл",
						"lastName": "мәхмүтова",
						"creatorType": "author"
					}
				],
				"date": "2011-07-29",
				"abstractNote": "Бу көннәрдә “Идел” җәйләвендә XXI Татар яшьләре көннәре үтә. Яшьләр вакытларын төрле чараларда катнашып үткәрә.",
				"language": "tt",
				"url": "https://www.azatliq.org/a/24281041.html",
				"websiteTitle": "Азатлык Радиосы",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.hackingarticles.in/windows-privilege-escalation-kernel-exploit/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Windows Privilege Escalation: Kernel Exploit",
				"creators": [
					{
						"firstName": "Raj",
						"lastName": "Chandel",
						"creatorType": "author"
					}
				],
				"date": "2021-12-30T17:41:33+00:00",
				"abstractNote": "As this series was dedicated to Windows Privilege escalation thus I’m writing this Post to explain command practice for kernel-mode exploitation. Table of Content What",
				"blogTitle": "Hacking Articles",
				"language": "en",
				"shortTitle": "Windows Privilege Escalation",
				"url": "https://www.hackingarticles.in/windows-privilege-escalation-kernel-exploit/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://opg.optica.org/oe/fulltext.cfm?uri=oe-30-21-39188&id=509758",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Self-calibration interferometric stitching test method for cylindrical surfaces",
				"creators": [
					{
						"firstName": "Hao",
						"lastName": "Hu",
						"creatorType": "author"
					},
					{
						"firstName": "Zizhou",
						"lastName": "Sun",
						"creatorType": "author"
					},
					{
						"firstName": "Shuai",
						"lastName": "Xue",
						"creatorType": "author"
					},
					{
						"firstName": "Chaoliang",
						"lastName": "Guan",
						"creatorType": "author"
					},
					{
						"firstName": "Yifan",
						"lastName": "Dai",
						"creatorType": "author"
					},
					{
						"firstName": "Junfeng",
						"lastName": "Liu",
						"creatorType": "author"
					},
					{
						"firstName": "Xiaoqiang",
						"lastName": "Peng",
						"creatorType": "author"
					},
					{
						"firstName": "Shanyong",
						"lastName": "Chen",
						"creatorType": "author"
					},
					{
						"firstName": "Yong",
						"lastName": "Liu",
						"creatorType": "author"
					}
				],
				"date": "2022/10/10",
				"DOI": "10.1364/OE.473836",
				"ISSN": "1094-4087",
				"abstractNote": "The surface figure accuracy requirement of cylindrical surfaces widely used in rotors of gyroscope, spindles of ultra-precision machine tools and high-energy laser systems is nearly 0.1 µm. Cylindricity measuring instrument that obtains 1-D profile result cannot be utilized for deterministic figuring methods. Interferometric stitching test for cylindrical surfaces utilizes a CGH of which the system error will accumulated to unacceptable extent for large aperture/angular aperture that require many subapertures. To this end, a self-calibration interferometric stitching method for cylindrical surfaces is proposed. The mathematical model of cylindrical surface figure and the completeness condition of self-calibration stitching test of cylindrical surfaces were analyzed theoretically. The effects of shear/stitching motion error and the subapertures lattice on the self-calibration test results were analyzed. Further, a self-calibration interferometric stitching algorithm that can theoretically recover all the necessary components of the system error for testing cylindrical surfaces was proposed. Simulations and experiments on a shaft were conducted to validate the feasibility.",
				"issue": "21",
				"journalAbbreviation": "Opt. Express, OE",
				"language": "EN",
				"libraryCatalog": "opg.optica.org",
				"pages": "39188-39206",
				"publicationTitle": "Optics Express",
				"rights": "&#169; 2022 Optica Publishing Group",
				"url": "https://opg.optica.org/oe/abstract.cfm?uri=oe-30-21-39188",
				"volume": "30",
				"attachments": [
					{
						"title": "Full Text PDF",
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
		"type": "web",
		"url": "https://themarkup.org/inside-the-markup/2023/01/18/five-ways-toward-a-fairer-more-transparent-hiring-process",
		"items": [
			{
				"itemType": "webpage",
				"title": "Five Ways Toward a Fairer, More Transparent Hiring Process – The Markup",
				"creators": [
					{
						"firstName": "Sisi",
						"lastName": "Wei",
						"creatorType": "author"
					}
				],
				"date": "2023-01-18",
				"abstractNote": "We want candidates hearing about us for the first time to feel just as equipped as those with friends on staff",
				"language": "en",
				"url": "https://themarkup.org/inside-the-markup/2023/01/18/five-ways-toward-a-fairer-more-transparent-hiring-process",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.nhs.uk/conditions/baby/babys-development/behaviour/separation-anxiety/",
		"items": [
			{
				"itemType": "webpage",
				"title": "Separation anxiety",
				"creators": [],
				"date": "7 Dec 2020, 4:40 p.m.",
				"abstractNote": "Separation anxiety is a normal part of your child's development. Find out how to handle the times when your baby or toddler cries or is clingy when you leave them.",
				"language": "en",
				"url": "https://www.nhs.uk/conditions/baby/babys-development/behaviour/separation-anxiety/",
				"websiteTitle": "nhs.uk",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.tatler.com/article/clodagh-mckenna-hon-harry-herbert-wedding-george-osborne-highclere-castle",
		"items": [
			{
				"itemType": "webpage",
				"title": "The Queen’s godson married glamorous Irish chef Clodagh McKenna at Highclere this weekend",
				"creators": [
					{
						"firstName": "Annabel",
						"lastName": "Sampson",
						"creatorType": "author"
					}
				],
				"date": "2021-08-16T09:54:36.000Z",
				"abstractNote": "The Hon Harry Herbert, son of the 7th Earl of Carnarvon, married Clodagh McKenna in a fairytale wedding attended by everyone from George Osborne and his fiancée, Thea Rogers, to Laura Whitmore",
				"language": "en-GB",
				"url": "https://www.tatler.com/article/clodagh-mckenna-hon-harry-herbert-wedding-george-osborne-highclere-castle",
				"websiteTitle": "Tatler",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
