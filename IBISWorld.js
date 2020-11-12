{
	"translatorID": "b16d76b4-ce4d-4774-b29c-b6aea71d417b",
	"label": "IBISWorld",
	"creator": "Sebastian Karcher",
	"target": "^https?://clients\\d\\.ibisworld\\.com/(reports|search)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gc",
	"lastUpdated": "2014-03-12 04:43:57"
}

/* FW LINE 59:b820c6d */ function flatten(t){var e=new Array;for(var i in t){var r=t[i];r instanceof Array?e=e.concat(flatten(r)):e.push(r)}return e}var FW={_scrapers:new Array};FW._Base=function(){this.callHook=function(t,e,i,r){if("object"==typeof this.hooks){var n=this.hooks[t];"function"==typeof n&&n(e,i,r)}},this.evaluateThing=function(t,e,i){var r=typeof t;if("object"===r){if(t instanceof Array){var n=this.evaluateThing,a=t.map(function(t){return n(t,e,i)});return flatten(a)}return t.evaluate(e,i)}return"function"===r?t(e,i):t},this.makeItems=function(t,e,i,r,n){n()}},FW.Scraper=function(t){FW._scrapers.push(new FW._Scraper(t))},FW._Scraper=function(t){for(x in t)this[x]=t[x];this._singleFieldNames=["abstractNote","applicationNumber","archive","archiveLocation","artworkMedium","artworkSize","assignee","audioFileType","audioRecordingType","billNumber","blogTitle","bookTitle","callNumber","caseName","code","codeNumber","codePages","codeVolume","committee","company","conferenceName","country","court","date","dateDecided","dateEnacted","dictionaryTitle","distributor","docketNumber","documentNumber","DOI","edition","encyclopediaTitle","episodeNumber","extra","filingDate","firstPage","forumTitle","genre","history","institution","interviewMedium","ISBN","ISSN","issue","issueDate","issuingAuthority","journalAbbreviation","label","language","legalStatus","legislativeBody","letterType","libraryCatalog","manuscriptType","mapType","medium","meetingName","nameOfAct","network","number","numberOfVolumes","numPages","pages","patentNumber","place","postType","presentationType","priorityNumbers","proceedingsTitle","programTitle","programmingLanguage","publicLawNumber","publicationTitle","publisher","references","reportNumber","reportType","reporter","reporterVolume","rights","runningTime","scale","section","series","seriesNumber","seriesText","seriesTitle","session","shortTitle","studio","subject","system","thesisType","title","type","university","url","version","videoRecordingType","volume","websiteTitle","websiteType"],this._makeAttachments=function(t,e,i,r){if(i instanceof Array)i.forEach(function(i){this._makeAttachments(t,e,i,r)},this);else if("object"==typeof i){var n=i.urls||i.url,a=i.types||i.type,s=i.titles||i.title,o=i.snapshots||i.snapshot,u=this.evaluateThing(n,t,e),l=this.evaluateThing(s,t,e),c=this.evaluateThing(a,t,e),h=this.evaluateThing(o,t,e);u instanceof Array||(u=[u]);for(var f in u){var p,m,v,d=u[f];p=c instanceof Array?c[f]:c,m=l instanceof Array?l[f]:l,v=h instanceof Array?h[f]:h,r.attachments.push({url:d,title:m,mimeType:p,snapshot:v})}}},this.makeItems=function(t,e,i,r,n){var a=new Zotero.Item(this.itemType);a.url=e;for(var s in this._singleFieldNames){var o=this._singleFieldNames[s];if(this[o]){var u=this.evaluateThing(this[o],t,e);u instanceof Array?a[o]=u[0]:a[o]=u}}var l=["creators","tags"];for(var c in l){var h=l[c],f=this.evaluateThing(this[h],t,e);if(f)for(var p in f)a[h].push(f[p])}this._makeAttachments(t,e,this.attachments,a),r(a,this,t,e),n()}},FW._Scraper.prototype=new FW._Base,FW.MultiScraper=function(t){FW._scrapers.push(new FW._MultiScraper(t))},FW._MultiScraper=function(t){for(x in t)this[x]=t[x];this._mkSelectItems=function(t,e){var i=new Object;for(var r in t)i[e[r]]=t[r];return i},this._selectItems=function(t,e,i){var r=new Array;Zotero.selectItems(this._mkSelectItems(t,e),function(t){for(var e in t)r.push(e);i(r)})},this._mkAttachments=function(t,e,i){var r=this.evaluateThing(this.attachments,t,e),n=new Object;if(r)for(var a in i)n[i[a]]=r[a];return n},this._makeChoices=function(t,e,i,r,n){if(t instanceof Array)t.forEach(function(t){this._makeTitlesUrls(t,e,i,r,n)},this);else if("object"==typeof t){var a=t.urls||t.url,s=t.titles||t.title,o=this.evaluateThing(a,e,i),u=this.evaluateThing(s,e,i),l=u instanceof Array;o instanceof Array||(o=[o]);for(var c in o){var h,f=o[c];h=l?u[c]:u,n.push(f),r.push(h)}}},this.makeItems=function(t,e,i,r,n){if(this.beforeFilter){var a=this.beforeFilter(t,e);if(a!=e)return void this.makeItems(t,a,i,r,n)}var s=[],o=[];this._makeChoices(this.choices,t,e,s,o);var u=this._mkAttachments(t,e,o),l=this.itemTrans;this._selectItems(s,o,function(t){if(t){var e=function(t){var e=t.documentURI,i=l;void 0===i&&(i=FW.getScraper(t,e)),void 0===i||i.makeItems(t,e,u[e],r,function(){})};Zotero.Utilities.processDocuments(t,e,n)}else n()})}},FW._MultiScraper.prototype=new FW._Base,FW.WebDelegateTranslator=function(t){return new FW._WebDelegateTranslator(t)},FW._WebDelegateTranslator=function(t){for(x in t)this[x]=t[x];this.makeItems=function(t,e,i,r,n){var a=this,s=Zotero.loadTranslator("web");s.setHandler("itemDone",function(i,n){r(n,a,t,e)}),s.setDocument(t),this.translatorId?(s.setTranslator(this.translatorId),s.translate()):(s.setHandler("translators",function(t,e){e.length&&(s.setTranslator(e[0]),s.translate())}),s.getTranslators()),n()}},FW._WebDelegateTranslator.prototype=new FW._Base,FW._StringMagic=function(){this._filters=new Array,this.addFilter=function(t){return this._filters.push(t),this},this.split=function(t){return this.addFilter(function(e){return e.split(t).filter(function(t){return""!=t})})},this.replace=function(t,e,i){return this.addFilter(function(r){return r.match(t)?r.replace(t,e,i):r})},this.prepend=function(t){return this.replace(/^/,t)},this.append=function(t){return this.replace(/$/,t)},this.remove=function(t,e){return this.replace(t,"",e)},this.trim=function(){return this.addFilter(function(t){return Zotero.Utilities.trim(t)})},this.trimInternal=function(){return this.addFilter(function(t){return Zotero.Utilities.trimInternal(t)})},this.match=function(t,e){return e||(e=0),this.addFilter(function(i){var r=i.match(t);return void 0===r||null===r?void 0:r[e]})},this.cleanAuthor=function(t,e){return this.addFilter(function(i){return Zotero.Utilities.cleanAuthor(i,t,e)})},this.key=function(t){return this.addFilter(function(e){return e[t]})},this.capitalizeTitle=function(){return this.addFilter(function(t){return Zotero.Utilities.capitalizeTitle(t)})},this.unescapeHTML=function(){return this.addFilter(function(t){return Zotero.Utilities.unescapeHTML(t)})},this.unescape=function(){return this.addFilter(function(t){return unescape(t)})},this._applyFilters=function(t,e){for(i in this._filters){t=flatten(t),t=t.filter(function(t){return void 0!==t&&null!==t});for(var r=0;r<t.length;r++)try{if(void 0===t[r]||null===t[r])continue;t[r]=this._filters[i](t[r],e)}catch(n){t[r]=void 0,Zotero.debug("Caught exception "+n+"on filter: "+this._filters[i])}t=t.filter(function(t){return void 0!==t&&null!==t})}return flatten(t)}},FW.PageText=function(){return new FW._PageText},FW._PageText=function(){this._filters=new Array,this.evaluate=function(t){var e=[t.documentElement.innerHTML];return e=this._applyFilters(e,t),0==e.length?!1:e}},FW._PageText.prototype=new FW._StringMagic,FW.Url=function(){return new FW._Url},FW._Url=function(){this._filters=new Array,this.evaluate=function(t,e){var i=[e];return i=this._applyFilters(i,t),0==i.length?!1:i}},FW._Url.prototype=new FW._StringMagic,FW.Xpath=function(t){return new FW._Xpath(t)},FW._Xpath=function(t){this._xpath=t,this._filters=new Array,this.text=function(){var t=function(t){return"object"==typeof t&&t.textContent?t.textContent:t};return this.addFilter(t),this},this.sub=function(t){var e=function(e,i){var r=i.evaluate(t,e,null,XPathResult.ANY_TYPE,null);return r?r.iterateNext():void 0};return this.addFilter(e),this},this.evaluate=function(t){var e=t.evaluate(this._xpath,t,null,XPathResult.ANY_TYPE,null),i=e.resultType,r=new Array;if(i==XPathResult.STRING_TYPE)r.push(e.stringValue);else if(i==XPathResult.BOOLEAN_TYPE)r.push(e.booleanValue);else if(i==XPathResult.NUMBER_TYPE)r.push(e.numberValue);else if(i==XPathResult.ORDERED_NODE_ITERATOR_TYPE||i==XPathResult.UNORDERED_NODE_ITERATOR_TYPE)for(var n;n=e.iterateNext();)r.push(n);return r=this._applyFilters(r,t),0==r.length?!1:r}},FW._Xpath.prototype=new FW._StringMagic,FW.detectWeb=function(t,e){for(var i in FW._scrapers){var r=FW._scrapers[i],n=r.evaluateThing(r.itemType,t,e),a=r.evaluateThing(r.detect,t,e);if(a.length>0&&a[0])return n}},FW.getScraper=function(t,e){var i=FW.detectWeb(t,e);return FW._scrapers.filter(function(r){return r.evaluateThing(r.itemType,t,e)==i&&r.evaluateThing(r.detect,t,e)})[0]},FW.doWeb=function(t,e){var i=FW.getScraper(t,e);i.makeItems(t,e,[],function(t,e,i,r){e.callHook("scraperDone",t,i,r),t.title||(t.title=""),t.complete()},function(){Zotero.done()}),Zotero.wait()};
/*
   IBISWorld Translator Copyright (C) 2014 Sebastian Karcher

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/



function detectWeb(doc, url) { return FW.detectWeb(doc, url); }
function doWeb(doc, url) { return FW.doWeb(doc, url); }

var dateregex = /(January|February|March|April|May|June|July|August|September|October|November|December)\s*\d{4}/

/** Articles */
FW.Scraper({
itemType         : 'report',
detect           : FW.Xpath('//div[@id="Industry_ReportInfo" or @id="iExpert_ReportInfo" or @id="RiskRating_ReportInfo"]'),
title            : FW.Xpath('//div[@id="Industry_ReportInfo" or @id="iExpert_ReportInfo" or @id="RiskRating_ReportInfo"]/div/h1').text().trim(),
attachments      : [{ url: FW.Url(),
  title:  "IBISWorld Snapshot",
  type: "text/html" }],
creators         : FW.Xpath('//div[@id="Industry_ReportInfo" or @id="iExpert_ReportInfo" or @id="RiskRating_ReportInfo"]/div/\
								span[@class="Industry_ReportInfo_pinktext" or @class="Risk_ReportInfo_date"]').text().remove(dateregex).remove(/\|/).trim().cleanAuthor("author"),
date             : FW.Xpath('//div[@id="Industry_ReportInfo" or @id="iExpert_ReportInfo" or @id="RiskRating_ReportInfo"]/div/\
								span[@class="Industry_ReportInfo_pinktext" or @class="Risk_ReportInfo_date"]').text().match(dateregex),
reportType 		 : FW.Xpath('//div[@id="Industry_ReportInfo" or @id="iExpert_ReportInfo" or @id="RiskRating_ReportInfo"]/div/h2').text().remove(/[\dA-Z\-]+$/),
reportNumber	 : FW.Xpath('//div[@id="Industry_ReportInfo" or @id="iExpert_ReportInfo" or @id="RiskRating_ReportInfo"]/div/h2').text().match(/[\dA-Z\-]+$/).trim(),
institution	 : "IBISWorld Services",
place			 : "Melbourne, Australia",
hooks : { "scraperDone": function  (item,doc, url) {
	//grab PDF
	var id = url.match(/entid=(\d+)/);
	var baseurl = url.match(/.+\/reports\//)
	if (id && baseurl){
		pdfurl = baseurl[0] + "reportdownload/default.aspx?rcid=1&rtid=1&eid=" + id[1];
		item.attachments.push({url: pdfurl, title: "IBISWorld Report PDF", mimeType: "application/pdf"})
	}
	//remove missing authors
	for (var i=item.creators.length - 1; i>= 0; i--){
		if (item.creators[i].lastName==""){
			 item.creators.splice(i, 1);
		}
	} 
}}	
});
 /**Search Results*/
FW.MultiScraper({
itemType         : 'multiple',
detect           : FW.Url().match(/\/search\//),
choices          : {
  titles :  FW.Xpath('//div[@id="Search_Sectors"]//a[contains(@href, "entid")]').text().trim(),
  urls    :  FW.Xpath('//div[@id="Search_Sectors"]//a[contains(@href, "entid")]').key("href")
}
});

 /**Browse*/
FW.MultiScraper({
itemType         : 'multiple',
detect           : FW.Url().match(/\/overview.aspx/),
choices          : {
  titles :  FW.Xpath('//div[contains(@id, "Home_Sectors")]//a[contains(@href, "entid")]').text().trim(),
  urls    :  FW.Xpath('//div[contains(@id, "Home_Sectors")]//a[contains(@href, "entid")]').key("href")
}
});/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://clients1.ibisworld.com/reports/us/industry/default.aspx?entid=932",
		"items": [
			{
				"itemType": "report",
				"creators": [
					{
						"firstName": "Britanny",
						"lastName": "Carter",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "IBISWorld Snapshot",
						"type": "text/html"
					},
					{
						"title": "IBISWorld Report PDF",
						"mimeType": "application/pdf"
					}
				],
				"url": "http://clients1.ibisworld.com/reports/us/industry/default.aspx?entid=932",
				"date": "May 2014",
				"institution": "IBISWorld Services",
				"place": "Melbourne, Australia",
				"reportNumber": "42349",
				"reportType": "IBISWorld Industry Report",
				"title": "Laboratory Supply Wholesaling in the US",
				"libraryCatalog": "IBISWorld"
			}
		]
	},
	{
		"type": "web",
		"url": "http://clients1.ibisworld.com/reports/us/riskrating/default.aspx?entid=1281",
		"items": [
			{
				"itemType": "report",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "IBISWorld Snapshot",
						"type": "text/html"
					},
					{
						"title": "IBISWorld Report PDF",
						"mimeType": "application/pdf"
					}
				],
				"url": "http://clients1.ibisworld.com/reports/us/riskrating/default.aspx?entid=1281",
				"date": "May 2014",
				"institution": "IBISWorld Services",
				"place": "Melbourne, Australia",
				"reportNumber": "51821",
				"reportType": "IBISWorld Industry Risk Rating Report",
				"title": "Data Processing & Hosting Services in the US",
				"libraryCatalog": "IBISWorld"
			}
		]
	},
	{
		"type": "web",
		"url": "http://clients1.ibisworld.com/search/default.aspx?st=labor",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://clients1.ibisworld.com/reports/us/industry/overview.aspx?entid=1456",
		"items": "multiple"
	}
]
/** END TEST CASES **/