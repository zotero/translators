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
	if (doc.location.href.indexOf("/topic/") != -1) {
		return "multiple";
	}
	else if (ZU.xpathText(doc, '//article')) {
		return "newspaperArticle";
	}
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
	if (prefix == 'x') return namespace; else return null;
	} : null; 

	//srcaping titles of search results
	if (detectWeb(doc, url) == "multiple") {
		var myXPath = '//main/descendant::h3';
		var myXPathObject = doc.evaluate(myXPath, doc, nsResolver, XPathResult.ANY_TYPE, null); 
		var items = {};
		var headers;
		var articles = new Array();
		var k=0;
		while (headers = myXPathObject.iterateNext()) {
			items[k++] = headers.textContent;
		}
		Zotero.selectItems(items, function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				Zotero.debug(i);
				articles.push(i);
			}
			Zotero.Utilities.processDocuments(articles, getEdition);
		});
	}	
	else{
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	newItem = new Zotero.Item("newspaperArticle");
	newItem.url = doc.location.href;
	newItem.publicationTitle = "The Economic Times";

	//get headline
	var title = ZU.xpathText(doc, '//article/h1');
	if (!title) title = ZU.xpathText(doc, '//meta[@property="og:title"]/@content');
	newItem.title = title;

	//get abstract
	var abstract = ZU.xpathText(doc, '//meta[@property="og:description"]/@content');
	newItem.abstractNote = abstract;
	
	//get date and day
	var date = ZU.xpathText(doc, '//article/div[4]/div[1]');
	if(!date) date = ZU.xpathText(doc, '//article/div[1]/div[2]');
	date = date.substring(date.indexOf("|") + 1);
	var date_day = date.replace('Updated:','');
	newItem.date = date_day;
	
	//get author or organization
	var authors = ZU.xpath(doc, '//a[@rel="author"]');
	for (var i in authors){
		newItem.creators.push(ZU.cleanAuthor(authors[i].textContent, "author"));
	}
	if(!authors.length){
		authors = ZU.xpathText(doc, '//article/div[4]/div[1]');
		authors_org=authors.substring(0,authors.lastIndexOf("|")-1);
		var regex = /(.*By\s+)(.*)/;
		authors = authors_org.replace(regex, "$2");
		newItem.creators.push({lastName:authors,  creatorType: "author",fieldMode: 1});
	}

	var url = doc.location.href;
	newItem.attachments = [{
		document: doc,
		title: "The Economic Times Snapshot",
		mimeType: "text/html"
	}];
	newItem.complete();
}