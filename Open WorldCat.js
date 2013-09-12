{
	"translatorID": "c73a4a8c-3ef1-4ec8-8229-7531ee384cc4",
	"label": "Open WorldCat",
	"creator": "Simon Kornblith, Sebastian Karcher",
	"target": "^https?://(.+).worldcat\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 12,
	"browserSupport": "gcsbv",
	"lastUpdated": "2013-09-12 18:19:47"
}

/**
 * Gets Zotero item from a WorldCat icon src
 */
function getZoteroType(iconSrc) {
	// only specify types not specified in COinS
	if (iconSrc.indexOf("icon-rec") != -1) {
		return "audioRecording";
	}
	if (iconSrc.indexOf("icon-com") != -1) {
		return "computerProgram";
	}
	if (iconSrc.indexOf("icon-map") != -1) {
		return "map";
	}
	return false;
}


/**
 * RIS Scraper Function
 *
 */

function scrape(doc, url, callDoneWhenFinished, itemData) {
	//we need a different replace for item displays from search results
	if (!url) url = doc.location.href;
	if (url.match(/\?/)) {
		var newurl = url.replace(/\&[^/]*$|$/, "&client=worldcat.org-detailed_record&page=endnotealt");
	} else {
		var newurl = url.replace(/\&[^/]*$|$/, "?client=worldcat.org-detailed_record&page=endnotealt");
	}
	//Z.debug(newurl)
	Zotero.Utilities.HTTP.doGet(newurl, function (text) {
		//Z.debug(text);
		
		//2013-05-28 RIS export currently has messed up authors
		// e.g. A1  - Gabbay, Dov M., Woods, John Hayden., Hartmann, Stephan, 
		text = text.replace(/^((?:A1|ED)\s+-\s+)(.+)/mg, function(m, tag, value) {
			var authors = value.replace(/[.,\s]+$/, '')
					.split(/[.,],/);
			var replStr = '';
				var author;
			for(var i=0, n=authors.length; i<n; i++) {
					author = authors[i].trim();
					if(author) replStr += tag + author + '\n';
			}
			return replStr.trim();
		});
		//ebooks are exported as ELEC. We need them as BOOK
		text = text.replace(/^TY\s+-\s+ELEC\s*$/mg, 'TY  - BOOK');
		
		//Zotero.debug("RIS: " + text)
		
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			item.extra = undefined;
			item.archive = undefined;

			if(item.libraryCatalog == "http://worldcat.org") {
				item.libraryCatalog = "Open WorldCat";
			}
			//remove space before colon
			item.title = item.title.replace(/\s+:/, ":")
			
			
			//correct field mode for corporate authors
			for (i in item.creators) {
				if (!item.creators[i].firstName){
					item.creators[i].fieldMode=1;
				}
			}
			
			//attach notes
			if(itemData && itemData.notes) {
				item.notes.push({note: itemData.notes});
			}
			
			item.complete();
		});
		translator.translate();
		if(callDoneWhenFinished) Zotero.done();
	});
}

/**
 * Generates a Zotero item from a single item WorldCat page, or the first item on a multiple item
 * page
 */
function generateItem(doc, node) {
	var item = new Zotero.Item();
	Zotero.Utilities.parseContextObject(node.nodeValue, item);
	// if only one, first check for special types (audio & video recording)
	var type = false;
	try {
		type = doc.evaluate('//img[@class="icn"][contains(@src, "icon-")]/@src', doc, null, XPathResult.ANY_TYPE, null).iterateNext().nodeValue;
	} catch (e) {}
	if (type) {
		type = getZoteroType(type);
		if (type) item.itemType = type;
	}
	
	//check under Material Type
	var matType = ZU.xpathText(doc, '//div[@id="details"]//tr[./th[normalize-space(text())="Material Type:"]]/td');
	if(matType && ZU.trimInternal(matType).toLowerCase() == 'conference publication') {
		item.itemType = 'conferencePaper';
	}
	
	return item;
}

function detectWeb(doc) {
	var xpath = doc.evaluate('//span[@class="Z3988"]/@title', doc, null, XPathResult.ANY_TYPE, null);
	var node = xpath.iterateNext();
	if (!node) return false;
	// see if there is more than one
	if (xpath.iterateNext()) {
		multiple = true;
		return "multiple";
	}
	// generate item and return type
	return generateItem(doc, node).itemType;
}

function detectSearch(item) {
	return !!item.ISBN;
}

function doWeb(doc, url) {
	var articles = [];
	if (doc.evaluate('//div[@class="name"]/a', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) { //search results view
		if (detectWeb(doc) == "multiple") {
			var titles = doc.getElementsByClassName("result");
			var items = {};
			var itemData = {};
			var title, notes, url;
			for(var i=0, n=titles.length; i<n; i++) {
				title = ZU.xpath(titles[i], './div[@class="name"]/a');
				if(!title.length || !title[0].href) continue;
				url = title[0].href;
				items[url] = title[0].textContent;
				
				notes = ZU.xpath(titles[i], './div[@class="description" and ./strong[contains(text(), "Notes")]]');
				var trimStrong = false;
				if(!notes.length) {
					//maybe we're looking at our own list
					notes = ZU.xpath(titles[i], './div/div[@class="description"]/div[contains(@id,"saved_comments_") and normalize-space(text())]');
				}
				if(notes.length) {
					notes = ZU.trimInternal(notes[0].innerHTML)
						.replace(/^<strong>\s*Notes:\s*<\/strong>\s*<br>\s*/i, '');
					
					if(notes) {
						itemData[url] = {
							notes: ZU.unescapeHTML(ZU.unescapeHTML(notes)) //it's double-escaped on WorldCat
						};
					}
				}
			}
			Zotero.selectItems(items, function (items) {
				if (!items) {
					return true;
				}
				for (var i in items) {
					(function(url) {
						ZU.processDocuments(url, function(newUrl, newDoc) {
							scrape(newUrl, newDoc, false, itemData[url]);
						});
					})(i);
				}
			});
		} else { //single item in search results, don't display a select dialog
			var title = doc.evaluate('//div[@class="name"]/a[1]', doc, null, XPathResult.ANY_TYPE, null).iterateNext();
			if (!title) Zotero.done(false);
			article = title.href;
			Zotero.Utilities.processDocuments(article, scrape);
		}
	} else { // regular single item	view
		scrape(doc, url);
	}
}

function doSearch(item) {
	var url = "http://www.worldcat.org/search?q=isbn%3A" + item.ISBN.replace(/[^0-9X]/g, "") + "&=Search&qt=results_page";
	ZU.processDocuments(url, function (doc) {
		//we take the first search result and run scrape on it
		if (doc.evaluate('//div[@class="name"]/a', doc, null, XPathResult.ANY_TYPE, null).iterateNext()) { //search results view
			var article = ZU.xpathText(doc, '(//div[@class="name"]/a)[1]/@href')
			if (!article){Zotero.done(false); return false;}
			article = "http://www.worldcat.org" + article;
			ZU.processDocuments(article, function(doc) { scrape(doc, article, true); });
		} else {
			scrape(doc, url, true);
		}
	}, null);
} /** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.worldcat.org/search?qt=worldcat_org_bks&q=argentina&fq=dt%3Abks",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.worldcat.org/title/argentina/oclc/489605&referer=brief_results",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Whitaker",
						"firstName": "Arthur Preston",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"libraryCatalog": "Open WorldCat",
				"language": "English",
				"title": "Argentina",
				"publisher": "Prentice-Hall",
				"place": "Englewood Cliffs, N.J.",
				"date": "1964"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.worldcat.org/title/dynamic-systems-approach-to-the-development-of-cognition-and-action/oclc/42854423&referer=brief_results",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Thelen",
						"firstName": "Esther",
						"creatorType": "author"
					},
					{
						"lastName": "Smith",
						"firstName": "Linda B",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"libraryCatalog": "Open WorldCat",
				"language": "English",
				"url": "http://search.ebscohost.com/login.aspx?direct=true&scope=site&db=nlebk&db=nlabk&AN=1712",
				"title": "A dynamic systems approach to the development of cognition and action",
				"publisher": "MIT Press",
				"place": "Cambridge, Mass.",
				"date": "1996",
				"ISBN": "0585030154  9780585030159",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://melvyl.worldcat.org/title/cambridge-companion-to-adam-smith/oclc/60321422&referer=brief_results",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Haakonssen",
						"firstName": "Knud",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"libraryCatalog": "Open WorldCat",
				"language": "English",
				"title": "The Cambridge companion to Adam Smith",
				"publisher": "Cambridge University Press",
				"place": "Cambridge; New York",
				"date": "2006",
				"ISBN": "0521770599 0521779243  9780521770590 9780521779241",
				"abstractNote": "\"Adam Smith is best known as the founder of scientific economics and as an early proponent of the modern market economy. Political economy, however, was only one part of Smith's comprehensive intellectual system. Consisting of a theory of mind and its functions in language, arts, science, and social intercourse, Smith's system was a towering contribution to the Scottish Enlightenment. His ideas on social intercourse, in fact, also served as the basis for a moral theory that provided both historical and theoretical accounts of law, politics, and economics. This companion volume provides an up-to-date examination of all aspects of Smith's thought. Collectively, the essays take into account Smith's multiple contexts - Scottish, British, European, Atlantic, biographical, institutional, political, philosophical - and they draw on all his works, including student notes from his lectures. Pluralistic in approach, the volume provides a contextualist history of Smith, as well as direct philosophical engagement with his ideas.\"--Jacket."
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.worldcat.org/title/from-lanka-eastwards-the-ramayana-in-the-literature-and-visual-arts-of-indonesia/oclc/765821302",
		"items": [
			{
				"itemType": "conferencePaper",
				"creators": [
					{
						"lastName": "Acri",
						"firstName": "Andrea",
						"creatorType": "author"
					},
					{
						"lastName": "Creese",
						"firstName": "Helen",
						"creatorType": "author"
					},
					{
						"lastName": "Griffiths",
						"firstName": "Arlo",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"libraryCatalog": "Open WorldCat",
				"language": "English",
				"title": "From Laṅkā eastwards: the Rāmāyaṇa in the literature and visual arts of Indonesia",
				"publisher": "KITLV Press",
				"date": "2011",
				"ISBN": "9067183849 9789067183840",
				"shortTitle": "From Laṅkā eastwards"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.worldcat.org/title/newmans-relation-to-modernism/oclc/676747555",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"lastName": "Smith",
						"firstName": "Sydney F",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"libraryCatalog": "Open WorldCat",
				"language": "English",
				"url": "http://www.archive.org/details/a626827800smituoft/",
				"title": "Newman's relation to modernism",
				"publisher": "s.n.",
				"place": "London",
				"date": "1912",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/