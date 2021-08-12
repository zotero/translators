{
	"translatorID": "19409763-fb3c-403f-af1c-c06ff9a9ea0e",
	"label": "Dimensions",
	"creator": "Abe Jellinek",
	"target": "^https?://app\\.dimensions\\.ai/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-12 22:22:43"
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
	if (url.includes('/details/publication/')) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h3 > a[href*="/details/publication/"]');
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
	let id = url.match(/\/publication\/([^/?#]+)/)[1];
	let bibURL = `/details/sources/publication/export/${id}/citation/bibtex`;

	let readcube = getReadcubeConfig(doc);
	let PMID = readcube && readcube.pmid;
	let PMCID = readcube && readcube.pmc_id;
	let arXiv = readcube && readcube.arxiv_id;
	let oaURL = readcube && readcube.linkout;

	ZU.doGet(bibURL, function (bibText) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4"); // BibTeX
		translator.setString(bibText);
		translator.setHandler("itemDone", function (obj, item) {
			delete item.itemID;
			
			if (PMID && !(item.extra && item.extra.includes('PMID:'))) {
				item.extra = (item.extra || '') + `\nPMID: ${PMID}`;
			}
			
			if (PMCID && !(item.extra && item.extra.includes('PMCID:'))) {
				item.extra = (item.extra || '') + `\nPMCID: ${PMCID}`;
			}
			
			if (arXiv && !(item.extra && item.extra.includes('arXiv:'))) {
				item.extra = (item.extra || '') + `\narXiv: ${arXiv}`;
			}
			
			if (oaURL) {
				item.attachments.push({
					title: 'Full Text PDF',
					mimeType: 'application/pdf',
					url: oaURL
				});
			}
			
			if (item.url.includes('app.dimensions.ai/')) {
				delete item.url;
			}
			
			item.complete();
		});
		translator.translate();
	});
}

function getReadcubeConfig(doc) {
	for (let script of doc.body.querySelectorAll('script:not([src])')) {
		let match = script.textContent
			.match(/config\.details_actions\.readcube\s*=\s*({.*})/);
		if (match) {
			return JSON.parse(match[1]);
		}
	}
	return null;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://app.dimensions.ai/details/publication/pub.1134256083",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Inhibitory Control Across Athletic Expertise and Its Relationship With Sport Performance.",
				"creators": [
					{
						"firstName": "Jack",
						"lastName": "Hagyard",
						"creatorType": "author"
					},
					{
						"firstName": "Jack",
						"lastName": "Brimmell",
						"creatorType": "author"
					},
					{
						"firstName": "Elizabeth J",
						"lastName": "Edwards",
						"creatorType": "author"
					},
					{
						"firstName": "Robert S",
						"lastName": "Vaughan",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"DOI": "10.1123/jsep.2020-0043",
				"extra": "PMID: 33383568",
				"issue": "1",
				"libraryCatalog": "Dimensions",
				"pages": "1-14",
				"publicationTitle": "Journal of Sport and Exercise Psychology",
				"volume": "43",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://app.dimensions.ai/details/publication/pub.1140184409",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "PRISM: A Shelter-Based Partnership for People Experiencing Homelessness and Severe Mental Illness.",
				"creators": [
					{
						"firstName": "Vincent",
						"lastName": "Laliberté",
						"creatorType": "author"
					},
					{
						"firstName": "Delphine",
						"lastName": "Roussel-Bergeron",
						"creatorType": "author"
					},
					{
						"firstName": "Eric A",
						"lastName": "Latimer",
						"creatorType": "author"
					},
					{
						"firstName": "Olivier",
						"lastName": "Farmer",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"DOI": "10.1176/appi.ps.202000682",
				"extra": "PMID: 34346731",
				"libraryCatalog": "Dimensions",
				"pages": "appips202000682",
				"publicationTitle": "Psychiatric Services",
				"shortTitle": "PRISM",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://app.dimensions.ai/discover/publication?search_mode=content&search_text=galilee%20farmers%20hygiene&search_type=kws&search_field=full_search",
		"items": "multiple"
	}
]
/** END TEST CASES **/
