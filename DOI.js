{
	"translatorID": "c159dcfe-8a53-4301-a499-30f6549c340d",
	"label": "DOI",
	"creator": "Simon Kornblith",
	"target": "",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 300,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsv",
	"lastUpdated": "2012-09-06 07:13:03"
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
	__num_DOIs = DOIs.length;

	for(var i=0, n=DOIs.length; i<n; i++) {
		(function(doc, DOI) {
			var translate = Zotero.loadTranslator("search");
			translate.setTranslator("11645bd1-0420-45c1-badb-53fb41eeb753");
	
			var item = {"itemType":"journalArticle", "DOI":DOI};
			translate.setSearch(item);
	
			// don't save when item is done
			translate.setHandler("itemDone", function(translate, item) {
				item.repository = "CrossRef";
				items[DOI] = item;
				selectArray[DOI] = item.title;
			});
	
			translate.setHandler("done", function(translate) {
				__num_DOIs--;
				if(__num_DOIs <= 0) {
					completeDOIs(doc);
				}
			});
	
			// Don't throw on error
			translate.setHandler("error", function() {});
	
			translate.translate();
		})(doc, DOIs[i]);
	}
}

function doWeb(doc, url) {
doSearch({DOI:'10.1126/science.169.3946.635'});
return;
	var DOIs = getDOIs(doc);

	// retrieve full items asynchronously
	retrieveDOIs(DOIs, doc);
}

function detectSearch(item) {
	if(typeof(item.DOI) == "string") {
		item.DOI = [item.DOI];
	} else if(!(item.DOI instanceof Array)) {	//we can only handle single DOI or an array of DOIs
		return false;
	}

	//filter out invalid DOIs (very loosely)
	for(var i=0, n=item.DOI.length; i<n; i++) {
		if(typeof(item.DOI[i]) != "string" || !item.DOI[i].match(/^10\..+\/.+/)) {
			item.DOI.splice(i,1);
			i--;
			n--;
		}
	}

	return (item.DOI.length > 0);
}

const DOI_URL_BASE = 'http://dx.doi.org/';

var fallback_search_translators = [
	"79c3d292-0afc-42a1-bd86-7e706fc35aa5"	//EIDR
];

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

function doSearch(item) {
	if(!detectSearch(item)) return;

	var DOIs = ['10.1126/science.169?.3946.635', '10.1126/science.169.3946.635', '10.5240/6F7E-EF59-329B-1F0A-8440-2']; //item.DOI;
	for(var i=0, n=DOIs.length; i<n; i++) {
		(function(doi, fail_callback) {
			ZU.doPost(DOI_URL_BASE + doi, '', function(text) {
				//Z.debug(text);
				var rdf = Zotero.loadTranslator("import");
				rdf.setTranslator("5e3ad958-ac79-463d-812b-a86a9235c28f");
				rdf.setString(text);
	
				rdf.setHandler('itemDone', function(obj, newItem) {
					//dates can sometimes appear in timestamp format. Fix it.
					if(newItem.date) newItem.date = newItem.date.split(/Z/)[0];

					//CrossRef (at least) does not include the resource URL in their response
					//This is intentional: http://www.crossref.org/CrossTech/2011/04/content_negotiation_for_crossr.html#comment-71026
					//We will add a DOI url ourselves
					newItem.url = DOI_URL_BASE + doi;

					newItem.complete();
				});

				//called after getTranslators finishes
				//If detect call succeeded, continue
				rdf.setHandler('translators', function(trans, detected) {	//trans is not actually passed for security reasons
					if(detected.length) {
						rdf.translate();
					} else {
						Z.debug('Could not resolve doi using doi.org: ' + doi);
						fail_callback(doi);
					}
				});

				//this effectively calls detectImport on the RDF translator
				rdf.getTranslators(false, true);
			},
			{ Accept: 'application/rdf+xml' });
		})(DOIs[i], fail_callback);
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