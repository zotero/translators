{
	"translatorID": "02378e28-8a35-440c-b5d2-7eaca74615b6",
	"label": "Linked Metadata",
	"creator": "Martynas Bagdonas",
	"target": "",
	"minVersion": "3.0.4",
	"maxVersion": "",
	"priority": 320,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-11-01 19:46:46"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2011 Avram Lyon and the Center for History and New Media
					 George Mason University, Fairfax, Virginia, USA
					 http://zotero.org

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

/*
	The current weaknesses of this translator:
		* Unable to detect item type, because an additional request is necessary
		* Always returns 'multiple' because some metadata formats can
		  carry multiple items, even though in practice it's very rare
		* Processes formats in the order defined in RECOGNIZABLE_FORMATS,
		  but in some cases metadata quality can vary between formats. The best would be to
		  combine metadata from all formats, but that would mean multiple HTTP requests
 */

// Formats are taken from unAPI translator
var RECOGNIZABLE_FORMATS = ["rdf_zotero", "rdf_bibliontology", "marc",
	"unimarc", "marcxml", "mods", "ris", "refer", "bibtex", "rdf_dc"];

var FORMAT_GUIDS = {
	"rdf_zotero":"5e3ad958-ac79-463d-812b-a86a9235c28f",
	"rdf_bibliontology":"14763d25-8ba0-45df-8f52-b8d1108e7ac9",
	"mods":"0e2235e7-babf-413c-9acf-f27cce5f059c",
	"marc":"a6ee60df-1ddc-4aae-bb25-45e0537be973",
	"unimarc":"a6ee60df-1ddc-4aae-bb25-45e0537be973",
	"marcxml":"edd87d07-9194-42f8-b2ad-997c4c7deefd",
	"ris":"32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7",
	"refer":"881f60f2-0802-411a-9228-ce5f47b64c7d",
	"bibtex":"9cb70025-a888-4a29-a210-93ec52da40d4",
	"rdf_dc":"5e3ad958-ac79-463d-812b-a86a9235c28f"
};

function detectWeb(doc, url) {
	let nodes = doc.querySelectorAll('link[rel="alternate"');
	if (nodes.length) {
		return 'multiple';
	}
}

function getLinks(doc, url) {
	let nodes = doc.querySelectorAll('link[rel="alternate"');
	
	let results = [];
	
	for (let node of nodes) {
		let title = node.getAttribute('title') || '';
		title = title.toLowerCase();
		
		let type = node.getAttribute('type') || '';
		type = type.toLowerCase();
		
		let href = node.getAttribute('href');
		if (!href) continue;
		let ext = href.split('.').slice(-1)[0].toLowerCase();
		
		for (let RECOGNIZABLE_FORMAT of RECOGNIZABLE_FORMATS) {
			if (
				title.match(new RegExp('^' + RECOGNIZABLE_FORMAT + '\b')) ||
				type.match(new RegExp('\b' + RECOGNIZABLE_FORMAT + '\b')) ||
				ext === RECOGNIZABLE_FORMAT
			) {
				results.push({
					format: RECOGNIZABLE_FORMAT,
					url: href
				});
			}
		}
	}
	
	results.sort(function (a, b) {
		return RECOGNIZABLE_FORMATS.indexOf(a.format) - RECOGNIZABLE_FORMATS.indexOf(b.format);
	});
	
	return results;
}

async function doWeb(doc, url) {
	let links = getLinks(doc, url);
	
	for (let link of links) {
		try {
			let req = await ZU.request("GET", link.url, {responseType: "text"});
			
			let translator = Zotero.loadTranslator("import");
			translator.setTranslator(FORMAT_GUIDS[link.format]);
			translator.setString(req.responseText);
			translator.setHandler("itemDone", function (obj, item) {
			});
			
			let items = await translator.translate();
			for (let item of items) {
				item.complete();
			}
			
			return;
		}
		catch (err) {
		
		}
	}
}

var exports = {
	"doWeb": doWeb,
	"detectWeb": detectWeb
};

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://clio.columbia.edu/catalog/1815901?counter=1",
		"items": [
			{
				"key": "CK2DQGLD",
				"version": 0,
				"itemType": "book",
				"creators": [
					{
						"firstName": "Berthold",
						"lastName": "Roland",
						"creatorType": "author"
					}
				],
				"tags": [
					{
						"tag": "History",
						"type": 1
					},
					{
						"tag": "Mannheim (Germany)",
						"type": 1
					}
				],
				"title": "Mannheim: Geschichte, Kunst und Kultur der freundlichen und lebendigen Stadt an Rhein und Neckar",
				"publisher": "Emig",
				"date": "1966",
				"place": "Amorbach",
				"numPages": "120",
				"callNumber": "943M31 R64",
				"extra": "OCLC: ocm11808835",
				"libraryCatalog": "Generic"
			}
		]
	}
];
/** END TEST CASES **/
