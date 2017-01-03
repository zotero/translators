{
	"translatorID": "bd2e6136-d8e5-4f76-906b-0fbcd888dd63",
	"label": "RePEc - IDEAS",
	"creator": "Sebastian Karcher",
	"target": "^https?://ideas\\.repec\\.org/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-12-27 20:22:26"
}

/* FW LINE 59:b820c6d */ function flatten(t){var e=new Array;for(var i in t){var r=t[i];r instanceof Array?e=e.concat(flatten(r)):e.push(r)}return e}var FW={_scrapers:new Array};FW._Base=function(){this.callHook=function(t,e,i,r){if("object"==typeof this.hooks){var n=this.hooks[t];"function"==typeof n&&n(e,i,r)}},this.evaluateThing=function(t,e,i){var r=typeof t;if("object"===r){if(t instanceof Array){var n=this.evaluateThing,a=t.map(function(t){return n(t,e,i)});return flatten(a)}return t.evaluate(e,i)}return"function"===r?t(e,i):t},this.makeItems=function(t,e,i,r,n){n()}},FW.Scraper=function(t){FW._scrapers.push(new FW._Scraper(t))},FW._Scraper=function(t){for(x in t)this[x]=t[x];this._singleFieldNames=["abstractNote","applicationNumber","archive","archiveLocation","artworkMedium","artworkSize","assignee","audioFileType","audioRecordingType","billNumber","blogTitle","bookTitle","callNumber","caseName","code","codeNumber","codePages","codeVolume","committee","company","conferenceName","country","court","date","dateDecided","dateEnacted","dictionaryTitle","distributor","docketNumber","documentNumber","DOI","edition","encyclopediaTitle","episodeNumber","extra","filingDate","firstPage","forumTitle","genre","history","institution","interviewMedium","ISBN","ISSN","issue","issueDate","issuingAuthority","journalAbbreviation","label","language","legalStatus","legislativeBody","letterType","libraryCatalog","manuscriptType","mapType","medium","meetingName","nameOfAct","network","number","numberOfVolumes","numPages","pages","patentNumber","place","postType","presentationType","priorityNumbers","proceedingsTitle","programTitle","programmingLanguage","publicLawNumber","publicationTitle","publisher","references","reportNumber","reportType","reporter","reporterVolume","rights","runningTime","scale","section","series","seriesNumber","seriesText","seriesTitle","session","shortTitle","studio","subject","system","thesisType","title","type","university","url","version","videoRecordingType","volume","websiteTitle","websiteType"],this._makeAttachments=function(t,e,i,r){if(i instanceof Array)i.forEach(function(i){this._makeAttachments(t,e,i,r)},this);else if("object"==typeof i){var n=i.urls||i.url,a=i.types||i.type,s=i.titles||i.title,o=i.snapshots||i.snapshot,u=this.evaluateThing(n,t,e),l=this.evaluateThing(s,t,e),c=this.evaluateThing(a,t,e),h=this.evaluateThing(o,t,e);u instanceof Array||(u=[u]);for(var f in u){var p,m,v,d=u[f];p=c instanceof Array?c[f]:c,m=l instanceof Array?l[f]:l,v=h instanceof Array?h[f]:h,r.attachments.push({url:d,title:m,mimeType:p,snapshot:v})}}},this.makeItems=function(t,e,i,r,n){var a=new Zotero.Item(this.itemType);a.url=e;for(var s in this._singleFieldNames){var o=this._singleFieldNames[s];if(this[o]){var u=this.evaluateThing(this[o],t,e);u instanceof Array?a[o]=u[0]:a[o]=u}}var l=["creators","tags"];for(var c in l){var h=l[c],f=this.evaluateThing(this[h],t,e);if(f)for(var p in f)a[h].push(f[p])}this._makeAttachments(t,e,this.attachments,a),r(a,this,t,e),n()}},FW._Scraper.prototype=new FW._Base,FW.MultiScraper=function(t){FW._scrapers.push(new FW._MultiScraper(t))},FW._MultiScraper=function(t){for(x in t)this[x]=t[x];this._mkSelectItems=function(t,e){var i=new Object;for(var r in t)i[e[r]]=t[r];return i},this._selectItems=function(t,e,i){var r=new Array;Zotero.selectItems(this._mkSelectItems(t,e),function(t){for(var e in t)r.push(e);i(r)})},this._mkAttachments=function(t,e,i){var r=this.evaluateThing(this.attachments,t,e),n=new Object;if(r)for(var a in i)n[i[a]]=r[a];return n},this._makeChoices=function(t,e,i,r,n){if(t instanceof Array)t.forEach(function(t){this._makeTitlesUrls(t,e,i,r,n)},this);else if("object"==typeof t){var a=t.urls||t.url,s=t.titles||t.title,o=this.evaluateThing(a,e,i),u=this.evaluateThing(s,e,i),l=u instanceof Array;o instanceof Array||(o=[o]);for(var c in o){var h,f=o[c];h=l?u[c]:u,n.push(f),r.push(h)}}},this.makeItems=function(t,e,i,r,n){if(this.beforeFilter){var a=this.beforeFilter(t,e);if(a!=e)return void this.makeItems(t,a,i,r,n)}var s=[],o=[];this._makeChoices(this.choices,t,e,s,o);var u=this._mkAttachments(t,e,o),l=this.itemTrans;this._selectItems(s,o,function(t){if(t){var e=function(t){var e=t.documentURI,i=l;void 0===i&&(i=FW.getScraper(t,e)),void 0===i||i.makeItems(t,e,u[e],r,function(){})};Zotero.Utilities.processDocuments(t,e,n)}else n()})}},FW._MultiScraper.prototype=new FW._Base,FW.WebDelegateTranslator=function(t){return new FW._WebDelegateTranslator(t)},FW._WebDelegateTranslator=function(t){for(x in t)this[x]=t[x];this.makeItems=function(t,e,i,r,n){var a=this,s=Zotero.loadTranslator("web");s.setHandler("itemDone",function(i,n){r(n,a,t,e)}),s.setDocument(t),this.translatorId?(s.setTranslator(this.translatorId),s.translate()):(s.setHandler("translators",function(t,e){e.length&&(s.setTranslator(e[0]),s.translate())}),s.getTranslators()),n()}},FW._WebDelegateTranslator.prototype=new FW._Base,FW._StringMagic=function(){this._filters=new Array,this.addFilter=function(t){return this._filters.push(t),this},this.split=function(t){return this.addFilter(function(e){return e.split(t).filter(function(t){return""!=t})})},this.replace=function(t,e,i){return this.addFilter(function(r){return r.match(t)?r.replace(t,e,i):r})},this.prepend=function(t){return this.replace(/^/,t)},this.append=function(t){return this.replace(/$/,t)},this.remove=function(t,e){return this.replace(t,"",e)},this.trim=function(){return this.addFilter(function(t){return Zotero.Utilities.trim(t)})},this.trimInternal=function(){return this.addFilter(function(t){return Zotero.Utilities.trimInternal(t)})},this.match=function(t,e){return e||(e=0),this.addFilter(function(i){var r=i.match(t);return void 0===r||null===r?void 0:r[e]})},this.cleanAuthor=function(t,e){return this.addFilter(function(i){return Zotero.Utilities.cleanAuthor(i,t,e)})},this.key=function(t){return this.addFilter(function(e){return e[t]})},this.capitalizeTitle=function(){return this.addFilter(function(t){return Zotero.Utilities.capitalizeTitle(t)})},this.unescapeHTML=function(){return this.addFilter(function(t){return Zotero.Utilities.unescapeHTML(t)})},this.unescape=function(){return this.addFilter(function(t){return unescape(t)})},this._applyFilters=function(t,e){for(i in this._filters){t=flatten(t),t=t.filter(function(t){return void 0!==t&&null!==t});for(var r=0;r<t.length;r++)try{if(void 0===t[r]||null===t[r])continue;t[r]=this._filters[i](t[r],e)}catch(n){t[r]=void 0,Zotero.debug("Caught exception "+n+"on filter: "+this._filters[i])}t=t.filter(function(t){return void 0!==t&&null!==t})}return flatten(t)}},FW.PageText=function(){return new FW._PageText},FW._PageText=function(){this._filters=new Array,this.evaluate=function(t){var e=[t.documentElement.innerHTML];return e=this._applyFilters(e,t),0==e.length?!1:e}},FW._PageText.prototype=new FW._StringMagic,FW.Url=function(){return new FW._Url},FW._Url=function(){this._filters=new Array,this.evaluate=function(t,e){var i=[e];return i=this._applyFilters(i,t),0==i.length?!1:i}},FW._Url.prototype=new FW._StringMagic,FW.Xpath=function(t){return new FW._Xpath(t)},FW._Xpath=function(t){this._xpath=t,this._filters=new Array,this.text=function(){var t=function(t){return"object"==typeof t&&t.textContent?t.textContent:t};return this.addFilter(t),this},this.sub=function(t){var e=function(e,i){var r=i.evaluate(t,e,null,XPathResult.ANY_TYPE,null);return r?r.iterateNext():void 0};return this.addFilter(e),this},this.evaluate=function(t){var e=t.evaluate(this._xpath,t,null,XPathResult.ANY_TYPE,null),i=e.resultType,r=new Array;if(i==XPathResult.STRING_TYPE)r.push(e.stringValue);else if(i==XPathResult.BOOLEAN_TYPE)r.push(e.booleanValue);else if(i==XPathResult.NUMBER_TYPE)r.push(e.numberValue);else if(i==XPathResult.ORDERED_NODE_ITERATOR_TYPE||i==XPathResult.UNORDERED_NODE_ITERATOR_TYPE)for(var n;n=e.iterateNext();)r.push(n);return r=this._applyFilters(r,t),0==r.length?!1:r}},FW._Xpath.prototype=new FW._StringMagic,FW.detectWeb=function(t,e){for(var i in FW._scrapers){var r=FW._scrapers[i],n=r.evaluateThing(r.itemType,t,e),a=r.evaluateThing(r.detect,t,e);if(a.length>0&&a[0])return n}},FW.getScraper=function(t,e){var i=FW.detectWeb(t,e);return FW._scrapers.filter(function(r){return r.evaluateThing(r.itemType,t,e)==i&&r.evaluateThing(r.detect,t,e)})[0]},FW.doWeb=function(t,e){var i=FW.getScraper(t,e);i.makeItems(t,e,[],function(t,e,i,r){e.callHook("scraperDone",t,i,r),t.title||(t.title=""),t.complete()},function(){Zotero.done()}),Zotero.wait()};




/*
	***** BEGIN LICENSE BLOCK *****

	RePEc Translator
	Copyright © 2011 Sebastian Karcher

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

/**Article */
FW.Scraper({
itemType : 'journalArticle',
detect : FW.Xpath('//meta[@name="citation_type" and contains(@content, "article")]|//meta[@name="redif-type" and contains(@content, "article")]'),
title : FW.Xpath('//meta[@name="citation_title"]/@content').text().trim(),
attachments : [{ url: FW.Xpath('//form/input[@type="radio" and contains(@value, ".pdf")]/@value').text().trim(),
  title: "RePEc PDF",
  type: "application/pdf" },
  {url: FW.Url(),
  title: "RePEc Snapshot",
  type: "text/html"},
  ],
creators : FW.Xpath('//meta[@name="citation_authors"]/@content').text().replace(/(;[^A-Za-z0-9]*)$/, "").split(/;/).cleanAuthor("author", true),
date : FW.Xpath('//meta[@name="citation_date"]/@content|//meta[@name="citation_year"]/@content').text(),
issue : FW.Xpath('//meta[@name="citation_issue"]/@content').text(),
volume : FW.Xpath('//meta[@name="citation_volume"]/@content').text(),
pages : FW.Xpath('concat(//meta[@name="citation_firstpage"]/@content, "-", //meta[@name="citation_lastpage"]/@content)').remove(/^-|-$/),
ISSN : FW.Xpath('//meta[@name="citation_issn"]/@content').text(),
abstractNote: FW.Xpath('//meta[@name="citation_abstract"]/@content').text(),
journalAbbreviation : FW.Xpath('//meta[@name="citation_journal_abbrev"]/@content').text(),
DOI : FW.Xpath('//meta[@name="citation_doi"]/@content').text(),
language : FW.Xpath('//meta[@name="DC.Language"]/@content').text(),
tags :  FW.Xpath('//meta[@name="citation_keywords"]/@content').text().split(/;/),
publisher: FW.Xpath('//meta[@name="citation_publisher"]/@content').text(),
publicationTitle : FW.Xpath('//meta[@name="citation_journal_title"]/@content').text(),
place : FW.Xpath('//meta[@name="citation_publication_place"]/@content').text(),

hooks : { "scraperDone": function  (item,doc, url) {
	for (i in item.creators) {
		if (item.creators[i]  && !item.creators[i].firstName) {
	   	item.creators[i]= ZU.cleanAuthor(item.creators[i].lastName, "author")
		}
	}}
}
});


/**Software*/
FW.Scraper({
itemType : 'computerProgram',
detect : FW.Xpath('//meta[contains(@name, "redif-type") and contains(@content, "software")]|//meta[contains(@name, "citation_type") and contains(@content, "software")]'),
title : FW.Xpath('//meta[@name="citation_title"]/@content').text().trim(),
attachments : [{ url: FW.Xpath('//form/input[@type="radio" and contains(@value, ".pdf")]/@value').text().trim(),
  title: "RePEc PDF",
  type: "application/pdf" },
  {url: FW.Url(),
  title: "RePEc Snapshot",
  type: "text/html"},
  ],
//make sure there are no empty authors:
creators : FW.Xpath('//meta[@name="citation_authors"]/@content').text().replace(/(;[^A-Za-z0-9]*)$/, "").split(/;/).cleanAuthor("author", true),
date : FW.Xpath('//meta[@name="citation_publication_date"]/@content|//meta[@name="citation_date"]/@content|//meta[@name="citation_year"]/@content').text(),
pages : FW.Xpath('concat(//meta[@name="citation_firstpage"]/@content, "-", //meta[@name="citation_lastpage"]/@content)').remove(/^-|-$/),
ISBN : FW.Xpath('//meta[@name="citation_issn"]/@content').text(),
abstractNote: FW.Xpath('//meta[@name="citation_abstract"]/@content').text(),
DOI : FW.Xpath('//meta[@name="citation_doi"]/@content').text(),
language : FW.Xpath('//meta[@name="DC.Language"]/@content').text(),
tags :  FW.Xpath('//meta[@name="citation_keywords"]/@content').text().split(/;/),
publisher: FW.Xpath('//meta[@name="citation_publisher"]/@content|//meta[@name="citation_technical_report_institution"]/@content').text(),
place : FW.Xpath('//meta[@name="citation_publication_place"]/@content').text(),
version : FW.Xpath('//meta[@name="citation_software_version"]/@content').text(),
seriesTitle: FW.Xpath('//meta[@name="citation_journal_title"]/@content').text(),

hooks : { "scraperDone": function  (item,doc, url) {
	for (i in item.creators) {
		if (item.creators[i]  && !item.creators[i].firstName) {
	   	item.creators[i]= ZU.cleanAuthor(item.creators[i].lastName, "author")
		}
	}}
}
});

/** Working Papers*/
//they classify everything as citation_journal_title - we don't accept that
//a lot on the site are working papers
FW.Scraper({
itemType : 'report',
detect : FW.Xpath('//meta[@name="citation_type" and contains(@content, "paper")]|//meta[@name="redif-type" and contains(@content, "paper")]|//meta[@name="dc.Type" and contains(@content, "techreport")]|//meta[contains(@name, "technical_report")]|//meta[@name="citation_publisher"]'),
title : FW.Xpath('//meta[@name="citation_title"]/@content').text().trim(),
attachments : [{ url: FW.Xpath('//form/input[@type="radio" and contains(@value, ".pdf")]/@value').text().trim(),
  title: "RePEc PDF",
  type: "application/pdf" },
  {url: FW.Url(),
  title: "RePEc Snapshot",
  type: "text/html"},
  ],
//make sure there are no empty authors:
creators : FW.Xpath('//meta[@name="citation_authors"]/@content').text().replace(/(;[^A-Za-z0-9]*)$/, "").split(/;/).cleanAuthor("author", true),
date : FW.Xpath('//meta[@name="citation_date"]/@content|//meta[@name="citation_year"]/@content').text(),
pages : FW.Xpath('concat(//meta[@name="citation_firstpage"]/@content, "-", //meta[@name="citation_lastpage"]/@content)').remove(/^-|-$/),
ISBN : FW.Xpath('//meta[@name="citation_isbn"]/@content').text(),
abstractNote: FW.Xpath('//meta[@name="citation_abstract"]/@content').text(),
DOI : FW.Xpath('//meta[@name="citation_doi"]/@content').text(),
language : FW.Xpath('//meta[@name="DC.Language"]/@content').text(),
tags :  FW.Xpath('//meta[@name="citation_keywords"]/@content').text().split(/;/),
publisher: FW.Xpath('//meta[@name="citation_publisher"]/@content|//meta[@name="citation_technical_report_institution"]/@content').text(),
numPages : FW.Xpath('//meta[@name="citation_number_of_pages"]/@content').text().remove(/\s\D*/), 
reportNumber: FW.Xpath('//meta[@name="citation_technical_report_number"]/@content').text(),
reportType : FW.Xpath('//meta[@name="citation_journal_title"]/@content|//meta[@name="series"]/@content').text().replace(/apers$/, "aper"),
place : FW.Xpath('//meta[@name="citation_publication_place"]/@content').text(),

hooks : { "scraperDone": function  (item,doc, url) {
	for (i in item.creators) {
		if (item.creators[i]  && !item.creators[i].firstName) {
	   	item.creators[i]= ZU.cleanAuthor(item.creators[i].lastName, "author")
		}
	}}
}
});


//Multi Idea
//searches
FW.MultiScraper({
itemType : 'multiple',
detect : FW.Url().match(/cgi-bin\/htsearch\?/),
choices : {
  titles : FW.Xpath('//dl/dt/a').text().trim(),
  urls : FW.Xpath('//dl/dt/a').key("href")
}
});

//collections
FW.MultiScraper({
itemType : 'multiple',
detect : FW.Xpath('//ul[contains(@class, "paperlist")]'),
choices : {
  titles : FW.Xpath('//ul[contains(@class, "paperlist")]/li/b/a').text().trim(),
  urls : FW.Xpath('//ul[contains(@class, "paperlist")]/li/b/a').key("href")
}
});/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://ideas.repec.org/cgi-bin/htsearch?q=informal+economy",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://ideas.repec.org/c/boc/bocode/s457392.html",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "MCMCLINEAR: Stata module for MCMC sampling of linear models",
				"creators": [
					{
						"firstName": "Sam",
						"lastName": "Schulhofer-Wohl",
						"creatorType": "author"
					}
				],
				"date": "2012/01/05",
				"abstractNote": "This package provides commands for Markov chain Monte Carlo (MCMC) sampling from the posterior distribution of linear models. Two models are provided in this version: a normal linear regression model (the Bayesian equivalent of regress), and a normal linear mixed model (the Bayesian equivalent of xtmixed).",
				"company": "Boston College Department of Economics",
				"libraryCatalog": "RePEc - IDEAS",
				"seriesTitle": "Statistical Software Components",
				"shortTitle": "MCMCLINEAR",
				"url": "https://ideas.repec.org/c/boc/bocode/s457392.html",
				"attachments": [
					{
						"url": false,
						"title": "RePEc PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "RePEc Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					" Markov Chain Monte Carlo",
					" linear models",
					" mixed models",
					" posterior distribution",
					" regression",
					"MCMC"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ideas.repec.org/a/rjr/romjef/vy2003i1p86-97.html#statistics",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Causes And Size Of Informal Economy In Romania",
				"creators": [
					{
						"firstName": "Elena",
						"lastName": "Pelinescu",
						"creatorType": "author"
					}
				],
				"date": "2003",
				"abstractNote": "The paper aims to analyze the causes or the motivations of the households’ informal economy activities and to estimate the size of the Romanian informal economy. Using data for Romania, it was found that people perceived high taxes as the main cause of the informal activities. The data suggested that the subsistence motive represented the main reason for the households’ decision to operate in the informal economy. It was found that 36.1% of the interviewed households had incomes from a secondary job in 1996. The size of informal economy appears as different because of the method used for computation.",
				"issue": "1",
				"libraryCatalog": "RePEc - IDEAS",
				"pages": "86-97",
				"publicationTitle": "Journal for Economic Forecasting",
				"url": "https://ideas.repec.org/a/rjr/romjef/vy2003i1p86-97.html#statistics",
				"attachments": [
					{
						"url": false,
						"title": "RePEc PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "RePEc Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					" decent income",
					" taxation",
					"informal economy"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ideas.repec.org/p/iza/izadps/dp6212.html",
		"items": [
			{
				"itemType": "report",
				"title": "How Immigrant Children Affect the Academic Achievement of Native Dutch Children",
				"creators": [
					{
						"firstName": "Asako",
						"lastName": "Ohinata",
						"creatorType": "author"
					},
					{
						"firstName": "Jan C.",
						"lastName": "van Ours",
						"creatorType": "author"
					}
				],
				"date": "2011",
				"abstractNote": "In this paper, we analyze how the share of immigrant children in the classroom affects the educational attainment of native Dutch children. Our analysis uses data from various sources, which allow us to characterize educational attainment in terms of reading literacy, mathematical skills and science skills. We do not find strong evidence of negative spill-over effects from immigrant children to native Dutch children. Immigrant children themselves experience negative language spill-over effects from a high share of immigrant children in the classroom but no spill-over effects on maths and science skills.",
				"institution": "Institute for the Study of Labor (IZA)",
				"libraryCatalog": "RePEc - IDEAS",
				"reportNumber": "6212",
				"reportType": "IZA Discussion Paper",
				"url": "https://ideas.repec.org/p/iza/izadps/dp6212.html",
				"attachments": [
					{
						"title": "RePEc PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "RePEc Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					" immigrant children",
					" peer effects",
					"educational attainment"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://ideas.repec.org/s/wbk/wbrwps.html",
		"items": "multiple"
	}
]
/** END TEST CASES **/