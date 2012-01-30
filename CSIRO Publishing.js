{
	"translatorID": "303c2744-ea37-4806-853d-e1ca67be6818",
	"label": "CSIRO Publishing",
	"creator": "Michael Berkowitz",
	"target": "^https?://(www.)?publish\\.csiro\\.au/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-01-30 22:51:14"
}

function detectWeb(doc, url) {
	if (doc.evaluate('//a[@class="searchBoldBlue"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext() || doc.evaluate('//a[@class="linkjournal"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "multiple";
	} else if (url.indexOf("/view/journals/") != -1 || url.indexOf("paper") != -1) {
		return "journalArticle";
	}
}

function doWeb(doc, url) {
	var links = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = new Object();
		if (doc.evaluate('//a[@class="searchBoldBlue"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
			var arts = doc.evaluate('//a[@class="searchBoldBlue"]', doc, null, XPathResult.ANY_TYPE, null);
			var art = arts.iterateNext();
			while (art) {
				items[art.href] = art.textContent;
				art = arts.iterateNext();
			}
		} else if (doc.evaluate('//a[@class="linkjournal"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
			var arts = doc.evaluate('//a[@class="linkjournal"]', doc, null, XPathResult.ANY_TYPE, null);
			var titles = doc.evaluate('//td[3]//td[1]/table/tbody/tr/td/b', doc, null, XPathResult.ANY_TYPE, null);
			var art;
			var title;
			while ((art = arts.iterateNext()) && (title = titles.iterateNext())) {
				items[art.href] = title.textContent;
			}
		}
		items = Zotero.selectItems(items);
		for (var i in items) {
			links.push(i.match(/([^/=.htm]*)(.htm)?$/)[1]);
		}
	} else {
		links.push(url.match(/([^/=.htm]*)(.htm)?$/)[1]);
	}
	for (var i in links) {
		var newURL = 'http://www.publish.csiro.au/view/journals/dsp_journal_retrieve_citation.cfm?ct=' + links[i] + '.ris';
		var pdfURL = 'http://www.publish.csiro.au/?act=view_file&file_id=' + links[i] + '.pdf';
		Zotero.Utilities.HTTP.doGet(newURL, function(text) {
			var translator = Zotero.loadTranslator("import");
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function(obj, item) {
				item.itemType = "journalArticle";
				if (item.notes[0]) {
					item.abstractNote = item.notes[0].note;
				}
				item.attachments = [
					{url:pdfURL, title:"CSIRO Publishing PDF", mimeType:"application/pdf"},
					{url:newURL, title:"CSIRO Publishing Snaphost", mimeType:"text/html"}
				];
				item.complete();
			});
			translator.translate();
		});
	}
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.publish.csiro.au/paper/BT04151.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Humphreys",
						"firstName": "W.F. ",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.publish.csiro.au/?act=view_file&file_id=BT04151.pdf",
						"title": "CSIRO Publishing PDF",
						"mimeType": "application/pdf"
					},
					{
						"url": "http://www.publish.csiro.au/view/journals/dsp_journal_retrieve_citation.cfm?ct=BT04151.ris",
						"title": "CSIRO Publishing Snaphost",
						"mimeType": "text/html"
					}
				],
				"title": "Aquifers: the ultimate groundwater-dependent ecosystems",
				"publicationTitle": "Aust. J. Bot.",
				"date": "April 06, 2006",
				"volume": "54",
				"issue": "2",
				"pages": "115-132",
				"url": "http://dx.doi.org/10.1071/BT04151",
				"abstractNote": "Australian aquifers support diverse metazoan faunas comprising obligate groundwater inhabitants, largely crustaceans but also including insects, worms, gastropods, mites and fish. They typically comprise short-range endemics, often of relictual lineages and sometimes widely vicariant from their closest relatives. They have been confined to subterranean environments from a range of geological eras and may contain information on the deep history of aquifers. Obligate groundwater fauna (stygobites) occurs in the void spaces in karst, alluvial and fractured rock aquifers. They have convergent morphologies (reduction or loss of eyes, pigment, enhanced non-optic senses, vermiform body form) and depend on energy imported from the surface except in special cases of in situ chemoautotrophic energy fixation. In Australia, many stygofaunas in arid areas occur in brackish to saline waters, although they contain taxa from lineages generally restricted to freshwater systems. They may occur alongside species belonging to taxa considered typical of the marine littoral although far removed in space and time from marine influence. The ecological attributes of stygofauna makes them vulnerable to changes in habitat, which, combined with their taxonomic affinities, makes them a significant issue to biodiversity conservation. The interaction of vegetation and groundwater ecosystems is discussed and, in places, there are conservation issues common to both.",
				"libraryCatalog": "CSIRO Publishing",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Aquifers"
			}
		]
	}
]
/** END TEST CASES **/