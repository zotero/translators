// {
// 	'translatorID': 'e3748cf3-36dc-4816-bf86-95a0b63feb03',
// 	'label': 'Gale Databases',
// 	'creator': 'Jim Miazek',
// 	'target': '^https?://[^?&]*(?:gale|galegroup|galetesting|ggtest)\\.com(?:\\:\\d+)?/ps/',
// 	'minVersion': '3.0',
// 	'maxVersion': '',
// 	'priority': 100,
// 	'inRepository': true,
// 	'translatorType': 4,
// 	'browserSupport': 'gcsibv',
// 	'lastUpdated': '2019-10-11 12:00:00'
// }

/*
	***** BEGIN LICENSE BLOCK *****

	Gale Databases Translator - Copyright © 2019
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

var GaleZotero = (function () {

	var DATA_TRANSLATOR = '32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7';
	var POST_URL = '/ps/citationtools/rest/cite/download';

	function detect(doc) {
		var entries = getCitableDocuments(doc);
		switch (entries.length) {
			case 0 : return false;
			case 1 : return entries[0].getAttribute('data-zoterolabel');
			default: return 'multiple';
		}
	}

	function process(doc) {
		var entries = getCitableDocuments(doc);
		switch (entries.length) {
			case 0 : break;
			case 1 : processSingleEntry(doc); break;
			default: processMulipleEntries(entries);
		}
	}

	function processMulipleEntries(entries) {
		Zotero.selectItems(createKeyValuePairs(entries), function (selectedItems) {
			if (selectedItems) {
				Zotero.Utilities.processDocuments(getURLs(selectedItems), processSingleEntry);
			}
		});
	}

	function createKeyValuePairs(entries) {
		var map = {};
		for (var item in entries) {
			/* istanbul ignore next */
			if (entries.hasOwnProperty(item)) {
				var entry = entries[item];
				map[entry.href] = entry.text;
			}
		}
		return map;
	}

	function getURLs(selectedItems) {
		var urls = [];
		for (var url in selectedItems) {
			if (selectedItems.hasOwnProperty(url)) {
				urls.push(url);
			}
		}
		return urls;
	}

	function processSingleEntry(doc) {
		var entry = doc.querySelector('.zotero');
		var docId = entry.getAttribute('data-documentnumber');
		var documentUrl = entry.getAttribute('href');
		var productName = entry.getAttribute('data-productname');
		var documentData = '{"docId":"' + docId +'","documentUrl":"' + documentUrl + '","productName":"' + productName + '"}';
		var urlParams = "citationFormat=RIS&documentData=" + encodeString(documentData);
		Zotero.Utilities.doPost(POST_URL, urlParams, translate);
	}

	function translate(data) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator(DATA_TRANSLATOR);
		translator.setString(transform(data));
		translator.setHandler("itemDone", function (obj, item) {
			if (item.ISSN) {
				item.ISSN = Zotero.Utilities.cleanISSN(item.ISSN);
			}
			if (item.pages && item.pages.endsWith("+")) {
				item.pages = item.pages.replace(/\+/, "-");
			}
			item.attachments.push({document: data, title: "Snapshot"});
			item.complete();
		});
		translator.translate();
	}

	function transform(ris) {
		return ris.trim()
			.replace(/M1\s*-/g, "IS  -") // gale puts issue numbers in M1
			.replace(/^L2\s+-.+\n/gm, '') // Ignore
			.replace(/^N1(?=\s+-\s+copyright)/igm, 'CR');
	}

	function encodeString(value) {
		return encodeURIComponent(value).replace(/%20/g, "+");
	}

	function getCitableDocuments(doc) {
		return doc.getElementsByClassName('zotero');
	}

	return {
		detect: detect,
		process: process
	};

}());

function detectWeb(doc, url) { // eslint-disable-line no-unused-vars
	return GaleZotero.detect(doc);
}

function doWeb(doc, url) { // eslint-disable-line no-unused-vars
	return GaleZotero.process(doc);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://go.qa.galetesting.com/ps/retrieve.do?tabID=T002&resultListType=RESULT_LIST&searchResultsType=SingleTab&searchType=BasicSearchForm&currentPosition=1&docId=GALE%7CA598621601&docType=Critical+essay&sort=Relevance&contentSegment=ZONE-Exclude-FT&prodId=AONE&contentSet=GALE%7CA598621601&searchId=R1&userGroupName=zotero&inPS=true",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "\"Real\" Mind Style and Authenticity Effects in Fiction: Represented Experiences of War in Atonement",
				"creators": [
					{
						"lastName": "Nuttall",
						"firstName": "Louise",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"ISSN": "0039-4238",
				"archive": "Gale Academic OneFile",
				"issue": "2",
				"language": "English",
				"libraryCatalog": "Gale",
				"pages": "215-",
				"publicationTitle": "Style",
				"shortTitle": "\"Real\" Mind Style and Authenticity Effects in Fiction",
				"url": "https://link.qa.galetesting.com/apps/doc/A598621601/AONE?u=zotero&sid=zotero&xid=c1dc0ef6",
				"volume": "53",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					{
						"tag": "Atonement (McEwan, Ian) (Novel)"
					},
					{
						"tag": "Authenticity"
					},
					{
						"tag": "English writers"
					},
					{
						"tag": "Literary styles"
					},
					{
						"tag": "McEwan, Ian"
					},
					{
						"tag": "War stories"
					}
				],
				"notes": [
					{
						"note": "<p>Northern Illinois University</p>"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
