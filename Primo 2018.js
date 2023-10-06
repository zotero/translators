{
	"translatorID": "cd669d1f-96b8-4040-aa36-48f843248399",
	"label": "Primo 2018",
	"creator": "Philipp Zumstein",
	"target": "(/primo-explore/|/discovery/(search|fulldisplay|jsearch|dbsearch|npsearch|openurl|jfulldisplay|dbfulldisplay|npfulldisplay|collectionDiscovery)\\?)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-05-11 21:32:37"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018-2021 Philipp Zumstein
	
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


function detectWeb(doc, _url) {
	var rows = getPnxElems(doc);
	if (rows.length == 1) return "book";
	if (rows.length > 1) return "multiple";
	let exploreElem = doc.querySelector('primo-explore');
	if (exploreElem) {
		Z.monitorDOMChanges(exploreElem, { childList: true, subtree: true });
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = getPnxElems(doc);
	for (let row of rows) {
		let href = row.dataset.url;
		let title = text(row.parentNode, '.item-title')
			|| row.parentNode.textContent;
		if (!href || !title) continue;
		title = title.replace(/^;/, '');
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
	else {
		let pnxElems = getPnxElems(doc);
		let pnxURL = pnxElems[0].getAttribute('data-url');
		scrape(doc, pnxURL);
	}
}


function scrape(doc, pnxURL) {
	ZU.doGet(pnxURL, function (text) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("efd737c9-a227-4113-866e-d57fbc0684ca");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			if (pnxURL) {
				item.libraryCatalog = pnxURL.match(/^https?:\/\/(.+?)\//)[1].replace(/\.hosted\.exlibrisgroup/, "");
			}
			item.complete();
		});
		translator.translate();
	});
}

function getPnxElems(doc) {
	let single = doc.querySelectorAll('.urlToXmlPnxSingleRecord[data-url]');
	if (single.length == 1) return single;
	return doc.querySelectorAll('.urlToXmlPnx[data-url]');
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://virtuose.uqam.ca/primo-explore/fulldisplay?vid=UQAM&docid=UQAM_BIB000969205&context=L",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "War",
				"creators": [
					{
						"lastName": "Baynes",
						"firstName": "Ken",
						"creatorType": "author"
					},
					{
						"firstName": "Ken",
						"lastName": "Baynes",
						"creatorType": "author"
					},
					{
						"lastName": "Welsh Arts Council",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "Glynn Vivian Art Gallery",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "1970",
				"callNumber": "NX650G8B38",
				"language": "eng",
				"libraryCatalog": "virtuose.uqam.ca",
				"place": "Boston",
				"publisher": "Book and Art Chop",
				"series": "Art and society 1",
				"attachments": [],
				"tags": [
					{
						"tag": "ART; GUERRE; WAR"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://bcujas-catalogue.univ-paris1.fr/primo-explore/fulldisplay?vid=CUJAS_V1&docid=33CUJAS_ALEPH000070200&context=L&search_scope=LSCOP_ALL",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "Test pattern for living",
				"creators": [
					{
						"firstName": "Nicholas",
						"lastName": "Johnson",
						"creatorType": "author"
					}
				],
				"date": "1972",
				"callNumber": "203.206",
				"language": "eng",
				"libraryCatalog": "bcujas-catalogue.univ-paris1.fr",
				"numPages": "xx+154",
				"place": "Toronto New York",
				"publisher": "Bantam Books",
				"attachments": [],
				"tags": [
					{
						"tag": "Mass media"
					},
					{
						"tag": "Social aspects"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "United States"
					},
					{
						"tag": "Social conditions"
					},
					{
						"tag": "1960-"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://explore.lib.uliege.be/discovery/collectionDiscovery?vid=32ULG_INST:ULIEGE&collectionId=81129164700002321&lang=fr",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://search.library.berkeley.edu/discovery/search?vid=01UCS_BER:UCB&tab=Default_UCLibrarySearch&search_scope=DN_and_CI&offset=0&query=any,contains,test",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
