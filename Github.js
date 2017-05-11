{
	"translatorID": "a7747ba7-42c6-4a22-9415-1dafae6262a9",
	"label": "GitHub",
	"creator": "Martin Fenner, Philipp Zumstein",
	"target": "^https?://(www\\.)?github\\.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2017-05-11 18:12:25"
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
	if (url.indexOf("/search?") != -1) {
		if (getSearchResults(doc, true)) {
			return "multiple";
		}
	} else if (ZU.xpathText(doc, '/html/head/meta[@property="og:type" and @content="object"]/@content')) {
		return "computerProgram";
	}
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[contains(@class, "repo-list-item")]//h3/a');
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
			var articles = [];
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
	var item = new Z.Item("computerProgram");
	
	//basic metadata from the meta tags in the head
	item.url = ZU.xpathText(doc, '/html/head/meta[@property="og:url"]/@content');
	item.title = ZU.xpathText(doc, '/html/head/meta[@property="og:title"]/@content');
	item.abstractNote = ZU.xpathText(doc, '/html/head/meta[@property="og:description"]/@content');
	item.libraryCatalog = "GitHub";
	item.rights = ZU.xpathText(doc, '//a[*[contains(@class, "octicon-law")]]');
	
	//api calls to /repos and /repos/../../stats/contribuors
	var apiUrl = "https://api.github.com/repos/"+item.title;
	ZU.doGet(apiUrl, function(result) {
		var json = JSON.parse(result);
		//Z.debug(json);
		item.programmingLanguage = json.language;
		
		item.extra = "original-date: " + json.created_at;
		item.date = json.updated_at;
		ZU.doGet(apiUrl+"/stats/contributors", function(contributors) {
			var jsonContributors = JSON.parse(contributors);
			//it seems that the contributors with most contributions are
			//at the end of this list --> loop trough in inverse direction
			for (var i=jsonContributors.length-1; i>-1; i--) {
				var contributor = jsonContributors[i].author;
				item.creators.push({ "lastName": contributor.login, creatorType : 'contributor', fieldMode : 1 });
				//getAuthor(contributor.login);
			}
			item.attachments.push({
				title: "Snapshot",
				document: doc
			});
			
			item.complete();
		});

	});
	

}


// get the full name from the author profile page
function getAuthor(username) {
	var url = "https://github.com/" + encodeURIComponent(username);	
	ZU.processDocuments(url, function(text) {
		var author = ZU.xpathText(text, '//span[contains(@class, "vcard-fullname")]');
		if (!author) { author = ZU.xpathText(text, '//span[contains(@class, "vcard-username")]'); }
		if (!author) { author = ZU.xpathText(text, '/html/head/meta[@property="profile:username"]/@content'); }
		Z.debug(author);
		author = ZU.cleanAuthor(author, "author");
	});
	// temporary, until we get the author string out of the closure
	return ZU.cleanAuthor(username, "author");
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://github.com/zotero/zotero/",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "zotero/zotero",
				"creators": [
					{
						"lastName": "dstillman",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "simonster",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "aurimasv",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "avram",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "davidnortonjr",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "mcburton",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "adomasven",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "fbennett",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "erazlogo",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "bdarcus",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "gracile-fr",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "stakats",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "rmzelle",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "adam3smith",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "mmoole",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "pmhm",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "f-mb",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "fredgibbs",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "zuphilip",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "tnajdek",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "mikowitz",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "petzi53",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "mronkko",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "LinuxMercedes",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "wragge",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "jgrigera",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "rsnape",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "jlegewie",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "retorquere",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "lennart0901",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "Ashley-Wright",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "Emxiam",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "asakusuma",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "glandais",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "Lemonlee8",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "mtd91429",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "COV-Steve",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "egh",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "adunning",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "simpzan",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "2017-05-10T16:27:29Z",
				"abstractNote": "zotero - Zotero is a free, easy-to-use tool to help you collect, organize, cite, and share your research sources.",
				"extra": "original-date: 2011-10-27T07:46:48Z",
				"libraryCatalog": "GitHub",
				"programmingLanguage": "JavaScript",
				"rights": "AGPL-3.0",
				"url": "https://github.com/zotero/zotero",
				"attachments": [
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
		"url": "https://github.com/search?utf8=%E2%9C%93&q=topic%3Ahocr&type=",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://github.com/datacite/schema",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "datacite/schema",
				"creators": [
					{
						"lastName": "mfenner",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "koelnconcert",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "kjgarza",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "nichtich",
						"creatorType": "contributor",
						"fieldMode": 1
					},
					{
						"lastName": "lnielsen",
						"creatorType": "contributor",
						"fieldMode": 1
					}
				],
				"date": "2016-10-27T14:19:05Z",
				"abstractNote": "schema - DataCite Metadata Schema Repository",
				"extra": "original-date: 2011-04-13T07:08:41Z",
				"libraryCatalog": "GitHub",
				"programmingLanguage": "Ruby",
				"url": "https://github.com/datacite/schema",
				"attachments": [
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