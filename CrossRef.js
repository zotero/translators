{
	"translatorID": "11645bd1-0420-45c1-badb-53fb41eeb753",
	"label": "CrossRef",
	"creator": "Simon Kornblith",
	"target": "^https?://partneraccess\\.oclc\\.org/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 90,
	"inRepository": true,
	"translatorType": 8,
	"browserSupport": "gcsv",
	"lastUpdated": "2013-10-23 04:49:28"
}

/* CrossRef uses unixref; documentation at http://www.crossref.org/schema/documentation/unixref1.0/unixref.html */
var ns;

/**********************
 * Utilitiy Functions *
 **********************/
var xmlSerializer = new XMLSerializer();
function innerXML(n) {
	return xmlSerializer.serializeToString(n) //outer XML
		.replace(/^[^>]*>|<[^<]*$/g, '');
}

var markupRE = /<(\/?)(\w+)[^<>]*>/gi;
var supportedMarkup = ['i', 'b', 'sub', 'sup', 'span', 'sc'];
var transformMarkup = {
	'scp': {
		open: '<span style="font-variant:small-caps;">',
		close: '</span>'
	}
};
function removeUnsupportedMarkup(text) {
	return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') // Remove CDATA markup
		.replace(markupRE, function(m, close, name) {
			if(supportedMarkup.indexOf(name.toLowerCase()) != -1) {
				return m;
			}
			
			var newMarkup = transformMarkup[name.toLowerCase()]
			if(newMarkup) {
				return close ? newMarkup.close : newMarkup.open;
			}
			
			return '';
		});
}

function detectSearch(items) {
	if(!items) return false;
	
	if(!items.directSearch) {
		Z.debug("CrossRef: directSearch was not true. Will not attempt to search directly.")
		return false;
	}
	
	if(typeof items == 'string' || !items.length) items = [items];
	
	for(var i=0, n=items.length; i<n; i++) {
		if(!items[i]) continue;
		
		if(items[i].DOI && ZU.cleanDOI(items[i].DOI)) return true;
		if(typeof items[i] == 'string' && ZU.cleanDOI(items[i])) return true;
	}
	
	return false;
}

function fixAuthorCapitalization(string) {
	if(typeof string === "string" && string.toUpperCase() === string) {
		string = string.toLowerCase().replace(/\b[a-z]/g, function(m) { return m[0].toUpperCase() });
	}
	return string;
}

function parseCreators(node, item, typeOverrideMap) {
	var contributors = ZU.xpath(node, 'c:contributors/c:organization | c:contributors/c:person_name', ns);
	for(var i in contributors) {
		var creatorXML = contributors[i];
		var creator = {};
		
		var role = creatorXML.getAttribute("contributor_role");
		if(typeOverrideMap && typeOverrideMap[role]) {
			creator.creatorType = typeOverrideMap[role];
		} else if(role === "author" || role === "editor" || role === "translator") {
			creator.creatorType = role;
		} else {
			creator.creatorType = "contributor";
		}
		
		if(creatorXML.nodeName === "organization") {
			creator.fieldMode = 1;
			creator.lastName = creatorXML.textContent;
		} else if(creatorXML.nodeName === "person_name") {
			creator.firstName = fixAuthorCapitalization(ZU.xpathText(creatorXML, 'c:given_name', ns));
			creator.lastName = fixAuthorCapitalization(ZU.xpathText(creatorXML, 'c:surname', ns));
		}
		item.creators.push(creator);
	}
}

function processCrossRef(xmlOutput, queryTracker) {
	// XPath does not give us the ability to use the same XPaths regardless of whether or not
	// there is a namespace, so we add an element to make sure that there will always be a 
	// namespace.
	xmlOutput = xmlOutput.replace(/<\?xml[^>]*\?>/, '$&<xml xmlns="http://www.example.com/">')+"</xml>";
	
	// parse XML
	try {
		var parser = new DOMParser();
		var doc = parser.parseFromString(xmlOutput, "text/xml");
	} catch(e) {
		Zotero.debug(e);
		return false;
	}
	
	// determine appropriate namespace
	ns = {"c":"http://www.crossref.org/xschema/1.1", "x":"http://www.example.com/"};
	var doiRecords = ZU.xpath(doc, '/x:xml/c:doi_records/c:doi_record', ns);
	if(!doiRecords.length) {
		ns.c = "http://www.crossref.org/xschema/1.0";
		doiRecords = ZU.xpath(doc, '/x:xml/c:doi_records/c:doi_record', ns);
		if(!doiRecords.length) {
			// this means that the original document was un-namespaced
			ns.c = "http://www.example.com/";
			doiRecords = ZU.xpath(doc, '/c:xml/c:doi_records/c:doi_record', ns);
			if(!doiRecords.length) {
				Z.debug('No records found');
				return;
			}
		}
	}
	
	var doiRecord;
	for(var i=0, n=doiRecords.length; i<n; i++) {
		doiRecord = doiRecords[i];
		var key = ZU.htmlSpecialChars(doiRecord.getAttribute('key'));
		if(!key || !queryTracker[key]) {
			Z.debug("Got result for " + key + " which was not in input");
			continue;
		}
		
		var query = queryTracker[key];
		delete queryTracker[key];
		
		// ensure this isn't an error
	var errorString = ZU.xpathText(doiRecord, 'c:crossref/c:error', ns);
		if(errorString !== null) {
			Z.debug("Query for " + key + " returned an error: " + errorString);
			var newItem = new Zotero.Item();
			newItem._query = query;
			newItem._status = 'not found';
			newItem.complete();
			continue;
		}
		
		var itemXML, item, refXML, metadataXML, seriesXML;
	if((itemXML = ZU.xpath(doiRecord, 'c:crossref/c:journal', ns)).length) {
			item = new Zotero.Item("journalArticle");
		refXML = ZU.xpath(itemXML, 'c:journal_article', ns);
		metadataXML = ZU.xpath(itemXML, 'c:journal_metadata', ns);
		
		item.publicationTitle = ZU.xpathText(metadataXML, 'c:full_title[1]', ns);
		item.journalAbbreviation = ZU.xpathText(refXML, 'c:abbrev_title[1]', ns);
		item.volume = ZU.xpathText(itemXML, 'c:journal_issue/c:journal_volume/c:volume', ns);
		item.issue = ZU.xpathText(itemXML, 'c:journal_issue/c:journal_volume/c:issue', ns);
			// Sometimes the <issue> tag is not nested inside the volume tag; see 10.1007/BF00938486
			if (!item.issue)
			item.issue = ZU.xpathText(itemXML, 'c:journal_issue/c:issue', ns);
   } else if((itemXML = ZU.xpath(doiRecord, 'c:crossref/c:report-paper', ns)).length) {
			// Report Paper
			// Example: doi: 10.4271/2010-01-0907
			// http://www.crossref.org/openurl/?pid=zter:zter321&url_ver=Z39.88-2004&rft_id=info:doi/10.4271/2010-01-0907&format=unixref&redirect=false
			item = new Zotero.Item("report");
		refXML = ZU.xpath(itemXML, 'c:report-paper_metadata', ns);
			metadataXML = refXML;
			
		item.reportNumber = ZU.xpathText(refXML, 'c:publisher_item/c:item_number', ns);
		item.institution = ZU.xpathText(refXML, 'c:publisher/c:publisher_name', ns);
		item.place = ZU.xpathText(refXML, 'c:publisher/c:publisher_place', ns);
	} else if((itemXML = ZU.xpath(doiRecord, 'c:crossref/c:book', ns)).length) {
			// Book chapter
			// Example: doi: 10.1017/CCOL0521858429.016
			// http://www.crossref.org/openurl/?pid=zter:zter321&url_ver=Z39.88-2004&rft_id=info:doi/10.1017/CCOL0521858429.016&format=unixref&redirect=false
			// Reference book entry
			// Example: doi: 10.1002/14651858.CD002966.pub3
			// http://www.crossref.org/openurl/?pid=zter:zter321&url_ver=Z39.88-2004&rft_id=info:doi/10.1002/14651858.CD002966.pub3&format=unixref&redirect=false
			var bookType = itemXML[0].hasAttribute("book_type") ? itemXML[0].getAttribute("book_type") : null;
			var componentType = itemXML[0].hasAttribute("component_type") ? itemXML[0].getAttribute("component_type") : null;
			
			var isReference = ["reference", "other"].indexOf(bookType) !== -1
					&& ["chapter", "reference_entry"].indexOf(componentType);
			
			if(bookType === "edited_book" || isReference) {
				item = new Zotero.Item("bookSection");
			refXML = ZU.xpath(itemXML, 'c:content_item', ns);
				
				if(isReference) {
					metadataXML = ZU.xpath(itemXML, 'c:book_metadata', ns);
				if(!metadataXML.length) metadataXML = ZU.xpath(itemXML, 'c:book_series_metadata', ns);
					
				item.bookTitle = ZU.xpathText(metadataXML, 'c:titles[1]/c:title[1]', ns);
				item.seriesTitle = ZU.xpathText(metadataXML, 'c:series_metadata/c:titles[1]/c:title[1]', ns);

				var metadataSeriesXML = ZU.xpath(metadataXML, 'c:series_metadata', ns);
					if (metadataSeriesXML.length) parseCreators(metadataSeriesXML, item, {"editor":"seriesEditor"});
				} else {
				metadataXML = ZU.xpath(itemXML, 'c:book_series_metadata', ns);
				if(!metadataXML.length) metadataXML = ZU.xpath(itemXML, 'c:book_metadata', ns);
					
				item.bookTitle = ZU.xpathText(metadataXML, 'c:series_metadata/c:titles[1]/c:title[1]', ns);
				if(!item.bookTitle) item.bookTitle = ZU.xpathText(metadataXML, 'c:titles[1]/c:title[1]', ns);
				}
				
				// Handle book authors
				parseCreators(metadataXML, item, {"author":"bookAuthor"});
			// Book
			} else {
				item = new Zotero.Item("book");
			refXML = ZU.xpath(itemXML, 'c:book_metadata', ns);
				metadataXML = refXML;
			seriesXML = ZU.xpath(refXML, 'c:series_metadata', ns);
			}
			
		item.place = ZU.xpathText(metadataXML, 'c:publisher/c:publisher_place', ns);
	} else if((itemXML = ZU.xpath(doiRecord, 'c:crossref/c:standard', ns)).length) {
			item = new Zotero.Item("report");
		refXML = ZU.xpath(itemXML, 'c:standard_metadata', ns);
		metadataXML = ZU.xpath(itemXML, 'c:standard_metadata', ns);
			
	} else if((itemXML = ZU.xpath(doiRecord, 'c:crossref/c:conference', ns)).length) {
			item = new Zotero.Item("conferencePaper");
		refXML = ZU.xpath(itemXML, 'c:conference_paper', ns);
		metadataXML = ZU.xpath(itemXML, 'c:proceedings_metadata', ns);
		seriesXML = ZU.xpath(metadataXML, 'c:proceedings_metadata', ns);
			
		item.publicationTitle = ZU.xpathText(metadataXML, 'c:publisher/c:proceedings_title', ns);
		item.place = ZU.xpathText(metadataXML, 'c:event_metadata/c:conference_location', ns);
		item.conferenceName = ZU.xpathText(metadataXML, 'c:event_metadata/c:conference_name', ns);
		}
		
	item.ISBN = ZU.xpathText(metadataXML, 'c:isbn', ns);
	item.ISSN = ZU.xpathText(metadataXML, 'c:issn', ns);
	item.publisher = ZU.xpathText(metadataXML, 'c:publisher/c:publisher_name', ns);
	item.edition = ZU.xpathText(metadataXML, 'c:edition_number', ns);
	if(!item.volume) item.volume = ZU.xpathText(metadataXML, 'c:volume', ns);
		
		parseCreators(refXML, item, "author");
		
		if(seriesXML && seriesXML.length) {
			parseCreators(refXML, item, {"editor":"seriesEditor"});
		item.seriesNumber = ZU.xpathText(seriesXML, 'c:series_number', ns);
		}
		
	var pubDateNode = ZU.xpath(refXML, 'c:publication_date', ns);
	if(!pubDateNode) ZU.xpath(metadataXML, 'c:publication_date', ns);
		
		if(pubDateNode.length) {
		var year = ZU.xpathText(pubDateNode[0], 'c:year', ns);
		var month = ZU.xpathText(pubDateNode[0], 'c:month', ns);
		var day = ZU.xpathText(pubDateNode[0], 'c:day', ns);
			
			if(year) {
				if(month) {
					if(day) {
						item.date = year+"-"+month+"-"+day;
					} else {
						item.date = month+"/"+year
					}
				} else {
					item.date = year;
				}
			}
		}
		
	var pages = ZU.xpath(refXML, 'c:pages[1]', ns);
		if(pages.length) {
		item.pages = ZU.xpathText(pages, 'c:first_page[1]', ns);
		var lastPage = ZU.xpathText(pages, 'c:last_page[1]', ns);
			if(lastPage) item.pages += "-"+lastPage;
		}
		
	item.DOI = ZU.xpathText(refXML, 'c:doi_data/c:doi', ns);
	item.url = ZU.xpathText(refXML, 'c:doi_data/c:resource', ns);
	var title = ZU.xpath(refXML, 'c:titles[1]/c:title[1]', ns)[0];
		if(title) {
			item.title = ZU.trimInternal(
				removeUnsupportedMarkup(innerXML(title))
			);
		var subtitle = ZU.xpath(refXML, 'c:titles[1]/c:subtitle[1]', ns)[0];
			if(subtitle) {
				item.title += ': ' + ZU.trimInternal(
					removeUnsupportedMarkup(innerXML(subtitle))
				);
			}
		}
		//Zotero.debug(JSON.stringify(item, null, 4));
		
		item._query = query;
		item._status = 'success';
		item.complete();
	}
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

function doSearch(items) {
	var query = filterQuery(items);
	if(!query.length) return;
	
	var urlPrefix = 'http://doi.crossref.org/servlet/query'
		+ '?usr=zter&pwd=zter321&format=unixref&qdata='
		+ encodeURIComponent('<?xml version="1.0" encoding="UTF-8"?>'
			+ '<query_batch version="2.0" xmlns="http://www.crossref.org/qschema/2.0"'
				+ ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
			+ '<head><email_address>ckoscher@crossref.org</email_address>'
			+ '<doi_batch_id>trackingid1</doi_batch_id></head>'
			+ '<body>');
	var urlSuffix = encodeURIComponent('</body></query_batch>');
	var maxUrlLength = 2048;
	var maxItems = 10;
	
	var urls = [],
		url = urlPrefix;
		itemCount = 0,
		queryTracker = {};
	for(var i=0, n=query.length; i<n; i++) {
		var doi = ZU.htmlSpecialChars(ZU.cleanDOI(query[i].DOI || query[i]));
		if(queryTracker[doi]) continue; //don't query twice
		queryTracker[doi] = query[i];
		
		var querySubstring = encodeURIComponent(
			'<query key="' + doi + '" expanded-results="true">'
			+ '<doi>' + doi + '</doi></query>');
		
		//if we can fit more dois into query, keep adding
		if(url == urlPrefix
			|| (itemCount < maxItems
				&& (url.length + urlSuffix.length + querySubstring.length) <= maxUrlLength)) {
			url += querySubstring;
			itemCount++;
			continue;
		}
		
		//otherwise, this query is full, start a fresh one
		urls.push(url + urlSuffix);
		itemCount = 1;
		url = urlPrefix + querySubstring;
	}
	
	if(url != urlPrefix) urls.push(url + urlSuffix);
	
	ZU.doGet(urls, function(responseText) {
		processCrossRef(responseText, queryTracker);
	}, function() {
		//take care of queries that did not get results
		for(var q in queryTracker) {
			Z.debug("No result for " + q);
			var newItem = new Zotero.Item();
			newItem._query = queryTracker[q];
			newItem._status = 'not found';
			newItem.complete();
		}
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "search",
		"input": {
			"DOI": "10.1017/CCOL0521858429.016"
		},
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"creatorType": "editor",
						"firstName": "John",
						"lastName": "Rodden"
					},
					{
						"creatorType": "author",
						"firstName": "Christopher",
						"lastName": "Hitchens"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"bookTitle": "The Cambridge Companion to George Orwell",
				"place": "Cambridge",
				"ISBN": "0521858429, 9780521858427, 0521675073, 9780521675079",
				"publisher": "Cambridge University Press",
				"pages": "201-207",
				"DOI": "10.1017/CCOL0521858429.016",
				"url": "http://cco.cambridge.org/extract?id=ccol0521858429_CCOL0521858429A016",
				"title": "Why Orwell still matters",
				"libraryCatalog": "CrossRef"
			}
		]
	}
]
/** END TEST CASES **/