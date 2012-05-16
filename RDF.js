{
	"translatorID": "5e3ad958-ac79-463d-812b-a86a9235c28f",
	"label": "RDF",
	"creator": "Simon Kornblith",
	"target": "rdf",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"configOptions": {
		"dataMode": "rdf/xml"
	},
	"inRepository": true,
	"translatorType": 1,
	"browserSupport": "gcs",
	"lastUpdated": "2012-05-16 09:19:18"
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
	bibo:"http://purl.org/ontology/bibo/",
	dc:"http://purl.org/dc/elements/1.1/",
	dcterms:"http://purl.org/dc/terms/",
	prism:"http://prismstandard.org/namespaces/1.2/basic/",
	prism2_0:"http://prismstandard.org/namespaces/basic/2.0/",
	prism2_1:"http://prismstandard.org/namespaces/basic/2.1/",
	foaf:"http://xmlns.com/foaf/0.1/",
	vcard:"http://nwalsh.com/rdf/vCard#",
	vcard2:"http://www.w3.org/2006/vcard/ns#",	// currently used only for NSF, but is probably
							// very similar to the nwalsh vcard ontology in a
							// different namespace
	link:"http://purl.org/rss/1.0/modules/link/",
	z:"http://www.zotero.org/namespaces/export#",
	eprints:"http://purl.org/eprint/terms/",
	og:"http://ogp.me/ns#",				// Used for Facebook's OpenGraph Protocol
	article:"http://ogp.me/ns/article#",
	book:"http://ogp.me/ns/book#"
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
				} else {
					return result[0].value;
				}
			} else {
				return result;
			}
		}
	}
	return;	// return undefined on failure
}

// adds creators to an item given a list of creator nodes
/**TODO: PRISM 2.0 roles for DC creator/contributor*/
function handleCreators(newItem, creators, creatorType) {
	if(!creators) {
		return;
	}
	
	if(typeof(creators[0]) != "string") {	// see if creators are in a container
		try {
			var c = Zotero.RDF.getContainerElements(creators[0]);
		} catch(e) {}
		if(c && c.length) {
			creators = c;
	}
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
					var creator = new Object();
					creator.lastName = getFirstResults(creators[i],
						[n.foaf+"familyName", n.foaf+"lastName",
						n.foaf+"surname", n.foaf+"family_name"], true); //unofficial
					creator.firstName = getFirstResults(creators[i],
						[n.foaf+"givenName", n.foaf+"firstName",
						n.foaf+"givenname"], true);	//unofficial
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
	
	if(typeof(type) == "string") {
		type = [type];
	}
	
	for each(var node in nodes) {
		var nodeType = Zotero.RDF.getTargets(node, rdf+"type");
		if(nodeType) {
			nodeType = Zotero.RDF.getResourceURI(nodeType[0]);
			if(type.indexOf(nodeType) != -1) {	// we have a node of the correct type
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

function detectType(newItem, node, ret) {
	if(!node) return false;
	
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
	
	var container;
	var t = new Object();
	// rdf:type
	var type = getFirstResults(node, [rdf+"type"], true);
	if(type) {
		var pref = '';
		if(type.substr(0,n.bib.length) == n.bib) {
			pref = n.bib;
		} else if(type.substr(0,n.bibo.length) == n.bibo) {
			pref = n.bibo;
		} else if(type == n.z+"Attachment") {
			pref = n.z;
		}
		type = type.substr(pref.length).toLowerCase();
		switch(type) {
			case "book":
			case "thesis":
			case "letter":
			case "manuscript":
			case "interview":
			case "report":
			case "patent":
				//these are the same as zotero types,
				//just start with lower case
				t.bib = type;
			break;
			case "booksection":
				t.bib = 'bookSection';
			container = getNodeByType(isPartOf, n.bib+"Book");
			break;
			case "motionpicture":
				t.bib = "film";
			break;
			case "image":
			case "illustration":
				t.bib = "artwork";
			break;
			case "legislation":
				t.bib = "statute";
			break;
			case "recording":
				t.bib = "audioRecording";
			break;
			case "memo":
				t.bib = "note";
			break;
			case "document":
				if(container = getNodeByType(isPartOf,
						[n.bib+"CourtReporter", n.bibo+"CourtReporter"])) {
					t.bib = "case";
				} else {
					t.bib = "webpage";
				}
			break;
			case "article":
				// choose between journal, newspaper, and magazine articles
			// use of container = (not container ==) is intentional
				if(container = getNodeByType(isPartOf,
						[n.bib+"Journal", n.bibo+"Journal"])) {
					t.bib = "journalArticle";
				} else if(container = getNodeByType(isPartOf,
						[n.bib+"Periodical", n.bibo+"Periodical"])) {
					t.bib = "magazineArticle";
				} else if(container = getNodeByType(isPartOf,
						[n.bib+"Newspaper", n.bibo+"Newspaper"])) {
					t.bib = "newspaperArticle";
			}
			break;
			//zotero
			case "attachment":
			// unless processing of independent attachment is intended, don't
			// process
			
			// process as file
			t.zotero = "attachment";

			var path = getFirstResults(node, [rdf+"resource"]);
			if(path) {
				newItem.path = Zotero.RDF.getResourceURI(path[0]);
			}
			newItem.charset = getFirstResults(node, [n.link+"charset"], true);
			newItem.mimeType = getFirstResults(node, [n.link+"type"], true);
		}
	}
	
	// zotero:itemType, zotero:type
	type = getFirstResults(node, [n.z+"itemType", n.z+"type"], true);
	if(type && Zotero.Utilities.itemTypeExists(type)) {
		t.zotero = type;
	}

	// dc:type, dcterms:type
	type = getFirstResults(node, [n.dc+"type", n.dcterms+"type"], true);
	if(type) {
		if(Zotero.Utilities.itemTypeExists(type)) {
			t.dc = type;
		} else {
			switch (type) {
				//eprints
				//from http://www.ukoln.ac.uk/repositories/digirep/index/Eprints_Type_Vocabulary_Encoding_Scheme
				case 'book':
				case 'patent':
				case 'report':
				case 'thesis':
					t.dc = value;
					break;
				case 'bookitem':
					t.dc = 'bookSection';
					break;
				//case 'bookreview':
				case 'conferenceitem':
				case 'conferencepaper':
				case 'conferenceposter':
					t.dc = 'conferencePaper';
					break;
				case 'journalitem':
				case 'journalarticle':
				case 'submittedjournalarticle':
					t.dc = 'journalArticle';
					break;
				case 'newsitem':
					t.dc = 'newspaperArticle';
					break;
				case 'scholarlytext':
					t.dc = 'journalArticle';
					break;
				case 'workingpaper':
					t.dc = 'manuscript';
					break;

				//from http://www.idealliance.org/specifications/prism/specifications/prism-controlled-vocabularies/prism-12-controlled-vocabularies
				//some are the same as eprints and are handled above
				case 'article':
					t.dcGuess = 'journalArticle';
					break;
				case 'electronicbook':
					t.dc = 'book';
					break;
				case 'homepage':
				case 'webpage':
					t.dc = 'webpage';
					break;
				case 'illustration':
					t.dc = 'artwork';
					break;
				case 'map':
					t.dc = 'map';
					break;

				//from http://dublincore.org/documents/dcmi-type-vocabulary/
				//this vocabulary is much broader
				case 'event':
					//very broad, but has an associated location
					t.dcGuess = 'presentation';
					break;
				case 'image':
					//this includes almost any graphic, moving or not
					t.dcGuess = 'artwork';
					break;
				case 'movingimage':
					//could be either film, tvBroadcast, or videoRecording
					t.dcGuess = 'videoRecording';
					break;
				case 'software':
					t.dcGuess = 'computerProgram';
					break;
				case 'sound':
					//could be podcast, radioBroadcast, or audioRecording
					t.dcGuess = 'audioRecording';
					break;
				case 'stillimage':
					//could be map or artwork
					t.dcGuess = 'artwork';
					break;
				case 'text':
					//very broad
					t.dcGuess = 'journalArticle';
					break;
				//collection, dataset, interactiveresource, physicalobject,
				//service
			}
		}
	}

	// og:type
	type = getFirstResults(node, [n.og+"type"], true);
	switch (type) {
		case "video.movie":
		case "video.episode":
		case "video.tv_show":
		case "video.other":
			t.og = "videoRecording";
		break;
		case "article":
			t.ogGuess = "journalArticle";
		break;
		case "book":
			t.og = "book";
		break;
		case "music.song":
		case "music.album":
			t.og = "audioRecording";
		break;
		case "website":
			t.og = "webpage";
		break;
	}
	
	// PRISM:aggregationtype
	/**is this actually inside container?*/
	type = getFirstResults(node, [n.prism+"aggregationtype",
		n.prism2_0+"aggregationtype", n.prism2_1+"aggregationtype"]);
	switch(type) {
		case 'book':
			t.prism = 'bookSection';
		break;
		case 'feed':
			//could also be email
			t.prismGuess = 'blogPost';
		break;
		case 'journal':
			t.prism = 'journalArticle';
		break;
		case 'magazine':
			t.prism = 'magazineArticle';
		break;
		case 'newsletter':
			t.prism = 'newspaperArticle';
		break;
		//pamphlet, other, manual, catalog
	}

	//PRISM:genre
	type = getFirstResults(node, [n.prism+"genre", n.prism2_0+"genre",
		n.prism2_1+"genre"]);
	switch(type) {
		case 'abstract':
		case 'acknowledgements':
		case 'authorbio':
		case 'bibliography':
		case 'index':
		case 'tableofcontents':
			t.prism = 'bookSection';
		break;
		case 'autobiography':
		case 'biography':
			t.prism = 'book';
		break;
		case 'blogentry':
			t.prism = 'blogPost';
		break;
		case 'homepage':
		case 'webliography':
			t.prism = 'webpage';
		break;
		case 'interview':
			t.prism = 'interview';
		break;
		case 'letters':
			t.prism = 'letter';
		break;
		case 'adaptation':
		case 'analysis':
			t.prismGuess = 'journalArticle';
		break;
		case 'column':
		case 'newsbulletin':
		case 'opinion':
			//magazine or newspaper
			t.prismGuess = 'newspaperArticle';
		break;
		case 'coverstory':
		case 'essay':
		case 'feature':
		case 'insidecover':
			//journal or magazine
			t.prismGuess = 'magazineArticle';
		break;
		//advertorial; advertisement; brief; chronology; classifiedad;
		//correction; cover; coverpackage; electionresults; eventscalendar;
		//excerpt; photoshoot; featurepackage; financialstatement;
		//interactivecontent; legaldocument; masthead; notice; obituary;
		//photoessay; poem; poll; pressrelease; productdescription; profile;
		//quotation; ranking; recipe; reprint; response; review; schedule;
		//sidebar; stockquote; sectiontableofcontents; transcript; wirestory
	}

	//PRISM:platform
	type = getFirstResults(node, [n.prism+"platform", n.prism2_0+"platform",
		n.prism2_1+"platform"]);
	switch(type) {
		case 'broadcast':
			t.prismGuess = 'tvBroadcast';
		break;
		case 'web':
			t.prismGuess = 'webpage';
		break;
	}

	var itemType = t.zotero || t.bib || t.prism || t.og || t.dc ||
		exports.defaultUnknownType || t.zoteroGuess || t.bibGuess || 
		t.prismGuess || t.ogGuess || t.dcGuess

	if(itemType == "blogPost") {
		container = getNodeByType(isPartOf, n.z+"Blog");
	} else if(itemType == "forumPost") {
		container = getNodeByType(isPartOf, n.z+"Forum");
	} else if(itemType == "webpage") {
		container = getNodeByType(isPartOf, n.z+"Website");
	}
	
	ret.container = container;
	ret.isPartOf = isPartOf;

	return 	itemType;
}
	
function importItem(newItem, node) {
	var ret = new Object();
	newItem.itemType = detectType(newItem, node, ret) || 'journalArticle';
	var container = ret.container;
	var isPartOf = ret.isPartOf;

	// title
	newItem.title = getFirstResults(node, [n.dc+"title", n.dcterms+"title",
		n.eprints+"title", n.vcard2+"fn", n.og+"title"], true);
	if(!newItem.itemType && !newItem.title) {	// require the title
							// (if not a known type)
		return false;
	}
	
	// regular author-type creators
	var possibleCreatorTypes = Zotero.Utilities.getCreatorsForType(newItem.itemType);
	var creators;
	for each(var creatorType in possibleCreatorTypes) {
		if(creatorType == "author") {
			creators = getFirstResults(node, [n.bib+"authors", n.dc+"creator",
				n.dcterms+"creator", n.eprints+"creators_name",
				n.dc+"contributor", n.dcterms+"contributor"]);
		} else if(creatorType == "editor" || creatorType == "contributor") {
			creators = getFirstResults(node, [n.bib+creatorType+"s"]);
		} else {
			creators = getFirstResults(node, [n.z+creatorType+"s"]);
		}
		
		if(creators) handleCreators(newItem, creators, creatorType);
	}
	
	// publicationTitle -- first try PRISM, then DC
	newItem.publicationTitle = getFirstResults(node, [n.prism+"publicationName", n.prism2_0+"publicationName", n.prism2_1+"publicationName", n.eprints+"publication",
		n.dc+"source", n.dcterms+"source", n.og+"site_name"], true);
	
	// rights
	newItem.rights = getFirstResults(node, [n.prism+"copyright", n.prism2_0+"copyright", n.prism2_1+"copyright", n.dc+"rights", n.dcterms+"rights"], true);
	
	// section
	var section = getNodeByType(isPartOf, n.bib+"Part");
	if(section) {
		newItem.section = getFirstResults(section, [n.dc+"title", n.dcterms+"title"], true);
	}
	if (!section) {
		newItem.section = getFirstResults(node, [n.article+"section"], true);
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
	newItem.volume = getFirstResults((container ? container : node), [n.prism+"volume", n.prism2_0+"volume", n.prism2_1+"volume",
		n.eprints+"volume", n.bibo+"volume", n.dcterms+"citation.volume"], true);
	
	// issue
	newItem.issue = getFirstResults((container ? container : node), [n.prism+"number", n.prism2_0+"number", n.prism2_1+"number",
		n.eprints+"number", n.bibo+"issue", n.dcterms+"citation.issue"], true);
	// these mean the same thing
	newItem.patentNumber = newItem.number = newItem.issue;
	
	// edition
	newItem.edition = getFirstResults(node, [n.prism+"edition", n.prism2_0+"edition", n.prism2_1+"edition", n.bibo+"edition"], true);
	// these fields mean the same thing
	newItem.version = newItem.edition;
	
	// pages
	newItem.pages = getFirstResults(node, [n.bib+"pages", n.eprints+"pagerange", n.prism2_0+"pageRange", n.prism2_1+"pageRange", n.bibo+"pages"], true);
	if(!newItem.pages) {
		var pages = [];
		var spage = getFirstResults(node, [n.prism+"startingPage", n.prism2_0+"startingPage", n.prism2_1+"startingPage", n.bibo+"pageStart", n.dcterms+"relation.spage"], true),
			epage = getFirstResults(node, [n.prism+"endingPage", n.prism2_0+"endingPage", n.prism2_1+"endingPage", n.bibo+"pageEnd", n.dcterms+"relation.epage"], true);
		if(spage) pages.push(spage);
		if(epage) pages.push(epage);
		if(pages.length) newItem.pages = pages.join("-");
	}
	
	// numPages
	newItem.numPages = getFirstResults(node, [n.bibo+"numPages"], true);

	// numberOfVolumes
	newItem.numberOfVolumes = getFirstResults(node, [n.bibo+"numVolumes"], true);

	// short title
	newItem.shortTitle = getFirstResults(node, [n.bibo+"shortTitle"], true);
	
	// mediums
	newItem.artworkMedium = newItem.interviewMedium = getFirstResults(node, [n.dcterms+"medium"], true);
	
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
	newItem.date = getFirstResults(node, [n.eprints+"date", n.prism+"publicationDate", n.prism2_0+"publicationDate", n.prism2_1+"publicationDate", n.og+"published_time",
		n.dc+"date.issued", n.dcterms+"date.issued", n.dcterms+"issued", n.dc+"date", n.dcterms+"date",
		n.dcterms+"dateSubmitted", n.eprints+"datestamp"], true);
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
	
	// ISSN, if encoded per PRISM (DC uses "identifier")
	newItem.ISSN = getFirstResults((container ? container : node), [n.prism+"issn", n.prism2_0+"issn", n.prism2_1+"issn", n.eprints+"issn", n.bibo+"issn",
		n.prism+"eIssn", n.prism2_0+"eIssn", n.prism2_1+"eIssn", n.bibo+"eissn"], true) || newItem.ISSN;
	// ISBN from PRISM
	newItem.ISBN = getFirstResults((container ? container : node), [n.prism2_1+"isbn", n.bibo+"isbn", n.bibo+"isbn13", n.bibo+"isbn10"], true) || newItem.ISBN;
	// DOI from PRISM
	newItem.DOI = getFirstResults(node, [n.prism2_0+"doi", n.prism2_1+"doi", n.bibo+"doi"], true) || newItem.DOI;
	
	if(!newItem.url) {
		var url = getFirstResults(node, [n.eprints+"official_url", n.vcard2+"url", n.og+"url", n.prism2_0+"url", n.prism2_1+"url", n.bibo+"uri"]);
		if(url) {
			newItem.url = Zotero.RDF.getResourceURI(url[0]);
		}
	}
	
	// archiveLocation
	newItem.archiveLocation = getFirstResults(node, [n.dc+"coverage", n.dcterms+"coverage"], true);
	
	// abstract
	newItem.abstractNote = getFirstResults(node, [n.eprints+"abstract", n.prism+"teaser", n.prism2_0+"teaser", n.prism2_1+"teaser", n.og+"description",
		n.bibo+"abstract", n.dcterms+"abstract", n.dc+"description.abstract", n.dcterms+"description.abstract"], true);
	
	// type
	var type = getFirstResults(node, [n.dc+"type", n.dcterms+"type"], true);
	// these all mean the same thing
	var typeProperties = ["reportType", "letterType", "manuscriptType",
				"mapType", "thesisType", "websiteType",
				"presentationType", "postType",	"audioFileType"];
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

	// language
	newItem.language = getFirstResults(node, [n.dc+"language", n.dcterms+"language"], true);
	
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
	
	var subjects = getFirstResults(node, [n.dc+"subject", n.dcterms+"subject", n.article+"tag",
		n.prism2_0+"keyword", n.prism2_1+"keyword", n.prism2_0+"object", n.prism2_1+"object", n.prism2_0+"organization", n.prism2_1+"organization", n.prism2_0+"person", n.prism2_1+"person"]);
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

function getNodes(skipCollections) {
	var nodes = Zotero.RDF.getAllResources();

	var goodNodes = new Array();
	for each(var node in nodes) {
		// figure out if this is a part of another resource, or a linked
		// attachment, or a creator
		if(Zotero.RDF.getSources(node, n.dcterms+"isPartOf") ||
		   Zotero.RDF.getSources(node, n.bib+"presentedAt") ||
		   Zotero.RDF.getSources(node, n.link+"link") ||
		   Zotero.RDF.getSources(node, n.dcterms+"creator")) {
			continue;
		}
		
		// type
		var type = Zotero.RDF.getTargets(node, rdf+"type");
		if(type) {
			type = Zotero.RDF.getResourceURI(type[0]);

			// skip if this is not an independent attachment,
			if((type == n.z+"Attachment" || type == n.bib+"Memo") && isPart(node)) {
				continue;
			} else if(skipCollections &&
				(type == n.bib+"Collection" || type == n.z+"Collection")) {
				continue;
			}
		}
		goodNodes.push(node);
	}
	return goodNodes;
}

function doImport() {
	Zotero.setProgress(null);
	var nodes = getNodes();
	if(!nodes.length) {
		return false;
	}
	
	// keep track of collections while we're looping through
	var collections = new Array();
	
	var i = 0;
	for each(var node in nodes) {
		var newItem = new Zotero.Item();
		newItem.itemID = Zotero.RDF.getResourceURI(node);
		
		// type
		var type = Zotero.RDF.getTargets(node, rdf+"type");
		if(type) {
			type = Zotero.RDF.getResourceURI(type[0]);
			
			if(type == n.bib+"Collection" || type == n.z+"Collection") {
				// skip collections until all the items are done
				collections.push(node);
				continue;
			}
		}
		
		if(importItem(newItem, node)) {
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
	"detectType":detectType,
	"getNodes":getNodes,
	"defaultUnknownType":false
};
