{
	"translatorID": "c5b2b25d-5a0f-4e90-b8e7-4be4931a64f5",
	"label": "Denik",
	"creator": "Jiří Sedláček - Frettie",
	"target": "^https?://[^/]*denik.cz",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gc",
	"lastUpdated": "2018-01-01 17:22:10"
}

/* FW LINE 59:b820c6d */ function flatten(t){var e=new Array;for(var i in t){var r=t[i];r instanceof Array?e=e.concat(flatten(r)):e.push(r)}return e}var FW={_scrapers:new Array};FW._Base=function(){this.callHook=function(t,e,i,r){if("object"==typeof this.hooks){var n=this.hooks[t];"function"==typeof n&&n(e,i,r)}},this.evaluateThing=function(t,e,i){var r=typeof t;if("object"===r){if(t instanceof Array){var n=this.evaluateThing,a=t.map(function(t){return n(t,e,i)});return flatten(a)}return t.evaluate(e,i)}return"function"===r?t(e,i):t},this.makeItems=function(t,e,i,r,n){n()}},FW.Scraper=function(t){FW._scrapers.push(new FW._Scraper(t))},FW._Scraper=function(t){for(x in t)this[x]=t[x];this._singleFieldNames=["abstractNote","applicationNumber","archive","archiveLocation","artworkMedium","artworkSize","assignee","audioFileType","audioRecordingType","billNumber","blogTitle","bookTitle","callNumber","caseName","code","codeNumber","codePages","codeVolume","committee","company","conferenceName","country","court","date","dateDecided","dateEnacted","dictionaryTitle","distributor","docketNumber","documentNumber","DOI","edition","encyclopediaTitle","episodeNumber","extra","filingDate","firstPage","forumTitle","genre","history","institution","interviewMedium","ISBN","ISSN","issue","issueDate","issuingAuthority","journalAbbreviation","label","language","legalStatus","legislativeBody","letterType","libraryCatalog","manuscriptType","mapType","medium","meetingName","nameOfAct","network","number","numberOfVolumes","numPages","pages","patentNumber","place","postType","presentationType","priorityNumbers","proceedingsTitle","programTitle","programmingLanguage","publicLawNumber","publicationTitle","publisher","references","reportNumber","reportType","reporter","reporterVolume","rights","runningTime","scale","section","series","seriesNumber","seriesText","seriesTitle","session","shortTitle","studio","subject","system","thesisType","title","type","university","url","version","videoRecordingType","volume","websiteTitle","websiteType"],this._makeAttachments=function(t,e,i,r){if(i instanceof Array)i.forEach(function(i){this._makeAttachments(t,e,i,r)},this);else if("object"==typeof i){var n=i.urls||i.url,a=i.types||i.type,s=i.titles||i.title,o=i.snapshots||i.snapshot,u=this.evaluateThing(n,t,e),l=this.evaluateThing(s,t,e),c=this.evaluateThing(a,t,e),h=this.evaluateThing(o,t,e);u instanceof Array||(u=[u]);for(var f in u){var p,m,v,d=u[f];p=c instanceof Array?c[f]:c,m=l instanceof Array?l[f]:l,v=h instanceof Array?h[f]:h,r.attachments.push({url:d,title:m,mimeType:p,snapshot:v})}}},this.makeItems=function(t,e,i,r,n){var a=new Zotero.Item(this.itemType);a.url=e;for(var s in this._singleFieldNames){var o=this._singleFieldNames[s];if(this[o]){var u=this.evaluateThing(this[o],t,e);u instanceof Array?a[o]=u[0]:a[o]=u}}var l=["creators","tags"];for(var c in l){var h=l[c],f=this.evaluateThing(this[h],t,e);if(f)for(var p in f)a[h].push(f[p])}this._makeAttachments(t,e,this.attachments,a),r(a,this,t,e),n()}},FW._Scraper.prototype=new FW._Base,FW.MultiScraper=function(t){FW._scrapers.push(new FW._MultiScraper(t))},FW._MultiScraper=function(t){for(x in t)this[x]=t[x];this._mkSelectItems=function(t,e){var i=new Object;for(var r in t)i[e[r]]=t[r];return i},this._selectItems=function(t,e,i){var r=new Array;Zotero.selectItems(this._mkSelectItems(t,e),function(t){for(var e in t)r.push(e);i(r)})},this._mkAttachments=function(t,e,i){var r=this.evaluateThing(this.attachments,t,e),n=new Object;if(r)for(var a in i)n[i[a]]=r[a];return n},this._makeChoices=function(t,e,i,r,n){if(t instanceof Array)t.forEach(function(t){this._makeTitlesUrls(t,e,i,r,n)},this);else if("object"==typeof t){var a=t.urls||t.url,s=t.titles||t.title,o=this.evaluateThing(a,e,i),u=this.evaluateThing(s,e,i),l=u instanceof Array;o instanceof Array||(o=[o]);for(var c in o){var h,f=o[c];h=l?u[c]:u,n.push(f),r.push(h)}}},this.makeItems=function(t,e,i,r,n){if(this.beforeFilter){var a=this.beforeFilter(t,e);if(a!=e)return void this.makeItems(t,a,i,r,n)}var s=[],o=[];this._makeChoices(this.choices,t,e,s,o);var u=this._mkAttachments(t,e,o),l=this.itemTrans;this._selectItems(s,o,function(t){if(t){var e=function(t){var e=t.documentURI,i=l;void 0===i&&(i=FW.getScraper(t,e)),void 0===i||i.makeItems(t,e,u[e],r,function(){})};Zotero.Utilities.processDocuments(t,e,n)}else n()})}},FW._MultiScraper.prototype=new FW._Base,FW.WebDelegateTranslator=function(t){return new FW._WebDelegateTranslator(t)},FW._WebDelegateTranslator=function(t){for(x in t)this[x]=t[x];this.makeItems=function(t,e,i,r,n){var a=this,s=Zotero.loadTranslator("web");s.setHandler("itemDone",function(i,n){r(n,a,t,e)}),s.setDocument(t),this.translatorId?(s.setTranslator(this.translatorId),s.translate()):(s.setHandler("translators",function(t,e){e.length&&(s.setTranslator(e[0]),s.translate())}),s.getTranslators()),n()}},FW._WebDelegateTranslator.prototype=new FW._Base,FW._StringMagic=function(){this._filters=new Array,this.addFilter=function(t){return this._filters.push(t),this},this.split=function(t){return this.addFilter(function(e){return e.split(t).filter(function(t){return""!=t})})},this.replace=function(t,e,i){return this.addFilter(function(r){return r.match(t)?r.replace(t,e,i):r})},this.prepend=function(t){return this.replace(/^/,t)},this.append=function(t){return this.replace(/$/,t)},this.remove=function(t,e){return this.replace(t,"",e)},this.trim=function(){return this.addFilter(function(t){return Zotero.Utilities.trim(t)})},this.trimInternal=function(){return this.addFilter(function(t){return Zotero.Utilities.trimInternal(t)})},this.match=function(t,e){return e||(e=0),this.addFilter(function(i){var r=i.match(t);return void 0===r||null===r?void 0:r[e]})},this.cleanAuthor=function(t,e){return this.addFilter(function(i){return Zotero.Utilities.cleanAuthor(i,t,e)})},this.key=function(t){return this.addFilter(function(e){return e[t]})},this.capitalizeTitle=function(){return this.addFilter(function(t){return Zotero.Utilities.capitalizeTitle(t)})},this.unescapeHTML=function(){return this.addFilter(function(t){return Zotero.Utilities.unescapeHTML(t)})},this.unescape=function(){return this.addFilter(function(t){return unescape(t)})},this._applyFilters=function(t,e){for(i in this._filters){t=flatten(t),t=t.filter(function(t){return void 0!==t&&null!==t});for(var r=0;r<t.length;r++)try{if(void 0===t[r]||null===t[r])continue;t[r]=this._filters[i](t[r],e)}catch(n){t[r]=void 0,Zotero.debug("Caught exception "+n+"on filter: "+this._filters[i])}t=t.filter(function(t){return void 0!==t&&null!==t})}return flatten(t)}},FW.PageText=function(){return new FW._PageText},FW._PageText=function(){this._filters=new Array,this.evaluate=function(t){var e=[t.documentElement.innerHTML];return e=this._applyFilters(e,t),0==e.length?!1:e}},FW._PageText.prototype=new FW._StringMagic,FW.Url=function(){return new FW._Url},FW._Url=function(){this._filters=new Array,this.evaluate=function(t,e){var i=[e];return i=this._applyFilters(i,t),0==i.length?!1:i}},FW._Url.prototype=new FW._StringMagic,FW.Xpath=function(t){return new FW._Xpath(t)},FW._Xpath=function(t){this._xpath=t,this._filters=new Array,this.text=function(){var t=function(t){return"object"==typeof t&&t.textContent?t.textContent:t};return this.addFilter(t),this},this.sub=function(t){var e=function(e,i){var r=i.evaluate(t,e,null,XPathResult.ANY_TYPE,null);return r?r.iterateNext():void 0};return this.addFilter(e),this},this.evaluate=function(t){var e=t.evaluate(this._xpath,t,null,XPathResult.ANY_TYPE,null),i=e.resultType,r=new Array;if(i==XPathResult.STRING_TYPE)r.push(e.stringValue);else if(i==XPathResult.BOOLEAN_TYPE)r.push(e.booleanValue);else if(i==XPathResult.NUMBER_TYPE)r.push(e.numberValue);else if(i==XPathResult.ORDERED_NODE_ITERATOR_TYPE||i==XPathResult.UNORDERED_NODE_ITERATOR_TYPE)for(var n;n=e.iterateNext();)r.push(n);return r=this._applyFilters(r,t),0==r.length?!1:r}},FW._Xpath.prototype=new FW._StringMagic,FW.detectWeb=function(t,e){for(var i in FW._scrapers){var r=FW._scrapers[i],n=r.evaluateThing(r.itemType,t,e),a=r.evaluateThing(r.detect,t,e);if(a.length>0&&a[0])return n}},FW.getScraper=function(t,e){var i=FW.detectWeb(t,e);return FW._scrapers.filter(function(r){return r.evaluateThing(r.itemType,t,e)==i&&r.evaluateThing(r.detect,t,e)})[0]},FW.doWeb=function(t,e){var i=FW.getScraper(t,e);i.makeItems(t,e,[],function(t,e,i,r){e.callHook("scraperDone",t,i,r),t.title||(t.title=""),t.complete()},function(){Zotero.done()}),Zotero.wait()};
function detectWeb() {
	return "newspaperArticle";
}

function doWeb(doc, url) {
	scrape(doc, url); 
}

function scrape(doc, url) {
	var newArticle = new Zotero.Item('newspaperArticle');
	
	newArticle.url = url;
	newArticle.title = ZU.trimInternal(ZU.xpathText(doc, '//div[contains(@class,"dv4-clanek-content")]/h1')).replace(/^,/, "");
	
	var date = ZU.xpathText(doc, '(//div[@class="dv4-clanek-datum-box"]/span[contains(@class,"datum")])[1]');
	var actualDateStr = '';
	
	if (ZU.trimInternal(date).indexOf('dnes') != -1) {
		var actualDate = new Date(); 
		actualDate.setHours(actualDate.getHours() + 2);
		actualDateStr = actualDate.getUTCFullYear() + '-' +
		('00' + (actualDate.getUTCMonth()+1)).slice(-2) + '-' +
		('00' + actualDate.getUTCDate()).slice(-2);
		date = actualDateStr;
	} else if (ZU.trimInternal(date).indexOf('včera') != -1) {
		var actualDate = new Date();
		actualDate.setDate(actualDate.getDate() - 1);
		actualDateStr = actualDate.getUTCFullYear() + '-' +
		('00' + (actualDate.getUTCMonth()+1)).slice(-2) + '-' +
		('00' + actualDate.getUTCDate()).slice(-2);
		date = actualDateStr;
	} else {
		var parts = ZU.trimInternal(date).split('.');
		actualDateStr = parts[2] + '-' + ZU.lpad(parts[1], 0, 2) + '-' + ZU.lpad(parts[0], 0, 2);
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
				"libraryCatalog": "Denik",
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
				"libraryCatalog": "Denik",
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
				"libraryCatalog": "Denik",
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