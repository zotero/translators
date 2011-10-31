{
	"translatorID": "446764bf-7da6-49ec-b7a7-fefcbafe317f",
	"label": "Library Catalog (Encore)",
	"creator": "Sebastian Karcher",
	"target": "/iii/encore/(record|search)",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-10-30 20:45:22"
}

/*
Encore Library Catalog Translator
Copyright (C) 2011 Sebastian Karcher and CHNM

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url){
	var bibIdRe = new RegExp("encore/record");
	if (bibIdRe.test(url)){
		return "book";
	}
	
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;	
	
var bibIdSearch = new RegExp("encore/search");
	if (bibIdSearch.test(url)){
		return "multiple";
	}
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
			newUri = uri.replace(/\?/, "?marcData=Y&");
			pageByPage(marc, [newUri]);
		} else {	// Search results page
			// Require link to match this
			var tagRegexp = new RegExp();
			tagRegexp.compile('^https?://[^/]+/search\\??/[^/]+/[^/]+/[0-9]+\%2C[^/]+/frameset');
			
			var urls = new Array();
			var availableItems = new Array();
			var firstURL = false;
			
			var tableRows = doc.evaluate('//td[@class="browseResultContent" or @class="itemTitleCell"] ',
										 doc, nsResolver, XPathResult.ANY_TYPE, null);
			// Go through table rows
			var i = 0;
			while(tableRow = tableRows.iterateNext()) {
				// get link
				var links = doc.evaluate('.//*[@class="dpBibTitle"]/a', tableRow, nsResolver, XPathResult.ANY_TYPE, null);
				var link = links.iterateNext();
		
				
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
			
			Zotero.selectItems(availableItems, function (items) {
				if(!items) {
					return true;
				}
				
				var newUrls = new Array();
				for(var itemURL in items) {
					newUrls.push(itemURL.replace("?", "?marcData=Y&"));
				}
				pageByPage(marc, newUrls);
			});
		}
	});
	
	Zotero.wait();
}



//functions:
function scrape(marc, newDoc) {
	var namespace = newDoc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	  if (prefix == 'x') return namespace; else return null;
	} : null;
	
	var xpath = '//pre/text()';
	if (newDoc.evaluate(xpath, newDoc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) {
		var elmts = newDoc.evaluate(xpath, newDoc, null, XPathResult.ANY_TYPE, null);
		var useNodeValue = true;
	} else {
		var elmts = newDoc.evaluate('//pre', newDoc, nsResolver, XPathResult.ANY_TYPE, null);
		var useNodeValue = false;
	}

	var elmt;
	while(elmt = elmts.iterateNext()) {
		if (useNodeValue) {
			var text = elmt.nodeValue;
		} else {
			var text = elmt.textContent;
		}
		var newItem = new Zotero.Item();
		var record = new marc.record();
		
		var linee = text.split("\n");
		for (var i=0; i<linee.length; i++) {
			if(!linee[i]) {
				continue;
			}
			
			linee[i] = linee[i].replace(/[\xA0_\t]/g, " ");
			var value = linee[i].substr(7);
			
			if(linee[i].substr(0, 6) == "      ") {
				// add this onto previous value
				tagValue += value;
			} else {
				if(linee[i].substr(0, 6) == "LEADER") {
					// trap leader
					record.leader = value;
				} else {
					if(tagValue) {	// finish last tag
						tagValue = tagValue.replace(/\|(.)/g, marc.subfieldDelimiter+"$1");
						if(tagValue[0] != marc.subfieldDelimiter) {
							tagValue = marc.subfieldDelimiter+"a"+tagValue;
						}
						
						// add previous tag
						record.addField(tag, ind, tagValue);
					}
					
					var tag = linee[i].substr(0, 3);
					var ind  = linee[i].substr(4, 2);
					var tagValue = value;
				}
			}
		}
		if(tagValue) {
			tagValue = tagValue.replace(/\|(.)/g, marc.subfieldDelimiter+"$1");
			if(tagValue[0] != marc.subfieldDelimiter) {
				tagValue = marc.subfieldDelimiter+"a"+tagValue;
			}
			
			// add previous tag
			record.addField(tag, ind, tagValue);
		}
		
		record.translate(newItem);
		//the library catalogue name isn't perfect, but should be unambiguous. 
		var domain = newDoc.location.href.match(/https?:\/\/([^/]+)/);
		newItem.repository = domain[1].replace(/encore\./, "")+" Library Catalog";
		// there is too much stuff in the note field - or file this as an abstract?
		newItem.notes = [];
		
		//editors get mapped as contributos - but so do many others who should be
		// --> for books that don't have an author, turn contributors into editors.
		if (newItem.itemType=="book"){
		for (var i in newItem.creators) {
			if (newItem.creators[i].creatorType=="author") var t ="author";
		 if (!t){
		 if (newItem.creators[i].creatorType=="contributor") {
				newItem.creators[i].creatorType="editor";
			}}
		}
		}
		
		newItem.complete();
	}
}

function pageByPage(marc, urls) {
	Zotero.Utilities.processDocuments(urls, function(newDoc) {
		scrape(marc, newDoc);
	}, function() { Zotero.done() });
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://encore.tulsalibrary.org/iii/encore/record/C__Rb1951305__Sthelen__P0%2C8__Orightresult__X3?lang=eng&suite=cobalt",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Scott Douglas",
						"lastName": "Gerber",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [
					"United States",
					"Politics and government",
					"1775-1783",
					"United States",
					"Politics and government",
					"1783-1865",
					"United States",
					"Politics and government Philosophy"
				],
				"seeAlso": [],
				"attachments": [],
				"ISBN": "1568027052",
				"title": "The Declaration of Independence: origins and impact",
				"place": "Washington, D.C",
				"publisher": "CQ Press",
				"date": "2002",
				"numPages": "347",
				"series": "Landmark events in U.S. history series",
				"callNumber": "E221 .D35 2002",
				"libraryCatalog": "tulsalibrary.org Library Catalog",
				"shortTitle": "The Declaration of Independence"
			}
		]
	},
	{
		"type": "web",
		"url": "http://encore.tulsalibrary.org/iii/encore/record/C__Rb1653320__Sthelen__P0%2C2__Orightresult__X4?lang=eng&suite=cobalt",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Sherry",
						"lastName": "Shahan",
						"creatorType": "author"
					},
					{
						"firstName": "Mary",
						"lastName": "Thelen",
						"creatorType": "contributor"
					}
				],
				"notes": [],
				"tags": [
					"Jazz",
					"Musical instruments",
					"Alphabet"
				],
				"seeAlso": [],
				"attachments": [],
				"ISBN": "0399234535",
				"title": "The jazzy alphabet",
				"place": "New York",
				"publisher": "Philomel Books",
				"date": "2002",
				"numPages": "1",
				"callNumber": "Sha",
				"libraryCatalog": "tulsalibrary.org Library Catalog"
			}
		]
	},
	{
		"type": "web",
		"url": "http://encore.colorado.edu/iii/encore/search?formids=target&lang=eng&suite=def&reservedids=lang%2Csuite&submitmode=&submitname=&target=thelen&Search.x=0&Search.y=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://encore.coalliance.org/iii/encore/search/C|Sthelen|Orightresult|U1?lang=eng",
		"items": "multiple"
	}
]
/** END TEST CASES **/
