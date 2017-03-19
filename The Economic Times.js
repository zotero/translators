{
	"translatorID": "1a9a7ecf-01e9-4d5d-aa19-a7aa4010da83",
	"label": "The Economic Times",
	"creator": "Sonali Gupta",
	"target": "http://economictimes.indiatimes.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2017-03-19 08:42:35"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Sonali Gupta
	
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
	if (url.indexOf("/topic/") != -1) {
		return "multiple";
	}
	else if (ZU.xpathText(doc, '//article')) {
		return "newspaperArticle";
	}
}

function doWeb(doc, url) {

	//srcaping titles of search results
	if (detectWeb(doc, url) == "multiple") {
		var myXPath = '//main/descendant::h3';
		var myXPathObject = ZU.xpathText(doc, '//main/div[1]/div[2]/a/h2',',','*');
		myXPathObject = myXPathObject.concat(ZU.xpathText(doc, myXPath,',','*'));
		var array = myXPathObject.split('*')
		var items = new Object();
		var articles = new Array();
		for (var i in array){
			items[i]=array[i];
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape);
		});
	}	
	else{
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	
	newItem = new Zotero.Item("newspaperArticle");
	newItem.url = url;
	newItem.publicationTitle = "The Economic Times";

	//get headline
	var title = ZU.xpathText(doc, '//article/h1');
	if (!title) title = ZU.xpathText(doc, '//meta[@property="og:title"]/@content');
	newItem.title = title;

	//get abstract
	var abstract = ZU.xpathText(doc, '//meta[@property="og:description"]/@content');
	newItem.abstractNote = abstract;
	
	//get date and day
	var date = ZU.xpathText(doc, '//article/div[4]/div[1]');
	if(!date) date = ZU.xpathText(doc, '//article/div[1]/div[2]');
	date = date.substring(date.indexOf("|") + 1);
	var date_day = date.replace('Updated:','');
	newItem.date = date_day;
	
	//get author or organization
	var authors = ZU.xpath(doc, '//a[@rel="author"]');
	for (var i in authors){
		newItem.creators.push(ZU.cleanAuthor(authors[i].textContent, "author"));
	}
	if(!authors.length){
		authors = ZU.xpathText(doc, '//article/div[4]/div[1]');
		if(authors){
			authors_org=authors.substring(0,authors.lastIndexOf("|")-1);
			var regex = /(.*By\s+)(.*)/;
			authors = authors_org.replace(regex, "$2");
			newItem.creators.push({lastName:authors,  creatorType: "author",fieldMode: 1})
		}
	}
	
	newItem.attachments = ({
		url: url,
		title: "The Economic Times Snapshot",
		mimeType: "text/html"
	});
	newItem.complete();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://economictimes.indiatimes.com/news/politics-and-nation/is-narendra-modis-victory-in-2019-a-done-deal/articleshow/57700772.cms",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Is Narendra Modi's victory in 2019 a done deal?",
				"creators": [
					{
						"firstName": "Chetan",
						"lastName": "Bhagat",
						"creatorType": "author"
					}
				],
				"date": "Mar 18, 2017, 11.30 AM IST",
				"abstractNote": "No matter how much Rahul Gandhi acolytes try to sweeten the news to him by claiming Congress didnt do so badly, the fact is simple: BJP did spectacularly well.",
				"libraryCatalog": "The Economic Times",
				"publicationTitle": "The Economic Times",
				"url": "http://economictimes.indiatimes.com/news/politics-and-nation/is-narendra-modis-victory-in-2019-a-done-deal/articleshow/57700772.cms",
				"attachments": {
					"url": "http://economictimes.indiatimes.com/news/politics-and-nation/is-narendra-modis-victory-in-2019-a-done-deal/articleshow/57700772.cms",
					"title": "The Economic Times Snapshot",
					"mimeType": "text/html"
				},
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://economictimes.indiatimes.com/wealth/plan/how-can-inflation-affect-our-retirement-planning/articleshow/57451629.cms",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Rs 1 lakh in 1984 is worth just Rs 7,451 now: Are you saving enough to beat inflation?",
				"creators": [],
				"date": "Mar 18, 2017, 11.15 AM IST",
				"abstractNote": "People relying on deposit-type savings that yield very low real rates of return need to save a lot more in order to avoid old age hardship.",
				"libraryCatalog": "The Economic Times",
				"publicationTitle": "The Economic Times",
				"shortTitle": "Rs 1 lakh in 1984 is worth just Rs 7,451 now",
				"url": "http://economictimes.indiatimes.com/wealth/plan/how-can-inflation-affect-our-retirement-planning/articleshow/57451629.cms",
				"attachments": {
					"url": "http://economictimes.indiatimes.com/wealth/plan/how-can-inflation-affect-our-retirement-planning/articleshow/57451629.cms",
					"title": "The Economic Times Snapshot",
					"mimeType": "text/html"
				},
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/