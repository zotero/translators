{
	"translatorID": "22dd8e35-02da-4968-b306-6efe0779a48d",
	"label": "newspapers.com",
	"creator": "Peter Binkley",
	"target": "^https?://www\\.newspapers\\.com/clip/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-03-18 18:59:11"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Peter Binkley

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
	return "newspaperArticle";
}

function doWeb(doc, url) { 
	var newItem = new Zotero.Item("newspaperArticle");
	var metaArr = {};
	var metaTags = doc.getElementsByTagName("meta");
	for (var i = 0 ; i < metaTags.length ; i++) {
		if (metaTags[i].getAttribute("property")) {
			metaArr[metaTags[i].getAttribute("property")] = metaTags[i].getAttribute("content");
		}
	}
	newItem.title = doc.getElementById("spotTitle").innerHTML;
	newItem.url = metaArr["og:url"];
	
	/*
		The user can append the author to the title with a forward slash
		e.g. "My Day / Eleanor Roosevelt"
	*/
	if (newItem.title.indexOf('/') >= 0) {
		var tokens = newItem.title.split("/");
		var author = tokens[1];
		newItem.title = tokens[0].trim();
		// multiple authors are separated with semicolons
		var authors = author.split("; ");
		for (i=0; i<authors.length; i++) {
			newItem.creators.push(Zotero.Utilities.cleanAuthor(authors[i], "author"));
		}
	}

	/*
	<span id="spotBody" class="disc-body">This is the abstract</span>
	*/
	newItem.abstractNote = doc.getElementById("spotBody").innerHTML;
	
	/*
	<meta property="og:image" content="https://img0.newspapers.com/img/img?id=97710064&width=557&height=4616&crop=1150_215_589_4971&rotation=0&brightness=0&contrast=0&invert=0&ts=1467779959&h=e478152fd53dd7afc4e72a18c1dad4ea">
	*/
	newItem.attachments = [{
		url: metaArr["og:image"],
		title: "Image",
		mimeType: "image/jpeg"
	}];
	
	/*
	The #printlocation span contains three or four links, from whose anchor texts
	we extract metadata:
		1. Newspaper title, plus location in brackets e.g. "The Evening News (Harrisburg, Pennsylvania)"
		2. Date e.g. "28 Jun 1929, Fri"
		3. (optional) Edition e.g. "Main Edition"
		4. Page e.g. "Page 13"
	*/
	
	var citation = ZU.xpath(doc, "//h3[@class='source-info']//a");
	newItem.publication = citation[0].innerText;
	newItem.place = ZU.xpath(doc, "//span[@itemprop='location']")[0].innerText;

	var date = citation[1].innerHTML;
	newItem.date = ZU.strToISO(date);

	var p = citation[citation.length-1].innerText;
	newItem.pages = p.substring(p.indexOf(" "));

	if (citation.length > 3) {
		newItem.edition = citation[2].innerText;
	}
	
	newItem.complete();
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.newspapers.com/clip/7960447/my_day_eleanor_roosevelt/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "My Day",
				"creators": [
					{
						"firstName": "Eleanor",
						"lastName": "Roosevelt",
						"creatorType": "author"
					}
				],
				"date": "1939-10-30",
				"libraryCatalog": "newspapers.com",
				"pages": "15",
				"place": "Akron, Ohio",
				"url": "https://www.newspapers.com/clip/7960447/my_day_eleanor_roosevelt/",
				"attachments": [
					{
						"title": "Image",
						"mimeType": "image/jpeg"
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
