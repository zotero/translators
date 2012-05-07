{
	"translatorID": "4ea89035-3dc4-4ae3-b22d-726bc0d83a64",
	"label": "Galegroup",
	"creator": "Sebastian Karcher",
	"target": "https?://(find|go)\\.galegroup\\.com",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-05-07 13:01:00"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Galegroup Translator - Copyright © 2012 Sebastian Karcher 
	This file is part of Zotero.
	
	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
	
	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	if (url.match(/\/retrieve\.do|\/i\.do|\/infomark\.do/)) {
		if (url.match(/\/ecco\//)) return "book";
		else return "journalArticle";

	} else if (url.match(/\/basicSearch\.do|\/subjectguide\.do|\/limitExpandSearchResults\.do/)) {
		return "multiple";
	}
}

function composeURL(url) {
	//Z.debug("url: " + url)
	//"host" here includes the database abbreviation
	var host = url.match(/^https?:\/\/.+?\/.+?\//)[0];
	var prodID = url.match(/prodId=.+?&/)[0];
	if (url.match(/userGroupName=.+?&/)) var usergroup = url.match(/userGroupName=.+?&/)[0];
	else if (!url.match(/userGroupName=.+?&/)) var usergroup = "";
	var tabID = url.match(/tabID=.+?&/)[0];
	var docID = url.match(/docId=.+?(&|$)/)[0];
	var contentSet = url.match(/contentSet=.+?(&|$)/)[0];
	if (!contentSet.match(/&/)) contentSet = contentSet + "&";
	var RISurl = host + "generateCitation.do?actionString=FormatCitation&inPS=true&" + prodID + tabID + usergroup + docID + contentSet + "citationFormat=REFMGR";
	//Z.debug(RISurl)
	return RISurl;
}


function parseRIS(url) {
	//we get the host so that proxies will work later
	if (typeof url == "string") {
		var host = url.match(/^https?:\/\/.+?\//)[0];
	} else if (typeof url == "object") {
		var host = url[0].match(/^https?:\/\/.+?\//)[0];
	}

	Zotero.Utilities.HTTP.doGet(url, function (text) {
		//gale puts issue numbers in M1
		text = text.replace(/M1\s*\-/, "IS  -");
		//get the LA tag content until we introduce this in the RIS translator
		if (text.match(/LA\s*\-/)) {
			var language = text.match(/(?:LA\s*\-)(.+)/)[1];
		}
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			//make sure the attachment URL gets proxied
			for (i in item.attachments) {
				item.attachments[i].url = item.attachments[i].url.replace(/^https?:\/\/.+?\//, host);
			}
			item.language = language;
			item.complete();
		});
		translator.translate();
	});
}

function doWeb(doc, url) {
	var articles = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var titles = doc.evaluate('//span[@class="title"]/a|//div[contains(@class, "Title")]/a', doc, null, XPathResult.ANY_TYPE, null);
		var next_title;
		while (next_title = titles.iterateNext()) {
			items[next_title.href] = next_title.textContent;
		}

		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				i = composeURL(i);
				articles.push(i);
			}
			parseRIS(articles, function () {
				Zotero.done();
			});
		});

	} else {
		//get a full URL for permalinks
		if (url.match(/\/i\.do/)) {
			var host = url.match(/^https?:\/\/.+?\/.+?\//)[0];
			url = host + ZU.xpathText(doc, '//li/a[contains(@title, "Download")]/@href');
		}
		var RISurl = composeURL(url);
		parseRIS(RISurl);
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://go.galegroup.com/ps/i.do?action=interpret&id=GALE%7CH1420025063&v=2.1&it=r&p=LitRG&sw=w&authCount=1",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Lewald",
						"firstName": "H. Ernest",
						"creatorType": "author"
					},
					{
						"lastName": "Borges",
						"firstName": "Jorge Luis",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>COPYRIGHT 1999 Gale Research, COPYRIGHT 2007 Gale, Cengage Learning</p>"
					}
				],
				"tags": [
					"Fervor de Buenos Aires (Poetry collection)",
					"Dulcia Linquimus Arva (Poem)",
					"El Amenazado (Poem)",
					"El Centinela (Poem)",
					"Lo perdido (Poem)",
					"El Triste (Poem)",
					"H. O. (Poem)",
					"Borges, Jorge Luis"
				],
				"seeAlso": [],
				"attachments": [
					{
						"mimeType": "text/html",
						"title": "Full Text (HTML)",
						"downloadable": true
					}
				],
				"publicationTitle": "Chasqui",
				"url": "http://go.galegroup.com/ps/i.do?id=GALE%7CH1420025063&v=2.1&it=r&p=LitRG&sw=w",
				"issue": "1",
				"extra": "19",
				"DOI": "Critical essay",
				"date": "1974",
				"pages": "19-33",
				"title": "Borges: His Recent Poetry",
				"volume": "4",
				"accessDate": "May 7, 2012",
				"language": "English",
				"libraryCatalog": "Galegroup",
				"shortTitle": "Borges"
			}
		]
	},
	{
		"type": "web",
		"url": "http://go.galegroup.com/ps/i.do?action=interpret&id=GALE%7CA221274499&v=2.1&it=r&p=AONE&sw=w&authCount=1",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Aaronson",
						"firstName": "Daniel",
						"creatorType": "author"
					},
					{
						"lastName": "Meckel",
						"firstName": "Katherine",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Baby boom generation",
					"Labor market",
					"Labour market"
				],
				"seeAlso": [],
				"attachments": [
					{
						"mimeType": "text/html",
						"title": "Full Text (HTML)",
						"downloadable": true
					}
				],
				"publicationTitle": "Economic Perspectives",
				"url": "http://go.galegroup.com/ps/i.do?id=GALE%7CA221274499&v=2.1&it=r&p=AONE&sw=w",
				"issue": "4",
				"extra": "2",
				"DOI": "Article",
				"date": "2009",
				"ISBN": "1048115X",
				"ISSN": "1048115X",
				"pages": "2+",
				"title": "How will baby boomer retirements affect teacher labor markets?",
				"volume": "33",
				"accessDate": "May 7, 2012",
				"language": "English",
				"libraryCatalog": "Galegroup"
			}
		]
	},
	{
		"type": "web",
		"url": "http://go.galegroup.com/ps/i.do?action=interpret&id=GALE%7CA286390464&v=2.1&it=r&p=EAIM&sw=w&authCount=1",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Aizen",
						"firstName": "Marcelo A.",
						"creatorType": "author"
					},
					{
						"lastName": "Sabatino",
						"firstName": "Matena",
						"creatorType": "author"
					},
					{
						"lastName": "Tylianakis",
						"firstName": "Jason M.",
						"creatorType": "author"
					}
				],
				"notes": [
					{
						"note": "<p>American Association for the Advancement of Science. Due to publisher request, Science cannot be reproduced until 360 days after the original publication date.</p>"
					}
				],
				"tags": [
					"Ecological restoration",
					"Extinction (Biology)"
				],
				"seeAlso": [],
				"attachments": [
					{
						"mimeType": "text/html",
						"title": "Full Text (HTML)",
						"downloadable": true
					}
				],
				"publicationTitle": "Science",
				"url": "http://go.galegroup.com/ps/i.do?id=GALE%7CA286390464&v=2.1&it=r&p=EAIM&sw=w",
				"issue": "6075",
				"extra": "1486",
				"DOI": "Report",
				"date": "2012",
				"ISBN": "00368075",
				"ISSN": "00368075",
				"pages": "1486+",
				"title": "Specialization and rarity predict nonrandom loss of interactions from mutualist networks",
				"volume": "335",
				"accessDate": "May 7, 2012",
				"language": "English",
				"libraryCatalog": "Galegroup"
			}
		]
	},
	{
		"type": "web",
		"url": "http://find.galegroup.com/ecco/infomark.do?&source=gale&prodId=ECCO&tabID=T001&docId=CW3325179878&type=multipage&contentSet=ECCOArticles&version=1.0&docLevel=FASCIMILE",
		"items": [
			{
				"itemType": "book",
				"creators": [],
				"notes": [
					{
						"note": "<p>Copyright 2009 Gale, Cengage Learning</p>"
					}
				],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{}
				],
				"title": "A digest of the law of actions and trials at nisi prius. By Isaac 'espinasse, of Gray's Inn, Esq. Barrister at Law. The third edition, corrected, with considerable additions from printed and manuscript cases. In two volumes. ...",
				"place": "London",
				"url": "http://find.galegroup.com/ecco/infomark.do?&source=gale&prodId=ECCO&tabID=T001&docId=CW3325179878&type=multipage&contentSet=ECCOArticles&version=1.0",
				"pages": "469",
				"numPages": "469",
				"DOI": "Monograph",
				"date": "1798",
				"volume": "Volume 1",
				"accessDate": "2012/05/07",
				"libraryCatalog": "Galegroup"
			}
		]
	}
]
/** END TEST CASES **/