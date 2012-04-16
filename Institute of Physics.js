{
	"translatorID": "9346ddef-126b-47ec-afef-8809ed1972ab",
	"label": "Institute of Physics",
	"creator": "Michael Berkowitz and Avram Lyon",
	"target": "^https?://iopscience\\.iop\\.org/(?:[0-9-X]+/.+|search.+)",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsv",
	"lastUpdated": "2012-04-04 14:45:46"
}

function detectWeb(doc, url) {
	if (ZU.xpathText(doc, '//meta[contains(@name, "citation_")]/@content')) {
		return "journalArticle";
	} else {
		return "multiple";
	}
}

function fetchDOIs(DOIs, pdfs) {
	var DOI = DOIs.shift();
	if (!DOI) {
		Zotero.done();
		return true;
	}
	if (pdfs) var pdfURL = pdfs.shift();
	var articleID = DOI.slice(DOI.indexOf('/') + 1);
	if (!pdfURL){
		var pdfURL = "http://iopscience.iop.org/" + articleID + "/pdf/" + articleID.replace("/", "_", "g") + ".pdf";
	}
	var doitranslate = Zotero.loadTranslator("search");
	doitranslate.setTranslator("11645bd1-0420-45c1-badb-53fb41eeb753");
	var item = {
		"itemType": "journalArticle",
		"DOI": DOI
	};
	doitranslate.setSearch(item);
	doitranslate.setHandler("itemDone", function (obj, item) {
		item.url = "http://iopscience.iop.org/" + articleID;
		item.attachments.push({
			url: pdfURL,
			title: "IOP Full Text PDF",
			mimeType: "application/pdf"
		});
		item.libraryCatalog = "Intitute of Physics";
		item.complete();
		fetchDOIs(DOIs);
	});

	var fallback = function () {
			Zotero.debug("Error saving using DOI and CrossRef; trying RIS");
			// If there is something wrong with the item
			var postVars = "exportFormat=iopexport_ris&exportType=abs&articleId=" + articleID;
			Zotero.Utilities.HTTP.doPost("http://iopscience.iop.org/export", postVars, function (text) {
				// load translator for RIS
				var ristranslator = Zotero.loadTranslator("import");
				ristranslator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
				ristranslator.setString(text);
				ristranslator.setHandler("itemDone", function (obj, item) {
					item.url = "http://iopscience.iop.org/" + articleID;
					item.libraryCatalog = "Intitute of Physics";
					item.attachments.push({
						url: pdfURL,
						title: "IOP Full Text PDF",
						mimeType: "application/pdf"
					});
					item.complete();
					fetchDOIs(DOIs);
				});
				ristranslator.translate();
			}, function () {});
		}

	doitranslate.setHandler("error", fallback);
	try {
		doitranslate.translate()
	} catch (e) {
		Zotero.debug("Caught exception");
		fallback();
	};
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var host = url.match(/http:\/\/.+?\//)[0].replace(/\/$/, "");
		var arts = new Array();
		var pdfs = new Array();
		var items = new Object();
		var atts = new Object();
		//search results
		if (ZU.xpathText(doc, '//div[@class="searchResCol1"]')){
			var results = ZU.xpath(doc, '//div[@class="searchResCol1"]');
			var fulltexts = ZU.xpath(doc, '//div[@class="searchResCol2"]');
			for (var i in results) {
				var title = ZU.xpathText(results[i], './/h4/a');
				var doi = ZU.xpathText(results[i], './/span[@class="doi"]/strong/a');
				var pdf =  ZU.xpathText(fulltexts[i], './/a[@class="icon pdf"]/@href');
				items[doi] = title.trim();
				atts[doi] = host + pdf;
			}
		}
		//jounral TOC
		else if (ZU.xpathText(doc, '//div[@class="paperEntry"]')){
			var results = ZU.xpath(doc, '//div[@class="paperEntry"]');
			for (var i in results) {
				var title = ZU.xpathText(results[i], './/a[@class="title"]');
				var doi = ZU.xpathText(results[i], './/span[@class="doi"]/a[contains(text(), "doi:")]');
				var pdf =  ZU.xpathText(results[i], './/a[@class="icon pdf"]/@href');
				items[doi] = title.trim();
				atts[doi] = host + pdf;
		}

		}
		Zotero.selectItems(items, function (items) {
			if (!items) return true;
			for (var i in items) {
				arts.push(i);
				pdfs.push(atts[i])
			}
			fetchDOIs(arts, pdfs);
			Zotero.wait();
		});
	} else {
		var doi = doc.evaluate('//meta[@name="citation_doi"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext().content;
		if (ZU.xpathText(doc, '//meta[@name="citation_pdf_url"]/@content').indexOf(".pdf") != -1){
	 		var pdfs = ZU.xpathText(doc, '//meta[@name="citation_pdf_url"]/@content');
			fetchDOIs([doi], [pdfs]);
		}
		else fetchDOIs([doi]);
		Zotero.wait();
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://iopscience.iop.org/0022-3727/34/10/311",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "J",
						"lastName": "Batina"
					},
					{
						"creatorType": "author",
						"firstName": "F",
						"lastName": "Noël"
					},
					{
						"creatorType": "author",
						"firstName": "S",
						"lastName": "Lachaud"
					},
					{
						"creatorType": "author",
						"firstName": "R",
						"lastName": "Peyrous"
					},
					{
						"creatorType": "author",
						"firstName": "J F",
						"lastName": "Loiseau"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://iopscience.iop.org/0022-3727/34/10/311/pdf/0022-3727_34_10_311.pdf",
						"title": "IOP Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"publicationTitle": "Journal of Physics D: Applied Physics",
				"volume": "34",
				"issue": "10",
				"ISSN": "0022-3727, 1361-6463",
				"date": "2001-05-21",
				"pages": "1510-1524",
				"DOI": "10.1088/0022-3727/34/10/311",
				"url": "http://iopscience.iop.org/0022-3727/34/10/311",
				"title": "Hydrodynamical simulation of the electric wind in a cylindrical vessel with positive point-to-plane device",
				"libraryCatalog": "Intitute of Physics",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://iopscience.iop.org/search?searchType=fullText&fieldedquery=fun&f=titleabs&time=all&submit=Search&navsubmit=Search",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://iopscience.iop.org/0004-637X/536/2",
		"items": "multiple"
	}
]
/** END TEST CASES **/