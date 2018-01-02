{
	"translatorID": "e1356ac2-8254-44d5-8ece-4829827d5bc6",
	"label": "Lagen.nu",
	"creator": "Isak Bergdahl",
	"target": "^https?://lagen\\.nu/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-11-03 20:33:09"
}

/* FW LINE 59:b820c6d */ function flatten(t){var e=new Array;for(var i in t){var r=t[i];r instanceof Array?e=e.concat(flatten(r)):e.push(r)}return e}var FW={_scrapers:new Array};FW._Base=function(){this.callHook=function(t,e,i,r){if("object"==typeof this.hooks){var n=this.hooks[t];"function"==typeof n&&n(e,i,r)}},this.evaluateThing=function(t,e,i){var r=typeof t;if("object"===r){if(t instanceof Array){var n=this.evaluateThing,a=t.map(function(t){return n(t,e,i)});return flatten(a)}return t.evaluate(e,i)}return"function"===r?t(e,i):t},this.makeItems=function(t,e,i,r,n){n()}},FW.Scraper=function(t){FW._scrapers.push(new FW._Scraper(t))},FW._Scraper=function(t){for(x in t)this[x]=t[x];this._singleFieldNames=["abstractNote","applicationNumber","archive","archiveLocation","artworkMedium","artworkSize","assignee","audioFileType","audioRecordingType","billNumber","blogTitle","bookTitle","callNumber","caseName","code","codeNumber","codePages","codeVolume","committee","company","conferenceName","country","court","date","dateDecided","dateEnacted","dictionaryTitle","distributor","docketNumber","documentNumber","DOI","edition","encyclopediaTitle","episodeNumber","extra","filingDate","firstPage","forumTitle","genre","history","institution","interviewMedium","ISBN","ISSN","issue","issueDate","issuingAuthority","journalAbbreviation","label","language","legalStatus","legislativeBody","letterType","libraryCatalog","manuscriptType","mapType","medium","meetingName","nameOfAct","network","number","numberOfVolumes","numPages","pages","patentNumber","place","postType","presentationType","priorityNumbers","proceedingsTitle","programTitle","programmingLanguage","publicLawNumber","publicationTitle","publisher","references","reportNumber","reportType","reporter","reporterVolume","rights","runningTime","scale","section","series","seriesNumber","seriesText","seriesTitle","session","shortTitle","studio","subject","system","thesisType","title","type","university","url","version","videoRecordingType","volume","websiteTitle","websiteType"],this._makeAttachments=function(t,e,i,r){if(i instanceof Array)i.forEach(function(i){this._makeAttachments(t,e,i,r)},this);else if("object"==typeof i){var n=i.urls||i.url,a=i.types||i.type,s=i.titles||i.title,o=i.snapshots||i.snapshot,u=this.evaluateThing(n,t,e),l=this.evaluateThing(s,t,e),c=this.evaluateThing(a,t,e),h=this.evaluateThing(o,t,e);u instanceof Array||(u=[u]);for(var f in u){var p,m,v,d=u[f];p=c instanceof Array?c[f]:c,m=l instanceof Array?l[f]:l,v=h instanceof Array?h[f]:h,r.attachments.push({url:d,title:m,mimeType:p,snapshot:v})}}},this.makeItems=function(t,e,i,r,n){var a=new Zotero.Item(this.itemType);a.url=e;for(var s in this._singleFieldNames){var o=this._singleFieldNames[s];if(this[o]){var u=this.evaluateThing(this[o],t,e);u instanceof Array?a[o]=u[0]:a[o]=u}}var l=["creators","tags"];for(var c in l){var h=l[c],f=this.evaluateThing(this[h],t,e);if(f)for(var p in f)a[h].push(f[p])}this._makeAttachments(t,e,this.attachments,a),r(a,this,t,e),n()}},FW._Scraper.prototype=new FW._Base,FW.MultiScraper=function(t){FW._scrapers.push(new FW._MultiScraper(t))},FW._MultiScraper=function(t){for(x in t)this[x]=t[x];this._mkSelectItems=function(t,e){var i=new Object;for(var r in t)i[e[r]]=t[r];return i},this._selectItems=function(t,e,i){var r=new Array;Zotero.selectItems(this._mkSelectItems(t,e),function(t){for(var e in t)r.push(e);i(r)})},this._mkAttachments=function(t,e,i){var r=this.evaluateThing(this.attachments,t,e),n=new Object;if(r)for(var a in i)n[i[a]]=r[a];return n},this._makeChoices=function(t,e,i,r,n){if(t instanceof Array)t.forEach(function(t){this._makeTitlesUrls(t,e,i,r,n)},this);else if("object"==typeof t){var a=t.urls||t.url,s=t.titles||t.title,o=this.evaluateThing(a,e,i),u=this.evaluateThing(s,e,i),l=u instanceof Array;o instanceof Array||(o=[o]);for(var c in o){var h,f=o[c];h=l?u[c]:u,n.push(f),r.push(h)}}},this.makeItems=function(t,e,i,r,n){if(this.beforeFilter){var a=this.beforeFilter(t,e);if(a!=e)return void this.makeItems(t,a,i,r,n)}var s=[],o=[];this._makeChoices(this.choices,t,e,s,o);var u=this._mkAttachments(t,e,o),l=this.itemTrans;this._selectItems(s,o,function(t){if(t){var e=function(t){var e=t.documentURI,i=l;void 0===i&&(i=FW.getScraper(t,e)),void 0===i||i.makeItems(t,e,u[e],r,function(){})};Zotero.Utilities.processDocuments(t,e,n)}else n()})}},FW._MultiScraper.prototype=new FW._Base,FW.WebDelegateTranslator=function(t){return new FW._WebDelegateTranslator(t)},FW._WebDelegateTranslator=function(t){for(x in t)this[x]=t[x];this.makeItems=function(t,e,i,r,n){var a=this,s=Zotero.loadTranslator("web");s.setHandler("itemDone",function(i,n){r(n,a,t,e)}),s.setDocument(t),this.translatorId?(s.setTranslator(this.translatorId),s.translate()):(s.setHandler("translators",function(t,e){e.length&&(s.setTranslator(e[0]),s.translate())}),s.getTranslators()),n()}},FW._WebDelegateTranslator.prototype=new FW._Base,FW._StringMagic=function(){this._filters=new Array,this.addFilter=function(t){return this._filters.push(t),this},this.split=function(t){return this.addFilter(function(e){return e.split(t).filter(function(t){return""!=t})})},this.replace=function(t,e,i){return this.addFilter(function(r){return r.match(t)?r.replace(t,e,i):r})},this.prepend=function(t){return this.replace(/^/,t)},this.append=function(t){return this.replace(/$/,t)},this.remove=function(t,e){return this.replace(t,"",e)},this.trim=function(){return this.addFilter(function(t){return Zotero.Utilities.trim(t)})},this.trimInternal=function(){return this.addFilter(function(t){return Zotero.Utilities.trimInternal(t)})},this.match=function(t,e){return e||(e=0),this.addFilter(function(i){var r=i.match(t);return void 0===r||null===r?void 0:r[e]})},this.cleanAuthor=function(t,e){return this.addFilter(function(i){return Zotero.Utilities.cleanAuthor(i,t,e)})},this.key=function(t){return this.addFilter(function(e){return e[t]})},this.capitalizeTitle=function(){return this.addFilter(function(t){return Zotero.Utilities.capitalizeTitle(t)})},this.unescapeHTML=function(){return this.addFilter(function(t){return Zotero.Utilities.unescapeHTML(t)})},this.unescape=function(){return this.addFilter(function(t){return unescape(t)})},this._applyFilters=function(t,e){for(i in this._filters){t=flatten(t),t=t.filter(function(t){return void 0!==t&&null!==t});for(var r=0;r<t.length;r++)try{if(void 0===t[r]||null===t[r])continue;t[r]=this._filters[i](t[r],e)}catch(n){t[r]=void 0,Zotero.debug("Caught exception "+n+"on filter: "+this._filters[i])}t=t.filter(function(t){return void 0!==t&&null!==t})}return flatten(t)}},FW.PageText=function(){return new FW._PageText},FW._PageText=function(){this._filters=new Array,this.evaluate=function(t){var e=[t.documentElement.innerHTML];return e=this._applyFilters(e,t),0==e.length?!1:e}},FW._PageText.prototype=new FW._StringMagic,FW.Url=function(){return new FW._Url},FW._Url=function(){this._filters=new Array,this.evaluate=function(t,e){var i=[e];return i=this._applyFilters(i,t),0==i.length?!1:i}},FW._Url.prototype=new FW._StringMagic,FW.Xpath=function(t){return new FW._Xpath(t)},FW._Xpath=function(t){this._xpath=t,this._filters=new Array,this.text=function(){var t=function(t){return"object"==typeof t&&t.textContent?t.textContent:t};return this.addFilter(t),this},this.sub=function(t){var e=function(e,i){var r=i.evaluate(t,e,null,XPathResult.ANY_TYPE,null);return r?r.iterateNext():void 0};return this.addFilter(e),this},this.evaluate=function(t){var e=t.evaluate(this._xpath,t,null,XPathResult.ANY_TYPE,null),i=e.resultType,r=new Array;if(i==XPathResult.STRING_TYPE)r.push(e.stringValue);else if(i==XPathResult.BOOLEAN_TYPE)r.push(e.booleanValue);else if(i==XPathResult.NUMBER_TYPE)r.push(e.numberValue);else if(i==XPathResult.ORDERED_NODE_ITERATOR_TYPE||i==XPathResult.UNORDERED_NODE_ITERATOR_TYPE)for(var n;n=e.iterateNext();)r.push(n);return r=this._applyFilters(r,t),0==r.length?!1:r}},FW._Xpath.prototype=new FW._StringMagic,FW.detectWeb=function(t,e){for(var i in FW._scrapers){var r=FW._scrapers[i],n=r.evaluateThing(r.itemType,t,e),a=r.evaluateThing(r.detect,t,e);if(a.length>0&&a[0])return n}},FW.getScraper=function(t,e){var i=FW.detectWeb(t,e);return FW._scrapers.filter(function(r){return r.evaluateThing(r.itemType,t,e)==i&&r.evaluateThing(r.detect,t,e)})[0]},FW.doWeb=function(t,e){var i=FW.getScraper(t,e);i.makeItems(t,e,[],function(t,e,i,r){e.callHook("scraperDone",t,i,r),t.title||(t.title=""),t.complete()},function(){Zotero.done()}),Zotero.wait()};


/*
Lagen.nu Translator
Copyright (C) 2012 Isak Bergdahl

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

function detectWeb(doc, url) { return FW.detectWeb(doc, url); }
function doWeb(doc, url) { return FW.doWeb(doc, url); }

/** Court cases */
FW.MultiScraper({
itemType		: 'multiple',
detect			: FW.Url().match(/\/dom\/index\//),
choices			: {
	titles 		:  FW.Xpath('//div[@id="dokument"]/ul/*').text(),
	urls		:  FW.Xpath('//div[@id="dokument"]/ul/*/a').key("href")
}
});

FW.Scraper({
itemType		: 'case',
detect			: FW.Url().match(/\/dom\//),
language		: 'sv-SE',
url				: FW.Url(),
court			: FW.Xpath('//dd[@rel="dct:creator"]').text(),
title			: FW.Xpath('//h1[@property="dct:identifier"]').text(),
shortTitle		: FW.Xpath('//h1[@property="dct:identifier"]').text(),
dateDecided		: FW.Xpath('//dd[@property="rinfo:avgorandedatum"]').text(),
abstractNote	: FW.Xpath('//p[@class="rattsfallsrubrik"]').text(),
docketNumber	: FW.Xpath('//dd[@property="rinfo:malnummer"]').text(),
tags			: FW.Xpath('//dd[@property="dct:subject"]').text(),
attachments		: 
	[{
		url 	: FW.Url(),
		title	: FW.Xpath('//title').text().trim(),
		type	: "text/html" 
	}]
});

FW.Scraper({
itemType		: 'statute',
detect			: FW.Url().match(/\d{4}:[0-9][0-9]?[0-9]?[0-9]?(.*)$/),
language		: 'sv-SE',
url				: FW.Url(),
title			: FW.Xpath('//h1[@property="dct:title"]').text(),
shortTitle		: FW.Xpath('//h1[@property="dct:title"]').text().remove(/\([0-9][0-9][0-9][0-9]:[0-9][0-9]?[0-9]?[0-9]?\)/),
nameOfAct		: FW.Xpath('//h1[@property="dct:title"]').text(),
publicLawNumber : FW.Xpath('//h1[@property="dct:title"]').text().match(/[0-9][0-9][0-9][0-9]:[0-9][0-9]?[0-9]?[0-9]?/),
dateEnacted		: FW.Xpath('//dd[@property="rinfo:utfardandedatum"]').text(),
attachments		: 
	[{
		url 	: FW.Url(),
		title	: FW.Xpath('//title').text().trim(),
		type	: "text/html" 
	}]
});

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://lagen.nu/dom/nja/2012s179",
		"items": [
			{
				"itemType": "case",
				"caseName": "NJA 2012 s. 179",
				"creators": [],
				"dateDecided": "2012-04-04",
				"abstractNote": "När en tingsrätt har avvisat en talan därför att tingsrätten inte är rätt forum och en part har överklagat det beslutet med yrkande att hovrätten ska hänvisa målet till den tingsrätt som är behörig, ska tillstånd till målets prövning i hovrätten meddelas (ändringsdispens).",
				"court": "Högsta domstolen",
				"docketNumber": "Ö3249-11",
				"language": "sv-SE",
				"shortTitle": "NJA 2012 s. 179",
				"url": "https://lagen.nu/dom/nja/2012s179",
				"attachments": [
					{
						"title": "NJA 2012 s. 179 ( NJA 2012:20) | Lagen.nu",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"Avvisning",
					"Domstols behörighet",
					"Forum",
					"Prövningstillstånd i hovrätt"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://lagen.nu/dom/ra/2007:19",
		"items": [
			{
				"itemType": "case",
				"caseName": "RÅ 2007 ref. 19",
				"creators": [],
				"dateDecided": "2007-04-12",
				"abstractNote": "Fråga om intäktsredovisning av återbäringsmedel från SPP när årsredovisning fastställts före (I) respektive efter (II) det att Bokföringsnämnden utfärdade allmänna råd om redovisningen. Inkomsttaxeringar 2001.",
				"court": "Regeringsrätten",
				"docketNumber": "4717-04",
				"language": "sv-SE",
				"shortTitle": "RÅ 2007 ref. 19",
				"url": "https://lagen.nu/dom/ra/2007:19",
				"attachments": [
					{
						"title": "RÅ 2007 ref. 19 | Lagen.nu",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"Beskattningsår",
					"Inkomst av näringsverksamhet"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://lagen.nu/dom/ad/2000:74",
		"items": [
			{
				"itemType": "case",
				"caseName": "AD 2000 nr 74",
				"creators": [],
				"dateDecided": "2000-07-05",
				"abstractNote": "En facklig förtroendeman vid en statlig myndighet medverkar vid tillkomsten av ett brev som är ställt verkets generaldirektör och som innehåller kritik mot en tilltänkt myndighetschef. Förtroendemannens organisation gör i målet gällande att den anställde, sedan han avslutat det fackliga uppdraget och den tilltänkte chefen tillträtt som chef, med anledning av sin medverkan vid brevets tillkomst utsatts för åtgärder från arbetsgivarens sida och därvid bl.a. fråntagits arbetsuppgifter. Frågor om arbetsgivaren brutit mot 8 och 11 §§ medbestämmandelagen, 4 § förtroendemannalagen och grunderna för anställningsskyddslagen.",
				"court": "Arbetsdomstolen",
				"docketNumber": "A-155-1999",
				"language": "sv-SE",
				"shortTitle": "AD 2000 nr 74",
				"url": "https://lagen.nu/dom/ad/2000:74",
				"attachments": [
					{
						"title": "AD 2000 nr 74 | Lagen.nu",
						"mimeType": "text/html"
					}
				],
				"tags": [
					"Anställningsskydd",
					"Facklig förtroendeman",
					"Föreningsrättskränkning",
					"Medbestämmande"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://lagen.nu/1968:64",
		"items": [
			{
				"itemType": "statute",
				"nameOfAct": "Narkotikastrafflag (1968:64)",
				"creators": [],
				"dateEnacted": "1968-03-08",
				"language": "sv-SE",
				"publicLawNumber": "1968:64",
				"shortTitle": "Narkotikastrafflag",
				"url": "https://lagen.nu/1968:64",
				"attachments": [
					{
						"title": "Narkotikastrafflag (1968:64)\n      (NSL)\n     | Lagen.nu",
						"mimeType": "text/html"
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
		"url": "https://lagen.nu/dom/index/nja-2012.html",
		"items": "multiple"
	}
]
/** END TEST CASES **/