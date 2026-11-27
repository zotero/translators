{
	"translatorID": "856d17bd-14b5-4a29-9565-6d3abd9fb077",
	"label": "Schema.org",
	"creator": "Gergő Tisza",
	"target": "",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 300,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2017-05-25 14:20:52"
}

/*
 ***** BEGIN LICENSE BLOCK *****

 Copyright © 2017 Gergő Tisza
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

/**
 * Zotero translator for web pages containing Schema.org metadata.
 * Schema.org is an embedded structured metadata standard focused on search, promoted by Google.
 * @see http://schema.org/
 * @file
 */

/**
 * List of Schema.org schemas which are useful for citing.
 * @type {Array}
 */
var SCHEMAS = {
	Article: 'newspaperArticle'
};

// ***** Entry points *****

function detectWeb( doc, url ) {
	var schemas = getJsonLd( doc );
	if ( schemas.length === 1 ) {
		var type = schemas[0]['@type'];
		return SCHEMAS[type];
	} else if ( schemas.length > 1 ) {
		return 'multiple';
	}
	return null;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	//TODO: adjust the xpath
	var rows = ZU.xpath(doc, '//a[contains(@href, "/article/")]');
	for (var i=0; i<rows.length; i++) {
		//TODO: check and maybe adjust
		var href = rows[i].href;
		//TODO: check and maybe adjust
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	var schemas = getJsonLd( doc );
	if ( schemas.length > 1 ) {
		// ????
	} else {
		return processSchema( schemas[0], doc );
	}
}

// ***** Helper functions *****

/**
 * Look for Schema.org metadata encoded as JSON-LD in the document
 * @param {element} doc The document (or node) to get the data from.
 * @param {bool} firstOnly Only return the first object in case the document has multiple ones
 * @return Object[] An array of top-level Schema.org nodes (the
 */
function getJsonLd( doc, firstOnly ) {
	var elements = Zotero.Utilities.xpath( doc, '//script[@type="application/ld+json"]' );
	var schemas = [];
	for ( var i=0; i < elements.length; i++ ) {
		var jsonld = Zotero.Utilities.xpathText( elements[i], '.' );
		try {
			var data = JSON.parse( jsonld );
		} catch ( e ) {
			Zotero.debug( 'Error while parsing JSON-LD:' );
			Zotero.debug( e );
			continue;
		}

		if (
			data['@context'] === 'http://schema.org'
			&& data['@type'] in SCHEMAS
		) {
			if ( firstOnly ) {
				return [ data ];
			} else {
				schemas.push( data );
			}
		}
	}
	return schemas;
}

// TODO: microdata & RDFa extraction

/**
 * Process a single metadata object.
 * @param {element} doc The main document (for attaching).
 * @param {Object} schema A Schema.org schema, in the same format as an item in
 * the @graph array of the JSON-LD object.
 * @return {Zotero.Item}
 */
function processSchema( schema, doc ) {
	var type = schema['@type'];
	var item = new Zotero.Item( SCHEMAS[type] );
	switch ( type ) {
		case 'Article':
			item.date = schema.datePublished;
			//item.??? = schema.dateModified;
			item.creators = getStringList( schema.author ).map( function ( name ) {
				return Zotero.Utilities.cleanAuthor( name, 'author' );
			} );
			if ( schema.publisher ) {
				item.publicationTitle = schema.publisher.name;
			}
			item.url = schema.url;
			item.title = schema.headline;
			item.attachments.push( {
				document: doc,
				title: 'Snapshot'
			} );
			item.complete();
		break;
	}
}

function getStringList( objectOrString ) {
	if ( typeof objectOrString === 'string' ) {
		return [ objectOrString ];
	} else if ( objectOrString['@list'] ) {
		var list = [];
		for ( var i=0; i < objectOrString['@list'].length; i++ ) {
			list.push( objectOrString['@list'][i] );
		}
		return list;
	}
	return [];
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.bbc.com/news/magazine-15335899",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Spain's stolen babies and the families who lived a lie",
				"creators": [
					{
						"firstName": "Katya",
						"lastName": "Adler",
						"creatorType": "author"
					}
				],
				"date": "2011-10-18T10:31:45+01:00",
				"publicationTitle": "BBC News",
				"libraryCatalog": "Schema.org",
				"url": "http://www.bbc.com/news/magazine-15335899",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.bbc.com/news/magazine-36287752",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "'I found my dad on Facebook'",
				"creators": [
					{
						"firstName": "Abdirahim",
						"lastName": "Saeed",
						"creatorType": "author"
					},
					{
						"firstName": "Deirdre",
						"lastName": "Finnerty",
						"creatorType": "author"
					}
				],
				"date": "2016-08-17T00:49:43+01:00",
				"publicationTitle": "BBC News",
				"libraryCatalog": "Schema.org",
				"url": "http://www.bbc.com/news/magazine-36287752",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/