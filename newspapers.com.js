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
	"lastUpdated": "2019-04-12 03:06:00"
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


// attr()/text() v2
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}


function detectWeb(doc, url) {
	return "newspaperArticle";
}

function doWeb(doc, url) {
	var newItem = new Zotero.Item("newspaperArticle");
	var scripts = doc.getElementsByTagName("script");
	var json = '';
	var testre = new RegExp('^(var staPageDetail).*', 'm');
	var jsonre = /var staPageDetail = JSON.parse\(\"(.+?)\"\)\;/;
	for (var i = 0 ; i < scripts.length ; i++) {
		var arr = scripts[i].textContent.match(jsonre);
		if (arr) {
			// we have to unescape the json string this way, since javascript 
			// unescape doesn't work here
			json = arr[1].replace(/\\\//g,'/').replace(/\\\"/g,'"');
			break;
		}
	}
	details = JSON.parse(json);
	
	var metaArr = {};
	var metaTags = doc.getElementsByTagName("meta");
	for (var j = 0 ; j < metaTags.length ; j++) {
		if (metaTags[j].getAttribute("property")) {
			metaArr[metaTags[j].getAttribute("property")] = metaTags[j].getAttribute("content");
		}
	}
	newItem.title = details.citation.title;
	// remove the unnecessary xid param
	newItem.url = details.citation.url.replace(/\?xid=[0-9]*$/, "");
	
	/*
		The user can append the author to the title with a forward slash
		e.g. "My Day / Eleanor Roosevelt"
	*/
	if (newItem.title.includes('/')) {
		var tokens = newItem.title.split("/");
		var author = tokens[1];
		newItem.title = tokens[0].trim();
		// multiple authors are separated with semicolons
		var authors = author.split("; ");
		for (i=0; i<authors.length; i++) {
			newItem.creators.push(Zotero.Utilities.cleanAuthor(authors[i], "author"));
		}
	}

	newItem.abstractNote = details.media.note;
	
	/*
	<meta property="og:image" content="https://img0.newspapers.com/img/img?id=97710064&width=557&height=4616&crop=1150_215_589_4971&rotation=0&brightness=0&contrast=0&invert=0&ts=1467779959&h=e478152fd53dd7afc4e72a18c1dad4ea">
	*/
	newItem.attachments = [{
		url: metaArr["og:image"],
		title: "Image",
		mimeType: "image/jpeg"
	}];

	newItem.publicationTitle = details.source.publisherName;
	// details["source"]["title"] gives a string like 
	// "Newspapers.com - The Akron Beacon Journal - 1939-10-30 - Page Page 15"
	editiontokens = details.source.title.replace(/ - /g, "|").split("|");
	if (editiontokens.length == 3) { // there's an edition label
		newItem.edition = editiontokens[1];
	}
	newItem.pages = editiontokens.slice(-1)[0].replace(/Page/g, '');
	newItem.date = details.source.publishedDate;
	newItem.place = details.source.publishedLocation;
	
	// handle empty title
	if (newItem.title === "") {
		newItem.title = "Clipped From " + newItem.publicationTitle;
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
				"publicationTitle": "The Akron Beacon Journal",
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
	},
	{
		"type": "web",
		"url": "https://www.newspapers.com/clip/18535448/the_sunday_leader/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Clipped From The Sunday Leader",
				"creators": [],
				"date": "1887-07-17",
				"libraryCatalog": "newspapers.com",
				"pages": "5",
				"place": "Wilkes-Barre, Pennsylvania",
				"publicationTitle": "The Sunday Leader",
				"url": "https://www.newspapers.com/clip/18535448/the_sunday_leader/",
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
