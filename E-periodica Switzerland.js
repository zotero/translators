{
	"translatorID": "dbfd99e3-6925-4b71-92b8-12b02aa875fc",
	"label": "E-periodica Switzerland",
	"creator": "Alain Borel",
	"target": "^https?://(www|news?)\\.e-periodica\\.ch",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-03-26 18:29:23"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Alain Borel

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function detectWeb(doc, url) {
	// TODO: adjust the logic here
	if (url.includes('/digbib/view')) {
		return "journalArticle";
	} else if (url.includes('/digbib/dossearch?'))
	{
		return "multiple";
	} else
	{
		return false;
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h2.ep-result__title > a');
	for (let row of rows) {
		Zotero.debug(row.innerHTML);
		// TODO: check and maybe adjust
		let href = row.href;
		Zotero.debug(href);
		// TODO: check and maybe adjust
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'journalArticle') {
		const elDoi = doc.querySelector(".ep-view__share__doi");
		// Zotero.debug(elDoi);
		const elRis = doc.querySelector(".ep-view__share__ris");
		// Zotero.debug(elRis);
		const risURL = elRis.querySelectorAll('a')[0].href;
		const elPdf = doc.querySelector(".ep-view__share__downloads");
		const pdfURL = elPdf.querySelectorAll('a')[0].href;
		Zotero.debug(elDoi.href);
		Zotero.debug(risURL);
		Zotero.debug(pdfURL);
		
		ZU.doGet(risURL, function (text, URL, PDFURL) {
			processRIS(text, url, pdfURL);
		});
	}

	if (detectWeb(doc, url) == 'multiple') {
		Zotero.debug('doWeb on multiple refs.');
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	
	/*
	else {
		await scrape(doc, url);
	}
	*/
}

async function scrape(next_doc, url) {
	// querySelectors not working at this point. Is the DOM not complete yet?
	var next_url = next_doc.location.href;
	Zotero.debug('Should process ' + next_url);
	Zotero.debug(typeof(next_doc));
	Zotero.debug(typeof(next_url));
	Zotero.debug('trying to process ' + next_url);
	Zotero.debug('#################\n\n');
	// Zotero.debug(next_doc.documentElement.innerHTML);
	Zotero.debug('#################\n\n');
	Zotero.debug(typeof(next_doc));
	const elDoi = next_doc.querySelector(".ep-view__share__doi");
	Zotero.debug('DOI object ' + elDoi);
	const elRis = next_doc.querySelector(".ep-view__share__ris");
	const risURL = elRis.querySelectorAll('a')[0].href;
	const elPdf = next_doc.querySelector(".ep-view__share__downloads");
	const pdfURL = elPdf.querySelectorAll('a')[0].href;
	ZU.doGet(risURL, function (text, URL, PDFURL) {
		processRIS(text, url, pdfURL);
	});
}

function convertCharRefs(string) {
	// converts hex decimal encoded html entities used by JSTOR to regular utf-8
	return string
		.replace(/&#x([A-Za-z0-9]+);/g, function (match, num) {
			return String.fromCharCode(parseInt(num, 16));
		});
}

function processRIS(text, URL, pdfURL) {
	// load translator for RIS
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
	// Z.debug(text);
	
	// Reviews have a RI tag now (official RIS for Reviewed Item)
	var review = text.match(/^RI\s+-\s+(.+)/m);
	// sometimes we have subtitles stored in T1. These are part of the title, we want to add them later
	var subtitle = text.match(/^T1\s+-\s+(.+)/m);
	var maintitle = text.match(/^TI\s+-\s+(.+)/m);
	translator.setString(text);
	translator.setHandler("itemDone", function (obj, item) {
		// author names are not (always) supplied as lastName, firstName in RIS
		// we fix it here (note sure if still need with new RIS)
	
		var m;
		for (var i = 0, n = item.creators.length; i < n; i++) {
			if (!item.creators[i].firstName
				&& (m = item.creators[i].lastName.match(/^(.+)\s+(\S+)$/))) {
				item.creators[i].firstName = m[1];
				item.creators[i].lastName = m[2];
				delete item.creators[i].fieldMode;
			}
		}
		
		// fix special characters in abstract, convert html linebreaks and italics, remove stray p tags; don't think they use anything else
		if (item.abstractNote) {
			item.abstractNote = convertCharRefs(item.abstractNote);
			item.abstractNote = item.abstractNote.replace(/<\/p><p>/g, "\n").replace(/<em>(.+?)<\/em>/g, " <i>$1</i> ").replace(/<\/?p>/g, "");
			item.abstractNote = item.abstractNote.replace(/^\[/, "").replace(/\]$/, "");
		}
		// Don't save HTML snapshot from 'UR' tag
		item.attachments = [];
		// not currently using but that's where the PDF link is
		// var pdfurl = attr('a[data-qa="download-pdf"]', 'href');
		// Books don't have PDFs
		/*
		if (/stable\/([a-z0-9.]+)/.test(item.url) & item.itemType != "book") {
			let pdfurl = "/stable/pdfplus/" + jid + ".pdf?acceptTC=true";
			item.attachments.push({
				url: pdfurl,
				title: "JSTOR Full Text PDF",
				mimeType: "application/pdf"
			});
		}
		*/

		if (item.ISSN) {
			item.ISSN = ZU.cleanISSN(item.ISSN);
		}
		
		// Only the DOIs mentioned in RIS are valid, and we don't
		// add any other jid for DOI because they are only internal.
		
		if (maintitle && subtitle) {
			maintitle[1] = maintitle[1].replace(/:\s*$/, '');
			item.title = maintitle[1] + ": " + subtitle[1];
		}
		// reviews don't have titles in RIS - we get them from the item page
		if (!item.title && review) {
			var reviewedTitle = review[1];
			// A2 for reviews is actually the reviewed author
			var reviewedAuthors = [];
			for (i = 0; i < item.creators.length; i++) {
				if (item.creators[i].creatorType == "editor") {
					reviewedAuthors.push(item.creators[i].firstName + " " + item.creators[i].lastName);
					item.creators[i].creatorType = "reviewedAuthor";
				}
			}
			// remove any reviewed authors from the title
			for (i = 0; i < reviewedAuthors.length; i++) {
				reviewedTitle = reviewedTitle.replace(", " + reviewedAuthors[i], "");
			}
			item.title = "Review of " + reviewedTitle;
		}
		
		// titles may also contain escape characters
		item.title = convertCharRefs(item.title);
		
		// remove all caps from titles and authors.
		for (i = 0; i < item.creators.length; i++) {
			if (item.creators[i].lastName && item.creators[i].lastName == item.creators[i].lastName.toUpperCase()) {
				item.creators[i].lastName = ZU.capitalizeName(item.creators[i].lastName, true);
			}
			if (item.creators[i].firstName && item.creators[i].firstName == item.creators[i].firstName.toUpperCase()) {
				item.creators[i].firstName = ZU.capitalizeName(item.creators[i].firstName, true);
			}
		}
		if (item.title == item.title.toUpperCase()) {
			item.title = ZU.capitalizeTitle(item.title.toLowerCase(), true);
		}

		// Retrieve fulltext
		item.attachments.push({
			url : pdfURL,
			title : "E-periodica PDF",
			type : "application/pdf"
		});
		

		// DB in RIS maps to archive; we don't want that
		delete item.archive;
		if (item.DOI || /DOI: 10\./.test(item.extra)) {
			finalizeItem(item);
		}
		else {
			item.complete();
		}
	});

	function finalizeItem(item) {
	// Validate DOI
		let doi = item.DOI || item.extra.match(/DOI: (10\..+)/)[1];
		Zotero.debug("Validating DOI " + doi);
		// This just returns two lines of JSON
		ZU.doGet('https://doi.org/doiRA/' + encodeURIComponent(doi),
			function (text) {
			// Z.debug(text)
				try {
					var ra = JSON.parse(text);
					// Z.debug(ra[0].status)
					if (!ra[0] || ra[0].status == "DOI does not exist") {
						Z.debug("DOI " + doi + " does not exist");
						if (item.DOI) {
							delete item.DOI;
						}
						else {
							item.extra = item.extra.replace(/DOI: 10\..+\n?/, "");
						}
					}
				}
				catch (e) {
					if (item.DOI) {
						delete item.DOI;
					}
					else {
						item.extra.replace(/DOI: 10\..+\n?/, "");
					}
					Zotero.debug("Could not parse JSON. Probably invalid DOI");
				}
			}, function () {
				item.complete();
			});
	}

	translator.getTranslatorObject(function (trans) {
		trans.doImport();
	});
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.e-periodica.ch/digbib/view?pid=enh-006%3A2018%3A11#121",
		"defer": true,
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Labiobaetis atrebatinus (Eaton, 1870) (Ephemeroptera: Baetidae) : première mention pour la Suisse et remarques sur l'identification des larves",
				"creators": [
					{
						"lastName": "Wagner",
						"firstName": "André",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"DOI": "10.5169/seals-986029",
				"ISSN": "1662-8500",
				"libraryCatalog": "E-periodica Switzerland",
				"pages": "117",
				"publicationTitle": "Entomo Helvetica : entomologische Zeitschrift der Schweiz",
				"shortTitle": "Labiobaetis atrebatinus (Eaton, 1870) (Ephemeroptera",
				"volume": "11",
				"attachments": [
					{
						"title": "E-periodica PDF",
						"type": "application/pdf"
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
