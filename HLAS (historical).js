{
	"translatorID": "9f52911f-e1b5-41f8-be66-b16982269e6a",
	"label": "HLAS (historical)",
	"creator": "Sebastian Karcher",
	"target": "http://lcweb2.loc.gov/cgi-bin/query/[Dd]\\?hlasbib",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2013-02-15 14:13:54"
}

/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2011 Sebastian Karcher and the Center for History and New Media
					 George Mason University, Fairfax, Virginia, USA
					 http://zotero.org
	
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
	//Z.debug(doc.title)
	if (doc.title.indexOf("Search Results")!=-1) return "multiple";
	if (doc.title.indexOf("Bibliographic Display")!=-1) return "book";
}
	

function doWeb(doc, url){

	var articles = new Array();
	if(detectWeb(doc, url) == "multiple") { 
		var items = {};
		var titlerows = doc.evaluate('//p/table/tbody/tr[td/a[contains(@href, "/cgi-bin/query/D")]]', doc, null, XPathResult.ANY_TYPE, null);
		while (titlerow = titlerows.iterateNext()) {
			var url = ZU.xpathText(titlerow, './td/a[contains(@href, "/cgi-bin/query/D")]/@href');
			var title = ZU.xpathText(titlerow, './td[2]')
			items[url] = title;
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
	} else {
		scrape(doc, url);
	}
}


function scrape(doc, url){
	//scrape the LC control number from the page and get LoC catalog data for it via SRU
	var idnumbers = ZU.xpathText(doc, '//body/p[b[contains(text(), "LC Control No")]]');
	if (idnumbers) var LCcontrol = idnumbers.match(/LC Control No\:\s*(\d+)/)[1]
	ZU.doGet("http://z3950.loc.gov:7090/voyager?version=1.1&operation=searchRetrieve&query=dc.resourceIdentifier=" + LCcontrol + "&maximumRecords=1", function (text) {
		//Z.debug(text);
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("edd87d07-9194-42f8-b2ad-997c4c7deefd");
		translator.setString(text);
		translator.translate();
	});
}