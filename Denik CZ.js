{
	"translatorID": "4ed446ca-b480-43ee-a8fb-5f9730915edc",
	"label": "Denik CZ",
	"creator": "Jiří Sedláček - Frettie",
	"target": "^https?://[^/]*denik.cz",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gc",
	"lastUpdated": "2018-01-01 18:29:04"
}

function detectWeb(doc) {
	if (getTitle(doc)) {
		return "newspaperArticle";	
	}
	return ;
}

function getTitle(doc) {
	return ZU.xpathText(doc, '//div[contains(@class,"dv4-clanek-content")]/h1').replace(/^,/, "");
}

function doWeb(doc, url) {
	var newArticle = new Zotero.Item('newspaperArticle');
	
	newArticle.url = url;
	newArticle.title = getTitle(doc);
	
	var date = ZU.xpathText(doc, '(//div[@class="dv4-clanek-datum-box"]/span[contains(@class,"datum")])[1]');
	var actualDateStr = '';
	var actualDate = new Date(); 
	if (ZU.trimInternal(date).indexOf('dnes') != -1) {
		actualDateStr = actualDate.getUTCFullYear() + '-' + ZU.lpad(actualDate.getUTCMonth()+1, '0', 2) + '-' + ZU.lpad(actualDate.getUTCDate(), '0', 2);
	} else if (ZU.trimInternal(date).indexOf('včera') != -1) {
		actualDate.setDate(actualDate.getDate() - 1);
		actualDateStr = actualDate.getUTCFullYear() + '-' + ZU.lpad(actualDate.getUTCMonth()+1, '0', 2) + '-' + ZU.lpad(actualDate.getUTCDate(), '0', 2);			
	} else {
		var parts = ZU.trimInternal(date).split('.');
		actualDateStr = parts[2] + '-' + ZU.lpad(parts[1], '0', 2) + '-' + ZU.lpad(parts[0], '0', 2);
	}

	newArticle.date = actualDateStr;
	var teaser = ZU.xpathText(doc, '//p[@class="perex"]');
	if (teaser != null) {
		newArticle.abstractNote = Zotero.Utilities.trimInternal(teaser).replace(/^,\s*/, "");
	}

	//some authors are in /a, some aren't we need to distinguish to get this right
	if (ZU.xpathText(doc, '//p[@class = "dv4-clanek-autor"]/a') != null) {
		var xpath = '//p[@class = "dv4-clanek-autor"]/a';
		
	} else {
		var xpath = '//p[@class = "dv4-clanek-autor"]';
	}
	
	if (ZU.xpathText(doc, xpath).indexOf('Redakce') != -1) {
		newArticle.creators.push(Zotero.Utilities.cleanAuthor(ZU.xpathText(doc, xpath), "author"));
	} else {
		var authors = ZU.xpath(doc, xpath);	
		for (var i=0; i<authors.length; i++) {
			newArticle.creators.push(Zotero.Utilities.cleanAuthor(authors[i].textContent, "author"));
		}
	}
	
	var titleOfDenik = ZU.xpathText(doc, '//meta[@property = "og:site_name"]/@content');	
	newArticle.publicationTitle = titleOfDenik;
	
	newArticle.attachments.push({
		title: titleOfDenik + " Snapshot",
		document: doc
	});

	newArticle.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://trebicsky.denik.cz/zpravy_region/podivejte-se-dalsi-na-miminka-narozena-na-trebicsku-20170123.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Podívejte se další na miminka narozená na Třebíčsku",
				"creators": [
					{
						"firstName": "Autor:",
						"lastName": "Redakce",
						"creatorType": "author"
					}
				],
				"date": "2017-01-23",
				"abstractNote": "Třebíčsko - Díky vstřícnosti třebíčské porodnice Vám přinášíme fotografie nejmladších obyvatel. Každý týden naši spolupracovníci objíždí porodnice a fotí nově narozená miminka.",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "Denik CZ",
				"publicationTitle": "Třebíčský deník",
				"url": "https://trebicsky.denik.cz/zpravy_region/podivejte-se-dalsi-na-miminka-narozena-na-trebicsku-20170123.html",
				"attachments": [
					{
						"title": "Třebíčský deník Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://trebicsky.denik.cz/zpravy_region/pyrotechniku-pouzivejte-ohleduplne-a-bezpecne-doporucuji-hasici-20171231.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Pyrotechniku používejte ohleduplně a bezpečně, doporučují hasiči",
				"creators": [
					{
						"firstName": "Luděk",
						"lastName": "Mahel",
						"creatorType": "author"
					}
				],
				"date": "2017-12-31",
				"abstractNote": "Třebíčsko - Přivítání nového roku se neobejde bez petard a rachejtlí. Jak pyrotechniku správně používat? Zde jsou některá doporučení.",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "Denik CZ",
				"publicationTitle": "Třebíčský deník",
				"url": "https://trebicsky.denik.cz/zpravy_region/pyrotechniku-pouzivejte-ohleduplne-a-bezpecne-doporucuji-hasici-20171231.html",
				"attachments": [
					{
						"title": "Třebíčský deník Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.denik.cz/z_domova/silvestr-se-zachrankou-ustrelena-ruka-agrese-i-slzy-zoufalstvi-20180101.html",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Silvestr se záchrankou: Ustřelená ruka, agrese i slzy zoufalství",
				"creators": [
					{
						"firstName": "Jiří",
						"lastName": "Sejkora",
						"creatorType": "author"
					}
				],
				"date": "2018-01-01",
				"abstractNote": "/FOTOGALERIE, VIDEO/ Silvestrovská noční služba se záchranáři v Pardubicích očima redaktora Deníku. Podívejte se, čím vším si musí projít první den nového roku.",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "Denik CZ",
				"publicationTitle": "Deník.cz",
				"shortTitle": "Silvestr se záchrankou",
				"url": "https://www.denik.cz/z_domova/silvestr-se-zachrankou-ustrelena-ruka-agrese-i-slzy-zoufalstvi-20180101.html",
				"attachments": [
					{
						"title": "Deník.cz Snapshot"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/