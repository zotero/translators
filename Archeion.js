{
	"translatorID": "f6717cbb-2771-4043-bde9-dbae19129bb3",
	"label": "Archeion/MemoryBC",
	"creator": "Sebastian Karcher",
	"target": "^https?://www\\.(archeion\\.ca|memorybc\\.ca)",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-04-15 18:04:37"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2012 Sebastian Karcher 
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
	if (url.match(/;search\?/)) {
		return "multiple";
	} else if (url.match(/;rad$/)) {
		return "book";
	}
}

function scrape(doc, url) {
	var dcUrl = url.replace(/;rad$/, ";dc?sf_format=xml");
	Zotero.Utilities.doGet(dcUrl, function (text) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("5e3ad958-ac79-463d-812b-a86a9235c28f");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			//the DC doesn't distinguish between personal and institutional authors - get them from the page and parse
			var authors = ZU.xpath(doc, '//div[@id="archivalDescriptionArea"]//div[@class="field"]/h3[contains(text(), "Name of creator")]/following-sibling::div/a');
			for (var i in authors) {
				//remove location (in parentheses) from creators, since it often contains a comma that messes with author parsing
				item.creators[i] = ZU.cleanAuthor(authors[i].textContent.replace(/\(.+\)\s*$/, ""), "author", true);
				if (!item.creators[i].firstName) item.creators[i].fieldMode = 1;
			}
			//The Archive gets mapped to the relations tag - we want its name, not the description in archeion
			for (var i in item.seeAlso) {
				if (item.seeAlso[i].indexOf("http://") == -1) {
					item.archive = item.seeAlso[i];
				}
			}
			item.seeAlso = [];
			//the RDF translator doesn't get the full identifier - get it from the page
			var loc = ZU.xpathText(doc, '//div[@id="titleAndStatementOfResponsibilityArea"]//div[@class="field"]/h3[contains(text(), "Reference code")]/following-sibling::div');
			item.archiveLocation = loc;
			if (item.extra) item.notes.push(item.extra);
			item.extra = "";
			item.itemID = "";
			item.complete();
		});
		translator.getTranslatorObject(function(trans) {
			trans.defaultUnknownType = 'book';
			trans.doImport();
	});
	});
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var articles = new Array();
		var items = new Object();
		var titles = ZU.xpath(doc, '//div[contains(@class, "search-results")]/h2/a');
		for (var i in titles) {
			items[titles[i].href] = titles[i].textContent;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, scrape, function () {
				Zotero.done();
			});
			Zotero.wait();
		});
	} else {
		scrape(doc, url);
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.archeion.ca/;search?query=montreal",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.archeion.ca/kydd-memorial-presbyterian-church-montreal-quebec-fonds;rad",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Kydd Memorial Presbyterian Church",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Rosemount Presbyterian Church",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Fairmount-Taylor Presbyterian Church",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Fairmount Presbyterian Church",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Taylor Presbyterian Church",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Mount Royal Presbyterian Church",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Outremont Presbyterian Church",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Outremont-Mount Royal Presbyterian Church",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"notes": [
					"Fonds consists of registers, minutes and other records of Kydd Memorial Presbyterian Church (Montreal, Quebec) and of the records of the amalgamated Fairmount-Taylor Presbyterian Church (Montreal, Quebec) and of Outremont-Mount Royal Presbyterian Church (Montreal, Quebec). Records of Kydd Presbyterian Church consist of: Registers including Baptisms, Marriages and Burials (1927-1982); Court Orders (1982-1990); Session minutes (1928-1982); Congregational meetings (1948-1975); Communion Rolls (1927-1942, 1946-1978); Orders of Service (1928-1982); Annual Reports (1963-1981); Board of Managers Meeting minutes (1944-1978); a history (1975) and other records. Records of Fairmount Presbyterian Church consist of: Registers of Baptisms, Marriages and Burials (1910-1925); Session minutes (1910-1925); Communion Rolls (1910-1923) and Board of Managers Meeting minutes (1908-1922). Records of Fairmount-Taylor Presbyterian Church consist of: Registers of Baptisms, Marriages and Burials (1925-1969); Session minutes (1934-1962); Session Reports (1965-1968); Session Correspondence (1948-1970); Communion Rolls (1923-1966); Membership Lists (1967); Orders of Service (1967); Congregational minutes (1909-1969); Annual reports (1939); Board of Managers Reports (1964-1969); Auditor's Reports and Financial Statements (1932, 1950, 1966, 1969) and other records."
				],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "Kydd Memorial Presbyterian Church (Montreal, Quebec) fonds",
				"rights": "Notes Session minutes are restricted for a period of 50 years from the date they were written.",
				"archive": "The Presbyterian Church in Canada",
				"archiveLocation": "CA ON00313 CONG-147",
				"libraryCatalog": "Archeion/MemoryBC"
			}
		]
	}
]
/** END TEST CASES **/