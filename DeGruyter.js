{
	"translatorID": "2a5dc3ed-ee5e-4bfb-baad-36ae007e40ce",
	"label": "DeGruyter",
	"creator": "Sebastian Karcher",
	"target": "^https?://www\\.degruyter\\.com",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2012-11-27 20:46:32"
}

/*
   DeGruyter (Replacing BE Press - based on BioMed Central Translator)
   Copyright (C) 2012 Sebastian Karcher and Avram Lyon, ajlyon@gmail.com

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
	if(ZU.xpath(doc, '//meta[@name="citation_journal_title"]').length) {
		return "journalArticle";
	}
			
	if((url.indexOf("searchwithinbase?") != -1
			|| url.indexOf("/issue-files/") != -1)
		&& getSearchResults(doc).length) {
		return "multiple";
	}

	return false;
}

function getSearchResults(doc) {
	return ZU.xpath(doc,'//h2[@class="itemTitle"]/a|//div[@class="contentItem"]/h3/a');
}

function doWeb(doc,url) {
	if (detectWeb(doc, url) == "multiple") {
		var hits = {};
		var urls = [];
		var results = getSearchResults(doc);
		for (var i in results) {
			hits[results[i].href] = results[i].textContent;
		}
		Z.selectItems(hits, function(items) {
			if (items == null) return true;
			for (var j in items) {
				urls.push(j);
			}
			ZU.processDocuments(urls, function (myDoc) { 
				doWeb(myDoc, myDoc.location.href) }, function () {Z.done()});

			Z.wait();
		});
	} else {
		// We call the Embedded Metadata translator to do the actual work
		var altdate = ZU.xpathText( doc, '//meta[@name="citation_online_date"]/@content')
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
		translator.setHandler("itemDone", function(obj, item) {
				item.abstractNote = ZU.xpathText(doc, '//div[@class="articleBody_abstract"]');
				if (!item.date) item.date=altdate;
				item.complete();
				});
		translator.getTranslatorObject(function (obj) {
				obj.doWeb(doc, url);
				});
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.degruyter.com/view/j/for.2011.9.issue-4/issue-files/for.2011.9.issue-4.xml",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.degruyter.com/view/j/for.2011.8.4_20120105083457/for.2011.8.4/for.2011.8.4.1405/for.2011.8.4.1405.xml?format=INT",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "James E.",
						"lastName": "Campbell",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
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
				"title": "The Midterm Landslide of 2010: A Triple Wave Election",
				"publicationTitle": "The Forum",
				"volume": "8",
				"issue": "4",
				"url": "http://www.degruyter.com/view/j/for.2011.8.4_20120105083457/for.2011.8.4/for.2011.8.4.1405/for.2011.8.4.1405.xml?format=INT",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.degruyter.com",
				"abstractNote": "Democrats were trounced in the 2010 midterm elections. They lost six seats in the U.S. Senate, six governorships, and about 700 seats in state legislatures. Compared to 2008, Democrats lost 64 seats in the House and Republicans regained their House majority. The Republican majority elected in 2010 was the largest number of Republicans elected since 1946. The analysis finds that Republican seat gains resulted from the receding of the pro-Democratic waves of 2006 and 2008 as well as the incoming  pro-Republican wave of 2010. Voters rejected Democrats in 2010 for their failure to revive the economy, but also for their advancement of the national healthcare reform and other liberal policies. The analysis speculates that Democrats are likely to gain House seats and lose Senate seats in 2012. Finally, President Obama’s prospects of re-election have probably been improved because of the Republican gains in the 2010 midterm.",
				"date": "2011/01/10",
				"shortTitle": "The Midterm Landslide of 2010"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.degruyter.com/view/j/ev.2010.7.4/ev.2010.7.4.1796/ev.2010.7.4.1796.xml?format=INT",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Yoram",
						"lastName": "Bauman",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
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
				"title": "Comment on Nordhaus: Carbon Tax Calculations",
				"publicationTitle": "The Economists' Voice",
				"volume": "7",
				"issue": "4",
				"url": "http://www.degruyter.com/view/j/ev.2010.7.4/ev.2010.7.4.1796/ev.2010.7.4.1796.xml?format=INT",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "www.degruyter.com",
				"abstractNote": "William Nordhaus confuses the impact of a tax on carbon and a tax on carbon dioxide, according to Yoram Bauman.",
				"date": "2010/10/08",
				"shortTitle": "Comment on Nordhaus"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.degruyter.com/searchwithinbase?source=%2Fj%2Fev.2010.7.4%2Fev.2010.7.4.1796%2Fev.2010.7.4.1796.xml&entryType=journal&q=senate&seriesSource=%2Fj%2Fev&issueSource=%2Fj%2Fev.2010.7.4%2Fissue-files%2Fev.2010.7.issue-4.xml&bookSource=&searchScope=bookseries",
		"items": "multiple"
	}
]
/** END TEST CASES **/