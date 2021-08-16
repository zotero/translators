{
	"translatorID": "a1a5a46b-62e1-49ef-8874-ca07ada35c3a",
	"label": "Transportation Research Board",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.trb\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-10 15:49:28"
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


function detectWeb(doc, _url) {
	if (attr(doc, 'meta[name="contenttype"]', 'content').toLowerCase().includes('publication')) {
		return "book";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('table a.LinkTitle[href*="/Blurbs/"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (title.includes('TR News')) continue;
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

function scrape(doc, _url) {
	let loginURL = attr(doc, '.file-container a[href*="record_id"]', 'href');
	let recordID = loginURL.match(/record_id=([^&]+)/)[1];
	
	var translator = Zotero.loadTranslator('web');
	// National Academies Press
	translator.setTranslator('f76afa52-0524-440e-98ba-7c0c10a7b693');

	translator.getTranslatorObject(function (trans) {
		let napURL = `https://www.nap.edu/catalog/${recordID}`;
		trans.scrapeFromURL(napURL);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.trb.org/Publications/Blurbs/178576.aspx",
		"items": [
			{
				"itemType": "book",
				"title": "Socioeconomic Impacts of Automated and Connected Vehicles",
				"creators": [
					{
						"lastName": "Transportation Research Board",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "National Academies of Sciences, Engineering, and Medicine",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "Andrea",
						"lastName": "Ricci",
						"creatorType": "editor"
					}
				],
				"date": "2018",
				"abstractNote": "TRB's Conference Proceedings 56: Socioeconomic Impacts of Automated and Connected Vehicles summarizes a symposium held in June 26–27, 2018, in Brussels, Belgium. Hosted by the European Commission and TRB, it was the sixth annual symposium sponsored by the European Commission and the United States. The goals of these symposia are to promote common understanding, efficiencies, and trans-Atlantic cooperation within the international transportation research community while accelerating transportation sector innovation in the European Union and the United States.",
				"language": "English",
				"libraryCatalog": "Transportation Research Board",
				"numPages": "96",
				"place": "Washington, DC",
				"publisher": "The National Academies Press",
				"url": "https://www.nap.edu/catalog/25359/socioeconomic-impacts-of-automated-and-connected-vehicles",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Transportation and Infrastructure"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.trb.org/Publications/PubsACRPResearchResultsDigests.aspx",
		"items": "multiple"
	}
]
/** END TEST CASES **/
