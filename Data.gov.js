{
	"translatorID": "162b43d7-e29d-4cf0-9e05-85e472613430",
	"label": "Data.gov",
	"creator": "Abe Jellinek",
	"target": "^https?://catalog\\.data\\.gov/dataset",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-21 21:34:07"
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
	if (doc.querySelector('article[itemtype="http://schema.org/Dataset"]')) {
		return "document"; // will map to dataset
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h3.dataset-heading a');
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
	// Data.gov gives us RDF, but it uses some schemas that the RDF translator
	// doesn't understand, so for now we'll use the embedded Schema.org
	// metadata.
	
	let item = new Zotero.Item('document');
	item.extra = 'Type: dataset\n'; // will map to dataset
	
	let art = doc.querySelector('article[itemtype="http://schema.org/Dataset"]');
	
	item.title = text(art, '[itemprop="name"]');
	item.abstractNote = text(art, '[itemprop="description"]');
	item.publisher = text(art, '[itemprop="publisher"] [itemprop="name"]');
	item.language = 'en';
	item.url = url;
	
	for (let row of art.querySelectorAll('[rel="dc:relation"]')) {
		let label = text(row, '[property="rdfs:label"]').trim();
		let value = text(row, '[property="rdf:value"]');
		if (label == 'Data Last Modified') {
			item.date = ZU.strToISO(value);
			break;
		}
		else if (label == 'Language') {
			item.language = value;
		}
	}
	
	for (let tag of doc.querySelectorAll('.tag')) {
		item.tags.push(tag.textContent);
	}
	
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://catalog.data.gov/dataset/feed-the-future-senegal-economic-growth-project-2014-2015",
		"items": [
			{
				"itemType": "document",
				"title": "Feed the Future Senegal: Economic Growth Project 2014-2015",
				"creators": [],
				"date": "2019-07-07",
				"abstractNote": "The datasets contained in this data asset were generated through the USAID/PCE (Projet Croissance Economique or Economic Growth Project), a USAID/Senegal agriculture development project from 2009-2015. PCE employed a data collection system for monitoring and evaluation data that relied on engaging farmers and field agents of partner producer networks as active members of a data collection/feedback loop. Producer networks were trained to collect data and to use it to better plan and manage their own activities while also providing data for the project performance indicators. The producer networks used a set of data management tools established and validated through a close participatory process between the USAID/PCE technical team and partner networks across different value chains. Excel spreadsheets and GIS software were used to generate agricultural input (fertilizer, seeds) requirements and crop forecasts, track field activities, map farms, and organize harvests. The databases contain information on the producer members, partner producer organizations of the project, monitoring of agronomic activities of plots, financing, marketing, rainfall data, and results of output quality grading tests. The databases were audited by the PCE project's M&E staff and aggregated for the project's key performance indicators.",
				"extra": "Type: dataset",
				"language": "en",
				"libraryCatalog": "Data.gov",
				"publisher": "USAID",
				"shortTitle": "Feed the Future Senegal",
				"url": "https://catalog.data.gov/dataset/feed-the-future-senegal-economic-growth-project-2014-2015",
				"attachments": [],
				"tags": [
					{
						"tag": "agriculture"
					},
					{
						"tag": "economic-growth"
					},
					{
						"tag": "monitoring"
					},
					{
						"tag": "senegal"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://catalog.data.gov/dataset/annual-statistical-supplement-2014",
		"items": [
			{
				"itemType": "document",
				"title": "Annual Statistical Supplement, 2014",
				"creators": [],
				"date": "2015-06-26",
				"abstractNote": "The Annual Statistical Supplement, 2014 includes the most comprehensive data available on the Social Security and Supplemental Security Income programs. More than 250 statistical tables convey a wide range of information about those programs from beneficiary counts and benefit amounts to the status of the trust funds. The tables also contain data on Medicare, Medicaid, veterans' benefits, and other related income security programs. The Supplement also includes summaries of the history of the major programs and of current legislative developments and a glossary of terms used in explaining the programs and data.",
				"extra": "Type: dataset",
				"language": "en",
				"libraryCatalog": "Data.gov",
				"publisher": "Social Security Administration",
				"url": "https://catalog.data.gov/dataset/annual-statistical-supplement-2014",
				"attachments": [],
				"tags": [
					{
						"tag": "2014"
					},
					{
						"tag": "benefits-calculations"
					},
					{
						"tag": "disability-insurance"
					},
					{
						"tag": "hospital-insurance"
					},
					{
						"tag": "oasdi"
					},
					{
						"tag": "oasdi-benefit-award..."
					},
					{
						"tag": "oasdi-coverage"
					},
					{
						"tag": "oasdi-financing"
					},
					{
						"tag": "oasdi-insured-status"
					},
					{
						"tag": "old-age"
					},
					{
						"tag": "old-age-and-survivo..."
					},
					{
						"tag": "social-security"
					},
					{
						"tag": "social-security-adm..."
					},
					{
						"tag": "ssa"
					},
					{
						"tag": "ssa-annual-statistics"
					},
					{
						"tag": "survivors"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://catalog.data.gov/dataset?q=corn",
		"items": "multiple"
	}
]
/** END TEST CASES **/
