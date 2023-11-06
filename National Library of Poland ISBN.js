{
	"translatorID": "aa7f310e-10d3-4209-91dc-88301e7070c6",
	"label": "National Library of Poland ISBN",
	"creator": "Maciej Nux Jaros",
	"target": "",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 98,
	"inRepository": true,
	"translatorType": 8,
	"lastUpdated": "2023-06-15 02:45:16"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Maciej Nux Jaros
	
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

function detectSearch(item) {
	// Other supported parameters (BN docs):
	// https://data.bn.org.pl/docs/bibs
	
	// for now only using ISBN
	if (typeof item.ISBN === 'string') {
		// filter by country code (83)
		const isbn = item.ISBN.replace(/[ -]/g, '');
		return isbn.search(/^(97[8-9]83|83)/) === 0;
	}
	return false;
}

// function test(item) {
// 	const result = detectSearch(item);
//   console.log({result, item:JSON.stringify(item)});
// }
// // not matched
// test({})
// test({ISBN:'123'})
// test({ISBN:'978'})
// // matched
// test({ISBN:'97883'})
// test({ISBN:'83'})
// test({ISBN:'978-83-578'})
// test({ISBN:'83-123456'})
// test({ISBN:' 978-83-578'})
// test({ISBN:' 83-123456'})
// test({ISBN:' -978-83-578'})
// test({ISBN:' -83-123456'})

function doSearch(item) {
	const isbn = ZU.cleanISBN(item.ISBN);
	const url = `https://data.bn.org.pl/api/institutions/bibs.marcxml?isbnIssn=${isbn}`;
	ZU.doGet(url, function (xmlText) {
		// example XML:
		// <resp>
		// 	<nextPage>https://data.bn.org.pl/api/institutions/bibs.marcxml?isbnIssn=8301136545&amp;sinceId=1540416</nextPage>
		// 	<collection>
		// 		<record xmlns='http://www.loc.gov/MARC21/slim'>...</record>
		// 	</collection>
		// </resp>
		const doc = ((new DOMParser()).parseFromString(xmlText, 'text/xml'));
		let record = doc.querySelector('collection > record');
		if (!record) {
			return;
		}

		let marcXml = new XMLSerializer().serializeToString(record);

		// MARCXML.js translator
		const translator = Zotero.loadTranslator('import');
		translator.setTranslator('edd87d07-9194-42f8-b2ad-997c4c7deefd');
		translator.setString(marcXml);
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "search",
		"input": {
			"ISBN": "8301136545"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Podstawy chemii nieorganicznej",
				"creators": [
					{
						"firstName": "Adam",
						"lastName": "Bielański",
						"creatorType": "author"
					}
				],
				"date": "2002",
				"ISBN": "9788301136543",
				"callNumber": "2.152.922 A",
				"edition": "Wyd. 5 zm. i popr",
				"language": "pol",
				"libraryCatalog": "National Library of Poland ISBN",
				"numPages": "1064",
				"place": "Warszawa",
				"publisher": "Wydaw. Naukowe PWN",
				"attachments": [],
				"tags": [
					{
						"tag": "Chemia nieorganiczna"
					},
					{
						"tag": "Chemia nieorganiczna"
					},
					{
						"tag": "Podręczniki akademickie"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
