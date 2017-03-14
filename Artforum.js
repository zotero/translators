{
	"translatorID": "a127f012-4ea4-4d05-a657-24d47f91b016",
	"label": "Artforum",
	"creator": "czar",
	"target": "^https?://(www\\.)?artforum\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2017-03-14 23:11:18"
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
detect           : FW.Url().match(/\/news\//),
title            : FW.Xpath('//meta[@property="og:title"]/@content').text(),
attachments      : [{ url: FW.Url(),
  title:  "Artforum snapshot",
  type: "text/html" }],
date             : FW.Xpath('//div[@id="NewsContent"]/h6').text().replace(/POSTED\s/,""),
blogTitle        : "Artforum",
language         : "en-US",
abstractNote     : FW.Xpath('//meta[@property="og:description"]/@content').text()
});

FW.Scraper({
itemType         : 'blogPost',
detect           : FW.Url().match(/\/(diary|picks|video|film|passages|slant|museums|words)\/id=/),
title            : FW.Xpath('//meta[@property="og:title"]/@content').text(),
attachments      : [{ url: FW.Url(),
  title:  "Artforum snapshot",
  type: "text/html" }],
creators         : FW.Xpath('//meta[@name="author"]/@content').text().replace(/As told to\s/,"").cleanAuthor("author"), // /words/ uses "As told to" in the byline metadata, and better to regex it out than to pull from the HTML instead
date             : FW.Xpath('//div[@class="Topper"]/h6').text().replace(/(\d{2})\.(\d{2})\.(\d{2})/, "20$3-$1-$2,"),
blogTitle        : "Artforum",
language         : "en-US",
abstractNote     : FW.Xpath('//meta[@property="og:description"]/@content').text()
});

FW.Scraper({
itemType         : 'magazineArticle',
detect           : FW.Url().match(/\/inprint\/issue=\d{6}&id=/),
title            : FW.Xpath('//div[@class="Text"]/h1').text(),
attachments      : [{ url: FW.Url(),
  title:  "Artforum snapshot",
  type: "text/html" }],
creators         : FW.Xpath('//meta[@name="author"]/@content').text().cleanAuthor("author"),
date             : FW.Xpath('//div[@class="Text"]/h6').text(),
blogTitle        : "Artforum",
language         : "en-US",
abstractNote     : FW.Xpath('//meta[@property="og:description"]/@content').text()
});

FW.MultiScraper({
itemType         : 'multiple',
detect           : FW.Url().match(/\/search\//),
choices          : {
  titles  :  FW.Xpath('//p[@class="Title"]/a').text().trim(),
  urls    :  FW.Xpath('//p[@class="Title"]/a').key("href").trim()
}
});
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.artforum.com/news/id=40747",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Ugochukwu-Smooth Nzewi Appointed Curator of Hood Museum",
				"creators": [],
				"date": "May 6, 2013",
				"abstractNote": "The Hood Museum of Art at Dartmouth College, Hanover, has appointed Ugochukwu-Smooth Nzewi as its first curator of African Art, reports Artdaily. Born in Nigeria,",
				"blogTitle": "Artforum",
				"language": "en-US",
				"url": "https://www.artforum.com/news/id=40747",
				"attachments": [
					{
						"title": "Artforum snapshot",
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
		"url": "https://www.artforum.com/diary/id=63626",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Kaitlin Phillips at the 11th New York Art Book Fair",
				"creators": [
					{
						"firstName": "Kaitlin",
						"lastName": "Phillips",
						"creatorType": "author"
					}
				],
				"date": "2016-09-22,",
				"abstractNote": "LAST THURSDAY, at the opening night preview of Printed Matter’s NY Book Fair at MoMA PS1, in the popup white dome in the courtyard, at one of the end-to-end",
				"blogTitle": "Artforum",
				"language": "en-US",
				"url": "https://www.artforum.com/diary/id=63626",
				"attachments": [
					{
						"title": "Artforum snapshot",
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
		"url": "https://www.artforum.com/picks/id=62421",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Alex Da Corte at Art + Practice",
				"creators": [
					{
						"firstName": "Aria",
						"lastName": "Dean",
						"creatorType": "author"
					}
				],
				"abstractNote": "As you enter this space, your senses are bombarded by Alex Da Corte’s scrambled, saturated landscape. A supersized witch’s hat fills the first area, lit by green",
				"blogTitle": "Artforum",
				"language": "en-US",
				"url": "https://www.artforum.com/picks/id=62421",
				"attachments": [
					{
						"title": "Artforum snapshot",
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
		"url": "https://www.artforum.com/film/id=66885",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Nick Pinkerton on “Gimme Shelter: Hollywood North”",
				"creators": [
					{
						"firstName": "Nick",
						"lastName": "Pinkerton",
						"creatorType": "author"
					}
				],
				"date": "2017-02-24,",
				"abstractNote": "AFTER THE EMERGENCE of alluring Canadian production subsidies in the late 1990s, moviegoers of the aughts became inured to watching downtown Vancouver fill in",
				"blogTitle": "Artforum",
				"language": "en-US",
				"shortTitle": "Nick Pinkerton on “Gimme Shelter",
				"url": "https://www.artforum.com/film/id=66885",
				"attachments": [
					{
						"title": "Artforum snapshot",
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
		"url": "https://www.artforum.com/museums/id=65484",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Whitney Biennial 2017 at Whitney Museum of American Art",
				"creators": [
					{
						"firstName": "Beau",
						"lastName": "Rutland",
						"creatorType": "author"
					}
				],
				"abstractNote": "Curated by Christopher Y. Lew and Mia Locks Following a three-year hiatus to accommodate the museum’s move downtown, the Whitney Biennial makes its Gansevoort",
				"blogTitle": "Artforum",
				"language": "en-US",
				"url": "https://www.artforum.com/museums/id=65484",
				"attachments": [
					{
						"title": "Artforum snapshot",
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
		"url": "https://www.artforum.com/words/id=66615",
		"items": [
			{
				"itemType": "blogPost",
				"title": "Jamie Stewart talks about Xiu Xiu’s record FORGET and recent collaborations",
				"creators": [
					{
						"firstName": "Paige K.",
						"lastName": "Bradley",
						"creatorType": "author"
					}
				],
				"date": "2017-02-21,",
				"abstractNote": "Across thirteen albums and a handful of EPs, Xiu Xiu have remained a prickly, relentless force, inspiring loyalty, love, annoyance, and disgust in equal measure.",
				"blogTitle": "Artforum",
				"language": "en-US",
				"url": "https://www.artforum.com/words/id=66615",
				"attachments": [
					{
						"title": "Artforum snapshot",
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
		"url": "https://www.artforum.com/inprint/issue=201408&id=48214",
		"items": [
			{
				"itemType": "magazineArticle",
				"title": "Dak’Art 2014",
				"creators": [
					{
						"firstName": "Chika",
						"lastName": "Okeke-Agulu",
						"creatorType": "author"
					}
				],
				"date": "October 2014",
				"abstractNote": "THE ELEVENTH EDITION of the Dak’Art Biennial of Contemporary African Art, which took place this past summer, may well have been the most ambitious since the",
				"language": "en-US",
				"libraryCatalog": "Artforum",
				"url": "https://www.artforum.com/inprint/issue=201408&id=48214",
				"attachments": [
					{
						"title": "Artforum snapshot",
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
		"url": "https://www.artforum.com/search/sort=newest&search=1%3A54",
		"items": "multiple"
	}
]
/** END TEST CASES **/