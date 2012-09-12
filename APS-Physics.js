{
	"translatorID": "f318ab1e-71c6-4f67-8ac3-4b1144e5bf4e",
	"label": "APS-Physics",
	"creator": "Will Shanks",
	"target": "^https?://(?:www\\.)?(physics)\\.aps\\.org[^/]*/(toc|abstract|forward|showrefs|supplemental|search|articles)/?",
	"minVersion": "1.0.0b3.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-09-12 08:22:19"
}

// Works for APS Physics Viewpoints and Focus articles: http://physics.aps.org/

function detectWeb(doc, url) {
	return "journalArticle";
}

function doWeb(doc, url) {
	
	Zotero.debug(doc.title);
	
	// Search for abstract
	var bylineXPathNode=doc.evaluate('//article/header/p[contains(@class, "byline")]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if (bylineXPathNode) {
		var abs = Zotero.Utilities.trimInternal(bylineXPathNode.textContent);
	}
	
	//Only Viewpoints have PDFs
	var titleXPathNode=doc.evaluate('//article/header/h1[contains(@class, "title")]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	var hasPDF = false;
	if (titleXPathNode) {
		var title = titleXPathNode.textContent;
		if (title.search(/^Viewpoint:/)>-1) {
			hasPDF=true;
		}
	}
	
	//Get DOI
	var doiXPathNode=doc.evaluate('//article/header/div[contains(@class, "pubinfo")]/abbr[contains(@class, "doi")]/@title', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	var doi = doiXPathNode.textContent;
	
	//Set up urls
	var snapurl = doc.location.href;
	var pdfurl = 'http://physics.aps.org/articles/pdf/' + doi;
	var urlRIS = 'http://physics.aps.org/articles/export/' + doi + '/ris';
	
	Zotero.Utilities.HTTP.doGet(urlRIS, function(text) {
		// load translator for RIS
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function(obj, item) {
			if (item.itemID) {
				item.DOI = item.itemID;
			}
			item.attachments = [
				{url:snapurl, title:"APS Snapshot", mimeType:"text/html"}];
			if (hasPDF) {
				item.attachments.push({url:pdfurl, title:"APS Full Text PDF", mimeType:"application/pdf"});
			}
			
			if (abs) item.abstractNote = abs;
			item.complete();
		});
		translator.translate();
	}, null, 'UTF-8');
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://physics.aps.org/articles/v5/101",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Schirber",
						"firstName": "Michael",
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
					}
				],
				"publisher": "American Physical Society",
				"itemID": "10.1103/Physics.5.101",
				"title": "Measuring the Smallest Trickle",
				"publicationTitle": "Physics",
				"journalAbbreviation": "Physics",
				"volume": "5",
				"pages": "101",
				"date": "September 10, 2012",
				"url": "http://link.aps.org/doi/10.1103/Physics.5.101",
				"DOI": "10.1103/Physics.5.101",
				"abstractNote": "Researchers used a nanoscale tunnel in a silicon chip to measure a flow rate of a few picoliters per minute, which is smaller than any previous observation.",
				"libraryCatalog": "APS-Physics",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://physics.aps.org/articles/v5/100",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "de Beer",
						"firstName": "Sissi",
						"creatorType": "author"
					},
					{
						"lastName": "Müser",
						"firstName": "Martin H.",
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
				"publisher": "American Physical Society",
				"itemID": "10.1103/Physics.5.100",
				"title": "Surface Folds Make Tears and Chips",
				"publicationTitle": "Physics",
				"journalAbbreviation": "Physics",
				"volume": "5",
				"pages": "100",
				"date": "September 4, 2012",
				"url": "http://link.aps.org/doi/10.1103/Physics.5.100",
				"DOI": "10.1103/Physics.5.100",
				"abstractNote": "Fluidlike folding instabilities of solid surfaces complicate the machining of metals to perfection",
				"libraryCatalog": "APS-Physics",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/