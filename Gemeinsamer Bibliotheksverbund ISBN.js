{
	"translatorID": "de0eef58-cb39-4410-ada0-6b39f43383f9",
	"label": "Gemeinsamer Bibliotheksverbund ISBN",
	"creator": "Philipp Zumstein",
	"target": "",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 8,
	"browserSupport": "gcsibv",
	"lastUpdated": "2015-04-09 02:43:24"
}

/*
***** BEGIN LICENSE BLOCK *****

Copyright © 2015 Philipp Zumstein

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
	return !!item.ISBN;
}

function doSearch(item) {
	var queryISBN = ZU.cleanISBN(item.ISBN);
	//search the ISBN over the SRU of the GBV, and take the result it as MARCXML
	//documentation: https://www.gbv.de/wikis/cls/SRU
	var url = "http://sru.gbv.de/gvk?version=1.1&operation=searchRetrieve&query=pica.isb=" + queryISBN + " AND pica.mat%3DB&maximumRecords=1";
	ZU.doGet(url, function (text) {
		Z.debug(text);
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("edd87d07-9194-42f8-b2ad-997c4c7deefd");
		translator.setString(text);
		
		translator.setHandler("itemDone", function (obj, item) {
			// The url to the table of contents (scanned through DNB)
			// can be contained in field 856 $3 and the url schema is unique:
			// prefix (http://d-nb.info/) + id + suffix for toc (/04) 
			var tocURL = text.match(/http:\/\/d-nb\.info\/.*\/04/);
			if (tocURL) {
				item.attachments = [{
					url: tocURL[0],
					title: "Table of Contents PDF",
					mimeType: "application/pdf"
				}];
			}
			//DDC is not the callNumber in Germany
			item.callNumber = "";
			//place the queried ISBN as the first ISBN in the list (dublicates will be removed later)
			item.ISBN = queryISBN + " " + item.ISBN;
			item.complete();
		});
		translator.translate();

	});
}