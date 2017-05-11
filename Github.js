{
	"translatorID": "5e385e77-2f51-41b4-a29b-908e23d5d3e8",
	"label": "Github",
	"creator": "Martin Fenner",
	"target": "^https?://(www\\.)?github\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2015-04-28 17:02:52"
}

/**
	Copyright (c) 2015 Martin Fenner

	This program is free software: you can redistribute it and/or
	modify it under the terms of the GNU Affero General Public License
	as published by the Free Software Foundation, either version 3 of
	the License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
	Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public
	License along with this program. If not, see
	<http://www.gnu.org/licenses/>.
*/

function detectWeb(doc, url) {
	if(url.indexOf("/search?") != -1 && getResults(doc).length) {
		return "multiple";
	} else if(getResult(doc)) {
		return "journalArticle";
	}
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		getSelectedItems(doc);
	} else {
		scrape(doc, url);
	}
}

function getSearchResults(doc) {
	var results = doc.getElementsByClassName('repo-list-item');
	var items = {};
	for (var i = 0; i < results.length; i++) {
		var title = results[i].getElementsByTagName("a")[2];
		if (title) { 
			items[title.href] = ZU.trimInternal(title.textContent);
		}
	}
	return items;
}

function getSelectedItems(doc) {
	var items = getSearchResults(doc);

	Z.selectItems(items, function(selectedItems) {
		if(!selectedItems) return true;
		
		var urls = [];
		for(var i in selectedItems) {
			urls.push(i);
		}
		ZU.processDocuments(urls, scrape);
	});
}

function scrape(doc, url) {	
	var item = new Z.Item("journalArticle");
	item.url = ZU.xpathText(doc, '/html/head/meta[@property="og:url"]/@content');
	item.title = ZU.xpathText(doc, '/html/head/meta[@property="og:description"]/@content');
	
	// use archive and archive location
	item.archive = "Github";
	item.archiveLocation = item.url;
	
	var username = ZU.xpathText(doc, '/html/head/meta[@name="octolytics-dimension-user_login"]/@content');
	item.creators.push(getAuthor(username));
	
	// indicate that this is in fact a software repository
	item.extra = "{:itemType: computer_program}";
	
	item.language = "en-US";
	item.attachments.push({
		mimeType: "text/plain",
		document: doc,
		snapshot: false
	});
	
	item.complete();
	return item;
}

function getResult(doc) {
	return ZU.xpathText(doc, '/html/head/meta[@property="og:description"]/@content');
}

function getResults(doc) {
	return doc.getElementsByClassName('repo-list-item');
}

// get the full name from the author profile page
function getAuthor(username) {
    var url = "https://github.com/" + encodeURIComponent(username);	
	ZU.processDocuments(url, function(text) {
		var author = ZU.xpathText(text, '//span[@class="vcard-fullname"]');
		if (!author) { author = ZU.xpathText(text, '//span[@class="vcard-username"]'); }
	    if (!author) { author = ZU.xpathText(text, '/html/head/meta[@property="profile:username"]/@content'); }
	    author = ZU.cleanAuthor(author, "author");
	});
	// temporary, until we get the author string out of the closure
	return ZU.cleanAuthor(username, "author");
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://github.com/najoshi/sickle",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "sickle - Windowed Adaptive Trimming for fastq files using quality",
				"creators": [
					undefined
				],
				"archive": "Github",
				"archiveLocation": "https://github.com/najoshi/sickle",
				"extra": "{:itemType: computer_program}",
				"language": "en-US",
				"libraryCatalog": "Github",
				"url": "https://github.com/najoshi/sickle",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://github.com/search?utf8=%E2%9C%93&q=zotero",
		"items": "multiple"
	}
]
/** END TEST CASES **/