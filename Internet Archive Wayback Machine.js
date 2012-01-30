{
	"translatorID": "513a53f5-b95e-4df6-a03e-3348d9ec9f44",
	"label": "Internet Archive Wayback Machine",
	"creator": "Sean Takats",
	"target": "^https?://web\\.archive\\.org/web/",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-01-30 22:48:18"
}

function detectWeb(doc, url){
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
			if (prefix == "x") return namespace; else return null;
		} : null;
	var xpath = '//td[@class="mainBody"]/a';
	var links = doc.evaluate(xpath, doc, nsResolver, XPathResult.ANY_TYPE, null);
	if (links.iterateNext()){
		return "multiple";
	}
	return "webpage";
}

function doWeb(doc, url){
	var uris = new Array();
	var dateRe = new RegExp("^http://web.archive.org/web/([0-9]+)");
	if (dateRe.test(url)){ //handle single item
		uris.push(url);
	} else{//handle multiple items
		var namespace = doc.documentElement.namespaceURI;
		var nsResolver = namespace ? function(prefix) {
				if (prefix == "x") return namespace; else return null;
			} : null;
		var xpath = '//td[@class="mainBody"]/a';
		var links = doc.evaluate(xpath, doc, nsResolver, XPathResult.ANY_TYPE, null);
		var items=new Array();
		var link;
		while (link = links.iterateNext()){
			items[link.href] = link.textContent;
		}
		items=Zotero.selectItems(items);
		for (var i in items) {
			uris.push(i);
		}
	}
	Zotero.Utilities.processDocuments(uris, function(newDoc) {
		//create new webpage Item from page
		var newItem = new Zotero.Item("webpage");
		newItem.title = newDoc.title;
		//parse date and add
		var m = dateRe.exec(newDoc.location.href);
		var date = m[1];
		date = date.substr(0, 4) + "-" + date.substr(4,2) + "-" + date.substr(6,2);
		newItem.date = date;
		//create snapshot
		newItem.attachments = [{url:newDoc.location.href, title:newDoc.title, mimeType:"text/html"}];
		newItem.complete();
	}, function() {Zotero.done();});
	Zotero.wait();


}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://web.archive.org/web/20110310073553/http://www.taz.de/",
		"items": [
			{
				"itemType": "webpage",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://web.archive.org/web/20110310073553/http://www.taz.de/",
						"title": "taz.de",
						"mimeType": "text/html"
					}
				],
				"title": "taz.de",
				"date": "2011-03-10",
				"libraryCatalog": "Internet Archive Wayback Machine"
			}
		]
	}
]
/** END TEST CASES **/