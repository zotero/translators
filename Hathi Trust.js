{
	"translatorID": "31da33ad-b4d9-4e99-b9ea-3e1ddad284d8",
	"label": "Hathi Trust",
	"creator": "Sebastian Karcher",
	"target": "^https?://catalog\\.hathitrust\\.org",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-10-30 22:16:45"
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
	if (url.match(/\Search\//)) return "multiple";
	if (url.match(/\Record\//)) return "book";
}
	

function doWeb(doc, url){
	var articles = new Array();
	if(detectWeb(doc, url) == "multiple") { 
		var items = {};
		var xpath = '//div[@class="resultitem"]'
		var rows = ZU.xpath(doc, xpath);
		for (var i in rows) {
			var title = ZU.xpathText(rows[i], './/span[@class="title"]');
			var id = ZU.xpath(rows[i], './/a[@class="cataloglinkhref"]')[0].href;
			items[id] = title;
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

// help function
function scrape(doc, url){
	//get Endnote Link
	var baseurl = url.replace(/^(.*?)(\/Record\/)(.*)$/, "$1");
	var itemid = url.match(/\/([0-9]+)/)[1];
	var risurl = baseurl + "/Search/SearchExport?handpicked=" + itemid + "&method=ris";
	Zotero.Utilities.HTTP.doGet(risurl, function (text) {
		text = text.replace(/N1  -/g, "N2  -");
		//Zotero.debug("RIS: " + text)

		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function(obj, item) {
			item.extra="";
			if (item.place)	item.place = item.place.replace(/\[/, "").replace(/\]/, "");
			if (item.tags) item.tags = item.tags.join("/").split("/")
			item.attachments = [{url:item.url, title: "Hathi Trust Record", mimeType: "text/html"}];
			item.url = "";
			item.complete();
		});	
		translator.translate();
	});
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://catalog.hathitrust.org/Search/Home?checkspelling=true&lookfor=Cervantes&type=all&sethtftonly=true&submit=Find",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://catalog.hathitrust.org/Record/001050654",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Entwistle",
						"firstName": "William J.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					""
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://catalog.hathitrust.org/Record/001050654",
						"title": "Hathi Trust Record",
						"mimeType": "text/html"
					}
				],
				"itemID": "001050654",
				"title": "Cervantes",
				"date": "1940",
				"pages": "3 p.l., 192 p.",
				"numPages": "3 p.l., 192 p.",
				"place": "Oxford",
				"publisher": "The Clarendon press",
				"url": "http://catalog.hathitrust.org/Record/001050654",
				"libraryCatalog": "Hathi Trust",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/
