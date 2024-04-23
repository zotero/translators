{
	"translatorID": "5f506a9a-8076-4e1e-950c-f55d32003aae",
	"label": "LIBRIS ISBN",
	"creator": "Sebastian Berlin",
	"target": "",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 98,
	"inRepository": true,
	"translatorType": 8,
	"lastUpdated": "2024-04-23 18:44:30"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Sebastian Berlin
	
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
	if (typeof item.ISBN !== 'string') {
		return false;
	}

	// Filter by country code 91 (Sweden).
	let isbn = ZU.cleanISBN(item.ISBN);
	return /^(97[8-9])?91/.test(isbn);
}

async function doSearch(item) {
	let isbn = ZU.cleanISBN(item.ISBN);
	let url = `http://libris.kb.se/xsearch?query=ISBN:${isbn}`;
	let xmlText = await ZU.requestText(url);
	let doc = ((new DOMParser()).parseFromString(xmlText, 'text/xml'));
	let record = doc.querySelector('collection > record');
	if (!record) {
		return;
	}

	let marcXml = new XMLSerializer().serializeToString(record);
	let translator = Zotero.loadTranslator('import');
	translator.setTranslator('edd87d07-9194-42f8-b2ad-997c4c7deefd');
	translator.setString(marcXml);
	translator.setHandler('itemDone', (_obj, item) => {
		// Yes, it is a book
		item.tags = item.tags.filter(tag => (tag.tag || tag) !== 'Bok');
		item.complete();
	});
	translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "search",
		"input": {
			"ISBN": "978-91-977109-4-7"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Så fungerar Wikipedia: allt du behöver veta om hur man bidrar, om kritiken och kvalitetssatsningarna",
				"creators": [
					{
						"firstName": "Lennart",
						"lastName": "Guldbrandsson",
						"creatorType": "author"
					}
				],
				"date": "2008",
				"ISBN": "9789197710947",
				"edition": "Ny utg.",
				"libraryCatalog": "LIBRIS ISBN",
				"numPages": "244",
				"place": "Ronneby",
				"publisher": "Hexa",
				"shortTitle": "Så fungerar Wikipedia",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
