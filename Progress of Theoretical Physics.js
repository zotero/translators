{
	"translatorID": "0b356cb6-7fa1-4662-b6e8-7ffc9ca2cd4a",
	"label": "Progress of Theoretical Physics",
	"creator": "Sebastian Karcher",
	"target": "^https?://ptp\\.ipap\\.jp/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-05-10 13:04:03"
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
	if (url.match(/\/journal\/|\/findarticle$/)) return "multiple";
	if (url.match(/\link\?/)) return "journalArticle";
}
	
function makeURL(url){
	// http://ptp.ipap.jp/cgi-bin/dumparticle?mode=bibtex&journal=PTP&volume=127&page=209
	var volume = url.match(/(PTP\/)(\d+)/)[2];
	var page = url.match(/(PTP\/\d+\/)(\d+)/)[2];
	var bibtexurl = "http://ptp.ipap.jp/cgi-bin/dumparticle?mode=bibtex&journal=PTP&volume=" + volume + "&page=" + page;
	return bibtexurl;
}

function doWeb(doc, url){
	var articles = new Array();
	if(detectWeb(doc, url) == "multiple") { 
		var items = {};
		var titles = doc.evaluate('//ul/li/a|//ol/li/a', doc, null, XPathResult.ANY_TYPE, null);
		var title;
		while (title = titles.iterateNext()) {
			items[title.href] = title.textContent;
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

function scrape(doc, url){
	//get abstract and tags from article plage
	var abs = ZU.xpathText(doc,'//p[@class="abstract"]');
	var pdfurl = url + "/pdf";
	//get BibTex Link
	var bibtexurl = makeURL(url);
	Zotero.Utilities.HTTP.doGet(bibtexurl, function (bibtex) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		translator.setString(bibtex);
		translator.setHandler("itemDone", function(obj, item) {
			if (abs) item.abstractNote = abs.replace(/\n/g, "");
			item.attachments = [{url:item.url, title: "PTP - Snapshot", mimeType: "text/html"}, {url:pdfurl, title: "PTP - Snapshot", mimeType: "application/pdf"}];
			item.ISSN = "1347-4081";
			item.complete();
		});	
		translator.translate();
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://ptp.ipap.jp/link?PTP/127/383",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Pravabati",
						"lastName": "Chingangbam",
						"creatorType": "author"
					},
					{
						"firstName": "Tabish",
						"lastName": "Qureshi",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "PTP - Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "PTP - Snapshot",
						"mimeType": "application/pdf"
					}
				],
				"title": "Ghost Interference and Quantum Erasure",
				"publicationTitle": "Progress of Theoretical Physics",
				"volume": "127",
				"issue": "3",
				"pages": "383-392",
				"date": "2012",
				"url": "http://ptp.ipap.jp/link?PTP/127/383/",
				"DOI": "10.1143/PTP.127.383",
				"publisher": "Progress of Theoretical Physics",
				"abstractNote": "The two-photon ghost interference experiment,generalized to the case of massive particles, is theoretically analyzed.It is argued that the experiment is intimately connected to a double-slitinterference experiment where, which-path information exists. The reasonfor not observing first order interference behind the double-slit, is clarified.It is shown that the underlying mechanism for the appearance of ghostinterference is, the more familiar, quantum erasure.",
				"ISSN": "1347-4081",
				"libraryCatalog": "Progress of Theoretical Physics",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://ptp.ipap.jp/journal/PTP-127-3.html",
		"items": "multiple"
	}
]
/** END TEST CASES **/