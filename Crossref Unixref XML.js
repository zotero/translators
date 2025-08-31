{
	"translatorID": "93514073-b541-4e02-9180-c36d2f3bb401",
	"label": "Crossref Unixref XML",
	"creator": "Sebastian Karcher",
	"target": "xml",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"configOptions": {
		"dataMode": "xml/dom"
	},
	"inRepository": true,
	"translatorType": 1,
	"lastUpdated": "2024-10-30 12:58:25"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Sebastian Karcher

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


/* CrossRef uses unixref; documentation at https://data.crossref.org/reports/help/schema_doc/unixref1.1/unixref1.1.html */


/** ********************
 * Utilitiy Functions *
 **********************/

function innerXML(n) {
	var escapedXMLcharacters = {
		'&amp;': '&',
		'&quot;': '"',
		'&lt;': '<',
		'&gt;': '>'
	};
	return n.innerHTML // outer XML
		.replace(/\n/g, "")
		.replace(/(&quot;|&lt;|&gt;|&amp;)/g,
			function (str, item) {
				return escapedXMLcharacters[item];
			}
		);
}

var markupRE = /<(\/?)(\w+)[^<>]*>/gi;
var supportedMarkup = ['i', 'b', 'sub', 'sup', 'span', 'sc'];
var transformMarkup = {
	scp: {
		open: '<span style="font-variant:small-caps;">',
		close: '</span>'
	}
};
function removeUnsupportedMarkup(text) {
	return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') // Remove CDATA markup
		.replace(markupRE, function (m, close, name) {
			if (supportedMarkup.includes(name.toLowerCase())) {
				return m;
			}

			var newMarkup = transformMarkup[name.toLowerCase()];
			if (newMarkup) {
				return close ? newMarkup.close : newMarkup.open;
			}

			return '';
		});
}


function fixAuthorCapitalization(string) {
	// Try to use capitalization function from Zotero Utilities,
	// because the current one doesn't support unicode names.
	// Can't fix this either because ZU.XRegExp.replace is
	// malfunctioning when calling from translators.
	if (ZU.capitalizeName) return ZU.capitalizeName(string);
	if (typeof string === "string" && string.toUpperCase() === string) {
		string = string.toLowerCase().replace(/\b[a-z]/g, function (m) {
			return m[0].toUpperCase();
		});
	}
	return string;
}

function parseCreators(node, item, typeOverrideMap) {
	var contributors = ZU.xpath(node, 'contributors/organization | contributors/person_name');
	if (!contributors.length) {
		contributors = ZU.xpath(node, 'organization | person_name');
	}
	for (var contributor of contributors) {
		var creatorXML = contributor;
		var creator = {};

		var role = creatorXML.getAttribute("contributor_role");
		if (typeOverrideMap && typeOverrideMap[role] !== undefined) {
			creator.creatorType = typeOverrideMap[role];
		}
		else if (role === "author" || role === "editor" || role === "translator") {
			creator.creatorType = role;
		}
		else {
			creator.creatorType = "contributor";
		}

		if (!creator.creatorType) continue;

		if (creatorXML.nodeName === "organization") {
			creator.fieldMode = 1;
			creator.lastName = creatorXML.textContent;
		}
		else if (creatorXML.nodeName === "person_name") {
			creator.firstName = fixAuthorCapitalization(ZU.xpathText(creatorXML, 'given_name'));
			creator.lastName = fixAuthorCapitalization(ZU.xpathText(creatorXML, 'surname'));
			if (!creator.firstName) creator.fieldMode = 1;
		}
		item.creators.push(creator);
	}
}

function parseDate(pubDateNode) {
	if (pubDateNode.length) {
		var year = ZU.xpathText(pubDateNode[0], 'year');
		var month = ZU.xpathText(pubDateNode[0], 'month');
		var day = ZU.xpathText(pubDateNode[0], 'day');
		
		if (year) {
			if (month) {
				if (day) {
					return year + "-" + month + "-" + day;
				}
				else {
					return month + "/" + year;
				}
			}
			else {
				return year;
			}
		}
		else return null;
	}
	else return null;
}


function detectImport() {
	var line;
	var i = 0;
	while ((line = Zotero.read()) !== false) {
		if (line !== "") {
			if (line.includes("<crossref>")) {
				return true;
			}
			else if (i++ > 7) {
				return false;
			}
		}
	}
	return false;
}


function doImport() {
	// XPath does not give us the ability to use the same XPaths regardless of whether or not
	// there is a namespace, so we add an element to make sure that there will always be a
	// namespace.

	var doc = Zotero.getXML();
	
	var doiRecord = ZU.xpath(doc, "//doi_records/doi_record");
	//	Z.debug(doiRecord.length)
	// ensure this isn't an error
	var errorString = ZU.xpathText(doiRecord, 'crossref/error');
	if (errorString !== null) {
		throw errorString;
	}

	var itemXML, item, refXML, metadataXML, seriesXML;
	if ((itemXML = ZU.xpath(doiRecord, 'crossref/journal')).length) {
		item = new Zotero.Item("journalArticle");
		refXML = ZU.xpath(itemXML, 'journal_article');
		metadataXML = ZU.xpath(itemXML, 'journal_metadata');

		item.publicationTitle = ZU.xpathText(metadataXML, 'full_title[1]');
		item.journalAbbreviation = ZU.xpathText(metadataXML, 'abbrev_title[1]');
		item.volume = ZU.xpathText(itemXML, 'journal_issue/journal_volume/volume');
		item.issue = ZU.xpathText(itemXML, 'journal_issue/journal_volume/issue');
		// Sometimes the <issue> tag is not nested inside the volume tag; see 10.1007/BF00938486
		if (!item.issue) item.issue = ZU.xpathText(itemXML, 'journal_issue/issue');
	}
	else if ((itemXML = ZU.xpath(doiRecord, 'crossref/report-paper')).length) {
		// Report Paper
		// Example: doi: 10.4271/2010-01-0907
		
		item = new Zotero.Item("report");
		refXML = ZU.xpath(itemXML, 'report-paper_metadata');
		if (refXML.length === 0) {
			// Example doi: 10.1787/5jzb6vwk338x-en
		
			refXML = ZU.xpath(itemXML, 'report-paper_series_metadata');
			seriesXML = ZU.xpath(refXML, 'series_metadata');
		}
		metadataXML = refXML;

		item.reportNumber = ZU.xpathText(refXML, 'publisher_item/item_number');
		if (!item.reportNumber) item.reportNumber = ZU.xpathText(refXML, 'volume');
		item.institution = ZU.xpathText(refXML, 'publisher/publisher_name');
		item.place = ZU.xpathText(refXML, 'publisher/publisher_place');
	}
	else if ((itemXML = ZU.xpath(doiRecord, 'crossref/book')).length) {
		// Book chapter
		// Example: doi: 10.1017/CCOL0521858429.016
		
		// Reference book entry
		// Example: doi: 10.1002/14651858.CD002966.pub3
		
		// Entire edited book. This should _not_ be imported as bookSection
		// Example: doi: 10.4135/9781446200957
		
		var bookType = itemXML[0].hasAttribute("book_type") ? itemXML[0].getAttribute("book_type") : null;
		var componentType = ZU.xpathText(itemXML[0], 'content_item/@component_type');
		// is this an entry in a reference book?
		var isReference = (bookType == "reference"
				&& ["chapter", "reference_entry", "other"].includes(componentType))
			|| (bookType == "other"
				&& ["chapter", "reference_entry"].includes(componentType));

		// for items that are entry in reference books OR edited book types that have some type of a chapter entry.
		if ((bookType === "edited_book" && componentType) || isReference) {
			item = new Zotero.Item("bookSection");
			refXML = ZU.xpath(itemXML, 'content_item');

			if (isReference) {
				metadataXML = ZU.xpath(itemXML, 'book_metadata');
				if (!metadataXML.length) metadataXML = ZU.xpath(itemXML, 'book_series_metadata');
				// TODO: Check book_set_metadata here too, as we do below?

				item.bookTitle = ZU.xpathText(metadataXML, 'titles[1]/title[1]');
				item.seriesTitle = ZU.xpathText(metadataXML, 'series_metadata/titles[1]/title[1]');

				var metadataSeriesXML = ZU.xpath(metadataXML, 'series_metadata');
				if (metadataSeriesXML.length) parseCreators(metadataSeriesXML, item, { editor: "seriesEditor" });
			}
			else {
				metadataXML = ZU.xpath(itemXML, 'book_series_metadata');
				if (!metadataXML.length) metadataXML = ZU.xpath(itemXML, 'book_metadata');
				item.bookTitle = ZU.xpathText(metadataXML, 'series_metadata/titles[1]/title[1]');
				if (!item.bookTitle) item.bookTitle = ZU.xpathText(metadataXML, 'titles[1]/title[1]');
			}

			// Handle book authors
			parseCreators(metadataXML, item, { author: "bookAuthor" });
		// Book
		}
		else {
			item = new Zotero.Item("book");
			refXML = ZU.xpath(itemXML, 'book_metadata');
			// Sometimes book data is in book_series_metadata
			// doi: 10.1007/978-1-4419-9164-5
			
			// And sometimes in book_set_metadata
			// doi: 10.7551/mitpress/9780262533287.003.0006
			
			if (!refXML.length) refXML = ZU.xpath(itemXML, 'book_series_metadata');
			if (!refXML.length) refXML = ZU.xpath(itemXML, 'book_set_metadata');
			metadataXML = refXML;
			seriesXML = ZU.xpath(refXML, 'series_metadata');
		}

		item.place = ZU.xpathText(metadataXML, 'publisher/publisher_place');
	}
	else if ((itemXML = ZU.xpath(doiRecord, 'crossref/standard')).length) {
		item = new Zotero.Item('standard');
		refXML = ZU.xpath(itemXML, 'standard_metadata');
		metadataXML = ZU.xpath(itemXML, 'standard_metadata');
	}
	else if ((itemXML = ZU.xpath(doiRecord, 'crossref/conference')).length) {
		item = new Zotero.Item("conferencePaper");
		refXML = ZU.xpath(itemXML, 'conference_paper');
		metadataXML = ZU.xpath(itemXML, 'proceedings_metadata');
		seriesXML = ZU.xpath(metadataXML, 'proceedings_metadata');

		item.publicationTitle = ZU.xpathText(metadataXML, 'proceedings_title');
		item.place = ZU.xpathText(itemXML, 'event_metadata/conference_location');
		item.conferenceName = ZU.xpathText(itemXML, 'event_metadata/conference_name');
	}

	else if ((itemXML = ZU.xpath(doiRecord, 'crossref/database')).length) {
		item = new Zotero.Item('dataset');
		refXML = ZU.xpath(itemXML, 'dataset');
		metadataXML = ZU.xpath(itemXML, 'database_metadata');
		var pubDate = ZU.xpath(refXML, 'database_date/publication_date');
		if (!pubDate.length) pubDate = ZU.xpath(metadataXML, 'database_date/publication_date');
		item.date = parseDate(pubDate);
		
		if (!ZU.xpathText(refXML, 'contributors')) {
			parseCreators(metadataXML, item);
		}
		if (!ZU.xpathText(metadataXML, 'publisher')) {
			item.institution = ZU.xpathText(metadataXML, 'institution/institution_name');
		}
	}
	
	else if ((itemXML = ZU.xpath(doiRecord, 'crossref/dissertation')).length) {
		item = new Zotero.Item("thesis");
		item.date = parseDate(ZU.xpath(itemXML, "approval_date[1]"));
		item.university = ZU.xpathText(itemXML, "institution/institution_name");
		item.place = ZU.xpathText(itemXML, "institution/institution_place");
		var type = ZU.xpathText(itemXML, "degree");
		if (type) item.thesisType = type.replace(/\(.+\)/, "");
	}
	
	else if ((itemXML = ZU.xpath(doiRecord, 'crossref/posted_content')).length) {
		let type = ZU.xpathText(itemXML, "./@type");
		if (type == "preprint") {
			item = new Zotero.Item("preprint");
			item.repository = ZU.xpathText(itemXML, "group_title");
		}
		else {
			item = new Zotero.Item("blogPost");
			item.blogTitle = ZU.xpathText(itemXML, "institution/institution_name");
		}
		item.date = parseDate(ZU.xpath(itemXML, "posted_date"));
	}
	
	else if ((itemXML = ZU.xpath(doiRecord, 'crossref/peer_review')).length) {
		item = new Zotero.Item("manuscript"); // is this the best category
		item.date = parseDate(ZU.xpath(itemXML, "reviewed_date"));
		if (ZU.xpath(itemXML, "/contributors/anonymous")) {
			item.creators.push({ lastName: "Anonymous Reviewer", fieldMode: 1, creatorType: "author" });
		}
		item.type = "peer review";
		var reviewOf = ZU.xpathText(itemXML, "//related_item/inter_work_relation");
		if (reviewOf) {
			var identifierType = ZU.xpathText(itemXML, "//related_item/inter_work_relation/@identifier-type");
			var identifier;
			if (identifierType == "doi") {
				identifier = "<a href=\"https://doi.org/" + reviewOf + "\">https://doi.org/" + reviewOf + "</a>";
			}
			else if (identifierType == "url") {
				identifier = "<a href=\"" + reviewOf + "\">" + reviewOf + "</a>";
			}
			else {
				identifier = reviewOf;
			}
			var noteText = "Review of " + identifier;
			// Z.debug(noteText);
			item.notes.push(noteText);
		}
	}
	
	else {
		item = new Zotero.Item("document");
	}


	if (!refXML || !refXML.length) {
		refXML = itemXML;
	}

	if (!metadataXML || !metadataXML.length) {
		metadataXML = refXML;
	}

	item.abstractNote = ZU.xpathText(refXML, 'description|abstract');
	item.language = ZU.xpathText(metadataXML, './@language');
	item.ISBN = ZU.xpathText(metadataXML, 'isbn');
	item.ISSN = ZU.xpathText(metadataXML, 'issn');
	item.publisher = ZU.xpathText(metadataXML, 'publisher/publisher_name');

	item.edition = ZU.xpathText(metadataXML, 'edition_number');
	if (!item.volume) item.volume = ZU.xpathText(metadataXML, 'volume');
	

	parseCreators(refXML, item, (item.itemType == 'bookSection' ? { editor: null } : "author"));

	if (seriesXML && seriesXML.length) {
		parseCreators(seriesXML, item, { editor: "seriesEditor" });
		item.series = ZU.xpathText(seriesXML, 'titles[1]/title[1]');
		item.seriesNumber = ZU.xpathText(seriesXML, 'series_number');
		item.reportType = ZU.xpathText(seriesXML, 'titles[1]/title[1]');
	}
	// prefer article to journal metadata and print to other dates
	var pubDateNode = ZU.xpath(refXML, 'publication_date[@media_type="print"]');
	if (!pubDateNode.length) pubDateNode = ZU.xpath(refXML, 'publication_date');
	if (!pubDateNode.length) pubDateNode = ZU.xpath(metadataXML, 'publication_date[@media_type="print"]');
	if (!pubDateNode.length) pubDateNode = ZU.xpath(metadataXML, 'publication_date');

	
	if (pubDateNode.length) {
		item.date = parseDate(pubDateNode);
	}

	var pages = ZU.xpath(refXML, 'pages[1]');
	if (pages.length) {
		item.pages = ZU.xpathText(pages, 'first_page[1]');
		var lastPage = ZU.xpathText(pages, 'last_page[1]');
		if (lastPage) item.pages += "-" + lastPage;
	}
	else {
		// use article Number instead
		item.pages = ZU.xpathText(refXML, 'publisher_item/item_number');
	}

	item.DOI = ZU.xpathText(refXML, 'doi_data/doi');
	// add DOI to extra for unsupprted items
	if (item.DOI && !ZU.fieldIsValidForType("DOI", item.itemType)) {
		if (item.extra) {
			item.extra += "\nDOI: " + item.DOI;
		}
		else {
			item.extra = "DOI: " + item.DOI;
		}
	}
	// I think grabbing the first license will usually make the most sense;
	// not sure how many different options they are and how well labelled they are
	item.rights = ZU.xpathText(refXML, 'program/license_ref[1]');
	item.url = ZU.xpathText(refXML, 'doi_data/resource');
	var title = ZU.xpath(refXML, 'titles[1]/title[1]')[0];
	if (!title && metadataXML) {
		title = ZU.xpath(metadataXML, 'titles[1]/title[1]')[0];
	}
	if (title) {
		item.title = ZU.trimInternal(
			removeUnsupportedMarkup(innerXML(title))
		);
		var subtitle = ZU.xpath(refXML, 'titles[1]/subtitle[1]')[0];
		if (subtitle) {
			item.title = item.title.replace(/:$/, '') + ': ' + ZU.trimInternal(
				removeUnsupportedMarkup(innerXML(subtitle))
			);
		}
		item.title = item.title.replace(/\s+<(sub|sup)>/g, "<$1>");
	}
	if (!item.title || item.title == "") {
		item.title = "[No title found]";
	}
	// Zotero.debug(JSON.stringify(item, null, 4));

	// Check if there are potential issues with character encoding and try to fix them.
	// E.g., in 10.1057/9780230391116.0016, the en dash in the title is displayed as â<80><93>,
	// which is what you get if you decode a UTF-8 en dash (<E2><80><93>) as Latin-1 and then serve
	// as UTF-8 (<C3><A2> <C2><80> <C2><93>)
	for (var field in item) {
		if (typeof item[field] != 'string') continue;
		// Check for control characters that should never be in strings from Crossref
		if (/[\u007F-\u009F]/.test(item[field])) {
			// <E2><80><93> -> %E2%80%93 -> en dash
			try {
				item[field] = decodeURIComponent(escape(item[field]));
			}
			// If decoding failed, just strip control characters
			// https://forums.zotero.org/discussion/102271/lookup-failed-for-doi
			catch (e) {
				item[field] = item[field].replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
			}
		}
	}
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<doi_records>\n  <doi_record owner=\"10.1109\" timestamp=\"2017-03-18 06:36:17\">\n    <crossref>\n      <conference>\n        <event_metadata>\n          <conference_name>2017 IEEE International Solid- State Circuits Conference - (ISSCC)</conference_name>\n          <conference_location>San Francisco, CA, USA</conference_location>\n          <conference_date start_month=\"2\" start_year=\"2017\" start_day=\"5\" end_month=\"2\" end_year=\"2017\" end_day=\"9\" />\n        </event_metadata>\n        <proceedings_metadata>\n          <proceedings_title>2017 IEEE International Solid-State Circuits Conference (ISSCC)</proceedings_title>\n          <publisher>\n            <publisher_name>IEEE</publisher_name>\n          </publisher>\n          <publication_date>\n            <month>2</month>\n            <year>2017</year>\n          </publication_date>\n          <isbn media_type=\"electronic\">978-1-5090-3758-2</isbn>\n        </proceedings_metadata>\n        <conference_paper>\n          <contributors>\n            <person_name sequence=\"first\" contributor_role=\"author\">\n              <given_name>Pen-Jui</given_name>\n              <surname>Peng</surname>\n            </person_name>\n            <person_name sequence=\"additional\" contributor_role=\"author\">\n              <given_name>Jeng-Feng</given_name>\n              <surname>Li</surname>\n            </person_name>\n            <person_name sequence=\"additional\" contributor_role=\"author\">\n              <given_name>Li-Yang</given_name>\n              <surname>Chen</surname>\n            </person_name>\n            <person_name sequence=\"additional\" contributor_role=\"author\">\n              <given_name>Jri</given_name>\n              <surname>Lee</surname>\n            </person_name>\n          </contributors>\n          <titles>\n            <title>6.1 A 56Gb/s PAM-4/NRZ transceiver in 40nm CMOS</title>\n          </titles>\n          <publication_date>\n            <month>2</month>\n            <year>2017</year>\n          </publication_date>\n          <pages>\n            <first_page>110</first_page>\n            <last_page>111</last_page>\n          </pages>\n          <publisher_item>\n            <item_number item_number_type=\"arNumber\">7870285</item_number>\n          </publisher_item>\n          <doi_data>\n            <doi>10.1109/ISSCC.2017.7870285</doi>\n            <resource>http://ieeexplore.ieee.org/document/7870285/</resource>\n            <collection property=\"crawler-based\">\n              <item crawler=\"iParadigms\">\n                <resource>http://xplorestaging.ieee.org/ielx7/7866667/7870233/07870285.pdf?arnumber=7870285</resource>\n              </item>\n            </collection>\n          </doi_data>\n        </conference_paper>\n      </conference>\n    </crossref>\n  </doi_record>\n</doi_records>\n",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "6.1 A 56Gb/s PAM-4/NRZ transceiver in 40nm CMOS",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Pen-Jui",
						"lastName": "Peng"
					},
					{
						"creatorType": "author",
						"firstName": "Jeng-Feng",
						"lastName": "Li"
					},
					{
						"creatorType": "author",
						"firstName": "Li-Yang",
						"lastName": "Chen"
					},
					{
						"creatorType": "author",
						"firstName": "Jri",
						"lastName": "Lee"
					}
				],
				"date": "2/2017",
				"DOI": "10.1109/ISSCC.2017.7870285",
				"ISBN": "978-1-5090-3758-2",
				"conferenceName": "2017 IEEE International Solid- State Circuits Conference - (ISSCC)",
				"pages": "110-111",
				"place": "San Francisco, CA, USA",
				"proceedingsTitle": "2017 IEEE International Solid-State Circuits Conference (ISSCC)",
				"publisher": "IEEE",
				"url": "http://ieeexplore.ieee.org/document/7870285/",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "<doi_records>\n  <doi_record owner=\"10.1093\" timestamp=\"2017-08-23 03:08:26\">\n    <crossref>\n      <journal>\n        <journal_metadata language=\"en\">\n          <full_title>FEMS Microbiology Ecology</full_title>\n          <abbrev_title>FEMS Microbiol Ecol</abbrev_title>\n          <issn>01686496</issn>\n        </journal_metadata>\n        <journal_issue>\n          <publication_date media_type=\"print\">\n            <month>04</month>\n            <year>2013</year>\n          </publication_date>\n          <journal_volume>\n            <volume>84</volume>\n          </journal_volume>\n          <issue>1</issue>\n        </journal_issue>\n        <journal_article publication_type=\"full_text\">\n          <titles>\n            <title> Microbial community\n              changes at a terrestrial volcanic CO\n              <sub>2</sub>\n              vent induced by soil acidification and anaerobic microhabitats within the soil column\n            </title>\n          </titles>\n          <contributors>\n            <person_name contributor_role=\"author\" sequence=\"first\">\n              <given_name>Janin</given_name>\n              <surname>Frerichs</surname>\n              <affiliation>Federal Institute for Geosciences and Natural Resources (BGR); Hannover; Germany</affiliation>\n            </person_name>\n            <person_name contributor_role=\"author\" sequence=\"additional\">\n              <given_name>Birte I.</given_name>\n              <surname>Oppermann</surname>\n              <affiliation>Institute of Biogeochemistry and Marine Chemistry; University of Hamburg; Hamburg; Germany</affiliation>\n            </person_name>\n            <person_name contributor_role=\"author\" sequence=\"additional\">\n              <given_name>Simone</given_name>\n              <surname>Gwosdz</surname>\n              <affiliation>Federal Institute for Geosciences and Natural Resources (BGR); Hannover; Germany</affiliation>\n            </person_name>\n            <person_name contributor_role=\"author\" sequence=\"additional\">\n              <given_name>Ingo</given_name>\n              <surname>Möller</surname>\n              <affiliation>Federal Institute for Geosciences and Natural Resources (BGR); Hannover; Germany</affiliation>\n            </person_name>\n            <person_name contributor_role=\"author\" sequence=\"additional\">\n              <given_name>Martina</given_name>\n              <surname>Herrmann</surname>\n              <affiliation>Institute of Ecology, Limnology/Aquatic Geomicrobiology Working Group; Friedrich Schiller University of Jena; Jena; Germany</affiliation>\n            </person_name>\n            <person_name contributor_role=\"author\" sequence=\"additional\">\n              <given_name>Martin</given_name>\n              <surname>Krüger</surname>\n              <affiliation>Federal Institute for Geosciences and Natural Resources (BGR); Hannover; Germany</affiliation>\n            </person_name>\n          </contributors>\n          <publication_date media_type=\"print\">\n            <month>04</month>\n            <year>2013</year>\n          </publication_date>\n          <publication_date media_type=\"online\">\n            <month>12</month>\n            <day>10</day>\n            <year>2012</year>\n          </publication_date>\n          <pages>\n            <first_page>60</first_page>\n            <last_page>74</last_page>\n          </pages>\n          <doi_data>\n            <doi>10.1111/1574-6941.12040</doi>\n            <resource>https://academic.oup.com/femsec/article-lookup/doi/10.1111/1574-6941.12040</resource>\n            <collection property=\"crawler-based\">\n              <item crawler=\"iParadigms\">\n                <resource>http://academic.oup.com/femsec/article-pdf/84/1/60/19537307/84-1-60.pdf</resource>\n              </item>\n            </collection>\n          </doi_data>\n        </journal_article>\n      </journal>\n    </crossref>\n  </doi_record>\n</doi_records>\n",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Microbial community changes at a terrestrial volcanic CO <sub>2</sub> vent induced by soil acidification and anaerobic microhabitats within the soil column",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Janin",
						"lastName": "Frerichs"
					},
					{
						"creatorType": "author",
						"firstName": "Birte I.",
						"lastName": "Oppermann"
					},
					{
						"creatorType": "author",
						"firstName": "Simone",
						"lastName": "Gwosdz"
					},
					{
						"creatorType": "author",
						"firstName": "Ingo",
						"lastName": "Möller"
					},
					{
						"creatorType": "author",
						"firstName": "Martina",
						"lastName": "Herrmann"
					},
					{
						"creatorType": "author",
						"firstName": "Martin",
						"lastName": "Krüger"
					}
				],
				"date": "04/2013",
				"DOI": "10.1111/1574-6941.12040",
				"ISSN": "01686496",
				"issue": "1",
				"journalAbbreviation": "FEMS Microbiol Ecol",
				"language": "en",
				"pages": "60-74",
				"publicationTitle": "FEMS Microbiology Ecology",
				"url": "https://academic.oup.com/femsec/article-lookup/doi/10.1111/1574-6941.12040",
				"volume": "84",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<doi_records>\n  <doi_record owner=\"10.1080\" timestamp=\"2018-09-06 15:38:40\">\n    <crossref>\n      <journal>\n        <journal_metadata language=\"en\">\n          <full_title>Eurasian Geography and Economics</full_title>\n          <abbrev_title>Eurasian Geography and Economics</abbrev_title>\n          <issn media_type=\"print\">1538-7216</issn>\n          <issn media_type=\"electronic\">1938-2863</issn>\n        </journal_metadata>\n        <journal_issue>\n          <publication_date media_type=\"online\">\n            <month>05</month>\n            <day>15</day>\n            <year>2013</year>\n          </publication_date>\n          <publication_date media_type=\"print\">\n            <month>03</month>\n            <year>2009</year>\n          </publication_date>\n          <journal_volume>\n            <volume>50</volume>\n          </journal_volume>\n          <issue>2</issue>\n        </journal_issue>\n        <journal_article publication_type=\"full_text\">\n          <titles>\n            <title>\n              The Chinese\n              <i>Hukou</i>\n              System at 50\n            </title>\n          </titles>\n          <contributors>\n            <person_name sequence=\"first\" contributor_role=\"author\">\n              <given_name>Kam Wing</given_name>\n              <surname>Chan</surname>\n              <affiliation>a  University of Washington</affiliation>\n            </person_name>\n          </contributors>\n          <publication_date media_type=\"online\">\n            <month>05</month>\n            <day>15</day>\n            <year>2013</year>\n          </publication_date>\n          <publication_date media_type=\"print\">\n            <month>03</month>\n            <year>2009</year>\n          </publication_date>\n          <pages>\n            <first_page>197</first_page>\n            <last_page>221</last_page>\n          </pages>\n          <publisher_item>\n            <item_number item_number_type=\"sequence-number\">5</item_number>\n            <identifier id_type=\"doi\">10.2747/1539-7216.50.2.197</identifier>\n          </publisher_item>\n          <doi_data>\n            <doi>10.2747/1539-7216.50.2.197</doi>\n            <resource>https://www.tandfonline.com/doi/full/10.2747/1539-7216.50.2.197</resource>\n            <collection property=\"crawler-based\">\n              <item crawler=\"iParadigms\">\n                <resource>https://www.tandfonline.com/doi/pdf/10.2747/1539-7216.50.2.197</resource>\n              </item>\n              <item crawler=\"google\">\n                <resource>http://bellwether.metapress.com/index/10.2747/1539-7216.50.2.197</resource>\n              </item>\n            </collection>\n          </doi_data>\n        </journal_article>\n      </journal>\n    </crossref>\n  </doi_record>\n</doi_records>\n",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Chinese <i>Hukou</i> System at 50",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Kam Wing",
						"lastName": "Chan"
					}
				],
				"date": "03/2009",
				"DOI": "10.2747/1539-7216.50.2.197",
				"ISSN": "1538-7216, 1938-2863",
				"issue": "2",
				"journalAbbreviation": "Eurasian Geography and Economics",
				"language": "en",
				"pages": "197-221",
				"publicationTitle": "Eurasian Geography and Economics",
				"url": "https://www.tandfonline.com/doi/full/10.2747/1539-7216.50.2.197",
				"volume": "50",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<doi_records>\n  <doi_record owner=\"10.17077\" timestamp=\"2018-11-29 17:31:41\">\n    <crossref>\n      <dissertation publication_type=\"full_text\" language=\"en\">\n        <person_name sequence=\"first\" contributor_role=\"author\">\n          <given_name>Joseph Emil</given_name>\n          <surname>Kasper</surname>\n          <affiliation>State University of Iowa</affiliation>\n        </person_name>\n        <titles>\n          <title>Contributions to geomagnetic theory</title>\n        </titles>\n        <approval_date media_type=\"print\">\n          <month>01</month>\n          <year>1958</year>\n        </approval_date>\n        <institution>\n          <institution_name>State University of Iowa</institution_name>\n          <institution_acronym>UIowa</institution_acronym>\n          <institution_acronym>SUI</institution_acronym>\n          <institution_place>Iowa City, Iowa, USA</institution_place>\n          <institution_department>Physics</institution_department>\n        </institution>\n        <degree>PhD (Doctor of Philosophy)</degree>\n        <doi_data>\n          <doi>10.17077/etd.xnw0xnau</doi>\n          <resource>https://ir.uiowa.edu/etd/4529</resource>\n        </doi_data>\n      </dissertation>\n    </crossref>\n  </doi_record>\n</doi_records>\n",
		"items": [
			{
				"itemType": "thesis",
				"title": "Contributions to geomagnetic theory",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Joseph Emil",
						"lastName": "Kasper"
					}
				],
				"date": "01/1958",
				"extra": "DOI: 10.17077/etd.xnw0xnau",
				"language": "en",
				"place": "Iowa City, Iowa, USA",
				"thesisType": "PhD",
				"university": "State University of Iowa",
				"url": "https://ir.uiowa.edu/etd/4529",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<doi_records>\n  <doi_record owner=\"10.31219\" timestamp=\"2018-11-13 07:19:46\">\n    <crossref>\n      <posted_content type=\"preprint\">\n        <group_title>Open Science Framework</group_title>\n        <contributors>\n          <person_name contributor_role=\"author\" sequence=\"first\">\n            <given_name>Steve</given_name>\n            <surname>Haroz</surname>\n          </person_name>\n        </contributors>\n        <titles>\n          <title>Open Practices in Visualization Research</title>\n        </titles>\n        <posted_date>\n          <month>07</month>\n          <day>03</day>\n          <year>2018</year>\n        </posted_date>\n        <item_number>osf.io/8ag3w</item_number>\n        <abstract>\n          <p>Two fundamental tenants of scientific research are that it can be scrutinized and built-upon. Both require that the collected data and supporting materials be shared, so others can examine, reuse, and extend them. Assessing the accessibility of these components and the paper itself can serve as a proxy for the reliability, replicability, and applicability of a field’s research. In this paper, I describe the current state of openness in visualization research and provide suggestions for authors, reviewers, and editors to improve open practices in the field. A free copy of this paper, the collected data, and the source code are available at https://osf.io/qf9na/</p>\n        </abstract>\n        <program>\n          <license_ref start_date=\"2018-07-03\">https://creativecommons.org/licenses/by/4.0/legalcode</license_ref>\n        </program>\n        <doi_data>\n          <doi>10.31219/osf.io/8ag3w</doi>\n          <resource>https://osf.io/8ag3w</resource>\n        </doi_data>\n      </posted_content>\n    </crossref>\n  </doi_record>\n</doi_records>\n",
		"items": [
			{
				"itemType": "preprint",
				"title": "Open Practices in Visualization Research",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Steve",
						"lastName": "Haroz"
					}
				],
				"date": "2018-07-03",
				"DOI": "10.31219/osf.io/8ag3w",
				"abstractNote": "Two fundamental tenants of scientific research are that it can be scrutinized and built-upon. Both require that the collected data and supporting materials be shared, so others can examine, reuse, and extend them. Assessing the accessibility of these components and the paper itself can serve as a proxy for the reliability, replicability, and applicability of a field’s research. In this paper, I describe the current state of openness in visualization research and provide suggestions for authors, reviewers, and editors to improve open practices in the field. A free copy of this paper, the collected data, and the source code are available at https://osf.io/qf9na/",
				"repository": "Open Science Framework",
				"rights": "https://creativecommons.org/licenses/by/4.0/legalcode",
				"url": "https://osf.io/8ag3w",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<doi_records>\n  <doi_record owner=\"10.21468\" timestamp=\"2018-01-22 15:00:32\">\n    <crossref>\n      <peer_review stage=\"pre-publication\">\n        <contributors>\n          <anonymous sequence=\"first\" contributor_role=\"reviewer\" />\n        </contributors>\n        <titles>\n          <title>Report on 1607.01285v1</title>\n        </titles>\n        <review_date>\n          <month>09</month>\n          <day>08</day>\n          <year>2016</year>\n        </review_date>\n        <program>\n          <related_item>\n            <description>Report on 1607.01285v1</description>\n            <inter_work_relation relationship-type=\"isReviewOf\" identifier-type=\"doi\">10.21468/SciPostPhys.1.1.010</inter_work_relation>\n          </related_item>\n        </program>\n        <doi_data>\n          <doi>10.21468/SciPost.Report.10</doi>\n          <resource>https://scipost.org/SciPost.Report.10</resource>\n        </doi_data>\n      </peer_review>\n    </crossref>\n  </doi_record>\n</doi_records>\n",
		"items": [
			{
				"itemType": "manuscript",
				"title": "Report on 1607.01285v1",
				"creators": [
					{
						"lastName": "Anonymous Reviewer",
						"fieldMode": 1,
						"creatorType": "author"
					}
				],
				"extra": "DOI: 10.21468/SciPost.Report.10",
				"manuscriptType": "peer review",
				"url": "https://scipost.org/SciPost.Report.10",
				"attachments": [],
				"tags": [],
				"notes": [
					"Review of <a href=\"https://doi.org/10.21468/SciPostPhys.1.1.010\">https://doi.org/10.21468/SciPostPhys.1.1.010</a>"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?> <doi_records> <doi_record owner=\"10.4086\" timestamp=\"2018-12-31 08:08:13\"> <crossref> <journal> <journal_metadata language=\"en\"> <full_title>Chicago Journal of Theoretical Computer Science</full_title> <abbrev_title>Chicago J. of Theoretical Comp. Sci.</abbrev_title> <abbrev_title>CJTCS</abbrev_title> <issn media_type=\"electronic\">1073-0486</issn> <coden>CJTCS</coden> <doi_data> <doi>10.4086/cjtcs</doi> <resource>http://cjtcs.cs.uchicago.edu/</resource> </doi_data> </journal_metadata> <journal_issue> <publication_date media_type=\"online\"> <year>2012</year> </publication_date> <journal_volume> <volume>18</volume> </journal_volume> <issue>1</issue> <doi_data> <doi>10.4086/cjtcs.2012.v018</doi> <resource>http://cjtcs.cs.uchicago.edu/articles/2012/contents.html</resource> </doi_data> </journal_issue> <journal_article publication_type=\"full_text\"> <titles> <title /> </titles> <contributors> <person_name sequence=\"first\" contributor_role=\"author\"> <given_name>Michael</given_name> <surname>Hoffman</surname> </person_name> <person_name sequence=\"additional\" contributor_role=\"author\"> <given_name>Jiri</given_name> <surname>Matousek</surname> </person_name> <person_name sequence=\"additional\" contributor_role=\"author\"> <given_name>Yoshio</given_name> <surname>Okamoto</surname> </person_name> <person_name sequence=\"additional\" contributor_role=\"author\"> <given_name>Phillipp</given_name> <surname>Zumstein</surname> </person_name> </contributors> <publication_date media_type=\"online\"> <year>2012</year> </publication_date> <pages> <first_page>1</first_page> <last_page>10</last_page> </pages> <doi_data> <doi>10.4086/cjtcs.2012.002</doi> <resource>http://cjtcs.cs.uchicago.edu/articles/2012/2/contents.html</resource> </doi_data> </journal_article> </journal> </crossref> </doi_record> </doi_records>",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "[No title found]",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Michael",
						"lastName": "Hoffman"
					},
					{
						"creatorType": "author",
						"firstName": "Jiri",
						"lastName": "Matousek"
					},
					{
						"creatorType": "author",
						"firstName": "Yoshio",
						"lastName": "Okamoto"
					},
					{
						"creatorType": "author",
						"firstName": "Phillipp",
						"lastName": "Zumstein"
					}
				],
				"date": "2012",
				"DOI": "10.4086/cjtcs.2012.002",
				"ISSN": "1073-0486",
				"issue": "1",
				"journalAbbreviation": "Chicago J. of Theoretical Comp. Sci.",
				"language": "en",
				"pages": "1-10",
				"publicationTitle": "Chicago Journal of Theoretical Computer Science",
				"url": "http://cjtcs.cs.uchicago.edu/articles/2012/2/contents.html",
				"volume": "18",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<doi_records>\n  <doi_record owner=\"10.1002\" timestamp=\"2020-10-06 16:52:28\">\n    <crossref>\n      <book book_type=\"reference\">\n        <book_metadata language=\"en\">\n          <contributors>\n            <person_name contributor_role=\"editor\" sequence=\"first\">\n              <given_name>Jan</given_name>\n              <surname>Bulck</surname>\n            </person_name>\n          </contributors>\n          <titles>\n            <title>The International Encyclopedia of Media Psychology</title>\n          </titles>\n          <edition_number>1</edition_number>\n          <publication_date media_type=\"online\">\n            <month>09</month>\n            <day>08</day>\n            <year>2020</year>\n          </publication_date>\n          <isbn media_type=\"electronic\">9781119011071</isbn>\n          <publisher>\n            <publisher_name>Wiley</publisher_name>\n          </publisher>\n          <publisher_item>\n            <identifier id_type=\"doi\">10.1002/9781119011071</identifier>\n          </publisher_item>\n          <program name=\"AccessIndicators\">\n            <license_ref applies_to=\"tdm\">http://doi.wiley.com/10.1002/tdm_license_1.1</license_ref>\n          </program>\n          <doi_data>\n            <doi>10.1002/9781119011071</doi>\n            <timestamp>2020100613475700320</timestamp>\n            <resource>https://onlinelibrary.wiley.com/doi/book/10.1002/9781119011071</resource>\n          </doi_data>\n        </book_metadata>\n        <content_item component_type=\"other\" level_sequence_number=\"1\" publication_type=\"full_text\">\n          <contributors>\n            <person_name contributor_role=\"author\" sequence=\"first\">\n              <given_name>Allison</given_name>\n              <surname>Eden</surname>\n            </person_name>\n          </contributors>\n          <titles>\n            <title>Appreciation and Eudaimonic Reactions to Media</title>\n          </titles>\n          <publication_date media_type=\"online\">\n            <month>09</month>\n            <day>09</day>\n            <year>2020</year>\n          </publication_date>\n          <pages>\n            <first_page>1</first_page>\n            <last_page>9</last_page>\n          </pages>\n          <publisher_item>\n            <identifier id_type=\"doi\">10.1002/9781119011071.iemp0172</identifier>\n          </publisher_item>\n          <archive_locations>\n            <archive name=\"Portico\" />\n          </archive_locations>\n          <program name=\"AccessIndicators\">\n            <license_ref applies_to=\"tdm\">http://doi.wiley.com/10.1002/tdm_license_1.1</license_ref>\n          </program>\n          <doi_data>\n            <doi>10.1002/9781119011071.iemp0172</doi>\n            <timestamp>2020100613475700320</timestamp>\n            <resource>https://onlinelibrary.wiley.com/doi/10.1002/9781119011071.iemp0172</resource>\n            <collection property=\"crawler-based\">\n              <item crawler=\"iParadigms\">\n                <resource>https://onlinelibrary.wiley.com/doi/pdf/10.1002/9781119011071.iemp0172</resource>\n              </item>\n            </collection>\n            <collection property=\"text-mining\">\n              <item>\n                <resource mime_type=\"application/pdf\">https://onlinelibrary.wiley.com/doi/pdf/10.1002/9781119011071.iemp0172</resource>\n              </item>\n              <item>\n                <resource mime_type=\"application/xml\">https://onlinelibrary.wiley.com/doi/full-xml/10.1002/9781119011071.iemp0172</resource>\n              </item>\n            </collection>\n          </doi_data>\n          <citation_list>\n            <citation key=\"e_1_2_9_1_2_1\">\n              <doi>10.1080/15213269.2016.1182030</doi>\n            </citation>\n            <citation key=\"e_1_2_9_1_3_1\">\n              <doi>10.1080/23736992.2017.1329019</doi>\n            </citation>\n            <citation key=\"e_1_2_9_1_4_1\">\n              <doi>10.1111/jcom.12228</doi>\n            </citation>\n            <citation key=\"e_1_2_9_1_5_1\">\n              <doi>10.1080/10510974.2017.1340903</doi>\n            </citation>\n            <citation key=\"e_1_2_9_1_6_1\">\n              <doi>10.1111/jcom.12101</doi>\n            </citation>\n            <citation key=\"e_1_2_9_1_7_1\">\n              <doi>10.1080/15205436.2013.872277</doi>\n            </citation>\n            <citation key=\"e_1_2_9_1_8_1\">\n              <doi>10.1111/j.1468-2958.2009.01368.x</doi>\n            </citation>\n            <citation key=\"e_1_2_9_1_9_1\">\n              <doi>10.1027/1864-1105/a000029</doi>\n            </citation>\n            <citation key=\"e_1_2_9_1_10_1\">\n              <doi>10.1037/ppm0000066</doi>\n            </citation>\n            <citation key=\"e_1_2_9_1_11_1\">\n              <doi>10.1111/j.1460-2466.2011.01585.x</doi>\n            </citation>\n            <citation key=\"e_1_2_9_1_12_1\">\n              <volume_title>The role of intuition accessibility on the appraisal and selection of media content</volume_title>\n              <author>Prabhu S.</author>\n              <cYear>2014</cYear>\n            </citation>\n            <citation key=\"e_1_2_9_1_13_1\">\n              <doi>10.1080/15213269.2013.773494</doi>\n            </citation>\n            <citation key=\"e_1_2_9_1_14_1\">\n              <doi>10.1111/j.1460-2466.2012.01649.x</doi>\n            </citation>\n            <citation key=\"e_1_2_9_1_15_1\">\n              <doi>10.1111/jcom.12099</doi>\n            </citation>\n            <citation key=\"e_1_2_9_1_16_1\">\n              <doi>10.1111/jcom.12097</doi>\n            </citation>\n            <citation key=\"e_1_2_9_1_17_1\">\n              <doi>10.1111/jcom.12100</doi>\n            </citation>\n            <citation key=\"e_1_2_9_1_18_1\">\n              <doi>10.1027/1864-1105/a000031</doi>\n            </citation>\n            <citation key=\"e_1_2_9_1_19_1\">\n              <volume_title>Sage handbook of media processes and effects</volume_title>\n              <author>Vorderer P.</author>\n              <first_page>455</first_page>\n              <cYear>2009</cYear>\n            </citation>\n            <citation key=\"e_1_2_9_1_20_1\">\n              <doi>10.1111/j.1468-2958.2012.01434.x</doi>\n            </citation>\n            <citation key=\"e_1_2_9_1_21_1\">\n              <doi>10.1177/000276488031003005</doi>\n            </citation>\n            <citation key=\"e_1_2_9_2_2_1\">\n              <doi>10.1080/15213260701813447</doi>\n            </citation>\n            <citation key=\"e_1_2_9_2_3_1\">\n              <volume_title>Thinking, fast and slow</volume_title>\n              <author>Kahneman D.</author>\n              <cYear>2011</cYear>\n            </citation>\n            <citation key=\"e_1_2_9_2_4_1\">\n              <doi>10.1093/joc/jqx020</doi>\n            </citation>\n          </citation_list>\n        </content_item>\n      </book>\n    </crossref>\n  </doi_record>\n</doi_records>",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Appreciation and Eudaimonic Reactions to Media",
				"creators": [
					{
						"creatorType": "editor",
						"firstName": "Jan",
						"lastName": "Bulck"
					},
					{
						"creatorType": "author",
						"firstName": "Allison",
						"lastName": "Eden"
					}
				],
				"date": "2020-09-09",
				"ISBN": "9781119011071",
				"bookTitle": "The International Encyclopedia of Media Psychology",
				"edition": "1",
				"extra": "DOI: 10.1002/9781119011071.iemp0172",
				"language": "en",
				"pages": "1-9",
				"publisher": "Wiley",
				"rights": "http://doi.wiley.com/10.1002/tdm_license_1.1",
				"url": "https://onlinelibrary.wiley.com/doi/10.1002/9781119011071.iemp0172",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<doi_records>\n  <doi_record owner=\"10.1045\" timestamp=\"2016-05-13 10:02:13\">\n    <crossref>\n      <journal>\n        <journal_metadata language=\"en\">\n          <full_title>D-Lib Magazine</full_title>\n          <abbrev_title>D-Lib Magazine</abbrev_title>\n          <issn media_type=\"electronic\">1082-9873</issn>\n          <doi_data>\n            <doi>10.1045/dlib.magazine</doi>\n            <resource>http://www.dlib.org/</resource>\n          </doi_data>\n        </journal_metadata>\n        <journal_issue>\n          <publication_date media_type=\"online\">\n            <month>05</month>\n            <year>2016</year>\n          </publication_date>\n          <journal_volume>\n            <volume>22</volume>\n          </journal_volume>\n          <issue>5/6</issue>\n          <doi_data>\n            <doi>10.1045/may2016-contents</doi>\n            <resource>http://www.dlib.org/dlib/may16/05contents.html</resource>\n          </doi_data>\n        </journal_issue>\n        <journal_article publication_type=\"full_text\">\n          <titles>\n            <title>Scientific Stewardship in the Open Data and Big Data Era  Roles and Responsibilities of Stewards and Other Major Product Stakeholders</title>\n          </titles>\n          <contributors>\n            <person_name sequence=\"first\" contributor_role=\"author\">\n              <given_name>Ge</given_name>\n              <surname>Peng</surname>\n            </person_name>\n            <person_name sequence=\"additional\" contributor_role=\"author\">\n              <given_name>Nancy A.</given_name>\n              <surname>Ritchey</surname>\n            </person_name>\n            <person_name sequence=\"additional\" contributor_role=\"author\">\n              <given_name>Kenneth S.</given_name>\n              <surname>Casey</surname>\n            </person_name>\n            <person_name sequence=\"additional\" contributor_role=\"author\">\n              <given_name>Edward J.</given_name>\n              <surname>Kearns</surname>\n            </person_name>\n            <person_name sequence=\"additional\" contributor_role=\"author\">\n              <given_name>Jeffrey L.</given_name>\n              <surname>Prevette</surname>\n            </person_name>\n            <person_name sequence=\"additional\" contributor_role=\"author\">\n              <given_name>Drew</given_name>\n              <surname>Saunders</surname>\n            </person_name>\n            <person_name sequence=\"additional\" contributor_role=\"author\">\n              <given_name>Philip</given_name>\n              <surname>Jones</surname>\n            </person_name>\n            <person_name sequence=\"additional\" contributor_role=\"author\">\n              <given_name>Tom</given_name>\n              <surname>Maycock</surname>\n            </person_name>\n            <person_name sequence=\"additional\" contributor_role=\"author\">\n              <given_name>Steve</given_name>\n              <surname>Ansari</surname>\n            </person_name>\n          </contributors>\n          <publication_date media_type=\"online\">\n            <month>05</month>\n            <year>2016</year>\n          </publication_date>\n          <doi_data>\n            <doi>10.1045/may2016-peng</doi>\n            <resource>http://www.dlib.org/dlib/may16/peng/05peng.html</resource>\n          </doi_data>\n        </journal_article>\n      </journal>\n    </crossref>\n  </doi_record>\n</doi_records>",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Scientific Stewardship in the Open Data and Big Data Era  Roles and Responsibilities of Stewards and Other Major Product Stakeholders",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Ge",
						"lastName": "Peng"
					},
					{
						"creatorType": "author",
						"firstName": "Nancy A.",
						"lastName": "Ritchey"
					},
					{
						"creatorType": "author",
						"firstName": "Kenneth S.",
						"lastName": "Casey"
					},
					{
						"creatorType": "author",
						"firstName": "Edward J.",
						"lastName": "Kearns"
					},
					{
						"creatorType": "author",
						"firstName": "Jeffrey L.",
						"lastName": "Prevette"
					},
					{
						"creatorType": "author",
						"firstName": "Drew",
						"lastName": "Saunders"
					},
					{
						"creatorType": "author",
						"firstName": "Philip",
						"lastName": "Jones"
					},
					{
						"creatorType": "author",
						"firstName": "Tom",
						"lastName": "Maycock"
					},
					{
						"creatorType": "author",
						"firstName": "Steve",
						"lastName": "Ansari"
					}
				],
				"date": "05/2016",
				"DOI": "10.1045/may2016-peng",
				"ISSN": "1082-9873",
				"issue": "5/6",
				"journalAbbreviation": "D-Lib Magazine",
				"language": "en",
				"publicationTitle": "D-Lib Magazine",
				"url": "http://www.dlib.org/dlib/may16/peng/05peng.html",
				"volume": "22",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<doi_records>\n\t<doi_record owner=\"10.1300\" timestamp=\"2017-11-02 16:28:36\">\n\t\t<crossref>\n\t\t\t<journal>\n\t\t\t\t<journal_metadata language=\"en\">\n\t\t\t\t\t<full_title>Journal of Hospitality &amp; Leisure Marketing</full_title>\n\t\t\t\t\t<abbrev_title>Journal of Hospitality &amp; Leisure Marketing</abbrev_title>\n\t\t\t\t\t<issn media_type=\"print\">1050-7051</issn>\n\t\t\t\t\t<issn media_type=\"electronic\">1541-0897</issn>\n\t\t\t\t</journal_metadata>\n\t\t\t\t<journal_issue>\n\t\t\t\t\t<publication_date media_type=\"online\">\n\t\t\t\t\t\t<month>10</month>\n\t\t\t\t\t\t<day>25</day>\n\t\t\t\t\t\t<year>2008</year>\n\t\t\t\t\t</publication_date>\n\t\t\t\t\t<publication_date media_type=\"print\">\n\t\t\t\t\t\t<month>05</month>\n\t\t\t\t\t\t<day>10</day>\n\t\t\t\t\t\t<year>1996</year>\n\t\t\t\t\t</publication_date>\n\t\t\t\t\t<journal_volume>\n\t\t\t\t\t\t<volume>3</volume>\n\t\t\t\t\t</journal_volume>\n\t\t\t\t\t<issue>4</issue>\n\t\t\t\t</journal_issue>\n\t\t\t\t<journal_article publication_type=\"full_text\">\n\t\t\t\t\t<titles>\n\t\t\t\t\t\t<title>Service Value Determination:</title>\n\t\t\t\t\t\t<subtitle>An Integrative Perspective</subtitle>\n\t\t\t\t\t</titles>\n\t\t\t\t\t<contributors>\n\t\t\t\t\t\t<person_name sequence=\"first\" contributor_role=\"author\">\n\t\t\t\t\t\t\t<given_name>Rama K.</given_name>\n\t\t\t\t\t\t\t<surname>Jayanti</surname>\n\t\t\t\t\t\t\t<affiliation>a Department of Marketing, James J. Nance College of Business, Cleveland State\n\t\t\t\t\t\t\t\tUniversity, Cleveland, OH, 44115\n\t\t\t\t\t\t\t</affiliation>\n\t\t\t\t\t\t</person_name>\n\t\t\t\t\t\t<person_name sequence=\"additional\" contributor_role=\"author\">\n\t\t\t\t\t\t\t<given_name>Amit K.</given_name>\n\t\t\t\t\t\t\t<surname>Ghosh</surname>\n\t\t\t\t\t\t\t<affiliation>a Department of Marketing, James J. Nance College of Business, Cleveland State\n\t\t\t\t\t\t\t\tUniversity, Cleveland, OH, 44115\n\t\t\t\t\t\t\t</affiliation>\n\t\t\t\t\t\t</person_name>\n\t\t\t\t\t</contributors>\n\t\t\t\t\t<publication_date media_type=\"online\">\n\t\t\t\t\t\t<month>10</month>\n\t\t\t\t\t\t<day>25</day>\n\t\t\t\t\t\t<year>2008</year>\n\t\t\t\t\t</publication_date>\n\t\t\t\t\t<publication_date media_type=\"print\">\n\t\t\t\t\t\t<month>05</month>\n\t\t\t\t\t\t<day>10</day>\n\t\t\t\t\t\t<year>1996</year>\n\t\t\t\t\t</publication_date>\n\t\t\t\t\t<pages>\n\t\t\t\t\t\t<first_page>5</first_page>\n\t\t\t\t\t\t<last_page>25</last_page>\n\t\t\t\t\t</pages>\n\t\t\t\t\t<publisher_item>\n\t\t\t\t\t\t<item_number item_number_type=\"sequence-number\">2</item_number>\n\t\t\t\t\t\t<identifier id_type=\"doi\">10.1300/J150v03n04_02</identifier>\n\t\t\t\t\t</publisher_item>\n\t\t\t\t\t<doi_data>\n\t\t\t\t\t\t<doi>10.1300/J150v03n04_02</doi>\n\t\t\t\t\t\t<resource>https://www.tandfonline.com/doi/full/10.1300/J150v03n04_02</resource>\n\t\t\t\t\t\t<collection property=\"crawler-based\">\n\t\t\t\t\t\t\t<item crawler=\"iParadigms\">\n\t\t\t\t\t\t\t\t<resource>https://www.tandfonline.com/doi/pdf/10.1300/J150v03n04_02</resource>\n\t\t\t\t\t\t\t</item>\n\t\t\t\t\t\t</collection>\n\t\t\t\t\t</doi_data>\n\t\t\t\t</journal_article>\n\t\t\t</journal>\n\t\t</crossref>\n\t</doi_record>\n</doi_records>",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Service Value Determination: An Integrative Perspective",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Rama K.",
						"lastName": "Jayanti"
					},
					{
						"creatorType": "author",
						"firstName": "Amit K.",
						"lastName": "Ghosh"
					}
				],
				"date": "1996-05-10",
				"DOI": "10.1300/J150v03n04_02",
				"ISSN": "1050-7051, 1541-0897",
				"issue": "4",
				"journalAbbreviation": "Journal of Hospitality & Leisure Marketing",
				"language": "en",
				"pages": "5-25",
				"publicationTitle": "Journal of Hospitality & Leisure Marketing",
				"url": "https://www.tandfonline.com/doi/full/10.1300/J150v03n04_02",
				"volume": "3",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "<doi_records>\r\n  <doi_record owner=\"10.59350\" timestamp=\"2023-10-25 13:27:18\">\r\n    <crossref>\r\n      <posted_content type=\"other\" language=\"en\">\r\n        <group_title>Social sciences</group_title>\r\n        <contributors>\r\n          <person_name contributor_role=\"author\" sequence=\"first\">\r\n            <given_name>Sebastian</given_name>\r\n            <surname>Karcher</surname>\r\n          </person_name>\r\n        </contributors>\r\n        <titles>\r\n          <title>QDR Creates New Course on Data Management for CITI</title>\r\n        </titles>\r\n        <posted_date>\r\n          <month>3</month>\r\n          <day>31</day>\r\n          <year>2023</year>\r\n        </posted_date>\r\n        <institution>\r\n          <institution_name>QDR Blog</institution_name>\r\n        </institution>\r\n        <item_number item_number_type=\"uuid\">e1574118b63a40b0b56a605bf5e99c48</item_number>\r\n        <program name=\"AccessIndicators\">\r\n          <license_ref applies_to=\"vor\">https://creativecommons.org/licenses/by/4.0/legalcode</license_ref>\r\n          <license_ref applies_to=\"tdm\">https://creativecommons.org/licenses/by/4.0/legalcode</license_ref>\r\n        </program>\r\n        <doi_data>\r\n          <doi>10.59350/5znft-x4j11</doi>\r\n          <resource>https://qdr.syr.edu/qdr-blog/qdr-creates-new-course-data-management-citi</resource>\r\n          <collection property=\"text-mining\">\r\n            <item>\r\n              <resource mime_type=\"text/html\">https://qdr.syr.edu/qdr-blog/qdr-creates-new-course-data-management-citi</resource>\r\n            </item>\r\n          </collection>\r\n        </doi_data>\r\n        <citation_list />\r\n      </posted_content>\r\n    </crossref>\r\n  </doi_record>\r\n</doi_records>",
		"items": [
			{
				"itemType": "blogPost",
				"title": "QDR Creates New Course on Data Management for CITI",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Sebastian",
						"lastName": "Karcher"
					}
				],
				"date": "2023-3-31",
				"blogTitle": "QDR Blog",
				"extra": "DOI: 10.59350/5znft-x4j11",
				"language": "en",
				"rights": "https://creativecommons.org/licenses/by/4.0/legalcode",
				"url": "https://qdr.syr.edu/qdr-blog/qdr-creates-new-course-data-management-citi",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<doi_records>\n    <doi_record owner=\"10.1021\" timestamp=\"2024-10-14 14:09:14\">\n        <crossref>\n            <journal>\n                <journal_metadata language=\"en\">\n                    <full_title>Industrial &amp; Engineering Chemistry Research</full_title>\n                    <abbrev_title>Ind. Eng. Chem. Res.</abbrev_title>\n                    <issn media_type=\"print\">0888-5885</issn>\n                    <issn media_type=\"electronic\">1520-5045</issn>\n                </journal_metadata>\n                <journal_article publication_type=\"full_text\">\n                    <titles>\n                        <title>\n                            Investigation of CO\n                            <sub>2</sub>\n                            Reduction to Formate in an Industrial-Scale Electrochemical Cell through Transient Numerical Modeling\n                        </title>\n                    </titles>\n                    <contributors>\n                        <person_name sequence=\"first\" contributor_role=\"author\">\n                            <given_name>Mohammad</given_name>\n                            <surname>Bahreini</surname>\n                            <affiliation>Department of Chemical Engineering and Biotechnological Engineering, Université de Sherbrooke, 2500 Boulevard de L’Université, Sherbrooke, QC J1K 2R1, Canada</affiliation>\n                            <ORCID authenticated=\"true\">https://orcid.org/0009-0006-7234-5157</ORCID>\n                        </person_name>\n                        <person_name sequence=\"additional\" contributor_role=\"author\">\n                            <given_name>Martin</given_name>\n                            <surname>Désilets</surname>\n                            <affiliation>Department of Chemical Engineering and Biotechnological Engineering, Université de Sherbrooke, 2500 Boulevard de L’Université, Sherbrooke, QC J1K 2R1, Canada</affiliation>\n                        </person_name>\n                        <person_name sequence=\"additional\" contributor_role=\"author\">\n                            <given_name>Ergys</given_name>\n                            <surname>Pahija</surname>\n                            <affiliation>Department of Chemical Engineering and Biotechnological Engineering, Université de Sherbrooke, 2500 Boulevard de L’Université, Sherbrooke, QC J1K 2R1, Canada</affiliation>\n                            <ORCID authenticated=\"true\">https://orcid.org/0000-0003-0859-6489</ORCID>\n                        </person_name>\n                        <person_name sequence=\"additional\" contributor_role=\"author\">\n                            <given_name>Ulrich</given_name>\n                            <surname>Legrand</surname>\n                            <affiliation>Electro Carbon, 3275 Chemin de l’Industrie, St-Mathieu-de-Beloeil, QC J3G 0M8, Canada</affiliation>\n                            <affiliation>Department of Chemical Engineering, Polytechnique Montreal, 2500 Chem. de Polytechnique, Montréal, QC H3T 1J4 ,Canada</affiliation>\n                        </person_name>\n                        <person_name sequence=\"additional\" contributor_role=\"author\">\n                            <given_name>Jiaxun</given_name>\n                            <surname>Guo</surname>\n                            <affiliation>Electro Carbon, 3275 Chemin de l’Industrie, St-Mathieu-de-Beloeil, QC J3G 0M8, Canada</affiliation>\n                        </person_name>\n                        <person_name sequence=\"additional\" contributor_role=\"author\">\n                            <given_name>Arthur G.</given_name>\n                            <surname>Fink</surname>\n                            <affiliation>Electro Carbon, 3275 Chemin de l’Industrie, St-Mathieu-de-Beloeil, QC J3G 0M8, Canada</affiliation>\n                        </person_name>\n                    </contributors>\n                    <publication_date media_type=\"online\">\n                        <month>10</month>\n                        <day>14</day>\n                        <year>2024</year>\n                    </publication_date>\n                    <publisher_item>\n                        <item_number item_number_type=\"article_number\">acs.iecr.4c03239</item_number>\n                        <identifier id_type=\"doi\">10.1021/acs.iecr.4c03239</identifier>\n                    </publisher_item>\n                    <program name=\"fundref\">\n                        <assertion name=\"fundgroup\">\n                            <assertion name=\"funder_name\">\n                                Natural Sciences and Engineering Research Council of Canada\n                                <assertion name=\"funder_identifier\">http://dx.doi.org/10.13039/501100000038</assertion>\n                            </assertion>\n                            <assertion name=\"award_number\">ALLRP 580893 - 22</assertion>\n                        </assertion>\n                        <assertion name=\"fundgroup\">\n                            <assertion name=\"funder_name\">\n                                Mitacs\n                                <assertion name=\"funder_identifier\">http://dx.doi.org/10.13039/501100004489</assertion>\n                            </assertion>\n                        </assertion>\n                        <assertion name=\"fundgroup\">\n                            <assertion name=\"funder_name\">electro carbon Inc</assertion>\n                        </assertion>\n                    </program>\n                    <program name=\"AccessIndicators\">\n                        <license_ref applies_to=\"stm-asf\">https://doi.org/10.15223/policy-029</license_ref>\n                        <license_ref applies_to=\"stm-asf\">https://doi.org/10.15223/policy-037</license_ref>\n                        <license_ref applies_to=\"stm-asf\">https://doi.org/10.15223/policy-045</license_ref>\n                    </program>\n                    <doi_data>\n                        <doi>10.1021/acs.iecr.4c03239</doi>\n                        <resource>https://pubs.acs.org/doi/10.1021/acs.iecr.4c03239</resource>\n                        <collection property=\"unspecified\">\n                            <item>\n                                <resource content_version=\"vor\" mime_type=\"application/pdf\">https://pubs.acs.org/doi/pdf/10.1021/acs.iecr.4c03239</resource>\n                            </item>\n                        </collection>\n                        <collection property=\"crawler-based\">\n                            <item crawler=\"iParadigms\">\n                                <resource>https://pubs.acs.org/doi/pdf/10.1021/acs.iecr.4c03239</resource>\n                            </item>\n                        </collection>\n                    </doi_data>\n                    <citation_list>\n                        <citation key=\"ref1/cit1\">\n                            <doi>10.1021/acs.iecr.1c01316</doi>\n                        </citation>\n                        <citation key=\"ref2/cit2\">\n                            <volume_title>Advances in carbon capture</volume_title>\n                            <author>Yoro K. O.</author>\n                            <first_page>3</first_page>\n                            <cYear>2020</cYear>\n                            <doi provider=\"crossref\">10.1016/B978-0-12-819657-1.00001-3</doi>\n                        </citation>\n                        <citation key=\"ref3/cit3\">\n                            <doi>10.1016/j.apcatb.2015.04.055</doi>\n                        </citation>\n                        <citation key=\"ref4/cit4\">\n                            <doi>10.1039/C8EE00097B</doi>\n                        </citation>\n                        <citation key=\"ref5/cit5\">\n                            <doi>10.1002/cssc.201600394</doi>\n                        </citation>\n                        <citation key=\"ref6/cit6\">\n                            <doi>10.1016/j.cej.2022.139663</doi>\n                        </citation>\n                        <citation key=\"ref7/cit7\">\n                            <doi provider=\"crossref\">10.1016/B978-0-12-820244-9.00001-9</doi>\n                            <unstructured_citation>\n                                Reichle, D. E.\n                                <i>The global carbon cycle and climate change</i>\n                                ; Elsevier, 2019, 1, 388.\n                            </unstructured_citation>\n                        </citation>\n                        <citation key=\"ref8/cit8\">\n                            <doi>10.1149/2.0741713jes</doi>\n                        </citation>\n                        <citation key=\"ref9/cit9\">\n                            <doi>10.1016/j.apcatb.2021.120447</doi>\n                        </citation>\n                        <citation key=\"ref10/cit10\">\n                            <doi>10.1016/j.jcat.2015.11.014</doi>\n                        </citation>\n                        <citation key=\"ref11/cit11\">\n                            <doi>10.1021/acsenergylett.3c00489</doi>\n                        </citation>\n                        <citation key=\"ref12/cit12\">\n                            <doi>10.1016/j.seppur.2023.123811</doi>\n                        </citation>\n                        <citation key=\"ref13/cit13\">\n                            <doi>10.1021/acssuschemeng.0c05215</doi>\n                        </citation>\n                        <citation key=\"ref14/cit14\">\n                            <doi>10.1002/cctc.202300977</doi>\n                        </citation>\n                        <citation key=\"ref15/cit15\">\n                            <doi>10.1016/j.cej.2024.148972</doi>\n                        </citation>\n                        <citation key=\"ref16/cit16\">\n                            <doi>10.1038/s41560-021-00973-9</doi>\n                        </citation>\n                        <citation key=\"ref17/cit17\">\n                            <doi>10.1016/j.joule.2020.03.013</doi>\n                        </citation>\n                        <citation key=\"ref18/cit18\">\n                            <doi>10.1039/D2TA02086F</doi>\n                        </citation>\n                        <citation key=\"ref19/cit19\">\n                            <doi>10.1039/C8CP01319E</doi>\n                        </citation>\n                        <citation key=\"ref20/cit20\">\n                            <doi>10.1039/D0CS00230E</doi>\n                        </citation>\n                        <citation key=\"ref21/cit21\">\n                            <doi>10.1021/acscatal.1c02783</doi>\n                        </citation>\n                        <citation key=\"ref22/cit22\">\n                            <doi>10.1016/S0022-0728(01)00729-X</doi>\n                        </citation>\n                        <citation key=\"ref23/cit23\">\n                            <doi>10.1021/acs.accounts.8b00010</doi>\n                        </citation>\n                        <citation key=\"ref24/cit24\">\n                            <doi>10.1016/j.jcou.2019.02.007</doi>\n                        </citation>\n                        <citation key=\"ref25/cit25\">\n                            <doi>10.1021/acssuschemeng.2c06129</doi>\n                        </citation>\n                        <citation key=\"ref26/cit26\">\n                            <doi>10.1016/j.isci.2022.104011</doi>\n                        </citation>\n                        <citation key=\"ref27/cit27\">\n                            <doi>10.1021/accountsmr.1c00004</doi>\n                        </citation>\n                        <citation key=\"ref28/cit28\">\n                            <doi>10.1016/j.matre.2023.100177</doi>\n                        </citation>\n                        <citation key=\"ref29/cit29\">\n                            <doi>10.1016/j.joule.2019.07.009</doi>\n                        </citation>\n                        <citation key=\"ref30/cit30\">\n                            <doi>10.1016/j.renene.2022.01.085</doi>\n                        </citation>\n                        <citation key=\"ref31/cit31\">\n                            <doi>10.1016/j.matre.2023.100177</doi>\n                        </citation>\n                        <citation key=\"ref32/cit32\">\n                            <doi>10.1016/j.xpro.2021.100889</doi>\n                        </citation>\n                        <citation key=\"ref33/cit33\">\n                            <doi>10.3389/fenrg.2020.00005</doi>\n                        </citation>\n                        <citation key=\"ref34/cit34\">\n                            <doi>10.1002/elsa.202100160</doi>\n                        </citation>\n                        <citation key=\"ref35/cit35\">\n                            <doi>10.1016/j.joule.2019.07.021</doi>\n                        </citation>\n                        <citation key=\"ref36/cit36\">\n                            <doi>10.1016/j.xcrp.2021.100522</doi>\n                        </citation>\n                        <citation key=\"ref37/cit37\">\n                            <doi>10.1021/acs.iecr.0c02358</doi>\n                        </citation>\n                        <citation key=\"ref38/cit38\">\n                            <doi>10.1021/acssuschemeng.0c07694</doi>\n                        </citation>\n                        <citation key=\"ref39/cit39\">\n                            <doi>10.1021/acssuschemeng.0c07387</doi>\n                        </citation>\n                        <citation key=\"ref40/cit40\">\n                            <doi>10.1016/j.ijhydene.2011.12.148</doi>\n                        </citation>\n                        <citation key=\"ref41/cit41\">\n                            <doi>10.1021/acsenergylett.0c02184</doi>\n                        </citation>\n                        <citation key=\"ref42/cit42\">\n                            <doi>10.1016/j.electacta.2018.02.100</doi>\n                        </citation>\n                        <citation key=\"ref43/cit43\">\n                            <doi>10.1016/j.jpowsour.2016.02.043</doi>\n                        </citation>\n                        <citation key=\"ref44/cit44\">\n                            <doi>10.1016/j.jpowsour.2022.230998</doi>\n                        </citation>\n                        <citation key=\"ref45/cit45\">\n                            <doi>10.1016/j.matre.2023.100194</doi>\n                        </citation>\n                        <citation key=\"ref46/cit46\">\n                            <unstructured_citation>Legrand, U. Electrochemical cell for carbon dioxide reduction towards liquid chemicals. Google Patents: 2023.</unstructured_citation>\n                        </citation>\n                        <citation key=\"ref47/cit47\">\n                            <doi>10.1016/j.electacta.2021.138987</doi>\n                        </citation>\n                        <citation key=\"ref48/cit48\">\n                            <doi>10.1073/pnas.1713164114</doi>\n                        </citation>\n                        <citation key=\"ref49/cit49\">\n                            <doi>10.1016/j.marchem.2005.11.001</doi>\n                        </citation>\n                        <citation key=\"ref50/cit50\">\n                            <volume_title>Elements of chemical reaction engineering</volume_title>\n                            <author>Fogler H. S.</author>\n                            <cYear>2020</cYear>\n                        </citation>\n                        <citation key=\"ref51/cit51\">\n                            <volume_title>Chemical kinetics and reaction dynamics</volume_title>\n                            <author>Houston P. L.</author>\n                            <cYear>2012</cYear>\n                        </citation>\n                        <citation key=\"ref52/cit52\">\n                            <doi>10.1017/S0022112067001375</doi>\n                        </citation>\n                        <citation key=\"ref53/cit53\">\n                            <doi>10.1016/j.coche.2016.02.006</doi>\n                        </citation>\n                        <citation key=\"ref54/cit54\">\n                            <volume_title>Multicomponent mass transfer</volume_title>\n                            <author>Taylor R.</author>\n                            <cYear>1993</cYear>\n                        </citation>\n                        <citation key=\"ref55/cit55\">\n                            <volume_title>Chemically reacting flow: theory, modeling, and simulation</volume_title>\n                            <author>Kee R. J.</author>\n                            <cYear>2017</cYear>\n                            <doi provider=\"crossref\">10.1002/9781119186304</doi>\n                        </citation>\n                        <citation key=\"ref56/cit56\">\n                            <volume_title>Fundamentals of momentum, heat, and mass transfer</volume_title>\n                            <author>Welty J.</author>\n                            <cYear>2020</cYear>\n                        </citation>\n                        <citation key=\"ref57/cit57\">\n                            <doi>10.1039/D1SC05743J</doi>\n                        </citation>\n                        <citation key=\"ref58/cit58\">\n                            <doi>10.1002/cssc.201600693</doi>\n                        </citation>\n                    </citation_list>\n                    <component_list>\n                        <component parent_relation=\"isPartOf\">\n                            <titles>\n                                <title>Investigation of CO2 Reduction to Formate in an Industrial-Scale Electrochemical Cell through Transient Numerical Modeling</title>\n                            </titles>\n                            <description>Supplemental Information for 10.1021/acs.iecr.4c03239</description>\n                            <format mime_type=\"text/xml\"/>\n                            <doi_data>\n                                <doi>10.1021/acs.iecr.4c03239.s001</doi>\n                                <resource>https://pubs.acs.org/doi/suppl/10.1021/acs.iecr.4c03239/suppl_file/ie4c03239_si_001.pdf</resource>\n                            </doi_data>\n                        </component>\n                    </component_list>\n                </journal_article>\n            </journal>\n        </crossref>\n    </doi_record>\n</doi_records>",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Investigation of CO<sub>2</sub> Reduction to Formate in an Industrial-Scale Electrochemical Cell through Transient Numerical Modeling",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Mohammad",
						"lastName": "Bahreini"
					},
					{
						"creatorType": "author",
						"firstName": "Martin",
						"lastName": "Désilets"
					},
					{
						"creatorType": "author",
						"firstName": "Ergys",
						"lastName": "Pahija"
					},
					{
						"creatorType": "author",
						"firstName": "Ulrich",
						"lastName": "Legrand"
					},
					{
						"creatorType": "author",
						"firstName": "Jiaxun",
						"lastName": "Guo"
					},
					{
						"creatorType": "author",
						"firstName": "Arthur G.",
						"lastName": "Fink"
					}
				],
				"date": "2024-10-14",
				"DOI": "10.1021/acs.iecr.4c03239",
				"ISSN": "0888-5885, 1520-5045",
				"journalAbbreviation": "Ind. Eng. Chem. Res.",
				"language": "en",
				"pages": "acs.iecr.4c03239",
				"publicationTitle": "Industrial & Engineering Chemistry Research",
				"rights": "https://doi.org/10.15223/policy-029",
				"url": "https://pubs.acs.org/doi/10.1021/acs.iecr.4c03239",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
