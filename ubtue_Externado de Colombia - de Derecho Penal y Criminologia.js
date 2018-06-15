{
	"translatorID": "ddc7f2be-8d13-4905-9343-44a999aae9e2",
	"label": "Externado de Colombia - de Derecho Penal y Criminología",
	"creator": "Madeesh Kannan",
	"target": "^https?://(\\\\\\\\w+\\\\\\\\.)*revistas.uexternado.edu.co/index.php/derpen/article/view/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-06-15 16:43:52"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Universitätsbibliothek Tübingen.  All rights reserved.

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/



function detectWeb(doc, url) {
	// thin wrapper around DOI
	return "journalArticle";
}


function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if (type == "journalArticle") {
		// use DOI for the basic data
		var translator = Zotero.loadTranslator("search");
		translator.setTranslator("11645bd1-0420-45c1-badb-53fb41eeb753");		// CrossRef
		var doi = ZU.xpathText(doc,'//a[@class="doi-link"]/@href');
		doi = doi.trim().substr(16);
		Z.debug(doi);

		var item = {"itemType":"journalArticle", "DOI":doi};
		translator.setSearch(item);
		translator.setHandler("itemDone", function (t, i) {
			i.complete();
		});
		translator.setHandler("error", function() {});
		translator.translate();
	} else {
		Z.debug("Item type " + type + " not supported yet");
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://revistas.uexternado.edu.co/index.php/derpen/article/view/5207",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Nota editorial",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Revista de",
						"lastName": "Derecho Penal y Criminología"
					}
				],
				"date": "2017-12-12",
				"DOI": "10.18601/01210483.v38n104.01",
				"ISSN": "2346-2108, 0121-0483",
				"issue": "104",
				"libraryCatalog": "Crossref",
				"pages": "9",
				"publicationTitle": "Derecho Penal y Criminología",
				"url": "http://revistas.uexternado.edu.co/index.php/derpen/article/view/5207",
				"volume": "38",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
