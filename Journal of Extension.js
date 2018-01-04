{
	"translatorID": "7e56f792-e96b-42a1-913c-40c69cc9ce40",
	"label": "Journal of Extension",
	"creator": "John Weis",
	"target": "^https?://www\\.joe\\.org/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2016-11-01 18:47:05"
}

/* FW LINE 59:b820c6d */ function flatten(t){var e=new Array;for(var i in t){var r=t[i];r instanceof Array?e=e.concat(flatten(r)):e.push(r)}return e}var FW={_scrapers:new Array};FW._Base=function(){this.callHook=function(t,e,i,r){if("object"==typeof this.hooks){var n=this.hooks[t];"function"==typeof n&&n(e,i,r)}},this.evaluateThing=function(t,e,i){var r=typeof t;if("object"===r){if(t instanceof Array){var n=this.evaluateThing,a=t.map(function(t){return n(t,e,i)});return flatten(a)}return t.evaluate(e,i)}return"function"===r?t(e,i):t},this.makeItems=function(t,e,i,r,n){n()}},FW.Scraper=function(t){FW._scrapers.push(new FW._Scraper(t))},FW._Scraper=function(t){for(x in t)this[x]=t[x];this._singleFieldNames=["abstractNote","applicationNumber","archive","archiveLocation","artworkMedium","artworkSize","assignee","audioFileType","audioRecordingType","billNumber","blogTitle","bookTitle","callNumber","caseName","code","codeNumber","codePages","codeVolume","committee","company","conferenceName","country","court","date","dateDecided","dateEnacted","dictionaryTitle","distributor","docketNumber","documentNumber","DOI","edition","encyclopediaTitle","episodeNumber","extra","filingDate","firstPage","forumTitle","genre","history","institution","interviewMedium","ISBN","ISSN","issue","issueDate","issuingAuthority","journalAbbreviation","label","language","legalStatus","legislativeBody","letterType","libraryCatalog","manuscriptType","mapType","medium","meetingName","nameOfAct","network","number","numberOfVolumes","numPages","pages","patentNumber","place","postType","presentationType","priorityNumbers","proceedingsTitle","programTitle","programmingLanguage","publicLawNumber","publicationTitle","publisher","references","reportNumber","reportType","reporter","reporterVolume","rights","runningTime","scale","section","series","seriesNumber","seriesText","seriesTitle","session","shortTitle","studio","subject","system","thesisType","title","type","university","url","version","videoRecordingType","volume","websiteTitle","websiteType"],this._makeAttachments=function(t,e,i,r){if(i instanceof Array)i.forEach(function(i){this._makeAttachments(t,e,i,r)},this);else if("object"==typeof i){var n=i.urls||i.url,a=i.types||i.type,s=i.titles||i.title,o=i.snapshots||i.snapshot,u=this.evaluateThing(n,t,e),l=this.evaluateThing(s,t,e),c=this.evaluateThing(a,t,e),h=this.evaluateThing(o,t,e);u instanceof Array||(u=[u]);for(var f in u){var p,m,v,d=u[f];p=c instanceof Array?c[f]:c,m=l instanceof Array?l[f]:l,v=h instanceof Array?h[f]:h,r.attachments.push({url:d,title:m,mimeType:p,snapshot:v})}}},this.makeItems=function(t,e,i,r,n){var a=new Zotero.Item(this.itemType);a.url=e;for(var s in this._singleFieldNames){var o=this._singleFieldNames[s];if(this[o]){var u=this.evaluateThing(this[o],t,e);u instanceof Array?a[o]=u[0]:a[o]=u}}var l=["creators","tags"];for(var c in l){var h=l[c],f=this.evaluateThing(this[h],t,e);if(f)for(var p in f)a[h].push(f[p])}this._makeAttachments(t,e,this.attachments,a),r(a,this,t,e),n()}},FW._Scraper.prototype=new FW._Base,FW.MultiScraper=function(t){FW._scrapers.push(new FW._MultiScraper(t))},FW._MultiScraper=function(t){for(x in t)this[x]=t[x];this._mkSelectItems=function(t,e){var i=new Object;for(var r in t)i[e[r]]=t[r];return i},this._selectItems=function(t,e,i){var r=new Array;Zotero.selectItems(this._mkSelectItems(t,e),function(t){for(var e in t)r.push(e);i(r)})},this._mkAttachments=function(t,e,i){var r=this.evaluateThing(this.attachments,t,e),n=new Object;if(r)for(var a in i)n[i[a]]=r[a];return n},this._makeChoices=function(t,e,i,r,n){if(t instanceof Array)t.forEach(function(t){this._makeTitlesUrls(t,e,i,r,n)},this);else if("object"==typeof t){var a=t.urls||t.url,s=t.titles||t.title,o=this.evaluateThing(a,e,i),u=this.evaluateThing(s,e,i),l=u instanceof Array;o instanceof Array||(o=[o]);for(var c in o){var h,f=o[c];h=l?u[c]:u,n.push(f),r.push(h)}}},this.makeItems=function(t,e,i,r,n){if(this.beforeFilter){var a=this.beforeFilter(t,e);if(a!=e)return void this.makeItems(t,a,i,r,n)}var s=[],o=[];this._makeChoices(this.choices,t,e,s,o);var u=this._mkAttachments(t,e,o),l=this.itemTrans;this._selectItems(s,o,function(t){if(t){var e=function(t){var e=t.documentURI,i=l;void 0===i&&(i=FW.getScraper(t,e)),void 0===i||i.makeItems(t,e,u[e],r,function(){})};Zotero.Utilities.processDocuments(t,e,n)}else n()})}},FW._MultiScraper.prototype=new FW._Base,FW.WebDelegateTranslator=function(t){return new FW._WebDelegateTranslator(t)},FW._WebDelegateTranslator=function(t){for(x in t)this[x]=t[x];this.makeItems=function(t,e,i,r,n){var a=this,s=Zotero.loadTranslator("web");s.setHandler("itemDone",function(i,n){r(n,a,t,e)}),s.setDocument(t),this.translatorId?(s.setTranslator(this.translatorId),s.translate()):(s.setHandler("translators",function(t,e){e.length&&(s.setTranslator(e[0]),s.translate())}),s.getTranslators()),n()}},FW._WebDelegateTranslator.prototype=new FW._Base,FW._StringMagic=function(){this._filters=new Array,this.addFilter=function(t){return this._filters.push(t),this},this.split=function(t){return this.addFilter(function(e){return e.split(t).filter(function(t){return""!=t})})},this.replace=function(t,e,i){return this.addFilter(function(r){return r.match(t)?r.replace(t,e,i):r})},this.prepend=function(t){return this.replace(/^/,t)},this.append=function(t){return this.replace(/$/,t)},this.remove=function(t,e){return this.replace(t,"",e)},this.trim=function(){return this.addFilter(function(t){return Zotero.Utilities.trim(t)})},this.trimInternal=function(){return this.addFilter(function(t){return Zotero.Utilities.trimInternal(t)})},this.match=function(t,e){return e||(e=0),this.addFilter(function(i){var r=i.match(t);return void 0===r||null===r?void 0:r[e]})},this.cleanAuthor=function(t,e){return this.addFilter(function(i){return Zotero.Utilities.cleanAuthor(i,t,e)})},this.key=function(t){return this.addFilter(function(e){return e[t]})},this.capitalizeTitle=function(){return this.addFilter(function(t){return Zotero.Utilities.capitalizeTitle(t)})},this.unescapeHTML=function(){return this.addFilter(function(t){return Zotero.Utilities.unescapeHTML(t)})},this.unescape=function(){return this.addFilter(function(t){return unescape(t)})},this._applyFilters=function(t,e){for(i in this._filters){t=flatten(t),t=t.filter(function(t){return void 0!==t&&null!==t});for(var r=0;r<t.length;r++)try{if(void 0===t[r]||null===t[r])continue;t[r]=this._filters[i](t[r],e)}catch(n){t[r]=void 0,Zotero.debug("Caught exception "+n+"on filter: "+this._filters[i])}t=t.filter(function(t){return void 0!==t&&null!==t})}return flatten(t)}},FW.PageText=function(){return new FW._PageText},FW._PageText=function(){this._filters=new Array,this.evaluate=function(t){var e=[t.documentElement.innerHTML];return e=this._applyFilters(e,t),0==e.length?!1:e}},FW._PageText.prototype=new FW._StringMagic,FW.Url=function(){return new FW._Url},FW._Url=function(){this._filters=new Array,this.evaluate=function(t,e){var i=[e];return i=this._applyFilters(i,t),0==i.length?!1:i}},FW._Url.prototype=new FW._StringMagic,FW.Xpath=function(t){return new FW._Xpath(t)},FW._Xpath=function(t){this._xpath=t,this._filters=new Array,this.text=function(){var t=function(t){return"object"==typeof t&&t.textContent?t.textContent:t};return this.addFilter(t),this},this.sub=function(t){var e=function(e,i){var r=i.evaluate(t,e,null,XPathResult.ANY_TYPE,null);return r?r.iterateNext():void 0};return this.addFilter(e),this},this.evaluate=function(t){var e=t.evaluate(this._xpath,t,null,XPathResult.ANY_TYPE,null),i=e.resultType,r=new Array;if(i==XPathResult.STRING_TYPE)r.push(e.stringValue);else if(i==XPathResult.BOOLEAN_TYPE)r.push(e.booleanValue);else if(i==XPathResult.NUMBER_TYPE)r.push(e.numberValue);else if(i==XPathResult.ORDERED_NODE_ITERATOR_TYPE||i==XPathResult.UNORDERED_NODE_ITERATOR_TYPE)for(var n;n=e.iterateNext();)r.push(n);return r=this._applyFilters(r,t),0==r.length?!1:r}},FW._Xpath.prototype=new FW._StringMagic,FW.detectWeb=function(t,e){for(var i in FW._scrapers){var r=FW._scrapers[i],n=r.evaluateThing(r.itemType,t,e),a=r.evaluateThing(r.detect,t,e);if(a.length>0&&a[0])return n}},FW.getScraper=function(t,e){var i=FW.detectWeb(t,e);return FW._scrapers.filter(function(r){return r.evaluateThing(r.itemType,t,e)==i&&r.evaluateThing(r.detect,t,e)})[0]},FW.doWeb=function(t,e){var i=FW.getScraper(t,e);i.makeItems(t,e,[],function(t,e,i,r){e.callHook("scraperDone",t,i,r),t.title||(t.title=""),t.complete()},function(){Zotero.done()}),Zotero.wait()};
/*
Journal of Extension Translator
Copyright (C) 2015 John Weis

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

FW.Scraper({
	itemType		:'journalArticle',
	detect			:FW.Url().match(/\w+\d+\.(?:php|shtml)$/),
	title			:FW.Xpath('//div[@class="DIV-title"]').text().trim(),
	creators		:FW.Xpath('//div[@class="DIV-author"]/p/b|//div[@class="DIV-author"]/p/strong').text().cleanAuthor("author"),
	publicationTitle:"Journal of Extension",
	abstractNote	:FW.Xpath('//div[@class="DIV-abstract"]/p').text().remove(/^Abstract/).trim(),
	date			:FW.Xpath('//p[@class="DIV-number"]|//p[@class="DIV-number screen_only"]').text().match(/(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|(Nov|Dec)(?:ember)?)?\D?((19[7-9]\d|20\d{2})|\d{2})/),
	volume			:FW.Xpath('//p[@class="DIV-number"]|//p[@class="DIV-number screen_only"]').text().match(/Volume\s(\d+)/, 1),
	issue 			:FW.Xpath('//p[@class="DIV-number"]|//p[@class="DIV-number screen_only"]').text().match(/Number\s(\d+)/, 1),
	tags			:FW.Xpath('//div[@class="DIV-keywords"]/a').text().split(/,/).trim(),
	attachments		:[
		{
			title	:"Full Text PDF",
			type	:"application/pdf",
			url		:FW.Xpath('//div[@id="article-nav"]//a[img/@alt="Printable PDF"]')
						.key('href').text()
		},
		{
			url		:FW.Url(),
			title	:"Snapshot",
			type	:"text/html",
			snapshot:true
		}
	],
	ISSN			:'1077-5315'
});

FW.MultiScraper({
	itemType	:'multiple',
	detect	:FW.Url().match(/(index\.php)|(\d{4}\w+\/)|(journal-current-issue\.php)$/),
	choices	:{
		titles	:FW.Xpath('//h4/a|//div[@class="row-fluid"]/div/p/a').text().trim(),
		url		:FW.Xpath('//h4/a|//div[@class="row-fluid"]/div/p/a').key("href")
	}
});
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.joe.org/joe/2012december/index.php",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.joe.org/joe/1983january/a3.php",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "A Way To Fight Inflation: Food Cooperatives",
				"creators": [
					{
						"firstName": "Elizabeth Chase",
						"lastName": "Scott",
						"creatorType": "author"
					}
				],
				"date": "January 1983",
				"ISSN": "1077-5315",
				"abstractNote": "Extension's role In educating consumers on food cooperatives is based on Michigan's experiences. These guidelines may provide you with an educational program to help fight inflation.",
				"issue": "1",
				"libraryCatalog": "Journal of Extension",
				"publicationTitle": "Journal of Extension",
				"shortTitle": "A Way To Fight Inflation",
				"url": "https://www.joe.org/joe/1983january/a3.php",
				"volume": "21",
				"attachments": [
					{
						"url": false,
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://www.joe.org/joe/1993winter/tp1.php",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Public Policy Education: A Path to Political Support",
				"creators": [
					{
						"firstName": "Patrick G.",
						"lastName": "Boyle",
						"creatorType": "author"
					},
					{
						"firstName": "Sheila H.",
						"lastName": "Mulcahy",
						"creatorType": "author"
					}
				],
				"date": "1993",
				"ISSN": "1077-5315",
				"abstractNote": "We know we've changed. We know our programs are making an impact on modern problems. We know we've planted the seeds to enhance the status of Cooperative Extension as the most relevant educational institution in contemporary society. But how can we convince others?... We in Extension and all parts of higher education, especially in publicly funded universities, have an awesome responsibility to help preserve our democratic way of life.... Public policy education teaches people how to seek and use specific, relevant facts and information to influence and create public policy in ways that benefit the public good with enlightened self-interest.... Public policy education avoids handing out answers.... Extension is the only part of the university that can provide the leadership to meet the challenge of public policy education.",
				"issue": "4",
				"libraryCatalog": "Journal of Extension",
				"publicationTitle": "Journal of Extension",
				"shortTitle": "Public Policy Education",
				"url": "https://www.joe.org/joe/1993winter/tp1.php",
				"volume": "31",
				"attachments": [
					{
						"url": false,
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
		"url": "https://www.joe.org/joe/2014december/a2.php",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Putting a Face on Hunger: A Community-Academic Research Project",
				"creators": [
					{
						"firstName": "Nancy",
						"lastName": "Coffey",
						"creatorType": "author"
					},
					{
						"firstName": "Mary K.",
						"lastName": "Canales",
						"creatorType": "author"
					},
					{
						"firstName": "Emily",
						"lastName": "Moore",
						"creatorType": "author"
					},
					{
						"firstName": "Melissa",
						"lastName": "Gullickson",
						"creatorType": "author"
					},
					{
						"firstName": "Brenda",
						"lastName": "Kaczmarski",
						"creatorType": "author"
					}
				],
				"date": "December 2014",
				"ISSN": "1077-5315",
				"abstractNote": "Food insecurity is a growing concern for Eau Claire County residents in Western Wisconsin. A community-academic partnership studied food insecurity through the voices of families struggling to access food and institutions that assist with hunger related problems. Data were collected through focus groups held in urban and rural parts of the county. Participants reported that food insecurity affected all aspects of daily life, increasing stress and reducing coping abilities. Results indicate that when Extension and campus-based staff partner with community groups, they can increase community awareness of and find innovative solutions to pressing community needs, such as food insecurity.",
				"issue": "6",
				"libraryCatalog": "Journal of Extension",
				"publicationTitle": "Journal of Extension",
				"shortTitle": "Putting a Face on Hunger",
				"url": "https://www.joe.org/joe/2014december/a2.php",
				"volume": "52",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [
					"community-academic partnerships",
					"focus groups",
					"food insecurity",
					"qualitative research"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.joe.org/joe/2012december/iw2.php",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "\"Apps\"—An Innovative Way to Share Extension Knowledge",
				"creators": [
					{
						"firstName": "Joseph S.",
						"lastName": "Dvorak",
						"creatorType": "author"
					},
					{
						"firstName": "Tanya C.",
						"lastName": "Franke-Dvorak",
						"creatorType": "author"
					},
					{
						"firstName": "Randy R.",
						"lastName": "Price",
						"creatorType": "author"
					}
				],
				"date": "December 2012",
				"ISSN": "1077-5315",
				"abstractNote": "Extension professionals across the country are continuously seeking innovative ways to reach clientele and to disseminate timely, educational information. A new avenue to reach clientele includes the use of smartphone \"apps.\" The \"Machinery Sizing\" app, which was developed to ease the estimation of tractor horsepower to implement sizing for Extension clientele anytime, anywhere, is explained as a key example for Extension professionals to utilize apps in disseminating information to clientele. There are many benefits to using apps, including information availability wherever Internet service is available on the smartphone, ease of computations of equations, and automatic updates being sent to users.",
				"issue": "6",
				"libraryCatalog": "Journal of Extension",
				"publicationTitle": "Journal of Extension",
				"url": "https://www.joe.org/joe/2012december/iw2.php",
				"volume": "50",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [
					"apps",
					"horsepower",
					"machinery",
					"smartphones",
					"technology"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/