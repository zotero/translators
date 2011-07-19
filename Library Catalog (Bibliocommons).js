{
	"translatorID": "5d506fe3-dbde-4424-90e8-d219c63faf72",
	"label": "Library Catalog (Bibliocommons)",
	"creator": "Avram Lyon",
	"target": "^https?://[^.]+\\.bibliocommons\\.com",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"lastUpdated": "2011-07-19 18:36:07"
}

/**
    Copyright (c) 2010-2011, Erik Hetzner

    This program is free software: you can redistribute it and/or
    modify it under the terms of the GNU Affero General Public License
    as published by the Free Software Foundation, either version 3 of
    the License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
    Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public
    License along with this program.  If not, see
    <http://www.gnu.org/licenses/>.
*/

function flatten(a) {
    var retval = new Array();
    for (var i in a) {
        var entry = a[i];
        if (entry instanceof Array) {
            retval = retval.concat(flatten(entry));
        } else {
            retval.push(entry);
        }
    }
    return retval;
}

var FW = {
    _scrapers : new Array()
};

FW._Base = function () {
    this.callHook = function (hookName, item, doc, url) {
        if (typeof this['hooks'] === 'object') {
            var hook = this['hooks'][hookName];
            if (typeof hook === 'function') {
                hook(item, doc, url);
            }
        }
    };

    this.evaluateThing = function(val, doc, url) {
        var valtype = typeof val;
        if (valtype === 'string') {
            return val;
        } else if (valtype === 'object') {
            if (val instanceof Array) {
                /* map over each array val */
                /* this.evaluate gets out of scope */
                var parentEval = this.evaluateThing;
                var retval = val.map ( function(i) { return parentEval (i, doc, url); } );
                return flatten(retval);
            } else {
                return val.evaluate(doc, url);
            }
        } else if (valtype === 'function') {
            return val(doc, url);
        } else {
            return undefined;
        }
    };
};

FW.Scraper = function (init) { 
    FW._scrapers.push(new FW._Scraper(init));
};

FW._Scraper = function (init) {
    for (x in init) {
        this[x] = init[x];
    }

    this._singleFieldNames = [
        "abstractNote",
        "applicationNumber",
        "archive",
        "archiveLocation",
        "artworkMedium",
        "artworkSize",
        "assignee",
        "audioFileType",
        "audioRecordingType",
        "billNumber",
        "blogTitle",
        "bookTitle",
        "callNumber",
        "caseName",
        "code",
        "codeNumber",
        "codePages",
        "codeVolume",
        "committee",
        "company",
        "conferenceName",
        "country",
        "court",
        "date",
        "dateDecided",
        "dateEnacted",
        "dictionaryTitle",
        "distributor",
        "docketNumber",
        "documentNumber",
        "DOI",
        "edition",
        "encyclopediaTitle",
        "episodeNumber",
        "extra",
        "filingDate",
        "firstPage",
        "forumTitle",
        "genre",
        "history",
        "institution",
        "interviewMedium",
        "ISBN",
        "ISSN",
        "issue",
        "issueDate",
        "issuingAuthority",
        "journalAbbreviation",
        "label",
        "language",
        "legalStatus",
        "legislativeBody",
        "letterType",
        "libraryCatalog",
        "manuscriptType",
        "mapType",
        "medium",
        "meetingName",
        "nameOfAct",
        "network",
        "number",
        "numberOfVolumes",
        "numPages",
        "pages",
        "patentNumber",
        "place",
        "postType",
        "presentationType",
        "priorityNumbers",
        "proceedingsTitle",
        "programTitle",
        "programmingLanguage",
        "publicLawNumber",
        "publicationTitle",
        "publisher",
        "references",
        "reportNumber",
        "reportType",
        "reporter",
        "reporterVolume",
        "rights",
        "runningTime",
        "scale",
        "section",
        "series",
        "seriesNumber",
        "seriesText",
        "seriesTitle",
        "session",
        "shortTitle",
        "studio",
        "subject",
        "system",
        "thesisType",
        "title",
        "type",
        "university",
        "url",
        "version",
        "videoRecordingType",
        "volume",
        "websiteTitle",
        "websiteType" ];
    
    this._makeAttachments = function(doc, url, config, item) {
        if (config instanceof Array) {
            config.forEach(function (child) { this._makeAttachments(doc, url, child, item); }, this);
        } else if (typeof config === 'object') {
            /* plural or singual */
            var urlsFilter = config["urls"] || config["url"];
            var typesFilter = config["types"] || config["type"];
            var titlesFilter = config["titles"] || config["title"];

            var attachUrls = this.evaluateThing(urlsFilter, doc, url);
            var attachTitles = this.evaluateThing(titlesFilter, doc, url);
            var attachTypes = this.evaluateThing(typesFilter, doc, url);

            var typesIsArray = (attachTypes instanceof Array);
            var titlesIsArray = (attachTitles instanceof Array);
            if (!(attachUrls instanceof Array)) {
                attachUrls = [attachUrls];
            }
            for (var k in attachUrls) {
                var attachUrl = attachUrls[k];
                var attachType;
                var attachTitle;
                if (typesIsArray) { attachType = attachTypes[k]; }
                else { attachType = attachTypes; }
                if (titlesIsArray) { attachTitle = attachTitles[k]; }
                else { attachTitle = attachTitles; }
                item["attachments"].push({ 'url':   attachUrl,
                                           'title': attachTitle,
                                           'type':  attachType });
            }
        }
    };
   
    // If we have a delegation, we delegate 
    if (this.itemTrans !== undefined) {
	    this.makeItems = this.itemTrans.makeItems;
    } else {
    this.makeItems = function (doc, url, ignore, eachItem, ret) {
        var item = new Zotero.Item(this.itemType);
        item.url = url;
        for (var i in this._singleFieldNames) {
            var field = this._singleFieldNames[i];
            if (this[field]) {
                var fieldVal = this.evaluateThing(this[field], doc, url);
                if (fieldVal instanceof Array) {
                    item[field] = fieldVal[0];
                } else {
                    item[field] = fieldVal;
                }
            }
        }
        var multiFields = ["creators", "tags"];
        for (var j in multiFields) {
            var key = multiFields[j];
            var val = this.evaluateThing(this[key], doc, url);
            if (val) {
                for (var k in val) {
                    item[key].push(val[k]);
                }
            }
        }
        this._makeAttachments(doc, url, this["attachments"], item);
        eachItem(item, this, doc, url);
        ret([item]);
    };
    }
};

FW._Scraper.prototype = new FW._Base;

FW.MultiScraper = function (init) { 
    FW._scrapers.push(new FW._MultiScraper(init));
};

FW._MultiScraper = function (init) {
    for (x in init) {
        this[x] = init[x];
    }

    this._mkSelectItems = function(titles, urls) {
        var items = new Object;
        for (var i in titles) {
            items[urls[i]] = titles[i];
        }
        return items;
    };

    this._selectItems = function(titles, urls, callback) {
        var items = new Array();
	Zotero.selectItems(this._mkSelectItems(titles, urls), function (chosen) {
			for (var j in chosen) {
				items.push(j);
			}
			callback(items);
	});
    };

    this._mkAttachments = function(doc, url, urls) {
        var attachmentsArray = this.evaluateThing(this['attachments'], doc, url);
        var attachmentsDict = new Object();
        if (attachmentsArray) {
            for (var i in urls) {
                attachmentsDict[urls[i]] = attachmentsArray[i];
            }
        }
        return attachmentsDict;
    };

    /* This logic is very similar to that used by _makeAttachments in
     * a normal scraper, but abstracting it out would not achieve much
     * and would complicate it. */
    this._makeChoices = function(config, doc, url, choiceTitles, choiceUrls) {
        if (config instanceof Array) {
            config.forEach(function (child) { this._makeTitlesUrls(child, doc, url, choiceTitles, choiceUrls); }, this);
        } else if (typeof config === 'object') {
            /* plural or singual */
            var urlsFilter = config["urls"] || config["url"];
            var titlesFilter = config["titles"] || config["title"];

            var urls = this.evaluateThing(urlsFilter, doc, url);
            var titles = this.evaluateThing(titlesFilter, doc, url);

            var titlesIsArray = (titles instanceof Array);
            if (!(urls instanceof Array)) {
                urls = [urls];
            }
            for (var k in urls) {
                var myUrl = urls[k];
                var myTitle;
                if (titlesIsArray) { myTitle = titles[k]; }
                else { myTitle = titles; }
                choiceUrls.push(myUrl);
                choiceTitles.push(myTitle);
            }
        }
    };

    this.makeItems = function(doc, url, ignore, eachItem, ret) {
        if (this.beforeFilter) {
            var newurl = this.beforeFilter(doc, url);
            if (newurl != url) {
                this.makeItems(doc, newurl, ignore, eachItem, ret);
                return;
            }
        }
        var titles = [];
        var urls = [];
        this._makeChoices(this["choices"], doc, url, titles, urls);
        var attachments = this._mkAttachments(doc, url, urls);
    
    // Cache the itemTrans function
	var parentItemTrans = this.itemTrans; 
    
	this._selectItems(titles, urls, function (itemsToUse) {
		if(!itemsToUse) {
			ret([]);
		} else {
			var items = [];
			Zotero.Utilities.processDocuments(itemsToUse,
				function (doc1) {
					var url1 = doc1.documentURI;
					var itemTrans = parentItemTrans;
					if (itemTrans === undefined) {
						itemTrans = FW.getScraper(doc1, url1);
					}
					if (itemTrans === undefined) {
					/* nothing to do */
					} else {
					itemTrans.makeItems(doc1, url1, attachments[url1],
						function (item1) {
							items.push(item1);
							eachItem(item1, itemTrans, doc1, url1);
						}, 
						function() {});
					}
				},
				function () {
					ret(items);
				}
			);
		}
	});
    };
};

FW._MultiScraper.prototype = new FW._Base;

FW.DelegateTranslator = function (init) { 
    return new FW._DelegateTranslator(init);
};

FW._DelegateTranslator = function (init) {
    for (x in init) {
        this[x] = init[x];
    }
    
    this._translator = Zotero.loadTranslator(this.translatorType);
    this._translator.setTranslator(this.translatorId);
    
    var translator = this._translator;
	var preprocess = this.preprocess;
		
    this.makeItems = function(doc, url, attachments, eachItem, ret) {
        var tmpItem;

		Zotero.Utilities.HTTP.doGet(url,
                              		function (text) {
                                    	translator.setHandler("itemDone", function(obj, item) {
                                           tmpItem = item;
                                           tmpItem.complete()
                                    	});

		                                if(preprocess) {
		                                	translator.getTranslatorObject(function(translatorObject) {
		                                		// We send the pre-processor the translator object and text
	    	                            		var obj = preprocess({
	        	                        			translator: translatorObject,
	            	                    			text: text});
	                	                		// This indicates the pre-processor has done everything
	                    	            		if (obj["text"] === false) return true;
	                    	            		// Otherwise assume the text has been doctored
	                        	        		translator.setString(obj["text"]);
	                            	    		translator.translate();
	                                		});
	                                	} else {
											translator.setString(text);
                                    		translator.translate();
                                    	}
                                    },
                                    function () {
                                        ret([tmpItem]);
                                    });
    };
};

FW.DelegateTranslator.prototype = new FW._Scraper;

FW._StringMagic = function () {
    this._filters = new Array();

    this.addFilter = function(filter) {
        this._filters.push(filter);
        return this;
    };

    this.split = function(re) {
        return this.addFilter(function(s) {
            return s.split(re).filter(function(e) { return (e != ""); });
        });
    };

    this.replace = function(s1, s2, flags) {
        return this.addFilter(function(s) {
            if (s.match(s1)) {
                return s.replace(s1, s2, flags);
            } else {
                return s;
            }
        });
    };

    this.prepend = function(prefix) {
        return this.replace(/^/, prefix);
    };

    this.append = function(postfix) {
        return this.replace(/$/, postfix);
    };

    this.remove = function(toStrip, flags) {
        return this.replace(toStrip, '', flags);
    };

    this.trim = function() {
        return this.addFilter(function(s) { return Zotero.Utilities.trim(s); });
    };

    this.trimInternal = function() {
        return this.addFilter(function(s) { return Zotero.Utilities.trimInternal(s); });
    };

    this.match = function(re, group) {
        if (!group) group = 0;
        return this.addFilter(function(s) { 
                                  var m = s.match(re);
                                  if (m === undefined || m === null) { return undefined; }
                                  else { return m[group]; } 
                              });
    };

    this.cleanAuthor = function(type, useComma) {
        return this.addFilter(function(s) { return Zotero.Utilities.cleanAuthor(s, type, useComma); });
    };

    this.key = function(field) {
        return this.addFilter(function(n) { return n[field]; });
    };

    this.capitalizeTitle = function() {
        return this.addFilter(function(s) { return Zotero.Utilities.capitalizeTitle(s); });
    };

    this.unescapeHTML = function() {
        return this.addFilter(function(s) { return Zotero.Utilities.unescapeHTML(s); });
    };

    this.unescape = function() {
        return this.addFilter(function(s) { return unescape(s); });
    };

    this._applyFilters = function(a, doc1) {
        for (i in this._filters) {
            a = flatten(a);
            /* remove undefined or null array entries */
            a = a.filter(function(x) { return ((x !== undefined) && (x !== null)); });
            for (var j = 0 ; j < a.length ; j++) {
                try {
                    if ((a[j] === undefined) || (a[j] === null)) { continue; }
                    else { a[j] = this._filters[i](a[j], doc1); }
                } catch (x) {
                    a[j] = undefined;
                    Zotero.debug("Caught exception " + x + "on filter: " + this._filters[i]);
                }
            }
            /* remove undefined or null array entries */
            /* need this twice because they could have become undefined or null along the way */
            a = a.filter(function(x) { return ((x !== undefined) && (x !== null)); });
        }
        return a;
    };
};

FW.PageText = function () {
    return new FW._PageText();
};

FW._PageText = function() {
    this._filters = new Array();

    this.evaluate = function (doc) {        
        var a = [doc.documentElement.innerHTML];
        a = this._applyFilters(a, doc);
        if (a.length == 0) { return false; }
        else { return a; }
    };
};

FW._PageText.prototype = new FW._StringMagic();

FW.Url = function () { return new FW._Url(); };

FW._Url = function () {
    this._filters = new Array();

    this.evaluate = function (doc, url) {        
        var a = [url];
        a = this._applyFilters(a, doc);
        if (a.length == 0) { return false; }
        else { return a; }
    };
};

FW._Url.prototype = new FW._StringMagic();

FW.Xpath = function (xpathExpr) { return new FW._Xpath(xpathExpr); };

FW._Xpath = function (_xpath) {
    this._xpath = _xpath;
    this._filters = new Array();

    this.text = function() {
        var filter = function(n) {
            if (typeof n === 'object' && n.textContent) { return n.textContent; }
            else { return n; }
        };
        this.addFilter(filter);
        return this;
    };

    this.sub = function(xpath) {
        var filter = function(n, doc) {
            var result = doc.evaluate(xpath, n, null, XPathResult.ANY_TYPE, null);
            if (result) {
                return result.iterateNext();
            } else {
                return undefined;               
            }
        };
        this.addFilter(filter);
        return this;
    };

    this.evaluate = function (doc) {
        var it = doc.evaluate(this._xpath, doc, null, XPathResult.ANY_TYPE, null);
        var a = new Array();
        var x;
        while (x = it.iterateNext()) { a.push(x); }
        a = this._applyFilters(a, doc);
        if (a.length == 0) { return false; }
        else { return a; }
    };
};

FW._Xpath.prototype = new FW._StringMagic();

FW.detectWeb = function (doc, url) {
    for (var i in FW._scrapers) {
	var scraper = FW._scrapers[i];
	var itemType = scraper.evaluateThing(scraper['itemType'], doc, url);
	var v = scraper.evaluateThing(scraper['detect'], doc, url);
        if (v.length > 0 && v[0]) {
	    return itemType;
	}
    }
    return undefined;
};

FW.getScraper = function (doc, url) {
    var itemType = FW.detectWeb(doc, url);
    return FW._scrapers.filter(function(s) {
        return (s.evaluateThing(s['itemType'], doc, url) == itemType)
		&& (s.evaluateThing(s['detect'], doc, url))
    })[0];
};

FW.doWeb = function (doc, url) {
    var scraper = FW.getScraper(doc, url);
    if (scraper.beforeFilter) {
            url = scraper.beforeFilter(doc, url);
    }
    scraper.makeItems(doc, url, [], 
                      function(item, scraper, doc, url) {
                          scraper.callHook('scraperDone', item, doc, url);
                          if (!item['title']) {
                              item['title'] = "";
                          }
                          item.complete();
                      },
                      function() {
                          Zotero.done();
                      });
    Zotero.wait();
};


function detectWeb(doc, url) { return FW.detectWeb(doc, url); }
function doWeb(doc, url) { return FW.doWeb(doc, url); }

var preprocessor = function (obj) {
		// Gets {translator: , text: }
		
		// Here, we split up the table and insert little placeholders between record bits
		var marced = obj.text.replace(/\s+/g," ")
					.replace(/^.*<div id="marc_details">(?:\s*<[^>"]+>\s*)*/,"")
					.replace(/<tr +class="(?:odd|even)">\s*/g,"")
					.replace(/<td +class="marcTag"><strong>(\d+)<\/strong><\/td>\s*/g,"$1\x1F")
					.replace(/<td +class="marcIndicator">(\d*)\s*<\/td>\s*/g,"$1\x1F")
					.replace(/<td +class="marcTagData">(.*?)<\/td>\s*<\/tr>\s*/g,"$1\x1E")
					.replace(/(?:<[^>]+>\s*)*Explore Further.*$/,"\x1F")
					// We have some extra 0's at the start of the leader
					.replace(/^000/,"");
		
		// We've used the record delimiter to delimit fields
		var fields = marced.split("\x1E");
		
		// The preprocess function gets the translator object, if available
		// This is pretty vital for fancy translators like MARC
		var marc = obj["translator"];
		// Make a record, only one.
		var record = new marc.record();
		// The first piece is the MARC leader
		record.leader = fields.shift();
		for each (var field in fields) {
			// Skip blanks
			if (field.replace(/\x1F|\s/g,"") == "") continue;
			// We're using the subfield delimiter to separate the field code,
			// indicator, and the content.
			var pieces = field.split("\x1F");
			record.addField(pieces[0].trim(),
							pieces[1].trim(),
							// Now we insert the subfield delimiter
							pieces[2].replace(/\$([a-z])/g,"\x1F$1").trim());
		}
		// returns {translator: , text: false, items: [Zotero.Item[]]}
		var item = new Zotero.Item();
		record.translate(item);
		item.complete();
		return {translator: marc, text: false, items: [item]};
}

// Delegate to MARC
FW.Scraper({
	// It'd be hard to discern item a priori...
itemType         : 'book',
detect           : FW.Url().match(/\/item\/show/),
itemTrans : FW.DelegateTranslator({ translatorType : "import",
									// MARC
                                    translatorId   : "a6ee60df-1ddc-4aae-bb25-45e0537be973",
                                    preprocess : preprocessor
                                  }),
// Gets the right URL for the document
beforeFilter : function (doc, url) {
                 url =  url.replace(/\/show\//,"/catalogue_info/");
                 return url;

}
});

FW.MultiScraper({
	// It'd be hard to discern item a priori...
itemType         : 'multiple',
detect           : FW.Url().match(/\/search\?t=/),
choices			 :  {
 titles    : FW.Xpath('//div[@id="bibList"]/div/div//span[@class="title"]/a[1]').text(),
 urls      : FW.Xpath('//div[@id="bibList"]/div/div//span[@class="title"]/a[1]').key('href')
 				.text().replace(/\/show\//,"/catalogue_info/")
},
itemTrans : FW.DelegateTranslator({ translatorType : "import",
									// MARC
                                    translatorId   : "a6ee60df-1ddc-4aae-bb25-45e0537be973",
                                    preprocess : preprocessor
                                  })
});
