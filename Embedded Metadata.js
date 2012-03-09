{
	"translatorID": "951c027d-74ac-47d4-a107-9c3069ab7b48",
	"label": "Embedded Metadata",
	"creator": "Simon Kornblith and Avram Lyon",
	"target": "",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 400,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-03-03 19:29:30"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2011 Avram Lyon and the Center for History and New Media
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

var HIGHWIRE_MAPPINGS = {
	"citation_title":"title",
	"citation_publication_date":"date",	//perhaps this is still used in some old implementations
	"citation_date":"date",
	"citation_journal_title":"publicationTitle",
	"citation_journal_abbrev":"journalAbbreviation",
	"citation_book_title":"bookTitle",
	"citation_volume":"volume",
	"citation_issue":"issue",
	"citation_conference_title":"conferenceName",
	"citation_dissertation_institution":"university",
	"citation_technical_report_institution":"institution",
	"citation_technical_report_number":"number",
	"citation_publisher":"publisher",
	"citation_isbn":"ISBN",
	"citation_abstract":"abstractNote",
	"citation_doi":"DOI",
	"citation_public_url":"url",
	"citation_language":"language"

/* the following are handled separately in addHighwireMetadata()
	"citation_author"
	"citation_authors"
	"citation_firstpage"
	"citation_lastpage"
	"citation_issn"
	"citation_eIssn"
	"citation_pdf_url"
*/
};

// Maps actual prefix in use to URI
var _prefixes = {
	"dc":"http://purl.org/dc/terms/",
	"dcterms":"http://purl.org/dc/terms/",
	"prism":"http://prismstandard.org/namespaces/1.2/basic/",
	"foaf":"http://xmlns.com/foaf/0.1/",
	"eprint":"http://purl.org/eprint/terms/",
	"eprints":"http://purl.org/eprint/terms/",
	"og":"http://ogp.me/ns#",
	"article":"http://ogp.me/ns/article#",
	"book":"http://ogp.me/ns/book#"
};

var _rdfPresent = false,
	_haveItem = false,
	_itemType;

var CUSTOM_FIELD_MAPPINGS;

function addCustomFields(customFields) {
	CUSTOM_FIELD_MAPPINGS = customFields;
}

function getPrefixes(doc) {
	var links = doc.getElementsByTagName("link");
	for(var i=0; i<links.length; i++) {
		// Look for the schema's URI in our known schemata
		var rel = links[i].getAttribute("rel");
		if(rel) {
			var matches = rel.match(/^schema\.([a-zA-Z]+)/);
			if(matches) {
				//Zotero.debug("Prefix '" + matches[1].toLowerCase() +"' => '" + links[i].getAttribute("href") + "'");
				_prefixes[matches[1].toLowerCase()] = links[i].getAttribute("href");
			}
		}
	}
}

function processFields(doc, item, fieldMap) {
	for(var metaName in fieldMap) {
		var zoteroName = fieldMap[metaName];
		item[zoteroName] = ZU.xpathText(doc, '//meta[@name="'+metaName+'"]/@content');
	}
}

function completeItem(doc, newItem) {
	addHighwireMetadata(doc, newItem);

	if(CUSTOM_FIELD_MAPPINGS) {
		processFields(doc, newItem, CUSTOM_FIELD_MAPPINGS);
	}

	newItem.complete();
}

function detectWeb(doc, url) {
	getPrefixes(doc);

	var metaTags = doc.getElementsByTagName("meta");
	for(var i=0; i<metaTags.length; i++) {
		// Two formats allowed:
		// 	<meta name="..." content="..." />
		//	<meta property="..." content="..." />
		// The first is more common; the second is recommended by Facebook
		// for their OpenGraph vocabulary
		var tag = metaTags[i].getAttribute("name");
		if (!tag) tag = metaTags[i].getAttribute("property");
		var value = metaTags[i].getAttribute("content");
		if(!tag || !value) continue;
		// We allow three delimiters between the namespace and the property
		var delimIndex = tag.indexOf('.');
		if(delimIndex === -1) delimIndex = tag.indexOf(':');
		if(delimIndex === -1) delimIndex = tag.indexOf('_');
		if(delimIndex === -1) continue;
		
		var prefix = tag.substr(0, delimIndex).toLowerCase();
		tag = tag.toLowerCase();
		var prop = tag[delimIndex+1].toLowerCase()+tag.substr(delimIndex+2);

		var schema = _prefixes[prefix];
		if(schema) {
			_rdfPresent = true;
			// If we have PRISM or eprints data, don't use the generic webpage icon
			if (!_itemType && schema === _prefixes.prism || schema === _prefixes.eprints) {
				return (_itemType = "journalArticle");
			}

			if (!_itemType && schema === _prefixes.og && prop === "type") {
				switch (metaTags[i].getAttribute("content")) { 
							case "video.movie":
					case "video.episode":
					case "video.tv_show":
					case "video.other":
						return "videoRecording";
					case "article":
						return "newspaperArticle";
					case "book":
						return "book";
					case "music.song":
					case "music.album":
						return "audioRecording";
					case "website":
						return "webpage";
				}
			}
		} else if(tag === "citation_journal_title") {
			_itemType = "journalArticle";
		} else if(tag === "citation_technical_report_institution") {
			_itemType = "report";
		} else if(tag === "citation_conference_title") {
			_itemType = "conferencePaper";
		} else if(tag === "citation_book_title") {
			_itemType = "bookSection";
		}
	}

	if(!_rdfPresent && !_itemType) return false;

	if(!_itemType) _itemType = "webpage";
	return _itemType;
}

function doWeb(doc, url) {
	// populate _rdfPresent, _itemType, and _prefixes
	detectWeb(doc, url);

	if(_rdfPresent) {
		// load RDF translator, so that we don't need to replicate import code
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("5e3ad958-ac79-463d-812b-a86a9235c28f");
		translator.setHandler("itemDone", function(obj, newItem) {
			_haveItem = true;
			completeItem(doc, newItem);
		});

		translator.getTranslatorObject(function(rdf) {
			var metaTags = doc.getElementsByTagName("meta");

			for(var i=0; i<metaTags.length; i++) {
				// Two formats allowed:
				// 	<meta name="..." content="..." />
				//	<meta property="..." content="..." />
				// The first is more common; the second is recommended by Facebook
				// for their OpenGraph vocabulary
				var tag = metaTags[i].getAttribute("name");
				if (!tag) tag = metaTags[i].getAttribute("property");
				var value = metaTags[i].getAttribute("content");
				if(!tag || !value) continue;
				// We allow three delimiters between the namespace and the property
				var delimIndex = tag.indexOf('.');
				if(delimIndex === -1) delimIndex = tag.indexOf(':');
				if(delimIndex === -1) delimIndex = tag.indexOf('_');
				if(delimIndex === -1) continue;

				var prefix = tag.substr(0, delimIndex).toLowerCase();

				if(_prefixes[prefix]) {
					var prop = tag[delimIndex+1].toLowerCase()+tag.substr(delimIndex+2);
					// This debug is for seeing what is being sent to RDF
					//Zotero.debug(_prefixes[prefix]+prop +"=>"+value);
					rdf.Zotero.RDF.addStatement(url, _prefixes[prefix] + prop, value, true);
				}
			}

			rdf.defaultUnknownType = _itemType;
			rdf.doImport();
			if(!_haveItem) {
				completeItem(doc, new Zotero.Item(_itemType));
			}
		});
	} else {
		completeItem(doc, new Zotero.Item(_itemType));
	}
}

/**
 * Adds HighWire metadata and completes the item
 */
function addHighwireMetadata(doc, newItem) {
	// HighWire metadata
	processFields(doc, newItem, HIGHWIRE_MAPPINGS);

	var authorNodes = ZU.xpath(doc, '//meta[@name="citation_author" or @name="citation_authors"]/@content');
	//save rdfCreators for later
	var rdfCreators = newItem.creators;
	newItem.creators = [];

	for(var i=0, n=authorNodes.length; i<n; i++) {
		//make sure there are no empty authors
		var authors = authorNodes[i].nodeValue.replace(/(;[^A-Za-z0-9]*)$/, "").split(/\s*;\s/);
		if (authors.length == 1) {
			/* If we get nothing when splitting by semicolon, and at least two words on
			* either side of the comma when splitting by comma, we split by comma. */
			var authorsByComma = authors[0].split(/\s*,\s*/);
			if (authorsByComma.length > 1
				&& authorsByComma[0].indexOf(" ") !== -1
				&& authorsByComma[1].indexOf(" ") !== -1)
				authors = authorsByComma;
		}
		for(var j=0, m=authors.length; j<m; j++) {
			var author = authors[j];
			newItem.creators.push(ZU.cleanAuthor(author, "author", author.indexOf(",") !== -1));
		}
	}

	if( !newItem.creators.length ) {
		newItem.creators = rdfCreators;
	} else if(rdfCreators.length) {
		//try to use RDF creator roles to update the creators we have
		for(var i=0, n=newItem.creators.length; i<n; i++) {
			var name = newItem.creators[i].firstName +
				newItem.creators[i].lastName;
			for(var j=0, m=rdfCreators.length; j<m; j++) {
				var creator = rdfCreators[j];
				if( name.toLowerCase() == (creator.firstName + creator.lastName).toLowerCase() ) {
					//highwire should set all to author, so we only care about editor
					//contributor is not always a contributor
					if(creator.creatorType == 'editor') {
						newItem.creators[i].creatorType == creator.creatorType;
					}
					delete rdfCreators[j];
					break;
				}
			}
		}

		//if there are leftover creators from RDF, we should use them
		if(rdfCreators.length) {
			for(var i=0, n=rdfCreators.length; i<n; i++) {
				newItem.creators.push(rdfCreators[i]);
			}
		}
	}


	//Cleanup DOI
	if (newItem.DOI){
		newItem.DOI =newItem.DOI.replace(/^doi:\s*/, "");
	}


	var firstpage = ZU.xpathText(doc, '//meta[@name="citation_firstpage"]/@content');
	var lastpage = ZU.xpathText(doc, '//meta[@name="citation_lastpage"]/@content');
	if(firstpage && ( firstpage = firstpage.trim() )) {
		newItem.pages = firstpage +
			( lastpage && ( lastpage = lastpage.trim() ) )?'-' + lastpage : '';
	}


	//prefer ISSN over eISSN
	var issn = ZU.xpathText(doc, '//meta[@name="citation_issn"]/@content') ||
			ZU.xpathText(doc, '//meta[@name="citation_eIssn"]/@content');

	if(issn) newItem.ISSN = issn;

	//This may not always yield desired results
	//i.e. if there is more than one pdf attachment (not common)
	var pdfURL = ZU.xpathText(doc, '//meta[@name="citation_pdf_url"][1]/@content');
	if(pdfURL) {
		//delete any pdf attachments if present
		//would it be ok to just delete all attachments??
		for(var i=0, n=newItem.attachments.length; i<n; i++) {
			if(newItem.attachments[i].mimeType == 'application/pdf') {
				delete newItem.attachments[i];
			}
		}

		newItem.attachments.push({title:"Full Text PDF", url:pdfURL, mimeType:"application/pdf"});
	}


	// Other last chances
	if(!newItem.url) newItem.url = doc.location.href;
	if(!newItem.title) newItem.title = doc.title;

	// add attachment
	newItem.attachments.push({document:doc, title:"Snapshot"});

	// add access date
	newItem.accessDate = 'CURRENT_TIMESTAMP';

	newItem.libraryCatalog = doc.location.host;
}

var exports = {
	"doWeb":doWeb,
	"addCustomFields": addCustomFields
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://tools.chass.ncsu.edu/open_journal/index.php/acontracorriente/article/view/174",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Verónica",
						"lastName": "Norando",
						"creatorType": "author"
					},
					{
						"firstName": "Ludmila",
						"lastName": "Scheinkman",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"huelga",
					"trabajadores",
					"trabajadroras",
					"relaciones de género"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://tools.chass.ncsu.edu/open_journal/index.php/acontracorriente/article/view/174",
				"title": "\"La Huelga de los Conventillos\", Buenos Aires, Nueva Pompeya, 1936. Un aporte a los estudios sobre género y clase",
				"source": "A Contracorriente",
				"publicationTitle": "A Contracorriente",
				"rights": "1. Author hereby grants, transfers, and assigns to  A Contracorriente :  (a) the exclusive first serial rights in the Work for publication and distribution throughout the world, as  A Contracorriente  sees fit, in all languages and formats, by print or any electronic means, including, without limitation, the internet, other public and/or private proprietary intranets and computer networks and on CD-ROMs, DVDs and other discs, before the Work shall appear in any other publication (whether print or electronic), in any manner, format or language, or in any other medium now known or hereafter devised. The first serial rights granted to  A Contracorriente  by this Paragraph 1(a) shall be exclusive to  A Contracorriente  until one year following the date of the first serial publication of the Work by  A Contracorriente ; in addition, this grant of rights shall include the non-exclusive right in perpetuity to include the Work in any collection, or compilation produced or authorized by  A Contracorriente , and containing at least 75% material that has appeared in  A Contracorriente , for distribution throughout the world, in all languages and formats, by print or any electronic means, including, without limitation, the internet and other public and proprietary intranets and computer networks and on CDROMs, DVDs and other discs;  (b) further, the non-exclusive right to authorize, reproduce and distribute reprints of the Work throughout the world, in all languages and formats, by print or any electronic means, after the Work appears in a publication produced or authorized by  A Contracorriente ; the right to permit subscribers and other users of the services and publications in which the Work may appear electronically to download, reproduce, and otherwise utilize the Work for their personal, non-commercial use throughout the universe; and the non-exclusive perpetual right, throughout the world, to use the Work, in whole or in part, and Author’s name, likeness, or biography in promoting, advertising, and/or publicizing any publication in which the Work is authorized to appear consistent with this Agreement.  2.  A Contracorriente  reserves the right to publish the Work with illustrations and other graphic materials. Nothing contained herein shall obligate  A Contracorriente  to exploit any of the rights granted to  A Contracorriente  hereunder. All rights not granted to  A Contracorriente  are reserved to Author for Author’s own use and/or transfer, assignment, or disposition.  3. Author represents and warrants: the Work is original to Author, has not been copied in whole or in part, and does not infringe upon the copyright or any other rights of any person or entity; Author has the right to grant the rights granted to  A Contracorriente  under this Agreement free of any and all claims and encumbrances; Author has not granted or transferred any rights in or to the Work to any third party; and Author has not done and will not do anything that has impaired, might impair or will impair in any way any of the rights granted to  A Contracorriente  hereunder.  4. Author shall defend, indemnify, and hold harmless the NC State and its employees, agents, affiliates, successors, licensees, and assigns from and against all claims, damages, liabilities, losses, costs, and expenses, including, without limitation, attorney’s fees and costs, arising out of any breach or alleged breach of any of Author’s representations, warranties, or agreements. Any remedies that Author may have against  A Contracorriente  for breach of this Agreement shall be limited to the right to recover damages, if any, in an action at law. Author hereby waives any right or remedy in equity, including any right to terminate this Agreement, to rescind  A Contracorriente ’s rights in the Work, or to enjoin, restrain, or otherwise impair in any manner the production or distribution of any publication that is authorized or produced by  A Contracorriente .   5.  A Contracorriente  shall have the right to assign this Agreement, either in whole or in part, to any entity affiliated with  A Contracorriente  or to any party that acquires all or substantially all of  A Contracorriente 's assets. Author shall not have the right to further assign any of the rights conferred pursuant to this Agreement, either in whole or in part, or any of the rights granted to Author herein.   6. This Agreement is intended by the parties hereto as the final expression of their understanding with respect to the subject matter herein, as a complete and exclusive statement of the terms herein, and supersedes any and all prior or contemporaneous negotiations, understandings, and agreements between the parties relating thereto.   7. The Agreement may be modified only by a writing signed by both parties to the Agreement. The laws and courts of the State of North Carolina shall govern and control the resolution of any and all conflicts and disputes that may arise hereunder.",
				"date": "2011-10-23",
				"accessionNumber": "174",
				"reportType": "Text.Serial.Journal",
				"videoRecordingType": "Text.Serial.Journal",
				"letterType": "Text.Serial.Journal",
				"manuscriptType": "Text.Serial.Journal",
				"mapType": "Text.Serial.Journal",
				"thesisType": "Text.Serial.Journal",
				"websiteType": "Text.Serial.Journal",
				"audioRecordingType": "Text.Serial.Journal",
				"presentationType": "Text.Serial.Journal",
				"postType": "Text.Serial.Journal",
				"audioFileType": "Text.Serial.Journal",
				"language": "en",
				"extra": "Este trabajo se propone realizar un análisis de las   relaciones de género y clase a través de un estudio de caso: la “Huelga de   los Conventillos” de la fábrica textil Gratry en 1936, que se extendió por   más de tres meses, pasando casi inadvertida, sin embargo, para la   investigación histórica. Siendo la textil una rama de industria con una   mayoría de mano de obra femenina, el caso de la casa Gratry, donde el 60% de   los 800 obreros eran mujeres, aparece como ejemplar para la observación de la   actividad de las mujeres en conflicto.   En el trabajo se analiza el rol de las trabajadoras en   la huelga, su participación política, sus formas de organización y   resistencia, haciendo eje en las determinaciones de género y de clase que son   abordadas de manera complementaria e interrelacionada, así como el complejo   entramado de tensiones y solidaridades que éstas generan. De éste modo, se   pretende ahondar en la compleja conformación de una identidad obrera   femenina, a la vez que se discute con aquella mirada historiográfica tradicional   que ha restado importancia a la participación de la mujer en el conflicto   social. Esto se realizará a través de la exploración de una serie de   variables: las relaciones inter-género e inter-clase (fundamentalmente el   vínculo entre las trabajadoras y la patronal masculina), inter-género e   intra-clase (la relación entre trabajadoras y trabajadores), intra-género e   inter-clase (los lazos entre las trabajadoras y las vecinas comerciantes del   barrio), intra-género e intra-clase (relaciones de solidaridad entre   trabajadoras en huelga, y de antagonismo entre huelguistas y “carneras”).   Para ello se trabajó un corpus documental que incluye   información de tipo cuantitativa (las estadísticas del Boletín Informativo   del Departamento Nacional del Trabajo), y cualitativa: periódicos obreros   –fundamentalmente  El Obrero Textil , órgano gremial de la Unión   Obrera Textil,  Semanario de la CGT-Independencia  (órgano de   la Confederación General del Trabajo (CGT)-Independencia) y  La   Vanguardia  (periódico del Partido Socialista), entre otros, y   entrevistas orales a vecinas de Nueva Pompeya y familiares de trabajadoras de   la fábrica Gratry. Se desarrollará una metodología cuali-cuantitativa para el   cruce de estas fuentes.",
				"volume": "9",
				"issue": "1",
				"url": "http://tools.chass.ncsu.edu/open_journal/index.php/acontracorriente/article/view/174",
				"pages": "1-37",
				"ISSN": "1548-7083",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "tools.chass.ncsu.edu"
			}
		]
	}
]
/** END TEST CASES **/