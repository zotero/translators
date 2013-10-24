{
	"translatorID": "c159dcfe-8a53-4301-a499-30f6549c340d",
	"label": "DOI",
	"creator": "Simon Kornblith",
	"target": "",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 300,
	"inRepository": true,
	"translatorType": 12,
	"browserSupport": "gcsv",
	"lastUpdated": "2013-10-23 07:41:26"
}

var items = {};
var selectArray = {};

var __num_DOIs;

// builds a list of DOIs
function getDOIs(doc) {
	// TODO Detect DOIs more correctly.
	// The actual rules for DOIs are very lax-- but we're more strict.
	// Specifically, we should allow space characters, and all Unicode
	// characters except for control characters. Here, we're cheating
	// by not allowing ampersands, to fix an issue with getting DOIs
	// out of URLs.
	// Description at: http://www.doi.org/handbook_2000/appendix_1.html#A1-4
	const DOIre = /\b10\.[0-9]{4,}\/[^\s&]*[^\s\&\.,]/g;
	const DOIXPath = "//text()[contains(., '10.')]\
						[not(parent::script or parent::style)]";

	var DOIs = [];

	var node, m, DOI;
	var results = doc.evaluate(DOIXPath, doc, null, XPathResult.ANY_TYPE, null);
	while(node = results.iterateNext()) {
		DOIre.lastMatch = 0;
		while(m = DOIre.exec(node.nodeValue)) {
			DOI = m[0];
			if(DOI.substr(-1) == ")" && DOI.indexOf("(") == -1) {
				DOI = DOI.substr(0, DOI.length-1);
			}
			// only add new DOIs
			if(DOIs.indexOf(DOI) == -1) {
				DOIs.push(DOI);
			}
		}
	}

	return DOIs;
}

function detectWeb(doc, url) {
	// Blacklist the advertising iframe in ScienceDirect guest mode:
	// http://www.sciencedirect.com/science/advertisement/options/num/264322/mainCat/general/cat/general/acct/...
	// This can be removed from blacklist when 5c324134c636a3a3e0432f1d2f277a6bc2717c2a hits all clients (Z 3.0+)
	const blacklistRe = /^https?:\/\/[^/]*(?:google\.com|sciencedirect\.com\/science\/advertisement\/)/i;
	
	if(!blacklistRe.test(url)) {
		var DOIs = getDOIs(doc);
		if(DOIs.length) {
			return DOIs.length == 1 ? "journalArticle" : "multiple";
		}
	}
	return false;
}

function completeDOIs(doc) {
	// all DOIs retrieved now
	// check to see if there is more than one DOI
	var numDOIs = 0;
	for(var DOI in selectArray) {
		numDOIs++;
		if(numDOIs == 2) break;
	}
	if(numDOIs == 0) {
		throw "DOI Translator: could not find DOI";
	} else if(numDOIs == 1) {
		// do we want to add URL of the page?
		items[DOI].url = doc.location.href;
		items[DOI].attachments = [{document:doc}];
		items[DOI].complete();
	} else {
		Zotero.selectItems(selectArray, function(selectedDOIs) {
			if(!selectedDOIs) return true;

			for(var DOI in selectedDOIs) {
				items[DOI].complete();
			}
		});
	}
}

function retrieveDOIs(DOIs, doc) {
	var translate = Zotero.loadTranslator("search");
	//load self
	translate.setTranslator("c159dcfe-8a53-4301-a499-30f6549c340d");
	translate.setSearch(DOIs);

	// don't save when item is done
	translate.setHandler("itemDone", function(translate, item) {
		if(item._status !== 'success') return;
		items[item._query] = item;
		selectArray[item._query] = item.title;
	});

	translate.setHandler("done", function(translate) {
		completeDOIs(doc);
	});

	// Don't throw on error
	translate.setHandler("error", function() {});

	translate.translate();
}

function doWeb(doc, url) {
	var DOIs = getDOIs(doc);

	// retrieve full items asynchronously
	retrieveDOIs(DOIs, doc);
}

function detectSearch(items) {
	if(!items) return false;
	
	if(items.directSearch) {
		Z.debug("DOI: directSearch was set, skipping global DOI search.");
		return false;
	}
	
	if(typeof items == 'string') {
		if(ZU.cleanDOI(items)) return true;
		return false;
	}
	
	if(typeof items == 'string' || !items.length) items = [items];
	
	//if we have at least one valid-looking DOI, return true
	for(var i=0, n=items.length; i<n; i++) {
		if(items[i]) {
			if(items[i].DOI && ZU.cleanDOI('' + items[i].DOI)) {
				return true;
			} else if(typeof items[i] == 'string' && ZU.cleanDOI(items[i])) {
				return true;
			}
		}
	}
	
	return false;
}

//try translators until we get a result
function runTranslator(translators, item) {
	if(!translators.length) {
		Z.debug("No more translators left to try.");
		return;
	}

	var transDesc = translators.shift();
	var trans = Zotero.loadTranslator("search");
	trans.setTranslator(transDesc);
	trans.setSearch(item);

	trans.setHandler("itemDone", function(obj, newItem) {
		runTranslator.done = true;
		newItem.complete();
	});

	//keep going until we get an item
	trans.setHandler("done", function(){
		if(!runTranslator.done) {
			runTranslator(translators);
		}
	});

	trans.translate();
}

//try to resolve doi via other methods
function fail_callback(doi) {
	var trans = Zotero.loadTranslator("search");
	trans.setTranslator(fallback_search_translators);

	var item = new Zotero.Item();
	item.DOI = doi;
	trans.setSearch(item);

	trans.setHandler('translators', function(trans, detected) {
		runTranslator.done = false;
		runTranslator(detected, item);
	});

	trans.getTranslators(false, true);	//get all translators that pass detectSearch
}

var supportedRAs = {
	"CrossRef": "11645bd1-0420-45c1-badb-53fb41eeb753",
	"AIRITI": "5f0ca39b-898a-4b1e-b98d-8cd0d6ce9801",
	"EIDR": "79c3d292-0afc-42a1-bd86-7e706fc35aa5",
	"Data Cite": "9f1fb86b-92c8-4db7-b8ee-0b481d456428"
	//we don't have translators for the following yets
	//"CNKI"
	//"JaLC"
	//"mEDRA"
	//"OPOCE"
};
	
/**
 * Takes a single DOI or an array of DOIs as item.DOI
 * Attempts to retrieve the DOIs from an appropriate authority
 * Assigns a status code to item._status
**/
function doSearch(items) {
	var query = filterQuery(items);
	if(!query.length) return;
	
	fetchFromCrossRef(query, determineOtherRAs);
}

/**
 * Filter out invalid queries
 */
function filterQuery(items) {
	if(!items) return [];
	
	if(typeof items == 'string' || !items.length) items = [items];
	
	//filter out invalid queries
	var query = [];
	for(var i=0, n=items.length; i<n; i++) {
		if( ( items[i].DOI && ZU.cleanDOI(items[i].DOI) )
			|| ( typeof items[i] == 'string' && ZU.cleanDOI(items[i]) ) ) {
			query.push(items[i]);
		} else {
			var newItem = new Zotero.Item();
			newItem._status = 'invalid';
			newItem._query = items[i];
			newItem.complete();
		}
	}
	return query;
}

function fetchFromCrossRef(query, next) {
	var queryNext = [];
	
	var trans = Zotero.loadTranslator("search");
	// CrossRef
	trans.setTranslator("11645bd1-0420-45c1-badb-53fb41eeb753");
	trans.setSearch(query);
	
	trans.setHandler("itemDone", function(obj, item) {
		if(item._status === 'success') {
			item.libraryCatalog = 'CrossRef';
			item.complete();
		} else {
			queryNext.push(item._query);
		}
	});
	
	trans.setHandler("done", function(obj) {
		if(queryNext.length) {
			next(queryNext);
		}
	});
	
	trans.translate();
}

function determineOtherRAs(query) {
	//determine RAs
	var getLengthLimit = 2048; //to be on the safe side
	var requestURL = 'http://doi.crossref.org/doiRA/';
	var doiRequest = requestURL;
	var first = true;
	var urls = [];
	var queryTracker = {};
	
	for(var i=0, n=query.length; i<n; i++) {
		// Escape some incompatible characters although RA lookup tool doesn't
		// currently support escaped characters.
		// This will avoid problems on our end.
		var doi = ZU.cleanDOI(query[i].DOI || query[i]);
		queryTracker[doi] = query[i]; //potential issue: searching for the same DOI more than once
		
		Z.debug("Looking up RA for " + doi);
		
		var escapedDOI = doi.replace(/[,#&?]/g, function(m) { return escapeURIComponent(m); });
		if( (doiRequest.length + escapedDOI.length + 1) <= getLengthLimit ) {
			if(!first) doiRequest += ',';
			else first = false;
			
			doiRequest += escapedDOI;
			continue;
		}
		
		urls.push(doiRequest);
		doiRequest = requestURL + escapedDOI;
	}
	
	if(doiRequest != requestURL) {
		urls.push(doiRequest);
	}
	
	var queryByRA = {};
	var ras = [];
		
	ZU.doGet(urls, function(text) {
		var raList;
		try {
			raList = JSON.parse(text);
		} catch(e) {
			Z.debug("Error parsing RA list");
			Z.debug(e);
			raList = [];
		}
		
		for(var i=0, n=raList.length; i<n; i++) {
			var inputQuery = queryTracker[raList[i].DOI];
			if(!inputQuery) {
				Z.debug("RA lookup returned result for " + raList[i].DOI + " which was not in the input");
				continue;
			}
			
			delete queryTracker[raList[i].DOI];
			
			if(raList[i].RA == "DOI does not exist" || raList[i].RA == "Invalid DOI"
				|| raList[i].RA == "CrossRef") { //we already checked CrossRef, so no need to check again
				var item = new Zotero.Item();
				item._query = inputQuery;
				item._status = raList[i].RA != "Invalid DOI" ? 'not found' : 'invalid';
				item.complete();
				continue;
			}
			
			if(!queryByRA[raList[i].RA]) {
				queryByRA[raList[i].RA] = [];
				ras.push(raList[i].RA);
			}
			
			queryByRA[raList[i].RA].push(inputQuery);
		}
	},
	function() {
		//take care of queries that didn't get results
		for(var q in queryTracker) {
			var newItem = new Zotero.Item();
			newItem._query = queryTracker[q];
			newItem._status = 'not found';
			newItem.complete();
		}
		
		fetchFromOtherRAs(queryByRA, ras)
	});
}

function fetchFromOtherRAs(queryByRA, ras) {
	for(var i=0, n=ras.length; i<n; i++) {
		var transID = supportedRAs[ras[i]];
		var query = queryByRA[ras[i]];
		
		if(!transID) {
			for(var j=0, m=query.length; j<m; j++) {
				var item = new Zotero.Item();
				item._query = query[j];
				item._status = 'unimplemented';
				item.complete();
			}
			continue;
		}
		
		(function(ra) {
			var trans = Zotero.loadTranslator("search");
			trans.setTranslator(transID);
			trans.setSearch(query);
			trans.setHandler('itemDone', function(obj, item) {
				if(item._status == 'success') {
					item.libraryCatalog = ra;
					item.complete();
				}
			});
			trans.translate();
		})(ras[i]);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.crossref.org/help/Content/01_About_DOIs/What_is_a_DOI.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Jianxun",
						"lastName": "Mou"
					},
					{
						"creatorType": "author",
						"firstName": "Jie",
						"lastName": "Yang"
					},
					{
						"creatorType": "author",
						"firstName": "Zhifeng",
						"lastName": "Shao"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{}
				],
				"issue": "3",
				"ISSN": "00222836",
				"DOI": "10.1006/jmbi.1995.0238",
				"url": "http://www.crossref.org/help/Content/01_About_DOIs/What_is_a_DOI.htm",
				"libraryCatalog": "CrossRef",
				"publicationTitle": "Journal of Molecular Biology",
				"volume": "248",
				"date": "5/1995",
				"pages": "507-512",
				"title": "Atomic Force Microscopy of Cholera Toxin B-oligomers Bound to Bilayers of Biologically Relevant Lipids"
			}
		]
	},
	{
		"type": "web",
		"url": "http://blog.apastyle.org/apastyle/digital-object-identifier-doi/",
		"items": "multiple"
	}
]
/** END TEST CASES **/