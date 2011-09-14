{
	"translatorID": "951c027d-74ac-47d4-a107-9c3069ab7b48",
	"label": "Embedded RDF",
	"creator": "Simon Kornblith",
	"target": "",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 400,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2011-09-14 09:10:10"
}


// Known formats
// Reverse
var _n = {
	"http://purl.org/net/biblio#":"bib",
	"http://purl.org/dc/elements/1.1/":"dc",
	"http://purl.org/dc/terms/":"dcterms",
	"http://prismstandard.org/namespaces/1.2/basic/":"prism",
	"http://xmlns.com/foaf/0.1/":"foaf",
	"http://nwalsh.com/rdf/vCard#":"vcard",
	"http://www.w3.org/2006/vcard/ns#":"vcard2",	// currently used only for NSF, but is probably
							// very similar to the nwalsh vcard ontology in a
							// different namespace
	"http://purl.org/rss/1.0/modules/link/":"link",
	"http://www.zotero.org/namespaces/export#":"z",
	"http://purl.org/eprint/terms/":"eprint"
};

// Maps actual prefix in use to URI
var _prefixes = {};

// These are the ones that we will read without a declared schema
var _dcDefined = false;

function getPrefixes(doc) {
	if(_prefixes.length) {
		return _prefixes;
	}

	var links = doc.getElementsByTagName("link");
	for(var i=0; i<links.length; i++) {
		// Look for the schema's URI in our known schemata
		if(links[i].getAttribute("href") in _n) {
			var rel = links[i].getAttribute("rel");
			if(rel) {
				var matches = rel.match(/^schema\.([a-zA-Z]+)/);
				if(matches) {
					_prefixes[matches[1].toLowerCase()] = links[i].getAttribute("href");
					if (_n[links[i].getAttribute("href")] == "dc") {
						_dcDefined = true;	
					}
				}
			}
		}
	}
	// We allow prefix-less DC
	if (!_dcDefined && !_prefixes["dc"]) {
		_prefixes["dc"] = "http://purl.org/dc/elements/1.1/";
	}
	return _prefixes;
}

function detectWeb(doc, url) {
	var prefixes = getPrefixes(doc);
	
	// XXX What is this blacklisting?
	if (url.indexOf("reprint") != -1) return false;
	var metaTags = doc.getElementsByTagName("meta");
	for(var i=0; i<metaTags.length; i++) {
		var tag = metaTags[i].getAttribute("name");
		// See if the supposed prefix is there, split by period or underscore
		if(tag && (prefixes[tag.split('.')[0].toLowerCase()] 
				|| prefixes[tag.split('_')[0].toLowerCase()])) {
			return "webpage";
		}
	}
	
	return false;
}

function doWeb(doc, url) {
	var prefixes = getPrefixes(doc);
	
	// load RDF translator, so that we don't need to replicate import code
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("5e3ad958-ac79-463d-812b-a86a9235c28f");
	translator.setHandler("itemDone", function(obj, newItem) {
		if (!newItem.url) newItem.url = doc.location.href;
		if (!newItem.title) newItem.title = doc.title;
		// add attachment
		newItem.attachments.push({document:doc});
		// add access date
		newItem.accessDate = 'CURRENT_TIMESTAMP';
		newItem.complete();
	});
	
	translator.getTranslatorObject(function(rdf) {
		var metaTags = doc.getElementsByTagName("meta");
		for(var i=0; i<metaTags.length; i++) {
			var tag = metaTags[i].getAttribute("name");
			var value = metaTags[i].getAttribute("content");

			// See if the supposed prefix is there, split by period or underscore
			if(tag && (prefixes[tag.split('.')[0].toLowerCase()] 
					|| prefixes[tag.split('_')[0].toLowerCase()])) {
				// Set the delimiter for this tag
				var delim = (prefixes[tag.split('_')[0].toLowerCase()]) ? '_' : '.';
				var pieces = tag.split(delim);
				var prefix = pieces.shift().toLowerCase();

				rdf.Zotero.RDF.addStatement(url, prefixes[prefix] + pieces.join(delim).toLowerCase(), value, true);
			}
		}

		rdf.defaultUnknownType = "webpage";
		rdf.doImport();
	});
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
