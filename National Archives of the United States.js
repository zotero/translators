{
	"translatorID": "edfa5803-e331-47db-84d1-db3cf8d6f460",
	"label": "National Archives of the United States",
	"creator": "Adam Powers",
	"target": "^https?://research\\.archives\\.gov",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2014-01-05 11:42:13"
}

/* FW LINE 59:b820c6d */ function flatten(t){var e=new Array;for(var i in t){var r=t[i];r instanceof Array?e=e.concat(flatten(r)):e.push(r)}return e}var FW={_scrapers:new Array};FW._Base=function(){this.callHook=function(t,e,i,r){if("object"==typeof this.hooks){var n=this.hooks[t];"function"==typeof n&&n(e,i,r)}},this.evaluateThing=function(t,e,i){var r=typeof t;if("object"===r){if(t instanceof Array){var n=this.evaluateThing,a=t.map(function(t){return n(t,e,i)});return flatten(a)}return t.evaluate(e,i)}return"function"===r?t(e,i):t},this.makeItems=function(t,e,i,r,n){n()}},FW.Scraper=function(t){FW._scrapers.push(new FW._Scraper(t))},FW._Scraper=function(t){for(x in t)this[x]=t[x];this._singleFieldNames=["abstractNote","applicationNumber","archive","archiveLocation","artworkMedium","artworkSize","assignee","audioFileType","audioRecordingType","billNumber","blogTitle","bookTitle","callNumber","caseName","code","codeNumber","codePages","codeVolume","committee","company","conferenceName","country","court","date","dateDecided","dateEnacted","dictionaryTitle","distributor","docketNumber","documentNumber","DOI","edition","encyclopediaTitle","episodeNumber","extra","filingDate","firstPage","forumTitle","genre","history","institution","interviewMedium","ISBN","ISSN","issue","issueDate","issuingAuthority","journalAbbreviation","label","language","legalStatus","legislativeBody","letterType","libraryCatalog","manuscriptType","mapType","medium","meetingName","nameOfAct","network","number","numberOfVolumes","numPages","pages","patentNumber","place","postType","presentationType","priorityNumbers","proceedingsTitle","programTitle","programmingLanguage","publicLawNumber","publicationTitle","publisher","references","reportNumber","reportType","reporter","reporterVolume","rights","runningTime","scale","section","series","seriesNumber","seriesText","seriesTitle","session","shortTitle","studio","subject","system","thesisType","title","type","university","url","version","videoRecordingType","volume","websiteTitle","websiteType"],this._makeAttachments=function(t,e,i,r){if(i instanceof Array)i.forEach(function(i){this._makeAttachments(t,e,i,r)},this);else if("object"==typeof i){var n=i.urls||i.url,a=i.types||i.type,s=i.titles||i.title,o=i.snapshots||i.snapshot,u=this.evaluateThing(n,t,e),l=this.evaluateThing(s,t,e),c=this.evaluateThing(a,t,e),h=this.evaluateThing(o,t,e);u instanceof Array||(u=[u]);for(var f in u){var p,m,v,d=u[f];p=c instanceof Array?c[f]:c,m=l instanceof Array?l[f]:l,v=h instanceof Array?h[f]:h,r.attachments.push({url:d,title:m,mimeType:p,snapshot:v})}}},this.makeItems=function(t,e,i,r,n){var a=new Zotero.Item(this.itemType);a.url=e;for(var s in this._singleFieldNames){var o=this._singleFieldNames[s];if(this[o]){var u=this.evaluateThing(this[o],t,e);u instanceof Array?a[o]=u[0]:a[o]=u}}var l=["creators","tags"];for(var c in l){var h=l[c],f=this.evaluateThing(this[h],t,e);if(f)for(var p in f)a[h].push(f[p])}this._makeAttachments(t,e,this.attachments,a),r(a,this,t,e),n()}},FW._Scraper.prototype=new FW._Base,FW.MultiScraper=function(t){FW._scrapers.push(new FW._MultiScraper(t))},FW._MultiScraper=function(t){for(x in t)this[x]=t[x];this._mkSelectItems=function(t,e){var i=new Object;for(var r in t)i[e[r]]=t[r];return i},this._selectItems=function(t,e,i){var r=new Array;Zotero.selectItems(this._mkSelectItems(t,e),function(t){for(var e in t)r.push(e);i(r)})},this._mkAttachments=function(t,e,i){var r=this.evaluateThing(this.attachments,t,e),n=new Object;if(r)for(var a in i)n[i[a]]=r[a];return n},this._makeChoices=function(t,e,i,r,n){if(t instanceof Array)t.forEach(function(t){this._makeTitlesUrls(t,e,i,r,n)},this);else if("object"==typeof t){var a=t.urls||t.url,s=t.titles||t.title,o=this.evaluateThing(a,e,i),u=this.evaluateThing(s,e,i),l=u instanceof Array;o instanceof Array||(o=[o]);for(var c in o){var h,f=o[c];h=l?u[c]:u,n.push(f),r.push(h)}}},this.makeItems=function(t,e,i,r,n){if(this.beforeFilter){var a=this.beforeFilter(t,e);if(a!=e)return void this.makeItems(t,a,i,r,n)}var s=[],o=[];this._makeChoices(this.choices,t,e,s,o);var u=this._mkAttachments(t,e,o),l=this.itemTrans;this._selectItems(s,o,function(t){if(t){var e=function(t){var e=t.documentURI,i=l;void 0===i&&(i=FW.getScraper(t,e)),void 0===i||i.makeItems(t,e,u[e],r,function(){})};Zotero.Utilities.processDocuments(t,e,n)}else n()})}},FW._MultiScraper.prototype=new FW._Base,FW.WebDelegateTranslator=function(t){return new FW._WebDelegateTranslator(t)},FW._WebDelegateTranslator=function(t){for(x in t)this[x]=t[x];this.makeItems=function(t,e,i,r,n){var a=this,s=Zotero.loadTranslator("web");s.setHandler("itemDone",function(i,n){r(n,a,t,e)}),s.setDocument(t),this.translatorId?(s.setTranslator(this.translatorId),s.translate()):(s.setHandler("translators",function(t,e){e.length&&(s.setTranslator(e[0]),s.translate())}),s.getTranslators()),n()}},FW._WebDelegateTranslator.prototype=new FW._Base,FW._StringMagic=function(){this._filters=new Array,this.addFilter=function(t){return this._filters.push(t),this},this.split=function(t){return this.addFilter(function(e){return e.split(t).filter(function(t){return""!=t})})},this.replace=function(t,e,i){return this.addFilter(function(r){return r.match(t)?r.replace(t,e,i):r})},this.prepend=function(t){return this.replace(/^/,t)},this.append=function(t){return this.replace(/$/,t)},this.remove=function(t,e){return this.replace(t,"",e)},this.trim=function(){return this.addFilter(function(t){return Zotero.Utilities.trim(t)})},this.trimInternal=function(){return this.addFilter(function(t){return Zotero.Utilities.trimInternal(t)})},this.match=function(t,e){return e||(e=0),this.addFilter(function(i){var r=i.match(t);return void 0===r||null===r?void 0:r[e]})},this.cleanAuthor=function(t,e){return this.addFilter(function(i){return Zotero.Utilities.cleanAuthor(i,t,e)})},this.key=function(t){return this.addFilter(function(e){return e[t]})},this.capitalizeTitle=function(){return this.addFilter(function(t){return Zotero.Utilities.capitalizeTitle(t)})},this.unescapeHTML=function(){return this.addFilter(function(t){return Zotero.Utilities.unescapeHTML(t)})},this.unescape=function(){return this.addFilter(function(t){return unescape(t)})},this._applyFilters=function(t,e){for(i in this._filters){t=flatten(t),t=t.filter(function(t){return void 0!==t&&null!==t});for(var r=0;r<t.length;r++)try{if(void 0===t[r]||null===t[r])continue;t[r]=this._filters[i](t[r],e)}catch(n){t[r]=void 0,Zotero.debug("Caught exception "+n+"on filter: "+this._filters[i])}t=t.filter(function(t){return void 0!==t&&null!==t})}return flatten(t)}},FW.PageText=function(){return new FW._PageText},FW._PageText=function(){this._filters=new Array,this.evaluate=function(t){var e=[t.documentElement.innerHTML];return e=this._applyFilters(e,t),0==e.length?!1:e}},FW._PageText.prototype=new FW._StringMagic,FW.Url=function(){return new FW._Url},FW._Url=function(){this._filters=new Array,this.evaluate=function(t,e){var i=[e];return i=this._applyFilters(i,t),0==i.length?!1:i}},FW._Url.prototype=new FW._StringMagic,FW.Xpath=function(t){return new FW._Xpath(t)},FW._Xpath=function(t){this._xpath=t,this._filters=new Array,this.text=function(){var t=function(t){return"object"==typeof t&&t.textContent?t.textContent:t};return this.addFilter(t),this},this.sub=function(t){var e=function(e,i){var r=i.evaluate(t,e,null,XPathResult.ANY_TYPE,null);return r?r.iterateNext():void 0};return this.addFilter(e),this},this.evaluate=function(t){var e=t.evaluate(this._xpath,t,null,XPathResult.ANY_TYPE,null),i=e.resultType,r=new Array;if(i==XPathResult.STRING_TYPE)r.push(e.stringValue);else if(i==XPathResult.BOOLEAN_TYPE)r.push(e.booleanValue);else if(i==XPathResult.NUMBER_TYPE)r.push(e.numberValue);else if(i==XPathResult.ORDERED_NODE_ITERATOR_TYPE||i==XPathResult.UNORDERED_NODE_ITERATOR_TYPE)for(var n;n=e.iterateNext();)r.push(n);return r=this._applyFilters(r,t),0==r.length?!1:r}},FW._Xpath.prototype=new FW._StringMagic,FW.detectWeb=function(t,e){for(var i in FW._scrapers){var r=FW._scrapers[i],n=r.evaluateThing(r.itemType,t,e),a=r.evaluateThing(r.detect,t,e);if(a.length>0&&a[0])return n}},FW.getScraper=function(t,e){var i=FW.detectWeb(t,e);return FW._scrapers.filter(function(r){return r.evaluateThing(r.itemType,t,e)==i&&r.evaluateThing(r.detect,t,e)})[0]},FW.doWeb=function(t,e){var i=FW.getScraper(t,e);i.makeItems(t,e,[],function(t,e,i,r){e.callHook("scraperDone",t,i,r),t.title||(t.title=""),t.complete()},function(){Zotero.done()}),Zotero.wait()};

function detectWeb(doc, url) { return FW.detectWeb(doc, url); }
function doWeb(doc, url) { return FW.doWeb(doc, url); }

/**
 * development wishlist:
 * multi-scraper for search, series and record groups
 * tests
 * check online availability
 * Assign the Zotero itemType based on the media type of the record (record, letter, manuscript, book, photo (see 296573), video, etc)
 * Presidential Libraries (see 923489)
 * Author instead of Institution (see 923489)
 * Recognize and cite more archives correctly (complete list at: http://www.archives.gov/locations/states.html)
 * 		Currently only DC and College Park are recognized
 * Acronyms for subsequent citings of the same material (per "Citing Records in the National Archives of the United States")
 * 		Maybe that's a job for the citation side of things?
 **/

function build_extra (doc, extra_str, new_str, xpath) {
	var tmp = ZU.xpathText (doc, xpath);
	if (tmp != null) {
		return extra_str + new_str + tmp.trim().replace(/\s+/gm," ") +"\n";
	} else {
		return extra_str;
	}
}

FW.Scraper({
	itemType: "report",
	detect: FW.Url().match("/description/"),
	title: FW.Xpath("//div[@id=\"detailsBar\"]/h1[@class=\"itemTitle\"]/text()").text().trim(),
	// Archive (from NARA contact info)
	archive: FW.Xpath("//div[@class=\"information\"]//dt[contains(text(),\"Copy 1:\")]/following-sibling::dt[contains(text(),\"Contact(s):\")]/following-sibling::dd[1]/ul[@class=\"contacts\"]/li/text()[1]").text().trim(),
	// Archive Location (NARA record group)
	archiveLocation: FW.Xpath("//div[@class=\"information\"]//dt[contains(text(),\"From:\")]/following-sibling::dd[1]//a[contains(text(),\"Record Group\")]/text()|//div[@class=\"information\"]//dt[contains(text(),\"From:\")]/following-sibling::dd[1]//a[contains(text(),\"Collection\")]/text()").text().trim(),
	// Institution (NARA creator; eg - War Department. War Plans Division.)
	institution: FW.Xpath("substring-before(//div[@class=\"information\"]//dt[contains(text(),\"Creator(s):\")]/following-sibling::dd[1]/ul/li[last()]/a/text(),\".\")").text().trimInternal(),
	// Rights (NARA use rights)
	rights: FW.Xpath("//div[@class=\"information\"]//dt[contains(text(),\"Use Restriction(s):\")]/following-sibling::dd[1]/ul/li/text()[1]").text().trim(),
	// Series (NARA series)
	seriesTitle: FW.Xpath("substring-after(//div[@class=\"information\"]//dt[contains(text(),\"From:\")]/following-sibling::dd[1]/ul/li/a/text(),\":\")").text().trim(),
	// Call Number (National Archives ID; eg - "2965734")
	callNumber: FW.Xpath("//div[@class=\"information\"]//dt[contains(text(),\"National Archives Identifier:\")]/../dd[1]/text()").text().trim().prepend("National Archives Identifier "),
	// Date the item was created
	date: FW.Xpath("//div[@class=\"information\"]//dt[contains(text(),\"This item was produced or created:\")]/following-sibling::dd[1]/ul/li/text()").text().trim(),
	// abstract = Scope and Content
	abstractNote: FW.Xpath("//h3[contains(text(),\"Scope & Content\")]/../div/p/text()").text().trim(),
	/**
	 * hook:
	 * 		clean up archive information so that it can be cited correctly
	 * 		create extra field, which contains archive location information and other finding information
	 * 		misc field cleanup
	 **/
	hooks: {scraperDone: function  (item, doc, url) {
		/* cite archive location correctly */
		if (item.archive.match("National Archives at College Park") != null) {
			item.archive = "National Archives at College Park, MD";
		} else if (item.archive.match("National Archives Building") != null) {
			item.archive = "National Archives Building, Washington DC";
		} else if (item.archive.match("(Fort Worth)") != null) {
			item.archive = "National Archives and Records Administration - Southwest Region (Fort Worth)";
		}
		/* TODO: there are plenty more archives that could go into this if-else list */
		/* correct citation style can be found at: 
		 *		http://www.archives.gov/publications/general-info-leaflets/17-citing-records.html */
		
		
		/** add "extra" information for helping find the record at the archive **/
		var extra_str = "";
		/** identifiers **/
		// Former ARC Identifier
		extra_str = build_extra (doc, extra_str, "Former ARC Identifier: ", "//div[@class=\"information\"]//dt[contains(text(),\"Former ARC Identifier:\")]/following-sibling::dd[1]/text()[normalize-space()]");
		// Local Identifier
		extra_str = build_extra (doc, extra_str, "Local ID: ", "//div[@class=\"information\"]//dt[starts-with(text(),\"Local Identifier:\")]/following-sibling::dd[1]/text()");
		// Former Local Identifier
		extra_str = build_extra (doc, extra_str, "Former Local ID: ", "//div[@class=\"information\"]//dt[contains(text(),\"Former Local Identifier:\")]/following-sibling::dd[1]/text()");
		// MLR / HMS number
		extra_str = build_extra (doc, extra_str, "", "//div[@class=\"information\"]//dt[contains(text(),\"From:\")]/following-sibling::dd[1]/ul/li[contains(text(),\"HMS\")]/text()");
		// HMS/MLR Entry Number
		extra_str = build_extra (doc, extra_str, "HMS/MLR Entry Number: ", "//div[@class=\"information\"]//dt[starts-with(text(),\"HMS/MLR Entry Number:\")]/following-sibling::dd[1]/text()[normalize-space()]");
		// Former HMS/MLR Entry Number
		extra_str = build_extra (doc, extra_str, "Former HMS/MLR Entry Number: ", "//div[@class=\"information\"]//dt[contains(text(),\"Former HMS/MLR Entry Number:\")]/following-sibling::dd[1]/text()[normalize-space()]");
		// NAIL Control Number
		extra_str = build_extra (doc, extra_str, "NAIL Control Number: ", "//div[@class=\"information\"]//dt[contains(text(),\"NAIL Control Number:\")]/following-sibling::dd[1]/text()[normalize-space()]");
		// Select List Identifier
		extra_str = build_extra (doc, extra_str, "Select List Identifier: ", "//div[@class=\"information\"]//dt[contains(text(),\"Select List Identifier:\")]/following-sibling::dd[1]/text()[normalize-space()]");
		// XMIS Number
		extra_str = build_extra (doc, extra_str, "XMIS Number: ", "//div[@class=\"information\"]//dt[contains(text(),\"XMIS Number:\")]/following-sibling::dd[1]/text()[normalize-space()]");
		// Other ID
		extra_str = build_extra (doc, extra_str, "Other ID: ", "//div[@class=\"information\"]//dt[contains(text(),\"Other Identifier:\")]/following-sibling::dd[1]/text()[normalize-space()]");
		// Search ID
		extra_str = build_extra (doc, extra_str, "Search ID: ", "//div[@class=\"information\"]//dt[contains(text(),\"Search Identifier:\")]/following-sibling::dd[1]/text()[normalize-space()]");
		// Agency-Assigned Identifier
		extra_str = build_extra (doc, extra_str, "Agency-Assigned Identifier(s): ", "//div[@class=\"information\"]//dt[contains(text(),\"Agency-Assigned Identifier:\")]/following-sibling::dd[1]/text()[normalize-space()]");
		// Declassification Project Number
		extra_str = build_extra (doc, extra_str, "Declassification Project Number: ", "//div[@class=\"information\"]//dt[contains(text(),\"Declassification Project Number:\")]/following-sibling::dd[1]/text()[normalize-space()]");
		// Government Publication Number
		extra_str = build_extra (doc, extra_str, "Government Publication Number: ", "//div[@class=\"information\"]//dt[contains(text(),\"Government Publication Number:\")]/following-sibling::dd[1]/text()[normalize-space()]");
		// Inventory Entry Number
		extra_str = build_extra (doc, extra_str, "Inventory Entry Number: ", "//div[@class=\"information\"]//dt[contains(text(),\"Inventory Entry Number:\")]/following-sibling::dd[1]/text()[normalize-space()]");
		// NUCMC Number
		extra_str = build_extra (doc, extra_str, "NUCMC Number: ", "//div[@class=\"information\"]//dt[contains(text(),\"NUCMC Number:\")]/following-sibling::dd[1]/text()[normalize-space()]");
		// Other Finding Aid Identifier
		extra_str = build_extra (doc, extra_str, "Other Finding Aid Identifier: ", "//div[@class=\"information\"]//dt[contains(text(),\"Other Finding Aid Identifier:\")]/following-sibling::dd[1]/text()[normalize-space()]");
		// Preliminary Checklist Identifier
		extra_str = build_extra (doc, extra_str, "Preliminary Checklist Identifier: ", "//div[@class=\"information\"]//dt[contains(text(),\"Preliminary Checklist Identifier:\")]/following-sibling::dd[1]/text()[normalize-space()]");
		// PRESNET Number
		extra_str = build_extra (doc, extra_str, "PRESNET Number: ", "//div[@class=\"information\"]//dt[contains(text(),\"PRESNET Number:\")]/following-sibling::dd[1]/text()[normalize-space()]");
		// Ref ID
		extra_str = build_extra (doc, extra_str, "Ref ID: ", "//div[@class=\"information\"]//dt[contains(text(),\"Ref ID:\")]/following-sibling::dd[1]/text()[normalize-space()]");
		// Agency Disposition Number
		extra_str = build_extra (doc, extra_str, "Agency Disposition Number: ", "//div[@class=\"information\"]//dt[contains(text(),\"Agency Disposition Number:\")]/following-sibling::dd[1]/text()[normalize-space()]");
		// Kennedy Assassination Document ID
		extra_str = build_extra (doc, extra_str, "Kennedy Assassination Document ID: ", "//div[@class=\"information\"]//dt[contains(text(),\"Kennedy Assassination Document ID:\")]/following-sibling::dd[1]/text()[normalize-space()]");
		// FOIA Tracking Number
		extra_str = build_extra (doc, extra_str, "FOIA Tracking Number: ", "//div[@class=\"information\"]//dt[contains(text(),\"FOIA Tracking Number:\")]/following-sibling::dd[1]/text()[normalize-space()]");

		/** Other information **/
		// Microform Publication #'s
		extra_str = build_extra (doc, extra_str, "Microform Publications: ", "//div[@class=\"information\"]//dt[contains(text(),\"Microform Publication(s):\")]/following-sibling::dd[1]/ul/li/text()[normalize-space()]");
		// container #
		extra_str = build_extra (doc, extra_str, "Container ID: ", "//div[@class=\"information\"]//dt[contains(text(),\"Copy 1:\")]/following-sibling::dt[contains(text(),\"Copy 1 Media Information:\")]/following-sibling::dd[1]/ul[@class=\"mediaocc\"]//li/span[contains(text(),\"Container Id:\")]/following-sibling::text()");
		// Size
		extra_str = build_extra (doc, extra_str, "Size: ", "//div[@class=\"information\"]//dt[contains(text(),\"Copy 1:\")]/following-sibling::dt[contains(text(),\"Extent (Size):\")]/following-sibling::dd[1]/text()");
		// level of description (records, series, item, etc)
		extra_str = build_extra (doc, extra_str, "Record Level: ", "//div[@class=\"information\"]//dt[contains(text(),\"Level of Description:\")]/following-sibling::dd[1]/ul/li/text()");
		// types of materials (textual records)
		extra_str = build_extra (doc, extra_str, "Material Type: ", "//div[@class=\"information\"]//dt[contains(text(),\"Type(s) of Archival Materials:\")]/following-sibling::dd[1]/ul/li/text()");
		// Media Type (eg - "paper")
		extra_str = build_extra (doc, extra_str, "Media Type: ", "//div[@class=\"information\"]//dt[contains(text(),\"Copy 1:\")]/following-sibling::dt[contains(text(),\"Copy 1 Media Information:\")]/following-sibling::dd[1]/ul[@class=\"mediaocc\"]/li/span[contains(text(),\"Specific Media Type:\")]/following-sibling::text()");
		// Alternate title(s)
		extra_str = build_extra (doc, extra_str, "Alternate Title(s): ", "//div[@class=\"information\"]//dt[contains(text(),\"Other Title(s):\")]/following-sibling::dd[1]/ul/li/text()");
		// General Note
		extra_str = build_extra (doc, extra_str, "General Note: ", "//div[@class=\"information\"]//dt[contains(text(),\"General Note(s):\")]/following-sibling::dd[1]/ul/li/text()");
		// Full institution name (eg - "War Department. War Plans Divsion. (2/9/1918 - 3/23/1942)")
		extra_str = build_extra (doc, extra_str, "Institution: ", "//div[@class=\"information\"]//dt[contains(text(),\"Creator(s):\")]/following-sibling::dd[1]/ul/li/a/text()");
		// Online Resources
		extra_str = build_extra (doc, extra_str, "Online Resources: ", "//div[@class=\"information\"]//dt[contains(text(),\"Online Resource(s):\")]/following-sibling::dd[1]/ul/li/text()[normalize-space()]");
		// Subjects Represented
		extra_str = build_extra (doc, extra_str, "Subjects: ", "//div[@class=\"information\"]//dt[contains(text(),\"Subjects Represented in the Archival Material(s):\")]/following-sibling::dd[1]/ul/li/a/text()");
		// Date the materials were compiled
		extra_str = build_extra (doc, extra_str, "Date Compiled: ", "//div[@class=\"information\"]//dt[contains(text(),\"The creator compiled or maintained the series between:\")]/following-sibling::dd[1]/text()");
		// Date Note
		extra_str = build_extra (doc, extra_str, "Date Note: ", "//div[@class=\"information\"]//dt[contains(text(),\"Date Note:\")]/following-sibling::dd[1]/text()");
		// Files document the period XXXX - YYYY
		extra_str = build_extra (doc, extra_str, "Documented Period: ", "//div[@class=\"information\"]//dt[contains(text(),\"The file documents the time period:\")]/following-sibling::dd[1]/text()");
		// Documented Period
		extra_str = build_extra (doc, extra_str, "Documented Period: ", "//div[@class=\"information\"]//dt[contains(text(),\"This item documents the time period:\")]/following-sibling::dd[1]/text()");
		// Accession Number(s)
		extra_str = build_extra (doc, extra_str, "Accession Number(s): ", "//div[@class=\"information\"]//dt[contains(text(),\"Accession Number(s):\")]/following-sibling::dd[1]/ul/li/text()");
		// Disposition Authority Number(s)
		extra_str = build_extra (doc, extra_str, "Disposition Authority Number(s): ", "//div[@class=\"information\"]//dt[contains(text(),\"Disposition Authority Number(s):\")]/following-sibling::dd[1]/ul/li/text()");
		// Records Center Transfer Number(s)
		extra_str = build_extra (doc, extra_str, "Records Center Transfer Number(s): ", "//div[@class=\"information\"]//dt[contains(text(),\"Records Center Transfer Number(s):\")]/following-sibling::dd[1]/ul/li/text()");
		// Internal Transfer Number(s)
		extra_str = build_extra (doc, extra_str, "Internal Transfer Number(s): ", "//div[@class=\"information\"]//dt[contains(text(),\"Internal Transfer Number(s):\")]/following-sibling::dd[1]/ul/li/text()");
		// Language(s)
		extra_str = build_extra (doc, extra_str, "Language(s): ", "//div[@class=\"information\"]//dt[contains(text(),\"Language(s):\")]/following-sibling::dd[1]/ul/li/text()");
		// Transfer Information
		extra_str = build_extra (doc, extra_str, "Transfer Information: ", "//div[@class=\"information\"]//dt[contains(text(),\"Transfer Information:\")]/following-sibling::dd[1]//text()");
		// Custodial History
		extra_str = build_extra (doc, extra_str, "Custodial History: ", "//div[@class=\"information\"]//dt[contains(text(),\"Custodial History:\")]/following-sibling::dd[1]//text()");
		// Scale Note
		extra_str = build_extra (doc, extra_str, "Scale Note: ", "//div[@class=\"information\"]//dt[contains(text(),\"Scale Note:\")]/following-sibling::dd[1]//text()");
		// Copyright Date
		extra_str = build_extra (doc, extra_str, "Copyright Date: ", "//div[@class=\"information\"]//dt[contains(text(),\"This item's copyright was established:\")]/following-sibling::dd[1]/ul/li/text()");
		// Contributor(s)
		extra_str = build_extra (doc, extra_str, "Contributor(s): ", "//div[@class=\"information\"]//dt[contains(text(),\"Contributors to Authorship and/or Production of the Archival Material(s):\")]/following-sibling::dd[1]/ul/li/a/text()");
		// Former Record Groups
		extra_str = build_extra (doc, extra_str, "Former Record Group(s): ", "//div[@class=\"information\"]//dt[contains(text(),\"Former Record Group(s):\")]/following-sibling::dd[1]/ul/li/text()");
		// Former Collections
		extra_str = build_extra (doc, extra_str, "Former Collection(s): ", "//div[@class=\"information\"]//dt[contains(text(),\"Former Collections(s):\")]/following-sibling::dd[1]/ul/li/text()");

		item.notes.push(extra_str);
		
		
		/** other clean-up **/
		// Reverse "Record Group" listing
		var rg = item.archiveLocation.split(":", 2);
		item.archiveLocation = rg[1].trim() + ", " + rg[0].trim();
	}}
});


/** Test URLs **/
//http://research.archives.gov/description/268296
//http://research.archives.gov/description/531201
//http://research.archives.gov/description/651639
//http://research.archives.gov/description/299807
//http://research.archives.gov/description/299874
//http://research.archives.gov/description/595102
//http://research.archives.gov/description/305167
//http://research.archives.gov/description/628966
//http://research.archives.gov/description/305167
//http://research.archives.gov/description/595449
//http://research.archives.gov/description/1923129
//http://research.archives.gov/description/305059
//http://research.archives.gov/description/2050937
//http://research.archives.gov/description/201293
//http://research.archives.gov/description/306687
//http://research.archives.gov/description/4688052
//http://research.archives.gov/description/160264
//http://research.archives.gov/description/5171392
//http://research.archives.gov/description/305171
//http://research.archives.gov/description/594759
//http://research.archives.gov/description/5822974
//http://research.archives.gov/description/638460
//http://research.archives.gov/description/2630932/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://research.archives.gov/description/651639",
		"items": [
			{
				"itemType": "report",
				"creators": [],
				"notes": [
					"XMIS Number: 007381, This is the State Questionnaire (E1) data file., 007382, This is the District Main Questionnaire (E2), Parts 1-6 data file., 007383, This is the District Instructional Area Supplement Questionnaire (E2S) data file., 007384, This is the Principal Main Questionnaire (E3) data file., 007385, This is the Principal Supplement Questionnaire (E3S) data file., 007386, This is the Provider Main Questionnaire (E4) data file., 007387, This is the Provider Supplement Questionnaire (E4S) data file., 007388, This is the Teacher Main Questionnaire Homeroom Sample (E5) data file., 007389, This is the Teacher Supplement Questionnaire Homeroom Sample (E5S) data file., 007390, This is the Classroom Roster Sheet (E5ROSTER) data file., 007391, This is the District Information Booklets 1 and 2 (E6) data file., 007392, This is the School Information Booklet Number 8 (E9) data file., 007393, This is the Parent Advisory Council Interview (E11) data file., 007442, This is the State Questionnaire (E1) codebook file., 007443, This is the District Main Questionnaire (E2), Part 1 codebook file., 007444, This is the District Main Questionnaire (E2), Part 2 codebook file., 007445, This is the District Main Questionnaire (E2), Part 3 codebook file., 007446, This is the District Main Questionnaire (E2), Part 4 codebook file., 007447, This is the District Main Questionnaire (E2), Part 5 codebook file., 007448, This is the District Main Questionnaire (E2), Part 6 codebook file., 007449, This is the District Instructional Area Supplement Questionnaire (E2S) codebook file., 007450, This is the Principal Main Questionnaire (E3) codebook file., 007451, This is the Principal Supplement Questionnaire (E3S) codebook file., 007452, This is the Provider Main Questionnaire (E4) codebook file., 007453, This is the Provider Supplement Questionnaire (E4S) codebook file., 007454, This is the Teacher Main Questionnaire Homeroom Sample (E5) codebook file., 007455, This is the Teacher Supplement Questionnaire Homeroom Sample (E5S) codebook file., 007456, This is the Classroom Roster Sheet (E5ROSTER) codebook file., 007457, This is the District Information Booklets 1 and 2 (E6) codebook file., 007458, This is a codebook file., 007459, This is the School Information Booklet Number 8 (E9) codebook file., 007460, This is the Parent Advisory Council Interview (E11) codebook file., 007461, This is a codebook file.\nSize: 13 data files and 20 electronic documentation files\nRecord Level: File Unit\nMaterial Type: Data Files\nMedia Type: Magnetic Tape Cartridge\nInstitution: Department of Health, Education, and Welfare. Office of Education. National Institute of Education. (06/23/1972 - 05/04/1980)\nDate Compiled: 1975 - 1980\nDate Note: These files have data compiled by the National Opinion Research Center, Policy Research Corporation, and the Stanford Research Institute between 1975 and 1976.\nDocumented Period: 1975 - 1976\nContributor(s): National Opinion Research Center, Compiler, Policy Research Corporation., Compiler, Stanford Research Institute., Compiler\n"
				],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"url": "http://research.archives.gov/description/651639",
				"abstractNote": "These files contain data identifying Compensatory Education Programs in operation, with data for states, school districts, schools, principals, teachers, and parents.  The data contains information on expenditures, funding sources, extent of services, student selection processes, teacher background, and progress evaluation.",
				"archive": "National Archives at College Park, MD",
				"archiveLocation": "Records of the National Institute of Education, 1960 - 1980, Record Group 419",
				"callNumber": "National Archives Identifier 651639",
				"institution": "Department of Health, Education, and Welfare",
				"rights": "Unrestricted",
				"seriesTitle": "Compensatory Education Study Files, compiled 1975 - 1980, documenting the period 1970 - 1977",
				"title": "National Survey Files,   1975 - 1976",
				"libraryCatalog": "National Archives of the United States",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://research.archives.gov/description/7062935",
		"items": [
			{
				"itemType": "report",
				"creators": [],
				"notes": [
					"HMS/MLR Entry Number: A1 313\nDeclassification Project Number: NND 775051, NND 775119\nContainer ID: Boxes 1-2183\nSize: 954 linear feet, 7 linear inches\nRecord Level: Series\nMaterial Type: Textual Records\nMedia Type: Paper\nInstitution: Department of Defense. European Command. Office of Military Government for Germany (U.S.). Civil Administration Division. Public Safety Branch. (03/15/1947 - 09/21/1949)\nDate Compiled: 1945 - 1948\n"
				],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"url": "http://research.archives.gov/description/7062935",
				"abstractNote": "This series consists of fragebogen case files.  These files might contain the original fragebogen (usually in German), a fragebogen worksheet, a Special Branch investigation report, a report on the subject and respondent's tribunal decision, and affidavits on behalf of the subject.  The records were maintained by the Public Safety Branch.",
				"archive": "National Archives at College Park, MD",
				"archiveLocation": "Records of U.S. Occupation Headquarters, World War II, 1923 - 1972, Record Group 260",
				"callNumber": "National Archives Identifier 7062935",
				"institution": "Department of Defense",
				"rights": "Unrestricted",
				"title": "Fragebogen Files Relating to Denazification,   1945 - 1948",
				"libraryCatalog": "National Archives of the United States"
			}
		]
	}
]
/** END TEST CASES **/