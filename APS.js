{
	"translatorID": "2c310a37-a4dd-48d2-82c9-bd29c53c1c76",
	"label": "APS",
	"creator": "Eugeniy Mikhailov and Michael Berkowitz",
	"target": "^https?://(?:www\\.)?(prola|prl|pra|prb|prc|prd|pre|prx|prst-ab|prst-per|rmp|publish)\\.aps\\.org[^/]*/(toc|abstract|forward|showrefs|supplemental|search)/?",
	"minVersion": "1.0.0b3.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2012-08-31 15:26:06"
}

// Works for all APS journals: http://publish.aps.org/

function detectWeb(doc, url) {
	// toc indicates table of contents, forward is a "Citing articles" page
	if (/\/toc\//.test(url) || (/\/forward\//.test(url)) || (/\/search/.test(url))){
		return "multiple";
	} else {
		return "journalArticle";
	}
}

function doWeb(doc, url) {
		var arts = new Array();
		if (detectWeb(doc, url) == "multiple") {
			var items = Zotero.Utilities.getItemArray(doc, doc, "abstract");
			items = Zotero.selectItems(items);
			for (var i in items) {
				arts.push(i);
			}
		} else {
			arts = [url];
		}
		
		Zotero.Utilities.processDocuments(arts, function(newDoc) {
			Zotero.debug(newDoc.title);
		// Use abstract only if we have one
		if (newDoc.evaluate('//div[contains(@class, "aps-abstractbox")]/p', newDoc, null, XPathResult.ANY_TYPE, null).iterateNext()) var abs = Zotero.Utilities.trimInternal(newDoc.evaluate('//div[contains(@class, "aps-abstractbox")]/p', newDoc, null, XPathResult.ANY_TYPE, null).iterateNext().textContent);
			var urlRIS = newDoc.location.href;
		urlRIS = urlRIS.replace(/(abstract|forward|showrefs|supplemental)/,"export");
		var post = "type=ris";
		var snapurl = newDoc.location.href;
		var pdfurl = snapurl.replace(/(abstract|forward|showrefs|supplemental)/, "pdf");
		Zotero.Utilities.HTTP.doPost(urlRIS, post, function(text) {
			//DOI is stored in ID field. Fix it.
			text = text.replace(/^ID\s\s?-\s/mg, 'DO  - ');
			// load translator for RIS
			var translator = Zotero.loadTranslator("import");
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function(obj, item) {
				item.attachments = [
					{url:snapurl, title:"APS Snapshot", mimeType:"text/html"},
					{url:pdfurl, title:"APS Full Text PDF", mimeType:"application/pdf"}
				];
				if (abs) item.abstractNote = abs;
				item.complete();
			});
			translator.translate();
		 }, null, 'UTF-8');
	}, function() {Zotero.done();});
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://prd.aps.org/abstract/PRD/v84/i7/e077701",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Raidal",
						"firstName": "Martti",
						"creatorType": "author"
					},
					{
						"lastName": "Strumia",
						"firstName": "Alessandro",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "APS Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "APS Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"DOI": "10.1103/PhysRevD.84.077701",
				"title": "Hints for a nonstandard Higgs boson from the LHC",
				"publicationTitle": "Physical Review D",
				"journalAbbreviation": "Phys. Rev. D",
				"volume": "84",
				"issue": "7",
				"pages": "077701",
				"url": "http://link.aps.org/doi/10.1103/PhysRevD.84.077701",
				"date": "October 21, 2011",
				"abstractNote": "We reconsider Higgs boson invisible decays into Dark Matter in the light of recent Higgs searches at the LHC. Present hints in the Compact Muon Solenoid and ATLAS data favor a nonstandard Higgs boson with approximately 50% invisible branching ratio, and mass around 143 GeV. This situation can be realized within the simplest thermal scalar singlet Dark Matter model, predicting a Dark Matter mass around 50 GeV and direct detection cross section just below present bound. The present runs of the Xenon100 and LHC experiments can test this possibility.",
				"libraryCatalog": "APS",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://prd.aps.org/toc/PRD/v84/i7",
		"items": "multiple"
	}
]
/** END TEST CASES **/