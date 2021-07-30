{
	"translatorID": "f349954c-9957-4b5f-be24-1a8bb52f7fbd",
	"label": "BnF ISBN",
	"creator": "Abe Jellinek",
	"target": "",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 98,
	"inRepository": true,
	"translatorType": 8,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-30 21:23:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek

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


let ns = {
	srw: 'http://www.loc.gov/zing/srw/',
	mxc: 'info:lc/xmlns/marcxchange-v2'
};

function detectSearch(item) {
	return !!item.ISBN;
}

function doSearch(item) {
	let ISBN = ZU.cleanISBN(item.ISBN);
	let url = `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&query=bib.isbn%20all%20%22${ISBN}%22`;
	ZU.doGet(url, function (xmlText) {
		let parser = new DOMParser();
		let xml = parser.parseFromString(xmlText, 'application/xml');
		let records = ZU.xpath(xml.documentElement, '/srw:searchRetrieveResponse/srw:records/srw:record', ns);
		if (!records) return;

		for (let record of records) {
			if (ZU.xpathText(record, '//srw:recordSchema', ns) != 'marcxchange') continue;

			let marcRecords = ZU.xpath(record, '//srw:recordData/mxc:record', ns);
			if (!marcRecords) continue;

			for (let marcRecord of marcRecords) {
				marcRecord.setAttribute('xmlns:marc', 'http://www.loc.gov/MARC21/slim');

				// Here we convert the XML we get from BnF from the original
				// MarcXchange format into MARCXML by search-and-replacing
				// the namespace. MARCXML and and MarcXchange are essentially
				// the same format: the latter is a "generalization (mainly by
				// weakening restrictions)" of the former. We didn't enforce
				// those restrictions to begin with.

				// MarcXchange spec:
				// https://www.loc.gov/standards/iso25577/ISO_DIS_25577__E_.pdf

				let marcxchangeText = new XMLSerializer().serializeToString(marcRecord);
				let marcXMLText = marcxchangeText.replace(/<mxc:/g, '<marc:').replace(/<\/mxc:/g, '</marc:');

				let translator = Zotero.loadTranslator('import');
				// MARCXML
				translator.setTranslator('edd87d07-9194-42f8-b2ad-997c4c7deefd');
				translator.setString(marcXMLText);
				translator.translate();
			}
		}
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "search",
		"input": {
			"ISBN": "9781841692203"
		},
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Markus",
						"firstName": "Keith A.",
						"creatorType": "author"
					},
					{
						"lastName": "Borsboom",
						"creatorType": "author",
						"firstName": "Denny"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"libraryCatalog": "BnF ISBN",
				"place": "New York",
				"ISBN": "9781841692203",
				"title": "Frontiers in test validity theory: measurement, causation and meaning",
				"publisher": "Routledge",
				"date": "2013",
				"language": "eng",
				"shortTitle": "Frontiers in test validity theory",
				"series": "Multivariate applications series",
				"callNumber": "150.287"
			}
		]
	}
]
/** END TEST CASES **/
