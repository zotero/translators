{
	"translatorID": "57a00950-f0d1-4b41-b6ba-44ff0fc30289",
	"label": "Google Scholar",
	"creator": "Simon Kornblith, Frank Bennett",
	"target": "^https?://scholar\\.google\\.(?:com|com?\\.[a-z]{2}|[a-z]{2}|co\\.[a-z]{2})/scholar(?:_case)*",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2012-01-11 00:10:37"
}

/*
 * Test pages
 *
 * Searches of Google Scholar with the following terms should yield a folder
 * icon that works.  Check that unlinked ([CITATION]) items that provide
 * no BibTeX data (there is currently one under "Marbury v. Madison",
 * and "clifford" seems to be a good source of garbage) are
 * dropped from the listings:
 *
 *   marbury v madison
 *   kelo
 *   smith
 *   view of the cathedral
 *   clifford
 *
 * "How cited" pages should NOT yield a page or folder icon.  The
 * Urls to these currently look like this:
 *
 *   http://scholar.google.co.jp/scholar_case?about=1101424605047973909&q=kelo&hl=en&as_sdt=2002
 *
 * Case pages should present a document icon that works:
 *
 *   http://scholar.google.co.jp/scholar_case?case=18273389148555376997&hl=en&as_sdt=2002&kqfp=13204897074208725174&kql=186&kqpfp=16170611681001262513#kq
 */


/*
 * ###############################
 * ### detectWeb() and doWeb() ###
 * ###############################
 */

var bogusItemID = 1;

var detectWeb = function (doc, url) {
	// Icon shows only for search results and law cases
	if (url.match(/scholar_case/)) {
		if (url.match(/about=/)) {
			return false;
		} else {
			return "case";
		}
	} else {
		return "multiple";
	}
};

function doWeb(doc, url) {
	var haveBibTexLinks, nsResolver;
	// Invoke the case or the listing scraper, as appropriate.
	// In a listings page, this forces use of bibtex data and English page version
	nsResolver = doc.createNSResolver(doc.documentElement);
	if (url.match(/scholar_case/)) {
		scrapeCase(doc, url);
	} else {
		haveBibTexLinks = doc.evaluate('//a[contains(@href, "scholar.bib")]',
			doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
		if(!haveBibTexLinks) {
			url = url.replace (/hl\=[^&]*&?/, "");
			url = url.replace("scholar?", "scholar_setprefs?hl=en&scis=yes&scisf=4&submit=Save+Preferences&");
			Zotero.Utilities.processDocuments(url, function(scisigDoc) {
				var scisig = scisigDoc.evaluate('//input[@name="scisig"]',
					scisigDoc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
				url = url + "&scisig="+scisig.value;
				Zotero.Utilities.processDocuments(url, function(doc) {
					scrapeListing(doc);
				}, function() {});
			}, function() {});
		} else {
			scrapeListing(doc);
		}
		Zotero.wait();
	}
}


/*
 * #########################
 * ### Scraper Functions ###
 * #########################
 */
var scrapeListing = function (doc) {
	var nsResolver = doc.createNSResolver(doc.documentElement);

	// XML fragment lists
	var titleFrags = doc.evaluate('//div[@class="gs_r"]//h3[not(contains(a/@href,"/citations"))]', doc, nsResolver, XPathResult.ANY_TYPE, null);
	var citeletFrags = doc.evaluate('//div[@class="gs_a"]', doc, nsResolver, XPathResult.ANY_TYPE, null);
	var  bibtexFrags = doc.evaluate('//a[contains(@href, "scholar.bib")]',
				doc, nsResolver, XPathResult.ANY_TYPE, null);

	var labels = [];
	var factories = [];

	while (true) {
		var titleFrag = titleFrags.iterateNext();
		if (!titleFrag) {
			break;
		}
		// initialize argument values
		var titleString = titleFrag.textContent;
		var citeletString = citeletFrags.iterateNext().textContent;
		var bibtexLink = bibtexFrags.iterateNext().href;
		var attachmentFrag = doc.evaluate('.//a',
				titleFrag, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
		if (attachmentFrag) {
			var attachmentLinks = [attachmentFrag.href];
		} else {
			var attachmentLinks = [];
		}

		// Instantiate item factory with available data
		var factory = new ItemFactory(citeletString, attachmentLinks, titleString, bibtexLink);

		if (!factory.hasUsefulData()) {
			continue;
		}
		// (Feed the array used in the selection list)
		if (factory.hyphenSplit.length) {
			labels.push(titleString + " (" + factory.trailingInfo + ")");
		} else {
			labels.push(titleString);
		}
		factories.push(factory);
	}

	Zotero.selectItems(labels, function(items) {
		if(!items) {
			return false;
		}
		
		var newFactories = [];
		for(var i in items) {
			newFactories.push(factories[i]);
		}
		
		processFactories(newFactories);
	});
	return true;
};

function processFactories(factories) {
	if(!factories.length) {
		Zotero.done();
		return;
	}
	
	var factory = factories.shift();
	factory.getCourt();
	factory.getVolRepPag();
	if (factory.hasReporter()) {
		// If we win here, we get by without fetching the BibTeX object at all.
		factory.saveItem();
		processFactories(factories);
	} else {
		var attachments;
		
		// The only supplementary translator we use is BibTeX
		var bibtexTranslator = Zotero.loadTranslator("import");
		bibtexTranslator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		bibtexTranslator.setHandler("itemDone", function(obj, item) {
			item.attachments = attachments;
			item.complete();
		});
		
		factory.getBibtexData(function(res) {
			if (res) {
				// Has BibTeX data with title, pass it through to the BibTeX translator
				attachments = factory.getAttachments("Page");
				bibtexTranslator.setString(res);
				bibtexTranslator.setHandler("done", function() {
					processFactories(factories);
				});
				bibtexTranslator.translate();
			} else {
				// If BibTeX is empty, this is some kind of case, if anything.
				// Metadata from the citelet, supplemented by the target
				// document for the docket number, if possible.
				if (!factory.hasReporter()) {
					factory.getDocketNumber(null, function() {
						factory.saveItem();
						processFactories(factories);
					});
				} else {
					factory.saveItem();
					processFactories(factories);
				}
			}
		});
	}
}

var scrapeCase = function (doc, url) {
	// Citelet is identified by
	// id="gsl_reference"
	var nsResolver = doc.createNSResolver(doc.documentElement);
	var refFrag = doc.evaluate('//div[@id="gsl_reference"]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
	if (refFrag) {
		// citelet looks kind of like this
		// Powell v. McCormack, 395 US 486 - Supreme Court 1969
		var item = new Zotero.Item("case");
		var factory = new ItemFactory(refFrag.textContent, [url]);
		factory.repairCitelet();
		factory.getDate();
		factory.getCourt();
		factory.getVolRepPag();
		if (!factory.hasReporter()) {
			// Look for docket number in the current document
			factory.getDocketNumber(doc);
		}
		factory.getTitle();
		factory.saveItem();
	}
};


/*
 * ####################
 * ### Item Factory ###
 * ####################
 */

var ItemFactory = function (citeletString, attachmentLinks, titleString, bibtexLink) {
	// var strings
	this.v = {};
	this.v.title = titleString;
	this.v.number = false;
	this.v.court = false;
	this.v.extra = false;
	this.v.date = undefined;
	this.v.jurisdiction = false;
	this.v.docketNumber = false;
	this.vv = {};
	this.vv.volRepPag = [];
	// portable array
	this.attachmentLinks = attachmentLinks;
	// working strings
	this.citelet = citeletString;
	this.bibtexLink = bibtexLink;
	this.bibtexData = undefined;
	this.trailingInfo = false;
	// simple arrays of strings
	this.hyphenSplit = false;
	this.commaSplit = false;
};


ItemFactory.prototype.repairCitelet = function () {
	if (!this.citelet.match(/\s+-\s+/)) {
		this.citelet = this.citelet.replace(/,\s+([A-Z][a-z]+:)/, " - $1");
	}
};


ItemFactory.prototype.repairTitle = function () {
	// All-caps words of four or more characters probably need fixing.
	if (this.v.title.match(/(?:[^a-z]|^)[A-Z]{4,}(?:[^a-z]|$)/)) {
		this.v.title = Zotero.Utilities.capitalizeTitle(this.v.title.toLowerCase()).replace(/([^0-9a-z])V([^0-9a-z])/, "$1v$2");
	}
};


ItemFactory.prototype.hasUsefulData = function () {
	if (this.getDate()) {
		return true;
	}
	if (this.hasInitials()) {
		return true;
	}
	return false;
};


ItemFactory.prototype.hasInitials = function () {
	if (this.hyphenSplit.length && this.hyphenSplit[0].match(/[A-Z] /)) {
		return true;
	}
	return false;
};


ItemFactory.prototype.hasReporter = function () {
	if (this.vv.volRepPag.length > 0) {
		return true;
	}
	return false;
};


ItemFactory.prototype.getDate = function () {
	var i, m;
	// Citelet parsing, step (1)
	if (!this.hyphenSplit) {
		this.hyphenSplit = this.citelet.split(/\s+-\s+/);
		this.trailingInfo = this.hyphenSplit.slice(-1);
	}
	if (!this.v.date && this.v.date !== false) {
		this.v.date = false;
		for (i = this.hyphenSplit.length - 1; i > -1; i += -1) {
			m = this.hyphenSplit[i].match(/(?:(.*)\s+)*([0-9]{4})$/);
			if (m) {
				this.v.date = m[2];
				if (m[1]) {
					this.hyphenSplit[i] = m[1];
				} else {
					this.hyphenSplit[i] = "";
				}
				this.hyphenSplit = this.hyphenSplit.slice(0, i + 1);
				break;
			}
		}
	}
	return this.v.date;
};


ItemFactory.prototype.getCourt = function () {
	var s, m;
	// Citelet parsing, step (2)
	s = this.hyphenSplit.pop().replace(/,\s*$/, "").replace(/\u2026\s*$/, "Court");
	m = s.match(/(?:([a-zA-Z]+):\s*)*(.*)/);
	if (m) {
		this.v.court = m[2].replace("_", " ", "g");
		if (m[1]) {
			this.v.extra = "{:jurisdiction: " + m[1] + "}";
		}
	}
	return this.v.court;
};


ItemFactory.prototype.getVolRepPag = function () {
	var i, m;
	// Citelet parsing, step (3)
	if (this.hyphenSplit.length) {
		this.commaSplit = this.hyphenSplit.slice(-1)[0].split(/\s*,\s+/);
		var gotOne = false;
		for (i = this.commaSplit.length - 1; i > -1; i += -1) {
			m = this.commaSplit[i].match(/^([0-9]+)\s+(.*)\s+(.*)/);
			if (m) {
				var volRepPag = {};
				volRepPag.volume = m[1];
				volRepPag.reporter = m[2];
				volRepPag.pages = m[3].replace(/\s*$/, "");
				this.commaSplit.pop();
				if (!volRepPag.pages.match(/[0-9]$/) && (i > 0 || gotOne)) {
					continue;
				}
				gotOne = true;
				this.vv.volRepPag.push(volRepPag);
			} else {
				break;
			}
		}
	}
};


ItemFactory.prototype.getTitle = function () {
	// Citelet parsing, step (4) [optional]
	if (this.commaSplit) {
		this.v.title = this.commaSplit.join(", ");
	}
};


ItemFactory.prototype.getDocketNumber = function (doc, callback) {
	if (!doc) {
		// Needs doc fetch and xpath
		var me = this;
		Zotero.Utilities.processDocuments(this.attachmentLinks[0],
			function(doc) { me.getDocumentNumber(doc, callback) }, function() {});
		return;
	}
	
	var nsResolver = doc.createNSResolver(doc.documentElement);
	if (doc) {
		var docNumFrag = doc.evaluate('//center[preceding-sibling::center//h3[@id="gsl_case_name"]]', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
		if (docNumFrag) {
			this.v.docketNumber = docNumFrag.textContent.replace(/^\s*[Nn][Oo](?:.|\s+)\s*/, "").replace(/\.\s*$/, "");
		}
	}
	
	if(callback) callback();
};


ItemFactory.prototype.getAttachments = function (doctype) {
	var i, ilen, attachments;
	attachments = [];
	for (i = 0, ilen = this.attachmentLinks.length; i < ilen; i += 1) {
		attachments.push({title:"Google Scholar Linked " + doctype, type:"text/html",
							  url:this.attachmentLinks[i]});
	}
	return attachments;
};


ItemFactory.prototype.pushAttachments = function (doctype) {
	this.item.attachments = this.getAttachments(doctype);
};


ItemFactory.prototype.getBibtexData = function (callback) {
	if (!this.bibtexData) {
		if (this.bibtexData !== false) {
			Zotero.Utilities.doGet(this.bibtexLink, function(bibtexData) {
				if (!bibtexData.match(/title={{}}/)) {
					this.bibtexData = bibtexData;
				} else {
					this.bibtexData = false;
				}
				callback(this.bibtexData);
			});
			return;
		}
	}
	callback(this.bibtexData);
};


ItemFactory.prototype.saveItem = function () {
	var i, ilen, key;
	if (this.v.title) {
		this.repairTitle();
		if (this.vv.volRepPag.length) {
			var completed_items = [];
			for (i = 0, ilen = this.vv.volRepPag.length; i < ilen; i += 1) {
				this.item = new Zotero.Item("case");
				for (key in this.vv.volRepPag[i]) {
					if (this.vv.volRepPag[i][key]) {
						this.item[key] = this.vv.volRepPag[i][key];
					}
				}
				this.saveItemCommonVars();
				if (i === (this.vv.volRepPag.length - 1)) {
					this.pushAttachments("Judgement");
				}
				this.item.itemID = "" + bogusItemID;
				bogusItemID += 1;
				completed_items.push(this.item);
			}
			for (i = 0, ilen = completed_items.length; i < ilen; i += 1) {
				for (j = 0, jlen = completed_items.length; j < jlen; j += 1) {
					if (i === j) {
						continue;
					}
					completed_items[i].seeAlso.push(completed_items[j].itemID);
				}
				completed_items[i].complete();
			}
		} else {
			this.item = new Zotero.Item("case");
			this.saveItemCommonVars();
			this.pushAttachments("Judgement");
			this.item.complete();
		}
	}
};


ItemFactory.prototype.saveItemCommonVars = function () {
	for (key in this.v) {
		if (this.v[key]) {
			this.item[key] = this.v[key];
		}
	}
};


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://scholar.google.com/scholar?q=marbury&hl=en&btnG=Search&as_sdt=1%2C22&as_sdtp=on",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://scholar.google.com/scholar?hl=en&q=kelo&btnG=Search&as_sdt=0%2C22&as_ylo=&as_vis=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://scholar.google.com/scholar?hl=en&q=smith&btnG=Search&as_sdt=0%2C22&as_ylo=&as_vis=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://scholar.google.com/scholar?hl=en&q=view+of+the+cathedral&btnG=Search&as_sdt=0%2C22&as_ylo=&as_vis=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://scholar.google.com/scholar?hl=en&q=clifford&btnG=Search&as_sdt=0%2C22&as_ylo=&as_vis=0",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://scholar.google.com/scholar_case?case=9834052745083343188&q=marbury+v+madison&hl=en&as_sdt=2,5",
		"items": [
			{
				"itemType": "case",
				"creators": [],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Google Scholar Linked Judgement",
						"type": "text/html",
						"url": false
					}
				],
				"volume": "5",
				"reporter": "US",
				"pages": "137",
				"title": "Marbury v. Madison",
				"court": "Supreme Court",
				"date": "1803",
				"itemID": "1",
				"libraryCatalog": "Google Scholar"
			}
		]
	}
]
/** END TEST CASES **/