{
	"translatorID": "05d07af9-105a-4572-99f6-a8e231c0daef",
	"label": "COinS",
	"creator": "Simon Kornblith",
	"target": "",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 310,
	"inRepository": true,
	"translatorType": 6,
	"browserSupport": "gcsv",
	"lastUpdated": "2015-06-04 03:25:10"
}

function detectWeb(doc, url) {
	var spanTags = doc.getElementsByTagName("span");

	var encounteredType = false;
	
	// This and the x: prefix in the XPath are to work around an issue with pages
	// served as application/xhtml+xml
	//
	// https://developer.mozilla.org/en/Introduction_to_using_XPath_in_JavaScript#Implementing_a_default_namespace_for_XML_documents
	function nsResolver() {
		return 'http://www.w3.org/1999/xhtml';
	}
	
	var spans = doc.evaluate('//x:span[contains(@class, " Z3988") or contains(@class, "Z3988 ") or @class="Z3988"][@title]', doc, nsResolver, XPathResult.ANY_TYPE, null);
	var span;
	while (span = spans.iterateNext()) {
		// determine if it's a valid type
		var item = new Zotero.Item;
		var success = Zotero.Utilities.parseContextObject(span.title, item);
		
		if (item.itemType) {
			if (encounteredType) {
				return "multiple";
			} else {
				encounteredType = item.itemType;
			}
		}
	}
	
	return encounteredType;
}

// Borrowed from Nature translator
function supplementItem(item, supp, prefer, ignore) {
	if (!prefer) prefer = [];
	if (!ignore) ignore = [];
	
	for (var i in supp) {
		if (ignore.indexOf(i) != -1)  continue;
		if (i == 'creators' || i == 'attachments' || i == 'notes'
			|| i == 'tags' || i == 'seeAlso'
		) {
			if ( (item.hasOwnProperty(i) && item[i].length) // Supplement only if completely empty
				|| (!supp[i].length || typeof supp[i] == 'string')
			) {
				continue;
			}
		} else if (!supp.hasOwnProperty(i)
			|| (item.hasOwnProperty(i) && prefer.indexOf(i) == -1)) {
			continue;
		}

		Z.debug('Supplementing item.' + i);
		item[i] = supp[i];
	}

	return item;
}

// used to retrieve next COinS object when asynchronously parsing COinS objects
// on a page
function retrieveNextCOinS(needFullItems, newItems, couldUseFullItems, doc) {
	if (needFullItems.length) {
		var item = needFullItems.shift();
		
		Zotero.debug("Looking up contextObject");
		var search = Zotero.loadTranslator("search");
		search.setHandler("itemDone", function(obj, newItem) {
			supplementItem(newItem, item, [], ['contextObject', 'repository']);
			newItems.push(newItem);
		});
		search.setHandler("done", function() {
			retrieveNextCOinS(needFullItems, newItems, couldUseFullItems, doc);
		});
		// Don't throw on error
		search.setHandler("error", function() {
			Zotero.debug("Failed to look up item:");
			Zotero.debug(item);
		});
		// look for translators
		search.setHandler("translators", function(obj, translators) {
			if (translators.length) {
				search.setTranslator(translators);
				search.translate();
			} else {
				retrieveNextCOinS(needFullItems, newItems, couldUseFullItems, doc);
			}
		});
		
		search.setSearch(item);
		search.getTranslators();
	} else {
		completeCOinS(newItems, couldUseFullItems, doc);
		Zotero.done();
	}
}

// saves all COinS objects
function completeCOinS(newItems, couldUseFullItems, doc) {
	if (newItems.length > 1) {
		var selectArray = new Array(newItems.length);
		for (var i in newItems) {
			selectArray[i] = newItems[i].title;
		}
		
		Zotero.selectItems(selectArray, function (selectArray) {
			if (!selectArray) return true;
			var useIndices = new Array();
			for (var i in selectArray) {
				useIndices.push(i);
			}
			completeItems(newItems, useIndices, couldUseFullItems, doc);
		});
	} else if (newItems.length) {
		completeItems(newItems, [0], couldUseFullItems, doc);
	}
}

function completeItems(newItems, useIndices, couldUseFullItems, doc) {
	if (!useIndices.length) {
		return;
	}
	var i = useIndices.shift();
	
	// grab full item if the COinS was missing an author
	if (couldUseFullItems[i]) {
		Zotero.debug("Looking up contextObject");
		var search = Zotero.loadTranslator("search");
		
		var firstItem = false;
		search.setHandler("itemDone", function(obj, newItem) {
			supplementItem(newItem, newItems[i], [], ['contextObject', 'repository']);
			if (!firstItem) {
				// add doc as attachment
				newItem.attachments.push({document:doc});
				newItem.complete();
				firstItem = true;
			}
		});
		search.setHandler("done", function(obj) {
			// if we didn't find anything, use what we had before (even if it
			// lacks the creator)
			if (!firstItem) {
				newItems[i].complete();
			}
			// call next
			completeItems(newItems, useIndices, couldUseFullItems);
		});
		// Don't throw on error
		search.setHandler("error", function() {});
		search.setHandler("translators", function(obj, translators) {
			if (translators.length) {
				search.setTranslator(translators);
				search.translate();
			} else {
				// add doc as attachment
				newItems[i].attachments.push({document:doc});
				newItems[i].complete();
				// call next
				completeItems(newItems, useIndices, couldUseFullItems);
			}
		});
		
		search.setSearch(newItems[i]);
		search.getTranslators();
	} else {
		// add doc as attachment
		newItems[i].attachments.push({document:doc});
		newItems[i].complete();
		// call next
		completeItems(newItems, useIndices, couldUseFullItems);
	}
}

function doWeb(doc, url) {
	var newItems = new Array();
	var needFullItems = new Array();
	var couldUseFullItems = new Array();
	
	
	// See note in detectWeb()
	function nsResolver() {
		return 'http://www.w3.org/1999/xhtml';
	}
	
	var spans = doc.evaluate('//x:span[contains(@class, " Z3988") or contains(@class, "Z3988 ") or @class="Z3988"][@title]', doc, nsResolver, XPathResult.ANY_TYPE, null);
	var span;
	while (span = spans.iterateNext()) {
		var spanTitle = span.title;
		var newItem = new Zotero.Item();
		newItem.repository = false;	// do not save repository
		if (Zotero.Utilities.parseContextObject(spanTitle, newItem)) {
			if (newItem.title) {
				if (!newItem.creators.length) {
					// if we have a title but little other identifying
					// information, say we'll get full item later
					newItem.contextObject = spanTitle;
					couldUseFullItems[newItems.length] = true;
				}
				
				// title and creators are minimum data to avoid looking up
				newItems.push(newItem);
			} else {
				// retrieve full item
				newItem.contextObject = spanTitle;
				needFullItems.push(newItem);
			}
		}
	}
	
	Zotero.debug(needFullItems);
	if (needFullItems.length) {
		// retrieve full items asynchronously
		Zotero.wait();
		retrieveNextCOinS(needFullItems, newItems, couldUseFullItems, doc);
	} else {
		completeCOinS(newItems, couldUseFullItems, doc);
	}
}

function doExport() {
	var item;
	var co;
	
	while (item = Zotero.nextItem()) {
		co = Zotero.Utilities.createContextObject(item, "1.0");
		if (co) {
			Zotero.write("<span class='Z3988' title='"+ Zotero.Utilities.htmlSpecialChars(co) +"'></span>\n");
		}
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.husdal.com/2011/06/19/disruptions-in-supply-networks/",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Phil",
						"lastName": "Greening",
						"creatorType": "author"
					},
					{
						"firstName": "Christine",
						"lastName": "Rutherford",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{}
				],
				"publicationTitle": "International Journal of Logistics Management",
				"title": "Disruptions and supply networks: a multi-level, multi-theoretical relational perspective",
				"date": "2011",
				"volume": "22",
				"issue": "1",
				"pages": "104-126",
				"libraryCatalog": false,
				"shortTitle": "Disruptions and supply networks"
			}
		]
	},
	{
		"type": "web",
		"url": "http://gamblershouse.wordpress.com/2011/06/19/the-view-from-dolores/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.hubmed.org/display.cgi?uids=21665052",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Hui-Wen Vivian",
						"lastName": "Tang"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{}
				],
				"publicationTitle": "Evaluation and Program Planning",
				"volume": "34",
				"issue": "4",
				"language": "en",
				"ISSN": "01497189",
				"date": "11/2011",
				"pages": "343-352",
				"DOI": "10.1016/j.evalprogplan.2011.04.002",
				"url": "http://linkinghub.elsevier.com/retrieve/pii/S0149718911000449",
				"title": "Optimizing an immersion ESL curriculum using analytic hierarchy process",
				"libraryCatalog": "CrossRef"
			}
		]
	}
]
/** END TEST CASES **/