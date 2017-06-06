{
	"translatorID": "411f9a8b-64f3-4465-b7df-a3c988b602f3",
	"label": "RePEc - Econpapers",
	"creator": "Sebastian Karcher",
	"target": "^https?://econpapers\\.repec\\.org/",
	"minVersion": "1.0.0b4.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-12-27 20:18:46"
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
detect : FW.Xpath('//meta[@name="citation_journal_title"]'),
title : FW.Xpath('//meta[@name="citation_title"]/@content').text().trim(),
attachments : [{ url: FW.Xpath('//p/a[contains(@href, "scripts/redi") and contains(@href, ".pdf")]').text().trim(),
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


/** Working Papers*/
FW.Scraper({
itemType : 'report',
detect : FW.Xpath('//meta[@name="dc.Type" and contains(@content, "techreport")]|//meta[contains(@name, "technical_report")]'),
title : FW.Xpath('//meta[@name="citation_title"]/@content').text().trim(),
attachments : [{ url: FW.Xpath('//p/a[contains(@href, "scripts/redi") and contains(@href, ".pdf")]').text().trim(),
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
reportNumber: FW.Xpath('//meta[@name="citation_technical_report_number"]/@content').text(),
reportType : FW.Xpath('//meta[@name="series"]/@content').text().replace(/apers$/, "aper"),
place : FW.Xpath('//meta[@name="citation_publication_place"]/@content').text(),
numPages : FW.Xpath('//meta[@name="citation_number_of_pages"]/@content').text().remove(/\s\D*/),
hooks : { "scraperDone": function  (item,doc, url) {
	for (i in item.creators) {
		if (item.creators[i]  && !item.creators[i].firstName) {
	   	item.creators[i]= ZU.cleanAuthor(item.creators[i].lastName, "author")
		}
	}}
}
});

FW.Scraper({
itemType : 'computerProgram',
detect : FW.Xpath('//meta[@name="dc.Type" and contains(@content, "software")]'),
title : FW.Xpath('//meta[@name="citation_title"]/@content').text().trim(),
attachments : [{ url: FW.Xpath('//p/a[contains(@href, "scripts/redi") and contains(@href, ".pdf")]').text().trim(),
  title: "RePEc PDF",
  type: "application/pdf" },
  {url: FW.Url(),
  title: "RePEc Snapshot",
  type: "text/html"},
  ],
//make sure there are no empty authors:
creators : FW.Xpath('//meta[@name="citation_authors"]/@content').text().replace(/(;[^A-Za-z0-9]*)$/, "").split(/;/).cleanAuthor("author", "true"),
date : FW.Xpath('//meta[@name="citation_date"]/@content|//meta[@name="citation_year"]/@content').text(),
pages : FW.Xpath('concat(//meta[@name="citation_firstpage"]/@content, "-", //meta[@name="citation_lastpage"]/@content)').remove(/^-|-$/),
ISBN : FW.Xpath('//meta[@name="citation_isbn"]/@content').text(),
abstractNote: FW.Xpath('//meta[@name="citation_abstract"]/@content').text(),
DOI : FW.Xpath('//meta[@name="citation_doi"]/@content').text(),
programmingLanguage: FW.Xpath('//meta[@name="plang"]/@content').text().trim(),
seriesTitle: FW.Xpath('//meta[@name="series"]/@content').text().trim(),
language : FW.Xpath('//meta[@name="DC.Language"]/@content').text(),
tags :  FW.Xpath('//meta[@name="citation_keywords"]/@content').text().split(/;/),
publisher: FW.Xpath('//meta[@name="citation_publisher"]/@content|//meta[@name="citation_technical_report_institution"]/@content').text(),
place : FW.Xpath('//meta[@name="citation_publication_place"]/@content').text(),
version : FW.Xpath('//meta[@name="citation_software_version"]/@content').text(),
hooks : { "scraperDone": function  (item,doc, url) {
	for (i in item.creators) {
		if (item.creators[i]  && !item.creators[i].firstName) {
	   	item.creators[i]= ZU.cleanAuthor(item.creators[i].lastName, "author")
		}
	}}
}
});



//Multi Econpapers - this happens in frames - scaffold fails, regular testing works
FW.MultiScraper({
itemType : 'multiple',
detect : FW.Url().match(/scripts\/a\/abstract\.pf/),
choices : {
  titles : FW.Xpath('//div[@class="abstractframe"]//li/a').text().trim(),
  urls : FW.Xpath('//div[@class="abstractframe"]//li/a').key("href")
}
});

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://econpapers.repec.org/paper/nbrnberwo/11309.htm",
		"items": [
			{
				"itemType": "report",
				"title": "Does Voting Technology Affect Election Outcomes? Touch-screen Voting and the 2004 Presidential Election",
				"creators": [
					{
						"firstName": "David",
						"lastName": "Card",
						"creatorType": "author"
					},
					{
						"firstName": "Enrico",
						"lastName": "Moretti",
						"creatorType": "author"
					}
				],
				"date": "2005/05",
				"abstractNote": "Supporters of touch-screen voting claim it is a highly reliable voting technology, while a growing number of critics argue that paperless electronic voting systems are vulnerable to fraud. In this paper we use county-level data on voting technologies in the 2000 and 2004 presidential elections to test whether voting technology affects electoral outcomes. We first show that there is a positive correlation between use of touch-screen voting and the level of electoral support for George Bush. This is true in models that compare the 2000-2004 changes in vote shares between adopting and non-adopting counties within a state, after controlling for income, demographic composition, and other factors. Although small, the effect could have been large enough to influence the final results in some closely contested states. While on the surface this pattern would appear to be consistent with allegations of voting irregularities, a closer examination suggests this interpretation is incorrect. If irregularities did take place, they would be most likely in counties that could potentially affect statewide election totals, or in counties where election officials had incentives to affect the results. Contrary to this prediction, we find no evidence that touch-screen voting had a larger effect in swing states, or in states with a Republican Secretary of State. Touch-screen voting could also indirectly affect vote shares by influencing the relative turnout of different groups. We find that the adoption of touch-screen voting has a negative effect on estimated turnout rates, controlling for state effects and a variety of county-level controls. This effect is larger in counties with a higher fraction of Hispanic residents (who tend to favor Democrats) but not in counties with more African Americans (who are overwhelmingly Democrat voters). Models for the adoption of touch-screen voting suggest it was more likely to be used in counties with a higher fraction of Hispanic and Black residents, especially in swing states. Nevertheless, the impact of non-random adoption patterns on vote shares is small.",
				"institution": "National Bureau of Economic Research, Inc",
				"libraryCatalog": "RePEc - Econpapers",
				"reportNumber": "11309",
				"reportType": "NBER Working Paper",
				"shortTitle": "Does Voting Technology Affect Election Outcomes?",
				"url": "http://econpapers.repec.org/paper/nbrnberwo/11309.htm",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://econpapers.repec.org/software/bocbocode/s439301.htm",
		"items": [
			{
				"itemType": "computerProgram",
				"title": "ESTOUT: Stata module to make regression tables",
				"creators": [
					{
						"firstName": "Ben",
						"lastName": "Jann",
						"creatorType": "author"
					}
				],
				"date": "2017/02/02",
				"abstractNote": "estout produces a table of regression results from one or several models for use with spreadsheets, LaTeX, HTML, or a word-processor table. eststo stores a quick copy of the active estimation results for later tabulation. esttab is a wrapper for estout. It displays a pretty looking publication-style regression table without much typing. estadd adds additional results to the e()-returns for one or several models previously fitted and stored. This package subsumes the previously circulated esto, esta, estadd, and estadd_plus. An earlier version of estout is available as estout1.",
				"libraryCatalog": "RePEc - Econpapers",
				"seriesTitle": "Statistical Software Components",
				"shortTitle": "ESTOUT",
				"url": "http://econpapers.repec.org/software/bocbocode/s439301.htm",
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
					" HTML",
					" LaTeX",
					" output",
					" word processor",
					"estimates"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://econpapers.repec.org/article/emerafpps/v_3a9_3ay_3a2010_3ai_3a3_3ap_3a244-263.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The impact of changes in firm performance and risk on director turnover",
				"creators": [
					{
						"firstName": "Sharad",
						"lastName": "Asthana",
						"creatorType": "author"
					}
				],
				"date": "2010",
				"abstractNote": "Purpose - The purpose of this paper is to show that director turnover varies in predictable and intuitive ways with director incentives. Design/methodology/approach - The paper uses a sample of 51,388 observations pertaining to 13,084 directors who served 1,065 firms during the period 1997-2004. The data are obtained from RiskMetrics, Compustat, Execu-Comp, CRSP, IBES, and the Corporate Library databases. Portfolio analysis, logit, and GLIMMIX regression analysis are used for the tests. Findings - The paper provides evidence that directors are more likely to leave when firm performance deteriorates and the firm becomes riskier. While turnover increasing as firm performance deteriorates is consistent with involuntary turnover, directors are also more likely to leave in advance of deteriorating performance. The latter is consistent with directors having inside information and acting on that information to protect their wealth and reputation. When inside and outside director turnover is contrasted, the association between turnover and performance is stronger for inside directors. Research limitations - Since data are obtained from multiple databases, the sample may be biased in favor of larger firms. The results may, therefore, not be applicable to smaller firms. To the extent that the story is unable to differentiate between voluntary and involuntary director turnover, the results should be interpreted with caution. Originality/value - Even though extant research has looked extensively at the determinants of CEO turnover, little has been written on director turnover. Director turnover is an important topic to study, since directors, especially outside directors, possess a significant oversight role in the corporation.",
				"issue": "3",
				"libraryCatalog": "RePEc - Econpapers",
				"pages": "244-263",
				"publicationTitle": "Review of Accounting and Finance",
				"url": "http://econpapers.repec.org/article/emerafpps/v_3a9_3ay_3a2010_3ai_3a3_3ap_3a244-263.htm",
				"volume": "9",
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
					" Directors",
					" Employee turnover",
					" Risk analysis",
					"Company performance"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/