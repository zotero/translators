{
	"translatorID": "5af42734-7cd5-4c69-97fc-bc406999bdba",
	"label": "ESA Journals",
	"creator": "Sebastian Karcher",
	"target": "^http://www\\.esajournals\\.org/",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-01-30 22:39:06"
}

/*
ESA Journals Translator
Copyright (C) 2011 Sebastian Karcher

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url) {
	if (url.match(/\/doi\/abs\/10\.|\/doi\/full\/10\./)) return "journalArticle";
	else if (url.match(/\/action\/doSearch|\/toc\//)) return "multiple";
}


function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ?
	function (prefix) {
		if (prefix == 'x') return namespace;
		else return null;
	} : null;
	var arts = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		var rows = ZU.xpath(doc, '//table[@class="articleEntry"]');
		for (var i in rows) {
			var title = ZU.xpathText(rows[i], './/div[@class="art_title"]');
			//Z.debug(title)
			var id = ZU.xpathText(rows[i], './/a[contains(@href, "/doi/abs/")][1]/@href');
			//	Z.debug(id)
			items[id] = title;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			citationurls = new Array();
			for (var itemurl in items) {
				//Z.debug(itemurl)
				//some search results have some "baggage" at the end - remove
				citationurls.push(itemurl.replace(/\?prev.+/, "").replace(/\/doi\/abs\//, "/action/showCitFormats?doi="));
			}
			getpages(citationurls);
		});

	} else {
		var citationurl = url.replace(/\/doi\/abs\/|\/doi\/full\//, "/action/showCitFormats?doi=");
		//Z.debug(citationurl)
		getpages(citationurl);
	}
	Zotero.wait();
}

function getpages(citationurl) {
	//we work entirely from the citations page
	Zotero.Utilities.processDocuments(citationurl, function (doc) {
		scrape(doc);
	}, function () {
	  Zotero.done();
	});
}


function scrape(doc) {
	var newurl = doc.location.href;
	//Z.debug(newurl);
	var pdfurl = newurl.replace(/\/action\/showCitFormats\?doi=/, "/doi/pdf/");
	var absurl = newurl.replace(/\/action\/showCitFormats\?doi=/, "/doi/abs/");
	var doi = doc.evaluate('//form[@target="_self"]/input[@name="doi"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().value;
	var filename = doc.evaluate('//form[@target="_self"]/input[@name="downloadFileName"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().value;
	//	Z.debug(filename);
	var get = 'http://www.esajournals.org/action/downloadCitation';
	var post = 'doi=' + doi + '&downloadFileName=' + filename + '&format=ris&direct=true&include=cit';
	Zotero.Utilities.HTTP.doPost(get, post, function (text) {
		var translator = Zotero.loadTranslator("import");
		// Calling the RIS translator
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			item.url = absurl;
			item.notes = [];
			item.attachments = [{
				url: pdfurl,
				title: "ESA PDF fulltext",
				mimeType: "application/pdf"
			}, {
				url: absurl,
				title: "ESA Snapshot",
				mimeType: "text/html"
			}];
			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [{
	"type": "web",
	"url": "http://www.esajournals.org/doi/abs/10.1890/09-1234.1",
	"items": [{
		"itemType": "journalArticle",
		"creators": [{
			"lastName": "Gao",
			"firstName": "Chao",
			"creatorType": "author"
		}, {
			"lastName": "Wang",
			"firstName": "Han",
			"creatorType": "author"
		}, {
			"lastName": "Weng",
			"firstName": "Ensheng",
			"creatorType": "author"
		}, {
			"lastName": "Lakshmivarahan",
			"firstName": "S.",
			"creatorType": "author"
		}, {
			"lastName": "Zhang",
			"firstName": "Yanfen",
			"creatorType": "author"
		}, {
			"lastName": "Luo",
			"firstName": "Yiqi",
			"creatorType": "author"
		}],
		"notes": [],
		"tags": [],
		"seeAlso": [],
		"attachments": [{
			"url": "http://www.esajournals.org/doi/pdf/10.1890/09-1234.1",
			"title": "ESA PDF fulltext",
			"mimeType": "application/pdf"
		}, {
			"url": "http://www.esajournals.org/doi/abs/10.1890/09-1234.1",
			"title": "ESA Snapshot",
			"mimeType": "text/html"
		}],
		"title": "Assimilation of multiple data sets with the ensemble Kalman filter to improve forecasts of forest carbon dynamics",
		"date": "2011",
		"DOI": "10.1890/09-1234.1",
		"publicationTitle": "Ecological Applications",
		"pages": "1461-1473",
		"volume": "21",
		"issue": "5",
		"publisher": "Ecological Society of America",
		"ISBN": "1051-0761",
		"ISSN": "1051-0761",
		"url": "http://www.esajournals.org/doi/abs/10.1890/09-1234.1",
		"accessDate": "2011/12/13",
		"libraryCatalog": "ESA Journals"
	}]
}, {
	"type": "web",
	"url": "http://www.esajournals.org/toc/ecap/21/5",
	"items": "multiple"
}] /** END TEST CASES **/
