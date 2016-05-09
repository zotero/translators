{
	"translatorID": "6044b16f-2452-4ce8-ad02-fab69ef04f13",
	"label": "AEA Web",
	"creator": "Sebatian Karcher",
	"target": "^https?://www\\.aeaweb\\.org/(articles|journals|issues)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsb",
	"lastUpdated": "2016-05-09 20:00:35"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	AEA Web translator Copyright © 2014 Sebastian Karcher 
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


function detectWeb(doc, url) {
	if (url.indexOf('/articles?id=')>-1) {
		return "journalArticle";
	} else if (getSearchResults(doc, true)) {
		return "multiple";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//article//a[contains(@href, "/articles?id=")]|//li[@class="article"]//a[contains(@href, "/articles?id=")]');
	for (var i=0; i<rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
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
			if (!items) {
				return true;
			}
			var articles = new Array();
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	var translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');//Embedded Metadata
	translator.setDocument(doc);
	translator.setHandler("itemDone", function(obj, item) {
		//Correct pages format, e.g. 1467-96 or 625-63
		var m = item.pages.match(/^(\d+)(\d\d)[\--](\d\d)$|^(\d+)(\d)[\--](\d)$|^(\d+)(\d\d\d)[\--](\d\d\d)$/);
		if (m) {
			item.pages = m[1]+m[2]+"-"+m[1]+m[3];
		}
		
		//The abstract is contained in the section-node of class abstract,
		//but this node consists of an (empty) text node, a h2 node
		//and another text node with the actual abstract.
		var abstract = ZU.xpathText(doc, '//section[contains(@class,"abstract")]/text()[last()]');
		item.abstractNote = abstract;
		
		item.complete();
	});
	translator.translate();

}

	/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.aeaweb.org/journals/search-results?within%5Btitle%5D=on&within%5Babstract%5D=on&within%5Bauthor%5D=on&journal=&from=a&q=labor+market",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.aeaweb.org/issues/356",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.aeaweb.org/articles?id=10.1257/jep.28.4.3",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Networks in the Understanding of Economic Behaviors",
				"creators": [
					{
						"firstName": "Matthew O.",
						"lastName": "Jackson",
						"creatorType": "author"
					}
				],
				"date": "2014/11",
				"DOI": "10.1257/jep.28.4.3",
				"ISSN": "0895-3309",
				"abstractNote": "As economists endeavor to build better models of human behavior, they cannot ignore that humans are fundamentally a social species with interaction patterns that shape their behaviors. People's opinions, which products they buy, whether they invest in education, become criminals, and so forth, are all influenced by friends and acquaintances. Ultimately, the full network of relationships—how dense it is, whether some groups are segregated, who sits in central positions—affects how information spreads and how people behave. Increased availability of data coupled with increased computing power allows us to analyze networks in economic settings in ways not previously possible. In this paper, I describe some of the ways in which networks are helping economists to model and understand behavior. I begin with an example that demonstrates the sorts of things that researchers can miss if they do not account for network patterns of interaction. Next I discuss a taxonomy of network properties and how they impact behaviors. Finally, I discuss the problem of developing tractable models of network formation.",
				"issue": "4",
				"libraryCatalog": "www.aeaweb.org",
				"pages": "3-22",
				"publicationTitle": "Journal of Economic Perspectives",
				"url": "https://www.aeaweb.org/articles?id=10.1257/jep.28.4.3",
				"volume": "28",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
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
		"url": "https://www.aeaweb.org/articles?id=10.1257/aer.101.4.1467",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Education and Labor Market Discrimination",
				"creators": [
					{
						"firstName": "Kevin",
						"lastName": "Lang",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Manove",
						"creatorType": "author"
					}
				],
				"date": "2011/06",
				"DOI": "10.1257/aer.101.4.1467",
				"ISSN": "0002-8282",
				"abstractNote": "Using a model of statistical discrimination and educational sorting,\nwe explain why blacks get more education than whites of similar\ncognitive ability, and we explore how the Armed Forces Qualification\nTest (AFQT), wages, and education are related. The model suggests\nthat one should control for both AFQT and education when comparing\nthe earnings of blacks and whites, in which case a substantial\nblack-white wage differential emerges. We reject the hypothesis that\ndifferences in school quality between blacks and whites explain the\nwage and education differentials. Our findings support the view that\nsome of the black-white wage differential reflects the operation of the\nlabor market. (JEL I21, J15, J24, J31, J71)",
				"issue": "4",
				"libraryCatalog": "www.aeaweb.org",
				"pages": "1467-1496",
				"publicationTitle": "American Economic Review",
				"url": "https://www.aeaweb.org/articles?id=10.1257/aer.101.4.1467",
				"volume": "101",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
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