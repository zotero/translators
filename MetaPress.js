{
	"translatorID": "62c0e36a-ee2f-4aa0-b111-5e2cbd7bb5ba",
	"label": "MetaPress",
	"creator": "Michael Berkowitz",
	"target": "https?://(.*)metapress.com/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-04-03 13:13:52"
}

function detectWeb(doc, url) {
	if (doc.title.indexOf("Search Results") != -1) {
		return "multiple";
	} else if (url.match(/content\/[^?/]/)) {
		return "journalArticle";
	}
}

function doWeb(doc, url) {
	var host = doc.location.host;
	var artids = new Array();
	if (detectWeb(doc, url) == "multiple") {
		
	} else {
		artids.push(url.match(/content\/([^/]+)/)[1]);
	}
	for (var i in artids) {
		var newurl = 'http://' + host + '/content/' + artids[i];
		Zotero.Utilities.processDocuments([newurl], function(newDoc) {
			var tagsx = '//td[@class="mainPageContent"]/div[3]';
			if (doc.evaluate(tagsx, doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
				var tags = Zotero.Utilities.trimInternal(doc.evaluate(tagsx, doc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent).split(",");
			}
			Zotero.Utilities.HTTP.doPost('http://' + host + '/export.mpx', 'code=' + artids[i] + '&mode=ris', function(text) {
				// load translator for RIS
				var translator = Zotero.loadTranslator("import");
				translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
				translator.setString(text);
				translator.setHandler("itemDone", function(obj, item) {
					var pdfurl = 'http://' + host + '/content/' + artids[i] + '/fulltext.pdf';
					item.attachments = [
						{url:item.url, title:"MetaPress Snapshot", mimeType:"text/html"},
						{url:pdfurl, title:"MetaPress Full Text PDF", mimeType:"application/pdf"}
					];
					//if (tags) item.tags = tags;
					if (item.abstractNote) {
						if (item.abstractNote.substr(0, 8) == "Abstract") item.abstractNote = Zotero.Utilities.trimInternal(item.abstractNote.substr(8));
					}
					item.complete();
				});
				translator.translate();
				Zotero.done();
			});
		}, function() {});
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://metapress.com/content/hh83064822430454/?p=0cf49d882cc547049b49cfba468cc263&pi=0",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Kawasaki",
						"firstName": "K.",
						"creatorType": "author"
					},
					{
						"lastName": "Madachi-Yamamoto",
						"firstName": "S.",
						"creatorType": "author"
					},
					{
						"lastName": "Yonemura",
						"firstName": "D.",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://dx.doi.org/10.1007/BF00143081",
						"title": "MetaPress Snapshot",
						"mimeType": "text/html"
					},
					{
						"url": "http://metapress.com/content/hh83064822430454/fulltext.pdf",
						"title": "MetaPress Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"publicationTitle": "Documenta Ophthalmologica",
				"title": "Hyperosmolarity response of ocular standing potential as a clinical test for retinal pigment epithelium activity rhegmatogenous retinal detachment",
				"volume": "57",
				"issue": "3",
				"pages": "175-180",
				"date": "May 01, 1984",
				"url": "http://dx.doi.org/10.1007/BF00143081",
				"DOI": "10.1007/BF00143081",
				"abstractNote": "The hyperosmolarity response of the ocular standing potential was recorded in unilateral rhegmatogenous retinal detachment (8 eyes) and in the fellow ‘healthy’ eye (8 eyes). The hyperosmolarity response was greatly suppressed (M-4 SD: M and SD indicate respectively the mean and the standard deviation in normal subjects) in all affected eyes (p < 0.005), and slightly abnormal in 2 fellow eyes. The L/D ratio was normal in 2 affected eyes and in all fellow eyes. The hyperosmolarity response in the affected eyes was still greatly suppressed 14 months after successful surgical treatment.",
				"libraryCatalog": "MetaPress",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/