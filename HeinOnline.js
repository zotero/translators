{
	"translatorID": "3dcbb947-f7e3-4bbd-a4e5-717f3701d624",
	"label": "HeinOnline",
	"creator": "Frank Bennett",
	"target": "^https?://heinonline\\.org/HOL/(LuceneSearch|Page)\\?",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbiv",
	"lastUpdated": "2015-07-04 10:32:10"
}

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2015 Frank Bennett

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

function detectWeb (doc, url) {
	if (url.indexOf("/LuceneSearch?") > -1) {
		if (getSearchResults(doc)) {
			return "multiple";
		}
	} else {
		return "journalArticle";
	}
	return false;
}

function getXPathStr(attr, elem, path) {
	var res = ZU.xpath(elem, path);
	res = res.length ? res[0][attr] : '';
	return res ? res : '';
}

function Data(doc) {
	this.node = ZU.xpath(doc, '//form[@id="Print1"]');
	this.urlbase = "PDFsearchable?sectioncount=1&ext=.pdf&nocover=";
	this.queryElems = [];
}

Data.prototype.getVal = function(name, returnOnly) {

	var val = getXPathStr("value", this.node, './/input[@name="' + name + '"]');
	val = encodeURIComponent(val);

	if (!returnOnly) {
		this.queryElems.push(name + "=" + val);
	}
	return val;
}

Data.prototype.dump = function() {
	return this.urlbase + this.queryElems.join("&") + this.tail;
}

function getSearchResults(doc) {
	var results = doc.getElementsByClassName("lucene_search_result_b"),
		items = {},
		found = false
	for (var i=0; i<results.length; i++) {
		var url = getXPathStr("href", results[i], './/a[contains(@href, "Print")]');
		url = url.replace(/Print/, "Page");
		url = url.replace(/&terms=[^&]*/, '');

		var title = getXPathStr("textContent", results[i], './/a[1]');
		title = ZU.trimInternal(title);
		title = title.replace(/\s*\[[^\]]*\]$/, '');

		if (!title || !url) continue;
		
		items[url] = title;
		found = true;
	}
	return found ? items : false;
}

function scrapePage(doc, url) {
	var pdfPageURL = url.replace(/\/Page\?/, "/Print?");
	var item = new Zotero.Item();
	var z3988title = getXPathStr("title", doc, '//span[contains(@class, " Z3988") or contains(@class, "Z3988 ") or @class="Z3988"][@title]');
	ZU.parseContextObject(z3988title, item);

	ZU.processDocuments([pdfPageURL], 
		function(pdoc, purl){
			var input = new Data(pdoc);
			var startingID = input.getVal("id");
			var endingID = input.getVal("toid", true);
			input.getVal("handle");
			input.getVal("collection");
			input.getVal("section");
			input.getVal("print");
			input.getVal("nocover");
			var pdfURL = input.dump();
			
			item.pages = item.pages + "-" 
				+ (parseInt(item.pages) 
				+  parseInt(endingID) 
				-  parseInt(startingID));

			item.attachments.push({
				url:pdfURL,
				title:"HeinOnline PDF",
				mimeType:"application/pdf"
			});
			item.complete();
		});
}

function doWeb (doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var urls = [];
			for (var i in items) {
				urls.push(i);
			}
			ZU.processDocuments(urls, scrapePage);
		});
	} else {
		scrapePage(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://heinonline.org/HOL/Page?handle=hein.journals/howlj3&div=8&collection=journals&set_as_cursor=1&men_tab=srchresults",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Law, Logic and Experience",
				"creators": [
					{
						"firstName": "Grant",
						"lastName": "Gilmore",
						"creatorType": "author"
					}
				],
				"date": "1957",
				"journalAbbreviation": "Howard L.J.",
				"libraryCatalog": "HeinOnline",
				"pages": "26-41",
				"publicationTitle": "Howard Law Journal",
				"url": "http://heinonline.org/HOL/Page?handle=hein.journals/howlj3&id=46&div=&collection=journals",
				"volume": "3",
				"attachments": [
					{
						"title": "HeinOnline PDF",
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
