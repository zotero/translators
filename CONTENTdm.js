{
	"translatorID": "f715a5a1-c362-47cf-b736-2cb2c882b852",
	"label": "CONTENTdm",
	"creator": "Emma Reisz",
	"target": "/cdm/|/cdm4/",
	"minVersion": "3.0.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2015-11-02 10:55:08"
}

/**
	***** BEGIN LICENSE BLOCK *****

	CONTENTdm translator; Copyright © 2015 Emma Reisz
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

/*
  ContentDM is an OCLC product used by several hundred libraries, archives and museums.
  CDM may be hosted by OCLC or by the customer.
  CDM includes an API which calls metadata as XML or JSON, but customers may disable it.
  By preference, this translator scrapes XML from an API query (slow)
  and from a webpage as a fallback (quick but vulnerable to a redesign).
  XML is preferred to JSON because it allows code to be shared with the webscraper.
  The translator will also scrape some data from legacy CDM webpages (version < 6).
  Older CDM versions had no standardised field names so comprehensive scraping is unrealistic.
*/

function detectWeb( doc, url ) {
  if ( !url.match( "/cdm/" ) && !url.match( "/cdm4/" ) ) return;
  if ( url.match( "/cdm/search/" ) ) return "multiple";
  else if ( url.match( "/cdm/landingpage" ) || !url.substring( url.indexOf( '/cdm/' ) + 5 ) ) return "webpage";
  else if ( url.match( "/cdm/fullbrowser" ) ) { // Pages without item metadata
	originatingItem = ZU.xpath( doc, '//link[@rel="canonical"]' );
	if ( originatingItem && originatingItem[ 0 ].href ) return "document"; // Slow to scrape again for item type
	else return "";
  }
  return ( function() {
	var itemType = fetchXPathText( doc, '//*[@id="metadata_type"]' );
	if ( !itemType ) itemType = fetchXPathText( doc, '//*[@id="metadata_object_type"]' );
	switch ( itemType ) {
	  case "Image":
	  case "Photograph":
	  case "Engraved portrait":
	  case "Negative":
		return 'artwork';
	  case "Text":
		return 'manuscript';
	  default:
		return 'document';
	}
  }() );
}

function fetchXPathText( doc, xpath ) { // Removes excess whitespace & breaks, respaces items overtrimmed by trimInternal.
  if ( ZU.xpathText( doc, xpath ) ) {
	return ZU.trimInternal( ZU.xpathText( doc, xpath ).replace( /^\s+|\s+$|\;$|\,$/g, '' ).replace( /([a-z])([A-Z])/g, '$1\. $2' ) );
  } else return;
}

function fetchXPathValue( doc, xpath ) {
  if ( ZU.xpath( doc, xpath )[ 0 ] ) return ZU.xpath( doc, xpath )[ 0 ].value;
  else return;
}

function fetchXmlUrl( doc, url ) { // Fetches xml urls if using OCLC server (as constructor)
  var serverID = new RegExp( "/collection\/p([A-Z0-9]+)coll", "i" );
  var serverID2 = new RegExp( "//cdm([0-9]+).contentdm.oclc.org" );
  var collectionID = new RegExp( "/collection\/([A-Z0-9]+)\/", "i" );
  var objectID = new RegExp( "/id\/([A-Z0-9]+)", "i" );
  var itemID = new RegExp( "/show\/([A-Z0-9]+)", "i" );
  var objectUrlHttp = fetchXPathValue( doc, '//input[@id="cdm_objectRefUrl"]' );
  var itemUrlHttp = fetchXPathValue( doc, '//input[@id="cdm_newRefUrl"]' );
  var server;
  var xmlQueryUrl;
  if ( objectUrlHttp ) url = objectUrlHttp; // Use object page as primary even if item page is present
  else if ( itemUrlHttp ) {
	url = itemUrlHttp;
	itemUrlHttp = "";
  } // Use item page as primary if no object page is present
  if ( url.match( serverID ) ) server = url.match( serverID )[ 1 ];
  else if ( url.match( serverID2 ) ) server = url.match( serverID2 )[ 1 ];
  if ( server && url.match( collectionID ) && url.match( objectID ) ) {
	xmlQueryUrl = "https://server" + server + ".contentdm.oclc.org/dmwebservices/index.php?q=dmGetItemInfo/" + url.match( collectionID )[ 1 ] + "/";
	this.object = xmlQueryUrl + url.match( objectID )[ 1 ] + "/show/xml";
  } else this.object = "";
  if ( itemUrlHttp ) this.item = xmlQueryUrl + itemUrlHttp.match( objectID )[ 1 ] + "/show/xml";
  else if ( this.object && url.match( itemID ) ) this.item = xmlQueryUrl + url.match( itemID )[ 1 ] + "/show/xml";
  else this.item = "";
}

function scrape( doc, url ) {
  var item = new Zotero.Item( detectWeb( doc, url ) );
  url = doc.documentURI;
  var xmlUrl = new fetchXmlUrl( doc, url );

  /* Mappings for XML and Web (CDM>5)
   * The scraper only scrapes fields specified in the mapping table.
   * Enter mappings as [zoteroField, CDMfield];
   * note CDM allows customers to configure fields
   * so these are inconsistently implemented.
   */
  var mapping = [
			[ 'title', 'title' ],
			[ 'creator', 'creato' ],
			[ 'creator2', 'creata' ],
			[ 'contributor', 'contri' ],
			[ 'abstractNote', 'descri' ],
			[ 'language', 'langua' ],
			[ 'language2', 'languag' ],
			[ 'archiveLocation', 'identi' ], // On CDM this is 'Identifier'
			[ 'archiveLocation2', 'locala' ],
			[ 'archive', 'source' ],
			[ 'collection', 'collec' ],
			[ 'collection2', 'relati' ],
			[ 'publisher', 'publis' ], // Omitted by manuscript item type
			[ 'rights', 'rights' ],
			[ 'subject', 'subject' ], // Scraped into tags
			[ 'subject2', 'subjea' ],
			[ 'subject3', 'subjeb' ],
			[ 'subject4', 'subjec' ],
			[ 'person', 'person' ],
			[ 'medium', 'type' ],
			[ 'format', 'format' ],
			[ 'date', 'date' ],
			[ 'date2', 'dated' ],
			[ 'place', 'covera' ],
			[ 'place2', 'coverab' ],
			[ 'period', 'period' ],
		  ];

  /* Mappings for Web (CDM<6)
   * CDM < 6 does not provide standard field names.
   * The scraper scrapes the whole display table,
   * and converts displayed fieldnames to camelCase
   * to maximise the chance of a Zotero match.
   * Hardcode additional matches here as [zoteroField, displayedField];
   */

  var legacyMapping = [ // Enter mappings as [zoteroField,camelizedCDMField]
			[ "place", "town" ],
			[ "abstractNote", "description" ],
			[ "subject2", "keywords" ],
			[ "subject3", "subjectKeywords" ],
			[ "date2", "workDate" ],
			[ "creator", "bookCreator" ],
			[ "rights", "rights--UsageStatement" ],
			[ "contributor2", "photographer" ],
			[ "title2", "bookTitle" ],
		  ];

  var docTitle = ( function() {
	if ( doc.title == "ContentDM" ) return url.substring( url.indexOf( '://' ) + 3, url.indexOf( '/cdm/' ) ).replace( /^\s+|\s+$/g, '' );
	else return doc.title.replace( /^\s+|\s+$/g, '' );
  }() );

  item.libraryCatalog = ( function() {
	var catalog = fetchXPathText( doc, '//*[@id="breadcrumb_top_content"]/a[2]' );
	if ( catalog ) return catalog;
	else if ( docTitle.match( '::' ) ) return docTitle.substring( doc.title.indexOf( '::' ) + 3 ); // Fallback: use second part of webpage title
	else return docTitle;
  }() );

  item.websiteType = "ContentDM";
  item.attachments.push( {
	title: "Snapshot of CONTENTdm record",
	mimeType: "text/html",
	document: doc
  } );
  item.url = url;
  //  item.attachments.push({url:url, title: "Link to Record", mimeType: "text/html", snapshot: false}); // optional; url set instead
  attachPDF( doc, item );

  ZU.doGet( xmlUrl.object, function( text ) {
	// Z.debug(text);                                           // View primary XML doc
	var scrapeMode;
	if ( !xmlUrl.object || !text || text.match( "The web server is not configured" ) ) scrapeMode = "Web";
	else { // Scrape from API XML
	  var docxml = ( new DOMParser() ).parseFromString( text, "text/xml" );
	  if ( xmlUrl.item ) { // Scraping from two XML docs
		ZU.doGet( xmlUrl.item, function( text ) {
		  var doc2xml = ( new DOMParser() ).parseFromString( text, "text/xml" );
		  // Z.debug(text);                                   // View secondary XML doc
		  scrapeToItem( docxml, item, url, docTitle, mapping, "xml", doc2xml );
		  item.complete();
		} );
	  } else { // Scraping from a single XML doc
		scrapeToItem( docxml, item, url, docTitle, mapping, "xml" );
		item.complete();
	  }
	  return; // Return from the ZU.doGet callback after XML scrape
	}
	if ( scrapeMode == "Web" ) {
	  var headerXPath;
	  var contentXPath;
	  var offset;
	  var xhttp = new XMLHttpRequest();
	  xhttp.open( "GET", url, false );
	  xhttp.send();
	  fullSource = xhttp.responseText;

	  if ( doc.documentElement.innerHTML.match( "CONTENTdm Version" ) ) { // Web scrape for CDM version 6+;
		scrapeToItem( doc, item, url, docTitle, mapping, "web" );
	  }

	  else if ( fullSource.match( "CONTENTdm Version 5" ) ) { // Web scrape for CDM Version 5
		headerXPath = '//table/tbody/tr/td/table/tbody/tr/td/table[2]/tbody/tr[2]/td/table/tbody/tr[2]/td/table/tbody/tr/td[1]';
		contentXPath = '//table/tbody/tr/td/table/tbody/tr/td/table[2]/tbody/tr[2]/td/table/tbody/tr[2]/td/table/tbody/tr/td[2]';
		offset = 1;
		legacyScrapeToItem( doc, item, headerXPath, contentXPath, offset, legacyMapping, docTitle, url );
	  }

	  else if ( fullSource.match( "CONTENTdm" ) ) { // Web scrape for CDM Version 4 or below
		headerXPath = '//div/div[3]/table[2]/tbody/tr/td[1]';
		contentXPath = '//div/div[3]/table[2]/tbody/tr/td[2]';
		offset = 0;
		legacyScrapeToItem( doc, item, headerXPath, contentXPath, offset, legacyMapping, docTitle, url );
	  }

	  item.complete();

	  return; // Return from the ZU.doGet callback after Web scrape
	}
  } );
  return '';
}

function legacyScrapeToItem( doc, item, headerXPath, contentXPath, offset, mapping, docTitle, url ) {
  var headers = ZU.xpath( doc, headerXPath ); // Scrapes the whole metadata table and looks for matches after.
  var contents = ZU.xpath( doc, contentXPath );
  for ( i = 0; i < contents.length; i++ ) {
	var header;
	var content;
	j = i + offset;
	if ( headers[ j ].textContent ) {
	  header = headers[ j ].textContent;
	  header = camelize( header );
	}
	if ( contents[ i ].textContent ) content = contents[ i ].textContent;
	item[ header ] = content;
  }
  for ( var i in mapping ) item[ mapping[ i ][ 0 ] ] = item[ mapping[ i ][ 1 ] ];
  tidyItem( item );
  if ( !item.title ) item.title = getTitle( doc, docTitle, url );

  function camelize( str ) {
	return str.replace( /(?:^\w|[A-Z]|\b\w)/g, function( letter, index ) {
	  return index === 0 ? letter.toLowerCase() : letter.toUpperCase();
	} ).replace( /\s+/g, '' );
  }
}

function scrapeToItem( doc, item, url, docTitle, mapping, prefixes, doc2 ) {
  var info = []; // Scrapes only fields named in the mapping array.
  var xpath;
  var itemText;
  for ( var i in mapping ) {
	var thisField = [];
	var field = mapping[ i ][ 1 ];
	if ( prefixes == "web" ) xpath = {
	  object: "//*[@id='metadata_object_" + field + "']",
	  item: "//*[@id='metadata_" + field + "']"
	};
	else if ( prefixes == "xml" ) xpath = {
	  object: "//" + field,
	  item: ""
	};
	thisField = [ mapping[ i ][ 0 ], xpath.object, xpath.item ];
	info.push( thisField );
  }
  for ( var j in info ) {
	var text = fetchXPathText( doc, info[ j ][ 1 ] );
	if ( !doc2 ) { // Scrape from single document
	  if ( info[ j ][ 0 ] == "title" && !text ) text = getTitle( doc, docTitle, url );
	  if ( info[ j ][ 2 ] ) itemText = fetchXPathText( doc, info[ j ][ 2 ] );
	} else { // Scrape from two documents
	  itemText = fetchXPathText( doc2, info[ j ][ 1 ] );
	  if ( info[ j ][ 0 ] == "title" && !itemText ) itemText = getTitle( doc2, docTitle, url );
	}
	if ( text != itemText ) text = [ itemText, text ].filter( function( val ) {
	  return val;
	} ).join( '. ' );
	item[ info[ j ][ 0 ] ] = text;
  }
  tidyItem( item );
  return item;
}

function tidyItem( item ) {
  mergeFields( item );
  replaceFields( item );
  cleanAuthor( item );
  item.tags = []; //Tags must be in an array
  item.tags = item.subject.replace( /\([^)]*\)/g, '' ).split( /[.;]/ );
  for ( var k in item.tags ) item.tags[ k ] = ZU.trimInternal( item.tags[ k ].replace( /^\s+|\s+$/g, '' ).replace( /\s+\,/g, ',' ) );
  return item;
}

function mergeFields( item ) {
  var merges = [
		  [ 'subject', 'subject2', 'subject3', 'subject4', 'person' ], // List all the sets of fields to be combined, Zotero field first
		  [ 'archive', 'collection', 'collection2' ],
		  [ 'place', 'place2' ],
		  [ 'creator', 'creator2' ],
		  [ 'archiveLocation', 'archiveLocation2' ],
		  [ 'medium', 'format' ],
		  [ 'contributor', 'contributor2' ],
		];
  for ( var i in merges ) {
	var mergeArray = [];
	for ( var j in merges[ i ] ) {
	  mergeArray.push( item[ merges[ i ][ j ] ] ); // Arrays are easier to filter
	  if ( j > 0 ) item[ merges[ i ][ j ] ] = "";
	}
	item[ merges[ i ][ 0 ] ] = mergeArray.filter( function( val ) {
	  return val;
	} ).join( '; ' );
  }
}

function replaceFields( item ) {
  var replace = [
		  [ 'date', 'date2', 'period' ], // List all the sets of fields to be checked in order of preference, Zotero field first
		  [ 'language', 'language2' ],
		  [ 'title', 'title2' ],
		];
  for ( var i in replace ) {
	for ( var j in replace[ i ] ) {
	  if ( item[ replace[ i ][ 0 ] ] ) break;
	  else {
		item[ replace[ i ][ 0 ] ] = item[ replace[ i ][ j ] ];
		if ( j > 0 ) item[ replace[ i ][ j ] ] = "";
	  }
	}
  }
}

function getTitle( doc, docTitle, url ) {
  var title;
  if ( docTitle.match( "::" ) ) docTitle = docTitle.substring( 0, docTitle.indexOf( "::" ) );
  if ( url.match( "/cdm/landingpage" ) ) title = docTitle + ": About this collection";
  else title = docTitle; // Fallback: first part of webpage title
  return title.replace( /^\s+|\s+$/g, '' );
}

function cleanAuthor( item ) {
  var authorType = [ "creator", "contributor" ]; // Author field names in the mapping table must be Zotero author types
  for ( var i in authorType ) {
	if ( item[ authorType[ i ] ] ) {
	  fetchedAuthor = item[ authorType[ i ] ].replace( /\([^)]*\)|\[[^\]]*\]|\;$/g, '' ).replace( /, Sir |, Dr /g, ', ' ); // Fetch and remove parentheses and honorifics
	  var nameArray = [];
	  item[ authorType[ i ] ] = "";
	  nameArray = fetchedAuthor.split( ";" ); // Split authors at semicolon and push into an array
	  for ( var j in nameArray ) item.creators.push( ZU.cleanAuthor( nameArray[ j ], authorType[ i ], 1 ) );
	}
  }
  for ( var k in item.creators ) {
	if ( !item.creators[ k ].firstName ) item.creators[ k ].fieldMode = 1;
  }
}

function attachPDF( doc, item ) {
  var pdfPath = '//embed';
  var pdfScrape = ZU.xpath( doc, pdfPath );
  var pdfObject = pdfScrape[ 0 ]; // Could iterate looking for multiple attachments
  var pdfTitle;
  if ( pdfObject && pdfObject.src ) { // Can't simply test for .src
	var itemTitle = fetchXPathText( doc, '//*[@id="metadata_title"]' );
	if ( itemTitle ) pdfTitle = "Attachment: " + itemTitle;
	else pdfTitle = "Attachment";
	item.attachments.push( {
	  url: pdfObject.src,
	  title: pdfTitle,
	  mimeType: "application/pdf"
	} );
  }
}

function doWeb( doc, url ) {
  if ( detectWeb( doc, url ) == "multiple" ) { // If on a multiple result page, call Zotero.selectItems
	var titlePath = '//div/ul/li/ul/li[2]/div/a';
	var items = {};
	var articles = [];
	var titles = ZU.xpath( doc, titlePath );
	if ( titles.length < 1 ) return false; // Null search results will be ignored
	for ( var i in titles ) {
	  items[ titles[ i ].href ] = ZU.trimInternal( titles[ i ].textContent );
	}
	Zotero.selectItems( items, function( items ) {
	  if ( !items ) return true;
	  for ( var i in items ) {
		articles.push( i );
	  }
	  ZU.processDocuments( articles, scrape );
	} );

  } else if ( url.match( "/cdm/fullbrowser" ) ) {
	var originatingItem = ZU.xpath( doc, '//link[@rel="canonical"]' ); // Look for link to originating item
	if ( originatingItem[ 0 ] && originatingItem[ 0 ].href ) {
	  url = originatingItem[ 0 ].href;
	  ZU.processDocuments( url, scrape );
	} else return false;

  } else if ( ZU.xpath( doc, '//input[@id="cdm_newRefUrl"]' ) ) {
	var realItem = ZU.xpath( doc, '//input[@id="cdm_newRefUrl"]' ); // CDM pages can display info for other items; look for real url of item
	if ( realItem[ 0 ] && realItem[ 0 ].value ) {
	  url = realItem[ 0 ].value;
	  ZU.processDocuments( url, scrape );
	} else scrape( doc, url );

  } else {
	scrape( doc, url );
  }
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://cdm15979.contentdm.oclc.org/cdm/compoundobject/collection/p15979coll3/id/2419",
		"items": [
			{
				"itemType": "manuscript",
				"title": "MS.15.1.2.000. Sir Robert Hart Diary: Volume 02: February 1855-July 1855",
				"creators": [
					{
						"firstName": "Robert",
						"lastName": "Hart",
						"creatorType": "creator"
					},
					{
						"lastName": "Harvard University Asia Center",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"firstName": "Emma",
						"lastName": "Reisz",
						"creatorType": "contributor"
					},
					{
						"firstName": "Queen's University Belfast",
						"lastName": "Special Collections & Archives",
						"creatorType": "contributor"
					}
				],
				"date": "1855-07-29",
				"abstractNote": "Front Cover, outer. Personal Diary of Sir Robert Hart (1835-1911). Transcription is reproduced by permission of the Harvard University Asia Center, edited Queen's University Belfast 2011.",
				"archive": "MS 15/1; Sir Robert Hart Collection MS 15",
				"archiveLocation": "MS 15/1/2/000. MS 15/1/2",
				"language": "eng",
				"libraryCatalog": "Sir Robert Hart Collection: Diaries",
				"rights": "Reproduction of these materials in any format for any purpose other than personal research and study may constitute a violation of CDPA 1988 and infringement of rights associated with the materials. Please contact us for permissions information at specialcollections@qub.ac.uk",
				"shortTitle": "MS.15.1.2.000. Sir Robert Hart Diary",
				"url": "http://cdm15979.contentdm.oclc.org/cdm/ref/collection/p15979coll3/id/2233",
				"attachments": [
					{
						"title": "Snapshot of CONTENTdm record",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"China"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://digital.ncdcr.gov/cdm/ref/collection/p16062coll24/id/9739",
		"items": [
			{
				"itemType": "document",
				"title": "SR_GP_Correspondence_Turner_James_1805_Not. Dated_001. Governors' Papers: James Turner, Correspondence, 1805",
				"creators": [
					{
						"firstName": "Thomas",
						"lastName": "Brown",
						"creatorType": "creator"
					},
					{
						"firstName": "James",
						"lastName": "Miller",
						"creatorType": "creator"
					},
					{
						"firstName": "John",
						"lastName": "Reinhardt",
						"creatorType": "creator"
					},
					{
						"firstName": "James",
						"lastName": "Rhodes",
						"creatorType": "creator"
					}
				],
				"date": "1805",
				"abstractNote": "James Turner (1766-1824) was the twelfth governor of North Carolina. In 1802, John B. Ashe was elected to Governor but died before entering office. The legislative then elected Turner for three consecutive terms (1803-1805). He resigned his governorship in 1805 to join the United States Senate where he continued until bad health forced him out of politics in 1816.",
				"archive": "Governors' Papers. James Turner. State Archives of North Carolina",
				"archiveLocation": "G.P. 26-28, James Turner",
				"language": "English",
				"libraryCatalog": "Governors Papers, Historical",
				"rights": "This item is provided courtesy of the State Archives of North Carolina and is a public record according to G.S.132.",
				"shortTitle": "SR_GP_Correspondence_Turner_James_1805_Not. Dated_001. Governors' Papers",
				"url": "http://digital.ncdcr.gov/cdm/ref/collection/p16062coll24/id/9728",
				"attachments": [
					{
						"title": "Snapshot of CONTENTdm record",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"Governors--North Carolina",
					"Governors--North Carolina--Correspondence",
					"North Carolina--History",
					"North Carolina--History--1775-1865",
					"North Carolina--Politics and government",
					"North Carolina--Politics and government--1775-1865",
					"Turner, James, 1766-1824",
					"Turner, James, 1766-1824--Correspondence",
					"United States--Politics and government"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://digitalcollections.missouristate.edu/cdm4/item_viewer.php?CISOROOT=%2FFruitful&CISOPTR=295&DMSCALE=25&DMWIDTH=600&DMHEIGHT=600&DMMODE=viewer&DMFULL=0&DMX=189&DMY=77&DMTEXT=&DMTHUMB=1&REC=1&DMROTATE=0&x=415&y=166",
		"items": [
			{
				"itemType": "document",
				"title": "Peaches sprayed for curculio. Self boiled lime sulfur. Curculio free-392. Curculio-11. Dunn Orchard, Koshkonong",
				"creators": [],
				"date": "1911, August 1",
				"libraryCatalog": "Digital Collections : Item Viewer",
				"url": "http://digitalcollections.missouristate.edu/cdm4/item_viewer.php?CISOROOT=%2FFruitful&CISOPTR=295&DMSCALE=25&DMWIDTH=600&DMHEIGHT=600&DMMODE=viewer&DMFULL=0&DMX=189&DMY=77&DMTEXT=&DMTHUMB=1&REC=1&DMROTATE=0&x=415&y=166",
				"attachments": [
					{
						"title": "Snapshot of CONTENTdm record",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"Spraying & Dusting Experiments",
					"curculio, lime sulfur, sprayed"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/