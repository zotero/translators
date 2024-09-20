{
	"translatorID": "0a61e167-de9a-4f93-a68a-628b48855909",
	"label": "Crossref REST",
	"creator": "Martynas Bagdonas",
	"target": "",
	"minVersion": "5.0.0",
	"maxVersion": "",
	"priority": 90,
	"inRepository": true,
	"translatorType": 8,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-09-12 15:10:05"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018

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

// Based on Crossref Unixref XML translator

// The translator uses the newer REST API
// https://github.com/Crossref/rest-api-doc
// https://github.com/Crossref/rest-api-doc/blob/master/api_format.md
// http://api.crossref.org/types

// REST API documentation not always reflect the actual API
// and some fields are undocumented e.g. resource, institution, etc. are missing

// Some fields are sometimes missing for certain items when compared to the Crossref Unixref XML
// translator e.g. ISBN, pages, editors, contributors, language, etc.

function removeUnsupportedMarkup(text) {
	let markupRE = /<(\/?)(\w+)[^<>]*>/gi;
	let supportedMarkup = ['i', 'b', 'sub', 'sup', 'span', 'sc'];
	let transformMarkup = {
		'scp': {
			open: '<span style="font-variant:small-caps;">',
			close: '</span>'
		}
	};
	// Remove CDATA markup
	text = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
	text = text.replace(markupRE, function (m, close, name) {
		name = name.toLowerCase();
		if (supportedMarkup.includes(name)) {
			return (close ? '</' : '<') + name + '>';
		}
		let newMarkup = transformMarkup[name];
		if (newMarkup) {
			return close ? newMarkup.close : newMarkup.open;
		}
		return '';
	});
	return text;
}

function decodeEntities(n) {
	let escaped = {
		'&amp;': '&',
		'&quot;': '"',
		'&lt;': '<',
		'&gt;': '>'
	};
	return n.replace(/\n/g, '').replace(/(&quot;|&lt;|&gt;|&amp;)/g, (str, item) => escaped[item]);
}

function fixAuthorCapitalization(string) {
	// Try to use capitalization function from Zotero Utilities,
	// because the current one doesn't support unicode names.
	// Can't fix this either because ZU.XRegExp.replace is
	// malfunctioning when calling from translators.
	if (ZU.capitalizeName) {
		return ZU.capitalizeName(string);
	}
	if (typeof string === 'string' && string.toUpperCase() === string) {
		string = string.toLowerCase().replace(/\b[a-z]/g, function (m) {
			return m[0].toUpperCase();
		});
	}
	return string;
}

function parseCreators(result, item, typeOverrideMap) {
	let types = ['author', 'editor', 'chair', 'translator'];

	for (let type of types) {
		if (result[type]) {
			let creatorType = typeOverrideMap && typeOverrideMap[type] !== undefined
				? typeOverrideMap[type]
				: (type === 'author' || type === 'editor' || type === 'translator' ? type : 'contributor');

			if (!creatorType) {
				continue;
			}

			for (let creator of result[type]) {
				let newCreator = {};
				newCreator.creatorType = creatorType;

				if (creator.name) {
					newCreator.fieldMode = 1;
					newCreator.lastName = creator.name;
				}
				else {
					newCreator.firstName = fixAuthorCapitalization(creator.given);
					newCreator.lastName = fixAuthorCapitalization(creator.family);
					if (!newCreator.firstName) {
						newCreator.fieldMode = 1;
					}
				}

				item.creators.push(newCreator);
			}
		}
	}
}

function parseDate(dateObj) {
	if (dateObj && dateObj['date-parts'] && dateObj['date-parts'][0]) {
		let [year, month, day] = dateObj['date-parts'][0];
		if (year) {
			if (month) {
				if (day) {
					return year + '-' + month.toString().padStart(2, '0') + '-' + day.toString().padStart(2, '0');
				}
				else {
					return month.toString().padStart(2, '0') + '/' + year;
				}
			}
			else {
				return year.toString();
			}
		}
	}
	return null;
}

function processCrossref(json) {
	json = JSON.parse(json);
	let creatorTypeOverrideMap = {};
	for (let result of json.message.items) {
		let item;
		if (['journal', 'journal-article', 'journal-volume', 'journal-issue'].includes(result.type)) {
			item = new Zotero.Item('journalArticle');
		}
		else if (['report', 'report-series', 'report-component'].includes(result.type)) {
			item = new Zotero.Item('report');
		}
		else if (['book', 'book-series', 'book-set', 'book-track',
			'monograph', 'reference-book', 'edited-book'].includes(result.type)) {
			item = new Zotero.Item('book');
		}
		else if (['book-chapter', 'book-part', 'book-section', 'reference-entry'].includes(result.type)) {
			item = new Zotero.Item('bookSection');
			creatorTypeOverrideMap = { author: 'bookAuthor' };
		}
		else if (result.type === 'other' && result.ISBN && result['container-title']) {
			item = new Zotero.Item('bookSection');
			if (result['container-title'].length >= 2) {
				item.seriesTitle = result['container-title'][0];
				item.bookTitle = result['container-title'][1];
			}
			else {
				item.bookTitle = result['container-title'][0];
			}
			creatorTypeOverrideMap = { author: 'bookAuthor' };
		}
		else if (['standard'].includes(result.type)) {
			item = new Zotero.Item('standard');
		}
		else if (['dataset', 'database'].includes(result.type)) {
			item = new Zotero.Item('dataset');
		}
		else if (['proceedings', 'proceedings-article', 'proceedings-series'].includes(result.type)) {
			item = new Zotero.Item('conferencePaper');
		}
		else if (result.type === 'dissertation') {
			item = new Zotero.Item('thesis');
			item.date = parseDate(result.approved);
			item.thesisType = result.degree && result.degree[0] && result.degree[0].replace(/\(.+\)/, '');
		}
		else if (result.type === 'posted-content') {
			if (result.subtype === 'preprint') {
				item = new Zotero.Item('preprint');
				item.repository = result['group-title'];
			}
			else {
				item = new Zotero.Item('blogPost');
				if (result.institution && result.institution.length) {
					item.blogTitle = result.institution[0].name && result.institution[0].name;
				}
			}
		}
		else if (result.type === 'peer-review') {
			item = new Zotero.Item('manuscript');
			item.type = 'peer review';
			if (!result.author) {
				item.creators.push({ lastName: 'Anonymous Reviewer', fieldMode: 1, creatorType: 'author' });
			}
			if (result.relation && result.relation['is-review-of'] && result.relation['is-review-of'].length) {
				let identifier;
				let reviewOf = result.relation['is-review-of'][0];
				let type = reviewOf['id-type'];
				let id = reviewOf.id;
				if (type === 'doi') {
					identifier = '<a href="https://doi.org/' + id + '">https://doi.org/' + id + '</a>';
				}
				else if (type === 'url') {
					identifier = '<a href=\"' + id + '\">' + id + '</a>';
				}
				else {
					identifier = id;
				}
				item.notes.push('Review of ' + identifier);
			}
		}
		else {
			item = new Zotero.Item('document');
		}

		parseCreators(result, item, creatorTypeOverrideMap);

		if (result.description) {
			item.notes.push(result.description);
		}

		item.abstractNote = result.abstract && removeUnsupportedMarkup(result.abstract);
		item.pages = result.page;
		item.ISBN = result.ISBN && result.ISBN.join(', ');
		item.ISSN = result.ISSN && result.ISSN.join(', ');
		item.issue = result.issue;
		item.volume = result.volume;
		item.language = result.language;
		item.edition = result['edition-number'];
		item.university = item.institution = item.publisher = result.publisher;

		if (result['container-title'] && result['container-title'][0]) {
			if (['journalArticle'].includes(item.itemType)) {
				item.publicationTitle = result['container-title'][0];
			}
			else if (['conferencePaper'].includes(item.itemType)) {
				item.proceedingsTitle = result['container-title'][0];
			}
			else if (['book'].includes(item.itemType)) {
				item.series = result['container-title'][0];
			}
			else if (['bookSection'].includes(item.itemType)) {
				item.bookTitle = result['container-title'][0];
			}
			else {
				item.seriesTitle = result['container-title'][0];
			}
		}

		item.conferenceName = result.event && result.event.name;

		// "short-container-title" often has the same value as "container-title", so it can be ignored
		if (result['short-container-title'] && result['short-container-title'][0] !== result['container-title'][0]) {
			item.journalAbbreviation = result['short-container-title'][0];
		}

		if (result.event && result.event.location) {
			item.place = result.event.location;
		}
		else if (result.institution && result.institution[0] && result.institution[0].place) {
			item.place = result.institution[0].place.join(', ');
		}
		else {
			item.place = result['publisher-location'];
		}

		item.institution = item.university = result.institution && result.institution[0] && result.institution[0].name;

		// Prefer print to other dates
		if (parseDate(result['published-print'])) {
			item.date = parseDate(result['published-print']);
		}
		else if (parseDate(result.issued)) {
			item.date = parseDate(result.issued);
		}

		// For item types where DOI isn't supported, it will be automatically added to the Extra field.
		// However, this won't show up in the translator tests
		item.DOI = result.DOI;

		item.url = result.resource && result.resource.primary && result.resource.primary.URL;

		// Using only the first license
		item.rights = result.license && result.license[0] && result.license[0].URL;

		if (result.title && result.title[0]) {
			item.title = result.title[0];
			if (result.subtitle && result.subtitle[0]) {
				// Avoid duplicating the subtitle if it already exists in the title
				if (item.title.toLowerCase().indexOf(result.subtitle[0].toLowerCase()) < 0) {
					// Sometimes title already has a colon
					if (item.title[item.title.length - 1] !== ':') {
						item.title += ':';
					}
					item.title += ' ' + result.subtitle[0];
				}
			}
			item.title = removeUnsupportedMarkup(item.title);
		}

		if (!item.title) {
			item.title = '[No title found]';
		}

		// Check if there are potential issues with character encoding and try to fix them.
		// E.g., in 10.1057/9780230391116.0016, the en dash in the title is displayed as â<80><93>,
		// which is what you get if you decode a UTF-8 en dash (<E2><80><93>) as Latin-1 and then serve
		// as UTF-8 (<C3><A2> <C2><80> <C2><93>)
		for (let field in item) {
			if (typeof item[field] != 'string') {
				continue;
			}
			// Check for control characters that should never be in strings from Crossref
			if (/[\u007F-\u009F]/.test(item[field])) {
				// <E2><80><93> -> %E2%80%93 -> en dash
				try {
					item[field] = decodeURIComponent(escape(item[field]));
				}
					// If decoding failed, just strip control characters
					// https://forums.zotero.org/discussion/102271/lookup-failed-for-doi
				catch (e) {
					item[field] = item[field].replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
				}
			}
			item[field] = decodeEntities(item[field]);
		}
		item.libraryCatalog = 'Crossref';
		item.complete();
	}
}

function detectSearch(item) {
	return false;
}

function doSearch(item) {
	let query = null;

	if (item.DOI) {
		if (Array.isArray(item.DOI)) {
			query = '?filter=doi:' + item.DOI.map(x => ZU.cleanDOI(x)).filter(x => x).join(',doi:');
		}
		else {
			query = '?filter=doi:' + ZU.cleanDOI(item.DOI);
		}
	}
	else if (item.query) {
		query = '?query.bibliographic=' + encodeURIComponent(item.query);
	}
	else {
		return;
	}

	// Note: Cannot speed up the request by selecting only the necessary fields because Crossref
	// throws errors for selecting certain fields, e.g. resource, institution, etc.
	// TODO: Try to test this again in future
	// let selectedFields = [
	// 	'type', 'ISBN', 'container-title', 'author', 'editor', 'chair', 'translator',
	// 	'abstract', 'page', 'ISSN', 'issue', 'volume', 'language', 'edition-number',
	// 	'publisher', 'short-container-title', 'event', 'institution', 'publisher-location',
	// 	'published-print', 'issued', 'DOI', 'resource', 'license', 'title', 'subtitle',
	// 	'approved', 'degree', 'subtype', 'group-title', 'relation'
	// ];
	// query += '&select=' + encodeURIComponent(selectedFields.join(','));

	if (Z.getHiddenPref('CrossrefREST.email')) {
		query += '&mailto=' + Z.getHiddenPref('CrossrefREST.email');
	}

	ZU.doGet('https://api.crossref.org/works/' + query, function (responseText) {
		processCrossref(responseText);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "search",
		"input": {
			"DOI": "10.1109/isscc.2017.7870285"
		},
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
				"date": "02/2017",
				"DOI": "10.1109/isscc.2017.7870285",
				"conferenceName": "2017 IEEE International Solid- State Circuits Conference - (ISSCC)",
				"libraryCatalog": "Crossref",
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
		"type": "search",
		"input": {
			"DOI": "10.1111/1574-6941.12040"
		},
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Microbial community changes at a terrestrial volcanic CO<sub>2</sub>vent induced by soil acidification and anaerobic microhabitats within the soil column",
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
				"ISSN": "0168-6496",
				"issue": "1",
				"journalAbbreviation": "FEMS Microbiol Ecol",
				"language": "en",
				"libraryCatalog": "Crossref",
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
		"type": "search",
		"input": {
			"DOI": "10.2747/1539-7216.50.2.197"
		},
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Chinese<i>Hukou</i>System at 50",
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
				"language": "en",
				"libraryCatalog": "Crossref",
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
		"type": "search",
		"input": {
			"DOI": "10.17077/etd.xnw0xnau"
		},
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
				"date": "1958",
				"libraryCatalog": "Crossref",
				"place": "Iowa City, IA, United States",
				"rights": "http://rightsstatements.org/vocab/InC/1.0/",
				"thesisType": "Doctor of Philosophy",
				"university": "The University of Iowa",
				"url": "https://iro.uiowa.edu/esploro/outputs/doctoral/9983777035702771",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.31219/osf.io/8ag3w"
		},
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
				"libraryCatalog": "Open Science Framework",
				"repository": "Center for Open Science",
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
		"type": "search",
		"input": {
			"DOI": "10.21468/SciPost.Report.10"
		},
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
				"date": "2016-09-08",
				"libraryCatalog": "Crossref",
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
		"type": "search",
		"input": {
			"DOI": "10.4086/cjtcs.2012.002"
		},
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
				"libraryCatalog": "Crossref",
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
		"type": "search",
		"input": {
			"DOI": "10.1002/9781119011071.iemp0172"
		},
		"items": [
			{
				"itemType": "bookSection",
				"title": "Appreciation and Eudaimonic Reactions to Media",
				"creators": [
					{
						"creatorType": "bookAuthor",
						"firstName": "Allison",
						"lastName": "Eden"
					}
				],
				"date": "2020-09-09",
				"ISBN": "9781119011071",
				"abstractNote": "Entertainment has historically been associated with enjoyment. Yet, many experiences considered under the label of entertainment are not particularly            enjoyable            for viewers, and may instead evoke feelings of sadness, pensiveness, or mixed affect. Attempting to answer the question of why audiences would select media which do not promote hedonic pleasure, researchers have suggested that appreciation may better describe the experience of liking media which provokes mixed affect. Appreciation of media is thought to promote long‐term goals such as life improvement and self‐betterment, in line with the philosophical concept of eudaimonia. This entry examines appreciation‐based responses to media in terms of short‐ and long‐term outcomes.",
				"bookTitle": "The International Encyclopedia of Media Psychology",
				"edition": "1",
				"language": "en",
				"libraryCatalog": "Crossref",
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
		"type": "search",
		"input": {
			"DOI": "10.1045/may2016-peng"
		},
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
				"language": "en",
				"libraryCatalog": "Crossref",
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
		"type": "search",
		"input": {
			"DOI": "10.1300/J150v03n04_02"
		},
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
				"DOI": "10.1300/j150v03n04_02",
				"ISSN": "1050-7051, 1541-0897",
				"issue": "4",
				"language": "en",
				"libraryCatalog": "Crossref",
				"pages": "5-25",
				"publicationTitle": "Journal of Hospitality & Leisure Marketing",
				"shortTitle": "Service Value Determination",
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
		"type": "search",
		"input": {
			"DOI": "10.59350/5znft-x4j11"
		},
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
				"date": "2023-03-31",
				"blogTitle": "QDR Blog",
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
		"type": "search",
		"input": {
			"DOI": "10.26509/frbc-wp-200614"
		},
		"items": [
			{
				"itemType": "report",
				"title": "Co-Movement in Sticky Price Models with Durable Goods",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Charles T.",
						"lastName": "Carlstrom"
					},
					{
						"creatorType": "author",
						"firstName": "Timothy Stephen",
						"lastName": "Fuerst"
					}
				],
				"date": "11/2006",
				"institution": "Federal Reserve Bank of Cleveland",
				"libraryCatalog": "Crossref",
				"place": "Cleveland, OH",
				"seriesTitle": "Working paper (Federal Reserve Bank of Cleveland)",
				"url": "https://www.clevelandfed.org/publications/working-paper/wp-0614-co-movement-in-sticky-price-models-with-durable-goods",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.3389/978-2-88966-016-2"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Biobanks as Essential Tools for Translational Research: The Belgian Landscape",
				"creators": [
					{
						"creatorType": "editor",
						"firstName": "Sofie J. S",
						"lastName": "Bekaert"
					},
					{
						"creatorType": "editor",
						"firstName": "Annelies",
						"lastName": "Debucquoy"
					},
					{
						"creatorType": "editor",
						"firstName": "Veronique",
						"lastName": "T’Joen"
					},
					{
						"creatorType": "editor",
						"firstName": "Laurent Georges",
						"lastName": "Dollé"
					},
					{
						"creatorType": "editor",
						"firstName": "Loes",
						"lastName": "Linsen"
					}
				],
				"date": "2020",
				"ISBN": "9782889660162",
				"libraryCatalog": "Crossref",
				"publisher": "Frontiers Media SA",
				"series": "Frontiers Research Topics",
				"shortTitle": "Biobanks as Essential Tools for Translational Research",
				"url": "https://www.frontiersin.org/research-topics/8144/biobanks-as-essential-tools-for-translational-research-the-belgian-landscape",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.18356/31516bf1-en"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Index to Proceedings of the Economic and Social Council",
				"creators": [],
				"libraryCatalog": "Crossref",
				"publisher": "United Nations",
				"url": "https://www.un-ilibrary.org/content/periodicals/24124516",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.7139/2017.978-1-56900-592-7"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Occupational Therapy Manager, 6th Ed",
				"creators": [
					{
						"creatorType": "editor",
						"firstName": "Karen",
						"lastName": "Jacobs"
					},
					{
						"creatorType": "editor",
						"firstName": "Judith",
						"lastName": "Parker Kent"
					},
					{
						"creatorType": "editor",
						"firstName": "Albert",
						"lastName": "Copolillo"
					},
					{
						"creatorType": "editor",
						"firstName": "Roger",
						"lastName": "Ideishi"
					},
					{
						"creatorType": "editor",
						"firstName": "Shawn",
						"lastName": "Phipps"
					},
					{
						"creatorType": "editor",
						"firstName": "Sarah",
						"lastName": "McKinnon"
					},
					{
						"creatorType": "editor",
						"firstName": "Donna",
						"lastName": "Costa"
					},
					{
						"creatorType": "editor",
						"firstName": "Nathan",
						"lastName": "Herz"
					},
					{
						"creatorType": "editor",
						"firstName": "Guy",
						"lastName": "McCormack"
					},
					{
						"creatorType": "editor",
						"firstName": "Lee",
						"lastName": "Brandt"
					},
					{
						"creatorType": "editor",
						"firstName": "Karen",
						"lastName": "Duddy"
					}
				],
				"ISBN": "9781569005927",
				"edition": "6",
				"libraryCatalog": "Crossref",
				"publisher": "AOTA Press",
				"url": "https://library.aota.org/Occupational-Therapy-Manager-6",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.21428/cbd17b20.594a8acc"
		},
		"items": [
			{
				"itemType": "bookSection",
				"title": "Resumen Ejecutivo y Principales Conclusiones",
				"creators": [],
				"date": "2022-09-12",
				"bookTitle": "2022 Global Deep-Sea Capacity Assessment",
				"edition": "1",
				"libraryCatalog": "Crossref",
				"publisher": "Ocean Discovery League, Saunderstown, USA.",
				"url": "https://deepseacapacity.oceandiscoveryleague.org/pub/2022-exec-summary-es",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.11647/obp.0163.08"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Extended dagesh forte: Reading without melody",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Alex",
						"lastName": "Foreman"
					}
				],
				"date": "01/2020",
				"libraryCatalog": "Crossref",
				"publisher": "Open Book Publishers",
				"rights": "http://creativecommons.org/licenses/by/4.0",
				"series": "Semitic Languages and Cultures",
				"shortTitle": "Extended dagesh forte",
				"url": "https://cdn.openbookpublishers.com/resources/10.11647/obp.0163/OBP.0163.08_Gen_1-13_extended_dagesh_forte.mp3",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.1021/bk-2009-1027"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Environmental Applications of Nanoscale and Microscale Reactive Metal Particles",
				"creators": [
					{
						"creatorType": "editor",
						"firstName": "Cherie L.",
						"lastName": "Geiger"
					},
					{
						"creatorType": "editor",
						"firstName": "Kathleen M.",
						"lastName": "Carvalho-Knighton"
					}
				],
				"date": "2010-02-01",
				"ISBN": "9780841269927 9780841224674",
				"libraryCatalog": "Crossref",
				"place": "Washington DC",
				"publisher": "American Chemical Society",
				"series": "ACS Symposium Series",
				"url": "https://pubs.acs.org/doi/book/10.1021/bk-2009-1027",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.59317/9789390083503"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Plants for Human Survival and Medicines (Co-Published With Crc Press,Uk)",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Bikarma",
						"lastName": "Singh"
					}
				],
				"date": "2019-07-05",
				"ISBN": "9789390083503",
				"abstractNote": "This book reports the potential plants for human survival, explored medicinal aspects of the ongoing research and development for discovering new molecules, new drugs, new leads, ethnic-traditional applications and nutraceutical values of plants. It provides a baseline data and information on plants and their hidden knowledge for human health. This is build upon based on twenty-five excellent research articles and main focused plant species are Boswellia serrata, Butea monosperma, Colebrookea oppositifolia, Cymbopogon khasianus, Dendrophthe falcata, Dysoxylum binectariferum, Echinacea purpurea, Grewia asiatica, Picrorrhiza kurroa, Saussurea costus, Withania somnifera, Zanthoxylum armatum, different species of Aconitum and Panax, Ashtavarga groups (Habenaria intermedia, Habenaria edgeworthii, Malaxis acuminata, Malaxis muscifera, Lilium polyphyllum, Polygonatum verticillatum, Polygonatum cirrhifolium and Roscoea procera), and hundreds of potential life-saving plants used by different ethnic tribes of Himalaya as food, shelter and medicine in their day-to-day life. Various research studies and clinical trials mentioned in the book will add and contribute a lot in discovering quick leads for medicine formulations and products development. In addition to research suggestions and valuation of plants for humans contained within each of the articles, an introduction section emphasizes particular research avenues for attention in the drug development programmes. As the reader will note, these compilations represent a wide collection of views, reflecting the diversity of sciences and interests of thousands of ideas that enabled thoughtful deliberations from a wide range of scientific perspectives.",
				"libraryCatalog": "Crossref",
				"publisher": "NIPA",
				"url": "https://www.nipaers.com/ebook/9789390083503",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.9734/bpi/hmms/v13/2889f"
		},
		"items": [
			{
				"itemType": "bookSection",
				"title": "A Review on MVD for Trigeminal Neuralgia",
				"creators": [
					{
						"creatorType": "bookAuthor",
						"firstName": "Renuka S.",
						"lastName": "Melkundi"
					},
					{
						"creatorType": "bookAuthor",
						"firstName": "Sateesh",
						"lastName": "Melkundi"
					}
				],
				"date": "2021-07-30",
				"bookTitle": "Highlights on Medicine and Medical Science Vol. 13",
				"libraryCatalog": "Crossref",
				"pages": "108-114",
				"publisher": "Book Publisher International (a part of SCIENCEDOMAIN International)",
				"url": "https://stm.bookpi.org/HMMS-V13/article/view/2729",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.7328/bgbl_2010_0000231_h34"
		},
		"items": [
			{
				"itemType": "bookSection",
				"title": "Dritte Verordnung zur Änderung der Anlageverordnung",
				"creators": [],
				"date": "2010-06-29",
				"bookTitle": "Bundesgesetzblatt",
				"libraryCatalog": "Crossref",
				"pages": "841-845",
				"publisher": "Recht Fuer Deutschland GmbH",
				"url": "http://openurl.makrolog.de/service?url_ver=Z39.88-2004&rft_val_fmt=&rft.gesetzblatt=bd_bgbl&rft.jahrgang=2010&rft.seite=841&svc_id=info:rfd/vkbl",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.14509/23007"
		},
		"items": [
			{
				"itemType": "bookSection",
				"title": "High-resolution lidar data for infrastructure corridors, Wiseman Quadrangle, Alaska",
				"creators": [
					{
						"creatorType": "bookAuthor",
						"firstName": "T. D.",
						"lastName": "Hubbard"
					},
					{
						"creatorType": "bookAuthor",
						"firstName": "M. L.",
						"lastName": "Braun"
					},
					{
						"creatorType": "bookAuthor",
						"firstName": "R. E.",
						"lastName": "Westbrook"
					},
					{
						"creatorType": "bookAuthor",
						"firstName": "P. E.",
						"lastName": "Gallagher"
					}
				],
				"bookTitle": "High-resolution lidar data for Alaska infrastructure corridors",
				"libraryCatalog": "Crossref",
				"publisher": "Alaska Division of Geological & Geophysical Surveys",
				"url": "http://www.dggs.alaska.gov/pubs/id/23007",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.1002/0471238961.0308121519200523.a01.pub2"
		},
		"items": [
			{
				"itemType": "bookSection",
				"title": "Chloroprene",
				"creators": [
					{
						"creatorType": "bookAuthor",
						"firstName": "Clare A.",
						"lastName": "Stewart"
					},
					{
						"creatorType": "bookAuthor",
						"firstName": "Updated By",
						"lastName": "Staff"
					}
				],
				"date": "2014-04-28",
				"bookTitle": "Kirk-Othmer Encyclopedia of Chemical Technology",
				"libraryCatalog": "Crossref",
				"pages": "1-9",
				"place": "Hoboken, NJ, USA",
				"publisher": "John Wiley & Sons, Inc.",
				"url": "https://onlinelibrary.wiley.com/doi/10.1002/0471238961.0308121519200523.a01.pub2",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.3403/02199208"
		},
		"items": [
			{
				"itemType": "standard",
				"title": "Non-destructive testing. Acoustic emission. Equipment characterization: Verification of operating characteristic",
				"creators": [],
				"DOI": "10.3403/02199208",
				"libraryCatalog": "Crossref",
				"place": "London",
				"publisher": "BSI British Standards",
				"shortTitle": "Non-destructive testing. Acoustic emission. Equipment characterization",
				"url": "https://linkresolver.bsigroup.com/junction/resolve/000000000030034606?restype=standard",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.4159/dlcl.hippocrates_cos-nature_women.2012"
		},
		"items": [
			{
				"itemType": "dataset",
				"title": "Nature of Women",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Hippocrates Of Cos",
						"fieldMode": 1
					},
					{
						"creatorType": "translator",
						"firstName": "Paul",
						"lastName": "Potter"
					}
				],
				"date": "2012",
				"DOI": "10.4159/dlcl.hippocrates_cos-nature_women.2012",
				"libraryCatalog": "Crossref",
				"repository": "Harvard University Press",
				"repositoryLocation": "Cambridge, MA",
				"url": "http://www.loebclassics.com/view/hippocrates_cos-nature_women/2012/work.xml",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.1036/1097-8542.265870"
		},
		"items": [
			{
				"itemType": "dataset",
				"title": "Food analogs",
				"creators": [],
				"DOI": "10.1036/1097-8542.265870",
				"libraryCatalog": "Crossref",
				"repository": "McGraw-Hill Professional",
				"url": "https://www.accessscience.com/lookup/doi/10.1036/1097-8542.265870",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.2118/29099-ms"
		},
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Logically Rectangular Mixed Methods for Darcy Flow on General Geometry",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Todd",
						"lastName": "Arbogast"
					},
					{
						"creatorType": "author",
						"firstName": "Philip T.",
						"lastName": "Keenan"
					},
					{
						"creatorType": "author",
						"firstName": "Mary F.",
						"lastName": "Wheeler"
					}
				],
				"date": "1995-02-12",
				"DOI": "10.2118/29099-ms",
				"abstractNote": "ABSTRACT               We consider an expanded mixed finite element formulation (cell centered finite differences) for Darcy flow with a tensor absolute permeability. The reservoir can be geometrically general with internal features, but. the computational domain is rectangular. The method is defined on a curvilinear grid that need not, be orthogonal, obtained by mapping the rectangular, computational grid. The original flow problem becomes a similar problem with a modified permeability on the computational grid. Quadrature rules turn the mixed method into a cell-centered finite difference method with a. 9 point stencil in 2-D and 19 in 3-D.               As shown by theory and experiment, if the modified permeability on the computational domain is smooth, then the convergence rate is optimal and both pressure and velocity are superconvergent at certain points. If not, Lagrange multiplier pressures can be introduced on boundaries of elements so that optimal convergence is retained. This modification presents only small changes in the solution process; in fact, the same parallel domain decomposition algorithms can be applied with little or no change to the code if the modified permeability is smooth over the subdomains.               This Lagrange multiplier procedure can be. used to extend the difference scheme to multi-block domains, and to give, a coupling with unstructured grids. In all cases, the mixed formulation is locally conservative. Computational results illustrate the advantage and convergence of this method.",
				"conferenceName": "SPE Reservoir Simulation Symposium",
				"libraryCatalog": "Crossref",
				"place": "San Antonio, Texas",
				"proceedingsTitle": "All Days",
				"publisher": "SPE",
				"url": "https://onepetro.org/spersc/proceedings/95RSS/All-95RSS/SPE-29099-MS/61095",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.14264/105901"
		},
		"items": [
			{
				"itemType": "thesis",
				"title": "Synthetic and structural studies towards novel backbone peptidomimetics",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Michael John.",
						"lastName": "Kelso"
					}
				],
				"date": "2002-02-02",
				"libraryCatalog": "Crossref",
				"thesisType": "PhD Thesis",
				"university": "University of Queensland Library",
				"url": "https://espace.library.uq.edu.au/view/UQ:105901",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.1101/2020.04.07.20057075"
		},
		"items": [
			{
				"itemType": "preprint",
				"title": "A simple method to quantify country-specific effects of COVID-19 containment measures",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Morten Gram",
						"lastName": "Pedersen"
					},
					{
						"creatorType": "author",
						"firstName": "Matteo",
						"lastName": "Meneghini"
					}
				],
				"date": "2020-04-10",
				"DOI": "10.1101/2020.04.07.20057075",
				"abstractNote": "AbstractMost of the world is currently fighting to limit the impact of the COVID-19 pandemic. Italy, the Western country with most COVID-19 related deaths, was the first to implement drastic containment measures in early March, 2020. Since then most other European countries, the USA, Canada and Australia, have implemented similar restrictions, ranging from school closures, banning of recreational activities and large events, to complete lockdown. Such limitations, and softer promotion of social distancing, may be more effective in one society than in another due to cultural or political differences. It is therefore important to evaluate the effectiveness of these initiatives by analyzing country-specific COVID-19 data. We propose to model COVID-19 dynamics with a SIQR (susceptible – infectious – quarantined – recovered) model, since confirmed positive cases are isolated and do not transmit the disease. We provide an explicit formula that is easily implemented and permits us to fit official COVID-19 data in a series of Western countries. We found excellent agreement with data-driven estimation of the day-of-change in disease dynamics and the dates when official interventions were introduced. Our analysis predicts that for most countries only the more drastic restrictions have reduced virus spreading. Further, we predict that the number of unidentified COVID-19-positive individuals at the beginning of the epidemic is ∼10 times the number of confirmed cases. Our results provide important insight for future planning of non-pharmacological interventions aiming to contain spreading of COVID-19 and similar diseases.",
				"libraryCatalog": "Public and Global Health",
				"repository": "Cold Spring Harbor Laboratory",
				"url": "http://medrxiv.org/lookup/doi/10.1101/2020.04.07.20057075",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.32388/tqr2ys"
		},
		"items": [
			{
				"itemType": "manuscript",
				"title": "Review of: \"Stakeholders' Perception of Socioecological Factors Influencing Forest Elephant Crop Depredation in Gabon, Central Africa\"",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Abel",
						"lastName": "Mamboleo"
					}
				],
				"date": "2024-02-21",
				"libraryCatalog": "Crossref",
				"manuscriptType": "peer review",
				"shortTitle": "Review of",
				"url": "https://www.qeios.com/read/TQR2YS",
				"attachments": [],
				"tags": [],
				"notes": [
					"Review of <a href=\"https://doi.org/10.32388/XSM9RG\">https://doi.org/10.32388/XSM9RG</a>"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.1039/9781847557766"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Nanotechnology: Consequences for Human Health and the Environment",
				"creators": [
					{
						"creatorType": "editor",
						"firstName": "R E",
						"lastName": "Hester"
					},
					{
						"creatorType": "editor",
						"firstName": "R M",
						"lastName": "Harrison"
					}
				],
				"date": "2007",
				"ISBN": "9780854042166",
				"libraryCatalog": "Crossref",
				"place": "Cambridge",
				"publisher": "Royal Society of Chemistry",
				"series": "Issues in Environmental Science and Technology",
				"shortTitle": "Nanotechnology",
				"url": "http://ebook.rsc.org/?DOI=10.1039/9781847557766",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.3133/sir20175014"
		},
		"items": [
			{
				"itemType": "report",
				"title": "Effects of changes in pumping on regional groundwater-flow paths, 2005 and 2010, and areas contributing recharge to discharging wells, 1990–2010, in the vicinity of North Penn Area 7 Superfund site, Montgomery County, Pennsylvania",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Lisa A.",
						"lastName": "Senior"
					},
					{
						"creatorType": "author",
						"firstName": "Daniel J.",
						"lastName": "Goode"
					}
				],
				"date": "2017",
				"institution": "US Geological Survey",
				"libraryCatalog": "Crossref",
				"seriesTitle": "Scientific Investigations Report",
				"url": "https://pubs.usgs.gov/publication/sir20175014",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.14305/jn.19440413.2023.15"
		},
		"items": [
			{
				"itemType": "journalArticle",
				"title": "[No title found]",
				"creators": [],
				"DOI": "10.14305/jn.19440413.2023.15",
				"ISSN": "1944-0413, 1944-0413",
				"language": "en",
				"libraryCatalog": "Crossref",
				"publicationTitle": "Excelsior: Leadership in Teaching and Learning",
				"url": "https://surface.syr.edu/excelsior/vol15",
				"volume": "15",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.1002/(issn)1099-1751"
		},
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The International Journal of Health Planning and Management",
				"creators": [],
				"DOI": "10.1002/(issn)1099-1751",
				"ISSN": "0749-6753, 1099-1751",
				"language": "en",
				"libraryCatalog": "Crossref",
				"url": "http://doi.wiley.com/10.1002/%28ISSN%291099-1751",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.1111/ceo.v49.2"
		},
		"items": [
			{
				"itemType": "journalArticle",
				"title": "[No title found]",
				"creators": [],
				"date": "03/2021",
				"DOI": "10.1111/ceo.v49.2",
				"ISSN": "1442-6404, 1442-9071",
				"issue": "2",
				"journalAbbreviation": "Clinical Exper Ophthalmology",
				"language": "en",
				"libraryCatalog": "Crossref",
				"publicationTitle": "Clinical & Experimental Ophthalmology",
				"url": "https://onlinelibrary.wiley.com/toc/14429071/49/2",
				"volume": "49",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.1021/acsami.3c09983.s001"
		},
		"items": [
			{
				"itemType": "document",
				"title": "Multifunctional Ti3C2Tx MXene/Silver Nanowire Membranes with Excellent Catalytic Antifouling, and Antibacterial Properties for Nitrophenol-Containing Water Purification",
				"creators": [],
				"libraryCatalog": "Crossref",
				"publisher": "American Chemical Society (ACS)",
				"url": "https://pubs.acs.org/doi/suppl/10.1021/acsami.3c09983/suppl_file/am3c09983_si_001.pdf",
				"attachments": [],
				"tags": [],
				"notes": [
					"Supplemental Information for 10.1021/acsami.3c09983"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.15405/epsbs(2357-1330).2021.6.1"
		},
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "European Proceedings of Social and Behavioural Sciences",
				"creators": [],
				"DOI": "10.15405/epsbs(2357-1330).2021.6.1",
				"conferenceName": "Psychosocial Risks in Education and Quality Educational Processes",
				"libraryCatalog": "Crossref",
				"publisher": "European Publisher",
				"url": "https://europeanproceedings.com/book-series/EpSBS/books/vol109-cipe-2020",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.1145/1947940"
		},
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Proceedings of the 2011 International Conference on Communication, Computing & Security - ICCCS '11",
				"creators": [],
				"date": "2011",
				"DOI": "10.1145/1947940",
				"ISBN": "9781450304641",
				"conferenceName": "the 2011 International Conference",
				"libraryCatalog": "Crossref",
				"place": "Rourkela, Odisha, India",
				"publisher": "ACM Press",
				"url": "http://portal.acm.org/citation.cfm?doid=1947940",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
