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
	"lastUpdated": "2020-06-09 02:25:59"
}

function detectWeb(doc, _url) {
	if (getRISText(doc)) return "newspaperArticle";////getRISItem(doc).itemType;
	return false;
}

function getRISText(doc) {
	return ZU.xpathText(doc, '//textarea[@id="nbplatform-easybib-export-records"]');
}

/*
function getRISItem(doc) {
	var text = getRISText(doc);
	var trans = Zotero.loadTranslator('import');
	// RIS
	trans.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7');
	trans.setString(text);
	trans.setHandler('itemDone', function(obj, item) {
		return item;
	});
	trans.translate();
}
*/

function doWeb(doc, _url) {
	//ZU.doGet(getRISLink(doc), function(text) {
	var text = getRISText(doc);
	//Z.debug(text);
	var trans = Zotero.loadTranslator('import');
	// RIS
	trans.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7');
	trans.setString(text);
	trans.setHandler('itemDone', function (obj, item) {
		item.url = ZU.xpathText(doc, '//div[@class="actions-bar__urltext"]');
		//Z.debug
		//console.log(ZU.xpath(doc,'//script[contains(.,"nbcore_pdf"))]'));
		var jsontext = (ZU.xpathText(doc ,'//script[contains(.,"nbcore_pdf")]'));//'//script[41]'));
		jsontext = jsontext.replace("<!--//--><![CDATA[//><!--", "");
		jsontext = jsontext.replace("jQuery.extend(Drupal.settings,", "");
		jsontext = jsontext.replace(new RegExp('\\);$', 'm'), "");
		jsontext = jsontext.replace("//--><!]]>", " ");
		//Z.debug(jsontext);
		var pdfJSON = JSON.parse(jsontext);
		//Z.debug(pdfJSON);
		var notebody = pdfJSON.nbcore_pdf['nbcore-pdf-ascii-bar'].template_params.body;
		item.notes.push({ note: ZU.trim(notebody) });
		//item.attachments.push()
		item.complete();
	});
	trans.translate();
//	});
}
