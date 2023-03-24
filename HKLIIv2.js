{
	"translatorID": "3660386b-6bd1-40ae-a4f9-dcfc16db520c",
	"label": "HKLIIv2",
	"creator": "Sin Wah Tsang",
	"target": "^https?://v2\\.hklii\\.hk",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-03-24 18:39:29"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Sin Wah Tsang

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
	if (url.includes('cases')) {
		return 'case';
	} else if (getSearchResults(doc, true)) { 
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('table > tbody > tr > td.pr-3 > a');	
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (!href.includes('cases')) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}	
	return found ? items : false;
}

function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if (type == 'multiple') {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		}
		);
	} else {
		scrape(doc, url);
	}
	return false;
}

function scrape(doc, url){
	var type = detectWeb(doc, url);
	var newItem = new Zotero.Item(type);
	
	if (text(doc, '#app')) {
		
		if (type == 'case') {
			
			// All page titles have '|', except for UKPC cases which do not have it
			// UKPC cases refer to the United Kingdom Privy Council Judgments for Hong Kong
			var pageTitle = text(doc, 'head > title');

			// e.g. NG KA LING AND ANOTHER V. THE DIRECTOR OF IMMIGRATION | HKLII
			if (pageTitle.includes('|')) {
				caseTitle = pageTitle.replace(/\s?\|.*$/, '');
			} else {
				caseTitle = pageTitle ;
			}
			newItem.caseName = caseTitle; 				
			
			var dateDecided = text(doc, '#infotable > div > div:nth-child(1) > div.pl-1 > span');
			if (dateDecided) {
				newItem.dateDecided = dateDecided;
			}
			
			var court = text(doc, 'li:nth-child(5) > a > span');
			if (court) {
				newItem.court = court;
			}

			var actionNo = text(doc, 'div:nth-child(3) > div > span > div > span');
			if (actionNo) {
				newItem.number = actionNo;
			}
			
			// Extract the Neutral Citation
			var neutralCit = text(doc, 'li > div > span');
			if (neutralCit) {
				newItem.extra = `Neutral Cit: ${neutralCit} \n`;
			}
			
			// Extract the first Parallel Citation
			var firstParallelCit = text(doc, 'div:nth-child(7) > div.pl-1 > span > div:nth-child(1) > span');
			if (firstParallelCit) {
				newItem.extra += `Parallel Cit: ${firstParallelCit} \n`;
			}
		} else {
			newItem.title = text(doc, 'head > title');
		}
	} else {
		newItem.title = text(doc, 'head > title');
	}
		
	newItem.url = url;
		
	newItem.attachments.push({
		document: doc,
		title: 'Snapshot',
		mimeType:'text/html'
	});
		
	newItem.complete();	
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://v2.hklii.hk/en/cases/hkcfi/2019/1191",
		"items": [
			{
				"itemType": "case",
				"caseName": "NG TAT KUEN V. TAM CHE FU AND OTHERS",
				"creators": [],
				"dateDecided": "3 May, 2019",
				"court": "Court of First Instance",
				"docketNumber": "HCPI896/2013",
				"extra": "Neutral Cit: [2019] HKCFI 1191 \nParallel Cit: [2019] 4 HKC 533",
				"url": "https://v2.hklii.hk/en/cases/hkcfi/2019/1191",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://v2.hklii.hk/en/cases/hkcfi/2002/202",
		"items": [
			{
				"itemType": "case",
				"caseName": "LI SAU YING V. KINCHENG BANKING CORPORATION AND ANOTHER",
				"creators": [],
				"dateDecided": "30 May, 2002",
				"court": "Court of First Instance",
				"docketNumber": "HCA18515/1999",
				"extra": "Neutral Cit: [2002] HKCFI 202",
				"url": "https://v2.hklii.hk/en/cases/hkcfi/2002/202",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://v2.hklii.hk/en/cases/ukpc/1997/40",
		"items": [
			{
				"itemType": "case",
				"caseName": "Yuen v. The Royal Hong Kong Golf Club",
				"creators": [],
				"dateDecided": "1 Jan, 1997",
				"court": "United Kingdom Privy Council Judgments for Hong Kong",
				"extra": "Neutral Cit: [1997] UKPC 40",
				"url": "https://v2.hklii.hk/en/cases/ukpc/1997/40",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://v2.hklii.hk/en/cases/hkcfa/1999/72",
		"items": [
			{
				"itemType": "case",
				"caseName": "NG KA LING AND ANOTHER V. THE DIRECTOR OF IMMIGRATION",
				"creators": [],
				"dateDecided": "29 Jan, 1999",
				"court": "Court of Final Appeal",
				"docketNumber": "FACV14/1998",
				"extra": "Neutral Cit: [1999] HKCFA 72 \nParallel Cit: (1999) 2 HKCFAR 4",
				"url": "https://v2.hklii.hk/en/cases/hkcfa/1999/72",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://v2.hklii.hk/search?searchType=advanced&title=Ng%20Ka%20Ling",
		"items": "multiple"
	}
]
/** END TEST CASES **/
