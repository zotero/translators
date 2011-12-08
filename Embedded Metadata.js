{
	"translatorID": "951c027d-74ac-47d4-a107-9c3069ab7b48",
	"label": "Embedded Metadata",
	"creator": "Simon Kornblith and Avram Lyon",
	"target": "",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 400,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2011-12-08 01:32:11"
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
	"citation_publication_date":"date",
	"citation_journal_title":"publicationTitle",
	"citation_volume":"volume",
	"citation_issue":"issue",
	"citation_conference_title":"conferenceName",
	"citation_technical_report_institution":"institution",
	"citation_technical_report_number":"number",
	"citation_issn":"ISSN",
	"citation_isbn":"ISBN",
	"citation_abstract":"abstractNote",
	"citation_doi":"DOI"
};

// Maps actual prefix in use to URI
var _prefixes = {
	"dc":"http://purl.org/dc/terms/",
	"dcterms":"http://purl.org/dc/terms/",
	"prism":"http://prismstandard.org/namespaces/1.2/basic/",
	"foaf":"http://xmlns.com/foaf/0.1/",
	"eprint":"http://purl.org/eprint/terms/",
	"eprints":"http://purl.org/eprint/terms/"
};

// These are the ones that we will read without a declared schema
var _rdfPresent = false,
	_haveItem = false,
	_itemType;

function getPrefixes(doc) {
	var links = doc.getElementsByTagName("link");
	for(var i=0; i<links.length; i++) {
		// Look for the schema's URI in our known schemata
		var rel = links[i].getAttribute("rel");
		if(rel) {
			var matches = rel.match(/^schema\.([a-zA-Z]+)/);
			if(matches) {
				//Zotero.debug("Prefix '" + matches[1].toLowerCase() +"' => '" + links[i].getAttribute("href") + "'");
				_prefixes[matches[1].toLowerCase()] = links[i].getAttribute("href");
			}
		}
	}
}

function detectWeb(doc, url) {
	getPrefixes(doc);
	
	// XXX What is this blacklisting?
	if (url.indexOf("reprint") != -1) return false;
	var metaTags = doc.getElementsByTagName("meta");
	for(var i=0; i<metaTags.length; i++) {
		var tag = metaTags[i].getAttribute("name");
		if(!tag) continue;
		tag = tag.toLowerCase();
		
		var schema = _prefixes[tag.split('.')[0]];
		
		// See if the supposed prefix is there, split by period or underscore
		if(schema) {
			_rdfPresent = true;
			// If we have PRISM or eprints data, don't use the generic webpage icon
			if (!_itemType && schema === _prefixes.prism || schema === _prefixes.eprints) {
				return (_itemType = "journalArticle");
			}
		} else if(tag === "citation_journal_title") {
			_itemType = "journalArticle";
		} else if(tag === "citation_technical_report_institution") {
			_itemType = "report";
		} else if(tag === "citation_conference_title") {
			_itemType = "conferencePaper";
		}
	}
	
	if(!_rdfPresent && !_itemType) return false;
	
	if(!_itemType) _itemType = "webpage";
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
			addHighwireMetadata(doc, newItem);
		});
		
		translator.getTranslatorObject(function(rdf) {
			var metaTags = doc.getElementsByTagName("meta");
		
			for(var i=0; i<metaTags.length; i++) {
				var tag = metaTags[i].getAttribute("name");
				var value = metaTags[i].getAttribute("content");
				if(!tag || !value) continue;
				var dotIndex = tag.indexOf('.');
				if(dotIndex === -1) continue;
				var prefix = tag.substr(0, dotIndex).toLowerCase();
		
				// See if the supposed prefix is there, split by period or underscore
				if(_prefixes[prefix]) {
					var prop = tag[dotIndex+1].toLowerCase()+tag.substr(dotIndex+2);
					//Z.debug(_prefixes[prefix] + pieces.join(delim) +
					//		"\nvalue: "+value);
					rdf.Zotero.RDF.addStatement(url, _prefixes[prefix] + prop, value, true);
				}
			}
			
			rdf.defaultUnknownType = _itemType;
			rdf.doImport();
			if(!_haveItem) {
				addHighwireMetadata(doc, new Zotero.Item(_itemType));
			}
		});
	} else {
		addHighwireMetadata(doc, new Zotero.Item(_itemType));
	}
}

/**
 * Adds HighWire metadata and completes the item
 */
function addHighwireMetadata(doc, newItem) {
	// HighWire metadata
	for(var metaName in HIGHWIRE_MAPPINGS) {
		var zoteroName = HIGHWIRE_MAPPINGS[metaName];
		if(!newItem[zoteroName]) {
			newItem[zoteroName] = ZU.xpathText(doc, '//meta[@name="'+metaName+'"]/@content');
		}
	}
	
	if(!newItem.creators.length) {
		// TODO: This data needs to be normalized. It comes in at least the following forms:
		// 1. Separate meta tags per author
		// 2. Authors in Doe, John format, semicolon-delimited
		// 3. Authors in John Doe format, comma-delimited
		// Currently, we only handle the first two, and we guess at Last, First or First, Last
		// based on the presence or absence of a comma
		
		var authorNodes = ZU.xpath(doc, '//meta[@name="citation_author"]/@content | //meta[@name="citation_authors"]/@content');
		for(var i=0, n=authorNodes.length; i<n; i++) {
			var authors = authorNodes[i].nodeValue.split(/\s*;\s/);
			for(var j=0, m=authors.length; j<m; j++) {
				var author = authors[j];
				newItem.creators.push(ZU.cleanAuthor(author, "author", author.indexOf(",") !== -1));
			}
		}
	}
	//Cleanup DOI
	if (newItem.DOI){
		newItem.DOI =newItem.DOI.replace(/^doi:/, "");
	}
	if(!newItem.pages) {
		var pages = [];
		var firstpage = ZU.xpathText(doc, '//meta[@name="citation_firstpage"]/@content');
		if(firstpage) pages.push(firstpage);
		var lastpage = ZU.xpathText(doc, '//meta[@name="citation_lastpage"]/@content');
		if(lastpage) pages.push(lastpage);
		if(pages.length) newItem.pages = pages.join("-");
	}
	
	if(!newItem.attachments.length) {
		var pdfURL = ZU.xpathText(doc, '//meta[@name="citation_pdf_url"]/@content');
		if(pdfURL) newItem.attachments.push({title:"Full Text PDF", url:pdfURL, mimeType:"application/pdf"});
	}
	
	// Other last chances
	if(!newItem.url) newItem.url = doc.location.href;
	if(!newItem.title) newItem.title = doc.title;
	
	// add attachment
	newItem.attachments.push({document:doc, title:"Snapshot"});
	// add access date
	newItem.accessDate = 'CURRENT_TIMESTAMP';
	
	newItem.libraryCatalog = doc.location.host;
	newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://dublincore.org/documents/usageguide/",
		"items": [
			{
				"itemType": "webpage",
				"creators": [
					{
						"firstName": "Diane",
						"lastName": "Hillmann",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"document": false
					}
				],
				"itemID": "http://dublincore.org/documents/usageguide/",
				"title": "Using Dublin Core",
				"publisher": "Dublin Core Metadata Initiative",
				"institution": "Dublin Core Metadata Initiative",
				"company": "Dublin Core Metadata Initiative",
				"label": "Dublin Core Metadata Initiative",
				"distributor": "Dublin Core Metadata Initiative",
				"extra": "This document is intended as an entry point for users of Dublin Core. For non-specialists, it will assist them in creating simple descriptive records for information resources (for example, electronic documents). Specialists may find the document a useful point of reference to the documentation of Dublin Core, as it changes and grows.",
				"url": "http://dublincore.org/documents/usageguide/",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "Embedded RDF",
				"checkFields": "title"
			}
		]
	}
]
/** END TEST CASES **/
