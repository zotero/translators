{
	"translatorID": "b61c224b-34b6-4bfd-8a76-a476e7092d43",
	"label": "SSRN",
	"creator": "Sebastian Karcher",
	"target": "^https?://papers\\.ssrn\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gbv",
	"lastUpdated": "2013-01-14 17:13:01"
}

/*
	SSRN Translator
   Copyright (C) 2013 Sebastian Karcher

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
*/

function detectWeb(doc,url) {
	var xpath='//meta[@name="citation_title"]';		
	if (ZU.xpath(doc, xpath).length > 0) {
		return "report";
	}
	if (url.search(/AbsByAuth\.cfm\?|results\.cfm\?/i)!=-1) {
		return "multiple";
	}

	return false;
}


function doWeb(doc,url)
{
	if (detectWeb(doc, url) == "multiple") {
		var hits = {};
		var urls = [];
		//this one is for searches and publication series:
		var results = ZU.xpath(doc, "//tr/td//strong/a[(@class='textlink' or @class='textLink') and contains(@href, 'papers.cfm?abstract_id')]");
		//otherwise, this is an author page
		if(results.length<1){
			results = ZU.xpath(doc,"//tr[contains(@id, 'row_') or contains(@id, '_version')]//a[@class='textlink' and contains(@href, 'ssrn.com/abstract=')]");
		}
		for (var i in results) {
			hits[results[i].href] = results[i].textContent;
		}
		Z.selectItems(hits, function(items) {
			if (items == null) return true;
			for (var j in items) {
				urls.push(j);
			}
			ZU.processDocuments(urls, function (myDoc) { 
				doWeb(myDoc, myDoc.location.href) });
		});
	} else {
		// We call the Embedded Metadata translator to do the actual work
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
		translator.setHandler("itemDone", function(obj, item) {
				item.itemType = "report";
				item.type = "SSRN Scholarly Paper";
				item.institution = "Social Science Research Network";
				var number = url.match(/abstract_id=(\d+)/)[1];
				if (number) item.reportNumber= "ID " + number;				
				item.place = "Rochester, NY";
				//we could scrape the number from the URL - do we want it though?
				item.complete();
				});
				translator.getTranslatorObject(function (obj) {
					obj.doWeb(doc, url);
				});
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://papers.ssrn.com/sol3/papers.cfm?abstract_id=1450589",
		"items": [
			{
				"itemType": "report",
				"creators": [
					{
						"firstName": "Brian",
						"lastName": "Greenhill",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Ward",
						"creatorType": "author"
					},
					{
						"firstName": "Audrey",
						"lastName": "Sacks",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Visual Evidence",
					"Logistic Regression",
					"Fit"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"title": "The 'Separation Plot': A New Visual Method for Evaluating the Predictive Power of Logit/Probit Models",
				"date": "August 13, 2009",
				"abstractNote": "We present a new visual method for assessing the predictive power of models with binary outcomes. This technique allows the analyst to quickly and easily choos",
				"url": "http://papers.ssrn.com/abstract=1450589",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "papers.ssrn.com",
				"type": "SSRN Scholarly Paper",
				"institution": "Social Science Research Network",
				"reportNumber": "ID 1450589",
				"place": "Rochester, NY",
				"shortTitle": "The 'Separation Plot'"
			}
		]
	},
	{
		"type": "web",
		"url": "http://papers.ssrn.com/sol3/results.cfm?txtKey_Words=europe",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://papers.ssrn.com/sol3/JELJOUR_Results.cfm?form_name=journalBrowse&journal_id=1747960",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://papers.ssrn.com/sol3/cf_dev/AbsByAuth.cfm?per_id=16042",
		"items": "multiple"
	}
]
/** END TEST CASES **/