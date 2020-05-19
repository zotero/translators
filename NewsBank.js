{
	"translatorID": "7fc76bfc-3a1a-47e7-93cc-4deed69bee5f",
	"label": "NewsBank",
	"creator": "Reuben Peterkin",
	"target": "https?://infoweb.newsbank.com/apps/news/document-view?",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-05-19 03:22:06"
}

function detectWeb(doc, url) {
	if (getRISText(doc)) return "newspaperArticle";
}

function getRISText(doc) {
	return ZU.xpathText(doc,'//textarea[@id="nbplatform-easybib-export-records"]');
}

function doWeb(doc, url) {
//	ZU.doGet(getRISLink(doc), function(text) {
		text = ZU.xpathText(doc,'//textarea[@id="nbplatform-easybib-export-records"]');
		Z.debug(text);
		var trans = Zotero.loadTranslator('import');
		// RIS
		trans.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7');
		trans.setString(text);
		trans.setHandler('itemDone', function(obj, item) {
			item.url = ZU.xpathText(doc,'//div[@class="actions-bar__urltext"]');
			
			

			item.complete();
		});
		trans.translate();
//	});
}
