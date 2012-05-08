{
	"translatorID": "951c027d-74ac-47d4-a107-9c3069ab7b48",
	"label": "Embedded Metadata",
	"creator": "Simon Kornblith and Avram Lyon",
	"target": "",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 400,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2012-05-08 12:52:05"
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

var HIGHWIRE_MAPPINGS = {
	"citation_title":"title",
	"citation_publication_date":"date",	//perhaps this is still used in some old implementations
	"citation_date":"date",
	"citation_journal_title":"publicationTitle",
	"citation_journal_abbrev":"journalAbbreviation",
	"citation_book_title":"bookTitle",
	"citation_volume":"volume",
	"citation_issue":"issue",
	"citation_series_title":"series",
	"citation_conference_title":"conferenceName",
	"citation_conference":"conferenceName",
	"citation_dissertation_institution":"university",
	"citation_technical_report_institution":"institution",
	"citation_technical_report_number":"number",
	"citation_publisher":"publisher",
	"citation_isbn":"ISBN",
	"citation_abstract":"abstractNote",
	"citation_doi":"DOI",
	"citation_public_url":"url",
	"citation_language":"language"

/* the following are handled separately in addHighwireMetadata()
	"citation_author"
	"citation_authors"
	"citation_firstpage"
	"citation_lastpage"
	"citation_issn"
	"citation_eIssn"
	"citation_pdf_url"
*/
};

// Maps actual prefix in use to URI
var _prefixes = {
	"dc":"http://purl.org/dc/terms/",
	"dcterms":"http://purl.org/dc/terms/",
	"prism":"http://prismstandard.org/namespaces/1.2/basic/",
	"foaf":"http://xmlns.com/foaf/0.1/",
	"eprint":"http://purl.org/eprint/terms/",
	"eprints":"http://purl.org/eprint/terms/",
	"og":"http://ogp.me/ns#",
	"article":"http://ogp.me/ns/article#",
	"book":"http://ogp.me/ns/book#"
};

var _rdfPresent = false,
	_haveItem = false,
	_itemType;

var CUSTOM_FIELD_MAPPINGS;

function addCustomFields(customFields) {
	CUSTOM_FIELD_MAPPINGS = customFields;
}

function getPrefixes(doc) {
	var links = doc.getElementsByTagName("link");
	for(var i=0, link; link = links[i]; i++) {
		// Look for the schema's URI in our known schemata
		var rel = link.getAttribute("rel");
		if(rel) {
			var matches = rel.match(/^schema\.([a-zA-Z]+)/);
			if(matches) {
				//Zotero.debug("Prefix '" + matches[1].toLowerCase() +"' => '" + links[i].getAttribute("href") + "'");
				_prefixes[matches[1].toLowerCase()] = link.getAttribute("href");
			}
		}
	}
}

function getContentText(doc, name) {
	var xpath = '//meta[substring(@name, string-length(@name)-'
							+ (name.length - 1) + ')="'+ name +'"]/';
	return ZU.xpathText(doc, xpath + '@content | '
													+ xpath + '@contents');
}

function getContent(doc, name) {
	var xpath = '//meta[substring(@name, string-length(@name)-'
							+ (name.length - 1) + ')="'+ name +'"]/';
	return ZU.xpath(doc, xpath + '@content | '
											+ xpath + '@contents');
}

function fixCase(authorName) {
	//fix case if all upper or all lower case
	if(authorName.toUpperCase() === authorName ||
		authorName.toLowerCase() === authorName) {
		return ZU.capitalizeTitle(authorName, true);
	}

	return authorName;
}

function processFields(doc, item, fieldMap) {
	for(var metaName in fieldMap) {
		var zoteroName = fieldMap[metaName];
		var value = getContentText(doc, metaName);
		if(value && value.trim()) {
			item[zoteroName] = ZU.trimInternal(value);
		}
	}
}

function completeItem(doc, newItem) {
	addHighwireMetadata(doc, newItem);

	if(CUSTOM_FIELD_MAPPINGS) {
		processFields(doc, newItem, CUSTOM_FIELD_MAPPINGS);
	}

	newItem.complete();
}

function detectWeb(doc, url) {
	getPrefixes(doc);

	var metaTags = doc.getElementsByTagName("meta");
	//itemTypes as determined from various schemas
	var dcType, dcTypeGuess, eprintsType, eprintsTypeGuess, prismType,
		prismTypeGuess, ogType, ogTypeGuess, hwType, hwTypeGuess;
	for(var i=0, metaTag; metaTag = metaTags[i]; i++) {
		// Two formats allowed:
		// 	<meta name="..." content="..." />
		//	<meta property="..." content="..." />
		// The first is more common; the second is recommended by Facebook
		// for their OpenGraph vocabulary
		var tag = metaTag.getAttribute("name");
		if (!tag) tag = metaTag.getAttribute("property");
		var value = metaTag.getAttribute("content");
		if(!tag || !value) continue;

		// We allow three delimiters between the namespace and the property
		var delimIndex = tag.indexOf('.');
		if(delimIndex === -1) delimIndex = tag.indexOf(':');
		if(delimIndex === -1) delimIndex = tag.indexOf('_');
		if(delimIndex === -1) continue;

		//process everything in lower case
		tag = tag.toLowerCase();
		value = value.toLowerCase();

		var prefix = tag.substr(0, delimIndex);
		var prop = tag.substr(delimIndex+1);

		var schema = _prefixes[prefix];
		if(schema) {
			_rdfPresent = true;

			if (!ogType && prop === 'type' && schema === _prefixes.og) {
				switch (value) {
					case "video.movie":
					case "video.episode":
					case "video.tv_show":
					case "video.other":
						ogType = "videoRecording";
						break;
					case "article":
						ogTypeGuess = "newspaperArticle";
						break;
					case "book":
						ogType = "book";
						break;
					case "music.song":
					case "music.album":
						ogType = "audioRecording";
						break;
					case "website":
						ogType = "webpage";
						break;
				}

			} else if(!prismType && schema === _prefixes.prism) {
				// see http://www.idealliance.org/specifications/prism/specifications/prism-controlled-vocabularies/prism-version-20-controlled-vocabu
				switch(prop) {
					//try to guess based on container
					case 'aggregationtype':
						switch(value) {
							case 'book':
								prismType = 'bookSection';
								break;
							case 'feed':
								//could also be email
								prismTypeGuess = 'blogPost';
								break;
							case 'journal':
								prismType = 'journalArticle';
								break;
							case 'magazine':
								prismType = 'magazineArticle';
								break;
							case 'newsletter':
								prismType = 'newsArticle';
								break;
							//case 'pamphlet':
							//case 'other':
							//case 'manual':
							//case 'catalog':
						}
						break;
					/**This should tell us exactly what it is.
					 * Very long list. only including things we can handle.
					 * Also, multiple can be specified. Spec. recommends listing 
					 * from most to least inclusive. We should probably only 
					 * handle the latter.
					 */
					case 'genre':
						switch(value) {
							case 'abstract':
							case 'acknowledgements':
							case 'authorbio':
							case 'bibliography':
							case 'index':
							case 'tableofcontents':
								prismType = 'bookSection';
								break;
							case 'autobiography':
							case 'biography':
								prismType = 'book';
								break;
							case 'blogentry':
								prismType = 'blogPost';
								break;
							case 'homepage':
							case 'webliography':
								prismType = 'webpage';
								break;
							case 'interview':
								prismType = 'interview';
								break;
							case 'letters':
								prismType = 'letter';
								break;
							case 'adaptation':
							case 'analysis':
								prismTypeGuess = 'journalArticle';
								break;
							case 'column':
							case 'newsbulletin':
							case 'opinion':
								//magazine or newspaper
								prismTypeGuess = 'newspaperArticle';
								break;
							case 'coverstory':
							case 'essay':
							case 'feature':
							case 'insidecover':
								//journal or magazine
								prismTypeGuess = 'magazineArticle';
								break;
							//case 'advertorial':
							//case 'advertisement':
							//case 'brief':
							//case 'chronology':
							//case 'classifiedad':
							//case 'correction':
							//case 'cover':
							//case 'coverpackage':
							//case 'electionresults':
							//case 'eventscalendar':
							//case 'excerpt':
							//case 'photoshoot':
							//case 'featurepackage':
							//case 'financialstatement':
							//case 'interactivecontent':
							//case 'legaldocument':
							//case 'masthead':
							//case 'notice':
							//case 'obituary':
							//case 'photoessay':
							//case 'poem':
							//case 'poll':
							//case 'pressrelease':
							//case 'productdescription':
							//case 'profile':
							//case 'quotation':
							//case 'ranking':
							//case 'recipe':
							//case 'reprint':
							//case 'response':
							//case 'review':
							//case 'schedule':
							//case 'sidebar':
							//case 'stockquote':
							//case 'sectiontableofcontents':
							//case 'transcript':
							//case 'wirestory':
						}
						break;
					case 'platform':
						switch(value) {
							case 'broadcast':
								prismTypeGuess = 'tvBroadcast';
								break;
							case 'web':
								prismTypeGuess = 'webpage';
								break;
						}
						break;
				}
				//at least pretend we're a journalArticle if we have prism data
				if(!prismTypeGuess) prismTypeGuess = 'journalArticle';

			/** EPrints and PRISM use dc:type tags, so we handle those here as well */
			} else if (schema === _prefixes.dc) {
				/** It may be desirable in the future to try to determine
				 * itemType by 'format', but for now we just look at 'type'
				 * http://dublincore.org/documents/dcmi-terms/#terms-format
				 * mimeType http://www.iana.org/assignments/media-types/
				 */
				if(prop === 'type') {
					switch (value) {
						//from http://www.ukoln.ac.uk/repositories/digirep/index/Eprints_Type_Vocabulary_Encoding_Scheme
						case 'book':
						case 'patent':
						case 'report':
						case 'thesis':
							eprintsType = value;
							break;
						case 'bookitem':
							eprintsType = 'bookSection';
							break;
						//case 'bookreview':
						case 'conferenceitem':
						case 'conferencepaper':
						case 'conferenceposter':
							eprintsType = 'conferencePaper';
							break;
						case 'journalitem':
						case 'journalarticle':
						case 'submittedjournalarticle':
							eprintsType = 'journalArticle';
							break;
						case 'newsitem':
							eprintsType = 'newspaperArticle';
							break;
						case 'scholarlytext':
							eprintsTypeGuess = 'journalArticle';
							break;
						case 'workingpaper':
							eprintsType = 'manuscript';
							break;

						//from http://www.idealliance.org/specifications/prism/specifications/prism-controlled-vocabularies/prism-12-controlled-vocabularies
						//some are the same as eprints and are handled above
						case 'article':
							prismTypeGuess = 'journalArticle';
							break;
						case 'electronicbook':
							prismType = 'book';
							break;
						case 'homepage':
						case 'webpage':
							prismType = 'webpage';
							break;
						case 'illustration':
							prismType = 'artwork';
							break;
						case 'map':
							prismType = 'map';
							break;

						//from http://dublincore.org/documents/dcmi-type-vocabulary/
						//this vocabulary is much broader
						case 'event':
							//very broad, but has an associated location
							dcTypeGuess = 'presentation';
						case 'image':
							//this includes almost any graphic, moving or not
							dcTypeGuess = 'artwork';
							break;
						case 'movingimage':
							//could be either film, tvBroadcast, or videoRecording
							dcTypeGuess = 'videoRecording';
							break;
						case 'software':
							dcTypeGuess = 'computerProgram';
							break;
						case 'sound':
							//could be podcast, radioBroadcast, or audioRecording
							dcTypeGuess = 'audioRecording';
							break;
						case 'stillimage':
							//could be map or artwork
							dcTypeGuess = 'artwork';
							break;
						case 'text':
							//very broad
							dcTypeGuess = 'journalArticle';
							break;
						//case 'collection':
						//case 'dataset':
						//case 'interactiveresource':
						//case 'physicalobject':
						//case 'service':
					}
				}
			}
			//at least pretend we're a journalArticle if we have eprints data
			if(schema === _prefixes.eprint && !eprintTypeGuess) eprintTypeGuess = 'journalArticle';

		//try to find some highwire metadata
		} else if(!hwType) {
			var shortTag = tag.slice(tag.lastIndexOf('citation_'));
			switch(shortTag) {
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
					hwType = "bookSection";
					break;
				case "citation_dissertation_institution":
					hwType = "thesis";
					break;
				case "citation_title":		//fall back to journalArticle, since this is quite common
				case "citation_series_title":	//possibly journal article, though it could be book
					hwTypeGuess = "journalArticle";
					break;
			}
		}

		/**try to terminate loop early if we have an item type we are sure about
		 * but keep trying until we encounter some RDF data (if any), so we know
		 * if we need to call the RDF translator
		 */
		 //we're confident with HW, OG, PRISM, and EPrints types
		if(_rdfPresent && (hwType || ogType || prismType || eprintsType)) break;
	}

	//set item type in order of confidence in data
	_itemType = hwType || ogType || eprintsType || prismType || dcType ||
				hwTypeGuess || ogTypeGuess || eprintsTypeGuess ||
				prismTypeGuess || dcTypeGuess ||
				//if we have RDF data, but nothing, then pretend it's webpage
				(_rdfPresent? 'webpage' : false);

	return _itemType;
}

function doWeb(doc, url) {
	// populate _rdfPresent, _itemType, and _prefixes
	detectWeb(doc, url);

	if(_rdfPresent) {
		// load RDF translator, so that we don't need to replicate import code
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("5e3ad958-ac79-463d-812b-a86a9235c28f");
		translator.setHandler("itemDone", function(obj, newItem) {
			_haveItem = true;
			completeItem(doc, newItem);
		});

		translator.getTranslatorObject(function(rdf) {
			var metaTags = doc.getElementsByTagName("meta");

			for(var i=0, metaTag; metaTag = metaTags[i]; i++) {
				// Two formats allowed:
				// 	<meta name="..." content="..." />
				//	<meta property="..." content="..." />
				// The first is more common; the second is recommended by Facebook
				// for their OpenGraph vocabulary
				var tag = metaTag.getAttribute("name");
				if (!tag) tag = metaTag.getAttribute("property");
				var value = metaTag.getAttribute("content");
				if(!tag || !value) continue;
				// We allow three delimiters between the namespace and the property
				var delimIndex = tag.indexOf('.');
				if(delimIndex === -1) delimIndex = tag.indexOf(':');
				if(delimIndex === -1) delimIndex = tag.indexOf('_');
				if(delimIndex === -1) continue;

				var prefix = tag.substr(0, delimIndex).toLowerCase();

				if(_prefixes[prefix]) {
					var prop = tag[delimIndex+1].toLowerCase()+tag.substr(delimIndex+2);
					// This debug is for seeing what is being sent to RDF
					//Zotero.debug(_prefixes[prefix]+prop +"=>"+value);
					rdf.Zotero.RDF.addStatement(url, _prefixes[prefix] + prop, value, true);
				}
			}

			rdf.defaultUnknownType = _itemType;
			rdf.doImport();
			if(!_haveItem) {
				completeItem(doc, new Zotero.Item(_itemType));
			}
		});
	} else {
		completeItem(doc, new Zotero.Item(_itemType));
	}
}

/**
 * Adds HighWire metadata and completes the item
 */
function addHighwireMetadata(doc, newItem) {
	// HighWire metadata
	processFields(doc, newItem, HIGHWIRE_MAPPINGS);

	var authorNodes = getContent(doc, 'citation_author')
						.concat(getContent(doc, 'citation_authors'));
	//save rdfCreators for later
	var rdfCreators = newItem.creators;
	newItem.creators = [];

	for(var i=0, n=authorNodes.length; i<n; i++) {
		//make sure there are no empty authors
		var authors = authorNodes[i].nodeValue.replace(/(;[^A-Za-z0-9]*)$/, "").split(/\s*;\s/);
		if (authors.length == 1) {
			/* If we get nothing when splitting by semicolon, and at least two words on
			* either side of the comma when splitting by comma, we split by comma. */
			var authorsByComma = authors[0].split(/\s*,\s*/);
			if (authorsByComma.length > 1
				&& authorsByComma[0].indexOf(" ") !== -1
				&& authorsByComma[1].indexOf(" ") !== -1)
				authors = authorsByComma;
		}
		for(var j=0, m=authors.length; j<m; j++) {
			var author = authors[j];
			author = ZU.cleanAuthor(author, "author", author.indexOf(",") !== -1);
			if(author.firstName) {
				//fix case for personal names
				author.firstName = fixCase(author.firstName);
				author.lastName = fixCase(author.lastName);
			}
			newItem.creators.push(author);
		}
	}

	if( !newItem.creators.length ) {
		newItem.creators = rdfCreators;
	} else if(rdfCreators.length) {
		//try to use RDF creator roles to update the creators we have
		for(var i=0, n=newItem.creators.length; i<n; i++) {
			var name = newItem.creators[i].firstName +
				newItem.creators[i].lastName;
			for(var j=0, m=rdfCreators.length; j<m; j++) {
				var creator = rdfCreators[j];
				if( name.toLowerCase() == (creator.firstName + creator.lastName).toLowerCase() ) {
					//highwire should set all to author, so we only care about editor
					//contributor is not always a contributor
					if(creator.creatorType == 'editor') {
						newItem.creators[i].creatorType == creator.creatorType;
					}
					rdfCreators.splice(j,1);
					break;
				}
			}
		}

		/* This may introduce duplicates
		//if there are leftover creators from RDF, we should use them
		if(rdfCreators.length) {
			for(var i=0, n=rdfCreators.length; i<n; i++) {
				newItem.creators.push(rdfCreators[i]);
			}
		}*/
	}

	//Deal with tags in a string
	//we might want to look at the citation_keyword metatag later
	if(!newItem.tags || !newItem.tags.length)
		 newItem.tags = getContent(doc, 'citation_keywords')
		 					.map(function(t) { return t.textContent; });

	//fall back to "keywords"
	if(!newItem.tags.length)
		 newItem.tags = ZU.xpath(doc, '//meta[@name="keywords"]/@content')
		 					.map(function(t) { return t.textContent; });

	/**If we already have tags - run through them one by one,
	 * split where ncessary and concat them.
	 * This  will deal with multiple tags, some of them comma delimited,
	 * some semicolon, some individual
	 */
	if (newItem.tags.length) {
		var tags = [];
		for (var i in newItem.tags) {
			newItem.tags[i] = newItem.tags[i].trim();
			if (newItem.tags[i].indexOf(';') == -1) {
				//split by comma, since there are no semicolons
				tags = tags.concat( newItem.tags[i].split(/\s*,\s*/) );
			} else {
				tags = tags.concat( newItem.tags[i].split(/\s*;\s*/) );
			}
		}
		for (var i=0; i<tags.length; i++) {
			if (tags[i] === "") tags.splice(i, 1);
		}
		newItem.tags = tags;
	}

	//We can try getting abstract from 'description'
	if(!newItem.abstractNote) {
		newItem.abstractNote = ZU.trimInternal(
			ZU.xpathText(doc, '//meta[@name="description"]/@content') || '');
	}

	//Cleanup DOI
	if (newItem.DOI){
		newItem.DOI =newItem.DOI.replace(/^doi:\s*/, "");
	}

	//sometimes RDF has more info, let's not drop it
	var rdfPages = (newItem.pages)? newItem.pages.split(/\s*-\s*/) : new Array();
	var firstpage = getContentText(doc, 'citation_firstpage') ||
					rdfPages[0];
	var lastpage = getContentText(doc, 'citation_lastpage') ||
					rdfPages[1];
	if(firstpage && ( firstpage = firstpage.trim() )) {
		newItem.pages = firstpage +
			( ( lastpage && ( lastpage = lastpage.trim() ) )?'-' + lastpage : '' );
	}


	//prefer ISSN over eISSN
	var issn = getContentText(doc, 'citation_issn') ||
			getContentText(doc, 'citation_eIssn');

	if(issn) newItem.ISSN = issn;

	//This may not always yield desired results
	//i.e. if there is more than one pdf attachment (not common)
	var pdfURL = getContent(doc, 'citation_pdf_url');
	if(pdfURL.length) {
		pdfURL = pdfURL[0].textContent;
		//delete any pdf attachments if present
		//would it be ok to just delete all attachments??
		for(var i=0, n=newItem.attachments.length; i<n; i++) {
			if(newItem.attachments[i].mimeType == 'application/pdf') {
				delete newItem.attachments[i];
			}
		}

		newItem.attachments.push({title:"Full Text PDF", url:pdfURL, mimeType:"application/pdf"});
	}


	// Other last chances
	if(!newItem.url) newItem.url = doc.location.href;
	if(!newItem.title) newItem.title = doc.title;

	// add attachment
	newItem.attachments.push({document:doc, title:"Snapshot"});

	// add access date
	newItem.accessDate = 'CURRENT_TIMESTAMP';

	newItem.libraryCatalog = doc.location.host;
}

var exports = {
	"doWeb":doWeb,
	"addCustomFields": addCustomFields
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://tools.chass.ncsu.edu/open_journal/index.php/acontracorriente/article/view/174",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Verónica",
						"lastName": "Norando",
						"creatorType": "author"
					},
					{
						"firstName": "Ludmila",
						"lastName": "Scheinkman",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"huelga",
					"trabajadores",
					"trabajadroras",
					"relaciones de género"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://tools.chass.ncsu.edu/open_journal/index.php/acontracorriente/article/view/174",
				"title": "\"La Huelga de los Conventillos\", Buenos Aires, Nueva Pompeya, 1936. Un aporte a los estudios sobre género y clase",
				"publicationTitle": "A Contracorriente",
				"rights": "1. Author hereby grants, transfers, and assigns to  A Contracorriente :  (a) the exclusive first serial rights in the Work for publication and distribution throughout the world, as  A Contracorriente  sees fit, in all languages and formats, by print or any electronic means, including, without limitation, the internet, other public and/or private proprietary intranets and computer networks and on CD-ROMs, DVDs and other discs, before the Work shall appear in any other publication (whether print or electronic), in any manner, format or language, or in any other medium now known or hereafter devised. The first serial rights granted to  A Contracorriente  by this Paragraph 1(a) shall be exclusive to  A Contracorriente  until one year following the date of the first serial publication of the Work by  A Contracorriente ; in addition, this grant of rights shall include the non-exclusive right in perpetuity to include the Work in any collection, or compilation produced or authorized by  A Contracorriente , and containing at least 75% material that has appeared in  A Contracorriente , for distribution throughout the world, in all languages and formats, by print or any electronic means, including, without limitation, the internet and other public and proprietary intranets and computer networks and on CDROMs, DVDs and other discs;  (b) further, the non-exclusive right to authorize, reproduce and distribute reprints of the Work throughout the world, in all languages and formats, by print or any electronic means, after the Work appears in a publication produced or authorized by  A Contracorriente ; the right to permit subscribers and other users of the services and publications in which the Work may appear electronically to download, reproduce, and otherwise utilize the Work for their personal, non-commercial use throughout the universe; and the non-exclusive perpetual right, throughout the world, to use the Work, in whole or in part, and Author’s name, likeness, or biography in promoting, advertising, and/or publicizing any publication in which the Work is authorized to appear consistent with this Agreement.  2.  A Contracorriente  reserves the right to publish the Work with illustrations and other graphic materials. Nothing contained herein shall obligate  A Contracorriente  to exploit any of the rights granted to  A Contracorriente  hereunder. All rights not granted to  A Contracorriente  are reserved to Author for Author’s own use and/or transfer, assignment, or disposition.  3. Author represents and warrants: the Work is original to Author, has not been copied in whole or in part, and does not infringe upon the copyright or any other rights of any person or entity; Author has the right to grant the rights granted to  A Contracorriente  under this Agreement free of any and all claims and encumbrances; Author has not granted or transferred any rights in or to the Work to any third party; and Author has not done and will not do anything that has impaired, might impair or will impair in any way any of the rights granted to  A Contracorriente  hereunder.  4. Author shall defend, indemnify, and hold harmless the NC State and its employees, agents, affiliates, successors, licensees, and assigns from and against all claims, damages, liabilities, losses, costs, and expenses, including, without limitation, attorney’s fees and costs, arising out of any breach or alleged breach of any of Author’s representations, warranties, or agreements. Any remedies that Author may have against  A Contracorriente  for breach of this Agreement shall be limited to the right to recover damages, if any, in an action at law. Author hereby waives any right or remedy in equity, including any right to terminate this Agreement, to rescind  A Contracorriente ’s rights in the Work, or to enjoin, restrain, or otherwise impair in any manner the production or distribution of any publication that is authorized or produced by  A Contracorriente .   5.  A Contracorriente  shall have the right to assign this Agreement, either in whole or in part, to any entity affiliated with  A Contracorriente  or to any party that acquires all or substantially all of  A Contracorriente 's assets. Author shall not have the right to further assign any of the rights conferred pursuant to this Agreement, either in whole or in part, or any of the rights granted to Author herein.   6. This Agreement is intended by the parties hereto as the final expression of their understanding with respect to the subject matter herein, as a complete and exclusive statement of the terms herein, and supersedes any and all prior or contemporaneous negotiations, understandings, and agreements between the parties relating thereto.   7. The Agreement may be modified only by a writing signed by both parties to the Agreement. The laws and courts of the State of North Carolina shall govern and control the resolution of any and all conflicts and disputes that may arise hereunder.",
				"date": "10/10/2011",
				"reportType": "Text.Serial.Journal",
				"letterType": "Text.Serial.Journal",
				"manuscriptType": "Text.Serial.Journal",
				"mapType": "Text.Serial.Journal",
				"thesisType": "Text.Serial.Journal",
				"websiteType": "Text.Serial.Journal",
				"presentationType": "Text.Serial.Journal",
				"postType": "Text.Serial.Journal",
				"audioFileType": "Text.Serial.Journal",
				"language": "en",
				"extra": "Este trabajo se propone realizar un análisis de las   relaciones de género y clase a través de un estudio de caso: la “Huelga de   los Conventillos” de la fábrica textil Gratry en 1936, que se extendió por   más de tres meses, pasando casi inadvertida, sin embargo, para la   investigación histórica. Siendo la textil una rama de industria con una   mayoría de mano de obra femenina, el caso de la casa Gratry, donde el 60% de   los 800 obreros eran mujeres, aparece como ejemplar para la observación de la   actividad de las mujeres en conflicto.   En el trabajo se analiza el rol de las trabajadoras en   la huelga, su participación política, sus formas de organización y   resistencia, haciendo eje en las determinaciones de género y de clase que son   abordadas de manera complementaria e interrelacionada, así como el complejo   entramado de tensiones y solidaridades que éstas generan. De éste modo, se   pretende ahondar en la compleja conformación de una identidad obrera   femenina, a la vez que se discute con aquella mirada historiográfica tradicional   que ha restado importancia a la participación de la mujer en el conflicto   social. Esto se realizará a través de la exploración de una serie de   variables: las relaciones inter-género e inter-clase (fundamentalmente el   vínculo entre las trabajadoras y la patronal masculina), inter-género e   intra-clase (la relación entre trabajadoras y trabajadores), intra-género e   inter-clase (los lazos entre las trabajadoras y las vecinas comerciantes del   barrio), intra-género e intra-clase (relaciones de solidaridad entre   trabajadoras en huelga, y de antagonismo entre huelguistas y “carneras”).   Para ello se trabajó un corpus documental que incluye   información de tipo cuantitativa (las estadísticas del Boletín Informativo   del Departamento Nacional del Trabajo), y cualitativa: periódicos obreros   –fundamentalmente  El Obrero Textil , órgano gremial de la Unión   Obrera Textil,  Semanario de la CGT-Independencia  (órgano de   la Confederación General del Trabajo (CGT)-Independencia) y  La   Vanguardia  (periódico del Partido Socialista), entre otros, y   entrevistas orales a vecinas de Nueva Pompeya y familiares de trabajadoras de   la fábrica Gratry. Se desarrollará una metodología cuali-cuantitativa para el   cruce de estas fuentes.",
				"volume": "9",
				"issue": "1",
				"abstractNote": "\"La Huelga de los Conventillos\", Buenos Aires, Nueva Pompeya, 1936. Un aporte a los estudios sobre género y clase",
				"pages": "1-37",
				"ISSN": "1548-7083",
				"url": "http://tools.chass.ncsu.edu/open_journal/index.php/acontracorriente/article/view/174",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "tools.chass.ncsu.edu"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.ajol.info/index.php/thrb/article/view/63347",
		"items": [
			{
				"itemType": "journalArticle",
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
				"notes": [],
				"tags": [
					"malaria",
					"knowledge",
					"treatment",
					"prevention",
					"HIV patients",
					"Nigeria"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://www.ajol.info/index.php/thrb/article/view/63347",
				"title": "Knowledge, treatment seeking and preventive practices in respect of malaria among patients with HIV at the Lagos University Teaching Hospital",
				"publicationTitle": "Tanzania Journal of Health Research",
				"rights": "Copyright for articles published in this journal is retained by the journal.",
				"date": "17/10/2011",
				"reportType": "Text.Serial.Journal",
				"letterType": "Text.Serial.Journal",
				"manuscriptType": "Text.Serial.Journal",
				"mapType": "Text.Serial.Journal",
				"thesisType": "Text.Serial.Journal",
				"websiteType": "Text.Serial.Journal",
				"presentationType": "Text.Serial.Journal",
				"postType": "Text.Serial.Journal",
				"audioFileType": "Text.Serial.Journal",
				"language": "en",
				"extra": "The synergistic interaction between Human Immunodeficiency virus (HIV) disease and Malaria makes it mandatory for patients with HIV to respond appropriately in preventing and treating malaria. Such response will help to control the two diseases. This study assessed the knowledge of 495 patients attending the HIV clinic, in Lagos University Teaching Hospital, Nigeria.&nbsp; Their treatment seeking, preventive practices with regards to malaria, as well as the impact of socio &ndash; demographic / socio - economic status were assessed. Out of these patients, 245 (49.5 %) used insecticide treated bed nets; this practice was not influenced by socio &ndash; demographic or socio &ndash; economic factors.&nbsp; However, knowledge of the cause, knowledge of prevention of malaria, appropriate use of antimalarial drugs and seeking treatment from the right source increased with increasing level of education (p &lt; 0.05). A greater proportion of the patients, 321 (64.9 %) utilized hospitals, pharmacy outlets or health centres when they perceived an attack of malaria. Educational intervention may result in these patients seeking treatment from the right place when an attack of malaria fever is perceived.",
				"volume": "13",
				"issue": "4",
				"DOI": "10.4314/thrb.v13i4.63347",
				"abstractNote": "Knowledge, treatment seeking and preventive practices in respect of malaria among patients with HIV at the Lagos University Teaching Hospital",
				"ISSN": "0856-6496",
				"url": "http://www.ajol.info/index.php/thrb/article/view/63347",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.ajol.info"
			}
		]
	},
	{
		"type": "web",
		"url": "http://scholarworks.umass.edu/climate_nuclearpower/2011/nov19/34/",
		"items": [
			{
				"itemType": "conferencePaper",
				"creators": [
					{
						"firstName": "Peter",
						"lastName": "Somssich",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"title": "Session F: Contributed Oral Papers – F2: Energy, Climate, Nuclear Medicine: Reducing Energy Consumption and CO2 One Street Lamp at a Time",
				"date": "2011",
				"conferenceName": "Climate Change and the Future of Nuclear Power",
				"abstractNote": "Why wait for federal action on incentives to reduce energy use and address Greenhouse Gas (GHG) reductions (e.g. CO2), when we can take personal actions right now in our private lives and in our communities? One such initiative by private citizens working with Portsmouth NH officials resulted in the installation of energy reducing lighting products on Court St. and the benefits to taxpayers are still coming after over 4 years of operation. This citizen initiative to save money and reduce CO2 emissions, while only one small effort, could easily be duplicated in many towns and cities. Replacing old lamps in just one street fixture with a more energy efficient (Non-LED) lamp has resulted after 4 years of operation ($\\sim $15,000 hr. life of product) in real electrical energy savings of $>$ {\\$}43. and CO2 emission reduction of $>$ 465 lbs. The return on investment (ROI) was less than 2 years. This is much better than any financial investment available today and far safer. Our street only had 30 such lamps installed; however, the rest of Portsmouth (population 22,000) has at least another 150 street lamp fixtures that are candidates for such an upgrade. The talk will also address other energy reduction measures that green the planet and also put more green in the pockets of citizens and municipalities.",
				"url": "http://scholarworks.umass.edu/climate_nuclearpower/2011/nov19/34/",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "scholarworks.umass.edu",
				"shortTitle": "Session F"
			}
		]
	},
	{
		"type": "web",
		"url": "http://scholarworks.umass.edu/lov/vol2/iss1/2/",
		"items": [
			{
				"itemType": "journalArticle",
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
				"notes": [],
				"tags": [
					"Wabanaki",
					"Bounty Proclamations",
					"Decolonization"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"title": "Wabanaki Resistance and Healing: An Exploration of the Contemporary Role of an Eighteenth Century Bounty Proclamation in an Indigenous Decolonization Process",
				"date": "2012",
				"publicationTitle": "Landscapes of Violence",
				"volume": "2",
				"issue": "1",
				"abstractNote": "The purpose of this paper is to examine the contemporary role of an eighteenth century bounty proclamation issued on the Penobscot Indians of Maine. We focus specifically on how the changing cultural context of the 1755 Spencer Phips Bounty Proclamation has transformed the document from serving as a tool for sanctioned violence to a tool of decolonization for the Indigenous peoples of Maine. We explore examples of the ways indigenous and non-indigenous people use the Phips Proclamation to illustrate past violence directed against Indigenous peoples. This exploration is enhanced with an analysis of the re-introduction of the Phips Proclamation using concepts of decolonization theory.",
				"pages": "2",
				"ISSN": "1947-508X",
				"url": "http://scholarworks.umass.edu/lov/vol2/iss1/2/",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "scholarworks.umass.edu",
				"shortTitle": "Wabanaki Resistance and Healing"
			}
		]
	},
	{
		"type": "web",
		"url": "http://scholarworks.umass.edu/open_access_dissertations/508/",
		"items": [
			{
				"itemType": "thesis",
				"creators": [
					{
						"firstName": "Alan Scott",
						"lastName": "Carlin",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Agents",
					"Dec-POMDP",
					"MDP",
					"Meta-reasoning",
					"Multiagent",
					"Partial Observability"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"title": "Decision-Theoretic Meta-reasoning in Partially Observable and Decentralized Settings",
				"date": "2012",
				"university": "University of Massachusetts - Amherst",
				"abstractNote": "This thesis examines decentralized meta-reasoning. For a single agent or multiple agents, it may not be enough for agents to compute correct decisions if they do not do so in a timely or resource efficient fashion. The utility of agent decisions typically increases with decision quality, but decreases with computation time. The reasoning about one's computation process is referred to as meta-reasoning. Aspects of meta-reasoning considered in this thesis include the reasoning about how to allocate computational resources, including when to stop one type of computation and begin another, and when to stop all computation and report an answer. Given a computational model, this translates into computing how to schedule the basic computations that solve a problem. This thesis constructs meta-reasoning strategies for the purposes of monitoring and control in multi-agent settings, specifically settings that can be modeled by the Decentralized Partially Observable Markov Decision Process (Dec-POMDP). It uses decision theory to optimize computation for efficiency in time and space in communicative and non-communicative decentralized settings. Whereas base-level reasoning describes the optimization of actual agent behaviors, the meta-reasoning strategies produced by this thesis dynamically optimize the computational resources which lead to the selection of base-level behaviors.",
				"url": "http://scholarworks.umass.edu/open_access_dissertations/508/",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "scholarworks.umass.edu"
			}
		]
	}
]
/** END TEST CASES **/