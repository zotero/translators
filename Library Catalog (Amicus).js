{
	"translatorID": "a0a9a45c-cc9e-497c-962e-a366618df985",
	"label": "Library Catalog (Amicus)",
	"creator": "Sebastian Karcher",
	"target": "http://amicus.collectionscanada.ca",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 200,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2011-12-01 21:59:08"
}

function detectWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;


		return "book";
	
}

function scrape(marc, newDoc) {
	var namespace = newDoc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	  if (prefix == 'x') return namespace; else return null;
	} : null;
	
	var xpath = '//pre';
		var elmts = newDoc.evaluate(xpath, newDoc, null, XPathResult.ANY_TYPE, null);
	var elmt;
	while(elmt = elmts.iterateNext()) {
		var text = elmt.textContent;
		text = text.replace(/AMICUS No. [0-9]+\n\s+/, "");
		Z.debug(text);
		var newItem = new Zotero.Item();
		var record = new marc.record();
		
		var linee = text.split("\n");
		linee[0]=linee[0].replace(/^\s+/, "");
		Zotero.debug(linee[0]);
		for (var i=0; i<=linee.length; i++) {
			if(!linee[i]) {
				continue;
			}
			
			var value = linee[i].substr(7);
			if(linee[i].substr(0, 6) == "      ") {
				// add this onto previous value
				tagValue += value;
			} else {
				if(linee[i].substr(0, 3) == "000") {
					// trap leader
					record.leader = value;
					Zotero.debug("Leader: " + record.leader);
				} else {
					if(tagValue) {	// finish last tag
						tagValue = tagValue.replace(/º/g, marc.subfieldDelimiter);
						if(tagValue[0] != marc.subfieldDelimiter) {
							tagValue = marc.subfieldDelimiter+"a"+tagValue;
						}
				
						Zotero.debug("tag: "+tag+" ind: " + ind+" tagValue: "+tagValue );
							record.addField(tag, ind, tagValue);
					}
					var tag = linee[i].substr(0, 3);
					var ind  = linee[i].substr(4, 2);
					var tagValue = value;
				}
			}
		}
		if(tagValue) {
			tagValue = tagValue.replace(/°/g, marc.subfieldDelimiter);
			if(tagValue[0] != marc.subfieldDelimiter) {
				tagValue = marc.subfieldDelimiter+"a"+tagValue;
			}
			// add previous tag
			record.addField(tag, ind, tagValue);
		}
		Zotero.debug(record);
		record.translate(newItem);
		
		//var domain = newDoc.location.href.match(/https?:\/\/([^/]+)/);
		//newItem.repository = domain[1]+" Library Catalog";
		newItem.complete();
	}
}

function pageByPage(marc, urls) {
	Zotero.Utilities.processDocuments(urls, function(newDoc) {
		scrape(marc, newDoc);
	}, function() { Zotero.done() });
}

function doWeb(doc, url) {
	var uri = doc.location.href;
	var newUri;
	// load translator for MARC
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("a6ee60df-1ddc-4aae-bb25-45e0537be973");
	translator.getTranslatorObject(function(marc) {
		var namespace = doc.documentElement.namespaceURI;
		var nsResolver = namespace ? function(prefix) {
			if (prefix == 'x') return namespace; else return null;
		} : null;
		
		if (detectWeb(doc, url) == "book") {
			newUri = url+"&d=3"
			Z.debug(newUri);
			pageByPage(marc, [newUri]);
		} 
		
		
		else {	// Search results page
			// Require link to match this
			var tagRegexp = new RegExp();
			tagRegexp.compile('^https?://[^/]+/search\\??/[^/]+/[^/]+/[0-9]+\%2C[^/]+/frameset');
			
			var urls = new Array();
			var availableItems = new Array();
			var firstURL = false;
			
			var tableRows = doc.evaluate('//table//tr[@class="browseEntry" or @class="briefCitRow" or td/input[@type="checkbox"] or td[contains(@class,"briefCitRow") or contains(@class,"briefcitCell")]]',
										 doc, nsResolver, XPathResult.ANY_TYPE, null);
			// Go through table rows
			var i = 0;
			while(tableRow = tableRows.iterateNext()) {
				// get link
				var links = doc.evaluate('.//*[@class="briefcitTitle"]/a', tableRow, nsResolver, XPathResult.ANY_TYPE, null);
				var link = links.iterateNext();
				if(!link) {
					var links = doc.evaluate(".//a[@href]", tableRow, nsResolver, XPathResult.ANY_TYPE, null);
					link = links.iterateNext();
				}
				
				if(link) {
					if(availableItems[link.href]) {
						continue;
					}
					
					// Go through links
					while(link) {
						if (link.textContent.match(/\w+/)) availableItems[link.href] = link.textContent;
						link = links.iterateNext();
					}
					i++;
				}
			};
			
			var items = Zotero.selectItems(availableItems);
			
			if(!items) {
				return true;
			}
			
			var newUrls = new Array();
			for(var itemURL in items) {
				newUrls.push(itemURL.replace("frameset", "marc"));
			}
			pageByPage(marc, newUrls);
		}
	});
	
	Zotero.wait();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://books.luther.edu/record=b2115431~S9",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "G. W",
						"lastName": "Kimura",
						"creatorType": "contributor"
					},
					{
						"lastName": "ebrary, Inc",
						"fieldMode": true
					}
				],
				"notes": [],
				"tags": [
					"Alaska",
					"History",
					"Alaska",
					"Anniversaries, etc",
					"Alaska",
					"Social conditions",
					"Alaska",
					"Economic conditions",
					"Electronic books"
				],
				"seeAlso": [],
				"attachments": [],
				"title": "Alaska at 50 the past, present, and next fifty years of statehood",
				"place": "Fairbanks",
				"publisher": "University of Alaska Press",
				"date": "2009",
				"numPages": "285",
				"callNumber": "F904 .A477 2009eb",
				"libraryCatalog": "books.luther.edu Library Catalog"
			}
		]
	},
	{
		"type": "web",
		"url": "http://utmost.cl.utoledo.edu/search/?searchtype=X&SORT=D&searcharg=history+of+communication&searchscope=3",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://umiss.lib.olemiss.edu/search/?searchtype=X&SORT=D&searcharg=history+of+communication",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://luna.wellesley.edu/search/?searchtype=X&SORT=D&searcharg=history+of+ideas&searchscope=1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://clues.concordia.ca/search/?searchtype=X&SORT=D&searcharg=history+of+communication",
		"items": "multiple"
	}
]
/** END TEST CASES **/
