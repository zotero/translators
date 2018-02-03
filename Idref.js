{
	"translatorID": "271ee1a5-da86-465b-b3a5-eafe7bd3c156",
	"label": "Idref",
	"creator": "Sylvain Machefert",
	"target": "^https?://www\\.idref\\.fr/.*",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2018-02-03 09:39:41"
}

function detectWeb(doc, url) { 
	if (ZU.xpathText(doc, '//div[@class="detail_bloc_biblio"]')) {
		return "multiple";
	}
	
}

function doWeb(doc, url)
{
	if (detectWeb(doc, url) == "multiple") {
		var resultsTitle = ZU.xpath(doc, '//div[@id="perenne-references-docs"]/span[contains(@class, "detail_value")]');
		var resultsHref = ZU.xpath(doc, '//div[@id="perenne-references-docs"]/span[contains(@class, "detail_label")]/a/@href');
		
		items = {};
		for (var i in resultsTitle) {
			href = resultsHref[i].textContent;
			// We need to replace the http://www.sudoc.fr/XXXXXX links are they are redirects and aren't handled correctly from subtranslator
			href = href.replace(/http:\/\/www\.sudoc\.fr\/(.*)$/, "http://www.sudoc.abes.fr/xslt/DB=2.1//SRCH?IKT=12&TRM=$1");
			items[href] = resultsTitle[i].textContent;
			
		}
		
		Zotero.selectItems(items, function (selectedItems) {
			if (!selectedItems) {
				return true;
			}
			var articles = [];
			for (var i in selectedItems) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});

	}	
}

function scrape(doc, url) {
	Z.debug("scraping : " + url);
	var translator = Zotero.loadTranslator('web');	
	
	if (url.indexOf("archives-ouvertes")!=-1){
		// HAL Archives ouvertes
		Z.debug("HAL");
		translator.setTranslator('58ab2618-4a25-4b9b-83a7-80cd0259f896');
	} else if (url.indexOf("sudoc.abes.fr") != -1) {
		Z.debug("Sudoc");
		translator.setTranslator('1b9ed730-69c7-40b0-8a06-517a89a3a278');
	} else {
		Z.debug("Undefined website");
		return false;
	}

	translator.setHandler('itemDone', function (obj, item) {
		item.complete();
	});
	
	translator.getTranslatorObject(function(trans) {
		trans.doWeb(doc, url);
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.idref.fr/199676100",
		"items": "multiple"
	}
]
/** END TEST CASES **/
