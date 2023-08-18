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
	"lastUpdated": "2023-08-15 20:15:50"
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

function detectWeb(doc, url) {
	if (url.includes('/digbib/view')) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	else {
		return false;
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	// Zotero.debug(items);
	var found = false;
	var rows = doc.querySelectorAll('h2.ep-result__title > a');
	for (let row of rows) {
		//Zotero.debug(row.textContent);
		let href = row.href;
		//Zotero.debug(href);
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
		// Zotero.debug(items[href]);
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let resultUrl of Object.keys(items)) {
			await scrape(resultUrl);
		}
	}
	else {
		// The journalArticle type will be applicable in general unless we find multiple refs.
		await scrape(url);
	}
}

async function scrape(url) {
	// In general the article ID is given the pid parameter in the URL
	// If the URL ends with a hash/fragment identifier,
	//  the final digits of the pid parameter (after a double colon) must be replaced with the hash ID
	//  e.g. alp-001:1907:2::332#375 => alp-001:1907:2::375
	let articleURL = new URL(url);
	let articleID = articleURL.searchParams.get("pid");
	let articleViewFragment = articleURL.hash.replace(/^#/, ""); // trim leading #
	if (/\d+/.test(articleViewFragment)) {
		// Normalize article ID by replacing the last segment with the real
		// page id if any
		articleID = articleID.replace(/::\d+$/, "::" + articleViewFragment);
	}
	let pageinfoUrl = "https://www.e-periodica.ch/digbib/ajax/pageinfo?pid=" + encodeURIComponent(articleID);
	
	//Zotero.debug('JSON URL ' + pageinfoUrl);
	let epJSON = await requestJSON(pageinfoUrl);
	//Zotero.debug(epJSON);
	let risURL;
	if (epJSON.articles.length == 0) {
		// Fallback for non-article content, listed as Werbung, Sonstiges and various others:
		// this information is unfortunately not included in the JSON metadata => let's add a reasonable pseudo-title
		epJSON.articles = [{ title: "Untitled" }];
	}
	if (epJSON.articles["0"].hasRisLink) {
		risURL = '/view/' + epJSON.articles["0"].risLink;
	}
	
	// Zotero.debug(risURL);
	var pdfURL = null;
	if (epJSON.articles["0"].hasPdfLink) {
		pdfURL = epJSON.articles["0"].pdfLink;
	}
	// Zotero.debug(pdfURL);
	if (risURL) {
		let risText = await requestText(risURL);
		processRIS(risText, pdfURL);
	}
	else {
		var item = new Zotero.Item("journalArticle");
		item.title = epJSON.articles["0"].title.replace(' : ', ': ');
		item.publicationTitle = epJSON.journalTitle.replace(' : ', ': ');
		var numyear = epJSON.volumeNumYear.split(/[ ()]/).filter(element => element);
		if (numyear.length > 1) {
			item.date = numyear.slice(-1);
		}
		if (numyear.length > 0) {
			item.volume = numyear[0];
		}
		if (epJSON.issueNumber) {
			item.issue = epJSON.issueNumber;
		}
		if (epJSON.viewerLink.length > 0) {
			if (epJSON.viewerLink.indexOf("http") == 0) {
				item.url = epJSON.viewerLink;
			}
			else {
				item.url = "https://www.e-periodica.ch" + epJSON.viewerLink;
			}
		}
		if (epJSON.pdfLink) {
			if (epJSON.pdfLink.indexOf("http") == 0) {
				pdfURL = epJSON.pdfLink;
			}
			else {
				pdfURL = "https://www.e-periodica.ch" + epJSON.pdfLink;
			}
		}
		if (pdfURL) {
			item.attachments.push({
				url: pdfURL,
				title: "Full Text PDF",
				type: "application/pdf"
			});
		}
		item.complete();
	}
}

function processRIS(risText, pdfURL) {
	// load translator for RIS
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
	// Z.debug(text);
	
	translator.setString(risText);
	translator.setHandler("itemDone", function (obj, item) {
		// Don't save HTML snapshot from 'UR' tag
		item.attachments = [];
		
		// change colon spacing in title and publicationTitle
		item.title = item.title.replace(' : ', ': ');

		if (item.publicationTitle) {
			item.publicationTitle = item.publicationTitle.replace(' : ', ': ');
		}
		
		if (item.title == item.title.toUpperCase()) {
			item.title = ZU.capitalizeTitle(item.title.toLowerCase(), true);
		}

		// Retrieve fulltext
		if (pdfURL !== null) {
			item.attachments.push({
				url: pdfURL,
				title: "Full Text PDF",
				type: "application/pdf"
			});
		}

		// DB in RIS maps to archive; we don't want that
		delete item.archive;
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.doImport();
	});
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.e-periodica.ch/digbib/view?pid=enh-006%3A2018%3A11::121#133",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Untersuchungen zur aktuellen Verbreitung der schweizerischen Laufkäfer (Coleoptera: Carabidae): Zwischenbilanz",
				"creators": [
					{
						"lastName": "Hoess",
						"firstName": "René",
						"creatorType": "author"
					},
					{
						"lastName": "Chittaro",
						"firstName": "Yannick",
						"creatorType": "author"
					},
					{
						"lastName": "Walter",
						"firstName": "Thomas",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"DOI": "10.5169/seals-986030",
				"ISSN": "1662-8500",
				"libraryCatalog": "E-periodica Switzerland",
				"pages": "129",
				"publicationTitle": "Entomo Helvetica: entomologische Zeitschrift der Schweiz",
				"shortTitle": "Untersuchungen zur aktuellen Verbreitung der schweizerischen Laufkäfer (Coleoptera",
				"volume": "11",
				"attachments": [
					{
						"title": "Full Text PDF",
						"type": "application/pdf"
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
		"url": "https://www.e-periodica.ch/digbib/view?pid=bts-004%3A2011%3A137%3A%3A254&referrer=search#251",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Décentralisation, opportunités et contraintes",
				"creators": [
					{
						"lastName": "Fignolé",
						"firstName": "Jean-Claude",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"DOI": "10.5169/seals-144646",
				"ISSN": "0251-0979",
				"issue": "05-06",
				"libraryCatalog": "E-periodica Switzerland",
				"pages": "14",
				"publicationTitle": "Tracés: bulletin technique de la Suisse romande",
				"volume": "137",
				"attachments": [
					{
						"title": "Full Text PDF",
						"type": "application/pdf"
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
		"url": "https://www.e-periodica.ch/digbib/view?pid=alp-001%3A1907%3A2%3A%3A332#375",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Stimmen und Meinungen: schweizerisches Nationaldrama?",
				"creators": [
					{
						"lastName": "Falke",
						"firstName": "Konrad",
						"creatorType": "author"
					}
				],
				"date": "1907-1908",
				"DOI": "10.5169/seals-747870",
				"issue": "12",
				"libraryCatalog": "E-periodica Switzerland",
				"pages": "364",
				"publicationTitle": "Berner Rundschau: Halbmonatsschrift für Dichtung, Theater, Musik und bildende Kunst in der Schweiz",
				"shortTitle": "Stimmen und Meinungen",
				"volume": "2",
				"attachments": [
					{
						"title": "Full Text PDF",
						"type": "application/pdf"
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
		"url": "https://www.e-periodica.ch/digbib/view?pid=bts-004%3A2011%3A137%3A%3A262#262",
		"detectedItemType": "journalArticle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Untitled",
				"creators": [],
				"date": "2011",
				"issue": "05-06",
				"libraryCatalog": "E-periodica Switzerland",
				"publicationTitle": "Tracés: bulletin technique de la Suisse romande",
				"url": "https://www.e-periodica.ch/digbib/view?pid=bts-004%3A2011%3A137%3A%3A262",
				"volume": "137",
				"attachments": [
					{
						"title": "Full Text PDF",
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
