{
	"translatorID": "966a7612-900c-42d9-8780-2a3247548588",
	"label": "eMJA",
	"creator": "Sebastian Karcher",
	"target": "^https?://www\\.mja\\.com\\.au/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-11-01 18:30:00"
}

/* FW LINE 59:b820c6d */ function flatten(t){var e=new Array;for(var i in t){var r=t[i];r instanceof Array?e=e.concat(flatten(r)):e.push(r)}return e}var FW={_scrapers:new Array};FW._Base=function(){this.callHook=function(t,e,i,r){if("object"==typeof this.hooks){var n=this.hooks[t];"function"==typeof n&&n(e,i,r)}},this.evaluateThing=function(t,e,i){var r=typeof t;if("object"===r){if(t instanceof Array){var n=this.evaluateThing,a=t.map(function(t){return n(t,e,i)});return flatten(a)}return t.evaluate(e,i)}return"function"===r?t(e,i):t},this.makeItems=function(t,e,i,r,n){n()}},FW.Scraper=function(t){FW._scrapers.push(new FW._Scraper(t))},FW._Scraper=function(t){for(x in t)this[x]=t[x];this._singleFieldNames=["abstractNote","applicationNumber","archive","archiveLocation","artworkMedium","artworkSize","assignee","audioFileType","audioRecordingType","billNumber","blogTitle","bookTitle","callNumber","caseName","code","codeNumber","codePages","codeVolume","committee","company","conferenceName","country","court","date","dateDecided","dateEnacted","dictionaryTitle","distributor","docketNumber","documentNumber","DOI","edition","encyclopediaTitle","episodeNumber","extra","filingDate","firstPage","forumTitle","genre","history","institution","interviewMedium","ISBN","ISSN","issue","issueDate","issuingAuthority","journalAbbreviation","label","language","legalStatus","legislativeBody","letterType","libraryCatalog","manuscriptType","mapType","medium","meetingName","nameOfAct","network","number","numberOfVolumes","numPages","pages","patentNumber","place","postType","presentationType","priorityNumbers","proceedingsTitle","programTitle","programmingLanguage","publicLawNumber","publicationTitle","publisher","references","reportNumber","reportType","reporter","reporterVolume","rights","runningTime","scale","section","series","seriesNumber","seriesText","seriesTitle","session","shortTitle","studio","subject","system","thesisType","title","type","university","url","version","videoRecordingType","volume","websiteTitle","websiteType"],this._makeAttachments=function(t,e,i,r){if(i instanceof Array)i.forEach(function(i){this._makeAttachments(t,e,i,r)},this);else if("object"==typeof i){var n=i.urls||i.url,a=i.types||i.type,s=i.titles||i.title,o=i.snapshots||i.snapshot,u=this.evaluateThing(n,t,e),l=this.evaluateThing(s,t,e),c=this.evaluateThing(a,t,e),h=this.evaluateThing(o,t,e);u instanceof Array||(u=[u]);for(var f in u){var p,m,v,d=u[f];p=c instanceof Array?c[f]:c,m=l instanceof Array?l[f]:l,v=h instanceof Array?h[f]:h,r.attachments.push({url:d,title:m,mimeType:p,snapshot:v})}}},this.makeItems=function(t,e,i,r,n){var a=new Zotero.Item(this.itemType);a.url=e;for(var s in this._singleFieldNames){var o=this._singleFieldNames[s];if(this[o]){var u=this.evaluateThing(this[o],t,e);u instanceof Array?a[o]=u[0]:a[o]=u}}var l=["creators","tags"];for(var c in l){var h=l[c],f=this.evaluateThing(this[h],t,e);if(f)for(var p in f)a[h].push(f[p])}this._makeAttachments(t,e,this.attachments,a),r(a,this,t,e),n()}},FW._Scraper.prototype=new FW._Base,FW.MultiScraper=function(t){FW._scrapers.push(new FW._MultiScraper(t))},FW._MultiScraper=function(t){for(x in t)this[x]=t[x];this._mkSelectItems=function(t,e){var i=new Object;for(var r in t)i[e[r]]=t[r];return i},this._selectItems=function(t,e,i){var r=new Array;Zotero.selectItems(this._mkSelectItems(t,e),function(t){for(var e in t)r.push(e);i(r)})},this._mkAttachments=function(t,e,i){var r=this.evaluateThing(this.attachments,t,e),n=new Object;if(r)for(var a in i)n[i[a]]=r[a];return n},this._makeChoices=function(t,e,i,r,n){if(t instanceof Array)t.forEach(function(t){this._makeTitlesUrls(t,e,i,r,n)},this);else if("object"==typeof t){var a=t.urls||t.url,s=t.titles||t.title,o=this.evaluateThing(a,e,i),u=this.evaluateThing(s,e,i),l=u instanceof Array;o instanceof Array||(o=[o]);for(var c in o){var h,f=o[c];h=l?u[c]:u,n.push(f),r.push(h)}}},this.makeItems=function(t,e,i,r,n){if(this.beforeFilter){var a=this.beforeFilter(t,e);if(a!=e)return void this.makeItems(t,a,i,r,n)}var s=[],o=[];this._makeChoices(this.choices,t,e,s,o);var u=this._mkAttachments(t,e,o),l=this.itemTrans;this._selectItems(s,o,function(t){if(t){var e=function(t){var e=t.documentURI,i=l;void 0===i&&(i=FW.getScraper(t,e)),void 0===i||i.makeItems(t,e,u[e],r,function(){})};Zotero.Utilities.processDocuments(t,e,n)}else n()})}},FW._MultiScraper.prototype=new FW._Base,FW.WebDelegateTranslator=function(t){return new FW._WebDelegateTranslator(t)},FW._WebDelegateTranslator=function(t){for(x in t)this[x]=t[x];this.makeItems=function(t,e,i,r,n){var a=this,s=Zotero.loadTranslator("web");s.setHandler("itemDone",function(i,n){r(n,a,t,e)}),s.setDocument(t),this.translatorId?(s.setTranslator(this.translatorId),s.translate()):(s.setHandler("translators",function(t,e){e.length&&(s.setTranslator(e[0]),s.translate())}),s.getTranslators()),n()}},FW._WebDelegateTranslator.prototype=new FW._Base,FW._StringMagic=function(){this._filters=new Array,this.addFilter=function(t){return this._filters.push(t),this},this.split=function(t){return this.addFilter(function(e){return e.split(t).filter(function(t){return""!=t})})},this.replace=function(t,e,i){return this.addFilter(function(r){return r.match(t)?r.replace(t,e,i):r})},this.prepend=function(t){return this.replace(/^/,t)},this.append=function(t){return this.replace(/$/,t)},this.remove=function(t,e){return this.replace(t,"",e)},this.trim=function(){return this.addFilter(function(t){return Zotero.Utilities.trim(t)})},this.trimInternal=function(){return this.addFilter(function(t){return Zotero.Utilities.trimInternal(t)})},this.match=function(t,e){return e||(e=0),this.addFilter(function(i){var r=i.match(t);return void 0===r||null===r?void 0:r[e]})},this.cleanAuthor=function(t,e){return this.addFilter(function(i){return Zotero.Utilities.cleanAuthor(i,t,e)})},this.key=function(t){return this.addFilter(function(e){return e[t]})},this.capitalizeTitle=function(){return this.addFilter(function(t){return Zotero.Utilities.capitalizeTitle(t)})},this.unescapeHTML=function(){return this.addFilter(function(t){return Zotero.Utilities.unescapeHTML(t)})},this.unescape=function(){return this.addFilter(function(t){return unescape(t)})},this._applyFilters=function(t,e){for(i in this._filters){t=flatten(t),t=t.filter(function(t){return void 0!==t&&null!==t});for(var r=0;r<t.length;r++)try{if(void 0===t[r]||null===t[r])continue;t[r]=this._filters[i](t[r],e)}catch(n){t[r]=void 0,Zotero.debug("Caught exception "+n+"on filter: "+this._filters[i])}t=t.filter(function(t){return void 0!==t&&null!==t})}return flatten(t)}},FW.PageText=function(){return new FW._PageText},FW._PageText=function(){this._filters=new Array,this.evaluate=function(t){var e=[t.documentElement.innerHTML];return e=this._applyFilters(e,t),0==e.length?!1:e}},FW._PageText.prototype=new FW._StringMagic,FW.Url=function(){return new FW._Url},FW._Url=function(){this._filters=new Array,this.evaluate=function(t,e){var i=[e];return i=this._applyFilters(i,t),0==i.length?!1:i}},FW._Url.prototype=new FW._StringMagic,FW.Xpath=function(t){return new FW._Xpath(t)},FW._Xpath=function(t){this._xpath=t,this._filters=new Array,this.text=function(){var t=function(t){return"object"==typeof t&&t.textContent?t.textContent:t};return this.addFilter(t),this},this.sub=function(t){var e=function(e,i){var r=i.evaluate(t,e,null,XPathResult.ANY_TYPE,null);return r?r.iterateNext():void 0};return this.addFilter(e),this},this.evaluate=function(t){var e=t.evaluate(this._xpath,t,null,XPathResult.ANY_TYPE,null),i=e.resultType,r=new Array;if(i==XPathResult.STRING_TYPE)r.push(e.stringValue);else if(i==XPathResult.BOOLEAN_TYPE)r.push(e.booleanValue);else if(i==XPathResult.NUMBER_TYPE)r.push(e.numberValue);else if(i==XPathResult.ORDERED_NODE_ITERATOR_TYPE||i==XPathResult.UNORDERED_NODE_ITERATOR_TYPE)for(var n;n=e.iterateNext();)r.push(n);return r=this._applyFilters(r,t),0==r.length?!1:r}},FW._Xpath.prototype=new FW._StringMagic,FW.detectWeb=function(t,e){for(var i in FW._scrapers){var r=FW._scrapers[i],n=r.evaluateThing(r.itemType,t,e),a=r.evaluateThing(r.detect,t,e);if(a.length>0&&a[0])return n}},FW.getScraper=function(t,e){var i=FW.detectWeb(t,e);return FW._scrapers.filter(function(r){return r.evaluateThing(r.itemType,t,e)==i&&r.evaluateThing(r.detect,t,e)})[0]},FW.doWeb=function(t,e){var i=FW.getScraper(t,e);i.makeItems(t,e,[],function(t,e,i,r){e.callHook("scraperDone",t,i,r),t.title||(t.title=""),t.complete()},function(){Zotero.done()}),Zotero.wait()};
/*
	***** BEGIN LICENSE BLOCK *****
	
	eMJA Translator - Copyright © 2012 Sebastian Karcher 
	This file is part of Zotero.
	
	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
	
	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) { return FW.detectWeb(doc, url); }
function doWeb(doc, url) { return FW.doWeb(doc, url); }

/** Articles */
FW.Scraper({
itemType         : 'journalArticle',
detect           : FW.Xpath('//div[@id="authors_list"]'),
title            : FW.Xpath('//h1[@id="page-title"]').text().trim(),
attachments      : [{ 
  url: FW.Url(),
  title:  "eMJA - Snapshot",
  type: "text/html" },
  {
  url: FW.Xpath('//span[@class="file"]/a/@href').text(),
  title: "eMJA - Full Text PDF",
  type: "application/pdf"
  }],
// here, we use the replace(..) to break names on &nbsp;
creators         : FW.Xpath('//div[@id="authors_list"]')
					.text().split(/\s*,\s*|\sand\s/," ").cleanAuthor("author"),
volume           : FW.Xpath('//div[@id="meta-container"]/div/div[@class="field-items"]/div').text().match(/;\s*\d+\s*\(/).replace(/\(|;\s*/g, ""),
date			 : FW.Xpath('//div[@id="meta-container"]/div/div[@class="field-items"]/div').text().match(/\d{4};/).replace(/;/, ""),
issue            : FW.Xpath('//div[@id="meta-container"]/div/div[@class="field-items"]/div').text().match(/\(\d+\)/).replace(/\(|\)/g, ""),
abstractNote     : FW.Xpath('//div[contains(@class, "abstract")]').text(),
journalAbbreviation : "Med. J. Aust.", 
ISSN			 : "0025-729X",
publicationTitle : "Medical Journal of Australia"
});
 
FW.MultiScraper({
itemType         : 'multiple',
detect           : FW.Xpath('//div[@class="view-content"]'),
choices          : {
  titles :  FW.Xpath('//span[contains(@class, "views-field-title")]/span/a|//li[@class="search-result"]/h3/a').text().trim(),
  urls    :  FW.Xpath('//span[contains(@class, "views-field-title")]/span/a|//li[@class="search-result"]/h3/a').key("href")
}
});
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.mja.com.au/journal/2011/195/1/socioeconomic-disparities-stroke-rates-and-outcome-pooled-analysis-stroke",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Socioeconomic disparities in stroke rates and outcome: pooled analysis of stroke incidence studies in Australia and New Zealand",
				"creators": [
					{
						"firstName": "Emma L.",
						"lastName": "Heeley",
						"creatorType": "author"
					},
					{
						"firstName": "Jade W.",
						"lastName": "Wei",
						"creatorType": "author"
					},
					{
						"firstName": "Kristie",
						"lastName": "Carter",
						"creatorType": "author"
					},
					{
						"firstName": "Md Shaheenul",
						"lastName": "Islam",
						"creatorType": "author"
					},
					{
						"firstName": "Amanda G.",
						"lastName": "Thrift",
						"creatorType": "author"
					},
					{
						"firstName": "Graeme J.",
						"lastName": "Hankey",
						"creatorType": "author"
					},
					{
						"firstName": "Alan",
						"lastName": "Cass",
						"creatorType": "author"
					},
					{
						"firstName": "Craig S.",
						"lastName": "Anderson",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"ISSN": "0025-729X",
				"abstractNote": "Abstract Objective:   To assess the influence of area-level socioeconomic status (SES) on incidence and case-fatality rates for stroke.Design, setting and participants:   Analysis of pooled data for 3077 patients with incident stroke from three population-based studies in Perth, Melbourne, and Auckland between 1995 and 2003.Main outcome measures:   Incidence and 12-month case-fatality rates for stroke.Results:   Annual age-standardised stroke incidence rates ranged from 77 per 100 000 person-years (95% CI, 72–83) in the least deprived areas to 131 per 100 000 person-years (95% CI, 120–141) in the most deprived areas (rate ratio, 1.70; 95% CI, 1.47–1.95; P < 0.001). The population attributable risk of stroke was 19% (95% CI, 12%–27%) for those living in the most deprived areas compared with the least deprived areas. Compared with people in the least deprived areas, those in the most deprived areas tended to be younger (mean age, 68 v 77 years; P < 0.001), had more comorbidities such as hypertension (58% v 51%; P < 0.001) and diabetes (22% v 12%; P < 0.001), and were more likely to smoke (23% v 8%; P < 0.001). After adjustment for age, area-level SES was not associated with 12-month case-fatality rate.Conclusions:   Our analysis provides evidence that people living in areas that are relatively more deprived in socioeconomic terms experience higher rates of stroke. This may be explained by a higher prevalence of risk factors among these populations, such as hypertension, diabetes and cigarette smoking. Effective preventive measures in the more deprived areas of the community could substantially reduce rates of stroke.",
				"issue": "1",
				"journalAbbreviation": "Med. J. Aust.",
				"libraryCatalog": "eMJA",
				"publicationTitle": "Medical Journal of Australia",
				"shortTitle": "Socioeconomic disparities in stroke rates and outcome",
				"url": "https://www.mja.com.au/journal/2011/195/1/socioeconomic-disparities-stroke-rates-and-outcome-pooled-analysis-stroke",
				"volume": "195",
				"attachments": [
					{
						"title": "eMJA - Snapshot",
						"mimeType": "text/html"
					},
					{
						"title": "eMJA - Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "http://www.mja.com.au/public/issues/195_01_040711/contents_040711.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.mja.com.au/search/site/vaccination",
		"items": "multiple"
	}
]
/** END TEST CASES **/