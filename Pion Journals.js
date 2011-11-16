{
	"translatorID": "291934d5-36ec-4b81-ac9c-c5ad5313dba4",
	"label": "Pion Journals",
	"creator": "Michael Berkowitz",
	"target": "http://(www.)?(hthpweb|envplan|perceptionweb)\\.com/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-12 12:22:21"
}

function detectWeb(doc, url) {
	if (url.match(/search\.cgi/) || url.match(/ranking/) || url.match(/volume=/)) {
		return "multiple";
	} else if (url.match(/abstract\.cgi/)) {
		return "journalArticle";
	}
}

function doWeb(doc, url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;
	
	var arts = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = Zotero.Utilities.getItemArray(doc, doc, "abstract.cgi\\?id=");
		items = Zotero.selectItems(items);
		for (var i in items) {
			arts.push(i);
		}
	} else {
		arts = [url];
	}
	//Zotero.debug(arts);
	Zotero.Utilities.processDocuments(arts, function(doc) {
		var item = new Zotero.Item("journalArticle");
		item.publicationTitle = Zotero.Utilities.trimInternal(doc.evaluate('//div[@id="footer"]/div[@class="left"]/i', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent);
		item.title = Zotero.Utilities.trimInternal(doc.evaluate('//div[@id="total"]/p[2]/font/b', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent);
		var authors = Zotero.Utilities.trimInternal(doc.evaluate('//div[@id="total"]/p[3]/b', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent).split(/,\s*/);
		for each (var aut in authors) {
			item.creators.push(Zotero.Utilities.cleanAuthor(aut, "author"));
		}
		if (doc.evaluate('//div[@id="title"]/div[@class="left"]/font', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent.match(/\d+/)) {
			var voliss = doc.evaluate('//div[@id="title"]/div[@class="left"]/font', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent.match(/(\d+)\s+volume\s+(\d+)\s*\((\d+)\)\s+(pages\s+(.*))?$/);
			//Zotero.debug(voliss);
			item.date = voliss[1];
			item.volume = voliss[2];
			item.issue = voliss[3];
			if (voliss[5]) item.pages = voliss[5];
		} else {
			item.date = Zotero.Utilities.trimInternal(doc.evaluate('//div[@id="total"]/p[4]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent).match(/(\d+)$/)[1];
		}
		item.DOI = Zotero.Utilities.trimInternal(doc.evaluate('//div[@id="title"]/div[@class="right"]/font', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent).substr(4);
		
		if (doc.evaluate('//a[contains(@href, ".pdf")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext()) var pdfurl = doc.evaluate('//a[contains(@href, ".pdf")]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().href;
		item.url = doc.location.href;
		var pub = item.publicationTitle;
		item.attachments = [{url:item.url, title:pub + " Snapshot", mimeType:"text/html"}];
		if (pdfurl) item.attachments.push({url:pdfurl, title:pub + " Full Text PDF", mimeType:"application/pdf"});
		item.abstractNote = Zotero.Utilities.trimInternal(doc.evaluate('//div[@id="total"]/p[5]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent).substr(10);
		item.complete();
	}, function() {Zotero.done();});
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://perceptionweb.com/abstract.cgi?id=p6018",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Sven",
						"lastName": "Vrins",
						"creatorType": "author"
					},
					{
						"firstName": "Tessa C J de",
						"lastName": "Wit",
						"creatorType": "author"
					},
					{
						"firstName": "Rob van",
						"lastName": "Lier",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://perceptionweb.com/abstract.cgi?id=p6018",
						"title": "Perception Snapshot",
						"mimeType": "text/html"
					}
				],
				"publicationTitle": "Perception",
				"title": "Bricks, butter, and slices of cucumber: Investigating semantic influences in amodal completion",
				"date": "2009",
				"volume": "38",
				"issue": "1",
				"pages": "17 – 29",
				"DOI": "10.1068/p6018",
				"url": "http://perceptionweb.com/abstract.cgi?id=p6018",
				"abstractNote": "Objects in our world are partly occluded by other objects or sometimes even partly by themselves. Amodal completion is a visual process that enables us to perceive these objects as complete and is influenced by both local object information, present at contour intersections, and overall (global) object shape. In contrast, object semantics have been demonstrated to play no role in amodal completion but do so only by means of subjective methods. In the present study, object semantics were operationalised by material hardness of familiar objects which was varied to test whether it leaves amodal completion unaffected. Specifically, we investigated the perceived form of joined naturalistic objects that differ in perceived material hardness, employing the primed matching paradigm. In experiments 1 and 2, probing three different prime durations, amodal completion of a notched circular object changes systematically with the hardness of the object it was joined to. These results are in line with the view that amodal completion is inseparable from general object interpretation, during which object semantics may dominate.",
				"libraryCatalog": "Pion Journals",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Bricks, butter, and slices of cucumber"
			}
		]
	}
]
/** END TEST CASES **/