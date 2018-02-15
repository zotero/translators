{
	"translatorID": "62151d94-6fdf-442f-be29-94bbd24fcd09",
	"label": "Oxford-EEBO-TCP",
	"creator": "pierwill",
	"target": "[^]*[ota|tei.it|purl].ox.ac.uk/[tcp|id]/*",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-02-15 05:20:51"
}

/*
	***** BEGIN LICENSE BLOCK *****

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
    return "book";
}

function doWeb(doc, url) {
    
    newItem = new Zotero.Item("book");
    
    if (url.includes("http://tei.it.ox.ac.uk/tcp/Texts-HTML/free/") == true) {
	html(doc, url);
    } else {
	catalogue(doc, url);
    }
}


function catalogue(doc,url) {

    // TCP id (e.g., A20631)
    var tcpID = url.split("/").slice(-1)[0].split(".html")[0];
    
    // use durable link for item url
    newItem.url = "http://ota.ox.ac.uk/id/" + tcpID;

    // title
    var title = ZU.xpathText(doc, '//title');
    newItem.title = title;

    // date
    var pubdate = ZU.xpathText(doc, '//table[@class="header"]//tr[3]//td[@class="data"]');
    newItem.date = pubdate;
    
    // author
    var authors = ZU.xpathText(doc, '//table[@class="header"]//tr[2]//td[@class="data"]')
    newItem.creators.push(Zotero.Utilities.cleanAuthor(authors, "author", true));
    
    // url for html attachment
    var htmlurl = "http://tei.it.ox.ac.uk/tcp/Texts-HTML/free/" + tcpID.slice(0,3) + "/" + tcpID + ".html";
    // html attachment
    newItem.attachments.push({
	url: htmlurl,
	title: authors.split(",")[0] + "-" + title.slice(0,20) + "-" + tcpID,
	mimeType: "text/html",
	downloadable: true
    });

    // get "identifiers"
    var IDs = ZU.xpathText(doc, '//table[@class="header"]//tr[9]//td[@class="data"]//p');
    // add note with "identifiers"
    newItem.notes.push(IDs);

    // complete
    newItem.complete();
}

function html(doc, url) {

    // TCP id (e.g., A20631)
    var tcpID = url.split("/").slice(-1)[0].split(".html")[0];

    // use catalogue entry for item url
    newItem.url = "http://ota.ox.ac.uk/id/" + tcpID;
    
    // use catalogue entry for metadata
    var newURL = "http://ota.ox.ac.uk/id/" + tcpID;
    ZU.processDocuments(newURL, function(newDoc) {

	// title
	var title = ZU.xpathText(newDoc, '//title');
	newItem.title = title;

	// date
	var pubdate = ZU.xpathText(newDoc, '//table[@class="header"]//tr[3]//td[@class="data"]');
	newItem.date = pubdate;

	//author
	var authors = ZU.xpathText(newDoc, '//table[@class="header"]//tr[2]//td[@class="data"]');
	newItem.creators.push(Zotero.Utilities.cleanAuthor(authors, "author", true));

	// html attachment
	newItem.attachments.push({
	    url: url,
	    title: authors.split(",")[0] + "-" + title.slice(0,20) + "-" + tcpID,
	    mimeType: "text/html",
	    downloadable: true
	});

	// get "identifiers"
	var IDs = ZU.xpathText(newDoc, '//table[@class="header"]//tr[9]//td[@class="data"]//p');
	// add note with "identifiers"
	newItem.notes.push(IDs);

	// complete
	newItem.complete();
    })
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://ota.ox.ac.uk/id/A20631",
		"items": [
			{
				"itemType": "book",
				"title": "Devotions vpon emergent occasions and seuerall steps in my sicknes digested into I. Meditations vpon our humane condition, 2. Expostulations, and debatements with God, 3. Prayers, vpon the seuerall occasions, to Him / by Iohn Donne ...",
				"creators": [
					{
						"firstName": "John",
						"lastName": "Donne",
						"creatorType": "author"
					}
				],
				"date": "1624",
				"libraryCatalog": "Oxford-EEBO-TCP",
				"url": "http://ota.ox.ac.uk/id/A20631",
				"attachments": [
					{
						"title": "Donne-Devotions vpon emerg-A20631",
						"mimeType": "text/html",
						"downloadable": true
					}
				],
				"tags": [],
				"notes": [
					"OTA A20631; PURL http://purl.ox.ac.uk/ota/A20631; DLPS A20631; STC STC 7033A; STC ESTC S1699; EEBO-CITATION 21498206; OCLC ocm 21498206; VID 24644"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://ota.ox.ac.uk/tcp/headers/A20/A20631.html",
		"items": [
			{
				"itemType": "book",
				"title": "Devotions vpon emergent occasions and seuerall steps in my sicknes digested into I. Meditations vpon our humane condition, 2. Expostulations, and debatements with God, 3. Prayers, vpon the seuerall occasions, to Him / by Iohn Donne ...",
				"creators": [
					{
						"firstName": "John",
						"lastName": "Donne",
						"creatorType": "author"
					}
				],
				"date": "1624",
				"libraryCatalog": "Oxford-EEBO-TCP",
				"url": "http://ota.ox.ac.uk/id/A20631",
				"attachments": [
					{
						"title": "Donne-Devotions vpon emerg-A20631",
						"mimeType": "text/html",
						"downloadable": true
					}
				],
				"tags": [],
				"notes": [
					"OTA A20631; PURL http://purl.ox.ac.uk/ota/A20631; DLPS A20631; STC STC 7033A; STC ESTC S1699; EEBO-CITATION 21498206; OCLC ocm 21498206; VID 24644"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://tei.it.ox.ac.uk/tcp/Texts-HTML/free/A20/A20631.html",
		"items": [
			{
				"itemType": "book",
				"title": "Devotions vpon emergent occasions and seuerall steps in my sicknes digested into I. Meditations vpon our humane condition, 2. Expostulations, and debatements with God, 3. Prayers, vpon the seuerall occasions, to Him / by Iohn Donne ...",
				"creators": [
					{
						"firstName": "John",
						"lastName": "Donne",
						"creatorType": "author"
					}
				],
				"date": "1624",
				"libraryCatalog": "Oxford-EEBO-TCP",
				"url": "http://ota.ox.ac.uk/id/A20631",
				"attachments": [
					{
						"title": "Donne-Devotions vpon emerg-A20631",
						"mimeType": "text/html",
						"downloadable": true
					}
				],
				"tags": [],
				"notes": [
					"OTA A20631; PURL http://purl.ox.ac.uk/ota/A20631; DLPS A20631; STC STC 7033A; STC ESTC S1699; EEBO-CITATION 21498206; OCLC ocm 21498206; VID 24644"
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
