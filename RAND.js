{
	"translatorID": "4a49257a-035f-4b8b-ba26-6ddfe3b9008d",
	"label": "RAND",
	"creator": "Abe Jellinek",
	"target": "^https://www\\.rand\\.org/(pubs/|search\\.html)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-10 16:23:46"
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


function detectWeb(doc, url) {
	if (url.includes('/pubs/external_publications/')) {
		return "journalArticle";
	}
	else if (url.includes('/pubs/')) {
		return "report";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('main h3.title a[href*="/pubs/"]');
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
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		item.attachments = item.attachments.filter(a => a.title != 'Snapshot');
		
		if (item.itemType == 'journalArticle') {
			let citation = text(doc, '.citation');
			if (!item.publicationTitle) {
				item.publicationTitle = (citation.match(/Published in: ([^,]+)/) || [])[1];
			}
			if (!item.volume) {
				item.volume = (citation.match(/Volume ([0-9]+)/) || [])[1];
			}
			if (!item.issue) {
				item.issue = (citation.match(/Issue ([0-9]+)/) || [])[1];
			}
			if (!item.pages) {
				item.pages = (citation.match(/pages ([0-9\-–]+)/) || [])[1];
			}
		}
		
		delete item.reportType;
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = detectWeb(doc, url);
		if (trans.itemType == 'multiple') return;
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.rand.org/pubs/conf_proceedings/CFA1299-1.html",
		"items": [
			{
				"itemType": "report",
				"title": "COVID-19 and the Courts: Lessons from the Pandemic",
				"creators": [
					{
						"firstName": "Nicholas M.",
						"lastName": "Pace",
						"creatorType": "author"
					},
					{
						"firstName": "Bethany",
						"lastName": "Saunders-Medina",
						"creatorType": "author"
					},
					{
						"firstName": "Jamie",
						"lastName": "Morikawa",
						"creatorType": "author"
					},
					{
						"firstName": "Sanjana",
						"lastName": "Manjeshwar",
						"creatorType": "author"
					},
					{
						"firstName": "Anne",
						"lastName": "Bloom",
						"creatorType": "author"
					}
				],
				"date": "2021/6/4",
				"abstractNote": "<p>The U.S. civil justice system was forced to restructure almost overnight due to the coronavirus pandemic in 2020. Panelists in this virtual conference discussed how the pandemic has affected civil juries and pretrial case management, addressed implications that the pandemic might have for federal and state civil rules, and discussed solutions that could be applied to the civil justice system after circumstances eventually return to",
				"institution": "RAND Corporation",
				"language": "en",
				"libraryCatalog": "www.rand.org",
				"reportType": "Product Page",
				"shortTitle": "COVID-19 and the Courts",
				"url": "https://www.rand.org/pubs/conf_proceedings/CFA1299-1.html",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Civil Law"
					},
					{
						"tag": "Coronavirus Disease 2019 (COVID-19)"
					},
					{
						"tag": "Juries"
					},
					{
						"tag": "Legal Case and Court Management"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.rand.org/pubs/perspectives/PEA787-1.html",
		"items": [
			{
				"itemType": "report",
				"title": "Opportunities for the Brazilian Navy to Employ Additional Unmanned Systems",
				"creators": [
					{
						"firstName": "Scott",
						"lastName": "Savitz",
						"creatorType": "author"
					}
				],
				"date": "2021/8/10",
				"abstractNote": "<p>This Perspective is an exploration of some of the ways the Brazilian Navy could use unmanned systems to improve effectiveness and, potentially, reduce risks and costs while meeting a wide range of demands over vast and diverse geographic areas. This analysis can also serve as a basic template for how other navies could employ unmanned vehicles.</p>",
				"institution": "RAND Corporation",
				"language": "en",
				"libraryCatalog": "www.rand.org",
				"reportType": "Product Page",
				"url": "https://www.rand.org/pubs/perspectives/PEA787-1.html",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Brazil"
					},
					{
						"tag": "Unmanned Aerial Vehicles"
					},
					{
						"tag": "Unmanned Maritime Vessels"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.rand.org/pubs/external_publications/EP68699.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Absenteeism and Presenteeism Among American Workers",
				"creators": [
					{
						"firstName": "Nicole",
						"lastName": "Maestas",
						"creatorType": "author"
					},
					{
						"firstName": "Kathleen J.",
						"lastName": "Mullen",
						"creatorType": "author"
					},
					{
						"firstName": "Stephanie",
						"lastName": "Rennane",
						"creatorType": "author"
					}
				],
				"date": "2021/8/10",
				"abstractNote": "We analyze the relationship between absences, presenteeism, and work outcomes using data from the American Working Conditions Survey.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "www.rand.org",
				"pages": "13–23",
				"publicationTitle": "Journal of Disability Policy Studies",
				"url": "https://www.rand.org/pubs/external_publications/EP68699.html",
				"volume": "32",
				"attachments": [],
				"tags": [
					{
						"tag": "Disability Insurance"
					},
					{
						"tag": "People with Disabilities"
					},
					{
						"tag": "Workplace Well-Being"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.rand.org/search.html?query=test",
		"items": "multiple"
	}
]
/** END TEST CASES **/
