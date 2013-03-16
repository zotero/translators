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
	"browserSupport": "gcsbv",
	"lastUpdated": "2013-03-16 12:47:28"
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
		for(var i=0, n=results.length; i<n; i++) {
			hits[results[i].href] = results[i].textContent;
		}
		Z.selectItems(hits, function(items) {
			if (!items) return true;
			for (var j in items) {
				urls.push(j);
			}
			ZU.processDocuments(urls, scrape);
		});
	} else {
		scrape(doc, url)
	}
}

function scrape(doc, url) {
	var abstract = ZU.xpathText(doc, '//div[@id="innerWhite"]/font[1]')
	// We call the Embedded Metadata translator to do the actual work
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function(obj, item) {
		item.itemType = "report";
		item.type = "SSRN Scholarly Paper";
		item.institution = "Social Science Research Network";
		var number = url.match(/abstract_id=(\d+)/);
		if(number) item.reportNumber= "ID " + number[1];
		item.place = "Rochester, NY";
		if (abstract) item.abstractNote = abstract.trim(); 

		item.complete();
	});
	translator.translate();
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
				"abstractNote": "We present a new visual method for assessing the predictive power of models with binary outcomes.  This technique allows the analyst to quickly and easily choose among alternative model specifications based upon the models' ability to consistently match high-probability predictions to actual occurrences of the event of interest, and low-probability predictions to non-occurrences of the event of interest.  Unlike existing methods for assessing predictive power for logit and probit models such as the use of \"percent correctly predicted\" statistics, Brier scores and the ROC plot, our \"separation plot\" has the advantage of producing a visual display that is more informative and easier to explain to a general audience than a ROC plot, while also remaining insensitive to the user's often arbitrary choice of threshold for distinguishing between events and non-events.  We show how to implement this technique in R and demonstrate its effectiveness in building predictive models in four different areas of political research.",
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