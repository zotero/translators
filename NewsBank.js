{
	"translatorID": "7fc76bfc-3a1a-47e7-93cc-4deed69bee5f",
	"label": "NewsBank",
	"creator": "Reuben Peterkin",
	"target": "https?://infoweb.newsbank.com/apps/news/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-06 07:05:28"
}

function detectWeb(doc, url) {
	if (getRISText(doc)) return "newspaperArticle";
	if (url.indexOf("results") != -1) return "multiple";
//	Zotero.debug(url.indexOf("results"));
	return false;
}

function getSearchResults(doc) {
	var items = {}, found = false;
	var rows = doc.getElementById('search-hits-gnus-search-hits-pane');
	if (!rows) return false;
	rows = rows.getElementsByTagName('article');
//	Zotero.debug(rows);

	for (var i=0; i<rows.length; i++) {
//		var count = rows[i].getElementsByClassName('count')[0];
//		if (!count) count = "";
//		else count = count.textContent.replace(/^\s*(\d+)[\s\S]*/, '$1') + '. ';

		//var title = doc.querySelector('.search-hits__hit__title');
		var title = rows[i].getElementsByClassName('search-hits__hit__title')[0];
		var hdl = rows[i].getElementsByTagName('a')[0];
		var prefix = hdl.getElementsByClassName('element-invisible')[0];
		if (!hdl) continue;

		found = true;

		items[hdl.href] = ZU.trimInternal(title.textContent.replace(prefix.textContent,''));

	}
//	Zotero.debug(items);

	return found ? items : false;
}

function getRISText(doc) {
	return ZU.xpathText(doc, '//textarea[@id="nbplatform-easybib-export-records"]');
}

function getItem(doc) {
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
}

function doWeb(doc, url) {

	if (detectWeb(doc, url) == "multiple") {
	var items=getSearchResults(doc);
//	Zotero.debug(items);

	Zotero.selectItems(items, function(items) {
		if(!items) return true;
		var ids = [];

		for (var i in items) {
			ids.push(i);
		}
		Zotero.debug(ids);
		ZU.processDocuments(ids,getItem);
	});
	}
	else
	{
		getItem(doc);
	}
}
