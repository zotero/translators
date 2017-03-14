{
	"translatorID": "b104127-1f09-401e-a14a-f7c4377b6f62",
	"label": "Blouin Artinfo",
	"creator": "czar",
	"target": "^https?://((www|blogs)\\.)?(artinfo|blouinartinfo)\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2017-03-14 21:48:09"
}

/* FW LINE 59:b820c6d */ function flatten(t){var e=new Array;for(var i in t){var r=t[i];r instanceof Array?e=e.concat(flatten(r)):e.push(r)}return e}var FW={_scrapers:new Array};FW._Base=function(){this.callHook=function(t,e,i,r){if("object"==typeof this.hooks){var n=this.hooks[t];"function"==typeof n&&n(e,i,r)}},this.evaluateThing=function(t,e,i){var r=typeof t;if("object"===r){if(t instanceof Array){var n=this.evaluateThing,a=t.map(function(t){return n(t,e,i)});return flatten(a)}return t.evaluate(e,i)}return"function"===r?t(e,i):t},this.makeItems=function(t,e,i,r,n){n()}},FW.Scraper=function(t){FW._scrapers.push(new FW._Scraper(t))},FW._Scraper=function(t){for(x in t)this[x]=t[x];this._singleFieldNames=["abstractNote","applicationNumber","archive","archiveLocation","artworkMedium","artworkSize","assignee","audioFileType","audioRecordingType","billNumber","blogTitle","bookTitle","callNumber","caseName","code","codeNumber","codePages","codeVolume","committee","company","conferenceName","country","court","date","dateDecided","dateEnacted","dictionaryTitle","distributor","docketNumber","documentNumber","DOI","edition","encyclopediaTitle","episodeNumber","extra","filingDate","firstPage","forumTitle","genre","history","institution","interviewMedium","ISBN","ISSN","issue","issueDate","issuingAuthority","journalAbbreviation","label","language","legalStatus","legislativeBody","letterType","libraryCatalog","manuscriptType","mapType","medium","meetingName","nameOfAct","network","number","numberOfVolumes","numPages","pages","patentNumber","place","postType","presentationType","priorityNumbers","proceedingsTitle","programTitle","programmingLanguage","publicLawNumber","publicationTitle","publisher","references","reportNumber","reportType","reporter","reporterVolume","rights","runningTime","scale","section","series","seriesNumber","seriesText","seriesTitle","session","shortTitle","studio","subject","system","thesisType","title","type","university","url","version","videoRecordingType","volume","websiteTitle","websiteType"],this._makeAttachments=function(t,e,i,r){if(i instanceof Array)i.forEach(function(i){this._makeAttachments(t,e,i,r)},this);else if("object"==typeof i){var n=i.urls||i.url,a=i.types||i.type,s=i.titles||i.title,o=i.snapshots||i.snapshot,u=this.evaluateThing(n,t,e),l=this.evaluateThing(s,t,e),c=this.evaluateThing(a,t,e),h=this.evaluateThing(o,t,e);u instanceof Array||(u=[u]);for(var f in u){var p,m,v,d=u[f];p=c instanceof Array?c[f]:c,m=l instanceof Array?l[f]:l,v=h instanceof Array?h[f]:h,r.attachments.push({url:d,title:m,mimeType:p,snapshot:v})}}},this.makeItems=function(t,e,i,r,n){var a=new Zotero.Item(this.itemType);a.url=e;for(var s in this._singleFieldNames){var o=this._singleFieldNames[s];if(this[o]){var u=this.evaluateThing(this[o],t,e);u instanceof Array?a[o]=u[0]:a[o]=u}}var l=["creators","tags"];for(var c in l){var h=l[c],f=this.evaluateThing(this[h],t,e);if(f)for(var p in f)a[h].push(f[p])}this._makeAttachments(t,e,this.attachments,a),r(a,this,t,e),n()}},FW._Scraper.prototype=new FW._Base,FW.MultiScraper=function(t){FW._scrapers.push(new FW._MultiScraper(t))},FW._MultiScraper=function(t){for(x in t)this[x]=t[x];this._mkSelectItems=function(t,e){var i=new Object;for(var r in t)i[e[r]]=t[r];return i},this._selectItems=function(t,e,i){var r=new Array;Zotero.selectItems(this._mkSelectItems(t,e),function(t){for(var e in t)r.push(e);i(r)})},this._mkAttachments=function(t,e,i){var r=this.evaluateThing(this.attachments,t,e),n=new Object;if(r)for(var a in i)n[i[a]]=r[a];return n},this._makeChoices=function(t,e,i,r,n){if(t instanceof Array)t.forEach(function(t){this._makeTitlesUrls(t,e,i,r,n)},this);else if("object"==typeof t){var a=t.urls||t.url,s=t.titles||t.title,o=this.evaluateThing(a,e,i),u=this.evaluateThing(s,e,i),l=u instanceof Array;o instanceof Array||(o=[o]);for(var c in o){var h,f=o[c];h=l?u[c]:u,n.push(f),r.push(h)}}},this.makeItems=function(t,e,i,r,n){if(this.beforeFilter){var a=this.beforeFilter(t,e);if(a!=e)return void this.makeItems(t,a,i,r,n)}var s=[],o=[];this._makeChoices(this.choices,t,e,s,o);var u=this._mkAttachments(t,e,o),l=this.itemTrans;this._selectItems(s,o,function(t){if(t){var e=function(t){var e=t.documentURI,i=l;void 0===i&&(i=FW.getScraper(t,e)),void 0===i||i.makeItems(t,e,u[e],r,function(){})};Zotero.Utilities.processDocuments(t,e,n)}else n()})}},FW._MultiScraper.prototype=new FW._Base,FW.WebDelegateTranslator=function(t){return new FW._WebDelegateTranslator(t)},FW._WebDelegateTranslator=function(t){for(x in t)this[x]=t[x];this.makeItems=function(t,e,i,r,n){var a=this,s=Zotero.loadTranslator("web");s.setHandler("itemDone",function(i,n){r(n,a,t,e)}),s.setDocument(t),this.translatorId?(s.setTranslator(this.translatorId),s.translate()):(s.setHandler("translators",function(t,e){e.length&&(s.setTranslator(e[0]),s.translate())}),s.getTranslators()),n()}},FW._WebDelegateTranslator.prototype=new FW._Base,FW._StringMagic=function(){this._filters=new Array,this.addFilter=function(t){return this._filters.push(t),this},this.split=function(t){return this.addFilter(function(e){return e.split(t).filter(function(t){return""!=t})})},this.replace=function(t,e,i){return this.addFilter(function(r){return r.match(t)?r.replace(t,e,i):r})},this.prepend=function(t){return this.replace(/^/,t)},this.append=function(t){return this.replace(/$/,t)},this.remove=function(t,e){return this.replace(t,"",e)},this.trim=function(){return this.addFilter(function(t){return Zotero.Utilities.trim(t)})},this.trimInternal=function(){return this.addFilter(function(t){return Zotero.Utilities.trimInternal(t)})},this.match=function(t,e){return e||(e=0),this.addFilter(function(i){var r=i.match(t);return void 0===r||null===r?void 0:r[e]})},this.cleanAuthor=function(t,e){return this.addFilter(function(i){return Zotero.Utilities.cleanAuthor(i,t,e)})},this.key=function(t){return this.addFilter(function(e){return e[t]})},this.capitalizeTitle=function(){return this.addFilter(function(t){return Zotero.Utilities.capitalizeTitle(t)})},this.unescapeHTML=function(){return this.addFilter(function(t){return Zotero.Utilities.unescapeHTML(t)})},this.unescape=function(){return this.addFilter(function(t){return unescape(t)})},this._applyFilters=function(t,e){for(i in this._filters){t=flatten(t),t=t.filter(function(t){return void 0!==t&&null!==t});for(var r=0;r<t.length;r++)try{if(void 0===t[r]||null===t[r])continue;t[r]=this._filters[i](t[r],e)}catch(n){t[r]=void 0,Zotero.debug("Caught exception "+n+"on filter: "+this._filters[i])}t=t.filter(function(t){return void 0!==t&&null!==t})}return flatten(t)}},FW.PageText=function(){return new FW._PageText},FW._PageText=function(){this._filters=new Array,this.evaluate=function(t){var e=[t.documentElement.innerHTML];return e=this._applyFilters(e,t),0==e.length?!1:e}},FW._PageText.prototype=new FW._StringMagic,FW.Url=function(){return new FW._Url},FW._Url=function(){this._filters=new Array,this.evaluate=function(t,e){var i=[e];return i=this._applyFilters(i,t),0==i.length?!1:i}},FW._Url.prototype=new FW._StringMagic,FW.Xpath=function(t){return new FW._Xpath(t)},FW._Xpath=function(t){this._xpath=t,this._filters=new Array,this.text=function(){var t=function(t){return"object"==typeof t&&t.textContent?t.textContent:t};return this.addFilter(t),this},this.sub=function(t){var e=function(e,i){var r=i.evaluate(t,e,null,XPathResult.ANY_TYPE,null);return r?r.iterateNext():void 0};return this.addFilter(e),this},this.evaluate=function(t){var e=t.evaluate(this._xpath,t,null,XPathResult.ANY_TYPE,null),i=e.resultType,r=new Array;if(i==XPathResult.STRING_TYPE)r.push(e.stringValue);else if(i==XPathResult.BOOLEAN_TYPE)r.push(e.booleanValue);else if(i==XPathResult.NUMBER_TYPE)r.push(e.numberValue);else if(i==XPathResult.ORDERED_NODE_ITERATOR_TYPE||i==XPathResult.UNORDERED_NODE_ITERATOR_TYPE)for(var n;n=e.iterateNext();)r.push(n);return r=this._applyFilters(r,t),0==r.length?!1:r}},FW._Xpath.prototype=new FW._StringMagic,FW.detectWeb=function(t,e){for(var i in FW._scrapers){var r=FW._scrapers[i],n=r.evaluateThing(r.itemType,t,e),a=r.evaluateThing(r.detect,t,e);if(a.length>0&&a[0])return n}},FW.getScraper=function(t,e){var i=FW.detectWeb(t,e);return FW._scrapers.filter(function(r){return r.evaluateThing(r.itemType,t,e)==i&&r.evaluateThing(r.detect,t,e)})[0]},FW.doWeb=function(t,e){var i=FW.getScraper(t,e);i.makeItems(t,e,[],function(t,e,i,r){e.callHook("scraperDone",t,i,r),t.title||(t.title=""),t.complete()},function(){Zotero.done()}),Zotero.wait()};
/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 czar
	http://en.wikipedia.org/wiki/User_talk:Czar

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

FW.Scraper({
itemType         : 'blogPost',
detect           : FW.Url().match(/\/news\/story\//),
title            : FW.Xpath('//h1[@itemprop="name headline"]').text(),
attachments      : [{ url: FW.Url(),
  title:  "Artinfo snapshot",
  type: "text/html" }],
creators         : FW.Xpath('//span[@itemprop="author"]/span').text().cleanAuthor("author"),
date             : FW.Xpath('//span[@itemprop="datePublished"]').text(),
blogTitle        : "Blouin Artinfo",
language         : "en-US",
abstractNote     : FW.Xpath('//meta[@property="og:description"]/@content').text(),
hooks : { "scraperDone": function  (item,doc,url) {
	if ( (item.creators.length > 0) && (item.creators[0].lastName == "ARTINFO") ) {
		item.creators.pop(); // treat "Blouin Artinfo" author as having no named author	
	}
}}
});

FW.Scraper({
itemType         : 'blogPost',
detect           : FW.Url().match(/blogs\.artinfo\.com/),
title            : FW.Xpath('//h1[@itemprop="headline"]').text(),
attachments      : [{ url: FW.Url(),
  title:  "Blouin Artinfo snapshot",
  type: "text/html" }],
creators         : FW.Xpath('//section[@itemprop="articleBody"]/p[@style="text-align: right"]').text().replace(/—\s((\w+\s?)+\w).*/,"$1").cleanAuthor("author"), // blog byline only on "intheair" articles, rest have no attribution – http://regexr.com/3fguh
date             : FW.Xpath('//time/@datetime').text(),
blogTitle        : "Blouin Artinfo",
language         : "en-US",
abstractNote     : FW.Xpath('//meta[@name="Description"]/@content').text()
});

FW.MultiScraper({
itemType         : 'multiple',
detect           : FW.Url().match(/\/(visual-arts|architecture-design|performing-arts|lifestyle|travel)/), // doesn't handle galleryguide or lifestyle-picks, but I can add this later
choices          : {
  titles  :  FW.Xpath('//div[@class="title" or @class="views-field-php"]//a').text().trim(),
  urls    :  FW.Xpath('//div[@class="title" or @class="views-field-php"]//a').key("href").trim()
}
});
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://blogs.artinfo.com/artintheair/2013/05/01/the-hood-museum-at-dartmouth-has-hired-its-first-curator-of-african-art/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "The Hood Museum at Dartmouth Has Hired its First Curator of African Art",
				"creators": [
					{
						"firstName": "Benjamin",
						"lastName": "Sutton",
						"creatorType": "author"
					}
				],
				"date": "2013-05-1",
				"abstractNote": "In the Air - Art News & Gossip",
				"blogTitle": "Blouin Artinfo",
				"language": "en-US",
				"url": "http://blogs.artinfo.com/artintheair/2013/05/01/the-hood-museum-at-dartmouth-has-hired-its-first-curator-of-african-art/",
				"attachments": [
					{
						"title": "Blouin Artinfo snapshot",
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
		"url": "http://blogs.artinfo.com/artintheair/2016/09/07/art-basel-miami-announces-2016-exhibitor-list/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Art Basel in Miami Beach Announces 2016 Exhibitor List",
				"creators": [
					{
						"firstName": "Taylor",
						"lastName": "Dafoe",
						"creatorType": "author"
					}
				],
				"date": "2016-09-7",
				"abstractNote": "In the Air - Art News & Gossip",
				"blogTitle": "Blouin Artinfo",
				"language": "en-US",
				"url": "http://blogs.artinfo.com/artintheair/2016/09/07/art-basel-miami-announces-2016-exhibitor-list/",
				"attachments": [
					{
						"title": "Blouin Artinfo snapshot",
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
		"url": "http://blogs.artinfo.com/silhouettes/2016/06/20/hermess-window-dressing-as-an-art-opens-in-france/",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Hermès’s Window Dressing as an Art Opens in France",
				"creators": [],
				"date": "2016-06-20",
				"abstractNote": "Silhouettes - Fashion & Style News",
				"blogTitle": "Blouin Artinfo",
				"language": "en-US",
				"url": "http://blogs.artinfo.com/silhouettes/2016/06/20/hermess-window-dressing-as-an-art-opens-in-france/",
				"attachments": [
					{
						"title": "Blouin Artinfo snapshot",
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
		"url": "http://www.blouinartinfo.com/news/story/1959894/diebedo-francis-kere-designs-2017-serpentine-pavilion",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Diébédo Francis Kéré Designs 2017 Serpentine Pavilion",
				"creators": [
					{
						"firstName": "Nicholas",
						"lastName": "Forrest",
						"creatorType": "author"
					}
				],
				"abstractNote": "London’s Serpentine Galleries has announced that Diébédo Francis Kéré, Principal of Berlin-based Kéré Architecture, has been commissioned to design the 2017 Serpentine Pavilion.",
				"blogTitle": "Blouin Artinfo",
				"date": "February 27, 2017",
				"language": "en-US",
				"url": "http://www.blouinartinfo.com/news/story/1959894/diebedo-francis-kere-designs-2017-serpentine-pavilion",
				"attachments": [
					{
						"title": "Artinfo snapshot",
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
		"url": "http://www.blouinartinfo.com/news/story/2003327/to-view-a-world-within-a-grain-of-sand-at-sakura-city-museum",
		"items": [
			{
				"itemType": "blogPost",
				"title": "'To View a World Within a Grain of Sand' at Sakura City Museum of Art, Tokyo ",
				"creators": [],
				"blogTitle": "Blouin Artinfo",
				"date": "March 14, 2017",
				"abstractNote": "Sakura City Museum of Art is currently hosting the &quot;To View a World within a Grain of Sand&quot; exhibition, on view through March 28, 2017.",
				"language": "en-US",
				"url": "http://www.blouinartinfo.com/news/story/2003327/to-view-a-world-within-a-grain-of-sand-at-sakura-city-museum",
				"attachments": [
					{
						"title": "Artinfo snapshot",
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
		"url": "http://www.blouinartinfo.com/visual-arts/contemporary-arts",
		"items": "multiple"
	}
]
/** END TEST CASES **/
