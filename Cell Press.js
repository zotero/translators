{
	"translatorID": "f26cfb71-efd7-47ae-a28c-d4d8852096bd",
	"label": "Cell Press",
	"creator": "Michael Berkowitz, Sebastian Karcher",
	"target": "^http://www\\.(cancercell|cell|cellhostandmicrobe|cellmetabolism|cellstemcell|chembiol|current-biology|developmentalcell|immunity|molecule|neuron|structure)\\.(org|com)",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsbv",
	"lastUpdated": "2012-04-24 07:31:00"
}

/* FW LINE 57:6869c32952b1 */ function flatten(c){var b=new Array();for(var d in c){var e=c[d];if(e instanceof Array){b=b.concat(flatten(e))}else{b.push(e)}}return b}var FW={_scrapers:new Array()};FW._Base=function(){this.callHook=function(b,c,e,a){if(typeof this["hooks"]==="object"){var d=this["hooks"][b];if(typeof d==="function"){d(c,e,a)}}};this.evaluateThing=function(f,e,c){var b=typeof f;if(b==="object"){if(f instanceof Array){var d=this.evaluateThing;var a=f.map(function(g){return d(g,e,c)});return flatten(a)}else{return f.evaluate(e,c)}}else{if(b==="function"){return f(e,c)}else{return f}}}};FW.Scraper=function(a){FW._scrapers.push(new FW._Scraper(a))};FW._Scraper=function(a){for(x in a){this[x]=a[x]}this._singleFieldNames=["abstractNote","applicationNumber","archive","archiveLocation","artworkMedium","artworkSize","assignee","audioFileType","audioRecordingType","billNumber","blogTitle","bookTitle","callNumber","caseName","code","codeNumber","codePages","codeVolume","committee","company","conferenceName","country","court","date","dateDecided","dateEnacted","dictionaryTitle","distributor","docketNumber","documentNumber","DOI","edition","encyclopediaTitle","episodeNumber","extra","filingDate","firstPage","forumTitle","genre","history","institution","interviewMedium","ISBN","ISSN","issue","issueDate","issuingAuthority","journalAbbreviation","label","language","legalStatus","legislativeBody","letterType","libraryCatalog","manuscriptType","mapType","medium","meetingName","nameOfAct","network","number","numberOfVolumes","numPages","pages","patentNumber","place","postType","presentationType","priorityNumbers","proceedingsTitle","programTitle","programmingLanguage","publicLawNumber","publicationTitle","publisher","references","reportNumber","reportType","reporter","reporterVolume","rights","runningTime","scale","section","series","seriesNumber","seriesText","seriesTitle","session","shortTitle","studio","subject","system","thesisType","title","type","university","url","version","videoRecordingType","volume","websiteTitle","websiteType"];this._makeAttachments=function(p,b,g,t){if(g instanceof Array){g.forEach(function(k){this._makeAttachments(p,b,k,t)},this)}else{if(typeof g==="object"){var o=g.urls||g.url;var m=g.types||g.type;var f=g.titles||g.title;var q=g.snapshots||g.snapshot;var j=this.evaluateThing(o,p,b);var n=this.evaluateThing(f,p,b);var s=this.evaluateThing(m,p,b);var d=this.evaluateThing(q,p,b);if(!(j instanceof Array)){j=[j]}for(var l in j){var c=j[l];var h;var e;var r;if(s instanceof Array){h=s[l]}else{h=s}if(n instanceof Array){e=n[l]}else{e=n}if(d instanceof Array){r=d[l]}else{r=d}t.attachments.push({url:c,title:e,type:h,snapshot:r})}}}};if(this.itemTrans!==undefined){this.makeItems=this.itemTrans.makeItems}else{this.makeItems=function(o,b,m,c,l){var q=new Zotero.Item(this.itemType);q.url=b;for(var h in this._singleFieldNames){var n=this._singleFieldNames[h];if(this[n]){var g=this.evaluateThing(this[n],o,b);if(g instanceof Array){q[n]=g[0]}else{q[n]=g}}}var r=["creators","tags"];for(var f in r){var p=r[f];var d=this.evaluateThing(this[p],o,b);if(d){for(var e in d){q[p].push(d[e])}}}this._makeAttachments(o,b,this["attachments"],q);c(q,this,o,b);l([q])}}};FW._Scraper.prototype=new FW._Base;FW.MultiScraper=function(a){FW._scrapers.push(new FW._MultiScraper(a))};FW._MultiScraper=function(a){for(x in a){this[x]=a[x]}this._mkSelectItems=function(e,d){var b=new Object;for(var c in e){b[d[c]]=e[c]}return b};this._selectItems=function(d,c,e){var b=new Array();Zotero.selectItems(this._mkSelectItems(d,c),function(f){for(var g in f){b.push(g)}e(b)})};this._mkAttachments=function(g,d,f){var b=this.evaluateThing(this["attachments"],g,d);var c=new Object();if(b){for(var e in f){c[f[e]]=b[e]}}return c};this._makeChoices=function(f,p,c,d,h){if(f instanceof Array){f.forEach(function(k){this._makeTitlesUrls(k,p,c,d,h)},this)}else{if(typeof f==="object"){var m=f.urls||f.url;var e=f.titles||f.title;var n=this.evaluateThing(m,p,c);var j=this.evaluateThing(e,p,c);var l=(j instanceof Array);if(!(n instanceof Array)){n=[n]}for(var g in n){var b=n[g];var o;if(l){o=j[g]}else{o=j}h.push(b);d.push(o)}}}};this.makeItems=function(j,b,g,c,f){if(this.beforeFilter){var k=this.beforeFilter(j,b);if(k!=b){this.makeItems(j,k,g,c,f);return}}var e=[];var h=[];this._makeChoices(this["choices"],j,b,e,h);var d=this._mkAttachments(j,b,h);this._selectItems(e,h,function(m){if(!m){f([])}else{var l=[];var n=this.itemTrans;Zotero.Utilities.processDocuments(m,function(q){var p=q.documentURI;var o=n;if(o===undefined){o=FW.getScraper(q,p)}if(o===undefined){}else{o.makeItems(q,p,d[p],function(r){l.push(r);c(r,o,q,p)},function(){})}},function(){f(l)})}})}};FW._MultiScraper.prototype=new FW._Base;FW.DelegateTranslator=function(a){return new FW._DelegateTranslator(a)};FW._DelegateTranslator=function(a){for(x in a){this[x]=a[x]}this._translator=Zotero.loadTranslator(this.translatorType);this._translator.setTranslator(this.translatorId);this.makeItems=function(g,d,b,f,c){var e;Zotero.Utilities.HTTP.doGet(d,function(h){this._translator.setHandler("itemDone",function(k,j){e=j;if(b){j.attachments=b}});if(this.preProcess){h=this.preProcess(h)}this._translator.setString(h);this._translator.translate();f(e)},function(){c([e])})}};FW.DelegateTranslator.prototype=new FW._Scraper;FW._StringMagic=function(){this._filters=new Array();this.addFilter=function(a){this._filters.push(a);return this};this.split=function(a){return this.addFilter(function(b){return b.split(a).filter(function(c){return(c!="")})})};this.replace=function(c,b,a){return this.addFilter(function(d){if(d.match(c)){return d.replace(c,b,a)}else{return d}})};this.prepend=function(a){return this.replace(/^/,a)};this.append=function(a){return this.replace(/$/,a)};this.remove=function(b,a){return this.replace(b,"",a)};this.trim=function(){return this.addFilter(function(a){return Zotero.Utilities.trim(a)})};this.trimInternal=function(){return this.addFilter(function(a){return Zotero.Utilities.trimInternal(a)})};this.match=function(a,b){if(!b){b=0}return this.addFilter(function(d){var c=d.match(a);if(c===undefined||c===null){return undefined}else{return c[b]}})};this.cleanAuthor=function(b,a){return this.addFilter(function(c){return Zotero.Utilities.cleanAuthor(c,b,a)})};this.key=function(a){return this.addFilter(function(b){return b[a]})};this.capitalizeTitle=function(){if(arguments.length>0&&arguments[0]==true){return this.addFilter(function(a){return Zotero.Utilities.capitalizeTitle(a,true)})}else{return this.addFilter(function(a){return Zotero.Utilities.capitalizeTitle(a)})}};this.unescapeHTML=function(){return this.addFilter(function(a){return Zotero.Utilities.unescapeHTML(a)})};this.unescape=function(){return this.addFilter(function(a){return unescape(a)})};this._applyFilters=function(c,e){for(i in this._filters){c=flatten(c);c=c.filter(function(a){return((a!==undefined)&&(a!==null))});for(var d=0;d<c.length;d++){try{if((c[d]===undefined)||(c[d]===null)){continue}else{c[d]=this._filters[i](c[d],e)}}catch(b){c[d]=undefined;Zotero.debug("Caught exception "+b+"on filter: "+this._filters[i])}}c=c.filter(function(a){return((a!==undefined)&&(a!==null))})}return flatten(c)}};FW.PageText=function(){return new FW._PageText()};FW._PageText=function(){this._filters=new Array();this.evaluate=function(c){var b=[c.documentElement.innerHTML];b=this._applyFilters(b,c);if(b.length==0){return false}else{return b}}};FW._PageText.prototype=new FW._StringMagic();FW.Url=function(){return new FW._Url()};FW._Url=function(){this._filters=new Array();this.evaluate=function(d,c){var b=[c];b=this._applyFilters(b,d);if(b.length==0){return false}else{return b}}};FW._Url.prototype=new FW._StringMagic();FW.Xpath=function(a){return new FW._Xpath(a)};FW._Xpath=function(a){this._xpath=a;this._filters=new Array();this.text=function(){var b=function(c){if(typeof c==="object"&&c.textContent){return c.textContent}else{return c}};this.addFilter(b);return this};this.sub=function(b){var c=function(f,e){var d=e.evaluate(b,f,null,XPathResult.ANY_TYPE,null);if(d){return d.iterateNext()}else{return undefined}};this.addFilter(c);return this};this.evaluate=function(f){var e=f.evaluate(this._xpath,f,null,XPathResult.ANY_TYPE,null);var d=e.resultType;var c=new Array();if(d==XPathResult.STRING_TYPE){c.push(e.stringValue)}else{if(d==XPathResult.ORDERED_NODE_ITERATOR_TYPE||d==XPathResult.UNORDERED_NODE_ITERATOR_TYPE){var b;while((b=e.iterateNext())){c.push(b)}}}c=this._applyFilters(c,f);if(c.length==0){return false}else{return c}}};FW._Xpath.prototype=new FW._StringMagic();FW.detectWeb=function(e,b){for(var c in FW._scrapers){var d=FW._scrapers[c];var f=d.evaluateThing(d.itemType,e,b);var a=d.evaluateThing(d.detect,e,b);if(a.length>0&&a[0]){return f}}return undefined};FW.getScraper=function(b,a){var c=FW.detectWeb(b,a);return FW._scrapers.filter(function(d){return(d.evaluateThing(d.itemType,b,a)==c)&&(d.evaluateThing(d.detect,b,a))})[0]};FW.doWeb=function(c,a){var b=FW.getScraper(c,a);b.makeItems(c,a,[],function(f,e,g,d){e.callHook("scraperDone",f,g,d);if(!f.title){f.title=""}f.complete()},function(){Zotero.done()});Zotero.wait()};
/*
Cell Journals Translator
Copyright (C) 2011 Sebastian Karcher

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

/** Articles */
FW.Scraper({
itemType : 'journalArticle',
detect : FW.Xpath('//meta[@name="citation_journal_title"]'),
title : FW.Xpath('//meta[@name="citation_title"]/@content').text().trim(),
attachments : [{ url: FW.Xpath('//meta[@name="citation_pdf_url"]/@content').text().trim(),
  title: "Cell Journal PDF",
  type: "application/pdf" },
  {url: FW.Xpath('//meta[@name="citation_abstract_html_url"]/@content').text(),
  title: "Cell Journal Snapshot",
  type: "text/html",
  snapshot: true}
  ],
//make sure there are no empty authors:
creators : FW.Xpath('//meta[@name="citation_author"]/@content').text().cleanAuthor("author"),
date : FW.Xpath('//meta[@name="citation_date"]/@content').text(),
issue : FW.Xpath('//meta[@name="citation_issue"]/@content').text(),
volume : FW.Xpath('//meta[@name="citation_volume"]/@content').text(),
pages : FW.Xpath('concat(//meta[@name="citation_firstpage"]/@content, "-", //meta[@name="citation_lastpage"]/@content)').remove(/^-|-$/),
ISSN : FW.Xpath('//meta[@name="citation_issn"]/@content').text(),
abstractNote: FW.Xpath('//meta[@name="description"]/@content').text(),
journalAbbreviation : FW.Xpath('//meta[@name="citation_journal_abbrev"]/@content').text(),
DOI : FW.Xpath('//meta[@name="citation_doi"]/@content').text(),
language : FW.Xpath('//meta[@name="DC.Language"]/@content').text(),
publicationTitle : FW.Xpath('//meta[@name="citation_journal_title"]/@content').text()
});


FW.MultiScraper({
itemType : 'multiple',
detect : FW.Url().match(/searchresults\?/),
choices : {
  titles : FW.Xpath('//table[@id="search_results"]//tr[contains(@class, "shade") and .//a[contains(@href, "abstract")]]//strong').text().trim(),
  urls : FW.Xpath('//table[@id="search_results"]//tr[contains(@class, "shade")]//a[contains(@href, "abstract")]').key("href")
}
});


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.cell.com/searchresults?searchText=brain&submit_search=Search&searchBy=fulltext",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.cell.com/abstract/S0092-8674(11)00581-2",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Daniel",
						"lastName": "Zwilling",
						"creatorType": "author"
					},
					{
						"firstName": "Shao-Yi",
						"lastName": "Huang",
						"creatorType": "author"
					},
					{
						"firstName": "Korrapati V.",
						"lastName": "Sathyasaikumar",
						"creatorType": "author"
					},
					{
						"firstName": "Francesca M.",
						"lastName": "Notarangelo",
						"creatorType": "author"
					},
					{
						"firstName": "Paolo",
						"lastName": "Guidetti",
						"creatorType": "author"
					},
					{
						"firstName": "Hui-Qiu",
						"lastName": "Wu",
						"creatorType": "author"
					},
					{
						"firstName": "Jason",
						"lastName": "Lee",
						"creatorType": "author"
					},
					{
						"firstName": "Jennifer",
						"lastName": "Truong",
						"creatorType": "author"
					},
					{
						"firstName": "Yaisa",
						"lastName": "Andrews-Zwilling",
						"creatorType": "author"
					},
					{
						"firstName": "Eric W.",
						"lastName": "Hsieh",
						"creatorType": "author"
					},
					{
						"firstName": "Jamie Y.",
						"lastName": "Louie",
						"creatorType": "author"
					},
					{
						"firstName": "Tiffany",
						"lastName": "Wu",
						"creatorType": "author"
					},
					{
						"firstName": "Kimberly",
						"lastName": "Scearce-Levie",
						"creatorType": "author"
					},
					{
						"firstName": "Christina",
						"lastName": "Patrick",
						"creatorType": "author"
					},
					{
						"firstName": "Anthony",
						"lastName": "Adame",
						"creatorType": "author"
					},
					{
						"firstName": "Flaviano",
						"lastName": "Giorgini",
						"creatorType": "author"
					},
					{
						"firstName": "Saliha",
						"lastName": "Moussaoui",
						"creatorType": "author"
					},
					{
						"firstName": "Grit",
						"lastName": "Laue",
						"creatorType": "author"
					},
					{
						"firstName": "Arash",
						"lastName": "Rassoulpour",
						"creatorType": "author"
					},
					{
						"firstName": "Gunnar",
						"lastName": "Flik",
						"creatorType": "author"
					},
					{
						"firstName": "Yadong",
						"lastName": "Huang",
						"creatorType": "author"
					},
					{
						"firstName": "Joseph M.",
						"lastName": "Muchowski",
						"creatorType": "author"
					},
					{
						"firstName": "Eliezer",
						"lastName": "Masliah",
						"creatorType": "author"
					},
					{
						"firstName": "Robert",
						"lastName": "Schwarcz",
						"creatorType": "author"
					},
					{
						"firstName": "Paul J.",
						"lastName": "Muchowski",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Cell Journal PDF",
						"type": "application/pdf"
					},
					{
						"title": "Cell Journal Snapshot",
						"type": "text/html"
					}
				],
				"url": "http://www.cell.com/abstract/S0092-8674(11)00581-2",
				"date": "June 10 2011",
				"DOI": "10.1016/j.cell.2011.05.020",
				"ISSN": "0092-8674",
				"issue": "6",
				"pages": "863-874",
				"publicationTitle": "Cell",
				"title": "Kynurenine 3-Monooxygenase Inhibition in Blood Ameliorates Neurodegeneration",
				"volume": "145",
				"libraryCatalog": "Cell Press",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/