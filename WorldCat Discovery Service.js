{
	"translatorID": "fd8dc5f6-a6dd-42b2-948f-600f5da844ea",
	"label": "WorldCat Discovery Service",
	"creator": "Sebastian Karcher and Abe Jellinek",
	"target": "^https?://[^/]+\\.worldcat\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-08-31 20:55:20"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2015-2026 Sebastian Karcher and Abe Jellinek
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

const CONTEXT_PATH = '/api/context';
const ENVIRONMENT_PATH = '/api/environment';
const CITATION_PATH = '/api/share/citation.ris';

function detectWeb(doc, url) {
	let oclcID = extractOCLCID(url);
	if (!oclcID) {
		if (getSearchResults(doc, true)) {
			return "multiple";
		}
		monitorRoot(doc);
		return false;
	}

	let co = getFirstContextObj(doc);
	if (co) {
		return generateItem(co).itemType;
	}

	// The record loads asynchronously, so we might not have its COinS yet. We
	// can still save it - everything scrape() needs comes from the URL - so
	// guess from the type shown on the page, and keep watching for the COinS.
	monitorRoot(doc);
	return displayTypeToZotero(text(doc, '[data-testid^="item-detail-record-type"]')) || "book";
}

async function doWeb(doc, url) {
	let oclcIDs;
	if (detectWeb(doc, url) == "multiple") {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		oclcIDs = Object.keys(items);
	}
	else {
		oclcIDs = [extractOCLCID(url)];
	}

	let databaseIDs = await getDatabaseIDs(url);
	for (let oclcID of oclcIDs) {
		await scrape(oclcID, databaseIDs);
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	for (let link of doc.querySelectorAll('a[data-testid^="title-link-"]')) {
		let oclcID = extractOCLCID(link.href);
		let title = ZU.trimInternal(link.textContent);
		if (!oclcID || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[oclcID] = title;
	}
	return found ? items : false;
}

/**
 * Watch the React root, so that detectWeb() runs again once the record renders
 */
function monitorRoot(doc) {
	let root = doc.getElementById('root');
	if (root) {
		Z.monitorDOMChanges(root);
	}
}

function displayTypeToZotero(displayType) {
	if (!displayType) return false;
	
	if (displayType.includes('©')) {
		displayType = displayType.substring(displayType.indexOf('©'));
	}

	displayType = ZU.trimInternal(displayType.replace(/\d/g, ''));

	switch (displayType) {
		case 'Article':
			return 'journalArticle';
		default:
			return 'book';
	}
}

/**
 * Generate a Zotero item from a COinS context object, just to read its type
 */
function generateItem(co) {
	var item = new Zotero.Item();
	ZU.parseContextObject(co, item);
	// item types not covered by COinS will still need to be covered. See the corresponding code in Open Worldcat.
	return item;
}

function getFirstContextObj(doc) {
	return attr(doc, 'span.Z3988', 'title');
}

/**
 * Given an item URL, extract OCLC ID
 */
function extractOCLCID(url) {
	let id = url.match(/\/(?:oclc|search\/detail)\/(\d+)/);
	if (!id) return false;
	return id[1];
}

async function getDatabaseIDs(url) {
	let databaseList = new URL(url).searchParams.get('databaseList');
	if (databaseList) {
		return databaseList;
	}
	// URL may not include databaseList - if not, request the context endpoint
	let context = await requestJSON(CONTEXT_PATH, await signRequest(CONTEXT_PATH));
	return (context.contextDatabases?.defaultDatabaseIds || []).join(',');
}

async function signRequest(path) {
	let { sessionId } = await requestJSON(ENVIRONMENT_PATH);
	if (!sessionId) {
		throw new Error('No session ID: ' + ENVIRONMENT_PATH + ' did not return one');
	}
	let encoder = new TextEncoder();
	let nonce = crypto.getRandomValues(new Uint32Array(4)).join('');
	let key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(sessionId),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	let signature = await crypto.subtle.sign('HMAC', key, encoder.encode(nonce + path));
	return {
		headers: {
			'Oclc-Apin': nonce,
			'Oclc-Apik': Array.from(new Uint8Array(signature),
				byte => byte.toString(16).padStart(2, '0')).join('')
		}
	};
}

function composeQuery(oclcID, databaseIDs) {
	return '?format=application%2Foctet-stream'
		+ `&oclcNumber=${encodeURIComponent(oclcID)}`
		+ `&databaseIds=${encodeURIComponent(databaseIDs)}`
		+ '&risCitationStyle=STANDARD';
}

async function scrape(oclcID, databaseIDs) {
	let risText = await requestText(
		CITATION_PATH + composeQuery(oclcID, databaseIDs),
		await signRequest(CITATION_PATH)
	);

	if (!/^TY {1,2}- /m.test(risText)) {
		// The citation service returns 200 and an empty body when the record
		// isn't in any of the databases we asked about
		throw new Error(`No citation for OCLC number ${oclcID} in database(s) ${databaseIDs}`);
	}

	// conference proceedings exported as CONF, but fields match BOOK better
	risText = risText.replace(/TY\s+-\s+CONF\s+[\s\S]+?\n\s*ER\s+-/g, m => m
		.replace(/^TY\s+-\s+CONF\s*$/mg, 'TY  - BOOK')
		// authors are actually editors
		.replace(/^A1\s+-\s+/mg, 'A3  - '));

	let translator = Zotero.loadTranslator("import");
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7"); // RIS
	translator.setString(risText);
	translator.setHandler("itemDone", (_obj, item) => {
		delete item.extra;
		delete item.archive;

		// SN becomes ISBN for books and ISSN for articles; either can come
		// back as a list, sometimes with duplicates
		for (let [field, clean] of [['ISBN', ZU.cleanISBN], ['ISSN', ZU.cleanISSN]]) {
			if (item[field]) {
				item[field] = [...new Set(item[field].split(/[;\s]+/)
					.map(id => clean(id))
					.filter(Boolean))].join(' ');
			}
		}

		// remove space before colon
		if (item.title) {
			item.title = item.title.replace(/\s+:/, ":");
		}

		// remove trailing colon and brackets from place
		if (item.place) {
			item.place = item.place
				.replace(/:\s*$/, "")
				.replace(/\[(.*)\]/, '$1');
		}

		// remove trailing period after publication
		if (item.publicationTitle) {
			item.publicationTitle = item.publicationTitle.replace(/\.\s*$/, "");
		}

		// remove trailing comma after publisher
		if (item.publisher) {
			item.publisher = item.publisher.replace(/,\s*$/, "");
		}

		// number of pages gets mapped to section???
		if (item.section) {
			// extract possible roman numerals and number of pages without the p
			let numPages = item.section.match(/(([lxiv]+,\s*)?\d+)\s*p/);
			if (numPages) {
				item.numPages = numPages[1];
			}
		}

		// the url field sometimes contains an additional label, e.g. for TOC
		// "url": "Table of contents http://bvbr.bib-bvb.de:8991/...
		if (item.url) {
			let posURL = item.url.indexOf('http');
			if (posURL > 0 || item.url.includes("http://bvbr.bib-bvb.de:8991")) {
				item.attachments.push({
					url: item.url.substr(posURL),
					title: posURL > 0 ? item.url.substr(0, posURL) : "Table of contents",
					snapshot: false
				});
				delete item.url;
			}
		}

		if (item.series) {
			item.series = item.series.replace(/\.$/, '');
			if (item.series.split(';').length == 2) {
				[item.series, item.seriesNumber] = item.series.split(';');
			}
		}

		if (item.edition) {
			item.edition = item.edition.replace(/\.$/, '');
		}

		for (let creator of item.creators) {
			// correct field mode for corporate authors
			if (!creator.firstName) {
				creator.fieldMode = 1;
				continue;
			}
			creator.firstName = creator.firstName
				.replace(/\(?[\d-,:\s]+\)?(\.*$)/, '$1')
				.replace(/(\w{2,})\./, '$1');
		}

		item.complete();
	});

	let ris = await translator.getTranslatorObject();
	ris.options.defaultItemType = 'book'; // if not supplied, default to book
	ris.options.typeMap = { ELEC: 'book' }; // ebooks should be imported as books
	await ris.doImport();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://lpts.on.worldcat.org/search?queryString=au:Mary%20GrandPre%CC%81&databaseList=638",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://sbts.on.worldcat.org/search?databaseList=&queryString=runge+discourse+grammar",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://goshen.on.worldcat.org/search?queryString=foundation%20asimov&clusterResults=true&groupVariantRecords=false",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://uwest.on.worldcat.org/search/detail/4352330?queryString=buddhist&idDetect=true&citeDetect=true&clusterResults=false&groupVariantRecords=true&newsArticles=off&bookReviews=off",
		"items": [
			{
				"itemType": "book",
				"title": "Buddhist Churches of America.",
				"creators": [
					{
						"lastName": "Buddhist Churches of America",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "1974",
				"language": "English",
				"libraryCatalog": "WorldCat Discovery Service",
				"place": "Chicago",
				"publisher": "Nobart",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://sbts.on.worldcat.org/oclc/667874424?databaseList=239,283,638",
		"items": [
			{
				"itemType": "book",
				"title": "Discourse grammar of the Greek New Testament: a practical introduction for teaching and exegesis",
				"creators": [
					{
						"lastName": "Runge",
						"firstName": "Steven E.",
						"creatorType": "author"
					}
				],
				"date": "2010",
				"ISBN": "9781598565836",
				"language": "English",
				"libraryCatalog": "WorldCat Discovery Service",
				"numPages": "xx, 404",
				"place": "Peabody, Mass.",
				"publisher": "Hendrickson Publishers Marketing",
				"series": "Lexham Bible reference series",
				"shortTitle": "Discourse grammar of the Greek New Testament",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://goshen.on.worldcat.org/search/detail/57358293?queryString=harry%20potter&clusterResults=true&groupVariantRecords=false",
		"items": [
			{
				"itemType": "book",
				"title": "Harry Potter and the Half-Blood Prince",
				"creators": [
					{
						"lastName": "Rowling",
						"firstName": "J. K.",
						"creatorType": "author"
					},
					{
						"lastName": "GrandPré",
						"firstName": "Mary",
						"creatorType": "author"
					},
					{
						"lastName": "Gene Berry and Jeffrey Campbell Collection (Library of Congress)",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2005",
				"ISBN": "9780439784542 9780439786775 9780439906296 9781480615014 9781419354342",
				"edition": "First American edition",
				"language": "English",
				"libraryCatalog": "WorldCat Discovery Service",
				"numPages": "x, 652",
				"place": "New York, NY",
				"publisher": "Arthur A. Levine Books, an imprint of Scholastic Inc.",
				"series": "Harry Potter series",
				"seriesNumber": "Year 6",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://goshen.on.worldcat.org/search/detail/62727772?queryString=Human-Computer%20Interaction&clusterResults=true&groupVariantRecords=false",
		"items": [
			{
				"itemType": "book",
				"title": "Encyclopedia of human computer interaction",
				"creators": [
					{
						"lastName": "Ghaoui",
						"firstName": "Claude",
						"creatorType": "author"
					}
				],
				"date": "2006",
				"ISBN": "9781591407980 9781280706820 9786610706822",
				"language": "English",
				"libraryCatalog": "WorldCat Discovery Service",
				"numberOfVolumes": "1 online resource (xviii, 738, [24] pages) : illustrations",
				"place": "Hershey PA",
				"publisher": "Idea Group Reference",
				"series": "Gale virtual reference library",
				"url": "http://www.books24x7.com/marc.asp?bookid=14703",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://illinois.on.worldcat.org/oclc/1233323459",
		"items": [
			{
				"itemType": "book",
				"title": "Pride and prejudice",
				"creators": [
					{
						"lastName": "Austen",
						"firstName": "Jane",
						"creatorType": "author"
					}
				],
				"date": "1813",
				"ISBN": "9781513263427 9781513220963",
				"language": "English",
				"libraryCatalog": "WorldCat Discovery Service",
				"numPages": "308",
				"place": "Portland, Oregon",
				"publisher": "Mint Editions",
				"series": "Mint Editions (Romantic Tales)",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://illinois.on.worldcat.org/oclc/1080997809",
		"items": [
			{
				"itemType": "book",
				"title": "The ego and the id",
				"creators": [
					{
						"lastName": "Freud",
						"firstName": "Sigmund",
						"creatorType": "author"
					},
					{
						"lastName": "Berasaluce",
						"firstName": "Andrea Jones",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"ISBN": "9781945186790",
				"language": "English",
				"libraryCatalog": "WorldCat Discovery Service",
				"numPages": "66",
				"place": "New York, NY",
				"publisher": "Clydesdale Press",
				"series": "Clydesdale classics",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://illinois.on.worldcat.org/oclc/654235026",
		"items": [
			{
				"itemType": "book",
				"title": "International financial policy: essays in honor of Jacques J. Polak",
				"creators": [
					{
						"lastName": "Polak",
						"firstName": "J. J.",
						"creatorType": "author"
					},
					{
						"lastName": "Frenkel",
						"firstName": "Jacob A.",
						"creatorType": "author"
					},
					{
						"lastName": "Goldstein",
						"firstName": "Morris",
						"creatorType": "author"
					}
				],
				"date": "1991",
				"ISBN": "9781455248681 9781283536660 9781455295173",
				"language": "English",
				"libraryCatalog": "WorldCat Discovery Service",
				"numberOfVolumes": "1 online resource (xiv, 508 pages) : illustrations",
				"place": "Washington, D.C.",
				"publisher": "International Monetary Fund",
				"shortTitle": "International financial policy",
				"url": "https://search.ebscohost.com/login.aspx?direct=true&scope=site&db=nlebk&db=nlabk&AN=449390",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://sbts.on.worldcat.org/oclc/795005226?databaseList=239,283,638",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Steven E. Runge. Discourse Grammar of the Greek New Testament",
				"creators": [
					{
						"lastName": "Long",
						"firstName": "C.",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"ISSN": "0360-3032",
				"issue": "1",
				"libraryCatalog": "WorldCat Discovery Service",
				"pages": "129-132",
				"publicationTitle": "Trinity journal",
				"volume": "33",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://illinois.on.worldcat.org/oclc/432674",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Quantitative modeling of the physiological factors in radiation lethality,",
				"creators": [
					{
						"lastName": "Iberall",
						"firstName": "Arthur S.",
						"creatorType": "author"
					}
				],
				"date": "1967",
				"language": "English",
				"libraryCatalog": "WorldCat Discovery Service",
				"publicationTitle": "Annals of the New York Academy of Sciences",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://concordiauniversity.on.worldcat.org/search/detail/8895651373?queryString=%28%22Cybersecurity%22%20OR%20%22Computer%20security%22%20OR%20%22Information%20security%22%29%20AND%20%22risk%20management%22&clusterResults=true&groupVariantRecords=false&expandSearch=false&translateSearch=false&sortKey=BEST_MATCH&scope=wz%3A15304&subformat=Artchap%3A%3Aartchap_artcl&content=peerReviewed&year=2018..2022&databaseList=283%2C638&page=3",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "REVIEWING INFORMATION SECURITY GOVERNANCE A cybersecurity governance program is only as strong as its weakest link.",
				"creators": [
					{
						"lastName": "Rai",
						"firstName": "Sajay",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISSN": "0020-5745",
				"issue": "6",
				"libraryCatalog": "WorldCat Discovery Service",
				"pages": "18(2)",
				"publicationTitle": "Internal Auditor",
				"volume": "77",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
