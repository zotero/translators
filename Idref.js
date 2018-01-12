{
	"translatorID": "271ee1a5-da86-465b-b3a5-eafe7bd3c156",
	"label": "Idref",
	"creator": "Sylvain Machefert",
	"target": "^https?://www\\.idref\\.fr/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2018-01-12 10:00:51"
}

function detectWeb(doc, url) { 
	if (ZU.xpathText(doc, '//div[@class="detail_bloc_biblio"]')) {
		return "multiple";
	}
	
}

function doWeb(doc, url)
{
	if (detectWeb(doc, url) == "multiple") {
		var hits = {};
		var urls = [];
		var title;
		var link;
		var resultsTitle = ZU.xpath(doc, '//div[@id="perenne-references-docs"]/span[contains(@class, "detail_value")]');
		var resultsHref = ZU.xpath(doc, '//div[@id="perenne-references-docs"]/span[contains(@class, "detail_label")]/a/@href');
		
		itemsList = [];
		for (var i in resultsTitle) {
			itemsList[resultsHref[i].textContent] = resultsTitle[i].textContent;
		}
		
		Zotero.selectItems(itemsList, function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
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
	} else if (url.indexOf("sudoc.fr") != -1) {
		Z.debug("Sudoc");
		translator.setTranslator('1b9ed730-69c7-40b0-8a06-517a89a3a278');
	} else {
		Z.debug("Undefined website");
	}
	
	translator.setHandler('itemDone', function (obj, item) {
		Z.debug(item);
		//item.complete();
	});
	
	translator.getTranslatorObject(function(trans) {
		trans.doWeb(doc, url);
	});
}
