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
	"lastUpdated": "2020-04-08 23:07:42"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017-2019 Peter Binkley

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

function detectWeb(_doc, _url) {
	return "newspaperArticle";
}


function doWeb(doc, _url) {
	var newItem = new Zotero.Item("newspaperArticle");
	var scripts = doc.getElementsByTagName("script");
	var json = '';
	var jsonre = /var staPageDetail = JSON.parse\((.+?)\);/;
	for (var i = 0; i < scripts.length; i++) {
		var arr = scripts[i].textContent.match(jsonre);
		if (arr) {
			json = arr[1];
			break;
		}
	}
	
	// one JSON.parse to unstringify the json string, and one to parse it into an object
	// the replace fixes escaped apostrophes in the source, which JSON.parse considers invalid
	var details = JSON.parse(JSON.parse(json.replace(/\\'/g, "'")));

	var metaArr = {};
	var metaTags = doc.getElementsByTagName("meta");
	for (let metaTag of metaTags) {
		if (metaTag.getAttribute("property")) {
			metaArr[metaTag.getAttribute("property")] = metaTag.getAttribute("content");
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
		var authorString = tokens[1];
		newItem.title = tokens[0].trim();
		// multiple authors are separated with semicolons
		var authors = authorString.split("; ");
		for (let author of authors) {
			newItem.creators.push(Zotero.Utilities.cleanAuthor(author, "author"));
		}
	}

	newItem.abstractNote = details.media.note;
	
	// downloads pdfs instead of images - not pretty but functional
	// works for ids of length 7 or 8
	var uniqueID = newItem.url.match(/\d+/)
	var pdfurl = "https://www.newspapers.com/clippings/download/?id=" + uniqueID
	newItem.attachments.push({
		title:"Full Text PDF",
		mimeType:"application/pdf",
		url:pdfurl
	});

	newItem.publicationTitle = details.source.publisherName;
	// details["source"]["title"] gives a string like
	// "Newspapers.com - The Akron Beacon Journal - 1939-10-30 - Page Page 15"
	var editiontokens = details.source.title.replace(/ - /g, "|").split("|");
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
Zotero.debug(pdfurl)

}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.newspapers.com/clip/7960447/my-day-eleanor-roosevelt/",
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
				"url": "https://www.newspapers.com/clip/7960447/my-day-eleanor-roosevelt/",
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
		"url": "https://www.newspapers.com/clip/18535448/the-sunday-leader/",
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
				"url": "https://www.newspapers.com/clip/18535448/the-sunday-leader/",
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
		"url": "https://www.newspapers.com/clip/31333699/driven-from-governors-office-ohio/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Driven from Governor's Office, Ohio Relief Seekers Occupy a Church Today; Remain Defiant",
				"creators": [],
				"date": "1937-04-10",
				"libraryCatalog": "newspapers.com",
				"pages": "1",
				"place": "Rushville, Indiana",
				"publicationTitle": "Rushville Republican",
				"url": "https://www.newspapers.com/clip/31333699/driven-from-governors-office-ohio/",
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
	}
]
/** END TEST CASES **/
