{
	"translatorID": "86168097-0ce0-4c77-ba34-8bd57f47a3d3",
	"label": "Juricaf",
	"creator": "Guillaume Adreani and Abe Jellinek",
	"target": "^https?://(www\\.)?juricaf\\.org/(arret|recherche)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-12 16:37:43"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Guillaume Adreani and Abe Jellinek
	
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
	if (attr(doc, 'meta[name="dc.type"]', 'content') == 'case') {
		return "case";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.resultatcols > a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		item.creators = [];
		item.attachments = [];
		item.attachments.push({
			title: 'Full Text RTF',
			mimeType: 'text/rtf',
			url: attr(doc, 'a[href*="/telecharger_rtf.do"]', 'href')
		});
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "case";
		trans.addCustomFields({
			'reporter': 'reporter',
			'dc.accessrights': 'rights',
			'dc.creator': 'court',
			'docketnumber': 'docketNumber',
			'shorttitle': 'shortTitle'
		});
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.juricaf.org/recherche/+/facet_pays%3AFrance",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://juricaf.org/arret/FRANCE-CONSEILDETAT-20121121-326375",
		"items": [
			{
				"itemType": "case",
				"caseName": "France, Conseil d'État, 9ème sous-section jugeant seule, 21 novembre 2012, 326375",
				"creators": [],
				"dateDecided": "2012-11-21",
				"abstractNote": "Administrative",
				"court": "Conseil d'État",
				"docketNumber": "326375",
				"language": "FR",
				"reporter": "Inédit au recueil Lebon",
				"rights": "public",
				"shortTitle": "CE, 21 novembre 2012, n° 326375",
				"url": "https://juricaf.org/arret/juricaf.org/arret/FRANCE-CONSEILDETAT-20121121-326375",
				"attachments": [
					{
						"title": "Full Text RTF",
						"mimeType": "text/rtf"
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
