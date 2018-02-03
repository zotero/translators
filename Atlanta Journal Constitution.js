{
	"translatorID": "01322929-5782-4612-81f7-d861fb46d9f2",
	"label": "Atlanta Journal Constitution",
	"creator": "Sebastian Karcher",
	"target": "^https?://(www\\.|blogs\\.)?ajc\\.com",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2013-09-16 00:28:46"
}

/* FW LINE 59:b820c6d */ function flatten(t){var e=new Array;for(var i in t){var r=t[i];r instanceof Array?e=e.concat(flatten(r)):e.push(r)}return e}var FW={_scrapers:new Array};FW._Base=function(){this.callHook=function(t,e,i,r){if("object"==typeof this.hooks){var n=this.hooks[t];"function"==typeof n&&n(e,i,r)}},this.evaluateThing=function(t,e,i){var r=typeof t;if("object"===r){if(t instanceof Array){var n=this.evaluateThing,a=t.map(function(t){return n(t,e,i)});return flatten(a)}return t.evaluate(e,i)}return"function"===r?t(e,i):t},this.makeItems=function(t,e,i,r,n){n()}},FW.Scraper=function(t){FW._scrapers.push(new FW._Scraper(t))},FW._Scraper=function(t){for(x in t)this[x]=t[x];this._singleFieldNames=["abstractNote","applicationNumber","archive","archiveLocation","artworkMedium","artworkSize","assignee","audioFileType","audioRecordingType","billNumber","blogTitle","bookTitle","callNumber","caseName","code","codeNumber","codePages","codeVolume","committee","company","conferenceName","country","court","date","dateDecided","dateEnacted","dictionaryTitle","distributor","docketNumber","documentNumber","DOI","edition","encyclopediaTitle","episodeNumber","extra","filingDate","firstPage","forumTitle","genre","history","institution","interviewMedium","ISBN","ISSN","issue","issueDate","issuingAuthority","journalAbbreviation","label","language","legalStatus","legislativeBody","letterType","libraryCatalog","manuscriptType","mapType","medium","meetingName","nameOfAct","network","number","numberOfVolumes","numPages","pages","patentNumber","place","postType","presentationType","priorityNumbers","proceedingsTitle","programTitle","programmingLanguage","publicLawNumber","publicationTitle","publisher","references","reportNumber","reportType","reporter","reporterVolume","rights","runningTime","scale","section","series","seriesNumber","seriesText","seriesTitle","session","shortTitle","studio","subject","system","thesisType","title","type","university","url","version","videoRecordingType","volume","websiteTitle","websiteType"],this._makeAttachments=function(t,e,i,r){if(i instanceof Array)i.forEach(function(i){this._makeAttachments(t,e,i,r)},this);else if("object"==typeof i){var n=i.urls||i.url,a=i.types||i.type,s=i.titles||i.title,o=i.snapshots||i.snapshot,u=this.evaluateThing(n,t,e),l=this.evaluateThing(s,t,e),c=this.evaluateThing(a,t,e),h=this.evaluateThing(o,t,e);u instanceof Array||(u=[u]);for(var f in u){var p,m,v,d=u[f];p=c instanceof Array?c[f]:c,m=l instanceof Array?l[f]:l,v=h instanceof Array?h[f]:h,r.attachments.push({url:d,title:m,mimeType:p,snapshot:v})}}},this.makeItems=function(t,e,i,r,n){var a=new Zotero.Item(this.itemType);a.url=e;for(var s in this._singleFieldNames){var o=this._singleFieldNames[s];if(this[o]){var u=this.evaluateThing(this[o],t,e);u instanceof Array?a[o]=u[0]:a[o]=u}}var l=["creators","tags"];for(var c in l){var h=l[c],f=this.evaluateThing(this[h],t,e);if(f)for(var p in f)a[h].push(f[p])}this._makeAttachments(t,e,this.attachments,a),r(a,this,t,e),n()}},FW._Scraper.prototype=new FW._Base,FW.MultiScraper=function(t){FW._scrapers.push(new FW._MultiScraper(t))},FW._MultiScraper=function(t){for(x in t)this[x]=t[x];this._mkSelectItems=function(t,e){var i=new Object;for(var r in t)i[e[r]]=t[r];return i},this._selectItems=function(t,e,i){var r=new Array;Zotero.selectItems(this._mkSelectItems(t,e),function(t){for(var e in t)r.push(e);i(r)})},this._mkAttachments=function(t,e,i){var r=this.evaluateThing(this.attachments,t,e),n=new Object;if(r)for(var a in i)n[i[a]]=r[a];return n},this._makeChoices=function(t,e,i,r,n){if(t instanceof Array)t.forEach(function(t){this._makeTitlesUrls(t,e,i,r,n)},this);else if("object"==typeof t){var a=t.urls||t.url,s=t.titles||t.title,o=this.evaluateThing(a,e,i),u=this.evaluateThing(s,e,i),l=u instanceof Array;o instanceof Array||(o=[o]);for(var c in o){var h,f=o[c];h=l?u[c]:u,n.push(f),r.push(h)}}},this.makeItems=function(t,e,i,r,n){if(this.beforeFilter){var a=this.beforeFilter(t,e);if(a!=e)return void this.makeItems(t,a,i,r,n)}var s=[],o=[];this._makeChoices(this.choices,t,e,s,o);var u=this._mkAttachments(t,e,o),l=this.itemTrans;this._selectItems(s,o,function(t){if(t){var e=function(t){var e=t.documentURI,i=l;void 0===i&&(i=FW.getScraper(t,e)),void 0===i||i.makeItems(t,e,u[e],r,function(){})};Zotero.Utilities.processDocuments(t,e,n)}else n()})}},FW._MultiScraper.prototype=new FW._Base,FW.WebDelegateTranslator=function(t){return new FW._WebDelegateTranslator(t)},FW._WebDelegateTranslator=function(t){for(x in t)this[x]=t[x];this.makeItems=function(t,e,i,r,n){var a=this,s=Zotero.loadTranslator("web");s.setHandler("itemDone",function(i,n){r(n,a,t,e)}),s.setDocument(t),this.translatorId?(s.setTranslator(this.translatorId),s.translate()):(s.setHandler("translators",function(t,e){e.length&&(s.setTranslator(e[0]),s.translate())}),s.getTranslators()),n()}},FW._WebDelegateTranslator.prototype=new FW._Base,FW._StringMagic=function(){this._filters=new Array,this.addFilter=function(t){return this._filters.push(t),this},this.split=function(t){return this.addFilter(function(e){return e.split(t).filter(function(t){return""!=t})})},this.replace=function(t,e,i){return this.addFilter(function(r){return r.match(t)?r.replace(t,e,i):r})},this.prepend=function(t){return this.replace(/^/,t)},this.append=function(t){return this.replace(/$/,t)},this.remove=function(t,e){return this.replace(t,"",e)},this.trim=function(){return this.addFilter(function(t){return Zotero.Utilities.trim(t)})},this.trimInternal=function(){return this.addFilter(function(t){return Zotero.Utilities.trimInternal(t)})},this.match=function(t,e){return e||(e=0),this.addFilter(function(i){var r=i.match(t);return void 0===r||null===r?void 0:r[e]})},this.cleanAuthor=function(t,e){return this.addFilter(function(i){return Zotero.Utilities.cleanAuthor(i,t,e)})},this.key=function(t){return this.addFilter(function(e){return e[t]})},this.capitalizeTitle=function(){return this.addFilter(function(t){return Zotero.Utilities.capitalizeTitle(t)})},this.unescapeHTML=function(){return this.addFilter(function(t){return Zotero.Utilities.unescapeHTML(t)})},this.unescape=function(){return this.addFilter(function(t){return unescape(t)})},this._applyFilters=function(t,e){for(i in this._filters){t=flatten(t),t=t.filter(function(t){return void 0!==t&&null!==t});for(var r=0;r<t.length;r++)try{if(void 0===t[r]||null===t[r])continue;t[r]=this._filters[i](t[r],e)}catch(n){t[r]=void 0,Zotero.debug("Caught exception "+n+"on filter: "+this._filters[i])}t=t.filter(function(t){return void 0!==t&&null!==t})}return flatten(t)}},FW.PageText=function(){return new FW._PageText},FW._PageText=function(){this._filters=new Array,this.evaluate=function(t){var e=[t.documentElement.innerHTML];return e=this._applyFilters(e,t),0==e.length?!1:e}},FW._PageText.prototype=new FW._StringMagic,FW.Url=function(){return new FW._Url},FW._Url=function(){this._filters=new Array,this.evaluate=function(t,e){var i=[e];return i=this._applyFilters(i,t),0==i.length?!1:i}},FW._Url.prototype=new FW._StringMagic,FW.Xpath=function(t){return new FW._Xpath(t)},FW._Xpath=function(t){this._xpath=t,this._filters=new Array,this.text=function(){var t=function(t){return"object"==typeof t&&t.textContent?t.textContent:t};return this.addFilter(t),this},this.sub=function(t){var e=function(e,i){var r=i.evaluate(t,e,null,XPathResult.ANY_TYPE,null);return r?r.iterateNext():void 0};return this.addFilter(e),this},this.evaluate=function(t){var e=t.evaluate(this._xpath,t,null,XPathResult.ANY_TYPE,null),i=e.resultType,r=new Array;if(i==XPathResult.STRING_TYPE)r.push(e.stringValue);else if(i==XPathResult.BOOLEAN_TYPE)r.push(e.booleanValue);else if(i==XPathResult.NUMBER_TYPE)r.push(e.numberValue);else if(i==XPathResult.ORDERED_NODE_ITERATOR_TYPE||i==XPathResult.UNORDERED_NODE_ITERATOR_TYPE)for(var n;n=e.iterateNext();)r.push(n);return r=this._applyFilters(r,t),0==r.length?!1:r}},FW._Xpath.prototype=new FW._StringMagic,FW.detectWeb=function(t,e){for(var i in FW._scrapers){var r=FW._scrapers[i],n=r.evaluateThing(r.itemType,t,e),a=r.evaluateThing(r.detect,t,e);if(a.length>0&&a[0])return n}},FW.getScraper=function(t,e){var i=FW.detectWeb(t,e);return FW._scrapers.filter(function(r){return r.evaluateThing(r.itemType,t,e)==i&&r.evaluateThing(r.detect,t,e)})[0]},FW.doWeb=function(t,e){var i=FW.getScraper(t,e);i.makeItems(t,e,[],function(t,e,i,r){e.callHook("scraperDone",t,i,r),t.title||(t.title=""),t.complete()},function(){Zotero.done()}),Zotero.wait()};
/*
***** BEGIN LICENSE BLOCK *****
AJC.com Translator, Copyright © 2012 Sebastian Karcher
Developed with the collaboration of the participants of the 2012 Zotero Trainer Workshop
in Atlanta, GA.
This file is part of Zotero.
Zotero is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
Zotero is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.
You should have received a copy of the GNU Affero General Public License
along with Zotero. If not, see <http://www.gnu.org/licenses/>.
***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) { return FW.detectWeb(doc, url); }
function doWeb(doc, url) { return FW.doWeb(doc, url); }


/** Articles */
FW.Scraper({
itemType         : 'newspaperArticle',
detect           : FW.Xpath('//h1[@class="cmLargerH1"]'),
title            : FW.Xpath('//h1[@class="cmLargerH1"]').text().trim(),
attachments      : [{ url: FW.Url(),
  title:  "AJC Snapshot",
  type: "text/html" }],
creators         : FW.Xpath('//p[@class="cmCredit"]').text().remove(/By\s/).capitalizeTitle(true).split(/\s*,\s*/).cleanAuthor("author"),
date             : FW.Xpath('//div[@class="cmTimeStamp"]/p').text().remove(/.+\|/).remove(/Posted:\s\d+:\d+\s[amp\.]+/).trim(),
section			 : FW.Xpath('//div[@class="cmBreadcrumb"]/ul/li[last()]/a').text(),
abstractNote	 : FW.Xpath('//meta[@name="description"]/@content').text(),
ISSN			 : "1539-7459",
publicationTitle : "Atlanta Journal Constitution"
});

/**Blog Posts */
FW.Scraper({
itemType         : 'blogPost',
detect           : FW.Url().match(/blogs\.ajc\.com.+\/\d{4}/),
title            : FW.Xpath('//h1').text().trim(),
attachments      : [{ url: FW.Url(),
  title:  "AJC Blog Snapshot",
  type: "text/html" }],
creators         : FW.Xpath('//p[@class="byline"]/span[@class="author"]').text().replace(/By\s/," ").capitalizeTitle(true).cleanAuthor("author"),
date             : FW.Xpath('//p[@class="byline"]/span[@class="date"]').text().remove(/.+\|/).remove(/Posted:\s\d+:\d+\s[amp\.]+/).trim(),
abstractNote	 : FW.Xpath('//meta[@name="description"]/@content').text(),
ISSN			 : "1539-7459",
publicationTitle : FW.Xpath('//div[contains(@class, "blog-header")]/a').text().prepend("Atlanta Journal Constitution: ").append(" Blog"),
});
 
FW.MultiScraper({
itemType         : 'multiple',
detect           : FW.Url().match(/\/search\/\?q=/),
choices          : {
  titles :  FW.Xpath('//h4/a[contains(@href, "ajc.com")]').text().trim(),
  urls    :  FW.Xpath('//h4/a[contains(@href, "ajc.com")]').key("href")
}
});
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://blogs.ajc.com/business-beat/2012/10/13/ted-turner-%e2%80%98taking-risks-depends-on-how-good-your-judgment-is%e2%80%99/?cxntfid=blogs_business_beat",
		"items": [
			{
				"itemType": "blogPost",
				"creators": [
					{
						"firstName": "Henry",
						"lastName": "Unger",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "AJC Blog Snapshot",
						"type": "text/html"
					}
				],
				"url": "http://blogs.ajc.com/business-beat/2012/10/13/ted-turner-%e2%80%98taking-risks-depends-on-how-good-your-judgment-is%e2%80%99/?cxntfid=blogs_business_beat",
				"abstractNote": "Before there was a 24 / 7, all-news cable network and before giving away money became more common among top business execs, there was Ted Turner with a vision",
				"date": "October 13, 2012,",
				"ISSN": "1539-7459",
				"publicationTitle": "Atlanta Journal Constitution: The Biz Beat Blog",
				"title": "Ted Turner: ‘Taking risks depends on how good your judgment is’",
				"libraryCatalog": "Atlanta Journal Constitution",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Ted Turner"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.ajc.com/news/news/romney-tops-obama-in-georgia-as-economy-dominates-/nScjq/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"creators": [
					{
						"firstName": "Aaron Gould",
						"lastName": "Sheinin",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "AJC Snapshot",
						"type": "text/html"
					}
				],
				"url": "http://www.ajc.com/news/news/romney-tops-obama-in-georgia-as-economy-dominates-/nScjq/",
				"abstractNote": "Mitt Romney has a strong lead over Barack Obama in Georgia among likely voters just three weeks until the presidential election, but a new poll for The Atlanta Journal-Constitution finds Georgians, by a larger margin, expect Obama to be re-elected in November.",
				"date": "Sunday, Oct. 14, 2012",
				"ISSN": "1539-7459",
				"publicationTitle": "Atlanta Journal Constitution",
				"section": "News",
				"title": "Romney tops Obama in Georgia as economy dominates campaign",
				"libraryCatalog": "Atlanta Journal Constitution",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.ajc.com/search/?q=labor&type=",
		"items": "multiple"
	}
]
/** END TEST CASES **/