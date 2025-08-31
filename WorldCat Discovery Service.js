{
	"translatorID": "fd8dc5f6-a6dd-42b2-948f-600f5da844ea",
	"label": "WorldCat Discovery Service",
	"creator": "Sebastian Karcher and Abe Jellinek",
	"target": "^https?://[^/]+\\.worldcat\\.org/",
	"minVersion": "3.0.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-11-25 18:53:10"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2015-2021 Sebastian Karcher and Abe Jellinek
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

function detectWeb(doc, url) {
	if (getSearchResults(doc, true)) {
		return "multiple";
	}

	if (doc.querySelector('div#root')) {
		if (extractOCLCID(url)) {
			// we're on a v2 page
			let co = getFirstContextObj(doc);
			if (co) {
				return generateItem(doc, co).itemType;
			}
			else {
				return displayTypeToZotero(text(doc, '[data-testid^="item-detail-record-type"]'))
					|| "book";
			}
		}
		else {
			Z.monitorDOMChanges(doc.querySelector('div#root'));
		}
	}
	else {
		var co = getFirstContextObj(doc);
		if (ZU.xpathText(doc, '//input[@id="dbList"]/@value') && co) {
			return generateItem(doc, co).itemType;
		}
	}
	
	return false;
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
 * Generates a Zotero item from a single item WorldCat page,
 * or the first item on a multiple item page
 */
function generateItem(doc, co) {
	var item = new Zotero.Item();
	ZU.parseContextObject(co, item);
	// item types not covered by COinS will still need to be covered. See the corresponding code in Open Worldcat.
	return item;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a[href*="/search/detail/"]:not([id*="availability-section-link"])');
	if (!rows.length) {
		rows = doc.querySelectorAll('ol.results li[id*="record"]');
	}
	
	for (let row of rows) {
		let title = ZU.xpathText(row, './/div[contains(@class, "title") and a[@class="record-title"]]');
		if (!title) title = ZU.trimInternal(row.textContent); // v2
		let oclcID = ZU.xpathText(row, './@data-oclcnum');
		if (!oclcID) oclcID = extractOCLCID(row.href); // v2
		let databaseID = extractDatabaseID(row.href);
		// Z.debug(databaseID);
		let risURL = composeURL(oclcID, databaseID);
		if (!title) continue;
		if (checkOnly) return true;
		found = true;
		items[risURL] = title;
	}
	return found ? items : false;
}

function getFirstContextObj(doc) {
	return ZU.xpathText(doc, '//span[contains(@class, "Z3988")][1]/@title');
}

/**
 * Given an item URL, extract OCLC ID
 */
function extractOCLCID(url) {
	var id = url.match(/\/(?:oclc|detail)\/([^?]+)/);
	if (!id) return false;
	return id[1];
}

/**
 * Given an item URL, extract database ID
 */
function extractDatabaseID(url) {
	let db = url.match(/databaseList=([^&]+?)(&|$)/);
	if (!db) return false;
	return db[1];
}

function composeURL(oclcID, databaseID) {
	var risURL = "/share/citation.ris?format=application%2Foctet-stream&oclcNumber=" + oclcID + "&databaseIds=" + encodeURIComponent(databaseID);
	return risURL;
}

/**
 * RIS Scraper Function
 *
 */

function scrape(risURL) {
	// Z.debug(risURL)
	ZU.doGet(risURL, function (text) {
		// Z.debug(text);

		if (!/^TY {1,2}- /m.test(text)) {
			throw new Error("RIS not found in response");
		}

		// conference proceedings exported as CONF, but fields match BOOK better
		text = text.replace(/TY\s+-\s+CONF\s+[\s\S]+?\n\s*ER\s+-/g, function (m) {
			return m.replace(/^TY\s+-\s+CONF\s*$/mg, 'TY  - BOOK')
				// authors are actually editors
				.replace(/^A1\s+-\s+/mg, 'A3  - ');
		});

		// Zotero.debug("Importing corrected RIS: \n" + text);

		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			item.extra = undefined;
			item.archive = undefined;
			// clean up ISBNs
			if (item.ISBN) {
				var ISBN = item.ISBN.split(/\s/);
				var ISBNarray = [];
				for (let i = 0; i < ISBN.length; i++) {
					if (ZU.cleanISBN(ISBN[i])) {
						ISBNarray.push(ZU.cleanISBN(ISBN[i]));
					}
				}
				item.ISBN = ISBNarray.join(" ");
			}
			// remove space before colon
			item.title = item.title.replace(/\s+:/, ":");

			// remove trailing colon and brackets from place
			if (item.place) {
				item.place = item.place
					.replace(/:\s*$/, "")
					.replace(/\[(.*)\]/, '$1');
			}

			// remove traling period after publication

			if (item.publicationTitle) {
				item.publicationTitle = item.publicationTitle.replace(/\.\s*$/, "");
			}
			// remove trailing commar after publisher
			if (item.publisher) {
				item.publisher = item.publisher.replace(/,\s*$/, "");
			}
			// correct field mode for corporate authors
			for (let i = 0; i < item.creators.length; i++) {
				if (!item.creators[i].firstName) {
					item.creators[i].fieldMode = 1;
				}
			}

			// number of pages gets mapped to section???
			if (item.section) {
				// extract possible roman numerals and number of pages without the p
				var numPages = item.section.match(/(([lxiv]+,\s*)?\d+)\s*p/);
				if (numPages) item.numPages = numPages[1];
			}
			
			// the url field sometimes contains an additional label, e.g. for TOC
			// "url": "Table of contents http://bvbr.bib-bvb.de:8991/...
			if (item.url) {
				var posUrl = item.url.indexOf('http');
				if (posUrl > 0
					|| item.url.includes("http://bvbr.bib-bvb.de:8991")
				) {
					item.attachments.push({
						url: item.url.substr(posUrl),
						title: posUrl > 0 ? item.url.substr(0, posUrl) : "Table of contents",
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
				if (!creator.firstName) continue;
				creator.firstName = creator.firstName
					.replace(/\(?[\d-,:\s]+\)?(\.*$)/, '$1')
					.replace(/(\w{2,})\./, '$1');
			}

			item.complete();
		});
		translator.getTranslatorObject(function (trans) {
			trans.options.defaultItemType = 'book'; // if not supplied, default to book
			trans.options.typeMap = {
				ELEC: 'book'
			}; // ebooks should be imported as books

			trans.doImport();
		});
	});
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) {
				scrape(Object.keys(items));
			}
		});
	}
	else {
		let oclcID = extractOCLCID(url);
		let databaseID = extractDatabaseID(url);
		// Z.debug(databaseID);
		if (!oclcID) throw new Error("WorldCat: Failed to extract OCLC ID from URL: " + url);
		let risURL = composeURL(oclcID, databaseID);
		Z.debug("risURL= " + risURL);
		scrape(risURL);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
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
				"attachments": [
					{
						"title": "Table of contents",
						"snapshot": false
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
		"url": "https://goshen.on.worldcat.org/v2/search/detail/62727772?queryString=Human-Computer%20Interaction&clusterResults=true&groupVariantRecords=false",
		"defer": true,
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
		"url": "https://goshen.on.worldcat.org/search/detail/57358293?queryString=harry%20potter&clusterResults=true&groupVariantRecords=false",
		"defer": true,
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
					}
				],
				"date": "2005",
				"ISBN": "9780439784542 9780439786775 9780439791328 9780439785969 9780329552510 9780605000230 9781408835012 9780545582995 9781415592946 9780329414382 9780786277452 9781419354342 9780439906296 9781338299199 9780756967659",
				"edition": "First American edition",
				"language": "English",
				"libraryCatalog": "WorldCat Discovery Service",
				"numPages": "x, 652",
				"place": "New York, NY",
				"publisher": "Arthur A. Levine Books, an imprint of Scholastic Inc.",
				"series": "Harry Potter",
				"seriesNumber": "book 6",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://goshen.on.worldcat.org/v2/search?queryString=foundation%20asimov&clusterResults=true&groupVariantRecords=false",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://illinois.on.worldcat.org/v2/oclc/1233323459",
		"defer": true,
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
				"date": "2020",
				"ISBN": "9781513263427 9781513220963",
				"language": "English",
				"libraryCatalog": "WorldCat Discovery Service",
				"numPages": "308",
				"place": "Portland, Oregon",
				"publisher": "Mint Editions",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://illinois.on.worldcat.org/v2/oclc/432674",
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
				"url": "http://www3.interscience.wiley.com/cgi-bin/fulltext/119756235/PDFSTART",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://illinois.on.worldcat.org/v2/oclc/6995902131",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Jews Working in Agriculture in Poland in the First Years after the Second World War",
				"creators": [
					{
						"lastName": "Rykala A.",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2016",
				"DOI": "10.1515/esrp-2016-0010",
				"ISSN": "1231-1952",
				"issue": "2",
				"libraryCatalog": "WorldCat Discovery Service",
				"pages": "49-63",
				"publicationTitle": "European Spatial Research and Policy",
				"volume": "23",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://illinois.on.worldcat.org/v2/oclc/1080997809",
		"defer": true,
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
		"url": "https://illinois.on.worldcat.org/v2/oclc/654235026",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "International financial policy: essays in honor of Jacques J. Polak",
				"creators": [
					{
						"lastName": "Polak",
						"firstName": "J. J. (Jacques Jacobus)",
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
