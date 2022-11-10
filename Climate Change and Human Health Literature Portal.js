{
	"translatorID": "0722e1d4-3c3b-47b1-b8b2-1ed986030303",
	"label": "Climate Change and Human Health Literature Portal",
	"creator": "Sebastian Karcher",
	"target": "^https?://tools\\.niehs\\.nih\\.gov/cchhl/index\\.cfm",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-11-10 02:47:43"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Sebastian Karcher
	
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
	if (url.includes('/index.cfm/detail/')) {
		return 'journalArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('#ccpp_results-list .ccpp_result-title>a');
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

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (items) {
			await Promise.all(
				Object.keys(items)
					.map(url => requestDocument(url).then(scrape))
			);
		}
	}
	else {
		await scrape(doc);
	}
}

function scrape(doc) {
	var pmid = text(doc, 'li>a[href*="www.ncbi.nlm.nih.gov/pubmed"]');
	var doi = text(doc, 'li>a[href*="doi.org/10."]');
	var abstract = text(doc, '#cchh-detail-abstract');
	Z.debug(pmid);
	Z.debug(doi);
	if (pmid) {
		pmid = pmid.match(/\.gov\/pubmed\/(\d+)/)[1];
		let translate = Z.loadTranslator('search');
		translate.setTranslator('3d0231ce-fd4b-478c-b1d3-840389e5b68c');
		translate.setSearch({ itemType: "journalArticle", PMID: pmid });
 
		await translate.translate();
	}
	else if (doi) {
		let translate = Z.loadTranslator('search');
		translate.setSearch({ DOI: ZU.cleanDOI(doi) });
		translate.setTranslator('b28d0d42-8549-4c6d-83fc-8382874a5cb9'); // DOI Content Negotiation
		translate.setHandler("itemDone", function (obj, item) {
			// ad abstract from page
			if (abstract && !item.abstractNote) {
				item.abstractNote = abstract;
			}
			item.complete();
		});
		await translate.translate();
	}
	else {
		// scrape if we have to; I couldn't find a live example of this
		var item = new Zotero.Item("journalArticle");
		item.title = text(doc, 'h1>span');
		item.date = ZU.xpathText(doc, '//div[@class="cchh-content_label" and contains(text(), "Year:")]/following-sibling::div');
		let authors = ZU.xpathText(doc, '//div[@class="cchh-content_label" and contains(text(), "Author(s):")]/following-sibling::div');
		let publication = ZU.xpathText(doc, '//div[@class="cchh-content_label" and contains(text(), "Journal:")]/following-sibling::div');
		for (let author of authors.split(", ")) {
			author = author.replace(/\s([A-Z]+)$/, ", $1");
			item.creators.push(ZU.cleanAuthor(author, "author", true));
		}
		if (publication) {
			var pubinfo = publication.match(/^(.+?)\.\s*(\d+)\s*(?:\((\d+)\))?:\s*([\d-]+?)$/);
			if (pubinfo) {
				item.publicationTitle = pubinfo[1];
				item.volume = pubinfo[2];
				item.issue = pubinfo[3];
				item.pages = pubinfo[4];
			}
		}
		
		item.complete();
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://tools.niehs.nih.gov/cchhl/index.cfm/detail/20124#searchTerm=testing&selectedFacets=&selectedResults=",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "An analytical heat wave definition based on the impact on buildings and occupants",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Alfonso P.",
						"lastName": "Ramallo-González"
					},
					{
						"creatorType": "author",
						"firstName": "Matt E.",
						"lastName": "Eames"
					},
					{
						"creatorType": "author",
						"firstName": "Sukumar",
						"lastName": "Natarajan"
					},
					{
						"creatorType": "author",
						"firstName": "Daniel",
						"lastName": "Fosas-de-Pando"
					},
					{
						"creatorType": "author",
						"firstName": "David A.",
						"lastName": "Coley"
					}
				],
				"date": "06/2020",
				"DOI": "10.1016/j.enbuild.2020.109923",
				"ISSN": "03787788",
				"abstractNote": "Alongside a mean global rise in temperature, climate change predictions point to an increase in heat waves and an associated rise in heat-related mortality. This suggests a growing need to ensure buildings are resilient to such events. Unfortunately, there is no agreed way of doing this, and no standard set of heatwaves for scientists or engineers to use. In addition, in all cases, heat waves are defined in terms of external conditions, yet, as the Paris heat wave of 2003 showed, people die in the industrialised world from the conditions inside buildings, not those outside. In this work, we reverse engineer external temperature time series from monitored conditions within a representative set of buildings during a heat wave. This generates a general probabilistic analytical relationship between internal and external heatwaves and thereby a standard set of events for testing resilience. These heat waves are by their simplicity ideal for discussions between clients and designers, or for the setting of national building codes. In addition, they provide a new framework for the declaration of a health emergency. (C) 2020 Published by Elsevier B.V.",
				"journalAbbreviation": "Energy and Buildings",
				"language": "en",
				"libraryCatalog": "DOI.org (Crossref)",
				"pages": "109923",
				"publicationTitle": "Energy and Buildings",
				"url": "https://linkinghub.elsevier.com/retrieve/pii/S0378778819330622",
				"volume": "216",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://tools.niehs.nih.gov/cchhl/index.cfm/main/search#/params?searchTerm=heat%20pump&selectedFacets=&selectedResults=",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://tools.niehs.nih.gov/cchhl/index.cfm/detail/10206#searchTerm=heat%20pump&selectedFacets=&selectedResults=",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Heat waves, aging, and human cardiovascular health",
				"creators": [
					{
						"firstName": "W. Larry",
						"lastName": "Kenney",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel H.",
						"lastName": "Craighead",
						"creatorType": "author"
					},
					{
						"firstName": "Lacy M.",
						"lastName": "Alexander",
						"creatorType": "author"
					}
				],
				"date": "2014-10",
				"DOI": "10.1249/MSS.0000000000000325",
				"ISSN": "1530-0315",
				"abstractNote": "This brief review is based on a President's Lecture presented at the Annual Meeting of the American College of Sports Medicine in 2013. The purpose of this review was to assess the effects of climate change and consequent increases in environmental heat stress on the aging cardiovascular system. The earth's average global temperature is slowly but consistently increasing, and along with mean temperature changes come increases in heat wave frequency and severity. Extreme passive thermal stress resulting from prolonged elevations in ambient temperature and prolonged physical activity in hot environments creates a high demand on the left ventricle to pump blood to the skin to dissipate heat. Even healthy aging is accompanied by altered cardiovascular function, which limits the extent to which older individuals can maintain stroke volume, increase cardiac output, and increase skin blood flow when exposed to environmental extremes. In the elderly, the increased cardiovascular demand during heat waves is often fatal because of increased strain on an already compromised left ventricle. Not surprisingly, excess deaths during heat waves 1) occur predominantly in older individuals and 2) are overwhelmingly cardiovascular in origin. Increasing frequency and severity of heat waves coupled with a rapidly growing at-risk population dramatically increase the extent of future untoward health outcomes.",
				"extra": "PMID: 24598696\nPMCID: PMC4155032",
				"issue": "10",
				"journalAbbreviation": "Med Sci Sports Exerc",
				"language": "eng",
				"libraryCatalog": "PubMed",
				"pages": "1891-1899",
				"publicationTitle": "Medicine and Science in Sports and Exercise",
				"volume": "46",
				"attachments": [
					{
						"title": "PubMed entry",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [
					{
						"tag": "Aged"
					},
					{
						"tag": "Aged, 80 and over"
					},
					{
						"tag": "Aging"
					},
					{
						"tag": "Cardiovascular Diseases"
					},
					{
						"tag": "Cardiovascular System"
					},
					{
						"tag": "Cause of Death"
					},
					{
						"tag": "Climate Change"
					},
					{
						"tag": "Heat Stress Disorders"
					},
					{
						"tag": "Humans"
					},
					{
						"tag": "Skin Aging"
					},
					{
						"tag": "Sports Medicine"
					},
					{
						"tag": "Sweating"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
