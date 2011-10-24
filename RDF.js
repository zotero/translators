{
	"translatorID":"5e3ad958-ac79-463d-812b-a86a9235c28f",
	"translatorType":1,
	"label":"RDF",
	"creator":"Simon Kornblith",
	"target":"rdf",
	"minVersion":"2.1.9",
	"maxVersion":"",
	"priority":100,
	"browserSupport":"gcsn",
	"configOptions":{"dataMode":"rdf/xml"},
	"displayOptions":null,
	"inRepository":true,
	"lastUpdated":"2011-10-24 14:12:38"
}

/*
    ***** BEGIN LICENSE BLOCK *****
    
    Copyright © 2011 Center for History and New Media
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

function detectImport() {
	// Make sure there are actually nodes
	
	var nodes = Zotero.RDF.getAllResources();
	if(nodes) {
		return true;
	}
}

var rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

var n = {
	bib:"http://purl.org/net/biblio#",
	dc:"http://purl.org/dc/elements/1.1/",
	dcterms:"http://purl.org/dc/terms/",
	prism:"http://prismstandard.org/namespaces/1.2/basic/",
	foaf:"http://xmlns.com/foaf/0.1/",
	vcard:"http://nwalsh.com/rdf/vCard#",
	vcard2:"http://www.w3.org/2006/vcard/ns#",	// currently used only for NSF, but is probably
												// very similar to the nwalsh vcard ontology in a
												// different namespace
	link:"http://purl.org/rss/1.0/modules/link/",
	z:"http://www.zotero.org/namespaces/export#",
	eprints:"http://purl.org/eprint/terms/"
};

var callNumberTypes = [n.dcterms+"LCC", n.dcterms+"DDC", n.dcterms+"UDC"];

// gets the first result set for a property that can be encoded in multiple
// ontologies
function getFirstResults(node, properties, onlyOneString) {
	for(var i=0; i<properties.length; i++) {
		var result = Zotero.RDF.getTargets(node, properties[i]);
		if(result) {
			if(onlyOneString) {
				// onlyOneString means we won't return nsIRDFResources, only
				// actual literals
				if(typeof(result[0]) != "object") {
					return result[0];
				}
			} else {
				return result;
			}
		}
	}
	return;	// return undefined on failure
}

// adds creators to an item given a list of creator nodes
function handleCreators(newItem, creators, creatorType) {
	if(!creators) {
		return;
	}
	
	if(typeof(creators[0]) != "string") {	// see if creators are in a container
		try {
			var creators = Zotero.RDF.getContainerElements(creators[0]);
		} catch(e) {}
	}
	
	if(typeof(creators[0]) == "string") {	// support creators encoded as strings
		for(var i in creators) {
			if(typeof(creators[i]) != "object") {
				// Use comma to split if present
				if (creators[i].indexOf(',') !== -1) {
					newItem.creators.push(Zotero.Utilities.cleanAuthor(creators[i], creatorType, true));
				} else {
					newItem.creators.push(Zotero.Utilities.cleanAuthor(creators[i], creatorType, false));
				}
			}
		}
	} else {								// also support foaf
		for(var i in creators) {
			var type = Zotero.RDF.getTargets(creators[i], rdf+"type");
			if(type) {
				type = Zotero.RDF.getResourceURI(type[0]);
				if(type == n.foaf+"Person") {	// author is FOAF type person
					var creator = new Array();
					creator.lastName = getFirstResults(creators[i],
						[n.foaf+"surname", n.foaf+"family_name"], true);
					creator.firstName = getFirstResults(creators[i],
						[n.foaf+"givenname", n.foaf+"firstName"], true);
					creator.creatorType = creatorType;
					newItem.creators.push(creator);
				}
			}
		}
	}
}

// processes collections recursively
function processCollection(node, collection) {
	if(!collection) {
		collection = new Array();
	}
	collection.type = "collection";
	collection.name = getFirstResults(node, [n.dc+"title", n.dcterms+"title"], true);
	collection.children = new Array();
	
	// check for children
	var children = getFirstResults(node, [n.dcterms+"hasPart"]);
	for each(var child in children) {
		var type = Zotero.RDF.getTargets(child, rdf+"type");
		if(type) {
			type = Zotero.RDF.getResourceURI(type[0]);
		}
		
		if(type == n.bib+"Collection" || type == n.z+"Collection") {
			// for collections, process recursively
			collection.children.push(processCollection(child));
		} else {
			if(isPart(child)) {
				Zotero.debug("Not adding child item <" + Zotero.RDF.getResourceURI(child) + "> to collection", 2);
				continue;
			}
			
			// all other items are added by ID
			collection.children.push({id:Zotero.RDF.getResourceURI(child), type:"item"});
		}
	}
	return collection;
}

function processSeeAlso(node, newItem) {
	var relations;
	newItem.itemID = Zotero.RDF.getResourceURI(node);
	newItem.seeAlso = new Array();
	if(relations = getFirstResults(node, [n.dc+"relation", n.dcterms+"relation"])) {
		for each(var relation in relations) {
			newItem.seeAlso.push(Zotero.RDF.getResourceURI(relation));
		}
	}
}

function processTags(node, newItem) {
	var subjects;
	newItem.tags = new Array();
	if(subjects = getFirstResults(node, [n.dc+"subject", n.dcterms+"subject"])) {
		for each(var subject in subjects) {
			if(typeof(subject) == "string") {	// a regular tag
				newItem.tags.push(subject);
			} else {
				// a call number
				var type = Zotero.RDF.getTargets(subject, rdf+"type");
				if(type) {
					type = Zotero.RDF.getResourceURI(type[0]);
					if(type == n.z+"AutomaticTag") {
						newItem.tags.push({tag:getFirstResults(subject, [rdf+"value"], true), type:1});
					}
				}
			}
		}
	}
}

// gets the node with a given type from an array
function getNodeByType(nodes, type) {
	if(!nodes) {
		return false;
	}
	
	for each(var node in nodes) {
		var nodeType = Zotero.RDF.getTargets(node, rdf+"type");
		if(nodeType) {
			nodeType = Zotero.RDF.getResourceURI(nodeType[0]);
			if(nodeType == type) {	// we have a node of the correct type
				return node;
			}
		}
	}
	return false;
}

// returns true if this resource is part of another (related by any arc besides
// dc:relation or dcterms:hasPart)
//
// used to differentiate independent notes and files
function isPart(node) {
	var arcs = Zotero.RDF.getArcsIn(node);
	var skip = false;
	for each(var arc in arcs) {
		arc = Zotero.RDF.getResourceURI(arc);
		if(arc != n.dc+"relation" && arc != n.dcterms+"relation" && arc != n.dcterms+"hasPart") {	
			// related to another item by some arc besides see also
			skip = true;
		}
	}
	return skip;
}

function importItem(newItem, node, type) {
	var container = undefined;
	
	// also deal with type detection based on parts, so we can differentiate
	// magazine and journal articles, and find container elements
	var isPartOf = getFirstResults(node, [n.dcterms+"isPartOf"]);
	
	// get parts of parts, because parts are sections of wholes.
	if(isPartOf) {
		for(var i=0; i<isPartOf.length; i++) {
			var subParts = getFirstResults(isPartOf[i], [n.dcterms+"isPartOf"]);
			if(subParts) {
				isPartOf = isPartOf.concat(subParts);
			}
		}
	}
	
	if(type) {
		if(type == n.bib+"Book") {
			newItem.itemType = "book";
		} else if(type == n.bib+"BookSection") {
			newItem.itemType = "bookSection";
			container = getNodeByType(isPartOf, n.bib+"Book");
		} else if(type == n.bib+"Article") {	// choose between journal,
												// newspaper, and magazine
												// articles
			// use of container = (not container ==) is intentional
			if(container = getNodeByType(isPartOf, n.bib+"Journal")) {
				newItem.itemType = "journalArticle";
			} else if(container = getNodeByType(isPartOf, n.bib+"Periodical")) {
				newItem.itemType = "magazineArticle";
			} else if(container = getNodeByType(isPartOf, n.bib+"Newspaper")) {
				newItem.itemType = "newspaperArticle";
			}
		} else if(type == n.bib+"Thesis") {
			newItem.itemType = "thesis";
		} else if(type == n.bib+"Letter") {
			newItem.itemType = "letter";
		} else if(type == n.bib+"Manuscript") {
			newItem.itemType = "manuscript";
		} else if(type == n.bib+"Interview") {
			newItem.itemType = "interview";
		} else if(type == n.bib+"MotionPicture") {
			newItem.itemType = "film";
		} else if(type == n.bib+"Illustration") {
			newItem.itemType = "artwork";
		} else if(type == n.bib+"Document") {
			if(container = getNodeByType(isPartOf, n.bib+"CourtReporter")) {
				newItem.itemType = "case";
			} else {
				newItem.itemType = "webpage";
			}
		} else if(type == n.bib+"Memo") {
			newItem.itemType = "note";
		} else if(type == n.z+"Attachment") {
			// unless processing of independent attachment is intended, don't
			// process
			
			// process as file
			newItem.itemType = "attachment";

			var path = getFirstResults(node, [rdf+"resource"]);
			if(path) {
				newItem.path = Zotero.RDF.getResourceURI(path[0]);
			}
			newItem.charset = getFirstResults(node, [n.link+"charset"], true);
			newItem.mimeType = getFirstResults(node, [n.link+"type"], true);
		} else if(type == n.bib+"Report") {
			newItem.itemType = "report";
		} else if(type == n.bib+"Legislation") {
			newItem.itemType = "statute";
		} else if(type == n.bib+"Patent") {
			newItem.itemType = "patent";
		} else if(type == n.bib+"Image") {
			newItem.itemType = "artwork";
		} else if(type == n.bib+"Recording") {
			newItem.itemType = "audioRecording";
		}
	}
	
	// check to see if we recognize the type in the fs or dc namespaces
	var zoteroType = getFirstResults(node, [n.z+"itemType", n.z+"type", n.dc+"type", n.dcterms+"type"], true);
	if(zoteroType && Zotero.Utilities.itemTypeExists(zoteroType)) {
		newItem.itemType = zoteroType;
	}
	
	if(newItem.itemType == "blogPost") {
		container = getNodeByType(isPartOf, n.z+"Blog");
	} else if(newItem.itemType == "forumPost") {
		container = getNodeByType(isPartOf, n.z+"Forum");
	} else if(newItem.itemType == "webpage") {
		container = getNodeByType(isPartOf, n.z+"Website");
	}
	
	// title
	newItem.title = getFirstResults(node, [n.dc+"title", n.dcterms+"title", n.prism+"title",
		n.eprints+"title", n.vcard2+"fn"], true);
	if(!newItem.itemType && !newItem.title) {			// require the title
														// (if not a known type)
		return false;
	}
	
	if(!newItem.itemType) {
		newItem.itemType = exports.defaultUnknownType;
	}
	
	// regular author-type creators
	var possibleCreatorTypes = Zotero.Utilities.getCreatorsForType(newItem.itemType);
	for each(var creatorType in possibleCreatorTypes) {
		if(creatorType == "author") {
			var creators = getFirstResults(node, [n.bib+"authors", n.dc+"creator", n.dcterms+"creator", n.eprints+"creators_name"]);
		} else if(creatorType == "editor" || creatorType == "contributor") {
			var creators = getFirstResults(node, [n.bib+creatorType+"s"]);
		} else {
			var creators = getFirstResults(node, [n.z+creatorType+"s"]);
		}
		
		if(creators) handleCreators(newItem, creators, creatorType);
	}
	
	// source -- first try PRISM, then DC
	newItem.source = getFirstResults(node, [n.prism+"publicationName", n.eprints+"publication",
		n.dc+"source", n.dcterms+"source"], true);
	newItem.publicationTitle = newItem.source;
	
	// rights
	newItem.rights = getFirstResults(node, [n.dc+"rights", n.dcterms+"rights"], true);
	
	// section
	var section = getNodeByType(isPartOf, n.bib+"Part");
	if(section) {
		newItem.section = getFirstResults(section, [n.dc+"title", n.dcterms+"title"], true);
	}
	
	// publication
	if(container) {
		newItem.publicationTitle = getFirstResults(container, [n.dc+"title", n.dcterms+"title"], true);
		// these fields mean the same thing
		newItem.reporter = newItem.publicationTitle;
	}
	
	// series
	var series = getNodeByType(isPartOf, n.bib+"Series");
	if(series) {
		newItem.series = getFirstResults(series, [n.dc+"title", n.dcterms+"title"], true);
		newItem.seriesTitle = getFirstResults(series, [n.dcterms+"alternative"], true);
		newItem.seriesText = getFirstResults(series, [n.dc+"description", n.dcterms+"description"], true);
		newItem.seriesNumber = getFirstResults(series, [n.dc+"identifier", n.dcterms+"description"], true);
	}
	
	// volume
	newItem.volume = getFirstResults((container ? container : node), [n.prism+"volume",
		n.eprints+"volume", n.dcterms+"citation.volume"], true);
	
	// issue
	newItem.issue = getFirstResults((container ? container : node), [n.prism+"number",
		n.eprints+"number", n.dcterms+"citation.isssue"], true);
	// these mean the same thing
	newItem.patentNumber = newItem.number = newItem.issue;
	
	// edition
	newItem.edition = getFirstResults(node, [n.prism+"edition"], true);
	// these fields mean the same thing
	newItem.version = newItem.edition;
	
	// pages
	newItem.pages = getFirstResults(node, [n.bib+"pages", n.eprints+"pagerange"], true);
	if(!newItem.pages) {
		var pages = [];
		var spage = getFirstResults(node, [n.prism+"startingPage", n.dcterms+"relation.spage"], true),
			epage = getFirstResults(node, [n.prism+"endingPage", n.dcterms+"relation.epage"], true);
		if(spage) pages.push(spage);
		if(epage) pages.push(epage);
		if(pages.length) newItem.pages = pages.join("-");
	}
	
	// mediums
	newItem.artworkMedium = newItem.interviewMedium = getFirstResults(node, [n.dcterms+"medium"], true);
	
	// ISSN, if encoded per PRISM (DC uses "identifier")
	newItem.ISSN = getFirstResults(node, [n.prism+"issn", n.eprints+"issn"], true);
	
	// publisher
	var publisher = getFirstResults(node, [n.dc+"publisher", n.dcterms+"publisher", n.vcard2+"org"]);
	if(publisher) {
		if(typeof(publisher[0]) == "string") {
			newItem.publisher = publisher[0];
		} else {
			var type = Zotero.RDF.getTargets(publisher[0], rdf+"type");
			if(type) {
				type = Zotero.RDF.getResourceURI(type[0]);
				if(type == n.foaf+"Organization") {	// handle foaf organizational publishers
					newItem.publisher = getFirstResults(publisher[0], [n.foaf+"name"], true);
					var place = getFirstResults(publisher[0], [n.vcard+"adr"]);
					if(place) {
						newItem.place = getFirstResults(place[0], [n.vcard+"locality"]);
					}
				} else if(type == n.vcard2+"Organization") {
					newItem.publisher = getFirstResults(publisher[0], [n.vcard2+"organization-name"], true);
				}
			}
		}
	}
	
	// these fields mean the same thing
	newItem.distributor = newItem.label = newItem.company = newItem.institution = newItem.publisher;
	
	// date
	newItem.date = getFirstResults(node, [n.eprints+"date", n.dc+"date", n.dcterms+"date",
		n.dc+"date.issued", n.dcterms+"date.issued", n.dcterms+"issued", n.dcterms+"dateSubmitted",
		n.eprints+"datestamp"], true);
	// accessDate
	newItem.accessDate = getFirstResults(node, [n.dcterms+"dateSubmitted"], true);
	// lastModified
	newItem.lastModified = getFirstResults(node, [n.dcterms+"modified"], true);
	
	// identifier
	var identifiers = getFirstResults(node, [n.dc+"identifier", n.dcterms+"identifier"]);
	if(container) {
		var containerIdentifiers = getFirstResults(container, [n.dc+"identifier", n.dcterms+"identifier"]);
		// concatenate sets of identifiers
		if(containerIdentifiers) {
			if(identifiers) {
				identifiers = identifiers.concat(containerIdentifiers);
			} else {
				identifiers = containerIdentifiers;
			}
		}
	}
	
	if(identifiers) {
		for(var i in identifiers) {
			if(typeof(identifiers[i]) == "string") {
				// grab other things
				var beforeSpace = identifiers[i].substr(0, identifiers[i].indexOf(" ")).toUpperCase();
			
				// Attempt to determine type of identifier	
				if(beforeSpace == "ISBN") {
					newItem.ISBN = identifiers[i].substr(5).toUpperCase();
				} else if(beforeSpace == "ISSN") {
					newItem.ISSN = identifiers[i].substr(5).toUpperCase();
				} else if(beforeSpace == "DOI") {
					newItem.DOI = identifiers[i].substr(4);
				} else if(identifiers[i].substr(0,3) == "10.") {
					newItem.DOI = identifiers[i];
				} else if(!newItem.accessionNumber) {
					newItem.accessionNumber = identifiers[i];
				}
			} else {
				// grab URLs
				var type = Zotero.RDF.getTargets(identifiers[i], rdf+"type");
				if(type && (type = Zotero.RDF.getResourceURI(type[0])) && type == n.dcterms+"URI") {
					newItem.url = getFirstResults(identifiers[i], [rdf+"value"], true);
				}
			}
		}
	}
	
	if(!newItem.url) {
		var url = getFirstResults(node, [n.eprints+"official_url", n.vcard2+"url"]);
		if(url) {
			newItem.url = Zotero.RDF.getResourceURI(url[0]);
		}
	}
	
	// archiveLocation
	newItem.archiveLocation = getFirstResults(node, [n.dc+"coverage", n.dcterms+"coverage"], true);
	
	// abstract
	newItem.abstractNote = getFirstResults(node, [n.dcterms+"abstract", n.dc+"description.abstract",
		 n.dcterms+"description.abstract", n.eprints+"abstract"], true);
	
	// type
	var type = getFirstResults(node, [n.dc+"type", n.dcterms+"type"], true);
	// these all mean the same thing
	var typeProperties = ["reportType", "videoRecordingType", "letterType",
						"manuscriptType", "mapType", "thesisType", "websiteType",
						"audioRecordingType", "presentationType", "postType",
						"audioFileType"];
	for each(var property in typeProperties) {
		newItem[property] = type;
	}
	
	// conferenceName
	var conference = getFirstResults(node, [n.bib+"presentedAt"]);
	if(conference) {
		conference = conference[0];
		if(typeof(conference) == "string") {
			newItem.conferenceName = conference;
		} else {
			newItem.conferenceName = getFirstResults(conference, [n.dc+"title", n.dcterms+"title"], true);
		}
	}
	
	// journalAbbreviation
	newItem.journalAbbreviation = getFirstResults((container ? container : node), [n.dcterms+"alternative"], true);
	
	// address
	var adr = getFirstResults(node, [n.vcard2+"adr"]);
	if(adr) {
		newItem.address = getFirstResults(adr[0], [n.vcard2+"label"], true);
	}
	
	// telephone
	newItem.telephone = getFirstResults(node, [n.vcard2+"tel"], true);
	
	// email
	newItem.email = getFirstResults(node, [n.vcard2+"email"], true);
	
	// accepted
	newItem.accepted = getFirstResults(node, [n.dcterms+"dateAccepted"], true);
	
	// see also
	processSeeAlso(node, newItem);
	
	// description/attachment note
	if(newItem.itemType == "attachment") {
		newItem.note = getFirstResults(node, [n.dc+"description", n.dcterms+"description"], true);
	} else {
		newItem.extra = getFirstResults(node, [n.dc+"description", n.dcterms+"description"], true);
	}
	
	/** NOTES **/
	
	var referencedBy = Zotero.RDF.getTargets(node, n.dcterms+"isReferencedBy");
	for each(var referentNode in referencedBy) {
		var type = Zotero.RDF.getTargets(referentNode, rdf+"type");
		if(type && Zotero.RDF.getResourceURI(type[0]) == n.bib+"Memo") {
			// if this is a memo
			var note = new Array();
			note.note = getFirstResults(referentNode, [rdf+"value", n.dc+"description", n.dcterms+"description"], true);
			if(note.note != undefined) {
				// handle see also
				processSeeAlso(referentNode, note);
				processTags(referentNode, note);
				
				// add note
				newItem.notes.push(note);
			}
		}
	}
	
	if(newItem.itemType == "note") {
		// add note for standalone
		var note = getFirstResults(node, [rdf+"value", n.dc+"description", n.dcterms+"description"], true);
		newItem.note = note ? note : "";
	}
	
	/** TAGS **/
	
	var subjects = getFirstResults(node, [n.dc+"subject", n.dcterms+"subject"]);
	for each(var subject in subjects) {
		if(typeof(subject) == "string") {	// a regular tag
			newItem.tags.push(subject);
		} else {							// a call number or automatic tag
			var type = Zotero.RDF.getTargets(subject, rdf+"type");
			if(type) {
				type = Zotero.RDF.getResourceURI(type[0]);
				if(callNumberTypes.indexOf(type) !== -1) {
					newItem.callNumber = getFirstResults(subject, [rdf+"value"], true);
				} else if(type == n.z+"AutomaticTag") {
					newItem.tags.push({tag:getFirstResults(subject, [rdf+"value"], true), type:1});
				}
			}
		}
	}
	
	/** ATTACHMENTS **/
	var relations = getFirstResults(node, [n.link+"link"]);
	for each(var relation in relations) {			
		var type = Zotero.RDF.getTargets(relation, rdf+"type");
		if(Zotero.RDF.getResourceURI(type[0]) == n.z+"Attachment") {
			var attachment = new Zotero.Item();
			newItem.attachments.push(attachment);
			importItem(attachment, relation, n.z+"Attachment");
		}
	}
	
	var pdfURL = getFirstResults(node, [n.eprints+"document_url"]);
	if(pdfURL) {
		newItem.attachments.push({
			"title":"Full Text PDF",
			"mimeType":"application/pdf",
			"url":pdfURL[0]
		});
	}
	
	/** OTHER FIELDS **/
	var arcs = Zotero.RDF.getArcsOut(node);
	for each(var arc in arcs) {
		var uri = Zotero.RDF.getResourceURI(arc);
		if(uri.substr(0, n.z.length) == n.z) {
			var property = uri.substr(n.z.length);
			newItem[property] = Zotero.RDF.getTargets(node, n.z+property)[0];
		}
	}
	
	return true;
}

function doImport() {
	Zotero.setProgress(null);
	var nodes = Zotero.RDF.getAllResources();
	if(!nodes) {
		return false;
	}
	
	// keep track of collections while we're looping through
	var collections = new Array();
	
	var i = 0;
	for each(var node in nodes) {
		var newItem = new Zotero.Item();
		newItem.itemID = Zotero.RDF.getResourceURI(node);
		
		// figure out if this is a part of another resource, or a linked
		// attachment
		if(Zotero.RDF.getSources(node, n.dcterms+"isPartOf") ||
		   Zotero.RDF.getSources(node, n.bib+"presentedAt") ||
		   Zotero.RDF.getSources(node, n.link+"link")) {
			continue;
		}
		
		// type
		var type = Zotero.RDF.getTargets(node, rdf+"type");
		if(type) {
			type = Zotero.RDF.getResourceURI(type[0]);
			
			// skip if this is not an independent attachment,
			if((type == n.z+"Attachment" || type == n.bib+"Memo") && isPart(node)) {
				continue;
			} else if(type == n.bib+"Collection" || type == n.z+"Collection") {
				// skip collections until all the items are done
				collections.push(node);
				continue;
			}
		} else {
			type = false;
		}
		
		if(importItem(newItem, node, type)) {
			newItem.complete();
		}
		
		Zotero.setProgress(i++/nodes.length*100);
	}
	
	/* COLLECTIONS */
	
	for each(var collection in collections) {
		if(!Zotero.RDF.getArcsIn(collection)) {
			var newCollection = new Zotero.Collection();
			processCollection(collection, newCollection);
			newCollection.complete();
		}
	}
}

/**
 * Export doImport and defaultUnknownType to other translators
 */
var exports = {
	"doImport":doImport,
	"defaultUnknownType":"book"
};
