{
	"translatorID": "0abd577b-ec45-4e9f-9081-448737e2fd34",
	"label": "UPCommons",
	"creator": "Sebastian Karcher",
	"target": "^https?://upcommons\\.upc\\.edu",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-02-08 12:01:01"
}

function detectWeb(doc, url) {
	if (doc.evaluate('//table[@class="itemDisplayTable"]', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		var type = ZU.xpathText(doc, '//meta[@name="DC.type"]/@content');
		if(itemTypes[type]!=null) return itemTypes[type];
		else return "document";
	} else if (doc.evaluate('//table[@class="miscTable"]//td[2]', doc, null, XPathResult.ANY_TYPE, null).iterateNext() || doc.evaluate('//div[@id="main"]/ul[@class="browselist"]/li/a', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) {
		return "multiple";
	}
}

var itemTypes = {
	"Article":"journalArticle",
	"Audiovisual":"film",
	"Book":"book",
	"Thesis":"thesis",
	"Working Paper":"report",
	"Technical Report":"report"
}

function doWeb(doc,url)
{
	if (detectWeb(doc, url) == "multiple") {
		var hits = {};
		var urls = [];
		var results = ZU.xpath(doc,"//tr/td[contains(@headers, 't')]/a");
	
		for (var i in results) {
			hits[results[i].href] = results[i].textContent;
		}
		Z.selectItems(hits, function(items) {
			if (items == null) return true;
			for (var j in items) {
				urls.push(j);
			}
			ZU.processDocuments(urls, function (myDoc) { 
				doWeb(myDoc, myDoc.location.href) }, function () {Z.done()});

			Z.wait();
		});
	} else {
		// We call the Embedded Metadata translator to do the actual work
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
		translator.setHandler("itemDone", function(obj, item) {
			 var type = ZU.xpathText(doc, '//meta[@name="DC.type"]/@content');
			 if(itemTypes[type]!=null) item.itemType = itemTypes[type];
			 item.abstractNote=item.extra;
			 item.extra = "";
			item.complete();
			});
		translator.getTranslatorObject(function (obj) {
				obj.doWeb(doc, url);
				});
	}
};/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://upcommons.upc.edu/e-prints/handle/2117/14979",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Antonio",
						"lastName": "Cruzado",
						"creatorType": "author"
					},
					{
						"firstName": "Nixon",
						"lastName": "Bahamón Rivera",
						"creatorType": "author"
					},
					{
						"firstName": "Jacopo",
						"lastName": "Aguzzi",
						"creatorType": "author"
					},
					{
						"firstName": "Raffaele",
						"lastName": "Bernardello",
						"creatorType": "author"
					},
					{
						"firstName": "Miguel Angel",
						"lastName": "Ahumada Sempoal",
						"creatorType": "author"
					},
					{
						"firstName": "Joan",
						"lastName": "Puigdefàbregas Sagristà",
						"creatorType": "author"
					},
					{
						"firstName": "Jordi",
						"lastName": "Cateura Sabrí",
						"creatorType": "author"
					},
					{
						"firstName": "Eduardo",
						"lastName": "Muñoz",
						"creatorType": "author"
					},
					{
						"firstName": "Zoila",
						"lastName": "Velasquez Forero",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Àrees temàtiques de la UPC::Enginyeria civil::Geologia::Oceanografia",
					"Àrees temàtiques de la UPC::Enginyeria agroalimentària::Ciències de la terra i de la vida::Climatologia i meteorologia",
					"Àrees temàtiques de la UPC::Enginyeria electrònica i telecomunicacions::Instrumentació i mesura::Sensors i actuadors",
					"Sensors",
					"Climatology",
					"Pelagic observatory",
					"Oceanographic buoy",
					"Multisensor coordinated monitoring",
					"PAR",
					"Operational oceanography",
					"Submarine canyons",
					"Numerical multiparametric modelling",
					"Ocean forecast",
					"Western Mediterranean Sea",
					"Oceanografia -- Mesurament",
					"Climatologia -- Mesurament",
					"Catalunya -- Oceanografia"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"itemID": "http://upcommons.upc.edu/e-prints/handle/2117/14979",
				"title": "The new pelagic operational observatory of the catalan sea (OOCS) for the multisensor coordinated measurement of atmospheric and oceanographic conditions",
				"rights": "Open Access",
				"date": "2011-12",
				"DOI": "10.3390/s111211251",
				"abstractNote": "Postprint (published version)",
				"reportType": "Article",
				"letterType": "Article",
				"manuscriptType": "Article",
				"mapType": "Article",
				"thesisType": "Article",
				"websiteType": "Article",
				"presentationType": "Article",
				"postType": "Article",
				"audioFileType": "Article",
				"accepted": "2012-02-06T15:06:01Z",
				"language": "en",
				"ISSN": "1424-8220",
				"url": "http://upcommons.upc.edu/e-prints/handle/2117/14979",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "upcommons.upc.edu"
			}
		]
	},
	{
		"type": "web",
		"url": "http://upcommons.upc.edu/e-prints/handle/2117/5301",
		"items": "multiple"
	}
]
/** END TEST CASES **/