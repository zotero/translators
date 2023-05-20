{
	"translatorID": "7dda2b16-6a04-4d22-afd1-21d59f8d0a4c",
	"label": "National Library of Poland ISBN search",
	"creator": "Maciej Nux Jaros",
	"target": "",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 97,
	"inRepository": true,
	"translatorType": 8,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-05-20 21:23:00"
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
	return !!item.ISBN;
}

function doSearch(item) {
	const isbn = ZU.cleanISBN(item.ISBN);
	const url = `https://data.bn.org.pl/api/institutions/bibs.marcxml?isbn=${isbn}`;
	ZU.doGet(url, function (xmlText) {
		// example XML:
		// <resp>
		// 	<nextPage>https://data.bn.org.pl/api/institutions/bibs.marcxml?isbnIssn=8301136545&amp;sinceId=1540416</nextPage>
		// 	<collection>
		// 		<record xmlns='http://www.loc.gov/MARC21/slim'>...</record>
		// 	</collection>
		// </resp>
		const doc = ((new DOMParser()).parseFromString(xmlText, 'text/xml'))
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
